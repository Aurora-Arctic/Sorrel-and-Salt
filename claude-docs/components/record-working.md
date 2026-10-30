# Record Working

`src/components/RecordWorking/` — recording a working of a complete spell from its recipe page, changing one, and completing one (M13.7).

| File                  | What it holds                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`           | `RecordWorkingButton` (default; the icon-only cauldron, `RecordButton` of IconTip), and re-exports of the dialog, `CompleteWorkingAction`, types                |
| `dialog.tsx`          | `RecordWorkingDialog`: the `Modal`, apart from its button                                                                                                       |
| `form.tsx`            | The form inside it                                                                                                                                              |
| `completion.tsx`      | `WorkingCompletion`: the deduction preview and its Mark Complete                                                                                                |
| `complete-action.tsx` | `CompleteWorkingAction`: a Complete button opening `WorkingCompletion` in a dialog                                                                              |
| `warnings.ts`         | `SKIP_REASON` and `skipSummary`: why a step takes nothing, and the one-sentence count of ingredients completing takes nothing for, in words (no `'use client'`) |
| `day.ts`              | `completeReason`: why Complete is off for a working dated after today, in words                                                                                 |
| `types.ts`            | The props                                                                                                                                                       |

## Recording and editing

`RecordWorkingButton` takes `{ workspaceId, spellId, spellName, spellVisibility, recorder, steps }`;
`spellName` ends the button's name, "Record a Working of <spell>", as the Preview and More buttons beside it end with
the spell's name. The recipe
page shows it to a role that may create a working (owner and member) on a complete spell, and
passes `recorder` (`{ userId, name }`, the signed-in member, named from `viewerOf()`, which the shell
layout already read that request) and `steps` (`{ id, name }` for each ingredient step). A spell card's
Record a Working holds the same form but reads `steps` itself once its dialog opens
([`spell-card.md`](spell-card.md), "Record a Working, Edit and the More menu").

The dialog holds a date (today by default), participants (a `Combobox` with chips that searches the coven's members as the user types;
a typed name is added as a name chip), a note, and visibility. Participants is a `<fieldset>`, so while a save runs it shuts with the other fields, chips and all, and a refused name describes the box through `FieldError`. The participant box asks `workspace(id).members(search:)` through `/api/graphql` (`RecordWorkingMembers`, on the shared `useLookup` hook: 300ms debounce, ten rows), only once text is typed, since the box takes the focus when the dialog opens; an empty box suggests nobody. The members already taking part are left out of the answer, and a member the server cannot name is "A former member". Visibility never exceeds the
spell's, and is the same `VisibilitySwitch` (in `Field`) the spell builder uses, here in its long form labelled Share With the Coven and start-aligned by `.working-form .switch` as the ingredient form's Toxic switch is: on a private spell it is off and shut, with a line saying why. A new working opens with the recorder (`recorder`) as a chip, who may remove themselves; the dialog always sends `participants`. A Workings row says "Recorded by" the recorder and lists only the others after "With", so a stored recorder is never named twice (`workings-read.ts` filters them out).

Save Working keeps a draft, closes the dialog and refreshes the page, where the draft is a row of the
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

With `working` and a `deleteWorking` prop (`{ name, remove }`), the form also draws a bin named "Delete Working <date>" beside the Save buttons, the one place a working is deleted, since a row carries no bin. It asks `DeleteWorkingQuestion` (in `SpellWorkings/delete-working.tsx`) through `ConfirmQuestion`, runs `remove` (the shared `useDeleteWorking` mutation), then closes. The form no longer counts as changed once it is removed, so closing does not ask to discard it. `EditWorkingAction` passes `deleteWorking` only when the row's `canChange` is true, and a new working never has one.

## Completing a working

`WorkingCompletion` reads `workingDeductionPreview` afresh each time it opens, drawing a `Skeleton shape="line"`, a line for each ingredient step, until it arrives, and lists the spell's
ingredient steps in order, one line each, as the jar the recipe page's In the Cupboard panel draws, both through `JarLine`
([`jar-line.md`](jar-line.md): the drawing, the `jar-shelf__jar--low|out|empty` paint, the press, the shake and the growing name) beside the step's name (no step number), and these words:

- A take: "takes X · have Y · left Z", all in the jar's unit. A jar that cannot cover the step reads
  "needs X · have Y · short by N" instead, with "short by N" in the warning colour: it is emptied, so
  the need leads and no "left" is said. An empty jar says "have none", as the In the Cupboard panel does.
  `have` is what the jar held before this line's take, so two lines on
  one jar show it running down. The preview returns it as `before`, with the jar's Low mark as
  `lowStockThreshold`, from the plan that already read the jars, so it costs no extra read.
  A short line draws its jar Low, whatever the Low mark says.
  Each part is its own span, and the words wrap between parts, so on a phone a part moves whole to the next line.
- A one-off: a muted jar and "one-off · not kept".
- A step with no jar: a dashed empty jar and "have no jar · takes nothing".
- Any other skip (units differ, no amount, jar not measured): the reason and "takes nothing", over a
  steady jar with no level, since the preview carries no jar quantity for a line that takes nothing.

A step that carries `stock` (the same `StockDialogProps` the In the Cupboard panel's line gets, so only
for a role that may edit stock, and never for a deleted ingredient or form) wraps its name and jar in a
`StockJarButton`, which opens Edit Stock as it does on the recipe page. Its `onSaved` then reads the
preview again, so have, left and short by are redrawn before Mark Complete. The stock dialog is a second
modal opened over the Record a Working one. A step without `stock` keeps a plain drawing: the
recipe page builds `stock` from the aside's doors, and the spell cards' Record a Working carries none,
so a card's jars are not clickable.

The sentence above the list says "Completing this working takes the following from the coven’s jars.",
or "Completing this working takes nothing from the coven’s jars." when no line takes anything. Mark Complete
(busy "Marking Complete") runs `completeWorking`, reads the page again and shows the same list, so it reads the same
before and after. Beside it, Keep as Draft goes back without completing: the working is already saved as a draft. The preview and the completion share one plan on the
server (`plan-deductions.ts`), so the two agree.

`CompleteWorkingAction` takes `{ workspaceId, spellId, workingId, steps, label?, workedOn? }` and is what a
draft working's row puts beside its other actions. The recipe page sets `label` to "Complete Working <date>".

Browser flows: stories 76 and 78 in `tests/e2e/stories/06-grimoire.spec.ts`.

## Styling

`index.scss`, tokens only:

- **The form** (`.working-form`) starts Share With the Coven's switch at the line's start, as the ingredient form's Toxic switch is, rather than centred as the filter bar's.
- **The deduction preview** (`.working-deductions`) is a column of `JarLine`s `space(3)` apart with no marker. A long name wraps rather than being cut, and each line's parts wrap whole at `type-size('small')` with tabular figures. A short line (`.working-deductions__short`) is in `$warning`.

## Stories

`src/components/RecordWorking/index.stories.tsx`, titled "Grimoire / Record Working": `States`,
with a control that chooses one of Closed, Open, Private Spell, Deduction Preview, Shortfall, Edit
Working, Edit Complete Working, Delete Working, Complete Working (a draft row's flask pressed, opening
the dialog titled Complete Working over the deduction preview) or Dated Ahead.
