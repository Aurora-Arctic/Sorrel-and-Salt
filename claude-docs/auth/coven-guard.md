## The coven guard (M6.10)

Every page under `/coven/[slug]` belongs to one workspace, and the address is
the only thing that says which. The guard reads the slug (the coven's name as
it appears in the URL, such as `whitethorn-coven`), finds the workspace it
names, and checks the signed-in user is a member of it. It answers three
visitors three ways, all from the server:

| Visitor                                            | Answer                                  | From                                      |
| -------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Signed out                                         | 307 to `/sign-in?next=<path and query>` | The proxy, then `requireSession()`        |
| Signed in, and the slug names no coven they are in | **404**, the same for both cases        | `requireCovenMembership()`'s `notFound()` |
| A member, at any role                              | The layout, around the page             | `src/app/(shell)/coven/[slug]/layout.tsx` |

- **A 404, not a 403.** This is the opposite of `/admin`, on purpose. A slug
  is a guess at someone's private data, so answering "you may not" would
  confirm that the coven exists. `/admin` is a path everyone already knows,
  so pretending it is missing hides nothing ([admin-guard.md](admin-guard.md)).
- **An unknown slug and a coven you are not in look the same.** The service,
  `membershipBySlug` in `src/modules/coven/services/workspace-by-slug.ts`,
  throws the same bare `Forbidden` for both. The page helper,
  `requireCovenMembership()` in `src/lib/request-session.ts`, turns that
  `Forbidden` into Next's `notFound()`, the way `requireAdminSession()` turns
  its own into `forbidden()`. Any other error passes through as itself.
- **The workspace comes from the URL segment only.** Never a cookie or a
  "current workspace" stored on the session: two browser tabs can sit in two
  covens without disagreeing (M6.9's switcher rewrites the address for the
  same reason).
- **Any role is let in.** The guard asks for `workspace: read`, which viewer,
  member and owner all hold. A page that needs more — the members page, which
  a viewer gets a 404 from — asks the service for that itself.
- **A site admin gets no way in.** Admins curate the compendium and reach no
  workspace, so an admin in no coven gets the 404 like anyone else.
- **The layout calls it, and so does every page beneath it,** with the slug
  from its own `params`, for the reason the admin pages do: a layout does not
  re-run on client-side navigation. The lookup is wrapped in React's
  `cache()`, so the layout, its page title and the page asking again cost one
  query between them.
- **The layout also names the coven in the page title.** Each page gives its
  own name ('Grimoire'), and the layout's title template adds the coven's:
  `Grimoire — Whitethorn Coven — Sorrel & Salt`.

Tests: `tests/modules/coven/services/workspace-by-slug.test.ts` (against
Postgres, every fixture user), `tests/lib/request-session.test.ts` (the 404
mapping), `tests/app/coven/layout.test.tsx` (the layout calls the guard
with its own segment) and `tests/e2e/coven.spec.ts` (a member at each role
gets the page, a stranger and an unknown slug the same 404, in a real
browser against the built server).

## The coven index page (M9.15)

`/coven/[slug]` is the page a coven opens on: where the switcher (M6.9), an
accepted invitation (M7.5) and the shell's coven link (MB.7) land. It is
`src/app/(shell)/coven/[slug]/page.tsx`, and like every page under the coven it runs
the guard again with its own slug. It shows the coven's name as its heading,
and the layout's title template gives its tab title the name too. The
navigation shell (`src/app/(shell)/layout.tsx`, MB.7) wraps it, as it wraps
every page under `/coven`, `/account` and `/admin`.

**The section nav is the layout's.** `src/app/(shell)/coven/[slug]/layout.tsx`
renders `CovenNav` above the page, inside the `.coven-layout` frame, so
every page under the coven carries it without repeating it
([`components/coven-nav.md`](../components/coven-nav.md)). Today it links
the index, Overview, and Members for the roles holding `member: read`
(M6.13). Each other section is linked by the task that builds its page,
because `typedRoutes` refuses a link to a route the build does not contain:
Ingredients by M9.6 and Grimoire by M10.11.

**Leave and Delete are both live here: Delete (M6.14), and Leave (M6.15).**

| Control          | Shown to                                   | Filled by                                     |
| ---------------- | ------------------------------------------ | --------------------------------------------- |
| Leave Workspace  | Every role                                 | M6.15; M6.16's guided exit for the only owner |
| Delete Workspace | Roles holding `workspace: delete` (owners) | M6.14's confirmation                          |

- **Leave is on this page, not the members page,** because a viewer gets a
  404 from the members page (M6.13) and must still be able to leave.
- **Delete is shown by permission, never by rank.** The page asks
  `rolePermits(role, { workspace: ['delete'] })`, the statement M6.14's
  service checks, so the button and the service cannot disagree about who
  may delete. Hiding it is presentation; the service is still the guard.
- **Delete opens a confirmation and then deletes** (M6.14), through
  `DeleteWorkspaceButton` ([`components/delete-workspace-button.md`](../components/delete-workspace-button.md)).
  **Leave opens a confirmation and then leaves** (M6.15), through
  `LeaveWorkspaceButton` ([`components/leave-workspace-button.md`](../components/leave-workspace-button.md)).
  It is enabled for every role, so a test finds it by role and name with no
  test id, and a disabled control is what M6.16 forbids. The coven's only
  owner is shown both ways out on click, a hand-over or the deletion (M6.16;
  [`components/leave-workspace-button.md`](../components/leave-workspace-button.md),
  "The only owner's guided exit").

Tests: `tests/app/coven/page.test.tsx` (the page guards its own slug; Leave
for every role, Delete for the owner alone) and `tests/e2e/coven.spec.ts`
(the same in a browser, keyboard reach and an axe scan).

## The members page (M6.13)

`/coven/[slug]/members` lists who is in the coven, with each person's role
and joining date. Owners and members see it; a viewer gets the same 404 a
stranger does, so the page's existence says nothing about anyone's role (the
owner's call, 2026-10-12). The `member` role holds `member: read` and no
other `member` statement, so inviting, changing a role and removing stay
with owners.

- **The page asks the service, not the role.** It reads through
  `listMembers`, which checks `member: read`; a `Forbidden` becomes
  `notFound()`. The nav link is the other half: `covenSections(slug, role)`
  shows Members when `rolePermits(role, { member: ['read'] })`, never by rank.
- **Role controls are the owner's.** The page passes Change Role to
  `MemberList` only when the caller holds `member: update`. They are client
  components that send `updateMemberRole` through `/api/graphql`; the service
  refuses anyone else, and a change that would leave no owner. It moves a
  member to any other role, and only ever an existing member:
  invitations cannot grant ownership, so this is the only route to it.
- **A quiet note when there is one owner** (M6.16): if that person loses
  access nobody can manage members. A status, not an alert, drawn above the
  table from the whole roll (`memberRoster`), since one page cannot count owners.
- **Not here yet.** The invite action and pending list
  are M7.6's; the page draws neither, and their lists will be owner-only.
- **Paged by cursor** with Prev and Next, 25 to a page, through the same
  helper as GraphQL.

Tests: `tests/app/(shell)/coven/members.test.tsx` (who gets controls, the
404), `tests/components/CovenNav/index.test.tsx` (the link by role),
`tests/modules/coven/services/access-control.test.ts` (the pinned matrix),
and `tests/e2e/coven.spec.ts` (walks story 9, untagged: a viewer's 404, a promotion, the
axe scan).

## The create page (M9.16)

`/coven/new` is where someone holding `canCreateWorkspace` names a new
coven. It is `src/app/(shell)/coven/new/page.tsx`, and it is reached two ways: from
`/coven`, which offers it to a rights holder with no coven yet (M2.8), and
from the switcher's Create Workspace choice, offered to anyone holding the
right (M6.9). A successful create lands on the new coven's index page as its
owner ([`components/create-workspace-form.md`](../components/create-workspace-form.md)).

- **A context row only for someone with a coven.** The switcher alone, with no
  section nav, since the page belongs to no one coven; a first-time creator has
  nothing to switch between, so the row is left out. The page frame is shorter
  by the row, so a page that fits the window does not scroll.
- **A static segment beside `[slug]`.** Next routes `/coven/new` to this page
  before it tries `[slug]`, so the coven layout and its guard never run here.
  The page runs `requireSession()` itself.
- **`new` is never a coven's slug.** Otherwise a coven named "New" could
  never be reached. `isReservedCovenSlug` in `src/lib/coven-path.ts` names
  the segment, and the creation service skips it when it picks a slug, as it
  skips a taken one, so "New" becomes `new-2`. The service is the one place
  a workspace slug is made, so nothing else needs the check. `covenSlugOf`
  reads `/coven/new` as no workspace too, so the switcher shows none chosen
  there.
- **The right is read from the row, not the session.** Accepting an
  invitation sets it mid-session (`Session`), so the page asks `getMe`.
- **A user without the right gets a notice, not a 404.** The page exists for
  everyone, so hiding it hides nothing. They see a quiet notice saying how to
  get the right, and no form. Hiding the form is presentation:
  `createWorkspace` refuses them with `Forbidden` whatever the page shows.
- **Centred like the email page** (the owner's call, 2026-10-12): a
  `.panel` in `.page-frame--narrow`.

Tests: `tests/app/coven/new/page.test.tsx` (the form for a holder, the notice
for anyone else), `tests/modules/coven/services/workspace-creation.test.ts`
(the refusal, and "New" taking `new-2`), `tests/lib/coven-path.test.ts` and
`tests/e2e/coven-create.spec.ts` (Story 3 in a real browser).
