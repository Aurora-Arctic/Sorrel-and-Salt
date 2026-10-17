# Modal

`src/components/Modal/` — a dialog over the page (M5.6), the project's first.
It is the native `<dialog>` in its modal mode, with the `.modal` primitive's
surface and a heading that names it. M5.6's category page opens it from the
address; M8.16, M8.17 and M7.4 are its next owners. `RouteModal`, beside it,
is the wrapper every admin page opens it through (below).

| File                       | What it holds                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `modal.tsx`                | `Modal`, the default export                                                                    |
| `route-modal.tsx`          | `RouteModal`                                                                                   |
| `modal-button.tsx`         | `ModalButton`: a button that opens a modal and takes the focus back when it closes             |
| `route-modal-provider.tsx` | `RouteModalProvider`, `useOpenModalClick`: a press opens the modal at once ("Opening at once") |
| `loading.tsx`              | `ModalLoading`, the skeleton a modal shows while its contents are on the way                   |
| `index.tsx`                | The exports; two files, since `RouteModal` renders `Modal`                                     |
| `close-guard.ts`           | `CloseGuardContext`, the slot a form's guard goes in                                           |
| `discard.tsx`              | `useDiscardGuard` and `DiscardQuestion` (below)                                                |
| `confirm-overlay.tsx`      | `ConfirmOverlay`, the card a form asks a question in, over itself                              |
| `confirm-layer.ts`         | `ConfirmLayerContext`, the layer and the hold the card is drawn with                           |
| `fields.ts`                | `FIRST_FIELD` and `firstShownField`, where the focus goes on open                              |
| `header-slot.ts`           | `HeaderSlotContext` and `useModalHeaderSlot`, beneath the title                                |
| `types.ts`                 | `ModalHeading`, `ModalPhase`, and each prop type: `ModalProps`, `ModalButtonProps`, the rest   |

## Props

`ModalProps` (`types.ts`):

| Prop        | What it is                                                                      |
| ----------- | ------------------------------------------------------------------------------- |
| `title`     | The heading: what the dialog is for, or the entry an edit dialog edits          |
| `eyebrow`   | An edit dialog's small line over the title, "Edit Ingredient"; absent on an add |
| `qualifier` | After the title, quieter: an ingredient's formal name, a deity's tradition      |
| `onClose`   | Asked for by the Close button, Escape and a click outside                       |
| `size`      | `'wide'` for a long form; absent, the default width                             |
| `loading`   | The contents are on the way: the body is marked `aria-busy` (M9.18)             |
| `children`  | The body: a form, a confirmation, whatever the owner puts here                  |

## Contracts

- **Open is a mount, closed is an unmount.** The effect calls `showModal()`
  when the component mounts and `close()` when it unmounts. No prop says
  whether it is open. An owner shows the modal by rendering it.
- **The owner decides when it closes.** Close and Escape both call `onClose`,
  and Escape's `cancel` event is `preventDefault`ed, so the element never
  shuts itself. A URL-driven modal closes by navigating away from its address.
  If the element closed itself first, the address would still say the modal
  was open.
- **It fades in and out** (M5.5, the owner's call), dialog and backdrop
  together over 150ms. In is CSS alone, `@starting-style` as `showModal()`
  shows it. Out is the component's, since the owner's unmount would take it
  away at once: Close, Escape and a click outside set `.is-closing`, and the
  owner is asked once the fade ends, or after `FADE_LIMIT_MS` should the end
  never be reported, once however many ways it was asked. Under reduced
  motion, or with no `matchMedia` to ask, nothing fades and the owner
  is asked at once, in the event. Contents that close it themselves — a
  form's save or delete — take the modal's own close as a render prop,
  `children(close)`, so that fades too.
- **The focus trap, Escape and the inert page are the platform's.**
  `showModal()` puts the dialog in the top layer and makes the rest of the
  document inert. Nothing in the component traps focus by hand.
- **The focus goes to the first field as it opens**, not where the platform
  puts it. `showModal()` focuses the first thing in the dialog that takes the
  focus, which is the header's Close button, so every dialog opened on Close.
  Right after `showModal()`, in the same effect, the modal moves it to the
  body's first field a person can use (`firstShownField`, `fields.ts`): an
  input that is not `type="hidden"`, a select or a textarea, not disabled,
  and shown, so not under a `hidden` section as the ingredient form's closed
  ones are. With no field, the dialog itself takes it (`tabIndex={-1}`,
  drawing no ring): its name is read, and Tab moves on to Close. React's
  `autoFocus` cannot do this, since it focuses the field at mount, before
  `showModal()` opens the dialog and moves the focus again. A question over
  the form, and the discard question, keep their own focus handling
  (["Asking over the form"](#asking-over-the-form)).
- **Named by its heading**, and its eyebrow when it has one.
  `aria-labelledby` points at the `<h2>`, or at the eyebrow then the
  `<h2>`, so `getByRole('dialog', { name })` finds it
  (["An edit dialog's head"](#an-edit-dialogs-head)). The Close button is `×`, hidden
  from assistive technology, inside a button named "Close". It is a 2rem ×
  in a 2.5rem square (`$close-target`), the owner's call during M5.5, and it sits at the
  head's top: level with a one-line title, which is its height, and with an
  edit's eyebrow, rather than adrift beside a name wrapped over lines (MB.115).
- **A click outside asks the owner to close it** (M5.5, the owner's call,
  reversing M5.6's "no close on a backdrop click"), through `onClose` as
  Close and Escape do. The backdrop is the dialog's own box to an event, so
  outside is told by the point against the dialog's rectangle, and only a
  press that began outside counts: a text selection dragged out of a field
  and let go over the backdrop keeps the form. A stray click outside a
  half-filled form, the cost M5.6 weighed, now asks before throwing it away
  (["Unsaved changes"](#unsaved-changes)).
- **Modal does not give the focus back itself.** Its owner closes it by
  unmounting it, so the `<dialog>` is never closed in place and the
  browser's own return to the opener never runs. A modal a button opens is
  drawn with `ModalButton` ([below](#modalbutton)), which sends the focus
  back to that button however the modal closes (MB.119). A modal opened by
  its address is `RouteModal`'s: its trigger is a link the navigation
  re-renders.

## Unsaved changes

Every admin form asks before its changes are thrown away (MB.115, the
owner's call): Cancel, the Close button, Escape and a click outside alike.
One guard does it for all of them, in `discard.tsx`, rather than a copy in
each form.

- **The form says whether it has changes.** `useDiscardGuard(dirty)` takes
  the form's `formState.isDirty`, the flag that turns its Save on (the
  invite form, which has no react-hook-form, passes "anything typed"). Its
  Cancel calls `guard.request(close)`: with nothing changed that closes at
  once, as before; otherwise it asks.
- **The modal asks the form.** `Modal` provides a slot,
  `CloseGuardContext`, which the hook fills while the form is mounted. The
  Close button, Escape (the `cancel` event, `preventDefault`ed as always)
  and a click outside consult it before closing, passing the close they
  would make; a form with changes holds that close back and asks. Nothing is
  consulted once the modal is closing. A slot rather than a prop because the
  form sits inside the modal's render prop, out of its owner's reach. Outside
  a modal there is no slot, and the guard covers Cancel alone.
- **Saving and deleting never ask.** They close through `children(close)`,
  the modal's own close, which nothing guards, since a form just saved still
  reads as changed until it resets.
- **The question is the form's to draw**, over itself, as its Delete
  question is: `<DiscardQuestion guard={guard} />` while `guard.asking`,
  rendered after the form's own buttons, which stay where they are. It is a
  `ConfirmOverlay` (["Asking over the form"](#asking-over-the-form)) with
  "You have unsaved changes. Discard them?" and **Discard Changes**
  (`.btn--destructive`), which makes the close it held back, and **Keep
  Editing** (`.btn--quiet`), on a `.modal__actions` row. A form with a
  question of its own asks this one first, in that one's place, since it is
  what a way out would lose; Keep Editing brings the other back.
- **Focus.** The question takes the focus on Keep Editing, the safe answer,
  as the forms' Delete questions do. Keep Editing puts it away with nothing
  lost and the focus back where it was: Cancel, which stays beneath the
  question now, the field Escape was pressed in, or the Close button. If
  that has gone, the focus goes to the form's first field.
- **Tried again while asking, it flashes** (MB.115, the owner's call), so
  the person sees why nothing closed. Each try by Close, Escape or the
  backdrop counts in `guard.flashes`, which the card carries as
  `data-flash`, and draws a fresh `.confirm-overlay__flash` layer over the
  card's ground and under its words, keyed on the count so the animation
  runs every time: twice, the owner's call, the secondary's tint fading over
  300ms each time, 600ms in all (`$motion-short * 4`). Under reduced motion
  nothing fades: a solid secondary outline round the card shows and goes,
  twice, in the same time (`step-end`). Each try also puts the focus back on
  Keep Editing, and says "You have unsaved changes." in a visually hidden
  `<output>`, a polite live region, alternating a trailing no-break space so
  a repeat is a change and is read again. Keep Editing sets the count back
  to 0.
- **Undo can release the guard.** A form with undo and redo ([`field.md`](field.md#undo-and-redo)) that is undone back to its starting values is no longer dirty, so Cancel and the other ways out close at once again. The undo is off while the question is asked.
- **The browser's own ways out are not covered.** Back, a reload or closing
  the tab leave without asking: no `beforeunload` handler is added, since the
  modals are opened by their address and Back is how one is left.

## Asking over the form

A form asks before it acts, "Delete this?" or "Discard them?", on a card
drawn over the form rather than where its buttons were (MB.115, the owner's
call): one way of asking across the admin forms. `ConfirmOverlay`, in
`confirm-overlay.tsx`, is that card; the unsaved-changes question and every
form's Delete question are drawn through it.

| Prop         | What it is                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| `question`   | The question, drawn as the card's first paragraph; it names the card         |
| `labelledBy` | The id that names the card instead, when a field's label asks the question   |
| `safe`       | A ref to the safe answer, Keep It or Keep Editing; never the destructive one |
| `flashes`    | The discard guard's count of ways out tried again, each a flash of the card  |
| `children`   | What follows the question: a field, a live region, the `.modal__actions` row |

- **Where it is drawn.** The form renders it after its own buttons, which
  stay where they are, and the card portals into the modal's layer,
  `ConfirmLayerContext`, a slot as the header's control place is, since the
  form sits inside the modal's render prop. The layer is a cell of
  `.modal-dialog__main`'s grid, the same cell the body scrolls in, so its
  scrim covers exactly the part of the body in view, under the header, at
  every scroll position, and the card sits centred in it with auto margins.
  The cell is as tall as the taller of the two, so a short form's dialog
  grows to hold a question rather than scrolling it. Outside a modal there
  is no layer, and the card stands in the form's flow with no scrim
  (`.confirm-overlay--in-place`); every admin form is in a modal.
- **The form behind is held.** As the card comes, the modal sets `inert` on
  its body and on the control beside its title, so Tab, a click and typing
  cannot reach the form until the question is answered; the scrim, the
  page's ground at 75% as the backdrop is, dims both. The title and the Close
  button are not held, so Close, Escape and a click outside go through the
  form's guard as before: closing with nothing changed, asking about a change,
  or flashing a question already asked. The attribute is set on the elements
  in a layout effect rather than through a render, so it is on before the
  card takes the focus and off before the focus goes back. The holds are
  counted, so one question giving way to another releases once.
- **Escape is unchanged.** It is the modal's, as it was when the questions
  stood in place of the buttons: a Delete question with nothing changed
  closes the modal; with a change, the unsaved-changes question takes its
  place, and Keep Editing brings the Delete question back.
- **A labelled group, not an alertdialog.** The card is a `<fieldset>`, whose
  role is `group`, named by its question through `aria-labelledby`, so a
  screen reader reads the question as the focus enters it. It is not an
  `alertdialog`: an alertdialog promises a dialog's behaviour — the focus
  kept inside it, Escape answering it — and this card keeps neither. The
  modal's Close stays reachable beside it, and Escape stays the modal's.
  Nested inside the modal's own `dialog`, a second dialog role would announce
  a dialog that does not behave as one.
- **Focus.** As the card comes it takes the focus on `safe`, the answer that
  changes nothing, and never on the destructive one. As it goes, the form
  live again first, the focus goes back where it was (the button pressed,
  which stays beneath the card) or, if that has gone, to the body's first
  field. Both in one layout effect, so a question giving way to another — a
  group's move turning to its confirmation, or a Delete question to the
  unsaved changes' — hands the focus over in one commit. A form keys a
  question by its step, so each step takes the focus on its own safe answer.
- **Motion.** The scrim and the card fade in over `$motion-short`, from
  `@starting-style`, and appear at once under reduced motion. They go at
  once, with the question.
- **Its row stacks** at the width a form's own does: under 28rem of the
  form's width, which is the main area's less the body's padding
  (`$narrow-column + $modal-padding`, a container query on `modal-main`).

### `ConfirmQuestion`

The yes-or-no question a form asks over itself, in `confirm-question.tsx`
beside `DiscardQuestion`, written once for the questions the forms drew each
on their own (MB.115): `GroupForm`'s Delete and Move and Delete,
`GroupedValueForm`'s Delete, and `IngredientForm`'s Delete and MB.82's End
Redirect & Save. A `ConfirmOverlay` holding the acting answer, a
`BusyButton`, and the safe one, quiet, which takes the focus.

| Prop           | What it is                                                                           |
| -------------- | ------------------------------------------------------------------------------------ |
| `question`     | The question, which names the card                                                   |
| `asked`        | Its own question is being asked; true by default, for a form that draws it only then |
| `guard`        | The form's `useDiscardGuard`, whose question shows in its place while it asks        |
| `confirmLabel` | The acting answer: "Delete" by default                                               |
| `busyLabel`    | What it says while busy: "Deleting" by default                                       |
| `tone`         | `'destructive'` by default, `'solid'` for a save                                     |
| `keepLabel`    | The safe answer: "Keep It" by default, "Back" for a step back                        |
| `busy`         | The action is in flight: the acting answer busy and shut                             |
| `onConfirm`    | The action, a promise                                                                |
| `onKeep`       | The safe answer's                                                                    |
| `onRefused`    | Told a refusal's sentence when `onConfirm` rejects, for the form's alert             |

- **Which question shows.** Given the form's guard, the unsaved changes'
  question shows while it asks, ahead of the form's own, since they are what
  a way out would lose; Keep Editing brings the form's question back. A form
  with steps, as `GroupForm`'s delete is, settles that itself and passes no
  guard.
- **A refusal.** When `onConfirm` rejects, the question reads the refusal,
  the server's first sentence or the one generic sentence, and hands it to
  `onRefused`, where the form closes the question and shows it in its alert: a
  refusal naming its remedy, not a bad value in a box (DESIGN.md §7). A form
  that places a refusal itself, as `GroupForm` puts a refused move back at
  the choice, catches it in `onConfirm` and passes no `onRefused`.

## An edit dialog's head

It is not apparent from an edit form alone what is being edited, so every
admin edit dialog says, the owner's call at MB.115: a small, muted, uppercase
eyebrow naming the action and the kind, then the entry as the heading.

```
| EDIT INGREDIENT                     × |
| Mugwort  Artemisia vulgaris           |
```

`ModalHeading` (`types.ts`) is the three props that say it, which
`RouteModal` and the admin dialog wrappers pass on whole:

- **`eyebrow`**, "Edit Ingredient", "Edit Deity", "Edit Category Group": the
  `.eyebrow` primitive, written in title case and uppercased by its CSS.
  An add dialog has none; its title, "Add Ingredient", already says it.
- **`title`**, the entry's name **as it was saved**, from what the page read
  to open the dialog, never the Name field's live value: the head holds still
  while the admin renames the entry, and changes once the save re-reads it.
- **`qualifier`**, after the name in the body's face and muted ink, where the
  entry's list names it by a second thing too: an ingredient's formal name
  (its list's Formal Name column and edit link), and a deity's tradition (its
  pills, "Hecate (Greek)", since two traditions may share a deity's name).
  The caller sets a binomial's italics, `.binomial`, since only it knows
  the nomenclature: a mineral's or a chemical's formal name stays upright.
  A category's or a form's group is where it is filed, not part of its name,
  so they have none.

**A screen reader hears both**: the dialog is labelled by the eyebrow, then
the heading, "Edit Ingredient, Mugwort, Artemisia vulgaris". The commas are
there for the name alone, since `aria-labelledby` joins its parts with a
space and a reader would otherwise run them together. Each is a
`.spoken-separator`, a comma drawn at no size, rather than `.visually-hidden`
text: that is taken out of the flow, and Chrome then puts a space either
side of it in the name, "Edit Ingredient , Mugwort" (`styling.md`).

The eyebrow and title are a `.header` column, closer than its gap, which may
shrink past its content: a long name wraps rather than pushing the × out, and
a name with no break in it breaks anywhere.

| Dialog                                    | Eyebrow                               | Qualifier   |
| ----------------------------------------- | ------------------------------------- | ----------- |
| `/admin/compendium?edit=`                 | Edit Ingredient                       | Formal name |
| `/admin/categories`, `forms`              | Edit Category, Edit Form              | —           |
| `/admin/deities`                          | Edit Deity                            | Tradition   |
| `/admin/celestial-bodies`, `zodiac-signs` | Edit Celestial Body, Edit Zodiac Sign | —           |
| `/admin/category-groups`, `form-groups`   | Edit Category Group, Edit Form Group  | —           |
| `/admin/deity-traditions`                 | Edit Tradition                        | —           |

## A control in the header

The header holds the title, with its eyebrow over it on an edit, then the ×,
and under them a toolbar row, full width, at every width: one layout. The row
is stretched, so every button in it is as tall as the tallest, and a little
space sits above it. Empty, it takes no line. The first control sits at its
start and a form's Undo and Redo pair at its end (the pair carries
`margin-inline-start: auto`, so a group form's lone pair lands at the end
too). This is the owner's call at M12.10 (2026-10-17), which replaced
MB.115's place under the ×, level with the heading's foot; MB.115 had moved
the control off the title line, between the title and the ×, because there it
squeezed a phone's heading until a name broke mid-word, and the row avoids
that too.

The modal hands the row down as an element (`HeaderSlotContext`), and its
contents may portal controls of their own into it through
`useModalHeaderSlot()`: the ingredient form's Open All / Close All, the
owner's call at MB.115, and a form's Undo and Redo buttons
(`FormHistoryButtons`, M12.9). The context is exported from the barrel too,
so a panel inside the form can set it to `null` and keep its own undo buttons
out of the header (M12.10). A slot, as the guard is, since the form sits
inside the modal's render prop, out of its owner's reach. Outside a modal the
hook answers null and the form keeps the controls in its own flow. Tab order
follows the page: the ×, then the controls, then the form. While a question is
asked over the form, the row is held and dimmed with it
(["Asking over the form"](#asking-over-the-form)).

## ModalButton

A button that opens a modal, and the focus back on the button however the
modal closes: Close, Escape, a click outside, or the contents' own close
(MB.119). It holds the open state and renders `Modal` while open, so its
owner writes neither. It was lifted from `InviteDialog`, which carried the
first copy, and is for every modal a page's button opens: an Invite, a Leave
Coven. `ModalButtonProps` (`types.ts`):

| Prop        | What it is                                                               |
| ----------- | ------------------------------------------------------------------------ |
| `label`     | The button's text and accessible name, in title case                     |
| `className` | The button's classes, `btn btn--solid`                                   |
| `title`     | The dialog's heading and accessible name                                 |
| `size`      | As `Modal`'s                                                             |
| `children`  | A function of the modal's close, so a form can close it once it has sent |

The focus moves only after a close, never on the first render, so the page
loads with the focus where the browser puts it.

### Add Ingredient

The shell’s Add Ingredient control (`AppShell/add-ingredient-button.tsx`,
M8.16) opens a `Modal` holding an `IngredientForm` for one coven. A
_destination_ is the compendium (for a viewer who can curate) or a coven the
viewer may write to; a coven they may only read is never one. With one
destination the control is a plain button. With two or more it is a split
button: the main part opens the default destination, and a chevron (`Choose
Where to Add`, `aria-haspopup="menu"`) opens a menu listing every
destination by name, the compendium first (`add-ingredient-menu.tsx`; the
repo had no ARIA menu, so it is written there with arrow keys, Escape and a
press outside). The default is, on `/admin/*`, the compendium for a curator;
otherwise the coven the address names, else the first coven they may write to.
Choosing the compendium is a `router.push` to `/admin/compendium?new` (the
admin layout’s route-modal provider sits below the shell, so the button cannot
open that dialog itself, and the page draws it for a direct request); choosing
a coven opens the modal.

The modal’s head is the coven’s name as the eyebrow over the title “Add
Ingredient”, so the person always sees where the ingredient goes. The
destination is fixed once the dialog opens: there is no Coven select. With
nowhere to write the control is not drawn. After Save Ingredient the modal
closes and the control leaves a status beside it, since the form’s own Saved
notice goes with the form.

## RouteModal

A modal opened by its page's address, `?new` or `?edit=<slug>`: the shape
every admin page's add and edit modal takes. A page renders it always, at one
fixed place (M9.18). It shows its `content` when the address opens a modal, a
skeleton under the pressed row's head while a press is on its way
("Opening at once"), and nothing otherwise. Eight wrappers under
`src/app/(shell)/admin/` each wrote the same lines until MB.115, and the celestial bodies and
zodiac signs' one handed the navigation straight to its form, so a save there
skipped the fade.

`RouteModalProps` (`types.ts`):

| Prop        | What it is                                                                                                                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `closeHref` | The page it opened over, its modal parameter dropped                                                                                                                                                           |
| `size`      | As `Modal`'s                                                                                                                                                                                                   |
| `content`   | Absent unless the address opens a modal: `{ heading, body }`, the head (`ModalHeading`: title, eyebrow, qualifier) and `body`, a function of `done`, the modal's own close: `(done) => <Form onDone={done} />` |

- **Closing is a navigation back.** Close, Escape, a click outside and
  `done` all fade the modal out, then `router.replace(closeHref)`, so Back
  does not open it again, and `router.refresh()`, so the list beneath re-reads
  after a save or a delete.
- **`done` fades first.** It is `Modal`'s own close, so a form that closes
  the modal itself fades out as Close does, and the page goes back once the
  fade ends.
- **Closing while it loads cancels the press.** The skeleton's Close
  calls the provider's `cancel()`, then goes back as above. The navigation
  back supersedes the one on its way, which Next discards.
- **A caller needing more of the router keeps its own.** The compendium's
  form moves from `?new` to `?edit=` after a save without closing, through
  its own `useRouter`.

## Opening at once

Pressing an Edit pencil or an Add button used to follow a plain link to
`?edit=<slug>` or `?new`, and nothing showed until the server had drawn the
whole page again with the modal in it. Since M9.18 the press opens the dialog
at once, with its head over a skeleton, the way a filter shows it is loading.
The form arrives in the same dialog.

- **The provider.** `RouteModalProvider` (`route-modal-provider.tsx`) is
  mounted once, in `src/app/(shell)/admin/layout.tsx`. It keeps the heading of the
  modal just pressed and runs `router.push(href)` inside `useTransition`
  (a React call that marks a change as in progress until it finishes). It
  offers `loading` (that heading while the push is pending, otherwise
  nothing), `open(href, heading)` and `cancel()`. The workshop, whose
  router goes nowhere, supplies its own value through the exported
  `RouteModalContext`; a provider already above is kept, not shadowed.
- **`useOpenModalClick(href, heading)`** returns the `onClick` for a link.
  For a plain press of the main button it stops the browser following the
  link and calls `open`. A press with Ctrl, Cmd, Shift or Alt, or any other
  button, is the browser's (a new tab or window), and so is a press before
  the page's script has loaded: the link still works as a link. Outside a
  provider the hook returns nothing, and the link stays plain. `EditLink`
  ([`icon-tip.md`](icon-tip.md)), `AddAction` (`src/app/(shell)/admin/add-action.tsx`)
  and New Invitation all use it, and so does each name on `/admin/users`, which
  opens the user's modal, `?user=<id>` (M9.19, [`user-list.md`](user-list.md)).
- **The heading is known before the form.** The page builds each row's
  `editHeading` on the server, with the same builder the loaded modal uses,
  and hands it to the row beside `editHref`. So the head does not change when
  the form arrives.
- **One dialog from the press to the form.** The skeleton and the loaded
  modal are the same `<Modal>` at the same place in the page, so React keeps
  the one `<dialog>` and it fades in once, not twice. The form inside is
  keyed by the row's id, so opening another row starts a fresh form.
- **The skeleton** (`ModalLoading`, `loading.tsx`) is a visually hidden
  `<output>Loading</output>` (a status a screen reader announces) and
  placeholder shapes hidden from it: four label-and-box pairs and a row of two
  buttons. While it shows, `Modal`'s `loading` prop marks the body
  `aria-busy`.
- **Focus.** When `loading` turns false, the focus moves to the form's first
  field, but only if it is still on the dialog itself. A person who has
  already moved it, to Close say, keeps it.
- **A direct request** to `?edit=` or `?new` (a bookmark, a new tab) still
  renders the modal on the server, with no skeleton.
- **A row deleted since the list was drawn.** The navigation lands with no
  `content`, the dialog goes, and the page's `MissingNotice` says so.
- **No GraphQL query.** The form's contents could have been fetched from
  `/api/graphql` while the skeleton showed, but a read that comes with a
  navigation belongs to the server component (CLAUDE.md, rule 1): it already
  reads the row, with the same checks, to draw a direct request. A second
  path would have to be kept in step with it.

## Styling

Only what the native element needs beyond `.modal`: no border, a 32rem
column (`$dialog-column`) so it fits a phone, a height within the viewport's,
and a `::backdrop` of the page surface at 75%.

**The body scrolls, not the dialog** (MB.115). The open dialog is a flex
column, the header over `.modal-dialog__main`, which reaches the dialog's
edges and holds `.modal-dialog__body`, the part that scrolls, with the
dialog's padding given back inside it so a focus ring at a field's edge is
not cut off. So the header stays at the top as a long form scrolls beneath
it, the owner's call at MB.115, without being `position: sticky`, and a
question's layer can lie over exactly the part of the body in view. The body
is isolated, so nothing in it raised by a `z-index` rises over the layer.

**The dialog clips, so nothing can scroll it** (MB.258). Its overflow is
`clip`, not `hidden`. A `hidden` box is still a scroll container that a
script or a focus change may scroll, and the dialog had plenty to scroll:
the body is not positioned, so the form's absolutely positioned
screen-reader text (`.visually-hidden` live regions) is placed against the
dialog, at where it would sit in the unscrolled form, far below the
dialog's foot. The reference panel's `scrollIntoView` then scrolled the
dialog as well as the body, lifting the header out of view and leaving
blank space beneath the body. It shows only when such text lies below the
dialog's foot, which turns on how long the form is at that moment, and
whether the body could bring the panel up on its own; on a short form
there is nothing to scroll.
`clip` makes the dialog no scroll container at all, so the header holds
whatever a field does; `tests/e2e/admin-compendium.spec.ts` checks it.

**The page stays in view around it** (M5.5, the owner's call): a gap of
`clamp(space(4), 5vmin, space(7))` on every side, 1rem at a phone's edge
rising to 3rem on a wide screen, takes the width and the height down from
the viewport's. The dialog is `border-box`, so `.modal`'s 1.5rem padding
sits inside those limits; it used to land outside them, and the compendium's
long form overran the screen by 8px at either end. The widths add the padding
back, so a column keeps the content width it had.

**The page behind does not scroll while it is open** (M5.5, the owner's
call). `showModal()` makes the page inert, but a wheel over the backdrop
still scrolled it. `:root:has(.modal-dialog:modal)` sets `overflow: hidden`,
in CSS so no listener can leave the page locked, with `scrollbar-gutter:
stable` so nothing shifts sideways as the scrollbar goes; the body's own
scroll is `overscroll-behavior: contain`, and it keeps it, so nothing in it is
out of reach.

**The skeleton** (M9.18) draws its shapes with `.modal-skeleton*`
(`Modal/index.scss`). Their shimmer is the shared Sass mixin `skeleton-shape`
(`src/scss/_mixins.scss`), with its `skeleton-shimmer` keyframes in
`src/scss/_primitives.scss`; the tab skeleton ([`tabbed-page.md`](tabbed-page.md))
uses the same mixin, where it once kept a keyframes of its own.

**On a phone it stays inset**, the same gap on every side, rather than
becoming a full-height sheet: the owner's M5.5 call, kept at MB.115's review.

`size="wide"` adds `.modal-dialog--wide`, a 48rem column (`$dialog-column-wide`), for a long form that the default column
would crowd. Nothing uses it since MB.115: the compendium form, its first
owner, went back to the default column on the owner's call, since the form
caps itself at that width and the wide modal only drew empty space beside it.
M8.16's IngredientForm modal should take the default too, for the same reason. It changes only the width; the body scrolls
within the viewport's height either way.

## Stories

[`index.stories.tsx`](../../src/components/Modal/index.stories.tsx), under
`Surfaces / Modal`. Each sets `meta = { iframed: true }`, since the dialog
sits in the top layer ([`workshop.md`](../workshop.md)); each owner keeps an
Open button to bring it back after Close or Escape.

- `WithAForm`, the default column around a small form, and `Wide`, the wide
  size around a longer one.
- `Editing`, an edit dialog's head: the eyebrow, a long title and a binomial
  as the qualifier. `EditingDark`, `EditingLight`, `EditingPhoneDark` and
  `EditingPhoneLight` pin its theme and, on a phone, its 375px width.
- `OpenedByItsAddress`, a `RouteModal` with `content`, as an address opens it.
  `Loading`, with `LoadingPhoneDark` and `LoadingPhoneLight`, shows the
  pressed row's head over the skeleton, through a `RouteModalContext` value
  whose navigation never arrives.
- `OpenedByAButton` shows `ModalButton`: tab to the button, open it, close
  it any way, and the focus ring is back on the button. `OpenedByAButtonOpen`
  is the same, pressed open as it mounts, so the dialog itself can be looked at.
- `AskingToDiscardChanges`, with `PhoneDark` and `PhoneLight`, the discard
  question over a form with a change; Escape or Close there flashes it.
  `AskingToConfirm` shows `ConfirmQuestion`'s Delete and Keep It, Delete busy
  once pressed.
- `WithPickers`, a picker and a multi-picker, where Escape closes an open list
  before it closes the modal.

## Testing

`tests/components/Modal/index.test.tsx`. happy-dom's `<dialog>` has a bare
`showModal()` and `close()` that set and clear `open` and trap no focus, so the
test puts spies on the prototype that do the same and can be asserted on. A click outside is told by
where the press began and ended, happy-dom laying nothing out: pressed and
released on the backdrop closes it; its contents, and a press inside let go
outside, do not. Its own padding is inside its box, which only a real layout
shows, as does the wide size. The fade asks the owner once its transition
ends, once however many ways it was asked, after a limit if no end comes, and
at once under reduced motion. The e2e spec (`admin.spec.ts`)
opens the category modal in a real browser, closes it with Escape, and runs
axe against it while it is open, and again with a category group's Move and
Delete question open over its form. `admin-compendium.spec.ts` closes one by a
click on the backdrop, holds the wide one to its gap on a desktop and at
375px, and the page behind still while it is open and scrolling again once it
closes.

The unsaved-changes guard's shape is asserted there too, on a form of the
test's own: Cancel, Close, Escape and a click outside asking only once
something changed, the dialog staying open, Keep Editing keeping the value
and returning the focus, Discard Changes closing, a save closing without
asking, and a try while asking flashing the question (its `data-flash`
count rising each time), the focus back on Keep Editing and the status
speaking. The overlay's own state is asserted there too: while asking, the
form's fields and buttons and a control beside the title are inert, and the
question, a group, and the Close button are not; answered, all are live
again, and the focus is back on Cancel. happy-dom implements `inert`'s
attribute but not its effect, so the attribute is what is asserted; Playwright
runs the real thing. Each admin form's own test asserts only its wiring,
through `tests/support/discard-guard.tsx`: `expectGuardedWaysOut` for the
unsaved changes, and `expectAskingOver` and `expectAnswered` for a Delete
question in a modal (the form inert, the question a named group, the focus
on the safe answer; then gone, the form live). The `AskingToDiscardChanges`
story, and its `PhoneDark` and `PhoneLight` pair, show the question over a
short form; pressing Escape or Close there flashes it. `AskingToConfirm`
shows `ConfirmQuestion`'s Delete and Keep It, Delete busy once pressed. The
forms' own tests cover `ConfirmQuestion` through their Delete questions.
IngredientForm's
`AskingToDeleteInModal` and `AskingToDiscardInModal` show it over the long
form scrolled down, each with a phone pair.

`tests/components/Modal/route-modal.test.tsx` (M9.18) covers the opening at
once: a plain press opens the modal with the pressed head and a status, a
press with a modifier is left to the link, a link outside a provider stays
plain, the contents replace the skeleton in the same dialog, and a close while
loading cancels the press. Each admin page test still asserts its modal's
close href, and the e2e specs open and close the modals in a real browser.

`tests/components/Modal/modal-button.test.tsx` (MB.119) opens the modal
from its button, then closes it by Close, by Escape and by the contents'
own close, and finds each time no dialog and the focus on the button. A
click outside reaches the same `onClose` as Escape, so it is not repeated.
