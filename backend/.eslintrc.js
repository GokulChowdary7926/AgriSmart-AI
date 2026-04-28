module.exports = {
  env: {
    node: true,
    jest: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'off',
    'no-empty': 'off',
    'no-useless-escape': 'off',
    'no-inner-declarations': 'off',
    'no-case-declarations': 'off',
    'no-const-assign': 'off',
    'no-dupe-keys': 'off'
  },
  ignorePatterns: ['coverage/', 'node_modules/']
};
