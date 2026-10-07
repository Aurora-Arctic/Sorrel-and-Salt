# CategoryPicker

`src/components/CategoryPicker/` — the categories picked from one box, as a
list field's entries are (MB.126): typing narrows the live categories, listed
under their groups, and a pick is a chip inside the control in its group's
colour. The ingredient form's Categories field, and M8.11's ingredients
filter. A client component, for the box's text.

## Props

`CategoryPickerProps` (`types.ts`):

| Prop         | What it is                                                               |
| ------------ | ------------------------------------------------------------------------ |
| `legend`     | The fieldset's name, "Categories"                                        |
| `hint`       | The legend's `InfoTip` text, if any                                      |
| `entry`      | The box's name, "Category": what a pick adds                             |
| `categories` | Every `PickerCategory` on offer, in any order                            |
| `pending`    | The categories are still being read: the box says it is looking          |
| `value`      | The picked ids, in the order they were picked                            |
| `onChange`   | Called with the new id list after a pick is added or taken out           |
| `invalid`    | The ids an error names: each entry edged, its x described by the error   |
| `errorId`    | The id of the element `error` renders, set only while an error shows     |
| `error`      | The one error element, drawn beneath the box: the form's `FieldError`    |
| `status`     | Said beneath the box, and read with it: the categories could not be read |

A `PickerCategory` is the category's id, name, optional `description` and its
`group`, a `PickerGroup`: id, name, `colorDark` and `colorLight`.

## Contracts

- **It is the deities field's box, the owner's call**, not a wall of chips:
  the same [`Combobox`](combobox.md), its entries inside the control with
  their x and a Clear, the chevron to list everything, and the list under
  headings. What differs is that nothing typed is a category: there is no
  Add, no "Use what you typed" row (`offerTyped` off), and Enter with nothing
  highlighted adds only the one category the text names whole.
- **Data-free and controlled.** Ids in through `value`, ids out through
  `onChange`; no fetching and no react-hook-form, so M8.11 reuses it as a
  filter unchanged. A pick appends its id and empties the box; an x, or
  Backspace in the empty box, takes an id out and keeps the rest in order;
  Clear takes them all. Each is announced through a labelled status region,
  "Categories changes", as a list field's are.
- **The rows come from the categories.** The list offers every category not
  yet picked whose name holds the text, case set aside, under its group's
  heading — the Combobox's `heading` on each row — the groups and the names
  both alphabetical by `localeCompare`. No code names a group, so one an
  admin adds is a heading without a change here. A category's description
  reads beneath its row, and each row is marked by a bar in its group's
  colour, the Combobox option's `colors` (the owner's call, M5.6b), so the colour
  a pick's chip will wear is seen before the pick.
- **An entry's colour is its group's row.** Each pick is a `ComboboxEntry`
  given its group as `colors`, so it wears the row's `colorDark` and
  `colorLight` through `chipColors` as a solid fill (claude-docs/styling.md,
  "Chips, badges and the solid-fill rule"). Its tooltip reads the name with
  its group in brackets on its first line, the entry's `qualifier`, as a
  picked deity reads with its tradition, since the colour alone cannot name
  the group, and its description beneath, the entry's `detail` — "Testward
  (Wards & Fixtures)" over "Keeps a fixture from harm." — both read as its
  x's description, the owner's call. The chip itself reads the bare name. Never a Sass token by slug:
  `tests/guards/chip-colour-source.test.ts` fails one.
- **An error is the box's, and names its entries.** While `errorId` is set
  the box is `aria-invalid` and described by the error, so the form's focus
  after a failed save lands on it, as on every list field; each id in
  `invalid` gives its entry the `errorId`, which edges the chip and describes
  its x. The `status` is read with the box the same way, and marks nothing
  invalid.
- **A pick the categories do not name** — an edit's, arriving before the
  read, or one since retired — waits while `pending`, and is then drawn by
  its id, uncoloured, so that it can be taken out.
- **The fieldset is named by the legend's text alone** (`aria-labelledby`, as
  `ListField` does, so the tip's button stays out of the name).

## Styling

Layout only, until its section's design review: the legend's row with its
tip, and the legend, the entries and the box a step further apart than a
single field's label and control, as the form keeps its lists. The box, its
entries and its list are the [`Combobox`](combobox.md)'s; an entry's colour
is the `is-coloured` entry's. The chips wrap inside the control, so a 375px
screen scrolls nothing sideways.

## Testing

`tests/components/CategoryPicker/index.test.tsx`: the group and its box;
every category under its group, both alphabetical, with a novel group; the
rows narrowed by the text and no typed row; a pick added after the others,
the box emptied, said, and the pick offered no more; the picks reported in
order; each row and each entry in its group's colour pair, its tooltip naming the group
then the description; an x, the
focus kept in the box; Backspace; Clear, shown only with picks; Enter adding
the one category named whole and nothing for part of a name; the box and the
entries an error names, each described; the status read with the box; and a
pick not yet named held while the read is on, then drawn by its id.
