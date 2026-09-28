import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { EMAIL_THEMES } from '@/emails/theme';
import { ORNAMENTS, ornamentPath } from '@/emails/ornaments';
import { fromRoot } from '../support/paths';

// The mail's corner images are Backdrop's photographs blended onto each
// theme's page colour ahead of time, because mail clients support neither
// `mix-blend-mode` nor WebP reliably. Regenerating them is
// `node scripts/email-ornaments.ts`; this fails when the committed files are
// not what the script produces from today's photographs and palette.

const script = (await import(pathToFileURL(fromRoot('scripts/email-ornaments.ts')).href)) as {
  composeOrnament: (
    corner: keyof typeof ORNAMENTS,
    theme: keyof typeof EMAIL_THEMES,
  ) => Promise<Buffer>;
};

// libvips resizes and blends through whichever SIMD path the CPU offers, and
// the x64 and arm64 paths round a few channels one step apart, so the pixels
// are compared within this rather than byte for byte. A changed photograph or
// palette moves them by far more; a palette change alone is also caught
// exactly, by the bare-corner check below.
const ROUNDING = 2;

const THEMES = Object.keys(EMAIL_THEMES) as (keyof typeof EMAIL_THEMES)[];
const CORNERS = Object.keys(ORNAMENTS) as (keyof typeof ORNAMENTS)[];
const CASES = CORNERS.flatMap((corner) => THEMES.map((theme) => [corner, theme] as const));

async function pixels(image: ReturnType<typeof sharp>) {
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

/** The largest per-channel difference and how many channels differ at all. */
function compare(a: Buffer, b: Buffer) {
  let max = 0;
  let differing = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = Math.abs(a[i] - b[i]);
    if (diff > 0) differing += 1;
    if (diff > max) max = diff;
  }
  return { max, differing };
}

describe('email ornament images', () => {
  it.each(CASES)('%s on %s is what the script produces', async (corner, theme) => {
    const committed = await pixels(sharp(fromRoot('public', ornamentPath(corner, theme))));
    const fresh = await pixels(sharp(await script.composeOrnament(corner, theme)));

    expect(committed.info).toMatchObject({ width: fresh.info.width, height: fresh.info.height });
    const { max, differing } = compare(committed.data, fresh.data);
    expect(
      max,
      `${differing} of ${fresh.data.length} channels differ, by up to ${max}; ` +
        'run `node scripts/email-ornaments.ts` if the photograph or palette changed',
    ).toBeLessThanOrEqual(ROUNDING);
  });

  it.each(CASES)(
    '%s on %s is opaque, at twice its display size, on the page colour',
    async (corner, theme) => {
      const { data, info } = await pixels(sharp(fromRoot('public', ornamentPath(corner, theme))));

      expect(info.channels).toBe(3);
      expect(info.width).toBe(ORNAMENTS[corner].width * 2);
      expect(info.height).toBe(ORNAMENTS[corner].height * 2);
      // The corner away from the subject is bare page, so the image has no visible edge.
      const bare = corner === 'sorrel' ? info.width * info.height - 1 : 0;
      const rgb = [...data.subarray(bare * 3, bare * 3 + 3)]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('');
      expect(`#${rgb}`).toBe(EMAIL_THEMES[theme].page);
    },
  );
});
