# MB.251 — The planets are Celestial Bodies wherever a person reads them

**Status:** decided · **Date:** 2026-10-12 (the owner's call)

**Decided:** the admin-curated vocabulary that holds the Sun and the Moon, Mercury through Pluto, Earth, Chiron, Ceres, Pallas, Juno, Vesta, Lilith and the two lunar nodes is called **Celestial Bodies** on every screen. Its code, GraphQL and database names keep `planets` for now, a recorded and temporary divergence that MB.252 to MB.254 end. The scoping plan is [`mb.251-plan.md`](mb.251-plan.md).

## Why

Nineteen values live in this vocabulary and most of them are not planets. DESIGN.md §5 already called them "bodies". The name "Planets" was therefore wrong on the screen a person reads, and the owner asked for it to change.

The old name is also in production (release 0.6.0), in the table, a list column, a link column, the GraphQL schema and the admin URL. Renaming all of that in one task would mean a database change and a code change that cannot ship in the same deploy (a write made by the old code after the migration would land only in the old column). So the rename is cut in two: what a person reads changes first, in MB.251, and the names underneath follow as scheduled tasks.

## What a person now reads

- **The Astrology section.** The tab, the page title, the filter, the empty and no-match text, every dialog title and the buttons: Celestial Bodies, Add Celestial Body, Save Celestial Body, Delete Celestial Body. The section's description says "celestial bodies". Most of this is the one `planet` entry in `src/components/GroupedValueList/kinds.ts`.
- **The ingredient form.** The list field and each variant's read "Celestial Bodies", the entry box "Celestial Body" and the placeholder "Add a body". The variant and substitute summaries carry the same labels.
- **The refusals shown in those forms**, such as "No such celestial body".

## The URL changes, with no redirect

`/admin/planets` becomes `/admin/celestial-bodies`. The old path is a 404. The page is admin-only, so there are no search-engine rankings or public links to keep, and CLAUDE.md asks for no hooks beyond the design.

## The divergence, and who ends it

These keep the word `planets` until MB.253 and MB.254, as `workspaces` and `/coven/` do (§5):

- the `planets` table, `ingredients.planets`, `ingredient_variants.planets` and `reference_links.planet_id`
- the GraphQL names `Planet`, `PlanetInput`, `createPlanet`, `updatePlanet`, `deletePlanet`, `planets`, `planetSuggestions`, and the `planets` field on ingredients, variants and their inputs
- the code that uses them, including `kind: 'planet'`, `usePlanetSuggestions` and `PLANETS`

| Task   | What it does                                                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MB.252 | Expand: renames the `planets` table to `celestial_bodies`, with a `planets` view over it for the live code, and adds the new list and link columns beside the old ones, filled from them. Nothing reads them yet. |
| MB.253 | Switch: the code and GraphQL names move to `CelestialBody` and friends, and every reader and writer moves to the new columns.                                                                                     |
| MB.254 | Contract: drops the old columns and the `planets` view, and removes the divergence notes from DESIGN.md and CLAUDE.md.                                                                                            |

**Do not "fix" the divergence early.** A session that finds `planets` in code or GraphQL while the screen says Celestial Bodies is looking at this decision, not a mistake. Each of the three tasks has its own migration or deploy order that the rename depends on.
