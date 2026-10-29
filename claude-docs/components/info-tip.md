# InfoTip

`src/components/InfoTip/` — a field's hint behind an ⓘ beside its label,
rather than a line of text beneath it. The owner's call in M5.9: a form of
many fields read as a wall of hints. `IngredientForm` is the first form to use
it; others adopt it as their design reviews reach them.

## The props contract

| Prop       | Meaning                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------ |
| `id`       | The tip's id. The field it explains lists it in `aria-describedby`, beside its error's id. |
| `label`    | What the tip is about. It names the button, "About Classification".                        |
| `children` | The text.                                                                                  |

## Behaviour

It follows WCAG 1.4.13, content on hover or focus:

- **It opens on hover, on a tap, and on the ⓘ's focus.** A tap opens rather
  than toggles: on touch the emulated hover has already opened it, and a
  toggle would shut it again at once.
- **Hover waits 300ms; focus and a tap do not**, the owner's call
  (2026-10-20). A pointer crossing a form on its way somewhere else used to
  open every tip it passed; now a tip opens only once the pointer rests on
  its control, and a pointer that leaves sooner opens nothing. Focus and a
  tap are asked for on purpose, so they open at once. This holds for every
  tip built on `useTip`, below, and for CategoryChips' +N panel, which
  places itself and keeps its own open state but waits the same
  `TIP_OPEN_DELAY_MS` (`InfoTip/constants.ts`; [`category-chips.md`](category-chips.md)).
- **Never on the field's own focus**, the owner's call in MB.133, reversing
  M5.9: a tip opening on every field entered cluttered the form for little
  value. The cost is a sighted keyboard user in Safari, or Firefox on
  macOS by default, which skip buttons when tabbing: they never land on the
  ⓘ, so never see the tip. A screen reader user loses nothing, since the
  field reads the hint as its description, open or not.
- **The ⓘ stays in the tab order**, the owner's call in M5.9: it is how a
  keyboard opens the tip, and it costs one stop per field.
- **It stays open while the pointer is over it.** Hover is heard on the
  wrapper, which holds the tip as well as the button. Leaving both closes it
  after 150ms, long enough to cross the gap onto the tip, and coming back
  cancels that.
- **It closes on Escape, blur, or the pointer leaving both.** Escape is heard
  on the document, since a tip opened by hover has no focus to listen from,
  and it closes the tip without moving the focus. It is marked handled
  (`preventDefault`) while a tip is open, so the Escape that closes a tip
  closes nothing else: inside a modal the `<dialog>` would otherwise take
  it as a close request too, shutting the modal or asking a changed form to
  discard (MB.115). With the tip shut, Escape is left alone.

**`useTip`** (`use-tip.ts`) holds that behaviour, the open state, the
handlers and the Escape listener, so another tip beside a control behaves the
same without being an ⓘ: `UserList`'s history link, the primary admin's
crown and its locked Revoke use it too ([`user-list.md`](user-list.md),
MB.200, MB.59), as does [`IconTip`](icon-tip.md), the Edit pencils' tooltip, and Combobox's entry and qualifier tooltips
([`combobox.md`](combobox.md)). It takes an optional `canOpen`, asked each
time the tip would open rather than watched, for a tip that has nothing to
show at some moments: a Combobox entry whose text fits, a qualifier with no
detail. Left out, the tip always opens. MB.115 made Combobox's copy of the
hook, which differed only by `canOpen`, this one. A caller may close a tip
for reasons of its own through `hide`: Combobox's qualifier closes its tip
at the first printable key and when its list opens, so it never sits over
what is being typed.

A caller wires `showSoon` to hover and `show` to focus and a tap. A third
argument, `{ openDelayMs, closeDelayMs }`, changes the two waits from 300ms
and 150ms; [`IconTip`](icon-tip.md) sets the close to `0`, since its bubble
cannot be hovered.

**The text is in the page while closed**, faded out and `aria-hidden` rather
than unmounted, so the field that lists the id still reads it as part of its
description, and the button reads it as its own. A screen reader user never
has to open the tip to hear the hint. `role="tooltip"` names what it is when
it is open.

## When a field gets a tip

The owner's rule (2026-10-20), after forms grew an ⓘ on almost every field:

- **Keep a tip only when it states a rule, a flow, or a format with a
  trap**, something the label cannot carry: what a classification of None
  does to the formal name, that the Reason lands in the audit record, that
  a searched value's suggestions match its description.
- **Remove a tip that restates its label.** "The signs it answers to" beside
  Zodiac Signs adds nothing but a stop.
- **A tip that only gives a format becomes the placeholder**, one or two
  words of example (`Shelley, Mary`, `2nd ed.`), rather than a tip.
- **Many tips about one way of writing become one**, at the head of the
  group: the reference panel's thirteen became its How to Cite tip.

A field with no hint names no hint id in its `aria-describedby`
(`fieldDescription`, [`field.md`](field.md)), so removing one leaves nothing
dangling.

## Placement

**Every tip positions itself as it opens and stays on screen** (M8.14,
amended 2026-10-18). `useTip` places the bubble through Floating UI
(`@floating-ui/react-dom`, as Combobox's list is, `Combobox/position.ts`):
`offset` (4px), `flip` to the other side when the preferred one has no room,
and `shift` along the side until it is 8px inside the screen. The bubble is
`position: fixed`, so no scrolling or clipping ancestor cuts it, and it is
followed (`autoUpdate`) only while open.

The caller hands the hook's three results to its markup: `anchor` (a ref) to
the element the bubble belongs to, the wrapper that hears the hover;
`bubble` (a ref) to the bubble; and `bubbleStyle` to the bubble's `style`.
`useTip(canOpen?, placement?)` takes the side it prefers, `top` by default.
A stylesheet can ask for another with the custom property `--tip-placement`
(any Floating UI placement, such as `bottom` or `left`), which inherits to
every tip inside and may be set by a media or container query: the filter
panel sets `bottom`, and a stacked table sets `left` for its Edit pencils. It
is read as the tip opens. An ancestor marked `data-tip-boundary` (the filter
panel) is the edge the bubble keeps inside, in place of the screen. A stylesheet never positions a bubble itself (no inset, margin or translate on it, only the fade's `transform`), since `useTip` places it and anything added moves it off its control; a rule that did is how the formal name's tip stood 18px off its ⓘ (the owner's call, 2026-10-20, in place of a guard).

Before the script has run, the `tip-above` mixin's rest state keeps the bubble
out of the page's flow: fixed at the origin, invisible, its text still in the
page, so reading and the field's `aria-describedby` are as before. It is as
wide as its text, up to `$tip-width` (18rem) and never more than the viewport
less 2rem. The tip sits one layer up (`z-index: 1`), above the control that
precedes it. `tests/e2e/tip-placement.spec.ts` measures every tip of the Add
Ingredient dialog inside a 320px viewport, and the formal name's on both
entry pages inside a 390px one.

## Styling

Tokens only. The button is the muted ink, the body ink on hover and focus,
with the focus ring, and a 24px target, WCAG 2.2's minimum, the `$icon-size`
token, around a `$glyph-size` (1rem) icon that sits beside a label without
raising its line much. Both tokens, and `$tip-width`, are shared with
Combobox's marks and the user list's (MB.115).

The tip is drawn as the low-stock badge is: the `low-stock` palette's tinted
ground, edge and ink, the `sharp` radius, `caption` size at weight 500. That
is the owner's call, so it reads as a note beside the label rather than as
another field, and the palette is the muted ink tinted into the surface, so
it reads as neutral rather than as a warning. The ground is an opaque mix, so
the control beneath does not show through.

It fades in and out over 500ms, the owner's pace, on the theme's easing,
rising 2px as it appears, and takes the pointer only while open: `visibility`
flips after the fade out, not before. Under reduced motion it appears and goes
at once. The look and the fade are the `tip-bubble` mixin's, shared with
IngredientForm's tooltip on a cut-off list entry, so the two cannot drift; the
tip's position and width stay its own.

## Stories

[`index.stories.tsx`](../../src/components/InfoTip/index.stories.tsx):
`States` has a control that chooses Open, Closed or Long Text: the tip beside a label in a `.field__label-row`, the positioned row a
form's field gives it, in a column a form's width. Each opens its tip itself, as a tap on the ⓘ
would; hover, focus or a tap opens it again once it closes.

## Testing

`tests/components/InfoTip/index.test.tsx`, in the `dom` project, with fake
timers for the close delay: closed at first, and shut while the field it
describes has focus, its text still describing the button and the field;
opened by hover, kept open while the pointer is on the tip, and closed a
moment after it leaves; opened by focus and closed by blur; opened by a tap
that a second tap does not shut; closed by Escape from anywhere.

## Source notes

Comments in the source that point here; each is the detail behind a one-line comment.

- `index.scss`: The tip-bubble mixin's: the muted ink tinted into the surface, so it reads as a note beside the label rather than as another field, faded in and out. Its ground is an opaque mix, so the control beneath it does not show through. Placed by `useTip` when it opens, above the ⓘ where there is room and kept on the screen: the bubble is as wide as its text up to `$tip-width` (18rem), and shifted along the line until it is inside the window. Above, not below, by default: the tip opens while its field has focus, and below it would cover what is typed. A region may ask for another side with `--tip-placement`.
- `use-tip.ts`: Whether the tip is open, and its three handlers. `canOpen` is asked as it opens rather than watched: whether a Combobox entry's text fits changes with the control's width, and only matters at the moment someone looks. `placement` is the side the bubble prefers, `top` unless a stylesheet's `--tip-placement` says otherwise. `timing` sets how long a hover waits to open (`showSoon`) and a leave to close (`hideSoon`); IconTip's bubble cannot be hovered, so it closes with no wait. The caller hands `anchor` to the element the bubble belongs to (the wrapper that hears the hover), `bubble` to the bubble, and `bubbleStyle` to the bubble's `style`.
- `use-tip.ts`: The side a stylesheet asks for. `--tip-placement` is a custom property, so a rule can set it for a whole region (the filter panel's tips open below) or by a container query (a stacked table's), and it inherits to every tip inside. Read as the tip opens, as `canOpen` is, since a media or container query may have changed it since. Anything else, or none, is `fallback`.
