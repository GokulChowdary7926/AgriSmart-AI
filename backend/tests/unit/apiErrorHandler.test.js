const apiErrorHandler = require('../../services/api/apiErrorHandler');

describe('services/api/apiErrorHandler', () => {
  describe('parseError', () => {
    test('parses an axios error with response payload', () => {
      const err = {
        response: {
          status: 404,
          data: { error: 'not found', code: 'ENT_NOT_FOUND' }
        },
        message: 'Request failed'
      };
      const out = apiErrorHandler.parseError(err);
      expect(out.status).toBe(404);
      expect(out.code).toBe('ENT_NOT_FOUND');
      expect(out.message).toBe('not found');
    });

    test('falls back to HTTP_<status> when no code in payload', () => {
      const err = { response: { status: 500, data: { error: 'boom' } } };
      const out = apiErrorHandler.parseError(err);
      expect(out.code).toBe('HTTP_500');
      expect(out.message).toBe('boom');
    });

    test('handles request errors (no response)', () => {
      const err = { request: {}, message: 'timed out' };
      const out = apiErrorHandler.parseError(err);
      expect(out.status).toBe(0);
      expect(out.code).toBe('NO_RESPONSE');
      expect(out.message).toMatch(/no response/i);
    });

    test('handles plain throw errors', () => {
      const err = { message: 'unknown', code: 'UNKNOWN_ERROR' };
      const out = apiErrorHandler.parseError(err);
      expect(out.status).toBe(0);
      expect(out.code).toBe('UNKNOWN_ERROR');
    });

    test('handles errors with neither message nor code', () => {
      const out = apiErrorHandler.parseError({});
      expect(out.code).toBe('UNKNOWN_ERROR');
      expect(out.message).toBeDefined();
    });
  });

  describe('getUserFriendlyMessage', () => {
    test.each([
      [{ code: 'ECONNREFUSED' }, /connect/i],
      [{ code: 'ENOTFOUND' }, /connect/i],
      [{ code: 'ETIMEDOUT' }, /timed out/i],
      [{ status: 401 }, /authentication/i],
      [{ status: 403 }, /permission/i],
      [{ status: 404 }, /not found/i],
      [{ status: 429 }, /too many/i],
      [{ status: 500 }, /server error/i],
      [{ status: 503 }, /server error/i],
      [{ status: 400, message: 'bad input' }, /bad input/]
    ])('maps %p to a friendly message', (info, re) => {
      expect(apiErrorHandler.getUserFriendlyMessage(info)).toMatch(re);
    });

    test('returns the original message when no rule matches', () => {
      expect(apiErrorHandler.getUserFriendlyMessage({ message: 'oddly specific' })).toBe('oddly specific');
    });

    test('returns a generic catch-all when no clue at all', () => {
      const out = apiErrorHandler.getUserFriendlyMessage({});
      expect(out).toMatch(/unexpected/i);
    });
  });

  describe('isRetryable', () => {
    test('flags transient errors as retryable', () => {
      ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'NO_RESPONSE'].forEach((code) => {
        expect(apiErrorHandler.isRetryable({ code })).toBe(true);
      });
      expect(apiErrorHandler.isRetryable({ status: 500 })).toBe(true);
      expect(apiErrorHandler.isRetryable({ status: 503 })).toBe(true);
      expect(apiErrorHandler.isRetryable({ status: 429 })).toBe(true);
    });

    test('does not flag 4xx (other than 429) as retryable', () => {
      [400, 401, 403, 404].forEach((status) => {
        expect(apiErrorHandler.isRetryable({ status })).toBe(false);
      });
    });
  });

  describe('getRetryDelay', () => {
    test('uses exponential backoff with max cap', () => {
      const d0 = apiErrorHandler.getRetryDelay(0, {});
      const d1 = apiErrorHandler.getRetryDelay(1, {});
      const d2 = apiErrorHandler.getRetryDelay(2, {});
      const dMax = apiErrorHandler.getRetryDelay(20, {});
      expect(d0).toBe(1000);
      expect(d1).toBe(2000);
      expect(d2).toBe(4000);
      expect(dMax).toBe(10000);
    });

    test('honours retry-after on 429', () => {
      const out = apiErrorHandler.getRetryDelay(0, { status: 429, data: { retry_after: 7 } });
      expect(out).toBe(7000);
    });

    test('falls back to 5s for 429 without retry-after hint', () => {
      const out = apiErrorHandler.getRetryDelay(0, { status: 429 });
      expect(out).toBe(5000);
    });
  });

  describe('handleError', () => {
    test('returns a fallback envelope for retryable infra errors', () => {
      const err = { code: 'ECONNREFUSED', message: 'down' };
      const out = apiErrorHandler.handleError(err, 'weather', { params: { lat: 22, lng: 78 } });
      expect(out.success).toBe(false);
      expect(out.fallback).toBe(true);
      expect(out.data).toBeDefined();
      expect(typeof out.data.temperature).toBe('number');
      expect(out.data.location).toContain('22');
    });

    test('returns a fallback envelope with generic source for crops', () => {
      const err = { code: 'ECONNREFUSED', message: 'down' };
      const out = apiErrorHandler.handleError(err, 'crops');
      expect(out.fallback).toBe(true);
      expect(out.data.source).toBe('AgriSmart AI');
    });

    test('returns a non-fallback retryable envelope for plain 4xx', () => {
      const err = { response: { status: 400, data: { error: 'bad input' } } };
      const out = apiErrorHandler.handleError(err, 'weather');
      expect(out.success).toBe(false);
      expect(out.fallback).toBeUndefined();
      expect(out.code).toBe('HTTP_400');
      expect(out.retryable).toBe(false);
    });

    test('exposes original_error only in development', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const err = { code: 'ETIMEDOUT', message: 't' };
      const out = apiErrorHandler.handleError(err, 'weather');
      expect(out.original_error).toBeDefined();
      process.env.NODE_ENV = prev;
    });

    test('hides original_error outside development', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      const err = { code: 'ETIMEDOUT', message: 't' };
      const out = apiErrorHandler.handleError(err, 'weather');
      expect(out.original_error).toBeUndefined();
      process.env.NODE_ENV = prev;
    });
  });
});
