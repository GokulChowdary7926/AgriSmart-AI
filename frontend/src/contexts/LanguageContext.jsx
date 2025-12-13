import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { indianLanguages, languagePreferences } from '../config/languages';
import api from '../services/api';
import logger from '../services/logger';

if (!i18n.isInitialized) {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
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
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [languageInfo, setLanguageInfo] = useState(() => {
    return indianLanguages[language] || indianLanguages[languagePreferences.defaultLanguage];
  });

  useEffect(() => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    
    const info = indianLanguages[language] || indianLanguages[languagePreferences.defaultLanguage];
    setLanguageInfo(info);
    
    const rtlLanguages = ['ur', 'ar', 'he'];
    document.documentElement.setAttribute('dir', rtlLanguages.includes(language) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    
    if (info.fontFamily) {
      document.body.style.fontFamily = info.fontFamily;
    }
  }, [language]);

  const changeLanguage = useCallback(async (newLanguage) => {
    if (newLanguage === language) return;
    
    logger.info('Changing language', { language: newLanguage });
    setLanguage(newLanguage);
    
    await i18n.changeLanguage(newLanguage);
    
    localStorage.setItem('language', newLanguage);
    
    const info = indianLanguages[newLanguage] || indianLanguages[languagePreferences.defaultLanguage];
    setLanguageInfo(info);
    
    document.documentElement.setAttribute('lang', newLanguage);
    document.documentElement.setAttribute('dir', info.direction || 'ltr');
    
    if (info.fontFamily) {
      document.body.style.fontFamily = info.fontFamily;
    }
    
    try {
      await api.post('/language/preference', { language: newLanguage });
    } catch (err) {
      logger.warn('Failed to update language preference on server', err);
    }
    
    window.dispatchEvent(new Event('languagechange'));
    window.dispatchEvent(new CustomEvent('i18n:languageChanged', { detail: { language: newLanguage } }));
    
    i18n.emit('languageChanged', newLanguage);
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

