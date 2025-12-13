const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const logger = require('../utils/logger');

class AgriChatService {
  async findNearbySellersDealers(userId, radius = 50000, limit = 50) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`User ${userId} not found`);
        return [];
      }

      logger.info(`Finding nearby sellers/dealers for user: ${user.name} (${userId})`);

      let userCoords = user.farmerProfile?.location?.coordinates;
      
      if (!userCoords || !Array.isArray(userCoords) || userCoords.length !== 2) {
        logger.warn(`User ${userId} doesn't have valid coordinates, using fallback`);
        
        const state = user.farmerProfile?.location?.state;
        const defaultCoords = this.getDefaultCoordinatesForState(state);
        userCoords = defaultCoords;
      }

      if (!Array.isArray(userCoords) || userCoords.length !== 2) {
        userCoords = [77.2090, 28.6139]; // Default: New Delhi
      }

      let nearbyUsers = [];
      
      try {
        nearbyUsers = await User.find({
          _id: { $ne: userId },
          role: { $in: ['seller', 'dealer', 'agent'] },
          'farmerProfile.location.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: userCoords
              },
              $maxDistance: radius
            }
          }
        })
        .limit(limit)
        .select('name email phone role farmerProfile.location')
        .lean();
      } catch (geoError) {
        logger.warn('Geospatial query failed, using fallback:', geoError.message);
        
        nearbyUsers = await User.find({
          _id: { $ne: userId },
          role: { $in: ['seller', 'dealer', 'agent'] }
        })
        .limit(limit)
        .select('name email phone role farmerProfile.location')
        .lean();
      }

      if (nearbyUsers.length === 0) {
        logger.info('No nearby users found, trying fallback search');
        nearbyUsers = await User.find({
          _id: { $ne: userId },
          role: { $in: ['seller', 'dealer', 'agent'] }
        })
        .limit(limit)
        .select('name email phone role farmerProfile.location')
        .lean();
      }

      const usersWithDistance = nearbyUsers.map(nearbyUser => {
        let distance = 0;
        let distanceKm = 0;
        
        if (nearbyUser.farmerProfile?.location?.coordinates && 
            Array.isArray(nearbyUser.farmerProfile.location.coordinates) &&
            nearbyUser.farmerProfile.location.coordinates.length === 2) {
          distance = this.calculateDistance(
            userCoords[1], // latitude
            userCoords[0], // longitude
            nearbyUser.farmerProfile.location.coordinates[1],
            nearbyUser.farmerProfile.location.coordinates[0]
          );
          distanceKm = Math.round(distance / 1000);
        } else {
          distanceKm = null;
        }

        return {
          ...nearbyUser,
          distance: distanceKm,
          distanceMeters: distanceKm ? Math.round(distance) : null,
          location: nearbyUser.farmerProfile?.location || {}
        };
      });

      usersWithDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      logger.info(`Found ${usersWithDistance.length} sellers/dealers for user ${userId}`);
      return usersWithDistance;
    } catch (error) {
      logger.error('Error finding nearby sellers/dealers:', error);
      return [];
    }
  }

  getDefaultCoordinatesForState(state) {
    const stateCoordinates = {
      'Punjab': [75.3412, 30.7333], // Ludhiana
      'Haryana': [76.0856, 29.0588], // Karnal
      'Uttar Pradesh': [77.2245, 28.6139], // Lucknow
      'Maharashtra': [72.8777, 19.0760], // Mumbai
      'Karnataka': [77.5946, 12.9716], // Bangalore
      'Tamil Nadu': [80.2707, 13.0827], // Chennai
      'Gujarat': [72.5714, 23.0225], // Ahmedabad
      'Rajasthan': [75.8647, 26.9124], // Jaipur
      'West Bengal': [88.3639, 22.5726], // Kolkata
      'Bihar': [85.1376, 25.5941], // Patna
      'Madhya Pradesh': [75.8577, 22.7196], // Indore
      'Andhra Pradesh': [83.2185, 17.3850], // Hyderabad
      'Telangana': [78.4867, 17.3850], // Hyderabad
      'Odisha': [85.8333, 20.2961], // Bhubaneswar
      'Kerala': [76.2673, 9.9312], // Kochi
      'Assam': [91.7431, 26.1445], // Guwahati
    };

    if (state && stateCoordinates[state]) {
      return stateCoordinates[state];
    }

    return [77.2090, 28.6139];
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  async getOrCreateConversation(userId1, userId2) {
    try {
      const conversation = await Conversation.findOrCreateConversation(userId1, userId2);
      return conversation;
    } catch (error) {
      logger.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  async sendMessage(conversationId, senderId, recipientId, content, type = 'text', attachments = [], product = null, location = null, replyTo = null) {
    try {
      const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        recipient: recipientId,
        content,
        type,
        attachments,
        product,
        location,
        replyTo,
        status: 'sent'
      });

      await message.populate('sender', 'name email role');
      await message.populate('recipient', 'name email role');

      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        await conversation.updateLastMessage(content, senderId);
        await conversation.incrementUnread(recipientId);
      }

      logger.info(`Message sent: ${message._id} from ${senderId} to ${recipientId}`);
      return message;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId, userId, limit = 50, before = null) {
    try {
      const messages = await Message.getConversationMessages(conversationId, limit, before);
      
      const unreadMessages = messages.filter(
        msg => msg.recipient._id.toString() === userId.toString() && msg.status !== 'read'
      );
      
      if (unreadMessages.length > 0) {
        await Message.updateMany(
          { _id: { $in: unreadMessages.map(m => m._id) } },
          { $set: { status: 'read', readAt: new Date() } }
        );
      }

      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        await conversation.resetUnread(userId);
      }

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting conversation messages:', error);
      throw error;
    }
  }

  async getUserConversations(userId, limit = 50) {
    try {
      const conversations = await Conversation.find({
        participants: userId,
        isArchived: false
      })
      .populate('participants', 'name email role farmerProfile.location')
      .populate('lastMessage.sender', 'name')
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
      .limit(limit)
      .lean();

      const userIdStr = userId?.toString ? userId.toString() : String(userId);
      const formattedConversations = conversations.map(conv => {
        const otherParticipant = conv.participants?.find(
          p => {
            const pId = p._id?.toString ? p._id.toString() : String(p._id || p);
            return pId !== userIdStr;
          }
        );
        const unread = conv.unreadCount?.find(
          u => {
            const uId = u.user?.toString ? u.user.toString() : String(u.user || u);
            return uId === userIdStr;
          }
        );

        return {
          ...conv,
          otherParticipant: otherParticipant || conv.participants?.[0] || null,
          unreadCount: unread?.count || 0
        };
      });

      logger.info(`Found ${formattedConversations.length} conversations for user ${userId}`);
      return formattedConversations;
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      return [];
    }
  }

  async searchUsers(userId, query, role = null) {
    try {
      const searchQuery = {
        _id: { $ne: userId },
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      };

      if (role) {
        searchQuery.role = role;
      } else {
        searchQuery.role = { $in: ['seller', 'dealer', 'agent'] };
      }

      const users = await User.find(searchQuery)
        .select('name email phone role farmerProfile.location')
        .limit(20)
        .lean();

      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }
}

module.exports = new AgriChatService();

