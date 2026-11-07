# SpellWorkings

`src/components/SpellWorkings/` is the Workings section of the recipe page. It lists a spell's workings, newest `workedOn` first, in the order the connection returns them. An empty list reads "This spell has not been worked yet."

## Where it sits

The page passes the section to `SpellRecipe` as `workings`, and the recipe draws it last in the main column, under the note. With the side column present, the recipe's grid pins it to the text column's last row, so Workings never stands in the side column (`.spell-recipe--with-aside` in `SpellRecipe/index.scss`). On a phone it sits at the foot of the main column, above the side column. The recipe does not print it: `_print.scss` hides `.spell-workings` (claude-docs/components/spell-recipe.md, "Print"). `tests/e2e/spell-recipe-layout.spec.ts` holds the screen placement and `tests/e2e/spell-print.spec.ts` the print omission.

## A row

Each row is headed by its date, with a Draft badge on a draft and a Private badge on a private working, then who recorded it and who took part, its note, and, on a complete working, its deductions. The recorder and each participant are names the page resolved with `displayNamesOf`, so a removed member reads under the name they last held; a participant with no readable name reads "A former member". The row does not use `LastEdit`: a working is recorded once, and `LastEdit` says who edited a row last.

The deductions are plain items (name, then amount and unit) in an `ol`, in the spell's step order, under a "Taken From the Jars" label that names the list (`aria-labelledby`). They carry no step number: the recipe above says where a step stands.

The slots a row takes from the page:

- `completeAction(workingId, workedOn, name)`: Complete, on a draft row that carries `editable` (a draft the viewer recorded or is named on). `name` is the row's day in words. The page passes `CompleteWorkingAction` (`@/components/RecordWorking/complete-action`), named "Complete Working <date>" so two drafts' buttons are told apart.
- `editAction(working, name, plain, canDelete)`: the pencil (`edit-working.tsx`, `EditWorkingAction`), on rows that carry `editable`, which `readWorkingsOf` gives to the recorder or a member named on the working whose role may update workings. It opens Record a Working on that working ("Edit Working"), is named "Edit Working <date>", and returns focus to the pencil on close. On a row that also shows Complete the pencil takes the text ink (`icon-tip__edit--plain`, through `plain`); Complete stays green.
- **A row carries no bin.** Delete Working lives in the Edit Working dialog, drawn when the working's `canChange` is true: the viewer's role may delete and the viewer is the recorder. `delete-working.tsx` holds the mutation and the question (`useDeleteWorking`, `DeleteWorkingQuestion`: "Delete the working of **<date>**? It leaves the spell's history and count, and what it took from the jars stays taken.") the dialog uses.

A draft row also lists what completing it would skip (`warnings`), as one line giving the count ("Completing takes nothing from the jars for 4 ingredients.") in a quiet warning `Notice` under the date; the reasons stay in the Complete dialog's confirm step. The wording is `skipSummary` in `@/components/RecordWorking/warnings`. It carries no shortfalls. `readWorkingsOf` reads the preview once per page, only when a draft of the viewer's own is there, and gives the lines to the viewer's own drafts; they are the spell's stock as it stands now.

## Styling

The section is a `.page-frame__section` (`_primitives.scss`): its gap spaces the heading row from the list and it takes the shell's scroll margin, so a jump from the menu lands the heading clear of the sticky bar. It keeps its own `space(6)` top margin, since the recipe is not a `.page-frame` column whose gap would space it.

## Reading

Stories: `src/components/SpellWorkings/index.stories.tsx` ("Grimoire / Spell Workings"), whose controls come from `.storybook/grimoire-workings.tsx`; what each control opens is drawn in Grimoire / Record Working ([record-working.md](record-working.md)).

`[id]/workings-read.ts` (`readWorkingsOf`) reads every page of `listWorkingsPage` as the signed-in session. A private working reaches the page only for its recorder and the people named on it, filtered in SQL. The grimoire list reads the count with `workingCountsOf`, one query per coven. Neither is cached.
