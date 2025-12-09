# 🌾 AgriSmart AI - Comprehensive Agricultural Intelligence System

A full-stack agricultural intelligence platform providing real-time crop recommendations, market prices, weather forecasts, disease detection, government scheme recommendations, and peer-to-peer farmer communication.

## 🚀 Features

### 📊 **Market Prices & Analytics**
- **Comprehensive Rice Price Database**: 35+ detailed rice price entries across 20+ Indian states
  - Multiple rice varieties (Basmati, Sona Masoori, Kolam, Ambemohar, etc.)
  - Real-time price tracking with historical trends
  - Quality grades (Premium, Grade A, Export Quality)
  - Market arrival quantities and price ranges
  - State-wise and variety-wise filtering
- **All Daily-Use Commodities**: 70+ agricultural products with real-time prices
- **Price Comparison**: Compare prices across states, dates, and time periods
- **Market Trends**: Visual charts and analytics for price trends
- **Filtering & Search**: Filter by commodity, state, date, quality, and more

### 🌱 **Crop Recommendations**
- **Location-Based Recommendations**: GPS and IP-based location detection
- **Location Search Bar**: Search for cities, states, and districts
- **Soil Type Analysis**: Detailed soil information (type, pH, organic matter, drainage)
- **Weather Integration**: Real-time weather data for crop suitability
- **Detailed Recommendations**: 
  - Reasons for recommendation (expandable accordion)
  - Advantages of each crop
  - Suitability scores
  - Expected yield and market prices
  - Season and duration information

### 🌤️ **Weather Services**
- **Apple Weather-Style UI**: Beautiful, modern weather interface
- **10-Day Forecast**: Extended weather predictions
- **Hourly Forecast**: Detailed hourly weather data
- **Weather Alerts**: Agricultural impact-based alerts
- **Weather Maps**: Visual weather representation
- **Real-time Updates**: Auto-refresh every 5 minutes

### 🏥 **Disease Detection**
- **AI-Powered Detection**: Machine learning-based disease identification
- **Image Upload**: Upload crop images for instant diagnosis
- **Treatment Recommendations**: Detailed treatment and prevention methods
- **Disease Database**: Comprehensive database of common crop diseases

### 💰 **Government Schemes**
- **Real-time API Integration**: Fetch schemes from government APIs
- **Eligibility Checking**: Automatic eligibility verification
- **Recommendation Engine**: Personalized scheme recommendations
- **Detailed Information**: 
  - Eligibility reasons
  - Recommendation reasons
  - Application deadlines
  - Benefits and requirements

### 💬 **AgriChat - Peer-to-Peer Communication**
- **Telegram-Like Interface**: Modern chat UI for farmers
- **Nearby Sellers/Dealers**: Find nearby agricultural suppliers
- **Real-time Messaging**: Socket.IO-based instant messaging
- **User Search**: Search for farmers, experts, sellers, and dealers
- **Conversation Management**: Organize and manage conversations
- **Typing Indicators**: Real-time typing status
- **Read Receipts**: Message read status tracking

### 📈 **Dashboard Analytics**
- **Comprehensive Overview**: All features in one place
- **Market Price Trends**: Top 12 daily-use commodities with price trends
- **Weather Alerts**: Critical weather information
- **Recent Activity**: User activity tracking
- **Quick Actions**: Direct links to all features
- **Real-time Data**: Live updates from all services

### 🎨 **User Interface**
- **Dark Theme**: Consistent dark theme across all pages
- **Responsive Design**: Mobile-friendly interface
- **Multi-language Support**: 10+ Indian languages
- **Modern UI Components**: Material-UI based components
- **Smooth Animations**: Framer Motion animations

## 🛠️ Technology Stack

### Frontend
- **React 18** with Vite
- **Material-UI (MUI)** for UI components
- **React Query** for data fetching
- **React Router** for navigation
- **Socket.IO Client** for real-time communication
- **Recharts** for data visualization
- **Framer Motion** for animations
- **i18next** for internationalization

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Socket.IO** for WebSocket communication
- **JWT** for authentication
- **Axios** for API calls
- **Node-Cache** for caching
- **Winston** for logging

### APIs & Services
- **OpenWeatherMap API** for weather data
- **AgMarkNet API** for market prices
- **Government APIs** for scheme data
- **OpenStreetMap Nominatim** for geocoding
- **Custom ML Models** for crop and disease prediction

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB 6+
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

### Environment Variables

**Backend (.env)**
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/agrismart
JWT_SECRET=your-secret-key
OPENWEATHER_API_KEY=your-api-key
AGMARKNET_API_KEY=your-api-key
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5001/api
```

## 🚀 Quick Start

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

3. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001/api

## 📁 Project Structure

```
agri-smart-ai/
├── backend/
│   ├── controllers/      # Request handlers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── data/             # Static data (rice prices, etc.)
│   ├── middleware/       # Express middleware
│   └── utils/            # Utility functions
├── frontend/
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── services/     # API services
│   │   └── config/      # Configuration
│   └── public/          # Static assets
└── README.md
```

## 🔑 Key Features Details

### Rice Price Database
- **35+ Price Entries**: Comprehensive coverage across all major Indian states
- **Multiple Varieties**: Basmati (1121, PUSA, 1509, Dehradun), Sona Masoori, Kolam, etc.
- **Detailed Information**: Market name, district, quality, price range, arrival quantity
- **Real-time Updates**: Prices updated regularly from AgMarkNet and state mandis
- **Filtering Options**: By state, variety, quality, price range

### Crop Recommendation Engine
- **Location Search**: Search by city, state, or district
- **Soil Analysis**: Automatic soil type detection based on location
- **Weather Integration**: Real-time weather data for recommendations
- **ML-Powered**: Machine learning models for accurate predictions
- **Detailed Insights**: Reasons, advantages, and suitability scores

### Market Price System
- **70+ Commodities**: All daily-use agricultural products
- **State Coverage**: All 36 Indian states and union territories
- **Price Comparison**: Compare prices across different time periods
- **Trend Analysis**: Visual charts for price trends
- **Real-time Updates**: Auto-refresh every 5 minutes

## 🔐 Authentication

- JWT-based authentication
- Role-based access control (farmer, expert, admin, seller, dealer, agent)
- Protected routes
- Session management

## 📱 API Endpoints

### Market Prices
- `GET /api/market/prices` - Get all prices
- `GET /api/market/prices?commodity=Rice` - Get rice prices
- `GET /api/market/prices?state=Maharashtra` - Filter by state
- `GET /api/market/commodities` - Get all commodities

### Crop Recommendations
- `POST /api/crops/recommend` - Get crop recommendations
- `GET /api/crops` - Get all crops
- `GET /api/crops/:id` - Get crop details

### Weather
- `GET /api/weather/forecast` - Get weather forecast
- `GET /api/weather/alerts` - Get weather alerts
- `GET /api/weather/hourly-forecast` - Get hourly forecast

### Government Schemes
- `POST /api/government-schemes/recommend` - Get recommended schemes
- `GET /api/government-schemes` - Get all schemes

### AgriChat
- `GET /api/agri-chat/nearby` - Get nearby sellers/dealers
- `GET /api/agri-chat/search` - Search users
- `GET /api/agri-chat/conversations` - Get conversations
- `POST /api/agri-chat/message` - Send message

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🐛 Troubleshooting

### Backend not starting
- Check MongoDB is running
- Verify environment variables
- Check port 5001 is available

### Frontend connection issues
- Verify `VITE_API_URL` in frontend `.env`
- Check backend is running
- Check CORS settings

### Rice prices not showing
- Verify `backend/data/ricePrices.js` exists
- Check backend logs for errors
- Restart backend server

## 📝 Recent Updates

### December 2024
- ✅ Added comprehensive rice price database (35+ entries across 20+ states)
- ✅ Enhanced crop recommendation with location search and soil analysis
- ✅ Added reasons and advantages to crop recommendations
- ✅ Integrated dashboard market price trends
- ✅ Improved Market page with state filtering and comparison
- ✅ Enhanced Weather page with Apple-style UI
- ✅ Added AgriChat feature for peer-to-peer communication
- ✅ Enforced dark theme across all pages
- ✅ Fixed all bugs and improved error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- AgriSmart AI Development Team

## 🙏 Acknowledgments

- OpenWeatherMap for weather data
- AgMarkNet for market price data
- Government of India APIs for scheme data
- OpenStreetMap for geocoding services

## 📞 Support

For support, email support@agrismart.ai or create an issue in the repository.

---

**Made with ❤️ for Indian Farmers**
