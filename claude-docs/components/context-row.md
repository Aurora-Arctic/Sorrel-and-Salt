# ContextRow

`src/components/ContextRow/` is the band under the shell's bar that says where
you are in words: the coven's name (as its switcher) or "Admin", with the
area's section nav beside it (MB.7). A server component of two slots.

## Props

- `lead`: what names the area. The coven layout passes `WorkspaceSwitcher`; the
  admin layout `<span className="context-row__name">Admin</span>`.
- `children`: the section nav (`CovenNav`, `AdminNav`).

## Contracts

- The layouts render it, not the shell, because only a layout knows the area.
  The coven layout renders it above its `.coven-layout` frame and the admin
  layout above `.admin-layout` (inside `RouteModalProvider`).
- The section nav leaves the row at a phone's width by its own stylesheet (it
  becomes a bar fixed along the bottom), so there the row shows the lead alone.
  The nav stretches to the row's height, so the row is a flex row with
  `align-items: stretch`.

## Styling

Full width, with a ground of the card colour mixed 45% into the page
(`color-mix(in srgb, $surface-card 45%, $surface-page)`, defined once here) and
a `$hairline` bottom edge. The inner column is `$wide-column` wide. The row is
`$context-row-height` (3.5rem) tall on a desktop, with a hairline between the
lead and the nav; at or under `$shell-phone-width` it is at least
`$context-row-height-phone` (a control's height) with a step of air above and
below the lead, so a two-line coven name makes the row taller rather than
clipping it. `.context-row__name` is the display face, 1.5rem, 700.

## Accessibility

The row is a named region (`section`, labelled "Context"), so its lead sits inside a landmark for the axe region rule; the nav inside it is named by its own `aria-label`.

## Stories

`Admin`, `Coven`, `Phone`, `PhoneLongName`.

## Testing

`tests/components/ContextRow/index.test.tsx`: the lead and the nav render
together, and the lead alone without a nav.
