# Wave 11 — Ingredient services

M9's data layer moves ahead of M8's UI, once M4's ingredients and M6's workspaces exist. The order is **M9.1 · M11.23 · M11.10 · M8.3 · M8.3a · M11.17 · M9.5 · MB.9 · M9.3 · M9.4 · M11.19 · M11.20 · M11.21 · M11.22 · M11.18 · M11.24 · M11.25**, and each step has a reason:

- **M9.1 opens the wave** as its red scaffold (a set of acceptance tests written to fail first). M8.1 is retired: the three story tests it would have written were already written green by M8.2, M8.5 and M5.10.
- **M8.3 and M8.3a need no stock**, so they sit here only to keep the identity work together. M8.3a promotes a folk name to the display name, which is safe because of the identity rule MB.215 and MB.223 settled: an ingredient's identity is `identity_key` (its formal name alone), and that column is already in the schema. The old text named `canonical_key`, which MB.223 dropped. The order is grouping, not dependency.
- **M11.17 comes before M9.5**, because M9.5 converts between units and M11.17 settles which units exist (it renames `fl_oz` to `fl_oz_uk` and adds `fl_oz_us`).
- **M9.5 comes before M9.3**, because M9.3's `createStock` writes the default threshold for the ingredient's dimension, converted into the row's unit, and that conversion is M9.5's.
- **MB.9 comes before M9.4**, because M9.4's `InventoryItem.ingredient` resolver batches its lookups through the `ingredientsById` loader (a loader gathers many small lookups made in one request into a single query). Only M9.4 assumed the loader. The old text said M8.5 did too, but M8.5 batched categories and folk names and listed `ingredientsById` out of scope.

Of Wave 12's tasks, only M8.14 needs stock data from this wave. The old text also named M8.13 and M8.18: M8.13's entry excludes stock, and M8.18 is a public static page whose add action reaches M9.12.

**M8.4 is retired** (M8.5): under rule 8 the browser never holds the whole list, so the compendium query filters in SQL, and the search UI that refetches it is M8.10 through M8.12 (M8.9 is the modals scaffold), not a client-side `filterIngredients()`. MW.11 is retired (MB.31).

**M11.19 shows owners each member’s email and whether it is verified** on the coven members table. It reads two `users` columns and needs nothing else in the wave, so it sits just before M11.18, which stays last.

**M11.20 gives admins a curator role to hand out** (minted 2026-10-15 on the owner’s backlog, placed in Wave 11 on their call). It touches only the site role, the admin checks, the admin navigation and the site invitations, and nothing else in the wave depends on it, so it sits before M11.18, which stays last.

**M11.21 puts a toxic flag on ingredients and their forms** (minted 2026-10-15 on the owner’s request, placed in Wave 11 on their call). It adds two columns and the writers behind them, plus the toggles on the admin Compendium editor; it needs nothing else in the wave, so it sits before M11.18, which stays last. The badge on search results and detail pages is Wave 12’s, beside M8.13a.

**M11.22 widens the search filters to lists and adds a toxic setting** (minted 2026-10-15 on the owner's backlog, placed in Wave 11 on their call). It turns the finder's single-value form, deity, zodiac and planet arms into lists, each matching any chosen value, ANDed across kinds, and adds a toxic arm over M11.21's two flags, so it follows M11.21. The counts beside each value and the chips that show them are Wave 12's, M12.3 and M12.4, so they can plug into M8.13's URL state.

**M11.23 narrows pre-commit to the files a commit changes** (minted 2026-10-16 on the owner's request, placed in Wave 11 on their call). It touches only the hook, its config and their docs, and nothing else in the wave depends on it. On 2026-10-16 the owner moved it up to follow M9.1, so every later task in the wave commits through the faster hook.

**M11.10 builds the error boundaries and the styled 404 and 500 pages** (moved from Wave 15 to follow M11.23 on the owner's call, 2026-10-16). The site still answers an unknown URL with Next's default 404, and the 403 page (`src/app/(shell)/forbidden.tsx` and its `NotAuthorized` body) is the pattern to follow. Moving it means it now lands before two things it used to follow in Wave 15: M11.16's illustrations, and the support form, which the 500 page links through a Report This button; MB.176 held that link until M15.1 folded it in (2026-10-31), and M15.29 adds it. Either can be added to the pages when it lands.

**M11.18 closes the wave** because it touches only the e2e harness and the specs' serial mode, which nothing here depends on; it is the measured plan in [`design-decisions/m11.18-plan.md`](../design-decisions/m11.18-plan.md) for a suite that finishes in the time its work needs rather than the time its longest file needs.

**M11.24 moves the `vitest` job off Blacksmith and back to GitHub's free runner** (minted 2026-10-16 on the owner's request, placed in Wave 11 on their call). The job had been the one metered leg of the gate since MB.96, and `ci/runner-budget.md` put it at or over Blacksmith's shared free tier at the current run rate. It was minted once every other task in the wave had landed, so it sits last, after M11.18; it touches only CI and its docs, and it also looks at where the Vitest run's time goes on the smaller runner and applies what fits.

**M11.25 moves the component tests from jsdom to happy-dom** (decided 2026-10-16 by the owner on M11.24's measurement, placed in Wave 11 last, after M11.24). The `dom` project took about 60% of a Vitest run's CPU, and happy-dom cut its wall time by 39% once four tests' reliance on jsdom's gaps was put right; it touches only that project's environment, its setup and those tests, and nothing else in the wave depends on it.
