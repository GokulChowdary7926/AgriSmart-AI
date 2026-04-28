const agriGPTService = require('../../services/agriGPTService');

describe('agriGPTService._buildCacheKey (PII-free hashing)', () => {
  test('returns intent-name prefixed hash with 16-char hex digest', () => {
    const key = agriGPTService._buildCacheKey({ name: 'weather_info' }, {});
    expect(key.startsWith('weather_info:')).toBe(true);
    expect(/^weather_info:[a-f0-9]{16}$/.test(key)).toBe(true);
  });

  test('is deterministic for the same safe context', () => {
    const ctx = { location: { state: 'Karnataka', country: 'India' }, language: 'en' };
    const a = agriGPTService._buildCacheKey({ name: 'crop_recommendation' }, ctx);
    const b = agriGPTService._buildCacheKey({ name: 'crop_recommendation' }, ctx);
    expect(a).toBe(b);
  });

  test('differs when state changes', () => {
    const a = agriGPTService._buildCacheKey({ name: 'x' }, { location: { state: 'Karnataka' } });
    const b = agriGPTService._buildCacheKey({ name: 'x' }, { location: { state: 'Punjab' } });
    expect(a).not.toBe(b);
  });

  test('ignores PII fields like phone, email, user_id, name', () => {
    const a = agriGPTService._buildCacheKey({ name: 'x' }, { phone: '9999999999', email: 'a@b.com' });
    const b = agriGPTService._buildCacheKey({ name: 'x' }, { phone: '0000000000', email: 'c@d.com' });
    expect(a).toBe(b);
  });

  test('reads state from top-level context as a fallback', () => {
    const a = agriGPTService._buildCacheKey({ name: 'x' }, { state: 'Karnataka' });
    const b = agriGPTService._buildCacheKey({ name: 'x' }, { location: { state: 'Karnataka' } });
    expect(a).toBe(b);
  });

  test('reads crop from profile.crop as a fallback', () => {
    const a = agriGPTService._buildCacheKey({ name: 'x' }, { crop: 'rice' });
    const b = agriGPTService._buildCacheKey({ name: 'x' }, { profile: { crop: 'rice' } });
    expect(a).toBe(b);
  });

  test('handles null/undefined context safely', () => {
    expect(() => agriGPTService._buildCacheKey({ name: 'x' }, null)).not.toThrow();
    expect(() => agriGPTService._buildCacheKey({ name: 'x' }, undefined)).not.toThrow();
    const k = agriGPTService._buildCacheKey({ name: 'x' }, null);
    expect(/^x:[a-f0-9]{16}$/.test(k)).toBe(true);
  });

  test('cache key never contains the raw context payload', () => {
    const ctx = { location: { state: 'SECRET-STATE' }, profile: { crop: 'SECRET-CROP', role: 'admin' } };
    const key = agriGPTService._buildCacheKey({ name: 'crop_recommendation' }, ctx);
    expect(key).not.toContain('SECRET-STATE');
    expect(key).not.toContain('SECRET-CROP');
    expect(key).not.toContain('admin');
  });
});
