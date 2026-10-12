# FilterForm

`src/components/FilterForm/` — a list's filter form, a toolbar that applies
as it changes: the fields the caller supplies, the search box first, and a
Clear link at the row's end while the page shows a filter. A select or a
switch applies on its change, a type-ahead once a choice settles, and the
search from the magnifier at the end of its box or Enter; each opens the
filtered list from its first page. Five admin lists (CompendiumList,
GroupedValueList, the flat vocabularies' list it has since absorbed,
UserList, PrivilegeLedger) each wrote this form for themselves until MB.115;
GroupList's name search on the traditions, added at MB.115's review, and
AdminInvitations' email search are the others ([`group-list.md`](group-list.md),
[`admin-invitations.md`](admin-invitations.md)). It renders inside its
list's [`ListFrame`](list-frame.md), which runs its navigation.

The row applied on a Filter button until the owner's call at MB.115's
review (2026-10-12), which replaced four earlier calls: Filter offered only
when something changed (MB.53), Clear disabled rather than hidden, Filter
and Clear half each when alone on their line, and three lists filtering by
a full page load.

## Props

`FilterFormProps` (`types.ts`):

| Prop         | What it is                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`      | The form's accessible name, title case: "Filter Users"                                                                                              |
| `action`     | The page itself: what the form submits to natively before hydration, and the unfiltered first page Clear opens                                      |
| `searchHref` | Builds the address the search's submit opens: the filter shown with the search box's text, trimmed, from the first page, usually through `listHref` |
| `shown`      | Each value of the filter the page shows: Clear is drawn while any is set                                                                            |
| `children`   | The fields, a `SearchField` first, each with the `name` the page reads                                                                              |

Beside the component, `index.tsx` exports `useApplyFilter()`, which returns
`apply(href)`: it opens `href` softly through the list's `ListFrame` and
marks the row's focus to be given back once the list arrives. A filter's
own field handlers call it, a select's or a switch's `onChange` and a
type-ahead's `onSettle`; FilterForm calls it for the search and Clear. It
is a hook rather than a context FilterForm provides, since the filter's own
handlers render FilterForm and sit above it; `ListFrame`'s context is
already above them.

## Contracts

- **It applies on change.** The caller builds each field's address itself,
  from the filter shown with the one field changed, and the search box's
  text typed but not yet sent carried along, so a select changed after
  typing a name applies both. Typing in the search box applies nothing until
  it is submitted, and typing in a type-ahead nothing until a choice settles
  (`onSettle`, [`combobox.md`](combobox.md)): a pick, the clear, or leaving
  the box, applied when the settled choice differs from the one shown. Only
  the search text is the caller's state; a plain select is uncontrolled
  (`defaultValue` the value shown) and a switch takes `defaultChecked`
  ([`field.md`](field.md)), since the new list draws the filter again from
  what it shows.
- **The search carries its own submit**, `SearchField`'s magnifier named
  Search ([`field.md`](field.md)). It is the form's one submit button, so
  Enter in any text box submits natively, and it is always offered: the
  same text again reads the list again, which is harmless, where a submit
  disabled until something changed read as dead (the owner's call). There
  is no Filter button.
- **It works before hydration.** The form is `method="get"` to `action`, so
  a press on the magnifier before the script loads still submits, each field
  under its own `name`. A field must therefore submit something the page
  reads as the same filter: a blank `<select>` option as `role=`, a switch, a
  native checkbox beneath (`SwitchField`, [`field.md`](field.md)), as
  `awaiting=` or `withoutReferences=1`. A field that is a script's control,
  the curated lists' type-ahead group, is drawn as a native control by the
  server and swapped once hydrated, so the press before the script still
  sends it (`GroupedValueList`, MB.115). A select or a switch changed before
  hydration applies nothing until the magnifier is pressed.
- **Every filter navigates softly**, through the list's `ListFrame`
  ([`list-frame.md`](list-frame.md)): the address is pushed inside the
  frame's transition, pending until the new page has rendered. The admin
  lists that once filtered by a full page load are soft too, since every
  page under `/admin` runs the guard itself (`src/app/admin/layout.tsx`).
- **While the new list reads, the row is off and the list is a skeleton**
  (the owner's call at MB.115's review: "Filters should trigger the same
  type of loading state as tabs"). The frame's body shows the tabs' skeleton
  in place of the table and the pager, its one status, until the new list
  renders. Meanwhile the form is `aria-busy`, as the tab row is, and every
  control in it is `aria-disabled`: Clear by its own prop, the caller's
  fields by a layout effect that marks each `input` (not a hidden one),
  `select`, `textarea`, `button` and `a[href]` in the form and unmarks it
  after. `aria-disabled` rather than `disabled`, as the tabs use it, so a
  focus in a field stays where it was rather than falling to the page. The
  same effect refuses, in the capture phase, every key but Tab, every press,
  every edit, paste and drop, so nothing in the row changes, and a submit,
  Enter included, is refused while a list is on its way, so there is no
  second request. No control shows a spinner of its own: the skeleton is the
  loading state, and its status the one a screen reader hears.
- **The focus comes back once the list arrives.** The list keys its filter
  by the filter shown, so the row that applied is thrown away and a new one
  drawn. As the old row goes, FilterForm notes the place of the focused
  control among the row's controls, and the new row focuses the control at
  that place, so a switch pressed, a select changed or the magnifier pressed
  keeps the focus, and a type-ahead left by Tab hands it to the control Tab
  reached. By place rather than by id: `useId` numbers a row drawn in the
  browser afresh, while the controls stand in the same order, Clear, the one
  that comes and goes, last. A module-level slot holds it; one list
  navigates at a time.
- **Clear is drawn only while the page shows a filter** (the owner's call),
  at the row's end: while any of `shown` is set, a non-blank string or
  `true`, so a blank name, an "All …" choice and a switch that is off count
  as none. With nothing to clear nothing is drawn, not a disabled
  placeholder; at the row's end its coming and going moves nothing else.
  It is a plain link, not a submit: its address is `action`, the page itself
  with no query, so every filter parameter and the cursor go, and so does a
  modal's (`?edit=`, `?new`), and it works before hydration as an address.
  With JavaScript, a plain left click opens the unfiltered list softly as a
  field's change does, the row off and the list a skeleton meanwhile; a
  click for a new tab or window is left to the browser.
- **The fields are the caller's.** Their labels, their addresses and what
  each applies stay in the list that knows them; this holds the form, the
  search's submit, Clear and the navigation.
- **It is a `<search>` landmark**, named by `label`, so a screen reader lists
  it beside the page's other regions.

## Styling

None of its own: the form is `.filter-row` ([`styling.md`](../styling.md),
"Form fields"), the row the five lists' `__search` rules were, and the
fields are the primitives'. The row is inset by `$table-cell-inset`, the
admin table's cell padding, so each label stands flush with the column
heading beneath it. The search, its first child, starts at
`$filter-search-basis` (16rem) and grows into the line's spare room, so the
row reaches the table's width. Clear, `.filter-row__clear`, is a plain link
in the page's link style, pushed to the line's end at a control's height.
On a phone the row stacks: under 28rem of its own width every child takes
the whole line, so the boxes share one edge, the owner's call at MB.115's
review over a filter folded behind a disclosure.

**A choice takes one width.** A plain select's field, a `.field` holding a
`.select`, and a type-ahead's, which puts `filter-row__typeahead` on its
`.field` block (`FieldShell`'s `className`, [`field.md`](field.md)), stand
at `$filter-choice-width`, 14rem on the owner's call: most names fit, and
the longest seeded one, "Anglo-Saxon & Continental Germanic", runs on inside
the box while its option in the list is drawn whole. A native select sizes
itself by its longest option and a type-ahead by its few letters, so
without it two selects would differ and hydration, which swaps the
server's select for the type-ahead, would move the row. The type-ahead
opts in by class since once hydrated it holds no select. It gives way on a
narrower row. The clear inside the type-ahead keeps its room while hidden
([`combobox.md`](combobox.md)), so typing does not change the width either.

**An on-or-off filter is a switch**, `SwitchField` ([`field.md`](field.md)):
a `.field` like the rest, its label above and the slide toggle beneath at
`$control-height`, so it stands level with the boxes and selects beside it
at desktop width and in the stacked row, and keeps its own width. The
owner's call at MB.115's review, over a checkbox with its name beside it,
which looked out of place in the row.

**The row while a list is on its way** is `.filter-row[aria-busy='true']`,
in the primitives under `body` so it outweighs the fields' own hover in the
app: every child, Clear included, faded to 55% with its colour taken out
(`grayscale`) and the not-allowed cursor, as the tab row's tabs are, and a
field's hover changing nothing. The row's `aria-disabled` on a switch stops
its hover and press look.

## Stories

[`index.stories.tsx`](../../src/components/FilterForm/index.stories.tsx),
`Forms / Filter Form`: a name search, a group select and a No Refs switch,
as a value list's filter has them, the select and the switch applying
through `useApplyFilter`. `Default`, with `PhoneDark` and `PhoneLight`, a
page showing no filter, so no Clear; `Filtered`, with `FilteredPhoneDark`
and `FilteredPhoneLight`, a page showing one, Clear at the row's end. Each
sits in a `ListFrame`, whose navigation it needs; the workshop's router goes
nowhere, so a change shows nothing on its way here. The row greyed over a
list on its way is GroupedValueList's `CategoriesPending`,
`PendingPhoneDark` and `PendingPhoneLight`.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rule 6): a filter's loading state, focus and Clear are tested once,
in `CompendiumList`: a change puts a status in place of the table, marks
the form `aria-busy` and every control `aria-disabled`, refuses a second
change or submit, and gives the list back once the page arrives; typing
does none of it; the changed field has the focus again in the new row; a
type-ahead applies on a pick, its clear and leaving the box, never while
typed; the Search submit is in the server's markup; and Clear is absent
while the page shows no filter, text typed or not, and with a filter opens
the unfiltered list softly. Each list asserts the address each of its
fields applies, and which of its values draw Clear.

Where the row's fields stand, and Clear at its end, is presentation, the
workshop's (rule 4): the stories above at desktop and phone widths.
