# Validation

Input is validated by Zod schemas that the form and the service both run
(M4.5). The form's resolver runs a schema before the mutation is sent, so a
well-behaved form never asks the server to reject what it could have caught.
The service runs the same schema again, because the browser is not the only
caller. There is one definition, so the two cannot disagree about what is
valid (DESIGN.md §7, "Errors").

## Where the schemas live

In each module's `validation/` directory, a third public surface beside
`index.ts` and `schema/*.ts` ([`modules.md`](modules.md), "The public
surface"):

| File                                               | Exports                                             |
| -------------------------------------------------- | --------------------------------------------------- |
| `src/modules/ingredients/validation/ingredient.ts` | `LocalIngredientInput`, `CompendiumIngredientInput` |
| `src/modules/ingredients/validation/stock.ts`      | `StockInput`                                        |
| `src/modules/vocabulary/validation/category.ts`    | `CategoryInput`                                     |

Each export is both a schema and, under the same name, the type of its parsed
output. A form sends `z.input<typeof …>`: its values as typed, unparsed, so
the service parses exactly what the resolver checked. The form's own values
can differ from that shape. `IngredientForm` keeps each list row as an object
for `useFieldArray`, and reshapes its values before the resolver sees them
([`components/ingredient-form.md`](components/ingredient-form.md), "What it
sends").

The schemas can't go behind the index. A client component imports them, and
once a module's index re-exports a service, it carries `server-only`. They
can't go in `schema/` either: that folder is drizzle-kit's glob and holds the
tables. So a validation file imports `zod` and dependency-free files, and
nothing else. Those files are `schema/units.ts`, `schema/ingredient-enums.ts`
and `schema/quantities.ts`, which the tables are built from too, so a closed
set or a column's shape is written down once. `tests/guards/client-safe-validation.test.ts`
walks every validation file's imports, however indirect, and fails any that
reach a package other than `zod`. A table file fails it, because it imports
`drizzle-orm`, and the guard proves itself against one.

## Raising the error

`src/lib/validation.ts` is the Zod half of MB.43's `ValidationError`. A
service calls `parseInput(schema, input)`, which returns the parsed value or
throws a `ValidationError` with one issue per Zod issue, path and message kept.
The route maps that to `fieldErrors` ([`graphql.md`](graphql.md), "Errors"),
and the form puts each one beside its field through `setError`. The adapter is
in `src/lib/` rather than `errors.ts`, so the error type stays free of any
schema library and a seed can throw one. It isn't in any one module, because
every module's schemas raise the same shape.

The messages are the user-facing text: an issue's message is what appears
beside the field.

The same file exports `RowId`, an id as Postgres's `uuid` type takes it. A
schema checks an id list with it, and a service checks an id it is about to
compare with a `uuid` column, since anything else is a driver error there.
`assertMembership` checks every `workspaceId` with it
([`db/membership-proof.md`](db/membership-proof.md#what-the-check-asks),
"What the check asks").

## The two ingredient variants

Both take the same fields. Text is trimmed, and **a blank optional field is
an absence, not an error**: `''` or whitespace becomes `null`, which is what
a form sends for a field nobody touched. Only a blank _required_ field is
refused, and that is "required", not "blank". They differ only in
`nomenclature`:

- **`LocalIngredientInput`**, for the workspace tier. Only `name` is required.
  With no formal name and no kind, `nomenclature` becomes `none`, so story 29's
  one-field stub saves. A `null` kind counts as no kind. A formal name with no kind is asked about, pathed to
  `nomenclature`, rather than guessed: `none` would contradict the name, and
  guessing `botanical` is the silent guess §5 forbids.
- **`CompendiumIngredientInput`**, for the compendium tier. The admin must answer
  `nomenclature`, and `none` and `unknown` are answers.

Rules both variants enforce:

- **The kind↔name coupling**, in both directions, as the database CHECK does:
  `none`/`unknown` with a formal name is refused, and any other kind without
  one is refused. Both are pathed to `canonicalName`, so the CHECK is never
  what a user sees.
- **`canonicalName` and `form`** are optional and trimmed, and a blank one
  becomes `null` — which the database CHECKs on both columns accept, so a
  blank never reaches them. Neither has a format regex, and `form` isn't
  checked against the curated vocabulary, which is an autofill and not a
  constraint.
- **Folk names, within one ingredient.** `name` may not also be one of the
  same ingredient's folk names, pathed to `name`. One ingredient listing the
  same folk name twice, such as `["Cat's Claw", "cat's claw"]`, is refused at
  the repeat's position. Both comparisons are case-insensitive, matching the
  per-ingredient `lower(name)` unique index, so that index isn't what a user
  sees either. A blank folk name is dropped, not refused — but only after the
  repeat check, so an issue's position still counts the rows the form sent,
  blank ones included, and lands beside the right one. `deities` and
  `substitutes` drop blank entries the same way. A list left with no entries,
  `[]` or blanks alone, is absent like a blank text field and becomes `null`,
  so a cleared `deities` is stored as NULL rather than `{}`. Two _different_ ingredients sharing a folk name is untouched: §5
  wants it, since several plants claiming "Cat's Claw" is what is being
  documented.
- **Closed sets.** `nomenclature` and `element` come from the pgEnums' lists,
  in `schema/ingredient-enums.ts`.
- **`planet` and `zodiac` are free text, suggested rather than enforced**,
  like `form`: trimmed, a blank one becomes `null`, and anything else is
  written. The project serves a wide range of practices, and any closed list
  refuses some of them. The suggestions are the admin-curated `planets` and
  `zodiac_signs` vocabularies
  ([`db/astrology-vocabularies.md`](db/astrology-vocabularies.md), "The
  astrology vocabularies"), and a value off them is as valid as one on them.

The schemas describe a whole ingredient, as the form submits it on create and
on edit. A partial update would need its own schema: the local variant's
default would otherwise overwrite a kind the input merely left out.

## Stock

`StockInput` is what the stock mutations (M9.4) and inline row editing (M9.9)
write through. `quantityOnHand` and `lowStockThreshold` are numbers, nullable,
and refuse a negative value with a message. That rule is deliberately not a
CHECK constraint
([`db/stock.md`](db/stock.md#nullability-and-why-zero-is-not-the-same-as-nothing),
"Nullability, and why zero is not the same as nothing"). They also refuse
anything above 999,999,999.999, the most a `numeric(12, 3)` column holds,
which Postgres would otherwise refuse with a raw overflow. The ceiling is
computed from `schema/quantities.ts`, the same
precision and scale the two columns are built from, so the two cannot drift. `unit` is validated against `UNITS` from `schema/units.ts`, never
a second list. `unitDimension` is not input: the service derives it with
`dimensionOf`. `acquiredDate` is a calendar date, `YYYY-MM-DD`.

## Categories

`CategoryInput` takes a trimmed, non-blank `name` and `description`, and a
`groupId` uuid. It takes no slug, which is derived from the name and dropped if
sent. The group and form vocabularies (M5.6a, M5.6b) and the planet and zodiac
vocabularies (MB.95) add their own schemas
beside it when those tasks land. So does the spell (MB.8).
