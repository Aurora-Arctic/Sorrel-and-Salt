# SectionBody

`src/components/SectionBody/` — the frame under a section's context row, and
the one place a move inside that section draws its wait. Two
layouts use it, and each keeps its context row and nav standing while only
the page below changes:

- the coven's `[slug]` layout, `region="coven"` with `className="coven-layout"`;
- the `/curator` and `/keepers` layouts, `region="admin"` with `className="page-column"`.

`region` is the host this body is: it draws the registry entries that name it ([`loading.md`](../loading.md), "How a skeleton is chosen").

## Contracts

- **When the wait ends, the skeleton fades out over the arrived page** rather than vanishing: it is kept for 200ms as an `aria-hidden`, absolutely placed overlay on the section frame (which takes the `skeleton-fade-host` class), then unmounts. See [`SkeletonFade`](skeleton.md#skeleton-fade).
- **At rest, or while a navigation is on its way that another body draws (or none: a refresh, the same address, an address no page answers), it renders the children as they were.**
- **While a navigation to a page of its own section is on its way, the page is hidden and put out of reach at once** (`visibility: hidden`, `inert`, `aria-hidden`) and the destination's skeleton, chosen by its address from the registry (`skeletonFor`), stands over it, with no dimming. The page stays mounted at its full height inside the section frame, so its flex column and gap are untouched, and the skeleton is laid over it in a copy of that frame, pinned under the bar ([`SkeletonFade`](skeleton.md#skeleton-fade), "The page is held, not swapped"). Nobody can act on the wrong coven's data in the wait. A coven body draws for a destination in any coven (a switch keeps the header and switcher up and busy), and an admin body only for one in the same area (`curator` or `keepers`).
- **The context row is not inside it.** Only a skeleton the registry gives to `main` (a page outside this section) replaces the row too (`MainBody`). A section body whose section is not standing for the address draws nothing, and `MainBody` draws the whole frame.
- **The skeleton sits inside a `<main>`.** The pages own their landmark, so without one here the page would have none for the length of the wait, and axe's one-main rule would fail.
- **It holds one visually hidden `<output>` "Loading" and no heading.** Every skeleton draws its page's own `PageHeader` `h1`, so the wait still has one level-one heading (`tests/guards/skeleton-heading.test.tsx`).
- A `loading.tsx` would be wrong here: a route boundary turns the guards'
  404, 403 and 308 responses into 200s, so the wait is read from the
  navigation provider's state instead (`navigation-bar.md`).

## The switcher after the switch

The `[slug]` layout remounts when the coven changes, taking the switcher with
it, so the focus it held would drop to the page. `WorkspaceSwitcher` keeps a
module-level flag, set on a pick of another coven and read once by the next
switcher to mount, which focuses its box. See `workspace-switcher.md`.
