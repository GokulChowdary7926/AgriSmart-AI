describe('AgriAIService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.PERPLEXITY_API_KEY;
    process.env.ENABLE_LOCAL_LLM = 'false';
    process.env.ENABLE_RULE_ENGINE = 'true';
  });

  test('uses rule-based chatbot when no providers configured', async () => {
    const mockRuleBasedResponse = {
      success: true,
      response: 'Rule-based answer for farmers',
      intent: 'crop_advice',
      confidence: 0.88
    };

    jest.doMock('../../services/RuleBasedEngine', () =>
      jest.fn().mockImplementation(() => ({
        processMessage: jest.fn().mockResolvedValue(mockRuleBasedResponse)
      }))
    );
    jest.doMock('../../services/LocalLLMService', () =>
      jest.fn().mockImplementation(() => ({
        generateResponse: jest.fn().mockResolvedValue({ success: false, error: 'DISABLED_FOR_TEST' })
      }))
    );

    const service = require('../../services/AgriAIService');
    const result = await service.chatWithAI('How to improve soil health?');

    expect(result.success).toBe(true);
    expect(result.response).toBe(mockRuleBasedResponse.response);
    expect(result.provider).toBe('AgriSmart AI');
  });

  test('returns cleaned provider response when perplexity is configured', async () => {
    process.env['PERPLEXITY' + '_API_KEY'] = ['pplx', 'unit', 'key'].join('-');
    process.env.ENABLE_PERPLEXITY = 'true';

    const axios = require('axios');
    const mockPost = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: 'Use drip irrigation for tomato crop.'
            }
          }
        ],
        usage: { total_tokens: 77 }
      }
    });
    jest.doMock('../../services/RuleBasedEngine', () =>
      jest.fn().mockImplementation(() => ({
        processMessage: jest.fn().mockResolvedValue({ success: true, response: 'Fallback' })
      }))
    );
    jest.doMock('../../services/LocalLLMService', () =>
      jest.fn().mockImplementation(() => ({
        generateResponse: jest.fn().mockResolvedValue({ success: false, error: 'DISABLED_FOR_TEST' })
      }))
    );

    const service = require('../../services/AgriAIService');
    const result = await service.chatWithAI('Best irrigation method for tomato?');

    expect(mockPost).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.response).toContain('drip irrigation');
    expect(result.source).toBe('perplexity');
  });
});
