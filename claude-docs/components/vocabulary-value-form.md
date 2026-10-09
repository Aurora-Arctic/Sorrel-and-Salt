# VocabularyValueForm

`src/components/VocabularyValueForm/` — the admin's form for a flat curated
vocabulary (MB.95): a planet or a zodiac sign. It has two fields, a name and
a description, saves through the vocabulary's own create or update mutation,
and on an existing value offers a delete behind a confirmation. It holds no
modal of its own: the page puts it in one.

It is [`GroupedValueForm`](grouped-value-form.md) without the
group, and without the redirect question: a planet or a sign is no part of a
compendium entry's identity or slug, so a rename moves no address. Everything
that page says of field errors, required marks, the save rules and the
delete's refusal holds here. One component for both vocabularies, keyed by
`vocabulary`, its nouns from `VOCABULARY_COPY`
([`vocabulary-value-list.md`](vocabulary-value-list.md)).

## Props

`VocabularyValueFormProps` (`types.ts`):

| Prop         | What it is                                                          |
| ------------ | ------------------------------------------------------------------- |
| `vocabulary` | `'planets'` or `'zodiacSigns'`: the schema, the mutations and nouns |
| `value`      | The value to edit, as `{ id, name, description }`                   |
| `onDone`     | Called after a save or a delete, and on Cancel; the owner closes it |

Without `value`, the form adds one.

## Contracts

- **The vocabulary's schema runs first.** react-hook-form runs `PlanetInput`
  or `ZodiacSignInput` (`src/modules/vocabulary/validation/astrology-value.ts`)
  through the Zod resolver, so a blank name or description never reaches the
  server, refused in its own noun — "Describe the sign". A `VALIDATION`
  error's `fieldErrors` land beside `name` or `description`, the slug
  collision on `name`; anything else renders above the fields in a
  `role="alert"` notice.
- **Six documents, one table.** `createPlanet`, `updatePlanet` and
  `deletePlanet`, and the signs' three, each a static document codegen
  types; `WRITES` picks the vocabulary's three, which take the same
  variables.
- **A rename says it carries onto the compendium.** On an existing value
  whose name, trimmed, differs from the saved one, a `.field__hint` sits
  above the actions: "Saving renames it on every compendium entry that lists
  it." Save's `aria-describedby` points at it, and putting the name back
  removes it. Unlike a form's, it says nothing of addresses, since none move.
- **A delete asks first, and says what it does**: `Delete "<name>"? It can't
be deleted while a compendium entry lists it. Covens' ingredients keep what
they wrote, which then counts as their own value rather than a curated
one; nothing of theirs changes.` beside Delete and Keep It. The service's
  refusal names the entries and is shown in the alert notice, the form open
  and the confirmation withdrawn.
- **Save is offered only when there is something to save**, by `isDirty`,
  and busy from the press to the answer — "Saving Planet", `aria-busy`, the
  shared `.spinner`; the confirmation's Delete likewise, as "Deleting".
- **Buttons are title case**, in the vocabulary's label: Save Planet, Delete
  Sign, Cancel, Delete, Keep It. Save is solid, Cancel and Keep It quiet,
  the two deletes destructive.

## On the admin pages

`/admin/planets` and `/admin/zodiac-signs` are one page shape,
`src/app/admin/vocabulary-page.tsx`'s `VocabularyPage`, each route's
`page.tsx` naming its vocabulary and its title. It opens the form in `Modal`
from its address, as `/admin/forms` does: `?new` an empty one, `?edit=<slug>`
the value at that slug, read through `getAstrologyValueBySlug`.
`src/app/admin/vocabulary-dialog.tsx` is the client glue: closing, saving or
deleting `router.replace`s the page the modal opened over, query and cursor
kept, then `router.refresh()`es. A rename moves the value's own slug, so the
modal closes after every save rather than sit on a stale address. An
`?edit=` naming no live value opens nothing and says "No planet has that
address — it may have been renamed or deleted." above the list.

## Styling

GroupedValueForm's, under this name: the actions wrap, the delete
sits at the far end, the required asterisk is `$secondary`, and the rename
note sits a step above the actions. Nothing goes further before MB.115's
design review.

## Stories

[`index.stories.tsx`](../../src/components/VocabularyValueForm/index.stories.tsx)
— `AddingAPlanet` and `EditingASign`, each in the modal and its own iframe.
Renaming in `EditingASign` shows the note. The workshop has no API, so a save
answers with the generic error.

## Testing

`tests/components/VocabularyValueForm/index.test.tsx` runs every case on both
vocabularies, the mutations answered by MSW in the route's own shape: the
fields, the schema's refusal in the vocabulary's noun, create, update and
delete with their variables, server field errors placed, the save rules, the
rename note, and the delete's confirmation and refusal. The pages' half is
`tests/app/admin/vocabulary-page.test.tsx`. `tests/e2e/admin.spec.ts` adds,
renames and deletes a planet through the real server, and is refused
deleting the Sun, which seeded compendium entries list.
