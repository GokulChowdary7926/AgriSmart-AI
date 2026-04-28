const analyticsService = require('../../services/analyticsService');

describe('analyticsService pure helpers', () => {
  describe('calculatePriceChange', () => {
    test('returns 0 for insufficient data', () => {
      expect(analyticsService.calculatePriceChange([])).toBe(0);
      expect(analyticsService.calculatePriceChange([100])).toBe(0);
    });

    test('computes percent change between first and last with two-decimal precision', () => {
      expect(analyticsService.calculatePriceChange([100, 110])).toBe(10);
      expect(analyticsService.calculatePriceChange([200, 150])).toBe(-25);
      expect(analyticsService.calculatePriceChange([100, 100])).toBe(0);
    });

    test('uses last element of multi-point series', () => {
      expect(analyticsService.calculatePriceChange([100, 50, 200])).toBe(100);
    });
  });

  describe('calculateVolatility', () => {
    test('returns formatted percentage from absolute price changes', () => {
      const result = analyticsService.calculateVolatility([
        { priceChange: 5 },
        { priceChange: -3 },
        { priceChange: 4 }
      ]);
      expect(result).toBe('4.0%');
    });

    test('treats missing priceChange as 0', () => {
      expect(analyticsService.calculateVolatility([{ priceChange: 6 }, {}])).toBe('3.0%');
    });
  });

  describe('calculateEngagementScore', () => {
    test('weights recommendations/diseases/schemes and clamps to 100', () => {
      expect(analyticsService.calculateEngagementScore(0, 0, 0)).toBe(0);
      expect(analyticsService.calculateEngagementScore(10, 10, 10)).toBe(100);
      expect(analyticsService.calculateEngagementScore(100, 100, 100)).toBe(100);
    });

    test('produces an integer score', () => {
      const score = analyticsService.calculateEngagementScore(3, 5, 2);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('deterministic catalog helpers', () => {
    test('getRecentActivity returns a non-empty list', async () => {
      const activity = await analyticsService.getRecentActivity('any-user');
      expect(Array.isArray(activity)).toBe(true);
      expect(activity.length).toBeGreaterThan(0);
    });

    test('getSeasonalCropData covers kharif/rabi/zaid seasons', async () => {
      const data = await analyticsService.getSeasonalCropData();
      expect(data.kharif).toContain('Rice');
      expect(data.rabi).toContain('Wheat');
      expect(Array.isArray(data.zaid)).toBe(true);
      expect(data.zaid.length).toBeGreaterThan(0);
    });
  });
});
