## The compendium seed (MB.240 to MB.249)

The compendium's starting entries are seeded on staging and production, as reference data, by `npm run db:seed:compendium` (MB.242), the way the five curated vocabularies are. Until 2026-10-11 the plan was for an admin to type every entry by hand; the owner reversed that and asked for a researched, sourced list of **614 ingredients**. This folder holds the rules every entry is written to, the candidate list the entries are drawn from, and one doc per shard recording each entry's sources.

- [`candidates.md`](candidates.md): the 614 candidate entries, each with its label, formal name, naming system and shard, and the works the list was drawn from.
- `<shard>.md`, one per content task (MB.243 to MB.248): the shard's scope, its bibliography, one source line per entry, and what was left out and why.
- The plan that scoped the work: [`design-decisions/mb.240-plan.md`](../../design-decisions/mb.240-plan.md). Why it is shaped this way: [`design-decisions/mb.240-compendium-seed.md`](../../design-decisions/mb.240-compendium-seed.md).

**The owner's rule, which every other rule here serves: "Do not make stuff up. All claims must have sources."** A field holds a value only if a source the lane read during its task says so. A claim with no source is left out, never filled from memory.

### What is seeded, and where

An _entry_ is one row of `ingredients` in the compendium tier, keyed by its formal name (an ingredient's identity, DESIGN.md §5). Beneath it, one row of `ingredient_variants` per form it is sold or used in: the herb, the oil, the root. Only entries count toward the 614; forms are extra rows beneath them (MB.215).

The entries are written as TypeScript literals in **shards**, one file of about 50 to 135 entries per content task, so that no file is too large for a pull request to show. The counts are the candidate list's:

| Task   | Shard                                                                            | Entries |
| ------ | -------------------------------------------------------------------------------- | ------- |
| MB.242 | `pilot`: one of each kind, proving the shape and the guard                       | 14      |
| MB.243 | `plants-a-cn`: plants and fungi, labels A to Cn                                  | 112     |
| MB.244 | `plants-co-k`: labels Co to K                                                    | 116     |
| MB.245 | `plants-l-q`: labels L to Q                                                      | 104     |
| MB.246 | `plants-r-z`: labels R to Z                                                      | 98      |
| MB.247 | `resins-woods-and-other`: resins, woods, incense; animal products, salts, waters | 48      |
| MB.248 | `stones-and-metals`: minerals, rocks, metals and alloys                          | 136     |

Each shard is `src/db/seed/compendium/<shard>.ts`, its doc `claude-docs/db/compendium-seed/<shard>.md`. The pilot's 14 are rows of the candidate list, so they count toward the 614: MB.242 names them, and the shards they come from research them no further. The plan split the plants at A–C, D–K, L–R and S–Z; the list moved the split points to Co, L and R, which balance the four at 98 to 116 rows rather than 87 to 130. The resins, woods and other ingredients came in at 48 against the plan's estimate of about 80, because few of the sources read name them and no row was added without a source.

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
  celestialBodies: ['Saturn'],
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
      supports: ['canonicalName', 'description', 'elements', 'celestialBodies', 'deities', 'categories', 'substitutes'],
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
- **A work is cited once on an entry or a form.** `reference_links` holds one live link per work per row, so two passages of one book are one citation whose locator names both (`under "Mugwort"; p. 266`). The guard refuses a work cited twice on one row. The pilot ([`pilot.md`](pilot.md), "Decisions the lanes inherit") records the other rules it settled: categories by the source's own word, deities by the curated row, colours.
- **A substitute links an entry only in its own shard or an earlier one**, by its identity key (the formal name, lower-cased, or the label where there is none). An entry in a later shard does not exist yet when this shard is seeded, so it is written as typed text, `{ name }`, which the substitutes table allows.

### What `supports` may name

A citation's `supports` lists the fields it backs, using the literal's own field names:

| On an entry       | On a form (variant) |
| ----------------- | ------------------- |
| `name`            | `form`              |
| `canonicalName`   | `description`       |
| `nomenclature`    | `safetyNotes`       |
| `description`     | `elements`          |
| `elements`        | `celestialBodies`   |
| `celestialBodies` | `zodiacSigns`       |
| `zodiacSigns`     | `colors`            |
| `colors`          | `categories`        |
| `safetyNotes`     | `substitutes`       |
| `folkNames`       |                     |
| `deities`         |                     |
| `categories`      |                     |
| `substitutes`     |                     |

`name` is the label, which is free to choose and needs no source unless it is the only name a source gives. `nomenclature` follows from `canonicalName`, so a source supporting the formal name supports both.

### The closed lists

A compendium entry may only name values the curated vocabularies hold (MB.162, MB.167), spelt exactly as their seed files spell them. The guard (MB.242) checks every value against these files, by slug:

| Field             | The list                                                                      | Where it is                                                                 |
| ----------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| a form's `form`   | 78 forms in 6 groups (Botanical, Animal, Mineral, Substance, Fluid, Curio)    | `src/db/seed/forms.ts`, `FORMS`                                             |
| `categories`      | 63 categories in 8 groups                                                     | `src/db/seed/categories.ts`, `CATEGORIES`                                   |
| `deities`         | 216 deities in 35 traditions                                                  | `src/db/seed/deities.ts`, `DEITIES`                                         |
| `celestialBodies` | 19 celestial bodies, Sun to South Node                                        | `src/db/seed/astrology.ts`, `CELESTIAL_BODIES`                              |
| `zodiacSigns`     | 13 signs, Ophiuchus included                                                  | `src/db/seed/astrology.ts`, `ZODIAC_SIGNS`                                  |
| `elements`        | `earth`, `air`, `fire`, `water`, `spirit`                                     | `src/modules/ingredients/schema/ingredient-enums.ts`, `INGREDIENT_ELEMENTS` |
| `nomenclature`    | `botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `unknown`, `none` | the same file, `NOMENCLATURE_KINDS`                                         |
| `colors`          | a closed list of lower-case British colour names                              | `src/db/seed/compendium/colours.ts` (MB.242)                                |

A value a source gives that is not on the list is left out of the field, and the shard doc's "What is left out, and why" names it, so the owner can decide whether the list should grow. A lane never adds to a curated list itself: a list is its own task.

### Formal names

An entry's formal name is its identity: two entries may share a label, never a formal name. The rules (plan decision 9):

- **Plants** take the accepted name in Plants of the World Online (POWO), in `Genus species` form, with `subsp.`, `var.` or a quoted cultivar where the entry is one (`Lavandula angustifolia 'Hidcote'`). Where practice does not split a genus into species, the genus alone. Where the candidate list names a group within a genus by its rank, the rank stays in the name (`Rubus subg. Rubus`, `Vaccinium sect. Cyanococcus`), and the guard takes that shape (MB.243).
- **Fungi** take their binomial, with `nomenclature: 'fungal'`.
- **Minerals** take `<Species> var. <variety>` where the stone is a variety, as `standard` does (`Quartz var. amethyst`), so amethyst, citrine and rose quartz stay three entries. A rock rather than a mineral species is named as the mineral system names it (`Lapis lazuli`). Mindat is the reference for mineral names.
- **Metals and salts** take their chemical name, with `nomenclature: 'chemical'` (`Sodium chloride`).
- **Animal products** are forms beneath the animal's binomial: honey and beeswax are both _Apis mellifera_, with `Honey` and `Wax` as its forms.
- **A preparation no naming system names** (black salt, moon water) takes `nomenclature: 'none'` and no formal name. `none` is an answer, not a gap.
- **`unknown`** means a formal name exists and is unsettled: the sources read disagree, or none settles it. A candidate row whose naming system is `unknown` is seeded with `nomenclature: 'unknown'` and no `canonicalName` (the owner's decision, 2026-10-11), which the CHECK below allows. Its description says in one sentence why the name is unsettled, citing the sources that disagree (Devil's Shoestring: Cunningham and Kynes both head their entries with the hobblebush, _Viburnum alnifolium_ or its synonym _V. lantanoides_, but Kynes's Yucca entry gives the name to _Yucca filamentosa_ and Wikipedia gives it to _Nolina lindheimeriana_; MB.242's [pilot](pilot.md) corrected this). The seed never chooses a name from memory. With no formal name, the entry's identity falls to its label: `identity_key` is `lower(coalesce(canonical_name, name))` (`identityKeyOf` in `src/modules/ingredients/schema/ingredients.ts`), so Devil's Shoestring keys as `devil's shoestring`, and a later curator who settles the name changes its identity.

**Where the candidate list's names come from.** Every formal name in [`candidates.md`](candidates.md) is Wikipedia's, from the article's taxobox or infobox (or, for nine rows, its opening sentence), with the article named in the row. POWO and Mindat were the preferred authorities, but on 2026-10-11 both answered every request with a Cloudflare challenge page (HTTP 403, "Just a moment..."), the roster's researcher's and MB.240's alike. So **the pilot (MB.242) and each shard lane check every formal name against POWO or Mindat as they write the entry**, cite what they read, and record any change in the shard doc. A name is never changed from memory. The list writes 48 genus-level rows as `_Genus_ spp.`; the literal writes the genus alone (`Usnea`), the rule above.

The database enforces the pairing: `nomenclature = 'unknown' or (nomenclature = 'none') = (canonical_name is null)` (`ingredients_nomenclature_declares_canonical_name`).

**The `standard` fixture's names.** The `standard` test scenario (`src/db/seed/standard.ts`) uses 26 real names, and a local database seeded with it and then with the compendium meets them. Where a fixture entry is also on the candidate list, the list spells its formal name exactly as the fixture does, so the two land as one entry rather than two: the seed skips an entry already present by identity and leaves it untouched. 18 of the 26 are on the list, some under another label (the fixture's Sea Salt is the list's Salt, _Sodium chloride_; its Beeswax is the list's Honey, _Apis mellifera_, of which beeswax is a form; its zoological Cat's Claw is the list's Cat, _Felis catus_). The other 8 are under the list's "Considered and left out", each with its reason, and are not seeded.

| Label              | Formal name                      | Naming system | Forms in `standard` | On the candidate list                            |
| ------------------ | -------------------------------- | ------------- | ------------------- | ------------------------------------------------ |
| Mugwort            | Artemisia vulgaris               | botanical     | Herb                | Yes: Mugwort, in `plants-l-q`                    |
| Wormwood           | Artemisia absinthium             | botanical     | Herb                | Yes: Wormwood, in `plants-r-z`                   |
| Bay Laurel         | Laurus nobilis                   | botanical     | Leaf                | Yes: Bay Laurel, in `plants-a-cn`                |
| Rosemary           | Salvia rosmarinus                | botanical     | Herb, Oil           | Yes: Rosemary, in `plants-r-z`                   |
| Lavender           | Lavandula angustifolia           | botanical     | Flower              | Yes: Lavender, in `plants-l-q`                   |
| Hidcote Lavender   | Lavandula angustifolia 'Hidcote' | botanical     | Flower              | No                                               |
| Comfrey            | Symphytum officinale             | botanical     | Leaf                | Yes: Comfrey, in `plants-co-k`                   |
| Foxglove           | Digitalis purpurea               | botanical     | Leaf                | Yes: Foxglove, in `plants-co-k`                  |
| Cat's Claw         | Uncaria tomentosa                | botanical     | Bark                | No                                               |
| Cat's Claw         | Uncaria guianensis               | botanical     | Bark                | No                                               |
| Cat's Claw         | Senegalia greggii                | botanical     | Thorn               | No                                               |
| Cat's Claw         | Dolichandra unguis-cati          | botanical     | Leaf                | No                                               |
| Cat's Claw         | Felis catus                      | zoological    | Claw                | Yes: Cat, in `resins-woods-and-other`            |
| Beeswax            | Apis mellifera                   | zoological    | Wax                 | Yes: Honey, in `resins-woods-and-other`          |
| Reishi             | Ganoderma lingzhi                | fungal        | Mushroom            | No                                               |
| Fly Agaric         | Amanita muscaria                 | fungal        | Mushroom            | Yes: Fly Agaric, in `plants-co-k`                |
| Amethyst           | Quartz var. amethyst             | mineral       | Crystal             | Yes: Amethyst, in `stones-and-metals`            |
| Selenite           | Gypsum var. selenite             | mineral       | Crystal             | Yes: Selenite, in `stones-and-metals`            |
| Lapis Lazuli       | Lapis lazuli                     | mineral       | Stone               | Yes: Lapis Lazuli, in `stones-and-metals`        |
| Sea Salt           | Sodium chloride                  | chemical      | Salt                | Yes: Salt, in `resins-woods-and-other`           |
| Saltpetre          | Potassium nitrate                | chemical      | Powder              | Yes: Saltpetre, in `resins-woods-and-other`      |
| Graveyard Dirt     | (none)                           | none          | Earth               | Yes: Graveyard Dirt, in `resins-woods-and-other` |
| Moon Water         | (none)                           | none          | Water               | No                                               |
| Black Salt         | (none)                           | none          | Salt                | No                                               |
| Devil's Shoestring | (none)                           | unknown       | Root                | Yes: Devil's Shoestring, in `plants-co-k`        |
| Ginger             | Zingiber officinale              | botanical     | Root                | Yes: Ginger, in `plants-co-k`                    |

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

| File in `/app/.library/`                                                  | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Use it?                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `dokumen.pub_cunninghams-encyclopedia-of-magical-herbs-…epub`             | Scott Cunningham, _Cunningham's Encyclopedia of Magical Herbs_, Llewellyn, Woodbury, Minnesota. Copyright page: © 1985 by Scott Cunningham and 2000 by the Scott Cunningham estate; first e-book edition © 2012; e-book ISBN 9780738717135. The package's metadata adds "Second Edition, Twentieth Printing, 2012" and the print ISBN 978-0-87542-122-3. 428 entry headings.                                                                                                                                                                                                                                              | Yes                                                         |
| `Encyclopedia of Crystal Gem And Metal Magic - READ - fb - READ.pdf`      | Scott Cunningham, _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_, Llewellyn's Sourcebook Series, Llewellyn, St. Paul, Minnesota. Copyright © 1988; "First Edition, Sixteenth Printing, 1996"; ISBN 0-87542-126-1. A scan with a text layer read by OCR (optical character recognition), so expect misread letters ("willleam" for "will learn").                                                                                                                                                                                                                                                               | Yes; check a spelling against the page before relying on it |
| `dokumen.pub_the-witches-encyclopedia-of-magical-plants-…epub`            | Sandra Kynes, _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_, Llewellyn, Woodbury, Minnesota. Copyright © 2024; first e-book edition © 2024; e-book ISBN 9780738775647; the print ISBN on the same page is 978-0-7387-7548-7. 352 plant-name headings.                                                                                                                                                                                                                                                                                                                     | Yes                                                         |
| `9780738732534.pdf`                                                       | Sandra Kynes, _Llewellyn's Complete Book of Correspondences: A Comprehensive & Cross-Referenced Resource for Pagans & Wiccans_, Llewellyn, Woodbury, Minnesota. Copyright © 2013; "First Edition, First Printing, 2013"; ISBN 978-0-7387-3253-4. **An excerpt: 37 pages**, the cover, front matter and printed pages 1 to 26, which stop partway through chapter one ("Issues, Intentions, and Powers"), whose alphabetical entries begin on p. 11 and reach "business" on p. 26. The plant, mineral and animal chapters (from p. 147) are not in it, and the full book is still needed: the owner has been asked for it. | Only for what pages 1 to 26 hold                            |
| `dokumen.pub_the-crystal-bible-volume-1-…epub`                            | Judy Hall, _The Crystal Bible_, Godsfield Press (Octopus Publishing Group), London. "First published in Great Britain in 2003"; copyright © 2003, 2009; "Published as an eBook 2012"; ISBN 9781841814131. The title page says _The Crystal Bible_; "Volume 1" and the subtitle in the file name come from the package's metadata, not the book.                                                                                                                                                                                                                                                                           | Yes                                                         |
| `American Herbal Products Associations Botanical Safety Handbook (…).pdf` | Zoë Gardner and Michael McGuffin, eds., _American Herbal Products Association's Botanical Safety Handbook_, 2nd ed., CRC Press (Taylor & Francis), Boca Raton. © 2013; ISBN 978-1-4665-1695-3 (eBook, PDF). 1,061 PDF pages.                                                                                                                                                                                                                                                                                                                                                                                              | Yes, for safety notes                                       |
| `dokumen.pub_herbal-remedies-for-beginners-…epub`                         | Sandra Kynes, _Herbal Remedies for Beginners: Natural Ways to Treat Ailments_, Llewellyn, Woodbury, Minnesota. Copyright © 2020; first e-book edition © 2020; e-book ISBN 9780738761961.                                                                                                                                                                                                                                                                                                                                                                                                                                  | Yes, for uses and cautions                                  |
| `the_book_of_herbs_1903.pdf`                                              | Lady Rosalind Northcote, _The Book of Herbs_, number XII of the series Handbooks of Practical Gardening (series editor Harry Roberts), John Lane, The Bodley Head, London and New York, 1903. A scan of Cornell University Library's copy, from archive.org (`cu31924073899373`), whose own notice says "There are no known copyright restrictions in the United States on the use of the text". OCR text.                                                                                                                                                                                                                | Yes, for lore                                               |
| `Master Book Of Herbalism PDF.pdf`                                        | **Not Paul Beyerl's book.** A 34-page chapter-by-chapter summary of _The Master Book of Herbalism_ "Written by Bookey", with no page of the original in it.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **No: never cite it**                                       |

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

Culpeper, read online, was added to `works.ts` by MB.243 from its own title page, read on 2026-10-11. It is cited as the edition Project Gutenberg transcribes, the 1850 London edition, not the first edition of 1653; its locator is the entry heading, `under "Agrimony"`.

- Culpeper, Nicholas. _The Complete Herbal_. London: Thomas Kelly, 1850. Project Gutenberg ebook 49513. https://www.gutenberg.org/ebooks/49513.

Grieve's _A Modern Herbal_ is cited page by page, as MB.247 first did: each heading read on botanical.com is a shard source `grieve-<slug of the heading>`, `kind: 'web_page'`, `authors: 'Grieve, M.'`, the heading as `title`, `container: 'A Modern Herbal'`, the page's address and the day it was read. Every lane uses that shape, so two shards citing one page write one `references` row. botanical.com refuses a request without a browser's `User-Agent` and `Accept` headers (HTTP 406 from its firewall); with them it answers.

The sources seed already holds a citation of the first edition, "Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985." That is a different edition and stays a different row: the compendium cites the 2012 e-book, the one the lanes read.

**The locator** says where in the work the passage is:

- **A PDF: the printed page number**, read off the page's text, written `p. 25` (or `pp. 25–26`). Never the file's number: the two differ by the front matter, and not by a fixed amount. In the crystal encyclopedia `0036.txt` is printed page 25; in the safety handbook `0030.txt` is page 1 and `0200.txt` page 172; in the 1903 _Book of Herbs_ `0030.txt` is page 10.
- **An EPUB arranged by entry** (both Cunninghams' and Kynes's encyclopedias, Hall): the entry heading, `under "Mugwort"`: the headword in quotation marks after "under", as Chicago's 18th edition writes it and [`../references.md`](../references.md) records. An e-book reflows, so its heading is the stable place.
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

The list holds 451 `botanical` rows, 6 `fungal`, 7 `zoological`, 118 `mineral`, 14 `chemical`, 7 `unknown` and 11 `none`. 149 rows rest on a single source and are marked `(single source)`. The rows were checked against the rules above when MB.240 committed them: 614 rows, no shared identity, every shard one of the six and every naming system paired correctly with its formal name.

A content task researches its shard's rows. Its seeded entries plus its "What is left out" rows equal its rows in the list; a lane that would leave out more than a tenth of its rows stops and raises it with the owner first.

### Open questions

Carried from the candidate list for the owner, the pilot and the lanes. None is resolved here.

- **Group-for-species mineral names.** `Feldspar var. moonstone` and `Feldspar var. sunstone` put a group where a species belongs, and `Quartz var. dendritic agate` and `Quartz var. milky quartz` rest on a Wikipedia redirect alone. Each needs a Mindat check.
- **Seven `unknown` rows** (Devil's Shoestring, Tourmalinated Quartz, Petrified Wood, Lava Stone, Meteorite, Electrum and Mother-of-Pearl): **decided by the owner on 2026-10-11, they are seeded** as `unknown` with no formal name, under the rule in "Formal names".
- **Brass and steel are `none`**: no naming system for alloys was found.
- **Wikipedia's current names over older usage**: the list follows Wikipedia, so _Betonica officinalis_ (often _Stachys officinalis_), _Senega officinalis_ (often _Polygala senega_) and _Atropa bella-donna_, among others the list names. POWO decides each when the lane checks it.
- **Kynes's _Complete Book of Correspondences_** is an excerpt in the library (above); the full book would be a second source for the minerals, animals and waters.
- **The variant description ceiling** of 120 words, and whether MB.249 folds into MB.248, are the plan's open items for the owner.
