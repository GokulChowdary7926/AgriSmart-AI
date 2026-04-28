const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  cropName: { type: String, trim: true },
  symptoms: [{ type: String }],
  causes: [{ type: String }],
  treatment: [{ type: String }],
  prevention: [{ type: String }],
  severity: { type: String, default: 'medium' },
  confidence: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.Disease || mongoose.model('Disease', diseaseSchema);
