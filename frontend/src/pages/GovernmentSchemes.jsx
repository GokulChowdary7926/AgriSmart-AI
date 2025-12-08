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
  const [schemeFilter, setSchemeFilter] = useState('all'); // 'all' or 'eligible'

  useEffect(() => {
    if (user) {
      loadSchemes();
    }
  }, [user]);

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

      if (response.data.success) {
        console.log('✅ Schemes loaded:', response.data?.data || response.data);
        // Handle different response structures
        const schemesData = response.data?.data || response.data;
        if (schemesData && typeof schemesData === 'object') {
          // If it's an object with schemes arrays, extract them
          if (schemesData.topRecommendations && Array.isArray(schemesData.topRecommendations)) {
            setSchemes(schemesData.topRecommendations);
          } else if (schemesData.allSchemes && Array.isArray(schemesData.allSchemes)) {
            setSchemes(schemesData.allSchemes);
          } else if (schemesData.eligibleSchemesList && Array.isArray(schemesData.eligibleSchemesList)) {
            setSchemes(schemesData.eligibleSchemesList);
          } else if (Array.isArray(schemesData)) {
            setSchemes(schemesData);
          } else {
            // Try to find any array in the response
            const allSchemes = Object.values(schemesData).find(val => Array.isArray(val) && val.length > 0);
            setSchemes(allSchemes || []);
          }
        } else if (Array.isArray(schemesData)) {
          setSchemes(schemesData);
        } else {
          setSchemes([]);
        }
        setError(null);
      } else {
        setError(response.data.error || 'Failed to load schemes');
        setSchemes([]);
      }
    } catch (err) {
      console.error('❌ Error loading schemes:', err);
      console.error('Error details:', err.response?.data);
      // Don't show error if we get an empty array - just show empty state
      if (err.response?.data?.success === true && Array.isArray(err.response?.data?.data)) {
        setSchemes(err.response.data.data);
        setError(null);
      } else {
        setError(err.response?.data?.error || err.message || t('governmentSchemes.loadError') || 'Failed to load schemes. Please try again.');
        setSchemes([]);
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
      console.error('Error checking eligibility:', err);
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
      console.error('Error getting scheme details:', err);
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
    if (!schemes) return [];
    
    // Get schemes based on filter (all or eligible)
    let schemeList = [];
    
    if (schemeFilter === 'eligible') {
      // Show only eligible schemes
      schemeList = [
        ...(schemes.schemesByPriority?.highPriority || []),
        ...(schemes.schemesByPriority?.mediumPriority || []),
        ...(schemes.schemesByPriority?.lowPriority || [])
      ];
    } else {
      // Show ALL schemes (default)
      if (schemes.allSchemes && schemes.allSchemes.length > 0) {
        schemeList = schemes.allSchemes;
      } else if (schemes.allSchemesByPriority) {
        schemeList = [
          ...(schemes.allSchemesByPriority?.highPriority || []),
          ...(schemes.allSchemesByPriority?.mediumPriority || []),
          ...(schemes.allSchemesByPriority?.lowPriority || [])
        ];
      } else {
        // Fallback to eligible schemes if allSchemes not available
        schemeList = [
          ...(schemes.schemesByPriority?.highPriority || []),
          ...(schemes.schemesByPriority?.mediumPriority || []),
          ...(schemes.schemesByPriority?.lowPriority || [])
        ];
      }
    }

    // Apply category filter
    if (selectedCategory === 'all') {
      return schemeList;
    }

    return schemeList.filter(s => s.category === selectedCategory);
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
              <Card sx={{ bgcolor: 'background.paper', mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('governmentSchemes.recommendedSchemes') || 'Recommended'}
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {schemes.recommendedSchemes || 0}
                  </Typography>
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
                      : (t('governmentSchemes.allSchemes') || 'All Schemes')}
                  </Typography>
                  <Chip 
                    label={schemeFilter === 'eligible' ? 'Eligible Only' : 'All Schemes'} 
                    color={schemeFilter === 'eligible' ? 'success' : 'primary'}
                    size="small"
                  />
                </Box>

                {filteredSchemes().length === 0 ? (
                  <Alert severity="info">
                    {schemeFilter === 'eligible' 
                      ? (t('governmentSchemes.noEligibleSchemes') || 'No eligible schemes found for your profile. Click "Total Schemes" to see all available schemes.')
                      : (t('governmentSchemes.noSchemes') || 'No schemes found. Please try again later.')}
                  </Alert>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Showing {filteredSchemes().length} {schemeFilter === 'eligible' ? 'eligible' : ''} scheme{filteredSchemes().length !== 1 ? 's' : ''}
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
                                    sx={{ bgcolor: getCategoryColor(scheme.category), color: 'white' }}
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

                {eligibilityResult && (
                  <Box mb={2}>
                    {eligibilityResult.eligible ? (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                          {t('governmentSchemes.eligible') || '✅ You are eligible for this scheme!'}
                        </Typography>
                        {eligibilityResult.eligibilityDetails?.matchedCriteria && (
                          <List dense>
                            {eligibilityResult.eligibilityDetails.matchedCriteria.map((criteria, idx) => (
                              <ListItem key={idx}>
                                <ListItemIcon>
                                  <CheckCircle color="success" />
                                </ListItemIcon>
                                <ListItemText primary={criteria} />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Alert>
                    ) : (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="h6">
                          {t('governmentSchemes.notEligible') || 'Not Eligible'}
                        </Typography>
                        {eligibilityResult.eligibilityDetails?.rejectionReasons && (
                          <List dense>
                            {eligibilityResult.eligibilityDetails.rejectionReasons.map((reason, idx) => (
                              <ListItem key={idx}>
                                <ListItemIcon>
                                  <Warning color="warning" />
                                </ListItemIcon>
                                <ListItemText primary={reason} />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Alert>
                    )}
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


