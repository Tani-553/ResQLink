// tests/notifications.test.js — Member 3: Database Engineer & Testing Lead
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/backend/server');
const User = require('../src/backend/models/User');
const Notification = require('../src/backend/models/Notification');

let userToken, userId, notifId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_test');

  const res = await request(app).post('/api/auth/register').send({
    name: 'Notif User', email: 'notif_user@test.com',
    phone: '9222222221', password: 'Test@1234', role: 'volunteer'
  });
  userToken = res.body.token;
  userId = res.body.user.id;

  // Seed a notification directly
  const notif = await Notification.create({
    recipient: userId,
    type: 'new-request',
    title: '🚨 New SOS Request',
    message: 'A rescue request is nearby.',
    isRead: false
  });
  notifId = notif._id.toString();
});

afterAll(async () => {
  await User.deleteMany({ email: 'notif_user@test.com' });
  await Notification.deleteMany({ recipient: userId });
  await mongoose.connection.close();
});

describe('GET /api/notifications — Fetch notifications', () => {
  it('should return notifications for logged-in user', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should block unauthenticated access', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/notifications/:id/read — Mark as read', () => {
  it('should mark a notification as read', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's actually marked read
    const notif = await Notification.findById(notifId);
    expect(notif.isRead).toBe(true);
  });
});

describe('PUT /api/notifications/read-all — Mark all read', () => {
  beforeAll(async () => {
    // Add more unread notifications
    await Notification.create([
      { recipient: userId, type: 'broadcast', title: 'Alert 1', message: 'Test 1', isRead: false },
      { recipient: userId, type: 'broadcast', title: 'Alert 2', message: 'Test 2', isRead: false },
    ]);
  });

  it('should mark all notifications as read', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const unread = await Notification.countDocuments({ recipient: userId, isRead: false });
    expect(unread).toBe(0);
  });
});

describe('POST /api/notifications/subscribe — Push subscription', () => {
  it('should save a push subscription', async () => {
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' }
    };
    const res = await request(app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ subscription: mockSubscription });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
