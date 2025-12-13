
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Agriculture as CropIcon,
  Thermostat as TempIcon,
  WaterDrop as WaterIcon,
  Science as ScienceIcon,
  BugReport as BugIcon,
  LocalHospital as DiseaseIcon,
  Grass as SoilIcon,
  TrendingUp as YieldIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const CropDetailsCard = ({ cropData, onClose }) => {
  if (!cropData) return null;

  const renderSection = (title, icon, content) => (
    <Accordion defaultExpanded={title === 'Basic Information'}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" gap={1}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {content}
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Card sx={{ maxWidth: 1200, mx: 'auto', my: 2 }}>
      <CardHeader
        avatar={<CropIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
        title={
          <Typography variant="h4" component="h1">
            {cropData.name}
          </Typography>
        }
        subheader={
          <Box>
            <Chip 
              label={cropData.category || cropData.scientificName} 
              color="primary" 
              size="small" 
              sx={{ mr: 1 }}
            />
            {cropData.scientificName && (
              <Typography variant="body2" color="text.secondary" component="span">
                {cropData.scientificName}
              </Typography>
            )}
          </Box>
        }
      />
      
      <CardContent>
        {renderSection(
          'Basic Information',
          <CropIcon />,
          <Grid container spacing={2}>
            {cropData.idealClimate && (
              <>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <TempIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Climate Requirements
                    </Typography>
                    <Typography variant="body2">
                      <strong>Temperature:</strong> {cropData.idealClimate.temperature || cropData.idealClimate.idealTemp || 'N/A'}
                    </Typography>
                    {cropData.idealClimate.humidity && (
                      <Typography variant="body2">
                        <strong>Humidity:</strong> {cropData.idealClimate.humidity}
                      </Typography>
                    )}
                    {cropData.idealClimate.rainfall && (
                      <Typography variant="body2">
                        <strong>Rainfall:</strong> {cropData.idealClimate.rainfall}
                      </Typography>
                    )}
                    {cropData.seasons && (
                      <Typography variant="body2">
                        <strong>Seasons:</strong> {Array.isArray(cropData.seasons) ? cropData.seasons.join(', ') : cropData.seasons}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      <SoilIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Soil Requirements
                    </Typography>
                    {cropData.soil && (
                      <>
                        <Typography variant="body2">
                          <strong>Type:</strong> {cropData.soil.type || (Array.isArray(cropData.soil.types) ? cropData.soil.types.join(', ') : 'N/A')}
                        </Typography>
                        <Typography variant="body2">
                          <strong>pH:</strong> {cropData.soil.pH || 'N/A'}
                        </Typography>
                        {cropData.soil.drainage && (
                          <Typography variant="body2">
                            <strong>Drainage:</strong> {cropData.soil.drainage}
                          </Typography>
                        )}
                      </>
                    )}
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {cropData.landPreparation && renderSection(
          'Land Preparation',
          <CropIcon />,
          <List dense>
            {Array.isArray(cropData.landPreparation.steps) ? (
              cropData.landPreparation.steps.map((step, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary={step} />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary={cropData.landPreparation.steps || 'Not specified'} />
              </ListItem>
            )}
          </List>
        )}

        {(cropData.planting || cropData.seedRate) && renderSection(
          'Planting Information',
          <CropIcon />,
          <Grid container spacing={2}>
            {cropData.planting && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Seed Rate & Spacing
                  </Typography>
                  <Typography variant="body2">
                    <strong>Seed Rate:</strong> {cropData.planting.seedRate || cropData.seedRate?.nursery || cropData.seedRate?.drill || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Spacing:</strong> {cropData.planting.spacing || cropData.seedRate?.spacing || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Depth:</strong> {cropData.planting.depth || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Method:</strong> {cropData.planting.method || 'N/A'}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {(cropData.nutrients || cropData.nutrientSchedule) && renderSection(
          'Nutrient Schedule',
          <ScienceIcon />,
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Fertilizer Requirements
              </Typography>
              {cropData.nutrients ? (
                <>
                  <Typography variant="body2">
                    <strong>Nitrogen:</strong> {cropData.nutrients.nitrogen || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Phosphorus:</strong> {cropData.nutrients.phosphorus || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Potassium:</strong> {cropData.nutrients.potassium || 'N/A'}
                  </Typography>
                  {cropData.nutrients.organicManure && (
                    <Typography variant="body2">
                      <strong>Organic Manure:</strong> {cropData.nutrients.organicManure}
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="body2">
                    <strong>Nitrogen:</strong> {cropData.nutrientSchedule.nitrogen || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Phosphorus:</strong> {cropData.nutrientSchedule.phosphorus || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Potassium:</strong> {cropData.nutrientSchedule.potassium || 'N/A'}
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
        )}

        {cropData.irrigation && renderSection(
          'Irrigation',
          <WaterIcon />,
          <Box>
            <Typography variant="body2" paragraph>
              <strong>Method:</strong> {cropData.irrigation.method || cropData.irrigation.alternatives || 'N/A'}
            </Typography>
            {cropData.irrigation.criticalStages && (
              <Typography variant="body2" paragraph>
                <strong>Critical Stages:</strong> {
                  Array.isArray(cropData.irrigation.criticalStages) 
                    ? cropData.irrigation.criticalStages.join(', ')
                    : cropData.irrigation.criticalStages
                }
              </Typography>
            )}
            {cropData.irrigation.frequency && (
              <Typography variant="body2">
                <strong>Frequency:</strong> {cropData.irrigation.frequency}
              </Typography>
            )}
          </Box>
        )}

        {(cropData.pests || cropData.diseases) && renderSection(
          'Pests & Diseases',
          <BugIcon />,
          <Grid container spacing={2}>
            {cropData.pests && cropData.pests.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  <BugIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Common Pests
                </Typography>
                {Array.isArray(cropData.pests) ? (
                  cropData.pests.map((pest, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      {typeof pest === 'string' ? (
                        <Chip label={pest} size="small" color="warning" sx={{ mr: 0.5, mb: 0.5 }} />
                      ) : (
                        <Paper sx={{ p: 1, mb: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {pest.name}
                          </Typography>
                          {pest.symptoms && (
                            <Typography variant="caption" display="block">
                              Symptoms: {Array.isArray(pest.symptoms) ? pest.symptoms.join(', ') : pest.symptoms}
                            </Typography>
                          )}
                          {pest.organicControl && (
                            <Typography variant="caption" display="block" color="success.main">
                              Organic: {Array.isArray(pest.organicControl) ? pest.organicControl[0] : pest.organicControl}
                            </Typography>
                          )}
                        </Paper>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2">{cropData.pests}</Typography>
                )}
              </Grid>
            )}
            
            {cropData.diseases && cropData.diseases.length > 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  <DiseaseIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Common Diseases
                </Typography>
                {Array.isArray(cropData.diseases) ? (
                  cropData.diseases.map((disease, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      {typeof disease === 'string' ? (
                        <Chip label={disease} size="small" color="error" sx={{ mr: 0.5, mb: 0.5 }} />
                      ) : (
                        <Paper sx={{ p: 1, mb: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {disease.name}
                          </Typography>
                          {disease.symptoms && (
                            <Typography variant="caption" display="block">
                              Symptoms: {Array.isArray(disease.symptoms) ? disease.symptoms.join(', ') : disease.symptoms}
                            </Typography>
                          )}
                          {disease.organicControl && (
                            <Typography variant="caption" display="block" color="success.main">
                              Organic: {Array.isArray(disease.organicControl) ? disease.organicControl[0] : disease.organicControl}
                            </Typography>
                          )}
                        </Paper>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2">{cropData.diseases}</Typography>
                )}
              </Grid>
            )}
          </Grid>
        )}

        {(cropData.ipmStrategies || cropData.treatment?.ipm) && renderSection(
          'IPM Strategies',
          <ScienceIcon />,
          <List dense>
            {(cropData.ipmStrategies || cropData.treatment?.ipm || []).map((strategy, idx) => (
              <ListItem key={idx}>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary={strategy} />
              </ListItem>
            ))}
          </List>
        )}

        {cropData.harvest && renderSection(
          'Harvest Information',
          <CropIcon />,
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Maturity & Indicators
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Maturity:</strong> {cropData.harvest.maturity || cropData.harvest.timing || 'N/A'}
              </Typography>
              {cropData.harvest.indicators && (
                <Box>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Harvest Indicators:
                  </Typography>
                  {Array.isArray(cropData.harvest.indicators) ? (
                    <List dense>
                      {cropData.harvest.indicators.map((indicator, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={indicator} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2">{cropData.harvest.indicators}</Typography>
                  )}
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                <YieldIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Expected Yield
              </Typography>
              {cropData.harvest.yield && (
                <>
                  {cropData.harvest.yield.typical && (
                    <Typography variant="body2">
                      <strong>Typical:</strong> {cropData.harvest.yield.typical}
                    </Typography>
                  )}
                  {cropData.harvest.yield.rainfed && (
                    <Typography variant="body2">
                      <strong>Rainfed:</strong> {cropData.harvest.yield.rainfed}
                    </Typography>
                  )}
                  {cropData.harvest.yield.irrigated && (
                    <Typography variant="body2">
                      <strong>Irrigated:</strong> {cropData.harvest.yield.irrigated}
                    </Typography>
                  )}
                  {typeof cropData.harvest.yield === 'string' && (
                    <Typography variant="body2">{cropData.harvest.yield}</Typography>
                  )}
                </>
              )}
              {cropData.yield && (
                <Typography variant="body2">
                  <strong>Yield:</strong> {
                    cropData.yield.typical || 
                    cropData.yield.rainfed || 
                    cropData.yield.irrigated || 
                    'N/A'
                  }
                </Typography>
              )}
            </Grid>
          </Grid>
        )}

        {cropData.economics && renderSection(
          'Economics',
          <MoneyIcon />,
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="h6">Market Price</Typography>
                <Typography variant="h5">
                  {cropData.economics.marketPrice || 'N/A'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                <Typography variant="h6">Cost of Cultivation</Typography>
                <Typography variant="h5">
                  {cropData.economics.costOfCultivation ? `₹${cropData.economics.costOfCultivation.toLocaleString()}/ha` : 'N/A'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                <Typography variant="h6">Profit Margin</Typography>
                <Typography variant="h5">
                  {cropData.economics.profitMargin ? `${cropData.economics.profitMargin}%` : 'N/A'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {cropData.varieties && cropData.varieties.length > 0 && renderSection(
          'Recommended Varieties',
          <CropIcon />,
          <Box>
            {cropData.varieties.map((variety, idx) => (
              <Chip 
                key={idx} 
                label={variety} 
                color="primary" 
                variant="outlined" 
                sx={{ mr: 1, mb: 1 }} 
              />
            ))}
          </Box>
        )}

        {cropData.postHarvest && cropData.postHarvest.length > 0 && renderSection(
          'Post-Harvest Management',
          <CropIcon />,
          <List dense>
            {cropData.postHarvest.map((step, idx) => (
              <ListItem key={idx}>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText primary={step} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default CropDetailsCard;














