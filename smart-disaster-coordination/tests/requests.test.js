const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/backend/server');
const User = require('../src/backend/models/User');
const HelpRequest = require('../src/backend/models/HelpRequest');
const Notification = require('../src/backend/models/Notification');

let victimToken, volunteerToken, adminToken;
let victimId, volunteerId, adminId, requestId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_test');
  }

  const victim = await request(app).post('/api/auth/register').send({
    name: 'Req Victim', email: 'req_victim@test.com',
    phone: '9111111111', password: 'Test@1234', role: 'victim'
  });
  victimToken = victim.body.token;
  victimId = victim.body.user.id;

  const volunteer = await request(app).post('/api/auth/register').send({
    name: 'Req Volunteer', email: 'req_volunteer@test.com',
    phone: '9111111112', password: 'Test@1234', role: 'volunteer'
  });
  volunteerToken = volunteer.body.token;
  volunteerId = volunteer.body.user.id;

  const admin = await request(app).post('/api/auth/register').send({
    name: 'Req Admin', email: 'req_admin@test.com',
    phone: '9111111113', password: 'Test@1234', role: 'admin'
  });
  adminToken = admin.body.token;
  adminId = admin.body.user.id;
});

afterAll(async () => {
  await Notification.deleteMany({
    recipient: { $in: [victimId, volunteerId, adminId].filter(Boolean) }
  });
  await User.deleteMany({ email: /req_.*@test\.com$/ });
  await HelpRequest.deleteMany({ description: /test request/i });
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('POST /api/requests - Submit SOS', () => {
  it('should allow victim to submit a help request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${victimToken}`)
      .send({
        type: 'rescue',
        description: 'Test request - flood victim on rooftop',
        latitude: 13.0827,
        longitude: 80.2707,
        priority: 'critical'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('rescue');
    expect(res.body.data.status).toBe('pending');
    requestId = res.body.data._id;
  });

  it('should block duplicate request within 10 minutes', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${victimToken}`)
      .send({
        type: 'rescue',
        description: 'Test request - duplicate attempt',
        latitude: 13.0827,
        longitude: 80.2707,
        priority: 'critical'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/duplicate/i);
  });

  it('should block volunteer from submitting request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({
        type: 'food',
        description: 'Test request - unauthorized',
        latitude: 13.0827,
        longitude: 80.2707
      });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/requests/my - Victim own requests', () => {
  it('should return victim requests', async () => {
    const res = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${victimToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should block volunteer from accessing victim requests', async () => {
    const res = await request(app)
      .get('/api/requests/my')
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/requests/:id/accept - Volunteer accept', () => {
  it('should allow volunteer to accept a pending request and notify the victim', async () => {
    const res = await request(app)
      .put(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('assigned');

    const victimNotification = await Notification.findOne({
      recipient: victimId,
      type: 'request-accepted',
      'data.requestId': requestId
    });
    expect(victimNotification).not.toBeNull();
  });

  it('should reject double-accept of same request', async () => {
    const res = await request(app)
      .put(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/no longer available/i);
  });
});

describe('PUT /api/requests/:id/status - Lifecycle notifications', () => {
  it('should notify the victim and admin when work moves to in-progress', async () => {
    const res = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ status: 'in-progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('in-progress');

    const victimNotification = await Notification.findOne({
      recipient: victimId,
      type: 'task-update',
      'data.requestId': requestId,
      'data.status': 'in-progress'
    });
    const adminNotification = await Notification.findOne({
      recipient: adminId,
      type: 'task-update',
      'data.requestId': requestId,
      'data.status': 'in-progress'
    });

    expect(victimNotification).not.toBeNull();
    expect(adminNotification).not.toBeNull();
  });

  it('should notify both victim and volunteer when the request is resolved', async () => {
    const res = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ status: 'resolved' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('resolved');

    const victimNotification = await Notification.findOne({
      recipient: victimId,
      type: 'request-resolved',
      'data.requestId': requestId
    });
    const volunteerNotification = await Notification.findOne({
      recipient: volunteerId,
      type: 'request-resolved',
      'data.requestId': requestId
    });

    expect(victimNotification).not.toBeNull();
    expect(volunteerNotification).not.toBeNull();
  });
});

describe('GET /api/requests/all - Admin view', () => {
  it('should allow admin to view all requests', async () => {
    const res = await request(app)
      .get('/api/requests/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('should block victim from viewing all requests', async () => {
    const res = await request(app)
      .get('/api/requests/all')
      .set('Authorization', `Bearer ${victimToken}`);
    expect(res.statusCode).toBe(403);
  });
});
