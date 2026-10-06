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

`src/lib/validation.ts` is the Zod half of MB.43's `ValidationError`. A service
calls `parseInput(schema, input)`, which returns the parsed value or throws a
`ValidationError` with one issue per Zod issue, path and message kept. The route
maps that to `fieldErrors` ([`graphql/errors.md`](graphql/errors.md), "Errors"),
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
  one-field stub saves. A `null` kind counts as no kind. A formal name with no kind becomes `unknown` (MB.161):
  the one kind that admits a name without claiming its system, where `none`
  would contradict the name and `botanical` is the silent guess §5 forbids.
- **`CompendiumIngredientInput`**, for the compendium tier. The admin must answer
  `nomenclature`, and `none` and `unknown` are answers.

Rules both variants enforce:

- **The kind↔name coupling**, in both directions, as the database CHECK does:
  `none` with a formal name is refused, any of the five named kinds without
  one is refused, and `unknown` takes either (MB.161). Both are pathed to `canonicalName`, so the CHECK is never
  what a user sees.
- **`canonicalName` and `form`** are optional and trimmed, and a blank one
  becomes `null` — which the database CHECKs on both columns accept, so a
  blank never reaches them. Neither has a format regex, and neither schema
  checks `form` against the curated vocabulary: on a coven's ingredient it is
  an autofill and not a constraint, and the compendium's check reads the
  database, so it is the service's (below).
- **Folk names, within one ingredient.** `name` may not also be one of the
  same ingredient's folk names, pathed to `name`. One ingredient listing the
  same folk name twice, such as `["Cat's Claw", "cat's claw"]`, is refused at
  the repeat's position. Both comparisons are case-insensitive, matching the
  per-ingredient `lower(name)` unique index, so that index isn't what a user
  sees either. A blank folk name is dropped, not refused — but only after the
  repeat check, so an issue's position still counts the rows the form sent,
  blank ones included, and lands beside the right one. `deities` drops
  blank entries the same way. A list left with no entries,
  `[]` or blanks alone, is absent like a blank text field and becomes `null`,
  so a cleared `deities` is stored as NULL rather than `{}`. Two _different_ ingredients sharing a folk name is untouched: §5
  wants it, since several plants claiming "Cat's Claw" is what is being
  documented.
- **Substitutes, each a link or a name** (DESIGN.md §5,
  `ingredient_substitutes`; MB.140). An entry is `{ ingredientId }` or
  `{ name }`, either half trimmed and blank as absent, and the schema holds it
  to exactly one, as the row's `num_nonnulls` CHECK does: both, or neither — a
  blank name included — is refused at the entry, and so is an id that is not a
  uuid. A blank entry is refused rather than dropped, unlike the text lists,
  so that a refusal the service makes after the parse still counts the
  entries the caller sent. The same ingredient linked twice, or the same name
  twice in any case, is refused at the repeat, the two partial unique indexes'
  keys, so neither index's 23505 is what a member sees. A name equal to a
  linked ingredient's label is not a repeat. The parse hands the service each
  entry as `{ ingredientId, name: null }` or `{ ingredientId: null, name }`;
  which ingredients a link may reach is the service's rule, since it reads
  other rows (["The workspace ingredient mutations"](graphql/schema.md)).
- **References, each an existing one** (DESIGN.md §7; MB.153). An entry is
  `{ referenceId, locator }`, the id required as `ReferenceLinkInput`'s `ID!`
  is and trimmed, the locator optional text, blank as none. A blank id, or one
  that is not a uuid, is refused at the entry rather than dropped, for the
  substitutes' reason, and the same reference twice is refused at the repeat
  whatever its locator, `reference_links_ingredient_unique`'s key. Which
  references an ingredient may cite is the service's rule, since it reads
  other rows. A new reference is not written through this field: the form
  creates it first, through `ReferenceInput` below, and sends its id.
- **Closed sets.** `nomenclature` and the entries of `elements` come from
  the pgEnums' lists, in `schema/ingredient-enums.ts`.
- **`elements` is a list of that closed set** (DESIGN.md §5, MB.157; built by
  MB.159, replacing the single `element`): an array of the five, each entry
  refused at its position (`['elements', i]`) if it is not one of them,
  with "Choose one of the five elements". A repeat is refused at the
  repeat's position, the second occurrence, naming the element — "Fire is
  already chosen" — as a folk name's repeat is refused rather than dropped as
  a free-text list's is: the form's list offers only the elements not yet
  chosen, so a repeat comes from another caller, and refusing tells it so.
  Nothing is trimmed and no entry is blank, since an enum has neither, so a
  list left with no entries, `[]`, is the only absence, and
  `dropBlankEntries` turns it into `null` as it does an emptied text list.
  The list keeps the order chosen and is never reordered. Neither schema
  keeps `element`, so a caller still sending it has it stripped like any
  unknown key.
- **`planets`, `zodiacSigns` and `colors` are lists, validated as `deities`
  is** (DESIGN.md §5, MB.134; built by MB.136, replacing the single `planet`,
  `zodiac` and `color`): free text, each entry trimmed, blank entries dropped
  by `dropBlankEntries` after the cross-field rules, and a list left with no
  entries `null`. A repeated entry is not refused — unlike folk names, no
  unique index stands behind a list — and an entry is never reordered, since
  each list keeps the order entered. Neither schema has a single field left,
  so a caller still sending `planet` has it stripped like any unknown key.
- **Planets and zodiac signs are suggested rather than enforced**, like
  `form` and `deities`: anything trimmed and non-blank passes either schema.
  The project serves a wide range of practices, and any closed list refuses
  some of them. The suggestions are the admin-curated `planets` and
  `zodiac_signs` vocabularies
  ([`db/astrology-vocabularies.md`](db/astrology-vocabularies.md), "The
  astrology vocabularies"), and on a coven's ingredient an entry off them is
  as valid as one on them. A colour has no vocabulary and no suggestions.

**A compendium entry holds curated values alone** (MB.162). After
`CompendiumIngredientInput` parses, `createCompendiumEntry` and
`updateCompendiumEntry` match `form` and each entry of `planets`,
`zodiacSigns` and `deities` against the live curated rows — a form under a
live group, a deity under a live tradition — folded as the suggestions fold,
`lower(btrim(value)) = lower(name)`, and write each in its row's spelling. A
value no live row holds is a `ValidationError` beside it, `['form']` or
`['planets', i]`, `['zodiacSigns', i]` or `['deities', i]`, the index the
entry had in what was sent, blanks counted, since the parse drops blank
entries and the form numbers its rows by what it sent. Every such value is
refused in one error, and each message names the list to add it to: `No
curated planet is called "Eris" — add it to the planet list first`. It is
not in the schema because it reads the database, and the schemas are `zod`
alone (above); `LocalIngredientInput`'s writes make no such check. Folk names
and colours have no list and are not checked
([`db/identity-model.md`](db/identity-model.md), "The ingredient identity
model").

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

## References

`ReferenceInput` (MB.153; `validation/reference.ts`) is a reference as the
form submits it and the service parses it, mirroring the CHECKs MB.152 put on
`references` with a message on the field each is about, so no refusal surfaces
as a constraint name (DESIGN.md §5, "References"). `kind` is one of
`REFERENCE_KINDS`; `title` is required and non-blank; every other text field
is trimmed and blank as absent, as the table's non-blank CHECKs need. `url`
is an absolute http(s) address a browser can follow, and `modified` and
`accessed` are calendar days, `YYYY-MM-DD`. Per `kind`: a chapter, an
article and an entry each need their `container`, named as the kind names it
— "Name the journal this article is in"; a web page needs its `url` and its
`accessed` day; any other kind's `accessed` needs a `url`. One rule is the
form's rather than the table's, as MB.151 decided: a book needs the year it
was published. Each issue is pathed to its field, so a web page sent bare is
refused at `url` and `accessed` both.

## Categories

`CategoryInput` takes a trimmed, non-blank `name` and `description`, and a
`groupId` uuid. It takes no slug, which is derived from the name and dropped if
sent. The group and form vocabularies (M5.6a, M5.6b) and the planet and zodiac
vocabularies (MB.95) add their own schemas
beside it when those tasks land. So does the spell (MB.8).
