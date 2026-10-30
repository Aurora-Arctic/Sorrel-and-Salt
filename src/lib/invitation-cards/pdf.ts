import * as fontkit from '@pdf-lib/fontkit';
import {
  appendBezierCurve,
  beginText,
  clip,
  closePath,
  concatTransformationMatrix,
  drawObject,
  endPath,
  endText,
  fill,
  lineTo,
  moveTo,
  type PDFFont,
  type PDFImage,
  PDFDocument,
  PDFHexString,
  PDFNumber,
  PDFOperator,
  type PDFOperator as Operator,
  type PDFPage,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setCharacterSpacing,
  setFillingRgbColor,
  setFontAndSize,
  setLineWidth,
  setStrokingRgbColor,
  setTextMatrix,
  stroke,
} from 'pdf-lib';
import { FRONT_COPY, validUntil } from './copy';
import {
  ARTBOARD,
  BACK_PICTURE,
  backText,
  type CardFonts,
  type FontKey,
  FRONT_PICTURE,
  FRONT_QR,
  frontText,
  MUTED,
  PX_PER_INCH,
  type PictureItem,
  SOOT,
  type TextItem,
} from './layout';
import { qrShapes } from './qr';
import { glyphAdvances } from './text';
import type { CardAssets, CardSheetsInput, RoundedSquare } from './types';

// Every length below is in points (72 to the inch) on the landscape frame the canvas turns onto the page,
// measured from the frame's top left with y running down.

const PT = 72;
export const PAGE = { width: 8.5 * PT, height: 11 * PT };
export const CARDS_PER_SHEET = 9;
const TRIM = { width: 3.5 * PT, height: 2.625 * PT };
const BLEED = 0.125 * PT;
/** The block of nine cards and its bleed: 1/8 in from the page's ends, centred between its sides. */
export const BLOCK = {
  x: 0.125 * PT,
  y: 0.1875 * PT,
  width: 3 * TRIM.width + 2 * BLEED,
  height: 3 * TRIM.height + 2 * BLEED,
};
const ARTBOARD_SCALE = PT / PX_PER_INCH;

// Crop marks sit on each cut line's extension, clear of the bleed: short at the page's ends, where the margin is 1/8 in.
const MARK = { width: 0.75, endGap: 2.25, endLength: 6, sideGap: 4.5, sideLength: 7.5 };

interface Sheet {
  fronts: PDFPage;
  backs: PDFPage;
}

interface Embedded {
  fonts: Record<FontKey, PDFFont>;
  measure: CardFonts;
  pictures: Record<PictureItem['picture'], PDFImage>;
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The top left of card i's trim on its sheet: three across the frame's long side, three down. */
function cardTrim(i: number): { x: number; y: number } {
  return {
    x: BLOCK.x + BLEED + (i % 3) * TRIM.width,
    y: BLOCK.y + BLEED + Math.floor(i / 3) * TRIM.height,
  };
}

/** The position a card's back takes: the backs are mirrored by row, so a long-edge two-sided print puts each back behind its front. */
export function backPosition(i: number): number {
  return (2 - Math.floor(i / 3)) * 3 + (i % 3);
}

/** Starts a page with the frame's axes: turned a quarter clockwise onto the portrait page, with y running down. */
function frameOperators(): Operator[] {
  return [concatTransformationMatrix(0, -1, -1, 0, PAGE.width, PAGE.height)];
}

/** Moves the origin to card i's artboard, its trim on the card's cut, in the artboard's pixels. */
function artboardOperators(i: number): Operator[] {
  const trim = cardTrim(i);
  const inset = ARTBOARD.trimInset * ARTBOARD_SCALE;
  return [
    concatTransformationMatrix(
      ARTBOARD_SCALE,
      0,
      0,
      ARTBOARD_SCALE,
      trim.x - inset,
      trim.y - inset,
    ),
  ];
}

function pictureOperators(page: PDFPage, image: PDFImage, item: PictureItem): Operator[] {
  const name = page.node.newXObject('Image', image.ref);
  // The image space runs up from its bottom left, so it is flipped to stand upright in the frame.
  return [
    pushGraphicsState(),
    concatTransformationMatrix(item.width, 0, 0, -item.height, item.x, item.y + item.height),
    drawObject(name),
    popGraphicsState(),
  ];
}

// The glyphs are written one by one in a TJ array, because pdf-lib's own text drawing leaves out the fonts' kerning.
function textOperators(page: PDFPage, embedded: Embedded, item: TextItem): Operator[] {
  const font = embedded.fonts[item.font];
  const measure = embedded.measure[item.font];
  const hex = font.encodeText(item.text).asString();
  const advances = glyphAdvances(measure, item.text);
  const shown: (PDFHexString | PDFNumber)[] = [];
  advances.forEach(({ advance, kerned }, g) => {
    shown.push(PDFHexString.of(hex.slice(g * 4, g * 4 + 4)));
    const adjust = ((advance - kerned) * 1000) / measure.unitsPerEm;
    if (adjust !== 0) shown.push(PDFNumber.of(adjust));
  });
  const name = page.node.newFontDictionary(font.name, font.ref);
  return [
    beginText(),
    setFillingRgbColor(...rgb(item.colour)),
    setFontAndSize(name, item.size),
    setCharacterSpacing(item.letterSpacing),
    setTextMatrix(1, 0, 0, -1, item.x, item.baseline),
    PDFOperator.of('TJ' as never, [page.doc.context.obj(shown)]),
    endText(),
  ];
}

// A circle and a rounded corner are cubic Béziers with the usual 0.5523 handle, which no viewer or RIP draws differently.
const KAPPA = 0.5522847498;

function circleOperators(cx: number, cy: number, r: number): Operator[] {
  const k = r * KAPPA;
  return [
    moveTo(cx + r, cy),
    appendBezierCurve(cx + r, cy + k, cx + k, cy + r, cx, cy + r),
    appendBezierCurve(cx - k, cy + r, cx - r, cy + k, cx - r, cy),
    appendBezierCurve(cx - r, cy - k, cx - k, cy - r, cx, cy - r),
    appendBezierCurve(cx + k, cy - r, cx + r, cy - k, cx + r, cy),
    closePath(),
  ];
}

function roundedSquareOperators({ x, y, size, radius: r }: RoundedSquare): Operator[] {
  const k = r * KAPPA;
  const right = x + size;
  const bottom = y + size;
  return [
    moveTo(x + r, y),
    lineTo(right - r, y),
    appendBezierCurve(right - r + k, y, right, y + r - k, right, y + r),
    lineTo(right, bottom - r),
    appendBezierCurve(right, bottom - r + k, right - r + k, bottom, right - r, bottom),
    lineTo(x + r, bottom),
    appendBezierCurve(x + r - k, bottom, x, bottom - r + k, x, bottom - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
    closePath(),
  ];
}

function qrOperators(link: string): Operator[] {
  const { size, dotRadius, dots, finders } = qrShapes(link);
  const module = FRONT_QR.size / size;
  const ops: Operator[] = [
    pushGraphicsState(),
    concatTransformationMatrix(module, 0, 0, module, FRONT_QR.x, FRONT_QR.y),
    setFillingRgbColor(...rgb(MUTED)),
  ];
  // Each finder's ring is filled even-odd, so the card shows through its middle as it does through the SVG's.
  for (const { outer, inner, centre } of finders) {
    ops.push(
      ...roundedSquareOperators(outer),
      ...roundedSquareOperators(inner),
      PDFOperator.of('f*' as never),
    );
    ops.push(...roundedSquareOperators(centre), fill());
  }
  for (const { cx, cy } of dots) ops.push(...circleOperators(cx, cy, dotRadius));
  ops.push(fill(), popGraphicsState());
  return ops;
}

function cropMarkOperators(): Operator[] {
  const ops: Operator[] = [setStrokingRgbColor(0, 0, 0), setLineWidth(MARK.width)];
  const top = BLOCK.y;
  const bottom = BLOCK.y + BLOCK.height;
  const left = BLOCK.x;
  const right = BLOCK.x + BLOCK.width;
  for (let k = 0; k <= 3; k += 1) {
    const x = BLOCK.x + BLEED + k * TRIM.width;
    ops.push(moveTo(x, top - MARK.sideGap), lineTo(x, top - MARK.sideGap - MARK.sideLength));
    ops.push(moveTo(x, bottom + MARK.sideGap), lineTo(x, bottom + MARK.sideGap + MARK.sideLength));
    const y = BLOCK.y + BLEED + k * TRIM.height;
    ops.push(moveTo(left - MARK.endGap, y), lineTo(left - MARK.endGap - MARK.endLength, y));
    ops.push(moveTo(right + MARK.endGap, y), lineTo(right + MARK.endGap + MARK.endLength, y));
  }
  ops.push(stroke());
  return ops;
}

/**
 * Draws one page: the soot block, then every picture, then every card's words and code, all clipped to the block's outer edge,
 * so no picture lands over a neighbour's words. A position with no card stays plain soot, so the block prints and cuts as a full one.
 */
function drawPage(
  page: PDFPage,
  cards: { position: number; picture: PictureItem; text: TextItem[]; link?: string }[],
  embedded: Embedded,
) {
  const ops: Operator[] = [pushGraphicsState(), ...frameOperators(), pushGraphicsState()];
  ops.push(rectangle(BLOCK.x, BLOCK.y, BLOCK.width, BLOCK.height), clip(), endPath());
  ops.push(
    setFillingRgbColor(...rgb(SOOT)),
    rectangle(BLOCK.x, BLOCK.y, BLOCK.width, BLOCK.height),
    fill(),
  );
  for (const card of cards) {
    ops.push(pushGraphicsState(), ...artboardOperators(card.position));
    ops.push(
      ...pictureOperators(page, embedded.pictures[card.picture.picture], card.picture),
      popGraphicsState(),
    );
  }
  for (const card of cards) {
    ops.push(pushGraphicsState(), ...artboardOperators(card.position));
    for (const item of card.text) ops.push(...textOperators(page, embedded, item));
    if (card.link) ops.push(...qrOperators(card.link));
    ops.push(popGraphicsState());
  }
  ops.push(popGraphicsState(), ...cropMarkOperators(), popGraphicsState());
  page.pushOperators(...ops);
}

async function embedAssets(doc: PDFDocument, assets: CardAssets): Promise<Embedded> {
  doc.registerFontkit(fontkit);
  const keys: FontKey[] = ['cormorant600', 'lexend300', 'lexend400', 'lexend500'];
  const fonts = {} as Record<FontKey, PDFFont>;
  const measure = {} as CardFonts;
  for (const key of keys) {
    fonts[key] = await doc.embedFont(assets[key], { subset: true });
    measure[key] = fontkit.create(assets[key]);
  }
  const [salt, sorrel] = await Promise.all([
    doc.embedPng(assets.salt),
    doc.embedPng(assets.sorrel),
  ]);
  return { fonts, measure, pictures: { salt, sorrel } };
}

/** Builds the print PDF: per sheet of nine, a page of fronts, then a page of their backs. */
export async function renderCardSheets(
  { links, expiresAt }: CardSheetsInput,
  assets: CardAssets,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Sorrel & Salt invitation cards');
  const embedded = await embedAssets(doc, assets);
  const valid = validUntil(expiresAt);
  const back = backText(embedded.measure);
  const fronts = FRONT_COPY.map((copy) => frontText(embedded.measure, copy, valid));
  for (let start = 0; start < links.length; start += CARDS_PER_SHEET) {
    const sheetLinks = links.slice(start, start + CARDS_PER_SHEET);
    const sheet: Sheet = {
      fronts: doc.addPage([PAGE.width, PAGE.height]),
      backs: doc.addPage([PAGE.width, PAGE.height]),
    };
    drawPage(
      sheet.fronts,
      sheetLinks.map((link, i) => ({ position: i, picture: FRONT_PICTURE, text: fronts[i], link })),
      embedded,
    );
    drawPage(
      sheet.backs,
      sheetLinks.map((_, i) => ({ position: backPosition(i), picture: BACK_PICTURE, text: back })),
      embedded,
    );
  }
  return doc.save();
}
