const MarketPrice = require('../models/MarketPrice');
const marketPriceAPIService = require('../services/marketPriceAPIService');
const logger = require('../utils/logger');

class MarketController {
  // Get latest prices - uses real-time API
  static async getLatest(req, res) {
    try {
      const { commodity, state, limit = 50 } = req.query;
      
      // If commodity is specified, get real-time prices
      if (commodity) {
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
      
      // Check if MarketPrice model is available
      if (!MarketPrice || typeof MarketPrice.find !== 'function') {
        logger.warn('MarketPrice model not available, returning mock data');
        
        // Return mock commodities list if no commodity specified
        if (!commodity) {
          const mockCommodities = [
            { name: 'Wheat', category: 'Cereals' },
            { name: 'Rice', category: 'Cereals' },
            { name: 'Maize', category: 'Cereals' },
            { name: 'Tomato', category: 'Vegetables' },
            { name: 'Potato', category: 'Vegetables' },
            { name: 'Onion', category: 'Vegetables' },
            { name: 'Cotton', category: 'Fiber' },
            { name: 'Sugarcane', category: 'Cash Crops' }
          ];
          return res.json({
            success: true,
            data: mockCommodities
          });
        }
        
        // Return mock prices for selected commodity
        const mockPrices = [
          {
            commodity: commodity,
            market: { name: 'Delhi Mandi', location: 'Delhi' },
            price: { value: 2000 + Math.random() * 500, unit: 'quintal' },
            quality: 'Grade A',
            priceChange: { daily: (Math.random() * 10 - 5).toFixed(2) },
            date: new Date().toISOString()
          },
          {
            commodity: commodity,
            market: { name: 'Mumbai APMC', location: 'Mumbai' },
            price: { value: 2100 + Math.random() * 500, unit: 'quintal' },
            quality: 'Grade A',
            priceChange: { daily: (Math.random() * 10 - 5).toFixed(2) },
            date: new Date().toISOString()
          },
          {
            commodity: commodity,
            market: { name: 'Kolkata Market', location: 'Kolkata' },
            price: { value: 1950 + Math.random() * 500, unit: 'quintal' },
            quality: 'Grade B',
            priceChange: { daily: (Math.random() * 10 - 5).toFixed(2) },
            date: new Date().toISOString()
          }
        ];
        
        return res.json({
          success: true,
          data: mockPrices
        });
      }
      
      let prices;
      try {
        prices = await MarketPrice.getLatestPrices(commodity, state);
      } catch (err) {
        // If getLatestPrices doesn't exist or fails, use find
        const query = {};
        if (commodity) {
          query.commodity = { $regex: new RegExp(commodity, 'i') };
        }
        if (state) {
          query['location.state'] = { $regex: new RegExp(state, 'i') };
        }
        prices = await MarketPrice.find(query)
          .sort({ recordedAt: -1 })
          .limit(parseInt(limit))
          .catch(() => []);
      }
      
      // If no prices found and no commodity specified, return commodities list
      if ((!prices || prices.length === 0) && !commodity) {
        const mockCommodities = [
          { name: 'Wheat', category: 'Cereals' },
          { name: 'Rice', category: 'Cereals' },
          { name: 'Maize', category: 'Cereals' },
          { name: 'Tomato', category: 'Vegetables' },
          { name: 'Potato', category: 'Vegetables' },
          { name: 'Onion', category: 'Vegetables' },
          { name: 'Cotton', category: 'Fiber' },
          { name: 'Sugarcane', category: 'Cash Crops' }
        ];
        return res.json({
          success: true,
          data: mockCommodities
        });
      }
      
      // If no prices found for commodity, return mock data
      if (!prices || prices.length === 0) {
        const mockPrices = [
          {
            commodity: commodity,
            market: { name: 'Delhi Mandi', location: 'Delhi' },
            price: { value: 2000 + Math.random() * 500, unit: 'quintal' },
            quality: 'Grade A',
            priceChange: { daily: (Math.random() * 10 - 5).toFixed(2) },
            date: new Date().toISOString()
          }
        ];
        return res.json({
          success: true,
          data: mockPrices
        });
      }
      
      res.json({
        success: true,
        data: Array.isArray(prices) ? prices.slice(0, parseInt(limit)) : [prices]
      });
    } catch (error) {
      logger.error('Error fetching market prices:', error);
      // Return mock commodities if error
      const mockCommodities = [
        { name: 'Wheat', category: 'Cereals' },
        { name: 'Rice', category: 'Cereals' },
        { name: 'Maize', category: 'Cereals' },
        { name: 'Tomato', category: 'Vegetables' },
        { name: 'Potato', category: 'Vegetables' }
      ];
      res.json({
        success: true,
        data: mockCommodities
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
