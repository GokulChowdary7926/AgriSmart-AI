describe('retryManager', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('executeWithRetry succeeds after transient failure', async () => {
    const manager = require('../../services/api/retryManager');
    jest.spyOn(manager, 'sleep').mockResolvedValue(undefined);

    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts += 1;
      if (attempts < 2) {
        const err = new Error('temporarily down');
        err.code = 'ETIMEDOUT';
        throw err;
      }
      return { ok: true };
    });

    const result = await manager.executeWithRetry(fn, { maxRetries: 2, baseDelay: 1, maxDelay: 2 });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(result.data.ok).toBe(true);
  });

  test('executeWithRetry returns failure payload after max retries', async () => {
    const manager = require('../../services/api/retryManager');
    jest.spyOn(manager, 'sleep').mockResolvedValue(undefined);

    const fn = jest.fn(async () => {
      const err = new Error('still failing');
      err.code = 'ECONNREFUSED';
      throw err;
    });

    const result = await manager.executeWithRetry(fn, { maxRetries: 1, baseDelay: 1, maxDelay: 2 });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.error).toBeTruthy();
  });

  test('batchWithRetry processes all requests with chunking', async () => {
    const manager = require('../../services/api/retryManager');
    jest.spyOn(manager, 'sleep').mockResolvedValue(undefined);

    const requests = [
      { fn: async () => 1 },
      { fn: async () => 2 },
      { fn: async () => 3 }
    ];
    const results = await manager.batchWithRetry(requests, { concurrency: 2, maxRetries: 0 });

    expect(results.length).toBe(3);
    expect(results[0].result.success).toBe(true);
    expect(results[2].result.data).toBe(3);
  });
});
