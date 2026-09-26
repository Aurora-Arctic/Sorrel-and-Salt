// Builds the mail's corner images (claude-docs/email.md, "Design"):
//
//   node scripts/email-ornaments.ts
//
// Each is one of Backdrop's grey photographs blended onto one theme's page
// colour, with the blend and opacity the site's theme gives it, and flattened
// to an opaque PNG. A mail client supports neither `mix-blend-mode` nor WebP
// reliably, so the blend happens here. Re-run it after changing a photograph
// or the palette; tests/guards/email-ornaments.test.ts fails until you do.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { EMAIL_THEMES } from '../src/emails/theme.ts';
import { ORNAMENTS, ornamentPath, type Corner } from '../src/emails/ornaments.ts';

const ROOT = join(import.meta.dirname, '..');

/** The PNG for one corner on one theme. */
export async function composeOrnament(
  corner: Corner,
  theme: keyof typeof EMAIL_THEMES,
): Promise<Buffer> {
  const { source, width, height } = ORNAMENTS[corner];
  const { page, ornament } = EMAIL_THEMES[theme];
  const size = { width: width * 2, height: height * 2 };

  // The theme's opacity, applied to the photograph's alpha before blending,
  // which is what the site's layer opacity does.
  const photo = await sharp(join(ROOT, 'src/components/Backdrop', `${source}.webp`))
    .resize({ ...size, fit: 'fill' })
    .ensureAlpha()
    .linear([1, 1, 1, ornament.opacity], [0, 0, 0, 0])
    .png()
    .toBuffer();

  return sharp({ create: { ...size, channels: 3, background: page } })
    .composite([{ input: photo, blend: ornament.blend }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

if (import.meta.main) {
  for (const corner of Object.keys(ORNAMENTS) as Corner[]) {
    for (const theme of Object.keys(EMAIL_THEMES) as (keyof typeof EMAIL_THEMES)[]) {
      const out = join(ROOT, 'public', ornamentPath(corner, theme));
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, await composeOrnament(corner, theme));
      console.log(`wrote ${out}`);
    }
  }
}
