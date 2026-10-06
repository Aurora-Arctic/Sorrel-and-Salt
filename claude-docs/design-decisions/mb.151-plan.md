# MB.151 — Record the references model

## Context

MB.151 is documentation and scoping only, in MB.138's shape: it settles what DESIGN.md §5 "References" leaves open, so MB.152 (tables), MB.153 (behaviour), MB.154 (form), MB.155 (page) and MB.156 (seed) transcribe it. The owner's decisions are already recorded: Chicago bibliography form, two tiers with MB.138's tier rule, optional on an entry with an admin to-do filter, and the seed docs' sources written as rows.

**What the research changed.** MB.156's criterion renders every source in `db/deity-vocabulary-seed.md` "to the doc's own text". The task's column list can't reach that text. Counted over the doc's 334 citation lines:

| Shape                                                   | Lines |
| ------------------------------------------------------- | ----: |
| `s.v.` reference-work entries (Wikipedia, _VLE_, …)     |    79 |
| A last-modified date                                    |    89 |
| Read through an online host (Perseus, Encyclopedia.com) |    48 |
| A translator or an editor                               |    29 |
| A parenthetical note                                    |    19 |
| A series, or a volume count                             |   ~12 |

So the column set below is the task's list, plus four columns and one kind, each with its count as its reason.

Worktree: `/home/node/worktrees/mb.151-record-references-model`, on `feature/mb.151-record-references-model`. The task is already In Progress.

## Decisions

Each one goes into the record with its reason and the alternative it beats.

### 1. Kinds: `book`, `chapter`, `article`, `entry`, `web_page`

These are the task's five, with **`entry` replacing `other`**:

- **Why `entry`:** an `s.v.` reference-work entry is the doc's most common shape (79 lines), and Chicago renders it differently from a chapter (CMOS 14.232–14.233).
- **Why not `other`:** it would have no specified rendering, so it would render a guess. Every doc source fits the five once MB.156 normalises the doc.
- **Why `book` and `chapter` stay two kinds**, the owner's call. Chicago renders them differently: a chapter's title is quoted and its book becomes an italic container after "In", with the book's editors and the chapter's pages. Both fit the same columns, so they could merge into a `book` with an optional container, but then a chapter saved without its book would save as a book titled with the chapter's name, italicised wrongly and with no error. Kept apart, the form leads with the kind and labels "Chapter title" and "Book", and a CHECK requires a chapter's container. The mistake becomes impossible instead of merely absent.
- **The enum:** `reference_kind`.

### 2. `references` columns

Besides `id`, `workspace_id` (nullable: null is the compendium tier, as on `ingredients`) and the six audit columns, every column is text except the two dates. "As printed" means the writer types the wording; the renderer adds the punctuation for the kind.

| Column         | Holds                                                                                       | Note                 |
| -------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| `kind`         | One of the five kinds                                                                       |                      |
| `authors`      | As Chicago prints them, first inverted, with any role ("…, eds.")                           | Not structured names |
| `title`        | Not null                                                                                    |                      |
| `container`    | The book of a chapter, journal of an article, reference work of an entry, or site of a page |                      |
| `contributors` | "Translated by Angela Hall"                                                                 | **Added**, 29 lines  |
| `edition`      |                                                                                             |                      |
| `volume`       | The number for an article; the volume statement for a book ("2 vols.")                      |                      |
| `issue`        |                                                                                             |                      |
| `series`       | "Handbooks of World Mythology"                                                              | **Added**, ~12 lines |
| `place`        |                                                                                             |                      |
| `publisher`    | The publisher, or a site's owner                                                            |                      |
| `published`    | Text: "1985", "November 1950", "Summer/Autumn 2013", "1882–88"                              |                      |
| `pages`        |                                                                                             |                      |
| `host`         | The repository a print work was read through                                                | **Added**, 48 lines  |
| `url`          |                                                                                             |                      |
| `modified`     | `date`                                                                                      | **Added**, 89 lines  |
| `accessed`     | `date`                                                                                      |                      |
| `note`         | A short annotation, shown after the citation in parentheses                                 | 19 lines; task asked |

Why these shapes:

- **`authors` as printed text** beats a structured name list. Name order isn't mechanical across this doc ("Snorri Sturluson", "Ovid", Chinese and Igbo names), and a list would need a name grammar the renderer would get wrong.
- **`published` as text** beats a `date` column, because Chicago dates come at a year's, a month's, a season's or a range's precision.
- **`accessed` and `modified` as dates**, because each is always a full day, and the renderer writes "October 6, 2026".

### 3. CHECKs

**The renderer is total over every row the table admits.** The CHECKs below make that so.

- Every text column is non-blank when set.
- `url` matches `^https?://`.
- `accessed` is set only with a `url`.
- `chapter`, `article` and `entry` require `container`.
- `web_page` requires `url` and `accessed`.
- Zod (MB.153) mirrors these with field messages, plus "a book needs a date".

### 4. Uniqueness on `references`: none

Two rows may be the same book. Nothing identifies a source short of a librarian:

- A unique index on any subset of fields refuses a legitimate second edition or translation.
- A unique index on all of them catches only exact repeats, which the picker already steers away from by offering the existing row.
- The seed is idempotent by rendered citation (MB.156).

### 5. Links: one `reference_links` table, MB.40/MB.138's shape

- **Columns:** `id`, `reference_id` (not null), one nullable foreign key per sourced table (`ingredient_id`, `deity_id`, `deity_tradition_id`, `planet_id`, `zodiac_sign_id`), `locator`, and the full audit spread. It is soft-deleted, as `ingredient_substitutes` is: a link is content, and v2's history restores it.
- **CHECK:** `num_nonnulls(ingredient_id, deity_id, deity_tradition_id, planet_id, zodiac_sign_id) = 1`.
- **Indexes:** one partial unique index per sourced column, `(ingredient_id, reference_id) WHERE ingredient_id IS NOT NULL AND deleted_at IS NULL` and so on. Each leads on the row, so it also serves the read by row, as `ingredient_deities_position_unique` does. That is "one link per reference per row".
- **No index on `reference_id`:** nothing in v1 reads from a reference back to its links, and a reference is never hard-deleted. This is MB.138's reason for building no index on `substitute_id`.
- **Why not a join table per entity:** that is five tables today, each with its own trigger line, `AUDITED_TABLES` entry, finder and loader, and one more table per new sourced entity. Here a new sourced table costs a column, its index and a widened CHECK (a `DROP CONSTRAINT` under an `.ack.md` sidecar, as MB.161's was).
- **Not sourced:** categories and forms, which are the project's own design.
- **The tier rule is the service's**, as MB.138's is: a link from a compendium entry or a vocabulary row names a compendium reference (`references.workspace_id IS NULL`), a coven ingredient's link names the compendium's or its own coven's. A CHECK cannot read the reference's row, so MB.153 refuses it as a field error pathed to the entry, and the read ANDs the same rule.
- **Who edits a reference:** a compendium reference only under the `SiteAdmin` proof, a coven's only under its `Membership`, whoever links it. A member who links a compendium reference reads it and cannot change it.

### 6. What a link carries: `locator` alone

- It is nullable and non-blank: "p. 112", "chap. 13", "s.v. Hecate". Free text, because Chicago's locators vary by kind of work.
- The renderer leaves it out of `citation`, since a bibliography entry names the work, not a page. MB.155 shows it beside the citation.
- Embedded locators in the doc (Grimm's "Vol. 1, chap. 13", Tacitus's "Chap. 40") move onto links in MB.156.

### 7. Order: alphabetical by the rendered citation, sorted in the service

- **The sort key:** the plain citation, ignoring leading quotation marks and an initial "A", "An" or "The" (CMOS 14.67), compared with `localeCompare(…, 'en', { sensitivity: 'base' })`.
- **Where it sorts:** in the service, as `folkNamesOf` sorts. The citation exists only in TypeScript, and nothing stores an order.
- **Why the picker's search differs:** rule 7 filters in SQL, so `referenceSuggestions` matches over `authors`, `title` and `container`, accent-folded with word similarity as the compendium search does, not over "the rendered citation". This amends MB.153.

### 8. Owner: the `ingredients` module, not a sixth

- **Why not `vocabulary`:** the link table holds foreign keys into `ingredients`, which `vocabulary` may not import.
- **Why not a new module above `ingredients`:** MB.153 writes an ingredient's links in the ingredient's own `withAudit` transaction. That puts the call in `ingredients`' service, so `ingredients` would have to import the new module, which is a cycle.
- **What it costs:** `vocabulary` can't read a deity's references itself. Nothing does in v1 except the seed, which reaches schema files directly. A later `Deity.references` field is added from `ingredients`, as `User.memberships` lives in `coven`.
- **Compendium extraction:** the compendium-tier references join the tier seam's extraction unit (compendium tier plus `vocabulary`). MB.153's finders join `TIER_SEAM`.

### 9. Delete rule

**v1 has no `deleteReference`.** The v1 writers are the ingredient form (`createReference`, `updateReference`, and links inside the ingredient save) and the seed. The admin vocabulary pages gain no field.

- **Unlinking:** soft-deletes the link through the ingredient's save, as a folk name is replaced.
- **A reference whose every link is gone:** stays live and suggested. A source is reusable, and sweeping it would delete a coven's record, or an admin's seeded row, behind their back.
- **If a reference is ever soft-deleted** (v2, or by hand): its links are untouched, and the read joins live references only, so it leaves every bibliography and a restore returns it. The opposite of MB.138's substitute exception is the right call here. A deleted reference is a retracted source, where a deleted ingredient is a fact a member recorded. And keeping the links needs no cross-tier write and no new rule-4 exception.
- **An edit reaches every row linking the reference.** That is the point of keeping a source once. A compendium-tier edit calls `revalidateTag('compendium')`.

### 10. GraphQL shape

- **`Reference`:** the fields, `isGlobal`, and `citation: String!`, which is Chicago bibliography form in plain text with italics dropped, for sorting, chips and screen readers.
- **`Ingredient.references: [ReferenceLink!]!`**, where `ReferenceLink { reference: Reference!, locator: String }`. It reads alphabetically through a loader and is `[]` when empty. The wrapper exists because the locator belongs to the link, not the reference.
- **Dates:** `accessed` and `modified` as graphql-scalars' `LocalDate` (MB.153 adds the scalar). This is the standard tool.

### 11. Italics, and where the renderer lives

- **The renderer** is `renderCitation(ref): CitationPart[]` in `src/lib/citation.ts`, returning parts of `{ text, italic }`. It is pure and client-safe, beside `slugify`, because the page, the picker, the service's sort and the seed test all call it, and it imports nothing from a module.
- **Who draws italics:** a surface that shows them (MB.155's `<cite>`) renders the parts itself. `citation` is the parts joined.
- **The kind supplies the default italics:** a book's title, and a chapter's or article's container. An entry's container and a web page's site are roman by default, as "Wikipedia" and "World History Encyclopedia" are in the doc, so a published reference work used as a site is marked by the writer.
- **A field may mark italics itself** with `_…_` in `title`, `container` or `note`, under CommonMark's rule that an underscore inside a word is not a mark. That handles a published work's name as a site (`_Internet Encyclopedia of Ukraine_`), a title inside a title, and a note's journal name, while leaving `Greek_Mythology` in a URL alone. A marked span inside a field the kind already italicises renders roman (CMOS 14.94). `url` is never parsed.
- **The test form:** the seed's and the page's tests join the parts with `_` around italic ones, which is exactly the doc's Markdown, so the comparison is string equality. A stated limit: a roman span inside an italic field has no spelling in that form, since CommonMark does not nest one marker inside itself. No source in either doc needs one.
- **Why not a Markdown library:** one inline marker on three columns, and the dependency would still need the intraword rule pinned by test. The alternative without markup is a `containerItalic` boolean and no italics in a note; the marks were chosen because the doc already carries them and the seed test stays string equality.
- **Why not `citation` with marks in it:** the client would need a Markdown parser, and a URL's underscores make that ambiguous.

### 12. Rendering per kind, one example each from the deity doc

Each rule is written out field by field in DESIGN.md §5, with optional fields dropping cleanly.

| Kind       | Example                                                                                                                                                                                                                                                 | Shows             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `book`     | Simek, Rudolf. _Dictionary of Northern Mythology_. Translated by Angela Hall. Cambridge: D. S. Brewer, 1993.                                                                                                                                            | contributors      |
| `book`     | Smith, William, ed. _A Dictionary of Greek and Roman Biography and Mythology_. London: John Murray, 1873. Perseus Digital Library, Tufts University. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104. | host              |
| `book`     | Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985. (Each entry names the herb's deities.)                                                                                                     | note              |
| `chapter`  | Pope, Marvin H. "Anath." In _Encyclopaedia Judaica_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath.                                                   |                   |
| `article`  | Nwokocha, Eziaku Atuama. "An Equilibrist Vodou Goddess." _Harvard Divinity Bulletin_, Summer/Autumn 2013. Accessed October 6, 2026. https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/.                                                     |                   |
| `entry`    | Wikipedia, s.v. "Guanyin." Last modified December 28, 2024. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Guanyin.                                                                                                                            | roman site name   |
| `entry`    | _Visuotinė lietuvių enciklopedija_, s.v. "Perkūnas." Vilnius: Mokslo ir enciklopedijų leidybos centras. Accessed October 6, 2026. https://www.vle.lt/straipsnis/perkunas/.                                                                              | marked container  |
| `web_page` | Cartwright, Mark. "Greek Mythology." World History Encyclopedia. July 29, 2012. Accessed October 6, 2026. https://www.worldhistory.org/Greek_Mythology/.                                                                                                | underscore in URL |

- **An article with a volume** renders `_Journal_ 51, no. 2 (1988): 399.` No top-level doc entry has one, so the rule is stated in prose and MB.153's test adds an invented-name case.
- **Both dates:** published, then "; last modified …", as on line 723 of the doc.

## What MB.156 inherits

These are amendments to its task entry, not work done here. The doc must be normalised before the seed renders it:

- The comma-form `Wikipedia, s.v. "…," last modified …` lines (20 in the lists, more in the per-deity prose) become period form.
- Embedded locators move to links.
- "Revised" becomes "Last modified", and "Originally published in …" and the unparenthesised "Existence confirmed at …" become notes.

## Files

All in the worktree.

**New:**

- `claude-docs/design-decisions/mb.151-references.md`: the record, decisions 1–12, MB.138's layout ("Decided" with alternatives, then "What it changed").
- `claude-docs/design-decisions/mb.151-plan.md`: this plan, copied on approval.
- `claude-docs/db/references.md`: the long form, in the shape of `db/deity-vocabulary.md`.

**Edited:**

- **`DESIGN.md`:**
  - §5: replace the "References" paragraph's last sentence with both tables, their columns, CHECKs and indexes in SQL blocks like `ingredient_substitutes`', then the tier, link, order and delete rules, and the per-kind rendering.
  - §7: add `Reference`, `ReferenceLink`, `ReferenceKind` and `Ingredient.references`; add `referenceSuggestions` and `withoutReferences` to `Query`; add `createReference` and `updateReference` to `Mutation`.
  - §9: the `/ingredients/[id]` row adds "each with its locator".
  - §14: add rows for the link table, the owning module, the delete rule, and the kinds and columns.
- **`db.md`:** a "References (MB.151; tables MB.152)" section pointing to `db/references.md`.
- **`modules.md`:** the ownership row for `ingredients` gains `references` and `reference_links`, and "The tier seam" notes MB.153's finders.
- **`tasks/mb.md` entries:**
  - MB.152: the exact columns, CHECKs and indexes, the `ingredients` module, and no `reference_id` index.
  - MB.153: `ReferenceLink`, search over the fields, the plain `citation` plus parts, the sort key, the `LocalDate` scalar, and `TIER_SEAM`.
  - MB.154: the chip reads the plain citation.
  - MB.155: renders the parts.
  - MB.156: the normalisation above.
  - Then `node scripts/task-board.mjs sync MB.152 MB.153 MB.154 MB.155 MB.156` in the same turn.

**Not touched:** code, `CLAUDE.md` (rule 4 gains no exception), and the deity doc itself, which is MB.156's.

## Verification

This is a doc-only change, so per the standing feedback there is no coverage run:

- `npm run format:check` and `npm run lint` in the worktree.
- Every relative link in the new and edited docs resolves, checked with `grep` for each target path.
- Each rendering example in DESIGN.md §5 is copied byte for byte from the deity doc line it cites, checked with `grep -F`.
- Each acceptance criterion is ticked against the diff:
  - §5, §7, §9 and §14 are updated.
  - Each decision is recorded with its reason and the alternative it beats.
  - There is one example per kind from the deity doc.
  - `db.md` and `modules.md` name the tables and their owner.
- A progress comment on MB.151 through `task-board.mjs comment`. The task stays In Progress, with no commit and no PR until asked.
