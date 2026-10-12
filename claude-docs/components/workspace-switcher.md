# WorkspaceSwitcher

`src/components/WorkspaceSwitcher/` — a select of the workspaces the viewer
belongs to (Story 8, M6.9). It is `ComboboxSelect` ([`combobox.md`](combobox.md),
"The select-only box"), so the keyboard (arrows, Enter, Escape, type-ahead) and
the ARIA come from Downshift. It is a client component. On screen the word is
_coven_: the box is named "Coven", its placeholder is "Select Coven", and its
create choice "Create Coven"; code and these docs say workspace.

## Props

`workspaces`: `{ slug, name }[]`, every workspace the viewer is a member of, in
the order to list them. The caller already holds the memberships (the coven
layout, M6.10; the shell, MB.7), so the component fetches nothing.

`canCreate`: whether the viewer holds `canCreateWorkspace`, which the caller
reads from the user row, never from the session. When true, the list ends
with a Create Coven choice (M9.16). It defaults to false.

## Contracts

- **The current workspace is read from the address, never kept.** The value is
  `covenSlugOf(usePathname())` (`src/lib/coven-path.ts`). Nothing is stored in
  session, cookie or local state, so two tabs in two workspaces cannot disagree
  through it. Outside `/coven/…` the box shows "Select Coven".
- **A choice goes to the same section in the other workspace.**
  `pathInCoven` keeps the first segment after the slug: `/coven/a/ingredients/x`
  goes to `/coven/b/ingredients`. What lies beneath a section belongs to the
  workspace it was opened in, and would be a 404 in the next. At the index, or
  outside a workspace, it goes to the new workspace's index.
- **Create Coven goes to the create page.** Its value is
  `NEW_COVEN_PATH`, `/coven/new`, which no slug can equal because a slug
  holds no slash. Choosing it goes there rather than to a section. On that
  page the box shows "Select Coven", since `covenSlugOf` reads `new` as
  no workspace. Hiding the choice from a viewer without the right is
  presentation: the creation service is the gate
  ([`create-workspace-form.md`](create-workspace-form.md)).
- **Only the viewer's own workspaces are listed**, which is the caller's
  concern; the component trusts its list. The destination still asserts
  membership itself (M6.10), so a stale list shows a 404, not data.
- **The route is cast to `Route`**: `typedRoutes` has no `/coven/…` page until
  M6.10 lands.

## Styling

The switcher is the lead of the shell's context row (MB.7,
[`context-row.md`](context-row.md)), so `index.scss` restyles the select from
the `.workspace-switcher` wrapper so it reads as the row's name. Every part of
`ComboboxSelect` has its own class and the compound `.input.combobox__control`
is outweighed by one more class, so no Combobox variant was needed.

- The chosen name in `$font-heading`, 1.5rem, weight 700; a `$hairline` border,
  `radius('control')`, a transparent ground, `$fill-quiet` on hover, the border
  in `$text-primary` while open (a change of weight, not of hue); at least
  `$control-height` tall; the chevron on the right.
- A long name wraps (`white-space: normal`) rather than being cut. **At or under
  `$shell-phone-width` the control fills the row's width** and is otherwise the
  same as on a desktop (the owner's call).
- The list opens below at `layer('floating')`, at least 15rem wide. The one
  addition to Combobox is an optional `create` flag on a choice
  (`ComboboxChoice`): its row is set off by a hairline rule and led by a plus.
  Create Coven is the only choice that sets it.

## Stories

`index.stories.tsx`: `InWorkspace`, `OutsideWorkspace`, `CanCreate`, `Phone`. The workshop's
router goes nowhere, so a choice only closes the list.

## Testing

`tests/components/WorkspaceSwitcher/index.test.tsx` covers the list, the value
read from the address (and following it), the destination on a click and on the
keyboard, and the Create Coven choice: shown only with `canCreate`, going
to the create page from a click or the keyboard; `tests/lib/coven-path.test.ts` the two path helpers. Axe is asserted
in Playwright once a `/coven` page renders the switcher (M6.10, MB.7).
