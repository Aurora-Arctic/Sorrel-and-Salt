# Styling foundation — transcript

Append-only. Newest entry at the bottom. Summary:
[`../styling.md`](../styling.md).

## 2026 — M0.5–M0.8 · the SCSS foundation

- **M0.5 — foundational Sass partials.** `src/scss/_variables.scss`,
  `_typography.scss` and `_mixins.scss` created and wired through `@use`. §9 of
  the design doc names the module system (no `@import`) and the "partials are
  `@use`'d directly, never through a parent" rule.
- **M0.6 — typefaces and base palette.** Typeface stacks and the base colour
  palette chosen; §9 amended so the app has one global stylesheet rather than
  per-route entry points. Rationale:
  [`../design-decisions/m0.6-typography-and-palette.md`](../design-decisions/m0.6-typography-and-palette.md).
- **M0.7 — category and safety tokens.** `category-group()` and the safety /
  low-stock tokens added; chip and badge _shapes_ settled against real contrast
  ratios so a treatment that cannot hold 4.5:1 is caught now, not later. The
  dark-mode safety ink was un-bleached. Rationale:
  [`../design-decisions/m0.7-category-and-safety-tokens.md`](../design-decisions/m0.7-category-and-safety-tokens.md).
- **M0.8 — modal, chip and badge mixins.** `modal-surface`, `chip` and `badge`
  written into `_mixins.scss`; every value they emit routes through an M0.6/M0.7
  token, so the M0.7 contrast tables stay the record. Rationale:
  [`../design-decisions/m0.8-modal-chip-badge-mixins.md`](../design-decisions/m0.8-modal-chip-badge-mixins.md).
