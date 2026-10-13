# PageNav

`src/components/PageNav/` — a menu of jump links to the sections of one page,
which marks the section in view. The account page is its first user and the coven
index (`/coven/[slug]`) its second.

## Purpose

A long page with several sections needs a way to reach each one. This is that
menu: plain anchors to the sections' ids, so it works before any script loads.
The account page's sections are panels; the coven index's are plain
`.page-frame__section`s. Each section carries its `id` and the scroll margin
`.page-frame__section` gives it.

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
- Where the column goes is the page's, and both pages take it from the one
  class, `.page-with-nav` in `_primitives.scss` ("Where it stands", below).

## Where it stands

`.page-with-nav` goes on the page's root. Its children are the head, the menu,
then the sections. From a tablet up it is a grid: the menu is a sticky column
under the shell's bar, spanning the three rows after the head, with the
sections (at `$narrow-column`) beside it. Where the window has room for a
third column, from 58rem, an empty one the menu's width stands to the right,
so the sections sit at the window's centre and the menu hangs to their left;
below that the menu and sections are centred as a pair. At a phone's width it is the plain
column the page frame is, the menu above the sections. The class does not need
`.page-frame`, so the coven index uses it inside `.coven-layout`. A page has at
most three sections beside the menu for it to stick against; the account's
fourth runs on below it. Giving both pages the one class is MB.119's: the two
cannot drift, and the account page's layout was checked unchanged at four widths.

## Stories

[`index.stories.tsx`](../../src/components/PageNav/index.stories.tsx): `Default`, the column on a wide screen with the bar on the right edge and the text right-aligned; `Phone`, at 375px, with the bar on the left and the text left-aligned; `PhoneDark` and `PhoneLight`, the same at 375px in each theme.

## Tests

`tests/components/PageNav/index.test.tsx`: the navigation landmark, the entries
as links with their hrefs, and that the observer's callback moves
`aria-current`. The scroll itself is real-browser behaviour, walked in
`tests/e2e/account.spec.ts`, which also checks that the current entry is drawn
differently from the others. The marker's rules match the attribute's value,
`location`, so a value the component stopped setting would leave the bar
undrawn with every test of the attribute still green (it was, from MB.7 until
M10.33). The coven index's entries are asserted in
`tests/app/(shell)/coven/page.test.tsx`: one per section drawn, each landing on
a section that exists.
