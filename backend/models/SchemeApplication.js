const mongoose = require('mongoose');

const schemeApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  schemeId: { type: String, required: true, trim: true },
  schemeName: { type: String, trim: true },
  status: { type: String, default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  responseData: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.SchemeApplication || mongoose.model('SchemeApplication', schemeApplicationSchema);
