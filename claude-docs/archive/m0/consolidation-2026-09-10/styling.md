<!--
Archived 2026-09-10 by the doc consolidation pass over M0's working docs.
Verbatim pre-pass copy of claude-docs/styling.md. What the pass cut: port
provenance ("ported from resume-2026"), the change-by-change narrative of how
each decision was reached, and superseded intermediate states. Current truth is
the live doc; this file is write-once and is allowed to be out of date.
-->

# Styling foundation — summary

Full history: [`transcripts/styling.md`](transcripts/styling.md) ·
Decisions: [`design-decisions/`](design-decisions/)

The SCSS foundation every component builds on. Settled across M0.5–M0.8;
reshaped since by M0.32, which turned `_typography.scss` into a mixin and
added the `_layout.scss` / `_primitives.scss` partials below. The design above
this layer is deliberately unbuilt (see [`CLAUDE.md`](../CLAUDE.md), "The
design will change").

- **Modern Sass modules only** — `@use '../../scss/variables' as *;`, never
  `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever
  component needs them, never routed through a parent (§9).
- `src/scss/_variables.scss` — base colour palette and the type scale (M0.6),
  the category-group and safety tokens (M0.7), and the `$font-body` /
  `$font-heading` / `$font-mono` stacks a component `@use`s directly.
- `src/scss/_typography.scss` — a `typography-base` mixin (M0.32) for document
  prose: headings, body copy, links, lists, the `.eyebrow` overline,
  `.tight-headings`. Emits nothing on its own `@use`; `@include`d once, in
  `globals.scss`'s `body`.
- `src/scss/_layout.scss` — a `layout-base` mixin (M0.32): the bare
  `section` / `header` document-structure rules plus `.header` / `.footer`.
  Same single-`@include`-site pattern as `_typography.scss`.
- `src/scss/_primitives.scss` — a `primitives-base` mixin (M0.32): the class
  layer over M0.8's `chip()` / `badge()` mixins, plus the shapes M0.8 never
  covered — `.panel`, `.btn` / `.btn--secondary`, `.modal` / `.modal__actions`,
  `.specimen*`. Meant to be used throughout the site ahead of the milestones
  that would otherwise define these shapes — see the note below.
- `src/scss/_mixins.scss` — `modal-surface`, `chip`, `badge` (M0.8),
  `theme-dark` / `theme-light` (the two theme blocks, M0.6/M0.7),
  `semantic-tokens` (the per-theme category-group and badge custom
  properties), alongside `focus-ring`, `theme-transition`, `reduced-motion`
  and `font-smoothing-antialiased`.
- `src/app/fonts.ts` — Cormorant Unicase (weights 500/600/700) and Lexend,
  self-hosted at build time via `next/font/google`; the CSS variables it
  defines on `<html>` are what `$font-heading` / `$font-body` reference.
- `src/app/globals.scss` — the single global stylesheet, imported once by the
  root layout. Resolves the theme through `:root { @include theme-dark }`
  (dark is the default) plus a `prefers-color-scheme: light` block and an
  explicit `html[data-theme='light']` override — three states, not two — and
  is the one `@include` site for all three `*-base` mixins (`typography-base`,
  `layout-base`, `primitives-base`) on `body`.
- No `_buttons.scss` of its own — `.btn` / `.btn--secondary` live in
  `_primitives.scss`. No `_print.scss` outside M10.22 (the spell recipe view).
- Component styling adds no new hand-picked colour and no per-component design
  work beyond the tokens, mixins and the `_primitives.scss` class layer above
  — until the design is settled.
