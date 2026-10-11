# GroupedValueForm

`src/components/GroupedValueForm/` — the admin's form for a curated value,
grouped or flat. Grouped, the value is filed under a group: a category
(M5.6), a curated ingredient form (M5.6a) or a curated deity (MB.132). Flat,
it is filed under nothing: a planet or a zodiac sign (MB.95). One component
serves every such vocabulary, `kind: 'category' | 'form' | 'deity' |
'planet' | 'zodiacSign'`, as [`GroupForm`](group-form.md) serves the groups,
so a new vocabulary is a kind rather than another copy. The flat kinds had a
copy of their own, `VocabularyValueForm`, until MB.115 folded it in.

It has a name and a description, and for a grouped kind the group the value
is filed under — a deity's is its tradition. It saves through the kind's
create or update mutation (`createCategory`, `updateIngredientFormValue`,
`createPlanet` and so on). On an existing value it also offers a delete
behind a confirmation. It holds no modal of its own: the page puts it in one.

The form kind is named for the GraphQL type, `IngredientFormValue`, because
`IngredientForm` is the ingredient entry form (DESIGN.md §7). The copy calls
a row a "form": Add Form, Save Form. A zodiac sign is a "Zodiac Sign" on
every button, Add Zodiac Sign, Save Zodiac Sign and Delete Zodiac Sign, the
long form the owner chose at MB.115's sign-off.

## Props

`GroupedValueFormProps` (`types.ts`):

| Prop     | What it is                                                                                   |
| -------- | -------------------------------------------------------------------------------------------- |
| `kind`   | Which vocabulary: its mutations, its schema, whether it has a group, and what the copy says  |
| `value`  | The value to edit, as `{ id, name, description, groupId }`, `groupId` absent for a flat kind |
| `groups` | Every live group of the kind as `{ id, name }`, alphabetical (MB.35); none for a flat kind   |
| `onDone` | Called after a save or a delete, and on Cancel; the owner closes it                          |

Without `value`, the form adds one.

## Kinds

Everything that tells one kind from another is its entry in `index.tsx`'s
`KINDS`, declared through `defineKind`, so a new kind is an entry there and
its three mutation documents, and nothing else:

- **Its copy**: `noun`, the title-case word the buttons say ("Category",
  "Form", "Deity", "Planet", "Zodiac Sign"); `group`, for a grouped kind only, the
  group field's `label` and `placeholder`, what it shows until one is chosen
  ("Group", "Choose a group"; a deity's "Tradition", "Choose a tradition"),
  and `typeahead` where the field is typed into to narrow the groups rather
  than picked from the select-only box: the deity's Tradition alone, the
  owner's call in MB.115; `deleteNote`, what the
  confirmation says after `Delete "<name>"?`; and `renameNote`, for a kind
  whose rename reaches further than its row (every kind but the category).
- **Its schema and input**: `schema`, the shared schema the values pass
  before any request, and `toInput`, the values as the kind's mutation input.
  The form's values are always `{ name, description, groupId }`. For the
  category and form kinds the schema is the shared one itself — `CategoryInput`
  or `IngredientFormValueInput` (`src/modules/vocabulary/validation/`) — and
  `toInput` is the identity. A kind whose input names the group otherwise
  supplies its shared schema with that key renamed to `groupId`, a `toInput`
  that renames it back, and `inputKeys`, which says where the server paths
  it, so its refusal still lands beside the group field. The deity kind is
  one: `DeityInput` calls the group `traditionId`, so its schema is
  `DeityInput` with `traditionId` swapped for `groupId`, and its
  `inputKeys` is `{ groupId: 'traditionId' }`.
- **No group, for a flat kind.** A planet or a zodiac sign has no `group`, so the
  form draws no group field. Its values still carry `groupId`, always `''`,
  so every kind has one shape; its schema, `PlanetInput` or
  `ZodiacSignInput` (`src/modules/vocabulary/validation/astrology-value.ts`),
  parses the name and description alone, and `toInput` leaves the group out.
- **Its mutations**: `create`, `update` and `remove`, the three typed
  documents. `defineKind` holds them to the kind's input and hides the input
  type from the record, so kinds whose inputs differ sit in one `KINDS`.

## Contracts

- **The shared schema runs first.** react-hook-form runs the kind's schema
  through the Zod resolver before any mutation is sent, so a blank name, a
  blank description or an unchosen group never reaches the server. The
  service runs the same schema again (DESIGN.md §7, "Errors").
- **A server field error lands beside its field.** A `VALIDATION` error's
  `fieldErrors` go to `setError` by path: `name`, `description` or the
  group's input key (`groupId`, or a deity's `traditionId`). Anything else
  renders above the fields in a `role="alert"` notice. The slug collision is pathed to `name`, since the
  slug is derived from the name and has no field of its own (MB.43).
- **The group, where the kind has one, is a closed set**, on the combobox's select-only box
  (`ComboboxSelect`), with the kind's placeholder, "Choose a group". It is
  named by the kind's label, "Group", and its list is "Group choices"; a
  deity's is "Tradition", "Choose a tradition" and "Tradition choices". The
  list floats over the modal rather than stretching it, as every combobox
  list does.
- **Every field is required**, as the schema and the columns say, and
  each label carries an asterisk in the error red. The asterisk is hidden from
  the field's name: a screen reader hears "Name" and the control's
  `aria-required`.
- **Save is offered only when there is something to save** (the owner's rule
  for every form). It is disabled on a new value until something is typed,
  and on an existing one until something changes, by react-hook-form's
  `isDirty`. Putting a value back disables it again. From the press to the
  answer it is a [`BusyButton`](busy-button.md) and says so: "Saving
  Category", "Saving Form" and so on, `aria-busy`, with the shared
  `.spinner` ahead of the label. The
  confirmation's Delete does the same, as "Deleting".
- **A rename of any kind but a category says it carries onto the compendium.**
  Renaming a form rewrites every live compendium variant that picked it
  ([`mb.162-compendium-holds-curated-values.md`](../design-decisions/mb.162-compendium-holds-curated-values.md)),
  and renaming a deity the name on every live compendium entry's
  `ingredient_deities` row that picked it
  ([`mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)).
  A planet's or a zodiac sign's rename reaches every entry listing it the
  same way (MB.162). None is part of an entry's identity or address — a form
  not since MB.215 — so no address moves (MB.220). On an existing value of a
  kind with a `renameNote`, whose name, trimmed, differs from the saved one,
  a `.field__hint` sits above the actions, for every such kind "Saving
  renames it on every compendium entry that uses it." Save's `aria-describedby` points
  at it. Putting the name back removes it. A new value has no entries, so it
  never shows there; nor does a change of group, which moves no entry. A
  category has no note.
- **No rename asks to end a redirect.** Until MB.220 a form's rename could
  move a compendium entry onto an address another entry's redirect ran from,
  and the form asked first, sending `endRedirect`. A rename moves no address
  now, so the question went with the field; the compendium's admin form, M5.5,
  is where it is still asked, of an entry's own save
  ([`db/ingredient-slugs.md`](../db/ingredient-slugs.md)).
- **A delete asks first, and says what it does.** Delete Category, Delete
  Form, Delete Deity, Delete Planet or Delete Zodiac Sign replaces the
  actions with `Delete "<name>"?` and the kind's note, beside Delete and
  Keep It. A category's: `Covens' ingredients and spells filed under it
stay in their lists, but can no longer be filtered by it.` Deleting a
  category removes nothing of a coven's: an entry filed under it keeps its
  link and stops reading the category
  ([`deleteCategory`](../../src/modules/vocabulary/services/categories.ts)).
  Every other kind's: `You can't delete it while a compendium entry uses
it. Covens' ingredients keep what they wrote, as their own value.` A refusal comes back as a
  `FORBIDDEN` naming the compendium entries filed under the category
  ([`db/categories.md`](../db/categories.md), "Category writes"), or as a
  plain message naming the entries that pick the form or the deity. It is
  shown in the alert notice, and the form stays open with the
  confirmation withdrawn. Per DESIGN.md §7, a refusal that names its remedy is
  not a bad value in a box, so it gets no field.
- **Buttons are title case**: Save and Delete with the kind's `noun` (Save
  Category, Delete Zodiac Sign and so on), Cancel, Delete, Keep It. Save is
  solid; Cancel and Keep It are quiet, since they change nothing; the two
  deletes are destructive.

## On the admin pages

`/admin/categories`, `/admin/forms`, `/admin/deities`, `/admin/planets` and
`/admin/zodiac-signs` are one page, `src/app/admin/value-page.tsx`'s
`ValuePage`. Each route's `page.tsx` keeps its tab title and hands its kind
and address over. `value-kinds.ts` holds each kind's readers from
`@/modules/vocabulary` (its list, count, value by slug and, for a grouped
kind, its groups), each mapped onto the page's own names, so the deities'
`traditionId` and the astrology services' leading vocabulary stop there.

The page opens the form in a `RouteModal` ([`modal.md`](modal.md)) from its
address. `?new` opens an empty form, and `?edit=<slug>` opens the value at
that slug. `value-dialog.tsx` is the client edge between the server page and
the form, since a server component cannot hand `RouteModal` the function its
contents take. Closing, saving or deleting fades the modal out, then
`router.replace`s the page it opened over, filter and cursor kept
(`closeHref`, from `groupedValuesHref`), so Back does not reopen it, and
`router.refresh()`es so the list re-reads. The planets and signs skipped
that fade on a save until the pages shared it.

A form's slug is its name and its group's (`wax-substance`), a deity's its
name and its tradition's (`hecate-greek`, from `deitySlug`), and a planet's
or a zodiac sign's its name, so a save can move the address; closing after every
save means the modal never sits on a stale one. A deity's address also moves
when its tradition is renamed, or deleted and its deities moved
([`group-form.md`](group-form.md);
[`mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)), so
an old `?edit=` link can go stale without the deity itself changing. An
`?edit=` naming no live value opens nothing and says so above the list in
the shared `MissingNotice`, which names the kind by the list's `noun`:
"No category has that address…", or "No zodiac sign has…".

Why a modal on a URL rather than separate pages or intercepted routes:
[`design-decisions/m5.6-admin-categories.md`](../design-decisions/m5.6-admin-categories.md).

## Styling

The form is the shared pieces on the form primitives
([`styling.md`](../styling.md), "Form fields"): Name and Description are
[`TextField`](field.md)s in a `FormProvider`, the group a `SelectField`, each
with its label row and the `.field__required` asterisk; Save is a
`BusyButton` in a wrapping `.form__actions` row, with Delete pushed to the far
end by `.form__aside`; and the confirmation is a `.form__confirm` with its own
`.modal__actions` row. Under 28rem of the form's own width every row stacks,
full width. Its one rule of its own, `.grouped-value-form__note`, sets the
rename note a step above the actions, with a closer gap between it and them.

The alert above the fields is a `Notice` ([`notice.md`](notice.md)). A
failed request is read by the shared `readGraphqlIssues`
(`src/lib/graphql-failure.ts`, MB.116), which gives every field error of a
`VALIDATION` refusal at once, where `readGraphqlFailure` answers only the
first field it finds. The form places each issue under its field and joins
the rest into the alert. Anything that is not a `VALIDATION` refusal comes
back as one issue carrying the server's sentence, or `GENERIC_FAILURE` when
there is none.

## Stories

[`index.stories.tsx`](../../src/components/GroupedValueForm/index.stories.tsx)
— `AddingACategory`, `EditingACategory`, `AddingAForm`, `EditingAForm`,
`AddingADeity`, `EditingADeity`, `AddingAPlanet` and `EditingAZodiacSign`, each in
the modal and its own iframe, the deities under four invented traditions; `PhoneDark` and `PhoneLight`,
the category's edit at 375px in each theme, where the buttons stack; and
`DeityPhoneDark` and `DeityPhoneLight`, the deity's edit at 375px, its
type-ahead Tradition opening inside the modal. Renaming in `EditingAForm`, `EditingADeity` or
`EditingAZodiacSign` shows the note. The workshop has no API, so a save answers
with the generic error.

## Testing

`tests/components/GroupedValueForm/index.test.tsx`, with the mutations
answered by MSW in the route's own shape. The seven tests every kind shares —
the save rules, the schema's refusal, the busy Save, the slug refusal, Cancel
and the confirmed delete — are rows of `tests/support/grouped-value-form.tsx`,
run once, on the category: a kind shares that code path, so another kind's
run would prove nothing more (MB.189). What only one kind does stays under
that kind's describe: the category's and the form's create and update with
their variables, their confirmations and their delete refusals; the form kind's
group refusal and pathless one placed, and its rename note; and, under `describe('GroupedValueForm, a deity')`, the deity's
create sending its tradition as `traditionId`, its rename saved under its
id after the note, its Tradition typed into, the list narrowing and Enter choosing, text
naming no tradition holding none and refused on Save, a `traditionId`
refusal landing beside Tradition, and
its delete refusal. The flat kinds, the planet and the zodiac sign, are rows of
`describe.each` getting only what they change, their three mutations, the
create sending no group and asking for none. The shared pieces the form is
built from, `TextField`, `SelectField` and `BusyButton`, have no test file
of their own: this one covers them as it uses them. The pages' half is
`tests/app/admin/value-page.test.tsx`, its shape run on the categories and
every other kind getting only its path and its services: `?new` opening the empty modal
without a read, `?edit=` reading the value by its slug and filling the modal
from it, a slug no value holds an alert and any other failure thrown, and
the modal closing back to the page, filter and cursor included, that it
opened over. What the modal shows once open is this file's. `tests/e2e/admin.spec.ts`
adds, renames and deletes a category, a form and a planet through the real server, adds
a deity under a new tradition and moves it when the tradition goes, and is
refused deleting Protection, which seeded compendium entries are filed under.
