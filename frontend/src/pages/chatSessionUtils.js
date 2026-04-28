export const normalizeSessionMessages = (sessionMessages = [], fallbackMessageFactory) => {
  if (!Array.isArray(sessionMessages)) {
    return [fallbackMessageFactory()];
  }

  const normalized = sessionMessages
    .map((msg, index) => ({
      id: msg.id || msg._id || `${msg.role || 'assistant'}-${index}-${Date.now()}`,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content || '',
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      intent: msg.intent,
      data: msg.data,
      suggestions: msg.suggestions
    }))
    .filter((msg) => typeof msg.content === 'string' && msg.content.trim().length > 0);

  return normalized.length > 0 ? normalized : [fallbackMessageFactory()];
};
