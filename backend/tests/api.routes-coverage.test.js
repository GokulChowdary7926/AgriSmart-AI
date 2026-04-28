'use strict';

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

describe('Realtime Agriculture routes (deterministic + validation paths)', () => {
  test('GET /api/realtime/health returns 200 + operational envelope', async () => {
    const res = await request(app).get('/api/realtime/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('service');
    expect(res.body.data.status).toBe('operational');
    expect(res.body).toHaveProperty('source');
    expect(res.body).toHaveProperty('isFallback');
  });

  test('GET /api/realtime/weather-alerts with non-numeric coords returns 400', async () => {
    const res = await request(app)
      .get('/api/realtime/weather-alerts')
      .query({ lat: 'abc', lng: 'xyz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('GET /api/realtime/dashboard/:farmId with invalid coords returns 400', async () => {
    const res = await request(app)
      .get('/api/realtime/dashboard/test-farm')
      .query({ lat: 'abc', lng: 'xyz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Payments routes (plans + auth gates)', () => {
  test('GET /api/payments/plans returns all four subscription tiers', async () => {
    const res = await request(app).get('/api/payments/plans');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('plans');
    expect(res.body.data.plans).toHaveProperty('free');
    expect(res.body.data.plans).toHaveProperty('basic');
    expect(res.body.data.plans).toHaveProperty('premium');
    expect(res.body.data.plans).toHaveProperty('enterprise');
    expect(res.body.data.plans.free.price_monthly).toBe(0);
  });

  test('POST /api/payments/create-order without auth returns 401', async () => {
    const res = await request(app).post('/api/payments/create-order').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/payments/subscription/create without auth returns 401', async () => {
    const res = await request(app).post('/api/payments/subscription/create').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Data-driven routes (datasets + validation)', () => {
  test('GET /api/data-driven/datasets/available returns 200 + dataset envelope', async () => {
    const res = await request(app).get('/api/data-driven/datasets/available');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body).toHaveProperty('source');
  });

  test('GET /api/data-driven/recommend without coordinates returns 400', async () => {
    const res = await request(app).get('/api/data-driven/recommend');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('GET /api/data-driven/recommend with non-numeric coords returns 400', async () => {
    const res = await request(app)
      .get('/api/data-driven/recommend')
      .query({ latitude: 'abc', longitude: 'xyz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/data-driven/analysis/historical-trends without coords returns 400', async () => {
    const res = await request(app).get('/api/data-driven/analysis/historical-trends');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Messaging routes (auth gates)', () => {
  test('POST /api/messaging/send without auth returns 401', async () => {
    const res = await request(app).post('/api/messaging/send').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/messaging/bulk without auth returns 401', async () => {
    const res = await request(app).post('/api/messaging/bulk').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/messaging/alert without auth returns 401', async () => {
    const res = await request(app).post('/api/messaging/alert').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('IoT routes (auth gates + webhook contract)', () => {
  test('GET /api/iot/sensors/:id/readings without auth returns 401', async () => {
    const res = await request(app).get('/api/iot/sensors/test-sensor/readings');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/iot/sensors/:id/analyze without auth returns 401', async () => {
    const res = await request(app).get('/api/iot/sensors/test-sensor/analyze');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/iot/irrigation/recommendation without auth returns 401', async () => {
    const res = await request(app).post('/api/iot/irrigation/recommendation').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GPS Services routes (validation)', () => {
  test('GET /api/gps/search without q returns 400', async () => {
    const res = await request(app).get('/api/gps/search');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('GET /api/gps/location without coords returns 400', async () => {
    const res = await request(app).get('/api/gps/location');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/gps/location with non-numeric coords returns 400', async () => {
    const res = await request(app)
      .get('/api/gps/location')
      .query({ latitude: 'abc', longitude: 'xyz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/gps/soil/detect without coords returns 400', async () => {
    const res = await request(app).get('/api/gps/soil/detect');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/gps/weather without coords returns 400', async () => {
    const res = await request(app).get('/api/gps/weather');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Map routes (validation paths)', () => {
  test('GET /api/map/reverse-geocode without coords returns 400', async () => {
    const res = await request(app).get('/api/map/reverse-geocode');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/map/reverse-geocode with non-numeric coords returns 400', async () => {
    const res = await request(app)
      .get('/api/map/reverse-geocode')
      .query({ latitude: 'abc', longitude: 'xyz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/map/geocode without query returns 400', async () => {
    const res = await request(app).get('/api/map/geocode');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('404 handler (unknown routes)', () => {
  test('GET /api/__definitely_not_a_real_endpoint__ returns 404 + standardized envelope', async () => {
    const res = await request(app).get('/api/__definitely_not_a_real_endpoint__');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('error');
  });
});
