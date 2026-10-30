## The compendium cache (M8.6)

The curated reads every viewer sees alike are held in Next's data cache under
one tag, `compendium`, so the most-read data on the site does not reach
Postgres on every page (DESIGN.md §7, layer 3). An admin write expires the tag
(M8.7, "Expiring the tag" below), and anything workspace-scoped is never held (CLAUDE.md rule 6).

### The wrapper

`src/lib/compendium-cache.ts` is the one file that imports `next/cache`.
It exports `COMPENDIUM_TAG`, the tag's one spelling, and
`cachedCompendiumRead(key, read)`, which wraps `read` in `unstable_cache`
under that tag with an hour's `revalidate`. The entry is keyed by `key` and
the arguments the wrapped read is called with, JSON-stringified, which is how
`unstable_cache` keys an invocation: each filter and page request is an entry
of its own, and MB.105's count, called with the same filter, is an entry
beside its page.

It lives in `src/lib/` rather than in a module because two modules use it,
and it is called in the services, not the pages or resolvers, because both
transports end there (CLAUDE.md rule 1): a server component and
`/api/graphql` read through the same cached function. Each service parses its
filter first and caches the repository call, so what is keyed is the parsed
filter, and a malformed one is refused before the cache is consulted.

**The value is stored as superjson.** `unstable_cache` stores what it is given
with `JSON.stringify` and answers a hit with `JSON.parse`, so a hit would
give a row's `createdAt` back as a string where the miss gave a `Date`. The
wrapper stores `superjson.stringify` of the result and parses it on every
read, hit or miss, so both answer the same types.

### The deployment key part (MB.274)

Every key `cachedCompendiumRead` builds ends in the deployment's own id, so a
new deployment reads under fresh keys and its first read of each entry goes
to Postgres. The seed (`npm run db:seed`) runs outside Next and cannot expire
the tag, and Vercel keeps the data cache from one deployment to the next, so
without the part a seeded change stayed hidden for up to an hour.

The part is `VERCEL_DEPLOYMENT_ID`, or `VERCEL_GIT_COMMIT_SHA` when that is
empty (the project's "Enable access to System Environment Variables" setting
is off). Vercel's system environment variables page lists both as available
at build and at runtime, so nothing is stamped in through `next.config.ts`.
With neither set (local runs, tests) there is no part, and the keys are the
bare `key`. The tag is unchanged, so an admin's write still expires every
entry under the current deployment.

**Reseeding locally under a running server still needs a restart.** The key
part is fixed there, so the cache keeps serving what it held until the hour
runs out or an admin saves a compendium edit.

### What is cached

Thirteen reads, every one taking no session and filtering to the compendium
tier or a curated vocabulary, which are public (MB.80): the list and its count
of each of six things, the compendium's facet counts, how many entries
each search filter value would list (M12.3), and the public page's read of one
entry by its address (M8.19), and every current slug for the sitemap and `llms.txt` (MB.84):

| Service file                                                   | Reads                                                                                                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ingredients/services/compendium.ts`                           | `listCompendium`, `countCompendium`, and `readCompendiumEntry`, under the key `compendium-entry`                                                                                             |
| `ingredients/services/compendium-slugs.ts`                     | `listCompendiumSlugs`, under the key `compendium-slugs`: slug, name, formal name, description (M12.2, for the `llms.txt` notes; the sitemap ignores it) and `updated_at` of every live entry |
| `ingredients/services/ingredient-facets.ts`                    | `compendiumFacets`, under the key `compendium-facets`                                                                                                                                        |
| `vocabulary/services/categories.ts`                            | `listCategories`, `countCategories`                                                                                                                                                          |
| `vocabulary/services/ingredient-form-values.ts`                | `listIngredientFormValues`, `countIngredientFormValues`                                                                                                                                      |
| `vocabulary/services/astrology.ts`, celestial bodies and signs | `listAstrologyValues`, `countAstrologyValues`                                                                                                                                                |
| `vocabulary/services/deities.ts`                               | `listDeities`, `countDeities`                                                                                                                                                                |

A `no-restricted-imports` path in `.oxlintrc.json` fails any import of
`next/cache` outside the wrapper. This list is the review: adding a call of
`cachedCompendiumRead` adds a row here, saying the read is the same for every
viewer.

Not cached, deliberately:

- **The reads a write decides by.** A delete refused while an entry holds the
  row, a curated spelling checked, a collision named: each reads the
  repository directly, so a write never acts on an hour-old answer.
- **One entry by id** (`getIngredient`), and an entry's children, which
  DataLoader batches per request (rule 9). `getIngredient` also answers a
  coven's own row to its members, so a coven's entry page reads it and
  `ingredientDetailOf` uncached. Only the public page's read of an address is
  held (`readCompendiumEntry` above): it takes a slug and no session, so every
  viewer sees one answer. A slug that names nothing, and a coven entry's slug,
  answer `NotFound`, which is never stored. `resolveCompendiumSlug`, which
  a write decides by, stays uncached.
- **A coven's facet counts** (`workspaceIngredientFacets`, M12.3), which
  count the coven's own entries and the compendium entries it holds, so they
  differ by viewer.
- **The group vocabularies** (category groups, form groups, deity
  traditions), which only the admin pages list, and the suggestion reads,
  which draw on the current coven as well as the compendium.

### The public pages' ISR

A page rendered statically collects the tags of every `unstable_cache` read
it makes into its own ISR entry, so the public compendium pages (M8.18,
M8.19; MB.80), reading through these services, carry `compendium` without
naming it, and one `revalidateTag` refreshes the data and the HTML together.
A page that sets its own `revalidate` takes the lower of its own and the
reads' hour.

### Expiring the tag

`expireCompendium()`, beside the read wrapper, is
`revalidateTag(COMPENDIUM_TAG, { expire: 0 })` (M8.7). Every admin write to
something the cache holds calls it after its `withAudit` resolves, so a
refused or rolled-back write expires nothing, and the admin's next read is
a miss that reads Postgres. `{ expire: 0 }` rather than Next's recommended
`'max'`, which would serve the stale entry while it revalidates, and
`revalidateTag` rather than `updateTag`, which throws outside a Server
Action, as DESIGN.md §7 argues. One tag means one call expires every cached
read, so a write need not know which lists it touched: a form group's rename
reaches the forms list through its group, and a celestial body's rename the
compendium entries that list it.

The writes that call it are every service in the `ingredients` and
`vocabulary` modules gated by `assertSiteAdmin`: the compendium's create,
update and delete; `createReference` and `updateReference` when
`workspaceId` is null, and only then; `promoteFolkName` on a null `workspaceId`; and the create, update and delete of
categories, category groups, forms, form groups, celestial bodies and zodiac signs,
deities and deity traditions. That is 27 services, and an admin's write
reaches only these, since the GraphQL mutations over them are its only path
(CLAUDE.md rule 1).

**The rule is keyed on those two modules, not on every admin mutation.**
Every exported service in `src/modules/ingredients/services/` and
`src/modules/vocabulary/services/` that calls `assertSiteAdmin` calls
`expireCompendium`; `tests/modules/ingredients/services/compendium-expiry.test.ts`
and `tests/e2e/compendium-cache.spec.ts` prove the expiry itself. The identity module's admin writes are outside it by
construction: a user's role, a pause, an admin invitation and a coven-creation
grant touch nothing the cache holds. A guard over every admin mutation would
need a list of those exemptions, which each new identity write would have to
join from its own task. Keying on the modules that own the compendium tier
means only a write to that tier is held to the rule.
`tests/modules/ingredients/services/compendium-expiry.test.ts` shows the
call itself: once, with `{ expire: 0 }`, after the write; not after a
refusal; and not after a coven's reference. `tests/e2e/compendium-cache.spec.ts`
shows Next acting on it: the admin's added entry, and a rename the cache had
been hiding, both appear on the next load.

### In tests

**Vitest never caches.** Next's `unstable_cache` throws outside a request,
finding no incremental cache, and `revalidateTag` throws finding no work
store, and a test is in neither. `vitest.config.mts` aliases `next/cache` to
`tests/support/next-cache.ts`, where `unstable_cache` is a pass-through and
`revalidateTag` a `vi.fn` that records its calls. Every read reaches Postgres
as it would with the cache empty, so a test sees what the database holds,
never what an earlier test left cached, and a write's test can assert the tag
it expired. The alias is test configuration, not a branch in the wrapper,
which runs the same code under test as in production, superjson round trip
included.

A test that needs the cache to hold mocks `next/cache` with
`tests/support/next-data-cache.ts`, an in-memory cache keyed and serialised as
Next's is and emptied by `revalidateTag`, with `clearDataCache()` beside the
test's truncate. `tests/modules/ingredients/services/compendium-cache.test.ts`
and `tests/modules/vocabulary/services/vocabulary-cache.test.ts` change a row
underneath a read and assert the repeat read does not see it until the tag
expires.

**Playwright caches on one server.** A slot's database is reseeded under its
server between spec files, which a cache held across the reseed would not
follow: a spec would read what the last spec file on that slot wrote. So the
slot servers and the configured-providers server set `NEXT_DATA_CACHE=off`,
which `next.config.ts` turns into `cacheMaxMemorySize: 0`; with
`isrFlushToDisk` already off there (claude-docs/testing/e2e.md), every
`unstable_cache` read misses. The cache's code path still runs, so a read
that cannot be stored or parsed still fails there.

One more server keeps it: the compendium-cache server on 8101, over
`sorrel_e2e_cache`, which no spec reseeds, running
`tests/e2e/compendium-cache.spec.ts` alone in the `chromium-compendium-cache`
project. The spec renames an entry underneath the admin's compendium list and
asserts the reload does not show it, and that a filter never read before
does. Then, as an admin adding an entry, it asserts the
next load shows both the entry and the rename.
