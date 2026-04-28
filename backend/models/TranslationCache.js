const mongoose = require('mongoose');

const translationCacheSchema = new mongoose.Schema({
  cacheKey: { type: String, required: true, unique: true, index: true },
  sourceText: { type: String, required: true },
  sourceLang: { type: String, default: 'en', index: true },
  targetLang: { type: String, required: true, index: true },
  translatedText: { type: String, required: true },
  provider: { type: String, default: 'unknown' },
  updatedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 } // 7 days TTL
}, { versionKey: false });

module.exports = mongoose.model('TranslationCache', translationCacheSchema);

