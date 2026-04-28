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

describe('Medication API (mock-mode, deterministic endpoints)', () => {
  test('GET /api/medication/emergency/helpline returns national + state contacts', async () => {
    const res = await request(app).get('/api/medication/emergency/helpline');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('national');
    expect(Array.isArray(res.body.data.national)).toBe(true);
    expect(res.body.data.national.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('source');
    expect(res.body).toHaveProperty('isFallback');
  });

  test('GET /api/medication/products/:diseaseName returns online + local listings', async () => {
    const res = await request(app).get('/api/medication/products/leaf-blight');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.online)).toBe(true);
    expect(Array.isArray(res.body.data.local)).toBe(true);
    expect(res.body.data.online[0].link).toContain('leaf-blight');
  });

  test('GET /api/medication/treat/:diseaseName tolerates unknown disease and falls back deterministically', async () => {
    const res = await request(app)
      .get('/api/medication/treat/__nonexistent_disease__')
      .query({ crop: 'wheat', severity: 'low' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body).toHaveProperty('isFallback');
  });
});

describe('AgriGPT API (mock-mode, deterministic endpoints)', () => {
  test('GET /api/agri-gpt/popular-questions returns curated questions + categories', async () => {
    const res = await request(app).get('/api/agri-gpt/popular-questions');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.popularQuestions)).toBe(true);
    expect(res.body.data.popularQuestions.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body).toHaveProperty('source');
  });

  test('GET /api/agri-gpt/quick-replies returns category-keyed replies', async () => {
    const res = await request(app).get('/api/agri-gpt/quick-replies').query({ category: 'diseases' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/agri-gpt/quick-replies without category falls back to general bucket', async () => {
    const res = await request(app).get('/api/agri-gpt/quick-replies');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/agri-gpt/chat without body returns 400 BAD_REQUEST', async () => {
    const res = await request(app).post('/api/agri-gpt/chat').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body).toHaveProperty('requestId');
  });
});
