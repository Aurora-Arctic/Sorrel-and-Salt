# GroupForm

`src/components/GroupForm/` is the admin's form for a group (M5.6b). One component serves every group vocabulary, `kind: 'category' | 'form' | 'tradition'`: MB.132's deity traditions take it as the third. It has a name and a description. A category group adds its chip's two colours, each a [`ChipColorField`](chip-color-field.md). The form saves through `createCategoryGroup` and `updateCategoryGroup`, the form-group pair, or `createDeityTradition` and `updateDeityTradition`. On an existing group it offers Delete Group (Delete Tradition), which moves the group's rows before deleting it. It holds no modal of its own: the page puts it in one.

It is [`GroupedValueForm`](grouped-value-form.md)'s shape, and everything that page says about field errors, required marks, save rules and title-case buttons holds here. What follows is what a group adds.

## Props

`GroupFormProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`        | `'category'`, `'form'` or `'tradition'`: which mutations, whether to ask for colours, and the nouns for the group and the rows it holds                                                                                            |
| `group`       | The group to edit, as `{ id, name, description, colorDark, colorLight }`, the colours `''` for a form group or a tradition                                                                                                         |
| `groups`      | Every live group of the kind, `{ id, name }` and for a category group `colorDark` and `colorLight`, alphabetical (MB.35); the move offers every one but `group`, and each colour picker warns of a colour too near another group's |
| `memberCount` | How many live categories, forms or deities `group` holds, which a delete must move; 0 by default                                                                                                                                   |
| `onDone`      | Called after a save or a delete, and on Cancel; the owner closes it                                                                                                                                                                |

Without `group`, the form adds one.

## Kinds

Everything that tells one kind from another is its entry in `index.tsx`'s `KINDS`, a `GroupFormKind` (`types.ts`): `group` and `title`, what the copy calls a group, lower-case and title case ("group" and "Group", or a tradition's "tradition" and "Tradition"); `one` and `many`, the rows it holds ("category", "forms", "deities"); `moved`, what the move's confirmation says the rows keep; its resolver; and its `save` and `remove` requests. A tradition is a form group's shape under its own nouns, so a new group vocabulary is an entry there, its three mutation documents, and nothing else. The `group` noun reaches every sentence that names a group: the move picker's placeholder ("Choose a group", "Choose a tradition"), the no-other-group message, and the buttons (Save Group, Save Tradition; Delete Group, Delete Tradition).

## Contracts

- **The shared schema runs first, the contrast floor included.** react-hook-form runs `CategoryGroupInput`, `IngredientFormGroupInput` or `DeityTraditionInput` (`src/modules/vocabulary/validation/`) through the Zod resolver. A category group's colour under 4.5:1 on its own ground is refused beside its own picker before any request, in the service's words: "The dark theme colour reads 2.16:1 on the dark card — it needs at least 4.5:1" (MB.36, MB.43; [`../styling.md`](../styling.md), "Chips, badges and the solid-fill rule"). The form group's and the tradition's schemas drop the two empty colours, so their mutations never receive them. A `VALIDATION` error's `fieldErrors` land beside `name`, `description`, `colorDark` or `colorLight`. Anything else renders above the fields in a `role="alert"` notice.
- **A group holding rows is deleted only once they have somewhere to go.** This is the owner's call ([`m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md)). The delete runs in two steps:
  1. Delete Group replaces the actions with a `ComboboxSelect` labelled "Move its N categories to" (or "forms", or "deities"), offering every other live group, beside Continue and Keep It. Continue stays disabled until a group is chosen.
  2. Continue asks the admin to confirm the move it names: `Move N categories to "<target>" and delete "<group>"? Each keeps its name, its address and every entry filed under it.` For forms the sentence ends: `Each keeps its name, and its address follows its new group; every ingredient that picked one keeps it.` For deities: `Each keeps its name, and its address follows its new tradition; every ingredient that picked one keeps it.` A form's slug carries its group's name and a deity's its tradition's, so each moved row is re-slugged ([`mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)). Move and Delete sends the delete with `moveTo`. Back returns to the choice, still chosen.

  If the group holds no rows, Delete Group asks plainly instead (`Delete "<group>"? No category is filed under it.`, or `No deity…`) and sends no `moveTo`. If the group holds rows and no other group exists, the form says so ("…and there is no other group to move them to. Add another group first.", or "tradition" for a tradition) and offers only Keep It.

- **A refused move lands beside the picker.** A `VALIDATION` issue at `['moveTo']`, such as a moved form or deity colliding with one already in the target, returns the admin to the choice with the service's sentence under the picker. Any other refusal of the delete shows in the alert notice, and the form stays open with the delete withdrawn.
- **The sample chip carries the name as typed**, or "Sample" before there is one, so the admin sees the chip they are making.
- **Save is offered only when there is something to save**, by `isDirty`. From the press to the answer it is busy and says so: "Saving Group" or "Saving Tradition" with the shared `.spinner`. The delete's final button does the same, as "Deleting".
- **Buttons are title case**: Save Group, Cancel, Delete Group, Continue, Keep It, Move and Delete, Back, Delete; a tradition's Save Tradition and Delete Tradition. Save and Continue are solid. Cancel, Keep It and Back are quiet. Delete Group (Delete Tradition), Move and Delete, and Delete are destructive.

## The pair

A category group's two colours are one family, the owner's call ([`m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md), "A category group's pair keeps one hue"):

- **The colour chosen first fills its partner.** Once one colour is a whole hex and the other is empty, the form sets the other to `pairedColor` (`src/lib/group-colors.ts`): the same hue, the saturation scaled as the seeds scale it, and the lightness nearest the partner's ground that clears 4.6:1 there. A grey fills a grey.
- **The partner follows until the admin sets it.** The form remembers the value it filled, and refills while the partner still holds it, so a picker dragged across the wheel takes its partner along. Typing or picking the partner stops it. An existing group's pair is never refilled, since neither colour starts empty.
- **A colour too near another group's is warned of.** Each picker compares its colour with every other group's in the same theme, from `groups`, the edited group left out, and names the nearest within reach ([`chip-color-field.md`](chip-color-field.md)). It is a warning, not a refusal: Save stays enabled.
- **The schema holds the rule either way.** `CategoryGroupInput` refuses a pair more than 10° apart in hue, or a grey beside a colour, beside the light-theme picker, under the pair: "The two colours are 135° apart in hue — keep them within 10° of each other". It speaks only once both colours have passed their own checks.

## On the admin pages

`/admin/category-groups`, `/admin/form-groups` and `/admin/deity-traditions` open the form in `Modal` from their address, as `/admin/categories` does ([`grouped-value-form.md`](grouped-value-form.md), "On the admin pages"). `?new` opens an empty form. `?edit=<slug>` opens the group at that slug, read through `getCategoryGroupBySlug`, `getIngredientFormGroupBySlug` or `getDeityTraditionBySlug`, with `memberCount` counted by `countCategories` or `countIngredientFormValues` under `{ groupId }`, or `countDeities` under `{ traditionId }`. Each page's dialog, `group-dialog.tsx` or the traditions page's `tradition-dialog.tsx`, is the client glue: closing `router.replace`s the page the modal opened over, cursor kept (`groupsHref`), then calls `router.refresh()`. An `?edit=` that names no live group opens nothing and says "No group has that address — it may have been renamed or deleted." above the list, or "No tradition has…". Renaming a tradition re-slugs its deities, as renaming a form group re-slugs its forms, so it moves their addresses on `/admin/deities` as well as its own.

## Styling

Layout only, on the form primitives, as GroupedValueForm's. The actions wrap, Delete Group sits at the far end, and the required asterisk is `$secondary`. Nothing goes further before MB.115's design review.

## Stories

[`index.stories.tsx`](../../src/components/GroupForm/index.stories.tsx) has five stories: `AddingACategoryGroup`, `EditingACategoryGroup` (three categories held, so Delete Group shows the move), `EditingAFormGroup` (none held), `AddingATradition`, and `EditingATradition` (two deities held, so Delete Tradition shows the move to the other invented tradition). Each sits in the modal and its own iframe.

## Testing

`tests/components/GroupForm/index.test.tsx` answers the mutations with MSW in the route's own shape. It covers the kinds' fields, create and update with their variables, the contrast refusal before the request, a server field error placed, the two-step move with its variables, Back and Keep It, the no-other-group message, a `moveTo` refusal beside the picker, and the plain delete. `describe('GroupForm, for a deity tradition')` holds the tradition's own: no colours asked for and a create from the name and description alone, its deities moved on a confirmed delete with the sentence saying their addresses follow the tradition, and the no-other-tradition message. The pages' half is `tests/app/admin/{category-groups,form-groups,deity-traditions}/page.test.tsx`: the guard refusing before any read, the first page of 25 and every group read for the move, the cursor kept, Add Group on the heading's line, `?new` opening the modal of the page's kind — with the colours or without — and `?edit=` reading the group by its slug, filling the modal and counting what its delete must move, a slug no group holds an alert and any other failure thrown, and the way back to the page it opened over. How the form behaves once open is this file's. Its fields differ from `GroupedValueForm`'s — no Group picker, two colours — so it is not a row of that form's shared table.
