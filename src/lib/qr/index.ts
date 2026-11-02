import QRCode from 'qrcode';
import type { QrShapes, RoundedSquare } from './types';

const DOT_RADIUS = 0.42;

function finderAt(x: number, y: number) {
  return {
    outer: { x, y, size: 7, radius: 1.6 },
    inner: { x: x + 1, y: y + 1, size: 5, radius: 1.1 },
    centre: { x: x + 2, y: y + 2, size: 3, radius: 0.7 },
  };
}

// Round dots and rounded finders, shared by the printed card and the two-factor screen.
// `qrcode` supplies the module matrix only, because its own renderers draw square modules.
export function qrShapes(link: string): QrShapes {
  const { modules } = QRCode.create(link, { errorCorrectionLevel: 'L' });
  const { size } = modules;
  const inFinder = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
  const dots: QrShapes['dots'] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (modules.get(row, col) && !inFinder(row, col)) dots.push({ cx: col + 0.5, cy: row + 0.5 });
    }
  }
  return {
    size,
    dotRadius: DOT_RADIUS,
    dots,
    finders: [finderAt(0, 0), finderAt(size - 7, 0), finderAt(0, size - 7)],
  };
}

export function roundedSquarePath({ x, y, size, radius: r }: RoundedSquare): string {
  const right = x + size;
  const bottom = y + size;
  return (
    `M${x + r} ${y}H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}V${bottom - r}` +
    `A${r} ${r} 0 0 1 ${right - r} ${bottom}H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

// The ring is one even-odd path rather than a soot square painted over a chalk one, so the card shows through it.
export function qrSvg(link: string, fill: string): string {
  const { size, dotRadius, dots, finders } = qrShapes(link);
  const parts = finders.flatMap(({ outer, inner, centre }) => [
    `<path data-finder="${outer.x},${outer.y}" fill-rule="evenodd" d="${roundedSquarePath(outer)}${roundedSquarePath(inner)}"/>`,
    `<rect x="${centre.x}" y="${centre.y}" width="${centre.size}" height="${centre.size}" rx="${centre.radius}"/>`,
  ]);
  for (const { cx, cy } of dots) parts.push(`<circle cx="${cx}" cy="${cy}" r="${dotRadius}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="${fill}">${parts.join('')}</svg>`;
}
