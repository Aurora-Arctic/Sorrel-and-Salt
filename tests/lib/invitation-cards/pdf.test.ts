import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from '@pdf-lib/fontkit';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
} from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import UPNG from '@pdf-lib/upng';
import { FRONT_COPY } from '@/lib/invitation-cards/copy';
import {
  GROUND_INK,
  HEADING_INK,
  LABEL_INK,
  MUTED_INK,
  PICTURE_LIGHT_INK,
  tintPicture,
} from '@/lib/invitation-cards/inks';
import { renderCardSheets } from '@/lib/invitation-cards/pdf';
import type { CardAssets } from '@/lib/invitation-cards/types';

const PUBLIC = path.join(process.cwd(), 'public/invitation-cards');
const read = (file: string) => new Uint8Array(readFileSync(path.join(PUBLIC, file)));
const assets: CardAssets = {
  salt: read('salt.png'),
  sorrel: read('sorrel.png'),
  cormorant600: read('fonts/cormorant-unicase-600.ttf'),
  lexend300: read('fonts/lexend-300.ttf'),
  lexend400: read('fonts/lexend-400.ttf'),
  lexend500: read('fonts/lexend-500.ttf'),
};
const EXPIRES = new Date('2027-04-01T12:00:00Z');
const links = (n: number) =>
  Array.from(
    { length: n },
    (_, i) => `https://sorrelandsalt.com/i/card${String(i).padStart(12, '0')}`,
  );

// Letter, and the block of twelve cards with bleed on the portrait page: 8.25 × 10.75 in, 1/8 in from every edge.
const LETTER = { width: 612, height: 792 };
const BLOCK = { left: 9, right: 603, bottom: 9, top: 783 };
// A card's trim on the page: the frame turns a quarter, so its 2 in height runs across the page and its 3.5 in width up it.
const CARD = { across: 144, up: 252 };

interface Box {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
type Matrix = [number, number, number, number, number, number];

// Just enough of a content-stream reader to follow the transforms and see what each page draws, in page points.
type Vector = [number, number];

interface Drawn {
  fills: Box[];
  clips: Box[];
  strokes: { from: [number, number]; to: [number, number] }[];
  // up and right are the directions, on the page, of the image's top and of its right-hand side.
  images: { name: string; box: Box; up: Vector; right: Vector }[];
  textRuns: number;
  /** Every operator the page uses, so a test can see which colour spaces it paints in. */
  operators: Set<string>;
  /** The CMYK fill in force at each rectangle in `fills`, at each other filled path, and at each text run. */
  fillInks: number[][];
  pathInks: number[][];
  textInks: number[][];
}

function multiply([a, b, c, d, e, f]: Matrix, [A, B, C, D, E, F]: Matrix): Matrix {
  return [
    a * A + b * C,
    a * B + b * D,
    c * A + d * C,
    c * B + d * D,
    e * A + f * C + E,
    e * B + f * D + F,
  ];
}
const apply = ([a, b, c, d, e, f]: Matrix, x: number, y: number): [number, number] => [
  a * x + c * y + e,
  b * x + d * y + f,
];
const boxOf = (points: [number, number][]): Box => ({
  left: Math.min(...points.map((p) => p[0])),
  right: Math.max(...points.map((p) => p[0])),
  bottom: Math.min(...points.map((p) => p[1])),
  top: Math.max(...points.map((p) => p[1])),
});

function tokens(source: string): string[] {
  return source.match(/<[0-9a-fA-F]*>|\/[^\s/[\]<>()]+|\[|\]|[^\s/[\]<>()]+/g) ?? [];
}

function contents(doc: PDFDocument, pageIndex: number): string {
  const page = doc.getPage(pageIndex);
  const value = page.node.Contents();
  const refs = value instanceof PDFArray ? value.asArray() : [value];
  return refs
    .map((ref) => {
      const stream = doc.context.lookup(ref as PDFRef) as PDFRawStream;
      return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    })
    .join('\n');
}

function drawn(doc: PDFDocument, pageIndex: number): Drawn {
  const result: Drawn = {
    fills: [],
    clips: [],
    strokes: [],
    images: [],
    textRuns: 0,
    operators: new Set(),
    fillInks: [],
    pathInks: [],
    textInks: [],
  };
  let ink: number[] = [];
  const inks: number[][] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const saved: Matrix[] = [];
  let operands: string[] = [];
  let path: [number, number][][] = [];
  let pendingClip = false;
  const num = (i: number) => Number(operands[operands.length - i]);
  for (const token of tokens(contents(doc, pageIndex))) {
    if (/^[a-zA-Z*'"]+$/.test(token) && !/^\d/.test(token)) {
      result.operators.add(token);
      switch (token) {
        case 'q':
          saved.push(ctm);
          inks.push(ink);
          break;
        case 'Q':
          ctm = saved.pop() ?? ctm;
          ink = inks.pop() ?? ink;
          break;
        case 'k':
          ink = [num(4), num(3), num(2), num(1)];
          break;
        case 'cm':
          ctm = multiply([num(6), num(5), num(4), num(3), num(2), num(1)], ctm);
          break;
        case 're': {
          const [x, y, w, h] = [num(4), num(3), num(2), num(1)];
          path.push([
            apply(ctm, x, y),
            apply(ctm, x + w, y),
            apply(ctm, x + w, y + h),
            apply(ctm, x, y + h),
          ]);
          break;
        }
        case 'm':
          path.push([apply(ctm, num(2), num(1))]);
          break;
        case 'l':
          path[path.length - 1]?.push(apply(ctm, num(2), num(1)));
          break;
        case 'c':
          path[path.length - 1]?.push(apply(ctm, num(2), num(1)));
          break;
        case 'W':
          pendingClip = true;
          break;
        case 'n':
          if (pendingClip) result.clips.push(boxOf(path.flat()));
          pendingClip = false;
          path = [];
          break;
        case 'f':
        case 'f*':
          if (path.length === 1 && path[0].length === 4) {
            result.fills.push(boxOf(path[0]));
            result.fillInks.push(ink);
          } else result.pathInks.push(ink);
          path = [];
          break;
        case 'S':
          for (const sub of path) result.strokes.push({ from: sub[0], to: sub[1] });
          path = [];
          break;
        case 'Do':
          result.images.push({
            name: operands[operands.length - 1].slice(1),
            box: boxOf([apply(ctm, 0, 0), apply(ctm, 1, 0), apply(ctm, 0, 1), apply(ctm, 1, 1)]),
            up: [Math.sign(ctm[2]) + 0, Math.sign(ctm[3]) + 0],
            right: [Math.sign(ctm[0]) + 0, Math.sign(ctm[1]) + 0],
          });
          break;
        case 'TJ':
          result.textRuns += 1;
          result.textInks.push(ink);
          break;
      }
      operands = [];
    } else {
      operands.push(token);
    }
  }
  return result;
}

/** Which picture each of a page's image names draws, told apart by the baked files' pixel widths. */
function imageNames(doc: PDFDocument, pageIndex: number): Record<string, 'salt' | 'sorrel'> {
  const xObjects = doc.getPage(pageIndex).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
  const names: Record<string, 'salt' | 'sorrel'> = {};
  for (const [name, ref] of xObjects.entries()) {
    const image = doc.context.lookup(ref) as PDFRawStream;
    const width = image.dict.lookup(PDFName.of('Width'), PDFNumber).asNumber();
    names[name.decodeText()] = width === 440 ? 'salt' : 'sorrel';
  }
  return names;
}

function pictures(doc: PDFDocument, pageIndex: number, picture: 'salt' | 'sorrel'): Box[] {
  const names = imageNames(doc, pageIndex);
  return drawn(doc, pageIndex)
    .images.filter((image) => names[image.name] === picture)
    .map((image) => image.box);
}

// The cell of the 3 × 3 block a picture's centre falls in, counted across and up the portrait page.
function cell({ left, right, bottom, top }: Box): string {
  const x = (left + right) / 2;
  const y = (bottom + top) / 2;
  return `${Math.floor((x - BLOCK.left - 9) / CARD.across)},${Math.floor((y - BLOCK.bottom - 9) / CARD.up)}`;
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;

async function build(n: number) {
  const bytes = await renderCardSheets(
    { links: links(n), batch: 'b4444444', expiresAt: EXPIRES },
    assets,
  );
  return { bytes, doc: await PDFDocument.load(bytes) };
}

describe('the card sheets PDF', () => {
  let twelve: PDFDocument;
  let twelveBytes: Uint8Array;
  beforeAll(async () => {
    ({ doc: twelve, bytes: twelveBytes } = await build(12));
  });

  it.each([
    [1, 2],
    [12, 2],
    [13, 4],
    [24, 4],
    [25, 6],
  ])(
    'gives %i cards %i Letter pages: per sheet of twelve, the fronts then the backs',
    async (n, pages) => {
      const { doc } = await build(n);
      expect(doc.getPageCount()).toBe(pages);
      for (const page of doc.getPages()) expect(page.getSize()).toEqual(LETTER);
      const fronts = doc
        .getPages()
        .flatMap((_, i) => (i % 2 === 0 ? pictures(doc, i, 'salt') : []));
      const backs = doc
        .getPages()
        .flatMap((_, i) => (i % 2 === 1 ? pictures(doc, i, 'sorrel') : []));
      expect(fronts).toHaveLength(n);
      expect(backs).toHaveLength(n);
    },
  );

  it.each([
    [12, 1],
    [13, 2],
    [25, 3],
  ])('gives %i cards %i pages of fronts alone when the backs are left out', async (n, pages) => {
    const bytes = await renderCardSheets(
      { links: links(n), batch: 'b4444444', expiresAt: EXPIRES, backs: false },
      assets,
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(pages);
    expect(doc.getPages().flatMap((_, i) => pictures(doc, i, 'sorrel'))).toHaveLength(0);
    expect(doc.getPages().flatMap((_, i) => pictures(doc, i, 'salt'))).toHaveLength(n);
  });

  it('fills, and clips to, an 8.25 × 10.75 in block 1/8 in from every edge of each page', () => {
    for (let i = 0; i < twelve.getPageCount(); i += 1) {
      const page = drawn(twelve, i);
      expect(page.fills[0]).toEqual(BLOCK);
      expect(page.clips).toEqual([BLOCK]);
      expect((BLOCK.right - BLOCK.left) / 72).toBe(8.25);
      expect((BLOCK.top - BLOCK.bottom) / 72).toBe(10.75);
      expect(BLOCK.left).toBe(LETTER.width - BLOCK.right);
      expect(BLOCK.bottom).toBe(LETTER.height - BLOCK.top);
      expect(BLOCK.bottom).toBe(9);
      expect(BLOCK.left).toBe(9);
    }
  });

  it('draws 18 crop marks per page, each on a cut line, 2.25 pt clear of the block and 6 pt long', () => {
    // The cuts run 1/8 in inside the block's edge and every card's height or width apart.
    const cutsX = [0, 1, 2, 3, 4].map((k) => BLOCK.left + 9 + CARD.across * k);
    const cutsY = [0, 1, 2, 3].map((k) => BLOCK.bottom + 9 + CARD.up * k);
    for (let i = 0; i < twelve.getPageCount(); i += 1) {
      const marks = drawn(twelve, i).strokes;
      expect(marks).toHaveLength(18);
      // Each cut line has a mark at both ends: four lines one way and five the other.
      expect(marks.filter(({ from, to }) => from[0] === to[0])).toHaveLength(10);
      expect(marks.filter(({ from, to }) => from[1] === to[1])).toHaveLength(8);
      for (const { from, to } of marks) {
        const box = boxOf([from, to]);
        expect(Math.hypot(to[0] - from[0], to[1] - from[1])).toBeCloseTo(6);
        const gap = Math.max(
          BLOCK.left - box.right,
          box.left - BLOCK.right,
          BLOCK.bottom - box.top,
          box.bottom - BLOCK.top,
        );
        expect(gap).toBeCloseTo(2.25);
        expect(
          overlaps(
            {
              ...box,
              right: box.right + 0.375,
              top: box.top + 0.375,
              left: box.left - 0.375,
              bottom: box.bottom - 0.375,
            },
            BLOCK,
          ),
        ).toBe(false);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(LETTER.width);
        expect(box.bottom).toBeGreaterThanOrEqual(0);
        expect(box.top).toBeLessThanOrEqual(LETTER.height);
        const vertical = from[0] === to[0];
        if (vertical) expect(cutsX).toContainEqual(from[0]);
        else expect(cutsY).toContainEqual(from[1]);
      }
    }
  });

  it('puts each back behind its front when the sheet is turned over its long edge', async () => {
    const { doc } = await build(4);
    const fronts = pictures(doc, 0, 'salt').map(cell);
    // A long-edge turn mirrors the page left to right, so a back's cell, mirrored, is its front's.
    const backs = pictures(doc, 1, 'sorrel').map((box) =>
      cell({ ...box, left: LETTER.width - box.right, right: LETTER.width - box.left }),
    );
    expect(new Set(fronts).size).toBe(4);
    expect(backs).toEqual(fronts);
  });

  it('stands each back right way up when the card is turned side over side, like a book page', () => {
    const [front] = drawn(twelve, 0).images;
    const backs = drawn(twelve, 1).images;
    expect(backs).toHaveLength(12);
    // A long-edge print turns the sheet over its long side, which mirrors the back page left to right.
    const turnSheet = ([x, y]: Vector): Vector => [0 - x, y];
    for (const back of backs) {
      // A side-over-side turn spins the card about its own up line, so its up holds and its right reverses.
      expect(turnSheet(back.up)).toEqual(front.up);
      expect(turnSheet(back.right)).toEqual(front.right.map((v) => 0 - v));
    }
    // Every front faces the same way, so the first one stands for them all.
    for (const other of drawn(twelve, 0).images) expect(other.up).toEqual(front.up);
  });

  it('keeps every picture inside the block', () => {
    for (let i = 0; i < twelve.getPageCount(); i += 1) {
      for (const { box } of drawn(twelve, i).images) {
        expect(box.left).toBeGreaterThanOrEqual(BLOCK.left);
        expect(box.right).toBeLessThanOrEqual(BLOCK.right);
        expect(box.bottom).toBeGreaterThanOrEqual(BLOCK.bottom);
        expect(box.top).toBeLessThanOrEqual(BLOCK.top);
      }
    }
  });

  it("runs each front's salt 1/8 in past its card's trim at the bottom right, at 360 × 240 artboard px", () => {
    const fronts = pictures(twelve, 0, 'salt');
    expect(fronts).toHaveLength(12);
    for (const box of fronts) {
      const [cx, cy] = cell(box).split(',').map(Number);
      const trim = {
        left: BLOCK.left + 9 + CARD.across * cx,
        bottom: BLOCK.bottom + 9 + CARD.up * cy,
      };
      // The frame turns a quarter clockwise, so a card's right edge lies at the page's bottom and its bottom at the left.
      expect(trim.bottom - box.bottom).toBeCloseTo(9);
      expect(trim.left - box.left).toBeCloseTo(9);
      expect(box.top - box.bottom).toBeCloseTo((360 * 72) / 192);
      expect(box.right - box.left).toBeCloseTo((240 * 72) / 192);
    }
  });

  it('prints card i with front text i, and the expiry date on every front', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: twelveBytes.slice() }).promise;
    const text = await (await pdf.getPage(1)).getTextContent();
    const page = text.items.map((item) => ('str' in item ? item.str : '')).join('\n');
    // Letter spacing reads back as a space between letters, so the spaced lines are compared without spaces.
    expect(page.replace(/ /g, '').match(/VALIDUNTIL31MARCH2027/g)).toHaveLength(12);
    // Cards are drawn in order, so each tagline's opening appears in the order of the texts.
    const starts = FRONT_COPY.map((copy) => page.indexOf(copy.tagline.slice(0, 12)));
    expect(starts.every((start) => start >= 0)).toBe(true);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    const backs = (await (await pdf.getPage(2)).getTextContent()).items
      .map((item) => ('str' in item ? item.str : ''))
      .join('\n');
    expect(backs.replace(/ /g, '').match(/BYINVITATIONONLY\./g)).toHaveLength(12);
    // The batch name sits on every back, and in each page's margin with the sheet number.
    expect(backs.replace(/ /g, '').match(/BATCHB4444444/g)).toHaveLength(12);
    expect(page).toContain('Batch b4444444, sheet 1 of 1, fronts');
    expect(backs).toContain('Batch b4444444, sheet 1 of 1, backs');
  });

  it('sets each sheet label at 5 pt in the margin below the block, 2.5 pt from the edge and 8 pt in from the first trim', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: twelveBytes.slice() }).promise;
    const label = async (page: number, text: string) => {
      const items = (await (await pdf.getPage(page)).getTextContent()).items;
      const item = items.find((it) => 'str' in it && it.str === text);
      if (!item || !('transform' in item)) throw new Error(`no label ${text}`);
      return item.transform as number[];
    };
    // The fronts' frame turns a quarter clockwise, so the margin below its block is the page's left edge, read top down.
    const front = await label(1, 'Batch b4444444, sheet 1 of 1, fronts');
    expect(Math.hypot(front[0], front[1])).toBeCloseTo(5);
    expect(front[4]).toBeCloseTo(2.5);
    expect(front[5]).toBeCloseTo(BLOCK.top - 9 - 8);
    // The backs' frame turns the other way, so its margin is the page's right edge, read bottom up.
    const back = await label(2, 'Batch b4444444, sheet 1 of 1, backs');
    expect(Math.hypot(back[0], back[1])).toBeCloseTo(5);
    expect(back[4]).toBeCloseTo(LETTER.width - 2.5);
    expect(back[5]).toBeCloseTo(BLOCK.bottom + 9 + 8);
  });

  it('builds 500 cards on 84 pages, with each font and picture embedded once', async () => {
    const { doc } = await build(500);
    expect(doc.getPageCount()).toBe(84);
    const objects = doc.context.enumerateIndirectObjects().map(([, object]) => object);
    const dictOf = (object: unknown) =>
      object instanceof PDFRawStream ? object.dict : object instanceof PDFDict ? object : undefined;
    const ofType = (key: string, value: string) =>
      objects.filter((object) => dictOf(object)?.get(PDFName.of(key)) === PDFName.of(value));
    expect(ofType('Subtype', 'Type0')).toHaveLength(4);
    // Each picture is one image and one soft mask, its alpha.
    expect(ofType('Subtype', 'Image')).toHaveLength(4);
    const saltPage = pictures(doc, 82, 'salt');
    expect(saltPage).toHaveLength(500 - 41 * 12);
  }, 60_000);

  it('embeds every glyph it draws with the outline the shipped font gives it', () => {
    // A subset whose glyph data lands at the wrong offsets draws nothing, or the wrong shape, for those letters.
    const sources: Record<string, Uint8Array> = {
      'CormorantUnicase-SemiBold': assets.cormorant600,
      'Lexend-Light': assets.lexend300,
      'Lexend-Regular': assets.lexend400,
      'Lexend-Medium': assets.lexend500,
    };
    const descriptors = twelve.context
      .enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter(
        (object): object is PDFDict =>
          object instanceof PDFDict &&
          object.get(PDFName.of('Type')) === PDFName.of('FontDescriptor'),
      );
    expect(descriptors).toHaveLength(4);
    for (const descriptor of descriptors) {
      const name = String(descriptor.get(PDFName.of('FontName'))).replace(/^\/|-\d+$/g, '');
      const source = fontkit.create(sources[name]);
      const outlines = new Set(
        Array.from({ length: source.numGlyphs }, (_, id) => source.getGlyph(id).path.toSVG()),
      );
      const file = twelve.context.lookup(descriptor.get(PDFName.of('FontFile2'))) as PDFRawStream;
      const font = fontkit.create(decodePDFRawStream(file).decode());
      expect(font.numGlyphs).toBeGreaterThan(20);
      for (let id = 1; id < font.numGlyphs; id += 1) {
        const outline = () => font.getGlyph(id).path.toSVG();
        expect(outline, `${name} glyph ${id}`).not.toThrow();
        expect(outlines.has(outline()), `${name} glyph ${id}`).toBe(true);
      }
    }
  });
});

describe("the card sheets PDF's inks", () => {
  let twelve: PDFDocument;
  beforeAll(async () => {
    ({ doc: twelve } = await build(12));
  });
  const same = (a: number[], b: readonly number[]) =>
    a.length === 4 && a.every((v, i) => Math.abs(v - b[i]) < 1e-4);

  it('paints every fill and stroke in DeviceCMYK, and nothing in RGB, grey or a named colour space', () => {
    for (let i = 0; i < twelve.getPageCount(); i += 1) {
      const { operators } = drawn(twelve, i);
      expect(operators.has('k'), `page ${i} fills in CMYK`).toBe(true);
      expect(operators.has('K'), `page ${i} strokes in CMYK`).toBe(true);
      for (const op of ['rg', 'RG', 'g', 'G', 'sc', 'SC', 'scn', 'SCN', 'cs', 'CS'])
        expect(operators.has(op), `page ${i} uses ${op}`).toBe(false);
    }
  });

  it('fills the block with the ground ink', () => {
    for (let i = 0; i < twelve.getPageCount(); i += 1) {
      const page = drawn(twelve, i);
      expect(page.fills[0]).toEqual(BLOCK);
      expect(same(page.fillInks[0], GROUND_INK), `page ${i}: ${page.fillInks[0]}`).toBe(true);
    }
  });

  it('writes the words in the heading and muted inks, and the sheet label in the label ink', () => {
    for (let i = 0; i < twelve.getPageCount(); i += 1) {
      const { textInks } = drawn(twelve, i);
      const label = textInks[textInks.length - 1];
      expect(same(label, LABEL_INK), `page ${i} label: ${label}`).toBe(true);
      const cards = textInks.slice(0, -1);
      expect(cards.some((ink) => same(ink, HEADING_INK))).toBe(true);
      expect(cards.some((ink) => same(ink, MUTED_INK))).toBe(true);
      for (const ink of cards)
        expect(same(ink, HEADING_INK) || same(ink, MUTED_INK), `page ${i}: ${ink}`).toBe(true);
    }
  });

  it('draws each code in the muted ink', () => {
    const { pathInks } = drawn(twelve, 0);
    // Per code, three finder rings, three finder centres and one fill of every dot.
    expect(pathInks).toHaveLength(12 * 7);
    for (const ink of pathInks) expect(same(ink, MUTED_INK), `${ink}`).toBe(true);
    expect(drawn(twelve, 1).pathInks).toHaveLength(0);
  });

  it.each(['salt', 'sorrel'] as const)(
    'embeds the %s picture as CMYK tinted between the ground and chalk, with its alpha as a grey soft mask',
    (picture) => {
      const page = picture === 'salt' ? 0 : 1;
      const names = imageNames(twelve, page);
      const name = Object.keys(names).find((n) => names[n] === picture)!;
      const xObjects = twelve
        .getPage(page)
        .node.Resources()!
        .lookup(PDFName.of('XObject'), PDFDict);
      const image = twelve.context.lookup(xObjects.get(PDFName.of(name))) as PDFRawStream;
      expect(image.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceCMYK'));
      expect(image.dict.get(PDFName.of('Filter'))).toBe(PDFName.of('FlateDecode'));
      expect(image.dict.lookup(PDFName.of('BitsPerComponent'), PDFNumber).asNumber()).toBe(8);
      const mask = twelve.context.lookup(image.dict.get(PDFName.of('SMask'))) as PDFRawStream;
      expect(mask.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceGray'));

      const png = UPNG.decode(assets[picture].slice().buffer);
      const rgba = new Uint8Array(UPNG.toRGBA8(png)[0]);
      const n = png.width * png.height;
      const alpha = decodePDFRawStream(mask).decode();
      expect([...alpha]).toEqual(Array.from({ length: n }, (_, i) => rgba[i * 4 + 3]));

      const cmyk = decodePDFRawStream(image).decode();
      expect(cmyk).toHaveLength(n * 4);
      expect(
        Buffer.from(cmyk).equals(Buffer.from(tintPicture(rgba, png.width, png.height).cmyk)),
      ).toBe(true);
      // Every pixel lies on the line from the ground to chalk, channel by channel.
      for (let c = 0; c < 4; c += 1) {
        const ends = [GROUND_INK[c], PICTURE_LIGHT_INK[c]].map((v) => Math.round(v * 255));
        let outside = 0;
        for (let i = 0; i < n; i += 1) {
          const v = cmyk[i * 4 + c];
          if (v < Math.min(...ends) || v > Math.max(...ends)) outside += 1;
        }
        expect(outside, `channel ${c}`).toBe(0);
      }
    },
  );
});
