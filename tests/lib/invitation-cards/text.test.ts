import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { BACK_LEDE, FRONT_COPY } from '@/lib/invitation-cards/copy';
import { HEADLINE_SIZE } from '@/lib/invitation-cards/layout';
import { textWidth, type TextStyle, wrap, wrapBalanced } from '@/lib/invitation-cards/text';

const FONTS = path.join(process.cwd(), 'public/invitation-cards/fonts');
const font = (file: string) => fontkit.create(readFileSync(path.join(FONTS, file)));
const headline: TextStyle = { font: font('cormorant-unicase-600.ttf'), size: HEADLINE_SIZE };
const lede: TextStyle = { font: font('lexend-300.ttf'), size: 18 };

const cases = [
  ...FRONT_COPY.map((copy) => [copy.headline, headline, 290] as const),
  [BACK_LEDE, lede, 227] as const,
];

describe('wrapBalanced', () => {
  it.each(cases)(
    'breaks "%s" into the plain wrap’s line count at the narrowest widest line',
    (text, style, maxWidth) => {
      const lines = wrapBalanced(style, text, maxWidth);
      const widest = Math.max(...lines.map((line) => textWidth(style, line)));
      expect(lines.join(' ')).toBe(text);
      expect(lines).toHaveLength(wrap(style, text, maxWidth).length);
      expect(widest).toBeLessThanOrEqual(maxWidth);
      // Any narrower measure takes another line, or leaves a word too wide for it standing alone.
      const narrower = wrap(style, text, widest - 0.01);
      const overflows = narrower.some((line) => textWidth(style, line) > widest - 0.01);
      expect(narrower.length > lines.length || overflows).toBe(true);
    },
  );
});
