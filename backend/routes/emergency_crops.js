const express = require('express');
const router = express.Router();
const { ok } = require('../utils/httpResponses');

router.get('/', (req, res) => {
  return ok(
    res,
    { message: 'Emergency crops route - to be implemented' },
    { source: 'AgriSmart AI', isFallback: true, degradedReason: 'emergency_crops_not_implemented' }
  );
});

module.exports = router;



















