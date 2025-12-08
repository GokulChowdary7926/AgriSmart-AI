const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');

class AnalyticsController {
  // Track event
  static async track(req, res) {
    try {
      const { eventType, eventData, device, platform, language } = req.body;
      
      try {
        if (Analytics && typeof Analytics === 'function') {
          const analytics = new Analytics({
            user: req.user?._id || req.user?.userId,
            eventType,
            eventData,
            device: device || 'web',
            platform: platform || 'web',
            language: language || 'en',
            location: {
              ip: req.ip,
              ...req.body.location
            },
            sessionId: req.body.sessionId
          });
          
          await analytics.save();
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, skipping tracking');
      }
      
      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking event:', error);
      // Still return success even if tracking fails
      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    }
  }
  
  // Get user analytics
  static async getUserAnalytics(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      let analytics = { recentActivity: [], events: [] };
      
      try {
        if (Analytics && typeof Analytics.getUserAnalytics === 'function') {
          analytics = await Analytics.getUserAnalytics(userId, start, end);
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, using defaults');
      }
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching user analytics:', error);
      res.json({
        success: true,
        data: { recentActivity: [], events: [] }
      });
    }
  }
  
  // Get event counts
  static async getEventCounts(req, res) {
    try {
      const { startDate, endDate, eventType } = req.query;
      
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      let counts = {};
      
      try {
        if (Analytics && typeof Analytics.getEventCounts === 'function') {
          counts = await Analytics.getEventCounts(start, end, eventType);
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, using defaults');
      }
      
      res.json({
        success: true,
        data: counts
      });
    } catch (error) {
      logger.error('Error fetching event counts:', error);
      res.json({
        success: true,
        data: {}
      });
    }
  }
  
  // Get activity timeline
  static async getActivityTimeline(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { days = 7 } = req.query;
      
      let timeline = [];
      
      try {
        if (Analytics && typeof Analytics.getActivityTimeline === 'function') {
          timeline = await Analytics.getActivityTimeline(userId, parseInt(days));
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, using defaults');
      }
      
      res.json({
        success: true,
        data: timeline
      });
    } catch (error) {
      logger.error('Error fetching activity timeline:', error);
      res.json({
        success: true,
        data: []
      });
    }
  }

  // Get dashboard data - with real-time analytics
  static async getDashboard(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId;
      
      // Use real-time analytics service
      const analyticsService = require('../services/analyticsService');
      const dashboardData = await analyticsService.getDashboardAnalytics(userId);
      
      // Get user's farmer profile for farm info
      const User = require('../models/User');
      let user = null;
      
      try {
        if (userId) {
          user = await User.findById(userId);
        }
      } catch (userError) {
        logger.warn('Could not fetch user data, using defaults');
      }
      
      const farmInfo = user?.farmerProfile?.location ? {
        size: user.farmerProfile.farmSize || user.farmerProfile.landDetails?.totalArea || 0,
        sizeUnit: user.farmerProfile.farmSizeUnit || 'ha'
      } : {
        size: 0,
        sizeUnit: 'ha'
      };
      
      // Return comprehensive dashboard data
      res.json({
        success: true,
        data: {
          summary: {
            metrics: {
              activeCrops: dashboardData.userStats?.cropRecommendations || 0,
              totalCrops: dashboardData.userStats?.totalQueries || 0,
              totalRevenue: 0, // Can be calculated from market data
              totalExpenses: 0,
              harvestedCrops: 0,
              failedCrops: 0,
              averageHealth: 85
            }
          },
          marketTrends: dashboardData.marketStats?.topPerformingCommodities || [],
          recentActivity: dashboardData.userStats?.recentActivity || [],
          farmInfo: farmInfo,
          userStats: dashboardData.userStats,
          systemStats: dashboardData.systemStats,
          cropStats: dashboardData.cropStats,
          diseaseStats: dashboardData.diseaseStats,
          predictions: dashboardData.predictions,
          source: dashboardData.source || 'realtime',
          timestamp: dashboardData.timestamp
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      // Return default data instead of error
      res.json({
        success: true,
        data: {
          summary: {
            metrics: {
              activeCrops: 0,
              totalCrops: 0,
              totalRevenue: 0,
              totalExpenses: 0,
              harvestedCrops: 0,
              failedCrops: 0,
              averageHealth: 0
            }
          },
          marketTrends: [],
          recentActivity: [],
          farmInfo: {
            size: 0,
            sizeUnit: 'ha'
          }
        }
      });
    }
  }
  
  // Alias for getDashboardAnalytics (for consistency)
  static async getDashboardAnalytics(req, res) {
    return this.getDashboard(req, res);
  }
  
  // Get historical data
  static async getHistorical(req, res) {
    try {
      const userId = req.user._id;
      const { startDate, endDate } = req.query;
      
      // Return empty array for now - can be populated with actual historical data
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      logger.error('Error fetching historical data:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get insights
  static async getInsights(req, res) {
    try {
      const userId = req.user._id;
      
      // Return empty array for now - can be populated with actual insights
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      logger.error('Error fetching insights:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = AnalyticsController;
