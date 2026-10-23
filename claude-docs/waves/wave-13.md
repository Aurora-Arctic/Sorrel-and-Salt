# Wave 13 — Grimoire

M10's tables landed in Wave 3 and its visibility rule in Wave 5, so this is the service and UI half. **M10.6's visibility rules block M10.9, M10.11 and M10.13**, since every list, search and page filters in SQL under rule 7, and M10.7 and M10.8, the pure comparison functions, block M10.17's comparison panel. **MB.8's Zod schema precedes M10.10**, which needs it; M4.5 covered ingredient and category only. **MB.6's recipe view precedes M10.22**, which had no page to attach print styles to. **MB.123 closes the wave**, M5.4's design review of the grimoire once its print layout lands. MW.13 is retired (MB.31).

**M13.1 follows M10.1** (added 2026-10-16): the spell steps and workings plan makes a recipe one ordered list of steps, an instruction, an ingredient or both, in the existing table renamed `spell_steps`; it lands before M10.5 so every service and UI task builds on the step row rather than retrofitting it.

**The rest of the plan follows its prerequisites** (added 2026-10-16). M13.2, the rule that a step's unit converts to the stock row's, follows M10.10's save path. M13.3, step text in the builder, follows M10.16's reorder. M13.4 to M13.8, the workings tables, service, GraphQL and the recipe page's dialog and section, follow M10.22, since they need MB.6's recipe page and Wave 11's stock writers (M9.3) and `unitConvert` (M9.5). M13.9, the contract dropping the `spell_ingredients` view and the old columns, closes the wave after MB.123, once M13.1 has reached production.

**M13.12 and M13.13 follow M13.8 and precede MB.123** (minted 2026-10-23, the owner's call): the Preview pane opens from the recipe page MB.6 builds (M13.12), and the screen wake lock lives in that pane (M13.13). They sit before the grimoire design review so it signs off the pane.
