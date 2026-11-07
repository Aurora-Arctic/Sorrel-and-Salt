import UPNG from '@pdf-lib/upng';
import { CHALK, LABEL, MUTED, SOOT, SORREL_BRIGHT } from './layout';

export type Cmyk = readonly [number, number, number, number];

// The owner's chosen print tile, 100-A4: black replacement 100%, column A (none of soot's colour kept), row 4 (contrast 4, lift +36).
const BLACK_REPLACEMENT = 1;
const COLOUR_KEPT = 0;
const CONTRAST = 4;
const LIFT = 36;

type Rgb = readonly [number, number, number];

const hexRgb = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luminance = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

function toCmyk(rgb: Rgb, g: number): Cmyk {
  const [c, m, y] = rgb.map((v) => 1 - v / 255);
  const k = g * Math.min(c, m, y);
  if (k >= 1) return [0, 0, 0, 1];
  return [(c - k) / (1 - k), (m - k) / (1 - k), (y - k) / (1 - k), k];
}

function hsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : [0, c, x];
  return [r + m, g + m, b + m].map((v) => Math.round(v * 255)) as unknown as Rgb;
}

const SOOT_RGB = hexRgb(SOOT);
const HUE = (() => {
  const [r, g, b] = SOOT_RGB.map((v) => v / 255);
  return 60 * (((g - b) / (Math.max(r, g, b) - Math.min(r, g, b))) % 6);
})();
const SOOT_SATURATION =
  (Math.max(...SOOT_RGB) - Math.min(...SOOT_RGB)) / (Math.max(...SOOT_RGB) + Math.min(...SOOT_RGB));
const TEXT_SATURATION = COLOUR_KEPT * SOOT_SATURATION;

// M and Y move from C's level towards soot's own, and K rises until the ground reads as dark as soot in full.
function groundInk(): Cmyk {
  const [c, m, y, k] = toCmyk(SOOT_RGB, BLACK_REPLACEMENT);
  const M = c + COLOUR_KEPT * (m - c);
  const Y = c + COLOUR_KEPT * (y - c);
  const lightness = (C: number, Mm: number, Yy: number, K: number) =>
    luminance(255 * (1 - C) * (1 - K), 255 * (1 - Mm) * (1 - K), 255 * (1 - Yy) * (1 - K));
  return [c, M, Y, clamp(1 - lightness(c, m, y, k) / lightness(c, M, Y, 0), 1)];
}

export const GROUND_INK = groundInk();
export const HEADING_INK = toCmyk(
  hsl(HUE, TEXT_SATURATION, 1 - TEXT_SATURATION / 4),
  BLACK_REPLACEMENT,
);
export const MUTED_INK = toCmyk(hsl(HUE, TEXT_SATURATION, 0.72), BLACK_REPLACEMENT);
export const LABEL_INK = toCmyk(hexRgb(LABEL), BLACK_REPLACEMENT);
export const PICTURE_LIGHT_INK = toCmyk(hexRgb(CHALK), BLACK_REPLACEMENT);

export const RULE_INK = toCmyk(hexRgb(SORREL_BRIGHT), BLACK_REPLACEMENT);

const INKS: Record<string, Cmyk> = {
  [CHALK]: HEADING_INK,
  [MUTED]: MUTED_INK,
  [LABEL]: LABEL_INK,
  [SORREL_BRIGHT]: RULE_INK,
};

export function inkOf(colour: string): Cmyk {
  const ink = INKS[colour];
  if (!ink) throw new Error(`No print ink for ${colour}`);
  return ink;
}

// Returns 8-bit CMYK and, separately, the alpha for the image's soft mask.
export function tintPicture(
  rgba: Uint8Array,
  width: number,
  height: number,
): { cmyk: Uint8Array; alpha: Uint8Array } {
  const n = width * height;
  const sum = [0, 0, 0];
  let opaque = 0;
  for (let i = 0; i < n; i += 1) {
    if (rgba[i * 4 + 3] === 0) continue;
    opaque += 1;
    for (let c = 0; c < 3; c += 1) sum[c] += rgba[i * 4 + c];
  }
  const mean = sum.map((v) => v / Math.max(opaque, 1));
  const lum = new Float32Array(n);
  const opaqueLum: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const [r, g, b] = [0, 1, 2].map((c) =>
      clamp(Math.round(mean[c] + (rgba[i * 4 + c] - mean[c]) * CONTRAST + LIFT), 255),
    );
    lum[i] = luminance(r, g, b);
    if (rgba[i * 4 + 3] > 0) opaqueLum.push(lum[i]);
  }
  opaqueLum.sort((a, b) => a - b);
  const lo = opaqueLum[Math.floor(opaqueLum.length * 0.01)] ?? 0;
  const cmyk = new Uint8Array(n * 4);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    // A picture whose 1st percentile is already white prints as the ground throughout.
    const t = lo >= 255 ? 0 : clamp((lum[i] - lo) / (255 - lo), 1);
    for (let c = 0; c < 4; c += 1)
      cmyk[i * 4 + c] = Math.round(
        (GROUND_INK[c] + (PICTURE_LIGHT_INK[c] - GROUND_INK[c]) * t) * 255,
      );
    alpha[i] = rgba[i * 4 + 3];
  }
  return { cmyk, alpha };
}

export function decodePng(png: Uint8Array): { rgba: Uint8Array; width: number; height: number } {
  const image = UPNG.decode(png.slice().buffer);
  return { rgba: new Uint8Array(UPNG.toRGBA8(image)[0]), width: image.width, height: image.height };
}
