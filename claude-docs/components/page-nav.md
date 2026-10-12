# PageNav

`src/components/PageNav/` — a menu of jump links to the sections of one page,
which marks the section in view. The account page is its first user.

## Purpose

A long page with several panels needs a way to reach each one. This is that
menu: plain anchors to the sections' ids, so it works before any script loads.

## Props

- `label`: the landmark's accessible name ("On this page").
- `entries`: `{ href: '#id', label }[]`, one per section, in page order.

## Behaviour

- **Anchors do the jump.** Pressing an entry follows its fragment. The root
  has `scroll-behavior: smooth` (`src/app/globals.scss`), switched off under
  `prefers-reduced-motion`. Each section keeps its own `scroll-margin-top`
  under the shell's bar.
- **The current entry** carries `aria-current="location"`. The server render marks
  the first. In the browser an `IntersectionObserver` watches the sections
  through a band across the upper part of the window; the first entry (in page
  order) whose section is inside it becomes current. When none is inside it,
  the last one stays.

## Styling

- A column in both layouts; each entry a row padded `space(1) space(4)`, square,
  not control-tall, with no underline, `$text-muted` ink, and `$text-primary` on a `$fill-quiet`
  wash on hover. The focus ring is the shared mixin.
- On a wide screen the column sits left of the page, so the text is
  right-aligned and the current bar (`$rule-heavy` wide, straight, accent) is
  on the right edge, facing the page. On a phone the text is left-aligned and
  the bar is on the left edge, in a muted mix of the accent and the card
  surface, echoing the bottom bar's rule.
- The current entry is also weight 500, so hue is never the only sign.
- Where the column goes (the sticky left column) is the page's: see
  `.account-page` in `_primitives.scss`.

## Stories

[`index.stories.tsx`](../../src/components/PageNav/index.stories.tsx): `Default`, the column on a wide screen with the bar on the right edge and the text right-aligned; `Phone`, at 375px, with the bar on the left and the text left-aligned.

## Tests

`tests/components/PageNav/index.test.tsx`: the navigation landmark, the entries
as links with their hrefs, and that the observer's callback moves
`aria-current`. The scroll itself is real-browser behaviour, walked in
`tests/e2e/account.spec.ts`.
