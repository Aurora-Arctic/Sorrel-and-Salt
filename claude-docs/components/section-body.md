# SectionBody

`src/components/SectionBody/` — the frame under a section's context row, and
the one place a move inside that section draws its wait (M12.33). Two
layouts use it, and each keeps its context row and nav standing while only
the page below changes:

- the coven's `[slug]` layout, `region="coven"` with `className="coven-layout"`,
  where it had a bare `<div>`;
- the `/curator` and `/keepers` layouts, `region="admin"` with `className="page-column"`.

The classes and their styling are unchanged.

## Props

`SectionBodyProps` (`types.ts`): `region` (`coven` or `admin`, the host this body is: it draws the registry entries that name it), `className` (the frame's class) and `children`, the
section's page.

## Contracts

- **When the wait ends, the skeleton fades out over the arrived page** rather than vanishing: it is kept for 200ms as an `aria-hidden`, absolutely placed overlay on the section frame (which takes the `skeleton-fade-host` class), then unmounts. See [`SkeletonFade`](skeleton-fade.md).

- **At rest, or while a navigation is on its way that another body draws (or none: a refresh, the
  same address, an address no page answers), it renders the children as they were.**
- **While a navigation to a page of its own section is on its way, the page is
  hidden and put out of reach at once** (`visibility: hidden`, `inert`,
  `aria-hidden`) and the destination's skeleton, chosen by its address from the registry
  (`skeletonFor`, [`loading.md`](../loading.md)), stands over it, with no dimming. The page stays
  mounted at its full height inside the section frame, so its flex column and gap are untouched, and
  the skeleton is laid over it in a copy of that frame, pinned under the bar
  ([`SkeletonFade`](skeleton-fade.md), "The page is held, not swapped"; MB.271). Nobody can act on the
  wrong coven's data in the wait. A coven body draws only for a destination in the same coven slug,
  and an admin body only for one in the same area.
- **The context row is not inside it.** A move between admin pages, or
  between a coven's sections, leaves the row and its nav on screen. Only a
  skeleton the registry gives to `main` (a page outside this section) replaces the row too
  (`MainBody`). A section body whose section is not standing for the address draws nothing, and
  `MainBody` draws the whole frame.
- **The skeleton sits inside a `<main>`.** The pages own their landmark, so
  without one here the page would have none for the length of the wait, and
  axe's one-main rule would fail.
- **It holds a visually hidden `<h1>Loading</h1>`.** The skeleton replaced the
  page's own `h1`, and axe's page-has-heading-one rule failed during every
  wait. The owner decided on 2026-10-19 to keep it, so a screen reader hears
  both this heading and the skeleton's `<output>` "Loading" status.
- A `loading.tsx` would be wrong here: a route boundary turns the guards'
  404, 403 and 308 responses into 200s, so the wait is read from the
  navigation provider's state instead (`navigation-bar.md`).

## The switcher after the switch

The `[slug]` layout remounts when the coven changes, taking the switcher with
it, so the focus it held would drop to the page. `WorkspaceSwitcher` keeps a
module-level flag, set on a pick of another coven and read once by the next
switcher to mount, which focuses its box. See `workspace-switcher.md`.

## Stories

`Shell / Section Body`: `States`, with a control that chooses Loading List, Loading List With Action, Loading Tabs, Loading With Menu, Loading Entry and Loading Contents. The states draw the wait with a title and filter, with the tab row, and with the contents menu.

## The frame under a context row

The section body is the frame under a section's context row, the coven's or the admin area's. While a navigation to a page of this section is on its way, the old page is hidden and put out of reach at once, so nobody acts on the wrong coven's data, and the destination's skeleton stands over it. The context row above it, with the section's nav, is outside this frame and stays.

It is not a dimmed page and not a `loading.tsx`: a boundary would turn the guards' 404 and 403 into 200s. The pages own their `<main>`, so the skeleton brings one, and a hidden level-one heading, so neither landmark vanishes for the length of the wait.
