# Sorrel and Salt — Design Doc

**Repo:** `Aurora-Arctic/Sorrel-and-Salt`
**Status:** Approved; revised 7 September 2026 (post-draft scope changes — see §14)
**Date:** 6 September 2026, revised 7 September 2026

---

## 1. Overview

A tool for tracking spell ingredients and composing spell jars. The site is invite-gated: signing in earns an account, and the right to create a workspace is granted by accepting an invitation or by an admin. The compendium is the site's public face: its list and every entry are readable without an account and indexable by search engines (MB.80); the gate is on accounts and workspaces, not on what exists. Users belong to workspaces that share an inventory; a global compendium of ingredients is curated by site admins.

**In scope for v1:** OAuth sign-in, invite-gated workspace creation (`canCreateWorkspace`), workspaces with roles and invitations by email (copy-link until MB.61's follow-ups bring delivery), admin-curated global compendium — public and search-indexable (MB.80) — workspace-local ingredients, stock tracking, spell builder with `private | workspace` spell visibility, full audit columns on every model, GraphQL API.

**Deferred to v2:** the entire notes subsystem — private / workspace / public experience notes and their visibility model (17 tasks, 29 hours) — plus edit-history UI, user suggestions for compendium and category additions, duplicate merge tooling, bulk add from the compendium, passkeys (email/password sign-in stays out; passkeys replace it), note moderation reports, viewer spell-approval workflow, GraphQL response caching, subscription billing, try-before-sign-up through Better Auth's `anonymous` plugin, and a suggested change to an existing compendium entry (MB.80).

### Vocabulary

Three domain nouns, each meaning exactly one thing: the **Compendium** is what exists, a workspace's **Ingredients** are what it has, and its **Grimoire** is what it makes. CLAUDE.md's Vocabulary table defines them and binds their use in routes, components, tests and conversation.

---

## 2. Decisions

| Decision  | Choice                                            | Why                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16, App Router                            | Needs a server runtime for sessions and audit stamping. Was 15; moved to 16 at M0.1 because Next 15 transpiles `next.config.ts` through the TypeScript 5 JS API (`ts.sys`), which TypeScript 7 no longer exposes. `resume-2026` is on TypeScript 7 and keeping the toolchains aligned matters more than the framework minor.                                               |
| Database  | Neon Postgres                                     | Supabase free tier pauses after 7 days; Neon scales to zero and resumes itself                                                                                                                                                                                                                                                                                             |
| ORM       | Drizzle                                           | Plain-TS schema, raw SQL where needed, no engine binary                                                                                                                                                                                                                                                                                                                    |
| Auth      | Better Auth, in-process                           | In-process, so no extra service or cost, and it carries only OAuth and sessions. Its organization plugin was spiked for workspaces and invitations and **not adopted** — hard deletes, unaudited writes and a plaintext token do not fit §5 ([`mb.30-organization-plugin.md`](design-decisions/mb.30-organization-plugin.md))                                              |
| Sign-in   | OAuth only (Google, Discord, Facebook, Microsoft) | No passwords means no reset flow and no admin recovery desk. GitHub was the original second provider (M2.5) and was dropped when the roster was re-scoped at M2.6. Apple was considered and dropped: its client secret is a JWT Apple caps at six months, expiring silently rather than failing loudly, and it needs a paid Developer Program membership the others do not |
| API       | GraphQL Yoga + Pothos                             | Single route handler, zero hosting cost, typed contract                                                                                                                                                                                                                                                                                                                    |
| Hosting   | Vercel Hobby                                      | Native Next.js, 6,000 build minutes, generous meters                                                                                                                                                                                                                                                                                                                       |
| Styling   | Componentized Sass                                | Matches `resume-2026` conventions                                                                                                                                                                                                                                                                                                                                          |
| Testing   | Vitest, RTL, Playwright, local Postgres           | Ported from `resume-2026`; local DB keeps the real schema under test                                                                                                                                                                                                                                                                                                       |
| CI        | GitHub Actions, Gitflow                           | Ported wholesale from `resume-2026`                                                                                                                                                                                                                                                                                                                                        |

### Why Drizzle

The audit requirement decided it. `auditColumns` is a plain TypeScript object spread into every table — six columns, one line per table, no codegen step. Prisma would need those six fields written into all twelve models in its DSL, or a generator plugin, plus `prisma generate` after every change.

Two more reasons:

- **Raw SQL where needed.** Partial unique indexes, `num_nonnulls` check constraints, `pg_trgm` similarity, the v2 PL/pgSQL trigger, and the RLS policies deferred to the public launch (§8) all live inside typed migrations. Prisma's schema language can't express most of them.
- **No engine binary.** Prisma ships a Rust query engine as a separate process — cold-start weight and deployment size for nothing on serverless.

A third reason — that Pothos has a first-class Drizzle plugin — **no longer applies**: the plugin is not used (MB.20), because its primary capability is resolver-level database access, which §3's rule 1 forbids. The ORM choice now rests on the two reasons above alone, and is correspondingly easier to revisit: `drizzle-orm` is reachable only from `src/db/repository/`. §7 carries the rules that decision sets for the GraphQL layer.

Trade-off: Prisma Studio is nicer than Drizzle Studio and Prisma's errors are friendlier. Kysely remains the other reasonable pick — its lack of a GraphQL plugin no longer counts against it, but it is still `0.x` and so no steadier than what is here.

### Why Yoga + Pothos

Two separate decisions.

**Yoga over Apollo Server.** Built on the Fetch API, so it drops into a Next.js route handler as a single export with no adapter shim. Apollo needs `@as-integrations/next` and carries more weight. Yoga also ships response caching, `graphql-armor` compatibility, and persisted operations as first-party.

**Pothos over SDL-first or Nexus.** Code-first means the schema is TypeScript, so a resolver returning the wrong shape is a compile error rather than a runtime one. SDL-first requires codegen to link schema and resolvers, and the link can silently break. Nexus has been effectively unmaintained for a while.

Pothos specifically: its **auth-scopes plugin** gives declarative field-level guards.

Its **Drizzle plugin is deliberately not used** (MB.20). That plugin's purpose is to let a resolver query the database from the GraphQL selection set, which §3's rule 1 forbids outright — and the graph does not mirror the tables anyway, so there is little to derive: audit columns surface as one nested `AuditInfo` object rather than six flat fields, and `Ingredient.isGlobal`, `Spell.derivedCategories` and `Spell.categoryGaps` are computed rather than stored. Object types are declared by hand against the row type the service returns, so a column whose type changes still fails the build. Keeping it out is also what leaves the GraphQL layer independent of `drizzle-orm`'s version.

Trade-off: the schema isn't readable as a document on its own. §11's schema snapshot test keeps the printed SDL committed as `src/graphql/schema.graphql` and fails when the schema no longer matches it, so the file exists and diffs are visible in PRs. The same file is what client codegen reads (§7).

### Why OAuth only

No passwords means no hashing, no reset flow, no lockout, and no admin recovery desk. The alternative — copy-link password reset without email delivery — isn't self-service at all: a locked-out user must contact an admin who verifies identity out of band. Workable for a coven, unworkable at fifty users, and it makes the admin a single point of failure.

Better Auth can add email+password later without a schema migration. The tables already accommodate it.

---

## 3. Architecture

```
Browser
  ├── Server Components ──► services/ ──► Drizzle ──► Neon
  └── Client Components ──► /api/graphql ──► resolvers ──► services/ ──►┘
```

**One rule holds the whole thing together: authorization is decided in `src/modules/*/services/` and nowhere else** (CLAUDE.md rule 1).

Server components call services directly. No HTTP loopback to your own GraphQL endpoint — that would double latency and burn function invocations for nothing. Client components go through GraphQL. Both paths converge on the same service functions, so there is exactly one place where "can this user see this row" is decided.

This answers the risk GraphQL usually introduces. Field-level authorization scattered across a graph is how data leaks; a single choke point is not.

```
src/
  app/                      # routes, layouts, server components
    api/graphql/route.ts    # Yoga handler
  components/<Name>/        # index.tsx + index.scss
  modules/<name>/           # one per domain: identity, coven, vocabulary, ingredients, grimoire
    index.ts                # the public surface — services, types, GraphQL refs, loader factories
    schema/                 # the Drizzle tables the module owns; public too, for the seed and foreign keys
    validation/             # Zod input schemas, shared by the form and the service; public, and client-safe
    services/               # authz + business logic — THE choke point
    graphql/                # Pothos type + field definitions, registered on the shared builder
    loaders/                # DataLoader factories
  db/
    audit.ts                # shared audit columns
    repository/             # only code allowed to import `db`; reached through its index.ts
    seed/                   # shared by docker, vitest, playwright
  graphql/
    schema/index.ts         # composes the modules' registrations into one schema
    loaders/index.ts        # composes the modules' loader factories, one fresh set per request
  lib/                      # pure functions — heaviest unit coverage
  scss/                     # shared partials
```

---

## 4. Hosting and costs

### Platform: Vercel Hobby

| Item                   | Free allowance                  | Cost   |
| ---------------------- | ------------------------------- | ------ |
| Vercel Hobby           | See meters below                | **$0** |
| Neon Postgres          | 0.5 GB storage, 100 CU-hours/mo | **$0** |
| Better Auth            | Library, runs in-process        | **$0** |
| GraphQL Yoga           | One route handler               | **$0** |
| GitHub Actions         | Unlimited on public repos       | **$0** |
| OAuth (four providers) | Free                            | **$0** |

**Total: $0/month.**

### Vercel Hobby meters

| Meter                | Allowance        |
| -------------------- | ---------------- |
| Function invocations | 1,000,000/mo     |
| Active CPU           | 4 CPU-hours/mo   |
| Provisioned Memory   | 360 GB-hours/mo  |
| Fast Data Transfer   | 100 GB/mo        |
| Edge Requests        | 1,000,000/mo     |
| Build execution      | 6,000 minutes/mo |

**Active CPU is the meter that would bind first**, and this app is I/O-bound so it won't. Vercel bills only while code actively executes — waiting on a database query does not count toward Active CPU. Provisioned Memory does bill during I/O wait, which is where Neon's ~1s cold start after idle lands, but 360 GB-hours is far beyond reach at personal scale.

Rough capacity: at ~30ms Active CPU per invocation, 4 CPU-hours is roughly 480,000 invocations, or ~12,000 browsing sessions per month.

### What consumes an invocation

Next.js doesn't meter anything itself; the host does. What matters is which parts become function calls rather than static files.

**Counts:** dynamic page renders (SSR), RSC payload fetches on client-side navigation, route handler calls including `/api/graphql`, server actions, ISR revalidation, and middleware (metered separately as edge requests).

**Doesn't count:** static assets, prerendered pages served from CDN, and data-cache hits — §7's `unstable_cache` on the compendium doesn't remove the render invocation but does remove the Postgres query inside it.

**One page load is usually several invocations.** Opening `/coven/birch/ingredients` fires the page render, then each client component with its own GraphQL query fires another. A page with search, spell list, and category filter is easily 4–5.

That's a design lever. Every read moved from a client GraphQL query into the server component's initial payload removes an invocation. §3's architecture already does this and it's worth defending as the app grows.

### Configuration

Deploys are **CLI-driven from CI**, not Vercel's Git integration. `.github/workflows/deploy.yml` does `vercel pull` → `vercel build` → `vercel deploy --prebuilt` → (for a preview) `vercel alias`. It runs on a **push** to `main` (production) or `staging` (preview), and on a **pull request** from a `hotfix/**` branch into `main` (preview) — a hotfix gets a review-time preview URL, posted as a PR comment, and its alias is removed when the PR closes. The Git integration is turned off entirely:

```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "**": false
    }
  }
}
```

`"**": false` (minimatch, matches names with and without slashes) disables an automatic deployment for every branch, so CI is the only path that ships code — even if the Git integration is left connected. This replaces M0.25's allow-list of `main`/`staging`/`hotfix/*`; the reason is Vercel Hobby (M0.26): a named `staging` environment on `staging.sorrelandsalt.com` needs Pro, whereas `vercel alias` from CI puts staging on that hostname for free.

| Item            | Setting                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploys         | `deploy.yml`: push to `main` (prod) / `staging` (preview); `hotfix/** → main` PR (preview). Nothing else                                                            |
| Git integration | Off — `vercel.json` `deploymentEnabled: { "**": false }`                                                                                                            |
| Staging URL     | `staging.sorrelandsalt.com`, re-pointed by `vercel alias` after each `staging` deploy                                                                               |
| Production      | `vercel deploy --prebuilt --prod` auto-assigns `sorrelandsalt.com` / `www`                                                                                          |
| Hotfix URL      | per-PR `hotfix-<slug>.sorrelandsalt.com`, posted as a PR comment, removed on PR close. Needs `*.sorrelandsalt.com` (wildcard domain, Vercel nameservers — Hobby-OK) |
| Database        | Neon's Vercel integration populates the project's per-environment vars; `vercel pull` fetches them into the CI build                                                |
| Build cache     | Vercel remote build cache, used by `vercel build`                                                                                                                   |

### Recorded risks

- **Hobby is personal, non-commercial only.** If Sorrel and Salt ever earns money, it moves to Vercel Pro at $20/mo. This is a licensing constraint, not a technical one.
- **Neon scale-to-zero cannot be disabled on the free plan.** Design for a ~1s cold start: skeleton states on first paint, no sub-50ms assumptions.
- **Compute has a dollar cost at scale**, so an N+1 query is a billing problem as well as a performance one. DataLoader is not optional. It is also why the second authorization layer is a compile-time proof rather than a transaction per read (§8): I/O wait is billable here, so a layer that opens one costs money on every page.

---

## 5. Data model

### Audit columns — on every table, and the join-table exception

```ts
// src/db/audit.ts
export const auditStampColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => users.id),
};

export const auditColumns = {
  ...auditStampColumns,
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
};
```

Spread as `...auditColumns` into every table **except two join tables** — `ingredient_categories` and `spell_categories` spread `...auditStampColumns` and are hard-deleted (MB.34). The third, `spell_ingredients`, carries the full set: a layer taken out of a spell is a tombstone (MB.110). The six-column set is defined as the four-column one plus the two delete columns, so it has one definition rather than two that can drift.

**Why those two and only those two.** Every category chip toggled off, on an ingredient or on a spell, is a write to one of them, so a soft delete fills the highest-churn tables in the schema with tombstones nothing reads: there is no restore UI in v1, and the trash view is v2. Each would also need a surrogate key and a partial unique index so the same pair could be re-added. What decides it is that a pair is a pairing, not content: it holds nothing of its own — no locator, no position, no typed text — so a pair removed is restored by toggling the chip again, and a tombstone keeps nothing a restore could return. That is why `spell_ingredients`' reversal does not reach these two: a layer is a record of a working (MB.110), and an ingredient's or a spell's categories are a classification, corrected rather than kept. The v2 history trigger records a `DELETE` as readily as an `UPDATE`, the actor beside it in `app.current_user_id`, so nothing is lost to history. MB.34 first argued from the `deleted_at IS NULL` a service joining _through_ the table would have to remember by hand; `existsIn` (MB.100) has since ANDed that filter by construction for every read through a child table, so that argument no longer decides it (MB.125).

The four stamp columns stay on both: `created_by` on a join row answers who added the link. `workspace_members` keeps the full six — who removed whom, and when, is worth keeping — and so does `ingredient_folk_names`, which holds content rather than a link.

**Four enforcement rules, because audit columns rot the moment one path skips them:**

1. **`*_by` never comes from a request body.** All writes go through `withAudit(session, fn)`, which injects them. A lint rule bans importing `db` outside `src/db/repository/`.
2. **`updated_at` is a database trigger**, so a manual `psql` fix still stamps it.
3. **Soft-delete filtering is the repository's** (CLAUDE.md rule 4). There is no exported query that can forget `deleted_at IS NULL`: `findMany`/`findOne` apply it where the column exists and read a join table that has none, deciding on the table's own shape rather than on a flag a caller passes. The writer holds the same line: every update and soft delete skips a deleted row, decided the same way, so a tombstone is never rewritten and a second delete never overwrites who made the first. The way back to a deleted row is v2's restore, and an edit follows it (§13, "Edit history"). **Two exceptions, named rather than flagged.** A spell keeps reaching an ingredient soft-deleted after it went into the jar, through two finders whose names end `…IncludingSoftDeleted` and which skip the ingredient's filter and no other (M5.3; `spell_ingredients` below). A substitute keeps reaching the ingredient it links once that is deleted, to show its last name, through a third in the same shape (MB.138; `ingredient_substitutes` below).
4. **The hard delete is a named method, not a flag.** `write.delete(table, match)` removes rows outright and is typed to reject any table carrying `deletedAt` at compile time; `softDelete` demands one. Same shape as `findManyIncludingSoftDeleted` — the escape hatch is narrow and impossible to point at the wrong thing. It names its rows by column value — `{ ingredientId, categoryId: [...] }`, a list matching by `IN` — rather than by an `SQL` predicate, which a service may not build (MB.33; MB.125).

Every write transaction publishes the acting user as a transaction-local GUC, `app.current_user_id`. The statement is `select set_config('app.current_user_id', $1, true)` rather than a literal `SET LOCAL` — `is_local => true` _is_ `LOCAL`, and `SET LOCAL` accepts no bind parameters, so writing it literally would mean interpolating a user id into SQL text. Nothing in v1 reads it back: it is there for the v2 history trigger (§13) and for the policies deferred to the public launch (§8). That is the point of publishing it now — either one becomes a single migration rather than a re-audit of every write path.

**Partial indexes only, on every table that has a `deleted_at`.** Without the `WHERE deleted_at IS NULL`, deleting a record permanently blocks reusing its name. The two hard-deleted join tables need none: their composite primary key has no tombstone to dodge, which is half the point of hard-deleting them. `spell_ingredients` is soft-deleted, so its unique indexes carry the predicate like any other table's.

### Naming note: `workspaces` vs `/coven/`

The schema entity is `workspaces`; the URL prefix is `/coven/`. This divergence is deliberate, not an oversight.

`/w/` is unreadable, and nesting workspaces under `/compendium/` would make that word mean two things. `/coven/` reads well in a URL, fits the domain, and stays out of the compendium's way.

Code, schema, and prose use _workspace_. Only the URL segment says _coven_.

### Tables

**`users`** — `id`, `email`, `emailVerified`, `name`, `image`, `role` (`user` | `admin`), `canCreateWorkspace` (boolean, default `false`), `verificationSentAt` (nullable; when the last verification mail went out, so the next is at least a minute away), + audit. `emailVerified` is true when Google or Discord reported the address verified or when the user followed our own verification mail (MB.66); Facebook and Microsoft profiles arrive unverified whatever they report. A provider that does not vouch is never matched to an existing row by its address: it is added to an account only by an explicit link from a signed-in session on `/account` (MB.71), after which its sign-in resolves by the provider account id and never by the address. An unverified account is provisional and lapses one verification window after its last mail, and three hours after sign-up at most (MB.67), which is how an address squatted by an unverified sign-up returns to its owner. An address changes only at verification (MB.54): asking for a new one mails it a change link and writes nothing to the row, so an established account never becomes provisional. `name`/`image` (not `displayName`/`avatarUrl`) deliberately — they're Better Auth's own core `User` field names (§2, §8), and renaming them would need a `user.fields` mapping in `src/lib/auth.ts` for no real benefit.

`role` is a column, not a table; v1 needs no granular platform permissions. Admins can write the global compendium, global categories, the ingredient form vocabulary, the two group vocabularies that organise them (`category_groups`, `ingredient_form_groups`), the planet and zodiac vocabularies (`planets`, `zodiac_signs`), and the deity vocabulary with the traditions that organise it (`deities`, `deity_traditions`), and **nothing else** — an admin has no access to any workspace's ingredients or grimoire. The **primary admin** is the live admin whose email matches the `ADMIN_BOOTSTRAP_EMAIL` env var. It is promoted at a Google or Discord sign-in that reports the address verified, since those are the two providers whose verification can be trusted, or on verifying the address through our own mail from a session holding the row (MB.68); the address cannot be registered any other way. It cannot be revoked or deleted by anyone, itself included. Changing who it is means changing the variable and redeploying, and the previous primary admin stays an ordinary admin. Every other admin is granted and revoked by an existing admin from `/admin/users`, verified or not, every change is appended to an `admin_role_changes` ledger, a revoke that would leave zero admins is refused as a fallback for the gap between changing the variable and the new address signing in, and the primary admin can pause granting and revoking for every other admin, itself exempt, through the `admin_role_change_pauses` ledger (M2.9, built by MB.58–MB.63). An admin account is still an ordinary member of whatever workspaces it belongs to; the site role and the workspace roles are independent. Until then, the primary admin's promotion, at sign-in or at verification, is the only way to grant admin (MB.60, MB.68).

`canCreateWorkspace` defaults to `false`. Signing in with any registered provider earns an account and nothing more. The flag turns `true` by one of two routes — accepting a workspace invitation or an admin granting it — and it stays `true` until an admin revokes it, so an established user can create as many workspaces as they like. Revoking stops new workspaces and leaves the ones already created, whose owner they remain; an admin's flag cannot be revoked, and nothing automatic clears it (M5.8; [`m5.8-revoking-workspace-creation.md`](design-decisions/m5.8-revoking-workspace-creation.md)). Nothing in the OAuth flow sets it. The flag is what lets anyone create a workspace, admins included: being made admin sets it `true` in the same write, and a CHECK on `users` refuses an admin without it, so every admin holds it and the gate reads the flag alone, never `role` (MB.177; [`mb.177-admins-hold-workspace-creation.md`](design-decisions/mb.177-admins-hold-workspace-creation.md)). Revoking admin leaves it.

**`admin_role_changes`** — `id`, `userId`, `change` (`bootstrap` | `grant` | `revoke`, a closed enum), `note` (nullable), + audit. The ledger of who is an admin: one row per change to `role`, because the next update to a user's row overwrites its `updated_by`. `created_by` is who made the change and `created_at` when. `bootstrap` is a promotion by `ADMIN_BOOTSTRAP_EMAIL`, or a row the ledger started with: its migration wrote one for every live admin, stamped as that admin. Append-only by the repository rather than by grant, since `sorrel` owns its tables and a `REVOKE` would not bind it: the writer's update and delete methods refuse the table at compile time, and only the insert and the finders reach it. One privilege's account, not §13's edit history (MB.58; [`m2.9-granting-admin.md`](design-decisions/m2.9-granting-admin.md), "What the audit trail records").

**`admin_role_change_pauses`** — `id`, `endedAt` (nullable), `endedBy` (nullable), + audit. The primary admin's pause on every other admin's grants and revokes, one row per pause: `created_by` is who paused and `created_at` when, and the ended pair who resumed and when. Admin changes are paused while a live row has no `endedAt`; a unique index on a constant, partial on that, allows one such row at most, and a CHECK keeps the ended pair together. Nothing is seeded: no row is the state of a site that has never paused. Reached only through the open-pause finder and the writer's named pause and resume, each under the `SiteAdmin` proof; the generic insert, updates and deletes refuse the table at compile time (MB.62; [`mb.62-pause-ledger.md`](design-decisions/mb.62-pause-ledger.md)).

**`workspace_creation_changes`** — `id`, `userId`, `change` (`grant` | `revoke` | `invitation` | `admin`, a closed enum), + audit. The ledger of who may create a workspace: one row per change to `canCreateWorkspace`, because the next update to a user's row overwrites its `updated_by`. `created_by` is who made the change and `created_at` when. `grant` and `revoke` are an admin's act (M5.8), `invitation` is accepting a workspace invitation (M7.5), and `admin` is being made admin while the flag was off (MB.59). Not backfilled: who set a flag held before it is not known. Append-only by the repository, as `admin_role_changes` is (MB.193; [`m5.8-revoking-workspace-creation.md`](design-decisions/m5.8-revoking-workspace-creation.md)).

**`workspaces`** — `id`, `name`, `slug`, + audit.

There is no `kind` column and no automatically created workspace. Every workspace behaves identically: it can take members and be deleted by an owner. A newly signed-in user has no workspace until they accept an invitation or, holding creation rights, make one.

**`workspace_members`** — `workspaceId`, `userId`, `role`, `joinedAt`, + audit. PK on the pair.

| Role     | Can                                                                                  |
| -------- | ------------------------------------------------------------------------------------ |
| `owner`  | Everything, plus manage members and delete the workspace                             |
| `member` | Read and write ingredients and grimoire                                              |
| `viewer` | Read only. With notes deferred to v2 there is no exception — a viewer writes nothing |

At least one `owner` per workspace, enforced on demotion and removal.

**`workspace_invitations`** — `id`, `workspaceId`, `email`, `role`, `tokenHash`, `expiresAt`, `acceptedAt`, `acceptedBy`, `revokedAt`, + audit.

`role` accepts `viewer` or `member` only, enforced by a database check constraint — owner is deliberately not invitable, so no future code path can widen it by accident. Ownership is granted afterwards by an existing owner on the members page, once there is an identifiable account to point at.

Only the hash is stored, and the token is generated with a CSPRNG (`crypto.randomBytes`, never `Math.random`). The link is mailed to the invited address (M7.3, on MB.65's transport) and appears in no response and no query; it is accepted only by a signed-in account whose verified email matches the invitation's (M7.5). Accepting an invitation also sets `canCreateWorkspace` on the accepting user, audited — someone vouched for by an existing member is an established user.

**`admin_invitations`** — `id`, `email`, `tokenHash`, `expiresAt`, `acceptedAt`, `acceptedBy`, `revokedAt`, `note`, + audit (MB.69). The same shape without a workspace: an admin names an address, the link is mailed to it, and only a signed-in account whose verified email matches can accept. Accepting is a grant through the admin role service, so it writes the ledger row, sets `canCreateWorkspace`, and is refused while admin changes are paused (MB.70, story 62).

**`ingredients`** — `id`, `workspaceId` (nullable), `name`, `slug`, `canonicalName`, `nomenclature`, `canonicalKey` (generated), `form`, `formId` (nullable), `description`, `elements[]`, `planets[]`, `zodiacSigns[]`, `colors[]`, `safetyNotes`, + audit. Folk names, substitutes and deities are child tables rather than array columns — see `ingredient_folk_names`, `ingredient_substitutes` and `ingredient_deities`; the retired `deities[]` column was undeclared by MB.167 and dropped by MB.168. `slug` is `slugify` of `name`, `form` and `canonicalName` where declared, joined by spaces (`ingredientSlug` in `src/lib/slugify.ts`), stored the way every other slug here is and unique per scope (partial indexes: `(slug) WHERE workspace_id IS NULL`, `(workspace_id, slug)`, both `AND deleted_at IS NULL`); it is a compendium entry's public address, `/compendium/ingredients/[slug]` (§9). It follows a relabel, and a change of form or formal name the same way, and a compendium entry's old slug goes to `retired_ingredient_slugs` (MB.80; the columns are MB.81, the rule MB.82).

One table, two tiers, so `spell_ingredients` (and v2's `notes`) point at a single kind of thing:

- `workspaceId IS NULL` — the global compendium. Everyone reads; only admins write. Every entry declares a `nomenclature`, and one naming a system carries a `canonicalName`.
- `workspaceId` set — local to that workspace. Owners and members there write it. Invisible elsewhere. A formal name is optional here, so story 29's one-field stub still saves.
- No user path promotes local to global. That's v2's suggestion flow.

`name` is the display label and nothing more; identity is the formal name plus the form, spelled out below. `form` is free text drawn from an admin-curated vocabulary (`ingredient_forms`), not an enum, and `formId` records the curated row a member picked for it, when one was (MB.165, below).
`elements[]` values: earth, air, fire, water, spirit — a list of a closed enum, and a correspondence rather than part of identity.
`planets[]`, `zodiacSigns[]` and an ingredient's deities are lists of free text drawn from admin-curated vocabularies (`planets`, `zodiac_signs`, `deities`), like `form` — not closed sets. The project serves a wide range of practices and any closed list refuses some: modern practice reads Uranus, Neptune and Pluto beside the traditional seven, others read Earth, Chiron, the asteroid goddesses, Black Moon Lilith or the lunar nodes, and sidereal practice adds Ophiuchus as a thirteenth sign, and no list of gods covers every practice that names one. The entry form offers the curated bodies, signs and deities as autofill, and on a coven's ingredient a value off the list is written as readily as one on it. A picked deity records its curated row beside its name, as a picked form does (`ingredient_deities`, MB.165); a planet or sign records its text alone. A compendium entry holds curated values alone, as its `form` does (MB.162, below), since the admin who writes it curates the lists too: its deities each a pick, its planets and signs each a curated spelling (MB.167). `colors[]` is a list of free text with no vocabulary and no suggestions at all, the owner's call. The tables are specified below, after `form`'s.

**Planet, zodiac sign and colour are lists (MB.134).** An ingredient carries as many of each as its practice gives it: a herb ruled by both Venus and the Moon carries both. Each entry is trimmed, a blank entry dropped, a repeat but for case and spacing refused at the repeat as a folk name's is (MB.167), and a list left with no entries an absence, stored as null rather than `{}` — and an edit replaces a list whole. **Each list keeps the order entered.** A practice that names a ruling planet beside a lesser one writes the ruler first, a Postgres array keeps its order for nothing, and nothing in the app sorts an entry list, so the stored order is the member's. The form lets a member move an entry once entered, by pointer or keyboard alone, so the order need not be typed right first time (MB.170). The columns are `planets`, `zodiac_signs` and `colors`, and the fields `planets`, `zodiacSigns` and `colors` in the shared schema, GraphQL and the form: `zodiacSigns` rather than `zodiacs` because one entry is a sign and the zodiac is all of them, which is also why the vocabulary is `zodiac_signs`; `colors` spelled as `colorDark` is, since code says _color_ and prose _colour_. A column named as the vocabulary behind it is the pattern the retired `deities` column followed, and MB.127 named its vocabulary to match. Until MB.136 they were single `planet`, `zodiac` and `color` columns, and the move follows rule 10's sequence: MB.135 adds the lists and fills each from its single column, MB.136 switches every reader and writer and stops declaring the singles, and MB.137 drops them, with no last fill, once a release carrying MB.136 has reached production. The lists take new names because a column cannot turn from `text` to `text[]` under a deployed reader, so for one deploy both exist.

**Element is a list (MB.157).** An ingredient carries every element its practice works it with: a herb worked with both fire and air carries both. The set stays closed, so the column is an array of the enum, `ingredient_element[]`, beside the free-text lists: nothing is typed, and nothing outside the five is written. **The list keeps the order chosen and refuses a repeat.** The order is the member's, as every list's is, so an element a practice names first stays first. A repeat is refused at its position rather than dropped, unlike a free-text list's: the form's list offers only the elements not yet chosen, so a repeat comes from a caller other than the form, and refusing it says so rather than storing something other than what was sent. A list left with no entries is an absence, stored as null rather than `{}`, and an edit replaces the list whole, as with the free-text lists. The column and field are `elements`, in the database, the shared schema, GraphQL and the form. Until MB.159 it was a single nullable `element`, and the move follows rule 10's sequence as MB.134's did: MB.158 adds the list and fills it from `element` where one is set, MB.159 switches every reader and writer and stops declaring the single column, and MB.160 drops it once MB.159 has deployed. The list takes a new name because a column cannot turn from `ingredient_element` to `ingredient_element[]` under a deployed reader.

**`ingredient_folk_names`** — `id`, `ingredientId`, `name`, + audit. The regional and common names an ingredient also answers to.

**`retired_ingredient_slugs`** — `id`, `ingredientId`, `workspaceId` (nullable, the ingredient's scope), `slug`, `retiredAt`, `expiresAt` (generated: the UTC calendar date of `retiredAt` plus 180 days, at 00:00 UTC), + audit. A slug a compendium entry has moved off. While unexpired, and while no entry holds the slug, it answers a 308 to the entry's current slug. Another entry may take it — the admin confirms ending the redirect first — and the page then at the address links to the entry that moved until the window closes; the entry itself may take its own old slug back at once. Expiry is a predicate on `expiresAt`, so the redirect ends at midnight UTC with nothing scheduled, and a lapsed row is hard-deleted by the next compendium write. A coven ingredient's slug follows its name and retires nothing, since no route reads it. Argued in [`mb.80-public-compendium.md`](design-decisions/mb.80-public-compendium.md), superseded in part by [`mb.82-slug-takeover.md`](design-decisions/mb.82-slug-takeover.md).

```sql
CREATE UNIQUE INDEX ingredient_folk_names_unique
  ON ingredient_folk_names (ingredient_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX ingredient_folk_names_trgm
  ON ingredient_folk_names USING gin (name gin_trgm_ops);
```

Uniqueness is per ingredient, **deliberately not global** — several unrelated plants claiming "Cat's Claw" is precisely the thing being documented. A child table rather than the `folkNames text[]` column it replaces, because `array_to_string` is `STABLE` on Postgres 18 and so is legal in neither an expression index nor a generated column: indexing a flattened array would have needed a hand-written `IMMUTABLE` wrapper whose honesty depends on the column staying `text[]`. Folk names were unindexed under the array design; as `text` rows the trigram index is trivial. GraphQL keeps exposing them flattened as `folkNames: [String!]!` (§7), so what a client sees does not change.

**`ingredient_substitutes`** — `id`, `ingredientId`, `substituteId` (nullable), `name` (nullable), + audit. What an ingredient may be replaced with, one row per entry (MB.138): either a link to another ingredient or a name typed for one that is not entered, never both and never neither — the shape MB.40 gave a spell's layers. `CHECK (num_nonnulls(substitute_id, name) = 1)` holds the exclusive-or, `name` is checked non-blank, and `CHECK (substitute_id <> ingredient_id)` keeps an ingredient from substituting for itself. A substitute typed without picking an ingredient is stored as its text, without a warning, and is never resolved into a link behind the member's back. Until MB.140 the list was `ingredients.substitutes text[]`: MB.139 adds the table and copies each entry across as a name, MB.140 switches every reader and writer to it, and MB.141 drops the column once MB.140 has deployed, first copying across any entry the table holds no row for (rule 10).

```sql
CREATE INDEX ingredient_substitutes_ingredient_id
  ON ingredient_substitutes (ingredient_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX ingredient_substitutes_link_unique
  ON ingredient_substitutes (ingredient_id, substitute_id)
  WHERE substitute_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX ingredient_substitutes_name_unique
  ON ingredient_substitutes (ingredient_id, lower(name))
  WHERE name IS NOT NULL AND deleted_at IS NULL;
```

**An ingredient lists a substitute once**, the owner's call: the same ingredient linked twice, or the same name typed twice in any case, is refused, as a folk name repeated on one ingredient is. The two partial unique indexes are the shapes `spell_ingredients` gives its links and custom names, and the shared schema refuses the repeat first, at its position, so neither index is what a member sees. A typed name equal to a linked ingredient's label is not a repeat: one is text and the other a link. The plain index serves the read by parent, which neither unique index can, since a read of all an ingredient's rows implies neither one's predicate.

**A substitute links only what its ingredient's readers may read.** A compendium entry's substitute links another compendium entry and nothing else; a coven ingredient's links a compendium entry or an ingredient of its own coven, never another coven's. The compendium is public and indexable (MB.80), so a link from an entry to a coven's ingredient would publish that ingredient's name, and that it exists, to every reader, where a coven's contents are private (§8); the rule is the isolation every coven read already has, applied to what a row may point at. A coven linking the compendium reveals nothing, since the compendium is everyone's. A CHECK cannot read another row, so the service holds the rule (MB.140): the linked id must be one the writer's own scope reads — the compendium and the proof's coven for a coven write, the compendium alone for an admin's — and anything else is refused as a field error pathed to the entry, asserted by direct id. The read ANDs the same rule, so a row written past it would still show nothing.

**A link to a deleted ingredient is kept, and shown by its last name.** When the linked ingredient is soft-deleted, by its coven or, for a compendium entry, by an admin, the row stays a link and the substitute reads as plain text under that ingredient's name as it was deleted — its last, since no writer touches a deleted row — with nothing to follow, as its page is gone. Turning the row to text at the delete is the alternative, and it fails twice: an admin deleting a compendium entry would rewrite rows in every coven that linked it, the access to a coven's ingredients that M6.6 asserts an admin never has, and v2's restore (§13) could not bring the link back. Dropping a deleted link from the list keeps rule 4 whole, but makes a substitute a member recorded vanish without a word. The cost is a third named finder that reaches a soft-deleted ingredient, beside M5.3's two for what a spell holds and in their shape: it skips the linked ingredient's `deleted_at` and no other filter, and `tests/guards/soft-delete-finder-guard.test.ts` pins it (CLAUDE.md rule 4). As a spell layer does, a link already reaching a deleted ingredient survives a save of its parent, and a new link cannot reach one. Nothing reads from a linked ingredient back to the rows linking it, and an ingredient is never hard-deleted, so no index leads on `substituteId`.

**The rows carry the full audit spread and are soft-deleted**, as `ingredient_folk_names` does, rather than MB.34's four stamps and a hard delete. A substitute is content, a member's text or a member's claim about a practice, not a link between two curated rows, and MB.34's deciding cost does not reach it: nothing joins _through_ the table to another, and a finder selecting _from_ it filters it for nothing. A tombstone is also what v2's history and trash view restore. So the table adds its own `set_updated_at` trigger line (M1.18). A save brings the live rows to the list sent, as folk names are replaced: an entry still listed keeps its row, one no longer listed is soft-deleted, a new one is inserted, and a save that changes nothing writes nothing.

**Substitutes read alphabetically, by the name each shows**, as folk names do, the owner's call — not in the order entered, as the correspondence lists keep theirs (MB.134). The name is the linked ingredient's label, its last once deleted, or the typed text, so a relabelled ingredient moves with its label; the read sorts, and nothing stores an order.

**The picker searches with `ingredientSuggestions`** (§7; built by MB.138): the live ingredients of the compendium and the current coven, exactly what a coven's substitute may link, matched as the compendium search matches, best first, so a typed prefix finds its entry. `commonNameSuggestions` answers with names, not ids; `possibleDuplicates` compares whole names at 0.4, so a prefix finds nothing; and `workspaceIngredients` lists only what a coven holds, which leaves out every compendium entry it has not added. A compendium entry's form reads `compendium(query)`, which holds what its substitutes may link and nothing else.

**`ingredient_deities`** — `id`, `ingredientId`, `deityId` (nullable), `name`, `position`, + audit. The deities an ingredient corresponds to, one row per entry (MB.165): a name, and, when the member picked a curated row, a link to it beside the name. `name` is held on a linked row as well, written in the curated row's spelling (MB.167), so a link whose deity is soft-deleted still reads as its name: the repository's filter drops the deity and nothing else, so it needs no named finder beside the three that reach a soft-deleted ingredient (CLAUDE.md rule 4). `CHECK (btrim(name) <> '')` holds the name non-blank. A deity typed without a pick is stored as its text and never resolved into a link, as a substitute is. Two live deities may share a name, Greek and Roman Hecate, and the link is what tells a pick of one from the other, which the text alone could not. Until MB.167 the list was `ingredients.deities text[]`: MB.166 copied each entry across as an unlinked name, in the order the array held, its `position` counted from 0 and dense, a repeat folding alike copied once at its first place, MB.167 switched every reader and writer to the table, and MB.168 dropped the column once MB.167 had deployed to staging (rule 10), first copying across, after the rows each ingredient held, whatever the deploy before MB.167 had written to it since the fill. **A save brings the live rows to the list sent** (MB.167): an entry is a curated deity's id or a typed name, exactly one; a pick made anew must name a curated deity — live, under a live tradition — and its name is written in that deity's spelling, refreshed on a later save if the deity is renamed; a row still listed keeps its row and takes its new `position`, one dropped is soft-deleted, and a new one inserted. **A held pick is kept**, as a substitute's link is (MB.138): once its deity or tradition is retired it reads as its name, and a save sending back that name, or the deity's id, keeps the row, its link and its name, rather than tombstoning it for an unlinked twin ([`design-decisions/mb.167-read-and-write-the-pick.md`](design-decisions/mb.167-read-and-write-the-pick.md)).

```sql
CREATE UNIQUE INDEX ingredient_deities_position_unique
  ON ingredient_deities (ingredient_id, position)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX ingredient_deities_link_unique
  ON ingredient_deities (ingredient_id, deity_id)
  WHERE deity_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX ingredient_deities_name_unique
  ON ingredient_deities (ingredient_id, lower(name))
  WHERE deity_id IS NULL AND deleted_at IS NULL;
```

**Deities keep the order entered**, the owner's call, unlike substitutes: a deity is a correspondence beside planets, zodiac signs and colours, which keep theirs (MB.134), and one list re-sorting itself after a save would be the odd one out in the form. So the order is stored, as `position`, unique among an ingredient's live rows as a spell layer's `layer_order` is. The position index is also the parent's: it leads on `ingredient_id` and reads the list in order, as `spell_ingredients_spell_id_layer_order_unique` reads a jar, so no plain index on the parent is built. It is checked per row, so a reorder moves the live rows through a scratch offset, as a spell's layers do (MB.167). A member changes the order in the form with MB.170's reorder control.

**An ingredient lists a deity once.** The same deity linked twice, or the same unlinked name typed twice in any case, is refused, by the two partial unique indexes in the shapes substitutes have; the shared schema refuses it first, at its position, so neither index is what a member sees (MB.167). Links to two same-named deities are not a repeat, since they link two rows, and nor is a typed name equal to a linked deity's: one is text and the other a link. A soft-deleted row reserves nothing. **The rows carry the full audit spread and are soft-deleted**, as substitutes are and for their reason, so the table has its own `set_updated_at` trigger line (M1.18).

**References — where a row's information came from (MB.151).** Every compendium entry, and every curated vocabulary row whose content was drawn from somewhere — a deity's filing and spellings, a planet's rulerships — records its sources as `references` rows linked to it. A correspondence is a claim about a practice and a safety note a claim about a plant; the compendium is public and indexable (MB.80), read by people who cannot ask whose claim it is, so an entry carries its sources the way a reference work does. A reference is one source — a book, a chapter, an article, a web page — kept **once** and linked from every row it supports, so a book fifty herbs cite is one row edited in one place, and a row's references read as a bibliography: **Chicago Manual of Style, bibliography form**, the owner's call, because the works this compendium draws on are humanities works written in it, and a reader can take a citation from here to a library. The style is a rendering of stored fields, never a stored string, so one renderer serves the page, the admin's list and the seed's test. **Two tiers, as ingredients are**: `references.workspace_id` is nullable, a compendium reference admin-written and public, a coven's its own, and a row links only what its readers may read — MB.138's substitute rule again — so a compendium entry or vocabulary row links compendium references alone, a coven's ingredient the compendium's or its own coven's, and a member's notebook reaches no other coven and no admin picker. **A compendium entry may save with none**, and an unsourced entry is the admin's second to-do list beside the `unknown` nomenclature (M5.5): requiring one would block the quick entry story 29 protects and hang a fixture on every seeded entry, where a filter makes the gap visible without refusing the row. **A curated seed list records its sources in its seed doc first**, in the same form — the astrology and deity docs do — and the seed writes them as rows (MB.156); a vocabulary that is the project's own design, the categories and the forms, cites nothing. The two tables follow, settled by MB.151 ([`mb.151-references.md`](design-decisions/mb.151-references.md)); MB.152 builds them, MB.153 reads and writes them on an ingredient, MB.154 puts them on the form, MB.155 on the page, and MB.156 seeds the vocabularies' sources.

**`references`** — `id`, `workspaceId` (nullable), `kind`, `authors`, `title`, `container`, `contributors`, `edition`, `volume`, `issue`, `series`, `place`, `publisher`, `published`, `pages`, `host`, `url`, `modified`, `accessed`, `note`, `seedKey`, + audit. One source per row, in the `ingredients` module. `kind` is the enum `reference_kind` — `book`, `chapter`, `article`, `entry`, `web_page` — and decides which rendering the row gets, so the renderer is total over every row the table admits: `chapter`, `article` and `entry` require a `container` (the book, the journal, the reference work), `web_page` requires `url` and `accessed`, `accessed` needs a `url`, and `url` is absolute http(s). `title` is the one required text. Every other column is text as Chicago prints it — `authors` with the first inverted and any role ("Smith, William, ed."), `contributors` as the kind prints them ("Translated by Angela Hall"), `volume` a number on an article and a statement on a book ("2 vols."), `host` the repository a print work was read through ("Perseus Digital Library, Tufts University"), `published` at whatever precision the work gives ("1985", "November 1950", "Summer/Autumn 2013", "1882–88") — except `modified` and `accessed`, which are `date`s, since each is always a full day. `note` is a short annotation rendered after the citation in parentheses. Nothing is structured further: a name grammar would invert "Snorri Sturluson", and a date column would refuse a season. Every text column has a non-blank CHECK — `url` through its http(s) one, which already refuses a blank — and no unique index on its fields: nothing short of a librarian identifies a source, an index on any subset of the fields would refuse a legitimate second edition, and the seed recognises its own rows by `seedKey`, the citation it rendered at insert, instead (MB.171; MB.156). What is typed is tidied as it is parsed — spacing, a title's wrapping quotes, a range's en dash, an address's missing `https://`, an edition given as a number — and a date with no year, a page that is not a number, an address with no named host and a day not yet come are refused beside their fields, in the shared schema the form and the service both run (MB.154; [`db/references.md`](db/references.md), "Formatting and checks").

```sql
CHECK (url IS NULL OR url ~ '^https?://');
CHECK (accessed IS NULL OR url IS NOT NULL);
CHECK (kind NOT IN ('chapter', 'article', 'entry') OR container IS NOT NULL);
CHECK (kind <> 'web_page' OR (url IS NOT NULL AND accessed IS NOT NULL));
```

**`reference_links`** — `id`, `referenceId`, `ingredientId`, `deityId`, `deityTraditionId`, `planetId`, `zodiacSignId` (each nullable), `locator`, + audit. One link from one source to one sourced row, MB.40's and MB.138's shape: `CHECK (num_nonnulls(ingredient_id, deity_id, deity_tradition_id, planet_id, zodiac_sign_id) = 1)`, so a new sourced table costs a column, an index and the widened CHECK — a `DROP CONSTRAINT` under its sidecar — where a join table per entity costs a table, a trigger line and a finder each time. The categories and the forms are the project's own design and are not sourced. `locator` is the one thing a link carries — "p. 112", "chap. 13", free text because locators vary by the kind of work — nullable and non-blank, and a source cited at several places in one row names them all in its one locator, "pp. 12–19, 40; chap. 3", the owner's call (MB.154); a bibliography entry names the work, so the renderer leaves it out and the page shows it beside the citation (MB.155). Full audit spread and soft-deleted, as a substitute is: a link is content, and v2's history restores it. One live link per reference per row, held by a partial unique index per sourced column, each leading on the sourced id so it also serves the read by row — a read of one ingredient's links implies the predicate, which a read of all an ingredient's substitutes does not imply of that table's link index — so no plain parent index is built. None leads on `referenceId`: nothing in v1 reads from a reference back to its links, and a reference is never hard-deleted.

```sql
CREATE UNIQUE INDEX reference_links_ingredient_unique
  ON reference_links (ingredient_id, reference_id)
  WHERE ingredient_id IS NOT NULL AND deleted_at IS NULL;
-- and the same for deity_id, deity_tradition_id, planet_id and zodiac_sign_id
```

**A link names only what its row's readers may read** — the tier rule MB.138 gave substitutes, held in the service (MB.153) since a CHECK cannot read the reference's row: a compendium entry's or a vocabulary row's link names a compendium reference, a coven ingredient's names the compendium's or its own coven's, and anything else is a field error pathed to the entry. A compendium reference is written under the `SiteAdmin` proof alone and a coven's under its `Membership`, whoever links it: a member who links a compendium reference reads it and cannot change it. An edit reaches every row linking the reference — the point of keeping a source once — and a compendium-tier edit revalidates the `compendium` tag.

**References read alphabetically by the rendered citation**, as a bibliography does, so nothing stores an order. The key is the plain citation, less a leading quotation mark and an initial _A_, _An_ or _The_, compared case- and accent-insensitively; the citation exists only in TypeScript, so the service sorts, as `folkNamesOf` does. The picker's search, `referenceSuggestions` (§7), cannot match the citation, since rule 7 filters in SQL, so it matches `authors`, `title` and `container` as the compendium search matches names, scoped to the compendium and the current coven.

**Nothing deletes a reference in v1.** The writers are the ingredient form — `createReference`, `updateReference`, and the links inside the ingredient's own save, brought to the list sent as folk names are — and the seed (MB.156); the admin vocabulary pages gain no field. Unlinking soft-deletes the link. A reference whose every link is gone stays live and suggested: a source is reusable, and sweeping it would delete a coven's record, or an admin's seeded row, behind their back. Should a reference ever be soft-deleted, by hand or by v2, its links are untouched and the read joins live references only, so it leaves every bibliography and a restore returns it — the opposite of the substitute rule, because a deleted reference is a retracted source where a deleted ingredient is a fact a member recorded, and because it needs no cross-tier write and no new rule-4 exception.

**Owned by `ingredients`, not a sixth module.** The link table keys into `ingredients`, which `vocabulary` may not import, and the links are written inside the ingredient's transaction, which a module above `ingredients` could not be called from without a cycle. A vocabulary row's references are therefore read from `ingredients`, as `User.memberships` is added from `coven`, and the compendium-tier rows join the tier seam's extraction unit (claude-docs/modules.md).

**The citation is rendered, never stored**, by one pure function, `renderCitation` in `src/lib/citation.ts`, beside `slugify` because the page, the picker, the service's sort and the seed's test all call it and it imports no module. It returns parts, each `{ text, italic }`; `citation` on the wire is the parts joined, plain, and a surface that shows italics renders the parts itself. The kind supplies the default italics — a book's title, a chapter's or article's container — and a writer marks any other with `_…_` in `title`, `container` or `note`, under CommonMark's rule that an underscore inside a word is not a mark, so a reference work used as a site (`_Internet Encyclopedia of Ukraine_`) is italic and `Greek_Mythology` in a URL is not; `url` is never parsed, and a marked span inside a field already italic renders roman. An entry's container and a web page's site are roman unless marked, as "Wikipedia" and "World History Encyclopedia" are printed in the seed doc. A test joins the parts back with `_` around the italic ones, which is the seed doc's own Markdown, so the seed's and the page's tests compare strings. Per kind, with the optional fields dropping cleanly, each part ending in a period it does not already carry, a quoted title taking its period inside the quotes, a date printed "October 6, 2026", and `Place: Publisher, Published` losing each missing piece with its punctuation — one example each from [`db/deity-vocabulary-seed.md`](db/deity-vocabulary-seed.md), and more in [`db/references.md`](db/references.md):

- **`book`** — Authors. _Title_. Contributors. Edition. Volume. Series. Place: Publisher, Published. Host. Last modified Modified. Accessed Accessed. URL. (Note)
  Simek, Rudolf. _Dictionary of Northern Mythology_. Translated by Angela Hall. Cambridge: D. S. Brewer, 1993.
- **`chapter`** — Authors. "Title." In _Container_, Contributors, Pages. Edition. Volume. Series. Place: Publisher, Published. Host. Last modified Modified. Accessed Accessed. URL. (Note) — the contributors as a chapter prints them, "edited by …", after its book
  Pope, Marvin H. "Anath." In _Encyclopaedia Judaica_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath.
- **`article`** — Authors. "Title." _Container_ Volume, no. Issue (Published): Pages. Host. Last modified Modified. Accessed Accessed. URL. (Note) — and without a volume, _Container_, Published, Pages
  Nwokocha, Eziaku Atuama. "An Equilibrist Vodou Goddess." _Harvard Divinity Bulletin_, Summer/Autumn 2013. Accessed October 6, 2026. https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/.
- **`entry`** — Authors. Container, Edition, s.v. "Title." Contributors. Place: Publisher, Published. Host. Last modified Modified. Accessed Accessed. URL. (Note)
  Wikipedia, s.v. "Guanyin." Last modified December 28, 2024. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Guanyin.
- **`web_page`** — Authors. "Title." Container. Publisher. Published; last modified Modified. Accessed Accessed. URL. (Note) — "Last modified" capitalised when it stands without a published date
  Cartwright, Mark. "Greek Mythology." World History Encyclopedia. July 29, 2012. Accessed October 6, 2026. https://www.worldhistory.org/Greek_Mythology/.

**`ingredient_forms`** — `id`, `name`, `slug`, `groupId`, `description`, `seedKey`, + audit. Global only, admin-curated, shaped like `categories` and managed at `/admin/forms` under the same gate as `/admin/categories`. It is the vocabulary behind `ingredients.form`, seeded with the table below (M4.3a). The groups answer the question `form` asks — _what kind of thing are you holding?_ — rather than how it was made: three by source (did it grow, did it come off a creature, was it dug), and three by state for what has lost its source's shape (does it flow, does it hold a shape of its own, or neither). A powdered mineral is therefore a _powder_, and the ingredient's name says what it was. There is no _Other_: a value that fits no form is typed as free text on a coven's ingredient (below), and is added to the vocabulary before a compendium entry may hold it (MB.162), where a catch-all row would let it stand unnamed. `description` is required and non-empty, so a curated value explains itself — `rootBark` can say "the bark of the root, not the stem".

| Group     | Forms                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botanical | herb, root, bark, flower, leaf, seed, fruit, peel, stem, wood, sap, resin, pollen, whole, berry, nut, bud, petal, thorn, moss, mushroom, bulb, pod |
| Animal    | bone, claw, feather, shell, tooth, fur, shed, egg, horn, antler, scale, skin, pearl, coral, specimen                                               |
| Mineral   | crystal, salt, stone, clay, sand, earth, metal, chalk                                                                                              |
| Substance | powder, ash, wax, charcoal, pigment, ointment, soap, incense, paste                                                                                |
| Fluid     | liquid, oil, water, vinegar, spirit, concoction, ink, syrup, honey, perfume                                                                        |
| Curio     | curio, candle, cord, coin, nail, key, charm, bead, bottle, poppet, paper, mirror, bell                                                             |

Twelve of those are the vocabulary as MB.28 first wrote it — herb, root, bark, resin, flower, crystal, oil, curio, salt, powder, liquid and ash — and seventeen more were added for the animal-derived and whole-organism cases (leaf, seed, fruit, peel, stem, wood, sap, pollen, bone, claw, feather, shell, tooth, fur, shed, wax, whole). The rest were chosen when M4.3a seeded the table, and the groups were settled there too: the original three (organism part, preparation, matter) put 21 of 29 rows in one section and named a group after a process rather than a thing. The table above is the seed's source and the seed's test parses it, so the two cannot drift.

**Uniqueness is on the `slug`, and a display name carries no constraint** — the rule MB.35 set for all four vocabulary tables, and on `ingredient_forms` it leaves one gap open deliberately. Two live forms may both be called "Wax", one an _animal_ part (the comb as it came from the hive) and one a _substance_ (rendered and set), and since `ingredients.form` stores the string, the text alone cannot tell the two rows apart. The autofill is where that ambiguity is resolved instead: a suggestion carries its group and is rendered with it, so the dropdown offers "Wax (animal)" beside "Wax (substance)" and the reader picks the one they mean, and the pick is kept, as `ingredients.formId` beside the text (MB.165, below), so a picked "Wax" still says which after the save, and the entry form shows its group beside the text until the text is edited away from it (MB.169). A typed one says no more than its text. A unique index on the name would have refused the second row instead, deciding for the admin that wax is one thing; the group label buys the disambiguation without deciding that question. **So a form's slug is its name and its group** — `formSlug(name, group)` in `src/lib/slugify.ts`, `wax-substance` — and a deity's its name and its tradition's (MB.132), where every other vocabulary row's is its name: a slug of the name alone would put both "Wax" rows at `wax`, and the index would refuse what this paragraph allows. It follows a rename and a regrouping, and a group's rename moves its forms' slugs (M5.6a, [`m5.6a-admin-forms.md`](design-decisions/m5.6a-admin-forms.md)). The seed takes only the substance sense and leaves the other row for an admin to add. M4.7a returns the group, M5.10a renders it, and M4.2a's schema test asserts the pair of same-named rows is accepted so the gap stays a decision rather than becoming an oversight.

**`ingredient_form_groups`** — `id`, `name`, `slug`, `description`, `seedKey`, + audit. Global only, admin-curated. Seeded with the six above, and open to a seventh: a vocabulary that has already grown twice should not need a migration to grow a third time. No colour — form groups section an autofill dropdown, they are not chips. Groups render alphabetically by `name`, so there is no order column to maintain and an admin-added group lands where a reader would look for it. A form's slug names its group, so renaming a group moves the slug of every live form under it, and deleting one first moves its live forms to another live group the admin picks, each re-slugged there; the forms stay curated, so no ingredient's pick is orphaned or rewritten (M5.6b, [`design-decisions/m5.6b-admin-groups.md`](design-decisions/m5.6b-admin-groups.md)).

**`ingredients.form` is `text`, not a foreign key to this table**, and that is the property the whole design rests on. An FK would key identity on an id and make an unlisted value impossible to write; text lets `canonicalKey` normalise the string and lets a member write `rhizome` before anyone has curated it. To a coven the curated set is a _vocabulary_, not a constraint: the entry form's autofill offers curated values first, each labelled with its group, then in-scope values already in use that are not in it, visibly distinguished. Soft-deleting a vocabulary row rewrites no coven's ingredient: the value stays on its rows and moves into the in-use bucket.

**A pick is recorded beside the text (MB.165).** `ingredients.form_id` is a nullable foreign key to this table, set only when a member picked a curated row and never resolved from typed text, and `CHECK (form_id IS NULL OR form IS NOT NULL)`, `ingredients_form_id_has_form`, keeps a link from standing without its text. The text stays the value and the identity: `canonicalKey` reads `form` and not `form_id`, so an uncurated value stays writable and identity never keys on an id. A link to a soft-deleted row, or to one whose group is soft-deleted, reads as no link, the repository's filter dropping the row, so the ingredient reads as its text, the value moving into the in-use bucket as above, with no soft-delete exception. So a vocabulary a member writes is text, with an optional link beside it to the curated row picked; `ingredient_deities` holds the same for deities. **A save writes a pick only of a curated form** (MB.167) — live, under a live group — with `form` text folding to its name, written in that name's spelling; a `formId` naming anything else is refused beside it, never a 23503, and text that is not the picked form's name is refused beside `form` rather than overwritten. A save sending no `formId` clears the column and keeps the text, so a pick retired since reads, and saves, as typed text. Two entries with one formal name, one picked as each Wax, still share a `canonicalKey`, which stays on the text ([`design-decisions/mb.165-record-the-picked-vocabulary-row.md`](design-decisions/mb.165-record-the-picked-vocabulary-row.md)).

**The compendium is held to the vocabularies (MB.162).** A compendium entry's `form` and each of its `deities` is a pick of a live curated row — a form under a live group, a deity under a live tradition — and its `planets` and `zodiacSigns` each name one; the compendium services refuse anything else as a `ValidationError` beside the field: `['form']` or `['formId']`, or `['planets', i]`, `['zodiacSigns', i]` or `['deities', i]` at the offending entry. A curated form or deity typed rather than picked is refused as an uncurated one is, and a deity pick the entry already holds is refused once its deity is retired, where a coven's is kept (MB.167, which moved the rule onto the pick). A planet or sign matches as the suggestions fold, `lower(btrim(value)) = lower(name)`, and every value is stored in its row's own spelling. The columns stay text, since a coven writes them freely, so the rule is the service's and not a key's; nor is it Zod's, since it reads the database. Nothing is lost by it: the admin who writes the compendium curates the lists, so a value missing from one is added there first, and a stray `Rhizomes` on an entry is refused rather than listed for fixing. It is what makes MB.131's autofill headings true — "From Compendium" for a curated value and "From Coven" for one only in use — since every in-use value outside the lists is then a coven's, and it is why the admin pages carry no curation to-do list of values in use: under it there could be none. Folk names and colours have no curated list and stay free text in both tiers. **The rule holds after the write as well as at it**, the owner's call: soft-deleting a curated row a live compendium entry holds is refused, naming the entries, until the admin edits them, and so is soft-deleting a deity tradition with such a row under it, where deleting a form group moves its forms to another live group instead, so they stay curated (M5.6b); renaming a row carries the new spelling onto every live compendium entry holding it, in the same transaction. A form or a deity is held by the entries that pick it, since a pick names one row (MB.167); a planet or sign is held only while it is the last live curated spelling of its value, since two live rows may share a name. A coven's rows never block a delete and are never rewritten. The rename's rewrite grows with the compendium, and MB.163 moves it off the request ([`design-decisions/mb.162-compendium-holds-curated-values.md`](design-decisions/mb.162-compendium-holds-curated-values.md)).

**`planets`** and **`zodiac_signs`** — each `id`, `name`, `slug`, `description`, `seedKey`, + audit. Global only, admin-curated, managed at `/admin/planets` and `/admin/zodiac-signs` under the same gate as `/admin/forms`. They are the vocabularies behind `ingredients.planets` and `ingredients.zodiac_signs`, and they stand to those columns as `ingredient_forms` stands to `form`, but for the pick it records: the columns stay text — `text[]`, since MB.134 made them lists — with no foreign key and no link beside them, the tables feed the autofill, a value off the list stays writable on a coven's ingredient, a compendium entry holds curated values alone, and deleting or renaming a row treats the two tiers as a form's does (MB.162). Adding a body used to be a deploy — the lists were a TypeScript constant until MB.91, the shape `form`'s vocabulary had before MB.35. Seeded with the table below (MB.93); the table is lower-case, and the seed writes each name in title case as the proper noun it is (`North Node`), its slug derived.

| Vocabulary   | Values                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planets      | sun, moon, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, pluto, chiron, ceres, pallas, juno, vesta, lilith, north node, south node |
| Zodiac signs | aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, ophiuchus, sagittarius, capricorn, aquarius, pisces                                      |

The bodies run the luminaries, the planets outward from the Sun, then the other bodies modern practice reads; Ophiuchus sits where the sidereal thirteen-sign zodiac puts it. Earth, Chiron, the lunar nodes and Ophiuchus are listed because practices use them, not because a source gives them herb correspondences — few do, and "few sources" is not a reason to refuse a practice. A body a practice reads that is not listed, Eris or Sedna, is typed as free text on a coven's ingredient, and is curated before a compendium entry may name it (MB.162). The sources the lists were drawn from are in [`db/astrology-vocabulary-seed.md`](db/astrology-vocabulary-seed.md).

**One tier, not two.** Neither vocabulary has a group: nineteen bodies and thirteen signs section nothing, so there is no group table, no colour, and the seed is a flat helper rather than the two-tier one the forms and categories share. **Two tables rather than one with a `kind` column**, by the argument that settled the groups (§14): a planet query that forgot its `kind` predicate would offer Scorpio for `planet`, and two tables make that query unwritable rather than merely wrong.

**`description` is required and non-empty**, as on `ingredient_forms`, and it is search surface: the suggestion query matches it as well as the name, and a name match outranks a description match. So a description names the words a reader reaches for — Lilith's says _Black Moon_, the nodes' say _Rahu_ and _Ketu_, Ophiuchus's says _Serpentarius_. The same requirement is why a value cannot be curated in one click: the admin writes its description with it. **No order column**: the admin lists are alphabetical by `name`, as the groups are, and the autofill ranks by match — the seed order above is the order the table reads in, not a sort key.

**The two readers are scoped differently.** A member's autofill offers curated values first, then uncurated values already in use in the compendium and the current workspace, as `form`'s does. The admin's reads the compendium tier only — the live entries holding a value, which refuse its delete and take its rename (MB.162) — since an admin has no access to any workspace's ingredients, so a workspace's uncurated `Eris` never reaches `/admin/planets`, and a workspace's `Moon` never blocks a delete. A value is uncurated when its trimmed, lower-cased form matches no live row's lower-cased name, so `Moon` and `moon` on two ingredients are one curated value. A value in use is an entry of a list, so both readers unnest the column first, and a value counts once however many lists hold it — the scan the retired `deities[]` needed too (MB.136 builds it, MB.130 adopts it).

**`deities`** — `id`, `name`, `slug`, `description`, `traditionId`, `seedKey`, + audit; and **`deity_traditions`** — `id`, `name`, `slug`, `description`, `seedKey`, + audit. Global only, admin-curated, managed at `/admin/deities` and `/admin/deity-traditions` under the same gate as `/admin/forms` (MB.127, tables MB.128). They are the vocabulary behind an ingredient's deities, and they stand to them as `ingredient_forms` and `ingredient_form_groups` stand to `form`: each deity stays text, the curated row a member picked recorded beside it as `form_id` is beside `form` — in `ingredient_deities` (MB.165, above), which replaced `ingredients.deities text[]`, dropped by MB.168 — a value off the list stays writable on a coven's ingredient, a compendium entry holds curated deities alone, deleting or renaming a row treats the two tiers as a form's does (MB.162, on the pick since MB.167), and `traditionId` is a key because only an admin writes it. **Grouped by tradition, the owner's call**, one tradition per deity: a suggestion reads "Hecate (Greek)", as a form's reads "Wax (Substance)", because every tradition has its thunder god and its Moon, and a member choosing among many reads the tradition to choose. A god several traditions honour is filed under one, and the description names the others. **A tradition is a people or a religion, never a region**: Irish, Welsh, and Gaulish and British rather than Celtic, Taoist, Chinese Buddhist and Chinese folk rather than Chinese, Akan, Igbo and Yoruba rather than African — the owner's call, so a member reads the tradition a practice names and no living religion is filed as a region's footnote, at the cost of a few traditions of one or two rows. **`description` is required on both**, as on the forms and the planets, and on a deity it is search surface: it carries the tradition and the other spellings a reader types (_Hekate_, _Freyja_, _Guanyin_), so the curated row is found by them. Traditions list alphabetically and carry no colour, as form groups do. The seed is thirty-five traditions and 216 deities, too many rows to be specification, so the list, its order and its sources are in [`db/deity-vocabulary-seed.md`](db/deity-vocabulary-seed.md) rather than here (MB.129 seeds it). The readers are the planets' two, scoped the same way, and a deity is curated only while its tradition is live, as a form is only while its group is — so deleting a tradition first moves its live deities to another live tradition the admin picks, as deleting a form group moves its forms, and no entry's pick is orphaned. **A deity's slug is its name and its tradition's**, `deitySlug(name, tradition)` — `hecate-greek` — for the reason a form's carries its group: one god honoured under two traditions is two rows, and a slug of the name alone would put both at one address. A tradition's rename and a move re-slug its deities as a form group's do its forms (MB.132, [`design-decisions/mb.132-admin-deities.md`](design-decisions/mb.132-admin-deities.md)).

**`categories`** — `id`, `name`, `slug`, `description`, `groupId`, `seedKey`, + audit. Global only, admin-curated. Suggestions in v2. Seed list in §6. **No colour of its own** (M4.2): MB.35 moved the chip colour onto the group as a pair of hexes, one per theme, and a single `color` column here could hold neither half of it. A category wears its group's pair — which is also what §6's grouping is for, eight families rather than 63 individually-tinted chips.

**`category_groups`** — `id`, `name`, `slug`, `colorDark`, `colorLight`, `description`, `seedKey`, + audit. Global only, admin-curated, managed at `/admin/category-groups` under the same gate as the rest of `/admin`. §6 seeds eight; an admin may add a ninth, and groups render alphabetically by `name`. The two colours are the chip colour every category in the group wears, one per theme, stored as hexes on the row rather than looked up from a build-time token — the point of the change, since a group created at runtime cannot have a Sass variable. Two columns rather than one because the grounds differ: every seeded group is tuned separately per theme (a dark-theme colour is lifted, a light-theme colour is darkened), and one hex cannot clear 4.5:1 on both soot and parchment without being mud on at least one. Each is validated on write against its own theme only, and there against the harder of that theme's two surfaces — `colorDark` against the dark card, `colorLight` against the light page — so the check is exact rather than a compromise, and the admin sees both swatches while picking. The harder surface because an unselected chip's label is the colour itself on whatever surface holds it, a page or a card; clearing the harder one clears both, and the selected chip's label, which is the page surface (MB.36). The pair keeps one hue, to within 10°, so a chip changes shade with the theme and never family, and the admin page fills the second colour from the first (M5.6b). Deleting a group first moves its live categories to another live group the admin picks, in the same write, so no category is left under a deleted group still holding its address (M5.6b).

**`seedKey`, on every table the reference seed writes** (MB.171) — the eight vocabularies above and `references`. Nullable text, under a partial unique index `(seed_key) WHERE seed_key IS NOT NULL AND deleted_at IS NULL`: the identity the seed gave a row when it wrote it — a vocabulary row's slug at insert, a reference's rendered citation — and never changed after, null on a row an admin or a member writes. A reseed runs on every deploy that touches a seed file, and recognising its rows by what an admin can change, a slug that follows the name or a citation that follows its fields, would put the original back beside every row an admin renamed or edited. No input, service or GraphQL field names it. The scenarios key by fixed id on fresh databases and `reference_links` by two ids, so neither carries one ([`design-decisions/mb.171-seed-keys.md`](design-decisions/mb.171-seed-keys.md)).

**Two group tables, not one with a `kind` column.** A shared table would let `categories.groupId` point at a form group: the failure would be invisible until something rendered, where two tables make it a foreign-key violation. That is the _impossible-versus-absent_ distinction the rest of this document turns on, applied to the cheapest possible case.

**`categories.groupId` and `ingredient_forms.groupId` are foreign keys, unlike `ingredients.form`** — and the asymmetry is deliberate rather than an inconsistency. `ingredients.form` stays free text because a _member_ writes it, and must be able to write `rhizome` before an admin has curated it. Only an admin writes a category or a form, and only an admin writes the groups they point at, so there is no one to be blocked by a group that does not exist yet — and the referential integrity is worth having, since a typo'd group silently empties a chip section. The rule generalises: a vocabulary a member writes is text, a vocabulary only an admin writes is a foreign key.

**`ingredient_categories`** — `ingredientId`, `categoryId`, + audit stamps. Composite primary key on the pair, no `deleted_at`, hard-deleted. A second, non-unique index leads on `categoryId` so the pair is readable in both directions: the key answers "what is this ingredient tagged with", and the index answers "what is in this category" without scanning every assignment.

**`spell_categories`** — `spellId`, `categoryId`, + audit stamps. Composite primary key on the pair, no `deleted_at`, hard-deleted. A second, non-unique index leads on `categoryId`, exactly as on `ingredient_categories`: the key answers "what is this spell tagged for", and the index answers "which spells are tagged for prosperity" — §9's grimoire list is filterable by category (M10.11), so that direction has a reader. `spell_ingredients` gets no such index because no v1 feature lists spells by ingredient; the asymmetry between the three join tables is which directions are actually queried, not an oversight in any of them.

**`inventory_items`** — `id`, `workspaceId`, `ingredientId`, `quantityOnHand`, `unit`, `unitDimension`, `lowStockThreshold`, `source`, `acquiredDate`, + audit.

Unique on `(workspaceId, ingredientId) WHERE deleted_at IS NULL`. Units cover three dimensions, metric and imperial in each: **weight** — mg, g, kg, oz, lb; **volume** — ml, l, tsp, tbsp, fl oz, cup; **count** — piece, drop, pinch. `unitDimension` is stored alongside `unit` rather than derived at each call site, so a query can filter or group by it; a row whose dimension contradicts its unit cannot be written. One shared module owns the unit-to-dimension map, imported by both the Zod schema and the conversion library so the list cannot drift in two places.

`lowStockThreshold` is written onto the row at creation with a dimension-appropriate default (3 for count, 10 g for weight, 15 ml for volume, converted into the row's unit), not left null and defaulted at read time.

**`spells`** — `id`, `workspaceId`, `title`, `intent`, `jarSize`, `sealWaxColor`, `moonPhase`, `dayOfWeek`, `instructions`, `status` (`draft` | `complete`), `visibility` (`private` | `workspace`, default `workspace`), + audit.

**Visibility.** A `workspace` spell is readable by every member, viewers included. A `private` spell is readable only by its author — against owners too. Owners and members create and edit; viewers create and edit nothing, including private spells.

**The transition is one-way:** `private` may be widened to `workspace`, and `workspace` may never be narrowed back to `private`. Once a spell is part of the shared grimoire the others have read it and may have built on it; hiding it afterwards would retract something they were relying on. Widening is a gift, narrowing is a retraction, so only one is allowed. Enforced in the service and asserted by test (§8, §11), not merely absent from the UI. This rule governs visibility, not existence — a shared spell can still be deleted.

**`spell_ingredients`** — `id`, `spellId`, `ingredientId` (nullable), `name`, `form`, `quantity`, `unit`, `layerOrder`, `note`, + audit. Soft-deleted, unlike the other two join tables (MB.110), and so keyed on a surrogate `id`: a removed layer's tombstone must not go on holding its depth, so `(spellId, layerOrder)` is a partial unique index over live rows instead. (`note` here is a short free-text line on one ingredient's role in the jar, unrelated to the deferred notes subsystem.)

References the ingredient, not the inventory item, so a saved spell survives running out of something.

**Nor does a spell lose an ingredient that is deleted** (M5.3). A spell is a record of a working, so a layer keeps reaching the ingredient it links after that ingredient is soft-deleted, by an admin or by its coven: it is shown as it was, its categories still count toward the spell's derived categories, and its safety notes still warn. A layer leaves a spell only when a user removes it from the spell, and MB.110 makes that removal a soft delete too. The spell stays editable — a layer already linking a deleted ingredient survives a save, and a new layer cannot link one — and its history is v2's, where a layer pins the ingredient's exact revision (§13, "Edit history"). [`m5.3-spells-keep-deleted-ingredients.md`](design-decisions/m5.3-spells-keep-deleted-ingredients.md) carries the argument.

**A layer is either an ingredient or a custom name — never both, never neither** (MB.40, story 57). `ingredientId` points at an `ingredients` row; `name`, with an optional free-text `form` (not a foreign key, for the same reason `ingredients.form` is not), is a one-off ingredient written for this jar alone. `CHECK (num_nonnulls(ingredient_id, name) = 1)` holds the exclusive-or — the same idiom §14 blesses for the deferred notes model — `CHECK (ingredient_id IS NULL OR form IS NULL)` keeps `form` off a linked row, where it would shadow half the ingredient's identity, and both text columns are checked non-blank. Two partial unique indexes carry the two identities, each over live rows only: `(spellId, ingredientId) WHERE ingredient_id IS NOT NULL` is one ingredient per jar, what the original `(spellId, ingredientId)` key used to give, and `(spellId, lower(name)) WHERE ingredient_id IS NULL` is one custom name per jar, in the shape of the workspace label index. The key moved onto the layer because the pair no longer exists on every row, and off it onto a surrogate `id` once removing a layer became a soft delete (MB.110).

A custom row lives inside its spell and shares its visibility. It is never an `ingredients` row: it does not appear on the workspace's ingredients page, does not enter local-beats-compendium suppression, contributes nothing to derived categories, has no safety note to surface and no stock to be held or not held. Reusable is a different thing and already exists — a workspace-local `ingredients` row with only a `name` (story 29). Removing one is a soft delete, as removing any layer is (MB.110). What reads through the table — derived categories, on their way to `ingredient_categories` — reads it by `existsIn`, which filters a removed layer by construction. [`mb.40-custom-spell-ingredients.md`](design-decisions/mb.40-custom-spell-ingredients.md) carries the alternatives.

**Notes are deferred to v2.** The first-class `notes` model and its `private | workspace | public` visibility model are specified in §13. Nothing in v1 writes a note, and no v1 table references one. `notes` is the reason the ingredient detail page (§9) is built to take a section beneath it without restructuring.

### Ingredient identity — the formal name plus the form

Common names are regional and ambiguous. "Cat's Claw" is _Uncaria tomentosa_, _Uncaria guianensis_, _Senegalia greggii_, _Dolichandra unguis-cati_ — and a literal claw from a cat. "Snakeroot" is five unrelated plants. Story 21's own example, finding "Devil's Shoestring" without recalling it is honeysuckle root, is itself an ambiguous name. A safety note hung on an ambiguous label is the dangerous case, because comfrey and foxglove leaf are confused in the real world: `safetyNotes` is the argument for demanding a formal name in the curated tier, and uniqueness on `lower(name)` was what stopped the compendium holding the ambiguity at all. So identity moved off the label.

Five columns are easy to confuse, so the division is stated once:

| Column          | Answers                                                  | Constrained                                                   | Why it is that way                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | What is this called **here**?                            | free text; unique per workspace, not unique in the compendium | The display label, freely relabellable now that identity has moved off it                                                                                                                                                 |
| `canonicalName` | What is its **formal name**?                             | free text, no format regex                                    | Identity. Required in the compendium, optional in a workspace                                                                                                                                                             |
| `nomenclature`  | **Which naming system** does that formal name belong to? | enum, `NOT NULL`, no default                                  | Separates "no system names this" from "one does and nobody looked it up"; drives rendering, since a scientific name is italicised and a mineral or chemical name is not; and makes the compendium requirement enforceable |
| `form`          | What kind of thing are you **holding**?                  | free text, autofilled from `ingredient_forms`                 | Identity-bearing: valerian root and valerian leaf are different ingredients. Open-ended, so no enum and no foreign key on the text; a pick records its curated row beside it, in `formId`, which is not identity (MB.165) |
| `elements[]`    | Which classical elements does it **correspond to**?      | a list of an enum of five values                              | A **correspondence**, beside `planets[]`, `zodiacSigns[]`, `deities[]` and `colors[]` — not identity. Earth/air/fire/water/spirit is a closed, fixed set: the exact opposite of `form`                                    |

**`nomenclature` names which naming system the formal name belongs to, not which rank within it.** `canonicalName` is the most specific accepted name _at the granularity the entry exists at_, written in that system's conventional form. Miss that rule and the crystal drawer collapses: amethyst, citrine, rose quartz, smoky quartz, agate, carnelian and onyx are all the species _Quartz_, selenite, satin spar and desert rose are all _Gypsum_, and the compendium could hold exactly one of each set. Outside minerals, sea, kosher and Himalayan pink salt are all sodium chloride, and `'Hidcote'` and `'Munstead'` lavender are both _Lavandula angustifolia_.

| Entry                                | `nomenclature` | `canonicalName`                     |
| ------------------------------------ | -------------- | ----------------------------------- |
| Amethyst                             | `mineral`      | `Quartz var. amethyst`              |
| Selenite                             | `mineral`      | `Gypsum var. selenite`              |
| Lapis lazuli — a rock, not a species | `mineral`      | `Lapis lazuli`                      |
| Hidcote lavender                     | `botanical`    | `Lavandula angustifolia 'Hidcote'`  |
| A cat's claw                         | `zoological`   | `Felis catus`, with `form = 'claw'` |
| Graveyard dirt                       | `none`         | — no system names it                |

Where a system genuinely gives two entries the same most-specific name — sea salt and Himalayan pink salt are both `Sodium chloride` — the form is what separates them; where the form does not separate them either, they are one identity by this model, and that is the answer rather than a bug.

**No format regex on `canonicalName`.** Real names include `Artemisia spp.`, `Lavandula angustifolia 'Hidcote'`, `subsp.` and `var.` ranks, and author citations like `Salvia officinalis L.` — a binomial regex rejects valid names, which is the same silent guess §11's `unitConvert` rule already forbids. Two of the four Cat's Claws were renamed at genus level in the last two decades, which is the argument again. For related reasons there is **no external identifier column** — POWO, IPNI, GBIF, CAS, IMA — in v1: nothing reads one, taxonomic ids churn, and a nullable text column is purely additive later.

`nomenclature` has seven values:

| Value        | Governs                                                                | Examples                                                                                                               |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `botanical`  | ICN                                                                    | _Uncaria tomentosa_, _Laurus nobilis_, _Artemisia spp._                                                                |
| `fungal`     | ICN — see the note below                                               | _Amanita muscaria_, _Ganoderma lingzhi_                                                                                |
| `zoological` | ICZN                                                                   | _Apis mellifera_ (beeswax), _Felis catus_ (a claw)                                                                     |
| `mineral`    | IMA species and varieties, plus rocks, mineraloids and natural glasses | `Quartz var. amethyst`, `Lapis lazuli`, `Moldavite`                                                                    |
| `chemical`   | IUPAC, or the accepted chemical name                                   | `Sodium chloride`, `Potassium nitrate`, `Sulphur`                                                                      |
| `unknown`    | —                                                                      | There **is** a formal name and its classification is unsettled. `canonicalName` may hold it, unconfirmed, or be null   |
| `none`       | —                                                                      | No system names this: graveyard dirt, moon water, a coffin nail, black salt (a _preparation_). `canonicalName IS NULL` |

**`fungal` splits on organism, not code, and that is deliberate.** Fungi are governed by the ICN alongside plants, so `fungal` is the one value that does not correspond to a nomenclatural code of its own. It is kept because curators shelve mushrooms separately from herbs. A later reader should not "correct" the departure away — it is recorded in §14 for exactly that reason.

`unknown` earns its place because `none` is a **positive claim**. Without `unknown`, an admin's only truthful option for an un-researched plant is to lie into `none`, and `WHERE nomenclature = 'unknown'` is a findable curation to-do list. **An `unknown` entry may carry its formal name** (MB.161): a member who knows the Latin but not whether a lichen is botanical or fungal records the name and leaves the classification open, rather than guessing one or dropping the name. Its rows on the to-do list then need a classification chosen, and those without a name need the name looked up too; the formal-name column tells them apart, so the list stays one. This is the project's own idiom: `unitConvert` refuses a cross-dimension conversion as an explicit result the caller must handle rather than guessing.

```sql
  nomenclature   nomenclature_kind NOT NULL,          -- no DEFAULT, deliberately
  canonical_name text,
  form           text,                                -- vocabulary, not a foreign key
  form_id        uuid REFERENCES ingredient_forms (id), -- the row picked, not identity
  canonical_key  text NOT NULL GENERATED ALWAYS AS (
                   lower(COALESCE(canonical_name, name))
                   || COALESCE(' :: ' || lower(btrim(form)), '')
                 ) STORED,

  CONSTRAINT ingredients_nomenclature_declares_canonical_name
    CHECK (nomenclature = 'unknown'
           OR (nomenclature = 'none') = (canonical_name IS NULL)),
  CONSTRAINT ingredients_canonical_name_not_blank
    CHECK (canonical_name IS NULL OR btrim(canonical_name) <> ''),
  CONSTRAINT ingredients_form_not_blank
    CHECK (form IS NULL OR btrim(form) <> ''),
  CONSTRAINT ingredients_form_id_has_form
    CHECK (form_id IS NULL OR form IS NOT NULL)
```

The first CHECK is a biconditional everywhere but `unknown`, and is asserted in both directions: `none` carrying a formal name is rejected, any of the five named kinds carrying none is rejected too, and `unknown` saves either way (MB.161). Folding the form into the key is what makes _Valeriana officinalis_ root and leaf two identities — two entries, two sets of correspondences, two safety notes — and what separates the cat's-claw vine from the literal claw. `form_id` stays out of the key: it records which curated row a pick named (MB.165), and two entries with one formal name, one picked as each Wax, are one identity, as two typed `Wax`es are. Every function in the expression (`lower`, `btrim`, `||`, `COALESCE`) is `IMMUTABLE` and no enum cast is involved, so the generated column is legal: freeing `form` from an enum is in fact what makes the expression possible. `lower(btrim(...))` collapses `Root Bark` onto `root bark`; `rootbark` is left to the autofill, exactly as with folk names. `canonicalKey` is `GENERATED ALWAYS`, so Postgres refuses a direct write — and Drizzle omits generated columns from `$inferInsert`, so TypeScript refuses first.

**The missing default binds code paths, not users.** The workspace-local Zod variant supplies `nomenclature: 'none'` when the formal-name field is blank, and `'unknown'` when a formal name comes without a classification (MB.161), so story 29 and "saving with only a name succeeds" hold verbatim; the compendium variant makes the admin answer. The kind↔name coupling is enforced in Zod as well as in the database, so the CHECK is never what a user sees.

Three partial unique indexes, where the label alone previously needed two:

```sql
CREATE UNIQUE INDEX ingredients_compendium_identity_unique
  ON ingredients (canonical_key)
  WHERE workspace_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX ingredients_workspace_identity_unique
  ON ingredients (workspace_id, canonical_key)
  WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;

-- Label uniqueness survives in the workspace tier only: inside one drawer an
-- ambiguous label is a mistake, not a distinction.
CREATE UNIQUE INDEX ingredients_workspace_label_unique
  ON ingredients (workspace_id, lower(name))
  WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;
```

In the compendium four rows may display "Cat's Claw", told apart by their formal names; that is what the dropped label index buys. A unique _constraint_ cannot carry `WHERE deleted_at IS NULL`, and `NULLS NOT DISTINCT` exists only on constraints, so the two tiers stay separate partial indexes rather than one index over `(workspace_id, canonical_key)`.

**Relabelling is safe, with one narrow exception worth stating:** identity is stable under relabelling only for rows that _carry_ a formal name. A `none` row's key **is** its label, so relabelling such a row does change its key.

One consequence of the `COALESCE` merging two namespaces into one key: a `none` entry whose _label_ equals another entry's _formal name_ collides, and the raw error names a column the admin never filled in. Rare, arguably correct, and M5.2's writes translate it into a readable message naming the colliding entry, on `name`, which M5.5's form shows beside that field.

**Display name: no new column.** `name` remains the display label in both tiers. Choosing a folk name as the display name is a **swap** between `ingredients.name` and one `ingredient_folk_names` row — a two-value exchange in one transaction, which rows make cleaner than array juggling. Absent a selection, `name` is prefilled from `canonicalName` at write time, matching `lowStockThreshold`'s idiom of writing the default onto the row rather than defaulting at read time. A swap on a compendium row is **global**: a workspace cannot hold its own display preference for a shared entry without another table, which is out of scope for v1, and the UI says so before the swap.

**Local beats compendium on identity, and on the label only as a fallback.** A compendium row is suppressed in a workspace's results when a non-deleted local row in that workspace matches it on `canonical_key`, **or — only when the local row declares no formal name — on the display label**, case-insensitively. The local entry wins, badged as local. Keying purely on `canonical_key` would regress the common case, since a local stub has no formal name and local "Mugwort" would stop suppressing compendium "Mugwort / _Artemisia vulgaris_"; keying purely on the label hides the wrong plant. The `canonicalName IS NULL` gate is the crux: a local that _declared_ an identity must not suppress a differently-identified row for merely sharing a label, and a local that declared nothing has only its label to go on. Suppression is an anti-join in SQL (§3's rule 7) — never both sets fetched and filtered in the resolver — and it is served by the two workspace-tier indexes, so it needs no index of its own.

```sql
SELECT c.* FROM ingredients c
WHERE c.workspace_id IS NULL AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM ingredients l
    WHERE l.workspace_id = $1 AND l.deleted_at IS NULL
      AND ( l.canonical_key = c.canonical_key
            OR (l.canonical_name IS NULL AND lower(l.name) = lower(c.name)) ) );
```

| Local (label / formal name) | Compendium                | Result                                                                                          |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| Mugwort / —                 | Mugwort / _A. vulgaris_   | compendium suppressed                                                                           |
| Cronewort / _A. vulgaris_   | Mugwort / _A. vulgaris_   | suppressed — labels differ, identity matches                                                    |
| Mugwort / _A. vulgaris_     | Mugwort / _A. absinthium_ | **both shown** — different plants                                                               |
| Graveyard dirt / `none`     | Graveyard dirt / `none`   | compendium suppressed                                                                           |
| Cat's Claw / —              | Cat's Claw ×4             | all four suppressed — over-suppression, and what the fuzzy warning flags before the stub exists |

A workspace-local ingredient may therefore share a label, and an identity, with a compendium entry. Forbidding the collision would block someone who disagrees with an admin's correspondences from keeping their own version.

**Entry-time lookups are permission-scoped, and that is a leak rather than a nicety.** When someone types a common name or a form, the field suggests from the compendium and the current workspace only, never another workspace — and both halves are scoped: the suggested **strings** as well as the attribution list of which in-scope ingredients already claim them, each shown with its formal name so the ambiguity is visible at the moment of entry. A naive implementation gathers distinct values globally and scopes only the attribution, which reveals that another workspace holds the string. `ingredient_forms` is global and admin-curated, so its rows need no scoping; the in-use values outside it do. A curated form suggestion is shown with its group — "Wax (substance)" — because the vocabulary permits two live rows to share a display name (§5), and the group is the only thing that tells them apart. The common names in use are the display names and folk names of in-scope entries — "Cat's Claw" is a label before it is anyone's folk name — and a claiming entry with no formal name is shown by its label rather than dropped. Picking a suggestion writes the string into this ingredient's own folk-name row — it links no records, and each ingredient keeps its own list.

**A curated form is matched on its description as well as its name.** The vocabulary is deliberately short — one row per kind of thing, not one per word people use for it — so `ointment` covers what a reader may call a salve or a balm, and `shed` what they may call a moult. Matching the name alone would offer nothing for either, and the value would be typed uncurated: the vocabulary would look thin exactly where it is doing its job. So each row's description carries the words it stands in for ("a salve or a balm"), the suggestion query matches them, and the row is offered under its own name — the reader searches in their words and picks the vocabulary's. **A name match always outranks a description match**, so typing `wax` offers _Wax_ above _Candle_, whose description says wax, rather than beside it, and a description match is only ever offered, never filled in automatically. Only the curated vocabulary is searched this way; an in-use uncurated value has no description to search.

### Two kinds of spell category

`spell.categories` is what you **intend** the spell to do. The union of its ingredients' categories is what it is **composed of**. Conflating them would be a bug.

The spell builder shows both side by side, flagging intent categories with no ingredient backing them ("tagged for prosperity but nothing in the jar carries it") and ingredient categories outside the stated intent ("mugwort adds psychic work — intended?"). That comparison is what makes assigned categories worth having rather than redundant.

### Fuzzy duplicate warning

`pg_trgm`, available on Neon (as is `unaccent`, the design's only other extension: it folds the compendium search's accents, §7's `compendium(query:)`, through an `IMMUTABLE` wrapper and expression indexes — `claude-docs/db/compendium-read.md`, "The compendium read"):

```sql
CREATE INDEX ON ingredients USING gin (name gin_trgm_ops, canonical_name gin_trgm_ops);
```

One multicolumn index over both names, plus `ingredient_folk_names`' own trigram index (§5). A multicolumn `gin_trgm_ops` index serves a query on either column alone, so the two names need one index rather than two.

Debounced on the create form's name field. Returns compendium and in-workspace matches above 0.4 similarity on `name`, on `canonicalName`, or on any of the ingredient's folk-name rows.

**The threshold is set explicitly, and the match uses the `%` operator.** Those are two requirements that pull against each other, and getting the combination wrong silently discards the index: `similarity(a, b) > 0.4` is a function call the planner cannot answer from a trigram index, so a query written that way sequentially scans `ingredients` no matter what indexes exist. Only the operators — `%`, `<->` — are indexable. But `%` alone means "similar by `pg_trgm.similarity_threshold`", which defaults to **0.3**, not the 0.4 this design wants. So the threshold is set per transaction and the predicate stays an operator:

```sql
SET LOCAL pg_trgm.similarity_threshold = 0.4;
SELECT … WHERE name % $1 ORDER BY similarity(name, $1) DESC;
```

`%` filters through the index; `similarity()` only ranks what survives, which needs no index. Leaving the threshold to the default and leaving the predicate as a bare `similarity()` comparison are both wrong, in opposite directions — one changes the meaning, the other throws away the index.

Every result carries its formal name: "Did you mean Cat's Claw?" is useless when it could mean five things. Nothing refuses the create on the server; the form asks for an answer — renders as "Did you mean Bay Laurel?" with a link, plus a Create Anyway button, and a save is checked against the name it sends and held as an error on the name, focusing Create Anyway, until the warning is set aside (M5.10). Merge tooling is v2.

---

## 6. Category seed

63 categories in eight groups, and both are a **starting set rather than a closed one** — rows in `categories` and `category_groups`, seeded by M4.3 and editable by an admin afterwards. The grouping heads the category picker's list, so 63 categories read as eight sections rather than one flat list, which would be unusable on a phone (MB.126); that a ninth group is addable without a migration is why the group is a table rather than an enum (§5).

| Group                | Slug                     | Categories                                                                                                       |
| -------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Protection & defense | `protection-and-defense` | protection, warding, banishing, hex-breaking, uncrossing, reversal, nightmare protection, binding                |
| Cleansing & release  | `cleansing-and-release`  | cleansing, purification, release, forgiveness, grief work, shadow work                                           |
| Prosperity & work    | `prosperity-and-work`    | prosperity, wealth, abundance, success, career, business, legal matters, justice, gambling                       |
| Love & connection    | `love-and-connection`    | love, attraction, lust, self-love, friendship, reconciliation, fidelity, harmony                                 |
| Mind & spirit        | `mind-and-spirit`        | psychic work, divination, prophecy, dream work, intuition, wisdom, knowledge, memory, clarity, meditation, truth |
| Wellbeing            | `wellbeing`              | healing, peace, sleep, joy, longevity, strength, courage, confidence                                             |
| Craft & change       | `craft-and-change`       | grounding, manifestation, transformation, creativity, inspiration, glamour                                       |
| Practice & place     | `practice-and-place`     | ancestor work, spirit work, home blessing, safe travel, communication, fertility, familiar work                  |

**Every slug in this section is derived from the name beside it**, by the project's one slug rule (`src/lib/slugify.ts`, the `slugify` package under pinned options) rather than picked by hand — which is why seven of the eight groups read `…-and-…`: the rule expands an ampersand. M4.3 seeds them that way and M5.6's admin mutations slug a new one identically, so a category an admin adds lands in the same shape as a seeded one. The column previously named eight hand-picked short slugs, one of which — `grounding`, for "Craft & change" — collided with a category slug inside its own group.

Each category carries `name`, `slug`, `description`, and `groupId`; each group carries `name`, `slug`, `colorDark`, `colorLight` and `description` — the colour lives on the group only (§5, M4.2). The table above is grouped for reading; the app lists groups alphabetically by `name`.

**The eight seeded colours are the owner's hand-tuned pairs, written as hexes in `src/db/seed/category-groups.ts` and nowhere else.** They keep M0.7's hue rotation — each group on its own odd 22.5° step off `$sorrel`, so none lands on the accent or secondary hue — and that rotation is what makes the starting eight read as one family; the seed's test holds both hexes of every pair within 2° of its step. Saturation and lightness are tuned per group and per theme by hand, to clear the contrast floor on each theme's harder surface, not drawn from one formula: M0.7's `$category-groups` Sass map, which lifted every group by one saturation per theme, could not hold them and is retired (M5.6b). M4.3 writes both hexes onto the group row, and migration 0052 carries the retuned pairs onto databases already seeded. What an admin adds afterwards is theirs to pick and will not join that rotation — the write-time contrast floor guarantees it is legible, not that it is harmonious. That is the accepted cost of an open set; a closed one was the alternative.

---

## 7. GraphQL API

Single route handler at `/api/graphql`. No separate service, no additional hosting cost.

**Stack:** GraphQL Yoga (server), Pothos (code-first schema, no ORM plugin — §2), DataLoader, graphql-codegen for client types.

**Client:** `graphql-request` plus TanStack Query, not Apollo. Apollo's normalized cache duplicates what TanStack Query already does here and adds ~40 kB. Codegen (`client-preset`, reading the committed SDL) generates a typed document node per operation into `src/gql/`, and no hooks: the request function runs a typed document through TanStack Query. Forms are react-hook-form with the Zod resolver; the suggesting fields of M5.10a are a headless combobox on Downshift, not react-select — §14 carries both arguments.

**Four rules follow from dropping the Drizzle plugin (MB.20), and bind every M3 task:**

- **Object types are declared by hand**, against the row type the service returns (`typeof ingredients.$inferSelect` and friends) — never a table-derived object type. TypeScript still fails the build when a column's type changes under a field.
- **`auditColumns` maps to one shared `AuditInfo` object type, defined once.** A per-table audit shape is a bug.
- **Every Pothos package in the stack is a stable major.** A `0.x` Pothos plugin entering the dependency tree is a decision argued for in the diff, not a convenience.
- **The GraphQL layer imports `drizzle-orm` for _types_ only.** Runtime query building stays behind `src/db/repository/` (§3's rule 2). A `no-restricted-imports` rule enforces it rather than leaving it to review (MB.33): a runtime import from `src/graphql` fails `npm run lint`, while `import type` — erased at compile time, and so unable to build anything — passes.

None of this rules the plugin out permanently — it is additive, and re-adopting it once it reaches a stable major is a contained change.

### Resolvers are thin

```ts
// src/modules/ingredients/graphql/compendium.ts
builder.queryField('compendium', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: { query: t.arg.string({ required: false }) },
    resolve: (_, { query }, page) => listCompendium({ query }, page), // the filter is the service's, in SQL
  }),
);
```

No database access in a resolver, ever. Same lint rule as `db`.

### The three GraphQL costs, and how each is paid

**N+1 queries.** A query for 50 ingredients each with categories fires 101 queries without batching. DataLoader instances are created per-request in the Yoga context — `categoriesByIngredient`, `membersByWorkspace`. This is a cost concern as much as a performance one.

**Authorization surface.** Handled by the service-layer choke point in §3. Pothos auth scopes provide a second check on sensitive fields (`User.email`) and on admin mutation fields, but the service layer is the real gate.

**Client-composable expense.** `graphql-armor` applies a depth limit of 7, and disables introspection and field suggestions in production. Aliasing and directive-overload protections come with it. Cost is limited by `@pothos/plugin-complexity` rather than by armor, because armor's check runs before variables are bound and so prices `first: $n` at one row. The complexity plugin prices a connection at the page it will actually fetch.

### Errors — one shape, so a message can land beside its field

Services throw rather than answering with an empty list or a success that did nothing — §11 asserts it as "not a silent no-op", and `auth/service-session.md` carries the full argument. Three types live in `src/lib/errors.ts`: `Forbidden`, `NotFound`, and `ValidationError`, which carries `issues: { path: (string | number)[]; message: string }[]`. None of the three carries a status code or a GraphQL error code — a service called from a seed or a script has no use for one — so the mapping below belongs to the transport, and MB.43 is where it lives.

Yoga maps them on the way out through `maskedErrors.maskError`, which keeps masking on: anything that is _not_ one of the three leaves as "Unexpected error", so no stack trace and no constraint name reaches a client. M11.10 makes the same promise for pages.

| Thrown            | `extensions.code` | Also carries                              |
| ----------------- | ----------------- | ----------------------------------------- |
| `ValidationError` | `VALIDATION`      | `extensions.fieldErrors`, from its issues |
| `Forbidden`       | `FORBIDDEN`       | —                                         |
| `NotFound`        | `NOT_FOUND`       | —                                         |
| anything else     | masked            | —                                         |

The message is the service's, verbatim. That is what carries M5.6b's "which column failed and what the ratio was", M5.2's duplicate naming the colliding entry, and M10.3's explaining refusal all the way to the person reading the form — a rewrite at the transport is how those become "Invalid input" again.

```json
{
  "errors": [
    {
      "message": "Invalid input",
      "path": ["createWorkspaceIngredient"],
      "extensions": {
        "code": "VALIDATION",
        "fieldErrors": [{ "path": ["canonicalName"], "message": "A botanical name is required" }]
      }
    }
  ],
  "data": null
}
```

**An issue's `path` names the input field**, in the shape of the mutation's own `input` — `['canonicalName']`, `['folkNames', 2]`. A rule belonging to no single field uses the empty path and the form renders it above the fields. Most refusals do have a field: the duplicate-identity collision of §5 names `canonicalName` (or `name`, for an entry whose label is its identity), a slug collision names `name` — the slug is derived and has no field of its own — a write that would end another entry's redirect names `endRedirect`, the confirmation it lacks, the contrast floor names `colorDark` or `colorLight`. What is genuinely not a field stays a `Forbidden` with a message — the last-owner guard refuses an action and offers a remedy, which is not a bad value in a box. Either way: **never a bare constraint name.**

**The client validates first and renders both sources the same way.** The Zod resolver runs the shared schema before the mutation is sent, so a well-behaved form never asks the server to reject what it could have caught; the service runs that same schema again, because the browser is not the only caller. Returned `fieldErrors` go into react-hook-form through `setError(path, { message })`, an empty path through `setError('root', …)`, and both render through the same inline error element the resolver's own errors use — one component, two sources, so a server-only rule is not a second visual language. `FORBIDDEN` and `NOT_FOUND` are not form errors; the page decides what to do with them (§9).

### Caching — three layers in v1

**One rule above all: a cache is keyed by viewer identity or holds nothing workspace-scoped** (CLAUDE.md rule 6). A cache is the easiest way to leak one workspace's data into another's response.

**1. DataLoader — per-request batching.** Collapses the 50-ingredient N+1 from 101 queries to 3. Free, no invalidation problem, non-negotiable.

**2. React `cache()` — per-request memoization.** Wraps service functions so a layout and a page requesting the same workspace hit Postgres once. Scoped to the request, no staleness risk.

**3. Next.js data cache with tag invalidation.** The compendium, the categories, the form vocabulary, the planet and zodiac vocabularies and the deity vocabulary are read on nearly every page, mutated only by admins, and identical for every viewer. Ideal cache target — all six share the `compendium` tag, and every admin mutation across the six fires `revalidateTag`. The two public compendium pages (§9) are ISR pages under the same tag, so the same call refreshes their rendered HTML; they read no request-time API, and their signed-in affordances are a client island (MB.80, MB.83).

```ts
export const getCompendium = unstable_cache(() => compendiumService.listGlobal(), ['compendium'], {
  tags: ['compendium'],
  revalidate: 3600,
});
// admin mutation:
revalidateTag('compendium', { expire: 0 });
```

`revalidateTag` takes two arguments in Next 16 — the single-argument form is deprecated and a type error, so `npm run typecheck` rejects the one-argument call outright. The second argument is `{ expire: 0 }`, not the otherwise-recommended `'max'`, because an admin who has just edited the compendium must see that edit on the very next read: `'max'` serves stale content for up to a year while the revalidation runs behind it, whereas `{ expire: 0 }` never serves stale and makes the next request a blocking miss.

Persistent across requests and shared across instances. Should remove most compendium reads from Postgres entirely. Vercel's native Next.js support makes `revalidateTag` and ISR first-class, so this layer does most of the work.

**`updateTag` is unavailable to this project.** It is the read-your-own-writes call — it expires the tag immediately rather than serving stale — but it may only be called from a Server Action and throws anywhere else, Route Handlers included. Every mutation here goes through the `/api/graphql` route handler (§3), and there are no server actions, so `revalidateTag(tag, { expire: 0 })` is the documented substitute wherever `updateTag` cannot be reached.

**`unstable_cache` is the legacy path, deliberately.** Its successor is the `use cache` directive under the `cacheComponents` flag, which `next.config.ts` does not set — so nothing changes today, and the two caches coexist as separate layers when it eventually does. The swap is not free either: `unstable_cache` persists values across deployments, while a `use cache` entry never carries over to a new deploy because its cache key includes the build id. A compendium that survives a deploy is worth more here than the newer directive.

**Not cached:** anything workspace-scoped. Ingredients and notes change from under you when a co-member edits, and stale shared state in a collaborative app is worse than an extra query.

**Layer 4 (Yoga response cache) is deferred to v2** — see §13.

### Schema sketch

```graphql
type Query {
  me: User!
  workspace(slug: String!): Workspace
  # Every list is a Relay connection (first/after/last/before), paged by one helper
  compendium(
    query: String
    categoryIds: [ID!]
    form: String
    withoutReferences: Boolean # the admin's to-do list: live entries with no live link (§5, M5.5)
    nomenclature: Nomenclature # the other to-do list: unknown is the formal names still to look up (M5.5)
    first: Int
    after: String
  ): QueryCompendiumConnection!
  ingredient(id: ID!, workspaceId: ID): Ingredient! # NOT_FOUND on a miss; workspaceId opens a coven's own entry to its members
  ingredientFormValues(first: Int, after: String): QueryIngredientFormValuesConnection! # the admin-curated form vocabulary
  categories(query: String, groupId: ID, first: Int, after: String): QueryCategoriesConnection! # the live categories by name, each with its group (M5.6); query and groupId narrow them (MB.178)
  planets(query: String, first: Int, after: String): QueryPlanetsConnection! # the curated planets by name; query narrows them (MB.95)
  zodiacSigns(query: String, first: Int, after: String): QueryZodiacSignsConnection! # the curated signs, likewise
  deities(query: String, traditionId: ID, first: Int, after: String): QueryDeitiesConnection! # the curated deities by tradition, then name; query and traditionId narrow them (MB.132)
  deityTraditions(first: Int, after: String): QueryDeityTraditionsConnection! # the live traditions by name
  # §5's fuzzy duplicate warning: compendium and this workspace, best match first
  possibleDuplicates(
    workspaceId: ID # null reads the compendium alone, for the admin's compendium form (M5.5)
    name: String!
    first: Int
    after: String
  ): QueryPossibleDuplicatesConnection!
  # A substitute's picker: what it may link, the compendium and this workspace, best match first (§5)
  ingredientSuggestions(
    workspaceId: ID!
    query: String
    first: Int
    after: String
  ): QueryIngredientSuggestionsConnection!
  # The reference picker: the compendium's and this workspace's references, matched on authors, title and container (§5)
  referenceSuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryReferenceSuggestionsConnection!
  # Curated bodies or signs first, then values in use in the compendium and this workspace (§5)
  planetSuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryPlanetSuggestionsConnection!
  zodiacSuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryZodiacSuggestionsConnection!
  workspaceIngredients(
    workspaceId: ID!
    query: String
    categoryIds: [ID!]
    first: Int
    after: String
  ): QueryWorkspaceIngredientsConnection!
  grimoire(workspaceId: ID!, first: Int, after: String): QueryGrimoireConnection! # workspace-visible + own private spells
  spell(id: ID!): Spell
}

# Mutations return the entity; a delete returns the deleted id, since a
# deleted entity's children would resolve empty. A refusal travels in `errors[].extensions` —
# a code, and `fieldErrors` for a validation failure — rather than in a payload
# type pairing an entity with a userErrors list. See Errors above.
type Mutation {
  createWorkspace(input: WorkspaceInput!): Workspace! # gated on canCreateWorkspace, which every admin holds
  createWorkspaceIngredient(workspaceId: ID!, input: IngredientInput!): Ingredient! # input.categoryIds files it (story 30, MB.125)
  updateIngredient(workspaceId: ID!, id: ID!, input: IngredientUpdateInput!): Ingredient! # replaces the row: every field non-null, "" or [] clears — categoryIds included
  deleteIngredient(workspaceId: ID!, id: ID!): ID! # a soft delete of the coven's own ingredient; a spell holding it keeps it
  createReference(workspaceId: ID, input: ReferenceInput!): Reference! # a null workspaceId writes the compendium tier, under the admin proof (§5)
  updateReference(workspaceId: ID, id: ID!, input: ReferenceInput!): Reference! # reaches every row linking it; nothing deletes one in v1
  addIngredientToWorkspace(workspaceId: ID!, ingredientId: ID!, input: StockInput!): InventoryItem!
  createSpell(workspaceId: ID!, input: SpellInput!): Spell!
  setSpellVisibility(id: ID!, visibility: SpellVisibility!): Spell! # private -> workspace only
  createInvitation(workspaceId: ID!, email: String!, role: InvitableRole!): Invitation! # the link is mailed; no response carries it
  acceptInvitation(token: String!): WorkspaceMember! # the session's verified email must match the invitation's
  revokeInvitation(id: ID!): Invitation!
  setEmail(email: String!, next: String): User! # MB.54; counts once verified by mail; the link lands on the way to next (MB.111)
  # admin mutations gated by users.role; grantWorkspaceCreation(userId) and revokeWorkspaceCreation(userId) are admin-only
  createAdminInvitation(email: String!, note: String): AdminInvitation! # mailed, never returned (MB.70)
  acceptAdminInvitation(token: String!): User! # a grant, through the admin role service
  revokeAdminInvitation(id: ID!): AdminInvitation!
  createCategory(input: CategoryInput!): Category! # CategoryInput: name, description, groupId; the slug follows the name
  updateCategory(id: ID!, input: CategoryInput!): Category!
  deleteCategory(id: ID!): ID! # refused while a live compendium entry is filed under it; a coven keeps its links (M5.6)
  createIngredientFormValue(input: IngredientFormValueInput!): IngredientFormValue! # name, description, groupId, endRedirect; the slug is the name and the group
  updateIngredientFormValue(id: ID!, input: IngredientFormValueInput!): IngredientFormValue! # a rename carries onto the compendium entries picking it (M5.6a)
  deleteIngredientFormValue(id: ID!): ID! # refused while a live compendium entry picks it; a coven keeps its text and its pick
  createCompendiumIngredient(input: CompendiumIngredientInput!, endRedirect: Boolean): Ingredient! # IngredientInput's fields, nomenclature required (M5.5)
  updateCompendiumIngredient(
    id: ID!
    input: CompendiumIngredientUpdateInput!
    endRedirect: Boolean
  ): Ingredient! # replaces the entry as updateIngredient does; endRedirect confirms MB.82's refusal
  deleteCompendiumIngredient(id: ID!): ID! # a soft delete; a spell holding the entry keeps it
  createPlanet(input: PlanetInput!): Planet! # PlanetInput: name, description; the slug follows the name (MB.95)
  updatePlanet(id: ID!, input: PlanetInput!): Planet! # a rename carries onto the compendium entries listing it
  deletePlanet(id: ID!): ID! # refused while a live compendium entry lists it; a coven keeps what it wrote
  createZodiacSign(input: ZodiacSignInput!): ZodiacSign! # the planets' three, for the signs
  updateZodiacSign(id: ID!, input: ZodiacSignInput!): ZodiacSign!
  deleteZodiacSign(id: ID!): ID!
  createCategoryGroup(input: CategoryGroupInput!): CategoryGroup! # name, description, colorDark, colorLight; each colour 4.5:1 on its own ground (M5.6b)
  updateCategoryGroup(id: ID!, input: CategoryGroupInput!): CategoryGroup! # touches no category
  deleteCategoryGroup(id: ID!, moveTo: ID): ID! # its live categories move to moveTo first; needed only when it has some
  createIngredientFormGroup(input: IngredientFormGroupInput!): IngredientFormGroup! # name, description
  updateIngredientFormGroup(id: ID!, input: IngredientFormGroupInput!): IngredientFormGroup! # a rename re-slugs its live forms
  deleteIngredientFormGroup(id: ID!, moveTo: ID): ID! # its live forms move to moveTo first, re-slugged there
  createDeity(input: DeityInput!): Deity! # DeityInput: name, description, traditionId; the slug follows the name (MB.132)
  updateDeity(id: ID!, input: DeityInput!): Deity! # a rename carries onto the compendium entries picking it
  deleteDeity(id: ID!): ID! # refused while a live compendium entry picks it; a coven keeps its pick
  createDeityTradition(input: DeityTraditionInput!): DeityTradition! # name, description
  updateDeityTradition(id: ID!, input: DeityTraditionInput!): DeityTradition! # touches no deity
  deleteDeityTradition(id: ID!, moveTo: ID): ID! # its live deities move to moveTo first; needed only when it has some
}

type Ingredient {
  id: ID!
  name: String! # the display label
  slug: String! # the public address (MB.80)
  canonicalName: String # the formal name; null for none, set for a named kind, either for unknown
  nomenclature: Nomenclature!
  folkNames: [String!]! # flattened from ingredient_folk_names
  form: String # free text, not an enum — the vocabulary is data
  formChoice: IngredientFormValue # the curated form picked for form; null when typed, or once retired (MB.167)
  description: String
  elements: [IngredientElement!] # in the order chosen, a repeat refused (§5)
  planets: [String!] # in the order entered, as every list here is
  zodiacSigns: [String!]
  deities: [IngredientDeity!]! # in the order entered, through a loader; [] when none (MB.167)
  colors: [String!]
  safetyNotes: String
  substitutes: [Substitute!]! # alphabetical by name, through a loader; [] when none (MB.138)
  references: [ReferenceLink!]! # alphabetical by citation, through a loader; [] when none (MB.151)
  isGlobal: Boolean!
  categories: [Category!]!
  audit: AuditInfo!
  # a v2 notes section slots in here
}

# A link or a typed name (§5, ingredient_substitutes), as a spell layer is.
type Substitute {
  name: String! # the linked ingredient's label, its last once deleted; the typed name otherwise
  ingredient: Ingredient # null on a typed name, and once the linked ingredient is deleted
}

# A source, kept once and linked from every row it supports (§5, references).
type Reference {
  id: ID!
  kind: ReferenceKind!
  authors: String
  title: String!
  container: String
  contributors: String
  edition: String
  volume: String
  issue: String
  series: String
  place: String
  publisher: String
  published: String
  pages: String
  host: String
  url: String
  modified: LocalDate
  accessed: LocalDate
  note: String
  citation: String! # Chicago bibliography form, rendered on the server, plain; a surface that shows italics renders the parts itself
  isGlobal: Boolean!
  audit: AuditInfo!
}

# One row's link to a source; the locator is the link's, not the reference's.
type ReferenceLink {
  reference: Reference!
  locator: String # "p. 112", "chap. 13"
}

enum ReferenceKind {
  book
  chapter
  article
  entry
  web_page
}

# A deity picked or typed (§5, ingredient_deities), as a substitute is a link or a name.
type IngredientDeity {
  name: String! # a pick's curated spelling as saved, or the typed text
  deity: Deity # null on a typed name, and once the deity or its tradition is retired
}

# The curated vocabularies as a chip or a filter reads them: public, no audit.
type Category {
  id: ID!
  name: String!
  slug: String!
  description: String!
  group: CategoryGroup!
}

type CategoryGroup {
  id: ID!
  name: String!
  slug: String!
  description: String!
  colorDark: String! # the pair a chip wears (MB.36)
  colorLight: String!
}

type IngredientFormValue {
  id: ID!
  name: String!
  slug: String!
  description: String!
  group: IngredientFormGroup! # what tells two same-named forms apart
}

type Planet {
  # ZodiacSign has the same four fields
  id: ID!
  name: String!
  slug: String!
  description: String!
}

type IngredientFormGroup {
  id: ID!
  name: String!
  slug: String!
  description: String!
}

type Deity {
  id: ID!
  name: String!
  slug: String!
  description: String!
  tradition: DeityTradition! # what tells two same-named deities apart (MB.167)
}

type DeityTradition {
  id: ID!
  name: String!
  slug: String!
  description: String!
}

enum IngredientElement {
  earth
  air
  fire
  water
  spirit
}

type User {
  id: ID!
  name: String!
  image: String
  email: String! # self or admin: a Pothos scope behind the service (§7, "The three GraphQL costs")
  role: UserRole! # self or admin
  canCreateWorkspace: Boolean! # self or admin
  memberships: [WorkspaceMember!]! # the caller's own only, through a loader
  audit: AuditInfo!
}

type WorkspaceMember {
  role: WorkspaceRole! # viewer | member | owner
  joinedAt: DateTime!
  workspace: Workspace!
  audit: AuditInfo!
}

type Workspace {
  id: ID!
  name: String!
  slug: String! # the /coven/[slug] segment
  audit: AuditInfo!
}

enum Nomenclature {
  botanical
  fungal
  zoological
  mineral
  chemical
  unknown
  none
}

type Spell {
  id: ID!
  title: String!
  intent: String
  visibility: SpellVisibility! # private | workspace
  categories: [Category!]! # assigned intent
  derivedCategories: [Category!]! # union across linked ingredients; a custom row contributes none
  categoryGaps: CategoryComparison! # intended-not-present, present-not-intended
  ingredients: [SpellIngredient!]! # in layer order
  audit: AuditInfo!
}

type SpellIngredient {
  ingredient: Ingredient # null on a custom, one-off row (MB.40)
  name: String! # the ingredient's display label when linked; the custom name otherwise
  form: String # the ingredient's form when linked; the custom row's free text otherwise
  quantity: Float
  unit: InventoryUnit # M9.2's inventory_unit enum
  layerOrder: Int!
  note: String
  audit: AuditInfo!
}

enum InvitableRole {
  viewer
  member
} # owner is not invitable
type Invitation {
  id: ID!
  email: String!
  role: InvitableRole!
  expiresAt: DateTime! # ISO 8601 on the wire
  acceptedAt: DateTime
  revokedAt: DateTime
  audit: AuditInfo!
  # no url and no token: the link exists only in the mail (MB.61)
}

scalar DateTime # ISO 8601 on the wire; a Date in a resolver
scalar LocalDate # a calendar date, YYYY-MM-DD on the wire, for a reference's dates (MB.153)
# One shape for every audited type, never flat fields on the type itself.
# The four stamps only: no finder returns a soft-deleted row.
type AuditInfo {
  createdAt: DateTime!
  createdBy: ID!
  updatedAt: DateTime!
  updatedBy: ID!
}
```

There is no `Form` enum in the schema. `ingredients.form` is free text over an admin-curated vocabulary (§5), so an enum would rewrite the SDL every time an admin curates a value; the vocabulary is read as data through `ingredientFormValues` and the filter argument is a `String`.

**The type is `IngredientFormValue`, not `IngredientForm`, deliberately.** One row is one permitted _value_ of `ingredients.form`. Naming it after its table (`ingredient_forms`) would be the conventional mapping, but `IngredientForm` is already the entry-form component (§11) — and per this project's vocabulary rule a term means exactly one thing, so the newer of the two yields. The table keeps its name; only the GraphQL type diverges from it.

Adding `canonicalName`, `nomenclature` and `folkNames` moves M3.4's SDL snapshot, which is what that snapshot is for.

**`planets`, `zodiacSigns` and `colors` replace `planet`, `zodiac` and `color` outright, with no deprecation window** (MB.134, built by MB.136): on `Ingredient`, and on `IngredientInput` and `IngredientUpdateInput` alike, each a `[String!]` where the single field was a `String` — non-null on the update input, as its other fields are, where `[]` clears. Nothing outside the app reads the API, so the client and the schema change in one deploy and no reader is left on the old shape. A list left empty reads back as null, because that is what is stored (§5).

**`deities` and the form's pick move to the pick model in one deploy** (MB.167): `Ingredient.deities` becomes `[IngredientDeity!]!`, each a name and the curated `Deity` picked, in the order entered, and `Ingredient.formChoice` reads the curated form `formId` records, both through loaders. Both inputs take `formId: ID` beside `form` — non-null on the update input, where `""` clears — and `deities: [IngredientDeityInput!]`, each a `deityId` or a `name`, exactly one, as `SubstituteInput` is. `formSuggestions` and `deitySuggestions` carry each curated row's `id`, null for a value only in use, which is what a pick sends. Named after the table, not `DeityInput`, which MB.132's admin CRUD keeps ([`design-decisions/mb.167-read-and-write-the-pick.md`](design-decisions/mb.167-read-and-write-the-pick.md)).

**`elements` replaces `element` the same way** (MB.157, built by MB.159): a `[IngredientElement!]` where the single field was an `IngredientElement`, on `Ingredient` and both inputs, non-null on the update input where `[]` clears. That ends the update input's one exception, `element`, which was nullable because an enum has no empty value to send; an empty list is one, so every field of `IngredientUpdateInput` is now non-null. The enum still refuses a value outside the five before a resolver runs, and the shared schema refuses a repeat. The compendium's element filter (M8.13) stays one `IngredientElement` and matches an entry whose list holds it among others (§9).

**`Reference` and `Ingredient.references`** (MB.151, built by MB.153): the two ingredient inputs take `references: [ReferenceLinkInput!]`, each an existing reference's id with an optional `locator`, non-null on the update input where `[]` clears, and `ReferenceInput` takes a reference's fields as §5 lists them, validated per `kind`. `citation` is rendered on the server by the one renderer and is plain text, so a chip, a sort and a screen reader read it as one string; the page renders the parts the same function returns, with the italics. `LocalDate` is graphql-scalars', beside the `DateTimeISO` behind `DateTime`, because an accessed date is a day and not an instant.

`SpellIngredient.ingredient` is nullable from the first line of the SDL, not widened later: a custom, one-off row (§5, MB.40) has no ingredient, and a consumer that has always had to branch on that never meets it as a breaking change. `name` and `form` resolve from the linked ingredient when there is one, so a recipe view reads one shape whichever kind of row it is rendering.

Cursor pagination on every list query — the grimoire and compendium especially, and the vocabularies too — through one shared helper (`t.pagedConnection`): Relay connections, default page size 25, hard server-side maximum 100 returned silently rather than refused, cursors encoding a stable sort key plus id, never an offset. The key may have several parts, computed ones included, so a search can page by its score: the compendium's pages `(score DESC, name, id)` and carries each row's word similarity on its edge as `score`, null on a list without a search. A connection may also carry `totalCount` and `countBefore` — the rows under its filter, and how many come before its first edge, 0 on the first page — and the compendium's does, so its pager reads "Page X of Y": page `floor(countBefore / size) + 1` of `max(1, ceil(totalCount / size))`, with Last asking for `last: totalCount % size || size` so it ends on the page Next walks to. The position is counted from the first edge's key and never used to seek, so a cursor is still never an offset; the count runs only when one of the two fields is selected. The cost limit prices each connection at that effective page size, whether `first` is a literal or a variable. A list nested on an object (`Ingredient.categories`, `Spell.ingredients`) stays a bare list, bounded by its parent. The sketch above shows the connection arguments, not every generated type.

---

## 8. Auth and authorization

**Better Auth, running in-process** as Next.js route handlers with its tables via the Drizzle adapter (Neon in deployment, local Postgres in dev and test). No extra service, no extra cost. Neon's own Managed Better Auth wraps the same library, so migrating to it later stays possible.

**OAuth only in v1.** Google, Discord, Facebook and Microsoft (M2.6; GitHub was the original second provider under M2.5 and was removed when the roster was re-scoped). The OAuth handshake at `/api/auth/*` is the one path outside the GraphQL-only rule and carries no application data.

**The site is invite-gated.** Signing in creates an account with `canCreateWorkspace = false` and no workspace. Creation rights are granted by accepting a workspace invitation or by an admin (`grantWorkspaceCreation`), and persist until an admin revokes them (`revokeWorkspaceCreation`, M5.8). The account whose email matches `ADMIN_BOOTSTRAP_EMAIL` is promoted to `admin` at a verified Google or Discord sign-in (MB.60) or on verifying the address by mail from a session holding the row (MB.68). Every admin after the first is granted by an existing admin, and the primary admin cannot be revoked (§5, M2.9).

**Two layers of authorization, deliberately — the check, and a proof the check happened.**

Belt and braces is warranted here: an application bug leaks one person's grimoire to another, and the realistic bug is a forgotten check in one service rather than a wrong one everywhere. So the first layer is the check and the second makes forgetting it a compile error.

Layer one: every workspace-scoped call passes `assertMembership(session, workspaceId, permission)` in the service. A write additionally runs inside `withAudit()`, so it cannot reach the database without both a membership check and audit stamping.

`permission` is what the call is about to do — `{ spell: ['create'] }` — checked against per-role permission statements built with better-auth's `createAccessControl`, not a minimum role compared against a rank. `viewer < member < owner` is a line today; a role that is not on it would leave every "at least member" call site meaning something nobody checked, and the statements also make `{ spell: ['publish'] }` a compile error rather than a permission nobody holds. Several resources in one request are ANDed; an empty request throws, since it would authorize vacuously. The site role (`users.role`) is a different axis and is not consulted — an admin curates the compendium and reaches no workspace. Reasoning: [`m6.3-permission-statements.md`](design-decisions/m6.3-permission-statements.md).

Layer two: what that call returns.

```ts
declare const brand: unique symbol;
export type Membership = {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly [brand]: true;
};
```

The brand is unconstructible outside the membership service — no object literal, no cast a reviewer would miss. Every workspace-scoped repository finder and every `AuditWriter` method takes a `Membership` as its first argument and ANDs `workspace_id = membership.workspaceId` onto the query itself, rather than trusting a `workspaceId` its caller passed alongside; `write.insert` fills the column from the proof for the same reason. A service therefore cannot _write_ a workspace-scoped query without having passed the check first. That is the difference between the two layers being redundant and the second one being real: it makes the omission impossible instead of merely absent, and because the type is erased it costs nothing at runtime — no second connection, no transaction on the read path, no per-environment credentials.

The same shape covers spell `visibility`: the finders that reach a `private` one take the proof and read the author id **out of it**, rather than beside it — `created_by = membership.userId`, for the reason `workspace_id` comes from the proof too. An author id passed alongside would be a second source that can disagree with the check that minted the proof. Note that "workspace-scoped" is not the same as "has a `workspace_id` column" — `spell_ingredients` and `spell_categories` reach their workspace through `spells` and cannot self-scope. A guard that infers the set from a column name silently exempts the tables holding what a spell is made of, so they are a third shape instead: a table carrying a `spell_id` is refused by the unscoped finders and reached through `findManyInSpell`, which derives both the coven and the visibility from the parent spell in one query.

**Where this is weaker than a database policy**, stated rather than glossed: a service holding a valid proof for W that hand-writes a `where` clause naming X's ids satisfies the type and still reads across workspaces. The join tables above were the second gap, closed by M10.3's third shape; this one stays open and is covered by §11's per-entity direct-id denial tests, which is the same coverage that would have caught a policy written wrong. A cast is the third, and it belongs to review rather than to the type: a value already carrying the proof's public shape is _comparable_ to it, so `{ workspaceId, userId, role } as Membership` compiles where `session as Membership` does not.

**RLS is deferred to the public launch, not rejected.** `withAudit` keeps publishing the `app.current_user_id` GUC on every write (§5), so adding policies is one migration and its tests rather than a re-audit of every write path. [`mb.24-rls-role-split.md`](design-decisions/mb.24-rls-role-split.md) is the specification for that migration — the role split, `FORCE`, the `security definer` `app.is_member()` helper, the compendium's nullable `workspace_id`, and why a policy test connected as the table owner proves nothing. It is superseded as a plan for v1 and stands unchanged as a plan for then. Reasoning for the deferral: §14.

---

## 9. Routes and components

**Workspace lives in the URL, not the session.** Session-held workspace state produces the classic bug where two tabs disagree about context and a write lands in the wrong workspace.

| Route                            | Page                                                                                                                                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                              | Public entry page: what the site is, that it is invite-only, and the way in — `/sign-in` for a visitor, `/coven` for someone signed in (MB.57), `/admin` for an admin (MB.113)                                                                                                      |
| `/coven`                         | Post-sign-in landing: into their workspace if they have one; the create form if they hold creation rights; otherwise a plain "invite-only" explanation. An admin signing in with no return path lands on `/admin` instead (MB.113)                                                  |
| `/compendium`                    | Global ingredient reference — public and search-indexable, read-only for everyone but admins (MB.80)                                                                                                                                                                                |
| `/compendium/ingredients/[slug]` | Public, canonical page for a compendium entry (MB.80). A retired slug answers 308 to the current one inside its window while no entry holds it, and the page at a taken slug links to the entry that moved; a workspace entry's slug answers 404                                    |
| `/ingredients/[id]`              | Detail — correspondences, safety notes, substitutes, a linked one leading to its ingredient, and references in Chicago form, each with its locator (MB.155; built to take v2 notes beneath). Signed-in; for a compendium entry the public route’s page, with a canonical link to it |
| `/coven/[slug]/ingredients`      | Workspace ingredients and stock                                                                                                                                                                                                                                                     |
| `/coven/[slug]/grimoire`         | Workspace spells (plus the viewer's own private spells)                                                                                                                                                                                                                             |
| `/coven/[slug]/grimoire/new`     | Spell builder                                                                                                                                                                                                                                                                       |
| `/coven/[slug]/grimoire/[id]`    | Spell recipe view — the read surface for a saved spell, and the only page carrying print styles                                                                                                                                                                                     |
| `/coven/[slug]/members`          | Members and invitations (owner only)                                                                                                                                                                                                                                                |
| `/admin/compendium`              | Admin CRUD on global ingredients                                                                                                                                                                                                                                                    |
| `/admin/categories`              | Admin CRUD on global categories, in a modal the address opens: `?new`, or `?edit=<slug>` (M5.6)                                                                                                                                                                                     |
| `/admin/category-groups`         | Admin CRUD on the category groups, including each group's chip colour                                                                                                                                                                                                               |
| `/admin/forms`                   | Admin CRUD on the ingredient form vocabulary                                                                                                                                                                                                                                        |
| `/admin/form-groups`             | Admin CRUD on the ingredient form groups                                                                                                                                                                                                                                            |
| `/admin/planets`                 | Admin CRUD on the planet vocabulary                                                                                                                                                                                                                                                 |
| `/admin/zodiac-signs`            | Admin CRUD on the zodiac vocabulary                                                                                                                                                                                                                                                 |
| `/admin/deities`                 | Admin CRUD on the deity vocabulary, each deity under its tradition                                                                                                                                                                                                                  |
| `/admin/deity-traditions`        | Admin CRUD on the deity traditions                                                                                                                                                                                                                                                  |
| `/invite/[token]`                | Accept invitation                                                                                                                                                                                                                                                                   |
| `/sign-in`                       | OAuth                                                                                                                                                                                                                                                                               |
| `/account`                       | The account's sign-in methods: each provider linked or addable, removable while another is left (MB.71). The only way a second provider joins an account                                                                                                                            |
| `/account/email`                 | The account's email: prefilled from the provider, editable, counting once a mailed link is followed (MB.54). Where every unverified sign-in lands, and the only page an unverified account can reach                                                                                |

Workspace ingredients and stock are **one page**, not two. A filter chip distinguishes local entries from compendium entries; a separate page would be a distinction without a difference.

**Button labels are title case** — "Sign In", "Send Confirmation", "Continue with Google" (a short preposition stays lower, as title case has it). A label that reads as a sentence is a hint the control is doing too much.

### Components

Component folders follow the `resume-2026` convention — `src/components/IngredientCard/` with `index.tsx` and `index.scss`, imported `from '../components/IngredientCard'`. The test is the one departure from that convention: it lives at `tests/components/IngredientCard/index.test.tsx` rather than beside the component, because MB.41 moved every Vitest file under `tests/`.

**`AppShell`** is the application-wide navigation frame, not a route. It wraps every signed-in page — the in-app ingredient detail included, which sits outside `/coven/` — and carries the primary nav, the `WorkspaceSwitcher`, and the global affordances for adding and editing an ingredient from any page. It is a layout component rather than a route because the nav must persist across navigation between workspace-scoped and global pages; the coven layout nests inside it and adds only workspace-scoped chrome. The two public compendium pages (MB.80) do not render it on the server: they carry a minimal public frame, and the shell's signed-in chrome arrives through a client island once a session is found (MB.83).

**`IngredientSearch`** is shared by compendium, ingredients, and spell builder. Debounced text match on `name`, on the folk names, and on `canonicalName` — searching the formal name is how someone who knows the binomial finds the right one of four rows labelled "Cat's Claw"; multi-select category chips grouped by the category's `groupId`, groups alphabetical by name, AND by default with an OR toggle; secondary filters for form, element, in-stock-only, where the form filter's options come from the curated vocabulary plus the in-use values outside it (§5) rather than a fixed set, and the element filter, the five, matches an ingredient whose `elements` holds the one chosen, among others or alone (MB.157); filter state in the URL query string. Each consumer supplies the action slot — Compendium passes "Add ingredient," Ingredients passes Edit/Delete, Spell Builder passes "Add to jar."

### Componentized Sass

Every component folder carries its own `index.scss`, imported by its `index.tsx`. One global stylesheet, `src/app/globals.scss`, imported once by the root layout — nothing component-specific in it. It exists because two things must be emitted exactly once: `_typography.scss`'s global element rules, and the theme token assignments (M0.6). Each component's `index.scss` is its own compilation unit, so a shared partial that emitted CSS would duplicate it into every compiled stylesheet — which is why `_variables.scss` and `_mixins.scss` stay declaration-only.

```
src/components/IngredientCard/
  index.tsx      → imports './index.scss'
  index.scss     → @use '../../scss/variables' as *;
```

Shared partials in `src/scss/`, `@use`'d directly by whichever component needs them — never routed through a parent:

| Partial            | Carried over from `resume-2026`                                                             | Added                                             |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `_variables.scss`  | Screen/print colors, shadows, transitions, font stacks                                      | The eight seed group colors, safety-badge palette |
| `_mixins.scss`     | `theme-transition()`, `reduced-motion`, `focus-ring()`, `card-surface()`, `tooltip-arrow()` | `modal-surface()`, `chip()`, `badge()`            |
| `_typography.scss` | Global body/heading rules                                                                   | unchanged                                         |
| `_buttons.scss`    | Button fill system, `.dismiss-button`                                                       | unchanged                                         |
| `_print.scss`      | Print-URL reveal, print tiers                                                               | Spell recipe print layout                         |

Modern module system throughout — `@use '../../scss/variables' as *;`, never the deprecated `@import`.

---

## 10. User stories

### Accounts and workspaces

1. Sign in with an account I already have, so I don't manage another password.
2. As a newly signed-in user, be told plainly what I can do next, so an empty account doesn't look broken.
3. Create a workspace once I hold creation rights, for my coven or household.
4. Invite someone to my workspace by email with a chosen role (viewer or member), so that only the verified holder of that address can accept.
5. Revoke a pending invitation before it's accepted.
6. Accept an invitation and land in the workspace.
7. Be rejected if a link is expired, revoked, or already used.
8. Switch between workspaces without losing my place.
9. See who's in a workspace and their roles.
10. Remove a member, or leave a workspace myself.
11. Be blocked from removing the last owner.
12. As a viewer, read everything in a workspace but change nothing.
13. See who last edited a stock item and when.

### Compendium and admin

14. Browse the compendium and add an entry to my workspace's ingredients.
15. Create an ingredient local to my workspace when the compendium lacks it.
16. See a warning when the name I'm entering resembles something existing.
17. Be prevented from editing compendium entries.
18. As an admin, add, edit, and soft-delete compendium entries and categories.
19. As an admin, have no special access to any workspace's private data.

### Ingredients

20. See all my workspace's ingredients in a list.
21. Search by name or folk name, so I can find "Devil's Shoestring" without recalling it's honeysuckle root.
22. Filter by several categories at once, to find things both protective and cleansing.
23. See at a glance what's low or out of stock.
24. Edit from the row, without leaving the page.
25. Delete with confirmation — a soft delete, recoverable.
26. Get an empty state prompting the first add.
27. Filter to only what's local to my workspace, or only what came from the compendium.

### Modals

28. Open the add form from anywhere via nav.
29. Only `name` required, so I can save a stub and enrich it later.
30. Pick categories from grouped chips.
31. See inline validation errors.
32. Get a discard warning on unsaved changes.
33. Edit form pre-filled; reachable from nav picker and from a row.
34. List reflects the edit immediately on save.

### Notes — deferred to v2

Stories 35–46 covered the three-tier experience-notes system. They move to v2 with the rest of the notes subsystem (§13). Story numbers are **not** reused: the grimoire stories keep their original 47–56, story 57 (MB.40) took the next free number rather than one of the twelve, and 58–62 (M2.9: email verification, changing an email, granting admin, the ledger, inviting an admin) followed the same way, as their own list because Prettier renumbers a list from its first item, and 63 (MB.80: the public compendium) the same way after them, and 64 (MB.151: references) after it, so a v1 count is 52 stories (1–34, 47–64).

### Grimoire

47. Name a spell and state its intent.
48. Assign categories describing what the spell is meant to do.
49. Search and filter ingredients with the same controls as the ingredients.
50. Add an ingredient with quantity and unit.
51. Reorder ingredients, so layering sequence is recorded.
52. Compare assigned intent categories against the union derived from ingredients, and see gaps in both directions.
53. Get warned when an ingredient is flagged toxic or unsafe to burn.
54. See when I'm adding something I have none of.
55. Save as draft.
56. As any workspace member including viewers, read every workspace-visible spell in the grimoire (a private spell stays with its author).
57. Add a one-off ingredient by name and form, so a spell can call for something I will never stock — it goes in the jar and nowhere else.

### Email and admin (M2.9)

58. Prove I own my email address, whichever provider I signed in with, so the site can trust it.
59. Set or change the email the site knows me by, prefilled from my provider, and have it take effect only once I have proved it is mine.
60. As an admin, make an existing user an admin and revoke it again, and be refused when the target is the primary admin or the last admin; as the primary admin, pause both for every other admin while I deal with one that has gone rogue.
61. As an admin, see who made each admin, who removed one, and when.
62. As an admin, invite someone by email to become an admin, accepted only by an account that has proved it owns that address.

### Public compendium (MB.80)

63. As a visitor, read the compendium and its entries without signing in, so that the site's reference is useful to people who are not in a coven.

### References (MB.151)

64. As a reader of the compendium, see where an entry's information came from, so that I can judge a claim and read further.

Keeping a spell `private` while building it, and the one-way widen to `workspace`, are governed by §5's visibility rule rather than a numbered story.

---

## 11. TDD approach

Every story becomes a failing test first: **write test → watch it fail → minimum code → refactor.** Both suites keep the 80% threshold on lines, branches, functions, and statements, with coverage artifacts uploaded. Verification runs the `:coverage` variants, for the reason CLAUDE.md's Commands section gives.

### Test database: local Postgres, not Neon, not SQLite

**Postgres 18 in Docker, everywhere except deployment.**

| Context              | How                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Local dev            | `postgres` service in `docker-compose.yaml`, seeded on first boot                             |
| Local tests          | Same container, separate database per Vitest worker                                           |
| CI unit + db         | Actions `services: postgres:18`, reachable by service name from the existing job `container:` |
| CI e2e               | Same service container                                                                        |
| Staging + production | Neon                                                                                          |

**SQLite was considered and rejected.** It cannot run `num_nonnulls` check constraints, `pg_trgm` fuzzy matching, PL/pgSQL triggers, native array columns for `planets[]` and `colors[]`, stored generated columns for `canonical_key`, or `set_config('app.current_user_id', …)`. The isolation tests are the point: they query every workspace-scoped entity by direct id as a non-member and assert refusal, against the real schema — the same partial unique indexes, generated columns and constraints production runs. Under SQLite that suite tests a different database than the one that ships, and the failure mode it guards against is one user's grimoire visible to another.

**Using local Postgres instead of Neon branches is a net simplification.** It removes the `NEON_API_KEY` secret, `globalSetup` branch creation, the 10-branch-per-project limit, the CU-hour budget, and the branch-reaper workflow. Neon becomes deployment-only infrastructure. Tests get faster too — a local socket beats a network round trip per query.

**Isolation.** Each Vitest worker gets `sorrel_test_${VITEST_POOL_ID}` (the pool slot — `VITEST_WORKER_ID` counts test files, not workers, and outruns the clones that exist; MB.14), created from a template database with migrations pre-applied and the `standard` scenario seeded — built once per run at test setup from the image's extensions-only `sorrel_template` (M1.27; not baked into the image, so it can never disagree with the checkout) — so per-worker setup is a fast `CREATE DATABASE ... TEMPLATE` rather than a migration run, and the clone is re-made from the template before every test file. Playwright gives each worker slot `sorrel_e2e_<slot>`, recreated the same way from its own seeded template between spec files, and a `next start` of its own reading it: the code under test runs in the server, which reads its database once at boot, not in the worker (MB.112).

### Seed data — one module, three consumers

`src/db/seed/index.ts` exports `seed(db, { scenario })`. A one-shot `db-init` compose container runs it before the app starts; the Vitest `db` project and Playwright's `globalSetup` call it directly. Identical data everywhere, so a bug reproduces in all three.

The Docker side is a Node container rather than a Postgres init script, corrected at M1.24 from "Docker Postgres runs it on first boot": the seed is TypeScript and the Postgres image has no Node, and `Docker/postgres-init/` does not run at container start in any case, since `Dockerfile.postgres` populates PGDATA at image build time and the entrypoint then skips `/docker-entrypoint-initdb.d/`. The outcome the line described — a clean volume comes up seeded — is unchanged.

Scenarios: `minimal` (one system user, one user, empty compendium), `standard` (five users, workspaces W and X, populated compendium), `demo` (standard plus spells with ingredients and layer order).

**Fixture users:**

| User | Role                               |
| ---- | ---------------------------------- |
| A    | Owner of workspace W               |
| B    | Member of workspace W              |
| C    | Viewer in workspace W              |
| D    | Member of unrelated workspace X    |
| E    | Site admin, member of no workspace |

`make db-reset` drops, migrates and reseeds local; `SEED_SCENARIO` picks the scenario for it and for `make docker-up`, defaulting to `minimal`.

### Acceptance tests — story traceability

Every story gets a test that names it. The suite is written first, all failing, and becomes the definition of done.

```
tests/acceptance/
  01-accounts.test.ts       # stories 1-13
  02-compendium.test.ts     # stories 14-16
  03-ingredients.test.ts    # stories 20-27
  04-modals.test.tsx        # stories 28-34
  06-grimoire.test.ts       # stories 47-57
  07-admin.test.ts          # stories 17-18  (story 19 via the workspace-isolation suite)
  08-email-and-admin.test.ts # stories 58-62
```

Each test carries its story id, so a failure points at a requirement rather than an implementation detail:

```ts
describe('Story 12: a viewer reads everything and writes nothing', () => {
  it('lets a viewer read the workspace grimoire', async () => {
    const spell = await spells.create(asUser(A), {
      workspaceId: W.id,
      title: 'Hearth blessing',
      visibility: 'workspace',
    });
    expect(await spells.findById(asUser(C), spell.id)).toBeDefined();
  });

  it('rejects a viewer write with Forbidden, not a silent no-op', async () => {
    await expect(spells.create(asUser(C), { workspaceId: W.id, title: 'x' })).rejects.toThrow(
      Forbidden,
    );
  });

  it('hides one workspace from a member of another, even by direct id', async () => {
    const spell = await spells.create(asUser(A), {
      workspaceId: W.id,
      title: 'Warding jar',
      visibility: 'workspace',
    });
    await expect(spells.findById(asUser(D), spell.id)).rejects.toThrow(Forbidden);
  });
});
```

`make test-stories` runs only this suite and prints a checklist of which stories pass — a live progress report against §10 rather than a coverage percentage.

Acceptance coverage is tracked separately from the 80% line threshold, because they measure different things: one asks whether the code is exercised, the other whether the product does what was specified.

### Unit — Vitest, no DOM

`src/lib/` carries the heaviest coverage:

- There is no `filterIngredients()`: the search is the `compendium` query's, in SQL (M8.5; §14), because rule 8 means the browser never holds the whole list
- `unitConvert()` — within a single dimension only: weight↔weight, volume↔volume, to a defined precision. Weight↔volume and anything involving count are refused as an explicit result the caller must handle, never null or a guess. No density table exists anywhere in the codebase
- `summarizeSpellCategories()` — union and dedupe across ingredients
- `compareSpellCategories()` — intended-not-present and present-not-intended, both directions
- `resolveSpellVisibility()` — the read decision and every transition, exhaustively; `private → workspace` permitted, `workspace → private` rejected
- Zod schemas for every model
- `applyAudit()` — correct fields on insert vs update vs soft delete

### Data layer — Vitest, local Postgres

The highest-risk tests in the project.

**Authorization**

- D cannot read W's ingredients or grimoire — including by direct id, not just list queries
- D's write to W fails with an authorization error, not a silent no-op
- C (viewer) reads W's ingredients and grimoire but cannot write either, and cannot create a spell at any visibility
- Admin E cannot read W's ingredients or grimoire
- A non-admin write to a compendium entry fails; E's succeeds and stamps `updated_by`
- A user without `canCreateWorkspace` cannot create a workspace, and every admin holds it (MB.177); accepting an invitation sets the flag and audits it
- A workspace-scoped finder **cannot be called without a `Membership`**, asserted at compile time with `@ts-expect-error` rather than at runtime — the second layer's whole claim is that the omission does not typecheck, so the test has to be a type error rather than a thrown one

**Spell visibility**

- A's `private` spell is invisible to B and C, though they share W, and to owners
- A's `workspace` spell is visible to B and C, invisible to D
- `private → workspace` is permitted; `workspace → private` is rejected with an explaining error, not a bare Forbidden
- D cannot read W's spell by direct id at either visibility
- A private spell is excluded in SQL, never fetched then filtered in the resolver
- Seeded spells migrate to `workspace` visibility

**Audit and soft delete**

- Insert stamps `created_by`/`updated_by` from session, ignoring payload ids
- Update leaves `created_at`/`created_by` untouched
- Soft delete sets `deleted_at`/`deleted_by`; row vanishes from finders
- Update and soft delete leave a soft-deleted row as it was, the same call writing its live twin
- A deleted ingredient leaves every read but a spell holding it, which keeps reaching it — with its categories — for every member who may read the spell, and nobody else
- Re-adding a **formal** name after soft delete succeeds — the partial-index test. It must be the formal name, not the display label: display labels are no longer unique in the compendium, so a label-based assertion would pass even with the `WHERE deleted_at IS NULL` stripped off the index, and the test would silently stop testing anything. M5.3 exists to exercise that index and carries the same correction

**Compendium and ingredients**

- A workspace-local ingredient is invisible to every other workspace
- A compendium insert omitting `nomenclature` is rejected — the column has no database default
- The coupling holds both ways: `none` carrying a formal name is rejected, any named kind carrying none is rejected, and `unknown` saves with a formal name or without one
- `canonical_key` cannot be written or updated directly; Postgres refuses, and the column is absent from `$inferInsert` so TypeScript refuses first
- Two compendium entries may share a display label when their formal names differ; two may not share an identity
- A local may share a label — and an identity — with a compendium entry; two locals in one workspace may share neither
- Local-beats-compendium suppression, one assertion per row of §5's resolution table: an identity match suppresses across differing labels, a label match suppresses only when the local declares no formal name, and two differently-identified rows sharing a label are both returned
- Promoting a folk name to the display name leaves `canonical_key` unchanged on a row carrying a formal name, and changes it on a `none` row
- A folk name, or a form value in use, present only in unrelated workspace X never surfaces in W's lookup — asserted against the service directly, not merely by its absence from a list
- Fuzzy match returns near-misses above the explicit 0.4 threshold and nothing below, and each result carries its formal name
- The fuzzy query plan uses the trigram index rather than a sequential scan — `EXPLAIN` asserted, because a `similarity()` comparison silently cannot use one and the results look identical either way

**Grimoire**

- Every member including viewers can read every `workspace`-visible spell
- A spell's `derivedCategories` is the deduped union across its ingredients
- `categoryGaps` reports both directions correctly
- A spell survives soft-deletion of an inventory item for one of its ingredients
- A spell keeps an ingredient soft-deleted after it went into the jar, and that ingredient's categories still feed `derivedCategories`

**Invitations**

- Token mailed to the invited address, generated with a CSPRNG, stored only as a hash, and present in no response
- Acceptance requires the signed-in account's verified email to match; the same account unverified is pointed at the email page, a different verified address is refused
- An invitation with role `owner` is rejected by the check constraint
- Expired, revoked, and reused tokens all rejected, each with a distinct reason
- Accepting sets `canCreateWorkspace` on the accepting user
- Last-owner demotion fails

### GraphQL layer

- Schema snapshot test — the one permitted snapshot besides design tokens, since the schema _is_ a contract and unintended changes should be loud
- Client types are current — `src/gql/` regenerated in memory from the snapshot and compared, so a document changed without `npm run codegen` fails
- Depth limit rejects a query nested past 7
- Cost limit rejects an expensive composed query
- Introspection disabled in production config
- DataLoader batches — assert query count, not just correctness, on a 50-ingredient fetch
- Every mutation delegates to a service; no resolver touches `db`
- Error mapping — each of the three service error types leaves carrying its own `extensions.code`, a `ValidationError` leaves carrying `fieldErrors` matching its issues and its message verbatim, and a plain `Error` leaves masked with no message and no stack

### Component — Vitest + RTL

`tests/components/<Name>/index.test.tsx`, importing the component as `@/components/<Name>`. Mirrored under `tests/` rather than colocated: MB.41 moved the whole suite out of `src/`, so the directory a component test sits in is the component's own path with the tree swapped, and nothing under `src/` is a test. Queries are by role and label (CLAUDE.md, Testing).

- `IngredientSearch` — filtering, chip toggle, grouped chips collapse, clear, debounce via fake timers
- `IngredientForm` — fuzzy warning renders and names each match's formal name, a save holds on it until Create Anyway, compendium entries read-only for non-admins, the formal-name and form fields suggest in scope and accept free text outside the vocabulary
- `AddIngredientModal` / `EditIngredientModal` — validation, submit payload, Escape, focus trap, focus restore, pre-population, dirty-discard warning
- `InviteDialog` — link shown once, copy works, warning present, role selector offers viewer and member only (never owner)
- `MemberList` — role controls hidden from non-owners
- `WorkspaceSwitcher` — lists memberships, navigates on select
- `SpellBuilder` — add/remove/reorder, intent vs derived category comparison, visibility control defaulting to `workspace` and read-only once shared
- `IngredientCard` — safety and low-stock badges

MSW mocks `/api/graphql`. `tests/support/setup.ts` — since MB.97 `setup-msw.ts` for the MSW lifecycle, which the node `unit` project runs too, and `setup-dom.ts` for the rest — carries over the RTL `afterEach(cleanup)` and the `localStorage` polyfill — Node's native global still shadows jsdom's — plus MSW server lifecycle.

### E2E — Playwright

Specs: admin adds a compendium entry; A adds it to W's ingredients with a quantity; A builds a spell and checks the category comparison; A generates an invite link; B accepts, signs in, and lands in W seeing everything; C reads but cannot edit; D reaches for W's routes by URL and gets 404 throughout; A soft-deletes an item and confirms it's gone and the name can be reused.

`@axe-core/playwright` scans each page and each open modal. Accessibility is asserted here, matching the `resume-2026` pattern — no `vitest-axe`.

`webServer` runs `npm run build && npm run start` on **8001**, preserving the deliberate separation from the dev server's 8000, and one more `npm run start` over the same build for each further worker slot, on `8001 + slot` — each worker has its own server and database. One last `npm run start` on **8100** has every OAuth provider configured: the sign-in page's two availability states need a server each. Coverage via `monocart-coverage-reports`.

### Rules

- Bug fixes start with a regression test.
- Snapshots for design tokens and the GraphQL schema only.
- `fixtures/` factories, so tests read `makeIngredient({ categories: ['protection'] })`.

---

## 12. CI/CD and Git workflow

### Ported verbatim from `resume-2026`

`.github/workflows/` (`pr-gate.yml`, `merge-queue.yml`, the reusable per-check workflows `lint`/`format`/`typecheck`/`vitest`/`build`/`playwright`/`audit`/`gitflow`, the shared composite actions, `build-image.yml`) — MB.32 has since collapsed the five `lint`/`format`/`typecheck`/`build`/`audit` workflows into one `checks.yml` matrix and deleted `merge-queue.yml` until M7.A.1, so `claude-docs/ci.md` is the current inventory, `.actrc` and the `make act-*` targets, `Docker/` (multi-stage `Dockerfile.node` with `development`/`testing`/`devcontainer`, plus `docker-compose.yaml`), `.devcontainer/`, `makefile`, `.oxlintrc.json`, `.prettierrc`, `.prettierignore`, the `"pre-commit": ["lint", "format:check", "typecheck"]` array, and `.claude/skills/`.

### Gitflow — unchanged

`feature/*` → `staging`; `staging` promoted to `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` to either, with `create-pr` opening both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down. Dependabot targets `staging`, exempt by author.

### Changes in the port

| File                            | Change                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                  | `build`/`start`/`dev` → Next.js; drop `predevelop`/`prebuild`/`postclean` and the `link-public.js`/`clean.js` Gatsby workarounds; add `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `codegen`                                                                                                                                                                              |
| `playwright.config.ts`          | `webServer` → `npm run build && npm run start` on port 8001, one `npm run start` per further worker slot on `8001 + slot`, and the configured-providers server on 8100; local Postgres setup in `globalSetup`                                                                                                                                                                    |
| `vitest.config.ts`              | Two projects — `unit` (jsdom) and `db` (node, local Postgres); keep 80% thresholds                                                                                                                                                                                                                                                                                               |
| `.oxlintrc.json`                | Node-globals override swaps `gatsby-*.ts` for `next.config.ts`, `drizzle.config.ts`, `src/db/**`, `src/app/**/route.ts`                                                                                                                                                                                                                                                          |
| `docker-compose.yaml`           | Drop the Gatsby LMDB volume; keep `node_modules`; **add `postgres` service**, plus the one-shot `db-init` container that migrates and seeds before `app` starts (M1.24); `devcontainer` depends on it                                                                                                                                                                            |
| `netlify.toml`                  | Replaced by `vercel.json` — config only; `vercel.json` disables the Git integration and does not drive deploys (see below)                                                                                                                                                                                                                                                       |
| **New** codegen staleness guard | Fails if the generated client types in `src/gql/` are stale relative to the committed SDL — a test in `tests/guards/` on the `vitest` job, not a workflow of its own                                                                                                                                                                                                             |
| **New** `deploy.yml`            | CLI-driven Vercel deploy on push to `main`/`staging`/`hotfix/**` (§4). Not ported — `resume-2026` deployed via Netlify's own Git integration with no workflow file                                                                                                                                                                                                               |
| **New** `migrate.yml`           | Applies migrations to staging on merge to `staging`, production on merge to `main`; must complete before `deploy.yml` ships the new deployment (a `needs:` job or a `workflow_run` predecessor). Also seeds the two reference vocabularies — §6's categories (M4.3) and §5's ingredient forms (M4.3a) — in the same job and one step, and only when the push changed one of them |
| Secrets                         | `DATABASE_URL` per environment, `BETTER_AUTH_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, Google, Discord, Facebook and Microsoft OAuth client credentials, `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_SCOPE` for `deploy.yml`, `NEON_API_KEY` / `NEON_PROJECT_ID` for the production snapshot. `claude-docs/secrets.md` is the matrix                         |

`make docker-up` gives a working local database with no Neon connection at all.

**Manual setup:** enable "Require merge queue" in Settings → Branches on both `main` and `staging`, or `merge_group` never fires — and restore `merge-queue.yml` from git history with it, since MB.32 deleted the workflow rather than leaving it idle (M7.A.1).

**Docs:** adopt the `claude-docs/` convention — a summary per subsystem, corrected in the PR that stales it, and one doc per component. The append-only transcript and the scheduled compression pass were part of this convention and are retired (MB.31, §14).

---

## 13. v2

### Notes — the three-tier experience log

The flagship v2 feature and the first thing planned (the ingredient detail page in §9 is already built to take a section beneath it). Deferred from v1 because the visibility model and its UI are a milestone on their own — 17 tasks, 29 hours — and the core loop is provable without them.

**`notes` — first-class model.**

```ts
notes = {
  id,
  authorId, // FK users
  workspaceId, // authoring context
  ingredientId, // nullable
  spellId, // nullable
  body,
  occurredOn, // when the working happened
  rating, // 1-5, optional
  visibility, // 'private' | 'workspace' | 'public'
  publishedAt,
  ...auditColumns,
};
```

```sql
CHECK (num_nonnulls(ingredient_id, spell_id) = 1)
```

Nullable FKs with a check constraint rather than a polymorphic `subject_type`/`subject_id` pair — this keeps real foreign keys and real cascades, which polymorphic columns throw away.

| Visibility  | Visible to                                           |
| ----------- | ---------------------------------------------------- |
| `private`   | Author only, always                                  |
| `workspace` | Every member of `note.workspaceId`, viewers included |
| `public`    | Every signed-in user, attributed by `name`           |

Default is `workspace` in the authoring workspace — co-members seeing what you wrote is the useful default — with one click to `private`.

**Public requires a compendium ingredient.** A workspace-local ingredient can't carry public notes, since nobody else can see the subject. Enforced by trigger (Postgres won't allow a subquery in `CHECK`); the publish control is hidden in the UI and the server rejects it regardless.

**Leaving a workspace doesn't delete your notes there.** Workspace notes are contributions to a shared record; removing them on exit would gut the group's history.

```sql
CREATE INDEX ON notes (ingredient_id, visibility, occurred_on DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX ON notes (workspace_id, occurred_on DESC)
  WHERE deleted_at IS NULL AND visibility = 'workspace';
```

**Stories (the former 35–46):** write a dated note about how an ingredient performed · keep it private in any workspace · share it with the workspace · publish it to everyone · see which tier it is in before and after posting · a clear warning before publishing publicly · change visibility later, narrowing without retracting what's been read · read workspace and public notes on an ingredient, each attributed · sort public notes by recency or rating · edit or delete only your own · keep your notes when you leave a workspace · review all your notes in one place.

The `notesByIngredient` loader, `resolveNoteVisibility()`, `NoteComposer`, `NoteList`, and `tests/acceptance/05-notes.test.ts` all land with this feature.

### Edit history

Audit columns answer "who touched this last." History answers "what changed."

**One generic revisions table**, not a shadow table per model:

```sql
CREATE TABLE record_revisions (
  id           bigserial PRIMARY KEY,
  table_name   text        NOT NULL,
  record_id    uuid        NOT NULL,
  revision     int         NOT NULL,
  operation    text        NOT NULL,  -- insert | update | soft_delete | restore
  changed_at   timestamptz NOT NULL DEFAULT now(),
  changed_by   uuid        NOT NULL,
  old_values   jsonb,
  new_values   jsonb,
  changed_keys text[]      NOT NULL
);
CREATE INDEX ON record_revisions (table_name, record_id, revision DESC);
```

One PL/pgSQL trigger applied to every table. Because it reads `to_jsonb(NEW)` generically, adding a column needs no trigger change — the reason it beats per-model shadow tables on maintenance. `changed_by` comes from the `app.current_user_id` GUC that v1 already sets, so audit columns and history can't disagree.

Store only changed keys in `old_values`/`new_values`, with `changed_keys` as the index; reconstruct by replaying forward. Collapse revisions older than a year into a snapshot.

Visibility flips on notes land in `changed_keys`, giving a queryable record of exactly when something went public and who did it.

**A spell pins what went into it.** In v1 a layer reaches its ingredient's row as the row is now, deleted or not (§5, `spell_ingredients`). In v2 a layer references the exact revision of its ingredient. When the ingredient has been modified since, the spell says so, and the user can pull that precise modification into the spell — as a new revision of the spell, never a silent change to a record of a working.

**Stories:** view an ingredient's history as a timeline · field-level diff between revisions · see who made each change · restore a previous revision (as a new revision, never a rewrite) · undo a soft delete from a trash view.

**Restore, then edit.** Undo is a named writer method per tier — `restoreByIdInWorkspace(membership, …)` and `restoreByIdInCompendium(admin, …)` — that reaches only a deleted row, clears `deleted_at` and `deleted_by`, and stamps `updated_by` as the restorer, which the trigger records as `restore`. An edit is then the ordinary update of the row it brought back, in the same transaction if both are wanted. Nothing writes a row while it stays deleted: v1's writer skips one on every update, and an edit made in place would be a write nobody can see or check until the row came back. The restore needs an `applyAudit` operation of its own, since every payload has the audit columns stripped, and it can meet a partial unique index that a later row now holds, which the service refuses on the field that collides, as it refuses any write.

### Spell approval for viewers

Viewers can currently read workspace spells and nothing else. This gives them a contribution path.

**Schema:** `spells.status` gains two values — `draft | proposed | approved | complete` — plus `proposedBy`, `proposedAt`, `reviewedBy`, `reviewedAt`, `reviewNote`.

**Flow.** A viewer creates a spell in `draft`, visible only to them. They submit it, moving it to `proposed`, at which point owners and members can see it. Any owner or member approves it into `approved`, or returns it with a `reviewNote`. Approved spells behave like any other workspace spell.

The generic revision trigger above already captures every status transition and who made it, so review history comes free. The same `proposed` state is what the compendium suggestion flow needs, so the two features share a pattern rather than inventing two.

**Stories:** as a viewer, draft a spell privately · submit it for review · see its review status · receive a returned spell with feedback · as a member, see the proposal queue · approve or return with a note · as a viewer, see who approved my spell.

### Compendium and category suggestions

`compendium_suggestions` table. Users propose ingredients and categories; admins approve into the global compendium. Reuses the `proposed` pattern above.

**Suggesting a change to an existing entry** (MB.80) is the same queue with a second subject: a suggestion carries either a new entry or the id of an existing one plus the fields it would change and a reason. It is offered on the compendium entry page, public and in-app alike, to a signed-in account — a visitor who wants to suggest signs in first, the one thing the public compendium asks anyone to do, and what keeps the queue attributable. An admin sees the proposed diff beside the current entry and accepts it as an ordinary compendium write under `withAudit`, so the audit stamps name the admin and the suggestion keeps who proposed it; a rejection carries a reason back to the proposer. Nothing in v1 leaves a hook for it beyond the entry page's shape.

### Bulk add from the compendium

v1 adds compendium ingredients to a workspace one row at a time — story 14, the "Add ingredient" action slot on `IngredientSearch`. Stocking a fresh workspace from a 200-entry compendium is 200 modal round trips. This makes it one.

**No schema change.** Bulk add writes the same `inventory_items` rows as `addIngredientToWorkspace`; it only batches them. The partial unique index on `(workspace_id, ingredient_id) WHERE deleted_at IS NULL` already defines what "already added" means, and nothing else in §5 is touched.

**UI.** `/compendium` gains a selection mode. A toggle turns each result row into a checkbox; a header control selects every entry matching the current filter — filter state is already in the URL, so "select all" means all matching rows, not just those on screen. A sticky bar shows the count and an **Add to ingredients** action. If the user belongs to more than one workspace the bar carries a workspace picker, since the compendium is shared across workspaces and the target can't be inferred from the route. Selection clears on leaving the mode or navigating away.

**Stock is left as a stub.** Bulk add doesn't collect quantity or unit per row — that would rebuild the per-row modal it exists to replace. Rows land with null stock, consistent with story 29's "save a stub and enrich it later." An optional shared `defaults` (unit, low-stock threshold, source) applies to every row in the batch for the common case of "add these twelve dried herbs, all measured in grams."

**One service call, one transaction.** `ingredientsService.bulkAdd(session, { workspaceId, ingredientIds, defaults })`:

- `assertMembership(session, workspaceId, 'member')` once, not per row.
- Reject the whole call if any id isn't a live compendium entry (`workspace_id IS NULL AND deleted_at IS NULL`). A client sending those is malformed, not a user making a choice.
- One `INSERT ... SELECT ... ON CONFLICT DO NOTHING` against the partial unique index, inside a single `withAudit()` so every row is stamped from the session and `app.current_user_id` is set once.
- A previously soft-deleted row is a conflict, not a fresh insert: a second statement clears `deleted_at`/`deleted_by` on those and counts them as restored.
- `RETURNING` separates added from skipped without a follow-up read.

**Partial success, with a report.** The result names what was added, what was already present, and what was restored from trash. Skipping an already-present ingredient is the expected case when someone re-runs a selection — not an error to roll the batch back on.

```graphql
type Mutation {
  bulkAddToIngredients(
    workspaceId: ID!
    ingredientIds: [ID!]! # capped at 100, matching the page maximum (§7)
    defaults: StockInput
  ): BulkAddResult!
}

type BulkAddResult {
  added: [InventoryItem!]!
  restored: [InventoryItem!]!
  skipped: [SkippedIngredient!]!
}

type SkippedIngredient {
  ingredient: Ingredient!
  reason: SkipReason! # ALREADY_PRESENT
}
```

**Cost.** The write is one insert plus one update regardless of selection size, so it doesn't reopen §4's N+1 concern. The 100-id cap keeps a single mutation's cost bounded and aligned with the depth and complexity limits already enforced (§7); a larger paste becomes two actions instead of one.

**Tests.** Reuses the §11 data-layer harness: D's bulk call into W is rejected; a batch mixing new, already-present, and soft-deleted ids returns each in the right bucket and stamps `created_by` on only the new rows; a non-compendium id anywhere in the list fails the whole call; the 101st id is rejected.

### Duplicate merge

Pick a survivor, repoint `inventory_items`, `spell_ingredients`, `ingredient_categories`, and `notes`, soft-delete the loser.

### GraphQL response caching

Yoga's response cache, keyed on query, variables, and session:

```ts
useResponseCache({
  session: (req) => req.context.session?.userId ?? null,
  ttlPerType: { Ingredient: 3600_000, InventoryItem: 30_000, Note: 30_000 },
  invalidateViaMutation: true,
});
```

**Deferred because in-memory caches on cold-starting serverless instances have a poor hit rate at low traffic.** Revisit when either trigger fires: function compute becomes visible in Vercel usage reports, or the app gains enough concurrent users that instances stay warm. Upstash Redis has a free tier and would give a shared cache across instances — that's the version worth building if it comes to that.

### A first-party credential: passkeys

A way to sign in that the site holds itself, for someone who wants one beside their provider. **Passkeys are the v2 answer** (MB.74, [`mb.74-better-auth-plugins.md`](design-decisions/mb.74-better-auth-plugins.md)): no password, so no reset. Someone who loses their device signs in through their provider and enrols another. It needs Better Auth's separately packaged passkey plugin and a core version to match, a `passkeys` adapter table, and an enrol control on the `/account` page. A passkey is bound to its origin, so staging's and production's are distinct. A mailed magic link or code is the fallback for someone with none of the four providers, and comes after.

**Email and password is what passkeys replace.** Better Auth adds it without migration, and it would reintroduce the reset problem: admin-mediated single-use links and a `password_reset_tokens` table with `createdBy`, since that table is a backdoor into any account and its use must be auditable. Two-factor, a CAPTCHA and a breached-password check each guard a password sign-in and nothing else, so they come only with it.

### Note moderation

`note_reports` (`noteId`, `reporterId`, `reason`, `resolvedAt`, `resolvedBy`). Pointless before there are enough users to need it.

### Saved spell notes

The nullable `spellId` on `notes` already accommodates it.

### A workshop-viewer role

The staging component workshop is admin-only in v1 (M2.10): reviewers who should see real component states — a developer, a product reviewer — would otherwise need admin's powers over the compendium and the admin roll to get them. A site role, or a grant beside `role`, that opens the workshop and nothing else. `assertWorkshopAccess()` (`src/modules/identity/services/workshop-access.ts`) is the one rule that changes; how the role is granted and revoked follows whatever MB.59 settles for admin.

### Try before sign-up

Better Auth's `anonymous` plugin mints a `users` row and a session for a visitor so work done before signing up can be kept — a visitor drafting a spell against the public compendium, then keeping it by accepting an invitation. Declined for v1 by MB.80, where it was weighed against the public compendium, whose read needs no identity ([`mb.80-public-compendium.md`](design-decisions/mb.80-public-compendium.md), "What it rules out"). If the feature is wanted, the plugin is the mechanism, and its rows would need the same provisional-account expiry MB.67 gives unverified sign-ups. The mb.74 record moved it from "never" to here.

### Help and FAQ articles

Wanted, and shaped at minting so it is not re-derived (MB.175): an FAQ and a set of help articles on how the site is used, **rows a site admin edits rather than files in the repo**, so an article changes without a deploy — `help_articles`, with a `kind` of `faq` or `article`, a `title`, a `slug`, a `summary`, a Markdown `body` and a `position` for the FAQ's order, the audit spread and a `seedKey` — managed at `/admin/help` and **read without an account** at `/help` and `/help/[slug]`, public and indexable on the compendium's frame (MB.83), the Markdown rendered through a sanitising renderer. Two v1 invariants widen when it is built, each recorded as a design decision then: admins curate the help articles beside the compendium and its vocabularies, and `/help` joins `/compendium` as a public surface, carrying no workspace data. The articles ship as a seed keyed on `seed_key` (MB.171). Nothing in v1 builds, seeds or links it.

### Subscription billing

The owner means to charge for the site eventually. What is wanted, written down so it is not re-derived: **the workspace is what pays**, and its owner is the one who subscribes; the price scales with the workspace's member count; a new workspace can get free months; an admin can make a workspace free until they say otherwise; and someone who belongs to several workspaces pays less. Nothing in v1 bills, stores a Stripe id, or gates anything on payment.

**Better Auth's Stripe plugin, `@better-auth/stripe`, was read against those five, not run** (MB.79; its documentation and source in September 2026, peer `stripe@^22`). It carries the plumbing — the Stripe customer, Checkout, the billing portal and webhook signature verification — and one of the five outright:

| Wanted                                 | What the plugin does                                                                                                                                                                  | What would be ours                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The owner pays for the workspace       | Every subscription carries a `referenceId`, and `authorizeReference({ user, session, referenceId, action })` decides who may act for it; without the callback a foreign id is refused | `referenceId` is the workspace id and the callback is `assertMembership` with the owner's statement, so the check stays in `src/modules/*/services/`. The plugin's own organization mode needs the organization plugin, which MB.30 rejected                                     |
| Priced by member count                 | `seats` on upgrade becomes the line item's `quantity` and is stored on the row                                                                                                        | Set at checkout only. Its automatic resync is driven by the organization plugin's member hooks and refused without it, so the membership service would update the quantity on every add, removal and accepted invitation                                                         |
| Free months                            | A per-plan `freeTrial.days`, sent as Stripe's `trial_period_days`                                                                                                                     | One trial per Stripe customer, ever, across every plan. "The first month is free" fits; "a free month for this coven, granted later" is a coupon                                                                                                                                 |
| Free until an admin clears it          | Nothing                                                                                                                                                                               | A flag on `workspaces`, written through `withAudit` by an admin mutation and read by the entitlement check before any subscription row. A 100% coupon would also work, but its truth would live in Stripe, unaudited                                                             |
| Less for someone in several workspaces | Nothing: the upgrade call takes no coupon or discount                                                                                                                                 | Computed by a service and applied as a Stripe coupon, at checkout through `getCheckoutSessionParams` and afterwards through the Stripe API. It needs a definition first: a workspace has one paying customer, so it must say whose invoice a member's other memberships discount |

**It carries MB.30's two structural costs.** Its `subscription` table and `users.stripeCustomerId` are written by Better Auth's adapter and by the webhook handler, with no audit columns and no path through `withAudit`, and the webhook has no session to stamp from. It mounts upgrade, list, cancel, restore and billing-portal routes under `/api/auth/subscription/*`, browser-facing and outside `/api/graphql`, the objection §14 records against the organization plugin's routes. Its row is also a copy of Stripe's state, stale until the next event arrives. The webhook route is not a cost of the plugin: Stripe calls it, so it is a plain route whichever way this goes.

**Decided now:** billing attaches to the workspace, and entitlement and the admin exemption live in this schema, under `withAudit`, whatever carries the payment. **Open until the work is scheduled:** the plugin, or a thin service over the Stripe SDK with audited tables of its own. That is settled the way MB.30 was, by a spike against Stripe's test mode rather than from the documentation. Nothing in v1 leaves a hook for it; a billing reference on `workspaces` is purely additive when it comes.

---

## 14. Decision log

Choices made during design that a future reader might otherwise revisit.

| Question                                                          | Answer                                                                                                                                                                                                                                                                                   | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gatsby, like `resume-2026`?                                       | No                                                                                                                                                                                                                                                                                       | SSG has no server runtime for sessions or audit stamping                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Vite SPA?                                                         | No                                                                                                                                                                                                                                                                                       | Neon has no browser-facing API; client-set `created_by` is forgeable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Supabase?                                                         | No                                                                                                                                                                                                                                                                                       | Free tier pauses after 7 days and needs manual restore                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Render Postgres?                                                  | No                                                                                                                                                                                                                                                                                       | Free instance expires 30 days after creation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| SQLite for tests?                                                 | No                                                                                                                                                                                                                                                                                       | Cannot run PL/pgSQL triggers, `pg_trgm`, `num_nonnulls`, generated columns, or array columns (`planets[]`, `elements[]`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A second authorization layer?                                     | Yes — a branded `Membership` proof                                                                                                                                                                                                                                                       | A forgotten check in one service is the realistic bug and the blast radius is another coven's grimoire. A finder that demands the proof `assertMembership` returns makes the omission a compile error, and the type is erased, so the layer costs nothing at runtime (MB.29)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RLS in v1?                                                        | No — deferred to the public launch                                                                                                                                                                                                                                                       | Real policies need the app to stop owning its tables, plus derived credentials on every environment and a transaction on every read to carry the GUC — four round trips where a read is one, on a meter that bills I/O wait (§4). The `Membership` proof covers the same bug for free. `withAudit` keeps publishing the GUC, so policies stay one migration away; [`mb.24-rls-role-split.md`](design-decisions/mb.24-rls-role-split.md) is that migration's specification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A read-side `withViewer` wrapper?                                 | No — never built                                                                                                                                                                                                                                                                         | It existed only to give a read a transaction for the RLS GUC to be `LOCAL` to. With policies deferred there is no reader, so reads open no transaction to carry identity and rule 3 covers writes alone (MB.29 retires MB.26)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Neon branches for CI?                                             | No                                                                                                                                                                                                                                                                                       | Local Postgres is faster and removes the branch limit and API key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Netlify?                                                          | No                                                                                                                                                                                                                                                                                       | Vercel Hobby has 6,000 build minutes vs 300 and native Next.js                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Apollo Client?                                                    | No                                                                                                                                                                                                                                                                                       | Duplicates TanStack Query's cache, adds ~40 kB                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Polymorphic note subject?                                         | No                                                                                                                                                                                                                                                                                       | Nullable FKs plus `num_nonnulls` keeps real referential integrity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Shadow history tables?                                            | No (v2 uses generic)                                                                                                                                                                                                                                                                     | One trigger survives schema drift; per-model tables don't                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Email/password in v1?                                             | No                                                                                                                                                                                                                                                                                       | Copy-link reset isn't self-service; OAuth removes the subsystem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Bulk add: all-or-nothing?                                         | No — partial with a report                                                                                                                                                                                                                                                               | Skipping an already-present entry is the expected case on a re-run, not a failure; the call only aborts on ids the user couldn't act on anyway                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Notes in v1?                                                      | No — v2                                                                                                                                                                                                                                                                                  | Cuts 17 tasks / 29 hours; the three-tier visibility model and its UI are a milestone on their own and the core loop is provable without it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Personal workspaces?                                              | No                                                                                                                                                                                                                                                                                       | A `kind` column plus "can't gain members / can't be deleted" special-casing for a one-person space that otherwise behaves like every workspace; drop it and every workspace is identical                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Open sign-up?                                                     | No — invite-gated                                                                                                                                                                                                                                                                        | Signing in earns an account only; `canCreateWorkspace` is granted by an invitation or an admin and persists until an admin revokes it. Keeps the compendium curator off the hook for unbounded sign-ups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Private spells in v1?                                             | Yes — `private \| workspace`                                                                                                                                                                                                                                                             | One enum column and one clause in the finders that reach a spell; a member drafting a working unseen is a real need. `private → workspace` is one-way so shared history can't be retracted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Invitations can grant owner?                                      | No — `viewer \| member` only, DB-enforced                                                                                                                                                                                                                                                | A link only proves receipt and can be forwarded; ownership is granted by an existing owner on the members page once there's an identifiable account                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Cross-dimension unit conversion?                                  | No                                                                                                                                                                                                                                                                                       | g→tsp depends on the substance; a wrong factor silently doubles or halves an ingredient. Convert within weight or within volume only; count converts to nothing; no density table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A formal name required everywhere?                                | No — in the compendium only                                                                                                                                                                                                                                                              | A safety note on an ambiguous label is the dangerous case, so the curated tier must carry one; demanding it locally would break story 29's one-field stub, and salt's formal name is chemical while graveyard dirt has none in any system                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Identity on the display label?                                    | No — on the generated `canonicalKey`                                                                                                                                                                                                                                                     | `lower(name)` uniqueness forbade the compendium holding four Cat's Claws at all, so the ambiguity could not even be documented. Moving identity onto the formal name is also what makes `name` freely relabellable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Is `form` part of identity?                                       | Yes — folded into `canonicalKey`                                                                                                                                                                                                                                                         | Valerian root and valerian leaf are different ingredients with different correspondences and different safety notes; the European Pharmacopoeia names taxon plus part for the same reason. It is also what separates the cat's-claw vine from a literal claw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `form` as a pgEnum?                                               | No — free text over an admin-curated vocabulary, and **not** a foreign key; a pick records its row beside the text (MB.165)                                                                                                                                                              | The value set must grow (animal parts, preparations) and stay writable before curation catches up. An FK would key identity on an id and make an unlisted value impossible; text lets `canonicalKey` normalise the string, and every function in that expression must be `IMMUTABLE`, which an enum cast is not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Admins curate a third resource?                                   | Yes — the form vocabulary                                                                                                                                                                                                                                                                | It is global, viewer-independent, and needs a description per value; a hard-coded list would need a deploy to add `rhizome`. `/admin/forms` is gated exactly like `/admin/categories`, and the invariant was extended to name it — see the group-vocabularies row below, which extended it again (MB.35)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `fungal` as its own nomenclature?                                 | Yes — split by organism, not by code                                                                                                                                                                                                                                                     | Fungi are governed by the ICN alongside plants, so this is the one value with no code of its own. Kept because curators shelve mushrooms separately from herbs. The departure is deliberate: do not "correct" it into `botanical`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A category's `group` as a pgEnum?                                 | No — its own table (MB.35)                                                                                                                                                                                                                                                               | An enum was right for the closed set §6 described and wrong once an admin may add a ninth group: `ALTER TYPE … ADD VALUE` is DDL, migrations here are forward-only and CI-gated, and an admin mutation cannot run DDL at all. As a table the group also gains the per-row colour pair an open set needs; ordering is alphabetical by name, so no order column `ingredient_forms.group` moves the same way in the same pass, since M4.2a is the adjacent task and the two would otherwise diverge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| One group table with a `kind`, or two?                            | Two — `category_groups`, `ingredient_form_groups` (MB.35)                                                                                                                                                                                                                                | A shared table with a discriminator would let `categories.groupId` point at a form group, failing invisibly at render time; two tables make the same mistake a foreign-key violation. Impossible rather than merely absent, for the price of one extra `CREATE TABLE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| A group as a foreign key, when `ingredients.form` is not?         | Yes — and the asymmetry is the rule, not an exception (MB.35)                                                                                                                                                                                                                            | `form` is written by a _member_, who must be able to write `rhizome` before anyone curates it. Groups are written only by admins, on both sides, so an FK blocks nobody — and a typo'd group would otherwise empty a chip section silently. The generalisation: a vocabulary a member writes is text, a vocabulary only an admin writes is a foreign key. MB.165 adds a link beside a member's text to the curated row picked, which keeps the text and its identity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Where a group's colour comes from                                 | Two hexes on the row, one per theme, each contrast-checked on write (MB.35)                                                                                                                                                                                                              | A group created at runtime cannot have a Sass variable, so M0.7's eight build-time tokens stop being the runtime lookup and become M4.3's seed values — the hue rotation and per-theme tuning still give the starting eight their family resemblance. Generalising the rotation to N groups was the alternative and was rejected as more machinery than the feature is worth; one column per theme because each seeded group is tuned separately per theme and one hex cannot clear 4.5:1 on both soot and parchment; each is checked on write against its own theme only, on that theme's harder surface (MB.36), so the floor is exact and the admin picks both swatches side by side                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| A colour on a category as well as its group?                      | No — the group's pair is the chip colour (M4.2)                                                                                                                                                                                                                                          | MB.35 made a group's colour two hexes, one per theme, and a single `color` on a category could hold neither half of that pair — nor did M4.3 have anything to seed it with, since the resolution it describes writes onto the group row. Dropping it keeps one source for a chip's colour rather than a per-category override shadowing a per-group value, and §6's grouping exists precisely so 52 chips read as eight families. A per-category colour is addable later as a widening if one is ever wanted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Admins curate a fifth and sixth resource?                         | Yes — the two group vocabularies (MB.35)                                                                                                                                                                                                                                                 | They are global, viewer-independent and admin-only, exactly like the three before them, and the whole point of the change is that adding one needs no deploy. The invariant now reads "the compendium, global categories, the ingredient form vocabulary, and the two group vocabularies that organise them — and nothing else", and M6.6 still asserts an admin reaches no workspace's data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Admins curate a seventh and eighth resource?                      | Yes — the planet and zodiac vocabularies (MB.91)                                                                                                                                                                                                                                         | M4.5 left the suggestion lists in a TypeScript constant, the shape `form` had before MB.35, so adding a body was a deploy. As `planets` and `zodiac_signs` they are global, viewer-independent and admin-only, like the six before them; the invariant names them, `/admin/planets` and `/admin/zodiac-signs` sit under the same gate, and M6.6 still asserts an admin reaches no workspace data. No order column — the lists are alphabetical and the autofill ranks by match — and the admin pages read the compendium tier only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `element` and `nomenclature` as tables too?                       | No — only planet and zodiac moved (MB.91)                                                                                                                                                                                                                                                | Both are closed sets rather than vocabularies. `element` would need its column moved off the enum, reversing §5, which calls that set the exact opposite of `form`. `nomenclature` is worse: the CHECK coupling it to `canonicalName` names `none` and `unknown`, a CHECK cannot read another table, so the coupling would become a trigger and the identity model's most load-bearing set would turn editable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Admins curate a ninth and tenth resource?                         | Yes — the deity vocabulary and its traditions (MB.127)                                                                                                                                                                                                                                   | `deities[]` had no suggestions at all, so each member spelled a practice's gods their own way. As `deities` and `deity_traditions` they are global, viewer-independent and admin-only, like the eight before them; the invariant names them, `/admin/deities` and `/admin/deity-traditions` sit under the same gate, and M6.6 still asserts an admin reaches no workspace data. Each deity on an ingredient stays text, by the rule that a vocabulary a member writes is text, and MB.165 records a pick beside it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Deities grouped by tradition?                                     | Yes — two tiers, as the forms are (MB.127)                                                                                                                                                                                                                                               | The owner's call. Every tradition has its thunder god and its Moon, so a suggestion carries its tradition, "Hecate (Greek)", and an admin curates the list by it. One tradition per deity, by the forms' one-group rule; a god several traditions honour is filed under one and its description names the others. A tradition labels a suggestion, so it takes no colour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A deity's description required?                                   | Yes — on deities and traditions alike (MB.127)                                                                                                                                                                                                                                           | A seed of 188 is the argument for it: the description is search surface, carrying the tradition and the other spellings (_Hekate_, _Freyja_), so a reader who types either finds the one curated row. MB.127 writes the seed's descriptions with the list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A tradition a region, or a people?                                | A people or a religion, never a region (MB.127)                                                                                                                                                                                                                                          | Irish, Welsh, and Gaulish and British rather than Celtic; Taoist, Chinese Buddhist and Chinese folk rather than Chinese; Akan, Igbo, Fon and Ewe, Kongo and Zulu each its own rather than any corner of a continent — the owner's call, so a member reads the tradition a practice names and no living religion is filed as a region's footnote, at the cost of a few traditions of one or two rows. The seed doc records what each split and each addition rests on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| A deleted tradition's deities?                                    | Move to a live tradition the admin picks, as a form group's forms do (MB.132)                                                                                                                                                                                                            | A deity is curated only while its tradition is live, so refusing the delete while one is picked would leave the admin re-filing a whole pantheon by hand, and leaving the deities in place would hide rows that still hold their slugs. Moving them keeps every pick curated, so a compendium entry never refuses the delete; each moved deity is re-slugged under its new tradition, and a move onto another's address is refused                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| The compendium held to the curated vocabularies?                  | Yes — its form and deities pick live curated rows, its planets and signs name them (MB.162, MB.167)                                                                                                                                                                                      | The owner's call. MB.131's autofill heads curated rows "From Compendium" and the rest "From Coven", true only while no compendium entry holds an uncurated value, and the admin who writes an entry curates the lists, so a missing value is added there first. The columns stay text, since a coven writes them freely, so the compendium services check the four. Deleting a row a live entry holds is refused, naming the entries, rather than stripping the value from them unseen or leaving it to break the rule after the write; a rename carries onto the entries in the same transaction rather than being refused, which a typo fix would trip on, and MB.163 moves that rewrite to a background job                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Planet, zodiac sign and colour as lists?                          | Yes — `planets`, `zodiac_signs` and `colors`, three `text[]` columns beside the retired `deities[]` (MB.134)                                                                                                                                                                             | A herb ruled by both Venus and the Moon is how a practice records it, and one value per ingredient made a member choose. They stay free text, validated as `deities` is, and keep the order entered, since a ruler is written first. New names rather than a type change in place, because the lists must exist beside the single columns for the deploy between MB.135 and MB.137 that rule 10 requires; and no GraphQL deprecation window, since nothing outside the app reads the API. Colour keeps no vocabulary and no suggestions, the owner's call                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Element as a list?                                                | Yes — `elements`, an `ingredient_element[]` beside the free-text lists (MB.157)                                                                                                                                                                                                          | A herb worked with both fire and air is how a practice records it, the owner's call during MB.131. The set stays closed, so nothing is typed. The list keeps the order chosen, as every list does, and refuses a repeat where the free-text lists keep one, since the form never offers a chosen element twice. A new name and rule 10's three steps, MB.158 to MB.160, for the reason MB.134's lists took them, and no GraphQL deprecation window, for the same reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| A substitute links an ingredient?                                 | Yes — `ingredient_substitutes`, a link or a typed name per row, alphabetical (MB.138)                                                                                                                                                                                                    | A substitute a member recorded should lead to its page, and a typed one should still save, so a row is either, held by `num_nonnulls` as a spell layer is. A compendium entry links only the compendium, since it is public and a coven's entry is not; a coven's links either tier, its own coven's included. Full audit spread and soft-deleted, as content like a folk name, and read alphabetically, each substitute once, as folk names are, the owner's call. The picker reads `ingredientSuggestions`, since the existing lookups answer with names, compare whole names or leave out the compendium                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| A substitute whose ingredient is deleted?                         | Kept as a link, shown as text under its last name (MB.138)                                                                                                                                                                                                                               | Turning it to text at the delete would have an admin's compendium delete rewrite rows in every coven, which M6.6 forbids, and could not be undone by v2's restore; dropping it would lose what a member recorded without a word. It costs a third named finder reaching a soft-deleted ingredient, in M5.3's shape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A picked form or deity recorded?                                  | Yes — `ingredients.formId`, and `ingredient_deities`, a name per row with the curated deity picked, in the order entered (MB.165)                                                                                                                                                        | Two live curated rows may share a name, so "Wax (Animal)" and "Wax (Substance)", or Greek and Roman Hecate, saved alike and nothing after the save could say which was picked; the owner chose to store the pick before showing it (MB.169). The link sits beside the text rather than replacing it, so identity stays on the text and an uncurated value stays writable; only a pick sets it, and a link to a soft-deleted row reads as its text, needing no soft-delete exception. Deities keep the order entered, as the other correspondences do, the owner's call, so the table stores a position; a repeat is refused, as a substitute's is. Two entries with one formal name, one picked as each Wax, still share a `canonicalKey`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A picked deity whose deity is retired?                            | Kept, shown as its name, as a substitute is (MB.167)                                                                                                                                                                                                                                     | A save sending back the name, or the id, keeps the row and its link; a compendium entry must re-pick                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| A compendium form or deity held by spelling?                      | No — by pick, its planets and signs by spelling (MB.167)                                                                                                                                                                                                                                 | MB.162's rule moved onto the link; a typed curated name is refused as an uncurated one is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A separate `displayName` column?                                  | No                                                                                                                                                                                                                                                                                       | `name` already is the display label. Promoting a folk name is a swap between `ingredients.name` and one `ingredient_folk_names` row in one transaction, and the fallback is a write-time prefill from `canonicalName` — the `lowStockThreshold` idiom, not a read-time default                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| External taxonomic identifiers (POWO, IPNI, GBIF, CAS, IMA)?      | No — not in v1                                                                                                                                                                                                                                                                           | Nothing reads one, CLAUDE.md forbids hooks for unbuilt features, and taxonomic ids churn. A nullable text column is purely additive later                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Server functions instead of GraphQL?                              | No — GraphQL kept                                                                                                                                                                                                                                                                        | Weighed in full (MB.31). Only ~14h of the plan exists purely for the transport; the rest is services, validation, pagination and batching wearing it. A single typed contract, an SDL that makes schema changes visible in a PR, and introspection while building were judged worth that. The cost is accepted with it: `updateTag` is Server-Actions-only and so unreachable behind the route handler (§7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Trunk-based instead of Gitflow?                                   | No — Gitflow kept as ported                                                                                                                                                                                                                                                              | Weighed in full (MB.31). Trunk plus per-PR previews would remove `gitflow.yml`, `merge-queue.yml` (since deleted by MB.32), three skills, the `staging` branch and its Neon branch-scoped override — but it also removes the staging soak, and the ported workflow is understood and working. Revisit if the promotion pipeline starts costing more than it catches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Soft-delete the join tables too?                                  | Not two of them: `ingredient_categories` and `spell_categories` are hard-deleted and keep the four stamp columns (MB.34). `spell_ingredients` is soft-deleted (MB.110)                                                                                                                   | A chip toggled off is a write to the highest-churn tables in the schema, and nothing in v1 reads a deleted join row: there is no restore UI, and the trash view is v2. What decides it is that a pair is a pairing, not content: it holds nothing of its own, so a re-toggle restores it and a tombstone keeps nothing. MB.34 argued from the `deleted_at IS NULL` a service joining _through_ the table would have to remember by hand; `existsIn` (MB.100) has since ANDed it by construction, so that no longer decides it ([`mb.125-delete-names-rows-by-value.md`](design-decisions/mb.125-delete-names-rows-by-value.md)). `created_by` stays because "who added this" is story 13. `spell_ingredients` was the third until MB.110: a spell is a record of a working, so a layer taken out of it is a tombstone, keyed by a surrogate `id` so it holds no depth, and what reads through it does so by `existsIn`, which ANDs its filter by construction ([`m5.3-spells-keep-deleted-ingredients.md`](design-decisions/m5.3-spells-keep-deleted-ingredients.md)). `workspace_members` and `ingredient_folk_names` keep the full spread: the first records who removed whom, the second holds content rather than a link. The v2 history trigger records a `DELETE` as readily as an `UPDATE`, so history is unaffected                                                                                                                                      |
| Custom spell ingredients in their own table?                      | No — columns on `spell_ingredients`, nullable FK + `num_nonnulls` (MB.40)                                                                                                                                                                                                                | A layer is a layer: quantity, unit, layer order and note are the same whichever kind of row it is, and a second table would split layer ordering across two tables, where no constraint can hold it — every jar read a `UNION`, every reorder a two-table rewrite, every client a union type. Same table, on the idiom the "Polymorphic note subject?" row already blesses. One-off rather than reusable, because reusable is a workspace-local `ingredients` row and already exists (story 29); `form` is text by the "`form` as a pgEnum?" row. The key moves onto `(spell_id, layer_order)` because the old pair no longer exists on every row, and one-ingredient-per-jar survives as a partial index; MB.110 later moved the key onto a surrogate `id`, once a removed layer became a tombstone. Done in Wave 4 against an empty table rather than as a fast-follow, which would have cost a retrofit across every Wave 13 consumer and a breaking nullability change in the SDL. [`mb.40-custom-spell-ingredients.md`](design-decisions/mb.40-custom-spell-ingredients.md)                                                                                                                                                                                                                                                                                                                                                                                 |
| Per-task transcripts and scheduled compression passes?            | No — retired (MB.31)                                                                                                                                                                                                                                                                     | A PR body already carries what a transcript said, and a statement is cheapest to fix in the diff that stales it rather than in a sweep weeks later. The rule survives in CLAUDE.md; only the schedule and the append-only file are gone. `MW.15` still closes v1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Better Auth's organization plugin for workspaces and invitations? | No — spiked and not adopted (MB.30)                                                                                                                                                                                                                                                      | Run against a real database, not read from its docs: every write is unaudited and every delete is hard; the invitation id is the token, stored in plaintext and returned to every member; acceptance is bound to the invited email with no option; an omitted `organizationId` falls back to a session-held active workspace (§9's two-tabs bug); and ~20 `/api/auth/organization/*` routes carry workspace data outside GraphQL. What it gets right — the last-owner guard, the creation gate — the service wraps anyway. [`mb.30-organization-plugin.md`](design-decisions/mb.30-organization-plugin.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A form library?                                                   | Yes — react-hook-form, with `@hookform/resolvers/zod`                                                                                                                                                                                                                                    | Form state is the one client concern the stack left unnamed, and every form task (M5.9, M5.6a, M10.12) validates with the shared Zod schema of M4.5/MB.8, so the resolver runs the schema the service will run again — one set of rules in two places, the same shape as the two transports. `useFieldArray` covers the six list fields (folkNames, planets, zodiacSigns, deities, colors, substitutes). Closed enums — nomenclature, unit, visibility, status — are the combobox's select-only box, `ComboboxSelect`, the suggesting fields' control and list with nothing to type (the owner's call during MB.131, [`design-decisions/mb.131-closed-sets-on-the-combobox.md`](design-decisions/mb.131-closed-sets-on-the-combobox.md)); `elements`, a list of a closed enum, is the same box choosing several, its chosen elements chips inside the control as every list's are, its list offering the elements not yet chosen (MB.157); the planet, zodiac sign and deity entries are suggested free text like `form` (§5), colours free text with no suggestions; categories are the same box as the lists, its rows under the groups' headings and its picks chips in their group's colour, `CategoryPicker` (MB.126, the owner's call: [`design-decisions/mb.126-categories-on-the-combobox.md`](design-decisions/mb.126-categories-on-the-combobox.md)), which M8.11 reuses as its filter. No server actions, per §2: the form submits a GraphQL mutation |
| react-select for the suggesting fields?                           | No — one `Combobox` component on Downshift's `useCombobox`                                                                                                                                                                                                                               | Only the suggesting fields need a combobox — M5.10a's common-name and form lookups, and MB.131's planet and zodiac sign lists — and M5.10a's criteria decide the library: the group is part of the option's _accessible name_, curated and in-use values are visibly distinguished, and the list ends in an explicit "use what you typed" row. react-select renders its own DOM through Emotion, so each of those is a fight with `formatOptionLabel` and a second theming system beside the Sass tokens the design says not to build past — and it is ~30 kB for a handful of fields, the same argument that rejected Apollo. A hand-rolled combobox is the wrong fix in the other direction: keyboard and `aria-activedescendant` handling is a known trap. The headless hook owns the ARIA and keyboard state and nothing else; the markup, the option content and the Sass are ours. Free text is its default behaviour — selecting an item fills `inputValue` and links nothing, which is what M5.10a asks. Installed by M5.9/M5.10a, not before                                                                                                                                                                                                                                                                                                                                                                                                            |
| A library to move a list's entries?                               | Yes — dnd-kit's sortable preset, `@dnd-kit/core` and `@dnd-kit/sortable` (MB.170)                                                                                                                                                                                                        | Planets, zodiac signs, colours and deities keep the order entered, so their chips move, and moving must work by keyboard alone and be announced, which is where a hand-rolled drag goes wrong. dnd-kit gives a pointer and touch drag and a keyboard one — Space or Enter to lift, the arrows, Space or Enter to put down, Escape to cancel — with a live region worded by the caller and the focus kept on the moved item, and leaves the markup and the Sass ours, as Downshift does. HTML5 drag and drop has no keyboard path and nothing on touch; react-aria's drag and drop owns the list's markup and keyboard model as react-select would. Its weight, about 55 kB minified and 19 kB gzipped across its four packages, measured at install, is the cost the task's preference for a standard package accepts. Two of its sortable preset's parts assume a grid of equal cells, and chips are not: its keyboard took the nearest chip in an arrow's direction rather than the next one, and its `rectSortingStrategy` moved each chip onto another's box, overlapping chips of different widths or leaving gaps. So the list lays the chips out as the wrapping row does, and its keys step through the list and jump between that layout's rows. M10.16's layer reorder may adopt it                                                                                                                                                                    |
| A library to place a suggestion list?                             | Yes — Floating UI's `@floating-ui/react-dom` (MB.154)                                                                                                                                                                                                                                    | The owner's calls: an open list is as wide as the field's whole row, its box and its Add together, and never runs off the screen. Keeping it on screen means measuring the room below and above, flipping to whichever is larger, holding the list to that height, and following a scroll or a resize while it is open — the measuring a hand-rolled version gets wrong at the edges, and which Floating UI's `flip`, `size` and `autoUpdate` are. It positions and does nothing else, so Downshift keeps the ARIA and the keyboard, and the markup and the Sass stay ours. Fixed rather than absolute, so a scrolling ancestor, M8.16's modal, cannot clip the list. The parts used weigh 19 kB minified and 8 kB gzipped with React external, measured at install, the cost the preference for a standard package accepts. Its interactions package, `@floating-ui/react`, is not used: Downshift already owns them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| A `userErrors` payload type on mutations?                         | No — a code and `fieldErrors` in `errors[].extensions` (MB.43)                                                                                                                                                                                                                           | The Shopify shape makes a rejected write a successful response carrying a list, which is the opposite of what it is: every mutation here either wrote or refused. Taking it would also rewrite every mutation signature in §7's sketch into a payload type, and every resolver and test that reads one, to gain nothing the extensions do not already carry — a path per issue is a path per issue either way. `graphql-request` throws on `errors`, so TanStack Query's existing error path is the one the form already handles, where a payload type would need each mutation's own success branch to remember to look. The argument that would move this is a client that must render a partial success; v1 has none, and the three refusal types are a closed set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| How a second admin is made?                                       | An admin grants it, or invites one by email once verification exists; the primary admin is unrevocable (M2.9)                                                                                                                                                                            | The env var names one admin, so it cannot make a second. A bare admin-issued invitation link would be a bearer token for the highest privilege; bound to a verified address once MB.66's email verification exists it is not, so an admin invitation by email is MB.69 and MB.70 (story 62). A break-glass CLI would be a third write outside `withAudit`, and the primary admin already covers recovery: change the variable and redeploy. Better Auth's `admin` plugin `set-role` writes outside `withAudit` and `/api/graphql`. The primary admin (`ADMIN_BOOTSTRAP_EMAIL`, promoted at a verified Google or Discord sign-in, the two providers whose verification is trustworthy) is unrevocable, so the last admin is normally the primary admin; a zero-admin count is refused as a fallback for the gap after the variable changes. Every change is appended to a ledger, because the next update to the row overwrites `users.updated_by`. [`m2.9-granting-admin.md`](design-decisions/m2.9-granting-admin.md)                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| First-party email verification and delivery?                      | Yes — Better Auth's own mailed link, Resend in production, capture inboxes everywhere else (MB.61)                                                                                                                                                                                       | The token is Better Auth's signed JWT, never stored and not single-use; acceptable for a write that flips one boolean on a row the holder controls, where it would not be for an invitation. An unverified account gets a session and is provisional: it lapses one window after its last mail, which resolves a squatted address without the deprecated takeover flag. Verification completes only from a session holding the row, which closes the attack where a victim verifies an attacker's sign-up by clicking. Staging and hotfix previews send to the Mailtrap Sandbox and local and e2e to Mailpit, all over HTTP because SMTP from a Vercel function is unreliable, with a transport guard that fails closed per environment. [`mb.61-email-verification-and-delivery.md`](design-decisions/mb.61-email-verification-and-delivery.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Which Better Auth plugins?                                        | Four before launch; passkeys in v2; most never (MB.74)                                                                                                                                                                                                                                   | The site is OAuth-only and invite-gated, so most of the roster, which secures a credential the site holds or serves a client that is not a browser, has nothing to guard. Before launch: the rate limiter Better Auth already runs is moved to the database and its client-IP header pinned, since it is on in every deploy and counts per instance; stored OAuth tokens are encrypted; the last-used provider is marked on the sign-in page from a browser cookie; and the OAuth proxy lets a hotfix preview sign in. Two-factor never challenges an OAuth sign-in. `jwt` issues a token beside the cookie for a service this app does not have, and its cookie mode needs the cookie cache MB.59 keeps off. Better Auth's account deletion is a hard delete that every audit foreign key refuses. [`mb.74-better-auth-plugins.md`](design-decisions/mb.74-better-auth-plugins.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Where does the post-sign-in landing live?                         | `/coven`, its own protected route; `/` stays the public entry page (MB.57). An admin's, with no return path, is `/admin` (MB.113)                                                                                                                                                        | Folding both into `/` makes the most common visitor's front door a redirect, rebuilds `requireSession()`'s branch by hand on the one page that must not redirect, and turns story 2's test green on the front door's own copy. `/coven` because the landing's three states are all statements about workspace membership, and it sits above `/coven/[slug]`, where those live.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A public compendium?                                              | Yes — the list and every entry, readable without an account and indexable by search engines (MB.80)                                                                                                                                                                                      | The compendium is what exists, not what anyone has; the gate stays on accounts and workspaces. A public read needs no identity, so the read takes no session and the pages are ISR under the `compendium` tag, with the signed-in affordances in a client island                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A URL slug on ingredients?                                        | Yes — `slugify` of name, form and formal name, stored, following a change to any of them; a compendium entry's old slug answers 308 for 180 days unless another entry takes it, which the admin confirms first (MB.80; the formal name added in MB.81, the reservation dropped in MB.82) | A permanent address needs a readable path; two entries may share a label and a form and only the formal name tells them apart, so it is in the address too, and the slug index then refuses only what `slugify` folds together; a moved URL is a lost index entry unless the old one redirects. With the formal name in the slug, only an entry spelling the old address exactly can want it — most often the correct entry being added — so a taker ends the redirect rather than waiting 180 days, and its page links to the entry that moved while the window runs (MB.82)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| A scheduled job for slug expiry?                                  | No — a date comparison at read time (MB.80)                                                                                                                                                                                                                                              | Exact at midnight UTC with nothing running; a Hobby cron fires within an hour of its time and Queues deliver events rather than dates; the housekeeping rides on the next slug write in that scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Better Auth's `anonymous` plugin for visitors?                    | No — a signed-out reader is `null`; try-before-sign-up is v2 (MB.80)                                                                                                                                                                                                                     | A `users` row and a cookie per visit and per crawl, a third identity bootstrap outside `withAudit`, and static pages made dynamic for nothing a public read needs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Client-side ingredient filtering (`filterIngredients()`)?         | No — the `compendium` query filters in SQL (M8.5); M8.4 retired                                                                                                                                                                                                                          | Rule 8 caps a page at 100, so the browser never holds the whole compendium or a coven's ingredients and cannot be the search; MB.80's static `/compendium` routes every filtered view through GraphQL regardless. One matcher, in the one place that has every row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Accent-insensitive search?                                        | Yes — `unaccent`, an `IMMUTABLE` SQL wrapper naming the dictionary, and expression trigram indexes over the fold (M8.5)                                                                                                                                                                  | Folk names carry the accents (`Uña de Gato`) and a visitor types without them, so a case-only search silently misses the one thing a folk-name search is for. `unaccent()` is `STABLE`, hence the wrapper; the raw trigram indexes stay for the fuzzy finders, which are accent-tolerant by nature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Substring or fuzzy matching for the compendium search?            | Word similarity: the query `<%` the label, formal name or a folk name at 0.5, set per read (M8.5)                                                                                                                                                                                        | A live search box needs every typed prefix to keep matching, which plain `%` similarity fails (`mug` is 0.33 to Mugwort); `ILIKE` substring handles prefixes but misses a transposed pair and punctuation (`devils shoestring`). `<%` at 0.5 takes all three — `mu` 0.67, `mugwrot` 0.5, `devils shoestring` 0.8 — where pg_trgm's own 0.6 misses the typo. Results are ranked best match first, by word similarity (MB.104): a keyset over `[-score, name]`, the score computed per matched row inside the match itself, rather than a capped top-N that would leave matches past the cap unreachable, or pg_trgm's `<<->`, which needs GiST, orders by one text of three and cannot resume after a cursor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Subscription billing in v1?                                       | No — v2; the Stripe plugin is not yet adopted (MB.79)                                                                                                                                                                                                                                    | Nothing in v1 needs payment. The v2 requirements are in §13: the workspace pays, priced by member count, with free months, an admin exemption and a discount for someone in several workspaces. Better Auth's Stripe plugin carries the plumbing and per-seat pricing at checkout, but its seat resync needs the organization plugin MB.30 rejected, and the exemption and the discount are ours either way. It writes its tables outside `withAudit` and mounts browser routes under `/api/auth/subscription/*`, which are MB.30's two objections. The plugin or a thin service over the Stripe SDK is settled by a test-mode spike when the work is scheduled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| References on the compendium?                                     | Yes — a `references` table of Chicago-form citations, one row per source, linked from any sourced row; optional on an entry, with an admin to-do filter (MB.151)                                                                                                                         | The compendium is public and makes claims about plants and practices, so a reader needs to know whose claim each is. One table rather than a child of `ingredients`, because a vocabulary row's filing is a claim too, and a book fifty herbs cite is one row. Chicago because the works cited are written in it, and a rendering of fields rather than a stored string so one renderer serves every surface. Optional with a filter, since a required reference blocks quick entry and hangs a fixture on every seeded entry; the astrology and deity seeds record theirs in their docs, and MB.156 writes them as rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Who owns a reference?                                             | Two tiers, as ingredients are (MB.151)                                                                                                                                                                                                                                                   | A coven's notebook is the coven's, so `workspace_id` is nullable and a row links only what its readers may read, MB.138's rule: a compendium entry or vocabulary row links compendium references alone, a coven's ingredient either tier. Compendium-only references would have left a member's own sources nowhere to go                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| How is a reference stored?                                        | Chicago's fields as printed text, five kinds (`book`, `chapter`, `article`, `entry`, `web_page`), no unique index (MB.151)                                                                                                                                                               | The deity doc's 334 citations need a translator, a series, an online host and a last-modified date beside the obvious fields, and a reference-work entry is its commonest shape; `other` would have rendered a guess. Authors and dates as printed, because a name grammar inverts "Snorri Sturluson" and a date column refuses a season. Per-kind CHECKs make the renderer total. Nothing short of a librarian identifies a source, so two rows may be one book                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| How does a row link a reference?                                  | One `reference_links` table, a nullable key per sourced table under `num_nonnulls`, a locator and nothing else (MB.151)                                                                                                                                                                  | MB.40's and MB.138's shape: a new sourced table costs a column and an index, where a join table per entity costs a table, a trigger and a finder each time. Each partial unique index leads on the sourced id, so it is also the read's index                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Which module owns references?                                     | `ingredients` (MB.151)                                                                                                                                                                                                                                                                   | The link table keys into `ingredients`, which `vocabulary` may not import, and an ingredient's links are written in its own transaction, which a sixth module above `ingredients` could not be called from without a cycle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| What deletes a reference?                                         | Nothing in v1; a soft-deleted one leaves every bibliography, its links untouched (MB.151)                                                                                                                                                                                                | The writers are the form and the seed. A source with no links stays reusable. A deleted source is retracted, unlike a deleted substitute, which is a fact a member recorded, so the read joins live references only: no cross-tier write and no new rule-4 exception                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| How does a reseed know a row an admin has since edited?           | By `seedKey`, the identity the seed gave the row at insert, on every table it writes (MB.171)                                                                                                                                                                                            | Keyed by a slug that follows the name, or a citation that follows its fields, a deploy's reseed would reinsert the original beside every row an admin renamed or edited; matching on content instead would skip a genuinely new source, and a run-once seed would never deliver a later addition. The cost is a seed-only column on nine domain tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Can an admin sign in as another user?                             | Outside production only: `ENABLE_IMPERSONATION` set and `VERCEL_ENV` not `production`, through the `admin` plugin narrowed to its two impersonation endpoints (MB.53)                                                                                                                    | To reproduce what a user sees on local, staging and a hotfix preview rather than guess at it from their description. `NODE_ENV` is the rejected gate: every Vercel build is `production` by it, staging and the previews included, so it would switch impersonation off where it is needed. Two conditions, so one mis-scoped variable is not the whole defence, and off by default, so the endpoints are absent at production rather than refusing. Writes stamp the impersonated user, and `app.impersonated_by` names the admin. Every other `admin` endpoint would write outside `withAudit`, and `set-role` would grant admin past M2.9's ledger                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

---

## 15. Open questions

The post-draft scope changes (notes → v2, no personal workspaces, invite-gating, spell visibility, invitable roles, unit dimensions) are recorded in §14 and reflected throughout. None remain open. All prior questions are resolved:

- Framework, database, ORM, auth, API, hosting — §2
- Sharing model — workspaces with three roles, §5
- Compendium edit rights — admin only in v1; suggestions, including a suggested change to an existing entry, in v2 (§13)
- Public reading — the compendium list and every entry are public and search-indexable; everything workspace-scoped stays gated (MB.80), §9
- Sources — every compendium entry and every curated row drawn from somewhere records its references, Chicago form, two-tiered as ingredients are (MB.151), §5
- Invitation delivery — by email through MB.65's transport, accepted only by a signed-in account whose verified email matches, viewer/member only; no response carries the link (MB.61, M7.3–M7.5), §5
- Dedupe — fuzzy warn in v1, merge in v2
- Categories — global admin-curated, 63 seeded, §6
- Granting admin — an admin grants admin, or invites one by email (story 62, MB.69 and MB.70), every change goes to a ledger, and the primary admin set by env var (promoted at a verified Google or Discord sign-in, or on verifying the address by mail) cannot be revoked; §5, [`m2.9-granting-admin.md`](design-decisions/m2.9-granting-admin.md)
- Email verification — first-party, by Better Auth's mailed link; Resend in production, capture inboxes in every other environment (MB.61), §5, [`mb.61-email-verification-and-delivery.md`](design-decisions/mb.61-email-verification-and-delivery.md)
- Ingredient **correspondences** — confirmed complete, no additions. Recorded here as "ingredient properties", the question closed the correspondence set: form, element, planet, zodiac, deities, colour, safety notes, substitutes. It stays closed; nothing has been added to it. **Naming is identity, not correspondence** — a separate question, opened and answered separately in §5, which added `canonicalName`, `nomenclature`, the generated `canonicalKey` and folk names as their own table. The one column those two questions share is `form`, which keeps its meaning and its place in the set and only loses its enum
- Local dev database — Docker Postgres, shared seed, §11
- Billing — none in v1; the v2 requirements and the Stripe plugin's fit are in §13, and the plugin-or-SDK choice waits for a spike when the work is scheduled (MB.79)
- v1 scope — notes deferred; everything else built, not deferred
