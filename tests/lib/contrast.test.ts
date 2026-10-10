import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CHIP_GROUNDS,
  HEX_COLOR,
  MIN_CHIP_CONTRAST,
  channels,
  chipContrast,
  contrastRatio,
  formatRatio,
  relativeLuminance,
} from '@/lib/contrast';
import { fromRoot } from '../support/paths';

// The contrast floor a category group's colours are held to on write (M5.6b),
// each against the harder of its own theme's two surfaces (MB.36).

describe('HEX_COLOR', () => {
  it('takes a whole #rrggbb hex in either case, and nothing shorter or longer', () => {
    expect(['#4e8bc2', '#4E8BC2'].every((hex) => HEX_COLOR.test(hex))).toBe(true);
    expect(['#4e8', '4e8bc2', '#4e8bc2ff', '#4e8bcg'].some((hex) => HEX_COLOR.test(hex))).toBe(
      false,
    );
  });
});

describe('channels', () => {
  it('reads a hex as its red, green and blue, each 0 to 1', () => {
    expect(channels('#ff0080')).toEqual([1, 0, 128 / 255]);
  });
});

describe('relativeLuminance', () => {
  it('reads black as 0 and white as 1', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
  });

  it('reads a hex in either case alike', () => {
    expect(relativeLuminance('#4E8BC2')).toBe(relativeLuminance('#4e8bc2'));
  });
});

describe('contrastRatio', () => {
  it('is 21:1 between black and white, whichever comes first', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10);
  });

  it('is 1:1 for a colour on itself', () => {
    expect(contrastRatio('#efe9da', '#efe9da')).toBe(1);
  });

  // WCAG's own worked figure: #767676 is the lightest grey to clear 4.5:1 on white.
  it('puts #767676 on white just over 4.5:1', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe('chipContrast', () => {
  it('measures the dark colour against the dark card and the light one against the light page', () => {
    expect(chipContrast('colorDark', '#4e8bc2')).toBe(contrastRatio('#4e8bc2', CHIP_GROUNDS.dark));
    expect(chipContrast('colorLight', '#0c5393')).toBe(
      contrastRatio('#0c5393', CHIP_GROUNDS.light),
    );
  });

  it('holds both to 4.5:1', () => {
    expect(MIN_CHIP_CONTRAST).toBe(4.5);
  });
});

describe('formatRatio', () => {
  it('shows two places', () => {
    expect(formatRatio(4.6904)).toBe('4.69');
    expect(formatRatio(21)).toBe('21.00');
  });

  // A refused ratio must never read as the floor it missed.
  it('cuts rather than rounds', () => {
    expect(formatRatio(4.4996)).toBe('4.49');
  });
});

// The grounds are the one pair of literals nothing else pins; after a
// repalette every check would measure against the wrong surface.
describe('CHIP_GROUNDS', () => {
  it('are the dark card and the light page _variables.scss defines', () => {
    const scss = readFileSync(fromRoot('src/scss/_variables.scss'), 'utf8');

    expect(scss).toMatch(new RegExp(`\\$soot-raised: ${CHIP_GROUNDS.dark};`));
    expect(scss).toMatch(new RegExp(`\\$parchment: ${CHIP_GROUNDS.light};`));
  });
});
