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
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    emoji: '📚',
    direction: 'ltr',
    fontFamily: '"Noto Sans Tamil", "Latha", sans-serif'
  }
};

export const languagePreferences = {
  defaultLanguage: 'en',
  supportedLanguages: Object.keys(indianLanguages),
  fallbackLanguage: 'en'
};
