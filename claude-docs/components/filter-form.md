# FilterForm

`src/components/FilterForm/` — a list's filter form: the fields the caller
supplies, then a Filter button that opens the filtered list from its first
page, and a Clear Filters link that opens it with no filter. Five admin lists (CompendiumList, GroupedValueList, the flat
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
| `shown`      | Each value of the filter the page shows, for Clear Filters                                   |
| `draft`      | Each value the fields hold now, applied or not, for Clear Filters                            |
| `onClear`    | Empties every field the caller holds, for Clear Filters with nothing applied                 |
| `navigation` | `soft` or `full`, below                                                                      |
| `children`   | The fields, each with the `name` the page reads                                              |

## Contracts

- **It works before hydration.** The form is `method="get"` to `action`, so
  a press before the script loads still submits, each field under its own
  `name`. A field must therefore submit something the page reads as the same
  filter: a blank `<select>` option as `role=`, a checkbox as `awaiting=` or
  `withoutReferences=1`. A field that is a script's control, the curated
  lists' type-ahead group, is drawn as a native control by the server and
  swapped once hydrated, so the press before the script still sends it
  (`GroupedValueList`, MB.115).
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
- **Clear Filters clears whatever is set** (the owner's calls at MB.115's
  review), after Filter in the row: a filter on the address, or a value in a
  field not yet applied. It is a link, not a submit: its
  address is `action`, the page itself with no query, so every filter
  parameter and the cursor go, and so does a modal's (`?edit=`, `?new`),
  and it works before hydration as a plain address. It is `.btn--quiet`,
  the row's secondary control, since it changes no data, as the pager's are.
  With JavaScript and a filter shown, a plain left click navigates as
  Filter does, `soft` or `full`, and the fields come back empty with the
  unfiltered page; the link is busy the same way, a spinner and "Clearing
  Filters" with `aria-busy`, while Filter is disabled; a click for a new tab
  or window is left to the browser. With no filter shown but a field
  holding something, a press empties the fields where they are and
  navigates nowhere: the caller's `onClear` empties its state, and the
  fields are drawn again, so a type-ahead's own text goes too, even text
  naming no choice, which is no value; the focus goes to the first field,
  since the pressed link then has nothing to do, and Filter is left with
  nothing to apply. It is offered while any of `shown` or of `draft` is
  set, a non-blank string or `true`, so a blank name box, an "All …"
  choice and an unticked check count as none. Each list passes its values
  and this one place decides. Before hydration the fields hold the filter
  shown, so the server's link is offered for that alone and is the plain
  address, which empties every field on load. With nothing to clear it is
  **disabled, not hidden**: an anchor with no address, `aria-disabled` and `role="link"`,
  as the pager's end with no page is. The owner's rule is that a control with
  nothing to do is disabled, as Filter is with nothing new to send, and a
  disabled control keeps its place, so nothing in the row moves when a
  filter is applied or cleared.
- **The fields are the caller's.** Their state, their labels and what counts
  as a change stay in the list that knows them; this holds the form, the
  two controls and the navigation.
- **It is a `<search>` landmark**, named by `label`, so a screen reader lists
  it beside the page's other regions.

## Styling

None of its own: the form is `.filter-row` ([`styling.md`](../styling.md),
"Form fields"), the row the five lists' `__search` rules were, and the
fields and button are the primitives'. On a phone the row stacks: under 28rem of
its own width the query takes the whole line and the selects, checks,
Filter and Clear Filters wrap beneath it, Clear Filters beside Filter or
under it as the width allows, the owner's call at MB.115's review over a filter
folded behind a disclosure.

**A type-ahead field takes one width.** A field typed into once hydrated
and drawn as a native `<select>` before, as the curated lists' Group and
Tradition are, puts `filter-row__typeahead` on its `.field` block
(`FieldShell`'s `className`, [`field.md`](field.md)). The block then
stands at `$filter-choice-width`, 24rem, room for the longest seeded name,
"Anglo-Saxon & Continental Germanic", beside the clear, separator and
chevron, and the select and the type-ahead each fill it, so hydration
moves nothing. It gives way on a narrower row, and under 28rem takes the
whole line, as the query does. It is an opt-in rather than a rule on every
select in the row, since before hydration the type-ahead's select is
markup-for-markup a plain select such as the user list's Role, which keeps
its own width. The clear inside the type-ahead keeps its room while hidden
([`combobox.md`](combobox.md)), so typing does not change the width
either.

## Stories

[`index.stories.tsx`](../../src/components/FilterForm/index.stories.tsx),
`Forms / Filter Form`: `Default`, a name and a group as a value list's filter
has them, with `PhoneDark` and `PhoneLight`, Clear Filters off; type a name to
offer Filter. `Filtered`, with `FilteredPhoneDark` and `FilteredPhoneLight`, a
page showing a filter, Clear Filters offered.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 6): a filter's spinner and reset are tested once, in
`CompendiumList`, and each list asserts the address its filter builds.
Clear Filters is tested there too, its address, its disabled state, its
busy soft navigation and its in-place emptying, the type-ahead included;
each other list asserts which of its values offer it and that its fields
empty in place, and `UserList` its full load.
