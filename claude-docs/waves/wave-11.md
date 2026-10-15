# Wave 11 — Ingredient services

M9's data layer moves ahead of M8's UI, once M4's ingredients and M6's workspaces exist. The order is **M9.1 · M8.3 · M8.3a · M11.17 · M9.5 · MB.9 · M9.3 · M9.4 · M11.18**, and each step has a reason:

- **M9.1 opens the wave** as its red scaffold (a set of acceptance tests written to fail first). M8.1 is retired: the three story tests it would have written were already written green by M8.2, M8.5 and M5.10.
- **M8.3 and M8.3a need no stock**, so they sit here only to keep the identity work together. M8.3a promotes a folk name to the display name, which is safe because of the identity rule MB.215 and MB.223 settled: an ingredient's identity is `identity_key` (its formal name alone), and that column is already in the schema. The old text named `canonical_key`, which MB.223 dropped. The order is grouping, not dependency.
- **M11.17 comes before M9.5**, because M9.5 converts between units and M11.17 settles which units exist (it renames `fl_oz` to `fl_oz_uk` and adds `fl_oz_us`).
- **M9.5 comes before M9.3**, because M9.3's `addStock` writes the default threshold for the ingredient's dimension, converted into the row's unit, and that conversion is M9.5's.
- **MB.9 comes before M9.4**, because M9.4's `InventoryItem.ingredient` resolver batches its lookups through the `ingredientsById` loader (a loader gathers many small lookups made in one request into a single query). Only M9.4 assumed the loader. The old text said M8.5 did too, but M8.5 batched categories and folk names and listed `ingredientsById` out of scope.

Of Wave 12's tasks, only M8.14 needs stock data from this wave. The old text also named M8.13 and M8.18: M8.13's entry excludes stock, and M8.18 is a public static page whose add action reaches M9.12.

**M8.4 is retired** (M8.5): under rule 8 the browser never holds the whole list, so the compendium query filters in SQL, and the search UI that refetches it is M8.10 through M8.12 (M8.9 is the modals scaffold), not a client-side `filterIngredients()`. MW.11 is retired (MB.31).

**M11.18 closes the wave** because it touches only the e2e harness and the specs' serial mode, which nothing here depends on; it is the measured plan in [`design-decisions/m11.18-plan.md`](../design-decisions/m11.18-plan.md) for a suite that finishes in the time its work needs rather than the time its longest file needs.
