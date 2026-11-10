import type { Font } from '@pdf-lib/fontkit';
import { qrShapes } from '../qr';
import type { RoundedSquare } from '../qr/types';
import {
  type CardFonts,
  type QrItem,
  SHADOW_OPACITY,
  SHADOW_RADIUS,
  type TextItem,
} from './layout';

// The mask's pixels per artboard px, 240 to the inch, finer than the salt picture's 234.
const MASK_SCALE = 1.25;
// Rows are sampled four times each; columns get each span's exact width.
const SUBROWS = 4;
const CURVE_STEPS = 8;
const DOT_SIDES = 16;
const CORNER_STEPS = 6;

// fontkit draws each outline from these commands, in font units with y up; its typings leave them out.
interface PathCommands {
  commands: { command: string; args: number[] }[];
}

type Polygon = number[];
/** One shape's outlines, filled together under the nonzero rule, so a ring's reversed inner outline is its hole. */
type Shape = Polygon[];

export interface CodeShadows {
  x: number;
  y: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  coverage(link: string): Float32Array;
  mask(link: string): Uint8Array;
}

// The words are the same on every card, so they are traced once and each card's code is added.
export function codeShadows(fonts: CardFonts, column: TextItem[], code: QrItem): CodeShadows {
  const sigma = (SHADOW_RADIUS / 2) * MASK_SCALE;
  const pad = Math.ceil(3 * sigma) + 2;
  const words = column.flatMap((item) => textShapes(fonts[item.font], item));
  const points = [...words.flat(2), code.x, code.y, code.x + code.size, code.y + code.size];
  const xs = points.filter((_, i) => i % 2 === 0);
  const ys = points.filter((_, i) => i % 2 === 1);
  const left = Math.floor(Math.min(...xs) * MASK_SCALE) - pad;
  const top = Math.floor(Math.min(...ys) * MASK_SCALE) - pad;
  const columns = Math.ceil(Math.max(...xs) * MASK_SCALE) + pad - left;
  const rows = Math.ceil(Math.max(...ys) * MASK_SCALE) + pad - top;
  const grid = { left, top, columns, rows };
  const wordCoverage = new Float32Array(columns * rows);
  for (const shape of words) fillShape(wordCoverage, grid, shape);

  const coverage = (link: string) => {
    const out = wordCoverage.slice();
    for (const shape of codeShapes(link, code)) fillShape(out, grid, shape);
    for (let i = 0; i < out.length; i += 1) if (out[i] > 1) out[i] = 1;
    return out;
  };
  return {
    x: left / MASK_SCALE,
    y: top / MASK_SCALE,
    width: columns / MASK_SCALE,
    height: rows / MASK_SCALE,
    columns,
    rows,
    coverage,
    mask(link) {
      const blurred = gaussianBlur(coverage(link), columns, rows, sigma);
      let peak = 0;
      for (const v of blurred) if (v > peak) peak = v;
      const scale = (Math.round(SHADOW_OPACITY * 255) / peak) * (1 - 1e-9);
      const out = new Uint8Array(blurred.length);
      // A blurred tail below half a step rounds to nothing, so the mask's edges are clear.
      for (let i = 0; i < out.length; i += 1) out[i] = Math.round(blurred[i] * scale);
      return out;
    },
  };
}

// Each glyph is its own shape, so its counters stay open under the nonzero rule; neighbouring glyphs are added.
function textShapes(font: Font, item: TextItem): Shape[] {
  const scale = item.size / font.unitsPerEm;
  const run = font.layout(item.text);
  const shapes: Shape[] = [];
  let pen = item.x;
  run.glyphs.forEach((glyph, i) => {
    const { xAdvance, xOffset, yOffset } = run.positions[i];
    const ox = pen + xOffset * scale;
    const oy = item.baseline - yOffset * scale;
    const at = (x: number, y: number): [number, number] => [ox + x * scale, oy - y * scale];
    const shape: Shape = [];
    let polygon: Polygon = [];
    let cx = 0;
    let cy = 0;
    const close = () => {
      if (polygon.length >= 6) shape.push(polygon);
      polygon = [];
    };
    for (const { command, args } of (glyph.path as unknown as PathCommands).commands) {
      if (command === 'moveTo') {
        close();
        [cx, cy] = args;
        polygon.push(...at(cx, cy));
      } else if (command === 'lineTo') {
        [cx, cy] = args;
        polygon.push(...at(cx, cy));
      } else if (command === 'quadraticCurveTo') {
        const [qx, qy, x, y] = args;
        for (let s = 1; s <= CURVE_STEPS; s += 1) {
          const t = s / CURVE_STEPS;
          const u = 1 - t;
          polygon.push(
            ...at(u * u * cx + 2 * u * t * qx + t * t * x, u * u * cy + 2 * u * t * qy + t * t * y),
          );
        }
        [cx, cy] = [x, y];
      } else if (command === 'bezierCurveTo') {
        const [ax, ay, bx, by, x, y] = args;
        for (let s = 1; s <= CURVE_STEPS; s += 1) {
          const t = s / CURVE_STEPS;
          const u = 1 - t;
          polygon.push(
            ...at(
              u * u * u * cx + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x,
              u * u * u * cy + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y,
            ),
          );
        }
        [cx, cy] = [x, y];
      } else if (command === 'closePath') close();
    }
    close();
    if (shape.length) shapes.push(shape);
    pen += xAdvance * scale + item.letterSpacing;
  });
  return shapes;
}

function codeShapes(link: string, code: QrItem): Shape[] {
  const { size, dotRadius, dots, finders } = qrShapes(link);
  const module = code.size / size;
  const toArtboard = (polygon: Polygon) =>
    polygon.map((v, i) => (i % 2 === 0 ? code.x : code.y) + v * module);
  const shapes: Shape[] = [];
  for (const { outer, inner, centre } of finders) {
    shapes.push([roundedSquare(outer), reversed(roundedSquare(inner))].map(toArtboard));
    shapes.push([toArtboard(roundedSquare(centre))]);
  }
  for (const { cx, cy } of dots) {
    const polygon: Polygon = [];
    for (let s = 0; s < DOT_SIDES; s += 1) {
      const a = (s / DOT_SIDES) * 2 * Math.PI;
      polygon.push(cx + dotRadius * Math.cos(a), cy + dotRadius * Math.sin(a));
    }
    shapes.push([toArtboard(polygon)]);
  }
  return shapes;
}

function roundedSquare({ x, y, size, radius: r }: RoundedSquare): Polygon {
  const corners = [
    [x + size - r, y + r, -Math.PI / 2],
    [x + size - r, y + size - r, 0],
    [x + r, y + size - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  const polygon: Polygon = [];
  for (const [cx, cy, start] of corners)
    for (let s = 0; s <= CORNER_STEPS; s += 1) {
      const a = start + (s / CORNER_STEPS) * (Math.PI / 2);
      polygon.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  return polygon;
}

function reversed(polygon: Polygon): Polygon {
  const out: Polygon = [];
  for (let i = polygon.length - 2; i >= 0; i -= 2) out.push(polygon[i], polygon[i + 1]);
  return out;
}

interface Grid {
  left: number;
  top: number;
  columns: number;
  rows: number;
}

function fillShape(coverage: Float32Array, grid: Grid, shape: Shape) {
  const edges: { x0: number; y0: number; x1: number; y1: number; dir: number }[] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (const polygon of shape) {
    const n = polygon.length / 2;
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const ax = polygon[i * 2] * MASK_SCALE - grid.left;
      const ay = polygon[i * 2 + 1] * MASK_SCALE - grid.top;
      const bx = polygon[j * 2] * MASK_SCALE - grid.left;
      const by = polygon[j * 2 + 1] * MASK_SCALE - grid.top;
      if (ay === by) continue;
      edges.push(
        ay < by
          ? { x0: ax, y0: ay, x1: bx, y1: by, dir: 1 }
          : { x0: bx, y0: by, x1: ax, y1: ay, dir: -1 },
      );
      minY = Math.min(minY, ay, by);
      maxY = Math.max(maxY, ay, by);
    }
  }
  const firstRow = Math.max(0, Math.floor(minY));
  const lastRow = Math.min(grid.rows - 1, Math.ceil(maxY));
  const crossings: [number, number][] = [];
  for (let row = firstRow; row <= lastRow; row += 1)
    for (let s = 0; s < SUBROWS; s += 1) {
      const y = row + (s + 0.5) / SUBROWS;
      crossings.length = 0;
      for (const e of edges)
        if (y >= e.y0 && y < e.y1)
          crossings.push([e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), e.dir]);
      crossings.sort((a, b) => a[0] - b[0]);
      let winding = 0;
      let start = 0;
      for (const [x, dir] of crossings) {
        if (winding === 0) start = x;
        winding += dir;
        if (winding === 0) addSpan(coverage, grid, row, start, x, 1 / SUBROWS);
      }
    }
}

function addSpan(
  coverage: Float32Array,
  grid: Grid,
  row: number,
  from: number,
  to: number,
  weight: number,
) {
  const x0 = Math.max(0, from);
  const x1 = Math.min(grid.columns, to);
  if (x1 <= x0) return;
  const base = row * grid.columns;
  const c0 = Math.floor(x0);
  const c1 = Math.floor(x1);
  if (c0 === c1) {
    coverage[base + c0] += (x1 - x0) * weight;
    return;
  }
  coverage[base + c0] += (c0 + 1 - x0) * weight;
  for (let c = c0 + 1; c < c1; c += 1) coverage[base + c] += weight;
  if (c1 < grid.columns) coverage[base + c1] += (x1 - c1) * weight;
}

function gaussianBlur(values: Float32Array, columns: number, rows: number, sigma: number) {
  const boxes = boxSizes(sigma, 3);
  let a = Float32Array.from(values);
  let b = new Float32Array(values.length);
  for (const size of boxes) {
    boxPass(a, b, columns, rows, (size - 1) / 2, 1, columns);
    [a, b] = [b, a];
    boxPass(a, b, rows, columns, (size - 1) / 2, columns, 1);
    [a, b] = [b, a];
  }
  return a;
}

// The odd box widths whose three passes give the deviation, after Kovesi's "Fast almost-Gaussian filtering".
function boxSizes(sigma: number, n: number): number[] {
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower -= 1;
  const upper = lower + 2;
  const m = Math.round(
    (12 * sigma * sigma - n * lower * lower - 4 * n * lower - 3 * n) / (-4 * lower - 4),
  );
  return Array.from({ length: n }, (_, i) => (i < m ? lower : upper));
}

// Samples past the ends count as nothing, so the blur fades out rather than piling up at the grid's edge.
function boxPass(
  from: Float32Array,
  to: Float32Array,
  length: number,
  lines: number,
  radius: number,
  step: number,
  stride: number,
) {
  const width = 2 * radius + 1;
  for (let line = 0; line < lines; line += 1) {
    const base = line * stride;
    let sum = 0;
    for (let i = 0; i < Math.min(radius, length); i += 1) sum += from[base + i * step];
    for (let i = 0; i < length; i += 1) {
      const enter = i + radius;
      const leave = i - radius - 1;
      if (enter < length) sum += from[base + enter * step];
      if (leave >= 0) sum -= from[base + leave * step];
      to[base + i * step] = sum / width;
    }
  }
}
