# StepRow

`src/components/StepRow/` draws one step of a spell (M13.3, story 80): its position, its
ingredient with the quantity and unit if it has them, and its text. A step is an instruction,
an ingredient, or both, and the row draws whichever it holds.

It is presentational: it takes props and works nothing out. Three places draw steps with it:

- the spell builder (M13.3), which hands it editing controls;
- the recipe page (MB.6), which hands it none and so reads the spell;
- a working's deduction lines (M13.8).

It renders an `<li>`, so the caller wraps it in an `<ol>` it names.

## Props

| Prop                                                                 | What it is                                                                                                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position`                                                           | Where the step stands, counting from 1                                                                                                                                        |
| `name`                                                               | The ingredient and form as the step reads them. Null draws an instruction-only step                                                                                           |
| `icon`                                                               | The form's group icon; null draws the generic spoon                                                                                                                           |
| `quantity`, `unit`                                                   | The amount as text, drawn as one phrase ("2 tsp"); none draws nothing                                                                                                         |
| `body`                                                               | The instruction as text                                                                                                                                                       |
| `marks`, `note`                                                      | Beside the name, and on a line below the row: the builder's safety mark and note                                                                                              |
| `handle`, `actions`                                                  | Controls before and after the row: the builder's move handle and Remove                                                                                                       |
| `quantityField`, `unitField`, `bodyField`                            | A control drawn in place of the plain text it stands for                                                                                                                      |
| `open`, `fieldsId`, `summary`, `badge`, `edit`, `aside`, `formField` | The collapsible card: whether it is open, the id of the fields it reveals, the closed summary, a badge beside the name, the pencil, a slot after the name, and a Form control |
| `rowRef`, `className`, `style`                                       | For a caller that makes the row sortable                                                                                                                                      |

An instruction-only step (`name` null) never draws an amount, `marks` or `note`, whatever it is given.

## Markup

Inside the `<li class="step-row">`, in order: `handle`, `step-row__position`, `step-row__name`
(icon and name), `step-row__marks` (the `marks` slot; empty, it is `display: none`),
`step-row__fields` (Quantity and Unit together) or `step-row__amount` (the plain phrase),
`step-row__field` (a control in place of the text) or `step-row__body` (the plain text),
`actions`, `step-row__note`. `StepRow`'s base style is a wrapping flex line, which is
all the recipe page needs. The builder lays the same markup out as a card on a grid
(`step-row--card`, below).

## The card

A caller that edits adds `step-row--card` (and `step-row--instruction` for an instruction-only step), as the spell builder does. The card follows the ingredient form's variant card: the muted-ink border, `radius('surface')`, `$surface-card`, the same padding. `handle`, position, icon and name, the amount fields and Remove stand on one grid row, level along the bottoms of their fields. Beneath, from the name's column: the marks, the instruction field, the note. The amount fields are 6rem and 8rem. Remove is the variant card's × (`step-row__remove`, an icon button; the caller gives it its accessible name). An instruction-only card has a dashed `$hairline` border and no ground, its field between the number and Remove.

**Open and closed.** With `open` given, the card is collapsible: closed, it shows the handle, position, icon, name, `badge`, `summary`, the supply `aside`, the pencil (`edit`, which carries `aria-expanded` and `aria-controls` for `fieldsId`) and Remove. Open, it adds the fields (Form, Quantity, Unit, the instruction, the note). The caller holds which row is open: one at a time, a new step opens, and a row with a unit error is forced open. Without `open` the card is always open, as before.

The list holding the cards is a size container (`spell-steps`, declared in this file on `.spell-steps__list`): at `$narrow-column` (28rem) or narrower the amount drops to a second line under the name and the × stays at the end of the first. The recipe page does not ask for the card and draws the bare flex line; it needs no change, and reads as before.

## Testing

`tests/components/StepRow/index.test.tsx`: what each kind of step draws, and that a control
replaces its plain text. The builder's controls are tested with the builder
([`spell-builder.md`](spell-builder.md), "Steps").
