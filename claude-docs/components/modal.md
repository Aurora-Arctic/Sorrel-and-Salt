# Modal

`src/components/Modal/` is a dialog over the page: the native `<dialog>` in its modal mode, with the `.modal` primitive's surface and a heading that names it. `RouteModal` is the wrapper a modal opened by the page's address goes through. Props are typed in `types.ts` (`ModalProps`, `ModalHeading`, `ModalButtonProps`, `RouteModalProps`, `ConfirmOverlayProps`, `ConfirmQuestionProps`).

| File                       | Holds                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| `modal.tsx`                | `Modal`, the default export                                         |
| `route-modal.tsx`          | `RouteModal`                                                        |
| `route-modal-provider.tsx` | `RouteModalProvider`, `useOpenModalClick`: a press opens it at once |
| `modal-button.tsx`         | `ModalButton`: a button that opens a modal                          |
| `modal-link.tsx`           | `ModalLink`: a `next/link` with `scroll={false}`                    |
| `loading.tsx`              | `ModalLoading`, the `form`-shaped [`Skeleton`](skeleton.md)         |
| `close-guard.ts`           | `CloseGuardContext`, the slot a form's guard goes in                |
| `discard.tsx`              | `useDiscardGuard`, `DiscardQuestion`                                |
| `confirm-overlay.tsx`      | `ConfirmOverlay`, the card a form asks a question in                |
| `confirm-question.tsx`     | `ConfirmQuestion`, the written-once yes-or-no question              |
| `confirm-layer.ts`         | `ConfirmLayerContext`, the layer the card is drawn in               |
| `fields.ts`                | `firstShownField`, where the focus goes on open                     |
| `header-slot.ts`           | `HeaderSlotContext`, `HeaderNoteContext`, their hooks               |
| `page-hold.ts`             | `holdPage`, which keeps the page still as its scrollbar goes        |
| `page-heading.ts`          | `pageHeading()`, the page's `<h1>` made focusable by script         |

Stories are `src/components/Modal/index.stories.tsx`: one `States` story whose control picks Plain, Editing, Opened By Its Address, Opened By A Button, Asking To Discard Changes, Asking To Confirm, Listed With A Foot and With Pickers. Tests are `tests/components/Modal/`, `tests/support/discard-guard.tsx` (`expectGuardedWaysOut`, `expectAskingOver`, `expectAnswered`, which each admin form's test uses for its wiring) and `tests/e2e/admin.spec.ts`. happy-dom's `<dialog>` traps no focus and applies no `inert`, so tests spy on `showModal`/`close` and assert the `inert` attribute; Playwright runs the real thing.

## Contracts

- **Open is a mount, closed is an unmount.** The effect calls `showModal()` on mount and `close()` on unmount; no prop says it is open.
- **The owner decides when it closes.** Close, Escape and a click outside call `onClose`; Escape's `cancel` is `preventDefault`ed, so a URL-driven modal never shuts before the address changes. A click outside is a press that began and ended outside the dialog's rectangle, so a selection dragged out of a field keeps the form.
- **Each dialog answers only a `cancel` aimed at itself**, since React passes a nested dialog's `cancel` up to the outer one's handler.
- **Fade and focus on open** are under "Focus and the fade".
- **The platform traps focus.** `showModal()` makes the rest of the document inert; nothing traps focus by hand.
- **It is named** by its eyebrow then its `<h2>` through `aria-labelledby`, so `getByRole('dialog', { name })` finds it. The Close button is a hidden `×` in a button named "Close" with the shared focus ring.
- **The body scrolls, the dialog does not**, and the page behind does not scroll or move ("Styling").

## Focus and the fade

### The first field's focus

**The focus goes to the first field a person can use** (`firstShownField`, run right after `showModal()`): not `type="hidden"`, not disabled, not under a `hidden` section, not inside a `data-focus-skip` wrapper (the Reviewed switch at the foot of the ingredient form, which would take the open on an edit with every section closed). With no field the dialog takes it (`tabIndex={-1}`, no ring). `autoFocus` cannot do this: it runs before `showModal()` moves the focus, and development's remount blurs a focused field, which a form reads as touched. The focus waits for a microtask that cleanup cancels. `ModalHeading.focusTitle` focuses the title instead, here and when a route modal's contents arrive (the support request dialog, so the subject is read first).

### The fade

**It fades over 150ms.** In is CSS (`@starting-style`). Out is the component's: Close, Escape and a click outside set `.is-closing`, and the owner is asked once, when the transition ends or at `FADE_LIMIT_MS` (400) if the end is never reported. Under reduced motion, or with no `matchMedia`, the owner is asked at once. Contents that close it themselves (a save, a delete) use `children(close)` so that fades too.

### A modal replaced by another

**A modal replaced by another** (Quick Look's Edit Spell opens the builder) is unmounted while still open, with no fade. It notes the time in a module-level `handedAt`; one that opens within `HANDOVER_MS` (100) is marked `data-handover`, so its backdrop starts dimmed and only its box fades in. A modal that closed itself first notes nothing. The flag is set in `close`, not copied from a phase in an effect, because reduced motion unmounts in the same render. Strict Mode's rehearsal leaves the dialog in the page.

## Giving the focus back

A closing modal returns the focus to what opened it. The browser does this only for a `<dialog>` closed in place, and an owner closes a Modal by unmounting it, so Modal does it.

1. Before it opens, Modal notes the focused element.
2. As it unmounts, if the focus is on the body, it focuses that opener if it is still on the page and not hidden (an item of a closed menu counts as gone).
3. Otherwise it asks the owner's `returnTo`. `ModalButton` names its button, Add Ingredient the page's main area, `CupboardActions` its menu's button. `RouteModal` looks for a link to its address (taken from the gone link, or from the provider, which notes it on a press so WebKit, where a click focuses no link, works); if that link sits in a closed `MenuButton` it focuses the menu's button.
4. Otherwise it focuses the page's `<h1>` (`pageHeading()`, `tabindex="-1"`). This covers a row removed by its own confirmation (members, pending and received invitations, admin invitations, a compendium entry's Remove, a retired entry's Remove, which lands on the list's heading) and a modal reached by a pasted address or a reload.

A confirmation asked over a modal's form never reaches step 4: the overlay returns the focus inside the open modal. A modal that left the focus on a page it navigated to is left alone, and a steward never calls `.focus()` itself. The lint rule `sorrel/modal-focus-return-through-modal` (`lint/source-sweeps.js`) fails a file that draws a dialog and does otherwise, bar three exceptions: `FacetPanel`, the confirm overlay, and the confirm a `ConfirmedAction` focuses as it opens. Back closes a route modal too, with the same return. `tests/e2e/route-modal-focus.spec.ts` walks both closes.

## Unsaved changes

Every admin form asks before its changes are thrown away (Cancel, Close, Escape, a click outside), through one guard in `discard.tsx`.

- **`useDiscardGuard(dirty)`** takes `formState.isDirty` (the invite form, with no react-hook-form, passes "anything typed"). Cancel calls `guard.request(close)`: nothing changed closes at once, otherwise it asks.
- **The modal asks through a slot.** `Modal` provides `CloseGuardContext`, which the hook fills while the form is mounted (the form sits inside the render prop, out of its owner's reach). Close, Escape and a click outside pass the close they would make; it goes ahead only when every guard in the slot's set allows it (the support request has two forms). Nothing is consulted once the modal is closing.
- **Saving and deleting never ask**: they close through `children(close)`, which is unguarded.
- **`<DiscardQuestion guard={guard} />`** renders while `guard.asking`, after the form's buttons, as a `ConfirmOverlay`: "You have unsaved changes. Discard them?", **Discard Changes** (`.btn--destructive`) and **Keep Editing** (`.btn--quiet`). A form with a question of its own asks this one first.
- **On a page** (no slot) it renders a `Modal` titled "Discard Changes?", portalled to the body, focus on Keep Editing; Escape, Close and a click outside are Keep Editing.
- **Focus** goes to Keep Editing on asking, and back to Cancel, the field Escape was pressed in, Close, or the first field. The quiet answer shows its keyboard look on any `:focus`, since a scripted focus after a pointer press draws no ring.
- **Asked again, it flashes.** Each try counts in `guard.flashes`, carried as `data-flash`; a fresh `.confirm-overlay__flash` layer fades the secondary tint twice over 300ms each (`$motion-short * 4`); reduced motion shows a solid secondary outline twice instead. Each try refocuses Keep Editing and says "You have unsaved changes." in a visually hidden polite `<output>`, alternating a trailing no-break space so a repeat is read. Keep Editing resets the count.
- **The spell builder and the ingredient form save instead of asking.** `useSaveOnClose` (`SpellBuilder/save-on-close.ts`) fills the same slot, saves, then closes; a refused save keeps the dialog open with the refusal shown, and nothing changed closes at once. Such a dialog has no Cancel button. Not saved, and so not asked about: an open reference panel's draft, and a new entry never created (the form's local mirror keeps the text; [`ingredient-form.md`](ingredient-form.md), [`spell-builder.md`](spell-builder.md), "Closing").
- **Undo** back to the starting values releases the guard ([`field.md`](field.md#undo-and-redo)); it is off while the question shows.
- **Leaving the page asks too**, through `useLeaveGuard(dirty, request)` (`src/lib/navigation/leave-guard.tsx`):
  - `beforeunload` cancels a tab close or reload while there are changes (the wording is the browser's), and is removed otherwise so the back-forward cache survives.
  - `NavigationProvider` owns `LeaveGuardContext`; `navigate()`, the one way the site navigates (`PendingLink` too), consults it first. The first guard with changes asks.
  - In a modal `holdNavigation: false`: the page behind is inert, and a save's navigation happens while the form still reads as changed.
  - A page form busy saving passes `!empty && !busy` (`CreateWorkspaceForm`).
  - Back and Forward are held where the Navigation API exists (`holdTraversals`): a `traverse` event is cancelled when `event.cancelable` and the guards ask; on yes it calls `navigation.traverseTo` with an `info` marker so it is not asked twice. Other browsers keep the old behaviour; an address-bar edit is a document load, so only `beforeunload` asks.
  - `onHide` runs when the tab becomes hidden, the one moment phones report reliably; autosave passes it (`src/lib/autosave/use-autosave.ts`).
  - The lint rule `sorrel/long-form-guards-leaving` (`lint/source-sweeps.js`) fails a component that draws a `<form>`, renders `FormActions` or calls `useForm` without `useDiscardGuard` or `useLeaveGuard`, unless named in its list with why (`NameForm`, `EmailForm`).

## Asking over the form

A form asks "Delete this?" or "Discard them?" on a `ConfirmOverlay` card over itself, never a second dialog: the unsaved-changes question, every Delete, the Annotate dialog's Make It Ours and Remove.

- **Drawn** after the form's buttons, portalled into the modal's layer (`ConfirmLayerContext`), a cell of `.modal-dialog__main`'s grid that the body scrolls in. The scrim covers exactly the visible body under the header, and a short form's dialog grows to hold the question. Outside a modal the card stands in the flow with no scrim (`.confirm-overlay--in-place`).
- **The form is held**: the modal sets `inert` on the body, the header control row and the foot, in a layout effect so it is on before the card takes the focus and off before the focus returns. Holds are counted, so one question giving way to another releases once. The title and Close stay live, so Close, Escape and a click outside go through the form's guard. Escape on a Delete question with nothing changed closes the modal; with a change, the unsaved-changes question replaces it, and Keep Editing brings the Delete back.
- **A labelled `<fieldset>` (role `group`)**, named by its question, not an alertdialog: it keeps neither focus nor Escape, so it must not announce itself as one.
- **Focus** goes to the `safe` answer, never the destructive one, and back to the pressed button (or the first field) in one layout effect, run again in an animation frame because the opening event may still move the focus. A form keys a question by its step.
- **It waits for the layer**: the modal draws its layer before its contents can ask but not before their first render, and showing nothing beats a card in place that then moves.
- **A `warn` [`Notice`](notice.md)** with `confirm-overlay__warning` sits `space(5)` below the paragraph before and 1.75rem above the answers (off the scale, between `space(5)` and `space(6)`).
- **Motion**: scrim and card fade in over `$motion-short` and go at once. The answers row stacks under 28rem of form width (`$narrow-column + $modal-padding`, a container query on `modal-main`).
- **The scrim** scrolls only if the card is taller than the tallest dialog; the card is centred with auto margins so its top is never cut off, at the floating elevation.

### ConfirmQuestion

`ConfirmQuestion` (`confirm-question.tsx`) is a `ConfirmOverlay` with the acting `BusyButton` (destructive, "Deleting" until answered) and the safe quiet one that takes the focus. `GroupForm`, `GroupedValueForm` and `IngredientForm` use it.

- Given the form's guard, the unsaved-changes question shows ahead of its own, which shows only while `asked`. A form with steps (`GroupForm`'s delete) settles that itself and passes no guard.
- When `onConfirm` rejects it reads the server's first sentence (or one generic sentence) and hands it to `onRefused`, where the form closes the question and shows it in its alert: a refusal naming its remedy, not a bad value in a box (DESIGN.md §7). A form that places the refusal itself (`GroupForm`'s refused move) catches it in `onConfirm` and passes no `onRefused`.

## An edit dialog's head

An edit dialog says what is edited: an eyebrow naming the action and kind, then the entry as the heading. `ModalHeading` carries it; `RouteModal` and the admin wrappers pass it whole.

- **`eyebrow`** is the `.eyebrow` primitive, written in title case; an add dialog has none.
- **`title`** is the name **as saved**, from what the page read, never the Name field's live value, so the head holds still during a rename.
- **`qualifier`** follows the name in muted body ink where the list names it by a second thing: an ingredient's formal name, a deity's tradition ("Hecate (Greek)"). The caller sets binomial italics (`.binomial`); a mineral's formal name stays upright. Categories and forms have none.
- **`destination`** is where an add lands, in the eyebrow's place, spoken after the title through a hidden "to": "Add Ingredient to Whitethorn Coven".
- A screen reader hears eyebrow then title then qualifier, "Edit Ingredient, Mugwort, Artemisia vulgaris", with `.spoken-separator` commas (a comma drawn at no size, since `aria-labelledby` joins with a space and `.visually-hidden` text gets spaces either side in Chrome; `styling.md`).
- The eyebrow and title are a `.header` column that may shrink past its content, so a long name wraps and one with no break breaks anywhere.

| Dialog                                       | Eyebrow                               | Qualifier   |
| -------------------------------------------- | ------------------------------------- | ----------- |
| `/curator/compendium?edit=`, an entry's page | Edit Ingredient                       | Formal name |
| `/curator/categories`, `forms`               | Edit Category, Edit Form              | none        |
| `/curator/deities`                           | Edit Deity                            | Tradition   |
| `/curator/celestial-bodies`, `zodiac-signs`  | Edit Celestial Body, Edit Zodiac Sign | none        |
| `/curator/category-groups`, `form-groups`    | Edit Category Group, Edit Form Group  | none        |
| `/curator/deity-traditions`                  | Edit Tradition                        | none        |

## A title with its own end

Optional `ModalHeading` fields for the quick look's head; the nodes are the components the entry page draws.

- **`formalName`** stands over the title in the eyebrow's place, never with one: the page's `FormalName` (`IngredientEntry/formal-name.tsx`) with its ⓘ tip and states, built by `detailsHeading`. The dialog is named by the title alone, with the formal name read first in the body. The tip opens right of the ⓘ from tablet width and below it on a phone (`tests/e2e/tip-placement.spec.ts`).
- **`topEnd`** is the head's top line with Close on it: the entry page's top-bar marks (New or Updated, safety badge) level with the ×. Present, even empty, it gives the head that line; without it the × stands in the corner after the head in the markup ("The top line").
- **`aboveName`** sits between eyebrow and names (Quick Look's `LastEdit`, [`last-edit.md`](last-edit.md)).
- **`formalActions`** ends the formal name's line: the Edit pencil, and the plus where a coven can add the entry ("The naming grid").
- **`actionsUnderClose`**, with `formalActions` and no formal name, puts the controls beneath the × ("Controls beneath the ×").
- **`under`** is a wrapping row (`.modal-dialog__under`, `space(3)` apart) of badges under the qualifier; empty it takes no room.

## A control in the header

The header holds the title (eyebrow over it on an edit), the ×, and under them a full-width toolbar row. The row stretches its buttons to the tallest, with a little space above, takes no line when empty, and puts the first control at its start and a form's Undo and Redo pair at its end (`margin-inline-start: auto`). A control beside the title squeezed a phone's heading until a name broke mid-word.

- **The row** is handed down as an element, `HeaderSlotContext`; contents portal into it with `useModalHeaderSlot()` (the ingredient form's Open All / Close All, `FormHistoryButtons`). The context is exported so a panel can set it to `null` and keep its own undo buttons out. Outside a modal the hook answers null and the controls stay in the form's flow. Tab order is the ×, the controls, the form.
- **Held with the form** while a question shows: the row's buttons take the `btn-disabled` look, not a fade (doubled on an off button) or the scrim (it darkened the gaps into a strip under the undimmed title). The ingredient form's Close All is `disabled` then too.
- **A sentence about the whole dialog** (the compendium edit's "Changes are made to the Compendium, for everyone.") goes on its own line between title and row, through `HeaderNoteContext` and `useModalHeaderNote()`, since the row never wraps. It stands `space(2)` below the title; with a row too, the row is `space(4)` below the sentence and the body `space(3)` below the row. Empty it takes no line; it is not held, having no control. The spell builder puts its recovery banner and conflict notice there: the line is a `space(2)` grid and a notice in it drops its bottom margin.

## ModalButton

A button that opens a modal and returns the focus to itself however it closes. It holds the open state and renders `Modal` while open, so its owner writes neither; use it for every modal a page's button opens. It names its button as `returnTo` for WebKit; once a write has led the page away the ref is null and Modal focuses the heading.

- **A menu item is not one**: the More menu's Delete Spell opens its dialog by state, the menu having closed by then.
- **A delete bin that reports a refusal** (Delete Spell, Delete Working) is a `ModalButton` whose `ref` is the ClickFeedback anchor, whose `onOpen` clears the last refusal, and whose contents close the dialog before the refusal shows, so the callout stands beside the bin.
- **A button repeated down a list** (Edit Stock on each coven card) is an icon whose `ariaLabel` is its whole name; its `tip` wraps the button alone, since a tip around the dialog would open on its focus and hover and take its Escape. Its head is the edit head (`eyebrow` "Edit Stock", `title` the ingredient).

### Add Ingredient

The shell's control (`AppShell/add-ingredient-button.tsx`) opens a `Modal` holding an `IngredientForm` for one destination: the compendium (for an observer who can curate) or a coven the viewer may write to. With none the control is not drawn; with one it is a plain button; with several it is a split button, the main part opening the default and a chevron (`Choose Where to Add`, `aria-haspopup="menu"`, `add-ingredient-menu.tsx`) listing the compendium first ("to Compendium", "to Whitethorn Coven"). The default is, on `/admin/*`, the compendium for a curator, else the coven the address names, else the first writable coven. The destination is fixed once open.

The compendium choice `navigate`s to `/curator/compendium?new=ingredient-compendium`, since the admin layout's provider sits below the shell. A coven's dialog is opened by the address on any page in the shell, always `?new=ingredient-coven-<slug>`, so picking a coven never changes the page.

| `?new` value              | Opens                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| `ingredient-coven-<slug>` | Add Ingredient for that coven, on any shell page                  |
| `ingredient`              | Add Ingredient for the default coven                              |
| bare `?new`               | Off the admin pages, as `ingredient`; on them, the page's own add |
| `ingredient-compendium`   | The compendium's New Entry, on `/curator/compendium`              |
| `spell-<slug>`            | That coven's New Spell ([`spell-builder.md`](spell-builder.md))   |
| `spell`                   | New Spell for the grimoire the page is on                         |

- A reload keeps the dialog, Back leaves it, the address is shareable, and a slug the viewer cannot write to opens nothing.
- A coven value is a fixed prefix then the whole slug, so hyphens read one way. Only `spell`, `ingredient` and `new` are reserved coven slugs (`isReservedCovenSlug`, `src/lib/coven-path.ts`).
- `?new=spell-<slug>` off that coven's grimoire is sent there with a replace (`NewSpellElsewhere`, `AppShell/new-spell-elsewhere.tsx`).
- The press writes the address with `pushState` (Next's router follows; the server has nothing to add). Closing replaces the address without `?new`, so Back does not reopen it. While any `?new` is present an admin list page holds its `?edit` back, so dialogs never stack; the admin pages other than the compendium still open their own add on a bare `?new`.
- `AppShell/add-href.ts` (`openHref`, `closedHref`) builds the address; a coven's empty Ingredients list shares it for its own Add Ingredient button.
- After Save Ingredient the modal closes and the control leaves a status beside it. The form creates the ingredient at its first save, once named; the dialog stays open and `replaceState`s from `?new=ingredient-coven-<slug>` to `/coven/<slug>/ingredients?edit=<id>`, so a reload opens the edit modal. Closing after a create goes to `/coven/<slug>/ingredients`. The compendium does the same with `?edit=<slug>` and keeps the form's React key stable so it does not remount.
- A coven's add also ends when the compendium already bears the typed name: a match's + closes the modal and routes to the entry's coven page ([`ingredient-form.md`](ingredient-form.md), "The duplicate warning").

## RouteModal

A modal opened by its page's address, `?new` or `?edit=<slug>`, for every admin page and the spell builder (`?new=spell-<slug>`, `?edit=<id>`). A page renders it always at one fixed place; it shows its `content` when the address opens a modal, a skeleton under the pressed row's head while a press is on its way, and nothing otherwise. One wrapper means a save always fades.

- **Closing is a navigation back.** Close, Escape, a click outside and `done` fade out, then `navigate(closeHref, { replace: true })` (so Back does not reopen it) and `refresh()`, from `usePendingNavigation`, so the list re-reads.
- **`done` is `Modal`'s own close**, so a form's save fades.
- **Closing while loading cancels the press**: the skeleton's Close calls the provider's `cancel()`, then goes back, which supersedes the push.
- **A caller needing more of the router keeps its own**: the compendium form moves from `?new` to `?edit=` after a save through `useRouter`; the spell builder moves from `?new=spell-<slug>` to `?edit=<id>` on a draft's first save through `navigate` with `replace`.

## Opening at once

A press on an Edit pencil or Add button opens the dialog with its head over a skeleton; the form arrives in the same dialog. A plain link would show nothing until the server drew the whole page.

- **`RouteModalProvider`** is mounted in `src/app/(shell)/keepers/layout.tsx`, by `IngredientEntry` when given `edit`, and by the two pages whose lists open a details modal outside `/curator`, `/keepers`, `/compendium` and a coven's Ingredients. It keeps the pressed heading and navigates through `usePendingNavigation` (`router.push` in a transition; the page bar shows; [`../loading.md`](../loading.md)). It offers `loading`, `loadingPlace`, `open(href, heading, place?)` and `cancel()`. The workshop supplies its own value through the exported `RouteModalContext`; a provider already above is kept.
- **`useOpenModalClick(href, heading, place?)`** returns a link's `onClick`: a plain main-button press opens the modal; Ctrl, Cmd, Shift, Alt, another button, or a press before the script loads is the browser's. Outside a provider it returns nothing. `EditLink` ([`icon-tip.md`](icon-tip.md)), `AddAction` (`src/app/(shell)/curator/add-action.tsx`), New Invitation, each name on `/keepers/users` (`?user=<id>`, [`user-list.md`](user-list.md)) and Edit on an ingredient's page ([`ingredient-entry.md`](ingredient-entry.md), "Edit") use it.
- **Opening and closing leave the page where it is**: `open`, `RouteModal`'s close and every in-place save navigate with `scroll: false`, and every link that opens a modal is a `ModalLink`. `tests/guards/modal-links.test.ts` fails a file that opens a modal and imports `next/link`. A link to another page (the Support dialog's to Your Email) stays plain.
- **The heading is known before the form**: the page builds each row's `editHeading` on the server with the loaded modal's own builder and hands it over beside `editHref`.
- **One dialog throughout**: skeleton and loaded modal are the same `<Modal>` at the same place, so it fades in once; the form is keyed by the row id.
- **`ModalLoading`** is the `form` [`Skeleton`](skeleton.md): a hidden `<output>Loading</output>` and shapes hidden from assistive technology (four label-and-box pairs and two buttons). `Modal`'s `loading` marks the body `aria-busy`. When `loading` ends, the focus moves to the first field only if it is still on the dialog itself.
- **Two places on one page** (a list whose names open a details modal and whose Edit opens the edit modal) render two `RouteModal`s with a `place` each; a press shows only in the place it names.
- **A direct request** to `?edit=` or `?new` renders the modal on the server, no skeleton. **A row deleted since the list was drawn** gives no `content`; the dialog goes and `MissingNotice` says so.
- **A form the browser can draw skips the skeleton.** New Spell writes `?new=spell-<slug>` with `pushState` (`AddAction`'s `drawnHere`) and `SpellDialog` reads the address (`useSearchParams`), so it opens at full size; through the skeleton it grew and its centred top jumped up under the pointer (`tests/e2e/spell-dialog-size.spec.ts`).
- **No GraphQL query**: a read that comes with a navigation belongs to the server component (CLAUDE.md rule 1), which already reads the row with the same checks.

## Styling

Tokens are in `index.scss`: `$dialog-column` (32rem), `$modal-padding`, `$close-target`, `$close-inset`, `$close-reserve`, `$eyebrow-line`. The dialog has no border and a `::backdrop` of the page surface at 75%. The open dialog is a flex column: the header over `.modal-dialog__main`.

- **The page stays in view**: a gap of `clamp(space(4), 5vmin, space(7))` on every side takes the width and height from the viewport's. The dialog is `border-box`, with the widths adding `.modal`'s 1.5rem padding back. On a phone it stays inset rather than becoming a full-height sheet.
- **The body scrolls, not the dialog.** `.modal-dialog__main` reaches the dialog's edges and holds `.modal-dialog__body` (the scroller, padding given back inside so a focus ring is not cut off, `overscroll-behavior: contain`, isolated so raised children do not rise over a question's layer). The header stays top without `position: sticky`.
- **The foot** (`foot`; `RouteModalContent.foot` too) is a bar under the body for the details modal's link to the entry (See in Compendium, See in Your Cupboard). It is a second row of `.modal-dialog__main`'s grid, not a sticky child, because a sticky child lies inside the scroller and the scrollbar's track ran over it. It brings its own surface and hairline, and is `inert` with the body while a question shows.
- **`readingBody`** gives a body with no field `tabIndex={0}` and an inset focus ring, so it scrolls from the keyboard (axe `scrollable-region-focusable`). A form leaves it off.
- **The page behind does not scroll**: `:root:has(.modal-dialog:modal)` sets `overflow: hidden`, in CSS so no listener can leave it locked.
- **Nothing behind moves sideways.** As the first modal opens, `holdPage` measures the scrollbar (`window.innerWidth - document.documentElement.clientWidth`) and, only if over 0, sets `--scrollbar-width` on the root. The root's padding takes its place while a modal holds the page, and the right-anchored fixed elements (theme toggle, impersonation banner, page bar, the backdrop's salt corner) read the same property. A modal over another does not measure again; the room is returned when the last closes. A page with no or floating scrollbars sets nothing. CSS-only `scrollbar-gutter: stable` was rejected: set only while open it shifted a scrollbar-less page; set always it left a blank strip beside the header.
- **`size="listed"`** adds `.modal-dialog--listed`: 49rem, a third of the body to a side list and two to the column (half `$dialog-column` plus a `space(4)` gap). Only the width changes (Edit Stock, [`stock-dialog.md`](stock-dialog.md)).
- **Forced colours**: the dialog and confirm card take a 1px `CanvasText` border (their edge was a shadow); the flash uses the reduced-motion outline (a fill is dropped); the close button takes a 1px inset `Highlight` outline under the pointer.

### Clipped, not hidden

The dialog's overflow is `clip`. A `hidden` box is still a scroll container, and `.visually-hidden` live regions are placed against the dialog (the body is unpositioned), far below its foot; the reference panel's `scrollIntoView` then scrolled the dialog and lifted the header out of view. `clip` makes the dialog no scroll container (`tests/e2e/admin-compendium.spec.ts`). It is styled when open only, leaving the closed element's `display: none` to the browser.

### The fade's colour transitions

The dialog is compounded with `.modal`, whose primitive sets its own `transition` as `body .modal`, so the theme's colour transitions are restated beside the fade for both to run.

### The × and the toolbar row

The Close button is a 2rem × in a 2rem square (`$close-target`, past WCAG 2.5.8's 24px), out of the header's flow, `$close-inset` (`space(5)`) in from the top and right. Its right edge is the right edge of the head's lines beneath, and it is level with the first. The head stops short (`$close-reserve`) so a long name wraps. The gap beneath it is the header's padding, not margin. Controls go in the toolbar row ("A control in the header").

A head with an eyebrow first and no top line has the × raised to put its middle on the eyebrow text's: the inset less half the target's excess over `$eyebrow-line` (the overline at 1.65 line height, 19.8px), 17.9px from the top, written with `:has()` so a browser without it keeps the inset. A head with a top line, or no eyebrow (Add Category), keeps the inset.

### The top line

A head with `topEnd` is as tall as the ×, each mark centred on its middle. The × has its own band and what ends the lines under it (a formal name's pencil) clears it. The line stands 16px above the formal name (the 8px head gap plus a `space(2)` margin) and `space(5)` above what follows, so the description is set off. The margin is on `.modal-dialog__heading > .modal-dialog__top` because `.header > *` zeroes a child's margin at one class's weight. In the markup the × follows the marks.

### The naming grid

With `formalActions`, formal name, title and actions form one grid (`.modal-dialog__naming`) as on the entry page: the formal name and actions share row one, actions at its end, and the title takes all of row two so a long name wraps under the pencil. The actions follow the title in the markup. Each is as tall as the pencil, so its margin takes half the difference off each side to centre on the formal name's line. With no formal name the title takes row one and the actions stand beside it. A wrapper node around actions (a coven's own entry's pair of icons) has its margin cleared, but a `<dialog>` keeps its margin (`> :not(dialog)`): a `ModalButton` draws its dialog beside its button, and `margin: auto` is what centres a dialog in the top layer. Empty, the grid takes no room.

### Controls beneath the ×

With `actionsUnderClose` the heading takes `--under-close`: the naming grid runs to the dialog's right edge, so the controls stand beneath the ×, level with the middle of the title's first line, and a wrapped title keeps them there. The head's other lines (the Edited line) keep their reserve for the ×, and the head stands `space(3)` lower. The layout is the Modal's own, with no caller negative margin.

### The scrim and the card

See "Asking over the form" for the overlay's scrim and card.
