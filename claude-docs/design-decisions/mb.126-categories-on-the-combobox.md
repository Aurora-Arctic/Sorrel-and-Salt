# MB.126 — Categories are picked from the lists' box, not a wall of chips

**Decided (2026-10-07):** the ingredient form's categories are picked from the same box as its deities — one `Combobox`, the picks as chips inside the control, each in its group's colour — rather than from a wall of toggle chips grouped under collapsible headings. This amends DESIGN.md §6's sentence on the chip selector, its §14 row for the form, and MB.126's description and second and third criteria. The working summary is [`../components/category-picker.md`](../components/category-picker.md).

## What the question was

MB.126 was written as DESIGN.md §6 and story 30 read it: "grouped chips", collapsing into sections so that 63 categories are usable on a phone. That was built — a disclosure heading per group, the chips beneath in their group's colour, a picked chip filled, the owner's later ask of a checkbox on each — and reviewed in the workshop. The owner did not like the design, and asked what else is done. Five patterns were compared: a grouped multi-select box with the picks as chips in it, the same chips with no accordion and a filter box, the picks shown with a searchable popover to add, checkbox groups, and tabs per group.

## Why the box

The owner's call: the same controls and chip styling as the deities field, with the colours. The form already offers every other list this way, so a member learns one control; the box narrows 63 categories by typing, which the accordion could not; the list's headings keep the groups; and the picks sit inside the control as every other list's entries do, so the form reads as one thing. `ComboboxMultiSelect`, the elements' select-only box, was the other candidate, but it takes no text, and narrowing is the point.

What it rules out: nothing typed is a category, so the box has no Add and no "Use what you typed" row, and Enter with nothing highlighted adds only the one category the text names whole. The picks' order is the order picked, as the ids are sent.

## Three calls made with it

- **The `categories` query returns them in the picker's order**: by the
  group's name, then the category's, then id — "at least they should get
  returned that way" — so `findCategoryPage` and its count join the groups
  for the name and key on it. The admin list reads the same service, so it
  lists by group too.
- **An entry's tooltip names its group**, since the colour alone cannot: the
  name with the group in brackets, as a picked deity reads with its
  tradition, then the description. The chip itself reads the bare name.
- **An entry's tooltip may run wider than its chip**, and past the control:
  as wide as its words up to InfoTip's measure, shifted left as it opens by
  however far it would run off the screen, where it was capped at the chip's
  own width. "They don't have to align on the left edge or fit within the
  input. They can go over as long as they're not getting cut off." That is
  the Combobox entry's, so every list's tooltips widen.

## What it cost

Two additions to the shared `Combobox`, both backwards compatible: a `heading` on an option, which buckets the rows under arbitrary headings in first-seen order where only "From Compendium" and "From Coven" existed, and a `colors` pair on `ComboboxEntry`, which fills the chip solid in its group's colour under the solid-fill rule. Story 30 still reads "grouped chips": the groups head the list, and the picks are chips.

M8.11's filter reuses the picker as before, so its criterion that "each group collapses" no longer describes the component. That is M8.11's to settle when it is built: a filter's picks in a box above the results is the usual shape, and the list's headings are its groups.
