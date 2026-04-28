import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { indianLanguages, languagePreferences } from '../config/languages';
import api from '../services/api';
import logger from '../services/logger';

const AUTO_TRANSLATION_STORAGE_PREFIX = 'autoTranslatedBundle:';
const hydratedLanguages = new Set();
const HYDRATION_PRIORITY_SECTIONS = ['common', 'nav', 'auth', 'market', 'weather', 'map', 'cropRecommendation', 'dashboard'];
const TRANSLATION_BATCH_SIZE = 120;
const MAX_BATCH_ROUNDS = 40;

const flattenObject = (obj, prefix = '') => {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  Object.entries(obj).forEach(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenObject(value, next));
    } else {
      out[next] = value;
    }
  });
  return out;
};

const unflattenObject = (flatObj) => {
  const out = {};
  Object.entries(flatObj).forEach(([path, value]) => {
    const keys = path.split('.');
    let cur = out;
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        cur[k] = value;
      } else {
        if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
        cur = cur[k];
      }
    });
  });
  return out;
};

const loadCachedAutoBundle = (lang) => {
  try {
    const raw = localStorage.getItem(`${AUTO_TRANSLATION_STORAGE_PREFIX}${lang}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveCachedAutoBundle = (lang, bundle) => {
  try {
    localStorage.setItem(`${AUTO_TRANSLATION_STORAGE_PREFIX}${lang}`, JSON.stringify(bundle));
  } catch {
    // ignore storage errors
  }
};

const cleanupLegacyLanguageStorage = () => {
  try {
    const supported = new Set(languagePreferences.supportedLanguages);
    const legacyLanguage = localStorage.getItem('language');
    const legacyDetectorLanguage = localStorage.getItem('i18nextLng');

    if (legacyLanguage && !supported.has(legacyLanguage.toLowerCase().split('-')[0])) {
      localStorage.setItem('language', languagePreferences.defaultLanguage);
    }
    if (legacyDetectorLanguage && !supported.has(legacyDetectorLanguage.toLowerCase().split('-')[0])) {
      localStorage.setItem('i18nextLng', languagePreferences.defaultLanguage);
    }

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(AUTO_TRANSLATION_STORAGE_PREFIX)) continue;
      const lang = key.slice(AUTO_TRANSLATION_STORAGE_PREFIX.length);
      const normalized = (lang || '').toLowerCase().split('-')[0];
      if (!supported.has(normalized)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore storage errors
  }
};

const translateKeysInBatches = async ({ lang, keysToTranslate, enFlat, targetFlat, maxRounds = MAX_BATCH_ROUNDS }) => {
  const mergedFlat = { ...targetFlat };
  let cursor = 0;
  let rounds = 0;

  while (cursor < keysToTranslate.length && rounds < maxRounds) {
    const chunkKeys = keysToTranslate.slice(cursor, cursor + TRANSLATION_BATCH_SIZE);
    const chunkTexts = chunkKeys.map((key) => enFlat[key]).filter((v) => typeof v === 'string');
    if (chunkTexts.length === 0) {
      cursor += TRANSLATION_BATCH_SIZE;
      rounds += 1;
      continue;
    }

    try {
      const { data } = await api.post('/language/auto-translate-batch', {
        lang,
        texts: chunkTexts
      });
      const translated = data?.data?.translations || [];
      translated.forEach((value, idx) => {
        const key = chunkKeys[idx];
        if (key && typeof value === 'string' && value.trim()) {
          mergedFlat[key] = value;
        }
      });
    } catch (error) {
      logger.warn('Batch translation request failed', {
        lang,
        round: rounds,
        message: error?.message
      });
    }

    cursor += TRANSLATION_BATCH_SIZE;
    rounds += 1;
  }

  return mergedFlat;
};

const hydrateLanguageBundle = async (lang) => {
  if (!lang || lang === 'en' || hydratedLanguages.has(lang)) return;

  const cachedBundle = loadCachedAutoBundle(lang);
  if (cachedBundle) {
    i18n.addResourceBundle(lang, 'common', cachedBundle, true, true);
    hydratedLanguages.add(lang);
    return;
  }

  try {
    const [enRes, targetRes] = await Promise.all([
      fetch('/locales/en/common.json'),
      fetch(`/locales/${lang}/common.json`)
    ]);
    if (!enRes.ok || !targetRes.ok) return;

    const [enBundle, targetBundle] = await Promise.all([enRes.json(), targetRes.json()]);
    const enFlat = flattenObject(enBundle);
    const targetFlat = flattenObject(targetBundle);

    const keysToTranslate = [];
    Object.entries(enFlat).forEach(([key, enValue]) => {
      if (typeof enValue !== 'string') return;
      const targetValue = targetFlat[key];
      if (typeof targetValue !== 'string' || targetValue.trim() === '' || targetValue === enValue) {
        keysToTranslate.push(key);
      }
    });

    if (keysToTranslate.length === 0) {
      hydratedLanguages.add(lang);
      return;
    }

    const nextFlat = await translateKeysInBatches({
      lang,
      keysToTranslate,
      enFlat,
      targetFlat,
      maxRounds: MAX_BATCH_ROUNDS
    });

    const mergedBundle = unflattenObject(nextFlat);
    i18n.addResourceBundle(lang, 'common', mergedBundle, true, true);
    saveCachedAutoBundle(lang, mergedBundle);
    hydratedLanguages.add(lang);
  } catch (error) {
    logger.warn('Failed to auto-hydrate translation bundle', { lang, message: error?.message });
  }
};

const prehydratePriorityBundle = async (lang) => {
  if (!lang || lang === 'en') return;
  try {
    const [enRes, targetRes] = await Promise.all([
      fetch('/locales/en/common.json'),
      fetch(`/locales/${lang}/common.json`)
    ]);
    if (!enRes.ok || !targetRes.ok) return;
    const [enBundle, targetBundle] = await Promise.all([enRes.json(), targetRes.json()]);

    const enFlat = flattenObject(enBundle);
    const targetFlat = flattenObject(targetBundle);
    const keysToTranslate = [];
    Object.entries(enFlat).forEach(([key, enValue]) => {
      if (typeof enValue !== 'string') return;
      const section = key.split('.')[0];
      if (!HYDRATION_PRIORITY_SECTIONS.includes(section)) return;
      const targetValue = targetFlat[key];
      if (typeof targetValue !== 'string' || targetValue.trim() === '' || targetValue === enValue) {
        keysToTranslate.push(key);
      }
    });
    if (keysToTranslate.length === 0) return;

    const mergedFlat = await translateKeysInBatches({
      lang,
      keysToTranslate,
      enFlat,
      targetFlat,
      maxRounds: 8
    });
    const mergedBundle = unflattenObject(mergedFlat);
    i18n.addResourceBundle(lang, 'common', mergedBundle, true, true);
    saveCachedAutoBundle(lang, mergedBundle);
  } catch (error) {
    logger.warn('Failed pre-hydrating priority translation bundle', { lang, message: error?.message });
  }
};

const normalizeLanguageCode = (langCode) => {
  if (!langCode || typeof langCode !== 'string') {
    return languagePreferences.defaultLanguage;
  }

  const normalized = langCode.toLowerCase().split('-')[0];
  return languagePreferences.supportedLanguages.includes(normalized)
    ? normalized
    : languagePreferences.defaultLanguage;
};

const getInitialLanguage = () => {
  const storedLanguage = localStorage.getItem('language');
  const detectorLanguage = localStorage.getItem('i18nextLng');
  const browserLanguage = navigator.language;

  return normalizeLanguageCode(storedLanguage || detectorLanguage || browserLanguage);
};

if (!i18n.isInitialized) {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      supportedLngs: languagePreferences.supportedLanguages,
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      debug: false,
      interpolation: {
        escapeValue: false
      },
      backend: {
        loadPath: '/locales/{{lng}}/common.json',
        defaultNS: 'common'
      },
      defaultNS: 'common',
      ns: ['common'],
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'language',
        caches: ['localStorage']
      }
    });
}

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  useEffect(() => {
    cleanupLegacyLanguageStorage();
  }, []);

  const [language, setLanguage] = useState(getInitialLanguage);
  const [languageInfo, setLanguageInfo] = useState(() => {
    return indianLanguages[getInitialLanguage()] || indianLanguages[languagePreferences.defaultLanguage];
  });

  useEffect(() => {
    const normalizedLanguage = normalizeLanguageCode(language);
    i18n.changeLanguage(normalizedLanguage);
    localStorage.setItem('i18nextLng', normalizedLanguage);
    localStorage.setItem('language', normalizedLanguage);
    
    if (normalizedLanguage !== language) {
      setLanguage(normalizedLanguage);
      return;
    }
    
    const info = indianLanguages[normalizedLanguage] || indianLanguages[languagePreferences.defaultLanguage];
    setLanguageInfo(info);
    
    const rtlLanguages = ['ur', 'ar', 'he'];
    document.documentElement.setAttribute('dir', rtlLanguages.includes(normalizedLanguage) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', normalizedLanguage);
    
    if (info.fontFamily) {
      document.body.style.fontFamily = info.fontFamily;
    }

    prehydratePriorityBundle(normalizedLanguage);
    hydrateLanguageBundle(normalizedLanguage);
  }, [language]);

  const changeLanguage = useCallback(async (newLanguage) => {
    const normalizedLanguage = normalizeLanguageCode(newLanguage);
    if (normalizedLanguage === language) return;
    
    logger.info('Changing language', { language: normalizedLanguage });
    setLanguage(normalizedLanguage);
    
    await i18n.changeLanguage(normalizedLanguage);
    
    localStorage.setItem('i18nextLng', normalizedLanguage);
    localStorage.setItem('language', normalizedLanguage);
    
    const info = indianLanguages[normalizedLanguage] || indianLanguages[languagePreferences.defaultLanguage];
    setLanguageInfo(info);
    
    document.documentElement.setAttribute('lang', normalizedLanguage);
    document.documentElement.setAttribute('dir', info.direction || 'ltr');
    
    if (info.fontFamily) {
      document.body.style.fontFamily = info.fontFamily;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.post('/language/preference', { language: normalizedLanguage });
      }
    } catch (err) {
      logger.warn('Failed to update language preference on server', err);
    }
    
    window.dispatchEvent(new Event('languagechange'));
    window.dispatchEvent(new CustomEvent('i18n:languageChanged', { detail: { language: normalizedLanguage } }));
    
    i18n.emit('languageChanged', normalizedLanguage);
  }, [language]);

  const t = useCallback((key, options) => {
    return i18n.t(key, options);
  }, [language]);

  const getSupportedLanguages = useCallback(() => {
    return Object.values(indianLanguages).map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
      flag: lang.flag || '🇮🇳',
      emoji: lang.emoji || '🌐'
    }));
  }, []);

  const isRTL = (lang) => {
    return ['ur', 'ar', 'he'].includes(lang);
  };

  const value = {
    language,
    languageInfo,
    changeLanguage,
    t,
    i18n,
    getSupportedLanguages,
    isRTL: isRTL(language),
    direction: languageInfo.direction
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

