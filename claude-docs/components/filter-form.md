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

| Prop         | What it is                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`      | The row's accessible name, on its `<search>`, title case: "Filter Users"                                                                                 |
| `action`     | The page itself, the path its list's `href.ts` exports: what the form submits to natively before hydration, and the unfiltered first page Clear opens    |
| `searchHref` | Builds the address the search's submit opens: the filter shown with the search box's text, trimmed, from the first page, usually through `listHref`      |
| `shown`      | Each value of the filter the page shows: Clear is drawn while any is set                                                                                 |
| `clear`      | Draw Clear while a filter is shown. Default true; a row with its own Clear All turns it off                                                              |
| `sorrel`     | Draw the layer a sticky row fills itself with, so the corner sorrel shows through it. Default false                                                      |
| `className`  | Joins the form's class: a row whose panel opens under it sets `position: relative`                                                                       |
| `children`   | The fields, a `SearchField` first (or `IngredientSearch`'s box, see [`ingredient-search.md`](ingredient-search.md)), each with the `name` the page reads |

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
  the search text is the caller's state; a select, `FilterSelectField`,
  starts from `defaultValue`, the value shown, and a switch takes
  `defaultChecked` ([`field.md`](field.md)), since the new list draws the filter again from
  what it shows.
- **The search carries its own submit**, `SearchField`'s magnifier named
  Search ([`field.md`](field.md)); `IngredientSearch`'s box draws the same
  one. It is the form's one submit button, so
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
  every select once hydrated, the select-only box or the type-ahead, is
  drawn as a native `<select>` by the server and swapped once hydrated, so
  the press before the script still sends it (`FilterSelectField`,
  [`field.md`](field.md); MB.115). A select or a switch changed before
  hydration applies nothing until the magnifier is pressed.
- **Every filter navigates softly**, through the list's `ListFrame`
  ([`list-frame.md`](list-frame.md#contracts)), which holds the navigation
  and its pending state.
- **While the new list reads, the row is off and the list is a skeleton**
  (the owner's call at MB.115's review: "Filters should trigger the same
  type of loading state as tabs"). The frame's body shows the tabs' skeleton
  in place of the table and the pager, its one status, until the new list
  renders. Meanwhile the form is `aria-busy`, as the tab row is, and every
  control in it is `aria-disabled`: Clear by its own prop, the caller's
  fields by a layout effect that marks each `input` (not a hidden one),
  `select`, `textarea`, `button`, `a[href]` and `[role="combobox"]`, the
  select-only box being a `div`, in the form and unmarks it after. The
  focus restore below counts the same controls. `aria-disabled` rather than `disabled`, as the tabs use it, so a
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
- **It is one landmark: the `<search>`**, named by `label`, so a screen reader
  lists it beside the page's other regions. The `<form>` inside is not named,
  as a named form is a second landmark for the same row (MB.120). jsdom's role
  table predates `<search>`, so a component test finds the form through
  `filterForm(name)` in `tests/support/filter-form.tsx`, and an e2e spec by
  `getByRole('search', { name })`.

## Styling

The `sorrel` prop (default off; `IngredientSearchForm` turns it on) draws `.filter-sorrel`, an `aria-hidden` layer as the first child of the `<search>`, styled by [`ingredient-search.md`](ingredient-search.md) and [`backdrop.md`](backdrop.md), "The copy in the search row".

Otherwise none of its own: the form is `.filter-row` ([`styling.md`](../styling.md),
"Form fields"), the row the five lists' `__search` rules were, and the
fields are the primitives'. The row runs edge to edge with the table
beneath it, the owner's call at MB.115's review, so its boxes reach the
bands' edges; a label stands a cell inset left of the heading text under
it. The search, its first child, starts at
`$filter-search-basis` (16rem) and grows into the line's spare room, so the
row reaches the table's width. Clear, `.filter-row__clear`, is a plain link
in the page's link style, pushed to the line's end at a control's height.
On a phone the row stacks: under 28rem of its own width every child takes
the whole line, so the boxes share one edge, the owner's call at MB.115's
review over a filter folded behind a disclosure.

**A choice takes one width.** A plain select's field, a `.field` holding a
`.select`, and every `FilterSelectField`, which puts `filter-row__choice`
on its `.field` block (`FieldShell`'s `className`, [`field.md`](field.md)),
stand at `$filter-choice-width`, 14rem on the owner's call: most names fit, and
the longest seeded one, "Anglo-Saxon & Continental Germanic", runs on inside
the box while its option in the list is drawn whole. A native select sizes
itself by its longest option and a type-ahead by its few letters, so
without it two selects would differ and hydration, which swaps the
server's select for a Combobox box, would move the row. The field opts in
by class since once hydrated it holds no select. It gives way on a
narrower row, and once wrapped onto a line without the search it grows to
fill that line, since a choice standing at a select's width in the middle
of a row looked wrong at 500px (the owner's call); beside the search it
keeps its width, the search's grow factor dwarfing its own. The clear
inside the type-ahead keeps its room while hidden
([`combobox.md`](combobox.md)), so typing does not change the width either.

**An on-or-off filter is a switch**, `SwitchField` ([`field.md`](field.md)):
a `.field` like the rest, its label above and the slide toggle beneath it, centred under the label, at
`$control-height`, so it stands level with the boxes and selects beside it
at desktop width, and keeps its own width. On a phone it is a row instead, the label beside its track, level with the Filters button on that line; with Clear All showing it wraps beneath, at the line's start (the owner's call, 2026-10-20). The
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
`Admin / Filter Form`: the categories list's own filter, `GroupedValueListFilter`, a name
search and a type-ahead group select (a `FilterSelectField`) applying through `useApplyFilter`, on
the workshop's invented groups. The `States` story has a `state` control: `No Filter`, a
page showing no filter, so no Clear; `Filtered`, a page showing one, Clear at the row's end; `Without Clear` and `With Sorrel`, the row without Clear and with the sorrel in it. `Narrow` stays a story of its own, at a phone's width. Each
sits in a `ListFrame`, whose navigation it needs; the workshop's router goes
nowhere, so a change shows nothing on its way here. The row greyed over a
list on its way is GroupedValueList's `Pending`.

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
the unfiltered list softly. What every list must do with its own wiring is
written once, as `FILTER_ROWS` in `tests/support/filter-form.tsx`, which
each of the six lists' tests runs with `it.each` on a subject of its own:
the form a GET to the page itself with no Filter button, sending the filter
shown under the names the page reads; the search opening its first page on
the magnifier or Enter, trimmed, carrying the rest; each value shown alone
drawing Clear to the page, and none with no filter; and the row starting
again from a filter shown anew, which proves the list's key. A subject
names what the form sends as an address query, as a native submit would.
Each list asserts the rest itself: the address each of its other fields
applies, a select's options, a type-ahead's pick and clear. The type-ahead's
narrowing as it is typed is Combobox's ([`combobox.md`](combobox.md));
the lists assert only that their field is one, drawn as a native select by
the server (`drawnOnServer`, beside the rows).

Where the row's fields stand, and Clear at its end, is presentation, the
workshop's (rule 4): the stories above at desktop and phone widths.

## What the form does

A list's filter is a toolbar that applies as it changes: a select or a switch on its change, a type-ahead once a choice settles, and the search on its own submit (the magnifier, `SearchField`) or Enter. Each opens the new filter from the first page as a soft navigation through the list's `ListFrame`, so while the list reads, the row greys out as a tabbed page's tabs do.

It is a GET form to the page itself, so before hydration the search's submit still sends every field. Clear is a plain link to the page itself, drawn only while the page shows a filter. The caller holds the fields; the form holds the form, Clear and the navigation.

## Focus after a filter applies

The list keys its filter by the filter shown, so the row that applied is thrown away and a new one drawn. The control to focus again is remembered by its place among the row's controls (`-1` for none). A place is used rather than an id because `useId` numbers a browser-drawn row afresh, and Clear, which comes and goes, is last. The slot is module state because the filter's handlers sit above the FilterForm a context would come from; one list navigates at a time, so one slot is enough.
