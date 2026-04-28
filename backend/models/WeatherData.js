const mongoose = require('mongoose');

const weatherDataSchema = new mongoose.Schema({
  location: {
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    lat: { type: Number },
    lng: { type: Number }
  },
  temperature: { type: Number, default: 0 },
  humidity: { type: Number, default: 0 },
  rainfall: { type: Number, default: 0 },
  windSpeed: { type: Number, default: 0 },
  condition: { type: String, default: 'Unknown' },
  source: { type: String, default: 'unknown' },
  observedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.models.WeatherData || mongoose.model('WeatherData', weatherDataSchema);
