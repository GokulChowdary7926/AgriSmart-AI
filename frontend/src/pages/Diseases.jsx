import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DiseaseDetector from '../components/disease/DiseaseDetector';
import ErrorBoundary from '../components/common/ErrorBoundary';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  LocalHospital as TreatmentIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import logger from '../services/logger';

const extractApiPayload = (responseData) => {
  const dataPayload = responseData?.data && typeof responseData.data === 'object' ? responseData.data : {};
  return {
    ...dataPayload,
    ...responseData
  };
};

const normalizeDiseaseDetails = (result, diseasePayload = {}) => {
  const baseDisease = {
    ...(result?.diseaseInfo || {}),
    ...(diseasePayload || {})
  };

  const treatmentFromDetection = result?.treatment;
  const medication = result?.medication;

  const normalizedTreatments = Array.isArray(baseDisease?.treatments) && baseDisease.treatments.length > 0
    ? baseDisease.treatments
    : [
      ...(Array.isArray(treatmentFromDetection?.organicOptions)
        ? treatmentFromDetection.organicOptions.map((name) => ({ name, type: 'Organic' }))
        : []),
      ...(Array.isArray(treatmentFromDetection?.chemicalOptions)
        ? treatmentFromDetection.chemicalOptions.map((name) => ({ name, type: 'Chemical' }))
        : []),
      ...(Array.isArray(medication?.chemical_treatments)
        ? medication.chemical_treatments.map((item) => ({ ...item, type: item?.type || 'Chemical' }))
        : []),
      ...(Array.isArray(medication?.organic_treatments)
        ? medication.organic_treatments.map((item) => ({ ...item, type: item?.type || 'Organic' }))
        : []),
      ...(Array.isArray(medication?.biological_treatments)
        ? medication.biological_treatments.map((item) => ({ ...item, type: item?.type || 'Biological' }))
        : [])
    ];

  const normalizedPrevention = baseDisease?.prevention || treatmentFromDetection?.preventiveMeasures || [];
  const normalizedSymptoms = baseDisease?.symptoms
    || (Array.isArray(result?.detection?.symptoms)
      ? { visual: result.detection.symptoms.map((symptom) => ({ description: symptom })) }
      : null);

  return {
    ...baseDisease,
    symptoms: normalizedSymptoms || baseDisease?.symptoms || {},
    treatments: normalizedTreatments,
    prevention: normalizedPrevention,
    treatmentOptions: baseDisease?.treatmentOptions || treatmentFromDetection?.organicOptions || treatmentFromDetection?.chemicalOptions || []
  };
};

export default function Diseases() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [pageTab, setPageTab] = useState(0);

  const { data: diseases, isLoading } = useQuery({
    queryKey: ['diseases', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await api.get('/diseases', { params });
      const payload = extractApiPayload(response.data);
      return payload.data || [];
    }
  });

  const handleDiseaseClick = (disease) => {
    setSelectedDisease(disease);
    setOpen(true);
  };

  const getSeverityColor = (severity) => {
    if (typeof severity === 'number') {
      if (severity >= 4) return 'error';
      if (severity >= 3) return 'warning';
      return 'success';
    }
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    };
    return colors[severity] || 'default';
  };

  const filteredDiseases = diseases?.filter(disease =>
    !searchTerm || 
    disease.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    disease.scientificName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    disease.cropNames?.some(crop => crop?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (Array.isArray(disease.cropNames) && disease.cropNames.join(', ').toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleDetectionComplete = (result) => {
    const diseaseId = result?.diseaseInfo?._id || result?.diseaseInfo?.id || result?._id || result?.id;
    if (diseaseId) {
      api.get(`/diseases/${diseaseId}`)
        .then(response => {
          const payload = extractApiPayload(response.data);
          const diseasePayload = payload.data || result?.diseaseInfo || null;
          setSelectedDisease(normalizeDiseaseDetails(result, diseasePayload));
          setOpen(true);
          setPageTab(0);
        })
        .catch(err => {
          logger.error('Error fetching disease details', err);
          if (result?.diseaseInfo) {
            setSelectedDisease(normalizeDiseaseDetails(result, result.diseaseInfo));
            setOpen(true);
            setPageTab(0);
          }
        });
      return;
    }

    if (result?.diseaseInfo) {
      setSelectedDisease(normalizeDiseaseDetails(result, result.diseaseInfo));
      setOpen(true);
      setPageTab(0);
    }
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        {t('diseases.title') || 'Disease Detection & Management'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {t('diseases.description') || 'Browse diseases, detect from images, and find treatment options'}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={pageTab} onChange={(e, v) => setPageTab(v)}>
          <Tab label={t('diseases.browse') || 'Browse Diseases'} />
          <Tab label={t('diseases.detectFromImage') || 'Detect from Image'} />
        </Tabs>
      </Box>

      {pageTab === 1 && (
        <Box sx={{ mb: 4 }}>
          <DiseaseDetector onDetectionComplete={handleDetectionComplete} />
        </Box>
      )}

      {pageTab === 0 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                placeholder={t('diseases.searchPlaceholder') || 'Search diseases by name or crop type...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Box>
          </Paper>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : filteredDiseases.length === 0 ? (
            <Alert severity="info">
              {t('diseases.noDiseasesFound') || 'No diseases found. Try a different search term.'}
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {Array.isArray(filteredDiseases) && filteredDiseases.map((disease) => {
                const severityLevel = disease.severityLevel || (typeof disease.severity === 'number' ? disease.severity : 3);
                const severityLabel = severityLevel ? `Severity ${severityLevel}/5` : (disease.severity || t('diseases.unknown') || 'Unknown');
                const affectedCrops = disease.cropNames && Array.isArray(disease.cropNames) && disease.cropNames.length > 0
                  ? disease.cropNames.join(', ')
                  : disease.cropType || disease.crop_affected || t('diseases.notSpecified') || 'Not specified';
                
                let symptomsText = '';
                if (disease.symptoms?.visual && Array.isArray(disease.symptoms.visual) && disease.symptoms.visual.length > 0) {
                  symptomsText = disease.symptoms.visual.slice(0, 2).map(s => s.description || s).join(', ');
                } else if (disease.symptoms && typeof disease.symptoms === 'string') {
                  symptomsText = disease.symptoms;
                } else if (Array.isArray(disease.symptoms)) {
                  symptomsText = disease.symptoms.slice(0, 2).join(', ');
                } else {
                  symptomsText = t('diseases.seeDetails') || 'See details for symptoms';
                }

                return (
                  <Grid item xs={12} md={6} lg={4} key={disease._id || disease.id || disease.name}>
                    <Card
                      sx={{
                        height: '100%',
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 6 }
                      }}
                      onClick={() => handleDiseaseClick(disease)}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" component="div">
                            {disease.name}
                          </Typography>
                          <Chip
                            label={severityLabel}
                            color={getSeverityColor(severityLevel)}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>{t('diseases.affectedCrops') || 'Affected Crops'}:</strong> {affectedCrops}
                        </Typography>
                        {symptomsText && (
                          <Box mt={2}>
                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                              {t('diseases.symptoms') || 'Symptoms'}:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {symptomsText}
                              {disease.symptoms?.visual && disease.symptoms.visual.length > 2 && '...'}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      <Dialog open={open} onClose={() => {
        try {
          setOpen(false);
          setSelectedDisease(null);
          setActiveTab(0);
        } catch (error) {
          logger.error('Error closing dialog', error);
        }
      }} maxWidth="md" fullWidth>
        {selectedDisease ? (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">{String(selectedDisease.name || 'Disease Details')}</Typography>
                <Chip
                  label={selectedDisease.severityLevel ? `${t('diseases.severity') || 'Severity'} ${selectedDisease.severityLevel}/5` : (String(selectedDisease.severity || t('diseases.unknown') || 'Unknown'))}
                  color={getSeverityColor(selectedDisease.severityLevel || selectedDisease.severity)}
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <ErrorBoundary>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(e, v) => {
                  try {
                    setActiveTab(v);
                  } catch (error) {
                    logger.error('Error changing tab', error);
                  }
                }}>
                  <Tab label={t('diseases.tabs.overview') || 'Overview'} />
                  <Tab label={t('diseases.tabs.symptoms') || 'Symptoms'} />
                  <Tab label={t('diseases.tabs.treatment') || 'Treatment'} />
                  <Tab label={t('diseases.tabs.prevention') || 'Prevention'} />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>{t('diseases.affectedCrops') || 'Affected Crops'}:</strong> {
                      selectedDisease.cropNames && Array.isArray(selectedDisease.cropNames) && selectedDisease.cropNames.length > 0
                        ? selectedDisease.cropNames.join(', ')
                        : selectedDisease.cropType || selectedDisease.crop_affected || t('diseases.notSpecified') || 'Not specified'
                    }
                  </Typography>
                  {selectedDisease.scientificName && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('diseases.scientificName') || 'Scientific Name'}:</strong> {String(selectedDisease.scientificName || '')}
                    </Typography>
                  )}
                  {selectedDisease.type && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('diseases.type') || 'Type'}:</strong> {String(selectedDisease.type || '')}
                    </Typography>
                  )}
                  {selectedDisease.category && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('diseases.category') || 'Category'}:</strong> {String(selectedDisease.category || '')}
                    </Typography>
                  )}
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('diseases.symptoms') || 'Symptoms'}
                  </Typography>
                  {selectedDisease.symptoms?.visual && Array.isArray(selectedDisease.symptoms.visual) && selectedDisease.symptoms.visual.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('diseases.visualSymptoms') || 'Visual Symptoms'}:
                      </Typography>
                      <List>
                        {selectedDisease.symptoms.visual.filter(s => s != null).map((symptom, index) => {
                          try {
                            const symptomText = symptom?.description || symptom?.text || (typeof symptom === 'string' ? symptom : String(symptom || 'Symptom'));
                            const affectedPart = symptom?.part || symptom?.affectedPart || '';
                            
                            return (
                              <ListItem key={index}>
                                <ListItemText 
                                  primary={symptomText}
                                  secondary={affectedPart ? `${t('diseases.affectedPart') || 'Affected part'}: ${affectedPart}` : ''}
                                />
                              </ListItem>
                            );
                          } catch (error) {
                            console.error('Error rendering symptom:', error, symptom);
                            return (
                              <ListItem key={index}>
                                <ListItemText primary={t('diseases.symptomInfo', 'Symptom information')} />
                              </ListItem>
                            );
                          }
                        })}
                      </List>
                    </Box>
                  )}
                  {(!selectedDisease.symptoms || 
                    (!selectedDisease.symptoms.visual && !selectedDisease.symptoms.growth)) && (
                    <Alert severity="info">
                      {t('diseases.noSymptomsInfo') || 'No detailed symptoms information available for this disease.'}
                    </Alert>
                  )}
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    <TreatmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('diseases.treatmentOptions') || 'Treatment Options'}
                  </Typography>
                  {selectedDisease.treatments && Array.isArray(selectedDisease.treatments) && selectedDisease.treatments.length > 0 ? (
                    <List>
                      {selectedDisease.treatments.filter(t => t != null).map((treatment, index) => {
                        try {
                          const treatmentName = treatment?.name || treatment?.title || treatment?.method || treatment?.description || t('diseases.treatment', 'Treatment');
                          const treatmentType = treatment?.type || treatment?.category || t('diseases.general', 'General');
                          const dosage = treatment?.dosage || treatment?.amount || treatment?.dose || t('common.notAvailable');
                          const frequency = treatment?.frequency || treatment?.application || treatment?.interval || t('common.notAvailable');
                          
                          return (
                            <ListItem key={index}>
                              <ListItemText
                                primary={String(treatmentName)}
                                secondary={`${t('diseases.type') || 'Type'}: ${String(treatmentType)} | ${t('diseases.dosage') || 'Dosage'}: ${String(dosage)} | ${t('diseases.frequency') || 'Frequency'}: ${String(frequency)}`}
                              />
                            </ListItem>
                          );
                        } catch (error) {
                          logger.error('Error rendering treatment', error, { treatment });
                          return (
                              <ListItem key={index}>
                                <ListItemText primary={t('diseases.treatmentInfo', 'Treatment information')} />
                              </ListItem>
                          );
                        }
                      })}
                    </List>
                  ) : selectedDisease.treatmentOptions ? (
                    <List>
                      {Array.isArray(selectedDisease.treatmentOptions) ? (
                        selectedDisease.treatmentOptions.filter(t => t != null).map((treatment, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={typeof treatment === 'string' ? treatment : (treatment?.name || treatment?.title || String(treatment || t('diseases.treatment', 'Treatment')))} />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem>
                          <ListItemText primary={typeof selectedDisease.treatmentOptions === 'string' ? selectedDisease.treatmentOptions : t('diseases.treatmentInfo', 'Treatment information')} />
                        </ListItem>
                      )}
                    </List>
                  ) : selectedDisease.treatment ? (
                    <Typography variant="body2" color="text.secondary">
                      {typeof selectedDisease.treatment === 'string' ? selectedDisease.treatment : JSON.stringify(selectedDisease.treatment)}
                    </Typography>
                  ) : (
                    <Alert severity="info">
                      {t('diseases.noTreatments') || 'No treatment information available for this disease.'}
                    </Alert>
                  )}
                </Box>
              )}

              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {t('diseases.preventionMethods') || 'Prevention Methods'}
                  </Typography>
                  {selectedDisease.preventiveMeasures ? (
                    <Box>
                      {selectedDisease.preventiveMeasures.cultural && Array.isArray(selectedDisease.preventiveMeasures.cultural) && selectedDisease.preventiveMeasures.cultural.length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            {t('diseases.culturalPractices') || 'Cultural Practices'}:
                          </Typography>
                          <List>
                            {selectedDisease.preventiveMeasures.cultural.filter(m => m != null).map((method, index) => (
                              <ListItem key={index}>
                                <ListItemText primary={typeof method === 'string' ? method : (method?.name || method?.description || String(method || 'Method'))} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      {selectedDisease.preventiveMeasures.biological && Array.isArray(selectedDisease.preventiveMeasures.biological) && selectedDisease.preventiveMeasures.biological.length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            {t('diseases.biologicalMethods') || 'Biological Methods'}:
                          </Typography>
                          <List>
                            {selectedDisease.preventiveMeasures.biological.filter(m => m != null).map((method, index) => (
                              <ListItem key={index}>
                                <ListItemText primary={typeof method === 'string' ? method : (method?.name || method?.description || String(method || 'Method'))} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      {selectedDisease.preventiveMeasures.chemical && Array.isArray(selectedDisease.preventiveMeasures.chemical) && selectedDisease.preventiveMeasures.chemical.length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            {t('diseases.chemicalMethods') || 'Chemical Methods'}:
                          </Typography>
                          <List>
                            {selectedDisease.preventiveMeasures.chemical.filter(m => m != null).map((method, index) => (
                              <ListItem key={index}>
                                <ListItemText primary={typeof method === 'string' ? method : (method?.name || method?.description || String(method || 'Method'))} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      {selectedDisease.preventiveMeasures.physical && Array.isArray(selectedDisease.preventiveMeasures.physical) && selectedDisease.preventiveMeasures.physical.length > 0 && (
                        <Box mb={2}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            {t('diseases.physicalMethods') || 'Physical Methods'}:
                          </Typography>
                          <List>
                            {selectedDisease.preventiveMeasures.physical.filter(m => m != null).map((method, index) => (
                              <ListItem key={index}>
                                <ListItemText primary={typeof method === 'string' ? method : (method?.name || method?.description || String(method || 'Method'))} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      {(!selectedDisease.preventiveMeasures.cultural || 
                        (Array.isArray(selectedDisease.preventiveMeasures.cultural) && selectedDisease.preventiveMeasures.cultural.length === 0)) &&
                        (!selectedDisease.preventiveMeasures.biological || 
                        (Array.isArray(selectedDisease.preventiveMeasures.biological) && selectedDisease.preventiveMeasures.biological.length === 0)) &&
                        (!selectedDisease.preventiveMeasures.chemical || 
                        (Array.isArray(selectedDisease.preventiveMeasures.chemical) && selectedDisease.preventiveMeasures.chemical.length === 0)) &&
                        (!selectedDisease.preventiveMeasures.physical || 
                        (Array.isArray(selectedDisease.preventiveMeasures.physical) && selectedDisease.preventiveMeasures.physical.length === 0)) && (
                        <Alert severity="info">
                          {t('diseases.noPreventionMethods') || 'No prevention methods available for this disease.'}
                        </Alert>
                      )}
                    </Box>
                  ) : selectedDisease.prevention ? (
                    <Box>
                      {Array.isArray(selectedDisease.prevention) ? (
                        <List>
                          {selectedDisease.prevention.filter(m => m != null).map((method, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={typeof method === 'string' ? method : (method?.name || method?.description || String(method || 'Method'))} />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {typeof selectedDisease.prevention === 'string' ? selectedDisease.prevention : JSON.stringify(selectedDisease.prevention)}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      {t('diseases.noPreventionMethods') || 'No prevention methods available for this disease.'}
                    </Alert>
                  )}
                </Box>
              )}
              </ErrorBoundary>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                try {
                  setOpen(false);
                  setSelectedDisease(null);
                  setActiveTab(0);
                } catch (error) {
                  logger.error('Error closing dialog', error);
                }
              }}>{t('common.close') || 'Close'}</Button>
            </DialogActions>
          </>
        ) : (
          <DialogContent>
            <Alert severity="error">
              {t('diseases.loadDetailsError', 'Error loading disease details. Please try again.')}
            </Alert>
          </DialogContent>
        )}
      </Dialog>
    </Container>
  );
}
