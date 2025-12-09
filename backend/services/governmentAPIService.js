const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Real-time Government Scheme API Service
 * Integrates with government APIs to get live scheme data
 */
class GovernmentAPIService {
  constructor() {
    // Government API endpoints - Real-time sources
    this.apis = {
      // PM-KISAN Portal
      pmkisan: process.env.PM_KISAN_API_URL || 'https://pmkisan.gov.in',
      // Farmers Portal
      farmersPortal: process.env.FARMERS_PORTAL_API_URL || 'https://farmers.gov.in',
      // India.gov.in Schemes
      indiaGov: process.env.INDIA_GOV_API_URL || 'https://www.india.gov.in',
      // Agriculture Ministry
      agricultureMinistry: process.env.AGRICULTURE_MINISTRY_API_URL || 'https://agriculture.gov.in',
      // PMFBY (Crop Insurance)
      pmfby: process.env.PMFBY_API_URL || 'https://pmfby.gov.in',
      // Soil Health Card
      soilHealth: process.env.SOIL_HEALTH_API_URL || 'https://soilhealth.dac.gov.in',
      // National Portal for Schemes
      schemePortal: process.env.SCHEME_PORTAL_API_URL || 'https://www.india.gov.in/api/schemes'
    };
    
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour (schemes don't change frequently)
    this.requestTimeout = 5000; // 5 seconds timeout for API requests
  }

  /**
   * Fetch schemes from government API - Multiple sources in parallel
   */
  async fetchFromGovernmentAPI(state, category) {
    try {
      const schemes = [];
      const stateName = state || 'All';
      
      // Fetch from multiple sources in parallel for better performance
      const apiPromises = [
        this.fetchFromPMKISAN(stateName, category).catch(err => {
          logger.debug('PM-KISAN API unavailable:', err.message);
          return [];
        }),
        this.fetchFromFarmersPortal(stateName, category).catch(err => {
          logger.debug('Farmers Portal API unavailable:', err.message);
          return [];
        }),
        this.fetchFromNationalPortal(stateName, category).catch(err => {
          logger.debug('National portal API unavailable:', err.message);
          return [];
        }),
        this.fetchFromStatePortal(stateName, category).catch(err => {
          logger.debug('State portal API unavailable:', err.message);
          return [];
        }),
        this.fetchFromAgricultureMinistry().catch(err => {
          logger.debug('Agriculture ministry API unavailable:', err.message);
          return [];
        }),
        this.fetchFromPMFBY(stateName, category).catch(err => {
          logger.debug('PMFBY API unavailable:', err.message);
          return [];
        })
      ];

      // Wait for all API calls to complete (with timeout)
      const results = await Promise.allSettled(
        apiPromises.map(promise => 
          Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
            )
          ])
        )
      );

      // Collect all successful results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0) {
          schemes.push(...result.value);
          logger.info(`Fetched ${result.value.length} schemes from source ${index + 1}`);
        }
      });

      // Remove duplicates based on schemeId
      const uniqueSchemes = this.removeDuplicateSchemes(schemes);
      
      logger.info(`Total unique schemes fetched: ${uniqueSchemes.length}`);
      return uniqueSchemes.length > 0 ? uniqueSchemes : null;
    } catch (error) {
      logger.error('Government API error:', error);
      return null;
    }
  }

  /**
   * Remove duplicate schemes based on schemeId
   */
  removeDuplicateSchemes(schemes) {
    const seen = new Map();
    return schemes.filter(scheme => {
      const id = scheme.schemeId || scheme.id || scheme.name;
      if (seen.has(id)) {
        return false;
      }
      seen.set(id, true);
      return true;
    });
  }

  /**
   * Fetch from PM-KISAN Portal
   */
  async fetchFromPMKISAN(state, category) {
    try {
      // Try API endpoint first
      const endpoints = [
        `${this.apis.pmkisan}/api/schemes`,
        `${this.apis.pmkisan}/api/v1/schemes`,
        `${this.apis.pmkisan}/schemes.json`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            params: {
              state: state,
              category: category || 'all'
            },
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AgriSmartAI/1.0)',
              'Accept': 'application/json'
            }
          });

          if (response.data) {
            const schemes = Array.isArray(response.data) 
              ? response.data 
              : (response.data.schemes || response.data.data || []);
            
            if (schemes.length > 0) {
              return schemes.map(scheme => ({
                ...this.normalizeScheme(scheme),
                source: 'PM-KISAN Portal',
                level: 'central'
              }));
            }
          }
        } catch (err) {
          continue; // Try next endpoint
        }
      }
      
      return [];
    } catch (error) {
      logger.debug('PM-KISAN fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch from Farmers Portal (farmers.gov.in)
   */
  async fetchFromFarmersPortal(state, category) {
    try {
      const endpoints = [
        `${this.apis.farmersPortal}/api/schemes`,
        `${this.apis.farmersPortal}/api/v1/schemes`,
        `${this.apis.farmersPortal}/schemes.json`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            params: {
              state: state,
              category: category || 'agriculture',
              active: true
            },
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AgriSmartAI/1.0)',
              'Accept': 'application/json'
            }
          });

          if (response.data) {
            const schemes = Array.isArray(response.data) 
              ? response.data 
              : (response.data.schemes || response.data.data || []);
            
            if (schemes.length > 0) {
              return schemes.map(scheme => ({
                ...this.normalizeScheme(scheme),
                source: 'Farmers Portal',
                level: 'central'
              }));
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      logger.debug('Farmers Portal fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch from PMFBY (Crop Insurance)
   */
  async fetchFromPMFBY(state, category) {
    try {
      const endpoints = [
        `${this.apis.pmfby}/api/schemes`,
        `${this.apis.pmfby}/api/v1/schemes`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            params: {
              state: state,
              category: 'insurance'
            },
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AgriSmartAI/1.0)',
              'Accept': 'application/json'
            }
          });

          if (response.data) {
            const schemes = Array.isArray(response.data) 
              ? response.data 
              : (response.data.schemes || response.data.data || []);
            
            if (schemes.length > 0) {
              return schemes.map(scheme => ({
                ...this.normalizeScheme({
                  ...scheme,
                  category: 'insurance',
                  name: scheme.name || 'Pradhan Mantri Fasal Bima Yojana'
                }),
                source: 'PMFBY Portal',
                level: 'central'
              }));
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      logger.debug('PMFBY fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch from National Portal
   */
  async fetchFromNationalPortal(state, category) {
    try {
      const endpoints = [
        `${this.apis.indiaGov}/api/schemes`,
        `${this.apis.schemePortal}`,
        `${this.apis.indiaGov}/schemes.json`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            params: {
              state: state,
              category: category || 'agriculture',
              active: true,
              sector: 'agriculture'
            },
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AgriSmartAI/1.0)',
              'Accept': 'application/json'
            }
          });

          if (response.data) {
            const schemes = Array.isArray(response.data) 
              ? response.data 
              : (response.data.schemes || response.data.data || []);
            
            if (schemes.length > 0) {
              return schemes.map(scheme => this.normalizeScheme(scheme));
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      logger.debug('National Portal fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch from State Portal
   */
  async fetchFromStatePortal(state, category) {
    if (!state) return [];

    const stateAPIs = {
      'Maharashtra': ['https://maharashtra.gov.in/api/schemes', 'https://maharashtra.gov.in/api/agriculture-schemes'],
      'Punjab': ['https://punjab.gov.in/api/agriculture-schemes', 'https://punjab.gov.in/api/schemes'],
      'Karnataka': ['https://karnataka.gov.in/api/farmer-schemes', 'https://raitamitra.karnataka.gov.in/api/schemes'],
      'Tamil Nadu': ['https://tn.gov.in/api/schemes', 'https://tn.gov.in/api/agriculture-schemes'],
      'Gujarat': ['https://gujarat.gov.in/api/schemes', 'https://gujarat.gov.in/api/agriculture'],
      'Rajasthan': ['https://rajasthan.gov.in/api/schemes', 'https://rajasthan.gov.in/api/agriculture-schemes'],
      'Haryana': ['https://haryana.gov.in/api/schemes', 'https://agriharyana.gov.in/api/schemes'],
      'Uttar Pradesh': ['https://up.gov.in/api/schemes', 'https://upagriculture.com/api/schemes'],
      'West Bengal': ['https://wb.gov.in/api/schemes', 'https://matirkatha.wb.gov.in/api/schemes'],
      'Andhra Pradesh': ['https://ap.gov.in/api/schemes', 'https://ap.gov.in/api/agriculture'],
      'Telangana': ['https://telangana.gov.in/api/schemes', 'https://agri.telangana.gov.in/api/schemes'],
      'Odisha': ['https://odisha.gov.in/api/schemes', 'https://odisha.gov.in/api/agriculture'],
      'Bihar': ['https://bihar.gov.in/api/schemes', 'https://bihar.gov.in/api/agriculture'],
      'Madhya Pradesh': ['https://mp.gov.in/api/schemes', 'https://mp.gov.in/api/agriculture']
    };

    const stateEndpoints = stateAPIs[state] || [];
    if (stateEndpoints.length === 0) return [];

    for (const endpoint of stateEndpoints) {
      try {
        const response = await axios.get(endpoint, {
          params: { 
            category: category || 'farmer',
            sector: 'agriculture',
            active: true
          },
          timeout: this.requestTimeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AgriSmartAI/1.0)',
            'Accept': 'application/json'
          }
        });

        if (response.data) {
          const schemes = Array.isArray(response.data) 
            ? response.data 
            : (response.data.schemes || response.data.data || []);
          
          if (schemes.length > 0) {
            return schemes.map(scheme => ({
              ...this.normalizeScheme(scheme),
              source: `${state} Government`,
              level: 'state',
              state: state
            }));
          }
        }
      } catch (err) {
        continue; // Try next endpoint
      }
    }
    
    return [];
  }

  /**
   * Fetch from Agriculture Ministry
   */
  async fetchFromAgricultureMinistry() {
    try {
      const endpoints = [
        `${this.apis.agricultureMinistry}/api/schemes`,
        `${this.apis.agricultureMinistry}/api/v1/schemes`,
        `${this.apis.agricultureMinistry}/schemes.json`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: this.requestTimeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AgriSmartAI/1.0)',
              'Accept': 'application/json'
            }
          });

          if (response.data) {
            const schemes = Array.isArray(response.data) 
              ? response.data 
              : (response.data.schemes || response.data.data || []);
            
            if (schemes.length > 0) {
              return schemes.map(scheme => {
                const normalized = this.normalizeScheme({
                  schemeId: scheme.scheme_id || scheme.id || `agri-${Date.now()}`,
                  name: scheme.scheme_name || scheme.name,
                  description: scheme.scheme_description || scheme.description,
                  category: scheme.category || 'financial',
                  ...scheme
                });
                return {
                  ...normalized,
                  ministry: 'Agriculture & Farmers Welfare',
                  source: 'Ministry of Agriculture',
                  level: 'central',
                  eligibility: normalized.eligibility || {
                    landSizeMin: scheme.min_land || 0.01,
                    landSizeMax: scheme.max_land || null,
                    maxIncome: scheme.max_income || null,
                    socialCategories: scheme.categories || ['all'],
                    farmerType: scheme.farmer_type || 'All farmers'
                  },
                  benefits: normalized.benefits || {
                    financialAid: scheme.financial_aid || 'Up to ₹1,00,000',
                    subsidy: scheme.subsidy_percentage ? `${scheme.subsidy_percentage}%` : 'Up to 50%',
                    training: scheme.includes_training || false,
                    insurance: scheme.includes_insurance || false
                  },
                  website: normalized.website || scheme.apply_url || 'https://farmers.gov.in',
                  helpline: normalized.helpline || scheme.contact || '1800-180-1551'
                };
              });
            }
          }
        } catch (err) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      logger.debug('Agriculture Ministry fetch error:', error.message);
      return [];
    }
  }

  /**
   * Normalize scheme data from different sources
   */
  normalizeScheme(scheme) {
    // Handle name field (can be string or object)
    let name = scheme.name;
    if (typeof name === 'string') {
      name = { en: name };
    } else if (!name || typeof name !== 'object') {
      name = { en: scheme.scheme_name || scheme.title || 'Government Scheme' };
    }

    // Handle description field (can be string or object)
    let description = scheme.description;
    if (typeof description === 'string') {
      description = { en: description };
    } else if (!description || typeof description !== 'object') {
      description = { en: scheme.details || scheme.scheme_description || scheme.summary || '' };
    }

    return {
      schemeId: scheme.schemeId || scheme.id || scheme.scheme_id || `CG${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: typeof name === 'string' ? name : (name?.en || name || 'Government Scheme'),
      description: typeof description === 'string' ? description : (description?.en || description || ''),
      category: scheme.category || scheme.scheme_category || scheme.type || 'financial',
      benefits: scheme.benefits || {
        amount: scheme.benefit_amount || scheme.amount || 'Varies',
        frequency: scheme.benefit_frequency || scheme.frequency || 'One-time',
        duration: scheme.duration || 'Ongoing',
        ...(scheme.subsidy_percentage && { subsidy: `${scheme.subsidy_percentage}%` })
      },
      eligibility: scheme.eligibility || {
        landSizeMin: scheme.min_land_size || scheme.min_land || 0.01,
        landSizeMax: scheme.max_land_size || scheme.max_land || null,
        maxIncome: scheme.max_income || null,
        socialCategories: scheme.social_categories || scheme.categories || ['all'],
        farmerType: scheme.farmer_type || 'All farmers',
        landOwnership: scheme.land_ownership !== undefined ? scheme.land_ownership : undefined
      },
      documentsRequired: scheme.documents || scheme.documents_required || scheme.required_documents || [],
      applicationProcess: scheme.application_process || scheme.how_to_apply || scheme.application_method || 'Online',
      deadline: scheme.deadline || scheme.application_deadline || scheme.last_date || 'Ongoing',
      website: scheme.website || scheme.portal_url || scheme.apply_url || scheme.url || 'https://www.india.gov.in',
      helpline: scheme.helpline || scheme.contact || scheme.phone || '1800-XXX-XXXX',
      isActive: scheme.isActive !== false && scheme.status !== 'inactive' && scheme.active !== false,
      states: scheme.states || scheme.applicable_states || scheme.state || ['all'],
      tags: scheme.tags || scheme.keywords || [],
      source: scheme.source || 'government_api',
      lastUpdated: scheme.lastUpdated || scheme.last_updated || new Date().toISOString()
    };
  }

  /**
   * Get real-time government schemes
   */
  async getRealTimeSchemes(state, category) {
    const cacheKey = `${state || 'all'}_${category || 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      logger.info(`Returning cached government schemes for ${state || 'all states'} (${cached.data.length} schemes)`);
      return cached.data;
    }

    logger.info(`Fetching real-time government schemes for ${state || 'all states'}${category ? ` (category: ${category})` : ''}`);
    const startTime = Date.now();

    // Try to fetch from government API
    let schemes = await this.fetchFromGovernmentAPI(state, category);
    
    const fetchTime = Date.now() - startTime;
    
    // If API fails, return null to use local database
    if (!schemes || schemes.length === 0) {
      logger.info(`Government API unavailable or returned no schemes (took ${fetchTime}ms), using local database`);
      return null;
    }

    logger.info(`Successfully fetched ${schemes.length} real-time schemes from government APIs (took ${fetchTime}ms)`);

    // Cache the results
    this.cache.set(cacheKey, {
      data: schemes,
      timestamp: Date.now()
    });

    return schemes;
  }

  /**
   * Get scheme details by ID from government API
   */
  async getSchemeDetails(schemeId) {
    try {
      const response = await axios.get(`${this.apis.schemePortal}/${schemeId}`, {
        timeout: 10000
      });

      if (response.data) {
        return this.normalizeScheme(response.data);
      }
      
      return null;
    } catch (error) {
      logger.warn('Failed to fetch scheme details from API:', error.message);
      return null;
    }
  }

  /**
   * Check scheme eligibility in real-time
   */
  async checkEligibility(schemeId, farmerProfile) {
    try {
      const response = await axios.post(`${this.apis.schemePortal}/${schemeId}/eligibility`, {
        farmerProfile: farmerProfile
      }, {
        timeout: 10000
      });

      if (response.data) {
        return {
          eligible: response.data.eligible || false,
          reasons: response.data.reasons || [],
          missingDocuments: response.data.missing_documents || [],
          source: 'government_api'
        };
      }
      
      return null;
    } catch (error) {
      logger.warn('Eligibility check API unavailable:', error.message);
      return null;
    }
  }
}

module.exports = new GovernmentAPIService();

