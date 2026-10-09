# IngredientFormValueForm

`src/components/IngredientFormValueForm/` — the admin's form for the curated
ingredient-form vocabulary (M5.6a). It has three fields: a name, a
description, and the form group the form is filed under. It saves through
`createIngredientFormValue` or `updateIngredientFormValue`. On an existing
form it also offers a delete behind a confirmation. It holds no modal of its
own: the page puts it in one.

It is named for the GraphQL type, `IngredientFormValue`, because
`IngredientForm` is the ingredient entry form (DESIGN.md §7). The copy calls
a row a "form": Add Form, Save Form.

It is [`CategoryForm`](category-form.md)'s shape, and everything that page
says of its schema, field errors, required marks, save rules and delete
refusal holds here. What follows is what a form adds.

## Props

`IngredientFormValueFormProps` (`types.ts`):

| Prop        | What it is                                                          |
| ----------- | ------------------------------------------------------------------- |
| `formValue` | The form to edit, as `{ id, name, description, groupId }`           |
| `groups`    | Every live form group as `{ id, name }`, alphabetical (MB.35)       |
| `onDone`    | Called after a save or a delete, and on Cancel; the owner closes it |

Without `formValue`, the form adds one.

## Contracts

- **The shared schema runs first.** react-hook-form runs
  `IngredientFormValueInput`
  (`src/modules/vocabulary/validation/ingredient-form-value.ts`) through the
  Zod resolver, so a blank name, a blank description or an unchosen group
  never reaches the server. A `VALIDATION` error's `fieldErrors` land beside
  `name`, `description` or `groupId`, the slug collision on `name`; anything
  else renders above the fields in a `role="alert"` notice.
- **A rename says it carries onto the compendium.** Renaming a form rewrites
  every live compendium entry that picked it, and a form is part of an
  entry's identity and slug, so the rewrite can move those entries' public
  addresses ([`mb.162-compendium-holds-curated-values.md`](../design-decisions/mb.162-compendium-holds-curated-values.md)).
  On an existing form whose name, trimmed, differs from the saved one, a
  `.field__hint` sits above the actions: "Saving renames it on every
  compendium entry that picked it, which can move those entries'
  addresses." Save Form's `aria-describedby` points at it. Putting the name
  back removes it. A new form has no entries, so it never shows there; nor
  does a change of group, which moves no entry.
- **A rename that would end a redirect asks first** (MB.82;
  [`db/ingredient-slugs.md`](../db/ingredient-slugs.md)). When a re-slugged
  entry would take an address another entry's redirect still runs from, the
  service refuses with a `VALIDATION` issue at `['endRedirect']`, naming the
  entries and when their windows close. The form shows the service's
  sentence in a `role="alert"` paragraph in place of the actions, beside
  Rename Anyway and Keep Editing. Rename Anyway sends the same input again
  with `endRedirect: true`, busy as "Renaming" with the shared `.spinner`.
  Keep Editing withdraws the question, and so does any edit to a field,
  since the question was about the input that was refused. The compendium's
  admin form, M5.5, is the other place this question will be asked; it has
  no component yet to share.
- **A delete asks first, and says what it does.** Delete Form replaces the
  actions with: `Delete "<name>"? It can't be deleted while a compendium
entry picks it. Covens' ingredients keep what they wrote, which then counts
as their own value rather than a curated one; nothing of theirs changes.`
  beside Delete and Keep It. The refusal of a form a live compendium entry
  picks comes back as a plain message naming the entries. It is shown in the
  alert notice, and the form stays open with the confirmation withdrawn.
- **Save is offered only when there is something to save**, by
  react-hook-form's `isDirty`, and from the press to the answer it is busy
  and says so: "Saving Form", `aria-busy`, with the shared `.spinner`. The
  confirmation's Delete does the same, as "Deleting".
- **Buttons are title case**: Save Form, Cancel, Delete Form, Delete, Keep
  It, Rename Anyway, Keep Editing. Save Form and Rename Anyway are solid;
  Cancel, Keep It and Keep Editing are quiet, since they change nothing;
  Delete Form and Delete are destructive. Rename Anyway is not destructive:
  the entry whose redirect it ends keeps a link from the page at its old
  address until the window closes.

## On the admin page

`/admin/forms` opens the form in `Modal` from its address, as
`/admin/categories` does ([`category-form.md`](category-form.md), "On the
admin page"). `?new` opens an empty form, and `?edit=<slug>` opens the form
at that slug, which the page reads through `getIngredientFormValueBySlug`.
`src/app/admin/forms/form-dialog.tsx` is the client glue: its `onDone` and
the modal's `onClose` both `router.replace` the page the modal opened over,
cursor kept (`closeHref`, from `formsHref`), then `router.refresh()`. A
form's slug is its name and its group's (`wax-substance`), so a save that
changes either can move the address; closing after every save means the
modal never sits on a stale one. An `?edit=` naming no live form opens
nothing and says "No form has that address — it may have been renamed or
deleted." above the list.

## Styling

Layout only, on the form primitives, as CategoryForm's: the actions wrap,
Delete Form sits at the far end, the required asterisk is `$secondary`, and
the rename note sits a step above the actions with a closer gap between it
and them. Nothing goes further before MB.115's design review.

## Stories

[`index.stories.tsx`](../../src/components/IngredientFormValueForm/index.stories.tsx)
— `Adding` and `Editing`, each in the modal and its own iframe. Renaming in
`Editing` shows the note. The workshop has no API, so a save answers with
the generic error.

## Testing

`tests/components/IngredientFormValueForm/index.test.tsx`, with the
mutations answered by MSW in the route's own shape: the fields, the schema's
refusals, create, update and delete with their variables, server field
errors placed, the save rules, the rename note, the redirect question sent
again with `endRedirect` and withdrawn by an edit or Keep Editing, and the
delete's confirmation and refusal. The nine tests it shares with
`CategoryForm` are rows of `tests/support/grouped-value-form.tsx`
(category-form.md, "Testing"). The page's half is
`tests/app/admin/forms/page.test.tsx`: `?new` opening the empty modal with
every group to choose from and without a read, `?edit=` reading the form by
its slug and filling the modal from it, a slug no form holds an alert and any
other failure thrown, and the modal closing back to the page, filter and
cursor included, that it opened over, re-reading it. What the modal shows once
open is this file's. `tests/e2e/admin.spec.ts` adds,
renames and deletes a form through the real server, and is refused
deleting Root, which seeded compendium entries pick.
