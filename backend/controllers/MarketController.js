const mongoose = require('mongoose');
const MarketPrice = require('../models/MarketPrice');
const marketPriceAPIService = require('../services/marketPriceAPIService');
const logger = require('../utils/logger');
const ricePrices = require('../data/ricePrices');
const { badRequest, notFound, serverError, serviceUnavailable, ok } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

class MarketController {
  static success(res, data, { isFallback = false, source = 'AgriSmart AI', degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static parsePositiveInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  static parseCoordinates(lat, lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) return null;
    return { lat: parsedLat, lng: parsedLng };
  }

  static async getLatest(req, res) {
    try {
      const { commodity, state, limit = 5000 } = req.query;
      const safeLimit = MarketController.parsePositiveInt(limit, 5000, { min: 1, max: 5000 });
      
      if (commodity) {
        const normalizedCommodity = commodity.toLowerCase().trim();
        if (normalizedCommodity === 'rice' || normalizedCommodity.includes('rice')) {
          try {
            let riceData = [...ricePrices.data];
            
            if (state) {
              riceData = riceData.filter(price => {
                const priceState = (price.state || '').toLowerCase();
                const filterState = (state || '').toLowerCase();
                return priceState === filterState || 
                       priceState.includes(filterState) ||
                       filterState.includes(priceState);
              });
            }
            
            const formattedPrices = riceData.map(price => ({
              id: price.id,
              commodity: price.commodity,
              name: price.commodity,
              variety: price.variety,
              market: {
                name: price.market,
                location: price.district,
                state: price.state
              },
              price: {
                value: price.pricePerKg,
                unit: 'kg',
                originalValue: price.pricePerKg,
                originalUnit: 'kg'
              },
              quality: price.quality,
              priceChange: {
                daily: parseFloat(price.priceChange?.replace('%', '') || '0'),
                weekly: parseFloat(price.priceChange?.replace('%', '') || '0') * 7
              },
              state: price.state,
              district: price.district,
              date: price.date,
              recordedAt: price.date,
              timestamp: price.date,
              source: 'AgriSmart AI',
              minPrice: price.minPrice,
              maxPrice: price.maxPrice,
              arrivalQuantity: price.arrivalQuantity,
              organic: price.organic || false,
              exportQuality: price.exportQuality || false
            }));
            
            logger.info(`✅ Returning ${formattedPrices.length} rice prices from database${state ? ` for ${state}` : ''}`);
            return MarketController.success(res, formattedPrices.slice(0, safeLimit), {
              extra: {
                message: `Rice prices from comprehensive database${state ? ` in ${state}` : ' (all states)'} (${formattedPrices.length} entries)`,
                summary: {
                total: formattedPrices.length,
                averagePrice: formattedPrices.length > 0 
                  ? (formattedPrices.reduce((sum, p) => sum + p.price.value, 0) / formattedPrices.length).toFixed(2)
                  : 0,
                minPrice: formattedPrices.length > 0 
                  ? Math.min(...formattedPrices.map(p => p.price.value))
                  : 0,
                maxPrice: formattedPrices.length > 0 
                  ? Math.max(...formattedPrices.map(p => p.price.value))
                  : 0
                }
              }
            });
          } catch (riceError) {
            logger.error('Error loading rice prices:', riceError);
          }
        }
        
        try {
          const realTimePrices = await marketPriceAPIService.getRealTimePrices(commodity, state);
          
          if (realTimePrices && realTimePrices.length > 0) {
            return MarketController.success(res, realTimePrices.slice(0, safeLimit), {
              extra: {
                message: `Real-time prices for ${commodity}`
              }
            });
          }
        } catch (apiError) {
          logger.warn('Real-time API failed, falling back to database:', apiError.message);
        }
      }
      
      if (!commodity) {
        const fastCommodities = [
          'Rice', 'Wheat', 'Maize', 'Tomato', 'Potato', 'Onion',
          'Toor Dal', 'Moong Dal', 'Groundnut', 'Mustard', 'Cotton', 'Sugarcane'
        ];
        const quickPrices = [];
        for (const comm of fastCommodities) {
          quickPrices.push(...marketPriceAPIService.generateMockPrices(comm, state));
        }

        return MarketController.success(res, quickPrices.slice(0, safeLimit), {
          isFallback: true,
          degradedReason: 'market_provider_bypassed',
          extra: {
            message: `Prices for daily-use commodities${state ? ` in ${state}` : ''}`
          }
        });
      }

      if (!commodity && process.env.MARKET_ENABLE_SLOW_FETCH === 'true') {
        try {
          logger.info('Fetching prices for all daily-use agricultural products across all states');
          const majorCommodities = [
            'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Ragi',
            'Toor Dal', 'Moong Dal', 'Urad Dal', 'Chana Dal', 'Masoor Dal', 'Rajma',
            'Tomato', 'Potato', 'Onion', 'Brinjal', 'Cabbage', 'Cauliflower', 'Carrot', 'Radish', 
            'Ladyfinger', 'Bitter Gourd', 'Bottle Gourd', 'Pumpkin', 'Cucumber', 'Capsicum',
            'Green Beans', 'Peas', 'Spinach', 'Ginger', 'Garlic', 'Green Chili',
            'Banana', 'Mango', 'Apple', 'Orange', 'Grapes', 'Pomegranate', 'Guava', 'Papaya',
            'Watermelon', 'Muskmelon', 'Lemon',
            'Turmeric', 'Red Chili', 'Coriander Seeds', 'Cumin', 'Mustard Seeds', 'Fenugreek',
            'Groundnut', 'Mustard', 'Sunflower', 'Sesame', 'Soybean', 'Coconut',
            'Cotton', 'Sugarcane', 'Jute',
            'Sugar', 'Jaggery', 'Tea', 'Coffee'
          ];
          const allPrices = [];
          
          const pricePromises = majorCommodities.map(async (comm) => {
            try {
              const prices = await Promise.race([
                marketPriceAPIService.getRealTimePrices(comm, state),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 8000)
                )
              ]);
              return prices || [];
            } catch (error) {
              logger.warn(`Failed to fetch prices for ${comm}:`, error.message);
              return marketPriceAPIService.generateMockPrices(comm, state);
            }
          });
          
          const results = await Promise.allSettled(pricePromises);
          results.forEach((result, index) => {
            const comm = majorCommodities[index];
            if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
              allPrices.push(...result.value);
              if (!state) { // Only supplement when no state filter
                const mockPrices = marketPriceAPIService.generateMockPrices(comm, null);
                allPrices.push(...mockPrices);
              }
            } else {
              const mockPrices = marketPriceAPIService.generateMockPrices(comm, state);
              allPrices.push(...mockPrices);
            }
          });
          
          let filteredPrices = allPrices;
          if (state) {
            filteredPrices = allPrices.filter(price => {
              const priceState = price.state || price.market?.state || price.market?.location || '';
              const stateLower = (state || '').toLowerCase();
              const priceStateLower = priceState.toLowerCase();
              return priceStateLower === stateLower || 
                     priceStateLower.includes(stateLower) ||
                     stateLower.includes(priceStateLower);
            });
            logger.info(`✅ Filtered to ${filteredPrices.length} prices for state: ${state}`);
          }
          
          filteredPrices.sort((a, b) => {
            const nameA = (a.commodity || '').toLowerCase();
            const nameB = (b.commodity || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          
          logger.info(`✅ Returning ${filteredPrices.length} prices for all commodities${state ? ` in ${state}` : ''}`);
          return MarketController.success(res, filteredPrices.slice(0, safeLimit), {
            extra: {
              message: `Prices for all commodities${state ? ` in ${state}` : ''} (${filteredPrices.length} entries)`
            }
          });
        } catch (apiError) {
          logger.error('Error fetching prices for all commodities:', apiError.message);
          
          const majorCommodities = [
            'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Ragi',
            'Toor Dal', 'Moong Dal', 'Urad Dal', 'Chana Dal', 'Masoor Dal', 'Rajma',
            'Tomato', 'Potato', 'Onion', 'Brinjal', 'Cabbage', 'Cauliflower', 'Carrot', 'Radish', 
            'Ladyfinger', 'Bitter Gourd', 'Bottle Gourd', 'Pumpkin', 'Cucumber', 'Capsicum',
            'Green Beans', 'Peas', 'Spinach', 'Ginger', 'Garlic', 'Green Chili',
            'Banana', 'Mango', 'Apple', 'Orange', 'Grapes', 'Pomegranate', 'Guava', 'Papaya',
            'Watermelon', 'Muskmelon', 'Lemon',
            'Turmeric', 'Red Chili', 'Coriander Seeds', 'Cumin', 'Mustard Seeds', 'Fenugreek',
            'Groundnut', 'Mustard', 'Sunflower', 'Sesame', 'Soybean', 'Coconut',
            'Cotton', 'Sugarcane', 'Jute',
            'Sugar', 'Jaggery', 'Tea', 'Coffee'
          ];
          const allMockPrices = [];
          
          for (const comm of majorCommodities) {
            const mockPrices = marketPriceAPIService.generateMockPrices(comm, state);
            allMockPrices.push(...mockPrices);
          }
          
          let filteredMockPrices = allMockPrices;
          if (state) {
            filteredMockPrices = allMockPrices.filter(price => {
              const priceState = price.state || price.market?.state || price.market?.location || '';
              const stateLower = (state || '').toLowerCase();
              const priceStateLower = priceState.toLowerCase();
              return priceStateLower === stateLower || 
                     priceStateLower.includes(stateLower) ||
                     stateLower.includes(priceStateLower);
            });
          }
          
          logger.info(`Returning ${filteredMockPrices.length} mock prices as fallback${state ? ` for ${state}` : ''}`);
          return MarketController.success(res, filteredMockPrices.slice(0, safeLimit), {
            isFallback: true,
            degradedReason: 'market_provider_unavailable',
            extra: {
              message: `Prices for all commodities${state ? ` in ${state}` : ''}`
            }
          });
        }
      }
      
      if (commodity) {
        if (MarketPrice && typeof MarketPrice.find === 'function' && mongoReady()) {
          try {
            const query = { commodity: { $regex: new RegExp(commodity, 'i') } };
            if (state) {
              query['location.state'] = { $regex: new RegExp(state, 'i') };
            }
            const prices = await MarketPrice.find(query)
              .sort({ recordedAt: -1 })
              .limit(safeLimit)
              .catch(() => []);
            
            if (prices && prices.length > 0) {
              return MarketController.success(res, prices);
            }
          } catch (err) {
            logger.warn('Database query failed:', err.message);
          }
        }
        
        const mockPrices = marketPriceAPIService.generateMockPrices(commodity, state);
        return MarketController.success(res, mockPrices, {
          isFallback: true,
          degradedReason: 'market_data_unavailable'
        });
      }
    } catch (error) {
      logger.error('Error fetching market prices:', error);
      const majorCommodities = ['Wheat', 'Rice', 'Maize', 'Tomato', 'Potato', 'Onion', 'Cotton', 'Sugarcane'];
      const allMockPrices = [];
      
      for (const comm of majorCommodities) {
        const mockPrices = marketPriceAPIService.generateMockPrices(comm);
        allMockPrices.push(...mockPrices);
      }
      
      return MarketController.success(res, allMockPrices.slice(0, 100), {
        isFallback: true,
        degradedReason: 'market_controller_error',
        extra: {
          message: 'Prices (fallback)'
        }
      });
    }
  }
  
  static async getTrends(req, res) {
    try {
      const { commodity, days = 30 } = req.query;
      const safeDays = MarketController.parsePositiveInt(days, 30, { min: 1, max: 365 });
      
      if (!commodity) {
        return badRequest(res, 'Commodity is required');
      }
      
      try {
        const trends = await marketPriceAPIService.getPriceTrends(commodity, safeDays);
        
        if (trends) {
          return MarketController.success(res, trends, {
            extra: {
              message: `Price trends and predictions for ${commodity}`
            }
          });
        }
      } catch (apiError) {
        logger.warn('Real-time trends API failed, using fallback:', apiError.message);
      }
      
      let trends;
      try {
        if (MarketPrice && typeof MarketPrice.getPriceTrends === 'function') {
          trends = await MarketPrice.getPriceTrends(commodity, safeDays);
        } else {
          throw new Error('getPriceTrends not available');
        }
      } catch (err) {
        trends = await marketPriceAPIService.getPriceTrends(commodity, safeDays);
      }
      
      return MarketController.success(res, trends);
    } catch (error) {
      logger.error('Error fetching price trends:', error);
      const fallbackDays = MarketController.parsePositiveInt(req.query.days, 30, { min: 1, max: 365 });
      const trends = await marketPriceAPIService.getPriceTrends(req.query.commodity, fallbackDays);
      return MarketController.success(res, trends, {
        isFallback: true,
        degradedReason: 'market_trends_error'
      });
    }
  }

  static async create(req, res) {
    try {
      if (!MarketPrice || !mongoReady()) {
        return serviceUnavailable(res, 'Market price store unavailable; cannot persist right now', { degradedReason: 'mongo_unavailable' });
      }
      const { lat, lng, ...priceData } = req.body || {};
      
      if (lat && lng) {
        const coordinates = MarketController.parseCoordinates(lat, lng);
        if (!coordinates) {
          return badRequest(res, 'Invalid latitude/longitude values');
        }
        priceData.location = {
          ...priceData.location,
          coordinates: {
            type: 'Point',
            coordinates: [coordinates.lng, coordinates.lat]
          }
        };
      }
      
      const marketPrice = new MarketPrice({
        ...priceData,
        recordedAt: priceData.recordedAt || new Date()
      });
      
      await marketPrice.save();
      
      return res.status(201).json({
        success: true,
        data: marketPrice
      });
    } catch (error) {
      logger.error('Error creating market price:', error);
      return badRequest(res, error.message);
    }
  }
  
  static async getCommodities(req, res) {
    try {
      const commodities = [
        { name: 'Rice', category: 'Grains & Cereals' },
        { name: 'Wheat', category: 'Grains & Cereals' },
        { name: 'Maize', category: 'Grains & Cereals' },
        { name: 'Bajra', category: 'Grains & Cereals' },
        { name: 'Jowar', category: 'Grains & Cereals' },
        { name: 'Ragi', category: 'Grains & Cereals' },
        
        { name: 'Toor Dal', category: 'Pulses & Legumes' },
        { name: 'Moong Dal', category: 'Pulses & Legumes' },
        { name: 'Urad Dal', category: 'Pulses & Legumes' },
        { name: 'Chana Dal', category: 'Pulses & Legumes' },
        { name: 'Masoor Dal', category: 'Pulses & Legumes' },
        { name: 'Rajma', category: 'Pulses & Legumes' },
        
        { name: 'Tomato', category: 'Vegetables' },
        { name: 'Potato', category: 'Vegetables' },
        { name: 'Onion', category: 'Vegetables' },
        { name: 'Brinjal', category: 'Vegetables' },
        { name: 'Cabbage', category: 'Vegetables' },
        { name: 'Cauliflower', category: 'Vegetables' },
        { name: 'Carrot', category: 'Vegetables' },
        { name: 'Radish', category: 'Vegetables' },
        { name: 'Ladyfinger', category: 'Vegetables' },
        { name: 'Bitter Gourd', category: 'Vegetables' },
        { name: 'Bottle Gourd', category: 'Vegetables' },
        { name: 'Pumpkin', category: 'Vegetables' },
        { name: 'Cucumber', category: 'Vegetables' },
        { name: 'Capsicum', category: 'Vegetables' },
        { name: 'Green Beans', category: 'Vegetables' },
        { name: 'Peas', category: 'Vegetables' },
        { name: 'Spinach', category: 'Vegetables' },
        { name: 'Ginger', category: 'Vegetables' },
        { name: 'Garlic', category: 'Vegetables' },
        { name: 'Green Chili', category: 'Vegetables' },
        
        { name: 'Banana', category: 'Fruits' },
        { name: 'Mango', category: 'Fruits' },
        { name: 'Apple', category: 'Fruits' },
        { name: 'Orange', category: 'Fruits' },
        { name: 'Grapes', category: 'Fruits' },
        { name: 'Pomegranate', category: 'Fruits' },
        { name: 'Guava', category: 'Fruits' },
        { name: 'Papaya', category: 'Fruits' },
        { name: 'Watermelon', category: 'Fruits' },
        { name: 'Muskmelon', category: 'Fruits' },
        { name: 'Lemon', category: 'Fruits' },
        
        { name: 'Turmeric', category: 'Spices' },
        { name: 'Red Chili', category: 'Spices' },
        { name: 'Coriander Seeds', category: 'Spices' },
        { name: 'Cumin', category: 'Spices' },
        { name: 'Mustard Seeds', category: 'Spices' },
        { name: 'Fenugreek', category: 'Spices' },
        { name: 'Black Pepper', category: 'Spices' },
        { name: 'Cardamom', category: 'Spices' },
        { name: 'Cloves', category: 'Spices' },
        { name: 'Cinnamon', category: 'Spices' },
        
        { name: 'Groundnut', category: 'Oilseeds' },
        { name: 'Mustard', category: 'Oilseeds' },
        { name: 'Sunflower', category: 'Oilseeds' },
        { name: 'Sesame', category: 'Oilseeds' },
        { name: 'Soybean', category: 'Oilseeds' },
        { name: 'Coconut', category: 'Oilseeds' },
        
        { name: 'Cotton', category: 'Cash Crops' },
        { name: 'Sugarcane', category: 'Cash Crops' },
        { name: 'Jute', category: 'Cash Crops' },
        
        { name: 'Sugar', category: 'Others' },
        { name: 'Jaggery', category: 'Others' },
        { name: 'Tea', category: 'Others' },
        { name: 'Coffee', category: 'Others' }
      ];
      
      return MarketController.success(res, commodities);
    } catch (error) {
      logger.error('Error fetching commodities:', error);
      return MarketController.success(
        res,
        [
          { name: 'Wheat', category: 'Cereals' },
          { name: 'Rice', category: 'Cereals' },
          { name: 'Maize', category: 'Cereals' }
        ],
        { isFallback: true, degradedReason: 'market_commodities_fallback' }
      );
    }
  }

  static async getById(req, res) {
    try {
      if (!MarketPrice || !mongoReady()) {
        return serviceUnavailable(res, 'Market price store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      const price = await MarketPrice.findById(req.params.id);
      
      if (!price) {
        return notFound(res, 'Market price not found');
      }
      
      return MarketController.success(res, price);
    } catch (error) {
      logger.error('Error fetching market price:', error);
      return serverError(res, error.message);
    }
  }
}

module.exports = MarketController;
