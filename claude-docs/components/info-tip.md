# InfoTip

`src/components/InfoTip/` is a field's hint behind an ⓘ beside its label, rather than a line of text beneath it, so that a form of many fields does not read as a wall of hints. `id` is the tip's id, which the field it explains lists in `aria-describedby` beside its error's id.

## Contracts

It follows WCAG 1.4.13, content on hover or focus.

- **It opens on hover, on a tap, and on the ⓘ's focus.** A tap opens rather than toggles: on touch the emulated hover has already opened it, and a toggle would shut it again at once.
- **Hover waits 300ms; focus and a tap do not.** A pointer crossing a form on its way somewhere else would otherwise open every tip it passed. A tip opens only once the pointer rests on its control, and a pointer that leaves sooner opens nothing. Focus and a tap are asked for on purpose, so they open at once. This holds for every tip built on `useTip`, and for CategoryChips' +N panel, which places itself and keeps its own open state but waits the same `TIP_OPEN_DELAY_MS` (`InfoTip/constants.ts`; [`category-chips.md`](category-chips.md)).
- **It never opens on the field's own focus.** The cost is a sighted keyboard user in Safari, or Firefox on macOS by default, which skip buttons when tabbing: they never land on the ⓘ, so never see the tip. A screen reader user loses nothing, because the field reads the hint as its description, open or not.
- **The ⓘ stays in the tab order.** It is how a keyboard opens the tip, and it costs one stop per field.
- **It stays open while the pointer is over it.** Hover is heard on the wrapper, which holds the tip as well as the button. Leaving both closes it after 150ms, long enough to cross the gap onto the tip, and coming back cancels that.
- **It closes on Escape, blur, or the pointer leaving both.** Escape is heard on the document, because a tip opened by hover has no focus to listen from, and it closes the tip without moving the focus. While a tip is open the Escape is marked handled (`preventDefault`), so it closes nothing else: inside a modal the `<dialog>` would otherwise take it as a close request too, shutting the modal or asking a changed form to discard. With the tip shut, Escape is left alone.
- **The text is in the page while closed**, faded out and `aria-hidden` rather than unmounted, so the field that lists the id still reads it as part of its description, and the button reads it as its own. A screen reader user never has to open the tip to hear the hint. `role="tooltip"` names what it is when it is open.

### useTip

`useTip(canOpen?, placement?, timing?)` (`use-tip.ts`) holds the open state, the handlers and the Escape listener, so another tip beside a control behaves the same without being an ⓘ. [`IconTip`](icon-tip.md), the Edit pencils' tooltip, Combobox's entry and qualifier tooltips ([`combobox.md`](combobox.md)), and `UserList`'s history link, primary keeper crown and locked Revoke ([`user-list.md`](user-list.md)) all use it.

- **`canOpen`** is asked each time the tip would open, not watched, for a tip that has nothing to show at some moments: a Combobox entry whose text fits (which changes with the control's width and matters only when someone looks), a qualifier with no detail. Left out, the tip always opens.
- **`timing`** (`{ openDelayMs, closeDelayMs }`) changes the 300ms and 150ms waits. `IconTip` sets the close to `0`, because its bubble cannot be hovered.
- **`hide`** lets a caller close a tip for its own reasons: Combobox's qualifier closes its tip at the first printable key and when its list opens, so it never sits over what is being typed.

### Placement

Every tip places itself as it opens and stays on screen. `useTip` places the bubble through Floating UI (`@floating-ui/react-dom`, as Combobox's list is, `Combobox/position.ts`): `offset` (4px), `flip` to the other side when the preferred one has no room, and `shift` along the side until it is 8px inside the screen. The bubble is `position: fixed`, so no scrolling or clipping ancestor cuts it, and it is followed (`autoUpdate`) only while open.

- **The preferred side is `top` by default**, because a tip opens while its field has focus, and below it would cover what is typed.
- **`--tip-placement`** is a custom property a stylesheet sets to ask for another side (any Floating UI placement, such as `bottom` or `left`). It inherits to every tip inside, may be set by a media or container query, and is read as the tip opens, since a query may have changed it since. The filter panel sets `bottom`, and a stacked table sets `left` for its Edit pencils. Anything else, or none, gives `placement`.
- **An ancestor marked `data-tip-boundary`** (the filter panel) is the edge the bubble keeps inside, in place of the screen.
- **A stylesheet never positions a bubble itself** (no inset, margin or translate on it, only the fade's `transform`), because `useTip` places it and anything added moves it off its control.
- **Before the script has run**, the `tip-above` mixin's rest state keeps the bubble out of the page's flow: fixed at the origin, invisible, its text still in the page, so reading and `aria-describedby` are as before. It is as wide as its text, up to `$tip-width` (18rem) and never more than the viewport less 2rem. The tip sits one layer up (`z-index: 1`), above the control that precedes it.

### When a field gets a tip

- **Keep a tip only when it states a rule, a flow, or a format with a trap**, something the label cannot carry: what a classification of None does to the formal name, that the Reason lands in the audit record, that a searched value's suggestions match its description.
- **Remove a tip that restates its label.** "The signs it answers to" beside Zodiac Signs adds nothing but a stop.
- **A tip that only gives a format becomes the placeholder**, one or two words of example (`Shelley, Mary`, `2nd ed.`).
- **Many tips about one way of writing become one**, at the head of the group: the reference panel's thirteen became its How to Cite tip.
- **A field with no hint names no hint id in its `aria-describedby`** (`fieldDescription`, [`field.md`](field.md)), so removing one leaves nothing dangling.

## Styling

The button's target is 24px (WCAG 2.2's minimum, the `$icon-size` token). The bubble reads as neutral rather than a warning, and its ground is an opaque mix so the control beneath does not show through. It takes the pointer only while open: `visibility` flips after the fade out, not before. The look and the fade are the `tip-bubble` mixin's, shared with IngredientForm's tooltip on a cut-off list entry; the tip's position and width stay its own. `$align` on `tip-above` is deprecated.

## Not here

Stories: [`index.stories.tsx`](../../src/components/InfoTip/index.stories.tsx). Tests: `tests/components/InfoTip/index.test.tsx` (the `dom` project, fake timers for the close delay), and `tests/e2e/tip-placement.spec.ts`, which measures every tip of the Add Ingredient dialog inside a 320px viewport and the formal name's on both entry pages inside a 390px one.
