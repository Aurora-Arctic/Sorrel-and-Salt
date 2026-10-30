# Record Working

`src/components/RecordWorking/` — recording a working of a complete spell from its recipe page (M13.7).

| File                  | What it holds                                                                      |
| --------------------- | ---------------------------------------------------------------------------------- |
| `completion.tsx`      | `WorkingCompletion`: the deduction preview and its Confirm                         |
| `complete-action.tsx` | `CompleteWorkingAction`: a Complete button opening `WorkingCompletion` in a dialog |
| `types.ts`            | The props                                                                          |

## Completing a working

`WorkingCompletion` reads `workingDeductionPreview` afresh each time it opens and lists the spell's
ingredient steps in order: the amount to be taken in the jar's unit, the shortfall if the jar is
short, or why nothing is taken ("Not deducted: units differ"). Confirm runs `completeWorking`, reads
the page again and says what was taken. The preview and the completion share one plan on the
server (`plan-deductions.ts`), so the two agree.

`CompleteWorkingAction` takes `{ workspaceId, spellId, workingId, steps, label? }` and is what a
draft working's row puts beside its other actions. `steps` is `{ id, name }` for each ingredient
step of the spell.
