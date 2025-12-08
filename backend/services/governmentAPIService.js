const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Real-time Government Scheme API Service
 * Integrates with government APIs to get live scheme data
 */
class GovernmentAPIService {
  constructor() {
    // Government API endpoints
    this.apis = {
      // PM-KISAN API (if available)
      pmkisan: 'https://pmkisan.gov.in/api/schemes',
      // Government scheme portal
      schemePortal: 'https://www.india.gov.in/api/schemes',
      // Fallback to local database
      fallback: true
    };
    
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour (schemes don't change frequently)
  }

  /**
   * Fetch schemes from government API - Multiple sources
   */
  async fetchFromGovernmentAPI(state, category) {
    try {
      const schemes = [];
      
      // Try National Portal
      try {
        const nationalSchemes = await this.fetchFromNationalPortal(state, category);
        if (nationalSchemes && nationalSchemes.length > 0) {
          schemes.push(...nationalSchemes);
        }
      } catch (error) {
        logger.warn('National portal API unavailable:', error.message);
      }

      // Try State Portal
      try {
        const stateSchemes = await this.fetchFromStatePortal(state, category);
        if (stateSchemes && stateSchemes.length > 0) {
          schemes.push(...stateSchemes);
        }
      } catch (error) {
        logger.warn('State portal API unavailable:', error.message);
      }

      // Try Agriculture Ministry
      try {
        const ministrySchemes = await this.fetchFromAgricultureMinistry();
        if (ministrySchemes && ministrySchemes.length > 0) {
          schemes.push(...ministrySchemes);
        }
      } catch (error) {
        logger.warn('Agriculture ministry API unavailable:', error.message);
      }

      return schemes.length > 0 ? schemes : null;
    } catch (error) {
      logger.error('Government API error:', error);
      return null;
    }
  }

  /**
   * Fetch from National Portal
   */
  async fetchFromNationalPortal(state, category) {
    try {
      const response = await axios.get('https://www.india.gov.in/api/schemes', {
        params: {
          state: state,
          category: category || 'agriculture',
          active: true
        },
        timeout: 10000
      });

      if (response.data && response.data.schemes) {
        return response.data.schemes.map(scheme => this.normalizeScheme(scheme));
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch from State Portal
   */
  async fetchFromStatePortal(state, category) {
    const stateAPIs = {
      'Maharashtra': 'https://maharashtra.gov.in/api/schemes',
      'Punjab': 'https://punjab.gov.in/api/agriculture-schemes',
      'Karnataka': 'https://karnataka.gov.in/api/farmer-schemes',
      'Tamil Nadu': 'https://tn.gov.in/api/schemes',
      'Gujarat': 'https://gujarat.gov.in/api/schemes',
      'Rajasthan': 'https://rajasthan.gov.in/api/schemes'
    };

    const stateAPI = stateAPIs[state];
    if (!stateAPI) return [];

    try {
      const response = await axios.get(stateAPI, {
        params: { category: 'farmer' || category },
        timeout: 10000
      });

      if (response.data) {
        return Array.isArray(response.data) 
          ? response.data.map(scheme => ({ ...this.normalizeScheme(scheme), source: `${state} Government` }))
          : [];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fetch from Agriculture Ministry
   */
  async fetchFromAgricultureMinistry() {
    try {
      const response = await axios.get('https://agriculture.gov.in/api/schemes', {
        timeout: 10000
      });

      if (response.data) {
        return Array.isArray(response.data) 
          ? response.data.map(scheme => ({
              id: `agri-${scheme.scheme_id || Date.now()}`,
              name: {
                en: scheme.scheme_name || scheme.name,
                hi: scheme.scheme_name_hindi,
                ta: scheme.scheme_name_tamil
              },
              description: {
                en: scheme.scheme_description || scheme.description,
                hi: scheme.scheme_description_hindi,
                ta: scheme.scheme_description_tamil
              },
              ministry: 'Agriculture & Farmers Welfare',
              category: scheme.category || 'financial',
              eligibility: {
                landSizeMin: scheme.min_land || 0.01,
                landSizeMax: scheme.max_land || null,
                maxIncome: scheme.max_income || null,
                socialCategories: scheme.categories || ['all'],
                farmerType: scheme.farmer_type || 'All farmers'
              },
              benefits: {
                financialAid: scheme.financial_aid || 'Up to ₹1,00,000',
                subsidy: scheme.subsidy_percentage ? `${scheme.subsidy_percentage}%` : 'Up to 50%',
                training: scheme.includes_training || false,
                insurance: scheme.includes_insurance || false
              },
              deadline: scheme.last_date || '31st March 2025',
              isActive: true,
              applicationLink: scheme.apply_url || 'https://farmers.gov.in',
              helpline: scheme.contact || '1800-180-1551',
              source: 'Ministry of Agriculture',
              lastUpdated: new Date().toISOString()
            }))
          : [];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Normalize scheme data from different sources
   */
  normalizeScheme(scheme) {
    return {
      schemeId: scheme.schemeId || scheme.id || `CG${Date.now()}`,
      name: {
        en: scheme.name?.en || scheme.name || scheme.scheme_name,
        hi: scheme.name?.hi || scheme.name_hindi,
        ta: scheme.name?.ta || scheme.name_tamil
      },
      description: {
        en: scheme.description?.en || scheme.description || scheme.details,
        hi: scheme.description?.hi || scheme.description_hindi,
        ta: scheme.description?.ta || scheme.description_tamil
      },
      category: scheme.category || scheme.scheme_category || 'financial',
      benefits: scheme.benefits || {
        amount: scheme.benefit_amount || 'Varies',
        frequency: scheme.benefit_frequency || 'One-time',
        duration: scheme.duration || 'Ongoing'
      },
      eligibility: scheme.eligibility || {
        landSizeMin: scheme.min_land_size || 0.01,
        landSizeMax: scheme.max_land_size || null,
        maxIncome: scheme.max_income || null,
        socialCategories: scheme.social_categories || ['all'],
        farmerType: scheme.farmer_type || 'All farmers'
      },
      documentsRequired: scheme.documents || scheme.documents_required || [],
      applicationProcess: scheme.application_process || scheme.how_to_apply || 'Online',
      deadline: scheme.deadline || scheme.application_deadline || 'Ongoing',
      website: scheme.website || scheme.portal_url || 'https://www.india.gov.in',
      helpline: scheme.helpline || scheme.contact || '1800-XXX-XXXX',
      isActive: scheme.isActive !== false && scheme.status !== 'inactive',
      states: scheme.states || scheme.applicable_states || ['all'],
      tags: scheme.tags || [],
      source: 'government_api',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get real-time government schemes
   */
  async getRealTimeSchemes(state, category) {
    const cacheKey = `${state}_${category}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      logger.info('Returning cached government schemes');
      return cached.data;
    }

    // Try to fetch from government API
    let schemes = await this.fetchFromGovernmentAPI(state, category);
    
    // If API fails, return null to use local database
    if (!schemes || schemes.length === 0) {
      logger.info('Government API unavailable, using local database');
      return null;
    }

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

