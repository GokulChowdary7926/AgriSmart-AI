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
const config = require('./config');

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
const dataDrivenRoutes = require('./routes/dataDriven');
const realtimeRoutes = require('./routes/realtime');

const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const dataQualityMiddleware = require('./middleware/dataQualityMiddleware');

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
      this.port = 5001; // Override if accidentally set to HTTP/HTTPS ports
    }
    
    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeServices();
  }

  async initializeServices() {
    try {
      const modelRegistry = require('./services/ModelRegistryService');
      await modelRegistry.initialize();
      logger.info('Model registry initialized');
      
      const pythonService = require('./services/PythonService');
      await pythonService.initialize();
      logger.info('Python service initialized');
      
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
      await this.connectMongoDB();


      this.redisClient = null;
      const cache = require('./utils/cache');
      cache.init(null); // Initialize cache without Redis by default
      
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
          client.on('error', (err) => {
            if (!errorLogged) {
              logger.warn('⚠️ Redis not available, continuing without cache');
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
          logger.warn('⚠️ Redis not available, continuing without cache');
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
    
    this.app.use(cors({
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-language', 'Accept-Language'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
      maxAge: 86400 // 24 hours
    }));

    this.app.options('*', cors());

    const rateLimit = require('express-rate-limit');
    
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
      },
      skip: (req) => {
        return req.path === '/health' || req.path === '/api/health';
      }
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // Limit to 20 requests per 15 minutes
      message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/api/', limiter);
    this.app.use('/api/auth/', authLimiter);

    this.app.use(compression());

    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    this.app.use((req, res, next) => {
      const start = Date.now();
      
      logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        authorization: req.get('Authorization') ? 'Present' : 'Missing',
        body: req.method !== 'GET' && req.method !== 'DELETE' ? 
          (req.body && Object.keys(req.body).length > 0 ? 
            { ...req.body, password: req.body.password ? '***' : undefined } : undefined) : undefined
      });
      
      const originalSend = res.send;
      res.send = function(body) {
        const responseTime = Date.now() - start;
        
        const logData = {
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode,
          contentLength: res.get('Content-Length'),
          contentType: res.get('Content-Type')
        };
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
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

    const { cacheMiddleware } = require('./middleware/cache');
    
    
    const securityMiddleware = require('./middleware/security');
    this.app.use(securityMiddleware.security());

    const LanguageMiddleware = require('./middleware/language');
    this.app.use(LanguageMiddleware.detectLanguage);

    if (config.features.realtimeAnalytics) {
      this.app.use('/api', dataQualityMiddleware);
    }
  }

  initializeRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
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
      try {
        const modelRegistry = require('./services/ModelRegistryService');
        const pythonService = require('./services/PythonService');
        const models = await modelRegistry.getAllModels();
        
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          port: this.port,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
          },
          services: {
            mongodb: mongoose.connection.readyState === 1,
            redis: !!this.redisClient && (this.redisClient.isReady || this.redisClient.isOpen),
            python: pythonService.isAvailable,
            pythonVersion: pythonService.pythonVersion,
            models: {
              registered: Object.keys(models).length,
              available: Object.values(models).filter(m => m.valid !== false).length
            }
          },
          features: config.features,
          environment: config.app.env
        };
        
        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'degraded',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.app.get('/api/health', (req, res) => {
      const { getCacheStats } = require('./middleware/cache');
      const cacheStats = getCacheStats();
      
      res.json({
        status: 'healthy',
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
        environment: process.env.NODE_ENV || 'development'
      });
    });

    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/language', require('./routes/language'));
    this.app.use('/api/users', authenticateToken, userRoutes);
    this.app.use('/api/chatbot', chatbotRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/gps', gpsRoutes);
    this.app.use('/api/map', mapRoutes); // Map geocoding and address lookup
    this.app.use('/api/crops', cropRoutes); // Some routes are public
    this.app.use('/api/crops', emergencyCropsRoutes); // Emergency routes (always work)
    this.app.use('/api/diseases', diseaseRoutes); // Some routes are public
    this.app.use('/api/medication', require('./routes/medication')); // Medication recommendations
    this.app.use('/api/alerts', require('./routes/alerts')); // Alerts (weather, disease, market)
    this.app.use('/api/weather', weatherRoutes); // Some routes are public
    this.app.use('/api/market', marketRoutes); // Some routes are public
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/agri-gpt', agriGPTRoutes); // AGRI-GPT routes (some require auth)
    this.app.use('/api/government-schemes', require('./routes/governmentSchemes')); // Government schemes
    this.app.use('/api/government', require('./routes/governmentRoutes')); // Government API routes (PM-KISAN, MSP, etc.)
    this.app.use('/api/iot', require('./routes/iotRoutes')); // IoT sensor routes
    this.app.use('/api/realtime', realtimeRoutes); // Real-time agriculture data
    this.app.use('/api/payments', require('./routes/paymentRoutes')); // Payment gateway routes
    this.app.use('/api/messaging', require('./routes/messagingRoutes')); // Messaging routes (SMS/WhatsApp/Voice)
    this.app.use('/api/monitoring', require('./routes/monitoring')); // API monitoring routes
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
      res.status(404).json({ error: 'Route not found' });
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('Client connected:', socket.id, 'User:', socket.userId);

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
          const AgriChatbotService = require('./services/chat/AgriChatbotService');
          const response = await AgriChatbotService.processMessage(
            data.message,
            data.language || 'en',
            data.userId
          );
          socket.emit('chatbot:response', response);
        } catch (error) {
          logger.error('Chatbot error:', error);
          socket.emit('chatbot:error', { error: error.message });
        }
      });

      socket.on('disease:detect', async (data) => {
        try {
          const CNNPlantDisease = require('./services/ai/DiseaseDetection/CNNPlantDisease');
          const result = await CNNPlantDisease.detectDisease(data.image);
          socket.emit('disease:result', result);
        } catch (error) {
          logger.error('Disease detection error:', error);
          socket.emit('disease:error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected:', socket.id);
      });
    });
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`
╔════════════════════════════════════════╗
║   🌾 Agri-Smart Backend Server        ║
╠════════════════════════════════════════╣
║   Port: ${this.port}                              ║
║   Health: http://localhost:${this.port}/health    ║
║   API: http://localhost:${this.port}/api         ║
╚════════════════════════════════════════╝
      `);
      logger.info(`✅ Server running on port ${this.port}`);
      logger.info(`📡 WebSocket ready for connections`);
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use. Please use a different port.`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
      }
    });
  }
}

const server = new AgriSmartServer();
server.start();

module.exports = server;
