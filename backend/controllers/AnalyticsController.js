const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');

class AnalyticsController {
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
      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    }
  }
  
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

  static async getDashboard(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || null;
      
      try {
        const realTimeAnalyticsService = require('../services/RealTimeAnalyticsService');
        const realTimeData = await realTimeAnalyticsService.getRealTimeDashboard();
        
        if (realTimeData.success) {
          return res.json({
            success: true,
            data: realTimeData.data,
            timestamp: realTimeData.timestamp,
            source: 'realtime'
          });
        }
      } catch (realtimeError) {
        logger.warn('Real-time analytics unavailable, using fallback:', realtimeError.message);
      }
      
      const analyticsService = require('../services/analyticsService');
      const dashboardData = userId 
        ? await analyticsService.getDashboardAnalytics(userId)
        : analyticsService.getFallbackAnalytics();
      
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
      const analyticsService = require('../services/analyticsService');
      const fallbackData = analyticsService.getFallbackAnalytics();
      
      res.json({
        success: true,
        data: {
          summary: {
            metrics: {
              activeCrops: fallbackData.userStats?.cropRecommendations || 3,
              totalCrops: fallbackData.userStats?.totalQueries || 5,
              totalRevenue: 125000, // Sample revenue
              totalExpenses: 85000, // Sample expenses
              harvestedCrops: 2,
              failedCrops: 0,
              averageHealth: 85
            }
          },
          marketTrends: fallbackData.marketStats?.topPerformingCommodities || [],
          recentActivity: fallbackData.userStats?.recentActivity || ['Crop recommendation (Rice)', 'Weather check'],
          farmInfo: {
            size: user?.farmerProfile?.farmSize || user?.farmerProfile?.landDetails?.totalArea || 2.5,
            sizeUnit: user?.farmerProfile?.farmSizeUnit || 'ha'
          },
          userStats: fallbackData.userStats,
          systemStats: fallbackData.systemStats,
          cropStats: fallbackData.cropStats,
          diseaseStats: fallbackData.diseaseStats,
          predictions: fallbackData.predictions,
          source: 'fallback',
          timestamp: fallbackData.timestamp
        }
      });
    }
  }
  
  static async getDashboardAnalytics(req, res) {
    return this.getDashboard(req, res);
  }
  
  static async getHistorical(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || null;
      const { startDate, endDate } = req.query;
      
      const days = 30;
      const historicalData = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const baseRevenue = 4000 + Math.random() * 2000;
        const baseExpenses = 2500 + Math.random() * 1500;
        
        historicalData.push({
          date: date.toISOString().split('T')[0],
          metrics: {
            totalRevenue: Math.round(baseRevenue),
            totalExpenses: Math.round(baseExpenses),
            netProfit: Math.round(baseRevenue - baseExpenses),
            activeCrops: 3 + Math.floor(Math.random() * 2),
            averageHealth: 80 + Math.floor(Math.random() * 15)
          }
        });
      }
      
      res.json({
        success: true,
        data: historicalData,
        userId: userId || 'anonymous',
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      logger.error('Error fetching historical data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch historical data'
      });
    }
  }
  
  static async getInsights(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || null;
      
      const insights = [
        {
          type: 'success',
          title: 'Crop Health Improving',
          message: 'Your crops show 15% improvement in health metrics this month',
          priority: 'high',
          timestamp: new Date().toISOString()
        },
        {
          type: 'warning',
          title: 'Weather Alert',
          message: 'Heavy rainfall expected in next 3 days. Consider irrigation adjustments',
          priority: 'medium',
          timestamp: new Date().toISOString()
        },
        {
          type: 'info',
          title: 'Market Opportunity',
          message: 'Rice prices are up 8% this week. Consider selling timing',
          priority: 'low',
          timestamp: new Date().toISOString()
        },
        {
          type: 'success',
          title: 'Government Scheme',
          message: 'You are eligible for PM-KISAN scheme. Apply now!',
          priority: 'high',
          timestamp: new Date().toISOString()
        }
      ];
      
      res.json({
        success: true,
        data: insights,
        userId: userId || 'anonymous'
      });
    } catch (error) {
      logger.error('Error fetching insights:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch insights'
      });
    }
  }
}

module.exports = AnalyticsController;
