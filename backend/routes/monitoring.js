
const express = require('express');
const router = express.Router();
const apiMonitor = require('../services/monitoring/apiMonitor');
const { CircuitBreakerManager } = require('../services/api/circuitBreaker');
const { getCacheStats } = require('../middleware/cache');
const { authenticateToken } = require('../middleware/auth');
const { serverError, ok } = require('../utils/httpResponses');

router.get('/metrics', authenticateToken, (req, res) => {
  try {
    const metrics = apiMonitor.getMetrics();
    const circuitBreakers = CircuitBreakerManager.getAllStatuses();
    const cacheStats = getCacheStats();
    
    return ok(
      res,
      {
        ...metrics,
        circuit_breakers: circuitBreakers,
        cache: cacheStats,
        timestamp: new Date().toISOString()
      },
      { source: 'AgriSmart AI', isFallback: false }
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/health', (req, res) => {
  try {
    const metrics = apiMonitor.getMetrics();
    const circuitBreakers = CircuitBreakerManager.getAllStatuses();
    
    const allHealthy = Object.values(circuitBreakers).every(
      cb => cb.state === 'CLOSED'
    );
    
    return ok(
      res,
      {
        status: allHealthy ? 'healthy' : 'degraded',
        apis: metrics.apis.map(api => ({
          name: api.name,
          status: parseFloat(api.success_rate) > 80 ? 'healthy' : 'degraded',
          success_rate: api.success_rate,
          avg_response_time: api.avg_response_time + 'ms',
          circuit_breaker: circuitBreakers[`ai_${api.name}`]?.state || 'N/A'
        })),
        timestamp: new Date().toISOString()
      },
      {
        source: 'AgriSmart AI',
        isFallback: !allHealthy,
        degradedReason: !allHealthy ? 'monitoring_health_degraded' : null
      }
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/circuit-breakers', authenticateToken, (req, res) => {
  try {
    const breakers = CircuitBreakerManager.getAllStatuses();
    
    return ok(
      res,
      breakers,
      {
        source: 'AgriSmart AI',
        isFallback: false,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/reset-circuit-breaker/:name', authenticateToken, (req, res) => {
  try {
    const { name } = req.params;
    const breaker = CircuitBreakerManager.getBreaker(name);
    breaker.reset();
    
    return ok(
      res,
      { message: `Circuit breaker ${name} reset successfully` },
      {
        source: 'AgriSmart AI',
        isFallback: false,
        message: `Circuit breaker ${name} reset successfully`
      }
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

module.exports = router;











