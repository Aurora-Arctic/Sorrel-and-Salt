# MB.132 — The admin deity pages: the slug, the tradition's delete, one form

**Status:** decided · **Date:** 2026-10-09

MB.132 puts the deity vocabulary and its traditions on the forms' and form
groups' page shapes ([`m5.6a-admin-forms.md`](m5.6a-admin-forms.md),
[`m5.6b-admin-groups.md`](m5.6b-admin-groups.md)) and builds MB.162's delete
and rename rules for deities, on the pick since MB.167
([`mb.162-compendium-holds-curated-values.md`](mb.162-compendium-holds-curated-values.md),
[`mb.167-read-and-write-the-pick.md`](mb.167-read-and-write-the-pick.md)).
The task entry left one question open, and building it raised three more.
The owner settled all four. [`db/deity-vocabulary.md`](../db/deity-vocabulary.md),
"The admin's writes", carries the rules as built.

## A tradition with live deities

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

## A deity's slug is its name and its tradition's

The seed slugged a deity by its name alone, and the slug index is global, so
an admin could not add a Roman Hecate beside the Greek one — yet
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

## The rename's rewrite is a writer method

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

## One form and one list for every grouped vocabulary

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

## Every group page numbers its pages, through one helper

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

## Calls made without asking

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
