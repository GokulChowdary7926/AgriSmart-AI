const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function normalizeIndianPhone(phone) {
  if (!phone) return phone;
  const cleaned = String(phone).replace(/[\s+\-]/g, '');
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned.slice(2);
  }
  return cleaned;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be more than 30 characters'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores']
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
        const normalized = normalizeIndianPhone(v);
        const tenDigitPattern = /^[6-9]\d{9}$/;
        return tenDigitPattern.test(normalized);
      },
      message: 'Please provide a valid Indian phone number'
    },
    set: function(v) {
      return normalizeIndianPhone(v);
    }
  },
  
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  role: {
    type: String,
    enum: ['farmer', 'expert', 'admin', 'agent', 'seller', 'dealer'],
    default: 'farmer'
  },
  
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
  
  isVerified: {
    phone: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    aadhar: { type: Boolean, default: false }
  },
  
  verificationToken: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },
  devices: [{
    deviceId: String,
    platform: String,
    lastActive: Date
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'farmerProfile.location.coordinates': '2dsphere' });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

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

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

userSchema.virtual('fullAddress').get(function() {
  const loc = this.farmerProfile?.location;
  if (!loc) return '';
  
  return [loc.village, loc.district, loc.state, loc.pincode]
    .filter(Boolean)
    .join(', ');
});

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

