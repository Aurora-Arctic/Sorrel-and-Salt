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

The long form of `CLAUDE.md`'s architecture rules 8 and 9, and the GraphQL layer's standing obligations; rules 1, 6 and 7 are whole in `CLAUDE.md`. `CLAUDE.md` wins over this file; `claude-docs/graphql/README.md` carries the argument.

## Rule 8 — every list paginates through the M3.6 cursor helper

Default 25, hard server maximum 100, returned silently when a client asks for more; cursors encode sort key + id and never an offset; and the complexity limit prices a connection at that effective page size. `tests/guards/pagination.test.ts` fails a bare list on `Query` (claude-docs/graphql/pagination.md, "Pagination").

## Rule 9 — DataLoader is not optional

Compute has a dollar cost on Vercel, which is what makes an N+1 a billing bug. `define-loader.ts`, the one runtime importer of `dataloader`, hands out factories the request context calls (enforced by lint as of M3.2). A factory lives in its module's `loaders/` and reaches `src/graphql/loaders/index.ts` through the module's index, where it is spread into `LOADERS` (claude-docs/graphql/loaders.md, "Loaders: one set per request, never at module level").

## The layer's other obligations

- **No database, no queries.** A resolver calls a service and nothing below it: `src/graphql/**` imports nothing under `src/db` at runtime (rule 2, M3.9), and `drizzle-orm` only as `import type` (rule 4, MB.33), which is how the layer names Drizzle types (§7). Object types are declared by hand against the row type the service returns (claude-docs/graphql/protections.md, "The access boundary").
- **The SDL is a committed contract.** `src/graphql/schema.graphql` is the printed schema, checked by `tests/graphql/schema-snapshot.test.ts` — one of the two permitted snapshots. A schema change fails it until regenerated with `npm run test -- tests/graphql/schema-snapshot.test.ts -u`, and the rewritten file is committed with the change that moved it. Prettier ignores it (claude-docs/graphql/schema.md, "The SDL snapshot").
- **Then the client types.** `npm run codegen` (CLAUDE.md, Commands) regenerates them through `codegen.ts`'s graphql-codegen `client-preset`, and CI's `checks / codegen` leg fails on a stale `src/gql/` (claude-docs/graphql/client-types.md, "Client types").
- **Errors are mapped once, on the way out.** A service throws `ValidationError`, `Forbidden`, `NotFound` or `StaleWrite` from `src/lib/errors.ts`, and `src/graphql/errors.ts`'s `maskError` attaches the code. The message is the service's, verbatim — never rewritten at the transport — and anything else leaves masked, in every environment (claude-docs/graphql/errors.md, "Errors").
- **A revisioned mutation takes `expectedRevision: Int` and returns `revision: Int!`** (M13.16). The input names the revision the client read, and `null` writes whatever the row holds (Keep My Version); the payload hands back the revision written, for the next save to name. A lost race leaves as `STALE_WRITE` with `extensions.currentRevision`, and the client rejects with `StaleWriteError` (claude-docs/autosave.md, "The server's half").
- **Running a query by hand.** A signed-in browser opening `/api/graphql` on the dev server gets Altair (claude-docs/graphql/manual-api-testing.md).

## Access paths outside /api/graphql

`CLAUDE.md` rule 1 allows no application-data path besides `/api/graphql` and services called from server components. The paths outside both carry no application data beyond what is named here:

- **`/api/auth/*`**: the OAuth handshake.
- **`/llms.txt` and `/.well-known/*.json`**: sessionless public files, serving only the public compendium.
- **Share-card images**: Next generates them from each `opengraph-image.tsx` for `/`, `/compendium` and a compendium entry. They are sessionless and draw only what the public compendium shows.
- **`/.well-known/workflow/`**: the durable job routes the SDK generates. They carry no application data and run services as the seeded System account.
- **`/api/cron/`**: the daily cron routes. Vercel Cron calls them with the `CRON_SECRET` bearer, they refuse any other call, carry no application data and only start a job (claude-docs/design-decisions/support.md, "Daily jobs start from Vercel Cron, and no job sleeps waiting").

Admin is not an exception: it goes through `/api/graphql` like everything else.
