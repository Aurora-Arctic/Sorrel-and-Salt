# WorkspaceSwitcher

`src/components/WorkspaceSwitcher/` — a select of the workspaces the viewer
belongs to (Story 8, M6.9). It is `ComboboxSelect` ([`combobox.md`](combobox.md),
"The select-only box"), so the keyboard (arrows, Enter, Escape, type-ahead) and
the ARIA come from Downshift. It is a client component. On screen the word is
_coven_: the box is named "Coven", its placeholder is "Choose a coven", and its
create choice "Create Coven"; code and these docs say workspace.

## Props

`workspaces`: `SwitcherWorkspace[]`, every workspace the viewer is a member of,
in the order to list them. Each is `{ slug, name, canReadMembers, canInvite }`:
the two flags say what the viewer's role there may open (member: read, and
member: invite, an owner's alone), so the switcher can step back from a people
page the next coven would 404. The caller already holds the memberships (the
coven layout, M6.10; the shell, MB.7, which reads the flags from `rolePermits`
in `viewerOf`), so the component fetches nothing.

`canCreate`: whether the viewer holds `canCreateWorkspace`, which the caller
reads from the user row, never from the session. When true, the list ends
with a Create Coven choice (M9.16). It defaults to false.

## Contracts

- **The current workspace is read from the address, never kept.** The value is
  `covenSlugOf(usePathname())` (`src/lib/coven-path.ts`). Nothing is stored in
  session, cookie or local state, so two tabs in two workspaces cannot disagree
  through it. Outside `/coven/…` the box shows "Choose a coven".
- **A choice keeps the page when the page exists in the other workspace**
  (M9.12, the owner's call, 2026-10-21). `pathInCoven(pathname, slug, options)`
  decides, in this order:
  - at the index, or outside a workspace, the new workspace's index;
  - the invitations page without `canInvite` goes to the members page beside
    it when `canReadMembers`, otherwise to the index; members, or invitations,
    without `canReadMembers` goes to the index;
  - a page the page itself vouched for (`opens`, below) keeps its whole path:
    `/coven/a/ingredients/x` goes to `/coven/b/ingredients/x`;
  - anything else keeps the first segment after the slug:
    `/coven/a/ingredients/x` goes to `/coven/b/ingredients`, since what lies
    beneath a section belongs to the workspace it was opened in and would be a
    404 in the next.
    The static pages (the index, ingredients, members, invitations) are decided
    from the address and the flags alone.
- **A row-bound page says where it opens, through `CovenSwitchTargets`.** The
  coven layout holds the switcher and cannot see the page beneath it, and the
  address cannot say which covens an entry opens in. An ingredient's page
  calls `covensOpeningEntry` ([`../modules.md`](../modules.md), the ingredients
  module) and renders `<CovenSwitchTargets path slugs />`
  (`src/components/CovenSwitchTargets/`), which writes `{ path, slugs }` into
  the `CovenSwitchProvider` the layout wraps its children in. The switcher
  reads it and passes `slugs` as `opens`. A live compendium entry opens in every
  coven the viewer is in, held or not; a retired one only where a live
  cupboard row names it; a coven's own entry in that coven alone. The
  registration is believed only when its `path` equals the current pathname, so
  a registration left over from a page the viewer has left is ignored, and the
  component clears it when it unmounts. With nothing registered, or no
  provider (stories, tests), only the section is kept. The service reads the
  viewer's memberships each request and caches nothing (rule 6).
- **Create Coven goes to the create page.** Its value is
  `NEW_COVEN_PATH`, `/coven/new`, which no slug can equal because a slug
  holds no slash. Choosing it goes there rather than to a section. On that
  page the box shows "Choose a coven", since `covenSlugOf` reads `new` as
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
  - when the new coven renders, focus returns to the switcher. The `[slug]`
    layout remounts, so a module-level slug set when the switch starts is read
    once by the next switcher to mount, which takes focus only if the address
    is that coven's. A refused switch clears it, and so does a superseded one:
    the next switcher to mount elsewhere finds a slug that is not its coven's
    and drops it. That focus
    returns here is a judgement, checked in the design review;
  - choosing Create Coven aims at the `main` region with a `form` shape, since
    that page sits outside a coven, and does not set the focus flag.
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
(`cards` Ingredients, `table` the people pages, `page` the home); `SectionBody`
draws that skeleton in place of the old page (`section-body.md`). The pick is
held in state and shown as the value, and the box is `busy` (`aria-busy`, and
a spinner after the delay), until the navigation settles. Create Coven targets
`{ region: 'main', shape: 'form' }`.

Focus: the `[slug]` layout remounts on a switch, so the box that held the
focus is gone. A module-level slug, set when another coven is picked and read
once by the next switcher to mount, focuses the new box when the address is
that coven's. A switcher that is still mounted when the move ends (a failure)
clears it instead, and one that mounts at any other address drops it unused, so
a switch superseded by another click cannot steal focus later.

## Stories

`index.stories.tsx`, titled "Coven / Coven Switcher": `States`, a grid of In Workspace, Outside Workspace and Can Create. The workshop's
router goes nowhere, so a choice only closes the list.

## Testing

`tests/components/WorkspaceSwitcher/index.test.tsx` covers the list, the page kept
or not by a registration (and a stale one ignored), the value
read from the address (and following it), the destination on a click and on the
keyboard, and the Create Coven choice: shown only with `canCreate`, going
to the create page from a click or the keyboard; `tests/lib/coven-path.test.ts` the two path helpers;
`tests/components/CovenSwitchTargets/index.test.tsx` the registration and its
clearing; `tests/modules/ingredients/services/covens-opening-entry.test.ts` which
covens an entry opens in (live, retired, own, by direct id, an admin);
`tests/e2e/coven-switcher.spec.ts` the walk through the real layout. Axe is asserted
in Playwright once a `/coven` page renders the switcher (M6.10, MB.7).

## What the switcher is

The switcher is a select over the viewer's workspaces, called covens on screen. Which one is current is read off the address and never kept in state, so two tabs in two workspaces do not interfere. Choosing another goes to the same page there when the page said it opens there, otherwise to the same section. The list is the caller's, since the layout already holds the memberships. A viewer holding creation rights gets one more choice, after the workspaces, that goes to the create page. Its value is that page's path, which no slug can equal since a slug holds no slash. While the switch is on its way the box shows the pick, the one thing held in state, and is busy, and the coven's body draws the destination's skeleton.

## Keeping the focus across the switch

The `[slug]` layout, and with it the switcher, remounts when the coven changes, and the focus that was on the box would drop to the page. A module variable is set when a switch to another coven starts and read once by the next switcher to mount. A module variable survives the remount as component state cannot, and unlike `sessionStorage` it dies with the page, so a reload never refocuses. A switch that ends without a remount (a refusal) clears it.

The variable holds the slug of the coven picked, not a bare yes. A superseded switch (Compendium clicked mid-switch) leaves its slug behind, and a switcher that mounts anywhere but that coven reads it as stale, clears it and takes no focus.

## The name as the context row's lead

The chosen name is set as the context row's lead: the display face with a chevron inside a hairline border, so the row reads "Whitethorn Coven" and the name is also the control. The Combobox's select is restyled from `index.scss` rather than given a variant, since every part of it is reached by its own class, and the compound `.input.combobox__control` is outweighed by one more class. It looks the same on a phone as on a desktop. A long name wraps to two lines rather than being cut.
