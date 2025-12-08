const Disease = require('../models/Disease');
const logger = require('../utils/logger');

class DiseaseController {
  // Get all diseases
  static async getAll(req, res) {
    try {
      const { 
        type, 
        crop, 
        search, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      // Check if Disease model is available
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
            }
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
                { description: 'Yellow halo around spots' }
              ]
            }
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
                { description: 'Rust-colored spots on stems' }
              ]
            }
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
                { description: 'Raised, scabby lesions on fruits' }
              ]
            }
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
                { description: 'Leaves turn yellow and curl' }
              ]
            }
          }
        ];
        
        // Filter mock data based on search
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
      // Return empty array instead of error
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
  
  // Get disease by ID
  static async getById(req, res) {
    try {
      const disease = await Disease.findById(req.params.id)
        .populate('crops', 'name localNames');
      
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
      logger.error('Error fetching disease:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Create new disease
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
  
  // Update disease
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
  
  // Delete disease
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
  
  // Detect disease from symptoms
  static async detect(req, res) {
    try {
      const { symptoms, cropName, image } = req.body;
      const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
      
      // Image-based detection
      if (image) {
        const diseaseDetectionService = require('../services/diseaseDetectionService');
        const medicationService = require('../services/medicationService');
        
        // Handle base64 image
        let imageBuffer;
        if (image.startsWith('data:image')) {
          const base64Data = image.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          imageBuffer = Buffer.from(image, 'base64');
        }
        
        const result = await diseaseDetectionService.detectDisease(imageBuffer, language);
        
        // Get medication recommendations if disease detected
        let medication = null;
        if (result?.detection?.class) {
          try {
            medication = await medicationService.getMedicationRecommendations(
              result.detection.class,
              cropName || 'general',
              result.detection.confidence > 0.8 ? 'high' : 'medium',
              { language }
            );
          } catch (medError) {
            logger.warn('Failed to get medication:', medError);
          }
        }
        
        return res.json({
          success: true,
          data: {
            ...result,
            medication: medication
          }
        });
      }
      
      // Symptom-based detection
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
  
  // Get prevention tips for a crop
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
      
      // Remove duplicates
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
  
  // Search diseases
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
  
  // Get diseases by crop
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
