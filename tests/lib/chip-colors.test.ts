import { describe, expect, it } from 'vitest';
import { chipColors } from '@/lib/chip-colors';

// The one spelling of the inline custom properties `chip()` reads, so a
// component and the mixin cannot disagree about the name (MB.36).

describe('chipColors(pair)', () => {
  it('sets both of the row’s colours on the element, for the theme to pick between', () => {
    expect(chipColors({ colorDark: '#4e8bc2', colorLight: '#0c5393' })).toEqual({
      '--chip-dark': '#4e8bc2',
      '--chip-light': '#0c5393',
    });
  });
});
