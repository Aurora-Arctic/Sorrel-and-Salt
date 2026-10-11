# Modal

`src/components/Modal/` — a dialog over the page (M5.6), the project's first.
It is the native `<dialog>` in its modal mode, with the `.modal` primitive's
surface and a heading that names it. M5.6's category page opens it from the
address; M8.16, M8.17 and M7.4 are its next owners. `RouteModal`, beside it,
is the wrapper every admin page opens it through (below).

| File              | What it holds                                                  |
| ----------------- | -------------------------------------------------------------- |
| `modal.tsx`       | `Modal`, the default export                                    |
| `route-modal.tsx` | `RouteModal`                                                   |
| `index.tsx`       | The exports; two files, since `RouteModal` renders `Modal`     |
| `close-guard.ts`  | `CloseGuardContext`, the slot a form's guard goes in           |
| `discard.tsx`     | `useDiscardGuard` and `DiscardQuestion` (below)                |
| `header-slot.ts`  | `HeaderSlotContext` and `useModalHeaderSlot`, beside the title |
| `types.ts`        | `ModalProps`, `RouteModalProps`, `ModalPhase`, the guard's     |

## Props

`ModalProps` (`types.ts`):

| Prop       | What it is                                                     |
| ---------- | -------------------------------------------------------------- |
| `title`    | The heading, and so the dialog's accessible name               |
| `onClose`  | Asked for by the Close button, Escape and a click outside      |
| `size`     | `'wide'` for a long form; absent, the default width            |
| `children` | The body: a form, a confirmation, whatever the owner puts here |

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
- **Named by its heading.** `aria-labelledby` points at the `<h2>`, so
  `getByRole('dialog', { name })` finds it. The Close button is `×`, hidden
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
- **The question is the form's to draw**, where its buttons were, as its
  Delete question is: `<DiscardQuestion guard={guard} />` while
  `guard.asking`, a `.form__confirm` with "You have unsaved changes.
  Discard them?" and **Discard Changes** (`.btn--destructive`), which makes
  the close it held back, and **Keep Editing** (`.btn--quiet`). Its row is
  `.modal__actions`, or `row="form__actions"` where the form's other
  questions use that, as IngredientForm's do.
- **Focus.** The question scrolls into view and takes the focus on Keep
  Editing, the safe answer, as the forms' Delete questions do: smooth unless
  motion is reduced, `scrollIntoView?.` for jsdom. Keep Editing puts it away
  with nothing lost and the focus back where it was (the field Escape was
  pressed in, the Close button), or on the form's first field when that has
  gone, as Cancel has.
- **Tried again while asking, it flashes** (MB.115, the owner's call), so
  the person sees why nothing closed. Each try by Close, Escape or the
  backdrop counts in `guard.flashes`, which the question carries as
  `data-flash`, and draws a fresh `.discard-question__flash` layer behind it,
  keyed on the count so the animation runs every time: the secondary's tint,
  fading over `$motion-short * 4`, 600ms. Under reduced motion nothing fades:
  a solid secondary outline shows for as long, then goes (`step-end`). Each
  try also scrolls the question into view and puts the focus back on Keep
  Editing, and says "You have unsaved changes." in a visually hidden
  `<output>`, a polite live region, alternating a trailing no-break space so
  a repeat is a change and is read again. Keep Editing is described by the
  question, so the focus it takes reads it. Keep Editing sets the count back
  to 0.
- **The browser's own ways out are not covered.** Back, a reload or closing
  the tab leave without asking: no `beforeunload` handler is added, since the
  modals are opened by their address and Back is how one is left.

## Beside the title

The header holds the title, then an empty place beside it, then the ×. The
modal hands that place down as an element (`HeaderSlotContext`), and its
contents may portal one control of their own into it through
`useModalHeaderSlot()`: the ingredient form's Open All / Close All, the
owner's call at MB.115. A slot, as the guard is, since the form sits inside
the modal's render prop, out of its owner's reach. Outside a modal the hook
answers null and the form keeps the control in its own flow. Empty, the place
is only the space that pushes the × to the end. Tab order follows the page:
the title's control, then the ×, then the form.

## RouteModal

A modal opened by its page's address, `?new` or `?edit=<slug>`: the shape
every admin page's add and edit modal takes. Eight wrappers under
`src/app/admin/` each wrote the same lines until MB.115, and the planets and
zodiac signs' one handed the navigation straight to its form, so a save there
skipped the fade.

`RouteModalProps` (`types.ts`):

| Prop        | What it is                                                                      |
| ----------- | ------------------------------------------------------------------------------- |
| `title`     | The heading, and so the dialog's accessible name                                |
| `closeHref` | The page it opened over, its modal parameter dropped                            |
| `size`      | As `Modal`'s                                                                    |
| `children`  | A function of `done`, the modal's own close: `(done) => <Form onDone={done} />` |

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
column (`$dialog-column`) so it fits a phone, scrolling within the viewport's height, and a
`::backdrop` of the page surface at 75%.

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
stable` so nothing shifts sideways as the scrollbar goes; the dialog's own
scroll is `overscroll-behavior: contain`, and it keeps it, so nothing in it is
out of reach.

**On a phone it stays inset**, the same gap on every side, rather than
becoming a full-height sheet: the owner's M5.5 call, kept at MB.115's review.

`size="wide"` adds `.modal-dialog--wide`, a 48rem column (`$dialog-column-wide`), for a long form that the default column
would crowd. Nothing uses it since MB.115: the compendium form, its first
owner, went back to the default column on the owner's call, since the form
caps itself at that width and the wide modal only drew empty space beside it.
M8.16's IngredientForm modal should take the default too, for the same reason. It changes only the width; the dialog scrolls
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
axe against it while it is open. `admin-compendium.spec.ts` closes one by a
click on the backdrop, holds the wide one to its gap on a desktop and at
375px, and the page behind still while it is open and scrolling again once it
closes.

The unsaved-changes guard's shape is asserted there too, on a form of the
test's own: Cancel, Close, Escape and a click outside asking only once
something changed, the dialog staying open, Keep Editing keeping the value
and returning the focus, Discard Changes closing, a save closing without
asking, and a try while asking flashing the question (its `data-flash`
count rising each time), the focus back on Keep Editing and the status
speaking. Each admin form's own test
asserts only its wiring, through `tests/support/discard-guard.tsx`. The
`AskingToDiscardChanges` story, and its `PhoneDark` and `PhoneLight` pair,
show the question; pressing Escape or Close there flashes it.

`RouteModal` has no file of its own (claude-docs/testing/layer-ownership.md,
"What a test may assert", rule 6): each admin page test asserts its modal's
close href, and the e2e specs close the modals in a real browser.
