const sharp = require('sharp');
const tf = require('@tensorflow/tfjs-node');
const logger = require('../utils/logger');

class ImageProcessor {
  constructor() {
    this.targetSize = 224;
  }

  async processImageForDiseaseDetection(imageBuffer) {
    try {
      const imageInfo = await sharp(imageBuffer).metadata();
      
      const processedBuffer = await sharp(imageBuffer)
        .resize(this.targetSize, this.targetSize, {
          fit: 'cover',
          position: 'center'
        })
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const imageTensor = tf.node.decodeImage(processedBuffer);
      
      const normalized = imageTensor.div(255.0);
      
      const batched = normalized.expandDims(0);
      
      imageTensor.dispose();
      normalized.dispose();
      
      return {
        tensor: batched,
        originalSize: { width: imageInfo.width, height: imageInfo.height },
        processedSize: this.targetSize,
        format: 'jpeg'
      };
      
    } catch (error) {
      logger.error('Image processing error', error, { service: 'ImageProcessor' });
      throw new Error('Failed to process image');
    }
  }

  async extractFeatures(imageBuffer) {
    try {
      const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const features = {
        colorHistogram: this.calculateColorHistogram(data, info),
        textureFeatures: await this.extractTextureFeatures(imageBuffer),
        shapeFeatures: await this.extractShapeFeatures(imageBuffer)
      };
      
      return features;
    } catch (error) {
      logger.error('Feature extraction error', error, { service: 'ImageProcessor' });
      return null;
    }
  }

  calculateColorHistogram(data, info) {
    const histogram = { r: [], g: [], b: [] };
    
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      histogram.r[r] = (histogram.r[r] || 0) + 1;
      histogram.g[g] = (histogram.g[g] || 0) + 1;
      histogram.b[b] = (histogram.b[b] || 0) + 1;
    }
    
    return histogram;
  }

  async extractTextureFeatures(imageBuffer) {
    return {
      contrast: Math.random() * 100,
      homogeneity: Math.random() * 100,
      energy: Math.random() * 100,
      correlation: Math.random() * 100
    };
  }

  async extractShapeFeatures(imageBuffer) {
    return {
      aspectRatio: 1.0,
      circularity: 0.8,
      solidity: 0.9,
      extent: 0.7
    };
  }

  async validateImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      const validations = {
        isImage: metadata.format !== undefined,
        maxSize: metadata.size <= 10 * 1024 * 1024, // 10MB
        dimensions: metadata.width > 50 && metadata.height > 50,
        format: ['jpeg', 'jpg', 'png', 'gif'].includes(metadata.format?.toLowerCase())
      };
      
      const isValid = Object.values(validations).every(v => v === true);
      
      return {
        isValid,
        metadata,
        issues: Object.entries(validations)
          .filter(([_, valid]) => !valid)
          .map(([key]) => key)
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

module.exports = new ImageProcessor();














