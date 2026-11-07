import {
  appendBezierCurve,
  closePath,
  concatTransformationMatrix,
  fill,
  lineTo,
  moveTo,
  PDFDocument,
  PDFOperator,
  PDFRawStream,
  type PDFOperator as Operator,
  popGraphicsState,
  pushGraphicsState,
  setFillingCmykColor,
} from 'pdf-lib';
import { addSheetPage, backPosition, drawSheet, embedAssets, LABEL_AT } from '../card-sheet/sheet';
import { FRONT_COPY, validUntil } from './copy';
import { GROUND_INK, MUTED_INK } from './inks';
import {
  BACK_PICTURE,
  backText,
  codeColumnText,
  marginText,
  FRONT_PICTURE,
  frontCode,
  frontText,
  type QrItem,
} from './layout';
import { CARDS_PER_SHEET } from './limits';
import { qrShapes } from '../qr';
import { codeShadows, type CodeShadows } from './shadow';
import type { RoundedSquare } from '../qr/types';
import type { CardAssets, CardSheetsInput } from './types';

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

function qrOperators(link: string, at: QrItem): Operator[] {
  const { size, dotRadius, dots, finders } = qrShapes(link);
  const module = at.size / size;
  const ops: Operator[] = [
    pushGraphicsState(),
    concatTransformationMatrix(module, 0, 0, module, at.x, at.y),
    setFillingCmykColor(...MUTED_INK),
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

// Every shadow's ink is the same, so it is compressed once and its bytes shared.
function shadowEmbedder(doc: PDFDocument, shadows: CodeShadows) {
  const image = {
    Type: 'XObject',
    Subtype: 'Image',
    Width: shadows.columns,
    Height: shadows.rows,
    BitsPerComponent: 8,
  };
  const ground = GROUND_INK.map((v) => Math.round(v * 255));
  const solid = new Uint8Array(shadows.columns * shadows.rows * 4);
  for (let i = 0; i < solid.length; i += 1) solid[i] = ground[i % 4];
  const ink = doc.context.flateStream(solid).getContents();
  const rect = { x: shadows.x, y: shadows.y, width: shadows.width, height: shadows.height };
  return (link: string) => {
    const mask = doc.context.register(
      doc.context.flateStream(shadows.mask(link), { ...image, ColorSpace: 'DeviceGray' }),
    );
    const dict = doc.context.obj({
      ...image,
      ColorSpace: 'DeviceCMYK',
      Filter: 'FlateDecode',
      SMask: mask,
    });
    return { image: doc.context.register(PDFRawStream.of(dict, ink)), rect };
  };
}

export async function renderCardSheets(
  { links, batch, expiresAt, backs = true }: CardSheetsInput,
  assets: CardAssets,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Sorrel & Salt invitation cards');
  const embedded = await embedAssets(doc, assets);
  const valid = validUntil(expiresAt);
  const back = backText(embedded.measure, batch);
  const code = frontCode(embedded.measure, valid);
  const fronts = FRONT_COPY.map((copy) => frontText(embedded.measure, copy, valid, code));
  const shadowOf = shadowEmbedder(
    doc,
    codeShadows(embedded.measure, codeColumnText(embedded.measure, valid, code), code),
  );
  const sheets = Math.ceil(links.length / CARDS_PER_SHEET);
  for (let start = 0; start < links.length; start += CARDS_PER_SHEET) {
    const number = start / CARDS_PER_SHEET + 1;
    const sheetLinks = links.slice(start, start + CARDS_PER_SHEET);
    const frontPage = addSheetPage(doc);
    const backPage = backs ? addSheetPage(doc) : undefined;
    drawSheet(
      frontPage,
      sheetLinks.map((link, i) => ({
        position: i,
        picture: FRONT_PICTURE,
        text: fronts[(start + i) % fronts.length],
        overlay: shadowOf(link),
        extra: qrOperators(link, code),
      })),
      embedded,
      marginText(batch, number, sheets, 'front', LABEL_AT),
    );
    if (backPage)
      drawSheet(
        backPage,
        sheetLinks.map((_, i) => ({
          position: backPosition(i),
          picture: BACK_PICTURE,
          text: back,
        })),
        embedded,
        marginText(batch, number, sheets, 'back', LABEL_AT),
      );
  }
  return doc.save();
}
