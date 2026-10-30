# SpellWorkings

`src/components/SpellWorkings/` is the Workings section of the recipe page (M13.8, story 79). It
lists a spell's workings, newest `workedOn` first, in the order the connection returns them.

## A row

Each working draws its date, a Draft badge on a draft, a Private badge on a private working, who
recorded it and who took part, its note, and, on a complete working, its deductions. The recorder
and each participant are names the page resolved with `displayNamesOf`, so a removed member reads
under the name they last held; a participant with no readable name reads "A former member".

The row does not use `LastEdit`: a working is recorded once, and `LastEdit` says who edited a row last.
Its deduction lines are `StepRow`s inside an `ol` named Deductions; the row and the list are the
section's own.

The slots a row takes from the page:

- `completeAction(workingId)`: Complete on a draft row. The page passes lane M13.7's
  `CompleteWorkingAction` (`@/components/RecordWorking/complete-action`).
- Delete Working, a bin and a confirmation dialog (`delete-working.tsx`), drawn when the working's
  `canChange` is true: the viewer's role may delete and the viewer is the recorder.

An empty list reads "This spell has not been worked yet."

## Reading

`[id]/workings-read.ts` (`readWorkingsOf`) reads every page of `listWorkingsPage` as the signed-in
session. A private working reaches the page only for its recorder and the people named on it, filtered in SQL.
The grimoire list reads the count with `workingCountsOf`, one query per coven. Neither is cached.
