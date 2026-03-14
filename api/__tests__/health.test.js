const request = require('supertest');

// Mock pg before requiring app
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

const app = require('../src/index');

describe('Health Check', () => {
  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Auth Routes', () => {
  test('POST /api/auth/login returns 400 without credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/register returns 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Protected Routes', () => {
  test('GET /api/clock/status returns 401 without token', async () => {
    const res = await request(app).get('/api/clock/status');
    expect(res.status).toBe(401);
  });

  test('GET /api/time-entries returns 401 without token', async () => {
    const res = await request(app).get('/api/time-entries');
    expect(res.status).toBe(401);
  });

  test('GET /api/projects returns 401 without token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});
