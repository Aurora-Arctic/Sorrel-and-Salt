# SkeletonFade

When a wait ends, the shell's bodies do not drop the skeleton at once. They keep the last one over the page that has arrived, and it fades away for 200ms (`$arrive-duration`, the same time `arrived` fades content in) while the page shows through. Used by `MainBody` and `SectionBody`; the owner asked for the crossfade on 2026-10-19 (M12.33).

## Parts

| Part                            | What it does                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useLeavingSkeleton(shown)`     | Pass the skeleton while a wait is on and `null` when it is not. Returns the skeleton to keep for 200ms after the wait ends, then `null`                                                                                                                                                           |
| `skeletonFadeHost(leaving)`     | The class of the box the overlay is placed against: `position: relative`, and `overflow: clip` only while it fades                                                                                                                                                                                |
| `SkeletonOverlay`               | The kept skeleton: `aria-hidden`, `pointer-events: none`, `position: absolute` at the host's top-left, out of layout, on the page's own ground                                                                                                                                                    |
| `heldPage(waiting, className?)` | Props for the box the page stays in: while waiting, the `skeleton-held` class (`visibility: hidden`), `inert` and `aria-hidden`                                                                                                                                                                   |
| `SkeletonCover`                 | The skeleton during the wait: a `skeleton-cover` box over the whole host (`position: absolute; inset: 0`) holding a pin that sticks at `var(--sticky-top, 0)`, the top of the window under the bar. `SectionBody` adds a `skeleton-cover-host` box (`position: relative`) around its frame for it |

## The page is held, not swapped

During a wait the old page stays mounted, hidden, at its full height, and the skeleton is laid over it (MB.271). Swapping the page for the skeleton made the document shorter than the place the reader had scrolled to, so the browser pulled the scroll position up, and Chrome then saved that shortened position into the history entry when Next pushed the new address: Back returned to the wrong place. Held, the page keeps the document's height until the new page arrives.

- **Hidden, not removed.** `visibility: hidden` keeps the page's layout; `inert` and `aria-hidden` take it out of reach of the keyboard, the pointer and a screen reader, so nobody acts on the old page in the wait. `display: none` would collapse the height, which is the bug, and React's `<Activity>` hides with `display: none` too.
- **The page keeps its box.** The page is a child of the same element in both states, so React never remounts it, and a section frame keeps the page as its direct children, so its flex column and gap are untouched.
- **Pinned to the window.** The cover spans the whole page, so its sticky pin shows the skeleton at the top of the window, under the bar, wherever the page was scrolled to. The shell sets `--sticky-top`; `PublicFrame` sets it to `0px`.

## Rules

- **Out of layout and out of the way.** The overlay is absolute, so it adds no height; the host clips it while it fades, so a skeleton taller than the arrived page cannot lengthen the document. It takes no pointer events and unmounts when the fade is done, so it never covers a focused control after it.
- **One heading, one status.** The overlay carries no hidden `h1` and is `aria-hidden`; the arrived page has its own heading and landmark. The hidden `h1` exists only while the wait is on.
- **A new wait mid-fade** takes the skeleton back at once; the old timer is cleared.
- **No skeleton, no fade.** A navigation with no skeleton target (a refresh) leaves the page standing and nothing fades: the page was never replaced.
- **The page is not wrapped to fade in.** Its fade-in is the overlay fading out over it, on the page's ground: wrapping the arriving page in a box to run `arrived` on it would put a box round it that the section layouts' flex columns would feel. The same keyframe (`fade-in`) runs backwards.
- **Reduced motion** follows `arrived`: it shows the new content at once, so the overlay is `display: none` and nothing fades.

## Holding the page during a wait

While a wait is on, the page stays mounted at its full height but unseen (`visibility`) and out of reach (`inert`, `aria-hidden`), while `SkeletonCover` stands over it. `visibility` is used because it keeps the page's box, where `display: none` or React's `<Activity>` would collapse it. The page is not taken away because the browser saves the scroll position into the history entry when the navigation writes it, after the skeleton is up. A page swapped for a shorter skeleton would clamp the scroll first, and Back would return to the clamped position. The element is the same whether waiting or not, so React keeps the page mounted.

## The fade out

When a wait ends, the bodies (`MainBody`, `SectionBody`) do not drop the skeleton at once. They keep the last one over the page that has arrived, and it fades away while the page shows through. This is a client part, since the timer is the browser's. The skeleton fades rather than the page fading in, because wrapping the arriving page would put a box round it that the section layouts' flex columns would feel. The overlay is out of layout and unmounts when it has gone.

## Stories

`src/components/SkeletonFade/index.stories.tsx`, titled "Feedback / Skeleton Fade": `Default`. A press of its button starts a wait and a second press ends it, and the skeleton fades for 200ms over the page that arrived.
