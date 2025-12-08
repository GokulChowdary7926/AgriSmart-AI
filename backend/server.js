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

// Import routes
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
// const trainingRoutes = require('./routes/training'); // Temporarily disabled - TrainingController is empty
const agriGPTRoutes = require('./routes/agriGPT');
const emergencyCropsRoutes = require('./routes/emergency_crops');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Import logger
const logger = require('./utils/logger');

class AgriSmartServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIO(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3030',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = process.env.PORT || 5001; // Backend API Port
    
    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketIO();
  }

  async initializeDatabase() {
    try {
      // MongoDB Connection - Make it non-blocking
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrismart';
      mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      }).then(() => {
        logger.info('✅ MongoDB Connected');
      }).catch((err) => {
        logger.warn('⚠️ MongoDB connection failed (continuing without DB):', err.message);
        // Continue without MongoDB - emergency routes will still work
      });

      // PostgreSQL Connection (if needed)
      // const { Pool } = require('pg');
      // this.pgPool = new Pool({
      //   connectionString: process.env.POSTGRES_URL
      // });

      // Redis Connection (non-blocking, optional)
      this.redisClient = null;
      const cache = require('./utils/cache');
      cache.init(null); // Initialize cache without Redis by default
      
      // Try to connect to Redis in background, but don't block startup
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
          
          // Try to connect, but don't wait or throw
          client.connect().catch(() => {
            // Connection failed silently, continue without Redis
            client.quit().catch(() => {});
          });
        } catch (error) {
          // Redis module not available or other error - continue without it
          logger.warn('⚠️ Redis not available, continuing without cache');
        }
      });
    } catch (error) {
      logger.error('❌ Database Connection Error:', error);
      // Don't exit - continue without database connections
      logger.warn('⚠️ Continuing without some database connections');
    }
  }

  initializeMiddlewares() {
    // Security
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

    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3030',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
    }));

    // Compression
    this.app.use(compression());

    // Body Parser
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    // Static Files
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Request Logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    // Language Detection Middleware (should be early but after auth)
    const LanguageMiddleware = require('./middleware/language');
    this.app.use(LanguageMiddleware.detectLanguage);
  }

  initializeRoutes() {
    // Health Check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: this.port
      });
    });

    // API Health Check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: this.port,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      });
    });

    // API Routes
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
    // this.app.use('/api/training', trainingRoutes); // Temporarily disabled

    // 404 Handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Error Handler (must be last)
    this.app.use(errorHandler);
  }

  initializeSocketIO() {
    this.io.on('connection', (socket) => {
      logger.info('Client connected:', socket.id);

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
      
      // Start training scheduler
      try {
        const TrainingScheduler = require('./services/ai/TrainingScheduler');
        TrainingScheduler.start();
        logger.info('✅ Training scheduler started');
      } catch (error) {
        logger.warn('⚠️ Could not start training scheduler:', error.message);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.server.close(() => {
        logger.info('Process terminated');
        mongoose.connection.close();
        if (this.redisClient) {
          this.redisClient.quit();
        }
        process.exit(0);
      });
    });
  }
}

// Start server
if (require.main === module) {
  const server = new AgriSmartServer();
  server.start();
}

module.exports = AgriSmartServer;

