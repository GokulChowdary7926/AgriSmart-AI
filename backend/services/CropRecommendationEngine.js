const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Comprehensive Crop Recommendation Engine
 * Uses real agricultural data and ML-like algorithms for crop recommendations
 */
class CropRecommendationEngine {
  constructor() {
    this.cropData = [];
    this.soilData = [];
    this.marketData = [];
    this.diseaseData = [];
    this.dataPath = path.join(__dirname, '../../data');
    
    // Initialize with fallback data
    this.initializeData();
  }

  /**
   * Initialize all datasets
   */
  initializeData() {
    try {
      // Try to load from files
      this.loadCropData();
      this.loadSoilData();
      this.loadMarketData();
      this.loadDiseaseData();
      
      logger.info('✅ Crop Recommendation Engine initialized with data');
    } catch (error) {
      logger.warn('⚠️ Error loading data files, using fallback data:', error.message);
      this.createFallbackData();
    }
  }

  /**
   * Load crop data from CSV or JSON
   */
  loadCropData() {
    const cropDataPath = path.join(this.dataPath, 'crop_data.json');
    
    if (fs.existsSync(cropDataPath)) {
      const data = JSON.parse(fs.readFileSync(cropDataPath, 'utf8'));
      this.cropData = data;
      logger.info(`✅ Loaded ${this.cropData.length} crop records`);
    } else {
      this.createFallbackCropData();
    }
  }

  /**
   * Load soil data
   */
  loadSoilData() {
    const soilDataPath = path.join(this.dataPath, 'soil_data.json');
    
    if (fs.existsSync(soilDataPath)) {
      const data = JSON.parse(fs.readFileSync(soilDataPath, 'utf8'));
      this.soilData = data;
      logger.info(`✅ Loaded ${this.soilData.length} soil records`);
    } else {
      this.createFallbackSoilData();
    }
  }

  /**
   * Load market data
   */
  loadMarketData() {
    const marketDataPath = path.join(this.dataPath, 'market_prices.json');
    
    if (fs.existsSync(marketDataPath)) {
      const data = JSON.parse(fs.readFileSync(marketDataPath, 'utf8'));
      this.marketData = data;
      logger.info(`✅ Loaded ${this.marketData.length} market price records`);
    } else {
      this.createFallbackMarketData();
    }
  }

  /**
   * Load disease data
   */
  loadDiseaseData() {
    const diseaseDataPath = path.join(this.dataPath, 'disease_data.json');
    
    if (fs.existsSync(diseaseDataPath)) {
      const data = JSON.parse(fs.readFileSync(diseaseDataPath, 'utf8'));
      this.diseaseData = data;
      logger.info(`✅ Loaded ${this.diseaseData.length} disease records`);
    } else {
      this.createFallbackDiseaseData();
    }
  }

  /**
   * Create fallback crop data (Indian crops)
   */
  createFallbackCropData() {
    this.cropData = [
      { N: 90, P: 42, K: 43, temperature: 20.8, humidity: 82.0, ph: 6.5, rainfall: 202.9, label: 'rice' },
      { N: 85, P: 58, K: 41, temperature: 21.0, humidity: 80.0, ph: 7.0, rainfall: 110.0, label: 'maize' },
      { N: 80, P: 55, K: 44, temperature: 23.0, humidity: 70.0, ph: 6.8, rainfall: 146.0, label: 'chickpea' },
      { N: 74, P: 35, K: 40, temperature: 24.6, humidity: 65.0, ph: 6.0, rainfall: 100.0, label: 'kidneybeans' },
      { N: 86, P: 52, K: 37, temperature: 25.5, humidity: 90.0, ph: 7.5, rainfall: 250.0, label: 'pigeonpeas' },
      { N: 77, P: 39, K: 47, temperature: 26.8, humidity: 85.0, ph: 6.2, rainfall: 200.0, label: 'mothbeans' },
      { N: 87, P: 51, K: 54, temperature: 27.4, humidity: 95.0, ph: 5.5, rainfall: 300.0, label: 'mungbean' },
      { N: 70, P: 45, K: 50, temperature: 28.5, humidity: 88.0, ph: 7.8, rainfall: 150.0, label: 'blackgram' },
      { N: 82, P: 48, K: 44, temperature: 29.8, humidity: 75.0, ph: 6.9, rainfall: 175.0, label: 'lentil' },
      { N: 88, P: 53, K: 42, temperature: 30.0, humidity: 82.0, ph: 7.2, rainfall: 180.0, label: 'pomegranate' },
      { N: 75, P: 38, K: 39, temperature: 22.4, humidity: 78.0, ph: 6.4, rainfall: 190.0, label: 'banana' },
      { N: 84, P: 46, K: 48, temperature: 21.6, humidity: 80.0, ph: 7.1, rainfall: 210.0, label: 'mango' },
      { N: 95, P: 60, K: 50, temperature: 18.0, humidity: 70.0, ph: 7.0, rainfall: 600.0, label: 'wheat' },
      { N: 92, P: 55, K: 45, temperature: 22.0, humidity: 75.0, ph: 6.8, rainfall: 500.0, label: 'cotton' },
      { N: 100, P: 65, K: 55, temperature: 26.0, humidity: 85.0, ph: 7.2, rainfall: 2000.0, label: 'sugarcane' }
    ];
    logger.info('✅ Created fallback crop data');
  }

  /**
   * Create fallback soil data (Indian states)
   */
  createFallbackSoilData() {
    this.soilData = [
      { state: 'Punjab', district: 'Multiple', soil_type: 'Alluvial', ph_range: '6.5-8.5', organic_carbon: '0.5-0.8' },
      { state: 'Haryana', district: 'Multiple', soil_type: 'Alluvial', ph_range: '7.0-8.5', organic_carbon: '0.4-0.7' },
      { state: 'Uttar Pradesh', district: 'Multiple', soil_type: 'Alluvial', ph_range: '6.5-8.0', organic_carbon: '0.5-0.9' },
      { state: 'Maharashtra', district: 'Multiple', soil_type: 'Black', ph_range: '7.0-8.5', organic_carbon: '0.6-1.0' },
      { state: 'Karnataka', district: 'Multiple', soil_type: 'Red', ph_range: '5.5-7.5', organic_carbon: '0.3-0.6' },
      { state: 'Tamil Nadu', district: 'Multiple', soil_type: 'Red', ph_range: '5.5-7.0', organic_carbon: '0.3-0.5' },
      { state: 'Andhra Pradesh', district: 'Multiple', soil_type: 'Red & Black', ph_range: '6.0-7.5', organic_carbon: '0.4-0.7' },
      { state: 'Gujarat', district: 'Multiple', soil_type: 'Alluvial & Desert', ph_range: '7.5-8.5', organic_carbon: '0.2-0.5' },
      { state: 'Rajasthan', district: 'Multiple', soil_type: 'Desert', ph_range: '7.5-9.0', organic_carbon: '0.1-0.4' },
      { state: 'Madhya Pradesh', district: 'Multiple', soil_type: 'Black', ph_range: '7.0-8.5', organic_carbon: '0.5-0.9' },
      { state: 'West Bengal', district: 'Multiple', soil_type: 'Alluvial', ph_range: '5.5-7.0', organic_carbon: '0.8-1.2' },
      { state: 'Bihar', district: 'Multiple', soil_type: 'Alluvial', ph_range: '6.0-7.5', organic_carbon: '0.7-1.0' },
      { state: 'Odisha', district: 'Multiple', soil_type: 'Red & Laterite', ph_range: '5.0-6.5', organic_carbon: '0.4-0.7' },
      { state: 'Kerala', district: 'Multiple', soil_type: 'Laterite', ph_range: '4.5-6.0', organic_carbon: '1.0-2.0' },
      { state: 'Assam', district: 'Multiple', soil_type: 'Alluvial', ph_range: '5.0-6.5', organic_carbon: '0.9-1.5' }
    ];
    logger.info('✅ Created fallback soil data');
  }

  /**
   * Create fallback market data
   */
  createFallbackMarketData() {
    this.marketData = [
      { commodity: 'Rice', price: 2200, unit: 'Quintal', market: 'Delhi', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Wheat', price: 2100, unit: 'Quintal', market: 'Punjab', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Maize', price: 1800, unit: 'Quintal', market: 'Karnataka', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Cotton', price: 5500, unit: 'Quintal', market: 'Gujarat', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Sugarcane', price: 3200, unit: 'Quintal', market: 'Maharashtra', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Groundnut', price: 5000, unit: 'Quintal', market: 'Andhra Pradesh', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Soybean', price: 3500, unit: 'Quintal', market: 'Madhya Pradesh', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Pulses', price: 4500, unit: 'Quintal', market: 'Rajasthan', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Potato', price: 1500, unit: 'Quintal', market: 'Uttar Pradesh', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Onion', price: 2000, unit: 'Quintal', market: 'Maharashtra', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Tomato', price: 1200, unit: 'Quintal', market: 'Karnataka', date: new Date().toISOString().split('T')[0] },
      { commodity: 'Brinjal', price: 1800, unit: 'Quintal', market: 'Tamil Nadu', date: new Date().toISOString().split('T')[0] }
    ];
    logger.info('✅ Created fallback market data');
  }

  /**
   * Create fallback disease data
   */
  createFallbackDiseaseData() {
    this.diseaseData = [
      { disease_name: 'Leaf Blight', crop_affected: 'Rice', symptoms: 'Yellow-brown spots on leaves', treatment: 'Copper-based fungicide' },
      { disease_name: 'Bacterial Blight', crop_affected: 'Rice', symptoms: 'Water-soaked lesions', treatment: 'Streptomycin spray' },
      { disease_name: 'Blast', crop_affected: 'Rice', symptoms: 'Diamond-shaped lesions', treatment: 'Tricyclazole' },
      { disease_name: 'Brown Spot', crop_affected: 'Rice', symptoms: 'Brown oval spots', treatment: 'Mancozeb' },
      { disease_name: 'Downy Mildew', crop_affected: 'Maize', symptoms: 'White downy growth', treatment: 'Metalaxyl' },
      { disease_name: 'Powdery Mildew', crop_affected: 'Wheat', symptoms: 'White powdery coating', treatment: 'Sulfur dust' },
      { disease_name: 'Rust', crop_affected: 'Wheat', symptoms: 'Orange-red pustules', treatment: 'Propiconazole' },
      { disease_name: 'Smut', crop_affected: 'Sugarcane', symptoms: 'Black spore masses', treatment: 'Carbendazim' },
      { disease_name: 'Wilt', crop_affected: 'Tomato', symptoms: 'Wilting and yellowing', treatment: 'Carbendazim drench' },
      { disease_name: 'Mosaic Virus', crop_affected: 'Tomato', symptoms: 'Mosaic pattern on leaves', treatment: 'No chemical treatment' },
      { disease_name: 'Leaf Curl', crop_affected: 'Cotton', symptoms: 'Curling and twisting', treatment: 'Imidacloprid' },
      { disease_name: 'Anthracnose', crop_affected: 'Mango', symptoms: 'Dark sunken lesions', treatment: 'Copper oxychloride' }
    ];
    logger.info('✅ Created fallback disease data');
  }

  /**
   * Create all fallback data
   */
  createFallbackData() {
    this.createFallbackCropData();
    this.createFallbackSoilData();
    this.createFallbackMarketData();
    this.createFallbackDiseaseData();
  }

  /**
   * Get state from coordinates (approximate for India)
   */
  getStateFromCoords(lat, lon) {
    const statesCoords = {
      'Punjab': { lat: 31.1471, lon: 75.3412 },
      'Haryana': { lat: 29.0588, lon: 76.0856 },
      'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
      'Maharashtra': { lat: 19.7515, lon: 75.7139 },
      'Karnataka': { lat: 15.3173, lon: 75.7139 },
      'Tamil Nadu': { lat: 11.1271, lon: 78.6569 },
      'Andhra Pradesh': { lat: 15.9129, lon: 79.7400 },
      'Gujarat': { lat: 22.2587, lon: 71.1924 },
      'Rajasthan': { lat: 27.0238, lon: 74.2179 },
      'Madhya Pradesh': { lat: 22.9734, lon: 78.6569 },
      'West Bengal': { lat: 22.9868, lon: 87.8550 },
      'Bihar': { lat: 25.0961, lon: 85.3131 },
      'Odisha': { lat: 20.9517, lon: 85.0985 },
      'Kerala': { lat: 10.8505, lon: 76.2711 },
      'Assam': { lat: 26.2006, lon: 92.9376 }
    };

    let minDistance = Infinity;
    let closestState = 'Punjab';

    for (const [state, coords] of Object.entries(statesCoords)) {
      const distance = Math.sqrt(Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestState = state;
      }
    }

    return closestState;
  }

  /**
   * Get soil data for location
   */
  getSoilData(state, district = null) {
    const soilInfo = this.soilData.find(s => 
      s.state.toLowerCase() === state.toLowerCase() ||
      (district && s.district.toLowerCase() === district.toLowerCase())
    );

    if (soilInfo) {
      const [phMin, phMax] = soilInfo.ph_range.split('-').map(parseFloat);
      return {
        soil_type: soilInfo.soil_type,
        ph: parseFloat((phMin + phMax) / 2).toFixed(1),
        ph_range: soilInfo.ph_range,
        organic_carbon: soilInfo.organic_carbon,
        source: 'dataset'
      };
    }

    // Fallback based on state
    const soilByState = {
      'punjab': { type: 'Alluvial', ph: 7.5 },
      'haryana': { type: 'Alluvial', ph: 7.8 },
      'uttar pradesh': { type: 'Alluvial', ph: 7.2 },
      'maharashtra': { type: 'Black', ph: 7.8 },
      'karnataka': { type: 'Red', ph: 6.5 },
      'tamil nadu': { type: 'Red', ph: 6.0 },
      'gujarat': { type: 'Alluvial', ph: 8.0 },
      'rajasthan': { type: 'Desert', ph: 8.5 },
      'madhya pradesh': { type: 'Black', ph: 7.5 },
      'west bengal': { type: 'Alluvial', ph: 6.5 }
    };

    const stateLower = state.toLowerCase();
    if (soilByState[stateLower]) {
      const soilInfo = soilByState[stateLower];
      return {
        soil_type: soilInfo.type,
        ph: soilInfo.ph,
        ph_range: `${soilInfo.ph - 0.5}-${parseFloat(soilInfo.ph) + 0.5}`,
        organic_carbon: '0.5-0.8%',
        source: 'fallback'
      };
    }

    // Default
    return {
      soil_type: 'Alluvial',
      ph: 7.0,
      ph_range: '6.5-7.5',
      organic_carbon: '0.5-0.8%',
      source: 'default'
    };
  }

  /**
   * Get crop recommendations based on conditions
   */
  getCropRecommendations(temperature, humidity, ph, rainfall, soilType) {
    const recommendations = [];

    // Score each crop based on conditions
    for (const crop of this.cropData) {
      let score = 0;
      let reasons = [];

      // Temperature match (weight: 30%)
      const tempDiff = Math.abs(temperature - crop.temperature);
      if (tempDiff <= 5) {
        score += 30;
        reasons.push(`Ideal temperature (${temperature}°C)`);
      } else if (tempDiff <= 10) {
        score += 20;
        reasons.push(`Acceptable temperature (${temperature}°C)`);
      } else {
        score += 10;
      }

      // pH match (weight: 20%)
      const phDiff = Math.abs(ph - crop.ph);
      if (phDiff <= 0.5) {
        score += 20;
        reasons.push(`Optimal pH (${ph})`);
      } else if (phDiff <= 1.0) {
        score += 15;
        reasons.push(`Suitable pH (${ph})`);
      } else {
        score += 10;
      }

      // Rainfall match (weight: 25%)
      const rainDiff = Math.abs(rainfall - crop.rainfall) / crop.rainfall;
      if (rainDiff <= 0.2) {
        score += 25;
        reasons.push(`Adequate rainfall (${rainfall}mm)`);
      } else if (rainDiff <= 0.4) {
        score += 18;
        reasons.push(`Moderate rainfall (${rainfall}mm)`);
      } else {
        score += 12;
      }

      // Humidity match (weight: 15%)
      const humidityDiff = Math.abs(humidity - crop.humidity);
      if (humidityDiff <= 10) {
        score += 15;
      } else if (humidityDiff <= 20) {
        score += 10;
      } else {
        score += 5;
      }

      // Soil type match (weight: 10%)
      const suitableSoils = this.getSuitableSoilsForCrop(crop.label);
      if (suitableSoils.includes(soilType.toLowerCase())) {
        score += 10;
        reasons.push(`Suitable for ${soilType} soil`);
      } else {
        score += 5;
      }

      // Normalize score to 0-100
      score = Math.min(100, Math.round(score));

      if (score >= 50) { // Only recommend crops with score >= 50
        const cropDetails = this.getCropDetails(crop.label);
        recommendations.push({
          crop: crop.label.charAt(0).toUpperCase() + crop.label.slice(1),
          score: score,
          season: cropDetails.season,
          duration: cropDetails.duration,
          yield: cropDetails.yield,
          water_requirements: cropDetails.water,
          reason: reasons.length > 0 ? reasons.join(', ') : 'Suitable for your region',
          market_price: this.getCropPrice(crop.label),
          requirements: {
            temperature: `${crop.temperature}°C`,
            humidity: `${crop.humidity}%`,
            ph: crop.ph,
            rainfall: `${crop.rainfall}mm`,
            soilType: suitableSoils[0] || 'Alluvial'
          }
        });
      }
    }

    // Sort by score and return top 5
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Get suitable soils for crop
   */
  getSuitableSoilsForCrop(cropName) {
    const cropSoilMap = {
      'rice': ['alluvial', 'clayey'],
      'wheat': ['alluvial', 'loamy'],
      'maize': ['alluvial', 'loamy', 'sandy'],
      'cotton': ['black', 'alluvial'],
      'sugarcane': ['alluvial', 'black'],
      'groundnut': ['sandy', 'loamy'],
      'soybean': ['black', 'alluvial'],
      'pulses': ['all types'],
      'chickpea': ['alluvial', 'loamy'],
      'kidneybeans': ['alluvial', 'red'],
      'pigeonpeas': ['alluvial', 'black'],
      'mothbeans': ['sandy', 'loamy'],
      'mungbean': ['alluvial', 'loamy'],
      'blackgram': ['alluvial', 'black'],
      'lentil': ['alluvial', 'loamy']
    };

    return cropSoilMap[cropName.toLowerCase()] || ['alluvial'];
  }

  /**
   * Get crop details
   */
  getCropDetails(cropName) {
    const details = {
      'rice': { season: 'Kharif', duration: '90-150 days', yield: '4-6 tons/ha', water: 'High' },
      'wheat': { season: 'Rabi', duration: '110-120 days', yield: '3-4 tons/ha', water: 'Moderate' },
      'maize': { season: 'Kharif', duration: '90-100 days', yield: '2-3 tons/ha', water: 'Moderate' },
      'cotton': { season: 'Kharif', duration: '150-180 days', yield: '1.5-2.5 tons/ha', water: 'Moderate' },
      'sugarcane': { season: 'Year-round', duration: '12-18 months', yield: '70-100 tons/ha', water: 'High' },
      'groundnut': { season: 'Kharif', duration: '90-110 days', yield: '1.5-2 tons/ha', water: 'Low' },
      'soybean': { season: 'Kharif', duration: '90-110 days', yield: '1.5-2 tons/ha', water: 'Moderate' },
      'pulses': { season: 'Rabi', duration: '90-120 days', yield: '1-1.5 tons/ha', water: 'Low' },
      'chickpea': { season: 'Rabi', duration: '90-110 days', yield: '1-1.5 tons/ha', water: 'Low' },
      'kidneybeans': { season: 'Kharif', duration: '90-100 days', yield: '1-1.5 tons/ha', water: 'Moderate' },
      'pigeonpeas': { season: 'Kharif', duration: '120-150 days', yield: '1-1.5 tons/ha', water: 'Moderate' },
      'mothbeans': { season: 'Kharif', duration: '70-80 days', yield: '0.5-1 ton/ha', water: 'Low' },
      'mungbean': { season: 'Kharif', duration: '60-90 days', yield: '0.5-1 ton/ha', water: 'Moderate' },
      'blackgram': { season: 'Kharif', duration: '90-100 days', yield: '0.8-1.2 tons/ha', water: 'Moderate' },
      'lentil': { season: 'Rabi', duration: '100-110 days', yield: '1-1.2 tons/ha', water: 'Low' },
      'pomegranate': { season: 'Year-round', duration: '5-7 years', yield: '15-20 tons/ha', water: 'Moderate' },
      'banana': { season: 'Year-round', duration: '12-15 months', yield: '30-40 tons/ha', water: 'High' },
      'mango': { season: 'Year-round', duration: '5-8 years', yield: '8-12 tons/ha', water: 'Moderate' }
    };

    return details[cropName.toLowerCase()] || {
      season: 'Varies',
      duration: '90-120 days',
      yield: '2-3 tons/ha',
      water: 'Moderate'
    };
  }

  /**
   * Get crop market price
   */
  getCropPrice(cropName) {
    const cropPrices = {
      'rice': '₹2200-₹2500/Quintal',
      'wheat': '₹2100-₹2300/Quintal',
      'maize': '₹1800-₹2000/Quintal',
      'cotton': '₹5500-₹6000/Quintal',
      'sugarcane': '₹3200-₹3500/Quintal',
      'groundnut': '₹5000-₹5500/Quintal',
      'soybean': '₹3500-₹4000/Quintal',
      'pulses': '₹4500-₹5000/Quintal',
      'chickpea': '₹4500-₹5000/Quintal',
      'kidneybeans': '₹6000-₹7000/Quintal',
      'pigeonpeas': '₹5000-₹5500/Quintal',
      'mothbeans': '₹5000-₹6000/Quintal',
      'mungbean': '₹5000-₹6000/Quintal',
      'blackgram': '₹5000-₹6000/Quintal',
      'lentil': '₹5000-₹6000/Quintal',
      'pomegranate': '₹30000-₹40000/Quintal',
      'banana': '₹1500-₹2000/Quintal',
      'mango': '₹8000-₹12000/Quintal'
    };

    return cropPrices[cropName.toLowerCase()] || '₹2000-₹3000/Quintal';
  }

  /**
   * Get market prices for state
   */
  getMarketPrices(state = null) {
    let prices = this.marketData;

    if (state) {
      prices = prices.filter(p => 
        p.market.toLowerCase().includes(state.toLowerCase())
      );
    }

    if (prices.length === 0) {
      prices = this.marketData.slice(0, 10);
    }

    return prices.map(price => ({
      commodity: price.commodity,
      price: `₹${price.price}/${price.unit}`,
      market: price.market,
      date: price.date
    }));
  }

  /**
   * Get common diseases for state/crop
   */
  getCommonDiseases(state = null, crop = null) {
    let diseases = this.diseaseData;

    if (crop) {
      diseases = diseases.filter(d => 
        d.crop_affected.toLowerCase().includes(crop.toLowerCase())
      );
    }

    // Get crops common in state
    if (state && !crop) {
      const stateCrops = {
        'punjab': ['wheat', 'rice', 'maize'],
        'haryana': ['wheat', 'rice', 'mustard'],
        'uttar pradesh': ['wheat', 'rice', 'sugarcane'],
        'maharashtra': ['cotton', 'sugarcane', 'soybean'],
        'karnataka': ['rice', 'ragi', 'coffee'],
        'tamil nadu': ['rice', 'sugarcane', 'cotton']
      };

      const cropsInState = stateCrops[state.toLowerCase()] || ['wheat', 'rice', 'maize'];
      diseases = diseases.filter(d => 
        cropsInState.some(crop => d.crop_affected.toLowerCase().includes(crop))
      );
    }

    return diseases.slice(0, 5).map(disease => ({
      name: disease.disease_name,
      crop: disease.crop_affected,
      symptoms: disease.symptoms,
      treatment: disease.treatment
    }));
  }

  /**
   * Get complete location data with recommendations
   */
  async getLocationData(latitude, longitude, weatherData = null) {
    try {
      // Get state from coordinates
      const state = this.getStateFromCoords(latitude, longitude);

      // Get soil data
      const soil = this.getSoilData(state);

      // Use provided weather data or fallback
      const weather = weatherData || {
        temperature: 25.0,
        humidity: 65.0,
        rainfall: 800.0,
        conditions: 'Clear',
        source: 'fallback'
      };

      // Get crop recommendations
      const recommendations = this.getCropRecommendations(
        weather.temperature,
        weather.humidity,
        parseFloat(soil.ph),
        weather.rainfall,
        soil.soil_type
      );

      // Get market prices
      const marketPrices = this.getMarketPrices(state);

      // Get common diseases
      const diseases = this.getCommonDiseases(state);

      return {
        success: true,
        location: {
          latitude,
          longitude,
          state,
          district: 'Unknown'
        },
        weather,
        soil,
        recommendations,
        market_prices: marketPrices,
        common_diseases: diseases,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting location data:', error);
      return this.getFallbackData(latitude, longitude);
    }
  }

  /**
   * Get fallback data
   */
  getFallbackData(latitude, longitude) {
    const state = this.getStateFromCoords(latitude, longitude);
    const soil = this.getSoilData(state);

    return {
      success: true,
      location: {
        latitude,
        longitude,
        state,
        district: 'Unknown'
      },
      weather: {
        temperature: 25.0,
        humidity: 65.0,
        rainfall: 800.0,
        conditions: 'Clear',
        source: 'fallback'
      },
      soil,
      recommendations: this.getCropRecommendations(25, 65, 7.0, 800, 'Alluvial'),
      market_prices: this.getMarketPrices(state),
      common_diseases: this.getCommonDiseases(state),
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new CropRecommendationEngine();

