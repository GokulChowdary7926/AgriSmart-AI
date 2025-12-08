/**
 * Government Schemes Routes
 * API endpoints for government scheme recommendations
 */

const express = require('express');
const router = express.Router();
const governmentSchemeService = require('../services/governmentSchemeService');
const { authenticateToken } = require('../middleware/auth');
const LandConverter = require('../utils/landConverter');

/**
 * GET /api/government-schemes/recommend
 * Get recommended government schemes for a farmer (GET version for easier access)
 */
router.get('/recommend', async (req, res) => {
  try {
    // Extract farmer profile from query params or use defaults
    const farmerProfile = {
      location: {
        state: req.query.state || 'Punjab',
        district: req.query.district || 'Ludhiana'
      },
      farmDetails: {
        landSize: parseFloat(req.query.landSize) || 2.5,
        landOwnership: req.query.landOwnership !== 'false'
      },
      annualIncome: parseFloat(req.query.annualIncome) || 80000,
      cropsGrown: req.query.cropsGrown ? req.query.cropsGrown.split(',') : ['wheat', 'rice'],
      socialCategory: req.query.socialCategory || ''
    };

    const recommendations = await governmentSchemeService.recommendSchemes(farmerProfile, {
      showOnlyEligible: req.query.showOnlyEligible === 'true',
      sortBy: req.query.sortBy || 'relevance_score'
    });

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error recommending schemes (GET):', error);
    console.error('Error stack:', error.stack);
    // Return empty array instead of error to prevent frontend crashes
    res.json({
      success: true,
      data: []
    });
  }
});

/**
 * POST /api/government-schemes/recommend
 * Get recommended government schemes for a farmer
 */
router.post('/recommend', async (req, res) => {
  try {
    let { farmerProfile, filters } = req.body;

    // If no farmer profile provided, use default or try to get from authenticated user
    if (!farmerProfile) {
      // Try to get from authenticated user
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
          const User = require('../models/User');
          const user = await User.findById(decoded.userId);
          if (user && user.farmerProfile) {
            farmerProfile = {
              location: user.farmerProfile.location || { state: 'Punjab', district: 'Ludhiana' },
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
          // Auth failed, use default
        }
      }
      
      // Default profile if still not set
      if (!farmerProfile) {
        // Default: 1 sq ft (minimum)
        farmerProfile = {
          location: { state: 'Punjab', district: 'Ludhiana' },
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
      // Fill in missing fields with defaults
      farmerProfile.location = farmerProfile.location || { state: 'Punjab', district: 'Ludhiana' };
      
      // Handle land size conversion
      if (farmerProfile.farmDetails) {
        // If land size is provided in sq feet/cents, convert to hectares
        if (farmerProfile.farmDetails.landSizeSqFeet !== undefined || farmerProfile.farmDetails.landSizeCents !== undefined) {
          const sqFeet = farmerProfile.farmDetails.landSizeSqFeet || 0;
          const cents = farmerProfile.farmDetails.landSizeCents || 0;
          farmerProfile.farmDetails.landSize = LandConverter.toHectares(sqFeet, cents);
        } else if (!farmerProfile.farmDetails.landSize) {
          // Default to 1 sq ft if no land size specified
          farmerProfile.farmDetails.landSize = LandConverter.toHectares(1, 0);
          farmerProfile.farmDetails.landSizeSqFeet = 1;
          farmerProfile.farmDetails.landSizeCents = 0;
        } else {
          // If landSize is already in hectares, calculate sq feet/cents for display
          // 1 hectare = 107639.104 sq feet = 247.105 cents
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
      recommendations = await governmentSchemeService.recommendSchemes(farmerProfile, filters);
    } catch (serviceError) {
      console.error('Service error recommending schemes:', serviceError);
      console.error('Service error stack:', serviceError.stack);
      
      // Try fallback
      try {
        recommendations = governmentSchemeService.getFallbackRecommendations(farmerProfile || {});
        // Wrap fallback in expected format
        recommendations = {
          totalSchemesFound: recommendations.length || 0,
          eligibleSchemes: recommendations.length || 0,
          recommendedSchemes: recommendations.length || 0,
          allSchemes: recommendations,
          eligibleSchemesList: recommendations,
          topRecommendations: recommendations.slice(0, 5),
          schemesByCategory: {},
          schemesByPriority: {
            highPriority: recommendations.filter(s => (s.relevanceScore || 0) >= 80),
            mediumPriority: recommendations.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
            lowPriority: recommendations.filter(s => (s.relevanceScore || 0) < 50)
          },
          fallback: true
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Return minimal fallback
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

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Unexpected error in recommend route:', error);
    console.error('Error stack:', error.stack);
    
    // Final fallback - return empty but valid structure
    res.json({
      success: true,
      data: {
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
      }
    });
  }
});

/**
 * GET /api/government-schemes/:schemeId
 * Get details of a specific scheme
 */
router.get('/:schemeId', async (req, res) => {
  try {
    const { schemeId } = req.params;

    const scheme = await governmentSchemeService.getSchemeDetails(schemeId);

    if (!scheme) {
      return res.status(404).json({
        success: false,
        error: 'Scheme not found'
      });
    }

    res.json({
      success: true,
      data: scheme
    });
  } catch (error) {
    console.error('Error getting scheme details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheme details'
    });
  }
});

/**
 * POST /api/government-schemes/:schemeId/eligibility
 * Check eligibility for a specific scheme
 */
router.post('/:schemeId/eligibility', authenticateToken, async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { farmerProfile } = req.body;

    if (!farmerProfile) {
      return res.status(400).json({
        success: false,
        error: 'Farmer profile is required'
      });
    }

    const eligibility = await governmentSchemeService.checkSchemeEligibility(schemeId, farmerProfile);

    res.json({
      success: true,
      data: eligibility
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility'
    });
  }
});

/**
 * GET /api/government-schemes/categories/list
 * Get list of all scheme categories
 */
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

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

/**
 * POST /api/government-schemes/:schemeId/apply
 * Apply for a government scheme
 */
router.post('/:schemeId/apply', authenticateToken, async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { farmerProfile, documents } = req.body;

    if (!farmerProfile) {
      return res.status(400).json({
        success: false,
        error: 'Farmer profile is required'
      });
    }

    // Add farmer ID from authenticated user
    if (!farmerProfile.farmerId && req.user) {
      farmerProfile.farmerId = req.user.userId;
      farmerProfile.userId = req.user.userId;
    }

    const result = await governmentSchemeService.applyForScheme(schemeId, farmerProfile, documents || []);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error applying for scheme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application'
    });
  }
});

/**
 * GET /api/government-schemes/applications/:applicationId
 * Track application status
 */
router.get('/applications/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;

    const status = await governmentSchemeService.trackApplication(applicationId);

    res.json({
      success: status.success !== false,
      data: status
    });
  } catch (error) {
    console.error('Error tracking application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track application'
    });
  }
});

/**
 * GET /api/government-schemes/applications
 * Get all applications for the authenticated farmer
 */
router.get('/applications', authenticateToken, async (req, res) => {
  try {
    const farmerId = req.user.userId;

    const applications = await governmentSchemeService.getFarmerApplications(farmerId);

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error getting applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get applications'
    });
  }
});

/**
 * POST /api/government-schemes/calendar
 * Get scheme calendar for farmer
 */
router.post('/calendar', authenticateToken, async (req, res) => {
  try {
    const { farmerProfile } = req.body;

    // Use authenticated user's profile if not provided
    if (!farmerProfile && req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user.userId);
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
      return res.status(400).json({
        success: false,
        error: 'Farmer profile is required'
      });
    }

    const calendar = await governmentSchemeService.getSchemeCalendar(farmerProfile);

    res.json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error getting calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar'
    });
  }
});

module.exports = router;
