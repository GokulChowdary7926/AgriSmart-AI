const express = require('express');
const router = express.Router();
const multer = require('multer');
const agriGPTService = require('../services/agriGPTService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Configure multer for image uploads
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

// Chat endpoint - uses real-time AI
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    const language = context.language || req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
    const userId = req.user?._id || req.user?.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const response = await agriGPTService.processMessage(message.trim(), language, userId);

    res.json({
      success: true,
      text: response.text,
      conversation: {
        text: response.text,
        source: response.source,
        confidence: response.confidence
      },
      timestamp: response.timestamp
    });
  } catch (error) {
    logger.error('AGRI-GPT chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      text: 'I apologize, but I encountered an error. Please try again.'
    });
  }
});

// Image upload endpoint
router.post('/chat/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const { message } = req.body;
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required'
      });
    }

    // Convert image to base64
    const imageBase64 = file.buffer.toString('base64');
    const response = await agriGPTService.processImage(imageBase64, language);

    res.json({
      success: true,
      text: response.disease,
      conversation: {
        text: response.disease,
        source: response.source,
        confidence: response.confidence
      },
      timestamp: response.timestamp
    });
  } catch (error) {
    logger.error('AGRI-GPT image upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image',
      text: 'I apologize, but I couldn\'t process the image. Please try again.'
    });
  }
});

module.exports = router;
