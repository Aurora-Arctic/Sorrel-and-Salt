# Modal

`src/components/Modal/` — a dialog over the page (M5.6), the project's first.
It is the native `<dialog>` in its modal mode, with the `.modal` primitive's
surface and a heading that names it. M5.6's category page opens it from the
address; M8.16, M8.17 and M7.4 are its next owners. `RouteModal`, beside it,
is the wrapper every admin page opens it through (below).

| File                  | What it holds                                                                          |
| --------------------- | -------------------------------------------------------------------------------------- |
| `modal.tsx`           | `Modal`, the default export                                                            |
| `route-modal.tsx`     | `RouteModal`                                                                           |
| `index.tsx`           | The exports; two files, since `RouteModal` renders `Modal`                             |
| `close-guard.ts`      | `CloseGuardContext`, the slot a form's guard goes in                                   |
| `discard.tsx`         | `useDiscardGuard` and `DiscardQuestion` (below)                                        |
| `confirm-overlay.tsx` | `ConfirmOverlay`, the card a form asks a question in, over itself                      |
| `confirm-layer.ts`    | `ConfirmLayerContext`, the layer and the hold the card is drawn with                   |
| `fields.ts`           | `FIRST_FIELD` and `firstShownField`, where the focus goes on open                      |
| `header-slot.ts`      | `HeaderSlotContext` and `useModalHeaderSlot`, beside the title                         |
| `types.ts`            | `ModalHeading`, `ModalProps`, `RouteModalProps`, `ModalPhase`, the guard's, the card's |

## Props

`ModalProps` (`types.ts`):

| Prop        | What it is                                                                      |
| ----------- | ------------------------------------------------------------------------------- |
| `title`     | The heading: what the dialog is for, or the entry an edit dialog edits          |
| `eyebrow`   | An edit dialog's small line over the title, "Edit Ingredient"; absent on an add |
| `qualifier` | After the title, quieter: an ingredient's formal name, a deity's tradition      |
| `onClose`   | Asked for by the Close button, Escape and a click outside                       |
| `size`      | `'wide'` for a long form; absent, the default width                             |
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
  motion, or with no `matchMedia` to ask (jsdom), nothing fades and the owner
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
  in a 2.5rem square (`$close-target`), the owner's call during M5.5, and the header centres it
  on the title.
- **A click outside asks the owner to close it** (M5.5, the owner's call,
  reversing M5.6's "no close on a backdrop click"), through `onClose` as
  Close and Escape do. The backdrop is the dialog's own box to an event, so
  outside is told by the point against the dialog's rectangle, and only a
  press that began outside counts: a text selection dragged out of a field
  and let go over the backdrop keeps the form. A stray click outside a
  half-filled form, the cost M5.6 weighed, now asks before throwing it away
  (["Unsaved changes"](#unsaved-changes)).
- **Focus goes back to the trigger only if the owner sends it there.** A
  URL-driven modal's trigger is a link that the navigation re-renders. M8.16,
  whose criteria ask for focus restored, adds that to the modal it builds.

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
  `@starting-style`, and appear at once under reduced motion. It opens with the focus on its first shown field, past a hidden input, a disabled select and a field under `hidden`, or on itself when it holds none; and is named by its eyebrow, title and qualifier together. They go at
  once, with the question.
- **Its row stacks** at the width a form's own does: under 28rem of the
  form's width, which is the main area's less the body's padding
  (`$narrow-column + $modal-padding`, a container query on `modal-main`).

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
visually hidden text, there for the name alone, since `aria-labelledby`
joins its parts with a space and a reader would otherwise run them together.

The eyebrow and title are a `.header` column, closer than its gap, which may
shrink past its content: a long name wraps rather than pushing the × out, and
a name with no break in it breaks anywhere.

| Dialog                                  | Eyebrow                              | Qualifier   |
| --------------------------------------- | ------------------------------------ | ----------- |
| `/admin/compendium?edit=`               | Edit Ingredient                      | Formal name |
| `/admin/categories`, `forms`            | Edit Category, Edit Form             | —           |
| `/admin/deities`                        | Edit Deity                           | Tradition   |
| `/admin/planets`, `zodiac-signs`        | Edit Planet, Edit Zodiac Sign        | —           |
| `/admin/category-groups`, `form-groups` | Edit Category Group, Edit Form Group | —           |
| `/admin/deity-traditions`               | Edit Tradition                       | —           |

## Beside the title

The header holds the title, with its eyebrow over it on an edit, then an empty place beside it, then the ×. The
modal hands that place down as an element (`HeaderSlotContext`), and its
contents may portal one control of their own into it through
`useModalHeaderSlot()`: the ingredient form's Open All / Close All, the
owner's call at MB.115. A slot, as the guard is, since the form sits inside
the modal's render prop, out of its owner's reach. Outside a modal the hook
answers null and the form keeps the control in its own flow. Empty, the place
is only the space that pushes the × to the end. Tab order follows the page:
the title's control, then the ×, then the form. While a question is asked
over the form, the place is held and dimmed with it
(["Asking over the form"](#asking-over-the-form)).

## RouteModal

A modal opened by its page's address, `?new` or `?edit=<slug>`: the shape
every admin page's add and edit modal takes. Eight wrappers under
`src/app/admin/` each wrote the same lines until MB.115, and the planets and
zodiac signs' one handed the navigation straight to its form, so a save there
skipped the fade.

`RouteModalProps` (`types.ts`):

| Prop                            | What it is                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `title`, `eyebrow`, `qualifier` | As `Modal`'s: its head                                                          |
| `closeHref`                     | The page it opened over, its modal parameter dropped                            |
| `size`                          | As `Modal`'s                                                                    |
| `children`                      | A function of `done`, the modal's own close: `(done) => <Form onDone={done} />` |

- **Closing is a navigation back.** Close, Escape, a click outside and
  `done` all fade the modal out, then `router.replace(closeHref)`, so Back
  does not open it again, and `router.refresh()`, so the list beneath re-reads
  after a save or a delete.
- **`done` fades first.** It is `Modal`'s own close, so a form that closes
  the modal itself fades out as Close does, and the page goes back once the
  fade ends.
- **A caller needing more of the router keeps its own.** The compendium's
  form moves from `?new` to `?edit=` after a save without closing, through
  its own `useRouter`.

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

**On a phone it stays inset**, the same gap on every side, rather than
becoming a full-height sheet: the owner's M5.5 call, kept at MB.115's review.

`size="wide"` adds `.modal-dialog--wide`, a 48rem column (`$dialog-column-wide`), for a long form that the default column
would crowd. Nothing uses it since MB.115: the compendium form, its first
owner, went back to the default column on the owner's call, since the form
caps itself at that width and the wide modal only drew empty space beside it.
M8.16's IngredientForm modal should take the default too, for the same reason. It changes only the width; the body scrolls
within the viewport's height either way.

## Testing

`tests/components/Modal/index.test.tsx`. jsdom implements neither
`showModal()` nor `close()`, so the test stands both in on the prototype,
adding and removing `open` as a browser does. A click outside is told by
where the press began and ended, jsdom laying nothing out: pressed and
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
again, and the focus is back on Cancel. jsdom implements `inert`'s
attribute but not its effect, so the attribute is what is asserted; Playwright
runs the real thing. Each admin form's own test asserts only its wiring,
through `tests/support/discard-guard.tsx`: `expectGuardedWaysOut` for the
unsaved changes, and `expectAskingOver` and `expectAnswered` for a Delete
question in a modal (the form inert, the question a named group, the focus
on the safe answer; then gone, the form live). The `AskingToDiscardChanges`
story, and its `PhoneDark` and `PhoneLight` pair, show the question over a
short form; pressing Escape or Close there flashes it. IngredientForm's
`AskingToDeleteInModal` and `AskingToDiscardInModal` show it over the long
form scrolled down, each with a phone pair.

`RouteModal` has no file of its own (claude-docs/testing/layer-ownership.md,
"What a test may assert", rule 6): each admin page test asserts its modal's
close href, and the e2e specs close the modals in a real browser.
