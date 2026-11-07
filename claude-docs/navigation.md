# Navigation Bar

`src/lib/navigation/navigation-bar.tsx` (the behaviour) and `navigation-bar.scss` (the look). The page part of every wait: a thin bar along the bottom edge of the global bar while a navigation is on its way.

## The look

- 3px tall, in `$accent`, `position: fixed`, above the page (`layer('banner')`), and it never takes a click.
- Where a page draws no global bar (`/` shows the site name alone) it sits at the top of the window. A `:root:has(.app-shell__bar, .public-frame__bar)` rule lowers it onto the bar's edge only when a frame draws one; a browser without `:has()` leaves it at the top.
- A segment 40% of the width sweeps across every `$shimmer-duration` through `loading-motion`. Under reduced motion the segment fills the bar and pulses on `loading-pulse` instead.
- It fades out over `$motion-short`.

## The three states

| State  | Markup                      | Drawn               |
| ------ | --------------------------- | ------------------- |
| Idle   | `hidden`                    | No                  |
| Shown  | neither                     | Yes                 |
| Fading | `hidden` and `data-leaving` | Yes, fading to none |

The `[data-leaving]` rule sets `display: block` so the author rule beats the browser's `hidden`, and puts the fade on that state. The hold-back before the bar shows (`$loading-delay`) and the fade are timed in JavaScript, not by CSS delays, because a CSS `animation-delay` cannot be cancelled by a navigation that settles first; the values mirror the Sass tokens `$loading-delay` and `$arrive-duration`. The bar reads the site-wide wait from `NavigationProvider`, which React ends by itself when the navigation's transition ends ([`loading.md`](loading.md)). The stylesheet is imported in `src/app/providers.tsx`.

The workshop story `Feedback / Navigation Bar` (`.storybook/navigation-bar.stories.tsx`) shows each state inside the shell frame. The reduced-motion pulse is seen with the OS or devtools setting; the story pin does not reach a CSS media query.

## Holding back and forward

A traversal is cancelable only inside the top-level document, and one from the browser's own buttons only after the person has used the page (the HTML standard's "history-action activation"). The leave guard reads `event.cancelable` and lets anything else go through.

## The actual pathname

Next's `usePathname` answers `/_not-found` for an address no route matches, since that screen is prerendered under the framework's own route. A screen that reports or names the page therefore reads the address bar once it is in the browser; before that it uses the router's path unless that is the framework's, then null.
