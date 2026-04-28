'use strict';

const path = require('path');
const fs = require('fs');

const DICTIONARIES = {
  en: {
    'chatbot.title': 'AgriSmart Assistant',
    'chatbot.responses.welcome': 'Hello! I am AgriSmart, your agriculture assistant. Ask me about crops, weather, market prices, diseases, or farming best practices.',
    'chatbot.responses.help': 'I can help with crops, weather, market prices, soil, irrigation, fertilizers, and disease management. What would you like to know?',
    'chatbot.responses.unknown': 'I am not sure I understood that. Could you rephrase, or ask about crops, weather, market prices, or disease management?',
    'chatbot.responses.disease': 'For {crop}, I can help with disease symptoms, treatments, and prevention. Which disease or symptom are you seeing?',
    'chatbot.responses.weather': 'I can show forecasts and crop-specific weather advisories. Share your location to begin.',
    'chatbot.responses.market': 'I can provide current market prices and price trends for major commodities. Which one would you like?',
    'chatbot.responses.crop': 'I can recommend suitable crops based on your soil, climate, and season. Which one are you considering?',
    'chatbot.context.crop': 'Crop conversation',
    'crops.title': 'your crop',
    'chatbot.suggestions': {
      cropAdvice: 'What are the best crops for this season?',
      weather: 'How is the weather affecting my crops?',
      diseases: 'How do I identify common plant diseases?',
      market: 'What are the current market prices?',
      irrigation: 'How much water does my crop need?',
      fertilizer: 'Which fertilizer should I use?'
    }
  }
};

function _localeFilePath(lang) {
  return path.join(__dirname, '..', 'i18n', 'locales', `${lang}.json`);
}

const _fileCache = new Map();

function _loadLocaleFile(lang) {
  if (!lang || lang === 'en') return null;
  if (_fileCache.has(lang)) return _fileCache.get(lang);
  try {
    const file = _localeFilePath(lang);
    if (fs.existsSync(file)) {
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      _fileCache.set(lang, json);
      return json;
    }
  } catch (_) {
    // Locale file missing or malformed — fall through to English defaults.
  }
  _fileCache.set(lang, null);
  return null;
}

function _resolveKey(dict, key) {
  if (!dict || typeof dict !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  const parts = String(key).split('.');
  let cursor = dict;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && Object.prototype.hasOwnProperty.call(cursor, part)) {
      cursor = cursor[part];
    } else {
      return undefined;
    }
  }
  return cursor;
}

function _interpolate(template, vars) {
  if (typeof template !== 'string' || !vars || typeof vars !== 'object') return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const v = vars[name];
    return v === undefined || v === null ? match : String(v);
  });
}

function translate(key, lang = 'en', vars) {
  if (key === undefined || key === null) return '';
  const language = typeof lang === 'string' && lang.length > 0 ? lang : 'en';

  const localeFile = _loadLocaleFile(language);
  if (localeFile) {
    const fileVal = _resolveKey(localeFile, key);
    if (fileVal !== undefined) return _interpolate(fileVal, vars);
  }

  const langDict = DICTIONARIES[language];
  if (langDict) {
    const langVal = _resolveKey(langDict, key);
    if (langVal !== undefined) return _interpolate(langVal, vars);
  }

  const enVal = _resolveKey(DICTIONARIES.en, key);
  if (enVal !== undefined) return _interpolate(enVal, vars);

  return String(key);
}

module.exports = {
  translate,
  _DICTIONARIES: DICTIONARIES
};
