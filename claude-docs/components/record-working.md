# Record Working

`src/components/RecordWorking/` — recording a working of a complete spell from its recipe page, changing one, and completing one (M13.7).

| File                  | What it holds                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.tsx`           | `RecordWorkingButton` (default; the icon-only cauldron, `RecordButton` of IconTip), and re-exports of the dialog, `CompleteWorkingAction`, types             |
| `dialog.tsx`          | `RecordWorkingDialog`: the `Modal`, apart from its button                                                                                                    |
| `form.tsx`            | The form inside it                                                                                                                                           |
| `completion.tsx`      | `WorkingCompletion`: the deduction preview and its Confirm                                                                                                   |
| `complete-action.tsx` | `CompleteWorkingAction`: a Complete button opening `WorkingCompletion` in a dialog                                                                           |
| `warnings.ts`         | `NOT_DEDUCTED` and `skipSummary`: why a step takes nothing, and the one-line count of items completing leaves out of inventory, in words (no `'use client'`) |
| `types.ts`            | The props                                                                                                                                                    |

## Recording and editing

`RecordWorkingButton` takes `{ workspaceId, spellId, spellVisibility, members, recorderId, steps }`. The recipe
page shows it to a role that may create a working (owner and member) on a complete spell, and
passes `members` (`{ userId, name }`, from `memberRoster` and `displayNamesOf`, since a member may
not list members themselves) and `steps` (`{ id, name }` for each ingredient step).

The dialog holds a date (today by default), participants (a `Combobox` of the members with chips;
a typed name is added as a name chip), a note, and visibility. Participants is a `<fieldset>`, so while a save runs it shuts with the other fields, chips and all, and a refused name describes the box through `FieldError`. Visibility never exceeds the
spell's, and is the same Share With the Coven switch the spell builder uses (`VisibilitySwitch`, in `Field`), start-aligned by `.working-form .switch` as `.spell-builder .switch` does: on a private spell it is off and shut, with a line saying why. A new working opens with the recorder (`recorderId`) as a chip, who may remove themselves; the dialog always sends `participants`. A Workings row says "Recorded by" the recorder and lists only the others after "With", so a stored recorder is never named twice (`workings-read.ts` filters them out).

Save as Draft keeps a draft, closes the dialog and refreshes the page, where the draft is a row of the
Workings list. Complete in the form saves first, then shows the preview. The date is a `DateField` day picker. A working may be dated ahead and saved as a draft, but Complete
is off while the date is after the browser's today, with "Complete on or after <day>" written under the buttons and describing it, since a disabled button takes no focus to show a tip. The Complete beside a
draft's Edit pencil on the recipe page (`CompleteWorkingAction`, given `workedOn`) is `aria-disabled` instead: it keeps the focus, a press does nothing, and the same words are its tip (shown on focus, hover or press) and its description. The service refuses it too. Closing with unsaved changes asks first.
What completing a draft would skip is read from the preview query, since `SpellWorking.warnings`
is empty outside a completion; `skipSummary` words the draft row's count.

`RecordWorkingDialog` takes the same props plus `onClose`, `returnTo` and an optional `working`
(`{ id, workedOn, note, visibility, status, participants }`). With `working` it is titled "Edit
Working", calls `updateWorking` and closes on Save. Only the recorder or a member named on the working may edit (the service
refuses anyone else), and a complete working that is shared holds the switch on and shut, since a
complete working's visibility only widens.

With `working` and a `deleteWorking` prop (`{ name, remove }`), the form also draws a bin named "Delete Working <date>" beside the Save buttons. It asks the same question as the row bin (`DeleteWorkingQuestion`, in `SpellWorkings/delete-working.tsx`) through `ConfirmQuestion`, runs `remove` (the shared `useDeleteWorking` mutation), then closes. The form no longer counts as changed once it is removed, so closing does not ask to discard it. `EditWorkingAction` passes `deleteWorking` only when the row's `canChange` is true, and a new working never has one.

## Completing a working

`WorkingCompletion` reads `workingDeductionPreview` afresh each time it opens, drawing a `Skeleton shape="line"` until it arrives, and lists the spell's
ingredient steps in order, one line each, as the jar the recipe page's In Coven Inventory draws, both through `JarLine`
([`jar-line.md`](jar-line.md): the drawing, the `jar-shelf__jar--low|out|empty` paint, the press, the shake and the growing name) beside the step's name (no step number), and these words:

- A take: "takes X · have Y · left Z", all in the jar's unit, with "short by N" in the warning colour
  when the jar cannot cover it. `have` is what the jar held before this line's take, so two lines on
  one jar show it running down. The preview returns it as `before`, with the jar's Low mark as
  `lowStockThreshold`, from the plan that already read the jars, so it costs no extra read.
  A short line draws its jar Low, whatever the Low mark says.
  Each part is its own span, and the words wrap between parts, so on a phone a part moves whole to the next line.
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

`CompleteWorkingAction` takes `{ workspaceId, spellId, workingId, steps, label?, workedOn? }` and is what a
draft working's row puts beside its other actions. The recipe page sets `label` to "Complete Working <date>".

Stories: `index.stories.tsx`. Browser flows: stories 76 and 78 in
`tests/e2e/stories/06-grimoire.spec.ts`.
