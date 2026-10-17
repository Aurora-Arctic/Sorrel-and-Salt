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
| `filter`    | A `FacetPanelFilter`: the chosen values per facet, `categoryMode`, `toxic` (`''` for either) and `withoutReferences`                                                           |
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

- **Count.** `n` is the number of chosen values: every category, form, deity, zodiac
  sign, planet and element counts one, plus one for a Toxic setting other than Any and
  one for No Refs when on. Two categories and two forms read 4. Match counts nothing:
  it is a mode of the categories, not a filter (owner, 2026-10-17).
- **Two ways to open.** The width is read when the button is pressed, against the
  shell's tablet width (`56rem`, the same as `$shell-tablet-width`). At that width and
  up it opens with `show()`: over the results, no scrim, the page still usable, sliding
  down by `useSlide` (`src/lib/use-slide.ts`; grid rows 0fr to 1fr, and reduced motion
  snaps). Below it, `showModal()`: a right-hand drawer with the browser's backdrop,
  inert page and Escape, and no slide.
- **Focus.** Opening focuses the dialog. Closing returns focus to the button when it
  was inside the panel.
- **Escape.** A non-modal panel closes on Escape, except an Escape that a combobox
  popup used (`defaultPrevented`), which closes only the popup. A modal sheet's Escape
  is the browser's and ends in the dialog's `close` event, which snaps the state shut.
- **Held, then applied.** A change in the open panel goes to `onChange` and nowhere else, since the panel covers the results. Every shut calls `onApply` once (a shut that follows a shut calls nothing). Apply Filters is the form's submit, which applies everything, so it only shuts the panel without calling `onApply` again. A modified click on a Clear All link (new tab) still follows the link.
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
  Match and No Refs; Forms with Toxic; Planets and Zodiac; Deities and Elements; then
  the foot. Match shows only for two or more categories, and carries an InfoTip saying what All and Any mean. Match and Toxic stand at the top of their neighbour's field and are a control's height: the group's own margin is zeroed in a row, the legend takes the label's weight, and the bar is a control tall. A tip in the panel opens below its label, not above as elsewhere, because the clip ends at the first row and would cut an upward tip; on the wide panel, where Match stands at the row's right-hand end, it also hangs from the icon's right edge and opens leftward. An e2e test checks the open tip lies inside the panel at 1280 and 375.
- **Counts** show on every option, on the Toxic segments, on each chosen chip and on
  No Refs' label. A value with a count of 0 is hidden in every facet except Toxic, whose three segments always show with their counts; when Toxic or Not Toxic is 0 the Toxic field selects Any, is disabled as a whole and carries an InfoTip saying every matching entry shares the same toxicity, so it cannot narrow further. Elsewhere a zero is hidden unless it is chosen: a chosen one stays as a removable chip, and a facet with no value left keeps its field with an empty list (`FacetCombobox`).
- **The sheet's foot is sticky**, with scroll padding so a focused control is never
  hidden behind it (WCAG 2.4.11).
- **Chips come out only by their cross**, inside the panel.

## Not here

The GET form, the address state and the debounce that applies a change are the
caller's (`CompendiumList`'s filter). The panel does not read the address.
