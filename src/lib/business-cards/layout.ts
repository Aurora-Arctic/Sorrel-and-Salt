import { BACK_LEDE, SITE_ADDRESS, WORDMARK } from '../invitation-cards/copy';
import {
  ARTBOARD,
  CHALK,
  type CardFonts,
  type FontKey,
  MUTED,
  type PictureItem,
  PX_PER_INCH,
  SAFE_RIGHT,
  SORREL_BRIGHT,
  type TextItem,
} from '../invitation-cards/layout';
import { inkedWidth, textWidth, wrap } from '../invitation-cards/text';
import type { BusinessCardDetails, RuleItem } from './types';

// Every length here is a pixel of the card artboard the invitation cards use: 192 to the inch, 720 × 432 px for the bleed
// box, the trim 24 px in. Down the card, each length is measured from the artboard's top.

const PT = PX_PER_INCH / 72;
const TRIM_TOP = ARTBOARD.trimInset;
const TRIM_BOTTOM = ARTBOARD.height - ARTBOARD.trimInset;
const LEFT = ARTBOARD.trimInset + 14 * PT;

const NAME = { font: 'cormorant600', size: 15 * PT, baseline: TRIM_TOP + 36 * PT } as const;
const RULE = { y: TRIM_TOP + 48 * PT, weight: 0.6 * PT } as const;
const CONTACT = { font: 'lexend300', size: 7.5 * PT } as const;
const EMAIL_BASELINE = TRIM_TOP + 64 * PT;
const PHONE_BASELINE = TRIM_TOP + 76 * PT;
const WORDMARK_LINE = {
  font: 'cormorant600',
  size: 8 * PT,
  letterSpacing: 8 * PT * 0.04,
  baseline: TRIM_BOTTOM - 32 * PT,
} as const;
const ADDRESS_LINE = {
  font: 'lexend500',
  size: 5 * PT,
  letterSpacing: 5 * PT * 0.12,
  baseline: TRIM_BOTTOM - 21 * PT,
} as const;
const LEDE = { font: 'lexend300', size: 7 * PT, leading: 11 * PT, width: 176 * PT } as const;

export const FRONT_PICTURE: PictureItem = {
  picture: 'salt',
  x: ARTBOARD.width - 460,
  y: ARTBOARD.height - 307,
  width: 460,
  height: 307,
};

export const BACK_PICTURE: PictureItem = {
  picture: 'sorrel',
  x: 287 + 392 - 392 * 0.8,
  y: 37,
  width: 392 * 0.8,
  height: 288 * 0.8,
};

// A line's width grows with its size, so one division finds the size that ends its ink on the safe area's right edge.
function fitted(
  fonts: CardFonts,
  font: FontKey,
  size: number,
  text: string,
  colour: string,
  baseline: number,
): TextItem {
  const style = { font: fonts[font], size };
  const width = Math.max(textWidth(style, text), inkedWidth(style, text));
  const room = SAFE_RIGHT - LEFT;
  const scaled = width > room ? (size * room) / width : size;
  return { font, size: scaled, letterSpacing: 0, colour, x: LEFT, baseline, text };
}

export function frontLayout(
  fonts: CardFonts,
  { name, email, phone }: BusinessCardDetails,
): { text: TextItem[]; rule: RuleItem } {
  const nameItem = fitted(fonts, NAME.font, NAME.size, name, CHALK, NAME.baseline);
  const text: TextItem[] = [
    nameItem,
    fitted(fonts, CONTACT.font, CONTACT.size, email, MUTED, EMAIL_BASELINE),
    fitted(fonts, CONTACT.font, CONTACT.size, phone, MUTED, PHONE_BASELINE),
    { ...WORDMARK_LINE, colour: CHALK, x: LEFT, text: WORDMARK },
    { ...ADDRESS_LINE, colour: MUTED, x: LEFT, text: SITE_ADDRESS.toUpperCase() },
  ];
  const rule: RuleItem = {
    x: LEFT,
    y: RULE.y,
    width: textWidth({ font: fonts[NAME.font], size: nameItem.size }, name),
    weight: RULE.weight,
    colour: SORREL_BRIGHT,
  };
  return { text, rule };
}

export function backText(fonts: CardFonts): TextItem[] {
  const lines = wrap({ font: fonts[LEDE.font], size: LEDE.size }, BACK_LEDE, LEDE.width);
  const last = TRIM_BOTTOM - 18 * PT;
  return lines.map((text, i) => ({
    font: LEDE.font,
    size: LEDE.size,
    letterSpacing: 0,
    colour: MUTED,
    x: LEFT,
    baseline: last - (lines.length - 1 - i) * LEDE.leading,
    text,
  }));
}
