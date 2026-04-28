describe('AgriAIService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.PERPLEXITY_API_KEY;
  });

  test('uses rule-based chatbot when no providers configured', async () => {
    const mockRuleBasedResponse = {
      success: true,
      response: 'Rule-based answer for farmers'
    };

    jest.doMock('../../services/ruleBasedChatbot', () => ({
      getResponse: jest.fn(() => mockRuleBasedResponse)
    }));
    jest.doMock('../../services/monitoring/apiMonitor', () => ({
      recordRequest: jest.fn(),
      recordError: jest.fn()
    }));
    jest.doMock('../../services/api/circuitBreaker', () => ({
      CircuitBreakerManager: {
        getBreaker: jest.fn(() => ({
          execute: jest.fn((fn) => fn())
        }))
      }
    }));

    const service = require('../../services/AgriAIService');
    const result = await service.chatWithAI('How to improve soil health?');

    expect(result.success).toBe(true);
    expect(result.response).toBe(mockRuleBasedResponse.response);
    expect(result.provider).toBe('AgriSmart AI');
  });

  test('returns cleaned provider response when perplexity is configured', async () => {
    process.env.PERPLEXITY_API_KEY = 'pplx-test-key-abcdefghijklmnopqrstuvwxyz';

    const mockRequest = jest.fn().mockResolvedValue({
      success: true,
      response: {
        data: {
          choices: [
            {
              message: {
                content: 'Use drip irrigation for tomato crop.'
              }
            }
          ]
        }
      }
    });

    jest.doMock('../../services/api/resilientHttpClient', () => ({
      request: mockRequest
    }));
    jest.doMock('../../services/monitoring/apiMonitor', () => ({
      recordRequest: jest.fn(),
      recordError: jest.fn()
    }));
    jest.doMock('../../services/api/circuitBreaker', () => ({
      CircuitBreakerManager: {
        getBreaker: jest.fn(() => ({
          execute: jest.fn((fn) => fn())
        }))
      }
    }));
    jest.doMock('../../services/ruleBasedChatbot', () => ({
      getResponse: jest.fn(() => ({ success: true, response: 'Fallback' }))
    }));

    const service = require('../../services/AgriAIService');
    const result = await service.chatWithAI('Best irrigation method for tomato?');

    expect(mockRequest).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.response).toContain('drip irrigation');
    expect(result.source).toBe('AgriSmart AI');
  });
});
