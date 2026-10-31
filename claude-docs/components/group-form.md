# GroupForm

`src/components/GroupForm/` is the admin's form for a group (M5.6b). One component serves every group vocabulary, `kind: 'category' | 'form' | 'tradition'`: MB.132's deity traditions take it as the third. It has a name and a description. A category group adds its chip's two colours, each a [`ChipColorField`](chip-color-field.md); a form group adds its icon (M12.7), a labelled radio group (Icon) of the six icons and then None last, laid out as a compact strip (`RadioGroupField`'s `layout="strip"`, [`field.md`](field.md)): one bar of icon-only segments, each drawing its [`FormIcon`](form-icon.md) with its name in a tooltip above it, the chosen name printed beneath, in the place the colours take. The strip replaced labelled tiles, which wrapped unevenly (the owner's call, 2026-10-16). None is the generic salt spoon and is sent as `icon: null`, which clears the icon; the create and update documents select and send `icon`. `GroupValues.icon` is `''` for None and for the other kinds, whose schemas drop it, and a form group's schema turns the `''` into `null` before the request. The form saves through `createCategoryGroup` and `updateCategoryGroup`, the form-group pair, or `createDeityTradition` and `updateDeityTradition`. On an existing group it offers Delete Group (Delete Tradition), which moves the group's rows before deleting it. It holds no modal of its own: the page puts it in one.

It is [`GroupedValueForm`](grouped-value-form.md)'s shape, and everything that page says about field errors, required marks, save rules and title-case buttons holds here. What follows is what a group adds.

## Props

`GroupFormProps` (`types.ts`):

| Prop          | What it is                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`        | `'category'`, `'form'` or `'tradition'`: which mutations, whether to ask for colours, and the nouns for the group and the rows it holds                                                                                                 |
| `group`       | The group to edit, as `{ id, name, description, colorDark, colorLight, icon }`, the colours `''` for a form group or a tradition, `icon` a icon name or `''` for none                                                                   |
| `groups`      | Every live group of the kind, `{ id, name }`, for a category group `color`, for a form group its `icon`, alphabetical (MB.35); the move offers every one but `group`, and each colour picker warns of a colour too near another group's |
| `memberCount` | How many live categories, forms or deities `group` holds, which a delete must move; 0 by default                                                                                                                                        |
| `onDone`      | Called after a save or a delete, and on Cancel, after Discard Changes if anything changed; the owner closes it                                                                                                                          |

Without `group`, the form adds one.

## Kinds

Everything that tells one kind from another is its entry in `index.tsx`'s `KINDS`, a `GroupFormKind` (`types.ts`), for what only the form says; the nouns are the list's (`GroupList/kinds.ts`: `noun`, which the form also title-cases, and the held kind's `noun` and `plural` from `GroupedValueList/kinds.ts`): `moved`, what the move's confirmation says the rows keep; `describe`, the Description's placeholder, a one-line prompt; its resolver; and its `save` and `remove` requests. A tradition is a form group's shape under its own nouns, so a new group vocabulary is an entry there and one in the list's kind table, its three mutation documents, and nothing else. The group noun reaches every sentence that names a group: the move picker's placeholder ("Choose a group", "Choose a tradition"), the no-other-group message, and the buttons (Save Group, Save Tradition; Delete Group, Delete Tradition).

## Contracts

- **The shared schema runs first, the contrast floor included.** react-hook-form runs `CategoryGroupInput`, `IngredientFormGroupInput` or `DeityTraditionInput` (`src/modules/vocabulary/validation/`) through the Zod resolver. A category group's colour under 4.5:1 on its own ground is refused beside its own picker before any request, in the service's words: "The dark theme colour reads 2.16:1 on the dark card — it needs at least 4.5:1" (MB.36, MB.43; [`../styling.md`](../styling.md), "Chips, badges and the solid-fill rule"). The form group's and the tradition's schemas drop the two empty colours, so their mutations never receive them. A `VALIDATION` error's `fieldErrors` land beside `name`, `description`, `color` or `icon`. Anything else renders above the fields in a `role="alert"` notice.
- **A group holding rows is deleted only once they have somewhere to go.** This is the owner's call ([`m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md)). The delete runs in two steps, each a question asked over the form, which is dimmed and held until it is answered (MB.115, the owner's call; [`modal.md`](modal.md), "Asking over the form"):
  1. Delete Group asks with a `ComboboxSelect` labelled, in title case as every label is, "Move Its N Categories To" (or "Forms", or "Deities"; "Move Its 1 Category To" for one), offering every other live group, beside Continue and Cancel; the picker's label names the question. For forms each choice draws its group's icon before its name, the generic spoon where the group has none, as the chosen value does (M12.7); the other kinds draw none. Continue stays disabled until a group is chosen. Cancel takes the focus.
  2. Continue asks the admin to confirm the move it names: `Move N categories to "<target>" and delete "<group>"? Each category keeps its name, its address and the entries filed under it.` For forms the sentence ends: `Each form keeps its name and takes its new group's address.` For deities: `Each deity keeps its name and takes its new tradition's address.` A category's slug is its name alone, so a moved category keeps its address. A form's slug carries its group's name and a deity's its tradition's, so each moved row is re-slugged ([`mb.132-admin-deities.md`](../design-decisions/mb.132-admin-deities.md)). Move and Delete sends the delete with `moveTo`. Back, which takes the focus, returns to the choice, still chosen. Each step is its own question, keyed by its step, so each takes the focus on its own safe answer; Cancel puts the delete away and the focus back on Delete Group.

  If the group holds no rows, Delete Group asks plainly instead (`Delete "<group>"? No categories are filed under it.`, or `No forms…`, `No deities…`) and sends no `moveTo`. If the group holds rows and no other group exists, the form says so (`"<group>" holds N categories, and there's no other group to move them to. Add another group first, then delete this one.`, or "tradition" for a tradition) and offers only Cancel.

- **A refused move lands beside the picker.** A `VALIDATION` issue at `['moveTo']`, such as a moved form or deity colliding with one already in the target, returns the admin to the choice with the service's sentence under the picker. Any other refusal of the delete shows in the alert notice, and the form stays open with the delete withdrawn.
- **The sample chip carries the name as typed**, or "Sample" before there is one, so the admin sees the chip they are making.
- **Save is offered only when there is something to save**, by `isDirty`. From the press to the answer it is busy and says so, as a [`BusyButton`](busy-button.md): "Saving Group" or "Saving Tradition" behind the shared `.spinner`. The delete's final button is one too, busy as "Deleting".
- **Unsaved changes are asked about** (MB.115, the owner's call). The form hands `formState.isDirty` to the shared guard ([`modal.md`](modal.md#unsaved-changes)). Its question comes ahead of a delete step and replaces it until answered; Discard Changes calls `onDone`.
- **Buttons are title case**: Save Group, Cancel, Delete Group, Continue, Move and Delete, Back, Delete, Discard Changes, Keep Editing; a tradition's Save Tradition and Delete Tradition. Save and Continue are solid. Cancel, Back and Keep Editing are quiet. Delete Group (Delete Tradition), Move and Delete, Delete and Discard Changes are destructive.

- **Undo and redo** ([`field.md`](field.md#undo-and-redo), M12.9). The form calls `useFormHistory` on its `<form>`, and provides it to `FormHistoryButtons`; the hook listens for its chords on the form itself. It is off while the unsaved-changes question or either delete step is up. Undoing a colour redraws its hex box, picker and sample chip from the restored value, since `ChipColorField` re-derives them from its `value`; a colour and the partner it filled are one step.

## The pair

A category group's two colours are one family, the owner's call ([`m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md), "A category group's pair keeps one hue"):

- **The colour chosen first fills its partner.** Once one colour is a whole hex and the other is empty, the form sets the other to `pairedColor` (`src/lib/group-colors.ts`): the same hue, the saturation scaled as the seeds scale it, and the lightness nearest the partner's ground that clears 4.6:1 there. A grey fills a grey.
- **The partner follows until the admin sets it.** The form remembers the value it filled, and refills while the partner still holds it, so a picker dragged across the wheel takes its partner along. Typing or picking the partner stops it. An existing group's pair is never refilled, since neither colour starts empty.
- **A colour too near another group's is warned of.** Each picker compares its colour with every other group's in the same theme, from `groups`, the edited group left out, and names the nearest within reach ([`chip-color-field.md`](chip-color-field.md)). It is a warning, not a refusal: Save stays enabled.
- **The schema holds the rule either way.** `CategoryGroupInput` refuses a pair more than 10° apart in hue, or a grey beside a colour, beside the light-theme picker, under the pair: "The two colours are 135° apart in hue — keep them within 10° of each other". It speaks only once both colours have passed their own checks.

## On the admin pages

`/admin/category-groups`, `/admin/form-groups` and `/admin/deity-traditions` are one page, `src/app/(shell)/admin/group-page.tsx`'s `GroupPage`, each route's `page.tsx` naming its kind and keeping its tab title. It opens the form in a `RouteModal` ([`modal.md`](modal.md)) from the address, or at once from a press on an Edit or Add (M9.18; [`modal.md`](modal.md), "Opening at once"), as `/admin/categories` does ([`grouped-value-form.md`](grouped-value-form.md), "On the admin pages"). `?new` opens an empty form, titled "Add Category Group". `?edit=<slug>` opens the group at that slug, under an eyebrow, "Edit Category Group", with the group's saved name as its title ([`modal.md`](modal.md), "An edit dialog's head"), read through `getCategoryGroupBySlug`, `getIngredientFormGroupBySlug` or `getDeityTraditionBySlug`, with `memberCount` counted by `countCategories` or `countIngredientFormValues` under `{ groupId }`, or `countDeities` under `{ traditionId }`. `src/app/(shell)/admin/group-dialog.tsx` is the client edge between the server page and the form, since a server component cannot hand `RouteModal` the function its contents take. The page renders it always, with `opened` (`{ heading, group, memberCount }`) only when the address opens a modal, and the form is keyed by the group's id. Closing, saving or deleting fades the modal out, then `router.replace`s the page it opened over, cursor kept (`groupsHref`), and calls `router.refresh()`. An `?edit=` that names no live group opens nothing and says so above the list in the shared `MissingNotice`: "No group has that address. It may have been renamed or deleted, so search for it in the list.", or "No tradition has…". Renaming a tradition re-slugs its deities, as renaming a form group re-slugs its forms, so it moves their addresses on `/admin/deities` as well as its own.

## Styling

The form has no stylesheet of its own: it is built from the shared pieces and the form primitives ([`../styling.md`](../styling.md), "Form fields").

- **Name and Description are [`TextField`](field.md)s** in a `FormProvider`, each with its label row, required mark and a short placeholder, "Add a name" and the kind's `describe`, a one-line prompt such as "What the categories in this group share" ([`field.md`](field.md), "Contracts"). The description's textarea takes the primitive's height rather than three rows of its own.
- **Each colour is a `FieldShell` around a [`ChipColorField`](chip-color-field.md).** The shell draws the label, its mark and its hint, the info tip saying which theme the colour is for, the hex form, its 4.5:1 floor and the partner it fills, and names the hex box, whose placeholder is "Add a hex"; it is handed no error, since ChipColorField draws the refusal itself, between its ratio and its warning.
- **The move picker is a `FieldShell` around the `ComboboxSelect`**, its error beneath it as any field's is.
- **The buttons are `.form__actions`**, which wraps, with Delete Group pushed to the far end by `.form__aside`: the shared [`FormActions`](field.md) row. They stay where they are while a question is asked: the question is a `ConfirmOverlay` card over the form, with its own `.modal__actions` row ([`modal.md`](modal.md), "Asking over the form"); the confirming step's two, Delete and Move and Delete, are the shared `ConfirmQuestion` ([`modal.md`](modal.md), "`ConfirmQuestion`"). Narrow rows stack ([`styling.md`](../styling.md), "A narrow form stacks its buttons").

The alert above the fields is a `Notice` ([`notice.md`](notice.md)). A
failed request is read by the shared `readGraphqlIssues`
(`src/lib/graphql-failure.ts`, MB.116), which gives every field error of a
`VALIDATION` refusal at once, where `readGraphqlFailure` answers only the
first field it finds. The form places each issue under its field and joins
the rest into the alert, through the shared `placeServerIssues` beside it. Anything that is not a `VALIDATION` refusal comes
back as one issue carrying the server's sentence, or `GENERIC_FAILURE` when
there is none.

## Stories

[`index.stories.tsx`](../../src/components/GroupForm/index.stories.tsx),
`Admin / Group Form`, each in the modal and its own iframe. `States` has a control that chooses:

- Adding A Category Group and Editing A Category Group (three categories held,
  so Delete Group shows the move).
- Adding A Form Group.
- Editing A Tradition (two deities held, so Delete
  Tradition shows the move to the other invented tradition).
- Saving Empty Category Group and Saving Empty Form Group: Save pressed on an empty form.

`AskingWhereToMove` is its own story: the category group's edit with Delete Group pressed
once drawn, the first step of the delete over the form, which is dimmed and
held beneath it.

## Testing

`tests/components/GroupForm/index.test.tsx` answers the mutations with MSW in the route's own shape. It covers the kinds' fields, create and update with their variables, the contrast refusal before the request, a server field error placed, the two-step move with its variables, Back and Cancel, each step asked over the form in a modal (the form inert, the focus on Cancel, then Back, then Cancel, then back on Delete Group), no move offered when there is no other group, a `moveTo` refusal beside the picker, the plain delete, and its unsaved-changes wiring, the form in a modal (`tests/support/discard-guard.tsx`): Cancel and Escape asking after a change, and Discard Changes closing. ``describe('GroupForm, for a form group')`holds the icon's: the radio group offered for a form group and not for a category group or a tradition, each option drawing its`FormIcon`, and the chosen icon or null for None reaching the update. The row it stores is the service's (`tests/modules/vocabulary/services/ingredient-form-groups.test.ts`). `describe('GroupForm, for a deity tradition')`holds the tradition's own: no colours asked for and a create from the name and description alone, and its deities moved on a confirmed delete. The pages' half is`tests/app/(shell)/admin/group-page.test.tsx`, run on the category groups, the form groups and the traditions getting only their path and their services: the guard refusing before any read, the first page of 25 and its "Page X of Y" counted from its first row, every group read for the move, the cursor kept, the traditions' `?query=`reaching their service and kept on every link while a kind without a search reads none,`?new`opening the modal of the page's kind — with the colours or without — and`?edit=`reading the group by its slug, filling the modal and counting what its delete must move, a slug no group holds an alert and any other failure thrown, and the way back to the page it opened over. How the form behaves once open is this file's. Its fields differ from`GroupedValueForm`'s — no Group picker, two colours — so it is not a row of that form's shared table. The shared pieces it is built from, `TextField`, `FieldShell`and`BusyButton`, have no test file of their own: this file covers them as it uses them.
