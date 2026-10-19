# Navigation Bar

`src/lib/navigation/navigation-bar.tsx` (the behaviour) and
`navigation-bar.scss` (the look), M12.33. The page part of every wait: a thin
bar along the bottom edge of the global bar while a navigation is on its way.

## The look

- 3px tall, in `$accent`, `position: fixed` under the global bar, above the
  page (`layer('banner')`), and never takes a click.
- A segment 40% of the width sweeps across every `$shimmer-duration` (1.4s)
  through `loading-motion`. Under reduced motion the segment fills the bar and
  pulses on `loading-pulse` instead.
- It fades out over `$motion-short` (150ms).

## The three states

| State  | Markup                      | Drawn               |
| ------ | --------------------------- | ------------------- |
| Idle   | `hidden`                    | No                  |
| Shown  | neither                     | Yes                 |
| Fading | `hidden` and `data-leaving` | Yes, fading to none |

The stylesheet's `[data-leaving]` rule sets `display: block` so the author
rule beats the browser's `hidden`, and puts the fade on that state. The 100ms
hold-back before it shows is the component's timer, not a CSS delay, so a
navigation that settles first can cancel it.

The stylesheet is imported where the app's other global sheets are
(`src/app/providers.tsx`).

## Stories

`Feedback / Navigation Bar` (`.ladle/navigation-bar.stories.tsx`): `Shown` and
`Leaving`.
