import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The card's three static TrueType faces, read from disk at module scope rather than bundled, since together
// they pass the image route's 500 KB bundle limit; the renderer cannot read a variable font's axes
// (claude-docs/share-card.md, "Fonts").
const [cormorant700, lexend300, lexend400] = await Promise.all([
  // Each path whole, so the build's file tracing can follow it to the one file.
  readFile(join(process.cwd(), 'src/lib/share-card/fonts/cormorant-unicase-700.ttf')),
  readFile(join(process.cwd(), 'src/lib/share-card/fonts/lexend-300.ttf')),
  readFile(join(process.cwd(), 'src/lib/share-card/fonts/lexend-400.ttf')),
]);

/** The display face, for the site's name and the entry's. */
export const DISPLAY = 'Cormorant Unicase';
/** The body face, for every other line. */
export const BODY = 'Lexend';

export const SHARE_CARD_FONTS = [
  { name: DISPLAY, data: cormorant700, weight: 700, style: 'normal' },
  { name: BODY, data: lexend300, weight: 300, style: 'normal' },
  { name: BODY, data: lexend400, weight: 400, style: 'normal' },
] as const;
