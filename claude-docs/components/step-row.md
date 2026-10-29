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

| Prop                                                                                | What it is                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position`                                                                          | Where the step stands, counting from 1                                                                                                                                                       |
| `name`                                                                              | The ingredient and form as the step reads them. Null draws an instruction-only step                                                                                                          |
| `icon`                                                                              | The form's group icon; null draws the generic spoon                                                                                                                                          |
| `quantity`, `unit`                                                                  | The amount as text, drawn as one phrase ("2 tsp"); none draws nothing                                                                                                                        |
| `body`                                                                              | The instruction as text                                                                                                                                                                      |
| `marks`, `note`                                                                     | Beside the name, and on a line below the row: the builder's safety mark and note                                                                                                             |
| `handle`, `actions`                                                                 | Controls before and after the row: the builder's move handle and Remove                                                                                                                      |
| `quantityField`, `unitField`, `bodyField`                                           | A control drawn in place of the plain text it stands for                                                                                                                                     |
| `open`, `fieldsId`, `summary`, `bodySummary`, `badge`, `edit`, `aside`, `formField` | The collapsible card: whether it is open, the id of the fields it reveals, the closed summary, a badge at the right of the first line, the pencil, a slot after the name, and a Form control |
| `rowRef`, `className`, `style`                                                      | For a caller that makes the row sortable                                                                                                                                                     |

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

A caller that edits adds `step-row--card` (and `step-row--instruction` for an instruction-only step), as the spell builder does. The card follows the ingredient form's variant card: a `$hairline` border (it was the muted ink `$text-muted`; the second design review, 2026-10-28, finding 3, made the card quieter than the fields in it, which keep their stronger edge), `radius('surface')`, `$surface-card`, the same padding. `handle`, position, icon and name, the amount fields and Remove stand on one grid row, level along the bottoms of their fields. Beneath, from the name's column: the marks, the instruction field, the note. The amount fields are 7rem and 8rem (the Quantity is 7rem so its "Amount" placeholder, 60px in the real font, shows whole beside the spin buttons: 60 + 24 padding + 2 border + about 15 for the arrows is 101px; it was 6rem, 96px, and clipped, 2026-10-28). Remove is the variant card's × (`step-row__remove`, an icon button; the caller gives it its accessible name). In a closed or open ingredient row the handle, position, pencil, Remove and marks centre on the first line of the name (a paragraph's 1.65 line), not on the whole row, so a name that wraps, or a summary that stands beneath it on a narrow list, leaves them on the name's line. They sit `$step-ink-drop` (0.05rem, 0.8px) below that line's centre, because a name's lettering sits that far below the middle of its line (measured on the ink, not the boxes: the icons' ink centres are within 0.5px of the name's). An instruction-only card has the same solid border and ground as the other cards (it was a dashed hairline on the page's ground until the owner asked for the same, 2026-10-28). Closed (`step-row--folded`), it shows the handle, position, the instruction text itself (one line under an ellipsis, so the row is the height of a closed ingredient row; a muted "Write the step" when empty), a pencil and Remove. The position stands in a box the height of the text's first line, down the same `space(2)` the text's padding takes, closed or open, so it does not move when the textarea takes the text's place (a shared baseline did: the textarea's text sits lower than the closed text). The handle, pencil and Remove sit at the middle of that first line, not at the row's top or middle (a long instruction wraps beneath them). Open, the textarea takes the text's place; its visible label is hidden but it keeps its accessible name. A new instruction step opens at once with focus in its textarea. The handle's drawn grip is 8 by 16 px; a `::before` widens its hit area to 24 by 44 px without changing the drawing (second design review).

**The Instruction field** starts two lines high and grows as lines are typed (`field-sizing: content` inside `@supports`, past Baseline widely available: without it the box stays two lines and scrolls inside). In an open ingredient row the safety note is the compact `SafetyNote` ([`safety-note.md`](safety-note.md)).

**The safety note** in an open ingredient row is the compact `SafetyNote` ([`safety-note.md`](safety-note.md)).

**The opened fields.** A one-off's Name (required, `nameField`) is the first, a full-width line of its own at every width; then Form (a one-off's), Quantity and Unit stand on one line where they fit; the Instruction is always a full-width line of its own beneath them, at every width. A one-off has no line beneath its fields: "Used in this spell only; not kept in your cupboard." is the tip of its One-Off badge, a button (name One-Off, the sentence its description) in an `IconTip`, reached by hover or focus. The `aside` prop remains for other rows; the spell builder passes none. The fields sit from the top of their row, and a field's error (the Unit's) is drawn across the whole row of inputs (`errorRef`, `errorInto`) rather than wrapped inside its narrow column (second design review). A name wraps with `overflow-wrap: break-word`, so a word breaks only when longer than the line.

**Badge size.** The badges in `step-row__marks` (Caution, Toxic, One-Off) take the `small` badge size, the compact ingredient card's: 12px text, 24px least height, 5px sides (the owner's call, second design review, 2026-10-28). The default badge was 13px text at about 24.2px.

**Open and closed.** With `open` given, the card is collapsible: closed, it shows the handle, position, icon, name, the `badge` and marks together at the right of the first line, just before the pencil (the owner's call, 2026-10-28; the badge is in `step-row__marks`, never in the name's line, so it cannot wrap onto a line of its own; in a narrow list the two stack and keep the right edge), `summary` and `bodySummary` (two muted lines beneath the name, in the name's column, drawn as a closed CollapsibleSection draws its summary: caption size, weight 300, `$text-muted`, one line under an ellipsis; the amount first, then the instruction, left out when blank; the owner's call, 2026-10-29), the supply `aside`, the pencil (`edit`, which carries `aria-expanded` and `aria-controls` for `fieldsId`) and Remove. Open, it adds the fields (Form, Quantity, Unit, the instruction, the note). The caller holds which row is open, across both kinds of step: one at a time, a new step opens, and a row with a unit error is forced open. An open row closes when a click or tap lands outside it, or the focus leaves it (Tab, for example); a click inside a listbox a field in it opened counts as inside. A newly added step stays open while the focus is in Add to Jar, and closes on the next click or focus outside both the box and the row. A click on a closed ingredient card's plain face opens it, and on an open card's header text (position, name, summary) closes it (`onToggle`, a mouse shortcut: the pencil stays the keyboard and screen-reader toggle, so the `li` gets no role or tab stop). Clicks on a button, input, textarea, select, link or combobox, and anywhere in the open fields, do not toggle. The closed ingredient card shows a pointer cursor; instruction-only cards are unaffected. The pencil is the one disclosure button: closed it is the pencil (named "Edit <name>"), open the same button shows the Combobox's chevron turned up (`step-row__edit--close`, in `$text-primary`, named "Close <name>"), with `aria-expanded` on it throughout and the focus staying on it. Remove keeps its own place and shows only while the row is closed, so a row being edited is never deleted by a stray press. This supersedes the owner's earlier call of 2026-10-28 for a separate pencil and Close chevron: the second design review found two buttons doing one job. An instruction-only step opens and closes the same way (the owner's call, 2026-10-29): a click on its closed text, or its pencil ("Edit step N"), opens it; open, the pencil is the Close chevron ("Close step N") at the right edge and Remove ("Remove step N") is hidden; an open row closes from its number or the Close button, or by the outside-click rule. A closed row keeps its values (`shouldUnregister` stays false). The caller does this (`SpellSteps`, in `src/components/SpellBuilder/steps/index.tsx`), not StepRow. Without `open` the card is always open, as before.

The list holding the cards is a size container (`spell-steps`, declared in this file on `.spell-steps__list`): at `$narrow-column` (28rem) or narrower the amount drops to a second line under the name and the × stays at the end of the first. The recipe page does not ask for the card and draws the bare flex line; it needs no change, and reads as before.

## Testing

`tests/components/StepRow/index.test.tsx`: what each kind of step draws, and that a control
replaces its plain text. The builder's controls are tested with the builder
([`spell-builder.md`](spell-builder.md), "Steps").
