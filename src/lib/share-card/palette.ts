// The dark theme's colours the share card is drawn in, as hexes, since the image renderer reads no
// stylesheet; each is the `src/scss/_variables.scss` token named beside it, a derived one as Sass compiles it.
export const PALETTE = {
  /** `$soot`, the dark page. */
  soot: '#14120e',
  /** `$soot-raised`, the dark card surface. */
  sootRaised: '#1f1c16',
  /** `$chalk`, the dark body text. */
  chalk: '#ebe4d4',
  /** `$chalk-muted`, the dark muted text. */
  chalkMuted: '#c0baac',
  /** `$sorrel-bright`, the dark theme's accent. */
  sorrelBright: '#88b669',
} as const;
