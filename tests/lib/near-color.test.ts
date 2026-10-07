import { describe, expect, it } from 'vitest';
import { CATEGORY_GROUPS } from '@/db/seed/category-groups';
import { NEAR_COLOR_DELTA, colorDistance, nearColor } from '@/lib/near-color';

// How close two groups' colours in one theme may stand before the picker warns (M5.6b).

describe('colorDistance', () => {
  it('is 0 for a colour on itself and 1 from black to white', () => {
    expect(colorDistance('#4e8bc2', '#4E8BC2')).toBe(0);
    expect(colorDistance('#000000', '#ffffff')).toBeCloseTo(1, 6);
  });

  it('reads a nudge of a few steps as near, and two seeded neighbours as apart', () => {
    expect(colorDistance('#4e8bc2', '#4a87bf')).toBeLessThan(NEAR_COLOR_DELTA);
    // The two seeded greens, the closest pair in either theme.
    expect(colorDistance('#7b9132', '#379835')).toBeGreaterThan(NEAR_COLOR_DELTA);
  });

  // So no seeded group warns of another, in either theme.
  it('keeps every seeded group clear of every other within its theme', () => {
    for (const column of ['colorDark', 'colorLight'] as const) {
      for (const a of CATEGORY_GROUPS) {
        for (const b of CATEGORY_GROUPS) {
          if (a === b) continue;
          expect(colorDistance(a[column], b[column])).toBeGreaterThanOrEqual(NEAR_COLOR_DELTA);
        }
      }
    }
  });
});

describe('nearColor', () => {
  const others = [
    { name: 'Testward', hex: '#4e8bc2' },
    { name: 'Testcraft', hex: '#c45dc7' },
  ];

  it('names the nearest other within the distance, and none beyond it', () => {
    expect(nearColor('#4a87bf', others)?.name).toBe('Testward');
    expect(nearColor('#379835', others)).toBeUndefined();
    expect(nearColor('#4a87bf', [])).toBeUndefined();
  });
});
