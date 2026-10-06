# MB.151 — A reference is one source, kept once, rendered in Chicago form

**Status:** decided · **Date:** 2026-10-06

MB.127 settled, on the owner's request, that every compendium entry carries a
references section and that a reference is one table any sourced row links,
rather than a child of `ingredients`. DESIGN.md §5, "References", records the
owner's decisions: Chicago bibliography form; two tiers, as ingredients are,
with MB.138's rule on what a row may link; optional on an entry, with an
admin's to-do filter; and the vocabulary seeds' sources written as rows. This
record settles what those leave open, and why. The build is MB.152 (the
tables), MB.153 (the services and the renderer), MB.154 (the form), MB.155
(the page) and MB.156 (the seed). DESIGN.md §5 carries the model; this record
carries the alternatives. The scoping plan is
[`mb.151-plan.md`](mb.151-plan.md).

## What the research changed

MB.156 renders every source in
[`db/deity-vocabulary-seed.md`](../db/deity-vocabulary-seed.md) to the doc's
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

## Decided

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
  is reusable, and sweeping it would delete a coven's record, or an admin's
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

## What MB.156 inherits

Amendments to its entry, not work done here. The doc is normalised before the
seed parses it:

- The comma-form `Wikipedia, s.v. "…," last modified …` lines become period
  form.
- Embedded locators move onto links.
- "Revised" becomes "Last modified", and "Originally published in …" and the
  unparenthesised "Existence confirmed at …" become notes.

## What it changed

- **Docs:**
  - DESIGN.md §5 (both tables, their CHECKs and indexes, the tier, order,
    delete and ownership rules, and the rendering per kind), §7
    (`Reference`, `ReferenceLink`, `ReferenceKind`, `LocalDate`,
    `Ingredient.references`, `referenceSuggestions`, `withoutReferences`,
    `createReference`, `updateReference`), §9 (the locator beside each
    citation) and §14 (four rows).
  - [`db/references.md`](../db/references.md), new, and its row in `db.md`.
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
