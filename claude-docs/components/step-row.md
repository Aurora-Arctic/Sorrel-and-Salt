# StepRow

`src/components/StepRow/` draws one step of a spell: its position, its ingredient with the quantity and unit if it has them, and its text. A step is an instruction, an ingredient, or both, and the row draws whichever it holds. It is presentational: it takes props (`types.ts`) and works nothing out. It renders an `<li>`, so the caller wraps it in an `<ol>` it names.

## Contracts

- **Two callers.** The spell builder hands it editing controls and asks for the card (`open`). The recipe page hands it none and so reads the spell, as a plain wrapping flex line. A working's deduction lines (RecordWorking) do not use it.
- **The amount is one phrase** ("2 tsp") with the quantity's trailing zeros dropped ("1.000" is "1"). A unit with no quantity reads "— tsp", the dash muted. None draws nothing.
- **An instruction-only step (`name` null) never draws an amount, `marks` or `note`**, whatever it is given. A row without `open` draws none of the card's props.
- **The card look** (the builder adds `step-row--card`, and `step-row--instruction` for an instruction-only step) is the ingredient form's variant card look: a `$hairline` border (quieter than the fields inside it, which keep their 3:1 edge), `radius('surface')`, `$surface-card`. Remove is the variant card's × (`step-row__remove`); the caller gives it its accessible name.
- **Closed, an ingredient card is one line**: handle, position, icon and name, badge and marks, then the controls (`step-row__controls`, always three slots wide and right-aligned, so every row's badges end at the same x and the name, cut by an ellipsis, takes the rest). Beneath the name, a muted summary line: the amount, then " · " and the instruction, the amount never shrinking and the instruction cut by an ellipsis.
- **Open, the card adds the fields:** a one-off's Name, then Form, Quantity and Unit, then the Instruction, then the safety note. A field's error (the Unit's) is drawn across the whole row of inputs (`errorRef`, `errorInto`).
- **Alignment.** The handle, position, marks, pencil and Remove centre on the name's first line (a paragraph's 1.65 line) rather than on the whole row, `$step-ink-drop` (0.05rem) below its centre, where the name's lettering sits.
- **An instruction-only card**, closed, shows the instruction on one line under an ellipsis (a muted "Add an instruction" when empty); open, the textarea takes the text's place and its label is visually hidden but keeps its accessible name. The position stands in a box the height of the text's first line, closed or open, so it does not move when the textarea replaces the text.
- **Toggling.** The caller (`SpellSteps`, `src/components/SpellBuilder/steps/index.tsx`) holds which row is open: one at a time across both kinds of step, a new step opens, and a row with a unit error stays open. A click on a closed card's face opens it, and a click on an open card's position, name or summary closes it (`onToggle`, a mouse shortcut). Clicks on a button, input, textarea, select, link or combobox, and anywhere in the open fields, do not toggle.
- **The pencil is the one disclosure button:** "Edit <name>" while closed, the up chevron "Close <name>" while open, with `aria-expanded` and `aria-controls` throughout. Remove shows only while the row is closed.
- **The Instruction field** starts two lines high and grows as lines are typed (`field-sizing: content` inside `@supports`; without it the box stays two lines and scrolls).
- **The safety note** in an open ingredient row is the compact `SafetyNote` ([`safety-note.md`](safety-note.md)). The safety badge, Toxic or Caution, is drawn open or closed; an open row adds the note beneath it.
- **The One-Off badge** (`OneOffBadge`) is a button named One-Off in an `IconTip` ("Used in this spell only; not kept in your cupboard."), reached by hover, focus or tap. The recipe page draws the same badge in its marks. A badge is not a `.btn`, so `.step-row__one-off` takes the shared `focus-ring` itself.
- **The Quick Look eye** (`QuickLookButton size="small"`) sits in `look`, after the badges and before the pencil, on an ingredient step with a coven to look in. A one-off or an instruction-only step has none. A click on it does not toggle the row.
- **Badge size.** The badges in `step-row__marks` (Caution, Toxic, One-Off) take the `small` badge size.
- **The narrow list.** The builder's list is a size container (`spell-steps`, declared on `.spell-steps__list` in SpellBuilder's stylesheet). At `$narrow-column` (28rem) or narrower, a card's badges and marks take their own line under the name, so the name, the eye, the pencil and Remove always fit the first line; the opened fields stack; and a closed instruction shows two lines instead of one. The recipe page is unaffected.

The move handle's own style (`.spell-step__handle`, its grip drawn 8 by 16 px with a `::before` that widens the hit area to 24 by 44 px) is in SpellBuilder's stylesheet, which owns the handle.

## Not here

Stories: `index.stories.tsx` ("Grimoire / Step Row"); the builder's stories draw the rows in their list ([`spell-builder.md`](spell-builder.md)). Tests: `tests/components/StepRow/`, the builder's controls with the builder ([`spell-builder.md`](spell-builder.md), "Steps"), `tests/e2e/spell-step-row-phone.spec.ts` (the narrow layout and the handle's hit area) and `tests/e2e/step-row-stays-open.spec.ts` (the outside-click rules).
