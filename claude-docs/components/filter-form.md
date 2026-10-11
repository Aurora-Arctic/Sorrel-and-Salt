# FilterForm

`src/components/FilterForm/` — a list's filter form: the fields the caller
supplies, then a Filter button that opens the filtered list from its first
page, and a Clear link that opens it with no filter. Five admin lists (CompendiumList, GroupedValueList, the flat
vocabularies' list it has since absorbed, UserList, PrivilegeLedger) each
wrote this form for themselves until MB.115; three navigated softly with a spinner, two with a
full page load and none. GroupList's name search on the traditions, added at
MB.115's review, is a sixth user ([`group-list.md`](group-list.md)). It renders inside its list's
[`ListFrame`](list-frame.md), which runs its navigation.

## Props

`FilterFormProps` (`types.ts`):

| Prop         | What it is                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------- |
| `label`      | The form's accessible name, title case: "Filter Users"                                       |
| `action`     | The page itself, which the form submits to natively before hydration                         |
| `href`       | Builds the filtered list's address from the caller's field state, usually through `listHref` |
| `disabled`   | The caller's "nothing changed": true while the form matches the filter the page shows        |
| `shown`      | Each value of the filter the page shows, for Clear                                           |
| `draft`      | Each value the fields hold now, applied or not, for Clear                                    |
| `onClear`    | Empties every field the caller holds, for Clear with nothing applied                         |
| `navigation` | `soft` or `full`, below                                                                      |
| `children`   | The fields, each with the `name` the page reads                                              |

## Contracts

- **It works before hydration.** The form is `method="get"` to `action`, so
  a press before the script loads still submits, each field under its own
  `name`. A field must therefore submit something the page reads as the same
  filter: a blank `<select>` option as `role=`, a switch, a native checkbox
  beneath (`SwitchField`, [`field.md`](field.md)), as `awaiting=` or
  `withoutReferences=1`. A field that is a script's control, the curated
  lists' type-ahead group, is drawn as a native control by the server and
  swapped once hydrated, so the press before the script still sends it
  (`GroupedValueList`, MB.115).
- **Filter is offered only when something changed** (MB.53, the owner's
  word): the caller works out `disabled` from its own state, and Filter is a
  real `disabled` attribute then, since a submit with nothing to send has
  nothing to do. Enter in a field is refused the same way.
- **While the new list reads, the row is off and the list is a skeleton**
  (the owner's call at MB.115's review: "Filters should trigger the same
  type of loading state as tabs"). Filter and Clear navigate
  through the list's `ListFrame` ([`list-frame.md`](list-frame.md)), whose
  body shows the tabs' skeleton in place of the table and the pager, its
  one status, until the new list renders. Meanwhile the form is
  `aria-busy`, as the tab row is, and every control in it is
  `aria-disabled`: Filter and Clear by their own props, the
  caller's fields by a layout effect that marks each `input` (not a
  hidden one), `select`, `textarea`, `button` and `a[href]` in the form
  and unmarks it after. `aria-disabled` rather than `disabled`, as the
  tabs use it, so a focus in a field or on Filter stays where it was rather
  than falling to the page. The same effect refuses, in the capture phase,
  every key but Tab, every press, every edit, paste and drop, so nothing in
  the row changes, and a submit, Enter included, is refused while a list is
  on its way, so there is no second request.
  - `soft` pushes the address inside the frame's transition, pending
    until the new page has rendered.
  - `full` is `window.location.assign`, a whole page load, which runs the
    admin layout's guard again as `Pager`'s plain anchors do
    ([`pager.md`](pager.md)). The row is off and the skeleton shows from
    the press until the browser leaves, and a `pageshow` from the
    back-forward cache (the browser restoring a page it kept whole) brings
    the list back.

  Neither control shows a spinner of its own any more: the skeleton is the
  loading state, and its status the one a screen reader hears. Typing in a
  field navigates nowhere and shows nothing.

- **Clear clears whatever is set** (the owner's calls at MB.115's
  review), after Filter in the row: a filter on the address, or a value in a
  field not yet applied. It is a link, not a submit: its
  address is `action`, the page itself with no query, so every filter
  parameter and the cursor go, and so does a modal's (`?edit=`, `?new`),
  and it works before hydration as a plain address. It is `.btn--quiet`,
  the row's secondary control, since it changes no data, as the pager's are.
  With JavaScript and a filter shown, a plain left click navigates as
  Filter does, `soft` or `full`, and the fields come back empty with the
  unfiltered page; the row is off and the list a skeleton meanwhile, as
  for Filter; a click for a new tab
  or window is left to the browser. With no filter shown but a field
  holding something, a press empties the fields where they are and
  navigates nowhere: the caller's `onClear` empties its state, and the
  fields are drawn again, so a type-ahead's own text goes too, even text
  naming no choice, which is no value; the focus goes to the first field,
  since the pressed link then has nothing to do, and Filter is left with
  nothing to apply. It is offered while any of `shown` or of `draft` is
  set, a non-blank string or `true`, so a blank name box, an "All …"
  choice and a switch that is off count as none. Each list passes its values
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
its own width the query takes the whole line and the selects and switches
wrap beneath it, the owner's call at MB.115's review over a filter folded
behind a disclosure. Filter and Clear are one block, `.filter-row__actions`,
so they wrap together, and on that narrow row they take a line of their own
at the fields' full width, Filter two thirds and Clear one; once a third is
too narrow for Clear's label (`$filter-clear-width`, 5.5rem, three times over
and the gap) they take half each (the owner's calls).

**The row while a list is on its way** is `.filter-row[aria-busy='true']`,
in the primitives under `body` so it outweighs the fields' own hover in
the app: every field faded to 55% with its colour taken out
(`grayscale`) and the not-allowed cursor, as the tab row's tabs are, and a
field's hover changing nothing. Filter and Clear are left out of the
fade, since `.btn[aria-disabled='true']` already draws them dashed and
faded, and faded twice they would all but vanish.

**An on-or-off filter is a switch**, `SwitchField` ([`field.md`](field.md)):
a `.field` like the rest, its label above and the slide toggle beneath at
`$control-height`, so it stands level with the boxes and selects beside it
at desktop width and in the stacked row. The owner's call at MB.115's
review, over a checkbox with its name beside it, which looked out of place
in the row. While a list is on its way the row's `aria-disabled` on the
toggle stops its hover and press look, and the row's fade greys it as it
does the other fields.

**A type-ahead field takes one width.** A field typed into once hydrated
and drawn as a native `<select>` before, as the curated lists' Group and
Tradition are, puts `filter-row__typeahead` on its `.field` block
(`FieldShell`'s `className`, [`field.md`](field.md)). The block then
stands at `$filter-choice-width`, 14rem on the owner's call: most names
fit, and the longest seeded one, "Anglo-Saxon & Continental Germanic", runs
on inside the box while its option in the list is drawn whole. The select and the type-ahead each fill it, so hydration
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
has them, with `PhoneDark` and `PhoneLight`, Clear off; type a name to
offer Filter. `Filtered`, with `FilteredPhoneDark` and `FilteredPhoneLight`, a
page showing a filter, Clear offered. Each sits in a `ListFrame`, whose
navigation it needs; the workshop's router goes nowhere, so a press shows
nothing on its way here. The row greyed over a list on its way is
GroupedValueList's `CategoriesPending`, `PendingPhoneDark` and
`PendingPhoneLight`.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 6): a filter's loading state and reset are tested once, in
`CompendiumList`: Filter pressed puts a status in place of the table,
marks the form `aria-busy` and every control `aria-disabled`, refuses a
second press or submit, and gives the list back once the page arrives;
typing does none of it. Each list asserts the address its filter builds.
Clear is tested there too, its address, its disabled state, its
soft navigation with the list's status and its in-place emptying, the
type-ahead included; each other list asserts which of its values offer it
and that its fields empty in place, and `UserList` its full load: the
status and the row off from the press, a field press changing nothing, and
the list back on a `pageshow` from the cache.
