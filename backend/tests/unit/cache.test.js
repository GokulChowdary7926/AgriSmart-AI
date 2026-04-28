const cacheModule = require('../../utils/cache');

function makeFakeRedis(overrides = {}) {
  return {
    get: jest.fn().mockResolvedValue('cached-value'),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ...overrides
  };
}

describe('utils/cache', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('getInstance returns a disabled cache when init has not run', () => {
    const fresh = require('../../utils/cache');
    const cache = fresh.getInstance();
    expect(cache.enabled).toBe(false);
  });

  test('init wires up an enabled cache that reads/writes via redis', async () => {
    const fresh = require('../../utils/cache');
    const redis = makeFakeRedis();
    const cache = fresh.init(redis);
    expect(cache.enabled).toBe(true);

    expect(await cache.get('foo')).toBe('cached-value');
    expect(redis.get).toHaveBeenCalledWith('foo');

    expect(await cache.set('foo', 'bar', 60)).toBe(true);
    expect(redis.setEx).toHaveBeenCalledWith('foo', 60, 'bar');

    expect(await cache.del('foo')).toBe(true);
    expect(redis.del).toHaveBeenCalledWith('foo');
  });

  test('disabled cache returns null/false without throwing', async () => {
    const fresh = require('../../utils/cache');
    const cache = fresh.init(null);
    expect(await cache.get('x')).toBeNull();
    expect(await cache.set('x', 'y')).toBe(false);
    expect(await cache.del('x')).toBe(false);
    expect(await cache.delPattern('p:*')).toBe(false);
  });

  test('get/set/del swallow redis errors and warn', async () => {
    const fresh = require('../../utils/cache');
    const redis = makeFakeRedis({
      get: jest.fn().mockRejectedValue(new Error('boom-get')),
      setEx: jest.fn().mockRejectedValue(new Error('boom-set')),
      del: jest.fn().mockRejectedValue(new Error('boom-del'))
    });
    const cache = fresh.init(redis);
    expect(await cache.get('k')).toBeNull();
    expect(await cache.set('k', 'v')).toBe(false);
    expect(await cache.del('k')).toBe(false);
  });

  test('setex delegates to set with reordered args', async () => {
    const fresh = require('../../utils/cache');
    const redis = makeFakeRedis();
    const cache = fresh.init(redis);
    await cache.setex('k', 30, 'v');
    expect(redis.setEx).toHaveBeenCalledWith('k', 30, 'v');
  });

  test('delPattern resolves matched keys and deletes them in batch', async () => {
    const fresh = require('../../utils/cache');
    const redis = makeFakeRedis({
      keys: jest.fn().mockResolvedValue(['p:1', 'p:2', 'p:3'])
    });
    const cache = fresh.init(redis);
    expect(await cache.delPattern('p:*')).toBe(true);
    expect(redis.keys).toHaveBeenCalledWith('p:*');
    expect(redis.del).toHaveBeenCalledWith(['p:1', 'p:2', 'p:3']);
  });

  test('delPattern is a no-op when no keys match', async () => {
    const fresh = require('../../utils/cache');
    const redis = makeFakeRedis({ keys: jest.fn().mockResolvedValue([]) });
    const cache = fresh.init(redis);
    expect(await cache.delPattern('none:*')).toBe(true);
    expect(redis.del).not.toHaveBeenCalled();
  });

  test('delPattern swallows redis errors', async () => {
    const fresh = require('../../utils/cache');
    const redis = makeFakeRedis({
      keys: jest.fn().mockRejectedValue(new Error('keys-fail'))
    });
    const cache = fresh.init(redis);
    expect(await cache.delPattern('p:*')).toBe(false);
  });

  // Touch the singleton wrapper at module level so coverage records it
  test('module exposes init and getInstance', () => {
    expect(typeof cacheModule.init).toBe('function');
    expect(typeof cacheModule.getInstance).toBe('function');
  });
});
