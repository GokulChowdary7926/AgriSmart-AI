const express = require('express');
const router = express.Router();
const DiseaseController = require('../controllers/DiseaseController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

router.get('/', DiseaseController.getAll);
router.get('/search', DiseaseController.search);
router.get('/crop/:cropName', DiseaseController.getByCrop);
router.get('/prevention/:crop', DiseaseController.getPreventionTips);
router.get('/:id/medication', async (req, res) => {
  try {
    const medicationService = require('../services/medicationService');
    const Disease = require('../models/Disease');
    const disease = await Disease.findById(req.params.id);
    
    if (!disease) {
      return res.status(404).json({
        success: false,
        error: 'Disease not found'
      });
    }

    const { crop, severity } = req.query;
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';

    const medication = await medicationService.getMedicationRecommendations(
      disease.name,
      crop || 'general',
      severity || 'medium',
      { language }
    );

    res.json({
      success: true,
      data: medication
    });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error fetching medication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get('/:id', DiseaseController.getById);

router.post('/detect', DiseaseController.detect);
router.post('/detect-image', upload.single('image'), DiseaseController.detectFromImage);
router.post('/detect-multiple', upload.array('images', 5), DiseaseController.detectMultipleDiseases);

router.post('/', authenticateToken, DiseaseController.create);
router.put('/:id', authenticateToken, DiseaseController.update);
router.delete('/:id', authenticateToken, DiseaseController.delete);

module.exports = router;
