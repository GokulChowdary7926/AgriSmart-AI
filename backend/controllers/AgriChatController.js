const agriChatService = require('../services/agriChatService');
const logger = require('../utils/logger');

class AgriChatController {
  /**
   * Get nearby sellers and dealers
   * GET /api/agri-chat/nearby
   */
  static async getNearbyUsers(req, res) {
    try {
      // Get userId from req.user (set by authenticate middleware)
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        logger.error('No user ID found in request');
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'User authentication required. Please log in again.'
        });
      }

      const radius = parseInt(req.query.radius) || 50000; // Default 50km
      const limit = parseInt(req.query.limit) || 50;

      const nearbyUsers = await agriChatService.findNearbySellersDealers(userId, radius, limit);

      // Always return success, even if empty array
      res.json({
        success: true,
        data: nearbyUsers || [],
        count: nearbyUsers?.length || 0,
        message: nearbyUsers?.length > 0 
          ? `Found ${nearbyUsers.length} sellers/dealers` 
          : 'No sellers/dealers found. You can still search for users.'
      });
    } catch (error) {
      logger.error('Error getting nearby users:', error);
      // Return empty array instead of error to prevent frontend crash
      res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Unable to load nearby sellers/dealers. You can still search for users.',
        error: error.message
      });
    }
  }

  /**
   * Search for users
   * GET /api/agri-chat/search
   */
  static async searchUsers(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const { q, role } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
      }

      const users = await agriChatService.searchUsers(userId, q.trim(), role);

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search users'
      });
    }
  }

  /**
   * Get or create conversation
   * POST /api/agri-chat/conversation
   */
  static async getOrCreateConversation(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const { otherUserId } = req.body;

      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          error: 'otherUserId is required'
        });
      }

      const conversation = await agriChatService.getOrCreateConversation(userId, otherUserId);

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      logger.error('Error getting/creating conversation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get/create conversation'
      });
    }
  }

  /**
   * Get user's conversations
   * GET /api/agri-chat/conversations
   */
  static async getConversations(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        logger.error('No user ID found in request');
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'User authentication required. Please log in again.'
        });
      }

      const limit = parseInt(req.query.limit) || 50;

      const conversations = await agriChatService.getUserConversations(userId, limit);

      res.json({
        success: true,
        data: conversations || [],
        count: conversations?.length || 0
      });
    } catch (error) {
      logger.error('Error getting conversations:', error);
      // Return empty array instead of error to prevent frontend crash
      res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Unable to load conversations. Please try again later.',
        error: error.message
      });
    }
  }

  /**
   * Get conversation messages
   * GET /api/agri-chat/conversation/:conversationId/messages
   */
  static async getMessages(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const before = req.query.before || null;

      const messages = await agriChatService.getConversationMessages(
        conversationId,
        userId,
        limit,
        before
      );

      res.json({
        success: true,
        data: messages,
        count: messages.length
      });
    } catch (error) {
      logger.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get messages'
      });
    }
  }

  /**
   * Send a message
   * POST /api/agri-chat/message
   */
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
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }

      // If conversationId not provided, create/get conversation
      let finalConversationId = conversationId;
      if (!finalConversationId && recipientId) {
        const conversation = await agriChatService.getOrCreateConversation(userId, recipientId);
        if (conversation && conversation._id) {
          finalConversationId = conversation._id.toString ? conversation._id.toString() : String(conversation._id);
        }
      }

      if (!finalConversationId) {
        return res.status(400).json({
          success: false,
          error: 'Either conversationId or recipientId is required'
        });
      }

      // Get recipient from conversation if not provided
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
          // If still not found, try first participant
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
        return res.status(400).json({
          success: false,
          error: 'Recipient not found'
        });
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

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send message'
      });
    }
  }
}

module.exports = AgriChatController;

