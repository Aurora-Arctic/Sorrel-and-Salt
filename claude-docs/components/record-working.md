# Record Working

`src/components/RecordWorking/` — recording a working of a complete spell from its recipe page, changing one, and completing one (M13.7).

| File                  | What it holds                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `index.tsx`           | `RecordWorkingButton` (default), and re-exports of the dialog, `CompleteWorkingAction`, types |
| `dialog.tsx`          | `RecordWorkingDialog`: the `Modal`, apart from its button                                     |
| `form.tsx`            | The form inside it                                                                            |
| `completion.tsx`      | `WorkingCompletion`: the deduction preview and its Confirm                                    |
| `complete-action.tsx` | `CompleteWorkingAction`: a Complete button opening `WorkingCompletion` in a dialog            |
| `warnings.ts`         | `NOT_DEDUCTED` and `skipLine`: why a step takes nothing, in words (no `'use client'`)         |
| `types.ts`            | The props                                                                                     |

## Recording and editing

`RecordWorkingButton` takes `{ workspaceId, spellId, spellVisibility, members, recorderId, steps }`. The recipe
page shows it to a role that may create a working (owner and member) on a complete spell, and
passes `members` (`{ userId, name }`, from `memberRoster` and `displayNamesOf`, since a member may
not list members themselves) and `steps` (`{ id, name }` for each ingredient step).

The dialog holds a date (today by default), participants (a `Combobox` of the members with chips;
a typed name is added as a name chip), a note, and visibility. Visibility never exceeds the
spell's, and is the same Share With the Coven switch the spell builder uses (`VisibilitySwitch`, in `Field`): on a private spell it is off and shut, with a line saying why. A new working opens with the recorder (`recorderId`) as a chip, who may remove themselves; the dialog always sends `participants`. A Workings row says "Recorded by" the recorder and lists only the others after "With", so a stored recorder is never named twice (`workings-read.ts` filters them out).

Save keeps a draft, closes the dialog and refreshes the page, where the draft is a row of the
Workings list. Save & Complete in the form saves first, then shows the preview. The date input's
`max` is today, and a later date leaves Save disabled. Closing with unsaved changes asks first.
What completing a draft would skip is read from the preview query, since `SpellWorking.warnings`
is empty outside a completion; `skipLine` words each line.

`RecordWorkingDialog` takes the same props plus `onClose`, `returnTo` and an optional `working`
(`{ id, workedOn, note, visibility, status, participants }`). With `working` it is titled "Edit
Working", calls `updateWorking` and closes on Save. Only the recorder may edit (the service
refuses anyone else), and a complete working that is shared holds the switch on and shut, since a
complete working's visibility only widens.

## Completing a working

`WorkingCompletion` reads `workingDeductionPreview` afresh each time it opens and lists the spell's
ingredient steps in order, as a list laid out in two columns: the step's name, then its amount to be
taken in the jar's unit against the right edge in tabular figures, with "jar short by" beneath it in
the warning colour if the jar is short, or why nothing is taken ("Not deducted: units differ", muted).
Confirm runs `completeWorking`, reads the page again and shows the same list, so it reads the same
before and after. The preview and the completion share one plan on the
server (`plan-deductions.ts`), so the two agree.

`CompleteWorkingAction` takes `{ workspaceId, spellId, workingId, steps, label? }` and is what a
draft working's row puts beside its other actions.

Stories: `index.stories.tsx`. Browser flows: stories 76 and 78 in
`tests/e2e/stories/06-grimoire.spec.ts`.
