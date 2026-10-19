# SkeletonFade

When a wait ends, the shell's bodies do not drop the skeleton at once. They keep the last one over the page that has arrived, and it fades away for 200ms (`$arrive-duration`, the same time `arrived` fades content in) while the page shows through. Used by `MainBody` and `SectionBody`; the owner asked for the crossfade on 2026-10-19 (M12.33).

## Parts

| Part                        | What it does                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useLeavingSkeleton(shown)` | Pass the skeleton while a wait is on and `null` when it is not. Returns the skeleton to keep for 200ms after the wait ends, then `null`        |
| `skeletonFadeHost(leaving)` | The class of the box the overlay is placed against: `position: relative`, and `overflow: clip` only while it fades                             |
| `SkeletonOverlay`           | The kept skeleton: `aria-hidden`, `pointer-events: none`, `position: absolute` at the host's top-left, out of layout, on the page's own ground |

## Rules

- **Out of layout and out of the way.** The overlay is absolute, so it adds no height; the host clips it while it fades, so a skeleton taller than the arrived page cannot lengthen the document. It takes no pointer events and unmounts when the fade is done, so it never covers a focused control after it.
- **One heading, one status.** The overlay carries no hidden `h1` and is `aria-hidden`; the arrived page has its own heading and landmark. The hidden `h1` exists only while the wait is on.
- **A new wait mid-fade** takes the skeleton back at once; the old timer is cleared.
- **No skeleton, no fade.** A navigation with no skeleton target (a refresh) leaves the page standing and nothing fades: the page was never replaced.
- **The page is not wrapped to fade in.** Its fade-in is the overlay fading out over it, on the page's ground: wrapping the arriving page in a box to run `arrived` on it would put a box round it that the section layouts' flex columns would feel. The same keyframe (`list-frame-fade-in`) runs backwards.
- **Reduced motion** follows `arrived`: it shows the new content at once, so the overlay is `display: none` and nothing fades.
