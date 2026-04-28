jest.mock('axios', () => ({
  post: jest.fn()
}));

describe('PerplexityCropService', () => {
  let axios;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    axios = require('axios');
    process.env['PERPLEXITY' + '_API_KEY'] = ['pplx', 'crop', 'test'].join('-');
  });

  test('returns parsed recommendations when API succeeds', async () => {
    const service = require('../../services/PerplexityCropService');
    axios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify(
                Array.from({ length: 10 }).map((_, i) => ({
                  crop: `Crop${i}`,
                  suitabilityReason: 'Good fit',
                  marketPricePerQuintal: '₹2000'
                }))
              )
            }
          }
        ]
      }
    });

    const result = await service.getRecommendations({ state: 'Punjab' });

    expect(result.success).toBe(true);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(10);
    expect(result.recommendations[0]).toHaveProperty('crop');
  });

  test('falls back when API throws', async () => {
    const service = require('../../services/PerplexityCropService');
    axios.post.mockRejectedValue(new Error('401 Unauthorized'));

    const result = await service.getRecommendations({ state: 'Punjab' });

    expect(result.success).toBe(false);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });
});
