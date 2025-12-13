
const express = require('express');
const router = express.Router();
const messagingService = require('../services/MessagingService');
const { authenticateToken } = require('../middleware/auth');

router.post('/send', authenticateToken, async (req, res) => {
  try {
    const {
      to_phone,
      message,
      channel = 'sms',
      language = 'en',
      template_id = null,
      variables = {}
    } = req.body;
    
    if (!to_phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'to_phone and message are required'
      });
    }
    
    const result = await messagingService.sendMessage(
      to_phone,
      message,
      channel,
      language,
      template_id,
      variables
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const {
      phone_numbers,
      message,
      channel = 'sms',
      language = 'en'
    } = req.body;
    
    if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'phone_numbers array is required'
      });
    }
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }
    
    const result = await messagingService.sendBulkMessages(
      phone_numbers,
      message,
      channel,
      language
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/alert', authenticateToken, async (req, res) => {
  try {
    const {
      user_id,
      alert_type,
      data,
      channel = 'sms'
    } = req.body;
    
    if (!alert_type || !data) {
      return res.status(400).json({
        success: false,
        error: 'alert_type and data are required'
      });
    }
    
    const userId = user_id || req.user.id;
    
    const result = await messagingService.sendAgriculturalAlert(
      userId,
      alert_type,
      data,
      channel
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;













