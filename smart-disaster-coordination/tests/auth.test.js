jest.mock('../src/backend/services/realtimeLocationService', () => ({
  syncUserLocation: jest.fn().mockResolvedValue(true)
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { syncUserLocation } = require('../src/backend/services/realtimeLocationService');
const { app } = require('../src/backend/server');
const User = require('../src/backend/models/User');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_test');
  }
});

afterAll(async () => {
  await User.deleteMany({ email: /test\.com$/ });
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('POST /api/auth/register', () => {
  it('should register a new victim user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Victim', email: 'victim_auth@test.com',
      phone: '9000000099', password: 'Test@1234', role: 'victim'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('victim');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate', email: 'victim_auth@test.com',
      phone: '9000000099', password: 'Test@1234', role: 'victim'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject volunteer as a public signup role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Volunteer', email: 'volunteer_auth@test.com',
      phone: '9000000098', password: 'Test@1234', role: 'volunteer'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'victim_auth@test.com', password: 'Test@1234'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'victim_auth@test.com', password: 'WrongPass'
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'Test@1234'
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'victim_auth@test.com', password: 'Test@1234' });
    token = res.body.token;
  });

  it('should return current user with valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('victim_auth@test.com');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/auth/update-location', () => {
  let volunteerToken;

  beforeAll(async () => {
    await User.create({
      name: 'Internal Volunteer',
      email: 'volunteer_auth@test.com',
      phone: '9000000098',
      password: 'Test@1234',
      role: 'volunteer'
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'volunteer_auth@test.com',
      password: 'Test@1234'
    });
    volunteerToken = res.body.token;
  });

  it('should update location and sync it to the live location service', async () => {
    const res = await request(app)
      .put('/api/auth/update-location')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ longitude: 80.2707, latitude: 13.0827 });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.location.coordinates).toEqual([80.2707, 13.0827]);
    expect(syncUserLocation).toHaveBeenCalledWith(expect.objectContaining({
      role: 'volunteer',
      longitude: 80.2707,
      latitude: 13.0827,
      source: 'api'
    }));
  });
});
