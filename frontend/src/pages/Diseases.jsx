import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DiseaseDetector from '../components/disease/DiseaseDetector';
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

export default function Diseases() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [pageTab, setPageTab] = useState(0); // 0 = Browse, 1 = Detect

  const { data: diseases, isLoading } = useQuery({
    queryKey: ['diseases', searchTerm],
    queryFn: async () => {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await api.get('/diseases', { params });
      return response.data.data || [];
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
    if (result?.diseaseInfo?._id) {
      // Fetch full disease info and show in dialog
      api.get(`/diseases/${result.diseaseInfo._id}`)
        .then(response => {
          setSelectedDisease(response.data.data);
          setOpen(true);
          setPageTab(0); // Switch to browse tab
        })
        .catch(err => console.error('Error fetching disease details:', err));
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

      {/* Page Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={pageTab} onChange={(e, v) => setPageTab(v)}>
          <Tab label={t('diseases.browse') || 'Browse Diseases'} />
          <Tab label={t('diseases.detectFromImage') || 'Detect from Image'} />
        </Tabs>
      </Box>

      {/* Disease Detection Tab */}
      {pageTab === 1 && (
        <Box sx={{ mb: 4 }}>
          <DiseaseDetector onDetectionComplete={handleDetectionComplete} />
        </Box>
      )}

      {/* Browse Diseases Tab */}
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
              {filteredDiseases.map((disease) => {
                const severityLevel = disease.severityLevel || (typeof disease.severity === 'number' ? disease.severity : 3);
                const severityLabel = severityLevel ? `Severity ${severityLevel}/5` : (disease.severity || t('diseases.unknown') || 'Unknown');
                const affectedCrops = disease.cropNames && Array.isArray(disease.cropNames) && disease.cropNames.length > 0
                  ? disease.cropNames.join(', ')
                  : disease.cropType || disease.crop_affected || t('diseases.notSpecified') || 'Not specified';
                
                // Get symptoms - prioritize visual symptoms
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

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        {selectedDisease && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">{selectedDisease.name}</Typography>
                <Chip
                  label={selectedDisease.severityLevel ? `${t('diseases.severity') || 'Severity'} ${selectedDisease.severityLevel}/5` : (selectedDisease.severity || t('diseases.unknown') || 'Unknown')}
                  color={getSeverityColor(selectedDisease.severityLevel || selectedDisease.severity)}
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                  <Tab label={t('diseases.tabs.overview') || 'Overview'} />
                  <Tab label={t('diseases.tabs.symptoms') || 'Symptoms'} />
                  <Tab label={t('diseases.tabs.treatment') || 'Treatment'} />
                  <Tab label={t('diseases.tabs.prevention') || 'Prevention'} />
                </Tabs>
              </Box>

              {activeTab === 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>{t('diseases.affectedCrops') || 'Affected Crops'}:</strong> {selectedDisease.cropNames && Array.isArray(selectedDisease.cropNames) && selectedDisease.cropNames.length > 0
                      ? selectedDisease.cropNames.join(', ')
                      : selectedDisease.cropType || selectedDisease.crop_affected || t('diseases.notSpecified') || 'Not specified'}
                  </Typography>
                  {selectedDisease.scientificName && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('diseases.scientificName') || 'Scientific Name'}:</strong> {selectedDisease.scientificName}
                    </Typography>
                  )}
                  {selectedDisease.type && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('diseases.type') || 'Type'}:</strong> {selectedDisease.type}
                    </Typography>
                  )}
                  {selectedDisease.category && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>{t('diseases.category') || 'Category'}:</strong> {selectedDisease.category}
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
                  {selectedDisease.symptoms?.visual && selectedDisease.symptoms.visual.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('diseases.visualSymptoms') || 'Visual Symptoms'}:
                      </Typography>
                      <List>
                        {selectedDisease.symptoms.visual.map((symptom, index) => (
                          <ListItem key={index}>
                            <ListItemText 
                              primary={symptom.description || symptom}
                              secondary={symptom.part ? `${t('diseases.affectedPart') || 'Affected part'}: ${symptom.part}` : ''}
                            />
                          </ListItem>
                        ))}
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
                  {selectedDisease.treatments && Array.isArray(selectedDisease.treatments) && selectedDisease.treatments.length > 0 && (
                    <List>
                      {selectedDisease.treatments.map((treatment, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={treatment.name}
                            secondary={`${t('diseases.type') || 'Type'}: ${treatment.type} | ${t('diseases.dosage') || 'Dosage'}: ${treatment.dosage || t('common.notAvailable') || 'N/A'} | ${t('diseases.frequency') || 'Frequency'}: ${treatment.frequency || t('common.notAvailable') || 'N/A'}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  {(!selectedDisease.treatments || selectedDisease.treatments.length === 0) && (
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
                    <List>
                      {selectedDisease.preventiveMeasures.cultural && Array.isArray(selectedDisease.preventiveMeasures.cultural) && (
                        selectedDisease.preventiveMeasures.cultural.map((method, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={method} />
                          </ListItem>
                        ))
                      )}
                    </List>
                  ) : (
                    <Alert severity="info">
                      {t('diseases.noPreventionMethods') || 'No prevention methods available for this disease.'}
                    </Alert>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>{t('common.close') || 'Close'}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}
