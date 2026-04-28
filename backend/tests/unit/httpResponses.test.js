const {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  serverError,
  serviceUnavailable,
  errorPayload
} = require('../../utils/httpResponses');

function createRes(requestId = 'req-test-1') {
  return {
    req: { requestId },
    statusCode: 200,
    payload: null,
    getHeader: jest.fn(() => requestId),
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

describe('httpResponses contract envelope', () => {
  test('ok() includes success, data, requestId, and metadata', () => {
    const res = createRes('req-ok-1');
    ok(
      res,
      { value: 42 },
      {
        source: 'AgriSmart AI',
        isFallback: true,
        degradedReason: 'provider_unavailable'
      }
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      success: true,
      data: { value: 42 },
      requestId: 'req-ok-1',
      source: 'AgriSmart AI',
      isFallback: true,
      degradedReason: 'provider_unavailable'
    });
  });

  test('badRequest() includes error object and requestId', () => {
    const res = createRes('req-bad-1');
    badRequest(res, 'Invalid input', { field: 'email' });

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.requestId).toBe('req-bad-1');
    expect(res.payload.error).toEqual({
      code: 'BAD_REQUEST',
      message: 'Invalid input',
      details: { field: 'email' }
    });
  });

  test.each([
    ['unauthorized', unauthorized, 401, 'UNAUTHORIZED'],
    ['forbidden', forbidden, 403, 'FORBIDDEN'],
    ['notFound', notFound, 404, 'NOT_FOUND'],
    ['tooManyRequests', tooManyRequests, 429, 'RATE_LIMIT'],
    ['serverError', serverError, 500, 'INTERNAL_ERROR'],
    ['serviceUnavailable', serviceUnavailable, 503, 'SERVICE_UNAVAILABLE']
  ])('%s() returns standardized error envelope', (name, fn, status, code) => {
    const res = createRes(`req-${name}`);
    fn(res, `${name} message`);
    expect(res.statusCode).toBe(status);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error.code).toBe(code);
    expect(res.payload.error.message).toBe(`${name} message`);
    expect(res.payload.requestId).toBe(`req-${name}`);
  });

  test('errorPayload omits details when absent and requestId when missing', () => {
    const payload = errorPayload('BAD', 'msg');
    expect(payload.error.details).toBeUndefined();
    expect(payload.requestId).toBeUndefined();
  });

  test('_ridFromRes falls back to x-request-id header when req.requestId missing', () => {
    const res = {
      req: {},
      statusCode: 200,
      payload: null,
      getHeader: jest.fn(() => 'rid-header'),
      status(code) { this.statusCode = code; return this; },
      json(body) { this.payload = body; return this; }
    };
    notFound(res, 'gone');
    expect(res.payload.requestId).toBe('rid-header');
  });

  test('ok() works with no meta and no request id', () => {
    const res = {
      statusCode: 200,
      payload: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.payload = body; return this; }
    };
    ok(res, { x: 1 });
    expect(res.payload).toEqual({ success: true, data: { x: 1 } });
  });
});
