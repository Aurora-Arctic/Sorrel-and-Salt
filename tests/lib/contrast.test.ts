import { describe, expect, it } from 'vitest';
import {
  CHIP_GROUNDS,
  HEX_COLOR,
  channels,
  chipContrast,
  contrastRatio,
  formatRatio,
  hexColour,
  hexMask,
  relativeLuminance,
} from '@/lib/contrast';

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

describe('hexColour', () => {
  it('shows a hex as # and six lower-case digits, however it was typed', () => {
    for (const typed of ['#4e8bc2', '4E8BC2', ' 4E8BC2', '#4E8BC2 ', '# 4e 8b c2', '\t#4e8bc2\n']) {
      expect(hexColour(typed), typed).toBe('#4e8bc2');
    }
  });

  it('expands three-digit shorthand by doubling each digit', () => {
    expect(hexColour('abc')).toBe('#aabbcc');
    expect(hexColour(' #ABC ')).toBe('#aabbcc');
    expect(hexColour('#06c')).toBe('#0066cc');
  });

  it('leaves text it cannot read as a hex as it was typed', () => {
    for (const typed of ['', 'blue', '#ab', '#4e8bc', '#4e8bc2ff', '#gggggg', '4e8b']) {
      expect(hexColour(typed), typed).toBe(typed);
    }
  });
});

describe('hexMask', () => {
  it('keeps one leading # and the digits after it, as typed', () => {
    expect(hexMask.format('4E8BC2')).toBe('#4E8BC2');
    expect(hexMask.format('#4e8bc2')).toBe('#4e8bc2');
    expect(hexMask.format(' 4e8bc2')).toBe('#4e8bc2');
    expect(hexMask.format('##4e8bc2')).toBe('#4e8bc2');
  });
  it('leaves the box empty when nothing but the # is left', () => {
    expect(hexMask.format('')).toBe('');
    expect(hexMask.format('#')).toBe('');
    expect(hexMask.format(' # ')).toBe('');
  });
  it('keeps a character that is not a hex digit on screen, so the refusal can name it', () => {
    expect(hexMask.format('4e8bg2')).toBe('#4e8bg2');
  });
  it('counts the digits typed, not the # it adds', () => {
    expect(hexMask.isSignificant('4')).toBe(true);
    expect(hexMask.isSignificant('g')).toBe(true);
    expect(hexMask.isSignificant('#')).toBe(false);
    expect(hexMask.isSignificant(' ')).toBe(false);
  });
});
