const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.get('/dashboard', AnalyticsController.getDashboard);
router.get('/historical', AnalyticsController.getHistorical);
router.get('/insights', AnalyticsController.getInsights);
router.post('/track', AnalyticsController.track);
router.get('/user', AnalyticsController.getUserAnalytics);
router.get('/events', AnalyticsController.getEventCounts);
router.get('/timeline', AnalyticsController.getActivityTimeline);

module.exports = router;
