# Modal

`src/components/Modal/` — a dialog over the page (M5.6), the project's first.
It is the native `<dialog>` in its modal mode, with the `.modal` primitive's
surface and a heading that names it. M5.6's category page opens it from the
address; M8.16, M8.17 and M7.4 are its next owners. `RouteModal`, beside it,
is the wrapper every admin page opens it through (below).

| File                       | What it holds                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `modal.tsx`                | `Modal`, the default export                                                                     |
| `route-modal.tsx`          | `RouteModal`                                                                                    |
| `modal-button.tsx`         | `ModalButton`: a button that opens a modal, named as where the focus goes back when it closes   |
| `route-modal-provider.tsx` | `RouteModalProvider`, `useOpenModalClick`: a press opens the modal at once ("Opening at once")  |
| `loading.tsx`              | `ModalLoading`, a thin user of the shared `Skeleton` (`form` shape) a modal shows while loading |
| `index.tsx`                | The exports; two files, since `RouteModal` renders `Modal`                                      |
| `close-guard.ts`           | `CloseGuardContext`, the slot a form's guard goes in                                            |
| `discard.tsx`              | `useDiscardGuard` and `DiscardQuestion` (below)                                                 |
| `confirm-overlay.tsx`      | `ConfirmOverlay`, the card a form asks a question in, over itself                               |
| `confirm-layer.ts`         | `ConfirmLayerContext`, the layer and the hold the card is drawn with                            |
| `fields.ts`                | `FIRST_FIELD` and `firstShownField`, where the focus goes on open                               |
| `header-slot.ts`           | `HeaderSlotContext` and `useModalHeaderSlot`, beneath the title                                 |
| `types.ts`                 | `ModalHeading`, `ModalPhase`, and each prop type: `ModalProps`, `ModalButtonProps`, the rest    |

## Props

`ModalProps` (`types.ts`):

| Prop                                             | What it is                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                          | The heading: what the dialog is for, or the entry an edit dialog edits                                                                   |
| `eyebrow`                                        | An edit dialog's small line over the title, "Edit Ingredient"; absent on an add                                                          |
| `destination`                                    | Where an add lands, "Whitethorn Coven", in the eyebrow's place over the title and spoken after it: "Add Ingredient to Whitethorn Coven"  |
| `qualifier`                                      | After the title, quieter: an ingredient's formal name, a deity's tradition                                                               |
| `formalName`, `topEnd`, `formalActions`, `under` | The quick-look head's extras ("A title with its own end"); absent on every other dialog                                                  |
| `onClose`                                        | Asked for by the Close button, Escape and a click outside                                                                                |
| `size`                                           | `'wide'` for a long form or two columns (unused now), `'listed'` for the default column with a list beside it; absent, the default width |
| `readingBody`                                    | A body only to read, with nothing to fill in (M12.5's details): Tab stops on the body itself, so a keyboard can scroll it                |
| `loading`                                        | The contents are on the way: the body is marked `aria-busy` (M9.18)                                                                      |
| `children`                                       | The body: a form, a confirmation, whatever the owner puts here                                                                           |
| `foot`                                           | A bar under the body, outside what scrolls ("The foot"); absent on every dialog but the details                                          |
| `returnTo`                                       | Where the focus goes as it closes when what opened it is gone: a function of that gone element, returning the place                      |

## Contracts

- **Open is a mount, closed is an unmount.** The effect calls `showModal()`
  when the component mounts and `close()` when it unmounts. No prop says
  whether it is open. An owner shows the modal by rendering it.
- **The owner decides when it closes.** Close and Escape both call `onClose`,
  and Escape's `cancel` event is `preventDefault`ed, so the element never
  shuts itself. A URL-driven modal closes by navigating away from its address.
  If the element closed itself first, the address would still say the modal
  was open.
- **A dialog opened from inside another closes alone on Escape** (M8.17).
  A `Modal` rendered inside another's contents is a second dialog over the
  first. The browser sends Escape's `cancel` event to the topmost dialog
  only, but React passes it up its own tree to the outer dialog's handler
  too, which closed both. Each dialog now answers only a `cancel` aimed at
  itself. Nothing in the app opens one inside another now: the Annotate
  dialog's More, which did, asks for its confirmation over its form instead
  (the owner's call, 2026-10-20). The fix stays all the same, for the next
  dialog that opens one (the owner's call, 2026-10-20).
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
- **One modal in place of another keeps the page dimmed** (the owner,
  2026-10-29). A link in one modal's foot that opens another, as Quick
  Look's Edit Spell opens the builder, unmounts the first while it is still
  open, with no fade, and mounts the second. Faded in from nothing, the
  second's backdrop let the page show undimmed between the two, a flash. So
  a modal that goes while still open notes the time, a module-level
  `handedAt`, and one that opens within `HANDOVER_MS` (100ms) of it is
  marked `data-handover`: its backdrop starts fully dimmed, and only its box
  fades in. A modal that closed itself first (Close, Escape, a save) notes
  nothing, so the next one fades in whole. The flag is set in `close` and not
  copied from the phase in an effect: under reduced motion the owner unmounts
  the modal in the same render.
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
  from assistive technology, inside a button named "Close", which draws the shared
  focus ring when the keyboard reaches it (MB.121; it drew the browser's own before). It is a 2rem ×
  in a 2rem square (`$close-target`, a 2.5rem one from M5.5 until the owner's call of
  2026-10-20, still past WCAG 2.5.8's 24px), taken out of the header's flow and set
  `$close-inset` (`space(5)`, 24px, the dialog's padding) in from the dialog's top and
  right edges (the owner's call, 2026-10-20: it was 8px in until then, and 40px before
  that), so on every dialog its right edge is the right edge of the head's lines beneath
  it, the formal name's pencil among them, and it is level with the head's first line. The
  header, being taller than the × reaches, keeps it clear of the body's scrollbar beneath
  it. The head stops short of it (`$close-reserve`), so a long name wraps rather than runs
  under it, and the × is level with the head's first line, as in MB.115, rather than
  adrift beside a name wrapped over lines.
  A head with an eyebrow first and no top line (an edit dialog's "Edit Ingredient", an
  add's destination) has the eyebrow for its first line, so the × is raised to put its
  middle on the eyebrow text's middle (the owner's call, 2026-10-20): the inset less half
  of what the 32px target is taller than the eyebrow's line (`$eyebrow-line`, the
  overline size at the 1.65 a paragraph is given, 19.8px), 17.9px from the top, a middle at
  33.9px in place of 40px, written with `:has()` so a browser without it keeps the inset.
  A head with a top line keeps the inset, level with that line, and a dialog with no
  eyebrow (Add Category) keeps it too, the title being its first line, 40px to the × and
  about 55px to the title's middle.
- **A click outside asks the owner to close it** (M5.5, the owner's call,
  reversing M5.6's "no close on a backdrop click"), through `onClose` as
  Close and Escape do. The backdrop is the dialog's own box to an event, so
  outside is told by the point against the dialog's rectangle, and only a
  press that began outside counts: a text selection dragged out of a field
  and let go over the backdrop keeps the form. A stray click outside a
  half-filled form, the cost M5.6 weighed, now asks before throwing it away
  (["Unsaved changes"](#unsaved-changes)).
- **Modal gives the focus back itself**, however it closes: Close, Escape,
  a click outside, Cancel, a save, or its owner unmounting it (M8.17;
  ["Giving the focus back"](#giving-the-focus-back)).

## Giving the focus back

When a modal closes, the focus goes back to what opened it, so a keyboard
user carries on from where they were rather than from the top of the page.
The browser does this by itself only when a `<dialog>` is closed in place,
and a Modal's owner closes it by unmounting it, so Modal does it instead
(M8.17; the owner's call of 2026-10-19, option B,
[`m8.17-plan.md`](../design-decisions/m8.17-plan.md#giving-the-focus-back-owner-2026-10-19)).

1. **Before it opens**, Modal notes the focused element, the opener.
2. **As it unmounts**, if the focus is on nothing (the page's body), it
   focuses the opener again, if the opener is still on the page and not
   hidden. An item of a menu that has since closed is still on the page but
   hidden, so it counts as gone.
3. **If the opener is gone**, it asks its owner's `returnTo` for a place.
   An owner whose opener sits in a menu that closed, or is drawn afresh,
   names its trigger there: `ModalButton` its button, Add Ingredient the
   page's main area, `CupboardActions` its menu's button.
   `RouteModal` (a dialog opened by its address, such as `?edit`) looks for
   a link to that address and focuses it. If the link is an item of a closed
   `MenuButton`, it focuses that menu's button instead, where the press
   began. For example, Make It Ours chosen from More, then Cancel, leaves the
   focus on More. Edit and Annotate are icon links now, not menu items, so
   they are the link the dialog looks for and take the focus back themselves
   (M8.17, the owner's calls, 2026-10-20).
4. **If the owner names nowhere**, it focuses the page's `<h1>`, given
   `tabindex="-1"` by script so it can take the focus without becoming a
   Tab stop (`pageHeading()`, in `page-heading.ts`).

Step 4 is for a row whose own control removes the row (M8.17, after
M12.31's follow-up 5). The confirmation's Remove succeeds, the list is read
again, and the row goes, taking the button that opened the confirmation with
it. Without step 4 the focus would fall to the page's body, and a screen
reader would start again from the top. The rows that do this:

| Row                                          | Removed by                                                |
| -------------------------------------------- | --------------------------------------------------------- |
| A member on the members page                 | Remove (`MemberList`)                                     |
| A pending or declined invitation in a coven  | Revoke, or Remove once declined (`PendingInvitations`)    |
| An invitation on the account page            | Decline (`ReceivedInvitations`)                           |
| An invitation on the admin Invitations page  | Revoke (`AdminInvitations`)                               |
| A compendium entry's page, held by the coven | Remove, the bin on the page or the Annotate dialog's More |
| A retired entry's page                       | Remove, leading to the Ingredients list                   |

The first four ask through `ConfirmedAction`, whose confirmation stays open
and busy until the page is read again, so it closes in the same step as the
row goes. Its `returnTo` names the row's button, which is gone by then, so
step 4 answers. `CupboardActions` keeps its Remove confirmation busy the
same way, and its `returnTo` names nowhere once the coven no longer holds
the entry: the menu is gone and the plus stands in its place, which is
not where the person was. A retired entry's Remove leads to the coven's
Ingredients list instead (the owner's call, 2026-10-20): its confirmation
stays busy until the list arrives and goes with the entry page in the same
step, so the opener and `returnTo` are both gone and step 4 finds the list's
heading. A refusal closes the confirmation with the row
still there, so the focus goes back to the row's button as usual.

A confirmation asked over a modal's form (`ConfirmOverlay`, as in the M9.19
user modal) never reaches step 4: the modal stays open, and the overlay
gives the focus back inside it.

A modal that left the focus somewhere else, on a page it navigated to, say,
is left alone: the return never steals the focus. An owner never calls
`.focus()` to bring the focus back itself.
The lint rule `sorrel/modal-focus-return-through-modal` (`lint/source-sweeps.js`) fails a file that draws a dialog and
does, bar three named exceptions: the Filters panel (`FacetPanel`), a
dialog of its own; the confirmation asked over a modal's form
(`ConfirmOverlay`), which gives the focus back inside the modal that stays
open; and the confirm a `ConfirmedAction` confirmation focuses as it opens,
the focus going in rather than back.

`RouteModal` adds what a modal opened by the page's address needs, since
its close is a navigation that may draw the page afresh. When the opener is
gone it tries, in order:

1. **A link to the address the modal opened**, outside any dialog: the same
   Edit link, drawn again. The address comes from the gone link, or from
   the provider, which notes it on a press (so it is known in WebKit too,
   where a click focuses no link).
2. **Its owner's `returnTo`**, if one is given.
3. **Modal's own last step, the page's `<h1>`.** This is where a modal
   reached by a pasted address or a reload lands, since nothing on the page
   opened it.

Back closes a route modal too, and the focus goes to the link the same way.
`tests/e2e/route-modal-focus.spec.ts` walks both of those closes in a
browser.

## Unsaved changes

Every admin form asks before its changes are thrown away (MB.115, the
owner's call): Cancel, the Close button, Escape and a click outside alike.
One guard does it for all of them, in `discard.tsx`, rather than a copy in
each form. Since M13.14 the same guard also covers leaving the page: closing
the tab, reloading, and on a page form a link (see the last point below).

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
  a modal there is no slot: the guard covers the form's Cancel, and leaving
  the page as below.
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
- **On a page the question is a dialog of its own** (M13.14, the owner's
  call). A form outside a modal has no modal to ask over, and a card in the
  page's own form read as part of it. So `DiscardQuestion`, finding no
  `CloseGuardContext` slot, renders a `Modal` titled "Discard Changes?",
  portalled to the document body so it is not inside the form, with the same
  sentence and the same two answers. The form draws it the same way, so a
  page form needs nothing of its own. The focus goes to Keep Editing as it
  opens; Escape, Close and a click outside are Keep Editing; the modal gives
  the focus back to what had it, usually the link that was followed. Discard
  Changes closes it and lets the navigation go. Nothing flashes, since the
  page behind is inert while it is open.
- **Focus** (in a modal). The question takes the focus on Keep Editing, the safe answer,
  as the forms' Delete questions do. Keep Editing puts it away with nothing
  lost and the focus back where it was: Cancel, which stays beneath the
  question now, the field Escape was pressed in, or the Close button. If
  that has gone, the focus goes to the form's first field. The focus was
  always there, but after a pointer press (Close, Cancel, the backdrop) the
  browser drew no ring for it, since it draws a scripted focus's ring only when
  the focus it replaced had one, so the card's quiet answer shows its keyboard
  look on any `:focus` (M8.16, measured in Chromium).
- **Tried again while asking, it flashes** (in a modal; MB.115, the owner's call), so
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
- **The spell builder saves instead of asking** (M10.12, the owner's call on
  2026-10-27). Its dialog's Close, Escape and a click outside save anything
  unsaved, then close, with no Discard Changes question: a spell's draft is
  kept, never thrown away. `useSaveOnClose`
  (`SpellBuilder/save-on-close.ts`) fills the same `CloseGuardContext` slot,
  holding the close until the save lands; a refused save keeps the dialog
  open with the refusal shown. Closing the tab or reloading still raises the
  browser's question, through `useLeaveGuard`
  ([`spell-builder.md`](spell-builder.md), "Closing";
  [`design-decisions/m10.12-spell-builder-modal.md`](../design-decisions/m10.12-spell-builder-modal.md)).
- **Undo can release the guard.** A form with undo and redo ([`field.md`](field.md#undo-and-redo)) that is undone back to its starting values is no longer dirty, so Cancel and the other ways out close at once again. The undo is off while the question is asked.
- **Leaving the page asks too** (M13.14, story 32). `useDiscardGuard` calls
  `useLeaveGuard(dirty, request)` from `src/lib/navigation/leave-guard.tsx`:
  - **Closing the tab or reloading** with changes raises the browser's own
    question. While the form has changes a `beforeunload` listener (the
    event a browser fires as a tab is about to close or reload) cancels the
    unload; the wording is the browser's, since a page's own text is ignored.
    The listener is removed as soon as the form has no changes, or goes,
    because a page that always listens can lose the browser's back-forward
    cache. This holds in a modal and on a page alike.
  - **A link or any other in-app navigation** from a page form asks this
    same question. `NavigationProvider` owns a slot, `LeaveGuardContext`,
    which the hook fills while the form is mounted, and `navigate()` — the
    one way the site navigates, `PendingLink` included — consults it before
    it starts: with no changes it goes at once; with changes it is held, and
    Discard Changes lets it go. Where several guarded forms are mounted, the
    first with changes asks.
  - **In a modal, navigation is not held** (`holdNavigation: false`). The page
    behind a modal is inert, so no link there can be pressed; the
    navigations that start from a modal are the form's own — the page it
    goes to after a save, and `RouteModal`'s close after Discard Changes —
    and the form still reads as changed at that moment, so holding them would
    ask after a save, or ask again after Discard.
  - **A page form busy saving does not ask.** `CreateWorkspaceForm` passes
    `!empty && !busy`, so its own navigation to the new coven goes unheld.
  - **Back, Forward and an address-bar edit are not covered.** Next 16 gives
    no way to cancel a history move, and patching `history.pushState` is
    fragile; autosave (M13.16, M13.17) protects the spell builder there.
  - **`onHide`**, an option of `useLeaveGuard`, is called when the tab
    becomes hidden (`visibilitychange` to `hidden`), the one moment phones
    report reliably, where `beforeunload` often never fires. Nothing passes it
    yet; M13.16's autosave will, to save at once.
  - **Every form is held to it** by the lint rule `sorrel/long-form-guards-leaving` (`lint/source-sweeps.js`): a
    component that draws a `<form>`, renders `FormActions` or calls
    react-hook-form's `useForm` must call `useDiscardGuard` or
    `useLeaveGuard`, or be named in that rule's list with why. `NameForm`
    and `EmailForm`, one short field each, are on it.

## Asking over the form

A form asks before it acts, "Delete this?" or "Discard them?", on a card
drawn over the form rather than where its buttons were (MB.115, the owner's
call): one way of asking across the admin forms. `ConfirmOverlay`, in
`confirm-overlay.tsx`, is that card; the unsaved-changes confirmation, every
form's Delete confirmation, and the Annotate dialog's Make It Ours and Remove (M8.17, the
owner's call of 2026-10-20) are drawn through it, never a second dialog.

| Prop         | What it is                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| `question`   | The question, drawn as the card's first paragraph; it names the card         |
| `labelledBy` | The id that names the card instead, when a field's label asks the question   |
| `safe`       | A ref to the safe answer, Keep It or Keep Editing; never the destructive one |
| `flashes`    | The discard guard's count of ways out tried again, each a flash of the card  |
| `children`   | What follows the question: a field, a live region, the `.modal__actions` row |

- **A warning among the details.** A `warn` [`Notice`](notice.md) given the class `confirm-overlay__warning` stands well apart from its neighbours: `space(5)`, 1.5rem, above, where the paragraph before it leaves `space(2)`, and 1.75rem below, where the answers stand `space(4)` off. 1.75rem sits off the spacing scale, the owner's value rather than a new step. Make It Ours's "Changes you have not saved are lost." takes it (M8.17, the owner's calls of 2026-10-20); any other Notice in a card keeps its zero margin.
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
  page's ground at 75% as the backdrop is, dims the body. The title and the Close
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

| Prop           | What it is                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `question`     | The question, which names the card                                                                                                                        |
| `details`      | What stands beneath the question, apart from its name: what the answer changes, and anything to weigh first (M12.1). Absent when the question says it all |
| `asked`        | Its own question is being asked; true by default, for a form that draws it only then                                                                      |
| `guard`        | The form's `useDiscardGuard`, whose question shows in its place while it asks                                                                             |
| `confirmLabel` | The acting answer: "Delete" by default                                                                                                                    |
| `busyLabel`    | What it says while busy: "Deleting" by default                                                                                                            |
| `tone`         | `'destructive'` by default, `'solid'` for a save                                                                                                          |
| `keepLabel`    | The safe answer: "Keep It" by default, "Back" for a step back                                                                                             |
| `busy`         | The action is in flight: the acting answer busy and shut                                                                                                  |
| `onConfirm`    | The action, a promise                                                                                                                                     |
| `also`         | A second acting answer between the two, as Discard & Promote (M12.1): its label, busy label, busy state and action                                        |
| `onKeep`       | The safe answer's                                                                                                                                         |
| `onRefused`    | Told a refusal's sentence when `onConfirm` rejects, for the form's alert                                                                                  |

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

| Dialog                                     | Eyebrow                               | Qualifier   |
| ------------------------------------------ | ------------------------------------- | ----------- |
| `/admin/compendium?edit=`, an entry's page | Edit Ingredient                       | Formal name |
| `/admin/categories`, `forms`               | Edit Category, Edit Form              | —           |
| `/admin/deities`                           | Edit Deity                            | Tradition   |
| `/admin/celestial-bodies`, `zodiac-signs`  | Edit Celestial Body, Edit Zodiac Sign | —           |
| `/admin/category-groups`, `form-groups`    | Edit Category Group, Edit Form Group  | —           |
| `/admin/deity-traditions`                  | Edit Tradition                        | —           |

## A title with its own end

Four optional `ModalHeading` fields shape a head the quick look (M12.5) uses, and only
the details window passes them; every other dialog is drawn as before (the owner's calls,
2026-10-20).

- **`formalName`** is the entry's formal name over the title, in the eyebrow's place and
  never with one: the entry page's own `FormalName` (`IngredientEntry/formal-name.tsx`),
  with its ⓘ tip and its states (None, Not yet looked up, unconfirmed), built by the caller
  (`detailsHeading`). Its term ("Botanical Name") is read, not seen, as on the page. The
  dialog is named by the title alone, "Testwort", with the formal name read first in the
  body; it replaces `qualifierBelow` and the "Ingredient" kicker (the owner's call,
  2026-10-20). Its tip opens to the right of the ⓘ from tablet width up and below it on a
  phone, as on the page, and a test in `tests/e2e/tip-placement.spec.ts` holds it inside
  the viewport within the scrolling dialog.
- **`topEnd`** is the head's top line, over the formal name and the title, with Close
  on it (the owner's call, 2026-10-20): the details window puts the entry page's top-bar
  marks there, New or Updated then the safety badge, at the start of the line (the owner's
  call, 2026-10-20), level with the × at its far end. Its presence, even empty, gives the
  head that line (`.modal-dialog__top`, a flex row as tall as the ×, which stands over
  its end), so the × has a band of its own and what stands at the end of the lines under
  it clears it. The line stands 16px above the formal name's line (the owner's call, 2026-10-20): the head's
  own 8px gap and a `space(2)` margin more, from 8px. The margin is written on
  `.modal-dialog__heading > .modal-dialog__top`, since the layout's `.header > *` zeroes a
  child's margin at the weight of one class. A 12px gap (`space(1)` of margin) was the other
  option shown. The × comes after the marks in the
  markup too, as on screen. Without `topEnd` the × stands in the corner beside the head's
  first line, as before, after the head in the markup.
- **`aboveName`** is a node drawn between the eyebrow and the names: Quick Look puts the
  entry’s `LastEdit` line there, the place the entry page draws it ([`last-edit.md`](last-edit.md)).
- **`formalActions`** is a node for the end of the formal name's line: the details
  window's Edit pencil (with the plus beside it where a coven can add the entry), as the
  entry page puts its own (the owner's call, 2026-10-20; it replaced `titleActions`, which
  ended the title's first line and dropped under it as the line ran out). With it the
  heading's formal name, title and actions are one grid (`.modal-dialog__naming`): the
  formal name and the actions share the first row, the actions at its end, and the title
  takes the whole width of the second, so a long name wraps under the pencil, not short
  of it. The actions follow the title in the markup, as the page's do, and are placed by
  the grid. Each is as tall as the pencil, taller than the formal name's line, so their
  margin takes half the difference off each side and their middle stands on the
  line's. With no formal name the title takes the first row and the actions stand beside it.
  An action wrapped in a node of its own, as a coven's own entry's pair of icons is, has that wrapper's
  margin cleared, since the grid places it. A `<dialog>` among them keeps its margin
  (`> :not(dialog)`): a `ModalButton` draws its dialog beside its button, and the
  browser's `margin: auto` is what centres a dialog in the top layer, so zeroing it
  opened the Edit Stock dialog at the window's top left over Quick Look (M9.9). Empty, it takes no room.
- **`under`** is a wrapping row (`.modal-dialog__under`, `space(3)` apart) under the
  qualifier, for the badges. Empty, it takes no room.

Their nodes are the components the card and the entry page draw, not copies.

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
asked over the form, the row is held with it
(["Asking over the form"](#asking-over-the-form)), and its buttons take the
`.btn` disabled look (the `btn-disabled` mixin) rather than a fade or the
scrim, the owner's call at M8.16; the ingredient form's Close All is
`disabled` then too, as a form's Undo and Redo already are.

A sentence about the whole dialog goes on a line of its own between the
title and the row (M8.17, the owner's call of 2026-10-19): the compendium
edit's notice, "Changes are made to the Compendium, for everyone." The modal
hands that line down too (`HeaderNoteContext`), and the contents portal into
it through `useModalHeaderNote()`. It is a line apart rather than the row's
first item because the row is a line of controls that never wraps. It stands
`space(2)` below the title, the gap the row has there without it. With a
sentence and a row both present, the row stands `space(4)` below the sentence
(it was `space(2)`) and the body `space(3)` below the row (it was the
header's `space(4)`), so the row reads with the form it works rather than
with the sentence (the owner's call of 2026-10-20). Empty, it takes no line, so a dialog with no
sentence is unchanged. It is not held while a confirmation is asked, as it holds
no control.

## ModalButton

A button that opens a modal, and the focus back on the button however the
modal closes: Close, Escape, a click outside, or the contents' own close
(MB.119). It holds the open state and renders `Modal` while open, so its
owner writes neither. It was lifted from `InviteDialog`, which carried the
first copy, and is for every modal a page's button opens: an Invite, a Leave
Coven. `ModalButtonProps` (`types.ts`):

| Prop        | What it is                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `label`     | The button's text and accessible name, in title case; an icon where `ariaLabel` names it       |
| `className` | The button's classes, `btn btn--solid`                                                         |
| `title`     | The dialog's heading and accessible name                                                       |
| `eyebrow`   | As `Modal`'s: an edit dialog's small line over the title (M9.9)                                |
| `qualifier` | As `Modal`'s: after the title, in the dialog's name (M9.9)                                     |
| `ariaLabel` | The button's name where its text repeats down a list: "Edit Stock, Rosemary"                   |
| `tip`       | A tip over an icon button, "Edit Stock" over the pencil; it wraps the button, never the dialog |
| `size`      | As `Modal`'s                                                                                   |
| `children`  | A function of the modal's close, so a form can close it once it has sent                       |

It gives the focus back through Modal's own return
([above](#giving-the-focus-back)), naming its button as `returnTo` for
WebKit, where a click focuses no button.

A button repeated down a list, the Edit Stock on each coven card (M9.9), is an
icon (the pencil) whose `ariaLabel` is its whole name. Its `tip` wraps the
button alone: the dialog is a DOM child of whatever wraps it, so a tip around
both would open on the dialog's focus and hover and take its Escape. Its dialog's head is the edit head: `eyebrow` "Edit Stock", `title`
the ingredient, so the dialog is named as the button is.

### Add Ingredient

The shell’s Add Ingredient control (`AppShell/add-ingredient-button.tsx`,
M8.16) opens a `Modal` holding an `IngredientForm` for one coven. A
_destination_ is the compendium (for a viewer who can curate) or a coven the
viewer may write to; a coven they may only read is never one. With one
destination the control is a plain button. With two or more it is a split
button: the main part opens the default destination, and a chevron (`Choose
Where to Add`, `aria-haspopup="menu"`) opens a menu listing every
destination by name, the compendium first (`add-ingredient-menu.tsx`, a
`MenuButton` with the chevron as its icon). The default is, on `/admin/*`, the compendium for a curator;
otherwise the coven the address names, else the first coven they may write to.
Choosing the compendium is a `navigate` (`usePendingNavigation`) to
`/admin/compendium?new=ingredient-compendium` (the admin layout’s route-modal provider sits
below the shell, so the button cannot open that dialog itself, and the page draws it for a
direct request). A coven’s dialog is opened by the page’s address too (the owner’s call,
2026-10-18), with one form on every page in the shell, admin pages included (the owner’s
call, 2026-10-28):

| Value of `?new`           | Opens                                                                      |
| ------------------------- | -------------------------------------------------------------------------- |
| `ingredient-coven-<slug>` | Add Ingredient for the coven with that slug, on any page in the shell      |
| `ingredient`              | Add Ingredient for the default coven                                       |
| none (a bare `?new`)      | Off the admin pages, the same as `ingredient`; on them, the page’s own add |
| `ingredient-compendium`   | The compendium’s New Entry, on `/admin/compendium`                         |
| `spell-<slug>`            | That coven’s New Spell ([`spell-builder.md`](spell-builder.md))            |
| `spell`                   | New Spell for the grimoire the page is on                                  |

A reload keeps the dialog, Back leaves it and the address can be shared. The control always
writes `?new=ingredient-coven-<slug>`, so picking a coven from the menu never changes the
page, on an admin page as on any other. A value naming a coven is a fixed prefix
(`ingredient-coven-` or `spell-`) and then the whole slug, so a slug’s own hyphens read
one way: `ingredient-compendium` does not start with `ingredient-coven-`, and a coven
slugged `ingredient-compendium` would be `ingredient-coven-ingredient-compendium`. Only
`spell`, `ingredient` and `new` are reserved coven slugs (`isReservedCovenSlug`,
`src/lib/coven-path.ts`), since a bare word is the one place a slug could be read as
something else. The shell opens nothing for a spell’s value; `?new=spell-<slug>` on a page
other than that coven’s grimoire is sent there with a replace (`NewSpellElsewhere`,
`AppShell/new-spell-elsewhere.tsx`), since New Spell is a dialog over the grimoire. The
press writes the address with the browser’s own `pushState`, which Next’s router follows,
rather than a navigation, since nothing on the server is needed to draw the form; closing
replaces the address without `?new`, as `RouteModal` does, so Back does not open it
again; a save’s move to the new entry’s page closes it by leaving the address. While any
`?new` is present an admin list page holds its `?edit` back, so the two dialogs never
stack. The admin pages other than the compendium still open their own add on a bare `?new`
alone. A slug the viewer cannot write to opens nothing. The address is built by `AppShell/add-href.ts` (`openHref`,
`closedHref`), which a coven’s empty Ingredients list shares for its own Add
Ingredient button (M9.11), so that button opens this same dialog rather than a
second one.

The modal’s head is the coven’s name in the eyebrow’s place over the title
“Add Ingredient”, so the person always sees where the ingredient goes, and a
screen reader hears one phrase as the dialog’s name, “Add Ingredient to
Whitethorn Coven”: the `destination` prop is spoken after the title, joined by
a hidden “to”, where an edit’s eyebrow is spoken before it. The compendium’s
own add dialog is headed the same way, “Compendium” over “Add Ingredient”. The
menu names each destination the same way, “to Compendium”, “to Whitethorn
Coven”. The
destination is fixed once the dialog opens: there is no Coven select. With
nowhere to write the control is not drawn. After Save Ingredient the modal
closes and the control leaves a status beside it, since the form’s own Saved
notice goes with the form.

A coven's add can end another way (M12.20): when the compendium already bears
the typed name, the form asks, and a match's + (M12.48; M12.20's Use It)
closes the modal too and routes to the entry's coven page, with no Saved
status. The question is the form's
([`ingredient-form.md`](ingredient-form.md), "The duplicate warning").

## RouteModal

A modal opened by its page's address, `?new` or `?edit=<slug>`: the shape
every admin page's add and edit modal takes, and the spell builder's, under
`?new=spell-<slug>` or `?edit=<id>` over the grimoire (M10.12). A page renders it always, at one
fixed place (M9.18). It shows its `content` when the address opens a modal, a
skeleton under the pressed row's head while a press is on its way
("Opening at once"), and nothing otherwise. Eight wrappers under
`src/app/(shell)/admin/` each wrote the same lines until MB.115, and the celestial bodies and
zodiac signs' one handed the navigation straight to its form, so a save there
skipped the fade.

`RouteModalProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `closeHref`   | The page it opened over, its modal parameter dropped                                                                                                                                                           |
| `size`        | As `Modal`'s                                                                                                                                                                                                   |
| `readingBody` | As `Modal`'s                                                                                                                                                                                                   |
| `place`       | Which of the page's modal places this is, where it has two ([Two places on one page](#opening-at-once)); absent on a page with one                                                                             |
| `content`     | Absent unless the address opens a modal: `{ heading, body }`, the head (`ModalHeading`: title, eyebrow, qualifier) and `body`, a function of `done`, the modal's own close: `(done) => <Form onDone={done} />` |
| `returnTo`    | Where the focus goes when neither its opener nor a link to its address is left: its owner's trigger; absent, the page's heading ([above](#giving-the-focus-back))                                              |

- **Closing is a navigation back.** Close, Escape, a click outside and
  `done` all fade the modal out, then `navigate(closeHref, { replace: true })`,
  so Back does not open it again, and `refresh()`, both from
  `usePendingNavigation`, so the list beneath re-reads after a save or a
  delete and the page bar shows if that is slow.
- **`done` fades first.** It is `Modal`'s own close, so a form that closes
  the modal itself fades out as Close does, and the page goes back once the
  fade ends.
- **Closing while it loads cancels the press.** The skeleton's Close
  calls the provider's `cancel()`, then goes back as above. The navigation
  back supersedes the one on its way, which Next discards.
- **A caller needing more of the router keeps its own.** The compendium's
  form moves from `?new` to `?edit=` after a save without closing, through
  its own `useRouter`. The spell builder's dialog moves from `?new=spell-<slug>` to
  `?edit=<id>` on a draft's first save the same way, through
  `usePendingNavigation`'s `navigate` with `replace`.

## Opening at once

Pressing an Edit pencil or an Add button used to follow a plain link to
`?edit=<slug>` or `?new`, and nothing showed until the server had drawn the
whole page again with the modal in it. Since M9.18 the press opens the dialog
at once, with its head over a skeleton, the way a filter shows it is loading.
The form arrives in the same dialog.

- **The provider.** `RouteModalProvider` (`route-modal-provider.tsx`) is
  mounted in `src/app/(shell)/admin/layout.tsx`, and by `IngredientEntry` when it
  is given `edit` (M8.19; the two entry routes have no layout one), and by the two pages whose lists open a details modal outside `/admin`, `/compendium` and a coven's Ingredients (M8.17, M12.5). It keeps the heading of the
  modal just pressed and navigates through `usePendingNavigation`
  (`src/lib/navigation/`), which runs `router.push(href)` inside a React
  transition (a call that marks a change as in progress until it finishes);
  the page bar shows as well ([`../loading.md`](../loading.md)). It
  offers `loading` (that heading while the push is pending, otherwise
  nothing) with `loadingPlace`, the place it shows in, `open(href, heading, place?)` and `cancel()`. The workshop, whose
  router goes nowhere, supplies its own value through the exported
  `RouteModalContext`; a provider already above is kept, not shadowed.
- **`useOpenModalClick(href, heading, place?)`** returns the `onClick` for a link.
  For a plain press of the main button it stops the browser following the
  link and calls `open`. A press with Ctrl, Cmd, Shift or Alt, or any other
  button, is the browser's (a new tab or window), and so is a press before
  the page's script has loaded: the link still works as a link. Outside a
  provider the hook returns nothing, and the link stays plain. `EditLink`
  ([`icon-tip.md`](icon-tip.md)), `AddAction` (`src/app/(shell)/admin/add-action.tsx`)
  and New Invitation all use it, and so does each name on `/admin/users`, which
  opens the user's modal, `?user=<id>` (M9.19, [`user-list.md`](user-list.md)).
  So does Edit on an ingredient's own page, which opens the edit modal over
  that page ([`ingredient-entry.md`](ingredient-entry.md), "Edit").
- **The heading is known before the form.** The page builds each row's
  `editHeading` on the server, with the same builder the loaded modal uses,
  and hands it to the row beside `editHref`. So the head does not change when
  the form arrives.
- **One dialog from the press to the form.** The skeleton and the loaded
  modal are the same `<Modal>` at the same place in the page, so React keeps
  the one `<dialog>` and it fades in once, not twice. The form inside is
  keyed by the row's id, so opening another row starts a fresh form.
- **The skeleton** (`ModalLoading`, `loading.tsx`) is the shared
  [`Skeleton`](skeleton.md) in its `form` shape: a visually hidden
  `<output>Loading</output>` (a status a screen reader announces) and
  placeholder shapes hidden from it: four label-and-box pairs and a row of two
  buttons. While it shows, `Modal`'s `loading` prop marks the body
  `aria-busy`.
- **Focus.** When `loading` turns false, the focus moves to the form's first
  field, but only if it is still on the dialog itself. A person who has
  already moved it, to Close say, keeps it.
- **Two places on one page.** A list whose names open a details modal and
  whose Edit opens the edit modal over it (M12.5) renders two `RouteModal`s.
  Each takes a `place`, and a press shows only in the place it names
  (`useOpenModalClick(href, heading, place)`), so a press of a name does not
  draw a skeleton in the edit modal's place too. A page with one place leaves
  it unnamed.
- **A direct request** to `?edit=` or `?new` (a bookmark, a new tab) still
  renders the modal on the server, with no skeleton.
- **A form the browser can draw skips the skeleton.** New Spell needs nothing
  from the server to draw its empty builder, so its press writes `?new=spell-<slug>`
  with the browser's `pushState` (`AddAction`'s `drawnHere`), as the shell's
  Add Ingredient does, and `SpellDialog` reads the address itself
  (`useSearchParams`). The dialog opens at its full size in its first frame.
  Through the skeleton it opened at the skeleton's height and grew when the
  form replaced it, and since the dialog is centred, its top jumped up under
  the pointer (the owner's report in M10.12's review; 518px to 720px at 1280
  by 800). `tests/e2e/spell-dialog-size.spec.ts` holds it.
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

**The foot** (`foot`, the owner's call, 2026-10-20). A bar under the body that stays in view while the body scrolls, for the details modal's link to the entry's page (See in Compendium or See in Your Cupboard). It is a sibling of the body in `.modal-dialog__main`, which is a two-row grid, the body in the first row and the foot in the second, and not a `position: sticky` child of the body: a sticky child lies inside the scroller, so the scrollbar's track ran its whole height, down past the bar, and drew over it. In its own row the body is the only thing that scrolls and its scrollbar starts under the head and ends above the foot. With no `foot` there is no second row. The scrim of a question (`.modal-dialog__layer`) covers the body's row alone, so `hold()` marks the foot `inert` with the body and the header slot while a question is asked, and live again once answered (`tests/components/Modal/index.test.tsx`). `RouteModal`'s `content` takes it too (`RouteModalContent.foot`). The foot brings its own surface and hairline; the Modal draws neither.

**A body only to read takes a Tab stop** (`readingBody`, M12.5). A scrolling body with no field in it cannot be scrolled from the keyboard, and axe's `scrollable-region-focusable` rule fails it: the details modal holds only links in its header, so its long summary was out of reach. The body gets `tabIndex={0}` and an inset focus ring, as the header and the dialog's edge would clip an outer one. A form leaves it off, since its fields already reach every part of it.

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
in CSS so no listener can leave the page locked.

**Nothing behind it moves sideways as the scrollbar goes** (the owner's call,
2026-10-20). Hiding the page's scroll takes its scrollbar away, which on a
system whose scrollbars take room (Windows, most Linux desktops, a Mac set to
show them always) would widen the page by about 15px and move centred content
by half of that. So as the first modal opens, `holdPage` (`page-hold.ts`)
measures the scrollbar, `window.innerWidth - document.documentElement.clientWidth`,
and only where that is more than 0 sets the width on the root as
`--scrollbar-width`. The root's padding takes the scrollbar's place for as long
as a modal holds the page, and the fixed elements anchored to the right edge
(the theme toggle's corner, the impersonation banner, the page bar and the salt
corner of the backdrop) read the same property, so they stay put too. A modal
opened over another does not measure again, the scrollbar being gone by then,
and the room is given back only when the last one closes. A page with no
scrollbar, or one whose scrollbars float over it, sets nothing.

This JavaScript measurement replaces a CSS-only one, `scrollbar-gutter: stable`,
which reserves the scrollbar's room. Set only while a modal was open, a page
with no scrollbar gained the room as one opened and moved by half of it. Set on
every page, it left a blank strip beside the header on a page that fits the
window, so the header and its menu stopped short of the right edge (the
owner turned it down: the owner's call, 2026-10-20). The body's own scroll is
`overscroll-behavior: contain`, and it keeps it, so nothing in it is out of
reach.

**The skeleton** (M9.18) is the shared `Skeleton` of the `form` shape
([`skeleton.md`](skeleton.md)); `ModalLoading` only renders it.

**On a phone it stays inset**, the same gap on every side, rather than
becoming a full-height sheet: the owner's M5.5 call, kept at MB.115's review.

`size="wide"` adds `.modal-dialog--wide`, a 55rem column (928px with the padding) (`$dialog-column-wide`), for a form that sets two columns side by side. The spell builder took it from 2026-10-28 and no longer does (the owner's call, 2026-10-29: with In Coven Inventory gone, one column in the default-width dialog), so nothing uses it now. It was 48rem and unused before that, since MB.115, when the compendium form went back to the default column because the form caps itself at that width; M8.16's IngredientForm modal takes the default too. It changes only the width; the body scrolls
within the viewport's height either way.

`size="listed"` adds `.modal-dialog--listed`, for the default column with a list down its side, a
third of the body to the list and two to the column: half `$dialog-column` again plus a
`space(4)` gap, 49rem, so the column keeps the width it has in a dialog of its own. The Edit
Stock dialog takes it (M9.9, the owner's call of 2026-10-20; [`stock-dialog.md`](stock-dialog.md)).

## Stories

[`index.stories.tsx`](../../src/components/Modal/index.stories.tsx), under
`Surfaces / Modal`. One story, `States`, with a control that chooses the state. It sets `meta = { iframed: true }`, since the dialog
sits in the top layer ([`workshop.md`](../workshop.md)); each owner keeps an
Open button to bring it back after Close or Escape.

- Plain, the default column around a small form, and Wide, the wide
  size around a longer one.
- Editing, an edit dialog's head: the eyebrow, a long title and a binomial
  as the qualifier. With Every Head Part and With A Destination are other heads.
- Opened By Its Address, a `RouteModal` with `content`, as an address opens it.
  Loading shows the
  pressed row's head over the skeleton, through a `RouteModalContext` value
  whose navigation never arrives.
- Opened By A Button shows `ModalButton`: tab to the button, open it, close
  it any way, and the focus ring is back on the button. Opened By A Button And Pressed
  is the same, pressed open as it mounts, so the dialog itself can be looked at.
- Asking To Discard Changes, the discard
  question over a form with a change; Escape or Close there flashes it.
  Asking To Confirm shows `ConfirmQuestion`'s Delete and Keep It, Delete busy
  once pressed.
- Listed With A Foot, a list in the body with a foot.
- With Pickers, a picker and a multi-picker, where Escape closes an open list
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
story shows the question over a
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
