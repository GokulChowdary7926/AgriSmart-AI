const express = require('express');
const router = express.Router();
const TrainingController = require('../controllers/TrainingController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/datasets', TrainingController.getDatasets);
router.get('/datasets/stats', TrainingController.getDatasetStats);
router.post('/datasets/initialize', authorize('admin'), TrainingController.initializeDatasets);

router.post('/train', authorize('admin'), TrainingController.trainModel);
router.post('/train/all', authorize('admin'), TrainingController.trainAllModels);
router.get('/trainings', TrainingController.getModelTrainings);
router.get('/trainings/:trainingId', TrainingController.getTrainingStatus);

router.post('/deploy/:trainingId', authorize('admin'), TrainingController.deployModel);
router.get('/models/active', TrainingController.getActiveModels);
router.get('/models/:modelName/performance', TrainingController.getModelPerformance);

router.post('/trigger', authorize('admin'), TrainingController.triggerTraining);

module.exports = router;
