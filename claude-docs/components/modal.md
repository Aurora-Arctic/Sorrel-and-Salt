# Modal

`src/components/Modal/` — a dialog over the page (M5.6), the project's first.
It is the native `<dialog>` in its modal mode, with the `.modal` primitive's
surface and a heading that names it. M5.6's category page opens it from the
address; M8.16, M8.17 and M7.4 are its next owners.

## Props

`ModalProps` (`types.ts`):

| Prop       | What it is                                                     |
| ---------- | -------------------------------------------------------------- |
| `title`    | The heading, and so the dialog's accessible name               |
| `onClose`  | Asked for by the Close button and by Escape                    |
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
  in a 2.5rem square, the owner's call during M5.5, and the header centres it
  on the title.
- **A click outside asks the owner to close it** (M5.5, the owner's call,
  reversing M5.6's "no close on a backdrop click"), through `onClose` as
  Close and Escape do. The backdrop is the dialog's own box to an event, so
  outside is told by the point against the dialog's rectangle, and only a
  press that began outside counts: a text selection dragged out of a field
  and let go over the backdrop keeps the form. A stray click outside a
  half-filled form now throws it away, the cost M5.6 weighed.
- **Focus goes back to the trigger only if the owner sends it there.** A
  URL-driven modal's trigger is a link that the navigation re-renders. M8.16,
  whose criteria ask for focus restored, adds that to the modal it builds.

## Styling

Only what the native element needs beyond `.modal`: no border, a 32rem
column so it fits a phone, scrolling within the viewport's height, and a
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
out of reach. Nothing goes
past the tokens before the admin area's design review (MB.115).

`size="wide"` adds `.modal-dialog--wide`, a 48rem column, for a long form that the default column
would crowd. M5.5's compendium form is its first owner, and M8.16's
IngredientForm modal its next. It changes only the width; the dialog scrolls
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
