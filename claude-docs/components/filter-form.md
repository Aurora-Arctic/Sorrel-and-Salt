# FilterForm

`src/components/FilterForm/` — a list's filter form: the fields the caller
supplies, then a Filter button that opens the filtered list from its first
page. Five admin lists (CompendiumList, GroupedValueList, the flat
vocabularies' list it has since absorbed, UserList, PrivilegeLedger) each
wrote this form for themselves until MB.115; three navigated softly with a spinner, two with a
full page load and none.

## Props

`FilterFormProps` (`types.ts`):

| Prop         | What it is                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------- |
| `label`      | The form's accessible name, title case: "Filter Users"                                       |
| `action`     | The page itself, which the form submits to natively before hydration                         |
| `href`       | Builds the filtered list's address from the caller's field state, usually through `listHref` |
| `disabled`   | The caller's "nothing changed": true while the form matches the filter the page shows        |
| `navigation` | `soft` or `full`, below                                                                      |
| `children`   | The fields, each with the `name` the page reads                                              |

## Contracts

- **It works before hydration.** The form is `method="get"` to `action`, so
  a press before the script loads still submits, each field under its own
  `name`. A field must therefore submit something the page reads as the same
  filter: a blank `<select>` option as `role=`, a checkbox as `awaiting=` or
  `withoutReferences=1`.
- **Filter is offered only when something changed** (MB.53, the owner's
  word): the caller works out `disabled` from its own state, and Filter is a
  real `disabled` attribute then, since a submit with nothing to send has
  nothing to do. Enter in a field is refused the same way.
- **Filter is busy until the list arrives**, as a `BusyButton`
  ([`busy-button.md`](busy-button.md)) reading "Filtering":
  - `soft` pushes the address inside a React transition, so the button is
    busy until the new page has rendered.
  - `full` is `window.location.assign`, a whole page load, which runs the
    admin layout's guard again as `Pager`'s plain anchors do
    ([`pager.md`](pager.md)). The button is busy from the press until the
    browser leaves, and a `pageshow` from the back-forward cache (the browser
    restoring a page it kept whole) clears it.
- **The fields are the caller's.** Their state, their labels and what counts
  as a change stay in the list that knows them; this holds the form, the
  button and the navigation.
- **It is a `<search>` landmark**, named by `label`, so a screen reader lists
  it beside the page's other regions.

## Styling

None of its own: the form is `.filter-row` ([`styling.md`](../styling.md),
"Form fields"), the row the five lists' `__search` rules were, and the
fields and button are the primitives'.

## Stories

[`index.stories.tsx`](../../src/components/FilterForm/index.stories.tsx),
`Forms / Filter Form`: `Default`, a name and a group as a value list's filter
has them, with `PhoneDark` and `PhoneLight`. Type a name to offer Filter.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 6): a filter's spinner and reset are tested once, in
`CompendiumList`, and each list asserts the address its filter builds.
