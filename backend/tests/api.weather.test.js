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

describe('Weather API', () => {
  const locations = [
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 }
  ];

  it.each(locations)('should return current weather for %s', async (loc) => {
    const res = await request(app)
      .get('/api/weather/current')
      .query({ lat: loc.lat, lng: loc.lng });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('source');
    expect(typeof res.body.source).toBe('string');
    expect(res.body).toHaveProperty('isFallback');
    expect(typeof res.body.isFallback).toBe('boolean');
    if (res.body.isFallback) {
      expect(res.body).toHaveProperty('degradedReason');
    }
  });
});

