# 🌾 AgriSmart AI

An intelligent farming assistant designed specifically for Indian farmers. Get personalized crop recommendations, identify plant diseases from photos, access real-time weather forecasts, check market prices, and discover government schemes—all in your preferred language.

## What This Platform Does

AgriSmart AI helps farmers make informed decisions by combining artificial intelligence with real-time agricultural data. Whether you're planning what to grow this season, dealing with a plant disease, checking market prices, or looking for government support, this platform provides comprehensive guidance tailored to your location and needs.

## Key Features

### 🌱 Smart Crop Recommendations
Tell us your location, and we'll suggest the best crops to grow based on your soil type, current weather patterns, market demand, and seasonal timing. Our recommendations consider multiple factors including rainfall, temperature, soil pH, and regional farming practices.

### 🔬 Disease Detection
Upload a photo of a diseased plant, and our AI-powered system will identify the problem. You'll get detailed information about the disease, its severity, treatment options (both organic and chemical), and preventive measures. The system works with over 50 common crop diseases.

### 🌤️ Weather Intelligence
Access current weather conditions and forecasts for your area. Get farming recommendations based on weather patterns, including the best times for sowing, irrigation advice, and alerts about adverse conditions.

### 💰 Market Price Tracking
Stay updated with real-time commodity prices across different states and districts. Compare prices, view trends, and make informed decisions about when and where to sell your produce.

### 🏛️ Government Schemes
Discover agricultural schemes and subsidies available to you. Get information about PM-KISAN, crop insurance, loan programs, and other government initiatives that can support your farming journey.

### 🌍 Multi-Language Support
The platform is available in 10 Indian languages, making it accessible to farmers across the country. Switch between languages anytime to get information in your preferred language.

## Getting Started

### What You'll Need

Before you begin, make sure you have:
- **Node.js** version 18 or higher installed
- **npm** version 9 or higher
- **MongoDB** database running on your system

If you don't have these installed, you can download Node.js from [nodejs.org](https://nodejs.org/) and MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community).

### Installation Steps

1. **Clone or download this repository** to your computer.

2. **Install backend dependencies:**
   Open a terminal, navigate to the project folder, and run:
   ```bash
   cd backend
   npm install
   ```
   This will install all the required packages for the backend server.

3. **Install frontend dependencies:**
   In a new terminal window, run:
   ```bash
   cd frontend
   npm install
   ```
   This installs all the packages needed for the web interface.

4. **Set up environment variables:**
   
   Create a file named `.env` inside the `backend` folder with the following content:
   ```env
   JWT_SECRET=your_secret_key_min_32_characters_long
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/agrismart
   GOOGLE_AI_KEY=your_gemini_api_key_here
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   ```
   
   **Important:** Replace the placeholder values with your actual API keys:
   - **JWT_SECRET:** Generate a random string at least 32 characters long (you can use any password generator)
   - **GOOGLE_AI_KEY:** Get this from [Google AI Studio](https://ai.google.dev/)
   - **OPENWEATHER_API_KEY:** Sign up at [OpenWeatherMap](https://openweathermap.org/api) to get a free API key

5. **Start MongoDB:**
   Make sure MongoDB is running on your system. On macOS, you can start it with:
   ```bash
   brew services start mongodb-community
   ```
   On Linux:
   ```bash
   sudo systemctl start mongod
   ```
   On Windows, MongoDB usually runs as a service automatically.

6. **Launch the application:**
   
   You have two options:
   
   **Option A - Using the startup script:**
   ```bash
   ./START_SERVICES.sh
   ```

   **Option B - Manual startup (two terminals):**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm start
   ```

   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm start
   ```

7. **Access the application:**
   Once both servers are running, open your web browser and visit:
   - **Frontend:** http://localhost:3030
   - **Backend API:** http://localhost:5001

## How Each Feature Works

### Crop Recommendations
When you enter your location, the system analyzes multiple data sources including soil databases, weather APIs, market price trends, and seasonal calendars. It then uses machine learning models combined with rule-based logic to suggest crops that are most suitable for your specific conditions. The recommendations include detailed explanations of why each crop is suggested and what factors were considered.

### Disease Detection
Simply upload a photo of a plant showing disease symptoms. Our system uses advanced image recognition technology to analyze the image and match it against a database of known plant diseases. You'll receive information about the disease name, its scientific classification, symptoms, affected plant parts, and comprehensive treatment plans. The system provides both organic and chemical treatment options, with safety guidelines and application instructions.

### Market Prices
The platform fetches real-time commodity prices from government databases and market APIs. You can filter prices by state, district, and commodity type. The system also shows price trends over time, helping you identify the best time to sell your produce.

### Weather Information
Weather data is pulled from reliable meteorological sources and tailored to your location. You'll get current conditions, short-term forecasts, and farming-specific recommendations like optimal sowing times, irrigation schedules, and warnings about adverse weather.

## Troubleshooting Common Issues

### The Backend Server Won't Start

If you see errors when trying to start the backend:

1. **Check if port 5001 is already in use:**
   ```bash
   lsof -i :5001
   ```
   If something is using the port, either stop that application or change the port in `backend/server.js`.

2. **Verify MongoDB is running:**
   ```bash
   mongosh
   ```
   If this command fails, MongoDB isn't running. Start it using the commands mentioned in the installation section.

3. **Check your `.env` file:**
   Make sure all required environment variables are set and don't have any typos. The file should be in the `backend` folder, not the root folder.

### The Frontend Won't Load

If you see "Can't connect to server" in your browser:

1. **Ensure the backend is running:** Check that you see "Server running on port 5001" in your backend terminal.

2. **Check the browser console:** Open developer tools (F12) and look for error messages. These will tell you what's wrong.

3. **Verify the frontend is running:** You should see "Local: http://localhost:3030" in your frontend terminal.

### Database Connection Issues

If you're getting MongoDB connection errors:

1. **Confirm MongoDB is installed and running:**
```bash
   mongosh --eval "db.version()"
   ```
   This should return a version number if MongoDB is working.

2. **Check your connection string:** In your `.env` file, verify that `MONGODB_URI` matches your MongoDB setup. The default is `mongodb://localhost:27017/agrismart`.

3. **Check MongoDB logs:** Look for error messages in MongoDB's log files, usually located in `/var/log/mongodb/` on Linux or in MongoDB's installation directory on other systems.

### API Errors

If features aren't working due to API issues:

1. **Verify your API keys:** Make sure your Google AI and OpenWeatherMap API keys are valid and haven't expired. You can test them directly on their respective websites.

2. **Check API quotas:** Free API keys often have usage limits. If you've exceeded them, you'll need to wait or upgrade your plan.

3. **Review backend logs:** Check the `backend/logs/` folder for detailed error messages. The `error.log` file contains API-related errors.

## Development Mode

If you're working on the code and want to see changes automatically:

**Backend (with auto-reload):**
```bash
cd backend
npm run dev
```

**Frontend (with hot-reload):**
```bash
cd frontend
npm run dev
```

In development mode, the servers will automatically restart when you make code changes, making it easier to test your modifications.

## Understanding the Logs

All application logs are stored in the `backend/logs/` directory:

- **`combined.log`:** Contains all log messages from the application
- **`error.log`:** Only error messages and exceptions
- **`api.log`:** Detailed logs of all API requests and responses

These logs are helpful when debugging issues or understanding how the application is behaving. In production, you can configure log rotation to prevent these files from growing too large.

## Machine Learning Models

The platform uses several machine learning models to provide intelligent recommendations and predictions. These models are trained on agricultural datasets and can be updated or retrained as needed.

### Disease Detection Model

**Type:** Convolutional Neural Network (CNN) using TensorFlow.js  
**Purpose:** Identifies plant diseases from uploaded images

**Architecture:**
- **Input:** 224x224x3 RGB images (preprocessed and normalized)
- **Layers:**
  - Convolutional layers with 32, 64, and 128 filters
  - Batch normalization and max pooling
  - Dropout layers (0.25-0.5) to prevent overfitting
  - Dense layers (512 and 256 neurons)
  - Output layer with softmax activation for multi-class classification
- **Output:** Probability distribution over 50+ disease classes

**Training:**
- Uses comprehensive disease dataset with images of various crop diseases
- Supports both TensorFlow (primary) and scikit-learn Random Forest (fallback)
- Model files stored in `ml-models/disease-detection/trained/`
- Can detect diseases in crops like Rice, Wheat, Maize, Tomato, Potato, Cotton, Sugarcane, Mango, and more

**Usage:**
The model processes uploaded images through preprocessing (resize, normalize), extracts features using CNN layers, and classifies the disease. Results include confidence scores, disease details, and treatment recommendations.

### Crop Recommendation Model

**Type:** XGBoost Classifier (with Random Forest fallback)  
**Purpose:** Suggests optimal crops based on location, soil, and weather conditions

**Features Used:**
- Soil nutrients (Nitrogen, Phosphorus, Potassium)
- Temperature and humidity
- Soil pH level
- Rainfall data
- Location-specific factors (state, district, season)

**Model Details:**
- **Algorithm:** XGBoost with 100 estimators, max depth 6, learning rate 0.1
- **Fallback:** Random Forest Classifier (100 trees, max depth 20)
- **Preprocessing:** StandardScaler for feature normalization, LabelEncoder for crop names
- **Output:** Ranked list of recommended crops with confidence scores

**Training Data:**
- Historical crop data with soil and weather conditions
- Regional farming practices and seasonal patterns
- Market demand and profitability factors

**Location:** Model files in `backend/services/ml/` and `ml-models/scripts/`

### Market Price Prediction Model

**Type:** Time Series Forecasting Model  
**Purpose:** Predicts future commodity prices based on historical trends

**Features:**
- Historical price data
- Seasonal patterns
- Market arrival quantities
- Regional variations
- Government procurement data

**Usage:** Helps farmers decide the best time to sell their produce by predicting price trends.

### Weather Prediction Model

**Type:** Time Series and Regression Model  
**Purpose:** Provides accurate weather forecasts for farming decisions

**Features:**
- Historical weather patterns
- Seasonal variations
- Regional climate data
- Short-term and long-term forecasts

**Integration:** Works with OpenWeatherMap API to provide real-time and forecasted weather data.

### Model Registry System

The application includes a **Model Registry Service** that manages all ML models:

- **Automatic Discovery:** Scans common model directories
- **Validation:** Checks model integrity and file structure
- **Versioning:** Tracks model versions and metadata
- **Fallback Support:** Automatically switches to fallback models if primary models fail
- **Model Types Supported:**
  - TensorFlow.js models (`.json` + weight files)
  - PyTorch models (`.pth`, `.pt` files)
  - XGBoost models (`.joblib`, `.pkl` files)
  - Scikit-learn models (`.joblib`, `.pkl` files)

**Model Storage:**
- Primary location: `ml-models/disease-detection/trained/`
- Registry file: `backend/models/registry.json`
- Models can be loaded dynamically at runtime

### Training Your Own Models

To train or retrain models:

1. **Disease Detection:**
   ```bash
   cd ml-models/disease-detection
   python train_comprehensive.py
   ```

2. **Crop Recommendation:**
   ```bash
   cd ml-models/scripts
   python train_crop_recommendation.py
   ```

3. **Market Prediction:**
   ```bash
   python train_market_prediction.py
   ```

4. **Weather Prediction:**
   ```bash
   python train_weather_prediction.py
   ```

**Requirements:** Python 3.8+, TensorFlow, scikit-learn, XGBoost, pandas, numpy

## Database Structure

The application uses **MongoDB** as its primary database, storing all user data, agricultural information, and application state. The database is designed to be scalable and efficient for handling large amounts of agricultural data.

### Core Collections

#### Users Collection
Stores user accounts and authentication information:

**Schema Fields:**
- `name` - User's full name
- `username` - Unique username (lowercase, alphanumeric)
- `email` - Unique email address
- `phone` - Unique phone number (10 digits, Indian format)
- `password` - Hashed password (bcrypt)
- `role` - User role: 'farmer', 'expert', 'admin', 'agent', 'seller', 'dealer'
- `farmerProfile` - Detailed farmer information:
  - Location (state, district, village, pincode, coordinates)
  - Farm size (in acres/hectares)
  - Soil type and characteristics
  - Irrigation type
  - Crops grown
- `language` - Preferred language (en, hi, te, ta, mr, bn, gu, kn, ml, pa)
- `isVerified` - Email/phone verification status
- `createdAt`, `updatedAt` - Timestamps

**Indexes:** Created on `email`, `username`, `phone` for fast lookups

#### Crops Collection
Comprehensive database of agricultural crops:

**Schema Fields:**
- `name` - Crop name
- `type` - Category: 'cereal', 'vegetable', 'fruit', 'legume', 'tuber', 'cash-crop', 'fodder'
- `variety` - Specific variety name
- `scientificName` - Botanical name
- `plantingDate` - Recommended planting date
- `area` - Area information (value and unit)
- `status` - Growth stage: 'planned', 'planted', 'growing', 'flowering', 'fruiting', 'harvested', 'failed'
- `healthScore` - Health rating (0-100)
- `location` - Geographic information
- `cultivationDetails` - Growing instructions, requirements
- `season` - Suitable seasons: 'kharif', 'rabi', 'zaid'

**Contains:** Information on 75+ crops including Rice, Wheat, Maize, Tomato, Potato, Cotton, Sugarcane, Mango, and many more

#### Diseases Collection
Database of plant diseases and pests:

**Schema Fields:**
- `name` - Disease/pest name
- `crop` - Associated crop
- `type` - 'disease', 'pest', or 'deficiency'
- `symptoms` - Array of symptoms
- `causes` - Root causes
- `organicControl` - Organic treatment methods
- `chemicalControl` - Chemical treatment options
- `prevention` - Preventive measures
- `severity` - 'low', 'medium', 'high', 'critical'
- `images` - Reference images
- `treatmentPlan` - Detailed treatment instructions

**Coverage:** 50+ common crop diseases with comprehensive treatment information

#### Chat Sessions Collection
Stores user chat conversations with the AI assistant:

**Schema Fields:**
- `sessionId` - Unique session identifier
- `userId` - Reference to user
- `title` - Session title (auto-generated from first message)
- `messageCount` - Number of messages
- `lastMessage` - Preview of last message
- `createdAt`, `updatedAt` - Timestamps

#### Chat Messages Collection
Individual messages within chat sessions:

**Schema Fields:**
- `sessionId` - Reference to chat session
- `userId` - Message sender
- `role` - 'user' or 'assistant'
- `content` - Message text
- `intent` - Detected intent (crop_advice, disease_diagnosis, etc.)
- `data` - Additional metadata (disease detection results, crop recommendations, etc.)
- `timestamp` - Message creation time

#### Market Prices Collection
Real-time and historical commodity prices:

**Schema Fields:**
- `crop` - Crop name
- `market` - Market name
- `district` - District name
- `state` - State name
- `minPrice`, `maxPrice`, `modalPrice` - Price range
- `arrivalQuantity` - Quantity arrived at market
- `date` - Price date
- `source` - Data source

**Indexes:** On `crop`, `state`, `district`, `date` for efficient queries

#### Weather Data Collection
Stores weather information and forecasts:

**Schema Fields:**
- `location` - Geographic coordinates and address
- `temperature` - Current temperature
- `humidity` - Humidity percentage
- `rainfall` - Rainfall amount
- `windSpeed` - Wind speed
- `condition` - Weather condition description
- `forecast` - Forecast data (array of future predictions)
- `date` - Date of record
- `source` - Data source

#### Government Schemes Collection
Information about agricultural government schemes:

**Schema Fields:**
- `schemeId` - Unique scheme identifier
- `name` - Scheme name (multi-language)
- `description` - Detailed description
- `benefits` - Benefits provided
- `eligibility` - Eligibility criteria
- `applicationProcess` - How to apply
- `documentsRequired` - Required documents
- `websiteUrl` - Official website
- `helpline` - Contact information
- `status` - 'active' or 'inactive'
- `startDate`, `endDate` - Scheme duration

#### Analytics Collection
User analytics and insights:

**Schema Fields:**
- `userId` - User reference
- `date` - Analytics date
- `metrics` - Various metrics (crops viewed, diseases detected, etc.)
- `insights` - Generated insights
- `recommendations` - Personalized recommendations

### Database Relationships

The database uses MongoDB's document references to establish relationships:

- **Users → Farms → Fields → Crops:** Hierarchical structure for managing user farms
- **Users → Chat Sessions → Chat Messages:** One-to-many relationship for conversations
- **Crops → Diseases:** Many-to-many relationship (crops can have multiple diseases)
- **Users → Disease Detections:** Tracks user's disease detection history
- **Crops → Market Prices:** Links crops to their market prices

### Data Storage Strategy

- **JSON Documents:** Flexible schema allows storing complex nested data
- **Indexes:** Strategic indexes on frequently queried fields for performance
- **Embedded vs Referenced:** 
  - Small, frequently accessed data is embedded (e.g., user profile)
  - Large or shared data is referenced (e.g., crop details, disease information)
- **Timestamps:** Automatic `createdAt` and `updatedAt` fields on most collections

### Database Connection

**Connection String Format:**
```
mongodb://localhost:27017/agrismart
```

**Configuration:**
- Default database name: `agrismart`
- Connection pooling enabled
- Automatic reconnection on connection loss
- Connection timeout: 30 seconds

**Backup Recommendations:**
- Regular MongoDB backups recommended for production
- Use `mongodump` for creating backups
- Store backups securely, especially user data

## Technology Stack

This application is built using modern web technologies:

- **Backend:** Node.js with Express framework for the API server, MongoDB for data storage, and TensorFlow.js for machine learning capabilities
- **Frontend:** React for building the user interface, Material-UI for components, and Vite for fast development and building

The system is designed to be modular and maintainable, with clear separation between the frontend user interface and backend API services.

## Important Notes

- **ML Models are Optional:** The application includes fallback mechanisms, so it will work even if machine learning models aren't available. Rule-based logic ensures core functionality remains available.

- **Never Commit `.env` Files:** Your `.env` file contains sensitive information like API keys. Always keep it in `.gitignore` and never share it publicly.

- **Fallback Mechanisms:** The system is designed to gracefully handle API failures. If an external service is unavailable, the application will use alternative data sources or cached information to continue functioning.

- **Data Privacy:** User data is stored securely, and the application follows best practices for handling sensitive information. Location data is only used for providing relevant recommendations and is not shared with third parties.

## Getting Help

If you encounter issues that aren't covered in the troubleshooting section:

1. **Check the logs first:** The `backend/logs/error.log` file often contains detailed error messages that can point you to the problem.

2. **Verify your setup:** Double-check that all environment variables are correctly set, MongoDB is running, and all dependencies are installed.

3. **Review the installation steps:** Sometimes going back through the installation process reveals missed steps.

4. **Check system requirements:** Ensure your Node.js and npm versions meet the minimum requirements (Node.js 18+, npm 9+).

5. **Test individual components:** Try starting just the backend first, then just the frontend, to isolate where the problem occurs.

## Contributing

This project is designed to help Indian farmers make better agricultural decisions. If you'd like to contribute improvements, bug fixes, or new features, please ensure your code follows the existing patterns and includes appropriate error handling.

---

**Built with care for Indian farmers** 🌾
