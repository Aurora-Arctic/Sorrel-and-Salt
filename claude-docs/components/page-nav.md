# PageNav

`src/components/PageNav/` — a menu of jump links to the sections of one page,
which marks the section in view. The account page is its first user, the coven
index (`/coven/[slug]`) its second, and the ingredient page (M8.19) its third.

## Purpose

A long page with several sections needs a way to reach each one. This is that
menu: plain anchors to the sections' ids, so it works before any script loads.
The account page's sections are panels; the coven index's are plain
`.page-frame__section`s. Each section carries its `id` and the scroll margin
`.page-frame__section` gives it.

## Props

- `label`: the landmark's accessible name ("On This Page").
- `entries`: `{ href: '#id', label, group?, apart? }[]`, one per section, in page order.
  `apart` (MB.155) sets an item off from those above it: a break a step
  wider than a group label's (`space(6)` above, so the rule has air on both
  sides; the owner's call), for an ingredient's Forms and its closing
  References, and a short `$hairline` rule (the shared
  `short-hairline` mixin, a pseudo-element, not an element) halfway through
  that break (`space(6) / 2`, less half the rule's 1px so its centre is on the
  middle), at the entries' inset: on the start edge, the end edge where the
  menu is right-aligned. On a top-level entry it also takes a group entry's
  size. A group is set apart by its **first** entry's `apart`; the `<li>` of
  the group takes the break and its label gives up its own, so the gap is not
  doubled. The ingredient page sets apart its **Forms** group, so it opens
  with the same line, and, with sources, a **References** group of **Notes**
  and **Bibliography**; with none, the single References link. Only the
  group's `<li>` draws it, never its first entry again inside the group.
  `group` is optional and the account page and coven index leave it out.
  Consecutive entries naming the same `group` are drawn as one nested list
  under a label: `<li><span class="page-nav__group">Forms</span><ul>…</ul></li>`.
  The label is text, not a link, and names its list (`aria-labelledby`, an id
  from `useId`), so the ingredient page's forms are a `list` named **Forms**,
  apart from its **Details**. The entries stay one flat array, so the observer
  watches a grouped entry's section like any other.

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
- A group's label is set as `.eyebrow` is (`overline` size, weight 500,
  uppercase, letter-spaced) but in the body ink, `$text-primary`, darker
  than the muted entries under it, padded as an entry is, a `space(5)` step
  below the entry above and `space(1)` above its first entry (the owner's
  calls at M8.19, the second brought a step closer since). Its entries are not stepped
  in from it at any width: the label alone sets them apart (the owner's call
  at M8.19: a step in read as too much room to their left on a phone, and on
  a wide screen, where the text is right-aligned, pushed them off the
  column's edge).
- When any entry has a group the nav carries `.page-nav--grouped`, and its
  top-level entries are set at 1.125rem, a step above body copy, so the page's
  own section reads apart from the grouped ones. A nav without groups is
  unchanged.
- Where the column goes is the page's. The account page and the coven index take
  it from the one class, `.page-with-nav` in `_primitives.scss` ("Where it
  stands", below); the ingredient page has its own wide layout with the same
  menu column, breakpoint and sticky offset (`ingredient-entry.md`, "Layout").

## Where it stands

`.page-with-nav` goes on the page's root. A page with no head of its own, such as a tab inside `TabbedPage` whose heading stands above it, adds `.page-with-nav--headless`, which starts the menu on the first row. Its children are the head, the menu,
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
cannot drift, and the account page's layout was checked unchanged at four widths. The spell page uses the ingredient layout too (`entry-nav-grid`), and an entry may be `narrowOnly`: hidden from a tablet up, where the section it names stands beside the text. A group whose entries are all `narrowOnly` is hidden whole, its label too.

## Stories

[`index.stories.tsx`](../../src/components/PageNav/index.stories.tsx): `States` is a grid: Plain, the column on a wide screen with the bar on the right edge and the text right-aligned; Grouped, a top-level entry and three under a Forms label; Grouped Apart, a group set apart by its first entry, with a break and a short rule before it. The toolbar viewport menu shows any of them at 375px, where the bar is on the left and the text left-aligned.

## Tests

`tests/components/PageNav/index.test.tsx`: the navigation landmark, the entries
as links with their hrefs, and that the observer's callback moves
`aria-current`; that no entry naming a group draws one flat list; and that a
run sharing a group is a nested list named by the group, holding only its
entries, the label no link, and the observer reaching an entry inside it. The scroll itself is real-browser behaviour, walked in
`tests/e2e/account.spec.ts`, which also checks that the current entry is drawn
differently from the others. The marker's rules match the attribute's value,
`location`, so a value the component stopped setting would leave the bar
undrawn with every test of the attribute still green (it was, from MB.7 until
M10.33). The coven index's entries are asserted in
`tests/app/(shell)/coven/page.test.tsx`: one per section drawn, each landing on
a section that exists.

## The break before a set-apart item

An item set apart (an ingredient's Forms, and its References, whether one link or a group of Notes and Bibliography) takes a break one step wider than a group label's, so the line in it has air on both sides. A group's label carries its own break, so here the item takes the gap and the label gives its own up, which keeps the gap from being doubled.

A short hairline sits halfway through that gap. A pseudo-element draws it, so the list gains no element. It starts at the entries' own inset and, where the menu is right-aligned, ends there. The entries above and the item itself both pad their text by `space(1)` top and bottom, so the middle of the margin is the middle between the two texts. The rule is 1px tall and hangs below its offset, so half a pixel is taken off to put its centre on the middle.
