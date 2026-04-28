describe('apiMonitor', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('records request/error/cache and reports summary metrics', () => {
    const monitor = require('../../services/monitoring/apiMonitor');
    monitor.reset();

    monitor.recordRequest('weather', true, 120);
    monitor.recordRequest('weather', false, 180, true);
    monitor.recordRequest('market', true, 200);
    monitor.recordError('weather', { message: 'timeout', code: 'ETIMEDOUT', status: 504 });
    monitor.recordCacheHit('weather', true);
    monitor.recordCacheHit('weather', false);

    const metrics = monitor.getMetrics();

    expect(metrics.summary.total_requests).toBe(3);
    expect(metrics.summary.total_fallbacks).toBe(1);
    expect(metrics.summary.most_reliable_api).toBe('market');
    expect(metrics.apis.find((a) => a.name === 'weather').recent_errors.length).toBe(1);
  });

  test('caps response times to last 100 samples', () => {
    const monitor = require('../../services/monitoring/apiMonitor');
    monitor.reset();

    for (let i = 0; i < 120; i += 1) {
      monitor.recordRequest('soil', true, i);
    }

    expect(monitor.metrics.responseTimes.soil.length).toBe(100);
    expect(monitor.metrics.responseTimes.soil[0]).toBe(20);
  });
});
