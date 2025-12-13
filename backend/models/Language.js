const mongoose = require('mongoose');
const logger = require('../utils/logger');

const languageSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 2
  },
  name: {
    en: { type: String, required: true },
    native: { type: String, required: true }
  },
  direction: {
    type: String,
    enum: ['ltr', 'rtl'],
    default: 'ltr'
  },
  script: String,
  locale: String,
  isActive: {
    type: Boolean,
    default: true
  },
  flag: String,
  countryCode: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

languageSchema.statics.initializeLanguages = async function() {
  const languages = [
    {
      code: 'EN',
      name: { en: 'English', native: 'English' },
      direction: 'ltr',
      script: 'Latin',
      locale: 'en-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'HI',
      name: { en: 'Hindi', native: 'हिन्दी' },
      direction: 'ltr',
      script: 'Devanagari',
      locale: 'hi-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'TA',
      name: { en: 'Tamil', native: 'தமிழ்' },
      direction: 'ltr',
      script: 'Tamil',
      locale: 'ta-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'TE',
      name: { en: 'Telugu', native: 'తెలుగు' },
      direction: 'ltr',
      script: 'Telugu',
      locale: 'te-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'KN',
      name: { en: 'Kannada', native: 'ಕನ್ನಡ' },
      direction: 'ltr',
      script: 'Kannada',
      locale: 'kn-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'ML',
      name: { en: 'Malayalam', native: 'മലയാളം' },
      direction: 'ltr',
      script: 'Malayalam',
      locale: 'ml-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'BN',
      name: { en: 'Bengali', native: 'বাংলা' },
      direction: 'ltr',
      script: 'Bengali',
      locale: 'bn-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'MR',
      name: { en: 'Marathi', native: 'मराठी' },
      direction: 'ltr',
      script: 'Devanagari',
      locale: 'mr-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'GU',
      name: { en: 'Gujarati', native: 'ગુજરાતી' },
      direction: 'ltr',
      script: 'Gujarati',
      locale: 'gu-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    },
    {
      code: 'PA',
      name: { en: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
      direction: 'ltr',
      script: 'Gurmukhi',
      locale: 'pa-IN',
      flag: '🇮🇳',
      countryCode: 'IN'
    }
  ];

  for (const lang of languages) {
    await this.findOneAndUpdate(
      { code: lang.code },
      lang,
      { upsert: true, new: true }
    );
  }

  logger.info('Indian languages initialized');
};

module.exports = mongoose.model('Language', languageSchema);

