## Client types

Pothos types the server's half of the API. The browser's half is the documents
it sends, and `npm run codegen` types those: graphql-codegen's `client-preset`,
configured in `codegen.ts`, reads the committed SDL and every `graphql()` call in
`src/`, and writes `src/gql/`. Its `graphql()` function has one overload per
document, returning the document as its query text, a string object that carries
the operation's result and variables types, so a response is typed from the schema
rather than by hand. Callers import `graphql` from `src/lib/graphql-document.ts`,
which takes those overloads as its type and, at runtime, returns the text it is
given (see "Each page carries only its own documents" below).

```ts
import { graphql } from '@/lib/graphql-document';

const OkQuery = graphql(`
  query Ok {
    ok
  }
`);
// TypedDocumentString<{ ok: boolean }, Exact<{ [key: string]: never }>>
```

- **The chain is Pothos → `schema.graphql` → `src/gql/`.** Codegen reads the
  snapshot, not the Pothos module, so it needs no database, env or TypeScript
  loader. A schema change is therefore two steps: regenerate the snapshot with
  `-u`, then run `npm run codegen`, and commit both.
- **Only what a document uses is generated.** `client-preset` emits the
  operations it finds and the schema types they reach, so a schema change that
  no document touches leaves `src/gql/` alone. Removing or renaming a field
  that a document selects fails `npm run codegen` at validation.
- **A fragment from another call is appended when the document is sent.**
  `graphql()` records every fragment definition in the text it is given, and the
  document it returns is a `String` whose `toString()` is the caller's text
  followed by each fragment that text spreads but does not define, found by name,
  transitively, once each. The caller's text stays first, because
  `operationNameOf` reads the name from the start. This happens at send time, so
  module load order does not matter, and a spread fragment defined nowhere throws
  an error naming it. A spread fragment must be defined in the same file or in a
  file that file imports directly: a bare `import './…'` counts and `import type`
  does not, because only an imported file has loaded by then.
  `tests/lib/graphql-document.test.ts` compares each call with its generated
  document, fragments included, and fails on a spread fragment from a file that is
  not imported. The shared selection of the two facet-count queries is the example
  (`src/components/CompendiumList/live-facets.ts`); the reference search and the
  reference panel's two saves in `src/components/IngredientForm/` can now share
  a fragment and still write theirs out. Fragment masking is off
  (`presetConfig.fragmentMasking` in `codegen.ts`).
- **Committed, and guarded.** CI's `checks / codegen` leg
  (`.github/workflows/checks.yml`) runs `npm run codegen` and fails on any file
  under `src/gql/` that `git status` then shows changed, deleted or added
  (MB.224, which moved it out of the `vitest` job: it tested the tooling, not
  the app).
- **Custom scalars map to their wire type** in `codegen.ts`: `DateTime` is a
  `string`, because graphql-scalars serialises it to ISO 8601, and so is
  `LocalDate`, a `YYYY-MM-DD` day. With
  `strictScalars` on, a new scalar without a mapping fails the run instead of
  typing as `any`.
- **No generated hooks.** `client-preset` generates documents, not hooks.
  `graphqlQuery` runs a typed document through TanStack Query (["The
  client"](client.md)).
- **Each document is its query text, once.** `documentMode: 'string'` makes codegen write
  a `TypedDocumentString` per document, not a parsed syntax tree beside the text, so
  no parsed copy rides beside the text. Nothing in the browser parses a document:
  the fetch helper sends `String(document)` and reads the operation's name off
  its first line (`operationNameOf`), and anything that needs a parsed tree
  (the depth guard in `tests/guards/document-depth.test.ts` sends the text through the
  server's own protections) parses the text itself.
- **Each page carries only its own documents.** `src/gql/gql.ts` maps every
  document's text to its generated copy in `src/gql/graphql.ts`, and a bundler
  cannot drop entries from a map looked up by a string, so a page that imported
  it would ship all of them. The browser therefore never imports `src/gql/` at
  runtime: `src/lib/graphql-document.ts`'s `graphql` returns the caller's text with
  any borrowed fragments appended on sending, typed by `gql.ts`'s overloads through a type-only import. Codegen still
  finds each call by the name `graphql`, wherever it is imported from. What is
  sent is the same query text as before, so the server and the wire are
  unchanged. Codegen's compiler plugin, the usual way to do this, did not split
  the documents under Turbopack
  ([`graphql.md`, "Each GraphQL document ships as its caller's text"](../design-decisions/graphql.md#each-graphql-document-ships-as-its-callers-text)).
  Stories and tests may still import a generated `...Document` from
  `src/gql/graphql.ts`, as they are not in the app's bundle.
- **Enums are string unions** (`enumsAsTypes`), so no enum object ships to the
  browser.
- **Excluded from formatting and coverage, not from typechecking.** Prettier
  ignores `src/gql/` because the generator owns its layout, and coverage
  excludes it because the guard compares it rather than running it. Each file
  opens with `/* eslint-disable */`, which oxlint honours. `tsc` still checks it.
- `@graphql-typed-document-node/core` is a direct dependency, because the
  generated files import its types.

### No server packages in the browser

The schema builder (`@pothos/core`) and the GraphQL engine (`graphql`) are the
server's. A file the browser loads (a `'use client'` file, or anything it imports,
followed to the end) imports neither at runtime; `import type` is fine, as it is
erased. `tests/guards/browser-server-packages.test.ts` walks that import graph
and fails on a runtime import of either, or of `src/gql/`, naming the chain of
files that reached it. Code both halves need, such as the page sizes and the
cursor codec in `src/lib/cursor.ts`, lives in a file with no server imports, and
the server's module (`src/lib/pagination.ts`) re-exports it.
