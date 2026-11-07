# LinkHint

`src/components/LinkHint/` — a small dot after a link's text that shows a
click took while the next page is still on its way.

## Purpose

A link to a dynamic page can sit still for a moment while the server answers.
Next's `useLinkStatus` hook says when the link it sits inside is pending, and
this draws that as a dot. It is the inline hint Next's own documentation
recommends ("Inline link hint", `useLinkStatus`). It stands in for a route
`loading.tsx`, which the ingredient pages cannot have (see
[`ingredient-entry.md`](ingredient-entry.md), "Contracts").

## Usage

Put `<LinkHint />` inside the `Link`, after the text. It takes no props. The hook reads the nearest
enclosing `Link`, so outside one it never shows.

### A link with the chain icon: `LinkIconHint`

A link that wears the chain icon (`LinkIcon`) has no dot: the icon itself turns
into the loading ring. Use `LinkIconHint` in place of `<LinkIcon /><LinkHint />`.
It draws one `1em` box holding the icon, and while the link is pending (`useLinkPending`) the shared
[`Spinner`](busy-button.md#spinner) in the same box, so nothing shifts. The icon is hidden when
the ring appears, both after `$loading-delay`, so a quick navigation changes nothing. Used by the
Compendium list's name link, and the "Similar in the Compendium" and "In the Compendium" rows of
the ingredient page ([`ingredient-entry.md`](ingredient-entry.md)). A plain text link keeps the dot.

## Behaviour

- It always holds its space (`opacity: 0`, never its own `visibility`, so a held page keeps it unseen), so showing it
  moves nothing.
- When pending it appears after the `$loading-delay` (100ms), then fades in and pulses, through the
  shared `loading-motion` mixin, also under `prefers-reduced-motion`. It has no exception to the
  loading standard (see [`ui.md`, "One Loading Standard for the Site"](../design-decisions/ui.md#one-loading-standard-for-the-site)).
- It is drawn in the accent colour (`$accent`) at full strength and pulses down
  to 40%, so it reads beside any link colour; the link's own colour at a third of its strength is too faint to notice.
- The dot is decorative and empty (`aria-hidden`): the route change itself is announced when the new
  page arrives.

## In the loading standard

The dot is the link's part of the standard's first part, the control
([`../loading.md`](../loading.md)). A link that navigates is a `PendingLink`
from `src/lib/navigation/`, which also puts up the page bar and, when given a
`navigationTarget`, the destination's skeleton. `useLinkStatus` reports only a navigation that
Next's own `<Link>` started, and a `PendingLink` navigates through the shared hook instead. So
`PendingLink` wraps its children in `LinkPendingContext`
(`src/lib/navigation/link-pending.ts`), and `LinkHint` shows its dot when
either `useLinkStatus` or `useEnclosingLinkPending()` says pending. Outside a
`PendingLink` the context is `false`. The dot says nothing about a
navigation another control started.

The test mocks `useLinkStatus` and reads the `is-pending` class because the class is the state and the dot has no role. The workshop has no Next router, so `useLinkStatus` there (the stub in `.storybook/UnoptimizedLink.tsx`, next to the `next/link` alias) always answers `false`.
