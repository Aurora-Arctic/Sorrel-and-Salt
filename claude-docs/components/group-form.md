# GroupForm

`src/components/GroupForm/` is the admin's form for a group (M5.6b). One component serves both group vocabularies, `kind: 'category' | 'form'`, and MB.132's deity traditions can take it as a third. It has a name and a description. A category group adds its chip's two colours, each a [`ChipColorField`](chip-color-field.md). The form saves through `createCategoryGroup` and `updateCategoryGroup`, or the form-group pair. On an existing group it offers Delete Group, which moves the group's rows before deleting it. It holds no modal of its own: the page puts it in one.

It is [`CategoryForm`](category-form.md)'s shape, and everything that page says about field errors, required marks, save rules and title-case buttons holds here. What follows is what a group adds.

## Props

`GroupFormProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`        | `'category'` or `'form'`: which mutations, whether to ask for colours, and the noun for the rows it holds                                                                                                                          |
| `group`       | The group to edit, as `{ id, name, description, colorDark, colorLight }`, the colours `''` for a form group                                                                                                                        |
| `groups`      | Every live group of the kind, `{ id, name }` and for a category group `colorDark` and `colorLight`, alphabetical (MB.35); the move offers every one but `group`, and each colour picker warns of a colour too near another group's |
| `memberCount` | How many live categories or forms `group` holds, which a delete must move; 0 by default                                                                                                                                            |
| `onDone`      | Called after a save or a delete, and on Cancel; the owner closes it                                                                                                                                                                |

Without `group`, the form adds one.

## Contracts

- **The shared schema runs first, the contrast floor included.** react-hook-form runs `CategoryGroupInput` or `IngredientFormGroupInput` (`src/modules/vocabulary/validation/`) through the Zod resolver. A category group's colour under 4.5:1 on its own ground is refused beside its own picker before any request, in the service's words: "The dark theme colour reads 2.16:1 on the dark card — it needs at least 4.5:1" (MB.36, MB.43; [`../styling.md`](../styling.md), "Chips, badges and the solid-fill rule"). The form group's schema drops the two empty colours, so its mutation never receives them. A `VALIDATION` error's `fieldErrors` land beside `name`, `description`, `colorDark` or `colorLight`. Anything else renders above the fields in a `role="alert"` notice.
- **A group holding rows is deleted only once they have somewhere to go.** This is the owner's call ([`m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md)). The delete runs in two steps:
  1. Delete Group replaces the actions with a `ComboboxSelect` labelled "Move its N categories to" (or "forms"), offering every other live group, beside Continue and Keep It. Continue stays disabled until a group is chosen.
  2. Continue asks the admin to confirm the move it names: `Move N categories to "<target>" and delete "<group>"? Each keeps its name, its address and every entry filed under it.` For forms the sentence ends: `Each keeps its name, and its address follows its new group; every ingredient that picked one keeps it.` Move and Delete sends the delete with `moveTo`. Back returns to the choice, still chosen.

  If the group holds no rows, Delete Group asks plainly instead (`Delete "<group>"? No category is filed under it.`) and sends no `moveTo`. If the group holds rows and no other group exists, the form says so ("…and there is no other group to move them to. Add another group first.") and offers only Keep It.

- **A refused move lands beside the picker.** A `VALIDATION` issue at `['moveTo']`, such as a moved form colliding with one already in the target, returns the admin to the choice with the service's sentence under the picker. Any other refusal of the delete shows in the alert notice, and the form stays open with the delete withdrawn.
- **The sample chip carries the name as typed**, or "Sample" before there is one, so the admin sees the chip they are making.
- **Save is offered only when there is something to save**, by `isDirty`. From the press to the answer it is busy and says so: "Saving Group" with the shared `.spinner`. The delete's final button does the same, as "Deleting".
- **Buttons are title case**: Save Group, Cancel, Delete Group, Continue, Keep It, Move and Delete, Back, Delete. Save Group and Continue are solid. Cancel, Keep It and Back are quiet. Delete Group, Move and Delete, and Delete are destructive.

## The pair

A category group's two colours are one family, the owner's call ([`m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md), "A category group's pair keeps one hue"):

- **The colour chosen first fills its partner.** Once one colour is a whole hex and the other is empty, the form sets the other to `pairedColor` (`src/lib/group-colors.ts`): the same hue, the saturation scaled as the seeds scale it, and the lightness nearest the partner's ground that clears 4.6:1 there. A grey fills a grey.
- **The partner follows until the admin sets it.** The form remembers the value it filled, and refills while the partner still holds it, so a picker dragged across the wheel takes its partner along. Typing or picking the partner stops it. An existing group's pair is never refilled, since neither colour starts empty.
- **A colour too near another group's is warned of.** Each picker compares its colour with every other group's in the same theme, from `groups`, the edited group left out, and names the nearest within reach ([`chip-color-field.md`](chip-color-field.md)). It is a warning, not a refusal: Save stays enabled.
- **The schema holds the rule either way.** `CategoryGroupInput` refuses a pair more than 10° apart in hue, or a grey beside a colour, beside the light-theme picker, under the pair: "The two colours are 135° apart in hue — keep them within 10° of each other". It speaks only once both colours have passed their own checks.

## On the admin pages

`/admin/category-groups` and `/admin/form-groups` open the form in `Modal` from their address, as `/admin/categories` does ([`category-form.md`](category-form.md), "On the admin page"). `?new` opens an empty form. `?edit=<slug>` opens the group at that slug, read through `getCategoryGroupBySlug` or `getIngredientFormGroupBySlug`, with `memberCount` counted by `countCategories` or `countIngredientFormValues` under `{ groupId }`. Each page's `group-dialog.tsx` is the client glue: closing `router.replace`s the page the modal opened over, cursor kept (`groupsHref`), then calls `router.refresh()`. An `?edit=` that names no live group opens nothing and says "No group has that address — it may have been renamed or deleted." above the list.

## Styling

Layout only, on the form primitives, as CategoryForm's. The actions wrap, Delete Group sits at the far end, and the required asterisk is `$secondary`. Nothing goes further before MB.115's design review.

## Stories

[`index.stories.tsx`](../../src/components/GroupForm/index.stories.tsx) has three stories: `AddingACategoryGroup`, `EditingACategoryGroup` (three categories held, so Delete Group shows the move) and `EditingAFormGroup` (none held). Each sits in the modal and its own iframe.

## Testing

`tests/components/GroupForm/index.test.tsx` answers the mutations with MSW in the route's own shape. It covers both kinds' fields, create and update with their variables, the contrast refusal before the request, a server field error placed, the two-step move with its variables, Back and Keep It, the no-other-group message, a `moveTo` refusal beside the picker, and the plain delete. The pages' half is `tests/app/admin/{category-groups,form-groups}/page.test.tsx`: the guard refusing before any read, the first page of 25 and every group read for the move, the cursor kept, Add Group on the heading's line, `?new` opening the modal of the page's kind — with the colours or without — and `?edit=` reading the group by its slug, filling the modal and counting what its delete must move, a slug no group holds an alert and any other failure thrown, and the way back to the page it opened over. How the form behaves once open is this file's. Its fields differ from `CategoryForm`'s — no Group picker, two colours — so it is not a row of their shared table.
