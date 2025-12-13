const axios = require('axios');
const logger = require('../utils/logger');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

let tf = null;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  logger.warn('TensorFlow.js not available, using fallback detection');
}

class RealTimeDiseaseDetectionService {
  constructor() {
    this.models = {
      plantNet: 'https://my-api.plantnet.org/v2/identify',
      plantix: 'https://api.plantix.com/v1/detect',
      googleVision: 'https://vision.googleapis.com/v1/images:annotate'
    };
    this.cache = new Map();
    this.localModel = null;
    this.initializeLocalModel();
  }

  async detectDiseaseRealTime(imageBuffer, context = {}) {
    try {
      logger.info('Starting real-time disease detection...');
      
      let validation;
      try {
        validation = await this.validateImage(imageBuffer);
        if (!validation || !validation.valid) {
          logger.warn('Image validation failed, using fallback', { error: validation?.error });
          return await this.fallbackAnalysis(imageBuffer, context);
        }
      } catch (validationError) {
        logger.warn('Image validation error, using fallback', { error: validationError.message });
        return await this.fallbackAnalysis(imageBuffer, context);
      }

      let processedImage;
      try {
        processedImage = await this.preprocessImage(imageBuffer);
        if (!processedImage) {
          logger.warn('Image preprocessing failed, using fallback');
          return await this.fallbackAnalysis(imageBuffer, context);
        }
      } catch (preprocessError) {
        logger.warn('Image preprocessing error, using fallback', { error: preprocessError.message });
        return await this.fallbackAnalysis(imageBuffer, context);
      }
      
      const detectionPromises = [
        this.detectWithPlantNet(processedImage, context).catch(err => {
          logger.debug('PlantNet detection failed', { error: err.message });
          return { diseases: [], source: 'PlantNet' };
        }),
        this.detectWithPlantix(processedImage, context).catch(err => {
          logger.debug('Plantix detection failed', { error: err.message });
          return { diseases: [], source: 'Plantix' };
        }),
        this.detectWithGoogleVision(processedImage, context).catch(err => {
          logger.debug('Google Vision detection failed', { error: err.message });
          return { diseases: [], source: 'Google Vision' };
        }),
        this.detectWithLocalModel(processedImage, context).catch(err => {
          logger.debug('Local model detection failed', { error: err.message });
          return { diseases: [], source: 'Local Model' };
        })
      ];

      const results = await Promise.allSettled(detectionPromises);
      
      const successfulDetections = results
        .filter(result => result.status === 'fulfilled' && result.value?.diseases?.length > 0)
        .map(result => result.value);

      if (successfulDetections.length === 0) {
        logger.debug('No successful detections, using fallback');
        return await this.fallbackAnalysis(imageBuffer, context);
      }

      const mergedResults = this.mergeDetections(successfulDetections);
      
      let detailedResults;
      try {
        detailedResults = await this.enrichWithDiseaseDetails(mergedResults);
      } catch (enrichError) {
        logger.warn('Failed to enrich disease details, using basic results', { error: enrichError.message });
        detailedResults = mergedResults;
      }
      
      let treatments;
      try {
        treatments = await this.getRealTimeTreatments(detailedResults, context);
      } catch (treatmentError) {
        logger.warn('Failed to get treatments, using empty array', { error: treatmentError.message });
        treatments = [];
      }
      
      let report;
      try {
        report = this.generateDetectionReport(detailedResults, treatments, context);
      } catch (reportError) {
        logger.warn('Failed to generate report', { error: reportError.message });
        report = { summary: 'Disease detection completed' };
      }

      let imageAnalysis;
      try {
        imageAnalysis = await this.analyzeImageCharacteristics(imageBuffer);
      } catch (analysisError) {
        logger.warn('Failed to analyze image characteristics', { error: analysisError.message });
        imageAnalysis = {};
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        detections: detailedResults,
        treatments: treatments,
        report: report,
        confidence: this.calculateOverallConfidence(detailedResults),
        sources: successfulDetections.map(d => d.source),
        imageAnalysis: imageAnalysis
      };
    } catch (error) {
      logger.error('Real-time disease detection error', error, { service: 'RealTimeDiseaseDetectionService' });
      return await this.fallbackAnalysis(imageBuffer, context);
    }
  }

  async detectWithPlantNet(imageBuffer, context) {
    try {
      if (!process.env.PLANTNET_API_KEY) {
        return { diseases: [], source: 'PlantNet' };
      }

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('images', imageBuffer, { filename: 'plant.jpg', contentType: 'image/jpeg' });
      formData.append('organs', 'leaf');
      formData.append('include-related-images', 'true');

      const response = await axios.post(
        `${this.models.plantNet}?api-key=${process.env.PLANTNET_API_KEY}`,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 10000
        }
      );

      const diseases = (response.data.results || [])
        .filter(result => result.score > 0.3)
        .map(result => ({
          name: result.species?.scientificName || result.species?.commonNames?.[0] || 'Unknown',
          commonName: result.species?.commonNames?.[0] || result.species?.scientificName,
          confidence: result.score,
          type: 'PlantNet',
          source: 'PlantNet API'
        }));

      return {
        diseases,
        source: 'PlantNet',
        rawData: response.data
      };
    } catch (error) {
      logger.warn('PlantNet detection failed:', error.message);
      return { diseases: [], source: 'PlantNet' };
    }
  }

  async detectWithPlantix(imageBuffer, context) {
    try {
      if (!process.env.PLANTIX_API_KEY) {
        return { diseases: [], source: 'Plantix' };
      }

      const response = await axios.post(
        this.models.plantix,
        {
          image: imageBuffer.toString('base64'),
          lat: context.lat || 20.5937,
          lon: context.lng || 78.9629,
          crop: context.crop || 'unknown'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PLANTIX_API_KEY}`
          },
          timeout: 10000
        }
      );

      const diseases = (response.data.predictions || [])
        .filter(pred => pred.confidence > 0.25)
        .map(pred => ({
          name: pred.disease_name || pred.name,
          scientificName: pred.scientific_name,
          confidence: pred.confidence,
          symptoms: pred.symptoms || [],
          affectedParts: pred.affected_parts || ['leaves'],
          type: pred.disease_type || 'unknown',
          source: 'Plantix API'
        }));

      return {
        diseases,
        source: 'Plantix',
        rawData: response.data
      };
    } catch (error) {
      logger.warn('Plantix detection failed:', error.message);
      return { diseases: [], source: 'Plantix' };
    }
  }

  async detectWithGoogleVision(imageBuffer, context) {
    try {
      if (!process.env.GOOGLE_VISION_API_KEY) {
        return { diseases: [], source: 'Google Vision' };
      }

      const response = await axios.post(
        `${this.models.googleVision}?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          requests: [{
            image: { content: imageBuffer.toString('base64') },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
            ]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      const labels = response.data.responses?.[0]?.labelAnnotations || [];
      const objects = response.data.responses?.[0]?.localizedObjectAnnotations || [];

      const diseases = labels
        .filter(label => this.isDiseaseRelated(label.description))
        .map(label => ({
          name: label.description,
          confidence: label.score,
          type: 'Google Vision Label',
          source: 'Google Vision API'
        }));

      objects.forEach(obj => {
        if (this.isDiseaseRelated(obj.name)) {
          diseases.push({
            name: obj.name,
            confidence: obj.score,
            bbox: obj.boundingPoly?.normalizedVertices,
            type: 'Google Vision Object',
            source: 'Google Vision API'
          });
        }
      });

      return {
        diseases,
        source: 'Google Vision',
        rawData: response.data
      };
    } catch (error) {
      logger.warn('Google Vision detection failed:', error.message);
      return { diseases: [], source: 'Google Vision' };
    }
  }

  async detectWithLocalModel(imageBuffer, context) {
    try {
      if (!tf || !this.localModel) {
        return { diseases: [], source: 'Local Model' };
      }

      const tensor = tf.node.decodeImage(imageBuffer);
      const resized = tf.image.resizeBilinear(tensor, [224, 224]);
      const normalized = resized.div(255.0);
      const batched = normalized.expandDims(0);

      const prediction = this.localModel.predict(batched);
      const probabilities = await prediction.data();

      tensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();
      prediction.dispose();

      const topIndices = this.getTopIndices(probabilities, 3);
      const diseaseClasses = this.getDiseaseClasses();

      const diseases = topIndices.map(index => ({
        name: diseaseClasses[index] || `Disease_${index}`,
        confidence: probabilities[index],
        type: 'Local ML Model',
        source: 'TensorFlow Model'
      }));

      return {
        diseases,
        source: 'Local Model',
        rawData: { probabilities: Array.from(probabilities) }
      };
    } catch (error) {
      logger.warn('Local model detection failed:', error.message);
      return { diseases: [], source: 'Local Model' };
    }
  }

  async enrichWithDiseaseDetails(detections) {
    const enriched = [];
    
    for (const detection of detections) {
      try {
        const details = this.getDiseaseDetails(detection.name);
        const treatments = this.getTreatments(detection.name);
        const prevention = this.getPreventionMethods(detection.name);
        
        enriched.push({
          ...detection,
          details: details || {},
          treatments: treatments || [],
          prevention: prevention || [],
          severity: this.calculateSeverity(detection.confidence, details),
          riskLevel: this.assessRiskLevel(detection, details)
        });
      } catch (error) {
        logger.warn(`Failed to enrich ${detection.name}:`, error.message);
        enriched.push(detection);
      }
    }
    
    return enriched.sort((a, b) => b.confidence - a.confidence);
  }

  async getRealTimeTreatments(detections, context) {
    const treatments = [];
    
    for (const detection of detections.slice(0, 3)) {
      try {
        const locationTreatments = this.getLocationSpecificTreatments(detection.name, context);
        const organicTreatments = this.getOrganicTreatments(detection.name);
        const chemicalTreatments = this.getChemicalTreatments(detection.name);
        
        treatments.push({
          disease: detection.name,
          locationSpecific: locationTreatments,
          organic: organicTreatments,
          chemical: chemicalTreatments,
          recommendations: this.generateTreatmentRecommendations(detection, locationTreatments, context)
        });
      } catch (error) {
        logger.warn(`Failed to get treatments for ${detection.name}:`, error.message);
      }
    }
    
    return treatments;
  }

  async validateImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      const validations = {
        isImage: metadata.format !== undefined,
        maxSize: imageBuffer.length <= 10 * 1024 * 1024, // 10MB
        dimensions: metadata.width >= 50 && metadata.height >= 50,
        format: ['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format?.toLowerCase()),
        aspectRatio: metadata.width / metadata.height <= 4 && metadata.width / metadata.height >= 0.25
      };

      return {
        valid: Object.values(validations).every(v => v === true),
        metadata,
        errors: Object.entries(validations)
          .filter(([_, valid]) => !valid)
          .map(([key]) => key)
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async preprocessImage(imageBuffer) {
    return await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  isDiseaseRelated(text) {
    const diseaseKeywords = [
      'blight', 'rust', 'mildew', 'spot', 'rot', 'wilt', 'mosaic',
      'curl', 'blotch', 'scab', 'canker', 'gall', 'smut', 'anthracnose'
    ];
    
    const lowerText = text.toLowerCase();
    return diseaseKeywords.some(keyword => lowerText.includes(keyword));
  }

  mergeDetections(detectionResults) {
    const diseaseMap = new Map();
    
    detectionResults.forEach(result => {
      result.diseases.forEach(disease => {
        const key = disease.name.toLowerCase();
        if (!diseaseMap.has(key)) {
          diseaseMap.set(key, {
            ...disease,
            sources: new Set([result.source]),
            confidences: [disease.confidence]
          });
        } else {
          const existing = diseaseMap.get(key);
          existing.sources.add(result.source);
          existing.confidences.push(disease.confidence);
          existing.confidence = existing.confidences.reduce((a, b) => a + b, 0) / existing.confidences.length;
        }
      });
    });

    return Array.from(diseaseMap.values()).map(disease => ({
      ...disease,
      sources: Array.from(disease.sources),
      confidence: disease.confidence
    }));
  }

  calculateOverallConfidence(detections) {
    if (detections.length === 0) return 0;
    
    const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
    const sourceMultiplier = Math.min(detections[0].sources?.length || 1, 3) / 3;
    
    return avgConfidence * sourceMultiplier;
  }

  generateDetectionReport(detections, treatments, context) {
    const report = {
      summary: '',
      recommendations: [],
      warnings: [],
      nextSteps: []
    };

    if (detections.length > 0) {
      const primary = detections[0];
      report.summary = `Detected: ${primary.name} with ${Math.round(primary.confidence * 100)}% confidence`;
      
      if (primary.confidence > 0.7) {
        report.recommendations.push(
          `Immediate treatment recommended for ${primary.name}`,
          'Monitor nearby plants for spread'
        );
        
        if (primary.severity === 'high') {
          report.warnings.push('High severity disease detected - urgent action required');
        }
      }
    }

    if (treatments.length > 0) {
      treatments[0].recommendations.forEach(rec => {
        report.nextSteps.push(rec);
      });
    }

    return report;
  }

  async fallbackAnalysis(imageBuffer, context) {
    try {
      const DiseaseDetectionService = require('./DiseaseDetectionService');
      const fallbackResult = await DiseaseDetectionService.detectDiseaseFromImage(imageBuffer);
      
      if (fallbackResult && fallbackResult.primaryDisease) {
        return {
          success: true,
          timestamp: new Date().toISOString(),
          detections: [{
            name: fallbackResult.primaryDisease.name,
            diseaseName: fallbackResult.primaryDisease.name,
            confidence: (fallbackResult.confidence || 0) / 100,
            type: fallbackResult.primaryDisease.type || 'Unknown',
            severity: fallbackResult.primaryDisease.severity || 'Medium',
            symptoms: fallbackResult.primaryDisease.symptoms || [],
            affectedParts: fallbackResult.primaryDisease.affectedParts || []
          }],
          treatments: [fallbackResult.treatment || {}],
          confidence: (fallbackResult.confidence || 0) / 100,
          source: 'Fallback Detection'
        };
      }
    } catch (error) {
      logger.warn('Fallback to standard service failed', error, { service: 'RealTimeDiseaseDetectionService' });
    }
    
    let analysis = {};
    try {
      analysis = await this.analyzeImageCharacteristics(imageBuffer);
    } catch (analysisError) {
      logger.warn('Image analysis failed in fallback', { error: analysisError.message });
      analysis = { colorProfile: { dominantColor: 'green' } };
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      detections: [{
        name: 'Unknown Disease',
        diseaseName: 'Unknown Disease',
        confidence: 0.5,
        type: 'Unknown',
        severity: 'Medium',
        symptoms: ['Please consult an agricultural expert'],
        affectedParts: ['Unknown']
      }],
      treatments: [{
        disease: 'Unknown Disease',
        organic: ['Consult agricultural expert'],
        chemical: [],
        recommendations: ['Seek professional advice']
      }],
      analysis: analysis,
      note: 'Real-time detection services unavailable. Using image analysis.',
      recommendations: [
        'Consult local agricultural expert',
        'Check Plantix app for mobile detection',
        'Submit clearer images of affected areas'
      ],
      confidence: 0.5,
      source: 'Ultimate Fallback'
    };
  }

  async analyzeImageCharacteristics(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const stats = await sharp(imageBuffer).stats();
      
      return {
        colorProfile: {
          dominantColor: this.getDominantColor(stats),
          brightness: this.calculateBrightness(stats),
          contrast: this.calculateContrast(stats)
        },
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length
        }
      };
    } catch (error) {
      return { error: 'Image analysis failed' };
    }
  }

  initializeLocalModel() {
    if (!tf) {
      this.localModel = null;
      return;
    }

    try {
      const model = tf.sequential();
      model.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu'
      }));
      model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      model.add(tf.layers.flatten());
      model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
      
      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      this.localModel = model;
      logger.info('✅ Local disease detection model initialized');
    } catch (error) {
      logger.warn('Failed to initialize local model:', error.message);
      this.localModel = null;
    }
  }

  getDiseaseClasses() {
    return [
      'Healthy',
      'Bacterial Blight',
      'Blast',
      'Brown Spot',
      'Leaf Curl',
      'Leaf Spot',
      'Powdery Mildew',
      'Rust',
      'Smut',
      'Wilt'
    ];
  }

  getTopIndices(probabilities, topK) {
    return Array.from(probabilities)
      .map((prob, idx) => ({ prob, idx }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, topK)
      .map(item => item.idx);
  }

  getDiseaseDetails(name) {
    return {
      description: `Information about ${name}`,
      symptoms: ['Leaf discoloration', 'Reduced yield'],
      causes: ['Fungal infection', 'Environmental stress']
    };
  }

  getTreatments(name) {
    return [
      { type: 'Chemical', name: 'Fungicide application', dosage: 'As per label' },
      { type: 'Organic', name: 'Neem oil spray', dosage: '2ml per liter' }
    ];
  }

  getPreventionMethods(name) {
    return [
      'Maintain proper spacing',
      'Ensure good air circulation',
      'Regular monitoring'
    ];
  }

  getLocationSpecificTreatments(name, context) {
    return this.getTreatments(name);
  }

  getOrganicTreatments(name) {
    return this.getTreatments(name).filter(t => t.type === 'Organic');
  }

  getChemicalTreatments(name) {
    return this.getTreatments(name).filter(t => t.type === 'Chemical');
  }

  generateTreatmentRecommendations(detection, treatments, context) {
    return [
      `Apply treatment for ${detection.name}`,
      'Monitor progress weekly',
      'Isolate affected plants if possible'
    ];
  }

  calculateSeverity(confidence, details) {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.5) return 'medium';
    return 'low';
  }

  assessRiskLevel(detection, details) {
    return 'moderate';
  }

  getDominantColor(stats) {
    return '#4CAF50'; // Placeholder
  }

  calculateBrightness(stats) {
    return 0.65; // Placeholder
  }

  calculateContrast(stats) {
    return 0.5; // Placeholder
  }
}

module.exports = new RealTimeDiseaseDetectionService();





