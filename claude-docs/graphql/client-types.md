## Client types

Pothos types the server's half of the API. The browser's half is the documents
it sends, and `npm run codegen` types those: graphql-codegen's `client-preset`,
configured in `codegen.ts`, reads the committed SDL and every `graphql()` call in
`src/`, and writes `src/gql/`. Its `graphql()` function has one overload per
document, returning a `TypedDocumentNode` that carries the operation's result and
variables types, so a response is typed from the schema rather than by hand.

```ts
import { graphql } from '@/gql';

const OkQuery = graphql(`
  query Ok {
    ok
  }
`);
// TypedDocumentNode<{ ok: boolean }, Exact<{ [key: string]: never }>>
```

- **The chain is Pothos → `schema.graphql` → `src/gql/`.** Codegen reads the
  snapshot, not the Pothos module, so it needs no database, env or TypeScript
  loader. A schema change is therefore two steps: regenerate the snapshot with
  `-u`, then run `npm run codegen`, and commit both.
- **Only what a document uses is generated.** `client-preset` emits the
  operations it finds and the schema types they reach, so a schema change that
  no document touches leaves `src/gql/` alone. Removing or renaming a field
  that a document selects fails `npm run codegen` at validation.
- **Committed, and guarded.** `tests/guards/codegen-staleness.test.ts`
  regenerates in memory and fails on any file under `src/gql/` that differs, is
  missing or is left over. It runs in CI's `vitest` job; there is no workflow of
  its own. The same file proves that a document gets typed, that an unknown field
  fails, and that an unmapped scalar fails.
- **Custom scalars map to their wire type** in `codegen.ts`: `DateTime` is a
  `string`, because graphql-scalars serialises it to ISO 8601. With
  `strictScalars` on, a new scalar without a mapping fails the run instead of
  typing as `any`.
- **No generated hooks.** `client-preset` generates documents, not hooks.
  `graphqlQuery` runs a `TypedDocumentNode` through TanStack Query (["The
  client"](client.md)).
- **Enums are string unions** (`enumsAsTypes`), so no enum object ships to the
  browser.
- **Excluded from formatting and coverage, not from typechecking.** Prettier
  ignores `src/gql/` because the generator owns its layout, and coverage
  excludes it because the guard compares it rather than running it. Each file
  opens with `/* eslint-disable */`, which oxlint honours. `tsc` still checks it.
- `@graphql-typed-document-node/core` is a direct dependency, because the
  generated files import its types.
