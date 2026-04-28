const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'product', 'location', 'system'],
    default: 'text'
  },
  attachments: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  product: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  location: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, status: 1 });

messageSchema.statics.getConversationMessages = async function(conversationId, limit = 50, before = null) {
  const query = { conversation: conversationId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'name email role')
    .populate('recipient', 'name email role')
    .populate('replyTo');
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
