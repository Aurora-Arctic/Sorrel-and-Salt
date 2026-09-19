# Styling foundation — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

The SCSS foundation every component builds on. The design above this layer is
deliberately unbuilt (see [`CLAUDE.md`](../CLAUDE.md), "The design will change").

## Binding rules

- **Modern Sass modules only** — `@use '../../scss/variables' as *;`, never
  `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever
  component needs them, never routed through a parent (§9).
- **Reach tokens through functions, not bare variables** — `category-group('mind')`,
  `badge-token('safety', 'fill')`, `$text-on-color`. A typo is then a compile
  error rather than a silently wrong colour.
- **WCAG AA 4.5:1 is the floor for every token, in both themes**, and several
  pairings sit close to it (`wellbeing` at 4.74 against the light page,
  `--secondary` at 4.80 against the dark card). Re-measure when changing a
  colour; do not assume headroom.
- **Only `_variables.scss` and the theme mixins may name a raw hue.** Needing a
  colour that is not a token means adding a token, not inlining one.
- **The per-theme saturation lifts (+14% dark, +50% light) stay separate.**
  Collapsing them to one number re-muds the light theme.
- **Never wash a chip or badge ground with its own group colour.** The eight
  group hues are tuned to sit just above 4.5:1, so a visible wash drops them
  under; solid is the only treatment that holds.
- **A badge palette declares `solid` or `tinted` and emits only that treatment's
  parts.** `badge-token('safety', 'bg')` failing to compile is deliberate, not
  an oversight. A ninth palette picks its treatment first — solid needs 4.5:1
  against the page surface plus 3:1 against both surfaces; tinted needs 4.5:1
  foreground-on-background plus 3:1 on the border.
- **The group hues sit at odd multiples of 22.5° off `$sorrel`**, so none
  collides with accent (96°) or secondary (8°). A ninth group is one map entry
  plus a contrast check, and the seed's `categories.group` values must match the
  slugs.
- **`badge()` takes no variant argument, deliberately.** The mixins set colour,
  edge and geometry only — never width, margin, layout or a modal backdrop. A
  component restating a mixin's colour is a bug.
- **`adjustFontFallback` stays `true`** in `src/app/fonts.ts`; setting it false
  reintroduces layout shift.

## The files

- `src/scss/_variables.scss` — base colour palette, type scale, category-group
  and safety tokens, and the `$font-body` / `$font-heading` / `$font-mono`
  stacks a component `@use`s directly.
- `src/scss/_mixins.scss` — `modal-surface`, `chip`, `badge`, `theme-dark` /
  `theme-light`, `semantic-tokens` (the per-theme category-group and badge
  custom properties), `focus-ring`, `theme-transition`, `reduced-motion`,
  `font-smoothing-antialiased`.
- **Three `*-base` mixins**, each emitting nothing on its own `@use` and
  `@include`d at exactly one site, `globals.scss`'s `body`:
  - `_typography.scss` → `typography-base` — headings, body copy, links, lists,
    the `.eyebrow` overline, `.tight-headings`.
  - `_layout.scss` → `layout-base` — bare `section` / `header` structure, plus
    `.header` / `.footer`.
  - `_primitives.scss` → `primitives-base` — the class layer: `.panel`,
    `.btn` / `.btn--secondary`, `.modal` / `.modal__actions`, `.specimen*`, and
    the classes over `chip()` / `badge()`. Meant to be used site-wide ahead of
    the milestones that would otherwise define these shapes.
- `src/app/fonts.ts` — Cormorant Unicase (weights 500/600/700) and Lexend,
  self-hosted at build time via `next/font/google`. The CSS variables it defines
  on `<html>` are what `$font-heading` / `$font-body` reference.
- `src/app/globals.scss` — the single global stylesheet, imported once by the
  root layout, and the one `@include` site for the three mixins above. Resolves
  the theme in **three** states, not two: `:root { @include theme-dark }` (dark
  is the default), a `prefers-color-scheme: light` block, and an explicit
  `html[data-theme='light']` override.
- No `_buttons.scss` — `.btn` / `.btn--secondary` live in `_primitives.scss`.
  No `_print.scss` outside M10.22 (the spell recipe view).
- Component styling adds no new hand-picked colour and no per-component design
  work beyond the tokens, mixins and the `_primitives.scss` class layer.

## Known issue

`$font-heading` / `$font-body` open with a fallback-less `var(--font-display)` /
`var(--font-body)`. Those custom properties are defined on `<html>` by
`next/font`, so anything rendered **outside the root layout** — a workshop story,
a standalone render — loses its entire `font-family` declaration rather than
falling back. `.ladle/typography.scss` works around it by redefining both in its
own `:root`. A real fix puts the fallback **inside** the `var()` —
`var(--font-body, 'Lexend')` — since the concrete families already trailing
each stack don't rescue it: an unresolved `var()` invalidates the whole
declaration at computed-value time, rest of the stack included.
