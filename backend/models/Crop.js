const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['cereal', 'vegetable', 'fruit', 'legume', 'tuber', 'cash-crop', 'fodder'],
    trim: true
  },
  variety: {
    type: String,
    trim: true
  },
  scientificName: {
    type: String,
    trim: true
  },
  plantingDate: {
    type: Date,
    required: true
  },
  area: {
    value: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['acres', 'hectares', 'square-meters'],
      default: 'hectares'
    }
  },
  status: {
    type: String,
    enum: ['planned', 'planted', 'growing', 'flowering', 'fruiting', 'harvested', 'failed'],
    default: 'planned'
  },
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    state: String,
    district: String
  },
  seasons: [{
    type: String,
    enum: ['kharif', 'rabi', 'zaid', 'all']
  }],
  expectedYield: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton']
    }
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

cropSchema.index({ name: 1 });
cropSchema.index({ type: 1 });
cropSchema.index({ status: 1 });
cropSchema.index({ createdBy: 1 });
cropSchema.index({ 'location.state': 1 });
cropSchema.index({ plantingDate: 1 });

cropSchema.virtual('formattedArea').get(function() {
  if (!this.area || !this.area.value) return 'N/A';
  return `${this.area.value} ${this.area.unit}`;
});

cropSchema.methods.getStatusColor = function() {
  const colors = {
    planned: 'default',
    planted: 'info',
    growing: 'primary',
    flowering: 'warning',
    fruiting: 'success',
    harvested: 'success',
    failed: 'error'
  };
  return colors[this.status] || 'default';
};

cropSchema.statics.findByStatus = function(status) {
  return this.find({ status });
};

cropSchema.statics.findByType = function(type) {
  return this.find({ type });
};

cropSchema.statics.findBySeason = function(season) {
  return this.find({ seasons: season });
};

const Crop = mongoose.model('Crop', cropSchema);

module.exports = Crop;















