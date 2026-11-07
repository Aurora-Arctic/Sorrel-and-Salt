import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { BACK_NOTE, FRONT_COPY, SITE_ADDRESS, WORDMARK } from '@/lib/invitation-cards/copy';
import {
  ARTBOARD,
  BACK_PICTURE,
  backText,
  COLUMN,
  type CardFonts,
  FRONT_QR,
  frontCode,
  frontText,
  PX_PER_INCH,
  type TextItem,
} from '@/lib/invitation-cards/layout';
import { decodePng, GROUND_INK, PICTURE_LIGHT_INK, tintPicture } from '@/lib/invitation-cards/inks';
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

// A line's box: from where it starts to where its last glyph stops inking, and the inked height of its glyphs about its
// baseline, since the font's ascent reaches well above any letter and would hold the text further from the trim than it prints.
function boxOf(item: TextItem): Box {
  const f = fonts[item.font];
  const scale = item.size / f.unitsPerEm;
  const glyphs = f.layout(item.text).glyphs.map((glyph) => glyph.bbox);
  return {
    left: item.x,
    right: inkedRight(item),
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

// The longest expiry the date format writes, and a short one, which stands its code further right.
const VALID = 'Valid until 30 September 2027';
const SHORT_VALID = 'Valid until 31 March 2027';
const code = frontCode(fonts, VALID);
const qr: Box = {
  left: code.x,
  top: code.y,
  right: code.x + code.size,
  bottom: code.y + code.size,
};
const pt = (px: number) => (px * 72) / PX_PER_INCH;

// Where a line's last glyph stops inking, which can fall short of or past its advance.
function inkedRight(item: TextItem): number {
  const f = fonts[item.font];
  const scale = item.size / f.unitsPerEm;
  const { glyphs, positions } = f.layout(item.text);
  const before = positions
    .slice(0, -1)
    .reduce((sum, position) => sum + position.xAdvance * scale + item.letterSpacing, 0);
  return item.x + before + glyphs[glyphs.length - 1].bbox.maxX * scale;
}

// The middle of a line's advance, less the letter spacing after its last letter, which prints nothing.
function middleOf(item: TextItem): number {
  const style = { font: fonts[item.font], size: item.size, letterSpacing: item.letterSpacing };
  return item.x + (textWidth(style, item.text) - item.letterSpacing) / 2;
}
const columnLine = (items: TextItem[], text: string) => {
  const found = items.find((item) => item.text === text);
  if (!found) throw new Error(`no line "${text}"`);
  return found;
};
// The least room between the back's words and the sorrel, 1/16 in.
const PICTURE_GAP = PX_PER_INCH / 16;

// The sorrel as it prints: a pixel's amount is how far it moves the ground towards chalk, its tint times its
// alpha, and a pixel counts as inked from 5% of the way, as far as a fade can go before the eye reads it.
const INKED = 0.05;
const sorrel = (() => {
  const { rgba, width, height } = decodePng(
    readFileSync(path.join(process.cwd(), 'public/invitation-cards/sorrel.png')),
  );
  const { cmyk, alpha } = tintPicture(rgba, width, height);
  const k = 3;
  const amount = (i: number) =>
    ((cmyk[i * 4 + k] / 255 - GROUND_INK[k]) / (PICTURE_LIGHT_INK[k] - GROUND_INK[k])) *
    (alpha[i] / 255);
  return { width, height, amount };
})();
// The artboard x of the sorrel's leftmost inked pixel in the artboard rows from top to bottom, or Infinity if none.
function sorrelEdge(top: number, bottom: number): number {
  const { width, height, amount } = sorrel;
  let edge = Infinity;
  const rowOf = (y: number) => Math.floor(((y - BACK_PICTURE.y) * height) / BACK_PICTURE.height);
  for (let row = Math.max(0, rowOf(top)); row <= Math.min(height - 1, rowOf(bottom)); row += 1) {
    for (let column = 0; column < width; column += 1) {
      if (amount(row * width + column) >= INKED) {
        edge = Math.min(edge, BACK_PICTURE.x + (column * BACK_PICTURE.width) / width);
        break;
      }
    }
  }
  return edge;
}

describe('the card layout', () => {
  it('is a 3.5 × 2 in card with 1/8 in of bleed on every side', () => {
    expect((trim.right - trim.left) / PX_PER_INCH).toBe(3.5);
    expect((trim.bottom - trim.top) / PX_PER_INCH).toBe(2);
    expect(ARTBOARD.trimInset / PX_PER_INCH).toBe(0.125);
  });

  it.each(FRONT_COPY.map((copy) => [copy.headline, copy] as const))(
    'keeps every line of the "%s" front 1/8 in inside the trim and clear of the code',
    (_, copy) => {
      const items = frontText(fonts, copy, VALID, code);
      expect(items.length).toBeGreaterThan(5);
      for (const item of items) {
        const box = boxOf(item);
        expect(inside(box, safe), item.text).toBe(true);
        expect(overlaps(box, qr), item.text).toBe(false);
      }
    },
  );

  it.each(FRONT_COPY.map((copy) => [copy.headline, copy] as const))(
    'stacks the wordmark and the address above the code and the expiry below it on the "%s" front, each centred on the code',
    (_, copy) => {
      const items = frontText(fonts, copy, VALID, code);
      const wordmark = columnLine(items, WORDMARK);
      const address = columnLine(items, SITE_ADDRESS.toUpperCase());
      const valid = columnLine(items, VALID.toUpperCase());
      expect(boxOf(wordmark).bottom).toBeLessThan(boxOf(address).top);
      expect(boxOf(address).bottom).toBeLessThan(qr.top);
      expect(boxOf(valid).top).toBeGreaterThan(qr.bottom);
      for (const line of [wordmark, address, valid]) {
        expect(middleOf(line), line.text).toBeCloseTo(code.x + code.size / 2, 1);
      }
    },
  );

  it.each(FRONT_COPY.map((copy) => [copy.headline, copy] as const))(
    'runs the text column on the "%s" front from the top margin to the bottom margin by its inked edges',
    (_, copy) => {
      const column = frontText(fonts, copy, VALID, code)
        .filter((item) => item.x === COLUMN.left)
        .map(boxOf);
      expect(column.length).toBeGreaterThan(4);
      expect(
        Math.abs(pt(Math.min(...column.map((box) => box.top)) - safe.top)),
      ).toBeLessThanOrEqual(0.25);
      expect(
        Math.abs(pt(safe.bottom - Math.max(...column.map((box) => box.bottom)))),
      ).toBeLessThanOrEqual(0.25);
    },
  );

  it.each(FRONT_COPY.map((copy) => [copy.headline, copy] as const))(
    'runs the code’s column on the "%s" front from the top margin to the bottom margin, its gaps in the ratio 1 : 2 : 2',
    (_, copy) => {
      const items = frontText(fonts, copy, VALID, code);
      const wordmark = boxOf(columnLine(items, WORDMARK));
      const address = boxOf(columnLine(items, SITE_ADDRESS.toUpperCase()));
      const valid = boxOf(columnLine(items, VALID.toUpperCase()));
      expect(Math.abs(pt(wordmark.top - safe.top))).toBeLessThanOrEqual(0.25);
      expect(Math.abs(pt(safe.bottom - valid.bottom))).toBeLessThanOrEqual(0.25);
      const unit = pt(address.top - wordmark.bottom);
      expect(Math.abs(pt(qr.top - address.bottom) - 2 * unit)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(pt(valid.top - qr.bottom) - 2 * unit)).toBeLessThanOrEqual(0.25);
    },
  );

  it.each([SHORT_VALID, VALID])(
    'stands the code where "%s" ends its ink on the right margin, the column centred on the code and its gaps unchanged',
    (validUntil) => {
      const at = frontCode(fonts, validUntil);
      const items = frontText(fonts, FRONT_COPY[0], validUntil, at);
      const wordmark = columnLine(items, WORDMARK);
      const address = columnLine(items, SITE_ADDRESS.toUpperCase());
      const valid = columnLine(items, validUntil.toUpperCase());
      expect(Math.abs(pt(inkedRight(valid) - safe.right))).toBeLessThanOrEqual(0.25);
      for (const line of [wordmark, address, valid]) {
        expect(middleOf(line), line.text).toBeCloseTo(at.x + at.size / 2, 1);
      }
      expect(at.y).toBe(FRONT_QR.y);
      expect(at.size).toBe(FRONT_QR.size);
      expect(pt(boxOf(address).top - boxOf(wordmark).bottom)).toBeCloseTo(8.96, 1);
      expect(pt(at.y - boxOf(address).bottom)).toBeCloseTo(17.93, 1);
      expect(pt(boxOf(valid).top - (at.y + at.size))).toBeCloseTo(17.93, 1);
    },
  );

  it.each(FRONT_COPY.map((copy) => [copy.headline, copy] as const))(
    'sets no line of the "%s" front over another',
    (_, copy) => {
      const boxes = frontText(fonts, copy, VALID, code).map(boxOf);
      boxes.forEach((a, i) =>
        boxes.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)),
      );
    },
  );

  it('ends every line of the back at least 1/16 in left of the sorrel’s inked pixels beside it, the sentence in four lines', () => {
    const items = backText(fonts, 'b4444444');
    const sentence = items.filter((item) => item.font === 'lexend300');
    expect(sentence.length).toBeGreaterThan(1);
    expect(sentence.length).toBeLessThanOrEqual(4);
    for (const item of items) {
      const box = boxOf(item);
      expect(box.right, item.text).toBeLessThanOrEqual(
        sorrelEdge(box.top, box.bottom) - PICTURE_GAP,
      );
      expect(item.x).toBe(COLUMN.left);
    }
  });

  it('sets the three smallest lines, the expiry, the back’s note and its batch, at 15 px (5.6 pt)', () => {
    const valid = columnLine(frontText(fonts, FRONT_COPY[0], VALID, code), VALID.toUpperCase());
    const back = backText(fonts, 'b4444444');
    const note = columnLine(back, BACK_NOTE.toUpperCase());
    const batch = columnLine(back, 'BATCH B4444444');
    for (const line of [valid, note, batch]) {
      expect(line.size, line.text).toBe(15);
      expect(pt(line.size), line.text).toBeCloseTo(5.6, 1);
    }
  });

  it('keeps every line of the back 1/8 in inside the trim', () => {
    const items = backText(fonts, 'b4444444');
    for (const item of items) expect(inside(boxOf(item), safe), item.text).toBe(true);
  });

  it('prints the code inside the safe area, at least 0.9 in across so a phone reads it at arm’s length', () => {
    expect(inside(qr, safe)).toBe(true);
    const short = frontCode(fonts, SHORT_VALID);
    expect(short.x + short.size).toBeLessThanOrEqual(safe.right);
    expect(FRONT_QR.size / PX_PER_INCH).toBeGreaterThanOrEqual(0.9);
  });
});
