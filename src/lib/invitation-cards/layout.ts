import type { Font } from '@pdf-lib/fontkit';
import { BACK_LEDE, BACK_NOTE, type FrontCopy, SITE_ADDRESS, WORDMARK } from './copy';
import {
  baselineOffset,
  inkExtent,
  normalLineHeight,
  textWidth,
  type TextStyle,
  wrap,
  wrapBalanced,
} from './text';

// Every length here is a pixel of the card artboard, drawn at twice 96 px per inch:
// 720 × 432 px is the 3.75 × 2.25 in bleed box, and the 3.5 × 2 in trim sits 24 px in.

export const ARTBOARD = { width: 720, height: 432, trimInset: 24 } as const;
export const PX_PER_INCH = 192;

export const CHALK = '#ebe4d4';
export const MUTED = '#c0baac';
export const SOOT = '#14120e';
/** The sheet label's grey, in the page margin. */
export const LABEL = '#555555';

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

/** The front's text column, its top left and bottom 1/8 in (24 px) inside the trim. */
export const COLUMN = { left: 48, top: 48, width: 290, height: 336 } as const;
const BODY_WIDTH = 280;
const GROUP_GAP = 18;
// Both front columns run between the safe area's top and bottom, 1/8 in inside the trim, by their inked edges.
const SAFE_TOP = COLUMN.top;
const SAFE_BOTTOM = COLUMN.top + COLUMN.height;

/** The headline size; `tests/lib/invitation-cards/headline.test.ts` holds every headline to two lines at it. */
export const HEADLINE_SIZE = 52;
export const HEADLINE_MAX_LINES = 2;

// The salt fills the artboard's bottom-right corner, bleed included, so it runs under the words of the cards
// beside and below and is clipped only at the block's edge. It is scaled with the card's height, so its bright
// bowl sits beside and below the QR code rather than under it, where it would wash the code out.
const SALT = { width: 360, height: 240 };

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

/**
 * The QR code, between the wordmark and address above it and the expiry below, each line centred on it. Across, it
 * stands where the widest expiry the date format prints, "VALID UNTIL 30 SEPTEMBER 2044" at 268.19 px, ends on the
 * safe area's right edge. Down, it stands where the column's gaps run 1 : 2 : 2 with the wordmark's top and the
 * expiry's bottom on the safe area's edges. layout.test.ts measures both.
 */
export const FRONT_QR: QrItem = { x: 446.905, y: 144.231, size: 182 };

/**
 * The soft shadow behind the code column, in the ground ink with no offset: its blur radius, 3 pt as artboard px, is
 * twice the Gaussian's standard deviation, and its opacity is the shadow's darkest point.
 */
export const SHADOW_RADIUS = (3 / 72) * PX_PER_INCH;
export const SHADOW_OPACITY = 0.5;

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

/**
 * The front's words: the top group in the text column, and beside it a column centred on the QR code, the wordmark
 * and the address above the code and the expiry below it.
 */
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
  const paragraphs = [
    headlineLines(fonts, copy.headline).length,
    wrap(tagline, copy.tagline, BODY_WIDTH).length,
    wrap(rest, copy.howTo, BODY_WIDTH).length,
    wrap(rest, copy.admits, BODY_WIDTH).length,
  ];
  return [...spread(fonts, top.items, paragraphs), ...codeColumnText(fonts, validUntil)];
}

/** The column centred on the QR code: the wordmark and the address above the code, and the expiry below it. */
export function codeColumnText(fonts: CardFonts, validUntil: string): TextItem[] {
  const line = (
    font: FontKey,
    size: number,
    letterSpacing: number,
    colour: string,
    text: string,
  ) => {
    const { above, below } = inkExtent(fonts[font], size, text);
    return { item: { font, size, letterSpacing, colour, x: 0, baseline: 0, text }, above, below };
  };
  const wordmark = line('cormorant600', 22, 22 * 0.04, CHALK, WORDMARK);
  const address = line('lexend500', 13, 13 * 0.12, MUTED, SITE_ADDRESS.toUpperCase());
  const expiry = line('lexend500', 13, 13 * 0.12, MUTED, validUntil.toUpperCase());
  // The wordmark's top and the expiry's bottom sit on the safe area's edges; the address takes a third of the room
  // between the wordmark and the code, so the gap above it is half the gap below it.
  const wordmarkBaseline = SAFE_TOP + wordmark.above;
  const wordmarkBottom = wordmarkBaseline + wordmark.below;
  const addressGap = (FRONT_QR.y - wordmarkBottom - address.above - address.below) / 3;
  const addressBaseline = wordmarkBottom + addressGap + address.above;
  const expiryBaseline = SAFE_BOTTOM - expiry.below;
  return [
    { ...wordmark.item, baseline: wordmarkBaseline },
    { ...address.item, baseline: addressBaseline },
    { ...expiry.item, baseline: expiryBaseline },
  ].map((item) => centredOnCode(fonts, item));
}

/**
 * Moves the paragraphs, `counts` lines each, so the first's inked top sits on the safe area's top and the last's inked
 * bottom on its bottom. The room gained is shared between the gaps in proportion to their sizes, so the rhythm stays
 * and the lines within a paragraph keep their spacing.
 */
function spread(fonts: CardFonts, items: TextItem[], counts: number[]): TextItem[] {
  const ink = (item: TextItem) => inkExtent(fonts[item.font], item.size, item.text);
  let start = 0;
  const groups = counts.map((count) => items.slice(start, (start += count)));
  const tops = groups.map((group) => group[0].baseline - ink(group[0]).above);
  const bottoms = groups.map((group) => {
    const last = group[group.length - 1];
    return last.baseline + ink(last).below;
  });
  const gaps = tops.slice(1).map((top, i) => top - bottoms[i]);
  const room = SAFE_BOTTOM - SAFE_TOP - (bottoms[bottoms.length - 1] - tops[0]);
  const stretch = room / gaps.reduce((sum, gap) => sum + gap, 0);
  let shift = SAFE_TOP - tops[0];
  return groups.flatMap((group, i) => {
    if (i > 0) shift += gaps[i - 1] * stretch;
    return group.map((item) => ({ ...item, baseline: item.baseline + shift }));
  });
}

// The inked width leaves out the letter spacing set after the last letter, so a spaced line centres on what prints.
function centredOnCode(fonts: CardFonts, item: TextItem): TextItem {
  const width =
    textWidth(
      { font: fonts[item.font], size: item.size, letterSpacing: item.letterSpacing },
      item.text,
    ) - item.letterSpacing;
  return { ...item, x: FRONT_QR.x + FRONT_QR.size / 2 - width / 2 };
}

// The sorrel's leftmost inked column beside the back's sentence, where it prints 5% of the way from the ground to
// chalk; the picture's rectangle starts further left, where it has faded to nothing. layout.test.ts measures it.
const SORREL_INKED_LEFT = 455;
// The sentence wraps at one width, 1/16 in short of that edge, so no line runs over the sorrel or its stem.
const BACK_WORDS_WIDTH = SORREL_INKED_LEFT - PX_PER_INCH / 16 - COLUMN.left;

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
          lines: wrapBalanced(lede, BACK_LEDE, BACK_WORDS_WIDTH),
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
    COLUMN.left,
    COLUMN.top,
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
 * The sheet's label for the page margin below the block, between its first two crop marks, at `x` and `baseline` in the
 * page frame's points. It names the batch and the sheet, so a printed sheet can be matched to the batch to revoke.
 */
export function marginText(
  batch: string,
  sheet: number,
  sheets: number,
  face: 'front' | 'back',
  { x, baseline }: { x: number; baseline: number },
): TextItem {
  return {
    font: 'lexend400',
    size: 5,
    letterSpacing: 0,
    colour: LABEL,
    x,
    baseline,
    text: `Batch ${batch}, sheet ${sheet} of ${sheets}, ${face === 'front' ? 'fronts' : 'backs'}`,
  };
}
