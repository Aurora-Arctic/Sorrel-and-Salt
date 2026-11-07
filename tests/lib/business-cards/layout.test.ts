import * as fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { backText, frontLayout } from '@/lib/business-cards/layout';
import { ARTBOARD, type CardFonts, PX_PER_INCH } from '@/lib/invitation-cards/layout';
import { inkedWidth, textWidth } from '@/lib/invitation-cards/text';
import { read } from '../../support/card-sheet-pdf';

const fonts = {
  cormorant600: fontkit.create(read('fonts/cormorant-unicase-600.ttf')),
  lexend300: fontkit.create(read('fonts/lexend-300.ttf')),
  lexend400: fontkit.create(read('fonts/lexend-400.ttf')),
  lexend500: fontkit.create(read('fonts/lexend-500.ttf')),
} as CardFonts;

// Artboard pixels: 192 to the inch, so 9 pt is 24 px. The trim's right edge is 24 px in from the artboard's.
const PT = PX_PER_INCH / 72;
const TRIM_RIGHT = ARTBOARD.width - ARTBOARD.trimInset;
const SHORT = { name: 'Testwort Hollin', email: 'testwort@example.test', phone: '555.010.0199' };
const LONG = {
  ...SHORT,
  name: 'Testwort Bramblecombe-Featherstonehaugh Hollinsworth',
};

const styleOf = (item: { font: keyof CardFonts; size: number; letterSpacing: number }) => ({
  font: fonts[item.font],
  size: item.size,
  letterSpacing: item.letterSpacing,
});

describe('the business card front', () => {
  it.each([
    ['short', SHORT],
    ['long', LONG],
  ])(
    "draws the rule under a %s name, as long as the name's width and starting where it starts",
    (_, details) => {
      const { text, rule } = frontLayout(fonts, details);
      const name = text.find((item) => item.text === details.name)!;
      expect(rule.x).toBe(name.x);
      expect(rule.width).toBeCloseTo(textWidth(styleOf(name), details.name), 6);
    },
  );

  it('sets a short name at 15 pt', () => {
    const { text } = frontLayout(fonts, SHORT);
    expect(text.find((item) => item.text === SHORT.name)!.size).toBeCloseTo(15 * PT, 6);
  });

  it('sets a name too wide for the card smaller, so its ink stops 9 pt inside the trim', () => {
    const { text } = frontLayout(fonts, LONG);
    const name = text.find((item) => item.text === LONG.name)!;
    // At 15 pt the name would run past the safe edge, which is why it is set smaller.
    expect(name.x + inkedWidth({ ...styleOf(name), size: 15 * PT }, LONG.name)).toBeGreaterThan(
      TRIM_RIGHT - 9 * PT,
    );
    expect(name.size).toBeLessThan(15 * PT);
    const right =
      name.x + Math.max(inkedWidth(styleOf(name), LONG.name), textWidth(styleOf(name), LONG.name));
    expect(right).toBeLessThanOrEqual(TRIM_RIGHT - 9 * PT + 1e-6);
    expect(right).toBeCloseTo(TRIM_RIGHT - 9 * PT, 3);
  });

  it('keeps an email address too wide for the card 9 pt inside the trim too', () => {
    const email = 'testwort.bramblecombe.featherstonehaugh@hollinsworth.example.test';
    const { text } = frontLayout(fonts, { ...SHORT, email });
    const line = text.find((item) => item.text === email)!;
    expect(line.x + inkedWidth(styleOf(line), email)).toBeLessThanOrEqual(
      TRIM_RIGHT - 9 * PT + 1e-6,
    );
  });

  it('prints the name, email, phone, site name and address', () => {
    const { text } = frontLayout(fonts, SHORT);
    expect(text.map((item) => item.text)).toEqual([
      SHORT.name,
      SHORT.email,
      SHORT.phone,
      'Sorrel & Salt',
      'SORRELANDSALT.COM',
    ]);
  });
});

describe('the business card back', () => {
  it("wraps the site's lede to three lines inside the card, its last baseline 18 pt above the trim's bottom", () => {
    const lines = backText(fonts);
    expect(lines).toHaveLength(3);
    const trimBottom = ARTBOARD.height - ARTBOARD.trimInset;
    expect(lines[lines.length - 1].baseline).toBeCloseTo(trimBottom - 18 * PT, 6);
    for (const line of lines)
      expect(line.x + inkedWidth(styleOf(line), line.text)).toBeLessThanOrEqual(
        TRIM_RIGHT - 9 * PT,
      );
  });
});
