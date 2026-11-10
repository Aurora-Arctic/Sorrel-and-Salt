# Coven Facts

`src/components/CovenFacts/` — a context provider that carries the open coven's name and the viewer's role down to the skeletons drawn inside the coven. It draws nothing, so it has no story ([`workshop.md`](../workshop.md)).

## What it carries

`CovenFacts` (`types.ts`): `slug`, `name`, `demo`, `role` and `access` (`CovenHomeAccess`, from [`coven-home.md`](coven-home.md)). They are the layout's own coven and the viewer's membership in it.

## Contracts

- **The coven layout supplies it.** `src/app/(shell)/coven/[slug]/layout.tsx` wraps its children in `CovenFactsProvider` with the facts it has already read, so a skeleton, which runs in the browser and cannot read the access statements, can use the real words.
- **`useCovenFactsOfDestination()` returns the facts only when the move ends in the same coven.** It reads the destination from `useNavigationState().href`, drops the query and fragment, takes the coven slug with `covenSlugOf` (`src/lib/coven-path.ts`) and compares it with `facts.slug`. A move to another coven, or to a page outside any coven, returns `null`, because the layout's facts are about its own coven alone. A caller handles `null` by drawing the skeleton without a name and with a steward's access.
- **It carries no workspace data beyond the name and the viewer's role** in the coven they are already inside.

## Tests

None yet. No test file under `tests/` covers it.
