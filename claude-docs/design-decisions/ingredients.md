# Ingredients decisions

The decisions behind the compendium, a coven's ingredients and stock, the references and vocabularies they draw on, and the search over them.

## The admin compendium page: its size, its modal, its lookups

M5.5 puts `IngredientForm` on `/admin/compendium` over M5.2's write
services. Scoping it showed everything between the two missing: no
compendium mutations, no `nomenclature` filter, every lookup the form makes
bound to a coven, and a form that could only create a coven's ingredient.
Four questions had no answer in DESIGN.md or the task entry. The owner
settled each one.

### One task, not three

The entry estimated 2h. The work is the GraphQL layer, the filter, the
lookups, two new modes for the form and the page — some 12h.

**Decided: one PR, as M5.5, with the estimate corrected.** Nothing is
minted.

Weighed: _two MB tasks_ for the backend and the form's modes, leaving the
page to M5.5 — three reviewable PRs, at the price of two more entries for a
change whose parts land nowhere apart.

### The page shape

M5.6 chose a modal over separate pages for a three-field form, and said
separate pages suit a long one. The compendium form has some fifteen fields.

**Decided: M5.6's shape, with a wide modal.** `?new` and `?edit=<slug>` open
the form in `Modal`, which gains a wide size. M8.16 already puts this form in
a modal, which is why the References panel nests inline rather than in a
second dialog, and the suggestion lists float inside the dialog's top layer
as M5.6's category form shows. Every admin page keeps one shape.

Weighed: _separate pages_ (`/admin/compendium/new`, `/admin/compendium/[slug]`),
which suit a long form but give the admin pages two shapes.

### The lookups without a coven

Every lookup the form makes — form, planets, signs, deities, folk names,
references — and the duplicate warning took `workspaceId: ID!`, and the
compendium form has no coven to give.

**Decided: the `workspaceId` becomes nullable, and null reads the
compendium tier alone.** That is the convention `ingredient(id, workspaceId)`
and `createReference` already hold, and the finders take the proofs as a list,
as `findManyOfIngredients` does, so no proof reads the compendium. The
queries still refuse a signed-out caller: MB.80 draws the public line field
by field, and only a keeper's form calls these. The vocabulary boxes offer the
curated rows alone, which is all a compendium entry may hold (MB.162).
`ingredientSuggestions` stays a coven's, since a compendium substitute is
picked from `compendium(query)`.

Weighed: _separate compendium queries_ beside each coven one, more schema
for the same rows; and _a null arm open to anyone_, which would widen MB.80's
public line by seven fields no public page reads.

### After Save Ingredient

The criterion has Save Ingredient open the new entry's page, and no public
entry route exists yet.

**Decided: it opens the entry's admin modal, `?edit=<slug>`.** A link to the
public page can join it once that route is built.

### Categories

An update replaces the whole entry, `categoryIds` included, and the picker is
MB.126's. Scoped before it, M5.5 carried an entry's category ids through an
edit untouched; MB.126 landed while M5.5 was built and put the picker in
`IngredientForm` itself, so the compendium form has it with no code of
M5.5's, an edit opening with the entry's categories picked.

## The admin categories page: delete, list read and modal

Live home: `claude-docs/db/categories.md`, "Category writes"; `claude-docs/components/grouped-value-form.md`, "On the admin pages".

### Decision

- **Deleting a category in use is refused while a live compendium entry is filed under it, naming the entries; otherwise it soft-deletes and leaves every link in place.** The admin takes the category off the entries first (the same refusal a form gives a compendium entry's picker). A coven's links (`ingredient_categories`, `spell_categories`, both hard-deleted join tables) never block the delete and are never removed. Every read already drops a deleted category, so the chip disappears and the link stays for a later restore.
- **`listCategories` and the public, paged `categories` GraphQL query are built here.** The admin page reads the service on navigation; the category picker reads the query from the browser. Caching the query under the `compendium` tag is a separate task.
- **One route, `/admin/categories`, with the form in a modal that the address opens**: `?new` or `?edit=<slug>`. The server renders the list with the modal already open. Closing it (after a save, delete or Cancel) replaces the address with the list's, the page's cursor kept, so Back does not reopen it. A link to a category's modal works from anywhere.
- **`Modal` is the native `<dialog>` in modal mode**, which gives the focus trap, Escape and the inert page without building them. Later modals reuse it.

### Why

A keeper write that hard-deletes links would reach covens' rows, which a keeper must not do (`CLAUDE.md`, "Domain invariants"), and cannot be undone. A bare confirm-then-soft-delete would silently strip a tag from compendium entries the keeper never opened. `CLAUDE.md` rule 1 has a server component read a service and the browser read GraphQL, so the list needs both.

### Rules out

- Confirm-then-soft-delete whatever holds the category.
- Soft-delete plus hard-delete of every link in one transaction.
- A service-only list read, or an admin-only `adminCategories` query over the same rows.
- Intercepted and parallel routes (`@modal/(.)new`): two renderings of every form with known refresh quirks, for no gain on a three-field form.
- Separate `/new` and `/[slug]` pages for a short form.

## The admin forms page: the slug, the redirect, the stale pick

M5.6a puts the form vocabulary on M5.6's page shape
([`m5.6-admin-categories.md`](m5.6-admin-categories.md)) and builds MB.162's
delete and rename rules for forms, on the pick since MB.167
([`mb.162-compendium-holds-curated-values.md`](mb.162-compendium-holds-curated-values.md),
[`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md)).
Building it turned up three questions that DESIGN.md and the task entry left
open. The owner settled each one.

### A form's slug is its name and its group

DESIGN.md §5 lets two live forms share a name, "Wax" under _Animal_ and under
_Substance_, because uniqueness is on the slug alone, and the seed doc leaves
the second row for a keeper to add. But every form's slug was
`slugify(name)`, and the slug index is global, so the second "Wax" collided
with the first at `wax`. Nothing could add it except a test inserting a slug
by hand.

**Decided: a form's slug is `formSlug(name, group)`, which is `slugify` of
the two joined by a space (`wax-substance`), for every form, always.** It
follows a rename and a regrouping alike. A name repeated within one group
still collides, and that is a true duplicate.

- **The seed is the backfill.** A database seeded before this task holds
  `slugify(name)`. A backfill in SQL would be a second slug rule, so the form
  seed re-derives every live form's slug from its name and its group after
  its inserts, writing only the rows that differ. This is the precedent
  `0025_ingredient-slugs.sql` set ([`db/ingredient-slugs.md`](../db/ingredient-slugs.md)).
  A form's `seed_key` stays the slug it was seeded under, `slugify(name)`,
  since a seed key never changes after insert (MB.171).
- **A group rename moves its forms' slugs.** The slug names the group, so
  M5.6b's rename of a form group re-derives the slug of every form under it.
  It still touches no ingredient: an entry holds the form's name, not its
  slug.

Weighed:

- _The group only on a clash_ (`wax`, then `wax-animal`). No backfill, but
  the address depends on which row came first, the order-dependence MB.82
  turned down for ingredient slugs.
- _Refuse the second "Wax"._ The simplest rule, but it withdraws what §5 and
  the seed doc promise, and decides for the admin that wax is one thing.

### A rename that would take a redirecting address asks first

A form's rename re-slugs every compendium entry picking it. One of those new
slugs can be an address another entry's 180-day redirect still runs from.
MB.82 makes a single entry's write ask before it ends such a redirect.

**Decided: the rename asks first, as MB.82 does.** It is refused as a
`ValidationError` on `endRedirect`, naming each entry whose redirect it would
end and when that window closes, unless the input carries
`endRedirect: true`. The page shows the refusal with a control that sends the
rename again, confirmed.

Weighed: _take the address quietly_, ending the redirect with the retirement
left in place. Simpler, but a keeper fixing a typo in the vocabulary could end
a public redirect without knowing.

### A coven's pick of a renamed form is the member's to settle

A coven's ingredient that picked a form keeps its `form_id` through the
rename, and keeps its text, since a keeper rewrites nothing of a coven's
(MB.162; M6.6). It then holds "Wax" beside a pick whose row is now
"Beeswax". MB.167 refuses a `formId` sent beside text that is not its row's
name, so an edit modal that loaded the pair and saved it back would be
refused at `form`.

**Decided: the member is asked, on the coven's edit modal (M8.17).** Loading
an ingredient whose `formChoice` no longer folds to its `form`, the modal
asks whether to take the new name or keep the text as typed, and never
sends the stale pair. The read is unchanged: `formChoice` still names the
picked row, so the modal can offer its new name. M8.17's entry carries the
criterion.

Weighed: _read the stale pick as no pick_, `formChoice` null once the names
part. The next save would clear `form_id` without the member choosing, and
lose a pick they may have wanted to follow the rename.

## The admin group pages: where a deleted group's rows go

M5.6b puts the two group vocabularies, `category_groups` and
`ingredient_form_groups`, on M5.6's page shape
([`m5.6-admin-categories.md`](m5.6-admin-categories.md)), with the write-time
contrast check MB.36 set for a category group's two colours. The check needed
no decision. Deleting a group did: the task entry asked only that the
categories under one "go somewhere, and the page says where", and MB.162 had
refused a form group's delete while a live compendium entry picked a form
under it ([`mb.162-compendium-holds-curated-values.md`](mb.162-compendium-holds-curated-values.md)).
The owner settled three questions. [`db/categories.md`](../db/categories.md),
"Category writes", and [`db/member-autofill.md`](../db/member-autofill.md)
carry the rules as built.

### A category group with live categories

A category is curated only while its group is live, so a category left under
a deleted group is dropped by every read. It still holds its slug, which is
its name alone, and the slug index is global: re-adding the category by name
would collide with a row the admin cannot see.

**Decided: the categories move to a group the admin picks, and the admin
confirms the move after picking.** Delete Group on a group with live
categories first shows a picker of the other groups, "Move its N categories
to", and then a confirmation naming the count and the destination. The
confirmed delete moves every live category to that group and soft-deletes
the group in one transaction. A category's slug and its every link, a
compendium entry's or a coven's, stay as they were, since nothing about a
category's address or identity names its group.

- **The refusal sits on `moveTo`.** A group with live categories and no
  `moveTo` is refused with "Choose a group to move its N categories to"; a
  `moveTo` naming the group itself, a deleted group or nothing is refused
  with "Choose another live group to move its N categories to". Both land
  beside the picker.
- **The categories are read before the transaction.** One filed under the
  group in the instant between is left under the deleted group, which every
  read drops, as a category's own delete leaves an entry filed under it.

Weighed:

- _Refuse the delete until every category is regrouped._ Nothing moves
  without the admin choosing it, but eight categories under a group are eight
  edits on another page before one delete.
- _Leave the categories in place._ One click, but the categories vanish from
  every read while still holding their addresses, so re-adding one by name
  collides with a row the admin cannot see.

### A form group with live forms

A form's slug is its name and its group, `formSlug(name, group)`
([`m5.6a-admin-forms.md`](m5.6a-admin-forms.md)), so a form moved to another
group moves its address too. MB.162 had refused a form group's delete while
a live compendium entry picked a form under it, because a form under a
deleted group is no longer curated.

**Decided: the forms move to a group the admin picks, with the same two
steps, each re-slugged there; the delete is refused only when a moved form
would take an address another live form holds.** The moves and the soft
delete are one transaction. The refusal sits on `moveTo` and names both
forms: "Moving "Wax" would give it the address "wax-substance", which "Wax"
already has — rename one of them first". The missing-target refusals are the
categories', in forms.

- **This amends MB.162 for form groups.** The moved forms stay curated, live
  and under a live group, so no compendium entry's pick is orphaned and none
  is rewritten: an entry holds a form's name and its `form_id`, never its
  slug. A coven's pick is the same. So a form group is no longer refused for
  a compendium entry picking a form under it. Deity traditions (MB.132) were
  not part of this decision; MB.132 then chose the same move for them
  ([`mb.132-admin-deities.md`](mb.132-admin-deities.md)).
- **A rename re-slugs the same way.** Renaming a form group moves the slug of
  every live form under it in the same transaction, as M5.6a's record
  anticipated, and a re-slug onto another live form's address refuses the
  rename on `name`, naming both. It touches no ingredient.

Weighed:

- _Soft-delete the forms with the group._ Explicit, and it frees their slugs,
  but it discards curated rows, and under MB.162 any form a compendium entry
  picked would still refuse the delete.
- _Leave the forms in place._ The categories' case again: invisible as
  curated rows, yet holding their slugs.

### A group with nothing under it

**Decided: a group with no live rows deletes plainly**, after a confirmation,
with no picker and no `moveTo`. There is nothing to move, so asking where
would be a step with no answer.

### A category group's pair keeps one hue

Seen on the built page: the two pickers let a keeper give a group a blue for
the dark theme and a red for the light one, and a chip would change family
when the theme did.

**Decided: the pair keeps one hue, to within 10°, and the colour chosen first
sets its partner.** `CategoryGroupInput` refuses a pair whose hues are more
than 10° apart, or a grey beside a colour, beside the light-theme picker; two
greys pass, having no hue to disagree on. When one colour is chosen and its
partner is empty, the form fills the partner from it: the same hue, the
saturation scaled between the themes as the seeds scale it on average (40% on
the dark card to 55% on the light page), and the lightness nearest the partner's ground
that clears 4.6:1 on it, a tenth over the floor. The partner follows the
first colour while it is still the value the form set, so a picker dragged
across the wheel does not strand it on the first hue, and stops once the
admin sets it. An existing group's pair is never refilled.
`src/lib/group-colors.ts` holds the rule.

Why 10°: every seeded pair is within 0.51°, and every derived partner within
0.56° of its source, so the tolerance never trips on a pair the form made or
the seed wrote; it is wide enough to hand-tune a partner a few degrees and
narrow enough that a different family is refused.

Weighed: _derive from a fixed saturation per theme_ rather than scaling the
source's. Simpler, but a muted colour would get a vivid partner, and a grey
a coloured one.

### The seeded colours, retuned

The owner retuned the eight seeded pairs by hand. Each still sits on its odd
22.5° step off `$sorrel`, within 1.04°, and clears 4.5:1 on its own theme's
harder ground, the closest being Mind & Spirit's light hex at 4.52:1; but the
pairs no longer share one saturation per theme. Dark-theme saturations run
30–50%, light-theme 37–75%.

**Decided: the seed file is the colours' only source, and M0.7's
`$category-groups` map is retired.** `src/db/seed/category-groups.ts` holds
the sixteen hexes; `_variables.scss` loses the map, its step and saturation
settings and `category-group-color()`. `categories.test.ts` keeps the
rotation as the rule the seeds follow, holding both hexes of every pair within
2° of the group's step, and keeps the contrast check. Migration
`0052_retune-category-group-colours.sql` carries the new pairs onto databases
the seed already filled, since the seed inserts only missing rows: column by
column, and only where a column still holds the old seed's value, so a colour
a keeper has chosen stays ([`db/category-seed.md`](../db/category-seed.md)).

**Decided: the partner derivation is refitted to the new seeds.**
`SEED_SATURATION` in `src/lib/group-colors.ts` scales saturation by the
seeds' mean ratio, 40% on the dark card to 55% on the light page, where it
used the old map's 49% and 85%. A derived partner stays within 0.56° of its
source's hue, and the 10° pair rule is unchanged.

Weighed: _keep the Sass map and regenerate it from the new hexes._ Rejected
because the hand-tuned pairs no longer follow one formula: the map would have
to carry each pair as a literal, a second copy of the seed with nothing left to
derive, and the seed test would only be checking one copy against the other.

### The picker, and a warning for a colour too close

Seen on the built page: the native `<input type="color">` gave the admin no
way to type a colour as hue, saturation and lightness, and nothing showed which
colours would pass before one was chosen. The owner asked for a colour mode to
switch, a picker that shows the passing range, and a warning when a colour
stands too close to another group's.

**Decided: Ark UI's colour picker (`@ark-ui/react`), inline, with the
low-contrast side veiled by us over its area, and `@colordx/core` for the
distance between colours.** Ark has a format switch built in, HSB, HSL and RGB, and an area
that takes children, so the veil is a layer of the ground's own colour
clipped to the failing side, found by bisection on the same `chipContrast`
the schema uses (`failingRegion`, `src/lib/group-colors.ts`), edged with a
line and labelled "< 4.5:1". A dashed line alone was tried first and dropped:
it left the reader to work out which side passed. A Match button sets either
colour from the other by the pair's rule. A colour within 0.05 in OKLab of another group's
colour in the same theme is warned of beside its picker, naming the group; it
is not refused, since two close groups may be meant, and the service does not
check it.

Weighed:

- _`@test-party/contrast-color-picker`_, a fork of react-colorful that draws
  the AA line itself. Closest to what was asked, but one release, nothing
  since, and a packaging mistake that installs `npm` as a dependency: the
  owner judged it not healthy enough.
- _React Aria's `ColorPicker`._ An area that takes children too, and
  stronger accessibility credentials, but no format switch of its own, which
  would have been ours to build, and a heavier tree.
- _A distance in hue alone_ for the warning. Meaningless for a grey or a muted
  colour, and two colours at one hue and far-apart lightness read as different;
  OKLab measures what a reader sees.
- _`fixContrast()` from colordx_ in place of `pairedColor`'s walk. It finds
  the nearest passing colour, not the partner rule the seeds follow, so the
  walk stays.

**Settled with the owner:** under the retuned seeds, Prosperity & Work and
Wellbeing first stood 0.042 apart in the light theme, inside the warning's
reach. The owner chose to retune Prosperity & Work over retuning Wellbeing or
lowering the distance to 0.04: its light colour went from `#566718` to
`#606c2f` and its dark from `#85964a` to `#86964a`, a step that keeps the pair
on one hue. The closest seeded pair is now those two, at 0.056 dark and 0.055
light; both new hexes clear 4.5:1 (5.24 and 4.71), and both stay within 2° of
the group's step of the rotation.

### Two calls made without asking

- **No new writer method.** The plan named a `regroupCategories` writer, one
  UPDATE moving every live category off a group. The categories move instead
  one row at a time through the existing `updateById`, as the forms do, since
  `tests/db/repository/write.test.ts` caps the writer's method count and a
  twenty-third method is a decision of its own. A group holds a handful of
  categories, so the row-at-a-time cost is nothing.
- **Where the pages are reached.** `AdminNav` lists "Category groups" after
  Categories and "Form groups" after Forms, each group page beside the
  vocabulary it organises, answering
  [`components/admin-nav.md`](../components/admin-nav.md)'s open question.

## AddIngredientModal scoping choices

Live home: `claude-docs/components/modal.md`, "Add Ingredient".

### Decision

- **The Coven select is a native `<select>`.** One control, no new component, and a disabled option needs no custom code. The e2e helper written for a combobox-with-listbox is corrected to match.
- **On the admin page the button is a plain link** to `/admin/compendium?new`, a full navigation that renders the dialog server-side. `RouteModalProvider` is mounted in the admin layout below the shell, so the shell's button cannot use `useOpenModalClick`. Moving the provider into the shell layout (so the dialog opens at once, like `AddAction`) is a later sub-hour fix if the delay is felt.
- **Blur validation is react-hook-form's plain `onTouched` mode**, with no special case for an empty untouched field; the Name field is the only one a person is likely to tab past empty.
- **Carried jars travel through `Ingredient.jars` on the mutation's return**, with no schema change and no `carriedJars` field.

### Why

Each choice is the smallest that works: standard modes and existing fields over new components or schema.

### Rules out

- A `ComboboxSelect` for the Coven select.
- A new `carriedJars` field.

## Editing a coven's own ingredient

Live home: `claude-docs/components/ingredient-entry.md`; the list's Edit is in `claude-docs/components/coven-cards.md`.

### Decision

- **Link is offered to every steward or practitioner** on any of their coven's own entries, formal name or not. The page works out `rolePermits(role, CONVERT_PERMISSION)` itself, as it does for Make It Ours, and passes the answer to the dialog. The search reaches every live compendium entry. `canConvert` and the Similar block that reads it are unchanged.
- **After a save** the dialog closes and the page or list shows the new values.
- **Link sits in its own section at the foot of the dialog**, below the form and outside it, so `IngredientForm`'s props do not change. Its confirmation adds one sentence: unsaved changes will not be kept.
- **The form's values come from `entryValues(entry, session)`**, in `src/app/entry-values.ts`.
- **A form a keeper has renamed blocks the save**, with an error at that variant's Form field, until the member picks a name.
- **On the list, a `?edit=<id>` that is not the coven's own entry, or comes from an observer, opens nothing.**
- **The dialog carries a Delete** (reversed after first being left to a later task).

### Why

Role checks stay in the page and services, and the form stays reusable.

### Rules out

- Changing `IngredientForm`'s props for Link.

## Starting a jar of a form the coven holds is refused

Live home: `claude-docs/db/stock.md`; `DESIGN.md` §5 (stock rows) and §7 (`addIngredientToWorkspace`).

### Decision

- **`createStock(session, workspaceId, variantId, input)` throws a `ValidationError` with one issue at `['variantId']` when the coven holds a live jar of that form.** The input's amounts are never applied to the held jar. Changing a jar is `updateStock`'s.
- **The check is the insert breaking `inventory_items_workspace_id_variant_id_unique`**, with no read before it, so a create and a racing create are refused the same way.
- **After a soft delete there is no live jar**, so a create inserts a fresh row.
- **`addIngredientToWorkspace` keeps its name** and passes the refusal on as a field error. Its flow tells the member the coven holds the form and links to that jar.
- **Topping up a held jar is not part of v1.** If wanted, it is its own operation on a jar's id.

### Why

"Add" with an amount reads as adding that amount. A member who holds 5 g and sends 10 g expects 15 g; an idempotent add returned the 5 g jar as a success with nothing to say their 10 g was dropped, and a racing loser's whole input vanished the same way. From the compendium page the action is adding an ingredient to the coven, which does not read as adding an amount.

### Rules out

- **Returning the held jar, idempotently.** It drops the input silently.
- **Returning the held jar with a flag.** The name still says "add", and a client that ignores the flag repeats the problem.
- **Topping up inside create.** It is a restock operation that must refuse a different dimension, a count and a jar with no amount or unit, and leaves open what a different source or date means.

## The coven's Ingredients page

Live home: `claude-docs/components/ingredient-card-list.md` and `claude-docs/components/ingredient-search.md`.

### Decision

- **`/coven/[slug]/ingredients` lists everything in the coven's cupboard**: its own entries plus the compendium entries it has added. It is the coven twin of the public `/compendium` cards page.
- **A count of the coven's list.** `findWorkspaceIngredientCount(membership, filter, start)` in the repository is a twin of `findCompendiumCount` over `and(list.arms, workspaceListScope(...))`. `countWorkspaceIngredients(session, workspaceId, filter, start)` asserts the same `ingredient:['read']` permission as the list and is not cached, because the data is the coven's (rule 6). Only the server-rendered page counts; nothing in GraphQL changes.
- **The filter has a coven mode.** `CompendiumList/filter.tsx` is a client component, so its props are plain data, not functions. `audience: 'coven'` takes `covenSlug` and `workspaceId`, and carries `source`, `inStock` and `lowStockOnly` in `panelOf`, `NO_FACETS`, `heldFilter` and `hrefFor`, so FacetPanel's Source, In Stock and Low Stock controls appear. Facet counts come from the `workspaceIngredientFacets` service and GraphQL field (`covenFacetCounts` in `src/components/CompendiumList/facets.ts`).
- **The type-ahead suggests from the coven's cupboard only.** `IngredientSearchBox` and `IngredientSearchForm` take an optional `workspaceId`; when set, the box queries `workspaceIngredients(workspaceId:, query:, first:)` instead of `compendium` and shows the coven's label where one is set. Suggestions never come from another coven, including the suggested names (`CLAUDE.md`, "Domain invariants").
- **The search sentence covers the coven filters.** `buildSearchSentence` has clauses for Source, In Stock and Low Stock Only, and the coven filter uses the existing `noun` option.
- **Card density is read before first paint.** A script in `src/app/pre-paint-scripts.tsx` reads `localStorage['card-density']` and, when it is regular, sets `data-card-density="regular"` on `<html>`, so the compact look never flashes.
- **A gate spec, `tests/e2e/coven-ingredients.spec.ts`, proves only what no story walks**: the type-ahead suggests this coven's cupboard only, never another coven's entry or a compendium entry the coven has not added.

### Why

Most stories about a coven's ingredients walk this page, so it turns them on. The count is uncached because anything workspace-scoped is.

### Rules out

- Caching the coven count.
- Passing functions as props to the client filter.
- Type-ahead from the compendium or another coven.

## Edit stock from the card

### Decisions fixed in the brainstorm

- **Rows: Option B.** One row per held jar (form label, Quantity, Unit, Low Stock At, Remove); an Add Form select listing forms with no live jar appends an empty row; the select is hidden when every form is held.
- **Remove is staged, not immediate.** Remove marks the row (struck through, Undo) and Save sends its id in `delete`. A `ConfirmedAction` would write on confirm, outside the batch. A row added in the session and removed again is simply dropped.
- **`saveStock` input is three typed lists**, so an illegal row (a delete with a quantity) cannot be expressed and `StockInput`'s omit-keeps / null-clears semantics stay:
  ```graphql
  input SaveStockInput {
    create: [CreateJarInput!]!   # { variantId: ID!, input: StockInput! }
    update: [UpdateJarInput!]!   # { id: ID!, input: StockInput! }
    delete: [ID!]!
  }
  saveStock(workspaceId: ID!, ingredientId: ID!, input: SaveStockInput!): [InventoryItem!]!
  ```
  `ingredientId` scopes every id and variant to one ingredient; the service proves it. The result is the ingredient's live jars. The three single-jar mutations stay.
- **Only changed rows are sent.** Save is disabled until a row differs (a staged Remove counts), `BusyButton` busy while saving, a refusal shows as an alert keeping typed values with prefixed issue paths placed on the right row, success closes and `router.refresh()`es. `useDiscardGuard` covers a changed dialog.
- **Worst-state badge** is a pure `worstStock(jars)` beside `stockState` in `src/components/StockBadge/stock-state.ts`, returning `{ state, forms } | null`; `forms` lists only the forms in the worst state ("Out of Stock: Oil, Tea"). Flag to the owner: alternative is listing every affected form.
- **Labels:** "Low Stock At" replaces "Low-Stock Threshold" (touches StockFields tests and the `stockEditor` helper). Title Case everywhere.
- **The forms line on the shared card** (`IngredientCard`'s `.ingredient-card__forms`, drawn from `variants`) is hidden by a new boolean prop (`forms`, default true); `CovenCards` passes it false. `EntryMarks` keeps `variants` for the safety badge. Nothing in `CompendiumCards`/`CompendiumList` changes.

### Steps (TDD order)

**1. Repository: `findStockByIds`.** Test `tests/db/repository/stock.test.ts`: returns live jars of the workspace for given ids, excludes soft-deleted and other-workspace jars, empty list returns `[]` without a query. Add to `src/db/repository/stock.ts` reusing the private `findManyStock` and its soft-delete filter; export from `index.ts`.

**2. Service: `saveStock`** in `src/modules/ingredients/services/stock.ts`. Tests in `tests/modules/ingredients/services/stock.test.ts` with `asUser`, the raw inserters (`insert-stock`, `insert-ingredient`, `insert-cupboard-entry`):

- viewer C, outsider D and anonymous refused by direct id, preconditions asserted (jar exists, unchanged after, a member's same call succeeds);
- cross-scope refusals write nothing: jar of another coven, jar of another ingredient, variant not of `ingredientId`;
- one call creates, updates, deletes and returns the live jars;
- atomic: a duplicate form in `create` gives one `ValidationError` (the existing `HELD` message) and nothing else persists; a bad quantity on row three leaves rows one and two unsaved; issue paths prefixed `create.0.input.quantityOnHand`, `update.1.input.lowStockThreshold`;
- re-adding a soft-deleted form starts a fresh jar (partial unique index allows it);
- the cupboard row (`workspace_compendium_entries`) is inserted once on first stocking and left on an all-delete;
- the first-unit default threshold (`validation/default-threshold.ts`) applies per created/updated row;
- empty input is a no-op returning current jars, no transaction;
- the batch takes `lockCovenStock` first.
  Implementation: one `assertMembership(session, workspaceId, { inventory: ['update'] })`, parse every row up front with `parseInput` and the Zod `StockInput`, resolve ids with `findStockByIds` and variants with `findReadableVariant` (reuse `NO_FORM`/`NO_JAR`), then one `withAudit` doing lock → cupboard insert → creates → updates → soft-deletes; a unique violation maps to `HELD`. Factor the per-row write bodies out of `createStock`/`updateStock` into helpers both paths call. Never convert units.

**3. GraphQL.** `src/modules/ingredients/graphql/stock.ts` adds the three inputs and the `saveStock` mutation calling the service then `clearStock` on `loaders/stock.ts`. Tests `tests/modules/ingredients/graphql/stock.test.ts` via `tests/support/graphql/run`: editor gets `[InventoryItem]`, viewer/outsider a plain refusal, validation refusal in the standard shape with prefixed paths. Regenerate the SDL snapshot (`tests/graphql/schema-snapshot.test.ts -u`, review the diff), `npm run codegen`, commit `src/gql/`, update `claude-docs/graphql/schema.md`.

**4. `worstStock` and the card badge.** Tests in `tests/components/StockBadge/`: no jars → null, healthy → null, low+out → out naming only the out forms, unmeasured never badged; the card-level badge renders one badge whose tip reads "Low Stock: Flower" / "Out of Stock: Oil, Tea". `StockBadge` gains a `forms` prop (or a card-level export) sharing the presentational core with the per-form badge Quick Look draws.

**5. `StockFields` prefix and label.** Tests `tests/components/StockFields/`: with `prefix="jars.0"` fields register as `jars.0.quantityOnHand` etc.; label "Low Stock At"; no prefix unchanged; a label suffix (the form) keeps two rows' "Quantity" names distinct. Names typed `FieldPath<V>` as `TextField`/`SelectField` expect.

**6. `StockDialog`** — new `src/components/StockDialog/{index.tsx,types.ts,index.scss,index.stories.tsx}`, built from `EditStock` as the template (GraphQL document, `useRef sent`, `ModalButton` wrapped in `IconTip` "Edit Stock" with the ingredient in the accessible name, `FormActions`, `placeServerIssues`) and `IngredientForm/variants.tsx` for `useFieldArray`. Row state `{ key, jarId|null, variantId, formLabel, removed, ...stock }`; a diff against opening values yields `create`/`update`/`delete`. Props, with nothing card-specific so M12.29 mounts it unchanged:

```ts
interface StockDialogProps {
  workspaceId: string;
  ingredientId: string;
  ingredientName: string;
  forms: { variantId: string; label: string }[]; // every form of the entry
  jars: StockJar[]; // the coven's live jars
}
```

Tests `tests/components/StockDialog/index.test.tsx` with fetch mocked at `/api/graphql` as EditStock's tests do: opens from the pencil; one row per jar; Save disabled until a change; editing one row sends only it in `update`; Add Form lists unstocked forms only, appends a row sent in `create`, hides when all held; Remove stages and Undo restores, Save sends `delete`; added-then-removed sends nothing; busy state; refusal alert keeps values and places prefixed issues; success closes and refreshes; discard guard asks. Delete `src/components/EditStock` (unmounted) with its tests, story and doc once green.

**7. Pencil, page data, card.** `covenCardActions` (`src/components/CovenCards/actions.tsx`, `types.ts`) takes the stock data (variants with ids, jars) and adds the `StockDialog` pencil for a member with inventory update, none for an observer; card foot and Quick Look share it by construction. `CovenCards/index.tsx` drops `JarLines`, passes `forms={false}` to `IngredientCard`, and renders the worst-state badge in `.specimen__stock`. SCSS: `IngredientCard/index.scss`, `_compact.scss`, `src/scss/_primitives.scss` replace the `ul > li` rules with a single-badge row keeping the centring over the action icons (re-measure at 1280 and 390). `reads.ts`: `readCovenIngredients` maps variant ids; `readViewedEntry` adds the viewed entry's jars. Tests: `tests/components/CovenCards/` (pencil for member not viewer, same actions in foot and Quick Look, name includes ingredient; one badge, no jar lines, no forms line, nothing when healthy), page/reads tests for the new data. `JarLines` becomes `FormLines` for step 8 rather than a second row component.

**8. Quick Look Forms section.** `IngredientEntry/summary.tsx` adds a Forms block from `detail.variants` (`ListBlock`/`blockOf` in `blocks.tsx`), placed after the description; optional `jars` prop in `types.ts`, passed through `details-dialog.tsx`; the coven page passes jars, `src/app/(public)/compendium/page.tsx` and `src/app/(shell)/admin/compendium/page.tsx` do not. Tests `tests/components/IngredientEntry/summary.test.tsx` and `details-dialog.test.tsx`: forms only without jars; with jars quantity+unit / "Unmeasured" / "Not Stocked" and the badge. The entry page's own Forms section is untouched (M12.29 adds Stock).

**9. Stories.** Rewrite `stockEditor` in `tests/e2e/stories/coven-ingredients.ts` around the dialog (open pencil, row by form label, fill, Save, wait close). Story 23 (`03-ingredients.spec.ts`) uses it and the single card badge. Story 24 is un-fixme'd and rewritten: edit, Add Form, staged Remove + Undo, refusal keeps values, viewer sees no pencil, Esc on the stacked dialog over Quick Look closes only the top and returns focus to the pencil. Re-enable story 14's editor step. Check `01-viewer.spec.ts` and `02-compendium.spec.ts` for the old label; the compendium story still sees the forms line on compendium cards.

**10. Ladle and docs** (`.claude/rules/components.md`): stories for StockDialog (held jars, none, all held, staged removal, refusal), card-level StockBadge, prefixed StockFields, FormLines; delete EditStock and JarLines stories. Docs under `claude-docs/components/`: add `stock-dialog.md`; update `stock-badge.md`, `stock-fields.md`, `coven-cards.md`, `ingredient-entry.md`, `ingredient-card.md`, `icon-tip.md`, `INDEX.md`; delete `edit-stock.md`, rename `jar-lines.md`; `claude-docs/db/stock.md` for `findStockByIds` and the batch.

**11. Task docs, synced in the same turn** (`node scripts/task-board.mjs sync <ID>` after each edit; keep heading hours consistent, M9.9 re-estimated for the larger scope):

- `claude-docs/tasks/m9.md` M9.9 → "Edit stock from the card": dialog, pencil through `covenCardActions`, Quick Look Forms section, single worst-state badge, coven-card forms removed, `saveStock`; acceptance criteria rewritten accordingly.
- M9.10: keeps a local entry's Delete only; jar removal is the dialog's Remove.
- `claude-docs/tasks/m12.md` M12.29: entry-page Stock section listing jars with badges, heading carries the same pencil opening `StockDialog`; no per-line Edit, no Add Stock dialog.

### Agents and order (owner's call, 2026-10-20: two lanes, then merge)

The main session briefs, reviews and merges; no hands-on edits here. Each lane commits every green step after `npm run pre-commit`, messages main with the hash, and is told the ~380k-token hand-back limit so it commits early.

| Lane           | Model                                                                       | Where                                                                                                                    | Steps             | Brief must include                                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A, backend** | Sonnet                                                                      | the m9.9 worktree, branch `feature/m9.9-edit-a-jar-from-its-row`; the existing agent `a1bcd42d5835fca4e` via SendMessage | 1 → 2 → 3         | the `saveStock` SDL above verbatim, the issue-path prefix shape, the rules it touches (1–5, 9, loader `clearStock`), that the three single-jar mutations stay                                                                                                         |
| **B, UI**      | Opus (writes most of the component tests; owner allows Opus for test lanes) | new worktree `/home/node/worktrees/m9.9-ui`, branch `feature/m9.9-ui` off the m9.9 branch's head                         | 4 ∥ 5 → 6 → 7 → 8 | the same SDL as a fixed contract, a hand-written `src/gql/` stub only if codegen is absent when it reaches step 6 (replaced by lane A's output at the merge), the `forms={false}` scope note, the badge-centring measurement, Title Case and the "Low Stock At" label |

**Contract between lanes:** the `SaveStockInput` shape, the mutation name and return type, and the prefixed issue paths (`create.<i>.input.<field>`, `update.<i>.input.<field>`) are fixed by this plan; neither lane changes them without a message to main.

**Merge:** main merges lane B's branch into the m9.9 branch after lane A's step 3 lands, resolves `src/gql/` in favour of codegen output, runs `npm run codegen` to check no diff, then sends steps 9 → 10 → 11 to lane A's agent in the m9.9 worktree (it holds the stories' context). Lane B's worktree is removed only after the owner confirms.

**Board:** M9.9 is already In Progress; neither lane changes its status. Only the owner's word opens the PR.

## Stock comes off the spell builder

### What changed

The spell builder no longer shows stock. The aside does not draw In Coven Inventory (`SpellInventory`), and no step row carries a supply verdict. M10.19 (story 54) had put both there.

Story 77's starting unit stays. The picker's `jarUnit` only presets a unit for a new step and shows no stock.

### Why

The owner: "When creating or editing a spell is stock really a concern? That should probably be part of doing a working and the spells page."

Writing a spell records what it calls for. Whether the coven holds enough is a question for the moment of making it, and for reading a spell before then.

### Where stock shows now

- The spell's page.
- The spell's Quick Look.
- Workings.

M13.21 owns those and moves `inventory.tsx`, `steps/supply.ts`, `steps/supply-mark.tsx` and `supply-icon.tsx` out of the builder. Until it does, those files stay unchanged and nothing in the builder renders them.

### Also changed

- `DESIGN.md` story 54 and M10.19's task entry say story 54 is met on those surfaces.
- The tests for In Coven Inventory in the builder (the component tests in `steps.test.tsx` and the story 54 flow in `06-grimoire.spec.ts`) are removed. M13.21 owns proving story 54 where it now lives.

## Search facets take lists and a toxic setting

The Compendium search and a coven's ingredient search used to filter by one form at a time. This record says how they now filter by several forms, deities, zodiac signs and planets at once, and by toxicity, and why. M11.22 builds the filters. M11.21 adds the two toxic flags the toxic setting reads. M12.3 and M12.4 build the facet screen and its counts.

### The decisions

| Question                               | Decision                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| How do several values of one kind mix? | They OR: an entry matches if it holds any one of them. Choosing Herb and Oil lists entries with either form.                                                                                     |
| How do different kinds mix?            | They AND: an entry must match every kind chosen. Herb together with the Sun lists only entries with a herb form and the Sun.                                                                     |
| What do the four lists take?           | `forms`, `zodiacSigns` and `celestialBodies` take text, folded (trimmed and lower-cased) on both sides. `deityIds` takes curated deity ids.                                                      |
| What is a form match?                  | An entry holding a live variant (a form row not soft-deleted) whose folded form is in the list.                                                                                                  |
| What does the toxic setting take?      | `ToxicFilter`: `any`, `toxic` or `not_toxic`. `any` and leaving it out are no filter.                                                                                                            |
| What is toxic?                         | An entry flagged toxic on itself, or on any live form. Rosemary is toxic if its Oil form is flagged, even when the entry is not.                                                                 |
| What is not toxic?                     | An entry where neither holds: not flagged itself, and no live form flagged.                                                                                                                      |
| Does a retired form count?             | No. A soft-deleted form's flag counts for nothing, either way, so retiring the flagged form makes the entry not toxic.                                                                           |
| What if a value matches nothing?       | It is no filter, not an error. An empty list, a blank entry, or a hand-edited address holding a value no entry has, is dropped, as `oneOf` in `src/lib/search-params.ts` drops a bad enum value. |
| What happens to categories?            | They keep their meaning: every chosen category (AND). M8.12 still adds an any-mode.                                                                                                              |
| Which queries take them?               | `compendium` and `workspaceIngredients`: the same five arguments, filtering the same way. The second stays under the coven's Membership proof.                                                   |

### Why OR within a kind and AND across kinds

A person who picks two forms is widening: "show me the herb or the oil". A person who adds a planet is narrowing: "of those, the ones ruled by the Sun". Anyone who has used a shop's filter panel expects this, so the screens M12.3 and M12.4 can show the facets without explaining a rule. Categories stay AND because that was decided first, and a toggle for it is already planned.

### Why toxic reads the entry or any live form

Toxicity is flagged on the entry and on each form (M11.21), because a plant can be safe to hold while one preparation of it is not. Someone who asks for "not toxic" is avoiding harm, so an entry with one flagged live form must not appear. The cost is that "not toxic" is the stricter setting: it is a fact about every live form together. Retired forms are ignored because they are gone from every page, and a flag nobody can see should neither hide nor show an entry.

### Why lists, not a repeated single argument

GraphQL has no repeated argument: a field takes each name once, so several values travel as one list. A list keeps the address readable (one parameter, many values), keeps each kind a single check in SQL, and lets the count and the page share one filter. Making several calls and merging them in the browser would break paging, since the browser never holds more than a page (rule 8 in `CLAUDE.md`).

### Why `form` was dropped rather than kept beside `forms`

Keeping both would leave two ways to say one thing and a rule for when they disagree, and a one-item list says everything the single value did. The admin Compendium list is the only caller of the old argument, so the change costs one caller: it keeps its single Form box and sends a one-item `forms` list.

### How it is built

- Each arm in `src/db/repository/ingredients.ts` is a correlated `EXISTS` (a subquery asking "is there a matching row for this entry?"). An entry is therefore one row however many of its forms or deities match, and no `DISTINCT` is needed.
- The count read and the page read share the arms, so `totalCount` and the page always agree.
- The repository's filter takes `forms`, `deityIds`, `zodiacSigns`, `celestialBodies` and `toxic: 'toxic' | 'not_toxic'`; `any` becomes no filter before it gets there.

### Not decided here

The facet screen, each facet's options and the counts beside them are M12.3 and M12.4. M8.12's any-mode for categories is unchanged.

## How the search filters sit together

The ingredient search holds more filters than one row can carry. This record says what published design guidance says about that, what layouts we considered and why five were turned down, and what the owner signed off: a "Filters (n)" button beside the search box that opens the facets as a grid panel over the results, and a search sentence that types itself while a search runs and settles into a one-line disclosure. It settles the layout only. MB.120 reviews the finished design. The owner signed the layout off on 2026-10-17 from the workshop stories `grid-tray*` and `sentence-disclosure-typed*`, under "Admin / Compendium List / Facet Layout" in `.ladle/facet-layout.stories.tsx`. The stories for the layouts turned down were deleted and are in git history.

### Context

By the end of Wave 12 an `IngredientSearch` page can filter by:

- a text query;
- categories, with an All/Any toggle (M8.12);
- Forms, a multi-select typeahead (a box that offers matches as you type) with the chosen values as chips inside it, each with its form icon (M12.7);
- Deities, a multi-select grouped by tradition;
- Zodiac signs, Planets and Elements (Fire, Water, Earth, Air and Spirit), each a chip combobox like Forms and Deities. A chip combobox is one control: the chosen values sit as chips inside it, and a dropdown offers the rest with their counts;
- Toxic, a three-way segmented control (Any, Toxic, Not Toxic);
- later, the stock filters (in stock only, low stock only) and a local-or-compendium chip;
- for the admin list only, No Refs (no references recorded).

Every value shows a count: how many results choosing it would give (M12.3). Above the results sits one sentence naming every chosen value. It has no links in it: a value is removed by its chip.

Laid out as plain rows, that is about eight rows before the first result, on a page that already has a left section nav and an app shell.

#### Constraints that hold whatever the layout

1. The sentence names every chosen value.
2. A hidden facet's chosen values stay named in the sentence, and the "Filters (n)" button carries the number of chosen values. The signed-off design relaxes the original wording ("as chips or in the sentence"): the sentence collapses into a one-line disclosure, so while it is closed the clauses naming the values are one tap away, not on screen (see Decision).
3. Every facet applies before hydration (before the page's JavaScript runs) through a GET form. The server renders the page, and a visitor with no JavaScript can still filter.
4. The page works at 375px, a common phone width.
5. All values are in the URL: a repeated parameter per value, so the form writes them itself (M8.13).

### Decision

Layout F as it ended, signed off by the owner on 2026-10-17: a Filters panel in the shape of a grid, with a typed disclosure sentence. One `<form method="get">` holds the search box and the panel.

#### The search row and the Filters button

The search box has a "Filters (n)" button beside it, n being the number of chosen values: each value counts one, a Toxic setting other than Any counts one, No Refs counts one, and Match (a mode, not a filter) counts none (owner, 2026-10-17). The text states the count, so it does not rest on colour or a badge alone (eBay asks for state to be exposed as text). Beside the button a quiet "Clear All" link resets every facet, and is hidden when nothing is chosen. Nothing else sits between the search row and the sentence: there is no row of chosen-value chips. In the collapsed and phone states the summary is the button and the sentence disclosure alone. A value is removed only inside the panel, through the cross on its chip in its control, and the panel's foot has Clear All too. The cost is against the original constraint 2 and Baymard's finding that users rely on an overview of applied filters, and that a bare count is not enough (Reeves): with the panel closed, the values are named in the sentence, but only after the disclosure is opened. This is the owner's call, and the build keeps the count on the button and the status region accurate so the summary does not mislead.

#### The panel

The panel is a native `<dialog>` element. The element is within the browser floor: the `web-features` data installed in this repository lists `dialog` as widely available since 2024-09-14, and `src/components/Modal` already uses it.

- **Desktop (the shell's tablet width, `$shell-tablet-width`, and up).** The button opens the dialog with `show()`, on the user's action, so it is non-modal. It slides down over the results, anchored under the search row, so the results never move. It has a shadow and no backdrop. Focus moves into it on open and back to the button on close. Escape closes it.
- **Phone (below that width).** The same panel opens with `showModal()` as a full-height sheet. The browser supplies a backdrop, holds focus inside, makes the page behind inert and closes on Escape. A foot that sticks to the bottom of the sheet holds Apply Filters, Close and Clear All.
- **Before hydration.** Nothing can open the panel, so the server renders the dialog with its `open` attribute, as an ordinary block above the results at every width. The "Filters (n)" control is, until the script runs, a link to the panel on the same page, and Apply Filters submits the GET form, so every facet still filters with no JavaScript. Once the script runs it closes the dialog and the link becomes a button. A phone visitor sees the long panel until then, and it collapses when the script runs, a layout shift the build must check does not move what the visitor is reading.
- **Reduced motion.** The slide snaps.

On desktop the rows are, in this order: Categories (wide) with Match (the All/Any toggle) and No Refs at its right; Forms (wide) with the Toxic strip at its right; Planets and Zodiac split evenly; Deities and Elements split evenly; Apply Filters and Clear All at the foot. The phone stacks the same rows in that order. The admin-only No Refs row is behind a prop that the public (M8.18) and coven (M9.6) lists leave off.

**Amended 2026-10-18 (M9.7).** The rows are now: Categories with Match beside it; one wrapping row of the small controls (Toxic, Source and In Stock where offered, No Refs for the admin); Forms, with a second slot beside it kept for the next dropdown facet; Planets and Zodiac; Deities and Elements; the foot. No Refs and Toxic moved off the Categories and Forms rows onto the small-controls row, Forms gained the partner slot (empty until a facet needs it), and every input in the panel takes a compact scale (2.5rem controls, narrower strip segments, tighter gaps; type, colour and focus rings unchanged). It was the owner's call on seeing the coven panel with Source and In Stock added.

#### The controls

- **Zodiac, Planets and Elements are chip comboboxes** like Forms and Deities: the chosen values as chips inside the control and a dropdown of the rest with their counts. One rule covers every facet: a value with a count of zero is left out of the dropdown (see "Zero-count values").
- **Toxic and Match are text segmented controls.** Neither vanishes: Match with fewer than two categories rests on All, disabled, with a hint saying it applies once two or more are chosen (owner, 2026-10-17), as Toxic does when it cannot narrow. The selected segment is filled. Toxic shows its count on each segment ("Toxic (4)"); Any is plain.
- **Counts** show on every dropdown option, on the Toxic segments, and on every chosen chip inside the panel's controls ("Oil (12) ×"). The chip loading state is below.
- **Removal** of a value is only by its chip's cross, inside the panel.
- **Changes in the panel are held and applied together.** This is the owner's call of 2026-10-17, replacing an earlier call that applied on every change. The panel covers the results, so a stray click would change what is hidden behind it, the case DWP and eBay give for batch filtering (DWP, eBay). Apply Filters, Escape and every other way the panel closes apply what was held in one navigation; Back steps through those and a reload restores them. There is no cancel, so nothing is silently discarded. Counts stay live in the panel, so a choice is never made blind (see "Live counts" below).
- **The Classification (`nomenclature`) filter leaves the search**, a named sub-hour change in this task. Nothing admin-only is exposed by the facets, because the compendium facets read takes no session.

#### Why this one

1. **The owner's calls.** Inline layouts take too much space; the sidebar doubles the left columns beside the shell nav; the tray alone needs a second inline layout; links in the sentence were confusing. The grid panel answers each: the results never move, there is no second left column, and one element is both the panel and the pre-hydration block.
2. **A native `<dialog>` does most of the accessibility work.** Opened with `showModal()` it supplies focus in, an inert page behind, Escape and focus back, which was the cost held against a tray (D). On desktop `show()` supplies none of the inert page or backdrop, so the script does the focus moves (see Accessibility).
3. **What it gives up.** DWP's warning that hidden filters are harder to find and to find again applies to the closed panel (DWP). The button's count and the sentence reduce it: the number of chosen values is always on the button, and the sentence names them once its disclosure is open. Removing or adding a value needs the panel.

#### How the GET form submits every facet

- Every control is a real form field with a name: a hidden input per chosen combobox value, radios for Toxic and for Match. They write the repeated parameters M8.13 specifies.
- The form wraps the search box and the dialog, so the search text and every facet go in one request at every width. A closed dialog's fields are not shown, so the build adds a test that they still reach the query string, since the sources do not say and the form must work either way. If that fails in any browser, the fallback is to render the dialog open when JavaScript is off, which is already the pre-hydration state.
- Pressing Apply Filters submits the form and reloads the page, the batch model that DWP and Maersk (for slow loads) recommend and that the MOJ filter uses. The live behaviour appears only once the script runs.

#### Zero-count values

- **Decision (owner, 2026-10-17): hidden, not disabled.** In every facet (Forms, Deities, Categories, Zodiac, Planets, Elements) a value with a count of zero is left out of the list. Toxic is the named exception (owner, 2026-10-17, later the same day): its three segments always show with their counts, and when Toxic or Not Toxic has a count of zero the field selects Any, is disabled as a whole and carries an InfoTip hint, because every matching entry shares one toxicity and the filter cannot narrow further. With both counts above zero it works as before. This departs from Smashing's "disable, do not hide" on purpose. The earlier rule (listed last, truly disabled, with a "Nothing Matches" note) is replaced; the note remains only for a caller's own disabled choice.
- A chosen value with a count of zero keeps its chip, with its cross, so the user can always remove it.
- A facet with no value left keeps its field with an empty list rather than vanishing, so the layout does not shift as the filter narrows.
- The native select drawn before hydration follows the same rule, so the form sent without script offers the same values.

### Amended 2026-10-18 (M9.7)

The owner chose choice chips over segmented strips for Match, Toxic and Source. A chip takes one line and a short menu, where a strip took a full row and its segments crowded at phone width. Match moves to the right of Categories, and Forms, Toxic, Source and In Stock share one line; the public and admin panels follow. Counts lose their brackets everywhere the panel owns the markup. Details: claude-docs/components/facet-panel.md.

### The search sentence

The sentence is plain `role="status"` text with no links in it. Its values are emphasised at weight 600. It leads with the count and the term ("12 ingredients matching “rue”"), and the first line always keeps the term. The pure function that builds it is already written (`src/components/IngredientSearch/sentence.ts`), returns typed fragments, and has a test that asserts its strings.

The motion is the owner's design, drawn in the `sentence-disclosure-typed*` stories:

1. **While a search runs,** the sentence types itself out as the loading line: the lead "Searching for ingredients", then the clauses.
2. **On return,** the lead is backspaced to "12 ingredients" at the normal pace and the remaining clauses finish typing, faster when the answer came back quickly.
3. **After a one-second hold,** the clauses slide up into a one-line disclosure. Its summary is the count-and-term line with a chevron at its end. There is no native marker and no "Show Search" text; a visually hidden label names the control.
4. **Show and hide slide smoothly,** with the text visible through the whole motion: the height transitions on an inner wrapper, and the `open` attribute stays until the closing transition ends.
5. **A new search** backspaces the old line rather than fading it, stopping short of the term when the term has not changed.

#### Accessibility of the sentence

- **The typed line is `aria-hidden`.** A screen reader would otherwise hear the line one character at a time. The real `role="status"` region gets the finished sentence once, on return. This follows Status Messages (4.1.3): the whole phrase is the status, it is delivered once, and the page warns that too many live regions make a page tiresome (W3C, "Understanding 4.1.3"). That a finished sentence delivered once is read well by each screen reader is untested here; the build checks it.
- **Reduced motion: no typing and no slide.** The finished sentence appears at once and the disclosure opens and closes without a transition. This is our constraint, honouring the user's `prefers-reduced-motion` setting; no source read for this task covers it.
- **The disclosure is a button with a name.** The summary is the control; the visually hidden label gives it a name where the chevron alone would give none. Whether a native `<details>` element exposes its open state to each screen reader is untested (the Disclosure pattern does not discuss it), so the build tests it.
- **The chevron** at the end of the summary reuses the Combobox's open-state rotation and fades in and out as the disclosure opens and closes. Under reduced motion it changes state without the fade.
- **Before hydration** the sentence is the finished text, with no typing, as the first thing above the results after the page reloads. A reload is a change of context, which 4.1.3 does not count as a status message.

### The chip loading state

The chips inside the panel's controls keep their counts, and while a search runs each chosen chip shows a skeleton placeholder (a grey bar) where its count goes, in place of the count that is now out of date. A chip added in the panel appears at once in that state, since its count is not known until the answer returns. When the answer returns the placeholder gives way to the count ("Oil (12) ×").

- The placeholder is decorative and hidden from assistive technology. The chip's accessible name stays the phrase that says what pressing it does, for example "Remove Form: Oil" (eBay), whether or not a count has arrived. The count is not announced while it is loading, because an out-of-date number is worse than none.
- The placeholder does not carry meaning by colour alone, since it stands where text will be. In reduced motion it is still, not pulsing. That is our constraint.

### Accessibility

How the signed-off layout works for a keyboard user and a screen-reader user, from the sources in [Sources](#sources) and from our own constraints. Where a source is silent, this section says so and names the test the build needs, in place of guessing.

#### What the sources set

- **Combobox** (W3C, "Combobox"): the combobox stays in the page's tab sequence and its popup does not. Focus stays on the combobox, and `aria-activedescendant` points at the option being highlighted. Down Arrow moves into the popup, Escape closes it, and Enter accepts the highlighted option. `aria-expanded` says whether the popup is open. The page says nothing about disabled options, and nothing about several chosen values shown as chips. Both are outside the pattern, so how a disabled zero-count option is announced, and whether arrow keys step over it, must be proved with a screen reader in the build.
- **Dialog, modal** (W3C, "Dialog (Modal)"): on open, focus moves into the dialog. Tab and Shift+Tab cycle inside it. Escape closes it. On close, focus returns to the element that opened it, unless that element is gone. The dialog needs a name, ideally from a visible title. `aria-modal="true"` belongs only where the code blocks all interaction outside and the styling visibly obscures it. This describes the phone sheet. The desktop panel is deliberately not modal, so the pattern does not govern it; the script supplies the focus moves.
- **Focus Order, 2.4.3, Level A** (W3C, "Understanding 2.4.3"): focus order must preserve meaning and operability. It may differ from the reading order, but the best practice is to keep them aligned. The page lists "inserting dynamic content immediately after its trigger" and HTML modal dialogs among sufficient techniques, and treats a dialog or menu that is not next to its trigger in the focus order as a failure. The build keeps the desktop panel next to its button in source order.
- **Focus Not Obscured (Minimum), 2.4.11, Level AA** (W3C, "Understanding 2.4.11"): a focused component must not be entirely hidden by author-created content. A sticky footer is the named risk, and the page's passing approaches are CSS scroll padding so the footer does not cover content, or a modal.
- **Status Messages, 4.1.3, Level AA** (W3C, "Understanding 4.1.3"): a status message must be programmatically determinable by role, so assistive technology can present it without moving focus. A line such as "18 results returned" counts as one. When a persistent count changes, the whole phrase is marked as the status, so a screen reader does not read only the number. A change delivered by a change of context, such as moving focus or reloading the page, is not what the criterion is about, and the page warns that too many live regions make a page tiresome.
- **Contrast (Minimum), 1.4.3, Level AA** (W3C, "Understanding 1.4.3"): text needs 4.5:1, or 3:1 if large. Text that is part of an inactive component, such as a disabled control, is exempt.

#### What the build has to do

- **Each chip's remove button names what it removes.** A cross reading "Water" says nothing about what pressing it does. eBay asks for a chip that announces its value and its category and exposes its applied state (eBay), so the accessible name is a phrase such as "Remove Element: Water", not the bare value. This holds for the chips inside each combobox.
- **(Superseded 2026-10-17: zeros are now hidden; this holds for a caller's own disabled choice.) A disabled zero-count option must stay perceivable and be announced as unavailable.** Smashing's rule is to disable the option, not hide it (Friedman). 1.4.3 exempts disabled text from the contrast minimum, but only for a component that is truly inactive, so the build must truly disable it, not dim a clickable row. The exemption lets us dim the text and does not require it. Our own choice, so a low-vision user can still read why a value is unavailable, is to keep a zero-count option's text at 4.5:1 and mark it as unavailable by the "Nothing Matches" note beside the count, not by contrast alone.
- **The count is read as part of the option.** Each option's text is the name and the count together, "Water (7)", so a screen reader reads the count with the name, the way the MOJ example writes "Blue (18)" (MOJ). The same holds for a Toxic segment ("Toxic (4)"). The count must not live only in a badge or a colour.
- **The panel has a name.** The dialog is named from its visible "Filters" title with `aria-labelledby`, as the Dialog pattern advises.
- **Focus on the desktop panel.** Opening moves focus into the panel, Escape closes it, and closing returns focus to the button. Because `show()` makes the panel non-modal, nothing else holds focus inside it. This is our design, and the build tests the three moves.
- **The Escape clash.** Escape closes a combobox popup (Combobox pattern) and also closes the dialog. An Escape pressed with a popup open should close the popup only. This is our inference from the two pages, not something either says. Closing a modal dialog on Escape is the browser's default, so the build must stop that default when a popup is open.
- **The sentence behind the phone sheet.** While `showModal()` is open the page behind, including the status region, is inert. The Apply Filters button in the sheet carries the number of results (eBay puts the count on the panel's main button). How a screen reader treats a live region in an inert page is untested, and the build checks it.
- **Sticky foot (2.4.11).** The phone sheet scrolls inside the dialog and its foot sticks to the bottom. The build sets scroll padding on the dialog equal to the foot's height, the technique the 2.4.11 page names, and tests that a field focused by keyboard at the bottom of the sheet stays at least partly visible.
- **Source order is visual order.** No layout uses CSS `order` to reorder fields, so the tab order equals the reading order (2.4.3). The grid places fields by row, and the source is written in the same row order.
- **Applying together keeps the status region quiet.** The results reload and the status updates once per apply, never per held change. The sentence's finished text is announced once per search, not per typed character.
- **No JavaScript.** The e2e suite includes a run with JavaScript off at each width, since the stories show only the hydrated state.

### Built

The layout was built as decided, in [`FacetPanel`](../components/facet-panel.md), [`SearchSentence`](../components/search-sentence.md) and the compendium list's filter row ([`CompendiumList`](../components/compendium-list.md)). The layout stories were removed once it was. Where the build differs from the text above:

- The Filters (n) count is the number of chosen values, Match counting none.
- Before the script runs, categories are a native multiple select inside the panel, so every facet filters through the GET form.
- Changes are held until applied, as decided above. Apply Filters, Escape, the Filters button and the sheet's Close all apply what was held, in one navigation, and a close with nothing changed pushes nothing. Text typed in the Name box applies only through Apply Filters or Enter, while a panel close applies the facets under the name already applied.
- Clear All is a link to the unfiltered list, so it still works before the script runs. Once hydrated, the one beside the Filters button applies at once, softly; the one at the panel's foot clears what is held, then applies and closes.
- Live counts: while something is held, the panel asks `compendiumFacets` (M12.3) through `/api/graphql`, with no session, for the held filter, after the same pause the Name box waits, and shows the answer in its options, segments and chips, which show their placeholder while it comes. An answer for a filter since replaced is never shown, because the query is keyed by the filter. The list and the sentence keep to the applied filter. Once the held filter matches the applied one again, the counts the server drew are shown. The page gives the list a `vocabulary` prop (deities with their ids, the form icons) so the client can turn the answer back into labelled counts.
- A new text search draws the filter row afresh, which closes the panel; a facet change does not.
- In the sentence, a deity whose name another deity shares is named with its tradition.

### Amended 2026-10-19: the row sticks

The search row, with the Filters button and Clear All, sticks to the top once scrolled to (M8.18, the owner's call). The tray opens inside the row's form, so it travels with the row and still opens under it; at the tablet width and up it is capped to the window's height and scrolls inside itself. The phone sheet is unchanged. See `claude-docs/components/ingredient-search.md`.

## A coven's cupboard names the compendium's entry, rather than hiding it

Live home: `claude-docs/db/workspace-compendium-entries.md`, "`workspace_compendium_entries`, a compendium entry in a coven's cupboard" and "Why a table of its own".

### Decision

A coven's cupboard is its own ingredients plus the compendium entries it names in `workspace_compendium_entries`. One row states "this coven holds this entry" and carries the coven's own say over it: a label, a description, safety notes and four lists, where null defers to the compendium and `[]` clears on purpose. An own ingredient is never hidden because its name matches a compendium entry.

- An entry is added, annotated and removed through the row; the first jar of a compendium variant creates the row when it is absent. Removal is refused while a jar exists.
- An own ingredient and a compendium entry convert into each other (`convertLocalToCompendiumEntry`, `convertCompendiumEntryToLocal`); a possible duplicate is asked about at the add step (Use It, Add Our Own, Open It) instead of being resolved silently.
- An entry the compendium retires stays readable to the covens that hold a row for it, marked "No Longer in the Compendium"; everyone else gets `NotFound`.
- A curator's delete shows how many covens use the entry, as a count and never a name.

### Why

The earlier rule guessed the fact by matching a coven's ingredient to a compendium entry on name. A row states it. An `ingredients` row cannot be the override: `name`, `slug` and `nomenclature` are required, the identity key is generated from the name, and a row made to fit would invent a name and slug for something that is not a second ingredient.

### Rules out

- **Hiding a compendium entry behind a same-named own ingredient.** A name match is a guess, and it made the entry vanish from the coven's list.
- **The save-time jar follow and the stock redirect.** Both existed to paper over the hiding rule, and both were retired once the row stated the fact.
- **A separate `Ingredient` type for the stub.** The stub shows twice, with a nudge, instead.

## A retired entry stays readable to the covens that use it

The cupboard plan's sixth decision
([`m12.13-cupboard-names-the-compendium.md`](m12.13-cupboard-names-the-compendium.md)),
built: when a curator deletes a compendium entry, the covens whose cupboard
names it go on reading it, marked "No Longer in the Compendium", and everyone
else loses it at once. The result is in
[`db/workspace-compendium-entries.md`](../db/workspace-compendium-entries.md),
"When the compendium retires the entry", and in DESIGN.md §5's third
enforcement rule, which now names a fifth exception to CLAUDE.md rule 4.

### Why a read past the tombstone

A curator's delete is a soft delete of the `ingredients` row alone. A coven
that added the entry to its cupboard may have jars of its forms and its own
wording over it. Without an exception, every read filters the entry, and
`existsIn` filters it as a parent, so the coven's jars and its cupboard row
would vanish from its own screens on someone else's edit. Copying the entry
into every holding coven on delete was ruled out in the plan: a coven turns a
compendium entry into its own only by its own action (M12.23).

### Decided

**One named hatch, not a flag.** `findCupboardEntryIncludingSoftDeleted(membership, ingredientId)`
in `src/db/repository/cupboard-entries.ts` ends in the escape hatch's suffix
and is pinned by the soft-delete guard beside M5.3's, MB.138's and MB.10's. It
reads the entry past its tombstone only while the entry is a compendium one and
the proof's coven has a live cupboard row naming it, and returns the two
together. The cupboard row's own tombstone still filters, so a coven that
removes the entry from its cupboard stops reading it.

**The children follow on the same proof.** The entry's forms, folk names,
categories, deities, substitutes and references, and the coven's jars, are read
by finders that check the parent through `existsIn`. Each takes an optional
last `heldBy` proof, and with it reads the parent through
`inUseIngredientParent` or `inUseVariantParent` in `ingredient-parent.ts`: the
parent is live and in a tier the proofs read, as before, or it is a compendium
entry with a live cupboard row of `heldBy`'s coven. Without `heldBy` each is the
read it was, so every caller that does not pass one is unchanged.

**The tier is checked on both arms.** The cupboard table does not refuse a row
naming a coven's own ingredient. An arm that admitted any parent named by a
live cupboard row would let a stray row reach another coven's deleted
ingredient's children, so the retired arm requires `workspace_id IS NULL`, and
the live arm keeps `inTiers`.

**A builder past the parent's filter, in `select.ts`.** The two arms must sit
inside one `EXISTS` over the ingredient, and `existsIn` ANDs the parent's
tombstone filter by construction. `existsInIncludingSoftDeleted` is `existsIn`
without that filter. It is in `select.ts`, beside `existsIn`, and is not in the
repository's index, so only the folder's files reach it. It is named as the
hatches are, so a second caller is a decision in the diff.

**Nothing new reaches it.** The public page, the public list and its search,
the add flow's exact match and both groups of the ingredient picker read live
rows and take no `heldBy`. A coven keeps what it has, and adds no form or
child to a retired entry. (Until 2026-10-19 this read "adds nothing to it",
and refused a new jar of a retired entry's form; see "Changed: annotate, Make
It Ours, remove and jars" below.)

**Marked on the page and the wire.** `Ingredient.retired` is true for a
retired entry, and `IngredientDetail.retired` carries it to the entry page,
which marks it and gives it no public link, no canonical address and no
curator Edit.

### Changed: annotate, Make It Ours, remove and jars (2026-10-19)

**What changed.** A coven holding a retired entry may now:

- annotate it, through its cupboard row's overrides;
- use Make It Ours (M12.23) on it;
- remove it from its cupboard, which soft-deletes (marks deleted, without
  erasing) the coven's cupboard row;
- add a jar of one of its forms, change a jar and remove a jar.

The entry page's Edit menu offers Annotate, Make It Ours and Remove, each to a
role that may do it, and still offers no Add and no curator Edit. Once a
member removes the entry, the page they were on no longer exists for them, so
the page leads to the coven's Ingredients list (`/coven/[slug]/ingredients`)
instead of reading itself again into a 404. A live entry's page still reads
itself again after a remove, and shows Add to Cupboard.

**Why.** The owner's decision. Make It Ours is the way out of a retired
entry, the coven's own row is the coven's to word or drop, and its jars are
its own stock, so refusing these left the coven unable to change anything
about an entry it still uses.

**How, choosing the existing hatch over a new one.** `annotateCupboardEntry`
now finds its row through `heldCompendiumEntry`, as
`convertCompendiumEntryToLocal` already did, so neither needs a new hatch, a
raw `sql` subquery or a wider reader. Neither writes the retired
`ingredients` row, and both stop once the coven's row is soft-deleted. The
annotate mutation reads the entry's name through `getIngredient`, since the
`ingredientsById` loader reads live entries only. `removeCupboardEntry`
finds its row through the same `heldCompendiumEntry`.

A new jar is admitted on the same proof as the list: a compendium entry
(`workspace_id IS NULL`), and this coven's live cupboard row naming it.
`createStock` passes the coven's membership to `findReadableVariant` as
`heldBy`, the existing `inUseIngredientParent` pattern, and checks the row
again through `heldCompendiumEntry` under the coven's stock lock, so a
remove racing the add cannot leave a jar behind. It never writes a second
cupboard row for a retired entry. Changing and removing a jar already worked,
because `findManyStock` reads through `inUseVariantParent`. A coven's own
deleted ingredient's forms are still refused, since the pattern admits only a
compendium parent.

The page's leaving is the client's: `CupboardActions` takes an optional
`removedHref`, which the entry page sets only for a retired entry, and
navigates there with `replace`, as the other delete-then-leave flows do, so
Back does not return to the gone page.

The change is recorded here rather than in a record of its own, because it
reuses this record's hatch and the existing `heldBy` pattern, and changes
only what the page offers and the one finder's argument.

Gaps that stay:

- `InventoryItem.ingredient` and `InventoryItem.variant` read through the
  live-only `ingredientsById` loader, so over GraphQL a retired entry's jar
  answers "No such ingredient" if either is selected. It was already so for
  changing a jar.
- No screen adds a jar yet, so the add is proved by service and GraphQL tests
  only.

And the page's tab title reads the cupboard row live-only, so a
retired entry's tab shows the compendium name, not the coven's label.

### Ruled out

- **Reading the children past their parent's filter on the cupboard row
  alone.** Simpler, but with no tier check in SQL a stray cupboard row would
  admit another coven's deleted ingredient's children (CLAUDE.md rule 7).
- **Importing the database client into `ingredient-parent.ts`.** It would
  build the same subquery, but the files allowed to import `../connection`
  are a pinned list, and a seventh is a larger exemption than a named builder.
- **A raw `sql` subquery.** What MB.100 removed, and what the guard cannot
  read.
- **A second branded proof** for "this coven holds this entry". It would make
  the hatch's answer a type the finders could demand, but it is a second
  branded type to build and thread through every child finder, for one reader,
  where the membership proof the finders already take says which coven to ask.
- **Two statements, as M5.3 reads a deleted parent's children.** M5.3 has to,
  because its parents are a spell's layers. Here the parent is one row the
  `EXISTS` already names, so one statement holds the whole rule.

### Not yet covered

The GraphQL child loaders, and `Ingredient.cupboardEntry`, read nothing for a
retired entry: a loader's key names the ingredient, not the coven reading it,
so there is no proof to pass as `heldBy`. The entry page reads its children
through `ingredientDetailOf` instead. The cupboard list row is M12.18's, and
the mark on cupboard rows and jars waits for the screens that draw them.

The coven's Ingredients list was the one coven read still dropping the entry;
M12.32 extended this rule to it, its count and its filter counts, through a
second hatch-named scope, `workspaceListScopeIncludingSoftDeleted`
([`db/soft-delete.md`](../db/soft-delete.md)).

## Linking Goes One Way

**Decided:** 2026-10-20, by the owner. In v1 a coven can annotate a compendium entry and make it its own (Make It Ours, Annotate). It cannot link one of its own ingredients to a compendium entry. That direction is a v2 feature ([`../DESIGN.md`](../DESIGN.md) §13, "Link to the Compendium"). The task is M12.42 in [`../tasks/m12.md`](../tasks/m12.md).

### What "linking" meant

Linking a coven's own ingredient to the compendium meant the own entry stopped existing: it was converted into one compendium entry, or split across several, and its jars and spell layers moved onto the compendium's forms. Two mechanisms did this.

- **On staging:** M12.21's `convertLocalToCompendiumEntry`, and the "This Is It" and "Link to Selected" actions on M12.22's Similar in the Compendium block.
- **On the M8.17 branch:** a Link dialog opened from the entry page's Edit menu, the list card's More and the edit dialog's foot. It searched the whole compendium, took one pick or several, mapped each of the own entry's forms to a pick in a form map (Our Form, Holds, Goes To), and sent `splitLocalIntoCompendiumEntries`. It also had a Keep Our Name select, and a summary tooltip for each pick.

### Why

- **Two mechanisms for one job.** The block on the entry page converted an entry to one compendium entry; the dialog converted it to one or several. Each had its own refusals (a missing form, a jar collision), its own tests and its own words in the docs.
- **The dialog kept growing.** The form map, the Keep Our Name select and the pick summaries each came from a real question, and each opened another. The coven forms drafts (M12.39–M12.41) were the next step: a form the compendium lacks would need a form of the coven's own on the compendium entry. That is a larger feature than a link, and v1 does not need it.
- **There is another way in.** Make It Ours already brings a compendium entry into the coven as its own, and Annotate lets a coven add to a compendium entry without owning it. A coven that wants the reference can use the compendium entry from the start (M12.13–M12.28's cupboard rows).

### What stays

- **Annotate and Make It Ours**, unchanged.
- **Similar in the Compendium**, as a read-only list on an own entry with no formal name. The member sees which compendium entries the own entry might be, and each links to its compendium page. Nothing on the page changes the coven's data.
- **In the Compendium**, for an own entry with a formal name, unchanged.
- The shared helpers Make It Ours uses (`sortedNames`, `answered`, `foldForm`, `refuseLabelTaken`, the lock and layer-move helpers) and `DroppedOnConvert`, whose schema description is reworded to one direction.

### What went where

| Work                                                                                                    | Now                                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| The Link dialog, the split service, the form map, the pick summaries, and the M12.38–M12.41 task drafts | The pushed branch `feature/link-to-compendium-v2`, commit 6adcd849, as they stood                                     |
| M8.17's Link parts                                                                                      | Stripped from M8.17's branch; its entry in [`../tasks/m8.md`](../tasks/m8.md) says so                                 |
| M12.21's conversion and M12.22's This Is It                                                             | Removed by M12.42                                                                                                     |
| M12.38–M12.41 (issues #1138–#1141)                                                                      | Retired, 2026-10-20, closed as not planned; their entries in [`../tasks/m12.md`](../tasks/m12.md) point at the branch |
| The v2 description                                                                                      | [`../DESIGN.md`](../DESIGN.md) §13, "Link to the Compendium"; the out-of-scope list in `CLAUDE.md`                    |

The records [`m8.17-editing-a-coven-ingredient.md`](m8.17-editing-a-coven-ingredient.md) and [`m12.13-cupboard-names-the-compendium.md`](m12.13-cupboard-names-the-compendium.md) carry a dated note at the top and are otherwise left as approved.

### Picking v2 back up

Start from the branch, not from the retired task entries: the full drafts, including the record `m12.39-coven-forms-on-compendium-entries.md`, are on it. Mint new tasks with fresh ids; the retired ids are taken.

## How each search facet sorts its values

The Filters panel on the ingredient lists holds eight facets, each a list of values a search can be narrowed by, with the number of entries each would leave. Nobody had chosen their order as a whole: three sorted by count, two alphabetically, three in a fixed order, and one (Categories) showed one order before the script loaded and another after. This record holds the owner's answer for each facet, decided on 2026-10-21 from a throwaway workshop story that showed every facet's real seeded values both ways, unfiltered and narrowed. It changes no code: the build is proposed at the end.

The short version: **nothing sorts by count.** Every list of names sorts alphabetically in natural-language order, a category under its group and a deity under its tradition, with the groups and traditions alphabetical too. Zodiac takes the calendar's order and Celestial Bodies the solar system's. Toxic, Source and Elements keep the fixed order they have. Because no facet moves to count order, the questions about when a list counts as "narrowed" and whether it may reorder while the panel is open have no facet to apply to, and are answered once below for the record.

### Context

The panel (`src/components/FacetPanel/index.tsx`) appears on the public compendium, the admin compendium and a coven's Ingredients page, and Wave 13's Grimoire will take it through the same shared search (DESIGN.md story 49: "Search and filter ingredients with the same controls as the ingredients"). The order a value list arrives in is set in three layers, and today each facet's order comes from a different one:

| Facet                    | Database read (`src/db/repository/ingredient-facets.ts`)                              | `src/components/CompendiumList/facets.ts` | Component                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categories               | `ordered()`, line 409: count descending, then value by character code                 | line 109, `byCountThenLabel`              | `CategoryPicker/index.tsx` line 38 re-sorts by group name, then name. The pre-script native select (`NativeCategories` in `FacetPanel`) keeps the count order, so the two disagree |
| Forms                    | `ordered()`                                                                           | line 93, count then label                 | none                                                                                                                                                                               |
| Deities                  | `ordered()`                                                                           | line 101, count, label, then tradition    | `Combobox/index.tsx` lines 59 to 73: tradition headings in the order they first appear                                                                                             |
| Celestial Bodies, Zodiac | line 326, `orderBy: [vocabulary.name, vocabulary.id]`, under the database's collation | lines 110 and 111, no sort                | none                                                                                                                                                                               |
| Elements                 | line 346, the enum's order (earth, air, fire, water, spirit)                          | no sort                                   | none                                                                                                                                                                               |
| Toxic                    | lines 362 to 364, fixed (toxic, not_toxic)                                            | no sort                                   | `FacetPanel`: Any, Toxic, Not Toxic                                                                                                                                                |
| Source                   | line 117, fixed (local, compendium)                                                   | none                                      | `FacetPanel`: All, Local, Compendium                                                                                                                                               |

While the panel is open every change re-asks the counts (`src/components/CompendiumList/live-facets.ts`) and runs `facets.ts` again, so a count-ordered facet re-sorts under the pointer. The alphabetical and fixed facets keep their order because nothing about it depends on the counts.

The survey behind the tables below read the seeded demo data through the repository's own finders, `findCompendiumFacets` and `findWorkspaceIngredientFacets`: 324 compendium entries and the Whitethorn Coven's cupboard of 13 (2 of its own, 11 borrowed from the compendium). Four narrowings were tried: nothing held, the query "rose" (20 compendium entries), the category Purification held (72), and both together. The tables show the compendium unfiltered and under "rose"; the other narrowings looked the same in kind, and the coven's lists differ only in being shorter.

In every table `⌀` marks a value counting nothing and `=` a value tied on count with the one below it. Zero-count values are shown so the order can be read whole; the panel hides them unless chosen (M12.4, "Zero-count values").

### The rule for "narrowed"

Asked once, for every facet, because the task asked for it; it binds nothing today since no facet took count order. Had one, "narrowed" would have meant **any held filter or a non-empty typed query**, the same test `heldFilter` in `src/components/CompendiumList/filter.tsx` makes for the Clear All link, and never only the facet's own kind, which would leave the list reordering as the reader's own chips were added. The order would have been **fixed when the panel opens** and held until it closes, with the live counts updating in place, so a list never moves under the pointer. The owner's choice of alphabetical and fixed orders everywhere makes both moot: the order never depends on the counts, so it cannot move, open or closed.

### What "alphabetical" means

The owner chose **natural-language order, in SQL**: case set aside, an accented letter beside its plain one (Áine beside Aine, not after Zeus), ties by id. Today the forms, deities and categories lists sort in JavaScript by character code (`byCodeUnit` in `ingredient-facets.ts`; the doc says "the same on every server"), which puts a capital before every lower-case letter and every accented letter after Z, while the zodiac and celestial reads already sort in SQL under the database's collation (`en_US.utf8` in the image, per `claude-docs/db/compendium-read.md`). Sorting in SQL makes the server's pre-script order and the hydrated order the same thing, so the native select and the picker cannot disagree again. The build task should name the collation in the query rather than lean on the image's locale, so that the order is the same on Neon as in the devcontainer; whether an ICU collation such as `"en-US-x-icu"` is available on Neon is for that task to check first.

### Categories

**Question.** The data layer sends count order, the pre-script native select shows it, and the picker re-sorts by group then name. Which order should every surface use?

**Options.** Group then name, alphabetical (the picker's order today); group alphabetical with names by count within; count then name flat (the data layer's order today); name alphabetical flat.

Unfiltered, the compendium's 60 categories:

| #   | Alphabetical                                       | By count, then name                                |
| --- | -------------------------------------------------- | -------------------------------------------------- |
| 1   | Prosperity & Work · Abundance (40) =               | Protection & Defense · Protection (205)            |
| 2   | Practice & Place · Ancestor Work (13) =            | Wellbeing · Healing (140)                          |
| 3   | Love & Connection · Attraction (6) =               | Love & Connection · Love (134)                     |
| 4   | Protection & Defense · Banishing (54)              | Mind & Spirit · Divination (85)                    |
| 5   | Protection & Defense · Binding (19) =              | Cleansing & Release · Purification (72)            |
| 6   | Prosperity & Work · Business (6) =                 | Wellbeing · Peace (68)                             |
| 7   | Mind & Spirit · Clarity (31)                       | Mind & Spirit · Psychic Work (65)                  |
| 8   | Cleansing & Release · Cleansing (21) =             | Practice & Place · Fertility (60)                  |
| 9   | Practice & Place · Communication (19) =            | Prosperity & Work · Prosperity (56)                |
| 10  | Wellbeing · Confidence (23) =                      | Protection & Defense · Banishing (54)              |
| 11  | Wellbeing · Courage (43)                           | Wellbeing · Strength (47)                          |
| 12  | Craft & Change · Creativity (36)                   | Wellbeing · Courage (43)                           |
| 13  | Mind & Spirit · Divination (85)                    | Mind & Spirit · Dream Work (42)                    |
| 14  | Mind & Spirit · Dream Work (42)                    | Prosperity & Work · Abundance (40) =               |
| 15  | Practice & Place · Familiar Work (1) =             | Prosperity & Work · Success (40) =                 |
| 16  | Practice & Place · Fertility (60)                  | Craft & Change · Creativity (36)                   |
| 17  | Love & Connection · Fidelity (30) =                | Love & Connection · Harmony (34)                   |
| 18  | Cleansing & Release · Forgiveness (5) =            | Mind & Spirit · Wisdom (33)                        |
| 19  | Love & Connection · Friendship (8)                 | Mind & Spirit · Truth (32)                         |
| 20  | Prosperity & Work · Gambling (6) =                 | Mind & Spirit · Clarity (31)                       |
| 21  | Cleansing & Release · Grief Work (2) =             | Love & Connection · Fidelity (30) =                |
| 22  | Craft & Change · Grounding (14) =                  | Cleansing & Release · Release (30) =               |
| 23  | Love & Connection · Harmony (34)                   | Mind & Spirit · Intuition (29)                     |
| 24  | Wellbeing · Healing (140)                          | Love & Connection · Lust (24)                      |
| 25  | Protection & Defense · Hex-Breaking (11)           | Wellbeing · Confidence (23) =                      |
| 26  | Practice & Place · Home Blessing (1) =             | Craft & Change · Manifestation (23) =              |
| 27  | Craft & Change · Inspiration (17) =                | Cleansing & Release · Cleansing (21) =             |
| 28  | Mind & Spirit · Intuition (29)                     | Mind & Spirit · Prophecy (21) =                    |
| 29  | Wellbeing · Joy (7) =                              | Protection & Defense · Binding (19) =              |
| 30  | Prosperity & Work · Justice (13) =                 | Practice & Place · Communication (19) =            |
| 31  | Mind & Spirit · Knowledge (17) =                   | Craft & Change · Inspiration (17) =                |
| 32  | Prosperity & Work · Legal Matters (17) =           | Mind & Spirit · Knowledge (17) =                   |
| 33  | Wellbeing · Longevity (10)                         | Prosperity & Work · Legal Matters (17) =           |
| 34  | Love & Connection · Love (134)                     | Mind & Spirit · Meditation (15) =                  |
| 35  | Love & Connection · Lust (24)                      | Protection & Defense · Nightmare Protection (15) = |
| 36  | Craft & Change · Manifestation (23) =              | Wellbeing · Sleep (15) =                           |
| 37  | Mind & Spirit · Meditation (15) =                  | Prosperity & Work · Wealth (15) =                  |
| 38  | Mind & Spirit · Memory (6) =                       | Craft & Change · Grounding (14) =                  |
| 39  | Protection & Defense · Nightmare Protection (15) = | Craft & Change · Transformation (14) =             |
| 40  | Wellbeing · Peace (68)                             | Practice & Place · Ancestor Work (13) =            |
| 41  | Mind & Spirit · Prophecy (21) =                    | Prosperity & Work · Justice (13) =                 |
| 42  | Prosperity & Work · Prosperity (56)                | Protection & Defense · Hex-Breaking (11)           |
| 43  | Protection & Defense · Protection (205)            | Wellbeing · Longevity (10)                         |
| 44  | Mind & Spirit · Psychic Work (65)                  | Love & Connection · Friendship (8)                 |
| 45  | Cleansing & Release · Purification (72)            | Wellbeing · Joy (7) =                              |
| 46  | Love & Connection · Reconciliation (4)             | Protection & Defense · Warding (7) =               |
| 47  | Cleansing & Release · Release (30) =               | Love & Connection · Attraction (6) =               |
| 48  | Protection & Defense · Reversal (2) =              | Prosperity & Work · Business (6) =                 |
| 49  | Practice & Place · Safe Travel (5) =               | Prosperity & Work · Gambling (6) =                 |
| 50  | Love & Connection · Self-Love (1) =                | Mind & Spirit · Memory (6) =                       |
| 51  | Wellbeing · Sleep (15) =                           | Cleansing & Release · Forgiveness (5) =            |
| 52  | Practice & Place · Spirit Work (3) =               | Practice & Place · Safe Travel (5) =               |
| 53  | Wellbeing · Strength (47)                          | Love & Connection · Reconciliation (4)             |
| 54  | Prosperity & Work · Success (40) =                 | Practice & Place · Spirit Work (3) =               |
| 55  | Craft & Change · Transformation (14) =             | Protection & Defense · Uncrossing (3) =            |
| 56  | Mind & Spirit · Truth (32)                         | Cleansing & Release · Grief Work (2) =             |
| 57  | Protection & Defense · Uncrossing (3) =            | Protection & Defense · Reversal (2) =              |
| 58  | Protection & Defense · Warding (7) =               | Practice & Place · Familiar Work (1) =             |
| 59  | Prosperity & Work · Wealth (15) =                  | Practice & Place · Home Blessing (1) =             |
| 60  | Mind & Spirit · Wisdom (33)                        | Love & Connection · Self-Love (1) =                |

Headings, first-appearance order under alphabetical: Prosperity & Work · Practice & Place · Love & Connection · Protection & Defense · Mind & Spirit · Cleansing & Release · Wellbeing · Craft & Change

Headings, first-appearance order under by-count: Protection & Defense · Wellbeing · Love & Connection · Mind & Spirit · Cleansing & Release · Practice & Place · Prosperity & Work · Craft & Change

Headings alphabetical: Cleansing & Release · Craft & Change · Love & Connection · Mind & Spirit · Practice & Place · Prosperity & Work · Protection & Defense · Wellbeing

Narrowed by the query "rose":

| #   | Alphabetical                            | By count, then name                      |
| --- | --------------------------------------- | ---------------------------------------- |
| 1   | Prosperity & Work · Abundance (2) =     | Protection & Defense · Protection (15)   |
| 2   | Love & Connection · Attraction (1) =    | Love & Connection · Love (10)            |
| 3   | Protection & Defense · Banishing (6) =  | Wellbeing · Healing (8)                  |
| 4   | Protection & Defense · Binding (2) =    | Protection & Defense · Banishing (6) =   |
| 5   | Cleansing & Release · Cleansing (2) =   | Practice & Place · Fertility (6) =       |
| 6   | Practice & Place · Communication (2) =  | Prosperity & Work · Prosperity (6) =     |
| 7   | Wellbeing · Confidence (1) =            | Mind & Spirit · Divination (5) =         |
| 8   | Wellbeing · Courage (4) =               | Mind & Spirit · Dream Work (5) =         |
| 9   | Craft & Change · Creativity (3) =       | Wellbeing · Courage (4) =                |
| 10  | Mind & Spirit · Divination (5) =        | Wellbeing · Peace (4) =                  |
| 11  | Mind & Spirit · Dream Work (5) =        | Cleansing & Release · Purification (4) = |
| 12  | Practice & Place · Fertility (6) =      | Craft & Change · Creativity (3) =        |
| 13  | Love & Connection · Fidelity (2) =      | Love & Connection · Harmony (3) =        |
| 14  | Cleansing & Release · Forgiveness (1) = | Mind & Spirit · Psychic Work (3) =       |
| 15  | Cleansing & Release · Grief Work (1) =  | Wellbeing · Strength (3) =               |

(The first 15 of 36 values; the rest follow the same rule.)

**Answer.** Group, then name, alphabetical, everywhere.

**Reason.** The groups are the semantic set (eBay's "logical order"; Moran's grocery categories), and the names within a group are known words. A flat alphabetical list interleaves the groups (Abundance, Ancestor Work, Attraction, Banishing…), and the count order puts Protection, Healing and Love first and then reshuffles with every narrowing. The picker already shows the chosen order; the fix is to make the data layer send it, so the native select agrees and the picker's re-sort can go.

**Owning layer.** The repository read: `ordered()` in `src/db/repository/ingredient-facets.ts` gives way to an `ORDER BY` over group name, then category name, under the named collation. `facets.ts` line 109 and `CategoryPicker/index.tsx` line 38 stop sorting. `NativeCategories` in `FacetPanel` already renders in the order given.

### Toxic

**Question.** The chip's menu is fixed as Any, Toxic, Not Toxic. Keep it?

**Options.** Keep; or Any, Not Toxic, Toxic.

| #   | Alphabetical    | By count, then name | Vocabulary order |
| --- | --------------- | ------------------- | ---------------- |
| 1   | Not Toxic (324) | Not Toxic (324)     | Toxic (0) ⌀      |
| 2   | Toxic (0) ⌀     | Toxic (0) ⌀         | Not Toxic (324)  |

The "Vocabulary order" column is the read's fixed order (toxic, not_toxic); the chip puts Any before both. Zero-count values stay visible in this facet alone (M12.4).

**Answer.** Keep Any, Toxic, Not Toxic.

**Reason.** A three-value ordinal set with a fixed logical order, eBay's third rule. The counts never reorder it.

**Owning layer.** Unchanged: `toxicFacet` in the repository and the chip in `FacetPanel`.

### Source

**Question.** On a coven's Ingredients page the chip is fixed as All, Local, Compendium. Keep it?

**Options.** Keep; or All, Compendium, Local.

The Whitethorn Coven, nothing held:

| #   | Alphabetical    | By count, then name | Vocabulary order |
| --- | --------------- | ------------------- | ---------------- |
| 1   | Compendium (11) | Compendium (11)     | Local (2)        |
| 2   | Local (2)       | Local (2)           | Compendium (11)  |

**Answer.** Keep All, Local, Compendium.

**Reason.** A fixed logical order: the coven's own entries before the ones it borrows. The counts never reorder it.

**Owning layer.** Unchanged: the repository's fixed `['local', 'compendium']` and the chip in `FacetPanel`.

### Forms

**Question.** Forms sort by count then name everywhere and re-sort live. Once narrowed the list is mostly ties at one or two. Alphabetical always, alphabetical then by count once narrowed, or count always?

**Options.** As the question lists them.

Unfiltered, the compendium's 54 forms:

| #   | Alphabetical   | By count, then name |
| --- | -------------- | ------------------- |
| 1   | Ash (3) =      | Leaf (83)           |
| 2   | Bark (18)      | Flower (66)         |
| 3   | Bead (8)       | Oil (62)            |
| 4   | Bell (2) =     | Root (54) =         |
| 5   | Berry (14)     | Seed (54) =         |
| 6   | Bud (2) =      | Crystal (42)        |
| 7   | Bulb (5) =     | Wood (32)           |
| 8   | Charcoal (1) = | Herb (31)           |
| 9   | Charm (17)     | Powder (30)         |
| 10  | Claw (1) =     | Resin (24)          |
| 11  | Coin (2) =     | Fruit (20)          |
| 12  | Coral (1) =    | Bark (18)           |
| 13  | Crystal (42)   | Charm (17)          |
| 14  | Earth (1) =    | Berry (14)          |
| 15  | Egg (1) =      | Metal (12)          |
| 16  | Flower (66)    | Stem (11) =         |
| 17  | Fruit (20)     | Whole (11) =        |
| 18  | Herb (31)      | Pod (10) =          |
| 19  | Incense (1) =  | Stone (10) =        |
| 20  | Key (1) =      | Bead (8)            |
| 21  | Leaf (83)      | Bulb (5) =          |
| 22  | Metal (12)     | Peel (5) =          |
| 23  | Mirror (1) =   | Sap (5) =           |
| 24  | Mushroom (3) = | Shell (4) =         |
| 25  | Nail (2) =     | Water (4) =         |
| 26  | Nut (3) =      | Ash (3) =           |
| 27  | Oil (62)       | Mushroom (3) =      |
| 28  | Paste (1) =    | Nut (3) =           |
| 29  | Peel (5) =     | Petal (3) =         |
| 30  | Perfume (1) =  | Thorn (3) =         |
| 31  | Petal (3) =    | Bell (2) =          |
| 32  | Pigment (2) =  | Bud (2) =           |
| 33  | Pod (10) =     | Coin (2) =          |
| 34  | Pollen (1) =   | Nail (2) =          |
| 35  | Powder (30)    | Pigment (2) =       |
| 36  | Resin (24)     | Salt (2) =          |
| 37  | Root (54) =    | Sand (2) =          |
| 38  | Salt (2) =     | Spirit (2) =        |
| 39  | Sand (2) =     | Syrup (2) =         |
| 40  | Sap (5) =      | Charcoal (1) =      |
| 41  | Seed (54) =    | Claw (1) =          |
| 42  | Shed (1) =     | Coral (1) =         |
| 43  | Shell (4) =    | Earth (1) =         |
| 44  | Specimen (1) = | Egg (1) =           |
| 45  | Spirit (2) =   | Incense (1) =       |
| 46  | Stem (11) =    | Key (1) =           |
| 47  | Stone (10) =   | Mirror (1) =        |
| 48  | Syrup (2) =    | Paste (1) =         |
| 49  | Thorn (3) =    | Perfume (1) =       |
| 50  | Vinegar (1) =  | Pollen (1) =        |
| 51  | Water (4) =    | Shed (1) =          |
| 52  | Wax (1) =      | Specimen (1) =      |
| 53  | Whole (11) =   | Vinegar (1) =       |
| 54  | Wood (32)      | Wax (1) =           |

Narrowed by the query "rose":

| #   | Alphabetical  | By count, then name |
| --- | ------------- | ------------------- |
| 1   | Ash (1) =     | Oil (8)             |
| 2   | Bark (2) =    | Root (7)            |
| 3   | Bud (1) =     | Leaf (6)            |
| 4   | Bulb (1) =    | Flower (5) =        |
| 5   | Charm (1) =   | Powder (5) =        |
| 6   | Crystal (1) = | Resin (3) =         |
| 7   | Flower (5) =  | Seed (3) =          |
| 8   | Fruit (2) =   | Wood (3) =          |
| 9   | Herb (2) =    | Bark (2) =          |
| 10  | Leaf (6)      | Fruit (2) =         |
| 11  | Oil (8)       | Herb (2) =          |
| 12  | Petal (2) =   | Petal (2) =         |
| 13  | Pod (1) =     | Stem (2) =          |
| 14  | Powder (5) =  | Ash (1) =           |
| 15  | Resin (3) =   | Bud (1) =           |
| 16  | Root (7)      | Bulb (1) =          |
| 17  | Seed (3) =    | Charm (1) =         |
| 18  | Stem (2) =    | Crystal (1) =       |
| 19  | Syrup (1) =   | Pod (1) =           |
| 20  | Water (1) =   | Syrup (1) =         |
| 21  | Wood (3) =    | Water (1) =         |

**Answer.** Alphabetical always.

**Reason.** A long flat list of known names with type-ahead: the case every source gives alphabetical (eBay, Aliev's "free-text value types", Moran's brands). Count order's one gain, surfacing Leaf, Flower and Oil, is lost as soon as a search narrows the list to ties, and it moves under the pointer. With no count order, ties and "narrowed" need no rule.

**Owning layer.** The repository read, under the named collation; `facets.ts` line 93 stops sorting.

### Celestial Bodies

**Question.** Nineteen values, alphabetical by name from the database; eight count nothing unfiltered and are hidden. Keep alphabetical, take count order, or a fixed order?

**Options.** Alphabetical always; count then name; solar-system order (a fixed, curated position, as Zodiac takes).

Unfiltered:

| #   | Alphabetical       | By count, then name |
| --- | ------------------ | ------------------- |
| 1   | Ceres (0) ⌀ =      | Venus (79)          |
| 2   | Chiron (0) ⌀ =     | Sun (62)            |
| 3   | Earth (1)          | Mercury (56)        |
| 4   | Juno (0) ⌀ =       | Mars (55)           |
| 5   | Jupiter (40)       | Saturn (51)         |
| 6   | Lilith (0) ⌀ =     | Moon (48)           |
| 7   | Mars (55)          | Jupiter (40)        |
| 8   | Mercury (56)       | Pluto (15)          |
| 9   | Moon (48)          | Neptune (5) =       |
| 10  | Neptune (5) =      | Uranus (5) =        |
| 11  | North Node (0) ⌀ = | Earth (1)           |
| 12  | Pallas (0) ⌀ =     | Ceres (0) ⌀ =       |
| 13  | Pluto (15)         | Chiron (0) ⌀ =      |
| 14  | Saturn (51)        | Juno (0) ⌀ =        |
| 15  | South Node (0) ⌀ = | Lilith (0) ⌀ =      |
| 16  | Sun (62)           | North Node (0) ⌀ =  |
| 17  | Uranus (5) =       | Pallas (0) ⌀ =      |
| 18  | Venus (79)         | South Node (0) ⌀ =  |
| 19  | Vesta (0) ⌀ =      | Vesta (0) ⌀ =       |

Narrowed by the query "rose":

| #   | Alphabetical       | By count, then name |
| --- | ------------------ | ------------------- |
| 1   | Ceres (0) ⌀ =      | Venus (10)          |
| 2   | Chiron (0) ⌀ =     | Moon (4)            |
| 3   | Earth (0) ⌀ =      | Jupiter (3) =       |
| 4   | Juno (0) ⌀ =       | Mars (3) =          |
| 5   | Jupiter (3) =      | Sun (3) =           |
| 6   | Lilith (0) ⌀ =     | Mercury (2) =       |
| 7   | Mars (3) =         | Saturn (2) =        |
| 8   | Mercury (2) =      | Pluto (1) =         |
| 9   | Moon (4)           | Uranus (1) =        |
| 10  | Neptune (0) ⌀ =    | Ceres (0) ⌀ =       |
| 11  | North Node (0) ⌀ = | Chiron (0) ⌀ =      |
| 12  | Pallas (0) ⌀ =     | Earth (0) ⌀ =       |
| 13  | Pluto (1) =        | Juno (0) ⌀ =        |
| 14  | Saturn (2) =       | Lilith (0) ⌀ =      |
| 15  | South Node (0) ⌀ = | Neptune (0) ⌀ =     |
| 16  | Sun (3) =          | North Node (0) ⌀ =  |
| 17  | Uranus (1) =       | Pallas (0) ⌀ =      |
| 18  | Venus (10)         | South Node (0) ⌀ =  |
| 19  | Vesta (0) ⌀ =      | Vesta (0) ⌀ =       |

In solar-system order, with the seed's counts, the list would read: Sun (62), Moon (48), Mercury (56), Venus (79), Earth (1), Mars (55), Jupiter (40), Saturn (51), Uranus (5), Neptune (5), Pluto (15), then the bodies and points that have no place in that sequence, by name: Ceres ⌀, Chiron ⌀, Juno ⌀, Lilith ⌀, North Node ⌀, Pallas ⌀, South Node ⌀, Vesta ⌀. (The Sun and Moon come first as the two lights, the planets follow outward from the Sun; the asteroids, Chiron, Lilith and the nodes sort after by name. This order was not shown in the workshop story.)

**Answer.** Solar-system order: the Sun and the Moon, then the planets outward from the Sun, then every body or point without a place in that sequence, by name. The owner first chose alphabetical, asked whether solar-system order would serve better, saw it in the workshop story, and chose it on 2026-10-21.

**Reason.** The planets are a semantic set with an order every reader knows (eBay’s third rule; Aliev’s manual order for months and colours), and the alphabetical list splits the Sun from the Moon and scatters the planets among asteroids. The cost is the mechanism Zodiac already needs, so one build task covers both vocabularies.

**Owning layer.** The vocabulary table (a nullable position column on `celestial_bodies` in `src/modules/vocabulary/schema/astrology.ts`, seeded for the Sun, the Moon and the planets) and the repository read’s `orderBy`: position, nulls last, then name under the named collation. The vocabulary is curated, so a body a curator adds has no position and sorts after the positioned ones, by name.

### Zodiac

**Question.** Thirteen signs, alphabetical today. Keep name order, take the calendar's (Aries to Pisces), or count order?

**Options.** As the question lists them.

Unfiltered:

| #   | Alphabetical     | By count, then name | Calendar order   |
| --- | ---------------- | ------------------- | ---------------- |
| 1   | Aquarius (21)    | Aries (30)          | Aries (30)       |
| 2   | Aries (30)       | Taurus (27)         | Taurus (27)      |
| 3   | Cancer (26) =    | Cancer (26) =       | Gemini (24)      |
| 4   | Capricorn (19)   | Leo (26) =          | Cancer (26) =    |
| 5   | Gemini (24)      | Virgo (25)          | Leo (26) =       |
| 6   | Leo (26) =       | Gemini (24)         | Virgo (25)       |
| 7   | Libra (23)       | Libra (23)          | Libra (23)       |
| 8   | Ophiuchus (0) ⌀  | Scorpio (22)        | Scorpio (22)     |
| 9   | Pisces (18)      | Aquarius (21)       | Sagittarius (16) |
| 10  | Sagittarius (16) | Capricorn (19)      | Capricorn (19)   |
| 11  | Scorpio (22)     | Pisces (18)         | Aquarius (21)    |
| 12  | Taurus (27)      | Sagittarius (16)    | Pisces (18)      |
| 13  | Virgo (25)       | Ophiuchus (0) ⌀     | Ophiuchus (0) ⌀  |

Narrowed by the query "rose":

| #   | Alphabetical      | By count, then name | Calendar order    |
| --- | ----------------- | ------------------- | ----------------- |
| 1   | Aquarius (1) =    | Cancer (5) =        | Aries (2) =       |
| 2   | Aries (2) =       | Taurus (5) =        | Taurus (5) =      |
| 3   | Cancer (5) =      | Aries (2) =         | Gemini (1) =      |
| 4   | Capricorn (2) =   | Capricorn (2) =     | Cancer (5) =      |
| 5   | Gemini (1) =      | Libra (2) =         | Leo (0) ⌀ =       |
| 6   | Leo (0) ⌀ =       | Aquarius (1) =      | Virgo (0) ⌀ =     |
| 7   | Libra (2) =       | Gemini (1) =        | Libra (2) =       |
| 8   | Ophiuchus (0) ⌀ = | Sagittarius (1) =   | Scorpio (0) ⌀ =   |
| 9   | Pisces (0) ⌀ =    | Leo (0) ⌀ =         | Sagittarius (1) = |
| 10  | Sagittarius (1) = | Ophiuchus (0) ⌀ =   | Capricorn (2) =   |
| 11  | Scorpio (0) ⌀ =   | Pisces (0) ⌀ =      | Aquarius (1) =    |
| 12  | Taurus (5) =      | Scorpio (0) ⌀ =     | Pisces (0) ⌀ =    |
| 13  | Virgo (0) ⌀ =     | Virgo (0) ⌀ =       | Ophiuchus (0) ⌀ = |

**Answer.** Calendar order, Ophiuchus last.

**Reason.** The ordinal set every source says to keep in its logical order, like months (eBay; Aliev). Ophiuchus, the thirteenth sign the seed carries, has no place in the twelve-sign calendar and goes last. The zodiac vocabulary is curated (`createAstrologyValue` in `src/modules/vocabulary/services/astrology.ts`), so the order must survive a curator adding a sign: a nullable position column, seeded 1 to 13, with rows that have none sorting after the positioned ones by name. Whether the curation form takes a position, or an added sign simply follows the thirteen, is the build task's call; the record's rule is only that an unpositioned sign sorts last, by name.

**Owning layer.** The vocabulary table (a position column on `zodiac_signs` in `src/modules/vocabulary/schema/astrology.ts`, which today has "no order column") and the repository read's `orderBy`.

### Deities

**Question.** 216 names under 22 tradition headings, by count then name today, with the headings in the order they first appear (Roman, Greek, Egyptian, Norse…). Alphabetical by name alone gives Greek, Irish, Japanese, Egyptian…. Which order, and how do the headings order?

**Options.** Tradition A to Z with names A to Z within; name A to Z with headings in first-appearance order; count then name as today.

Unfiltered, the first twenty of the compendium's 111 counted deities:

| #   | Alphabetical                           | By count, then name                   |
| --- | -------------------------------------- | ------------------------------------- |
| 1   | Greek · Adonis (5) =                   | Roman · Venus (31)                    |
| 2   | Irish · Aine (2) =                     | Greek · Hecate (24)                   |
| 3   | Japanese · Amaterasu (1) =             | Greek · Aphrodite (23)                |
| 4   | Egyptian · Amun (1) =                  | Greek · Demeter (20)                  |
| 5   | Egyptian · Anubis (1) =                | Greek · Apollo (19) =                 |
| 6   | Greek · Aphrodite (23)                 | Roman · Diana (19) =                  |
| 7   | Greek · Apollo (19) =                  | Greek · Artemis (17)                  |
| 8   | Italian folk witchcraft · Aradia (1) = | Egyptian · Isis (16) =                |
| 9   | Greek · Ares (2) =                     | Greek · Persephone (16) =             |
| 10  | Welsh · Arianrhod (4) =                | Greek · Dionysus (15)                 |
| 11  | Greek · Artemis (17)                   | Roman · Ceres (14) =                  |
| 12  | Greek · Asclepius (5) =                | Norse · Freya (14) =                  |
| 13  | Canaanite & Phoenician · Asherah (2) = | Irish · Brigid (12) =                 |
| 14  | Canaanite & Phoenician · Astarte (10)  | Norse · Odin (12) =                   |
| 15  | Greek · Athena (7) =                   | Egyptian · Osiris (12) =              |
| 16  | Anatolian · Attis (1) =                | Greek · Zeus (12) =                   |
| 17  | Canaanite & Phoenician · Baal (2) =    | Norse · Frigg (11) =                  |
| 18  | Roman · Bacchus (8) =                  | Egyptian · Ra (11) =                  |
| 19  | Gaulish & British · Belenus (3) =      | Canaanite & Phoenician · Astarte (10) |
| 20  | Welsh · Blodeuwedd (1) =               | Roman · Bacchus (8) =                 |

(The first 20 of 111 values; the rest follow the same rule.)

Headings, first-appearance order under alphabetical: Greek · Irish · Japanese · Egyptian · Italian folk witchcraft · Welsh · Canaanite & Phoenician · Anatolian · Roman · Gaulish & British · Aztec · Hindu · Anglo-Saxon & Continental Germanic · Haitian Vodou · Norse · Hawaiian · Sumerian · Akkadian & Babylonian · Chinese Buddhist · Slavic · Yoruba · Inca

Headings, first-appearance order under by-count: Roman · Greek · Egyptian · Norse · Irish · Canaanite & Phoenician · Hindu · Anglo-Saxon & Continental Germanic · Sumerian · Welsh · Gaulish & British · Anatolian · Chinese Buddhist · Akkadian & Babylonian · Haitian Vodou · Hawaiian · Inca · Japanese · Italian folk witchcraft · Aztec · Slavic · Yoruba

Headings alphabetical: Akkadian & Babylonian · Anatolian · Anglo-Saxon & Continental Germanic · Aztec · Canaanite & Phoenician · Chinese Buddhist · Egyptian · Gaulish & British · Greek · Haitian Vodou · Hawaiian · Hindu · Inca · Irish · Italian folk witchcraft · Japanese · Norse · Roman · Slavic · Sumerian · Welsh · Yoruba

Narrowed by the query "rose":

| #   | Alphabetical            | By count, then name     |
| --- | ----------------------- | ----------------------- |
| 1   | Greek · Adonis (1) =    | Greek · Aphrodite (4)   |
| 2   | Greek · Aphrodite (4)   | Greek · Demeter (3) =   |
| 3   | Greek · Artemis (2) =   | Norse · Freya (3) =     |
| 4   | Greek · Athena (1) =    | Greek · Hecate (3) =    |
| 5   | Irish · Brigid (1) =    | Roman · Venus (3) =     |
| 6   | Roman · Ceres (1) =     | Greek · Artemis (2) =   |
| 7   | Greek · Circe (2) =     | Greek · Circe (2) =     |
| 8   | Roman · Cupid (1) =     | Roman · Diana (2) =     |
| 9   | Greek · Demeter (3) =   | Egyptian · Hathor (2) = |
| 10  | Roman · Diana (2) =     | Roman · Minerva (2) =   |
| 11  | Greek · Dionysus (1) =  | Roman · Saturn (2) =    |
| 12  | Greek · Eros (1) =      | Greek · Zeus (2) =      |
| 13  | Roman · Flora (1) =     | Greek · Adonis (1) =    |
| 14  | Norse · Freya (3) =     | Greek · Athena (1) =    |
| 15  | Norse · Frigg (1) =     | Irish · Brigid (1) =    |
| 16  | Egyptian · Hathor (2) = | Roman · Ceres (1) =     |
| 17  | Greek · Hecate (3) =    | Roman · Cupid (1) =     |

(The first 17 of 30 values; the rest follow the same rule.)

**Answer.** Tradition A to Z, names A to Z within each.

**Reason.** The headings become readable (Akkadian & Babylonian, Anatolian, Anglo-Saxon & Continental Germanic, Aztec…), each tradition's names are a flat list of known words with type-ahead, and the rule matches Categories' group-then-name. First-appearance headings put the traditions in no order a reader can predict, and count order puts Venus and Hecate first and then reshuffles.

**Owning layer.** The repository read orders by tradition name, then deity name, under the named collation; `facets.ts` line 101 stops sorting; the Combobox's first-appearance headings then come out alphabetical with no change to it.

### Elements

**Question.** The fixed vocabulary order Earth, Air, Fire, Water, Spirit; by count it is Water, Fire, Air, Earth, Spirit. Keep the fixed order, alphabetical, or count?

**Options.** As the question lists them.

Unfiltered:

| #   | Alphabetical | By count, then name | Vocabulary order |
| --- | ------------ | ------------------- | ---------------- |
| 1   | Air (79)     | Water (116)         | Earth (70)       |
| 2   | Earth (70)   | Fire (103)          | Air (79)         |
| 3   | Fire (103)   | Air (79)            | Fire (103)       |
| 4   | Spirit (2)   | Earth (70)          | Water (116)      |
| 5   | Water (116)  | Spirit (2)          | Spirit (2)       |

Narrowed by the query "rose":

| #   | Alphabetical   | By count, then name | Vocabulary order |
| --- | -------------- | ------------------- | ---------------- |
| 1   | Air (0) ⌀ =    | Water (12)          | Earth (4)        |
| 2   | Earth (4)      | Fire (7)            | Air (0) ⌀ =      |
| 3   | Fire (7)       | Earth (4)           | Fire (7)         |
| 4   | Spirit (0) ⌀ = | Air (0) ⌀ =         | Water (12)       |
| 5   | Water (12)     | Spirit (0) ⌀ =      | Spirit (0) ⌀ =   |

**Answer.** Keep Earth, Air, Fire, Water, Spirit.

**Reason.** A fixed semantic set in its classical order (eBay's third rule). The enum `INGREDIENT_ELEMENTS` already declares it, so nothing changes but the record.

**Owning layer.** Unchanged: the enum, read in order at `ingredient-facets.ts` line 346.

### Ties and chosen zeros

- **Ties** arise only under count order, and no facet takes it. Under alphabetical order two values with the same name cannot both exist in one vocabulary; a tie on the sort key is broken by id, as the zodiac and celestial reads already do.
- **A chosen value whose count is zero always keeps its chip**, whatever the facet, so the person can remove it (M12.4; `hideZeros` in `claude-docs/components/facet-combobox.md`). In the open list it sits **in its alphabetical place** (or its fixed place) showing (0): the list never moves because a count fell. The owner confirmed both on 2026-10-21.
- **Zero-count values that are not chosen** stay hidden in every facet but Toxic, as decided on 2026-10-17; this record changes nothing there.

### Coven lists and the Grimoire

The same rule applies everywhere, the owner's call: one order per facet, set in the repository read, inherited by the public compendium, the admin compendium, a coven's Ingredients page and, when Wave 13 builds it, the Grimoire. The Grimoire's search is DESIGN.md story 49, "the same controls as the ingredients", through the shared `IngredientSearch` and the same `FacetPanel`; a Grimoire facet read that reuses `findCompendiumFacets`' ordering helpers inherits the order, and one that does not must order the same way and is held to it by the same guard the build task adds.

### Built in M12.52

The owner folded the three proposed follow-on tasks into M12.52 itself, so they were built together rather than minted.

- **Positions.** `zodiac_signs` and `celestial_bodies` gain a nullable integer `position` (`src/modules/vocabulary/schema/astrology.ts`, migration `0080_astrology-position-expand`, expand-only). The astrology seed gives the signs Aries 1 to Pisces 12 and Ophiuchus 13, and the bodies Sun 1, Moon 2, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto 11; Ceres, Chiron, Juno, Lilith, the Nodes, Pallas and Vesta have none. The seed inserts only missing rows, so the migration also sets the same positions by seed key on databases already seeded, leaving a row a curator has positioned or retired alone.
- **Order in the repository.** `ingredient-facets.ts` no longer sorts by count. Categories sort by group name then name, deities by tradition name then name, both in SQL under the collation `"en-US-x-icu"` (`naturally` in `predicates.ts`), ties by id. Signs and bodies sort by position with nulls last, then name. A chosen value counting zero sits in its alphabetical place; its place comes from a list of every live id, read inside the Toxic read, because the coven read has no query to spare. Forms sort by `Intl.Collator("en-US")` in JavaScript, since a form's spelling is only known after its group is read; it is the same ICU order. Two things make SQL the wrong place for this list. A form chosen in the Forms filter that no entry in the current results uses is not in the query's answer, so it joins the list in code, with a count of zero, whatever SQL does. A counted form's label is the curated spelling or else its variants' most-used spelling, picked in code by `mostUsed`. Ordering the query would sort on a value the label can still replace. The owner allowed this exception to sorting in SQL on 2026-10-21. `CATEGORY_ORDER` and `DEITY_ORDER` in `vocabularies.ts` use the same collation, which the category picker now relies on.
- **Components.** `CompendiumList/facets.ts` and `CategoryPicker` keep the order they are given.
- **Curation.** The curation form is unchanged: a body or sign a curator adds has no position and sorts after the positioned ones, by name.
- **Neon and ICU.** Confirmed. On 2026-10-21 the owner ran `SELECT collname FROM pg_collation WHERE collname = 'en-US-x-icu';` against the production database on Neon, and the collation is there. Neon's changelog for 7 February 2023 records when its compute added ICU as a collation provider.

The docs corrected: `claude-docs/db/compendium-read.md`, `claude-docs/db/astrology-vocabularies.md`, `claude-docs/components/category-picker.md`, `claude-docs/components/facet-combobox.md`, and `claude-docs/components/facet-panel.md` (which gains the sort rule).

## How an ingredient records its physical uses

**Status:** accepted by the owner and moved to v2, 2026-10-23 (DESIGN.md §13, "Physical uses")

The categories an ingredient carries today say what a working _intends_: Love,
Protection, Sleep. They say nothing about what the plant does to a body: that
chamomile is a sedative, that fennel settles the stomach, that damiana is held
to be an aphrodisiac. The owner wants that recorded too, so a coven can find an
ingredient by its physical effect as well as by its magical intent. This record
compares the ways to hold it, recommends one, and proposes the build tasks. It
changes no code; minting the tasks waits for the owner's review.

### Decided

**Recommendation: a curated vocabulary of physical uses, flat (no groups),
picked by key, never typed.** A table `physical_uses` holds each use once, with
its name, a one-sentence definition and the sources the definition rests on, as
the celestial bodies and the deities do. An ingredient or a form carries a use
through a join table, and a coven's own entry may carry only a use that exists
on the list. Keepers and curators maintain the list; nobody else adds to it.

Why the list is closed where the form vocabulary is open: a form is a fact
about an object (a leaf, an oil) and an uncurated form costs nothing but an
untidy string, so `form` is text with the curated rows as an autofill. A
physical use is a claim about what a substance does to a body. Left open, the
field fills with "cures headaches" and "treats anxiety", which is exactly the
medical advice the site must not give. A closed list of action words a herbal
would print — sedative, carminative, aphrodisiac — each defined and sourced on
its own row, keeps every claim on the site to a word whose meaning and
provenance a keeper chose. That is the one property the other two approaches
cannot give.

### The three approaches compared

| Approach                                                                                                                 | What it touches                                                                                                                                                                                                                                                                                                                                                                                                                                                                | For                                                                                                                                                | Against                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Curated vocabulary, picked by key** (recommended)                                                                   | New tables `physical_uses`, `ingredient_physical_uses`, `ingredient_variant_physical_uses`; a `physical_use_id` column on `reference_links` and its `SOURCED` entry; a `FLAT` vocabulary entry in `src/db/vocabularies.ts` and a seed literal with sources; a curation screen under `/admin` behind `assertCurator`; the ingredient and variant services, GraphQL types and `IngredientForm`; a search facet (M11.22's pattern); the markdown file format gains `physicalUses` | Every claim is a defined, sourced word. Filterable by key. A rename carries everywhere. Fits the two-tier/flat vocabulary machinery already built. | The most to build: three tables, a screen, a seed. A use the list lacks cannot be recorded until a keeper adds it.                                                                                                                                                                                                                                                          |
| **B. Free text**, `physical_uses text[]` on `ingredients` and `ingredient_variants`, as `elements` and `colors` are held | Two columns and a migration; the two services, GraphQL types and the form; the file format gains a list                                                                                                                                                                                                                                                                                                                                                                        | Cheapest. A coven writes whatever its source says.                                                                                                 | No definition and no source behind a word. Filtering is by string, so "sedative" and "Sedative" and "calming" split. Nothing stops a medical claim. A spelling fix is a sweep over rows.                                                                                                                                                                                    |
| **C. Extend categories** with a new category group, say "Body", holding Sedative, Stimulant, Aphrodisiac                 | The `categories` seed literal alone; the admin categories screen already exists                                                                                                                                                                                                                                                                                                                                                                                                | Nothing new to build. Chips, colours, filters and the admin screen come for free.                                                                  | It conflates the two kinds of category DESIGN.md §9 keeps apart: a spell's _derived_ categories are the union of its ingredients', so a spell holding chamomile would read as intending "Sedative", and a category gap would ask for a sedative ingredient. A physical effect is a property of the plant, not a wish of the working. CLAUDE.md names this conflation a bug. |

A fourth was looked at and set aside: **text with a curated autofill**, the
model `form` uses (MB.215). It gives the list without closing it, and so keeps
B's weakness where it matters most: anyone may type a claim the list does not
hold.

### Where the line falls between a use and a category

A **category** names what a working is _for_. A **physical use** names what the
plant _does to a body_, in the words a herbal prints under "action". The test:
would a herbal list the word as an action of the plant? Then it is a use. Would
a spell be written to bring it about? Then it is a category.

Examples from the seeded categories (`src/db/seed/categories.ts`):

| Seeded category (intent) | The physical use beside it (effect) | Why they are two things                                                                                                            |
| ------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Sleep                    | sedative                            | A sleep sachet of lavender intends sleep; valerian is a sedative whether or not anyone casts for it.                               |
| Lust                     | aphrodisiac                         | A lust working is an intent; an aphrodisiac is a claimed effect on desire. Cinnamon carries Lust in the sources without being one. |
| Peace, Clarity           | nervine                             | Peace is a wish for the mind; a nervine is an action on the nerves a herbal records.                                               |
| Healing                  | none                                | Healing is an intent so broad that no one physical use stands behind it, which is why it stays a category only.                    |
| Strength, Courage        | stimulant                           | A courage charm is an intent; coffee and yerba mate are stimulants in the plain sense.                                             |
| Memory                   | none                                | A memory working is an intent; "improves memory" is the kind of claim the closed list refuses.                                     |

A use never feeds a spell's derived categories, and a spell has no uses of its
own: a spell is a working, not a substance.

### Ingredient or variant

Both, under MB.215's union rule, exactly as categories are: a use sits on the
ingredient when every form has it, and on a form when only that form does.
Fennel is a carminative as the seed and as the tea, so the ingredient carries
it; peppermint's oil is applied, never drunk, so a use of the dried leaf goes on
the Leaf form. A variant adds to its ingredient and never removes, and the
reader of a form sees the union. The toxic flag's independence is not copied:
a use is a correspondence, and correspondences union.

### Sourcing

Two claims, two sources, both through the existing references model (MB.151):

- **What the word means** is sourced on the vocabulary row: `physical_uses`
  takes a `physical_use_id` link in `reference_links`, as the deities and the
  celestial bodies do, and its seed literal cites each definition.
- **That this plant has that use** is sourced on the ingredient or the form,
  by a citation in its references. In a compendium markdown file (M14.4) the
  citation's `supports` names `physicalUses`, so the guard refuses a use no
  source backs, as it refuses an unsourced toxic flag (M14.1). On a coven's own
  entry the ordinary references field carries it.

### How it shows, so it never reads as advice

- The uses are shown as chips in the correspondences block, beside elements and
  celestial bodies, under the heading **Traditional uses**. The word
  "traditional" is the frame: these are what the cited sources record, not what
  the site recommends.
- Each chip opens the use's own definition and its sources, so a reader learns
  what "carminative" means and whose word it is.
- The safety note (M8.13a) and the toxic mark (M11.21) stay where they are,
  above the correspondences, and a use never sits inside the Caution block: a
  caution is the site's warning, a use is a source's record, and the two are
  kept visibly apart. An entry whose toxic flag is on still shows its uses; the
  mark is already above them.
- The vocabulary's definitions are written as descriptions, never as
  instructions: "A sedative is held to calm or bring sleep", not "take for
  sleep". No dose, no preparation and no condition is ever a use. The curation
  screen's help text says so.
- The public compendium page carries the one sentence the Caution block already
  implies: "Traditional uses are recorded from the sources cited; nothing here
  is medical advice."

### Who may set a use, and whether it can be searched

| Tier                | Maintain the list | Set a use on an entry              |
| ------------------- | ----------------- | ---------------------------------- |
| Compendium          | admin, curator    | admin, curator                     |
| A coven's own entry | nobody            | owner, member; an observer nothing |

A coven never adds to the list, which is what keeps the list a vocabulary. A
coven that needs a use the list lacks asks a keeper, as it does for a category.

The uses are searchable and filterable: a facet on the compendium and the
coven's Ingredients list (M11.22's pattern, keyed by the use's slug), and the
public `/llms.txt` and the well-known files carry them as they carry
categories. The search's union follows the toxic filter's one precedent in
reading both rows: an entry is listed for a use on it or on any of its forms.

### The starting list

Each use with one source read during this task, in Chicago form. Grieve is a
work of 1931 and is read for the action words a herbal prints, not for its
claims; the Wikipedia articles are read for the definitions and for how thin
the evidence is, which the definitions on the rows should carry.

| Use           | Definition for the row                                                           | Source read                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| aphrodisiac   | Held to raise desire. The evidence for most plants so named is thin.             | Wikipedia. "Aphrodisiac." Wikimedia Foundation. Accessed October 23, 2026. https://en.wikipedia.org/wiki/Aphrodisiac.                                                                                                      |
| sedative      | Held to calm, by lowering excitement or irritability.                            | Wikipedia. "Sedative." Wikimedia Foundation. Accessed October 23, 2026. https://en.wikipedia.org/wiki/Sedative.                                                                                                            |
| stimulant     | Held to raise alertness.                                                         | Wikipedia. "Stimulant." Wikimedia Foundation. Accessed October 23, 2026. https://en.wikipedia.org/wiki/Stimulant.                                                                                                          |
| carminative   | Held to ease wind in the gut, whether by stopping it forming or helping it pass. | Wikipedia. "Carminative." Wikimedia Foundation. Accessed October 23, 2026. https://en.wikipedia.org/wiki/Carminative.                                                                                                      |
| nervine       | A herbal's word for an action on the nerves, calming or strengthening.           | Grieve, M. "Valerian." _A Modern Herbal_. Botanical.com. Accessed October 23, 2026. https://www.botanical.com/botanical/mgmh/v/valeri01.html ("Valerian is a powerful nervine, stimulant, carminative and antispasmodic"). |
| antispasmodic | Held to ease cramp or spasm.                                                     | Grieve, "Valerian", as above.                                                                                                                                                                                              |

Left off the starting list, with the reason: **tonic**, because no source read
defines it tightly enough to keep it from meaning "good for you"; **digestive**,
because carminative is the word the sources use for the same action;
**anything naming a condition** (for headaches, for anxiety), because that is
advice, not an action word. The build task's seed reads the library's safety
and remedies handbooks (`ahpa-safety`, `kynes-remedies` in
`src/db/seed/compendium/works.ts`) for the words they use and adds those with a
page cited; Wikipedia's "Herbalism" article, also read, says in so many words
that the evidence for most herbal treatments is limited and that herbal
medicine is not side-effect free, which is the sentence the public page's
disclaimer rests on.

### The follow-up tasks, to be minted when v2 is planned

1. **Table task** (about 3 h): `physical_uses` (name, slug, description,
   `seed_key`, the audit columns), the two join tables, the `physical_use_id`
   column on `reference_links` with its `SOURCED` entry, and the migration.
   Schema tests, the catalogue sweep, and nothing that reads or writes them.
2. **Behaviour task** (about 8 h): the vocabulary seed with its sources, the
   `FLAT` registration, the curation screen behind `assertCurator`, the
   ingredient and variant services and their GraphQL fields, `IngredientForm`'s
   picker, the Traditional uses chips and the disclaimer line, the search facet,
   the markdown file key `physicalUses` with its guard rule, and the public
   files.
3. **Seeding the uses onto the compendium** rides the open shard lanes
   (MB.243 to MB.246, MB.248) once the behaviour task has landed, each use
   cited as any other field is.

### What this rules out

- A use typed as free text anywhere, including on a coven's own entry.
- A use on a spell, or a use read into a spell's derived categories.
- A category that names a bodily effect: when a lane finds a source listing
  "sedative" as a power, it records a use, not a category.

## The compendium seed as markdown files, a formal-name rule and curator review

The compendium seed moves from seven TypeScript shards to one markdown file per entry. A content hash tells the seed when a file changed, and the seed applies the change only when the owner has marked that file for update and no curator or editor has touched the row. Every citation records how its source's name was matched to the entry's formal name. A curator can mark an entry reviewed. The full plan, with every file and table it touches, is [`m14.4-plan.md`](m14.4-plan.md); this record says what was decided and why. The tasks are M14.4 to M14.13 ([`tasks/m14.md`](../tasks/m14.md)).

**It supersedes two rows of [`mb.240-compendium-seed.md`](mb.240-compendium-seed.md)**: "One file per entry" and "The entries repeated in markdown", both rejected there on 2026-10-11. Their reasons were a shard of 100 files in one pull request and about 700 KB of markdown that nothing checked against the literal. Here the markdown file is the source of truth, not a copy, so there is nothing to drift, and the guard reads the files. Pull requests stay small because the shards were already per-lane and lanes still add their own files.

### The problem

The Aspen entry (in `plants-a-cn.ts`, live since PR #872) cites Grieve's _A Modern Herbal_ under "Poplar, Trembling". That page is headed _Populus tremuloides_, the American aspen, so it is rightly cited. The European lore came from Kynes's joint "Aspen" entry, which heads both species, and the entry carried it under the American tree: an Irish glossary rod, a Russian witch's grave and a hair cure from northern England. The common name "aspen" was taken to mean one species. It means at least two.

Two things made this hard to fix. The seed is write-once: `presentEntries` in `src/db/seed/compendium.ts` skips every entry already present, so correcting the literal changes nothing on a database that already holds the entry. And no state in the schema says that a curator has looked at an entry, so a correction could not tell reviewed work from untouched seed text. The owner also wants to edit an entry by editing a file, and to leave a note in it for Claude.

### The formal-name rule

**A formal name is a unique identifier. A common name never is.** An entry's formal name is its identity (DESIGN.md §5); the README's "Formal names" says how each kind of entry takes one.

A source is cited on an entry only when one of these holds:

1. **Stated:** the source prints this entry's formal name under the cited heading.
2. **Resolved:** the source heads a common name, and a cited authority maps that common name to exactly this one formal name. The authority is another registered source, never the citing one.

Anything else is doubt. A common name alone is never a match. Doubt goes under `#### Questions for the Curator` in the file, the file is set to `status: needs-review`, and the owner decides. A file with an attribution in doubt is never `approved`, and the seed writes only `approved` files.

The rule is enforced per citation by `nameBasis` (below), required on every citation of an entry that has a `canonicalName`. Entries without one (`nomenclature: none` or `unknown`) are exempt, since they have no formal name to match.

### The decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                         | Reason                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Convert all seven shards to markdown and delete the shards.                                                                                                                                                                                                                                                                                                      | One mechanism and one guard, not two corpora in two formats.                                                                                                                       |
| 2   | A one-shot approved hash: frontmatter `seedUpdate: <sha256>`. The seed updates a row only when the file's hash equals `seedUpdate` and the row is not what the file says: the stored hash differs, or it matches but a field differs that no person changed (M14.1). `npm run seed:mark <file>` writes it.                                                       | An edit to a file does nothing on a database until the owner marks that exact content for update, so an editor's content is never overwritten silently.                            |
| 3   | A row that a curator has reviewed, or an editor has touched, refuses the update, prints the differing fields and fails the run. `overwriteEditor: true` beside `seedUpdate` overrides it for one file, and `--force` (M14.26) for the run.                                                                                                                       | The refusal is loud, and the override is a written, reviewed line in the file.                                                                                                     |
| 4   | A curator mark: `curator_reviewed_at` and `curator_reviewed_by` on `ingredients`, set from the admin entry page, shown as a badge and a list filter. A reviewed row blocks a seed update as an edited row does.                                                                                                                                                  | There was no "reviewed by a curator" state anywhere in the schema.                                                                                                                 |
| 5   | Attribution review is in the file and gated by status: `status: draft`, `needs-review` or `approved`. Only `approved` is seeded. A `#### Questions for the Curator` section holds the doubt.                                                                                                                                                                     | The doubt and its answer sit beside the text they are about, in the one place the owner already edits.                                                                             |
| 6   | The folder is the nomenclature (the seven enum values) and the file is `ingredientSlug(name, canonicalName).md`. A guard checks the path against the frontmatter. Agate moves from `element/` to `mineral/`. `chemical` stays the enum value (DESIGN.md:545).                                                                                                    | A path that is derived cannot disagree with the entry it holds, and the guard catches it if it does. The enum value is not renamed to match a folder.                              |
| 7   | A targeted audit (M14.11, run in M14.13) over the other live entries for common-name misattribution.                                                                                                                                                                                                                                                             | Aspen was found by hand. The same mistake may be in any of the other entries (about 627).                                                                                          |
| 8   | `#### Edit Notes for Claude` is kept, left out of the hash and never seeded. Claude acts on it and clears it.                                                                                                                                                                                                                                                    | It is the owner's channel for an edit, and it must not change what is seeded.                                                                                                      |
| 9   | The hash covers the seeded projection only: scalars, lists, substitutes, title, description, variants, and each citation's `source` handle and `locator`. It leaves out `status`, `seedUpdate`, `overwriteEditor`, `supports`, the provenance notes, Edit Notes and Questions.                                                                                   | Only a change to what reaches the database should read as a change. A review note or a reordered key must not flip a hash.                                                         |
| 10  | A per-entry source lives in `compendium/sources/<handle>.yaml`, one file per handle. The nine shared works stay in `works.ts`.                                                                                                                                                                                                                                   | A handle is cited by many files. One file per handle keeps a source's text in one place. The hash covers the handle and locator only, so editing a source file flips no hash.      |
| 11  | `colours` in files, both as a key and in `supports` values. The loader maps it to `colors`, the database's spelling.                                                                                                                                                                                                                                             | Files are read and edited by people, who write British spelling. The database column and the code keep their existing spelling, so the loader maps one to the other in one place.  |
| 12  | A split status gate: the seed writes `approved` only. CI fails a `draft` file on `staging` and `main`, and any `approved` file that breaks a rule. `needs-review` is allowed anywhere and is the owner's queue.                                                                                                                                                  | A work in progress can live on a feature branch, and a doubtful entry can wait on `staging` without blocking a deploy.                                                             |
| 13  | A refused entry is skipped and the rest of the run applies. The run exits 1 at the end, and a developer is told: `migrate.yml` posts the `REFUSED` block on the pull request the deploying commit came from.                                                                                                                                                     | One refused entry should not hold back the others, and a refusal nobody reads is a lost correction.                                                                                |
| 14  | **Corrected 2026-10-23 (the owner):** only the curator's Reviewed switch (`setCompendiumEntryReviewed`) sets or clears the mark. An edit, a create or a folk-name promotion does not. Switching an already-reviewed entry to reviewed keeps the original date and reviewer. (It first read: a keeper or curator editing an entry on the site marks it reviewed.) | A review is a deliberate act, not a side effect of fixing a typo; the seed must still not overwrite an entry a curator has marked.                                                 |
| 15  | Converted citations carry `nameBasis: unaudited`, under a ratchet: the list of files that may carry it, `compendium/unaudited.txt`, may only shrink.                                                                                                                                                                                                             | The conversion must not claim a check it did not make. A sweep over code is a mechanism plus a guard (CLAUDE.md, "The sweep-task rule"): impossible for new files, absent for old. |
| 16  | The seven per-shard docs move to `claude-docs/archive/` in the cutover PR (M14.10).                                                                                                                                                                                                                                                                              | They describe shards that no longer exist, and the files now hold what each recorded.                                                                                              |

#### Stated assumption, for the owner to confirm

**An `overwriteEditor` or forced update that lands clears the curator mark.** The seed is not a curator, and the content is no longer what the curator reviewed. The seed is not a curator, and only a curator's switch sets or clears the mark (decision 14 as corrected 2026-10-23).

### The file format

The examples are the four sample files in [`compendium/`](../../compendium/): [`ingredients/base.md`](../../compendium/ingredients/base.md) (the template, skipped by name), [`aspen-populus-tremuloides.md`](../../compendium/ingredients/botanical/aspen-populus-tremuloides.md), [`aspen-populus-tremula.md`](../../compendium/ingredients/botanical/aspen-populus-tremula.md) (a stub) and [`agate-quartz-var-agate.md`](../../compendium/ingredients/mineral/agate-quartz-var-agate.md). They carry `status: needs-review` and `nameBasis: unresolved`. The conversion (M14.9) rewrote the American aspen and Agate from their shard literals, keeping each file's status, its sections and each citation's `nameBasis`, and left the stub alone; M14.12 settles the two aspens.

**Path:** `compendium/ingredients/<nomenclature>/<ingredientSlug(name, canonicalName)>.md`, using `ingredientSlug` from `src/lib/slugify.ts`. That gives `aspen-populus-tremuloides`, `agate-quartz-var-agate` and `graveyard-dirt`. Any other file directly under `ingredients/` is a guard issue.

**Body:**

- One `# <name>` heading, which is the entry's `name`.
- The text up to the first `####` heading is the `description`. Paragraphs split on a blank line, and single line breaks inside a paragraph fold to a space.
- No other H1, H2 or H3.
- Two optional trailing sections, each at most once, in this order: `#### Questions for the Curator`, then `#### Edit Notes for Claude`. Neither is hashed or seeded.

**Frontmatter** (every key is checked; an unknown key is an issue). Blank values (`key:`, an empty `-`, `[null]`, `[""]`) read as absent.

| Key                                                     | Meaning                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `status` (required)                                     | `draft`, `needs-review` or `approved`. Not stored, not hashed.                                                                 |
| `nomenclature` (required)                               | One of the seven naming systems. It matches the folder.                                                                        |
| `canonicalName`                                         | The formal name. For botanical, fungal and zoological entries it must match the guard's taxon shape.                           |
| `seedUpdate`                                            | 64 hex characters: the hash the owner approved for update. Not stored, not hashed.                                             |
| `overwriteEditor`                                       | Only `true`, and only beside `seedUpdate`.                                                                                     |
| `toxic`, `safetyNotes`                                  | As on the entry today.                                                                                                         |
| `elements`, `celestialBodies`, `zodiacSigns`, `colours` | Lists. `colours` is stored as `colors`.                                                                                        |
| `folkNames`, `deities`, `categories`                    | Lists, resolved by their curated rows' seed keys as the seed does today.                                                       |
| `substitutes`                                           | `{identity, form?}` or `{name}`. `{identity}` must resolve to a file; `{name}` is allowed only when no file has that identity. |
| `references` (required, may be empty)                   | Citations: `source`, `locator?`, `supports`, `nameBasis`, and `headedAs` and `resolvedBy` where `nameBasis` is `resolved`.     |
| `variants`                                              | Each form, with its own description, flags, lists, substitutes and `references`.                                               |

The key order in a file is free. The converter writes one fixed order with `status` first. The names `supports` may use are the README's, with `colours` in place of `colors`.

#### `nameBasis`

Each citation of an entry that has a `canonicalName` says how its source's name was matched to the entry's formal name:

| Value        | Meaning                                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stated`     | The source prints this entry's formal name under the cited heading.                                                                                                                                      |
| `resolved`   | The source heads a common name. `headedAs` (required) is that heading, and `resolvedBy` (required) is a registered source, other than the citing one, that maps the heading to exactly this formal name. |
| `unresolved` | Doubt remains. It blocks `approved`, and the doubt is written under `#### Questions for the Curator`.                                                                                                    |
| `unaudited`  | Conversion only: the citation was copied from the TypeScript and has not been checked against the rule. Accepted only for files listed in `compendium/unaudited.txt`, a list that may only shrink.       |

### The hash

`contentHash(entry)` in `src/db/seed/compendium/content-hash.ts` is a SHA-256 of a canonical text, built as follows:

1. Build the projection of the seeded fields with the database's key names (`colors`), keys in alphabetical order.
2. Drop null, empty and absent values.
3. Strings are Unicode-normalised (NFC), trimmed and have their internal whitespace collapsed. Description paragraphs are joined with a blank line.
4. Arrays keep their order in the file, because deities have a position.
5. Write it as stable, key-sorted JSON and prefix it with `compendium-hash-v1` and a newline.
6. Take the SHA-256, as hex.

The version prefix makes any later change to the algorithm an explicit, reviewed event. Which fields count is decision 9.

### The update path

For each `approved` file, the seed does the following. Rows refused are skipped, the rest of the run applies, and the run exits 1 if any was refused.

| State                                                       | Action                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Absent (no `seed_key`, identity or slug match)              | Insert, and store the hash.                                                                                                                                                                                                                                                          |
| Present, soft-deleted                                       | `RETIRED`, exit 0. A curator removed it, and the seed never revives it.                                                                                                                                                                                                              |
| Hash matches; no field differs, or a person worked on it    | Skip. A row a person worked on is skipped quietly, keeping the work, unless the run is forced (`--force`, M14.26), when it goes on as a differing row does; `overwriteEditor` does not lift this skip, since it was on the file when the work was done.                              |
| Stored hash is null                                         | Adopt it if the conversion manifest names it and the row and every child are stamped with the bootstrap user. Otherwise `REFUSED: no baseline`, unless the run is forced, when the entry is decided as an edit.                                                                      |
| Hash or an unworked field differs, no `seedUpdate` match    | `PENDING` with what differs, exit 0, counted in the summary.                                                                                                                                                                                                                         |
| Hash or an unworked field differs, `seedUpdate` matches     | Refuse unless `overwriteEditor: true` or the run is forced, when the row is curator-reviewed, was updated by anyone but the bootstrap user, or has a child (variant, folk name, deity, category, substitute or reference link) touched by a person or soft-deleted. Otherwise apply. |
| The update would change `name`, `canonicalName` or the slug | `REFUSED: identity change: use the admin`.                                                                                                                                                                                                                                           |
| The update removes a form that stock or a spell layer uses  | `REFUSED: form in use`.                                                                                                                                                                                                                                                              |

An applied update never deletes and recreates a variant, since stock and spell layers hold variant ids. An `overwriteEditor` or forced update clears the curator mark (the assumption above).

**`--force` (M14.26)** lifts refusals 1 to 4 — reviewed, edited, a child edited, no baseline — for every entry in the run, as `overwriteEditor` lifts 1 to 3 for one file, and it alone goes past the quiet skip of a row a person worked on under a matching hash (M14.1). It never lifts an identity change or a form in use, and never updates a file without `seedUpdate`. A site keeper passes it through the hand-started `seed-environment.yml` (claude-docs/ci/deploy.md). The compendium is cached for an hour on production, so an update shows within the hour; nothing in CI can expire the cache.

### The status gate

The seed writes `approved` files only. CI fails a `draft` file on `staging` and `main`, and fails any `approved` file that breaks a rule. `needs-review` is allowed anywhere, and is the owner's queue: `npm run seed:queue` (added in M14.7) lists it. A `needs-review` file must have a non-empty Questions section. A `seedUpdate` that no longer equals the file's hash fails CI: run `seed:mark` again or remove the line.

## The sourcing score: facts, weights and the data they need (plan)

_The plan as the owner approved it on 2026-10-31. The task entries in [`tasks/m14.md`](../tasks/m14.md) carry the acceptance criteria; this record carries the reasoning._

### Context

M14.24 gives every compendium entry a sourcing score, shown to curators only, so the worst-sourced entries can be fixed first. The owner's call of 2026-10-23 fixed its shape: a pure function, never stored, returning the score and an itemised list of facts whose points add up to it. The task named the facts but not their weights or how each is measured, and two of its facts could not be read from the database. This record settles both.

### What other projects do

- **Wikidata's RQSS** (Hosseini Beghaeiraveri, Gray and McNeill, _Semantic Web_ 2024, [doi:10.3233/SW-243695](https://doi.org/10.3233/SW-243695)) scores referencing with separate metrics: total and _unique_ reference counts per item, a verifiability metric on the _type_ of source, completeness of the reference's own fields, and a believability metric that prefers human-added references over bot imports. Its reviewers argued that collapsing the metrics into one averaged number is not methodologically sound and asked for each metric reported on its own. A score beside its itemised list matches that advice.
- **Wikipedia** rates sources in tiers decided by people, not inferred ([Perennial sources list](https://en.wikipedia.org/wiki/Perennial_sources_list)), and its reference-quality research measures two things: how many claims that need a citation lack one, and how many citations point at a low-tier source ([arXiv 2303.05227](https://arxiv.org/abs/2303.05227); [Research:ReferenceRisk](https://meta.wikimedia.org/wiki/Research:ReferenceRisk)). That project's note: predicting reliability is hard, so show the features and let the human decide.
- **Wikidata's ProVe** shows a per-item reference score from about −1 to 1 ([Wikidata:ProVe](https://www.wikidata.org/wiki/Wikidata:ProVe)), so a negative number is an accepted way to say "worse than nothing".
- **Product-data tools** use weighted completeness, the weights of filled fields over the weights of all fields, with a critical field worth about three times an optional one ([Saber glossary](https://saber.app/glossary/data-completeness); [Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/dev/ref-perl-pod/ProductOpener/DataQualityDimensions.html)).

What carries over: count distinct sources, not citations; rank the kind of source by a tier a person sets; count claims left without a citation; keep every metric visible beside the total; and hold the weights as data in one file.

### The score

**Scope.** Compendium entries only (`ingredients.workspace_id IS NULL`). A coven's own ingredient is never scored, and the coven ingredient type has no score field.

**Shape.** Points are added, each fact capped on its own and never the total, so the list always sums to the score. A perfect entry scores 100. A negative total is possible and sorts first. Every fact appears in the list, zero-point ones too ("Curator review: not yet: +0"), so a curator reads what to fix, not only what is wrong. The weights live in one file and nothing else holds a number.

| Fact                     | Measured as                                                                                                                   | Points                                                                                                   | Cap |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --- |
| Sources cited            | Distinct live `references` across the entry and its live forms; one work cited five times is one source                       | +10 per source                                                                                           | +30 |
| Best source              | The highest tier among those sources                                                                                          | scholarly (any kind) +25 · book, chapter, entry +18 · article not scholarly +15 · web page, Wikipedia +8 | +25 |
| Formal name backed       | Share of the entry's citations whose `name_basis` is `stated` or `resolved`; `unresolved`, `unaudited` and null count against | round(15 × share); nomenclature `none` takes +15 as "no formal name to resolve"                          | +15 |
| Curator reviewed         | `curator_reviewed_at` set                                                                                                     | +30                                                                                                      | +30 |
| Nomenclature unknown     | `nomenclature = 'unknown'`                                                                                                    | −10                                                                                                      | −10 |
| Citation with no locator | A link with no `locator` on a book, chapter, article or entry; a web page's URL is its locator                                | −3 each                                                                                                  | −15 |
| Safety note unsourced    | The entry or a form has `safety_notes` and no live link whose `supports` names `safetyNotes`                                  | −15 once                                                                                                 | −15 |
| Form cites nothing       | A live form with no live link of its own                                                                                      | −5 each                                                                                                  | −15 |

Wikipedia is a `web_page` whose host or URL names `wikipedia.org`, detected in the weights file so the list can name it; it scores as a web page.

**Why these weights.** Review is the largest single fact because a human check beats any mechanical measure. Sources and best source together (55) outweigh review (30), so a reviewed entry citing one web page still ranks below a well-cited unreviewed entry whose name is backed. The locator penalty is small per citation because the seed left many off deliberately for whole-entry citations. Safety is the one place an unsourced claim can hurt someone, so it costs as much as a backed name gains.

**Worked examples.**

| Entry                                                                                                  | List                                                                                  | Score |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----- |
| Three sources (two books, Wikipedia), all `stated`, two book citations without a locator, not reviewed | sources +30 · best source book +18 · name backed 3 of 3 +15 · review +0 · locators −6 | 57    |
| One web page, `resolved`, reviewed                                                                     | sources +10 · best source web +8 · name backed +15 · review +30                       | 63    |
| One web page, nomenclature `unknown`, `unaudited`, safety note unsourced                               | sources +10 · best source web +8 · name backed 0 of 1 +0 · unknown −10 · safety −15   | −7    |

### The data the score needs

Three facts need data the rows did not hold: a citation's `nameBasis` and `supports` lived only in the seed file's frontmatter, and a source's `kind` cannot tell a monograph from a popular book or a journal from a magazine. The owner chose to store them rather than drop the facts:

| Table             | Column       | Type                                                              | Why                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference_links` | `name_basis` | enum `stated` / `resolved` / `unresolved` / `unaudited`, nullable | The seed already decides it per citation; storing it makes the fact scoreable and visible on the entry. Null on a coven's link.                                                                                                                                                                                                                                                         |
| `reference_links` | `supports`   | `text[]`, nullable                                                | The field names the citation backs, as the seed file lists them. Makes "safety note unsourced" scoreable.                                                                                                                                                                                                                                                                               |
| `references`      | `scholarly`  | boolean NOT NULL default false                                    | Scholars edited or reviewed the work, in print or online: a peer-reviewed journal; a university, its press or its museum; an academic press; a learned society's edition or series; a reference work edited by scholars with signed articles. Never a trade press, a wiki, a site republishing others' works (credit the original) or an unsigned site. Set once per work by a curator. |

Under the table-then-behaviour rule they land as two tasks ahead of M14.24: M14.36 adds the columns, and M14.37 has the seed and the admin screens write them (a name-basis select and a supports multi-pick beside the locator in the ingredient form's references list, and a Scholarly checkbox in the reference edit panel, compendium tier only).

### Sorting by the score

The admin list pages through the cursor helper (rule 8), so the sort cannot be a TypeScript sum over a loaded page. The repository builds the ORDER BY as a SQL expression from the same weights file, the way the similarity search already sorts on an expression (`src/db/repository/ingredients.ts`, `sort: [{ expression, type: 'real' }]`), and a `db` test proves the SQL and the pure function agree for every seeded entry. The alternative, scoring every compendium entry in memory and paging by hand, was rejected.

The list sorts from its column headings, in either direction, and the score shows in its own column, read in the same query as the rows (owner decision 6).

### Owner decisions, 2026-10-31

1. Store `name_basis`, `supports` and `scholarly`, with a way to set each in the app.
2. Sort in SQL from the weights file.
3. Compendium entries only.
4. Review at 30 points, and an entry with no formal name taking the full name-basis points: kept as proposed.
5. 2026-11-02: the `scholarly` rule was widened. A work is scholarly when scholars edited or reviewed it, in print or online: a peer-reviewed journal; a university, its press or its museum; an academic press; a learned society's edition or series; a reference work edited by scholars with signed articles. It is not scholarly when it is a trade press, a wiki, a site that republishes others' works (credit the original work instead), or an unsigned site. The data-changes table above states the widened rule.
6. 2026-11-02: the admin list sorts from its Name and Sourcing Score headings instead of a row of sort links. A first click sorts Name A to Z or the score lowest first; a click on the sorted heading reverses it. While searching, the default order is Best Match and no heading is marked. The score shows in its own column on the admin list only, and at phone width a Sort By select offers each order. The URL keeps `?sort=sourcing_score` as lowest first, adds `sort=name`, and reverses either with `order=desc`.

## No endangered species in the compendium

### The owner's words

"No endangered species in the compendium please."

### The four answers

1. Remove an entry whose species is globally IUCN Endangered or Critically Endangered, or is on CITES Appendix I.
2. Only global listings count. A national, state or regional listing never removes an entry. So that the two can be told apart, every listing in `compendium/ethics/` carries a `scope` key: `global`, a place name exactly as the source gives it, or `unknown`.
3. Keep an entry when a source says its trade supply is cultivated. The owner approves each such exception under M14.13.
4. The formal-name rule applies. A listing counts only where the list prints the entry's formal name, or an authority maps its name to exactly that one. Doubt goes to the "Uncertain" section for the owner.

### What was produced

`compendium/ethics/endangered-removals.md` lists, with sources, the entries to remove, the cultivated exceptions, the uncertain ones with a recommendation, and the entries left in because the status is regional. Nothing was deleted.

### What deleting the files does not do

Deleting an entry file does not remove a row that has already landed in a seeded database, because the seed never deletes a row whose file is gone. M14.30 does that, with migration `0090_retire-endangered-entries.sql` (see "How an already-landed entry is retired" below).

### Where it is written down

`claude-docs/compendium/compendium-seed/README.md`, sections "No endangered species" and "Conservation and closed-practice files".

### Outcomes (owner, 2026-10-29)

- **Removed (9):** agarwood (Aquilaria malaccensis), red sandalwood (Pterocarpus santalinus), spikenard (Nardostachys jatamansi), storax (Liquidambar orientalis), Himalayan yew (Taxus wallichiana), Indian atees (Aconitum heterophyllum), pepper-bark tree (Warburgia salutaris), grey parrot (Psittacus erithacus), and costus (Dolomiaea costus). For costus the owner accepted the entry's Wikipedia page as the authority mapping Saussurea costus to it, so its CITES Appendix I row is recorded as `nameBasis: resolved`. Entry files and the sources only they cited are deleted; ethics files stay as the record; `compendium/left-out.md` lists each.
- **Kept under the cultivated exception (5):** Coffea arabica, Vanilla planifolia, Magnolia officinalis, Lathyrus odoratus and Commiphora wightii.
- **Fir (Abies):** kept by the owner. The genus is not itself listed; one species, Abies guatemalensis, is CITES Appendix I.
- **Owner decisions 2026-10-29:** African ginger is kept, because a national rating never removes an entry (its scope is recorded as "South Africa"). Snow lotus stays the genus Saussurea. Ferula aucheri is still undecided.
- **Researched deeper, none removed:** African ginger has no global IUCN rating (national South African rating Critically Endangered A4acd, assessed 2022, scope national; CITES Appendix II limited to four countries). Ferula aucheri has only a prose claim citing one Iranian survey; no assessment found. Snow lotus (Saussurea): the endangered sentence is about Saussurea lappa (= costus, removed); no global rating found for the other named species; the name maps to several species. Recommendation for all three: keep. The two choices put to the owner (a national rating, and the snow lotus genus) are decided above.
- **Seeded databases:** agarwood, red sandalwood, spikenard and storax had already landed on staging. M14.30 retires them.

### How an already-landed entry is retired (M14.30, owner, 2026-10-29)

A forward-only data migration, so every database that migrates gets the change. It matches the entry by `seed_key` (the lower-cased formal name), never by name. The owner chose option B:

- The entry's `ingredients` row is soft-deleted the way a curator's Delete does it, stamped by the seed user.
- Every variant (form) of it that no coven's stock row or spell layer names is soft-deleted too, with the reference links and typed substitutes that variant owns.
- A variant a coven's stock row or spell layer names stays live, with its own links and substitutes. The reason: a coven that holds the entry keeps reading it as "No Longer in the Compendium" (M12.24), and that read needs the variant itself to be live.
- Folk names, deities and the entry's own links and substitutes belong to the entry, not a form, and stay as the curator Delete leaves them.
- Nothing a coven owns is deleted: its cupboard row, stock rows and spell layers stay.

Consequence the owner confirmed: a held variant of a retired entry is not suggested by the spell builder and is refused as a new spell layer (`checkRecipe`), while a layer already saved keeps working.

The seed then reports the entry as `retired` if a file names its key again, and never revives it. A SQL migration cannot call `revalidateTag` on the `compendium` cache tag; the deploy that runs it starts a fresh cache.

The same recipe retires any later removal that has already landed: a new migration with the new seed keys.

## A curator or keeper still sees the page of a hidden entry

### What changed

`CLAUDE.md` said the compendium read takes no session. That stays true of the public read: `readCompendiumEntry` is cached, takes no session and excludes hidden entries in SQL. What is new is a second read, `readCompendiumEntryAsCurator(session, slug)` in `src/modules/ingredients/services/compendium.ts`. It opens with `assertCurator` (a keeper passes), is not cached because its answer depends on who asks, and returns the entry shown or hidden. Soft-deleted rows stay out, in the repository finder.

The entry page (`/compendium/ingredients/[slug]`) calls the public read first. Only when that finds nothing does it ask for a session, and only a curator or keeper gets the second read. A signed-out visitor, or a signed-in user who is not a curator, gets the 404 as before, so the public path stays cheap.

For a hidden entry the page:

- sets robots `noindex, nofollow` in its metadata;
- shows a warning `Notice` (quiet, so a status rather than an alert) under the heading: "Hidden in the Compendium. Only curators and keepers can see this page.";
- carries the shown switch after Reviewed, which flips with the normal `refresh()`; showing the entry removes the notice.

The public list, search, `llms.txt` and `.well-known` files keep excluding hidden entries for everyone.

### Why

The owner wants a curator to keep the page of an entry while it is hidden, so hiding it from the page does not throw the curator onto a 404.

### Rejected

- **A notice and no refresh on the flip.** It left the page showing an entry that a reload would 404.
- **Sending the curator to the entry's Quick Look in the admin compendium.** It moves the curator away from the page they were on.
- **Leaving the 404.** Hiding from the page would have ended the visit.

## How search shows and filters on a form's categories

### Background

A category can be filed on an ingredient or on one of its forms (a form is a variant: the oil of an ingredient, its dried leaf). Both kinds of row live in one table, `ingredient_categories`, told apart by a nullable `variantId`. Since M14.35 an entry whose categories sit only on its forms stays shown on the public compendium. This record settles how a search result shows those categories, how the category filter and its counts treat them, whether the compendium and a coven's cupboard differ, and what the share card does.

### 1. A result card shows the union of the ingredient's categories and its forms'

**Today.** A result card shows the ingredient's own categories only. `readCardCategoriesOf` in `src/app/compendium-reads.ts` (line 236) calls `categoriesOf` (line 242) and never `categoriesOfVariants`. The compendium page reads it at `src/app/(public)/compendium/page.tsx` line 172 (`readCardCategories(...)`), and a coven's cupboard at `src/app/(shell)/coven/[slug]/ingredients/reads.ts` line 62 (`readCardCategoriesOf(session, refs, heldBy)`). `categoriesOf` in `src/modules/ingredients/services/ingredient-children.ts` (line 31) is documented as returning "its own pairs, not its forms'", and the repository narrows it with `ownedByIngredient` (`variant_id IS NULL`). So an ingredient whose categories sit only on its forms shows a card with no chips, even though the filter finds it.

**Decision.** A card shows the union:

- The ingredient's own categories come first, as now.
- The categories carried only by its live forms follow, each once.
- A category carried by both the ingredient and a form is the ingredient's own and is drawn as now.
- A chip carried only by a form is drawn as the plain chip with a dashed border (revised from outlined by the owner on review, 2026-11-02). Its tip names the form or forms that carry it, for example "On: Oil, Dried Leaf".
- A soft-deleted form (a row marked deleted rather than removed) contributes nothing. The pair table is hard-deleted, so a pair outlives its form's soft delete and the read has to check the form is live, as `pairIsLive` in `src/db/repository/ingredients.ts` (line 837) does for the filter.

**What changes.** `readCardCategoriesOf` also reads each form's categories (`categoriesOfVariants`, or a batch read that returns each pair with its form) and merges them. The card chip type gains the names of the forms that carry a form-only category. The card component draws a form-only chip with a dashed border and that tip.

**Not a change to GraphQL.** `Ingredient.categories` stays the ingredient's own rows, as MB.215 ruled (`design-decisions/mb.215-ingredient-variants.md`, line 43: "nothing merges the two"). The cards read services directly (`readCardCategoriesOf` calls `categoriesOf`), not that GraphQL field, so the union is a read for cards and `Ingredient.categories` is untouched.

### 2. The category filter and the facet counts keep matching the union

**Today.** The filter already matches an ingredient through its forms. `categoryArms` in `src/db/repository/ingredients.ts` (line 816) is an `EXISTS` on `ingredient_id` with no variant predicate, and `pairIsLive` (line 837) drops the pair of a soft-deleted form. The GraphQL argument says so: `src/modules/ingredients/graphql/compendium.ts` line 65, "A category counts when it is filed on the entry or on any live form." The facet counts agree. `categoryFacet` in `src/db/repository/ingredient-facets.ts` (line 264) joins each entry to its live pairs, and the count is `entries` (line 180), `count(distinct ingredients.id)`, so an entry that carries a category on the ingredient and on two forms counts once for that category.

**Decision.** No change. The filter and the counts keep matching the union, one count per entry per category. This also means that after decision 1 a card's chips and the filter agree: every chip on a card is a category the filter finds the entry by.

**What changes.** Only a wrong line of documentation. `claude-docs/db/compendium-read.md` line 671 said "The search results do not yet show or filter on a form's categories". The filter half was already wrong, and the sentence now says results show the union and the filter matches it.

### 3. The compendium and a coven's cupboard behave the same way

**Today.** They share the paths. The cupboard's list imports `categoryArgs` (`src/modules/ingredients/graphql/workspace-ingredient-list.ts`), the facet service serves both (`src/modules/ingredients/services/ingredient-facets.ts`), and both cards come from `readCardCategoriesOf`.

**Decision.** They behave the same: the union on the card, the union in the filter and the counts. The change goes into the shared path, not into a copy for each.

**What changes.** Nothing beyond decision 1, which lands once in `readCardCategoriesOf`. The build task tests both.

### 4. The share card keeps its own rule: the ingredient's categories, else its forms'

**Today.** The share card reads `page.detail.categories` (`src/modules/ingredients/services/share-card.ts` line 15). `ingredient-detail.ts` (line 181) builds that from the ingredient's own categories only (`categories: withGroup(categories)`; each form's are on `variants`, line 194). An entry whose categories sit only on its forms gets a card with no chips and no band.

**Decision (settled 2026-10-31).** The card shows the ingredient's own categories as chips and as the coloured band along the bottom edge. When the ingredient has none, it falls back to its forms' categories. When neither has any it shows no chips and no band. **The share card does not take decision 1's union-with-marking.** It stays "own, else forms", as settled.

**What changes.** `readCompendiumShareCard` takes the forms' categories when the ingredient's own list is empty. The build task asserts it with an entry whose categories sit only on a form.

### Work filed

One task builds all of the above: M14.39, "Result Cards Show A Form's Categories, And The Share Card Falls Back To Them". Decisions 2 and 3 need no build of their own.

## Subscription Billing Scope

Decided by the owner on 2026-11-06 while M17.1 (#1356) was re-scoped. This record holds every decision the research behind it needed, and the brief for the proof of concept that settles the one question left open. The research is in [`claude-docs/billing/`](../billing/README.md): [`subscription-models.md`](../billing/subscription-models.md) (the models, the processor, the break-even), [`running-costs.md`](../billing/running-costs.md) (the cost model) and [`scripts/billing-model.mjs`](../../scripts/billing-model.mjs) (the script that computes every figure in them). The build is Wave 21 — Billing and memberships, `M21.1 → M21.20` ([`tasks/m21.md`](../tasks/m21.md), [`waves/wave-21.md`](../waves/wave-21.md)).

This record does not edit `documents/privacy.md`. The Wave 21 task that adds Stripe as a processor (M21.4 for the table row, M21.7 for the checkout page script) edits it, in the same PR as the code that makes it true.

### The Chosen Model: (i) One Price List

The owner chose model (i). The other models stay in `subscription-models.md` as the record of what was compared. Models (a) coven pays with seat bundles, (d) solo only and (e) any member pays are rejected.

**Prices.** All amounts are US dollars a month, held as integers in cents.

| Item                                         | Coven pays    | Each member pays |
| -------------------------------------------- | ------------- | ---------------- |
| Base, covers 3 practitioner seats            | $7.00         | none             |
| Practitioner seat                            | $2.50 (extra) | $3.00            |
| Observer seat                                | $1.25         | $1.25            |
| Observer upgrade to practitioner (set price) | $1.50         | $2.00            |
| Personal plan (a solo coven bought alone)    | $3.50         | $3.50            |

**Rules.**

1. A practitioner seat includes a solo coven of the member's own. An observer seat does not.
2. The observer upgrade is a set price, $0.25 above the difference between the two seats in both modes.
3. The personal plan costs more than a practitioner seat. The owner's reason is more support cost per user. That is an expectation with no source.
4. There is no free tier. The only free things are: the one-month no-card trial on a new coven (a keeper may set a longer one per coven), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium.
5. Coven pays is cheaper than each member pays from three practitioners ($7 against $9). At two practitioners each member pays is cheaper ($6 against $7).

**The R5 discount (the fifth of the five wants in DESIGN.md §13, less for someone in several covens).**

- A person who pays for a seat of their own gets **$1 off each later self-paid practitioner seat or personal plan**, and a **later self-paid observer seat is free**. The first seat they pay for is full price.
- An **observer upgrade counts as paying**: an observer who pays only the upgrade price earns the discount on seats they pay for elsewhere.
- The discount **never lands on another payer's invoice**. A member whose seat is on a steward's invoice gets none.
- On Stripe's side a person holds **one customer and one subscription with one line per seat**, so every discounted seat is a line on the payer's own subscription and no cross-customer coupon is needed. Stripe's coupon rules were not checked. M21.8 confirms them (see "Owner to confirm").

**Final inputs behind the break-even.** Observer share 20%, each-member-pays share 66.66% (both the owner's estimates, no source). Break-evens in paying seats, for (i), against cash only, then cash plus labour in the low contact-rate row and the median row on the salary line, then the job:

| Case                    | Paying seats |
| ----------------------- | ------------ |
| Cash only               | 124          |
| Low row, salary line    | 1,302        |
| Low row, job            | 9,690        |
| Median row, salary line | 4,480        |
| Median row, job         | 16,958       |

The stress case's clearing price is $3.85 a practitioner seat, against $3.00. The owner kept the raised prices.

### The Payer Modes

Every coven has a `payer` mode a steward sets: **coven pays** or **each member pays**.

- **Coven pays:** the steward subscribes once for the coven. Every seat is a line on that subscription.
- **Each member pays:** every member holds their own subscription with one line per seat. An invitation says "to join you must subscribe" and tells the invited person the seat price before they accept. In coven-pays mode the invitation says nothing about payment.
- **The switch takes effect at the next renewal.** One set of subscriptions is cancelled at renewal and the other starts then. There is no mid-period switch, so no proration and no double charge.
- **Test cost:** entitlement paths, webhook cases and stories each run once per mode, plus the switching case and the lapsed member.

### The Pause Rule

**Stop collection while paused, using Stripe's `pause_collection`, for both a site pause (a keeper's pause, [`m15.52-site-access-pause.md`](m15.52-site-access-pause.md)) and a coven pause (a steward's pause, [`m15.55-coven-access-pause.md`](m15.55-coven-access-pause.md)).** A pause that lifts mid-period resumes collection, and the tests pin all three cases (site pause, coven pause, lift mid-period). A paused membership still counts toward R5, because the seat still exists.

### The Lapsed-Member Rule

A member in an each-member-pays coven who stops paying **keeps their seat and their content**. The other members of the coven see that member and their content **read-only**. The lapsed member has **no access to the coven until they pay again**. Nothing is deleted. Every entitlement path **refuses** the lapsed member; none gives them read-only access.

### The Switch Rule

A switch between coven pays and each member pays takes effect at the next renewal (see "The Payer Modes").

### The Processor

- **Stripe Billing and Stripe Tax, the site as merchant** (not a merchant of record). The site files its own sales tax.
- **A checkout page the site hosts.** Stripe.js loads on that page and on **no other**. The Content Security Policy directives for Stripe.js are set on that page only. Card fields stay in Stripe's frames.
- **Managed Payments is the recorded fallback.** It requires Stripe-hosted Checkout, so using it would mean giving up the site-hosted page.
- **United States only, at first.**
- **The seller is a company, an LLC**, not a sole proprietor.
- **Stripe's review:** the owner agreed to describe the site to it.
- The site's PCI self-assessment is expected to be SAQ A. That was not found in the fetched sources; see "Owner to confirm".

**The scoped exception.** The Privacy Policy line "runs no tracking script" and the Code of Ethics line on browser-side scripts need one scoped exception: "one payment script from Stripe runs on the checkout page only". **M21.7 edits `documents/code-of-ethics.md` and `documents/privacy.md` in the same PR that adds the checkout page**, and M21.4 adds Stripe to the privacy policy's processor table. Neither is edited here.

### The Proof-of-Concept Brief

M21.1 runs this. This record does not choose between the candidates.

**Candidates.**

1. `@better-auth/stripe`, the Better Auth Stripe plugin.
2. A thin service over the Stripe SDK, with audited tables of its own.

**The five wants** (DESIGN.md §13), each tested under model (i):

1. The workspace is what pays (a steward subscribes for the coven).
2. Priced by member count (seats as line quantities; here a base plus extra seats, and per-seat lines for each-member-pays).
3. Free months (the one-month no-card trial, and a longer one set per coven).
4. Free until a keeper clears it (the exemption, with an end date).
5. Less for someone in several covens (R5, as defined above).

**For each candidate, the PoC must show,** in Stripe's test mode and for each of the five wants: that it works, where it writes (through `withAudit` or not), which route carries it (`/api/graphql` or outside it), what is Stripe's state and what is ours, and what a webhook replay does to it.

**Also required:**

- Whether `@better-auth/stripe` supports a **site-hosted checkout page** (Elements or embedded Checkout), or whether the Stripe SDK route is required. This is **not found** in the research.
- **Stripe Elements against embedded Checkout** for that page. No recommendation was found. Both load Stripe.js on the one page. The PoC chooses.
- The **peer-range bump** that using the plugin would force on `stripe` and `better-auth`.
- Webhooks replayed from the Events API, signed locally, and the captured events saved as fixtures for M21.2.
- Whether Stripe's coupon rules allow R5 as a line on the payer's own subscription (the question in "Owner to confirm").
- Whether `pause_collection` behaves as the pause rule needs, and whether a test clock covers a renewal.

**Setup.** The PoC needs a test-mode secret in the environment variable **`STRIPE_SECRET_KEY`**, in `.env.local`, named in `claude-docs/secrets.md`. The work runs on the throwaway branch **`spike/m17-stripe`**, which is never merged. M21.1's record, `m21.1-billing-plugin-or-sdk.md`, states the choice and what the spike showed.

### The Data Model

Settled here as the shape the build tasks follow. M21.1 may move the plugin-or-SDK part of it.

- **A billing reference on `workspaces`, or a `workspace_subscriptions` table.** M21.4 chooses by the PoC's result, and decides it in its own record.
- **A per-coven `payer` mode** (coven pays, each member pays).
- **An exemption** per coven with an **end date** and a **confirmed permanent flag**. A permanent exemption needs a confirming step, is listed on the keeper billing page and can be revoked. The keeper exemption schedule is 5%, 3%, 1.5% and 0.5% of paying seats, falling as the site grows.
- **Trial length per coven**, one month as standard.
- **The curator free coven:** each site curator holds a free coven of 7 seats, the curator included, one curator per 1,000 paying seats and at least 2.
- **One Stripe customer and one subscription per paying person, with a line per seat.** A coven that pays is one subscription for the coven. A personal-plan buyer is one subscription.
- **An entitlement service** in the billing module's `services/`, which every workspace-scoped feature asks. It reads the exemption before any subscription row, then the pause state, then the subscription state, and refuses by direct id.
- **Every write goes through `withAudit`**, and every billing table spreads `...auditColumns`, has a trigger-owned `updated_at` and partial unique indexes.
- **Money is integers in the smallest unit.** Never a float.
- **No file outside the billing service imports the processor SDK**, and no resolver or page touches a billing table (a guard test, below).
- **The demo coven's observer seat is never charged.**

### The Membership Views

Each view is a screen, reached through the normal rules: server components call services directly, and everything the browser initiates goes through `/api/graphql`. The field names below are proposals the tasks confirm.

| View                            | Route                                                     | Who reaches it                                                                                           | GraphQL fields it needs                                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Steward coven billing page      | `/coven/[slug]/billing`                                   | A steward of that coven. A practitioner or observer gets Forbidden by direct URL; a non-member gets 404. | Query `workspaceBilling(workspaceId)`: payer mode, plan lines, seat counts, status (trial, active, paused, lapsed, exempt), trial end, renewal date, next invoice amount, exemption end. Mutations: `setWorkspacePayer`, `startCheckout`, `openBillingPortal`, `cancelSubscription`. |
| Account memberships page        | `/account/memberships`                                    | Any signed-in account, for its own memberships only                                                      | Query `myMemberships`: per coven, name, role, who pays, my seat price, my discount, status, renewal date. Mutations: `startCheckout`, `openBillingPortal`.                                                                                                                           |
| Keeper billing page             | `/keepers/billing`                                        | A site keeper (`assertSiteAdmin`). A curator is refused, as on the People page.                          | Query `siteBilling`: paying seats, covens by status, the exemption ledger with end dates and permanent flags, curator free covens against the cap. Mutations: `setBillingExemption` (end date), `confirmPermanentExemption`, `clearBillingExemption`, `setTrialLength`.              |
| Public pricing page             | `/pricing`                                                | Anyone, signed out. Sessionless, indexable, no application data.                                         | None. It reads the price list from the billing service's public constants, not the database.                                                                                                                                                                                         |
| Subscription picker walkthrough | A flow reached from the pricing page and from a new coven | Anyone choosing a plan (pricing page), then a signed-in account (checkout)                               | Query `priceList` (public); `quoteSubscription(input)` for the total with R5 applied (signed in). It is a guided choice between the personal plan, coven pays and each member pays, with the totals worked out as the visitor answers.                                               |

### The Billing Test Plan

Copied verbatim from the plan's testing standard. Every Wave 21 task's acceptance criteria name the tests it ships from this list, over and above CLAUDE.md's rules.

- **Test target**: PR gates run the billing tests against the processor's **official mock server** where it publishes one (Stripe's `stripe-mock`, started as a CI service container beside Postgres and Mailpit, and in the compose stack locally), falling back to a hand-written double only for a processor without one; webhook tests replay events the PoC captured from real test mode, signed locally. A **scheduled or manually dispatched workflow** holding the test-mode secret replays the same suite against the processor's real test mode, so mock drift is caught without putting the secret on PR gates — fork and Dependabot PRs stay green. The payment-processor comparison records which candidates publish a mock. The mock service and the capture fixtures land as their own task before the first behaviour task; the scheduled workflow is its own task.
- **Money is integers in the smallest unit**, never floats; the discount, proration and seat arithmetic have exhaustive table-driven tests including rounding at every boundary, zero seats, the exemption, and a member in 1, 2 and 10 covens.
- **Every entitlement path is tested both ways**: the paying coven reaches the feature; the lapsed, paused, cancelled, exempt-then-cleared and never-subscribed coven is refused by direct id, with the precondition that would have let it succeed asserted (CLAUDE.md "Testing").
- **Webhooks**: signature failure refused; every event handled idempotently (replayed twice, one write); out-of-order delivery converges; an unknown event type is logged and acknowledged; a handler failure is retried by the job and never double-charges.
- **Audit**: every billing write is asserted to carry the actor and to go through `withAudit`; a catalogue-introspection test proves the billing tables carry audit columns and partial unique indexes.
- **Pause rule and discount**: tests pin the recorded decision for a site pause, a coven pause, and a pause that lifts mid-period.
- **Stories**: one `@story-N` browser flow per user-visible billing path, with axe assertions, and a story that proves an observer and a non-member see no billing page by direct URL.
- **Guards**: `tests/guards/` gains a test that no file outside the billing service imports the processor SDK, and that no resolver or page touches a billing table.
- A build task is not done while any of these is missing, and no billing task's criterion may be met by a skipped or flaky test.

### The Operations Decisions

- **Vercel Bot Protection in log mode only.** It records suspicious requests and runs no test in visitors' browsers.
- **Vercel pause-on-budget stays off.**
- **`/.well-known/security.txt` is added to the public list in CLAUDE.md rule 1**, beside `/llms.txt` and the other `/.well-known/*.json` files. It is sessionless, carries no application data, and M21.19 adds it and edits rule 1 in the same PR.
- **No operations-stack task is minted.** The cost model prices and recommends error tracking, uptime, alerting, security monitoring and backup verification, and nothing sets them up.

### The Labour and Salary Decisions

- **The low contact-rate row is the primary case.** The median row is the stress case. The modelled support contact rates are kept.
- **AI assistance:** the factor on minutes per support contact is 0.87, and support agents use Claude Team seats.
- **The salary line is A:** a $250,000 gross salary, filing jointly, with the spouse's income confirmed as zero.
- **The tax structure is B\*:** an S corporation paying a $190,000 wage, the rest as distributions, **pending the accountant**. C (a sole proprietor or single-member LLC) stays the model's cheapest.
- **The owner does the hours up to 160 a month** and the site hires only the rest. Until the salary is affordable, the owner is paid for those hours at the loaded rates: $53.80 an hour for support and $100.88 for engineering. The draw is the smaller of that value and net revenue less cash costs and hired help, never below zero. The tables are in `running-costs.md`.
- **The living wage is a floor, not a maximum.** M21.18 scopes an executive pay maximum: a ratio of the highest to the lowest pay on the site.
- **"Pricing as modelled is fair enough."** Regional pricing, a self-requested hardship exemption and a stated wage gap are not modelled.

### The Exemption Schedule, the Trial and the Four Departures

**Exemption schedule (confirmed).** A keeper may exempt covens up to 5% of paying seats at first, then 3%, 1.5% and 0.5% as the site grows. Every exemption has an end date; "permanent" is the exception.

**Trial.** One month, no card, on a new coven. A keeper may set a longer one per coven for promotions and beta testers.

**The four accepted departures from DESIGN.md §13.**

1. A per-coven trial length that a keeper can set.
2. A curator's free coven of 7 seats, the curator included, one curator per 1,000 paying seats and at least 2.
3. Timed exemptions: an exemption has an end date, and "permanent" needs confirmation, is listed on the keeper billing page and can be revoked.
4. The demo coven's observer seat stays free.

### The Decisions, Dated

The owner's decisions in the order the research recorded them. The first 25 are the structured list the model's page carried; the rest are the earlier decisions from `subscription-models.md`, copied as written.

#### The 25 Structured Decisions (2026-11-06)

1. **i-prices-raised** (2026-11-06): (i)'s prices rise: coven pays $7 for 3 practitioners, $2.50 each extra practitioner, $1.25 each observer; each member pays $3 a practitioner seat and $1.25 an observer; observer upgrade a set $1.50 where the coven pays and $2.00 where members pay (both $0.25 above the difference between the seats); personal plan $3.50; $1 off each later self-paid practitioner seat or personal plan, and a later self-paid observer seat free. Coven-pays breaks even with each-member-pays at two practitioners ($7 against $6, so member-pays is cheaper at two) and is cheaper from three ($7 against $9).
2. **model-i** (2026-11-06): Model (i) chosen. The remaining owner questions are written against it; a question with a models key applies only to those models.
3. **seller** (2026-11-06): Sell through a company, an LLC.
4. **stripe-review** (2026-11-06): Yes, describe the site to Stripe's review.
5. **countries** (2026-11-06): United States only, at first.
6. **exemptions** (2026-11-06): The keeper exemption schedule is confirmed: 5% / 3% / 1.5% / 0.5% of paying seats.
7. **pauses** (2026-11-06): Stop charging while paused (Stripe pause_collection), for both a site pause and a coven pause.
8. **bot-protection** (2026-11-06): Vercel Bot Protection in log mode only.
9. **design-departures** (2026-11-06): All four departures from DESIGN.md section 13 are accepted.
10. **trial** (2026-11-06): Keep the one-month trial with no card.
11. **security-txt** (2026-11-06): Add /.well-known/security.txt to the public list.
12. **vercel-budget** (2026-11-06): Leave Vercel pause-on-budget off.
13. **observer-share** (2026-11-06): Observer share 20%, not 30%. Owner: "I think the observers are going to be lower. Let's do 20%." The owner's estimate, no source.
14. **contact-rates** (2026-11-06): Keep the modelled support contact rates (low row primary, median the stress case).
15. **lapsed-member** (2026-11-06): A member who stops paying keeps their seat and content; the other members see them read-only; the lapsed member has no access to the coven until they pay. Owner: "The seat stay, the content stays, the other members can see their stuff read-only. They just can't access it at all until they pay." Entitlement paths refuse the lapsed member; they do not give read-only access.
16. **payer-switch** (2026-11-06): A switch between coven pays and each member pays takes effect at the next renewal; no mid-period switch.
17. **salary-structure** (2026-11-06): Structure B* (S corporation, $190,000 wage, the rest as distributions), pending the accountant. The salary line stays A. Spouse income is confirmed zero. C stays the model's cheapest.
18. **primary-row** (2026-11-06): The low contact-rate row is primary; the median row is the stress case.
19. **raised-prices** (2026-11-06): Keep the raised prices; the owner raised them before the question.
20. **ai-assistance** (2026-11-06): Confirm the 0.87 factor and the Claude Team seats.
21. **member-pays-share** (2026-11-06): Each-member-pays share 66.66%, not 50%. Owner: "I honestly think it will be more like 66.66%." The owner's estimate, no source.
22. **owner-does-hours** (2026-11-06): The owner does the hours up to 160 a month and hires only the rest; the salary line already models this. Owner: "Also model it if I'm going to take the contractor hours. At least some of them. Based on how much other work there is. Because I'd definitely be doing that and what support I can without paying someone else."
23. **owner-draw** (2026-11-06): The owner is paid for their own hours at the loaded rates until the salary is affordable; see ownerDraw. Owner: "give me how much I would be making at each level too if I'm paying myself the support and contractor rate. Until I can afford my salary. Plus how many hours I'd work."
24. **processor** (2026-11-06): Stripe Billing + Stripe Tax, the site as merchant, with a checkout page the site hosts; Stripe.js loads on that page and on no other. Questions 1, 2 and 13 are decided. Managed Payments stays as the recorded fallback and requires Stripe-hosted Checkout, so it would mean giving up the site-hosted page. The proof of concept chooses between Stripe Elements and embedded Checkout (no recommendation) and tests whether @better-auth/stripe supports a site-hosted page.

25. **github-team** (2026-11-06): The repository is going private and moves to GitHub Team: $4 a user a month, Secret Protection 24. **processor** (2026-11-06): Stripe Billing + Stripe Tax, the site as merchant, with a checkout page the site hosts; Stripe.js loads on that page and on no other. Questions 1, 2 and 13 are decided. Managed Payments stays as the recorded fallback and requires Stripe-hosted Checkout, so it would mean giving up the site-hosted page. The proof of concept chooses between Stripe Elements and embedded Checkout (no recommendation) and tests whether @better-auth/stripe supports a site-hosted page.
    9 and Code Security $30 per active committer a month, and the Actions minutes beyond Team's 3,000 included at $0.006 a minute. Free offers repository rules and protected branches on public repositories only, which is why Team is required. Owner: "Yeah we're gonna need those for the team plan." The cost is one committer at every size and $67.39 a month, a cash row of its own in every total.

#### The Earlier Decisions

Copied from `subscription-models.md`, "Owner Decisions Recorded for the Design Record".

- **R5 (2026-11-06).** "'$1 for a discounted seat' - only a person paying for a coven gets a discounted seat on other covens." The discount is on the second coven's invoice, for a seat held by a paying steward of another coven. At 1.2 memberships per account and 5.5 members per coven that is 3.6% of seats (derived).
- **Viewers and solo covens (2026-11-06).** "Viewers don't get solo covens." In (g) only a paid practitioner or steward seat includes a free solo coven; an observer seat does not. Revenue is unchanged; the free-coven storage cost counts practitioner seats only (80% of paid seats under the 20% observer assumption).
- **Observers add a solo coven (2026-11-06).** "for solo covens. Viewers have to pay the difference. So they can get a solo coven for $1.99." The observer pays the solo price less $1 on their own subscription (person-level price on the Stripe side); take-up 20% (assumption). (g) then needs 121 paying seats on cash.
- **Observer price (2026-11-06).** "Also viewers should get a cheaper price point." The modelled price is $1 against $2 for a practitioner seat, with 20% of members observers. The price is my assumption; the 20% share is the owner's estimate (answered 2026-11-06, no source).

- **Owner's answers to the open questions (2026-11-06).** Every open question is answered. They are recorded here by topic.
  - **Seller:** sell through a company, an LLC, not as a sole proprietor.
  - **Stripe's review:** yes, describe the site to Stripe's review.
  - **Where customers are:** United States only, at first.
  - **Keeper exemptions:** the schedule is confirmed: 5% of paying seats at first, then 3%, 1.5% and 0.5% as the site grows.
  - **Pauses:** stop charging while paused, using Stripe's `pause_collection`. It applies to a site pause and to a coven pause.
  - **Vercel Bot Protection:** log mode only. It records suspicious requests and runs no test in visitors' browsers.
  - **DESIGN.md §13:** all four departures under "New Requirements Beyond DESIGN.md §13" are accepted.
  - **Trial:** keep the one-month trial with no card.
  - **security.txt:** add it to the public list of pages that need no signed-in session.
  - **Vercel spending:** leave pause-on-budget off.
  - **Observer share: 20%.** Owner: "I think the observers are going to be lower. Let's do 20%." This was 30%. It is the owner's estimate, with no source (range 15% to 50%). Every figure that uses it is re-run: (c), (g), (h) and (i).
  - **Support contact rates:** keep the modelled rates.
  - **A lapsed member (each member pays):** the seat and the content stay, and the other members see them read-only; the lapsed member has no access to the coven until they pay. Owner: "The seat stay, the content stays, the other members can see their stuff read-only. They just can't access it at all until they pay." The entitlement paths therefore refuse the lapsed member; they no longer give read-only access.
  - **Switching payer mode:** takes effect at the next renewal, with no mid-period switch.
  - **Tax structure: B*** (an S corporation paying a $190,000 wage, the rest as distributions), pending the accountant. The salary line stays A. The spouse's income is confirmed as zero. B* is the owner's choice; C stays the model's cheapest structure.
  - **Main case:** the low contact-rate row is the main case, and the median row is the stress case.
  - **Prices that clear labour:** keep the raised prices. The owner raised them before this question, so the raise answers it.
  - **AI assistance:** the 0.87 factor and the Claude Team seats are confirmed.
  - **Each-member-pays share: 66.66%.** Owner: "I honestly think it will be more like 66.66%." This was 50%. It is the owner's estimate, with no source (range 0% to 100%). Model (i) is re-run with it: 11.1% of seats earn the discount, not 8.3%.
- **GitHub Team (2026-11-06).** The repository is going private and moves to GitHub Team: $4 a user a month, Secret Protection $19 and Code Security $30 per active committer a month, and the Actions minutes beyond Team's 3,000 included at $0.006 a minute. Free offers repository rules and protected branches on public repositories only, which is why Team is required. Owner: "Yeah we're gonna need those for the team plan." The cost is one committer at every size and $67.39 a month, a cash row of its own in every total. See "CI" in running-costs.md.
- **The owner does the hours (2026-11-06).** Owner: "Also model it if I'm going to take the contractor hours. At least some of them. Based on how much other work there is. Because I'd definitely be doing that and what support I can without paying someone else." The salary line already does this: the owner takes every hour up to 160 a month and the site hires the rest. See "Who does the hours" under Break-Even.
- **What changed in the figures.** The observer share (30% to 20%) and the each-member-pays share (50% to 66.66%) moved the tables. (i)'s cash break-even is 124 paying seats, and its cash + labour break-evens are 1,302 (low) and 4,480 (median). The price that clears cash + the structure A job in the median row is $3.85, against today's $3.00.
- **Flat seats (2026-11-06).** "Yes, add (h) beside (g)." Model (h) has no base fee: a practitioner seat includes a solo coven, an observer seat costs less and becomes a practitioner seat by paying the difference, a solo coven alone costs the same as a practitioner seat, and a paying steward gets 50% off practitioner seats in other covens.
- **One price list, over (c) (2026-11-06).** The owner asked for (i) beside (h), then asked why it did not use (g)'s group plan of $6 for 3 and $2 for each additional ("Model g had a group plan for $6 for 3 and $2 for additional. Why didn't you incorporate that?"), and said "rebuild yes". (i) is now built over (c), not (h): one price list with the per-coven payer switch. **Coven pays:** $6 a month for 3 practitioner seats, $2 each extra practitioner, $1 each observer. **Each member pays:** practitioner seat **$3** (owner: "$3"), observer $1. Every practitioner seat includes a solo coven; an observer upgrades to a practitioner seat by paying the difference ($1 in a coven that pays, $2 where members pay). A solo coven bought alone is the **personal plan at $3.50**. Owner: "Let's go $3.50 for a practitioner seat without a coven. There will probably be more support cost per user." The reason is the owner's expectation; it has no source. The consequence of $3: coven-pays and each-member-pays cost the same at two practitioners ($6 both ways) and coven-pays is cheaper from three ($6 against $9), which is what makes paying for the coven worth it.
- **(i)'s prices raised (owner, 2026-11-06).** The owner's list, verbatim: "Coven pays: base (covers 3 practitioners) - $7.00; Coven pays: extra practitioner seat - $2.50; Each member pays: practitioner seat - $3.00; Observer seat - $1.25; Observer upgrade - $1.50 a month where the coven pays, $2.00 where members pay; Personal plan - $3.50; Personal plan - $1 off, free observer". I read it as: the coven pays $7 for 3 practitioner seats, $2.50 for each extra practitioner and $1.25 for each observer; each member pays $3 for a practitioner seat and $1.25 for an observer; an observer upgrade is a set $1.50 a month where the coven pays and $2.00 where members pay; the personal plan is $3.50; and the discount stays $1 off each later self-paid practitioner seat or personal plan, while a later self-paid observer seat is free (the whole $1.25 off). The upgrade is now a set price, not the difference between the seats: it is $0.25 above the difference in both modes. Coven-pays breaks even with each-member-pays at two practitioners ($7 against $6, so each-member-pays is cheaper at two) and is cheaper from three ($7 against $9). The other models are unchanged.
- **R5 in (i): $1 off (2026-11-06).** "Any user that is paying for a seat gets a discount. So coven members that aren't paying for their own seat don't." The owner first set 50% and then changed it: "50% discount seems high." then "$1 off." The discount is $1 off each seat a person pays for themselves (a seat in an each-member-pays coven, or an upgrade difference they pay), beyond the first one they pay at full price. It never lands on another payer's invoice: "self paid seats only." It applies to every seat type, observer seats included, so a person's self-paid observer seat in a later coven costs $0 (owner: "I'm ok with the observer seat being free in other covens."). This replaces the paying-steward rule for (i) only; (c), (g) and (h) keep the rule above, and (h) keeps its 50%.
- **An observer upgrade earns the discount (2026-11-06).** Owner: "yes they earn the discount." An observer who pays only the upgrade price to become a practitioner counts as paying for a seat, and earns the discount on the seats they pay for elsewhere. (i) is modelled that way.
- **One subscription per paying person (2026-11-06).** In an each-member-pays coven a person holds one Stripe subscription with one line per seat, not one subscription per seat. The owner's point: a $0 observer line adds no subscription, and Stripe's 30¢ fixed fee is charged per payment, so a free later seat costs nothing extra. This is a data-model point for the record: the billing tables hold a subscription per person with seat lines, not a subscription per coven seat. (i) counts subscriptions that way: one per paying person, one per coven that pays, one per personal-plan buyer.
- **Payer modes (2026-11-06).** "Model both modes now." Every coven-pays model that reaches the page ((c), (g), (h), (i)) gains a per-coven switch between coven pays and each member pays. See "Payer Modes" below; the member-pays rule and the switching rule are now the owner's decisions (see below).
- **Models rejected (2026-11-06).** "We're not going to do e - any member pays, remove it. We're not going to do d - solo run only by itself. We're not going to do a - coven pays, seat bundles." Each is a short entry under "Considered and Rejected"; (d)'s solo-coven price research stays because (g) and (h) use it.
- **Salary structure.** The owner's goals: "the cheapest tax option with the maximum benefits", "while maintaining what I would get at a $250k salary". The owner's decisions, 2026-11-06: the salary line is structure A, "$250,000 gross before what the employee would see taken out of their paycheck" (a $250,000 gross salary plus the employer's payroll taxes, $266,575 a year, plus Lane D's benefits), because the owner wants the line to read as a normal employee's cost; and the owner files married filing jointly ("Married filing jointly would be my tax."), with the spouse's income unknown and assumed to be zero (owner to confirm). Structure C (a single-member LLC taxed as a sole proprietor, $252,950 a year of business earnings jointly, $249,434 for a single filer) stays the model's recommendation as a tax structure, pending an accountant, and is a sensitivity row beside the salary line. See [running-costs.md](../billing/running-costs.md#salary-structures) and owner question 21.
- **AI assistance for support agents is on by default.** The factor on minutes per support contact is 0.87 in the primary case (0.735 and 1.00 as sensitivities), from Brynjolfsson, Li and Raymond (QJE 2025): resolutions per hour up 15.2%, handle time down 8.5%. It deflects no contact. Agents use the Claude Team plan ($25 a seat a month, 2-seat minimum), never Pro, because the consumer terms train on inputs unless opted out and customer messages must not train a model (the Code of Ethics: the site sells no data). The Team plan's training terms and what is unconfirmed are under "Labour and the One-Person Ceiling".
- **Labour scales with paying seats.** Hours a month = fixed hours + variable hours per 1,000 paying seats. The low contact-rate row is the primary case and the median is the stress case; both are shown everywhere. Support, dispute and privacy-request hours are priced at a living wage without health cover ($41.47 an hour, derived), loaded with employer payroll taxes and benefits to $53.80 an hour; engineering hours at the BLS Washington developer median ($80.07), loaded to $100.88. See "Labour and the One-Person Ceiling" under Break-Even.
- **No free tier (2026-11-06).** There is no free tier. The only free things are a trial period on a new coven (one month as standard; keepers may set a longer one for promotions and beta testers), each site curator's free coven, keeper exemptions, the demo coven's observer seat, and the public compendium. The four departures from DESIGN.md §13 under "New Requirements Beyond DESIGN.md §13" follow from it.
- **Pricing as modelled is fair enough (2026-11-06).** After reviewing regional pricing, a self-requested hardship exemption and a stated wage gap, the owner decided: "pricing as modelled is fair enough". None of the three is modelled. No numbers change.
- **The living wage is a floor (2026-11-06).** "The living wage is a minimum. Not a maximum." The $250,000 salary target is above that floor by the owner's choice. A task, to be minted on Wave 21 by M17.1 (no id yet), will scope an executive pay maximum: a ratio of the highest to the lowest pay on the site, researched against published pay-ratio policies.
- **Model (i) chosen (owner, 2026-11-06).** The owner chose model (i), One price list ($7 base, +$2.50 for each extra seat if the coven pays, $3 if members pay, $1.25 observer seat, $1 off a second coven, personal plan $3.50; the prices were raised later the same day, see the next entry). The remaining owner questions are written against (i) and quote (i)'s figures first; the other models' sections and tables stay as the record of what was compared. Questions 6 and 16 and the (g)-only and (c)-only options are gone; a question that applies to only some models carries a models list.
- **Processor: Stripe Billing + Stripe Tax, the site as merchant, with a checkout page the site hosts; Stripe.js loads on that page and on no other (owner, 2026-11-06).** The owner first said "And stripe as the processor: Stripe Billing + Tax, hosted Checkout", then amended it: "I want to host my own checkout. And only have the scripts on absolutely necessary pages." Questions 1 (merchant or merchant of record), 2 (Sold through Link) and 13 (Stripe.js; now answered as: on the checkout page only) are decided. The research's earlier recommendation, Stripe-hosted Checkout, is overridden by the owner; the reason is fewer vendor pages and the script confined to the one page that needs it. Fees are unchanged. The consequences are under "A Site-Hosted Checkout Page". Question 4 stays, as a yes or no on describing the site to Stripe's review. Fee figures use Stripe option 1 as primary; Managed Payments stays in the comparison as the recorded fallback, and it requires Stripe's hosted Checkout, so using the fallback would also mean giving up the site-hosted page.

### Owner to Confirm

Nothing blocks the Wave 21 tasks. These facts were not found in the sources, and the task that needs each one confirms it. The full list, with the numbered items, is "What the Repository Doesn't Say" in [`running-costs.md`](../billing/running-costs.md).

- **Accountant items:** the reasonable-compensation wage for structure B\*, the qualified business income thresholds, the Form 2553 election, unemployment and L&I cover for an officer, Paid Family and Medical Leave, WA Cares, how Washington B&O treats the site as merchant, and current payroll fees. The owner takes these to the accountant.
- **Spouse income:** confirmed zero on 2026-11-06. Every joint figure assumes it, and the structure table changes if it changes.
- **Stripe's coupon rules** for R5 as a line on the payer's own subscription. M21.1 tests it and M21.8 confirms it before the discount is built.
- **SAQ A:** that a site-hosted page with Stripe's frames keeps the site at the lightest PCI self-assessment was not found. Stripe's Dashboard compliance page or the accountant confirms it.
- **Plugin support:** whether `@better-auth/stripe` supports a site-hosted checkout page. M21.1 tests it.

### Appendix: The Plan

The plan M17.1 was run from, copied unchanged (it was kept outside the repository).

#### M17.1 — Scope Subscription Billing: the research, the record and the tasks it mints

##### Context

M17.1 (#1356) was written as a 4-hour task: run the Stripe test-mode spike, decide plugin-or-SDK, decide the data model, mint the billing tasks. On 2026-11-06 the owner re-scoped it:

- **The spike becomes its own proof-of-concept task.** M17.1 frames it; the PoC task runs it and makes the plugin-or-SDK choice. M17.1 does not choose.
- **M17.1 researches running costs** at 100 / 1k / 10k / 100k accounts, including CI, the Claude subscription, database growth, maintenance, incident response, observability, security monitoring and alerting.
- **M17.1 proposes subscription models** (coven pays with seat bundles; each user pays; others the research supports), with desk research on how each would be received, a researched free-tier recommendation, Stripe fees, Stripe Tax, Washington B&O and sales tax, and a break-even per model against a $250,000 salary plus payroll load and benefits.
- **M17.1 mints the membership-management tasks** as well as the billing ones: a steward's coven billing page, an account "my memberships" page, a keeper's site billing page and a public pricing page.
- **M17.1 does all of it, re-estimated.** One PR, Markdown only.
- **Nothing is assumed.** Every price, rate, ratio and norm comes from a source fetched in this session and is linked; a derived figure is labelled derived and shows its inputs; where no source exists the doc says so and asks the owner. ([[feedback_all_claims_sourced]])
- **Every agent runs on Fable** for this task (overriding the Sonnet default).

Decisions the owner gave in planning (recorded here so the docs don't re-ask):

| Question                  | Answer                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Size unit                 | Accounts: 100 / 1k / 10k / 100k; members-per-coven and covens-per-member ratios researched, labelled                                                                                       |
| Currency                  | USD throughout                                                                                                                                                                             |
| Owner's time              | Priced at a researched contractor rate **and** at the $250k-salary-plus-load rate; both shown                                                                                              |
| Location                  | US, Washington: employer payroll taxes, benefits load, B&O and sales tax on SaaS researched for WA                                                                                         |
| Claude plan               | The highest current Max plan, researched by name and price; cloud review ("ultra") is covered by it, no extra row                                                                          |
| Platform plans            | Vercel Pro and paid Neon from 100 accounts up; Hobby/free shown once as a $0 reference row; each vendor's enterprise threshold researched                                                  |
| Ops vendors               | A researched shortlist, 2–3 per category, filtered by the Code of Ethics: no browser-side script, server-side only, high data control (self-hostable or data-residency controls preferred) |
| Service level             | Researched: what comparable paid hobby/community SaaS promise                                                                                                                              |
| Market method             | Desk research only, every claim linked                                                                                                                                                     |
| The five §13 requirements | A proposal may drop or alter any; each departure marked                                                                                                                                    |
| Free tier                 | Research it and recommend, costed                                                                                                                                                          |
| Model choice              | During M17.1: docs drafted and committed, owner chooses, then the record and tasks are written                                                                                             |
| Doc home                  | `claude-docs/billing/` (new), Markdown                                                                                                                                                     |

Repo facts the inventory established (paths relative to the worktree): Vercel Hobby, $0 (DESIGN.md §4); M17.4 records a Pro move; three daily crons in `vercel.json`; Vercel Workflows via `withWorkflow` in `next.config.ts`; Neon free tier, `main` + `staging` branches, snapshot branches before each production migration; Resend in production, Mailtrap in previews, Mailpit locally, 100-mails-a-day assumption in `claude-docs/tasks/m15.md`; Better Auth with Discord/Google/Microsoft/Facebook, no paid auth; public repo, GitHub-hosted `ubuntu-26.04` runners, ~500 gate runs a month (`claude-docs/ci/runner-budget.md`); no error tracking, uptime, alerting, log drain, CodeQL, SECURITY.md or incident runbook beyond `claude-docs/db/snapshot-and-restore.md`; privacy policy names Vercel, Neon, Resend and the four sign-in providers as processors (`documents/privacy.md`); the Code of Ethics forbids browser-side analytics and any advertising (`documents/code-of-ethics.md`, "Developers").

##### Worktree and branch

`/home/node/worktrees/m17.1`, branch `feature/m17.1-scope-subscription-billing-the-stripe-spike`, off `origin/staging`; `node_modules` copied, `.env.local` copied. Task is `In Progress` on the board. Every command runs with `cd /home/node/worktrees/m17.1`.

##### Deliverables (all Markdown, plus the board)

1. **`claude-docs/billing/running-costs.md`** — the cost model. Sections: scale assumptions (accounts → covens, members, active fraction, sessions, rows, bytes, mails, invocations; each ratio sourced or measured); platform (Vercel Pro meters and overage, Workflows, image/OG, domains; Neon compute, storage, branches, backups; Resend tiers; domain); CI (public-repo minutes are free: say so with the source; what changes if the repo went private; e2e/story suite growth); development tooling (Claude Max top plan, GitHub plan, devcontainer); operations stack (error tracking, uptime, log drain/retention, alerting/on-call, security monitoring: dependency, secret, code scanning, WAF/bot, backup verification) with the ethics-filtered shortlist and a recommended pick per category; maintenance and incident response (hours per month per size, researched norms; priced at both rates); payment processing (Stripe fees, Stripe Tax, dispute fees); taxes (WA B&O on services, WA sales tax on digital automated services); the 4-column total per size, cash-only and with-time rows; enterprise thresholds per vendor; a "what the repo doesn't say / owner to confirm" list.
2. **`claude-docs/billing/subscription-models.md`** — the proposals. For each model: structure, price points (from comparables), which of the five §13 requirements it keeps/drops/alters, how the multi-coven discount and the keeper exemption map onto it, Stripe objects it needs (products, prices, coupons, per-seat vs tiered), reception evidence (comparable products' pricing pages, published surveys, community discussion — linked), free-tier recommendation with cost, break-even table per size against (a) cash costs, (b) cash + contractor-rate time, (c) cash + $250k-plus-load. Ends with a recommendation and the questions the owner must answer.
3. **`claude-docs/billing/README.md`** — what the folder holds and how to re-run the model (the inputs table, dated; prices expire).
4. **`claude-docs/design-decisions/m17.1-subscription-billing-scope.md`** — the record. Renamed from the criterion's `m17.1-billing-plugin-or-sdk.md` because the plugin-or-SDK choice now belongs to the PoC task; the criterion in `m17.md` is corrected in place. Holds: the chosen model (owner's pick); the PoC's brief (both candidates, the five requirements, what the PoC must show for each, the env var name `STRIPE_SECRET_KEY`, the throwaway-branch rule); the data model (billing reference on `workspaces` or a `workspace_subscriptions` table, `billing_exempt_until_cleared` flag, entitlement service, all through `withAudit` with `auditColumns`); the multi-coven discount definition; the pause rule (site pause M15.52, coven pause M15.55: pauses/keeps running/extends; discount counting); the membership-management section (the four views, who may reach each, which GraphQL fields they need); the minted tasks in order. Also carries this plan verbatim as an appendix ([[feedback_store_plan_beside_design_decisions]]).
5. **Board and task docs**: `claude-docs/tasks/m17.md` M17.1 entry corrected (story, criteria, estimate) and `claude-docs/waves/wave-17.md` saying the minted tasks live on Wave 21; the new wave's files (`tasks/m21.md`, `waves/wave-21.md`, the `TASKS.md` row, the `tasks-md.mjs` entry, the milestone); `node scripts/task-board.mjs sync` run from the worktree ([[project_task_board_sync_reads_own_checkout]]); DESIGN.md §13 "Subscription billing", §14 row, §15 bullet updated to say the scope is decided and point at the record and tasks; `claude-docs/backlog.md` V2 item moved to V Fast Follow naming the tasks; `documents/privacy.md` is **not** edited here (a build task that adds Stripe as a processor edits it then — say so in the record).

##### Tasks to mint: a new wave, **Wave 21 — Billing and memberships**

M17.1 stays on Wave 17. Everything it mints is `M21.1 → M21.n`, on a new milestone **Wave 21 — Billing and memberships** (the board has no command to create a milestone, so it is one `gh api` POST to `repos/…/milestones`, description = the id list then the wave link, as `task-tracking.md` says), with `claude-docs/tasks/m21.md` (header like `m20.md`: "minted by M17.1 on <date> from the record"), `claude-docs/waves/wave-21.md`, a `21 — Billing and memberships` row in `TASKS.md`'s Execution order, and `claude-docs/tasks/m21.md` added to the list in `scripts/tasks-md.mjs` (the criterion allows that file). Ids confirmed against the board at minting, since parallel sessions mint ([[project_parallel_sessions_mint_ids]]).

Table task before every behaviour task that depends on it. Estimates set at minting. Draft list; the chosen model may add or remove a task:

1. **Stripe proof of concept** — throwaway branch `spike/m17-stripe`; runs `@better-auth/stripe` and a thin SDK service against test mode for each of the five requirements under the chosen model; webhooks replayed from the Events API signed locally; the record `m17.<n>-billing-plugin-or-sdk.md` decides; branch never merged; needs `STRIPE_SECRET_KEY` (test) in `.env.local`, named in `claude-docs/secrets.md`.
2. **Billing tables** — subscription/customer reference, exemption flag, audit columns, migration; privacy policy row for Stripe.
3. **Billing service and entitlement check** — `src/modules/coven/services/billing.ts` (or a `billing` module if the record decides), `withAudit`, `assertMembership`-based; the pause rule.
4. **Stripe webhook route and event replay** — the one plain route Stripe calls; signature verification; idempotent event handling; job via Workflows.
5. **Checkout and billing portal mutations** — GraphQL only; `/api/graphql`.
6. **Multi-coven discount computation** — service + coupon application.
7. **Keeper exemption mutation and ledger entry.**
8. **Steward coven billing page** — `/coven/[slug]/billing`.
9. **Account "my memberships" page** — `/account/memberships`.
10. **Keeper site billing page** — `/keepers/billing`.
11. **Public pricing page** — `/pricing`, sessionless, indexable, no application data.
12. **Billing stories** — Playwright stories for subscribe, seat change, cancel, exemption, discount.

**Testing standard for every Wave 21 task** (errors in billing are unacceptable). The record carries a "Billing test plan" section and each minted task's acceptance criteria name the tests it must ship, over and above CLAUDE.md's rules:

- **Test target**: PR gates run the billing tests against the processor's **official mock server** where it publishes one (Stripe's `stripe-mock`, started as a CI service container beside Postgres and Mailpit, and in the compose stack locally), falling back to a hand-written double only for a processor without one; webhook tests replay events the PoC captured from real test mode, signed locally. A **scheduled or manually dispatched workflow** holding the test-mode secret replays the same suite against the processor's real test mode, so mock drift is caught without putting the secret on PR gates — fork and Dependabot PRs stay green. The payment-processor comparison records which candidates publish a mock. The mock service and the capture fixtures land as their own task before the first behaviour task; the scheduled workflow is its own task.
- **Money is integers in the smallest unit**, never floats; the discount, proration and seat arithmetic have exhaustive table-driven tests including rounding at every boundary, zero seats, the exemption, and a member in 1, 2 and 10 covens.
- **Every entitlement path is tested both ways**: the paying coven reaches the feature; the lapsed, paused, cancelled, exempt-then-cleared and never-subscribed coven is refused by direct id, with the precondition that would have let it succeed asserted (CLAUDE.md "Testing").
- **Webhooks**: signature failure refused; every event handled idempotently (replayed twice, one write); out-of-order delivery converges; an unknown event type is logged and acknowledged; a handler failure is retried by the job and never double-charges.
- **Audit**: every billing write is asserted to carry the actor and to go through `withAudit`; a catalogue-introspection test proves the billing tables carry audit columns and partial unique indexes.
- **Pause rule and discount**: tests pin the recorded decision for a site pause, a coven pause, and a pause that lifts mid-period.
- **Stories**: one `@story-N` browser flow per user-visible billing path, with axe assertions, and a story that proves an observer and a non-member see no billing page by direct URL.
- **Guards**: `tests/guards/` gains a test that no file outside the billing service imports the processor SDK, and that no resolver or page touches a billing table.
- A build task is not done while any of these is missing, and no billing task's criterion may be met by a skipped or flaky test.

**No operations-stack task is minted**: the cost model prices and recommends error tracking, uptime, alerting, security monitoring and backup verification, and nothing sets them up. The record says so.

##### Execution

###### Lanes (parallel, Fable, web research with sources; each writes `.reports/m17.1/<lane>.md` in the worktree — `.reports` is gitignored — and reports a summary)

Each brief: the goal, the owner's decisions table above, the repo facts, the ethics constraints, the output file, the rule that every number carries its source URL and fetch date and that nothing is from memory, the Bash `description` rule, narrate occasionally.

- **Lane A — platform prices**: Vercel Pro and Enterprise (seats, invocations, Active CPU, memory, data transfer, edge requests, image optimisation, Workflows, cron limits, domains), Neon (plans, compute-hours, storage per GB, branches, point-in-time restore, read replicas), Resend tiers, Stripe fees + Stripe Tax + dispute fee + Billing fee, domain renewal, GitHub plans and Actions minutes for public vs private, the current top Claude Max plan name and price. Enterprise thresholds and when a meter forces the next plan.
- **Lane B — operations shortlist**: for error tracking, uptime, log drain + retention, alerting/on-call, security monitoring (dependency, secret, code scanning, WAF/bot), backup verification: 2–3 candidates each that fit Next.js on Vercel + Neon, server-side only, no browser script required, self-hostable or strong data-control terms; price at each size; a recommended pick with the reason; what Vercel and Neon include natively; researched SLA/status-page norms for comparable paid hobby/community SaaS.
- **Lane C — market and models**: comparable products (group-pays-with-seats, per-user, family/household bundles, community/hobby SaaS, tabletop and world-building tools, note/grimoire apps, pagan/witchcraft apps) — their structures and price points; published evidence on reception of per-seat vs per-user and of free tiers; willingness-to-pay evidence for hobby/spiritual-practice communities; ratios: members per group, groups per member, active fraction, conversion free→paid; churn norms. **Solo practitioners**: demand and price points for people who want the site for themselves alone (solo tiers of group products, note and grimoire apps, journaling apps), so every model shows a **solo rung** as a one-seat coven; and, separately, what a **true personal workspace** would cost — the research states what comparables do with personal-vs-team spaces, and the record costs what reintroducing a personal `kind` would change in this schema (CLAUDE.md "There are no personal workspaces": no `kind` column, every coven takes members and can be deleted) and flags it as a DESIGN.md change for the owner to accept or refuse, never makes it. Produces the draft of `subscription-models.md`'s evidence sections.
- **Lane F — payment processor**: Stripe is the owner's familiar option, not a decision. Compare Stripe (Billing + Tax), Paddle, Lemon Squeezy, Polar, Braintree/PayPal, Chargebee-over-a-gateway and any other current candidate on: fees per transaction and per subscription, who is merchant of record and so who files WA and foreign sales tax, dispute fees, payout timing, what data they hold and their data-control terms against the Code of Ethics, whether a server-side-only integration is possible (no required browser script beyond the checkout page itself), webhook and test-mode support, per-seat and coupon support for the proposed models, and a Better Auth plugin or an SDK for each. Output: a comparison table and a recommendation; `subscription-models.md`'s fee and tax columns are computed for the top two.
- **Lane D — labour and tax**: WA senior full-stack contractor rate (published surveys), employer payroll load in WA (FICA, FUTA, WA unemployment, WA PFML, WA Cares, L&I) and benefits load (BLS ECEC), B&O rate for services, WA sales tax on digital automated services, maintenance-hours norms for a small SaaS (patching, dependency updates, incident response), incident-response norms.
- **Lane E — measurement, repo-local, no web**: seed a local database (`SEED_SCENARIO` standard + demo), measure `pg_total_relation_size` per table and rows per table, derive bytes per account / per coven / per spell / per ingredient; count invocations per browsing session from DESIGN §4's figure and one measured page load if cheap; mails per account per month from the mail list; CI minutes per gate run from `runner-budget.md`. Uses its own database name ([[project_shared_dev_database]]); runs no test suite.

###### Assembly (one Fable writer agent, after the lanes; `SendMessage` follow-ons, not fresh agents)

Writes `running-costs.md`, `subscription-models.md`, `INDEX.md` from the five lane files; every figure keeps its link; totals computed with `node -e` from an inputs table in the doc so they are reproducible; commits each doc as it lands ([[feedback_commit_as_you_go]]).

###### Owner's choice

Main session reads the two docs, then `AskUserQuestion` (plus `PushNotification`): the payment processor, the model, the free tier, the pause rule, the discount definition — each with the research's recommendation first. The PoC task's brief, the data model and every minted task are written for the processor the owner picks; "Stripe" below reads as "the chosen processor".

###### Record and minting (writer agent, same context)

Writes the decision record, the `m17.md` entry (M17.1 corrected and re-estimated), `wave-17.md`, the Wave 21 files (`m21.md`, `wave-21.md`, `TASKS.md` row, `tasks-md.mjs` entry) and creates the milestone, then DESIGN §13/§14/§15 and `backlog.md`; appends this plan to the record; runs `node scripts/task-board.mjs sync` from the worktree, then `estimate` per new task; comments progress on #1356 (names only, no values).

##### Verification

Prose-only diff ([[feedback_skip_tests_doc_only]]):

- `cd /home/node/worktrees/m17.1 && npm run format:check > .reports/format.log; echo exit $?; tail -5 .reports/format.log`
- `npm run lint` the same way (markdown-lint is in `checks.yml`'s lint job — confirm which linter covers `claude-docs/`).
- `git diff --stat origin/staging` shows only `claude-docs/**`, `documents/` untouched, no `src/`, no `package*.json`.
- `node scripts/task-board.mjs find M21.<n>` for each minted id returns one match, each on the Wave 21 milestone; `reorder` dry-run (never `--apply` from this worktree — [[feedback_reorder_from_staging_rows]]) shows the row; `node scripts/tasks-md.mjs` (whatever its check mode is) passes.
- Every link in the three billing docs resolves (a `node -e` fetch loop over the `](http` links, HEAD requests, report non-200s).
- Owner reads the record and the two docs before `/create-pr`; no PR is opened unasked ([[feedback_no_pr_unless_asked]]).

##### Re-estimate

Proposed: 22h (lanes ~9h of agent work including the processor comparison, assembly ~4h, choice and record ~5h with the test plan, minting and docs ~4h). Corrected in `m17.md` and on the board with `estimate`; the owner may change it.

##### Not in this task

No billing code, no dependency, no `src/` change, no Stripe account work beyond naming the env var, no privacy-policy edit, no survey sent. The PoC runs in its own task once a Stripe test key exists.

## The closed-practice warning

A closed practice is a people's or a religion's practice that its own people say outsiders should not take up. The compendium will warn on an entry drawn from one. This record sets which sources may establish a closed practice, how an entry records it, what the warning shows and who sets it, and the build tasks. It also records the owner's answer to each closed-practice question left open in `compendium/ethics/` by M14.29. The owner made every decision here on 2026-11-06. The approved plan is `m17.2-plan.md`, beside this file; it is not maintained, and this record is.

M17.2 is a docs-and-data task. It changes no code under `src/`. A second record from the same task, `m17.2-no-controlled-substances.md`, removes the controlled substances from the compendium.

### The data today

M14.29 gathered closed-practice statements into `compendium/ethics/`, a folder the seed never reads (`claude-docs/compendium/compendium-seed/README.md`, "Conservation and closed-practice files"). No column in the database records a tradition or a closed practice yet. After the owner's answers, two entries carry a closed-practice mark:

| Entry                                            | Kind               | People named                                                | Source                                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| White sage, `botanical/white-sage-salvia-apiana` | `asked-not-to-use` | The Indigenous peoples of California and the wider Americas | High Country News (`hcn-sage-advice`)                                                                                                                                                                  |
| Peyote, `botanical/peyote-lophophora-williamsii` | `closed`           | The Native American Church and the Wixárika                 | The National Council of Native American Churches (`ict-ncnac-2016`, `narf-ncnac-2016`), and the Indigenous Peyote Conservation Initiative (`chacruna-ipci-open-letter-2021`, `ipci-public-statements`) |

Stacte (`unknown/stacte`) carried the only row M14.29 recorded, from Wikipedia alone. The owner's answer removes it (below).

Peyote's entry leaves the compendium under M19.1, because peyote is a controlled substance (`m17.2-no-controlled-substances.md`). Its mark is recorded in its ethics file as the finding, and is seeded for no entry.

Each file's source handles are files in `compendium/ethics/sources/`.

### Who may say a practice is closed

The people themselves. The United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP) says so in three articles:

- Article 11(1): "Indigenous peoples have the right to practise and revitalize their cultural traditions and customs."
- Article 12(1): "Indigenous peoples have the right to manifest, practise, develop and teach their spiritual and religious traditions, customs and ceremonies", including "the right to the use and control of their ceremonial objects".
- Article 31(1): "Indigenous peoples have the right to maintain, control, protect and develop their cultural heritage, traditional knowledge and traditional cultural expressions".

The model of a people's own statement is the Lakota Summit V "Declaration of War Against Exploiters of Lakota Spirituality", passed on 10 June 1993 at "an international gathering of US and Canadian Lakota, Dakota and Nakota Nations" of "about 500 representatives from 40 different tribes and bands of the Lakota". Its operative clause: "We hereby and henceforth declare war against all persons who persist in exploiting, abusing, and misrepresenting the sacred traditions and spiritual practices of the Lakota, Dakota and Nakota people." That is the wording of the People's Paths copy. The sterneck.net copy reads "abusing and misrepresenting" and "of our Lakota, Dakota and Nakota people". The original on aics.org could not be opened (a TLS error).

So a closed practice is never inferred from a tradition's name (M14.29's rule stands), and a summary of what a people want is not the people saying it.

#### The five rules

1. **`closed` needs the people's own representative body.** A tribal government, an intertribal council, a nation's summit, or the religious body itself, such as the National Council of Native American Churches. Nothing else establishes the `closed` kind.
2. **`asked-not-to-use` needs a documented request by members of the people, in their own words, that others not use the ingredient, or that it not be sold or bought.** Their own organisation may carry it, or a reputable outlet that names them, as High Country News names its Tongva and Chumash voices. A request not to sell or buy counts by the owner's call of 2026-11-06, made because the sources for white sage ask that it not be sold or bought, not that it not be used.
3. **Academic ethnography may establish a restriction inside a community.** It establishes closure to outsiders only when it says so. Yopo is the example: a restriction to Piaroa shamans is not a rule about outsiders.
4. **Wikipedia alone may point to the statement, and the record cites the statement it summarises.** It suffices on its own only when it quotes the people's own statement and that statement cannot be reached; the file then stays `needs-review`. The reason: a summary is not the people speaking, any editor may change it, and it can shift a rule's scope. Stacte is the example: Wikipedia's sentence is about the compound Temple incense, and M14.29 read it as a rule about stacte alone.
5. **A legal restriction is never a closed practice.** The federal exemption for the Native American Church's use of peyote (21 CFR 1307.31) is law, not the people's statement, and law about an ingredient goes to M17.3, the ethical warnings on ingredients.

### How an entry records the tradition of its lore

The Code of Ethics (`documents/code-of-ethics.md`, line 54) says the compendium names a source for each piece of lore but not yet the tradition it comes from. The fix is a nullable `tradition_id` on `reference_links`, the table that links a source to the row it supports, pointing at `deity_traditions`. A curator picks the tradition in the source panel, and the entry's references list shows it. M19.9 adds the column and M19.10 the pick and the display, updating line 54 of the Code of Ethics in the same PR.

### The data model

The vocabulary of traditions already exists: `deity_traditions`, "a people or a religion", which groups the deity vocabulary and is already a target of `reference_links`. The mark is keyed to it:

- **`ingredient_closed_practices`** (M19.4): `id`, `ingredient_id`, `tradition_id` (to `deity_traditions`), `kind`, `statement` (text), `seed_key`, and the audit columns. A partial unique index on (`ingredient_id`, `tradition_id`) allows one mark per tradition on an entry.
- **`kind`** is an enum of two values: `closed` and `asked-not-to-use`, set by rules 1 and 2 above.
- **Sources.** `reference_links.ingredient_closed_practice_id` makes a mark the seventh kind of row a source can support, so each mark cites its statement. The check that a link names exactly one row, `reference_links_one_row`, widens to count it.
- **On screen** the traditions vocabulary is called "Traditions", the vocabulary of peoples and religions (M19.3). The table keeps its name.

In `compendium/ethics/`, each `closedPractice` item gains a `kind` key with the same two values (`claude-docs/compendium/compendium-seed/README.md`, the ethics-file field table).

### What the warning shows, and who sets it

**Who.** A curator or a keeper may set, change and clear a mark, through the check every compendium change uses, `assertCurator` (M19.5). The statement is length-limited and, by rule, never describes the ceremony.

**What it shows** (M19.6):

- On the entry page, a warning notice under the badges, titled by its kind, naming the people, giving their statement and its sources, and linking to the help page.
- On each compendium card, a "Closed Practice" mark beside the entry's other marks, and a filter facet on the compendium list.
- M19.6 also edits the Code of Ethics lines 13, 54 and 55, which say the warning is planned. It restores the promise that an entry from a closed practice says so, names the people and does not describe the ceremony, and a keeper republishes the document.

**The help pages** (M19.8) are help articles in MB.175's system, not a legal document: one general article, `/help/closed-practices`, and one sub page per marked practice, `/help/closed-practices/<practice>`, each written in the people's own words with its sources. A sub page needs a parent article, which MB.175's entry gained on 2026-11-06. Until MB.175's build tasks land, the notice links the Code of Ethics section "Closed Practices and Where Lore Comes From".

**The seed** (M19.7) reads one file per marked entry from `compendium/closed-practices/`, with a `seedKey`, and copies the sources into `compendium/sources/`. It never revives a mark a curator cleared. Under the controlled-substances rule only white sage is seeded.

### The owner's answers, file by file

Every file below is `approved`. Each answer is written into its file under `questions`, as "Answered by the owner 2026-11-06: …", the pattern costus's file uses.

| Entry             | What the sources say                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Answer                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| White sage        | No tribal government or religious body says the plant is closed. High Country News, "Sage advice" by Taylar Dawn Stagner (Arapaho and Shoshone), 1 October 2020, quotes Weshoyot Alvitre (Tongva): "I have a firm stance in regards to medicinal plants that they are not to be sold: period." The author writes: "The burning of California white sage, especially, has become an accepted form of cultural appropriation." Wikipedia's "Salvia apiana", section Conservation, says "many Native Americans have asked non-Natives to refrain from the usage of white sage." That sentence cites no source, and no source found carries a named member asking that white sage not be used: the named voices ask that it not be sold or bought.                                                                                                                                                                                                                                                                                             | Mark it `asked-not-to-use`, naming the Indigenous peoples of California and the wider Americas, whose ceremony smudging is. It qualifies under rule 2 as a request not to sell or buy white sage. |
| Peyote            | The National Council of Native American Churches' statement of 13 February 2016, signed by the presidents of the Native American Church of North America, Azzee' Bee Nahagha of Dine Nation, and the Native American Churches of Oklahoma and South Dakota, and by the Consejo Regional Wixarika: "We oppose the attempts of non-Natives to come in and misuse government protection of traditional Native American religion to conduct illegal activity that has nothing to do with our traditional ways." and "We reject the attempts to grasp onto our indigenous ways and deceive the public by claiming them as their own for their own personal enjoyment or for profit." (ICT, 19 February 2016). NARF's report: "The only plant that serves as a sacrament is Peyote, and without Peyote, indigenous Native American Church ceremonies cannot take place." The 2021 open letter of the Indigenous Peyote Conservation Initiative says the council and the initiative "ask that Peyote not be decriminalized" (Chacruna's reprint). | Mark it `closed`, naming the Native American Church and the Wixárika. The legal restriction goes to M17.3. The entry itself leaves under M19.1, so the mark is seeded for no entry.               |
| Stacte and onycha | Exodus 30:37 forbids making the incense "in the same proportions for yourselves". The Talmud, Keritot 6a: "One who blends the incense in order to teach himself how to prepare it or in order to transfer it to the community is exempt from liability." Maimonides makes liability turn on incense prepared "from these eleven spices according to these proportions". Wikipedia's "Incense offering in rabbinic literature" says that burning incense "by making use of part of the same components" to scent clothing or a house "was permitted in Judaism". The Temple Institute forbids preparing the Ketoret for any use outside the Temple and says nothing of one spice. No source restricts a single ingredient.                                                                                                                                                                                                                                                                                                                  | No mark on either. Stacte's row is removed. The rule binds Jews and restricts the compound in its proportions; it is not a people's claim against outsiders.                                      |
| Yopo              | Rodd and Sumabila (2011) compare Piaroa and Cuiva yopo use. By the summary of their abstract, Piaroa use is restricted to trained shamans inside the community, and the article says nothing of outsiders. The article refused the fetch, so this rests on the summary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | No mark (rule 3).                                                                                                                                                                                 |
| Cowrie shell      | The Canadian Encyclopedia's "Midewiwin" says that while the society "is a structured society with various classes of leaders, it does offer services to the public", and that colonials may have called it secretive "because they did not understand the society's practices or because they were not welcome at Midewiwin ceremonies". Migiis shells are sacred, "used in the healing practices and ceremonies of the Midewiwin", and not said to be restricted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | No mark.                                                                                                                                                                                          |
| Lava stone        | Hawaiʻi Volcanoes National Park makes taking lava from the park illegal; its Pele page says it is customary to ask Pele's permission. A sourcing rule and a custom, not a closure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | No mark. The park rule passes to M17.3 as a sourcing concern.                                                                                                                                     |
| Strychnos icaja   | Samorini, initiated into the Ndea Narizanga sect of Bwiti in 1993, writes that "Some White men, mostly French permanently living in Gabon, made themselves initiate in other Bwitist sects, particularly in Dissumba, the most widespread sect", and that the Fang "consider Bwiti a universal religion, hence approachable by anyone who seriously intends to join it". He adds that among the Pygmy population the traditional use of iboga "is still considered and kept secret", and that initiates may not tell the details of the rite. Neither restriction names Strychnos icaja.                                                                                                                                                                                                                                                                                                                                                                                                                                                   | No mark.                                                                                                                                                                                          |

### The build tasks, Wave 19

The build went to a new wave, **Wave 19 — Compendium ethics**, on the owner's call of 2026-11-06, not to Wave 17 as M17.2's entry first said. The reasons: the build is ten tasks with a trigger of its own (M17.2 done), the size of Wave 18, and Wave 17 is a holding wave for scoping and audits. The tasks are in `claude-docs/tasks/m19.md` and the wave in `claude-docs/waves/wave-19.md`. The wave runs after Wave 18 in board order. M19.1 and M19.2 come first, because removing the controlled substances is the owner's priority.

| Order  | Task                                                                                              | Depends on                      |
| ------ | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| M19.1  | Remove the entries unlawful to grow, and the alcohol, cannabis and tobacco entries, from the seed | —                               |
| M19.2  | Retire the removed entries from seeded databases                                                  | M19.1                           |
| M19.3  | Call the deity traditions "Traditions" on screen, as the vocabulary of peoples and religions      | —                               |
| M19.4  | The `ingredient_closed_practices` table                                                           | M19.3                           |
| M19.5  | A curator sets, changes and clears an entry's closed-practice mark                                | M19.4                           |
| M19.6  | The warning shows on the entry page and the compendium list, and the Code of Ethics says so       | M19.5                           |
| M19.7  | Seed the closed-practice marks from `compendium/closed-practices/`                                | M19.5                           |
| M19.8  | Help pages on closed practices: one general, one per marked practice                              | M19.6, and MB.175's build tasks |
| M19.9  | The `reference_links.tradition_id` column                                                         | M19.3                           |
| M19.10 | A citation says which tradition its lore comes from                                               | M19.9                           |

M19.4 is the table task ahead of the behaviour task M19.5, as the table-then-behaviour rule asks. M19.9 and M19.10 need only M19.3 and may run beside the warning. M17.3's ethical warnings may join this wave when M17.3 runs; that is M17.3's decision.

### Sources

Every page below was opened on 2026-11-06 unless the entry says otherwise.

- United Nations General Assembly. _United Nations Declaration on the Rights of Indigenous Peoples_. Resolution 61/295, adopted 13 September 2007. Articles 11(1), 12(1) and 31(1), pp. 11–12 and 22–23. https://www.un.org/development/desa/indigenouspeoples/wp-content/uploads/sites/19/2018/11/UNDRIP_E_web.pdf. Article 31 is also reprinted in Vancouver Community College, "Copyright Policy 510, Appendix A", https://www.vcc.ca/media/vancouver-community-college/content-assets/documents/policies/appendices/510-Appendix-A-UNDRIP-Article-31.pdf, whose wording matches.
- Lakota Summit V. "Declaration of War Against Exploiters of Lakota Spirituality." 10 June 1993. The People's Paths, http://www.thepeoplespaths.net/articles/ladecwar.htm; also sterneck.net, http://www.sterneck.net/ritual/lakota-spirituality/index.php. The original at aics.org was not opened (TLS error at research).
- Stagner, Taylar Dawn. "Sage Advice." _High Country News_, 1 October 2020. https://www.hcn.org/issues/52-10/indigenous-affairs-sage-advice/.
- "Salvia apiana." Wikipedia. https://en.wikipedia.org/w/index.php?title=Salvia_apiana&oldid=1354530232.
- Native American Churches. "National Council Does Not Condone Faux Native American Churches or Marijuana Use." _ICT (Indian Country Today)_, 19 February 2016. https://ictnews.org/archive/national-council-does-not-condone-faux-native-american-churches-or-marijuana-use/.
- Native American Rights Fund. "National Council of Native American Churches Speak Out Against Illegitimate Organizations." 25 February 2016. https://narf.org/national-council-of-native-american-churches-speak-out-against-illegitimate-organizations/.
- Indigenous Peyote Conservation Initiative. "Public Statements." https://www.ipci.life/media-and-public-statements. It lists the council's and the initiative's statement of 20 February 2020 on decriminalisation ordinances, and the open letter under 19 May 2021.
- Indigenous Peyote Conservation Initiative. "Open Letter to the Psychedelic Movement Regarding Peyote in Policy Efforts and How to be an Ally to Indigenous Peoples of North America." Chacruna, 10 May 2021. https://chacruna.net/ipci_open_letter_psychedelic_movement_peyote_decriminalization/.
- "Exodus 30." _The JPS Tanakh: Gender-Sensitive Edition_. Sefaria. https://www.sefaria.org/Exodus.30.34?lang=bi.
- Farber, Michelle. "Keritot 6." Hadran, 27 August 2019. https://hadran.org.il/daf/keritot-6/.
- Maimonides. _Mishneh Torah_, Vessels of the Sanctuary and Those who Serve Therein, chapter 2, halachot 8–10. Translated by Eliyahu Touger. Sefaria. https://www.sefaria.org/Mishneh_Torah%2C_Vessels_of_the_Sanctuary_and_Those_who_Serve_Therein.2?lang=bi.
- "Incense offering in rabbinic literature." Wikipedia. https://en.wikipedia.org/w/index.php?title=Incense_offering_in_rabbinic_literature&oldid=1374047559.
- Temple Institute. "Temple Incense." https://templeinstitute.org/temple-incense/.
- Rodd, Robin, and Arelis Sumabila. "Yopo, Ethnicity and Social Change: A Comparative Analysis of Piaroa and Cuiva Yopo Use." _Journal of Psychoactive Drugs_ 43, no. 1 (2011): 36–45. https://doi.org/10.1080/02791072.2011.566499. The publisher's page refused the fetch; not read.
- Gadacz, René R., updated by Michelle Filice. "Midewiwin." _The Canadian Encyclopedia_. Historica Canada, 7 February 2006, last edited 7 November 2016. https://www.thecanadianencyclopedia.ca/en/article/midewiwin.
- Samorini, Giorgio. "The Initiation Rite in the Bwiti Religion (Ndea Narizanga Sect, Gabon)." _Jahrbuch für Ethnomedizin_ 1997/98: 39–55. https://samorini.it/doc1/sam/sam-bwiti%20initiation.pdf.
- National Park Service. Hawaiʻi Volcanoes National Park, Superintendent's Compendium, and "Pele". Cited in `compendium/ethics/sources/` as `nps-havo-superintendents-compendium` and `nps-pele` (opened 2026-10-29 by M14.29).

## No controlled substances in the compendium

The compendium will hold no entry whose plant, fungus or substance is itself unlawful to grow or possess under United States federal law or Washington State law, and no alcohol, cannabis or tobacco. A plant that is lawful to grow stays. The owner set the rule on 2026-11-06, while M17.2 was scoped. M17.2 deletes no entry: M19.1 applies the rule and M19.2 retires what has already been seeded. The approved plan is `m17.2-plan.md`, beside this file; it is not maintained, and this record is.

### The owner's words

- "The governing body is the US Federal Government and Washington state specifically. This includes controlled substances like alcohol and cannibus. We're not going to mess with those. Individuals can add those to their personal collections."
- "I don't want to get in trouble for having that information publicly on the website."
- "We can keep plants that are legally allowable to grow."
- On tobacco: "Remove".
- On safety: "err on the side of safety. If someone can accidentally harm themselves with the ingredient because they don't have the knowledge then something should be included in the warning."

### The rule

1. **Removed:** an entry whose plant, fungus or substance is itself unlawful to grow or possess under US federal law or Washington State law.
2. **Removed:** every alcoholic drink, cannabis and tobacco, by the owner's naming them, whatever their legal status. Washington State's Liquor and Cannabis Board enforces "liquor, cannabis, tobacco, and vapor laws".
3. **Kept:** a plant that is lawful to grow, even where a preparation of it would be a controlled substance.
4. **A coven may still add any of these as its own ingredient.** The rule is about what the site publishes, not what a coven keeps.

**Why.** The owner's caution about carrying that information on a public site, in their words above.

**The law does not require this.** As this task understands it, and this is not legal advice: the Controlled Substances Act controls possession, manufacture and supply, not description. A page that describes a plant breaks none of those. So the rule is the owner's choice, not a requirement found in the law.

#### Err on the side of safety

A kept entry says nothing that instructs preparation or dosing. Where a source says a person without the knowledge could harm themselves with the ingredient, the entry's safety note says what the harm is. That is the owner's safety rule above, and the reason is theirs: someone who does not know the plant could hurt themselves by accident. M19.1 checks every kept candidate for both. It removes any sentence that instructs, and adds a sourced `safetyNotes` line, with `toxic` where the source says so, to a kept entry that lacks one, as the yopo and peyote entries already do.

### The jurisdiction

**United States federal law.** The Controlled Substances Act's schedules (21 U.S.C. § 812, kept current in 21 CFR Part 1308):

- 21 U.S.C. § 812(c), Schedule I(c): (10) "Marihuana" and (12) "Peyote".
- 21 U.S.C. § 812(c), Schedule II(a): (3) "Opium poppy and poppy straw." and (4) "coca leaves, except…".
- 21 CFR 1308.11(d), Schedule I hallucinogenic substances: (21) "Ibogaine", (23) "Marihuana", (26) "Peyote", (29) "Psilocybin" and (30) "Psilocyn". Peyote is defined by the plant: "Meaning all parts of the plant presently classified botanically as Lophophora williamsii Lemaire, whether growing or not".
- 21 CFR 1308.12(b), Schedule II: (3) "Opium poppy and poppy straw." and (4) "Coca leaves".

**Washington State law.** The Uniform Controlled Substances Act's Schedule I, RCW 69.50.204(c), in the certified copy of 12 July 2024: (21) Ibogaine, (25) Peyote, which the section says "interprets 21 U.S.C. Sec. 812 (c), Schedule I (c)(12)", (28) Psilocybin, (29) Psilocyn, and (30)(i) "Tetrahydrocannabinols, meaning tetrahydrocannabinols naturally contained in a plant of the genera Cannabis".

**International control is not the test.** The owner named the jurisdiction. The M17.2 research notes report that the International Narcotics Control Board holds that no plant is controlled under the 1971 Convention on Psychotropic Substances and that its 2010 report (E/INCB/2010/1, paragraph 287) recommends national control of plant material, as reported by Tupper and Labate (2012). Neither that paper nor the board's correspondence could be opened to check, so this is the notes' summary, not a quotation.

### The test, per entry

M19.1 decides each entry from its own sources, not from its file name. An entry is removed when one of these holds:

1. A source read says the plant, fungus or substance itself is named in 21 CFR Part 1308 or RCW 69.50 (peyote, marihuana, the opium poppy, coca leaves).
2. A source read says growing or possessing it is unlawful under either. A fungus that contains psilocybin is treated as the substance.
3. It is an alcoholic drink, cannabis or tobacco.

Otherwise a plant that is lawful to grow stays, whatever a preparation of it would be, under the safety rule above.

Each removal is recorded as the endangered removals were (`m14.29-no-endangered-species.md`; `compendium/ethics/endangered-removals.md`): an ethics file with the citation, the entry file and the sources only it cites deleted, and a line in `compendium/left-out.md`.

### The candidates

These come from the file names under `compendium/ingredients/`. Each is unverified until M19.1 reads the entry's sources.

**Removed under the test (10):**

| Entry                                      | Why                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `botanical/peyote-lophophora-williamsii`   | Schedule I by name, federal and Washington. Its dosing sentence goes with it. |
| `botanical/hemp-cannabis-sativa`           | Cannabis.                                                                     |
| `botanical/opium-poppy-papaver-somniferum` | Schedule II by name.                                                          |
| `botanical/coca-erythroxylum-coca`         | Schedule II by name.                                                          |
| `fungal/psilocybe-mushrooms-psilocybe`     | A fungus containing psilocybin.                                               |
| `fungal/koae-ea-lekhoaba-psilocybe-maluti` | A fungus containing psilocybin.                                               |
| `botanical/tobacco-nicotiana`              | Tobacco, the owner's call.                                                    |
| `none/whiskey`                             | Alcohol.                                                                      |
| `unknown/rum`                              | Alcohol.                                                                      |
| `unknown/palm-wine`                        | Alcohol.                                                                      |

**Kept as plants lawful to grow, pending M19.1's check:** San Pedro cactus, chacruna, yopo, iboga, ololiuqui and morning glory, _Salvia divinorum_, the ayahuasca vine, Syrian rue, kava, fly agaric, the daturas, belladonna, the henbanes, mandrake, nutmeg, areca and betel, and the ephedras. Each gets the safety check above.

**Iboga is left for M19.1.** Ibogaine is in Schedule I, federal (21 CFR 1308.11(d)(21)) and Washington (RCW 69.50.204(c)(21)); the schedule items read name the substance, not the plant _Tabernanthe iboga_. M19.1 decides from a source whether the plant itself is unlawful to grow or possess, and records why.

### Where it is written down

- `claude-docs/compendium/compendium-seed/README.md`, section "No controlled substances", beside "No endangered species".
- The Code of Ethics' sourcing section (`documents/code-of-ethics.md`) gains the rule in M19.1's PR.

### The tasks

- **M19.1 — Remove the entries unlawful to grow, and the alcohol, cannabis and tobacco entries, from the seed.** It checks each candidate against 21 CFR Part 1308 and RCW 69.50 by its sources, keeps every plant lawful to grow, gives each kept candidate a sourced safety note where a source names a harm, leaves no preparation or dosing sentence, records each removal, and updates the Code of Ethics.
- **M19.2 — Retire the removed entries from seeded databases.** A forward-only data migration on M14.30's pattern (`0090_retire-endangered-entries.sql`): it soft-deletes each entry by seed key, keeps the variants a coven holds, and later seed runs report the key as `retired`.

Both open Wave 19 — Compendium ethics (`claude-docs/waves/wave-19.md`), because the removal is the owner's priority.

### Sources

Opened on 2026-11-06.

- 21 U.S.C. § 812, Schedules of controlled substances. Legal Information Institute, Cornell Law School. https://www.law.cornell.edu/uscode/text/21/812.
- 21 CFR § 1308.11, Schedule I. Legal Information Institute. https://www.law.cornell.edu/cfr/text/21/1308.11.
- 21 CFR § 1308.12, Schedule II. Legal Information Institute. https://www.law.cornell.edu/cfr/text/21/1308.12.
- Washington State Legislature. RCW 69.50.204, Schedule I. Certified 12 July 2024. https://lawfilesext.leg.wa.gov/Law/RCWPDF/RCW%20%2069%20%20TITLE/RCW%20%2069%20.%2050%20%20CHAPTER/RCW%20%2069%20.%2050%20.204.pdf.
- Washington State Liquor and Cannabis Board. Home page. https://lcb.wa.gov/.
- Tupper, Kenneth W., and Beatriz C. Labate. "Plants, Psychoactive Substances and the International Narcotics Control Board." 2012. Not opened: the copy at https://kodu.ut.ee/~hellex/aya/kirjandus/%c3%bchiskond/Tupper%20Labate%202012%20Plants%20Psychoactive%20Substances_%20the%20INCB_HR_D.pdf refused the fetch (HTTP 403), as did Erowid's copy of the board's correspondence. Cited only through the research notes' summary.

## The ethical warnings on ingredients

The owner decided the five points below on 2026-11-06. This record says which conservation listings and animal parts raise a warning on a compendium entry, what the warning shows, who sets it, which entries the gathered data marks today, which task answers each open question, and the tasks that build it. It is the reasoning behind Wave 20 (`claude-docs/tasks/m20.md`, `claude-docs/waves/wave-20.md`). The plan it was written from is `claude-docs/design-decisions/m17.3-plan.md`.

Nothing under `src/` or `compendium/` changes in M17.3. The numbers below were counted by script from `compendium/ethics/` on 2026-11-06; the files are the source, and the lists will move as the question tasks run.

### The data today

M14.29 gathered conservation listings and animal-part statements into `compendium/ethics/`: 390 YAML files in the folders `botanical`, `fungal`, `mineral`, `zoological` and `unknown`. The seed never reads the folder. An ethics file is tied to its entry by path: its `entry:` field is the entry's path under `compendium/ingredients/` without `.md`. The field list is in `claude-docs/compendium/compendium-seed/README.md`, "Conservation and closed-practice files".

- 420 listing rows. By scheme: IUCN 314, CITES 12 (2 Appendix I, 10 Appendix II), state listings 5, NatureServe 2, and 87 under `other`, of which 25 are United Plant Savers rows and 62 are prose or national claims (10 global, 42 for one place, 10 of unknown scope).
- 15 files carry an animal part.
- 276 files are `approved` and 114 are `needs-review`. 118 questions sit in 93 of those 114 files; 21 files carry none.
- 9 entries have been removed under M14.29 and keep their ethics file. Ten more are pending removal under M19.1 of Wave 19; of those, only peyote is in the marked list below.

### What raises a warning

**A listing raises a warning when it is** an IUCN Red List assessment of Critically Endangered, Endangered, Vulnerable or Extinct in the Wild, **or** a CITES Appendix I or II listing.

Nothing else raises one: Near Threatened, Least Concern and Data Deficient ratings, national and state lists, NatureServe, United Plant Savers, and prose claims such as "thought to be endangered" do not.

The reasons:

- Each of these is a named assessment or a legal trade control that prints the entry's formal name or is mapped to it by an authority, which is the compendium's rule for a name (`CLAUDE.md`, "What the compendium says, it sources").
- The rest are either not an assessment of risk (Least Concern, Data Deficient), or too uneven to show as a warning. The 62 prose and national rows have no assessor named in the Wikipedia text they come from in most cases, and question groups D, E and F below hold exactly those rows.
- M14.29 already decided that only a global listing removes an entry. A warning is lighter than removal, so it uses the global assessments and CITES, and adds the place when the assessment is for one place.

A place-scoped IUCN row still raises a warning, and the notice names the place. Two live entries have one: mandrake (Endangered, Europe) and tree-turmeric (Critically Endangered in India, Vulnerable in Vietnam).

A CITES row that covers only some populations or part of the trade keeps its limit in the quoted statement: African ginger (populations of Eswatini, Mozambique, South Africa and Zimbabwe) and Asian ginseng (the Russian Federation population).

### Animal parts

An animal part raises a notice titled "Animal Part". It quotes the statement gathered in the entry's ethics file and gives its source, and says nothing more: the data records no field that says whether the animal was harmed, so the site does not infer it. The compendium card carries an "Animal Part" mark and the list has a filter for it.

The 15 files, all under `compendium/ethics/`, with the statement each holds:

| File                                                  | Part                     | Statement (source)                                                                                                                     | Status                  |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `mineral/pearl-pearl`                                 | pearls                   | UK pearling banned in 1998 as river mussels are endangered; many oysters or mussels are killed to find one (`wikipedia-pearl`)         | needs-review            |
| `zoological/central-african-rock-python-python-sebae` | body, blood              | Used in African traditional medicine (`wikipedia-pythonidae`)                                                                          | needs-review            |
| `zoological/grey-parrot-psittacus-erithacus`          | feathers                 | Used in shrines (`wikipedia-west-african-vodun`)                                                                                       | approved, entry removed |
| `zoological/honey-apis-mellifera`                     | honey                    | Jain prohibition on honey, a religious prohibition and not a conservation listing (`wikipedia-honey`)                                  | needs-review            |
| `zoological/maya-stingless-bee-melipona-beecheii`     | hive                     | 93% hive decline over 25 years; stingless beekeeping going extinct (`wikipedia-melipona-beecheii`)                                     | approved                |
| `zoological/murex-snail-hexaplex-trunculus`           | dye gland                | Dye from the hypobranchial gland (`wikipedia-tekhelet`)                                                                                | needs-review            |
| `zoological/red-coral-corallium`                      | skeleton                 | Shallow habitats largely depleted by harvesting (`wikipedia-precious-coral`)                                                           | needs-review            |
| `zoological/seahorse-hippocampus`                     | whole animal             | Populations thought endangered by overfishing; used in traditional Chinese medicine (`wikipedia-seahorse`)                             | needs-review            |
| `unknown/black-coral`                                 | skeleton                 | Poaching and a black market (`wikipedia-black-coral`)                                                                                  | approved                |
| `unknown/donkey-hide-gelatin`                         | hide                     | 2.3 to 4.8 million donkeys slaughtered a year for ejiao; seven countries ban donkey exports to China (`wikipedia-donkey-hide-gelatin`) | approved                |
| `unknown/hyraceum`                                    | petrified urine and dung | Animals not harmed in harvesting; an ethical substitute for musk (`wikipedia-hyraceum`)                                                | needs-review            |
| `unknown/musk`                                        | gland                    | The musk deer is killed by traps (`wikipedia-musk`)                                                                                    | needs-review            |
| `unknown/onycha`                                      | operculum                | A sea-snail operculum is one candidate identity (`wikipedia-onycha`)                                                                   | approved                |
| `unknown/sea-cucumber`                                | whole animal             | Overfishing; India banned harvest under Schedule I of its Wildlife Protection Act in 2001 (`wikipedia-sea-cucumber`)                   | approved                |
| `unknown/shilajit`                                    | coprolites               | Coprolitic types are semi-fossilised animal faeces (`wikipedia-shilajit`)                                                              | needs-review            |

The statements differ in kind (killed for the part, depleted, avoided on religious grounds, harmless, identity uncertain), which is why the notice only quotes. Question group H (M20.8) asks whether honey, shilajit, musk, human mummia and sacred ash count as animal parts at all.

### Exceptions for Indigenous peoples' religious and cultural use

The warning row has a nullable exception statement, a short quoted line saying what the law or the listing allows for Indigenous peoples' religious and cultural use, with its own sources. The entry-page notice shows it under the warning. A curator or keeper writes it.

What the data holds today: no exception. A search of every ethics file and source for "eagle" finds nothing. The one legal exemption in the files is a question in `compendium/ethics/botanical/peyote-lophophora-williamsii.yaml`: US law (the American Indian Religious Freedom Act as amended in 1994, and 21 CFR 1307.31) exempts bona fide Native American Church ceremonial use, and _United States v. Boyll_ extended it to all persons in traditional Indian religious use. Peyote leaves the compendium under M19.1, so it will carry no warning. The only other statement of an exception is in the Code of Ethics (`documents/code-of-ethics.md`, "Ethical and Sustainable Sourcing", "Animal parts"), which names the US National Eagle Repository. The build leaves the field empty on every seeded row; a curator fills it where a source supports it. The seed does not invent one.

An exception is a legal fact. It is never a closed-practice mark (see `m17.2-closed-practice-warning.md`), and the field does not say a practice is closed.

### The data model

The shape follows `ingredient_closed_practices` in `m17.2-closed-practice-warning.md`: one table, sources through `reference_links` as a further kind of row, and a seed keyed on `seed_key` that never revives a mark someone cleared.

- **`ingredient_ethical_warnings`** (M20.10): `id`, `ingredient_id`, `kind` (`listing` or `animal-part`), `scheme` (`iucn` or `cites`, for a listing), `category` (`cr`, `en`, `vu`, `ew`, `appendix-i` or `appendix-ii`, for a listing), `scope` (`global` or a place name, for a listing), `statement` (the quoted text), `exception_statement` (nullable), `seed_key`, and the audit columns. Checks tie `scheme`, `category` and `scope` to `kind` (set for a listing, empty for an animal part) and `category` to `scheme`. A partial unique index on `seed_key` stops the seed adding a row twice; a second partial unique index on (`ingredient_id`, `scheme`, `scope`) allows one listing per scheme and place on an entry.
- **Sources.** `reference_links.ingredient_ethical_warning_id` makes a warning another kind of row a source can support, and the `reference_links_one_row` check widens to count it. The exception has its own sources, so the link also records which part of the warning it supports (`statement` or `exception`). M19.4 widens the same check for the closed-practice table; whichever migration lands second widens the already-widened check, so M20.10 follows M19.4 only if both widen the check.
- **Scope of the warning.** It belongs to a compendium entry. A coven's own ingredient has none, as it has no ethics file.
- **Caching.** The warnings are compendium data, the same for every viewer, so they use the `compendium` cache tag and the keeper mutations revalidate it (`CLAUDE.md`, rule 6).

### What the warning shows

**On the entry page** (M20.13), a notice under the badges:

- for a listing, titled by its category and scheme, for example "Listed as Vulnerable by the IUCN Red List" or "Listed in CITES Appendix II"; it names the place when the scope is not global, quotes the statement, lists the sources, shows the exception statement when there is one, and links to the help page;
- for an animal part, titled "Animal Part", quoting the gathered statement with its source and linking to the help page.

Until the help page (M20.15) lands, the notice links the Code of Ethics section "Ethical and Sustainable Sourcing". The notice shows only facts the sources print. It never says a practice is wrong and never removes an entry; removal is M14.29's rule.

**On each compendium card and in the list** (M20.13): a "Conservation Listing" mark for an entry with a listing warning, an "Animal Part" mark for one with an animal-part warning, and a filter facet for each on the compendium list.

### Who sets it

A curator or a keeper sets, changes and clears a warning, its exception statement and their sources, through the check every compendium change uses, `assertCurator` (M20.11, M20.12). The seed (M20.14) sets the rows from the files and never revives a warning a curator cleared.

### The entries the data marks today

These are the compendium entries the threshold marks as the files stand: 33 entries, from 36 listing rows. 32 of them come from the live IUCN Critically Endangered, Endangered and Vulnerable rows and CITES Appendix I and II rows; the 33rd is the one Extinct in the Wild entry, `angels-trumpet-brugmansia`. No live entry has a CITES Appendix I listing; its two entries, costus and grey parrot, were removed by M14.29. Peyote is pending removal under M19.1, which leaves 32.

"Live" means the entry file still exists under `compendium/ingredients/`. The 9 entries M14.29 removed also hold listings that meet the threshold; they carry no warning, as they have no entry.

**The question tasks may change this list.** Ten of the 33 files are `needs-review`: African ginger, aloiampelos, Asian ginseng, desert broomrape, gastrodia, mandrake, peyote, sandalwood (Santalum album), vanilla and the Chinese caterpillar fungus. The answers to questions about them, for example whether a CITES listing of a whole genus counts, may add or drop an entry. The 22 `approved` entries rest on an assessment the file's source states.

| Entry                                                | Ethics file                                                                        | Status       | Listing                                                                                 | Scope   | Source                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- | ------- | --------------------------------------- |
| `african-ginger-siphonochilus-aethiopicus`           | `compendium/ethics/botanical/african-ginger-siphonochilus-aethiopicus.yaml`        | needs-review | CITES Appendix II (populations of Eswatini, Mozambique, South Africa and Zimbabwe only) | global  | `cites-appendices`                      |
| `aloiampelos-commixta-aloiampelos-commixta`          | `compendium/ethics/botanical/aloiampelos-commixta-aloiampelos-commixta.yaml`       | needs-review | IUCN Vulnerable (VU)                                                                    | global  | `wikipedia-aloiampelos-commixta`        |
| `american-ginseng-panax-quinquefolius`               | `compendium/ethics/botanical/american-ginseng-panax-quinquefolius.yaml`            | approved     | CITES Appendix II                                                                       | global  | `cites-appendices`                      |
| `angels-trumpet-brugmansia`                          | `compendium/ethics/botanical/angels-trumpet-brugmansia.yaml`                       | approved     | IUCN Extinct in the Wild                                                                | global  | `wikipedia-brugmansia`                  |
| `ashoka-saraca-asoca`                                | `compendium/ethics/botanical/ashoka-saraca-asoca.yaml`                             | approved     | IUCN Vulnerable                                                                         | global  | `wikipedia-saraca-asoca`                |
| `asian-ginseng-panax-ginseng`                        | `compendium/ethics/botanical/asian-ginseng-panax-ginseng.yaml`                     | needs-review | CITES Appendix II (Russian Federation population only)                                  | global  | `cites-appendices`                      |
| `bitter-kola-garcinia-kola`                          | `compendium/ethics/botanical/bitter-kola-garcinia-kola.yaml`                       | approved     | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-garcinia-kola`               |
| `borneol-camphor-dryobalanops-aromatica`             | `compendium/ethics/botanical/borneol-camphor-dryobalanops-aromatica.yaml`          | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-dryobalanops-aromatica` |
| `cedar-cedrus-libani`                                | `compendium/ethics/botanical/cedar-cedrus-libani.yaml`                             | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-cedrus-libani`          |
| `ceylon-ironwood-mesua-ferrea`                       | `compendium/ethics/botanical/ceylon-ironwood-mesua-ferrea.yaml`                    | approved     | IUCN Vulnerable                                                                         | global  | `wikipedia-mesua-ferrea`                |
| `cinnamon-cinnamomum-verum`                          | `compendium/ethics/botanical/cinnamon-cinnamomum-verum.yaml`                       | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-cinnamomum-verum`       |
| `coffee-coffea-arabica`                              | `compendium/ethics/botanical/coffee-coffea-arabica.yaml`                           | approved     | IUCN Endangered                                                                         | global  | `wikipedia-coffea-arabica`              |
| `desert-broomrape-cistanche-deserticola`             | `compendium/ethics/botanical/desert-broomrape-cistanche-deserticola.yaml`          | needs-review | CITES Appendix II                                                                       | global  | `cites-appendices`                      |
| `gastrodia-gastrodia-elata`                          | `compendium/ethics/botanical/gastrodia-gastrodia-elata.yaml`                       | needs-review | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-gastrodia-elata`             |
| `goldenseal-hydrastis-canadensis`                    | `compendium/ethics/botanical/goldenseal-hydrastis-canadensis.yaml`                 | approved     | CITES Appendix II                                                                       | global  | `cites-appendices`                      |
| `goldenseal-hydrastis-canadensis`                    | `compendium/ethics/botanical/goldenseal-hydrastis-canadensis.yaml`                 | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-hydrastis-canadensis`   |
| `guggul-commiphora-wightii`                          | `compendium/ethics/botanical/guggul-commiphora-wightii.yaml`                       | approved     | CITES Appendix II                                                                       | global  | `cites-appendices`                      |
| `guggul-commiphora-wightii`                          | `compendium/ethics/botanical/guggul-commiphora-wightii.yaml`                       | approved     | IUCN CR                                                                                 | global  | `wikipedia-iucn-commiphora-wightii`     |
| `hardy-rubber-tree-eucommia-ulmoides`                | `compendium/ethics/botanical/hardy-rubber-tree-eucommia-ulmoides.yaml`             | approved     | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-eucommia-ulmoides`           |
| `horse-chestnut-aesculus-hippocastanum`              | `compendium/ethics/botanical/horse-chestnut-aesculus-hippocastanum.yaml`           | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-aesculus-hippocastanum` |
| `houpu-magnolia-magnolia-officinalis`                | `compendium/ethics/botanical/houpu-magnolia-magnolia-officinalis.yaml`             | approved     | IUCN Endangered (IUCN 3.1)                                                              | global  | `wikipedia-magnolia-officinalis`        |
| `indian-snakeroot-rauvolfia-serpentina`              | `compendium/ethics/botanical/indian-snakeroot-rauvolfia-serpentina.yaml`           | approved     | CITES Appendix II                                                                       | global  | `cites-appendices`                      |
| `mandrake-mandragora-officinarum`                    | `compendium/ethics/botanical/mandrake-mandragora-officinarum.yaml`                 | needs-review | IUCN EN                                                                                 | Europe  | `wikipedia-iucn-mandragora-officinarum` |
| `ohia-lehua-metrosideros-polymorpha`                 | `compendium/ethics/botanical/ohia-lehua-metrosideros-polymorpha.yaml`              | approved     | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-metrosideros-polymorpha`     |
| `opoponax-commiphora-guidottii`                      | `compendium/ethics/botanical/opoponax-commiphora-guidottii.yaml`                   | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-commiphora-guidottii`   |
| `pellitory-anacyclus-pyrethrum`                      | `compendium/ethics/botanical/pellitory-anacyclus-pyrethrum.yaml`                   | approved     | IUCN VU                                                                                 | global  | `wikipedia-iucn-anacyclus-pyrethrum`    |
| `peyote-lophophora-williamsii`                       | `compendium/ethics/botanical/peyote-lophophora-williamsii.yaml`                    | needs-review | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-peyote`                      |
| `sandalwood-santalum-album`                          | `compendium/ethics/botanical/sandalwood-santalum-album.yaml`                       | needs-review | IUCN VU                                                                                 | global  | `wikipedia-iucn-santalum-album`         |
| `shea-vitellaria-paradoxa`                           | `compendium/ethics/botanical/shea-vitellaria-paradoxa.yaml`                        | approved     | IUCN Vulnerable (IUCN 2.3)                                                              | global  | `wikipedia-vitellaria`                  |
| `sweet-pea-lathyrus-odoratus`                        | `compendium/ethics/botanical/sweet-pea-lathyrus-odoratus.yaml`                     | approved     | IUCN CR                                                                                 | global  | `wikipedia-iucn-lathyrus-odoratus`      |
| `tree-turmeric-coscinium-fenestratum`                | `compendium/ethics/botanical/tree-turmeric-coscinium-fenestratum.yaml`             | approved     | IUCN Critically Endangered (1997, 2010, 2016)                                           | India   | `wikipedia-coscinium-fenestratum`       |
| `tree-turmeric-coscinium-fenestratum`                | `compendium/ethics/botanical/tree-turmeric-coscinium-fenestratum.yaml`             | approved     | IUCN Vulnerable (since 1997)                                                            | Vietnam | `wikipedia-coscinium-fenestratum`       |
| `vanilla-vanilla-planifolia`                         | `compendium/ethics/botanical/vanilla-vanilla-planifolia.yaml`                      | needs-review | IUCN EN                                                                                 | global  | `wikipedia-iucn-vanilla-planifolia`     |
| `western-australian-sandalwood-santalum-spicatum`    | `compendium/ethics/botanical/western-australian-sandalwood-santalum-spicatum.yaml` | approved     | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-santalum-spicatum`           |
| `white-dammar-vateria-indica`                        | `compendium/ethics/botanical/white-dammar-vateria-indica.yaml`                     | approved     | IUCN Vulnerable                                                                         | global  | `wikipedia-vateria-indica`              |
| `chinese-caterpillar-fungus-ophiocordyceps-sinensis` | `compendium/ethics/fungal/chinese-caterpillar-fungus-ophiocordyceps-sinensis.yaml` | needs-review | IUCN Vulnerable (IUCN 3.1)                                                              | global  | `wikipedia-ophiocordyceps-sinensis`     |

### The question tasks

The 114 `needs-review` files carry 118 questions in 93 of them; 21 files carry none. The owner answers the questions one at a time on a review page with a Copy Table button, as for earlier review waves. There is one task per kind of question. On 2026-11-06 the owner folded the re-review of the 22 already-decided questions (group I) and the 21 files with no question (group J) into one task, M20.9.

A file appears under every group it holds a question from, so seven files appear twice or three times: kutki, `seahorse-hippocampus` (groups C, D and E), `vanilla-vanilla-planifolia` (C and I), and clivia, iboga, swertia and hyraceum (D and E). The file counts below add to more than 114 for that reason. A file's `status` becomes `approved` only when no question of it is open, so the last task to answer a file's last question sets it.

| Group | Task  | Kind of question                                                | Questions | Files |
| ----- | ----- | --------------------------------------------------------------- | --------- | ----- |
| A     | M20.1 | A Wikipedia rating whose assessment was not identified or found | 25        | 25    |
| B     | M20.2 | The assessment is of another name, taxon, variety or genus page | 10        | 10    |
| C     | M20.3 | A CITES listing wider or narrower than the entry                | 25        | 24    |
| D     | M20.4 | A prose claim with no assessor named                            | 18        | 18    |
| E     | M20.5 | A prose status whose scope is unknown                           | 7         | 7     |
| F     | M20.6 | A listing scoped to Hawaii                                      | 2         | 2     |
| G     | M20.7 | A United Plant Savers genus-level listing                       | 4         | 4     |
| H     | M20.8 | Whether something counts as an animal part                      | 5         | 5     |
| I     | M20.9 | Re-review of the 22 questions already decided                   | 22        | 7     |
| J     | M20.9 | The files with no question: approve each, or give it one        | 0         | 21    |

Group H covers honey, mumia, musk, sacred ash and shilajit. Group I covers peyote, vanilla, snow lotus, ferula-aucheri, African ginger, Asian ginseng and desert broomrape. Group J includes `himalayan-yew` and `indian-atees`, whose entries are already removed.

#### The files each task takes

##### M20.1, group A (25 files)

- `compendium/ethics/botanical/annual-mercury-mercurialis-annua.yaml`
- `compendium/ethics/botanical/bay-laurel-laurus-nobilis.yaml`
- `compendium/ethics/botanical/black-lovage-smyrnium-olusatrum.yaml`
- `compendium/ethics/botanical/black-mustard-rhamphospermum-nigrum.yaml`
- `compendium/ethics/botanical/butterwort-pinguicula-vulgaris.yaml`
- `compendium/ethics/botanical/cabbage-brassica-oleracea.yaml`
- `compendium/ethics/botanical/camellia-camellia-japonica.yaml`
- `compendium/ethics/botanical/caper-capparis-spinosa.yaml`
- `compendium/ethics/botanical/carrot-daucus-carota.yaml`
- `compendium/ethics/botanical/chilli-pepper-capsicum-annuum.yaml`
- `compendium/ethics/botanical/chives-allium-schoenoprasum.yaml`
- `compendium/ethics/botanical/citron-citrus-medica.yaml`
- `compendium/ethics/botanical/fig-ficus-carica.yaml`
- `compendium/ethics/botanical/holly-ilex-aquifolium.yaml`
- `compendium/ethics/botanical/lavender-lavandula-angustifolia.yaml`
- `compendium/ethics/botanical/lilac-syringa-vulgaris.yaml`
- `compendium/ethics/botanical/liquorice-glycyrrhiza-glabra.yaml`
- `compendium/ethics/botanical/oleander-nerium-oleander.yaml`
- `compendium/ethics/botanical/peony-paeonia-officinalis.yaml`
- `compendium/ethics/botanical/pistachio-pistacia-vera.yaml`
- `compendium/ethics/botanical/roman-chamomile-chamaemelum-nobile.yaml`
- `compendium/ethics/botanical/tea-camellia-sinensis.yaml`
- `compendium/ethics/botanical/violet-viola-odorata.yaml`
- `compendium/ethics/botanical/witch-hazel-hamamelis-virginiana.yaml`
- `compendium/ethics/botanical/yerba-mate-ilex-paraguariensis.yaml`

##### M20.2, group B (10 files)

- `compendium/ethics/botanical/african-violet-streptocarpus-ionanthus.yaml`
- `compendium/ethics/botanical/balsam-of-peru-myroxylon-balsamum-var-pereirae.yaml`
- `compendium/ethics/botanical/bayberry-myrica-cerifera.yaml`
- `compendium/ethics/botanical/camphor-camphora-officinarum.yaml`
- `compendium/ethics/botanical/curry-leaf-bergera-koenigii.yaml`
- `compendium/ethics/botanical/cypress-cupressus-sempervirens.yaml`
- `compendium/ethics/botanical/edelweiss-leontopodium-nivale.yaml`
- `compendium/ethics/botanical/horseradish-armoracia-rusticana.yaml`
- `compendium/ethics/botanical/pepper-fruit-dennettia-tripetala.yaml`
- `compendium/ethics/botanical/samphire-crithmum-maritimum.yaml`

##### M20.3, group C (24 files)

- `compendium/ethics/botanical/agarwood-aquilaria-malaccensis.yaml` (entry already removed)
- `compendium/ethics/botanical/aloiampelos-commixta-aloiampelos-commixta.yaml`
- `compendium/ethics/botanical/cactus-cactaceae.yaml`
- `compendium/ethics/botanical/candelabra-tree-euphorbia-candelabrum.yaml`
- `compendium/ethics/botanical/cyclamen-cyclamen.yaml`
- `compendium/ethics/botanical/gastrodia-gastrodia-elata.yaml`
- `compendium/ethics/botanical/geranium-pelargonium.yaml`
- `compendium/ethics/botanical/kutki-picrorhiza-kurroa.yaml`
- `compendium/ethics/botanical/ladys-slipper-cypripedium-parviflorum.yaml`
- `compendium/ethics/botanical/noble-dendrobium-dendrobium-nobile.yaml`
- `compendium/ethics/botanical/pau-darco-handroanthus-impetiginosus.yaml`
- `compendium/ethics/botanical/prickly-pear-opuntia.yaml`
- `compendium/ethics/botanical/rhodiola-rhodiola.yaml`
- `compendium/ethics/botanical/san-pedro-cactus-echinopsis-pachanoi.yaml`
- `compendium/ethics/botanical/senna-senna.yaml`
- `compendium/ethics/botanical/snowdrop-galanthus-nivalis.yaml`
- `compendium/ethics/botanical/spurge-euphorbia.yaml`
- `compendium/ethics/botanical/tonka-bean-dipteryx-odorata.yaml`
- `compendium/ethics/botanical/vanilla-vanilla-planifolia.yaml`
- `compendium/ethics/botanical/yucca-yucca.yaml`
- `compendium/ethics/zoological/central-african-rock-python-python-sebae.yaml`
- `compendium/ethics/zoological/red-coral-corallium.yaml`
- `compendium/ethics/zoological/seahorse-hippocampus.yaml`
- `compendium/ethics/zoological/snakeskin-serpentes.yaml`

##### M20.4, group D (18 files)

- `compendium/ethics/botanical/clivia-gardenii-clivia-gardenii.yaml`
- `compendium/ethics/botanical/egyptian-mimusops-mimusops-laurifolia.yaml`
- `compendium/ethics/botanical/fox-nut-euryale-ferox.yaml`
- `compendium/ethics/botanical/iboga-tabernanthe-iboga.yaml`
- `compendium/ethics/botanical/incense-resin-from-halmaddi-ailanthus-triphysa.yaml`
- `compendium/ethics/botanical/japanese-nutmeg-yew-torreya-nucifera.yaml`
- `compendium/ethics/botanical/kou-cordia-subcordata.yaml`
- `compendium/ethics/botanical/kutki-picrorhiza-kurroa.yaml`
- `compendium/ethics/botanical/merbau-intsia-bijuga.yaml`
- `compendium/ethics/botanical/stinking-arrach-chenopodium-vulvaria.yaml`
- `compendium/ethics/botanical/swertia-swertia.yaml`
- `compendium/ethics/botanical/syrian-oregano-origanum-syriacum.yaml`
- `compendium/ethics/botanical/water-dropwort-oenanthe-aquatica.yaml`
- `compendium/ethics/fungal/chinese-caterpillar-fungus-ophiocordyceps-sinensis.yaml`
- `compendium/ethics/fungal/lions-mane-hericium-erinaceus.yaml`
- `compendium/ethics/fungal/lungwort-lobaria-pulmonaria.yaml`
- `compendium/ethics/unknown/hyraceum.yaml`
- `compendium/ethics/zoological/seahorse-hippocampus.yaml`

##### M20.5, group E (7 files)

- `compendium/ethics/botanical/clivia-gardenii-clivia-gardenii.yaml`
- `compendium/ethics/botanical/iboga-tabernanthe-iboga.yaml`
- `compendium/ethics/botanical/kutki-picrorhiza-kurroa.yaml`
- `compendium/ethics/botanical/royal-palm-roystonea-regia.yaml`
- `compendium/ethics/botanical/swertia-swertia.yaml`
- `compendium/ethics/unknown/hyraceum.yaml`
- `compendium/ethics/zoological/seahorse-hippocampus.yaml`

##### M20.6, group F (2 files)

- `compendium/ethics/botanical/kava-piper-methysticum.yaml`
- `compendium/ethics/botanical/sandalwood-santalum-album.yaml`

##### M20.7, group G (4 files)

- `compendium/ethics/botanical/arnica-arnica-montana.yaml`
- `compendium/ethics/botanical/barberry-berberis-vulgaris.yaml`
- `compendium/ethics/botanical/eyebright-euphrasia-officinalis.yaml`
- `compendium/ethics/botanical/gentian-gentiana-lutea.yaml`

##### M20.8, group H (5 files)

- `compendium/ethics/unknown/mumia.yaml`
- `compendium/ethics/unknown/musk.yaml`
- `compendium/ethics/unknown/sacred-ash.yaml`
- `compendium/ethics/unknown/shilajit.yaml`
- `compendium/ethics/zoological/honey-apis-mellifera.yaml`

##### M20.9, group I (7 files)

- `compendium/ethics/botanical/african-ginger-siphonochilus-aethiopicus.yaml`
- `compendium/ethics/botanical/asian-ginseng-panax-ginseng.yaml`
- `compendium/ethics/botanical/desert-broomrape-cistanche-deserticola.yaml`
- `compendium/ethics/botanical/ferula-aucheri-ferula-aucheri.yaml`
- `compendium/ethics/botanical/peyote-lophophora-williamsii.yaml`
- `compendium/ethics/botanical/snow-lotus-saussurea.yaml`
- `compendium/ethics/botanical/vanilla-vanilla-planifolia.yaml`

##### M20.9, group J (21 files with no question)

- `compendium/ethics/botanical/ashwagandha-withania-somnifera.yaml`
- `compendium/ethics/botanical/chaste-tree-vitex-agnus-castus.yaml`
- `compendium/ethics/botanical/dandelion-taraxacum-officinale.yaml`
- `compendium/ethics/botanical/feverfew-tanacetum-parthenium.yaml`
- `compendium/ethics/botanical/foxglove-digitalis-purpurea.yaml`
- `compendium/ethics/botanical/himalayan-yew-taxus-wallichiana.yaml` (entry already removed)
- `compendium/ethics/botanical/hops-humulus-lupulus.yaml`
- `compendium/ethics/botanical/horehound-marrubium-vulgare.yaml`
- `compendium/ethics/botanical/indian-atees-aconitum-heterophyllum.yaml` (entry already removed)
- `compendium/ethics/botanical/ivy-hedera-helix.yaml`
- `compendium/ethics/botanical/knotgrass-polygonum-aviculare.yaml`
- `compendium/ethics/botanical/lemon-balm-melissa-officinalis.yaml`
- `compendium/ethics/botanical/mandrake-mandragora-officinarum.yaml`
- `compendium/ethics/botanical/mistletoe-viscum-album.yaml`
- `compendium/ethics/botanical/miswak-salvadora-persica.yaml`
- `compendium/ethics/botanical/oleaster-elaeagnus-angustifolia.yaml`
- `compendium/ethics/botanical/oregano-origanum-vulgare.yaml`
- `compendium/ethics/botanical/rudraksha-elaeocarpus-angustifolius.yaml`
- `compendium/ethics/botanical/sumac-rhus-coriaria.yaml`
- `compendium/ethics/mineral/pearl-pearl.yaml`
- `compendium/ethics/zoological/murex-snail-hexaplex-trunculus.yaml`

### The build tasks

| Task   | Builds                                                                                                                                                                               | Follows                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| M20.10 | The `ingredient_ethical_warnings` table, the widened `reference_links` link, and the checks and indexes                                                                              | Nothing in Wave 20; M19.4 only if both widen the `reference_links_one_row` check |
| M20.11 | The service and GraphQL: read a warning, and set, change and clear one with its sources, through `assertCurator`                                                                     | M20.10                                                                           |
| M20.12 | The curator's and keeper's controls on the entry's edit screen                                                                                                                       | M20.11                                                                           |
| M20.13 | The entry-page notice, the two card marks and their list filters, and the Code of Ethics update (below)                                                                              | M20.11, and M19.6 if it reuses that notice component                             |
| M20.14 | The seed: reads `approved` files in `compendium/ethics/`, keyed on `seed_key`, never revives a cleared mark. It writes without the services, so it does not wait on M20.11 or M20.12 | M20.10 and M20.1 to M20.9                                                        |
| M20.15 | The help page that explains the warnings, and the notice's link moved to it                                                                                                          | M20.13 and the build tasks of MB.175                                             |

M20.13 updates the Code of Ethics in the same PR: it replaces the "planned" item in "Closed Practices and Where Lore Comes From" and the IUCN and CITES paragraph in "Ethical and Sustainable Sourcing" with what the site now does.

### What I could not source

- The plan counts 32 marked entries. The files give 33 today, because the plan's count leaves out the Extinct in the Wild entry, `angels-trumpet-brugmansia`; 32 remain once peyote leaves under M19.1.
- The column names, the `kind`, `scheme` and `category` values, the part marker on `reference_links`, the two index shapes, the "Conservation Listing" mark name and the order of the build tasks are design choices of this record, not the owner's. The owner's decisions are the five points in the plan.
- No source in the files describes an Indigenous-use exception for any entry that stays in the compendium, so the exception field starts empty.

### Sources

- `claude-docs/design-decisions/m17.3-plan.md`, the owner's decisions of 2026-11-06.
- `claude-docs/design-decisions/m17.2-closed-practice-warning.md`, the table and `reference_links` model this one follows.
- `claude-docs/compendium/compendium-seed/README.md`, the ethics file fields.
- `compendium/ethics/`, counted by script on 2026-11-06.
- `documents/code-of-ethics.md`, "Closed Practices and Where Lore Comes From" and "Ethical and Sustainable Sourcing".

## Celestial body and zodiac as keeper-curated vocabularies

Live home: `claude-docs/db/astrology-vocabularies.md`.

### Decision

- **Only the celestial body (planet) and zodiac move, and as vocabularies like `form`.** The two `ingredients` columns stay `text`; the tables feed the autofill and the keeper's curation list; deleting a row rewrites no ingredient; a value off the list stays writable (`DESIGN.md` §5: a vocabulary a member writes is text).
- **`ingredient_forms` is the pattern**: text column on `ingredients`, curated table in `vocabulary`, seeded reference data run by `migrate.yml`, a suggestion field listing curated values then in-use uncurated ones, and an admin page with the uncurated to-do list. Five differences:
  1. **One tier, no group.** `src/db/seed/two-tier-vocabulary.ts` assumes a group tier, so the seed needs a flat helper over `insertMissing` (`src/db/seed/idempotent.ts`).
  2. **The tables are small (19 and 13 rows).** A trigram index still lands, since the set is keeper-extensible, but an `EXPLAIN … index scan` assertion cannot pass on a two-page table. The suggestion task asserts the `%`-plus-`SET LOCAL` shape and drops the planner assertion.
  3. **"One-click add" cannot be one click**, because `description` is NOT NULL and CHECK non-blank: the to-do list's add control opens the create form prefilled with the value and asks for a description.
  4. **Two scopes.** The member's autofill reads the compendium and the current workspace; the keeper's to-do list reads the compendium tier only, since a keeper has no access to any workspace's ingredients. The compendium-tier finder joins `TIER_SEAM` in `tests/guards/module-boundaries.test.ts`.
  5. **Order.** The model is recorded before the table transcribes it (the model-before-table rule); the tables land while empty and are inert until the seed; the suggestion field adopts the existing mechanism rather than building a second; the admin page reuses the form-vocabulary page.
- **The earlier correspondence validation stays** until a later task deletes `validation/correspondences.ts`; one task per PR means the docs task cannot delete code.

### Why

A vocabulary a member writes is text, so a column that became a foreign key would refuse values the curated list lacks.

### Rules out

- **Making `nomenclature` / `NAMELESS_KINDS` a keeper-editable table.** The CHECK `ingredients_nomenclature_declares_canonical_name` hardcodes `'none'` and `'unknown'`, and a CHECK cannot read another table, so the coupling would become a trigger; the Zod coupling rule, the local variant's `none` default, the seed fixtures' exhaustive `Record<Nomenclature, …>` and the SDL `enum Nomenclature` would all reshape. That makes the identity model's most load-bearing set editable.
- Foreign keys from `ingredients` to the new tables.

## A form's linked substitute names a form

MB.215 let any ingredient, or any variant of one, substitute for a form: a
variant's substitute could link an ingredient as a whole, with no form named.
At MB.115's review the owner asked for a variant's substitutes to "specifically
select the variant", so a form's link now names a form of the linked
ingredient. DESIGN.md §5 ("A substitute is for a form, and a form's link names
a form") and CLAUDE.md's domain invariant carry the rule; this record carries
why and what it changed.

### The rule

- **A variant's linked substitute names a form.** It links one variant of
  another ingredient (`substituteVariantId` set), never the ingredient whole.
- **A typed name needs no form.** A substitute that matches no ingredient is
  still added as a name only, as before (the owner's answer).
- **The ingredient's own list is unchanged.** It may still link an ingredient
  whole, with an optional form ("Form of X").
- **A matching form is still a ranking, not a rule.** Any form of any
  ingredient may stand in for a form; the picker lists the same form first,
  then its form group, then the rest (MB.138, M8.3).

### Why

A form is what a coven stocks and a spell names, so a substitute for a form is
read as "use this instead", and "Apricot" alone does not say whether that is
the fruit, the oil or the kernel. Naming the form makes the substitute usable
as it stands.

### Where it holds

- **The form.** A variant's Substitute Ingredients box offers each linked
  ingredient only as its forms; the "Any form" row is gone, and an ingredient
  with no form is not offered there. A variant's link with no form, left from
  older data, is refused at Save with the error beside its chip
  ([`components/ingredient-form.md`](../components/ingredient-form.md)).
- **The schema and the services.** `formLinkRules` in
  `src/modules/ingredients/validation/ingredient.ts` refuses it, so the
  compendium's and a coven's create and update refuse it too, at
  `variants.i.substitutes.j.substituteVariantId`
  ([`validation.md`](../validation.md)).
- **Copy From Ingredient.** A variant's copy links the same form on each
  substitute, or skips one in no matching form and names it beside Copy
  Anyway, which adds the skipped ones as names only (the owner's calls).
- **The seed's guard.** `checkSubstitutes` in
  `src/db/seed/compendium/guard.ts` refuses a variant's link with no form,
  so a shard cannot seed one. The one seeded before the rule, Almond's Nut
  form linking Apricot whole, now names Apricot's Seed form, the kernel inside
  the stone (the owner's call).
- **Not the database.** No constraint enforces it: the seed writes raw, and
  the rule holds in the guard and the service. A CHECK across the variant and
  the substitute's form would be its own task.

## Categories are picked from the lists' box, not a wall of chips

**Decided (2026-10-07):** the ingredient form's categories are picked from the same box as its deities — one `Combobox`, the picks as chips inside the control, each in its group's colour — rather than from a wall of toggle chips grouped under collapsible headings. This amends DESIGN.md §6's sentence on the chip selector, its §14 row for the form, and MB.126's description and second and third criteria. The working summary is [`../components/category-picker.md`](../components/category-picker.md).

### What the question was

MB.126 was written as DESIGN.md §6 and story 30 read it: "grouped chips", collapsing into sections so that 63 categories are usable on a phone. That was built — a disclosure heading per group, the chips beneath in their group's colour, a picked chip filled, the owner's later ask of a checkbox on each — and reviewed in the workshop. The owner did not like the design, and asked what else is done. Five patterns were compared: a grouped multi-select box with the picks as chips in it, the same chips with no accordion and a filter box, the picks shown with a searchable popover to add, checkbox groups, and tabs per group.

### Why the box

The owner's call: the same controls and chip styling as the deities field, with the colours. The form already offers every other list this way, so a member learns one control; the box narrows 63 categories by typing, which the accordion could not; the list's headings keep the groups; and the picks sit inside the control as every other list's entries do, so the form reads as one thing. `ComboboxMultiSelect`, the elements' select-only box, was the other candidate, but it takes no text, and narrowing is the point.

What it rules out: nothing typed is a category, so the box has no Add and no "Use what you typed" row, and Enter with nothing highlighted adds only the one category the text names whole. The picks' order is the order picked, as the ids are sent.

### Three calls made with it

- **The `categories` query returns them in the picker's order**: by the
  group's name, then the category's, then id — "at least they should get
  returned that way" — so `findCategoryPage` and its count join the groups
  for the name and key on it. The admin list reads the same service, so it
  lists by group too.
- **An entry's tooltip names its group**, since the colour alone cannot: the
  name with the group in brackets, as a picked deity reads with its
  tradition, then the description. The chip itself reads the bare name.
- **An entry's tooltip may run wider than its chip**, and past the control:
  as wide as its words up to InfoTip's measure, shifted left as it opens by
  however far it would run off the screen, where it was capped at the chip's
  own width. "They don't have to align on the left edge or fit within the
  input. They can go over as long as they're not getting cut off." That is
  the Combobox entry's, so every list's tooltips widen.

### What it cost

Two additions to the shared `Combobox`, both backwards compatible: a `heading` on an option, which buckets the rows under arbitrary headings in first-seen order where only "From Compendium" and "From Coven" existed, and a `colors` pair on `ComboboxEntry`, which fills the chip solid in its group's colour under the solid-fill rule. Story 30 still reads "grouped chips": the groups head the list, and the picks are chips.

M8.11's filter reuses the picker as before, so its criterion that "each group collapses" no longer describes the component. That is M8.11's to settle when it is built: a filter's picks in a box above the results is the usual shape, and the list's headings are its groups.

## A closed set wears the combobox

**Decided:** a closed enum's field is the combobox's select-only box,
`ComboboxSelect`, on Downshift's `useSelect`, not a native `<select>`. It has
the suggesting fields' control, chevron and list, with nothing to type. This
corrects DESIGN.md §14's "Closed enums … are native `<select>`s". It is the
owner's call, made while MB.131 put lookups on the form's four remaining list
boxes.

### Why

By MB.131, every other field on `IngredientForm` but the plain text fields was
the `Combobox`: the form, and all six lists. The two closed sets were the only
controls drawing a different box with a different menu, the browser's own,
which no token reaches. The owner asked for the classification to look like
the form field, "obviously not typable".

### What it costs

- **A second hook, from the same library.** `useSelect` is Downshift's
  select-only combobox, the ARIA 1.2 pattern. It owns the keyboard, typeahead
  included, as `useCombobox` does for the typed box. Nothing is installed.
- **The control is a `div`, not a form control.** A `<label htmlFor>` does not
  label it, so it is labelled through `aria-labelledby`, and it carries
  `aria-required` and `aria-invalid` itself. react-hook-form holds it through
  `useController` rather than `register`, with `deps` in the controller's
  rules, so the field still revalidates the field it is coupled to.
- **No native picker on a phone.** The list is ours on every device. The sets
  are seven choices at most, so the list fits on one screen.

### What it changed

- DESIGN.md §14 (the form-library row).
- `claude-docs/components/combobox.md`, "The select-only box", and
  `ingredient-form.md`, where the closed sets are described.
- `SelectField` in `src/components/IngredientForm/fields.tsx`, and the
  component test's `choose`, which opens the box and clicks the choice.

## The admin deity pages: the slug, the tradition's delete, one form

MB.132 puts the deity vocabulary and its traditions on the forms' and form
groups' page shapes ([`m5.6a-admin-forms.md`](m5.6a-admin-forms.md),
[`m5.6b-admin-groups.md`](m5.6b-admin-groups.md)) and builds MB.162's delete
and rename rules for deities, on the pick since MB.167
([`mb.162-compendium-holds-curated-values.md`](mb.162-compendium-holds-curated-values.md),
[`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md)).
The task entry left one question open, and building it raised three more.
The owner settled all four. [`db/deity-vocabulary.md`](../db/deity-vocabulary.md),
"The keeper's writes", carries the rules as built.

### A tradition with live deities

A deity is curated only while its tradition is live, so a deity left under a
deleted tradition is dropped by every read. The task entry refused a
tradition's delete while a live compendium entry picked a deity under it,
and left open what the delete does to the rest.

**Decided: the deities move to a tradition the admin picks, and the admin
confirms the move after picking**, M5.6b's two steps for form groups. The
confirmed delete moves every live deity to that tradition and soft-deletes
this one in one transaction. The moved deities stay curated, so no
compendium entry's pick is orphaned and the delete is never refused for one.
**This amends MB.162 for traditions**, as M5.6b amended it for form groups.
The refusals sit on `moveTo`: "Choose a tradition to move its N deities to",
and "Choose another live tradition to move its N deities to" for one naming
the tradition itself, a deleted tradition or nothing.

Weighed:

- _Refuse while a deity under it is picked, and soft-delete the rest with
  it._ The task entry's rule, completed. It frees the slugs, but discards
  curated rows, and a tradition of forty gods with one picked is forty edits
  before one delete.
- _Refuse while a deity under it is picked, and leave the rest in place._ One
  click, but the deities vanish from every read while still holding their
  slugs, so re-adding one by name collides with a row the admin cannot see.
  M5.6b turned this down for categories and forms.

### A deity's slug is its name and its tradition's

The seed slugged a deity by its name alone, and the slug index is global, so
a keeper could not add a Roman Hecate beside the Greek one — yet
`deities.ts` says one god honoured under two traditions is two rows, and
MB.167's example is exactly those two Hecates. M5.6a met the same gap for
forms, two "Wax" rows, and made a form's slug its name and its group's.

**Decided: `deitySlug(name, tradition)`, `hecate-greek`, as a form's is.**
It follows a rename and a move to another tradition. The owner chose it after
the tradition's delete was settled on the name-alone slug, so the delete's
move re-slugs too.

- **The seed is the backfill.** It writes the new slugs and re-derives every
  live deity's on each run, writing only the rows that differ. The forms'
  `reslugForms` became `reslugItems` in `src/db/seed/two-tier-vocabulary.ts`,
  shared by both, rather than a second copy. The seed key stays the slug of
  the name, as every database seeded before holds it.
- **A tradition's rename re-slugs every live deity under it**, and its delete
  re-slugs each deity it moves, as a form group's do its forms. A move onto
  another live deity's address is refused, naming both: on `name` for a
  rename, on `moveTo` for a delete. The refusal and its race re-read are
  `services/group-moves.ts`, which the form groups now use too.
- **No ingredient is rewritten by a re-slug.** A link holds a deity's name and
  id, never its slug.

Weighed: _the name alone, as the seed had it._ Nothing re-slugs, but a second
Hecate is refused as a collision and must be named apart ("Hecate (Roman)"),
which puts the tradition into the name the autofill shows beside the
tradition.

### The rename's rewrite is a writer method

A deity's rename carries the new spelling onto every live compendium entry's
`ingredient_deities` row linking it, in the same transaction.
`ingredient_deities` is the `ingredients` module's, and `vocabulary` may not
import it: the module graph runs the other way.

**Decided: `carryDeityRename(admin, deityId, name)`, the writer's
twenty-third method**, beside `carryFormRename` and `carryAstrologyRename`
and named below the boundary for their reason. It is one `UPDATE` of the live
links to the deity whose ingredient is a live compendium row, by the
builder's correlated `EXISTS`, so a coven's link is never reached.
`tests/db/repository/write.test.ts` moves its cap to twenty-three.

Weighed: _widen an existing carry to take deities._ The count stays at
twenty-two, but one method would hold three shapes: a list column, a form
column with re-slugging, and a child table.

### One form and one list for every grouped vocabulary

The deity modal would have been a third copy of the form `CategoryForm` and
`IngredientFormValueForm` already duplicated, some 300 lines each, and its
list a third copy of `CategoryList` and `IngredientFormValueList`. MB.189 had
made a third form's shared tests a row of `tests/support/grouped-value-form.tsx`.

**Decided: fold each pair into one component keyed by a `kind`,
`GroupedValueForm` and `GroupedValueList`, in this PR, before the deity kind
is added**, as `GroupForm` and `GroupList` already serve every group
vocabulary. A kind is an entry in each component's `KINDS`: its nouns, its
group's label and address parameter (`?tradition=` for deities), its schema
and its three mutations. A deity's input calls its group `traditionId`, so
the kind maps the form's `groupId` onto it and a refusal pathed to it back.
The owner chose this knowing it breaks one task per PR; it is named in the
PR body. `GroupForm` and `GroupList` take a third kind, `tradition`.

Weighed:

- _A third copy of each, and a task minted to merge them._ The PR stays one
  task, but ships 500 more duplicated lines for the merge to remove.
- _A third copy of each, no follow-up._ Rejected for the same lines, kept.

### Every group page numbers its pages, through one helper

Seen on the built page: the traditions page paged without "Page X of Y".
`GroupList` was built for the category and form groups, eight and six rows,
one page each, so it took no position and its pages counted nothing; the 35
seeded traditions run to two pages.

**Decided: all three group pages count their pages**, the owner's call, not
the traditions alone. `GroupList` takes an optional `position`, as
`GroupedValueList` does, and each group service gains a count —
`countCategoryGroups`, `countIngredientFormGroups`, `countDeityTraditions` —
over one generic repository finder, `findPageCount`, the count of a
`findPage` list, rather than three finders of their own.

**Decided: one helper numbers every admin page.** The read-then-count block
that turns a page into "Page X of Y" was pasted into each admin list page,
eight copies with these three. `resolveNumberedPage` in
`src/lib/pagination.ts` reads the page through `resolvePage`, counts it from
its first row, and returns the position beside it, and every admin list page
reads through it.

### Calls made without asking

- **Firing the `compendium` tag is M8.7's**, as MB.95 corrected for its
  writes: nothing calls `revalidateTag` until M8.6's caching exists, and M8.7
  wants one shared constant. M8.7's entry now names the deity and tradition
  writes.
- **The reverse index is partial on live links**,
  `ingredient_deities_deity_id_idx`. The forms' is partial on the compendium
  tier too, but that tier is a column of `ingredients`, not of this table, so
  the reader joins it.
- **The deities page orders by tradition, then name**, the categories' key,
  so a page reads each deity under its tradition, and narrows by a name query
  and a tradition, as the forms page narrows by a group.
- **The deities move one row at a time** through `updateById`, as M5.6b's
  forms do: a tradition holds tens of rows.

## A substitute is a row that links an ingredient or names one

M5.9's review settled, on the owner's decision, that a substitute may link an
existing ingredient: `ingredients.substitutes text[]` becomes a child table,
one row per substitute, each either a link or a free-text name, in the shape
MB.40 gave a spell's layers. This record settles what the task left open, and
why. The build is MB.139 (the table and its fill), MB.140 (the switch) and
MB.141 (the drop), under rule 10. DESIGN.md §5, `ingredient_substitutes`,
carries the model; this record carries the alternatives.

### Decided

**The table.** `ingredient_substitutes`: `id`, `ingredient_id`,
`substitute_id` (nullable), `name` (nullable), and the full audit spread. `CHECK (num_nonnulls(substitute_id, name) = 1)`, `name` checked
non-blank, and `CHECK (substitute_id <> ingredient_id)`. An index on `ingredient_id WHERE deleted_at IS NULL`, the parent's; two partial
unique indexes, on `(ingredient_id, substitute_id)` for links and
`(ingredient_id, lower(name))` for names, each over live rows of its kind; and
none leading on `substitute_id` (see the deletion rule). A substitute typed without picking an
ingredient is stored as text, without a warning. The owner restated that while
this was scoped: an ingredient not yet entered is just its text.

**The tier rule.** A compendium entry's substitute links only the compendium. A
coven ingredient's links the compendium or its own coven, never another
coven's.

- _Why not either way for both tiers:_ the compendium is the public, indexable
  surface (MB.80). A link from an entry to a coven's ingredient would put that
  ingredient's name, and the fact that it exists, in front of every reader,
  where a coven's contents are private (§8).
- _Why a coven may link the compendium:_ nothing is revealed, since the
  compendium is everyone's, and it is where most of what a member would name
  already lives.
- _Where it is held:_ in the service (MB.140), against the writer's own read
  scope, and refused as a field error pathed to the entry. A CHECK cannot read
  the linked row. The read ANDs the same rule, so a row written past the
  service still shows nothing.

**The deletion rule: a link to a deleted ingredient is kept, and shown by its
last name**, as plain text with nothing to follow. This was the owner's choice
of three.

- _Turned to text at the delete._ This keeps rule 4 as it was, but a keeper
  deleting a compendium entry would rewrite rows in every coven that linked it,
  the access to a coven's ingredients that M6.6 asserts a keeper never has, and
  that rule 5's proof gives a keeper no handle on. It is also lossy: v2's
  restore (§13) brings the ingredient back and not the links.
- _Dropped from the list while the ingredient is deleted._ No exception and no
  cross-tier write, and a restore would bring it back. But a substitute the
  member recorded would vanish without a word, which is the failure M5.3
  refused for a spell.
- _Kept, shown by last name (chosen)._ Read-only and reversible. The cost is a
  third named finder that reaches a soft-deleted row, in M5.3's shape: it skips
  the linked ingredient's `deleted_at` and no other filter, and the soft-delete
  guard pins it. CLAUDE.md rule 4 now names it.
  - The last name is the deleted row's own `name`, since no writer touches a
    deleted row.
  - As with a spell layer, a link already reaching a deleted ingredient
    survives a save of its parent, and a new one cannot reach one.
  - Nothing reads from a linked ingredient back to its linkers, and nothing
    hard-deletes an ingredient, so MB.139's index on the linked id, which was
    meant to let a deletion find what pointed at it, is not built.

**The audit shape: the full spread, soft-deleted**, as `ingredient_folk_names`
is.

- _Why not MB.34's four stamps and a hard delete:_ MB.34's deciding cost is the
  `deleted_at IS NULL` that a service joining _through_ a table must remember.
  Nothing joins through this one, and a finder selecting from it filters it for
  nothing. And a substitute is content, a member's text or claim, rather than a
  pairing of two curated rows.
- _What it buys:_ v2's history and trash view restore it like any other row.
- _What it costs:_ the table's own `set_updated_at` trigger line (M1.18), and
  replacing a list by diff, as `replaceFolkNames` does: an entry still listed
  keeps its row, one no longer listed is soft-deleted, and a new one is
  inserted.

**The order rule: alphabetical, by the name each substitute shows**, as folk
names are, the owner's call. That name is the linked ingredient's label, its
last label once deleted, or the typed text, so a relabelled ingredient moves
with its new name. The read sorts in the service as `folkNamesOf` does, and
nothing stores an order.

- _Kept as entered, as the correspondence lists are since MB.134 (first
  proposed):_ a stored `position`, unique among live rows as
  `spell_ingredients.layer_order` is. The owner chose alphabetical instead,
  which drops the column, its partial unique index and the scratch-offset
  reorder a position needs. A save becomes a set comparison, as folk names'
  is.
- The fill copies `substitutes text[]` across as names. The order the array
  held is not kept.

**No repeats**, the owner's call, made once the order was alphabetical. The
same ingredient linked twice, or the same name typed twice in any case, is
refused, as a repeated folk name is.

- _Allowed, as in the correspondence lists (first proposed):_ a repeat there
  can at least sit in another place in an ordered list. In an alphabetical one
  it is only a duplicate beside itself.
- _How:_ the two partial unique indexes are `spell_ingredients`' shapes for its
  links and custom names. The shared schema refuses the repeat first, pathed to
  its position, so neither index is what a member sees.
- A typed name equal to a linked ingredient's label is not a repeat: one is text
  and the other a link.
- The parent's plain index stays: a read of all an ingredient's rows implies
  neither unique index's predicate, so neither can serve it.

**The GraphQL shape.** `Ingredient.substitutes: [Substitute!]!`, alphabetical,
`[]` when there are none, as `folkNames` is, where the array was nullable.
`Substitute { name: String!, ingredient: Ingredient }`:

- `name` is the linked ingredient's label, or its last label once deleted, or
  else the typed text.
- `ingredient` is null on typed text and on a deleted link, so a client links
  exactly when it is set.
- It resolves through a DataLoader (rule 9). One query per batch reads the
  rows and their linked ingredients, deleted or not, through the finder above.
- No `audit` on `Substitute`, as `folkNames` carries none. The input is
  MB.140's: each entry an ingredient id or a name, exactly one.

**The picker's search: `ingredientSuggestions(workspaceId, query)`**, a new
paged query built in this task on the owner's call:

- _What it reads:_ the live ingredients of the compendium and the current coven,
  exactly what a coven's substitute may link. They are matched as the
  `compendium` search matches (word similarity at 0.5 on the label, the formal
  name and the folk names, accent-folded), best match first, with a blank or
  one-character query listing by name.
- _The admin's form:_ a compendium entry's form reads `compendium(query)`, which
  holds what its substitutes may link and nothing else.
- _Why not `commonNameSuggestions`:_ it answers with strings, and a pick writes
  an id.
- _Why not `possibleDuplicates`:_ it asks whether a whole name is nearly one
  already there, by `%` at 0.4. A typed prefix never reaches that: `mu` is 0.22
  similar to Mugwort and 0.67 word-similar.
- _Why not `workspaceIngredients` (M9.4):_ it lists what a coven holds, which
  leaves out every compendium entry it has not added, and it lands in wave 11,
  after MB.131 needs it.
- _Suppression:_ local-beats-compendium suppression is M8.3's to add here, as in
  every workspace result. Until then, a coven entry and the compendium entry it
  shadows are both offered.

### What it changed

- **Docs:**
  - DESIGN.md §5 (the table and its rules), §7 (`Substitute`,
    `ingredientSuggestions`), §9 (the detail page links a linked substitute),
    §14 (two rows), and the enforcement list's rule 3.
  - CLAUDE.md rule 4 and `.claude/rules/database.md`: the third named finder.
- **Code:** the query.
  - `findIngredientSuggestions`, on the tier seam.
  - `suggestIngredients` in `ingredients`, and its GraphQL field.
- **Task text:**
  - MB.139: the index on the linked id is not built, and the two unique
    indexes are.
  - MB.140: the deletion finder and the guard, and the schema refusing a
    repeat.
  - MB.131: names `ingredientSuggestions`, and `compendium(query)` for the admin
    form.
  - M8.3: suppresses here too.
  - M8.19: a linked substitute leads to its ingredient.

## A reference is one source, kept once, rendered in Chicago form

**Note, 2026-10-12 (MB.115):** a reference-work entry is now cited "under"
its headword in quotation marks rather than "s.v.", as the 18th edition of the
_Chicago Manual of Style_ (14.130) writes it, on the owner's instruction to
follow the current standard. The form in force is
[`db/references.md`](../db/references.md)'s; this record keeps the one
decided then.

MB.127 settled, on the owner's request, that every compendium entry carries a
references section and that a reference is one table any sourced row links,
rather than a child of `ingredients`. DESIGN.md §5, "References", records the
owner's decisions: Chicago bibliography form; two tiers, as ingredients are,
with MB.138's rule on what a row may link; optional on an entry, with an
keeper's to-do filter; and the vocabulary seeds' sources written as rows. This
record settles what those leave open, and why. The build is MB.152 (the
tables), MB.153 (the services and the renderer), MB.154 (the form), MB.155
(the page) and MB.156 (the seed). DESIGN.md §5 carries the model; this record
carries the alternatives.

### What the research changed

MB.156 renders every source in
[`../compendium/deity-vocabulary-seed.md`](../compendium/deity-vocabulary-seed.md) to the doc's
own text, and the task's column list could not reach it. Counted over the
doc's 334 citation lines:

| Shape                                                   | Lines |
| ------------------------------------------------------- | ----: |
| `s.v.` reference-work entries (Wikipedia, _VLE_, …)     |    79 |
| A last-modified date                                    |    89 |
| Read through an online host (Perseus, Encyclopedia.com) |    48 |
| A translator or an editor                               |    29 |
| A parenthetical note                                    |    19 |
| A series, or a volume count                             |   ~12 |

So the column set is the task's, plus `contributors`, `series`, `host` and
`modified`, and the kinds are the task's with `entry` in place of `other`,
each with its count as its reason.

### Decided

**The kinds: `book`, `chapter`, `article`, `entry`, `web_page`**, the enum
`reference_kind`. The kind decides which rendering a row gets.

- _Why `entry` rather than `other`:_ an `s.v.` reference-work entry is the
  doc's most common shape, and Chicago renders it differently from a chapter
  (CMOS 14.232–14.233). `other` would have had no specified rendering, so it
  would have rendered a guess; every source in either doc fits the five once
  MB.156 normalises the doc.
- _Why `book` and `chapter` stay two kinds_, the owner's call: Chicago renders
  them differently — a chapter's title is quoted and its book becomes an
  italic container after "In", with the book's editors and the chapter's
  pages. Both fit the same columns, so they could merge into a `book` with an
  optional container, but then a chapter saved without its book would save as
  a book titled with the chapter's name, italicised wrongly and with no error.
  Kept apart, the form leads with the kind and labels "Chapter title" and
  "Book", and a CHECK requires a chapter's container. The mistake becomes
  impossible instead of merely absent.

**The columns.** `id`, `workspace_id` (nullable: null is the compendium tier,
as on `ingredients`), `kind`, `authors`, `title`, `container`, `contributors`,
`edition`, `volume`, `issue`, `series`, `place`, `publisher`, `published`,
`pages`, `host`, `url`, `modified`, `accessed`, `note`, and the six audit
columns. `title` is the one required text; every other column is text as
Chicago prints it, except `modified` and `accessed`, which are `date`s.

- _`authors` as printed text_, with the first inverted and any role ("Smith,
  William, ed."), rather than a structured name list: name order is not
  mechanical across the doc ("Snorri Sturluson", "Ovid", Chinese and Igbo
  names), and a list would need a name grammar the renderer would get wrong.
- _`published` as text_, rather than a `date`: Chicago dates come at a
  year's, a month's, a season's or a range's precision ("1985", "November
  1950", "Summer/Autumn 2013", "1882–88").
- _`modified` and `accessed` as `date`s_, since each is always a full day,
  and the renderer prints "October 6, 2026".
- _`contributors` as a sentence_ ("Translated by Angela Hall"), typed as the
  kind prints it, since a chapter's are lowercase after its book ("edited by
  …") and a book's stand as a sentence.
- _`host`_ is the repository a print work was read through ("Perseus Digital
  Library, Tufts University"), which Chicago places before the access date.
- _`note`_ is a short annotation rendered after the citation in parentheses
  — the task asked whether a free note was one of the columns, and 19 doc
  lines carry one.

**The CHECKs make the renderer total over every row the table admits.** Every
text column is non-blank when set; `url` is absolute http(s); `accessed` is
set only with a `url`; `chapter`, `article` and `entry` require `container`;
`web_page` requires `url` and `accessed`. MB.153's Zod mirrors each with a
field message, and adds "a book needs a date", which is a form rule rather
than a rendering one.

**No unique index on `references`.** Two rows may be the same book.

- _Why:_ nothing short of a librarian identifies a source. A unique index on
  any subset of the fields refuses a legitimate second edition or translation;
  one on all of them catches only an exact repeat, which the picker already
  steers away from by offering the existing row first.
- The seed is idempotent by the rendered citation instead (MB.156).

**The links: one `reference_links` table**, in MB.40's and MB.138's shape:
`id`, `reference_id` (not null), one nullable foreign key per sourced table —
`ingredient_id`, `deity_id`, `deity_tradition_id`, `planet_id`,
`zodiac_sign_id` — `locator`, and the full audit spread, under
`CHECK (num_nonnulls(…) = 1)`.

- _Why not a join table per entity:_ five tables today, each with its own
  trigger line, `AUDITED_TABLES` entry, finder and loader, and one more per
  sourced entity to come. Here a new sourced table costs a column, its index
  and the widened CHECK — a `DROP CONSTRAINT` under its `.ack.md` sidecar, as
  MB.161's was.
- _Not sourced:_ the categories and the forms, which are the project's own
  design.
- _Soft-deleted, with the full spread_, as `ingredient_substitutes` is: a
  link is content, and v2's history restores it.

**One live link per reference per row**, held by a partial unique index per
sourced column — `(ingredient_id, reference_id) WHERE ingredient_id IS NOT
NULL AND deleted_at IS NULL`, and the same for the other four.

- _Each leads on the sourced id_, so it also serves the read by row: a read
  of one ingredient's links implies the index's predicate, which a read of all
  an ingredient's substitutes does not imply of `ingredient_substitutes`'
  link index. So no plain parent index is built, as none is for
  `ingredient_deities` (MB.165).
- _None leads on `reference_id`:_ nothing in v1 reads from a reference back
  to its links, and a reference is never hard-deleted — MB.138's reason for
  building no index on `substitute_id`.

**What a link carries: a `locator`, and nothing else.** Nullable, non-blank,
free text — "p. 112", "chap. 13", "s.v. Hecate" — because locators vary by
the kind of work.

- The renderer leaves it out of the citation: a bibliography entry names the
  work, not a page. MB.155 shows it beside the citation.
- The locators the doc embeds in a citation (Grimm's "Vol. 1, chap. 13",
  Tacitus's "Chap. 40") move onto links in MB.156.

**The tier rule is the service's**, as MB.138's is. A compendium entry's or a
vocabulary row's link names a compendium reference (`workspace_id IS NULL`);
a coven ingredient's names the compendium's or its own coven's.

- A CHECK cannot read the reference's row, so MB.153 refuses the rest as a
  field error pathed to the entry, asserted by direct id, and the read ANDs
  the same rule.
- _Who edits a reference:_ a compendium reference only under the `SiteAdmin`
  proof, a coven's only under its `Membership`, whoever links it. A member who
  links a compendium reference reads it and cannot change it.
- An edit reaches every row linking the reference — the point of keeping a
  source once — and a compendium-tier edit revalidates the `compendium` tag.

**The order: alphabetical by the rendered citation**, as a bibliography is,
so nothing stores an order.

- _The key:_ the plain citation, less a leading quotation mark and an initial
  _A_, _An_ or _The_ (CMOS 14.67), compared with
  `localeCompare(…, 'en', { sensitivity: 'base' })`.
- _Where:_ in the service, as `folkNamesOf` sorts, since the citation exists
  only in TypeScript.
- _Why the picker's search differs:_ rule 7 filters in SQL, so
  `referenceSuggestions` matches `authors`, `title` and `container`,
  accent-folded by word similarity as the compendium search matches names,
  and not "the rendered citation" as MB.153's entry first said. The entry is
  amended.

**The owner: `ingredients`, not a sixth module.**

- _Why not `vocabulary`:_ the link table keys into `ingredients`, which
  `vocabulary` may not import.
- _Why not a module above `ingredients`:_ MB.153 writes an ingredient's links
  inside the ingredient's own `withAudit` transaction, which puts the call in
  `ingredients`' service — so `ingredients` would import the new module, and
  the graph would cycle.
- _What it costs:_ `vocabulary` cannot read a deity's references itself.
  Nothing does in v1 but the seed, which reaches schema files directly. A
  later `Deity.references` field is added from `ingredients`, as
  `User.memberships` is added from `coven`.
- _The seam:_ the compendium-tier rows join the tier seam's extraction unit,
  and MB.153's finders join `TIER_SEAM` in that PR.

**Nothing deletes a reference in v1.** The writers are the ingredient form —
`createReference`, `updateReference`, and the links inside the ingredient's
save, brought to the list sent as folk names are — and the seed. The admin
vocabulary pages gain no field, since MB.156 writes theirs.

- _Unlinking_ soft-deletes the link through the ingredient's save.
- _A reference whose every link is gone_ stays live and suggested. A source
  is reusable, and sweeping it would delete a coven's record, or a keeper's
  seeded row, behind their back.
- _Should a reference ever be soft-deleted_ (by hand, or by v2): its links
  are untouched, and the read joins live references only, so it leaves every
  bibliography and a restore returns it. This is the opposite of MB.138's
  substitute rule, and rightly: a deleted reference is a retracted source,
  where a deleted ingredient is a fact a member recorded. It also needs no
  cross-tier write and no new rule-4 finder, which CLAUDE.md would otherwise
  have to name.

**The GraphQL shape.** `Reference` carries its fields, `isGlobal`, `audit`
and `citation: String!`; `Ingredient.references: [ReferenceLink!]!`, where
`ReferenceLink { reference: Reference!, locator: String }`, alphabetical
through a loader and `[]` when there are none.

- _The wrapper_ exists because the locator belongs to the link, not the
  reference.
- _`citation` is plain text_, italics dropped: for sorting, for a chip, and
  for a screen reader.
- _The dates_ are graphql-scalars' `LocalDate`, the standard tool, added by
  MB.153 beside `DateTimeISO`.
- _The enum values_ are the database's, `web_page` included, as
  `SpellVisibility`'s are.

**The renderer is `renderCitation(ref): CitationPart[]` in
`src/lib/citation.ts`**, pure and client-safe, beside `slugify`, because the
page, the picker, the service's sort and the seed's test all call it and it
imports nothing from a module. Each part is `{ text, italic }`; `citation` is
the parts joined, and a surface that shows italics — MB.155's `<cite>` —
renders the parts itself.

- _The kind supplies the default italics:_ a book's title, and a chapter's or
  article's container. An entry's container and a web page's site are roman
  by default, as "Wikipedia" and "World History Encyclopedia" are printed in
  the doc, so a published reference work used as a site is marked by the
  writer.
- _A field may mark italics itself_, with `_…_` in `title`, `container` or
  `note`, under CommonMark's rule that an underscore inside a word is not a
  mark. That handles a reference work used as a site
  (`_Internet Encyclopedia of Ukraine_`), a title inside a title and a note's
  journal name, while leaving `Greek_Mythology` in a URL alone; `url` is never
  parsed, and a marked span inside a field the kind already italicises renders
  roman (CMOS 14.94).
- _The test form:_ the seed's and the page's tests join the parts with `_`
  around the italic ones, which is exactly the doc's Markdown, so the
  comparison is string equality. A stated limit: a roman span inside an
  italic field has no spelling in that form, since CommonMark does not nest
  one marker inside itself. No source in either doc needs one.
- _Why not a Markdown library:_ one inline marker on three columns, and the
  dependency would still need the intraword rule pinned by a test. The
  alternative without markup is a `containerItalic` boolean and no italics in
  a note; the marks were chosen because the doc already carries them and the
  seed's test stays string equality.
- _Why not `citation` with the marks in it:_ the client would need a parser,
  and a URL's underscores make the result ambiguous.

**The rendering, per kind**, is written out field by field in DESIGN.md §5
with one example each, copied from the deity doc, so the seed's test and the
page's test render the same entries. Two rules the examples do not show: an
article with a volume renders `_Journal_ 51, no. 2 (1988): 399.`, which
MB.153's test covers with an invented name, and a page carrying both dates
renders `June 24, 2013; last modified September 27, 2024.`, as the doc prints
the Seven Lucky Gods.

### What MB.156 inherits

Amendments to its entry, not work done here. The doc is normalised before the
seed parses it:

- The comma-form `Wikipedia, s.v. "…," last modified …` lines become period
  form.
- Embedded locators move onto links.
- "Revised" becomes "Last modified", and "Originally published in …" and the
  unparenthesised "Existence confirmed at …" become notes.

### What it changed

- **Docs:**
  - DESIGN.md §5 (both tables, their CHECKs and indexes, the tier, order,
    delete and ownership rules, and the rendering per kind), §7
    (`Reference`, `ReferenceLink`, `ReferenceKind`, `LocalDate`,
    `Ingredient.references`, `referenceSuggestions`, `withoutReferences`,
    `createReference`, `updateReference`), §9 (the locator beside each
    citation) and §14 (four rows).
  - [`db/references.md`](../db/references.md), new, and its row in `../db/README.md`.
  - `modules.md`: the ownership row, the reason, and the seam.
- **Code:** none. The record is written before the table task transcribes
  it, as MB.138's was.
- **Task text:**
  - MB.152: the exact columns, CHECKs and indexes; the `ingredients` module;
    no index on `reference_id`.
  - MB.153: `ReferenceLink`; the search over the fields; the plain `citation`
    and the parts; the sort key; the `LocalDate` scalar; `TIER_SEAM`.
  - MB.154: the chip reads the plain citation.
  - MB.155: renders the parts.
  - MB.156: the normalisation above.

## IngredientForm: the References field

Live home: `claude-docs/components/ingredient-form.md`, "The references" and "The new reference panel".

### Decision

- **References are rows beneath the box, not chips inside it.** The control holds only the search box. Each reference is a full-width row: the citation wrapping in full, a "Locator" box, and its ×. It reads as a bibliography. A row reads the plain `citation` with a muted second line for its tier: "Compendium source" or "This coven's source". Italics are a later task's.
- **The sub-form is an inline panel** beneath the field, a "New Reference" fieldset with Save Reference and Cancel. It is not a dialog, because the form itself may sit in a modal and a dialog here would stack two. There is no nested `<form>`.
- **A "New Reference" button replaces Add** beside the box. Typed text is a search, never an entry, so Add has nothing to add.
- **"Add a reference" is always the list's first row**, blank box included. It does not prefill the panel: a search for "grimm" might be an author or a title.
- **Enter with nothing highlighted only closes the list.** It never adds anything and never submits the ingredient.
- **A source already listed is not offered again**, as the element box filters its chosen choices. The schema's "already listed" refusal stays as the server's backstop.
- **Text left in the search box stops the save**: 'Pick a source for "grimm", or clear the box'. **An open, unsaved panel stops it too**: "Save the new reference, or cancel it", on the References field's error element.
- **Kind labels:** Book, Chapter in a Book, Journal Article, Reference-Work Entry, Web Page. Each kind's fields come from what `renderCitation` prints for it (`src/lib/citation.ts`), so the panel offers nothing the citation would drop.

### Why

A citation is long and a chip truncates it. The panel's per-kind fields are most of the work, so it matches the citation renderer exactly.

### Rules out

- Chips inside the control.
- A dialog for the new-reference form.
- Add-from-typed-text.

## The page cites in notes and a bibliography

MB.151 settled that a reference is one source, kept once and rendered in
Chicago form, and that a link to a row carries a locator. This record settles
how the ingredient page shows them. The first build put a References list in
the side column of Details and of each form, each source with its locator
beside it. The owner redesigned it after seeing it. DESIGN.md §5 ("References")
and §9 (the routes table) carry the result; this record carries the
alternatives.

### Decision

One **References** section sits at the foot of the page, beneath the forms and
above the slot for v2's notes, on the public route and a coven's alike. It
holds two parts:

- **Notes**, an ordered list. Each note is one reference with its locator, in
  Chicago's shortened form, with a link on to its bibliography entry and a
  link back to the section that cited it.
- **Bibliography**, every source once, alphabetical, in full form, with a link
  back to each note that cites it and a link to the source's `url`.

A section that cites sources of its own, Details and each form, ends with
its notes' numbers: superscript links under a small "References" label.
Numbers run in page order, the ingredient's first and then each form's. The
side column and the form sections carry no references.

### Alternatives offered

1. **One numbered list, as Wikipedia does.** Every number is a source, and a
   locator is written after the number. Rejected: one number cannot carry two
   locators, so a source cited at two places would need two numbers, and then
   the list is notes in all but name without a bibliography to order them.
2. **A hybrid: a numbered bibliography with the locator beside the number.**
   Chicago does not use it. Its numbers belong to notes, not to bibliography
   entries, and the hybrid still cannot carry two locators on one number.
3. **Chicago author-date, with "(Cunningham 1985, 42)" in the text.** It puts a
   citation in the middle of the sentence, and a page of short correspondence
   lists has no sentences to hang it on. Chicago offers it for the sciences;
   the works this compendium draws on are humanities works, which the
   notes-and-bibliography system serves.
4. **Notes and bibliography (chosen).**

### Why notes and bibliography

Chicago describes two documentation systems, and notes and bibliography is
the one for the humanities; the compendium's sources are humanities works
(MB.151). Its notes may be shortened when the work also appears in a
bibliography, which this page always has, so a note is brief while the
bibliography carries the full entry for a reader who wants to find the work.
A locator lives on its note, which is where a page number belongs and why one
note is made for each link: a source cited at two places in a section is one
link with both places in its locator (MB.154), and the reader sees them in one
note. The bibliography is alphabetical by the author's surname, so it needs no
stored order and the renderer MB.153 built sorts it (`byCitation`).

Source: Purdue Online Writing Lab, "Chicago Manual of Style, 18th Edition:
Formatting and Style Guide," Purdue University, accessed 2026-10-17,
https://owl.purdue.edu/owl/research_and_citation/chicago_manual_18th_edition/cmos_formatting_and_style_guide/chicago_manual_of_style_18th_edition.html.
It supports four things here: that Chicago has two systems, notes and
bibliography and author-date; that the notes system marks a note with a
superscript number after the sentence; that notes may be shortened when the
document includes a bibliography; and that the bibliography is alphabetical by
the author's surname. It does not decide how a web page should lay these out.
That is this project's choice, below.

### Why a number marks a section, not a sentence

The entry's text is data, a description and lists of correspondences, with no
claim a source could be pinned to. A source supports a row as a whole, so the
number ends the section that row belongs to: Details for the ingredient, a
form's section for the form. That also keeps a number's meaning honest. It
never suggests that one particular sentence rests on one source.

### Where the numbers sit

At the end of a section's text, on a line of their own under a small
"References" label, and not on the heading. A number on a heading would
read as part of its name and would be spoken with it by a screen reader. The
label is not a heading, so the page's outline keeps one References heading
(the h2 at the foot, with Notes and Bibliography at h3); the numbers form a
group named by the label. The links rest in the body ink and fade to the link
colour on hover and focus, as they do throughout the section (the owner's
call).

### No tooltip

A note's text could have appeared in a tooltip on its number. The owner chose
not to: a tooltip hides the text from touch and keyboard readers, and the
number already jumps to the note, with a link back. The jump and its return
carry the reading.

### Ids

`note-N` for a note, `note-ref-N` for the number that points at it, and
`ref-<referenceId>` for a bibliography entry, so every link in the section,
and the jump menu's References entry, is a plain fragment.

## An `unknown` classification may carry a formal name

The rule lives in `claude-docs/db/identity-model.md` (nomenclature) and DESIGN.md §5; this record keeps what it rules out.

### Decision

`none` takes no formal name, the five named kinds each take one, and `unknown` takes either. A workspace entry with a formal name and no kind saves as `unknown`, which admits the name without claiming its system. A name-only entry still saves as `none`.

### Why

`unknown` means the classification is unsettled, not that nobody has written the name down. A name it carries is unconfirmed until a kind is chosen, so it is shown upright and marked unconfirmed.

### Consequences worth knowing

- `canonical_key` has no `nomenclature` in it, so the same name under two kinds is a duplicate, not two entries.
- Correcting an unconfirmed name re-keys the entry and retires the old slug of a compendium entry.
- The curation to-do list stays one list: rows with a name need a kind, rows without need the name looked up too.
- The migration only widens the CHECK, so it needs an `.ack.md` sidecar but is one PR.
- Code rolled back past this change reads an `unknown` row with a name and refuses an edit to it until the name is cleared or a kind chosen.

### Rules out

- A separate "confirmed" flag on the formal name: a second column every reader must consult, saying what `unknown` with a name now says.
- Keeping the refusal and guessing the kind: the silent guess §5 forbids.

## The compendium holds curated values alone

**Decided:** a compendium entry's `form`, `planets`, `zodiacSigns` and
`deities` each name a live curated row — a form under a live group, a deity
under a live tradition — and the compendium services refuse anything else. A
coven's ingredients keep free text. The rule holds after the write as well as
at it: a curated row a live compendium entry holds is not soft-deleted while
it holds it, and a rename carries the new spelling onto those entries. It
narrows DESIGN.md §5's "a value off the list is written as readily as one on
it" for the compendium tier alone, and it is the owner's call, made during
MB.131 and settled in MB.162's scoping.

### Why

MB.131 heads the autofill's two buckets "From Compendium" and "From Coven"
(renamed from "Curated" and "In use", the owner's call), so that a reader
sees where a value comes from. Under §5 as it stood, the second bucket held
in-use values from both tiers: a compendium entry could carry `rhizome`, and
the box would offer it under "From Coven". The headings were true only while
no compendium entry held an uncurated value, and nothing kept that so.

Nothing is lost by making it so. The keeper who writes the compendium is the
one who curates the lists, so a value missing from one is added there first,
with the description the vocabularies require, and the entry is written
after. A coven cannot curate, which is why its ingredients stay free text: a
member must be able to write `rhizome` before anyone has curated it (§5,
"`ingredients.form` is `text`").

### The rule

- **The four fields, and only they.** Folk names and colours have no curated
  list and stay free text in both tiers. A compendium substitute already links
  only the compendium (MB.138), and `elements` and `nomenclature` are closed
  enums.
- **A live curated row**, matched as the suggestions fold a value,
  `lower(btrim(value)) = lower(name)`, and only while its group or tradition
  is live, as the autofill reads it ([`db/member-autofill.md`](../db/member-autofill.md)).
  The value is stored in the row's own spelling, so `moon ` is written `Moon`.
  Amended by MB.167: the form and each deity must be a pick of a curated row,
  refused at `['form']`, `['formId']` or `['deities', i]` when typed, and
  planets and signs alone keep this match
  ([`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md)).
- **Refused beside the field**, as a `ValidationError` from
  `createCompendiumEntry` and `updateCompendiumEntry`: `['form']`, or
  `['planets', i]`, `['zodiacSigns', i]` or `['deities', i]` at the entry the
  caller sent, blanks counted. Every refusal at once, so the keeper sees the
  whole list to add.
- **The service's, not Zod's or a key's.** The check reads the database, and
  the shared schemas are client-safe, `zod` alone
  ([`validation.md`](../validation.md), "Where the schemas live"). A foreign
  key would refuse a coven's free text too, and MB.35's rule is that a
  vocabulary a member writes is text.
- **The admin pages carry no curation to-do list of values in use.** M5.6a,
  MB.95 and MB.132 were each to list the compendium's in-use values outside
  the vocabulary; under this rule that list could never hold anything, so it
  is dropped from all three. A coven's uncurated values were never on it,
  since a keeper reads no workspace's ingredients (M6.6).

### What happens to a held row

A rule checked only at the write would break the moment a keeper deleted or
renamed a row an entry holds. The owner chose, for each:

**A delete is refused while a live compendium entry holds the row**, with an
error naming the entries, and the keeper edits them first. So is deleting a
form group or deity tradition with such a row under it, since a form under a
deleted group, or a deity under a deleted tradition, is no longer curated.
Amended by M5.6b for form groups: deleting one first moves its forms to
another live group the admin picks, so they stay curated and the delete is
not refused for the compendium
([`m5.6b-admin-groups.md`](m5.6b-admin-groups.md)). Amended by MB.132 for
deity traditions the same way: deleting one first moves its deities to
another live tradition the admin picks
([`mb.132-admin-deities.md`](mb.132-admin-deities.md)).
Weighed:

- _Strip the value from those entries in the same write._ The rule holds, but
  curated data vanishes from entries the admin never opened, unseen.
- _Leave the value on them._ The rule then holds only at the write, an entry
  keeps a value no list has, and MB.131's headings can lie again.

**A rename carries the new spelling onto every live compendium entry holding
the old one, in the same transaction.** Weighed: _refuse a rename while the
row is held._ Simple, but a typo fixed in the vocabulary would first need
every entry holding it edited by hand.

Both apply only while the row is the **last live curated spelling of its
value**: the vocabularies key on the slug, so two live rows may share a name,
"Wax" under _Animal_ and under _Substance_, and an entry holding `Wax` is
curated while either is live. Deleting or renaming one of a pair leaves the
entries curated by the other, so neither blocks nor rewrites them. Amended by
MB.167: a form's or deity's delete and rename follow the link, so this clause
holds for planets and signs alone
([`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md)).

**A coven's rows never block a delete and are never rewritten.** They keep
what they wrote; a deleted or renamed value moves into that coven's "From
Coven" bucket. The admin cannot see them anyway.

**A form's rename moves no slug.** Since MB.215 a slug comes from the name
and the formal name alone (§5), and a form is a variant's `form` text plus
its `form_id` pick, so carrying a form's rename onto an entry rewrites that
text and nothing else. A rename that would give one live entry two variants
of the same form is refused, naming the entry, rather than surfacing the
index's error. Celestial bodies, signs and deities likewise touch the list
alone.

### What it leaves open

- **The rename's rewrite grows with the compendium.** Each rename is one
  set-based `UPDATE` in the rename's transaction, estimated (not measured) at
  under 50 ms at 5,000 compendium entries. **MB.163** moves it into a
  background job, after launch: the owner's call, unscheduled by design until a
  measured rewrite time nears the function's time limit, so the in-transaction
  rewrite is v1's behaviour. It picks the mechanism from those the site runs
  now (m15.49-job-mechanism.md, m15.46-daily-jobs-from-vercel-cron.md), and
  decides how the window between the rename and the rewrite keeps the rule.
- **The check is read before the write.** Until MB.148 puts a read inside
  `withAudit` on the write's transaction, the compendium services read the
  curated rows on another connection, so a keeper deleting a row at the
  instant another keeper writes an entry holding it can see that entry written
  once. Two keepers and a few milliseconds; the service says so where it reads.

### What it changed

- DESIGN.md §5 (`form`, the planet and zodiac vocabularies, the deity
  vocabulary, the two readers), §9's admin routes and a §14 row.
- [`db/identity-model.md`](../db/identity-model.md),
  [`validation.md`](../validation.md),
  [`db/compendium-writes.md`](../db/compendium-writes.md),
  [`db/member-autofill.md`](../db/member-autofill.md),
  [`db/astrology-vocabularies.md`](../db/astrology-vocabularies.md),
  [`db/deity-vocabulary.md`](../db/deity-vocabulary.md) and the three seed
  docs.
- M5.6a, M5.6b, MB.95 and MB.132, amended; MB.163, minted, for after launch.
- The `standard` seed's Ginger moves from `rhizome` to the curated `Root`,
  its compendium values take the curated rows' spelling, and `rhizome` moves
  to a coven entry in the `demo` scenario.

## A picked form or deity is recorded beside its text

The ingredient form's lookups show which curated row a suggestion is — "Wax
(Animal)", "Hecate (Greek)" — and the save forgets it. Curated names are not
unique (MB.35): two live forms may both be "Wax", two live deities "Hecate".
`ingredients.form` is text and `ingredients.deities` a `text[]`, so "Wax
(Animal)" and "Wax (Substance)" saved alike, and nothing after the save could
say which was picked. The owner chose to store the pick first and show it
after. This record settles the model, and
why. The build is MB.165 (the column and the table), MB.166 (the fill), MB.167
(the switch), MB.168 (the drop) and MB.169 (the display), under rule 10, and
MB.170 (the reorder control) follows from the order rule. DESIGN.md §5,
`ingredient_forms` and `ingredient_deities`, carries the model; this record
carries the alternatives.

### Decided

**The text stays, and stays identity; the link sits beside it.** `form` and
each deity's name stay text, `canonicalKey` reads the text as before, and an
uncurated value such as `rhizome` stays writable. §5's rule "a vocabulary a
member writes is text" gains its link rather than losing its text.

- _Why not replace the text with a key:_ the reason `form` is text still
  holds. A key would put identity on an id and make an unlisted value
  unwritable until a keeper curates it.
- _Why not leave the text alone:_ the autofill already tells the two rows
  apart, and the save threw that away. A name shared by two curated rows is
  the case the vocabularies allow on purpose, so the text alone can never
  say which was meant.

**The form's link is a column.** `ingredients.form_id`, a nullable `uuid`, a
foreign key to `ingredient_forms`. `CHECK ingredients_form_id_has_form`,
`form_id IS NULL OR form IS NOT NULL`, keeps a link from standing without its
text. That the text is the linked row's name is the service's to hold
(MB.167), since a CHECK cannot read another row.

**The deities' link is a child table, `ingredient_deities`**, since a link
cannot live in a `text[]`: `id`, `ingredient_id`, a nullable `deity_id` to
`deities`, `name`, `position`, and the full audit spread. It is
`ingredient_substitutes`' shape, but for one difference.

- **`name` is held on every row, a linked one too**, and checked non-blank
  (`ingredient_deities_name_not_blank`). A substitute holds a link _or_ a name,
  `num_nonnulls` = 1, and reads a linked one's label from the ingredient it
  links, which is why a substitute whose ingredient is deleted needed a third
  named finder reaching a soft-deleted row (MB.138). Holding the label here
  means a link whose deity is soft-deleted reads as its name through the
  repository's ordinary filter, which drops the deity and keeps the row, and
  CLAUDE.md rule 4 gains no exception. The cost is a name copied beside its
  link, written in the curated row's spelling (MB.167).
- _Why not a link or a name, as substitutes:_ that is the exception above,
  bought to show a label the row could simply have kept.

**Only a pick is a link.** Typed text is never resolved into one, as a typed
substitute is not (§5). MB.166 fills every existing entry as an unlinked name
for that reason, and because a stored "Hecate" cannot say which Hecate it
meant.

**A link to a soft-deleted row reads as its text.** The repository drops the
row, so the form reads as no pick and the deity as a typed name, and the value
moves into the in-use bucket, as §5 already says a soft-deleted vocabulary row's
value does. Nothing rewrites the ingredient, so a keeper's delete still
reaches no coven's rows (M6.6).

**The indexes**, all partial on live rows:

- `ingredient_deities_link_unique` on `(ingredient_id, deity_id)` where linked:
  one live link per ingredient and deity.
- `ingredient_deities_name_unique` on `(ingredient_id, lower(name))` where
  unlinked: one live unlinked name per ingredient, case-folded.
- `ingredient_deities_position_unique` on `(ingredient_id, position)`, below.
- _Why the name index covers unlinked rows only:_ links to two same-named
  deities are two deities. An ingredient a practice gives both Greek and Roman
  Hecate carries both, and a unique name across every row would refuse the
  second, the very confusion the link exists to end.
- _A soft-deleted row reserves nothing_, as no unique index here does (rule 4).
- _No index leads on `deity_id`:_ nothing in MB.165 reads from a deity back to
  its ingredients. MB.167, moving MB.162's delete refusal onto the link, reads
  the compendium entries linking a deity, and adds an index if its plan finds
  it wants one. Amended by MB.167: those reads are M5.6a's and MB.132's, which
  add the reverse indexes, since MB.167 builds no read that wants one
  ([`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md)).

**The audit shape: the full spread, soft-deleted**, as `ingredient_folk_names`
and `ingredient_substitutes` are, so the table has its own `set_updated_at`
trigger line (M1.18) and is in `AUDITED_TABLES`.

- _Why not MB.34's four stamps and a hard delete:_ MB.138's reasons hold. An
  entry is a member's claim about a practice, a typed name as often as a link,
  rather than a pairing of two curated rows, and a tombstone is what v2's
  history and trash view restore.

**The order rule: deities keep the order entered**, the owner's call, unlike
substitutes (MB.138, alphabetical). Deities are a correspondence beside
planets, zodiac signs and colours, which keep the order entered because a
practice writes its ruler first (§5, MB.134), and deities alone re-sorting
themselves after a save would be the odd one out in the form.

- _How:_ a stored `position`, unique among an ingredient's live rows as
  `spell_ingredients.layer_order` is, by `ingredient_deities_position_unique`.
  It is also the parent's index: it leads on `ingredient_id` and reads the list
  in order, as `spell_ingredients_spell_id_layer_order_unique` reads a jar, so
  no plain parent index is built. Substitutes kept one because neither of their
  unique indexes covers every live row; this one does.
- _What it costs:_ one column, one index, and a reorder in MB.167's replace
  that moves the live rows through a scratch offset, as a spell's layers do,
  since the index is checked per row.
- _Alphabetical, as substitutes (turned down):_ no stored order, and a save is
  a set comparison, as folk names' is. Simpler, but it would make deities the
  one correspondence list that does not keep what the member wrote.
- MB.166 copies the array's order into `position`, counted from 0, the
  list's own index, and dense: a skipped blank or repeat leaves no gap.

**No repeats.** Today a repeated entry in `deities[]` is not refused. Under the
table the same deity linked twice, or the same unlinked name typed twice in any
case, is refused by the two unique indexes, and MB.167's shared schema refuses
it first, pathed to its position, so neither index is what a member sees — "no
repeats", as MB.138 settled for substitutes.

- A typed name equal to a linked deity's name is not a repeat: one is text and
  the other a link. Nor are links to two same-named deities, above.

**Reordering follows, as MB.170**, the owner's call. An order the member
cannot change after typing is of little use, so the ordered list fields —
deities, planets, zodiac signs and colours — gain a reorder control. Folk
names and substitutes read alphabetically, so they get none. MB.170 also
gives a list field's chips room when they wrap onto more than one line,
which the owner found too tight.

**What stays open: one identity for two picks.** Two entries with one formal
name, one picked as Wax under _Animal_ and one under _Substance_, still share a
`canonicalKey`, since the key stays on the text. Out of scope, and noted so it
is a decision rather than an oversight.

- _Why not key on the link:_ identity would key on an id, which §5 refuses, and
  an unlinked "Wax" would then be a third identity beside the two picks.

### What it changed

- **Docs:**
  - DESIGN.md §5: `ingredients` gains `formId` and names `ingredient_deities`
    among its child tables; `ingredient_forms` records the pick and closes the
    same-named gap for one; `ingredient_deities` is specified beside
    `ingredient_substitutes`; the planets' and deities' "as `form`" wording,
    the identity table, the SQL sketch, and §14's rows on `form`, the group
    keys and the deity vocabulary, with a new row for this decision.
  - `db/identity-model.md`, `db/deity-vocabulary.md`,
    `db/categories.md`, `db/ingredient-children.md`, `../db/README.md` and
    `modules.md`.
- **Code:** the column, the CHECK and the table, with their migration and
  schema tests (MB.165). Nothing reads or writes either yet.
- **Task text:**
  - MB.165: the order rule settled, and the position criterion.
  - MB.166: the fill keeps the array's order in `position`, dense.
  - MB.167: reads in `position` order, reorders through a scratch offset, and
    refuses a repeat at its position.
  - MB.170 minted: the reorder control, and the wrapped chips' spacing.

## Reading and writing the picked form and deities

MB.165 gave the pick a place: `ingredients.form_id` beside `form`, and
`ingredient_deities`, a name per row with the curated deity picked beside it
([`mb.165-record-the-picked-vocabulary-row.md`](mb.165-record-the-picked-vocabulary-row.md)).
MB.166 filled the table from `ingredients.deities` as unlinked names. This
task switches every reader and writer to them, and moves MB.162's compendium
rule for the form and the deities from a spelling onto the pick.
DESIGN.md §5 and §7 carry the model; this record carries the calls and the alternatives.

### The owner's calls, in scoping

**The GraphQL names follow the table: `IngredientDeityInput` and
`IngredientDeity`.** The task text named them `DeityInput` and `DeityRef`, but
MB.132 already plans a `DeityInput`, with its tradition, for the keeper's deity
CRUD.

- `IngredientDeityInput { deityId, name }` is exactly one of the two, held by
  the shared schema as `SubstituteInput` is.
- `IngredientDeity { name, deity: Deity }` reads as `Substitute` does.
- _Taking the task's names (turned down):_ MB.132 would then rename its
  input, and an ingredient-shaped type would hold the vocabulary's name.

**A `formId` needs text that is its row's name.** The `form` sent beside a
pick must fold (trimmed, lower-cased) to the picked form's name. Anything else
is a field error at `form`, and a match is written in the row's spelling.
MB.169's box drops the pick when the text is edited, so only an API caller can
send a mismatch.

- _The pick wins (turned down):_ it would replace whatever text was sent, so
  a caller sending "Root" beside Wax's id would save Wax without being told.
  Refusing rather than guessing is the `unitConvert` idiom (§11).

**`Deity` is built with its tradition.** `Deity { id, name, slug,
description, tradition: DeityTradition! }`, the tradition through a
`deityTraditionsById` loader, as `IngredientFormValue.group` is read. It is
what MB.169's "Hecate (Greek)" pill reads.

**A held deity link is kept, as a substitute's is** (decided on the plan's
review). The question was what a save does with a pick whose deity a keeper
has since retired.

- A deity row the ingredient already holds is kept whether or not its deity is
  still curated: no refusal, no tombstone, its stored name unchanged. Only a
  pick made _anew_ must name a curated deity.
- The read shows such a row as a typed name (`deity: null`), so the form sends
  back its text. The service matches a sent name to a held pick of exactly that
  text whose deity is no longer curated, and keeps that row. A re-sent
  `deityId` matches its row too.
- _Convert it to a typed name (turned down):_ every save after the retirement
  would tombstone the row and insert an unlinked twin at the same position,
  losing a link a keeper's restore (v2) would otherwise bring back.

### The calls made in the plan

**"Curated" means one thing everywhere: a live row under a live group or
tradition.** The write check, `formChoice` and `IngredientDeity.deity` all read
it, as `findCuratedRowsByName` and the suggestions already did. A pick whose row
or whose group is retired reads back as its text with no link.

- _The row alone (turned down in review):_ a form whose group is retired
  would read as a pick whose non-null `IngredientFormValue.group` could not
  resolve.

**A deity entry is exactly one of `deityId` and `name`.** A blank entry is
refused rather than dropped, as a substitute's is, so a refusal's path counts
the entries sent.

**The form's pick is not kept as a deity's is.** A `formId` sent must name a
curated form, held or not, and a save sending none clears the column. The
keep rule exists because dropping a deity link tombstones a row. `form_id` is
a column, so clearing it removes nothing: the text stays, and the read had
already shown `formChoice: null`.

**A kept pick of a curated deity takes its current spelling.** If the deity was
renamed since it was picked, the next save writes the new spelling onto the
row, in place. A kept pick of a retired deity keeps its stored name.

**The reorder moves rows through a scratch offset.**
`ingredient_deities_position_unique` is checked per row, so a swap written in
place collides with itself. The save goes in four steps:

1. Soft-delete the dropped rows.
2. Move each kept row whose position changes to `scratch + newPosition`, where
   `scratch` is one past the highest live position.
3. Move each of those rows to its new position.
4. Insert the new rows.

No row is tombstoned for moving, and no 23505 can occur. A list that changes
nothing writes nothing.

**The picks are read before the write**, on another connection, as MB.162's
spelling check already is. A keeper retiring a row at the instant a member
picks it can see that pick written; MB.148 is what moves reads into the write's
transaction.

**Repeats are refused at the repeat, in the shared schema.** That covers a deity
picked twice and a typed name repeated case-folded. It also covers a planet,
zodiac sign or colour listed twice, folded as folk names are, on either tier, so
neither unique index, nor a silently doubled list, is what a member sees.

**Only form and deity suggestions carry an `id`.** It is the curated row's,
null for a value only in use, and it is what a pick sends. Planets and signs
record no pick, so `CorrespondenceSuggestion` gains nothing.

**The in-use deities are `ingredient_deities`' live rows**, joined to their
ingredient, in place of the unnested list.

### MB.162's rule moves onto the pick

A compendium entry's form, and each of its deities, must be a pick of a curated
row, held or not. Text that names a curated row but was typed is refused beside
the field, as an uncurated value is. Planets and signs keep the spelling match,
since they record no pick. The coven tier is untouched: a pick there must be
curated when made, and typed text stays free.

MB.162's delete and rename rules for forms and deities are not built yet; they
are M5.6a's, M5.6b's and MB.132's. "Following the link" is therefore a
correction to those tasks, made here:

- A delete is refused while a live compendium entry **links** the row, and so
  is deleting a group or tradition with a row under it so linked. Amended by
  M5.6b for form groups, whose delete moves its forms to another live group
  instead, so no link is orphaned
  ([`m5.6b-admin-groups.md`](m5.6b-admin-groups.md)).
- A rename rewrites the text of the entries **linking** the row. A form's
  rename re-keys and re-slugs each.
- The "last live spelling" clause goes for forms and deities: a link names one
  row, so deleting one of two same-named forms is refused if an entry picked
  that one. Planets and signs keep the clause.
- The reverse indexes those reads want, on `ingredient_deities.deity_id` and
  `ingredients.form_id`, are M5.6a's and MB.132's to add. MB.165 left the index
  to this task's plan, which finds no read here that wants it.

### What it leaves open

- **One identity for two picks**, as MB.165 left it: two entries with one
  formal name, one picked as each Wax, share a `canonicalKey`.
- **A typed name beside a retired pick of the same text** reads as two typed
  "Hecate"s. Sent back, the second is refused as a repeat, and the member
  removes one.
- **A database seeded before this task** keeps its compendium forms unpicked
  and MB.166's unlinked deities. The seed inserts only what is missing, and
  keys a deity on its name for that reason, so it never puts a pick beside its
  typed twin at a taken position. Fresh databases and the test template are
  picked throughout.

### What it changed

- **Code:**
  - The shared schema: `formId`, deity entries, repeats.
  - `resolvePicks` and `replaceDeities` in `ingredient-rows.ts`, used by both
    services.
  - The compendium's curated check.
  - `findCuratedRowsByIds`, `findDeitiesOfIngredients` and the deities' in-use
    scan.
  - `deitiesOf`, `formChoicesOf`, `deityTraditionsOf` and their three loaders.
  - On `Ingredient`: `formChoice` and `deities: [IngredientDeity!]!`.
  - Both inputs' `formId` and `deities: [IngredientDeityInput!]`.
  - The suggestions' `id`.
  - The Drizzle schema stops declaring `ingredients.deities`, which MB.168
    drops.
  - The `standard` seed picks its compendium forms and deities.
  - `IngredientForm` sends its deities as names.
- **Docs:**
  - DESIGN.md §5 and §7.
  - `db/identity-model.md`, `db/ingredient-children.md`,
    `db/member-autofill.md`, `db/deity-vocabulary.md` and
    `db/compendium-writes.md`.
  - `validation.md`, `graphql/schema.md`, `graphql/loaders.md` and
    `modules.md`.
- **Task text:**
  - MB.167: the names.
  - M5.6a, M5.6b and MB.132: the delete and rename rules follow the link, and
    the reverse index is theirs.
  - MB.169: the types it reads.

## One rule for what counts as a repeat list entry

Live home: `claude-docs/components/ingredient-form.md`; the helper is `repeatOf` in `src/components/IngredientForm/values.ts`.

### Decision

`repeatOf(values, list, text, link?)` returns the message that refuses `text` (and `link`) as a list's next entry, or `undefined`. It mirrors the schema's keys exactly: trim each entry and fold it with `toLowerCase()`.

| List                           | A repeat when                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planets, Zodiac Signs, Colours | Folded text equals a listed entry's                                                                                                                    |
| Folk Names                     | As above, or folded text equals the ingredient's Name                                                                                                  |
| Deities                        | Linked: the same deity id is listed. Typed (no link): folded text equals a typed entry's. A typed name equal to a linked deity's name is not a repeat. |
| Substitutes                    | Linked: the same ingredient id is listed. Typed: folded text equals a typed entry's.                                                                   |

Messages read on the list's one error element: `"Mars" is already listed`; for folk names only, `"Testwort" is already the name`. The text is quoted as typed, trimmed.

### Why

The form and the schema must refuse the same repeats, so the helper mirrors the schema rather than inventing a second rule.

### Rules out

- A form-only notion of repeat that the schema would accept.

## An ingredient and its forms

An ingredient's forms used to be separate entries. This record says why they become rows beneath one entry, what each row carries, and what was turned down. DESIGN.md §5 (`ingredient_variants` and "Ingredient identity — the formal name") carries the model, and MB.216 to MB.223 build it.

### The problem

Until MB.215 an ingredient's identity was its formal name **plus its form**: `canonical_key` was `lower(coalesce(canonical_name, name))` followed by `::` and the folded form. So Rosemary as a herb, as an oil and as a powder was three `ingredients` rows. Each repeated the description, the elements, planets, zodiac signs, colours and safety notes, and each owned its own categories, deities, folk names, substitutes and references. A curator correcting Rosemary's planets corrected it three times, and a reader of the herb's page never learnt that the oil existed.

The owner wants what the forms share entered once: a parent ingredient carrying it, a child row per form carrying what is particular to that form, one page showing the ingredient and its forms, and a search that reaches the forms' details.

It is decided now because nearly everything that reads the shape is unbuilt. The detail page (M8.19), the compendium page (M8.18), the search UI (M8.10 to M8.14), the local-beats-compendium rule (M8.3), stock (M9.4), the spell services and `unitConvert` (M9.5) are all ahead, and production is not live. Only the admin compendium page, `IngredientForm`, the search SQL, the vocabulary's rename-carry and their tests read today's shape. Recording the model before any DDL transcribes it is MB.28 and MB.91's rule: cheapest to get right before anything depends on it.

### The decisions

| Question                                     | Decision                                                                                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is the child row called?                | A _variant_, in `ingredient_variants`, its GraphQL type `IngredientVariant`. `ingredient_forms` stays the curated vocabulary of form names, so a variant _has_ a form.                                                                                          |
| What is an ingredient with no variant?       | Information only. It can be read, searched and linked as a substitute, but a stock row or a spell layer names a variant. The compendium page and the entry form prompt for at least one form.                                                                   |
| What is identity?                            | The formal name alone: `identity_key = lower(coalesce(canonical_name, name))`, unique per tier (the compendium, or one workspace). A variant is unique per ingredient and folded form, `(ingredient_id, lower(btrim(form)))`.                                   |
| What happens to the slug?                    | It drops the form. Old compendium slugs retire through the existing 180-day redirects as each entry next saves.                                                                                                                                                 |
| How does a variant relate to its ingredient? | A union: a variant adds to its ingredient and never removes. There is no override and no merging of two values on read. If a form lacks a property, the curator moves the property off the ingredient onto the forms that have it.                              |
| What does a variant carry?                   | `form`, `form_id` (the curated pick), `description`, `safety_notes`, the four lists (elements, planets, zodiac signs, colours), and its own references, substitutes and categories. Deities and folk names stay on the ingredient.                              |
| What may substitute for a form?              | Any ingredient, or any variant of one: leaves for stems, or a different ingredient altogether. The picker ranks a matching form first, then the same form group, then the rest. The "not itself" check refuses only the same ingredient _and_ the same variant. |
| What does search reach?                      | A variant's form and description, still returning one row per ingredient.                                                                                                                                                                                       |
| How is a variant written?                    | Inside the ingredient's own save, one transaction for the whole entry. There are no variant mutations.                                                                                                                                                          |

### The model

**`ingredient_variants`**: `id`, `ingredient_id` (NOT NULL, to `ingredients`), `form` (text, NOT NULL, never blank), `form_id` (nullable, to `ingredient_forms`), `description`, `safety_notes`, `elements` (`ingredient_element[]`), `planets`, `zodiac_signs`, `colors`, and the audit columns. One live row per ingredient and folded form. A unique index on `(id, ingredient_id)`, not partial, is what the composite foreign keys below point at; a foreign key cannot point at a partial index, and this one reserves nothing the primary key does not, so it is the one named exception to "every unique index is partial". An index on `form_id` over live rows serves the vocabulary's reads of who picks a form, and a trigram index over the accent-folded form and description serves the search. The table carries no `workspace_id`: like every child of an ingredient it takes its parent's tier, and is read only beneath its parent.

**`ingredients.identity_key`**: a generated column, `lower(coalesce(canonical_name, name))`, unique per tier as `ingredients_compendium_identity_key_unique` and `ingredients_workspace_identity_key_unique`. The old `canonical_key`, `form` and `form_id` stay on the row, unread after MB.222, until MB.223 drops them.

**The children of a variant name both ids.** `inventory_items`, `spell_ingredients`, `ingredient_categories` and `ingredient_substitutes` reach a variant through a composite foreign key, `(variant_id, ingredient_id) → ingredient_variants (id, ingredient_id)`, so no row can pair one ingredient with another ingredient's variant. The key is `MATCH SIMPLE`, which skips the check when either column is null, so where `ingredient_id` may be null a CHECK pairs the two.

- `inventory_items.variant_id` is NOT NULL, and a coven holds one live row per variant: Rosemary herb and Rosemary oil are two rows.
- `spell_ingredients.variant_id` is set exactly when `ingredient_id` is, and a jar lays a variant once, so it may hold Rosemary herb and Rosemary oil.
- `ingredient_categories` gains a nullable `variant_id`. A pair with none files the ingredient; a pair with one files that form, and still carries the `ingredient_id`.
- `ingredient_substitutes` gains `variant_id`, the form a row is a substitute _for_, and `substitute_variant_id`, the form of the linked ingredient it names, which needs a link beside it.
- `reference_links` gains one more sourced column, `ingredient_variant_id`, through the registry of sourced tables that already builds the others.

**The union rule, as code.** `Ingredient.categories`, `substitutes` and `references` are the ingredient's own rows, those with no variant; `IngredientVariant`'s are that form's additions; nothing merges the two. The compendium's category filter matches the union for free, since a variant's pair also carries the `ingredient_id`. An entry counts as sourced, for the keeper's to-do list, if it or one of its live variants cites a reference. A spell's derived categories are the ingredient's pairs plus the layer's variant's.

**An example.** Rosemary, _Salvia rosmarinus_, is one compendium entry at `/compendium/ingredients/rosemary-salvia-rosmarinus`. The ingredient holds its description, `Fire`, the Sun, its folk names, its deities and the categories every form shares. Its Herb variant adds nothing it does not need to. Its Oil variant adds the oil's own description, the safety note "dilute before it touches the skin", the monograph that covers the oil, and "for anointing". The page shows the ingredient, then a section for each form, the oil's at `#form-oil`.

### Why those children

The question was which of an ingredient's properties belong to a form. The answer follows what the sources attach to a form and what they attach to the plant.

- **References and safety notes are per form.** The European Medicines Agency writes one herbal monograph per plant part or preparation: its template is titled for a plant, a plant part, or the essential oil (_aetheroleum_), each with its own uses and cautions (European Medicines Agency 2024). An essential oil concentrates a great deal of plant into a little liquid — about a hundred roses go into one drop of rose oil — so it is diluted before use, and carries contraindications and routes the dried herb does not (Sustainable Agriculture Research and Education; American College of Healthcare Sciences).
- **Substitutes are per form, but not bound to a form.** Cunningham's substitution lists are organised by use and property rather than by part, and a formula swaps within its kind by convenience, not by rule (Cunningham 1985; Cunningham 1989). The owner's examples, leaves for stems or a different ingredient altogether, are ordinary. So a substitute hangs off the form it replaces and may link anything, and a similar form is a ranking in the picker, not a constraint.
- **Categories are mostly the plant's, sometimes a form's.** Correspondence references attribute "powers" to the plant, with parts and preparations beneath (Cunningham 1985). "For anointing" is a real but occasional use of one form, and the join table is cheap to widen with a nullable column.
- **Deities and folk names are the plant's.** The rose is Aphrodite's; its oil is a use of it ("Fragrance in Ancient Greece"). The deities table is ordered and its rows link curated deities, which makes it the costliest child to split, for the weakest case. Folk names name the plant.

### What was rejected

- **A `parent_id` on `ingredients` pointing at another `ingredients` row.** It is the cheapest migration, but it puts two kinds of row in one table. A form row listed where only ingredients belong would be merely _absent_ from each list, kept out by every query remembering to, never _impossible_; and the formal name would be duplicated onto every form row and kept in step by hand.
- **Prefilling a new entry from an existing one.** It copies rather than shares: the next correction to Rosemary's planets would again be made three times.
- **Override semantics**, where a variant may replace an inherited value. Every read would have to merge the variant's value over the ingredient's, every join table would need an "explicitly none" flag so a form could say it has no categories, and changing one element on a form would mean re-entering its whole list. Under the union rule a property true of only some forms simply lives on those forms.
- **Separate mutations for variants.** The entry form saves the whole entry in one `withAudit` transaction. Variant mutations would need a second tier check, a second mapper from a unique-index collision to a field error, a cache expiry per variant, and several round trips per save, any one of which could fail halfway.

### What it costs

- **A window in which two models coexist.** From MB.216 to MB.223 the row keeps `canonical_key`, `form` and `form_id` beside `identity_key` and the variants. MB.219 writes both until MB.222 stops reading the old columns, and `tests/db/schema-drift.test.ts` declares each column awaiting its drop in `PENDING_DROPS` until MB.223 removes it.
- **A refusal before the switch.** The identity index lands with MB.216, before MB.220 maps it to a field error, so for that short window a keeper trying to add "Rosemary, oil" as an entry beside the herb is refused with an unmapped index name. It is admin-only, and the answer is the variant MB.219 adds.
- **A guard that may stop a deploy.** MB.216's migration refuses a database holding two live entries of one formal name in a tier, rather than merging them. No seeded or live database holds such a group, so the guard is expected never to fire; if it does, the procedure below is how to clear it.

### Merging a group

A _group_ is two or more live entries in one tier sharing a formal name — under the old model, one plant entered once per form. MB.216's migration `0062` refuses to run while one exists, naming this section. Merging is a **hand procedure**, not a migration or a tool, because no such group exists in any seed or live database, a general merge is v2's duplicate merge tooling (DESIGN.md §13), and a migration that merged could not be tested against data that does not exist.

Drizzle applies every pending migration in one transaction, so a refused `0062` rolls back `0061` too and the database is left as it was: the merge runs against the old schema, before `ingredient_variants` exists, and the merged form is added as a variant once the migrations have applied.

1. **Find the groups.** Run the pre-flight query MB.216 names, on the database the deploy will migrate. Each row is a group: its tier (`workspace_id`, null for the compendium), its key and how many live entries share it.

   ```sql
   select workspace_id, lower(coalesce(canonical_name, name)), count(*)
   from ingredients
   where deleted_at is null
   group by 1, 2
   having count(*) > 1;
   ```

2. **Pick the entry to keep.** List the group's entries with their label, form, slug and description. Keep the one whose label and description should stand for the plant — usually the plainest form, such as the herb. Each of the others is, below, _the other_.
3. **Record the other's form.** Copy out what will become its variant: `form`, `form_id`, and its `description`, `safety_notes`, `elements`, `planets`, `zodiac_signs` and `colors` where they differ from the kept entry's. Under the union rule, a value both entries hold belongs on the kept entry; a value only the other holds belongs on the variant.
4. **Move its children across where they differ**, in one transaction that sets `app.current_user_id` to your user id and stamps `created_by` and `updated_by` with it, as `claude-docs/auth/admin-bootstrap.md` shows for a hand fix:
   - **categories**: insert each of the other's `ingredient_categories` pairs the kept entry lacks, for the kept entry;
   - **substitutes**: move each live row the kept entry does not already list to the kept entry (`update … set ingredient_id`), except one linking the kept entry itself, which would then substitute for itself;
   - **references**: move each live `reference_links` row citing a reference the kept entry does not cite, keeping its `locator`;
   - **deities**: move each live row naming a deity the kept entry lacks, its `position` placed after the kept entry's last;
   - **folk names**: move each live name the kept entry lacks, and add the other's label as a folk name if it differs from the kept entry's label.

   What is not moved stays with the other, and goes with it when it is soft-deleted.

   Leave the other's spell layers where they are: a spell keeps reaching an ingredient that is later deleted (M5.3), and `0062` gives a soft-deleted entry its own variant, so each such layer still names the form it laid. `inventory_items` is empty in every database until M9.4; if it is not, stop and ask.

5. **Soft-delete the other** (`deleted_at`, `deleted_by`), which frees its slug.
6. **On the compendium tier, retire the other's slug** as a 180-day redirect to the kept entry: insert a `retired_ingredient_slugs` row with the kept entry's `ingredient_id`, a null `workspace_id` and the other's `slug`. A coven's entry retires nothing, since no route reads its slug.
7. **Re-run the guard**: the pre-flight query returns no row, and `npm run db:migrate` applies `0061` and `0062`.
8. **Add the recorded form to the kept entry** as a variant, with the values from step 3: by hand once `0062` has applied, or in the entry form once MB.219 and MB.221 have landed. If a reference, substitute or category was the other's alone because it was true of that form only, move it from the kept entry onto the new variant once MB.217 has added the variant columns.

### Sources

- American College of Healthcare Sciences. "Understanding Cautions & Contraindications for Herbs & Oils." ACHS Blog. Accessed October 11, 2026. https://achs.edu/blog/cautions-contraindications-for-herbs-oils/. (Reviewed by Amanda Lattin, ACHS Dean of Aromatherapy.)
- Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985.
- Cunningham, Scott. _The Complete Book of Incense, Oils and Brews_. St. Paul, MN: Llewellyn Publications, 1989.
- European Medicines Agency, Committee on Herbal Medicinal Products. "Template for a European Union Herbal Monograph." EMA/HMPC/107436/2005 Rev. 8. Amsterdam: European Medicines Agency, November 20, 2024. Accessed October 11, 2026. https://www.ema.europa.eu/system/files/documents/template-form/template-hmpc-european-union-herbal-monograph_en_0.pdf.
- "Fragrance in Ancient Greece: Mythical Origins." Scento. August 21, 2026. Accessed October 11, 2026. https://www.scento.com/blog/fragrance-ancient-greece-mythical-origins.
- Sustainable Agriculture Research and Education. "Essential Oils: Pure Botanical Distillations." SARE Projects. Accessed October 11, 2026. https://projects.sare.org/media/pdf/e/s/s/essential-oils.pdf.

## A researched, sourced compendium seed

Live home: `claude-docs/compendium/compendium-seed/README.md` (the rules every entry is written to), with the roster in `claude-docs/compendium/compendium-seed/candidates.md`. M14.4 moved the seed to one markdown file per entry (`claude-docs/design-decisions/m14.4-compendium-markdown-files.md`).

### Decision

Staging and production start with a researched, sourced compendium rather than an empty one a keeper fills by hand. The owner's binding rule: "Do not make stuff up. All claims must have sources."

- **Size.** Entries keyed by formal name; forms are extra rows beneath them and do not count. A ceiling of 1,111 entries (first 614, widened by the owner); the roster stops at what its sources yield and is never padded to the ceiling.
- **Depth.** Cunningham's: 100 to 250 words of description per entry, at most 120 per form.
- **Evidence.** A value rests on a source the lane read during its task: a page of the owner's books or a page it fetched. Wikipedia is a valid source. A value with no source is left out, and a candidate nobody could source is listed as left out.
- **Not a scenario.** It is reference data with its own target, `db:seed:compendium`, run by `migrate.yml` after the five vocabularies and their sources. `standard` is cloned for every db test and stays the fixture it is.
- **Write-once.** A present entry is skipped with all its children; the run that inserts an entry writes everything beneath it. A correction is made in the admin page and the seed edited to match. Presence is `seed_key` on `ingredients` (MB.241), or a live row with that identity or slug. Renaming a seeded key would insert the entry again beside itself.
- **Shards.** Six content shards of 48 to 136 entries, each its own task, pull request and research lane, after a 14-entry pilot that proved the shape on real data.
- **Facts.** Every citation carries `supports`, the fields it backs, and a guard fails a populated field no citation covers. Each shard doc records its bibliography and one source line per entry.
- **Books.** The owner's copies in `/app/.library/`, git-ignored and guarded by a test; `npm run library:text` (`scripts/library-text.ts`) makes them searchable. A citation names the edition in hand and the number printed on the page, not the PDF page offset. An entry-ordered EPUB is cited by heading (`under "Mugwort"`). `Master Book Of Herbalism PDF.pdf` is a Bookey summary and is never cited; Kynes's `9780738732534.pdf` is a 37-page excerpt without its plant, mineral and animal chapters; the crystal encyclopedia and the 1903 _Book of Herbs_ are OCR text, so a spelling is checked against the page.
- **Curated values only.** An entry names only forms, categories, deities, planets and signs by their seed files' spelling, picked through `seed_key`, and colours from a closed list.
- **Stones.** A named sort sold and worked as itself (Apache tear, Herkimer diamond, chevron amethyst) is an entry, named as Wikipedia or Mindat heads it, `nomenclature: 'mineral'`; `<Species> var. <variety>` only where a source names the variety so, and the first 614 rows' `var.` names stand. Laboratory-treated stones Hall heads (aqua aura, titanium quartz) are entries and say they are treated. Crystal formations (cluster, point, wand, elestial, phantom and the rest) are forms beneath Clear Quartz, and a geode is a form of its stone. A species a source heads or gives its own correspondences is its own row; otherwise it stays under "left out".
- **Pilot calls.** Sandalwood's Bead form and Hematite's Pigment form stay; Florida Water's safety note stands; Zeus stays on Honey.

### Why

A stone sold under its own name has correspondences of its own, and a form beneath its mineral would hide it from the list and fold those into a parent that does not share them. A variant is only ever a physical form. Write-once keeps a reseed from undoing what a keeper changed.

### Rules out

- **Compressing the seed.** Git already packs this seed text 9.5 to 11.8 times, and a gzipped copy deflates to the same size in git. A compressed file is unreviewable and loses git's delta storage on every edit.
- **Git LFS.** It spends the account's free bandwidth on a problem a hundred times smaller than the one it solves, and puts the seed outside a plain clone.
- **One TypeScript file per entry, or the entries repeated in markdown beside a literal.** Both were set aside here for shards over a single literal, then reversed by M14.4: the seed is one markdown file per entry and that file is the source of truth, not a copy.

## The planets are Celestial Bodies wherever a person reads them

**Decided:** the keeper-curated vocabulary that holds the Sun and the Moon, Mercury through Pluto, Earth, Chiron, Ceres, Pallas, Juno, Vesta, Lilith and the two lunar nodes is called **Celestial Bodies** on every screen. Its code, GraphQL and database names keep `planets` for now, a recorded and temporary divergence that MB.252 to MB.254 end.

### Why

Nineteen values live in this vocabulary and most of them are not planets. DESIGN.md §5 already called them "bodies". The name "Planets" was therefore wrong on the screen a person reads, and the owner asked for it to change.

The old name is also in production (release 0.6.0), in the table, a list column, a link column, the GraphQL schema and the admin URL. Renaming all of that in one task would mean a database change and a code change that cannot ship in the same deploy (a write made by the old code after the migration would land only in the old column). So the rename is cut in two: what a person reads changes first, in MB.251, and the names underneath follow as scheduled tasks.

### What a person now reads

- **The Astrology section.** The tab, the page title, the filter, the empty and no-match text, every dialog title and the buttons: Celestial Bodies, Add Celestial Body, Save Celestial Body, Delete Celestial Body. The section's description says "celestial bodies". Most of this is the one `planet` entry in `src/components/GroupedValueList/kinds.ts`.
- **The ingredient form.** The list field and each variant's read "Celestial Bodies", the entry box "Celestial Body" and the placeholder "Add a body". The variant and substitute summaries carry the same labels.
- **The refusals shown in those forms**, such as "No such celestial body".

### The URL changes, with no redirect

`/admin/planets` becomes `/admin/celestial-bodies`. The old path is a 404. The page is admin-only, so there are no search-engine rankings or public links to keep, and CLAUDE.md asks for no hooks beyond the design.

### The divergence, and who ends it

These keep the word `planets` until MB.253 and MB.254, as `workspaces` and `/coven/` do (§5):

- the `planets` table, `ingredients.planets`, `ingredient_variants.planets` and `reference_links.planet_id`
- the GraphQL names `Planet`, `PlanetInput`, `createPlanet`, `updatePlanet`, `deletePlanet`, `planets`, `planetSuggestions`, and the `planets` field on ingredients, variants and their inputs
- the code that uses them, including `kind: 'planet'`, `usePlanetSuggestions` and `PLANETS`

| Task   | What it does                                                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MB.252 | Expand: renames the `planets` table to `celestial_bodies`, with a `planets` view over it for the live code, and adds the new list and link columns beside the old ones, filled from them. Nothing reads them yet. |
| MB.253 | Switch: the code and GraphQL names move to `CelestialBody` and friends, and every reader and writer moves to the new columns.                                                                                     |
| MB.254 | Contract: drops the old columns and the `planets` view, and removes the divergence notes from DESIGN.md and CLAUDE.md.                                                                                            |

**Do not "fix" the divergence early.** A session that finds `planets` in code or GraphQL while the screen says Celestial Bodies is looking at this decision, not a mistake. Each of the three tasks has its own migration or deploy order that the rename depends on.

## A formal name is required in the compendium only

The identity rule itself (identity is the formal name alone) is in CLAUDE.md, "Domain invariants that are easy to get wrong".

**Decided:** a compendium entry must carry a formal name. A coven's own ingredient need not.

### Why

- A safety note on an ambiguous label is the dangerous case, so the curated tier must carry a formal name.
- Demanding one locally would break story 29's one-field stub.
- Some ingredients have no formal name in any system (graveyard dirt), and some have a chemical one (salt).

## No external taxonomic identifiers

**Decided:** the schema holds no identifier from POWO, IPNI, GBIF, CAS or IMA.

### Why

Nothing reads one, CLAUDE.md forbids hooks for unbuilt features, and taxonomic identifiers churn. A nullable text column is purely additive later, so declining now costs nothing.
