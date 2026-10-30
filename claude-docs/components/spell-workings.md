# SpellWorkings

`src/components/SpellWorkings/` is the Workings section of the recipe page (M13.8, story 79). It
lists a spell's workings, newest `workedOn` first, in the order the connection returns them.

## A row

Each working draws its date, a Draft badge on a draft, a Private badge on a private working, who
recorded it and who took part, its note, and, on a complete working, its deductions. The recorder
and each participant are names the page resolved with `displayNamesOf`, so a removed member reads
under the name they last held; a participant with no readable name reads "A former member".

The row does not use `LastEdit`: a working is recorded once, and `LastEdit` says who edited a row last.
Its deduction lines are plain items (name, then amount and unit) inside an `ol` named Deductions,
in the spell's step order. They carry no step number: the recipe above says where a step stands.

The slots a row takes from the page:

- `completeAction(workingId)`: Complete on a draft row that carries `editable`, so on the recorder's own draft only. The page passes lane M13.7's
  `CompleteWorkingAction` (`@/components/RecordWorking/complete-action`).
- `editAction(editable, name)`: the pencil (`edit-working.tsx`, `EditWorkingAction`), drawn on rows that carry `editable`, which `readWorkingsOf` gives to the recorder whose role may update workings. It opens Record a Working on that working ("Edit Working"), and the pencil is named "Edit Working <date>" like the bin; and the focus returns to the pencil on close.
- Delete Working, a bin and a confirmation dialog (`delete-working.tsx`), drawn when the working's
  `canChange` is true: the viewer's role may delete and the viewer is the recorder.

A draft row also lists what completing it would skip (`warnings`), one line each, such as "Completing skips Salt: units differ", beside its Complete. The wording is `skipLine` in `@/components/RecordWorking/warnings`, the same the Complete dialog uses. `readWorkingsOf` reads the preview once per page, only when a draft of the viewer's own is there, and gives the lines to the viewer's own drafts; they are the spell's stock as it stands now.

An empty list reads "This spell has not been worked yet."

## Reading

`[id]/workings-read.ts` (`readWorkingsOf`) reads every page of `listWorkingsPage` as the signed-in
session. A private working reaches the page only for its recorder and the people named on it, filtered in SQL.
The grimoire list reads the count with `workingCountsOf`, one query per coven. Neither is cached.
