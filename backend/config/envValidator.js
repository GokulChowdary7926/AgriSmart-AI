const validateEnvironment = () => {
  const required = {
    JWT_SECRET: { 
      validate: (val) => val && val !== 'your-secret-key' && val.length >= 32,
      error: 'JWT_SECRET must be set to a secure random string (min 32 chars)'
    },
    NODE_ENV: { 
      validate: (val) => ['development', 'production', 'test'].includes(val),
      error: 'NODE_ENV must be development, production, or test'
    },
    
    OPENWEATHER_API_KEY: {
      validate: (val) => !val || (val.length > 20 && val !== 'your_api_key_here'),
      warning: 'OpenWeatherMap API key is placeholder or invalid'
    },
    PERPLEXITY_API_KEY: {
      validate: (val) => !val || val.startsWith('pplx-'),
      warning: 'Perplexity API key should start with pplx-'
    },
    GOOGLE_AI_KEY: {
      validate: (val) => !val || (val.length > 20 && val !== 'your_google_ai_key_here'),
      warning: 'Google AI key is placeholder or invalid'
    },
    OPENAI_API_KEY: {
      validate: (val) => !val || (val.length > 20 && val !== 'your_openai_api_key_here' && val.startsWith('sk-')),
      warning: 'OpenAI API key is placeholder or invalid format'
    },
    DEEPSEEK_API_KEY: {
      validate: (val) => !val || (val.length > 20 && val !== 'your_deepseek_api_key_here'),
      warning: 'DeepSeek API key is placeholder or invalid'
    }
  };

  const errors = [];
  const warnings = [];

  Object.entries(required).forEach(([key, config]) => {
    const value = process.env[key];
    
    if (config.validate && !config.validate(value)) {
      if (config.error) errors.push(`${key}: ${config.error}`);
      if (config.warning) warnings.push(`${key}: ${config.warning}`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ CRITICAL ENVIRONMENT ERRORS:');
    errors.forEach(err => console.error(`  - ${err}`));
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Production environment requires all critical variables. Exiting.');
      process.exit(1);
    } else {
      console.warn('⚠️ Development mode: Continuing with warnings (some features may not work)');
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️ ENVIRONMENT WARNINGS:');
    warnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

module.exports = { validateEnvironment };






