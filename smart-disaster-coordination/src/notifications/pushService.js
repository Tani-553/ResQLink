// notifications/pushService.js — Member 3: Notification Specialist
// PWA Web Push API — browser-level push notifications

const webpush = require('web-push');

const hasVapidKeys = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (hasVapidKeys) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:admin@disaster-coord.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// In-memory subscription store (use DB in production)
const subscriptions = new Map(); // userId -> pushSubscription

// Save a user's push subscription
const saveSubscription = async (userId, subscription) => {
  subscriptions.set(userId.toString(), subscription);
  console.log(`💾 Push subscription saved for user ${userId}`);
};

// Send PWA Web Push to a specific user
const sendWebPush = async (userId, { title, body, icon = '/icons/icon-192.png', data = {} }) => {
  if (!hasVapidKeys) return;
  const subscription = subscriptions.get(userId.toString());
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
    console.log(`✅ Web Push sent to user ${userId}`);
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — remove it
      subscriptions.delete(userId.toString());
      console.log(`🗑️ Expired subscription removed for user ${userId}`);
    } else {
      console.error(`❌ Web Push error for user ${userId}:`, err.message);
    }
  }
};

// Send to multiple users
const sendWebPushToMany = async (userIds, payload) => {
  await Promise.allSettled(userIds.map(id => sendWebPush(id, payload)));
};

// Get VAPID public key (sent to frontend to register service worker)
const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY;

module.exports = { saveSubscription, sendWebPush, sendWebPushToMany, getVapidPublicKey };
