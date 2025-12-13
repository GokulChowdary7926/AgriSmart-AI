const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/me', UserController.getCurrentUser);

router.put('/me', UserController.updateCurrentUser);

router.get('/stats', UserController.getStats);

router.get('/search', UserController.search);

router.get('/', UserController.getAll);

router.get('/:id', UserController.getById);

router.put('/:id', UserController.update);

router.delete('/:id', UserController.delete);

module.exports = router;








