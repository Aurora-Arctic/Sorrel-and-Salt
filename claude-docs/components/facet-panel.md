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

- **Count.** `n` is the number of facets holding a value (categories, forms, deities,
  zodiac, planets, elements), plus one for a Toxic choice and one for No Refs when on.
  This follows the signed-off prototype's `filterCount`: the number of facets in use, a facet
  with several values counting once.
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
- **Crossing the tablet width** closes the panel at once, since it would otherwise
  change from an overlay to a sheet under the person's hands.
- **The clip never scrolls** (`onScroll` puts `scrollTop` back to 0), so a focus
  moving into a part still hidden by the slide cannot shift the panel.
- **Before hydration** the dialog renders with `open`, inline, at every width, with
  no Close, and the Filters control is a link to it. The controls submit through the
  surrounding GET form: each combobox as its native select, Match and Toxic as radios,
  No Refs as a checkbox valued `1` (the value the parameter table reads), and categories as
  a native `<select multiple name="categories">` in optgroups by group (`NativeCategories`;
  a zero-count option is disabled unless chosen). Once hydrated, `CategoryPicker` replaces
  it and a chosen category travels as a hidden `categories` input. Once the script runs, React removes `open`, so the
  panel collapses; that is a shift above the results, which the caller should keep
  below the fold of what the visitor is reading.
- **Source order is visual order**, with no CSS `order`. The rows are Categories with
  Match and No Refs; Forms with Toxic; Planets and Zodiac; Deities and Elements; then
  the foot. Match shows only for two or more categories.
- **Counts** show on every option, on the Toxic segments, on each chosen chip and on
  No Refs' label. A zero is disabled and listed last (`FacetCombobox`).
- **The sheet's foot is sticky**, with scroll padding so a focused control is never
  hidden behind it (WCAG 2.4.11).
- **Chips come out only by their cross**, inside the panel.

## Not here

The GET form, the address state and the debounce that applies a change are the
caller's (`CompendiumList`'s filter). The panel does not read the address.
