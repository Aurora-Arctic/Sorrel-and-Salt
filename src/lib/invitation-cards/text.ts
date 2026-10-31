import type { Font } from '@pdf-lib/fontkit';

/** A run of text set in one font at one size, measured as a browser measures it. */
export interface TextStyle {
  font: Font;
  /** The font size, in the unit every width and position is given in. */
  size: number;
  /** Extra space after every character, as CSS `letter-spacing` adds it. */
  letterSpacing?: number;
}

/** A glyph's kerned advance beside its plain one, in font units, so the PDF can put the difference in a TJ array. */
export interface GlyphAdvance {
  advance: number;
  kerned: number;
}

// The browser's shaping (ligatures, kerning) is fontkit's default features, which pdf-lib also uses to pick the glyphs it embeds.
export function glyphAdvances(font: Font, text: string): GlyphAdvance[] {
  const run = font.layout(text);
  return run.glyphs.map((glyph, i) => ({
    advance: glyph.advanceWidth,
    kerned: run.positions[i].xAdvance,
  }));
}

export function textWidth({ font, size, letterSpacing = 0 }: TextStyle, text: string): number {
  const units = glyphAdvances(font, text).reduce((sum, glyph) => sum + glyph.kerned, 0);
  return (units / font.unitsPerEm) * size + letterSpacing * [...text].length;
}

/** Where the baseline of a line sits below the line box's top, by CSS's half-leading rule. */
export function baselineOffset(font: Font, size: number, lineHeight: number): number {
  const ascent = (font.ascent / font.unitsPerEm) * size;
  const descent = (-font.descent / font.unitsPerEm) * size;
  return (lineHeight - (ascent + descent)) / 2 + ascent;
}

/** CSS `line-height: normal`: the font's ascent, descent and line gap. */
export function normalLineHeight(font: Font, size: number): number {
  return ((font.ascent - font.descent + font.lineGap) / font.unitsPerEm) * size;
}

// A line's width leaves out the space it breaks at, as a browser hangs a trailing space past the line's end.
function lineWidth(style: TextStyle, words: string[]): number {
  return textWidth(style, words.join(' '));
}

/** Breaks text at spaces as a browser does: each line takes every word that still fits. A word wider than the line stands alone. */
export function wrap(style: TextStyle, text: string, maxWidth: number): string[] {
  const words = text.split(' ').filter((word) => word !== '');
  const lines: string[][] = [];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if (current && lineWidth(style, [...current, word]) <= maxWidth) current.push(word);
    else lines.push([word]);
  }
  return lines.map((line) => line.join(' '));
}

/**
 * CSS `text-wrap: balance`: as many lines as the plain wrap, with the breaks that make the widest line narrowest.
 * Tries every set of breaks, which is cheap for a headline of a few words.
 */
export function wrapBalanced(style: TextStyle, text: string, maxWidth: number): string[] {
  const greedy = wrap(style, text, maxWidth);
  const words = text.split(' ').filter((word) => word !== '');
  if (greedy.length < 2) return greedy;
  let best = greedy;
  let bestWidest = Math.max(...greedy.map((line) => textWidth(style, line)));
  const search = (start: number, linesLeft: number, taken: string[]) => {
    if (linesLeft === 1) {
      const last = words.slice(start).join(' ');
      const lines = [...taken, last];
      const widest = Math.max(...lines.map((line) => textWidth(style, line)));
      if (widest <= maxWidth && widest < bestWidest) {
        best = lines;
        bestWidest = widest;
      }
      return;
    }
    for (let end = start + 1; end <= words.length - linesLeft + 1; end += 1) {
      search(end, linesLeft - 1, [...taken, words.slice(start, end).join(' ')]);
    }
  };
  search(0, greedy.length, []);
  return best;
}
