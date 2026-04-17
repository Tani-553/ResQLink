// notifications/fcmService.js — Member 3: Notification Specialist
// Firebase Cloud Messaging — push alerts to mobile/web

const admin = require('firebase-admin');
const User = require('../backend/models/User');
const Notification = require('../backend/models/Notification');

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

const hasFirebaseCredentials = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim()
);

let firebaseMessaging = null;

// Initialize Firebase Admin SDK only when credentials are available.
if (hasFirebaseCredentials) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  firebaseMessaging = admin.messaging();
} else {
  console.warn('FCM credentials are missing. Firebase notifications are disabled.');
}

// Send FCM push to a single user by their FCM token
const sendToUser = async (userId, { title, body, data = {} }) => {
  try {
    if (!firebaseMessaging) return;

    const user = await User.findById(userId).select('fcmToken');
    if (!user || !user.fcmToken) return;

    await firebaseMessaging.send({
      token: user.fcmToken,
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      webpush: { notification: { title, body, icon: '/icons/icon-192.png', badge: '/icons/badge.png' } }
    });
    console.log(`✅ FCM sent to user ${userId}`);
  } catch (err) {
    console.error(`❌ FCM error for user ${userId}:`, err.message);
  }
};

// Send FCM to multiple users
const sendToMany = async (userIds, payload) => {
  await Promise.allSettled(userIds.map(id => sendToUser(id, payload)));
};

// Notify nearby volunteers when a new SOS request is submitted
const sendNotificationToNearby = async ({ type, location, requestId }) => {
  try {
    const [longitude, latitude] = location;
    const nearbyVolunteers = await User.find({
      role: 'volunteer',
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: 10000 // 10 km
        }
      }
    }).select('_id fcmToken');

    const title = `🚨 New SOS Request — ${type.toUpperCase()}`;
    const body = `A victim needs ${type} assistance near you. Tap to respond.`;

    // Save DB notifications
    const dbNotifs = nearbyVolunteers.map(v => ({
      recipient: v._id, type: 'new-request', title, message: body,
      data: { requestId: requestId.toString(), requestType: type }
    }));
    if (dbNotifs.length) await Notification.insertMany(dbNotifs);

    // Send FCM push
    await sendToMany(nearbyVolunteers.map(v => v._id), { title, body, data: { requestId: requestId.toString() } });

    console.log(`📣 Notified ${nearbyVolunteers.length} nearby volunteers`);
  } catch (err) {
    console.error('sendNotificationToNearby error:', err.message);
  }
};

// Notify victim when volunteer accepts their request
const notifyVictimAccepted = async (victimId, volunteerName, requestId) => {
  await sendToUser(victimId, {
    title: '🙋 Volunteer On The Way!',
    body: `${volunteerName} has accepted your request and is heading to you.`,
    data: { requestId: requestId.toString() }
  });
  await Notification.create({
    recipient: victimId, type: 'request-accepted',
    title: '🙋 Volunteer On The Way!',
    message: `${volunteerName} has accepted your request and is heading to you.`,
    data: { requestId: requestId.toString() }
  });
};

// Notify admin when NGO registers
const notifyAdminNGOPending = async (orgName, ngoId) => {
  const admins = await User.find({ role: 'admin' }).select('_id');
  const payload = {
    title: '🏢 New NGO Registration',
    body: `"${orgName}" has registered and is awaiting verification.`,
    data: { ngoId: ngoId.toString() }
  };
  await sendToMany(admins.map(a => a._id), payload);
  const dbNotifs = admins.map(a => ({
    recipient: a._id, type: 'ngo-pending',
    title: payload.title, message: payload.body,
    data: { ngoId: ngoId.toString() }
  }));
  if (dbNotifs.length) await Notification.insertMany(dbNotifs);
};

// Broadcast emergency alert to all users in a zone
const broadcastEmergency = async ({ title, message, zone }) => {
  const users = await User.find({ isActive: true }).select('_id fcmToken');
  await sendToMany(users.map(u => u._id), { title, body: message, data: { zone } });
};

module.exports = {
  sendToUser,
  sendToMany,
  sendNotificationToNearby,
  notifyVictimAccepted,
  notifyAdminNGOPending,
  broadcastEmergency
};
