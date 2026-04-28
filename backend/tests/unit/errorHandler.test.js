const errorHandler = require('../../middleware/errorHandler');

function makeRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.payload = data; return this; }
  };
}

const ORIGINAL_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});

describe('errorHandler', () => {
  test('returns unified error envelope with requestId for default 500', () => {
    const res = makeRes();
    const err = new Error('boom');
    errorHandler(err, { requestId: 'rid-err', method: 'GET', originalUrl: '/x' }, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error.code).toBe('INTERNAL_ERROR');
    expect(res.payload.error.message).toBe('boom');
    expect(res.payload.requestId).toBe('rid-err');
  });

  test('honors err.statusCode and derives code from status', () => {
    const res = makeRes();
    const err = Object.assign(new Error('not here'), { statusCode: 404 });
    errorHandler(err, { requestId: 'r2' }, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.payload.error.code).toBe('NOT_FOUND');
  });

  test('honors err.status and explicit err.code', () => {
    const res = makeRes();
    const err = Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });
    errorHandler(err, {}, res, () => {});

    expect(res.statusCode).toBe(403);
    expect(res.payload.error.code).toBe('FORBIDDEN');
  });

  test('maps 401 status without explicit code to UNAUTHORIZED', () => {
    const res = makeRes();
    errorHandler(Object.assign(new Error('nope'), { status: 401 }), {}, res, () => {});
    expect(res.payload.error.code).toBe('UNAUTHORIZED');
  });

  test('maps 400 status without explicit code to BAD_REQUEST', () => {
    const res = makeRes();
    errorHandler(Object.assign(new Error('bad'), { status: 400 }), {}, res, () => {});
    expect(res.payload.error.code).toBe('BAD_REQUEST');
  });

  test('includes stack only in development', () => {
    process.env.NODE_ENV = 'development';
    const res = makeRes();
    const err = new Error('dev-leak');
    errorHandler(err, {}, res, () => {});
    expect(typeof res.payload.error.stack).toBe('string');

    process.env.NODE_ENV = 'production';
    const resProd = makeRes();
    const errProd = new Error('prod-leak');
    errorHandler(errProd, {}, resProd, () => {});
    expect(resProd.payload.error.stack).toBeUndefined();
  });
});
