# CollapsibleSection

`src/components/CollapsibleSection/` is a section of a form drawn as a
disclosure: its heading opens and shuts it, and while it is shut one muted
line says what it holds. The ingredient form (six sections, and five in an open variant) and the spell builder (four) both use it. What each form puts
in its sections, and which open when, is that form's doc:
[`ingredient-form.md`](ingredient-form.md), "Sections", and
[`spell-builder.md`](spell-builder.md), "The fields".

## Exports

| Export               | What it is                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CollapsibleSection` | The section: a heading at `h3` (or `h4` for a section inside one), its summary line and flag, and its fields                                                                                                       |
| `useFoldIds`         | The ids and class a folding block names its parts by. The ingredient form's variant cards use it too, so the two folds are wired alike                                                                             |
| `FoldAll`            | Open All / Close All for a run of sections: Close All while `anyOpen`, else Open All. In a modal it is portalled into the head, before Undo and Redo; elsewhere it sits above the first section, at the line's end |
| `FoldFlag`           | "Has an error to fix", beneath a fold's heading while `shown`, with the id its toggle is described by                                                                                                              |
| `SectionFold`        | (`types.ts`) The section's state, `open`, `invalid` and `onToggle`, which the form owns, so Save can open a section holding an error, and Open All / Close All can reach every one                                 |

## Props

`CollapsibleSectionProps` (`types.ts`). The form draws the `summary`, so it can watch its own fields.

## Behaviour

- **The heading is the toggle.** Its text is a button inside the heading,
  with `aria-expanded` and `aria-controls` naming the fields, and a chevron at
  the end of the line, down while shut and turned over while open, at once,
  so there is no motion to reduce. The button's `::after` stretches over the
  whole heading block, so a press on the summary or the chevron opens it too,
  while the button alone takes the keyboard's focus. An `info` ⓘ is lifted
  over that overlay.
- **Not `<details>`/`<summary>`.** A `<summary>` is a button itself, so a
  heading inside it stops being one a screen reader moves by, and its own
  toggle would fight a form opening a section on Save.
- **Shut, the summary line describes the button**, beneath the heading, cut
  with an ellipsis.
- **The fields stay in the page while shut**, hidden by the `hidden`
  attribute, so nothing typed is lost and an error can still be set on them.
- **`invalid` flags it**: "Has an error to fix" beneath the heading, open or
  shut, which also describes the button, and its top hairline takes the
  error red.

## Styling

`index.scss`. The sections sit flush, parted by hairlines, the muted ink at
45%: not on the card ground, since what sits inside may already be on it, and
a card in a card reads as nesting the form does not have. Each heading block
is `space(3)` deep above and below, its `h3` in the display face at 1.25rem,
a step under `h4`, the summary in the muted ink at the caption size, weight
300, and the flag in the error red; open, the fields follow at the form's
gap, `space(5)` short of the next hairline. A form wraps its run of
sections in `.collapsible-sections`, a column with no gap of its own, and
the last of the run closes with a hairline beneath it. A variant's last
section, followed by its Done, has none. The rules are nested under `body`
to outweigh layout-base's bare `body section` and typography's `body h3`. A
variant's tighter sections are set in `IngredientForm/index.scss`.

## Stories and tests

`src/components/CollapsibleSection/index.stories.tsx` and `tests/components/CollapsibleSection/`. Which sections open when is each form’s own test: `tests/components/IngredientForm/sections.test.tsx` and `tests/components/SpellBuilder/index.test.tsx`.
