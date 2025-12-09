const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { LocationAwareCropEngine } = require('./LocationAwareCropEngine');

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
      const organicCarbon = soilInfo.organic_carbon || '0.5-0.8%';
      const [orgMin, orgMax] = organicCarbon.split('-').map(s => parseFloat(s.replace('%', '')));
      const organicMatter = orgMin && orgMax ? `${((orgMin + orgMax) / 2 * 1.724).toFixed(1)}%` : '0.8-1.4%';
      
      return {
        soil_type: soilInfo.soil_type,
        soilType: soilInfo.soil_type,
        ph: parseFloat((phMin + phMax) / 2).toFixed(1),
        ph_range: soilInfo.ph_range,
        organic_carbon: organicCarbon,
        organicMatter: organicMatter,
        drainage: this.getDrainageForSoilType(soilInfo.soil_type),
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
        soilType: soilInfo.type,
        ph: soilInfo.ph,
        ph_range: `${soilInfo.ph - 0.5}-${parseFloat(soilInfo.ph) + 0.5}`,
        organic_carbon: '0.5-0.8%',
        organicMatter: '0.8-1.4%',
        drainage: this.getDrainageForSoilType(soilInfo.type),
        source: 'fallback'
      };
    }

    // Default
    return {
      soil_type: 'Alluvial',
      soilType: 'Alluvial',
      ph: 7.0,
      ph_range: '6.5-7.5',
      organic_carbon: '0.5-0.8%',
      organicMatter: '0.8-1.4%',
      drainage: this.getDrainageForSoilType('Alluvial'),
      source: 'default'
    };
  }

  /**
   * Get drainage characteristics for soil type
   */
  getDrainageForSoilType(soilType) {
    const drainageMap = {
      'Alluvial': 'Well-drained to moderately well-drained',
      'Black': 'Moderately well-drained',
      'Red': 'Well-drained',
      'Laterite': 'Well-drained to excessive',
      'Desert': 'Excessive (sandy)',
      'Clayey': 'Poorly drained to moderately well-drained',
      'Loamy': 'Well-drained',
      'Sandy': 'Excessive (well-drained)',
      'Red & Black': 'Moderately well-drained',
      'Red & Laterite': 'Well-drained'
    };

    return drainageMap[soilType] || 'Moderately well-drained';
  }

  /**
   * Multi-layered Crop Recommendation System
   * Layer 1: Location & Season Filtering
   * Layer 2: Soil & Weather Suitability Scoring
   * Layer 3: Economic & Practicality Analysis
   */
  getCropRecommendations(temperature, humidity, ph, rainfall, soilType, state = null, season = null) {
    try {
    const recommendations = [];
      const currentSeason = season || this.getCurrentSeasonForLocation(state || 'Punjab');
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;

      // Ensure we have valid crop data
      if (!this.cropData || this.cropData.length === 0) {
        logger.warn('No crop data available, using fallback');
        this.createFallbackCropData();
      }

      // Layer 1: Location & Season Filtering
      // Get crops suitable for current season and region
      const seasonCrops = this.getCropsForSeason(currentSeason, state);

    // Score each crop using multi-layered approach
    for (const crop of this.cropData) {
      const cropName = crop.label.charAt(0).toUpperCase() + crop.label.slice(1);
      
      // Skip if crop not suitable for current season (unless season is "Year-round" or "All")
      const cropDetails = this.getCropDetails(crop.label);
      if (cropDetails.season !== 'Year-round' && cropDetails.season !== 'All' && 
          seasonCrops.length > 0 && !seasonCrops.includes(cropName.toLowerCase())) {
        continue; // Skip crops not suitable for current season
      }

      // Layer 2: Soil & Weather Suitability Scoring
      const suitabilityScores = this.calculateSuitabilityScores(
        crop, temperature, humidity, ph, rainfall, soilType
      );

      // Layer 3: Economic & Practicality Analysis
      const economicAnalysis = this.calculateEconomicAnalysis(
        crop.label, cropDetails, state
      );

      // Calculate Risk Factor
      const riskScore = this.calculateRiskScore(crop, cropDetails, temperature, rainfall);

      // Total Score Calculation
      const totalScore = Math.min(100, Math.round(
        suitabilityScores.soilScore + 
        suitabilityScores.weatherScore + 
        economicAnalysis.economicScore + 
        riskScore
      ));

      // Only recommend crops with score >= 50
      if (totalScore >= 50) {
        const suitableSoils = this.getSuitableSoilsForCrop(crop.label);
        const advantages = this.getCropAdvantages(crop.label);
        
        // Generate detailed reasons
        const reasons = this.generateDetailedReasons(
          suitabilityScores, economicAnalysis, riskScore, 
          ph, soilType, temperature, rainfall, cropDetails.season, state
        );

        recommendations.push({
          crop: cropName,
          name: cropName,
          score: totalScore,
          suitabilityScore: totalScore,
          season: cropDetails.season,
          duration: cropDetails.duration,
          yield: cropDetails.yield,
          expectedYield: cropDetails.yield,
          water_requirements: cropDetails.water,
          reason: reasons.summary,
          reasons: reasons.detailed,
          advantages: advantages,
          market_price: economicAnalysis.marketPrice,
          marketPrice: economicAnalysis.marketPrice,
          currentMarketPrice: economicAnalysis.currentMarketPrice,
          priceTrend: economicAnalysis.priceTrend,
          potentialRevenue: economicAnalysis.potentialRevenue,
          profitMargin: economicAnalysis.profitMargin,
          scoringBreakdown: {
            soilCompatibility: {
              score: suitabilityScores.soilScore,
              maxScore: 25,
              description: `Your pH: ${ph}, Soil Type: ${soilType}`,
              details: suitabilityScores.soilDetails
            },
            weatherAlignment: {
              score: suitabilityScores.weatherScore,
              maxScore: 30,
              description: `Forecast: ${temperature}°C, ${rainfall}mm rainfall`,
              details: suitabilityScores.weatherDetails
            },
            economicViability: {
              score: economicAnalysis.economicScore,
              maxScore: 25,
              description: `Good profit margin with ${economicAnalysis.priceTrend} prices`,
              details: economicAnalysis.economicDetails
            },
            riskFactor: {
              score: riskScore,
              maxScore: 20,
              description: riskScore >= 15 ? 'Low risk' : riskScore >= 10 ? 'Moderate risk' : 'Higher risk',
              details: this.getRiskDetails(crop, cropDetails, temperature, rainfall)
            },
            total: totalScore
          },
          requirements: {
            temperature: `${crop.temperature}°C`,
            humidity: `${crop.humidity}%`,
            ph: crop.ph,
            rainfall: `${crop.rainfall}mm`,
            soilType: suitableSoils[0] || 'Alluvial'
          },
          plantingWindow: this.getPlantingWindow(cropDetails.season, month, state)
        });
      }
    }

      // Sort by total score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Return top 10 instead of 5 for better options
    } catch (error) {
      logger.error('Error in getCropRecommendations:', error);
      // Return fallback recommendations
      return this.getFallbackRecommendations(temperature, humidity, ph, rainfall, soilType);
    }
  }

  /**
   * Get fallback recommendations when main algorithm fails
   */
  getFallbackRecommendations(temperature, humidity, ph, rainfall, soilType) {
    const fallbackCrops = [
      { crop: 'Rice', score: 75, season: 'Kharif', duration: '120-150 days', yield: '4-6 tons/ha', advantages: ['Staple food', 'High demand'] },
      { crop: 'Wheat', score: 70, season: 'Rabi', duration: '110-120 days', yield: '3-4 tons/ha', advantages: ['High protein', 'Good storage'] },
      { crop: 'Maize', score: 65, season: 'Kharif', duration: '90-100 days', yield: '2-3 tons/ha', advantages: ['Fast growing', 'Multiple uses'] }
    ];

    return fallbackCrops.map((crop, index) => ({
      crop: crop.crop,
      name: crop.crop,
      score: crop.score,
      suitabilityScore: crop.score,
      season: crop.season,
      duration: crop.duration,
      yield: crop.yield,
      expectedYield: crop.yield,
      advantages: crop.advantages,
      marketPrice: '₹2000-₹4000/ton',
      reason: 'Fallback recommendation based on general suitability',
      reasons: ['Suitable for your region']
    }));
  }

  /**
   * Layer 2: Calculate Soil & Weather Suitability Scores
   */
  calculateSuitabilityScores(crop, temperature, humidity, ph, rainfall, soilType) {
    let soilScore = 0;
    let weatherScore = 0;
    const soilDetails = [];
    const weatherDetails = [];

    // Soil Compatibility Scoring (25 points max)
    const suitableSoils = this.getSuitableSoilsForCrop(crop.label);
    const soilMatch = suitableSoils.includes(soilType.toLowerCase());
    
    if (soilMatch) {
      soilScore += 15; // Soil type match
      soilDetails.push(`Ideal soil type (${soilType})`);
      } else {
      soilScore += 5;
      soilDetails.push(`Acceptable soil type (${soilType})`);
      }

    // pH match (10 points)
      const phDiff = Math.abs(ph - crop.ph);
      if (phDiff <= 0.5) {
      soilScore += 10;
      soilDetails.push(`Optimal pH (Your pH: ${ph}, Required: ${crop.ph})`);
      } else if (phDiff <= 1.0) {
      soilScore += 7;
      soilDetails.push(`Suitable pH (Your pH: ${ph}, Required: ${crop.ph})`);
      } else {
      soilScore += 3;
      soilDetails.push(`Acceptable pH (Your pH: ${ph}, Required: ${crop.ph})`);
    }

    // Weather Alignment Scoring (30 points max)
    // Temperature match (15 points)
    const tempDiff = Math.abs(temperature - crop.temperature);
    if (tempDiff <= 5) {
      weatherScore += 15;
      weatherDetails.push(`Ideal temperature (${temperature}°C, Required: ${crop.temperature}°C)`);
    } else if (tempDiff <= 10) {
      weatherScore += 10;
      weatherDetails.push(`Acceptable temperature (${temperature}°C, Required: ${crop.temperature}°C)`);
    } else {
      weatherScore += 5;
      weatherDetails.push(`Moderate temperature match (${temperature}°C, Required: ${crop.temperature}°C)`);
    }

    // Rainfall match (10 points)
      const rainDiff = Math.abs(rainfall - crop.rainfall) / crop.rainfall;
      if (rainDiff <= 0.2) {
      weatherScore += 10;
      weatherDetails.push(`Adequate rainfall (${rainfall}mm, Required: ${crop.rainfall}mm)`);
      } else if (rainDiff <= 0.4) {
      weatherScore += 7;
      weatherDetails.push(`Moderate rainfall (${rainfall}mm, Required: ${crop.rainfall}mm)`);
      } else {
      weatherScore += 4;
      weatherDetails.push(`Acceptable rainfall (${rainfall}mm, Required: ${crop.rainfall}mm)`);
      }

    // Humidity match (5 points)
      const humidityDiff = Math.abs(humidity - crop.humidity);
      if (humidityDiff <= 10) {
      weatherScore += 5;
      weatherDetails.push(`Ideal humidity (${humidity}%)`);
      } else if (humidityDiff <= 20) {
      weatherScore += 3;
      weatherDetails.push(`Acceptable humidity (${humidity}%)`);
      } else {
      weatherScore += 1;
    }

    return {
      soilScore: Math.min(25, Math.round(soilScore)),
      weatherScore: Math.min(30, Math.round(weatherScore)),
      soilDetails,
      weatherDetails
    };
  }

  /**
   * Layer 3: Calculate Economic & Practicality Analysis
   */
  calculateEconomicAnalysis(cropName, cropDetails, state) {
    const marketPrice = this.getCropPrice(cropName);
    const priceRange = this.extractPriceRange(marketPrice);
    const yieldRange = this.extractYieldRange(cropDetails.yield);
    
    // Calculate potential revenue (per hectare)
    const minRevenue = (yieldRange.min * priceRange.min) / 10; // Convert quintal to ton if needed
    const maxRevenue = (yieldRange.max * priceRange.max) / 10;
    
    // Estimate profit margin (assuming 30-40% profit after costs)
    const minProfit = minRevenue * 0.30;
    const maxProfit = maxRevenue * 0.40;
    
    // Price trend (simulated - in production, use real market data)
    const priceTrend = this.getPriceTrend(cropName);
    
    // Economic score (25 points max)
    let economicScore = 15; // Base score
    if (priceTrend === 'increasing') economicScore += 5;
    if (priceTrend === 'stable') economicScore += 3;
    if (minRevenue > 50000) economicScore += 5; // High value crop bonus

    const economicDetails = [
      `Current market price: ${marketPrice}`,
      `Price trend: ${priceTrend}`,
      `Potential revenue: ₹${Math.round(minRevenue/1000)}k - ₹${Math.round(maxRevenue/1000)}k per hectare`,
      `Estimated profit margin: 30-40%`
    ];

    return {
      marketPrice,
      currentMarketPrice: priceRange.avg,
      priceTrend,
      potentialRevenue: {
        min: Math.round(minRevenue),
        max: Math.round(maxRevenue),
        avg: Math.round((minRevenue + maxRevenue) / 2)
      },
      profitMargin: {
        min: Math.round(minProfit),
        max: Math.round(maxProfit),
        percentage: '30-40%'
      },
      economicScore: Math.min(25, Math.round(economicScore)),
      economicDetails
    };
  }

  /**
   * Calculate Risk Factor Score
   */
  calculateRiskScore(crop, cropDetails, temperature, rainfall) {
    let riskScore = 15; // Base score (low risk)
    const duration = this.parseDuration(cropDetails.duration);
    
    // Short duration crops have lower risk
    if (duration <= 90) {
      riskScore += 5; // Low risk
    } else if (duration <= 150) {
      riskScore += 2; // Moderate risk
      } else {
      riskScore -= 2; // Higher risk for long duration
    }

    // Weather risk assessment
    const tempRisk = Math.abs(temperature - crop.temperature) > 10 ? -3 : 0;
    const rainRisk = Math.abs(rainfall - crop.rainfall) / crop.rainfall > 0.5 ? -3 : 0;
    
    riskScore += tempRisk + rainRisk;
    
    return Math.max(0, Math.min(20, Math.round(riskScore)));
  }

  /**
   * Generate detailed reasons for recommendation
   */
  generateDetailedReasons(suitabilityScores, economicAnalysis, riskScore, 
                          ph, soilType, temperature, rainfall, season, state) {
    const detailed = [];
    const summary = [];

    // Soil compatibility
    detailed.push({
      category: 'Soil Compatibility',
      score: `${suitabilityScores.soilScore}/25`,
      description: `Your pH: ${ph}, Soil Type: ${soilType}`,
      details: suitabilityScores.soilDetails
    });
    summary.push(`Soil compatibility: ${suitabilityScores.soilScore}/25`);

    // Weather alignment
    detailed.push({
      category: 'Weather Alignment',
      score: `${suitabilityScores.weatherScore}/30`,
      description: `Forecast: ${temperature}°C, ${rainfall}mm rainfall`,
      details: suitabilityScores.weatherDetails
    });
    summary.push(`Weather alignment: ${suitabilityScores.weatherScore}/30`);

    // Economic viability
    detailed.push({
      category: 'Economic Viability',
      score: `${economicAnalysis.economicScore}/25`,
      description: `Good profit margin with ${economicAnalysis.priceTrend} prices`,
      details: economicAnalysis.economicDetails
    });
    summary.push(`Economic viability: ${economicAnalysis.economicScore}/25`);

    // Risk factor
    detailed.push({
      category: 'Risk Factor',
      score: `${riskScore}/20`,
      description: riskScore >= 15 ? 'Low risk' : riskScore >= 10 ? 'Moderate risk' : 'Higher risk',
      details: this.getRiskDetails(null, null, temperature, rainfall)
    });
    summary.push(`Risk factor: ${riskScore}/20`);

    return {
      summary: summary.join(', '),
      detailed
    };
  }

  /**
   * Helper methods
   */
  getCurrentSeasonForLocation(state) {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 3) return 'Rabi';
    return 'Zaid';
  }

  getCropsForSeason(season, state) {
    // Return crops suitable for the season
    const seasonCrops = {
      'Kharif': ['rice', 'maize', 'cotton', 'sugarcane', 'groundnut', 'soybean', 'pulses'],
      'Rabi': ['wheat', 'barley', 'potato', 'chickpea', 'lentil', 'mustard'],
      'Zaid': ['watermelon', 'cucumber', 'vegetables']
    };
    return seasonCrops[season] || [];
  }

  extractPriceRange(priceString) {
    const match = priceString.match(/₹(\d+)-₹(\d+)/);
    if (match) {
      return {
        min: parseInt(match[1]),
        max: parseInt(match[2]),
        avg: Math.round((parseInt(match[1]) + parseInt(match[2])) / 2)
      };
    }
    return { min: 2000, max: 3000, avg: 2500 };
  }

  extractYieldRange(yieldString) {
    const match = yieldString.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (match) {
      return {
        min: parseFloat(match[1]),
        max: parseFloat(match[2])
      };
    }
    return { min: 2, max: 3 };
  }

  getPriceTrend(cropName) {
    // Simulated - in production, use real market data
    const trends = ['increasing', 'stable', 'decreasing'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  parseDuration(durationString) {
    const match = durationString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 90;
  }

  getRiskDetails(crop, cropDetails, temperature, rainfall) {
    const details = [];
    if (cropDetails) {
      const duration = this.parseDuration(cropDetails.duration);
      if (duration <= 90) {
        details.push('Short duration reduces exposure to weather risks');
      } else if (duration <= 150) {
        details.push('Moderate duration with manageable risk');
      } else {
        details.push('Long duration increases weather risk exposure');
      }
    }
    details.push('Disease pressure forecast as low');
    return details;
  }

  getPlantingWindow(season, currentMonth, state) {
    const windows = {
      'Kharif': 'June - July (sowing)',
      'Rabi': 'October - November (sowing)',
      'Zaid': 'March - April (sowing)',
      'Year-round': 'Any time of year',
      'All': 'Season-dependent'
    };
    return windows[season] || 'Check local agricultural calendar';
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
   * Get crop advantages
   */
  getCropAdvantages(cropName) {
    const advantagesMap = {
      'rice': [
        'High nutritional value and staple food',
        'Good market demand throughout the year',
        'Multiple varieties available for different seasons',
        'Can be grown in both irrigated and rainfed conditions',
        'High yield potential with proper management'
      ],
      'wheat': [
        'High protein content and nutritional value',
        'Stable market prices and good demand',
        'Suitable for Rabi season cultivation',
        'Multiple uses (flour, bread, pasta)',
        'Good storage life'
      ],
      'maize': [
        'Fast growing crop (90-100 days)',
        'High yield potential',
        'Multiple uses (food, feed, industrial)',
        'Good market demand',
        'Drought tolerant varieties available'
      ],
      'cotton': [
        'High economic value',
        'Good export potential',
        'Long shelf life',
        'Multiple uses (textile, oil)',
        'Government support schemes available'
      ],
      'sugarcane': [
        'Very high yield (70-100 tons/ha)',
        'Year-round income potential',
        'Multiple products (sugar, jaggery, ethanol)',
        'Good market stability',
        'Long-term crop with multiple harvests'
      ],
      'groundnut': [
        'High oil content and nutritional value',
        'Good market price',
        'Short duration crop',
        'Improves soil fertility (nitrogen fixing)',
        'Multiple uses (oil, food, feed)'
      ],
      'soybean': [
        'High protein content',
        'Excellent market demand',
        'Improves soil fertility',
        'Multiple uses (food, oil, feed)',
        'Good export potential'
      ],
      'pulses': [
        'High protein content',
        'Improves soil fertility',
        'Short duration crop',
        'Good market demand',
        'Low water requirement'
      ],
      'chickpea': [
        'High protein and nutritional value',
        'Good market price',
        'Improves soil fertility',
        'Drought tolerant',
        'Multiple culinary uses'
      ],
      'kidneybeans': [
        'High protein content',
        'Good market demand',
        'Short duration crop',
        'Improves soil fertility',
        'Export potential'
      ],
      'pigeonpeas': [
        'High protein content',
        'Drought tolerant',
        'Improves soil fertility',
        'Good market price',
        'Multiple uses'
      ],
      'mothbeans': [
        'Very short duration (70-80 days)',
        'Drought tolerant',
        'Improves soil fertility',
        'Low water requirement',
        'Good for intercropping'
      ],
      'mungbean': [
        'Very short duration (60-90 days)',
        'High protein content',
        'Improves soil fertility',
        'Good market demand',
        'Multiple harvests possible'
      ],
      'blackgram': [
        'High protein content',
        'Short duration crop',
        'Improves soil fertility',
        'Good market price',
        'Drought tolerant'
      ],
      'lentil': [
        'High protein and nutritional value',
        'Good market demand',
        'Short duration crop',
        'Improves soil fertility',
        'Low water requirement'
      ],
      'pomegranate': [
        'High market value',
        'Year-round income potential',
        'Long shelf life',
        'Export potential',
        'Multiple health benefits'
      ],
      'banana': [
        'Year-round cultivation possible',
        'High yield potential',
        'Good market demand',
        'Multiple varieties available',
        'Quick returns'
      ],
      'mango': [
        'High market value',
        'Export potential',
        'Year-round income (with multiple varieties)',
        'Long shelf life',
        'Multiple uses (fresh, processed)'
      ]
    };

    return advantagesMap[cropName.toLowerCase()] || [
      'Suitable for your region',
      'Good market demand',
      'Stable prices',
      'Easy to cultivate',
      'Multiple benefits'
    ];
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
   * Get complete location data with recommendations (enhanced with location-aware engine)
   */
  async getLocationData(latitude, longitude, weatherData = null, state = null, region = null, country = 'India') {
    try {
      // Get state from coordinates if not provided
      if (!state) {
        state = this.getStateFromCoords(latitude, longitude);
      }

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

      // Try location-aware recommendations first
      let recommendations = [];
      if (this.locationAwareEngine) {
        try {
          // Analyze location context
          const locationContext = this.locationAwareEngine.analyzeLocation(
            latitude, longitude, state, region || state, country
          );

          // Get location-specific recommendations
          recommendations = this.locationAwareEngine.generateRecommendations(
            locationContext,
            soil,
            weather,
            null // marketData would be passed here
          );

          logger.info(`✅ Location-aware engine returned ${recommendations.length} recommendations for ${locationContext.region || state || 'unknown'}`);
        } catch (locationError) {
          logger.warn('Location-aware engine failed, using fallback:', locationError.message);
          // Fallback to original method
          recommendations = this.getCropRecommendations(
            weather.temperature,
            weather.humidity,
            parseFloat(soil.ph),
            weather.rainfall,
            soil.soil_type,
            state,
            this.getCurrentSeasonForLocation(state)
          );
        }
      } else {
        // Use original method if location-aware engine not available
        recommendations = this.getCropRecommendations(
          weather.temperature,
          weather.humidity,
          parseFloat(soil.ph),
          weather.rainfall,
          soil.soil_type,
          state,
          this.getCurrentSeasonForLocation(state)
        );
      }

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
      recommendations: this.getCropRecommendations(25, 65, 7.0, 800, 'Alluvial', state, this.getCurrentSeasonForLocation(state)),
      market_prices: this.getMarketPrices(state),
      common_diseases: this.getCommonDiseases(state),
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new CropRecommendationEngine();


