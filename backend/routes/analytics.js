const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const jwt = require('jsonwebtoken');

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        try {
          const User = require('../models/User');
          const user = await User.findById(decoded.userId).select('-password');
          if (user) {
            req.user = user;
          } else {
            req.user = { _id: decoded.userId, userId: decoded.userId };
          }
        } catch (dbError) {
          req.user = { _id: decoded.userId, userId: decoded.userId };
        }
      } catch (error) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  next();
};

router.use(optionalAuth);

router.get('/dashboard', AnalyticsController.getDashboard);
router.get('/historical', AnalyticsController.getHistorical);
router.get('/insights', AnalyticsController.getInsights);
router.post('/track', AnalyticsController.track);
router.get('/user', AnalyticsController.getUserAnalytics);
router.get('/events', AnalyticsController.getEventCounts);
router.get('/timeline', AnalyticsController.getActivityTimeline);

module.exports = router;
