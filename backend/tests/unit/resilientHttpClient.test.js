describe('resilientHttpClient request-id propagation', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('adds x-request-id header from explicit requestId config', async () => {
    const axiosRequest = jest.fn().mockResolvedValue({ data: { ok: true } });
    jest.doMock('axios', () => ({ request: axiosRequest }));
    jest.doMock('../../services/api/circuitBreaker', () => ({
      CircuitBreakerManager: {
        getBreaker: jest.fn(() => ({
          execute: jest.fn((fn) => fn())
        }))
      }
    }));

    const client = require('../../services/api/resilientHttpClient');
    const result = await client.request({
      serviceName: 'test-service',
      method: 'get',
      url: 'https://example.com',
      requestId: 'req-123'
    });

    expect(result.success).toBe(true);
    expect(result.requestId).toBe('req-123');
    expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({ 'x-request-id': 'req-123' })
    }));
  });

  test('inherits request id from async request context', async () => {
    const axiosRequest = jest.fn().mockResolvedValue({ data: { ok: true } });
    jest.doMock('axios', () => ({ request: axiosRequest }));
    jest.doMock('../../services/api/circuitBreaker', () => ({
      CircuitBreakerManager: {
        getBreaker: jest.fn(() => ({
          execute: jest.fn((fn) => fn())
        }))
      }
    }));

    const client = require('../../services/api/resilientHttpClient');
    const { runWithContext } = require('../../utils/requestContext');

    const result = await runWithContext({ requestId: 'ctx-789' }, () => client.request({
      serviceName: 'ctx-service',
      method: 'get',
      url: 'https://example.com/path'
    }));

    expect(result.success).toBe(true);
    expect(result.requestId).toBe('ctx-789');
    expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({ 'x-request-id': 'ctx-789' })
    }));
  });
});
