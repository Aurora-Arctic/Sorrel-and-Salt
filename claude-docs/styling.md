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
  collides with accent (96°) or secondary (8°). A ninth group is a row an admin
  adds, outside the rotation, held to M5.6b's contrast check.
- **`badge()` takes no variant argument, deliberately.** The mixins set colour,
  edge and geometry only — never width, margin, layout or a modal backdrop. A
  component restating a mixin's colour is a bug.
- **`adjustFontFallback` stays `true`** in `src/app/fonts.ts`; setting it false
  reintroduces layout shift.
- **Lengths, radii and small type come from their scales**: `space()`,
  `radius()` and `type-size()`. A length off the scale is a chip's or a
  badge's inner geometry, a control's target size, or a heading's size — and
  says so in a comment.
- **Body copy keeps to the reading measure, `$measure` (66ch)** — the longest
  line that still reads comfortably. `ch` is the width of "0" in the element's
  own font, so the measure follows the text it caps: 660px of Lexend at 1rem.
  `typography-base` sets `max-width: $measure` on every `p`, so a layout can be
  as wide as a table or grid needs while its prose stays readable, and no page
  has to remember it. A component never widens a paragraph past it; running
  text that is not a `p`, such as a long list item or a description, takes
  `max-width: $measure` itself; and a narrower column, as the forms use, is a
  component's own choice. `Welcome` and `NotAuthorized` size their whole
  column to it. `tests/e2e/admin.spec.ts` asserts it on a layout wider than
  the measure, with 66ch measured in the paragraph's own font.

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

**That is now the seed's source and nothing else.** A group's colours are a
pair of hexes on its `category_groups` row (MB.35): M4.3 resolved each map entry
to the two hexes it wrote, and a chip reads the row, never the map (MB.36). A
ninth group is a row an admin adds with M5.6b's two pickers, each checked
against the harder of its own theme's two surfaces; it is legible in both themes but does not join
the rotation (§6).

## Badge palettes

Three palettes, deliberately not equals. Two appear on an IngredientCard.
**Safety** is a warning — an ingredient flagged toxic or unsafe to burn (story 53) — and wears the sealing-wax hue, the loudest thing in the palette, lifted in
saturation alongside the groups. **Low stock** is an inventory state, not an
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
per key of `$category-groups`, which a group created at runtime cannot have.
`tests/guards/chip-colour-source.test.ts` fails if either shape returns, in a
source file or in any stylesheet's compiled CSS, and `chip()` refuses a slug at
compile time.

`light-dark()` is newer than Next's default browser targets (Safari 16.4), so
Turbopack's Lightning CSS lowers it: every `color-scheme` declaration also sets
a pair of `--lightningcss-*` switches, and the chip reads those. Nothing in this
project writes either.

**The contrast holds for any colour the write check admits.** An unselected
chip's label is the colour itself on whatever surface holds the chip, a page or
a card, and a selected chip's label is `$text-on-color`, the page surface, on a
fill of that colour. So M5.6b checks each colour against the harder of its own
theme's two surfaces: `colorDark` against the dark card, which is lighter than
the dark page, and `colorLight` against the light page, which is darker than
the light card. Clearing that surface clears the other, and the selected label
with it. Checked against the dark page instead, a dark colour could clear the
floor and still read under it on a card: the seeded eight measure 5.1–5.3:1 on
the dark page and 4.6–4.8:1 on the dark card (MB.36).

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
  Foundations page.

## Spacing

Every margin, padding and gap takes a step from `space()`, eight steps on a
0.25rem base: 0.25, 0.5, 0.75, 1, 1.5, 2, 3 and 4rem. `space(4)` is 1rem. An
unknown step fails to compile, as a mistyped group does. The steps are the
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
- The five pages a full screen high (`Welcome`, `NotAuthorized`,
  `SignInPanel`, `SignInMethods` and `EmailForm`) take
  `min-height: calc(100dvh - #{$top-inset})`.

A new full-height page, or anything new fixed to the top, does the same.

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
included. Four variants:

- **The outline (`.btn`)**, the default: the accent on an edge, filling on
  hover. The edge is 1.6px on every variant, heavier than a field's 1px, since
  a hairline in the accent barely reads as a colour. A border width rounds down
  to whole device pixels (CSS Values 4, "snap as a border width"), so it draws
  1.5px on a 2x screen and stays 1px on a standard-density one.
- **`.btn--solid`**, a view's one primary action — Save, Send, Continue.
  Filled in the accent, with the label on `$text-on-color`, and its own hover
  step (`--accent-solid-hover`, above).
- **`.btn--quiet`**, an action that changes nothing: Cancel, Keep It, Back.
  The body ink on an edge, so it neither competes with the primary nor reads as
  destructive — and, unlike the muted ink, not as disabled either.
- **`.btn--destructive`**, what destroys something: Delete, Remove. The wax,
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
IngredientForm's two saves and its reference panel use the same one.

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
([`components/pager.md`](components/pager.md)), which CategoryList,
IngredientFormValueList and UserList render.

**`.page-header` puts a page's heading and its one primary action on one
line**, the action at the end (the owner's call, M5.6): `/admin/categories`'
Add Category beside its H1. The row is centred and the action brought down
0.25rem, the owner's measure: a heading's box carries room below its letters,
so a centred button reads high and one on the baseline low. The row wraps on
a narrow screen rather than squeezing the heading.

**The admin tables are banded**: every even body row on `$surface-card`, the
surface a modal wears, so a wide row stays readable across. Each cell is
inset `space(3)` on both sides so no text meets a band's edge, and aligned on
the baseline so a row's small button reads on its text's line. A 1px
`$text-muted` hairline runs under the header row. The rules are the
`.data-table` primitive, inside a `.data-table-frame` that scrolls a wide
table sideways rather than widening the page: CategoryList and UserList each
carried them until IngredientFormValueList made a third (M5.6a), and
CompendiumList (M5.5) is on it too.

## Form fields

The class layer every form is built from, in `_primitives.scss`:

| Class                                            | What it is                                                                                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.form`, `.form__actions`                        | The column of fields, a `space(5)` apart, and the row of buttons after it, `space(2)` further off and as far again from what follows: 2rem either side in a modal (M5.5). A `.modal__actions` row in a `.form` takes the same |
| `.field`                                         | One field: label, optional hint, control and error, `space(2)` apart                                                                                                                                                          |
| `.field__label`, `.field__hint`, `.field__error` | The parts around the control                                                                                                                                                                                                  |
| `.input`, `.textarea`, `.select`                 | The control, one box for all three                                                                                                                                                                                            |
| `.checkbox`                                      | A `<label>` wrapping its box, so the whole line is the target                                                                                                                                                                 |
| `.fieldset`, `.fieldset__legend`                 | Rows under one name: checkboxes, or a list of entries                                                                                                                                                                         |
| `.notice`, `--error`, `--success`                | A sentence about the whole view rather than one field                                                                                                                                                                         |

- **A field's hint is an info tip beside its label** (`InfoTip`,
  [`components/info-tip.md`](components/info-tip.md)), not a line beneath it:
  the owner's call in M5.9, once a form of many fields read as a wall of
  hints. The tip's text stays in the field's `aria-describedby`, so it is read
  with the field whether open or not, and the tip opens while the field has
  focus, so a keyboard that skips the ⓘ still shows it. `.field__hint` remains for a line that
  must stay in view, such as why a field is disabled, since a shut field that
  does not say why reads as broken. `IngredientForm` is the first form built
  this way; an older form adopts it at its design review.
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
- **Disabled is an attribute, not a class**, and looks the same on a field as
  on a button: a dashed edge and no fill. A disabled field also takes the muted
  ink and dims its `.field__label`, since a faded box alone reads as a live
  one on a dim screen. The label dims for a disabled control only, not any
  disabled descendant, since a select's placeholder is a disabled option. A
  component never restates it.

## Designing a section

What each section review (MB.115 to MB.124) designs to:

- **Build from this layer, and grow it rather than going round it.** A page
  takes its colours from the tokens, its lengths from `space()`, its radii from
  `radius()` and its small type from `type-size()`. A shape two sections
  need is a primitive in `_primitives.scss`, drawn on the `Foundations` page,
  not two component rules.
- **One solid button per view**, on its primary action. Everything else is an
  outline, quiet, or the wax for what destroys something.
- **Forms are the field primitives.** An error is a `.field__error` beneath
  its control from either source, and a rule that belongs to no field is a
  `.notice` above them all.
- **A section head is `.header`** with an `.eyebrow`, the heading, and a
  `.lede` where the section needs saying what it is for.
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

- `src/scss/_variables.scss` — base colour palette, the category-group seed
  map, badge tokens, the `$font-body` / `$font-heading` / `$font-mono` stacks, the
  `$measure`, and the three scales with their accessors — `type-size()`,
  `space()` and `radius()` — a component `@use`s directly.
- `src/scss/_mixins.scss` — `modal-surface`, `chip`, `badge`, `tip-bubble`,
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
    `.btn` and its `--solid` / `--quiet` / `--secondary` variants and
    `--small` size, `.notice`,
    the form fields (`.form`, `.field`, `.input`, `.select`, `.textarea`,
    `.checkbox`, `.fieldset`), `.modal` / `.modal__actions`, `.specimen*`,
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
