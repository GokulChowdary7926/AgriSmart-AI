function bindStaticMethods(Cls) {
  const skip = new Set(['length', 'name', 'prototype']);
  for (const key of Object.getOwnPropertyNames(Cls)) {
    if (skip.has(key)) continue;
    const value = Cls[key];
    if (typeof value === 'function') {
      try {
        Cls[key] = value.bind(Cls);
      } catch (_) {
        // some intrinsic functions may not be rebindable; ignore
      }
    }
  }
  return Cls;
}

function bindInstanceMethods(instance) {
  const proto = Object.getPrototypeOf(instance);
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === 'constructor') continue;
    const value = instance[key];
    if (typeof value === 'function') {
      instance[key] = value.bind(instance);
    }
  }
  return instance;
}

module.exports = { bindStaticMethods, bindInstanceMethods };
