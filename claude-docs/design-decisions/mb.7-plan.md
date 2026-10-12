<!-- The approved plan for MB.7 with MB.122 folded in, copied from the plan file the owner approved on 2026-10-12, stored beside the record it led to (mb.7-navigation.md). It is how the decisions were reached and is not maintained after the PR lands. -->

# MB.7 + MB.122 — The application nav shell, designed and built as one task

## Context

MB.7 builds `AppShell`, the nav frame around every signed-in page. MB.122 was minted to design that nav once MB.7 built it. The owner has asked that the two be folded together: the shell is designed and built in one task, with three nav options presented first as an artifact for the owner to pick from. This plan covers (1) the artifact, (2) the fold in the task docs and on the board, and (3) the build that follows the owner's pick.

Nothing in `src/app` renders a site header, an account menu or an Admin entry today. `WorkspaceSwitcher` is mounted nowhere. The theme toggle sits in a fixed corner over page headings at 375px. There is no menu, popover or dropdown primitive, and no z-index map.

## What the nav has to hold (the inventory)

| Tier            | Items                                                                                                                                                                                                                                                                            | Source                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Utility         | Brand (home = `/admin` for an admin, `/coven` for everyone else; an admin reaches a coven of their own through the switcher, which lists it; the post-sign-in landing rule is untouched), account disclosure (Your Account, Sign Out), theme toggle, later Report a Bug (MB.176) | MB.7, mb.57, MB.116 handoff                    |
| Primary         | Workspace switcher (+ Create Workspace when `canCreateWorkspace`), Compendium (`/compendium`, public), Admin (admins only), the place for Add Ingredient and Edit Ingredient (two real buttons, disabled until M8.16/M8.17, the M9.15 precedent)                                 | MB.7, DESIGN §9 line 1258                      |
| Section (local) | Coven: Overview, Ingredients, Grimoire, Members (role-gated). Admin: Compendium, Categories, Forms, Deities, Astrology, People, grouped Compendium / People                                                                                                                      | `CovenNav/sections.ts`, `AdminNav/sections.ts` |
| Tabs            | The admin tabbed pages' segmented control (unchanged in every option)                                                                                                                                                                                                            | `components/tabbed-page.md`                    |

Outside the shell and unchanged: the impersonation banner (above everything, `$top-inset`), `/`, `/sign-in`, `/invite/[token]`, and the public compendium frame (MB.83's client island later renders the shell's chrome from `me`).

Hard constraints every option meets: workspace lives in the URL, not the session; `canCreateWorkspace` comes from the user row, never the session; an unverified account reaches only `/account/email`; `/admin` 403 is a styled page, `/coven/[slug]` non-member is 404; `.admin-layout` tables need the 80rem column (MB.115's owner call); tokens only, both themes, 375px with no sideways scroll, axe clean, keyboard operable; `aria-current` plus shape, never hue alone.

## Research findings that shape the options

- **Visible beats hidden.** NN/g's 179-participant study: hidden (hamburger) nav cost over 20% discoverability, 39% slower on desktop, 15% on mobile, 21% higher perceived difficulty. Recommendation: never hide top-level nav on desktop; on mobile show up to 4 links visibly, hide some only past that. Our primary tier is 3 links plus the switcher, so it can stay visible everywhere.
- **Local nav shapes.** NN/g: inverted-L (top global + left local), horizontal second row (compact, fine for 2–3 tiers), or embedded vertical. Local nav must read as beneath global, never more salient. Breadcrumbs only past two levels, which we do not have.
- **Utilities belong in the top bar, not a sidebar** (Cloudscape service navigation). The switcher answers "which tenant am I in?", the account menu "who am I?"; keep them separate controls (saasui workspace-switcher patterns). The switcher sits top-left and always shows the current workspace.
- **Disclosure, not `role=menu`.** APG recommends the disclosure navigation pattern (button + `aria-expanded` + `aria-controls`, links inside) for site nav; the menu role expects widget keyboarding users do not want here. Multiple `nav` landmarks each need a distinct `aria-label`.
- **Mobile.** Thumb-zone research (75% one-thumb use) favours bottom placement; tab bars were found in 86% of cases against 57% for hamburgers (Smashing, citing Nielsen). Priority+ (Frost) shows the first items and tucks the rest behind More, teaching the user what the row is.
- **Precedents.** GitHub 2023: slim global bar, context shown as breadcrumbs, local nav as underline tabs under the context header, built on Primer with assistive-tech testing. Atlassian: top bar for site-wide actions (create, switch, utilities) and settings under the avatar; sidebar for working inside a project. Primer `UnderlineNav`: a labelled `nav` with `aria-current`, scrolling with arrow buttons on narrow screens.

Sources to cite in the artifact: nngroup.com/articles/hamburger-menus, nngroup.com/articles/local-navigation, w3.org APG disclosure-navigation example, cloudscape.design service-navigation pattern, saasui.design workspace-switcher patterns, smashingmagazine.com 2019 bottom-navigation, bradfrost.com Priority+, github.blog 2023-06-15 redesigned navigation, primer.style UnderlineNav, Atlassian navigation guide.

## The artifact: rendered examples to view, not prose

One published HTML page, built after this plan is approved and before any code. Each option is a **working HTML/CSS mock-up** of the shell, drawn in the project's own type and palette (Lexend body, Cormorant Unicase display, parchment and soot grounds, sorrel accent, `space()` steps, `radius('surface')`, the `.link-row` current-page underline), so what the owner sees is close to what would ship. For every option the page shows:

- a **desktop frame** (1280px) and a **phone frame** (375px) side by side;
- a strip of **scenes** that switch the frame's content: the coven Grimoire page as owner A, the admin Categories page as admin E (tiers 2 and 3 together), the account disclosure open, the switcher open with Create Workspace listed, and the unverified account's reduced shell;
- the page's own **light/dark toggle**, so both themes are checked in one place;
- beneath the frames: how the four tiers map, phone behaviour, what changes in the existing components, the accessibility pattern, build cost (labelled estimate) and risks.

A comparison table and a recommendation close the page, with the research sources linked. The mock-ups are static HTML with a little script for the scene strip and theme toggle; nothing fetches or stores anything.

## The three options

### Option A — Stacked bars (global bar over a section row)

- **Desktop.** One sticky global bar: brand mark → `WorkspaceSwitcher` → Compendium → Admin (admins) … right side: Add Ingredient, Edit Ingredient (disabled), theme toggle, account disclosure (name, chevron). Beneath it, inside the content column, the section nav as today's `.link-row` (`CovenNav` or `AdminNav`), then the page. The admin tabbed pages keep their pill segmented control as tier 3.
- **Phone.** Global bar keeps brand mark, switcher, Add, account. Compendium and Admin move into the account disclosure under a "Go To" group (the two least-used links are the ones hidden, within NN/g's "more than 4" rule). `AdminNav`'s `<details>` jump menu stays for its 6 links; `CovenNav`'s 4 links fit as a row.
- **Changes.** `AdminNav` and `CovenNav` as they are; `.admin-layout`/`.coven-layout` lose nothing. New: `AppShell`, `AccountMenu` disclosure, `$shell-height`, `$layers`.
- **Fits.** NN/g horizontal local nav (2–3 tiers), Cloudscape utilities-in-top-bar, the 80rem tables keep their width. Lowest cost. Weakness: two stacked rows spend vertical space; two links hidden on phone.

### Option B — Sidebar (inverted-L)

- **Desktop.** A 16rem left column: switcher at the top (Slack/Notion/Linear placement), then the current area's section links as a vertical list (coven's four; admin's six under Compendium / People headings), a rule, then Compendium and Admin as global links. A slim top bar carries brand, Add/Edit, theme toggle and the account disclosure (utilities stay in the top bar per Cloudscape). Collapsible to an icon rail.
- **Phone.** The sidebar becomes an off-canvas drawer opened by a Menu button in the top bar, built on the existing native `<dialog>` modal (focus trap, Escape, inert). Section links visible only inside the drawer.
- **Changes.** `AdminNav` and `CovenNav` re-shaped vertical (their `nav-links.tsx` and SCSS), `.admin-layout`/`.coven-layout` lose their nav slot, new `Sidebar`, `Drawer`, `AppShell`, `AccountMenu`.
- **Fits.** Scales if sections grow; vertical scanning. Weaknesses: 16rem + 80rem = 96rem, so a 1280px window gives tables ~64rem and the user list scrolls inside its frame again (the exact MB.115 complaint); hidden nav on phone (NN/g −20%); the largest rebuild.

### Option C — Context header with tabs, bottom bar on phone

- **Desktop.** The same slim global bar as A (brand, switcher, Compendium, Admin … Add, Edit, theme, account). The section nav is not a second bar but underline tabs attached to a context header inside the column: the workspace name (or "Admin") as the heading with the section tabs beneath it (GitHub repo header, Primer `UnderlineNav`). Admin's six pages become six underline tabs; the Compendium / People grouping survives only on the `/admin` index.
- **Phone.** The section nav becomes a fixed bottom tab bar in the thumb zone: coven's four items fit; admin shows four and a More disclosure (Priority+). The global bar keeps brand, switcher, account; Add sits in the bottom bar's centre. iOS safe-area padding.
- **Changes.** New `UnderlineNav` (replaces both `nav-links.tsx` rows), `BottomBar`, `AppShell`, `AccountMenu`; `AdminNav`'s `<details>` retired. `.coven-layout` gains the context header.
- **Fits.** Best phone ergonomics and the most "app-like"; visible nav on every screen. Weaknesses: on admin pages the underline tabs (tier 2) sit directly above the pill segmented control (tier 3), two tab metaphors stacked, which NN/g warns confuses hierarchy; the bottom bar must coexist with modals and the impersonation banner; two new patterns to build and review.

### Recommendation in the artifact

Option A, because the primary tier is small enough to stay visible, it keeps the 80rem tables and every built nav component, and it is the cheapest to land in Wave 9. Option C's bottom bar is named as the upgrade path if phone use grows; Option B is the one to avoid while admin tables need 80rem.

## Decisions shared by every option (go into the build whichever is picked)

1. **Route group.** `src/app/(shell)/layout.tsx` wraps `account/`, `coven/`, `admin/` (and `ingredients/` when M8.19 builds it) by moving those directories into the group; URLs are unchanged, the root layout stays session-free so public pages stay static. The layout calls `requireSession()`, `getMe(session)` and `membershipsOf(session, [userId])` (both request-cached) and renders `<AppShell viewer workspaces>{children}</AppShell>`.
2. **Chrome takes plain props.** `AppShell` renders `AppShellChrome` with `{ viewer: { name, isAdmin, canCreate, verified }, workspaces }` so MB.83's island can render the same chrome from `me`. No fetching inside the component.
3. **Unverified account.** The shell renders brand and the account disclosure (Sign Out only), no links: every link would redirect back to `/account/email`.
4. **403 inside the shell.** `forbidden()` from the admin layout renders the root `forbidden.tsx` inside the shell layout, so a signed-in non-admin sees the chrome (without an Admin entry) around the not-authorized page. `admin.spec.ts`'s "no admin markup" assertion still holds; verify.
5. **Stale switcher list.** Layouts do not re-run on client navigation, so after `/coven/new` creates a workspace the create form calls `router.refresh()` after its push (M9.16's form, a sub-hour change named in the PR).
6. **Account disclosure** is the APG disclosure navigation pattern: `<button aria-expanded aria-controls>` opening a list with a link to `/account` and the existing `SignOutButton`; Escape and outside-click close; no `role="menu"`. Theme toggle moves into the bar on shell pages; the fixed corner remains only on no-shell pages (`.page-frame` pages outside the shell and the public frame). Resolves MB.116's handoff.
7. **Landmarks.** `<header>` for the bar, `<nav aria-label="Site">` for the primary tier; `CovenNav` keeps "Workspace" and `AdminNav` "Admin". A "Skip to Content" link is the first focusable (WCAG 2.4.1); each page's `main` gets `id="main"`.
8. **Tokens.** `$shell-height`, and a `$layers` map in `_variables.scss` (`shell`, `banner`, `toggle`, `floating`, `dialog`) replacing the raw `z-index: 1` and `2` in the banner and toggle (MB.124's handoff, the part the shell forces). The bar is `position: sticky; top: $top-inset`. `.page-frame` inside the shell subtracts `var(--shell-height)` from its `min-height`.
9. **Current page** marked with `aria-current="page"` and `.link-row`'s weight-and-underline shape. Print hides the shell (M10.22).
10. **Brand link.** The site name at the left of the bar is a link, the "home" click. For an admin it goes to `/admin` (the owner's call, 2026-10-12); for everyone else to `/coven`, the signed-in landing that already routes by membership (into your workspace, the create form, or the invite-only explanation). Not `/`: for a signed-in user the welcome page is prose with one Continue button, a dead end. An admin who holds covens of their own reaches them through the workspace switcher, which lists every workspace they belong to, so the shell mounts the switcher for admins on `/admin` pages too (it shows "Select Workspace" outside `/coven/`). The post-sign-in landing rule (`postSignInLanding`) is not touched; the brand link mirrors it.
11. **Switcher** unchanged: reads the slug from the pathname, shows "Select Workspace" outside `/coven/`, lists Create Workspace when `canCreate`. Admin E in no workspace sees an empty list plus Create Workspace (admins hold the right by CHECK).

## Round two (the owner's review of the first artifact, 2026-10-12)

The owner chose **Option C** ("definitely best"), with A's feedback applied to it, a vertical squeeze, a rebuilt B and one entirely new option (D, the scope breadcrumb: one bar whose first crumb is the switcher merged with the area links, a shell-level section strip beneath). Build hours are no longer a factor ("I really don't care about the time cost"). Decisions that now join the shared list, whichever shape the owner confirms:

12. **No action buttons in the shell.** Edit Ingredient goes (editing lives on the ingredient page); the global Add Ingredient goes too. Each page keeps its own primary action in its page header, where the admin pages already put it (Add Category beside Categories, Add Group on the Groups tab, New Spell on the Grimoire). This corrects DESIGN.md §9's AppShell paragraph ("the global affordances for adding and editing an ingredient from any page"), recorded in `mb.7-navigation.md` and the §9 edit in the build PR; M8.16/M8.17 wire page-header actions, not shell slots.
13. **On-screen copy says Coven.** The switcher's placeholder is "Select Coven" and its create entry "Create Coven" (M9.16's "Create Workspace" label changes in the build PR, a named sub-hour change); `CovenNav`'s landmark label becomes "Coven". Code, schema and docs keep saying workspace (CLAUDE.md vocabulary); the UI copy is the owner's call, noted in the decision record.
14. **The account menu says the name once**, on the button (avatar and name on desktop, avatar alone on a phone). The panel opens on Your Account, then Sign Out; no caption.
15. **The section nav is one component for coven and admin**, with an icon per section (a small inline SVG set, stroke only) and a current state carried by weight and shape, behaving the same on a phone for both areas. `AdminNav`'s `<details>` jump menu goes.
16. **No switcher on admin pages.** The bar shows a "Your Coven" link to `/coven` in its place; on coven pages the switcher shows the current coven. (The brand link stays `/admin` for admins, `/coven` otherwise, decision 10.)
17. **The theme toggle keeps its feel**: the knotwork crescent and sun on the accent disc. The shape may change (the pinned quarter-disc corner kept at the bar's right end, or a round knotwork button in the bar's flow); never a plain glyph or a text row in a menu. `ThemeToggle` gains an inline variant that reuses the facets and the swap.
18. **Dependency found:** `src/app/coven/page.tsx` does not exist. The `/coven` landing (into your coven, the create form, or the invite-only explanation) is **M2.8**, still open on the board (#270). The brand link and Your Coven both point at it, so MB.7 either lands after M2.8 or, if the owner wants the shell first, links a member to their first coven by slug and an admin in no coven to `/coven/new` until M2.8 lands; flag at build time.

## Round three (the mitigation picks, 2026-10-12)

The owner confirmed C and chose, from two drawn versions for each of its six risks:

19. **Risk 1, switcher placement (V1):** on coven pages the context row's name _is_ the switcher (display face, chevron, hairline border); the bar carries no select. On admin pages the same place reads "Admin" as plain text. Drawn for the phone too (52px bar plus a 44.5px context row, 97.5px of shell); whether the phone uses it or keeps the switcher in the bar is still the owner's call.
20. **Risk 2, two tab metaphors (V1, smaller):** the tabbed pages' pills sit on the page-heading line between the heading and its action, 36px tall with 13px text and 12px side padding; each pill's hit area is padded invisibly to 44.5px. The table starts 78px higher than with a pill row of its own.
21. **Risk 3, six admin sections on a phone (V1):** Priority+. The bottom bar shows four and a More disclosure; More takes the hidden current page's name and state.
22. **Risk 4, bottom bar against modals and the banner (V1):** the bar hides while a dialog is open or the keyboard is up; the impersonation banner offsets the top bar only.
23. **Risk 5, More hiding the current page (V1):** More's label and icon become the current page's when that page is one of the hidden ones.
24. **Risk 6, long coven names on a phone (V2, clearer):** a borderless switcher on the quiet fill with a radius, an accent chevron and a 44.5px height; the name in the display face over one or two lines; a hairline ring marks it open.
25. **Add Ingredient returns to the shell as one global button** (replacing decision 12's "no action buttons"): an outline button left of the account button on desktop, a 44.5px plus button between the switcher and the avatar on a phone, absent for an unverified account. Its target follows the area: on a coven page that coven's ingredients, on an admin page the compendium, elsewhere the user's only coven or a choice. Edit Ingredient stays off the shell: it appears wherever an ingredient is shown, never inside a relational field (M8.16/M8.17 own that). DESIGN.md §9 is corrected to say so.
26. **Theme toggle placement (decision 17 settled):** a 32px knotwork disc right of the account button on desktop; a labelled row in the account panel on a phone.

## Sign-off (2026-10-12, the owner)

Option C as drawn in Version 7 is signed off, with three execution adjustments and no further drawing:

27. **The phone shell is Risk 1 Version 1**: a 52px bar (mark, Add Ingredient, avatar) over a 44.5px context row holding the switcher on coven pages or "Admin" on admin pages; the section nav is the bottom bar.
28. **Add Ingredient is a labelled button at every width**, never a bare plus.
29. **The switcher looks the same on a phone as on desktop**: the display-face name with a chevron inside a hairline border (Risk 6 V2's borderless styling is dropped). Long names wrap to two lines.
30. **Until M2.8 lands the shell works out the home link itself**: an admin goes to `/admin`; anyone else to their first coven by slug, to `/coven/new` when they hold none and may create, to `/account` otherwise. Your Coven follows the same rule. M2.8 swaps the href for `/coven`.
31. **Hand-off**: the build runs on `feature/mb.7-app-shell` in `/app` (branched from staging, which now holds M9.16), agents in worktrees; green steps are committed, the branch pushed and the PR opened into staging while the owner sleeps. Board moves are attempted and any blocked `gh` write is handed over.

## The fold: MB.122 into MB.7 (task docs and board)

- `claude-docs/tasks/mb.md`: MB.7's entry gains MB.122's scope paragraph and acceptance criteria (sign-off recorded as an issue comment; no sideways scroll at 375px; 4.5:1 in both themes; no raw hue or size outside `_variables.scss`; every nav marks the current page; phone nav reachable by keyboard and screen reader; section navs read as beneath the shell's nav; each component doc's Styling section and stories updated) and the two "Left by MB.115/MB.116" paragraphs. Hours: the entries sum to 4h; my estimate for shell + design + stories + e2e is 5–6h, labelled an estimate, the owner's to set.
- MB.122's heading becomes `**MB.122 — ~~Design review: the navigation~~** · **RETIRED 2026-10-12, folded into MB.7**` with a blockquote saying why (the review and the build are one piece of work once the design is chosen first), the `tasks-md.mjs` HEADING regex already parses this form.
- `claude-docs/TASKS.md` Wave 9 row drops MB.122; `claude-docs/waves/wave-09.md` line 3 says MB.7 carries its own design review; `claude-docs/components/admin-nav.md`, `coven-nav.md`, `workspace-switcher.md`, `theme-toggle.md` and `styling.md` ("Designing a section", page frame, top inset) lose their "MB.122 settles" deferrals in the build PR.
- Board: `node scripts/task-board.mjs sync MB.7 MB.122`, then MB.122 closed as `not planned` with title `MB.122 — [RETIRED] Design review: the navigation` in the `Retired — not done` milestone. Auto mode blocks `gh` writes, so hand the owner the close command. `reorder` dry-run from a staging checkout holding the row edit.
- Records: `claude-docs/design-decisions/mb.7-plan.md` (this plan) and `mb.7-navigation.md` (the chosen option and why, with the research sources).

## Build outline (after the owner picks)

Sequence: approve this plan → build and publish the artifact → owner picks and signs off (comment on MB.7's issue) → fold the docs and sync → implement.

Branching: the work runs in a worktree under `/home/node/worktrees/`, since `/app` holds M9.16's uncommitted work. MB.7 depends on M9.16 (the switcher's Create Workspace entry and `/coven/new`, both on that branch and not yet on staging), so the worktree's branch `feature/mb.7-app-shell` stacks on `feature/m9.16-create-workspace-form` at its committed tip; the e2e `@story-3` walk through the switcher needs it. The artifact needs no branch; it is built in the scratchpad and published. Lane agents each take their own worktree off `feature/mb.7-app-shell` and message the main session with each commit hash; the main session merges them into that branch. Commit each green step after `pre-commit`, so a rebuild cannot lose the worktrees' work.

Files (Option A shown; B and C swap the section-nav pieces):

- `src/app/(shell)/layout.tsx` (new), moving `src/app/account`, `src/app/coven`, `src/app/admin` under `(shell)`; `src/app/account/email/page.tsx` and `coven/new/page.tsx` drop their "No AppShell exists yet" comments.
- `src/components/AppShell/{index.tsx,chrome.tsx,index.scss,types.ts,index.stories.tsx}`, `src/components/AccountMenu/…`, `src/components/SkipLink/…` (or inside AppShell).
- `src/components/ThemeToggle` gains an inline variant (prop) for the bar; `ImpersonationBanner` and `ThemeToggle` SCSS read `$layers`.
- `src/scss/_variables.scss`: `$shell-height`, `$layers`; `_primitives.scss`: `.page-frame` height inside the shell.
- `src/components/CreateWorkspaceForm`: `router.refresh()` after push.
- `.ladle/` gets a shell frame for stories if the admin frame does not suit.
- Docs: `claude-docs/components/app-shell.md`, `account-menu.md`; updates listed under the fold; DESIGN.md §9 AppShell paragraph gains the account menu and theme toggle sentence.

Tests (role and label queries, state not copy):

- `tests/components/AppShell/index.test.tsx`: Admin link present for `isAdmin`, absent otherwise (precondition asserted); switcher receives `canCreate`; unverified viewer gets Sign Out and no site links; account disclosure toggles `aria-expanded`, closes on Escape; skip link targets `#main`.
- `tests/components/AccountMenu/index.test.tsx`.
- `tests/e2e/shell.spec.ts`: chrome present on `/coven/[slug]`, `/account`, `/admin` (admin) and the 403 page (non-admin, no Admin entry); switcher's Create Workspace reaches `/coven/new` (`@story-3`, moving or extending `coven-create.spec.ts`'s walk); axe and `assertNoSidewaysScroll` at 375px in both themes; keyboard reaches every nav item at phone width; `aria-current` on the section nav after navigating.
- Existing `admin.spec.ts`, `coven.spec.ts`, `account.spec.ts`, `coven-create.spec.ts` re-run (the tab-order comment at `coven-create.spec.ts:63` changes once the toggle leaves the corner).
- Guard: `tests/guards/` check that every `page.tsx` under `src/app/(shell)` has no `.page-frame` full-height assumption outside the shell rule (only if cheap; otherwise skip).

## Agents

- **Artifact.** I write the shared skeleton first: the page frame, the token stylesheet lifted from `_variables.scss`, the scene strip and theme toggle script, and the brief. Three Sonnet agents then build one option's mock-up fragment each (desktop and phone frames, all five scenes) against that skeleton, in the scratchpad; I assemble, check both themes at 375px and 1280px, write the comparison and recommendation, and publish. Mock-ups do not warrant Opus.
- **Build.** Three lanes once the owner picks: shell, account disclosure and tokens (Sonnet); the fold, docs and board sync (Sonnet); component tests, the e2e spec and stories (Sonnet). Opus only if Option B or C is chosen, for the new primitive (drawer, or underline nav and bottom bar) with its focus and keyboard behaviour. The main session coordinates, merges each lane's commits into `/app` as they land, and runs the end-of-task verification.

## Verification

1. `npm run pre-commit` on each commit.
2. At task end: `npm run test:coverage`, `npm run test:stories`, `npm run e2e` (flock, remote browser server), and `npm run build` into a non-dev dist dir (RSC graph check).
3. In the running app on 8000 (both themes, 1280 and 375): sign in as A, B, C, E; walk coven → account → admin → back; confirm the switcher keeps the section on switch, the banner offsets the bar, Escape closes the disclosure, Tab order starts at Skip to Content, print preview hides the shell.
4. Owner's sign-off recorded as a comment on MB.7's issue; PR body opens `Closes #<MB.7>` and names the MB.122 fold and the M9.16 refresh fix.
