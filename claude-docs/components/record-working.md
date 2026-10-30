# Record Working

`src/components/RecordWorking/` — recording a working of a complete spell from its recipe page, changing one, and completing one (M13.7).

| File                  | What it holds                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `index.tsx`           | `RecordWorkingButton` (default), and re-exports of the dialog, `CompleteWorkingAction`, types |
| `dialog.tsx`          | `RecordWorkingDialog`: the `Modal`, apart from its button                                     |
| `form.tsx`            | The form inside it, and the saved-draft view                                                  |
| `completion.tsx`      | `WorkingCompletion`: the deduction preview and its Confirm                                    |
| `complete-action.tsx` | `CompleteWorkingAction`: a Complete button opening `WorkingCompletion` in a dialog            |
| `types.ts`            | The props                                                                                     |

## Recording and editing

`RecordWorkingButton` takes `{ workspaceId, spellId, spellVisibility, members, steps }`. The recipe
page shows it to a role that may create a working (owner and member) on a complete spell, and
passes `members` (`{ userId, name }`, from `memberRoster` and `displayNamesOf`, since a member may
not list members themselves) and `steps` (`{ id, name }` for each ingredient step).

The dialog holds a date (today by default), participants (a `Combobox` of the members with chips;
a typed name is added as a name chip), a note, and visibility. Visibility never exceeds the
spell's: a private spell offers Private only. `participants` is left out of a new working's input
when no chip is set, so the service names the recorder alone; an edit always sends them.

Save keeps a draft and the dialog stays open on a saved-draft view: who took part, what completing
would skip (read from the preview query, since `SpellWorking.warnings` is empty outside a
completion), and Complete or Done. Complete in the form saves first, then shows the preview.
Closing with unsaved changes asks first.

`RecordWorkingDialog` takes the same props plus `onClose`, `returnTo` and an optional `working`
(`{ id, workedOn, note, visibility, status, participants }`). With `working` it is titled "Edit a
Working", calls `updateWorking` and closes on Save. Only the recorder may edit (the service
refuses anyone else), and a complete working that is shared hides the Private option, since a
complete working's visibility only widens.

## Completing a working

`WorkingCompletion` reads `workingDeductionPreview` afresh each time it opens and lists the spell's
ingredient steps in order: the amount to be taken in the jar's unit, the shortfall if the jar is
short, or why nothing is taken ("Not deducted: units differ"). Confirm runs `completeWorking`, reads
the page again and says what was taken. The preview and the completion share one plan on the
server (`plan-deductions.ts`), so the two agree.

`CompleteWorkingAction` takes `{ workspaceId, spellId, workingId, steps, label? }` and is what a
draft working's row puts beside its other actions.

Stories: `index.stories.tsx`. Browser flows: stories 76 and 78 in
`tests/e2e/stories/06-grimoire.spec.ts`.
