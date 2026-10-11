## The access boundary

Resolvers, pages and components reach a service and nothing below it
(CLAUDE.md rule 1). Two mechanisms enforce that, one for each direction a
shortcut could take:

- **Nothing above services imports the database layer.** `.oxlintrc.json`'s
  override for `src/graphql/**`, `src/app/**` and `src/components/**` bans a
  runtime import of anything under `src/db`: the repository and the client,
  and also `audit.ts`, the schema, the seed and `bootstrap.ts`. A resolver
  that needs an enum's values gets them from a service. `import type` stays
  legal, since that is how a resolver names a row type (DESIGN.md §7), and it
  can reach nothing. The client stays banned even as a type, under rule 2's
  own group. `src/lib` is outside the override because `lib/auth.ts` hands
  Better Auth the schema tables. The override restates the four top-level bans,
  because an override replaces the rule rather than merging with it
  ([`db/query-building.md`](../db/query-building.md), "Where queries may be
  built").
- **No client component imports a service.** Every file under
  `src/modules/*/services` opens with `import 'server-only'`. Next resolves that marker
  to a build error in any client bundle that reaches it, whether directly or
  through a `lib` module in between, and wherever the `'use client'` file
  lives. Lint cannot do this, because it scopes a rule by path and a client
  component is marked by a directive, not by its folder. The package is not
  installed: Next ships and resolves it itself. `vitest.config.mts` and
  `vitest.stories.config.mts` alias it to Next's empty stub, since a test is
  not a client bundle.

A runtime import of the client from those directories draws two diagnostics,
rule 2's and the boundary's: oxlint reports each matching group, and excluding
the client from the boundary group with `!**/db/connection` silences the
client group as well. Lint carries the boundary itself (MB.224 retired the
guard that re-ran its probes), and lint's `sorrel/service-server-only`
(`lint/sorrel-lint.js`) fails any file under `src/modules/*/services` that
does not open with the marker.
