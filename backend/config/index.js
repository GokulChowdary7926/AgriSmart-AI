const path = require('path');
const { validateEnvironment } = require('./envValidator');

const validationResult = validateEnvironment();

const config = {
  app: {
    name: 'AgriSmart AI',
    version: '1.0.0',
    port: parseInt(process.env.PORT) || 5001,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3030',
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key-change-in-production-min-32-chars' : null),
    jwtExpiry: process.env.JWT_EXPIRE || '7d',
    corsOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3030', 'http://localhost:5173'],
  },
  
  database: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agrismart',
    redisUri: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  apiKeys: {
    openweather: process.env.OPENWEATHER_API_KEY || null,
    agmarknet: process.env.AGMARKNET_API_KEY || process.env.DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
    perplexity: process.env.PERPLEXITY_API_KEY || null,
    google: process.env.GOOGLE_AI_KEY || null,
    openai: process.env.OPENAI_API_KEY || null,
    deepseek: process.env.DEEPSEEK_API_KEY || null,
    nasa: process.env.NASA_API_KEY || null,
    rapidapi: process.env.RAPIDAPI_KEY || null,
    plantnet: process.env.PLANTNET_API_KEY || null,
    plantix: process.env.PLANTIX_API_KEY || null,
    googleVision: process.env.GOOGLE_VISION_API_KEY || null,
  },
  
  paths: {
    models: process.env.MODELS_PATH || path.join(__dirname, '..', 'ml-models'),
    datasets: process.env.DATASETS_PATH || path.join(__dirname, '..', 'data'),
    uploads: process.env.UPLOADS_PATH || path.join(__dirname, '..', 'uploads'),
    temp: process.env.TEMP_PATH || path.join(__dirname, '..', 'temp'),
    logs: process.env.LOGS_PATH || path.join(__dirname, '..', 'logs'),
  },
  
  ml: {
    pythonPath: process.env.PYTHON_PATH || 'python3',
    tensorflowEnabled: process.env.TF_ENABLED !== 'false',
    useGpu: process.env.USE_GPU === 'true',
    modelVersions: {
      disease: process.env.DISEASE_MODEL_VERSION || 'v1.0',
      crop: process.env.CROP_MODEL_VERSION || 'v1.0',
      yield: process.env.YIELD_MODEL_VERSION || 'v1.0',
    },
  },
  
  features: {
    realtimeAnalytics: process.env.FEATURE_REALTIME_ANALYTICS !== 'false',
    mlPredictions: process.env.FEATURE_ML_PREDICTIONS !== 'false',
    externalApis: process.env.FEATURE_EXTERNAL_APIS !== 'false',
    caching: process.env.FEATURE_CACHING !== 'false',
  },
  
  validation: validationResult,
};

config.validateApiKeys = () => {
  const warnings = [];
  
  if (config.apiKeys.openweather && config.apiKeys.openweather === 'your_api_key_here') {
    warnings.push('OpenWeatherMap API key is using placeholder value');
  }
  
  if (config.apiKeys.agmarknet && config.apiKeys.agmarknet.length < 20) {
    warnings.push('AgMarkNet API key appears to be invalid');
  }
  
  if (config.apiKeys.google && config.apiKeys.google === 'your_google_ai_key_here') {
    warnings.push('Google AI key is using placeholder value');
  }
  
  if (config.apiKeys.openai && config.apiKeys.openai === 'your_openai_api_key_here') {
    warnings.push('OpenAI API key is using placeholder value');
  }
  
  return warnings;
};

const fs = require('fs');
Object.values(config.paths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.warn(`⚠️ Could not create directory ${dir}:`, error.message);
    }
  }
});

module.exports = config;







