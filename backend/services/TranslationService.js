
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class TranslationService {
  constructor() {
    this.supportedLanguages = ['en', 'hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml', 'pa'];
    this.translations = this.loadTranslations();
  }

  loadTranslations() {
    const translations = {};
    const localesDir = path.join(__dirname, '../i18n/locales');
    
    if (!fs.existsSync(localesDir)) {
      logger.warn('Locales directory not found, using default translations');
      return this.getDefaultTranslations();
    }
    
    for (const lang of this.supportedLanguages) {
      const langFile = path.join(localesDir, `${lang}.json`);
      if (fs.existsSync(langFile)) {
        try {
          const content = fs.readFileSync(langFile, 'utf8');
          translations[lang] = JSON.parse(content);
        } catch (error) {
          logger.error(`Error loading translation file ${lang}: ${error.message}`);
          translations[lang] = this.getDefaultTranslations()[lang] || {};
        }
      } else {
        translations[lang] = this.getDefaultTranslations()[lang] || {};
      }
    }
    
    return translations;
  }

  getDefaultTranslations() {
    return {
      en: {
        welcome: 'Welcome, {name}!',
        weather: 'Weather',
        crops: 'Crops',
        diseases: 'Diseases',
        market: 'Market',
        soil: 'Soil',
        irrigation: 'Irrigation',
        fertilizer: 'Fertilizer',
        harvest: 'Harvest',
        alert: 'Alert',
        success: 'Success',
        error: 'Error',
        loading: 'Loading...',
        no_data: 'No data available',
        search: 'Search',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
        login: 'Login',
        register: 'Register',
        phone: 'Phone Number',
        password: 'Password',
        verify: 'Verify',
        send_otp: 'Send OTP',
        disease_detected: 'Disease detected: {disease}',
        treatment: 'Treatment: {treatment}',
        weather_alert: 'Weather Alert',
        market_price: 'Market Price: ₹{price}',
        crop_advice: 'Crop advice for {crop}',
        soil_health: 'Soil Health: {status}',
        irrigation_time: 'Irrigation Time: {time}',
        fertilizer_dose: 'Fertilizer Dose: {dose}',
        harvest_time: 'Harvest Time: {time}'
      },
      hi: {
        welcome: 'स्वागत है, {name}!',
        weather: 'मौसम',
        crops: 'फसलें',
        diseases: 'रोग',
        market: 'बाजार',
        soil: 'मिट्टी',
        irrigation: 'सिंचाई',
        fertilizer: 'उर्वरक',
        harvest: 'फसल कटाई',
        alert: 'चेतावनी',
        success: 'सफलता',
        error: 'त्रुटि',
        loading: 'लोड हो रहा है...',
        no_data: 'कोई डेटा नहीं',
        search: 'खोजें',
        settings: 'सेटिंग्स',
        profile: 'प्रोफाइल',
        logout: 'लॉग आउट',
        login: 'लॉगिन',
        register: 'पंजीकरण',
        phone: 'फोन नंबर',
        password: 'पासवर्ड',
        verify: 'सत्यापित करें',
        send_otp: 'OTP भेजें',
        disease_detected: 'रोग पाया गया: {disease}',
        treatment: 'उपचार: {treatment}',
        weather_alert: 'मौसम चेतावनी',
        market_price: 'बाजार मूल्य: ₹{price}',
        crop_advice: '{crop} की खेती के लिए सलाह',
        soil_health: 'मिट्टी स्वास्थ्य: {status}',
        irrigation_time: 'सिंचाई का समय: {time}',
        fertilizer_dose: 'उर्वरक की मात्रा: {dose}',
        harvest_time: 'फसल कटाई का समय: {time}'
      },
      te: {
        welcome: 'స్వాగతం, {name}!',
        weather: 'వాతావరణం',
        crops: 'పంటలు',
        diseases: 'వ్యాధులు',
        market: 'మార్కెట్',
        soil: 'న chల',
        irrigation: 'నీటి పారుదల',
        fertilizer: 'ఎరువు',
        harvest: 'పంట కోత',
        alert: 'హెచ్చరిక',
        success: 'విజయం',
        error: 'దోషం',
        loading: 'లోడ్ అవుతోంది...',
        no_data: 'డేటా లేదు',
        search: 'శోధించు',
        settings: 'సెట్టింగ్‌లు',
        profile: 'ప్రొఫైల్',
        logout: 'లాగ్అవుట్',
        login: 'లాగిన్',
        register: 'నమోదు',
        phone: 'ఫోన్ నంబర్',
        password: 'పాస్‌వర్డ్',
        verify: 'ధృవీకరించు',
        send_otp: 'OTP పంపండి',
        disease_detected: 'వ్యాధి కనుగొనబడింది: {disease}',
        treatment: 'చికిత్స: {treatment}',
        weather_alert: 'వాతావరణ హెచ్చరిక',
        market_price: 'మార్కెట్ ధర: ₹{price}',
        crop_advice: '{crop} పంటకు సలహా',
        soil_health: 'న chల ఆరోగ్యం: {status}',
        irrigation_time: 'నీటి పారుదల సమయం: {time}',
        fertilizer_dose: 'ఎరువు మోతాదు: {dose}',
        harvest_time: 'పంట కోత సమయం: {time}'
      }
    };
  }

  translate(key, language = 'en', params = {}) {
    if (!this.supportedLanguages.includes(language)) {
      language = 'en';
    }
    
    let translation = this.translations[language]?.[key] || 
                     this.translations['en']?.[key] || 
                     key;
    
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
      });
    }
    
    return translation;
  }

  getAllTranslations(key) {
    const result = {};
    for (const lang of this.supportedLanguages) {
      result[lang] = this.translate(key, lang);
    }
    return result;
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }
}

module.exports = new TranslationService();












