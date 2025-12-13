const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  intent: {
    name: String,
    confidence: Number,
    requires: {
      location: Boolean,
      image: Boolean,
      profile: Boolean
    }
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  suggestions: [{
    type: String
  }],
  feedback: {
    isPositive: Boolean,
    comment: String,
    ratedAt: Date
  },
  metadata: {
    processingTime: Number,
    source: String,
    tokens: Number
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ 'intent.name': 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);













