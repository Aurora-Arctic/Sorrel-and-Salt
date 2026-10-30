# SaveStatus and RecoveryNotice

`src/components/SaveStatus/` holds what an autosaving form shows about its saves. It has two
exports:

- **`SaveStatus`** (the default export) is the line beside the form's primary action that says
  where the save is: nothing, "Saving…", "Saved 2:02 pm", or a warning notice when a save failed or
  met someone else's change. What each state shows, and how the line is announced once per burst of
  saves, is in [`autosave.md`](autosave.md), "`SaveStatus`".
- **`RecoveryNotice`** (`recovery-notice.tsx`) is the banner a form opens with when this browser
  kept typing that never reached the server: "Restored unsaved changes from 2:02 pm." with Keep
  (load the kept typing into the form) and Discard (drop it). Keep is the one solid button, since it
  loses no typing; Discard is quiet.

The spell builder and IngredientForm use both ([`spell-builder.md`](spell-builder.md), "Saving"). CupboardEntryForm uses `SaveStatus` alone.

## Props

`SaveStatusProps` (`types.ts`):

| Prop              | What it is                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `status`          | `useAutosave`'s status                                                                                     |
| `savedAt`         | When the server last confirmed a save, or null                                                             |
| `draft`           | Optional: true while the record is a draft, so the line reads "Draft saved 2:02 pm"                        |
| `conflictMessage` | What a conflict says, naming the record ("This spell was changed elsewhere."), so the component names none |
| `onRetry`         | Retry, on the failure notice                                                                               |
| `onReload`        | Reload Latest: drop this copy for the server's                                                             |
| `onKeepMine`      | Keep My Version: send this copy over the server's                                                          |
| `conflictInto`    | Optional: an element the conflict notice is put in instead of this line, such as a modal's header note     |
| `className`       | Optional: added to the line's own class                                                                    |

`RecoveryNoticeProps` (`types.ts`):

| Prop        | What it is                                                  |
| ----------- | ----------------------------------------------------------- |
| `at`        | When the kept typing was last written, shown by `clockTime` |
| `onKeep`    | Load the kept typing into the form                          |
| `onDiscard` | Drop the kept typing, leaving the form as the server has it |

The form decides whether to draw `RecoveryNotice`, and where: the spell builder and IngredientForm put it in the
modal's header note, under the title, as they do the conflict notice.

## Styling

`index.scss` takes tokens only. The line (`.save-status`) is caption-sized; its text
(`.save-status__text`) is muted. The failure (`.save-status__failed`), the conflict and the recovery
notice are each the site's warning `Notice`, with the notice's bottom margin removed by a doubled
selector so it stays level with Save. The failure is a wrapping row with its triangle centred on the
row, since Retry makes the row taller than the text. The conflict and the recovery notice share one
rule (`.save-status__conflict`, `.save-status__recovery`) on classes of their own, since in a dialog
they are put under the title. Both include the `notice-row` mixin (`_mixins.scss`): a wrapping row, roomier than a notice of text alone, with `space(3)`
between the sentence and the buttons, which sit in `.save-status__actions`, and the triangle placed by the `$notice-mark-size` and `$notice-mark-drop` tokens. The live region
(`.save-status__announced`) is visually hidden; the line is what shows.

## Stories

`index.stories.tsx`, titled "Feedback / Save Status":

- `States` is a grid of every state the line takes: Idle, Pending, Saving, Saved, Draft Saved,
  Failed and Conflict.
- `Recovery` is the recovery notice alone.

## Testing

`tests/components/SaveStatus/index.test.tsx` proves each state, the once-per-burst announcement,
and the conflict notice going where `conflictInto` points. The recovery notice's Keep and Discard are proved through the spell
builder's tests (`tests/components/SpellBuilder/autosave.test.tsx`). Axe runs in Playwright, on the
spell builder.
