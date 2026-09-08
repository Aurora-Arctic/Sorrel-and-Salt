# Styling foundation — summary

Full history: [`transcripts/styling.md`](transcripts/styling.md) ·
Decisions: [`design-decisions/`](design-decisions/)

The SCSS foundation every component builds on. Settled across M0.5–M0.8; the
design above the token layer is deliberately unbuilt (see
[`CLAUDE.md`](../CLAUDE.md), "The design will change").

- **Modern Sass modules only** — `@use '../../scss/variables' as *;`, never
  `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever
  component needs them, never routed through a parent (§9).
- `src/scss/_variables.scss` — base colour palette and the type scale (M0.6),
  plus the category-group and safety tokens (M0.7).
- `src/scss/_typography.scss` — typeface stacks (M0.6).
- `src/scss/_mixins.scss` — `modal-surface`, `chip`, `badge` (M0.8), alongside
  `focus-ring`, `theme-transition` and `reduced-motion`.
- `src/app/globals.scss` — the single global stylesheet; resolves the theme
  through `html[data-theme]` with a `prefers-color-scheme` fallback.
- No `_buttons.scss`. No `_print.scss` outside M10.22 (the spell recipe view).
- Component styling uses only these tokens and mixins — no new hand-picked
  colour, no per-component design work until the design is settled.
