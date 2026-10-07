# CategoryForm

`src/components/CategoryForm/` — the admin's category form (M5.6). It has
three fields: a name, a description, and the group the category is filed
under. It saves through `createCategory` or `updateCategory`. On an existing
category it also offers a delete behind a confirmation. It holds no modal of
its own: the page puts it in one.

## Props

`CategoryFormProps` (`types.ts`):

| Prop       | What it is                                                          |
| ---------- | ------------------------------------------------------------------- |
| `category` | The category to edit, as `{ id, name, description, groupId }`       |
| `groups`   | Every live group as `{ id, name }`, alphabetical (MB.35)            |
| `onDone`   | Called after a save or a delete, and on Cancel; the owner closes it |

Without `category`, the form adds one.

## Contracts

- **The shared schema runs first.** react-hook-form runs `CategoryInput`
  (`src/modules/vocabulary/validation/category.ts`) through the Zod resolver
  before any mutation is sent, so a blank name, a blank description or an
  unchosen group never reaches the server. The service runs the same schema
  again (DESIGN.md §7, "Errors").
- **A server field error lands beside its field.** A `VALIDATION` error's
  `fieldErrors` go to `setError` by path: `name`, `description` or `groupId`.
  Anything else renders above the fields in a `role="alert"` notice. The slug
  collision is pathed to `name`, since the slug is derived from the name and
  has no field of its own (MB.43).
- **The group is a closed set**, on the combobox's select-only box
  (`ComboboxSelect`), with the placeholder "Choose a group". It is named
  "Group", and its list is "Group choices". The list floats over the
  modal rather than stretching it, as every combobox list does.
- **All three fields are required**, as the schema and the columns say, and
  each label carries an asterisk in the error red. The asterisk is hidden from
  the field's name: a screen reader hears "Name" and the control's
  `aria-required`.
- **Save is offered only when there is something to save** (the owner's rule
  for every form). It is disabled on a new category until something is typed,
  and on an existing one until something changes, by react-hook-form's
  `isDirty`. Putting a value back disables it again. From the press to the
  answer it is busy and says so: "Saving Category", `aria-busy`, with the
  shared `.spinner` ahead of the label. The confirmation's Delete does the
  same, as "Deleting".
- **A delete asks first, and says what a coven loses.** Delete Category
  replaces the actions with: `Delete "<name>"? Covens' ingredients and spells
filed under it lose it too.` beside Delete and Keep It. A refusal comes back
  as a `FORBIDDEN` naming the compendium entries filed under the category
  ([`db/categories.md`](../db/categories.md), "Category writes"). It is shown in the alert
  notice, and the form stays open with the confirmation withdrawn. Per
  DESIGN.md §7, a refusal that names its remedy is not a bad value in a box,
  so it gets no field.
- **Buttons are title case**: Save Category, Cancel, Delete Category, Delete,
  Keep It. Save Category is the solid one; Cancel and Keep It are quiet, since
  they change nothing; Delete Category and Delete are destructive.

## On the admin page

`/admin/categories` opens the form in `Modal` from its address. `?new` opens an
empty form, and `?edit=<slug>` opens the category at that slug, which the page
reads through `getCategoryBySlug`. `src/app/admin/categories/category-dialog.tsx`
is the client glue between them. Its `onDone` and the modal's `onClose` both
`router.replace` the page the modal opened over, cursor kept, so Back does not
reopen the modal, then `router.refresh()` so the list re-reads after a save or
a delete. An `?edit=` naming no live category, renamed or deleted since the
link was made, opens nothing and says so in an alert above the list.

Why a modal on a URL rather than separate pages or intercepted routes:
[`design-decisions/m5.6-admin-categories.md`](../design-decisions/m5.6-admin-categories.md).

## Styling

Layout only, on the form primitives: the actions wrap, Delete Category sits
at the far end, away from Save and Cancel, and the required asterisk is
`$secondary`. Nothing goes further before
MB.115's design review.

## Testing

`tests/components/CategoryForm/index.test.tsx`, with the mutations answered by
MSW in the route's own shape. The page's half, the address opening and closing
the modal, is `tests/app/admin/categories/page.test.tsx`. The e2e spec adds,
renames and deletes a category through the real server, and is refused
deleting Protection, which seeded compendium entries are filed under.
