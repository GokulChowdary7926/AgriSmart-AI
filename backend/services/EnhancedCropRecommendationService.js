const logger = require('../utils/logger');
const cropRecommendationEngine = require('./CropRecommendationEngine');

class EnhancedCropRecommendationService {
  constructor() {
    this.engine = cropRecommendationEngine; // Use singleton instance
    this.seasonData = this.initializeSeasonData();
  }

  initializeSeasonData() {
    const month = new Date().getMonth() + 1;
    let currentSeason = 'Kharif';
    
    if (month >= 6 && month <= 10) {
      currentSeason = 'Kharif';
    } else if (month >= 11 || month <= 3) {
      currentSeason = 'Rabi';
    } else {
      currentSeason = 'Zaid';
    }
    
    return {
      current: currentSeason,
      month: month,
      nextSeason: month >= 6 && month <= 10 ? 'Rabi' : 'Kharif'
    };
  }

  async getPerfectRecommendations(location, soilType, season, preferences = {}) {
    try {
      const { lat, lng } = location;
      const currentSeason = season || this.seasonData.current;
      
      const recommendations = await this.engine.recommendCrops({
        latitude: lat,
        longitude: lng,
        soilType: soilType || 'loam',
        season: currentSeason,
        preferences: preferences
      });

      const enhanced = recommendations.map(crop => {
        const score = this.calculatePerfectScore(crop, location, soilType, currentSeason);
        
        return {
          ...crop,
          perfectScore: score.total,
          scoreBreakdown: score.breakdown,
          recommendation: this.getRecommendationLevel(score.total),
          advantages: this.getAdvantages(crop, location, currentSeason),
          risks: this.getRisks(crop, location, currentSeason),
          profitability: this.calculateProfitability(crop),
          marketDemand: this.getMarketDemand(crop),
          bestPractices: this.getBestPractices(crop, currentSeason)
        };
      });

      enhanced.sort((a, b) => b.perfectScore - a.perfectScore);

      return {
        success: true,
        recommendations: enhanced.slice(0, 10), // Top 10
        bestCrop: enhanced[0],
        season: currentSeason,
        location: {
          lat,
          lng,
          soilType: soilType || 'loam'
        },
        analysis: {
          totalCropsAnalyzed: enhanced.length,
          highlyRecommended: enhanced.filter(c => c.perfectScore >= 80).length,
          moderatelyRecommended: enhanced.filter(c => c.perfectScore >= 60 && c.perfectScore < 80).length,
          seasonSuitability: this.getSeasonSuitability(currentSeason)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error in perfect crop recommendations:', error);
      return {
        success: false,
        error: error.message,
        recommendations: []
      };
    }
  }

  calculatePerfectScore(crop, location, soilType, season) {
    let score = 0;
    const breakdown = {
      soilCompatibility: 0,
      seasonMatch: 0,
      climateSuitability: 0,
      marketValue: 0,
      yieldPotential: 0,
      waterRequirement: 0,
      pestResistance: 0
    };

    if (crop.soilCompatibility) {
      const soilMatch = crop.soilCompatibility.includes(soilType?.toLowerCase()) ? 20 : 10;
      breakdown.soilCompatibility = soilMatch;
      score += soilMatch;
    }

    if (crop.seasons && crop.seasons.includes(season)) {
      breakdown.seasonMatch = 20;
      score += 20;
    } else {
      breakdown.seasonMatch = 5;
      score += 5;
    }

    const temp = this.getTemperatureForLocation(location);
    if (crop.temperatureRange) {
      const [min, max] = crop.temperatureRange;
      if (temp >= min && temp <= max) {
        breakdown.climateSuitability = 15;
        score += 15;
      } else {
        breakdown.climateSuitability = 5;
        score += 5;
      }
    }

    if (crop.marketPrice && crop.marketPrice > 30) {
      breakdown.marketValue = 15;
      score += 15;
    } else if (crop.marketPrice && crop.marketPrice > 20) {
      breakdown.marketValue = 10;
      score += 10;
    } else {
      breakdown.marketValue = 5;
      score += 5;
    }

    if (crop.yield && crop.yield > 40) {
      breakdown.yieldPotential = 15;
      score += 15;
    } else if (crop.yield && crop.yield > 25) {
      breakdown.yieldPotential = 10;
      score += 10;
    } else {
      breakdown.yieldPotential = 5;
      score += 5;
    }

    if (crop.waterRequirement === 'Low' || crop.waterRequirement === 'Medium') {
      breakdown.waterRequirement = 10;
      score += 10;
    } else {
      breakdown.waterRequirement = 5;
      score += 5;
    }

    if (crop.pestResistance === 'High') {
      breakdown.pestResistance = 5;
      score += 5;
    } else {
      breakdown.pestResistance = 2;
      score += 2;
    }

    return {
      total: Math.min(100, Math.round(score)),
      breakdown
    };
  }

  getTemperatureForLocation(location) {
    const lat = location.lat;
    if (lat > 25) return 28; // North India - warmer
    if (lat > 20) return 30; // Central India - hot
    return 32; // South India - very hot
  }

  getRecommendationLevel(score) {
    if (score >= 85) return 'Highly Recommended';
    if (score >= 70) return 'Recommended';
    if (score >= 55) return 'Moderately Suitable';
    return 'Not Recommended';
  }

  getAdvantages(crop, location, season) {
    const advantages = [];
    
    if (crop.marketPrice > 30) {
      advantages.push('High market value');
    }
    if (crop.yield > 35) {
      advantages.push('High yield potential');
    }
    if (crop.waterRequirement === 'Low') {
      advantages.push('Low water requirement');
    }
    if (crop.pestResistance === 'High') {
      advantages.push('Good pest resistance');
    }
    if (crop.seasons && crop.seasons.includes(season)) {
      advantages.push(`Perfect for ${season} season`);
    }
    
    return advantages.length > 0 ? advantages : ['Standard crop for the region'];
  }

  getRisks(crop, location, season) {
    const risks = [];
    
    if (crop.waterRequirement === 'High') {
      risks.push('High water requirement - ensure irrigation');
    }
    if (crop.pestResistance === 'Low') {
      risks.push('Susceptible to pests - regular monitoring needed');
    }
    if (!crop.seasons || !crop.seasons.includes(season)) {
      risks.push(`Not ideal for ${season} season`);
    }
    
    return risks;
  }

  calculateProfitability(crop) {
    if (!crop.marketPrice || !crop.yield) {
      return { level: 'Unknown', estimatedProfit: 0 };
    }
    
    const revenuePerAcre = crop.marketPrice * crop.yield;
    const costPerAcre = crop.costOfCultivation || (revenuePerAcre * 0.4); // Assume 40% cost
    const profitPerAcre = revenuePerAcre - costPerAcre;
    const profitMargin = (profitPerAcre / revenuePerAcre) * 100;
    
    let level = 'Low';
    if (profitMargin > 50) level = 'Very High';
    else if (profitMargin > 35) level = 'High';
    else if (profitMargin > 20) level = 'Moderate';
    
    return {
      level,
      estimatedProfit: Math.round(profitPerAcre),
      profitMargin: Math.round(profitMargin),
      revenuePerAcre: Math.round(revenuePerAcre),
      costPerAcre: Math.round(costPerAcre)
    };
  }

  getMarketDemand(crop) {
    const highDemandCrops = ['rice', 'wheat', 'tomato', 'potato', 'onion'];
    const cropName = crop.name?.toLowerCase() || '';
    
    if (highDemandCrops.some(c => cropName.includes(c))) {
      return {
        level: 'High',
        description: 'Consistent high demand in markets'
      };
    }
    
    return {
      level: 'Moderate',
      description: 'Steady market demand'
    };
  }

  getBestPractices(crop, season) {
    return [
      `Sow during ${season} season (${crop.sowingTime || 'optimal time'})`,
      `Maintain soil pH between ${crop.soilPH?.min || 6.0} - ${crop.soilPH?.max || 7.5}`,
      `Apply ${crop.fertilizer || 'balanced NPK'} fertilizer`,
      `Harvest after ${crop.duration || '90-120'} days`,
      `Store in ${crop.storageConditions || 'cool, dry place'}`
    ];
  }

  getSeasonSuitability(season) {
    const seasonInfo = {
      Kharif: {
        description: 'Monsoon season (June-October)',
        suitableCrops: ['Rice', 'Maize', 'Cotton', 'Soybean', 'Groundnut'],
        weather: 'High rainfall, humid conditions'
      },
      Rabi: {
        description: 'Winter season (November-March)',
        suitableCrops: ['Wheat', 'Barley', 'Mustard', 'Gram', 'Peas'],
        weather: 'Cool, dry conditions'
      },
      Zaid: {
        description: 'Summer season (April-May)',
        suitableCrops: ['Vegetables', 'Fruits', 'Pulses'],
        weather: 'Hot, dry conditions'
      }
    };
    
    return seasonInfo[season] || seasonInfo.Kharif;
  }
}

module.exports = new EnhancedCropRecommendationService();
