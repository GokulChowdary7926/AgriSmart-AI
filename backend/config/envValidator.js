const validateEnvironment = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isPlaceholder = (val, placeholders = []) => {
    if (!val) return false;
    const normalized = String(val).trim();
    return placeholders.includes(normalized);
  };

  const insecureSecrets = new Set([
    'your-secret-key',
    'your-secret-key-change-in-production',
    'change-me',
    'changeme',
    'secret',
    'jwt-secret',
    'replace-with-secure-random-string-min-32-chars'
  ]);

  const required = {
    JWT_SECRET: {
      validate: (val) => {
        if (!val) return false;
        const v = String(val).trim();
        if (insecureSecrets.has(v)) return false;
        if (v.length < 32) return false;
        return true;
      },
      error: 'JWT_SECRET must be set to a secure random string (min 32 chars, not a placeholder)'
    },
    NODE_ENV: { 
      validate: (val) => ['development', 'production', 'test'].includes(val),
      error: 'NODE_ENV must be development, production, or test'
    },
    MONGODB_URI: {
      validate: (val) => {
        if (!isProduction) return true;
        return !!val && /^mongodb(\+srv)?:\/\//.test(String(val));
      },
      error: 'MONGODB_URI must be a valid mongodb URI in production'
    },
    
    OPENWEATHER_API_KEY: {
      validate: (val) => {
        if (!val || isPlaceholder(val, ['your_api_key_here'])) return true;
        return val.length > 20;
      },
      warning: 'OpenWeatherMap API key is placeholder or invalid'
    },
    PERPLEXITY_API_KEY: {
      validate: (val) => !val || val.startsWith('pplx-'),
      warning: 'Perplexity API key should start with pplx-'
    },
    GOOGLE_AI_KEY: {
      validate: (val) => {
        if (!val || isPlaceholder(val, ['your_google_ai_key_here'])) return true;
        return val.length > 20;
      },
      warning: 'Google AI key is placeholder or invalid'
    },
    OPENAI_API_KEY: {
      validate: (val) => {
        if (!val) return true;
        if (isPlaceholder(val, ['your_openai_api_key_here'])) return !isProduction;
        return val.length > 20 && val.startsWith('sk-');
      },
      warning: 'OpenAI API key is placeholder or invalid format'
    },
    DEEPSEEK_API_KEY: {
      validate: (val) => {
        if (!val) return true;
        if (isPlaceholder(val, ['your_deepseek_api_key_here'])) return !isProduction;
        return val.length > 20;
      },
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
    if (isProduction) {
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










