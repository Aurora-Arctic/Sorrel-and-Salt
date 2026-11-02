## The compendium seed (MB.240 to MB.249)

The compendium's starting entries are seeded on staging and production, as reference data, by `npm run db:seed:compendium` (MB.242), the way the five curated vocabularies are. Until 2026-10-11 the plan was for an admin to type every entry by hand; the owner reversed that and asked for a researched, sourced list of **1,111 ingredients**. This folder holds the rules every entry is written to and the candidate list the entries are drawn from. The entries themselves are markdown files under `compendium/` at the repository root, one per entry, each citing its own sources ("An entry, field by field").

- [`candidates.md`](candidates.md): the 1,111 candidate entries (a roster of 614 and an addendum of 497), each with its label, formal name, naming system and shard, and the works the list was drawn from.
- Until M14.10 the entries were TypeScript files, one per shard, each with a doc of its sources here. M14.10 deleted the TypeScript and moved the seven docs to `claude-docs/archive/compendium-seed-shards/`.
- The plan that scoped the work: [`design-decisions/mb.240-plan.md`](../../design-decisions/mb.240-plan.md). Why it is shaped this way: [`design-decisions/mb.240-compendium-seed.md`](../../design-decisions/mb.240-compendium-seed.md).

**The owner's rule, which every other rule here serves: "Do not make stuff up. All claims must have sources."** A field holds a value only if a source the lane read during its task says so. A claim with no source is left out, never filled from memory.

### What is seeded, and where

An _entry_ is one row of `ingredients` in the compendium tier, keyed by its formal name (an ingredient's identity, DESIGN.md §5). Beneath it, one row of `ingredient_variants` per form it is sold or used in: the herb, the oil, the root. Only entries count toward the 1,111; forms are extra rows beneath them (MB.215).

The candidate list divides its rows among the content tasks by **shard**, a group of about 50 to 135 rows, so that no task's pull request is too large to review. Each entry in a shard is still one file of its own. The counts are the candidate list's:

| Task   | Shard                                                                            | Entries |
| ------ | -------------------------------------------------------------------------------- | ------- |
| MB.242 | `pilot`: one of each kind, proving the shape and the guard                       | 14      |
| MB.243 | `plants-a-cn`: plants and fungi, labels A to Cn                                  | 112     |
| MB.244 | `plants-co-k`: labels Co to K                                                    | 116     |
| MB.245 | `plants-l-q`: labels L to Q                                                      | 104     |
| MB.246 | `plants-r-z`: labels R to Z                                                      | 98      |
| MB.247 | `resins-woods-and-other`: resins, woods, incense; animal products, salts, waters | 48      |
| MB.248 | `stones-and-metals`: minerals, rocks, metals and alloys                          | 136     |

From M14.10 a content task writes one markdown file per entry under `compendium/`, and nothing under `src/db/seed/compendium/`. The pilot's 14 are rows of the candidate list, so they count toward the 1,111: MB.242 names them, and the shards they come from research them no further. The plan split the plants at A–C, D–K, L–R and S–Z; the list moved the split points to Co, L and R, which balance the four at 98 to 116 rows rather than 87 to 130. The resins, woods and other ingredients came in at 48 against the plan's estimate of about 80, because few of the sources read name them and no row was added without a source.

### An entry, field by field

An entry is one markdown file, `compendium/ingredients/<nomenclature>/<slug>.md`, where the slug is `ingredientSlug(name, canonicalName)` (`src/lib/slugify.ts`) and the folder is the entry's naming system (`botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `none` or `unknown`). The file holds a YAML frontmatter block, a `# Name` heading, the description, and two optional sections for the owner and the curator. The decision, the full key table, the hash and the update path are in [`design-decisions/m14.4-compendium-markdown-files.md`](../../design-decisions/m14.4-compendium-markdown-files.md); the plan is [`m14.4-plan.md`](../../design-decisions/m14.4-plan.md). The loader (M14.6) is `loadCompendium(root)` in `src/db/seed/compendium/load.ts`: it reads every file under `ingredients/<nomenclature>/`, every `sources/<handle>.yaml` and `unaudited.txt`, and returns the files, their issues, and the one shard `checkCompendium` takes. `seedCompendium` takes what it returns and seeds the `approved` files only. `checkCompendiumFiles(loaded)` in `guard.ts` adds the files' own rules to `checkCompendium`'s: a file sits at the path its identity gives it, a `seedUpdate` names the current hash, a `needs-review` file has a Questions section, every citation of an entry with a formal name carries a `nameBasis` as "Formal names" sets out, and on `staging` and `main` (`releaseBranch()`, read from the CI branch variables) a `draft` file fails. The content rules, length, closed lists and sourcing, are held against `approved` files only; identity, path and format against every file.

`compendium/left-out.md` records the candidates the roster considered and left out, each with its reason and source. It sits directly under `compendium/`, outside `ingredients/` and `sources/`, which are the only folders the loader and the guard read, so neither sees it.

**The files are the seed's only source** (M14.10). M14.9 converted the TypeScript shards into these files without changing what they say: it wrote the 313 entry files, the per-entry sources, `unaudited.txt` and the manifest, and a fidelity test proved each file read back as its literal, with the same hash, the same guard issues and the same citation texts. M14.10 deleted the shards, the converter and the fidelity test. `tests/db/seed/compendium-files.test.ts` runs the guard over the real files, locally and on each release branch. At M14.10 there were 314 files: 311 `approved`, which the seed inserts, and 3 `needs-review` (the two aspens and agate), which it does not until the owner answers their questions.

**Shown or hidden** (M14.35). An entry with no `categories` on it and none on any of its forms has no sourced magical use, so the seed lands it hidden from the public (`ingredients.shown = false`); one with a category on it, or on at least one form, lands shown. The flag is not a frontmatter key: the seed derives it from those categories when it inserts a row and never again. Rows the seed had already landed were backfilled once by migration `0109`, by the same rule, because nobody could have chosen Show or Hide before then. A curator shows or hides an entry by hand from the admin compendium, and that choice stands. The run summary counts the entries inserted hidden (`hidden N`).

A worked example, **invented**, as the repo's fixtures are (CLAUDE.md, Testing). Testwort, _Fixtura testalis_, does not exist, and nor do its sources. It is `compendium/ingredients/botanical/testwort-fixtura-testalis.md`. The real examples are in `compendium/` ([`aspen-populus-tremuloides.md`](../../../compendium/ingredients/botanical/aspen-populus-tremuloides.md), [`agate-quartz-var-agate.md`](../../../compendium/ingredients/mineral/agate-quartz-var-agate.md) and the template, [`base.md`](../../../compendium/ingredients/base.md)), which M14.6, M14.9 and M14.12 bring to this format.

```md
---
status: approved
nomenclature: botanical
canonicalName: Fixtura testalis
elements:
  - earth
celestialBodies:
  - Saturn
zodiacSigns:
  - Capricorn
colours:
  - green
safetyNotes: A hazard, in plain words, with whom it is for and where the source says so. Never a claim that the ingredient is safe, and never a safety class that only says "safe" (AHPA class 1, interaction class A, Cunningham code G, GRAS); a class that states a restriction (2b, 2d) is written as the restriction.
folkNames:
  - Fixture Herb
deities:
  - Hecate
categories:
  - Protection
  - Grounding
substitutes:
  - identity: fixtura exemplaris # an entry that has a file
  - name: Sampleroot # typed text: no file has this identity
references:
  # `supports` names the fields this source backs. Every populated field must be named by
  # at least one citation, or the guard fails the file.
  - source: invented-herbal # a handle from works.ts, or a file in compendium/sources/
    locator: p. 112
    nameBasis: stated # the source prints "Fixtura testalis" under this heading
    supports:
      [canonicalName, description, elements, celestialBodies, deities, categories, substitutes]
  - source: wikipedia-testwort # compendium/sources/wikipedia-testwort.yaml
    nameBasis: resolved # the source heads a common name, so two more keys say how it was mapped
    headedAs: Testwort
    resolvedBy: invented-flora # another registered source that maps "Testwort" to this one name
    supports: [description, zodiacSigns, colours, folkNames, safetyNotes]
variants:
  - form: Leaf
    references:
      - { source: invented-herbal, locator: p. 112, nameBasis: stated, supports: [form] }
  - form: Oil
    description: At most 120 words on what this form adds.
    safetyNotes: A caution particular to the oil.
    toxic: true # only where a source says this form is poisonous; left out otherwise
    references:
      - source: invented-safety-handbook
        locator: p. 418
        nameBasis: stated
        supports: [form, description, safetyNotes, toxic]
---

# Testwort

100 to 250 words, written fresh: what the plant is, where it grows, how it has been used. A blank line starts a new paragraph, and a single line break inside a paragraph is read as a space.

#### Questions for the Curator

Left out when there is no doubt. Where a source's name could mean another species, the doubt is written here and the file's `status` is `needs-review`.

#### Edit Notes for Claude

Left out when there is nothing to ask. The owner writes an edit here; Claude acts on it and clears it. It is never seeded and never hashed.
```

What the example shows:

- **The body is the name and the description.** The `# Testwort` heading is the entry's `name`, the text up to the first `####` heading is its `description`, and no other H1, H2 or H3 is allowed. A `needs-review` file must have a non-empty Questions section. `status` is `draft`, `needs-review` or `approved`, and the seed writes `approved` files only.
- **Every entry cites at least one source of its own, and so does every form.** The admin's "unsourced" filter counts only entry-level links (`citesNothing('ingredientId')` in `src/db/repository/ingredients.ts`), so a source cited only on a form would leave the entry on the admin's to-do list.
- **Every citation of an entry that has a `canonicalName` says how its source's name was matched** (`nameBasis`), as "Formal names" below sets out. An entry with no formal name is exempt.
- **The toxic flag is on only where a source says so, in so many words** (M14.1). The entry's flag goes on when a source says the plant, or any part of it, is poisonous or toxic to people or pets. A form's flag goes on only on a form the entry already has, and only when the source says that form is: an essential oil's poisoning flags the oil, and whether the whole plant is flagged too is the admin's or curator's call. The two flags are independent, never read into each other (DESIGN.md §5, "The toxic flag is the one exception"). The value is `true` alone: a written `false` would claim the plant is safe, which needs a source of its own, so the key is left out instead. A flag is a populated field, so at least one citation's `supports` must name `toxic`. A safety class, a drug interaction or a warning in pregnancy sets no flag; a sourced safety note that says poisonous, toxic or fatal if swallowed does, so the note and the flag agree.
- **A form adds to its entry and never overrides it** (MB.215). Put a property on the entry when every form has it, and on a form when only that form does. Deities and folk names belong to the entry alone.
- **Every entry carries at least its primary form as a variant.** A further form is added only where a source the lane read attaches something to that form: a description, a caution, a use.
- **A work is cited once on an entry or a form.** `reference_links` holds one live link per work per row, so two passages of one book are one citation whose locator names both (`under "Mugwort"; p. 266`). The guard refuses a work cited twice on one row.
- **A category is the source's own word** (the pilot, MB.242). A power is filed under a category only where the source prints the category's word or a direct form of it: "psychic powers" and "psychic abilities" are Psychic Work, "banish" is Banishing, "divinatory" is Divination, "loyalty/fidelity" is Fidelity. A different word is never mapped, however close: "prophetic dreams" is neither Prophecy nor Dream Work, and has a category of its own. Two mappings are deliberate exceptions, decided by the owner on 2026-10-29: "money" is Wealth, and "exorcism" is Banishing. The other mappings that decision recorded are in `claude-docs/db/category-gaps.md`.
- **A deity is the curated row the source names** (MB.242). A spelling the curated slug folds to the same row is that row (Kynes's "Manannán Mac Lir" is the curated Manannan mac Lir). So is one of the deity's other names in `src/db/seed/deities.ts` (M14.23): write the source's spelling, and the seed links the deity it names and stores the deity's own name on the link (Kynes's "Woden" is Odin, "Ganesh" is Ganesha). A deity's own name wins over another deity's other name. The guard refuses a name that is no deity's name or other name, an other name of more than one deity, and a deity listed twice under two of its names. Any other name is not the deity until the deity seed gives the deity that name.
- **A colour is one a source gives the ingredient** (MB.242): a correspondence or, for a stone, the colour its entry lists. Only `src/db/seed/compendium/colours.ts`'s list is written.
- **Where Cunningham and Kynes disagree** on elements or celestial bodies (Mugwort, Yarrow), the entry holds both books' values, each cited (MB.242).
- **A book entry covering several species** (Kynes's Lichen, Sandalwood, Cinnamon and Seaweed; Cunningham's Bladderwrack, "and various other plants") is applied to the entry its heading names (MB.242).
- **A substitute names an entry by its identity key when that entry has a file**, the formal name lower-cased or the label where there is none. `{ name }` typed text is allowed only when no file has that identity. The seed inserts every entry before it resolves substitutes, so the order of files does not matter.
- **Colours are `colours` in a file**, as a key and in a `supports` list. The loader writes them to the database's `colors` column.
- **Blank values read as absent.** A key with nothing after it, an empty list item, `[null]` and `[""]` are the same as leaving the key out, so the template's empty `deities:` is valid.
- **The key order in a file is free.** The converted files share one fixed order, with `status` first.

### What `supports` may name

A citation's `supports` lists the fields it backs, using the file's own field names (`colours`, which the loader writes as the column's `colors`):

| On an entry       | On a form (variant) |
| ----------------- | ------------------- |
| `name`            | `form`              |
| `canonicalName`   | `description`       |
| `nomenclature`    | `safetyNotes`       |
| `description`     | `elements`          |
| `elements`        | `celestialBodies`   |
| `celestialBodies` | `zodiacSigns`       |
| `zodiacSigns`     | `colours`           |
| `colours`         | `categories`        |
| `safetyNotes`     | `substitutes`       |
| `toxic`           | `toxic`             |
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
| `categories`      | 101 categories in 8 groups                                                    | `src/db/seed/categories.ts`, `CATEGORIES`                                   |
| `deities`         | 290 deities in 88 traditions                                                  | `src/db/seed/deities.ts`, `DEITIES`                                         |
| `celestialBodies` | 19 celestial bodies, Sun to South Node                                        | `src/db/seed/astrology.ts`, `CELESTIAL_BODIES`                              |
| `zodiacSigns`     | 13 signs, Ophiuchus included                                                  | `src/db/seed/astrology.ts`, `ZODIAC_SIGNS`                                  |
| `elements`        | `earth`, `air`, `fire`, `water`, `spirit`                                     | `src/modules/ingredients/schema/ingredient-enums.ts`, `INGREDIENT_ELEMENTS` |
| `nomenclature`    | `botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `unknown`, `none` | the same file, `NOMENCLATURE_KINDS`                                         |
| `colours`         | a closed list of lower-case British colour names                              | `src/db/seed/compendium/colours.ts` (MB.242)                                |

A value a source gives that is not on the list is left out of the field, and the content task's "What is left out, and why" names it ("What a source is recorded in"), so the owner can decide whether the list should grow. A lane never adds to a curated list itself: a list is its own task.

### Formal names

An entry's formal name is its identity: two entries may share a label, never a formal name. The rules (plan decision 9):

- **Plants** take the accepted name in Plants of the World Online (POWO), in `Genus species` form, with `subsp.`, `var.` or a quoted cultivar where the entry is one (`Lavandula angustifolia 'Hidcote'`). Where practice does not split a genus into species, the genus alone. Where the candidate list names a group within a genus by its rank, the rank stays in the name (`Rubus subg. Rubus`, `Vaccinium sect. Cyanococcus`), and the guard takes that shape (MB.243).
- **Fungi** take their binomial, with `nomenclature: 'fungal'`.
- **Minerals** take the stone's own name as Wikipedia or Mindat heads it (`Malachite`, `Apache tears`, `Herkimer diamond`, `Chevron amethyst`), and a rock rather than a mineral species is named as the mineral system names it (`Lapis lazuli`). `<Species> var. <variety>` is written only where a source read names the variety that way; the roster's first 614 rows use it as `standard` does (`Quartz var. amethyst`, already seeded under that key), and those rows stand unchanged, so amethyst, citrine and rose quartz stay three entries. A new row never coins the shape (`Obsidian var. Apache tear` is wrong). Mindat is the preferred reference for mineral names. Under the owner's decisions of 2026-10-11 ([`design-decisions/mb.240-compendium-seed.md`](../../design-decisions/mb.240-compendium-seed.md), "Addendum"):
  - **A named sort of stone is its own entry, never a form**: Apache tear, snowflake, mahogany and rainbow obsidian, chevron and pineapple amethyst, Herkimer diamond, phantom quartz, tree agate, picture jasper, hawk's eye, watermelon tourmaline, and every coloured sort of calcite, jasper, agate or tourmaline that Hall or Cunningham gives its own heading or paragraph.
  - **A stone treated in a laboratory is an entry** where Hall heads it (aqua aura, opal aura, rainbow aura, rose aura, ruby aura, sunshine aura, titanium quartz, Siberian blue quartz), and its description says it is treated.
  - **A crystal formation is a form**: Hall's cluster, point, wand, double terminated, elestial, record keeper, sceptre, phantom, generator and her other shape headings are variants beneath Clear Quartz, and a geode is a form of the stone it holds. A variant is only ever a physical form.
- **Metals and salts** take their chemical name, with `nomenclature: 'chemical'` (`Sodium chloride`).
- **Animal products** are forms beneath the animal's binomial: honey and beeswax are both _Apis mellifera_, with `Honey` and `Wax` as its forms.
- **A preparation no naming system names** (black salt, moon water) takes `nomenclature: 'none'` and no formal name. `none` is an answer, not a gap.
- **`unknown`** means a formal name exists and is unsettled: the sources read disagree, or none settles it. A candidate row whose naming system is `unknown` is seeded with `nomenclature: 'unknown'` and no `canonicalName` (the owner's decision, 2026-10-11), which the CHECK below allows. Its description says in one sentence why the name is unsettled, citing the sources that disagree (Devil's Shoestring: Cunningham and Kynes both head their entries with the hobblebush, _Viburnum alnifolium_ or its synonym _V. lantanoides_, but Kynes's Yucca entry gives the name to _Yucca filamentosa_ and Wikipedia gives it to _Nolina lindheimeriana_; MB.242's pilot corrected this). The seed never chooses a name from memory. With no formal name, the entry's identity falls to its label: `identity_key` is `lower(coalesce(canonical_name, name))` (`identityKeyOf` in `src/modules/ingredients/schema/ingredients.ts`), so Devil's Shoestring keys as `devil's shoestring`, and a later curator who settles the name changes its identity.

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

**A formal name is a unique identifier, and a common name never is** (the owner, 2026-10-23, from the Aspen entry; [`m14.4-compendium-markdown-files.md`](../../design-decisions/m14.4-compendium-markdown-files.md)). The Aspen entry, the American aspen _Populus tremuloides_, carried European lore from Kynes's joint "Aspen" entry, which heads both the European _Populus tremula_ and the American tree, because both are called aspen. (The rule was first raised about Grieve's "Poplar, Trembling", but M14.12 read the page: it is headed _Populus tremuloides_, so it names this entry's formal name.) So a source is cited on an entry only when:

1. **it states the formal name**: the source prints this entry's formal name under the cited heading (`nameBasis: stated`); or
2. **it is resolved**: the source heads a common name, and another registered source maps that common name to exactly this one formal name (`nameBasis: resolved`, with `headedAs` for the heading and `resolvedBy` for that other source).

A common name alone is never a match. Where doubt remains, the citation is `unresolved`, the doubt goes under `#### Questions for the Curator`, and the file is `status: needs-review` for the owner. It is never `approved` while a citation is `unresolved`, and only `approved` files are seeded. `nameBasis` is required on every citation of an entry that has a `canonicalName`; an entry with none is exempt.

### How an entry is sourced

These are the lane brief's hard rules, repeated in every content task:

1. **Every field value traces to a source read during the task**: a page of one of the owner's books (below), or a web page the lane fetched. Never from memory, and never from another seed or doc in this repo.
2. **A claim with no source is left out.** An entry that cannot be sourced to the depth below is not written as an `approved` file; the reason goes in the file's Questions section and the entry is `needs-review`, or it is left off the list and the reason recorded with the lane's notes.
3. **Never invent a page, a URL, an edition or a year.** A locator is only what was read: the page the passage is on, or the entry heading it is under.
4. **`accessed` is the real date of the fetch**, never a guess.
5. **No prose is copied from any source**, public domain or not. A description is written fresh, 100 to 250 words for an entry and at most 120 for a form (the owner may change either), in British spelling, from what the sources say.
6. **Correspondences are cited entry by entry, never transcribed as a table.** The candidate list and the correspondences are drawn from several works, so the seed mirrors no single book's selection.
7. **Every citation names the edition in hand.** A book from the library is cited as the file it is, below, not as some other printing.
8. **Every citation of an entry that has a formal name carries a `nameBasis`**, under the rule in "Formal names". A source is never cited under a common name that could mean another species.

**Which sources stand where.** Academic and reference sources are preferred where they cover the field: POWO for plant names, Mindat for mineral names, NCBI's LiverTox and NCCIH for safety, the _AHPA Botanical Safety Handbook_ in the library. Wikipedia is a valid source beside the others, never a last resort. Grieve's _A Modern Herbal_ (1931, read at botanical.com), Culpeper's _Complete Herbal_ (1653, Project Gutenberg #49513), Kunz, Folkard, Dyer and the owner's books are all first-class for lore and correspondences.

**Wikipedia is cited as an encyclopaedia entry**, as the sources seed already cites it 64 times (`src/db/seed/sources.ts`; [`../references.md`](../references.md), "The renderer"): `kind: 'entry'`, `container: 'Wikipedia'`, the article's title as `title`. The compendium seed adds one thing to that precedent: `url` is the **revision permalink**, `https://en.wikipedia.org/w/index.php?title=<Title>&oldid=<revision id>`, so the citation points at the text the lane read and not at whatever the article says later, and `accessed` is the day it was fetched. The revision id is the "Permanent link" in the article's Tools menu, or `revisions[0].revid` from `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=ids&format=json&titles=<Title>`.

**A per-entry source is a file of its own**, `compendium/sources/<handle>.yaml`, holding the citation's fields (`kind`, `container`, `title`, `url`, `accessed`) and, for a work scholars edited or reviewed, `scholarly: true`. A work is scholarly when scholars edited or reviewed it, in print or online: a peer-reviewed journal; a university, its press or its museum; an academic press; a learned society's edition or series; a reference work edited by scholars with signed articles. It is not scholarly when it is a trade press, a wiki, a site that republishes others' works (credit the original work instead), or an unsigned site. The nine works several entries share (Cunningham, Kynes, Hall, Grieve and the rest) stay in `src/db/seed/compendium/works.ts`. A file's citation names a source by handle and, if it needs one, a locator. The entry's hash covers the handle and the locator only, so editing a source file changes no entry's hash.

#### What a source is recorded in

An entry file's citations say which source supports which fields (`supports`), and each source is a work in `works.ts` or a file under `compendium/sources/`. Until M14.10 each shard also had a doc recording its sources; M14.10 moved those docs to `claude-docs/archive/compendium-seed-shards/`. From M14.10 a content task's pull request body carries its "What is left out, and why": each candidate row it did not write, and each value a source gave that is off a closed list, with the reason.

### No endangered species

The owner's rule (M14.29): "No endangered species in the compendium please." Four answers set how it applies:

1. **Remove** an entry whose species is global IUCN Endangered or Critically Endangered, or is on CITES Appendix I.
2. **Only global listings count.** A national, state or regional status never removes an entry. Each listing's `scope` key (below) is what tells the two apart.
3. **A cultivated supply is the exception.** Keep the entry when a source says its trade supply is cultivated (for example coffee and vanilla). The owner approves each one under M14.13.
4. **The formal-name rule applies.** A listing counts only where the list prints the entry's formal name, or an authority maps its name to exactly that one. Doubt goes to "Uncertain" for the owner.

A new content task checks each candidate against these before it writes the entry. The list of what to remove, keep, ask about and leave alone is `compendium/ethics/endangered-removals.md`. Deleting the file is not enough for a row that has already landed in a seeded database, because the seed never deletes a row whose file is gone. A forward-only migration retires it by seed key (M14.30, `0090_retire-endangered-entries.sql`): it soft-deletes the entry and every variant no coven's stock row or spell layer names, and leaves the variants a coven holds live. Later seed runs report the key as `retired` and never revive it. Retire a later removal the same way, with a new migration. The record is `claude-docs/design-decisions/m14.29-no-endangered-species.md`.

### Conservation and closed-practice files

M14.29 gathers, from sources, three kinds of fact about an entry: its conservation listings, any concern about taking an animal part, and any tradition a source says is closed. It gathers data only; it builds no warning (`claude-docs/backlog.md`). The files live in `compendium/ethics/`, beside `compendium/ingredients/`. **The seed never reads `compendium/ethics/`**: it reads only `ingredients/` and `sources/`, so nothing here changes an entry's hash.

- **The folder.** `compendium/ethics/<nomenclature>/<entry-file-slug>.yaml`, mirroring the entry's path under `compendium/ingredients/`. A file is written only when there is something to record or to ask. An entry with nothing to record gets no file.
- **The sources folder.** `compendium/ethics/sources/<handle>.yaml`, in the same shape as `compendium/sources/*.yaml`. Ethics sources never go in `compendium/sources/`, because the seed reads that folder. A source an entry already cites is copied across under the same handle. Fixed handles for the shared lists: `cites-appendices`, `ups-species-at-risk`, and `iucn-<genus>-<species>` for each IUCN assessment.
- **`checked.md`.** `compendium/ethics/checked.md` lists each entry that was checked and has nothing to record, one line `<nomenclature>/<entry-file-slug>`, under a heading `## <task id>` for the task that checked it (`## M14.29` for the seeded entries). The heading also says which lists were checked against.

A file has these fields. Leave out any section with nothing in it, and add no other key.

| Field                  | Meaning                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entry`                | The entry's path under `compendium/ingredients/`, without `.md`, e.g. `botanical/american-ginseng-panax-quinquefolius`.                                                                                                                                                                                                                                                                    |
| `status`               | `approved`, or `needs-review` when any value is in doubt or a question is open. A `needs-review` file joins M14.13's review.                                                                                                                                                                                                                                                               |
| `listings[]`           | One item per list that names the entry.                                                                                                                                                                                                                                                                                                                                                    |
| `listings[].list`      | `cites`, `iucn` or `other`.                                                                                                                                                                                                                                                                                                                                                                |
| `listings[].name`      | The list's own title; for `other`, e.g. "United Plant Savers Species At-Risk".                                                                                                                                                                                                                                                                                                             |
| `listings[].value`     | The category exactly as the source prints it, e.g. `Appendix II`.                                                                                                                                                                                                                                                                                                                          |
| `listings[].listedAs`  | The name the list prints.                                                                                                                                                                                                                                                                                                                                                                  |
| `listings[].scope`     | Where the listing applies. `global` for an IUCN global assessment (a Wikipedia taxobox status is global unless the page says otherwise), CITES, a NatureServe global rank and the United Plant Savers list. Otherwise the place name exactly as the source gives it (`Europe`, `Canada`, `Utah`). `unknown` when the source does not say; the file is then `needs-review` with a question. |
| `listings[].nameBasis` | `stated` (the list prints this entry's formal name) or `resolved` (an authority maps the list's name to it; adds `resolvedBy`).                                                                                                                                                                                                                                                            |
| `listings[].source`    | A handle in `compendium/ethics/sources/`.                                                                                                                                                                                                                                                                                                                                                  |
| `listings[].locator`   | Where in the source, e.g. `Appendix II, Araliaceae`.                                                                                                                                                                                                                                                                                                                                       |
| `animalPart[]`         | A concern about taking an animal part: `quote` (the source's words), `source`, `locator`.                                                                                                                                                                                                                                                                                                  |
| `closedPractice[]`     | A tradition a source names as closed or restricted: `tradition` (the vocabulary's name, or the source's wording), `quote`, `source`, `locator`.                                                                                                                                                                                                                                            |
| `questions[]`          | A question for the owner, with a recommendation.                                                                                                                                                                                                                                                                                                                                           |

Absence from a list means nothing to record. It does not mean the entry is safe or "Least Concern". A practice is never inferred to be closed from a tradition's name.

**The formal-name rule applies to a listing.** A listing is this entry's only when the list prints this entry's formal name (`stated`), or an authority such as POWO says the list's name is a synonym of exactly this formal name (`resolved`). An assessment of another species, subspecies or synonym is not this entry's. A genus-level listing (CITES lists some genera whole) counts only where the list or an authority states that it covers this formal name. Any doubt makes the file `needs-review`, with the question under `questions`.

### Write-once, and how a correction lands

The seed has two ways to meet an entry. Both apply to `approved` files only; a `draft` or `needs-review` file is never written. (This describes the seed from M14.7, reading the files from M14.10. Before M14.7 the seed was write-once over the TypeScript shards: it inserted an entry once and skipped it on every later run.)

**Insert.** An entry that is absent is inserted, with everything beneath it written in the same pass: its forms, folk names, deities, categories, substitutes and source links. The seed stores the entry's content hash on the row (`seed_content_hash`). An entry is present when any of these holds:

- a row carrying the entry's seed key (`seed_key`, which MB.241 adds: the identity key as the seed wrote it, the formal name lower-cased or the label where there is none), live or deleted;
- a live compendium row with the same identity, an admin's or the `standard` fixture's;
- a live compendium row already holding the entry's address (its slug).

**The shown flag is write-once.** Insert sets `shown` from the file's categories, on the entry or on any form. The update path, a marked file and `--force` included, never writes it, and nothing flips it when categories change; the curator decides.

**Update.** A present entry is changed only by a file that the owner has marked. Editing a file does nothing on its own. The owner reads the change, runs `npm run seed:mark <file>` (M14.7), and that writes `seedUpdate: <hash>` into the file's frontmatter, the hash of the file as it stands. On the next seed run the entry is updated when `seedUpdate` equals the file's hash and the row is not what the file says: either the file's hash differs from the row's stored hash, or the hashes match but a field on the row differs from the file and no person worked on the row. The second case is drift: a row written before its file changed that still holds the new hash, as the rows did that adopted the conversion manifest's hash although the old shards had seeded them without `toxic: true` (M14.1). Under a matching hash, a row that differs because a person worked on it (it is curator-reviewed, a person last updated it, or a person touched or deleted one of its children) is skipped quietly: the file has not changed since that work, so the work stays, no line is printed and the run does not fail on it. Only `--force` (M14.26) overwrites it. A matching hash with nothing differing is skipped too. If the file changed again after the mark, the two differ. That is a stale `seedUpdate`, and the guard fails it: `seedCompendium` refuses to run, and CI fails, until `seed:mark` is run again or the line is removed. An edited file with no `seedUpdate` at all stays `PENDING`, and so does an unmarked file whose row has drifted from it under a matching hash. `PENDING` is counted in the run's summary and is not an error. `seedCompendiumContent`, the layer below the guard, also reports a stale mark as `PENDING`; a real run never reaches it.

#### The hash

The hash is a SHA-256 over the fields that reach the database: scalars, lists, substitutes, the title, the description, the forms, and each citation's source handle and locator. It leaves out `status`, `seedUpdate`, `overwriteEditor`, `supports`, the provenance keys, Edit Notes and Questions, so a note or a reordered key never reads as a change (the rules are in the decision record).

**A citation's `nameBasis` and `supports` are stored on its link and are not hashed.** Adding them to the hash would have staled every `seedUpdate` mark and turned each marked row a person has worked on from a quiet skip into a refusal. They say where content comes from rather than being content, so they are not compared with the entry's fields either: a link that differs only in them is not among the fields that differ, and the rules in "Citation attributes on a present entry" write them.

**Refusals.** An update is refused, and the entry changes in no way, when:

1. **the row is curator-reviewed** (`curator_reviewed_at` is set);
2. **an editor has touched the row**: it was last updated by anyone but the bootstrap user;
3. **an editor has touched or deleted a child**: a form, folk name, deity link, category link, substitute or reference link stamped by a person, or soft-deleted by anyone but the seed itself (a row the seed retired on an earlier update is its own work, and never a refusal);
4. **there is no baseline**: the stored hash is null and the entry could not be adopted (below);
5. **the update would change identity**: its `name`, `canonicalName` or slug. That is the admin's to change, since a slug's retirement belongs to the admin service;
6. **a form is in use**: the update removes a form that stock or a spell layer holds.

Refusals 1 to 3 are overridden for one file by `overwriteEditor: true` beside `seedUpdate`. Refusals 1 to 4 are overridden for every file in the run by `--force` on `db:seed:compendium` or `db:seed:reference` (M14.26); the hand-started `seed-environment.yml` passes it to `db:seed:reference` when its `force` input is on (claude-docs/ci/deploy.md). Nothing overrides refusals 5 and 6, and `--force` never updates a file without `seedUpdate`: it stays `PENDING`. An update that lands under either override also clears the curator mark, because the seed is not a curator and the content is no longer what was reviewed (a stated assumption the owner confirms; see the decision record). A refused entry is skipped and the rest of the run applies. The run prints one line per `UPDATED`, `REFUSED`, `PENDING` and `RETIRED` entry and per `KEPT` citation or source (below), follows each `PENDING` and `REFUSED` line with the fields that differ, closes with the counts, and exits 1 if any entry was refused. Under `--adopt`, which the deploy passes, it also prints an `ADOPTED` line, with what differs, for each row that took its baseline from the manifest; under `--dry-run` it decides, prints and rolls the transaction back, so a dry run writes nothing. `migrate.yml` shows these lines in the deploy's job summary on every run, in a collapsed block (M14.1), and posts the `REFUSED` block as a comment on the pull request the deploying commit came from. An entry a curator soft-deleted is `RETIRED`: the seed never revives it, and the run still exits 0.

**Citation attributes on a present entry.** A citation's `nameBasis` and `supports`, and a source's `scholarly` mark, are provenance, so neither the `seedUpdate` mark nor a person's work on the entry holds them back. Each is decided on its own row:

- On every present entry that is not `RETIRED`, whatever else the run decides for it (skipped, `PENDING` or `REFUSED`), each live link matching a file citation by owner, work and locator takes the citation's name basis and supports where they differ, in place, unless a person edited that link. Nothing else on the entry is written: its hash, its stamps and its curator mark stay. An entry being updated restates its links with everything else.
- Each live compendium source the seed wrote (by its seed key) takes its work's `scholarly` mark from `works.ts` or `compendium/sources/`, set or cleared, unless a person edited that source. A work named under two handles is scholarly if either says so. The vocabulary seed does the same for the sources in `src/db/seed/sources.ts`, under the same rule. Each seed restates only the sources its own list names, and `tests/db/seed/sources.test.ts` fails when a work in both lists carries different marks, so neither seed undoes the other.
- A link or source a person edited is kept as the person left it. The run prints `KEPT <entry file>: <source handle> (edited on the site)`, or `KEPT <source handle> (edited on the site)` for a source, followed by the fields that differ. A vocabulary source is named by its citation: `db:seed:sources` prints its `KEPT` line on its own, and `db:seed:reference` prints it with the compendium's. A `KEPT` line is not a refusal and does not fail the run.

**Adoption.** The rows seeded before the hash existed have no stored hash. The conversion (M14.9) wrote `compendium/.converted-hashes.json`, the hash of each converted file. While it exists, a seed run stores that hash, never the current file's, on a row whose hash is null and whose row and children are all stamped with the bootstrap user, so a file edited after conversion still reads as changed. An adopted row whose content differs from its file goes on in the same run as any other row that differs: `PENDING` when its file is unmarked, and updated or refused when it is marked. Every other null stays null and is refused, unless the run is forced with `--force`. `db:seed:compendium -- --adopt --dry-run` lists what would be adopted, what would be refused, and any value that differs from its file, since a row written once can hold content older than a later correction to its literal. A later task deletes the manifest once production has adopted.

**The review queue.** A file marked `status: needs-review` is the owner's queue, and the owner reads its `#### Questions for the Curator` section. `npm run seed:queue` (which M14.7 adds) lists those files. CI allows `needs-review` on any branch, and fails a `draft` file on `staging` and `main`.

**A change reaches production within the hour.** The compendium read is cached and revalidates every hour (`COMPENDIUM_REVALIDATE_SECONDS = 3600` in `src/lib/compendium-cache.ts`). Nothing in CI can expire that cache, so after a seed update on production the old text can show until the hour is up.

**`nameBasis` and the `unaudited` ratchet.** The conversion (M14.9) marked every citation `nameBasis: unaudited`, because it copied each from the shards without checking it against the formal-name rule. The exception is a file that was already in `compendium/` with a review on it, the two `needs-review` samples (Aspen and Agate): the conversion kept their status, their sections and each citation's `nameBasis`, so they are not on the list, and took every other field from the shard. `unaudited` is accepted only in the files listed in `compendium/unaudited.txt`; a listed file with no `unaudited` citation fails as stale, and the list may only shrink. The ratchet (M14.11) is a test in `tests/db/seed/compendium-files.test.ts`: it holds the list against `tests/db/seed/compendium/unaudited-baseline.txt`, fails on a path the baseline lacks, and asks for the baseline to drop a path the list has dropped, so the two shrink together. New files cannot use `unaudited` at all.

#### The attribution audit

The attribution audit (M14.11), `npm run compendium:audit`, looks for a citation that may describe another species under the same common name, as Aspen's did. It reads the entry files, the sources and works, and the Wikipedia pages the seed lanes fetched (by default every `~/.claude/projects/-app/seed-scratch/shards/*/wiki/<Title>.wikitext`; `--wiki <dir>` names others). It reads each citation not yet `stated` or `resolved` under its heading: each `under "X"` in the locator, or the source's title. Three heuristics score it. **Collision** (3 for each other formal name): another file has the heading as its name or a folk name. **Hatnote** (2 for each taxon, with two or more needed): the heading's page names other taxa in an `{{about}}`, `{{for}}`, `{{other uses}}`, `{{redirect}}`, `{{distinguish}}` or `{{see also}}` hatnote, or is a disambiguation page, read by its `*` lines. **No binomial** (1): the heading prints no taxon name, or for a non-taxonomic entry does not contain its formal name. A fourth, the **own-taxon check**, reports as `stated` a Wikipedia citation whose taxobox names the entry's formal name, and drops it from the candidates (a mineral or chemical has no taxobox, so `pageNamesEntry` reads the page's title or infobox name instead: a plain name needs a mineral infobox, a chembox or a "chemical element" lead, and refuses a rock or a group; a variety, "Quartz var. amethyst", needs the variety's own article saying it is a variety of that mineral, in its infobox `IMAstatus` or its first sentence); the audit never writes `stated`, which a lane or the owner sets from the page. `--report`, the default, prints the ranked table and writes nothing. `--apply` writes only the candidates that name another formal name (`--all` writes every candidate): the file goes to `needs-review` (a `draft` stays a draft), and its `#### Questions for the Curator` gains one block per citation, made above the Edit Notes when absent, opening with `<!-- audit:<source>:<heading> -->`, so a second run adds nothing. Neither the status nor the sections are hashed, so a `seedUpdate` mark stays good. The code is `src/db/seed/compendium/audit.ts`, `audit-apply.ts` and `audit-run.ts`.

**A correction of an entry on the site is the other route.** A curator or admin who has checked an entry switches its "Reviewed" switch on (M14.8), and the seed then leaves it alone. Only that switch sets or clears the mark (the owner's call, 2026-10-23): creating, editing or promoting a folk name does not, and switching an already-reviewed entry to reviewed again keeps the first date and reviewer. The mark is `curator_reviewed_at` and `curator_reviewed_by` on the row. Everyone sees the badge, "Reviewed By Curator" with the day or "Needs Review", on the entry's page, the lists' details and Quick Look; nobody sees who reviewed it (that is v2, DESIGN.md §13). The switch stands in the foot of the details on the admin list, and the list's Reviewed filter (`?reviewed=1` or `?reviewed=0`) finds the entries still to check. Clearing the mark lets the next marked file update the entry again. Correcting a file to match is still done, so a fresh local database agrees with production.

### The library

The owner keeps copies of the in-copyright reference books in **`/app/.library/`**. The folder is in `.gitignore` and never committed: the repo is public, and a book committed once is published for good. `tests/guards/no-tracked-books.test.ts` fails if any `.pdf` or `.epub` is tracked anywhere in the repo, or if the folder stops being ignored. A lane in a worktree reads the library by that absolute path, since a worktree holds no copy of an ignored folder.

**Turning the books into text.** The devcontainer has no PDF tools, so `npm run library:text` (`scripts/library-text.ts`) does it with `pdfjs-dist`, Mozilla's PDF reader:

- each PDF becomes one text file per page, `/app/.library/text/<slug of the file name>/<page>.txt`, the page number zero-padded to four digits (`0036.txt`);
- each EPUB is unpacked with `unzip` into `/app/.library/text/<slug of the file name>/`, which gives its HTML chapters as they are.

Run it again after a book is added. On 2026-10-11 every PDF yielded text and none was an image-only scan, though a few pages of each (covers, plates) are blank.

**What each file is**, read from its own title and copyright pages on 2026-10-11, not from its file name:

| File in `/app/.library/`                                                  | What it is                                                                                                                                                                                                                                                                                                                                                                                                 | Use it?                                                     |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `dokumen.pub_cunninghams-encyclopedia-of-magical-herbs-…epub`             | Scott Cunningham, _Cunningham's Encyclopedia of Magical Herbs_, Llewellyn, Woodbury, Minnesota. Copyright page: © 1985 by Scott Cunningham and 2000 by the Scott Cunningham estate; first e-book edition © 2012; e-book ISBN 9780738717135. The package's metadata adds "Second Edition, Twentieth Printing, 2012" and the print ISBN 978-0-87542-122-3. 428 entry headings.                               | Yes                                                         |
| `Encyclopedia of Crystal Gem And Metal Magic - READ - fb - READ.pdf`      | Scott Cunningham, _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_, Llewellyn's Sourcebook Series, Llewellyn, St. Paul, Minnesota. Copyright © 1988; "First Edition, Sixteenth Printing, 1996"; ISBN 0-87542-126-1. A scan with a text layer read by OCR (optical character recognition), so expect misread letters ("willleam" for "will learn").                                                | Yes; check a spelling against the page before relying on it |
| `dokumen.pub_the-witches-encyclopedia-of-magical-plants-…epub`            | Sandra Kynes, _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_, Llewellyn, Woodbury, Minnesota. Copyright © 2024; first e-book edition © 2024; e-book ISBN 9780738775647; the print ISBN on the same page is 978-0-7387-7548-7. 352 plant-name headings.                                                                                                      | Yes                                                         |
| `dokumen.pub_the-crystal-bible-volume-1-…epub`                            | Judy Hall, _The Crystal Bible_, Godsfield Press (Octopus Publishing Group), London. "First published in Great Britain in 2003"; copyright © 2003, 2009; "Published as an eBook 2012"; ISBN 9781841814131. The title page says _The Crystal Bible_; "Volume 1" and the subtitle in the file name come from the package's metadata, not the book.                                                            | Yes                                                         |
| `American Herbal Products Associations Botanical Safety Handbook (…).pdf` | Zoë Gardner and Michael McGuffin, eds., _American Herbal Products Association's Botanical Safety Handbook_, 2nd ed., CRC Press (Taylor & Francis), Boca Raton. © 2013; ISBN 978-1-4665-1695-3 (eBook, PDF). 1,061 PDF pages.                                                                                                                                                                               | Yes, for safety notes                                       |
| `dokumen.pub_herbal-remedies-for-beginners-…epub`                         | Sandra Kynes, _Herbal Remedies for Beginners: Natural Ways to Treat Ailments_, Llewellyn, Woodbury, Minnesota. Copyright © 2020; first e-book edition © 2020; e-book ISBN 9780738761961.                                                                                                                                                                                                                   | Yes, for uses and cautions                                  |
| `the_book_of_herbs_1903.pdf`                                              | Lady Rosalind Northcote, _The Book of Herbs_, number XII of the series Handbooks of Practical Gardening (series editor Harry Roberts), John Lane, The Bodley Head, London and New York, 1903. A scan of Cornell University Library's copy, from archive.org (`cu31924073899373`), whose own notice says "There are no known copyright restrictions in the United States on the use of the text". OCR text. | Yes, for lore                                               |

Paul Beyerl's _A Compendium of Herbal Magick_ and Melody's _Love Is in the Earth_ are not in the library. The lanes work without them.

**Added on 2026-10-29 by M14.31**, three public-domain scans from the Internet Archive, each kept as its PDF beside the Archive's own OCR text (`_djvu.txt`) under `/app/.library/text/<slug>/`, one text file per volume rather than per page. They were chosen because the ethnobotanical papers and the Victorian lore books cover few of the uncategorised entries' regions. Read from their title pages and the Archive's item metadata on 2026-10-29:

| File in `/app/.library/`                                                    | What it is                                                                                                                                                                                                                                                                                                           | Use it?                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `watt-breyer-brandwijk-1932-medicinal-poisonous-plants-southern-africa.pdf` | J. M. Watt and M. G. Breyer-Brandwijk, _The Medicinal and Poisonous Plants of Southern Africa_, Edinburgh: E. & S. Livingstone, 1932. A Digital Library of India scan on the Internet Archive (`in.ernet.dli.2015.218558`) with no licence statement; the owner accepted it on 2026-10-29. OCR text; 1932 binomials. | Yes, for southern African charm uses; check a name against Wikipedia's synonym list |
| `bretschneider-botanicon-sinicum-v1.pdf`, `-v2.pdf`, `-v3.pdf`              | Emil Bretschneider, _Botanicon Sinicum: Notes on Chinese Botany from Native and Western Sources_, 3 parts, Shanghai: Kelly & Walsh, 1882–1895; Missouri Botanical Garden scans (`mobot31753000532124`, `…132`, `…140`). Public domain. OCR text; Chinese names beside the binomials of its day.                      | Yes, for Chinese plant lore                                                         |
| `de-groot-religious-system-of-china-v1.pdf` … `-v6.pdf`                     | J. J. M. de Groot, _The Religious System of China_, 6 vols., Leiden: E. J. Brill, 1892–1910; Princeton scans (`religioussystemo01groo` … `06groo`), volume 4 from `in.gov.ignca.14666`. Public domain. OCR text; the running page header is the page number.                                                         | Yes, for Chinese demonology and plant charms                                        |

The Project Gutenberg books M14.31 reads (Folkard 1884, #44638; Thiselton-Dyer 1889, #10118; Fernie 1897, #19352; Skeat 1900, #47873; Thurston 1912, #35690; Smith 1932, #49527) are read online like Culpeper and are not library files; each is cited by its Gutenberg ebook number in its source file.

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

Grieve's _A Modern Herbal_ is cited page by page, as MB.247 first did: each heading read on botanical.com is a per-entry source, `compendium/sources/grieve-<slug of the heading>.yaml`, `kind: 'web_page'`, `authors: 'Grieve, M.'`, the heading as `title`, `container: 'A Modern Herbal'`, the page's address and the day it was read. Every lane uses that shape, so two entries citing one page write one `references` row. botanical.com refuses a request without a browser's `User-Agent` and `Accept` headers (HTTP 406 from its firewall); with them it answers.

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

[`candidates.md`](candidates.md) lists the 1,111 entries to research (rows 1 to 614 the roster, 615 to 1,111 the addendum). Its rules:

- one row per entry: the label, the formal name, the naming system, and the shard it belongs to;
- **no two rows share an identity** (the formal name lower-cased, or the label where the naming system is `none`);
- every formal name and naming system satisfies the rules under "Formal names" above, `none` with no formal name;
- the list is drawn from several works, each named in its own sources section in Chicago form, so the selection is no one book's.

The roster's 614 rows hold 451 `botanical` rows, 6 `fungal`, 7 `zoological`, 118 `mineral`, 14 `chemical`, 7 `unknown` and 11 `none`. 149 rows rest on a single source and are marked `(single source)`. The rows were checked against the rules above when MB.240 committed them: 614 rows, no shared identity, every shard one of the six and every naming system paired correctly with its formal name. The addendum's 497 rows (M14.14) hold 425 `botanical`, 10 `fungal`, 9 `zoological`, 10 `mineral`, 2 `chemical` and 41 `unknown`, and are described in `candidates.md`, "The addendum"; together they are 1,111 rows.

A content task researches its shard's rows. Its entry files plus the "What is left out" rows in its pull request body equal its rows in the list; a lane that would leave out more than a tenth of its rows stops and raises it with the owner first.

### Open questions

Carried from the candidate list for the owner, the pilot and the lanes. None is resolved here.

- **Group-for-species mineral names.** `Feldspar var. moonstone` and `Feldspar var. sunstone` put a group where a species belongs, and `Quartz var. dendritic agate` and `Quartz var. milky quartz` rest on a Wikipedia redirect alone. Each needs a Mindat check.
- **Seven `unknown` rows** (Devil's Shoestring, Tourmalinated Quartz, Petrified Wood, Lava Stone, Meteorite, Electrum and Mother-of-Pearl): **decided by the owner on 2026-10-11, they are seeded** as `unknown` with no formal name, under the rule in "Formal names".
- **Brass and steel are `none`**: no naming system for alloys was found.
- **Wikipedia's current names over older usage**: the list follows Wikipedia, so _Betonica officinalis_ (often _Stachys officinalis_), _Senega officinalis_ (often _Polygala senega_) and _Atropa bella-donna_, among others the list names. POWO decides each when the lane checks it.
- **Kynes's _Complete Book of Correspondences_** is an excerpt in the library (above); the full book would be a second source for the minerals, animals and waters.
- **The variant description ceiling** of 120 words, and whether MB.249 folds into MB.248, are the plan's open items for the owner.

## Seed behaviour the source cites

### Reconciling an entry that is already present

`src/db/seed/compendium/update.ts` is the seed's update path. The decision is the
state table in "Write-once, and how a correction lands"; the file reads what the
decision needs in bulk (`readStates`), decides one entry (`decide`) and applies an
update (`applyUpdate`). The rows it writes are `rows.ts`'s, the same the insert
writes, so the two cannot disagree on what a column holds.

Children are reconciled by key, never dropped and re-created. A stock row and a
spell layer hold a variant id, so a form is matched to its live row (by curated
form, then by folded name) and updated in place, as `writeChildren` keeps a
variant's id across an edit.

- A removed form is soft-deleted only when nothing holds it; otherwise the entry
  is refused whole.
- Folk names, deities, substitutes and reference links are soft-deleted.
- Category links are hard-deleted, as the table is.

### The form vocabulary seed's groups

`src/db/seed/forms.ts` seeds DESIGN.md §5's form vocabulary: six groups and every
form, a starting set an admin may edit. It is reference data, not a scenario.
`migrate.yml` seeds it alone, so it inserts the bootstrap user itself.

- The groups answer "what are you holding", not "how was it made": three by
  source (Botanical, Animal, Mineral), three by state (Fluid, Curio, Substance).
  There is no `Other`; an unfitting value stays free text and surfaces for
  curation.
- No slug is written down. A group's is `slugify(name)`, and a form's is
  `formSlug` of its name and its group's, since two live forms may share a name
  under two groups. A form's seed key stays `slugify(name)`, as every database
  seeded before holds it.
- Where a value fits two groups the seed takes one sense and leaves the other row
  for an admin (claude-docs/db/form-vocabulary-seed.md, "The form vocabulary
  seed").

### Matching a mineral or chemical page

`pageNamesEntry` in `src/db/seed/compendium/audit.ts` decides whether a Wikipedia
page is the article on exactly the formal name given, for a mineral or a chemical,
which have no taxobox to say so.

- A plain name ("Iron", "Beryl") needs the page title, or its infobox's name, to
  equal it, and the page to be a mineral, a chemical element or a chembox
  compound. A rock ("Marble"), a group ("Garnet", "Tourmaline") and a page with no
  infobox to say what it is do not count.
- A variety ("Quartz var. amethyst") needs the page to be the variety's own
  article, and its infobox, or failing that its first sentence, to say it is a
  variety of the named mineral.
- Anything less stays a doubt for a person to settle.

### Re-slugging a two-tier vocabulary

`reslugItems` in `src/db/seed/two-tier-vocabulary.ts` is the backfill a slug that
carries its group needs. `seedTwoTierVocabulary` runs it on every seed of a
vocabulary whose slug does (the forms and the deities, each given a `slugOf`). Each
live item's slug is re-derived by `slugOf` from its name and its group's name, and
written where it differs, so a reseed with nothing to change writes nothing.

A database seeded before holds `slugify(name)`. A rewrite in SQL would be a second
slug rule, so the seed is the backfill, as it was for ingredient slugs
(claude-docs/db/ingredient-slugs.md). A soft-deleted item keeps its slug, as the
index reserves none.
