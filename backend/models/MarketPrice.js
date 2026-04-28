const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  commodity: { type: String, required: true, trim: true },
  market: {
    name: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true }
  },
  price: {
    value: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 }
  },
  recordedAt: { type: Date, default: Date.now },
  source: { type: String, default: 'unknown' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.MarketPrice || mongoose.model('MarketPrice', marketPriceSchema);
