const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    unique: true,
    validate: {
      validator: function(v) {
        if (!v) return false;
        // Remove +, spaces, and dashes
        const cleaned = v.replace(/[\s+\-]/g, '');
        // Check if it's a valid Indian phone number:
        // 1. 10 digits starting with 6-9 (e.g., 8682922431)
        // 2. 12 digits starting with 91 followed by 10 digits starting with 6-9 (e.g., 918682922431 from +918682922431)
        const tenDigitPattern = /^[6-9]\d{9}$/; // 10 digits starting with 6-9
        const twelveDigitPattern = /^91[6-9]\d{9}$/; // 91 followed by 10 digits starting with 6-9 (12 total)
        
        return tenDigitPattern.test(cleaned) || twelveDigitPattern.test(cleaned);
      },
      message: 'Please provide a valid phone number (10 digits starting with 6-9, or with country code 91)'
    },
    set: function(v) {
      if (!v) return v;
      // Store phone number without + and spaces for consistency
      const cleaned = v.replace(/[\s+\-]/g, '');
      // Normalize: if it's 12 digits starting with 91, store as is (91 + 10 digits)
      // If it's 10 digits, store as is
      return cleaned;
    }
  },
  
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  // User Role
  role: {
    type: String,
    enum: ['farmer', 'expert', 'admin', 'agent'],
    default: 'farmer'
  },
  
  // Farmer Specific Fields
  farmerProfile: {
    location: {
      state: String,
      district: String,
      village: String,
      pincode: String,
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      }
    },
    
    landDetails: {
      totalArea: Number, // in acres
      irrigatedArea: Number,
      soilType: {
        type: String,
        enum: ['clay', 'sandy', 'loamy', 'silt', 'black', 'red', 'alluvial']
      },
      crops: [{
        name: String,
        area: Number,
        season: String,
        status: String
      }]
    },
    
    familyMembers: Number,
    annualIncome: Number,
    farmingExperience: Number, // in years
    education: String
  },
  
  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'as', 'ur'],
      default: 'en'
    },
    
    notifications: {
      weatherAlerts: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      diseaseAlerts: { type: Boolean, default: true },
      schemeAlerts: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    
    voiceAssistant: {
      enabled: { type: Boolean, default: false },
      language: String,
      voice: String
    }
  },
  
  // Authentication
  isVerified: {
    phone: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    aadhar: { type: Boolean, default: false }
  },
  
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Activity Tracking
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  devices: [{
    deviceId: String,
    platform: String,
    lastActive: Date
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'farmerProfile.location.coordinates': '2dsphere' });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Password encryption middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  const loc = this.farmerProfile?.location;
  if (!loc) return '';
  
  return [loc.village, loc.district, loc.state, loc.pincode]
    .filter(Boolean)
    .join(', ');
});

// Static methods
userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

userSchema.statics.findFarmersByLocation = function(coordinates, radius = 5000) {
  return this.find({
    role: 'farmer',
    'farmerProfile.location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: radius
      }
    }
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;

