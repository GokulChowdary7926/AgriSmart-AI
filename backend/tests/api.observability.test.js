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

describe('Observability and readiness endpoints', () => {
  test('GET /health includes request id and x-request-id header', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body).toHaveProperty('requestId');
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  test('GET /health preserves incoming x-request-id', async () => {
    const requestId = 'req-observability-123';
    const res = await request(app)
      .get('/health')
      .set('x-request-id', requestId);

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBe(requestId);
    expect(res.body.requestId).toBe(requestId);
  });

  test('GET /ready exposes dependency status payload', async () => {
    const res = await request(app).get('/ready');

    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
    expect(['ready', 'not_ready']).toContain(res.body.status);
    expect(res.body).toHaveProperty('dependencies');
    expect(res.body.dependencies).toHaveProperty('mongodb');
    expect(res.body.dependencies.mongodb).toHaveProperty('required', true);
    expect(res.body.dependencies.mongodb).toHaveProperty('status');
    expect(['up', 'down']).toContain(res.body.dependencies.mongodb.status);
  });

  test('GET /api/diagnostics exposes standardized deploy/runtime payload', async () => {
    const res = await request(app).get('/api/diagnostics');

    expect([200, 503]).toContain(res.statusCode);
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(res.body).toHaveProperty('service');
    expect(res.body.service).toHaveProperty('name', 'agri-smart-backend');
    expect(res.body.service).toHaveProperty('version');
    expect(res.body).toHaveProperty('build');
    expect(res.body.build).toHaveProperty('commitSha');
    expect(res.body).toHaveProperty('runtime');
    expect(res.body.runtime).toHaveProperty('nodeVersion');
    expect(res.body.runtime).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('dependencies');
    expect(res.body.dependencies).toHaveProperty('mongodb');
  });
});
