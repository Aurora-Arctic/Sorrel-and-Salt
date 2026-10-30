import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { cardQrSvg } from '@/lib/invitation-cards';

// A realistic card link: the short `/i/` route and a 16-character token from the
// card alphabet (letters and digits without 0, O, 1, l and I).
const LINK = 'https://sorrelandsalt.com/i/Hk7pQ2xRm9TbWz4N';

function inFinder(row: number, col: number, size: number): boolean {
  const near = (n: number) => n < 7;
  const far = (n: number) => n >= size - 7;
  return (near(row) && near(col)) || (near(row) && far(col)) || (far(row) && near(col));
}

function dotCentres(svg: string): Set<string> {
  const centres = new Set<string>();
  for (const match of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
    expect(match[3]).toBe('0.42');
    centres.add(`${Number(match[2]) - 0.5},${Number(match[1]) - 0.5}`);
  }
  return centres;
}

describe('cardQrSvg', () => {
  it('encodes the card link at error correction L in a 29 × 29 grid', () => {
    const qr = QRCode.create(LINK, { errorCorrectionLevel: 'L' });
    expect(qr.modules.size).toBe(29);
    expect(cardQrSvg(LINK)).toContain('viewBox="0 0 29 29"');
  });

  it('draws a dot for every dark module outside the finders and nowhere else', () => {
    const { modules } = QRCode.create(LINK, { errorCorrectionLevel: 'L' });
    const expected = new Set<string>();
    for (let row = 0; row < modules.size; row += 1) {
      for (let col = 0; col < modules.size; col += 1) {
        if (modules.get(row, col) && !inFinder(row, col, modules.size))
          expected.add(`${row},${col}`);
      }
    }
    expect(expected.size).toBeGreaterThan(100);
    expect(dotCentres(cardQrSvg(LINK))).toEqual(expected);
  });

  it('draws the three finders as rounded squares in muted chalk, with a see-through ring and no background', () => {
    const svg = cardQrSvg(LINK);
    for (const [x, y] of [
      [0, 0],
      [22, 0],
      [0, 22],
    ]) {
      expect(svg).toContain(`<path data-finder="${x},${y}" fill-rule="evenodd"`);
      expect(svg).toContain(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.7"`);
    }
    expect(svg).toContain('fill="#c0baac"');
    expect(svg).not.toMatch(/#14120e|#fff|white|#000/i);
  });
});
