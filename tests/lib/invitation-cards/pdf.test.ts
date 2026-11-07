import * as fontkit from '@pdf-lib/fontkit';
import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
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
import { SHADOW_OPACITY } from '@/lib/invitation-cards/layout';
import { renderCardSheets } from '@/lib/invitation-cards/pdf';
import {
  assets,
  LETTER,
  BLOCK,
  CARD,
  PAPER_CLEARANCE,
  boxOf,
  drawn,
  imageNames,
  pictures,
  cell,
  overlaps,
  type Box,
  type Vector,
} from '../../support/card-sheet-pdf';

const EXPIRES = new Date('2027-04-01T12:00:00Z');
const links = (n: number) =>
  Array.from(
    { length: n },
    (_, i) => `https://sorrelandsalt.com/i/card${String(i).padStart(12, '0')}`,
  );

async function build(n: number) {
  const bytes = await renderCardSheets(
    { links: links(n), batch: 'b4444444', expiresAt: EXPIRES },
    assets,
  );
  return { bytes, doc: await PDFDocument.load(bytes) };
}

describe('the card sheets PDF', () => {
  let ten: PDFDocument;
  let tenBytes: Uint8Array;
  beforeAll(async () => {
    ({ doc: ten, bytes: tenBytes } = await build(10));
  });

  it.each([
    [1, 2],
    [10, 2],
    [11, 4],
    [20, 4],
    [21, 6],
  ])(
    'gives %i cards %i Letter pages: per sheet of ten, the fronts then the backs',
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
    [10, 1],
    [11, 2],
    [21, 3],
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

  it('fills, and clips to, a 7.25 × 10.25 in block centred on each page, 5/8 in from each side and 3/8 in from the top and bottom', () => {
    for (let i = 0; i < ten.getPageCount(); i += 1) {
      const page = drawn(ten, i);
      expect(page.fills[0]).toEqual(BLOCK);
      expect(page.clips).toEqual([BLOCK]);
      expect((BLOCK.right - BLOCK.left) / 72).toBe(7.25);
      expect((BLOCK.top - BLOCK.bottom) / 72).toBe(10.25);
      expect(BLOCK.left).toBe(LETTER.width - BLOCK.right);
      expect(BLOCK.bottom).toBe(LETTER.height - BLOCK.top);
      expect(BLOCK.left / 72).toBe(5 / 8);
      expect(BLOCK.bottom / 72).toBe(3 / 8);
    }
  });

  it('draws 18 crop marks per page, each on a cut line, 2.25 pt clear of the block, 6 pt long and 1/4 in clear of the paper edge', () => {
    const cutsX = [0, 1, 2].map((k) => BLOCK.left + 9 + CARD.across * k);
    const cutsY = [0, 1, 2, 3, 4, 5].map((k) => BLOCK.bottom + 9 + CARD.up * k);
    for (let i = 0; i < ten.getPageCount(); i += 1) {
      const marks = drawn(ten, i).strokes;
      expect(marks).toHaveLength(18);
      expect(marks.filter(({ from, to }) => from[0] === to[0])).toHaveLength(6);
      expect(marks.filter(({ from, to }) => from[1] === to[1])).toHaveLength(12);
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
        // The stroke's half width counts, as it inks past the line's ends' sides.
        expect(box.left - 0.375).toBeGreaterThanOrEqual(PAPER_CLEARANCE);
        expect(box.right + 0.375).toBeLessThanOrEqual(LETTER.width - PAPER_CLEARANCE);
        expect(box.bottom - 0.375).toBeGreaterThanOrEqual(PAPER_CLEARANCE);
        expect(box.top + 0.375).toBeLessThanOrEqual(LETTER.height - PAPER_CLEARANCE);
        const vertical = from[0] === to[0];
        if (vertical) expect(cutsX).toContainEqual(from[0]);
        else expect(cutsY).toContainEqual(from[1]);
      }
    }
  });

  it('puts each back behind its front when the sheet is turned over its long edge', async () => {
    const { doc } = await build(10);
    const fronts = pictures(doc, 0, 'salt').map(cell);
    // A long-edge turn mirrors the page left to right, so a back's cell, mirrored, is its front's.
    const backs = pictures(doc, 1, 'sorrel').map((box) =>
      cell({ ...box, left: LETTER.width - box.right, right: LETTER.width - box.left }),
    );
    expect(new Set(fronts).size).toBe(10);
    expect(backs).toEqual(fronts);
  });

  it('stands each back right way up when the card is turned side over side, like a book page', () => {
    const [front] = drawn(ten, 0).images;
    const backs = drawn(ten, 1).images;
    expect(backs).toHaveLength(10);
    expect(front.up).toEqual([0, 1]);
    expect(front.right).toEqual([1, 0]);
    // A long-edge print turns the sheet over its long side, which mirrors the back page left to right.
    const turnSheet = ([x, y]: Vector): Vector => [0 - x, y];
    for (const back of backs) {
      // A side-over-side turn spins the card about its own up line, so its up holds and its right reverses.
      expect(turnSheet(back.up)).toEqual(front.up);
      expect(turnSheet(back.right)).toEqual(front.right.map((v) => 0 - v));
      // So the back page takes no half turn: a portrait page turned over its long edge keeps its top at the top.
      expect(back.up).toEqual([0, 1]);
    }
    for (const other of drawn(ten, 0).images) expect(other.up).toEqual(front.up);
  });

  it('keeps every picture inside the block', () => {
    for (let i = 0; i < ten.getPageCount(); i += 1) {
      for (const { box } of drawn(ten, i).images) {
        expect(box.left).toBeGreaterThanOrEqual(BLOCK.left);
        expect(box.right).toBeLessThanOrEqual(BLOCK.right);
        expect(box.bottom).toBeGreaterThanOrEqual(BLOCK.bottom);
        expect(box.top).toBeLessThanOrEqual(BLOCK.top);
      }
    }
  });

  it("runs each front's salt 1/8 in past its card's trim at the bottom right, at 360 × 240 artboard px", () => {
    const fronts = pictures(ten, 0, 'salt');
    expect(fronts).toHaveLength(10);
    for (const box of fronts) {
      const [cx, cy] = cell(box).split(',').map(Number);
      const trim = {
        left: BLOCK.left + 9 + CARD.across * cx,
        bottom: BLOCK.bottom + 9 + CARD.up * cy,
      };
      expect(box.right - (trim.left + CARD.across)).toBeCloseTo(9);
      expect(trim.bottom - box.bottom).toBeCloseTo(9);
      expect(box.right - box.left).toBeCloseTo((360 * 72) / 192);
      expect(box.top - box.bottom).toBeCloseTo((240 * 72) / 192);
    }
  });

  it('prints card i with front text i, and the expiry date on every front', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: tenBytes.slice() }).promise;
    const text = await (await pdf.getPage(1)).getTextContent();
    const page = text.items.map((item) => ('str' in item ? item.str : '')).join('\n');
    // Letter spacing reads back as a space between letters, so the spaced lines are compared without spaces.
    expect(page.replace(/ /g, '').match(/VALIDUNTIL31MARCH2027/g)).toHaveLength(10);
    const starts = FRONT_COPY.map((copy) => page.indexOf(copy.tagline.slice(0, 12)));
    expect(starts.every((start) => start >= 0)).toBe(true);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    const backs = (await (await pdf.getPage(2)).getTextContent()).items
      .map((item) => ('str' in item ? item.str : ''))
      .join('\n');
    expect(backs.replace(/ /g, '').match(/BYINVITATIONONLY\./g)).toHaveLength(10);
    expect(backs.replace(/ /g, '').match(/BATCHB4444444/g)).toHaveLength(10);
    expect(page).toContain('Batch b4444444, sheet 1 of 1, fronts');
    expect(backs).toContain('Batch b4444444, sheet 1 of 1, backs');
  });

  it('sets each sheet label at 5 pt in the margin below the block, upright, 8 pt in from the first trim and 1/4 in clear of the paper edge', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: tenBytes.slice() }).promise;
    const label = async (page: number, text: string) => {
      const items = (await (await pdf.getPage(page)).getTextContent()).items;
      const item = items.find((it) => 'str' in it && it.str === text);
      if (!item || !('transform' in item)) throw new Error(`no label ${text}`);
      return item.transform as number[];
    };
    for (const [page, face] of [
      [1, 'fronts'],
      [2, 'backs'],
    ] as const) {
      const [a, b, c, d, x, baseline] = await label(page, `Batch b4444444, sheet 1 of 1, ${face}`);
      expect([a, b, c, d]).toEqual([5, 0, 0, 5]);
      expect(x).toBeCloseTo(BLOCK.left + 9 + 8);
      // Its descenders, a quarter of the size below the baseline, stay 1/4 in clear of the paper edge, and its
      // ascenders, the size above it, stay below the block.
      expect(baseline - 5 / 4).toBeGreaterThanOrEqual(PAPER_CLEARANCE);
      expect(baseline + 5).toBeLessThanOrEqual(BLOCK.bottom);
    }
  });

  it('builds 495 cards on 100 pages, with each font and picture embedded once', async () => {
    const { doc } = await build(495);
    expect(doc.getPageCount()).toBe(100);
    const objects = doc.context.enumerateIndirectObjects().map(([, object]) => object);
    const dictOf = (object: unknown) =>
      object instanceof PDFRawStream ? object.dict : object instanceof PDFDict ? object : undefined;
    const ofType = (key: string, value: string) =>
      objects.filter((object) => dictOf(object)?.get(PDFName.of(key)) === PDFName.of(value));
    expect(ofType('Subtype', 'Type0')).toHaveLength(4);
    expect(ofType('Subtype', 'Image')).toHaveLength(4 + 2 * 495);
    const saltPage = pictures(doc, 98, 'salt');
    expect(saltPage).toHaveLength(495 - 49 * 10);
  }, 60_000);

  it('embeds every glyph it draws with the outline the shipped font gives it', () => {
    // A subset whose glyph data lands at the wrong offsets draws nothing, or the wrong shape, for those letters.
    const sources: Record<string, Uint8Array> = {
      'CormorantUnicase-SemiBold': assets.cormorant600,
      'Lexend-Light': assets.lexend300,
      'Lexend-Regular': assets.lexend400,
      'Lexend-Medium': assets.lexend500,
    };
    const descriptors = ten.context
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
      const file = ten.context.lookup(descriptor.get(PDFName.of('FontFile2'))) as PDFRawStream;
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
  let ten: PDFDocument;
  beforeAll(async () => {
    ({ doc: ten } = await build(10));
  });
  const same = (a: number[], b: readonly number[]) =>
    a.length === 4 && a.every((v, i) => Math.abs(v - b[i]) < 1e-4);

  it('paints every fill and stroke in DeviceCMYK, and nothing in RGB, grey or a named colour space', () => {
    for (let i = 0; i < ten.getPageCount(); i += 1) {
      const { operators } = drawn(ten, i);
      expect(operators.has('k'), `page ${i} fills in CMYK`).toBe(true);
      expect(operators.has('K'), `page ${i} strokes in CMYK`).toBe(true);
      for (const op of ['rg', 'RG', 'g', 'G', 'sc', 'SC', 'scn', 'SCN', 'cs', 'CS'])
        expect(operators.has(op), `page ${i} uses ${op}`).toBe(false);
    }
  });

  it('fills the block with the ground ink', () => {
    for (let i = 0; i < ten.getPageCount(); i += 1) {
      const page = drawn(ten, i);
      expect(page.fills[0]).toEqual(BLOCK);
      expect(same(page.fillInks[0], GROUND_INK), `page ${i}: ${page.fillInks[0]}`).toBe(true);
    }
  });

  it('writes the words in the heading and muted inks, and the sheet label in the label ink', () => {
    for (let i = 0; i < ten.getPageCount(); i += 1) {
      const { textInks } = drawn(ten, i);
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
    const { pathInks } = drawn(ten, 0);
    expect(pathInks).toHaveLength(10 * 7);
    for (const ink of pathInks) expect(same(ink, MUTED_INK), `${ink}`).toBe(true);
    expect(drawn(ten, 1).pathInks).toHaveLength(0);
  });

  it.each(['salt', 'sorrel'] as const)(
    'embeds the %s picture as CMYK tinted between the ground and chalk, with its alpha as a grey soft mask',
    (picture) => {
      const page = picture === 'salt' ? 0 : 1;
      const names = imageNames(ten, page);
      const name = Object.keys(names).find((n) => names[n] === picture)!;
      const xObjects = ten.getPage(page).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
      const image = ten.context.lookup(xObjects.get(PDFName.of(name))) as PDFRawStream;
      expect(image.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceCMYK'));
      expect(image.dict.get(PDFName.of('Filter'))).toBe(PDFName.of('FlateDecode'));
      expect(image.dict.lookup(PDFName.of('BitsPerComponent'), PDFNumber).asNumber()).toBe(8);
      const mask = ten.context.lookup(image.dict.get(PDFName.of('SMask'))) as PDFRawStream;
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
  it("moves the first front's code and its shadow together, by the batch's expiry date", async () => {
    const placed = async (expiresAt: Date) => {
      const doc = await PDFDocument.load(
        await renderCardSheets(
          { links: links(1), batch: 'b4444444', expiresAt, backs: false },
          assets,
        ),
      );
      const names = imageNames(doc, 0);
      const page = drawn(doc, 0);
      const shadow = page.images.find((image) => names[image.name] === 'shadow')!.box;
      const code = boxOf(
        page.pathBoxes
          .filter((box, i) => page.pathInks[i].join() === MUTED_INK.join() && overlaps(box, shadow))
          .flatMap(
            (box) =>
              [
                [box.left, box.bottom],
                [box.right, box.top],
              ] as [number, number][],
          ),
      );
      const middle = (box: Box) => [(box.left + box.right) / 2, (box.bottom + box.top) / 2];
      return { shadow: middle(shadow), code: middle(code) };
    };
    const short = await placed(EXPIRES);
    const long = await placed(new Date('2027-10-01T12:00:00Z'));
    const codeShift = Math.hypot(long.code[0] - short.code[0], long.code[1] - short.code[1]);
    expect(codeShift).toBeGreaterThan(2);
    expect(
      Math.abs(long.shadow[0] - short.shadow[0] - (long.code[0] - short.code[0])),
    ).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(long.shadow[1] - short.shadow[1] - (long.code[1] - short.code[1])),
    ).toBeLessThanOrEqual(0.5);
  });

  it('shades each front behind its code column with solid ground ink through a grey soft mask, over the salt and under the words', () => {
    const names = imageNames(ten, 0);
    const page = drawn(ten, 0);
    const shadows = page.images.filter((image) => names[image.name] === 'shadow');
    expect(shadows).toHaveLength(10);
    const lastSalt = page.images.map((image) => names[image.name]).lastIndexOf('salt');
    for (const shadow of shadows) {
      expect(page.images.indexOf(shadow)).toBeGreaterThan(lastSalt);
      expect(shadow.textsBefore).toBe(0);
      expect(shadow.pathsBefore).toBe(0);
    }
    expect(Object.values(imageNames(ten, 1))).not.toContain('shadow');

    const xObjects = ten.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    for (const name of new Set(shadows.map((shadow) => shadow.name))) {
      const image = ten.context.lookup(xObjects.get(PDFName.of(name))) as PDFRawStream;
      expect(image.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceCMYK'));
      expect(image.dict.lookup(PDFName.of('BitsPerComponent'), PDFNumber).asNumber()).toBe(8);
      const cmyk = decodePDFRawStream(image).decode();
      const ground = GROUND_INK.map((v) => Math.round(v * 255));
      expect(cmyk.length % 4).toBe(0);
      for (let i = 0; i < cmyk.length; i += 4)
        if (ground.some((v, c) => cmyk[i + c] !== v))
          throw new Error(`pixel ${i / 4} is not the ground ink`);
      const mask = ten.context.lookup(image.dict.get(PDFName.of('SMask'))) as PDFRawStream;
      expect(mask.dict.get(PDFName.of('ColorSpace'))).toBe(PDFName.of('DeviceGray'));
      const alpha = decodePDFRawStream(mask).decode();
      expect(alpha).toHaveLength(cmyk.length / 4);
      expect(Math.max(...alpha)).toBe(Math.round(SHADOW_OPACITY * 255));
    }
  });
});
