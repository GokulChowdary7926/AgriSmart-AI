
const express = require('express');
const router = express.Router();
const messagingService = require('../services/MessagingService');
const { authenticateToken } = require('../middleware/auth');
const { badRequest, serverError, ok } = require('../utils/httpResponses');

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
      return badRequest(res, 'to_phone and message are required');
    }
    
    const result = await messagingService.sendMessage(
      to_phone,
      message,
      channel,
      language,
      template_id,
      variables
    );
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'messaging_send_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
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
      return badRequest(res, 'phone_numbers array is required');
    }
    
    if (!message) {
      return badRequest(res, 'message is required');
    }
    
    const result = await messagingService.sendBulkMessages(
      phone_numbers,
      message,
      channel,
      language
    );
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'messaging_bulk_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
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
      return badRequest(res, 'alert_type and data are required');
    }
    
    const userId = user_id || req.user.id;
    
    const result = await messagingService.sendAgriculturalAlert(
      userId,
      alert_type,
      data,
      channel
    );
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'messaging_alert_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

module.exports = router;
















