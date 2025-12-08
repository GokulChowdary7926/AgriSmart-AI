import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { indianLanguages, languagePreferences } from '../config/languages';
import api from '../services/api';

// Initialize i18n only if not already initialized
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
    // Update i18n when language changes
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    
    // Update language info
    const info = indianLanguages[language] || indianLanguages[languagePreferences.defaultLanguage];
    setLanguageInfo(info);
    
    // Set document direction for RTL languages
    const rtlLanguages = ['ur', 'ar', 'he'];
    document.documentElement.setAttribute('dir', rtlLanguages.includes(language) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    
    // Update font family
    if (info.fontFamily) {
      document.body.style.fontFamily = info.fontFamily;
    }
  }, [language]);

  const changeLanguage = useCallback(async (newLanguage) => {
    if (newLanguage === language) return;
    
    console.log('🌐 Changing language to:', newLanguage);
    setLanguage(newLanguage);
    
    // Change i18n language and wait for it to load
    await i18n.changeLanguage(newLanguage);
    
    // Update localStorage
    localStorage.setItem('language', newLanguage);
    
    // Update language info immediately
    const info = indianLanguages[newLanguage] || indianLanguages[languagePreferences.defaultLanguage];
    setLanguageInfo(info);
    
    // Force a re-render by updating document
    document.documentElement.setAttribute('lang', newLanguage);
    document.documentElement.setAttribute('dir', info.direction || 'ltr');
    
    if (info.fontFamily) {
      document.body.style.fontFamily = info.fontFamily;
    }
    
    // Notify backend of language change
    try {
      await api.post('/language/preference', { language: newLanguage });
    } catch (err) {
      console.warn('Failed to update language preference on server:', err);
    }
    
    // Force component re-render - dispatch multiple events to ensure all components update
    window.dispatchEvent(new Event('languagechange'));
    window.dispatchEvent(new CustomEvent('i18n:languageChanged', { detail: { language: newLanguage } }));
    
    // Also trigger i18n's own event
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

