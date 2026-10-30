# StepRow

`src/components/StepRow/` draws one step of a spell (M13.3, story 80): its position, its
ingredient with the quantity and unit if it has them, and its text. A step is an instruction,
an ingredient, or both, and the row draws whichever it holds.

It is presentational: it takes props and works nothing out. Two places draw steps with it:

- the spell builder (M13.3), which hands it editing controls and asks for the card;
- the recipe page (MB.6), which hands it none and so reads the spell.

A working's deduction lines (RecordWorking) do not use it. It renders an `<li>`, so the caller
wraps it in an `<ol>` it names.

## Props

| Prop                                                                            | What it is                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position`                                                                      | Where the step stands, counting from 1                                                                                                                                                                                      |
| `name`                                                                          | The ingredient and form as the step reads them, text or markup (the recipe body adds its eye). Null draws an instruction-only step                                                                                          |
| `icon`                                                                          | The form's group icon; null draws the generic spoon                                                                                                                                                                         |
| `quantity`, `unit`                                                              | The amount as text, drawn as one phrase ("2 tsp") with the quantity's trailing zeros dropped ("1.000" is "1", "2.500" "2.5"); a unit with no quantity reads "— tsp", the dash muted (`.step-row__dash`); none draws nothing |
| `body`                                                                          | The instruction as text                                                                                                                                                                                                     |
| `marks`, `note`                                                                 | Beside the name, and on a line below the row: the safety mark and the safety note                                                                                                                                           |
| `rowRef`, `className`, `style`                                                  | For a caller that makes the row sortable                                                                                                                                                                                    |
| `open`                                                                          | Asks for the collapsible card, open or closed (below). Left out, the row is the plain line                                                                                                                                  |
| `fieldsId`, `summary`, `badge`, `look`, `edit`, `onToggle`                      | The card's: the id of the fields it reveals, the closed summary, the badge (One-Off) beside the marks, the Quick Look eye, the pencil, and a click on its face                                                              |
| `handle`, `actions`                                                             | The card's controls: the move handle before the position, and the buttons after `edit` (Remove)                                                                                                                             |
| `nameField`, `formField`, `quantityField`, `unitField`, `bodyField`, `errorRef` | The card's open fields, each in place of the plain text it stands for, and the node the fields' error is drawn in                                                                                                           |

An instruction-only step (`name` null) never draws an amount, `marks` or `note`, whatever it
is given. A row without `open` draws none of the card's props.

## Markup

The plain row, inside `<li class="step-row">`, in order: `step-row__position`, `step-row__name`
(icon and name), `step-row__marks` (empty, it is `display: none`), `step-row__amount`,
`step-row__body`, `step-row__note`. Its style is a wrapping flex line, which is all the recipe
page needs.

The card adds `step-row--closed` or `step-row--open` (an ingredient step) or, for an
instruction-only step, `step-row--folded` while closed. An ingredient card holds the handle,
position, name, `step-row__summary` (closed only), `step-row__marks` (the badge, then the marks),
`step-row__controls` (eye, pencil, Remove) and, open, `step-row__open`: the inputs
(`step-row__name-field`, `__form`, `__quantity`, `__unit`, `__instruction`), the error node and
the note. An instruction card holds the handle, position, `step-row__text` (closed) or
`step-row__field` (open), and the controls.

## The card

The builder adds `step-row--card` (and `step-row--instruction` for an instruction-only step).
The card takes the ingredient form's variant card look: a `$hairline` border (quieter than the
fields inside it, which keep their 3:1 edge), `radius('surface')`, `$surface-card` and the same
padding. Remove is the variant card's × (`step-row__remove`); the caller gives it its accessible
name.

**Closed and open.** Closed, an ingredient card is one line: handle, position, icon and name,
then the badge and marks, then the controls (`step-row__controls`, `space(1)` apart, always
three slots wide and right-aligned, so every row's badges end at the same x and the name, cut by
an ellipsis, takes the rest). Beneath the name, in its column, a muted summary line: the
amount, then " · " and the instruction, the amount never shrinking and the instruction cut by an
ellipsis. Open, the card adds the fields: a one-off's Name on a line of its own, then Form,
Quantity and Unit on one line where they fit, then the Instruction on a full-width line, then
the safety note. Lines of fields stand `space(4)` apart and fields on one line `space(2)`. A
field's error (the Unit's) is drawn across the whole row of inputs (`errorRef`, `errorInto`).

The handle, position, marks, pencil and Remove centre on the name's first line (a paragraph's
1.65 line) rather than on the whole row, `$step-ink-drop` (0.05rem) below its centre, where the
name's lettering sits.

**An instruction-only card** has the same border and ground. Closed, it shows the handle,
position, the instruction on one line under an ellipsis (a muted "Add an instruction" when
empty), the pencil and Remove. Open, the textarea takes the text's place; its label is visually
hidden and keeps its accessible name. The position stands in a box the height of the text's
first line, closed or open, so it does not move when the textarea replaces the text.

**Toggling.** The caller (`SpellSteps`, `src/components/SpellBuilder/steps/index.tsx`) holds
which row is open: one at a time across both kinds of step, a new step opens, and a row with a
unit error stays open. A click on a closed card's face opens it, and a click on an open card's
position, name or summary closes it (`onToggle`, a mouse shortcut). Clicks on a button, input,
textarea, select, link or combobox, and anywhere in the open fields, do not toggle. The pencil
is the one disclosure button: "Edit <name>" while closed, the up chevron "Close <name>" while
open (`step-row__edit--close`), with `aria-expanded` and `aria-controls` throughout. Remove shows
only while the row is closed.

**The Instruction field** starts two lines high and grows as lines are typed
(`field-sizing: content` inside `@supports`; without it the box stays two lines and scrolls).

**The safety note** in an open ingredient row is the compact `SafetyNote`
([`safety-note.md`](safety-note.md)). While a row is open the Caution badge is not drawn, since
the note says the same; the Toxic badge stays, because the note never says Toxic.

**The One-Off badge** (`OneOffBadge`, `one-off-badge.tsx`) is a button named One-Off in an
`IconTip` whose description is "Used in this spell only; not kept in your cupboard.", reached by
hover, focus or tap. It takes the muted tint (`badge--muted`), and the recipe page draws the
same badge in its marks. A badge is not a `.btn`, so `.step-row__one-off` takes the shared
`focus-ring` itself.

**The Quick Look eye** (`QuickLookButton size="small"`) sits in `look`, after the badges and
before the pencil, on an ingredient step with a coven to look in; a one-off or an
instruction-only step has none. A click on it does not toggle the row.

**Badge size.** The badges in `step-row__marks` (Caution, Toxic, One-Off) take the `small`
badge size: 12px text, 24px least height.

**The narrow list.** The builder's list is a size container (`spell-steps`, declared on
`.spell-steps__list` in SpellBuilder's stylesheet). At `$narrow-column` (28rem) or narrower, a
card's badges and marks take their own line under the name, so the name, the eye, the pencil
and Remove always fit the first line; the opened fields stack (Form whole, Quantity and Unit half
each, Instruction whole); and a closed instruction shows two lines instead of one. The recipe
page does not ask for the card and is unaffected.

## Styling

`src/components/StepRow/index.scss`. Tokens: `$hairline`, `$surface-card`, `$text-muted`,
`radius('surface')`, `space()`, `type-size('body')` and `$narrow-column`. Two local values:
`$step-line` (the name's line, `type-size('body') * 1.65`) and `$step-ink-drop`. The move handle's
own style (`.spell-step__handle`, its grip drawn 8 by 16 px with a `::before` that widens the hit
area to 24 by 44 px) is in SpellBuilder's stylesheet, which owns the handle.

## Stories

`src/components/StepRow/index.stories.tsx`, "Grimoire / Step Row": `States`, the plain row in
four states (Instruction Only, Ingredient Only, Ingredient With Instruction, One-Off Without
Amount). The card is drawn in the spell builder's stories ([`spell-builder.md`](spell-builder.md)).

## Testing

`tests/components/StepRow/index.test.tsx`: what each kind of step draws, the amount phrase, and
the card's closed and open faces. The builder's controls are tested with the builder
([`spell-builder.md`](spell-builder.md), "Steps"); the narrow layout and the handle's hit area in
`tests/e2e/spell-step-row-phone.spec.ts`; the outside-click rules in
`tests/e2e/step-row-stays-open.spec.ts`.
