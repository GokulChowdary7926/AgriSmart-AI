const dataQualityMiddleware = require('../../middleware/dataQualityMiddleware');

function makeReqRes() {
  const req = { requestId: 'rid-1', originalUrl: '/api/test', apiFailures: 0 };
  const res = {
    statusCode: 200,
    payload: null,
    json(data) { this.payload = data; return this; }
  };
  return { req, res };
}

describe('dataQualityMiddleware', () => {
  test('annotates response with _quality envelope including requestId, source, confidence', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json({ success: true, data: { value: 1 }, source: 'AgriSmart AI' });

    expect(res.payload._quality).toBeDefined();
    expect(res.payload._quality.requestId).toBe('rid-1');
    expect(res.payload._quality.source).toBe('AgriSmart AI');
    expect(res.payload._quality.confidence).toBeGreaterThan(0.7);
    expect(res.payload._quality.degradedReason).toBeNull();
  });

  test('detects fallback data via isFallback flag and sets degradedReason', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json({ success: true, data: { x: 1 }, isFallback: true });

    expect(res.payload._quality.isFallback).toBe(true);
    expect(res.payload._quality.degradedReason).toBe('fallback_data');
    expect(res.payload._quality.warnings).toContain('Data is from fallback source (may be less accurate)');
  });

  test('detects fallback via _source string', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json({ _source: 'fallback', payload: 'x' });

    expect(res.payload._quality.isFallback).toBe(true);
  });

  test('respects explicit degradedReason on payload', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json({ success: true, isFallback: true, degradedReason: 'weather_api_unavailable' });

    expect(res.payload._quality.degradedReason).toBe('weather_api_unavailable');
  });

  test('marks cached data with degradedReason cached_data', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json({ success: true, _cached: true });

    expect(res.payload._quality.degradedReason).toBe('cached_data');
    expect(res.payload._quality.warnings).toContain('Data is cached (may not be current)');
  });

  test('does not double-wrap when _quality already exists', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    const original = { success: true, _quality: { existing: true } };
    res.json(original);

    expect(res.payload).toBe(original);
  });

  test('falls back to req.originalUrl when source missing', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json({ success: true, data: { y: 2 } });

    expect(res.payload._quality.source).toBe('/api/test');
  });

  test('passes through non-object payloads unchanged', () => {
    const { req, res } = makeReqRes();
    dataQualityMiddleware(req, res, () => {});
    res.json('string-payload');

    expect(res.payload).toBe('string-payload');
  });
});
