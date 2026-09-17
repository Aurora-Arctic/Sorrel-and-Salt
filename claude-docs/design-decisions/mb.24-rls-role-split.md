# MB.24 — RLS role split, `FORCE`, and identity on the read path

**Status:** superseded by MB.29 · **Date:** 2026-09-17

> MB.29 defers RLS to the public launch and makes the second authorization
> layer a branded `Membership` proof instead, so nothing below is scheduled for
> v1: MB.25, MB.26, M6.4 and M6.5 are retired. The findings stand — this record
> is the specification for the migration that adds policies when that launch
> comes, and it is deliberately left otherwise untouched.

The question that started this was whether RLS is overkill for a project this
size. It is not — the failure mode it guards is one workspace's grimoire
becoming visible to another (DESIGN.md §8), and half its infrastructure was
already paid for by M1.19's GUC, which the v2 history trigger needs regardless.

But checking §8 against the code showed the design as written does not work, in
two ways that concealed each other. Neither had surfaced, because the first kept
the policies from applying at all and so the second could not yet bite.

## The two findings

**1. The policies would have been inert.** The application connects as `sorrel`
(`Docker/docker-compose.yaml`) and `drizzle-kit migrate` runs against that same
`DATABASE_URL` (`package.json`), so `sorrel` owns every table its policies would
filter. Postgres does not apply a table's policies to that table's owner unless
`ALTER TABLE … FORCE ROW LEVEL SECURITY` is set, and that clause appeared
nowhere in the repo — not in DESIGN.md, TASKS.md, `db.md` or any migration. Neon
is the same shape: the integration injects a connection string for the
table-owning role.

M6.5 exists precisely to catch this and would have — but only after M6.4 had
shipped believing the opposite, and only if M6.5's own test were not itself
connected as the owner, in which case it would have reported "the database
refused the read" for the wrong reason and passed.

**2. Fixing only that would have broken every read.**
`set_config('app.current_user_id', …, true)` is published inside `withAudit`
(M1.19), which `src/db/repository.ts` documents as "the only write path". Reads
go through `findMany`/`findOne` → `selectFrom`, which uses the bare client with
no transaction (M1.20). A GUC set with `is_local => true` exists only inside a
transaction, so a policy reading it on a read would find it unset on a fresh
pooled connection, or reset to `''` on one that had served a write — an error on
the `::uuid` cast in the first case, zero rows in the second. Nothing planned
would have caught it: M6.5 asserts a read is _refused_, which is what a totally
broken read path looks like.

## Options weighed

**`FORCE` alone, keeping one role.** Cheapest edit — one clause in M6.4's
migration. Rejected as the primary mechanism: `FORCE` applies to the owner, so
migrations and the seed would then need their own bypass, which puts a
`BYPASSRLS` role back on the table anyway. It also leaves the application
connected as the owner of every table it queries, which is the condition that
made this bug possible and would make the next one possible too.

**Role split, no `FORCE`.** The standard shape, and the primary decision below.
Considered sufficient on its own, then rejected as _only_ sufficient when
`DATABASE_URL` resolves to the role we expect. On Neon it frequently will not:
the integration injects `neondb_owner`, and the per-PR hotfix previews get an
endpoint minted at deploy time.

**Both.** Chosen. Once the owner holds `BYPASSRLS`, which outranks `FORCE`,
adding `FORCE` costs nothing already being paid and converts the worst
misconfiguration — connecting as some other table-owning role — from "returns
every workspace's rows" to "returns none".

**Neon: derive vs. provision.** The problem is that no `DATABASE_URL` can be
pre-set for an endpoint host that does not exist until deploy time, so "set it
explicitly per environment" is not an available answer. _Provisioning_ —
`neonctl branches create` plus `neonctl connection-string --role-name`, dropping
the integration's auto-branching — works but reimplements the integration and
adds Neon API surface to `deploy.yml`. _Deriving_ was chosen: take whatever
`DATABASE_URL` the platform supplies and swap only username and password,
keeping host, database and `sslmode`. Because it never names the host it is
correct on an ephemeral branch, on staging, in production, in Docker and in CI,
without having to determine which of those a given deploy is. Provisioning stays
the documented fallback if role inheritance across Neon branches does not hold.

**Read transactions: per query vs. per request.** Wrapping each read in its own
transaction is simplest and costs two extra round trips per query, which
DESIGN.md §2 already flags as a billing problem and not only a latency one.
Per-request is cheaper but has no single establishment point in RSC, where a
layout cannot hold a transaction across a render tree. Resolved by making
`withViewer` **re-entrant**: services establish it, and the GraphQL route
establishes an outer one alongside the per-request DataLoaders, so an operation
collapses to one `BEGIN` and one `set_config` while a server-component render
still gets one short transaction per distinct `cache()`-deduped service call.

## Decided

- **`sorrel` keeps its identity and gains `BYPASSRLS`.** It remains owner of the
  database and of `sorrel_template` with `CREATEDB`, which M1.9's per-worker
  clones depend on. It runs migrations and the seed, and stops being what the
  application connects as.
- **`sorrel_app` is new**: `LOGIN`, `NOBYPASSRLS`, owning nothing, granted
  `USAGE` on schema `public` and DML on its tables via `ALTER DEFAULT
PRIVILEGES` so future migrations are covered without anyone remembering a
  `GRANT`.
- **M6.4 sets `FORCE ROW LEVEL SECURITY` as well as `ENABLE`.**
- **The app derives its connection**: `DATABASE_URL` stays the owner's string —
  which is what `drizzle.config.ts`, `scripts/db-seed.ts` and
  `db-global-setup.ts` already want — and `connection.ts` swaps in
  `DATABASE_APP_ROLE` / `DATABASE_APP_PASSWORD`. Both are required; absent, the
  process throws rather than falling back, so `FORCE` stays a backstop and does
  not become a crutch.
- **A startup assertion** refuses a connection whose role is superuser, holds
  `rolbypassrls`, or owns a known application table. Ownership is invisible in a
  connection string, so without this a misconfigured environment disables the
  whole layer silently.
- **Reads carry identity through `withViewer`**, re-entrant, never nested with
  `withAudit`.
- **Policies read the user only through `app.current_user_id()`**, a `stable`
  helper returning `nullif(current_setting('app.current_user_id', true), '')::uuid`
  — `NULL` rather than an error when unset, so a misconfiguration denies instead
  of 500s. **`app.is_member(uuid, workspace_role)` is `security definer`** with
  an explicit `search_path`; without it a policy on `workspace_members` that
  subqueries `workspace_members` is infinite policy recursion, which Postgres
  rejects outright.

## Rules this sets

- The application must never connect as a role that owns application tables. If
  a future environment makes that unavoidable, that is a decision to re-argue
  here, not a `// eslint-disable`-shaped exception at a call site.
- A test that asserts RLS refused something must also assert _why_ it could have
  succeeded: the connected role neither owns the table nor holds `rolbypassrls`,
  and the GUC is populated. A green RLS test proves nothing about RLS otherwise.
- Every policy reads identity through `app.current_user_id()`. A second
  `current_setting` call anywhere in a policy is a bug, because it is the copy
  that will not get updated.
- `ingredients.workspace_id` is nullable and `NULL` means the global compendium.
  Any policy on that table needs `workspace_id IS NULL OR …` or the compendium
  disappears for every signed-in user.
- Workspace-scoped is not the same as "has a `workspace_id` column".
  `spell_ingredients` and `spell_categories` reach their workspace through
  `spells`. Guards must enumerate the set, not infer it from a column name.

## Cross-task impact

- **MB.25** implements the role split, the derived connection and the startup
  assertion. It must land before **M1.27** bakes the Postgres image.
- **MB.26** implements `withViewer`. It must land before **M6.4**, or M6.4's
  policies make every workspace-scoped read return nothing.
- **M6.4** is reduced to the policies themselves plus `FORCE` and the two
  helpers; its seed criterion is struck, answered by `sorrel`'s `BYPASSRLS`.
- **M6.5** gains the precondition assertions described above.
- **M10.3** reads identity through the same helper, and must refuse a private
  spell's `spell_ingredients` and `spell_categories` rows, not merely the spell.
- **MB.27** is not RLS work but was found here: `deploy.yml` calls `vercel pull`
  without `--git-branch`, so M1.1's branch-scoped `staging` override has never
  reached a build.

## Not decided here

Whether the Neon–Vercel integration still auto-creates a branch per preview
deployment. M1.1 assumed it does and said the assumption was unverified;
`vercel.json` has since disabled Git-integration deploys in favour of
`vercel deploy --prebuilt` from CI. Deriving the connection is correct either
way, which is why this record does not wait on the answer. **MB.27** establishes
it.
