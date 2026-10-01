# InfoTip

`src/components/InfoTip/` — a field's hint behind an ⓘ beside its label,
rather than a line of text beneath it. The owner's call in M5.9: a form of
many fields read as a wall of hints. `IngredientForm` is the first form to use
it; others adopt it as their design reviews reach them.

## The props contract

| Prop        | Meaning                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `id`        | The tip's id. The field it explains lists it in `aria-describedby`, beside its error's id.     |
| `label`     | What the tip is about. It names the button, "About Classification".                            |
| `controlId` | Optional. The id of the field it describes: focus there opens the tip, as focus on the ⓘ does. |
| `children`  | The text.                                                                                      |

## Behaviour

It follows WCAG 1.4.13, content on hover or focus:

- **It opens on hover, on a tap, and on focus: the ⓘ's, or the field's own.**
  The field's matters most. Safari, and Firefox on macOS by default, skip
  buttons when tabbing, so a keyboard user there never lands on the ⓘ, and
  sees the hint only because entering the field shows it. The field is found
  by `controlId` once the tip has rendered, since whoever holds the tip
  renders the field too. A tap opens rather than toggles: on touch the
  emulated hover has already opened it, and a toggle would shut it again at
  once.
- **The ⓘ stays in the tab order**, the owner's call in M5.9, though a
  field's own focus also opens its tip: it is how a keyboard reaches the tip
  of a field it cannot focus, such as a disabled one, and it costs one stop
  per field.
- **It stays open while the pointer is over it.** Hover is heard on the
  wrapper, which holds the tip as well as the button. Leaving both closes it
  after 150ms, long enough to cross the gap onto the tip, and coming back
  cancels that.
- **It closes once the field takes input**, typing or a choice: whoever is
  doing either has read it. It stays shut until the field is entered again.
- **It closes on Escape, blur, or the pointer leaving both.** Escape is heard
  on the document, since a tip opened by hover has no focus to listen from,
  and it closes the tip without moving the focus, so a field's hint can be
  dismissed while typing in it.

**The text is in the page while closed**, faded out and `aria-hidden` rather
than unmounted, so the field that lists the id still reads it as part of its
description, and the button reads it as its own. A screen reader user never
has to open the tip to hear the hint. `role="tooltip"` names what it is when
it is open.

## Placement

The tip is placed against its **nearest positioned ancestor**, not against the
button, from that ancestor's left edge, **above** it: the tip opens while its
field has focus, and beneath the label it would cover what is typed. It is as
wide as its text, up to 18rem and never more than the viewport less 2rem. In
`IngredientForm` that ancestor is the field's label row, which starts at the
column's edge, so an open tip lies above the label, over the end of the field
before, and never runs off a phone the way a bubble hung off an icon at the
end of a long label would. Whatever holds an `InfoTip` must be positioned, at
the start of its column. The tip sits one layer up (`z-index: 1`), above the
control that precedes it in the page.

## Styling

Tokens only. The button is the muted ink, the body ink on hover and focus,
with the focus ring, and a 24px target, WCAG 2.2's minimum, around a 1rem
glyph that sits beside a label without raising its line much.

The tip is drawn as the low-stock badge is: the `low-stock` palette's tinted
ground, edge and ink, the `sharp` radius, `caption` size at weight 500. That
is the owner's call, so it reads as a note beside the label rather than as
another field, and the palette is the muted ink tinted into the surface, so
it reads as neutral rather than as a warning. The ground is an opaque mix, so
the control beneath does not show through.

It fades in and out over 500ms, the owner's pace, on the theme's easing,
rising 2px as it appears, and takes the pointer only while open: `visibility`
flips after the fade out, not before. Under reduced motion it appears and goes
at once.

## Stories

[`index.stories.tsx`](../../src/components/InfoTip/index.stories.tsx):
`BesideALabel`, in a positioned column a form's width. Hover, focus or tap the
ⓘ to open it.

## Testing

`tests/components/InfoTip/index.test.tsx`, in the `dom` project, with fake
timers for the close delay: closed at first with its text still describing the
button and a field; opened by hover and closed a moment after the pointer
leaves; kept open while the pointer is on the tip; opened by focus and closed
by blur; opened while the field it describes has focus, closed there by Escape
without the focus moving, and closed by input until the field is entered
again; opened by a tap that a second tap does not
shut; closed by Escape from anywhere.
