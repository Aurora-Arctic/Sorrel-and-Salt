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
  and it closes the tip without moving the focus.

**`useTip`** (`use-tip.ts`) holds that behaviour, the open state, the
handlers and the Escape listener, so another tip beside a control behaves the
same without being an ⓘ: `UserList`'s history link, the primary admin's
crown and its locked Revoke use it too ([`user-list.md`](user-list.md),
MB.200, MB.59).

**The text is in the page while closed**, faded out and `aria-hidden` rather
than unmounted, so the field that lists the id still reads it as part of its
description, and the button reads it as its own. A screen reader user never
has to open the tip to hear the hint. `role="tooltip"` names what it is when
it is open.

## Placement

The tip is placed against its **nearest positioned ancestor**, not against the
button, from that ancestor's left edge, **above** it: beneath the label it would
cover the field, and what is typed in it. It is as
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
at once. The look and the fade are the `tip-bubble` mixin's, shared with
IngredientForm's tooltip on a cut-off list entry, so the two cannot drift; the
tip's position and width stay its own.

## Stories

[`index.stories.tsx`](../../src/components/InfoTip/index.stories.tsx):
`BesideALabel`, in a positioned column a form's width. Hover, focus or tap the
ⓘ to open it.

## Testing

`tests/components/InfoTip/index.test.tsx`, in the `dom` project, with fake
timers for the close delay: closed at first, and shut while the field it
describes has focus, its text still describing the button and the field;
opened by hover, kept open while the pointer is on the tip, and closed a
moment after it leaves; opened by focus and closed by blur; opened by a tap
that a second tap does not shut; closed by Escape from anywhere.
