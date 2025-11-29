const CircuitBreaker = require('opossum');
const axios = require('axios');

// Circuit breaker options
const options = {
  timeout: 5000, // If function takes longer than 5 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 30000, // After 30 seconds, try again
  rollingCountTimeout: 10000, // 10 second window
  rollingCountBuckets: 10, // Number of buckets in the window
  name: 'serviceBreaker',
  fallback: () => ({ error: 'Service temporarily unavailable. Please try again later.' })
};

// Create circuit breakers for each service
const createServiceBreaker = (serviceName, serviceUrl) => {
  const breaker = new CircuitBreaker(async (path, method = 'get', data = null, headers = {}) => {
    const config = {
      method,
      url: `${serviceUrl}${path}`,
      headers,
      timeout: 5000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }, {
    ...options,
    name: `${serviceName}Breaker`
  });

  // Event listeners for monitoring
  breaker.on('open', () => {
    console.warn(`🔴 Circuit breaker OPEN for ${serviceName} - Requests will be rejected`);
  });

  breaker.on('halfOpen', () => {
    console.log(`🟡 Circuit breaker HALF-OPEN for ${serviceName} - Testing service`);
  });

  breaker.on('close', () => {
    console.log(`🟢 Circuit breaker CLOSED for ${serviceName} - Service recovered`);
  });

  breaker.on('failure', (error) => {
    console.error(`⚠️  ${serviceName} request failed:`, error.message);
  });

  breaker.fallback((error) => {
    console.log(`🔄 Fallback triggered for ${serviceName}`);
    return {
      error: 'Service temporarily unavailable',
      service: serviceName,
      message: 'Please try again in a few moments',
      timestamp: new Date().toISOString()
    };
  });

  return breaker;
};

// Create breakers for all services
const breakers = {
  auth: null,
  video: null,
  streaming: null,
  billing: null,
  analytics: null
};

function initializeCircuitBreakers(serviceUrls) {
  breakers.auth = createServiceBreaker('Auth', serviceUrls.auth);
  breakers.video = createServiceBreaker('Video', serviceUrls.video);
  breakers.streaming = createServiceBreaker('Streaming', serviceUrls.streaming);
  breakers.billing = createServiceBreaker('Billing', serviceUrls.billing);
  breakers.analytics = createServiceBreaker('Analytics', serviceUrls.analytics);

  console.log('✅ Circuit Breakers initialized for all services');
}

// Get circuit breaker stats
function getCircuitBreakerStats() {
  const stats = {};
  
  Object.keys(breakers).forEach(service => {
    if (breakers[service]) {
      const breaker = breakers[service];
      stats[service] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        stats: breaker.stats,
        healthCheck: breaker.toJSON()
      };
    }
  });

  return stats;
}

module.exports = {
  initializeCircuitBreakers,
  breakers,
  getCircuitBreakerStats
};
