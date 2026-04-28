describe('RealTimeAgricultureService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('returns deterministic seeded IoT values for same farm and bucket', async () => {
    const service = require('../../services/RealTimeAgricultureService');
    jest.spyOn(service, 'getTimeBucket').mockReturnValue('2026-4-23-10');

    const first = await service.getIoTData('farm-1', 'soil');
    const second = await service.getIoTData('farm-1', 'soil');

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(first.data.moisture).toBe(second.data.moisture);
    expect(first.data.temperature).toBe(second.data.temperature);
    expect(first.data.ph).toBe(second.data.ph);
  });

  test('recommends high-urgency irrigation for low soil moisture', async () => {
    const service = require('../../services/RealTimeAgricultureService');
    jest.spyOn(service, 'getIoTData').mockResolvedValue({
      success: true,
      data: { moisture: 22 }
    });

    const result = await service.getIrrigationRecommendation('farm-2');

    expect(result.success).toBe(true);
    expect(result.recommendation.action).toBe('irrigate');
    expect(result.recommendation.urgency).toBe('high');
  });

  test('creates weather alerts when seeded risks cross thresholds', async () => {
    const service = require('../../services/RealTimeAgricultureService');
    jest.spyOn(service, 'getTimeBucket').mockReturnValue('2026-4-23-10');
    jest.spyOn(service, 'valueFromSeed')
      .mockReturnValueOnce(85) // rainfallRisk
      .mockReturnValueOnce(90) // droughtRisk
      .mockReturnValueOnce(70); // heatRisk

    const result = await service.getWeatherAlerts(17.385, 78.4867);

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
    expect(result.alerts.map((a) => a.type)).toEqual(
      expect.arrayContaining(['rain_forecast', 'drought_warning', 'temperature_extreme'])
    );
  });
});
