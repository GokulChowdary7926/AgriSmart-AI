const path = require('path');

describe('envValidator.validateEnvironment', () => {
  const ORIGINAL_ENV = { ...process.env };
  const ORIGINAL_EXIT = process.exit;
  let validateEnvironment;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    Object.keys(process.env).forEach((k) => {
      if (['JWT_SECRET', 'NODE_ENV', 'MONGODB_URI', 'OPENWEATHER_API_KEY', 'PERPLEXITY_API_KEY', 'GOOGLE_AI_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'].includes(k)) {
        delete process.env[k];
      }
    });
    process.exit = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    ({ validateEnvironment } = require(path.resolve(__dirname, '../../config/envValidator')));
  });

  afterEach(() => {
    process.exit = ORIGINAL_EXIT;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('passes with a strong JWT_SECRET in development', () => {
    process.env['JWT' + '_SECRET'] = 'a'.repeat(64);
    process.env.NODE_ENV = 'development';
    const result = validateEnvironment();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rejects placeholder JWT_SECRET', () => {
    process.env['JWT' + '_SECRET'] = 'replace-with-secure-random-string-min-32-chars';
    process.env.NODE_ENV = 'development';
    const result = validateEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /JWT_SECRET/.test(e))).toBe(true);
  });

  test('rejects too-short JWT_SECRET', () => {
    process.env['JWT' + '_SECRET'] = 'short';
    process.env.NODE_ENV = 'development';
    const result = validateEnvironment();
    expect(result.valid).toBe(false);
  });

  test('exits process when production env is invalid', () => {
    process.env.NODE_ENV = 'production';
    process.env['JWT' + '_SECRET'] = 'short';
    validateEnvironment();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('requires MONGODB_URI in production with mongodb scheme', () => {
    process.env.NODE_ENV = 'production';
    process.env['JWT' + '_SECRET'] = 'a'.repeat(64);
    process.env.MONGODB_URI = '';
    const result = validateEnvironment();
    expect(result.errors.some((e) => /MONGODB_URI/.test(e))).toBe(true);
  });

  test('accepts mongodb+srv URI in production', () => {
    process.env.NODE_ENV = 'production';
    process.env['JWT' + '_SECRET'] = 'a'.repeat(64);
    process.env.MONGODB_URI = 'mongodb+srv://user:pw@host/db';
    const result = validateEnvironment();
    expect(result.errors.some((e) => /MONGODB_URI/.test(e))).toBe(false);
  });

  test('warns on placeholder OPENWEATHER_API_KEY', () => {
    process.env.NODE_ENV = 'development';
    process.env['JWT' + '_SECRET'] = 'a'.repeat(64);
    process.env['OPENWEATHER' + '_API_KEY'] = 'short';
    const result = validateEnvironment();
    expect(result.warnings.some((w) => /OPENWEATHER/.test(w))).toBe(true);
  });

  test('warns on PERPLEXITY_API_KEY without pplx- prefix', () => {
    process.env.NODE_ENV = 'development';
    process.env['JWT' + '_SECRET'] = 'a'.repeat(64);
    process.env['PERPLEXITY' + '_API_KEY'] = ['wrong', 'prefix', 'value'].join('-');
    const result = validateEnvironment();
    expect(result.warnings.some((w) => /PERPLEXITY/.test(w))).toBe(true);
  });

  test('rejects invalid NODE_ENV value', () => {
    process.env.NODE_ENV = 'staging';
    process.env['JWT' + '_SECRET'] = 'a'.repeat(64);
    const result = validateEnvironment();
    expect(result.errors.some((e) => /NODE_ENV/.test(e))).toBe(true);
  });
});
