const mongoose = require('mongoose');
const agriChatService = require('../services/agriChatService');
const logger = require('../utils/logger');
const { badRequest, notFound, serverError, serviceUnavailable, ok } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

class AgriChatController {
  static success(res, data, { isFallback = false, source = 'AgriSmart AI', degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static parsePositiveInt(value, defaultValue, { min = 1, max = 100 } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
  }

  static async getNearbyUsers(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        logger.error('No user ID found in request');
        return AgriChatController.success(
          res,
          [],
          {
            isFallback: true,
            degradedReason: 'agri_chat_unauthenticated',
            extra: {
              count: 0,
              message: 'User authentication required. Please log in again.'
            }
          }
        );
      }

      const radius = AgriChatController.parsePositiveInt(req.query.radius, 50000, { min: 100, max: 200000 });
      const limit = AgriChatController.parsePositiveInt(req.query.limit, 50, { min: 1, max: 100 });

      if (!mongoReady()) {
        return AgriChatController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { count: 0, message: 'Nearby user store unavailable.' } });
      }

      const nearbyUsers = await agriChatService.findNearbySellersDealers(userId, radius, limit);

      return AgriChatController.success(
        res,
        nearbyUsers || [],
        {
          extra: {
            count: nearbyUsers?.length || 0,
            message: nearbyUsers?.length > 0
              ? `Found ${nearbyUsers.length} sellers/dealers`
              : 'No sellers/dealers found. You can still search for users.'
          }
        }
      );
    } catch (error) {
      logger.error('Error getting nearby users:', error);
      return AgriChatController.success(
        res,
        [],
        {
          isFallback: true,
          degradedReason: 'agri_chat_nearby_unavailable',
          extra: {
            count: 0,
            message: 'Unable to load nearby sellers/dealers. You can still search for users.',
            error: error.message
          }
        }
      );
    }
  }

  static async searchUsers(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const { q, role } = req.query;

      if (!q || q.trim().length < 2) {
        return badRequest(res, 'Search query must be at least 2 characters');
      }
      if (!mongoReady()) {
        return AgriChatController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { count: 0 } });
      }

      const users = await agriChatService.searchUsers(userId, q.trim(), role);

      return AgriChatController.success(res, users, { extra: { count: users.length } });
    } catch (error) {
      logger.error('Error searching users:', error);
      return serverError(res, error.message || 'Failed to search users');
    }
  }

  static async getOrCreateConversation(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const { otherUserId } = req.body;

      if (!otherUserId) {
        return badRequest(res, 'otherUserId is required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Conversation store unavailable', { degradedReason: 'mongo_unavailable' });
      }

      const conversation = await agriChatService.getOrCreateConversation(userId, otherUserId);

      return AgriChatController.success(res, conversation);
    } catch (error) {
      logger.error('Error getting/creating conversation:', error);
      return serverError(res, error.message || 'Failed to get/create conversation');
    }
  }

  static async getConversations(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        logger.error('No user ID found in request');
        return AgriChatController.success(
          res,
          [],
          {
            isFallback: true,
            degradedReason: 'agri_chat_unauthenticated',
            extra: {
              count: 0,
              message: 'User authentication required. Please log in again.'
            }
          }
        );
      }

      const limit = AgriChatController.parsePositiveInt(req.query.limit, 50, { min: 1, max: 100 });

      if (!mongoReady()) {
        return AgriChatController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { count: 0 } });
      }

      const conversations = await agriChatService.getUserConversations(userId, limit);

      return AgriChatController.success(
        res,
        conversations || [],
        { extra: { count: conversations?.length || 0 } }
      );
    } catch (error) {
      logger.error('Error getting conversations:', error);
      return AgriChatController.success(
        res,
        [],
        {
          isFallback: true,
          degradedReason: 'agri_chat_conversations_unavailable',
          extra: {
            count: 0,
            message: 'Unable to load conversations. Please try again later.',
            error: error.message
          }
        }
      );
    }
  }

  static async getMessages(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const { conversationId } = req.params;
      const limit = AgriChatController.parsePositiveInt(req.query.limit, 50, { min: 1, max: 100 });
      const before = req.query.before || null;

      if (!mongoReady()) {
        return AgriChatController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { count: 0 } });
      }

      const messages = await agriChatService.getConversationMessages(
        conversationId,
        userId,
        limit,
        before
      );

      return AgriChatController.success(res, messages, { extra: { count: messages.length } });
    } catch (error) {
      logger.error('Error getting messages:', error);
      return serverError(res, error.message || 'Failed to get messages');
    }
  }

  static async sendMessage(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const {
        conversationId,
        recipientId,
        content,
        type = 'text',
        attachments = [],
        product = null,
        location = null,
        replyTo = null
      } = req.body;

      if (!content || !content.trim()) {
        return badRequest(res, 'Message content is required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Message store unavailable; cannot send right now', { degradedReason: 'mongo_unavailable' });
      }

      let finalConversationId = conversationId;
      if (!finalConversationId && recipientId) {
        const conversation = await agriChatService.getOrCreateConversation(userId, recipientId);
        if (conversation && conversation._id) {
          finalConversationId = conversation._id.toString ? conversation._id.toString() : String(conversation._id);
        }
      }

      if (!finalConversationId) {
        return badRequest(res, 'Either conversationId or recipientId is required');
      }

      let finalRecipientId = recipientId;
      if (!finalRecipientId) {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findById(finalConversationId);
        if (conversation && conversation.participants && Array.isArray(conversation.participants)) {
          const userIdStr = userId?.toString ? userId.toString() : String(userId);
          finalRecipientId = conversation.participants.find(p => {
            const pId = p?._id?.toString ? p._id.toString() : (p?.toString ? p.toString() : String(p));
            return pId !== userIdStr;
          });
          if (!finalRecipientId && conversation.participants.length > 0) {
            const firstParticipant = conversation.participants[0];
            const firstId = firstParticipant?._id?.toString ? firstParticipant._id.toString() : (firstParticipant?.toString ? firstParticipant.toString() : String(firstParticipant));
            if (firstId !== userIdStr) {
              finalRecipientId = firstParticipant;
            }
          }
        }
      }

      if (!finalRecipientId) {
        return notFound(res, 'Recipient not found');
      }

      const message = await agriChatService.sendMessage(
        finalConversationId,
        userId,
        finalRecipientId,
        content.trim(),
        type,
        attachments,
        product,
        location,
        replyTo
      );

      return AgriChatController.success(res, message);
    } catch (error) {
      logger.error('Error sending message:', error);
      return serverError(res, error.message || 'Failed to send message');
    }
  }
}

module.exports = AgriChatController;

