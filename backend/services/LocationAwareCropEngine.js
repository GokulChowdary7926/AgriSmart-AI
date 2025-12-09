/**
 * Location-Aware Crop Recommendation Engine
 * Implements dynamic, location-specific crop recommendations based on:
 * - Agro-climatic zone classification
 * - Region-specific crop mapping
 * - Elevation-based filtering
 * - Seasonal filtering
 * - Location-specific scoring adjustments
 */

const logger = require('../utils/logger');

/**
 * Agro-climatic zones
 */
const AgroClimaticZone = {
  TROPICAL_HOT_HUMID: 'tropical_hot_humid',
  TROPICAL_HOT_DRY: 'tropical_hot_dry',
  SUBTROPICAL: 'subtropical',
  TEMPERATE: 'temperate',
  MEDITERRANEAN: 'mediterranean',
  ARID: 'arid',
  SEMI_ARID: 'semi_arid',
  COLD: 'cold',
  MOUNTAIN: 'mountain'
};

/**
 * Agricultural seasons
 */
const Season = {
  KHARIF: 'kharif',      // Monsoon season (Jun-Oct) - India
  RABI: 'rabi',          // Winter season (Nov-Apr) - India
  ZAID: 'zaid',          // Summer season (Apr-Jun) - India
  SPRING: 'spring',
  SUMMER: 'summer',
  AUTUMN: 'autumn',
  WINTER: 'winter'
};

/**
 * Dynamic Crop Database with Location Intelligence
 */
class DynamicCropDatabase {
  constructor() {
    this.crops = this._initializeCropDatabase();
    this.locationCropMap = this._initializeLocationCropMapping();
  }

  _initializeCropDatabase() {
    return {
      // Tropical crops (hot humid)
      'rice': {
        crop_id: 'rice_001',
        name: 'Rice',
        scientific_name: 'Oryza sativa',
        agro_climatic_zones: [
          AgroClimaticZone.TROPICAL_HOT_HUMID,
          AgroClimaticZone.SUBTROPICAL
        ],
        countries: ['India', 'Bangladesh', 'Thailand', 'Vietnam', 'China'],
        regions: ['South Asia', 'Southeast Asia', 'East Asia'],
        min_ph: 5.0,
        max_ph: 6.5,
        optimal_ph: 5.5,
        soil_types: ['clay', 'clay_loam', 'silty_clay', 'alluvial'],
        min_temp: 20,
        max_temp: 35,
        optimal_temp: 28,
        rainfall_min: 1000,
        rainfall_max: 2500,
        drainage: 'poor_to_moderate',
        seasons: [Season.KHARIF, Season.SUMMER],
        duration_days: 90,
        yield_range: [2.0, 6.0],
        elevation_range: [0, 1500],
        advantages: ['Staple food', 'High demand', 'Multiple varieties'],
        water_requirement: 'high',
        suitability_score_adjustments: {
          temperature: 1.2,
          rainfall: 1.3
        }
      },

      // Temperate crops
      'wheat': {
        crop_id: 'wheat_001',
        name: 'Wheat',
        scientific_name: 'Triticum aestivum',
        agro_climatic_zones: [
          AgroClimaticZone.TEMPERATE,
          AgroClimaticZone.SUBTROPICAL,
          AgroClimaticZone.MEDITERRANEAN
        ],
        countries: ['India', 'USA', 'China', 'Russia', 'Canada'],
        regions: ['Punjab', 'Uttar Pradesh', 'Haryana', 'Midwest USA'],
        min_ph: 6.0,
        max_ph: 7.5,
        optimal_ph: 6.5,
        soil_types: ['loam', 'clay_loam', 'silt_loam', 'alluvial'],
        min_temp: 10,
        max_temp: 25,
        optimal_temp: 20,
        rainfall_min: 500,
        rainfall_max: 1000,
        drainage: 'well',
        seasons: [Season.RABI, Season.WINTER],
        duration_days: 120,
        yield_range: [2.5, 4.0],
        elevation_range: [0, 2000],
        advantages: ['High market demand', 'Soil improver', 'Low water requirement'],
        water_requirement: 'moderate',
        suitability_score_adjustments: {
          temperature: 1.0,
          rainfall: 0.9
        }
      },

      // Arid/semi-arid crops
      'millet': {
        crop_id: 'millet_001',
        name: 'Pearl Millet',
        scientific_name: 'Pennisetum glaucum',
        agro_climatic_zones: [
          AgroClimaticZone.ARID,
          AgroClimaticZone.SEMI_ARID,
          AgroClimaticZone.TROPICAL_HOT_DRY
        ],
        countries: ['India', 'Nigeria', 'Niger', 'Sudan'],
        regions: ['Rajasthan', 'Gujarat', 'Sahel region'],
        min_ph: 6.0,
        max_ph: 8.0,
        optimal_ph: 7.0,
        soil_types: ['sandy', 'sandy_loam', 'loam'],
        min_temp: 25,
        max_temp: 40,
        optimal_temp: 30,
        rainfall_min: 250,
        rainfall_max: 600,
        drainage: 'excellent',
        seasons: [Season.KHARIF, Season.SUMMER],
        duration_days: 80,
        yield_range: [1.0, 2.5],
        elevation_range: [0, 1000],
        advantages: ['Drought tolerant', 'Low input cost', 'Nutritious'],
        water_requirement: 'low',
        suitability_score_adjustments: {
          temperature: 1.3,
          rainfall: 0.7
        }
      },

      // Mountain crops
      'apple': {
        crop_id: 'apple_001',
        name: 'Apple',
        scientific_name: 'Malus domestica',
        agro_climatic_zones: [
          AgroClimaticZone.COLD,
          AgroClimaticZone.MOUNTAIN,
          AgroClimaticZone.TEMPERATE
        ],
        countries: ['India', 'USA', 'China', 'Turkey'],
        regions: ['Kashmir', 'Himachal Pradesh', 'Washington'],
        min_ph: 5.5,
        max_ph: 6.8,
        optimal_ph: 6.0,
        soil_types: ['loam', 'sandy_loam'],
        min_temp: 7,
        max_temp: 24,
        optimal_temp: 15,
        rainfall_min: 800,
        rainfall_max: 1600,
        drainage: 'well',
        seasons: [Season.SPRING],
        duration_days: 150,
        yield_range: [10.0, 25.0],
        elevation_range: [1000, 3000],
        advantages: ['High value fruit', 'Cold storage possible', 'Export potential'],
        water_requirement: 'moderate',
        suitability_score_adjustments: {
          temperature: 0.8,
          rainfall: 1.1
        }
      },

      // Cold climate crops
      'potato': {
        crop_id: 'potato_001',
        name: 'Potato',
        scientific_name: 'Solanum tuberosum',
        agro_climatic_zones: [
          AgroClimaticZone.TEMPERATE,
          AgroClimaticZone.SUBTROPICAL,
          AgroClimaticZone.COLD
        ],
        countries: ['India', 'China', 'Russia', 'USA', 'Germany'],
        regions: ['Uttarakhand', 'Himachal Pradesh', 'Idaho'],
        min_ph: 5.0,
        max_ph: 6.5,
        optimal_ph: 5.8,
        soil_types: ['sandy_loam', 'loam'],
        min_temp: 10,
        max_temp: 25,
        optimal_temp: 18,
        rainfall_min: 500,
        rainfall_max: 1200,
        drainage: 'well',
        seasons: [Season.RABI, Season.SPRING, Season.AUTUMN],
        duration_days: 90,
        yield_range: [15.0, 30.0],
        elevation_range: [500, 3000],
        advantages: ['High yield', 'Short duration', 'Multiple uses'],
        water_requirement: 'moderate',
        suitability_score_adjustments: {
          temperature: 0.9,
          rainfall: 1.0
        }
      },

      // Additional crops
      'cotton': {
        crop_id: 'cotton_001',
        name: 'Cotton',
        scientific_name: 'Gossypium hirsutum',
        agro_climatic_zones: [
          AgroClimaticZone.SUBTROPICAL,
          AgroClimaticZone.TROPICAL_HOT_DRY,
          AgroClimaticZone.SEMI_ARID
        ],
        countries: ['India', 'USA', 'China', 'Pakistan'],
        regions: ['Punjab', 'Gujarat', 'Maharashtra', 'Texas'],
        min_ph: 5.5,
        max_ph: 8.0,
        optimal_ph: 6.5,
        soil_types: ['black', 'alluvial', 'loam'],
        min_temp: 20,
        max_temp: 35,
        optimal_temp: 28,
        rainfall_min: 500,
        rainfall_max: 1200,
        drainage: 'well',
        seasons: [Season.KHARIF, Season.SUMMER],
        duration_days: 150,
        yield_range: [1.5, 2.5],
        elevation_range: [0, 1000],
        advantages: ['High economic value', 'Good export potential', 'Multiple uses'],
        water_requirement: 'moderate',
        suitability_score_adjustments: {
          temperature: 1.1,
          rainfall: 0.9
        }
      },

      'sugarcane': {
        crop_id: 'sugarcane_001',
        name: 'Sugarcane',
        scientific_name: 'Saccharum officinarum',
        agro_climatic_zones: [
          AgroClimaticZone.TROPICAL_HOT_HUMID,
          AgroClimaticZone.SUBTROPICAL
        ],
        countries: ['India', 'Brazil', 'China', 'Thailand'],
        regions: ['Uttar Pradesh', 'Maharashtra', 'Karnataka'],
        min_ph: 6.0,
        max_ph: 7.5,
        optimal_ph: 6.5,
        soil_types: ['alluvial', 'black', 'loam'],
        min_temp: 20,
        max_temp: 35,
        optimal_temp: 28,
        rainfall_min: 1000,
        rainfall_max: 2000,
        drainage: 'moderate',
        seasons: [Season.KHARIF, Season.YEAR_ROUND],
        duration_days: 365,
        yield_range: [70.0, 100.0],
        elevation_range: [0, 1000],
        advantages: ['Very high yield', 'Year-round income', 'Multiple products'],
        water_requirement: 'high',
        suitability_score_adjustments: {
          temperature: 1.2,
          rainfall: 1.1
        }
      },

      'maize': {
        crop_id: 'maize_001',
        name: 'Maize',
        scientific_name: 'Zea mays',
        agro_climatic_zones: [
          AgroClimaticZone.TEMPERATE,
          AgroClimaticZone.SUBTROPICAL,
          AgroClimaticZone.TROPICAL_HOT_HUMID
        ],
        countries: ['India', 'USA', 'China', 'Brazil'],
        regions: ['Karnataka', 'Bihar', 'Midwest USA'],
        min_ph: 5.5,
        max_ph: 7.5,
        optimal_ph: 6.5,
        soil_types: ['alluvial', 'loamy', 'sandy'],
        min_temp: 15,
        max_temp: 30,
        optimal_temp: 25,
        rainfall_min: 500,
        rainfall_max: 1500,
        drainage: 'well',
        seasons: [Season.KHARIF, Season.SUMMER],
        duration_days: 90,
        yield_range: [2.0, 3.0],
        elevation_range: [0, 1500],
        advantages: ['Fast growing', 'Multiple uses', 'Good market demand'],
        water_requirement: 'moderate',
        suitability_score_adjustments: {
          temperature: 1.0,
          rainfall: 1.0
        }
      }
    };
  }

  _initializeLocationCropMapping() {
    return {
      // India regions
      'punjab': ['wheat', 'rice', 'cotton', 'sugarcane'],
      'uttar pradesh': ['wheat', 'rice', 'sugarcane', 'potato'],
      'rajasthan': ['millet', 'wheat', 'cotton', 'mustard'],
      'kashmir': ['apple', 'saffron', 'walnut', 'pear'],
      'himachal pradesh': ['apple', 'potato', 'maize', 'peas'],
      'uttarakhand': ['potato', 'apple', 'rice', 'wheat'],
      'gujarat': ['cotton', 'groundnut', 'millet', 'wheat'],
      'maharashtra': ['cotton', 'sugarcane', 'soybean', 'pulses'],
      'karnataka': ['coffee', 'rice', 'sugarcane', 'maize'],
      'kerala': ['rubber', 'coconut', 'tea', 'spices'],
      'west bengal': ['rice', 'jute', 'potato', 'mustard'],
      'bihar': ['rice', 'wheat', 'maize', 'pulses'],
      'tamil nadu': ['rice', 'cotton', 'sugarcane', 'groundnut'],
      'andhra pradesh': ['rice', 'cotton', 'chilli', 'groundnut'],
      'telangana': ['rice', 'cotton', 'maize', 'pulses'],
      'madhya pradesh': ['wheat', 'soybean', 'pulses', 'cotton'],
      'chhattisgarh': ['rice', 'pulses', 'maize', 'oilseeds'],
      'odisha': ['rice', 'pulses', 'groundnut', 'jute'],
      'assam': ['rice', 'tea', 'jute', 'mustard'],

      // International regions
      'midwest usa': ['corn', 'soybean', 'wheat'],
      'california': ['almonds', 'grapes', 'tomatoes', 'olive'],
      'mediterranean': ['olive', 'grapes', 'citrus', 'wheat'],
      'sahel': ['millet', 'sorghum', 'groundnut'],
      'southeast asia': ['rice', 'rubber', 'palm oil', 'coconut']
    };
  }

  /**
   * Get crops for a specific location
   */
  getCropsForLocation(locationContext) {
    const regionKey = locationContext.region?.toLowerCase() || '';
    const country = locationContext.country?.toLowerCase() || '';
    const zone = locationContext.agro_climatic_zone;

    // Step 1: Filter by agro-climatic zone
    let zoneCrops = Object.values(this.crops).filter(crop =>
      crop.agro_climatic_zones.includes(zone)
    );

    // Step 2: Filter by country if available
    if (country) {
      const countryCrops = zoneCrops.filter(crop =>
        crop.countries.some(c => c.toLowerCase() === country)
      );
      if (countryCrops.length > 0) {
        zoneCrops = countryCrops;
      }
    }

    // Step 3: Filter by region mapping
    let regionCrops = [];
    if (regionKey && this.locationCropMap[regionKey]) {
      const regionCropNames = this.locationCropMap[regionKey];
      regionCrops = zoneCrops.filter(crop =>
        regionCropNames.includes(crop.name.toLowerCase())
      );
    }

    // Step 4: Use region-specific crops if found, otherwise use zone crops
    let suitableCrops = regionCrops.length > 0 ? regionCrops : zoneCrops;

    // Step 5: Filter by elevation
    const elevation = locationContext.elevation || 200;
    suitableCrops = suitableCrops.filter(crop =>
      elevation >= crop.elevation_range[0] && elevation <= crop.elevation_range[1]
    );

    // Step 6: Filter by current season
    const currentSeason = locationContext.current_season;
    let seasonFiltered = suitableCrops.filter(crop =>
      crop.seasons.includes(currentSeason)
    );

    // If no crops match current season, relax season filter
    if (seasonFiltered.length === 0) {
      seasonFiltered = suitableCrops;
    }

    logger.info(`Found ${seasonFiltered.length} location-specific crops for ${locationContext.region || 'unknown region'}`);

    return seasonFiltered;
  }

  getAllCrops() {
    return Object.values(this.crops);
  }
}

/**
 * Agro-climatic Zone Classifier
 */
class AgroClimaticClassifier {
  classify(lat, lon) {
    // Simple classification based on latitude and longitude
    const absLat = Math.abs(lat);

    if (absLat < 23.5) {
      // Tropical
      if (lon > 70 && lon < 90 && lat > 8 && lat < 37) {
        // South Asia specific - check for humid conditions
        return AgroClimaticZone.TROPICAL_HOT_HUMID;
      }
      return AgroClimaticZone.TROPICAL_HOT_DRY;
    } else if (absLat >= 23.5 && absLat < 35) {
      // Subtropical
      return AgroClimaticZone.SUBTROPICAL;
    } else if (absLat >= 35 && absLat < 45) {
      // Temperate/Mediterranean
      if (lon > 0 && lon < 20) {
        // Mediterranean region
        return AgroClimaticZone.MEDITERRANEAN;
      }
      return AgroClimaticZone.TEMPERATE;
    } else {
      // Cold/Mountain
      if (absLat > 30 && elevation > 1000) {
        return AgroClimaticZone.MOUNTAIN;
      }
      return AgroClimaticZone.COLD;
    }
  }
}

/**
 * Season Detector
 */
class SeasonDetector {
  getSeason(lat, lon) {
    const month = new Date().getMonth() + 1;

    // India-specific seasons
    if (lon > 70 && lon < 90 && lat > 8 && lat < 37) {
      if (month >= 6 && month <= 10) {
        return Season.KHARIF;
      } else if (month >= 11 || month <= 4) {
        return Season.RABI;
      } else {
        return Season.ZAID;
      }
    }

    // Northern hemisphere
    if (lat > 0) {
      if (month >= 3 && month <= 5) {
        return Season.SPRING;
      } else if (month >= 6 && month <= 8) {
        return Season.SUMMER;
      } else if (month >= 9 && month <= 11) {
        return Season.AUTUMN;
      } else {
        return Season.WINTER;
      }
    } else {
      // Southern hemisphere
      if (month >= 9 && month <= 11) {
        return Season.SPRING;
      } else if (month === 12 || month <= 2) {
        return Season.SUMMER;
      } else if (month >= 3 && month <= 5) {
        return Season.AUTUMN;
      } else {
        return Season.WINTER;
      }
    }
  }

  getPlantingWindow(lat, lon, season) {
    const today = new Date();
    const year = today.getFullYear();

    let start, end;

    if (season === Season.KHARIF) {
      start = new Date(year, 5, 1); // June 1
      end = new Date(year, 6, 15);  // July 15
    } else if (season === Season.RABI) {
      start = new Date(year, 10, 1); // November 1
      end = new Date(year, 11, 15);  // December 15
    } else if (season === Season.SPRING) {
      start = new Date(year, 2, 1);  // March 1
      end = new Date(year, 3, 15);   // April 15
    } else {
      start = today;
      end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    return { start, end };
  }
}

/**
 * Location-Aware Crop Recommendation Engine
 */
class LocationAwareCropEngine {
  constructor() {
    this.cropDb = new DynamicCropDatabase();
    this.agroClimaticClassifier = new AgroClimaticClassifier();
    this.seasonDetector = new SeasonDetector();
  }

  /**
   * Analyze location and create context
   */
  analyzeLocation(lat, lon, state = null, region = null, country = 'India') {
    const elevation = this._getElevation(lat, lon);
    const zone = this.agroClimaticClassifier.classify(lat, lon, elevation);
    const season = this.seasonDetector.getSeason(lat, lon);
    const plantingWindow = this.seasonDetector.getPlantingWindow(lat, lon, season);

    return {
      latitude: lat,
      longitude: lon,
      elevation: elevation,
      agro_climatic_zone: zone,
      country: country,
      region: region || state || this._getRegionFromState(state),
      state: state,
      current_season: season,
      planting_window: plantingWindow,
      frost_free_days: this._calculateFrostFreeDays(lat, lon),
      avg_annual_rainfall: this._getAvgRainfall(lat, lon),
      avg_annual_temp: this._getAvgTemp(lat, lon)
    };
  }

  /**
   * Generate location-specific recommendations
   */
  generateRecommendations(locationContext, soilData, weatherData, marketData = null) {
    // Get location-specific crops
    const locationCrops = this.cropDb.getCropsForLocation(locationContext);

    if (locationCrops.length === 0) {
      logger.warn(`No crops found for location: ${locationContext.region}`);
      return [];
    }

    const recommendations = [];

    for (const crop of locationCrops) {
      // Calculate suitability score
      const { score, detailedScores } = this._calculateCropSuitability(
        crop,
        locationContext,
        soilData,
        weatherData
      );

      // Apply location-specific adjustments
      const adjustedScore = this._applyLocationAdjustments(score, crop, locationContext);

      // Only recommend if score is above threshold
      if (adjustedScore >= 50) {
        // Calculate expected yield
        const expectedYield = this._calculateLocationYield(
          crop,
          adjustedScore,
          locationContext,
          soilData
        );

        // Calculate revenue
        const revenue = this._calculateLocationRevenue(
          expectedYield,
          crop,
          locationContext,
          marketData
        );

        recommendations.push({
          crop_id: crop.crop_id,
          crop_name: crop.name,
          name: crop.name,
          scientific_name: crop.scientific_name,
          suitability_score: Math.round(adjustedScore * 10) / 10,
          score: Math.round(adjustedScore * 10) / 10,
          confidence: this._calculateConfidence(adjustedScore),
          season: locationContext.current_season,
          duration_days: crop.duration_days,
          expected_yield: expectedYield,
          revenue_potential: revenue,
          advantages: crop.advantages,
          risks: this._identifyLocationRisks(crop, locationContext, weatherData),
          location_specific_notes: this._getLocationNotes(crop, locationContext),
          detailed_scores: detailedScores,
          agro_climatic_zone: locationContext.agro_climatic_zone,
          planting_window: locationContext.planting_window,
          market_price: revenue.avg ? `₹${Math.round(revenue.avg / expectedYield.avg)}/ton` : '₹2000-₹4000/ton',
          marketPrice: revenue.avg ? `₹${Math.round(revenue.avg / expectedYield.avg)}/ton` : '₹2000-₹4000/ton'
        });
      }
    }

    // Sort by suitability score
    recommendations.sort((a, b) => b.suitability_score - a.suitability_score);

    // Ensure diversity
    const uniqueRecommendations = this._ensureDiversity(recommendations);

    return uniqueRecommendations.slice(0, 10);
  }

  /**
   * Calculate comprehensive crop suitability score
   */
  _calculateCropSuitability(crop, locationContext, soilData, weatherData) {
    const scores = {};

    // 1. Climate Match (25 points)
    const climateScore = this._calculateClimateScore(crop, locationContext, weatherData);
    scores.climate_match = climateScore * 25;

    // 2. Soil Compatibility (20 points)
    const soilScore = this._calculateSoilScore(crop, soilData);
    scores.soil_compatibility = soilScore * 20;

    // 3. Seasonal Fit (15 points)
    const seasonScore = crop.seasons.includes(locationContext.current_season) ? 1.0 : 0.5;
    scores.seasonal_fit = seasonScore * 15;

    // 4. Elevation Suitability (10 points)
    const elevationScore = this._calculateElevationScore(crop, locationContext.elevation);
    scores.elevation_suitability = elevationScore * 10;

    // 5. Regional Popularity (10 points)
    const regionalScore = this._calculateRegionalScore(crop, locationContext.region);
    scores.regional_popularity = regionalScore * 10;

    // 6. Economic Viability (10 points)
    const economicScore = this._calculateEconomicScore(crop, locationContext);
    scores.economic_viability = economicScore * 10;

    // 7. Risk Factor (10 points)
    const riskScore = this._calculateRiskScore(crop, locationContext, weatherData);
    scores.risk_factor = riskScore * 10;

    const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);

    // Apply crop-specific adjustments
    const adjustments = crop.suitability_score_adjustments || {};
    let adjustedScore = totalScore;
    if (adjustments.temperature) {
      adjustedScore *= adjustments.temperature;
    }
    if (adjustments.rainfall) {
      adjustedScore *= adjustments.rainfall;
    }

    return {
      score: Math.min(adjustedScore, 100),
      detailedScores: scores
    };
  }

  _calculateClimateScore(crop, locationContext, weatherData) {
    const currentTemp = weatherData.temperature || 25;
    const currentRainfall = weatherData.rainfall || 0;

    // Temperature score
    const tempRange = crop.max_temp - crop.min_temp;
    const tempDistance = Math.abs(currentTemp - crop.optimal_temp);
    let tempScore = 0;
    if (crop.min_temp <= currentTemp && currentTemp <= crop.max_temp) {
      tempScore = 1 - (tempDistance / (tempRange / 2));
    }

    // Rainfall score
    let rainfallScore = 0;
    if (crop.rainfall_min <= currentRainfall && currentRainfall <= crop.rainfall_max) {
      rainfallScore = 1.0;
    } else if (currentRainfall < crop.rainfall_min) {
      rainfallScore = currentRainfall / crop.rainfall_min;
    } else {
      rainfallScore = crop.rainfall_max / currentRainfall;
    }

    // Long-term climate match
    const longTermTempMatch = 1 - Math.abs(locationContext.avg_annual_temp - crop.optimal_temp) / 20;
    const longTermRainfallMatch = Math.min(locationContext.avg_annual_rainfall / crop.rainfall_max, 1.0);

    const finalScore = (
      tempScore * 0.3 +
      rainfallScore * 0.3 +
      Math.max(0, longTermTempMatch) * 0.2 +
      Math.max(0, longTermRainfallMatch) * 0.2
    );

    return Math.max(0, Math.min(1, finalScore));
  }

  _calculateSoilScore(crop, soilData) {
    const soilPh = soilData.ph || 7.0;
    const soilType = (soilData.soil_type || soilData.type || 'loam').toLowerCase();
    const drainage = (soilData.drainage || 'moderate').toLowerCase();

    // pH score
    let phScore = 0;
    if (crop.min_ph <= soilPh && soilPh <= crop.max_ph) {
      const phDistance = Math.abs(soilPh - crop.optimal_ph);
      const phRange = crop.max_ph - crop.min_ph;
      phScore = 1 - (phDistance / (phRange / 2));
    }

    // Soil type score
    const cropSoilTypes = crop.soil_types.map(t => t.toLowerCase());
    const soilTypeScore = cropSoilTypes.includes(soilType) ? 1.0 : 0.3;

    // Drainage score
    const drainageMatch = {
      'poor': { 'poor_to_moderate': 1.0, 'well': 0.3, 'excellent': 0.1 },
      'moderate': { 'poor_to_moderate': 1.0, 'well': 0.8, 'excellent': 0.5 },
      'well': { 'poor_to_moderate': 0.5, 'well': 1.0, 'excellent': 0.8 },
      'excellent': { 'poor_to_moderate': 0.3, 'well': 0.6, 'excellent': 1.0 }
    };

    const drainageScore = drainageMatch[drainage]?.[crop.drainage] || 0.5;

    return (phScore * 0.5 + soilTypeScore * 0.3 + drainageScore * 0.2);
  }

  _calculateElevationScore(crop, elevation) {
    const [minElev, maxElev] = crop.elevation_range;
    if (minElev <= elevation && elevation <= maxElev) {
      const midElev = (minElev + maxElev) / 2;
      const elevationDiff = Math.abs(elevation - midElev);
      const elevationRange = maxElev - minElev;
      return 1 - (elevationDiff / (elevationRange / 2));
    }
    return 0;
  }

  _calculateRegionalScore(crop, region) {
    if (!region) return 0.5;

    const regionLower = region.toLowerCase();
    const cropNameLower = crop.name.toLowerCase();
    const locationMap = this.cropDb.locationCropMap;

    for (const [locationKey, crops] of Object.entries(locationMap)) {
      if (regionLower.includes(locationKey) || locationKey.includes(regionLower)) {
        if (crops.includes(cropNameLower)) {
          return 1.0;
        }
      }
    }

    return 0.5;
  }

  _calculateEconomicScore(crop, locationContext) {
    const highValueCombinations = {
      'kashmir-apple': 1.0,
      'punjab-wheat': 0.9,
      'rajasthan-millet': 0.8,
      'uttar pradesh-sugarcane': 0.9,
      'gujarat-cotton': 0.85
    };

    const regionKey = (locationContext.region || '').toLowerCase();
    const cropKey = crop.name.toLowerCase();
    const combination = `${regionKey}-${cropKey}`;

    for (const [pattern, score] of Object.entries(highValueCombinations)) {
      if (combination.includes(pattern.split('-')[0]) && combination.includes(pattern.split('-')[1])) {
        return score;
      }
    }

    return 0.7;
  }

  _calculateRiskScore(crop, locationContext, weatherData) {
    const riskFactors = [];
    const currentTemp = weatherData.temperature || 25;
    const currentRainfall = weatherData.rainfall || 0;

    // Temperature risk
    if (currentTemp > crop.max_temp + 5) {
      riskFactors.push(0.3);
    } else if (currentTemp < crop.min_temp - 5) {
      riskFactors.push(0.4);
    }

    // Rainfall risk
    if (currentRainfall > crop.rainfall_max * 1.5) {
      riskFactors.push(0.5);
    } else if (currentRainfall < crop.rainfall_min * 0.5) {
      riskFactors.push(0.6);
    }

    // Frost risk
    if (locationContext.frost_free_days < crop.duration_days) {
      riskFactors.push(0.4);
    }

    if (riskFactors.length > 0) {
      const avgRisk = riskFactors.reduce((sum, r) => sum + r, 0) / riskFactors.length;
      return 1 - avgRisk;
    }

    return 0.9;
  }

  _applyLocationAdjustments(score, crop, locationContext) {
    let adjustedScore = score;

    // Adjust for agro-climatic zone match
    if (crop.agro_climatic_zones.includes(locationContext.agro_climatic_zone)) {
      adjustedScore *= 1.1;
    }

    // Adjust for country match
    const countryLower = locationContext.country.toLowerCase();
    if (crop.countries.some(c => c.toLowerCase() === countryLower)) {
      adjustedScore *= 1.05;
    }

    // Adjust for elevation optimality
    const elevationScore = this._calculateElevationScore(crop, locationContext.elevation);
    if (elevationScore > 0.8) {
      adjustedScore *= 1.05;
    }

    return Math.min(adjustedScore, 100);
  }

  _calculateLocationYield(crop, suitabilityScore, locationContext, soilData) {
    const [baseMin, baseMax] = crop.yield_range;
    const baseAvg = (baseMin + baseMax) / 2;
    const scoreFactor = suitabilityScore / 100;

    // Soil factor
    const organicMatter = parseFloat(soilData.organic_matter || soilData.organicMatter || '2.0') || 2.0;
    let soilFactor = 1.0;
    if (organicMatter > 3.0) {
      soilFactor = 1.2;
    } else if (organicMatter < 1.0) {
      soilFactor = 0.8;
    }

    // Location factor
    const locationFactor = this._getLocationYieldFactor(crop.name, locationContext.region);

    const adjustedAvg = baseAvg * scoreFactor * soilFactor * locationFactor;

    return {
      min: Math.round(adjustedAvg * 0.8 * 10) / 10,
      max: Math.round(adjustedAvg * 1.2 * 10) / 10,
      avg: Math.round(adjustedAvg * 10) / 10,
      unit: 'tons/ha'
    };
  }

  _getLocationYieldFactor(cropName, region) {
    const yieldFactors = {
      'wheat-punjab': 1.2,
      'wheat-uttar pradesh': 1.0,
      'rice-punjab': 1.3,
      'rice-west bengal': 1.1,
      'millet-rajasthan': 0.9,
      'apple-kashmir': 1.4,
      'apple-himachal pradesh': 1.2,
      'potato-uttar pradesh': 1.1,
      'sugarcane-uttar pradesh': 1.2
    };

    const regionLower = (region || '').toLowerCase();
    const cropLower = cropName.toLowerCase();

    for (const [pattern, factor] of Object.entries(yieldFactors)) {
      const [cropPattern, regionPattern] = pattern.split('-');
      if (cropLower.includes(cropPattern) && regionLower.includes(regionPattern)) {
        return factor;
      }
    }

    return 1.0;
  }

  _calculateLocationRevenue(yieldData, crop, locationContext, marketData) {
    const avgYield = yieldData.avg;
    let price = 3000; // Default price

    if (marketData && marketData[crop.name.toLowerCase()]) {
      price = marketData[crop.name.toLowerCase()].price || price;
    } else {
      price = this._getRegionPrice(crop.name, locationContext.region);
    }

    const revenue = avgYield * price;

    return {
      min: Math.round(yieldData.min * price * 0.9),
      max: Math.round(yieldData.max * price * 1.1),
      avg: Math.round(revenue),
      currency: 'INR'
    };
  }

  _getRegionPrice(cropName, region) {
    const regionPrices = {
      'wheat-punjab': 2200,
      'wheat-madhya pradesh': 2100,
      'rice-punjab': 2500,
      'rice-andhra pradesh': 2300,
      'millet-rajasthan': 1800,
      'apple-kashmir': 6000,
      'potato-uttar pradesh': 1500,
      'sugarcane-uttar pradesh': 2800
    };

    const regionLower = (region || '').toLowerCase();
    const cropLower = cropName.toLowerCase();

    for (const [pattern, price] of Object.entries(regionPrices)) {
      const [cropPattern, regionPattern] = pattern.split('-');
      if (cropLower.includes(cropPattern) && regionLower.includes(regionPattern)) {
        return price;
      }
    }

    return 3000;
  }

  _identifyLocationRisks(crop, locationContext, weatherData) {
    const risks = [];

    if (locationContext.agro_climatic_zone === AgroClimaticZone.ARID) {
      if (crop.water_requirement === 'high') {
        risks.push('High water requirement in arid region');
      }
    }

    if (locationContext.agro_climatic_zone === AgroClimaticZone.TROPICAL_HOT_HUMID) {
      if (crop.drainage === 'poor_to_moderate') {
        risks.push('Poor drainage may cause waterlogging in humid climate');
      }
    }

    if (!crop.seasons.includes(locationContext.current_season)) {
      risks.push('Not optimal season for this crop');
    }

    const currentTemp = weatherData.temperature || 25;
    if (currentTemp > crop.max_temp) {
      risks.push('Current temperature above optimal range');
    }

    const currentRainfall = weatherData.rainfall || 0;
    if (currentRainfall < crop.rainfall_min) {
      risks.push('Insufficient rainfall for optimal growth');
    }

    return risks.length > 0 ? risks : ['Low risk - suitable for current conditions'];
  }

  _getLocationNotes(crop, locationContext) {
    const notes = [];
    const regionLower = (locationContext.region || '').toLowerCase();
    const cropLower = crop.name.toLowerCase();

    if (regionLower.includes('punjab') && cropLower.includes('wheat')) {
      notes.push('Recommended to sow between Nov 1-15 for optimal yield');
      notes.push('Use certified seeds from Punjab Agricultural University');
    }

    if (regionLower.includes('kashmir') && cropLower.includes('apple')) {
      notes.push('Plant in March-April for best establishment');
      notes.push('Recommended varieties: Royal Delicious, American Ambri');
    }

    if (regionLower.includes('rajasthan') && cropLower.includes('millet')) {
      notes.push('Sow immediately after first monsoon showers');
      notes.push('Drought-tolerant varieties recommended');
    }

    return notes;
  }

  _ensureDiversity(recommendations) {
    const uniqueCrops = [];
    const seenCrops = new Set();

    for (const rec of recommendations) {
      const cropName = rec.crop_name || rec.name;
      if (!seenCrops.has(cropName)) {
        seenCrops.add(cropName);
        uniqueCrops.push(rec);
      } else {
        // Allow similar crops if significantly different scores
        const similarRecs = uniqueCrops.filter(r => (r.crop_name || r.name) === cropName);
        if (similarRecs.length > 0) {
          const existingScore = similarRecs[0].suitability_score;
          if (rec.suitability_score > existingScore + 10) {
            // Replace with higher scoring version
            const filtered = uniqueCrops.filter(r => (r.crop_name || r.name) !== cropName);
            filtered.push(rec);
            uniqueCrops.length = 0;
            uniqueCrops.push(...filtered);
          }
        }
      }
    }

    return uniqueCrops;
  }

  _calculateConfidence(score) {
    return Math.min(score / 100, 1.0);
  }

  // Placeholder methods for external data
  _getElevation(lat, lon) {
    // Would call elevation API
    return 200.0;
  }

  _getRegionFromState(state) {
    if (!state) return 'Unknown';
    return state;
  }

  _calculateFrostFreeDays(lat, lon) {
    return 300;
  }

  _getAvgRainfall(lat, lon) {
    return 800.0;
  }

  _getAvgTemp(lat, lon) {
    return 25.0;
  }
}

module.exports = {
  LocationAwareCropEngine,
  AgroClimaticZone,
  Season
};

