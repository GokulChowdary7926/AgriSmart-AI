module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/teardown.js',
  testTimeout: 15000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/__pycache__/**'
  ],
  coverageThreshold: {
    global: {
      statements: 38,
      branches: 30,
      functions: 44,
      lines: 39
    }
  }
};
