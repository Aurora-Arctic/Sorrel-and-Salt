# Styling foundation — summary

The SCSS foundation every component builds on: the palette, type, spacing, radius and the shared primitives, shown in the workshop's `Foundations` page. Each section's own design is its review's, built on this layer ([`.claude/rules/components.md`](../.claude/rules/components.md), "The design will change"); "Designing a section" below is the direction they design to. Token names, class lists and values are in `src/scss/` and each component's `index.scss`; this doc holds the rules.

## Binding rules

- **Modern Sass modules only** — `@use '../../scss/variables' as *;`, never `@import`. Shared partials in `src/scss/` are `@use`'d directly by whichever component needs them, never routed through a parent (§9). Each component's `index.scss` is a plain global stylesheet, never a `.module.scss`: the primitives are addressed by class from JSX and inside component rules, and BEM names do the scoping ([`ui.md`, "Component styling is global Sass with BEM names, not CSS Modules"](design-decisions/ui.md#component-styling-is-global-sass-with-bem-names-not-css-modules)).
- **Reach tokens through functions, not bare variables** — `badge-token('safety', 'fill')`, `space(4)`, `$text-on-color`. A typo is then a compile error rather than a silently wrong colour.
- **WCAG AA 4.5:1 is the floor for every token, in both themes**, and several pairings sit close to it (the light `--accent` at 4.68 and `wellbeing` at 4.74 against the light page, `--secondary` at 4.80 against the dark card). Re-measure when changing a colour; do not assume headroom.
- **Only `_variables.scss` and the theme mixins may name a raw hue.** Needing a colour that is not a token means adding a token, not inlining one. Stylelint carries it (`npm run lint:css`, part of `lint`): `color-no-hex` and `color-named` refuse a hue anywhere but `_variables.scss`, so a theme mixin takes its hues from there too ([`commands.md`](commands.md), "The app"). A colour function whose first argument is a number, `rgb(0 0 0)` or `oklch(0.5 0.1 20)`, is refused the same way; `rgba($ink, 0.5)` on a token is not.
- **Type and layers come from the tokens too.** Outside `_variables.scss`, stylelint lets `font-family` be a `$font-*` token or `inherit`, `font` only `inherit`, and `font-size` a `$` token, `type-size()`, `heading-size()`, a `calc()` over those, an `em` value, `0` or `inherit`. `z-index` is `layer()`, a `$` variable holding one, or a single digit: the small local index a component keeps inside its own stacking context ("The application shell and the layers").
- **The seeded group colours live only in `src/db/seed/category-groups.ts`.** No Sass token restates them, and retuning one takes a data migration as well as the seed edit, because the seed never overwrites a row it finds.
- **Never wash a chip or badge ground with its own group colour and leave the label in that colour.** The eight group hues are tuned to sit just above 4.5:1, so a visible wash drops them under; solid holds, and so does a wash with the body ink stirred into the label ("Chips, badges and the solid-fill rule").
- **A badge palette declares `solid`, `tinted` or `ink` and emits only that treatment's parts.** `badge-token('safety', 'bg')` failing to compile is deliberate. A new palette picks its treatment first — solid needs 4.5:1 against the page surface plus 3:1 against both surfaces; tinted needs 4.5:1 foreground-on-background plus 3:1 on the border.
- **The group hues sit at odd multiples of 22.5° off `$sorrel`**, so none collides with accent (96°) or secondary (8°). A ninth group is a row a keeper adds at `/curator/category-groups`, outside the rotation, its two colours refused on write below 4.5:1 on their own grounds ("Category-group colours").
- **`badge()` takes no variant argument, deliberately.** The mixins set colour, edge and geometry only — never width, margin, layout or a modal backdrop. A component restating a mixin's colour is a bug.
- **`adjustFontFallback` stays `true`** in `src/app/fonts.ts`; setting it false reintroduces layout shift.
- **Lengths, radii and type sizes come from their scales**: `space()`, `radius()`, `type-size()` and `heading-size()`. A length off the scale is a chip's or a badge's inner geometry or a control's target size, and says so in a comment.
- **A length or duration with a role of its own is a token**, under "Motion and layout" in `_variables.scss` (the admin column, the dialog column, the icon and glyph sizes, the table stack width, the rules, the motion durations), so the components that share the role share the number. **A mix or a level used in more than one stylesheet is a token** too (`$fill-quiet`, `$fill-highlight`, `$fill-highlight-field`, `$hairline`, `$edge-highlight`, `$opacity-disabled`). Read the list there, and add to it rather than repeat a number.
- **Body copy keeps to the reading measure, `$measure` (66ch)**, the longest line that still reads comfortably. `ch` is the width of "0" in the element's own font, so the measure follows the text it caps. `typography-base` sets `max-width: $measure` on every `p`, so a layout can be as wide as a table or grid needs while its prose stays readable. A component never widens a paragraph past it; running text that is not a `p`, such as a long list item or a description, takes `max-width: $measure` itself; a narrower column, as the forms use, is a component's own choice. A centred page takes its column from `.page-frame`, which stops at the measure, or at the forms' narrower column with `--narrow` ("The page frame"). `tests/e2e/admin.spec.ts` asserts it.
- **Browser floor: Baseline Widely Available, and below it the app degrades, never breaks** (M10.24). A feature may be used freely once Chrome, Edge, Firefox and Safari have all shipped it for 30 months. `package.json`'s `browserslist` holds the one statement, `["baseline widely available"]`, and it rolls forward each month with the data the lockfile pins. It resolves to Chrome and Edge 123, Firefox 124, and Safari and iOS Safari 17.4. Turbopack's Lightning CSS reads the same entry and lowers newer syntax to it, as it does `light-dark()` ("Theme resolution"), and `npm run lint:css` refuses CSS past it (`stylelint-plugin-use-baseline`). No date is pinned, because a pinned date is a hand-kept version list. A feature past the floor is allowed only in the three shapes [`.claude/rules/components.md`](../.claude/rules/components.md) lists. `tests/guards/browser-floor.test.ts` holds JavaScript to it. Playwright runs Chromium only, so a look at the dev server in Safari and Firefox is part of every sign-off. The decision: [`ui.md`, "The browser floor"](design-decisions/ui.md#the-browser-floor).

## The palette

Two layers live in `_variables.scss`, and the split keeps the derived colours honest:

1. **The raw palette** — eight hand-picked hues (the soot and parchment grounds, their raised card grounds, the chalk and iron-gall body inks, the `$sorrel` accent hue at 96° and the `$wax` secondary hue at 8°), compile-time Sass values, plus everything `color.adjust()`ed or `color.mix()`ed from them. They are named for the material rather than the role, since a role can change and a hex cannot. The grounds are warm near-blacks rather than neutral ones: a green accent over a blue-grey ground reads cold. Body ink on its card measures 13.42:1 (dark) and 14.91:1 (light).
2. **The token aliases** — thin `var(--token)` wrappers components consume. Theming happens at runtime through these, not by recompiling, which lets one rule serve dark, light and system-preference.

`_variables.scss` emits no CSS. Every component `@use`s it, so anything that produced output there would land in every compiled stylesheet; the blocks that assign the custom properties live in `src/app/globals.scss`, imported once.

**Derivation runs one way only.** Every hover, muted and per-theme variant is a `color.adjust()` or `color.mix()` of the palette — none is re-picked by eye — and each clears 4.5:1 against both surfaces of the theme it is used in. Dark-theme variants move away from the ground by lightening (a darker accent on `$soot` loses contrast), so "hover is punchier" is lighter-and-more-saturated on dark and darker on light.

`$chalk-muted` and `$ink-muted` are the body ink at reduced strength rather than a separate grey, so metadata reads as the same ink and still clears 4.5:1. **Dark mixes the ink into the ground** (`color.mix($chalk, $soot, 80%)`, 8.79:1 on the card): lightening `$chalk` in HSL keeps the saturation while the lightness falls, which raises the chroma and reads gold beside the prosperity chip, whereas a mix lowers the chroma with the strength, as ink thinned on paper does. Light keeps `$iron-gall` lightened 20%.

Three variants exist for one use each:

- **`$sorrel-vivid`, the light theme's `--accent`**: `$sorrel` at +40% saturation and −5% lightness, 4.68:1 on the page and 5.20:1 on the card. `$sorrel` itself reads olive-black on parchment; saturating it alone lifts it under 4.5:1, so it darkens as it saturates. The light hovers derive from it, or hovering would look like the colour draining out. Dark keeps `$sorrel-bright`.
- **`$wax-vivid`, the light theme's `--secondary`**: `$wax` at +30% saturation and +4% lightness, 5.02:1 on the page. `$wax` itself reads brown on parchment, and an error edge in it barely separates from a field's own. Dark keeps `$wax-warm`. Destructive buttons share the token.
- **`$sorrel-spring` and `$sorrel-rich`, the solid button's hover (`--accent-solid-hover`)**: larger and more saturated steps than the link's `--accent-hover`, which a filled button barely shows under the pointer. The label on them measures 13.13:1 (dark) and 6.80:1 (light).

**The warning ochre is the one hue picked for a role**: a warning that should not read as an error. `$ochre-deep` on light and `$ochre-bright` on dark are the `--warning` token and its `$warning` alias. It draws a warning notice's bar, tint and triangle, which need 3:1 as a graphic (WCAG 1.4.11), and one line of text, a shortfall in Record a Working's preview, which needs 4.5:1. It clears both: 4.89 on the light page, 5.44 on the light card, 8.32 and 7.55 on the dark ones, and over its own tint 4.47 and 4.95 light, 7.35 and 6.57 dark. `tests/scss/tokens.test.ts` holds 4.5:1 as text on the page and the card and 3:1 as a mark on its tint.

Shadow inks are per-theme: a 0.8-alpha near-black under a card reads as a hole punched in parchment, so light mode gets a much softer one.

## Category-group colours

§6's eight groups let the chip selector collapse 101 categories into sections rather than a flat wall. Each group needs a colour distinguishable from the other seven at chip size.

The eight hues are one rotation of `$sorrel` in 22.5° steps, taking **only the odd multiples** (steps 1 to 15: jade at 118.5°, teal, steel blue, indigo, violet, rose, hearth amber, gold at 73.5°). The half-step offset guarantees no group lands on the accent hue (96°) or the secondary hue (8°), both claimed by the UI chrome: a category chip wearing the accent colour would read as selected when it is not. The group names and their order are in `src/db/seed/category-groups.ts`.

**The rotation is the rule; saturation and lightness are hand-tuned.** Each seeded pair is two hexes in `src/db/seed/category-groups.ts`, their only source. Both hexes of every pair sit within 2° of their step (every hue is within 1.04°), which review holds and [`db/category-seed.md`](db/category-seed.md) states; within a group the two hexes keep one hue to within 0.51°. `tests/db/seed/categories.test.ts` holds each to 4.5:1 on its own theme's page, `$soot` or `$parchment`. Every dark hex also clears the dark card, the harder dark surface, at 4.64:1 or better; the closest light hex is Mind & Spirit's, at 4.52:1 on the page. Across groups they do not share a saturation (dark 30–50%, light 37–75%), because equal HSL lightness and saturation are not equal perceived colour, so each pair was tuned against the contrast floor rather than by formula. Light runs the more saturated of the two: to clear 4.5:1 on parchment a colour has to stay dark, and a dark colour at moderate saturation reads as mud.

A chip reads its group's colours from its `category_groups` row, a pair of hexes; no Sass map holds them. A ninth group is a row a keeper adds with two pickers, each previewing its chip and ratio on its own ground and each refused on write below 4.5:1 against the harder of its own theme's two surfaces; it is legible in both themes but does not join the rotation (§6).

## Badge palettes

Ten palettes, deliberately not equals. Every hue not already reserved belongs to one of the eight category groups, so a palette reuses the safety, accent or muted inks rather than spend a new hue.

- **Safety** is a warning — an ingredient flagged toxic or unsafe to burn (story 53) — and wears the sealing-wax hue, the loudest thing in the palette. It is the one alarming badge in the app.
- **Low stock** is an inventory state, not an alarm (story 54): the muted ink, unsaturated.
- **Out of Stock** is a jar at nothing: `$wax` with its saturation pulled down (`$wax-muted-dark`, `$wax-muted-light`), plainly a red but quieter than safety's solid fill. It is the `ink` treatment, the red alone with no box, so it never reads as a second alarm. As text it measures 6.40:1 on the dark card, 7.04:1 on the dark page, 7.45:1 on the light card and 6.70:1 on the light page. The badge is its drawing alone, a slashed ring that Low's double chevron does not share, with the words in its name and tip, so its meaning never rests on colour. The stock badge has no box and takes the jars' inks (Low `$warning`, Out this palette's `fg`; [`components/stock-badge.md`](components/stock-badge.md)).
- **Caution** marks an ingredient or form that carries safety notes: the safety red as a tint with a red edge (`$wax-caution-dark`, `$wax-caution-light`: the wax at +15% saturation, lifted 30% for dark and darkened 4% for light), so Toxic stays the one solid badge. Label on tint 4.94:1 dark and 6.49:1 light; edge 3.68:1 and 4.47:1 on the dark and light cards (3.89:1 and 4.18:1 on the pages). Beside Out of Stock it differs only in saturation, so the word, not the colour, tells them apart.
- **Last used** marks the sign-in button this browser last signed in with. A pointer, not a warning, so it is solid in the accent's own inks (`$sorrel-bright` dark, `$sorrel-vivid` light). Label on the fill 7.95:1 dark and 4.68:1 light.
- **Attention** marks something waiting on the reader: the account menu's count of pending coven invitations and the dot on the avatar. Solid, wearing safety's fill exactly through the same two tokens (`$wax-badge-dark`, `$wax-badge-light`), so they cannot drift. It is a separate palette so that a count is not named after a hazard in the code.
- **Local** marks a coven's own entry, as against the compendium's, on the ingredient page. It says where the row lives, not that anything is wrong, so it is tinted in the accent's inks, never solid, so it never reads as last-used's pointer. Dark takes `$sorrel-bright`; light takes `$sorrel-deep`, because `$sorrel-vivid` on its own tint measured 4.42:1. Label on tint 5.60:1 dark and 6.98:1 light; edge 4.23:1 and 4.66:1 on the dark card and page, 4.46:1 and 4.01:1 on the light ones.
- **Demo** marks the demo coven in its page heading (`badge--demo`): Local's inks through the same two tokens, tinted, as its own palette.
- **Annotated** marks a compendium entry with the coven's own changes: Local's inks exactly, through the shared `$local-badge-dark` and `$local-badge-light` tokens, tinted. It is its own palette, never `badge--local`.
- **Public** marks a help item every reader may read, in the keepers' help lists (`badge--public`): Local's inks exactly, through the shared `$local-badge-dark` and `$local-badge-light` tokens, tinted, so it is the green beside Staff and Keeper's muted badges. It is its own palette, never `badge--local`.
- **Retired** marks a compendium entry the curators have retired, on the ingredient page of a coven whose cupboard still names it. A fact about the entry, not a hazard, so it takes low stock's treatment and inks exactly (tinted, `$chalk-muted` dark, `$ink-muted` light), which needs no new contrast check. It is its own palette so the entry page does not name a retired entry after stock.
- **Needs Review** marks a compendium entry no curator has reviewed. A caution to the reader, not an alarm, so it is the warning ochre as a tint (`$ochre-bright` dark, `$ochre-deep` darkened 4% light), leaving red to Safety, Caution and Attention. The light ink is darkened because `$ochre-deep` alone put the edge at 2.98:1 on the light page. Label on tint 5.85:1 dark and 5.69:1 light; edge 4.37:1 and 3.86:1 on the dark and light cards (4.81:1 and 3.47:1 on the pages).
- **Muted** marks a plain fact beside a name that is no warning: a one-off ingredient in a spell's steps, and a picker row whose form is already in the jar. Same treatment and inks as Retired and Low, its own palette so neither use borrows a name about the compendium.

Each palette is one ink per theme plus the **treatment** it is drawn in, and the treatment decides which parts it emits:

- **`solid`** — the ink fills the badge and the label inverts onto it (`$text-on-color`). One part, `fill`. A solid fill is its own boundary, so it needs no edge; `badge()` still draws a transparent 1px border, as geometry, so a solid badge matches the height of a tinted one beside it.
- **`tinted`** — the ink mixed back into the card surface, so the badge tints the surface it sits on instead of carrying a hardcoded panel colour. Three parts, `fg`, `bg` and `border`.
- **`ink`** — the ink alone, for a mark that draws no box (Out of Stock). One part, `fg`, read as text. It emits no `.badge--<palette>` class, since `badge()` has no box to draw for it.

**A palette emits only its treatment's parts**, which is not tidiness. Solid wants an ink saturated and close to mid-lightness; tinted wants one far enough from the surface to still read at 12–14% strength. **Safety's ink satisfies the first and fails the second — as a tint its `fg` on `bg` measures 3.85 and its edge 2.78** — so those parts do not exist for it, and asking for one is a compile error rather than a token that quietly fails WCAG.

Safety's ink is `$wax` at **+22% saturation in both themes**, and **+18% lightness on dark**. The dark ink is lifted far less than a text colour on soot would need, because the badge is a solid fill and the contrast that matters is its label's, not its own against the card. **Only saturation moves** to tune it, because the label (`$soot`, near-black) has little headroom on the fill and darkening it would break 4.5:1.

Mix weights are per theme rather than per palette: a tint over near-black needs slightly more ink to register than the same tint over parchment. Fill weights are 14% dark and 12% light; edge weights are 70% dark and 75% light, the smallest that clear 3:1 against both surfaces (WCAG 1.4.11).

### `$text-on-color`

The label colour for anything drawn as a solid fill — the selected chip, the safety, attention and last-used badges. It is an alias for the page surface, because the answer is the same whatever the fill: on dark the fill is the light thing and the label goes dark, on light the reverse. It needs no contrast table of its own: a solid fill's label sits on the fill, and the fill's ratio against the page surface is the `vs page` figure already measured for every group and every ink. **Worst pairing in the set is 4.68:1**, the light accent.

### Selected text

`::selection` in `globals.scss` swaps the page's two colours: the background is `$text-primary` and the text is `$text-on-color`. The highlight is nearly black in the light theme and nearly white in the dark one, never the accent green. The pair is 14.77:1 in dark and 13.41:1 in light. `tests/e2e/smoke.spec.ts` asserts the swap in both themes.

### `$ornament-screen` and `$ornament-multiply`

How `Backdrop`'s grey corner ornaments meet the page: the opacity of its `screen` layer (0.3 on dark, 0 on light) and of its `multiply` layer (0 on dark, 0.4 on light). The image carries the photograph's levelled luminance, so a blend mode keeps its tones the right way round on both themes, where any single tint moved the whole subject one way. Two opacities rather than one blend-mode token, because a blend mode cannot animate and an opacity can: the theme swap cross-fades the layers with the rest of the page. Decorative, so no contrast table, and `prefers-contrast: more` removes the ornaments entirely ([`components/backdrop.md`](components/backdrop.md)).

### The faceted jar's bands

`$jar-shade` and `$jar-shine` (`--jar-shade`, `--jar-shine`) are the two bands of a faceted jar in `JarShelf`, which is their only user. Each is a solid colour with one value per theme, taken from the card (`--surface-card`), and the two swap roles between themes.

| Token         | Light                                                                          | Dark                                                                   |
| ------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `--jar-shade` | iron-gall stirred into the raised parchment at 8%, a step darker than the card | chalk stirred into the raised soot at 8%, a step lighter than the card |
| `--jar-shine` | the lifted parchment, a step lighter than the card                             | the soot page colour, a step darker than the card                      |

Decorative, so held to no contrast ratio. A row in `tests/scss/tokens.test.ts` asserts that both are set in each theme and sit on the sides of the card given above. ([`components/jar-shelf.md`](components/jar-shelf.md), "Contracts")

## Category chips

`chip()` draws a pill in one of two emphasis levels. Neither draws a dot: the group colour sits on the full level's wash, border and label.

- **`full`**: the category chip, everywhere a category shows (the card, the entry page, pickers, filters, admin tables, the Combobox's chosen entries). A wash of the group colour (5% over `$surface-card`; the ratios below were measured at 14%, and a lighter wash only raises them), a border at 35%, and the label in the group colour with 30% of `$text-primary` stirred in (`chip-wash()`, which the Combobox entry reuses as it keeps its own shape).
- **`quiet`**: neutral ink and a `$hairline` border, no group colour. A control rather than a category: the +N button, its one user. The colour field's preview shows `full` only.

`chip()` takes `$size: regular | compact`. **Compact** is for a table cell (the admin Compendium's Categories column): no block padding and 7px inline, and the card's `overline` text size. The wash, the 1px border and the label's colour mix are unchanged, so the contrast figures below hold. A compact chip measures about 18.8px tall in Chromium. The shared chip row takes it as `compact` (`category-chips--compact`: `claude-docs/components/category-chips.md`); a compact +N button keeps a 24px hit area through a transparent pseudo-element (WCAG 2.5.8) without growing its pill.

**Why the ink is stirred in.** A wash of a group's own colour cannot hold 4.5:1 for the colour as text: pure colour on its wash falls under 4.5:1 for some groups (Mind & Spirit light 3.56). Mixing 30% of the body ink into the label lifts every seeded group to 5.37:1 or better on both surfaces of both themes. The lowest ratio in each:

| Theme | Surface | Lowest | Group            |
| ----- | ------- | ------ | ---------------- |
| Dark  | card    | 5.51:1 | Practice & Place |
| Dark  | page    | 6.16:1 | Practice & Place |
| Light | card    | 5.92:1 | Mind & Spirit    |
| Light | page    | 5.37:1 | Mind & Spirit    |

`light-dark()` picks the pair off `color-scheme`. A group a keeper adds is held to 4.5:1 for its colour alone, a looser test than the eight seeded ones passed; the stirred label is checked against the seeded eight only, so a very pale or very dark admin colour is worth a look in the colour field's preview.

## Dotted lists

`dotted-row($item, $gap, $dot)` (`_mixins.scss`) lays a wrapping row of items with a dot between each pair: the card's forms line and the admin Compendium's Form cell. The dot is a circle drawn on every item after the first, in the margin to its left, and the row is clipped by that margin (`clip-path`, with a matching negative margin so nothing shifts), so a dot that would lead a wrapped line is never seen and none ends one. CSS cannot tell which item starts a line, so a rule on the item cannot do this. Each item holds a `.spoken-separator` comma, so a screen reader hears a list. `$item` is the class of the row's direct children.

## Chips, badges and the solid-fill rule

**Solid is not decoration for a badge.** The obvious loud treatment, the group colour as a low-opacity wash behind a label wearing the same colour, cannot hold 4.5:1: the eight hues are tuned to land just above the floor. A solid fill sidesteps it; the chip's answer is to move the label towards the body ink ("Category chips").

**The colour comes from the row, on the element.** `chip($dark, $light, $state)` takes the pair rather than a slug, and by default reads it from the element's `--chip-dark` and `--chip-light`, which `chipColors(group)` in `src/lib/chip-colors.ts` sets inline from the group's `color`. `light-dark()` picks one off the `color-scheme` the theme mixins already set, so a theme toggle re-colours a chip without a render, and a group created at runtime needs no class of its own. `chip()` refuses a slug at compile time. A rule that needs the group's colour outside a chip (a combobox row's bar, a group's mark) takes `group-colour()` (`_mixins.scss`), the same `light-dark()` pick.

`light-dark()` is newer than the browser floor (it needs Safari 17.5, the floor is 17.4), so Turbopack's Lightning CSS lowers it: every `color-scheme` declaration also sets a pair of `--lightningcss-*` switches, and the chip reads those. Nothing in this project writes either.

**The contrast holds for any colour the write check admits.** An unselected chip's label is the colour itself on whatever surface holds the chip, a page or a card, and a selected chip's label is `$text-on-color` on a fill of that colour. So `CategoryGroupInput` refuses a colour under 4.5:1 against the harder of its own theme's two surfaces: `colorDark` against the dark card, which is lighter than the dark page, and `colorLight` against the light page, which is darker than the light card. Clearing that surface clears the other, and the selected label with it. Checked against the dark page instead, a dark colour could clear the floor and still read under it on a card: the seeded eight measure 5.1–5.3:1 on the dark page and 4.6–4.8:1 on the dark card. The arithmetic is `src/lib/contrast.ts`: WCAG 2.1's ratio, and the two grounds as hexes (`#1f1c16`, `#efe9da`), written out because nothing at runtime can import a Sass value, so `tests/lib/contrast.test.ts` pins them to `$soot-raised` and `$parchment`. A change to either token fails that test until the check follows it.

Badges are square-cornered, which keeps a badge from reading as a chip now that chips are pills. Both shapes set their label to weight 500, a step over Lexend's 300 body weight, so a small label holds its colour at chip size.

### Badge sizes

A badge has three sizes, set in `$badge-sizes` in `_variables.scss` and applied by `badge-size($name)` in `_mixins.scss` (a mistyped name is a compile error). `badge()` itself draws the `default` size (caption, 13px), so a badge outside the ingredient card is unchanged. `medium` (the regular card) and `small` (the compact card, the spell builder's step rows) are the card's alone, applied to the `.badge`s inside it, both in the overline size (12px) with a 24px least height, the least a badge with a tip may be as a target. The components that draw badges (`EntryMarks`, `CautionMark`, `ToxicMark`, `StockBadge`) take no size prop: the card decides, from its own selector, so one badge reads the same wherever it is rendered.

Each size also lowers its label by an **optical drop**, taken from the top padding and given to the bottom so the height holds, so capitals centre on the box (measured in Chromium, the space under the baseline was 1.26px more than above the capitals on the card). Chrome rounds a font's ascent and descent to whole pixels, so 12px and 13px Lexend sit differently and each size has its own drop: `default` 0.0125em, `medium` and `small` 0.05em. The card's badges centre within 0.04px; a `default` badge lands within half a pixel either way, since its baseline snaps to the pixel grid wherever it sits. `text-box-trim` would do this from the font's own metrics, but it is past the browser floor. `badge-padding()` and `badge-padding-block()` in `_mixins.scss` apply it; a rule that sets a badge's block padding itself, as Out of Stock's heavier border does, goes through them.

## Brand colours

A sign-in provider's button wears the provider's colours, not ours: `$brand-palettes` in `_variables.scss` holds each brand's `fill` (the ground), `ink` (the label), `hover` (the ground under the pointer) and the `edge` a white button needs on our page, read through `brand-color($brand, $part)`. A mistyped brand or part is a compile error, worded as `badge-token()`'s. It is a compile-time map rather than custom properties because the hues do not follow the theme and nothing reads them at runtime; a part that does differ by theme is written `(dark: …, light: …)`, and the accessor returns `light-dark()`, which Lightning CSS lowers to the browser floor. SignInPanel's buttons and the `.provider-mark` circle are its consumers; an SVG fill inside a mark is artwork, and stays in `icons.tsx`.

Each edge or fill is held to 3:1 against the page (WCAG 1.4.11) and each ink to 4.5:1 against its fill and its hover, measured with `contrastRatio` (`src/lib/contrast.ts`). `tests/scss/tokens.test.ts` checks every such pair, reading the colours from `$brand-palettes` and the theme tokens, in one assertion per theme. The edges are what cleared it: Google's pale grey `#dadce0` measures 1.13 on the light page and fails, so the edge is Google's current light-button grey `#747775` (4.13 dark, 3.74 light); Microsoft's `#8c8c8c` measures 2.78 on light and fails, so the edge is `#808080` (4.74 dark, 3.26 light). Discord's and Facebook's fills on the page measure 4.06 and 3.88 on dark, 3.80 and 3.98 on light; inks on fills measure Google 16.48, Discord 4.61, Facebook 4.82, Microsoft 21.00, and on hover fills 13.68, 6.42, 6.57, 15.91, in both themes.

**Hover is not held to 3:1.** WCAG 1.4.11 covers what identifies a control and its states, and a hover ground is neither: the button is already known by its resting fill, and keyboard focus is shown by the focus ring ("The focus ring"). So Discord's and Facebook's darker hover grounds may sit under 3:1 on the dark page (2.91 and 2.85). Microsoft keeps its white face in both themes, with the `#808080` edge, over Microsoft's own dark button.

## The focus ring

Keyboard focus is a 2px outline drawn 2px outside the element by `focus-ring($color, $strength, $placement)` in `_mixins.scss`. A control that fills its bar or its row, whose own edge would clip an outside ring, passes `$placement: inset` and gets the ring 2px inside (`@include focus-ring($placement: inset)`; a coloured one passes it third, as `focus-ring($accent, $focus-ring-tab-strength, inset)`). Placement is last so callers that pass a colour and a strength by position keep working. The colour is mixed towards transparent, `color-mix(in srgb, <colour> <strength>, transparent)`, so the ring softens over whatever ground it crosses rather than standing at the body ink's full 14:1, which read as harsh. The strength is `$focus-ring-strength` in `_variables.scss`, 66.6% in both themes. Rings that set their own colour use the same number, so Combobox's rings on a coloured chip fade the chip's own ink (`currentcolor`) by it too.

Two rings keep another strength:

- **A link's ring** (`_typography.scss`) is the accent at `$focus-ring-link-strength`, which each theme sets as `--focus-ring-link-strength`: the shared 66.6% in dark, and `$focus-ring-link-strength-light`, 75%, in light. The light accent starts at only 4.65:1 on the page, and 66.6% takes it to 2.61, under the 3:1 floor; 75% is the least that clears it, at 3.01. The page row passing by 0.01 is intended: it is the guard on the number.
- **The tab row's ring** (`TabbedPage/index.scss`) is the accent, drawn inside the pill, at `$focus-ring-tab-strength`, set per theme as `--focus-ring-tab-strength`: the shared 66.6% in dark, and `$focus-ring-tab-strength-light`, full strength, in light. On the light track and the open pill the accent starts at only 4.05:1, so 66.6% takes it to 2.42 and even 75% leaves it at 2.75.

**Every button draws this ring, never the browser's own.** The `icon-button` mixin sets the shared ring on a button alone (`&:where(button):focus-visible`), so an icon link keeps the accent ring every link takes from the typography; the stock dialog's jar picks fill their row, so theirs is inset; the dialog's Close takes the shared ring ([`grimoire.md`, "Design review of the workspace ingredients page"](design-decisions/grimoire.md#design-review-of-the-workspace-ingredients-page)). The skip link's and the theme toggle's rings are the page's own colour round an accent fill, so it is the fill they are told from; faded, the ring sits closer to the ground behind it, and the fill is unchanged.

A ring marks a control's state, so it is held to 3:1 (WCAG 1.4.11), laid over each ground it is drawn on. `tests/scss/tokens.test.ts` reads every strength from the compiled CSS and checks every row below; it fails with the shared strength at 40%, with the light link at 66.6%, and with the light tab at 75%.

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

**Not covered: a ring on a coloured chip.** Combobox's ring on a category chip is the chip's ink faded over the chip's wash. For the seeded group colours it clears 3.53 to 3.91 in dark and 3.17 to 3.31 in light (lowest: `#606c2f`, light). The write-time check on a group's colours (`src/lib/contrast.ts`) holds the colour itself at 4.5:1 against its theme's harder surface, not this faded mix, so a colour a keeper adds could put the ring under 3:1. Noted, not fixed.

## Type

Cormorant Unicase for display, Lexend for body — both SIL Open Font License 1.1, self-hosted at build time by `next/font` (`src/app/fonts.ts`), so no request reaches `fonts.googleapis.com` at runtime and nothing about a visitor's page load reaches Google. Lexend is variable across 100–900, so one file covers every weight; Cormorant Unicase has no variable axis, so its weights are named and only the three the scale uses (500, 600, 700) are requested.

- **All four heading levels run at 700**, Cormorant Unicase's heaviest. It is a high-contrast display serif whose hairlines thin out the smaller it is set and the darker the ground, and 600 was hard to read on the dark theme. Nothing is above 700 for this face: if it still reads light, the display face itself is the lever, not the weight.
- **The scale is anchored at `h4` = 1.5rem and stepped up by roughly 1.2** (`h3` 1.8rem, `h2` 2.15rem, `h1` `clamp(2.5rem, 5vw, 3.75rem)`); anchoring at 1.125rem sets the smallest headings too close to body copy. The sizes are the `$heading-sizes` map in `_variables.scss`, read by level through `heading-size(1)` to `heading-size(4)`, and the face — the display family, 700, letter-spaced 0.01em — is the `heading-face` mixin. `typography-base` sets h1 to h4 from the two. A name set in the heading face outside a heading, as the context row's "Admin" and the coven switcher are, takes `@include heading-face; font-size: heading-size(4);` rather than restating the numbers, and keeps its own line height.
- **Monospace is a platform stack, no webfont**: it is for incidental inline `code`, not typeset code blocks, and is nudged to `0.9em` because platform monospace runs large next to Lexend.
- **Links get an underline under `prefers-contrast: more`**, on the body ink rather than a further-pushed sorrel: WCAG's "don't rely on colour alone", for users who have asked for more contrast.
- **A followed link takes the body ink**, from a `:visited` inside `:where()`, so any class-level link colour still wins ("Buttons").
- **A heading gathers four text roles**, all in `typography-base`: the `.eyebrow` above it, naming the section it sits in; `.meta`, a caption-size muted line tight under it (a formal name and form, a date, a count); `.binomial`, the italic of a botanical, fungal or zoological binomial, which the component adds only for those nomenclatures, since mineral and chemical names are set upright (`src/modules/ingredients/schema/ingredient-enums.ts`); and `.lede`, the muted sentence or two saying what the section is for, at body size because it is read. Wrapped in `.header`, the gap alone spaces them: `.header` zeroes its children's margins, because flex margins never collapse and a heading's bottom margin would otherwise add to the gap.

## Spacing

Every margin, padding and gap takes a step from `space()`, eight steps on a 0.25rem base: 0.25, 0.5, 0.75, 1, 1.5, 2, 3 and 4rem. `space(4)` is 1rem. An unknown step fails to compile. The few lengths between steps (0.375, 0.625, 1.25rem) fold into a neighbour when their section is designed.

**Two things stay off the scale.** A chip's or badge's inner padding is its own geometry: it is trimmed by the 1px edge so the label sits optically centred, and rounding it to a step moves the label. A control's height is a target size rather than a gap: `$control-height`, 2.78125rem (44.5px), so a text field, a select or suggesting box and a button stand level in a row whatever the font's line height. `.input`, `.textarea`, `.select` and `.btn` take it as their `min-height` (the button's vertical padding a step short of it so the minimum decides), and the combobox's text line is the control's height less its edge and padding. It is a minimum, so a list's box still grows with its rows of entries. 44.5 rather than 44 is what a button measured at its own padding, and both clear WCAG 2.5.5's 44px.

Below body copy, type takes one of five sizes by role from `type-size()`: `small` (0.875rem) for what a person acts on — labels, buttons, notices, field errors; `caption` (0.8125rem) for hints, metadata, chips and badges; `overline` (0.75rem) for the `.eyebrow`; `tab` (0.6875rem) for the one place five labels sit across a phone, under the icons of the section nav's bottom bar. Two steps sit between body copy and the smallest heading: `title` (1.25rem) for a form section's or a detail panel's title, and `lead` (1.125rem) for a form's group name. The headings' scale is `heading-size()`'s ("Type").

### The top inset

`$top-inset` (`var(--top-inset, 0px)`) is how much of the window's height is taken by chrome in the page's flow above everything else: the impersonation banner on a touch screen (`hover: none`), and 0 everywhere else. It is a size, not a scroll offset. The banner publishes its measured height as `--impersonation-banner-height`, and its own stylesheet maps it to `--top-inset` under `@media (hover: none)`. On a pointer screen (`hover: hover`) the banner is fixed over the top of the page and takes no room, so the inset stays `0px`. The fallback is `0px`, not `0`, because it is used inside `calc()` and a unitless zero there is invalid.

The banner scrolls away with the page on a touch screen, so the inset is room above the viewport only until the first scroll. It is therefore read by what sizes itself to the window, never by what pins or jumps to its top:

- Every page a full screen high sits in `.page-frame`, which takes `min-height: calc(100dvh - #{$top-inset})` ("The page frame"), less `$shell-bar-height` inside the shell: `/`, `/sign-in`, `/account`, `/account/email`, the not-authorized page and the invitation page. The site frame (`.site-frame`) does the same. A page that needs the full height takes the frame rather than restating the rule.
- The shell's bar (`position: sticky`), `ThemeToggle`'s corner variant, the sorrel corner of `Backdrop`, the navigation bar, `.page-nav` and every scroll margin and `scroll-padding-top` start from the window's top (`0`) with no inset. On touch the bar sits under the banner at first, scrolls up with it, then holds at the top.

Anything new that pins to the top or jumps to it starts from `0`; only a height that must fit the window less the banner reads the inset.

## Corner radius

Four radii by role, from `radius()`:

| Role      | Radius   | For                                                           |
| --------- | -------- | ------------------------------------------------------------- |
| `sharp`   | 2px      | A badge, square enough not to read as a chip                  |
| `control` | 0.333rem | What a person types into or presses: fields, buttons, notices |
| `surface` | 0.5rem   | What holds controls: panels, cards, modals                    |
| `pill`    | 999px    | A chip                                                        |

A button beside a field matches it, and a panel holding both reads as the thing that holds them.

## Buttons

`.btn` is the shape every button shares, `SignInPanel`'s brand buttons included. No tapped control shows the platform's tap highlight: `body` sets `-webkit-tap-highlight-color: transparent` (`src/app/globals.scss`), so a control's own `:active` and focus styles are its only feedback, and each control that can be tapped needs one. A phone applies `:active` late or not at all (Chromium only once it has ruled out a scroll, Safari only where a touch listener is attached), so a control that must answer a tap at once spreads `pressFeedback` (`src/lib/press-feedback.ts`), which marks it `data-pressed` from a pointer's press until it lifts, leaves or turns into a scroll, and its stylesheet draws `:active` and `[data-pressed]` alike (the tab row's segments, [`components/tabbed-page.md`](components/tabbed-page.md); the admin nav's summary, [`components/admin-nav.md`](components/admin-nav.md)).

Five variants:

- **The outline (`.btn`)**, the default: the accent on an edge, filling on hover. The edge is 1.6px on every variant, heavier than a field's 1px, since a hairline in the accent barely reads as a colour. A border width rounds down to whole device pixels, so it draws 1.5px on a 2x screen and stays 1px on a standard-density one.
- **`.btn--solid`**, a view's one primary action — Save, Send, Continue. Filled in the accent, the label on `$text-on-color`, with its own hover step (`--accent-solid-hover`).
- **`.btn--quiet`**, an action that changes nothing: Cancel, Keep Editing, Back. The label in the body ink, so it neither competes with the primary nor reads as destructive, and, unlike the muted ink, not as disabled either. It sits in a field's ground (`$surface-card`) inside a `$hairline` edge rather than an ink outline, so it stands back beside the primary; pointed at or focused, the ground takes `$fill-highlight-field` and the edge `$edge-highlight`. The label on the lit ground holds 4.5:1 in both themes (`tests/scss/tokens.test.ts`).
- **`.btn--destructive`**, what destroys something: Delete, Remove, Discard Changes. It also marks a high-risk control that destroys nothing, and only four exist: Impersonate (on the row, in the user modal and on its confirm), Pause Keeper Changes (Pause, Resume and its confirm), Revoke Batch (its column on the invitation cards table and its confirm) and Email Every Account (the button and its confirm). It wears the wax, `$secondary`, which every error wears too.
- **`.btn--caution`**, the same outline in the warning ochre (`$warning`): an act that reaches every reader at once and is not undone, but destroys nothing. One control wears it: a document's Publish, on the button and its confirm.

**Two size modifiers, `.btn--small` and `.btn--medium`**, compose with any variant; a class list names the variant before the size (`btn btn--quiet btn--small`), so one search finds every use. `.btn--small` has half the padding (`space(1) space(3)`), no `$control-height` minimum, a 1px edge in place of `.btn`'s 1.6px, which reads heavy at this size, the `caption` type size, and a `space(2)` gap. It is for a compact strip the full button would make taller, such as a banner or a table row (the impersonation banner's Stop). `.btn--medium` sits between: the same label size and edge as `.btn`, no `$control-height` minimum, and `space(1) space(4)` of padding (the shell's Add Ingredient wears it with `.btn--solid`).

**A save in flight is `aria-busy` with a `.spinner`**, on every Save button. The spinner is a 1em ring in the button's own ink, open on one side so its turn reads, slowed rather than stopped where motion is reduced. It sits ahead of the label, which says what is happening ("Saving Category"). A `.btn[aria-busy='true']` brings its left padding in a step, since padding sized for a word reads as a gap before a small round mark. Every spinner button is a `BusyButton` ([`components/busy-button.md`](components/busy-button.md)), which draws the `aria-busy`, the spinner and the label swap from its `busy` and `busyLabel` props, so no form writes the markup by hand. The one exception is the pager's link while its page loads, an anchor rather than a button.

#### Disabled is dashed and faded

From `disabled` (which may leave the tab order) or `aria-disabled` (which stays in it): the edge dashes, the fill clears, and the whole button drops to 55%. Neither state needs a component to restate it. The look is also used by a modal header's controls while a question holds them (`Modal/index.scss`) and every tab while one is on its way; `:hover` and `:focus-visible` restate every property so no colour modifier's own competes. `SignInPanel` avoids a specificity tie by not applying its brand class to a disabled button.

**A `.btn` on an anchor is a button in every state**, Add Category and Continue among them, and never underlines. `.btn` sets `text-decoration: none`, and `_typography.scss`'s visited ink sits inside `:where()`, so it adds nothing to `a`'s specificity and every variant's own colour outranks it. A component never restates its label colour to keep a followed `.btn--solid` off the body ink.

**`.pager` is a paged list's Prev and Next**: a `nav` with `class="pager"` and `aria-label="Pages"`, holding a bare `ul` of two `li`s, each a full-size `.btn.btn--quiet` anchor, quiet because paging changes nothing. The list is a wrapping flex row, centred under the table, with a `space(3)` gap and no ✦ marker. The ‹ and › marks are `.pager__mark` spans at 2em with a line height of 1, raised 0.08em to the label's centre, and `aria-hidden`, so the links are named "Prev" and "Next". `.pager__position`, "Page 2 of 3" between them, is muted text at the body size with `space(4)` either side, since it is not a control. An end with no page is disabled rather than hidden, so neither moves. The markup is the `Pager` component's ([`components/pager.md`](components/pager.md)).

**`.page-header` puts a page's heading and its one primary action on one line**, the action at the end: `/curator/categories`' Add Category beside its H1. The row is centred and the action brought down 0.25rem, because a heading's box carries room below its letters, so a centred button reads high and one on the baseline low. The row wraps on a narrow screen rather than squeezing the heading. The header is a size container, so it measures its own width rather than the screen's: under 28rem of it, the forms' column, the action goes beneath the heading and loses the quarter-rem drop, which only lined it up beside the heading. Where it then sits, and how the Add becomes a plus, is [`components/page-header.md`](components/page-header.md#styling). A tabbed admin page draws its heading in a `PageHeader` too, the open tab's action beside it ([`components/tabbed-page.md`](components/tabbed-page.md)).

**The admin tables are banded at desktop width, and stack into cards on a phone.** Wide, every even body row sits on `$surface-card`, the surface a modal wears, so a wide row stays readable across. Each cell is inset `$table-cell-inset` (`space(3)`) on both sides so no text meets a band's edge, the filter row above the table runs edge to edge with it, and cells align on the baseline so a row's small button reads on its text's line. A heading sits on its cell's bottom instead, so one that wraps keeps its last line level with its neighbours', on the 1px `$text-muted` hairline under the header row. These rules are the `.data-table` primitive, inside a `.data-table-frame`; every admin list (the category and form lists, UserList, CompendiumList, GroupedValueList) is on it. Narrow, a table with the `.data-table--stack` modifier turns each row into a card once its frame is under `$table-stack-width` ("Tables at phone width"); a table without it scrolls sideways inside its frame rather than widening the page.

## Form fields

The class layer every form is built from is in `_primitives.scss`: `.form` and `.form__actions`, `.field` with its `__label`, `__hint` and `__error`, `.input`, `.textarea` and `.select` (one box for all three), `.checkbox`, `.switch`, `.search-field`, `.fieldset`, `.notice` and `.back-bar`. What the code does not say:

- `.form` is the column of fields a `space(5)` apart; `.form__actions` follows `space(2)` further off and as far again from what follows (2rem either side in a modal, where a `.modal__actions` row in a `.form` takes the same).
- `.checkbox` is a `<label>` wrapping its box, so the whole line is the target.
- `.switch` is an on-or-off choice as a slide toggle, a `.field` block: its label above, the toggle beneath at `$control-height`. `SwitchField` draws it ([`components/field.md`](components/field.md)).
- `.search-field` is a list filter's search box: an `.input` box on a flex row holding a borderless text input and a magnifier submit named Search, muted until pointed at or focused, then the accent. The box draws the input's focus ring. `SearchField` draws it ([`components/field.md`](components/field.md)).
- `.notice` (`--error`, `--warn`, `--caution`, `--success`) is a sentence about the whole view rather than one field. It has no box: a 3px bar down the start edge and a tint of the bar's colour behind the text (`--notice-tint`, 7% light, 8% dark). `--error`, `--warn` and `--caution` lead with a warning triangle drawn by mask in the padding, so a link in the text stays inline. [`components/notice.md`](components/notice.md) has the table.
- `.back-bar` is the row a detail page opens with: the back link at the left, anything the page adds at the right, on one centre line (the ingredient entry page and the spell recipe page).

Rules:

- **A field's hint is an info tip beside its label** (`InfoTip`, [`components/info-tip.md`](components/info-tip.md)), not a line beneath it, so a form of many fields does not read as a wall of hints. The tip's text stays in the field's `aria-describedby`, so it is read with the field whether the tip is open or not. The tip opens on hover, a tap or the ⓘ's own focus, never on the field's focus ([`components/info-tip.md`](components/info-tip.md#behaviour)). `.field__hint` remains for a line that must stay in view, such as why a field is disabled, since a shut field that does not say why reads as broken. A form adopts tips at its own design review. Not every field gets one: a tip earns its place only by stating a rule, a flow or a format with a trap ([`components/info-tip.md`](components/info-tip.md), "When a field gets a tip").
- **A radio group takes the form's gap, not a margin of its own.** `.fieldset.radio-group` (`RadioGroupField`) has a `space(5)` block margin that sets it apart where nothing else spaces it, as in a confirm's modal. Inside a `.form`, whose `space(5)` gap already spaces every field, `.form > .fieldset.radio-group` clears it, so the margin would not add to the gap.
- **Every text, textarea, select and type-ahead field shows a placeholder**, a short action, and what the field is for goes in its hint's info tip ([`components/field.md`](components/field.md#contracts) holds the rule). The placeholder reads in `$text-placeholder`, held at 4.5:1 on the field's ground in both themes by `tests/scss/tokens.test.ts`.
- **A field is optional unless it carries the required mark**, the asterisk `.field__required`, so no label says "(Optional)" ([`components/field.md`](components/field.md#contracts)).
- **The error sits beneath its control**, nearest what was typed, and is drawn the same whichever side found it: the resolver before a request, or the server's `fieldErrors` after (DESIGN.md §7, "Errors"). The control names the error and the hint in `aria-describedby` and carries `aria-invalid`, which is what draws the error edge, so the markup that makes the error announced is the markup that makes it visible.
- **The error edge is a shape as well as a colour**: `aria-invalid` turns the border to `$secondary` and adds a second pixel inside it, so the state does not rest on hue alone (WCAG 1.4.1).
- **A rule that belongs to no one field is a `.notice` above them all** — an empty-path error. Its role is the markup's: `role="alert"` for an error that arrives after the page did, `<output>` for news of success.
- **What a person typed is weight 400**, a step firmer than the prose around it. Field errors and notices are 400 too: coloured text at `small` size thins out at 300.
- **The select draws its own chevron**, two gradient triangles in the muted ink, since the platform's arrow varies by OS and ignores the theme. Under `forced-colors` the native arrow comes back, because forced colours drop background images.
- **A select's placeholder is a hidden, disabled first option** whose value is `''`: it shows until a choice is made and cannot be chosen back, and reads in `$text-placeholder` as an input's does (the muted ink mixed 85% into the field's ground, the greyest that holds 4.5:1: 4.68:1 on the light field, 6.71:1 on the dark), since WCAG 1.4.3 covers a placeholder as it does any text. A select whose blank is an answer, such as "None", offers it as an ordinary option instead.
- **The checkbox is the platform's**, coloured by `accent-color`, which takes the token and picks its own check-mark contrast.
- **An on-or-off filter is a switch**, not a checkbox, which looks out of place among a filter row's boxes: a native checkbox with `role="switch"` and `appearance: none`, drawn as a rounded track, `$switch-width` by `$icon-size`, with a `$glyph-size` thumb (`::before`). Native, so it submits with a GET form before hydration and keeps Space and its label's click, and its checked state is the switch's to a screen reader; no `aria-checked` is written, since a press before hydration would leave it stale. Its label stands above it as every field's does, and the toggle sits centred in a `$control-height` row, so in a filter row it lines up with the boxes beside it. Off is the field's ground with the muted 1px edge and a muted thumb at the start; on fills the track with `$accent` and the thumb, in the page's colour as a solid button's label is, slides to the end over `$motion-short`, jumping under reduced motion. Where the thumb sits, not its colour, tells on from off (WCAG 1.4.1). Hovering the toggle or its label takes the edge to the body ink, or the fill to `$accent-solid-hover` when on; pressing either stretches the thumb a step towards the other end, marked `data-pressed` (`src/lib/press-feedback.ts`) as well as `:active`; the focus ring is the shared one. Disabled is dashed and unfilled, its thumb muted in either position and its label dimmed; `aria-disabled`, a filter row's while its list is on its way, stops the hover and press looks and leaves the row's fade to grey it. `tests/scss/tokens.test.ts` holds the edge and thumb at 3:1 (WCAG 1.4.11) against the page and the card in both themes, off, on and hovered on; the lowest is the light theme's on track against the page and its thumb on it, 4.65:1. Under forced colours the thumb is drawn in `CanvasText`, and on the track in `Highlight`.
- **Disabled is an attribute, not a class**, and looks the same on a field as on a button: a dashed edge and no fill. A disabled field also takes the muted ink and dims its `.field__label`, since a faded box alone reads as a live one on a dim screen. The label dims for a disabled control only, not any disabled descendant, since a select's placeholder is a disabled option. A component never restates it.

**Cancel asks when there are changes**, for every admin form. While a form has unsaved changes, the same flag that turns its Save on, Cancel, and the modal's Close button, Escape and a click outside, ask before throwing the changes away; a save or a delete never asks. One guard draws the question for every form ([`components/modal.md`](components/modal.md#unsaved-changes)).

**A form asks over itself.** Every question a form asks before it acts, the unsaved changes' and each Delete's, is one card, `ConfirmOverlay`: the modal's raised surface at the floating elevation, `$narrow-column` wide, over a scrim of the page's ground at 75%, fading in over `$motion-short`. How it is placed, held and focused is [`components/modal.md`](components/modal.md#asking-over-the-form).

**A narrow form stacks its buttons.** A `.form` is a size container, and under 28rem of its own width its `.form__actions` or `.modal__actions` row turns to a column: each button full width, in order, any `margin-inline` pushing a Delete aside reset. It keys off the form's width rather than the screen's, so a form in a narrow modal stacks too.

Pieces around a field and a form's buttons that more than one form shares are each written once in `_primitives.scss`:

- `.field__label-row`: a label and what stands beside it on its line, an `InfoTip`'s ⓘ or the required mark, a `space(1)` apart. It is the position a tip opens from, so the tip lines up with its field. The `Field` component draws it ([`components/field.md`](components/field.md)).
- `.field__required`: the asterisk hard against a label whose field a save asks for, in the error red. The markup hides it from a screen reader, which hears the control's `aria-required` instead of "star".
- `.form__aside`: the button set apart at the row's far end, an edit's Delete, so it is not pressed for Save. A `margin-inline-start: auto`, which the narrow form's stacking takes back.
- `.filter-row`: a list's filter form, a toolbar that applies as it changes: the search, its choices and switches, and Clear while a filter is shown, wrapping, and stacked on a phone. Widths, the busy fade and the type-ahead's width rule are [`components/filter-form.md`](components/filter-form.md#styling). The filter type-ahead is 14rem wide; the longest seeded name ("Anglo-Saxon & Continental Germanic") is 18rem as drawn and runs on inside the box, its option drawn whole.
- `.list-frame`: a list page's root, a `ListFrame` ([`components/list-frame.md`](components/list-frame.md)): its filter, notice or empty state, table and pager, a `space(5)` apart, a paragraph in it with no margin of its own. Its `.list-frame__body`, the list under the filter, is spaced the same, and fades in when a new page replaces the skeleton.

Form-control details: an undo/redo pair uses width 0 rather than transparent, so neither the dashed disabled edge nor a held modal's brings a border back; in a modal it stands at the end of the header slot row, stretched to row height, elsewhere at the start of the form. The compact field size is `$control-height-compact` with caption-size text. The hero size, `$hero-control-height` (3rem) with lead-size text, is the help front page's search box alone. The switch's pressed state stretches the thumb towards its end before the switch turns. Radio strip, segmented and cards layouts take arrow keys, checked state and label as the list does.

## The page frame

`.page-frame` is the centred, full-height column of a page: Welcome, sign-in, the invitation (outside the shell), and the account pages, the not-authorized page, the coven landing and the create-coven page (inside it). The sign-in page and the invitation each sit on a `.panel` inside the frame, so a reader who follows a link from an email sees the card the sign-in page draws. Its children stand `space(6)` apart and stop at `$measure`; `.page-frame--narrow` stops them at `$narrow-column` (28rem), the forms' column. It is `min-height: calc(100dvh - $top-inset)` with `space(6)` above and below and `space(4)` at the sides, `border-box`, so a page a screen high does not scroll by its own padding or the banner above it. Inside the shell (`.app-shell .page-frame`) the bar takes room above it too, so the minimum height also subtracts `$shell-bar-height`, and a `.page-frame__section`'s `scroll-margin-top` adds it, so a jump lands below the sticky bar.

- **The gap alone spaces the column.** `.page-frame > *` clears every child's block margins, which outranks bare `section`'s from `layout-base` and `.page-header`'s own, so neither stacks on the gap.
- **The width and its cap sit inside `:where()`**, so they carry no specificity. In the app the class layer compiles as `body .x` (0,1,1) and would beat a component's single class; in the workshop it compiles as `:where(.workshop-story-frame) .x` (0,1,0), where source order decides. Under `:where()` a component's own narrower column, such as the sign-in panel's, wins in both. A primitive rule a component must be able to override is wrapped the same way; check it in the app, not only the workshop. The other way round holds too: a component that carries a primitive class and restates one of its properties compounds the two, as the sign-in card's `.sign-in-panel.panel` does for its padding, since a lone component class loses to `body .panel` in the app while the workshop shows it winning.
- **`.page-frame__section`** is a titled section of a framed page, a `space(3)` column whose `h2` takes no margin, held `space(4)` clear of the top when the page's own nav jumps to it. **`.page-frame__rule`** is the 1px `$text-muted` hairline between two.
- **`.page-with-nav`** is a page with a jump menu (`PageNav`, [`components/page-nav.md`](components/page-nav.md)): the account page's and the coven index's. Its children are the head, the menu, then the sections. From a tablet up it is a grid, the menu a sticky column spanning the three rows after the head (so a page has at most three sections beside it while it sticks; the account's fourth runs below) to the left of the sections, which stop at `$narrow-column`; from 58rem an empty column the menu's width to their right balances it, which centres the sections in the window. At a phone's width it is the `space(6)` column the frame is, the menu above the sections. It stands on its own, so it also serves a page that is not a `.page-frame`, such as the coven index inside `.coven-layout`, and clears the children's block margins as the frame does. Both pages use the one class, so the two cannot drift. The columns are the mixin `page-with-nav-grid($menu, $column)` in `_mixins.scss`, shared with a document page's wider pair and with the shell's paused notice, which stands over the page's column. On the entry page the menu is 12rem while the article is wide; below that the content keeps 60rem and the menu gives way first but never narrower than its longest label; the menu takes the body's row and sticks under the shell bar.
- **`.notice.page-frame__notice`** is a notice standing between a section's head and its body, such as the `/coven` landing's word of waiting invitations: `space(3)` above and below it, on top of the section's gap, so it reads apart from both. It names both classes to outrank `.notice`'s zero margin, which comes later in the file.

### Three column types

Every page is one of three, and each is centred in the window (MB.124, pick 14). A **list** runs the frame's full width from the 16px gutter. A **reading page** (a document, a recipe) is a 660px column starting at 310px on a 1280px window. A **form or tabbed page** is `$narrow-column` (28rem, 448px) starting at 416px. The narrow frame is `.page-frame--narrow`; no rule in the code sets it to any other width. A **card page** (sign-in, forgot and reset password, the invitation, Create Coven) puts its heading at `.auth-title` size, centred with its lede (`.card-page-header` on its `PageHeader`).

## The page column

`.page-column` is the frame every `/keepers` page sits in, and the (public) layout's compendium pages too: the page's children a `space(5)` apart. The admin nav is in the shell's context row above it. It is a column as wide as `$wide-column` (80rem), centred, with `space(6)` above and below and `space(4)` at the sides, `border-box` so a padded child keeps its padding inside the column at 375px. It is wider than `.page-frame` because its pages hold tables (the user list's seven columns need about 77rem before they stop scrolling inside their frame, and the privilege ledger has seven too), and it is neither full height nor centred down the window, since a list page runs as long as its rows. Only `.page-column` and `.coven-layout` read the token, so nothing outside `/keepers`, `/coven/` and the public compendium widens with it. Its paragraphs still stop at the measure. The width and its cap sit inside `:where()`, as the page frame's do, so a single class can change them. It is a primitive rather than AdminNav's own rule because the admin, public and coven layouts and the admin components' stories use the class as their frame. Inside it a page header's action, and a tab's, goes beneath the heading at phone width at its natural width, at the line's start, except the Add, which is a plus beside the heading ("Buttons").

`.coven-layout` is the same frame around every `/coven/[slug]` page; the section nav (`CovenNav`) is in the context row above. The wide column suits its tables. What a page does inside the frame is the page's: the coven index sits in the narrow column with a jump menu at its side (`.page-with-nav`, "The page frame"), and its sections are plain `.page-frame__section`s rather than panels, the shape the admin index uses. The index's table of contents is the `.admin-contents` list the admin index draws, in `_primitives.scss` for both. Its links are in the body ink whether or not they have been followed, so the two overviews read the same whatever the browser's history. The admin area's page-header rules stay scoped to `.page-column`.

## Tables at phone width

A table whose rows turn into cards on a narrow screen, so no column scrolls out of sight. Add `data-table--stack` beside `data-table`, and every column's cell names its column in a `data-label` attribute (an action cell's is empty and carries `.data-table__card-action`). The markup is `StackTable`'s ([`components/data-table.md`](components/data-table.md)).

- **It stacks by its frame's width, not the screen's.** `.data-table-frame` is a size container named `data-table`, and under `$table-stack-width` (40rem) of it each row becomes a card: a grid on `$surface-card` with `radius('surface')` and `space(4)` of padding, a `space(3)` gap between cards and between the cells in a card (a card of text alone reads cramped at a table row's spacing), every cell a block beneath the last. Every card is on the card surface, so the bands give way. A frame measures its own width only while that width does not come from the table inside it, so it sits as a block or a stretched flex item, never in a row that shrinks to fit.
- **The header row is hidden but still read.** It is clipped as `.visually-hidden` is, so a screen reader still has the column names. Each cell is led by its own name instead, drawn from `data-label` by a `::before` in the muted ink at the caption size, `space(1)` above its value (half the `space(2)` between cells, so a label sits with its own value). A cell whose `data-label` is empty, an action such as Impersonate, has no label and spans the card.
- **A row's Edit stands at its card's top right**, beside the first line. Its cell, label empty, carries `.data-table__card-action`: a row holding one becomes a two-track grid, `minmax(0, 1fr) auto`, the first cell in the first track, the action in the second on the first row, and every other cell across both beneath. The grid places it, not the markup, so the columns and the keyboard order stay as the desktop has them (`StackColumn.action: 'corner'`). UserList places its Impersonate the same way by its own rule. On the desktop an action column's ground is opaque and follows its row, so scrolled text never shows through.
- **A stacking table writes out its roles**: `role="table"`, `rowgroup`, `row`, `columnheader` and `cell`. WebKit drops a table's meaning once `display` changes on its parts, so a screen reader in Safari would read the cards as loose text; the explicit roles put the meaning back. They are the roles the elements have already, so nothing else changes, and a happy-dom test's `getByRole('cell')` finds a `td` either way. Every admin list's table is `StackTable`, which spreads them from `src/lib/table-roles.ts`: `tableRole('row')` for a part, and `stackCell(label)` for a cell, which carries its `data-label` too.
- **The label is written twice.** `content: attr(data-label)` and then `content: attr(data-label) / ''`: the second gives the label an empty alternative text, so a screen reader, which has the header, does not hear the column name twice. A browser that drops the slash form (Firefox before 128) keeps the first declaration, so there the name is read twice, which is acceptable: it is an enhancement past the floor ("Binding rules").
- **A sticky cell is reset in its component.** A cell made `position: sticky`, as UserList's Impersonate column is, only works while the frame scrolls, and in a card it would sit over its neighbours, so the component sets it back to `static` under the same container query. The primitive leaves `position` alone, since a cell may be `relative` to anchor a tip.
- **Wrapping in a cell**: a confirmation opened from a cell wraps as prose; a card, which does not scroll, wraps; a table inside that dialog keeps its own wrapping (child combinators).

## Provider marks

**`.provider-mark` is a provider's mark on a 1.5rem circle of its brand's ground**, as its sign-in button gives it one: the marks are drawn for those grounds. `--google`, `--discord`, `--facebook` and `--microsoft` take their `fill` from `brand-color()`, and a white one its brand's `edge`, which holds 3:1 against both pages ("Brand colours"). The circle is `border-box`, so an edged one is the same size as the rest. The markup is the `ProviderMark` component's ([`components/provider-mark.md`](components/provider-mark.md)).

## The application shell and the layers

Every signed-in page sits in the shell ([`components/app-shell.md`](components/app-shell.md)): a sticky bar `$shell-bar-height` (3.25rem) tall, then a context row (`$context-row-height`, 3.5rem; `$context-row-height-phone` on a phone) that names the area and carries its section nav, then the page. At or under `$shell-phone-width` (40rem) the section nav is a bar fixed along the bottom, `$bottom-bar-height` tall plus the safe-area inset, and `.app-shell__main` pads its bottom by that calc when it holds a `.section-nav`. The bar, the row and the page column share `$wide-column`. On a phone the switcher stands on its own row, the section nav runs along the bottom and the account button is an avatar alone. The bar collapses its links in priority order (Priority+) between the phone shape and a desktop width where all six fit; with the Compendium link a keeper's bar outran an 882px window.

**Every z-index that meets another at the window comes from `layer()`** (`_variables.scss`): `shell` 10 (the bars), `banner` 11 (the impersonation banner), `toggle` 12 (the corner theme toggle), `floating` 20 (a list or panel opened from the shell over the bars: the account panel, the coven switcher's list, the skip link) and `dialog` 30 (a non-native overlay). `sticky-row` is a page's own row under the bar, above the cards below it; `callout` is a click's failure under its control (`ClickFeedback`), over a popover it may sit beside and under a non-native overlay. A component inside its own stacking context keeps a small local index. No other number is added.

## Designing a section

What each section review designs to:

- **Build from this layer, and grow it rather than going round it.** A page takes its colours from the tokens, its lengths from `space()`, its radii from `radius()` and its type sizes from `type-size()` and `heading-size()`. A shape two sections need is a primitive in `_primitives.scss`, drawn on the `Foundations` page, not two component rules.
- **Each review checks the CSS it adds against `npm run lint:css`**, and looks at the section in Safari and Firefox, in the audit profiles when a layout changed. A feature past the floor needs one of the three shapes in [`.claude/rules/components.md`](../.claude/rules/components.md).
- **One solid button per view**, on its primary action. Everything else is an outline, quiet, or the wax for what destroys something.
- **A centred page sits in `.page-frame`**, or `.page-frame--narrow` when its content is a form ("The page frame"). Each titled section of it is a `.page-frame__section` named by its `h2` through `aria-labelledby`, so a screen reader lists it as a region.
- **Forms are the field primitives.** An error is a `.field__error` beneath its control from either source, and a rule that belongs to no field is a `Notice` above them all ([`components/notice.md`](components/notice.md)). Use the component rather than writing the `.notice` markup: its `kind` picks the role, and the role is what makes a message that arrives late get read out.
- **A failed request is read by `readGraphqlFailure`** (`src/lib/graphql-failure.ts`). Pass it the names of the fields the form draws its own errors under. It answers either one of those fields and its message, or one sentence for the form's `Notice`: the server's own, or `GENERIC_FAILURE` when the request got no usable answer. A form that places several field errors at once, as the admin forms and `IngredientForm` do, reads them with `readGraphqlIssues`, which hands back every issue of a refusal, or one pathless issue carrying the same sentence.
- **A section head is `.header`** with an `.eyebrow`, the heading, and a `.lede` where the section needs saying what it is for.
- **A page head is a `PageHeader`, always.** No page and no component writes its own `h1`: `tests/guards/page-heads.test.ts` fails one that does, bar the loading covers' hidden heading. Only the public pages carry an eyebrow and a lede: the public Compendium has both, and its entry page has the formal name as its eyebrow. The app's list pages (a coven's Ingredients and Grimoire, its Members, the admin Compendium and the other admin lists) have the heading alone, with its action beside it. The screens outside the lists, such as the coven home, Create Coven, the sign-in, email and invitation panels and the error pages, keep the eyebrow or lede they say their purpose with, drawn by `PageHeader` too ([`components/page-header.md`](components/page-header.md)).
- **The copy has one voice.** Speak to the reader as "you", in plain words. A message says what happened in one sentence and what to do in the next. "Please try again." goes only where trying again can help, so a refusal that will refuse again says what to change instead. The same thing keeps the same name everywhere: a "sign-in method", never a "sign-in option", and an email "address". Every label, button and heading is title case (`.claude/rules/components.md`, "Copy").
- **Use the shared pieces rather than their markup**, each in `claude-docs/components/`. A field is `Field`'s `TextField` or `SelectField`, or its `FieldShell` around a control of the form's own; a button with a spinner is a `BusyButton`; a list's filter is a `FilterForm`; a page's head, its heading and its action, is a `PageHeader`; a page in tabs is a `TabbedPage` with each tab's action from its route group's `@action` slot; a modal opened by its page's address, or at once by a press, is a `RouteModal` ([`components/modal.md`](components/modal.md)). A button that opens a dialog from its own page is a `ModalButton`, which takes the focus back to it however the dialog closes, since `Modal` restores nothing itself. A refusal from a click outside a form is said by `useClickFeedback` ([`components/click-feedback.md`](components/click-feedback.md)), in a callout floating under the button pressed, out of the flow so that a narrow cell or a phone's card does not wrap it. A page's own menu of jump links is a `PageNav` ([`components/page-nav.md`](components/page-nav.md)), laid out by `.page-with-nav`.
- **Lists are the list primitives.** A list page's root is a `.list-frame`, its filter form a `.filter-row`, and its table a `.data-table` in a `.data-table-frame` with the `--stack` modifier, its explicit roles and a `data-label` on every cell, so it turns to cards on a phone rather than scrolling sideways ("Tables at phone width").
- **Prose stops at the measure**; a table or a grid may be as wide as it needs.
- **Both themes, and 375px.** A review signs off in the workshop in both, at phone width, with every text pairing at 4.5:1 and every edge a control depends on at 3:1.

## Smooth scrolling

The root sets `scroll-behavior: smooth` (`src/app/globals.scss`), so a jump to a section glides. Next scrolls to the top on a route change too, and turns smooth scrolling off for that jump only if `<html>` carries `data-scroll-behavior="smooth"` (`src/app/layout.tsx`). Without the attribute the jump glides, then Next's scroll-into-view glides on and stops part-way down (62px at a desktop's width, 40px at a phone's, after a move from an admin page to the Compendium). Keep the attribute for as long as the stylesheet sets the behaviour. `tests/e2e/route-scroll.spec.ts` proves it, with reduced motion switched off for that spec alone, because the suite's default turns the smooth scrolling off and hides the bug.

## Theme resolution

`globals.scss` resolves three states, and `.storybook/theme.scss`, `ThemeToggle`'s `index.scss` and `resolveCurrentTheme()` mirror the same cascade selector for selector:

| Selector                                                             | Theme                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `:root`                                                              | dark: the default, and what a system with no preference or a dark preference gets |
| `@media (prefers-color-scheme: light) html:not([data-theme='dark'])` | light, only while no explicit choice overrides it                                 |
| `html[data-theme='light']`                                           | an explicit choice, which beats the system                                        |

The `:not([data-theme='dark'])` guard lets the toggle pin dark on a light-preference system. Both light blocks `@include theme-light`, so the two spellings cannot drift; the theme mixins are mixins for that reason. Only `globals.scss` (and the workshop's copy) includes them: a component that includes one is re-theming a subtree, which nothing here does.

`color-scheme` is set alongside the tokens so form controls, scrollbars and the canvas match without styling. Dark turns on antialiased font smoothing, since light text on a dark ground renders heavier; light keeps the browser default.

## Forced colours

Forced colours (Windows High Contrast) repaint every background to `Canvas`, drop shadows and gradients, and paint a transparent border or outline in `CanvasText`; a system colour the author writes is kept. Each rule sits in a `forced-colors` block, uses only `Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `LinkText`, `GrayText` and `ButtonText`, adds no token and never uses `forced-color-adjust`. Each state has one treatment:

- **Edge.** A surface whose edge was a shadow takes a 1px `CanvasText` border (cards, panels, dialogs, chips, the sourcing bar's track). The pinned search row takes a rule along its foot, a banded table row one under it, and the sticky action column a line at its start edge (`sticky-action-column`, dropped when the table stacks). An error edge that was an inset shadow takes a second line inside it, as an outline.
- **Hover.** A bordered control turns its border `Highlight`. A control with no border takes a 1px inset `Highlight` outline, not while it has the focus ring.
- **Chosen or open.** A `Highlight` fill with `HighlightText` ink, as `.switch` and the radio strip do.
- **Focus.** No change: the shared ring is an outline, which forced colours paint in `CanvasText`.
- **Disabled.** `GrayText` ink and border, keeping the dashed edge.
- **Marks drawn by a fill or a mask** are painted a system colour: `CanvasText` for `warning-mark`, the ClickFeedback badge, the search caret, the sourcing bar's losses and the current PageNav section's heavy border (a `Canvas` one at rest); `LinkText` for the LinkHint dot; `Highlight` for the sourcing bar's gains and a jumped-to entry target's 1px outline.

`tests/e2e/forced-colours.spec.ts` asserts each against the colours the browser resolves.

## The files

Each token and mixin is explained where it is declared; this section says where things live.

- `src/scss/_variables.scss`: the palette, badge tokens, brand colours and `brand-color()`, the font stacks, `$measure`, `$narrow-column`, `$pager-tight-width`, the loading tokens ([`loading.md`](loading.md)), the four scales with their accessors (`type-size()`, `heading-size()`, `space()`, `radius()`), and the sizes with a role of their own. A component `@use`s it directly.
- `src/scss/_mixins.scss`: the shapes that repeat (`modal-surface`, `chip`, `badge`, `tip-bubble`, the icon-button family in [`components/icon-tip.md`](components/icon-tip.md), `theme-dark` / `theme-light`, `semantic-tokens`, `focus-ring`, `motion` (a transition list for a state change), `state-fade` (a hover or focus fade, set on the element's own rule so it runs into and out of the state, and snapped under reduced motion), `reduced-motion`, `forced-colors`, `loading-motion`, `arrived`, the table mixins and small resets).
- **Three `*-base` mixins**, each emitting nothing on its own `@use` and `@include`d at exactly one site, `globals.scss`'s `body`: `_typography.scss` (`typography-base`: headings, body copy capped at `$measure`, links, lists, `.eyebrow`, `.meta`, `.binomial`, `.lede`, `.tight-headings`), `_layout.scss` (`layout-base`: bare `section` / `header` structure, `.header` / `.footer`) and `_primitives.scss` (`primitives-base`: the class layer, including `.spoken-separator`, a comma heard but not seen between two parts of one name, drawn at no size so Chrome adds no space around it).
- `src/app/fonts.ts`: Cormorant Unicase (500/600/700) and Lexend, self-hosted at build time through `next/font/google`. The CSS variables it defines on `<html>` are what `$font-heading` and `$font-body` reference.
- `src/app/globals.scss`: the single global stylesheet, imported once by the root layout.
- There is no `_buttons.scss` (`.btn` lives in `_primitives.scss`) and no `_print.scss` outside the spell recipe view. Component styling adds no hand-picked colour and no design work beyond the tokens, mixins and `_primitives.scss`.

## Known issue

`$font-heading` / `$font-body` open with a fallback-less `var(--font-display)` / `var(--font-body)`. `next/font` defines those on `<html>`, so anything rendered outside the root layout (a workshop story, a standalone render) loses its whole `font-family` declaration rather than falling back. `.storybook/typography.scss` works around it by redefining both in its own `:root`. A real fix puts the fallback inside the `var()`, as `var(--font-body, 'Lexend')`: the families trailing each stack do not rescue it, since an unresolved `var()` invalidates the whole declaration at computed-value time.

## Small shared decisions

### Contrast mixes

The faded-underline mixes 55% (resting) and 65% (pointed or focused) are the lowest that hold 3:1 against the page, the card and the `:target` fill in both themes, for a link resting in body ink and pointed at in `$accent-hover`. A link resting in another colour needs its own mixes worked out. No token holds a faded underline, so it is a `color-mix`, as `$fill-quiet` is. Chromium draws no underline under 1px and `auto` is already 1px for body text, so a fade, not a thickness, lightens an underline.

### List markers

`list-marker`: the ✦ is a drawn four-point star, not the glyph, so its centre is where it is put (a glyph nudged by a fixed offset drifts with size and line height). It sits `$centre` down from the item top (default: middle of the first line, `lh`), in the gutter of typography-base's 1.25rem indent. It is empty, so a screen reader hears no "black star", and drawn in the text colour because forced colours paint backgrounds away. `list-marker-reset` clears the size, clip and shift a drawn marker would leak.

### Whole-card links

A stretched-link card is plain ink with an empty `::after` over the card, and the ring is drawn on that overlay so it rounds the card. It is not an `<a>` around the card, which a screen reader reads whole and which cannot hold a button. `$ring: false` is for a card whose layers paint over the overlay.

### Quiet cards and figures

`.card--quiet` is a hairline surface card that takes the highlight edge and fill on hover and focus within; a whole-card link inside it uses `card-link`. `.figure` frames a screenshot or a widget in running text, at most `$measure` wide, its `figcaption` muted beneath. Both are primitives in `_primitives.scss`.

### Loading motion

`loading-appear` moves `visibility` only, so it holds under the reduced-motion pulse, which moves opacity; no piece invents its own fallback.

### Chevrons

A chevron is drawn only so a press reaches the control beneath (turned over, it paints above a stretched overlay). `$flip` flips about the horizontal edge (`rotateX`); it is eased and still under reduced motion; `$props` ease alongside.

### Entry links

An entry link's icon transforms from its inline start so nothing around it moves. The admin Compendium list's name links and the entry page's link to the Compendium use it.

### Optical corrections

Each is in `em`. `$optical-nudge` (about half a pixel, by eye) sets a mark level with the text beside it. `$back-chevron-pull` pulls the entry back link's chevron back, since the drawing starts inside its 1em box and read as an indent. `$link-hint-drop` sets a 1rem chain icon level with a link's first line. `$cap-middle` is the middle of Lexend's capitals from the top of a body line, which the details modal centres the coven shelf on. `$recency-icon-size` is larger than its small bold label so the thin rays read.

### Token aliases

- Placeholder ink is 85% into the field ground: 4.68:1 on the light field, 6.71:1 on the dark.
- Quiet fill: chip wash, skeleton bars, an entry's targeted section, a pointed MenuButton plain item, the hover of every nav link, tab and outlined chip.
- Highlight: MenuButton's primary item, account and shell menus, suggestion rows, the quiet button's field ground.
- Link ring strength: light needs more, since the accent starts lower against the page and the shared strength would fall under 3:1; the tab ring is full in light.
