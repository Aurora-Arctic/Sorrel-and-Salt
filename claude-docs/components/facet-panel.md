# FacetPanel

`src/components/FacetPanel/` — the Filters button and the panel of facets it opens
(M12.4). The button reads "Filters (3)" once something is chosen, with a quiet Clear
All link beside it. The panel holds every facet of the compendium search: categories,
forms, planets, zodiac, deities, elements, toxic, and for an admin the No Refs switch.
A client component. The layout was signed off in
[`m12.4-filter-layout`](../design-decisions/m12.4-filter-layout.md).

## Props

`FacetPanelProps` (`types.ts`):

| Prop        | What it is                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `facets`    | The `CompendiumFacetCounts`: every facet's choices with their counts                                                                                                           |
| `filter`    | A `FacetPanelFilter`: the chosen values per facet, `categoryMode`, `toxic` (`''` for either) and `withoutReferences`, and for a coven `source`, `inStock` and `lowStockOnly`   |
| `onChange`  | Called once hydrated, on every change, with a patch of only the part that changed. The caller holds it; the panel applies nothing itself                                       |
| `onApply`   | Called once when the panel shuts, by any route: the Filters button, Escape, Close, the sheet's own Escape or the width changing. The caller applies what it holds, if anything |
| `onClear`   | Called by either Clear All link instead of following it, once hydrated. The caller clears what it holds and applies at once; the panel shuts if it was open                    |
| `admin`     | Shows the No Refs switch. The public and coven lists leave it off                                                                                                              |
| `loading`   | A search is on its way: every chosen chip holds a placeholder where its count will be                                                                                          |
| `clearHref` | Where both Clear All links go: the list with nothing chosen                                                                                                                    |
| `className` | Added to the dialog's own class                                                                                                                                                |

The component returns a fragment: the Filters control, the Clear All link and the
dialog. The parent lays the first two out and must be `position: relative`, because
the dialog opens just under it. The parent also owns the `<form>`: the panel draws
fields and hidden inputs only, and its Apply Filters button is the form's submit.

## Contracts

- **Under a stuck row (2026-10-19).** The search row sticks to the top once scrolled to
  ([`ingredient-search.md`](ingredient-search.md)), and the panel opens inside its form, so it
  travels with the row and always opens under it. At the tablet width and up, an open panel
  taller than the room below the row is capped at the window's height less the offset and the
  row, and scrolls inside itself. The phone sheet is full height already and is unchanged.

- **Count.** `n` is the number of chosen values: every category, form, deity, zodiac
  sign, planet and element counts one, plus one for a Toxic setting other than Any and
  one for No Refs when on. Two categories and two forms read 4. Match counts nothing:
  it is a mode of the categories, not a filter (owner, 2026-10-17).
- **Two ways to open.** The width is read when the button is pressed, against the
  shell's tablet width (`56rem`, the same as `$shell-tablet-width`). At that width and
  up it opens with `show()`: over the results, no scrim, the page still usable, sliding
  down by `useSlide` (`src/lib/use-slide.ts`; grid rows 0fr to 1fr, and reduced motion
  snaps). Below it, `showModal()`: a right-hand drawer with the browser's backdrop,
  inert page and Escape. The sheet slides in from the right edge and back out to it
  (`transform`, `$sheet-slide` in the component's scss), while the backdrop fades as a
  `Modal`'s does (`$modal-fade` and `$modal-scrim` in `_variables.scss`). In is CSS
  alone, `@starting-style` as `showModal()` shows it; out is `.is-closing`, which the
  component sets and waits on (the dialog's `transitionend` for `transform`, or a 400ms
  net) before it calls `close()`. The backdrop's `opacity` end reaches the dialog too, and
  is not the one it waits on. Reduced motion, or no `matchMedia`, closes at
  once, and so does the width crossing the tablet width.
- **Focus.** Opening focuses the dialog. Closing returns focus to the button when it
  was inside the panel.
- **Escape.** A non-modal panel closes on Escape, except an Escape that a combobox
  popup used (`defaultPrevented`), which closes only the popup. A modal sheet's Escape
  (`cancel`) is held back and taken through the slide; the dialog's `close` event, which
  the browser raises on any other close, snaps the state shut.
- **Held, then applied.** A change in the open panel goes to `onChange` and nowhere else, since the panel covers the results. Every shut calls `onApply` once, as it starts (a shut that follows a shut, or comes during the sheet's slide out, calls nothing). Apply Filters is the form's submit, which applies everything, so it only shuts the panel without calling `onApply` again. A modified click on a Clear All link (new tab) still follows the link.
- **A press outside shuts it.** While the non-modal panel is open, a `pointerdown` anywhere outside it (the search box, the page) shuts it and calls `onApply`, the same path as Escape. The Filters button and the bar's Clear All are left to their own handlers, so nothing applies twice. On the modal sheet the page is inert and the backdrop is the dialog's own box, so a press whose target is the dialog itself (not anything in it) shuts it. The sheet fills the screen below 32rem, so there is no backdrop to press on a narrow phone; Close and Escape remain.
- **Crossing the tablet width** closes the panel at once, since it would otherwise
  change from an overlay to a sheet under the person's hands.
- **The panel's top never moves while it opens.** Opening a dialog runs the browser's focus step, which scrolls its first control into view, and a box with `overflow: hidden` can be scrolled that way: while the panel was still short, its content slid up and then fell back as it grew. `.facet-panel__inner` is therefore `overflow: clip` (with `hidden` declared just before it as the fallback), which cannot scroll at all; `onScroll` on the clip still puts `scrollTop` back to 0 as a net. `tests/e2e/admin-compendium.spec.ts` samples the top every frame of a real slide.
- **Before hydration** the dialog renders with `open`, inline, at every width, with
  no Close, and the Filters control is a link to it. The controls submit through the
  surrounding GET form: each combobox as its native select, Match and Toxic as radios,
  No Refs as a checkbox valued `1` (the value the parameter table reads), and categories as
  a native `<select multiple name="categories">` in optgroups by group (`NativeCategories`;
  a zero-count option is left out unless chosen). Once hydrated, `CategoryPicker` replaces
  it and a chosen category travels as a hidden `categories` input. Once the script runs, React removes `open`, so the
  panel collapses. It is not seen opening first: the root layout's pre-paint script sets `data-js` on `<html>` before first paint, and `[data-js] .facet-panel--static` is `display: none`. Hidden is not removed, so the controls still submit if the form is sent before hydration. Without JavaScript the attribute never lands and the panel stays. The mark rides in `src/app/pre-paint-scripts.tsx` beside the theme script rather than in a mechanism of its own: it has the same job, setting something on `<html>` that first paint must already see, and the same rule for existing only in the server's HTML.
- **Source order is visual order**, with no CSS `order`. The rows are Categories with
  Match beside it; the small controls on one wrapping row (`.facet-panel__small`: Toxic, then Source, In Stock and Low Stock Only where the caller offers them, then No Refs for the admin); Forms, with room beside it for the next dropdown facet (nothing is drawn there until one exists); Planets and Zodiac; Deities and Elements; then the foot. Each small control is there only where it is offered, tops level, and the row wraps on the phone sheet, which stacks the same order. Match always shows. With two or more categories it is enabled and its InfoTip says what All and Any mean; with fewer it rests on All (the held `categoryMode` is kept, and the address drops it below two, M8.12), draws dashed with no hover like the stuck Toxic, and its hint says Match applies once two or more categories are chosen. Match's hint has no ⓘ: it shows in the tip bubble when the pointer is on the chip, or its summary has focus while enabled (the owner's ask: a hover on the field, not beside it), and stays hidden while the chip's menu is open. Match and Toxic stand at the top of their neighbour's field and are a control's height: the group's own margin is zeroed in a row, the legend takes the label's weight, and the bar is a control tall. A tip in the panel opens below its label, not above as elsewhere (`.facet-panel { --tip-placement: bottom }`), and the panel is its `data-tip-boundary`, so `useTip` shifts a tip at the row's right-hand end back inside the panel. An e2e test checks the open tip lies inside the panel at 1280 and 375. A chip's tip is anchored on `.facet-chip__bar`, so it is placed against the chip. The chip's name ("Match:") is set at the caption size, smaller than its value.
- **The coven's controls (M9.7)** are optional parts of the filter, shown only when the caller sets them: `filter.source` (`''` for both, `local` or `compendium`) draws the Source choice chip (All, Local and Compendium, radios named `source`), `filter.inStock` draws the In Stock switch, named `inStock` and valued `1` as No Refs is, and `filter.lowStockOnly` (M9.8) draws the Low Stock Only switch, named `lowStockOnly` and valued `1` the same way. They sit on the row with Forms and Toxic, and each chosen one counts 1 on the Filters button. A compendium panel sets neither and draws neither. The options show their counts from `facets.source`, `facets.inStock` and `facets.lowStockOnly`, both optional on `CompendiumFacetCounts`: a count missing leaves the label bare. `covenFacetCounts` (`CompendiumList/facets.ts`) maps a coven's answer to them. The coven's live-facets path is M9.6's, so only the compendium's is wired today. The parameter table that reads them is `COVEN_PARAMS` in `IngredientSearch/coven-params.ts`; the page that mounts them is M9.6's.
- **The compact scale (M9.7).** Every input in the panel is shorter than the app's forms: `.facet-panel--compact` (always on) sets the height, in `--facet-control` (2.5rem, `$compact-control` in the panel's scss), on the comboboxes' boxes, native selects, choice chips and the switch's row; the rows' gap is space 3 rather than 4. Labels, option text and counts keep their size, colours and focus rings are the primitives' own, and every target stays over 24px (WCAG 2.5.8). Chips keep their size: they already fit a box this tall. The rules sit only under the panel, so the ingredient form and every other form keep `$control-height`.
- **Layout and the choice chip (M9.7).** Match stands to the right of Categories; Forms, Toxic, Source and In Stock (and No Refs on the admin panel) share the next line, and the compendium panels use the same arrangement. Match, Toxic and Source are `ChoiceChip`s (`FacetPanel/choice-chip.tsx`): a pill reading "Match: All" that opens a menu of radios. It is a native `<details>`, so it opens before the script runs; once hydrated it fades in and out as a Modal does (`$modal-fade`, instant under reduced motion), closes on Escape, on a press outside and when focus leaves, and closes after a pick. Before hydration the pill's text does not follow a pick; the radios still submit. A chip that cannot narrow (Match below two categories, Toxic or Source when every entry shares one answer) is a disabled button with no radios, inside a disabled fieldset, so it takes no focus and submits nothing. Its hint (`chipHint`, no ⓘ) shows in the tip bubble when the pointer is on the chip: a disabled button may swallow mouse events, so the hover is taken on `.facet-chip__bar` around it (the disabled button has `pointer-events: none`), and the fieldset's `aria-describedby` is how assistive tech reads it. Match's hint when not stuck also shows on focus of its summary. Source's ordinary hint (not stuck) is still an InfoTip beside the chip. In Stock and Low Stock Only are the panel's own `FacetSwitch`es (`SwitchField` is untouched).
- **A chip menu is never clipped (M9.7).** The panel's slide needs its clip (`overflow: clip`), and a chip menu is wider than its chip, so a chip at the end of a row (Match, Toxic, No Refs, Source) opened its left-aligned menu past the panel's right edge and the clip cut it. Which chip ends a row changes with the panel (admin, coven, public) and the width, so CSS alone cannot say. `ChoiceChip` measures each time the menu opens: if the chip's left edge plus the menu's width passes the right edge of the nearest clipping ancestor, it adds `facet-chip__menu--end`, and the scss hangs the menu from the chip's right edge (`inset-inline: auto 0`). Before hydration the menu stays left-aligned. `tests/e2e/admin-compendium.spec.ts` opens the public panel's Toxic menu at 1280 and 390 and checks it lies inside the panel.
- **Counts** are written `<FacetCount>`: a space and the number in small muted type, with no brackets, on every option, chip and switch label ("Local 18").
- **Counts** show on every option, on the Toxic options, on each chosen chip and on
  No Refs' label. A value with a count of 0 is hidden in every facet except Toxic, whose three options always show with their counts; when Toxic or Not Toxic is 0 the Toxic chip selects Any, is disabled and carries a hover and focus hint saying every matching entry shares the same toxicity, so it cannot narrow further. The Source chip follows the same rule: when Local or Compendium counts 0 it rests on All, is disabled, submits no `source`, and its hint (which replaces the ordinary one while stuck) says every matching entry comes from the same source. A held `source` is still counted on the Filters button, as a held Toxic is. Elsewhere a zero is hidden unless it is chosen: a chosen one stays as a removable chip, and a facet with no value left keeps its field with an empty list (`FacetCombobox`).
- **The sheet's foot is sticky**, with scroll padding so a focused control is never
  hidden behind it (WCAG 2.4.11).
- **Chips come out only by their cross**, inside the panel.

## Not here

The GET form, the address state and the debounce that applies a change are the
caller's (`CompendiumList`'s filter). The panel does not read the address.
