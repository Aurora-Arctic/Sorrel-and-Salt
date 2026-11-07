# Sorrel and Salt — Design Doc

**Repo:** `Aurora-Arctic/Sorrel-and-Salt`
**Status:** Approved; revised 7 September 2026 (post-draft scope changes — see [`design-decisions/INDEX.md`](design-decisions/INDEX.md))
**Date:** 6 September 2026, revised 7 September 2026

---

## 1. Overview

A tool for tracking spell ingredients and composing spell jars. The site is invite-gated: signing in earns an account and an observer seat in the one demo coven, and the right to create a workspace is granted by accepting an invitation or by a keeper. The compendium is the site's public face: its list and every entry are readable without an account and indexable by search engines (MB.80); the gate is on accounts and workspaces, not on what exists. Users belong to workspaces that share an inventory; a global compendium of ingredients is curated by site keepers.

**In scope for v1:** sign-in by provider, by email and password, or by passkey, with an optional second step for password sign-ins (Wave 16), invite-gated workspace creation (`canCreateWorkspace`), workspaces with roles and invitations by email (MB.61), keeper-curated global compendium — public and search-indexable (MB.80) — workspace-local ingredients, stock tracking, spell builder with `private | workspace` spell visibility, full audit columns on every model, GraphQL API.

**Deferred to v2:** the entire notes subsystem — private / workspace / public experience notes and their visibility model — plus edit-history UI, user suggestions for compendium and category additions, duplicate merge tooling, bulk add from the compendium, note moderation reports, viewer spell-approval workflow, GraphQL response caching, subscription billing, try-before-sign-up through Better Auth's `anonymous` plugin, and a suggested change to an existing compendium entry (MB.80).

### Vocabulary

Three domain nouns, each meaning exactly one thing: the **Compendium** is what exists, a workspace's **Ingredients** are what it has, and its **Grimoire** is what it makes. CLAUDE.md's Vocabulary table defines them and binds their use in routes, components, tests and conversation.

---

## 2. Decisions

| Decision  | Choice                                                                                                                                        | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16, App Router                                                                                                                        | Needs a server runtime for sessions and audit stamping. Version 16, not 15, because Next 15 transpiles `next.config.ts` through the TypeScript 5 JS API (`ts.sys`), which TypeScript 7 no longer exposes. `resume-2026` is on TypeScript 7 and keeping the toolchains aligned matters more than the framework minor.                                                                                                                                                                                        |
| Database  | Neon Postgres                                                                                                                                 | Supabase free tier pauses after 7 days; Neon scales to zero and resumes itself                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ORM       | Drizzle                                                                                                                                       | Plain-TS schema, raw SQL where needed, no engine binary                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Auth      | Better Auth, in-process                                                                                                                       | In-process, so no extra service or cost, and it carries sign-in and sessions. Its organization plugin was spiked for workspaces and invitations and **not adopted** — hard deletes, unaudited writes and a plaintext token do not fit §5 ([`auth.md`, "Better Auth's organization plugin for workspaces and invitations"](design-decisions/auth.md#better-auths-organization-plugin-for-workspaces-and-invitations))                                                                                        |
| Sign-in   | A provider (Google, Discord, Facebook, Microsoft), an email address and password, or a passkey; an optional second step for password sign-ins | Passwords and passkeys joined the providers in v1 ([`auth.md`, "First-party sign-in comes into v1: a password, a passkey, a second factor"](design-decisions/auth.md#first-party-sign-in-comes-into-v1-a-password-a-passkey-a-second-factor))). GitHub is not offered; the roster is the four providers (M2.6). Apple is not offered: its client secret is a JWT Apple caps at six months, expiring silently rather than failing loudly, and it needs a paid Developer Program membership the others do not |
| API       | GraphQL Yoga + Pothos                                                                                                                         | Single route handler, zero hosting cost, typed contract                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Hosting   | Vercel Hobby                                                                                                                                  | Native Next.js, 6,000 build minutes, generous meters                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Styling   | Componentized Sass                                                                                                                            | A global `index.scss` per component with BEM names, never CSS Modules: the `_primitives.scss` class layer is used by name from JSX and styled inside component rules, which Modules would wrap in `:global()` throughout, and per-route CSS comes from the bundler's chunking either way (§9)                                                                                                                                                                                                               |
| Testing   | Vitest, RTL, Playwright, local Postgres                                                                                                       | Ported from `resume-2026`; local DB keeps the real schema under test                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| CI        | GitHub Actions, Gitflow                                                                                                                       | Ported wholesale from `resume-2026`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Why Drizzle

The audit requirement decided it. `auditColumns` is a plain TypeScript object spread into every table — six columns, one line per table, no codegen step. Prisma would need those six fields written into all twelve models in its DSL, or a generator plugin, plus `prisma generate` after every change.

Two more reasons:

- **Raw SQL where needed.** Partial unique indexes, `num_nonnulls` check constraints, `pg_trgm` similarity, the v2 PL/pgSQL trigger, and the RLS policies deferred to the public launch (§8) all live inside typed migrations. Prisma's schema language can't express most of them.
- **No engine binary.** Prisma ships a Rust query engine as a separate process — cold-start weight and deployment size for nothing on serverless.

Pothos's Drizzle plugin is not a reason (MB.20): its primary capability is resolver-level database access, which §3's rule 1 forbids. The ORM choice rests on the two reasons above alone, and is easy to revisit because `drizzle-orm` is reachable only from `src/db/repository/`. §7 carries the rules for the GraphQL layer.

Trade-off: Prisma Studio is nicer than Drizzle Studio and Prisma's errors are friendlier. Kysely is the other reasonable pick, but it is still `0.x` and so no steadier than what is here.

### Why Yoga + Pothos

Two separate decisions.

**Yoga over Apollo Server.** Built on the Fetch API, so it drops into a Next.js route handler as a single export with no adapter shim. Apollo needs `@as-integrations/next` and carries more weight. Yoga also ships response caching, `graphql-armor` compatibility, and persisted operations as first-party.

**Pothos over SDL-first or Nexus.** Code-first means the schema is TypeScript, so a resolver returning the wrong shape is a compile error rather than a runtime one. SDL-first requires codegen to link schema and resolvers, and the link can silently break. Nexus has been effectively unmaintained for a while.

Pothos specifically: its **auth-scopes plugin** gives declarative field-level guards.

Its **Drizzle plugin is deliberately not used** (MB.20): object types are declared by hand against the row type the service returns, which keeps the GraphQL layer independent of `drizzle-orm`'s version. The four rules that follow are in §7.

Trade-off: the schema isn't readable as a document on its own. §11's schema snapshot test keeps the printed SDL committed as `src/graphql/schema.graphql` and fails when the schema no longer matches it, so the file exists and diffs are visible in PRs. The same file is what client codegen reads (§7).

### Sign-in methods

Email and password, passkeys and an optional second factor are part of v1 (Wave 16). Mail delivery (MB.61, MB.65) is what made a password reset a mailed link rather than a keeper's errand, and Better Auth added email and password without a schema migration (the `accounts.password` column was already there). The password policy is in §8, "Passwords"; the case for and against is in [`auth.md`, "First-party sign-in comes into v1: a password, a passkey, a second factor"](design-decisions/auth.md#first-party-sign-in-comes-into-v1-a-password-a-passkey-a-second-factor).

---

## 3. Architecture

```
Browser
  ├── Server Components ──► services/ ──► Drizzle ──► Neon
  └── Client Components ──► /api/graphql ──► resolvers ──► services/ ──►┘
```

**One rule holds the whole thing together: authorization is decided in `src/modules/*/services/` and nowhere else** (CLAUDE.md rule 1).

Server components call services directly. No HTTP loopback to your own GraphQL endpoint — that would double latency and burn function invocations for nothing. Client components go through GraphQL. Both paths converge on the same service functions, so there is exactly one place where "can this user see this row" is decided.

A third caller exists that is not a browser: a durable job (M15.49). A service starts it through the one adapter in `src/lib/jobs/`, the SDK runs its steps from generated routes under `/.well-known/workflow/`, and each step calls a service as the seeded System account, with no seat and no workspace. Those routes carry no application data and are not an access path for a user. A job whose work is due once a day is started by a Vercel Cron Job instead: the cron entry in `vercel.json` calls a route under `/api/cron/`, which refuses a call without the `CRON_SECRET` bearer, starts the job and returns. The job does the day's work and ends; no job sleeps waiting for a date (claude-docs/design-decisions/support.md, "Daily jobs start from Vercel Cron, and no job sleeps waiting"). Three jobs run this way: support retention (below), the cleanup of lapsed unverified accounts, which deletes each account whose per-sign-up expiry run was lost (M15.68), and the document mailing, which starts the run for the oldest mailing still sending when none holds its token (M15.63). A mailing run is paced inside the job: at most 25 accounts a batch, a 60-second `sleep` between batches, and at most 60 mails a UTC day across all mailings. At the cap the run ends and the next day's cron call starts it again; a monthly-quota refusal pauses the mailing until a keeper resumes it.

This answers the risk GraphQL usually introduces. Field-level authorization scattered across a graph is how data leaks; a single choke point is not.

```
src/
  app/                      # routes, layouts, server components
    api/graphql/route.ts    # Yoga handler
  components/<Name>/        # index.tsx + index.scss
  modules/<name>/           # one per domain: identity, coven, vocabulary, ingredients, grimoire, support, documents, help
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

`"**": false` (minimatch, matches names with and without slashes) disables an automatic deployment for every branch, so CI is the only path that ships code — even if the Git integration is left connected. The reason is Vercel Hobby (M0.26): a named `staging` environment on `staging.sorrelandsalt.com` needs Pro, whereas `vercel alias` from CI puts staging on that hostname for free.

| Item        | Setting                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staging URL | `staging.sorrelandsalt.com`, re-pointed by `vercel alias` after each `staging` deploy                                                                               |
| Production  | `vercel deploy --prebuilt --prod` auto-assigns `sorrelandsalt.com` / `www`                                                                                          |
| Hotfix URL  | per-PR `hotfix-<slug>.sorrelandsalt.com`, posted as a PR comment, removed on PR close. Needs `*.sorrelandsalt.com` (wildcard domain, Vercel nameservers — Hobby-OK) |
| Database    | Neon's Vercel integration populates the project's per-environment vars; `vercel pull` fetches them into the CI build                                                |
| Build cache | Vercel remote build cache, used by `vercel build`                                                                                                                   |

### Recorded risks

- **Hobby is personal, non-commercial only.** If Sorrel and Salt ever earns money, it moves to Vercel Pro at $20/mo. This is a licensing constraint, not a technical one.
- **Neon scale-to-zero cannot be disabled on the free plan.** Design for a ~1s cold start: skeleton states on first paint, no sub-50ms assumptions.
- **Compute has a dollar cost at scale**, so an N+1 query is a billing problem as well as a performance one. DataLoader is not optional. It is also why the second authorization layer is a compile-time proof rather than a transaction per read (§8): I/O wait is billable here, so a layer that opens one costs money on every page.

---

## 5. Data model

Moved to [`design/data-model.md`](design/data-model.md); the §5 citations in this repository point there.

---

## 6. Category seed

The seeded categories and their groups are a **starting set rather than a closed one** — rows in `categories` and `category_groups`, seeded from `src/db/seed/categories.ts` and `src/db/seed/category-groups.ts` and editable by a keeper afterwards. The grouping heads the category picker's list, so the categories read as sections rather than one flat list, which would be unusable on a phone (MB.126); that a ninth group is addable without a migration is why the group is a table rather than an enum (§5).

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

**Every slug in this section is derived from the name beside it**, by the project's one slug rule (`src/lib/slugify.ts`, the `slugify` package under pinned options) rather than picked by hand — which is why most group slugs read `…-and-…`: the rule expands an ampersand. The seed and the admin mutations slug alike, so a category a keeper adds lands in the same shape as a seeded one.

Each category carries `name`, `slug`, `description`, and `groupId`; each group carries `name`, `slug`, `color` and `description` — the colour lives on the group only (§5, M4.2). The table above is grouped for reading; the app lists groups alphabetically by `name`.

**The seeded colours are the owner's hand-tuned pairs, written as hexes in `src/db/seed/category-groups.ts` and nowhere else.** They keep M0.7's hue rotation — each group on its own odd 22.5° step off `$sorrel`, so none lands on the accent or secondary hue — and that rotation is what makes the starting eight read as one family; the seed's test holds both hexes of every pair within 2° of its step. Saturation and lightness are tuned per group and per theme by hand, to clear the contrast floor on each theme's harder surface, not drawn from one formula. The seed writes both hexes onto the group row. What a keeper adds afterwards is theirs to pick and will not join that rotation — the write-time contrast floor guarantees it is legible, not that it is harmonious. That is the accepted cost of an open set; a closed one was the alternative.

---

## 7. GraphQL API

Moved to [`design/graphql.md`](design/graphql.md); the §7 citations in this repository point there.

---

## 8. Auth and authorization

**Better Auth, running in-process** as Next.js route handlers with its tables via the Drizzle adapter (Neon in deployment, local Postgres in dev and test). No extra service, no extra cost. Neon's own Managed Better Auth wraps the same library, so migrating to it later stays possible.

**Four ways to sign in.** A provider (Google, Discord, Facebook or Microsoft; M2.6), an email address and a password (M16.2), or a passkey, a key stored on the person's device and unlocked by a fingerprint, face or PIN (M16.7). A person who signs in with a password can add a second step from an authenticator app (M16.10); a provider or passkey sign-in is not asked for it. The handshake at `/api/auth/*` is the one path outside the GraphQL-only rule and carries no application data. All four ways leave the invite gate as it was: a new account has `canCreateWorkspace = false` ([`auth.md`, "First-party sign-in comes into v1: a password, a passkey, a second factor"](design-decisions/auth.md#first-party-sign-in-comes-into-v1-a-password-a-passkey-a-second-factor)).

**The site is invite-gated.** Signing in creates an account with `canCreateWorkspace = false` and no workspace. Creation rights are granted by accepting a workspace invitation or by a keeper (`grantWorkspaceCreation`), and persist until a keeper revokes them (`revokeWorkspaceCreation`, M5.8). The account whose email matches `ADMIN_BOOTSTRAP_EMAIL` is promoted to `admin` at a verified Google or Discord sign-in (MB.60) or on verifying the address by mail from a session holding the row (MB.68). Every admin after the first is granted by an existing keeper, and the primary keeper cannot be revoked (§5, M2.9). A curator is made by a keeper on the same screen, and accepting a keeper invitation as a curator makes them a keeper (M11.20).

**A keeper can time a sender out of support** ([`support.md`, "The support feature, revised after review"](design-decisions/support.md#the-support-feature-revised-after-review), "Open-Ended Time-Outs"). `timeOutSupportSender` sets a time-out until a time in the future or, with no `until`, with no end date, and always with a note of at most 500 characters saying why: a missing or blank note is refused with "Write a note saying why" as the error's message. `liftSupportTimeout` ends a standing one early. Both are admin-only under `assertSiteAdmin`, so a curator is refused like any user. While a time-out stands the sender cannot send a request or answer one, and the refusal names the end or says they are timed out with no end date; their earlier requests stay readable on their support page. A dated time-out ends by itself when `until` passes, with no write; an open-ended one ends only by a lift.

**A keeper can pause a user's access** ([`auth.md`, "What the site access pause closes, and what it decides along the way"](design-decisions/auth.md#what-the-site-access-pause-closes-and-what-it-decides-along-the-way)). `pauseUserAccess` sets a pause until a time in the future or with no end date, with a note of at most 500 characters saying why, required for every pause (a coven pause's note stays optional); `liftUserAccessPause` ends a standing one early. Both are admin-only under `assertSiteAdmin`. The primary keeper cannot be paused, and a keeper cannot pause themselves; pausing another keeper is refused while keeper changes are paused, as a revoke of admin is. A user who is already paused is refused with "already paused; lift the pause first". Setting a pause ends every session the user holds, in the same transaction as the `user_access_pauses` row (§5). While the pause stands, the user still signs in, by every method, into support and nothing else: `/support`, `/account/support` and the support API the signed-in form uses act as the user; every other signed-in page sends them to the public `/access-paused` page, and every other signed-in API call answers `ACCESS_PAUSED` with the pause's end. The other public pages, the compendium among them, read them as signed out, under the shell's notice that their access is paused, until a time or with no end date, linking to `/access-paused`. That page reads the viewer's own standing pause, as the shell does, sends a visitor with no session to sign in and one with no pause standing to `/`, and its Support link opens the Support dialog. A support time-out still refuses their sending, with its own sentence: whether a paused user may write to support is the time-out's to govern, not the pause's. A pause ends by itself when `until` passes, with no write; a lift writes the lifted pair. The account is never closed. A keeper may impersonate a paused user and is shown exactly what that user sees, the notice included, while the impersonation banner and Stop Impersonating stay on every page.

**A steward can pause one member's access to their coven** ([`auth.md`, "How the coven access pause refuses a member, and what it decides along the way"](design-decisions/auth.md#how-the-coven-access-pause-refuses-a-member-and-what-it-decides-along-the-way)). `pauseMemberAccess` sets a pause on a practitioner or observer until a time in the future or with no end date, with an optional note of at most 500 characters; `liftMemberAccessPause` ends a standing one early. Both need `member: pause`, a permission only the steward role holds, so a practitioner, an observer, a steward of another coven and a site keeper are refused alike; in the demo coven a keeper may pause from the steward seat every keeper holds there, and from nothing else. A steward cannot be paused, so a coven always keeps someone who can lift a pause, and a paused member cannot be made a steward: `updateMemberRole` refuses the promotion with "lift the pause first to make them a steward". Any other role change goes through while the pause stands. A member who is already paused is refused with "already paused; lift the pause first". While the pause stands, `assertMembership` refuses the user every read and write in that coven with `AccessPaused` (GraphQL code `ACCESS_PAUSED`, with the pause's end), before the permission is checked, so the refusal is the same whatever they asked for and distinct from the bare `Forbidden` a non-member gets. The user keeps their seat and their role, their other covens are untouched, and the coven still appears in their own lists. A pause ends by itself when `until` passes, with no write; a lift writes the lifted pair.

**Two layers of authorization, deliberately — the check, and a proof the check happened.**

Belt and braces is warranted here: an application bug leaks one person's grimoire to another, and the realistic bug is a forgotten check in one service rather than a wrong one everywhere. So the first layer is the check and the second makes forgetting it a compile error.

Layer one: every workspace-scoped call passes `assertMembership(session, workspaceId, permission)` in the service. A write additionally runs inside `withAudit()`, so it cannot reach the database without both a membership check and audit stamping.

`permission` is what the call is about to do — `{ spell: ['create'] }` — checked against per-role permission statements built with better-auth's `createAccessControl`, not a minimum role compared against a rank. `viewer < member < owner` is a line today; a role that is not on it would leave every "at least member" call site meaning something nobody checked, and the statements also make `{ spell: ['publish'] }` a compile error rather than a permission nobody holds. Several resources in one request are ANDed; an empty request throws, since it would authorize vacuously. The site role (`users.role`) is a different axis and is not consulted — a keeper or a curator curates the compendium and reaches no workspace. A keeper may read which covens a user belongs to, by name and role, and nothing beneath (M9.19; [`auth.md`, "A site keeper sees which covens a user belongs to"](design-decisions/auth.md#a-site-keeper-sees-which-covens-a-user-belongs-to)). Reasoning: [`auth.md`, "Permission statements over a role rank"](design-decisions/auth.md#permission-statements-over-a-role-rank).

Layer two: what that call returns, a branded `Membership` carrying `workspaceId`, `userId` and `role`.

The brand is unconstructible outside the membership service — no object literal, no cast a reviewer would miss. Every workspace-scoped repository finder and every `AuditWriter` method takes a `Membership` as its first argument and ANDs `workspace_id = membership.workspaceId` onto the query itself, rather than trusting a `workspaceId` its caller passed alongside; `write.insert` fills the column from the proof for the same reason. A service therefore cannot _write_ a workspace-scoped query without having passed the check first. That is the difference between the two layers being redundant and the second one being real: it makes the omission impossible instead of merely absent, and because the type is erased it costs nothing at runtime — no second connection, no transaction on the read path, no per-environment credentials.

The same shape covers spell `visibility`: the finders that reach a `private` one take the proof and read the author id **out of it**, rather than beside it — `created_by = membership.userId`, for the reason `workspace_id` comes from the proof too. An author id passed alongside would be a second source that can disagree with the check that minted the proof. Note that "workspace-scoped" is not the same as "has a `workspace_id` column" — `spell_steps` and `spell_categories` reach their workspace through `spells` and cannot self-scope. A guard that infers the set from a column name silently exempts the tables holding what a spell is made of, so they are a third shape instead: a table carrying a `spell_id` is refused by the unscoped finders and reached through `findManyInSpell`, which derives both the coven and the visibility from the parent spell in one query.

**Where this is weaker than a database policy**, stated rather than glossed: a service holding a valid proof for W that hand-writes a `where` clause naming X's ids satisfies the type and still reads across workspaces. The join tables above were the second gap, closed by M10.3's third shape; this one stays open and is covered by §11's per-entity direct-id denial tests, which is the same coverage that would have caught a policy written wrong. A cast is the third, and it belongs to review rather than to the type: a value already carrying the proof's public shape is _comparable_ to it, so `{ workspaceId, userId, role } as Membership` compiles where `session as Membership` does not.

**RLS is deferred to the public launch, not rejected.** `withAudit` keeps publishing the `app.current_user_id` GUC on every write (§5), so adding policies is one migration and its tests rather than a re-audit of every write path. [`auth.md`, "RLS role split, `FORCE`, and identity on the read path"](design-decisions/auth.md#rls-role-split-force-and-identity-on-the-read-path) is the specification for that migration — the role split, `FORCE`, the `security definer` `app.is_member()` helper, the compendium's nullable `workspace_id`, and why a policy test connected as the table owner proves nothing. It is superseded as a plan for v1 and stands unchanged as a plan for then. Reasoning for the deferral: §14.

### Passwords

The rules a password sign-up, reset or change is held to. They apply to every password the site stores, however it is set. Each rule names the source it comes from, listed below the table; a rule without a source is the project's own choice and says so.

| Rule                                                    | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Minimum length                                          | 15 characters. Two-factor is offered, not required, so the password may be the only factor, and NIST sets 15 for that case                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | NIST §3.1.1.2 item 1                                                                                              |
| Maximum length                                          | 128 characters accepted; one of 64 must be accepted. 129 is refused                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | NIST §3.1.1.2 item 2 (at least 64)                                                                                |
| Characters                                              | Any: spaces, punctuation and non-Latin letters allowed. No rule demands a digit, a capital or a symbol                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | NIST §3.1.1.2 items 3 and 5; OWASP Auth                                                                           |
| No truncation                                           | The whole password is checked: two that differ only after their 72nd character are different passwords                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | NIST §3.1.1.2 item 9                                                                                              |
| Breached passwords                                      | A password on the Have I Been Pwned list is refused, with a message saying why. Only the first five characters of its SHA-1 hash leave the server. A password the service does not answer for within three seconds, or at all, is refused too (project choice)                                                                                                                                                                                                                                                                                                                                                                                                                                                 | NIST §3.1.1.2 (blocklist); HIBP                                                                                   |
| Strength meter                                          | A guide on sign-up and reset, never a gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Project choice (`@zxcvbn-ts/core`)                                                                                |
| Same answer for a wrong password and an unknown address | Sign-in returns one error for both                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | OWASP Auth                                                                                                        |
| Sign-up with an existing address                        | Returns the same success as a new address and mails the holder instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | OWASP Auth; Better Auth's `onExistingUserSignUp` option, done by the `answerHeldSignUp` hook in `src/lib/auth.ts` |
| Verified address first                                  | An unverified password account reaches only `/account/email` and the public pages, as an unverified provider account does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The existing rule (MB.61)                                                                                         |
| Fields                                                  | `autocomplete="current-password"` and `"new-password"`; nothing blocks paste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | NIST §3.1.1.2                                                                                                     |
| No hints                                                | No password hint and no security question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | NIST §3.1.1.2 items 7 and 8                                                                                       |
| No forced change                                        | No rule makes a person change a password on a schedule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | NIST §3.1.1.2 item 6                                                                                              |
| Reset request                                           | The same answer for an unknown address as for a known one, in the same time: the reset mail is sent after the response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | OWASP Auth                                                                                                        |
| Reset link                                              | Works once, and not after 15 minutes. Better Auth stores the reset token unhashed in `verifications`, so a short life limits what a copy of that table is worth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Better Auth; project choice for the 15 minutes                                                                    |
| Reset signs out                                         | A reset ends every session the account held                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | OWASP Auth                                                                                                        |
| Change signs out                                        | A change ends every other session and keeps the current one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Project choice                                                                                                    |
| Change needs the current password                       | A provider-only account may set a first password from a session without one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Better Auth; project choice for the provider-only case                                                            |
| Notice mail                                             | A reset or a change mails "your password was changed" to the account's address, so that one the holder did not make does not go unnoticed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Project choice                                                                                                    |
| New passwords obey the same rules                       | Reset and change apply every rule above, including the breached list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Project choice                                                                                                    |
| Lockout per account                                     | Failed password sign-ins, and wrong passwords wherever a signed-in account's own password is checked (a change, the two-factor settings), are counted per account, not per client address. Every 5th failure locks the password, for 1, 5 and 15 minutes and then 1 hour each time, the ceiling; nothing switches it off for good, so knowing an address cannot shut its owner out. The count starts over after 24 hours with no failure. The first lock of a series mails the owner a reset link; a later lock within 24 hours of the last sends nothing, so continued guessing cannot mail the owner every hour. A provider or passkey sign-in stays open, and a passkey sign-in or a reset clears the count | NIST §3.2.2 (limit per account); OWASP Auth (exponential delay)                                                   |
| A lock looks like a wrong password                      | A locked sign-in returns the same error as a wrong password, so a lock does not show that the address has an account                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | OWASP Auth                                                                                                        |
| Wrong two-factor codes                                  | Held by Better Auth's own two-factor lockout, not the password count: one sign-in takes 5 codes before it starts again from the password, and 10 wrong codes lock the account's second step for 15 minutes. A wrong code never locks the password, and a wrong password never locks the codes                                                                                                                                                                                                                                                                                                                                                                                                                  | Better Auth; project choice to keep the two counts apart                                                          |
| Encrypted secrets survive a new key                     | The two-factor secrets and backup codes are encrypted under a versioned auth secret, so adding a key leaves every enrolment readable until its version is retired ([`auth/config.md`](auth/config.md), "Rotating the secret")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Better Auth (`secrets`); project choice                                                                           |

Sources, cited in the table by the short name in bold:

- National Institute of Standards and Technology. _Digital Identity Guidelines: Authentication and Authenticator Management_. NIST Special Publication 800-63B-4. Gaithersburg, MD: NIST, 2025. https://pages.nist.gov/800-63-4/sp800-63b.html. **NIST**, §3.1.1.2 for passwords and §3.2.2 for rate limiting.
- OWASP Foundation. "Authentication Cheat Sheet." OWASP Cheat Sheet Series. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html. **OWASP Auth**.
- OWASP Foundation. "Password Storage Cheat Sheet." OWASP Cheat Sheet Series. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html. **OWASP Storage**.
- Hunt, Troy. "API v3: Pwned Passwords." Have I Been Pwned. https://haveibeenpwned.com/API/v3#PwnedPasswords. **HIBP**.
- Better Auth. "Email & Password," "Passkey," "Two-Factor Authentication" and "Hooks." Better Auth documentation. https://www.better-auth.com/docs; and the installed `better-auth`, read in `node_modules`. **Better Auth**.

**Hashing, as Better Auth ships it.** Passwords are hashed with scrypt (a deliberately slow, memory-hungry hash) at N=2^14, r=16, p=1, using about 32 MiB of memory and a 16-byte random salt, and stored as `salt:key` with no tag naming the scheme. That is below OWASP Storage's floor for scrypt of N=2^17, r=8. **It is accepted as good enough, and the first-party sign-in work does not change it.** The way out, for a later task: a custom `password.hash` and `password.verify` pair using Node's built-in Argon2id (Node 24.7 and later) that tells old hashes by their shape ([`auth.md`, "First-party sign-in comes into v1: a password, a passkey, a second factor"](design-decisions/auth.md#first-party-sign-in-comes-into-v1-a-password-a-passkey-a-second-factor)).

**The breached-password check fails closed.** Sign-up, reset and change are refused while the Have I Been Pwned service cannot be reached, and the form says to try again later. A password that could not be checked is not stored. Better Auth's `haveIBeenPwned` plugin does this by default: when the request fails it throws "Failed to check password. Please try again later."

**Rate limits on the password routes.** Better Auth's own rules apply per client address and path, and are written in [`auth/rate-limiting.md`](auth/rate-limiting.md). They slow one address; the per-account lockout above slows guessing from many.

---

## 9. Routes and components

Moved to [`design/routes.md`](design/routes.md); the §9 citations in this repository point there.

---

## 10. User stories

### Accounts and workspaces

1. Sign in with an account I already have, so I can start without setting up a new way to sign in.
2. As a newly signed-in user, be told plainly what I can do next, so an empty account doesn't look broken.
3. Create a workspace once I hold creation rights, for my coven or household.
4. Invite someone to my workspace by email with a chosen role (observer or practitioner), so that only the verified holder of that address can accept.
5. Revoke a pending invitation before it's accepted.
6. Accept an invitation and land in the workspace.
7. Be rejected if a link is expired, revoked, or already used.
8. Switch between workspaces without losing my place.
9. See who's in a workspace and their roles.
10. Remove a member, or leave a workspace myself.
11. Be blocked from removing the last steward.
12. As an observer, read everything in a workspace but change nothing.
13. See who last edited a stock item and when.

### Compendium and admin

14. Browse the compendium and add an entry to my workspace's ingredients.
15. Create an ingredient local to my workspace when the compendium lacks it.
16. See a warning when the name I'm entering resembles something existing.
17. Be prevented from editing compendium entries.
18. As a keeper, add, edit, and soft-delete compendium entries and categories.
19. As a keeper, have no special access to any workspace's contents — its ingredients, grimoire and members — while seeing which covens a user belongs to and with what role.

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
30. Pick categories from the category picker, its chosen categories as chips inside the control (MB.126).
31. See inline validation errors.
32. Get a discard warning on unsaved changes: closing the modal, and on every long form closing or reloading the tab or following a link (M13.14).
33. Edit form pre-filled; reachable from the list row and from the entry page, never from the shell (MB.7).
34. List reflects the edit immediately on save.

### Notes — deferred to v2

Stories 35–46 covered the three-tier experience-notes system. They move to v2 with the rest of the notes subsystem (§13), and their numbers are **not** reused. The v1 stories are 1–34, 47–64 and 70–92: 75 in all.

### Grimoire

47. Name a spell and state its intent.
48. Assign categories describing what the spell is meant to do.
49. Search and filter ingredients with the same controls as the ingredients.
50. Add an ingredient with quantity and unit.
51. Reorder ingredients, so layering sequence is recorded.
52. Compare assigned intent categories against the union derived from ingredients, and see gaps in both directions.
53. Get warned when an ingredient is flagged toxic or unsafe to burn.
54. See when I'm adding something I have none of. Met on the spell's page, its Quick Look and in workings, not while building: the builder shows no stock.
55. Save as draft.
56. As any workspace member including observers, read every workspace-visible spell in the grimoire (a private spell stays with its author).
57. Add a one-off ingredient by name and form, so a spell can call for something I will never stock — it goes in the jar and nowhere else.

### Email and admin

58. Prove I own my email address, whichever provider I signed in with, so the site can trust it.
59. Set or change the email the site knows me by, prefilled from my provider, and have it take effect only once I have proved it is mine.
60. As a keeper, make an existing user a keeper and revoke it again, and be refused when the target is the primary keeper or the last keeper; as the primary keeper, pause both for every other keeper while I deal with one that has gone rogue.
61. As a keeper, see every change to who is a keeper and who may create a coven, with who made it, how, when and why, so that misuse comes to light.
62. As a keeper, invite someone by email to become a curator or a keeper, accepted only by an account that has proved it owns that address.

### Public compendium

63. As a visitor, read the compendium and its entries without signing in, so that the site's reference is useful to people who are not in a coven.

### References

64. As a reader of the compendium, see where an entry's information came from, so that I can judge a claim and read further.

### Step units

77. Give a step that lays a form my coven holds stock of a unit that stock can be measured in (any weight against weight, any volume against volume, the same unit for a count), so that making the spell can take it out of stock.

### Workings

<!-- prettier-ignore -->
76. Record a working of a spell: the day I made it, who took part (coven members or names I type) and a note on how it went, so the grimoire keeps what was made as well as the recipe.
78. Complete a working and have the stock it used taken out of my coven's jars, warned where a jar cannot cover it, so the stock I see matches what is on the shelf.
79. See a spell's workings on its recipe page, and how many there are on its card in the grimoire list, so I can tell what I have made and how often.

### Spell steps

80. Record a spell's steps in one order, each an instruction, an ingredient, or both, so the ritual is kept beside what goes in the jar.

### Autosave

81. As a coven member, I want nothing I type into a spell to be lost, so that I can build it over several sittings and devices. A spell saves to its own row as it is typed, 3 seconds after the last change and at most 30 seconds apart, on a draft and on a complete spell alike, and the person is warned before closing the tab or following a link with a change not yet saved (M13.14 extends story 32 to every long form). A save names the revision it read; if someone else saved first, the builder offers Reload Latest or Keep My Version. While the builder is open it checks the spell every 10 seconds: fields the person has not touched update by themselves, and another member whose save is under 2 minutes old is shown as editing.

### Duplicate a spell

82. As a coven member, I want to duplicate a spell, so that I can start a variation from it without retyping it or changing the original. The copy is a private draft I wrote, titled with " (Copy)" added, and opens in the builder.

### Spell Quick Look

83. Open a spell's details over the grimoire list, from its card or from a pick in the grimoire search, with an Edit link where I may change it, so that I can check a spell without leaving the list.

### Grimoire filters

84. Narrow the grimoire list by the moon phase and the day a spell is worked on, by whether it is private or shared, and by who made it, so that I can find the spell I need tonight without reading every card.

### Spell Preview

85. Open a spell in a full-screen pane with nothing else on screen, so that I can follow it without distraction.
86. Keep the screen awake while I work a spell from the preview pane, with a sign that it will, so that it does not lock mid-spell.

### The Demo Coven

87. Land in the demo coven when I first sign in, see that it is a demo, look round it, be refused when I try to add to it, and be able to leave it, so that the whole first visit works as the site promises.
88. Open an invitation card's link and be signed in with a coven to create, and have the admin see the card accepted, so that a printed card handed to a stranger brings them in once.

### First-party sign-in

70. As a person without a Google, Discord, Facebook or Microsoft account, or who would rather not use one, I want to sign up and sign in with my email address and a password, so that I can use the site.
71. As someone who signs in with a password, I want to reset it when I forget it and change it when I choose, so that I am never locked out of my account and can replace a password I no longer trust.
72. As someone who signs in with a password, I want repeated wrong guesses at it to slow down and then stop, so that nobody can try passwords against my account until one works.
73. As someone who has added a passkey, I want to sign in with it, so that I need no password and nothing a site breach could leak.
74. As someone signed in, I want to add, name, rename and remove my passkeys, so that I can sign in from each of my devices and retire one I have lost.
75. As someone who signs in with a password, I want to add a second step from an authenticator app, so that a stolen password alone does not open my account.

Keeping a spell `private` while building it, and the one-way widen of a complete spell to `workspace`, are governed by §5's visibility rule rather than a numbered story.

### Support

89. Send a question, a bug or an accessibility bug from wherever I am, and read the reply later, so that I never have to search for an address.
90. Work through a support request as an admin: reply, assign it, share it with curators, turn it into an issue, resolve it, and time its sender out and lift it, so that I can answer people and stop abuse from one page.
91. Answer a keeper in the thread as a sender, and reply again after it is resolved, so that I can finish a conversation without writing a new request.

**Statuses.** A request is `open`, `waiting_on_sender`, `resolved` or `closed` (M15.41). The support service runs every move and refuses any pair not listed here with an explaining error (M15.42):

| From                                    | Event                                     | To                                                | By                |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------- | ----------------- |
| (none)                                  | the sender sends                          | `open`                                            | sender            |
| `open`                                  | staff reply, marked waiting on the sender | `waiting_on_sender`                               | staff             |
| `open`, `waiting_on_sender`             | staff resolve                             | `resolved`                                        | staff             |
| `open`, `waiting_on_sender`             | the sender resolves it                    | `resolved`                                        | sender            |
| `open`, `waiting_on_sender`, `resolved` | a sender message                          | `open`                                            | sender            |
| `resolved`                              | seven days pass                           | `closed`                                          | the request's job |
| `open`, `waiting_on_sender`, `resolved` | staff close                               | `closed`                                          | staff             |
| `closed`                                | a sender message                          | a new `open` request, `linkedFrom` the closed one | sender            |

A staff reply or an internal note never changes the status. A resolved request past its seventh day reads as closed everywhere, as of that day, before its job writes the close, so a sender message on it opens a linked follow-up and staff can no longer move it.

**Views.** `/keepers/support` has six tabs, each with its count: Needs Staff (open requests, oldest sender activity first), Mine, Unassigned, Waiting on Sender, Resolved and Closed (M15.44). A curator sees only the requests marked for curators or assigned to them, inside every view, filtered in SQL. A Beta Testers filter narrows the current view and its counts.

**The beta-tester tier.** A sender who accepted a printed invitation card (`invitations.kind = 'card'`) is a beta tester. The tier is derived on read and never stored; a row carries a Beta Tester label, and no view is kept per tier (M15.42).

**Mail.** The sender is mailed when the request arrives, when staff reply, when it is resolved, and on day 5 of a resolution, when the closing-soon notice says it closes in two days (M15.45, M15.46). No mail carries a reply's text. Every mail goes through a job the SDK retries, bar those carrying a secret link (M15.50; [`email.md`](email.md)).

**Retention.** A daily job, started by Vercel Cron, sends the closing-soon notice to each request on day 5 or 6 of its resolution, closes each request whose seven days have passed, as of its seventh day, and anonymises each request closed twelve months before, keeping its topic, status and dates so the counts per topic and month survive. It reads the ids due a page at a time and hands each page to a batch run. Nothing starts a run per request, and readers show a lapsed resolved request as closed before the job reaches it (M15.46; §5, `support_requests`).

---

### Help and FAQ articles

An FAQ, a set of help articles on how the site is used, and a glossary of the site's terms ([`support.md`, "Help and FAQ articles, and a glossary, as rows a keeper edits"](design-decisions/support.md#help-and-faq-articles-and-a-glossary-as-rows-a-keeper-edits)). The pages are built after launch, in Wave 17, and are not part of v1 launch. They are **rows a site keeper edits rather than files in the repo**, so one changes without a deploy. The table is `help_articles` (§5), owned by a module of its own, `help` (`src/modules/help/`), because the articles have no tie to identity or to any other module's tables.

92. As a visitor, signed in or not, I want to read the FAQ, the help articles and their sub pages and the glossary, and search them, so that I can learn how the site works without asking anyone.

**Kinds.**

- `faq`: a question (the `title`), a short answer (the `body`), in `position` order.
- `article`: a help page on how the site is used. It has a `title`, a `summary` for the index and a Markdown `body`.
- `term`: one glossary entry. Its `title` is the term and its `body` a short Markdown definition. `position` is unused.

**Audiences.** Each row has an `audience`: `public` (anyone), `staff` (site keepers and curators) or `keeper` (site keepers only). A `term` is always `public`. `search_vector` is a generated `tsvector` over the title, summary and body (weights A, B, C) with a GIN index, for the help search.

**Sub pages.** An `article` may have a parent `article` through a nullable `parentId`. It is one level deep: a child has no children, a `term` or `faq` has no parent. A child's address sits under its parent's, e.g. `/help/closed-practices/<practice>`, which M19.8's closed-practice pages need: one general page, and one per practice. The parent's page lists the children the reader may see. A child's audience is equal to its parent's or narrower (public, then staff, then keeper), and a parent cannot be made narrower than a live child; the service holds both rules.

**The glossary.** `/help/glossary` lists every term from A to Z with an anchor from its slug, so another page or article links to one term as `/help/glossary#steward`. The slugs `glossary`, `staff` and `search` are reserved for every kind, so no article takes those addresses. A slug is unique within its kind, not across kinds, so the article "Ingredients" and the term "Ingredients" both keep `ingredients`: an article is at `/help/[slug]`, an FAQ entry at `/help#[slug]` and a term at `/help/glossary#[slug]`. On `/help` the FAQ anchors and the article index must not share an id. The seed ships the site's own terms, each defined the way `CLAUDE.md`'s Vocabulary and domain invariants use it: Compendium, Ingredients, Grimoire, Coven, Steward, Practitioner, Observer, Keeper, Curator, Spell, Working, Variant and Form, and any more the docs use as a fixed word. The screens say Steward, Practitioner, Observer and Keeper; the glossary says which code name each stands for only where the definition needs it.

**Writing and reading.**

- A keeper writes the rows at `/keepers/help` under `assertSiteAdmin` alone (a curator cannot), through `withAudit`, with a live preview of the Markdown (§9).
- Anyone reads the `public` rows, signed in or not, at `/help`, `/help/glossary`, `/help/[slug]` and `/help/[parent]/[slug]`: public and indexable on the compendium's frame (MB.83), carrying no workspace data. The public finder takes no session, filters `audience = 'public'` in SQL and is cached under the tag `help`.
- Site keepers and curators read the `staff` rows, and keepers alone the `keeper` rows, at `/help/staff`, `/help/staff/[slug]` and `/help/staff/[parent]/[slug]`, under `src/app/(shell)/help/staff/`. These pages are dynamic, uncached and `noindex`, are not in `PUBLIC_ROUTES` or the sitemap, send a signed-out visitor to sign in, show a signed-in user who is neither the styled not-authorized page, and answer a curator asking for a `keeper` row with 404.
- Search is `/help/search?q=…`, dynamic, uncached and `noindex`, over the `tsvector` column (§5), with a title trigram fallback for typos; a search box sits on `/help` and on every article page. It scopes by audience in SQL by the same rules. The Markdown goes through the standard sanitising renderer. The reads, their cache and their pagination are in (claude-docs/design/graphql.md, "Help articles").
- A body marks a glossary term as `[[Term]]` or `[[Term|shown text]]`; the public pages draw it as a link to the term's glossary anchor with a tooltip of its definition, read from the cached public glossary. The help service refuses a save that marks a term no glossary row holds. Headings, links and code hold no mark, and the site documents do not read marks (claude-docs/components/help-pages.md, "Glossary marks").
- The rows ship as a `help` seed target keyed on `seed_key` (MB.171), in `migrate.yml`'s step and `deploy.yml`'s paths. The seed does not overwrite a row a keeper has edited.

## 11. TDD approach

Every story becomes a failing test first: **write test → watch it fail → minimum code → refactor.** Both suites keep the 80% threshold on lines, branches, functions, and statements, with coverage artifacts uploaded. Verification runs the `:coverage` variants, for the reason CLAUDE.md's Commands section gives. The harness is in `claude-docs/testing/`.

### Test database: local Postgres, not Neon, not SQLite

**Postgres 18 in Docker, everywhere except deployment.**

| Context              | How                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Local dev            | `postgres` service in `docker-compose.yaml`, seeded on first boot                             |
| Local tests          | Same container, separate database per Vitest worker                                           |
| CI unit + db         | Actions `services: postgres:18`, reachable by service name from the existing job `container:` |
| CI e2e               | Same service container                                                                        |
| Staging + production | Neon                                                                                          |

**SQLite was rejected.** It cannot run `num_nonnulls` check constraints, `pg_trgm` fuzzy matching, PL/pgSQL triggers, native array columns for `celestial_bodies[]` and `colors[]`, stored generated columns for `identity_key`, or `set_config('app.current_user_id', …)`. The isolation tests are the point: they query every workspace-scoped entity by direct id as a non-member and assert refusal, against the same partial unique indexes, generated columns and constraints production runs. Under SQLite that suite would test a different database than the one that ships, and the failure it guards against is one user's grimoire visible to another.

**Local Postgres instead of Neon branches** removes the `NEON_API_KEY` secret, `globalSetup` branch creation, the 10-branch-per-project limit, the CU-hour budget and the branch-reaper workflow. Neon is deployment-only infrastructure, and a local socket beats a network round trip per query.

**Isolation.** Each Vitest worker gets `sorrel_test_${VITEST_POOL_ID}` (the pool slot: `VITEST_WORKER_ID` counts test files, not workers, and outruns the clones that exist; MB.14), created from a template database with migrations pre-applied and the `standard` scenario seeded. The template is built once per run at test setup from the image's extensions-only `sorrel_template`, not baked into the image, so it can never disagree with the checkout. Per-worker setup is then a fast `CREATE DATABASE ... TEMPLATE`, and the clone is re-made from the template before every test file. Playwright gives each worker slot `sorrel_e2e_<slot>`, recreated the same way from its own seeded template between spec files, and a `next start` of its own reading it: the code under test runs in the server, which reads its database once at boot, not in the worker (MB.112).

### Seed data — one module, three consumers

`src/db/seed/index.ts` exports `seed(db, { scenario })`. A one-shot `db-init` compose container runs it before the app starts; the Vitest `db` project and Playwright's `globalSetup` call it directly. Identical data everywhere, so a bug reproduces in all three. The Docker side is a Node container rather than a Postgres init script: the seed is TypeScript and the Postgres image has no Node, and `Docker/postgres-init/` does not run at container start, since `Dockerfile.postgres` populates PGDATA at image build time and the entrypoint then skips `/docker-entrypoint-initdb.d/`.

Scenarios: `minimal` (one system user, one user, empty compendium), `standard` (six users, workspaces W and X, populated compendium), `demo` (standard plus spells with ingredients and layer order).

The production compendium is not a scenario. Its starting entries are reference data, as the curated vocabularies are: a sourced seed, one markdown file per entry under `compendium/`, run by `db:seed:compendium` on staging and production after the vocabularies and their sources (MB.240; `claude-docs/compendium/compendium-seed/README.md`). `standard`'s compendium stays the test fixture it is.

The demo coven is reference data too: the seventh reference seed, `db:seed:demo-coven`, run last in `seedReferenceData` and after the compendium seed on staging and production. It inserts the workspace flagged `demo`, a steward seat for the system user and every keeper, and an observer seat for every other live user, and never re-adds a seat that exists, a soft-deleted one included. It joins the `demo` scenario but not `standard`, whose fixture users A–G would otherwise gain a membership (M15.10; `claude-docs/db/demo-scenario.md`).

The fixture users A–F are in CLAUDE.md's Testing section; `SEED_SCENARIO` picks the scenario for `npm run db:reset` (which drops, migrates and reseeds local) and for `make docker-up`, defaulting to `minimal`.

### Acceptance tests — story traceability

Every story gets a browser flow that names it. A story is proved by a flow a user could walk, never by a service call or a GraphQL response (M9.1). The suite is written first, red or skipped, and becomes the definition of done. A test names its story with Playwright's own tag, `{ tag: '@story-12' }`, so a failure points at a requirement rather than an implementation detail. A story whose page does not exist yet is a `test.fixme` whose body is the intended flow; the task that builds the page unskips it.

`npm run test:stories` runs only this suite and prints a checklist of which stories pass, read from the tags: a live progress report against §10 rather than a coverage percentage. A flaky story (failed, then passed on retry) is listed as flaky and stays unticked: it does not count as passing. The suite runs as the `stories` job of the PR gate, `pr-gate.yml`, on the gate's images and beside its other jobs, and is never a required check. Story coverage is tracked apart from the 80% line threshold, because one asks whether the code is exercised and the other whether the product does what was specified. Service rules keep their own Vitest tests (direct-id refusals with their preconditions); a story test proves the flow, not the rule. Long form: `claude-docs/testing/acceptance.md`.

### What the tests must prove

The Vitest layers are `unit` (no DOM, with `src/lib/` carrying the heaviest coverage), `db` (local Postgres: the highest-risk tests in the project) and the component project (React Testing Library, MSW mocking `/api/graphql`). Beside the rules in CLAUDE.md's Testing section:

- **Pure functions.** `unitConvert()` lives in the ingredients module, `src/modules/ingredients/units/convert.ts`, reaches no database code, and is not in `src/lib/`. `summarizeSpellCategories()` unions and dedupes across ingredients; `compareSpellCategories()` reports intended-not-present and present-not-intended, both directions; `resolveSpellVisibility()` covers the read decision and every transition exhaustively; `applyAudit()` is correct on insert, update and soft delete. There is no `filterIngredients()`: the search is the `compendium` query's, in SQL, because rule 8 means the browser never holds the whole list (`claude-docs/design-decisions/graphql.md`, "Compendium and ingredient GraphQL queries").
- **Authorization.** D cannot read W's ingredients or grimoire, by direct id as well as by list. D's write to W fails with an authorization error, not a silent no-op. C reads W and writes neither ingredients nor a spell at any visibility. Keeper E cannot read W. A non-keeper write to a compendium entry fails, and E's succeeds and stamps `updated_by`. A user without `canCreateWorkspace` cannot create a workspace; every keeper and curator holds it (MB.177, M11.20); accepting an invitation sets and audits it. **A workspace-scoped finder cannot be called without a `Membership`**, asserted at compile time with `@ts-expect-error` rather than at runtime: the second layer's claim is that the omission does not typecheck, so the test has to be a type error rather than a thrown one.
- **Spell visibility.** A's `private` spell is invisible to B and C, though they share W, and to stewards; a `workspace` spell is visible to B and C and invisible to D; D cannot read either by direct id. A private spell is excluded in SQL, never fetched then filtered in the resolver. The transitions are those of §5's visibility rule.
- **Audit and soft delete.** Insert stamps `created_by`/`updated_by` from the session, ignoring payload ids; update leaves `created_at`/`created_by` alone; soft delete sets `deleted_at`/`deleted_by` and the row vanishes from finders; update and soft delete leave a soft-deleted row as it was, the same call writing its live twin. A deleted ingredient leaves every read but a spell holding it, which keeps reaching it, with its categories, for every member who may read the spell and nobody else. **Re-adding a formal name after soft delete must succeed, and the test uses the formal name, not the display label**: labels are not unique in the compendium, so a label-based assertion would pass even with `WHERE deleted_at IS NULL` stripped off the index, and the test would stop testing anything.
- **Compendium and ingredients.** A workspace-local ingredient is invisible to every other workspace. A compendium insert omitting `nomenclature` is rejected (no database default), and the coupling holds both ways: `none` carrying a formal name is rejected, any named kind carrying none is rejected, and `unknown` saves either way. `identity_key` cannot be written directly: Postgres refuses, and the column is absent from `$inferInsert` so TypeScript refuses first. Two compendium entries may share a label when their formal names differ, and may not share an identity; a local may share a label and an identity with a compendium entry, and two locals in one workspace may share neither. The own-entry match offers one assertion per row of §5's table. Promoting a folk name to the display name leaves `identity_key` unchanged on a row carrying a formal name and changes it on a `none` row. A folk name or a form value present only in unrelated workspace X never surfaces in W's lookup, asserted against the service directly. Fuzzy match returns near-misses above the explicit 0.4 threshold and nothing below, each carrying its formal name, and the query plan uses the trigram index (`EXPLAIN` asserted, because a `similarity()` comparison silently cannot use one and the results look identical either way).
- **Grimoire.** Every member including observers reads every `workspace`-visible spell. `derivedCategories` is the deduped union across the spell's ingredients and `categoryGaps` reports both directions. A spell survives the soft deletion of an inventory item or an ingredient it holds, and that ingredient's categories still feed `derivedCategories`.
- **Invitations.** The token is mailed to the invited address, generated with a CSPRNG, stored only as a hash and present in no response. Acceptance requires the signed-in account's verified email to match: unverified is pointed at the email page, a different verified address is refused. A role of `owner` is rejected by the check constraint. Expired, revoked and reused tokens are each rejected with a distinct reason. Accepting sets `canCreateWorkspace`. Last-steward demotion fails.
- **GraphQL.** The schema snapshot is the one permitted snapshot besides design tokens, since the schema is a contract. `src/gql/` regenerated in memory from the snapshot must equal the committed output. The depth limit rejects a query nested past 7, the cost limit rejects an expensive composed query, introspection is disabled in production config, and DataLoader batching is asserted by query count on a 50-ingredient fetch. Every mutation delegates to a service and no resolver touches `db`. Each of the three service error types leaves with its own `extensions.code`; a `ValidationError` leaves carrying `fieldErrors` matching its issues and its message verbatim; a plain `Error` leaves masked with no message and no stack.
- **Components.** `tests/components/<Name>/index.test.tsx` imports the component as `@/components/<Name>`, with queries by role and label. `InviteDialog` offers observer and practitioner only, never steward, and puts no link or token in the DOM. `SpellBuilder`'s visibility control starts `private` for a new spell and is read-only once shared. `tests/support/setup-msw.ts` holds the MSW lifecycle, which the node `unit` project runs too, and `tests/support/setup-dom.ts` the rest, including the RTL `afterEach(cleanup)` and a `localStorage` polyfill (Node's native global still shadows the DOM library's).

### E2E — Playwright

There are two suites. The story suite (`tests/e2e/stories/`, `npm run test:stories`) is the definition of done: each flow carries `@story-N` tags, and the checklist reads them. The gate suite (`tests/e2e/*.spec.ts`, `npm run e2e`) proves what no story walks and only a real server can: the providers server, the compendium cache server, the GraphQL route, the proxy, the smoke test and the axe sweep. A gate spec that a story flow now proves is deleted, not kept as a duplicate.

`@axe-core/playwright` scans each page and each open modal; accessibility is asserted here and nowhere else, never with `vitest-axe`.

`webServer` runs `npm run build && npm run start` on **8001**, keeping the separation from the dev server's 8000, and one more `npm run start` over the same build for each further worker slot, on `8001 + slot`: each worker has its own server and database. One last `npm run start` on **8100** has every OAuth provider configured, because the sign-in page's two availability states need a server each. Coverage via `monocart-coverage-reports`.

`fixtures/` factories keep tests readable: `makeIngredient({ categories: ['protection'] })`.

---

## 12. CI/CD and Git workflow

### Tooling files

`.github/workflows/` is inventoried in `claude-docs/ci/README.md`. Beside it: `.actrc` and the `make act-*` targets, `Docker/` (multi-stage `Dockerfile.node` with `development`/`testing`/`devcontainer`, plus `docker-compose.yaml`), `.devcontainer/`, `makefile`, `.oxlintrc.json`, `.prettierrc`, `.prettierignore`, `lint-staged.config.mjs` and the `"pre-commit": ["pre-commit:staged"]` array that runs it, and `.claude/skills/`.

### Gitflow

`feature/*` → `staging`; `staging` promoted to `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` to either, with `create-pr` opening both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down. Dependabot targets `staging`, exempt by author.

### Workflow and configuration

| File                    | Role                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker-compose.yaml`   | The `postgres` service, plus the one-shot `db-init` container that migrates and seeds before `app` starts; `devcontainer` depends on it. `make docker-up` gives a working local database with no Neon connection at all                                                                                                                                                                                                              |
| `vercel.json`           | Config only: it disables the Git integration and does not drive deploys (§4)                                                                                                                                                                                                                                                                                                                                                         |
| Codegen staleness guard | A `checks.yml` leg that runs `npm run codegen` and fails on a changed `src/gql/`: the generated client types must match the committed SDL                                                                                                                                                                                                                                                                                            |
| `deploy.yml`            | CLI-driven Vercel deploy on push to `main`/`staging` and on a `hotfix/**` pull request (§4)                                                                                                                                                                                                                                                                                                                                          |
| `migrate.yml`           | Applies migrations to staging on merge to `staging`, production on merge to `main`; must complete before `deploy.yml` ships the new deployment (a `needs:` job or a `workflow_run` predecessor). Also seeds the demo coven (`db:seed:demo-coven`, after the compendium seed) and the two reference vocabularies, §6's categories and §5's ingredient forms, in the same job and one step, and only when the push changed one of them |
| Secrets                 | `DATABASE_URL` per environment, `BETTER_AUTH_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, Google, Discord, Facebook and Microsoft OAuth client credentials, `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_SCOPE` for `deploy.yml`, `NEON_API_KEY` / `NEON_PROJECT_ID` for the production snapshot. `claude-docs/secrets.md` is the matrix                                                                             |

**Manual setup:** enable "Require merge queue" in Settings → Branches on both `main` and `staging`, or `merge_group` never fires. No workflow handles `merge_group` yet (M7.A.1).

**Docs:** a summary per subsystem, corrected in the PR that stales it, and one doc per component.

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

| Visibility  | Visible to                                             |
| ----------- | ------------------------------------------------------ |
| `private`   | Author only, always                                    |
| `workspace` | Every member of `note.workspaceId`, observers included |
| `public`    | Every signed-in user, attributed by `name`             |

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

`spells.revision` is already the v1 counter: M13.15 adds it with the shared `bump_revision()` function and a trigger per table, for the edit-conflict check (story 81). In v2 the same function also inserts the `record_revisions` row from `OLD` and `NEW`, so the two counters cannot disagree, and `record_revisions.revision` for a spell equals `spells.revision` for the same change. v1 builds no history table, snapshots or timeline ([`grimoire.md`, "Long forms autosave, and edits of one row can conflict"](design-decisions/grimoire.md#long-forms-autosave-and-edits-of-one-row-can-conflict)).

**A spell pins what went into it.** In v1 a layer reaches its ingredient's row as the row is now, deleted or not (§5, `spell_steps`). In v2 a layer references the exact revision of its ingredient. When the ingredient has been modified since, the spell says so, and the user can pull that precise modification into the spell — as a new revision of the spell, never a silent change to a recipe that a coven has already worked from. A working (M13.4) is made from a finished recipe that stays editable, so in v2 each working pins the spell revision it was made from, as a layer pins its ingredient's ([`m13.1-plan.md`](design-decisions/grimoire.md#a-spells-recipe-is-one-ordered-list-of-steps)).

**Stories:** view an ingredient's history as a timeline · field-level diff between revisions · see who made each change · restore a previous revision (as a new revision, never a rewrite) · undo a soft delete from a trash view.

**Restore, then edit.** Undo is a named writer method per tier — `restoreByIdInWorkspace(membership, …)` and `restoreByIdInCompendium(admin, …)` — that reaches only a deleted row, clears `deleted_at` and `deleted_by`, and stamps `updated_by` as the restorer, which the trigger records as `restore`. An edit is then the ordinary update of the row it brought back, in the same transaction if both are wanted. Nothing writes a row while it stays deleted: v1's writer skips one on every update, and an edit made in place would be a write nobody can see or check until the row came back. The restore needs an `applyAudit` operation of its own, since every payload has the audit columns stripped, and it can meet a partial unique index that a later row now holds, which the service refuses on the field that collides, as it refuses any write.

### Spell approval for observers

Observers can currently read workspace spells and nothing else. This gives them a contribution path.

**Schema:** `spells.status` gains two values — `draft | proposed | approved | complete` — plus `proposedBy`, `proposedAt`, `reviewedBy`, `reviewedAt`, `reviewNote`.

**Flow.** An observer creates a spell in `draft`, visible only to them. They submit it, moving it to `proposed`, at which point stewards and practitioners can see it. Any steward or practitioner approves it into `approved`, or returns it with a `reviewNote`. Approved spells behave like any other workspace spell.

The generic revision trigger above already captures every status transition and who made it, so review history comes free. The same `proposed` state is what the compendium suggestion flow needs, so the two features share a pattern rather than inventing two.

**Stories:** as an observer, draft a spell privately · submit it for review · see its review status · receive a returned spell with feedback · as a practitioner, see the proposal queue · approve or return with a note · as an observer, see who approved my spell.

### Compendium and category suggestions

`compendium_suggestions` table. Users propose ingredients and categories; keepers approve into the global compendium. Reuses the `proposed` pattern above.

**Suggesting a change to an existing entry** (MB.80) is the same queue with a second subject: a suggestion carries either a new entry or the id of an existing one plus the fields it would change and a reason. It is offered on the compendium entry page, public and in-app alike, to a signed-in account — a visitor who wants to suggest signs in first, the one thing the public compendium asks anyone to do, and what keeps the queue attributable. A keeper sees the proposed diff beside the current entry and accepts it as an ordinary compendium write under `withAudit`, so the audit stamps name the admin and the suggestion keeps who proposed it; a rejection carries a reason back to the proposer. Nothing in v1 leaves a hook for it beyond the entry page's shape.

### Bulk add from the compendium

v1 adds compendium ingredients to a workspace one row at a time — story 14, the "Add ingredient" action slot on `IngredientSearch`. Stocking a fresh workspace from a 200-entry compendium is 200 modal round trips. This makes it one.

**No schema change.** Bulk add writes the same `inventory_items` rows as `addIngredientToWorkspace`; it only batches them. The partial unique index on `(workspace_id, variant_id) WHERE deleted_at IS NULL` already defines what "already added" means, and nothing else in §5 is touched.

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

Pick a survivor, repoint `inventory_items`, `spell_steps`, `ingredient_categories`, and `notes`, soft-delete the loser.

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

### A mailed sign-in link or code

A way to sign in for someone with none of the four providers who would rather not keep a password: a magic link or a mailed code. Passkeys, and email and password with its guards (two-factor, the breached-password check), moved into v1 on 2026-10-16 (Wave 16; §8, "Passwords"; [`auth.md`, "First-party sign-in comes into v1: a password, a passkey, a second factor"](design-decisions/auth.md#first-party-sign-in-comes-into-v1-a-password-a-passkey-a-second-factor)), so this is the one sign-in method still deferred.

### Note moderation

`note_reports` (`noteId`, `reporterId`, `reason`, `resolvedAt`, `resolvedBy`). Pointless before there are enough users to need it.

### Showing who reviewed a compendium entry

v1 shows everyone whether a curator has reviewed a compendium entry and on what day (M14.8), and never who; showing the reviewer is v2 (the owner's call, 2026-10-23).

### Saved spell notes

The nullable `spellId` on `notes` already accommodates it.

### A workshop-viewer role

The staging component workshop is admin-only in v1 (M2.10): reviewers who should see real component states — a developer, a product reviewer — would otherwise need admin's powers over the compendium and the admin roll to get them. A site role, or a grant beside `role`, that opens the workshop and nothing else. `assertWorkshopAccess()` (`src/modules/identity/services/workshop-access.ts`) is the one rule that changes; how the role is granted and revoked follows whatever MB.59 settles for admin.

### Try before sign-up

Better Auth's `anonymous` plugin mints a `users` row and a session for a visitor so work done before signing up can be kept — a visitor drafting a spell against the public compendium, then keeping it by accepting an invitation. Declined for v1 by MB.80, where it was weighed against the public compendium, whose read needs no identity ([`graphql.md`, "The compendium is public and search-indexable"](design-decisions/graphql.md#the-compendium-is-public-and-search-indexable), "What it rules out"). If the feature is wanted, the plugin is the mechanism, and its rows would need the same provisional-account expiry MB.67 gives unverified sign-ups. The mb.74 record moved it from "never" to here.

### Link to the Compendium

In v1 linking goes one way: a coven can annotate a compendium entry and make it its own (Make It Ours, Annotate), and it cannot link its own ingredient to a compendium entry. The opposite direction waits for v2 on the owner's call of 2026-10-20. The own entry's page lists the compendium entries it may be under "Similar in the Compendium" (§5, "Ingredient identity"), and that list is a display only: it offers no action that changes the coven's data.

What v2 would add: a member links one of the coven's own entries to a compendium entry, so the compendium entry stands in the coven's cupboard in the own entry's place and its jars and spell layers move onto it; or splits one own entry across several compendium entries, mapping each of the own entry's forms to one of the picks in a form map; carries the own entry's annotations and chosen forms across the link (M12.38); and gives a coven forms of its own on a compendium entry, which the link would need for a form the compendium lacks (M12.39–M12.41).

The built work is set aside, not lost. The Link dialog, the split service and its form map, and the M12.38–M12.41 drafts wait on the branch `feature/link-to-compendium-v2` at 6adcd849. The conversion that had already reached staging (M12.21's `convertLocalToCompendiumEntry` and the This Is It action of M12.22) is removed by M12.42. The reasons, and what stays, are in [`ingredients.md`, "Linking Goes One Way"](design-decisions/ingredients.md#linking-goes-one-way).

### Physical uses

Wanted, and shaped by M14.2's record so it is not re-derived: what an ingredient is held to do to the body (sedative, carminative, aphrodisiac), recorded as a **closed, curated vocabulary** that keepers and curators maintain, picked by key and never typed, on the ingredient or on a form under the union rule. It is shown as Traditional Uses chips apart from the Caution block, with a line saying nothing on the page is medical advice. The owner moved it to v2 on 2026-10-23, after accepting the record. The tables, the behaviour and the starting list are in [`ingredients.md`, "How an ingredient records its physical uses"](design-decisions/ingredients.md#how-an-ingredient-records-its-physical-uses). Nothing in v1 builds, seeds or links it.

### Subscription billing

The owner means to charge for the site eventually. What is wanted, written down so it is not re-derived: **the workspace is what pays**, and its steward is the one who subscribes; the price scales with the workspace's member count; a new workspace can get free months; a keeper can make a workspace free until they say otherwise; and someone who belongs to several workspaces pays less. Nothing in v1 bills, stores a Stripe id, or gates anything on payment.

**Better Auth's Stripe plugin, `@better-auth/stripe`, was read against those five, not run** (MB.79; its documentation and source in September 2026, peer `stripe@^22`). It carries the plumbing — the Stripe customer, Checkout, the billing portal and webhook signature verification — and one of the five outright:

| Wanted                                 | What the plugin does                                                                                                                                                                  | What would be ours                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The owner pays for the workspace       | Every subscription carries a `referenceId`, and `authorizeReference({ user, session, referenceId, action })` decides who may act for it; without the callback a foreign id is refused | `referenceId` is the workspace id and the callback is `assertMembership` with the owner's statement, so the check stays in `src/modules/*/services/`. The plugin's own organization mode needs the organization plugin, which MB.30 rejected                                     |
| Priced by member count                 | `seats` on upgrade becomes the line item's `quantity` and is stored on the row                                                                                                        | Set at checkout only. Its automatic resync is driven by the organization plugin's member hooks and refused without it, so the membership service would update the quantity on every add, removal and accepted invitation                                                         |
| Free months                            | A per-plan `freeTrial.days`, sent as Stripe's `trial_period_days`                                                                                                                     | One trial per Stripe customer, ever, across every plan. "The first month is free" fits; "a free month for this coven, granted later" is a coupon                                                                                                                                 |
| Free until a keeper clears it          | Nothing                                                                                                                                                                               | A flag on `workspaces`, written through `withAudit` by a keeper mutation and read by the entitlement check before any subscription row. A 100% coupon would also work, but its truth would live in Stripe, unaudited                                                             |
| Less for someone in several workspaces | Nothing: the upgrade call takes no coupon or discount                                                                                                                                 | Computed by a service and applied as a Stripe coupon, at checkout through `getCheckoutSessionParams` and afterwards through the Stripe API. It needs a definition first: a workspace has one paying customer, so it must say whose invoice a member's other memberships discount |

**Every account's first coven gets one free month, and a beta tester's covens get more** (M15.81). An account's first coven is free for one month, starting the day the coven is started or the day charging starts, whichever is later. An ordinary account's other covens are charged from their first day. A beta tester is an account that accepted a card from a batch minted for beta testers (`invitations.beta`, set at minting and never changed), and a beta tester gets more: their first coven gets three months instead of one, from the same day; every other coven of theirs that exists the day charging starts gets one month; and any other coven they start after that day is charged from its first day. A coven's free months cover everyone in that coven, not only the account that started it. The card's landing page states the rules that apply to the card: a beta tester's on an early card, and the one free month on an ordinary card. Stripe allows one trial per customer, so the trial is the one month every first coven gets, and a beta tester's extra months, the first coven's other two and the one month on each other coven that exists the day charging starts, come as Stripe coupons on those covens' subscriptions.

**It carries MB.30's two structural costs.** Its `subscription` table and `users.stripeCustomerId` are written by Better Auth's adapter and by the webhook handler, with no audit columns and no path through `withAudit`, and the webhook has no session to stamp from. It mounts upgrade, list, cancel, restore and billing-portal routes under `/api/auth/subscription/*`, browser-facing and outside `/api/graphql`, the objection [`auth.md`, "Better Auth's organization plugin for workspaces and invitations"](design-decisions/auth.md#better-auths-organization-plugin-for-workspaces-and-invitations) records against the organization plugin's routes. Its row is also a copy of Stripe's state, stale until the next event arrives. The webhook route is not a cost of the plugin: Stripe calls it, so it is a plain route whichever way this goes.

**Decided (M17.1, 2026-11-06).** The research, the price list, the payer modes, the pause, lapsed-member and switch rules, the processor, the data model and the running costs are in `claude-docs/design-decisions/ingredients.md`, "Subscription Billing Scope" and `claude-docs/billing/`. Billing attaches to the workspace, and entitlement and the admin exemption live in this schema, under `withAudit`, whatever carries the payment. The build is [Wave 21](waves/wave-21.md), M21.1 → M21.20; the plugin-or-SDK choice is settled by the proof of concept, M21.1, against Stripe's test mode. Nothing in v1 leaves a hook for it; a billing reference on `workspaces` is purely additive when it comes.

---

## 14. Decision log

The decision log is retired. Its binding rows live in `claude-docs/design-decisions/`, indexed by [`design-decisions/INDEX.md`](design-decisions/INDEX.md), and the rest of the spec states each rule where it applies.
Git history holds the old log, a table of questions and answers, for anyone who needs the reasoning of a row that was dropped.

---

## 15. Open questions

None remain open. Each earlier question is answered where its rule applies; four answers have no other home:

- **Ingredient correspondences are a closed set**: form, element, planet, zodiac, deities, colour, safety notes, substitutes. Nothing is added to it. Naming is identity, not correspondence: a separate question, answered in §5 (`canonicalName`, `nomenclature`, the generated `canonicalKey` and folk names as their own table). The one column the two share is `form`, which keeps its meaning and its place in the set and only loses its enum.
- **Dedupe** is a fuzzy warning in v1; merge is v2 (§13).
- **Billing** is none in v1. M17.1 scopes it (`claude-docs/design-decisions/ingredients.md`, "Subscription Billing Scope") and Wave 21, M21.1 → M21.20, builds it; the plugin-or-SDK choice is M21.1's proof of concept.
- **v1 scope** is everything but the notes subsystem and the other items §13 defers.
