import { describe, expect, it } from 'vitest';
import { normalizeSessionMessages } from '../chatSessionUtils';

describe('normalizeSessionMessages', () => {
  const fallbackFactory = () => ({
    id: 'welcome',
    role: 'assistant',
    content: 'welcome'
  });

  it('returns fallback message when session payload is invalid', () => {
    const result = normalizeSessionMessages(null, fallbackFactory);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('welcome');
  });

  it('maps valid messages to normalized structure', () => {
    const result = normalizeSessionMessages(
      [{ _id: 'm1', role: 'user', content: 'hello', timestamp: '2024-01-01T00:00:00.000Z' }],
      fallbackFactory
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('hello');
    expect(result[0].timestamp instanceof Date).toBe(true);
  });
});
