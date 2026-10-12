# WorkspaceSwitcher

`src/components/WorkspaceSwitcher/` — a select of the workspaces the viewer
belongs to (Story 8, M6.9). It is `ComboboxSelect` ([`combobox.md`](combobox.md),
"The select-only box"), so the keyboard (arrows, Enter, Escape, type-ahead) and
the ARIA come from Downshift. It is a client component.

## Props

`workspaces`: `{ slug, name }[]`, every workspace the viewer is a member of, in
the order to list them. The caller already holds the memberships (the coven
layout, M6.10; the shell, MB.7), so the component fetches nothing.

`canCreate`: whether the viewer holds `canCreateWorkspace`, which the caller
reads from the user row, never from the session. When true, the list ends
with a Create Workspace choice (M9.16). It defaults to false.

## Contracts

- **The current workspace is read from the address, never kept.** The value is
  `covenSlugOf(usePathname())` (`src/lib/coven-path.ts`). Nothing is stored in
  session, cookie or local state, so two tabs in two workspaces cannot disagree
  through it. Outside `/coven/…` the box shows "Select Workspace".
- **A choice goes to the same section in the other workspace.**
  `pathInCoven` keeps the first segment after the slug: `/coven/a/ingredients/x`
  goes to `/coven/b/ingredients`. What lies beneath a section belongs to the
  workspace it was opened in, and would be a 404 in the next. At the index, or
  outside a workspace, it goes to the new workspace's index.
- **Create Workspace goes to the create page.** Its value is
  `NEW_COVEN_PATH`, `/coven/new`, which no slug can equal because a slug
  holds no slash. Choosing it goes there rather than to a section. On that
  page the box shows "Select Workspace", since `covenSlugOf` reads `new` as
  no workspace. Hiding the choice from a viewer without the right is
  presentation: the creation service is the gate
  ([`create-workspace-form.md`](create-workspace-form.md)).
- **Only the viewer's own workspaces are listed**, which is the caller's
  concern; the component trusts its list. The destination still asserts
  membership itself (M6.10), so a stale list shows a 404, not data.
- **The route is cast to `Route`**: `typedRoutes` has no `/coven/…` page until
  M6.10 lands.

## Styling

`index.scss` sets a minimum width only; the section's look is MB.115's design
review.

## Stories

`index.stories.tsx`: `InWorkspace`, `OutsideWorkspace`, `CanCreate`, `Phone`. The workshop's
router goes nowhere, so a choice only closes the list.

## Testing

`tests/components/WorkspaceSwitcher/index.test.tsx` covers the list, the value
read from the address (and following it), the destination on a click and on the
keyboard, and the Create Workspace choice: shown only with `canCreate`, going
to the create page from a click or the keyboard; `tests/lib/coven-path.test.ts` the two path helpers. Axe is asserted
in Playwright once a `/coven` page renders the switcher (M6.10, MB.7).
