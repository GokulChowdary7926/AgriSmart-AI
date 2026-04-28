const express = require('express');
const router = express.Router();
const multer = require('multer');
const AgriGPTController = require('../controllers/AgriGPTController');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const resilientHttpClient = require('../services/api/resilientHttpClient');
const { ok, serverError } = require('../utils/httpResponses');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.post('/chat', AgriGPTController.chat);
router.post('/chat/context', AgriGPTController.chatWithContext);
router.post('/chat/upload', upload.single('image'), AgriGPTController.chatWithImage);
router.get('/popular-questions', AgriGPTController.getPopularQuestions);
router.get('/quick-replies', AgriGPTController.getQuickReplies);

router.get('/sessions', authenticateToken, AgriGPTController.getSessions);
router.get('/sessions/:sessionId', authenticateToken, AgriGPTController.getSessionDetails);
router.delete('/sessions/:sessionId', authenticateToken, AgriGPTController.deleteSession);
router.get('/sessions/:sessionId/export', authenticateToken, AgriGPTController.exportSession);

router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const ChatMessage = require('../models/ChatMessage');
    const { messageId, isPositive, sessionId } = req.body;
    
    await ChatMessage.updateOne(
      { _id: messageId, sessionId, userId: req.user.id || req.user._id },
      {
        $set: {
          'feedback.isPositive': isPositive,
          'feedback.ratedAt': new Date()
        }
      }
    );
    
    return ok(
      res,
      { message: 'Feedback recorded' },
      { source: 'AgriSmart AI', isFallback: false, message: 'Feedback recorded' }
    );
  } catch (error) {
    logger.error('Feedback error:', error);
    return ok(
      res,
      { message: 'Feedback recorded' },
      {
        source: 'AgriSmart AI',
        isFallback: true,
        degradedReason: 'agri_gpt_feedback_degraded',
        message: 'Feedback recorded'
      }
    );
  }
});

router.get('/health', async (req, res) => {
  try {
    const apiMonitor = require('../services/monitoring/apiMonitor');
    const { CircuitBreakerManager } = require('../services/api/circuitBreaker');
    const { getCacheStats } = require('../middleware/cache');
    
    const testApis = [
      { 
        name: 'Google Gemini AI', 
        url: 'https://generativelanguage.googleapis.com',
        critical: true,
        test: async () => {
          try {
            const key = process.env.GOOGLE_AI_KEY;
            if (!key || key === 'your_google_ai_key_here') {
              return { status: 'not_configured', note: 'API key not set' };
            }
            const result = await resilientHttpClient.request({
              serviceName: 'health-google-ai',
              method: 'get',
              url: 'https://generativelanguage.googleapis.com',
              timeout: 3000
            });
            if (!result.success) throw new Error(result.error?.message || 'offline');
            return { status: 'online' };
          } catch (e) {
            return { status: 'offline', note: e.message };
          }
        }
      },
      { 
        name: 'AgriSmart AI', 
        url: 'https://api.openweathermap.org',
        critical: false,
        test: async () => {
          try {
            const result = await resilientHttpClient.request({
              serviceName: 'health-openweather',
              method: 'get',
              url: 'https://api.openweathermap.org',
              timeout: 3000
            });
            if (!result.success) throw new Error(result.error?.message || 'offline');
            return { status: 'online' };
          } catch (e) {
            return { status: 'offline', note: 'Has fallback' };
          }
        }
      },
      { 
        name: 'AgriSmart AI', 
        url: 'https://api.data.gov.in',
        critical: false,
        test: async () => {
          try {
            const result = await resilientHttpClient.request({
              serviceName: 'health-data-gov',
              method: 'get',
              url: 'https://api.data.gov.in',
              timeout: 3000
            });
            if (!result.success) throw new Error(result.error?.message || 'offline');
            return { status: 'online' };
          } catch (e) {
            return { status: 'offline', note: 'Has fallback' };
          }
        }
      }
    ];
    
    const results = await Promise.allSettled(
      testApis.map(async api => {
        try {
          const result = await api.test();
          return { 
            name: api.name, 
            ...result,
            critical: api.critical
          };
        } catch (error) {
          return { 
            name: api.name, 
            status: 'offline',
            critical: api.critical,
            note: api.critical ? 'Service degraded' : 'Using fallback data (non-critical)'
          };
        }
      })
    );
    
    const apiResults = results.map(r => r.value || { name: 'Unknown', status: 'error' });
    const criticalApis = apiResults.filter(api => api.critical);
    const allCriticalOnline = criticalApis.every(api => api.status === 'online' || api.status === 'not_configured');
    
    const metrics = apiMonitor.getMetrics();
    const cacheStats = getCacheStats();
    const circuitBreakers = CircuitBreakerManager.getAllStatuses();
    
    return ok(
      res,
      {
        status: allCriticalOnline ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        externalApis: apiResults,
        monitoring: {
          total_requests: metrics.summary.total_requests,
          success_rate: metrics.summary.overall_success_rate + '%',
          most_reliable: metrics.summary.most_reliable_api,
          fallbacks_used: metrics.summary.total_fallbacks,
          circuit_breakers: circuitBreakers
        },
        cache: cacheStats,
        fallbackStatus: {
          dataGovIn: apiResults.find(a => a.name === 'Data.gov.in')?.status === 'offline' 
            ? 'Using fallback data' 
            : 'Primary source available',
          note: 'Data.gov.in is optional and has robust fallback mechanisms'
        },
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      {
        source: 'AgriSmart AI',
        isFallback: !allCriticalOnline,
        degradedReason: !allCriticalOnline ? 'agri_gpt_health_degraded' : null
      }
    );
  } catch (error) {
    return serverError(res, 'AgriGPT health check failed', {
      status: 'degraded',
      note: 'Service continues to operate with fallback data',
      error: error.message
    });
  }
});

module.exports = router;
