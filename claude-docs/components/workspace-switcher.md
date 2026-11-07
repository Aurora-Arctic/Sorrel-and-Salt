# WorkspaceSwitcher

`src/components/WorkspaceSwitcher/` is a select of the workspaces the viewer belongs to. It is a client component built on `ComboboxSelect` ([`combobox.md`](combobox.md), "The select-only box"), so the keyboard and the ARIA come from Downshift. On screen the word is _coven_: the box is named "Coven", its placeholder is "Choose a coven" and its create choice is "Create Coven". Code and these docs say workspace. It is the lead of the shell's context row ([`context-row.md`](context-row.md)).

## Contracts

- **The caller holds the list; the component fetches nothing.** `workspaces` is every workspace the viewer is a member of, in the order to list them (alphabetical, the demo coven last), because the coven layout and the shell already hold the memberships. The destination still asserts membership itself, so a stale list shows a 404, not data.
- **`canReadMembers` and `canInvite` say what the viewer's role there may open** (member: read, and member: invite, a steward's alone), so the switcher can step back from a people page the next coven would 404. The shell reads them from `rolePermits` in `viewerOf`, which reads both false for a paused coven.
- **A paused coven's row has a second line** saying when the pause ends, read as part of its name. It stays pickable, and a pick goes straight to `/coven-paused/[slug]` with that page's skeleton (a `form` on a panel, as Create Coven's). The coven layout would send the viewer there anyway; going direct skips the hop and draws the right skeleton rather than the coven's.
- **`canCreate` is read from the user row, never the session**, and defaults to false. When true, the list ends with a Create Coven choice. Hiding the choice from an observer without the right is presentation: the creation service is the gate ([`create-workspace-form.md`](create-workspace-form.md)).
- **The current workspace is read from the address, never kept.** The value is `covenSlugOf(usePathname())` (`src/lib/coven-path.ts`). Nothing is stored in session, cookie or local state, so two tabs in two workspaces cannot disagree through it. On `/coven-paused/<slug>` the value is that coven (`pausedCovenSlugOf`, `src/lib/access-paused.ts`), and a choice goes to the chosen coven's home. Anywhere else outside `/coven/…` the box shows "Choose a coven".
- **A choice keeps the page when the page exists in the other workspace.** `pathInCoven(pathname, slug, options)` decides, in this order:
  - at the index, or outside a workspace, the new workspace's index;
  - the invitations page without `canInvite` goes to the members page beside it when `canReadMembers`, otherwise to the index; members, or invitations, without `canReadMembers` goes to the index;
  - a page the page itself vouched for (`opens`, below) keeps its whole path: `/coven/a/ingredients/x` goes to `/coven/b/ingredients/x`;
  - anything else keeps the first segment after the slug: `/coven/a/ingredients/x` goes to `/coven/b/ingredients`, since what lies beneath a section belongs to the workspace it was opened in and would be a 404 in the next.

  The static pages (the index, ingredients, members, invitations) are decided from the address and the flags alone.

- **A row-bound page says where it opens, through `CovenSwitchTargets`.** The coven layout holds the switcher and cannot see the page beneath it, and the address cannot say which covens an entry opens in. An ingredient's page calls `covensOpeningEntry` ([`../modules.md`](../modules.md), the ingredients module) and renders `<CovenSwitchTargets path slugs />` (`src/components/CovenSwitchTargets/`), which writes `{ path, slugs }` into the `CovenSwitchProvider` the layout wraps its children in. The switcher passes `slugs` as `opens`.
  - A live compendium entry opens in every coven the viewer is in, held or not; a retired one only where a live cupboard row names it; a coven's own entry in that coven alone.
  - The registration is believed only when its `path` equals the current pathname, so one left over from a page the viewer has left is ignored, and the component clears it when it unmounts. With nothing registered, or no provider (stories, tests), only the section is kept.
  - The service reads the viewer's memberships each request and caches nothing (rule 6).
- **Create Coven goes to the create page.** Its value is `NEW_COVEN_PATH`, `/coven/new`, which no slug can equal because a slug holds no slash. On that page the box shows "Choose a coven", since `covenSlugOf` reads `new` as no workspace.
- **A choice is a pending navigation, not a jump** ([`../loading.md`](../loading.md), "The coven switch"). It goes through `usePendingNavigation` (`src/lib/navigation/`) with a `coven` target whose skeleton shape is the destination section's (`cards` Ingredients, `table` the people pages, `page` the home), so:
  - the box shows the picked coven's name, held in state, with a spinner after the delay and `aria-busy`, through `ComboboxSelect`'s `busy` prop, until the navigation settles;
  - the old coven's page goes away at once and `SectionBody` draws the destination's skeleton in its place ([`section-body.md`](section-body.md)), with no dimming, so nobody acts on the wrong coven's data;
  - the page bar shows under the global bar;
  - Create Coven targets `{ region: 'main', shape: 'form' }`, since that page sits outside a coven, and does not set the focus flag.
- **Focus returns to the switcher when the new coven renders.** The `[slug]` layout, and the switcher with it, remounts on a switch, and the focus that was on the box would drop to the page. A module-level variable is set when a switch to another coven starts and read once by the next switcher to mount. It survives the remount as component state cannot, and unlike `sessionStorage` it dies with the page, so a reload never refocuses.
  - It holds the slug of the coven picked, not a bare yes. The new box takes focus only if the address is that coven's.
  - A switcher still mounted when the move ends (a refusal) clears it. A superseded switch (Compendium clicked mid-switch) leaves its slug behind, and a switcher that mounts at any other address reads it as stale, clears it and takes no focus.
  - That focus returns here is a judgement, checked in the design review.
- **The route is cast to `Route`**: `typedRoutes` has no `/coven/…` page for it.
- **The demo coven reads as its name alone**; the Demo badge sits in the coven page heading.

## Styling

`index.scss` restyles the select from the `.workspace-switcher` wrapper so it reads as the context row's name: the chosen name is set as an h4 is (`heading-face`, `heading-size(4)`, [`styling.md`](../styling.md), "Type") and wraps rather than being cut. Every part of `ComboboxSelect` has its own class and the compound `.input.combobox__control` is outweighed by one more class, so no Combobox variant is needed. `$switcher-min-width` (12rem) keeps a short name reading as a control; `$switcher-list-min-width` (15rem) lets the open list be wider than a short chosen name.

## Not here

Stories, `index.stories.tsx` ("Coven / Coven Switcher"): `States`. The workshop's router goes nowhere, so a choice only closes the list. Tests: `tests/components/WorkspaceSwitcher/index.test.tsx`, `tests/components/CovenSwitchTargets/index.test.tsx`, `tests/lib/coven-path.test.ts`, `tests/modules/ingredients/services/covens-opening-entry.test.ts` and `tests/e2e/coven-switcher.spec.ts`.
