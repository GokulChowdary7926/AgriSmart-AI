const Disease = require('../models/Disease');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

class DiseaseController {
  static async getAll(req, res) {
    try {
      const { 
        type, 
        crop, 
        search, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      if (!Disease || typeof Disease.find !== 'function') {
        logger.warn('Disease model not available, returning mock data');
        const mockDiseases = [
          {
            _id: '1',
            name: 'Mosaic Virus',
            scientificName: 'Tobacco Mosaic Virus',
            type: 'viral',
            severityLevel: 5,
            severity: 'high',
            cropNames: ['tomato', 'tobacco', 'pepper', 'cucumber'],
            symptoms: {
              visual: [
                { description: 'Mottled, mosaic pattern of light and dark green' },
                { description: 'Leaf distortion and curling' }
              ]
            },
            treatments: [
              {
                name: 'Remove Infected Plants',
                type: 'Cultural',
                dosage: 'Remove and destroy immediately',
                frequency: 'As soon as detected'
              },
              {
                name: 'Neem Oil Spray',
                type: 'Organic',
                dosage: '2-3 ml per liter of water',
                frequency: 'Weekly for 3 weeks'
              },
              {
                name: 'Copper-based Fungicide',
                type: 'Chemical',
                dosage: 'As per manufacturer instructions',
                frequency: 'Every 10-14 days'
              }
            ],
            treatmentOptions: ['Remove infected plants', 'Apply neem oil', 'Use resistant varieties', 'Control aphids'],
            prevention: ['Use certified virus-free seeds', 'Sanitize tools between uses', 'Control aphid populations', 'Remove weeds']
          },
          {
            _id: '2',
            name: 'Leaf Blight',
            scientificName: 'Alternaria solani',
            type: 'fungal',
            severityLevel: 4,
            severity: 'high',
            cropNames: ['tomato', 'potato', 'pepper', 'eggplant'],
            symptoms: {
              visual: [
                { description: 'Small, dark brown to black spots with concentric rings' },
                { description: 'Yellow halo around spots' },
                { description: 'Leaves turn yellow and fall prematurely' }
              ]
            },
            treatments: [
              {
                name: 'Chlorothalonil 75% WP',
                type: 'Chemical',
                dosage: '2g per liter of water',
                frequency: 'Every 7-10 days'
              },
              {
                name: 'Mancozeb 75% WP',
                type: 'Chemical',
                dosage: '2.5g per liter of water',
                frequency: 'Every 10 days'
              },
              {
                name: 'Neem Oil',
                type: 'Organic',
                dosage: '3-5 ml per liter',
                frequency: 'Weekly'
              }
            ],
            treatmentOptions: ['Apply fungicides', 'Remove infected leaves', 'Improve air circulation', 'Avoid overhead watering'],
            prevention: ['Use disease-free seeds', 'Practice crop rotation', 'Maintain proper spacing', 'Water at base of plants']
          },
          {
            _id: '3',
            name: 'Rust',
            scientificName: 'Puccinia spp.',
            type: 'fungal',
            severityLevel: 4,
            severity: 'high',
            cropNames: ['wheat', 'barley', 'corn', 'beans'],
            symptoms: {
              visual: [
                { description: 'Orange to brown pustules on leaves' },
                { description: 'Rust-colored spots on stems' },
                { description: 'Leaves turn yellow and dry' }
              ]
            },
            treatments: [
              {
                name: 'Propiconazole 25% EC',
                type: 'Chemical',
                dosage: '1 ml per liter',
                frequency: 'Every 15 days'
              },
              {
                name: 'Tebuconazole 25% EC',
                type: 'Chemical',
                dosage: '0.5 ml per liter',
                frequency: 'Every 10-14 days'
              },
              {
                name: 'Sulfur Dust',
                type: 'Organic',
                dosage: 'Apply as dust',
                frequency: 'Weekly during infection period'
              }
            ],
            treatmentOptions: ['Apply fungicides early', 'Remove infected plant parts', 'Use resistant varieties'],
            prevention: ['Plant resistant varieties', 'Avoid overhead irrigation', 'Maintain proper spacing', 'Remove crop debris']
          },
          {
            _id: '4',
            name: 'Bacterial Spot',
            scientificName: 'Xanthomonas spp.',
            type: 'bacterial',
            severityLevel: 3,
            severity: 'medium',
            cropNames: ['tomato', 'pepper', 'chili'],
            symptoms: {
              visual: [
                { description: 'Small, water-soaked spots that turn brown' },
                { description: 'Raised, scabby lesions on fruits' },
                { description: 'Leaf spots with yellow halos' }
              ]
            },
            treatments: [
              {
                name: 'Copper-based Bactericide',
                type: 'Chemical',
                dosage: '2g per liter',
                frequency: 'Every 7-10 days'
              },
              {
                name: 'Streptomycin Sulfate',
                type: 'Chemical',
                dosage: 'As per label instructions',
                frequency: 'Every 10 days'
              },
              {
                name: 'Bacillus subtilis',
                type: 'Biological',
                dosage: 'As per manufacturer',
                frequency: 'Weekly'
              }
            ],
            treatmentOptions: ['Apply copper-based sprays', 'Use biological controls', 'Remove infected parts'],
            prevention: ['Use disease-free seeds', 'Avoid working when plants are wet', 'Practice crop rotation', 'Sanitize tools']
          },
          {
            _id: '5',
            name: 'Powdery Mildew',
            scientificName: 'Erysiphe spp.',
            type: 'fungal',
            severityLevel: 3,
            severity: 'medium',
            cropNames: ['cucumber', 'pumpkin', 'squash', 'melon'],
            symptoms: {
              visual: [
                { description: 'White powdery spots on upper leaf surface' },
                { description: 'Leaves turn yellow and curl' },
                { description: 'Stunted plant growth' }
              ]
            },
            treatments: [
              {
                name: 'Sulfur-based Fungicide',
                type: 'Chemical',
                dosage: 'As per label',
                frequency: 'Every 7-10 days'
              },
              {
                name: 'Potassium Bicarbonate',
                type: 'Organic',
                dosage: '1 tablespoon per liter',
                frequency: 'Weekly'
              },
              {
                name: 'Neem Oil',
                type: 'Organic',
                dosage: '3-5 ml per liter',
                frequency: 'Every 5-7 days'
              }
            ],
            treatmentOptions: ['Apply sulfur fungicides', 'Use baking soda solution', 'Improve air circulation'],
            prevention: ['Plant resistant varieties', 'Ensure good air flow', 'Avoid overhead watering', 'Remove infected leaves']
          }
        ];
        
        let filtered = mockDiseases;
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = mockDiseases.filter(d => 
            d.name.toLowerCase().includes(searchLower) ||
            d.scientificName.toLowerCase().includes(searchLower) ||
            d.cropNames.some(c => c.toLowerCase().includes(searchLower))
          );
        }
        if (crop) {
          filtered = filtered.filter(d => 
            d.cropNames.some(c => c.toLowerCase().includes(crop.toLowerCase()))
          );
        }
        if (type) {
          filtered = filtered.filter(d => d.type === type);
        }
        
        const skip = (page - 1) * limit;
        const paginated = filtered.slice(skip, skip + parseInt(limit));
        
        return res.json({
          success: true,
          data: paginated,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filtered.length,
            pages: Math.ceil(filtered.length / limit)
          }
        });
      }
      
      const query = {};
      
      if (type) {
        query.type = type;
      }
      
      if (crop) {
        query.cropNames = { $regex: new RegExp(crop, 'i') };
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { scientificName: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [diseases, total] = await Promise.all([
        Disease.find(query)
          .populate('crops', 'name')
          .sort({ severityLevel: -1, name: 1 })
          .skip(skip)
          .limit(parseInt(limit))
          .catch(() => []),
        Disease.countDocuments(query).catch(() => 0)
      ]);
      
      res.json({
        success: true,
        data: diseases || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total || 0,
          pages: Math.ceil((total || 0) / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching diseases:', error);
      res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(req.query.page || 1),
          limit: parseInt(req.query.limit || 20),
          total: 0,
          pages: 0
        }
      });
    }
  }
  
  static async getById(req, res) {
    try {
      if (!Disease || typeof Disease.findById !== 'function') {
        const mockDiseases = [
          {
            _id: '1',
            name: 'Mosaic Virus',
            scientificName: 'Tobacco Mosaic Virus',
            type: 'viral',
            severityLevel: 5,
            severity: 'high',
            cropNames: ['tomato', 'tobacco', 'pepper', 'cucumber'],
            symptoms: {
              visual: [
                { description: 'Mottled, mosaic pattern of light and dark green' },
                { description: 'Leaf distortion and curling' }
              ]
            },
            treatments: [
              {
                name: 'Remove Infected Plants',
                type: 'Cultural',
                dosage: 'Remove and destroy',
                frequency: 'Immediately'
              },
              {
                name: 'Neem Oil Spray',
                type: 'Organic',
                dosage: '2-3 ml per liter',
                frequency: 'Weekly for 3 weeks'
              }
            ],
            treatmentOptions: ['Remove infected plants', 'Apply neem oil', 'Use resistant varieties'],
            prevention: ['Use certified seeds', 'Sanitize tools', 'Control aphids']
          }
        ];
        const disease = mockDiseases.find(d => d._id === req.params.id) || mockDiseases[0];
        return res.json({ success: true, data: disease });
      }
      
      const disease = await Disease.findById(req.params.id)
        .populate('crops', 'name localNames');
      
      if (!disease) {
        return res.status(404).json({
          success: false,
          error: 'Disease not found'
        });
      }
      
      if (!disease.treatments || !Array.isArray(disease.treatments) || disease.treatments.length === 0) {
        disease.treatments = disease.treatmentOptions || [
          {
            name: 'General Treatment',
            type: 'General',
            dosage: 'As per label',
            frequency: 'As needed'
          }
        ];
      }
      
      res.json({
        success: true,
        data: disease
      });
    } catch (error) {
      logger.error('Error fetching disease:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async create(req, res) {
    try {
      const disease = new Disease({
        ...req.body,
        createdBy: req.user?._id
      });
      
      await disease.save();
      
      res.status(201).json({
        success: true,
        data: disease
      });
    } catch (error) {
      logger.error('Error creating disease:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async update(req, res) {
    try {
      const disease = await Disease.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          updatedBy: req.user?._id
        },
        { new: true, runValidators: true }
      );
      
      if (!disease) {
        return res.status(404).json({
          success: false,
          error: 'Disease not found'
        });
      }
      
      res.json({
        success: true,
        data: disease
      });
    } catch (error) {
      logger.error('Error updating disease:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async delete(req, res) {
    try {
      const disease = await Disease.findByIdAndDelete(req.params.id);
      
      if (!disease) {
        return res.status(404).json({
          success: false,
          error: 'Disease not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Disease deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting disease:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async detect(req, res) {
    try {
      const { symptoms, cropName, image } = req.body;
      const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
      
      if (image) {
        const diseaseDetectionService = require('../services/DiseaseDetectionService');
        const medicationService = require('../services/medicationService');
        
        let imageBuffer;
        if (image.startsWith('data:image')) {
          const base64Data = image.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          imageBuffer = Buffer.from(image, 'base64');
        }
        
        const result = await diseaseDetectionService.detectDiseaseFromImage(imageBuffer);
        
        let medication = null;
        if (result?.primaryDisease?.name) {
          try {
            medication = await medicationService.getMedicationRecommendations(
              result.primaryDisease.name,
              cropName || 'general',
              result.confidence > 80 ? 'high' : 'medium',
              { language }
            );
          } catch (medError) {
            logger.warn('Failed to get medication:', medError);
          }
        }
        
        return res.json({
          success: true,
          message: 'Disease detection completed',
          timestamp: new Date().toISOString(),
          ...result,
          medication: medication
        });
      }
      
      if (!symptoms || !Array.isArray(symptoms)) {
        return res.status(400).json({
          success: false,
          error: 'Symptoms array or image is required'
        });
      }
      
      const results = await Disease.detectFromSymptoms(symptoms, cropName);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error detecting disease:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to detect disease'
      });
    }
  }

  static async detectFromImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload an image file'
        });
      }
      
      logger.info('Processing disease detection', { filename: req.file.originalname });
      
      let result;
      try {
        let realtimeResult = null;
        try {
          const RealTimeDiseaseDetectionService = require('../services/RealTimeDiseaseDetectionService');
          if (RealTimeDiseaseDetectionService && typeof RealTimeDiseaseDetectionService.detectDiseaseRealTime === 'function') {
            const context = {
              lat: req.body.lat || req.query.lat,
              lng: req.body.lng || req.query.lng,
              crop: req.body.crop || req.query.crop
            };
            realtimeResult = await RealTimeDiseaseDetectionService.detectDiseaseRealTime(req.file.buffer, context);
          }
        } catch (realtimeInitError) {
          logger.debug('RealTime service initialization failed, skipping', { error: realtimeInitError.message });
        }
        
        if (realtimeResult && realtimeResult.detections && Array.isArray(realtimeResult.detections) && realtimeResult.detections.length > 0) {
          const primaryDetection = realtimeResult.detections[0];
          const DiseaseDetectionService = require('../services/DiseaseDetectionService');
          result = {
            predictions: realtimeResult.detections.map((det, idx) => ({
              className: det.name || det.diseaseName || 'Unknown Disease',
              probability: (det.confidence || 0) * 100
            })),
            primaryDisease: {
              name: primaryDetection.name || primaryDetection.diseaseName || 'Unknown Disease',
              type: primaryDetection.type || 'Unknown',
              severity: primaryDetection.severity || 'Medium',
              symptoms: primaryDetection.symptoms || [],
              affectedParts: primaryDetection.affectedParts || []
            },
            timestamp: realtimeResult.timestamp || new Date().toISOString(),
            confidence: realtimeResult.confidence || (primaryDetection.confidence || 0) * 100,
            treatment: realtimeResult.treatments?.[0] || DiseaseDetectionService.getTreatmentPlan(primaryDetection.name || 'Unknown Disease'),
            source: 'Real-Time Detection'
          };
        } else {
          logger.debug('Real-time service returned no detections, trying standard service', { 
            hasResult: !!realtimeResult,
            detectionsLength: realtimeResult?.detections?.length || 0
          });
          throw new Error('No detections from real-time service');
        }
      } catch (realtimeError) {
        logger.debug('Real-time disease detection unavailable, using standard service', { 
          error: realtimeError.message,
          service: 'DiseaseController' 
        });
        try {
          const DiseaseDetectionService = require('../services/DiseaseDetectionService');
          result = await DiseaseDetectionService.detectDiseaseFromImage(req.file.buffer);
          if (result) {
            result.source = result.source || 'Standard Detection';
          }
        } catch (standardError) {
          logger.error('Standard disease detection also failed', standardError, { service: 'DiseaseController' });
          try {
            const DiseaseDetectionService = require('../services/DiseaseDetectionService');
            result = await DiseaseDetectionService.fallbackDetection(req.file.buffer);
            if (result) {
              result.source = 'Fallback Detection';
            } else {
              result = {
                predictions: [{ className: 'Unknown Disease', probability: 50 }],
                primaryDisease: DiseaseDetectionService.getGenericDiseaseInfo('Unknown Disease'),
                timestamp: new Date().toISOString(),
                confidence: 50,
                treatment: DiseaseDetectionService.getTreatmentPlan('Unknown Disease'),
                note: 'Using fallback detection - accuracy may vary'
              };
            }
          } catch (fallbackError) {
            logger.error('Fallback detection also failed', fallbackError, { service: 'DiseaseController' });
            const DiseaseDetectionService = require('../services/DiseaseDetectionService');
            result = {
              predictions: [{ className: 'Detection Error', probability: 0 }],
              primaryDisease: DiseaseDetectionService.getGenericDiseaseInfo('Unknown Disease'),
              timestamp: new Date().toISOString(),
              confidence: 0,
              treatment: DiseaseDetectionService.getTreatmentPlan('Unknown Disease'),
              note: 'Detection service unavailable - please try again'
            };
          }
        }
      }
      
      if (req.user) {
        try {
          await this.saveDetectionToDatabase(req.user.id, result);
        } catch (dbError) {
          logger.warn('Failed to save detection to database:', dbError.message);
        }
      }
      
      if (!result) {
        logger.error('Disease detection returned null result, using fallback', { service: 'DiseaseController' });
        const DiseaseDetectionService = require('../services/DiseaseDetectionService');
        try {
          result = await DiseaseDetectionService.fallbackDetection(req.file.buffer);
          if (!result) {
            result = {
              predictions: [{ className: 'Unknown Disease', probability: 0 }],
              primaryDisease: DiseaseDetectionService.getGenericDiseaseInfo('Unknown Disease'),
              timestamp: new Date().toISOString(),
              confidence: 0,
              treatment: DiseaseDetectionService.getTreatmentPlan('Unknown Disease'),
              note: 'Using emergency fallback - please try again'
            };
          }
          result.source = 'Emergency Fallback';
        } catch (fallbackError) {
          logger.error('Emergency fallback also failed', fallbackError, { service: 'DiseaseController' });
          result = {
            predictions: [{ className: 'Detection Error', probability: 0 }],
            primaryDisease: {
              name: 'Detection Error',
              type: 'Unknown',
              severity: 'Medium',
              symptoms: ['Please try again'],
              affectedParts: ['Unknown']
            },
            timestamp: new Date().toISOString(),
            confidence: 0,
            treatment: {
              diseaseName: 'Detection Error',
              immediateActions: ['Please try uploading the image again']
            },
            source: 'Absolute Fallback'
          };
        }
      }
      
      if (!result || !result.primaryDisease || !result.primaryDisease.name) {
        logger.warn('Invalid primaryDisease in result, using generic', { 
          hasResult: !!result,
          hasPrimaryDisease: !!result?.primaryDisease,
          service: 'DiseaseController' 
        });
        const DiseaseDetectionService = require('../services/DiseaseDetectionService');
        if (DiseaseDetectionService && typeof DiseaseDetectionService.getGenericDiseaseInfo === 'function') {
          const genericDisease = DiseaseDetectionService.getGenericDiseaseInfo('Unknown Disease');
          if (!result) {
            result = {};
          }
          if (!result.primaryDisease) {
            result.primaryDisease = genericDisease;
          } else {
            result.primaryDisease.name = genericDisease.name;
            result.primaryDisease.type = genericDisease.type || 'Unknown';
            result.primaryDisease.severity = genericDisease.severity || 'Medium';
          }
          if (typeof DiseaseDetectionService.getTreatmentPlan === 'function') {
            result.treatment = DiseaseDetectionService.getTreatmentPlan(genericDisease.name);
          }
          if (!result.predictions) {
            result.predictions = [{ className: genericDisease.name, probability: 0 }];
          }
          if (!result.confidence) {
            result.confidence = 0;
          }
          if (!result.timestamp) {
            result.timestamp = new Date().toISOString();
          }
        } else {
          if (!result) {
            result = {};
          }
          result.primaryDisease = {
            name: 'Unknown Disease',
            type: 'Unknown',
            severity: 'Medium',
            symptoms: ['Please consult an agricultural expert'],
            affectedParts: ['Unknown']
          };
          result.treatment = {
            diseaseName: 'Unknown Disease',
            immediateActions: ['Consult local agricultural expert']
          };
          result.predictions = [{ className: 'Unknown Disease', probability: 0 }];
          result.confidence = 0;
          result.timestamp = new Date().toISOString();
        }
      }

      res.json({
        success: true,
        message: 'Disease detection completed',
        timestamp: new Date().toISOString(),
        imageInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        ...result
      });
    } catch (error) {
      logger.error('Controller error', error, { service: 'DiseaseController', stack: error.stack });
      
      try {
        const DiseaseDetectionService = require('../services/DiseaseDetectionService');
        const imageBuffer = req.file?.buffer || (req.file ? Buffer.from('') : null);
        
        if (imageBuffer && imageBuffer.length > 0) {
          const fallbackResult = await DiseaseDetectionService.fallbackDetection(imageBuffer);
          
          if (fallbackResult && fallbackResult.primaryDisease) {
            return res.json({
              success: true,
              message: 'Disease detection completed (fallback mode)',
              timestamp: new Date().toISOString(),
              imageInfo: req.file ? {
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
              } : {},
              ...fallbackResult,
              source: 'Error Fallback',
              note: 'Using fallback detection due to error. Please try again for better results.'
            });
          }
        }
      } catch (fallbackError) {
        logger.error('Fallback detection also failed', fallbackError, { service: 'DiseaseController' });
      }
      
      res.json({
        success: true,
        message: 'Disease detection completed (emergency fallback)',
        timestamp: new Date().toISOString(),
        imageInfo: req.file ? {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        } : {},
        primaryDisease: {
          name: 'Detection Error',
          type: 'Unknown',
          severity: 'Medium',
          symptoms: ['Please try again or consult an agricultural expert'],
          affectedParts: ['Unknown']
        },
        predictions: [{
          className: 'Detection Error',
          probability: 0
        }],
        confidence: 0,
        treatment: {
          diseaseName: 'Detection Error',
          immediateActions: ['Please try uploading the image again', 'Consult local agricultural expert']
        },
        source: 'Emergency Fallback',
        note: 'An error occurred during detection. Please try again.'
      });
    }
  }
  
  static async detectMultipleDiseases(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please upload at least one image'
        });
      }
      
      logger.info('Processing multiple images for disease detection', { count: req.files.length });
      
      const DiseaseDetectionService = require('../services/DiseaseDetectionService');
      const results = [];
      
      for (const file of req.files) {
        const result = await DiseaseDetectionService.detectDiseaseFromImage(file.buffer);
        results.push({
          filename: file.originalname,
          ...result
        });
      }
      
      const diseaseCounts = {};
      results.forEach(result => {
        const disease = result.primaryDisease.name;
        diseaseCounts[disease] = (diseaseCounts[disease] || 0) + 1;
      });
      
      const mostCommonDisease = Object.entries(diseaseCounts)
        .sort((a, b) => b[1] - a[1])[0];
      
      res.json({
        success: true,
        message: `Processed ${results.length} images`,
        totalImages: results.length,
        mostCommonDisease: mostCommonDisease ? {
          name: mostCommonDisease[0],
          count: mostCommonDisease[1]
        } : null,
        results: results,
        summary: this.generateSummary(results)
      });
    } catch (error) {
      logger.error('Multiple detection error', error, { service: 'DiseaseController' });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static generateSummary(results) {
    const summary = {
      totalHealthy: results.filter(r => r.primaryDisease.name.toLowerCase().includes('healthy')).length,
      totalDiseased: results.filter(r => !r.primaryDisease.name.toLowerCase().includes('healthy')).length,
      diseaseTypes: {},
      avgConfidence: 0
    };
    
    results.forEach(result => {
      const disease = result.primaryDisease.name;
      summary.diseaseTypes[disease] = (summary.diseaseTypes[disease] || 0) + 1;
      summary.avgConfidence += result.confidence;
    });
    
    summary.avgConfidence = results.length > 0 ? summary.avgConfidence / results.length : 0;
    
    return summary;
  }

  static async saveDetectionToDatabase(userId, detectionResult) {
    try {
      logger.info(`Detection saved for user ${userId}`, { disease: detectionResult.primaryDisease.name });
    } catch (error) {
      logger.error('Failed to save detection', error, { userId });
    }
  }
  
  static async getPreventionTips(req, res) {
    try {
      const { crop } = req.params;
      
      const diseases = await Disease.find({ 
        cropNames: { $regex: new RegExp(crop, 'i') }
      });
      
      const tips = diseases.flatMap(d => 
        d.preventiveMeasures?.flatMap(pm => [
          ...(pm.cultural || []),
          ...(pm.biological || []),
          ...(pm.chemical || []),
          ...(pm.physical || [])
        ]) || []
      );
      
      const uniqueTips = Array.from(new Set(tips));
      
      res.json({
        success: true,
        data: uniqueTips
      });
    } catch (error) {
      logger.error('Error fetching prevention tips:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async search(req, res) {
    try {
      const { crop, symptom, severity, type } = req.query;
      const query = {};
      
      if (crop) {
        query.cropNames = { $regex: new RegExp(crop, 'i') };
      }
      
      if (symptom) {
        query['symptoms.visual.description'] = { $regex: new RegExp(symptom, 'i') };
      }
      
      if (severity) {
        query.severityLevel = parseInt(severity);
      }
      
      if (type) {
        query.type = type;
      }
      
      const diseases = await Disease.find(query)
        .populate('crops', 'name')
        .limit(50);
      
      res.json({
        success: true,
        data: diseases
      });
    } catch (error) {
      logger.error('Error searching diseases:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async getByCrop(req, res) {
    try {
      const { cropName } = req.params;
      
      const diseases = await Disease.findByCrop(cropName);
      
      res.json({
        success: true,
        data: diseases
      });
    } catch (error) {
      logger.error('Error fetching diseases by crop:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = DiseaseController;
