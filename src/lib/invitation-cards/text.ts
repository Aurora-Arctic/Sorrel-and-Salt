import type { Font } from '@pdf-lib/fontkit';

export interface TextStyle {
  font: Font;
  size: number;
  letterSpacing?: number;
}

/** So the PDF can put the difference in a TJ array. */
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

export function inkedWidth({ font, size, letterSpacing = 0 }: TextStyle, text: string): number {
  const scale = size / font.unitsPerEm;
  const { glyphs, positions } = font.layout(text);
  const before = positions
    .slice(0, -1)
    .reduce((sum, position) => sum + position.xAdvance * scale + letterSpacing, 0);
  return before + glyphs[glyphs.length - 1].bbox.maxX * scale;
}

export function baselineOffset(font: Font, size: number, lineHeight: number): number {
  const ascent = (font.ascent / font.unitsPerEm) * size;
  const descent = (-font.descent / font.unitsPerEm) * size;
  return (lineHeight - (ascent + descent)) / 2 + ascent;
}

export function normalLineHeight(font: Font, size: number): number {
  return ((font.ascent - font.descent + font.lineGap) / font.unitsPerEm) * size;
}

// A line's width leaves out the space it breaks at, as a browser hangs a trailing space past the line's end.
function lineWidth(style: TextStyle, words: string[]): number {
  return textWidth(style, words.join(' '));
}

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

/** CSS `text-wrap: balance`. A binary search over the widths of runs of words, since trying every set of breaks grows too fast for a paragraph. */
export function wrapBalanced(style: TextStyle, text: string, maxWidth: number): string[] {
  const greedy = wrap(style, text, maxWidth);
  if (greedy.length < 2) return greedy;
  const words = text.split(' ').filter((word) => word !== '');
  const widths = new Set<number>();
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= words.length; end += 1) {
      const width = lineWidth(style, words.slice(start, end));
      if (width > maxWidth) break;
      widths.add(width);
    }
  }
  const fits = (width: number) => {
    const lines = wrap(style, text, width);
    return lines.length <= greedy.length && lines.every((line) => textWidth(style, line) <= width);
  };
  const sorted = [...widths].sort((a, b) => a - b);
  let low = 0;
  let high = sorted.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (fits(sorted[middle])) high = middle;
    else low = middle + 1;
  }
  return wrap(style, text, sorted[low]);
}

export function inkExtent(
  font: Font,
  size: number,
  text: string,
): { above: number; below: number } {
  const scale = size / font.unitsPerEm;
  const boxes = font.layout(text).glyphs.map((glyph) => glyph.bbox);
  return {
    above: Math.max(...boxes.map((box) => box.maxY)) * scale,
    below: -Math.min(...boxes.map((box) => box.minY)) * scale,
  };
}
