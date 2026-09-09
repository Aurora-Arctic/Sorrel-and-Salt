# Sorrel and Salt — Design Doc

**Repo:** `Aurora-Arctic/Sorrel-and-Salt`
**Status:** Approved; revised 7 September 2026 (post-draft scope changes — see §14)
**Date:** 6 September 2026, revised 7 September 2026

---

## 1. Overview

A tool for tracking spell ingredients and composing spell jars. The site is invite-gated: signing in earns an account, and the right to create a workspace is granted by accepting an invitation or by an admin. Users belong to workspaces that share an inventory; a global compendium of ingredients is curated by site admins.

**In scope for v1:** OAuth sign-in, invite-gated workspace creation (`canCreateWorkspace`), workspaces with roles and copy-link invitations, admin-curated global compendium, workspace-local ingredients, stock tracking, spell builder with `private | workspace` spell visibility, full audit columns on every model, GraphQL API.

**Deferred to v2:** the entire notes subsystem — private / workspace / public experience notes and their visibility model (17 tasks, 29 hours) — plus edit-history UI, user suggestions for compendium and category additions, duplicate merge tooling, bulk add from the compendium, email/password sign-in, note moderation reports, viewer spell-approval workflow, GraphQL response caching.

### Vocabulary

Three domain nouns, each meaning exactly one thing. Used consistently in routes, components, tests, and conversation.

| Term            | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| **Compendium**  | The global, admin-curated ingredient reference. What exists. |
| **Ingredients** | A workspace's own ingredients and stock. What you have.      |
| **Grimoire**    | A workspace's spells. What you make.                         |

---

## 2. Decisions

| Decision  | Choice                                  | Why                                                                                                                                                                                                                                                                                                                          |
| --------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16, App Router                  | Needs a server runtime for sessions and audit stamping. Was 15; moved to 16 at M0.1 because Next 15 transpiles `next.config.ts` through the TypeScript 5 JS API (`ts.sys`), which TypeScript 7 no longer exposes. `resume-2026` is on TypeScript 7 and keeping the toolchains aligned matters more than the framework minor. |
| Database  | Neon Postgres                           | Supabase free tier pauses after 7 days; Neon scales to zero and resumes itself                                                                                                                                                                                                                                               |
| ORM       | Drizzle                                 | Plain-TS schema, raw SQL where needed, no engine binary                                                                                                                                                                                                                                                                      |
| Auth      | Better Auth, in-process                 | Organization plugin matches the workspace model; no extra service                                                                                                                                                                                                                                                            |
| Sign-in   | OAuth only (Google, GitHub)             | No passwords means no reset flow and no admin recovery desk                                                                                                                                                                                                                                                                  |
| API       | GraphQL Yoga + Pothos                   | Single route handler, zero hosting cost, typed contract                                                                                                                                                                                                                                                                      |
| Hosting   | Vercel Hobby                            | Native Next.js, 6,000 build minutes, generous meters                                                                                                                                                                                                                                                                         |
| Styling   | Componentized Sass                      | Matches `resume-2026` conventions                                                                                                                                                                                                                                                                                            |
| Testing   | Vitest, RTL, Playwright, local Postgres | Ported from `resume-2026`; local DB keeps RLS testable                                                                                                                                                                                                                                                                       |
| CI        | GitHub Actions, Gitflow                 | Ported wholesale from `resume-2026`                                                                                                                                                                                                                                                                                          |

### Why Drizzle

The audit requirement decided it. `auditColumns` is a plain TypeScript object spread into every table — six columns, one line per table, no codegen step. Prisma would need those six fields written into all twelve models in its DSL, or a generator plugin, plus `prisma generate` after every change.

Three more reasons:

- **Raw SQL where needed.** Partial unique indexes, `num_nonnulls` check constraints, `pg_trgm` similarity, RLS policies, and the v2 PL/pgSQL trigger all live inside typed migrations. Prisma's schema language can't express most of them.
- **No engine binary.** Prisma ships a Rust query engine as a separate process — cold-start weight and deployment size for nothing on serverless.
- **Pothos has a first-class Drizzle plugin**, which is how §7's resolvers stay thin.

Trade-off: Prisma Studio is nicer than Drizzle Studio and Prisma's errors are friendlier. Kysely is the other reasonable pick, but has no GraphQL plugin story.

### Why Yoga + Pothos

Two separate decisions.

**Yoga over Apollo Server.** Built on the Fetch API, so it drops into a Next.js route handler as a single export with no adapter shim. Apollo needs `@as-integrations/next` and carries more weight. Yoga also ships response caching, `graphql-armor` compatibility, and persisted operations as first-party.

**Pothos over SDL-first or Nexus.** Code-first means the schema is TypeScript, so a resolver returning the wrong shape is a compile error rather than a runtime one. SDL-first requires codegen to link schema and resolvers, and the link can silently break. Nexus has been effectively unmaintained for a while.

Pothos specifically: its **auth-scopes plugin** gives declarative field-level guards, and its **Drizzle plugin** derives GraphQL types from table definitions, so `auditColumns` flows into the graph without retyping.

Trade-off: the schema isn't readable as a document without codegen. §11's schema snapshot test writes the SDL out on every run, so the file exists and diffs are visible in PRs.

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

**One rule holds the whole thing together: authorization lives in `src/services/`, never in resolvers or pages.**

Server components call services directly. No HTTP loopback to your own GraphQL endpoint — that would double latency and burn function invocations for nothing. Client components go through GraphQL. Both paths converge on the same service functions, so there is exactly one place where "can this user see this row" is decided.

This answers the risk GraphQL usually introduces. Field-level authorization scattered across a graph is how data leaks; a single choke point is not.

```
src/
  app/                      # routes, layouts, server components
    api/graphql/route.ts    # Yoga handler
  components/<Name>/        # index.tsx + index.scss + index.test.tsx
  services/                 # authz + business logic — THE choke point
  db/
    schema/                 # Drizzle tables
    audit.ts                # shared audit columns
    repository.ts           # only module allowed to import `db`
    seed/                   # shared by docker, vitest, playwright
  graphql/
    schema/                 # Pothos type + field definitions
    loaders/                # DataLoader instances
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
| OAuth (Google, GitHub) | Free                            | **$0** |

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

`"**": false` (minimatch, matches names with and without slashes) disables an automatic deployment for every branch, so CI is the only path that ships code — even if the Git integration is left connected. This replaces M0.25's allow-list of `main`/`staging`/`hotfix/*`; the reason is Vercel Hobby (see `claude-docs/design-decisions/m0.26-disable-previews-and-alias-staging.md`): a named `staging` environment on `staging.sorrelandsalt.com` needs Pro, whereas `vercel alias` from CI puts staging on that hostname for free.

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
- **Compute has a dollar cost at scale**, so an N+1 query is a billing problem as well as a performance one. DataLoader is not optional.

---

## 5. Data model

### Audit columns — on every table

```ts
// src/db/audit.ts
export const auditColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
};
```

Spread as `...auditColumns` into every table, including join tables.

**Three enforcement rules, because audit columns rot the moment one path skips them:**

1. **`*_by` never comes from a request body.** All writes go through `withAudit(session, fn)`, which injects them. A lint rule bans importing `db` outside `src/db/repository.ts`.
2. **`updated_at` is a database trigger**, so a manual `psql` fix still stamps it.
3. **Soft-delete filtering happens in the repository**, never at call sites. There is no exported query that can forget `deleted_at IS NULL`.

Every transaction sets `SET LOCAL app.current_user_id = '<uuid>'`. This serves RLS today and the v2 history trigger later — putting it in now is what makes history a one-migration addition rather than a re-audit of every write path.

**Partial indexes only, everywhere.** Without the `WHERE deleted_at IS NULL`, deleting a record permanently blocks reusing its name.

### Naming note: `workspaces` vs `/coven/`

The schema entity is `workspaces`; the URL prefix is `/coven/`. This divergence is deliberate, not an oversight.

`/w/` is unreadable, and nesting workspaces under `/compendium/` would make that word mean two things. `/coven/` reads well in a URL, fits the domain, and stays out of the compendium's way.

Code, schema, and prose use _workspace_. Only the URL segment says _coven_.

### Tables

**`users`** — `id`, `email`, `displayName`, `avatarUrl`, `role` (`user` | `admin`), `canCreateWorkspace` (boolean, default `false`), + audit.

`role` is a column, not a table; v1 needs no granular platform permissions. Admins can write the global compendium and global categories, and **nothing else** — an admin has no access to any workspace's ingredients or grimoire. Bootstrap promotes the first user by email via env var; there is no UI for granting admin in v1 (M2.9 scopes one).

`canCreateWorkspace` defaults to `false`. Signing in with Google or GitHub earns an account and nothing more. The flag turns `true` by one of two routes — accepting a workspace invitation or an admin granting it — and once `true` it stays `true`, so an established user can create as many workspaces as they like. Admins can always create workspaces regardless of the flag, and nothing in the OAuth flow sets it.

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

Only the hash is stored, and the token is generated with a CSPRNG (`crypto.randomBytes`, never `Math.random`). The mutation returns the full URL once, in the response body; the UI shows it in a copy field with a "this is the only time you'll see it" warning. Accepting an invitation also sets `canCreateWorkspace` on the accepting user, audited — someone vouched for by an existing member is an established user.

**`ingredients`** — `id`, `workspaceId` (nullable), `name`, `folkNames[]`, `form`, `description`, `element`, `planet`, `zodiac`, `deities[]`, `color`, `safetyNotes`, `substitutes[]`, + audit.

One table, two tiers, so `spell_ingredients` (and v2's `notes`) point at a single kind of thing:

- `workspaceId IS NULL` — the global compendium. Everyone reads; only admins write.
- `workspaceId` set — local to that workspace. Owners and members there write it. Invisible elsewhere.
- No user path promotes local to global. That's v2's suggestion flow.

```sql
CREATE UNIQUE INDEX ON ingredients (lower(name))
  WHERE workspace_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX ON ingredients (workspace_id, lower(name))
  WHERE workspace_id IS NOT NULL AND deleted_at IS NULL;
```

A workspace-local ingredient may share a name with a compendium entry. The local entry wins in that workspace's search, badged as local. Forbidding the collision would block someone who disagrees with an admin's correspondences from keeping their own version.

`form` values: herb, root, bark, resin, flower, crystal, oil, curio, salt, powder, liquid, ash.
`element` values: earth, air, fire, water, spirit.

**`categories`** — `id`, `name`, `slug`, `color`, `description`, `group`, + audit. Global only, admin-curated. Suggestions in v2. Seed list in §6.

**`ingredient_categories`** — `ingredientId`, `categoryId`, + audit.

**`spell_categories`** — `spellId`, `categoryId`, + audit.

**`inventory_items`** — `id`, `workspaceId`, `ingredientId`, `quantityOnHand`, `unit`, `unitDimension`, `lowStockThreshold`, `source`, `acquiredDate`, + audit.

Unique on `(workspaceId, ingredientId) WHERE deleted_at IS NULL`. Units cover three dimensions, metric and imperial in each: **weight** — mg, g, kg, oz, lb; **volume** — ml, l, tsp, tbsp, fl oz, cup; **count** — piece, drop, pinch. `unitDimension` is stored alongside `unit` rather than derived at each call site, so a query can filter or group by it; a row whose dimension contradicts its unit cannot be written. One shared module owns the unit-to-dimension map, imported by both the Zod schema and the conversion library so the list cannot drift in two places.

`lowStockThreshold` is written onto the row at creation with a dimension-appropriate default (3 for count, 10 g for weight, 15 ml for volume, converted into the row's unit), not left null and defaulted at read time.

**`spells`** — `id`, `workspaceId`, `title`, `intent`, `jarSize`, `sealWaxColor`, `moonPhase`, `dayOfWeek`, `instructions`, `status` (`draft` | `complete`), `visibility` (`private` | `workspace`, default `workspace`), + audit.

**Visibility.** A `workspace` spell is readable by every member, viewers included. A `private` spell is readable only by its author — against owners too. Owners and members create and edit; viewers create and edit nothing, including private spells.

**The transition is one-way:** `private` may be widened to `workspace`, and `workspace` may never be narrowed back to `private`. Once a spell is part of the shared grimoire the others have read it and may have built on it; hiding it afterwards would retract something they were relying on. Widening is a gift, narrowing is a retraction, so only one is allowed. Enforced in the service and backstopped by RLS (§8), not merely absent from the UI. This rule governs visibility, not existence — a shared spell can still be deleted.

**`spell_ingredients`** — `spellId`, `ingredientId`, `quantity`, `unit`, `layerOrder`, `note`, + audit. (`note` here is a short free-text line on one ingredient's role in the jar, unrelated to the deferred notes subsystem.)

References the ingredient, not the inventory item, so a saved spell survives running out of something.

**Notes are deferred to v2.** The first-class `notes` model and its `private | workspace | public` visibility model are specified in §13. Nothing in v1 writes a note, and no v1 table references one. `notes` is the reason the ingredient detail page (§9) is built to take a section beneath it without restructuring.

### Two kinds of spell category

`spell.categories` is what you **intend** the spell to do. The union of its ingredients' categories is what it is **composed of**. Conflating them would be a bug.

The spell builder shows both side by side, flagging intent categories with no ingredient backing them ("tagged for prosperity but nothing in the jar carries it") and ingredient categories outside the stated intent ("mugwort adds psychic work — intended?"). That comparison is what makes assigned categories worth having rather than redundant.

### Fuzzy duplicate warning

`pg_trgm`, available on Neon:

```sql
CREATE INDEX ON ingredients USING gin (name gin_trgm_ops);
```

Debounced on the create form's name field. Returns compendium and in-workspace matches above ~0.4 similarity on `name` or any `folkNames` element. Non-blocking — renders as "Did you mean Bay Laurel?" with a link, plus a Create Anyway button. Merge tooling is v2.

---

## 6. Category seed

52 categories, grouped. The `group` field lets the chip selector collapse into sections rather than presenting 52 flat chips, which would be unusable on a phone.

| Group                | Categories                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Protection & defense | protection, warding, banishing, hex-breaking, uncrossing, reversal, nightmare protection, binding                |
| Cleansing & release  | cleansing, purification, release, forgiveness, grief work, shadow work                                           |
| Prosperity & work    | prosperity, wealth, abundance, success, career, business, legal matters, justice, gambling                       |
| Love & connection    | love, attraction, lust, self-love, friendship, reconciliation, fidelity, harmony                                 |
| Mind & spirit        | psychic work, divination, prophecy, dream work, intuition, wisdom, knowledge, memory, clarity, meditation, truth |
| Wellbeing            | healing, peace, sleep, joy, longevity, strength, courage, confidence                                             |
| Craft & change       | grounding, manifestation, transformation, creativity, inspiration, glamour                                       |
| Practice & place     | ancestor work, spirit work, home blessing, safe travel, communication, fertility, familiar work                  |

Each carries `name`, `slug`, `color`, `description`, and `group`.

---

## 7. GraphQL API

Single route handler at `/api/graphql`. No separate service, no additional hosting cost.

**Stack:** GraphQL Yoga (server), Pothos with the Drizzle plugin (code-first schema), DataLoader, graphql-codegen for client types.

**Client:** `graphql-request` plus TanStack Query, not Apollo. Apollo's normalized cache duplicates what TanStack Query already does here and adds ~40 kB. Codegen generates typed document nodes and hooks.

### Resolvers are thin

```ts
// src/graphql/schema/ingredient.ts
builder.queryField('compendium', (t) =>
  t.field({
    type: [IngredientType],
    args: { search: t.arg.string({ required: false }) },
    resolve: (_, args, ctx) => compendiumService.list(ctx.session, args), // authz lives here
  }),
);
```

No database access in a resolver, ever. Same lint rule as `db`.

### The three GraphQL costs, and how each is paid

**N+1 queries.** A query for 50 ingredients each with categories fires 101 queries without batching. DataLoader instances are created per-request in the Yoga context — `categoriesByIngredient`, `membersByWorkspace`. This is a cost concern as much as a performance one.

**Authorization surface.** Handled by the service-layer choke point in §3. Pothos auth scopes provide a second check on sensitive fields (`User.email`) and on admin mutation fields, but the service layer is the real gate.

**Client-composable expense.** `graphql-armor` applies a depth limit of 7, a cost limit, and disables introspection and field suggestions in production. Aliasing and directive-overload protections come with it.

### Caching — three layers in v1

**One rule above all: never cache anything not keyed by viewer identity.** A cache is the easiest way to leak one workspace's data into another's response.

**1. DataLoader — per-request batching.** Collapses the 50-ingredient N+1 from 101 queries to 3. Free, no invalidation problem, non-negotiable.

**2. React `cache()` — per-request memoization.** Wraps service functions so a layout and a page requesting the same workspace hit Postgres once. Scoped to the request, no staleness risk.

**3. Next.js data cache with tag invalidation.** The compendium and categories are read on nearly every page, mutated only by admins, and identical for every viewer. Ideal cache target.

```ts
export const getCompendium = unstable_cache(() => compendiumService.listGlobal(), ['compendium'], {
  tags: ['compendium'],
  revalidate: 3600,
});
// admin mutation:
revalidateTag('compendium');
```

Persistent across requests and shared across instances. Should remove most compendium reads from Postgres entirely. Vercel's native Next.js support makes `revalidateTag` and ISR first-class, so this layer does most of the work.

**Not cached:** anything workspace-scoped. Ingredients and notes change from under you when a co-member edits, and stale shared state in a collaborative app is worse than an extra query.

**Layer 4 (Yoga response cache) is deferred to v2** — see §13.

### Schema sketch

```graphql
type Query {
  me: User!
  workspace(slug: String!): Workspace
  compendium(search: String, categoryIds: [ID!], form: Form): [Ingredient!]!
  ingredient(id: ID!): Ingredient
  workspaceIngredients(workspaceId: ID!, search: String, categoryIds: [ID!]): [InventoryItem!]!
  grimoire(workspaceId: ID!): [Spell!]! # workspace-visible + own private spells
  spell(id: ID!): Spell
}

type Mutation {
  createWorkspace(input: WorkspaceInput!): Workspace! # gated on canCreateWorkspace or admin
  createWorkspaceIngredient(input: IngredientInput!): Ingredient!
  updateIngredient(id: ID!, input: IngredientInput!): Ingredient!
  addIngredientToWorkspace(workspaceId: ID!, ingredientId: ID!, input: StockInput!): InventoryItem!
  createSpell(workspaceId: ID!, input: SpellInput!): Spell!
  setSpellVisibility(id: ID!, visibility: SpellVisibility!): Spell! # private -> workspace only
  createInvitation(workspaceId: ID!, email: String!, role: InvitableRole!): InvitationResult!
  # admin mutations gated by users.role; grantWorkspaceCreation(userId) is admin-only
}

type Ingredient {
  id: ID!
  name: String!
  isGlobal: Boolean!
  categories: [Category!]!
  audit: AuditInfo!
  # a v2 notes section slots in here
}

type Spell {
  id: ID!
  title: String!
  intent: String
  visibility: SpellVisibility! # private | workspace
  categories: [Category!]! # assigned intent
  derivedCategories: [Category!]! # union across ingredients
  categoryGaps: CategoryComparison! # intended-not-present, present-not-intended
  ingredients: [SpellIngredient!]!
  audit: AuditInfo!
}

enum InvitableRole {
  viewer
  member
} # owner is not invitable
type InvitationResult {
  invitation: Invitation!
  url: String! # returned once, never again
}
```

Cursor pagination on every list that can grow — the grimoire and compendium especially — through one shared helper: default page size 25, hard server-side maximum 100, cursors encoding a stable sort key plus id, never an offset.

---

## 8. Auth and authorization

**Better Auth, running in-process** as Next.js route handlers with its tables via the Drizzle adapter (Neon in deployment, local Postgres in dev and test). No extra service, no extra cost. Neon's own Managed Better Auth wraps the same library, so migrating to it later stays possible.

**OAuth only in v1.** Google and GitHub. The OAuth handshake at `/api/auth/*` is the one path outside the GraphQL-only rule and carries no application data.

**The site is invite-gated.** Signing in creates an account with `canCreateWorkspace = false` and no workspace. Creation rights are granted by accepting a workspace invitation or by an admin (`grantWorkspaceCreation`), and persist once held. The first user matching the bootstrap env email is promoted to `admin` on first sign-in; nothing else grants admin in v1.

**Two layers of authorization, deliberately.**

Application layer: every workspace-scoped call passes `assertMembership(userId, workspaceId, minRole)` inside `withAudit()`, so a write can't reach the database without both a membership check and audit stamping.

Database layer: RLS policies using the `app.current_user_id` GUC already set per transaction.

```sql
CREATE POLICY ingredients_workspace_access ON inventory_items
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = current_setting('app.current_user_id')::uuid
      AND deleted_at IS NULL
  ));
```

Belt and braces is warranted: an application bug here leaks one person's grimoire to another. The same two-layer pattern covers spell `visibility` — the service decides who may read a spell, and an RLS policy independently admits a `private` spell only to its author.

---

## 9. Routes and components

**Workspace lives in the URL, not the session.** Session-held workspace state produces the classic bug where two tabs disagree about context and a write lands in the wrong workspace.

| Route                        | Page                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                          | Post-sign-in landing: into their workspace if they have one; the create form if they hold creation rights; otherwise a plain "invite-only" explanation |
| `/compendium`                | Global ingredient reference, read-only for non-admins                                                                                                  |
| `/ingredients/[id]`          | Detail — correspondences, safety notes, substitutes (built to take a v2 notes section beneath)                                                         |
| `/coven/[slug]/ingredients`  | Workspace ingredients and stock                                                                                                                        |
| `/coven/[slug]/grimoire`     | Workspace spells (plus the viewer's own private spells)                                                                                                |
| `/coven/[slug]/grimoire/new` | Spell builder                                                                                                                                          |
| `/coven/[slug]/members`      | Members and invitations (owner only)                                                                                                                   |
| `/admin/compendium`          | Admin CRUD on global ingredients                                                                                                                       |
| `/admin/categories`          | Admin CRUD on global categories                                                                                                                        |
| `/invite/[token]`            | Accept invitation                                                                                                                                      |
| `/sign-in`                   | OAuth                                                                                                                                                  |

Workspace ingredients and stock are **one page**, not two. A filter chip distinguishes local entries from compendium entries; a separate page would be a distinction without a difference.

### Components

Component folders follow the `resume-2026` convention exactly — `src/components/IngredientCard/` with `index.tsx`, `index.scss`, `index.test.tsx`, imported `from '../components/IngredientCard'`.

**`IngredientSearch`** is shared by compendium, ingredients, and spell builder. Debounced text match on `name` and `folkNames`; multi-select category chips grouped by §6's `group` field, AND by default with an OR toggle; secondary filters for form, element, in-stock-only; filter state in the URL query string. Each consumer supplies the action slot — Compendium passes "Add ingredient," Ingredients passes Edit/Delete, Spell Builder passes "Add to jar."

### Componentized Sass

Every component folder carries its own `index.scss`, imported by its `index.tsx`. One global stylesheet, `src/app/globals.scss`, imported once by the root layout — nothing component-specific in it. It exists because two things must be emitted exactly once: `_typography.scss`'s global element rules, and the theme token assignments (M0.6). Each component's `index.scss` is its own compilation unit, so a shared partial that emitted CSS would duplicate it into every compiled stylesheet — which is why `_variables.scss` and `_mixins.scss` stay declaration-only.

```
src/components/IngredientCard/
  index.tsx      → imports './index.scss'
  index.scss     → @use '../../scss/variables' as *;
  index.test.tsx
```

Shared partials in `src/scss/`, `@use`'d directly by whichever component needs them — never routed through a parent:

| Partial            | Carried over from `resume-2026`                                                             | Added                                         |
| ------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `_variables.scss`  | Screen/print colors, shadows, transitions, font stacks                                      | 8 category-group colors, safety-badge palette |
| `_mixins.scss`     | `theme-transition()`, `reduced-motion`, `focus-ring()`, `card-surface()`, `tooltip-arrow()` | `modal-surface()`, `chip()`, `badge()`        |
| `_typography.scss` | Global body/heading rules                                                                   | unchanged                                     |
| `_buttons.scss`    | Button fill system, `.dismiss-button`                                                       | unchanged                                     |
| `_print.scss`      | Print-URL reveal, print tiers                                                               | Spell recipe print layout                     |

Modern module system throughout — `@use '../../scss/variables' as *;`, never the deprecated `@import`.

---

## 10. User stories

### Accounts and workspaces

1. Sign in with Google or GitHub, so I don't manage another password.
2. As a newly signed-in user, be told plainly what I can do next, so an empty account doesn't look broken.
3. Create a workspace once I hold creation rights, for my coven or household.
4. Generate an invitation link with a chosen role (viewer or member) and copy it, understanding it's shown once.
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

Stories 35–46 covered the three-tier experience-notes system. They move to v2 with the rest of the notes subsystem (§13). Story numbers are **not** reused: the grimoire stories keep their original 47–56, so a v1 count is 44 stories (1–34, 47–56).

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

Keeping a spell `private` while building it, and the one-way widen to `workspace`, are governed by §5's visibility rule rather than a numbered story.

---

## 11. TDD approach

Every story becomes a failing test first: **write test → watch it fail → minimum code → refactor.** Both suites keep the 80% threshold on lines, branches, functions, and statements, with coverage artifacts uploaded. Per the `resume-2026` CLAUDE.md rule, run the `:coverage` variants when verifying — a plain pass can still fail CI on coverage alone.

### Test database: local Postgres, not Neon, not SQLite

**Postgres 17 in Docker, everywhere except deployment.**

| Context              | How                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Local dev            | `postgres` service in `docker-compose.yaml`, seeded on first boot                             |
| Local tests          | Same container, separate database per Vitest worker                                           |
| CI unit + db         | Actions `services: postgres:17`, reachable by service name from the existing job `container:` |
| CI e2e               | Same service container                                                                        |
| Staging + production | Neon                                                                                          |

**SQLite was considered and rejected.** It cannot run RLS policies, `num_nonnulls` check constraints, `pg_trgm` fuzzy matching, PL/pgSQL triggers, native array columns for `folkNames`, or `SET LOCAL app.current_user_id`. The RLS tests are the point: the suite deliberately stubs out `assertMembership` to prove the database layer independently blocks cross-workspace reads. Under SQLite that test cannot exist, and the failure mode it guards against is one user's grimoire visible to another.

**Using local Postgres instead of Neon branches is a net simplification.** It removes the `NEON_API_KEY` secret, `globalSetup` branch creation, the 10-branch-per-project limit, the CU-hour budget, and the branch-reaper workflow. Neon becomes deployment-only infrastructure. Tests get faster too — a local socket beats a network round trip per query.

**Isolation.** Each Vitest worker gets `sorrel_test_${VITEST_WORKER_ID}`, created from a template database with migrations pre-applied, so setup is a fast `CREATE DATABASE ... TEMPLATE` rather than a full migration run. Playwright gets `sorrel_e2e`, truncated and reseeded between spec files.

### Seed data — one module, three consumers

`src/db/seed/index.ts` exports `seed(db, { scenario })`. Docker Postgres runs it on first boot; the Vitest `db` project and Playwright's `globalSetup` call it directly. Identical data everywhere, so a bug reproduces in all three.

Scenarios: `minimal` (one admin, one user, empty compendium), `standard` (five users, workspaces W and X, populated compendium), `demo` (standard plus spells with ingredients and layer order).

**Fixture users:**

| User | Role                               |
| ---- | ---------------------------------- |
| A    | Owner of workspace W               |
| B    | Member of workspace W              |
| C    | Viewer in workspace W              |
| D    | Member of unrelated workspace X    |
| E    | Site admin, member of no workspace |

`make db-reset` reseeds local.

### Acceptance tests — story traceability

Every story gets a test that names it. The suite is written first, all failing, and becomes the definition of done.

```
tests/acceptance/
  01-accounts.test.ts       # stories 1-13
  02-compendium.test.ts     # stories 14-16
  03-ingredients.test.ts    # stories 20-27
  04-modals.test.tsx        # stories 28-34
  06-grimoire.test.ts       # stories 47-56
  07-admin.test.ts          # stories 17-18  (story 19 via the workspace-isolation suite)
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

- `filterIngredients()` — name and folk-name match, AND vs OR, case and accent insensitivity, empty query returns all
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
- A user without `canCreateWorkspace` (and not admin) cannot create a workspace; accepting an invitation sets the flag and audits it
- RLS blocks a cross-workspace read **with `assertMembership` stubbed out** — deliberately bypassing the application layer to prove the second layer works

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
- Re-adding a name after soft delete succeeds — the partial-index test

**Compendium and ingredients**

- A workspace-local ingredient is invisible to every other workspace
- A local may share a name with a compendium entry; two locals in one workspace may not
- A local entry wins over a compendium entry of the same name in that workspace's search
- Fuzzy match returns near-misses above threshold, nothing below

**Grimoire**

- Every member including viewers can read every `workspace`-visible spell
- A spell's `derivedCategories` is the deduped union across its ingredients
- `categoryGaps` reports both directions correctly
- A spell survives soft-deletion of an inventory item for one of its ingredients

**Invitations**

- Token returned once, generated with a CSPRNG, stored only as a hash
- An invitation with role `owner` is rejected by the check constraint
- Expired, revoked, and reused tokens all rejected, each with a distinct reason
- Accepting sets `canCreateWorkspace` on the accepting user
- Last-owner demotion fails

### GraphQL layer

- Schema snapshot test — the one permitted snapshot besides design tokens, since the schema _is_ a contract and unintended changes should be loud
- Depth limit rejects a query nested past 7
- Cost limit rejects an expensive composed query
- Introspection disabled in production config
- DataLoader batches — assert query count, not just correctness, on a 50-ingredient fetch
- Every mutation delegates to a service; no resolver touches `db`

### Component — Vitest + RTL, colocated

`src/components/<Name>/index.test.tsx`, importing the sibling `from '.'`. Role and label queries only; no test ids for anything a user can see.

- `IngredientSearch` — filtering, chip toggle, grouped chips collapse, clear, debounce via fake timers
- `IngredientForm` — fuzzy warning renders, Create Anyway proceeds, compendium entries read-only for non-admins
- `AddIngredientModal` / `EditIngredientModal` — validation, submit payload, Escape, focus trap, focus restore, pre-population, dirty-discard warning
- `InviteDialog` — link shown once, copy works, warning present, role selector offers viewer and member only (never owner)
- `MemberList` — role controls hidden from non-owners
- `WorkspaceSwitcher` — lists memberships, navigates on select
- `SpellBuilder` — add/remove/reorder, intent vs derived category comparison, visibility control defaulting to `workspace` and read-only once shared
- `IngredientCard` — safety and low-stock badges

MSW mocks `/api/graphql`. `vitest.setup.ts` carries over the RTL `afterEach(cleanup)` and the `localStorage` polyfill — Node's native global still shadows jsdom's — plus MSW server lifecycle.

### E2E — Playwright

Specs: admin adds a compendium entry; A adds it to W's ingredients with a quantity; A builds a spell and checks the category comparison; A generates an invite link; B accepts, signs in, and lands in W seeing everything; C reads but cannot edit; D reaches for W's routes by URL and gets 404 throughout; A soft-deletes an item and confirms it's gone and the name can be reused.

`@axe-core/playwright` scans each page and each open modal. Accessibility is asserted here, matching the `resume-2026` pattern — no `vitest-axe`.

`webServer` runs `npm run build && npm run start` on **8001**, preserving the deliberate separation from the dev server's 8000. Coverage via `monocart-coverage-reports`.

### Rules

- Bug fixes start with a regression test.
- No snapshots except design tokens and the GraphQL schema.
- `fixtures/` factories, so tests read `makeIngredient({ categories: ['protection'] })`.

---

## 12. CI/CD and Git workflow

### Ported verbatim from `resume-2026`

`.github/workflows/` (`pr-gate.yml`, `merge-queue.yml`, the reusable per-check workflows `lint`/`format`/`typecheck`/`vitest`/`build`/`playwright`/`audit`/`gitflow`, the shared composite actions, `build-image.yml`), `.actrc` and the `make act-*` targets, `Docker/` (multi-stage `Dockerfile.node` with `development`/`testing`/`devcontainer`, plus `docker-compose.yaml`), `.devcontainer/`, `makefile`, `.oxlintrc.json`, `.prettierrc`, `.prettierignore`, the `"pre-commit": ["lint", "format:check", "typecheck"]` array, and `.claude/skills/`.

### Gitflow — unchanged

`feature/*` → `staging`; `staging` promoted to `main` via `release/MAJOR.MINOR.PATCH`; `hotfix/*` to either, with `create-pr` opening both; `main-sync/YYYY-MM-DD-HH-MM-SS` brings `main` back down. Dependabot targets `staging`, exempt by author.

### Changes in the port

| File                        | Change                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`              | `build`/`start`/`dev` → Next.js; drop `predevelop`/`prebuild`/`postclean` and the `link-public.js`/`clean.js` Gatsby workarounds; add `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `codegen` |
| `playwright.config.ts`      | `webServer` → `npm run build && npm run start`, port 8001; local Postgres setup in `globalSetup`                                                                                                    |
| `vitest.config.ts`          | Two projects — `unit` (jsdom) and `db` (node, local Postgres); keep 80% thresholds                                                                                                                  |
| `.oxlintrc.json`            | Node-globals override swaps `gatsby-*.ts` for `next.config.ts`, `drizzle.config.ts`, `src/db/**`, `src/app/**/route.ts`                                                                             |
| `docker-compose.yaml`       | Drop the Gatsby LMDB volume; keep `node_modules`; **add `postgres` service** with seed init script; `devcontainer` depends on it                                                                    |
| `netlify.toml`              | Replaced by `vercel.json` — config only; `vercel.json` disables the Git integration and does not drive deploys (see below)                                                                          |
| **New** `codegen.yml` check | Fails if generated GraphQL types are stale relative to the schema                                                                                                                                   |
| **New** `deploy.yml`        | CLI-driven Vercel deploy on push to `main`/`staging`/`hotfix/**` (§4). Not ported — `resume-2026` deployed via Netlify's own Git integration with no workflow file                                  |
| **New** `migrate.yml`       | Applies migrations to staging on merge to `staging`, production on merge to `main`; must complete before `deploy.yml` ships the new deployment (a `needs:` job or a `workflow_run` predecessor)     |
| Secrets                     | `DATABASE_URL` per environment, `BETTER_AUTH_SECRET`, Google and GitHub OAuth client credentials, `VERCEL_DEPLOY_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_SCOPE` for `deploy.yml`   |

`make docker-up` gives a working local database with no Neon connection at all.

**Manual setup:** enable "Require merge queue" in Settings → Branches on both `main` and `staging`, or `merge-queue.yml` never fires.

**Docs:** adopt the `claude-docs/` convention — summary per subsystem, append-only transcript, one doc per component.

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
| `public`    | Every signed-in user, attributed by `displayName`    |

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

**Stories:** view an ingredient's history as a timeline · field-level diff between revisions · see who made each change · restore a previous revision (as a new revision, never a rewrite) · undo a soft delete from a trash view.

### Spell approval for viewers

Viewers can currently read workspace spells and nothing else. This gives them a contribution path.

**Schema:** `spells.status` gains two values — `draft | proposed | approved | complete` — plus `proposedBy`, `proposedAt`, `reviewedBy`, `reviewedAt`, `reviewNote`.

**Flow.** A viewer creates a spell in `draft`, visible only to them. They submit it, moving it to `proposed`, at which point owners and members can see it. Any owner or member approves it into `approved`, or returns it with a `reviewNote`. Approved spells behave like any other workspace spell.

The generic revision trigger above already captures every status transition and who made it, so review history comes free. The same `proposed` state is what the compendium suggestion flow needs, so the two features share a pattern rather than inventing two.

**Stories:** as a viewer, draft a spell privately · submit it for review · see its review status · receive a returned spell with feedback · as a member, see the proposal queue · approve or return with a note · as a viewer, see who approved my spell.

### Compendium and category suggestions

`compendium_suggestions` table. Users propose ingredients and categories; admins approve into the global compendium. Reuses the `proposed` pattern above.

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
    ingredientIds: [ID!]! # capped at 100, matching graphql-armor's cost limit
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

**Cost.** The write is one insert plus one update regardless of selection size, so it doesn't reopen §4's N+1 concern. The 100-id cap keeps a single mutation's cost bounded and aligned with the depth and cost limits `graphql-armor` already enforces; a larger paste becomes two actions instead of one.

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

### Email and password sign-in

Better Auth adds it without migration. Would reintroduce the reset problem, so: admin-mediated single-use links and a `password_reset_tokens` table with `createdBy`, since that table is a backdoor into any account and its use must be auditable.

### Note moderation

`note_reports` (`noteId`, `reporterId`, `reason`, `resolvedAt`, `resolvedBy`). Pointless before there are enough users to need it.

### Saved spell notes

The nullable `spellId` on `notes` already accommodates it.

---

## 14. Decision log

Choices made during design that a future reader might otherwise revisit.

| Question                         | Answer                                    | Reason                                                                                                                                                                                   |
| -------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gatsby, like `resume-2026`?      | No                                        | SSG has no server runtime for sessions or audit stamping                                                                                                                                 |
| Vite SPA?                        | No                                        | Neon has no browser-facing API; client-set `created_by` is forgeable                                                                                                                     |
| Supabase?                        | No                                        | Free tier pauses after 7 days and needs manual restore                                                                                                                                   |
| Render Postgres?                 | No                                        | Free instance expires 30 days after creation                                                                                                                                             |
| SQLite for tests?                | No                                        | Cannot run RLS, triggers, `pg_trgm`, or array columns                                                                                                                                    |
| Neon branches for CI?            | No                                        | Local Postgres is faster and removes the branch limit and API key                                                                                                                        |
| Netlify?                         | No                                        | Vercel Hobby has 6,000 build minutes vs 300 and native Next.js                                                                                                                           |
| Apollo Client?                   | No                                        | Duplicates TanStack Query's cache, adds ~40 kB                                                                                                                                           |
| Polymorphic note subject?        | No                                        | Nullable FKs plus `num_nonnulls` keeps real referential integrity                                                                                                                        |
| Shadow history tables?           | No (v2 uses generic)                      | One trigger survives schema drift; per-model tables don't                                                                                                                                |
| Email/password in v1?            | No                                        | Copy-link reset isn't self-service; OAuth removes the subsystem                                                                                                                          |
| Bulk add: all-or-nothing?        | No — partial with a report                | Skipping an already-present entry is the expected case on a re-run, not a failure; the call only aborts on ids the user couldn't act on anyway                                           |
| Notes in v1?                     | No — v2                                   | Cuts 17 tasks / 29 hours; the three-tier visibility model and its UI are a milestone on their own and the core loop is provable without it                                               |
| Personal workspaces?             | No                                        | A `kind` column plus "can't gain members / can't be deleted" special-casing for a one-person space that otherwise behaves like every workspace; drop it and every workspace is identical |
| Open sign-up?                    | No — invite-gated                         | Signing in earns an account only; `canCreateWorkspace` is granted by an invitation or an admin and persists once held. Keeps the compendium curator off the hook for unbounded sign-ups  |
| Private spells in v1?            | Yes — `private \| workspace`              | One enum column and one RLS clause; a member drafting a working unseen is a real need. `private → workspace` is one-way so shared history can't be retracted                             |
| Invitations can grant owner?     | No — `viewer \| member` only, DB-enforced | A link only proves receipt and can be forwarded; ownership is granted by an existing owner on the members page once there's an identifiable account                                      |
| Cross-dimension unit conversion? | No                                        | g→tsp depends on the substance; a wrong factor silently doubles or halves an ingredient. Convert within weight or within volume only; count converts to nothing; no density table        |

---

## 15. Open questions

The post-draft scope changes (notes → v2, no personal workspaces, invite-gating, spell visibility, invitable roles, unit dimensions) are recorded in §14 and reflected throughout. One follow-up remains open:

- **Granting admin** — v1 promotes exactly one admin by bootstrap env email. A real grant/revoke path (M2.9) is scoped but not designed; needed before a second admin.

All other prior questions resolved:

- Framework, database, ORM, auth, API, hosting — §2
- Sharing model — workspaces with three roles, §5
- Compendium edit rights — admin only in v1, suggestions in v2
- Invitation delivery — copy-link, viewer/member only, §5
- Dedupe — fuzzy warn in v1, merge in v2
- Categories — global admin-curated, 52 seeded, §6
- Ingredient properties — confirmed complete, no additions
- Local dev database — Docker Postgres, shared seed, §11
- v1 scope — notes deferred; everything else built, not deferred
