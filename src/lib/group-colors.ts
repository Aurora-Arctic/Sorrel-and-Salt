import { MIN_CHIP_CONTRAST, chipContrast } from './contrast';
import type { AreaSpace, GroupColorColumn } from './types';

// A category group's two colours as one family (M5.6b, the owner's call): the
// pair keeps one hue, as every seeded pair does to within a degree, and the
// partner of a colour chosen first is derived from it rather than left to the
// admin to match by eye. The derivation is the seeds' own rule: the hue kept,
// the saturation scaled between the themes as the seeds scale it, 40% on the
// dark card to 55% on the light page on average, and the lightness solved for the
// partner's ground (claude-docs/components/group-form.md, "The pair").

/** The widest gap, in degrees round the wheel, a pair's two hues may keep. */
export const MAX_HUE_DISTANCE = 10;

/**
 * What a derived partner clears on its ground: a tenth over the 4.5:1 floor,
 * so nudging it a shade toward the ground does not trip the check.
 */
export const PAIRED_CONTRAST = 4.6;

/** The seeds' mean saturation on each ground, whose ratio a derived partner keeps. */
const SEED_SATURATION: Record<GroupColorColumn, number> = { colorDark: 0.4, colorLight: 0.55 };

/**
 * A colour's range across its three channels, below which its hue is noise:
 * about thirteen steps of 255.
 */
const ACHROMATIC_CHROMA = 0.05;

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** A `#rrggbb` hex as `[hue in degrees, saturation 0–1, lightness 0–1]`; a grey's hue is 0. */
export function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const chroma = max - min;
  if (chroma === 0) return [0, 0, lightness];
  const saturation = chroma / (1 - Math.abs(2 * lightness - 1));
  const sector =
    max === r ? ((g - b) / chroma) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  return [(sector * 60 + 360) % 360, saturation, lightness];
}

/** Hue, saturation and lightness as a lower-case `#rrggbb` hex. */
export function fromHsl(hue: number, saturation: number, lightness: number): string {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Whether a colour is too near grey for its hue to mean anything. */
export function isAchromatic(hex: string): boolean {
  const values = channels(hex);
  return Math.max(...values) - Math.min(...values) < ACHROMATIC_CHROMA;
}

/** How far apart two colours' hues are, the short way round the wheel, in degrees. */
export function hueDistance(a: string, b: string): number {
  const gap = Math.abs(toHsl(a)[0] - toHsl(b)[0]);
  return Math.min(gap, 360 - gap);
}

/**
 * The partner `column` takes for a colour chosen first: the same hue, the
 * saturation scaled to `column`'s ground as the seeds scale it — none for a
 * grey, which stays grey — and the lightness nearest that ground which still
 * clears PAIRED_CONTRAST on it, so the partner is no further from the ground
 * than it needs to be. Walked in thousandths: the hex rounds, so the ratio is
 * measured on the hex itself.
 */
export function pairedColor(hex: string, column: GroupColorColumn): string {
  const source = hex.toLowerCase();
  const [hue, saturation] = toHsl(source);
  const from = column === 'colorDark' ? 'colorLight' : 'colorDark';
  const scaled = isAchromatic(source)
    ? 0
    : Math.min(1, (saturation * SEED_SATURATION[column]) / SEED_SATURATION[from]);
  // From the ground's side outward: up from black for the dark card, down
  // from white for the light page. The far end, white or black, always clears.
  for (let step = 0; step <= 1000; step += 1) {
    const lightness = column === 'colorDark' ? step / 1000 : 1 - step / 1000;
    const candidate = fromHsl(hue, scaled, lightness);
    if (chipContrast(column, candidate) >= PAIRED_CONTRAST) return candidate;
  }
  return column === 'colorDark' ? '#ffffff' : '#000000';
}

/** A colour of `space` at `hue`, `x` saturation and `y` brightness or lightness, all 0–100, as a hex. */
function areaColor(space: AreaSpace, hue: number, x: number, y: number): string {
  if (space === 'hsl') return fromHsl(hue, x / 100, y / 100);
  // HSB to RGB directly: the picker's own area is HSB, so the maths match it.
  const s = x / 100;
  const v = y / 100;
  const f = (n: number) => {
    const k = (n + hue / 60) % 6;
    const value = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

/**
 * Whether the colour at (`x`, `y`) on the picker's area at `hue` clears 4.5:1 on
 * `column`'s ground: `x` saturation and `y` brightness or lightness, 0–100,
 * as the area lays them out, with y up.
 */
export function passesAt(
  hue: number,
  column: GroupColorColumn,
  space: AreaSpace,
  x: number,
  y: number,
): boolean {
  return chipContrast(column, areaColor(space, hue, x, y)) >= MIN_CHIP_CONTRAST;
}

/**
 * The points across the picker's area at `hue` where a colour's contrast against
 * `column`'s ground crosses the 4.5:1 floor, as [x, y] in a 0–100 box with y
 * down, as the picker places its thumb. One point per two steps of
 * saturation, each found by bisection on the vertical axis: the dark card
 * wants the colour light enough, so the passing side is above the points; the
 * light page wants it dark enough, so below. None where the whole column
 * passes or none of it does.
 */
export function boundaryPoints(
  hue: number,
  column: GroupColorColumn,
  space: AreaSpace,
): [number, number][] {
  const passes = (x: number, y: number) => passesAt(hue, column, space, x, y);
  const points: [number, number][] = [];
  for (let x = 0; x <= 100; x += 2) {
    // Light at the top passes on the dark card; dark at the bottom on the light page.
    const topPasses = passes(x, 100);
    const bottomPasses = passes(x, 0);
    if (topPasses === bottomPasses) continue;
    let pass = topPasses ? 100 : 0;
    let fail = topPasses ? 0 : 100;
    for (let step = 0; step < 12; step += 1) {
      const mid = (pass + fail) / 2;
      if (passes(x, mid)) pass = mid;
      else fail = mid;
    }
    points.push([x, Number((100 - (pass + fail) / 2).toFixed(2))]);
  }
  return points;
}

/**
 * The low-contrast side of the picker's area at `hue` for `column`'s ground,
 * as a polygon in the area's 0–100 box with y down: below the boundary on the
 * dark card, above it on the light page. A column the boundary does not cross
 * is in it whole or not at all, as its colours fail or pass.
 */
export function failingRegion(
  hue: number,
  column: GroupColorColumn,
  space: AreaSpace,
): [number, number][] {
  const crossings = new Map(boundaryPoints(hue, column, space));
  const failsBelow = column === 'colorDark';
  const edge: [number, number][] = [];
  for (let x = 0; x <= 100; x += 2) {
    const y = crossings.get(x);
    if (y !== undefined) edge.push([x, y]);
    else {
      // Uncrossed: one sample says which way the whole column goes.
      const fails = !passesAt(hue, column, space, x, 50);
      edge.push([x, failsBelow ? (fails ? 0 : 100) : fails ? 100 : 0]);
    }
  }
  return failsBelow ? [...edge, [100, 100], [0, 100]] : [[0, 0], [100, 0], ...edge.reverse()];
}

/**
 * Where a label sits inside the low-contrast side of the area at `hue`:
 * across, at the side's own centre of area, kept within the area's middle
 * eight tenths so a centred label stays inside; down, at the middle of the
 * side's stretch in that column (the owner's calls). Where that stretch is
 * too shallow to hold a label, a fifth of the area's height, the nearest
 * column out from there that is deep enough, or else the deepest. In the
 * area's 0–100 box with y down; none when nothing fails.
 */
export function failingLabelPoint(
  hue: number,
  column: GroupColorColumn,
  space: AreaSpace,
): [number, number] | undefined {
  const crossings = new Map(boundaryPoints(hue, column, space));
  const failsBelow = column === 'colorDark';
  const stretch = (x: number) => {
    const crossing = crossings.get(x);
    const edge =
      crossing ??
      (passesAt(hue, column, space, x, 50) ? (failsBelow ? 100 : 0) : failsBelow ? 0 : 100);
    const [from, to] = failsBelow ? [edge, 100] : [0, edge];
    return { depth: to - from, y: (from + to) / 2 };
  };
  // The side's centre of area across, from its columns' depths.
  let weight = 0;
  let moment = 0;
  for (let x = 0; x <= 100; x += 2) {
    const { depth } = stretch(x);
    weight += depth;
    moment += depth * x;
  }
  if (weight === 0) return undefined;
  const centre = Math.min(90, Math.max(10, Math.round(moment / weight / 2) * 2));
  let deepest: { x: number; depth: number; y: number } | undefined;
  for (let offset = 0; offset <= 80; offset += 2) {
    for (const x of offset === 0 ? [centre] : [centre - offset, centre + offset]) {
      if (x < 10 || x > 90) continue;
      const { depth, y } = stretch(x);
      if (depth >= 20) return [x, Number(y.toFixed(2))];
      if (depth > 0 && (!deepest || depth > deepest.depth)) deepest = { x, depth, y };
    }
  }
  return deepest && [deepest.x, Number(deepest.y.toFixed(2))];
}

/** The boundary as an SVG path over the area, in its 0–100 box; empty with no crossing. */
export function contrastBoundary(hue: number, column: GroupColorColumn, space: AreaSpace): string {
  const points = boundaryPoints(hue, column, space);
  return points.length ? `M ${points.map(([x, y]) => `${x} ${y.toFixed(2)}`).join(' L ')}` : '';
}
