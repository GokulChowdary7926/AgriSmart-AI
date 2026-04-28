const request = require('supertest');
const AgriSmartServer = require('../server');

let serverInstance;
let app;

beforeAll(async () => {
  serverInstance = new AgriSmartServer();
  app = serverInstance.app;
});

afterAll(async () => {
  if (serverInstance && serverInstance.server) {
    await new Promise((resolve) => serverInstance.server.close(resolve));
  }
});

describe('API error envelope contract', () => {
  test('GET /api/auth/me without token returns standardized 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body).toHaveProperty('requestId');
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  test('POST /api/auth/refresh without token returns standardized 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'BAD_REQUEST');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body).toHaveProperty('requestId');
  });
});
