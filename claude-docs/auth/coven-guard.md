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
mapping) and `tests/app/coven/layout.test.tsx` (the layout calls the guard
with its own segment). No end-to-end spec yet: until the coven index page
(M9.15) exists, every `/coven/<slug>` address is a 404 to everyone, so a
browser test could not tell a member from a stranger. M9.15 adds it.
