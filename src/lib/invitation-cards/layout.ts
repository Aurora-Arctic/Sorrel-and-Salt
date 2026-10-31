import type { Font } from '@pdf-lib/fontkit';
import { BACK_LEDE, BACK_NOTE, type FrontCopy, SITE_ADDRESS, WORDMARK } from './copy';
import { baselineOffset, normalLineHeight, type TextStyle, wrap, wrapBalanced } from './text';

// Every length here is a pixel of the approved canvas's card artboard, drawn at twice
// 96 px per inch: 720 × 552 px is the 3.75 × 2.875 in bleed box, and the trim sits 24 px in.

export const ARTBOARD = { width: 720, height: 552, trimInset: 24 } as const;
export const PX_PER_INCH = 192;

export const CHALK = '#ebe4d4';
export const MUTED = '#c0baac';
export const SOOT = '#14120e';

export type FontKey = 'cormorant600' | 'lexend300' | 'lexend400' | 'lexend500';
export type CardFonts = Record<FontKey, Font>;

export interface TextItem {
  font: FontKey;
  size: number;
  letterSpacing: number;
  colour: string;
  x: number;
  /** The baseline, measured down from the artboard's top. */
  baseline: number;
  text: string;
}

export interface PictureItem {
  picture: 'salt' | 'sorrel';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QrItem {
  x: number;
  y: number;
  size: number;
}

/** The front's text column. */
export const COLUMN = { left: 72, top: 72, width: 290, height: 408 } as const;
const BODY_WIDTH = 280;
const GROUP_GAP = 18;
const FOOT_GAP = 6;

/** The headline size; `tests/lib/invitation-cards/headline.test.ts` holds every headline to two lines at it. */
export const HEADLINE_SIZE = 52;
export const HEADLINE_MAX_LINES = 2;

// The salt fills the artboard's bottom-right corner, bleed included, as the canvas draws it,
// so it runs under the words of the cards beside and below and is clipped only at the block's edge.
const SALT = { width: 460, height: 307 };

export const FRONT_PICTURE: PictureItem = {
  picture: 'salt',
  x: ARTBOARD.width - SALT.width,
  y: ARTBOARD.height - SALT.height,
  width: SALT.width,
  height: SALT.height,
};

/** The sorrel, already mirrored in its file, clear of every edge at the back's top right. */
export const BACK_PICTURE: PictureItem = {
  picture: 'sorrel',
  x: 287,
  y: 37,
  width: 392,
  height: 288,
};

/** The QR code, centred between the text column and the right trim and on the card's middle. */
export const FRONT_QR: QrItem = { x: 438, y: 185, size: 182 };

export function headlineStyle(fonts: CardFonts): TextStyle {
  return { font: fonts.cormorant600, size: HEADLINE_SIZE };
}

export function headlineLines(fonts: CardFonts, headline: string): string[] {
  return wrapBalanced(headlineStyle(fonts), headline, COLUMN.width);
}

interface Block {
  font: FontKey;
  size: number;
  /** The line box height; `undefined` is CSS `line-height: normal`. */
  lineHeight?: number;
  letterSpacing?: number;
  colour: string;
  lines: string[];
}

function blockLineHeight(fonts: CardFonts, block: Block): number {
  return block.lineHeight ?? normalLineHeight(fonts[block.font], block.size);
}

function blockHeight(fonts: CardFonts, block: Block): number {
  return blockLineHeight(fonts, block) * block.lines.length;
}

function placeBlock(fonts: CardFonts, block: Block, x: number, top: number): TextItem[] {
  const lineHeight = blockLineHeight(fonts, block);
  const offset = baselineOffset(fonts[block.font], block.size, lineHeight);
  return block.lines
    .map((text, i) => ({
      font: block.font,
      size: block.size,
      letterSpacing: block.letterSpacing ?? 0,
      colour: block.colour,
      x,
      baseline: top + i * lineHeight + offset,
      text,
    }))
    .filter((item) => item.text !== '');
}

// A flex column: each block's top is the previous block's bottom plus the gap and its own top margin.
function stack(
  fonts: CardFonts,
  blocks: { block: Block; marginTop?: number; marginBottom?: number }[],
  x: number,
  top: number,
  gap: number,
) {
  const items: TextItem[] = [];
  let y = top;
  blocks.forEach(({ block, marginTop = 0, marginBottom = 0 }, i) => {
    y += (i === 0 ? 0 : gap) + marginTop;
    items.push(...placeBlock(fonts, block, x, y));
    y += blockHeight(fonts, block) + marginBottom;
  });
  return { items, height: y - top };
}

function lexend(fonts: CardFonts, font: FontKey, size: number, letterSpacing = 0): TextStyle {
  return { font: fonts[font], size, letterSpacing };
}

/** The front's words, the canvas's `Main` artboard: the top group, and the foot pushed to the column's bottom. */
export function frontText(fonts: CardFonts, copy: FrontCopy, validUntil: string): TextItem[] {
  const tagline = lexend(fonts, 'lexend400', 19.5);
  const rest = lexend(fonts, 'lexend300', 16.5);
  const top = stack(
    fonts,
    [
      {
        block: {
          font: 'cormorant600',
          size: HEADLINE_SIZE,
          lineHeight: HEADLINE_SIZE * 1.05,
          colour: CHALK,
          lines: headlineLines(fonts, copy.headline),
        },
      },
      {
        block: {
          font: 'lexend400',
          size: 19.5,
          lineHeight: 19.5 * 1.4,
          colour: CHALK,
          lines: wrap(tagline, copy.tagline, BODY_WIDTH),
        },
        marginTop: 6,
      },
      {
        // The blank line between the two muted lines is an empty line box, as `white-space: pre-line` sets a doubled newline.
        block: {
          font: 'lexend300',
          size: 16.5,
          lineHeight: 16.5 * 1.5,
          colour: MUTED,
          lines: [
            ...wrap(rest, copy.howTo, BODY_WIDTH),
            '',
            ...wrap(rest, copy.admits, BODY_WIDTH),
          ],
        },
        marginTop: 4,
      },
    ],
    COLUMN.left,
    COLUMN.top,
    GROUP_GAP,
  );
  const footBlocks = [
    {
      block: {
        font: 'cormorant600',
        size: 22,
        letterSpacing: 22 * 0.04,
        colour: CHALK,
        lines: [WORDMARK],
      } satisfies Block,
      marginBottom: 2,
    },
    {
      block: {
        font: 'lexend500',
        size: 13,
        letterSpacing: 13 * 0.12,
        colour: MUTED,
        lines: [SITE_ADDRESS.toUpperCase()],
      } satisfies Block,
    },
    {
      block: {
        font: 'lexend500',
        size: 13,
        letterSpacing: 13 * 0.12,
        colour: MUTED,
        lines: [validUntil.toUpperCase()],
      } satisfies Block,
    },
  ];
  const footHeight = stack(fonts, footBlocks, 0, 0, FOOT_GAP).height;
  const foot = stack(
    fonts,
    footBlocks,
    COLUMN.left,
    COLUMN.top + COLUMN.height - footHeight,
    FOOT_GAP,
  );
  return [...top.items, ...foot.items];
}

/** The back's words, the canvas's `Back` artboard. */
export function backText(fonts: CardFonts, batch: string): TextItem[] {
  const lede = lexend(fonts, 'lexend300', 18);
  const words = stack(
    fonts,
    [
      {
        block: {
          font: 'cormorant600',
          size: 30,
          letterSpacing: 30 * 0.04,
          colour: CHALK,
          lines: [WORDMARK],
        },
      },
      {
        block: {
          font: 'lexend300',
          size: 18,
          lineHeight: 18 * 1.5,
          colour: CHALK,
          lines: wrap(lede, BACK_LEDE, 500),
        },
      },
      {
        block: {
          font: 'lexend500',
          size: 13,
          letterSpacing: 13 * 0.12,
          colour: MUTED,
          lines: [BACK_NOTE.toUpperCase()],
        },
      },
    ],
    72,
    72,
    12,
  ).items;
  return [...words, backBatchText(batch)];
}

/** The batch's short name, small at the foot of the text column on a back, so a card handed back names the batch to revoke. */
function backBatchText(batch: string): TextItem {
  return {
    font: 'lexend500',
    size: 13,
    letterSpacing: 13 * 0.12,
    colour: MUTED,
    x: COLUMN.left,
    baseline: COLUMN.top + COLUMN.height - 3,
    text: `BATCH ${batch.toUpperCase()}`,
  };
}

/**
 * The sheet's label for the page margin below the block, between its first two crop marks, in the page frame's points.
 * It names the batch and the sheet, so a printed sheet can be matched to the batch to revoke.
 */
export function marginText(
  batch: string,
  sheet: number,
  sheets: number,
  face: 'front' | 'back',
  block: { x: number; y: number; height: number },
  bleed: number,
): TextItem {
  return {
    font: 'lexend400',
    size: 6,
    letterSpacing: 0,
    colour: '#555555',
    x: block.x + bleed + 8,
    baseline: block.y + block.height + 10,
    text: `Batch ${batch}, sheet ${sheet} of ${sheets}, ${face === 'front' ? 'fronts' : 'backs'}`,
  };
}
