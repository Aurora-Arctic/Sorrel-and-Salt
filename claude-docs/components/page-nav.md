# PageNav

`src/components/PageNav/` is a menu of jump links to the sections of one page, which marks the section in view. A long page with several sections needs a way to reach each one, and these are plain anchors to the sections' ids, so it works before any script loads. Each section carries its `id` and the scroll margin `.page-frame__section` gives it. The account page's sections are panels and the coven index's are plain `.page-frame__section`s.

## Contracts

- **`collapsible` folds the menu behind its label on a phone.** It is a native `<details>` inside the nav landmark, closed until opened, so it works without the script. From a tablet up it stands open and the label is hidden. The server draws it closed, so a browser that supports `::details-content` shows the menu open from the first paint, and others show it once the script opens it. Only the document pages set it.
- **Anchors do the jump.** Pressing an entry follows its fragment. The root has `scroll-behavior: smooth` (`src/app/globals.scss`), switched off under `prefers-reduced-motion`. Each section keeps its own `scroll-margin-top` under the shell's bar.
- **The current entry carries `aria-current="location"`.** The server render marks the first. In the browser an `IntersectionObserver` watches the sections through a band across the upper part of the window, and the first entry (in page order) whose section is inside it becomes current. When none is inside it, the last one stays. The marker's rules match the attribute's value, `location`, so a value the component stopped setting would leave the bar undrawn with every test of the attribute still green.
- **`group` is optional.** Consecutive entries naming the same `group` are drawn as one nested list under a label: `<li><span class="page-nav__group">Forms</span><ul>…</ul></li>`. The label is text, not a link, and names its list (`aria-labelledby`, an id from `useId`), so the ingredient page's forms are a `list` named **Forms**, apart from its **Details**. The entries stay one flat array, so the observer watches a grouped entry's section like any other. The account page and the coven index leave `group` out.
- **`apart` sets an item off from those above it.** The break is a step wider than a group label's, with a short rule halfway through it, drawn by a pseudo-element (the shared `short-hairline` mixin) so the list gains no element.
  - **A group is set apart by its first entry's `apart`.** The group's `<li>` takes the break and draws the rule, never its first entry again inside the group, and its label gives up its own break so the gap is not doubled.
  - **The ingredient page sets apart its Forms group**, so it opens with the same line, and, with sources, a References group of Notes and Bibliography. With none, it sets apart the single References link.
- **A group's top-level siblings read apart.** When any entry has a group the nav carries `.page-nav--grouped`, and its top-level entries are set at 1.125rem, a step above body copy, so the page's own section reads apart from the grouped ones. A nav without groups is unchanged.
- **An entry may be `narrowOnly`.** It is hidden from a tablet up, where the section it names stands beside the text. A group whose entries are all `narrowOnly` is hidden whole, its label too.

## Where it stands

`.page-with-nav` in `_primitives.scss` goes on the page's root. The account page and the coven index take their layout from this one class, so the two cannot drift. The class does not need `.page-frame`, so the coven index uses it inside `.coven-layout`. The ingredient page and the spell page have their own wide layout with the same menu column, breakpoint and sticky offset ([`ingredient-entry.md`](ingredient-entry.md), "Layout"; the spell page's is `entry-nav-grid`). The public document pages ([`document-page.md`](document-page.md)) use `.page-with-nav` with a wider column. The help front page and a help article with a menu use `.page-with-nav` with the same wider column ([`help-pages.md`](help-pages.md)).

- A page that takes the class only for its narrow column and has no `.page-nav` child, such as the support pages and the account's Support Requests tab, keeps no room for a menu: its column stays centred at every width. The shell's paused notice follows the same choice. A page with a menu, from a tablet up to the width that fits a menu column each side, centres the menu and the column together.
- A page with no head of its own, such as a tab inside `TabbedPage` whose heading stands above it, adds `.page-with-nav--headless`.
- Its children are the head, the menu, then the sections.
- From a tablet up the menu is a sticky column beside the sections, at most a third of the row (`page-with-nav-grid`), so the text keeps the rest as the window narrows; at a phone's width it sits above them.
- A page has at most three sections beside the menu for it to stick against. The account page's fourth runs on below it.

## Styling

- **On a wide screen the column sits left of the page**, so the text is right-aligned and the current bar is on the right edge, facing the page. On a phone the text is left-aligned and the bar is on the left edge.
- **The current entry is set in the body ink** rather than the muted one, so hue is never the only sign. Its weight stays that of the other entries, since a bolder entry is wider and could wrap onto another line only while it is current.
- **A long entry wraps with `text-wrap: balance`**, as the headings do, so its lines come out an even length and none is left holding one word. It is an enhancement past the browser floor, and an older browser wraps the entry in the ordinary way. A page whose entries are long, as a document's are, gives them more air and a looser line in its own stylesheet ([`document-page.md`](document-page.md), "The jump menu"). The menu itself keeps the tight row the short-entry pages were designed with.
- **A group's entries are not stepped in from its label at any width.** The label alone sets them apart: a step in reads as too much room to their left on a phone, and on a wide screen, where the text is right-aligned, pushes them off the column's edge.
- **Forced colours.** The current section's bar is an inset shadow, which forced colours drop, so each link carries a heavy `Canvas` border on the bar's edge (the end edge on a wide screen) with the padding reduced to match, and the current one's turns `CanvasText`. It is `Canvas` at rest because a transparent border is painted `CanvasText`. Hover on a link and on a group's summary is a 1px inset `Highlight` outline.

## Not here

Stories: [`index.stories.tsx`](../../src/components/PageNav/index.stories.tsx).

Tests: `tests/components/PageNav/index.test.tsx`. The scroll itself is real-browser behaviour, walked in `tests/e2e/account.spec.ts`, which also checks that the current entry is drawn differently from the others. The coven index's entries are asserted in `tests/app/(shell)/coven/page.test.tsx`: one per section drawn, each landing on a section that exists.
