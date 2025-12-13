# 🌾 AgriSmart AI - Application Overview

## Table of Contents
1. [Project Structure](#project-structure)
2. [Database Models](#database-models)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Services & APIs](#services--apis)
6. [ML Models & AI](#ml-models--ai)
7. [Configuration](#configuration)
8. [Data Flow](#data-flow)
9. [Technology Stack](#technology-stack)

---

## Project Structure

```
agri-smart-ai/
├── backend/                    # Node.js/Express Backend
│   ├── config/                # Configuration files
│   │   ├── index.js           # Main config (API keys, paths, features)
│   │   ├── envValidator.js    # Environment variable validation
│   │   └── languages.js       # Language configuration
│   ├── controllers/          # Request handlers (MVC pattern)
│   │   ├── AuthController.js
│   │   ├── CropController.js
│   │   ├── DiseaseController.js
│   │   ├── WeatherController.js
│   │   ├── MarketController.js
│   │   ├── AgriGPTController.js
│   │   ├── ChatController.js
│   │   └── ...
│   ├── models/               # MongoDB/Mongoose schemas
│   │   ├── User.js
│   │   ├── Crop.js
│   │   ├── Disease.js
│   │   ├── ChatSession.js
│   │   ├── ChatMessage.js
│   │   ├── MarketPrice.js
│   │   ├── WeatherData.js
│   │   └── ...
│   ├── routes/               # Express route definitions
│   │   ├── auth.js
│   │   ├── crops.js
│   │   ├── diseases.js
│   │   ├── weather.js
│   │   ├── market.js
│   │   ├── agriGPT.js
│   │   └── ...
│   ├── services/             # Business logic layer
│   │   ├── CropService.js
│   │   ├── CropRecommendationEngine.js
│   │   ├── LocationAwareCropEngine.js
│   │   ├── diseaseDetectionService.js
│   │   ├── RealTimeDiseaseDetectionService.js
│   │   ├── WeatherService.js
│   │   ├── marketPriceAPIService.js
│   │   ├── agriGPTService.js
│   │   ├── governmentSchemeService.js
│   │   ├── api/              # API utilities
│   │   │   ├── apiErrorHandler.js
│   │   │   ├── circuitBreaker.js
│   │   │   ├── fallbackManager.js
│   │   │   ├── retryManager.js
│   │   │   └── requestBatcher.js
│   │   └── ml/               # ML model services
│   │       ├── CropRecommenderML.js
│   │       └── *.py          # Python ML scripts
│   ├── middleware/           # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── errorHandler.js   # Global error handling
│   │   ├── cache.js          # Response caching
│   │   ├── security.js       # Security headers
│   │   ├── language.js       # Language detection
│   │   └── dataQualityMiddleware.js
│   ├── utils/                # Utility functions
│   │   ├── logger.js         # Winston logger
│   │   ├── cache.js          # Cache utilities
│   │   ├── emailService.js
│   │   └── ...
│   ├── data/                 # Static data files
│   │   ├── crop_data.json
│   │   ├── disease_data.json
│   │   ├── market_prices.json
│   │   ├── soil_data.json
│   │   └── ...
│   ├── scripts/              # Utility scripts
│   └── server.js             # Main server entry point
│
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── CropRecommendation.jsx
│   │   │   ├── Diseases.jsx
│   │   │   ├── Weather.jsx
│   │   │   ├── Market.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── AgriChat.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── AgriMap.jsx
│   │   │   └── ...
│   │   ├── components/        # Reusable components
│   │   │   ├── Layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── common/        # Common components
│   │   │   │   ├── LoadingState.jsx
│   │   │   │   ├── ErrorBoundary.jsx
│   │   │   │   ├── LanguageSwitcher.jsx
│   │   │   │   └── ...
│   │   │   └── disease/       # Disease-specific components
│   │   │       ├── DiseaseDetector.jsx
│   │   │       └── MedicationRecommendations.jsx
│   │   ├── contexts/         # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ChatContext.jsx
│   │   │   ├── LanguageContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── services/         # API service layer
│   │   │   ├── api.js         # Axios instance & interceptors
│   │   │   ├── auth.js
│   │   │   ├── crops.js
│   │   │   ├── diseaseService.js
│   │   │   ├── weather.js
│   │   │   ├── market.js
│   │   │   ├── logger.js
│   │   │   └── healthService.js
│   │   ├── config/           # Frontend configuration
│   │   │   └── languages.js
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── public/               # Static assets
│   │   └── locales/          # i18n translation files
│   │       ├── en/
│   │       ├── hi/
│   │       ├── ta/
│   │       └── ... (10 languages)
│   └── vite.config.js        # Vite configuration
│
├── ml-models/                # Machine Learning Models
│   ├── disease-detection/    # Disease detection models
│   │   ├── train.py
│   │   ├── train_comprehensive.py
│   │   ├── predict.py
│   │   └── trained/         # Trained model files
│   ├── scripts/             # Training scripts
│   │   ├── train_crop_recommendation.py
│   │   ├── train_disease_detection.py
│   │   ├── train_weather_prediction.py
│   │   └── train_market_prediction.py
│   └── requirements.txt
│
└── database/                 # Database schemas
    ├── schema.sql            # SQL schema (if using SQL)
    └── migrations/           # Database migrations
```

---

## Database Models

### MongoDB Collections (Mongoose Models)

#### 1. **User Model** (`User.js`)
- **Purpose**: User accounts and authentication
- **Key Fields**:
  - `name`, `username`, `email`, `phone` (unique, validated)
  - `password` (hashed with bcrypt)
  - `role`: farmer, expert, admin, agent, seller, dealer
  - `farmerProfile`: location, land details, farming experience
  - `preferences`: language, notifications, theme
  - `isActive`, `isVerified`
  - `createdAt`, `updatedAt`
- **Indexes**: `username`, `email`, `phone` (unique)

#### 2. **Crop Model** (`Crop.js`)
- **Purpose**: Crop records and management
- **Key Fields**:
  - `name`, `type`, `variety`, `scientificName`
  - `plantingDate`, `area` (value + unit)
  - `status`: planned, planted, growing, flowering, fruiting, harvested, failed
  - `healthScore`: 0-100
  - `location`: coordinates, address, city, state, district
  - `seasons`: kharif, rabi, zaid, all
  - `expectedYield`: value + unit
  - `createdBy`, `updatedBy` (User references)
- **Indexes**: `createdBy`, `location.coordinates` (2dsphere)

#### 3. **Disease Model** (`Disease.js`)
- **Purpose**: Disease information database
- **Key Fields**:
  - `name`, `scientificName`, `type`, `category`
  - `symptoms`: visual, behavioral, systemic
  - `affectedCrops`: array of crop names
  - `severity`: Very High, High, Medium, Low
  - `treatments`: organic and chemical options
  - `prevention`: preventive measures
  - `images`: URLs
- **Indexes**: `name`, `type`, `category`

#### 4. **ChatSession Model** (`ChatSession.js`)
- **Purpose**: Chat conversation sessions
- **Key Fields**:
  - `userId` (User reference)
  - `sessionId` (unique)
  - `title`, `lastMessage`, `messageCount`
  - `intents`, `tags`: array of strings
  - `language`: default 'en'
  - `location`: lat, lng, address
  - `metadata`: device, browser, platform
- **Indexes**: `userId`, `updatedAt` (compound)

#### 5. **ChatMessage Model** (`ChatMessage.js`)
- **Purpose**: Individual chat messages
- **Key Fields**:
  - `sessionId`, `userId` (User reference)
  - `role`: user, assistant, system
  - `content`: message text
  - `intent`: name, confidence, requirements
  - `data`: mixed type for structured data
  - `suggestions`: array of strings
  - `feedback`: isPositive, comment, ratedAt
  - `metadata`: processingTime, source, tokens
- **Indexes**: `sessionId`, `userId`, `createdAt`

#### 6. **MarketPrice Model** (`MarketPrice.js`)
- **Purpose**: Commodity price tracking
- **Key Fields**:
  - `commodity`, `variety`, `quality`
  - `price`, `unit`, `currency`
  - `market`: name, location (state, district, city)
  - `date`, `source`
  - `trend`: increasing, stable, decreasing
- **Indexes**: `commodity`, `date`, `market.location.state`

#### 7. **WeatherData Model** (`WeatherData.js`)
- **Purpose**: Weather data storage
- **Key Fields**:
  - `location`: coordinates, address
  - `temperature`, `humidity`, `rainfall`, `windSpeed`
  - `pressure`, `uvIndex`
  - `forecast`: array of forecast objects
  - `timestamp`, `source`
- **Indexes**: `location.coordinates` (2dsphere), `timestamp`

#### 8. **Language Model** (`Language.js`)
- **Purpose**: Supported languages configuration
- **Key Fields**:
  - `code`: 2-letter code (EN, HI, TA, etc.)
  - `name`: en, native
  - `direction`: ltr, rtl
  - `script`, `locale`, `flag`, `countryCode`
  - `isActive`
- **Indexes**: `code` (unique)

#### 9. **Translation Model** (`Translation.js`)
- **Purpose**: i18n translation keys
- **Key Fields**:
  - `key`: translation key
  - `module`: common, auth, crops, diseases, etc.
  - `category`: optional category
  - `translations`: object with language codes (en, hi, ta, te, kn, ml, bn, mr, gu, pa)
  - `description`, `variables`
  - `isSystem`: boolean
- **Indexes**: `key`, `module` (compound unique)

#### 10. **Analytics Model** (`Analytics.js`)
- **Purpose**: User analytics and insights
- **Key Fields**:
  - `userId` (User reference)
  - `type`: dashboard, crop, disease, market, weather
  - `data`: mixed type for analytics data
  - `timestamp`, `metadata`
- **Indexes**: `userId`, `type`, `timestamp`

#### 11. **Other Models**
- `Farmer.js`: Extended farmer profile
- `Message.js`: General messaging
- `Conversation.js`: Conversation threads
- `ModelTraining.js`: ML model training records
- `TrainingDataset.js`: Training dataset metadata
- `SchemeApplication.js`: Government scheme applications

---

## Backend Architecture

### Server Architecture (`server.js`)

```
AgriSmartServer Class
├── initializeDatabase()
│   └── MongoDB connection with retry logic
├── initializeMiddlewares()
│   ├── CORS, Helmet, Compression
│   ├── Body parsers (JSON, URL-encoded)
│   ├── Morgan logging
│   ├── Authentication middleware
│   ├── Language detection
│   ├── Cache middleware
│   └── Data quality middleware
├── initializeRoutes()
│   ├── Health check endpoints
│   ├── Auth routes (/api/auth/*)
│   ├── User routes (/api/users/*)
│   ├── Crop routes (/api/crops/*)
│   ├── Disease routes (/api/diseases/*)
│   ├── Weather routes (/api/weather/*)
│   ├── Market routes (/api/market/*)
│   ├── Chat routes (/api/chat/*)
│   ├── AgriGPT routes (/api/agri-gpt/*)
│   └── Analytics routes (/api/analytics/*)
├── initializeSocketIO()
│   └── Real-time communication (Socket.IO)
└── initializeServices()
    ├── ModelRegistryService
    └── PythonService
```

### Controller Layer

**Pattern**: Controllers handle HTTP requests, validate input, call services, return responses

- **AuthController**: Registration, login, JWT token management
- **CropController**: Crop CRUD, recommendations, search
- **DiseaseController**: Disease detection, information retrieval
- **WeatherController**: Current weather, forecasts, recommendations
- **MarketController**: Price queries, trends, comparisons
- **AgriGPTController**: AI chat, intent analysis, responses
- **ChatController**: Chat sessions, message history
- **AnalyticsController**: User analytics, insights

### Service Layer

**Pattern**: Business logic, external API calls, data processing

#### Core Services:
1. **CropRecommendationEngine**: Multi-layered recommendation algorithm
2. **LocationAwareCropEngine**: Location-based crop suggestions
3. **EnhancedCropRecommendationService**: Enhanced recommendations with scoring
4. **RealTimeCropRecommendationService**: Real-time data integration
5. **diseaseDetectionService**: ML-based disease detection
6. **RealTimeDiseaseDetectionService**: Multi-API disease detection
7. **WeatherService**: OpenWeatherMap integration
8. **marketPriceAPIService**: AgMarkNet, Data.gov.in integration
9. **agriGPTService**: AI chat service (Gemini, OpenAI, DeepSeek)
10. **governmentSchemeService**: Government scheme information
11. **TranslationService**: i18n translation management

#### API Management Services:
- **apiErrorHandler**: Centralized error handling
- **circuitBreaker**: Circuit breaker pattern for external APIs
- **fallbackManager**: Fallback strategies
- **retryManager**: Retry logic with exponential backoff
- **requestBatcher**: Request batching for efficiency

### Middleware Layer

1. **auth.js**: JWT token validation, role-based access
2. **errorHandler.js**: Global error handling, error formatting
3. **cache.js**: Response caching (Redis/node-cache)
4. **security.js**: Security headers, rate limiting
5. **language.js**: Language detection from headers/cookies
6. **dataQualityMiddleware.js**: Data quality indicators

---

## Frontend Architecture

### Component Hierarchy

```
App.jsx
├── ErrorBoundary
├── QueryClientProvider (React Query)
├── ThemeProvider
├── LanguageProvider
├── Router (React Router)
│   ├── AuthProvider
│   │   ├── ChatProvider
│   │   │   └── SnackbarProvider
│   │   │       └── Routes
│   │   │           ├── /login → Login
│   │   │           ├── /register → Register
│   │   │           ├── / → Dashboard (Protected)
│   │   │           ├── /crops → Crops (Protected)
│   │   │           ├── /crop-recommendation → CropRecommendation (Protected)
│   │   │           ├── /diseases → Diseases (Protected)
│   │   │           ├── /weather → Weather (Protected)
│   │   │           ├── /market → Market (Protected)
│   │   │           ├── /chat → Chat (Protected)
│   │   │           ├── /agri-chat → AgriChat (Protected)
│   │   │           ├── /analytics → Analytics (Protected)
│   │   │           ├── /agri-map → AgriMap (Protected)
│   │   │           └── /government-schemes → GovernmentSchemes (Protected)
```

### Context Providers

1. **AuthContext**: User authentication state, login/logout
2. **ChatContext**: Chat state, Socket.IO connection
3. **LanguageContext**: i18n language switching, translations
4. **ThemeContext**: Dark/light theme management

### Service Layer (Frontend)

- **api.js**: Axios instance with interceptors, error handling
- **auth.js**: Authentication API calls
- **crops.js**: Crop-related API calls
- **diseaseService.js**: Disease detection API calls
- **weather.js**: Weather API calls
- **market.js**: Market price API calls
- **logger.js**: Frontend logging service
- **healthService.js**: API health monitoring

### Pages

1. **Dashboard**: Overview, quick actions, recent activity
2. **CropRecommendation**: Location-based crop suggestions
3. **Diseases**: Disease information, detection interface
4. **Weather**: Current weather, forecasts, recommendations
5. **Market**: Commodity prices, trends, comparisons
6. **Chat**: AI chat interface with AgriGPT
7. **AgriChat**: Peer-to-peer farmer chat
8. **Analytics**: User analytics, insights, charts
9. **AgriMap**: Interactive map with farms, crops, soil data
10. **GovernmentSchemes**: Scheme information, applications

---

## Services & APIs

### External API Integrations

1. **OpenWeatherMap API**: Weather data, forecasts
2. **AgMarkNet API**: Market prices (Data.gov.in)
3. **Google Gemini AI**: AI chat responses
4. **OpenAI API**: Alternative AI chat
5. **DeepSeek API**: Alternative AI chat
6. **Perplexity AI**: Real-time information
7. **PlantNet API**: Plant identification
8. **Plantix API**: Disease detection
9. **Google Vision API**: Image analysis
10. **Nominatim (OpenStreetMap)**: Geocoding, reverse geocoding

### Internal Services

1. **ModelRegistryService**: ML model loading, validation
2. **PythonService**: Python script execution for ML
3. **LoggerService**: Structured logging (Winston)
4. **ImageProcessor**: Image processing, resizing
5. **IoTService**: IoT sensor data management
6. **MessagingService**: SMS, email notifications
7. **PaymentService**: Payment processing (Razorpay)

---

## ML Models & AI

### Machine Learning Models

#### 1. **Disease Detection Model**
- **Type**: TensorFlow CNN / scikit-learn RandomForest
- **Location**: `ml-models/disease-detection/`
- **Training**: `train_comprehensive.py`, `train.py`
- **Input**: Plant leaf images
- **Output**: Disease class, confidence score
- **Format**: `.joblib`, `.h5`, `.pb`

#### 2. **Crop Recommendation Model**
- **Type**: XGBoost, RandomForest
- **Location**: `backend/services/ml/`
- **Training**: `train_model.py`
- **Input**: Soil data, weather, location
- **Output**: Crop recommendations with scores
- **Scripts**: `predict_crop.py`, `predict_crop_enhanced.py`

#### 3. **Weather Prediction Model**
- **Type**: Time Series (LSTM/ARIMA)
- **Location**: `ml-models/scripts/train_weather_prediction.py`
- **Purpose**: Weather forecasting

#### 4. **Market Price Prediction Model**
- **Type**: Time Series, Regression
- **Location**: `ml-models/scripts/train_market_prediction.py`
- **Purpose**: Price trend prediction

### AI Services

1. **AgriGPT Service**: Multi-provider AI chat (Gemini, OpenAI, DeepSeek)
2. **RealTimeAgriGPTService**: Real-time data-enhanced AI responses
3. **Intent Analysis**: Natural language understanding
4. **Rule-Based Chatbot**: Fallback when AI unavailable

### Model Management

- **ModelRegistryService**: Model loading, versioning, validation
- **PythonService**: Python script execution bridge
- **Model Training**: Scheduled training, version management

---

## Configuration

### Environment Variables

#### Backend (`.env`)
```env
# Server
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3030

# Database
MONGODB_URI=mongodb://localhost:27017/agrismart
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_secret_key_min_32_characters
JWT_EXPIRE=7d

# API Keys
GOOGLE_AI_KEY=your_gemini_api_key
OPENWEATHER_API_KEY=your_openweather_key
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
PERPLEXITY_API_KEY=your_perplexity_key
PLANTNET_API_KEY=your_plantnet_key
PLANTIX_API_KEY=your_plantix_key
GOOGLE_VISION_API_KEY=your_vision_key

# ML
PYTHON_PATH=python3
TF_ENABLED=true
USE_GPU=false
DISEASE_MODEL_VERSION=v1.0
CROP_MODEL_VERSION=v1.0

# Features
FEATURE_REALTIME_ANALYTICS=true
FEATURE_ML_PREDICTIONS=true
FEATURE_EXTERNAL_APIS=true
FEATURE_CACHING=true
```

#### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5001
VITE_WS_URL=ws://localhost:5001
```

### Configuration Files

- **backend/config/index.js**: Centralized configuration
- **backend/config/envValidator.js**: Environment validation
- **frontend/vite.config.js**: Vite build configuration

---

## Data Flow

### Request Flow (Example: Crop Recommendation)

```
1. Frontend (CropRecommendation.jsx)
   ↓
2. API Service (crops.js)
   ↓
3. Axios Interceptor (api.js) - Adds auth token
   ↓
4. Backend Route (routes/crops.js)
   ↓
5. Middleware (auth.js) - Validates JWT
   ↓
6. Controller (CropController.js)
   ↓
7. Service (CropRecommendationEngine.js)
   ├── LocationAwareCropEngine
   ├── RealTimeCropRecommendationService
   │   ├── WeatherService (OpenWeatherMap)
   │   ├── marketPriceAPIService (AgMarkNet)
   │   └── ML Model (PythonService)
   └── EnhancedCropRecommendationService
   ↓
8. Response with recommendations
   ↓
9. Frontend displays results
```

### Real-time Flow (Socket.IO)

```
1. Frontend connects via Socket.IO
   ↓
2. Backend Socket.IO server (server.js)
   ↓
3. ChatContext (Frontend) manages connection
   ↓
4. Real-time messages, notifications
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Cache**: Redis / node-cache
- **Authentication**: JWT (jsonwebtoken)
- **ML**: TensorFlow.js, Python (scikit-learn, XGBoost)
- **Real-time**: Socket.IO
- **Logging**: Winston
- **Validation**: Joi

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context API, React Query
- **Routing**: React Router v6
- **i18n**: i18next, react-i18next
- **Maps**: Leaflet, react-leaflet
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

### ML/AI
- **Python**: 3.8+
- **Libraries**: TensorFlow, scikit-learn, XGBoost, NumPy, Pandas
- **AI APIs**: Google Gemini, OpenAI, DeepSeek, Perplexity

### DevOps
- **Containerization**: Docker, Docker Compose
- **Process Management**: PM2 (optional)
- **Version Control**: Git

---

## Key Features

1. **Multi-language Support**: 10 Indian languages (EN, HI, TA, TE, KN, ML, BN, MR, GU, PA)
2. **Real-time Updates**: Socket.IO for live chat, notifications
3. **Offline Support**: Service workers, caching
4. **Responsive Design**: Mobile-first, works on all devices
5. **Error Handling**: Comprehensive error boundaries, fallbacks
6. **Performance**: Caching, request batching, lazy loading
7. **Security**: JWT auth, rate limiting, input validation
8. **Monitoring**: Health checks, analytics, logging

---

## Development Workflow

1. **Backend Development**:
   ```bash
   cd backend
   npm install
   npm run dev  # Nodemon for auto-reload
   ```

2. **Frontend Development**:
   ```bash
   cd frontend
   npm install
   npm run dev  # Vite dev server
   ```

3. **Database Setup**:
   - Install MongoDB
   - Update `MONGODB_URI` in `.env`
   - Models auto-create collections on first use

4. **ML Model Training**:
   ```bash
   cd ml-models
   python train_comprehensive.py
   ```

---

## Deployment

- **Backend**: Node.js server on port 5001
- **Frontend**: Static files served via Vite build
- **Database**: MongoDB instance
- **Cache**: Redis instance (optional)
- **Container**: Docker Compose for full stack

---

*Last Updated: 2024*
*Version: 1.0.0*
