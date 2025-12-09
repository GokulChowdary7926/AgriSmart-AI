import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  AccountBalance,
  CheckCircle,
  Warning,
  Info,
  Schedule,
  AttachMoney,
  Phone,
  Language,
  ExpandMore,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function GovernmentSchemes() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [schemes, setSchemes] = useState(null);
  const [error, setError] = useState(null);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [schemeFilter, setSchemeFilter] = useState('all'); // 'all', 'eligible', or 'recommended'

  useEffect(() => {
    if (user) {
      loadSchemes();
    }
  }, [user]);

  // Debug: Log schemes changes
  useEffect(() => {
    if (schemes) {
      console.log('Schemes state updated:', {
        totalSchemesFound: schemes.totalSchemesFound,
        allSchemes: schemes.allSchemes?.length,
        eligibleSchemes: schemes.eligibleSchemes,
        filteredCount: filteredSchemes().length
      });
    }
  }, [schemes, schemeFilter, selectedCategory]);

  const loadSchemes = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get farmer profile - use user data if available, otherwise use defaults
      // Default to minimum: 1 sq ft
      const defaultLandSqFeet = 1;
      const defaultLandCents = 0;
      
      const farmerProfile = {
        location: user?.farmerProfile?.location || { state: 'Punjab', district: 'Ludhiana' },
        farmDetails: {
          // Use square feet and cents if available, otherwise convert from hectares
          landSizeSqFeet: user?.farmerProfile?.landDetails?.landSizeSqFeet || defaultLandSqFeet,
          landSizeCents: user?.farmerProfile?.landDetails?.landSizeCents || defaultLandCents,
          // Also include hectares for backend compatibility
          landSize: user?.farmerProfile?.landDetails?.totalArea || user?.farmerProfile?.landSize || 0.00000929, // 1 sq ft in hectares
          landOwnership: user?.farmerProfile?.landDetails?.landOwnership !== false && (user?.farmerProfile?.landOwnership !== false)
        },
        annualIncome: user?.farmerProfile?.annualIncome || 80000,
        cropsGrown: user?.farmerProfile?.landDetails?.crops || user?.farmerProfile?.crops || ['wheat', 'rice'],
        socialCategory: user?.farmerProfile?.socialCategory || ''
      };

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await api.post('/government-schemes/recommend', {
        farmerProfile: farmerProfile,
        filters: {
          showOnlyEligible: false, // Show all schemes, not just eligible
          sortBy: 'relevance_score'
        }
      }, { headers });

      console.log('Government Schemes API Response:', response.data);
      
      if (response.data.success) {
        // Handle different response structures
        const schemesData = response.data?.data || response.data;
        console.log('Schemes Data:', schemesData);
        console.log('Total Schemes Found:', schemesData?.totalSchemesFound);
        console.log('All Schemes:', schemesData?.allSchemes?.length);
        
        if (schemesData && typeof schemesData === 'object') {
          // Check if it's the expected structure with allSchemes, schemesByPriority, etc.
          if (schemesData.allSchemes || schemesData.schemesByPriority || schemesData.totalSchemesFound !== undefined) {
            // This is the full response object - use it as is
            console.log('Setting schemes with full structure:', {
              totalSchemesFound: schemesData.totalSchemesFound,
              allSchemesCount: schemesData.allSchemes?.length,
              eligibleSchemes: schemesData.eligibleSchemes
            });
            setSchemes(schemesData);
          } else if (Array.isArray(schemesData)) {
            // If it's just an array, wrap it in the expected structure
            setSchemes({
              totalSchemesFound: schemesData.length,
              eligibleSchemes: schemesData.length,
              recommendedSchemes: schemesData.length,
              allSchemes: schemesData,
              allSchemesByPriority: {
                highPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 80),
                mediumPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
                lowPriority: schemesData.filter(s => (s.relevanceScore || 0) < 50)
              },
              schemesByPriority: {
                highPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 80),
                mediumPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
                lowPriority: schemesData.filter(s => (s.relevanceScore || 0) < 50)
              },
              schemesByCategory: {},
              eligibleSchemesList: schemesData,
              topRecommendations: schemesData.slice(0, 5)
            });
          } else {
            // Try to find any array in the response and wrap it
            const allSchemes = Object.values(schemesData).find(val => Array.isArray(val) && val.length > 0) || [];
            setSchemes({
              totalSchemesFound: allSchemes.length,
              eligibleSchemes: allSchemes.length,
              recommendedSchemes: allSchemes.length,
              allSchemes: allSchemes,
              allSchemesByPriority: {
                highPriority: allSchemes.filter(s => (s.relevanceScore || 0) >= 80),
                mediumPriority: allSchemes.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
                lowPriority: allSchemes.filter(s => (s.relevanceScore || 0) < 50)
              },
              schemesByPriority: {
                highPriority: allSchemes.filter(s => (s.relevanceScore || 0) >= 80),
                mediumPriority: allSchemes.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
                lowPriority: allSchemes.filter(s => (s.relevanceScore || 0) < 50)
              },
              schemesByCategory: {},
              eligibleSchemesList: allSchemes,
              topRecommendations: allSchemes.slice(0, 5)
            });
          }
        } else if (Array.isArray(schemesData)) {
          // Wrap array in expected structure
          setSchemes({
            totalSchemesFound: schemesData.length,
            eligibleSchemes: schemesData.length,
            recommendedSchemes: schemesData.length,
            allSchemes: schemesData,
            allSchemesByPriority: {
              highPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 80),
              mediumPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
              lowPriority: schemesData.filter(s => (s.relevanceScore || 0) < 50)
            },
            schemesByPriority: {
              highPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 80),
              mediumPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
              lowPriority: schemesData.filter(s => (s.relevanceScore || 0) < 50)
            },
            schemesByCategory: {},
            eligibleSchemesList: schemesData,
            topRecommendations: schemesData.slice(0, 5)
          });
        } else {
          // Empty state
          setSchemes({
            totalSchemesFound: 0,
            eligibleSchemes: 0,
            recommendedSchemes: 0,
            allSchemes: [],
            allSchemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
            schemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
            schemesByCategory: {},
            eligibleSchemesList: [],
            topRecommendations: []
          });
        }
        setError(null);
      } else {
        setError(response.data.error || 'Failed to load schemes');
        setSchemes({
          totalSchemesFound: 0,
          eligibleSchemes: 0,
          recommendedSchemes: 0,
          allSchemes: [],
          allSchemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
          schemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
          schemesByCategory: {},
          eligibleSchemesList: [],
          topRecommendations: []
        });
      }
    } catch (err) {
      // Don't show error if we get an empty array - just show empty state
      if (err.response?.data?.success === true) {
        const schemesData = err.response?.data?.data || err.response?.data;
        if (schemesData && typeof schemesData === 'object' && (schemesData.allSchemes || schemesData.schemesByPriority)) {
          // Full response object
          setSchemes(schemesData);
        } else if (Array.isArray(schemesData)) {
          // Wrap array in expected structure
          setSchemes({
            totalSchemesFound: schemesData.length,
            eligibleSchemes: schemesData.length,
            recommendedSchemes: schemesData.length,
            allSchemes: schemesData,
            allSchemesByPriority: {
              highPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 80),
              mediumPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
              lowPriority: schemesData.filter(s => (s.relevanceScore || 0) < 50)
            },
            schemesByPriority: {
              highPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 80),
              mediumPriority: schemesData.filter(s => (s.relevanceScore || 0) >= 50 && (s.relevanceScore || 0) < 80),
              lowPriority: schemesData.filter(s => (s.relevanceScore || 0) < 50)
            },
            schemesByCategory: {},
            eligibleSchemesList: schemesData,
            topRecommendations: schemesData.slice(0, 5)
          });
        } else {
          setSchemes({
            totalSchemesFound: 0,
            eligibleSchemes: 0,
            recommendedSchemes: 0,
            allSchemes: [],
            allSchemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
            schemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
            schemesByCategory: {},
            eligibleSchemesList: [],
            topRecommendations: []
          });
        }
        setError(null);
      } else {
        setError(err.response?.data?.error || err.message || t('governmentSchemes.loadError') || 'Failed to load schemes. Please try again.');
        setSchemes({
          totalSchemesFound: 0,
          eligibleSchemes: 0,
          recommendedSchemes: 0,
          allSchemes: [],
          allSchemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
          schemesByPriority: { highPriority: [], mediumPriority: [], lowPriority: [] },
          schemesByCategory: {},
          eligibleSchemesList: [],
          topRecommendations: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEligibility = async (schemeId) => {
    try {
      const farmerProfile = {
        location: user.farmerProfile?.location || {},
        farmDetails: {
          landSize: user.farmerProfile?.landSize || 0,
          landOwnership: user.farmerProfile?.landOwnership || false
        },
        annualIncome: user.farmerProfile?.annualIncome || 0
      };

      const response = await api.post(`/government-schemes/${schemeId}/eligibility`, {
        farmerProfile: farmerProfile
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setEligibilityResult(response.data?.data || response.data || null);
        setSelectedScheme(await getSchemeDetails(schemeId));
        setDialogOpen(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check eligibility');
    }
  };

  const getSchemeDetails = async (schemeId) => {
    try {
      const response = await api.get(`/government-schemes/${schemeId}`);
      if (response.data.success) {
        return response.data?.data || response.data || null;
      }
    } catch (err) {
      // Error handled by snackbar
    }
    return null;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getCategoryColor = (category) => {
    const colors = {
      financial: '#4caf50',
      insurance: '#2196F3',
      subsidy: '#ff9800',
      training: '#9c27b0',
      infrastructure: '#795548',
      marketing: '#3f51b5',
      organic: '#8bc34a',
      water: '#00bcd4',
      equipment: '#607d8b',
      seeds: '#cddc39',
      soil: '#795548',
      livestock: '#ff5722',
      disaster: '#f44336'
    };
    return colors[category] || '#9e9e9e';
  };

  const filteredSchemes = () => {
    if (!schemes) {
      console.log('No schemes data available');
      return [];
    }
    
    console.log('Filtering schemes. Current schemes state:', {
      totalSchemesFound: schemes.totalSchemesFound,
      allSchemesCount: schemes.allSchemes?.length,
      schemeFilter: schemeFilter,
      selectedCategory: selectedCategory
    });
    
    // Get schemes based on filter (all, eligible, or recommended)
    let schemeList = [];
    
    if (schemeFilter === 'eligible') {
      // Show only eligible schemes
      schemeList = [
        ...(schemes.schemesByPriority?.highPriority || []),
        ...(schemes.schemesByPriority?.mediumPriority || []),
        ...(schemes.schemesByPriority?.lowPriority || [])
      ];
      console.log('Using eligible schemes:', schemeList.length);
    } else if (schemeFilter === 'recommended') {
      // Show recommended schemes (high relevance score, eligible, top recommendations)
      // Priority: topRecommendations > highPriority eligible > schemes with relevanceScore >= 70
      if (schemes.topRecommendations && schemes.topRecommendations.length > 0) {
        schemeList = schemes.topRecommendations;
        console.log('Using topRecommendations:', schemeList.length);
      } else {
        // Fallback: get eligible schemes with high relevance score
        const allSchemesList = schemes.allSchemes || schemes.eligibleSchemesList || [];
        schemeList = allSchemesList
          .filter(s => s.isEligible && (s.relevanceScore || 0) >= 70)
          .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
          .slice(0, 10); // Top 10 recommended
        console.log('Using high-scoring eligible schemes:', schemeList.length);
      }
    } else {
      // Show ALL schemes (default)
      if (schemes.allSchemes && Array.isArray(schemes.allSchemes) && schemes.allSchemes.length > 0) {
        schemeList = schemes.allSchemes;
        console.log('Using allSchemes:', schemeList.length);
      } else if (schemes.allSchemesByPriority) {
        schemeList = [
          ...(schemes.allSchemesByPriority?.highPriority || []),
          ...(schemes.allSchemesByPriority?.mediumPriority || []),
          ...(schemes.allSchemesByPriority?.lowPriority || [])
        ];
        console.log('Using allSchemesByPriority:', schemeList.length);
      } else {
        // Fallback to eligible schemes if allSchemes not available
        schemeList = [
          ...(schemes.schemesByPriority?.highPriority || []),
          ...(schemes.schemesByPriority?.mediumPriority || []),
          ...(schemes.schemesByPriority?.lowPriority || [])
        ];
        console.log('Using schemesByPriority as fallback:', schemeList.length);
      }
    }

    console.log('Scheme list before category filter:', schemeList.length);

    // Apply category filter
    if (selectedCategory === 'all') {
      console.log('Returning all schemes:', schemeList.length);
      return schemeList;
    }

    const filtered = schemeList.filter(s => s.category === selectedCategory);
    console.log('Returning filtered schemes by category:', filtered.length);
    return filtered;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
          {t('governmentSchemes.title') || 'Government Schemes'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('governmentSchemes.description') || 'Find and apply for government agricultural schemes tailored to your profile'}
        </Typography>

        {/* Category Filter */}
        {schemes && schemes.schemesByCategory && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={t('governmentSchemes.allCategories') || 'All'}
                onClick={() => setSelectedCategory('all')}
                color={selectedCategory === 'all' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
              />
              {Object.keys(schemes.schemesByCategory).map(category => (
                <Chip
                  key={category}
                  label={category.charAt(0).toUpperCase() + category.slice(1)}
                  onClick={() => setSelectedCategory(category)}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', bgcolor: getCategoryColor(category) }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              {t('governmentSchemes.loading') || 'Loading schemes...'}
            </Typography>
          </Box>
        )}

        {/* Empty State - No schemes loaded */}
        {!schemes && !loading && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1">
              {t('governmentSchemes.noSchemes') || 'No schemes available. Please try refreshing the page.'}
            </Typography>
          </Alert>
        )}

        {/* Schemes Display */}
        {schemes && !loading && (
          <Grid container spacing={3}>
            {/* Summary Cards - Clickable */}
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  bgcolor: 'background.paper', 
                  mb: 2,
                  cursor: 'pointer',
                  border: schemeFilter === 'all' ? '2px solid' : '1px solid',
                  borderColor: schemeFilter === 'all' ? 'primary.main' : 'divider',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', transition: 'all 0.2s' }
                }}
                onClick={() => setSchemeFilter('all')}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('governmentSchemes.totalSchemes') || 'Total Schemes'}
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {schemes.totalSchemesFound || 0}
                  </Typography>
                  {schemeFilter === 'all' && (
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                      ✓ Showing all schemes
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  bgcolor: 'background.paper', 
                  mb: 2,
                  cursor: 'pointer',
                  border: schemeFilter === 'eligible' ? '2px solid' : '1px solid',
                  borderColor: schemeFilter === 'eligible' ? 'success.main' : 'divider',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', transition: 'all 0.2s' }
                }}
                onClick={() => setSchemeFilter('eligible')}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('governmentSchemes.eligibleSchemes') || 'Eligible Schemes'}
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {schemes.eligibleSchemes || 0}
                  </Typography>
                  {schemeFilter === 'eligible' && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                      ✓ Showing eligible schemes only
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  bgcolor: 'background.paper', 
                  mb: 2,
                  cursor: 'pointer',
                  border: schemeFilter === 'recommended' ? '2px solid' : '1px solid',
                  borderColor: schemeFilter === 'recommended' ? 'warning.main' : 'divider',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', transition: 'all 0.2s' }
                }}
                onClick={() => setSchemeFilter('recommended')}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('governmentSchemes.recommendedSchemes') || 'Recommended'}
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {schemes.recommendedSchemes || schemes.topRecommendations?.length || 0}
                  </Typography>
                  {schemeFilter === 'recommended' && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                      ✓ Showing recommended schemes
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Deadline Alerts */}
            {schemes.deadlineAlerts && schemes.deadlineAlerts.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('governmentSchemes.deadlineAlerts') || '⚠️ Deadline Alerts'}
                  </Typography>
                  {schemes.deadlineAlerts.map((alert, idx) => (
                    <Typography key={idx} variant="body2">
                      • {alert.message}
                    </Typography>
                  ))}
                </Alert>
              </Grid>
            )}

            {/* Schemes List */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" gutterBottom>
                    {schemeFilter === 'eligible' 
                      ? (t('governmentSchemes.eligibleSchemes') || 'Eligible Schemes')
                      : schemeFilter === 'recommended'
                      ? (t('governmentSchemes.recommendedSchemes') || 'Recommended Schemes')
                      : (t('governmentSchemes.allSchemes') || 'All Schemes')}
                  </Typography>
                  <Chip 
                    label={
                      schemeFilter === 'eligible' ? 'Eligible Only' : 
                      schemeFilter === 'recommended' ? 'Recommended' : 
                      'All Schemes'
                    } 
                    color={
                      schemeFilter === 'eligible' ? 'success' : 
                      schemeFilter === 'recommended' ? 'warning' : 
                      'primary'
                    }
                    size="small"
                  />
                </Box>

                {filteredSchemes().length === 0 ? (
                  <Alert severity="info">
                    {schemeFilter === 'eligible' 
                      ? (t('governmentSchemes.noEligibleSchemes') || 'No eligible schemes found for your profile. Click "Total Schemes" to see all available schemes.')
                      : schemeFilter === 'recommended'
                      ? (t('governmentSchemes.noRecommendedSchemes') || 'No recommended schemes found. Click "Total Schemes" to see all available schemes.')
                      : (t('governmentSchemes.noSchemes') || 'No schemes found. Please try again later.')}
                  </Alert>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Showing {filteredSchemes().length} {
                        schemeFilter === 'eligible' ? 'eligible' : 
                        schemeFilter === 'recommended' ? 'recommended' : 
                        ''
                      } scheme{filteredSchemes().length !== 1 ? 's' : ''}
                      {schemeFilter === 'recommended' && (
                        <span> (sorted by relevance score)</span>
                      )}
                    </Typography>
                  <Grid container spacing={2}>
                    {filteredSchemes().map((scheme, index) => (
                      <Grid item xs={12} sm={6} md={4} key={scheme.schemeId || index}>
                        <Card
                          sx={{
                            height: '100%',
                            cursor: 'pointer',
                            bgcolor: 'background.paper',
                            '&:hover': { boxShadow: 6, transform: 'translateY(-4px)', transition: 'all 0.3s' },
                            borderLeft: `4px solid ${getCategoryColor(scheme.category)}`
                          }}
                          onClick={() => {
                            setSelectedScheme(scheme);
                            setDialogOpen(true);
                          }}
                        >
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" component="div" gutterBottom>
                                  {scheme.name}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                  <Chip
                                    label={scheme.category || 'General'}
                                    size="small"
                                    sx={{ bgcolor: getCategoryColor(scheme.category), color: 'primary.contrastText' }}
                                  />
                                  {scheme.isEligible !== undefined && (
                                    <Chip
                                      label={scheme.isEligible ? '✓ Eligible' : 'Not Eligible'}
                                      size="small"
                                      color={scheme.isEligible ? 'success' : 'default'}
                                    />
                                  )}
                                </Box>
                              </Box>
                              {scheme.relevanceScore && (
                                <Chip
                                  label={`${scheme.relevanceScore}%`}
                                  color={getScoreColor(scheme.relevanceScore)}
                                  size="small"
                                />
                              )}
                            </Box>

                          {/* Eligibility Badge */}
                          {scheme.isEligible !== undefined && (
                            <Box mb={1}>
                              <Chip
                                label={scheme.isEligible ? '✓ Eligible' : 'Not Eligible'}
                                size="small"
                                color={scheme.isEligible ? 'success' : 'default'}
                                sx={{ mb: 1 }}
                              />
                            </Box>
                          )}

                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {scheme.description}
                          </Typography>

                          {/* Eligibility Status with Reasons */}
                          {scheme.eligibilityDetails && (
                            <Box mb={2}>
                              <Alert 
                                severity={scheme.isEligible ? 'success' : 'warning'} 
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="subtitle2" gutterBottom>
                                  {scheme.eligibilityDetails.summary || 
                                    (scheme.isEligible ? '✅ Eligible' : '❌ Not Eligible')}
                                </Typography>
                                {scheme.eligibilityDetails.matchedCriteria && scheme.eligibilityDetails.matchedCriteria.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                                      Why Eligible:
                                    </Typography>
                                    {scheme.eligibilityDetails.matchedCriteria.map((criteria, idx) => (
                                      <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                                        ✓ {criteria}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                                {scheme.eligibilityDetails.rejectionReasons && scheme.eligibilityDetails.rejectionReasons.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>
                                      Why Not Eligible:
                                    </Typography>
                                    {scheme.eligibilityDetails.rejectionReasons.map((reason, idx) => (
                                      <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                                        ✗ {reason}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                              </Alert>
                            </Box>
                          )}

                          {/* Recommendation Reasons */}
                          {scheme.recommendationReasons && scheme.recommendationReasons.length > 0 && (
                            <Box mb={2}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                {t('governmentSchemes.whyRecommended') || 'Why Recommended'}:
                              </Typography>
                              {scheme.recommendationReasons.slice(0, 3).map((reason, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                                    {reason.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {reason.description}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}

                            {scheme.benefits && (
                              <Box mb={2}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                  {t('governmentSchemes.benefits') || 'Benefits'}:
                                </Typography>
                                {scheme.benefits.amount && (
                                  <Typography variant="body2" color="success.main">
                                    {scheme.benefits.amount}
                                  </Typography>
                                )}
                              </Box>
                            )}

                            {scheme.relevanceScore && (
                              <Box mb={2}>
                                <LinearProgress
                                  variant="determinate"
                                  value={scheme.relevanceScore}
                                  color={getScoreColor(scheme.relevanceScore)}
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                              </Box>
                            )}

                            <Button
                              variant="contained"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckEligibility(scheme.schemeId);
                              }}
                              sx={{ mt: 2 }}
                            >
                              {t('governmentSchemes.checkEligibility') || 'Check Eligibility'}
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Scheme Details Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          {selectedScheme && (
            <>
              <DialogTitle sx={{ bgcolor: 'background.paper' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">{selectedScheme.name}</Typography>
                  {selectedScheme.relevanceScore && (
                    <Chip
                      label={`${t('governmentSchemes.relevance') || 'Relevance'}: ${selectedScheme.relevanceScore}%`}
                      color={getScoreColor(selectedScheme.relevanceScore)}
                    />
                  )}
                </Box>
              </DialogTitle>
              <DialogContent sx={{ bgcolor: 'background.default' }}>
                <Typography variant="body1" paragraph>
                  {selectedScheme.description}
                </Typography>

                {/* Eligibility Details with Reasons */}
                {selectedScheme.eligibilityDetails && (
                  <Box mb={3}>
                    <Alert 
                      severity={selectedScheme.isEligible ? 'success' : 'warning'} 
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="h6" gutterBottom>
                        {selectedScheme.eligibilityDetails.summary || 
                          (selectedScheme.isEligible 
                            ? t('governmentSchemes.eligible') || '✅ You are eligible for this scheme!'
                            : t('governmentSchemes.notEligible') || '❌ Not Eligible')}
                      </Typography>
                      
                      {/* Why Eligible */}
                      {selectedScheme.eligibilityDetails.matchedCriteria && selectedScheme.eligibilityDetails.matchedCriteria.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="success.main" gutterBottom>
                            ✓ Why You Are Eligible:
                          </Typography>
                          <List dense>
                            {selectedScheme.eligibilityDetails.matchedCriteria.map((criteria, idx) => (
                              <ListItem key={idx} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <CheckCircle color="success" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={criteria}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      
                      {/* Why Not Eligible */}
                      {selectedScheme.eligibilityDetails.rejectionReasons && selectedScheme.eligibilityDetails.rejectionReasons.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="error.main" gutterBottom>
                            ✗ Why You Are Not Eligible:
                          </Typography>
                          <List dense>
                            {selectedScheme.eligibilityDetails.rejectionReasons.map((reason, idx) => (
                              <ListItem key={idx} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <Warning color="warning" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={reason}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      
                      {/* Detailed Reasons */}
                      {selectedScheme.eligibilityDetails.detailedReasons && selectedScheme.eligibilityDetails.detailedReasons.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Detailed Eligibility Check:
                          </Typography>
                          {selectedScheme.eligibilityDetails.detailedReasons.map((detail, idx) => (
                            <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                                {detail.requirement}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {detail.description}
                              </Typography>
                              {detail.value && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'primary.main' }}>
                                  Your value: {detail.value}
                                  {detail.required && ` | Required: ${detail.required}`}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Alert>
                  </Box>
                )}

                {/* Recommendation Reasons */}
                {selectedScheme.recommendationReasons && selectedScheme.recommendationReasons.length > 0 && (
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom>
                      {t('governmentSchemes.whyRecommended') || '⭐ Why This Scheme is Recommended'}
                    </Typography>
                    {selectedScheme.recommendationReasons.map((reason, idx) => (
                      <Box 
                        key={idx} 
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          bgcolor: 'background.paper', 
                          borderRadius: 2,
                          borderLeft: `4px solid ${
                            reason.priority === 'high' ? '#4caf50' : 
                            reason.priority === 'medium' ? '#ff9800' : '#9e9e9e'
                          }`
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {reason.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {reason.description}
                        </Typography>
                        {reason.details && reason.details.length > 0 && (
                          <List dense sx={{ mt: 1 }}>
                            {reason.details.map((detail, detailIdx) => (
                              <ListItem key={detailIdx} sx={{ py: 0 }}>
                                <ListItemText 
                                  primary={detail}
                                  primaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}


                {selectedScheme.benefits && (
                  <Accordion sx={{ mb: 2, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6">
                        {t('governmentSchemes.benefits') || 'Benefits'}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {Object.entries(selectedScheme.benefits).map(([key, value]) => (
                        <Typography key={key} variant="body2" paragraph>
                          <strong>{key}:</strong> {value}
                        </Typography>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedScheme.documentsRequired && (
                  <Accordion sx={{ mb: 2, bgcolor: 'background.paper' }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h6">
                        {t('governmentSchemes.documentsRequired') || 'Documents Required'}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {selectedScheme.documentsRequired.map((doc, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <Info color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={doc} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {selectedScheme.helpline && (
                  <Box mb={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Phone />}
                      href={`tel:${selectedScheme.helpline}`}
                      fullWidth
                    >
                      {t('governmentSchemes.helpline') || 'Helpline'}: {selectedScheme.helpline}
                    </Button>
                  </Box>
                )}

                {selectedScheme.website && (
                  <Button
                    variant="contained"
                    fullWidth
                    href={selectedScheme.website}
                    target="_blank"
                    sx={{ mb: 2 }}
                  >
                    {t('governmentSchemes.applyOnline') || 'Apply Online'}
                  </Button>
                )}
              </DialogContent>
              <DialogActions sx={{ bgcolor: 'background.paper' }}>
                <Button onClick={() => setDialogOpen(false)}>
                  {t('common.close') || 'Close'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
  );
}


