# Autosave

`src/lib/autosave/` and `src/components/SaveStatus/`: a form that saves itself while it is being edited, keeps a copy in the browser until the server has the value, and shows one quiet line saying where the save is. Nothing in either names a spell, so any form can adopt them. The forms that use them are the spell builder, `IngredientForm` and `CupboardEntryForm` (the Annotate dialog), each writing against its row's `revision`.

## The hook: `useAutosave`

`useAutosave(options)` in `src/lib/autosave/use-autosave.ts`. The caller owns the form and its values; the hook decides when to save and calls the caller's `save` to do it.

| Option     | What it is                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `value`    | The form's current values. A change is read by comparing `JSON.stringify(value)`                 |
| `dirty`    | Whether the form differs from what the server last confirmed. Nothing is saved while it is false |
| `enabled`  | False until the caller has somewhere to save to. Changes are mirrored, not saved, meanwhile      |
| `save`     | `save(value, { revision, force, id })`, returning `{ revision, savedAt, id }`                    |
| `delay`    | Wait after the last change before saving. Default 3 s                                            |
| `maxWait`  | Longest wait during continuous change. Default 30 s                                              |
| `mirror`   | The localStorage key for the copy (below). No key, no copy                                       |
| `revision` | The revision the form opened at. Default `null`                                                  |
| `root`     | A ref to the form's root element, for the flush on blur                                          |

It returns `status`, `savedAt`, `error`, `conflict`, `id`, and three actions: `flush()`, `retry()` and `resolveConflict('reload' | 'keep-mine')`.

`status` is one of:

- `idle`: nothing has changed since the form opened, or since a reload.
- `pending`: a change is waiting for its timer.
- `saving`: a save is in flight, or waiting to retry one that failed. `error` stays `null` through the retry waits, and a change or flush during a wait rides on the retry, which sends the latest value.
- `saved`: the server has the latest value. `savedAt` says when.
- `failed`: three retries failed. Autosave stops until `retry()`. Only here is `error` set, so `error` set always means the save has failed for good; a conflict leaves it as it was.
- `conflict`: someone else saved first. Autosave stops until `resolveConflict`.

### What it promises

- **One save at a time.** A change made while a save is in flight queues exactly one follow-up, sent with the latest value once the first returns, however many changes arrive meanwhile.
- **Each save names the revision the last one returned**, starting from `revision`, and the `id` the last one returned, starting from `null`. A new row gets its id from its first save, and the second save updates that row instead of making another.
- **A failure retries after 2 s, 5 s and 15 s** (`RETRY_DELAYS_MS`), then stops at `failed`. The form keeps its state, and the mirror keeps the copy. A refusal (a `VALIDATION`, `FORBIDDEN` or `NOT_FOUND` answer) skips the waits and stops at `failed` at once, because asking again gets the same answer.
- **A `StaleWriteError` from `save` pauses autosave** at `conflict`, carrying the row's revision now. `keep-mine` sends the value again with `force: true` against that revision: the adapter is handed the reported revision as `context.revision`, and the spell builder sends it as `expectedRevision`, so a third save in between is a conflict too, never written over. `reload` drops the unsaved value and its copy and returns to `idle`; the caller reads the row and resets the form from it (the spell builder's `readLatestSpell`, [`spell-builder.md`](components/spell-builder.md), "Two people, one spell").
- **It flushes**, saving at once instead of waiting for the timer, when the tab is hidden, when focus leaves `root` for something outside it, and when the caller calls `flush()` (Mark Complete and Save). `flush()` resolves once the server has the value and rejects if the save ends `failed` or in a conflict, so a caller about to act on the saved row knows it is not there.
- **It asks before the tab closes** while a change is not on the server: it calls `useLeaveGuard` (`src/lib/navigation`) itself, with `onHide` set to its flush. It does not hold in-app navigation: a link press flushes on blur, and the mirror covers the rest.
- **Unmounting does not save.** The copy in the browser is what survives it.

It is a closure created once per mounted form, not React state and effects, because timers and an in-flight promise must see one another's latest state, not the state of the render that set them.

### What an autosave does to the page

The hook knows nothing of headings or addresses. `IngredientForm` calls `onAutosaved(row)` after an autosave that updated an existing ingredient, and `onCreated(row)` after the one that created it ([`ingredient-form.md`](components/ingredient-form.md#autosave)). The host then moves the address to the saved slug where the address names the slug, and fetches the page again so the heading shows the saved name. The engine reads `revision` only when it is created, so the fetch does not disturb it.

### Who flushes, and when

A form with its own Save button must hold the blur flush while Save is submitting: disabling the button blurs it with no related target, and the flush would start a second write. `IngredientForm` does this, and also serialises its writes ([`ingredient-form.md`](components/ingredient-form.md#autosave)).

### Why these numbers

- **3 s after the last change** is GitLab Pajamas' autosave delay: long enough that a sentence being typed is one save, short enough that a pause saves.
- **30 s at most during continuous change** is how often Confluence saves a draft. Without it, someone who never pauses never saves.
- **2 s, 5 s, 15 s** covers a dropped connection or a deploy restart in about twenty seconds, then stops rather than retrying for ever against a server that is down. The person gets a Retry button instead.

`useDebouncedValue` (300 ms) is not used: it is for type-ahead, and has no maximum wait and no flush.

## The mirror

`src/lib/autosave/mirror.ts`: a copy of the form's value in localStorage, so that a closed tab, a crash or a failed save loses nothing.

- **The key** is `mirrorKey({ entity, id, userId })`: `autosave:<entity>:<id or new>:<userId>`. One copy per row and per person, so two people on one browser never see each other's copy.
- **The value** is `{ value, at }`, `at` as an ISO 8601 string.
- **Written on every change**, enabled or not, and while `failed`.
- **Cleared only after the server confirms** the value it holds. A change made while that save was in flight keeps the copy, since the server does not have it yet; clearing the copy when the save is sent rather than when it lands loses typing on a failure. A new row's key changes once it has an id; both copies go together.
- **Not cleared when the form goes back to clean**, since that is the form agreeing with the server, not the server confirming. It is cleared on `reload`, because the person chose to drop their copy.
- **`readMirror(key)` ignores a copy over a day old** and removes it, and answers `null` for nothing stored or something unreadable. Recovery (the spell builder's banner) offers the copy when its `at` is later than the row's `updatedAt`.
- **Every access is in `try`/`catch`.** Storage can throw in a private window or with blocked site data, even on reaching `window.localStorage`. Then there is no copy, and the hook saves as before.

## `SaveStatus`

`src/components/SaveStatus/` has two exports.

**`SaveStatus`** is the line beside the form's primary action that says where the save is. Never a toast: the status describes this form and stays until the next save. Its props are the hook's `status` and `savedAt`, `draft` (say "Draft saved"), `conflictMessage` (the caller's words, so the component names no entity), `onRetry`, `onReload`, `onKeepMine`, `className`, and `conflictInto`: an element the conflict notice is put in instead of this line, so a form in a dialog can show it under the title, in view however far the form has scrolled, while the saved line stays beside Save (the spell builder and `IngredientForm` pass the modal's header note). The failure and its Retry stay beside Save, since they are about that button.

| Status     | Shows                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `idle`     | Nothing                                                                                             |
| `pending`  | The last "Saved" line, if any                                                                       |
| `saving`   | A spinner and "Saving…"                                                                             |
| `saved`    | "Saved 2:02 pm", or "Draft saved 2:02 pm"                                                           |
| `failed`   | A `warn` `Notice` (`role="alert"`) with "Could not save." and a Retry button, until a save succeeds |
| `conflict` | A `warn` `Notice` with the message, Reload Latest (small outline) and Keep My Version (small quiet) |

The time is `clockTime` from `src/components/LastEdit/relative.ts`: hours and minutes on a 12-hour clock with am or pm ("2:02 pm"), in the viewer's time zone, the two joined by a no-break space (`TIME_PERIOD_SPACE`, from `src/lib/utc.ts`) so the am or pm never wraps alone.

**`RecoveryNotice`** (`recovery-notice.tsx`) is the banner a form opens with when this browser kept typing that never reached the server: "Restored unsaved changes from 2:02 pm." with Keep (load the kept typing into the form) and Discard (drop it). Props: `at`, `onKeep`, `onDiscard`. Keep is a small outline button, ahead of a quiet Discard. The form decides whether to draw it and where: the spell builder and `IngredientForm` put it in the modal's header note, as they do the conflict notice. The spell builder and `IngredientForm` use both components ([`spell-builder.md`](components/spell-builder.md), "Saving"); `CupboardEntryForm` uses `SaveStatus` alone.

### Styling

`index.scss` takes tokens only. The line (`.save-status`) is caption-sized and its text muted.

- The failure and the conflict are warnings, not errors and not the quieter caution. Each, and the recovery notice, is the site's `warn` `Notice` with the notice's bottom margin removed by a doubled selector so it stands level with Save in the footer.
- **The conflict notice leads with Reload Latest**, the choice that loses nothing of anyone else's, as a small outline button, so the view keeps its one solid button, Save, and Keep My Version sits back as a quiet button.
- **The failure is a wrapping row with its triangle centred on the row** (`.save-status__failed`): Notice draws the triangle level with the first line of text, which is right for text alone but, beside the Retry button, leaves the line taller than the text. Notice itself is unchanged.
- **The conflict and the recovery notice share one rule** (`.save-status__conflict`, `.save-status__recovery`), on classes of their own since in a dialog they sit under the title. Both include the `notice-row` mixin (`_mixins.scss`): a wrapping row, roomier than a notice of text alone, with `space(3)` between the sentence and the buttons (in `.save-status__actions`), and the triangle placed by the `$notice-mark-size` and `$notice-mark-drop` tokens.

### Announcing once per burst

A screen reader would otherwise hear "Saved" every three seconds while someone types. So the line has two parts:

- **The visible line** is `aria-hidden` and always up to date.
- **A visually hidden `<output>`** (`.save-status__announced`; an implicit `role="status"`, rendered empty first so its later text is announced) changes only for the save that opens a burst: the first save shown, the first after a failure or a conflict, or a save more than 60 s (`BURST_GAP_MS`) after the one before. "Saving…" is never announced.

A failure and a conflict are announced by their own `role="alert"` and the notice's buttons, not by the output.

## The server's half

A save that must not overwrite someone else's names the revision it read.

- **The write**: `write.updateRevisioned(membership, table, id, expectedRevision, values)` in `src/db/repository/write.ts`, for a table that satisfies `Revisioned` (it has a `revision` column; `spells`, and the ingredient tables). The revision check is in the UPDATE's own WHERE, so two saves racing for one revision cannot both land: the second waits on the first's row lock, then no longer matches. Only a write that changed nothing reads again, under `FOR UPDATE`, to tell the two cases apart:
  - a live row of the proof's coven, at another revision: throws `StaleWrite` with `currentRevision`;
  - no such row (another coven's, soft-deleted, or absent): answers `[]`, as `updateByIdInWorkspace` does. `StaleWrite` here would tell another coven's member that the row exists.
- **`expectedRevision: null` writes whatever the row's revision.** The unconditional write, for a caller that read nothing; the spell builder's Keep My Version does not use it, since it names the revision the refusal reported.
- **Over GraphQL**, a revisioned mutation's input takes `expectedRevision: Int` and its payload returns `revision: Int!`. `maskError` in `src/graphql/errors.ts` maps `StaleWrite` to `STALE_WRITE` with `extensions.currentRevision` ([`graphql/errors.md`](graphql/errors.md)).
- **On the client**, the wrapper in `src/lib/graphql-client.ts` rejects a `STALE_WRITE` with `StaleWriteError` (`src/lib/graphql-client-error.ts`), a `GraphQLClientError` subclass carrying `currentRevision`. A caller that reads `GraphQLClientError` reads it unchanged. The hook pauses on it rather than retrying.
