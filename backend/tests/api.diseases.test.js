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

describe('Disease & Treatment API', () => {
  const crops = ['tomato', 'rice', 'wheat', 'cotton', 'maize'];

  it.each(crops)('should list diseases for %s', async (crop) => {
    const res = await request(app)
      .get('/api/diseases')
      .query({ crop, limit: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

