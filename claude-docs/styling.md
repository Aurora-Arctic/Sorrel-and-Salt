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

## The palette

Two layers live in `_variables.scss`, and the split is what keeps the derived
colours honest:

1. **The raw palette** — eight hand-picked hues, compile-time Sass values, plus
   everything `color.adjust()`ed from them. They are named for the material
   rather than the role, since a role can change and `#14120e` cannot.
2. **The token aliases** — thin `var(--token)` wrappers components consume.
   Theming happens at runtime through these, not by recompiling, which is what
   lets one rule serve dark, light and system-preference without a component
   spelling each out twice.

`_variables.scss` itself emits no CSS. Every component `@use`s it, so anything
that produced output there would land in every compiled stylesheet; the blocks
that assign the custom properties live in `src/app/globals.scss`, imported once.

| Variable            | Hex       | Role                                                   |
| ------------------- | --------- | ------------------------------------------------------ |
| `$soot`             | `#14120e` | dark page ground                                       |
| `$soot-raised`      | `#1f1c16` | dark card ground                                       |
| `$parchment`        | `#efe9da` | light page ground                                      |
| `$parchment-raised` | `#f9f5ea` | light card ground                                      |
| `$chalk`            | `#ebe4d4` | dark body ink — 13.42:1 on `$soot-raised`              |
| `$iron-gall`        | `#23201a` | light body ink — 14.91:1 on `$parchment-raised`        |
| `$sorrel`           | `#4a6b34` | the accent hue (96°)                                   |
| `$wax`              | `#8c3b2e` | the secondary hue (8°); the safety ink derives from it |

The grounds are warm near-blacks rather than neutral ones: a herbal has no pure
black in it, and a green accent over a blue-grey ground reads cold.

**Derivation runs one way only.** Every hover, muted and per-theme variant is a
`color.adjust()` of the four above — none is re-picked by eye — and each clears
4.5:1 against both surfaces of the theme it is used in. Dark-theme variants move
_away_ from the ground by lightening (a darker accent on `$soot` loses
contrast), so "hover is punchier" is spelled lighter-and-more-saturated on dark
and darker on light. `$chalk-muted` / `$ink-muted` are the body ink at reduced
strength rather than a separate grey, so metadata reads as the same ink and
still clears 4.5:1 instead of sitting at the decorative-grey level that fails it.
Shadow inks are per-theme: a 0.8-alpha near-black under a card reads as a hole
punched in parchment, so light mode gets a much softer one.

## Category-group colours

§6's eight groups, which exist so the chip selector can collapse 63 categories
into sections rather than a flat wall. Each group needs a colour distinguishable
from the other seven at chip size.

The eight hues are one rotation of `$sorrel` in 22.5° steps, taking **only the
odd multiples**. That half-step offset is the point: it guarantees no group
lands on the accent hue (96°) or the secondary hue (8°), both already claimed by
the UI chrome — a category chip wearing the accent colour would read as selected
when it is not.

| Slug         | Step | Hue    | Reads as     |
| ------------ | ---- | ------ | ------------ |
| `wellbeing`  | 1    | 118.5° | jade         |
| `cleansing`  | 3    | 163.5° | teal         |
| `protection` | 5    | 208.5° | steel blue   |
| `mind`       | 7    | 253.5° | indigo       |
| `craft`      | 9    | 298.5° | violet       |
| `love`       | 11   | 343.5° | rose         |
| `practice`   | 13   | 28.5°  | hearth amber |
| `prosperity` | 15   | 73.5°  | gold         |

**Saturation is lifted off `$sorrel` by one amount per theme** — the same lift
for all eight, which is what keeps them reading as one family while letting each
theme set its own intensity. Light needs by far the bigger lift (+50% against
dark's +14%): to clear 4.5:1 on parchment a colour has to stay dark, and a dark
colour at moderate saturation reads as mud rather than as colour. Dark lightens
its colours instead, where moderate saturation already reads clearly.

**Lightness is then trimmed per group, and only as far as the contrast floor
demands.** Equal HSL lightness is not equal perceived lightness: indigo takes a
+34% lift to clear 4.5:1 on soot where jade takes +9%. The light-theme trims are
`0%` or a small negative; the dark-theme trims run +7% to +34%.

A ninth group is one map entry plus a contrast check — and the category seed's
`group` values must match the slugs, since nothing joins them at runtime.

## Badge palettes

Two badges appear on an IngredientCard, and they are deliberately not equals.
**Safety** is a warning — an ingredient flagged toxic or unsafe to burn (story 53) — and wears the sealing-wax hue, the loudest thing in the palette, lifted in
saturation alongside the groups. **Low stock** is an inventory state, not an
alarm (story 54), so it takes the muted ink and is left unsaturated. That keeps
exactly one loud badge in the app and spends no hue, which matters because every
hue not already reserved belongs to one of the eight groups.

Each palette is one ink per theme plus the **treatment** it is drawn in, and the
treatment decides which parts it emits:

- **`solid`** — the ink fills the badge and the label inverts onto it
  (`$text-on-color`). One part, `fill`. A solid fill is its own boundary, so it
  needs no edge; `badge()` still draws a transparent 1px border, as geometry, so
  a solid badge matches the height of a tinted one beside it.
- **`tinted`** — the ink mixed back into the card surface, so the badge tints the
  surface it actually sits on instead of carrying a hardcoded panel colour.
  Three parts, `fg` / `bg` / `border`.

**A palette emits only its treatment's parts**, which is not tidiness. The two
treatments want opposite things from an ink: solid wants it saturated and close
to mid-lightness, tinted wants it far enough from the surface to still read at
12–14% strength. **Safety's ink satisfies the first and fails the second — as a
tint its `fg` on `bg` measures 3.85 and its edge 2.78** — so those parts do not
exist for it, and asking for one is a compile error rather than a token that
quietly fails WCAG.

Safety's ink is `$wax` at **+22% saturation in both themes**, and **+18%
lightness on dark**. The dark ink is lifted far less than a _text_ colour on soot
would need, because the badge is a solid fill and the contrast that matters is
its label's, not its own against the card; an earlier +30% made it readable and
washed out. Saturation was dialled back from 36%/35% so the fill reads as a deep
sealing-wax red rather than a near-fluorescent one — **only saturation moves**,
because the label (`$soot`, near-black) has little headroom on the fill and
darkening it would break 4.5:1.

Mix weights are per theme rather than per palette: a tint over near-black needs
slightly more ink to register than the same tint over parchment. Fill weights are
14% dark / 12% light; edge weights are 70% dark / 75% light — the smallest that
clear 3:1 against both surfaces (WCAG 1.4.11).

### `$text-on-color`

The label colour for anything drawn as a _solid_ fill — the selected chip, the
safety badge. It is an alias for the page surface rather than a token of its own
because the answer is the same whatever the fill: on dark the fill is the light
thing and the label goes dark, on light the reverse.

It needs no contrast table of its own. A solid fill's label sits on the fill, and
the fill's ratio against the page surface is exactly the `vs page` figure already
measured for every group and every ink — the two questions have the same
arithmetic. **Worst pairing in the set is 4.74:1.**

### `$ornament-screen` and `$ornament-multiply`

How `Backdrop`'s grey corner ornaments meet the page: the opacity of its
`screen` layer (`--ornament-screen`, 0.3 on dark, 0 on light) and of its
`multiply` layer (`--ornament-multiply`, 0 on dark, 0.4 on light). The image
carries the photograph's levelled luminance, so a blend mode is what keeps its
tones the right way round on both themes — the salt bright, the wood dark —
where any single tint, lighter or darker than the page, moved the whole subject
one way. Two opacities rather than one blend-mode token because a blend mode
cannot animate and an opacity can: the toggle cross-fades the layers on the
same 400ms as every other colour. Decorative, so no contrast table: nothing is
read against them, and `prefers-contrast: more` removes the ornaments entirely
([`components/backdrop.md`](components/backdrop.md)).

## Chips, badges and the solid-fill rule

`chip()` draws a pill, always edged in its group's colour, in one of two states:
`unselected` leaves the ground transparent and lets the label wear the colour;
`selected` fills solid and inverts the label onto `$text-on-color`. Both states
carry the same 1px edge and the same padding, so a row can mix them without the
selected ones jumping half a pixel out of rhythm.

**Solid is not decoration.** The obvious loud treatment — the group colour as a
low-opacity wash behind a coloured label — cannot hold 4.5:1: the eight hues were
tuned to land just above the floor, so washing the ground with the same colour
closes exactly the gap they were tuned for. A solid fill sidesteps it and needs
no new arithmetic, per `$text-on-color` above.

Badges are square-cornered, which is what keeps a badge from reading as a chip
now that chips are pills. Both shapes set their label to weight 500, a step over
Lexend's 300 body weight, so a small label holds its colour at chip size.

## Type

Cormorant Unicase for display, Lexend for body — both SIL Open Font License 1.1,
self-hosted at build time by `next/font` (`src/app/fonts.ts`), so no request
reaches `fonts.googleapis.com` at runtime and nothing about a visitor's page load
reaches Google. Lexend is variable across 100–900, so one file covers every
weight; Cormorant Unicase has no variable axis, so its weights are named and only
the three the scale uses (500/600/700) are requested.

- **All four heading levels run at 700**, Cormorant Unicase's heaviest. It is a
  high-contrast display serif whose hairlines thin out the smaller it is set and
  the darker the ground, and 600 was hard to read on the dark theme. There is
  nothing above 700 for this face: if it still reads light, the display face
  itself is the lever, not the weight.
- **The scale is anchored at `h4` = 1.5rem and stepped up by roughly 1.2**
  (`h3` 1.8rem, `h2` 2.15rem, `h1` `clamp(2.5rem, 5vw, 3.75rem)`). An earlier
  scale anchored at 1.125rem set the smallest headings too close to body copy.
- **Monospace is a platform stack, no webfont** — this is for incidental inline
  `code`, not typeset code blocks, and it is nudged to `0.9em` because platform
  monospace runs large next to Lexend.
- **Links get an underline under `prefers-contrast: more`**, on the body ink
  rather than a further-pushed sorrel: WCAG's "don't rely on colour alone", for
  users who have explicitly asked for more contrast than the baseline gives.

## Theme resolution

`globals.scss` resolves **three** states, not two, and `.ladle/theme.scss`,
`ThemeToggle`'s `index.scss` and `resolveCurrentTheme()` all mirror the same
cascade selector for selector:

| Selector                                                             | Theme                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `:root`                                                              | dark — the default, and what a system with no preference or a dark preference gets |
| `@media (prefers-color-scheme: light) html:not([data-theme='dark'])` | light, but only while no explicit choice overrides it                              |
| `html[data-theme='light']`                                           | an explicit choice, which beats the system                                         |

The `:not([data-theme='dark'])` guard is what lets the toggle pin dark on a
light-preference system. Both light blocks `@include theme-light` so the two
spellings cannot drift, and the theme mixins are mixins rather than plain rules
for exactly that reason. Only `globals.scss` (and the workshop's copy) includes
them; a component that includes one is re-theming a subtree, which nothing in
this project does.

`color-scheme` is set alongside the tokens so form controls, scrollbars and the
canvas behind the page match without being styled. Dark also turns on
antialiased/grayscale font smoothing, since light text on a dark ground renders
heavier than the reverse; light reverts to the browser default.

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
