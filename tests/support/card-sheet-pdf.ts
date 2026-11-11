import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  type PDFDocument,
  PDFName,
  PDFNumber,
  type PDFRawStream,
  type PDFRef,
} from 'pdf-lib';
import type { CardAssets } from '@/lib/invitation-cards/types';

const PUBLIC = path.join(process.cwd(), 'public/invitation-cards');
export const read = (file: string) => new Uint8Array(readFileSync(path.join(PUBLIC, file)));
export const assets: CardAssets = {
  salt: read('salt.png'),
  sorrel: read('sorrel.png'),
  cormorant600: read('fonts/cormorant-unicase-600.ttf'),
  lexend300: read('fonts/lexend-300.ttf'),
  lexend400: read('fonts/lexend-400.ttf'),
  lexend500: read('fonts/lexend-500.ttf'),
};

export const LETTER = { width: 612, height: 792 };
export const BLOCK = { left: 45, right: 567, bottom: 27, top: 765 };
export const CARD = { across: 252, up: 144 };
// What a print shop's or office printer's unprintable edge may clip: nothing is drawn nearer the paper's edge than this.
export const PAPER_CLEARANCE = 18;

export interface Box {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
type Matrix = [number, number, number, number, number, number];

export type Vector = [number, number];

export interface Drawn {
  fills: Box[];
  clips: Box[];
  strokes: { from: [number, number]; to: [number, number] }[];
  strokeInks: number[][];
  // up and right are the directions, on the page, of the image's top and of its right-hand side.
  // textsBefore and pathsBefore count the text runs and filled paths drawn before the image.
  images: {
    name: string;
    box: Box;
    up: Vector;
    right: Vector;
    textsBefore: number;
    pathsBefore: number;
  }[];
  textRuns: number;
  operators: Set<string>;
  fillInks: number[][];
  pathInks: number[][];
  pathBoxes: Box[];
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
export const boxOf = (points: [number, number][]): Box => ({
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

export function drawn(doc: PDFDocument, pageIndex: number): Drawn {
  const result: Drawn = {
    fills: [],
    clips: [],
    strokes: [],
    strokeInks: [],
    images: [],
    textRuns: 0,
    operators: new Set(),
    fillInks: [],
    pathInks: [],
    pathBoxes: [],
    textInks: [],
  };
  let ink: number[] = [];
  const inks: number[][] = [];
  let strokeInk: number[] = [];
  const strokeInkStack: number[][] = [];
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
          strokeInkStack.push(strokeInk);
          break;
        case 'Q':
          ctm = saved.pop() ?? ctm;
          ink = inks.pop() ?? ink;
          strokeInk = strokeInkStack.pop() ?? strokeInk;
          break;
        case 'k':
          ink = [num(4), num(3), num(2), num(1)];
          break;
        case 'K':
          strokeInk = [num(4), num(3), num(2), num(1)];
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
          } else {
            result.pathInks.push(ink);
            result.pathBoxes.push(boxOf(path.flat()));
          }
          path = [];
          break;
        case 'S':
          for (const sub of path) {
            result.strokes.push({ from: sub[0], to: sub[1] });
            result.strokeInks.push(strokeInk);
          }
          path = [];
          break;
        case 'Do':
          result.images.push({
            name: operands[operands.length - 1].slice(1),
            box: boxOf([apply(ctm, 0, 0), apply(ctm, 1, 0), apply(ctm, 0, 1), apply(ctm, 1, 1)]),
            up: [Math.sign(ctm[2]) + 0, Math.sign(ctm[3]) + 0],
            right: [Math.sign(ctm[0]) + 0, Math.sign(ctm[1]) + 0],
            textsBefore: result.textRuns,
            pathsBefore: result.pathInks.length,
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

export type ImageKind = 'salt' | 'sorrel' | 'shadow';

export function imageNames(doc: PDFDocument, pageIndex: number): Record<string, ImageKind> {
  const xObjects = doc.getPage(pageIndex).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
  const names: Record<string, ImageKind> = {};
  for (const [name, ref] of xObjects.entries()) {
    const image = doc.context.lookup(ref) as PDFRawStream;
    const width = image.dict.lookup(PDFName.of('Width'), PDFNumber).asNumber();
    names[name.decodeText()] = width === 440 ? 'salt' : width === 330 ? 'sorrel' : 'shadow';
  }
  return names;
}

export function pictures(doc: PDFDocument, pageIndex: number, picture: ImageKind): Box[] {
  const names = imageNames(doc, pageIndex);
  return drawn(doc, pageIndex)
    .images.filter((image) => names[image.name] === picture)
    .map((image) => image.box);
}

export function cell({ left, right, bottom, top }: Box): string {
  const x = (left + right) / 2;
  const y = (bottom + top) / 2;
  return `${Math.floor((x - BLOCK.left - 9) / CARD.across)},${Math.floor((y - BLOCK.bottom - 9) / CARD.up)}`;
}

export const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.bottom < b.top && b.bottom < a.top;
