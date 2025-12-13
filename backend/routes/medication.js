const express = require('express');
const router = express.Router();
const medicationService = require('../services/medicationService');
const DiseaseDetectionService = require('../services/DiseaseDetectionService');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const logger = require('../utils/logger');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/treat/:diseaseName', async (req, res) => {
  try {
    const { diseaseName } = req.params;
    const { crop, severity } = req.query;
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';

    const medication = await medicationService.getMedicationRecommendations(
      diseaseName,
      crop || 'general',
      severity || 'medium',
      { language }
    );

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    logger.error('Error fetching medication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/detect-and-treat', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      });
    }

    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
    const { cropType, severity } = req.body;

    const detectionResult = await DiseaseDetectionService.detectDiseaseFromImage(
      req.file.buffer
    );

    if (!detectionResult || !detectionResult.primaryDisease) {
      return res.status(404).json({
        success: false,
        error: 'Could not detect disease in image'
      });
    }

    const medication = await medicationService.getMedicationRecommendations(
      detectionResult.primaryDisease.name,
      cropType || 'general',
      severity || (detectionResult.confidence > 80 ? 'high' : 'medium'),
      { language }
    );

    res.json({
      success: true,
      detection: {
        class: detectionResult.primaryDisease.name,
        confidence: detectionResult.confidence / 100
      },
      diseaseInfo: detectionResult.primaryDisease,
      medication: medication
    });
  } catch (error) {
    logger.error('Detection and treatment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process request'
    });
  }
});

router.get('/emergency/helpline', async (req, res) => {
  try {
    const contacts = medicationService.getEmergencyContacts();
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/products/:diseaseName', async (req, res) => {
  try {
    const { diseaseName } = req.params;
    const { state, district } = req.query;

    const products = {
      online: [
        {
          name: 'Chlorothalonil 75% WP',
          price: '₹450/250g',
          seller: 'Amazon',
          link: `https://amazon.in/search?q=${encodeURIComponent(diseaseName + ' treatment')}`,
          rating: 4.5
        },
        {
          name: 'Neem Oil',
          price: '₹250/100ml',
          seller: 'Flipkart',
          link: `https://flipkart.com/search?q=${encodeURIComponent(diseaseName + ' organic treatment')}`,
          rating: 4.2
        }
      ],
      local: [
        {
          name: 'Local Agri Store',
          products: [
            { name: 'Chlorothalonil 75% WP', price: '₹450/250g', contact: '9876543210' },
            { name: 'Neem Oil', price: '₹200/100ml', contact: '9876543211' }
          ],
          address: 'Near Krishi Bazaar, Main Road',
          distance: '2 km'
        }
      ]
    };

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
