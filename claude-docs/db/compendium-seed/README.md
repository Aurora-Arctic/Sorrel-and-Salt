## The compendium seed (MB.240 to MB.249)

The compendium's starting entries are seeded on staging and production, as reference data, by `npm run db:seed:compendium` (MB.242), the way the five curated vocabularies are. Until 2026-10-11 the plan was for an admin to type every entry by hand; the owner reversed that and asked for a researched, sourced list of **614 ingredients**. This folder holds the rules every entry is written to, the candidate list the entries are drawn from, and one doc per shard recording each entry's sources.

- [`candidates.md`](candidates.md): the 614 candidate entries, each with its label, formal name, naming system and shard, and the works the list was drawn from.
- `<shard>.md`, one per content task (MB.243 to MB.248): the shard's scope, its bibliography, one source line per entry, and what was left out and why.
- The plan that scoped the work: [`design-decisions/mb.240-plan.md`](../../design-decisions/mb.240-plan.md). Why it is shaped this way: [`design-decisions/mb.240-compendium-seed.md`](../../design-decisions/mb.240-compendium-seed.md).

**The owner's rule, which every other rule here serves: "Do not make stuff up. All claims must have sources."** A field holds a value only if a source the lane read during its task says so. A claim with no source is left out, never filled from memory.

### What is seeded, and where

An _entry_ is one row of `ingredients` in the compendium tier, keyed by its formal name (an ingredient's identity, DESIGN.md §5). Beneath it, one row of `ingredient_variants` per form it is sold or used in: the herb, the oil, the root. Only entries count toward the 614; forms are extra rows beneath them (MB.215).

The entries are written as TypeScript literals in **shards**, one file of about 80 to 135 entries per content task, so that no file is too large for a pull request to show:

| Task   | Shard                                                                            | Entries (target) |
| ------ | -------------------------------------------------------------------------------- | ---------------- |
| MB.242 | `pilot`: one of each kind, proving the shape and the guard                       | 14               |
| MB.243 | `plants-a-c`                                                                     | ~100             |
| MB.244 | `plants-d-k`                                                                     | ~100             |
| MB.245 | `plants-l-r`                                                                     | ~100             |
| MB.246 | `plants-s-z`                                                                     | ~100             |
| MB.247 | `resins-woods-and-other`: resins, woods, incense; animal products, salts, waters | ~80              |
| MB.248 | `stones-and-metals`                                                              | ~135             |

Each shard is `src/db/seed/compendium/<shard>.ts`, its doc `claude-docs/db/compendium-seed/<shard>.md`. The pilot's 14 count toward the 614. The candidate list fixes which entry falls in which shard; the targets above are the plan's estimate, and the list's split points balance them by count.

### An entry, field by field

The literal's type is `SeedCompendiumEntry`, which MB.242 adds to `src/db/seed/types.ts`. The shape below is the plan's; if MB.242 names a field differently, it corrects this section in its own pull request.

A worked example, **invented**, as the repo's fixtures are (CLAUDE.md, Testing). Testwort, _Fixtura testalis_, does not exist, and nor do its sources.

```ts
// In the shard's SOURCES: the per-entry pages this shard cites, under short handles.
// Works several shards share (Cunningham, Kynes, Hall, Grieve, ...) are declared once
// in src/db/seed/compendium/works.ts and named by the same kind of handle.
export const SOURCES = {
  'wikipedia-testwort': {
    kind: 'entry',
    container: 'Wikipedia',
    title: 'Testwort',
    url: 'https://en.wikipedia.org/w/index.php?title=Testwort&oldid=0000000000',
    accessed: '2026-10-11',
  },
};

// In the shard's entry list.
{
  name: 'Testwort',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
  description: '100 to 250 words, written fresh: what the plant is, where it grows, how it has been used ...',
  elements: ['earth'],
  planets: ['Saturn'],
  zodiacSigns: ['Capricorn'],
  colors: ['green'],
  safetyNotes: 'Only what a safety source says, in plain words.',
  folkNames: ['Fixture Herb'],
  deities: ['Hecate'],
  categories: ['Protection', 'Grounding'],
  substitutes: [
    { identity: 'fixtura exemplaris' }, // an entry in this shard or an earlier one
    { name: 'Sampleroot' }, // typed text: its entry is in a later shard
  ],
  references: [
    // `supports` names the fields this source backs. Every populated field above must be
    // named by at least one citation, or the guard fails the shard.
    {
      source: 'invented-herbal', // a handle from works.ts
      locator: 'p. 112',
      supports: ['canonicalName', 'description', 'elements', 'planets', 'deities', 'categories', 'substitutes'],
    },
    {
      source: 'wikipedia-testwort',
      supports: ['description', 'zodiacSigns', 'colors', 'folkNames', 'safetyNotes'],
    },
  ],
  variants: [
    {
      form: 'Leaf',
      references: [{ source: 'invented-herbal', locator: 'p. 112', supports: ['form'] }],
    },
    {
      form: 'Oil',
      description: 'At most 120 words on what this form adds.',
      safetyNotes: 'A caution particular to the oil.',
      references: [
        { source: 'invented-safety-handbook', locator: 'p. 418', supports: ['form', 'description', 'safetyNotes'] },
      ],
    },
  ],
}
```

What the example shows:

- **Every entry cites at least one source of its own, and so does every form.** The admin's "unsourced" filter counts only entry-level links (`citesNothing('ingredientId')` in `src/db/repository/ingredients.ts`), so a source cited only on a form would leave the entry on the admin's to-do list.
- **A form adds to its entry and never overrides it** (MB.215). Put a property on the entry when every form has it, and on a form when only that form does. Deities and folk names belong to the entry alone.
- **Every entry carries at least its primary form as a variant.** A further form is added only where a source the lane read attaches something to that form: a description, a caution, a use.
- **A substitute links an entry only in its own shard or an earlier one**, by its identity key (the formal name, lower-cased, or the label where there is none). An entry in a later shard does not exist yet when this shard is seeded, so it is written as typed text, `{ name }`, which the substitutes table allows.

### What `supports` may name

A citation's `supports` lists the fields it backs, using the literal's own field names:

| On an entry     | On a form (variant) |
| --------------- | ------------------- |
| `name`          | `form`              |
| `canonicalName` | `description`       |
| `nomenclature`  | `safetyNotes`       |
| `description`   | `elements`          |
| `elements`      | `planets`           |
| `planets`       | `zodiacSigns`       |
| `zodiacSigns`   | `colors`            |
| `colors`        | `categories`        |
| `safetyNotes`   | `substitutes`       |
| `folkNames`     |                     |
| `deities`       |                     |
| `categories`    |                     |
| `substitutes`   |                     |

`name` is the label, which is free to choose and needs no source unless it is the only name a source gives. `nomenclature` follows from `canonicalName`, so a source supporting the formal name supports both.

### The closed lists

A compendium entry may only name values the curated vocabularies hold (MB.162, MB.167), spelt exactly as their seed files spell them. The guard (MB.242) checks every value against these files, by slug:

| Field           | The list                                                                      | Where it is                                                                 |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| a form's `form` | 78 forms in 6 groups (Botanical, Animal, Mineral, Substance, Fluid, Curio)    | `src/db/seed/forms.ts`, `FORMS`                                             |
| `categories`    | 63 categories in 8 groups                                                     | `src/db/seed/categories.ts`, `CATEGORIES`                                   |
| `deities`       | 216 deities in 35 traditions                                                  | `src/db/seed/deities.ts`, `DEITIES`                                         |
| `planets`       | 19 planets and points, Sun to South Node                                      | `src/db/seed/astrology.ts`, `PLANETS`                                       |
| `zodiacSigns`   | 13 signs, Ophiuchus included                                                  | `src/db/seed/astrology.ts`, `ZODIAC_SIGNS`                                  |
| `elements`      | `earth`, `air`, `fire`, `water`, `spirit`                                     | `src/modules/ingredients/schema/ingredient-enums.ts`, `INGREDIENT_ELEMENTS` |
| `nomenclature`  | `botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `unknown`, `none` | the same file, `NOMENCLATURE_KINDS`                                         |
| `colors`        | a closed list of lower-case British colour names                              | `src/db/seed/compendium/colours.ts` (MB.242)                                |

A value a source gives that is not on the list is left out of the field, and the shard doc's "What is left out, and why" names it, so the owner can decide whether the list should grow. A lane never adds to a curated list itself: a list is its own task.

### Formal names

An entry's formal name is its identity: two entries may share a label, never a formal name. The rules (plan decision 9):

- **Plants** take the accepted name in Plants of the World Online (POWO), in `Genus species` form, with `subsp.`, `var.` or a quoted cultivar where the entry is one (`Lavandula angustifolia 'Hidcote'`). Where practice does not split a genus into species, the genus alone.
- **Fungi** take their binomial, with `nomenclature: 'fungal'`.
- **Minerals** take `<Species> var. <variety>` where the stone is a variety, as `standard` does (`Quartz var. amethyst`), so amethyst, citrine and rose quartz stay three entries. A rock rather than a mineral species is named as the mineral system names it (`Lapis lazuli`). Mindat is the reference for mineral names.
- **Metals and salts** take their chemical name, with `nomenclature: 'chemical'` (`Sodium chloride`).
- **Animal products** are forms beneath the animal's binomial: honey and beeswax are both _Apis mellifera_, with `Honey` and `Wax` as its forms.
- **A preparation no naming system names** (black salt, moon water) takes `nomenclature: 'none'` and no formal name. `none` is an answer, not a gap.
- **`unknown`** means a formal name exists and nobody has confirmed it. It is the curation to-do value, so the seed avoids it: a lane that cannot confirm a name from a source leaves the entry out instead.

The database enforces the pairing: `nomenclature = 'unknown' or (nomenclature = 'none') = (canonical_name is null)` (`ingredients_nomenclature_declares_canonical_name`).

**The `standard` fixture's names.** The `standard` test scenario (`src/db/seed/standard.ts`) uses 26 real names, and a local database seeded with it and then with the compendium meets them. A lane spells these formal names exactly as below, so the two land as one entry rather than two. The seed skips an entry already present by identity, and leaves it untouched.

| Label              | Formal name                      | Naming system | Forms in `standard` |
| ------------------ | -------------------------------- | ------------- | ------------------- |
| Mugwort            | Artemisia vulgaris               | botanical     | Herb                |
| Wormwood           | Artemisia absinthium             | botanical     | Herb                |
| Bay Laurel         | Laurus nobilis                   | botanical     | Leaf                |
| Rosemary           | Salvia rosmarinus                | botanical     | Herb, Oil           |
| Lavender           | Lavandula angustifolia           | botanical     | Flower              |
| Hidcote Lavender   | Lavandula angustifolia 'Hidcote' | botanical     | Flower              |
| Comfrey            | Symphytum officinale             | botanical     | Leaf                |
| Foxglove           | Digitalis purpurea               | botanical     | Leaf                |
| Cat's Claw         | Uncaria tomentosa                | botanical     | Bark                |
| Cat's Claw         | Uncaria guianensis               | botanical     | Bark                |
| Cat's Claw         | Senegalia greggii                | botanical     | Thorn               |
| Cat's Claw         | Dolichandra unguis-cati          | botanical     | Leaf                |
| Cat's Claw         | Felis catus                      | zoological    | Claw                |
| Beeswax            | Apis mellifera                   | zoological    | Wax                 |
| Reishi             | Ganoderma lingzhi                | fungal        | Mushroom            |
| Fly Agaric         | Amanita muscaria                 | fungal        | Mushroom            |
| Amethyst           | Quartz var. amethyst             | mineral       | Crystal             |
| Selenite           | Gypsum var. selenite             | mineral       | Crystal             |
| Lapis Lazuli       | Lapis lazuli                     | mineral       | Stone               |
| Sea Salt           | Sodium chloride                  | chemical      | Salt                |
| Saltpetre          | Potassium nitrate                | chemical      | Powder              |
| Graveyard Dirt     | (none)                           | none          | Earth               |
| Moon Water         | (none)                           | none          | Water               |
| Black Salt         | (none)                           | none          | Salt                |
| Devil's Shoestring | (none)                           | unknown       | Root                |
| Ginger             | Zingiber officinale              | botanical     | Root                |

`standard`'s descriptions are deliberately thin test data, not research; nothing in them is a source.

### How an entry is sourced

These are the lane brief's hard rules, repeated in every content task:

1. **Every field value traces to a source read during the task**: a page of one of the owner's books (below), or a web page the lane fetched. Never from memory, and never from another seed or doc in this repo.
2. **A claim with no source is left out.** An entry that cannot be sourced to the depth below goes to the shard doc's "What is left out, and why", with the reason.
3. **Never invent a page, a URL, an edition or a year.** A locator is only what was read: the page the passage is on, or the entry heading it is under.
4. **`accessed` is the real date of the fetch**, never a guess.
5. **No prose is copied from any source**, public domain or not. A description is written fresh, 100 to 250 words for an entry and at most 120 for a form (the owner may change either), in British spelling, from what the sources say.
6. **Correspondences are cited entry by entry, never transcribed as a table.** The candidate list and the correspondences are drawn from several works, so the seed mirrors no single book's selection.
7. **Every citation names the edition in hand.** A book from the library is cited as the file it is, below, not as some other printing.

**Which sources stand where.** Academic and reference sources are preferred where they cover the field: POWO for plant names, Mindat for mineral names, NCBI's LiverTox and NCCIH for safety, the _AHPA Botanical Safety Handbook_ in the library. Wikipedia is a valid source beside the others, never a last resort. Grieve's _A Modern Herbal_ (1931, read at botanical.com), Culpeper's _Complete Herbal_ (1653, Project Gutenberg #49513), Kunz, Folkard, Dyer and the owner's books are all first-class for lore and correspondences.

**Wikipedia is cited as an encyclopaedia entry**, as the sources seed already cites it 64 times (`src/db/seed/sources.ts`; [`../references.md`](../references.md), "The renderer"): `kind: 'entry'`, `container: 'Wikipedia'`, the article's title as `title`. The compendium seed adds one thing to that precedent: `url` is the **revision permalink**, `https://en.wikipedia.org/w/index.php?title=<Title>&oldid=<revision id>`, so the citation points at the text the lane read and not at whatever the article says later, and `accessed` is the day it was fetched. The revision id is the "Permanent link" in the article's Tools menu, or `revisions[0].revid` from `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=ids&format=json&titles=<Title>`.

**Each shard doc records its sources** in the shape of the deity seed doc ([`../deity-vocabulary-seed.md`](../deity-vocabulary-seed.md)): its scope; its bibliography in Chicago form; **one line per entry** naming which source supports which fields; and "What is left out, and why". The literal is the source of truth, so the doc does not repeat the entries' fields.

### Write-once, and how a correction lands

The seed writes each entry once. The run that inserts an entry writes everything beneath it in the same pass: its forms, folk names, deities, categories, substitutes and source links. On every later run, an entry already present is skipped along with everything beneath it. Present means any of:

- a row carrying the entry's seed key (`seed_key`, which MB.241 adds: the identity key as the seed wrote it, the formal name lower-cased or the label where there is none), live or deleted;
- a live compendium row with the same identity, an admin's or the `standard` fixture's;
- a live compendium row already holding the entry's address (its slug).

This keeps a reseed from undoing an admin's work: an entry an admin renamed, deleted or unfiled from a category stays as the admin left it. **The cost: correcting a shard's literal after it has landed changes nothing on staging or production.** A correction is made in the admin's compendium page, and the literal is then edited to match, so that a fresh local database agrees with production.

### The library

The owner keeps copies of the in-copyright reference books in **`/app/.library/`**. The folder is in `.gitignore` and never committed: the repo is public, and a book committed once is published for good. `tests/guards/no-tracked-books.test.ts` fails if any `.pdf` or `.epub` is tracked anywhere in the repo, or if the folder stops being ignored. A lane in a worktree reads the library by that absolute path, since a worktree holds no copy of an ignored folder.

**Turning the books into text.** The devcontainer has no PDF tools, so `npm run library:text` (`scripts/library-text.ts`) does it with `pdfjs-dist`, Mozilla's PDF reader:

- each PDF becomes one text file per page, `/app/.library/text/<slug of the file name>/<page>.txt`, the page number zero-padded to four digits (`0036.txt`);
- each EPUB is unpacked with `unzip` into `/app/.library/text/<slug of the file name>/`, which gives its HTML chapters as they are.

Run it again after a book is added. On 2026-10-11 every PDF yielded text and none was an image-only scan, though a few pages of each (covers, plates) are blank.

**What each file is**, read from its own title and copyright pages on 2026-10-11, not from its file name:

| File in `/app/.library/`                                                  | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Use it?                                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `dokumen.pub_cunninghams-encyclopedia-of-magical-herbs-…epub`             | Scott Cunningham, _Cunningham's Encyclopedia of Magical Herbs_, Llewellyn, Woodbury, Minnesota. Copyright page: © 1985 by Scott Cunningham and 2000 by the Scott Cunningham estate; first e-book edition © 2012; e-book ISBN 9780738717135. The package's metadata adds "Second Edition, Twentieth Printing, 2012" and the print ISBN 978-0-87542-122-3. 428 entry headings.                                                                                                                                                                          | Yes                                                         |
| `Encyclopedia of Crystal Gem And Metal Magic - READ - fb - READ.pdf`      | Scott Cunningham, _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_, Llewellyn's Sourcebook Series, Llewellyn, St. Paul, Minnesota. Copyright © 1988; "First Edition, Sixteenth Printing, 1996"; ISBN 0-87542-126-1. A scan with a text layer read by OCR (optical character recognition), so expect misread letters ("willleam" for "will learn").                                                                                                                                                                                           | Yes; check a spelling against the page before relying on it |
| `dokumen.pub_the-witches-encyclopedia-of-magical-plants-…epub`            | Sandra Kynes, _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_, Llewellyn, Woodbury, Minnesota. Copyright © 2024; first e-book edition © 2024; e-book ISBN 9780738775647; the print ISBN on the same page is 978-0-7387-7548-7. 352 plant-name headings.                                                                                                                                                                                                                                                 | Yes                                                         |
| `9780738732534.pdf`                                                       | Sandra Kynes, _Llewellyn's Complete Book of Correspondences: A Comprehensive & Cross-Referenced Resource for Pagans & Wiccans_, Llewellyn, Woodbury, Minnesota. Copyright © 2013; "First Edition, First Printing, 2013"; ISBN 978-0-7387-3253-4. **An excerpt: 37 pages**, the cover, front matter and printed pages 1 to 26, which stop partway through chapter one ("Issues, Intentions, and Powers"), whose alphabetical entries begin on p. 11 and reach "business" on p. 26. The plant, mineral and animal chapters (from p. 147) are not in it. | Only for what pages 1 to 26 hold                            |
| `dokumen.pub_the-crystal-bible-volume-1-…epub`                            | Judy Hall, _The Crystal Bible_, Godsfield Press (Octopus Publishing Group), London. "First published in Great Britain in 2003"; copyright © 2003, 2009; "Published as an eBook 2012"; ISBN 9781841814131. The title page says _The Crystal Bible_; "Volume 1" and the subtitle in the file name come from the package's metadata, not the book.                                                                                                                                                                                                       | Yes                                                         |
| `American Herbal Products Associations Botanical Safety Handbook (…).pdf` | Zoë Gardner and Michael McGuffin, eds., _American Herbal Products Association's Botanical Safety Handbook_, 2nd ed., CRC Press (Taylor & Francis), Boca Raton. © 2013; ISBN 978-1-4665-1695-3 (eBook, PDF). 1,061 PDF pages.                                                                                                                                                                                                                                                                                                                          | Yes, for safety notes                                       |
| `dokumen.pub_herbal-remedies-for-beginners-…epub`                         | Sandra Kynes, _Herbal Remedies for Beginners: Natural Ways to Treat Ailments_, Llewellyn, Woodbury, Minnesota. Copyright © 2020; first e-book edition © 2020; e-book ISBN 9780738761961.                                                                                                                                                                                                                                                                                                                                                              | Yes, for uses and cautions                                  |
| `the_book_of_herbs_1903.pdf`                                              | Lady Rosalind Northcote, _The Book of Herbs_, number XII of the series Handbooks of Practical Gardening (series editor Harry Roberts), John Lane, The Bodley Head, London and New York, 1903. A scan of Cornell University Library's copy, from archive.org (`cu31924073899373`), whose own notice says "There are no known copyright restrictions in the United States on the use of the text". OCR text.                                                                                                                                            | Yes, for lore                                               |
| `Master Book Of Herbalism PDF.pdf`                                        | **Not Paul Beyerl's book.** A 34-page chapter-by-chapter summary of _The Master Book of Herbalism_ "Written by Bookey", with no page of the original in it.                                                                                                                                                                                                                                                                                                                                                                                           | **No: never cite it**                                       |

Paul Beyerl's _A Compendium of Herbal Magick_ and Melody's _Love Is in the Earth_ are not in the library. The lanes work without them.

**How to cite each one.** These are the Chicago bibliography forms, for MB.242 to transcribe into `src/db/seed/compendium/works.ts`. Each names the edition in hand. An e-book is cited as the e-book, with its format last, as Chicago does.

- Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. 2nd ed. Woodbury, MN: Llewellyn Publications, 2012. EPUB.
- Cunningham, Scott. _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_. Llewellyn's Sourcebook Series. St. Paul, MN: Llewellyn Publications, 1988.
- Kynes, Sandra. _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_. Woodbury, MN: Llewellyn Publications, 2024. EPUB.
- Kynes, Sandra. _Llewellyn's Complete Book of Correspondences: A Comprehensive & Cross-Referenced Resource for Pagans & Wiccans_. Woodbury, MN: Llewellyn Publications, 2013.
- Hall, Judy. _The Crystal Bible_. London: Godsfield Press, 2012. EPUB.
- Gardner, Zoë, and Michael McGuffin, eds. _American Herbal Products Association's Botanical Safety Handbook_. 2nd ed. Boca Raton, FL: CRC Press, 2013. PDF.
- Kynes, Sandra. _Herbal Remedies for Beginners: Natural Ways to Treat Ailments_. Woodbury, MN: Llewellyn Publications, 2020. EPUB.
- Northcote, Lady Rosalind. _The Book of Herbs_. Handbooks of Practical Gardening 12. London: John Lane, The Bodley Head, 1903.

The sources seed already holds a citation of the first edition, "Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985." That is a different edition and stays a different row: the compendium cites the 2012 e-book, the one the lanes read.

**The locator** says where in the work the passage is:

- **A PDF: the printed page number**, read off the page's text, written `p. 25` (or `pp. 25–26`). Never the file's number: the two differ by the front matter, and not by a fixed amount. In the crystal encyclopedia `0036.txt` is printed page 25; in the safety handbook `0030.txt` is page 1 and `0200.txt` page 172; in the 1903 _Book of Herbs_ `0030.txt` is page 10.
- **An EPUB arranged by entry** (both Cunninghams' and Kynes's encyclopedias, Hall): the entry heading, `s.v. Mugwort`, as [`../references.md`](../references.md) writes it ("s.v. Hecate"). An e-book reflows, so its heading is the stable place.
- **An EPUB arranged otherwise** (_Herbal Remedies for Beginners_): the e-book's own page marker before the passage, `p. 123`, from its `epub:type="pagebreak"` markers.

**Finding a passage.** `grep` the text folder, then read the file. Entry headings are marked differently in each e-book:

| Book                           | An entry heading looks like                          | Example                                                                                  |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cunningham, _Magical Herbs_    | `<p class="HerbNAME">MUGWORT</p>`                    | `grep -n 'HerbNAME">MUGWORT' /app/.library/text/dokumenpub-cunninghams*/OEBPS/*.html`    |
| Kynes, _Witches' Encyclopedia_ | `<p class="Ahead---plant-name">…Mugwort…</p>`        | `grep -n 'plant-name.*Mugwort' /app/.library/text/dokumenpub-the-witches*/OEBPS/*.xhtml` |
| Hall, _The Crystal Bible_      | `<h1 id="amethyst" class="calibre13">AMETHYST</h1>`  | `grep -n 'id="amethyst"' /app/.library/text/dokumenpub-the-crystal*/text/*.html`         |
| a PDF                          | the entry's name in capitals, near the top of a page | `grep -ln '^AMETHYST' /app/.library/text/encyclopedia-of-crystal*/*.txt`                 |

Cunningham's _Magical Herbs_ also prints, under each heading, the formal name the book gives the plant (`(Artemisia vulgaris)` under MUGWORT). That is the book's naming, not necessarily POWO's accepted name, so it is checked against POWO before it becomes an entry's formal name.

### The candidate list

[`candidates.md`](candidates.md) lists the 614 entries to research. Its rules:

- one row per entry: the label, the formal name, the naming system, and the shard it belongs to;
- **no two rows share an identity** (the formal name lower-cased, or the label where the naming system is `none`);
- every formal name and naming system satisfies the rules under "Formal names" above, `none` with no formal name;
- the list is drawn from several works, each named in its own sources section in Chicago form, so the selection is no one book's.

A content task researches its shard's rows. Its seeded entries plus its "What is left out" rows equal its rows in the list; a lane that would leave out more than a tenth of its rows stops and raises it with the owner first.
