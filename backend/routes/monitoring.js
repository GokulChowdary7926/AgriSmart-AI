
const express = require('express');
const router = express.Router();
const apiMonitor = require('../services/monitoring/apiMonitor');
const { CircuitBreakerManager } = require('../services/api/circuitBreaker');
const { getCacheStats } = require('../middleware/cache');
const { authenticateToken } = require('../middleware/auth');

router.get('/metrics', authenticateToken, (req, res) => {
  try {
    const metrics = apiMonitor.getMetrics();
    const circuitBreakers = CircuitBreakerManager.getAllStatuses();
    const cacheStats = getCacheStats();
    
    res.json({
      success: true,
      data: {
        ...metrics,
        circuit_breakers: circuitBreakers,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  try {
    const metrics = apiMonitor.getMetrics();
    const circuitBreakers = CircuitBreakerManager.getAllStatuses();
    
    const allHealthy = Object.values(circuitBreakers).every(
      cb => cb.state === 'CLOSED'
    );
    
    res.json({
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      apis: metrics.apis.map(api => ({
        name: api.name,
        status: parseFloat(api.success_rate) > 80 ? 'healthy' : 'degraded',
        success_rate: api.success_rate,
        avg_response_time: api.avg_response_time + 'ms',
        circuit_breaker: circuitBreakers[`ai_${api.name}`]?.state || 'N/A'
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/circuit-breakers', authenticateToken, (req, res) => {
  try {
    const breakers = CircuitBreakerManager.getAllStatuses();
    
    res.json({
      success: true,
      data: breakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/reset-circuit-breaker/:name', authenticateToken, (req, res) => {
  try {
    const { name } = req.params;
    const breaker = CircuitBreakerManager.getBreaker(name);
    breaker.reset();
    
    res.json({
      success: true,
      message: `Circuit breaker ${name} reset successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;







