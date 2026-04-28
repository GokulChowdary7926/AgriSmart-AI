describe('auth middleware authorization envelope', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('authorize returns standardized 403 envelope for insufficient role', () => {
    const { authorize } = require('../../middleware/auth');

    const req = { user: { role: 'farmer' } };
    const res = {
      statusCode: 200,
      payload: null,
      req: { requestId: 'req-auth-403' },
      getHeader: jest.fn(() => 'req-auth-403'),
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.payload = body;
        return this;
      }
    };
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      },
      requestId: 'req-auth-403'
    });
  });
});
