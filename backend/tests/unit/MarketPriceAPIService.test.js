describe('MarketPriceAPIService', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    service = require('../../services/marketPriceAPIService');
    service.cache.clear();
  });

  test('returns AgMarkNet prices when available', async () => {
    jest.spyOn(service, 'getAgMarkNetPrices').mockResolvedValue([
      {
        commodity: 'wheat',
        market: { name: 'A' },
        price: { value: 25, unit: 'kg' }
      }
    ]);
    jest.spyOn(service, 'fetchFromNCDEX').mockResolvedValue([]);
    jest.spyOn(service, 'getMandiRatePrices').mockResolvedValue([]);

    const result = await service.getRealTimePrices('wheat', 'Punjab');

    expect(result.length).toBe(1);
    expect(result[0].commodity).toBe('wheat');
  });

  test('falls back to mock prices when all sources fail', async () => {
    jest.spyOn(service, 'getAgMarkNetPrices').mockResolvedValue([]);
    jest.spyOn(service, 'fetchFromNCDEX').mockResolvedValue([]);
    jest.spyOn(service, 'getMandiRatePrices').mockResolvedValue([]);

    const result = await service.getRealTimePrices('rice', 'Punjab');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('commodity');
    expect(result[0]).toHaveProperty('price');
  });
});
