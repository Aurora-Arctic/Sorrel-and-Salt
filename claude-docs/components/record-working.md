# Record Working

`src/components/RecordWorking/` — recording a working of a complete spell from its recipe page, changing one, and completing one (M13.7).

| File                  | What it holds                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.tsx`           | `RecordWorkingButton` (default; the icon-only cauldron, `RecordButton` of IconTip), and re-exports of the dialog, `CompleteWorkingAction`, types |
| `dialog.tsx`          | `RecordWorkingDialog`: the `Modal`, apart from its button                                                                                        |
| `form.tsx`            | The form inside it                                                                                                                               |
| `completion.tsx`      | `WorkingCompletion`: the deduction preview and its Confirm                                                                                       |
| `complete-action.tsx` | `CompleteWorkingAction`: a Complete button opening `WorkingCompletion` in a dialog                                                               |
| `warnings.ts`         | `NOT_DEDUCTED` and `skipSummary`: why a step takes nothing, and the one-line skip count, in words (no `'use client'`)                            |
| `types.ts`            | The props                                                                                                                                        |

## Recording and editing

`RecordWorkingButton` takes `{ workspaceId, spellId, spellVisibility, members, recorderId, steps }`. The recipe
page shows it to a role that may create a working (owner and member) on a complete spell, and
passes `members` (`{ userId, name }`, from `memberRoster` and `displayNamesOf`, since a member may
not list members themselves) and `steps` (`{ id, name }` for each ingredient step).

The dialog holds a date (today by default), participants (a `Combobox` of the members with chips;
a typed name is added as a name chip), a note, and visibility. Visibility never exceeds the
spell's, and is the same Share With the Coven switch the spell builder uses (`VisibilitySwitch`, in `Field`), start-aligned by `.working-form .switch` as `.spell-builder .switch` does: on a private spell it is off and shut, with a line saying why. A new working opens with the recorder (`recorderId`) as a chip, who may remove themselves; the dialog always sends `participants`. A Workings row says "Recorded by" the recorder and lists only the others after "With", so a stored recorder is never named twice (`workings-read.ts` filters them out).

Save as Draft keeps a draft, closes the dialog and refreshes the page, where the draft is a row of the
Workings list. Complete in the form saves first, then shows the preview. The date is a `DateField` day picker; its
last pickable day is today, and a later date leaves both saves disabled. Closing with unsaved changes asks first.
What completing a draft would skip is read from the preview query, since `SpellWorking.warnings`
is empty outside a completion; `skipSummary` words the draft row's count.

`RecordWorkingDialog` takes the same props plus `onClose`, `returnTo` and an optional `working`
(`{ id, workedOn, note, visibility, status, participants }`). With `working` it is titled "Edit
Working", calls `updateWorking` and closes on Save. Only the recorder or a member named on the working may edit (the service
refuses anyone else), and a complete working that is shared holds the switch on and shut, since a
complete working's visibility only widens.

## Completing a working

`WorkingCompletion` reads `workingDeductionPreview` afresh each time it opens and lists the spell's
ingredient steps in order, one line each, as the jar the recipe page's In Coven Inventory draws, both through `JarLine`
([`jar-line.md`](jar-line.md): the drawing, the `jar-shelf__jar--low|out|empty` paint, the press, the shake and the growing name) beside "n. Name", n being
the step's place among all the recipe's steps, and these words:

- A take: "takes X · have Y · left Z", all in the jar's unit, with "short by N" in the warning colour
  when the jar cannot cover it. `have` is what the jar held before this line's take, so two lines on
  one jar show it running down. The preview returns it as `before`, with the jar's Low mark as
  `lowStockThreshold`, from the plan that already read the jars, so it costs no extra read.
  A short line draws its jar Low, whatever the Low mark says.
- A one-off: a muted jar and "one-off · not kept".
- A step with no jar: a dashed empty jar and "have no jar · takes nothing".
- Any other skip (units differ, no amount, jar not measured): the reason and "takes nothing", over a
  steady jar with no level, since the preview carries no jar quantity for a line that takes nothing.

A step that carries `stock` (the same `StockDialogProps` the In Coven Inventory line gets, so only
for a role that may edit stock, and never for a deleted ingredient or form) wraps its name and jar in a
`StockJarButton`, which opens Edit Stock as it does on the recipe page. Its `onSaved` then reads the
preview again, so have, left and short by are redrawn before Confirm. The stock dialog is a second
modal opened over the Record a Working one. A step without `stock` keeps a plain drawing: the
recipe page builds `stock` from the aside's doors, and the spell cards' Record a Working carries none,
so a card's jars are not clickable.

Confirm runs `completeWorking`, reads the page again and shows the same list, so it reads the same
before and after. The preview and the completion share one plan on the
server (`plan-deductions.ts`), so the two agree.

`CompleteWorkingAction` takes `{ workspaceId, spellId, workingId, steps, label? }` and is what a
draft working's row puts beside its other actions.

Stories: `index.stories.tsx`. Browser flows: stories 76 and 78 in
`tests/e2e/stories/06-grimoire.spec.ts`.
