## The pilot shard (MB.242)

Fourteen entries from the [candidate list](candidates.md), one or two of each kind, researched to the full rule of the [README](README.md) before the six content lanes (MB.243 to MB.248) start, so that the literal's shape, the guard and the CI path are proven on real data. The literal is `src/db/seed/compendium/pilot.ts`; it is the source of truth, and this doc records where each entry's values come from and what was left out. The fourteen count toward the 614, and the shards they belong to research them no further.

| Entry              | Formal name          | Kind       | Shard on the list        | Forms                   | Also in `standard` |
| ------------------ | -------------------- | ---------- | ------------------------ | ----------------------- | ------------------ |
| Mugwort            | Artemisia vulgaris   | botanical  | `plants-l-q`             | Herb, Oil               | yes                |
| Yarrow             | Achillea millefolium | botanical  | `plants-r-z`             | Herb, Oil               |                    |
| Cinnamon           | Cinnamomum verum     | botanical  | `plants-a-cn`            | Bark, Oil               |                    |
| Bladderwrack       | Fucus vesiculosus    | botanical  | `plants-a-cn`            | Whole                   |                    |
| Beard Lichen       | Usnea                | fungal     | `plants-a-cn`            | Whole                   |                    |
| Frankincense       | Boswellia sacra      | botanical  | `resins-woods-and-other` | Resin, Oil              |                    |
| Sandalwood         | Santalum album       | botanical  | `resins-woods-and-other` | Wood, Powder, Oil, Bead |                    |
| Florida Water      | (none)               | none       | `resins-woods-and-other` | Perfume                 |                    |
| Honey              | Apis mellifera       | zoological | `resins-woods-and-other` | Honey, Wax              | yes (as Beeswax)   |
| Salt               | Sodium chloride      | chemical   | `resins-woods-and-other` | Salt                    | yes (as Sea Salt)  |
| Iron               | Iron                 | chemical   | `stones-and-metals`      | Metal, Nail             |                    |
| Amethyst           | Quartz var. amethyst | mineral    | `stones-and-metals`      | Crystal                 | yes                |
| Hematite           | Hematite             | mineral    | `stones-and-metals`      | Stone, Pigment          |                    |
| Devil's Shoestring | (none)               | unknown    | `plants-co-k`            | Root                    | yes                |

24 forms beneath the 14 entries. Five entries share an identity with the `standard` fixture, so a local database seeded with `standard` and then with the compendium exercises the skip by identity on real names: the seed leaves those five as the fixture wrote them and writes nothing beneath them.

### How the research was done

Four helper agents researched three or four entries each, in parallel, to the brief the README's rules give, and returned each entry as a literal with, for every citation, the file and line (or the Wikipedia revision and wikitext line) where each value it supports is stated. The lead then opened a sample of those locators in every lane (the book pages for Amethyst, Hematite, Salt, Iron, Honey's p. 30, Beard Lichen, Frankincense, Sandalwood, Mugwort, Cinnamon and Bladderwrack, both books' Devil's Shoestring entries, and four Wikipedia lines) and found each said what the evidence claimed, confirmed through the Wikipedia API that all 22 cited revisions exist under the titles cited, and ran the guard over the assembled shard. Every page and URL cited here was read during the task, on 2026-10-11.

**Plants of the World Online and Mindat were tried once each** on 2026-10-11 at 06:39 UTC (`powo.science.kew.org/results?q=Artemisia%20vulgaris`, `powo.science.kew.org/api/2/search`, `www.mindat.org/min-198.html`). All three requests returned HTTP 403 with a Cloudflare challenge page ("Just a moment..."), as they had for MB.240. So no formal name here was checked against either; each was checked against the Wikipedia revision cited for it (the taxobox for the plants, the lichen and the bee, the infobox for the minerals and chemicals) and, for the plants, against the binomial the _AHPA Botanical Safety Handbook_ heads its monograph with. **No formal name on the candidate list changed.** Two notes: the candidate list's `_Usnea_ spp.` is written `Usnea`, the README's rule for a genus row; and `Quartz var. amethyst` is the README's convention for a variety, which Wikipedia supports in substance ("variety of quartz") but does not print as a string.

### Time per entry

Measured with `date -u` at each entry's start and finish by the agent researching it; the lead's checking and assembly took about 5 minutes for all fourteen, from 06:49 to 06:54 UTC, under half a minute an entry, and is not in the column.

| Entry              | Started (UTC) | Finished (UTC) | Minutes |
| ------------------ | ------------- | -------------- | ------: |
| Mugwort            | 06:42:10      | 06:44:23       |     2.2 |
| Yarrow             | 06:44:39      | 06:46:08       |     1.5 |
| Cinnamon           | 06:46:33      | 06:47:56       |     1.4 |
| Bladderwrack       | 06:47:59      | 06:49:16       |     1.3 |
| Beard Lichen       | 06:42:12      | 06:43:31       |     1.3 |
| Frankincense       | 06:43:41      | 06:45:23       |     1.7 |
| Sandalwood         | 06:45:29      | 06:47:11       |     1.7 |
| Florida Water      | 06:47:16      | 06:48:22       |     1.1 |
| Honey              | 06:42:11      | 06:45:21       |     3.2 |
| Salt               | 06:45:26      | 06:47:17       |     1.9 |
| Iron               | 06:47:20      | 06:48:21       |     1.0 |
| Amethyst           | 06:42:09      | 06:43:49       |     1.7 |
| Hematite           | 06:43:54      | 06:44:47       |     0.9 |
| Devil's Shoestring | 06:44:52      | 06:46:25       |     1.6 |
| **All fourteen**   |               |                |    22.3 |

**What it calibrates.** 22.3 agent-minutes for 14 entries is 1.6 minutes an entry, with the four agents' clocks overlapping, so the whole research took 7 minutes of wall clock (06:42 to 06:49). The binding cost is not time but context: each helper used 122,000 to 161,000 tokens for three or four entries, about 40,000 an entry (the agents' own usage reports; an estimate per entry, since the reports are per agent). A 100-entry shard is then about 4 million tokens of research (estimate), which no single agent holds, so a content lane is a coordinator fanning its roster out to helpers of three or four entries each, and spending its own context on checking and assembling. Measured on this pilot, about 25 to 30 helpers per 100-entry shard (estimate).

### Bibliography

The shared works, as `src/db/seed/compendium/works.ts` declares them, the edition in the library:

- Cunningham, Scott. _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_. Llewellyn's Sourcebook Series. St. Paul, MN: Llewellyn Publications, 1988.
- Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. 2nd ed. Woodbury, MN: Llewellyn Publications, 2012. EPUB.
- Gardner, Zoë, and Michael McGuffin, eds. _American Herbal Products Association's Botanical Safety Handbook_. 2nd ed. Boca Raton, FL: CRC Press, 2013. PDF.
- Hall, Judy. _The Crystal Bible_. London: Godsfield Press, 2012. EPUB.
- Kynes, Sandra. _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_. Woodbury, MN: Llewellyn Publications, 2024. EPUB.
- Northcote, Lady Rosalind. _The Book of Herbs_. Handbooks of Practical Gardening 12. London: John Lane, The Bodley Head, 1903.

The shard's own sources, each a Wikipedia revision read on 11 October 2026 (`https://en.wikipedia.org/w/index.php?title=<title>&oldid=<revision>`):

- Wikipedia, under "Achillea millefolium" (revision 1377049458); "Amethyst" (1377864997); "Artemisia vulgaris" (1349822848); "Beeswax" (1361983052); "Boswellia sacra" (1362797773); "Cinnamomum verum" (1368745785); "Florida Water" (1349984253); "Frankincense" (1375501301); "Fucus vesiculosus" (1377158692); "Goofer dust" (1367193680); "Hematite" (1371461042); "Honey" (1378877316); "Hoodoo (spirituality)" (1378667712); "Iron" (1379385470); "Nolina lindheimeriana" (1368167260); "Salt" (1379334677); "Santalum album" (1365075216); "Sodium chloride" (1373528437); "Usnea" (1373923575); "Viburnum lantanoides" (1363375344); "Western honey bee" (1378342627); "Witch bottle" (1368142800).

### Sources, entry by entry

Which source supports which fields. A book is cited by the printed page of a PDF or the entry heading of an EPUB; Cunningham's _Magical Herbs_ also by p. 266, its key to the health codes printed beside each heading.

- **Mugwort.** Cunningham, _Magical Herbs_ under Mugwort and p. 266: formal name, element, celestial body, deities, powers, folk names, the pregnancy code, dream and scrying uses, the toxic flag. Kynes under Mugwort: elements, celestial bodies, signs, deities, powers, folk names, the oil and the dried herb, European protective lore, the toxic flag. AHPA pp. 97–98, xxii, 967: part used (herb), safety class 2b, pregnancy, nursing, contact dermatitis and cross-allergies, thujone in the oil, the toxic flag. Northcote pp. 138–139: Artemis and Diana, the traveller's lore. Wikipedia "Artemisia vulgaris": formal name, the plant, its range, its use in beer.
- **Yarrow.** Cunningham under Yarrow and p. 266: formal name, element, celestial body, powers, folk names, the pregnancy and skin codes, protection, courage, marriage-bed and psychic-tea uses. Kynes under Yarrow: elements, celestial body, signs, deity, powers, folk names, the oil and the dried herb, British and Irish lore. AHPA pp. 2–3, xxii, 967: part used (herb), safety class 1, daisy-family allergy, pregnancy and nursing, thujone in the oil. Wikipedia "Achillea millefolium": formal name, the plant, its names, beer, the I Ching, love divination, toxicity to animals, the toxic flag, confusion with hemlock.
- **Cinnamon.** Cunningham under Cinnamon and p. 266: formal name, element, celestial body, deities, powers, folk name, incense and ritual uses, the oil's ritual history, the food-level, pregnancy and long-term codes. Kynes under Cinnamon: elements, celestial bodies, signs, deities, powers, folk name, the bark and the oil, its trade and lore, the oil's wedding and candle uses. AHPA pp. 215–217, xxii: part used (bark), safety class 2b and its cautions, the oil's own hazards. Wikipedia "Cinnamomum verum": formal name, the tree, its range, the inner bark.
- **Bladderwrack.** Cunningham under Bladderwrack and p. 266: formal name, element, celestial body, powers, folk names, sea, travel, business and psychic uses, the pregnancy, nursing and hyperthyroid codes. Kynes under Seaweed: elements, celestial bodies, signs, deities, powers, folk names, Irish and Scottish use, Shony. AHPA pp. 382–383, xxii: part used (thallus), safety class 2d and its cautions. Wikipedia "Fucus vesiculosus": formal name, common names, the seaweed, iodine, food, the platelet and iodine cautions.
- **Beard Lichen.** Wikipedia "Usnea": formal name (genus), that it is a lichen, the genus, colour, folk names. Kynes under Lichen: elements, celestial bodies, powers, colour, folk names, lore, the dried lichen. AHPA p. 900: part used (lichen), safety class 1, usnic acid and the liver.
- **Frankincense.** Cunningham under Frankincense: element, celestial body, folk names, deities, powers, the substitute (rosemary), ritual history. Kynes under Frankincense: formal name, elements, celestial bodies, signs, deities, powers, folk names, lore, the resin and the oil. Wikipedia "Boswellia sacra": formal name, the tree, the harvest. Wikipedia "Frankincense": the resin's names and trade, the essential oil. AHPA pp. 143–144: formal name, folk names, part used (gum resin), safety class 2b and the resin's cautions.
- **Sandalwood.** Cunningham under Sandalwood, White: formal name, element, celestial body, folk names, powers, the uses of the wood, the powder and beads. Kynes under Sandalwood: elements, celestial bodies, signs, deities, powers, folk names, lore, the oil's uses. Wikipedia "Santalum album": formal name, the tree, its range and decline, the heartwood and the oil. AHPA pp. 783–784: part used (wood), safety class 1, the oil in breast milk.
- **Florida Water.** Wikipedia "Florida Water": that it is a cologne, its history, its spiritual uses, its Spanish name, the perfume form. AHPA pp. 234, 236, 979: the case report of berloque dermatitis from Florida water it cites, and what a phototoxic reaction is.
- **Honey.** Wikipedia "Western honey bee": formal name, the bee, its range, how honey and wax are made. Wikipedia "Honey": its history and religious use, Zeus, the honey's own description, safety and healing. Wikipedia "Hoodoo (spirituality)": the honey jar. Cunningham, _Crystal, Gem & Metal Magic_ p. 30: honey as an offering buried before gathering stones. Wikipedia "Beeswax": the wax's description, colours and safety.
- **Salt.** Cunningham, _Crystal, Gem & Metal Magic_ pp. 129–131: element, deity, powers, magical uses. Wikipedia "Sodium chloride": formal name, colour, other names, where it occurs. Wikipedia "Salt": history, religious use, colour, warding and purification, the dietary caution. Wikipedia "Hoodoo (spirituality)", "Goofer dust", "Witch bottle": its uses in each.
- **Iron.** Cunningham, _Crystal, Gem & Metal Magic_ pp. 158–160: celestial body, element, deity, powers, lore and the uses of iron nails. Wikipedia "Iron": formal name, colour, history. Wikipedia "Hoodoo (spirituality)": Ogun, warding, nails in bundles. Wikipedia "Witch bottle": nails in witch bottles.
- **Amethyst.** Cunningham, _Crystal, Gem & Metal Magic_ pp. 71–73: element, celestial bodies, deities, powers, magical uses. Hall under Amethyst: colour, attributes, the caution, the crystal's forms. Wikipedia "Amethyst": that it is a variety of quartz, colour, history.
- **Hematite.** Cunningham, _Crystal, Gem & Metal Magic_ pp. 100–101: folk name, element, celestial body, colour, powers, uses. Hall under Hematite: colour, attributes, the caution. Wikipedia "Hematite": the mineral, its other spelling, colours, the pigment.
- **Devil's Shoestring.** Cunningham, _Magical Herbs_ under Devil's Shoestring: the plant it names, powers, uses of the root. Kynes under Devil's Shoestring and under Yucca: the plants it names, element, celestial body, powers, the root. Wikipedia "Nolina lindheimeriana": the third plant carrying the name. Wikipedia "Viburnum lantanoides": that _V. alnifolium_ is its synonym.

### Decisions the lanes inherit

- **A work is cited once per row.** `reference_links` holds one live link per work per entry or form, so two passages of one book on one entry are one citation whose locator names both (`under "Mugwort"; p. 266`). The guard refuses a work cited twice on a row.
- **A category is the source's own word.** A power is filed under a category only where the source prints the category's word or a direct form of it: "psychic powers" and "psychic abilities" are Psychic Work, "banish" is Banishing, "divinatory" is Divination, "loyalty/fidelity" is Fidelity. A different word is never mapped, however close: "money" is not Prosperity, "exorcism" is not Banishing, "prophetic dreams" is neither Prophecy nor Dream Work. Every power left unmapped is recorded below.
- **A deity is the curated row the source names.** A spelling the curated slug folds to the same row is that row (Kynes's "Manannán Mac Lir" is the curated Manannan mac Lir); a different name is not (Kynes's "Bast" is not the curated Bastet, "Woden" is not Odin).
- **Colours.** A colour is one a source gives the ingredient, a correspondence or, for a stone, the colour its entry lists; only `src/db/seed/compendium/colours.ts`'s seventeen are written.
- **Where Cunningham and Kynes disagree** on elements or celestial bodies (Mugwort, Yarrow), the entry holds both books' values, each cited.
- **A book entry covering several species** (Kynes's Lichen, Sandalwood, Cinnamon and Seaweed; Cunningham's Bladderwrack, "and various other plants") is applied to the entry its heading names. The AHPA monograph on _Usnea barbata_ is applied to the genus.

### What is left out, and why

Values a source gives that the literal does not hold, each for the reason named.

- **Powers with no category of that word.** Mugwort: prophetic dreams, astral projection; Kynes's authority/leadership, awareness, consecrate/bless, defence, family and home, happiness, luck, negativity, spirit guides. Yarrow: exorcism, attracting friends, awareness, consecrate/bless, defence, hexes, negativity, relationships, seeing faeries, spirit guides. Cinnamon: spirituality, power, money, awareness, changes, consecrate/bless, luck, sex, wishes. Bladderwrack: sea spells, wind spells, money, awareness, balance, negativity, skills, spirit guides. Beard Lichen: luck, negativity, spirit guides. Frankincense: exorcism, spirituality, consecration, visions, luck, awareness, defence, focus, growth, happiness, past-life work. Sandalwood: wishes, exorcism, spirituality, awareness, consecrate/bless, hexes, past-life work, sex. Florida Water: appeasing the dead, health and good luck. Salt: money. Iron: defensive magic, return of stolen goods, luck. Amethyst: dreams, overcoming alcoholism, psychism, happiness, lawsuits, beauty, travellers' amulet; Hall's psychic gifts, scrying, grief, sobriety. Hematite: stabilising, focus, willpower, self-esteem, concentration. Devil's Shoestring: power, employment, defence, luck, negativity, fertility and love medicine.
- **Deities not on the curated list, or spelt otherwise.** Mugwort: Woden. Yarrow: Achilles (a hero). Frankincense: Bast. Bladderwrack: Aegir, Amphitrite, Lir/Llyr, Ran, Sedna, Shony, Varuna. Amethyst: the deities of Wikipedia's Rémy Belleau myth, which the article calls a sixteenth-century invention.
- **Colours not on the list, or not the ingredient's own.** Amethyst: lavender, dark purple. Beard Lichen: grey-green, reddish (only green is kept). Salt: the blue or purple tinge of impurities. Frankincense, Sandalwood: the flowers' colours. Honey (the honey itself): Wikipedia names grades, not colours.
- **Safety notes no safety source gives.** Iron: Wikipedia's cautions concern swallowing iron supplements, not the metal. Devil's Shoestring: with three candidate plants, a caution for one would not hold for the others. Hematite: Wikipedia's mining hazard concerns miners. Beard Lichen: Wikipedia's rodent feeding study (the brief keeps safety to the safety handbooks).
- **The toxic flag** (M14.1) is on where a source says in so many words that the plant, a part of it or a form is poisonous or toxic to people, pets or animals, as the literal's safety note records; its source line names the source with "the toxic flag". Cunningham's health code X (not for internal use), a safety class, a drug interaction or a pregnancy caution sets no flag.
- **Folk names that would fix an `unknown` identity.** Devil's Shoestring: Kynes's names for the hobblebush and the yucca, and Wikipedia's "beargrass".
- **Forms with no curated row or nothing of their own.** Amethyst: Hall's chevron and pineapple amethyst; Obsidian's Apache tear (not researched here). Cinnamon: leaf, powder, cassia buds. Frankincense: powdered resin. Sandalwood: incense, a paste. Yarrow: flower, seeds, flower essence. Bladderwrack: powder. Devil's Shoestring: the hobblebush's leaves and fruit.
- **Weak or unsourced lines.** Cinnamon: Wikipedia's processing section, tagged as needing citations. Mugwort: Northcote's Japanese cautery passage, whose OCR is unreadable; Wikipedia's lucid-dreaming use, cited there to a commercial site. Honey: Kynes's sesame cakes for Demeter and Persephone, which concern sesame.

**Left for the owner:** whether the Sandalwood Bead form and Hematite's Pigment form are in scope; whether the Florida Water safety note, which rests on a case report AHPA cites, is enough; whether Honey's deity Zeus, a mythological rather than magical association, stays.

### A correction to the README

The README gave Devil's Shoestring's reason for `unknown` as "Cunningham and Kynes name different plants". Read for this pilot, they do not: Cunningham heads the entry _Viburnum alnifolium_, and Kynes heads hers _Viburnum lantanoides_ with _V. alnifolium_ as its synonym, which Wikipedia's "Viburnum lantanoides" confirms. The name is unsettled for other reasons: Kynes's Yucca entry also gives "devil's shoestring" for _Yucca filamentosa_, and Wikipedia gives it to _Nolina lindheimeriana_. The README is corrected to say so; the entry stays `unknown`, as the owner decided for the seven rows.
