import type { JarPart, JarShape, JarShapeName } from './types';

// The vessels, each drawn in a 48 by 40 box, as data so a test can read it and the drawing is plain
// SVG elements (claude-docs/components/jar-shelf.md).

const lid = (
  el: JarPart['el'],
  attrs: JarPart['attrs'],
  paint: JarPart['paint'] = 'lid',
): JarPart => ({
  el,
  paint,
  attrs,
});

export const SHAPES: Readonly<Record<JarShapeName, JarShape>> = {
  hex: {
    full: 13.5,
    sx: 8,
    ex: 40,
    shaded: true,
    wave: [8, 1.4],
    lid: [lid('rect', { x: 14, y: 3, width: 20, height: 6, rx: 1.5 })],
    body: 'M16 9h16l8 6v19a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V15z',
    extra: [lid('path', { d: 'M16 9v31M32 9v31' }, 'facet')],
  },
  mason: {
    full: 13,
    wave: [6, 1.2],
    lid: [
      lid('rect', { x: 13, y: 2, width: 22, height: 5, rx: 1.5 }),
      lid('rect', { x: 11, y: 7, width: 26, height: 4, rx: 1 }),
    ],
    body: 'M12 11h24v23a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z',
  },
  apoth: {
    full: 18,
    wave: [9, 1.5],
    lid: [
      lid('circle', { cx: 24, cy: 3, r: 1.8 }),
      lid('path', { d: 'M17 12v-1a7 6 0 0 1 14 0v1' }),
      lid('rect', { x: 15.5, y: 12, width: 17, height: 2.5, rx: 1 }),
    ],
    body: 'M17 14.5A16 13 0 1 0 31 14.5z',
  },
  cork: {
    full: 12,
    wave: [7, 1.3],
    lid: [lid('rect', { x: 17, y: 2, width: 14, height: 8, rx: 2 })],
    body: 'M10 10h28l-2 25a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z',
  },
  clip: {
    full: 12,
    wave: [6, 1.2],
    lid: [
      lid('rect', { x: 11, y: 4, width: 26, height: 6, rx: 2 }),
      lid('path', { d: 'M11 7H8v6M37 7h3v6' }),
    ],
    body: 'M12 10h24v24a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z',
  },
  honey: {
    full: 15,
    wave: [10, 1.5],
    lid: [
      lid('circle', { cx: 24, cy: 3, r: 2 }),
      lid('rect', { x: 14, y: 5, width: 20, height: 5, rx: 2.5 }),
    ],
    body: 'M16 10h16v3q10 2 10 12v5a10 10 0 0 1-10 10H16a10 10 0 0 1-10-10v-5q0-10 10-12z',
  },
  // A conical flask: narrow neck, straight sides, flat base.
  erlen: {
    full: 19,
    sx: 12,
    ex: 36,
    wave: [12, 1.6],
    lid: [lid('path', { d: 'M19 4h10' })],
    body: 'M21 4v9L9.6 33.2A3 3 0 0 0 12.2 38h23.6a3 3 0 0 0 2.6-4.8L27 13V4z',
    open: true,
  },
  // The two from the In Your Cupboard shelf icon.
  bottle: {
    full: 14,
    sx: 14,
    ex: 34,
    wave: [5, 1.4],
    lid: [
      lid('path', { d: 'M19.5 10 19 3.5Q19 2 20.5 2h7Q29 2 29 3.5L28.5 10Z' }, 'cork'),
      lid('path', { d: 'M18.5 8h11' }),
    ],
    body: 'M20 8v5q-6 2-6 7v14a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V20q0-5-6-7V8z',
    open: true,
  },
  flask: {
    full: 16,
    sx: 11,
    ex: 37,
    wave: [7, 1.4],
    lid: [lid('path', { d: 'M19 4h10' })],
    body: 'M21 4v10A13 13 0 1 0 27 14V4z',
    open: true,
  },
  // The Add Stock jar: a cloth cap tied over the rim.
  cloth: {
    full: 23,
    sx: 13,
    ex: 35,
    wave: [11, 1.1],
    lid: [
      lid(
        'path',
        {
          d: 'M14 12V9q0-3 3-3h14q3 0 3 3v3l2.5 7q-3.125 2-6.25 0t-6.25 0-6.25 0-6.25 0l2.5-7z',
        },
        'cloth',
      ),
      lid('path', {
        d: 'M14 12V9q0-3 3-3h14q3 0 3 3v3M13.5 12h21M14 12l-2.5 7M34 12l2.5 7M11.5 19q3.125 2 6.25 0t6.25 0 6.25 0 6.25 0',
      }),
    ],
    body: 'M13 21v13a6 6 0 0 0 6 6h10a6 6 0 0 0 6-6V21z',
    open: true,
  },
  // A corked vial.
  vial: {
    full: 11,
    sx: 19,
    ex: 29,
    wave: [6, 0.9],
    lid: [
      lid('path', { d: 'M19.5 8 19.2 3Q19.2 1.5 20.7 1.5h6.6Q28.8 1.5 28.8 3L28.5 8Z' }, 'cork'),
      lid('path', { d: 'M17.5 8h13' }),
    ],
    body: 'M19 8v25a5 5 0 0 0 10 0V8z',
    open: true,
  },
};

/** Where a jar of solids is drawn from. */
export const JARS: readonly JarShapeName[] = [
  'hex',
  'mason',
  'apoth',
  'cork',
  'clip',
  'honey',
  'cloth',
];

/** Where a liquid's vessel is drawn from. */
export const BOTTLES: readonly JarShapeName[] = ['bottle', 'flask', 'erlen', 'vial'];

/** A wave of period `p` and amplitude `a`, drawn one period past each side of the glass, so it could slide and still cover the body. */
export function wv(p: number, a: number): string {
  let d = `M${-p} 0q${p / 4} ${-a} ${p / 2} 0`;
  for (let x = -p / 2; x < 48 + p; x += p / 2) d += `t${p / 2} 0`;
  return d;
}

/** The level's Y for a vessel filled to `frac` of full, rounded to a tenth. */
export function lv(shape: JarShapeName, frac: number): number {
  return +(40 - (40 - SHAPES[shape].full) * frac).toFixed(1);
}
