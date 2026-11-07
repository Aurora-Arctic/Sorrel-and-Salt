## Impersonation

A keeper can sign in as a specific user, in local development, on staging and
on a hotfix preview, to reproduce what that user sees rather than guess at it.
Better Auth's `admin` plugin already does this: `impersonate-user` creates a
session for the target user and remembers the admin's own session in a signed
`admin_session` cookie, and `stop-impersonating` swaps back. What this app
adds is the gate, the column, the audit rules and the way back out.
`src/lib/impersonation.ts` holds the gate and the narrowed plugin.

### The gate: `VERCEL_ENV`, and both conditions

The plugin is registered only when `ENABLE_IMPERSONATION` is `true` **and**
`VERCEL_ENV` is not `production` (`impersonationEnabled()`). Unset means the
plugin is never constructed, so `/api/auth/admin/*` is **absent** (404) rather
than refusing. That makes impersonation impossible at production, not just
forbidden. It takes both conditions, as the two authorization layers each do,
so one mis-scoped Vercel variable is not the whole defence.

- **`NODE_ENV` is the wrong signal.** `next build` and `next start` run at
  `NODE_ENV=production` in every Vercel build, staging and the hotfix previews
  included ([`config.md`](config.md)). A `NODE_ENV` gate would switch
  impersonation off in two of the three environments it serves.
- **`VERCEL_ENV`** is `production` only on the `main` deploy, `preview` for
  staging and every `hotfix-<slug>` alias, and unset locally. Anything that is
  not `production` passes, unset included.
- The variable's row, and the rule that it is never set on Production, are in
  [`secrets.md`](../secrets.md).
- A hotfix preview cannot finish an OAuth sign-in until MB.78's proxy lands,
  which is post-launch work ([`waves/wave-15.md`](../waves/wave-15.md)),
  so a keeper cannot yet sign in there to impersonate anyone.

### Only the two impersonation endpoints are mounted

Registering the plugin as shipped would also mount `set-role`, `update-user`,
`remove-user`, `create-user`, `set-user-password`, `list-users`, `get-user`,
the session listing and revoking endpoints, the ban endpoints, and
`has-permission`. Each writes through the adapter, outside `withAudit`.
`set-role` would be a second way to grant admin, past M2.9's ledger and the
primary keeper's protection, and `remove-user` could hard-delete the primary
admin ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)).
So `impersonation()` keeps `impersonateUser` and `stopImpersonating` from the
plugin's endpoints and drops the rest.

`tests/lib/impersonation.test.ts` compares the mounted `/admin/*` paths with
`IMPERSONATION_PATHS` by name. A Better Auth upgrade that adds an endpoint
fails the test instead of going through unnoticed.

The task left two questions to answer from running code. Both answers:

- **The `role` column works unmapped.** The plugin reads `user.role` as a
  string and checks it against its default roles, `admin` and `user`. The
  `user_role` enum has a third value since M11.20, `curator`, which the plugin
  does not know and so treats as a user: `adminRoles` stays `['admin']`, so an
  admin may impersonate, and neither a user nor a curator may, with no `roles`
  option needed. A curator can be impersonated like any non-keeper.
- **The ban endpoints and columns can be declined.** The endpoints go with
  the rest. The narrowed plugin's schema keeps only `session.impersonatedBy`,
  so Better Auth expects no `banned`, `banReason` or `banExpires` column on
  `users`. Its session-create hook reads `user.banned`, finds nothing, and lets
  every session through. v1 has no ban story.

### Who may impersonate whom

The endpoint is the guard. The control on `/keepers/users` only puts it where
a keeper looks.

- **A non-keeper, a curator included, is refused** with a 403, even where the plugin is registered:
  the default `user` role has no `impersonate` permission.
- **A keeper cannot impersonate another keeper**, the primary keeper included.
  `allowImpersonatingAdmins` stays at its default, off, and the default `admin`
  role lacks `impersonate-admins`.
- **A user whose site access is paused is impersonated into what they see while paused.**
  `sessionStateFromHeaders` in `src/lib/request-session.ts` records the standing pause on the
  impersonation session as on the user's own: support's pages and API calls act as the user, every
  other signed-in page redirects to `/access-paused`, another public page draws the signed-out view
  under the shell's paused notice, and every other signed-in GraphQL call answers `ACCESS_PAUSED`.
  The banner, drawn by the root layout, stays on every page, so Stop still works. Once the pause is
  lifted or runs out the same impersonation reaches the normal pages
  (`claude-docs/design-decisions/m15.52-site-access-pause.md`).
- **An impersonation lasts an hour**, Better Auth's default. The session row
  expires on its own if Stop is never pressed.
- **No target check beyond the role.** Better Auth looks the target up by id
  with its own adapter, so it would hand over a soft-deleted user or the seed's
  bootstrap user if asked for one by id. `/keepers/users` offers neither.

### The audit follows the impersonated user

A write made while impersonating B stamps B in `created_by` and `updated_by`.
That is the point: impersonation reproduces what B would see and do, and an
admin stamp would not. So the acting keeper is not lost when the session row
goes, the service session carries them as `impersonatedBy`.
`request-session.ts` reads it off Better Auth's session, and `withAudit`
publishes it as `app.impersonated_by` beside `app.current_user_id`, from the
session and never a request body, in the same transaction-local
`set_config(..., true)` ([`db/write-path.md`](../db/write-path.md)). Like
`app.privilege_route` it is published on every write, and unlike
`app.current_user_id`, which the privilege trigger reads, it has no
reader in v1. It is empty on every write that is not an impersonation.

### Not a third access path

Impersonation swaps the session cookie, which a GraphQL mutation cannot do
cleanly, and it lives under `/api/auth/*`, the one exception rule 1 already
names ([`config.md`](config.md), "The one exception to the GraphQL-only rule"). Nothing else
moves off GraphQL. The user list a keeper picks a target from is MB.52's
ordinary read.

### The way out: a banner on every page

Impersonating a non-keeper costs the admin `/keepers` until they stop, so the way
out cannot live in the admin nav. `ImpersonationBanner` names the user, by
name and address, and carries Stop Impersonating, at the top of every page
([`components/impersonation-banner.md`](../components/impersonation-banner.md)).

- **It is read in the browser.** `src/app/impersonation-banner.tsx` reads the
  session through Better Auth's `useSession`. A session read in the root layout
  would make every page dynamic, including the public compendium that is meant
  to be cached.
- **It is mounted only where impersonation is registered.** The root layout
  checks `impersonationEnabled()`, so at production the slot does not exist and
  no page pays for the session read. A static page applies the check at
  build time. On Vercel the build and the deployment have the same variables,
  so the answer is the same.
- **Impersonate lands on `/`, and Stop on `/keepers/users`.** Both are full
  loads, because the session cookie has just changed and every server
  component must read it again.

### Tests

- `tests/lib/impersonation.test.ts`: the gate in every combination, the
  mounted set against the allowlist where the gate is open, the endpoints
  absent where it is shut (one environment each way, the gate's matrix
  covering the rest), and the declined ban columns. That a keeper target is refused is the
  db file's, through the endpoint, not a pin of `allowImpersonatingAdmins`
 .
- `tests/db/impersonation.test.ts`: through `auth.handler`, a non-keeper is
  refused, a keeper target is refused, and the impersonation session is B's
  with E recorded. B's coven is what the session sees, and `/keepers`'s check
  refuses it. Stop restores E's own session. A paused user is handed over, the session reads as paused, a
  signed-in GraphQL call through the real route answers `ACCESS_PAUSED` while a public read answers, Stop restores E, and
  the same impersonation reads as signed in once the pause is lifted. The file builds Better Auth once,
  with the flags on, in its `beforeAll`.
- `tests/db/repository/write.test.ts`: `app.impersonated_by`, and a write
  under an impersonation stamped as the user acted as — the session above is
  B's, so that is the write stamped B.
- `tests/db/schema-drift.test.ts`: the column and its foreign key, against
  the schema file.
- The component, page and layout tests: the control and the banner.
