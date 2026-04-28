const { translate } = require('../../utils/translation');

describe('utils/translation', () => {
  test('returns the key itself when nothing matches', () => {
    expect(translate('totally.unknown.key')).toBe('totally.unknown.key');
  });

  test('returns "" for null/undefined keys', () => {
    expect(translate(null)).toBe('');
    expect(translate(undefined)).toBe('');
  });

  test('resolves a known dotted key from the English dictionary', () => {
    const out = translate('chatbot.title');
    expect(typeof out).toBe('string');
    expect(out.toLowerCase()).toContain('agri');
  });

  test('falls back to English when an unsupported lang is requested', () => {
    const en = translate('chatbot.responses.welcome', 'en');
    const xx = translate('chatbot.responses.welcome', 'xx');
    expect(xx).toBe(en);
  });

  test('coerces non-string lang to "en"', () => {
    const en = translate('chatbot.responses.welcome', 'en');
    expect(translate('chatbot.responses.welcome', null)).toBe(en);
    expect(translate('chatbot.responses.welcome', undefined)).toBe(en);
    expect(translate('chatbot.responses.welcome', 0)).toBe(en);
  });

  test('interpolates {var} placeholders from the vars object', () => {
    const out = translate('chatbot.responses.disease', 'en', { crop: 'wheat' });
    expect(out).toContain('wheat');
    expect(out).not.toContain('{crop}');
  });

  test('leaves unknown {var} placeholders untouched', () => {
    const out = translate('chatbot.responses.disease', 'en', {});
    expect(out).toContain('{crop}');
  });

  test('handles non-string values in dictionary (e.g. suggestions object)', () => {
    const out = translate('chatbot.suggestions', 'en');
    expect(typeof out).toBe('object');
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });

  test('null vars argument does not throw', () => {
    const out = translate('chatbot.responses.welcome', 'en', null);
    expect(typeof out).toBe('string');
  });
});
