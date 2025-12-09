/**
 * Government Scheme Recommendation Service
 * Intelligent scheme recommendation engine for farmers
 */

const axios = require('axios');
const logger = require('../utils/logger');
const cache = require('../utils/cache').getInstance();
const applicationManager = require('./applicationManager');
const LandConverter = require('../utils/landConverter');

class GovernmentSchemeService {
  constructor() {
    this.schemeDatabase = this.loadSchemeDatabase();
    this.applicationManager = applicationManager;
    this.apiEndpoints = {
      pmKisan: process.env.PM_KISAN_API_URL || 'https://pmkisan.gov.in/api/v1',
      soilHealth: process.env.SOIL_HEALTH_API_URL || 'https://soilhealth.dac.gov.in/api',
      pmfby: process.env.PMFBY_API_URL || 'https://pmfby.gov.in/api',
      agmarknet: process.env.AGMARKNET_API_URL || 'https://agmarknet.gov.in/api'
    };
    
    // Verify database loaded correctly
    const centralCount = this.schemeDatabase?.central ? Object.keys(this.schemeDatabase.central).length : 0;
    const stateCount = this.schemeDatabase ? Object.keys(this.schemeDatabase).filter(k => k !== 'central').length : 0;
    logger.info(`✅ Government Scheme Service initialized with ${centralCount} central schemes and ${stateCount} states`);
    
    if (centralCount === 0) {
      logger.error('⚠️ WARNING: No central schemes loaded! Database may be empty.');
    }
  }

  loadSchemeDatabase() {
    /**Load comprehensive government scheme database*/
    return {
      central: {
        pmKisan: {
          schemeId: 'CG001',
          name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
          description: 'Direct income support of ₹6,000 per year to all landholding farmer families',
          category: 'financial',
          benefits: {
            amount: '₹6,000 per year',
            frequency: '3 installments of ₹2,000 each',
            duration: 'Ongoing'
          },
          eligibility: {
            landOwnership: true,
            landSizeMin: 0.01,
            landSizeMax: null,
            exclusions: [
              'Institutional landholders',
              'Former and present holders of constitutional posts',
              'Serving or retired officers of Central/State Government',
              'Professionals like doctors, engineers, lawyers',
              'Income tax payers in last assessment year'
            ]
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land ownership documents (Khatauni, Khasra)',
            'Bank account details',
            'Mobile number linked with Aadhaar'
          ],
          applicationProcess: 'Online through PM-KISAN portal or CSC',
          deadline: 'Ongoing registration',
          subsidyPercentage: 100,
          website: 'https://pmkisan.gov.in',
          helpline: '155261',
          stateCoverage: 'All states and UTs'
        },
        pmfby: {
          schemeId: 'CG002',
          name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
          description: 'Comprehensive crop insurance against natural calamities, pests, and diseases',
          category: 'insurance',
          benefits: {
            coverage: 'Yield loss, prevented sowing, post-harvest losses',
            premium: '2% for Kharif, 1.5% for Rabi, 5% for annual commercial/horticultural crops',
            sumInsured: 'Up to value of threshold yield'
          },
          eligibility: {
            farmers: 'All farmers including sharecroppers and tenant farmers',
            crops: 'Food crops, oilseeds, annual commercial/horticultural crops',
            compulsoryFor: 'Loanee farmers',
            voluntaryFor: 'Non-loanee farmers'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land records',
            'Bank account details',
            'Crop details (sowing date, area, crop type)'
          ],
          applicationProcess: 'Through banks, insurance companies, or Common Service Centers',
          deadline: 'Varies by crop season',
          subsidyPercentage: 'Premium subsidy by Central and State governments',
          website: 'https://pmfby.gov.in',
          helpline: '1800116515'
        },
        soilHealthCard: {
          schemeId: 'CG003',
          name: 'Soil Health Card Scheme',
          description: 'Provides soil health cards to farmers with crop-wise recommendations',
          category: 'soil',
          benefits: {
            freeSoilTesting: 'Once every 3 years',
            recommendations: 'Fertilizer and amendment recommendations',
            microNutrientAnalysis: 'Includes 12 parameters'
          },
          eligibility: {
            allFarmers: true,
            landRequirement: 'Any size',
            frequency: 'Once every 3 years per landholding'
          },
          documentsRequired: ['Aadhaar Card', 'Land records'],
          applicationProcess: 'Through local agriculture office or online portal',
          deadline: 'Ongoing',
          subsidyPercentage: 100,
          website: 'https://soilhealth.dac.gov.in'
        },
        microIrrigation: {
          schemeId: 'CG005',
          name: 'Per Drop More Crop - Micro Irrigation',
          description: 'Subsidy for drip and sprinkler irrigation systems',
          category: 'water',
          benefits: {
            subsidy: '55% for small/marginal farmers, 45% for others',
            waterSaving: '30-50% water saving',
            yieldIncrease: '20-50% yield increase'
          },
          eligibility: {
            farmers: 'Individual farmers, groups, cooperatives',
            landRequirement: 'Minimum 0.5 acres for drip, 1 acre for sprinkler'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land ownership proof',
            'Bank details',
            'Estimate from approved vendor'
          ],
          applicationProcess: 'Through State Agriculture Department',
          subsidyPercentage: '55% (SMF), 45% (others)',
          website: 'https://pmksy.gov.in'
        },
        pkvy: {
          schemeId: 'CG006',
          name: 'Paramparagat Krishi Vikas Yojana (PKVY)',
          description: 'Promotes organic farming through cluster approach',
          category: 'organic',
          benefits: {
            financialAssistance: '₹50,000 per hectare over 3 years',
            certification: 'Support for organic certification',
            inputs: 'Bio-fertilizers, vermicompost, etc.'
          },
          eligibility: {
            farmersGroup: 'Minimum 50 farmers form a cluster',
            landRequirement: 'Minimum 20 hectares per cluster',
            conversionPeriod: '3 years conversion to organic'
          },
          documentsRequired: [
            'Cluster formation documents',
            'Land records of all farmers',
            'Project proposal'
          ],
          applicationProcess: 'Through State Organic Farming Mission',
          subsidyAmount: '₹50,000/hectare over 3 years'
        }
      },
      punjab: {
        attaDal: {
          schemeId: 'PB001',
          name: 'Atta-Dal Scheme',
          description: 'Subsidized wheat and pulses for below poverty line families',
          category: 'financial',
          benefits: {
            wheat: '₹2 per kg (market price ₹25)',
            dal: '₹20 per kg (market price ₹80)',
            quantity: '5 kg wheat + 2 kg dal per person per month'
          },
          eligibility: {
            bplFamilies: true,
            annualIncome: 'Below ₹60,000',
            rationCard: 'Must have valid ration card'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Ration Card',
            'Income Certificate',
            'Residence Proof'
          ],
          applicationProcess: 'Through Food & Civil Supplies Department',
          deadline: 'Ongoing',
          website: 'https://punjab.gov.in/atta-dal',
          helpline: '1800-XXX-XXXX'
        },
        krishiYantra: {
          schemeId: 'PB002',
          name: 'Krishi Yantra Subsidy Scheme',
          description: 'Subsidy on agricultural machinery and equipment',
          category: 'equipment',
          benefits: {
            tractors: '25% subsidy (max ₹1.25 lakh)',
            combineHarvesters: '25% subsidy',
            powerTillers: '50% subsidy',
            dripIrrigation: '80% subsidy'
          },
          eligibility: {
            farmers: 'Individual farmers, groups, cooperatives',
            landholding: 'No restriction',
            machineryAge: 'New equipment only'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land records',
            'Bank details',
            'Quotation from dealer'
          ],
          applicationProcess: 'Through Punjab Agro Industries Corporation',
          deadline: 'Ongoing',
          website: 'https://punjabagro.gov.in',
          helpline: '1800-XXX-XXXX'
        }
      },
      haryana: {
        bhavantarBharpai: {
          schemeId: 'HR001',
          name: 'Haryana Bhavantar Bharpai Yojana',
          description: 'Price difference payment for crops when market price is below MSP',
          category: 'price_support',
          benefits: {
            coverage: ['Vegetables', 'Fruits'],
            payment: 'Difference between MSP and market price',
            crops: ['Tomato', 'Onion', 'Potato', 'Cauliflower', 'Capsicum']
          },
          eligibility: {
            farmers: 'All registered farmers in Haryana',
            crops: 'Covered vegetables and fruits',
            registration: 'Must be registered with Haryana Agriculture Department'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land records',
            'Crop registration certificate',
            'Bank details'
          ],
          applicationProcess: 'Online through Haryana Agriculture Department portal',
          deadline: 'Ongoing',
          website: 'https://agriharyana.gov.in',
          helpline: '1800-XXX-XXXX'
        }
      },
      uttar_pradesh: {
        kisanCreditCard: {
          schemeId: 'UP001',
          name: 'Kisan Credit Card (KCC) Scheme',
          description: 'Credit facility for farmers for agricultural and allied activities',
          category: 'financial',
          benefits: {
            creditLimit: 'Up to ₹3 lakh for crop production',
            interestRate: '4% per annum (subsidized)',
            repaymentPeriod: 'Flexible repayment up to 5 years'
          },
          eligibility: {
            farmers: 'All farmers including tenant farmers, sharecroppers',
            landOwnership: 'Not mandatory for tenant farmers',
            age: '18-75 years'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land records or lease agreement',
            'Bank account details',
            'Passport size photo'
          ],
          applicationProcess: 'Through banks (public and private)',
          deadline: 'Ongoing',
          website: 'https://upagriculture.com',
          helpline: '1800-XXX-XXXX'
        }
      },
      maharashtra: {
        jalyuktShivar: {
          schemeId: 'MH001',
          name: 'Jalyukt Shivar Abhiyan',
          description: 'Water conservation and management scheme',
          category: 'water',
          benefits: {
            waterConservation: 'Water storage capacity enhancement',
            financialAssistance: 'Up to ₹5 lakh per village',
            droughtPrevention: 'Drought-proofing measures'
          },
          eligibility: {
            villages: 'Drought-prone villages',
            farmers: 'All farmers in selected villages',
            participation: 'Community participation required'
          },
          documentsRequired: [
            'Village resolution',
            'Project proposal',
            'Land records',
            'Bank details'
          ],
          applicationProcess: 'Through Gram Panchayat and District Administration',
          deadline: 'Ongoing',
          website: 'https://maharashtra.gov.in/agriculture',
          helpline: '1800-XXX-XXXX'
        }
      },
      karnataka: {
        raithaBelaku: {
          schemeId: 'KA001',
          name: 'Raitha Belaku Scheme',
          description: 'Direct benefit transfer to farmers',
          category: 'financial',
          benefits: {
            amount: '₹4,000 per acre per year',
            frequency: 'Two installments',
            coverage: 'All registered farmers'
          },
          eligibility: {
            farmers: 'All farmers registered in Karnataka',
            landOwnership: 'Must have land records',
            registration: 'Must be registered with Agriculture Department'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land records (RTC)',
            'Bank account details',
            'Registration certificate'
          ],
          applicationProcess: 'Online through Karnataka Agriculture Department portal',
          deadline: 'Ongoing',
          website: 'https://raitamitra.karnataka.gov.in',
          helpline: '1800-XXX-XXXX'
        }
      },
      tamil_nadu: {
        freeElectricity: {
          schemeId: 'TN001',
          name: 'Free Electricity for Agriculture',
          description: 'Free electricity supply for agricultural pump sets',
          category: 'infrastructure',
          benefits: {
            electricity: 'Free electricity for agricultural purposes',
            connection: 'Subsidized connection charges',
            maintenance: 'Free maintenance support'
          },
          eligibility: {
            farmers: 'All farmers with agricultural pump sets',
            landOwnership: 'Must have valid land records',
            pumpSet: 'Must have registered pump set'
          },
          documentsRequired: [
            'Aadhaar Card',
            'Land records',
            'Pump set registration certificate',
            'Electricity connection details'
          ],
          applicationProcess: 'Through Tamil Nadu Electricity Board',
          deadline: 'Ongoing',
          website: 'https://tneb.gov.in',
          helpline: '1800-XXX-XXXX'
        }
      }
    };
  }

  /**
   * Recommend government schemes based on farmer profile
   */
  async recommendSchemes(farmerProfile, filters = {}) {
    try {
      logger.info('=== Starting recommendSchemes ===');
      logger.info('Farmer Profile:', JSON.stringify(farmerProfile, null, 2));
      logger.info('Filters:', JSON.stringify(filters, null, 2));
      
      const cacheKey = `schemes:${JSON.stringify(farmerProfile)}:${JSON.stringify(filters)}`;
      try {
        const cached = await cache.get(cacheKey);
        if (cached) {
          logger.info('Returning cached schemes');
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        logger.warn('Cache not available, continuing without cache');
      }

      // Try to get real-time schemes from government API (with timeout)
      const governmentAPIService = require('./governmentAPIService');
      const state = farmerProfile?.location?.state || 'Punjab';
      const category = filters?.category || null;
      
      let realTimeSchemes = null;
      // Use Promise.race to timeout external API calls after 8 seconds
      // (Multiple parallel API calls may take longer, but we don't want to wait forever)
      try {
        const apiPromise = governmentAPIService.getRealTimeSchemes(state, category);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 8000)
        );
        realTimeSchemes = await Promise.race([apiPromise, timeoutPromise]);
        if (realTimeSchemes && realTimeSchemes.length > 0) {
          logger.info(`✅ Successfully fetched ${realTimeSchemes.length} real-time schemes from government APIs`);
        }
      } catch (apiError) {
        // Silently fail - use local database instead
        if (apiError.message !== 'API timeout') {
          logger.warn('Government API unavailable, using local database:', apiError.message);
        } else {
          logger.warn('Government API request timed out, using local database');
        }
      }

      // Get all applicable schemes (from local database or merged with API)
      const allSchemes = await this.getAllApplicableSchemes(farmerProfile);
      
      // If we got real-time schemes, merge them
      if (realTimeSchemes && realTimeSchemes.length > 0) {
        // Add real-time schemes to the list (avoid duplicates)
        const existingIds = new Set(allSchemes.map(s => s.schemeId));
        realTimeSchemes.forEach(scheme => {
          if (!existingIds.has(scheme.schemeId)) {
            allSchemes.push(scheme);
          }
        });
      }

      // Process ALL schemes in parallel (eligibility + relevance score calculation)
      // This is much faster than sequential processing
      logger.info(`Processing ${allSchemes.length} schemes for eligibility and relevance scoring`);
      const schemesWithScores = await Promise.all(
        allSchemes.map(async (scheme) => {
          try {
            const eligibility = await this.checkEligibility(scheme, farmerProfile);
            // Pass eligibility to avoid duplicate calculation
            const relevanceScore = await this.calculateRelevanceScore(scheme, farmerProfile, eligibility);
            
            // Generate recommendation reasons
            const recommendationReasons = this.generateRecommendationReasonsForScheme(
              scheme, 
              farmerProfile, 
              eligibility, 
              relevanceScore
            );
            
            return {
              ...scheme,
              eligibilityDetails: eligibility,
              relevanceScore: relevanceScore,
              isEligible: eligibility.eligible,
              recommendationReasons: recommendationReasons
            };
          } catch (error) {
            // If eligibility check fails, still include the scheme with default values
            logger.warn(`Error checking eligibility for scheme ${scheme.schemeId}:`, error.message);
            return {
              ...scheme,
              eligibilityDetails: { 
                eligible: false, 
                matchedCriteria: [], 
                rejectionReasons: ['Error checking eligibility'],
                summary: '❌ Unable to verify eligibility due to an error.'
              },
              relevanceScore: 50, // Default score
              isEligible: false,
              recommendationReasons: []
            };
          }
        })
      );
      
      logger.info(`Processed ${schemesWithScores.length} schemes. Eligible: ${schemesWithScores.filter(s => s.isEligible).length}`);

      // Sort all schemes by relevance score
      schemesWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Filter eligible schemes
      const eligibleSchemes = schemesWithScores.filter(s => s.isEligible);

      // Apply category filter if specified
      let filteredSchemes = eligibleSchemes;
      if (filters.category) {
        filteredSchemes = eligibleSchemes.filter(s => s.category === filters.category);
      }

      // Sort eligible schemes by relevance score (already sorted, but ensure)
      filteredSchemes.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Group by category and priority in a single pass (more efficient)
      let groupedSchemes = {};
      let allSchemesGrouped = {};
      let deadlineAlerts = [];
      
      // Pre-calculate priority groups to avoid multiple filter passes
      const allHighPriority = [];
      const allMediumPriority = [];
      const allLowPriority = [];
      const eligibleHighPriority = [];
      const eligibleMediumPriority = [];
      const eligibleLowPriority = [];

      schemesWithScores.forEach(scheme => {
        // Categorize by priority for all schemes
        if (scheme.relevanceScore >= 80) {
          allHighPriority.push(scheme);
        } else if (scheme.relevanceScore >= 50) {
          allMediumPriority.push(scheme);
        } else {
          allLowPriority.push(scheme);
        }

        // Categorize by priority for eligible schemes
        if (scheme.isEligible) {
          if (scheme.relevanceScore >= 80) {
            eligibleHighPriority.push(scheme);
          } else if (scheme.relevanceScore >= 50) {
            eligibleMediumPriority.push(scheme);
          } else {
            eligibleLowPriority.push(scheme);
          }
        }
      });
      
      try {
        groupedSchemes = this.groupByCategory(filteredSchemes);
      } catch (e) {
        logger.warn('Error grouping schemes by category:', e);
      }
      
      try {
        // Group all schemes by category
        allSchemesGrouped = this.groupByCategory(schemesWithScores);
      } catch (e) {
        logger.warn('Error grouping all schemes by category:', e);
      }

      try {
        // Get deadline alerts
        deadlineAlerts = this.getDeadlineAlerts(filteredSchemes);
      } catch (e) {
        logger.warn('Error getting deadline alerts:', e);
      }

      const result = {
        totalSchemesFound: schemesWithScores.length,
        eligibleSchemes: eligibleSchemes.length,
        recommendedSchemes: filteredSchemes.length,
        // All schemes (for "Total Schemes" view) - Always include all schemes
        allSchemes: schemesWithScores,
        allSchemesByPriority: {
          highPriority: allHighPriority,
          mediumPriority: allMediumPriority,
          lowPriority: allLowPriority
        },
        allSchemesByCategory: allSchemesGrouped,
        // Eligible schemes only (for "Eligible Schemes" view)
        eligibleSchemesList: filteredSchemes,
        schemesByPriority: {
          highPriority: eligibleHighPriority,
          mediumPriority: eligibleMediumPriority,
          lowPriority: eligibleLowPriority
        },
        schemesByCategory: groupedSchemes,
        topRecommendations: filteredSchemes.length > 0 ? filteredSchemes.slice(0, 5) : schemesWithScores.slice(0, 5),
        deadlineAlerts: deadlineAlerts,
        recommendationReasons: this.safeGenerateRecommendationReasons(filteredSchemes, farmerProfile),
        nextSteps: this.safeGenerateNextSteps(filteredSchemes),
        timestamp: new Date().toISOString()
      };

      logger.info(`Returning ${result.totalSchemesFound} total schemes (${result.eligibleSchemes} eligible)`);

      // Cache for 1 hour (cache expects JSON string)
      try {
        await cache.set(cacheKey, JSON.stringify(result), 3600);
      } catch (cacheError) {
        logger.warn('Cache not available, skipping cache write');
      }

      return result;
    } catch (error) {
      logger.error('Error recommending schemes:', error);
      logger.error('Error stack:', error.stack);
      // Return fallback recommendations instead of throwing
      return this.getFallbackRecommendations(farmerProfile);
    }
  }

  async getAllApplicableSchemes(farmerProfile) {
    /**Get all schemes applicable to farmer's location*/
    const schemes = [];

    // Verify database is loaded
    if (!this.schemeDatabase) {
      logger.error('Scheme database not initialized! Reinitializing...');
      this.schemeDatabase = this.loadSchemeDatabase();
    }

    if (!this.schemeDatabase.central) {
      logger.error('Central schemes database missing!');
      return schemes;
    }

    // Get farmer's state and normalize it
    let state = farmerProfile?.location?.state || '';
    
    // Normalize state name to match database keys
    // Convert "Uttar Pradesh" -> "uttar_pradesh", "Tamil Nadu" -> "tamil_nadu", etc.
    if (state) {
      state = state.toLowerCase().replace(/\s+/g, '_');
    }

    logger.info(`Loading schemes for state: ${state || 'all states'}`);
    logger.info(`Database has central schemes: ${!!this.schemeDatabase.central}`);
    logger.info(`Central schemes keys: ${Object.keys(this.schemeDatabase.central).join(', ')}`);

    // Always add central government schemes (available to all states)
    const centralSchemes = Object.values(this.schemeDatabase.central);
    logger.info(`Found ${centralSchemes.length} central schemes in database`);
    
    centralSchemes.forEach(scheme => {
      if (scheme && scheme.schemeId) {
        schemes.push({ ...scheme, level: 'central' });
      } else {
        logger.warn('Invalid scheme found in central database:', scheme);
      }
    });
    logger.info(`Added ${schemes.length} central government schemes`);

    // Add state-specific schemes if state is provided and exists in database
    if (state && this.schemeDatabase[state]) {
      const stateSchemes = Object.values(this.schemeDatabase[state]);
      logger.info(`Found ${stateSchemes.length} state schemes for ${state}`);
      stateSchemes.forEach(scheme => {
        if (scheme && scheme.schemeId) {
          schemes.push({ ...scheme, level: 'state', state: state });
        } else {
          logger.warn(`Invalid scheme found in ${state} database:`, scheme);
        }
      });
      logger.info(`Added ${stateSchemes.length} state-specific schemes for ${state}`);
    } else if (state) {
      logger.warn(`State "${state}" not found in database. Available states: ${Object.keys(this.schemeDatabase).filter(k => k !== 'central').join(', ')}`);
    }

    logger.info(`Total schemes loaded: ${schemes.length}`);
    return schemes;
  }

  async checkEligibility(scheme, farmerProfile) {
    /**Check if farmer is eligible for a scheme with detailed reasons*/
    const eligibility = scheme.eligibility || {};
    const matchedCriteria = [];
    const rejectionReasons = [];
    const detailedReasons = [];

    // Check land ownership
    if (eligibility.landOwnership !== undefined) {
      const hasLand = farmerProfile?.farmDetails?.landOwnership || false;
      if (hasLand === eligibility.landOwnership) {
        matchedCriteria.push('Land ownership requirement met');
        detailedReasons.push({
          type: 'eligibility',
          status: 'met',
          requirement: 'Land Ownership',
          description: eligibility.landOwnership 
            ? 'You own land, which meets the requirement for this scheme.'
            : 'You do not own land, which meets the requirement for this scheme.',
          value: hasLand ? 'Yes' : 'No'
        });
      } else {
        const reason = eligibility.landOwnership 
          ? 'This scheme requires land ownership. You need to own land to be eligible.'
          : 'This scheme is for farmers without land ownership. You own land, so you are not eligible.';
        rejectionReasons.push('Land ownership requirement not met');
        detailedReasons.push({
          type: 'eligibility',
          status: 'not_met',
          requirement: 'Land Ownership',
          description: reason,
          value: hasLand ? 'Yes' : 'No',
          required: eligibility.landOwnership ? 'Yes' : 'No'
        });
      }
    }

    // Check land size
    if (eligibility.landSizeMin !== undefined || eligibility.landSizeMax !== undefined) {
      // Convert from square feet/cents to hectares if needed
      let landSize = farmerProfile?.farmDetails?.landSize || 0;
      
      // If landSize is in square feet/cents format, convert to hectares
      if (farmerProfile?.farmDetails?.landSizeSqFeet !== undefined || farmerProfile?.farmDetails?.landSizeCents !== undefined) {
        const sqFeet = farmerProfile.farmDetails.landSizeSqFeet || 0;
        const cents = farmerProfile.farmDetails.landSizeCents || 0;
        landSize = LandConverter.toHectares(sqFeet, cents);
      }
      
      const minSize = eligibility.landSizeMin || 0;
      const maxSize = eligibility.landSizeMax || Infinity;
      const landDisplay = farmerProfile?.farmDetails?.landSizeSqFeet !== undefined 
        ? LandConverter.format(farmerProfile.farmDetails.landSizeSqFeet || 0, farmerProfile.farmDetails.landSizeCents || 0)
        : `${landSize.toFixed(4)} ha`;

      if (landSize >= minSize && landSize <= maxSize) {
        matchedCriteria.push(`Land size (${landDisplay}) within required range`);
        const rangeText = maxSize === Infinity 
          ? `at least ${minSize} ha`
          : `between ${minSize} ha and ${maxSize} ha`;
        detailedReasons.push({
          type: 'eligibility',
          status: 'met',
          requirement: 'Land Size',
          description: `Your land size (${landDisplay}) meets the requirement (${rangeText}).`,
          value: landDisplay,
          required: rangeText
        });
      } else {
        const rangeText = maxSize === Infinity 
          ? `at least ${minSize} ha`
          : `between ${minSize} ha and ${maxSize} ha`;
        let reason = '';
        if (landSize < minSize) {
          reason = `This scheme requires a minimum land size of ${minSize} ha. Your land (${landDisplay}) is below this requirement.`;
        } else if (landSize > maxSize) {
          reason = `This scheme has a maximum land size limit of ${maxSize} ha. Your land (${landDisplay}) exceeds this limit.`;
        }
        rejectionReasons.push(`Land size (${landDisplay}) outside required range`);
        detailedReasons.push({
          type: 'eligibility',
          status: 'not_met',
          requirement: 'Land Size',
          description: reason,
          value: landDisplay,
          required: rangeText
        });
      }
    }

    // Check exclusions
    if (scheme.eligibility?.exclusions && scheme.eligibility.exclusions.length > 0) {
      const farmerCategory = farmerProfile?.category || '';
      const isExcluded = scheme.eligibility.exclusions.some(exclusion =>
        farmerCategory.toLowerCase().includes(exclusion.toLowerCase())
      );
      if (isExcluded) {
        rejectionReasons.push('Farmer falls under exclusion category');
        detailedReasons.push({
          type: 'eligibility',
          status: 'excluded',
          requirement: 'Exclusion Categories',
          description: `This scheme excludes certain categories: ${scheme.eligibility.exclusions.join(', ')}. You fall under one of these exclusion categories.`,
          exclusions: scheme.eligibility.exclusions
        });
      } else {
        detailedReasons.push({
          type: 'eligibility',
          status: 'met',
          requirement: 'Exclusion Check',
          description: 'You do not fall under any exclusion categories for this scheme.',
          exclusions: scheme.eligibility.exclusions
        });
      }
    }

    // Check income limit
    if (eligibility.annualIncome) {
      const farmerIncome = farmerProfile?.annualIncome || 0;
      const incomeLimit = parseInt(eligibility.annualIncome.replace(/[^\d]/g, '')) || Infinity;
      if (farmerIncome <= incomeLimit) {
        matchedCriteria.push('Income within eligible range');
        detailedReasons.push({
          type: 'eligibility',
          status: 'met',
          requirement: 'Annual Income',
          description: `Your annual income (₹${farmerIncome.toLocaleString()}) is within the eligible limit (${eligibility.annualIncome}).`,
          value: `₹${farmerIncome.toLocaleString()}`,
          required: eligibility.annualIncome
        });
      } else {
        rejectionReasons.push('Income exceeds eligible limit');
        detailedReasons.push({
          type: 'eligibility',
          status: 'not_met',
          requirement: 'Annual Income',
          description: `This scheme is for farmers with income ${eligibility.annualIncome}. Your annual income (₹${farmerIncome.toLocaleString()}) exceeds this limit.`,
          value: `₹${farmerIncome.toLocaleString()}`,
          required: eligibility.annualIncome
        });
      }
    }

    // If no eligibility requirements are defined, consider eligible by default
    // If requirements exist, eligible only if no rejections and at least one match
    const hasRequirements = eligibility.landOwnership !== undefined || 
                            eligibility.landSizeMin !== undefined || 
                            eligibility.landSizeMax !== undefined ||
                            eligibility.annualIncome !== undefined ||
                            (scheme.eligibility?.exclusions && scheme.eligibility.exclusions.length > 0);
    
    const isEligible = hasRequirements 
      ? (rejectionReasons.length === 0 && matchedCriteria.length > 0)
      : true; // No requirements = eligible by default
    
    // Generate summary message
    let summaryMessage = '';
    if (isEligible) {
      if (matchedCriteria.length > 0) {
        summaryMessage = `✅ You are eligible! ${matchedCriteria.join(' ')}`;
      } else {
        summaryMessage = '✅ You are eligible for this scheme.';
      }
    } else {
      if (rejectionReasons.length > 0) {
        summaryMessage = `❌ Not eligible: ${rejectionReasons.join('. ')}`;
      } else {
        summaryMessage = '❌ You do not meet the eligibility requirements for this scheme.';
      }
    }

    return {
      eligible: isEligible,
      matchedCriteria: matchedCriteria,
      rejectionReasons: rejectionReasons,
      detailedReasons: detailedReasons,
      summary: summaryMessage,
      confidence: matchedCriteria.length > 0 || !hasRequirements 
        ? (matchedCriteria.length / (matchedCriteria.length + rejectionReasons.length + 1))
        : 0
    };
  }

  async calculateRelevanceScore(scheme, farmerProfile, eligibilityResult = null) {
    /**Calculate relevance score (0-100) for a scheme*/
    let score = 0;

    // Eligibility match (40 points)
    // Use provided eligibility result if available to avoid duplicate calculation
    const eligibility = eligibilityResult || await this.checkEligibility(scheme, farmerProfile);
    score += eligibility.confidence * 40;

    // Financial benefit (25 points)
    const financialScore = this.calculateFinancialScore(scheme);
    score += financialScore * 0.25;

    // Urgency/deadline (15 points)
    const urgencyScore = this.calculateUrgencyScore(scheme);
    score += urgencyScore * 0.15;

    // Farmer needs match (10 points)
    const needsScore = this.calculateNeedsScore(scheme, farmerProfile);
    score += needsScore * 0.10;

    // Application simplicity (10 points)
    const simplicityScore = this.calculateSimplicityScore(scheme);
    score += simplicityScore * 0.10;

    return Math.round(score);
  }

  calculateFinancialScore(scheme) {
    /**Calculate financial benefit score*/
    const benefits = scheme.benefits || {};
    let score = 0;

    if (benefits.amount) {
      const amountStr = benefits.amount;
      const numbers = amountStr.match(/\d+/g);
      if (numbers) {
        const amount = parseInt(numbers[0]);
        score = Math.min(amount / 500, 100); // Normalize
      }
    }

    const subsidyPct = scheme.subsidyPercentage;
    if (typeof subsidyPct === 'number') {
      score = Math.max(score, subsidyPct);
    }

    return Math.min(score, 100);
  }

  calculateUrgencyScore(scheme) {
    /**Calculate urgency based on deadline*/
    const deadline = scheme.deadline || '';

    if (!deadline || deadline.toLowerCase() === 'ongoing') {
      return 50;
    }

    // Parse deadline and calculate days remaining
    // Simplified - would use date parsing in production
    return 50; // Default medium priority
  }

  calculateNeedsScore(scheme, farmerProfile) {
    /**Calculate match with farmer's needs*/
    const schemeCategory = scheme.category;
    const farmerNeeds = farmerProfile?.needs || [];

    const categoryToNeeds = {
      financial: ['income_support', 'loan', 'credit'],
      insurance: ['crop_protection', 'risk_management'],
      water: ['irrigation', 'water_saving'],
      equipment: ['machinery', 'tools'],
      organic: ['organic_farming', 'sustainable'],
      training: ['knowledge', 'skills']
    };

    if (categoryToNeeds[schemeCategory]) {
      const needsForCategory = categoryToNeeds[schemeCategory];
      if (needsForCategory.some(need => farmerNeeds.includes(need))) {
        return 100;
      }
    }

    return 50;
  }

  calculateSimplicityScore(scheme) {
    /**Calculate application simplicity score*/
    const appProcess = scheme.applicationProcess || '';
    const documents = scheme.documentsRequired || [];

    let score = 100;

    if (appProcess.toLowerCase().includes('physical')) {
      score -= 20;
    }

    if (documents.length > 5) {
      score -= (documents.length - 5) * 5;
    }

    if (documents.length === 1 && documents[0].toLowerCase().includes('aadhaar')) {
      score = 100;
    }

    return Math.max(score, 0);
  }

  groupByCategory(schemes) {
    /**Group schemes by category*/
    const grouped = {};

    schemes.forEach(scheme => {
      const category = scheme.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(scheme);
    });

    return grouped;
  }

  getDeadlineAlerts(schemes) {
    /**Get deadline alerts for schemes*/
    const alerts = [];

    schemes.forEach(scheme => {
      const deadline = scheme.deadline || '';
      if (deadline && deadline.toLowerCase() !== 'ongoing') {
        alerts.push({
          schemeId: scheme.schemeId,
          schemeName: scheme.name,
          deadline: deadline,
          alertLevel: 'warning',
          message: `Apply for ${scheme.name} before ${deadline}`
        });
      }
    });

    return alerts;
  }

  generateRecommendationReasonsForScheme(scheme, farmerProfile, eligibility, relevanceScore) {
    /**Generate detailed recommendation reasons for a single scheme*/
    const reasons = [];
    
    // Eligibility-based reasons
    if (eligibility.eligible) {
      if (eligibility.matchedCriteria && eligibility.matchedCriteria.length > 0) {
        reasons.push({
          type: 'eligibility',
          priority: 'high',
          title: '✅ You Meet Eligibility Requirements',
          description: eligibility.summary || 'You are eligible for this scheme.',
          details: eligibility.matchedCriteria
        });
      }
    } else {
      if (eligibility.rejectionReasons && eligibility.rejectionReasons.length > 0) {
        reasons.push({
          type: 'eligibility',
          priority: 'low',
          title: '❌ Eligibility Requirements Not Met',
          description: eligibility.summary || 'You do not meet the eligibility requirements.',
          details: eligibility.rejectionReasons
        });
      }
    }
    
    // Relevance score-based reasons
    if (relevanceScore >= 80) {
      reasons.push({
        type: 'relevance',
        priority: 'high',
        title: '⭐ Highly Recommended',
        description: `This scheme has a ${relevanceScore}% relevance score, making it highly suitable for your profile.`,
        score: relevanceScore
      });
    } else if (relevanceScore >= 50) {
      reasons.push({
        type: 'relevance',
        priority: 'medium',
        title: '📋 Moderately Recommended',
        description: `This scheme has a ${relevanceScore}% relevance score, which is moderately suitable for your profile.`,
        score: relevanceScore
      });
    }
    
    // Financial benefit reasons
    const benefits = scheme.benefits || {};
    if (benefits.amount) {
      reasons.push({
        type: 'benefit',
        priority: 'high',
        title: '💰 Financial Benefit',
        description: `This scheme provides ${benefits.amount} in financial support.`,
        benefit: benefits.amount
      });
    }
    
    if (scheme.subsidyPercentage) {
      reasons.push({
        type: 'benefit',
        priority: 'high',
        title: '💵 Subsidy Available',
        description: `This scheme offers ${scheme.subsidyPercentage}% subsidy, reducing your costs significantly.`,
        benefit: `${scheme.subsidyPercentage}% subsidy`
      });
    }
    
    // Category-based reasons
    const farmerIncome = farmerProfile?.annualIncome || 0;
    const landSize = farmerProfile?.farmDetails?.landSize || 0;
    
    if (scheme.category === 'financial' && farmerIncome < 100000) {
      reasons.push({
        type: 'match',
        priority: 'high',
        title: '💼 Income Support Match',
        description: 'This financial scheme is ideal for farmers with lower income, providing essential support.',
        match: 'Low income farmer'
      });
    }
    
    if (scheme.category === 'insurance') {
      reasons.push({
        type: 'match',
        priority: 'high',
        title: '🛡️ Risk Protection',
        description: 'Crop insurance protects you from losses due to natural disasters, pests, and diseases.',
        match: 'Risk management'
      });
    }
    
    if (scheme.category === 'water' && landSize > 1) {
      reasons.push({
        type: 'match',
        priority: 'medium',
        title: '💧 Water Management',
        description: 'Water management schemes help optimize irrigation and reduce water costs for larger farms.',
        match: 'Large landholding'
      });
    }
    
    // Location-based reasons
    if (scheme.level === 'state' && farmerProfile?.location?.state) {
      reasons.push({
        type: 'location',
        priority: 'medium',
        title: '📍 State-Specific Scheme',
        description: `This is a state-specific scheme for ${farmerProfile.location.state}, tailored to local agricultural needs.`,
        match: farmerProfile.location.state
      });
    }
    
    // Application simplicity
    const appProcess = scheme.applicationProcess || '';
    if (appProcess.toLowerCase().includes('online')) {
      reasons.push({
        type: 'convenience',
        priority: 'medium',
        title: '🖥️ Easy Application',
        description: 'This scheme can be applied for online, making the process quick and convenient.',
        benefit: 'Online application'
      });
    }
    
    return reasons;
  }

  generateRecommendationReasons(schemes, farmerProfile) {
    /**Generate reasons for recommending each scheme (legacy method for compatibility)*/
    const reasons = [];

    schemes.slice(0, 10).forEach(scheme => {
      const schemeReasons = [];

      const landSize = farmerProfile?.farmDetails?.landSize || 0;
      const eligibility = scheme.eligibility || {};

      if (eligibility.landSizeMin && landSize >= eligibility.landSizeMin) {
        schemeReasons.push(`Your land size (${landSize} ha) meets minimum requirement`);
      }

      const farmerIncome = farmerProfile?.annualIncome || 0;
      if (farmerIncome < 100000 && scheme.category === 'financial') {
        schemeReasons.push('This scheme provides crucial income support for low-income farmers');
      }

      reasons.push({
        schemeId: scheme.schemeId,
        schemeName: scheme.name,
        reasons: schemeReasons
      });
    });

    return reasons;
  }

  generateNextSteps(schemes) {
    /**Generate next steps for applying to schemes*/
    const nextSteps = [];

    schemes.slice(0, 5).forEach(scheme => {
      const steps = [];

      const documents = scheme.documentsRequired || [];
      if (documents.length > 0) {
        steps.push({
          step: 1,
          action: 'Collect required documents',
          documents: documents,
          estimatedTime: '1-2 days'
        });
      }

      steps.push({
        step: 2,
        action: `Apply ${scheme.applicationProcess || 'online'}`,
        details: scheme.website || '',
        estimatedTime: '30 minutes - 2 hours'
      });

      steps.push({
        step: 3,
        action: 'Track application status',
        details: scheme.website || '',
        estimatedTime: 'Ongoing'
      });

      nextSteps.push({
        schemeId: scheme.schemeId,
        schemeName: scheme.name,
        steps: steps,
        helpline: scheme.helpline || ''
      });
    });

    return nextSteps;
  }

  getFallbackRecommendations(farmerProfile = {}) {
    /**Fallback recommendations when service fails*/
    // Return some basic schemes even when service fails
    const fallbackSchemes = [
      {
        schemeId: 'CG001',
        name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
        description: 'Direct income support of ₹6,000 per year to all landholding farmer families',
        category: 'financial',
        level: 'central',
        benefits: {
          amount: '₹6,000 per year',
          frequency: '3 installments of ₹2,000 each'
        },
        eligibilityDetails: {
          eligible: true,
          matchedCriteria: ['Land ownership requirement met'],
          confidence: 0.8
        },
        relevanceScore: 85
      },
      {
        schemeId: 'CG002',
        name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        description: 'Crop insurance scheme providing financial support to farmers in case of crop loss',
        category: 'insurance',
        level: 'central',
        benefits: {
          amount: 'Up to 100% of sum insured',
          frequency: 'As per crop season'
        },
        eligibilityDetails: {
          eligible: true,
          matchedCriteria: ['All farmers eligible'],
          confidence: 0.9
        },
        relevanceScore: 80
      },
      {
        schemeId: 'CG003',
        name: 'Soil Health Card Scheme',
        description: 'Provides farmers with soil health cards containing crop-wise recommendations',
        category: 'soil',
        level: 'central',
        benefits: {
          amount: 'Free soil testing and recommendations',
          frequency: 'Every 3 years'
        },
        eligibilityDetails: {
          eligible: true,
          matchedCriteria: ['All farmers eligible'],
          confidence: 1.0
        },
        relevanceScore: 75
      }
    ];
    
    return {
      totalSchemesFound: fallbackSchemes.length,
      eligibleSchemes: fallbackSchemes.length,
      recommendedSchemes: fallbackSchemes.length,
      allSchemes: fallbackSchemes,
      schemesByPriority: {
        highPriority: fallbackSchemes.filter(s => s.relevanceScore >= 80),
        mediumPriority: fallbackSchemes.filter(s => s.relevanceScore >= 50 && s.relevanceScore < 80),
        lowPriority: []
      },
      schemesByCategory: {
        financial: [fallbackSchemes[0]],
        insurance: [fallbackSchemes[1]],
        soil: [fallbackSchemes[2]]
      },
      topRecommendations: fallbackSchemes,
      deadlineAlerts: [],
      message: 'Showing available government schemes',
      fallback: true
    };
  }

  /**
   * Get scheme details by ID
   */
  async getSchemeDetails(schemeId) {
    /**Get detailed information about a specific scheme*/
    for (const categorySchemes of Object.values(this.schemeDatabase)) {
      if (typeof categorySchemes === 'object') {
        for (const scheme of Object.values(categorySchemes)) {
          if (scheme.schemeId === schemeId) {
            return scheme;
          }
        }
      }
    }
    return null;
  }

  /**
   * Check eligibility for a specific scheme
   */
  async checkSchemeEligibility(schemeId, farmerProfile) {
    /**Check detailed eligibility for a specific scheme*/
    const scheme = await this.getSchemeDetails(schemeId);

    if (!scheme) {
      return {
        eligible: false,
        error: 'Scheme not found'
      };
    }

    const eligibility = await this.checkEligibility(scheme, farmerProfile);

    return {
      schemeId: schemeId,
      schemeName: scheme.name,
      eligible: eligibility.eligible,
      eligibilityDetails: eligibility,
      documentsRequired: scheme.documentsRequired || [],
      applicationProcess: scheme.applicationProcess || '',
      website: scheme.website || '',
      helpline: scheme.helpline || ''
    };
  }

  /**
   * Apply for a government scheme
   */
  async applyForScheme(schemeId, farmerProfile, documents = []) {
    try {
      // Check eligibility first
      const eligibility = await this.checkSchemeEligibility(schemeId, farmerProfile);

      if (!eligibility.eligible) {
        return {
          success: false,
          message: 'Not eligible for this scheme',
          reasons: eligibility.eligibilityDetails?.rejectionReasons || [],
          suggestedAlternatives: await this.suggestAlternatives(schemeId, farmerProfile)
        };
      }

      // Submit application through application manager
      const applicationResult = await this.applicationManager.submitApplication(
        schemeId,
        farmerProfile,
        documents,
        eligibility
      );

      return {
        success: true,
        ...applicationResult
      };
    } catch (error) {
      logger.error('Error applying for scheme:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit application'
      };
    }
  }

  /**
   * Track application status
   */
  async trackApplication(applicationId) {
    try {
      return await this.applicationManager.getApplicationStatus(applicationId);
    } catch (error) {
      logger.error('Error tracking application:', error);
      return {
        success: false,
        error: error.message || 'Failed to track application'
      };
    }
  }

  /**
   * Get farmer's application history
   */
  async getFarmerApplications(farmerId) {
    try {
      return await this.applicationManager.getFarmerApplications(farmerId);
    } catch (error) {
      logger.error('Error getting farmer applications:', error);
      return [];
    }
  }

  /**
   * Get scheme calendar for farmer
   */
  async getSchemeCalendar(farmerProfile) {
    try {
      const schemes = await this.getAllApplicableSchemes(farmerProfile);
      const calendarEvents = [];

      schemes.forEach(scheme => {
        const deadline = scheme.deadline || '';
        if (deadline && deadline.toLowerCase() !== 'ongoing' && deadline.toLowerCase() !== 'continuous') {
          try {
            // Parse deadline (simplified - would use proper date parsing in production)
            const deadlineDate = new Date(deadline);
            if (!isNaN(deadlineDate.getTime())) {
              const today = new Date();
              const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

              calendarEvents.push({
                schemeId: scheme.schemeId,
                schemeName: scheme.name,
                eventType: 'application_deadline',
                date: deadlineDate.toISOString().split('T')[0],
                daysRemaining: daysRemaining,
                priority: daysRemaining <= 30 ? 'high' : 'medium',
                category: scheme.category,
                reminderDates: this.calculateReminderDates(deadlineDate)
              });
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
      });

      // Sort by date
      calendarEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        farmerId: farmerProfile.farmerId || farmerProfile.userId,
        totalEvents: calendarEvents.length,
        upcomingDeadlines: calendarEvents.filter(e => e.daysRemaining > 0),
        missedDeadlines: calendarEvents.filter(e => e.daysRemaining < 0),
        monthlyView: this.createMonthlyView(calendarEvents)
      };
    } catch (error) {
      logger.error('Error getting scheme calendar:', error);
      return {
        farmerId: farmerProfile.farmerId || farmerProfile.userId,
        totalEvents: 0,
        upcomingDeadlines: [],
        missedDeadlines: [],
        monthlyView: {}
      };
    }
  }

  /**
   * Suggest alternative schemes
   */
  async suggestAlternatives(schemeId, farmerProfile) {
    try {
      const originalScheme = await this.getSchemeDetails(schemeId);
      if (!originalScheme) return [];

      // Get all schemes in same category
      const allSchemes = await this.getAllApplicableSchemes(farmerProfile);
      const alternatives = allSchemes
        .filter(s => s.category === originalScheme.category && s.schemeId !== schemeId)
        .slice(0, 3);

      // Check eligibility for alternatives
      const eligibleAlternatives = [];
      for (const alt of alternatives) {
        const eligibility = await this.checkEligibility(alt, farmerProfile);
        if (eligibility.eligible) {
          eligibleAlternatives.push({
            ...alt,
            relevanceScore: await this.calculateRelevanceScore(alt, farmerProfile),
            eligibilityDetails: eligibility
          });
        }
      }

      return eligibleAlternatives.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      logger.error('Error suggesting alternatives:', error);
      return [];
    }
  }

  /**
   * Calculate reminder dates for deadline
   */
  calculateReminderDates(deadlineDate) {
    const reminders = [];
    const today = new Date();
    const daysRemaining = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 30) {
      reminders.push({
        date: new Date(deadlineDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: '30 days before deadline'
      });
    }
    if (daysRemaining > 7) {
      reminders.push({
        date: new Date(deadlineDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: '7 days before deadline'
      });
    }
    if (daysRemaining > 1) {
      reminders.push({
        date: new Date(deadlineDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        message: '1 day before deadline'
      });
    }

    return reminders;
  }

  /**
   * Create monthly view of calendar events
   */
  /**
   * Safe wrapper for generateRecommendationReasons
   */
  safeGenerateRecommendationReasons(schemes, farmerProfile) {
    try {
      return this.generateRecommendationReasons(schemes, farmerProfile);
    } catch (error) {
      logger.warn('Error generating recommendation reasons:', error);
      return [];
    }
  }

  /**
   * Safe wrapper for generateNextSteps
   */
  safeGenerateNextSteps(schemes) {
    try {
      return this.generateNextSteps(schemes);
    } catch (error) {
      logger.warn('Error generating next steps:', error);
      return [];
    }
  }

  createMonthlyView(calendarEvents) {
    const monthlyView = {};

    calendarEvents.forEach(event => {
      const date = new Date(event.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyView[monthKey]) {
        monthlyView[monthKey] = [];
      }

      monthlyView[monthKey].push(event);
    });

    return monthlyView;
  }
}

module.exports = new GovernmentSchemeService();
