import { describe, expect, it } from 'vitest';
import { getCropMutationMode } from '../Crops';

describe('getCropMutationMode', () => {
  it('returns create when crop is not selected', () => {
    expect(getCropMutationMode(null)).toBe('create');
    expect(getCropMutationMode({})).toBe('create');
  });

  it('returns update when selected crop has _id', () => {
    expect(getCropMutationMode({ _id: 'crop-1' })).toBe('update');
  });
});
