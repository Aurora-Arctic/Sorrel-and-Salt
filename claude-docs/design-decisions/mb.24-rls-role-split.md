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
(M1.19), which `src/db/repository/write.ts` documents as "the only write path". Reads
go through `findMany`/`findOne` → `selectFrom`, which uses the bare client with
no transaction (M1.20). A GUC set with `is_local => true` exists only inside a
transaction, so a policy reading it on a read would find it unset on a fresh
pooled connection, or reset to `''` on one that had served a write — an error on
the `::uuid` cast in the first case, zero rows in the second. Nothing planned
would have caught it: M6.5 asserts a read is _refused_, which is what a totally
broken read path looks like.

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

## Not decided here

Whether the Neon–Vercel integration still auto-creates a branch per preview
deployment. M1.1 assumed it does and said the assumption was unverified;
`vercel.json` has since disabled Git-integration deploys in favour of
`vercel deploy --prebuilt` from CI. Deriving the connection is correct either
way, which is why this record does not wait on the answer. **MB.27** establishes
it.
