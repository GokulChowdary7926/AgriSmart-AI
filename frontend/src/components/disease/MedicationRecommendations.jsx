import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  LocalPharmacy,
  Grass,
  Science,
  Warning,
  CheckCircle,
  Info,
  ShoppingCart,
  Phone,
  Schedule,
  MonetizationOn,
  SafetyDivider,
  ExpandMore,
  Download,
  Share
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

const MedicationRecommendations = ({ diseaseInfo, detectionResult, medication }) => {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  if (!medication && !diseaseInfo) {
    return null;
  }

  const medData = medication || {};
  const diseaseName = medData.disease_info?.name || 
                      diseaseInfo?.name || 
                      detectionResult?.disease || 
                      detectionResult?.detection?.class ||
                      detectionResult?.diseaseInfo?.name ||
                      t('diseases.unknown') || 'Disease';
  const diseaseCategory = medData.disease_info?.category || 
                          diseaseInfo?.type || 
                          detectionResult?.diseaseInfo?.type ||
                          t('diseases.unknown') || 'Disease';
  const severity = detectionResult?.severity || 
                   medData.disease_info?.severity || 
                   detectionResult?.diseaseInfo?.severityLevel ? 
                     (detectionResult.diseaseInfo.severityLevel >= 4 ? 'high' : 
                      detectionResult.diseaseInfo.severityLevel >= 3 ? 'medium' : 'low') : 
                   'medium';

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'chemical': return '#ff4444';
      case 'organic': return '#00c851';
      case 'biological': return '#33b5e5';
      default: return '#aaaaaa';
    }
  };

  const TreatmentCard = ({ treatment, type }) => (
    <Card sx={{ mb: 2, borderLeft: `4px solid ${getTypeColor(type)}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">
            {treatment.name}
          </Typography>
          <Chip 
            label={t(`diseases.${type}Treatment`) || type.toUpperCase()} 
            size="small" 
            sx={{ bgcolor: getTypeColor(type), color: 'white' }}
          />
        </Box>
        
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>{t('diseases.dosage') || 'Dosage'}:</strong>{' '}
              <span style={{ color: treatment.dosage && treatment.dosage !== 'N/A' ? 'inherit' : '#ff9800' }}>
                {treatment.dosage || 'As per manufacturer instructions'}
              </span>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>{t('diseases.frequency') || 'Frequency'}:</strong>{' '}
              <span style={{ color: treatment.frequency && treatment.frequency !== 'N/A' ? 'inherit' : '#ff9800' }}>
                {treatment.frequency || 'Every 7-10 days'}
              </span>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>{t('diseases.treatmentEffectiveness') || 'Effectiveness'}:</strong>{' '}
              <Chip 
                label={`${treatment.effectiveness || 70}%`} 
                size="small" 
                color={treatment.effectiveness >= 80 ? 'success' : treatment.effectiveness >= 60 ? 'warning' : 'error'}
              />
            </Typography>
          </Grid>
          {treatment.safety_period && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">
                <strong>{t('diseases.safetyPeriod') || 'Safety Period'}:</strong> {treatment.safety_period}
              </Typography>
            </Grid>
          )}
        </Grid>

        {treatment.brands && treatment.brands.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              <strong>{t('diseases.availableBrands') || 'Available Brands'}:</strong> {treatment.brands.join(', ')}
            </Typography>
          </Box>
        )}

        {treatment.price_range && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="primary">
              <strong>{t('diseases.price') || 'Price'}:</strong> {treatment.price_range}
            </Typography>
          </Box>
        )}

        {treatment.preparation && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary">
              <strong>{t('diseases.preparation') || 'Preparation'}:</strong> {treatment.preparation}
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<ShoppingCart />}
          onClick={() => window.open(`https://amazon.in/s?k=${encodeURIComponent(treatment.name)}`, '_blank')}
        >
          {t('diseases.buyNow') || 'Buy Now'}
        </Button>
        <Button size="small" startIcon={<Info />}>
          {t('diseases.viewDetails') || 'View Details'}
        </Button>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2, mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h4" gutterBottom>
          💊 {t('diseases.medicationRecommendations') || 'Treatment Recommendations'} - {diseaseName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <Chip 
            label={`${t('diseases.severity') || 'Severity'}: ${severity.toUpperCase()}`} 
            color={getSeverityColor(severity)} 
            sx={{ color: 'white' }}
          />
          {detectionResult?.confidence && (
            <Chip 
              label={`${t('diseases.confidence') || 'Confidence'}: ${(detectionResult.confidence * 100).toFixed(1)}%`} 
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          )}
          <Chip 
            label={diseaseCategory} 
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
        </Box>
      </Paper>

      {severity === 'critical' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6">
            ⚠️ {t('diseases.emergencyActionRequired') || 'EMERGENCY ACTION REQUIRED'}
          </Typography>
          <Typography>
            {t('diseases.criticalDiseaseWarning') || 'This disease is at critical stage. Take immediate action to prevent crop loss.'}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {medData.immediate_actions && medData.immediate_actions.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">
                  {t('diseases.immediateActions') || 'Immediate Actions'} ({t('diseases.first24Hours') || 'First 24 Hours'})
                </Typography>
              </Box>
              <List>
                {medData.immediate_actions.map((action, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <CheckCircle color={action.priority === 'critical' ? 'error' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={action.action}
                      secondary={`${t('diseases.timing') || 'Timing'}: ${action.timing} | ${t('diseases.priority') || 'Priority'}: ${action.priority}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {medData.chemical_treatments && medData.chemical_treatments.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Science sx={{ mr: 1, color: getTypeColor('chemical') }} />
                <Typography variant="h6">
                  {t('diseases.chemicalTreatments') || 'Chemical Treatments'}
                </Typography>
              </Box>
              {medData.chemical_treatments.map((treatment, idx) => (
                <TreatmentCard key={idx} treatment={treatment} type="chemical" />
              ))}
            </Paper>
          )}

          {medData.organic_treatments && medData.organic_treatments.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Grass sx={{ mr: 1, color: getTypeColor('organic') }} />
                <Typography variant="h6">
                  {t('diseases.organicTreatments') || 'Organic Treatments'}
                </Typography>
              </Box>
              {medData.organic_treatments.map((treatment, idx) => (
                <TreatmentCard key={idx} treatment={treatment} type="organic" />
              ))}
            </Paper>
          )}

          {medData.biological_treatments && medData.biological_treatments.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalPharmacy sx={{ mr: 1, color: getTypeColor('biological') }} />
                <Typography variant="h6">
                  {t('diseases.biologicalTreatments') || 'Biological Treatments'}
                </Typography>
              </Box>
              {medData.biological_treatments.map((treatment, idx) => (
                <TreatmentCard key={idx} treatment={treatment} type="biological" />
              ))}
            </Paper>
          )}

          {medData.schedule && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {t('diseases.applicationSchedule') || 'Application Schedule'}
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('diseases.timeline') || 'Timeline'}</strong></TableCell>
                      <TableCell><strong>{t('diseases.action') || 'Action'}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(medData.schedule).map(([key, value], idx) => (
                      <TableRow key={idx}>
                        <TableCell>{key.replace('_', ' ').toUpperCase()}</TableCell>
                        <TableCell>{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {medData.cultural_practices && medData.cultural_practices.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                🌱 {t('diseases.culturalPractices') || 'Cultural Practices'} & {t('diseases.prevention') || 'Prevention'}
              </Typography>
              <List>
                {medData.cultural_practices.map((practice, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText primary={practice} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              ⚡ {t('diseases.quickActions') || 'Quick Actions'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="contained" startIcon={<ShoppingCart />}>
                {t('diseases.buyRecommendedProducts') || 'Buy Recommended Products'}
              </Button>
              <Button variant="outlined" startIcon={<Phone />} href="tel:1800-180-1551">
                {t('diseases.callExpert') || 'Call Agriculture Expert'}
              </Button>
              <Button variant="outlined" startIcon={<Download />}>
                {t('diseases.downloadGuide') || 'Download Treatment Guide'}
              </Button>
              <Button variant="outlined" startIcon={<Share />}>
                {t('diseases.shareReport') || 'Share Report'}
              </Button>
            </Box>
          </Paper>

          {medData.cost_estimation && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MonetizationOn sx={{ mr: 1, color: 'green' }} />
                <Typography variant="h6">
                  {t('diseases.costEstimation') || 'Cost Estimation'}
                </Typography>
              </Box>
              <Box sx={{ p: 1 }}>
                <Typography variant="h5" color="primary" align="center">
                  ₹{medData.cost_estimation.total_estimated_cost}
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center">
                  {t('diseases.estimatedTotalCost') || 'Estimated total cost'}
                </Typography>
              </Box>
              {medData.cost_estimation.government_subsidies?.available && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>{t('diseases.subsidyAvailable') || 'Subsidy Available'}:</strong> {medData.cost_estimation.government_subsidies.subsidy_percentage}% {t('diseases.under') || 'under'} {medData.cost_estimation.government_subsidies.scheme}
                  </Typography>
                </Alert>
              )}
            </Paper>
          )}

          {medData.safety_precautions && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SafetyDivider sx={{ mr: 1, color: 'orange' }} />
                <Typography variant="h6">
                  {t('diseases.safetyPrecautions') || 'Safety Precautions'}
                </Typography>
              </Box>
              <List dense>
                {medData.safety_precautions.chemical_treatments?.slice(0, 5).map((precaution, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <Info fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={precaution} />
                  </ListItem>
                ))}
              </List>
              {medData.safety_precautions.harvest_waiting_period && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>{t('diseases.harvestWaitingPeriod') || 'Harvest Waiting Period'}:</strong> {medData.safety_precautions.harvest_waiting_period}
                  </Typography>
                </Alert>
              )}
            </Paper>
          )}

          {medData.emergency_contacts && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom color="error">
                🚨 {t('diseases.emergencyContacts') || 'Emergency Contacts'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {medData.emergency_contacts.national?.slice(0, 3).map((contact, idx) => (
                  <Button 
                    key={idx}
                    variant="contained" 
                    color="error" 
                    startIcon={<Phone />}
                    href={`tel:${contact.number.replace(/-/g, '')}`}
                    fullWidth
                  >
                    {contact.name}: {contact.number}
                  </Button>
                ))}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MedicationRecommendations;

