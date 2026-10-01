# MB.80 — The compendium is public and search-indexable

**Decided:** the compendium list and every compendium entry are public and search-indexable, as DESIGN.md §1 and §9 specify, while `canCreateWorkspace`, memberships, a workspace's ingredients and its grimoire stay exactly as gated. The approved plan, with the facts read and the questions asked on the way, is [`mb.80-plan.md`](mb.80-plan.md).

## The shape

- **Two URLs, one page** (DESIGN.md §9's route table): the public, canonical `/compendium/ingredients/[slug]`, and the signed-in `/ingredients/[id]`, which reaches workspace entries too and shows a compendium entry through the public page's component inside `AppShell`. No redirect between them: the in-app route is gated, so a crawler never reaches it. The in-app route keeps the id, not a slug, because outside `/coven/` a slug alone cannot say which workspace's "rosemary" is meant. A workspace entry's slug or id at the public route answers 404, the same answer `/coven/[slug]` gives a non-member, because the existence of a workspace entry is private.
- **The read takes no session.** §7's own cache sketch wraps `compendiumService.listGlobal()` in `unstable_cache`, which cannot see a session, so the read never could. The three compendium queries (`M8.5`'s list and detail, `ingredientFormValues`) carry no `signedIn` scope; every other query and every mutation keeps its scope. graphql-armor is the only bound on that endpoint, which makes `backlog.md`'s WAF item real rather than notional.
- **Static shell, client island.** Both public pages read no request-time API, so they are ISR pages under the `compendium` tag, and M8.7's `revalidateTag` already refreshes their HTML on an admin edit. The signed-in affordances — the shell's chrome and "Add to my ingredients" — are one client island that asks `me` after hydration and shows a sign-in link to a null session. §7 stays on `unstable_cache` without `cacheComponents`; plain ISR does this without the directive.
- **Route protection.** `PUBLIC_ROUTES` gains `/compendium`, `/compendium/*`, `/robots.txt` and `/sitemap.xml` (MB.83). `tests/proxy.test.ts` moves `/compendium` from the lookalike list to the public list.
- **The search-engine surface** (MB.84): `robots.ts` and `sitemap.ts` as Next metadata routes, `generateMetadata` with a canonical on every compendium page, filtered list views `noindex` with canonical `/compendium` so category combinations are not a crawl trap, a real 404 for an unknown slug, and off production both `robots` disallowing all and an `X-Robots-Tag: noindex` header from the proxy, because `staging.sorrelandsalt.com` is a public URL that would otherwise be indexed as a duplicate. Search Console verification and sitemap submission are the owner's action, not code.

## The slug

Ingredients had no slug and are keyed by UUID, and a display label identifies nothing: identity is the formal name and the form (DESIGN.md §5). So:

- **`slugify` of the label, the form and the formal name where one is declared, always** — `ingredientSlug` in `src/lib/slugify.ts`, and nowhere else — stored on every ingredient the way `categories`, `ingredient_forms` and `workspaces` store theirs. `Cat's Claw` / `bark` / _Uncaria tomentosa_ is `cats-claw-bark-uncaria-tomentosa`; an entry declaring no formal name, `graveyard-dirt-earth`. Every declared part goes in for every entry rather than only on a clash, so the shape is deterministic rather than insertion-ordered. What the slug index still refuses is a pair `slugify` folds together and `canonical_key` does not — formal names differing only in punctuation or accents, or words shifting between label and formal name — with an explaining error, as every unique index here is.
- **It follows its inputs** (DESIGN.md §5's `slug`). `name` is freely relabellable because identity moved off it, and the slug moves with it, as it does with the form and the formal name. The old slug goes to `retired_ingredient_slugs` and answers a **308** to the current one — permanent, because a temporary status tells a crawler the old URL is still canonical — until `expires_at`, a generated column: the UTC date of the retirement plus 180 days, at 00:00 UTC whatever the hour of the rename. Sitemaps carry only current slugs.
- **A retired slug is reserved for its whole window.** Nothing else may become it, so a 308 can never come to point at a different ingredient while anything that saw it is inside the window; the ingredient it belonged to may reclaim it at once. A relabel whose slug is reserved changes the name now and records the slug as a **pending claim** — `pending_slug` and `pending_slug_effective_at` on the claimant, one claim per slug by partial unique index, refused otherwise with who holds it and when it lands — that becomes current at the reservation's expiry, retiring the claimant's previous slug in turn.
- **Nothing runs on a schedule.** The redirect, the reservation and the claim all switch by a date comparison at read time, exact at midnight UTC. Vercel Queues deliver events, not dates, and a Hobby cron fires once a day within an hour of its time; both are worse than a predicate. Housekeeping — deleting lapsed retirements, materialising a due claim — rides on the next slug write in that scope, stamped as the admin making it, the lazy shape MB.67's provisional-account sweep already uses.
- **A browser's cached 308** is the residual after the window. Vercel's CDN copy is bounded by the page's revalidate and the tag. MB.84 pins by test that the redirect carries no `max-age`, `Expires` or `Last-Modified`; if the build shows a browser could still hold it, the fallback is an explicit `max-age` bounded to the window's remaining time, set from the proxy.

MB.81 lands the columns and the table; MB.82 the behaviour. Table first, behaviour second, per CLAUDE.md's rule.

**Superseded in part by MB.82 (2026-09-30):** a retired slug is no longer reserved, and there are no pending claims; DESIGN.md §5's `retired_ingredient_slugs` states the rule that replaced them. Once the formal name was in the slug, the entry wanting a retired one was most often the correct entry being added — a create the claims could not serve. The argument, and what the change costs, is [`mb.82-slug-takeover.md`](mb.82-slug-takeover.md).

**Superseded in part by MB.81 (2026-09-28):** the slug was `slugify(name + ' ' + form)`, a same-label-and-form pair refused and the admin told to distinguish the label. The `standard` seed's two _Uncaria_ barks are exactly that pair, and relabelling one to make room for its address was the address dictating the data. The formal name is what tells such entries apart everywhere else — the identity key, search, MB.84's page title — so it is in the slug too, and MB.82 recomputes the slug when any of its three inputs changes. The slug index is then reachable only where `slugify` folds two different identities together, which is the case its tests exercise.

## What it rules out

- **Better Auth's `anonymous` plugin.** It mints a `users` row and a session cookie per visitor, for the try-before-sign-up of DESIGN.md §13. A public read needs no identity; the plugin would write on every visit and every crawl, put a cookie on pages that are static without one, and add a third identity bootstrap outside `withAudit`. A signed-out reader is `null` from `getSession()`, as `/` already handles. The plugin moves in the mb.74 record from "never" to v2, as try-before-sign-up (DESIGN.md §13), because the feature it exists for is real even though this change does not need it.
- **A slug that stays put on relabel.** Considered and rejected: a permanent address that does not follow the name is a URL that lies, and a redirect with a window costs less than that.
- **Slug-routed workspace entries.** `/coven/[slug]/ingredients/[slug]` would be the shape; not this change.
- **Structured data** beyond `WebPage`. There is no schema.org type for a magical ingredient, and none is needed to be indexed.

## v2: suggesting a change to an entry

The public entry page is where a reader notices a correspondence is wrong, so §13's suggestion queue gains a second subject: a proposed change to an existing entry, beside a proposed new one. DESIGN.md §13, "Compendium and category suggestions", specifies it — offered on the entry page to a signed-in account, accepted by an admin as an ordinary compendium write — and v1 builds only the entry page's shape. Asking a visitor to sign in before suggesting is the one thing the public compendium asks of anyone, and it is what keeps the queue attributable.

## Tasks

| Task  | Wave | What                                                                                             |
| ----- | ---- | ------------------------------------------------------------------------------------------------ |
| MB.80 | 7    | This record, the plan, and the doc and criteria changes                                          |
| MB.81 | 8    | `ingredients.slug`, the pending-slug columns and `retired_ingredient_slugs`, after M4.8          |
| MB.82 | 8    | The slug rule: set on create, follow a rename, retire with a 308, reserve and claim, after M5.2  |
| MB.83 | 12   | Proxy entries, the public frame and the signed-in island, before M8.18                           |
| MB.84 | 12   | robots, sitemap, page metadata and noindex off production, after M8.19                           |
| MB.85 | 12   | Story 63 — a visitor reads the compendium without signing in — its acceptance test and e2e, last |

M5.2, M5.5, M8.5, M8.6, M8.18 and M8.19 were amended in place rather than re-minted; their entries in `TASKS.md` say what changed.
