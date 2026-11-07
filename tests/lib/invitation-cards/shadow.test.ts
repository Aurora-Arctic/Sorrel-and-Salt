import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import {
  type CardFonts,
  codeColumnText,
  COLUMN,
  FRONT_PICTURE,
  frontCode,
  PX_PER_INCH,
  SHADOW_OPACITY,
} from '@/lib/invitation-cards/layout';
import { type CodeShadows, codeShadows } from '@/lib/invitation-cards/shadow';
import { decodePng } from '@/lib/invitation-cards/inks';
import { inkExtent, textWidth } from '@/lib/invitation-cards/text';

const PUBLIC = path.join(process.cwd(), 'public/invitation-cards');
const font = (file: string) => fontkit.create(readFileSync(path.join(PUBLIC, 'fonts', file)));
const fonts: CardFonts = {
  cormorant600: font('cormorant-unicase-600.ttf'),
  lexend300: font('lexend-300.ttf'),
  lexend400: font('lexend-400.ttf'),
  lexend500: font('lexend-500.ttf'),
};
const PT = PX_PER_INCH / 72;
const LINK = 'https://sorrelandsalt.com/i/card000000000007';
const VALID = 'Valid until 31 March 2027';
const code = frontCode(fonts, VALID);
const column = codeColumnText(fonts, VALID, code);
const shadows = codeShadows(fonts, column, code);
const mask = shadows.mask(LINK);

function centroid(values: ArrayLike<number>) {
  let sum = 0;
  let x = 0;
  let y = 0;
  for (let row = 0; row < shadows.rows; row += 1)
    for (let col = 0; col < shadows.columns; col += 1) {
      const v = values[row * shadows.columns + col];
      sum += v;
      x += v * (col + 0.5);
      y += v * (row + 0.5);
    }
  const scale = shadows.width / shadows.columns;
  return { x: shadows.x + (x / sum) * scale, y: shadows.y + (y / sum) * scale };
}

// The middle of the mask's inked extent across and down, in artboard px.
function extentMiddle(of: CodeShadows, values: ArrayLike<number>) {
  const inked = (count: number, value: (i: number, j: number) => number, other: number) => {
    const hit = Array.from({ length: count }, (_, i) =>
      Array.from({ length: other }, (_, j) => value(i, j)).some((v) => v > 0),
    );
    return (hit.indexOf(true) + hit.lastIndexOf(true) + 1) / 2;
  };
  const scale = of.width / of.columns;
  return {
    x: of.x + scale * inked(of.columns, (c, r) => values[r * of.columns + c], of.rows),
    y: of.y + scale * inked(of.rows, (r, c) => values[r * of.columns + c], of.columns),
  };
}

// The mask's value under an artboard point.
function at(x: number, y: number): number {
  const col = Math.floor(((x - shadows.x) / shadows.width) * shadows.columns);
  const row = Math.floor(((y - shadows.y) / shadows.height) * shadows.rows);
  return mask[row * shadows.columns + col];
}

describe("the code column's shadow", () => {
  it('peaks at the shadow opacity', () => {
    expect(Math.max(...mask)).toBe(Math.round(SHADOW_OPACITY * 255));
  });

  it("is drawn at the salt picture's resolution or finer", () => {
    const { width } = decodePng(new Uint8Array(readFileSync(path.join(PUBLIC, 'salt.png'))));
    expect(shadows.columns / shadows.width).toBeGreaterThanOrEqual(width / FRONT_PICTURE.width);
    expect(shadows.rows / shadows.height).toBeCloseTo(shadows.columns / shadows.width, 6);
  });

  // The shapes' own weight leans off the centre line, as letters and dots fall, so the centre is the shadow's extent.
  it("spreads evenly about the code column's centre, with no offset from the shapes it blurs", () => {
    const { x: middleX, y: middleY } = extentMiddle(shadows, mask);
    expect(Math.abs(middleX - (code.x + code.size / 2))).toBeLessThanOrEqual(PT);
    expect(Math.abs(middleY - (COLUMN.top + COLUMN.height / 2))).toBeLessThanOrEqual(PT);
    const shadow = centroid(mask);
    const shape = centroid(shadows.coverage(LINK));
    expect(Math.abs(shadow.x - shape.x)).toBeLessThanOrEqual(PT);
    expect(Math.abs(shadow.y - shape.y)).toBeLessThanOrEqual(PT);
  });

  it('darkens behind every line of the column and the code, and fades to nothing before its edges', () => {
    for (const item of column) {
      const style = { font: fonts[item.font], size: item.size, letterSpacing: item.letterSpacing };
      const { above } = inkExtent(fonts[item.font], item.size, item.text);
      const middle = item.x + (textWidth(style, item.text) - item.letterSpacing) / 2;
      expect(at(middle, item.baseline - above / 2), item.text).toBeGreaterThan(0);
    }
    expect(at(code.x + code.size / 2, code.y + code.size / 2)).toBeGreaterThan(0);
    const edges: number[] = [];
    for (let col = 0; col < shadows.columns; col += 1)
      edges.push(mask[col], mask[(shadows.rows - 1) * shadows.columns + col]);
    for (let row = 0; row < shadows.rows; row += 1)
      edges.push(mask[row * shadows.columns], mask[row * shadows.columns + shadows.columns - 1]);
    expect(Math.max(...edges)).toBe(0);
  });

  it('moves across with the code when a longer date stands it further left', () => {
    const long = 'Valid until 30 September 2027';
    const there = frontCode(fonts, long);
    expect(code.x - there.x).toBeGreaterThan(5 * PT);
    const moved = codeShadows(fonts, codeColumnText(fonts, long, there), there);
    const middle = extentMiddle(moved, moved.mask(LINK));
    expect(Math.abs(middle.x - (there.x + there.size / 2))).toBeLessThanOrEqual(PT);
    expect(Math.abs(middle.y - extentMiddle(shadows, mask).y)).toBeLessThanOrEqual(PT);
  });

  it("follows each card's own code", () => {
    const other = shadows.mask('https://sorrelandsalt.com/i/card000000000008');
    expect(Buffer.from(other).equals(Buffer.from(mask))).toBe(false);
  });
});
