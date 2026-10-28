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

| Prop                                      | What it is                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `position`                                | Where the step stands, counting from 1                                              |
| `name`                                    | The ingredient and form as the step reads them. Null draws an instruction-only step |
| `icon`                                    | The form's group icon; null draws the generic spoon                                 |
| `quantity`, `unit`                        | The amount as text, drawn as one phrase ("2 tsp"); none draws nothing               |
| `body`                                    | The instruction as text                                                             |
| `handle`, `actions`                       | Controls before and after the row: the builder's move handle and Remove             |
| `quantityField`, `unitField`, `bodyField` | A control drawn in place of the plain text it stands for                            |
| `rowRef`, `className`, `style`            | For a caller that makes the row sortable                                            |

An instruction-only step (`name` null) never draws an amount, whatever it is given.

## Testing

`tests/components/StepRow/index.test.tsx`: what each kind of step draws, and that a control
replaces its plain text. The builder's controls are tested with the builder
([`spell-builder.md`](spell-builder.md), "Steps").
