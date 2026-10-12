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
| A member, at any role                              | The layout, around the page             | `src/app/coven/[slug]/layout.tsx`         |

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
  a viewer gets a 404 from — asks `assertMembership` for that itself.
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
`src/app/coven/[slug]/page.tsx`, and like every page under the coven it runs
the guard again with its own slug. It shows the coven's name as its heading,
and the layout's title template gives its tab title the name too.

**The section nav is the layout's.** `src/app/coven/[slug]/layout.tsx`
renders `CovenNav` above the page, inside the `.coven-layout` frame, so
every page under the coven carries it without repeating it
([`components/coven-nav.md`](../components/coven-nav.md)). Today it links
only the index, Overview. Each other section is linked by the task that
builds its page, because `typedRoutes` refuses a link to a route the build
does not contain: Members by M6.13, for the roles holding `member: read`,
Ingredients by M9.6 and Grimoire by M10.11. Members is deferred for that
reason too, though the task first listed it here (the owner's call,
2026-10-12).

**Leave and Delete have their places here, disabled until their services
land.**

| Control          | Shown to                                   | Filled by                 |
| ---------------- | ------------------------------------------ | ------------------------- |
| Leave Workspace  | Every role                                 | M6.15, and M6.16's dialog |
| Delete Workspace | Roles holding `workspace: delete` (owners) | M6.14's confirmation      |

- **Leave is on this page, not the members page,** because a viewer gets a
  404 from the members page (M6.13) and must still be able to leave.
- **Delete is shown by permission, never by rank.** The page asks
  `rolePermits(role, { workspace: ['delete'] })`, the statement M6.14's
  service checks, so the button and the service cannot disagree about who
  may delete. Hiding it is presentation; the service is still the guard.
- **Both are real buttons, disabled** (the owner's call, 2026-10-12), so a
  test finds them by role and name with no test id. A disabled control is
  what M6.16 forbids once Leave works, so the task that wires each one also
  enables it.

Tests: `tests/app/coven/page.test.tsx` (the page guards its own slug; Leave
for every role, Delete for the owner alone) and `tests/e2e/coven.spec.ts`
(the same in a browser, keyboard reach and an axe scan).
