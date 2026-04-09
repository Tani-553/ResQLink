const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../src/backend/server');
const User = require('../src/backend/models/User');
const HelpRequest = require('../src/backend/models/HelpRequest');
const NGOProfile = require('../src/backend/models/NGOProfile');
const Notification = require('../src/backend/models/Notification');

let victimToken;
let volunteerToken;
let adminToken;
let ngoToken;
let volunteerId;
let ngoProfileId;
let helpRequestId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_test');
  }

  const victim = await request(app).post('/api/auth/register').send({
    name: 'Backend Victim',
    email: 'backend_victim@test.com',
    phone: '9333333301',
    password: 'Test@1234',
    role: 'victim'
  });
  victimToken = victim.body.token;

  const volunteer = await request(app).post('/api/auth/register').send({
    name: 'Backend Volunteer',
    email: 'backend_volunteer@test.com',
    phone: '9333333302',
    password: 'Test@1234',
    role: 'volunteer'
  });
  volunteerToken = volunteer.body.token;
  volunteerId = volunteer.body.user.id;

  const admin = await request(app).post('/api/auth/register').send({
    name: 'Backend Admin',
    email: 'backend_admin@test.com',
    phone: '9333333303',
    password: 'Test@1234',
    role: 'admin'
  });
  adminToken = admin.body.token;

  const ngo = await request(app).post('/api/auth/register').send({
    name: 'Backend NGO User',
    email: 'backend_ngo@test.com',
    phone: '9333333304',
    password: 'Test@1234',
    role: 'ngo'
  });
  ngoToken = ngo.body.token;
});

afterAll(async () => {
  await Notification.deleteMany({
    $or: [
      { recipient: volunteerId },
      { recipient: { $in: await User.find({ email: /backend_.*@test\.com$/ }).distinct('_id') } }
    ]
  });
  await HelpRequest.deleteMany({ description: /backend integration request/i });
  await NGOProfile.deleteMany({ orgName: /Backend Relief/i });
  await User.deleteMany({ email: /backend_.*@test\.com$/ });

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Volunteer matching and task lifecycle', () => {
  it('updates volunteer location through auth API', async () => {
    const res = await request(app)
      .put('/api/auth/update-location')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ longitude: 80.2707, latitude: 13.0827 });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.location.coordinates).toEqual([80.2707, 13.0827]);
  });

  it('creates an SOS request with volunteer matching data', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${victimToken}`)
      .send({
        type: 'medical',
        description: 'backend integration request for volunteer matching',
        longitude: 80.2707,
        latitude: 13.0827,
        address: 'Chennai Zone 4',
        priority: 'high'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.matching.volunteersFound).toBeGreaterThanOrEqual(1);
    helpRequestId = res.body.data._id;
  });

  it('returns nearby pending requests for volunteers', async () => {
    const res = await request(app)
      .get('/api/requests/nearby')
      .set('Authorization', `Bearer ${volunteerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((item) => item._id === helpRequestId)).toBe(true);
  });

  it('allows the volunteer to accept the request and see it in my tasks', async () => {
    const acceptRes = await request(app)
      .put(`/api/requests/${helpRequestId}/accept`)
      .set('Authorization', `Bearer ${volunteerToken}`);

    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.body.data.status).toBe('assigned');

    const tasksRes = await request(app)
      .get('/api/volunteers/my-tasks')
      .set('Authorization', `Bearer ${volunteerToken}`);

    expect(tasksRes.statusCode).toBe(200);
    expect(tasksRes.body.count).toBeGreaterThanOrEqual(1);
    expect(tasksRes.body.data.some((item) => item._id === helpRequestId)).toBe(true);
  });

  it('lets the assigned volunteer move the request to in-progress', async () => {
    const res = await request(app)
      .put(`/api/requests/${helpRequestId}/status`)
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ status: 'in-progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('in-progress');
  });
});

describe('NGO registration and admin management', () => {
  it('registers an NGO profile with document upload', async () => {
    const res = await request(app)
      .post('/api/ngo/register')
      .set('Authorization', `Bearer ${ngoToken}`)
      .field('orgName', 'Backend Relief Network')
      .field('description', 'NGO integration test profile')
      .field('contactEmail', 'ngo-contact@test.com')
      .field('contactPhone', '9444444401')
      .attach('documents', path.join(__dirname, '..', 'README.md'));

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.documents.length).toBe(1);
    ngoProfileId = res.body.data._id;
  });

  it('returns NGO profile and allows resource updates', async () => {
    const profileRes = await request(app)
      .get('/api/ngo/profile')
      .set('Authorization', `Bearer ${ngoToken}`);

    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.data.orgName).toBe('Backend Relief Network');

    const resourceRes = await request(app)
      .put('/api/ngo/resources')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ reliefKits: 120, shelters: 3, vehicles: 5, medicalSupplies: 80 });

    expect(resourceRes.statusCode).toBe(200);
    expect(resourceRes.body.data.resources.vehicles).toBe(5);
  });

  it('lets the NGO assign an active volunteer to a zone', async () => {
    const res = await request(app)
      .post('/api/ngo/assign-volunteer')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ volunteerId, zone: 'Zone-4' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.volunteers.map(String)).toContain(String(volunteerId));
    expect(res.body.data.activeZones).toContain('Zone-4');
  });

  it('shows active volunteers for NGO and admin roles', async () => {
    const ngoView = await request(app)
      .get('/api/volunteers/active')
      .set('Authorization', `Bearer ${ngoToken}`);

    expect(ngoView.statusCode).toBe(200);
    expect(ngoView.body.count).toBeGreaterThanOrEqual(1);

    const adminView = await request(app)
      .get('/api/volunteers/active')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminView.statusCode).toBe(200);
    expect(adminView.body.count).toBeGreaterThanOrEqual(1);
  });

  it('lets admin inspect the NGO queue, verify the NGO, and fetch dashboard stats', async () => {
    const ngoQueueRes = await request(app)
      .get('/api/admin/ngos?approved=false')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(ngoQueueRes.statusCode).toBe(200);
    expect(ngoQueueRes.body.data.some((item) => item._id === ngoProfileId)).toBe(true);

    const verifyRes = await request(app)
      .put(`/api/admin/ngos/${ngoProfileId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.data.isApproved).toBe(true);

    const dashboardRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashboardRes.statusCode).toBe(200);
    expect(dashboardRes.body.data.totalRequests).toBeGreaterThanOrEqual(1);
    expect(dashboardRes.body.data.activeNGOs).toBeGreaterThanOrEqual(1);
  });

  it('lets admin broadcast and filter users by role', async () => {
    const broadcastRes = await request(app)
      .post('/api/admin/broadcast')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Backend Broadcast',
        message: 'Move to the nearest shelter.',
        zone: 'Zone-4'
      });

    expect(broadcastRes.statusCode).toBe(200);
    expect(broadcastRes.body.success).toBe(true);

    const usersRes = await request(app)
      .get('/api/admin/users?role=volunteer')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.body.data.every((user) => user.role === 'volunteer')).toBe(true);
  });
});
