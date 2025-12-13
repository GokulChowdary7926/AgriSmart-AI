const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    default: 'New Chat Session'
  },
  lastMessage: {
    type: String,
    default: ''
  },
  messageCount: {
    type: Number,
    default: 0
  },
  intents: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  language: {
    type: String,
    default: 'en'
  },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  metadata: {
    device: String,
    browser: String,
    platform: String
  }
}, {
  timestamps: true
});

chatSessionSchema.index({ userId: 1, updatedAt: -1 });
chatSessionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);













