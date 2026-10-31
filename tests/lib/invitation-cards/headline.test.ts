import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { FRONT_COPY } from '@/lib/invitation-cards/copy';
import {
  type CardFonts,
  COLUMN,
  HEADLINE_MAX_LINES,
  HEADLINE_SIZE,
  headlineLines,
  headlineStyle,
} from '@/lib/invitation-cards/layout';
import { textWidth } from '@/lib/invitation-cards/text';

const FONTS = path.join(process.cwd(), 'public/invitation-cards/fonts');
const font = (file: string) => fontkit.create(readFileSync(path.join(FONTS, file)));
const fonts: CardFonts = {
  cormorant600: font('cormorant-unicase-600.ttf'),
  lexend300: font('lexend-300.ttf'),
  lexend400: font('lexend-400.ttf'),
  lexend500: font('lexend-500.ttf'),
};

describe('card headlines', () => {
  it.each(FRONT_COPY.map((copy) => copy.headline))(
    'lays "%s" out in at most two lines inside the column',
    (headline) => {
      const lines = headlineLines(fonts, headline);
      expect(lines.length).toBeLessThanOrEqual(HEADLINE_MAX_LINES);
      expect(lines.join(' ')).toBe(headline);
      for (const line of lines)
        expect(textWidth(headlineStyle(fonts), line)).toBeLessThanOrEqual(COLUMN.width);
    },
  );

  it('measures at the size the builder sets', () => {
    expect(headlineStyle(fonts).size).toBe(HEADLINE_SIZE);
    // A headline that cannot fit in two lines is reported as three, so the rule above catches a text added later.
    expect(headlineLines(fonts, 'Knock Three Times Upon the Kettle Lid').length).toBeGreaterThan(
      HEADLINE_MAX_LINES,
    );
  });
});
