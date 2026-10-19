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
- **A choice is a pending navigation, not a jump** ([`../loading.md`](../loading.md),
  "The coven switch"). The choice goes through `usePendingNavigation`
  (`src/lib/navigation/`) with a `coven` target whose skeleton shape is the
  destination section's, so:
  - the box shows the picked coven's name with a spinner and `aria-busy`,
    through `ComboboxSelect`'s `busy` prop;
  - the old coven's page goes away at once and the destination section's
    skeleton takes its place, with no dimming, so nobody acts on the wrong
    coven's data;
  - the page bar shows under the global bar;
  - when the new coven renders, focus returns to the switcher (the plan's own
    inference, checked in the design review).
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

- **The chosen name is set as an h4 is**: `@include heading-face` (the
  display family, weight 700, letter-spaced 0.01em) and `heading-size(4)`,
  1.5rem ([`styling.md`](../styling.md), "Type"). Its line height is its own,
  1.1 rather than the h4's 1.25, so a long name that wraps sets its two lines
  close inside the control's box.
- **The box keeps `.input`'s shape and changes its look.** Its corners,
  `radius('control')`, come from the `field-box` mixin that `.input` includes;
  the switcher sets no radius of its own. Over that it lays a `$hairline`
  border, a transparent ground, `$fill-quiet` on hover, and the border in
  `$text-primary` while open (a change of weight, not of hue). It is at least
  `$control-height` tall, with the chevron on the right.
- **Two widths are named at the head of `index.scss`**:
  `$switcher-min-width`, 12rem, the closed box's narrowest, so a short name
  still reads as a control; and `$switcher-list-min-width`, 15rem, the open
  list's narrowest, so the list can be wider than a short chosen name. MB.124
  weighs both against the account menu's 13rem for one floating-panel width.
- A long name wraps (`white-space: normal`) rather than being cut. **At or under
  `$shell-phone-width` the control fills the row's width** and is otherwise the
  same as on a desktop (the owner's call).
- The list opens below at `layer('floating')`. The one
  addition to Combobox is an optional `create` flag on a choice
  (`ComboboxChoice`): its row is set off by a hairline rule and led by a plus.
  Create Coven is the only choice that sets it.

## While a switch is on its way (M12.33)

The switcher goes through `usePendingNavigation` with the target
`{ region: 'coven', shape }`, the shape being the destination section's
(`cards` Ingredients, `table` the people pages, `page` the home); `CovenBody`
draws that skeleton in place of the old page (`coven-body.md`). The pick is
held in state and shown as the value, and the box is `busy` (`aria-busy`, and
a spinner after the delay), until the navigation settles. Create Coven targets
`{ region: 'main', shape: 'form' }`.

Focus: the `[slug]` layout remounts on a switch, so the box that held the
focus is gone. A module-level flag, set when another coven is picked and read
once by the next switcher to mount, focuses the new box. A switcher that is
still mounted when the move ends (a failure) clears it instead.

## Stories

`index.stories.tsx`, titled "Coven / Coven Switcher": `InWorkspace`, `OutsideWorkspace`, `CanCreate`, `Phone`. The workshop's
router goes nowhere, so a choice only closes the list.

## Testing

`tests/components/WorkspaceSwitcher/index.test.tsx` covers the list, the value
read from the address (and following it), the destination on a click and on the
keyboard, and the Create Coven choice: shown only with `canCreate`, going
to the create page from a click or the keyboard; `tests/lib/coven-path.test.ts` the two path helpers. Axe is asserted
in Playwright once a `/coven` page renders the switcher (M6.10, MB.7).
