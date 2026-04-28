require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const pkg = require('./package.json');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cropRoutes = require('./routes/crops');
const diseaseRoutes = require('./routes/diseases');
const weatherRoutes = require('./routes/weather');
const marketRoutes = require('./routes/market');
const chatRoutes = require('./routes/chat');
const chatbotRoutes = require('./routes/chatbot');
const gpsRoutes = require('./routes/gps-services');
const mapRoutes = require('./routes/map');
const analyticsRoutes = require('./routes/analytics');
const agriGPTRoutes = require('./routes/agriGPT');
const emergencyCropsRoutes = require('./routes/emergency_crops');
const realtimeRoutes = require('./routes/realtime');

const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const dataQualityMiddleware = require('./middleware/dataQualityMiddleware');
const { runWithContext } = require('./utils/requestContext');

const logger = require('./utils/logger');

class AgriSmartServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIO(this.server, {
      cors: {
        origin: config.security.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = config.app.port;
    if (this.port === 80 || this.port === 443) {
      this.port = 5001;
    }
    this.redisUnavailableLogged = false;
    
    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketIO();
    if (process.env.NODE_ENV !== 'test') {
      this.initializeServices();
    }
  }

  async initializeServices() {
    try {
      const modelRegistry = require('./services/ModelRegistryService');
      await modelRegistry.initialize();
      
      const pythonService = require('./services/PythonService');
      await pythonService.initialize();
      
      logger.info('Application starting with configuration', {
        env: config.app.env,
        port: config.app.port,
        features: config.features,
        ml: { 
          tensorflowEnabled: config.ml.tensorflowEnabled,
          useGpu: config.ml.useGpu,
          pythonAvailable: pythonService.isAvailable
        }
      });
      logger.info('Startup capabilities', {
        tensorflow: config.ml.tensorflowEnabled ? 'enabled' : 'disabled',
        python: pythonService.isAvailable ? 'available' : 'unavailable',
        redis: this.redisClient ? 'connected' : 'optional/unavailable',
        mqtt: (process.env.MQTT_BROKER || 'localhost') === 'localhost' ? 'optional/local' : 'configured'
      });
      
    } catch (error) {
      logger.error('Failed to initialize services', error);
    }
  }

  async connectMongoDB() {
    const maxRetries = 3;
    let retries = 0;
    const mongoURI = config.database.mongodbUri;
    
    while (retries < maxRetries) {
      try {
        const conn = await mongoose.connect(mongoURI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 10,
          minPoolSize: 5,
          socketTimeoutMS: 45000,
          serverSelectionTimeoutMS: 5000,
          family: 4,
          heartbeatFrequencyMS: 10000,
          retryWrites: true,
          retryReads: true
        });
        
        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        
        try {
          await conn.connection.db.admin().ping();
          logger.info('✅ MongoDB connection verified');
        } catch (pingError) {
          logger.warn('⚠️ MongoDB ping failed, but connection exists');
        }
        
        mongoose.connection.on('error', (err) => {
          logger.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });
        
        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected');
        });
        
        mongoose.connection.on('connected', () => {
          logger.info('MongoDB connection established');
        });
        
        return conn;
      } catch (error) {
        retries++;
        logger.error(`❌ MongoDB connection attempt ${retries} failed:`, error.message);
        
        if (retries === maxRetries) {
          logger.error('❌ FATAL: Could not connect to MongoDB after maximum retries');
          
          if (config.app.env === 'production') {
            logger.error('❌ Production environment requires MongoDB. Exiting.');
            process.exit(1);
          } else {
            logger.warn('⚠️ Development mode: Continuing without MongoDB (features will be limited)');
            return null;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }
  }

  async initializeDatabase() {
    try {
      if (process.env.NODE_ENV === 'test') {
        const cache = require('./utils/cache');
        cache.init(null);
        return;
      }

      await this.connectMongoDB();


      this.redisClient = null;
      const cache = require('./utils/cache');
      cache.init(null);
      
      setImmediate(() => {
        try {
          const redis = require('redis');
          const client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
              connectTimeout: 2000,
              reconnectStrategy: false
            }
          });
          
          let errorLogged = false;
          client.on('error', (_err) => {
            if (!errorLogged) {
              if (!this.redisUnavailableLogged) {
                logger.info('Redis unavailable: optional cache features disabled');
                this.redisUnavailableLogged = true;
              }
              errorLogged = true;
            }
            client.quit().catch(() => {});
          });
          
          client.on('connect', () => {
            logger.info('✅ Redis Connected');
            this.redisClient = client;
            this.app.locals.redis = client;
            cache.init(client);
          });
          
          client.connect().catch(() => {
            client.quit().catch(() => {});
          });
        } catch (error) {
          if (!this.redisUnavailableLogged) {
            logger.info('Redis unavailable: optional cache features disabled');
            this.redisUnavailableLogged = true;
          }
        }
      });
    } catch (error) {
      logger.error('❌ Database Connection Error:', error);
      logger.warn('⚠️ Continuing without some database connections');
    }
  }

  initializeMiddlewares() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3030',
      'http://localhost:5173', // Vite default
      'http://localhost:3000', // React default
      'http://localhost:8080', // Alternative port
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
    ];
    
    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'x-language',
        'Accept-Language',
        'X-App-Language',
        'x-app-language'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
      maxAge: 86400 // 24 hours
    };

    this.app.use(cors(corsOptions));

    this.app.options('*', cors(corsOptions));

    const rateLimit = require('express-rate-limit');
    const isDev = config.app.env === 'development' || process.env.NODE_ENV === 'development';

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isDev ? 2000 : 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      skip: (req) => {
        if (
          req.path === '/health' ||
          req.path === '/api/health' ||
          req.path === '/ready' ||
          req.path === '/api/ready' ||
          req.path === '/diagnostics' ||
          req.path === '/api/diagnostics'
        ) return true;
        if (isDev) return true;
        return false;
      }
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isDev ? 2000 : 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      },
      skip: (_req) => isDev
    });

    this.app.use('/api/', limiter);
    this.app.use('/api/auth/', authLimiter);

    this.app.use(compression());

    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    this.app.use((req, res, next) => {
      const incomingRequestId = req.get('x-request-id');
      const generatedRequestId = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      req.requestId = incomingRequestId || generatedRequestId;
      res.setHeader('x-request-id', req.requestId);
      runWithContext({ requestId: req.requestId }, next);
    });

    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    this.app.use((req, res, next) => {
      const start = Date.now();
      const isDev = config.app.env === 'development' || process.env.NODE_ENV === 'development';
      const verboseHttpLogs = process.env.VERBOSE_HTTP_LOGS === 'true';
      const shouldLogRequest = !isDev || verboseHttpLogs || req.method !== 'GET';
      
      if (shouldLogRequest) {
        const SENSITIVE_BODY_KEYS = ['password', 'pwd', 'pass', 'token', 'refreshToken', 'refresh_token', 'otp', 'apiKey', 'api_key', 'secret'];
        let sanitizedBody;
        if (req.method !== 'GET' && req.method !== 'DELETE' && req.body && Object.keys(req.body).length > 0) {
          sanitizedBody = { ...req.body };
          for (const k of SENSITIVE_BODY_KEYS) {
            if (sanitizedBody[k] !== undefined) sanitizedBody[k] = '[REDACTED]';
          }
        }
        logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
          requestId: req.requestId,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          contentType: req.get('Content-Type'),
          authorization: req.get('Authorization') ? 'Present' : 'Missing',
          body: sanitizedBody
        });
      }
      
      const originalSend = res.send;
      res.send = function(body) {
        const responseTime = Date.now() - start;
        
        const logData = {
          requestId: req.requestId,
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode,
          contentLength: res.get('Content-Length'),
          contentType: res.get('Content-Type')
        };
        
        if (res.statusCode >= 200 && res.statusCode < 300 && (!isDev || verboseHttpLogs || req.method !== 'GET')) {
          logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`, logData);
        } else if (res.statusCode >= 400) {
          logger.error(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`, {
            ...logData,
            error: typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200)
          });
        }
        
        originalSend.call(this, body);
      };
      
      next();
    });

    const securityMiddleware = require('./middleware/security');
    this.app.use(securityMiddleware.security());

    const LanguageMiddleware = require('./middleware/language');
    this.app.use(LanguageMiddleware.detectLanguage);
    const autoTranslateMiddleware = require('./middleware/autoTranslate');
    this.app.use(autoTranslateMiddleware.middleware());

    if (config.features.realtimeAnalytics) {
      this.app.use('/api', dataQualityMiddleware);
    }
  }

  initializeRoutes() {
    const buildDependencyStatus = async () => {
      const mongoReady = mongoose.connection.readyState === 1;
      const redisReady = !!this.redisClient && (this.redisClient.isReady || this.redisClient.isOpen);
      const dependencies = {
        mongodb: { required: true, status: mongoReady ? 'up' : 'down' },
        redis: { required: false, status: redisReady ? 'up' : 'down' }
      };

      try {
        const pythonService = require('./services/PythonService');
        dependencies.python = {
          required: false,
          status: pythonService.isAvailable ? 'up' : 'down'
        };
      } catch (_) {
        dependencies.python = { required: false, status: 'unknown' };
      }

      try {
        const modelRegistry = require('./services/ModelRegistryService');
        const models = await modelRegistry.getAllModels();
        const modelCount = Object.keys(models || {}).length;
        dependencies.modelRegistry = {
          required: false,
          status: modelCount > 0 ? 'up' : 'degraded',
          modelCount
        };
      } catch (_) {
        dependencies.modelRegistry = { required: false, status: 'unknown' };
      }

      const hasRequiredDown = Object.values(dependencies).some((dep) => dep.required && dep.status !== 'up');
      return {
        dependencies,
        ready: !hasRequiredDown
      };
    };

    const buildDiagnosticsPayload = async (requestId) => {
      const dependencyStatus = await buildDependencyStatus();
      return {
        status: dependencyStatus.ready ? 'ready' : 'not_ready',
        requestId,
        timestamp: new Date().toISOString(),
        service: {
          name: pkg.name || 'agri-smart-backend',
          version: pkg.version || '0.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        build: {
          commitSha: process.env.COMMIT_SHA || 'unknown',
          buildId: process.env.BUILD_ID || process.env.GITHUB_RUN_ID || 'local',
          deployedAt: process.env.DEPLOYED_AT || 'unknown'
        },
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid,
          uptimeSeconds: Math.floor(process.uptime()),
          memory: {
            usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
          }
        },
        dependencies: dependencyStatus.dependencies
      };
    };

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: this.port,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
      });
    });

    this.app.get('/api/health', async (req, res) => {
      let cacheStats = {};
      let services = { mongodb: mongoose.connection.readyState === 1 };
      try {
        const { getCacheStats } = require('./middleware/cache');
        if (typeof getCacheStats === 'function') cacheStats = getCacheStats();
      } catch (_) {}
      try {
        const modelRegistry = require('./services/ModelRegistryService');
        const pythonService = require('./services/PythonService');
        const models = await modelRegistry.getAllModels();
        services.redis = !!this.redisClient && (this.redisClient.isReady || this.redisClient.isOpen);
        services.python = pythonService.isAvailable;
        services.pythonVersion = pythonService.pythonVersion;
        services.models = { registered: Object.keys(models).length, available: Object.values(models).filter(m => m.valid !== false).length };
      } catch (_) {}
      res.json({
        status: 'healthy',
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: this.port,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
        },
        cache: cacheStats,
        services,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    this.app.get('/ready', async (req, res) => {
      const dependencyStatus = await buildDependencyStatus();
      const statusCode = dependencyStatus.ready ? 200 : 503;
      return res.status(statusCode).json({
        status: dependencyStatus.ready ? 'ready' : 'not_ready',
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        dependencies: dependencyStatus.dependencies
      });
    });

    this.app.get('/api/ready', async (req, res) => {
      const dependencyStatus = await buildDependencyStatus();
      const statusCode = dependencyStatus.ready ? 200 : 503;
      return res.status(statusCode).json({
        status: dependencyStatus.ready ? 'ready' : 'not_ready',
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        dependencies: dependencyStatus.dependencies
      });
    });

    this.app.get('/diagnostics', async (req, res) => {
      const payload = await buildDiagnosticsPayload(req.requestId);
      const statusCode = payload.status === 'ready' ? 200 : 503;
      return res.status(statusCode).json(payload);
    });

    this.app.get('/api/diagnostics', async (req, res) => {
      const payload = await buildDiagnosticsPayload(req.requestId);
      const statusCode = payload.status === 'ready' ? 200 : 503;
      return res.status(statusCode).json(payload);
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/language', require('./routes/language'));
    this.app.use('/api/users', authenticateToken, userRoutes);
    this.app.use('/api/chatbot', chatbotRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/gps', gpsRoutes);
    this.app.use('/api/map', mapRoutes);
    this.app.use('/api/crops', cropRoutes);
    this.app.use('/api/crops', emergencyCropsRoutes);
    this.app.use('/api/diseases', diseaseRoutes);
    this.app.use('/api/medication', require('./routes/medication'));
    this.app.use('/api/alerts', require('./routes/alerts'));
    this.app.use('/api/weather', weatherRoutes);
    this.app.use('/api/market', marketRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/agri-gpt', agriGPTRoutes);
    this.app.use('/api/government-schemes', require('./routes/governmentSchemes'));
    this.app.use('/api/government', require('./routes/governmentRoutes'));
    this.app.use('/api/iot', require('./routes/iotRoutes'));
    this.app.use('/api/realtime', realtimeRoutes);
    this.app.use('/api/payments', require('./routes/paymentRoutes'));
    this.app.use('/api/messaging', require('./routes/messagingRoutes'));
    this.app.use('/api/monitoring', require('./routes/monitoring'));
    try {
      const dataDrivenRoutes = require('./routes/dataDriven');
      this.app.use('/api/data-driven', dataDrivenRoutes);
      logger.info('✅ Data-driven routes registered at /api/data-driven');
    } catch (error) {
      logger.error('❌ Failed to load data-driven routes:', error);
    }
    try {
      const agriChatRoutes = require('./routes/agriChat');
      this.app.use('/api/agri-chat', agriChatRoutes);
      logger.info('✅ AgriChat routes registered at /api/agri-chat');
    } catch (error) {
      logger.error('❌ Failed to load AgriChat routes:', error);
    }

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Route not found' },
        requestId: req.requestId
      });
    });

    this.app.use(errorHandler);
  }

  initializeSocketIO() {
    const agriChatService = require('./services/agriChatService');
    const Message = require('./models/Message');
    const Conversation = require('./models/Conversation');
    const jwt = require('jsonwebtoken');

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        if (!process.env.JWT_SECRET) {
          return next(new Error('Authentication misconfigured'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.debug('Client connected:', socket.id, 'User:', socket.userId);

      socket.join(`user:${socket.userId}`);

      socket.on('agri-chat:send-message', async (data) => {
        try {
          const { conversationId, recipientId, content, type, attachments, product, location, replyTo } = data;

          if (!content || !content.trim()) {
            return socket.emit('agri-chat:error', { error: 'Message content is required' });
          }

          let finalConversationId = conversationId;
          if (!finalConversationId && recipientId) {
            const conversation = await agriChatService.getOrCreateConversation(socket.userId, recipientId);
            finalConversationId = conversation._id.toString();
          }

          if (!finalConversationId) {
            return socket.emit('agri-chat:error', { error: 'Conversation or recipient required' });
          }

          const conversation = await Conversation.findById(finalConversationId);
          const recipient = conversation.participants.find(p => p.toString() !== socket.userId.toString());
          const finalRecipientId = recipientId || recipient;

          const message = await agriChatService.sendMessage(
            finalConversationId,
            socket.userId,
            finalRecipientId,
            content.trim(),
            type || 'text',
            attachments || [],
            product,
            location,
            replyTo
          );

          await message.populate('sender', 'name email role');
          await message.populate('recipient', 'name email role');

          socket.emit('agri-chat:message-sent', message);

          this.io.to(`user:${finalRecipientId}`).emit('agri-chat:new-message', message);

          const updatedConversation = await Conversation.findById(finalConversationId)
            .populate('participants', 'name email role')
            .populate('lastMessage.sender', 'name');

          this.io.to(`user:${socket.userId}`).emit('agri-chat:conversation-updated', updatedConversation);
          this.io.to(`user:${finalRecipientId}`).emit('agri-chat:conversation-updated', updatedConversation);
        } catch (error) {
          logger.error('Error sending message via socket:', error);
          socket.emit('agri-chat:error', { error: error.message });
        }
      });

      socket.on('agri-chat:typing', async (data) => {
        try {
          const { conversationId, recipientId } = data;
          const recipient = recipientId || (await Conversation.findById(conversationId))?.participants.find(p => p.toString() !== socket.userId.toString());
          if (recipient) {
            this.io.to(`user:${recipient}`).emit('agri-chat:typing', {
              conversationId,
              userId: socket.userId,
              isTyping: true
            });
          }
        } catch (error) {
          logger.error('Error handling typing indicator:', error);
        }
      });

      socket.on('agri-chat:stop-typing', async (data) => {
        try {
          const { conversationId, recipientId } = data;
          const recipient = recipientId || (await Conversation.findById(conversationId))?.participants.find(p => p.toString() !== socket.userId.toString());
          if (recipient) {
            this.io.to(`user:${recipient}`).emit('agri-chat:typing', {
              conversationId,
              userId: socket.userId,
              isTyping: false
            });
          }
        } catch (error) {
          logger.error('Error handling stop typing:', error);
        }
      });

      socket.on('agri-chat:mark-read', async (data) => {
        try {
          const { messageId } = data;
          const message = await Message.findById(messageId);
          if (message && message.recipient.toString() === socket.userId.toString()) {
            await message.markAsRead();
            this.io.to(`user:${message.sender}`).emit('agri-chat:message-read', {
              messageId: message._id,
              readAt: message.readAt
            });
          }
        } catch (error) {
          logger.error('Error marking message as read:', error);
        }
      });

      socket.on('chatbot:message', async (data) => {
        try {
          const ruleBasedChatbot = require('./services/ruleBasedChatbot');
          const chatbotResponse = await ruleBasedChatbot.getResponse(data.message || '');
          const response = {
            success: true,
            response: chatbotResponse?.response || 'Unable to process message right now.',
            confidence: chatbotResponse?.confidence || 0.6,
            intent: chatbotResponse?.intent || 'general_query'
          };
          socket.emit('chatbot:response', response);
        } catch (error) {
          logger.error('Chatbot error:', error);
          socket.emit('chatbot:error', { error: error.message });
        }
      });

      socket.on('disease:detect', async (data) => {
        try {
          const diseaseDetectionService = require('./services/diseaseDetectionService');
          const imageBuffer = Buffer.isBuffer(data?.image)
            ? data.image
            : Buffer.from(data?.image || '', 'base64');
          const result = await diseaseDetectionService.detectDiseaseFromImage(imageBuffer);
          socket.emit('disease:result', result);
        } catch (error) {
          logger.error('Disease detection error:', error);
          socket.emit('disease:error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        logger.debug('Client disconnected:', socket.id);
      });
    });
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`Server started`, {
        port: this.port,
        health: `http://localhost:${this.port}/health`,
        api: `http://localhost:${this.port}/api`
      });
      logger.info(`📡 WebSocket ready for connections`);
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use. Please use a different port.`);
        if (process.env.NODE_ENV !== 'test') {
          process.exit(1);
        }
      } else {
        logger.error('Server error:', error);
      }
    });
  }
}

if (require.main === module) {
  const server = new AgriSmartServer();
  server.start();
}

module.exports = AgriSmartServer;
