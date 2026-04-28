describe('RealTimeAnalyticsService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('aggregatePrices combines records and computes ranges', () => {
    const service = require('../../services/RealTimeAnalyticsService');

    const aggregated = service.aggregatePrices({
      agmarknet: {
        records: [
          { commodity: 'Wheat', modal_price: '2100' },
          { commodity: 'Wheat', modal_price: '2300' }
        ]
      },
      local: {
        prices: [{ commodity_name: 'Rice', price: '1800' }]
      }
    });

    expect(aggregated.length).toBe(2);
    expect(aggregated[0]).toHaveProperty('commodity');
    expect(aggregated[0]).toHaveProperty('averagePrice');
    expect(aggregated.find((x) => x.commodity === 'Wheat').minPrice).toBe(2100);
  });

  test('getWeatherAlerts emits seeded alerts above thresholds', async () => {
    const service = require('../../services/RealTimeAnalyticsService');
    jest.spyOn(service, 'getTimeBucket').mockReturnValue('2026-4-23-5');
    jest.spyOn(service, 'valueFromSeed')
      .mockReturnValueOnce(76) // heatRisk
      .mockReturnValueOnce(88); // rainRisk

    const alerts = await service.getWeatherAlerts();

    expect(alerts.length).toBe(2);
    expect(alerts.map((a) => a.type)).toEqual(
      expect.arrayContaining(['heat', 'heavy_rain'])
    );
  });

  test('predictMarketTrends returns top commodities projections', async () => {
    const service = require('../../services/RealTimeAnalyticsService');
    jest.spyOn(service, 'getTimeBucket').mockReturnValue('2026-4-23-5');

    const predictions = await service.predictMarketTrends({
      agmarknet: {
        records: [
          { commodity: 'Cotton', modal_price: '6200' },
          { commodity: 'Cotton', modal_price: '6100' },
          { commodity: 'Wheat', modal_price: '2300' },
          { commodity: 'Rice', modal_price: '2700' }
        ]
      }
    });

    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0]).toHaveProperty('commodity');
    expect(predictions[0]).toHaveProperty('projectedChangePercent');
  });
});
