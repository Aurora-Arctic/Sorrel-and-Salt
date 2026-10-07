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
- **The focus trap, Escape and the inert page are the platform's.**
  `showModal()` puts the dialog in the top layer and makes the rest of the
  document inert. Nothing in the component traps focus by hand.
- **Named by its heading.** `aria-labelledby` points at the `<h2>`, so
  `getByRole('dialog', { name })` finds it. The Close button is `×`, hidden
  from assistive technology, inside a button named "Close". It is 1.5rem
  square, WCAG 2.2's 24px minimum target, as InfoTip's button is.
- **No close on a backdrop click.** A stray click outside a half-filled form
  would throw the form away. Close and Escape are both deliberate.
- **Focus goes back to the trigger only if the owner sends it there.** A
  URL-driven modal's trigger is a link that the navigation re-renders. M8.16,
  whose criteria ask for focus restored, adds that to the modal it builds.

## Styling

Only what the native element needs beyond `.modal`: no border, a width of
`min(32rem, 100vw − 2 × space(4))` so it fits a phone, scrolling within the
viewport's height, and a `::backdrop` of the page surface at 75%. Nothing goes
past the tokens before the admin area's design review (MB.115).

## Testing

`tests/components/Modal/index.test.tsx`. jsdom implements neither
`showModal()` nor `close()`, so the test stands both in on the prototype,
adding and removing `open` as a browser does. The e2e spec (`admin.spec.ts`)
opens the category modal in a real browser, closes it with Escape, and runs
axe against it while it is open.
