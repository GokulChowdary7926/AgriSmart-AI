export const indianLanguages = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇮🇳',
    emoji: '🌐',
    direction: 'ltr',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    emoji: '📖',
    direction: 'ltr',
    fontFamily: '"Noto Sans Devanagari", "Mukta", sans-serif'
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    emoji: '📚',
    direction: 'ltr',
    fontFamily: '"Noto Sans Tamil", "Latha", sans-serif'
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    emoji: '📝',
    direction: 'ltr',
    fontFamily: '"Noto Sans Telugu", "Pothana2000", sans-serif'
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    emoji: '📗',
    direction: 'ltr',
    fontFamily: '"Noto Sans Kannada", "Tunga", sans-serif'
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    emoji: '📘',
    direction: 'ltr',
    fontFamily: '"Noto Sans Malayalam", "Rachana", sans-serif'
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    emoji: '📕',
    direction: 'ltr',
    fontFamily: '"Noto Sans Devanagari", "Mukta", sans-serif'
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    emoji: '📙',
    direction: 'ltr',
    fontFamily: '"Noto Sans Bengali", "SolaimanLipi", sans-serif'
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    emoji: '📓',
    direction: 'ltr',
    fontFamily: '"Noto Sans Gujarati", "Shruti", sans-serif'
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    emoji: '📔',
    direction: 'ltr',
    fontFamily: '"Noto Sans Gurmukhi", "Raavi", sans-serif'
  }
};

export const languagePreferences = {
  defaultLanguage: 'en',
  supportedLanguages: Object.keys(indianLanguages),
  fallbackLanguage: 'en'
};
