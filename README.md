# 🌾 AgriSmart AI

A farming assistant platform for Indian farmers to make better decisions about crops, diseases, weather, and market prices.

## Features

- **Crop Recommendations** - Get personalized crop suggestions based on location, soil, and weather
- **Disease Detection** - Upload plant photos to identify diseases and get treatment advice
- **Weather Information** - Current weather data and farming recommendations
- **Market Prices** - Real-time commodity prices and trends
- **Government Schemes** - Information about agricultural schemes
- **Multi-language Support** - Available in 10 Indian languages

## Setup

### Requirements

- Node.js 18+
- npm 9+
- MongoDB

### Installation

1. **Install dependencies:**

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment:**

   Create `backend/.env`:
   ```env
   JWT_SECRET=your_secret_key_min_32_characters
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/agrismart
   GOOGLE_AI_KEY=your_gemini_api_key
   OPENWEATHER_API_KEY=your_openweather_key
   ```

   Get API keys:
   - Google Gemini: https://ai.google.dev/
   - OpenWeatherMap: https://openweathermap.org/api

3. **Start the application:**

   ```bash
   ./START_SERVICES.sh
   ```

   Or manually:
   ```bash
   # Terminal 1
   cd backend && npm start
   
   # Terminal 2
   cd frontend && npm start
   ```

4. **Access:**

   - Frontend: http://localhost:3030
   - Backend: http://localhost:5001

## How It Works

### Crop Recommendations
Enter your location to get crop suggestions based on soil conditions, weather patterns, market demand, and seasonal factors.

### Disease Detection
Upload a photo of a diseased plant. The system identifies the disease, shows confidence level, and provides treatment options.

### Market Prices
View current commodity prices, filter by state and district, see price trends, and compare prices over time.

### Weather
Get current weather data, forecasts, and farming recommendations based on weather conditions.

## Troubleshooting

**Backend won't start:**
- Check if port 5001 is free: `lsof -i :5001`
- Verify MongoDB is running
- Check `.env` file has all required keys

**Frontend won't connect:**
- Ensure backend is running on port 5001
- Check browser console for errors

**Database issues:**
- Ensure MongoDB is installed and running
- Verify `MONGODB_URI` in `.env` is correct

**API errors:**
- Check your API keys are valid
- Look at backend logs in `backend/logs/`

## Development

**Run in development mode:**

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

**Check logs:**

Logs are in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only
- `api.log` - API requests

## Technologies

- **Backend:** Node.js, Express, MongoDB, TensorFlow.js
- **Frontend:** React, Material-UI, Vite

## Notes

- ML models are optional - the app works with rule-based fallbacks
- Never commit `.env` files
- The app includes fallback mechanisms when APIs are unavailable

## Getting Help

If something doesn't work:
1. Check `backend/logs/` for error messages
2. Verify all environment variables are set correctly
3. Make sure MongoDB is running
4. Check that all dependencies are installed

---

Made for Indian farmers
