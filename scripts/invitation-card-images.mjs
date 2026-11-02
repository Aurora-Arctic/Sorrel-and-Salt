// Bakes the invitation card pictures from the email illustrations (claude-docs/invitation-cards/print.md, "Pictures"):
//
//   node scripts/invitation-card-images.mjs
//
// Each picture's edges fade into the card through its alpha channel, because a PDF has no CSS mask: alpha rises 0 → 1 over the top 20% and over
// the outer 14% of each side, the two ramps multiplied, as the canvas's intersected linear gradients do.
import sharp from 'sharp';

const PICTURES = [
  {
    from: 'public/email/images/salt-dark.png',
    to: 'public/invitation-cards/salt.png',
    mirror: false,
  },
  // The back shows the sorrel mirrored, so the dish sits behind the end of the text and the stem points down and in.
  {
    from: 'public/email/images/sorrel-dark.png',
    to: 'public/invitation-cards/sorrel.png',
    mirror: true,
  },
];

const TOP_FADE = 0.2;
const SIDE_FADE = 0.14;

// Samples each ramp at the pixel's centre, as a browser does when it rasterises a gradient.
function maskAt(x, y, width, height) {
  const u = (x + 0.5) / width;
  const v = (y + 0.5) / height;
  const top = Math.min(1, v / TOP_FADE);
  const sides = Math.min(1, u / SIDE_FADE, (1 - u) / SIDE_FADE);
  return top * sides;
}

for (const picture of PICTURES) {
  let image = sharp(picture.from).removeAlpha();
  if (picture.mirror) image = image.flop();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      rgba[i * 4] = data[i * 3];
      rgba[i * 4 + 1] = data[i * 3 + 1];
      rgba[i * 4 + 2] = data[i * 3 + 2];
      rgba[i * 4 + 3] = Math.round(255 * maskAt(x, y, width, height));
    }
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(picture.to);
  console.log(`${picture.to}: ${width}×${height}`);
}
