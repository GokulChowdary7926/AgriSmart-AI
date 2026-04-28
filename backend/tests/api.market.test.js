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

describe('Market API', () => {
  it('should list commodities', async () => {
    const res = await request(app).get('/api/market/commodities');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  const priceQueries = [
    { name: 'All India latest', query: { limit: 50 } },
    { name: 'Punjab wheat', query: { commodity: 'wheat', state: 'Punjab', limit: 100 } },
    { name: 'Maharashtra cotton', query: { commodity: 'cotton', state: 'Maharashtra', limit: 100 } },
    { name: 'Karnataka tomato', query: { commodity: 'tomato', state: 'Karnataka', limit: 100 } },
    { name: 'Gujarat groundnut', query: { commodity: 'groundnut', state: 'Gujarat', limit: 100 } }
  ];

  it.each(priceQueries)('should return market prices for %s', async (scenario) => {
    const res = await request(app).get('/api/market/prices').query(scenario.query);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});

