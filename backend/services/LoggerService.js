const winston = require('winston');
const path = require('path');
const config = require('../config');

class LoggerService {
  constructor() {
    this.logger = null;
    this.initialize();
  }

  initialize() {
    const logDir = config.paths.logs;
    
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    this.logger = winston.createLogger({
      level: config.app.env === 'production' ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: { service: 'agrismart-api' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} ${level}: ${message} ${metaStr}`;
            })
          )
        }),
        
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        
        new winston.transports.File({
          filename: path.join(logDir, 'api.log'),
          level: 'info',
          maxsize: 5242880,
          maxFiles: 5,
        })
      ],
    });

    this.requestLogger = (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('API Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('user-agent'),
          ip: req.ip
        });
      });
      
      next();
    };
  }

  info(message, ...args) {
    if (args.length > 0) {
      this.logger.info(message, { data: args });
    } else {
      this.logger.info(message);
    }
  }

  error(message, error = null, ...args) {
    const meta = {};
    
    if (error instanceof Error) {
      meta.error = {
        message: error.message,
        stack: config.app.env === 'development' ? error.stack : undefined,
        name: error.name
      };
    }
    
    if (args.length > 0) {
      meta.additional = args;
    }
    
    this.logger.error(message, Object.keys(meta).length > 0 ? meta : undefined);
  }

  warn(message, ...args) {
    if (args.length > 0) {
      this.logger.warn(message, { data: args });
    } else {
      this.logger.warn(message);
    }
  }

  debug(message, ...args) {
    if (args.length > 0) {
      this.logger.debug(message, { data: args });
    } else {
      this.logger.debug(message);
    }
  }

  apiCall(service, endpoint, status, duration, meta = {}) {
    this.logger.info('API Call', {
      service,
      endpoint,
      status,
      duration,
      ...meta
    });
  }

  mlPrediction(model, input, output, duration, confidence, meta = {}) {
    this.logger.info('ML Prediction', {
      model,
      input: typeof input === 'object' ? JSON.stringify(input).substring(0, 200) : input,
      output: typeof output === 'object' ? JSON.stringify(output).substring(0, 200) : output,
      duration,
      confidence,
      ...meta
    });
  }
}

const loggerService = new LoggerService();

module.exports = {
  logger: loggerService,
  requestLogger: loggerService.requestLogger.bind(loggerService)
};






