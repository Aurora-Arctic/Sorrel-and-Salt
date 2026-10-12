# Styling foundation — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

The SCSS foundation every component builds on: the palette, type, spacing,
radius and the shared primitives, settled by the foundations design review
(MB.114) and shown in the workshop's `Foundations` page. Each section's own
design is its review's, built on this layer ([`.claude/rules/components.md`](../.claude/rules/components.md),
"The design will change"); "Designing a section" below is the direction they design
to.

## Binding rules

- **Modern Sass modules only** — `@use '../../scss/variables' as *;`, never
  `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever
  component needs them, never routed through a parent (§9).
- **Reach tokens through functions, not bare variables** — `badge-token('safety', 'fill')`,
  `space(4)`, `$text-on-color`. A typo is then a compile
  error rather than a silently wrong colour.
- **WCAG AA 4.5:1 is the floor for every token, in both themes**, and several
  pairings sit close to it (the light `--accent` at 4.68 and `wellbeing` at
  4.74 against the light page, `--secondary` at 4.80 against the dark card). Re-measure when changing a
  colour; do not assume headroom.
- **Only `_variables.scss` and the theme mixins may name a raw hue.** Needing a
  colour that is not a token means adding a token, not inlining one.
  Stylelint carries it (`npm run lint:css`, part of `lint`): `color-no-hex` and
  `color-named` refuse a hue anywhere but `_variables.scss`, so a theme mixin
  takes its hues from there too ([`commands.md`](commands.md), "The app").
- **The seeded group colours live only in `src/db/seed/category-groups.ts`.**
  No Sass token restates them, and retuning one takes a data migration as well
  as the seed edit, because the seed never overwrites a row it finds (M5.6b).
- **Never wash a chip or badge ground with its own group colour.** The eight
  group hues are tuned to sit just above 4.5:1, so a visible wash drops them
  under; solid is the only treatment that holds.
- **A badge palette declares `solid` or `tinted` and emits only that treatment's
  parts.** `badge-token('safety', 'bg')` failing to compile is deliberate, not
  an oversight. A ninth palette picks its treatment first — solid needs 4.5:1
  against the page surface plus 3:1 against both surfaces; tinted needs 4.5:1
  foreground-on-background plus 3:1 on the border.
- **The group hues sit at odd multiples of 22.5° off `$sorrel`**, so none
  collides with accent (96°) or secondary (8°). A ninth group is a row an admin
  adds at `/admin/category-groups`, outside the rotation, its two colours
  refused on write below 4.5:1 on their own grounds (M5.6b, below).
- **`badge()` takes no variant argument, deliberately.** The mixins set colour,
  edge and geometry only — never width, margin, layout or a modal backdrop. A
  component restating a mixin's colour is a bug.
- **`adjustFontFallback` stays `true`** in `src/app/fonts.ts`; setting it false
  reintroduces layout shift.
- **Lengths, radii and small type come from their scales**: `space()`,
  `radius()` and `type-size()`. A length off the scale is a chip's or a
  badge's inner geometry, a control's target size, or a heading's size — and
  says so in a comment.
- **A length with a role of its own is a token**, under "Motion and layout"
  in `_variables.scss`, so the components that share the role share the
  number (MB.115): `$wide-column` (the admin area's column, 80rem),
  `$dialog-column` and `$dialog-column-wide` (a dialog's content, 32rem and
  48rem), `$icon-size` (a small control's 1.5rem square, WCAG 2.2's 24px
  target) around a `$glyph-size` mark (1rem), `$icon-size-large` around
  `$glyph-size-large` (2rem around 1.25rem, a list row's Edit pencil, larger
  outside a form on the owner's call), `$tip-width` (a tip's widest
  line, 18rem, capped at the window), `$close-target` (the dialog's close
  button, 2.5rem), `$table-stack-width` (the frame width under which a table
  stacks, 40rem), `$filter-choice-width` (a filter's type-ahead field, 14rem), `$switch-width` (the switch's track, 2.75rem, `$icon-size` high), `$rule-medium` and `$rule-heavy` (the 2px and 3px rules
  that mark something by weight as well as colour), and `$toggle-corner` (the
  theme toggle's 3.9rem corner, which the impersonation banner keeps clear
  of). A duration with a role of its own is one too: `$motion-short`
  (150ms), a control answering a press with a movement of its own, as the
  switch's thumb slides.
- **Body copy keeps to the reading measure, `$measure` (66ch)** — the longest
  line that still reads comfortably. `ch` is the width of "0" in the element's
  own font, so the measure follows the text it caps: 660px of Lexend at 1rem.
  `typography-base` sets `max-width: $measure` on every `p`, so a layout can be
  as wide as a table or grid needs while its prose stays readable, and no page
  has to remember it. A component never widens a paragraph past it; running
  text that is not a `p`, such as a long list item or a description, takes
  `max-width: $measure` itself; and a narrower column, as the forms use, is a
  component's own choice. A page with no AppShell takes its column from
  `.page-frame`, which stops at the measure, or at the forms' narrower
  column with `--narrow` ("The page frame", below). `tests/e2e/admin.spec.ts` asserts it on a layout wider than
  the measure, with 66ch measured in the paragraph's own font.
- **Browser baseline: Next's default modern targets** — Chrome, Edge and
  Firefox 111, Safari 16.4, "baseline widely available" as of 2025-10-01
  (`node_modules/next/dist/shared/lib/modern-browserslist-target.js`).
  Turbopack's Lightning CSS lowers newer syntax to them, as it does
  `light-dark()` (below). Each review checks the CSS it adds against this
  baseline. Playwright's projects are Chromium only, so the owner's own look at
  the dev server in Safari and Firefox is part of every sign-off.

## The palette

Two layers live in `_variables.scss`, and the split is what keeps the derived
colours honest:

1. **The raw palette** — eight hand-picked hues, compile-time Sass values, plus
   everything `color.adjust()`ed or `color.mix()`ed from them. They are named for the material
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
`color.adjust()` or `color.mix()` of the palette above — none is re-picked by
eye — and each clears 4.5:1 against both surfaces of the theme it is used in.
Dark-theme variants move _away_ from the ground by lightening (a darker accent
on `$soot` loses contrast), so "hover is punchier" is spelled
lighter-and-more-saturated on dark and darker on light.

`$chalk-muted` / `$ink-muted` are the body ink at reduced strength rather than
a separate grey, so metadata reads as the same ink and still clears 4.5:1
instead of sitting at the decorative-grey level that fails it. **Dark mixes the
ink into the ground** — `color.mix($chalk, $soot, 80%)`, `#c0baac`, 8.79:1 on
the card and a visible step below the body ink. It was `$chalk` lightened down
22% in HSL, which keeps the saturation while the lightness falls and so raises
the chroma: it read gold, beside the prosperity chip, rather than as a quieter
chalk. A mix lowers the chroma with the strength, as ink thinned on paper does.
Light keeps `$iron-gall` lightened 20% (`#5e5645`), which reads as the same
ink.

Three variants exist for one use each:

- **`$sorrel-vivid`, the light theme's `--accent`**: `$sorrel` at +40%
  saturation and −5% lightness, `#397511`, 4.68:1 on the page and 5.20:1 on
  the card. `$sorrel` itself reads olive-black on parchment, and an outline
  button in it barely registers as green; saturating it alone lifts it under
  4.5:1, so it darkens as it saturates. The light hovers derive from it rather
  than from `$sorrel`, or hovering would look like the colour draining out.
  Dark keeps `$sorrel-bright`.
- **`$wax-vivid`, the light theme's `--secondary`**: `$wax` at +30% saturation
  and +4% lightness, `#ba2b14`, 5.02:1 on the page. `$wax` itself reads
  brown on parchment, and an error edge in it barely separates from a field's
  own. Dark keeps `$wax-warm`. Destructive buttons share the token.
- **`$sorrel-spring` / `$sorrel-rich`, the solid button's hover
  (`--accent-solid-hover`)**: `$sorrel` at +38% lightness and +40% saturation
  on dark (`#a5eb76`), and `$sorrel-vivid` at −8% lightness and +20%
  saturation on light (`#265a03`). The link's `--accent-hover` is one step, which a filled
  button barely shows under the pointer; these are larger and more saturated,
  rather than only further from the ground. The label on them measures 13.13:1
  and 6.80:1.
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

| Group                | Step | Hue    | Reads as     |
| -------------------- | ---- | ------ | ------------ |
| Wellbeing            | 1    | 118.5° | jade         |
| Cleansing & Release  | 3    | 163.5° | teal         |
| Protection & Defense | 5    | 208.5° | steel blue   |
| Mind & Spirit        | 7    | 253.5° | indigo       |
| Craft & Change       | 9    | 298.5° | violet       |
| Love & Connection    | 11   | 343.5° | rose         |
| Practice & Place     | 13   | 28.5°  | hearth amber |
| Prosperity & Work    | 15   | 73.5°  | gold         |

**The rotation is the rule; saturation and lightness are the owner's
hand-tuning.** Each seeded pair is two hexes in `src/db/seed/category-groups.ts`,
that file is their only source. Both hexes of every pair sit within 2° of
its step (every hue is in fact within 1.04°), which review holds and
[`db/category-seed.md`](db/category-seed.md) states; `tests/db/seed/categories.test.ts`
holds each to 4.5:1 on its own theme's page, `$soot` or `$parchment`. Every
dark hex also clears the dark card, the harder dark surface, at 4.64:1 or
better; the closest light hex is Mind & Spirit's, at 4.52:1 on the page. Within a group, the two
hexes keep one hue to within 0.51°. Across groups they no longer share a
saturation: dark-theme saturations run 30–50%, light-theme 37–75%, because
equal HSL lightness and saturation are not equal perceived colour, and each
pair was tuned by hand against the contrast floor rather than by formula. The
light theme still runs the more saturated of the two: to clear 4.5:1 on
parchment a colour has to stay dark, and a dark colour at moderate saturation
reads as mud rather than as colour.

**M0.7's `$category-groups` map is retired** (M5.6b). It lifted every group by
one saturation per theme and trimmed lightness per group, which the hand-tuned
pairs no longer follow, and it had been nothing but the seed's source since
MB.35 put a group's colours on its `category_groups` row as a pair of hexes; a
chip reads the row (MB.36). A ninth group is a row an admin adds with M5.6b's two pickers, each previewing
its chip and ratio on its own ground and each refused on write below 4.5:1
against the harder of its own theme's two surfaces; it is legible in both
themes but does not join the rotation (§6).

## Badge palettes

Three palettes, deliberately not equals. Two appear on an IngredientCard.
**Safety** is a warning — an ingredient flagged toxic or unsafe to burn (story 53) — and wears the sealing-wax hue, the loudest thing in the palette, lifted in
saturation. **Low stock** is an inventory state, not an
alarm (story 54), so it takes the muted ink and is left unsaturated. That keeps
exactly one alarming badge in the app and spends no hue, which matters because every
hue not already reserved belongs to one of the eight groups. **Last used** marks
the sign-in button this browser last signed in with (MB.77). It is a pointer,
not a warning, so it is drawn solid in the accent's own inks (`$sorrel-bright`
dark, `$sorrel-vivid` light), a hue already reserved, and spends none of the groups'.
Its label on the fill is 7.95:1 dark and 4.68:1 light.

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
safety and last-used badges. It is an alias for the page surface rather than a token of its own
because the answer is the same whatever the fill: on dark the fill is the light
thing and the label goes dark, on light the reverse.

It needs no contrast table of its own. A solid fill's label sits on the fill, and
the fill's ratio against the page surface is exactly the `vs page` figure already
measured for every group and every ink — the two questions have the same
arithmetic. **Worst pairing in the set is 4.68:1**, the light accent.

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

**The colour comes from the row, on the element.** `chip($dark, $light, $state)`
takes the pair rather than a slug, and by default reads it from the element's
`--chip-dark` and `--chip-light`, which `chipColors(group)` in
`src/lib/chip-colors.ts` sets inline from the group's `colorDark` and
`colorLight`. `light-dark()` picks one off the `color-scheme` the theme mixins
already set, so the per-theme switch `semantic-tokens` once made at build time
happens at the element, and a theme toggle re-colours a chip without a render.
It replaced one `--group-<slug>` custom property and one `.chip--<slug>` class
per key of M0.7's `$category-groups` map (since retired), which a group created
at runtime cannot have.
`chip()` refuses a slug at compile time.

`light-dark()` is newer than Next's default browser targets (Safari 16.4), so
Turbopack's Lightning CSS lowers it: every `color-scheme` declaration also sets
a pair of `--lightningcss-*` switches, and the chip reads those. Nothing in this
project writes either.

**The contrast holds for any colour the write check admits.** An unselected
chip's label is the colour itself on whatever surface holds the chip, a page or
a card, and a selected chip's label is `$text-on-color`, the page surface, on a
fill of that colour. So M5.6b's `CategoryGroupInput` refuses a colour under
4.5:1 against the harder of its own theme's two surfaces: `colorDark` against the dark card, which is lighter than
the dark page, and `colorLight` against the light page, which is darker than
the light card. Clearing that surface clears the other, and the selected label
with it. Checked against the dark page instead, a dark colour could clear the
floor and still read under it on a card: the seeded eight measure 5.1–5.3:1 on
the dark page and 4.6–4.8:1 on the dark card (MB.36). The arithmetic is
`src/lib/contrast.ts`: WCAG 2.1's ratio, and the two grounds as hexes,
`#1f1c16` and `#efe9da`, written out because nothing at runtime can import a
Sass value, so `tests/lib/contrast.test.ts` pins them to `$soot-raised` and
`$parchment` in `_variables.scss`. A change to either token fails that test
until the check follows it.

Badges are square-cornered, which is what keeps a badge from reading as a chip
now that chips are pills. Both shapes set their label to weight 500, a step over
Lexend's 300 body weight, so a small label holds its colour at chip size.

## Brand colours

A sign-in provider's button wears the provider's colours, not ours:
`$brand-palettes` in `_variables.scss` holds each brand's `fill`, `ink`
and `hover`, and the `edge` a white button needs on our page, read through
`brand-color($brand, $part)`. A mistyped brand or part is a compile error,
worded as `badge-token()`'s. It is a compile-time map rather than custom
properties because the hues do not follow the theme and nothing reads them at
runtime; a part that ever does differ by theme is written
`(dark: …, light: …)`, and the accessor returns `light-dark()`, which
Lightning CSS lowers to the baseline. SignInPanel's buttons and the
`.provider-mark` circle are its consumers; an SVG fill inside a mark is
artwork, and stays in `icons.tsx`.

Measured with `contrastRatio` (`src/lib/contrast.ts`), each edge or fill
against the page at 3:1 (WCAG 1.4.11), each ink against its fill and its
hover at 4.5:1. `tests/scss/tokens.test.ts` checks every pair below that is
held to a floor, which is all but the rows marked "before MB.116" and the
hover fills on the page, reading the colours from `$brand-palettes` and the
theme tokens, in one assertion per theme:

| Pair                                                  | Dark page `$soot`                                             | Light page `$parchment` |
| ----------------------------------------------------- | ------------------------------------------------------------- | ----------------------- |
| Google edge `#dadce0` (before MB.116)                 | 13.62                                                         | **1.13, fails**         |
| Google edge `#747775` (Google's current light button) | 4.13                                                          | 3.74                    |
| Microsoft edge `#8c8c8c` (before MB.116)              | 5.56                                                          | **2.78, fails**         |
| Microsoft edge `#808080`                              | 4.74                                                          | 3.26                    |
| Discord / Facebook fill on the page                   | 4.06 / 3.88                                                   | 3.80 / 3.98             |
| Discord / Facebook hover fill on the page             | 2.91 / 2.85                                                   | 5.30 / 5.43             |
| Inks on fills (both themes)                           | Google 16.48 · Discord 4.61 · Facebook 4.82 · Microsoft 21.00 | the same                |
| Inks on hover fills (both themes)                     | Google 13.68 · Discord 6.42 · Facebook 6.57 · Microsoft 15.91 | the same                |
| Focus ring `$text-primary` on the page                | 14.77                                                         | 13.41                   |
| Muted text `$text-muted` / `--accent` on the page     | 9.67 / 7.97                                                   | 5.99 / 4.65             |

**Hover is not held to 3:1.** WCAG 1.4.11 covers what identifies a control
and its states, and a hover ground is neither: the button is already known
by its resting fill, and keyboard focus is shown by the focus ring, which
clears 13:1 in both themes. So Discord's and Facebook's darker hover grounds
may sit under 3:1 on the dark page. Microsoft keeps its white face in both
themes, with the darker `#808080` edge that clears 3:1 on the light page: the
owner's call at MB.116's sign-off, over Microsoft's own dark button.

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
- **A followed link takes the body ink**, from a `:visited` inside `:where()`,
  so any class-level link colour still wins ("Buttons", below).
- **A heading gathers four text roles**, all in `typography-base`: the
  `.eyebrow` above it, naming the section it sits in; `.meta`, a
  caption-size muted line tight under it — a formal name and form, a date, a
  count; `.binomial`, the italic of a botanical, fungal or zoological
  binomial, which the component adds only for those nomenclatures, since
  mineral and chemical names are set upright; and `.lede`, the muted sentence
  or two saying what the section is for, at body size because it is read.
  Wrapped in `.header`, they are the head of every section on the
  Foundations page. The `.header` gap alone spaces them: it zeroes its
  children's margins, because flex margins never collapse and a heading's
  bottom margin would otherwise add to the gap.

## Spacing

Every margin, padding and gap takes a step from `space()`, eight steps on a
0.25rem base: 0.25, 0.5, 0.75, 1, 1.5, 2, 3 and 4rem. `space(4)` is 1rem. An
unknown step fails to compile, as a mistyped theme does. The steps are the
values the components had already converged on; the few between them (0.375,
0.625, 1.25rem) fold into a neighbour when their section is designed.

**Two things stay off the scale.** A chip's or badge's inner padding is its
own geometry: it is trimmed by the 1px edge so the label sits optically
centred, and rounding it to a step moves the label. A control's height is a
target size rather than a gap: `$control-height`, 2.78125rem, 44.5px, the
owner's call during MB.154, so a text field, a select or suggesting box and
a button stand level in a row whatever the font's line height. `.input`,
`.textarea` and `.select` take it as their `min-height`; `.btn` takes it as
its `min-height`, its vertical padding a step short of it so the minimum
decides; and the combobox's text line is the control's height less its edge
and padding. It is a minimum, so a list's box still grows with its rows of
entries. 44.5 rather than 44 is what a button measured at its own padding,
and both clear WCAG 2.5.5's 44px.

Below body copy, type takes one of four sizes by role from `type-size()`:
`small` (0.875rem) for what a person acts on — labels, buttons, notices,
field errors; `caption` (0.8125rem) for hints, metadata, chips and badges; and
`overline` (0.75rem) for the `.eyebrow`. The headings' scale is
`typography-base`'s, above.

### The top inset

`$top-inset` (`var(--top-inset, 0px)`) is how much of the top of the window
is taken by chrome in the page's flow above everything else. Today that is
the impersonation banner on a touch screen alone (MB.53), and 0 everywhere
else. The banner publishes its measured height as
`--impersonation-banner-height`, and its own stylesheet maps it to
`--top-inset` under `@media (hover: none)`.

What pins itself to the top of the window or sizes itself to it offsets by
the inset, so it starts below the banner and the page does not scroll by the
banner's height:

- `ThemeToggle` and the sorrel corner of `Backdrop` take `top: $top-inset`.
- Every page a full screen high sits in `.page-frame`, which takes
  `min-height: calc(100dvh - #{$top-inset})` ("The page frame", below):
  `/`, `/sign-in`, `/account`, `/account/email`, the not-authorized
  page and the invitation page. A page that needs the full height takes the
  frame rather than restating the rule.

Anything new fixed to the top offsets by the inset the same way.

## Corner radius

Four radii by role, from `radius()`:

| Role      | Radius   | For                                                           |
| --------- | -------- | ------------------------------------------------------------- |
| `sharp`   | 2px      | A badge, square enough not to read as a chip                  |
| `control` | 0.333rem | What a person types into or presses: fields, buttons, notices |
| `surface` | 0.5rem   | What holds controls: panels, cards, modals                    |
| `pill`    | 999px    | A chip                                                        |

A button beside a field matches it, and a panel holding both reads as the
thing that holds them. Buttons were 0.5rem and panels 0.25rem until MB.114.

## Buttons

`.btn` is the shape every button shares, `SignInPanel`'s brand buttons
included. No tapped control shows the platform's tap highlight, the blue box
iOS and Android Chrome draw: `body` sets `-webkit-tap-highlight-color:
transparent` (`src/app/globals.scss`), so a control's own `:active` and focus
styles are its only feedback, and each control that can be tapped needs one.
A phone applies `:active` late or not at all, though: Chromium only once it
has ruled out a scroll, Safari only where a touch listener is attached. So a
control that must answer a tap at once spreads `pressFeedback`
(`src/lib/press-feedback.ts`), which marks it `data-pressed` from a
pointer's press until it lifts, leaves or turns into a scroll, and its
stylesheet draws `:active` and `[data-pressed]` alike: the tab row's
segments ([`components/tabbed-page.md`](components/tabbed-page.md)) and the
admin nav's summary ([`components/admin-nav.md`](components/admin-nav.md)).
Four variants:

- **The outline (`.btn`)**, the default: the accent on an edge, filling on
  hover. The edge is 1.6px on every variant, heavier than a field's 1px, since
  a hairline in the accent barely reads as a colour. A border width rounds down
  to whole device pixels (CSS Values 4, "snap as a border width"), so it draws
  1.5px on a 2x screen and stays 1px on a standard-density one.
- **`.btn--solid`**, a view's one primary action — Save, Send, Continue.
  Filled in the accent, with the label on `$text-on-color`, and its own hover
  step (`--accent-solid-hover`, above).
- **`.btn--quiet`**, an action that changes nothing: Cancel, Keep It, Keep Editing, Back.
  The body ink on an edge, so it neither competes with the primary nor reads as
  destructive — and, unlike the muted ink, not as disabled either.
- **`.btn--destructive`**, what destroys something: Delete, Remove, Discard Changes. The wax,
  `$secondary`, which every error wears too. It was `.btn--secondary`, named
  for the token rather than the job, until M5.6, the owner's call.

**One size modifier, `.btn--small`**, which composes with any variant: half
the padding (`space(1) space(3)`), no `$control-height` minimum, a 1px edge
in place of `.btn`'s 1.6px, which reads heavy at this size, the `caption`
type size, and a `space(2)` gap. It is for a compact strip that the full button would make taller, such
as a banner or a table row. The impersonation banner's Stop is the first
(MB.53).

**A save in flight is `aria-busy` with a `.spinner`** (M5.6, the owner's call
for every Save button). The spinner is a 1em ring in the button's own ink,
open on one side so its turn reads, slowed rather than stopped where motion is
reduced. It sits ahead of the label, which says what is happening ("Saving
Category"). A `.btn[aria-busy='true']` brings its left padding in a step,
since padding sized for a word reads as a gap before a small round mark.
Every spinner button is a `BusyButton`
([`components/busy-button.md`](components/busy-button.md)), which draws the
`aria-busy`, the spinner and the label swap from its `busy` and
`busyLabel` props, so no form writes the markup by hand. The one exception
is the pager's link while its page loads, an anchor rather than a button.

**Disabled is dashed and faded**, from `disabled` or `aria-disabled`: the
edge dashes, the fill clears, and the whole button drops to 55%. Neither
state needs a component to restate it.

**A `.btn` on an anchor is a button in every state**, Add Category and
Continue among them. `.btn` sets `text-decoration: none`, and
`_typography.scss`'s visited ink sits inside `:where()`, so it adds nothing to
`a`'s specificity and every variant's own colour outranks it. As a plain
`:visited` it outranked any class-level link colour, and Welcome and EmailForm
each restated their label colour to keep a followed `.btn--solid` off the body
ink. No component needs to now.

**`.pager` is a paged list's Prev and Next** (the owner's calls in M5.6): a
`nav` with `class="pager"` and `aria-label="Pages"`, holding a bare `ul` of
two `li`s, each a full-size `.btn.btn--quiet` anchor. They are quiet because
paging changes nothing. The list is a wrapping flex row, centred under the
table, with a `space(3)` gap and no ◆ marker. The ‹ and › marks are
`.pager__mark` spans at 2em with a line height of 1, raised 0.08em to the
label's centre, so they read at a glance without making the button taller. They are `aria-hidden`, so the links
are named "Prev" and "Next". `.pager__position`, "Page 2 of 3" between them,
is muted text at the body size with `space(4)` either side, since it is not
a control. An end with no page is disabled rather than
hidden, so neither moves. The markup is the `Pager` component's
([`components/pager.md`](components/pager.md)), which GroupedValueList,
GroupList, CompendiumList and UserList render.

**`.page-header` puts a page's heading and its one primary action on one
line**, the action at the end (the owner's call, M5.6): `/admin/categories`'
Add Category beside its H1. The row is centred and the action brought down
0.25rem, the owner's measure: a heading's box carries room below its letters,
so a centred button reads high and one on the baseline low. The row wraps on
a narrow screen rather than squeezing the heading. The header is a size
container, so it measures its own width rather than the screen's: under
28rem of it, the forms' column, the action goes beneath the heading and loses
the quarter-rem drop, which only lined it up beside the heading (MB.115). In
the admin area it then spans the line, so on a phone every admin page's Add
stretches across the column (the owner's call at MB.115's review, over the
natural width recommended); elsewhere, as on the account page, it keeps its
natural width. The markup is the `PageHeader` component's
([`components/page-header.md`](components/page-header.md)). A tabbed admin
page draws its heading in a `PageHeader` too, the open tab's action beside
it, so the same rule holds there
([`components/tabbed-page.md`](components/tabbed-page.md)).

**The admin tables are banded at desktop width, and stack into cards on a
phone.** Wide, every even body row sits on `$surface-card`, the surface a
modal wears, so a wide row stays readable across. Each cell is inset
`space(3)` on both sides so no text meets a band's edge, and aligned on the
baseline so a row's small button reads on its text's line. A heading sits on
its cell's bottom instead, on the owner's call, so one that wraps keeps its
last line level with its neighbours', on the 1px `$text-muted` hairline under
the header row. These rules are the `.data-table` primitive, inside a
`.data-table-frame`: the category list and UserList each carried them until
the forms' list made a third (M5.6a), and CompendiumList (M5.5) and
GroupedValueList, the category and form lists made one (MB.132) and the flat
vocabularies' list folded in (MB.115), are on it too. Narrow, a table with the `.data-table--stack`
modifier turns each row into a card once its frame is under
`$table-stack-width` ("Tables at phone width", below); a table without it
scrolls sideways inside its frame rather than widening the page.

## Form fields

The class layer every form is built from, in `_primitives.scss`:

| Class                                            | What it is                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.form`, `.form__actions`                        | The column of fields, a `space(5)` apart, and the row of buttons after it, `space(2)` further off and as far again from what follows: 2rem either side in a modal (M5.5). A `.modal__actions` row in a `.form` takes the same                                                                                                            |
| `.field`                                         | One field: label, optional hint, control and error, `space(2)` apart                                                                                                                                                                                                                                                                     |
| `.field__label`, `.field__hint`, `.field__error` | The parts around the control                                                                                                                                                                                                                                                                                                             |
| `.input`, `.textarea`, `.select`                 | The control, one box for all three                                                                                                                                                                                                                                                                                                       |
| `.checkbox`                                      | A `<label>` wrapping its box, so the whole line is the target                                                                                                                                                                                                                                                                            |
| `.switch`, `.switch__control`                    | An on-or-off choice as a slide toggle, a `.field` block: its label above, the toggle beneath at `$control-height`. `SwitchField` draws it ([`components/field.md`](components/field.md))                                                                                                                                                 |
| `.fieldset`, `.fieldset__legend`                 | Rows under one name: checkboxes, or a list of entries                                                                                                                                                                                                                                                                                    |
| `.notice`, `--error`, `--warn`, `--success`      | A sentence about the whole view rather than one field `--error` and `--warn` lead with a warning triangle, drawn by mask in the box's padding so a link in the text stays inline: in the error's red on an error, and in the error red on a warning's plain box and ink, for what needs attention but does not block (the owner's call). |

- **A field's hint is an info tip beside its label** (`InfoTip`,
  [`components/info-tip.md`](components/info-tip.md)), not a line beneath it:
  the owner's call in M5.9, once a form of many fields read as a wall of
  hints. The tip's text stays in the field's `aria-describedby`, so it is read
  with the field whether open or not, and the tip opens while the field has
  focus, so a keyboard that skips the ⓘ still shows it. `.field__hint` remains for a line that
  must stay in view, such as why a field is disabled, since a shut field that
  does not say why reads as broken. `IngredientForm` was the first form built
  this way, and the Reason fields of the user list's confirmations and the
  admin invite form took it at MB.115's review; any other form adopts it at
  its own design review.
- **Every text, textarea, select and type-ahead field shows a placeholder,
  a short action of one or two words** ("Add a name", "Choose a group",
  "Search names"), or on a multi-line description a one-line prompt for
  what to write ("What this category covers"), and what the field is for goes in its hint's
  info tip, never in the placeholder: the owner's call at MB.115's review. A
  box of several values keeps its placeholder after its chips, with room for
  it, while it can take another.
  The label stays its name. The placeholder reads in `$text-placeholder`,
  held at 4.5:1 on the field's ground in both themes by
  `tests/scss/tokens.test.ts`
  ([`components/field.md`](components/field.md), "Contracts").
- **A field is optional unless it carries the required mark**, so no label
  says "(Optional)": the asterisk, `.field__required`, marks the fields a
  save asks for, and every other field may be left empty (the owner's call at
  MB.115's review). The label stays the field's name, "Reason", not
  "Reason (Optional)".
- **The error sits beneath its control**, nearest what was typed, and is
  drawn the same whichever side found it: the resolver before a request, or
  the server's `fieldErrors` after (DESIGN.md §7, "Errors"). The control names
  the error and the hint in `aria-describedby` and carries `aria-invalid`,
  which is what draws the error edge — so the markup that makes the error
  announced is the markup that makes it visible, and one cannot ship without
  the other.
- **The error edge is a shape as well as a colour**: `aria-invalid` turns the
  border to `$secondary` and adds a second pixel inside it, so the state does
  not rest on hue alone (WCAG 1.4.1).
- **A rule that belongs to no one field is a `.notice` above them all** — an
  empty-path error. Its role is the markup's: `role="alert"` for an error that
  arrives after the page did, `<output>` for news of success.
- **What a person typed is weight 400**, a step firmer than the prose around
  it. Field errors and notices are 400 too: coloured text at `small` size
  thins out at 300.
- **The select draws its own chevron**, two gradient triangles in the muted
  ink, since the platform's arrow varies by OS and ignores the theme. Under
  `forced-colors` the native arrow comes back, because forced colours drop
  background images.
- **A select's placeholder is a hidden, disabled first option** whose value
  is `''`: it shows until a choice is made and cannot be chosen back, and
  reads in `$text-placeholder` as an input's placeholder does: the muted ink
  mixed 85% into the field's ground, the greyest that holds 4.5:1 (4.68:1 on
  the light field, 6.71:1 on the dark), since WCAG 1.4.3 covers a placeholder
  as it does any text. A select whose
  blank is an answer, such as an element of "None", offers it as an ordinary
  option instead.
- **The checkbox is the platform's**, coloured by `accent-color`, which takes
  the token and picks its own check-mark contrast.
- **An on-or-off filter is a switch**, the owner's call at MB.115's review
  over a checkbox, which looked out of place among a filter row's boxes: a
  native checkbox with `role="switch"` and `appearance: none`, drawn as a
  rounded track, `$switch-width` by `$icon-size`, with a `$glyph-size`
  thumb (`::before`). Native, so it submits with a GET form before
  hydration and keeps Space and its label's click, and its checked state is
  the switch's to a screen reader; no `aria-checked` is written, since a
  press before hydration would leave it stale. Its label stands above it as
  every field's does (the owner's call), and the toggle sits centred in a
  `$control-height` row, so in a filter row it lines up with the boxes
  beside it. Off is the field's ground with the muted 1px edge and a muted
  thumb at the start; on fills the track with `$accent` and the thumb, in
  the page's colour as a solid button's label is, slides to the end over
  `$motion-short`, jumping under reduced motion. Where the thumb sits, not
  its colour, tells on from off (WCAG 1.4.1). Hovering the toggle or its
  label takes the edge to the body ink, or the fill to `$accent-solid-hover`
  when on; pressing either stretches the thumb a step towards the other end,
  marked `data-pressed` (`src/lib/press-feedback.ts`) as well as
  `:active`; the focus ring is the shared one. Disabled is dashed and
  unfilled, its thumb muted in either position and its label dimmed, as a
  field is; `aria-disabled`, a filter row's while its list is on its way,
  stops the hover and press looks and leaves the row's fade to grey it.
  `tests/scss/tokens.test.ts` holds the edge and thumb at 3:1 (WCAG
  1.4.11) against the page and the card in both themes, off, on and hovered
  on: the lowest is the light theme's on track against the page and its
  thumb on it, 4.65:1. Under forced colours the thumb is drawn in
  `CanvasText`, and on the track in `Highlight`.
- **Disabled is an attribute, not a class**, and looks the same on a field as
  on a button: a dashed edge and no fill. A disabled field also takes the muted
  ink and dims its `.field__label`, since a faded box alone reads as a live
  one on a dim screen. The label dims for a disabled control only, not any
  disabled descendant, since a select's placeholder is a disabled option. A
  component never restates it.

**Cancel asks when there are changes** (MB.115, the owner's call, for every
admin form). While a form has unsaved changes, the same flag that turns its
Save on, Cancel, and the modal's Close button, Escape and a click outside,
ask "You have unsaved changes. Discard them?" over the form, with
**Discard Changes** (`.btn--destructive`) and **Keep Editing**
(`.btn--quiet`), the focus on Keep Editing; a way out tried again while it
asks flashes it, the secondary's tint fading twice in 600ms, a still outline
shown twice under reduced motion.
With nothing changed they close at once; a save or a
delete never asks. One guard draws it for every form
([`components/modal.md`](components/modal.md), "Unsaved changes").

**A form asks over itself** (MB.115, the owner's call). Every question a
form asks before it acts, the unsaved changes' and each Delete's, is one
card, `ConfirmOverlay`: the modal's raised surface at the floating
elevation, `$narrow-column` wide, centred in the part of the modal's body in
view over a scrim of the page's ground at 75%, the form beneath it dimmed and
`inert` until it is answered. It fades in over `$motion-short`, and not
under reduced motion ([`components/modal.md`](components/modal.md), "Asking
over the form").

**A narrow form stacks its buttons.** A `.form` is a size container, and under 28rem of its own width its `.form__actions` or `.modal__actions` row turns to a column: each button full width, in order, any `margin-inline` pushing a Delete aside reset. Above that, every form's row fits one line. It keys off the form's width rather than the screen's, so a form in a narrow modal stacks too (the owner's call).

The pieces around a field and a form's buttons that more than one form
shares (MB.115), each written once in `_primitives.scss` where every admin
form had kept its own copy. The `Field` component draws the first two around
a control ([`components/field.md`](components/field.md)), and `FilterForm`
draws `.filter-row` ([`components/filter-form.md`](components/filter-form.md)):

| Class               | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.field__label-row` | A label and what stands beside it on its line, an `InfoTip`'s ⓘ or the required mark, a `space(1)` apart. It is the position a tip opens from, so the tip lines up with its field                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `.field__required`  | The asterisk hard against a label whose field a save asks for, in the error red. The markup hides it from a screen reader, which hears the control's `aria-required` instead of "star"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `.form__aside`      | The button set apart at the row's far end, an edit's Delete, so it is not pressed for Save. A `margin-inline-start: auto`, which the narrow form's stacking takes back                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `.filter-row`       | A list's filter form: the query, its selects and checks and the Filter button, wrapping, level on the line's end. A size container: under 28rem of its own width, as on a phone, the query, its first child, takes the whole line and the rest wrap beneath it, the stacked filter the owner chose at MB.115's review over one folded behind a disclosure; Filter and Clear, `.filter-row__actions`, wrap together onto a full line of their own, two thirds to one, or halves once a third cannot hold Clear's label. A `.field` with `.filter-row__typeahead`, a type-ahead that is a native select before hydration, stands at `$filter-choice-width` in either form. While its list is on its way it is `aria-busy`, and its fields fade and grey as a tab row's tabs do |
| `.list-frame`       | A list page's root, a `ListFrame` ([`components/list-frame.md`](components/list-frame.md)): its filter, notice or empty state, table and pager, a `space(5)` apart, a paragraph in it with no margin of its own. Its `.list-frame__body`, the list under the filter, is spaced the same, and fades in when a new page replaces the skeleton                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## The page frame

`.page-frame` is the centred, full-height column of a page with no AppShell:
Welcome, sign-in, the account pages, the not-authorized page and the
invitation. Its children stand `space(6)` apart and stop at `$measure`;
`.page-frame--narrow` stops them at `$narrow-column` (28rem), the forms'
column. It is `min-height: calc(100dvh - $top-inset)` with `space(6)` above
and below and `space(4)` at the sides, `border-box`, so a page a screen high
does not scroll by its own padding or the banner above it.

- **The gap alone spaces the column.** `.page-frame > *` clears every
  child's block margins, which outranks bare `section`'s from
  `layout-base` and `.page-header`'s own, so neither stacks on the gap.
- **The width and its cap sit inside `:where()`**, so they carry no
  specificity. In the app the class layer compiles as `body .x` (0,1,1) and
  would beat a component's single class; in the workshop it compiles as
  `:where(.ladle-story-frame) .x` (0,1,0), where source order decides. Under
  `:where()` a component's own narrower column, such as the sign-in panel's,
  wins in both. A primitive rule a component must be able to override is
  wrapped the same way; check it in the app, not only the workshop. The
  other way round holds too: a component that carries a primitive class
  and restates one of its properties compounds the two, as the sign-in
  card's `.sign-in-panel.panel` does for its padding, since a lone
  component class loses to `body .panel` in the app while the workshop
  shows it winning.
- **`.page-frame__section`** is a titled section of a framed page, a
  `space(3)` column whose `h2` takes no margin, held `$top-inset` plus
  `space(4)` clear of the top when the page's own nav jumps to it.
  **`.page-frame__rule`** is the 1px `$text-muted` hairline between two.

## The admin layout

`.admin-layout` is the frame every `/admin` page sits in (MB.115): the admin
nav above, the page below, a `space(5)` apart. It is a column as wide as
`$wide-column` (80rem), centred, with `space(6)` above and below and
`space(4)` at the sides, `border-box`. It is wider than `.page-frame`
because its pages hold tables, and it is neither full height nor centred
down the window, since a list page runs as long as its rows. The width is
the owner's call at MB.115's review: the user list's seven columns need
about 77rem before they stop scrolling inside their frame, the privilege
ledger has seven too, and at the old 64rem the user list's sticky Impersonate
column sat over Signed Up on a 1280px window. Only `.admin-layout` reads the
token, so nothing outside `/admin` widens with it. Its paragraphs
still stop at the measure. The width and its cap sit inside `:where()`, as
the page frame's do, so a single class can change them. It is a primitive
rather than AdminNav's own rule because the admin layout and the admin
components' stories use the class as their frame. Inside it a page header's
action, and a tab's, spans the line at phone width ("Buttons", above).

## Tables at phone width

A table whose rows turn into cards on a narrow screen, so no column scrolls
out of sight (MB.115). Add `data-table--stack` beside `data-table`, and every
column's cell names its column in a `data-label` attribute:

```html
<div class="data-table-frame">
  <table class="data-table data-table--stack" role="table" aria-label="Categories">
    <thead role="rowgroup">
      <tr role="row">
        <th scope="col" role="columnheader">Name</th>
        …
      </tr>
    </thead>
    <tbody role="rowgroup">
      <tr role="row">
        <td role="cell" data-label="Name">Protection</td>
        …
        <td role="cell" data-label="" class="data-table__card-action">
          <a class="icon-tip__edit" href="…">…</a>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

- **It stacks by its frame's width, not the screen's.** `.data-table-frame`
  is a size container named `data-table`, and under `$table-stack-width`
  (40rem) of it each row becomes a card: a grid on `$surface-card` with
  `radius('surface')` and `space(4)` of padding, a `space(3)` gap between
  cards and between the cells in a card (the owner's call at MB.115, a card
  of text alone having read cramped at a table row's spacing), every cell a
  block beneath the last. Every card is on the card
  surface, so the bands give way. A frame measures its own width only while
  that width does not come from the table inside it, so it sits as a block or
  a stretched flex item, never in a row that shrinks to fit.
- **The header row is hidden but still read.** It is clipped as
  `.visually-hidden` is, so a screen reader still has the column names.
  Each cell is led by its own name instead, drawn from `data-label` by a
  `::before` in the muted ink at the caption size, `space(1)` above its value (half the `space(2)` between cells, so a label sits with its own value). A cell whose `data-label`
  is empty, an action such as Impersonate, has no label and spans
  the card.
- **A row's Edit stands at its card's top right**, beside the first line
  (MB.115, the owner's call). Its cell, label empty, also carries
  `.data-table__card-action`: a row holding one becomes a two-track grid,
  `minmax(0, 1fr) auto`, the first cell in the first track, the action in
  the second on the first row, and every other cell across both beneath.
  The grid places it, not the markup, so the columns and the keyboard order
  stay as the desktop has them. UserList places its Impersonate the same
  way by its own rule, written before this primitive.
- **A stacking table writes out its roles**: `role="table"`, `rowgroup`,
  `row`, `columnheader` and `cell`. WebKit drops a table's meaning once
  `display` changes on its parts, so a screen reader in Safari would read the
  cards as loose text; the explicit roles put the meaning back. They are the
  roles the elements have already, so nothing else changes, and a jsdom test's
  `getByRole('cell')` finds a `td` either way. Every stacking table spreads
  them from one helper, `src/lib/table-roles.ts`: `tableRole('row')` for a
  part, and `stackCell(label)` for a cell, which carries its `data-label` too.
- **The label is written twice.** `content: attr(data-label)` and then
  `content: attr(data-label) / ''`: the second gives the label an empty
  alternative text, so a screen reader, which has the header, does not hear
  the column name twice. Safari 16.4, the oldest browser supported ("Binding
  rules"), drops the second declaration and keeps the first, so there the
  name is read twice, which is acceptable.
- **A sticky cell is reset in its component.** A cell made
  `position: sticky`, as UserList's Impersonate column is, only works while
  the frame scrolls, and in a card it would sit over its neighbours, so the
  component sets it back to `static` under the same container query. The
  primitive leaves `position` alone, since a cell may be `relative` to anchor
  a tip.

## Link rows and provider marks

**`.link-row` is a wrapping row of links that is not a bulleted list**: a
page's own nav, the admin nav. A `space(2)` by `space(5)` gap, and the
list's indent, item margins and `typography-base`'s ◆ marker cleared, since
the marker would sit against the link before and hang outside the first.

**The link to the page you are on carries `aria-current="page"`**, which
tells a screen reader, and `.link-row` draws it by shape rather than hue
(MB.115): weight 500 and a `$rule-heavy` underline set `space(1)` below the
letters, where every other link has the browser's hairline. A colour alone
would fail WCAG 1.4.1, which asks that no meaning rest on colour. The admin
nav is the first to mark its current page.

**A tabbed page's tab row is not a `.link-row`** but a segmented control
of its own: one rounded track, the open tab a raised pill inside it, the
segments scrolling within the track where they run past it rather than
wrapping ([`components/tabbed-page.md`](components/tabbed-page.md),
"Styling"). Its links are still a `nav` of links marked by `aria-current`.

**`.provider-mark` is a provider's mark on a 1.5rem circle of its brand's
ground**, as its sign-in button gives it one: the marks are drawn for those
grounds. `--google`, `--discord`, `--facebook` and `--microsoft` take
their `fill` from `brand-color()`, and a white one its brand's `edge`, which
holds 3:1 against both pages ("Brand colours", above). The circle is
`border-box`, so an edged one is the same size as the rest. The markup is the
`ProviderMark` component's ([`components/provider-mark.md`](components/provider-mark.md)).

## Designing a section

What each section review (MB.115 to MB.124) designs to:

- **Build from this layer, and grow it rather than going round it.** A page
  takes its colours from the tokens, its lengths from `space()`, its radii from
  `radius()` and its small type from `type-size()`. A shape two sections
  need is a primitive in `_primitives.scss`, drawn on the `Foundations` page,
  not two component rules.
- **One solid button per view**, on its primary action. Everything else is an
  outline, quiet, or the wax for what destroys something.
- **A page with no AppShell sits in `.page-frame`**, or
  `.page-frame--narrow` when its content is a form ("The page frame",
  above). A page's own row of links is a `ul.link-row`, and each titled
  section a `.page-frame__section` named by its `h2` through
  `aria-labelledby`, so a screen reader lists it as a region.
- **Forms are the field primitives.** An error is a `.field__error` beneath
  its control from either source, and a rule that belongs to no field is a
  `Notice` above them all ([`components/notice.md`](components/notice.md)).
  Use the component rather than writing the `.notice` markup: its `kind`
  picks the role, and the role is what makes a message that arrives late get
  read out.
- **A failed request is read by `readGraphqlFailure`**
  (`src/lib/graphql-failure.ts`). Pass it the names of the fields the form
  draws its own errors under. It answers either one of those fields and its
  message, or one sentence for the form's `Notice`: the server's own, or
  `GENERIC_FAILURE` when the request got no usable answer. A form that places
  several field errors at once, as the admin forms and `IngredientForm` do,
  reads them with `readGraphqlIssues` beside it, which hands back every issue
  of a refusal, or one pathless issue carrying the same sentence.
- **A section head is `.header`** with an `.eyebrow`, the heading, and a
  `.lede` where the section needs saying what it is for.
- **The copy has one voice.** Speak to the reader as "you", in plain words.
  A message says what happened in one sentence and what to do in the next.
  "Please try again." goes only where trying again can help, so a refusal
  that will refuse again says what to change instead. The same thing keeps
  the same name everywhere: a "sign-in method", never a "sign-in option", and
  an email "address". Every label, button and heading is title case
  (`.claude/rules/components.md`, "Copy").
- **Use the shared pieces rather than their markup.** A field is `Field`'s
  `TextField` or `SelectField`, or its `FieldShell` around a control of
  the form's own; a button with a spinner is a `BusyButton`; a list's filter
  is a `FilterForm`; a page's heading and its action are a `PageHeader`, and
  a page in tabs is a `TabbedPage` with each tab's action from its route
  group's `@action` slot;
  and a modal opened by its page's address is a `RouteModal`
  ([`components/modal.md`](components/modal.md)). Each is in
  `claude-docs/components/`.
- **Lists are the list primitives.** A list page's root is a `.list-frame`,
  its filter form a `.filter-row`, and its table a `.data-table` in a
  `.data-table-frame` with the `--stack` modifier, its explicit roles and a
  `data-label` on every cell, so it turns to cards on a phone rather than
  scrolling sideways ("Tables at phone width", above).
- **Prose stops at the measure**; a table or a grid may be as wide as it
  needs.
- **Both themes, and 375px.** A review signs off in the workshop in both, at
  phone width, with every text pairing at 4.5:1 and every edge a control
  depends on at 3:1.

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

- `src/scss/_variables.scss` — base colour palette, badge tokens, the brand
  colours and `brand-color()`, `$narrow-column`, the `$font-body` / `$font-heading` / `$font-mono` stacks, the
  `$measure`, and the three scales with their accessors — `type-size()`,
  `space()` and `radius()` — a component `@use`s directly.
- `src/scss/_mixins.scss` — `modal-surface`, `chip`, `badge`, `tip-bubble`,
  `icon-button` and `icon-button-edit` (an icon control's square box, and
  the green every Edit pencil wears, [`components/icon-tip.md`](components/icon-tip.md)),
  `theme-dark` / `theme-light`, `semantic-tokens` (the per-theme
  badge custom properties), `focus-ring`,
  `theme-transition`, `reduced-motion`, `font-smoothing-antialiased`.
- **Three `*-base` mixins**, each emitting nothing on its own `@use` and
  `@include`d at exactly one site, `globals.scss`'s `body`:
  - `_typography.scss` → `typography-base` — headings, body copy capped at
    `$measure`, links, lists, the text roles `.eyebrow`, `.meta`,
    `.binomial` and `.lede`, and `.tight-headings`.
  - `_layout.scss` → `layout-base` — bare `section` / `header` structure, plus
    `.header` / `.footer`.
  - `_primitives.scss` → `primitives-base` — the class layer: `.panel`,
    `.btn` and its `--solid` / `--quiet` / `--destructive` variants and
    `--small` size, `.notice`, `.page-frame` and its parts, `.link-row`,
    `.provider-mark`,
    the form fields (`.form`, `.field`, `.input`, `.select`, `.textarea`,
    `.checkbox`, `.switch`, `.fieldset`), `.modal` / `.modal__actions`, `.specimen*`,
    `.chip` and `.chip.is-selected` over `chip()`, the `.badge--*` classes over `badge()`, and `.visually-hidden`, for text a
    screen reader reads and nothing draws, such as a live region's news.
- `src/app/fonts.ts` — Cormorant Unicase (weights 500/600/700) and Lexend,
  self-hosted at build time via `next/font/google`. The CSS variables it defines
  on `<html>` are what `$font-heading` / `$font-body` reference.
- `src/app/globals.scss` — the single global stylesheet, imported once by the
  root layout, and the one `@include` site for the three mixins above. Resolves
  the theme in **three** states, not two: `:root { @include theme-dark }` (dark
  is the default), a `prefers-color-scheme: light` block, and an explicit
  `html[data-theme='light']` override.
- No `_buttons.scss` — `.btn` and its variants live in `_primitives.scss`.
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
