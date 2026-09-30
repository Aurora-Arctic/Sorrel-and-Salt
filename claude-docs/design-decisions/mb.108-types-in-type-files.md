# MB.108 — Types live in type-only files

**Decided:** every `type` and `interface` in `src/` and `scripts/` moves out of the code file that used it into a type-only file, by default a `types.ts` beside that code, except three kinds that stay put. A guard fails any new one written inline. MB.109 carries the rule to `tests/`. The summary is [`modules.md`](../modules.md), "Where types live".

## Why

The owner's call: types cluttered the files whose job is behaviour. Before this, 126 declarations in 61 files of `src/` and `scripts/` sat beside the code that used them, and `src/lib/session.ts` was the one type-only file. Collecting them also turned up copies: `IngredientRow` was declared three times and `SeedUser` twice identically, and each is declared once now.

## Where a type goes

**A `types.ts` per directory**, beside the code that uses the type. Two alternatives lost:

- **A central `src/types/`** would put a type away from its users. It would also be a sixth place outside the five modules that every module imports, which the boundary guard has no line for.
- **A sidecar per file**, such as `select.types.ts`, would double the file count. Each sidecar under `services/` would also need `import 'server-only'`, because `server-only-services.test.ts` reads every file there.

**A types file inherits the import reach of everything that imports it**, because the guards that walk imports follow `import type` too. Three placements follow from that:

- **`src/lib/types.ts` imports nothing.** `client-safe-validation.test.ts` walks from `src/lib/validation.ts` through `errors.ts` into it, and fails on any package but zod. The session types read the `users` table and Better Auth, so they stay in `src/lib/session.ts`, as does Better Auth's hook context.
- **A validation file's helper types go to `validation/types.ts`.** The module's own `types.ts` reaches its tables and so `drizzle-orm`.
- **A module's `types.ts` sits at the module root**, not under `services/`, so it carries no `server-only`. It is internal like `services/`. The index names the public types in one `export type { … } from './types'` line, so the module's surface is exactly what it was, and a module-internal type stays off it. It is not made a fourth public surface beside the index, `schema/` and `validation/`: the index already offers every public type, and a fourth entry point would widen the boundary for nothing. The lint's deep-import group gains `@/modules/*/types`.

**The repository's `shapes.ts` split in two.** Its types, with the ones the finders and the writer declared, are `types.ts`. Its three predicates are `predicates.ts`. The index re-exports the writer's type, and the types a caller passes to a finder or gets back from one, from `types.ts` in one line. The table shapes and the rest of `selectFrom`'s options stay inside the folder, as before.

**Scripts import `import type { … } from './types.ts'`.** Node's own type stripping runs them, which needs the extension, and it erases only an import marked `type`.

## What stays, and why

- **A type derived from a value declared in the same file.** Examples are the Zod schema and type pairs, `(typeof UNIT_DIMENSIONS)[number]`, `Loaders` from the private `LOADERS`, and `WorkspacePermission` from the private `statements`. A types file would have to import the value back, and the Zod pairs would lose the one name that carries both schema and type. Exporting a private value to move its type would widen a surface to tidy a file.
- **The branded proofs, `Membership` and `SiteAdmin`.** The brand's `unique symbol` is unexported so that no other file can name it. CLAUDE.md rule 5 and `db.md` describe it as living beside the one function that mints the proof. Moving the symbol with the type would still compile, but it would turn a one-file mechanism into a two-file one.
- **`Executor` and `Transaction`**, the repository's two `typeof db` types. Only the pinned set of files may import the client, even type-only, and a types file would be one more exemption.

A type declared inside a function, a `describe` block or a `declare global` block belongs to that code. So the `PothosSchemaTypes` augmentation stays beside the prototype patch it types.

## The guard

`tests/guards/types-in-type-files.test.ts` reads every column-0 `type` and `interface` in a file that is not type-only. It fails any that is not one of the three kinds. The first two are recognised from the declaration itself: a `typeof` naming a value the same file declares, or a key naming a `declare const …: unique symbol` in the same file. The third is a pinned list with a staleness check. A precondition asserts that the scan found and exempted both proofs and a Zod pair, so an empty scan cannot pass.

It reads text rather than a syntax tree. Prettier, which pre-commit and CI both run, puts every top-level statement at column 0 and indents everything nested. That makes column 0 a reliable statement boundary without a parser. A declaration's extent runs to its closing `;` or `}` by bracket depth, skipping strings and comments, which is what lets it see a brand key four lines below the head.

## What it costs

More files: about twenty-five `types.ts` in `src/` and `scripts/`, and one more import line in most code files. The exemptions are read by pattern rather than by a type checker, so an unusual declaration shape could be misread. The guard's fixture test pins the two shapes known to be awkward: a generic default of `{}` ahead of an interface body, and a union spread over lines.
