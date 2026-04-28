const path = require('path');

describe('AuthService rotation, JTI, and reuse detection', () => {
  let auth;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.REDIS_URL = '';
    auth = require(path.resolve(__dirname, '../../services/AuthService'));
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('createAccessToken and createRefreshToken include unique JTIs and correct types', () => {
    const access = auth.createAccessToken({ sub: 'u1' });
    const refresh = auth.createRefreshToken({ sub: 'u1' });
    const a = auth.verifyToken(access);
    const r = auth.verifyToken(refresh);
    expect(a.type).toBe('access');
    expect(r.type).toBe('refresh');
    expect(a.jti).toBeTruthy();
    expect(r.jti).toBeTruthy();
    expect(a.jti).not.toBe(r.jti);
  });

  test('createSession returns access+refresh tokens with embedded JTI', async () => {
    const session = await auth.createSession('user-123', 'device-1');
    expect(session.access_token).toBeTruthy();
    expect(session.refresh_token).toBeTruthy();
    expect(session.token_type).toBe('bearer');
    const decoded = auth.verifyToken(session.refresh_token);
    expect(decoded.jti).toBeTruthy();
    expect(decoded.sub).toBe('user-123');
    expect(decoded.device_id).toBe('device-1');
  });

  test('refreshAccessToken rotates and issues a different refresh token', async () => {
    const session = await auth.createSession('user-456', 'd1');
    const rotated = await auth.refreshAccessToken(session.refresh_token);
    expect(rotated.access_token).toBeTruthy();
    expect(rotated.refresh_token).toBeTruthy();
    expect(rotated.refresh_token).not.toBe(session.refresh_token);
    const newDecoded = auth.verifyToken(rotated.refresh_token);
    const oldDecoded = auth.verifyToken(session.refresh_token);
    expect(newDecoded.jti).not.toBe(oldDecoded.jti);
  });

  test('refreshAccessToken rejects access tokens (wrong type)', async () => {
    const access = auth.createAccessToken({ sub: 'u1' });
    await expect(auth.refreshAccessToken(access)).rejects.toThrow(/invalid refresh token/i);
  });

  test('refreshAccessToken rejects malformed tokens', async () => {
    await expect(auth.refreshAccessToken('not-a-jwt')).rejects.toThrow(/invalid refresh token/i);
  });

  test('reuse detection rejects when allowlist says token already revoked (Redis-backed)', async () => {
    const fakeStore = new Map();
    auth.redisClient = {
      get: jest.fn((k) => Promise.resolve(fakeStore.has(k) ? fakeStore.get(k) : null)),
      setEx: jest.fn((k, _ttl, v) => { fakeStore.set(k, v); return Promise.resolve(); }),
      del: jest.fn((k) => { fakeStore.delete(k); return Promise.resolve(); }),
      keys: jest.fn((pattern) => {
        const prefix = pattern.replace('*', '');
        return Promise.resolve(Array.from(fakeStore.keys()).filter((k) => k.startsWith(prefix)));
      })
    };

    const session = await auth.createSession('user-789', 'd1');
    const decoded = auth.verifyToken(session.refresh_token);
    const allowKey = `refresh_allow:user-789:${decoded.jti}`;
    expect(fakeStore.get(allowKey)).toBe('1');

    await auth.refreshAccessToken(session.refresh_token);
    expect(fakeStore.has(allowKey)).toBe(false);

    await expect(auth.refreshAccessToken(session.refresh_token))
      .rejects.toThrow(/reuse|invalid/i);
  });

  test('logout clears all allowlist entries for a user (Redis-backed)', async () => {
    const fakeStore = new Map();
    auth.redisClient = {
      get: jest.fn((k) => Promise.resolve(fakeStore.has(k) ? fakeStore.get(k) : null)),
      setEx: jest.fn((k, _ttl, v) => { fakeStore.set(k, v); return Promise.resolve(); }),
      del: jest.fn((k) => { fakeStore.delete(k); return Promise.resolve(); }),
      keys: jest.fn((pattern) => {
        const prefix = pattern.replace('*', '');
        return Promise.resolve(Array.from(fakeStore.keys()).filter((k) => k.startsWith(prefix)));
      })
    };

    await auth.createSession('user-logout', 'd1');
    await auth.createSession('user-logout', 'd2');
    const allowKeys = Array.from(fakeStore.keys()).filter((k) => k.startsWith('refresh_allow:user-logout:'));
    expect(allowKeys.length).toBeGreaterThanOrEqual(2);

    await auth.logout('user-logout');
    const remaining = Array.from(fakeStore.keys()).filter((k) => k.startsWith('refresh_allow:user-logout:'));
    expect(remaining.length).toBe(0);
  });

  test('formatPhoneNumber normalizes Indian numbers', () => {
    expect(auth.formatPhoneNumber('9876543210')).toBe('+919876543210');
    expect(auth.formatPhoneNumber('919876543210')).toBe('+919876543210');
    expect(auth.formatPhoneNumber('+919876543210')).toBe('+919876543210');
  });

  test('generateOTP returns a 6-digit numeric string', () => {
    const otp = auth.generateOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });

  test('hashPassword + verifyPassword round-trip works', async () => {
    const hash = await auth.hashPassword('s3cret!');
    expect(hash).not.toBe('s3cret!');
    expect(await auth.verifyPassword('s3cret!', hash)).toBe(true);
    expect(await auth.verifyPassword('wrong', hash)).toBe(false);
  });
});
