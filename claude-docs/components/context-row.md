# ContextRow

`src/components/ContextRow/` is the band under the shell's bar that says where
you are in words: the coven's name (as its switcher) or "Admin", with the
area's section nav beside it. A server component of two slots.

## Slots

- `lead` (`types.ts`): what names the area. The coven layout passes `WorkspaceSwitcher`; the
  admin layout a `PendingLink` to `/curator` reading "Curator", or to `/keepers` reading "Keepers", with
  `context-row__name`, so the area's name is its home as the switcher is the
  coven's. It names the `admin` region and the `page`
  shape as its `navigationTarget`, so a press on it draws a page skeleton under the row while
  the index is on its way ([`loading.md`](../loading.md)).
- `children`: the section nav (`CovenNav`, `AdminNav`).

## Contracts

- The layouts render it, not the shell, because only a layout knows the area.
  The coven layout renders it above its `.coven-layout` frame and the admin
  layout above `.page-column` (inside `RouteModalProvider`).
- The section nav leaves the row at a phone's width by its own stylesheet (it
  becomes a bar fixed along the bottom), so there the row shows the lead alone.
  The nav stretches to the row's height, so the row is a flex row with
  `align-items: stretch`.

## Styling

- **The ground is local to this row.** It is the card colour mixed 45% into
  the page (`color-mix(in srgb, $surface-card 45%, $surface-page)`), named
  `$context-row-ground` at the head of `index.scss` rather than made a token,
  because this row is its only user, as TabbedPage's `$segment-pill` is. Its
  contrast needs no check of its own: in both themes the card is lighter than
  the page in every colour channel, so the mix sits between the two, and
  `tests/scss/tokens.test.ts` already holds every text colour to 4.5:1 on the
  page and on the card.
- Full width, with a `$hairline` bottom edge. The inner column is
  `$wide-column` wide.
- The row is `$context-row-height` tall on a desktop: a control's height plus
  `space(2)` of air above and below the lead, so the Admin row, which holds
  text alone, stands as tall as the coven row's switcher and the backdrop's
  offset below it is exact. There is a hairline between the lead and the nav.
- At or under `$shell-phone-width` it is at least `$context-row-height-phone`
  tall, a control plus half a step (`calc(space(3) / 2)`) of air each side,
  and the inner column's inline padding is the same half step. A two-line
  coven name makes the row taller rather than clipping it.
- **`.context-row__name` is set as an h4 is**, so "Admin" matches the coven
  row's switcher, with no link underline until hover or focus: `@include heading-face` (the display family, weight 700,
  letter-spaced 0.01em) and `heading-size(4)`, 1.5rem
  ([`styling.md`](../styling.md), "Type"). Its line height is its own, 1
  rather than the h4's 1.25, since the name is one line that never wraps and
  the lead's padding already sets the air around it.

## Accessibility

The row is a named region (`section`, labelled "Context"), so its lead sits inside a landmark for the axe region rule; the nav inside it is named by its own `aria-label`.

## Stories and tests

`src/components/ContextRow/index.stories.tsx` (render-only; includes a coven name long enough to wrap to two lines at 375px); `tests/components/ContextRow/index.test.tsx`.
