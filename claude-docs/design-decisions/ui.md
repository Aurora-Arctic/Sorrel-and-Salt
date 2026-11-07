# UI decisions

How the interface is styled, navigated and given feedback, and the design reviews that settled screens.

## Component styling is global Sass with BEM names, not CSS Modules

**Decided:** every component keeps a plain `index.scss`, imported as a global stylesheet, with BEM class names (`block__element--modifier`) that stylelint enforces. No `.module.scss`. The summary is [`styling.md`](../styling.md), "Binding rules", and DESIGN.md §9, "Componentized Sass". The record rides in M6.14's PR as an along-the-way fix, because the choice needed writing down rather than a task.

### Why

The owner asked why the components do not use CSS Modules. They were a recorded choice already, but the only recorded reason was DESIGN.md's stack table reading "Matches `resume-2026` conventions", and that repo is no longer a reason this one honours. Without the argument the choice would be re-asked, so here it is.

**The primitives are addressed by class, from JSX and from inside component rules.** `_primitives.scss` emits one class layer from `globals.scss`: `.btn` and its variants, `.field`, `.input`, `.page-frame`, `.data-table`, `.chip`, `.badge--*` and the rest. Components use those classes as plain strings. Counted at the time of writing, across `src/components` and `src/app`: about 70 `btn` uses, 30 `page-frame`, and 40 `field` or `input`. Components also style the primitives inside them, as `.user-list .data-table td` and `.member-list .btn` do. Under CSS Modules every one of those becomes a `:global()` wrapper, or an import of a shared primitives module, in nearly every component. That is the cost, and it is paid everywhere.

**What Modules would buy is already held by a linter.** Modules hash class names so that two files cannot collide. Here the BEM prefix does that, and `.stylelintrc.json`'s `selector-class-pattern` refuses any class that is not `block__element--modifier`, so a collision is a lint failure rather than a convention. Tests select by role and label only, never by class, so hashing would change nothing for them.

**Per-route CSS does not depend on Modules.** Next chunks CSS from the import graph with `experimental.cssChunking` on by default, for global stylesheets and modules alike. The production build in `.next-e2e` at the time of writing emitted 44 CSS chunks, and the one prerendered page, the not-found page, linked three of them: the fonts with `globals.scss`, and two small per-component chunks. A component's `index.scss` reaches only the routes that render the component either way.

### What it rules out

- A `.module.scss` anywhere under `src/components` or `src/app`. A component that needs a class another component also uses takes it from `_primitives.scss` as a mixin emitted once, the way `data-table--roomy` is, not from a shared module import.
- Any second scoping system beside BEM. The lint rule is the guard; a class that does not fit it is renamed, not exempted.

### Left open

`experimental.cssChunking: 'graph'`, Turbopack's cost-based grouping, trades more requests for less unused CSS per route. `next.config.ts` leaves it unset, and nothing measured calls for it. Turning it on is a config change, not a styling change, and this record does not need revisiting for it.

## The browser floor

### Decision

The floor is **Baseline Widely Available**: a feature may be used freely once Chrome, Edge, Firefox and Safari have all shipped it for 30 months. Below the floor the app degrades and never breaks. Continuous integration (CI) stays on Chromium only; a WebKit, Firefox and phone run of the end-to-end suite is an occasional local audit (M10.25), never a gate.

### Why

Before this, the only statement was one bullet in `claude-docs/styling.md`: Next's default targets (Chrome, Edge and Firefox 111, Safari 16.4), frozen on 2025-10-01. Nothing enforced it, and the code had already passed it: `:has()` needs Firefox 121 and `URL.canParse()` needs Chrome 120 and Safari 17. A floor nobody can check is a floor nobody holds.

### Options the plan weighed

1. **Keep Next's frozen defaults.** No work, but the number is old and unenforced, and the code already broke it.
2. **Baseline Widely Available as a rolling query** (chosen). `"browserslist": ["baseline widely available"]` moves forward each month with the data the lockfile pins. The floor only rises, so a check that passes today passes tomorrow. Lightning CSS, which Turbopack uses for CSS, reads the same entry, so one line drives both the lowering and the lint.
3. **A pinned date** (`baseline widely available on YYYY-MM-DD`). Rejected: it is the hand-kept version list the owner chose not to maintain, under another name.

### What holds it

| Part                                                  | What it does                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `browserslist` in `package.json`                      | The one statement. On 2026-10-12 it resolved to Chrome and Edge 123, Firefox 124, Safari and iOS Safari 17.4. The build still lowers `light-dark()`, since Safari 17.5 is the first to support it.                                                       |
| `stylelint-plugin-use-baseline` in `npm run lint:css` | Refuses CSS past the floor, with `available: "widely"`. It ignores Sass's `@function` (not the CSS at-rule) and `light-dark()` (lowered by the build).                                                                                                   |
| `tests/guards/browser-floor.test.ts`                  | Holds client-reachable TypeScript. A hand-kept list of web APIs past the floor; each needs a `typeof` or `in` check on its line. It reads each entry's date from `web-features` and fails with "delete this entry" once the feature is widely available. |
| The design-review line                                | Each section review runs `npm run lint:css` and looks at the section in Safari and Firefox (`claude-docs/styling.md`, "Designing a section").                                                                                                            |

### What the first run found

The lint reported 30 places. Nine `@function` and three `light-dark()` reports were Sass or lowered output, handled by the two ignore options. The rest are pure enhancements, each carrying a disable comment that names what is lost and the date it becomes widely available (or `not yet Baseline` where `web-features` gives none): six `@starting-style` fade-ins, `text-wrap: balance`, `scrollbar-gutter`, `scrollbar-width`, `overscroll-behavior` (and `-x`), `resize`, `accent-color`, three `forced-color-adjust` declarations, the unprefixed `line-clamp` and `animation-range`. The plan also expected `content: attr(data-label) / ''` to be reported; the plugin checks identifier values only, so it was not. It stays documented in `claude-docs/styling.md`.

The guard's seed list holds four APIs past the floor on the day (`Set` methods, `Promise.try`, `RegExp.escape`, `Float16Array`). None occurs in `src/` today.

### Not decided here

The local cross-browser audit and `npm run e2e:audit` are M10.25.

## Form icons: on the group, with a generic

### The question

[`backlog.md`](../backlog.md) asked "Icons for forms?": should a form (Herb, Root,
Resin and so on) carry a small mark, so that a list of forms scans
before it is read? The owner wants that scan.

### The decision: the icon lives on the group, not the form

Each row of `ingredient_form_groups` gains a nullable `icon`, one of six names:
`botanical`, `animal`, `mineral`, `substance`, `fluid`, `curio`. Every curated
form gets its icon through its group, shown beside the form wherever forms are
listed. This mirrors how a category group carries its chip colours as data on
the row (§5).

Why the group and not the form: a variant's `form` is free text, and a value
the vocabulary does not list has no row to hold an icon. A per-form icon could
therefore never cover every form. A group covers every curated form at once,
and the generic icon covers the rest.

### The generic is a structural necessity, not an option

A variant whose `form_id` is NULL (an uncurated form), or whose group has no
icon, still has to show something. That is the generic icon. It is not an
optional extra: without it those variants would sit in a list with no mark
beside them, and the list would not scan.

### The spoon's provenance

The generic is a salt spoon, drawn on the Backdrop's `salt-spoon.webp` and
locked by the owner on 2026-10-16 on the workshop page. Its SVG path is kept in
It
replaces the flask as the Forms mark in the admin nav, so one mark means "a
form" everywhere.

The six group icons are not drawn yet. M12.7 draws them and stops for the
owner's sign-off before anything else in that task is built.

### What the column means

- **NULL is the generic.** M12.7 draws it.
- **An update with no icon clears it.** An update rewrites the group whole, and
  the services write `icon ?? null` on create and on update. Over GraphQL,
  `icon: null` clears for the same reason: the transport's `definedArgs`
  turns a null input field into an absent one before the service reads it.
- **The list lives once**, in `src/modules/vocabulary/schema/form-group-icons.ts`
  (`FORM_GROUP_ICONS`, which imports nothing, as `ingredient-enums.ts` does). It
  feeds the Postgres enum `form_group_icon`, the Zod input, the seed and M12.7's
  `FormIcon` component.
- **The backfill runs once.** `0076_form-group-icon.sql` adds the type and the
  column; `0077_backfill-form-group-icons.sql` fills the six seeded groups, keyed
  on `seed_key`, only where `icon IS NULL` and the row is live, stamped as the
  bootstrap user, on the pattern of `0052_retune-category-group-colours.sql`. It
  runs straight after the column exists, so no keeper can yet have cleared an
  icon. After that a cleared icon is honoured by the seed, which inserts only
  missing rows and never updates a present one.
- **`CategoryGroupInput` no longer extends `IngredientFormGroupInput`.** A
  category group takes no icon, so it builds its own `curatedValueInput('group')`.

### What was rejected

- **A per-form icon.** Uncurated forms have no row, so it could never cover every
  form (above).
- **No icons.** The owner wants a list of forms to scan before it is read.
- **A CHECK constraint over the six names.** Adding a seventh icon would be a
  `DROP CONSTRAINT`, which needs an acknowledgement sidecar under the
  destructive-DDL rule. An enum grows by `ALTER TYPE … ADD VALUE`, which is
  expand-only.

### Where it lands

- [`DESIGN.md`](../DESIGN.md) §5 (the `ingredient_form_groups` entry) and §9 (the
  SDL: `FormGroupIcon`, `IngredientFormGroup.icon` and the two mutation notes).
- [`db/form-vocabulary-seed.md`](../db/form-vocabulary-seed.md) and
  [`db/categories.md`](../db/categories.md).
- [`graphql/schema.md`](../graphql/schema.md), the `fields` and `input` bullet.

## Undo and redo in the forms

**Status:** decided. Live home: `claude-docs/components/field.md`, "Undo and redo" and "How the undo and redo chords are heard".

### Decision

1. **One stack per saved thing, newest first.** Ctrl+Z and the Undo button both undo the most recent change in the form, wherever focus is. A reference panel saves itself, so it keeps its own stack (its own `useFormHistory` and `FormHistoryButtons`), and its handler stops propagation so the outer form never sees its chords.
2. **The form owns Ctrl+Z, including inside text boxes.** Typing in one field groups into one step per pause of about half a second, or until focus leaves the field. The browser's per-keystroke undo is suppressed inside the form.
3. **Chords.** Redo is Ctrl+Shift+Z and Ctrl+Y; Cmd+Z and Cmd+Shift+Z work as well. Either modifier is accepted on every platform, with no `navigator.platform` check. Cmd+Y is not bound, because it opens Chrome's history.
4. **Always `preventDefault` for these chords inside the form**, even with nothing to undo, so the browser's stale native stack never reverts a text box behind the form's back (after Save & Add Another, say). With nothing to do, announce "Nothing to undo".
5. **A step is a set of field diffs, applied newest-first with `setValue(name, before, { shouldDirty: true, shouldValidate: isSubmitted })`.** Diffs rather than snapshots, because their names tell the hook where to send focus and because `setValue` leaves errors, `submitCount` and field registration alone where `reset` would not. Newest-first makes each step apply on the state it was recorded from. Diffs in the same tick join one step (picking the `none` nomenclature empties `canonicalName`, so one Ctrl+Z undoes the pick). `setValue` on a field-array name notifies `useFieldArray`, so a removed or reordered row returns. `shouldDirty` recomputes against the defaults, so undoing to the start disables Save and releases `useDiscardGuard`. The cap is 100 steps, and a new step after an undo empties the future.
6. **The handler stands down** when disabled, `defaultPrevented`, composing, `altKey`, the target is inside an open combobox (`[aria-expanded="true"]`; downshift owns its keys) or `ignore(target)` says so.
7. **After a step**, `onRestored(names)` runs first so a closed section or card opens. Focus then goes to the `[name]` element of the first diff; for an array diff, to the first control inside the fieldset holding the array, else the legend's fieldset (`tabIndex={-1}`). If nothing is found, focus goes to the Undo button, never `body`. A labelled live region announces the step ("Undid change to Name"), told apart from the list fields' own regions.
8. **Validation mode is kept.** Forms are `mode: onSubmit`, `reValidateMode: onChange`; no errors appear before the first submit, and errors follow a restore after it. Server errors from `setError` stay until the next submit.

### Why

The user cannot see the stacks, so focused-field-first or per-variant undo could not be predicted: they would not know which of three answers a press gives. One model, newest first, is one rule to learn.

### Rules out

- Focused-field-first undo and per-variant stacks.
- Whole-form snapshots and `reset` as the restore.
- Binding Cmd+Y.
- Letting the browser's native undo run inside the form.

## Feedback from a click outside a form

**Status:** decided and being built: Design F, chosen by the owner on 2026-10-20, replacing `ActionFailure` everywhere · **Date:** 2026-10-19, decided 2026-10-20

The owner dislikes where Add to Cupboard shows its failure: to the right of the
button (`CupboardActions`, `src/components/IngredientEntry/cupboard-actions.tsx`).
That raised a wider question: when a person presses a button that sits outside
any form, how should the page say what happened, whether it worked or not? This
record scopes the question, inventories the controls it covers, sets out what
the research says, describes six designs, and records the owner's choice of one. **The owner
chose Design F, the floating callout, on 2026-10-20.** Section 5 is the rule it
makes. The owner then decided that M12.31 builds F itself, in four parallel
lanes, rather than minting follow-up tasks, and that F replaces `ActionFailure`
everywhere (the question this record left open, now answered in section 5).
Section 6, "Built in M12.31", lists the lanes.

The first version of the task asked only about errors. The owner's review widened
it to all feedback, so the task's title and entry now say so
([`tasks/m12.md`](../tasks/m12.md), M12.31).

An interactive comparison of the six designs, with the four screens and a
screen reader log, is published as a private page:
<https://claude.ai/artifact/R9BzSPjPbhKbvhbyLKREhm>. The footnote labels in this
record are that page's source numbers.

### 1. Scope and exceptions

The question covers a **click control that is not inside a form**: a button, a
menu item, or a row action that sends a request when pressed (or, for the
confirmed actions, opens a question that sends one). The reasons for each edge:

- **Forms are out.** A form already has a place for its sentence about the
  whole view (a `Notice` for its root error and for its sent confirmation) and
  its own field errors, and its submit button is the one control that speaks
  there. [`notice.md`](../components/notice.md) describes that use. Nothing
  here changes it.
- **Modals and confirm overlays are out.** When the question, the confirm
  button and the failure are all inside the dialog, the person is already
  attending to that dialog, and it can carry its own alert. `OwnerExit` does
  this today: it holds its own `ActionFailure` inside the dialog
  (`LeaveWorkspaceButton/owner-exit.tsx`). The dialog is the place for the
  message. Once F replaces `ActionFailure`, that alert becomes a plain `Notice`
  in the dialog (section 5, item 6).
- **A click that navigates is an exception to the success half.** Accept on an
  invitation takes the person to the coven; Sign Out and the sign-in buttons
  leave for another page. The new page is the confirmation, and the button
  stays busy until it arrives, so a success message would be said once and then
  discarded with the page. Such a control needs no success feedback. It does
  need failure feedback, because on a failure the person stays where they are.
  This follows the sources' advice to skip a success message when the interface
  already shows the result (Primer and GOV.UK both say so).[^8][^12]
- **A confirm modal followed by a failure on the page is borderline, and is
  treated as in scope for the message.** Revoke, Remove, Change Role, Leave
  Coven and the like open a modal; the confirm button in it sends the request.
  The confirm click is excluded as a click in a modal. But the failure always
  arrives after the modal has closed (`UserList/confirmed-action.tsx` sets the
  step back to idle and only then reports), so the sentence lands on the page,
  not in the dialog. The person is then looking at the row they acted on. So
  the **message** follows the same rule as a direct control, and its place is
  the open button's place. The **confirm click** and what happens inside the
  dialog stay out of scope.

Two limits on this record's reach: Better Auth controls are in scope even
though they never call `graphqlRequest` (section 2 explains), and nothing
here applies to a refusal that is not the result of a click, such as a page
that fails to load.

### 5. Decision: Design F, the floating callout

**The owner chose Design F on 2026-10-20.** Until now this record recommended D.
F keeps D's split between success and failure, and changes only where the failure
shows: in a callout (a small box with an arrow) that floats under the control
instead of taking up room in the page. The interactive page shows it in its
sixth version; the figures below are our own checks on that page, made in
Chromium only (see "What F costs and leaves open").

The rule:

1. **Success is the visible result plus a polite `role="status"`.** As in D. If
   the page already shows the result (a row gone, a role word changed, a held
   mark), that is the confirmation for a sighted person. A single polite status
   region, in the page before any use, says the same in words for a screen
   reader, without moving focus. A click that navigates (section 1) says
   nothing.[^1][^2][^4][^25]
2. **Failure is a floating `role="alert"` callout under the control.** It carries
   the service's own sentence, as `ActionFailure` does today, and a failure
   returns focus to the control.[^1][^20] A direct button keeps its focus
   anyway. A confirmed action, which opens a question first, does not:
   `src/components/UserList/confirmed-action.tsx` returns focus only when the
   person presses Cancel, so the build makes it return focus to the open button
   on a failure too. F replaces `ActionFailure` everywhere, above tables and on
   phone card rows included (the owner's decision, 2026-10-20).
   - **Placement.** Under the control, left-aligned with it. If that would run
     out of the `.app` box (the page's content box), the callout is right-aligned
     to the control instead; if even that does not fit, it is pinned to the box's
     edge. Its arrow points at the middle of the control. The gap from the
     control to the callout is 20px, which leaves the arrow's tip about 11.5px
     from the control; the owner asked for about 8 to 12px.
   - **It never moves the layout.** It is absolutely positioned (taken out of the
     page's flow). The design page measured this: with 17 controls at three
     widths (1280px, 1280px with the narrow-screen layout forced, and 375px), no
     element moved, the worst shift 0px. This is ours, from Chromium only.
   - **No timer.** It stays until the person closes it, presses the control
     again, or the page changes.[^20] The sources give no researched time a
     message must stay up (section 3), so a timer would be a guess.
   - **Closing it.** An X button at the top right, named "Dismiss"
     (`aria-label="Dismiss"`), 24 by 24px. Its ink inverts with the theme:
     `--fg` in the light theme and white in the dark, because the app has no
     white token. Escape also closes the callout, and so does focus or a pointer
     press moving outside the control, its badge and the callout (the pattern
     `CategoryChips/category-more.tsx` already uses). The reason is WCAG 2.4.11,
     Focus Not Obscured (Minimum): a callout left open after focus moves on
     can cover the element that now has focus.[^36] Closing returns focus to
     whatever opened the callout: the badge, if the badge reopened it, otherwise
     the control. Focus return does not wait for the fade-out. When the close
     is itself a move of focus or a press elsewhere, focus stays where the
     person put it and is not pulled back.
   - **One per screen.** A second failure, anywhere, closes the first callout;
     the first control keeps its badge. MDN asks that alerts be used
     sparingly, since several at once make a bad experience.[^3]
3. **The warning badge reopens the callout.** After a failure, a small warning
   badge sits by the control. It is a real `<button type="button">`, named
   "Show the error for" plus the control's own accessible name, so that Accept
   and Decline on one row get different badges. This is the toggletip pattern
   (a tip opened by a press rather than by hovering, with an empty status region
   behind it so a screen reader announces it) that Pickering describes;[^32] the
   badge carries `aria-expanded` and `aria-controls` naming the callout, and a
   click, Enter or Space reopens the callout through its live region so it is
   announced again.
   - **Placement.** Top right of a bordered button; just right of the text,
     centred vertically, on a quiet (borderless) button.
   - **Size.** The badge is 19.2px square, with an invisible hit area of 24 by
     24px. WCAG 2.5.8 asks for targets at least 24 by 24px, with an exception
     where a 24px circle centred on an undersized target meets no other
     target.[^35] The hit area grows only back over the badge's own control,
     never outwards, so it overlaps no neighbour. That is our way of meeting it;
     the criterion allows others.
   - **Keyboard.** The badge is a tab stop directly after its control. Moving
     focus from the control to its badge, or from the badge into the callout,
     stays inside the group the close-on-outside rule watches (item 2), so it
     does not close the callout; moving on from the group does.
   - **The control's description.** The failed control is `aria-describedby` the
     failure text until its next press, which removes the badge and the
     description. That is our inference: no source tests it.
4. **Fades.** The callout and the badge fade in and out in the app. The code
   already has the pieces: the `arrived` mixin (`src/scss/_mixins.scss`) runs the
   `list-frame-fade-in` keyframe (`src/scss/_primitives.scss`), and
   `SkeletonFade` (`src/components/SkeletonFade/index.scss`) runs the same
   keyframe in reverse for a fade-out. The owner asked for `$motion-short`
   (150ms, `src/scss/_variables.scss`); `arrived` defaults to `$arrive-duration`
   (200ms), so the build passes `$motion-short` to it. Under
   `prefers-reduced-motion` the `reduced-motion` mixin removes the animation, so
   both show and hide at once. A fade-out needs the element kept until the
   animation ends; focus return and `aria-expanded` do not wait for it.
5. **Where focus goes when a row removes itself is not decided here.** A row
   that vanishes takes its focused button with it, and the sources are silent on
   where focus should land (section 3). The owner decided on 2026-10-20 that
   the page heading is the landing, and that the work belongs to M8.17, whose
   session accepted it: M8.17 already chose the heading as the landing for a
   closed modal (its commit 4b5cdb96 says focus goes back through the modal and
   route modal, with the page's heading last). M12.31 does not touch focus
   after a removal.
6. **Modals keep their own alert inside.** A failure inside a dialog stays
   there. The `ActionFailure` inside `LeaveWorkspaceButton/owner-exit.tsx`
   becomes a plain `Notice` in the dialog, since `ActionFailure` is removed.
   Every in-dialog confirmed action keeps its own plain `Notice`, Delete in
   that dialog included, on its own full-width line above its button row; the
   dialog's own notice at its top is Promote and Leave's alone (the owner's
   calls, 2026-10-20). Above the row rather than inside it because the browser
   check found the notice, set between Delete Coven and Cancel, squeezed Delete
   until it wrapped and, at 375px, pushed Cancel past the dialog's edge. The
   shared `.modal__actions` style places it there with `order`, so the
   document order stays the button's.

   **The exception: the keeper's user modal** (the owner's call, 2026-10-20).
   Change Role, beside Role, and Approve or Revoke, beside Coven Creation, say
   a refusal in the callout under the control, with its badge, as they do on
   the list's rows, and draw no notice. They are confirmed actions like the
   others: each asks its question in the dialog (`ConfirmOverlay`) before it
   sends, and the refusal arrives once that question has closed. What sets
   them apart is where the control stands: beside a fact, in a value of the
   modal's list, not in a button row at the dialog's foot, so the callout
   points at the fact that did not change, and the rows below do not move
   (`ConfirmedAction`'s `refusalInModal="callout"`). The callout is fixed and
   stands over the dialog's content, clipped by none of its boxes, and Escape
   closes it alone, not the dialog (`tests/e2e/workshop/user-detail.spec.ts`).
   Impersonate, in the same modal, asks through `ConfirmQuestion` and keeps
   its notice; Delete in `OwnerExit` and every other in-dialog action keep
   theirs above the button row.

**Why F over D.** D's failure alert takes a line of space under the control, so
the rows below it jump when it appears and again when it goes. The owner does not
want the layout to move, and that is the reason for F. It keeps what the sources
favour in D: a plain, persistent alert near its cause, no timer, a way to close
it, a polite status for success, and nothing that takes focus.[^9][^11][^20][^25]
The badge answers the one thing a floating box gives up, that a closed callout
leaves nothing behind: the person can bring the message back, by touch as well as
by keyboard.[^31][^32] Against the others, F has the reasons D had: it keeps the
message at the control (against B), shows the whole sentence as visible text
(against C), and avoids the design the sources most often advise against (E).

**What F costs and leaves open.**

- **It covers what lies under it** until it is closed: the rows below the
  control, and their buttons. The callout is a non-modal layer on the page, so a
  covered button cannot be pressed until the callout is closed, by Dismiss,
  Escape, or focus or a press moving outside it (item 2 of the rule). Whether the
  press that closes it also reaches the button under it is for the build to
  settle and the owner to judge on use.
  On the design page F's callout stayed inside `.app` and on top in all 51 runs
  of its check, but whether covering is acceptable on a long list is the
  owner's to judge on use.
- **It needs placement code.** D needs a status region and a space; F also needs
  the rule in item 2 (flip right, pin to the box edge) and a check that it does
  not leave the screen. It is the only design with this cost.
- **It is untested** in a screen reader, in Safari or Firefox, and on a phone.
  Every measurement above is from Chromium on the design page, run through a
  remote Playwright browser: 54 of 54 badge checks, 16 of 16 for the X button, no
  shift at three widths. The page's "Screen reader hears" log is the page's own text, not a
  recording from a screen reader. The fades are the owner's requirement and are not measured. The
  sources are about toasts, banners and forms, not this case, and the mount-time
  behaviour in section 2 is still unsettled.
- **A demo quirk, not a design fault:** on the page, focusing a failed control
  with a mouse grows its "Screen reader hears" caption by about 26px, which can
  swallow the click that follows. We left it, since the caption is the page's
  scaffolding and not part of F.
- **F replaces `ActionFailure` everywhere (the owner's decision, 2026-10-20).**
  This record asked whether F should replace the wrapper above tables or sit
  beside it, and recommended keeping the wrapper there. The owner decided
  otherwise: one pattern for every click outside a form. The costs of that
  choice stand. On a phone card row or in a narrow table cell the callout
  covers the next row's buttons until it is closed, and the wrapper's single
  alert for a whole group is gone, so each control reports for itself and a
  second failure closes the first callout (item 2). `ActionFailure`, its story,
  test and doc are removed in M12.31, and its three pages (the coven page, the
  members page and the account page) use F instead.

**What becomes of Add to Cupboard's message.** Today it is the last child of the
flex row, to the right of the button, with no `ActionFailure` around it
(`CupboardActions`, `src/components/IngredientEntry/cupboard-actions.tsx`). Under
F the failure becomes a callout under the button, with the badge top right of the
button, the failure text described to the button until its next press, and no
change to the row's width or height. Its success is the page re-reading: the item
is replaced by Annotate, Make It Ours and Remove, and a held mark appears. The
polite status adds "added to your cupboard" in words. Not verified: whether the
row survives the re-read so its status region exists before use, and where focus
is after the menu closes.

### 6. Built in M12.31

The owner decided on 2026-10-20 that M12.31 builds Design F itself, in parallel
agent lanes, rather than naming follow-up tasks to mint.
Each estimate is ours, by comparison with
tasks of similar size in `tasks/m12.md`; none is measured. Lane A runs first,
because the other three build on its API; B, C and D then run in parallel.

| Lane | What it builds                                                                                                                                                                                                                                        | Estimate |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: |
| A    | The core, a new `ClickFeedback` component: the polite status region and its `announce`, the `useClickFeedback` hook, the callout (placement, Dismiss, Escape, close on focus or press outside, focus return, one per screen), the badge and the fades |     ~10h |
| B    | Table and row controls, and removing `ActionFailure`: the `UserList` hub (`confirmed-action.tsx`), the invitation, member and account controls, Leave and Delete Coven; `ActionFailure`'s component, story, test, doc and three pages go              |      ~5h |
| C    | Standalone controls: `CupboardActions` (Add to Cupboard, entry Remove and Make It Ours share one callout) and `InvitationAcceptance` (`/invite/[token]` Accept)                                                                                       |      ~3h |
| D    | Better Auth controls: Sign Out, Stop Impersonating, Sign-In Methods (Add, Remove, Sign In Again) and the sign-in provider buttons; errors the server seeds in the address stay as `Notice`                                                            |      ~3h |

The lanes total about 21h. With the 2h of scoping, M12.31's estimate is 23h.

The sixth row of the earlier list, **focus to the page heading when a row
removes itself**, is no longer in M12.31: it moved to M8.17 (section 5, item 5).
The earlier list also priced a polite status region with a screen reader check
of its mount-time behaviour as a task of its own; the status region is now part
of Lane A, and no real screen reader is available, so the check is made in the
browser only and says so.

**Verification, once, at the end:** `npm run pre-commit`, `npm run lint:css`
and `npm run format:check`; `npm run test:coverage`, `npm run test:stories`
and the e2e suite on its own port base; a production build into its own
`NEXT_DIST_DIR`; and a search confirming no `ActionFailure` or
`useActionFailure` remains. Then a browser pass in Chromium and Firefox at
1280px and 375px, in both themes: every inventory control forced to fail and to
succeed, nothing moves, Tab, Escape, focus out and the badge reopening all work,
and reduced motion. WebKit is limited by its known sign-in issue, so it is noted and not
passed.

### Notes

[^1]: W3C Web Accessibility Initiative, "Understanding Success Criterion 4.1.3: Status Messages," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html> (accessed October 19, 2026).

[^2]: MDN Web Docs, "ARIA: status role," <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role> (accessed October 19, 2026).

[^3]: MDN Web Docs, "ARIA: alert role," <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role> (accessed October 19, 2026).

[^4]: MDN Web Docs, "ARIA live regions," <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions> (accessed October 19, 2026).

[^5]: W3C Web Accessibility Initiative, "ARIA19: Using ARIA role=alert or Live Regions to Identify Errors," WCAG 2.2 Techniques, <https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA19> (accessed October 19, 2026).

[^6]: Heydon Pickering, "Notifications," Inclusive Components, February 27, 2018, <https://inclusive-components.design/notifications/> (accessed October 19, 2026).

[^7]: Adrian Roselli, "Defining 'Toast' Messages," January 14, 2020 (updated August 21, 2026, as returned by the fetch tool), <https://adrianroselli.com/2020/01/defining-toast-messages.html> (accessed October 19, 2026).

[^8]: GitHub Primer, "Accessible Notifications and Messages," undated, <https://primer.style/accessibility/toasts/> (accessed October 19, 2026).

[^9]: Nielsen Norman Group, "Change Blindness," undated, <https://www.nngroup.com/articles/change-blindness-definition/> (accessed October 19, 2026).

[^10]: Nielsen Norman Group, "Indicators, Validations, and Notifications," undated, <https://www.nngroup.com/articles/indicators-validations-notifications/> (accessed October 19, 2026).

[^11]: Nielsen Norman Group, "Error-Message Guidelines," undated, <https://www.nngroup.com/articles/error-message-guidelines/> (accessed October 19, 2026).

[^12]: GOV.UK Design System, "Notification Banner," <https://design-system.service.gov.uk/components/notification-banner/> (accessed October 19, 2026).

[^13]: GitHub Primer, "InlineMessage," Primer Product UI, <https://primer.style/product/components/inline-message/> (accessed October 19, 2026).

[^14]: IBM, "Notification: Usage," Carbon Design System, <https://carbondesignsystem.com/components/notification/usage/> (accessed October 19, 2026).

[^15]: GitHub Primer, "Banner: Guidelines," Primer Product UI, <https://primer.style/product/components/banner/guidelines/> (accessed October 19, 2026).

[^16]: Mía Salazar, "Replacing Toasts with Accessible User Feedback Patterns," DEV Community, November 18, 2025, <https://dev.to/miasalazar/replacing-toasts-with-accessible-user-feedback-patterns-1p8l> (accessed October 19, 2026).

[^17]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.2.1: Timing Adjustable," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html> (accessed October 19, 2026).

[^18]: W3C, "Toast messages and 2.2.1 Timing Adjustable" (issue 1814, closed by pull request 3281, August 2023), w3c/wcag, GitHub, <https://github.com/w3c/wcag/issues/1814> (accessed October 19, 2026). The issue title is paraphrased; the page title was not returned.

[^19]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.2.2: Pause, Stop, Hide," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html> (accessed October 19, 2026).

[^20]: W3C Web Accessibility Initiative, "Alert Pattern," ARIA Authoring Practices Guide, <https://www.w3.org/WAI/ARIA/apg/patterns/alert/> (accessed October 19, 2026).

[^21]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.2.4: Interruptions," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/interruptions.html> (accessed October 19, 2026).

[^22]: Red Hat, "Alert: Accessibility," Red Hat Design System, <https://ux.redhat.com/patterns/alert/accessibility/> (accessed October 19, 2026).

[^23]: Singapore Government Technology Agency, "Toast," Singapore Government Design System, <https://designsystem.tech.gov.sg/components/toast> (accessed October 19, 2026).

[^24]: Atlassian, "Success Messages," Atlassian Design System, <https://atlassian.design/foundations/content/designing-messages/success-messages> (accessed October 19, 2026).

[^25]: W3C Web Accessibility Initiative, "G199: Providing Success Feedback When Data Is Submitted Successfully," WCAG 2.2 Techniques, <https://www.w3.org/WAI/WCAG22/Techniques/general/G199> (accessed October 19, 2026).

[^26]: Nielsen Norman Group, "10 Usability Heuristics for User Interface Design," <https://www.nngroup.com/articles/ten-usability-heuristics/> (accessed October 19, 2026).

[^27]: W3C Web Accessibility Initiative, "Understanding Success Criterion 3.3.1: Error Identification," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html> (accessed October 19, 2026).

[^28]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.4.3: Focus Order," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html> (accessed October 19, 2026).

[^29]: IBM, "Notification: Accessibility," Carbon Design System, <https://carbondesignsystem.com/components/notification/accessibility> (accessed October 19, 2026).

[^30]: Material Components for Android, "Snackbar," material-components-android, GitHub, <https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md> (accessed October 19, 2026).

[^31]: Alita Kendrick, "Tooltip Guidelines," Nielsen Norman Group, January 27, 2019, <https://www.nngroup.com/articles/tooltip-guidelines/> (accessed October 19, 2026).

[^32]: Heydon Pickering, "Tooltips & Toggletips," Inclusive Components, July 25, 2017, <https://inclusive-components.design/tooltips-toggletips/> (accessed October 19, 2026).

[^33]: W3C Web Accessibility Initiative, "Understanding Success Criterion 1.4.13: Content on Hover or Focus," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html> (accessed October 19, 2026).

[^34]: Adam Silver, "Can You Make Toast Messages Accessible?," November 30, 2025, <https://adamsilver.io/blog/can-you-make-toast-messages-accessible/> (accessed October 19, 2026).

[^35]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.5.8: Target Size (Minimum)," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html> (accessed October 20, 2026).

[^36]: W3C Web Accessibility Initiative, "Understanding Success Criterion 2.4.11: Focus Not Obscured (Minimum)," WCAG 2.2 Understanding documents, <https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html> (accessed October 20, 2026). **This source was added after the research round**, on the owner's decision of 2026-10-20 that the callout closes when focus moves outside it; section 3 does not draw on it. The page confirms the criterion (Level AA): "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content." It names non-modal overlays that neither take focus nor dismiss on focus loss as at risk of covering focusable items, and closing a banner when it loses focus as one way to pass. The criterion speaks of keyboard focus only, so closing on a pointer press is our extension of the same reason.

## One Loading Standard for the Site

**Decided:** 2026-10-19, by the owner, on the examples page. Every wait on the
site has three parts: the control that was pressed answers at once, the region
that changes shows a skeleton, and a thin bar along the global bar marks every
navigation. The standard itself is [`../loading.md`](../loading.md).

> Link targets (`navigationTarget`) and the hidden `<h1>Loading</h1>` were later replaced by skeletons chosen by the destination's address, each drawing its page's own heading: see
> [`m11.9-skeletons-beside-pages.md`](m11.9-skeletons-beside-pages.md).

### The calls

- **A page bar on every navigation.** A thin indeterminate bar sits under the
  global bar. It is `aria-hidden` and says nothing to a screen reader.
- **A coven switch replaces the page.** The destination section's skeleton
  takes the old coven's page away at once. The old page is not dimmed and left
  in place, so nobody can act on the wrong coven's data.
- **Reduced motion pulses; it never stops.** The spinner, the shimmer and the
  bar all become one slow opacity pulse.
- **Timing.** The pressed control answers at once. The bar and the spinners
  appear after 100ms. Skeletons show at once.
- **The examples page's values are signed off**, on one condition: the build
  matches the site's existing looks.
- **`PendingLink`'s prop is `navigationTarget`.** The owner renamed it from
  `target`, so an anchor's own `target="_blank"` keeps its name.
- **Router options are forwarded only when a caller gives some.** A plain
  `navigate(href)` is a plain `router.push(href)`.

- **The provider owns the wait with `useOptimistic`** (owner, 2026-10-19).
  The first build kept each navigation's transition in the component that
  pressed the link and cleared the wait when that component unmounted.
  `MainBody` and `CovenBody` swap their children for a skeleton, which
  unmounts the pressed link, so the wait ended at once and the old page
  returned: the admin navigation, the coven home contents links and Create
  Coven all showed it. The owner chose React's built-in tool instead. One
  component mounted once in `providers.tsx` holds a `useOptimistic` value
  and the router; `navigate` and `refresh` set the value and make the router
  call in one transition, and React puts the value back when the transition
  ends, on arrival, on supersession or on error. That removes the
  never-settled class of bug, since no code settles anything. The public API
  (`usePendingNavigation`, `useNavigationState`, `reportLeaving`,
  `PendingLink`) is unchanged. Two things differ: `pending` is true only for
  the owner of the navigation now showing, so a superseded caller's goes false
  at once; and with several navigations overlapping, the latest one's wait
  shows until the last of them ends. The external store keeps only the
  `leaving` flag, which no transition can end. Before building it, a test
  proved React's behaviour (`tests/lib/navigation/optimistic-revert.test.tsx`).

### Where the build kept an existing look

Lane B built the shared pieces and, in five places, kept a look the site
already had over a value the examples page showed. These follow the owner's
condition above.

- New content fades in over **200ms**, the existing `arrived` default, not
  300ms.
- `IngredientForm`'s duplicate-list skeleton keeps its own 200ms delay and
  300ms fade.
- The `Skeleton` fades in over **150ms** instead of appearing strictly at once.
- `.field__busy` now waits **100ms** where it waited 200ms.

### Settled later by the owner, 2026-10-19

- The skeleton **fades out over the arriving page** instead of dropping at once; the owner asked for the crossfade on 2026-10-19. The bodies keep the last skeleton as an `aria-hidden`, out-of-layout overlay for `$arrive-duration` (200ms) while the page shows through ([`SkeletonFade`](../components/skeleton.md)).
- `LinkHint`'s dot **pulses** under reduced motion, through `loading-motion`
  and `loading-pulse` like the spinner and the skeleton. Lane B had kept it
  still as the one exception; the owner ruled that there is none.
- The visually hidden `<h1>Loading</h1>` in the `MainBody` and `CovenBody`
  waits is **kept**. A screen reader hears it and the skeleton's "Loading"
  status, and the owner accepted that.
- The dot is drawn in the **accent colour at full strength**, pulsing to 40%.
  At the link's own colour and a third of its strength it was too faint.
- The site's **menu links show no dot**: the global bar's links, the admin
  pages' lead link and the account menu's items. The page bar and the
  skeleton answer for them, and each link still carries `aria-busy`. The plan
  had the dot on every text link; a build with it on the menu links was tried
  and taken back out.
- Placeholders **draw in the destination's own frame, top-aligned, side menus
  drawn** (the owner's call, 2026-10-19). A wide page waits in `page-column`,
  a narrow one in `page-frame--narrow`, and the account page and a coven home
  with the menu column; the `main` landmark and the hidden heading stay.
- An ingredient page's placeholder **always draws the jump menu**, though the
  page draws it only when the ingredient has forms (the owner's call,
  2026-10-19). A link cannot tell from the address whether the ingredient has
  forms, so the menu column shows briefly on an ingredient without any.
  Carrying that detail on every link costs more than the brief column.
- The coven home's placeholder **draws Delete This Coven** for every viewer,
  though the page shows it only to stewards (the owner's call, 2026-10-19). A
  practitioner or observer sees that section leave on arrival.
- The Account placeholder **keeps its panels**, since the real page draws
  panels (the owner's call, 2026-10-19). It is the one placeholder with a
  card-like surface on a page without cards.

### What it rules out

- A `loading.tsx` or a route-level `<Suspense>`. Either would turn the 404,
  403 and 308 answers into 200s and break rendering without JavaScript. Every
  pending state is a client transition instead. The argument and sources are in
  [`../loading.md`](../loading.md).
- A bare `router.push`, `router.replace` or `router.refresh` outside
  `src/lib/navigation/`. `tests/guards/navigation.test.ts` fails it, and its
  baseline of exceptions can only shrink.
- Optimistic UI, which is out of scope.

### Open

- Focus returns to the switcher after a coven switch. This is the plan's own
  inference, not a sourced rule; it is checked in the design review.

### Navigation provider

`NavigationProvider` in `src/lib/navigation/provider.tsx` owns every navigation
the site starts. It is mounted once, in the providers, and never unmounts, so a
wait can never be lost with the control that began it: `MainBody` and `CovenBody`
swap their children for a skeleton, which unmounts the link that was pressed.

- The wait is an optimistic value set inside the same transition as the router
  call. React puts it back when that transition ends, on arrival, supersession or
  error, so nothing settles by hand.
- Where two navigations overlap the later one's value shows, and the value goes
  when the last of them has ended.
- A navigation waits first on any mounted form with unsaved changes
  (`useLeaveGuard`). A refresh leaves the page where it is, so nothing holds it.

### References

Chicago bibliography form. All accessed October 19, 2026.

- GitHub Primer. "Loading." Primer. Accessed October 19, 2026. https://primer.style/ui-patterns/loading.
- GitLab. "Skeleton loader." Pajamas Design System. Accessed October 19, 2026. https://design.gitlab.com/components/skeleton-loader.
- IBM. "Loading." Carbon Design System. Accessed October 19, 2026. https://carbondesignsystem.com/components/loading/usage/.
- MDN Web Docs. "ARIA: aria-busy attribute." Mozilla. Accessed October 19, 2026. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy.
- MDN Web Docs. "prefers-reduced-motion CSS media feature." Mozilla. Accessed October 19, 2026. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion.
- Next.js. "loading.js." Vercel. Last updated September 23, 2026. Accessed October 19, 2026. https://nextjs.org/docs/app/api-reference/file-conventions/loading.
- Next.js. "useLinkStatus." Vercel. Last updated September 2, 2025. Accessed October 19, 2026. https://nextjs.org/docs/app/api-reference/functions/use-link-status.
- Nielsen, Jakob. "Response Times: The 3 Important Limits." Nielsen Norman Group. Originally published January 1, 1993 (from _Usability Engineering_, chapter 5). Accessed October 19, 2026. https://www.nngroup.com/articles/response-times-3-important-limits/. Cited above as Nielsen 1993.
- React. "useOptimistic." react.dev. Accessed October 19, 2026. https://react.dev/reference/react/useOptimistic.
- React. "useTransition." react.dev. Accessed October 19, 2026. https://react.dev/reference/react/useTransition.
- Sherwin, Katie. "Progress Indicators Make a Slow System Less Insufferable." Nielsen Norman Group. October 26, 2014. Accessed October 19, 2026. https://www.nngroup.com/articles/progress-indicators/.
- Tankala, Samhita. "Skeleton Screens 101." Nielsen Norman Group. June 4, 2023. Accessed October 19, 2026. https://www.nngroup.com/articles/skeleton-screens/.
- W3C Web Accessibility Initiative. "Understanding Success Criterion 4.1.3: Status Messages." WCAG 2.2. Accessed October 19, 2026. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html.

## Fewer, quieter tooltips

**Status:** decided. Live home: `claude-docs/components/info-tip.md`, "When a field gets a tip" and "useTip"; `claude-docs/components/icon-tip.md`, "Contracts".

### Decision

- **A field keeps its InfoTip (the ⓘ beside a label) only when the tip states something the label cannot carry: a rule, a flow, or a format with a trap.** A tip that restates the label is removed. A tip that only gives a format becomes an example placeholder of one or two words. There is no "dismissed" state and no tutorial.
- **Kept as rule or flow:** Classification; Variants; References; Locator; Colours ("corresponds to", not "is"); Cupboard Name (unique per coven); the Cupboard "empty list says none" tips folded into one wording; GroupForm theme colours (4.5:1, light filled from dark); GroupedValueForm Group and Tradition; FacetPanel Source and Match and the "stuck" tips; all IngredientEntry nomenclature and compendium tips.
- **`useTip` takes `{ openDelayMs, closeDelayMs }`.** Hover waits `openDelayMs` (a timer cleared on leave, so a sweep past opens nothing); focus and tap open at once, so a keyboard or touch user never waits. InfoTip, Combobox, UserList and TipMark default to `openDelayMs: 300` and `closeDelayMs: 150`, and keep their hoverable bubble because their text can be long.
- **IconTip (the one-word label over an icon-only control) passes `{ openDelayMs: 300, closeDelayMs: 0 }`.** Its bubble takes `pointer-events: none` and hover is heard on the control, so it closes the moment the pointer leaves the icon.
- **IconTip fades over `$icon-tip-fade: 120ms`** (`TIP_FADE_MS` in `icon-tip.tsx` matches). InfoTip keeps `$tip-fade`, 500 ms.
- **Quick Look keeps its IconTip only**, with no visible word.

### Why

NN/g's tooltip guidance says tips should be few, user-triggered and never carry essential instructions; icons need a label, and a short tooltip is the minimum. About half of the roughly 55 InfoTips restated their label. IconTips cluttered through timing: they opened at once and faded slowly, so sweeping a toolbar left a trail of fading words. 300 ms is the common desktop figure.

IconTip's non-hoverable bubble departs from WCAG 1.4.13's "hoverable" clause by the owner's decision. The cost is small because the bubble is decoration (`aria-hidden`) repeating the control's own accessible name.

### Rules out

- A tutorial or coach marks.
- A tip that restates its label.
- A hoverable IconTip bubble.
- Opening hover tips at once.

## The component workshop moves from Ladle to Storybook

**Decided 2026-10-21.** Built in M12.53.

### Why

The Claude Design sync reads a Storybook. Ladle has no equivalent, so the sync
needs the workshop to be a Storybook. Nothing else about what the workshop is
for changed: one place to see each component, against the real tokens, with no
page routed to it.

### What was chosen

- **`@storybook/nextjs-vite`** (Storybook 10.6.3, Vite 8). Its framework
  supplies the `next/link` and `next/navigation` handling that `.ladle/` wrote by
  hand, so the workshop keeps no alias for them. The one alias left is `@` to
  `src/`, commented in `.storybook/main.ts`.
- **Helpers live in `.storybook/`**, along with the four stories the app never
  imports (`foundations`, `main-body`, `navigation-bar`, `pending-link`).
- **All 85 story files are CSF3** (Storybook's story file format): a default
  `meta` with the title, one named export per story.
- **Autodocs are off.** Each component is documented in `claude-docs/components/`, and the props reader autodocs need (`reactDocgen`) added about 2 s to opening the first story and doubled the workshop build (measured 2026-10-23).
- **Port 61000 and `allowedHosts: ['devcontainer']` are unchanged.** The two loading stories (`sign-in-sign-in-methods--pending-add`, `sign-in-sign-in-panel--pending`) now wait on `hangAuth()` from the fake API.
- **`npm run workshop` asks for no sign-in.** `npm run workshop:build` goes through
  `scripts/build-workshop.ts`, which relays Storybook's exit code and accepts
  `--outDir` (`deploy.yml` passes `public/workshop`). No `--base` is needed.
- **Ladle is removed** (`.ladle/`, `@ladle/react`, `npm run workshop:ladle`). The
  owner dropped the Ladle-versus-Storybook comparison on 2026-10-21, so nothing
  keeps it installed.
- **Stories and `.storybook/` are type-checked.** The owner approved bringing
  them under `tsc` in this task (`tsconfig.json` includes `.storybook/**/*.ts(x)`
  and excludes only `node_modules`). Fixtures take realistic values of their real
  type, with no casts. One helper holds a cast: `route()` in `.storybook/route.ts`,
  because typed routes make `Route` exclude dynamic addresses, and the app does
  the same in `src/app/invite/[token]/page.tsx`. `scripts/` stays unchecked.

### Mapping from Ladle

| Ladle                                 | Storybook                                                        |
| ------------------------------------- | ---------------------------------------------------------------- |
| `meta.title`                          | `meta.title`, unchanged; ids are the kebab title + `--` + export |
| `storyOrder` in `.ladle/config.mjs`   | `storySort` in `preview.tsx`, with `Default` first               |
| `meta.theme` / `Dark` + `Light` pairs | story-level `globals: { theme }`, only where the theme is shown  |
| `meta.width`                          | the `viewport` global (presets `w375`, `w382`, `w600`, `w700`)   |
| `iframed`                             | dropped: every story already has its own iframe                  |
| `reducedMotion`                       | `parameters: { reducedMotion: true }`                            |
| `?story=<id>&theme=<t>&width=<w>`     | `/?path=/story/<id>&globals=theme:<t>;viewport:w<w>`             |
| `.ladle/components.tsx` provider      | the `withWorkshopFrame` decorator in `.storybook/preview.tsx`    |

### Phone stories

There are no `Phone` stories. A phone view is any story opened at a narrow
viewport (see "Opening a story at phone width" in `claude-docs/workshop.md`).
Every Ladle story pinned to 375px was removed, unless it was the only story
showing its state. Those stay with the pin dropped: the Long Name and
Long Word states of IngredientEntry's `QuickLook`, `PrivilegeChangesTab` (TabbedPage,
formerly `PhoneScrolled`), `LongWorkspaceName` (ContextRow, formerly
`PhoneLongName`), `LongHeadingWithAction` (PageHeader), `EveryRowState`
(SignInMethods), `CovenRow` and `CovenRowFiltered` (CardDensitySwitch),
`OverTheShell` (ImpersonationBanner).

The other pinned widths:

- **`SectionNav` `AdminOnAHiddenPage` (700px)** keeps its width as the story's
  starting setting. Its More-menu state exists only at tablet width, so the width
  is the thing the story shows. The other two 700px stories (`AdminTablet`,
  `AccountMenu` `OpenAtSevenHundred`) show nothing a viewport change does not,
  and were removed.
- **`TabbedPage` `AddAsPlus` (600px) and `AddBeneathAtThreeFifty` (382px)** were
  two identical stories with different pins. Both drew `AddAction`, the list
  pages' Add with a label and a plus, which `Default` does not (it draws the
  plain `InviteAdmin` link). They are now one story, `AddActionLabelAndPlus`,
  with no pin: open it at `viewport:w600` for the plus and `viewport:w382` for
  the label.

A removed Ladle story maps to its surviving sibling in the same file (the same
name without `Phone`, such as `Phone` to `Default`, `FilteredPhone` to
`Filtered`, `OpenPhone` to `Open`) opened at `viewport:w375`. Its theme is the
one it was named for, which is now the toolbar's theme: add `theme:dark` or
`theme:light` to the link. The full removed list, by component and story:

- .storybook: Phone; Foundations: Light, Dark (theme-only; the toolbar covers them)
- AccountMenu: OpenWithInvitationsPhone, OpenPhone, OpenAtSevenHundred
- AdminInvitations: OnePageOfSeveralPhone, Phone, FilteredPhone
- AdminNav: Phone, IndexPagePhone
- AppShell: Phone, PhoneAdmin, PhoneCreatePage
- BusyButton: Phone
- ChipColorField: Phone
- ClickFeedback: Phone
- Combobox: Phone, QualifierInFormPhone
- CompendiumList: Phone, FilteredPhone
- ContextRow: Phone
- CovenInvitation, AdminInvitation, VerifyEmail (Emails): Light, Dark (theme-only)
- CovenNav: Phone
- FormIcon: Light (and the dark pin on Default)
- ProviderMark: Light
- ThemeToggle: Light, Dark
- CreateWorkspaceForm: Phone
- DataTable: Phone
- DeleteWorkspaceButton: Phone
- EmailForm: Phone
- ErrorPage: Phone
- FilterForm: Phone, FilteredPhone
- GroupForm: Phone
- GroupList: Phone, TraditionsSearchedPhone
- GroupedValueForm: Phone, EditingADeityPhone
- GroupedValueList: Phone, PendingPhone
- IconTip: Phone
- InfoTip: Phone
- IngredientEntry: Phone, DetailsPhone
- IngredientForm: VariantOpenPhone, CopySkippedPhone, EditSourcePhone, AskingToDeletePhone, AskingToDiscardPhone, InModalPhone, Phone, PromoteQuestionPhone, DuplicatesNoticePhone
- InvitationAcceptance: SignedOutPhone, AcceptableCovenPhone, AcceptRefusedPhone, UnverifiedPhone, DeletedCovenPhone
- InviteDialog: OpenPhone
- LeaveWorkspaceButton: Phone, OnlyOwnerPhone
- MemberList: SoleOwnerPhone
- MenuButton: Phone
- Modal: EditingPhone, LoadingPhone, Phone
- NameForm: Phone
- NotAuthorized: Phone
- Notice: Phone
- PageNav: GroupedApartPhone, GroupedPhone, Phone
- PendingInvitations: WithDeclinedPhone
- PrivilegeLedger: Phone, FilteredPhone
- PublicFrame: Phone
- ReceivedInvitations: OnePhone, SeveralPhone
- SafetyNote: Phone
- SectionNav: AdminTablet, AdminPhone, AdminPhoneOnAHiddenPage, CovenPhone
- SignInPanel: Phone
- StockBadge: Phone
- StockDialog: OpenPhone, OpenPhoneNoneHeld
- StockFields: MeasuredPhone
- TabbedPage: Phone, LoadingPhone (`AddAsPlus` and `AddBeneathAtThreeFifty` became `AddActionLabelAndPlus`)
- UserList: OnePageOfSeveralPhone, Phone, FilteredPhone
- Welcome: Phone
- WorkspaceSwitcher: Phone

### Consolidation (2026-10-23)

The owner approved merging the stories of each piece, and it rides in M12.53 rather than a task of its own.

- **Naming.** `Default` is dropped from any piece that merges. The merged story is `States`, and the sidebar sorts it first (`storySort` in `.storybook/preview.tsx`). A piece with nothing to merge keeps `Default`, which sorts after `States`.
- **Two shapes.** A small piece gets a `StatesGrid` (`.storybook/states-grid.tsx`), every state drawn at once. A page, a list or a large piece gets one `States` story with a `state` dropdown (`argTypes` with `control: 'select'`, `options` and `mapping`); IngredientCard is a grid. A spec reaches a state by `iframe.html?id=<title>--states&args=state:Near+Right+Edge`. A state that must be isolated for a test stays its own story.
- **Tests.** Where a test named a merged story, it now selects the state through `args=state:` and asserts what it did before (`tests/e2e/workshop/click-feedback.spec.ts`).
- **Guard decision.** The owner kept MB.224 as the check for a component folder with no story file. No workshop guard test is added, and the M12.53 acceptance criterion says so.
- **Drift from the live site.** The shell frame draws the real section body and providers, and the stories gained the states the live site shows (the Curator nav, an observer's coven, loading targets, a filtered tab, the role filter, the head parts of a modal).

### The fake API and the every-story check (2026-10-23)

- **MSW answers a story's requests.** Mock Service Worker, with the `msw-storybook-addon` loader, replaces the three hand-written `fetch` stand-ins (`IngredientForm`, `StockDialog`, `IngredientSearch`), `.storybook/hanging-fetch.ts` and the `/api/auth` plugin in `main.ts`. One typed module, `.storybook/mock-api.ts`, serves every story, and the stories that had a control with no answer now have one.
- **An optional prefix reaches it on staging.** Staging's CSP allows `connect-src <host>/workshop/` only, so the clients take `WORKSHOP_API_PREFIX` (empty in the app, `/workshop` in the workshop, set by Vite `define`) in front of `/api/graphql` and `/api/auth`. The cost is one line in each of `src/lib/graphql-client.ts` and `src/lib/auth-client.ts`; the alternative, widening the CSP, would have opened the app's own API to the workshop's scripts.
- **The every-story check is manual.** The owner chose a Playwright check over every story that is kept out of CI, pre-commit and every regular test script (`npm run workshop:check`, its own config, a `.check.ts` file name). It reports real design findings (colour contrast, heading order) that are not fixed in M12.53 because they are styling decisions.
- **Handlers are `fn()`, and `useArgs` changes what a click shows.** The rule is in `workshop.md`, "Handlers a story passes".

## Admin modals open at once, with a loading state

**Status:** decided. Live home: `claude-docs/components/modal.md`, "Opening at once".

### Decision

- **One dialog from the press to the form.** The modal fades in through `@starting-style` when `showModal()` runs, so swapping a loading dialog for a separate server-rendered one would fade twice and could blank a frame. Each page renders its one `RouteModal` at a fixed place every time: skeleton while an opening is pending, the form once the data arrives. Same component, same position, so React keeps the same `<dialog>` open throughout.
- **Closing during loading** calls `cancel()`, then `router.replace(closeHref)` and `refresh()`. Next marks the pending push as discarded, so the modal does not reopen.
- **When loading ends, focus moves to the first field** (`firstShownField`), only if it is still on the dialog itself. While loading the focus starts on the dialog, which reads its name, and Tab reaches Close.
- **`AddAction` is a client file** (`src/app/admin/add-action.tsx`) and takes `heading` apart from its label (the group pages label the button "Add Group" while the dialog says "Add Category Group").
- **The dialog wrappers take `opened`**, the heading and the row, and build `RouteModal`'s `content` from it.
- **The admin layout imports `RouteModalProvider` from `route-modal-provider.tsx`**, not the Modal index, whose re-exports a server component cannot import (the production build refuses it).
- **The compendium modal is not wide**; it takes the default column.
- **The e2e spec checks `aria-busy`** once the form arrives, not the status's absence, since a form's combobox holds a status of its own.

### Why

A link copied from `?edit=` still opens server-rendered; the pending state only removes the wait after a press.

### Rules out

- A separate loading dialog swapped for the server-rendered one.

## The navigation shell is a slim bar, a context row and a bottom bar on a phone

**Decided:** every signed-in page sits inside one navigation frame, `AppShell`. It has three parts, called **Option C, the "context header"**:

- **A slim global bar** at the top: the brand link, one Add Ingredient button, the account menu and the theme toggle.
- **A context row** beneath it. On a coven page its left end names the coven and _is_ the coven switcher. On an admin page it reads "Admin" as plain text. The section nav sits beside it as icon tabs, separated by a hairline.
- **A bottom bar on a phone.** At 40rem and narrower the section nav leaves the row and becomes a bar along the bottom of the screen, in the thumb zone.

This also folds MB.122, the design review of the navigation, into MB.7. Once the design is chosen before the build, the review and the build are one piece of work.

### The Problem

Nothing in `src/app` drew a site header, an account menu or a Keeper entry. `WorkspaceSwitcher` (M6.9) was mounted nowhere. The theme toggle sat in a fixed corner over page headings at 375px. There was no menu, popover or dropdown piece in the codebase, and no map of which element sits above which (`z-index`).

### What The Navigation Has To Hold

There are four tiers, and the first three are the shell's.

| Tier    | Items                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utility | The brand link, the account menu (Your Account, Sign Out), the theme toggle, and later Report a Bug (MB.176)                                         |
| Primary | The coven switcher (with Create Coven for someone who may create one), Admin for keepers, the Compendium once it has a route (MB.80), Add Ingredient |
| Section | The coven's Overview, Ingredients, Grimoire and Members (role-gated); the admin area's Compendium, Categories, Forms, Deities, Astrology and People  |
| Tabs    | The admin tabbed pages' segmented control, which belongs to the page and is unchanged in every option                                                |

The shell leaves alone the impersonation banner (above everything), `/`, `/sign-in`, `/invite/[token]` and the public compendium frame.

Constraints every option had to meet: the coven lives in the URL, never the session; `canCreateWorkspace` comes from the user row, never the session; an unverified account reaches only `/account/email`; `/admin` shows a styled not-authorised page to a signed-in non-keeper; `/coven/[slug]` is a 404 to a non-member; admin tables keep their 80rem column; tokens only, in both themes; no sideways scroll at 375px; axe clean; operable by keyboard; the current page told by shape and weight as well as colour.

### What The Research Said

- **Visible beats hidden.** In the Nielsen Norman Group's study of hidden (hamburger) navigation, hiding it cost over 20% in discoverability, was 39% slower on desktop and 15% slower on mobile. They advise never hiding top-level navigation on desktop, and on mobile showing up to four links before hiding any. ([Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/))
- **Local navigation must read as beneath global navigation.** A horizontal second row suits two or three tiers; breadcrumbs earn their place only past two levels. ([Local Navigation](https://www.nngroup.com/articles/local-navigation/))
- **Utilities belong in the top bar**, not a sidebar. The coven switcher answers "where am I?" and the account menu "who am I?", so they stay separate controls. ([Cloudscape, Service Navigation](https://cloudscape.design/patterns/general/service-navigation/)) The switcher sits at the left and always names the current workspace. ([SaaS UI, Workspace Switcher Patterns](https://www.saasui.design/blog/saas-workspace-organization-switcher-ux-patterns))
- **Several `nav` landmarks each need a distinct label**, so a screen reader can list them apart. ([APG, Navigation Landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html))
- **Disclosure, not `role="menu"`.** The W3C's ARIA Authoring Practices recommend a button with `aria-expanded` and `aria-controls` that opens a list of links for site navigation. The `menu` role promises keyboard behaviour that people do not expect here. Every `nav` landmark on a page needs its own `aria-label`. ([APG, Disclosure Navigation Menu example](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/))
- **A bottom bar suits a phone.** One-thumb use favours the bottom of the screen, and tab bars were found in 86% of cases against 57% for hamburgers. ([Smashing Magazine, 2019, on bottom navigation](https://www.smashingmagazine.com/2019/08/bottom-navigation-pattern-mobile-web-pages/))
- **Priority+ shows what fits and tucks the rest behind More**, which teaches the user what the row is. ([Brad Frost, Priority+ navigation](https://bradfrost.com/blog/post/revisiting-the-priority-pattern/))
- **GitHub's 2023 redesign** is the closest precedent: a slim global bar, context shown above the page, and local navigation as underline tabs. ([GitHub blog, 15 June 2023, on the redesigned navigation](https://github.blog/2023-06-15-exploring-github-with-the-redesigned-navigation-now-in-public-beta/)) Its component, [Primer's `UnderlineNav`](https://primer.style/product/components/underline-nav/), is a labelled `nav` with `aria-current` on the current tab.
- **Atlassian** puts site-wide actions (create, switch, utilities) in the top bar and settings under the avatar, and keeps the sidebar for working inside a project. ([Atlassian, navigation](https://www.atlassian.com/software/jira/guides/navigation/overview))

Check an address before relying on it; these pages move.

### The Options Drawn

The owner saw each as a working mock-up in the project's own type and palette, at 1280px and 375px, in both themes.

- **A, stacked bars.** One global bar, then the existing section row under it. The cheapest, and it keeps every built nav component. It spends two rows of height and hides two links on a phone.
- **B, sidebar.** A 16rem left column with the section links. On a 1280px window this leaves the admin tables about 64rem, and the user list scrolls inside its frame again, the complaint MB.115 settled. On a phone it hides the navigation in a drawer.
- **C, context header.** A slim bar, then a context row that names where you are, with the section nav beside it as icon tabs, and a bottom bar on a phone. This is what GitHub's repository header does.
- **D, scope breadcrumb.** One bar whose first crumb merges the switcher with the area links, and a section strip beneath it.

**Why C won.** The owner chose it as "definitely best" after the first round, and it held through the later rounds. The navigation is visible on every screen, on a phone it sits where the thumb is, and the context row states where you are in the largest type on the page, which a bar of links cannot. The admin tables keep their width. The owner said build time was not a factor.

### The Six Risks And What Was Chosen

Option C's risks were each drawn two ways, and the owner picked one for each.

| Risk                                                                  | Choice                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Where the switcher goes                                            | In the context row: the coven's name in the display face with a chevron, inside a hairline border. The bar carries no select. On admin pages the same place reads "Admin" as plain text. |
| 2. Two tab looks stacked on admin pages (section tabs over the pills) | The tabbed pages' pills move onto the page-heading line, 36px tall, with the hit area padded invisibly to 44.5px. The table starts about 78px higher than with a pill row of its own.    |
| 3. Six admin sections on a phone                                      | Priority+: the bottom bar shows four and a More disclosure holds the rest.                                                                                                               |
| 4. The bottom bar against dialogs and the impersonation banner        | The bar hides while a dialog is open or the on-screen keyboard is up. The banner offsets the top bar only.                                                                               |
| 5. More hiding the current page                                       | More takes the current page's name and icon, and its current state, when the current page is one of the hidden ones.                                                                     |
| 6. A long coven name on a phone                                       | Drawn two ways. The owner dropped the quieter borderless version at sign-off: the switcher looks the same on a phone as on desktop, and a long name wraps to two lines.                  |

### The Decisions Every Option Shared

1. **A route group, `src/app/(shell)/`,** wraps `account/`, `coven/` and `admin/`. URLs do not change. The root layout stays free of the session, so public pages stay static. The group's layout checks the session and reads the viewer and their memberships (both cached per request).
2. **The chrome takes plain props** (`viewer`, `workspaces`), with no fetching inside, so MB.83's client island can draw the same chrome from `me`.
3. **An unverified account** gets the brand as plain text, no site links, no Add Ingredient, no switcher, and an account menu with Sign Out only. Every link would only send it back to `/account/email`.
4. **The 403 renders inside the shell.** A signed-in non-keeper sees the chrome, without a Keeper entry, around the not-authorised page.
5. **The switcher's list can go stale,** since layouts do not re-run on client navigation. After `/coven/new` creates a coven, the form refreshes the router (a sub-hour change to M9.16's form, named in the PR).
6. **The account menu is a disclosure,** not a `role="menu"`: a button with `aria-expanded` and `aria-controls` opening links and the existing Sign Out button. Escape and an outside click close it, and Escape returns focus to the button. The theme toggle moves into the bar on shell pages; the fixed corner stays only on pages outside the shell. This settles MB.116's hand-off.
7. **Landmarks.** A `header` for the bar; each `nav` has its own label: "Site", "Coven", "Admin", and a tabbed page's own title for its pills. A Skip to Content link is the first thing a keyboard reaches.
8. **Tokens.** New size tokens for the bar, the context row and the bottom bar, and a `$layers` map that every `z-index` now reads (`shell`, `banner`, `toggle`, `floating`, `dialog`), replacing raw numbers in the banner and the toggle.
9. **Current page** carries `aria-current="page"` and a heavy accent rule with a quiet fill, never colour alone. Print hides the shell (M10.22).
10. **The brand link** is the home click: `/admin` for a keeper (the owner's call), the viewer's coven for everyone else. Not `/`, which for a signed-in user is a prose page with one button.
11. **Copy says Coven** (below).
12. **The account menu names the user once,** on its button; its panel opens on Your Account, then Sign Out.
13. **One section nav component** serves the coven and the admin areas, with an inline stroke icon per section. `AdminNav`'s `<details>` jump menu goes.
14. **The theme toggle keeps its feel:** the knotwork crescent and sun on the accent disc, as a 32px disc in the bar and a labelled row in the account panel on a phone. Never a plain icon. _(M10.32, the owner's call, 2026-10-13: the disc stays in the bar at every width and the panel holds no theme row.)_

### The Sign-Off Adjustments

On 2026-10-12 the owner signed off Option C with three adjustments and no further drawing.

- **The phone shell** is a 52px bar (brand mark, Add Ingredient, avatar) over a 44.5px context row holding the switcher or "Admin", with the section nav as the bottom bar.
- **Add Ingredient is a labelled button at every width,** never a bare plus.
- **The switcher looks the same on a phone** as on desktop: display-face name, chevron, hairline border, a long name wrapping to two lines.
- **Until M2.8 lands,** the shell works out the home link itself (see below).

### DESIGN §9 Is Corrected, And Editing Lives Where An Ingredient Is Shown

§9's `AppShell` paragraph said the shell carries "the global affordances for adding and editing an ingredient from any page". It now says: one global Add Ingredient button whose target follows the area, and editing on the ingredient wherever it is shown, never inside a relational field and never in the shell. For the ingredient tasks this means:

- **M8.16** built Add Ingredient’s modal and enabled the shell button: a modal for a coven (the one the address names, else the only one the viewer may write to), a plain link to the compendium’s add dialog on an admin page, and nothing for an observer who may write nowhere.
- **M8.17** builds Edit Ingredient where an ingredient appears (the ingredient detail page, a list row), not in the bar. A field that links to another ingredient never offers an edit of it.

The shell also gains the account menu, the theme toggle in the bar, and the one section nav, recorded in the same paragraph.

### The Coven Copy

On-screen copy says Coven: "Select Coven", "Create Coven" (M9.16's "Create Workspace" changes), "Your Coven", and the section nav's label "Coven". Code, schema and docs keep saying _workspace_ (CLAUDE.md, Vocabulary). Only the words a person reads change, as the URL already says `/coven/`.

### The M2.8 Dependency

The brand link and Your Coven both point at the `/coven` landing: a page that sends someone into their coven, to the create form, or to the invite-only explanation. `src/app/coven/page.tsx` does not exist; the landing is **M2.8** (issue #270), still open. So MB.7 computes the home link in the shell: a keeper goes to `/admin`; anyone else to their first coven by slug, to `/coven/new` if they hold none and may create, and to `/account` otherwise. Your Coven follows the same rule. When M2.8 lands it swaps that href for `/coven`.

### What This Rules Out

- Edit Ingredient in the shell, or an edit button inside a relational field.
- A second navigation metaphor beside the section nav on a phone, such as a drawer.
- A switcher on admin pages. The bar shows Your Coven there.
- A `z-index` number outside `$layers`.

## Robots, sitemap, page metadata and structured data

**Decided:** the public pages tell a search engine what they are (title, description, canonical, JSON-LD), `robots.txt` lets a crawler into the home page and the compendium alone, and off production nothing is offered at all. The task's entry in `claude-docs/tasks/mb.md` carries the acceptance criteria and the owner's amendment of 2026-10-19.

### The pieces

- **`src/app/robots.ts`.** Production allows `/$`, `/compendium`, `/compendium/`, `/sign-in`, `/support` (added by M15.67, so a crawler can read that page's `noindex, follow`), the three public files of M12.2, `/_next/` and `/opengraph-image` (added by MB.289, so a crawler can fetch the build's CSS, JavaScript and images and the home page's share card), `/robots.txt` itself (RFC 9309 already allows it implicitly; listed for crawlers and tools that do not apply that rule) and `/sitemap.xml`, and disallows `/`. The sitemap is listed because the file advertises it, and `Disallow: /` would otherwise block it. Anything else, including `/coven/…`, `/admin` and `/account`, is disallowed by the catch-all. A test (`tests/app/robots.test.ts`) reads the rules with the matching RFC 9309 gives and asserts the allowed and refused paths.
- **`src/app/sitemap.ts`.** The home page, `/compendium`, `/sign-in`, and one entry per current compendium slug, from the cached sessionless read `listCompendiumSlugs` (`claude-docs/db/compendium-cache.md`). `lastModified` is the entry's `updatedAt`, MB.106's definition of a change. A retired slug is never listed.
- **Page metadata.** `src/lib/page-metadata.ts` builds title, description, absolute canonical, Open Graph and Twitter text tags. There is no image. The root layout's title template appends the site name to every page; the home page uses an absolute title so the name is not doubled.
- **JSON-LD.** `src/lib/json-ld.ts` is the one place a block is serialised, escaping `<` as `<` so the data cannot close its own script tag. An entry carries `DefinedTerm` and `BreadcrumbList`, the list `CollectionPage`, and the signed-out home page `WebSite`. A filtered list, the list with Quick Look open (`?entry=`), a pager page (`?after=`, `?before=`) and the in-app entry page carry none.

### The choices

- **The rule `/$`.** `Allow: /` would open the whole site, and `Disallow: /` alone would shut the home page. RFC 9309 section 2.2.2 says the longest matching rule wins, and an allow beats a disallow of equal length; section 2.2.3 lets `$` end a pattern. Google's robots.txt specification ("URL matching based on path values") lists `/$` as matching the root alone. So `Allow: /$` opens `/` and nothing under it.
- **Why the home page is crawlable.** Google's site-names documentation asks for `WebSite` markup on a home page it can crawl, with `name` and `url` required and `alternateName` optional. We give `name` and `url` only: nothing sourced supports an alternate name. The page shows no reference or workspace data, so `/compendium` stays the one page with reference content (MB.80, amended).
- **`og:type` is `website` on every public page.** `website` is the plain type for a site's pages and the owner approved it; an entry is a reference page, not a dated article. No `subjectOf` citations in the JSON-LD: the page already lists its references in HTML, and duplicating them in markup is a second thing to keep true.
- **Every list view names `/compendium` as its canonical**, query string dropped, not only a filtered one. Since MB.289, two addresses name another: a pager page of the unfiltered list (`?after=` or `?before=`) names itself, cursor included, as it holds other entries than the first page, and a Quick Look address (`?entry=<id>`) names the entry's own page, `/compendium/ingredients/<slug>`. A filtered view is also `noindex, follow`, so category combinations are not a crawl trap while links on them are still followed. Since M15.67, on production the proxy also sends `X-Robots-Tag: noindex, follow` for any address carrying `entry`, `support`, `after` or `before` (`NOINDEX_PARAMS` in `src/proxy.ts`): those addresses open a dialog over a page, or show a pager page whose contents drift as entries change. `/sign-in` names itself as canonical, and its `?next=` and `?error=` addresses are `noindex, follow`.
- **Canonical addresses are built on `SITE_ORIGIN`** (`src/lib/site.ts`), never on the request host, so staging and hotfix deploys point at production instead of indexing themselves.
- **A retired slug answers 308**, permanent because a temporary status tells a crawler the old address is still canonical. Next sends `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, which a browser cannot keep; the test pins `no-store`, no positive `max-age`, no `Expires` and no `Last-Modified`. An unknown slug is a 404.
- **Robots is read per request.** Next runs a metadata route once at build and keeps the answer unless the route opts out, which would freeze `VERCEL_ENV` at build time. `robots.ts` and `sitemap.ts` both export `dynamic = 'force-dynamic'` (the supported option, per the Next.js `robots` and `sitemap` file-convention docs and the caching guide), so the runtime's `VERCEL_ENV` decides, as the proxy's `X-Robots-Tag: noindex` already does (MB.80), and no build setting matters. The sitemap's read underneath is the data cache's, so a crawl costs no query.

### Not done here

Search Console verification and sitemap submission are the owner's action.

### Lighthouse

`lighthouse` (exact version, a dev dependency, with `chrome-launcher`) backs `npm run lighthouse:seo -- <base-url>` (`scripts/lighthouse-seo.mjs`). It runs the SEO category on `/`, `/compendium` and one current entry (or the entries named by repeated `--path /...`, so a caller can sample several) and exits non-zero on any failed audit. It is run by hand and gates nothing, because it only means anything against a `VERCEL_ENV=production` server: off production the noindex header and the disallow-all robots.txt fail the crawlability audits, which is the site working. The devcontainer has no Chrome, so a `lighthouse-chrome` container supplies one (below). What was tried first: the remote Chromium reaches the app (`devcontainer:<port>`), but Lighthouse needs a DevTools port, and asking the Playwright server for one with a `--remote-debugging-port` launch option left it refused from the other container, so the script was checked only as far as its usage, entry discovery and missing-Chrome handling.

The fix is a `lighthouse-chrome` service on the `audit` profile (`make lighthouse-up` and `lighthouse-down` on the host): headless Chromium from the `playwright-audit` image with `--remote-debugging-port` on loopback, and a Node forwarder that publishes it to the compose network as `lighthouse-chrome:9222`. No port is published to the host, because DevTools has no authentication. The devcontainer sets `LIGHTHOUSE_CDP_HOST` and `LIGHTHOUSE_CDP_PORT`, which the script uses by default. It resolves the host name to an IP before connecting, since Chrome refuses a DevTools request whose Host header is a name rather than an IP or `localhost`, and builds the WebSocket address from that header. To run it: `make lighthouse-up` on the host, then in the devcontainer start the app with `VERCEL_ENV=production` on a free port and run `npm run lighthouse:seo -- http://devcontainer:<port>`. This path has not been run end to end: the container could not be started from the session that wrote it. On the three pages the checks Lighthouse's SEO category makes were done by hand with curl (status 200, title, description, viewport, canonical, no noindex, no image without alt text, valid robots.txt).

### Metadata in the head

Next 16 streams a page's metadata into `<body>` for ordinary browsers when `generateMetadata` is not ready as the first part of the page is sent (Next docs, "Streaming metadata": `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`). Visitors on Next's default `htmlLimitedBots` list get the metadata in `<head>` instead, because the page waits for it. That list covers Bingbot, DuckDuckBot, Yandex, Baidu, Applebot, Chrome-Lighthouse and the link-preview bots (`node_modules/next/dist/shared/lib/router/utils/html-bots.js`). Googlebot runs JavaScript and reads the streamed tags.

So the default is kept. Setting `htmlLimitedBots: /.*/` (every visitor gets blocking metadata) was tried and dropped: it delays the first byte on every page, site-wide, for almost no gain in search results.

### Sources

- RFC 9309, Robots Exclusion Protocol, sections 2.2.2 and 2.2.3. https://www.rfc-editor.org/rfc/rfc9309
- Google Search Central, "How Google interprets the robots.txt specification". https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- Google Search Central, "Provide a site name to Google Search". https://developers.google.com/search/docs/appearance/site-names
- schema.org: `DefinedTerm`, `DefinedTermSet`, `BreadcrumbList`, `CollectionPage`, `WebSite`. https://schema.org

## Design review: the sign-in and account pages

**Status:** decided. Live home: `claude-docs/components/sign-in-panel.md`, `claude-docs/components/sign-in-methods.md`, `claude-docs/components/notice.md` and `claude-docs/styling.md`.

### Decision

- **stylelint carries "no raw hue outside `_variables.scss`".** It never conflicts with the database holding colours: group colours are hexes on `category_groups` rows that reach the page as inline `--chip-dark`/`--chip-light` custom properties, and the seeded pairs live in TypeScript, which a Sass linter does not read.
- **A panel sits behind the three form pages** (`/sign-in`, `/account`'s sections, `/account/email`); `/` and the 403 page stay bare, being prose.
- **The last-used badge stays in the button's corner.**
- **Microsoft keeps its white face with the darker grey edge**, `#808080` in `$brand-palettes`, in both themes.
- **The 403 page's way back is a quiet `.btn` anchor to `/`** (`.btn--quiet`): it changes nothing, and a secondary action is not green.
- **Welcome's lede is the shared `.lede`** at body size in the muted ink, as every section head's is.
- **The sign-in-methods rows carry no status word**, Remove is `.btn--destructive`, and each row keeps its provider mark.
- **`Notice` has a `quiet` option** so an error or warning on the page from the start renders as an `<output>` status and is not announced over what the reader is doing. No notice markup stays hand-written.
- **`readGraphqlIssues`** sits beside `readGraphqlFailure` in `src/lib/graphql-failure.ts` and reads every field error of a refusal at once for forms that place each under its field.
- **The account page pre-empts a stale session.** Better Auth refuses to remove a sign-in method on a session older than its freshness window, so the page withholds Remove and offers Sign In Again.
- **Browser floor** is Baseline Widely Available (`claude-docs/styling.md`, Binding rules); the Chromium-only Playwright projects are why a Safari and Firefox look at the dev server is part of each sign-off.
- **Copy register:** speak to the reader as "you"; one sentence for what happened and one for what to do; "sign-in" is the noun and adjective, "sign in" the verb; "email address" on first mention and "address" after; Title Case for every label, button and heading.

### Why

A shared piece (frame, brand map, provider mark, notice, failure reader) replaces every hand-written copy so a later review changes one place.

### Rules out

- Moving the last-used badge inline.
- Microsoft's own dark button in the light theme.
- A status word on each sign-in-methods row.
- Letting a stale-session removal fail at the request.

## Mail design review sign-off

**Status:** decided. Live home: `claude-docs/email.md`, "Design".

### Decision

- The verification mail, admin invitation and coven invitation are approved in light and dark at 375px and 600px.
- Subjects and preview lines: the drafts. Closing sentences: no contractions. An expired-link sentence is added.
- **Names in mail:** the inviter's name opens both invitations, read from the acting user's row in the services. The reader's name is not in the verification mail.
- **Not checked:** client previews (Gmail, Outlook, Apple Mail), Gmail on iPhone and the Outlook.com button.

### Why

The verification mail goes to an address the account has not proved; a mistyped one would hand a stranger the name of whoever typed it.

### Rules out

- Naming the reader in the verification mail.

## Design review: the coven and invitations

**Status:** decided. Live home: the screens and their copy in `src/app/(shell)/coven/` and `src/components/`; the screen-noun rule is `CLAUDE.md`, "Vocabulary".

### Decision

The owner chose, on reviewing the proposals and screenshots:

- **Coven index.** The owner section, with Delete in a section only a steward sees; a Contents section listing the coven's pages; a jump menu (`PageNav`) laid out as the account page lays its own, a sticky column beside the content on a wide screen and the list above the sections on a phone.
- **Landing.** Named headings: "Welcome" is the eyebrow, and the heading says "Start a Coven" or "Join a Coven".
- **Invitation page.** On a panel, as the sign-in page is.
- **Members.** The page heading says "Members", matching the nav item; the tabs stay Members and Invitations. (Not the recommended option.)
- **After Leave or Delete.** The coven landing, `/coven`, followed by a refresh.
- **A deleted coven's invitation.** Its own refusal reason, `closed`, reading "The coven this invitation was for has been deleted, so it can't be accepted."
- **Revoke.** The dialogs say "Its link will say it was withdrawn."; the button stays Revoke.
- **Role refusal.** "Your role in this coven doesn't allow that. Ask a steward if you need it."
- **Received invitations** sit in `/account`'s Invitations section, and the coven landing shows a notice linking there, so the landing draws no table.
- **Pager types** live in `src/lib/` with one import path and no re-exports. `PagerHrefs<Href extends string = string>` is generic because `src/lib/types.ts` imports nothing, so it cannot name Next's `Route`; each list component asks for `PagerHrefs<Route>`.
- **Screens say _coven_; code, schema and prose say _workspace_.**

### Why

Each choice follows the owner's reading of the proposals: a deleted coven's invitation was telling the reader to check they opened the whole link, which is wrong advice, and a role refusal should say who can grant the access. The pager types stay free of Next imports so `src/lib/types.ts` stays import-free.

### Rules out

- **A coven landing table of received invitations**, and with it the weight of Create Coven beneath the table.
- **Naming the invitations table from the account page's section heading**, which would read "Invitations" twice in a row.
- **Re-exporting the pager types from `admin/types.ts`**: every name has one import path.

## Design review: the public compendium and shared ingredient components

**Status:** decided. Live home: `claude-docs/components/` (the card, Quick Look and filter docs) and `claude-docs/compendium/`.

### Decision

- **Held wording is "Cupboard"**, in four phrasings: "In Every Cupboard" on the card's check, "In Your Cupboard" on the entry shelf, "<coven>, in its cupboard" in the menu, "See in Your Cupboard" in Quick Look. The Quick Look list is headed "In Your Cupboards".
- **The plus and check carry the entry name**, in both the accessible name and the visible tip.
- **Source link** reads "Open the Source", with a hidden hint that it opens in a new tab.
- **The safety bar** uses `$rule-heavy` and keeps the Caution heading's text stroke.
- **The sticky phone row is two lines**: the search box, then Filters and Clear All with the Filters button filling its line. The whole stack sticks.
- **The duplicates notice** uses interim wording until a block Notice exists.
- **Form fields stay in `IngredientForm/fields.tsx`.** A generic form-field component was weighed and set aside; the reasons are in the comment at the top of that file.
- **Drawer** uses the proposed drawer tokens, with `RECENCY_AT` fixed at `corner`.
- **Forced colours**: the current-page border mark now; a full forced-colours pass over the section is a separate task.
- **The public compendium has no Compact switch.** Densities differ on purpose: the public compendium shows full cards and a coven's Ingredients list shows compact ones.

### Why

The held noun follows the vocabulary: a coven's own stock is its cupboard (`CLAUDE.md`, "Vocabulary" and "Domain invariants"). Naming the entry in a control's name lets a screen reader tell a list of identical pluses apart.

### Rules out

- "In Your Covens" as the held noun.
- A Compact switch on the public list.
- Fixing hand-written repeats of a mixin or token inside a design-review PR; they are collected into their own task.
- Treating LinkHint's drop, the navigation bar's 3px and the Combobox ring as repeats: each is a design choice and stays as it is.
