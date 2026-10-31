# GroupedValueForm

`src/components/GroupedValueForm/` — the admin's form for a curated value,
grouped or flat. Grouped, the value is filed under a group: a category
(M5.6), a curated ingredient form (M5.6a) or a curated deity (MB.132). Flat,
it is filed under nothing: a celestial body or a zodiac sign (MB.95). One component
serves every such vocabulary, `kind: 'category' | 'form' | 'deity' |
'celestialBody' | 'zodiacSign'`, as [`GroupForm`](group-form.md) serves the groups,
so a new vocabulary is a kind rather than another copy. The flat kinds had a
copy of their own, `VocabularyValueForm`, until MB.115 folded it in.

It has a name and a description, and for a grouped kind the group the value
is filed under — a deity's is its tradition. A deity also has its Other
Names (M14.23). It saves through the kind's
create or update mutation (`createCategory`, `updateIngredientFormValue`,
`createCelestialBody` and so on). On an existing value it also offers a delete
behind a confirmation. It holds no modal of its own: the page puts it in one.

The form kind is named for the GraphQL type, `IngredientFormValue`, because
`IngredientForm` is the ingredient entry form (DESIGN.md §7). The copy calls
a row a "form": Add Form, Save Form. A zodiac sign is a "Zodiac Sign" on
every button, Add Zodiac Sign, Save Zodiac Sign and Delete Zodiac Sign, the
long form the owner chose at MB.115's sign-off.

## Props

`GroupedValueFormProps` (`types.ts`):

| Prop     | What it is                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`   | Which vocabulary: its mutations, its schema, whether it has a group, and what the copy says                                            |
| `value`  | The value to edit, as `{ id, name, description, groupId, otherNames }`, `groupId` absent for a flat kind, `otherNames` a deity's alone |
| `groups` | Every live group of the kind as `{ id, name }`, alphabetical (MB.35), a form group's also its `icon` (M12.7); none for a flat kind     |
| `onDone` | Called after a save or a delete, and on Cancel, after Discard Changes if anything changed; the owner closes it                         |

Without `value`, the form adds one.

## Kinds

Everything that tells one kind from another is its entry in `index.tsx`'s
`KINDS`, declared through `defineKind`, so a new kind is an entry there and
its three mutation documents, and nothing else:

- **Its copy**: `noun`, the title-case word the buttons say ("Category",
  "Form", "Deity", "Celestial Body", "Zodiac Sign"); `group`, for a grouped kind only, the
  group field's `label`, `placeholder`, what it shows until one is chosen
  ("Group", "Choose a group"; a deity's "Tradition", "Choose a tradition"), and `hint`, the field's info tip, set only where it gives a rule the label does not (a deity's Tradition: a god several peoples honour is filed under one) and absent on a category and a form, whose Group label says it; `descriptionHint`, the Description's info tip, set only on the kinds whose suggestions match the description as well as the name (form, deity, celestial body, zodiac sign), since that is a flow the label does not say, and absent on a category, whose label and placeholder say it (the owner's call, 2026-10-20; [`info-tip.md`](info-tip.md), "When a field gets a tip"); `describe`, its placeholder, a one-line prompt ("What this category covers"); `deleteNote`, what the
  confirmation says after `Delete "<name>"?`; and `renameNote`, for a kind
  whose rename reaches further than its row (every kind but the category); and
  `otherNamesHint`, the Other Names list's info tip, set only on the deity,
  which draws the list.
- **Its schema and input**: `schema`, the shared schema the values pass
  before any request, and `toInput`, the values as the kind's mutation input.
  The form's values are always `{ name, description, groupId, folkNames, drafts }`,
  the last two a deity's other names and the box they are typed in (below). For the
  category and form kinds the schema is the shared one itself — `CategoryInput`
  or `IngredientFormValueInput` (`src/modules/vocabulary/validation/`) — and
  `toInput` keeps the name, the description and the group. A kind whose input names the group otherwise
  supplies its shared schema with that key renamed to `groupId`, a `toInput`
  that renames it back, and `inputKeys`, which says where the server paths
  it, so its refusal still lands beside the group field. The deity kind is
  one: `DeityInput` calls the group `traditionId`, so its schema is
  `DeityInput` with `traditionId` swapped for `groupId`, and its
  `inputKeys` is `{ groupId: 'traditionId' }`. Its `otherNames` is swapped
  too, for `folkNames`, the list of `{ value }` entries the field keeps, and
  `toInput` sends their texts back as `otherNames`.
- **No group, for a flat kind.** A celestial body or a zodiac sign has no `group`, so the
  form draws no group field. Its values still carry `groupId`, always `''`,
  so every kind has one shape; its schema, `CelestialBodyInput` or
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
  group's input key (`groupId`, or a deity's `traditionId`), and an other
  name's, `['otherNames', i]`, on that entry of the list. Anything else
  renders above the fields in a `role="alert"` notice. The slug collision is pathed to `name`, since the
  slug is derived from the name and has no field of its own (MB.43).
- **The group, where the kind has one, is a closed set typed into**, on the
  combobox's type-ahead box (`ComboboxTypeahead`, through `SelectField`'s
  `typeahead`), the owner's call in MB.115, with the kind's placeholder,
  "Choose a group". Typing narrows the list to the groups whose name holds the
  text, the first highlighted, so Enter takes it. Only a listed group is ever
  the value: text naming none leaves the group blank, so Save shows the
  schema's error beside the field, as for a group never chosen. It is named by
  the kind's label, "Group", and its list is "Group choices"; a deity's is
  "Tradition", "Choose a tradition" and "Tradition choices". The list floats
  over the modal rather than stretching it, as every combobox list does.
  For a form, each group's row and the chosen value draw its [`FormIcon`](form-icon.md)
  before the name (M12.7), the generic spoon for a group with no icon; the
  icon is decoration, outside the option's accessible name. A category group's
  and a tradition's rows carry none.
- **A deity's Other Names** (M14.23) is the ingredient form's
  [`ListField`](ingredient-form.md), the list its common names use: a box
  labelled "Other Name" with an Add Other Name button, each name added shown
  as a chip inside it. It sits under Name, and opens on the deity's names,
  alphabetically. A save sends the whole list, and the service brings the
  stored names to it (DESIGN.md §5, `deity_other_names`). The field keeps its
  entries under the ingredient form's keys, `folkNames` and
  `drafts.folkNames`, because `ListField`'s paths are that form's; so the box
  refuses, as a folk name's does, a name already listed in any case and the
  deity's own name. The service refuses a name another deity of the tradition
  holds, naming that deity, and the refusal lands on the entry. Every other
  kind draws no list and sends none.
- **Every field but Other Names is required**, as the schema and the columns say, and
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
  A celestial body's or a zodiac sign's rename reaches every entry listing it the
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
  Form, Delete Deity, Delete Celestial Body or Delete Zodiac Sign asks
  `Delete "<name>"?` and the kind's note, beside Delete and Cancel, on a
  card over the form, which is dimmed and held until it is answered, the
  focus on Cancel (MB.115, the owner's call; [`modal.md`](modal.md),
  "Asking over the form"). Cancel puts it away, the focus back on the
  delete button pressed. A category's: `Covens' ingredients and spells filed under it
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
- **Unsaved changes are asked about** (MB.115, the owner's call). The form
  hands `formState.isDirty` to the shared guard
  ([`modal.md`](modal.md#unsaved-changes)); Discard Changes calls `onDone`.
- **Buttons are title case**: Save and Delete with the kind's `noun` (Save
  Category, Delete Zodiac Sign and so on), Cancel, Delete, Cancel, Discard
  Changes, Keep Editing. Save is solid; Cancel and Keep Editing are
  quiet, since they change nothing; the two deletes and Discard Changes are
  destructive.

- **Undo and redo** ([`field.md`](field.md#undo-and-redo), M12.9). The form calls `useFormHistory` on its `<form>`, and provides it to `FormHistoryButtons`; the hook listens for its chords on the form itself. It is off while the unsaved-changes question or the delete question is up. The form does not reset after a save (a save closes it), so nothing calls `clear()`.

## On the admin pages

`/admin/categories`, `/admin/forms`, `/admin/deities`, `/admin/celestial-bodies` and
`/admin/zodiac-signs` are one page, `src/app/(shell)/admin/value-page.tsx`'s
`ValuePage`. Each route's `page.tsx` keeps its tab title and hands its kind
and address over. `value-kinds.ts` holds each kind's readers from
`@/modules/vocabulary` (its list, count, value by slug and, for a grouped
kind, its groups), each mapped onto the page's own names, so the deities'
`traditionId` and the astrology services' leading vocabulary stop there.

The page opens the form in a `RouteModal` ([`modal.md`](modal.md)) from its
address, or at once from a press on an Edit or Add (M9.18; "Opening at once"
in `modal.md`). `?new` opens an empty form, titled "Add Category", and
`?edit=<slug>` opens the value at that slug, under an eyebrow, "Edit
Category", with the value's saved name as its title and a deity's tradition
after it (`editHeading`; [`modal.md`](modal.md), "An edit dialog's head"). `value-dialog.tsx` is the client edge between the server page and
the form, since a server component cannot hand `RouteModal` the function its
contents take. The page renders it always, with `opened` (`{ heading, value }`)
only when the address opens a modal, so a press's skeleton and the form that
replaces it are one dialog; the form is keyed by the value's id. Closing, saving or deleting fades the modal out, then
`router.replace`s the page it opened over, filter and cursor kept
(`closeHref`, from `groupedValuesHref`), so Back does not reopen it, and
`router.refresh()`es so the list re-reads. The celestial bodies and signs skipped
that fade on a save until the pages shared it.

A form's slug is its name and its group's (`wax-substance`), a deity's its
name and its tradition's (`hecate-greek`, from `deitySlug`), and a celestial body's
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
[`TextField`](field.md)s in a `FormProvider`, "Add a name" and the kind's `describe` their placeholders, the group a `SelectField`, each
with its label row and the `.field__required` asterisk; Save is a
`BusyButton` in a wrapping `.form__actions` row, with Delete pushed to the far
end by `.form__aside`, the shared [`FormActions`](field.md); and the confirmation is the modal's
[`ConfirmQuestion`](modal.md), a `ConfirmOverlay`
card over the form, with its own `.modal__actions` row, the form's buttons
staying beneath it. Narrow rows stack ([`styling.md`](../styling.md), "A narrow form stacks its buttons"). Its one rule of its own, `.grouped-value-form__note`, sets the
rename note a step above the actions, with a closer gap between it and them.

The alert above the fields is a `Notice` ([`notice.md`](notice.md)). A
failed request is read by the shared `readGraphqlIssues`
(`src/lib/graphql-failure.ts`, MB.116), which gives every field error of a
`VALIDATION` refusal at once, where `readGraphqlFailure` answers only the
first field it finds. The form places each issue under its field and joins
the rest into the alert, through the shared `placeServerIssues` beside it. Anything that is not a `VALIDATION` refusal comes
back as one issue carrying the server's sentence, or `GENERIC_FAILURE` when
there is none.

## Stories

[`index.stories.tsx`](../../src/components/GroupedValueForm/index.stories.tsx),
`Admin / Grouped Value Form`, each in the modal and its own iframe, each kind's
groups four invented ones, enough to narrow, the form groups carrying icons (one none). The workshop has no API, so a
save answers with the generic error.

- `States`, with a control that chooses Adding A Category, Editing A Category, Adding A Form, Editing A Form, Editing A Deity, Adding A Celestial Body, Adding A Zodiac Sign, Save Refused and Saving Empty: an add or an edit for the kinds, the celestial body
  and the sign being flat, with no group field. Renaming in Editing A Form or
  Editing A Deity shows the note by Save; in
  Editing A Deity the head keeps the name it was saved under, with the
  tradition after it.
- `AskingToDelete`: the category's edit with Delete pressed once drawn, the
  question over the form, which is dimmed and held beneath it until Delete or
  Cancel answers.

## Testing

`tests/components/GroupedValueForm/index.test.tsx`, with the mutations
answered by MSW in the route's own shape. The nine tests every kind shares —
the save rules, the schema's refusal, the busy Save, the group typed into
and narrowing, text naming no group refused on Save, the slug refusal, Cancel
and the confirmed delete — are rows of `tests/support/grouped-value-form.tsx`,
run once, on the category: a kind shares that code path, so another kind's
run would prove nothing more (MB.189). Its unsaved-changes wiring is one test, the form in a modal
(`tests/support/discard-guard.tsx`): Cancel and Escape asking after a
change, and Discard Changes closing; the guard's shape is the Modal's test.
The delete question in a modal has its own three, on the category: the form
inert while it asks and the focus on Cancel, both given back on Cancel, the
focus on the delete button; Delete deleting from over the form; and Escape
closing with nothing changed, and with a change asking about it first, Keep
Editing bringing the delete question back. `describe('GroupedValueForm, its Description tip')`
checks each kind: a tip on the searched kinds, none on a category.
What only one kind does stays under
that kind's describe: the category's and the form's create and update with
their variables, their confirmations and their delete refusals; the form kind's
group refusal and pathless one placed, and its rename note; and, under `describe('GroupedValueForm, a deity')`, the deity's
create sending its tradition as `traditionId`, its rename saved under its
id after the note, a `traditionId`
refusal landing beside Tradition, and
its delete refusal. The flat kinds, the celestial body and the zodiac sign, are rows of
`describe.each` getting only what they change, their three mutations, the
create sending no group and asking for none. The shared pieces the form is
built from, `TextField`, `SelectField` and `BusyButton`, have no test file
of their own: this one covers them as it uses them. The pages' half, `tests/app/(shell)/admin/value-page.test.tsx`, is
described in [`grouped-value-list.md`](grouped-value-list.md#testing); what the
modal shows once open is this file's. `tests/e2e/admin.spec.ts`
adds, renames and deletes a category, a form and a celestial body through the real server, adds
a deity under a new tradition and moves it when the tradition goes, and is
refused deleting Protection, which seeded compendium entries are filed under.

## What the form edits

The admin's form for a curated value covers grouped kinds (a category, an ingredient form or a deity) and flat ones where the kind has no group (a celestial body or a zodiac sign). It is one form for every such vocabulary, as GroupForm is for their groups, so a new vocabulary is a `KINDS` entry. A value has a name, a description and, for a grouped kind, the group it is filed under. The shared schema validates it before the mutation and the service validates it again, and on an existing value a delete sits behind a confirmation.

A kind whose rename reaches further than its row says so. No rename moves a compendium entry's address, so none asks to end a redirect. The form holds no modal of its own; the page puts it in one.
