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
