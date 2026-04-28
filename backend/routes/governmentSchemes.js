
const express = require('express');
const router = express.Router();
const governmentSchemeService = require('../services/governmentSchemeService');
const { authenticateToken } = require('../middleware/auth');
const LandConverter = require('../utils/landConverter');
const logger = require('../utils/logger');
const { badRequest, notFound, serverError, ok } = require('../utils/httpResponses');

function getUserId(req) {
  return req.user?._id || req.user?.userId || req.user?.id || null;
}

function parsePositiveNumber(value, defaultValue, { min = 0, max = 1000000 } = {}) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeLocation(input = {}) {
  return {
    state: String(input.state || '').trim(),
    district: String(input.district || '').trim()
  };
}

router.get('/recommend', async (req, res) => {
  try {
    const farmerProfile = {
      location: normalizeLocation({
        state: req.query.state,
        district: req.query.district
      }),
      farmDetails: {
        landSize: parsePositiveNumber(req.query.landSize, 2.5, { min: 0.01, max: 10000 }),
        landOwnership: req.query.landOwnership !== 'false'
      },
      annualIncome: parsePositiveNumber(req.query.annualIncome, 80000, { min: 0, max: 50000000 }),
      cropsGrown: req.query.cropsGrown ? req.query.cropsGrown.split(',') : ['wheat', 'rice'],
      socialCategory: req.query.socialCategory || ''
    };

    const recommendations = await governmentSchemeService.recommendSchemes(farmerProfile, {
      showOnlyEligible: req.query.showOnlyEligible === 'true',
      sortBy: req.query.sortBy || 'relevance_score'
    });

    return ok(res, recommendations, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    logger.error('Error recommending schemes (GET):', error);
    logger.error('Error stack:', error.stack);
    return ok(res, [], {
      source: 'AgriSmart AI',
      isFallback: true,
      degradedReason: 'government_schemes_recommendation_error'
    });
  }
});

router.post('/recommend', async (req, res) => {
  try {
    logger.info('=== POST /government-schemes/recommend called ===');
    logger.info('Request body:', JSON.stringify(req.body, null, 2));
    
    let { farmerProfile, filters } = req.body;

    if (!farmerProfile) {
      if (req.headers.authorization && process.env.JWT_SECRET) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          if (user && user.farmerProfile) {
            farmerProfile = {
              location: normalizeLocation(user.farmerProfile.location || {}),
              farmDetails: {
                landSize: user.farmerProfile.landDetails?.totalArea || user.farmerProfile.landSize || 2.5,
                landOwnership: user.farmerProfile.landDetails?.landOwnership !== false
              },
              annualIncome: user.farmerProfile.annualIncome || 80000,
              cropsGrown: user.farmerProfile.landDetails?.crops || user.farmerProfile.crops || ['wheat', 'rice'],
              socialCategory: user.farmerProfile.socialCategory || ''
            };
          }
        } catch (authError) {
        }
      }
      
      if (!farmerProfile) {
        farmerProfile = {
          location: normalizeLocation(req.body?.location || {}),
          farmDetails: {
            landSize: LandConverter.toHectares(1, 0), // 1 sq ft in hectares
            landSizeSqFeet: 1,
            landSizeCents: 0,
            landOwnership: true
          },
          annualIncome: 80000,
          cropsGrown: ['wheat', 'rice'],
          socialCategory: ''
        };
      }
    } else {
      farmerProfile.location = normalizeLocation(farmerProfile.location || req.body?.location || {});
      
      if (farmerProfile.farmDetails) {
        if (farmerProfile.farmDetails.landSizeSqFeet !== undefined || farmerProfile.farmDetails.landSizeCents !== undefined) {
          const sqFeet = farmerProfile.farmDetails.landSizeSqFeet || 0;
          const cents = farmerProfile.farmDetails.landSizeCents || 0;
          farmerProfile.farmDetails.landSize = LandConverter.toHectares(sqFeet, cents);
        } else if (!farmerProfile.farmDetails.landSize) {
          farmerProfile.farmDetails.landSize = LandConverter.toHectares(1, 0);
          farmerProfile.farmDetails.landSizeSqFeet = 1;
          farmerProfile.farmDetails.landSizeCents = 0;
        } else {
          const hectares = farmerProfile.farmDetails.landSize;
          farmerProfile.farmDetails.landSizeSqFeet = hectares * 107639.104;
          farmerProfile.farmDetails.landSizeCents = hectares * 247.105;
        }
      } else {
        farmerProfile.farmDetails = {
          landSize: LandConverter.toHectares(1, 0),
          landSizeSqFeet: 1,
          landSizeCents: 0,
          landOwnership: true
        };
      }
      
      farmerProfile.annualIncome = farmerProfile.annualIncome || 80000;
      farmerProfile.cropsGrown = farmerProfile.cropsGrown || ['wheat', 'rice'];
    }

    let recommendations;
    try {
      try {
        const RealTimeGovernmentSchemeService = require('../services/RealTimeGovernmentSchemeService');
        logger.info('Trying RealTimeGovernmentSchemeService...');
        const realTimeResult = await RealTimeGovernmentSchemeService.getRealTimeSchemes(farmerProfile);
        if (realTimeResult.success && realTimeResult.schemes && realTimeResult.schemes.length > 0) {
          recommendations = {
            totalSchemesFound: realTimeResult.totalSchemes || realTimeResult.schemes.length,
            eligibleSchemes: realTimeResult.schemes.filter(s => s.isEligible !== false).length,
            recommendedSchemes: realTimeResult.schemes.filter(s => (s.relevanceScore || 0) >= 70).length,
            allSchemes: realTimeResult.schemes,
            allSchemesByPriority: {
              highPriority: realTimeResult.schemes.filter(s => (s.relevanceScore || 0) >= 80),
              mediumPriority: realTimeResult.schemes.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
              lowPriority: realTimeResult.schemes.filter(s => (s.relevanceScore || 0) < 50)
            },
            schemesByPriority: {
              highPriority: realTimeResult.schemes.filter(s => s.isEligible && (s.relevanceScore || 0) >= 80),
              mediumPriority: realTimeResult.schemes.filter(s => s.isEligible && (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
              lowPriority: realTimeResult.schemes.filter(s => s.isEligible && (s.relevanceScore || 0) < 50)
            },
            eligibleSchemesList: realTimeResult.schemes.filter(s => s.isEligible !== false),
            topRecommendations: realTimeResult.recommendations || realTimeResult.schemes.slice(0, 5),
            schemesByCategory: {},
            timestamp: realTimeResult.timestamp
          };
          logger.info('Real-time service returned schemes:', recommendations.totalSchemesFound);
        } else {
          throw new Error('Real-time service returned empty result');
        }
      } catch (realtimeError) {
        logger.warn('Real-time service unavailable, using standard service:', realtimeError.message);
        logger.info('Calling governmentSchemeService.recommendSchemes...');
        recommendations = await governmentSchemeService.recommendSchemes(farmerProfile, filters);
      }
      logger.info('Service returned recommendations:', {
        totalSchemesFound: recommendations?.totalSchemesFound,
        allSchemesCount: recommendations?.allSchemes?.length,
        eligibleSchemes: recommendations?.eligibleSchemes
      });
    } catch (serviceError) {
      logger.error('Service error recommending schemes:', serviceError);
      logger.error('Service error stack:', serviceError.stack);
      
      try {
        const fallbackData = governmentSchemeService.getFallbackRecommendations(farmerProfile || {});
        recommendations = fallbackData;
        logger.info('Using fallback recommendations:', recommendations.totalSchemesFound);
      } catch (fallbackError) {
        logger.error('Fallback also failed:', fallbackError);
        recommendations = {
          totalSchemesFound: 0,
          eligibleSchemes: 0,
          recommendedSchemes: 0,
          allSchemes: [],
          eligibleSchemesList: [],
          topRecommendations: [],
          schemesByCategory: {},
          schemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
          fallback: true,
          error: 'Service temporarily unavailable'
        };
      }
    }

    logger.info('Final recommendations before sending:', {
      totalSchemesFound: recommendations?.totalSchemesFound,
      allSchemesCount: recommendations?.allSchemes?.length,
      hasData: !!recommendations
    });

    const isFallbackMode = Boolean(recommendations?.fallback || recommendations?.error);
    return ok(res, recommendations, {
      source: 'AgriSmart AI',
      isFallback: isFallbackMode,
      degradedReason: isFallbackMode ? 'government_schemes_fallback_mode' : null
    });
  } catch (error) {
    logger.error('Unexpected error in recommend route:', error);
    logger.error('Error stack:', error.stack);

    const fallbackResponse = {
      totalSchemesFound: 0,
      eligibleSchemes: 0,
      recommendedSchemes: 0,
      allSchemes: [],
      eligibleSchemesList: [],
      topRecommendations: [],
      schemesByCategory: {},
      schemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
      fallback: true,
      error: 'Service temporarily unavailable'
    };

    return ok(res, fallbackResponse, {
      source: 'AgriSmart AI',
      isFallback: true,
      degradedReason: 'government_schemes_recommend_unexpected_error'
    });
  }
});

router.get('/:schemeId', async (req, res) => {
  try {
    const { schemeId } = req.params;

    const scheme = await governmentSchemeService.getSchemeDetails(schemeId);

    if (!scheme) {
      return notFound(res, 'Scheme not found');
    }

    return ok(res, scheme, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    logger.error('Error getting scheme details:', error);
    return serverError(res, 'Failed to get scheme details');
  }
});

router.post('/:schemeId/eligibility', authenticateToken, async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { farmerProfile } = req.body || {};

    if (!farmerProfile) {
      return badRequest(res, 'Farmer profile is required');
    }

    const eligibility = await governmentSchemeService.checkSchemeEligibility(schemeId, farmerProfile);

    return ok(res, eligibility, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    logger.error('Error checking eligibility:', error);
    return serverError(res, 'Failed to check eligibility');
  }
});

router.get('/test', async (req, res) => {
  try {
    logger.info('=== TEST ENDPOINT CALLED ===');
    const schemes = await governmentSchemeService.getAllApplicableSchemes({
      location: { state: 'Punjab' },
      farmDetails: { landSize: 2.5, landOwnership: true },
      annualIncome: 80000
    });
    
    const recommendations = await governmentSchemeService.recommendSchemes({
      location: { state: 'Punjab', district: 'Ludhiana' },
      farmDetails: { landSize: 2.5, landSizeSqFeet: 269097, landSizeCents: 617, landOwnership: true },
      annualIncome: 80000,
      cropsGrown: ['wheat', 'rice']
    }, { showOnlyEligible: false });
    
    return ok(
      res,
      {
        message: 'Database test',
        getAllApplicableSchemes: {
        schemesCount: schemes.length,
        schemes: schemes.slice(0, 3)
        },
        recommendSchemes: {
        totalSchemesFound: recommendations.totalSchemesFound,
        allSchemesCount: recommendations.allSchemes?.length,
        eligibleSchemes: recommendations.eligibleSchemes,
        firstScheme: recommendations.allSchemes?.[0]?.name
        },
        databaseLoaded: !!governmentSchemeService.schemeDatabase,
        centralSchemesCount: governmentSchemeService.schemeDatabase?.central ? Object.keys(governmentSchemeService.schemeDatabase.central).length : 0
      },
      { source: 'AgriSmart AI', isFallback: false }
    );
  } catch (error) {
    logger.error('Test endpoint error:', error);
    return serverError(res, error.message, error.stack);
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      { id: 'financial', name: 'Financial Support', icon: 'currency-rupee' },
      { id: 'insurance', name: 'Crop Insurance', icon: 'shield-check' },
      { id: 'subsidy', name: 'Subsidies', icon: 'percent' },
      { id: 'training', name: 'Training Programs', icon: 'school' },
      { id: 'infrastructure', name: 'Infrastructure', icon: 'home-city' },
      { id: 'marketing', name: 'Marketing Support', icon: 'store' },
      { id: 'organic', name: 'Organic Farming', icon: 'leaf' },
      { id: 'water', name: 'Water Management', icon: 'water' },
      { id: 'equipment', name: 'Equipment & Machinery', icon: 'build' },
      { id: 'seeds', name: 'Seeds & Inputs', icon: 'spa' },
      { id: 'soil', name: 'Soil Health', icon: 'terrain' },
      { id: 'livestock', name: 'Livestock', icon: 'pets' },
      { id: 'disaster', name: 'Disaster Relief', icon: 'warning' }
    ];

    return ok(res, categories, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    logger.error('Error getting categories:', error);
    return serverError(res, 'Failed to get categories');
  }
});

router.post('/:schemeId/apply', authenticateToken, async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { farmerProfile, documents } = req.body || {};

    if (!farmerProfile) {
      return badRequest(res, 'Farmer profile is required');
    }

    if (!farmerProfile.farmerId && req.user) {
      const userId = getUserId(req);
      farmerProfile.farmerId = userId;
      farmerProfile.userId = userId;
    }

    const result = await governmentSchemeService.applyForScheme(schemeId, farmerProfile, documents || []);

    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false
        ? 'government_schemes_application_degraded'
        : null
    });
  } catch (error) {
    logger.error('Error applying for scheme:', error);
    return serverError(res, 'Failed to submit application');
  }
});

router.get('/applications/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;

    const status = await governmentSchemeService.trackApplication(applicationId);

    return ok(res, status, {
      source: 'AgriSmart AI',
      isFallback: Boolean(status?.fallback || status?.success === false),
      degradedReason: status?.fallback || status?.success === false
        ? 'government_schemes_tracking_degraded'
        : null
    });
  } catch (error) {
    logger.error('Error tracking application:', error);
    return serverError(res, 'Failed to track application');
  }
});

router.get('/applications', authenticateToken, async (req, res) => {
  try {
    const farmerId = getUserId(req);

    const applications = await governmentSchemeService.getFarmerApplications(farmerId);

    return ok(res, applications, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    logger.error('Error getting applications:', error);
    return serverError(res, 'Failed to get applications');
  }
});

router.post('/calendar', authenticateToken, async (req, res) => {
  try {
    let { farmerProfile } = req.body || {};

    if (!farmerProfile && req.user) {
      const User = require('../models/User');
      const user = await User.findById(getUserId(req));
      if (user && user.farmerProfile) {
        farmerProfile = {
          farmerId: user._id,
          userId: user._id,
          location: user.farmerProfile.location || {},
          farmDetails: {
            landSize: user.farmerProfile.landDetails?.totalArea || 0,
            landOwnership: true
          },
          annualIncome: user.farmerProfile.annualIncome || 0
        };
      }
    }

    if (!farmerProfile) {
      return badRequest(res, 'Farmer profile is required');
    }

    const calendar = await governmentSchemeService.getSchemeCalendar(farmerProfile);

    return ok(res, calendar, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    logger.error('Error getting calendar:', error);
    return serverError(res, 'Failed to get calendar');
  }
});

module.exports = router;
