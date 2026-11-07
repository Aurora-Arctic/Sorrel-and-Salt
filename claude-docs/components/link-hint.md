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

Put it inside the `Link`, after the text:

```tsx
<Link href={href}>
  {label} <LinkHint />
</Link>
```

It takes no props. The hook reads the nearest enclosing `Link`, so outside one
it never shows.

### A link with the chain icon: `LinkIconHint`

A link that wears the chain icon (`LinkIcon`) has no dot: the icon itself turns
into the loading ring. Use `LinkIconHint` in
place of `<LinkIcon /><LinkHint />`:

```tsx
<Link href={href}>
  {label}
  <LinkIconHint />
</Link>
```

It draws one `1em` box (`span.link-icon-hint`) holding the icon, and while the
link is pending (the same state as the dot, `useLinkPending`) the shared
[`Spinner`](busy-button.md#spinner) in the same box, with `is-pending` on the box. Nothing
shifts. The icon is hidden when the ring appears, both after `$loading-delay`,
so a quick navigation changes nothing; the ring pulses under reduced motion as
it does everywhere. The link keeps `aria-busy`. Used by the Compendium list's
name link, and the "Similar in the Compendium" and "In the Compendium" rows of
the ingredient page ([`ingredient-entry.md`](ingredient-entry.md)). A plain
text link keeps the dot.

## Behaviour

- Renders `<span aria-hidden="true" class="link-hint">`, plus `is-pending`
  while the link is pending.
- It always holds its space (`opacity: 0`, never its own `visibility`, so a held page keeps it unseen), so showing it
  moves nothing.
- When pending it appears after a 100ms delay, so a fast navigation never
  flashes it, then fades in and pulses.
- It is drawn in the accent colour (`$accent`) at full strength and pulses down
  to 40%, so it reads beside any link colour; the link's own colour at a third of its strength is too faint to notice.
- Its delay is the `$loading-delay` token (100ms), the same hold-back the
  spinner and the page bar use.
- Under `prefers-reduced-motion` it shows after the same delay and pulses,
  through the shared `loading-motion` mixin and `loading-pulse` keyframes, as
  the spinner and the skeleton do. It has no exception to the loading standard (see
  [`../design-decisions/m12.33-loading-standard.md`](../design-decisions/m12.33-loading-standard.md)).

## In the loading standard

The dot is the link's part of the standard's first part, the control
([`../loading.md`](../loading.md)). A link that navigates is a `PendingLink`
from `src/lib/navigation/`, which also puts up the page bar and, when given a
`navigationTarget`, the destination's skeleton; the dot stays inside it as
before. `useLinkStatus` reports only a navigation that Next's own `<Link>`
started, and a `PendingLink` navigates through the shared hook instead. So
`PendingLink` wraps its children in `LinkPendingContext`
(`src/lib/navigation/link-pending.ts`), and `LinkHint` shows its dot when
either `useLinkStatus` or `useEnclosingLinkPending()` says pending. Outside a
`PendingLink` the context is `false`. The dot still says nothing about a
navigation another control started.

## Accessibility

The dot is decorative and empty, so it is `aria-hidden` and adds nothing to the
link's name. A screen reader needs nothing more: the route change itself is
announced when the new page arrives.

## Stories and tests

`src/components/LinkHint/index.stories.tsx` and `tests/components/LinkHint/index.test.tsx`, which mocks `useLinkStatus` and reads the `is-pending` class because the class is the state and the dot has no role. The workshop has no Next router, so `useLinkStatus` there (the stub in `.storybook/UnoptimizedLink.tsx`, next to the `next/link` alias) always answers `false`.

**Forced colours.** The pending dot is painted `LinkText`, the ink of the link it follows.
