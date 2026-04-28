const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
const { badRequest, notFound, serverError, serviceUnavailable, ok, forbidden } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

function parsePositiveInt(value, defaultValue, { min = 1, max = 100 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

class UserController {
  static success(res, data, { source = 'AgriSmart AI', isFallback = false, degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static async getAll(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return forbidden(res, 'Access denied. Admin role required.');
      }
      if (!mongoReady()) {
        return UserController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { pagination: { page: 1, limit: 0, total: 0, pages: 0 } } });
      }

      const { page = 1, limit = 20, role, search } = req.query;
      const safePage = parsePositiveInt(page, 1, { min: 1, max: 100000 });
      const safeLimit = parsePositiveInt(limit, 20, { min: 1, max: 100 });
      const skip = (safePage - 1) * safeLimit;

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
        .limit(safeLimit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      return UserController.success(
        res,
        users,
        {
          extra: {
            pagination: {
              page: safePage,
              limit: safeLimit,
              total,
              pages: Math.ceil(total / safeLimit)
            }
          }
        }
      );
    } catch (error) {
      logger.error('Error getting users:', error);
      return serverError(res, 'Failed to fetch users');
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const requesterId = (req.user?.id || req.user?.userId || req.user?._id || '').toString();
      
      if (requesterId !== id && req.user.role !== 'admin') {
        return forbidden(res, 'Access denied');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'User store unavailable', { degradedReason: 'mongo_unavailable' });
      }

      const user = await User.findById(id).select('-password');
      
      if (!user) {
        return notFound(res, 'User not found');
      }

      return UserController.success(res, user);
    } catch (error) {
      logger.error('Error getting user:', error);
      return serverError(res, 'Failed to fetch user');
    }
  }

  static async getCurrentUser(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      if (!mongoReady()) {
        return serviceUnavailable(res, 'User store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return notFound(res, 'User not found');
      }

      return UserController.success(res, user);
    } catch (error) {
      logger.error('Error getting current user:', error);
      return serverError(res, 'Failed to fetch user profile');
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const requesterId = (req.user?.id || req.user?.userId || req.user?._id || '').toString();

      if (requesterId !== id && req.user.role !== 'admin') {
        return forbidden(res, 'Access denied');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'User store unavailable', { degradedReason: 'mongo_unavailable' });
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
        return notFound(res, 'User not found');
      }

      logger.info(`User ${id} profile updated`);
      return UserController.success(
        res,
        user,
        { extra: { message: 'Profile updated successfully' } }
      );
    } catch (error) {
      logger.error('Error updating user:', error);
      return serverError(res, error.message || 'Failed to update user');
    }
  }

  static async updateCurrentUser(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId || req.user?._id;
      if (!mongoReady()) {
        return serviceUnavailable(res, 'User store unavailable', { degradedReason: 'mongo_unavailable' });
      }
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
        return notFound(res, 'User not found');
      }

      logger.info(`User ${userId} profile updated`);
      return UserController.success(
        res,
        user,
        { extra: { message: 'Profile updated successfully' } }
      );
    } catch (error) {
      logger.error('Error updating current user:', error);
      return serverError(res, error.message || 'Failed to update profile');
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const requesterId = (req.user?.id || req.user?.userId || req.user?._id || '').toString();

      if (requesterId !== id && req.user.role !== 'admin') {
        return forbidden(res, 'Access denied');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'User store unavailable', { degradedReason: 'mongo_unavailable' });
      }

      if (requesterId === id && req.user.role === 'admin') {
        const user = await User.findById(id);
        if (user && user.role === 'admin') {
          return badRequest(res, 'Admins cannot delete their own account');
        }
      }

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return notFound(res, 'User not found');
      }

      logger.info(`User ${id} deleted`);
      return UserController.success(
        res,
        { message: 'User deleted successfully' },
        { extra: { message: 'User deleted successfully' } }
      );
    } catch (error) {
      logger.error('Error deleting user:', error);
      return serverError(res, 'Failed to delete user');
    }
  }

  static async getStats(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return forbidden(res, 'Access denied. Admin role required.');
      }
      if (!mongoReady()) {
        return UserController.success(res, { total: 0, byRole: { farmers: 0, experts: 0, admins: 0, others: 0 }, recentRegistrations: 0, last30Days: 0 }, { isFallback: true, degradedReason: 'mongo_unavailable' });
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

      return UserController.success(res, {
        total: totalUsers,
        byRole: {
          farmers,
          experts,
          admins,
          others: totalUsers - farmers - experts - admins
        },
        recentRegistrations: recentUsers,
        last30Days: recentUsers
      });
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return serverError(res, 'Failed to fetch user statistics');
    }
  }

  static async search(req, res) {
    try {
      const { q, limit = 10 } = req.query;
      const safeLimit = parsePositiveInt(limit, 10, { min: 1, max: 50 });

      if (!q || q.length < 2) {
        return badRequest(res, 'Search query must be at least 2 characters');
      }
      if (!mongoReady()) {
        return UserController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { count: 0 } });
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
        .limit(safeLimit);

      return UserController.success(
        res,
        users,
        { extra: { count: users.length } }
      );
    } catch (error) {
      logger.error('Error searching users:', error);
      return serverError(res, 'Failed to search users');
    }
  }
}

module.exports = UserController;











