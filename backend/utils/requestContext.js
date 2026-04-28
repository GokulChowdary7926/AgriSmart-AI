const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

function runWithContext(context, callback) {
  return asyncLocalStorage.run(context || {}, callback);
}

function getContext() {
  return asyncLocalStorage.getStore() || {};
}

function getRequestId() {
  return getContext().requestId || null;
}

module.exports = {
  runWithContext,
  getContext,
  getRequestId
};
