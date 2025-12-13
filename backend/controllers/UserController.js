const User = require('../models/User');
const logger = require('../utils/logger');

class UserController {
  static async getAll(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin role required.'
        });
      }

      const { page = 1, limit = 20, role, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const query = {};
      if (role) {
        query.role = role;
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const user = await User.findById(id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
    }
  }

  static async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id || req.user.userId).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error getting current user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      delete updateData.password;
      delete updateData.email; // Email should be updated via separate endpoint
      delete updateData.role; // Role can only be changed by admin
      delete updateData._id;
      delete updateData.__v;

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      logger.info(`User ${id} profile updated`);
      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update user'
      });
    }
  }

  static async updateCurrentUser(req, res) {
    try {
      const userId = req.user.id || req.user.userId;
      const updateData = req.body;

      delete updateData.password;
      delete updateData.email;
      delete updateData.role;
      delete updateData._id;
      delete updateData.__v;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      logger.info(`User ${userId} profile updated`);
      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Error updating current user:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update profile'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      if (req.user.id === id && req.user.role === 'admin') {
        const user = await User.findById(id);
        if (user && user.role === 'admin') {
          return res.status(400).json({
            success: false,
            error: 'Admins cannot delete their own account'
          });
        }
      }

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      logger.info(`User ${id} deleted`);
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }

  static async getStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin role required.'
        });
      }

      const totalUsers = await User.countDocuments();
      const farmers = await User.countDocuments({ role: 'farmer' });
      const experts = await User.countDocuments({ role: 'expert' });
      const admins = await User.countDocuments({ role: 'admin' });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      res.json({
        success: true,
        data: {
          total: totalUsers,
          byRole: {
            farmers,
            experts,
            admins,
            others: totalUsers - farmers - experts - admins
          },
          recentRegistrations: recentUsers,
          last30Days: recentUsers
        }
      });
    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics'
      });
    }
  }

  static async search(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
      }

      const users = await User.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } }
        ]
      })
        .select('-password')
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search users'
      });
    }
  }
}

module.exports = UserController;








