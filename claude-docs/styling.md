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
  component needs them, never routed through a parent (§9). Each component's
  `index.scss` is a plain global stylesheet, never a `.module.scss`: the
  primitives are addressed by class from JSX and inside component rules, and
  BEM names do the scoping
  ([`design-decisions/m6.14-global-sass-not-css-modules.md`](design-decisions/m6.14-global-sass-not-css-modules.md)).
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
- **Never wash a chip or badge ground with its own group colour and leave the label in that colour.** The eight
  group hues are tuned to sit just above 4.5:1, so a visible wash drops them
  under; solid holds, and so does a wash with the body ink stirred into the label ("Category chips").
- **A badge palette declares `solid`, `tinted` or `ink` and emits only that
  treatment's parts.** `badge-token('safety', 'bg')` failing to compile is deliberate, not
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
- **Lengths, radii and type sizes come from their scales**: `space()`,
  `radius()`, `type-size()` and `heading-size()`. A length off the scale
  is a chip's or a badge's inner geometry or a control's target size — and
  says so in a comment.
- **A length with a role of its own is a token**, under "Motion and layout"
  in `_variables.scss`, so the components that share the role share the
  number (MB.115): `$wide-column` (the admin area's column, 80rem),
  `$dialog-column` and `$dialog-column-wide` (a dialog's content, 32rem and
  48rem), `$icon-size` (a small control's 1.5rem square, WCAG 2.2's 24px
  target) around a `$glyph-size` mark (1rem), `$glyph-size-small` (0.875rem,
  a click callout's arrow and a round mark's icon), `$icon-size-large` around
  `$glyph-size-large` (2rem around 1.25rem, a list row's Edit pencil, larger
  outside a form on the owner's call), `$tip-width` (a tip's widest
  line, 18rem, capped at the window), `$close-target` (the dialog's close
  button, 2rem), `$table-stack-width` (the frame width under which a table
  stacks, 40rem), `$filter-choice-width` (a filter's select or type-ahead field, 14rem), `$filter-search-basis` (where a filter's search box starts before it grows, 16rem), `$table-cell-inset` (the admin table's inline cell padding, `space(3)`), `$switch-width` (the switch's track, 2.75rem, `$icon-size` high), `$rule-medium` and `$rule-heavy` (the 2px and 3px rules
  that mark something by weight as well as colour), and `$toggle-corner` (the
  theme toggle's 3.9rem corner, which the impersonation banner keeps clear
  of). A duration with a role of its own is one too: `$motion-short`
  (150ms), a control answering a press with a movement of its own, as the
  switch's thumb slides, `$motion-medium` (300ms), a movement the eye follows,
  as the details window's description opens under its Show More bar, `$tip-fade` (500ms), a tip bubble's fade, and `$icon-tip-fade`
  (120ms), IconTip's quicker one.
- **A mix or a level used in more than one stylesheet is a token** too:
  `$fill-quiet` (the muted ink 18% into the card: a chip's wash, the
  skeleton's bars, an entry's targeted section, MenuButton's plain item
  pointed at, focused or chosen, and the hover of every
  navigation link, tab and outlined chip), `$fill-highlight` (the accent 12%
  into whatever is behind: MenuButton's one primary item, and
  a menu's item and a suggestion list's row in the account menu, the shell's
  menu and Combobox, pointed at, focused or chosen), `$fill-highlight-field` (the same 12% over the field's
  ground: a quiet button pointed at), `$hairline` (the muted ink 45%
  into whatever is behind: the ingredient form's section rules, the tab
  strip's shade, a quiet button's edge, the tab row's track), `$edge-highlight` (the accent 45%
  into the hairline: a quiet button's edge pointed at) and `$opacity-disabled` (0.55: what is left of a control
  that is busy or cannot be used).
- **Body copy keeps to the reading measure, `$measure` (66ch)** — the longest
  line that still reads comfortably. `ch` is the width of "0" in the element's
  own font, so the measure follows the text it caps: 660px of Lexend at 1rem.
  `typography-base` sets `max-width: $measure` on every `p`, so a layout can be
  as wide as a table or grid needs while its prose stays readable, and no page
  has to remember it. A component never widens a paragraph past it; running
  text that is not a `p`, such as a long list item or a description, takes
  `max-width: $measure` itself; and a narrower column, as the forms use, is a
  component's own choice. A centred page, in the shell or outside it, takes its
  column from `.page-frame`, which stops at the measure, or at the forms' narrower
  column with `--narrow` ("The page frame", below). `tests/e2e/admin.spec.ts` asserts it on a layout wider than
  the measure, with 66ch measured in the paragraph's own font.
- **Browser floor: Baseline Widely Available, and below it the app degrades,
  never breaks** (M10.24). A feature may be used freely once Chrome, Edge,
  Firefox and Safari have all shipped it for 30 months. `package.json`'s
  `browserslist` holds the one statement, `["baseline widely available"]`, and
  it rolls forward each month with the data the lockfile pins, so a check that
  passes today still passes tomorrow. On 2026-10-12 it resolved to Chrome and
  Edge 123, Firefox 124, and Safari and iOS Safari 17.4. Turbopack's Lightning
  CSS reads the same entry and lowers newer syntax to it, as it does
  `light-dark()` (below), and `npm run lint:css` refuses CSS past it
  (`stylelint-plugin-use-baseline`). A date was not pinned, because a pinned date
  is the hand-kept version list this replaces under another name. A feature past
  the floor is allowed only in the three shapes
  [`.claude/rules/components.md`](../.claude/rules/components.md) lists.
  JavaScript past it is held by `tests/guards/browser-floor.test.ts`.
  Playwright's projects are Chromium only, so the owner's own look at the dev
  server in Safari and Firefox is part of every sign-off. The decision:
  [`design-decisions/m10.24-browser-floor.md`](design-decisions/m10.24-browser-floor.md).

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

**The warning ochre is the one hue picked for a role**, the owner's pick on
2026-10-19 for a warning that should not read as an error: `$ochre-deep`
(`#8a5a00`) on light and `$ochre-bright` (`#d9a441`) on dark, the
`--warning` token and its `$warning` alias. It draws a warning notice's bar,
tint and triangle, which need 3:1 as a graphic (WCAG 1.4.11), and one line of
text, a shortfall in Record a Working's preview, which needs 4.5:1. It clears
both: 4.89 on the light page, 5.44 on the light card, 8.32 and 7.55 on the dark
ones, and over its own tint 4.47 and 4.95 light, 7.35 and 6.57 dark.
`tests/scss/tokens.test.ts` holds those floors: 4.5:1 as text on the page and
the card, 3:1 as a mark on its tint.

Shadow inks are per-theme: a 0.8-alpha near-black under a card reads as a hole
punched in parchment, so light mode gets a much softer one.

## Category-group colours

§6's eight groups, which exist so the chip selector can collapse 101 categories
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

Nine palettes, deliberately not equals. Three appear on an IngredientCard.
**Safety** is a warning — an ingredient flagged toxic or unsafe to burn (story 53) — and wears the sealing-wax hue, the loudest thing in the palette, lifted in
saturation. **Low stock** is an inventory state, not an
alarm (story 54), so it takes the muted ink and is left unsaturated. **Out of Stock**
(M9.8) is a jar at nothing, and takes a muted red of its own (the owner's call, 2026-10-18): `$wax` with its saturation pulled down (`$wax-muted-dark`, `$wax-muted-light`), so it is plainly a red but quieter than safety's solid fill. It was drawn as a tint until 2026-10-21, and is now the `ink` treatment, the red alone with no box, so it never reads as a second alarm. As text it measures 6.40:1 on the dark card, 7.04:1 on the dark page, 7.45:1 on the light card and 6.70:1 on the light page. The badge is its drawing alone (the owner's call, 2026-10-20), a slashed ring that Low's double chevron does not share, with the words in its name and tip, so its meaning never rests on colour. Since 2026-10-21 the stock badge has no box and takes the jars' inks (Low `$warning`, Out this palette's `fg`; [`components/stock-badge.md`](components/stock-badge.md)). That keeps
exactly one alarming badge in the app and spends no new hue, which matters because every
hue not already reserved belongs to one of the eight groups.

**Caution** (M8.14) marks an ingredient or form that carries safety notes. It is the safety red as a tint with a red edge (`$wax-caution-dark`, `$wax-caution-light`: the wax at +15% saturation, lifted 30% for dark and darkened 4% for light), so Toxic stays the one solid badge. Its label on its tint measures 4.94:1 dark and 6.49:1 light, and its edge 3.68:1 and 4.47:1 on the dark and light cards (3.89:1 and 4.18:1 on the pages). Beside Out of Stock it differs only in saturation, so the word, not the colour, tells them apart.

**Last used** marks
the sign-in button this browser last signed in with (MB.77). It is a pointer,
not a warning, so it is drawn solid in the accent's own inks (`$sorrel-bright`
dark, `$sorrel-vivid` light), a hue already reserved, and spends none of the groups'.
Its label on the fill is 7.95:1 dark and 4.68:1 light.

**Attention** (M10.32) marks something waiting on the reader: the account
menu's count of pending coven invitations and the dot on the avatar. It is
solid and wears safety's fill exactly, because that fill is already
contrast-checked for its label and a second red would spend a hue. Both
palettes read the same two tokens, `$wax-badge-dark` and `$wax-badge-light`
in `_variables.scss`, so they cannot drift apart. They stay separate palettes
so that a count is not named after a hazard in the code.

**Local** (M8.19) marks a coven's own entry, as against the compendium's, on
the ingredient page. It says where the row lives, not that anything is wrong,
so it is tinted, in the accent's inks, a hue already reserved; tinted rather
than solid, so it never reads as last-used's pointer. Dark takes
`$sorrel-bright`; light takes `$sorrel-deep`, the light accent's hover ink,
because `$sorrel-vivid` on its own tint measured 4.42:1, under 4.5. As drawn,
its label on its tint is 5.60:1 dark and 6.98:1 light, and its edge 4.23:1 and
4.66:1 on the dark card and page, 4.46:1 and 4.01:1 on the light ones.

**Annotated** (M8.14) marks a compendium entry with the coven's own changes. It wears Local's inks exactly, through the shared `$local-badge-dark` and `$local-badge-light` tokens (the same idea as an entry of its own), tinted, with Local's contrast. It is its own palette, never `badge--local`.

**Retired** (M12.24) marks a compendium entry the curators have retired, on
the ingredient page of a coven whose cupboard still names it. It is a fact
about the entry, not a hazard, so it takes low stock's treatment and inks
exactly (tinted, `$chalk-muted` dark, `$ink-muted` light), which spends no hue
and needs no new contrast check. It is its own palette so that the entry page
does not name a retired entry after stock, and so that the section's design
review can give it a look of its own.

**Muted** marks a plain fact beside a name that is no warning: a one-off ingredient in a spell's steps, and a picker row whose form is already in the jar. It takes the same treatment and inks as Retired and Low, so it needs no new contrast check, and is its own palette so that neither use borrows a name about the compendium.

Each palette is one ink per theme plus the **treatment** it is drawn in, and the
treatment decides which parts it emits:

- **`solid`** — the ink fills the badge and the label inverts onto it
  (`$text-on-color`). One part, `fill`. A solid fill is its own boundary, so it
  needs no edge; `badge()` still draws a transparent 1px border, as geometry, so
  a solid badge matches the height of a tinted one beside it.
- **`tinted`** — the ink mixed back into the card surface, so the badge tints the
  surface it actually sits on instead of carrying a hardcoded panel colour.
  Three parts, `fg` / `bg` / `border`.
- **`ink`** — the ink alone, for a mark that draws no box (Out of Stock, since
  2026-10-21). One part, `fg`, read as text. It emits no `.badge--<palette>`
  class, since `badge()` has no box to draw for it.

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
safety, attention and last-used badges. It is an alias for the page surface rather than a token of its own
because the answer is the same whatever the fill: on dark the fill is the light
thing and the label goes dark, on light the reverse.

It needs no contrast table of its own. A solid fill's label sits on the fill, and
the fill's ratio against the page surface is exactly the `vs page` figure already
measured for every group and every ink — the two questions have the same
arithmetic. **Worst pairing in the set is 4.68:1**, the light accent.

### Selected text

`::selection` in `globals.scss` swaps the page's two colours: the background is `$text-primary` and the text is `$text-on-color` (the page surface). The highlight is nearly black in the light theme and nearly white in the dark one, never the accent green. The pair is 14.77:1 in dark (chalk on soot) and 13.41:1 in light (iron gall on parchment), both past AA's 4.5:1. `tests/e2e/smoke.spec.ts` asserts the swap in both themes.

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

## Category chips

Amended 2026-10-19; this replaced the `selected` and `unselected` states. `chip()` draws a pill in one
of two emphasis levels. Neither draws a dot: the group colour sits on the full level's wash, border and label (the owner dropped the dot, 2026-10-19):

- **`full`**: the category chip, everywhere a category shows (the card, the entry page,
  pickers, filters, admin tables, the Combobox's chosen entries). A wash of the group colour
  (5% over `$surface-card`; 14% at first, lowered twice the same day on the owner's call — the ratios below were measured at 14%, and a lighter wash only raises them), a border at 35%, and the label in the group colour with 30% of
  `$text-primary` stirred in (`chip-wash()`, which the Combobox entry reuses as it keeps its
  own shape).
- **`quiet`**: neutral ink and a `$hairline` border, no group colour. It is the +N control's look, not a category chip. For a control
  rather than a category: the +N button, its one user. The colour field's preview shows `full` only.

**Size (2026-10-19).** `chip()` takes `$size: regular | compact`, alongside `$state`. Regular is the shape above. **Compact** is for a table cell (the admin Compendium's Categories column): no block padding and 7px inline (was 3px and 11px), and the card's `overline` text size. The wash, the 1px border and the label's colour mix are unchanged, so the contrast figures below hold. A compact chip measures about 18.8px tall in Chromium. The shared chip row takes it as `compact` (`category-chips--compact`: `claude-docs/components/category-chips.md`); a compact +N button keeps a 24px hit area through a transparent pseudo-element (WCAG 2.5.8) without growing its pill.

## Dotted lists

`dotted-row($item, $gap, $dot)` (`_mixins.scss`) lays a wrapping row of items with a dot between each pair: the card's forms line and the admin Compendium's Form cell. The dot is a circle drawn on every item after the first, in the margin to its left, and the row is clipped by that margin (`clip-path`, with a matching negative margin so nothing shifts), so a dot that would lead a wrapped line is never seen and none ends one. CSS cannot tell which item starts a line, so a rule on the item cannot do this. Each item holds a `.spoken-separator` comma, so a screen reader hears a list. `$item` is the class of the row's direct children.

**Why the ink is stirred in.** The old rule below says a wash of a group's own colour cannot
hold 4.5:1, and it was right for the colour as text: with the pure colour on a 14% wash, the
worst of the eight seeded groups (Mind & Spirit, light theme, on the parchment page) reads
3.56:1. Mixing 30% of the body ink into the label lifts it. Checked with a node script against all
eight seeded pairs on both surfaces of each theme, the lowest ratio in each is:

| Theme | Surface          | Lowest | Group            |
| ----- | ---------------- | ------ | ---------------- |
| Dark  | card (`#1f1c16`) | 5.51:1 | Practice & Place |
| Dark  | page (`#14120e`) | 6.16:1 | Practice & Place |
| Light | card (`#f9f5ea`) | 5.92:1 | Mind & Spirit    |
| Light | page (`#efe9da`) | 5.37:1 | Mind & Spirit    |

A group an admin adds is held to 4.5:1 for its colour alone (M5.6b), a looser test than the
eight seeded ones passed; the stirred label is checked against the seeded eight only, so a very
pale or very dark admin colour is worth a look in the colour field's preview.

## Chips, badges and the solid-fill rule

The two levels above replaced `selected` and `unselected`; the badge palettes still declare
`solid` or `tinted`.

**Solid is not decoration for a badge.** The obvious loud treatment, the group colour as a
low-opacity wash behind a label wearing the same colour, cannot hold 4.5:1: the eight hues
were tuned to land just above the floor. A solid fill sidesteps it; the chip's answer is to
move the label towards the body ink (above).

**The colour comes from the row, on the element.** `chip($dark, $light, $state)`
takes the pair rather than a slug, and by default reads it from the element's
`--chip-dark` and `--chip-light`, which `chipColors(group)` in
`src/lib/chip-colors.ts` sets inline from the group's `color`. `light-dark()` picks one off the `color-scheme` the theme mixins
already set, so the per-theme switch `semantic-tokens` once made at build time
happens at the element, and a theme toggle re-colours a chip without a render.
It replaced one `--group-<slug>` custom property and one `.chip--<slug>` class
per key of M0.7's `$category-groups` map (since retired), which a group created
at runtime cannot have.
`chip()` refuses a slug at compile time. A rule that needs the group's colour
outside a chip (a combobox row's bar, a group's mark) takes `group-colour()`
(`_mixins.scss`), the same `light-dark()` pick `chip()` makes.

`light-dark()` is newer than the browser floor (it needs Safari 17.5, the floor
is 17.4), so Turbopack's Lightning CSS lowers it: every `color-scheme` declaration also sets
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

### Badge sizes

A badge has three sizes, set in one place: `$badge-sizes` in `_variables.scss`, applied by
`badge-size($name)` in `_mixins.scss` (a mistyped name is a compile error). `badge()` itself
draws the `default` size, so a badge outside the ingredient card is unchanged. The two smaller
sizes are the card's alone, applied to the `.badge`s inside it. The components that draw
badges (`EntryMarks`, `CautionMark`, `ToxicMark`, `StockBadge`) take no size prop: the card
decides, from its own selector, so one badge reads the same wherever it is rendered.

| Size      | Text            | Padding (block, inline) | Least height | Used by                                         |
| --------- | --------------- | ----------------------- | ------------ | ----------------------------------------------- |
| `default` | caption (13px)  | 2px, 7px                | none         | every badge, everywhere                         |
| `medium`  | overline (12px) | 2px, 7px                | 24px         | the regular card                                |
| `small`   | overline (12px) | 2px, 5px                | 24px         | the compact card, the spell builder's step rows |

The 24px floor is the least a badge with a tip may be as a target.

Each size also lowers its label by an **optical drop**, taken from the top padding and given to the bottom so the height holds (the owner's call, 2026-10-20). Without it every badge's capitals sat above the box's centre: measured in Chromium, the space under the baseline was 1.26px more than the space above the capitals on the card, and up to 1.33px more on the entry page. Chrome rounds a font's ascent and descent to whole pixels, so 12px and 13px Lexend sit differently and each size has its own drop: `default` 0.0125em, `medium` and `small` 0.05em. The card's badges now centre within 0.04px; a `default` badge lands within half a pixel either way, since its baseline snaps to the pixel grid wherever the badge happens to sit. `text-box-trim` would do this from the font's own metrics, but it is past the browser floor. `badge-padding()` and `badge-padding-block()` in `_mixins.scss` apply it; a rule that sets a badge's block padding itself, as Out of Stock's heavier border does, goes through them.

## Brand colours

A sign-in provider's button wears the provider's colours, not ours:
`$brand-palettes` in `_variables.scss` holds each brand's `fill`, `ink`
and `hover`, and the `edge` a white button needs on our page, read through
`brand-color($brand, $part)`. A mistyped brand or part is a compile error,
worded as `badge-token()`'s. It is a compile-time map rather than custom
properties because the hues do not follow the theme and nothing reads them at
runtime; a part that ever does differ by theme is written
`(dark: …, light: …)`, and the accessor returns `light-dark()`, which
Lightning CSS lowers to the browser floor. SignInPanel's buttons and the
`.provider-mark` circle are its consumers; an SVG fill inside a mark is
artwork, and stays in `icons.tsx`.

Measured with `contrastRatio` (`src/lib/contrast.ts`), each edge or fill
against the page at 3:1 (WCAG 1.4.11), each ink against its fill and its
hover at 4.5:1. `tests/scss/tokens.test.ts` checks every pair below that is
held to a floor, which is all but the rows marked "before MB.116" and the
hover fills on the page, reading the colours from `$brand-palettes` and the
theme tokens, in one assertion per theme:

| Pair                                                    | Dark page `$soot`                                             | Light page `$parchment` |
| ------------------------------------------------------- | ------------------------------------------------------------- | ----------------------- |
| Google edge `#dadce0` (before MB.116)                   | 13.62                                                         | **1.13, fails**         |
| Google edge `#747775` (Google's current light button)   | 4.13                                                          | 3.74                    |
| Microsoft edge `#8c8c8c` (before MB.116)                | 5.56                                                          | **2.78, fails**         |
| Microsoft edge `#808080`                                | 4.74                                                          | 3.26                    |
| Discord / Facebook fill on the page                     | 4.06 / 3.88                                                   | 3.80 / 3.98             |
| Discord / Facebook hover fill on the page               | 2.91 / 2.85                                                   | 5.30 / 5.43             |
| Inks on fills (both themes)                             | Google 16.48 · Discord 4.61 · Facebook 4.82 · Microsoft 21.00 | the same                |
| Inks on hover fills (both themes)                       | Google 13.68 · Discord 6.42 · Facebook 6.57 · Microsoft 15.91 | the same                |
| Focus ring, the body ink at 66.6% (M12.45), on the page | 7.00                                                          | 4.94                    |
| Muted text `$text-muted` / `--accent` on the page       | 9.67 / 7.97                                                   | 5.99 / 4.65             |

**Hover is not held to 3:1.** WCAG 1.4.11 covers what identifies a control
and its states, and a hover ground is neither: the button is already known
by its resting fill, and keyboard focus is shown by the focus ring, which
clears 3:1 on every ground it is drawn on in both themes ("The focus ring", below). So Discord's and Facebook's darker hover grounds
may sit under 3:1 on the dark page. Microsoft keeps its white face in both
themes, with the darker `#808080` edge that clears 3:1 on the light page: the
owner's call at MB.116's sign-off, over Microsoft's own dark button.

## The focus ring

Keyboard focus is a 2px outline drawn 2px outside the element by the
`focus-ring($color, $strength, $placement)` mixin in `_mixins.scss`. A control
that fills its bar or its row, whose own edge would clip an outside ring, passes
`$placement: inset` and gets the ring 2px inside instead
(`@include focus-ring($placement: inset)`; a coloured one passes it third, as
`focus-ring($accent, $focus-ring-tab-strength, inset)`). It is last so the
callers that pass a colour and a strength by position keep working (MB.120). Its colour is mixed
towards transparent, `color-mix(in srgb, <colour> <strength>, transparent)`,
so the ring softens over whatever ground it crosses rather than standing at
the body ink's full 14:1, which read as harsh. The strength is
`$focus-ring-strength` in `_variables.scss`, 66.6% in both themes: the
owner compared 100%, 70%, 66.6%, 55% and 40% in both themes and chose 66.6%
(M12.45, 2026-10-20). The rings that set their own colour use the same
number, so Combobox's rings on a coloured chip fade the chip's own ink
(`currentcolor`) by it too.

Two rings keep another strength:

- **A link's ring** (`_typography.scss`) is the accent, at
  `$focus-ring-link-strength`, which each theme sets as
  `--focus-ring-link-strength`: the shared 66.6% in dark, and
  `$focus-ring-link-strength-light`, 75%, in light. The light accent starts
  at only 4.65:1 on the page, and 66.6% takes it to 2.61, under the 3:1 floor;
  75% is the least that clears it, at 3.01 (the owner's call, 2026-10-20).
  The page row passing by 0.01 is intended: it is the guard on the number.
- **The tab row's ring** (`TabbedPage/index.scss`) is the accent, drawn
  inside the pill, at `$focus-ring-tab-strength`, which each theme sets as
  `--focus-ring-tab-strength`: the shared 66.6% in dark, and
  `$focus-ring-tab-strength-light`, full strength, in light. On the light
  track and the open pill the accent starts at only 4.05:1, so 66.6% takes it
  to 2.42 and even 75% leaves it at 2.75 (the owner's call, 2026-10-20).

**Every button draws this ring, never the browser's own.** MB.121's keyboard
pass found three that drew Chromium's default ring, since nothing set one: the
icon buttons (the `icon-button` mixin), the stock dialog's jar picks and the
dialog's Close. The `icon-button` mixin now sets the shared ring on a button
alone (`&:where(button):focus-visible`), so an icon link keeps the accent ring
every link takes from the typography; the jar picks fill their row, so theirs
is inset; Close takes the shared ring
([`mb.121-workspace-ingredients-review.md`](design-decisions/mb.121-workspace-ingredients-review.md)).

The skip link's and the theme toggle's rings are the page's own colour round
an accent fill, so it is the fill they are told from; faded, the ring sits
closer to the ground behind it, and the fill is unchanged.

A ring marks a control's state, so it is held to 3:1 (WCAG 1.4.11), laid
over each ground it is drawn on. `tests/scss/tokens.test.ts` reads every
strength from the compiled CSS and checks every row below; it fails with
the shared strength at 40%, with the light link at 66.6%, and with the light
tab at 75%.

| Ring on                                 | Dark | Light |
| --------------------------------------- | ---- | ----- |
| The body-ink ring on the page           | 7.00 | 4.94  |
| … on a card                             | 6.61 | 5.18  |
| … on a card pointed at                  | 6.23 | 5.26  |
| … on the ingredient card's drawer, slot | 7.15 | 3.88  |
| … on the drawer's side                  | 4.30 | 4.17  |
| … on the drawer's back                  | 6.87 | 3.41  |
| A link's accent ring on the page        | 4.14 | 3.01  |
| … on a card                             | 3.97 | 3.22  |
| … on a card pointed at                  | 3.72 | 3.31  |
| A tab's accent ring on the open pill    | 3.18 | 4.05  |
| … on the track over the page            | 3.77 | 4.05  |
| … on the track over a card              | 3.49 | 4.49  |

**Not covered: a ring on a coloured chip.** Combobox's ring on a category
chip is the chip's ink faded over the chip's wash. For the seeded group
colours it clears 3.53 to 3.91 in dark and 3.17 to 3.31 in light (lowest:
`#606c2f`, light). The write-time check on a group's colours
(`src/lib/contrast.ts`) holds the colour itself at 4.5:1 against its theme's
harder surface, not this faded mix, so a colour an admin adds could put the
ring under 3:1. Noted, not fixed.

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
  The sizes are the `$heading-sizes` map in `_variables.scss`, read by level
  through `heading-size(1)` to `heading-size(4)`, and the face — the display
  family, 700, letter-spaced 0.01em — is the `heading-face` mixin.
  `typography-base` sets h1 to h4 from the two. A name set in the heading face
  outside a heading, as the context row's "Admin" and the coven switcher are,
  takes `@include heading-face; font-size: heading-size(4);` rather than
  restating the numbers, and keeps its own line height.
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

Below body copy, type takes one of five sizes by role from `type-size()`:
`small` (0.875rem) for what a person acts on — labels, buttons, notices,
field errors; `caption` (0.8125rem) for hints, metadata, chips and badges;
`overline` (0.75rem) for the `.eyebrow`; and `tab` (0.6875rem) for the one
place five labels sit across a phone, under the icons of the section nav's
bottom bar (MB.7). Two steps sit between body copy and the smallest
heading: `title` (1.25rem) for a form section's or a detail panel's title
(CollapsibleSection, UserDetail), and `lead` (1.125rem) for a form's group
name (IngredientForm). The headings' scale is `heading-size()`'s, above.

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

- The shell's bar (`position: sticky`), `ThemeToggle`'s corner variant and the
  sorrel corner of `Backdrop` take `top: $top-inset`; inside the shell the
  sorrel starts below the bar and the context row as well.
- Every page a full screen high sits in `.page-frame`, which takes
  `min-height: calc(100dvh - #{$top-inset})` ("The page frame", below), less
  `$shell-bar-height` inside the shell: `/`, `/sign-in`, `/account`,
  `/account/email`, the not-authorized page and the invitation page. A page
  that needs the full height takes the frame rather than restating the rule.

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
- **`.btn--quiet`**, an action that changes nothing: Cancel, Keep Editing, Back.
  The label in the body ink, so it neither competes with the primary nor reads as
  destructive — and, unlike the muted ink, not as disabled either. It sits in a
  field's ground (`$surface-card`, what an input fills with) inside a
  `$hairline` edge rather than an ink outline, so it stands back beside the
  primary; pointed at or focused, the ground takes `$fill-highlight-field` and
  the edge `$edge-highlight`, in place of filling with ink (M8.17, the owner's
  call of 2026-10-20). The label on the lit ground holds 4.5:1 in both themes
  (`tests/scss/tokens.test.ts`).
- **`.btn--destructive`**, what destroys something: Delete, Remove, Discard Changes. The wax,
  `$secondary`, which every error wears too. It was `.btn--secondary`, named
  for the token rather than the job, until M5.6, the owner's call.

**Two size modifiers, `.btn--small` and `.btn--medium`**, which compose with any variant; a class list names the variant before the size (`btn btn--quiet btn--small`), so one search finds every use. `.btn--small` has half
the padding (`space(1) space(3)`), no `$control-height` minimum, a 1px edge
in place of `.btn`'s 1.6px, which reads heavy at this size, the `caption`
type size, and a `space(2)` gap. It is for a compact strip that the full button would make taller, such
as a banner or a table row. The impersonation banner's Stop is the first
(MB.53). `.btn--medium` sits between it and the full button: the same label size and edge as `.btn`, no `$control-height` minimum, and `space(1) space(4)` of padding. The shell's Add Ingredient wears it with `.btn--solid` (M8.16).

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

#### Disabled is dashed and faded

From `disabled` or `aria-disabled`: the
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
the quarter-rem drop, which only lined it up beside the heading (MB.115).
Where it then sits, and how the Add becomes a plus, is
[`components/page-header.md`](components/page-header.md#styling). The markup is the `PageHeader` component's
([`components/page-header.md`](components/page-header.md)). A tabbed admin
page draws its heading in a `PageHeader` too, the open tab's action beside
it, so the same rule holds there
([`components/tabbed-page.md`](components/tabbed-page.md)).

**The admin tables are banded at desktop width, and stack into cards on a
phone.** Wide, every even body row sits on `$surface-card`, the surface a
modal wears, so a wide row stays readable across. Each cell is inset
`$table-cell-inset`, `space(3)`, on both sides so no text meets a band's edge,
and the filter row above the table runs edge to edge with it, the owner's
call at MB.115's review; and aligned on the
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

| Class                                                    | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.form`, `.form__actions`                                | The column of fields, a `space(5)` apart, and the row of buttons after it, `space(2)` further off and as far again from what follows: 2rem either side in a modal (M5.5). A `.modal__actions` row in a `.form` takes the same                                                                                                                                                                                                                                        |
| `.field`                                                 | One field: label, optional hint, control and error, `space(2)` apart                                                                                                                                                                                                                                                                                                                                                                                                 |
| `.field__label`, `.field__hint`, `.field__error`         | The parts around the control                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `.input`, `.textarea`, `.select`                         | The control, one box for all three                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `.checkbox`                                              | A `<label>` wrapping its box, so the whole line is the target                                                                                                                                                                                                                                                                                                                                                                                                        |
| `.switch`, `.switch__control`                            | An on-or-off choice as a slide toggle, a `.field` block: its label above, the toggle beneath at `$control-height`. `SwitchField` draws it ([`components/field.md`](components/field.md))                                                                                                                                                                                                                                                                             |
| `.search-field`, `__input`, `__submit`                   | A list filter's search box, an `.input` box on a flex row holding a borderless text input and, at its end, a magnifier submit named Search, muted until pointed at or focused, then the accent. The box draws the input's focus ring. `SearchField` draws it ([`components/field.md`](components/field.md))                                                                                                                                                          |
| `.fieldset`, `.fieldset__legend`                         | Rows under one name: checkboxes, or a list of entries                                                                                                                                                                                                                                                                                                                                                                                                                |
| `.notice`, `--error`, `--warn`, `--caution`, `--success` | A sentence about the whole view rather than one field. No box: a 3px bar down the start edge and a tint of the bar's colour behind the text (`--notice-tint`, 7% light, 8% dark). `--error`, `--warn` and `--caution` lead with a warning triangle, drawn by mask in the padding so a link in the text stays inline. Each kind sets `--notice-bar` and `--notice-icon`; [`components/notice.md`](components/notice.md) has the table (the owner's look, 2026-10-19). |
| `.back-bar`                                              | The row a detail page opens with: the back link at the left, anything the page adds at the right, on one centre line. The ingredient entry page and the spell recipe page both draw it                                                                                                                                                                                                                                                                               |

- **A field's hint is an info tip beside its label** (`InfoTip`,
  [`components/info-tip.md`](components/info-tip.md)), not a line beneath it:
  the owner's call in M5.9, once a form of many fields read as a wall of
  hints. The tip's text stays in the field's `aria-describedby`, so it is read
  with the field whether the tip is open or not. The tip opens on hover, a
  tap or the ⓘ's own focus, and never on the field's focus
  ([`components/info-tip.md`](components/info-tip.md#behaviour)). `.field__hint` remains for a line that
  must stay in view, such as why a field is disabled, since a shut field that
  does not say why reads as broken. `IngredientForm` was the first form built
  this way, and the Reason fields of the user list's confirmations and the
  admin invite form took it at MB.115's review; any other form adopts it at
  its own design review. Not every field gets one: a tip earns its place
  only by stating a rule, a flow or a format with a trap
  ([`components/info-tip.md`](components/info-tip.md), "When a field gets a
  tip").
- **A radio group takes the form's gap, not a margin of its own.**
  `.fieldset.radio-group` (`RadioGroupField`) has a `space(5)` block margin
  that sets it apart from the text around it where nothing else spaces it, as
  in a confirm's modal (a member's Change Role, the only owner's Leave Coven).
  Inside a `.form`, whose `space(5)` gap already spaces every field,
  `.form > .fieldset.radio-group` clears it, so the margin would not add to the
  gap.
- **Every text, textarea, select and type-ahead field shows a placeholder**,
  a short action, and what the field is for goes in its hint's info tip
  ([`components/field.md`](components/field.md#contracts) holds the rule).
  The placeholder reads in `$text-placeholder`, held at 4.5:1 on the field's
  ground in both themes by `tests/scss/tokens.test.ts`.
- **A field is optional unless it carries the required mark**, the asterisk
  `.field__required`, so no label says "(Optional)"
  ([`components/field.md`](components/field.md#contracts)).
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
ask before throwing the changes away; a save or a delete never asks. One
guard draws the question for every form
([`components/modal.md`](components/modal.md#unsaved-changes)).

**A form asks over itself** (MB.115, the owner's call). Every question a
form asks before it acts, the unsaved changes' and each Delete's, is one
card, `ConfirmOverlay`: the modal's raised surface at the floating
elevation, `$narrow-column` wide, over a scrim of the page's ground at 75%,
fading in over `$motion-short`. How it is placed, held and focused is
[`components/modal.md`](components/modal.md#asking-over-the-form).

**A narrow form stacks its buttons.** A `.form` is a size container, and under 28rem of its own width its `.form__actions` or `.modal__actions` row turns to a column: each button full width, in order, any `margin-inline` pushing a Delete aside reset. Above that, every form's row fits one line. It keys off the form's width rather than the screen's, so a form in a narrow modal stacks too (the owner's call).

The pieces around a field and a form's buttons that more than one form
shares (MB.115), each written once in `_primitives.scss` where every admin
form had kept its own copy. The `Field` component draws the first two around
a control ([`components/field.md`](components/field.md)), and `FilterForm`
draws `.filter-row` ([`components/filter-form.md`](components/filter-form.md)):

| Class               | What it is                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.field__label-row` | A label and what stands beside it on its line, an `InfoTip`'s ⓘ or the required mark, a `space(1)` apart. It is the position a tip opens from, so the tip lines up with its field                                                                                                                                                           |
| `.field__required`  | The asterisk hard against a label whose field a save asks for, in the error red. The markup hides it from a screen reader, which hears the control's `aria-required` instead of "star"                                                                                                                                                      |
| `.form__aside`      | The button set apart at the row's far end, an edit's Delete, so it is not pressed for Save. A `margin-inline-start: auto`, which the narrow form's stacking takes back                                                                                                                                                                      |
| `.filter-row`       | A list's filter form, a toolbar that applies as it changes: the search, its choices and switches, and Clear while a filter is shown, wrapping, and stacked on a phone. Every width, the busy fade and the type-ahead's width rule are [`components/filter-form.md`](components/filter-form.md#styling)                                      |
| `.list-frame`       | A list page's root, a `ListFrame` ([`components/list-frame.md`](components/list-frame.md)): its filter, notice or empty state, table and pager, a `space(5)` apart, a paragraph in it with no margin of its own. Its `.list-frame__body`, the list under the filter, is spaced the same, and fades in when a new page replaces the skeleton |

## The page frame

`.page-frame` is the centred, full-height column of a page: Welcome, sign-in,
the invitation (outside the shell), and the account pages, the not-authorized
page, the coven landing and the create-coven page (inside it). The sign-in
page and the invitation each sit on a `.panel` inside the frame (the
invitation's by MB.119's review, so a reader who follows a link from an email
sees the card the sign-in page draws). Its children stand `space(6)` apart and stop at `$measure`;
`.page-frame--narrow` stops them at `$narrow-column` (28rem), the forms'
column. It is `min-height: calc(100dvh - $top-inset)` with `space(6)` above
and below and `space(4)` at the sides, `border-box`, so a page a screen high
does not scroll by its own padding or the banner above it. Inside the shell
(`.app-shell .page-frame`) the bar takes room above it too, so the minimum
height also subtracts `$shell-bar-height`, and a `.page-frame__section`'s
`scroll-margin-top` adds it, so a jump lands below the sticky bar.

- **The gap alone spaces the column.** `.page-frame > *` clears every
  child's block margins, which outranks bare `section`'s from
  `layout-base` and `.page-header`'s own, so neither stacks on the gap.
- **The width and its cap sit inside `:where()`**, so they carry no
  specificity. In the app the class layer compiles as `body .x` (0,1,1) and
  would beat a component's single class; in the workshop it compiles as
  `:where(.workshop-story-frame) .x` (0,1,0), where source order decides. Under
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
- **`.page-with-nav`** is a page with a jump menu (`PageNav`,
  [`components/page-nav.md`](components/page-nav.md)): the account page's, and
  the coven index's. Its children are the head, the menu, then the sections.
  From a tablet up it is a grid, the menu a sticky column of three rows to the
  left of the sections, which stop at `$narrow-column`, and from 58rem an
  empty column the menu's width to their right, which centres the sections in
  the window; at a phone's width it
  is the `space(6)` column the frame is, the menu above the sections. It
  stands on its own, so it also serves a page that is not a `.page-frame`,
  such as the coven index inside `.coven-layout`, and clears the children's
  block margins as the frame does. Both pages use the one class, so the two
  cannot drift (MB.119).
- **`.notice.page-frame__notice`** is a notice standing between a section's head
  and its body, such as the `/coven` landing's word of waiting invitations
  (M10.32): `space(3)` above and below it, on top of the section's gap, so it
  reads apart from both (the owner's call). It names both classes to outrank
  `.notice`'s zero margin, which comes later in the file.

## The page column

`.page-column` is the frame every `/admin` page sits in (MB.115), and the
(public) layout's compendium pages too (MB.83): the page's
children a `space(5)` apart. The admin nav is no longer inside it but in the
shell's context row above it (MB.7). It is a column as wide as
`$wide-column` (80rem), centred, with `space(6)` above and below and
`space(4)` at the sides, `border-box`. It is wider than `.page-frame`
because its pages hold tables, and it is neither full height nor centred
down the window, since a list page runs as long as its rows. The width is
the owner's call at MB.115's review: the user list's seven columns need
about 77rem before they stop scrolling inside their frame, the privilege
ledger has seven too, and at the old 64rem the user list's sticky Impersonate
column sat over Signed Up on a 1280px window. Only `.page-column` and
`.coven-layout` read the token, so nothing outside `/admin`, `/coven/` and the
public compendium widens with it. Its paragraphs
still stop at the measure. The width and its cap sit inside `:where()`, as
the page frame's do, so a single class can change them. It is a primitive
rather than AdminNav's own rule because the admin, public and coven layouts and the admin
components' stories use the class as their frame. Inside it a page header's
action, and a tab's, goes beneath the heading at phone width at its natural
width, at the line's start, except the Add, which is a plus beside the
heading ("Buttons", above). MB.115's review had the action span the line;
the owner reversed that at MB.7's review, 2026-10-12.

`.coven-layout` is the same frame around every `/coven/[slug]` page, its
page's children inside it; the section nav (`CovenNav`) is in the context row
above (M9.15, MB.7). MB.119's design review signed it off as it stands: the
coven asked for no frame of its own, so the two share the rule. The wide
column suits its pages, which hold the member and invitation tables now and
the ingredient and grimoire tables later. What a page does inside the frame
is the page's: the coven index sits in the narrow column with a jump menu at
its side (`.page-with-nav`, "The page frame", above), and its sections are
plain `.page-frame__section`s rather than panels, the shape the admin
index uses. The index's table of contents is the `.admin-contents` list the
admin index draws, in `_primitives.scss` for both. The admin area's
page-header rules stay scoped to `.page-column`.

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
  roles the elements have already, so nothing else changes, and a happy-dom test's
  `getByRole('cell')` finds a `td` either way. Every admin list's table is
  [`StackTable`](components/data-table.md), which spreads them from one
  helper, `src/lib/table-roles.ts`: `tableRole('row')` for a part, and
  `stackCell(label)` for a cell, which carries its `data-label` too.
- **The label is written twice.** `content: attr(data-label)` and then
  `content: attr(data-label) / ''`: the second gives the label an empty
  alternative text, so a screen reader, which has the header, does not hear
  the column name twice. A browser that drops the slash form (Firefox before 128) keeps the first declaration, so there the name is read twice, which is
  acceptable: it is an enhancement past the floor ("Binding rules").
- **A sticky cell is reset in its component.** A cell made
  `position: sticky`, as UserList's Impersonate column is, only works while
  the frame scrolls, and in a card it would sit over its neighbours, so the
  component sets it back to `static` under the same container query. The
  primitive leaves `position` alone, since a cell may be `relative` to anchor
  a tip.

## Provider marks

**`.provider-mark` is a provider's mark on a 1.5rem circle of its brand's
ground**, as its sign-in button gives it one: the marks are drawn for those
grounds. `--google`, `--discord`, `--facebook` and `--microsoft` take
their `fill` from `brand-color()`, and a white one its brand's `edge`, which
holds 3:1 against both pages ("Brand colours", above). The circle is
`border-box`, so an edged one is the same size as the rest. The markup is the
`ProviderMark` component's ([`components/provider-mark.md`](components/provider-mark.md)).

## The application shell and the layers

Every signed-in page sits in the shell (MB.7; [`components/app-shell.md`](components/app-shell.md)):
a sticky bar `$shell-bar-height` (3.25rem) tall, then a context row
(`$context-row-height`, 3.5rem; `$context-row-height-phone` on a phone) that
names the area and carries its section nav, then the page. At or under
`$shell-phone-width` (40rem) the section nav is a bar fixed along the bottom,
`$bottom-bar-height` tall plus the safe-area inset, and `.app-shell__main`
pads its bottom by that calc when it holds a `.section-nav`. The bar, the
row and the page column share `$wide-column`.

**Every z-index that meets another at the window comes from `layer()`**
(`_variables.scss`): `shell` 10 (the bars), `banner` 11 (the impersonation
banner), `toggle` 12 (the corner theme toggle), `floating` 20 (a list or
panel opened from the shell: the account panel, the coven switcher's list, the
skip link) and `dialog` 30. A component inside its own stacking context keeps
a small local index. No other number is added.

## Designing a section

What each section review (MB.115 to MB.124) designs to:

- **Build from this layer, and grow it rather than going round it.** A page
  takes its colours from the tokens, its lengths from `space()`, its radii from
  `radius()` and its type sizes from `type-size()` and `heading-size()`. A shape two sections
  need is a primitive in `_primitives.scss`, drawn on the `Foundations` page,
  not two component rules.
- **Each review checks the CSS it adds against `npm run lint:css`**, and looks
  at the section in Safari and Firefox, in the audit profiles when a layout
  changed. A feature past the floor needs one of the three shapes in
  [`.claude/rules/components.md`](../.claude/rules/components.md).
- **One solid button per view**, on its primary action. Everything else is an
  outline, quiet, or the wax for what destroys something.
- **A centred page sits in `.page-frame`**, or
  `.page-frame--narrow` when its content is a form ("The page frame",
  above). Each titled section of it is a `.page-frame__section` named by its `h2` through
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
  and a modal opened by its page's address, or at once by a press, is a `RouteModal`
  ([`components/modal.md`](components/modal.md)). A button that opens a
  dialog from its own page is a `ModalButton`, which takes the focus back to
  it however the dialog closes, since `Modal` restores nothing itself. A
  refusal from a click outside a form is said by `useClickFeedback`
  ([`components/click-feedback.md`](components/click-feedback.md)), in a
  callout floating under the button pressed, out of the flow so that a
  narrow cell or a phone's card does not wrap it. A page's own menu of jump links is a `PageNav`
  ([`components/page-nav.md`](components/page-nav.md)), laid out by
  `.page-with-nav`. Each is in `claude-docs/components/`.
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

## Smooth scrolling

The root sets `scroll-behavior: smooth` (`src/app/globals.scss`), so a jump to
a section glides. Next scrolls to the top on a route change too, and it turns
smooth scrolling off for that jump only if `<html>` carries
`data-scroll-behavior="smooth"` (`src/app/layout.tsx`). Without the attribute
the jump glides, then Next's scroll-into-view glides on and stops part-way
down: 62px at a desktop's width, 40px at a phone's, after a move from an
admin page to the Compendium. Keep the attribute for as long as the stylesheet
sets the behaviour. `tests/e2e/route-scroll.spec.ts` proves it, with reduced
motion switched off for that spec alone, because the suite's default turns
the smooth scrolling off and hides the bug.

## Theme resolution

`globals.scss` resolves **three** states, not two, and `.storybook/theme.scss`,
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
  colours and `brand-color()`, `$narrow-column`, `$pager-tight-width` (the
  width under which the pager closes up to stay on one line), the `$font-body` / `$font-heading` / `$font-mono` stacks, the
  `$measure`, the loading tokens (`$loading-delay` 100ms, `$spin-duration`
  0.8s, `$shimmer-duration` 1.4s, `$pulse-duration` 2s, `$arrive-duration`
  200ms; see [`loading.md`](loading.md)), and the four scales with their accessors — `type-size()`,
  `heading-size()`, `space()` and `radius()` — a component `@use`s directly.
  Sizes with a role of their own sit beside them: `$brand-size` (1.375rem, the
  site name in the bars, set in the heading face), `$inline-mark-size` (0.72em,
  an icon sized to the text beside it), `$text-stroke-hairline` (0.6px, the
  safety note heading's stroke), `$safety-bar-width` (the safety note's side
  bar, `$rule-heavy`), `$nav-link-size` (1.125rem, a grouped jump menu's
  top-level link), `$notice-mark-size` (1.0125rem, a notice's warning triangle) and `$notice-mark-drop` (0.05rem, which sets it on the first line), `$step-ink-drop` (0.05rem, which sets a spell step's first-line icons level with its name), the date field's calendar sizes and fades (`$day-picker-*`, [`components/date-field.md`](components/date-field.md)), the small optical corrections in `em` (`$optical-nudge`
  0.04em, `$back-chevron-pull` 0.5em, `$link-hint-drop` 0.125em, `$cap-middle`
  0.648em, `$recency-icon-size` 1.375em, each explained where it is declared), and the ingredient card drawer's `$drawer-inset` (10px),
  `$drawer-wall` (7px), `$drawer-back-stop` and `$drawer-seam-stop` (38% and
  48%), `$drawer-slot-shadow` and `$drawer-rim-shadow`. The last six are proposed
  for MB.120; the card and note stylesheets take them in their own lanes.
- `src/scss/_mixins.scss` — `modal-surface`, `chip`, `badge`, `tip-bubble`,
  `icon-button` and `icon-button-edit` (an icon control's square box, and
  the green every Edit pencil wears, [`components/icon-tip.md`](components/icon-tip.md)),
  `theme-dark` / `theme-light`, `semantic-tokens` (the per-theme
  badge custom properties), `focus-ring`,
  `theme-transition`, `nav-current` (a bar link's current-page mark: weight and a
  `$rule-heavy` accent border, which forced colours keeps), `reduced-motion`,
  `font-smoothing-antialiased`, `notice-row` (a notice laid out as a row of sentence and buttons, as the recovery and conflict notices are under a dialog's title),
  `heading-face` (the headings' family, weight and letter spacing).
  The shapes that repeated by hand are mixins too, one line each:
  `color-scheme-light` and `forced-colors` (the two media queries, as
  `reduced-motion` wraps its own); `list-reset` (a list with no margin,
  indent or marker, its items' too); `truncate` (one line cut with an
  ellipsis); `visually-hidden` (the clipped box a screen reader still
  reads, which the `.visually-hidden` class includes); `button-reset` (a
  button with its box taken away); `stack($step)` (a column a step of space
  apart); `busy-faded` (colour out and `$opacity-disabled` left);
  `tip-anchor` and `tip-above($layer, $capped)` (a fixed bubble, placed by
  `useTip` through Floating UI and kept on screen; capped to `$tip-width` and
  the window; a `$align` still pins the old way and is for EntryMarks and
  IngredientCard until they adopt the hook); `tip-bubble-open` (a bubble's open state alone, for one opened
  by something other than `.is-open`, such as a hover); `icon-button` (which takes a `$radius` and a `$cursor`, and
  turns `$text-primary` when pointed at or focused), `icon-button-edit`
  and `icon-button-remove` (the accent and the wax); `chevron-flip` (the
  account menu's turn-over on open, eased and still under reduced motion,
  which every chevron shares, M8.16) and `disclosure-chevron` (a section's
  chevron, sized and inked, with that flip); `floating-panel`
  (the card surface, floating shadow and muted edge a list or summary
  floats on); `field-box` (the edge, ground and height a field and the
  admin menu's summary share); `arrived` (the fade a list or tab's new
  content comes in with, the one `fade-in` keyframe (`fade-out` beside it),
  `$arrive-duration` by default); `loading-motion($animation, $delay)`
  (applies a loading animation and, under `reduced-motion`, swaps it for the
  `loading-pulse` keyframe at `$pulse-duration`: the one slow opacity pulse
  every wait falls back to; a `$delay` adds `loading-appear`, which holds
  `visibility: hidden` until then and so survives the pulse; both keyframes
  are in `_primitives.scss`); and
  `data-table-roomy` and `data-table-nowrap` (a table's taller, centred
  rows; its one-line cells, wrapping again as cards), each emitted once by
  `_primitives.scss` as the `.data-table--roomy` and `.data-table--nowrap`
  modifiers a table takes by class; `value-and-control` (a cell's value on
  the left and the control that changes it on the right); and
  `sticky-action-column($layer)` (a stacking table's pinned row-action
  column on a neutral `$hairline` rule: the Compendium's Edit, and its card placement) and
  `row-action-column($layer)` (the same column in red, over a `@content` block: Impersonate or Remove).
- **Three `*-base` mixins**, each emitting nothing on its own `@use` and
  `@include`d at exactly one site, `globals.scss`'s `body`:
  - `_typography.scss` → `typography-base` — headings, body copy capped at
    `$measure`, links, lists, the text roles `.eyebrow`, `.meta`,
    `.binomial` and `.lede`, and `.tight-headings`.
  - `_layout.scss` → `layout-base` — bare `section` / `header` structure, plus
    `.header` / `.footer`.
  - `_primitives.scss` → `primitives-base` — the class layer: `.panel`,
    `.btn` and its `--solid` / `--quiet` / `--destructive` variants and
    `--small` size, `.notice`, `.page-frame` and its parts, `.provider-mark`,
    the form fields (`.form`, `.field`, `.input`, `.select`, `.textarea`,
    `.checkbox`, `.switch`, `.fieldset`), `.modal` / `.modal__actions`, `.specimen*` (the `IngredientCard`'s look; Foundations renders the card itself),
    `.chip` and `.chip.is-selected` over `chip()`, the `.badge--*` classes over `badge()`, `.visually-hidden`, for text a
    screen reader reads and nothing draws, such as a live region's news, and `.spoken-separator`, a comma heard but not seen between two parts of one name, drawn at no size so Chrome adds no space around it in the name (MB.115).
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
falling back. `.storybook/typography.scss` works around it by redefining both in its
own `:root`. A real fix puts the fallback **inside** the `var()` —
`var(--font-body, 'Lexend')` — since the concrete families already trailing
each stack don't rescue it: an unresolved `var()` invalidates the whole
declaration at computed-value time, rest of the stack included.

## The top inset

`$top-inset` (`var(--top-inset, 0px)`) is how far chrome above everything else takes the top of the
window. It is `0px` except on a touch screen (`hover: none`) while an admin impersonates, where the
impersonation banner stays pinned and `ImpersonationBanner` sets `--top-inset` to its height.
Anything that pins to the top of the window, or sizes to its height, adds the inset:
`top: calc(#{$x} + #{$top-inset})`. The fallback is `0px`, not `0`, because it is used inside
`calc()` and a unitless zero there is invalid. With a pointer the banner tucks away and hovering
brings it back over the page, so it takes no room and the inset stays `0px`.
