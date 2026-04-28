const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });

conversationSchema.pre('save', function(next) {
  if (this.participants.length < 2) {
    return next(new Error('Conversation must have at least 2 participants'));
  }
  next();
});

conversationSchema.statics.findOrCreateConversation = async function(userId1, userId2) {
  const normalizedUserId1 = userId1?.toString ? userId1.toString() : String(userId1);
  const normalizedUserId2 = userId2?.toString ? userId2.toString() : String(userId2);

  let conversation = await this.findOne({
    participants: { $all: [normalizedUserId1, normalizedUserId2] },
    isArchived: false
  });

  if (conversation) {
    return conversation;
  }

  conversation = await this.create({
    participants: [normalizedUserId1, normalizedUserId2]
  });
  return conversation;
};

conversationSchema.methods.updateLastMessage = async function(content, senderId) {
  this.lastMessage = {
    content,
    sender: senderId,
    timestamp: new Date()
  };
  return this.save();
};

conversationSchema.methods.incrementUnread = async function(recipientId) {
  const key = recipientId?.toString ? recipientId.toString() : String(recipientId);
  const current = this.unreadCount?.get(key) || 0;
  this.unreadCount.set(key, current + 1);
  return this.save();
};

conversationSchema.methods.resetUnread = async function(userId) {
  const key = userId?.toString ? userId.toString() : String(userId);
  this.unreadCount.set(key, 0);
  return this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

