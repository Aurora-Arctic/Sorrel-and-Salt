---
paths:
  - 'src/graphql/**'
  - 'src/modules/*/graphql/**'
  - 'src/modules/*/loaders/**'
  - 'src/gql/**'
  - 'src/app/api/graphql/**'
  - 'src/lib/graphql-client.ts'
  - 'codegen.ts'
  - 'tests/graphql/**'
---

# GraphQL rules

The long form of `CLAUDE.md`'s architecture rules 8 and 9, and the GraphQL layer's standing obligations; rules 1, 6 and 7 are whole in `CLAUDE.md`. `CLAUDE.md` wins over this file; `claude-docs/graphql.md` carries the argument.

## Rule 8 — every list paginates through the M3.6 cursor helper

Declare it with `t.pagedConnection` and read it through `findPage`/`findPageInWorkspace`. Default 25, hard server maximum 100, returned silently when a client asks for more; cursors encode sort key + id and never an offset; and the complexity limit prices a connection at that effective page size. `tests/guards/pagination.test.ts` fails a bare list on `Query` (claude-docs/graphql.md, "Pagination").

## Rule 9 — DataLoader is not optional

Compute has a dollar cost on Vercel, so an N+1 is a billing bug as well as a slow one. Loaders are constructed per request, never at module level: only `src/graphql/loaders/define-loader.ts` may import `dataloader` at runtime, and it hands out factories the request context calls (enforced by lint as of M3.2). A factory lives in its module's `loaders/` and reaches `src/graphql/loaders/index.ts` through the module's index, where it is spread into `LOADERS` (claude-docs/graphql.md, "Loaders: one set per request, never at module level").

## The layer's other obligations

- **No database, no queries.** A resolver calls a service and nothing below it: `src/graphql/**` imports nothing under `src/db` at runtime (rule 2, M3.9), and `drizzle-orm` only as `import type` (rule 4, MB.33), which is how the layer names Drizzle types (§7). Object types are declared by hand against the row type the service returns (claude-docs/graphql.md, "The access boundary").
- **The SDL is a committed contract.** `src/graphql/schema.graphql` is the printed schema, checked by `tests/graphql/schema-snapshot.test.ts` — one of the two permitted snapshots. A schema change fails it until regenerated with `npm run test -- tests/graphql/schema-snapshot.test.ts -u`, and the rewritten file is committed with the change that moved it. Prettier ignores it (claude-docs/graphql.md, "The SDL snapshot").
- **Then the client types.** `npm run codegen` regenerates `src/gql/` from the committed SDL (`codegen.ts`, graphql-codegen's `client-preset`); commit the output, since `tests/guards/codegen-staleness.test.ts` fails CI on stale files (claude-docs/graphql.md, "Client types").
- **Errors are mapped once, on the way out.** A service throws `ValidationError`, `Forbidden` or `NotFound` from `src/lib/errors.ts`, and `src/graphql/errors.ts`'s `maskError` attaches the code. The message is the service's, verbatim — never rewritten at the transport — and anything else leaves masked, in every environment (claude-docs/graphql.md, "Errors").
- **Running a query by hand.** A signed-in browser opening `/api/graphql` on the dev server gets Altair (claude-docs/manual-api-testing.md).
