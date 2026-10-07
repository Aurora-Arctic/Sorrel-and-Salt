import { describe, expect, it } from 'vitest';
import { CATEGORY_GROUPS } from '@/db/seed/category-groups';
import { CHIP_GROUNDS, chipContrast } from '@/lib/contrast';
import {
  MAX_HUE_DISTANCE,
  NEAR_COLOR_DELTA,
  colorDistance,
  boundaryPoints,
  contrastBoundary,
  failingLabelPoint,
  failingRegion,
  hueDistance,
  isAchromatic,
  nearColor,
  pairedColor,
  passesAt,
  toHsl,
} from '@/lib/group-colors';

// A category group's two colours as one family (M5.6b, the owner's call): one
// hue to within MAX_HUE_DISTANCE, as every seeded pair is, and a partner
// derived from whichever is chosen first — the hue kept, the saturation scaled
// as the seeds scale it, the lightness solved for the partner's own ground.

describe('toHsl', () => {
  it('reads a hex as hue, saturation and lightness', () => {
    const [hue, saturation, lightness] = toHsl('#4e8bc2');
    expect(hue).toBeCloseTo(208.4, 1);
    expect(saturation).toBeCloseTo(0.49, 2);
    expect(lightness).toBeCloseTo(0.53, 2);
  });

  it('gives a grey no saturation', () => {
    expect(toHsl('#808080')[1]).toBe(0);
  });
});

describe('hueDistance', () => {
  it('measures the short way round the wheel', () => {
    // 344° and 4° are twenty degrees apart, not 340.
    expect(hueDistance('#cb6883', '#c26a5e')).toBeLessThan(25);
    expect(hueDistance('#4e8bc2', '#0c5393')).toBeLessThan(1);
  });
});

describe('isAchromatic', () => {
  it('takes a grey, or a colour too faint for its hue to mean anything, as no hue', () => {
    expect(isAchromatic('#808080')).toBe(true);
    expect(isAchromatic('#828080')).toBe(true);
    expect(isAchromatic('#4e8bc2')).toBe(false);
  });
});

describe('the seeded pairs', () => {
  it.each(CATEGORY_GROUPS.map((group) => [group.name, group] as const))(
    'keep %s to one hue',
    (_name, { colorDark, colorLight }) => {
      expect(hueDistance(colorDark, colorLight)).toBeLessThanOrEqual(MAX_HUE_DISTANCE);
    },
  );
});

describe('pairedColor', () => {
  const seeded = CATEGORY_GROUPS.flatMap((group) => [
    [`${group.name}'s light-theme partner`, group.colorDark, 'colorLight'] as const,
    [`${group.name}'s dark-theme partner`, group.colorLight, 'colorDark'] as const,
  ]);

  it.each(seeded)('derives %s on its own ground, at the same hue', (_name, source, column) => {
    const partner = pairedColor(source, column);

    expect(partner).toMatch(/^#[0-9a-f]{6}$/);
    expect(chipContrast(column, partner)).toBeGreaterThanOrEqual(4.6);
    expect(hueDistance(source, partner)).toBeLessThan(1);
  });

  // The lightness is the one nearest the ground that clears it, so the
  // partner is no darker or lighter than it needs to be.
  it('lands a tenth over the floor, not far past it', () => {
    for (const [, source, column] of seeded) {
      expect(chipContrast(column, pairedColor(source, column))).toBeLessThan(4.8);
    }
  });

  // The seeds' means: 40% saturation on the dark card, 55% on the light page.
  it("scales the saturation by the seeds' ratio between the themes", () => {
    const [, dark] = toHsl('#5d8ab1');
    const [, light] = toHsl('#286ba6');

    expect(toHsl(pairedColor('#5d8ab1', 'colorLight'))[1]).toBeCloseTo((dark * 0.55) / 0.4, 1);
    expect(toHsl(pairedColor('#286ba6', 'colorDark'))[1]).toBeCloseTo((light * 0.4) / 0.55, 1);
  });

  it('comes close to the seed it stands in for', () => {
    // Mind & Spirit's light colour from its dark one: the seed is #6e4ce6.
    expect(colorDistance(pairedColor('#8e7bd1', 'colorLight'), '#6e4ce6')).toBeLessThan(0.03);
    // Protection & Defense's dark colour from its light one: the seed is #5d8ab1.
    expect(colorDistance(pairedColor('#286ba6', 'colorDark'), '#5d8ab1')).toBeLessThan(0.03);
  });

  it('keeps a grey grey, so the pair has no hue to disagree on', () => {
    const partner = pairedColor('#828080', 'colorLight');

    expect(toHsl(partner)[1]).toBe(0);
    expect(chipContrast('colorLight', partner)).toBeGreaterThanOrEqual(4.6);
  });

  it('reads a hex in either case alike', () => {
    expect(pairedColor('#4E8BC2', 'colorLight')).toBe(pairedColor('#4e8bc2', 'colorLight'));
  });

  it('measures against the grounds the check uses', () => {
    expect(CHIP_GROUNDS).toEqual({ dark: '#1f1c16', light: '#efe9da' });
  });
});

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

describe('contrastBoundary', () => {
  const point = (segment: string) => segment.trim().split(' ').map(Number) as [number, number];
  const points = (path: string) => path.replace(/^M /, '').split(' L ').map(point);

  it('draws one path across the area, left to right, in a 0–100 box with y down', () => {
    const path = contrastBoundary(208, 'colorDark', 'hsb');

    expect(path).toMatch(/^M \d+ \d+(\.\d+)?( L \d+ \d+(\.\d+)?)+$/);
    const xs = points(path).map(([x]) => x);
    expect(xs[0]).toBe(0);
    expect(xs[xs.length - 1]).toBe(100);
    for (const [, y] of points(path)) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  // The seeded blue sits on the passing side of its own theme's line: above
  // it on the dark card, where light passes; below on the light page.
  it('puts a passing colour on the passing side, for each ground', () => {
    const dark = points(contrastBoundary(208, 'colorDark', 'hsb'));
    const [, sDark, bDark] = toHsb('#4e8bc2');
    const lineAtDark = dark.find(([x]) => x === Math.round(sDark / 2) * 2)?.[1] as number;
    expect(100 - bDark).toBeLessThan(lineAtDark);

    const light = points(contrastBoundary(208, 'colorLight', 'hsb'));
    const [, sLight, bLight] = toHsb('#0c5393');
    const lineAtLight = light.find(([x]) => x === Math.round(sLight / 2) * 2)?.[1] as number;
    expect(100 - bLight).toBeGreaterThan(lineAtLight);
  });

  it('draws the HSL area on its own lightness axis', () => {
    const hsl = contrastBoundary(208, 'colorLight', 'hsl');
    const hsb = contrastBoundary(208, 'colorLight', 'hsb');

    expect(hsl).toMatch(/^M /);
    expect(hsl).not.toBe(hsb);
  });
});

/** A hex as hue, saturation and brightness, each as the picker shows it, 0–360 and 0–100. */
function toHsb(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const [hue] = toHsl(hex);
  return [hue, max === 0 ? 0 : ((max - min) / max) * 100, max * 100];
}

describe('passesAt', () => {
  // At hue 208 on the dark card: white at the top-left passes, black at the bottom fails.
  it('reads the area as the picker lays it out, y up', () => {
    expect(passesAt(208, 'colorDark', 'hsb', 0, 100)).toBe(true);
    expect(passesAt(208, 'colorDark', 'hsb', 50, 0)).toBe(false);
    expect(passesAt(208, 'colorLight', 'hsb', 50, 0)).toBe(true);
  });
});

describe('boundaryPoints', () => {
  it('gives the points the path is drawn through', () => {
    const points = boundaryPoints(208, 'colorDark', 'hsb');

    expect(contrastBoundary(208, 'colorDark', 'hsb')).toBe(
      `M ${points.map(([x, y]) => `${x} ${y.toFixed(2)}`).join(' L ')}`,
    );
    // Each point sits on the floor: just above passes, just below fails.
    for (const [x, y] of points.slice(1, -1)) {
      expect(passesAt(208, 'colorDark', 'hsb', x, 100 - y + 0.5)).toBe(true);
      expect(passesAt(208, 'colorDark', 'hsb', x, 100 - y - 0.5)).toBe(false);
    }
  });
});

describe('failingRegion', () => {
  /** Whether a point lies in the polygon, by ray casting. */
  const inside = (polygon: [number, number][], [x, y]: [number, number]) => {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };

  it.each([
    [208, 'colorDark'],
    [208, 'colorLight'],
    [240, 'colorDark'],
    [60, 'colorLight'],
  ] as const)('covers exactly the failing colours at hue %s on %s', (hue, column) => {
    const region = failingRegion(hue, column, 'hsb');
    // A grid of points away from the boundary itself, where sampling decides.
    for (let x = 5; x < 100; x += 10) {
      for (let y = 5; y < 100; y += 10) {
        const fails = !passesAt(hue, column, 'hsb', x, 100 - y);
        const nearEdge = [y - 3, y + 3].some(
          (v) => passesAt(hue, column, 'hsb', x, 100 - v) === fails,
        );
        if (!nearEdge) expect(inside(region, [x, y])).toBe(fails);
      }
    }
  });
});

describe('failingLabelPoint', () => {
  // On the dark card the veil deepens to the right, where saturated blues
  // stay dark; on the light page it deepens to the left, where pale greys sit.
  it("centres the label across on the veiled side's own centre of area", () => {
    const [dark] = failingLabelPoint(208, 'colorDark', 'hsb') as [number, number];
    const [light] = failingLabelPoint(208, 'colorLight', 'hsb') as [number, number];

    expect(dark).toBeGreaterThan(50);
    expect(light).toBeLessThan(50);
  });

  it.each([
    [208, 'colorDark'],
    [208, 'colorLight'],
    [240, 'colorDark'],
    [60, 'colorLight'],
  ] as const)(
    'sits on a failing colour, inside the middle of the area, at hue %s on %s',
    (hue, column) => {
      const point = failingLabelPoint(hue, column, 'hsb');

      expect(point).toBeDefined();
      const [x, y] = point as [number, number];
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(90);
      expect(passesAt(hue, column, 'hsb', x, 100 - y)).toBe(false);
    },
  );
});
