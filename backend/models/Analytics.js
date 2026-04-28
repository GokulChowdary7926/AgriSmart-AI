const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  metric: { type: String, required: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  period: { type: String, default: 'daily' },
  source: { type: String, default: 'system' },
  recordedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema);
