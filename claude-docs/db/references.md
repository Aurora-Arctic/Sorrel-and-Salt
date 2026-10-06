## References (MB.151; tables MB.152)

`references` is one source per row — a book, a chapter, an article, a
reference-work entry or a web page — kept once and linked from every row it
supports through `reference_links`, so a book fifty herbs cite is one row
edited in one place. Both tables are in the `ingredients` module, built by
MB.152 in `0042_references`, written by MB.153's services and MB.156's seed,
read on the form (MB.154) and the ingredient page (MB.155). The argument for
each shape is [`mb.151-references.md`](../design-decisions/mb.151-references.md);
DESIGN.md §5, "References", is the specification this doc expands.

- **`references`** — `id`, `workspace_id` (nullable: null is the compendium
  tier, as on `ingredients`), `kind`, `authors`, `title` (NOT NULL),
  `container`, `contributors`, `edition`, `volume`, `issue`, `series`,
  `place`, `publisher`, `published`, `pages`, `host`, `url`, `modified`,
  `accessed`, `note`, + audit. Every column is text as Chicago prints it, with
  a non-blank CHECK, one per column so a refusal names its field (`url`'s is
  its http(s) CHECK, which already refuses a blank), except `modified` and
  `accessed`, which are `date`s.
  `kind` is the enum `reference_kind`: `book`, `chapter`, `article`, `entry`,
  `web_page`.
- **`reference_links`** — `id`, `reference_id` (NOT NULL), `ingredient_id`,
  `deity_id`, `deity_tradition_id`, `planet_id`, `zodiac_sign_id` (each
  nullable, exactly one set), `locator` (nullable, non-blank), + audit.
  Soft-deleted, with its own `set_updated_at` trigger line.

**The kind decides the rendering, and the CHECKs make the renderer total.**
`chapter`, `article` and `entry` require a `container` — the book, the
journal, the reference work; `web_page` requires `url` and `accessed`;
`accessed` needs a `url`; `url` is absolute http(s). Every row the table
admits therefore renders without a branch for a missing required field.
There is no unique index: two rows may be the same book, since nothing short
of a librarian identifies a source; the one index is the seed's, on
`seed_key`, which records the citation it rendered at insert, so a reference
an admin has since edited is still its own (MB.171).

```sql
CHECK (url IS NULL OR url ~ '^https?://');
CHECK (accessed IS NULL OR url IS NOT NULL);
CHECK (kind NOT IN ('chapter', 'article', 'entry') OR container IS NOT NULL);
CHECK (kind <> 'web_page' OR (url IS NOT NULL AND accessed IS NOT NULL));

CHECK (num_nonnulls(ingredient_id, deity_id, deity_tradition_id, planet_id, zodiac_sign_id) = 1);

CREATE UNIQUE INDEX reference_links_ingredient_unique
  ON reference_links (ingredient_id, reference_id)
  WHERE ingredient_id IS NOT NULL AND deleted_at IS NULL;
-- and reference_links_deity_unique, _deity_tradition_unique, _planet_unique
-- and _zodiac_sign_unique in the same shape
```

**One link per reference per row, and the index serves the read.** Each
partial unique index leads on its sourced id, so a read of one ingredient's
links — `ingredient_id = $1 AND deleted_at IS NULL` — implies the predicate
and uses the index; no plain parent index is built, as none is for
`ingredient_deities`. The substitutes table needs its plain index because a
read of all a row's substitutes implies neither of its unique indexes'
predicates. No index leads on `reference_id`: nothing reads from a reference
back to its links, and a reference is never hard-deleted.

**A link carries a locator and nothing else.** "p. 112", "chap. 13", "s.v.
Hecate" — free text, because locators vary by the kind of work. The renderer
leaves it out of the citation, since a bibliography entry names the work, and
the page shows it beside the citation.

**The tier rule is the service's.** A compendium entry's or a vocabulary
row's link names a compendium reference; a coven ingredient's names the
compendium's or its own coven's. A CHECK cannot read the reference's row, so
the service refuses anything else as a field error pathed to the entry, and
the read ANDs the same rule. A compendium reference is written only under the
`SiteAdmin` proof and a coven's only under its `Membership`, whoever links it.

**Alphabetical by the rendered citation, sorted in the service.** The key is
the plain citation, less a leading quotation mark and an initial _A_, _An_ or
_The_, compared case- and accent-insensitively. The citation exists only in
TypeScript, so nothing stores an order and the service sorts, as
`folkNamesOf` does. `referenceSuggestions` cannot match it — rule 7 filters
in SQL — so it matches `authors`, `title` and `container`, accent-folded by
word similarity as the compendium search matches names, scoped to the
compendium and the current coven.

**Nothing deletes a reference in v1.** The writers are the ingredient form
and the seed. Unlinking soft-deletes the link. A reference with no live link
stays live and suggested. Should one ever be soft-deleted, its links are
untouched and the read joins live references only, so it leaves every
bibliography and a restore returns it — no cross-tier write, and no new
soft-delete exception.

**Owned by `ingredients`.** The link table keys into `ingredients`, which
`vocabulary` may not import, and the links are written inside the
ingredient's own transaction, which a module above `ingredients` could not be
called from without a cycle. A vocabulary row's references are read from
`ingredients`, as `User.memberships` is added from `coven`. The
compendium-tier rows belong to the tier seam's extraction unit, and MB.153's
finders are named in `TIER_SEAM`.

### Reading and writing them (MB.153)

**A reference is written in its tier.** `createReference` and
`updateReference` in `services/references.ts` take a `workspaceId`: null is
the compendium, under `assertSiteAdmin` and the writer's
`insertInCompendium` and `updateByIdInCompendium`; a coven's is under
`assertMembership(…, { ingredient: ['create'] })` or `['update']` and the
writer's workspace methods. The proof is asked before the input is read. So a
member who cites a compendium reference reaches it under neither: under
their coven the id names nothing in the coven's tier, and without one the
admin check refuses. An update replaces the row — a field left out is
cleared — and reaches every row citing it. The `ingredient` statements stand
for a reference's, since a coven's reference exists to be cited by its
ingredients and the roles that write one write the other. Revalidating the
`compendium` tag on a compendium-tier write is M8.7's, with every admin
mutation, the owner's call in MB.153: nothing is cached under the tag yet,
and Next 16's `revalidateTag` throws outside a request, so the service would
have been the first caller every test had to mock it for.

**An ingredient's links are written in its own save.** Both tiers' create and
update call `addReferenceLinks` and `replaceReferenceLinks` in
`services/ingredient-rows.ts`, inside the ingredient's `withAudit`, as they
call the substitutes' writes. The list is brought to what was sent: a link is
matched by its reference, so one still listed keeps its row and takes the
locator sent, one dropped is soft-deleted, a new one is inserted, and a list
that changes nothing writes nothing. Only the links the ingredient shows are
compared, read through `findReferencesOfIngredients`, so a link to a
soft-deleted reference — which the form never sees, and so never sends back
— is left in place. A new link is held to the tier rule by one read,
`findManyReferences(memberships, ids)`: a live reference in the compendium
or, for a coven's ingredient, its coven. Anything else is a `ValidationError`
at `['references', i]`, the same for an id naming another coven's reference
as for one naming nothing, since that coven's contents are private.

**The read is one statement for a page.** `findReferencesOfIngredients`
left-joins each live link's live reference, takes only a row that joined
one, and reads the parent through `existsIn` as `findManyOfIngredients`
does, with the tier rule ANDed inside: the reference is the compendium's or
the parent's own coven's. `referencesOf` renders each citation and files the
batch's answers alphabetically, `byCitation` in `src/lib/citation.ts`;
`referencesByIngredient` batches it behind `Ingredient.references`.

**The picker's search** is `findReferenceSuggestions(membership, query,
page)`: the live references of the compendium and the proof's coven whose
`authors`, `title` or `container` the query is word-similar to (`<%` at the
compendium search's 0.5), each side through `unaccent_immutable`, keyed
`[-score, title]`; a blank query pages both tiers by title. No trigram index
is built: the table holds the sources a few hundred entries cite, and the
scan is the search's whole cost at that size. An index is a later task's,
measured, if the table outgrows it.

**The admin's to-do list** is `compendium(withoutReferences: true)`, whose
arm `citesNothing()` keeps an entry with no live link to a live compendium
reference — the entries whose bibliography reads empty, so one whose only
link was unlinked, or cites a retracted source, is listed.

Every finder here is on the tier seam, named in `TIER_SEAM`
([`modules.md`](../modules.md#the-tier-seam)).

### The renderer

`renderCitation(ref): CitationPart[]` in `src/lib/citation.ts` (MB.153), pure
and client-safe, beside `slugify`: the page, the picker, the service's sort
and the seed's test all call it. Each part is `{ text, italic }`. `citation`
on the wire is the parts joined, plain — `citationText` — and a surface that
shows italics renders the parts itself. `byCitation` compares two plain
citations in bibliography order, the sort `referencesOf` files by. A field
the kind's form below does not name is not rendered: a web page's `host`, an
article's `place`. A blank field is absent, so the form's leftovers cannot
print an empty sentence.

The kind supplies the default italics — a book's title, and a chapter's or
article's container. An entry's container and a web page's site are roman
unless marked, as "Wikipedia" and "World History Encyclopedia" are printed in
the seed doc. A writer marks any other italic span with `_…_` in `title`,
`container` or `note`, under CommonMark's rule that an underscore inside a
word is not a mark, so `_Internet Encyclopedia of Ukraine_` is italic and
`Greek_Mythology` in a URL is not; `url` is never parsed, and a marked span
inside a field the kind already italicises renders roman. A test joins the
parts back with `_` around the italic ones, which is the seed doc's own
Markdown, so the seed's and the page's tests compare strings. A roman span
inside an italic field has no spelling in that form, and no source needs one.

Each part ends in a period unless it already carries one ("Smith, William,
ed."), a quoted title takes its period inside the quotes, a date prints
"October 6, 2026", and the publication clause `Place: Publisher, Published`
drops each missing piece with its punctuation.

- **`book`** — Authors. _Title_. Contributors. Edition. Volume. Series.
  Place: Publisher, Published. Host. Last modified Modified. Accessed
  Accessed. URL. (Note)
  - Simek, Rudolf. _Dictionary of Northern Mythology_. Translated by Angela Hall. Cambridge: D. S. Brewer, 1993.
  - Smith, William, ed. _A Dictionary of Greek and Roman Biography and Mythology_. London: John Murray, 1873. Perseus Digital Library, Tufts University. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104.
  - Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985. (Each entry names the herb's deities.)
- **`chapter`** — Authors. "Title." In _Container_, Contributors, Pages.
  Edition. Volume. Series. Place: Publisher, Published. Host. Last modified
  Modified. Accessed Accessed. URL. (Note) — the contributors as a chapter
  prints them, "edited by …", after its book.
  - Pope, Marvin H. "Anath." In _Encyclopaedia Judaica_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath.
- **`article`** — Authors. "Title." _Container_ Volume, no. Issue
  (Published): Pages. Host. Last modified Modified. Accessed Accessed. URL.
  (Note) — and without a volume, _Container_, Published, Pages.
  - Nwokocha, Eziaku Atuama. "An Equilibrist Vodou Goddess." _Harvard Divinity Bulletin_, Summer/Autumn 2013. Accessed October 6, 2026. https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/.
  - With a volume, from an invented source: Testwort, Fixtura. "A Note on Fixture Covens." _Journal of Invented Botany_ 51, no. 2 (1988): 399.
- **`entry`** — Authors. Container, Edition, s.v. "Title." Contributors.
  Place: Publisher, Published. Host. Last modified Modified. Accessed
  Accessed. URL. (Note)
  - Wikipedia, s.v. "Guanyin." Last modified December 28, 2024. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Guanyin.
  - _Visuotinė lietuvių enciklopedija_, s.v. "Perkūnas." Vilnius: Mokslo ir enciklopedijų leidybos centras. Accessed October 6, 2026. https://www.vle.lt/straipsnis/perkunas/.
- **`web_page`** — Authors. "Title." Container. Publisher. Published; last
  modified Modified. Accessed Accessed. URL. (Note) — "Last modified" is
  capitalised when it stands without a published date.
  - Cartwright, Mark. "Greek Mythology." World History Encyclopedia. July 29, 2012. Accessed October 6, 2026. https://www.worldhistory.org/Greek_Mythology/.
  - Cartwright, Mark. "Seven Lucky Gods." World History Encyclopedia. June 24, 2013; last modified September 27, 2024. Accessed October 6, 2026. https://www.worldhistory.org/Shichifukujin/.

### What the seed doc needs before MB.156 parses it

The deity doc's citations are Chicago, but not all in one shape. MB.156
normalises them first: the comma-form `Wikipedia, s.v. "…," last modified …`
lines become period form; the locators embedded in a citation (Grimm's
"Vol. 1, chap. 13", Tacitus's "Chap. 40") move onto the links; "Revised"
becomes "Last modified"; and "Originally published in …" and the
unparenthesised "Existence confirmed at …" become notes. The astrology doc's
sources are recast in Chicago form in the same pass, as its task already
says.
