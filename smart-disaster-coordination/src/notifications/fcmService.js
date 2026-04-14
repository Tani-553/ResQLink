// notifications/fcmService.js - Member 3: Notification Specialist
// Firebase Cloud Messaging - push alerts to mobile/web

const admin = require('firebase-admin');
const User = require('../backend/models/User');
const Notification = require('../backend/models/Notification');
const { initializeFirebase } = require('../backend/services/realtimeLocationService');
const { sendWebPush, sendWebPushToMany } = require('./pushService');

const sendToUser = async (userId, { title, body, data = {} }) => {
  try {
    if (!initializeFirebase()) return;
    const user = await User.findById(userId).select('fcmToken');
    if (!user || !user.fcmToken) return;

    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      webpush: { notification: { title, body, icon: '/icons/icon-192.png', badge: '/icons/badge.png' } }
    });
    console.log(`FCM sent to user ${userId}`);
  } catch (err) {
    console.error(`FCM error for user ${userId}:`, err.message);
  }
};

const sendToMany = async (userIds, payload) => {
  await Promise.allSettled(userIds.map((id) => sendToUser(id, payload)));
};

const sendNotificationToNearby = async ({ type, location, requestId }) => {
  try {
    const [longitude, latitude] = location;
    const nearbyVolunteers = await User.find({
      role: 'volunteer',
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: 10000
        }
      }
    }).select('_id');

    const title = `New SOS Request - ${type.toUpperCase()}`;
    const body = `A victim needs ${type} assistance near you. Tap to respond.`;
    const requestPayload = { requestId: requestId.toString(), requestType: type };

    const dbNotifs = nearbyVolunteers.map((volunteer) => ({
      recipient: volunteer._id,
      type: 'new-request',
      title,
      message: body,
      data: requestPayload
    }));

    if (dbNotifs.length) {
      await Notification.insertMany(dbNotifs);
    }

    const recipientIds = nearbyVolunteers.map((volunteer) => volunteer._id);
    await sendToMany(recipientIds, { title, body, data: requestPayload });
    await sendWebPushToMany(recipientIds, { title, body, data: requestPayload });

    console.log(`Notified ${nearbyVolunteers.length} nearby volunteers`);
  } catch (err) {
    console.error('sendNotificationToNearby error:', err.message);
  }
};

const notifyVictimAccepted = async (victimId, volunteerName, requestId) => {
  const title = 'Volunteer On The Way!';
  const body = `${volunteerName} has accepted your request and is heading to you.`;
  const data = { requestId: requestId.toString() };

  await sendToUser(victimId, { title, body, data });
  await sendWebPush(victimId, { title, body, data });
  await Notification.create({
    recipient: victimId,
    type: 'request-accepted',
    title,
    message: body,
    data
  });
};

const notifyAdminNGOPending = async (orgName, ngoId) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  const payload = {
    title: 'New NGO Registration',
    body: `"${orgName}" has registered and is awaiting verification.`,
    data: { ngoId: ngoId.toString() }
  };

  const adminIds = admins.map((adminUser) => adminUser._id);
  await sendToMany(adminIds, payload);

  const dbNotifs = admins.map((adminUser) => ({
    recipient: adminUser._id,
    type: 'ngo-pending',
    title: payload.title,
    message: payload.body,
    data: { ngoId: ngoId.toString() }
  }));

  if (dbNotifs.length) {
    await Notification.insertMany(dbNotifs);
  }
};

const broadcastEmergency = async ({ title, message, zone }) => {
  const users = await User.find({ isActive: true }).select('_id');
  const userIds = users.map((user) => user._id);

  await sendToMany(userIds, { title, body: message, data: { zone } });
  await sendWebPushToMany(userIds, { title, body: message, data: { zone } });
};

module.exports = {
  sendToUser,
  sendToMany,
  sendNotificationToNearby,
  notifyVictimAccepted,
  notifyAdminNGOPending,
  broadcastEmergency
};
