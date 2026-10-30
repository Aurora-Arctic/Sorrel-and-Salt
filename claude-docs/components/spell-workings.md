# SpellWorkings

`src/components/SpellWorkings/` is the Workings section of the recipe page (M13.8, story 79). It
lists a spell's workings, newest `workedOn` first, in the order the connection returns them.

## Where it sits

The page passes the section to `SpellRecipe` as `workings`, and the recipe draws it last in the main column, under the note. On a tablet or wider, with the side column present, the recipe's grid pins it to the text column's last row; the side column spans the facts' row and Workings' row, so Workings never stands in the side column (`.spell-recipe--with-aside` in `SpellRecipe/index.scss`). On a phone the columns stack and it sits at the foot of the main column, above the side column. The recipe does not print it: `_print.scss` hides `.spell-workings` (claude-docs/components/spell-recipe.md, "Print"). `tests/e2e/spell-recipe-layout.spec.ts` holds the screen placement and `tests/e2e/spell-print.spec.ts` the print omission.

## A row

The list is a `ul` named Workings with no marker (`list-reset`, which turns off typography-base's ◆), each row headed by its date.

Each working draws its date, a Draft badge on a draft, a Private badge on a private working, who
recorded it and who took part, its note, and, on a complete working, its deductions. The recorder
and each participant are names the page resolved with `displayNamesOf`, so a removed member reads
under the name they last held; a participant with no readable name reads "A former member".

The head is one wrapping row: the date, its badges right after it, and the buttons pushed to the far right (`spell-workings__actions`). When the row is full, as on a phone, the buttons wrap under the date.

The row does not use `LastEdit`: a working is recorded once, and `LastEdit` says who edited a row last.
Its deduction lines are plain items (name, then amount and unit) inside an `ol` named Deductions,
in the spell's step order. They carry no step number: the recipe above says where a step stands.

The slots a row takes from the page:

- `completeAction(workingId, workedOn, name)`: Complete on a draft row that carries `editable`, so on a draft the viewer recorded or is named on. `name` is the row's day in words, as the pencil and the bin have it. The page passes
  `CompleteWorkingAction` (`@/components/RecordWorking/complete-action`), named "Complete Working <date>" so two drafts' buttons are told apart.
- `editAction(editable, name)`: the pencil (`edit-working.tsx`, `EditWorkingAction`), drawn on rows that carry `editable`, which `readWorkingsOf` gives to the recorder, or a member named on the working, whose role may update workings. It opens Record a Working on that working ("Edit Working"), and the pencil is named "Edit Working <date>" like the bin; and the focus returns to the pencil on close. On a row that also shows Complete the pencil takes the text ink (`icon-tip__edit--plain`, through `editAction`'s `plain`); Complete stays green.
- Delete Working, a bin opening a confirmation dialog through `ModalButton` (`delete-working.tsx`), drawn when the working's
  `canChange` is true: the viewer's role may delete and the viewer is the recorder. The same mutation and question (`useDeleteWorking`, `DeleteWorkingQuestion`) serve the bin in the Edit Working dialog; `editAction` receives `canChange` as its fourth argument for it.

A draft row also lists what completing it would skip (`warnings`), as one line giving the count, such as "Completing takes nothing from the jars for 4 ingredients.", beside its Complete; the reasons stay in the Complete dialog's confirm step. The wording is `skipSummary` in `@/components/RecordWorking/warnings`. It carries no shortfalls. `readWorkingsOf` reads the preview once per page, only when a draft of the viewer's own is there, and gives the lines to the viewer's own drafts; they are the spell's stock as it stands now.

An empty list reads "This spell has not been worked yet."

## Styling

`index.scss`, on the `spell-workings` block, tokens only:

- **The section** is a `.page-frame__section` (`_primitives.scss`): its `space(3)` gap spaces the heading row from the list, and it takes the shell's scroll margin, so a jump from the menu lands the heading clear of the sticky bar. It keeps its own `space(6)` top margin, since the recipe is not a `.page-frame` column whose gap would space it.
- **The heading row** (`__title`) is the Workings heading with Record a Working at its end.
- **The list** (`__list`) is a grid with `space(5)` between rows and no marker (`list-reset`).
- **A row's date** is an `h3` at `heading-size(4)`.
- **The deductions** (`__deductions`) sit `space(3)` under the note, each line its name at the start and its amount at the end.

## Stories

`src/components/SpellWorkings/index.stories.tsx`, titled "Grimoire / Spell Workings": `States`,
with a control that chooses one state, each with the recipe page's own controls (Record a Working,
Complete, the Edit pencil and the bin), drawn by `.storybook/grimoire-workings.tsx`:

- Every Kind of Row: a draft, a private working the viewer recorded, and one another member
  recorded.
- None, and None for a Viewer: no workings, with and without Record a Working.
- Draft and Private: one row of each kind.
- A Viewer Reads Them: a complete working, with no controls.

What each control opens is drawn in Grimoire / Record Working ([record-working.md](record-working.md)).

## Reading

`[id]/workings-read.ts` (`readWorkingsOf`) reads every page of `listWorkingsPage` as the signed-in
session. A private working reaches the page only for its recorder and the people named on it, filtered in SQL.
The grimoire list reads the count with `workingCountsOf`, one query per coven. Neither is cached.
