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
import { FRONT_COPY } from '@/lib/invitation-cards/copy';
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

// Letter, and the block of nine cards with bleed on the portrait page: 8.125 × 10.75 in, centred, 1/8 in from top and bottom.
const LETTER = { width: 612, height: 792 };
const BLOCK = { left: 13.5, right: 598.5, bottom: 9, top: 783 };

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
  const result: Drawn = { fills: [], clips: [], strokes: [], images: [], textRuns: 0 };
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const saved: Matrix[] = [];
  let operands: string[] = [];
  let path: [number, number][][] = [];
  let pendingClip = false;
  const num = (i: number) => Number(operands[operands.length - i]);
  for (const token of tokens(contents(doc, pageIndex))) {
    if (/^[a-zA-Z*'"]+$/.test(token) && !/^\d/.test(token)) {
      switch (token) {
        case 'q':
          saved.push(ctm);
          break;
        case 'Q':
          ctm = saved.pop() ?? ctm;
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
          if (path.length === 1 && path[0].length === 4) result.fills.push(boxOf(path[0]));
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
  return `${Math.floor((x - BLOCK.left - 9) / 189)},${Math.floor((y - BLOCK.bottom - 9) / 252)}`;
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
  let nine: PDFDocument;
  let nineBytes: Uint8Array;
  beforeAll(async () => {
    ({ doc: nine, bytes: nineBytes } = await build(9));
  });

  it.each([
    [1, 2],
    [9, 2],
    [10, 4],
    [18, 4],
    [19, 6],
  ])(
    'gives %i cards %i Letter pages: per sheet of nine, the fronts then the backs',
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

  it('fills, and clips to, a centred 8.125 × 10.75 in block 1/8 in from the top and bottom of each page', () => {
    for (let i = 0; i < nine.getPageCount(); i += 1) {
      const page = drawn(nine, i);
      expect(page.fills[0]).toEqual(BLOCK);
      expect(page.clips).toEqual([BLOCK]);
      expect((BLOCK.right - BLOCK.left) / 72).toBe(8.125);
      expect((BLOCK.top - BLOCK.bottom) / 72).toBe(10.75);
      expect(BLOCK.left).toBe(LETTER.width - BLOCK.right);
      expect(BLOCK.bottom).toBe(LETTER.height - BLOCK.top);
      expect(BLOCK.bottom).toBe(9);
    }
  });

  it('draws 16 crop marks per page, each on a cut line, outside the block and on the page', () => {
    // The cuts run 1/8 in inside the block's edge and every card's width or height apart.
    const cutsX = [0, 1, 2, 3].map((k) => BLOCK.left + 9 + 189 * k);
    const cutsY = [0, 1, 2, 3].map((k) => BLOCK.bottom + 9 + 252 * k);
    for (let i = 0; i < nine.getPageCount(); i += 1) {
      const marks = drawn(nine, i).strokes;
      expect(marks).toHaveLength(16);
      for (const { from, to } of marks) {
        const box = boxOf([from, to]);
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
    const [front] = drawn(nine, 0).images;
    const backs = drawn(nine, 1).images;
    expect(backs).toHaveLength(9);
    // A long-edge print turns the sheet over its long side, which mirrors the back page left to right.
    const turnSheet = ([x, y]: Vector): Vector => [0 - x, y];
    for (const back of backs) {
      // A side-over-side turn spins the card about its own up line, so its up holds and its right reverses.
      expect(turnSheet(back.up)).toEqual(front.up);
      expect(turnSheet(back.right)).toEqual(front.right.map((v) => 0 - v));
    }
    // Every front faces the same way, so the first one stands for them all.
    for (const other of drawn(nine, 0).images) expect(other.up).toEqual(front.up);
  });

  it('keeps every picture inside the block', () => {
    for (let i = 0; i < nine.getPageCount(); i += 1) {
      for (const { box } of drawn(nine, i).images) {
        expect(box.left).toBeGreaterThanOrEqual(BLOCK.left);
        expect(box.right).toBeLessThanOrEqual(BLOCK.right);
        expect(box.bottom).toBeGreaterThanOrEqual(BLOCK.bottom);
        expect(box.top).toBeLessThanOrEqual(BLOCK.top);
      }
    }
  });

  it("runs each front's salt 1/8 in past its card's trim at the bottom right, at 460 × 307 artboard px", () => {
    const fronts = pictures(nine, 0, 'salt');
    expect(fronts).toHaveLength(9);
    for (const box of fronts) {
      const [cx, cy] = cell(box).split(',').map(Number);
      const trim = {
        left: BLOCK.left + 9 + 189 * cx,
        bottom: BLOCK.bottom + 9 + 252 * cy,
      };
      // The frame turns a quarter clockwise, so a card's right edge lies at the page's bottom and its bottom at the left.
      expect(trim.bottom - box.bottom).toBeCloseTo(9);
      expect(trim.left - box.left).toBeCloseTo(9);
      expect(box.top - box.bottom).toBeCloseTo((460 * 72) / 192);
      expect(box.right - box.left).toBeCloseTo((307 * 72) / 192);
    }
  });

  it('prints card i with front text i, and the expiry date on every front', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: nineBytes.slice() }).promise;
    const text = await (await pdf.getPage(1)).getTextContent();
    const page = text.items.map((item) => ('str' in item ? item.str : '')).join('\n');
    // Letter spacing reads back as a space between letters, so the spaced lines are compared without spaces.
    expect(page.replace(/ /g, '').match(/VALIDUNTIL31MARCH2027/g)).toHaveLength(9);
    // Cards are drawn in order, so each tagline's opening appears in the order of the texts.
    const starts = FRONT_COPY.map((copy) => page.indexOf(copy.tagline.slice(0, 12)));
    expect(starts.every((start) => start >= 0)).toBe(true);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    const backs = (await (await pdf.getPage(2)).getTextContent()).items
      .map((item) => ('str' in item ? item.str : ''))
      .join('\n');
    expect(backs.replace(/ /g, '').match(/BYINVITATIONONLY\./g)).toHaveLength(9);
    // The batch name sits on every back, and in each page's margin with the sheet number.
    expect(backs.replace(/ /g, '').match(/BATCHB4444444/g)).toHaveLength(9);
    expect(page).toContain('Batch b4444444, sheet 1 of 1, fronts');
    expect(backs).toContain('Batch b4444444, sheet 1 of 1, backs');
  });

  it('builds 500 cards on 112 pages, with each font and picture embedded once', async () => {
    const { doc } = await build(500);
    expect(doc.getPageCount()).toBe(112);
    const objects = doc.context.enumerateIndirectObjects().map(([, object]) => object);
    const dictOf = (object: unknown) =>
      object instanceof PDFRawStream ? object.dict : object instanceof PDFDict ? object : undefined;
    const ofType = (key: string, value: string) =>
      objects.filter((object) => dictOf(object)?.get(PDFName.of(key)) === PDFName.of(value));
    expect(ofType('Subtype', 'Type0')).toHaveLength(4);
    // Each picture is one image and one soft mask, its alpha.
    expect(ofType('Subtype', 'Image')).toHaveLength(4);
    const saltPage = pictures(doc, 110, 'salt');
    expect(saltPage).toHaveLength(500 - 55 * 9);
  }, 60_000);

  it('embeds every glyph it draws with the outline the shipped font gives it', () => {
    // A subset whose glyph data lands at the wrong offsets draws nothing, or the wrong shape, for those letters.
    const sources: Record<string, Uint8Array> = {
      'CormorantUnicase-SemiBold': assets.cormorant600,
      'Lexend-Light': assets.lexend300,
      'Lexend-Regular': assets.lexend400,
      'Lexend-Medium': assets.lexend500,
    };
    const descriptors = nine.context
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
      const file = nine.context.lookup(descriptor.get(PDFName.of('FontFile2'))) as PDFRawStream;
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
