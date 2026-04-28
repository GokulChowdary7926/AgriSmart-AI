const fallbackManager = require('../../services/api/fallbackManager');

describe('services/api/fallbackManager', () => {
  describe('getFallback', () => {
    test('returns null for an unknown service', () => {
      expect(fallbackManager.getFallback('mystery')).toBeNull();
    });

    test('returns generic envelope (with source/note/timestamp) for crops', () => {
      const out = fallbackManager.getFallback('crops');
      expect(out.source).toBe('AgriSmart AI');
      expect(out.note).toMatch(/fallback/i);
      expect(out.timestamp).toBeDefined();
      expect(Array.isArray(out.recommendations)).toBe(true);
    });

    test('returns generic envelope for diseases', () => {
      const out = fallbackManager.getFallback('diseases');
      expect(out.source).toBe('AgriSmart AI');
      expect(Array.isArray(out.common_diseases)).toBe(true);
    });

    test('customizes weather fallback for cold latitudes (>30)', () => {
      const out = fallbackManager.getFallback('weather', { lat: 35, lng: 78 });
      expect(out.location).toContain('35');
      expect(out.temperature).toBe(20); // 25 - 5
      expect(out.feels_like).toBe(21);
    });

    test('customizes weather fallback for hot latitudes (<15)', () => {
      const out = fallbackManager.getFallback('weather', { lat: 10, lng: 78 });
      expect(out.temperature).toBe(30); // 25 + 5
    });

    test('weather fallback accepts "lon" alias for longitude', () => {
      const out = fallbackManager.getFallback('weather', { lat: 22, lon: 78 });
      expect(out.location).toContain('78');
    });

    test('returns plain weather fallback when no coordinates provided', () => {
      const out = fallbackManager.getFallback('weather');
      expect(out.temperature).toBe(25);
      expect(out.source).toBe('AgriSmart AI');
    });

    test('customizes market fallback by commodity name', () => {
      const out = fallbackManager.getFallback('market', { commodity: 'Cotton' });
      expect(out.prices).toHaveLength(1);
      expect(out.prices[0].commodity).toBe('Cotton');
      expect(out.prices[0].price).toBe(6000);
    });

    test('falls back to default price for unknown commodities', () => {
      const out = fallbackManager.getFallback('market', { commodity: 'Quinoa' });
      expect(out.prices[0].price).toBe(2000);
    });

    test('returns plain market fallback when no commodity provided', () => {
      const out = fallbackManager.getFallback('market');
      expect(out.prices.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('shouldUseFallback', () => {
    test('returns true when retry count >= 3', () => {
      expect(fallbackManager.shouldUseFallback({}, 3)).toBe(true);
      expect(fallbackManager.shouldUseFallback({}, 5)).toBe(true);
    });

    test('returns true for connection errors', () => {
      expect(fallbackManager.shouldUseFallback({ code: 'ECONNREFUSED' })).toBe(true);
      expect(fallbackManager.shouldUseFallback({ code: 'ETIMEDOUT' })).toBe(true);
      expect(fallbackManager.shouldUseFallback({ code: 'ENOTFOUND' })).toBe(true);
    });

    test('returns true for HTTP 5xx, 503, and 429', () => {
      expect(fallbackManager.shouldUseFallback({ response: { status: 500 } })).toBe(true);
      expect(fallbackManager.shouldUseFallback({ response: { status: 503 } })).toBe(true);
      expect(fallbackManager.shouldUseFallback({ response: { status: 429 } })).toBe(true);
    });

    test('returns false for plain 4xx errors', () => {
      expect(fallbackManager.shouldUseFallback({ response: { status: 400 } })).toBe(false);
      expect(fallbackManager.shouldUseFallback({ response: { status: 404 } })).toBe(false);
    });

    test('returns false for plain errors with no signal and low retry count', () => {
      expect(fallbackManager.shouldUseFallback({ message: 'random' }, 0)).toBe(false);
    });
  });
});
