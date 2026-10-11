# GroupedValueForm

`src/components/GroupedValueForm/` — the admin's form for a grouped curated
value: a category (M5.6), a curated ingredient form (M5.6a) or a curated
deity (MB.132). One component serves every such vocabulary, `kind:
'category' | 'form' | 'deity'`, as [`GroupForm`](group-form.md) serves their
groups, so the deities are a third kind rather than a third copy. It has three
fields: a name, a description, and the group the value is filed under — a
deity's is its tradition. It saves through the kind's create or update
mutation — `createCategory` and `updateCategory`,
`createIngredientFormValue` and `updateIngredientFormValue`, or
`createDeity` and `updateDeity`. On an existing
value it also offers a delete behind a confirmation. It holds no modal of
its own: the page puts it in one.

The form kind is named for the GraphQL type, `IngredientFormValue`, because
`IngredientForm` is the ingredient entry form (DESIGN.md §7). The copy calls
a row a "form": Add Form, Save Form.

## Props

`GroupedValueFormProps` (`types.ts`):

| Prop     | What it is                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `kind`   | `'category'`, `'form'` or `'deity'`: which mutations, which schema, and what the copy calls the value |
| `value`  | The value to edit, as `{ id, name, description, groupId }`                                            |
| `groups` | Every live group of the kind as `{ id, name }`, alphabetical (MB.35)                                  |
| `onDone` | Called after a save or a delete, and on Cancel; the owner closes it                                   |

Without `value`, the form adds one.

## Kinds

Everything that tells one kind from another is its entry in `index.tsx`'s
`KINDS`, declared through `defineKind`, so a new kind is an entry there and
its three mutation documents, and nothing else:

- **Its copy**: `noun`, the title-case word the buttons say ("Category",
  "Form", "Deity"); `groupLabel` and `groupPlaceholder`, the group field's
  label and what it shows until one is chosen ("Group", "Choose a group"; a
  deity's "Tradition", "Choose a tradition"); `deleteNote`, what the
  confirmation says after `Delete "<name>"?`; and `renameNote`, for a kind
  whose rename reaches further than its row (the form's and the deity's).
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
- **The group is a closed set**, on the combobox's select-only box
  (`ComboboxSelect`), with the kind's placeholder, "Choose a group". It is
  named by the kind's label, "Group", and its list is "Group choices"; a
  deity's is "Tradition", "Choose a tradition" and "Tradition choices". The
  list floats over the modal rather than stretching it, as every combobox
  list does.
- **All three fields are required**, as the schema and the columns say, and
  each label carries an asterisk in the error red. The asterisk is hidden from
  the field's name: a screen reader hears "Name" and the control's
  `aria-required`.
- **Save is offered only when there is something to save** (the owner's rule
  for every form). It is disabled on a new value until something is typed,
  and on an existing one until something changes, by react-hook-form's
  `isDirty`. Putting a value back disables it again. From the press to the
  answer it is busy and says so: "Saving Category", "Saving Form" or
  "Saving Deity",
  `aria-busy`, with the shared `.spinner` ahead of the label. The
  confirmation's Delete does the same, as "Deleting".
- **A form's or a deity's rename says it carries onto the compendium.**
  Renaming a form rewrites every live compendium entry that picked it, and a
  form is part of an entry's identity and slug, so the rewrite can move those
  entries' public addresses ([`mb.162-compendium-holds-curated-values.md`](../design-decisions/mb.162-compendium-holds-curated-values.md)).
  Renaming a deity rewrites the name on every live compendium entry's
  `ingredient_deities` row that picked it, but a deity is no part of an
  entry's identity, so no address moves
  ([`mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)).
  On an existing value of a kind with a `renameNote`, whose name, trimmed,
  differs from the saved one, a `.field__hint` sits above the actions: for a
  form, "Saving renames it on every compendium entry that picked it, which
  can move those entries' addresses."; for a deity, "Saving renames it on
  every compendium entry that picked it." Save's `aria-describedby` points
  at it. Putting the name back removes it. A new value has no entries, so it
  never shows there; nor does a change of group, which moves no entry. A
  category has no note.
- **A rename that would end a redirect asks first** (MB.82;
  [`db/ingredient-slugs.md`](../db/ingredient-slugs.md)). When a re-slugged
  entry would take an address another entry's redirect still runs from, the
  service refuses with a `VALIDATION` issue at `['endRedirect']`, naming the
  entries and when their windows close. Today only the form kind's service
  sends one — a deity's rename moves no entry's address, so its service
  never does — but the question is the refusal's, not the kind's, so every
  kind asks it. The form shows the service's sentence in a `role="alert"`
  paragraph in place of the actions, beside Rename Anyway and Keep Editing.
  Rename Anyway sends the same input again with `endRedirect: true`, busy as
  "Renaming" with the shared `.spinner`. Keep Editing withdraws the question,
  and so does any edit to a field, since the question was about the input
  that was refused. The compendium's admin form, M5.5, is the other place
  this question is asked; it has no component to share.
- **A delete asks first, and says what it does.** Delete Category, Delete
  Form or Delete Deity replaces the actions with `Delete "<name>"?` and the
  kind's note,
  beside Delete and Keep It. A category's: `Covens' ingredients and spells
filed under it lose it too.` A form's: `It can't be deleted while a
compendium entry picks it. Covens' ingredients keep what they wrote, which
then counts as their own value rather than a curated one; nothing of theirs
changes.` A deity's is the form's, word for word. A refusal comes back as a
  `FORBIDDEN` naming the compendium entries filed under the category
  ([`db/categories.md`](../db/categories.md), "Category writes"), or as a
  plain message naming the entries that pick the form or the deity. It is
  shown in the alert notice, and the form stays open with the
  confirmation withdrawn. Per DESIGN.md §7, a refusal that names its remedy is
  not a bad value in a box, so it gets no field.
- **Buttons are title case**: Save Category, Save Form or Save Deity, Cancel,
  Delete Category, Delete Form or Delete Deity, Delete, Keep It, Rename
  Anyway, Keep Editing. Save
  and Rename Anyway are solid; Cancel, Keep It and Keep Editing are quiet,
  since they change nothing; the two deletes are destructive. Rename Anyway
  is not destructive: the entry whose redirect it ends keeps a link from the
  page at its old address until the window closes.

## On the admin pages

`/admin/categories`, `/admin/forms` and `/admin/deities` open the form in
`Modal` from their address. `?new` opens an empty form, and `?edit=<slug>`
opens the value at that slug, which the page reads through
`getCategoryBySlug`, `getIngredientFormValueBySlug` or `getDeityBySlug`.
Each page's dialog, `src/app/admin/categories/category-dialog.tsx`,
`src/app/admin/forms/form-dialog.tsx` or
`src/app/admin/deities/deity-dialog.tsx`, is the client glue between them. Its
`onDone` and the modal's `onClose` both `router.replace` the page the modal
opened over, filter and cursor kept (`closeHref`, from `groupedValuesHref`),
so Back does not reopen the modal, then `router.refresh()` so the list
re-reads after a save or a delete. A form's slug is its name and its group's
(`wax-substance`), and a deity's its name and its tradition's
(`hecate-greek`, from `deitySlug`), so a save that changes either can move
the address; closing after every save means the modal never sits on a stale
one. A deity's address also moves when its tradition is renamed, or deleted
and its deities moved ([`group-form.md`](group-form.md);
[`mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)), so
an old `?edit=` link can go stale without the deity itself changing. An
`?edit=` naming no live value, renamed or deleted since the link was
made, opens nothing and says so in an alert above the list: "No category has
that address — it may have been renamed or deleted.", or "No form has…", or
"No deity has…".

Why a modal on a URL rather than separate pages or intercepted routes:
[`design-decisions/m5.6-admin-categories.md`](../design-decisions/m5.6-admin-categories.md).

## Styling

Layout only, on the form primitives, `.grouped-value-form`: the actions
wrap, the delete sits at the far end, away from Save and Cancel, the
required asterisk is `$secondary`, and the rename note sits a step above the
actions with a closer gap between it and them. Nothing goes further before
MB.115's design review.

## Stories

[`index.stories.tsx`](../../src/components/GroupedValueForm/index.stories.tsx)
— `AddingACategory`, `EditingACategory`, `AddingAForm`, `EditingAForm`,
`AddingADeity` and `EditingADeity`, each in the modal and its own iframe,
the deities under invented traditions. Renaming in `EditingAForm` or
`EditingADeity` shows the note. The workshop has no API, so a save answers
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
group refusal and pathless one placed, its rename note, and the redirect
question sent again with `endRedirect` and withdrawn by an edit or Keep
Editing; and, under `describe('GroupedValueForm, a deity')`, the deity's
create sending its tradition as `traditionId`, its rename saved under its
id after the note, a `traditionId` refusal landing beside Tradition, and
its delete refusal. The pages' half is
`tests/app/admin/categories/page.test.tsx`,
`tests/app/admin/forms/page.test.tsx` and
`tests/app/admin/deities/page.test.tsx`: `?new` opening the empty modal
without a read, `?edit=` reading the value by its slug and filling the modal
from it, a slug no value holds an alert and any other failure thrown, and
the modal closing back to the page, filter and cursor included, that it
opened over. What the modal shows once open is this file's. `tests/e2e/admin.spec.ts`
adds, renames and deletes a category and a form through the real server, adds
a deity under a new tradition and moves it when the tradition goes, and is
refused deleting Protection, which seeded compendium entries are filed under.
