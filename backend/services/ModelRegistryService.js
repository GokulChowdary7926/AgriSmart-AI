const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class ModelRegistry {
  constructor() {
    this.models = {};
    this.registryPath = path.join(config.paths.models, 'registry.json');
  }

  async initialize() {
    try {
      await this.loadRegistry();
      
      await this.validateAllModels();
      
      logger.info('✅ Model Registry initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Model Registry:', error.message);
      this.models = {};
    }
  }

  async loadRegistry() {
    try {
      const data = await fs.readFile(this.registryPath, 'utf8');
      this.models = JSON.parse(data);
      logger.info(`✅ Loaded model registry with ${Object.keys(this.models).length} models`);
    } catch (error) {
      logger.warn('⚠️ No model registry found, creating new one');
      this.models = {};
      await this.saveRegistry();
    }
  }

  async validateAllModels() {
    const validationResults = {};
    
    for (const [modelName, modelInfo] of Object.entries(this.models)) {
      try {
        const isValid = await this.validateModel(modelInfo);
        validationResults[modelName] = {
          valid: isValid,
          path: modelInfo.path,
          version: modelInfo.version,
          type: modelInfo.type,
          lastValidated: new Date().toISOString()
        };
        
        if (!isValid) {
          logger.warn(`⚠️ Model ${modelName} (${modelInfo.version}) failed validation`);
        } else {
          logger.info(`✅ Model ${modelName} (${modelInfo.version}) validated`);
        }
      } catch (error) {
        validationResults[modelName] = {
          valid: false,
          error: error.message
        };
        logger.error(`❌ Error validating model ${modelName}:`, error.message);
      }
    }
    
    return validationResults;
  }

  async validateModel(modelInfo) {
    if (!modelInfo.path || !await this.pathExists(modelInfo.path)) {
      return false;
    }
    
    switch (modelInfo.type) {
      case 'tensorflowjs':
        return await this.validateTensorFlowJSModel(modelInfo.path);
      case 'pytorch':
        return await this.validatePyTorchModel(modelInfo.path);
      case 'xgboost':
        return await this.validateXGBoostModel(modelInfo.path);
      default:
        logger.warn(`Unknown model type: ${modelInfo.type}`);
        return true; // Don't block unknown types
    }
  }

  async validateTensorFlowJSModel(modelPath) {
    try {
      const modelJsonPath = path.join(modelPath, 'model.json');
      const exists = await this.pathExists(modelJsonPath);
      
      if (exists) {
        const modelJson = JSON.parse(await fs.readFile(modelJsonPath, 'utf8'));
        return modelJson.modelTopology && modelJson.weightsManifest;
      }
      return false;
    } catch (error) {
      logger.warn(`TensorFlow.js model validation error: ${error.message}`);
      return false;
    }
  }

  async validatePyTorchModel(modelPath) {
    try {
      const files = await fs.readdir(modelPath);
      return files.some(file => file.endsWith('.pth') || file.endsWith('.pt'));
    } catch (error) {
      return false;
    }
  }

  async validateXGBoostModel(modelPath) {
    try {
      const files = await fs.readdir(modelPath);
      return files.some(file => 
        file.endsWith('.pkl') || 
        file.endsWith('.joblib') || 
        file.endsWith('.json')
      );
    } catch (error) {
      return false;
    }
  }

  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async registerModel(name, modelInfo) {
    this.models[name] = {
      ...modelInfo,
      registeredAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    await this.saveRegistry();
    logger.info(`✅ Registered model: ${name} (${modelInfo.version})`);
  }

  async getModel(name) {
    const model = this.models[name];
    if (!model) {
      throw new Error(`Model ${name} not found in registry`);
    }
    return model;
  }

  async getAllModels() {
    return this.models;
  }

  async getModelPath(name) {
    const model = await this.getModel(name);
    return model.path;
  }

  async saveRegistry() {
    try {
      const dir = path.dirname(this.registryPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(
        this.registryPath,
        JSON.stringify(this.models, null, 2)
      );
    } catch (error) {
      logger.error('Failed to save model registry:', error.message);
    }
  }

  async discoverModels() {
    const commonPaths = [
      path.join(config.paths.models, 'disease-detection'),
      path.join(config.paths.models, 'crop-recommendation'),
      path.join(config.paths.models, 'plant-disease'),
      path.join(__dirname, '..', 'ml-models', 'disease-detection'),
      path.join(__dirname, '..', 'ml-models', 'crop-recommendation'),
    ];

    const discovered = [];

    for (const basePath of commonPaths) {
      try {
        if (await this.pathExists(basePath)) {
          const files = await fs.readdir(basePath, { withFileTypes: true });
          
          for (const file of files) {
            if (file.isDirectory()) {
              const modelPath = path.join(basePath, file.name);
              const modelJsonPath = path.join(modelPath, 'model.json');
              
              if (await this.pathExists(modelJsonPath)) {
                discovered.push({
                  name: file.name,
                  path: modelPath,
                  type: 'tensorflowjs',
                  version: config.ml.modelVersions.disease || 'v1.0'
                });
              }
            }
          }
        }
      } catch (error) {
        logger.warn(`Error discovering models in ${basePath}:`, error.message);
      }
    }

    return discovered;
  }
}

const modelRegistry = new ModelRegistry();

if (require.main !== module) {
  modelRegistry.initialize().catch(err => {
    logger.error('Failed to initialize model registry:', err);
  });
}

module.exports = modelRegistry;







