const MarketPrice = require('../models/MarketPrice');
const marketPriceAPIService = require('../services/marketPriceAPIService');
const logger = require('../utils/logger');
const ricePrices = require('../data/ricePrices');

class MarketController {
  // Get latest prices - uses real-time API
  static async getLatest(req, res) {
    try {
      // Default to 5000 to ensure all daily-use commodities are returned
      // With 70+ commodities and multiple markets/states, we need a high limit
      const { commodity, state, limit = 5000 } = req.query;
      
      // If commodity is specified, get real-time prices for that commodity
      if (commodity) {
        // Check if commodity is Rice - use comprehensive rice database
        const normalizedCommodity = commodity.toLowerCase().trim();
        if (normalizedCommodity === 'rice' || normalizedCommodity.includes('rice')) {
          try {
            let riceData = [...ricePrices.data];
            
            // Filter by state if specified
            if (state) {
              riceData = riceData.filter(price => {
                const priceState = (price.state || '').toLowerCase();
                const filterState = (state || '').toLowerCase();
                return priceState === filterState || 
                       priceState.includes(filterState) ||
                       filterState.includes(priceState);
              });
            }
            
            // Convert to expected format
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
              source: price.source || 'rice_database',
              minPrice: price.minPrice,
              maxPrice: price.maxPrice,
              arrivalQuantity: price.arrivalQuantity,
              organic: price.organic || false,
              exportQuality: price.exportQuality || false
            }));
            
            logger.info(`✅ Returning ${formattedPrices.length} rice prices from database${state ? ` for ${state}` : ''}`);
            return res.json({
              success: true,
              data: formattedPrices.slice(0, parseInt(limit)),
              source: 'rice_database',
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
            });
          } catch (riceError) {
            logger.error('Error loading rice prices:', riceError);
            // Fall through to real-time API
          }
        }
        
        // For other commodities or if rice database fails, use real-time API
        try {
          const realTimePrices = await marketPriceAPIService.getRealTimePrices(commodity, state);
          
          if (realTimePrices && realTimePrices.length > 0) {
            return res.json({
              success: true,
              data: realTimePrices.slice(0, parseInt(limit)),
              source: realTimePrices[0]?.source || 'realtime',
              message: `Real-time prices for ${commodity}`
            });
          }
        } catch (apiError) {
          logger.warn('Real-time API failed, falling back to database:', apiError.message);
        }
      }
      
      // If no commodity specified, get prices for all daily-use agricultural products
      if (!commodity) {
        try {
          logger.info('Fetching prices for all daily-use agricultural products across all states');
          const majorCommodities = [
            // Grains & Cereals
            'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Ragi',
            // Pulses & Legumes
            'Toor Dal', 'Moong Dal', 'Urad Dal', 'Chana Dal', 'Masoor Dal', 'Rajma',
            // Vegetables
            'Tomato', 'Potato', 'Onion', 'Brinjal', 'Cabbage', 'Cauliflower', 'Carrot', 'Radish', 
            'Ladyfinger', 'Bitter Gourd', 'Bottle Gourd', 'Pumpkin', 'Cucumber', 'Capsicum',
            'Green Beans', 'Peas', 'Spinach', 'Ginger', 'Garlic', 'Green Chili',
            // Fruits
            'Banana', 'Mango', 'Apple', 'Orange', 'Grapes', 'Pomegranate', 'Guava', 'Papaya',
            'Watermelon', 'Muskmelon', 'Lemon',
            // Spices
            'Turmeric', 'Red Chili', 'Coriander Seeds', 'Cumin', 'Mustard Seeds', 'Fenugreek',
            // Oilseeds
            'Groundnut', 'Mustard', 'Sunflower', 'Sesame', 'Soybean', 'Coconut',
            // Cash Crops
            'Cotton', 'Sugarcane', 'Jute',
            // Others
            'Sugar', 'Jaggery', 'Tea', 'Coffee'
          ];
          const allPrices = [];
          
          // Fetch prices for each commodity in parallel with timeout
          // When no state filter, generateMockPrices will create prices for all states
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
              // Return mock prices as fallback for this commodity (will include all states if no state filter)
              return marketPriceAPIService.generateMockPrices(comm, state);
            }
          });
          
          const results = await Promise.allSettled(pricePromises);
          results.forEach((result, index) => {
            const comm = majorCommodities[index];
            if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
              // Add real-time prices
              allPrices.push(...result.value);
              // Also add mock prices to ensure all states are covered
              // This ensures we have prices from all states even if real-time API only returns a few
              if (!state) { // Only supplement when no state filter
                const mockPrices = marketPriceAPIService.generateMockPrices(comm, null);
                allPrices.push(...mockPrices);
              }
            } else {
              // If failed, add mock prices for this commodity (will include all states)
              const mockPrices = marketPriceAPIService.generateMockPrices(comm, state);
              allPrices.push(...mockPrices);
            }
          });
          
          // Apply state filter if specified
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
          
          // Sort by commodity name for better organization
          filteredPrices.sort((a, b) => {
            const nameA = (a.commodity || '').toLowerCase();
            const nameB = (b.commodity || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          
          logger.info(`✅ Returning ${filteredPrices.length} prices for all commodities${state ? ` in ${state}` : ''}`);
          return res.json({
            success: true,
            data: filteredPrices.slice(0, parseInt(limit)),
            source: filteredPrices.some(p => p.source !== 'mock') ? 'realtime' : 'mock',
            message: `Prices for all commodities${state ? ` in ${state}` : ''} (${filteredPrices.length} entries)`
          });
        } catch (apiError) {
          logger.error('Error fetching prices for all commodities:', apiError.message);
          
          // Fallback: Generate mock prices for all daily-use agricultural products
          const majorCommodities = [
            // Grains & Cereals
            'Rice', 'Wheat', 'Maize', 'Bajra', 'Jowar', 'Ragi',
            // Pulses & Legumes
            'Toor Dal', 'Moong Dal', 'Urad Dal', 'Chana Dal', 'Masoor Dal', 'Rajma',
            // Vegetables
            'Tomato', 'Potato', 'Onion', 'Brinjal', 'Cabbage', 'Cauliflower', 'Carrot', 'Radish', 
            'Ladyfinger', 'Bitter Gourd', 'Bottle Gourd', 'Pumpkin', 'Cucumber', 'Capsicum',
            'Green Beans', 'Peas', 'Spinach', 'Ginger', 'Garlic', 'Green Chili',
            // Fruits
            'Banana', 'Mango', 'Apple', 'Orange', 'Grapes', 'Pomegranate', 'Guava', 'Papaya',
            'Watermelon', 'Muskmelon', 'Lemon',
            // Spices
            'Turmeric', 'Red Chili', 'Coriander Seeds', 'Cumin', 'Mustard Seeds', 'Fenugreek',
            // Oilseeds
            'Groundnut', 'Mustard', 'Sunflower', 'Sesame', 'Soybean', 'Coconut',
            // Cash Crops
            'Cotton', 'Sugarcane', 'Jute',
            // Others
            'Sugar', 'Jaggery', 'Tea', 'Coffee'
          ];
          const allMockPrices = [];
          
          for (const comm of majorCommodities) {
            const mockPrices = marketPriceAPIService.generateMockPrices(comm, state);
            allMockPrices.push(...mockPrices);
          }
          
          // Apply state filter if specified
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
          return res.json({
            success: true,
            data: filteredMockPrices.slice(0, parseInt(limit)),
            source: 'mock',
            message: `Mock prices for all commodities${state ? ` in ${state}` : ''} (fallback)`
          });
        }
      }
      
      // If we reach here, commodity was specified but real-time API didn't return data
      // Try database or return mock data
      if (commodity) {
        // Check if MarketPrice model is available
        if (MarketPrice && typeof MarketPrice.find === 'function') {
          try {
            const query = { commodity: { $regex: new RegExp(commodity, 'i') } };
            if (state) {
              query['location.state'] = { $regex: new RegExp(state, 'i') };
            }
            const prices = await MarketPrice.find(query)
              .sort({ recordedAt: -1 })
              .limit(parseInt(limit))
              .catch(() => []);
            
            if (prices && prices.length > 0) {
              return res.json({
                success: true,
                data: prices,
                source: 'database'
              });
            }
          } catch (err) {
            logger.warn('Database query failed:', err.message);
          }
        }
        
        // Fallback to mock prices
        const mockPrices = marketPriceAPIService.generateMockPrices(commodity, state);
        return res.json({
          success: true,
          data: mockPrices,
          source: 'mock'
        });
      }
    } catch (error) {
      logger.error('Error fetching market prices:', error);
      // Return mock prices for all commodities if error
      const majorCommodities = ['Wheat', 'Rice', 'Maize', 'Tomato', 'Potato', 'Onion', 'Cotton', 'Sugarcane'];
      const allMockPrices = [];
      
      for (const comm of majorCommodities) {
        const mockPrices = marketPriceAPIService.generateMockPrices(comm);
        allMockPrices.push(...mockPrices);
      }
      
      res.json({
        success: true,
        data: allMockPrices.slice(0, 100),
        source: 'mock',
        message: 'Mock prices (error fallback)'
      });
    }
  }
  
  // Get price trends with prediction - uses real-time API
  static async getTrends(req, res) {
    try {
      const { commodity, days = 30 } = req.query;
      
      if (!commodity) {
        return res.status(400).json({
          success: false,
          error: 'Commodity is required'
        });
      }
      
      // Get real-time trends with prediction
      try {
        const trends = await marketPriceAPIService.getPriceTrends(commodity, parseInt(days));
        
        if (trends) {
          return res.json({
            success: true,
            data: trends,
            source: 'realtime',
            message: `Price trends and predictions for ${commodity}`
          });
        }
      } catch (apiError) {
        logger.warn('Real-time trends API failed, using fallback:', apiError.message);
      }
      
      // Fallback to database or mock data
      let trends;
      try {
        if (MarketPrice && typeof MarketPrice.getPriceTrends === 'function') {
          trends = await MarketPrice.getPriceTrends(commodity, parseInt(days));
        } else {
          throw new Error('getPriceTrends not available');
        }
      } catch (err) {
        // Generate fallback trend data
        trends = await marketPriceAPIService.getPriceTrends(commodity, parseInt(days));
      }
      
      res.json({
        success: true,
        data: trends,
        source: 'fallback'
      });
    } catch (error) {
      logger.error('Error fetching price trends:', error);
      // Return fallback data
      const trends = await marketPriceAPIService.getPriceTrends(req.query.commodity, parseInt(req.query.days) || 30);
      res.json({
        success: true,
        data: trends,
        source: 'fallback'
      });
    }
  }
  
  // Create market price
  static async create(req, res) {
    try {
      const { lat, lng, ...priceData } = req.body;
      
      if (lat && lng) {
        priceData.location = {
          ...priceData.location,
          coordinates: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          }
        };
      }
      
      const marketPrice = new MarketPrice({
        ...priceData,
        recordedAt: priceData.recordedAt || new Date()
      });
      
      await marketPrice.save();
      
      res.status(201).json({
        success: true,
        data: marketPrice
      });
    } catch (error) {
      logger.error('Error creating market price:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get list of commodities
  static async getCommodities(req, res) {
    try {
      const commodities = [
        // Grains & Cereals
        { name: 'Rice', category: 'Grains & Cereals' },
        { name: 'Wheat', category: 'Grains & Cereals' },
        { name: 'Maize', category: 'Grains & Cereals' },
        { name: 'Bajra', category: 'Grains & Cereals' },
        { name: 'Jowar', category: 'Grains & Cereals' },
        { name: 'Ragi', category: 'Grains & Cereals' },
        
        // Pulses & Legumes
        { name: 'Toor Dal', category: 'Pulses & Legumes' },
        { name: 'Moong Dal', category: 'Pulses & Legumes' },
        { name: 'Urad Dal', category: 'Pulses & Legumes' },
        { name: 'Chana Dal', category: 'Pulses & Legumes' },
        { name: 'Masoor Dal', category: 'Pulses & Legumes' },
        { name: 'Rajma', category: 'Pulses & Legumes' },
        
        // Vegetables
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
        
        // Fruits
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
        
        // Spices
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
        
        // Oilseeds
        { name: 'Groundnut', category: 'Oilseeds' },
        { name: 'Mustard', category: 'Oilseeds' },
        { name: 'Sunflower', category: 'Oilseeds' },
        { name: 'Sesame', category: 'Oilseeds' },
        { name: 'Soybean', category: 'Oilseeds' },
        { name: 'Coconut', category: 'Oilseeds' },
        
        // Cash Crops
        { name: 'Cotton', category: 'Cash Crops' },
        { name: 'Sugarcane', category: 'Cash Crops' },
        { name: 'Jute', category: 'Cash Crops' },
        
        // Others
        { name: 'Sugar', category: 'Others' },
        { name: 'Jaggery', category: 'Others' },
        { name: 'Tea', category: 'Others' },
        { name: 'Coffee', category: 'Others' }
      ];
      
      res.json({
        success: true,
        data: commodities
      });
    } catch (error) {
      logger.error('Error fetching commodities:', error);
      res.json({
        success: true,
        data: [
          { name: 'Wheat', category: 'Cereals' },
          { name: 'Rice', category: 'Cereals' },
          { name: 'Maize', category: 'Cereals' }
        ]
      });
    }
  }

  // Get price by ID
  static async getById(req, res) {
    try {
      const price = await MarketPrice.findById(req.params.id);
      
      if (!price) {
        return res.status(404).json({
          success: false,
          error: 'Market price not found'
        });
      }
      
      res.json({
        success: true,
        data: price
      });
    } catch (error) {
      logger.error('Error fetching market price:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = MarketController;
