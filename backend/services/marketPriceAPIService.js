const axios = require('axios');
const logger = require('../utils/logger');
const apiErrorHandler = require('./api/apiErrorHandler');
const fallbackManager = require('./api/fallbackManager');
const ricePrices = require('../data/ricePrices');

class MarketPriceAPIService {
  constructor() {
    this.apis = {
      agmarknet: 'https://agmarknet.gov.in/api/price/CommodityDatewisePrice',
      dataGovIn: 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
      mandi: 'https://api.mandirate.com/v1/prices',
      ncdex: 'https://www.ncdex.com/api/marketdata',
      fallback: true
    };
    
    this.apiKeys = {
      agmarknet: process.env.AGMARKNET_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
      dataGovIn: process.env.DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b'
    };
    
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getStateCapital(state) {
    const capitals = {
      'Andhra Pradesh': 'Amaravati',
      'Arunachal Pradesh': 'Itanagar',
      'Assam': 'Dispur',
      'Bihar': 'Patna',
      'Chhattisgarh': 'Raipur',
      'Goa': 'Panaji',
      'Gujarat': 'Gandhinagar',
      'Haryana': 'Chandigarh',
      'Himachal Pradesh': 'Shimla',
      'Jharkhand': 'Ranchi',
      'Karnataka': 'Bangalore',
      'Kerala': 'Thiruvananthapuram',
      'Madhya Pradesh': 'Bhopal',
      'Maharashtra': 'Mumbai',
      'Manipur': 'Imphal',
      'Meghalaya': 'Shillong',
      'Mizoram': 'Aizawl',
      'Nagaland': 'Kohima',
      'Odisha': 'Bhubaneswar',
      'Punjab': 'Chandigarh',
      'Rajasthan': 'Jaipur',
      'Sikkim': 'Gangtok',
      'Tamil Nadu': 'Chennai',
      'Telangana': 'Hyderabad',
      'Tripura': 'Agartala',
      'Uttar Pradesh': 'Lucknow',
      'Uttarakhand': 'Dehradun',
      'West Bengal': 'Kolkata',
      'Andaman and Nicobar Islands': 'Port Blair',
      'Chandigarh': 'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu': 'Daman',
      'Delhi': 'Delhi',
      'Jammu and Kashmir': 'Srinagar',
      'Ladakh': 'Leh',
      'Lakshadweep': 'Kavaratti',
      'Puducherry': 'Puducherry'
    };
    return capitals[state] || state.split(' ')[0]; // Return capital or first word
  }

  convertToPerKg(price, unit) {
    if (!price || isNaN(price)) return 0;
    
    const unitLower = (unit || '').toLowerCase();
    
    if (unitLower.includes('kg') || unitLower === 'kilogram') {
      return parseFloat(price);
    } else if (unitLower.includes('quintal') || unitLower === 'q') {
      return parseFloat(price) / 100; // 1 quintal = 100 kg
    } else if (unitLower.includes('ton') || unitLower === 't') {
      return parseFloat(price) / 1000; // 1 ton = 1000 kg
    } else if (unitLower.includes('tonne')) {
      return parseFloat(price) / 1000; // 1 tonne = 1000 kg
    }
    
    return parseFloat(price);
  }

  async getAgMarkNetPrices(commodity, state) {
    try {
      const apiKey = this.apiKeys.dataGovIn;
      
      const filters = {};
      if (commodity) {
        filters.commodity = commodity;
      }
      if (state) {
        filters.state = state;
      }
      
      const endpoints = [
        {
          url: this.apis.dataGovIn,
          params: {
            'api-key': apiKey,
            format: 'json',
            limit: 500, // Increased limit for more data
            offset: 0,
            ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) })
          }
        },
        {
          url: 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
          params: {
            'api-key': apiKey,
            format: 'json',
            limit: 500,
            offset: 0,
            ...(Object.keys(filters).length > 0 && { filters: JSON.stringify(filters) })
          }
        }
      ];
      
      let response = null;
      for (const endpoint of endpoints) {
        try {
          response = await axios.get(endpoint.url, {
            params: endpoint.params,
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'AgriSmart-AI/1.0'
            }
          });
          if (response.data && response.data.records && response.data.records.length > 0) {
            break; // Success, use this response
          }
        } catch (err) {
          logger.debug(`Endpoint ${endpoint.url} failed, trying next...`);
          continue;
        }
      }
      
      if (!response) {
        logger.warn('All Data.gov.in AgMarkNet endpoints failed, using fallback');
        return [];
      }

      if (response.data && response.data.records && Array.isArray(response.data.records) && response.data.records.length > 0) {
        const prices = response.data.records
          .filter(item => item.modal_price || item.price) // Only include items with valid prices
          .map((item, index) => {
            const modalPrice = parseFloat(item.modal_price || item.price || 0);
            const minPrice = parseFloat(item.min_price || modalPrice || 0);
            const maxPrice = parseFloat(item.max_price || modalPrice || 0);
            
            return {
              id: `agmarknet_${item.market}_${item.commodity}_${index}_${Date.now()}`,
              commodity: item.commodity || commodity || 'Unknown',
              variety: item.variety || '',
              market: {
                name: item.market || 'Unknown Market',
                location: item.state || state || 'Unknown',
                district: item.district || '',
                state: item.state || state || 'Unknown'
              },
              price: {
                value: this.convertToPerKg(modalPrice, 'quintal'),
                unit: 'kg',
                originalValue: modalPrice,
                originalUnit: 'quintal',
                minPrice: this.convertToPerKg(minPrice, 'quintal'),
                maxPrice: this.convertToPerKg(maxPrice, 'quintal')
              },
              quality: item.grade || item.variety || 'Standard',
              priceChange: {
                daily: this.calculatePriceChange(modalPrice, minPrice, maxPrice),
                weekly: 0
              },
              state: item.state || state || 'Unknown',
              date: item.arrival_date || item.date || new Date().toISOString(),
              recordedAt: item.arrival_date || item.date || new Date().toISOString(),
              timestamp: new Date().toISOString(),
              arrivalQuantity: parseFloat(item.arrival_qty || 0),
              source: 'agmarknet'
            };
          });
        
        logger.info(`✅ AgMarkNet returned ${prices.length} valid prices`);
        return prices;
      }
      
      logger.warn('AgMarkNet API returned no valid records');
      return [];
    } catch (error) {
      logger.warn(`AgMarkNet API error: ${error.message}`);
      if (error.response) {
        logger.warn(`Response status: ${error.response.status}, data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
      return [];
    }
  }

  async getMandiRatePrices(commodity, state) {
    try {
      const response = await axios.get(this.apis.mandi, {
        params: {
          commodity: commodity,
          state: state,
          limit: 50
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.prices && Array.isArray(response.data.prices)) {
        const prices = response.data.prices
          .filter(item => item.price) // Only include items with valid prices
          .map((item, index) => ({
            id: `mandirate_${item.market_name || 'market'}_${index}_${Date.now()}`,
            commodity: item.commodity || commodity || 'Unknown',
            market: {
              name: item.market_name || 'Unknown Market',
              location: item.state || state || 'Unknown',
              state: item.state || state || 'Unknown'
            },
            price: {
              value: this.convertToPerKg(item.price, item.unit),
              unit: 'kg',
              perKg: this.convertToPerKg(item.price, item.unit),
              perTon: this.convertToPerKg(item.price, item.unit) * 1000,
              originalValue: parseFloat(item.price || 0),
              originalUnit: item.unit || 'quintal'
            },
            quality: item.quality || 'Standard',
            priceChange: {
              daily: parseFloat(item.change_percent || 0)
            },
            state: item.state || state || 'Unknown',
            date: item.date || new Date().toISOString(),
            recordedAt: item.date || new Date().toISOString(),
            timestamp: new Date().toISOString(),
            source: 'mandirate'
          }));
        
        logger.info(`✅ MandiRate returned ${prices.length} valid prices`);
        return prices;
      }
      
      logger.warn('MandiRate API returned no valid prices');
      return [];
    } catch (error) {
      logger.warn(`MandiRate API error: ${error.message}`);
      return [];
    }
  }

  calculatePriceChange(current, min, max) {
    if (!current || !min || !max) return 0;
    const avg = (parseFloat(min) + parseFloat(max)) / 2;
    return parseFloat(((parseFloat(current) - avg) / avg * 100).toFixed(2));
  }

  async fetchFromNCDEX(commodity) {
    try {
      const response = await axios.get('https://www.ncdex.com/api/marketdata', {
        params: {
          format: 'json',
          commodity: commodity || 'all'
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const prices = response.data
          .filter(item => item.last_traded_price || item.close_price)
          .map((item, index) => ({
            id: `ncdex_${item.commodity_name || commodity}_${index}_${Date.now()}`,
            commodity: item.commodity_name || commodity || 'Unknown',
            variety: item.variety || '',
            market: {
              name: 'NCDEX Exchange',
              location: 'National',
              state: 'National'
            },
            price: {
              value: this.convertToPerKg(item.last_traded_price || item.close_price, 'quintal'),
              unit: 'kg',
              originalValue: parseFloat(item.last_traded_price || item.close_price || 0),
              originalUnit: 'quintal',
              minPrice: this.convertToPerKg(item.low_price, 'quintal'),
              maxPrice: this.convertToPerKg(item.high_price, 'quintal')
            },
            quality: 'Exchange Grade',
            priceChange: {
              daily: parseFloat(item.change_percent || 0),
              weekly: 0
            },
            state: 'National',
            date: new Date().toISOString(),
            recordedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            source: 'ncdex'
          }));
        
        logger.info(`✅ NCDEX returned ${prices.length} valid prices`);
        return prices;
      }
      
      logger.warn('NCDEX API returned no valid data');
      return [];
    } catch (error) {
      logger.warn(`NCDEX API error: ${error.message}`);
      return [];
    }
  }

  generateMockPrices(commodity, state) {
    const basePrices = {
      'rice': 25,
      'wheat': 22,
      'maize': 18,
      'bajra': 20,
      'jowar': 19,
      'ragi': 24,
      
      'toor dal': 85,
      'moong dal': 90,
      'urad dal': 95,
      'chana dal': 70,
      'masoor dal': 75,
      'rajma': 80,
      
      'tomato': 30,
      'potato': 20,
      'onion': 25,
      'brinjal': 25,
      'cabbage': 15,
      'cauliflower': 30,
      'carrot': 30,
      'radish': 20,
      'ladyfinger': 40,
      'bitter gourd': 35,
      'bottle gourd': 20,
      'pumpkin': 18,
      'cucumber': 25,
      'capsicum': 50,
      'green beans': 60,
      'peas': 80,
      'spinach': 20,
      'ginger': 200,
      'garlic': 150,
      'green chili': 80,
      
      'banana': 40,
      'mango': 60,
      'apple': 120,
      'orange': 50,
      'grapes': 80,
      'pomegranate': 100,
      'guava': 40,
      'papaya': 25,
      'watermelon': 20,
      'muskmelon': 30,
      'sweet lime': 45,
      'lemon': 40,
      
      'turmeric': 150,
      'red chili': 200,
      'coriander seeds': 120,
      'cumin': 180,
      'mustard seeds': 80,
      'fenugreek': 100,
      'black pepper': 400,
      'cardamom': 1200,
      'cloves': 500,
      'cinnamon': 300,
      'coriander': 120,
      
      'groundnut': 80,
      'mustard': 70,
      'sunflower': 75,
      'sesame': 120,
      'soybean': 50,
      'coconut': 40,
      
      'cotton': 55,
      'sugarcane': 3,
      'jute': 45,
      'tobacco': 150,
      
      'sugar': 45,
      'jaggery': 50,
      'tea': 300,
      'coffee': 250,
      'cashew': 600,
      'almond': 800,
      'peanut': 80
    };

    const normalizedCommodity = commodity?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
    const basePrice = basePrices[normalizedCommodity] || basePrices[normalizedCommodity.replace(/\s+/g, '')] || 25;
    const variation = basePrice * 0.1; // 10% variation
    
    const markets = [
      { name: 'Delhi Mandi', location: 'Delhi', state: 'Delhi' },
      { name: 'Chandigarh Mandi', location: 'Chandigarh', state: 'Chandigarh' },
      { name: 'Amritsar APMC', location: 'Amritsar', state: 'Punjab' },
      { name: 'Ludhiana Mandi', location: 'Ludhiana', state: 'Punjab' },
      { name: 'Karnal Mandi', location: 'Karnal', state: 'Haryana' },
      { name: 'Dehradun Mandi', location: 'Dehradun', state: 'Uttarakhand' },
      { name: 'Shimla Mandi', location: 'Shimla', state: 'Himachal Pradesh' },
      { name: 'Jammu Mandi', location: 'Jammu', state: 'Jammu and Kashmir' },
      { name: 'Srinagar Mandi', location: 'Srinagar', state: 'Jammu and Kashmir' },
      
      { name: 'Mumbai APMC', location: 'Mumbai', state: 'Maharashtra' },
      { name: 'Pune APMC', location: 'Pune', state: 'Maharashtra' },
      { name: 'Nagpur Mandi', location: 'Nagpur', state: 'Maharashtra' },
      { name: 'Ahmedabad APMC', location: 'Ahmedabad', state: 'Gujarat' },
      { name: 'Surat Mandi', location: 'Surat', state: 'Gujarat' },
      { name: 'Jaipur Mandi', location: 'Jaipur', state: 'Rajasthan' },
      { name: 'Udaipur Mandi', location: 'Udaipur', state: 'Rajasthan' },
      { name: 'Panaji Mandi', location: 'Panaji', state: 'Goa' },
      
      { name: 'Bhopal Mandi', location: 'Bhopal', state: 'Madhya Pradesh' },
      { name: 'Indore APMC', location: 'Indore', state: 'Madhya Pradesh' },
      { name: 'Jabalpur Mandi', location: 'Jabalpur', state: 'Madhya Pradesh' },
      { name: 'Raipur Mandi', location: 'Raipur', state: 'Chhattisgarh' },
      { name: 'Bilaspur Mandi', location: 'Bilaspur', state: 'Chhattisgarh' },
      
      { name: 'Kolkata Market', location: 'Kolkata', state: 'West Bengal' },
      { name: 'Siliguri Mandi', location: 'Siliguri', state: 'West Bengal' },
      { name: 'Patna Mandi', location: 'Patna', state: 'Bihar' },
      { name: 'Bhagalpur Mandi', location: 'Bhagalpur', state: 'Bihar' },
      { name: 'Bhubaneswar Mandi', location: 'Bhubaneswar', state: 'Odisha' },
      { name: 'Cuttack Mandi', location: 'Cuttack', state: 'Odisha' },
      { name: 'Ranchi Mandi', location: 'Ranchi', state: 'Jharkhand' },
      { name: 'Jamshedpur Mandi', location: 'Jamshedpur', state: 'Jharkhand' },
      { name: 'Guwahati Mandi', location: 'Guwahati', state: 'Assam' },
      { name: 'Imphal Mandi', location: 'Imphal', state: 'Manipur' },
      { name: 'Shillong Mandi', location: 'Shillong', state: 'Meghalaya' },
      { name: 'Aizawl Mandi', location: 'Aizawl', state: 'Mizoram' },
      { name: 'Kohima Mandi', location: 'Kohima', state: 'Nagaland' },
      { name: 'Agartala Mandi', location: 'Agartala', state: 'Tripura' },
      { name: 'Gangtok Mandi', location: 'Gangtok', state: 'Sikkim' },
      
      { name: 'Chennai Market', location: 'Chennai', state: 'Tamil Nadu' },
      { name: 'Coimbatore Mandi', location: 'Coimbatore', state: 'Tamil Nadu' },
      { name: 'Madurai Mandi', location: 'Madurai', state: 'Tamil Nadu' },
      { name: 'Bangalore Market', location: 'Bangalore', state: 'Karnataka' },
      { name: 'Mysore Mandi', location: 'Mysore', state: 'Karnataka' },
      { name: 'Hubli Mandi', location: 'Hubli', state: 'Karnataka' },
      { name: 'Hyderabad APMC', location: 'Hyderabad', state: 'Telangana' },
      { name: 'Warangal Mandi', location: 'Warangal', state: 'Telangana' },
      { name: 'Vijayawada Mandi', location: 'Vijayawada', state: 'Andhra Pradesh' },
      { name: 'Visakhapatnam Mandi', location: 'Visakhapatnam', state: 'Andhra Pradesh' },
      { name: 'Kochi Mandi', location: 'Kochi', state: 'Kerala' },
      { name: 'Thiruvananthapuram Mandi', location: 'Thiruvananthapuram', state: 'Kerala' },
      { name: 'Puducherry Mandi', location: 'Puducherry', state: 'Puducherry' },
      
      { name: 'Port Blair Mandi', location: 'Port Blair', state: 'Andaman and Nicobar Islands' },
      { name: 'Kavaratti Mandi', location: 'Kavaratti', state: 'Lakshadweep' },
      { name: 'Leh Mandi', location: 'Leh', state: 'Ladakh' }
    ];

    const allStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
      'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    let targetStates = allStates;
    if (state) {
      targetStates = allStates.filter(s => 
        s.toLowerCase().includes(state.toLowerCase()) || 
        state.toLowerCase().includes(s.toLowerCase())
      );
      if (targetStates.length === 0) {
        targetStates = allStates;
      }
    }

    const selectedMarkets = [];
    targetStates.forEach(targetState => {
      const stateMarkets = markets.filter(m => 
        m.state?.toLowerCase() === targetState.toLowerCase() ||
        m.location?.toLowerCase().includes(targetState.toLowerCase().split(' ')[0])
      );
      
      if (stateMarkets.length > 0) {
        selectedMarkets.push(...stateMarkets.slice(0, 2));
      } else {
        const stateCapital = this.getStateCapital(targetState);
        selectedMarkets.push({
          name: `${stateCapital} Mandi`,
          location: stateCapital,
          state: targetState
        });
      }
    });
    
    const maxMarkets = state ? 10 : 72; // Up to 2 markets per state (36 states * 2)
    const finalMarkets = selectedMarkets.slice(0, maxMarkets);
    
    return finalMarkets.map((market, index) => {
      const price = basePrice + (Math.random() * variation * 2 - variation);
      const dailyChange = (Math.random() * 10 - 5); // -5% to +5%
      
      return {
        id: `mock_${commodity}_${index}_${Date.now()}`,
        commodity: commodity || 'Unknown',
        market: {
          name: market.name,
          location: market.location,
          state: market.state || market.location
        },
        price: {
          value: parseFloat(price.toFixed(2)),
          unit: 'kg',
          originalValue: price * 100, // Show as if it was per quintal
          originalUnit: 'quintal'
        },
        quality: index % 2 === 0 ? 'Grade A' : 'Grade B',
        priceChange: {
          daily: parseFloat(dailyChange.toFixed(2)),
          weekly: parseFloat((dailyChange * 7).toFixed(2))
        },
        state: market.state || market.location,
        date: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        source: 'mock'
      };
    });
  }

  async getRealTimePrices(commodity, state) {
    const cacheKey = `${commodity || 'all'}_${state || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      logger.info(`Returning cached market prices for ${commodity || 'all commodities'}`);
      return cached.data;
    }

    let prices = [];
    
    try {
      logger.info(`Fetching real-time prices from AgMarkNet for ${commodity || 'all commodities'}`);
      prices = await this.getAgMarkNetPrices(commodity, state);
      if (prices && prices.length > 0) {
        logger.info(`✅ Got ${prices.length} prices from AgMarkNet`);
        this.cache.set(cacheKey, {
          data: prices,
          timestamp: Date.now()
        });
        return prices;
      }
    } catch (error) {
      logger.warn('AgMarkNet API failed:', error.message);
    }
    
    if (!prices || prices.length === 0) {
      try {
        logger.info(`Trying NCDEX API for ${commodity || 'all commodities'}`);
        prices = await this.fetchFromNCDEX(commodity);
        if (prices && prices.length > 0) {
          logger.info(`✅ Got ${prices.length} prices from NCDEX`);
          this.cache.set(cacheKey, {
            data: prices,
            timestamp: Date.now()
          });
          return prices;
        }
      } catch (error) {
        logger.warn('NCDEX API failed:', error.message);
      }
    }
    
    if (!prices || prices.length === 0) {
      try {
        logger.info(`Trying MandiRate API for ${commodity || 'all commodities'}`);
        prices = await this.getMandiRatePrices(commodity, state);
        if (prices && prices.length > 0) {
          logger.info(`✅ Got ${prices.length} prices from MandiRate`);
          this.cache.set(cacheKey, {
            data: prices,
            timestamp: Date.now()
          });
          return prices;
        }
      } catch (error) {
        logger.warn('MandiRate API failed:', error.message);
      }
    }
    
    if (!prices || prices.length === 0) {
      logger.info(`Using mock market prices for ${commodity || 'all commodities'} (real APIs unavailable)`);
      prices = this.generateMockPrices(commodity, state);
    }

    prices = prices.map((price, index) => ({
      id: price.id || `price_${Date.now()}_${index}`,
      commodity: price.commodity || commodity || 'Unknown',
      market: price.market || { name: 'Unknown Market', location: state || 'Unknown' },
      price: price.price || { value: 0, unit: 'kg' },
      quality: price.quality || 'Standard',
      priceChange: price.priceChange || { daily: 0 },
      state: price.state || price.market?.location || state || 'Unknown',
      date: price.date || price.recordedAt || price.timestamp || new Date().toISOString(),
      recordedAt: price.recordedAt || price.timestamp || new Date().toISOString(),
      timestamp: price.timestamp || new Date().toISOString(),
      source: price.source || 'mock'
    }));

    this.cache.set(cacheKey, {
      data: prices,
      timestamp: Date.now()
    });

    return prices;
  }

  async getPriceTrends(commodity, days = 30) {
    try {
      const seasonalFactor = this.getSeasonalFactor(commodity);
      
      const trends = [];
      const basePrices = {
        'rice': 45,
        'wheat': 30,
        'maize': 25,
        'cotton': 80,
        'sugarcane': 5,
        'groundnut': 70,
        'soybean': 50,
        'potato': 20,
        'onion': 30,
        'tomato': 25
      };
      const basePrice = basePrices[commodity?.toLowerCase()] || 25;
      const volatility = 0.05; // 5% daily volatility
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const month = date.getMonth();
        
        const monthFactor = seasonalFactor[month] || 1.0;
        const trendFactor = 1 + (days - i) * 0.001; // Slight upward trend
        const randomFactor = 1 + (Math.random() * volatility * 2 - volatility);
        const price = basePrice * monthFactor * trendFactor * randomFactor;
        
        trends.push({
          date: date.toISOString().split('T')[0],
          average: parseFloat(price.toFixed(2)),
          min: parseFloat((price * 0.95).toFixed(2)),
          max: parseFloat((price * 1.05).toFixed(2))
        });
      }

      const prices = trends.map(t => t.average);
      const latest = prices[prices.length - 1];
      const average = prices.reduce((a, b) => a + b, 0) / prices.length;
      const changePercent = ((latest - average) / average * 100);
      
      return {
        data: trends,
        statistics: {
          latest: parseFloat(latest.toFixed(2)),
          average: parseFloat(average.toFixed(2)),
          min: parseFloat(Math.min(...prices).toFixed(2)),
          max: parseFloat(Math.max(...prices).toFixed(2)),
          trend: latest > average ? 'upward' : 'downward',
          changePercent: parseFloat(changePercent.toFixed(2))
        },
        prediction: {
          next7Days: parseFloat((latest * (1 + changePercent / 100 / 4)).toFixed(2)),
          next30Days: parseFloat((latest * (1 + changePercent / 100)).toFixed(2)),
          confidence: 75,
          seasonalFactor: seasonalFactor[new Date().getMonth()] || 1.0
        }
      };
    } catch (error) {
      logger.error('Error generating price trends:', error);
      return null;
    }
  }

  getSeasonalFactor(commodity) {
    const patterns = {
      'rice': [1.1, 1.05, 1.0, 0.95, 0.9, 0.85, 0.9, 0.95, 1.0, 1.1, 1.15, 1.2],
      'wheat': [1.2, 1.15, 1.1, 1.05, 1.0, 0.95, 0.9, 0.85, 0.9, 0.95, 1.0, 1.1],
      'tomato': [1.3, 1.2, 1.0, 0.8, 0.7, 0.6, 0.7, 0.8, 1.0, 1.2, 1.3, 1.4],
      'potato': [1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
      'onion': [1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3]
    };
    
    return patterns[commodity?.toLowerCase()] || Array(12).fill(1.0);
  }
}

module.exports = new MarketPriceAPIService();

