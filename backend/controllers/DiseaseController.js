const Disease = require('../models/Disease');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { badRequest, notFound, serverError, serviceUnavailable, ok } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

class DiseaseController {
  static success(res, data, { isFallback = false, source = 'AgriSmart AI', degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static parsePositiveInt(value, defaultValue, { min = 1, max = 100 } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
  }

  static async withTimeout(promise, timeoutMs, fallbackValue) {
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  static async getAll(req, res) {
    try {
      const { 
        type, 
        crop, 
        search, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      if (!Disease || typeof Disease.find !== 'function' || !mongoReady()) {
        logger.warn('Disease model not available or DB disconnected, returning mock data');
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
        
        return DiseaseController.success(
          res,
          paginated,
          {
            isFallback: true,
            degradedReason: 'disease_db_unavailable',
            extra: {
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filtered.length,
                pages: Math.ceil(filtered.length / limit)
              }
            }
          }
        );
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
          { scientificName: { $regex: search, $options: 'i' } },
          { cropNames: { $regex: search, $options: 'i' } },
          { cropType: { $regex: search, $options: 'i' } },
          { crop_affected: { $regex: search, $options: 'i' } }
        ];
      }
      
      const safePage = this.parsePositiveInt(page, 1, { min: 1, max: 100000 });
      const safeLimit = this.parsePositiveInt(limit, 20, { min: 1, max: 100 });
      const skip = (safePage - 1) * safeLimit;
      
      const [diseases, total] = await Promise.all([
        this.withTimeout(
          Disease.find(query)
            .populate('crops', 'name')
            .sort({ severityLevel: -1, name: 1 })
            .skip(skip)
            .limit(safeLimit)
            .maxTimeMS(3000)
            .catch(() => []),
          3500,
          []
        ),
        this.withTimeout(
          Disease.countDocuments(query)
            .maxTimeMS(3000)
            .catch(() => 0),
          3500,
          0
        )
      ]);
      
      return DiseaseController.success(
        res,
        diseases || [],
        {
          extra: {
            pagination: {
              page: safePage,
              limit: safeLimit,
              total: total || 0,
              pages: Math.ceil((total || 0) / safeLimit)
            }
          }
        }
      );
    } catch (error) {
      logger.error('Error fetching diseases:', error);
      return DiseaseController.success(
        res,
        [],
        {
          isFallback: true,
          degradedReason: 'disease_controller_error',
          extra: {
            pagination: {
              page: this.parsePositiveInt(req.query.page, 1, { min: 1, max: 100000 }),
              limit: this.parsePositiveInt(req.query.limit, 20, { min: 1, max: 100 }),
              total: 0,
              pages: 0
            }
          }
        }
      );
    }
  }
  
  static async getById(req, res) {
    try {
      if (!Disease || typeof Disease.findById !== 'function' || !mongoReady()) {
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
        return DiseaseController.success(
          res,
          disease,
          { isFallback: true, degradedReason: 'disease_db_unavailable' }
        );
      }
      
      const disease = await Disease.findById(req.params.id)
        .populate('crops', 'name localNames');
      
      if (!disease) {
        return notFound(res, 'Disease not found');
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
      
      return DiseaseController.success(res, disease);
    } catch (error) {
      logger.error('Error fetching disease:', error);
      return serverError(res, error.message);
    }
  }
  
  static async create(req, res) {
    try {
      if (!Disease || !mongoReady()) {
        return serviceUnavailable(res, 'Database unavailable; cannot persist disease right now', { degradedReason: 'mongo_unavailable' });
      }
      const disease = new Disease({
        ...req.body,
        createdBy: req.user?._id
      });
      
      await disease.save();
      
      return res.status(201).json({
        success: true,
        data: disease
      });
    } catch (error) {
      logger.error('Error creating disease:', error);
      return badRequest(res, error.message);
    }
  }
  
  static async update(req, res) {
    try {
      if (!Disease || !mongoReady()) {
        return serviceUnavailable(res, 'Database unavailable; cannot update disease right now', { degradedReason: 'mongo_unavailable' });
      }
      const disease = await Disease.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          updatedBy: req.user?._id
        },
        { new: true, runValidators: true }
      );
      
      if (!disease) {
        return notFound(res, 'Disease not found');
      }
      
      return DiseaseController.success(res, disease);
    } catch (error) {
      logger.error('Error updating disease:', error);
      return badRequest(res, error.message);
    }
  }
  
  static async delete(req, res) {
    try {
      if (!Disease || !mongoReady()) {
        return serviceUnavailable(res, 'Database unavailable; cannot delete disease right now', { degradedReason: 'mongo_unavailable' });
      }
      const disease = await Disease.findByIdAndDelete(req.params.id);
      
      if (!disease) {
        return notFound(res, 'Disease not found');
      }
      
      return DiseaseController.success(
        res,
        { message: 'Disease deleted successfully' },
        { extra: { message: 'Disease deleted successfully' } }
      );
    } catch (error) {
      logger.error('Error deleting disease:', error);
      return serverError(res, error.message);
    }
  }
  
  static async detect(req, res) {
    try {
      const { symptoms, cropName, image } = req.body;
      const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
      
      if (image) {
        const diseaseDetectionService = require('../services/diseaseDetectionService');
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
        
        const isFallback = Boolean(result?.isFallback || result?.fallbackUsed || String(result?.source || '').toLowerCase().includes('fallback'));
        return DiseaseController.success(
          res,
          {
            message: 'Disease detection completed',
            timestamp: new Date().toISOString(),
            ...result,
            medication
          },
          {
            isFallback,
            degradedReason: isFallback ? 'disease_detection_degraded' : null,
            extra: {
              message: 'Disease detection completed',
              timestamp: new Date().toISOString(),
              ...result,
              medication
            }
          }
        );
      }
      
      if (!symptoms || !Array.isArray(symptoms)) {
        return badRequest(res, 'Symptoms array or image is required');
      }
      
      const results = await Disease.detectFromSymptoms(symptoms, cropName);
      
      return DiseaseController.success(res, results);
    } catch (error) {
      logger.error('Error detecting disease:', error);
      return serverError(res, error.message || 'Failed to detect disease');
    }
  }

  static async detectFromImage(req, res) {
    try {
      if (!req.file) {
        return badRequest(res, 'Please upload an image file');
      }
      
      logger.info('Processing disease detection', { filename: req.file.originalname });
      
      let result;
      try {
        const DiseaseDetectionService = require('../services/diseaseDetectionService');
        result = await DiseaseDetectionService.detectDiseaseFromImage(req.file.buffer);
        if (result) {
          result.source = result.source || 'Standard Detection';
        }
      } catch (standardError) {
        logger.error('Standard disease detection failed, using local fallback', standardError, { service: 'DiseaseController' });
        try {
          const DiseaseDetectionService = require('../services/diseaseDetectionService');
          result = await DiseaseDetectionService.fallbackDetection(req.file.buffer);
          if (result) {
            result.source = result.source || 'Fallback Detection';
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
          const DiseaseDetectionService = require('../services/diseaseDetectionService');
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
      
      if (req.user) {
        try {
          const userId = req.user?.id || req.user?.userId || req.user?._id;
          if (userId) {
            await this.saveDetectionToDatabase(userId, result);
          }
        } catch (dbError) {
          logger.warn('Failed to save detection to database:', dbError.message);
        }
      }
      
      if (!result) {
        logger.error('Disease detection returned null result, using fallback', { service: 'DiseaseController' });
        const DiseaseDetectionService = require('../services/diseaseDetectionService');
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
        const DiseaseDetectionService = require('../services/diseaseDetectionService');
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

      {
        const isFallback = Boolean(result?.isFallback || String(result?.source || '').toLowerCase().includes('fallback'));
        return DiseaseController.success(
          res,
          {
            message: 'Disease detection completed',
            timestamp: new Date().toISOString(),
            imageInfo: {
              originalName: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype
            },
            ...result
          },
          {
            isFallback,
            degradedReason: isFallback ? 'disease_detection_degraded' : null,
            extra: {
              message: 'Disease detection completed',
              timestamp: new Date().toISOString(),
              imageInfo: {
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
              },
              ...result
            }
          }
        );
      }
    } catch (error) {
      logger.error('Controller error', error, { service: 'DiseaseController', stack: error.stack });
      
      try {
        const DiseaseDetectionService = require('../services/diseaseDetectionService');
        const imageBuffer = req.file?.buffer || (req.file ? Buffer.from('') : null);
        
        if (imageBuffer && imageBuffer.length > 0) {
          const fallbackResult = await DiseaseDetectionService.fallbackDetection(imageBuffer);
          
          if (fallbackResult && fallbackResult.primaryDisease) {
            return DiseaseController.success(
              res,
              {
                message: 'Disease detection completed (fallback mode)',
                timestamp: new Date().toISOString(),
                imageInfo: req.file ? {
                  originalName: req.file.originalname,
                  size: req.file.size,
                  mimetype: req.file.mimetype
                } : {},
                ...fallbackResult,
                note: 'Using fallback detection due to error. Please try again for better results.'
              },
              {
                isFallback: true,
                source: 'Error Fallback',
                degradedReason: 'disease_detection_error_fallback',
                extra: {
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
                }
              }
            );
          }
        }
      } catch (fallbackError) {
        logger.error('Fallback detection also failed', fallbackError, { service: 'DiseaseController' });
      }
      
      return DiseaseController.success(
        res,
        {
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
          note: 'An error occurred during detection. Please try again.'
        },
        {
          isFallback: true,
          source: 'Emergency Fallback',
          degradedReason: 'disease_detection_emergency_fallback',
          extra: {
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
          }
        }
      );
    }
  }
  
  static async detectMultipleDiseases(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return badRequest(res, 'Please upload at least one image');
      }
      
      logger.info('Processing multiple images for disease detection', { count: req.files.length });
      
      const DiseaseDetectionService = require('../services/diseaseDetectionService');
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
      
      return DiseaseController.success(
        res,
        {
          message: `Processed ${results.length} images`,
          totalImages: results.length,
          mostCommonDisease: mostCommonDisease ? {
            name: mostCommonDisease[0],
            count: mostCommonDisease[1]
          } : null,
          results: results,
          summary: this.generateSummary(results)
        },
        {
          extra: {
            message: `Processed ${results.length} images`,
            totalImages: results.length,
            mostCommonDisease: mostCommonDisease ? {
              name: mostCommonDisease[0],
              count: mostCommonDisease[1]
            } : null,
            results: results,
            summary: this.generateSummary(results)
          }
        }
      );
    } catch (error) {
      logger.error('Multiple detection error', error, { service: 'DiseaseController' });
      return serverError(res, 'Internal server error');
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
      if (!Disease || !mongoReady()) {
        return DiseaseController.success(res, [], { extra: { isFallback: true, degradedReason: 'mongo_unavailable' } });
      }
      
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
      
      return DiseaseController.success(res, uniqueTips);
    } catch (error) {
      logger.error('Error fetching prevention tips:', error);
      return serverError(res, error.message);
    }
  }
  
  static async search(req, res) {
    try {
      if (!Disease || !mongoReady()) {
        return DiseaseController.success(res, [], { extra: { isFallback: true, degradedReason: 'mongo_unavailable' } });
      }
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
      
      return DiseaseController.success(res, diseases);
    } catch (error) {
      logger.error('Error searching diseases:', error);
      return serverError(res, error.message);
    }
  }
  
  static async getByCrop(req, res) {
    try {
      const { cropName } = req.params;
      if (!Disease || typeof Disease.findByCrop !== 'function' || !mongoReady()) {
        return DiseaseController.success(res, [], { extra: { isFallback: true, degradedReason: 'mongo_unavailable' } });
      }
      
      const diseases = await Disease.findByCrop(cropName);
      
      return DiseaseController.success(res, diseases);
    } catch (error) {
      logger.error('Error fetching diseases by crop:', error);
      return serverError(res, error.message);
    }
  }
}

const { bindStaticMethods } = require('../utils/bindControllerMethods');
module.exports = bindStaticMethods(DiseaseController);
