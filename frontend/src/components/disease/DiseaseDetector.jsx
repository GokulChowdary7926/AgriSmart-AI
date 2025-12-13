import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Alert,
  Grid,
  Chip,
  Paper
} from '@mui/material';
import { CloudUpload, PhotoCamera, Search, Close } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import diseaseService from '../../services/diseaseService';
import MedicationRecommendations from './MedicationRecommendations';
import api from '../../services/api';
import logger from '../../services/logger';

const DiseaseDetector = ({ onDetectionComplete }) => {
  const { t } = useLanguage();
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError(t('diseases.invalidImageFile') || 'Please select a valid image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError(t('diseases.imageSizeError') || 'Image size should be less than 10MB');
        return;
      }
      
      setImage(file);
      setError(null);
      setResult(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetect = async () => {
    if (!image) {
      setError(t('diseases.uploadImageFirst') || 'Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('Starting disease detection...');
      const detectionResult = await diseaseService.detectDisease(image);
      console.log('Detection result:', detectionResult);
      
      setResult(detectionResult);
      if (onDetectionComplete) {
        onDetectionComplete(detectionResult);
      }
      
      if (detectionResult?.medication) {
        setTimeout(() => {
          const medicationSection = document.getElementById('medication-section');
          if (medicationSection) {
            medicationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 500);
      }
    } catch (err) {
      logger.error('Detection error', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to detect disease. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const handleCameraCapture = () => {
    document.getElementById('disease-file-input').click();
  };

  return (
    <Card sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom align="center">
          🌿 {t('diseases.advancedDetection') || t('diseases.title') || 'Plant Disease Detection'}
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                border: '2px dashed #ccc',
                borderRadius: 2,
                minHeight: 300,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#fafafa'
              }}
            >
              {preview ? (
                <Box sx={{ position: 'relative', width: '100%' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 250,
                      borderRadius: 8,
                      objectFit: 'contain'
                    }}
                  />
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<Close />}
                    sx={{ mt: 1 }}
                    onClick={handleRemove}
                  >
                    {t('diseases.removeImage') || 'Remove Image'}
                  </Button>
                </Box>
              ) : (
                <>
                  <input
                    id="disease-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<CloudUpload />}
                    onClick={handleCameraCapture}
                    sx={{ mb: 2 }}
                  >
                    {t('diseases.uploadImage') || 'Upload Image'}
                  </Button>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {t('diseases.selectImageFile') || 'Select an image file to detect plant diseases'}
                  </Typography>
                </>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                onClick={handleDetect}
                disabled={!image || loading}
                sx={{ mb: 3 }}
                fullWidth
              >
                {loading ? (t('diseases.analyzingImage') || 'Analyzing...') : (t('diseases.detectDisease') || 'Detect Disease')}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {result && (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    {t('diseases.detectionResults') || 'Detection Result'}
                  </Typography>
                  
                  {result.diseaseInfo ? (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          <strong>{t('diseases.detectedDisease') || 'Disease'}:</strong> {result.diseaseInfo.name}
                        </Typography>
                        {result.diseaseInfo.scientificName && (
                          <Typography variant="body2" color="textSecondary">
                            {result.diseaseInfo.scientificName}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {t('diseases.confidence') || 'Confidence'}:
                        </Typography>
                        <Chip
                          label={`${((result.detection?.confidence || 0) * 100).toFixed(1)}%`}
                          color={
                            (result.detection?.confidence || 0) > 0.8 ? 'success' :
                            (result.detection?.confidence || 0) > 0.6 ? 'warning' : 'error'
                          }
                          sx={{ mb: 1 }}
                        />
                      </Box>

                      {result.diseaseInfo.severityLevel && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {t('diseases.severity') || 'Severity'}:
                          </Typography>
                          <Chip
                            label={`${t('diseases.level') || 'Level'} ${result.diseaseInfo.severityLevel}/5`}
                            color={
                              result.diseaseInfo.severityLevel >= 4 ? 'error' :
                              result.diseaseInfo.severityLevel >= 3 ? 'warning' : 'success'
                            }
                          />
                        </Box>
                      )}

                      {result.diseaseInfo.type && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {t('diseases.type') || 'Type'}:
                          </Typography>
                          <Chip label={result.diseaseInfo.type} variant="outlined" />
                        </Box>
                      )}

                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={async () => {
                            try {
                              if (result?.diseaseInfo?._id) {
                                const response = await api.get(`/diseases/${result.diseaseInfo._id}`);
                                if (response?.data?.success && response?.data?.data) {
                                  if (onDetectionComplete) {
                                    onDetectionComplete({ diseaseInfo: response.data.data });
                                  }
                                } else if (onDetectionComplete) {
                                  onDetectionComplete(result);
                                }
                              } else if (onDetectionComplete) {
                                onDetectionComplete(result);
                              }
                            } catch (err) {
                              logger.error('Error fetching disease details', err);
                              if (onDetectionComplete) {
                                onDetectionComplete(result);
                              }
                            }
                          }}
                          fullWidth
                        >
                          {t('diseases.viewDetailsTreatment') || 'View Details & Treatment'}
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {t('diseases.detected') || 'Detected'}: {result.detection?.class || (t('diseases.unknown') || 'Unknown')}
                        </Typography>
                        <Typography variant="body2">
                          {t('diseases.confidence') || 'Confidence'}: {((result.detection?.confidence || 0) * 100).toFixed(1)}%
                        </Typography>
                      </Alert>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          {t('diseases.diseaseInfoNotFound') || 'Disease information not found in database.'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          {t('diseases.thisCouldBe') || 'This could be:'}
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>{t('diseases.newDisease') || 'A new or uncommon disease'}</li>
                          <li>{t('diseases.differentName') || 'A disease with a different name'}</li>
                          <li>{t('diseases.expertConsultation') || 'Need for expert consultation'}</li>
                        </ul>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ mt: 2 }}
                          onClick={() => window.location.href = '/diseases'}
                          fullWidth
                        >
                          {t('diseases.browseLibrary') || 'Browse Disease Library'}
                        </Button>
                      </Alert>
                    </Box>
                  )}
                </Box>
              )}

              {!result && !loading && (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="textSecondary" align="center">
                    {t('diseases.uploadAndDetect') || 'Upload an image and click "Detect Disease" to analyze'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      
      {result?.medication && (
        <Box id="medication-section" sx={{ mt: 4 }}>
          <MedicationRecommendations
            diseaseInfo={result.diseaseInfo}
            detectionResult={result.detection}
            medication={result.medication}
          />
        </Box>
      )}
    </Card>
  );
};

export default DiseaseDetector;

