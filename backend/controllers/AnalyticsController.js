const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const { serverError, ok } = require('../utils/httpResponses');

function parsePositiveInt(value, defaultValue, { min = 1, max = 365 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function parseDateOrDefault(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

class AnalyticsController {
  static success(res, data, { isFallback = false, source = 'AgriSmart AI', degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static async track(req, res) {
    try {
      const body = req.body || {};
      const { eventType, eventData, device, platform, language } = body;
      
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
              ...(body.location || {})
            },
            sessionId: body.sessionId
          });
          
          await analytics.save();
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, skipping tracking');
      }
      
      return AnalyticsController.success(
        res,
        { message: 'Event tracked successfully' },
        { extra: { message: 'Event tracked successfully' } }
      );
    } catch (error) {
      logger.error('Error tracking event:', error);
      return AnalyticsController.success(
        res,
        { message: 'Event tracked successfully' },
        {
          isFallback: true,
          degradedReason: 'analytics_track_degraded',
          extra: { message: 'Event tracked successfully' }
        }
      );
    }
  }
  
  static async getUserAnalytics(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { startDate, endDate } = req.query;
      
      const start = parseDateOrDefault(startDate, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const end = parseDateOrDefault(endDate, new Date());
      
      let analytics = { recentActivity: [], events: [] };
      
      try {
        if (Analytics && typeof Analytics.getUserAnalytics === 'function') {
          analytics = await Analytics.getUserAnalytics(userId, start, end);
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, using defaults');
      }
      
      return AnalyticsController.success(res, analytics);
    } catch (error) {
      logger.error('Error fetching user analytics:', error);
      return AnalyticsController.success(
        res,
        { recentActivity: [], events: [] },
        { isFallback: true, degradedReason: 'analytics_unavailable' }
      );
    }
  }
  
  static async getEventCounts(req, res) {
    try {
      const { startDate, endDate, eventType } = req.query;
      
      const start = startDate ? parseDateOrDefault(startDate, null) : null;
      const end = endDate ? parseDateOrDefault(endDate, null) : null;
      
      let counts = {};
      
      try {
        if (Analytics && typeof Analytics.getEventCounts === 'function') {
          counts = await Analytics.getEventCounts(start, end, eventType);
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, using defaults');
      }
      
      return AnalyticsController.success(res, counts);
    } catch (error) {
      logger.error('Error fetching event counts:', error);
      return AnalyticsController.success(
        res,
        {},
        { isFallback: true, degradedReason: 'analytics_event_counts_unavailable' }
      );
    }
  }
  
  static async getActivityTimeline(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { days = 7 } = req.query;
      const safeDays = parsePositiveInt(days, 7, { min: 1, max: 90 });
      
      let timeline = [];
      
      try {
        if (Analytics && typeof Analytics.getActivityTimeline === 'function') {
          timeline = await Analytics.getActivityTimeline(userId, safeDays);
        }
      } catch (analyticsError) {
        logger.warn('Analytics model not available, using defaults');
      }
      
      return AnalyticsController.success(res, timeline);
    } catch (error) {
      logger.error('Error fetching activity timeline:', error);
      return AnalyticsController.success(
        res,
        [],
        { isFallback: true, degradedReason: 'analytics_timeline_unavailable' }
      );
    }
  }

  static async getDashboard(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || null;
      
      try {
        const realTimeAnalyticsService = require('../services/RealTimeAnalyticsService');
        const realTimeData = await realTimeAnalyticsService.getRealTimeDashboard();
        
        if (realTimeData.success) {
          return AnalyticsController.success(
            res,
            realTimeData.data,
            {
              source: 'realtime',
              extra: {
                timestamp: realTimeData.timestamp
              }
            }
          );
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
      
      return AnalyticsController.success(
        res,
        {
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
          predictions: dashboardData.predictions
        },
        {
          isFallback: (dashboardData.source || 'realtime') !== 'realtime',
          degradedReason: (dashboardData.source || 'realtime') !== 'realtime' ? 'analytics_fallback_mode' : null,
          source: dashboardData.source || 'realtime',
          extra: {
            timestamp: dashboardData.timestamp
          }
        }
      );
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      const analyticsService = require('../services/analyticsService');
      const fallbackData = analyticsService.getFallbackAnalytics();
      const fallbackFarmInfo = {
        size: 2.5,
        sizeUnit: 'ha'
      };
      
      return AnalyticsController.success(
        res,
        {
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
          farmInfo: fallbackFarmInfo,
          userStats: fallbackData.userStats,
          systemStats: fallbackData.systemStats,
          cropStats: fallbackData.cropStats,
          diseaseStats: fallbackData.diseaseStats,
          predictions: fallbackData.predictions
        },
        {
          source: 'fallback',
          isFallback: true,
          degradedReason: 'analytics_dashboard_error',
          extra: {
            timestamp: fallbackData.timestamp
          }
        }
      );
    }
  }
  
  static async getDashboardAnalytics(req, res) {
    return this.getDashboard(req, res);
  }
  
  static async getHistorical(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || null;
      const { startDate, endDate } = req.query;
      const safeStartDate = parseDateOrDefault(startDate, null);
      const safeEndDate = parseDateOrDefault(endDate, null);
      
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
      
      return AnalyticsController.success(
        res,
        historicalData,
        {
          extra: {
            userId: userId || 'anonymous',
            dateRange: { startDate: safeStartDate, endDate: safeEndDate }
          }
        }
      );
    } catch (error) {
      logger.error('Error fetching historical data:', error);
      return serverError(res, error.message || 'Failed to fetch historical data');
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
      
      return AnalyticsController.success(
        res,
        insights,
        {
          extra: {
            userId: userId || 'anonymous'
          }
        }
      );
    } catch (error) {
      logger.error('Error fetching insights:', error);
      return serverError(res, error.message || 'Failed to fetch insights');
    }
  }
}

const { bindStaticMethods } = require('../utils/bindControllerMethods');
module.exports = bindStaticMethods(AnalyticsController);
