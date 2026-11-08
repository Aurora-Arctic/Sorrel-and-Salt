# FacetPanel

`src/components/FacetPanel/` holds the Filters button and the panel of facets it opens. It is a client component. The layout is recorded in [`design-decisions/ingredients.md`, "How the search filters sit together"](../design-decisions/ingredients.md#how-the-search-filters-sit-together). Props are in `src/components/FacetPanel/types.ts`.

## Contracts

### Parts

- **`FacetShell`** (`shell.tsx`) is the Filters button with its count, the quiet Clear All, and the dialog with its head and foot. It owns every contract below on opening, closing and applying. Its facets are its `children`.
- **`CategoryLine`** is the Categories line, the picker and its Match chip, shared by every list's filters. Its `noun` names what Match's tip counts. A choice without a `count` shows with no number and is never hidden as a zero.
- **`FacetPanel`** is the ingredient content inside `FacetShell`. The grimoire's filter is `FacetShell` holding `CategoryLine` alone, without counts ([`grimoire-list.md`](grimoire-list.md)).
- A list takes `FacetShell` once it has more than three filter fields, its search counted, because the drawer keeps the row to a search box and one button however many fields the list adds. Three or fewer stay inline in [`FilterForm`](filter-form.md). The admin Invitation Cards list is one ([`admin-cards.md`](admin-cards.md)).

### Props and wiring

- The parent lays out the Filters control and Clear All link, and must be `position: relative`, because the dialog opens just under it. The parent also owns the `<form>`: the panel draws fields and hidden inputs only, and Apply Filters is the form's submit. The GET form, the address state and the debounce that applies a change are the caller's. The panel does not read the address.
- `onChange` fires once hydrated, on every change, with a patch of only the part that changed. `onApply` fires once when the panel shuts by any route. `onClear` replaces following either Clear All link, once hydrated: the caller clears and applies at once, and the panel shuts if it was open.
- `admin` shows the Hidden, No Refs and No Form switches and the Reviewed chip, each only when the filter carries its value.
- `loading`: every chosen chip holds a placeholder where its count will be, except In My Covens, which has no counts (`counts={false}`).
- **In My Covens** is offered by `covens` in the right half of the Forms line, with a **Covens** choice chip beside it (In or Not In, submitting `covensNot=1` for Not In). Removing the last picked coven reports `{ covens: [], covensNot: false }`; Not In chosen with none picked still holds. Left out or empty (the admin and coven lists, a visitor, an account in no coven), neither is drawn.
  - A pick counts toward Filters (n). Not In counts one only with no coven picked, when it is a filter of its own. With covens picked it is a mode of them, as Match is of the categories, and counts nothing.
  - A coven whose `paused` is set is listed last and disabled, with a second line from `pauseNote` (`src/lib/pause-note.ts`): the narrowed read drops a coven the viewer cannot read, so picking it would filter nothing.

### Order, count and sort

- **The panel sorts nothing.** Every facet lists its values in the order the repository read gives, never by count ([`design-decisions/ingredients.md`, "How each search facet sorts its values"](../design-decisions/ingredients.md#how-each-search-facet-sorts-its-values)).
- **Count.** `n` is the number of chosen values: each category, form, deity, zodiac sign, celestial body and element counts one, plus one for a Toxic setting other than Any, one each for Hidden, No Refs and No Form when on, one for a chosen Reviewed setting, and one each for the coven's Source, In Stock and Low Stock Only when chosen. Match counts nothing: it is a mode of the categories, not a filter.
- **Source order is visual order**, with no CSS `order`. The rows are Categories with Match beside it; the small controls on one wrapping row (Toxic, then Source, In Stock and Low Stock Only where offered, then No Refs for the admin); Forms; Celestial Bodies and Zodiac; Deities and Elements; then the foot.

### Opening and closing

- **Two ways to open.** The width is read when the button is pressed, against `56rem`, which must equal `$shell-tablet-width`. At that width and up it opens with `show()`: over the results, no scrim, the page still usable, sliding down by `useSlide` (`src/lib/use-slide.ts`). Below it, `showModal()`: a right-hand drawer with the browser's backdrop, inert page and Escape. Reduced motion, or no `matchMedia`, closes at once and snaps the slide.
- **Crossing the tablet width** closes the panel at once, since it would otherwise change from an overlay to a sheet under the person's hands.
- **Under a stuck row.** The panel opens inside the search row's form, so it travels with the stuck row ([`ingredient-search.md`](ingredient-search.md)) and always opens under it. At the tablet width and up, a panel taller than the room below the row is capped at the window's height less the offset and the row, and scrolls inside itself.
- **Focus.** Opening focuses the dialog. Closing returns focus to the button when it was inside the panel.
- **Escape.** A non-modal panel closes on Escape, except an Escape that a combobox popup used (`defaultPrevented`), which closes only the popup. A modal sheet's Escape (`cancel`) is held back and taken through the slide; the dialog's `close` event, which the browser raises on any other close, snaps the state shut.
- **Held, then applied.** A change in the open panel goes to `onChange` and nowhere else, since the panel covers the results. Every shut calls `onApply` once, as it starts; a shut that follows a shut, or comes during the sheet's slide out, calls nothing. Apply Filters is the form's submit, which applies everything, so it only shuts the panel. A modified click on a Clear All link (new tab) still follows the link.
- **A press outside shuts it.** While the non-modal panel is open, a `pointerdown` outside it shuts it and calls `onApply`. The Filters button and the bar's Clear All are left to their own handlers, so nothing applies twice. On the modal sheet the page is inert and the backdrop is the dialog's own box, so a press whose target is the dialog itself shuts it. The sheet fills the screen below 32rem, so a narrow phone has no backdrop to press on; Close and Escape remain.
- **Chips come out only by their cross**, inside the panel.

### The modal sheet

- Below the tablet width the dialog is `position: fixed` as a modal dialog is by default, not the overlay's absolute, because an absolute box translated past the right edge widens the page, which then scrolls sideways.
- Its foot is sticky, with scroll padding so a focused control is never hidden behind it (WCAG 2.4.11).
- It slides in from the right edge and back out to it, a slide rather than a fade because a drawer comes from its edge, while the backdrop fades as a `Modal`'s does. The way in is CSS alone, `@starting-style`. The way out is `.is-closing`, which the component sets and waits on (the dialog's `transitionend` for `transform`, or a net) before calling `close()`. The backdrop's `opacity` end reaches the dialog too and is not the one it waits on.
- `$sheet-slide` is longer than a dialog's fade because the sheet travels its own width. `shell.tsx` waits up to `LEAVE_LIMIT_MS` (400ms), which must stay longer.

### The slide's clip

- **No scrollbar while it slides.** Once open, `.facet-panel__inner` scrolls. The `--open` class arrives as the slide starts, and a box still shorter than its content would show a scrollbar for the whole opening. A `facet-panel-rolling` animation, as long as the slide (`--slide-ms`), holds `overflow: clip` and the scroll applies when it ends. Closing drops the class, so the box is clipped again from the first frame. A browser that cannot animate `overflow` shows the bar through the slide.
- **The panel's top never moves while it opens.** Opening a dialog runs the browser's focus step, which scrolls its first control into view, and an `overflow: hidden` box can be scrolled that way, so the content would slide up in a still-short panel and fall back as it grew. `.facet-panel__inner` is therefore `overflow: clip` (with `hidden` declared just before it as the older browsers' fallback), which cannot scroll at all; `onScroll` on the clip still puts `scrollTop` back to 0 as a net. `tests/e2e/admin-compendium.spec.ts` samples the top every frame of a real slide.

### Before hydration

- The dialog renders with `open`, inline, at every width, with no Close, and the Filters control is a link to it. The controls submit through the surrounding GET form: each combobox as its native select, Match and Toxic as radios, No Refs as a checkbox valued `1`, and categories as a native `<select multiple name="categories">` in optgroups (`NativeCategories`; a zero-count option is left out unless chosen). Once hydrated, a chosen category travels as a hidden `categories` input.
- React then removes `open`, so the panel collapses. It is not seen opening first: the root layout's pre-paint script (`src/app/pre-paint-scripts.tsx`) sets `data-js` on `<html>` before first paint, and `[data-js] .facet-panel--static` is `display: none`. Hidden is not removed, so the controls still submit if the form is sent before hydration. Without JavaScript the attribute never lands and the panel stays.

### Layout and controls

- **Match** always shows, to the right of Categories. With fewer than two categories it rests on All (the held `categoryMode` is kept, and the address drops it below two), draws dashed with no hover like the stuck Toxic, and its hint says Match applies once two or more categories are chosen. Match's hint has no ⓘ: it shows in the tip bubble when the pointer is on the chip, or its summary has focus while enabled, and stays hidden while the chip's menu is open.
- **The Forms line.** On the public compendium, where Toxic is the line's only chip, the line is halved from the tablet width up for an observer with covens: Forms growing beside Toxic on the left, In My Covens growing beside its In / Not In choice on the right. With no covens there is no right half, and Forms and Toxic take the line as on the other panels. On a phone the line stacks Forms, Toxic, In My Covens. The admin and coven panels keep Forms growing beside their chips.
- **The Reviewed chip** is drawn only when `admin` is set, `filter.reviewed` is defined and `facets.reviewed` holds the counts, which the service gives a curator or a keeper alone. Its radios submit the address's own spelling, `1` and `0`, so the form works before hydration. Like Toxic, when either count is 0 it rests on Any, is disabled, and its hint says every matching entry has the same review mark.
- **The Hidden switch** is drawn when `admin` is set and `filter.hidden` is defined, and counts one on the Filters button when on.
- **The coven's controls** are optional parts of the filter, shown only when the caller sets them. `filter.source` (`''` for both, `local` or `compendium`) draws the Source chip; `filter.inStock` and `filter.lowStockOnly` draw switches valued `1`, as No Refs is. A compendium panel sets none and draws none. Their counts come from `facets.source`, `facets.inStock` and `facets.lowStockOnly`, all optional on `CompendiumFacetCounts`: a missing count leaves the label bare. `covenFacetCounts` (`CompendiumList/facets.ts`) maps a coven's answer to them; the live counts come from `useLiveFacets` given a `workspaceId`; the parameter table is `COVEN_PARAMS` (`IngredientSearch/coven-params.ts`); the page that mounts them is the coven's Ingredients page ([`coven-cards.md`](coven-cards.md)).
- **Compact scale.** `.facet-panel--compact` sets every input shorter than the app's forms, through `--facet-control` (2.5rem), a custom property so the workshop can compare scales. Labels, option text and counts keep their size, and every target stays over 24px (WCAG 2.5.8). The rules sit only under the panel, so every other form keeps `$control-height`.
- **Tips inside the panel** open below their label, not above as elsewhere (`--tip-placement: bottom`, read by `useTip`), because the panel's clip ends at the first row's top edge: a placed tip is fixed and never clipped, but one above Match would cover the panel's own header. The panel is its `data-tip-boundary`, so a tip at a row's right-hand end shifts back inside; where there is no room below, the tip flips. An e2e test checks the open tip lies inside the panel at 1280 and 375. A chip's tip is anchored on `.facet-chip__bar`.

### Choice chips and counts

- **`ChoiceChip`** (`choice-chip.tsx`) is a pill that opens a menu of radios; Match, Toxic and Source use it, and so does the admin Support page's Sender chip. An option's `display` node is drawn in place of its `label` in the menu and on the chosen chip; the `label` still names the radio, so the accessible name does not change.
- It is a native `<details>`, so it opens before the script runs. Before hydration the pill's text does not follow a pick; the radios still submit.
- A chip that cannot narrow (Match below two categories, Toxic or Source when every entry shares one answer) is a disabled button with no radios, inside a disabled fieldset, so it takes no focus and submits nothing. Its hint (`chipHint`, no ⓘ) shows when the pointer is on the chip. A disabled button has `pointer-events: none`, so the hover is taken on `.facet-chip__bar` around it, and the fieldset's `aria-describedby` is how assistive tech reads it. Source's ordinary hint (not stuck) is still an InfoTip beside the chip.
- **As a form field** (the help form's Kind and Audience) a chip takes three more props. An option's `disabled` keeps it in the menu but stops it being chosen. `note` is a line under the chip, always visible. `error` is a message under the chip that sets `aria-invalid` on the group and its radios and gives the face the invalid edge. The note and the error join any hint in the group's `aria-describedby`.
- **A chip menu is never clipped.** The slide needs its clip, and a menu is wider than its chip, so a chip at a row's end would open past the panel's right edge and be cut. Which chip ends a row changes with the panel and the width, so CSS alone cannot say. `ChoiceChip` measures each time the menu opens: if the chip's left edge plus the menu's width passes the right edge of the nearest clipping ancestor, it adds `facet-chip__menu--end` and the menu opens leftward. Before hydration the menu stays left-aligned. `tests/e2e/admin-compendium.spec.ts` opens the public panel's Toxic menu at 1280 and 390 and checks it lies inside the panel.
- **Zero counts.** A value with a count of 0 is hidden in every facet except Toxic, whose three options always show. Elsewhere a zero is hidden unless it is chosen: a chosen one stays as a removable chip, and a facet with no value left keeps its field with an empty list (`FacetCombobox`). When Toxic or Not Toxic is 0, the Toxic chip selects Any, is disabled and carries a hint saying every matching entry shares the same toxicity. The Source chip follows the same rule: when Local or Compendium counts 0 it rests on All, is disabled, submits no `source`, and its hint (which replaces the ordinary one while stuck) says every matching entry comes from the same source. A held `source` still counts on the Filters button, as a held Toxic does.

## Styling

Tokens only. The choice chip (`.facet-chip__*`) and a count (`.facet-panel__count`) have their own `choice-chip.scss` and `facet-count.scss`, each imported by its component, so a chip drawn outside the panel, as on the admin support page, is styled without the panel's stylesheet. Four measurements stay as named, commented locals because no token fits: the categories floor and wide width, the compact control height, the native select's cap and the form's quarter-em gap.

- The `WIDE` constant (`56rem`) is exported from `index.tsx` (from `shell.tsx`), and a test guards it against the Sass `$shell-tablet-width`.
- **Forced colours.** The switches and the chip menu's radios take the `.switch` and `.radio` primitives' forced-colours rules ([`styling.md`](../styling.md)). The choice chip's hover and open fills are dropped, so hover turns its border `Highlight`, an open chip fills `Highlight` with `HighlightText` ink, and a disabled chip is `GrayText` in ink and border, keeping its dashed edge.

## Testing

Tests are in `tests/components/FacetPanel/index.test.tsx` (the shell and the Categories line are proved through it) and, for the grimoire's use of the shell, `tests/components/GrimoireList/index.test.tsx`. The panel's placement under the search row is proved in the compendium page specs.
