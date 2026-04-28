const fs = require('fs');
const path = require('path');

const controllersDir = path.resolve(__dirname, '../../controllers');

function makeMockReq(overrides = {}) {
  return {
    method: 'GET',
    url: '/',
    originalUrl: '/',
    query: {},
    params: {},
    body: {},
    headers: {},
    requestId: 'rid-binding',
    ...overrides
  };
}

function makeMockRes() {
  return {
    statusCode: 200,
    headersSent: false,
    payload: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set() { return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
    json(body) { this.payload = body; return this; },
    send(body) { this.payload = body; return this; },
    type() { return this; },
    end(body) { this.payload = body; return this; }
  };
}

const isBindingError = (err) =>
  err && err.message && /Cannot read properties of undefined \(reading '/.test(err.message);

describe('Controller method binding regression', () => {
  const files = fs
    .readdirSync(controllersDir)
    .filter((f) => f.endsWith('.js') && !f.startsWith('.'));

  test.each(files)('%s: every exported handler can be invoked unbound without a this-undefined crash', async (file) => {
    const mod = require(path.join(controllersDir, file));

    const handlerNames = [];
    if (typeof mod === 'object' && mod !== null) {
      for (const k of Object.keys(mod)) {
        if (typeof mod[k] === 'function') handlerNames.push(k);
      }
    }
    if (typeof mod === 'function') {
      for (const k of Object.getOwnPropertyNames(mod)) {
        if (k === 'length' || k === 'name' || k === 'prototype') continue;
        if (typeof mod[k] === 'function') handlerNames.push(k);
      }
    }

    if (handlerNames.length === 0) {
      // Empty / placeholder controller — nothing to validate.
      return;
    }

    for (const name of handlerNames) {
      const fn = mod[name];
      const detached = fn;
      const req = makeMockReq();
      const res = makeMockRes();
      const next = () => {};

      const captured = await Promise.race([
        Promise.resolve()
          .then(() => detached(req, res, next))
          .then(() => null, (err) => err),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 250))
      ]);

      if (captured && captured !== 'timeout' && isBindingError(captured)) {
        throw new Error(`${file}::${name} crashed with this-binding error: ${captured.message}`);
      }
    }
  }, 30000);
});
