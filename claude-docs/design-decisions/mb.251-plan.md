# MB.251 to MB.254 — the approved plan

_Recorded on 2026-10-12 from the plan the owner approved that day, under the rule that a scoping plan sits beside the decision it led to. The plan proposed six tasks. The owner asked why six, and four were minted: the code and GraphQL rename joined the column switch, and the closing doc edit joined the contract._

## Context

The curated astrology vocabulary called "Planets" holds nineteen values: the Sun and the Moon, Mercury through Pluto, Earth, Chiron, Ceres, Pallas, Juno, Vesta, Lilith and the two lunar nodes. Most of them are not planets, and DESIGN.md §5 already calls them "bodies". The owner wants the vocabulary called **Celestial Bodies**.

The name is in production. Release 0.6.0 carries:

- the `planets` table and its `reference_links.planet_id` link column
- the `ingredients.planets` list column (`ingredient_variants.planets` is on `staging` only)
- the GraphQL names `Planet`, `PlanetInput`, `createPlanet`, `updatePlanet`, `deletePlanet`, `planets`, `planetSuggestions`, and the `planets` field on `Ingredient`, `IngredientVariant` and their inputs
- the admin URL `/admin/planets`

## Decisions

| Decision    | Owner's answer                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Depth now   | What a person reads changes first. Code, GraphQL and database names keep `planets` for now, as a recorded, temporary divergence like `workspaces` and `/coven/`. |
| Depth later | Fix it everywhere, down to the database, as scheduled tasks.                                                                                                     |
| Where       | Task entries are minted on `feature/mb.115-design-review-admin`, to merge with MB.115. MB.251 is not started there; the owner pulls it in later.                 |
| Ids         | MB.251 to MB.254. MB.250 belongs to the compendium roster addendum (`feature/mb.250-compendium-roster-addendum`).                                                |
| Waves       | MB.251 in Wave 8, after MB.115. MB.252 to MB.254 at the end of Wave 9.                                                                                           |

## Why four tasks

Each split is forced by a rule rather than chosen for size:

1. **MB.251, the screens.** Copy, the URL and the prose. No schema, no API.
2. **MB.252, expand.** The schema change, and nothing reads it. CLAUDE.md keeps a table task apart from the behaviour that uses it.
3. **MB.253, switch.** Code and GraphQL names move, and every reader and writer moves to the new columns. It cannot share a deploy with MB.252: a write the old code makes after the migration and before the new code is live would land only in the old column. The switch's migration fills again from the old columns, as MB.136's did after MB.135.
4. **MB.254, contract.** Rule 10 makes a drop its own PR, after a release carrying the switch has reached production, as MB.137 followed MB.136.

## MB.251: the rename people see

- **Copy.** The `planet` entry in `src/components/GroupedValueList/kinds.ts` becomes `/admin/celestial-bodies`, Celestial Bodies, Celestial Body, celestial body, celestial bodies. That entry drives the tab, the filter form name, the empty and no-match text, the dialog titles, the Save and Delete buttons and the missing-row notice.
- **The Astrology page description** in `src/components/AdminNav/sections.ts` says "celestial bodies".
- **IngredientForm.** The list field and each variant's field read Celestial Bodies and Celestial Body, with the placeholder "Add a body", as the sign field's is "Add a sign". `values.ts` and `substitute-summary.tsx` carry the same labels. The hint ("The heavenly bodies it answers to: the planets, the Sun and the Moon.") is still true and stays.
- **Route.** `src/app/admin/(astrology)/planets/` and `@action/planets/` move to `celestial-bodies/`, checked by `typedRoutes`. There is no redirect from `/admin/planets`: the page is admin-only, and CLAUDE.md asks for no hooks beyond the design.
- **What stays.** The `kind: 'planet'` key, the `planets` fields and variables, the GraphQL documents, `usePlanetSuggestions`, story export names and `PLANETS`. Comments that state the URL or quote the screen are corrected. Comments that use "planet" as an identifier's name wait for MB.253.
- **Tests.** Role and label queries follow the copy: AdminNav, GroupedValueList, GroupedValueForm, IngredientForm, `tests/app/admin/value-page.test.tsx`, and the e2e specs `admin.spec.ts` and `admin-compendium.spec.ts`.
- **Docs.** A decision record, `mb.251-celestial-bodies.md`, says why and names the divergence and the tasks that end it. DESIGN.md §5, §9 and §14, CLAUDE.md's admin sentence and a Vocabulary line, and the component and database docs that name the screen or the URL are updated.

## MB.252: expand

- Rename `planets` to `celestial_bodies`. A view named `planets` over it keeps the code that is live during the rollout working.
- Add nullable `celestial_bodies text[]` to `ingredients` and `ingredient_variants`, and `celestial_body_id` to `reference_links` with its foreign key and partial unique index. Re-add `reference_links_one_row` with the new column in place of `planet_id`.
- Fill the new columns from the old.
- Scoped first: whether the view serves every statement the live code sends (inserts with `RETURNING`, the seed's upserts), and whether the table's indexes and constraints are renamed now or at the contract. `planets_slug_unique` is named in `src/modules/vocabulary/services/astrology.ts`. This is the first table rename in the repo, so the scoping settles the pattern against `claude-docs/db/expand-contract.md`.
- The RENAME and the CHECK's drop need an `.ack.md` sidecar.

## MB.253: switch

- **TypeScript and GraphQL** become `CelestialBody`, `CelestialBodyInput`, `createCelestialBody`, `updateCelestialBody`, `deleteCelestialBody`, `celestialBodies`, `celestialBodySuggestions`, and `celestialBodies` on ingredients, variants and their inputs.
- **Also renamed:** `kind: 'celestialBody'`, `CuratedField`, `FLAT`, `IN_USE`, `PLANETS`, the about 260 `planets:` entries in the seed shards, the MSW mocks, codegen and the SDL snapshot.
- **Columns.** Every reader and writer uses the new table and columns. The Drizzle schema stops declaring the old columns, and they join `PENDING_DROPS`. The migration fills the new columns again.

## MB.254: contract

- Drop `ingredients.planets`, `ingredient_variants.planets`, `reference_links.planet_id` and the `planets` view, with the sidecar, once a release carrying MB.253 has reached production.
- Remove the divergence notes from DESIGN.md and CLAUDE.md.
