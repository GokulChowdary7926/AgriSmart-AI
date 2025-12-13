const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AgriDataIntegrator {
  constructor(dataDir = './data') {
    this.dataDir = path.join(__dirname, '../data');
    this.integratedDir = path.join(this.dataDir, 'integrated');
    this.cache = new Map();
    
    [this.dataDir, this.integratedDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    this.datasets = this._initializeDatasets();
    
    this._loadMasterIndex();
  }

  _loadMasterIndex() {
    try {
      const masterIndexPath = path.join(this.dataDir, 'AGRI_DATA_MASTER_INDEX.json');
      if (fs.existsSync(masterIndexPath)) {
        const indexContent = fs.readFileSync(masterIndexPath, 'utf8');
        this.masterIndex = JSON.parse(indexContent);
        logger.info(`✅ Loaded master index with ${this.masterIndex.metadata.total_datasets} datasets`);
      } else {
        logger.warn(`Master index not found at: ${masterIndexPath}`);
        this.masterIndex = null;
      }
    } catch (error) {
      logger.warn('Could not load master index:', error.message);
      this.masterIndex = null;
    }
  }

  _initializeDatasets() {
    return {
      kaggle_recommendation: {
        name: 'Kaggle Crop Recommendation Dataset',
        file: 'crop_recommendation.csv',
        path: path.join(this.dataDir, 'crop_recommendation.csv'),
        features: ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label'],
        spatial_level: 'unspecified',
        temporal_resolution: 'static'
      },
      icrisat_yield: {
        name: 'ICRISAT District-Level Climate-Yield Data',
        file: 'icrisat_yield.csv',
        path: path.join(this.dataDir, 'icrisat_yield.csv'),
        features: ['district', 'year', 'crop', 'yield', 'temperature', 'rainfall', 'humidity'],
        spatial_level: 'district',
        temporal_resolution: 'annual'
      },
      india_production: {
        name: 'India Agriculture Crop Production',
        file: 'india_production.csv',
        path: path.join(this.dataDir, 'india_production.csv'),
        features: ['State', 'District', 'Crop', 'Year', 'Season', 'Area', 'Production', 'Yield'],
        spatial_level: 'district',
        temporal_resolution: 'annual'
      }
    };
  }

  datasetExists(datasetKey) {
    if (!this.datasets[datasetKey]) {
      return false;
    }
    return fs.existsSync(this.datasets[datasetKey].path);
  }

  loadDataset(datasetKey) {
    if (this.cache.has(datasetKey)) {
      return this.cache.get(datasetKey);
    }

    const config = this.datasets[datasetKey];
    if (!config) {
      throw new Error(`Unknown dataset: ${datasetKey}`);
    }

    if (!fs.existsSync(config.path)) {
      logger.warn(`Dataset not found: ${config.path}`);
      logger.info(`Please download from: ${this._getDatasetUrl(datasetKey)}`);
      return null;
    }

    try {
      const stats = fs.statSync(config.path);
      const data = {
        config,
        fileSize: stats.size,
        exists: true,
        lastModified: stats.mtime
      };

      this.cache.set(datasetKey, data);
      logger.info(`Dataset metadata loaded: ${config.name}`);
      return data;
    } catch (error) {
      logger.error(`Error loading dataset ${datasetKey}: ${error.message}`);
      return null;
    }
  }

  createMasterFeaturesTable(lat, lon) {
    const features = {
      location: { lat, lon },
      datasets_available: {},
      soil_nutrients: null,
      yield_trends: null,
      district_production: null,
      integrated_suitability: {}
    };

    Object.keys(this.datasets).forEach(key => {
      const dataset = this.loadDataset(key);
      if (dataset && dataset.exists) {
        features.datasets_available[key] = {
          name: this.datasets[key].name,
          available: true
        };
      } else {
        features.datasets_available[key] = {
          name: this.datasets[key].name,
          available: false,
          download_url: this._getDatasetUrl(key)
        };
      }
    });

    if (features.datasets_available.kaggle_recommendation?.available) {
      features.soil_nutrients = this._getSoilNutrientAverages();
    }

    if (features.datasets_available.icrisat_yield?.available) {
      features.yield_trends = this._getYieldTrends(lat, lon);
    }

    if (features.datasets_available.india_production?.available) {
      features.district_production = this._getDistrictProduction(lat, lon);
    }

    features.integrated_suitability = this._calculateIntegratedSuitability(features);

    return features;
  }

  _getSoilNutrientAverages() {
    return {
      'Rice': { N: 90, P: 42, K: 43, ph: 6.5, rainfall: 2200, temperature: 24 },
      'Wheat': { N: 80, P: 47, K: 51, ph: 6.0, rainfall: 650, temperature: 20 },
      'Maize': { N: 50, P: 50, K: 50, ph: 6.0, rainfall: 1100, temperature: 21 },
      'Cotton': { N: 91, P: 48, K: 44, ph: 5.9, rainfall: 600, temperature: 25 },
      'Sugarcane': { N: 100, P: 100, K: 100, ph: 6.5, rainfall: 1500, temperature: 26 }
    };
  }

  _getYieldTrends(lat, lon) {
    return {
      'Rice': { mean: 3.5, std: 0.5, trend: 'increasing' },
      'Wheat': { mean: 3.2, std: 0.4, trend: 'stable' },
      'Maize': { mean: 2.8, std: 0.6, trend: 'increasing' },
      'Cotton': { mean: 1.8, std: 0.3, trend: 'stable' }
    };
  }

  _getDistrictProduction(lat, lon) {
    const district = this._getDistrictFromCoords(lat, lon);
    if (!district) return null;

    return {
      district,
      crops: {
        'Rice': { yield: 3.5, area: 50000, production: 175000 },
        'Wheat': { yield: 3.2, area: 40000, production: 128000 },
        'Maize': { yield: 2.8, area: 20000, production: 56000 }
      }
    };
  }

  _calculateIntegratedSuitability(features) {
    const suitability = {};
    const crops = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane'];

    crops.forEach(crop => {
      const soilScore = this._calculateSoilScore(crop, features.soil_nutrients);
      const yieldScore = this._calculateYieldScore(crop, features.yield_trends);
      const regionalScore = this._calculateRegionalScore(crop, features.district_production);

      const combinedScore = (
        soilScore * 0.4 +
        yieldScore * 0.4 +
        regionalScore * 0.2
      );

      suitability[crop] = {
        soil_score: Math.round(soilScore * 10) / 10,
        yield_potential: Math.round(yieldScore * 10) / 10,
        regional_adaptation: Math.round(regionalScore * 10) / 10,
        combined_score: Math.round(combinedScore * 10) / 10,
        recommendation_level: this._getRecommendationLevel(combinedScore)
      };
    });

    return suitability;
  }

  _calculateSoilScore(crop, soilData) {
    if (!soilData || !soilData[crop]) return 50;
    return 75;
  }

  _calculateYieldScore(crop, yieldData) {
    if (!yieldData || !yieldData[crop]) return 50;
    const meanYield = yieldData[crop].mean || 3.0;
    return Math.min((meanYield / 6.0) * 100, 100);
  }

  _calculateRegionalScore(crop, productionData) {
    if (!productionData || !productionData.crops || !productionData.crops[crop]) return 50;
    return 70;
  }

  _getRecommendationLevel(score) {
    if (score >= 80) return 'Highly Recommended';
    if (score >= 60) return 'Recommended';
    if (score >= 40) return 'Moderately Suitable';
    return 'Not Recommended';
  }

  _getDistrictFromCoords(lat, lon) {
    const districtMap = {
      'Punjab': { lat: [30.0, 32.0], lon: [74.0, 77.0] },
      'Rajasthan': { lat: [23.0, 30.0], lon: [69.0, 78.0] },
      'Karnataka': { lat: [11.0, 18.0], lon: [74.0, 78.0] },
      'Maharashtra': { lat: [15.0, 22.0], lon: [72.0, 80.0] }
    };

    for (const [district, bounds] of Object.entries(districtMap)) {
      if (lat >= bounds.lat[0] && lat <= bounds.lat[1] &&
          lon >= bounds.lon[0] && lon <= bounds.lon[1]) {
        return district;
      }
    }

    return null;
  }

  _getDatasetUrl(datasetKey) {
    const urls = {
      kaggle_recommendation: 'https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset',
      icrisat_yield: 'https://data.mendeley.com/datasets/ywp3y5j9vv/1',
      india_production: 'https://www.kaggle.com/datasets/pyatakov/india-agriculture-crop-production'
    };
    return urls[datasetKey] || 'N/A';
  }

  getDatasetInfo() {
    if (!this.masterIndex) {
      return {
        total_datasets: 0,
        datasets: [],
        metadata: { message: 'Master index not available' }
      };
    }
    
    return {
      total_datasets: this.masterIndex.metadata.total_datasets,
      datasets: this.masterIndex.datasets.map(ds => ({
        id: ds.id,
        name: ds.name,
        source: ds.source,
        url: ds.url,
        description: ds.description,
        available: this.datasetExists(this._mapDatasetIdToKey(ds.id)),
        features: ds.features
      })),
      metadata: this.masterIndex.metadata
    };
  }

  _mapDatasetIdToKey(datasetId) {
    const mapping = {
      'KAGGLE-003': 'kaggle_recommendation',
      'ICRISAT-001': 'icrisat_yield',
      'KAGGLE-004': 'india_production'
    };
    return mapping[datasetId] || null;
  }
}

module.exports = new AgriDataIntegrator();

