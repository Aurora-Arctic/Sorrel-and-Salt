import * as fontkitModule from '@pdf-lib/fontkit';
import {
  beginText,
  clip,
  concatTransformationMatrix,
  drawObject,
  endPath,
  endText,
  fill,
  lineTo,
  moveTo,
  type PDFFont,
  type PDFDocument,
  PDFHexString,
  PDFNumber,
  PDFOperator,
  type PDFOperator as Operator,
  type PDFPage,
  type PDFRef,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  setCharacterSpacing,
  setFillingCmykColor,
  setFontAndSize,
  setLineWidth,
  setStrokingCmykColor,
  setTextMatrix,
  stroke,
} from 'pdf-lib';
import { padGlyphs } from '../invitation-cards/font-padding';
import { decodePng, GROUND_INK, inkOf, tintPicture } from '../invitation-cards/inks';
import {
  ARTBOARD,
  type CardFonts,
  type FontKey,
  PX_PER_INCH,
  type TextItem,
} from '../invitation-cards/layout';
import { CARDS_PER_SHEET } from '../invitation-cards/limits';
import { glyphAdvances } from '../invitation-cards/text';
import type { CardAssets } from '../invitation-cards/types';
import type { Embedded, Rect, SheetCard } from './types';

// Every length below is in points (72 to the inch), y running down from the page's top left.

const PT = 72;
export const PAGE = { width: 8.5 * PT, height: 11 * PT };
const TRIM = { width: 3.5 * PT, height: 2 * PT };
const BLEED = 0.125 * PT;
const COLUMNS = 2;
const ROWS = CARDS_PER_SHEET / COLUMNS;
const BLOCK_SIZE = {
  width: COLUMNS * TRIM.width + 2 * BLEED,
  height: ROWS * TRIM.height + 2 * BLEED,
};
/** Centred, 5/8 in from each side and 3/8 in from the top and bottom, so a printer's unprintable edge clips neither the bleed nor the crop marks. */
export const BLOCK = {
  x: (PAGE.width - BLOCK_SIZE.width) / 2,
  y: (PAGE.height - BLOCK_SIZE.height) / 2,
  ...BLOCK_SIZE,
};
const ARTBOARD_SCALE = PT / PX_PER_INCH;

// Crop marks sit on each cut line's extension, clear of the bleed; at the top and bottom they end 18.75 pt from the paper's
// edge, outside the 1/4 in a printer may leave unprinted.
const MARK = { width: 0.75, gap: 2.25, length: 6 };
/** In the margin below the block, clear of the 1/4 in a printer may leave unprinted below. */
export const LABEL_AT = { x: BLOCK.x + BLEED + 8, baseline: PAGE.height - 21 };

function cardTrim(i: number): { x: number; y: number } {
  return {
    x: BLOCK.x + BLEED + (i % COLUMNS) * TRIM.width,
    y: BLOCK.y + BLEED + Math.floor(i / COLUMNS) * TRIM.height,
  };
}

/** The position a card's back takes: the backs are mirrored by column, so a long-edge two-sided print puts each back behind its front. */
export function backPosition(i: number): number {
  return Math.floor(i / COLUMNS) * COLUMNS + (COLUMNS - 1 - (i % COLUMNS));
}

// Both faces stand upright: a portrait page turned over its long edge keeps its top at the top, so the backs need no half turn.
function frameOperators(): Operator[] {
  return [concatTransformationMatrix(1, 0, 0, -1, 0, PAGE.height)];
}

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

function imageOperators(page: PDFPage, image: PDFRef, item: Rect): Operator[] {
  const name = page.node.newXObject('Image', image);
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
    setFillingCmykColor(...inkOf(item.colour)),
    setFontAndSize(name, item.size),
    setCharacterSpacing(item.letterSpacing),
    setTextMatrix(1, 0, 0, -1, item.x, item.baseline),
    PDFOperator.of('TJ' as never, [page.doc.context.obj(shown)]),
    endText(),
  ];
}

function cropMarkOperators(): Operator[] {
  const ops: Operator[] = [setStrokingCmykColor(0, 0, 0, 1), setLineWidth(MARK.width)];
  const top = BLOCK.y;
  const bottom = BLOCK.y + BLOCK.height;
  const left = BLOCK.x;
  const right = BLOCK.x + BLOCK.width;
  for (let k = 0; k <= COLUMNS; k += 1) {
    const x = BLOCK.x + BLEED + k * TRIM.width;
    ops.push(moveTo(x, top - MARK.gap), lineTo(x, top - MARK.gap - MARK.length));
    ops.push(moveTo(x, bottom + MARK.gap), lineTo(x, bottom + MARK.gap + MARK.length));
  }
  for (let k = 0; k <= ROWS; k += 1) {
    const y = BLOCK.y + BLEED + k * TRIM.height;
    ops.push(moveTo(left - MARK.gap, y), lineTo(left - MARK.gap - MARK.length, y));
    ops.push(moveTo(right + MARK.gap, y), lineTo(right + MARK.gap + MARK.length, y));
  }
  ops.push(stroke());
  return ops;
}

export function addSheetPage(doc: PDFDocument): PDFPage {
  return doc.addPage([PAGE.width, PAGE.height]);
}

// All clipped to the block's outer edge, so no picture lands over a neighbour's words; the crop marks and the label go outside it.
export function drawSheet(
  page: PDFPage,
  cards: SheetCard[],
  embedded: Embedded,
  label: TextItem,
): void {
  const ops: Operator[] = [pushGraphicsState(), ...frameOperators(), pushGraphicsState()];
  ops.push(rectangle(BLOCK.x, BLOCK.y, BLOCK.width, BLOCK.height), clip(), endPath());
  ops.push(
    setFillingCmykColor(...GROUND_INK),
    rectangle(BLOCK.x, BLOCK.y, BLOCK.width, BLOCK.height),
    fill(),
  );
  for (const card of cards) {
    ops.push(pushGraphicsState(), ...artboardOperators(card.position));
    ops.push(
      ...imageOperators(page, embedded.pictures[card.picture.picture], card.picture),
      popGraphicsState(),
    );
  }
  for (const { position, overlay } of cards)
    if (overlay)
      ops.push(
        pushGraphicsState(),
        ...artboardOperators(position),
        ...imageOperators(page, overlay.image, overlay.rect),
        popGraphicsState(),
      );
  for (const card of cards) {
    ops.push(pushGraphicsState(), ...artboardOperators(card.position));
    for (const item of card.text) ops.push(...textOperators(page, embedded, item));
    if (card.extra) ops.push(...card.extra);
    ops.push(popGraphicsState());
  }
  ops.push(popGraphicsState(), ...cropMarkOperators(), ...textOperators(page, embedded, label));
  ops.push(popGraphicsState());
  page.pushOperators(...ops);
}

// The browser bundle gives the ES build's API on `default` only; Node's gives it on the namespace.
const fontkit = (
  'default' in fontkitModule ? fontkitModule.default : fontkitModule
) as typeof fontkitModule;

export async function embedAssets(doc: PDFDocument, assets: CardAssets): Promise<Embedded> {
  doc.registerFontkit(fontkit);
  const keys: FontKey[] = ['cormorant600', 'lexend300', 'lexend400', 'lexend500'];
  const fonts = {} as Record<FontKey, PDFFont>;
  const measure = {} as CardFonts;
  for (const key of keys) {
    const bytes = padGlyphs(assets[key]);
    fonts[key] = await doc.embedFont(bytes, { subset: true });
    measure[key] = fontkit.create(bytes);
  }
  return {
    fonts,
    measure,
    pictures: { salt: embedPicture(doc, assets.salt), sorrel: embedPicture(doc, assets.sorrel) },
  };
}

function embedPicture(doc: PDFDocument, png: Uint8Array): PDFRef {
  const { rgba, width, height } = decodePng(png);
  const { cmyk, alpha } = tintPicture(rgba, width, height);
  const image = {
    Type: 'XObject',
    Subtype: 'Image',
    Width: width,
    Height: height,
    BitsPerComponent: 8,
  };
  const mask = doc.context.register(
    doc.context.flateStream(alpha, { ...image, ColorSpace: 'DeviceGray' }),
  );
  return doc.context.register(
    doc.context.flateStream(cmyk, { ...image, ColorSpace: 'DeviceCMYK', SMask: mask }),
  );
}
