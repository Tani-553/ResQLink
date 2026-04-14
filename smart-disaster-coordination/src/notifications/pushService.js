// notifications/pushService.js - Member 3: Notification Specialist
// PWA Web Push API - browser-level push notifications

const webpush = require('web-push');
const User = require('../backend/models/User');

const hasVapidKeys = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (hasVapidKeys) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:admin@disaster-coord.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Keep a small hot cache, but persist subscriptions on the user record.
const subscriptions = new Map();

const saveSubscription = async (userId, subscription) => {
  subscriptions.set(userId.toString(), subscription);
  await User.findByIdAndUpdate(userId, { webPushSubscription: subscription });
  console.log(`Push subscription saved for user ${userId}`);
};

const sendWebPush = async (userId, { title, body, icon = '/icons/icon-192.png', data = {} }) => {
  if (!hasVapidKeys) return;

  let subscription = subscriptions.get(userId.toString());
  if (!subscription) {
    const user = await User.findById(userId).select('webPushSubscription');
    subscription = user?.webPushSubscription || null;
    if (subscription) {
      subscriptions.set(userId.toString(), subscription);
    }
  }

  if (!subscription) return;

  const payload = JSON.stringify({
    title,
    body,
    icon,
    badge: '/icons/badge.png',
    data,
    actions: [
      { action: 'view', title: 'View Now' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log(`Web Push sent to user ${userId}`);
  } catch (err) {
    if (err.statusCode === 410) {
      subscriptions.delete(userId.toString());
      await User.findByIdAndUpdate(userId, { webPushSubscription: null });
      console.log(`Expired subscription removed for user ${userId}`);
    } else {
      console.error(`Web Push error for user ${userId}:`, err.message);
    }
  }
};

const sendWebPushToMany = async (userIds, payload) => {
  await Promise.allSettled(userIds.map((id) => sendWebPush(id, payload)));
};

const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY;

module.exports = { saveSubscription, sendWebPush, sendWebPushToMany, getVapidPublicKey };
