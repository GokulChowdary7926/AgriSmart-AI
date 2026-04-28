const axios = require('axios');
const logger = require('../../utils/logger');
const retryManager = require('./retryManager');
const { CircuitBreakerManager } = require('./circuitBreaker');
const apiErrorHandler = require('./apiErrorHandler');
const { getRequestId } = require('../../utils/requestContext');

class ResilientHttpClient {
  async callAxios(method, requestConfig) {
    if (typeof axios.request === 'function') {
      return axios.request(requestConfig);
    }

    const normalizedMethod = String(method || 'get').toLowerCase();
    if (typeof axios[normalizedMethod] === 'function') {
      if (normalizedMethod === 'get' || normalizedMethod === 'delete' || normalizedMethod === 'head') {
        return axios[normalizedMethod](requestConfig.url, {
          params: requestConfig.params,
          headers: requestConfig.headers,
          timeout: requestConfig.timeout
        });
      }

      return axios[normalizedMethod](requestConfig.url, requestConfig.data, {
        params: requestConfig.params,
        headers: requestConfig.headers,
        timeout: requestConfig.timeout
      });
    }

    throw new Error(`No axios handler for method: ${normalizedMethod}`);
  }

  async request(config) {
    const {
      serviceName = 'external-service',
      method = 'get',
      url,
      data,
      params,
      headers,
      timeout = 10000,
      retry = {},
      breaker = {},
      requestId
    } = config || {};

    if (!url) {
      throw new Error('ResilientHttpClient.request requires a URL');
    }

    const correlationId = requestId
      || headers?.['x-request-id']
      || headers?.['X-Request-Id']
      || getRequestId();
    const normalizedHeaders = {
      ...(headers || {}),
      ...(correlationId ? { 'x-request-id': correlationId } : {})
    };

    const breakerInstance = CircuitBreakerManager.getBreaker(serviceName, {
      threshold: breaker.threshold || 4,
      timeout: breaker.timeout || 45000,
      successThreshold: breaker.successThreshold || 2
    });

    try {
      const result = await breakerInstance.execute(async () => {
        const retried = await retryManager.executeWithRetry(
          async () => this.callAxios(method, { method, url, data, params, headers: normalizedHeaders, timeout }),
          {
            maxRetries: retry.maxRetries ?? 2,
            baseDelay: retry.baseDelay ?? 500,
            maxDelay: retry.maxDelay ?? 4000,
            factor: retry.factor ?? 2
          }
        );

        if (!retried.success) {
          throw retried.error || new Error(`Request failed for ${serviceName}`);
        }

        return retried.data;
      });

      return {
        success: true,
        response: result,
        requestId: correlationId || undefined
      };
    } catch (error) {
      const parsed = apiErrorHandler.parseError(error);
      logger.warn(`[ResilientHttpClient:${serviceName}] Request failed`, {
        requestId: correlationId || undefined,
        code: parsed.code,
        status: parsed.status,
        message: parsed.message,
        url
      });
      return {
        success: false,
        error: parsed,
        requestId: correlationId || undefined
      };
    }
  }
}

module.exports = new ResilientHttpClient();
