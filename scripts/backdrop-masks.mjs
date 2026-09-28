// Builds the images beside `Backdrop` (claude-docs/components/backdrop.md, "The
// image is tone and shape, not a picture") from a source photograph, which is
// not committed:
//
//   node scripts/backdrop-masks.mjs <name> <source image> [preview dir]
//
// A photograph of a subject on a dark, plain ground becomes a WebP whose RGB is
// the subject's levelled luminance — grey, no colour — and whose alpha is its
// presence, so the ground is transparent. The page then blends it: `screen` on
// the dark theme lifts the bright parts, `multiply` on the light theme sinks the
// dark parts, and the photograph's own tones survive both ways. The tone curve
// clips no highlights and lifts the mid-tones with a gamma below one, where
// grain and leaf texture live. Levelling alone still loses a subject only a
// little brighter than the ground (wood, leaves), so chroma — the one thing a
// plain ground lacks — is screened under the luminance: a floor the subject
// cannot fade below, with the luminance still varying above it, and low
// enough that a lifted leaf still sits darker than the shadow it casts.
//
// Presence is spatial, not tonal. Levelling makes the ground transparent, but
// it would also make every shadow inside the subject transparent — the pocket
// under the salt, the gaps between leaves — and on parchment transparent is the
// lightest thing on the page, so those shadows came out inverted. The ground
// is therefore the region of empty pixels connected to the image border, and
// an empty pocket enclosed by the subject keeps full presence and renders as
// the dark shadow it is.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const CONFIGS = {
  // Salt bowl and spoon on slate; sits bottom-right. Only the left edge fades,
  // and it stops short of the loose grains: the bowl reaches the top of the
  // frame and keeps its rim.
  'salt-spoon': {
    ground: { left: 0, top: 0, width: 300, height: 300 },
    feather: { left: 0.2 },
    // A wide range, so the lift varies with the grain rather than saturating
    // across the whole bowl into one flat tone.
    chroma: { floor: 18, range: 90, gain: 0.3 },
  },
  // Sorrel leaves on a plate on dark boards; sits top-left. No feather: the
  // levelled ground is already transparent, and every edge the subject has is
  // its own. The chroma floor sits above the boards' own warmth and below a
  // shadowed leaf's green, so the leaf stays solid on its dark side and the
  // wood stays out.
  'sorrel-plate': {
    ground: { left: 720, top: 450, width: 280, height: 290 },
    feather: {},
    // Measured: the leaf levels to 0.37 and its shadow on the plate to 0.64, so
    // a lift above 0.43 would put the leaf over its own shadow.
    chroma: { floor: 24, range: 40, gain: 0.3 },
  },
};
const OUTPUT_WIDTH = 1000;
// Below one lifts the mid-tones; the ground is already at zero, so it costs no
// separation there.
const GAMMA = 0.75;
// Presence saturates well below full tone, so a mid-toned subject is fully
// there and only the levelled ground and the softest edges stay translucent.
const PRESENCE_GAIN = 2.5;
// Below this a pixel counts as empty for the ground fill.
const EMPTY = 0.12;
// A present blob this small and this dark is a knot or a droplet on the ground
// that levelling let through, never a piece of the subject. The tone cut is
// low because a loose salt grain is small too, and its shadowed side pulls
// its mean well under the salt's own brightness.
const SPECK_AREA = 2000;
const SPECK_TONE = 0.35;
// What the previews reproduce: the theme where each blend layer is visible, at
// its opacity — `--ornament-screen` on dark, `--ornament-multiply` on light
// (src/scss/_mixins.scss).
const THEMES = {
  dark: { page: [0x14, 0x12, 0x0e], blend: 'screen', strength: 0.3 },
  light: { page: [0xef, 0xe9, 0xda], blend: 'multiply', strength: 0.4 },
};

const [name, source, previewDir] = process.argv.slice(2);
const config = CONFIGS[name];
if (!config || !source) {
  console.error(
    `usage: node scripts/backdrop-masks.mjs <${Object.keys(CONFIGS).join('|')}> <source image> [preview dir]`,
  );
  process.exit(1);
}

const src = sharp(source);
const { width: W, height: H } = await src.metadata();

// Black point: the ground's 99.5th-percentile luminance, not its maximum — a
// single bright speck in the sample would otherwise blank the whole image.
const ground = await src.clone().extract(config.ground).grayscale().raw().toBuffer();
const sorted = Array.from(ground).sort((p, q) => p - q);
const black = Math.min(200, sorted[Math.floor(sorted.length * 0.995)]);
const gain = 255 / (255 - black);
const lum = await src
  .clone()
  .grayscale()
  .linear(gain, -black * gain)
  .raw()
  .toBuffer();
const rgb = await src.clone().raw().toBuffer();

// The feather: one linear gradient per named edge, multiplied together. The
// span is the fraction of the image the fade occupies, measured from that edge.
const stops = (edge, span) =>
  edge === 'left' || edge === 'top'
    ? `<stop offset="0" stop-color="#000"/><stop offset="${span}" stop-color="#fff"/>`
    : `<stop offset="${1 - span}" stop-color="#fff"/><stop offset="1" stop-color="#000"/>`;
let fade = Buffer.alloc(W * H, 255);
for (const [edge, span] of Object.entries(config.feather)) {
  const vertical = edge === 'top' || edge === 'bottom';
  const gradient = `<linearGradient id="g" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops(edge, span)}</linearGradient>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${gradient}</defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  const layer = await sharp(Buffer.from(svg)).grayscale().raw().toBuffer();
  fade = Buffer.from(fade.map((v, p) => Math.round((v * layer[p]) / 255)));
}

const { floor, range, gain: chromaGain } = config.chroma;
const tone = new Float32Array(W * H);
const presence = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = rgb[i * 3];
  const g = rgb[i * 3 + 1];
  const b = rgb[i * 3 + 2];
  const chroma = Math.min(1, Math.max(0, (Math.max(r, g, b) - Math.min(r, g, b) - floor) / range));
  const lift = chroma * chromaGain;
  const l = (lum[i] / 255) ** GAMMA;
  tone[i] = lift + l * (1 - lift);
  // Full chroma, not the capped lift: a dark leaf is wholly present even
  // though its tone stays low.
  presence[i] = Math.min(1, Math.max(l, chroma) * PRESENCE_GAIN);
}

// The ground fill: empty pixels reachable from the border are ground; the rest
// are pockets inside the subject and stay.
const exterior = new Uint8Array(W * H);
const queue = [];
const seed = (i) => {
  if (!exterior[i] && presence[i] < EMPTY) {
    exterior[i] = 1;
    queue.push(i);
  }
};
for (let x = 0; x < W; x++) {
  seed(x);
  seed((H - 1) * W + x);
}
for (let y = 0; y < H; y++) {
  seed(y * W);
  seed(y * W + W - 1);
}
for (let head = 0; head < queue.length; head++) {
  const i = queue[head];
  const x = i % W;
  if (x > 0) seed(i - 1);
  if (x < W - 1) seed(i + 1);
  if (i >= W) seed(i - W);
  if (i < W * (H - 1)) seed(i + W);
}
// Everything that is not ground is wholly present. A tonal presence would
// leave a shadow pixel just over the empty cut at a tenth of an alpha while
// its neighbour just under it was filled to one — a shadow speckled with the
// page. Only the one-pixel band against the ground keeps its partial
// presence, so the outline stays anti-aliased.
for (let i = 0; i < W * H; i++) {
  if (exterior[i]) continue;
  const x = i % W;
  const bordersGround =
    (x > 0 && exterior[i - 1]) ||
    (x < W - 1 && exterior[i + 1]) ||
    (i >= W && exterior[i - W]) ||
    (i < W * (H - 1) && exterior[i + W]);
  if (!bordersGround) presence[i] = 1;
}

// The speck filter: connected present components, dropped when small and dark.
const seen = new Uint8Array(W * H);
for (let start = 0; start < W * H; start++) {
  if (seen[start] || presence[start] < EMPTY) continue;
  const component = [start];
  seen[start] = 1;
  let toneSum = 0;
  for (let head = 0; head < component.length; head++) {
    const i = component[head];
    toneSum += tone[i];
    const x = i % W;
    for (const j of [
      x > 0 ? i - 1 : -1,
      x < W - 1 ? i + 1 : -1,
      i >= W ? i - W : -1,
      i < W * (H - 1) ? i + W : -1,
    ]) {
      if (j >= 0 && !seen[j] && presence[j] >= EMPTY) {
        seen[j] = 1;
        component.push(j);
      }
    }
  }
  if (component.length < SPECK_AREA && toneSum / component.length < SPECK_TONE) {
    for (const i of component) presence[i] = 0;
  }
}

for (let i = 0; i < W * H; i++) presence[i] = (presence[i] * fade[i]) / 255;

const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const grey = Math.round(tone[i] * 255);
  rgba[i * 4] = grey;
  rgba[i * 4 + 1] = grey;
  rgba[i * 4 + 2] = grey;
  rgba[i * 4 + 3] = Math.round(presence[i] * 255);
}
const out = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .resize({ width: OUTPUT_WIDTH })
  .webp({ quality: 82, alphaQuality: 90, effort: 6 })
  .toBuffer();
const target = join('src', 'components', 'Backdrop', `${name}.webp`);
writeFileSync(target, out);
console.log(
  `${target}: ${out.length} bytes, black point ${black}, ${W}x${H} → ${OUTPUT_WIDTH} wide`,
);

// Previews apply each theme's blend and strength over its page colour, so a
// retune can be judged without a browser.
if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  for (const [theme, { page, blend, strength }] of Object.entries(THEMES)) {
    const px = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      const v = tone[i];
      const a = presence[i] * strength;
      for (let c = 0; c < 3; c++) {
        const p = page[c] / 255;
        const blended = blend === 'screen' ? 1 - (1 - p) * (1 - v) : p * v;
        px[i * 3 + c] = Math.round((p * (1 - a) + blended * a) * 255);
      }
    }
    await sharp(px, { raw: { width: W, height: H, channels: 3 } })
      .resize({ width: 900 })
      .png()
      .toFile(join(previewDir, `${name}-${theme}.png`));
  }
  console.log(`previews in ${previewDir}`);
}
