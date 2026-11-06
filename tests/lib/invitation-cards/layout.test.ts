import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { FRONT_COPY } from '@/lib/invitation-cards/copy';
import {
  ARTBOARD,
  backText,
  type CardFonts,
  FRONT_QR,
  frontText,
  PX_PER_INCH,
  type TextItem,
} from '@/lib/invitation-cards/layout';
import { textWidth } from '@/lib/invitation-cards/text';

const FONTS = path.join(process.cwd(), 'public/invitation-cards/fonts');
const font = (file: string) => fontkit.create(readFileSync(path.join(FONTS, file)));
const fonts: CardFonts = {
  cormorant600: font('cormorant-unicase-600.ttf'),
  lexend300: font('lexend-300.ttf'),
  lexend400: font('lexend-400.ttf'),
  lexend500: font('lexend-500.ttf'),
};

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// The trim, 3.5 × 2 in, and the safe area 1/8 in inside it, in artboard pixels.
const trim: Box = {
  left: ARTBOARD.trimInset,
  top: ARTBOARD.trimInset,
  right: ARTBOARD.width - ARTBOARD.trimInset,
  bottom: ARTBOARD.height - ARTBOARD.trimInset,
};
const SAFE_INSET = PX_PER_INCH / 8;
const safe: Box = {
  left: trim.left + SAFE_INSET,
  top: trim.top + SAFE_INSET,
  right: trim.right - SAFE_INSET,
  bottom: trim.bottom - SAFE_INSET,
};

// A line's box: its advance across, and the inked height of its glyphs about its baseline, since the
// font's ascent reaches well above any letter and would hold the text further from the trim than it prints.
function boxOf(item: TextItem): Box {
  const f = fonts[item.font];
  const scale = item.size / f.unitsPerEm;
  const glyphs = f.layout(item.text).glyphs.map((glyph) => glyph.bbox);
  return {
    left: item.x,
    right:
      item.x +
      textWidth({ font: f, size: item.size, letterSpacing: item.letterSpacing }, item.text),
    top: item.baseline - Math.max(...glyphs.map((box) => box.maxY)) * scale,
    bottom: item.baseline - Math.min(...glyphs.map((box) => box.minY)) * scale,
  };
}
const inside = (inner: Box, outer: Box) =>
  inner.left >= outer.left - 1e-6 &&
  inner.right <= outer.right + 1e-6 &&
  inner.top >= outer.top - 1e-6 &&
  inner.bottom <= outer.bottom + 1e-6;
const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const qr: Box = {
  left: FRONT_QR.x,
  top: FRONT_QR.y,
  right: FRONT_QR.x + FRONT_QR.size,
  bottom: FRONT_QR.y + FRONT_QR.size,
};
// The longest expiry the date format writes.
const VALID = 'Valid until 30 September 2027';

describe('the card layout', () => {
  it('is a 3.5 × 2 in card with 1/8 in of bleed on every side', () => {
    expect((trim.right - trim.left) / PX_PER_INCH).toBe(3.5);
    expect((trim.bottom - trim.top) / PX_PER_INCH).toBe(2);
    expect(ARTBOARD.trimInset / PX_PER_INCH).toBe(0.125);
  });

  it.each(FRONT_COPY.map((copy) => [copy.headline, copy] as const))(
    'keeps every line of the "%s" front 1/8 in inside the trim and clear of the code',
    (_, copy) => {
      const items = frontText(fonts, copy, VALID);
      expect(items.length).toBeGreaterThan(5);
      for (const item of items) {
        const box = boxOf(item);
        expect(inside(box, safe), item.text).toBe(true);
        expect(overlaps(box, qr), item.text).toBe(false);
      }
    },
  );

  it('keeps every line of the back 1/8 in inside the trim', () => {
    const items = backText(fonts, 'b4444444');
    for (const item of items) expect(inside(boxOf(item), safe), item.text).toBe(true);
  });

  it('prints the code inside the safe area, at least 0.9 in across so a phone reads it at arm’s length', () => {
    expect(inside(qr, safe)).toBe(true);
    expect(FRONT_QR.size / PX_PER_INCH).toBeGreaterThanOrEqual(0.9);
  });
});
