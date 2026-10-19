# CovenBody

`src/components/CovenBody/` — the frame under the coven's context row, and
the one place a coven switch or section move draws its wait (M12.33). The
`[slug]` layout puts it where it had a bare `<div className="coven-layout">`;
the class and its styling are unchanged.

## Props

`CovenBodyProps` (`types.ts`): `children`, the coven's page.

## Contracts

- **At rest, or while a navigation aimed at `region: 'main'` or at no region
  is on its way, it renders the children as they were.**
- **While a `region: 'coven'` navigation is on its way, the page is taken
  away at once** and `<Skeleton shape={target.shape} />` stands in its place,
  with no dimming. Nobody can act on the wrong coven's data in the wait. The
  shape is the destination section's (`cards` for Ingredients, `table` for
  the people pages, `page` for the coven's home), worked out by
  `WorkspaceSwitcher` when the navigation starts.
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

`Shell / Coven Body`: `AtRest`.
