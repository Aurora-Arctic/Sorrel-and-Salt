## Where queries may be built (MB.33)

CLAUDE.md rule 4's other half — a SELECT built anywhere but the repository —
is enforced by a second `no-restricted-imports` group in the same config
entry, banning `drizzle-orm` and `drizzle-orm/*`. A Drizzle query cannot be
built without importing the query builder at runtime, so banning the import
bans the capability: `src/modules/*/services`, `src/graphql`, `src/app`,
`src/components`, `src/lib` and every part of `tests/` outside `tests/db` —
Playwright's `tests/e2e/` included — fail `npm run lint` on a runtime import, whatever the resulting
finder is named or declared as.

`allowTypeImports` keeps `import type` legal everywhere, which is the point
rather than a concession: a type import is erased at compile time and can
build nothing, and it is how DESIGN.md §7's "the GraphQL layer imports
`drizzle-orm` for _types_ only" is now stated in the toolchain instead of only
in prose.

The database layer is exempted by an `overrides` block matching
`src/db/**/*.ts`, `src/modules/*/schema/**/*.ts` (a table is built there),
`tests/db/**/*.ts`, `tests/modules/**/*.ts` and `tests/support/db/**/*.ts`
(its own tests and harness, since MB.41 moved them out of `src/`),
`scripts/**/*.ts` and `drizzle.config.ts`. Two oxlint 1.82
behaviours shape it, and both are load-bearing:

- A rule set to `"off"` or `"allow"` inside `overrides` is **ignored**, so the
  exemption cannot be written as a disable. It is a narrower copy of the rule —
  the client group alone, without the query-builder group.
- An `overrides` block **replaces** the top-level rule config for the files it
  matches rather than merging with it. That is why the copy restates the client
  group verbatim: drop it and the whole database layer would silently lose rule
  2 as the price of being allowed to build queries.

That second failure mode is the one a green test suite would otherwise hide;
it was proved by a probe when the override was written, and is held by review
since MB.224 (lint carries a ban; a test re-running the linter adds nothing).
`lint-db-client-boundary.test.ts` keeps one probe per rule and the exemption
pin below. Its probes live in throwaway `__lint-probe__/` directories inside
the repo (gitignored, removed once linted) rather than in `tmpdir`, because
both rules are scoped by path and a file outside the tree matches no
`overrides` block.

**What each rule makes impossible, rather than merely absent:**

| Rule                            | Impossible                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Client ban (M1.17)              | Reaching `db` — and so a transaction, or an unaudited write — outside the repository and the three exempt files. |
| Query-builder ban (MB.33)       | Building any query at all outside the database layer, including one that would skip `deleted_at IS NULL`.        |
| `selectFrom` unexported (M1.20) | Reaching an unfiltered read from inside the repository.                                                          |
| Access boundary (M3.9)          | A resolver, page or component reaching the repository, or anything under `src/db`, without passing a service.    |

The access boundary is described in
[`graphql/access-boundary.md`](../graphql/access-boundary.md), "The access
boundary". Its second half, `server-only` on every service, stops a client
component from importing a service at all.

**What a `sql` fragment is for** has a file of its own: [`sql-fragments.md`](sql-fragments.md).
