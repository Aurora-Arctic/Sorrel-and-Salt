import { describe, expect, it } from 'vitest';
import {
  GROUND_INK,
  HEADING_INK,
  inkOf,
  LABEL_INK,
  MUTED_INK,
  PICTURE_LIGHT_INK,
  tintPicture,
} from '@/lib/invitation-cards/inks';
import { CHALK, LABEL, MUTED, SOOT } from '@/lib/invitation-cards/layout';

const expectInk = (actual: readonly number[], expected: number[]) => {
  expect(actual).toHaveLength(4);
  actual.forEach((v, i) => expect(v, `channel ${i}`).toBeCloseTo(expected[i], 4));
};

describe('the print inks', () => {
  it('prints the ground as black alone, at the K that keeps soot as dark', () => {
    expectInk(GROUND_INK, [0, 0, 0, 0.92885]);
  });

  it('leaves the headings as paper, with no ink', () => {
    expect([...HEADING_INK]).toEqual([0, 0, 0, 0]);
  });

  it('prints the muted text and the sheet label as black tints', () => {
    expectInk(MUTED_INK, [0, 0, 0, 0.27843]);
    expectInk(LABEL_INK, [0, 0, 0, 0.66667]);
  });

  it('lights the pictures towards chalk in the same black-replaced inks', () => {
    expectInk(PICTURE_LIGHT_INK, [0, 0.02979, 0.09787, 0.07843]);
  });

  it('gives each card colour its ink, and refuses a colour with none', () => {
    expect(inkOf(CHALK)).toBe(HEADING_INK);
    expect(inkOf(MUTED)).toBe(MUTED_INK);
    expect(inkOf(LABEL)).toBe(LABEL_INK);
    expect(() => inkOf(SOOT)).toThrow();
  });
});

describe('tinting a picture', () => {
  // Three opaque greys, 100, 120 and 255, and one transparent black pixel the mean and the darkest must both ignore.
  // The opaque mean is 158.33, so contrast 4 and lift 36 stretch them to 0 (clamped), 41 and 255 (clamped).
  const rgba = new Uint8Array([
    100, 100, 100, 255, 120, 120, 120, 128, 255, 255, 255, 255, 0, 0, 0, 0,
  ]);
  const { cmyk, alpha } = tintPicture(rgba, 4, 1);
  const pixel = (i: number) => [...cmyk.slice(i * 4, i * 4 + 4)];
  const byte = (v: number) => Math.round(v * 255);
  const between = (t: number) => GROUND_INK.map((g, c) => byte(g + (PICTURE_LIGHT_INK[c] - g) * t));

  it('keeps the alpha as its soft mask', () => {
    expect([...alpha]).toEqual([255, 128, 255, 0]);
  });

  it('prints the darkest opaque pixel as the ground and the lightest as chalk', () => {
    expect(pixel(0)).toEqual(GROUND_INK.map(byte));
    expect(pixel(2)).toEqual(PICTURE_LIGHT_INK.map(byte));
  });

  it('places a pixel between them by its stretched luminance', () => {
    // Counting the transparent pixel would pull the mean to 118.75, the darkest to 80 and this pixel's t to 80/175.
    expect(pixel(1)).toEqual(between(41 / 255));
  });

  it('takes the darkest from the 1st percentile, so a stray dark pixel does not set it', () => {
    // One black pixel and 199 mid greys: the 1st percentile is the grey, so the grey prints as the ground, not a step above it.
    const n = 200;
    const many = new Uint8Array(n * 4);
    for (let i = 1; i < n; i += 1) many.set([128, 128, 128, 255], i * 4);
    many.set([0, 0, 0, 255], 0);
    const tinted = tintPicture(many, n, 1).cmyk;
    expect([...tinted.slice(4, 8)]).toEqual(GROUND_INK.map(byte));
  });
});
