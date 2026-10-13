_The scoping plan approved on 2026-10-13 for MB.119 (#576), kept as approved. The build had not started when it was committed: it waits on M10.32, and the decisions taken at sign-off are appended at the end once the review runs._

# MB.119 — Design review: the coven and invitations (#576)

## Context

MB.119 closes Wave 10. It is the section review of the coven: the `/coven` landing (M2.8), `/coven/new` and `CreateWorkspaceForm` (M6.7, M9.16), the coven layout with `ContextRow`, `WorkspaceSwitcher` and `CovenNav` (M6.9, M6.10, M9.15), the index page with Leave, Delete and the last owner's guided exit (M6.14 to M6.16), the People tabs with `MemberList`, `PendingInvitations`, the Invite action and `InviteDialog` (M6.12, M6.13, M7.4, M7.6, M10.26), and the acceptance page `/invite/[token]` with `InvitationAcceptance` (M7.5). Behaviour does not change. The review looks at the section as built in both themes, at desktop and 375px, proposes the design as workshop stories and screenshots, stops for the owner's sign-off, then builds what is signed off within MB.114's tokens and the pieces MB.115 and MB.116 settled. The user asked for consistency, UX, accessibility and DRY code to be checked; the audit below is the result.

**Owner's decisions (2026-10-12, planning):**

- **The user-facing noun is "Coven."** Every label, heading, notice and dialog title says coven; code, schema and docs keep saying workspace. `DESIGN.md:237`, `CLAUDE.md:21` and `.claude/rules/components.md:39` ("Only the URL segment says _coven_") each gain "and the screens say _coven_ too", recorded in the plan copy `claude-docs/design-decisions/mb.119-plan.md` under Decisions.
- **Branch off staging now.** M10.25, M10.29 and M10.31 are open but touch nothing in the section. Staging is merged in before the PR if one lands mid-task.
- **Every sub-hour fix lands here**; larger ones are minted. Estimate 3h → 10h (`estimate MB.119 10`, the entry's heading corrected, reason in the entry).

**M10.32 (2026-10-13, owner's call):** another session is building M10.32 in `/home/node/worktrees/m10.32` (`feature/m10.32-pending-coven-invitations-on-the-landing`, head `cc62632f`, In Progress, no PR yet): a `ReceivedInvitations` table on the `/coven` landing with an Accept per row, `acceptInvitationById`, and a reworked `invitation-acceptance.ts`, landing page, landing test and `workspace-invitation.spec.ts`. **MB.119 reviews `ReceivedInvitations` too**, as part of the landing. **Wave A starts now off staging** (no file overlap); **Wave B and the close start once M10.32's PR is open**, the branch rebased onto its head, the PR naming it as the one it follows. If M10.32 merges first, staging is merged in instead. Until then nothing in `coven/page.tsx`, `invitation-acceptance.ts`, `identity/types.ts`, `landing.test.tsx` or `workspace-invitation.spec.ts` is touched.

Branch `feature/mb.119-design-review-the-coven-and-invitations` off `origin/staging` in the worktree `/home/node/worktrees/mb119` (`/app` now holds M10.25's checkout, another session's: never touched); board `In Progress` with the start comment. Lane worktrees under `/home/node/worktrees/mb119-*` with copied `node_modules` (minus `.cache/tsc/tsconfig.tsbuildinfo`) and `/app/.env.local`; Vitest under `flock /tmp/sorrel-vitest.lock`, Playwright under `flock /tmp/sorrel-e2e.lock`; never a bare `npm run build` in `/app`.

## What the audit found (verified in the code, 2026-10-12)

**Holds:** every page is axe-scanned somewhere in e2e (`coven`, `coven-create`, `invite`, `workspace-invitation`, `shell` specs); no hex, rgb or hsl outside `_variables.scss`; InviteDialog's own focus return and the native `<dialog>` in every confirm; `/coven/new` already on a `.panel` in `.page-frame--narrow`; the members and invitations pages already draw `ListFrame`, `StackTable` and `Pager soft` (the entry's "adopts PageHeader and Pager" line is stale: `PageHeader` comes through `TabbedPage`, and the entry is corrected).

**Consistency**

1. The noun: "Leave Workspace" / "Delete Workspace" (`LeaveWorkspaceButton/index.tsx:32-35`, `owner-exit.tsx:44-50`, `DeleteWorkspaceButton/index.tsx:34-37`) against "Coven" everywhere else. A demoted owner on a stale page also sees the service's bare refusal "A member may not workspace: delete" (`modules/coven/services/membership.ts:81,112-118`).
2. The Revoke dialogs promise the link "will say it was revoked" (`PendingInvitations/revoke-control.tsx:31-32`, `AdminInvitations/index.tsx:81-82`) while the page says "withdrawn" (`invitation-acceptance.ts:35`).
3. The People page: nav item and tab say "Members", the heading says "People" (`CovenNav/sections.ts:27` vs `(people)/layout.tsx`). Admin reads People > Users | Invitations.
4. The acceptance page sits bare in `.page-frame--narrow` (`src/app/invite/[token]/page.tsx:56`) where sign-in, the email page, the landing and the create page are all `.panel`s.
5. The coven index (`[slug]/page.tsx`) is a bare `<main>` with a raw `<h1>` and one "Your Membership" section holding Leave beside Delete; the admin index has a lede and contents. `.coven-layout` still shares `.admin-layout`'s rule "until its section's design review says otherwise" (`_primitives.scss:670-688`).
6. The landing says "Welcome" in both of its states (`coven/page.tsx`).
7. Leave and Delete land on `/` (the public home) rather than `/coven` (`LeaveWorkspaceButton/index.tsx:48`, `owner-exit.tsx:139`, `DeleteWorkspaceButton/index.tsx:51`); the create form lands in the coven and refreshes (`CreateWorkspaceForm/index.tsx:45-48`).
8. A deleted coven's invitation refuses as `invalid`: "This invitation link isn't valid. Check that you opened the whole link from the email." (`invitation-acceptance.ts:33,101`), wrong advice for that case, and no story shows it.

**Accessibility**

9. `OwnerExit` never returns focus to its trigger: it unmounts its `<dialog>`, and `Modal` restores nothing by design (`modal.md:90-92`); InviteDialog carries its own return (`InviteDialog/index.tsx:166-200`). Its trigger's `aria-label` repeats the visible text (`owner-exit.tsx:44`).
10. `PendingInvitations` names its `<section>` and its table "Pending Invitations" (`index.tsx:23,55`), so a reader hears it twice.
11. Radio labels "Hand it to …" and "Delete it" are sentence case (`owner-exit.tsx:153,158`); "Only an administrator can restore it" (`:160`) differs from the two sibling sentences ("…with database access…").
12. Two workshop fixtures lack `canReadMembers` (`.ladle/shell-frame.tsx:24-31,51`, `ContextRow/index.stories.tsx:12-15`), so the shell stories draw no Members link; stories are outside `tsc`.

**DRY**

13. `MemberList/role-failure.tsx` duplicates `WorkspaceActions/action-failure.tsx`; they differ in the default (no-op vs `null`), and with the no-op a Remove or Change Role outside the provider drops its refusal silently (`remove-control.tsx:23,38`). `ActionFailure` has no `index.tsx`, story or doc.
14. `FormActions` is hard-wired to `Save ${noun}` (`Field/form-actions.tsx:38,42`), so `CreateWorkspaceForm/index.tsx:96-108`, `InviteDialog/index.tsx:141-159` and `AdminInvitations/invite-form.tsx:106-124` each hand-write the submit-and-cancel row.
15. `owner-exit.tsx:168-172` hand-writes `div.field > label.field__label` instead of `FieldShell`.
16. `members/page.tsx:42-44` repeats `readPageCursors` (`src/lib/numbered-page.ts:41-50`); `members/page.tsx:90-144` and `invitations/page.tsx:39-41` hand-write the Prev and Next hrefs that admin's `pagerHrefs` builds (`admin/list-page.tsx:34-44`); neither uses `listHref`.
17. `InviteDialog/index.scss` is one rule, no `@use`, zeroing the radio group's raw `1.5rem` margin (`_primitives.scss:1475-1477`).
18. The h4 face (`$font-heading`, 700, 0.01em, 1.5rem) is restated in `WorkspaceSwitcher/index.scss:53-56` and `ContextRow/index.scss:58-61` from `_typography.scss:20,43`.
19. `.member-list__warning` (`MemberList/index.scss:12`) styles a notice the page renders (`members/page.tsx:98`) and doubles `.tabbed-page__panel`'s own gap; `min-width: 9ch` (`:59`) is dead since every row has the one "Change Role" button; `workspace-switcher.md` claims a `radius('control')` the file inherits from `.input`; `coven-nav.md`'s table is split by prose and names a `covenRole` prop that is now `canReadMembers`; `UserList/types.ts:116-124` has `onFailure`'s comment above `choices`.

**From M10.32's branch (reviewed from `cc62632f`; its own files until its PR opens):** 20. `ReceivedInvitations` names its `<section>`, its table and the page's `<h2>` all "Your Invitations" (finding 10's shape, three times); its `empty` string can never show, since the page renders it only with rows; its stories have no Phone/theme variants; its doc already has a Styling section. 21. `AcceptControl` draws its refusal `Notice` inside the row's cell, so on a phone card the alert sits under the button rather than above the list as `MemberList`'s and the index's do through `ActionFailure`. 22. The landing now stacks header, invitations table, then the Create Coven link or the invite-only paragraph in one `.panel`, and the Create link is a solid button beneath a table whose Accept is also solid (one solid per view).

**Not defects:** the Invite button is a plain `btn btn--solid`, like admin's Invite Admin; `.add-action` is only the Add that turns into a plus (`TabbedPage/index.scss:77-84`). ContextRow's `1px` is the house hairline. `width: 1%` is the shrink-to-fit idiom. `$context-row-ground` stays local with one user (TabbedPage's `$segment-pill` precedent), its comment saying why no test row is needed.

**Minted, not built (over an hour or behaviour):** `ConfirmedAction` moving out of `UserList/` into its own directory with a CSS split, story and doc, and one shared confirm-and-safe button row for `Answers`, `ConfirmQuestion` and `DiscardQuestion` (handed to MB.124); a contents-style coven index once Ingredients and Grimoire exist (MB.121); one width for floating panels, the switcher's 12rem/15rem against AccountMenu's 13rem (MB.124).

## Phase 1 — Build the foundations and the proposals, then stop for sign-off

Four lanes in worktrees off the branch, two waves; the orchestrator (this session) merges each lane's commits into `/app` as they land and never edits a lane's files. Lanes 1 and 2 are Opus (a Sass refactor that must compile identically; shared pieces with focus logic); lanes 3 and 4 and the camera are Sonnet.

### Wave A

**Lane 1 — Foundations and the context row** (`/app`; owns `src/scss/*`, `.ladle/*` except `coven-pages.stories.tsx`, `WorkspaceSwitcher/`, `ContextRow/`, `CovenNav/`, their tests and docs, `styling.md`, `workshop.md`)

- `_variables.scss`: a `$heading-sizes` map (1: the clamp, 2–4 as `_typography.scss` has them) and `heading-size($n)` shaped like `type-size()`; `_mixins.scss`: `@mixin heading-face` (`$font-heading`, 700, 0.01em). `typography-base` uses both; the compiled CSS for every heading must come out identical (assert by compiling before and after with `sass` in a scratch script). The switcher and the context row become `@include heading-face; font-size: heading-size(4);` keeping their own line heights with a comment.
- `WorkspaceSwitcher/index.scss`: `$switcher-min-width: 12rem` and `$switcher-list-min-width: 15rem` named at the file head with comments, as TabbedPage names `$pill-height`.
- `_primitives.scss`: the radio group's `margin-block` becomes `space(5)` and `.form > .fieldset.radio-group { margin-block: 0 }`, so a form's gap spaces it like any field (finding 17); check RoleControl's and OwnerExit's radio groups in modals, which are not in a `.form`. The `.coven-layout` comment at `:670` is rewritten once the index is signed off (Phase 2).
- Fixtures: `canReadMembers` on `.ladle/shell-frame.tsx` and `ContextRow/index.stories.tsx`. `coven-nav.md` rebuilt (Props, Stories, the table in one piece); `workspace-switcher.md` (the face, the inherited radius, the widths); `context-row.md` (the face, why the ground is local).

**Lane 2 — Shared pieces** (`mb119-shared`; owns `Field/form-actions.tsx`, `Field/types.ts`, `Field/index.stories.tsx`, `Modal/modal-button.tsx`, `Modal/index.tsx`, `Modal/types.ts`, `Modal/index.stories.tsx`, new `ActionFailure/`, `src/lib/list-href.ts`, `src/lib/types.ts`, `admin/list-page.tsx`, `admin/types.ts`, `admin/value-page.tsx`, `admin/group-page.tsx`, `admin/(people)/privilege-changes/page.tsx`, `AdminInvitations/invite-form.tsx`, `UserList/types.ts`, their tests, `field.md`, `modal.md`, `action-failure.md`, `admin-invitations.md`)

- `FormActions` takes optional `label` and `busyLabel`, defaulting to `Save ${noun}` / `Saving ${noun}`; `AdminInvitations/invite-form.tsx` adopts it ("Send Invitation"). Test first: a story-free render asserting the submit's accessible name follows `label`.
- `ModalButton` (`Modal/modal-button.tsx`, exported from `Modal/index.tsx`): a trigger button, the open state, a `<Modal>`, and focus returned to the trigger however it closes, lifted from `InviteDialog/index.tsx:166-200`. Props `label`, `className`, `title`, `size?`, `children(close)`. Test first (`tests/components/Modal/modal-button.test.tsx`): `it.each` over Close, Escape and the contents' own close, each ending with the trigger focused and no dialog. `modal.md:90-92` rewritten: Modal still restores nothing itself; a button-opened modal uses `ModalButton`. Handoff line into M8.16's entry: its focus criterion is met by `ModalButton`.
- `src/components/ActionFailure/` (`index.tsx`, `types.ts`, `index.stories.tsx`) from `WorkspaceActions/action-failure.tsx`, **null** default. Test `tests/components/ActionFailure/index.test.tsx` with a local child calling `useActionFailure()?.report`, asserting the alert precedes the child. `action-failure.md` (Props, Contracts incl. the null default, Styling "None of its own", Stories, Testing). `WorkspaceActions/` and `role-failure.tsx` stay for lanes 3 and 4 to delete.
- `pagerHrefs` (pure) moves to `src/lib/list-href.ts`, `PagerCursor` and `PagerHrefs` to `src/lib/types.ts`; the three admin callers repoint; `admin/list-page.tsx` keeps its `server-only` import.
- `UserList/types.ts:116-124` comment moved to its prop.

### Wave B (from the merge of A, rebased onto M10.32's PR head)

**Lane 3 — Membership and the landing** (`mb119-membership`; owns `coven/[slug]/page.tsx`, `[slug]/layout.tsx`, `coven/page.tsx`, `coven/new/page.tsx`, `LeaveWorkspaceButton/`, `DeleteWorkspaceButton/`, `CreateWorkspaceForm/`, `ReceivedInvitations/`, `WorkspaceActions/` (deleted), `modules/coven/services/membership.ts`, new `.ladle/coven-pages.stories.tsx`, their tests under `tests/components/` and `tests/app/(shell)/coven/{page,landing,layout}.test.tsx`, `new/page.test.tsx`, docs `leave-workspace-button.md`, `delete-workspace-button.md`, `create-workspace-form.md`, `received-invitations.md`)

- `ReceivedInvitations` (findings 20–22): the `<section aria-label>` goes and the `<h2>` names the table through `aria-labelledby`; `AcceptControl`'s refusal reports through `useActionFailure()` with the table inside an `ActionFailure`, the inline `Notice` kept only as the null-default fallback; the dead `empty` string goes with a comment on the page saying why the list renders only with rows; `OneInvitation`/`SeveralInvitations` gain Phone/theme variants; its doc's Styling section updated. The landing proposals below draw the table in both landing states, with the Create Coven link as an outline button beneath the table when the table has an Accept, and solid when it is alone (the owner's call at sign-off).

- Copy: Leave Coven, Delete Coven (labels, titles, accessible names); the `aria-label` at `owner-exit.tsx:44` goes with `ModalButton`; "Hand It to …", "Delete It"; `:160` reads as `DeleteWorkspaceButton/index.tsx:44` does; `LeaveWorkspaceButton/index.tsx:14-16`'s comment corrected to "above the page's buttons". Tests change accessible names only.
- `OwnerExit` on `ModalButton` (finding 9); new test "gives focus back to Leave Coven when the dialog closes" (Cancel and Escape), red first. `FieldShell` with `fieldDescription` around the `ComboboxTypeahead` (finding 15). `CreateWorkspaceForm` on `FormActions` (`label="Create Coven"`, `busyLabel`, `dirty={!empty}`, `submitting={busy}`).
- Imports move to `@/components/ActionFailure` (or the relative path the file uses); `WorkspaceActions/` and its test deleted.
- Proposal stories in `.ladle/coven-pages.stories.tsx` inside `ShellFrame`, each with Phone/theme `meta` variants: `ProposalIndexAsBuilt`; `ProposalIndexRole` (`.header` with eyebrow "Coven", the h1, a `.lede` from `WORKSPACE_ROLE_ACCESS[role]`, then Your Membership with Leave); `ProposalIndexOwnerSection` (as Role plus an owners-only "Delete This Coven" section with one sentence and the wax button, Leave and Delete no longer side by side; **recommended**); `ProposalIndexContents` (admin's shape, thin until MB.121); `ProposalLandingAsBuilt`; `ProposalLandingNamed` (eyebrow "Welcome", h1 "Start a Coven" or "Join a Coven"; **recommended**).
- Docs: Styling, Stories and Testing sections for the two button docs and `member-list.md`'s siblings as `notice.md:46-50` shapes them.

**Lane 4 — People and invitations** (`mb119-people`; owns `coven/[slug]/(people)/**`, `MemberList/` (deletes `role-failure.tsx`), `PendingInvitations/`, `InviteDialog/` (deletes `index.scss`), `InvitationAcceptance/`, `src/app/invite/[token]/page.tsx`, `AdminInvitations/index.tsx`, `modules/identity/services/invitation-acceptance.ts`, `modules/identity/types.ts`, their tests incl. `tests/app/(shell)/coven/{members,invitations}.test.tsx` and `tests/modules/identity/services/invitation-acceptance.test.ts`, docs `member-list.md`, `pending-invitations.md`, `invite-dialog.md`, `invitation-acceptance.md`)

- `RoleControl` and `RemoveControl` on `useActionFailure()` with the null default; `role-failure.tsx` and `RoleFailureProps` deleted; `remove-control.test.tsx` gains "outside an ActionFailure a refusal shows beside the control", red first.
- Members and invitations pages on `readPageCursors` and `pagerHrefs` with `listHref` (finding 16); the sole-owner `Notice` moves inside `ListFrame` before `ListBody`, `.member-list__warning` and `9ch` deleted.
- `InviteDialog` on `ModalButton` and `FormActions` (`label="Send Invitation"`, `holdCancel`, `onCancel={() => discard.request(close)}`); its own focus logic and `index.scss` go; its focus tests at `:181,194` must stay green unchanged.
- `PendingInvitations`: the `<section aria-label>` dropped, the table keeps its name (`coven.spec.ts:244` queries it).
- Acceptance page proposals in `InvitationAcceptance/index.stories.tsx` inside a `.page-frame--narrow` wrapper: `ProposalBare{SignedOut,Acceptable,Refused}` and `ProposalPanel{SignedOut,Acceptable,Refused}` (root `panel invitation-acceptance` with a `.header` holding the h1 and the grant sentence as `.lede`, as `SignInPanel/index.tsx:43-46`; **recommended**), plus a `DeletedCoven` state story with the proposed sentence.
- Docs: `member-list.md` gains Styling and Stories; `invite-dialog.md` gains Props and Stories, Styling "None of its own"; `pending-invitations.md` (no region); `invitation-acceptance.md` (the panel, the deleted-coven state).

### Camera and sign-off (orchestrator, Sonnet camera lane)

- The dev server on 8000 belongs to `/app`'s checkout (M10.25's): the camera runs the branch's own production build from the worktree on a free port (8002 and up, `NEXT_DIST_DIR=.next-e2e`-style, never `/app/.next`) against a database seeded `demo`; workshop on 61001 for the remote browser; storage states for A (owner), B (member), C (viewer) and a user with no coven under `.reports/mb.119-states/` (gitignored, deleted at task end).
- `scripts/review-screenshots.mjs` into `.reports/mb.119-screenshots/`: `/coven` (holder and non-holder, each with and without received invitations, and a refused Accept), `/coven/new`, `/coven/{slug}` per role, members and invitations tabs, the Invite dialog open, the Leave and Delete questions and the owner exit, `/invite/{token}` signed out, acceptable, used, revoked, expired, deleted coven; plus the Proposal stories from the workshop at 1280 and 375, both themes (`&theme=dark|light` in the Ladle URL).
- Contrast re-measured with `contrastRatio` over every pairing the proposals add (none expected: they use existing tokens).
- A private artifact "Coven Design Review" (load `artifact-design`): the findings by number, each proposal side by side with the recommendation, the copy table, the decisions the owner is asked for (below), the screenshots. No URL on the public issue.
- Comment on #576: paths and story names to look at, the decisions asked, never a value. **Stop for the owner's sign-off.**

**Decisions the owner is asked for at sign-off:** (a) index: Role, OwnerSection or Contents; (b) landing: named headings or Welcome; (c) acceptance page on a panel; (d) nav item "People" to match the heading (recommended) or heading "Members"; (e) Leave and Delete landing on `/coven` with a `router.refresh()` as the create form does, instead of `/` (a navigation target, not a rule); (f) the deleted-coven refusal as its own reason `closed`, "The coven this invitation was for has been deleted, so it can't be accepted."; (g) "withdrawn" in the Revoke dialogs (the service's word) or "revoked" on the page; (h) `membership.ts:81`'s refusal reading "Your role in this coven doesn't allow that. Ask an owner if you need it." in place of the resource-and-action string; (i) the landing with received invitations: Create Coven as an outline beneath the table (one solid per view) or solid as today.

## Phase 2 — Apply the sign-off

Decisions recorded as a comment on #576 and in the plan copy. Lanes 3 and 4 apply the calls in the files they own and delete the losing Proposal stories; the page-level `.ladle/coven-pages.stories.tsx` goes once the running pages carry the winners, each page's state kept as component stories with Phone/theme variants. Lane 1 closes: `.coven-layout` comment, `styling.md` ("Type": `heading-size()` and `heading-face`; "Form fields": a radio group inside a form; "The admin layout": the coven layout signed off; "The page frame": the invitation page's panel; "Designing a section": `ModalButton` and `ActionFailure` among the shared pieces), the vocabulary lines in `DESIGN.md`, `CLAUDE.md` and the components rule, the e2e edits, the task entries, the plan copy. Then the owner looks in the running app; **the PR waits for their word** (design-review exception to the lane PR rule).

**e2e (lane 1, after lanes 3 and 4 merge):** `coven.spec.ts` (`:72,75,343,351` the Coven names; `:348-352` title-case regexes; `:135,144` "People" if chosen; if (e), the hand-over ends off `HANDOVER_SLUG` and the switcher no longer lists it); `coven-create.spec.ts:77`; a new test between `:33` and `:55` scanning both landing states with axe in both themes and `assertNoSidewaysScroll`; `workspace-invitation.spec.ts`: `refusalAt` gains `assertNoSidewaysScroll`, M10.32's landing test gains it beside its axe scan, and a last test where the owner invites D, the coven is soft-deleted with the statement the service test uses at `:494`, D signs in and is refused (message differs from the used one if (f)); `invite.spec.ts:61,81,123` gain the scroll assertion. Expired, mismatch and unverified draw the same component as the scanned states and stay at unit level.

**Board:** `status MB.119 "In Progress"` + start comment; `estimate MB.119 10`; progress comments per merged lane; `sync MB.119` after the entry edit, and `sync` for each entry given a handoff (M8.16, MB.121, MB.124); `In Review` only by `/create-pr`.

## Verification

1. `npm run pre-commit` at every lane commit; `npm run lint:css` on every Sass change.
2. Heading CSS identical before and after `heading-face` (compiled with `sass` in a scratch script, diffed).
3. At task end from `/app`: `npm run test:coverage` (80% line), `npm run test:stories`, `npm run workshop:build`, `NEXT_DIST_DIR=.next-check npm run build` then delete the dir and `git checkout -- tsconfig.json`; e2e `coven`, `coven-create`, `invite`, `workspace-invitation`, `shell` against the remote browser under the e2e lock with the recipe in memory (ports 8001+ free, blank `ENABLE_IMPERSONATION`, the secret from `.env.local`, never printed).
4. Keyboard walk at 375px in both themes in the running app: Leave Coven regains focus after the owner exit closes; the Invite button after the dialog; Members reachable from the nav for an owner and a member, absent for a viewer; no sideways scroll on any page; the acceptance page's refusal announced.
5. The owner looks once in Safari and Firefox on the host.

## Out of scope

What a service decides (no new refusal rules; (f) and (h) are wording of refusals that already fire); mail (MB.118); the shell bar and account menu (MB.7); the ingredients and grimoire pages under the coven (MB.121, MB.123); `ConfirmedAction`'s move and the shared confirm row (minted to MB.124).
