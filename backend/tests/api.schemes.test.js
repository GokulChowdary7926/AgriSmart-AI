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

describe('Government Schemes API', () => {
  const profiles = [
    {
      name: 'Small Punjab farmer',
      profile: {
        location: { state: 'Punjab', district: 'Ludhiana' },
        farmDetails: { landSize: 1.0, landOwnership: true },
        annualIncome: 80000,
        cropsGrown: ['wheat', 'rice']
      }
    },
    {
      name: 'Marginal Maharashtra farmer',
      profile: {
        location: { state: 'Maharashtra', district: 'Pune' },
        farmDetails: { landSize: 0.8, landOwnership: true },
        annualIncome: 60000,
        cropsGrown: ['sugarcane', 'soybean']
      }
    },
    {
      name: 'Karnataka horticulture farmer',
      profile: {
        location: { state: 'Karnataka', district: 'Belagavi' },
        farmDetails: { landSize: 2.5, landOwnership: true },
        annualIncome: 150000,
        cropsGrown: ['vegetables', 'fruits']
      }
    }
  ];

  it.each(profiles)('should recommend schemes for %s', async (scenario) => {
    const res = await request(app)
      .post('/api/government-schemes/recommend')
      .send({
        farmerProfile: scenario.profile,
        filters: { sortBy: 'relevance_score' }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    const data = res.body.data || {};
    expect(typeof data.totalSchemesFound).toBe('number');
  });
});

