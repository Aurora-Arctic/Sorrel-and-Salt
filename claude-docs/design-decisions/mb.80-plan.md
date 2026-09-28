<!-- The approved plan for MB.80, stored beside the record it produced. The decision is mb.80-public-compendium.md; this file is how it was reached and is not maintained after the PR lands. -->

# MB.80 — A public, search-indexable compendium

## Context

The question: what would it take for the compendium list page and every compendium ingredient page to be visible to signed-out visitors and fully indexable by search engines.

The short answer: nothing compendium-shaped exists yet, so this is not an ungating job. It is a change to the design and to the acceptance criteria of tasks that have not been built, plus a handful of new tasks for the search-engine surface the project has never planned for. The current tree (branch `feature/m3.6-…`, clean) has no compendium route, service, GraphQL query, cache, or component. The pages are Wave 12 work (M8.18, M8.19).

What the design says today, and would have to stop saying:

- `DESIGN.md` §9 route table: `/` is the only public page. `/compendium` is "read-only for non-admins", `/ingredients/[id]` is the detail page for **both** compendium and workspace ingredients. `AppShell` "wraps every signed-in page — compendium and ingredient detail included".
- `TASKS.md` M5.2: "Any signed-in user can read the compendium". M8.18: "Add to my ingredients is present for members, absent for viewers". Every compendium story (14–16) is framed "As a workspace member".
- `src/proxy.ts:18-23`: deny by default, `PUBLIC_ROUTES = ['/', '/sign-in', '/invite/*', '/email/*']`. `tests/proxy.test.ts:105-114` pins `/compendium` as a lookalike that **must** redirect a signed-out request. `tests/proxy.test.ts:68` pins that `/robots.txt` is redirected to sign-in until a PR adds an entry.
- "Public launch" (§14, MB.29) means only RLS and a WAF, both backlog. Nothing there makes any page public.
- No SEO surface exists anywhere: no `robots.ts`, no `sitemap.ts`, no per-page `generateMetadata`, no canonical URLs. The root layout carries one static title and description. M11.16 (images) is the only task that mentions Open Graph.
- Ingredients are keyed by UUID (`src/db/schema/ingredients.ts:44`); there is no slug column and two compendium entries can legitimately share a display name, so a name-derived slug cannot be a URL on its own.

The invite gate itself is untouched: accounts, workspaces, ingredients-you-have and the grimoire stay exactly as gated. What changes is that "what exists" becomes the site's public face while "what you have" and "what you make" stay private.

## What it would take

### A. The decision, recorded (docs, before any code)

1. **`DESIGN.md`**: §9 route table marks `/compendium` and the compendium detail route public; the `AppShell` sentence gets a signed-out mode or a public shell; §14 gains a decision-log row ("Public compendium? Yes — the compendium is the site's public face; the gate is on accounts and workspaces, not on what exists") and §10's compendium stories gain a visitor story; §7 caching notes that the `compendium` tag now also invalidates rendered pages.
2. **`CLAUDE.md`** domain invariant "The site is invite-gated" gets one clause: the compendium and its entry pages are public and indexable; nothing else is.
3. **`TASKS.md`**: M5.2's criterion becomes "anyone, signed in or not, can read the compendium"; M8.18 and M8.19 criteria change (below); new tasks for the search surface are minted with `MB` ids and added to the Wave 12 card on Asana in the same pass.
4. **`claude-docs/auth.md`** "Route protection" and the MB.57 record ("`/` is the public entry page, for everyone" as the only one) are corrected in the same PR.

### B. Route protection

5. `src/proxy.ts` `PUBLIC_ROUTES` gains `/compendium`, `/compendium/*`, `/robots.txt`, `/sitemap.xml`. `tests/proxy.test.ts` moves `/compendium` from the lookalike list to the public list and pins the two crawler files as passed through rather than redirected. The pages read the session with `getSession()` (as `src/app/page.tsx` does), never `requireSession()`.
6. **Two routes to one page** (decided): the public, canonical URL for a compendium entry is `/compendium/ingredients/[slug]`. The in-app `/ingredients/[id]` from §9 stays as designed, signed-in, and reaches compendium entries as well as workspace ones; for a compendium entry it renders the same page component inside `AppShell` with `<link rel="canonical">` pointing at the public URL. No redirect is needed because the in-app route is gated and a crawler never reaches it. M8.19's "works for both compendium and local ingredients" becomes one page component rendered by two routes.
   - `/ingredients/[…]` keeps the **id**, not a slug: it sits outside `/coven/`, so a slug alone cannot say which workspace's "rosemary" is meant. A slug-routed workspace entry belongs under `/coven/[slug]/ingredients/[slug]` if ever wanted, which is not this change.
7. A workspace-ingredient slug or id requested at `/compendium/ingredients/…` answers **404**, not 403, and a test asserts it with a direct identifier (Testing rule: direct-id denial, with the precondition that the row exists and is a workspace entry).

### B2. An ingredient slug

The public URL needs a slug and ingredients have none (`src/db/schema/ingredients.ts`). The project already stores slugs as columns filled from `src/lib/slugify.ts` on write (`categories`, `category_groups`, `ingredient_forms`, `ingredient_form_groups`, `workspaces`), so the M4.3 rule "derived, never written down beside it" is about DESIGN.md's tables, not the database; an `ingredients.slug` column follows the existing shape rather than breaking it.

- **Column on every ingredient**, not compendium-only: one write path, one rule, and the workspace side is free to route on it later. Uniqueness is per scope: `(slug) WHERE workspace_id IS NULL AND deleted_at IS NULL` for the compendium and `(workspace_id, slug) WHERE deleted_at IS NULL` for workspace entries, both partial per rule 4.
- **Derived from name and form, always**: `slugify(`${name} ${form ?? ''}`)`, so `Cat's Claw` / `bark` reads `cats-claw-bark` and an entry with no form (`form` is nullable) reads `cats-claw`. The form is appended for every entry, not only on collision, so the shape is deterministic and never depends on insertion order. Two compendium entries can still collide (same label and form, different formal names, which identity allows), and that is answered the way every unique index is: the write refuses with an explaining error and the admin distinguishes the label.
- **The slug follows a rename, and the old one redirects for a window.** `name` is freely relabellable; on relabel the service recomputes the slug and records the retired one. A request for a retired slug at the public route answers a redirect to the current one until the retirement expires, then 404.
  - **Status 308, not 307.** A permanent redirect is what tells a crawler to move its index entry to the new URL; a temporary one tells it the old URL is still canonical and to keep it. "Temporary" is the lifetime of the redirect row, not the HTTP status. Next's `permanentRedirect()` in the page answers 308.
  - **Expiry is midnight UTC**, whatever time of day the rename happened: `expires_at` is a generated column, the UTC calendar date of `retired_at` plus 180 days, at 00:00 UTC. 180 days is enough for every major crawler to revisit and re-index; the constant is named and tested. Sitemaps carry only current slugs, so a crawler is also told the new URL directly.
- **A retired slug is reserved for its whole window.** Nothing else may become that slug until `expires_at`, so a 308 can never come to point at a different ingredient while any crawler or cache that saw it is still inside the window. The one exception is the ingredient it belonged to: reclaiming your own retired slug is allowed at once, because the redirect would only ever have pointed at you, and the retirement row is removed.
  - **What a cached 308 can still do after the window.** Vercel's CDN copy is bounded by the page's revalidate (an hour under M8.6) and the `compendium` tag, so it is gone long before the window ends. A browser copy is the residual: the build must show that the redirect carries no `max-age`, `Expires` or `Last-Modified` for a private cache to hold it against, and a test pins those headers absent. If the build shows otherwise, the response gets an explicit `max-age` bounded to the time left in the window, set from the proxy (the only place that sets response headers today), and that is verified before it is relied on.
- **A reassignment inside the window is recorded, not refused.** When an admin renames ingredient B to a name whose slug is currently retired from A, B's name changes at once and B's slug does not: the wanted slug is stored as `pending_slug` on B with `pending_slug_effective_at` equal to the retirement's `expires_at`, and the mutation's response tells the admin the date it takes effect. Rules:
  - **One pending claim per slug.** A partial unique index on `(pending_slug) WHERE workspace_id IS NULL AND pending_slug IS NOT NULL AND deleted_at IS NULL` (and the workspace-scoped twin) refuses a second ingredient claiming the same retired slug; the second admin is told who holds the claim and when it lands. An ingredient has at most one pending slug because it is a column.
  - **A pending slug must not be a current slug either**, checked in the service at record time.
  - **On the effective date** B's slug becomes the pending one and B's previous slug is retired in turn, starting its own 180-day window and redirect. The current slug is therefore an expression, `coalesce(pending when due, slug)`, read through one repository finder so no call site forgets the pending half.
- **Nothing runs on a schedule.** The switch is a date comparison at read time, so it is exact at midnight UTC without a job: the redirect stops, the reservation lifts, and B's pending slug is current, all by predicate. Vercel Queues are for event delivery, not a date, and a Hobby cron (DESIGN.md's recorded plan) fires once a day within an hour of its time, which is worse than a comparison. What is left to do by hand is housekeeping: the next slug write in that scope hard-deletes lapsed retirements and materialises any due pending slug into `slug`, stamped as the admin making that write, the same lazy shape as MB.67's provisional-account sweep on the sign-in callback. Until then the expression answers. Cached ISR pages catch up at their hourly revalidate or the next admin mutation's `revalidateTag`, whichever is sooner.
- **Storage: a `retired_ingredient_slugs` table** (`ingredient_id`, `workspace_id`, `slug`, `retired_at`, generated `expires_at`, the audit spread, its `set_updated_at` trigger line). A table rather than an array column on `ingredients`, because the lookup is by slug (an index on a text column, not a GIN over arrays) and because each redirect has its own lifetime. A soft-deleted ingredient's retirements answer nothing (rule 4: the redirect finder joins through the ingredient and the repository filters it).
- **Uniqueness of the current slug** is a partial unique index on `ingredients`: `(slug) WHERE workspace_id IS NULL AND deleted_at IS NULL` for the compendium and `(workspace_id, slug) WHERE deleted_at IS NULL` for workspace entries. Uniqueness against live retirements is the service's, because a partial index cannot carry a time predicate, and is asserted by a test that inserts around it.
- **Migration shape**: expand/contract. Add `slug`, `pending_slug` and `pending_slug_effective_at` nullable, backfill `slug` through a script that uses `slugify.ts`, then `SET NOT NULL` on `slug` alone with a destructive-DDL ack sidecar (rule 10). If it lands before the compendium holds production rows, the backfill is the seed. The retirements table is a second, inert `CREATE TABLE` in the same table task.
- Lands as table tasks before the behaviour task (Conventions: "a table task, then a behaviour task"). `tests/guards/slug-rule.test.ts` already guards that no second slug implementation appears.

### C. Services and GraphQL

8. **Service**: M5.2's read path takes **no session at all**, which is what §7's own sketch already shows (`unstable_cache(() => compendiumService.listGlobal(), …)`): the cache wrapping the read cannot see a session, so the read cannot take one. The compendium finder is unscoped (`workspace_id IS NULL`), no `Membership` proof is involved, and there is no identity to model on a public read. The write path keeps its admin check unchanged.
   - **Not Better Auth's `anonymous` plugin.** It exists for try-before-sign-up flows: it mints a `users` row and a session cookie for every visitor so their work can later be linked to a real account. Here it would be a write on every visit and every crawl (a bot-filled `users` table), a cookie that makes the static pages dynamic again, and a third identity bootstrap outside `withAudit` for the sign-up hook, the provisional sweep and `canCreateWorkspace` to reason about. The mb.74 plugin review lists it under "Never here" as a sign-in scheme that does not fit OAuth-only, and that holds for this change. A signed-out reader is `null` from `getSession()`, which `src/app/page.tsx` already handles, and the compendium read does not ask.
   - **Noted for v2**: try-before-sign-up is a real feature the plugin exists for (a visitor drafting a spell against the public compendium, then keeping it by accepting an invitation). The re-scope PR adds it to DESIGN.md §13's deferred list and moves it in the mb.74 record from "Never here" to "v2, if the feature is wanted", so the decision is recorded where it was made.
9. **GraphQL** (decided): the compendium list and detail queries (M8.5) and `ingredientFormValues` carry no `signedIn` scope. Rule 1 says every browser-initiated read without a navigation goes through `/api/graphql`, and M8.10's debounced live search is exactly that. Every other query and every mutation keeps its scope, and a test asserts that a null session is refused on each workspace read. graphql-armor (M3.3) is the only protection on that endpoint; the "V Public" WAF item in `backlog.md` stops being notional and is tied to this change. `me` stays signed-in (M3.10) and is what the client island below asks.

### D. Rendering so a crawler sees the content

10. **Server-rendered HTML with the entries in it.** M8.18 already says "server-rendered with the cached data". The list, every card, and every card's link to its detail page must be in the initial HTML, not fetched after hydration. The IngredientSearch results for the unfiltered view are the server's; only a filtered/searched view may come from GraphQL.
11. **Crawlable pagination.** Rule 8's cursor helper is fine for crawlers as long as the next page is an `<a href="/compendium?after=…">`, not a button. The sitemap (below) is the primary discovery path for entries, so pagination form is secondary. Filtered views (`?q=`, `?categories=`) carry `<link rel="canonical" href="/compendium">` and `noindex` so 63 categories' worth of combinations do not become a crawl trap.
12. **Static shell, client island** (decided): both public pages render with no request-time API (no `cookies()`, no `headers()`), so they are ISR pages tagged `compendium` and M8.7's `revalidateTag` already refreshes them on an admin edit. The "Add to my ingredients" affordance and the signed-in chrome are a client island that asks `/api/graphql` `me` after hydration and renders nothing for a signed-out visitor but a sign-in link. §7 deliberately stays on `unstable_cache` without `cacheComponents`; plain ISR does this without the directive. The in-app `/ingredients/[id]` route stays dynamic, since it reads the session for `AppShell`. The `RETURN_PATH_HEADER` the proxy sets is a request header, so it does not make the page dynamic unless the page reads it; the public pages must not.

### E. The search-engine surface (new tasks)

13. **`src/app/robots.ts`**: allow `/compendium` and `/compendium/*`, disallow everything else, point at the sitemap. Under `VERCEL_ENV !== 'production'` it disallows all, **and** the proxy sets `X-Robots-Tag: noindex` on every response off production, because `staging.sorrelandsalt.com` is a public URL that will otherwise be indexed as a duplicate. (Vercel deployment protection on the preview alias could not be verified: the CLI is not installed and the MCP server is unauthorised. The header does not depend on it.)
14. **`src/app/sitemap.ts`**: `/compendium` plus one `/compendium/ingredients/<slug>` per entry, read through the cached compendium so it costs no Postgres. Under 50,000 entries, one file. `lastModified` from `updated_at`.
15. **`generateMetadata`** on both pages: title (`<name> — <form> · Sorrel & Salt`), description from the entry's description or correspondences, `alternates.canonical` (the public URL, on the in-app route too), Open Graph fields (image from M11.16). Detail pages of two entries sharing a label are distinguished in the title by the formal name, as M8.14's card line already does.
16. **Structured data**: optional. There is no schema.org type for a magical ingredient; a plain `WebPage`/`BreadcrumbList` is the honest ceiling. Not needed for indexing.
17. **Canonical host**: production is `sorrelandsalt.com` (deploy.yml, auth.ts). Any `www` alias must 308 to it; check the Vercel domain settings when the CLI is available.
18. **404 and 308 as real statuses.** An unknown slug returns a real 404 (M11.10 owns the page), so a deleted entry drops out of the index rather than being indexed as a soft 404; a retired slug inside its window answers `permanentRedirect()` to the current one (B2). Soft-deleted entries already vanish from finders (rule 4).
19. **Public chrome**: a signed-out visitor on `/compendium` needs a header with the site name, Sign in, and nothing workspace-shaped. Either `AppShell` grows a signed-out mode or the compendium pages use the same minimal frame as `/`. The M8.18 criterion becomes "Add to my ingredients is present for members, absent for viewers and signed-out visitors, who see a sign-in prompt in its place".
20. **Outside the repo**: Search Console verification and sitemap submission. Content, not code, and the user's own action.

### F. Tests and stories

21. New acceptance story in §10 ("As a visitor, I want to read the compendium and its entries without signing in, so that the site's reference is useful to people who are not in a coven") with a numbered id from the free range, tracked in `tests/acceptance/02-compendium.test.ts` (M8.1).
22. Proxy tests (B5). A service test that a null session reads the compendium and that a null session is refused on every workspace read (the precondition being that the rows exist). A route test that `/compendium/<workspace-ingredient-id>` is 404. A guard test that `robots.ts` disallows everything off production. E2E: `tests/e2e/` signed-out visit to `/compendium` lands on the page, not `/sign-in?next=`; axe scan of both pages signed out (M11.8 covers signed-in).

## Rough size

| Piece                                                                                | Where  | Hours                            |
| ------------------------------------------------------------------------------------ | ------ | -------------------------------- |
| Docs and task re-scope, Asana                                                        | A      | 2                                |
| `ingredients.slug` and `retired_ingredient_slugs` table tasks, backfill, ack sidecar | B2     | 2                                |
| Slug on rename, retirement, 308 lookup, reservation, pending claim, lapse, tests     | B2     | 3–4 (inside M5.5, above its 2h)  |
| Proxy, second route, 404, tests                                                      | B      | 2                                |
| Service null-session, GraphQL scope                                                  | C      | 1 (inside M5.2 and M8.5)         |
| Static shell + client island                                                         | D12    | 2–3 (inside M8.18, above its 2h) |
| robots, sitemap, noindex off production                                              | E13–14 | 2                                |
| Metadata on both pages                                                               | E15    | 1                                |
| Public chrome                                                                        | E19    | 1–2                              |
| Acceptance story, e2e                                                                | F      | 1                                |

About 18–20 hours across Waves 12 and 15, of which roughly 8 are new `MB` tasks (slug and retirement tables, robots and sitemap, public chrome, visitor story) and the rest are criteria changes to tasks not yet started.

## Files that change

- `claude-docs/DESIGN.md` §5 (slug column), §7, §9, §10, §14; `claude-docs/TASKS.md` M5.2, M8.5, M8.18, M8.19, new MB entries; `CLAUDE.md` domain invariants and the slug convention (an ingredient slug follows a rename, the old one redirects for a window and stays reserved for it); `claude-docs/auth.md` route protection; `claude-docs/design-decisions/mb.57-post-sign-in-landing.md` (public-page claim); `claude-docs/backlog.md` "V Public" (WAF becomes tied to this)
- `src/proxy.ts`, `tests/proxy.test.ts`
- `src/db/schema/ingredients.ts`, a new `src/db/schema/retired-ingredient-slugs.ts`, and a migration with its ack sidecar
- New: `src/app/robots.ts`, `src/app/sitemap.ts`, `src/app/compendium/page.tsx`, `src/app/compendium/ingredients/[slug]/page.tsx`, `src/app/ingredients/[id]/page.tsx` (when Wave 12 lands)
- M5.2 service signature, M8.5 scopes, M8.18/M8.19 pages

## Verification

- `npm run test:coverage` green with the proxy public/lookalike lists flipped.
- `curl -I` a signed-out `/compendium` and `/compendium/<id>` on a local prod build: 200, HTML contains the entry names and links; `/coven/...` still 307s; `/compendium/<workspace-id>`: 404.
- `curl /robots.txt` and `/sitemap.xml`: 200, every current compendium slug present, no retired one.
- Relabel an entry as admin, then `curl -I` the old slug: 308 to the new one, with no `max-age`, `Expires` or `Last-Modified`; with `retired_at` aged past the window in the test database: 404, and `expires_at` reads 00:00 UTC on the 180th day whatever the hour of the rename.
- Rename a second entry to the retired name inside the window: its name changes, its slug does not, the response names the effective date; a third entry claiming the same slug is refused and told who holds it. Advance the clock past `expires_at`: the public route serves the second entry at that slug, the first entry's old slug no longer redirects, and the sitemap lists the new one. Rename the first entry back to its own retired name inside the window: accepted at once.
- With `VERCEL_ENV=preview`: robots disallows all and every response carries `X-Robots-Tag: noindex`.
- Lighthouse SEO audit on the two pages signed out.
- `make test-stories` lists the new visitor story.
