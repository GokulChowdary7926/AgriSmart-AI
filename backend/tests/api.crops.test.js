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

describe('Crop Recommendation API', () => {
  const scenarios = [
    { name: 'Punjab rice belt (alluvial, high rainfall)', lat: 31.1471, lng: 75.3412 },
    { name: 'Maharashtra sugarcane/cotton (black soils)', lat: 19.7515, lng: 75.7139 },
    { name: 'Karnataka red soils (pulses/millets)', lat: 15.3173, lng: 75.7139 },
    { name: 'Tamil Nadu delta (rice + horticulture)', lat: 11.1271, lng: 78.6569 },
    { name: 'Gujarat dryland (groundnut/cotton)', lat: 22.2587, lng: 71.1924 },
    { name: 'Assam high rainfall (paddy)', lat: 26.2006, lng: 92.9376 },
    { name: 'Rajasthan arid (bajra/millets)', lat: 27.0238, lng: 74.2179 },
    { name: 'Kerala laterite (spices/coconut)', lat: 10.8505, lng: 76.2711 },
    { name: 'Uttar Pradesh alluvial (wheat/sugarcane)', lat: 26.8467, lng: 80.9462 },
    { name: 'Bihar alluvial (paddy/wheat)', lat: 25.0961, lng: 85.3131 }
  ];

  it.each(scenarios)('should return recommendations for %s', async (scenario) => {
    const res = await request(app)
      .post('/api/crops/recommend')
      .send({ latitude: scenario.lat, longitude: scenario.lng });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const data = res.body.data || res.body;
    const recs = data.recommendations || data.crops || [];
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('source');
    expect(typeof res.body.source).toBe('string');
    expect(res.body).toHaveProperty('isFallback');
    expect(typeof res.body.isFallback).toBe('boolean');
    if (res.body.isFallback) {
      expect(res.body).toHaveProperty('degradedReason');
    }
  });
});

