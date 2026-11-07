import * as fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { renderBusinessCards } from '@/lib/business-cards/pdf';
import {
  GROUND_INK,
  HEADING_INK,
  LABEL_INK,
  MUTED_INK,
  RULE_INK,
} from '@/lib/invitation-cards/inks';
import { textWidth } from '@/lib/invitation-cards/text';
import {
  assets,
  BLOCK,
  CARD,
  boxOf,
  cell,
  drawn,
  LETTER,
  overlaps,
  pictures,
  read,
} from '../../support/card-sheet-pdf';

const DETAILS = { name: 'Testwort Hollin', email: 'testwort@example.test', phone: '555.010.0199' };

async function build(backs: boolean, details = DETAILS) {
  return PDFDocument.load(await renderBusinessCards({ ...details, backs }, assets));
}

const same = (a: number[], b: readonly number[]) =>
  a.length === 4 && a.every((v, i) => Math.abs(v - b[i]) < 1e-4);
const insideBlock = (box: ReturnType<typeof boxOf>) => overlaps(box, BLOCK);

describe('the business cards PDF', () => {
  let fronts: PDFDocument;
  let both: PDFDocument;
  beforeAll(async () => {
    [fronts, both] = await Promise.all([build(false), build(true)]);
  });

  it('gives one Letter page of ten fronts, or a second page of ten backs when backs are included', () => {
    expect(fronts.getPageCount()).toBe(1);
    expect(both.getPageCount()).toBe(2);
    for (const doc of [fronts, both])
      for (const page of doc.getPages()) expect(page.getSize()).toEqual(LETTER);
    expect(pictures(fronts, 0, 'salt')).toHaveLength(10);
    expect(pictures(fronts, 0, 'sorrel')).toHaveLength(0);
    expect(pictures(both, 1, 'sorrel')).toHaveLength(10);
  });

  it('fills, and clips to, the block of ten cards with 1/8 in of bleed', () => {
    for (let i = 0; i < both.getPageCount(); i += 1) {
      const page = drawn(both, i);
      expect(page.fills[0]).toEqual(BLOCK);
      expect(page.clips).toEqual([BLOCK]);
      expect(BLOCK.right - BLOCK.left).toBe(2 * CARD.across + 2 * 9);
      expect(BLOCK.top - BLOCK.bottom).toBe(5 * CARD.up + 2 * 9);
    }
  });

  it('draws a crop mark at both ends of every cut line, outside the block', () => {
    const cutsX = [0, 1, 2].map((k) => BLOCK.left + 9 + CARD.across * k);
    const cutsY = [0, 1, 2, 3, 4, 5].map((k) => BLOCK.bottom + 9 + CARD.up * k);
    for (let i = 0; i < both.getPageCount(); i += 1) {
      const marks = drawn(both, i).strokes.filter(
        ({ from, to }) => !insideBlock(boxOf([from, to])),
      );
      expect(marks).toHaveLength(18);
      for (const x of cutsX)
        expect(marks.filter(({ from, to }) => from[0] === x && to[0] === x)).toHaveLength(2);
      for (const y of cutsY)
        expect(marks.filter(({ from, to }) => from[1] === y && to[1] === y)).toHaveLength(2);
    }
  });

  it('puts each back behind its front when the sheet is turned over its long edge', () => {
    const front = pictures(both, 0, 'salt').map(cell);
    const backs = pictures(both, 1, 'sorrel').map((box) =>
      cell({ ...box, left: LETTER.width - box.right, right: LETTER.width - box.left }),
    );
    expect(new Set(front).size).toBe(10);
    expect(backs.sort()).toEqual(front.sort());
  });

  it("draws each card's rule under its name, as long as the name is wide", () => {
    const cormorant = fontkit.create(read('fonts/cormorant-unicase-600.ttf'));
    // The name is set at 15 pt; the page's points are the artboard's pixels scaled by 72/192.
    const width = textWidth({ font: cormorant, size: 15 }, DETAILS.name);
    const rules = drawn(both, 0).strokes.filter(({ from, to }) => insideBlock(boxOf([from, to])));
    expect(rules).toHaveLength(10);
    for (const { from, to } of rules) {
      expect(from[1]).toBeCloseTo(to[1], 6);
      expect(Math.abs(to[0] - from[0])).toBeCloseTo(width, 4);
    }
  });
});

describe("the business cards PDF's inks", () => {
  let both: PDFDocument;
  beforeAll(async () => {
    both = await build(true);
  });

  it('paints every fill and stroke in DeviceCMYK, and nothing in RGB, grey or a named colour space', () => {
    for (let i = 0; i < both.getPageCount(); i += 1) {
      const { operators } = drawn(both, i);
      expect(operators.has('k')).toBe(true);
      expect(operators.has('K')).toBe(true);
      for (const op of ['rg', 'RG', 'g', 'G', 'sc', 'SC', 'scn', 'SCN', 'cs', 'CS'])
        expect(operators.has(op), `page ${i} uses ${op}`).toBe(false);
    }
  });

  it('fills the block with the ground ink and writes in the heading, muted and label inks', () => {
    for (let i = 0; i < both.getPageCount(); i += 1) {
      const { fillInks, textInks } = drawn(both, i);
      expect(same(fillInks[0], GROUND_INK)).toBe(true);
      expect(same(textInks[textInks.length - 1], LABEL_INK)).toBe(true);
      for (const ink of textInks.slice(0, -1))
        expect(same(ink, HEADING_INK) || same(ink, MUTED_INK), `page ${i}: ${ink}`).toBe(true);
    }
  });

  it("draws the rules in the site's bright sorrel green, and the crop marks in black", () => {
    const { strokes, strokeInks } = drawn(both, 0);
    strokes.forEach(({ from, to }, i) => {
      const ink = insideBlock(boxOf([from, to])) ? RULE_INK : [0, 0, 0, 1];
      expect(same(strokeInks[i], ink), `stroke ${i}: ${strokeInks[i]}`).toBe(true);
    });
  });
});
