# Compendium seed: the candidate roster

This is the list of 614 ingredients the compendium seed will be written from: one row per ingredient, each with the common name it will be shown under, its formal name, the naming system that formal name belongs to, and the works that name it. It says which ingredients exist and where each one was found. It does not hold any entry's text, correspondences or safety notes; those are written later, shard by shard (a shard is one slice of the roster that one task works through).

Compiled on 11 October 2026 from the indexes, tables of contents and lists named in the [bibliography](#bibliography). Every row comes from at least one of them, and the sources column says which. No row was added from memory.

## How it was compiled

1. **Read the lists.** For each work, the entry headings, table of contents or index were read in full:
   - Cunningham's _Encyclopedia of Magical Herbs_: the 428 entry headings of the A–Z section, with the binomial (two-part Latin name) printed under each.
   - Kynes's _Witches' Encyclopedia of Magical Plants_: the 352 entry headings, with every species each one lists.
   - Grieve's _A Modern Herbal_: the 978-entry common-name index on botanical.com, and the "Botanical:" line of each entry page it links to.
   - Culpeper's _Complete Herbal_: the 326 entry headings of the herbal section.
   - Northcote's _The Book of Herbs_: the herbs named in the table of contents.
   - Hall's _Crystal Bible_: the 120 headings of the crystal directory.
   - Cunningham's _Encyclopedia of Crystal, Gem & Metal Magic_: the entry headings of the stones and metals sections, the planetary and elemental tables, and the index.
   - Wikipedia's "List of plants used in herbalism" (163 rows), and the ingredient lists in the articles "Incense", "Hoodoo (spirituality)", "Goofer dust", "Mojo (African-American culture)", "Witch bottle", "Florida Water" and "Adder stone".
2. **Find each formal name.** Each heading was matched to an English Wikipedia article through the binomial the source prints, because Wikipedia redirects an outdated binomial to the current article (a misspelt one was first corrected by Wikipedia's own search suggestion); where that failed, through the common name. The formal name was then read from that article: its taxobox (the classification panel) for plants, fungi and animals, and its infobox or opening sentence for minerals, rocks and chemicals. Nine rows took the name from the opening sentence because the article has no taxobox (Orange, Oak, Pine, Beard Lichen, Opoponax, Labdanum, Tolu Balsam, Tragacanth, Cowrie Shell). The sources column gives the article as name: WP “title”, followed by → and a second title where Wikipedia redirected the first to a differently named article.
3. **Group by formal name.** A work counts for a row when it names that ingredient, either by a binomial that leads to the same article or, where its binomial was misspelt or outdated, by the same common name (Cunningham's "Lavendula vera" is the roster's Lavender).
4. **One row per heading.** Where Kynes lists several species under one heading, the roster keeps the species another source also names, or else the first one listed; the others are under "Considered and left out". Where the works name different species for what practice treats as one ingredient, the row takes the genus, written `Genus spp.`.
5. **Cut to 614.** The lowest-priority single-source rows were cut until the roster held 614.

Plants of the World Online (POWO, at powo.science.kew.org) and Mindat (mindat.org) were the preferred authorities, but both answered every request from this session with a Cloudflare challenge page, so no name here was checked against them. Every formal name is Wikipedia's. Checking the names against POWO and Mindat belongs to the pilot or to each shard's task.

## The rules, in brief

- **One ingredient is one formal name.** Forms (herb, root, oil, tumbled stone, beeswax beside honey) are not rows of their own; each becomes a variant of its ingredient (`claude-docs/DESIGN.md` §5, "Ingredient identity — the formal name").
- **`nomenclature`** says which naming system the formal name belongs to: `botanical`, `fungal`, `zoological`, `mineral`, `chemical`, `unknown` or `none`. `none` means no system names the thing (graveyard dirt, Florida Water) and the row has no formal name. `unknown` means a formal name may exist and is unsettled; the row may leave it blank.
- **Plants and fungi** take the accepted binomial, or the genus written `Genus spp.` where practice does not split species. Lichens are `fungal`, because they are named under the rules for fungi; seaweeds are `botanical`.
- **Minerals** are written `<Species> var. <variety>` for a variety (`Quartz var. amethyst`), the species alone otherwise (`Malachite`), and a rock, mineraloid or natural glass by its own name (`Lapis lazuli`, `Obsidian`, `Moldavite`). Where Wikipedia describes a gem as a variety of a group rather than of one species (moonstone and sunstone, of the feldspar group), the group stands in the species' place; the pilot should check those against Mindat.
- **Metals and salts** are `chemical`, by their accepted chemical name (`Sodium chloride`, `Iron`, `Sulphur`). Brass and steel are alloys that no naming system names, so they are `none`.
- **Animal products** sit under the animal (`Apis mellifera` holds honey and beeswax).
- **No two rows share a formal name.** Sea salt and Himalayan salt are one row, `Sodium chloride`.
- **The 26 ingredients of the `standard` fixture** (`src/db/seed/standard.ts`, `COMPENDIUM_INGREDIENTS`) were included where a source read here names them, with the formal name spelt exactly as the fixture spells it: 18 are in, and the 8 left out are listed below with the reason.

## Counts

| Kind                         | Rows | The plan's estimate |
| ---------------------------- | ---: | ------------------: |
| plant or fungus              |  430 |                ~400 |
| mineral or metal             |  136 |                ~135 |
| resin, wood or incense       |   28 |                 ~50 |
| animal, salt, water or other |   20 |                 ~30 |
| **Total**                    |  614 |                 614 |

The resins and the animal, salt and water rows came in under the estimate because few lists read here name them, and no row was added without a source. The plant rows took up the difference.

| Shard                    | Rows | Holds                                                    |
| ------------------------ | ---: | -------------------------------------------------------- |
| `plants-a-cn`            |  112 | plants and fungi, labels A to Cn                         |
| `plants-co-k`            |  116 | plants and fungi, labels Co to K                         |
| `plants-l-q`             |  104 | plants and fungi, labels L to Q                          |
| `plants-r-z`             |   98 | plants and fungi, labels R to Z                          |
| `stones-and-metals`      |  136 | minerals, rocks, metals and alloys                       |
| `resins-woods-and-other` |   48 | resins, woods and incense; animal, salt, water and other |

**The plant split points moved.** The plan's `plants-a-c`, `plants-d-k`, `plants-l-r` and `plants-s-z` would hold 130, 98, 115 and 87 rows. Splitting at Co, L and R instead gives 112, 116, 104 and 98, so the shards are renamed to match.

| Nomenclature | Rows |
| ------------ | ---: |
| botanical    |  451 |
| fungal       |    6 |
| zoological   |    7 |
| mineral      |  118 |
| chemical     |   14 |
| unknown      |    7 |
| none         |   11 |

**149 rows are single-source** (48 plant or fungus, 75 mineral or metal, 12 resin, wood or incense, 14 other), and are marked `(single source)` in the sources column. Most single-source minerals are Hall's alone: her directory reaches well past Cunningham's.

## Source keys

| Key    | Work                                                                                               | Rows naming it |
| ------ | -------------------------------------------------------------------------------------------------- | -------------: |
| `CunH` | Cunningham, _Cunningham's Encyclopedia of Magical Herbs_ — entry headings                          |            381 |
| `Kyn`  | Kynes, _The Witches' Encyclopedia of Magical Plants_ — entry headings                              |            366 |
| `Grv`  | Grieve, _A Modern Herbal_ — common-name index                                                      |            262 |
| `Cul`  | Culpeper, _The Complete Herbal_ — entry headings                                                   |            150 |
| `Nor`  | Northcote, _The Book of Herbs_ — table of contents                                                 |             41 |
| `WPh`  | Wikipedia, "List of plants used in herbalism"                                                      |             96 |
| `WPi`  | Wikipedia, "Incense" — its composition section and picture captions                                |             18 |
| `Hall` | Hall, _The Crystal Bible_ — crystal directory headings                                             |            109 |
| `CunC` | Cunningham, _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_ — headings, tables and index |             90 |
| `WPho` | Wikipedia, "Hoodoo (spirituality)"                                                                 |             12 |
| `WPgd` | Wikipedia, "Goofer dust"                                                                           |              5 |
| `WPmo` | Wikipedia, "Mojo (African-American culture)"                                                       |              2 |
| `WPwb` | Wikipedia, "Witch bottle"                                                                          |              6 |
| `WPfw` | Wikipedia, "Florida Water"                                                                         |              1 |
| `WPas` | Wikipedia, "Adder stone"                                                                           |              1 |

Grieve's count may understate her coverage: an entry of hers was counted only when its "Botanical:" line led to the row's article, and her 978 common names were not matched by hand.

## The roster

Sorted by shard, then by label.

| #   | Label                   | Formal name                          | Nomenclature | Kind                         | Shard                  | Sources                                                                          |
| --- | ----------------------- | ------------------------------------ | ------------ | ---------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| 1   | Adam and Eve Root       | _Aplectrum hyemale_                  | botanical    | plant or fungus              | plants-a-cn            | Kyn (single source); name: WP “Aplectrum hyemale” (→ “Aplectrum”)                |
| 2   | Adder's Tongue          | _Erythronium americanum_             | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Erythronium americanum”                                |
| 3   | African Violet          | _Streptocarpus ionanthus_            | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Streptocarpus ionanthus”                                    |
| 4   | Agrimony                | _Agrimonia eupatoria_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Agrimonia eupatoria”                              |
| 5   | Ague Root               | _Aletris farinosa_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Aletris farinosa”                                      |
| 6   | Alder                   | _Alnus glutinosa_                    | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, Cul; name: WP “Alnus glutinosa”                                        |
| 7   | Alfalfa                 | _Medicago sativa_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv, WPh; name: WP “Medicago sativa” (→ “Alfalfa”)                         |
| 8   | Alkanet                 | _Alkanna tinctoria_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Alkanna tinctoria”                                     |
| 9   | Allspice                | _Pimenta dioica_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Allspice”                                                   |
| 10  | Almond                  | _Prunus amygdalus_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Almond”                                                |
| 11  | Aloe                    | _Aloe vera_                          | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, WPh; name: WP “Aloe vera”                                             |
| 12  | Amaranth                | _Amaranthus hypochondriacus_         | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv; name: WP “Amaranthus hypochondriacus”                                 |
| 13  | American Bittersweet    | _Celastrus scandens_                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Celastrus scandens”                                         |
| 14  | American Ginseng        | _Panax quinquefolius_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Panax quinquefolius” (→ “American ginseng”)       |
| 15  | Angelica                | _Angelica archangelica_              | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Angelica archangelica”                            |
| 16  | Anise                   | _Pimpinella anisum_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Nor; name: WP “Pimpinella anisum” (→ “Anise”)                    |
| 17  | Apple                   | _Malus domestica_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Malus domestica” (→ “Apple”)                           |
| 18  | Apricot                 | _Prunus armeniaca_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Prunus armeniaca”                                      |
| 19  | Arnica                  | _Arnica montana_                     | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, WPh; name: WP “Arnica montana”                                         |
| 20  | Ash                     | _Fraxinus excelsior_                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Fraxinus excelsior”                               |
| 21  | Asian Ginseng           | _Panax ginseng_                      | botanical    | plant or fungus              | plants-a-cn            | Kyn (single source); name: WP “Panax ginseng”                                    |
| 22  | Aspen                   | _Populus tremuloides_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Populus tremuloides”                                   |
| 23  | Aster                   | _Callistephus chinensis_             | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Callistephus chinensis” (→ “Callistephus”)                  |
| 24  | Avens                   | _Geum urbanum_                       | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Geum urbanum”                                     |
| 25  | Avocado                 | _Persea americana_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Persea americana” (→ “Avocado”)                             |
| 26  | Bamboo                  | _Bambusa vulgaris_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Bambusa vulgaris”                                           |
| 27  | Banyan                  | _Ficus benghalensis_                 | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Ficus benghalensis”                              |
| 28  | Barberry                | _Berberis vulgaris_                  | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, Cul, WPh; name: WP “Berberis vulgaris”                                 |
| 29  | Barley                  | _Hordeum vulgare_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Hordeum vulgare” (→ “Barley”)                          |
| 30  | Basil                   | _Ocimum basilicum_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Nor; name: WP “Ocimum basilicum” (→ “Basil”)                          |
| 31  | Bay Laurel              | _Laurus nobilis_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Laurus nobilis”                         |
| 32  | Be-Still                | _Cascabela thevetia_                 | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Cascabela thevetia”                              |
| 33  | Bean                    | _Phaseolus vulgaris_                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Phaseolus vulgaris”                                    |
| 34  | Bearberry               | _Arctostaphylos uva-ursi_            | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Arctostaphylos uva-ursi”                                    |
| 35  | Beard Lichen            | _Usnea_ spp.                         | fungal       | plant or fungus              | plants-a-cn            | Kyn (single source); name: WP “Usnea”                                            |
| 36  | Bee Balm                | _Monarda didyma_                     | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Monarda didyma”                                              |
| 37  | Beech                   | _Fagus sylvatica_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Fagus sylvatica”                                  |
| 38  | Beet                    | _Beta vulgaris_                      | botanical    | plant or fungus              | plants-a-cn            | CunH, Cul; name: WP “Beta vulgaris”                                              |
| 39  | Belladonna              | _Atropa bella-donna_                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Atropa belladonna” (→ “Atropa bella-donna”)       |
| 40  | Bergamot Orange         | _Citrus bergamia_                    | botanical    | plant or fungus              | plants-a-cn            | Kyn (single source); name: WP “Bergamot orange”                                  |
| 41  | Bilberry                | _Vaccinium myrtillus_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Vaccinium myrtillus”                              |
| 42  | Bindweed                | _Convolvulus arvensis_               | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Convolvulus arvensis”                                        |
| 43  | Birch                   | _Betula pendula_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Betula pendula”                                             |
| 44  | Bistort                 | _Bistorta officinalis_               | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Bistorta officinalis”                                  |
| 45  | Bitter Orange           | _Citrus × aurantium_                 | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, WPh; name: WP “Bitter orange”                                          |
| 46  | Bittersweet Nightshade  | _Solanum dulcamara_                  | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, Cul; name: WP “Solanum dulcamara”                                      |
| 47  | Black Cohosh            | _Actaea racemosa_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Actaea racemosa”                                  |
| 48  | Black Hellebore         | _Helleborus niger_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Helleborus niger”                                 |
| 49  | Black Locust            | _Robinia pseudoacacia_               | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Robinia pseudoacacia”                                        |
| 50  | Black Mustard           | _Rhamphospermum nigrum_              | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Black mustard” (→ “Rhamphospermum nigrum”)             |
| 51  | Black Nightshade        | _Solanum nigrum_                     | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, Cul; name: WP “Solanum nigrum”                                         |
| 52  | Black Pepper            | _Piper nigrum_                       | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Piper nigrum” (→ “Black pepper”)                       |
| 53  | Black Snakeroot         | _Sanicula marilandica_               | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Sanicula marilandica”                            |
| 54  | Black Walnut            | _Juglans nigra_                      | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Juglans nigra”                                               |
| 55  | Blackberry              | _Rubus_ subg. _Rubus_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Blackberry”                                       |
| 56  | Blackthorn              | _Prunus spinosa_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Prunus spinosa”                                        |
| 57  | Bladderwrack            | _Fucus vesiculosus_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Fucus vesiculosus”                                     |
| 58  | Blessed Thistle         | _Centaurea benedicta_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul, WPh; name: WP “Centaurea benedicta”                              |
| 59  | Bloodroot               | _Sanguinaria canadensis_             | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Sanguinaria canadensis” (→ “Sanguinaria”)                   |
| 60  | Blue Flag               | _Iris versicolor_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Iris versicolor”                                       |
| 61  | Blueberry               | _Vaccinium_ sect. _Cyanococcus_      | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Blueberry”                                       |
| 62  | Bodhi Tree              | _Ficus religiosa_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Ficus religiosa”                                            |
| 63  | Bog Myrtle              | _Myrica gale_                        | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Myrica gale”                                                 |
| 64  | Boneset                 | _Eupatorium perfoliatum_             | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv; name: WP “Eupatorium perfoliatum”                                     |
| 65  | Borage                  | _Borago officinalis_                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Borago officinalis” (→ “Borage”)        |
| 66  | Box                     | _Buxus sempervirens_                 | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Buxus sempervirens”                                          |
| 67  | Bracken                 | _Pteridium aquilinum_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Pteridium aquilinum”                                        |
| 68  | Broom                   | _Cytisus scoparius_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Cytisus scoparius”                                |
| 69  | Bryony                  | _Bryonia_ spp.                       | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Bryonia”                                          |
| 70  | Buchu                   | _Agathosma betulina_                 | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Agathosma betulina”                              |
| 71  | Buckthorn               | _Rhamnus cathartica_                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Rhamnus cathartica”                                         |
| 72  | Buckwheat               | _Fagopyrum esculentum_               | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Buckwheat”                                       |
| 73  | Burdock                 | _Arctium lappa_                      | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Arctium lappa”                                    |
| 74  | Burnet Saxifrage        | _Pimpinella saxifraga_               | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv; name: WP “Pimpinella saxifraga”                                       |
| 75  | Buttercup               | _Ranunculus acris_                   | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv, Cul; name: WP “Ranunculus acris”                                       |
| 76  | Butterwort              | _Pinguicula vulgaris_                | botanical    | plant or fungus              | plants-a-cn            | Kyn (single source); name: WP “Pinguicula vulgaris”                              |
| 77  | Cabbage                 | _Brassica oleracea_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Brassica oleracea”                                     |
| 78  | Cactus                  | Cactaceae                            | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Cactus”                                                     |
| 79  | Calamus                 | _Acorus calamus_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Acorus calamus”                                        |
| 80  | Camellia                | _Camellia japonica_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Camellia japonica”                                          |
| 81  | Campion                 | _Silene_ spp.                        | botanical    | plant or fungus              | plants-a-cn            | Kyn, Cul; name: WP “Silene”                                                      |
| 82  | Caper                   | _Capparis spinosa_                   | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Capparis spinosa” (→ “Caper”)                    |
| 83  | Caraway                 | _Carum carvi_                        | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul, Nor; name: WP “Carum carvi” (→ “Caraway”)                   |
| 84  | Cardamom                | _Elettaria cardamomum_               | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Elettaria cardamomum”                                  |
| 85  | Carnation               | _Dianthus caryophyllus_              | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Cul; name: WP “Dianthus caryophyllus”                                 |
| 86  | Carob                   | _Ceratonia siliqua_                  | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Ceratonia siliqua” (→ “Carob”)                   |
| 87  | Carrot                  | _Daucus carota_                      | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Daucus carota”                                    |
| 88  | Cascara Sagrada         | _Frangula purshiana_                 | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Frangula purshiana”                              |
| 89  | Cashew                  | _Anacardium occidentale_             | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv; name: WP “Anacardium occidentale” (→ “Cashew”)                        |
| 90  | Cassia                  | _Cinnamomum cassia_                  | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Cinnamomum cassia”                                           |
| 91  | Castor                  | _Ricinus communis_                   | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Ricinus communis” (→ “Ricinus”)                  |
| 92  | Catnip                  | _Nepeta cataria_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Nepeta cataria” (→ “Catnip”)                      |
| 93  | Cattail                 | _Typha_ spp.                         | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Typha”                                                      |
| 94  | Celery                  | _Apium graveolens_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Nor, WPh; name: WP “Apium graveolens”                            |
| 95  | Centaury                | _Centaurium erythraea_               | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Centaurium erythraea”                             |
| 96  | Cherry                  | _Prunus avium_                       | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Prunus avium”                                     |
| 97  | Chervil                 | _Anthriscus cerefolium_              | botanical    | plant or fungus              | plants-a-cn            | Kyn, Cul, Nor; name: WP “Anthriscus cerefolium” (→ “Chervil”)                    |
| 98  | Chestnut                | _Castanea sativa_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Castanea sativa” (→ “Sweet chestnut”)             |
| 99  | Chickweed               | _Stellaria media_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul, WPh; name: WP “Stellaria media”                             |
| 100 | Chicory                 | _Cichorium intybus_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Cichorium intybus” (→ “Chicory”)                  |
| 101 | Chilli Pepper           | _Capsicum_ spp.                      | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, WPh; name: WP “Capsicum”                                              |
| 102 | Chinaberry              | _Melia azedarach_                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Melia azedarach”                                            |
| 103 | Chives                  | _Allium schoenoprasum_               | botanical    | plant or fungus              | plants-a-cn            | Kyn, Grv; name: WP “Allium schoenoprasum” (→ “Chives”)                           |
| 104 | Chrysanthemum           | _Chrysanthemum_ spp.                 | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn; name: WP “Chrysanthemum”                                              |
| 105 | Cinchona                | _Cinchona calisaya_                  | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv; name: WP “Cinchona calisaya”                                          |
| 106 | Cinnamon                | _Cinnamomum verum_                   | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Cinnamomum verum”                                      |
| 107 | Cinquefoil              | _Potentilla_ spp.                    | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, Cul; name: WP “Potentilla”                                       |
| 108 | Citron                  | _Citrus medica_                      | botanical    | plant or fungus              | plants-a-cn            | CunH (single source); name: WP “Citron”                                          |
| 109 | Cleavers                | _Galium aparine_                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Grv, Cul; name: WP “Galium aparine”                                        |
| 110 | Clove                   | _Syzygium aromaticum_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Syzygium aromaticum” (→ “Clove”)                  |
| 111 | Clover                  | _Trifolium_ spp.                     | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv, WPh; name: WP “Clover”                                           |
| 112 | Club Moss               | _Lycopodium clavatum_                | botanical    | plant or fungus              | plants-a-cn            | CunH, Kyn, Grv; name: WP “Lycopodium clavatum”                                   |
| 113 | Coconut                 | _Cocos nucifera_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Coconut”                                                    |
| 114 | Coltsfoot               | _Tussilago farfara_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Tussilago farfara” (→ “Tussilago”)                |
| 115 | Columbine               | _Aquilegia_ spp.                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Aquilegia”                                        |
| 116 | Comfrey                 | _Symphytum officinale_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Symphytum officinale”                        |
| 117 | Coriander               | _Coriandrum sativum_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Nor; name: WP “Coriandrum sativum” (→ “Coriander”)               |
| 118 | Corn Poppy              | _Papaver rhoeas_                     | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv; name: WP “Papaver rhoeas”                                              |
| 119 | Cornflower              | _Centaurea cyanus_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Centaurea cyanus”                            |
| 120 | Cotton                  | _Gossypium barbadense_               | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Gossypium barbadense”                            |
| 121 | Couch Grass             | _Elymus repens_                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Cul; name: WP “Elymus repens”                                         |
| 122 | Cowslip                 | _Primula veris_                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Primula veris”                                    |
| 123 | Crab Apple              | _Malus sylvestris_                   | botanical    | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Malus sylvestris”                                 |
| 124 | Crocus                  | _Crocus_ spp.                        | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Crocus”                                                     |
| 125 | Cubeb                   | _Piper cubeba_                       | botanical    | plant or fungus              | plants-co-k            | CunH, Grv; name: WP “Piper cubeba”                                               |
| 126 | Cucumber                | _Cucumis sativus_                    | botanical    | plant or fungus              | plants-co-k            | CunH, Cul; name: WP “Cucumis sativus” (→ “Cucumber”)                             |
| 127 | Cumin                   | _Cuminum cyminum_                    | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Nor; name: WP “Cuminum cyminum” (→ “Cumin”)                      |
| 128 | Curry Leaf              | _Bergera koenigii_                   | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Bergera koenigii” (→ “Curry tree”)               |
| 129 | Cyclamen                | _Cyclamen_ spp.                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv; name: WP “Cyclamen”                                              |
| 130 | Cypress                 | _Cupressus sempervirens_             | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Cupressus sempervirens”                                     |
| 131 | Daffodil                | _Narcissus_ spp.                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Narcissus (plant)”                                          |
| 132 | Daisy                   | _Bellis perennis_                    | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv, Cul, WPh; name: WP “Bellis perennis”                                   |
| 133 | Damiana                 | _Turnera diffusa_                    | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv; name: WP “Turnera diffusa”                                       |
| 134 | Dandelion               | _Taraxacum officinale_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Taraxacum officinale”                   |
| 135 | Date Palm               | _Phoenix dactylifera_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Phoenix dactylifera” (→ “Date palm”)                        |
| 136 | Deer's Tongue           | _Carphephorus odoratissimus_         | botanical    | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Carphephorus odoratissimus”                       |
| 137 | Devil's Shoestring      | —                                    | unknown      | plant or fungus              | plants-co-k            | CunH, Kyn                                                                        |
| 138 | Devil's-Bit Scabious    | _Succisa pratensis_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Succisa pratensis”                                |
| 139 | Dill                    | _Anethum graveolens_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, Nor; name: WP “Anethum graveolens” (→ “Dill”)               |
| 140 | Dittany of Crete        | _Origanum dictamnus_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Origanum dictamnus”                                         |
| 141 | Dock                    | _Rumex_ spp.                         | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Cul, WPh; name: WP “Rumex”                                            |
| 142 | Dodder                  | _Cuscuta europaea_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Cuscuta europaea”                                 |
| 143 | Dogbane                 | _Apocynum androsaemifolium_          | botanical    | plant or fungus              | plants-co-k            | CunH, Grv; name: WP “Apocynum androsaemifolium”                                  |
| 144 | Dogwood                 | _Cornus florida_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv; name: WP “Cornus florida”                                        |
| 145 | Dulse                   | _Palmaria palmata_                   | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Palmaria palmata”                                |
| 146 | Echinacea               | _Echinacea_ spp.                     | botanical    | plant or fungus              | plants-co-k            | CunH, WPh; name: WP “Echinacea”                                                  |
| 147 | Edelweiss               | _Leontopodium nivale_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Leontopodium nivale” (→ “Edelweiss”)                        |
| 148 | Elder                   | _Sambucus_ spp.                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Sambucus”                                    |
| 149 | Elecampane              | _Inula helenium_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Inula helenium” (→ “Elecampane”)        |
| 150 | Elm                     | _Ulmus glabra_                       | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Ulmus glabra”                                     |
| 151 | Endive                  | _Cichorium endivia_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Cul, Nor; name: WP “Cichorium endivia”                                     |
| 152 | Eucalyptus              | _Eucalyptus globulus_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Eucalyptus globulus”                              |
| 153 | Evening Primrose        | _Oenothera biennis_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, WPh; name: WP “Oenothera biennis”                                     |
| 154 | Eyebright               | _Euphrasia officinalis_              | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Euphrasia officinalis”                       |
| 155 | Fairy Ring Mushroom     | _Marasmius oreades_                  | fungal       | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Marasmius oreades”                                |
| 156 | Fairy Wand              | _Chamaelirium luteum_                | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv; name: WP “Chamaelirium luteum”                                         |
| 157 | Fennel                  | _Foeniculum vulgare_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, Nor; name: WP “Foeniculum vulgare” (→ “Fennel”)             |
| 158 | Fenugreek               | _Trigonella foenum-graecum_          | botanical    | plant or fungus              | plants-co-k            | CunH, Nor, WPh; name: WP “Trigonella foenum-graecum” (→ “Fenugreek”)             |
| 159 | Fern                    | Polypodiopsida                       | botanical    | plant or fungus              | plants-co-k            | CunH, Cul; name: WP “Fern”                                                       |
| 160 | Feverfew                | _Tanacetum parthenium_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Tanacetum parthenium”                        |
| 161 | Fig                     | _Ficus carica_                       | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Ficus carica” (→ “Fig”)                           |
| 162 | Figwort                 | _Scrophularia nodosa_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Scrophularia nodosa”                              |
| 163 | Fir                     | _Abies_ spp.                         | botanical    | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Fir”                                              |
| 164 | Flax                    | _Linum usitatissimum_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Linum usitatissimum” (→ “Flax”)                   |
| 165 | Fly Agaric              | _Amanita muscaria_                   | fungal       | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Amanita muscaria”                                           |
| 166 | Forget-Me-Not           | _Myosotis_ spp.                      | botanical    | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Myosotis”                                         |
| 167 | Foxglove                | _Digitalis purpurea_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Digitalis purpurea”                               |
| 168 | Frangipani              | _Plumeria rubra_                     | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Plumeria rubra”                                  |
| 169 | Fumitory                | _Fumaria officinalis_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Fumaria officinalis”                         |
| 170 | Galangal                | _Alpinia officinarum_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv; name: WP “Alpinia officinarum”                                   |
| 171 | Gardenia                | _Gardenia jasminoides_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Gardenia jasminoides”                                       |
| 172 | Garlic                  | _Allium sativum_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Allium sativum” (→ “Garlic”)                      |
| 173 | Gentian                 | _Gentiana lutea_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Grv, Cul; name: WP “Gentiana lutea”                                        |
| 174 | Geranium                | _Pelargonium_ spp.                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Pelargonium”                                                |
| 175 | German Chamomile        | _Matricaria chamomilla_              | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, WPh; name: WP “Matricaria chamomilla”                                 |
| 176 | Ginger                  | _Zingiber officinale_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Zingiber officinale” (→ “Ginger”)                 |
| 177 | Globeflower             | _Trollius europaeus_                 | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv; name: WP “Trollius europaeus”                                          |
| 178 | Goat's Rue              | _Galega officinalis_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Grv; name: WP “Galega officinalis”                                         |
| 179 | Goldenrod               | _Solidago_ spp.                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Solidago”                                         |
| 180 | Goldenseal              | _Hydrastis canadensis_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Hydrastis canadensis” (→ “Goldenseal”)            |
| 181 | Gooseberry              | _Ribes uva-crispa_                   | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv, Cul; name: WP “Ribes uva-crispa”                                       |
| 182 | Gorse                   | _Ulex europaeus_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Ulex europaeus”                                   |
| 183 | Gotu Kola               | _Centella asiatica_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Grv; name: WP “Centella asiatica”                                          |
| 184 | Grains of Paradise      | _Aframomum melegueta_                | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Aframomum melegueta” (→ “Grains of paradise”)    |
| 185 | Grape                   | _Vitis vinifera_                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Vitis vinifera”                              |
| 186 | Greater Celandine       | _Chelidonium majus_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Chelidonium majus”                                |
| 187 | Ground Ivy              | _Glechoma hederacea_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Grv, Cul, WPh; name: WP “Glechoma hederacea”                               |
| 188 | Groundsel               | _Senecio vulgaris_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Senecio vulgaris”                                 |
| 189 | Harebell                | _Campanula rotundifolia_             | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Campanula rotundifolia”                                     |
| 190 | Hawthorn                | _Crataegus_ spp.                     | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Cul, WPh; name: WP “Crataegus”                                        |
| 191 | Hazel                   | _Corylus_ spp.                       | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Cul; name: WP “Hazel”                                                 |
| 192 | Heather                 | _Calluna vulgaris_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Calluna vulgaris” (→ “Calluna”)                             |
| 193 | Heliotrope              | _Heliotropium europaeum_             | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Heliotropium europaeum”                                     |
| 194 | Hemlock                 | _Conium maculatum_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Conium maculatum”                                 |
| 195 | Hemp                    | _Cannabis sativa_                    | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, WPh; name: WP “Cannabis sativa”                             |
| 196 | Henbane                 | _Hyoscyamus niger_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Hyoscyamus niger”                                 |
| 197 | Henna                   | _Lawsonia inermis_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Lawsonia inermis”                                 |
| 198 | Hibiscus                | _Hibiscus_ spp.                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Hibiscus”                                                   |
| 199 | Hickory                 | _Carya_ spp.                         | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Hickory”                                                    |
| 200 | High John the Conqueror | _Ipomoea purga_                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, WPho; name: WP “Ipomoea purga”                                        |
| 201 | Holly                   | _Ilex aquifolium_                    | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Ilex aquifolium”                                  |
| 202 | Hollyhock               | _Alcea rosea_                        | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv, WPh; name: WP “Alcea rosea”                                            |
| 203 | Holy Basil              | _Ocimum tenuiflorum_                 | botanical    | plant or fungus              | plants-co-k            | Kyn, WPh; name: WP “Ocimum tenuiflorum”                                          |
| 204 | Honesty                 | _Lunaria annua_                      | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Lunaria annua”                                              |
| 205 | Honey Locust            | _Gleditsia triacanthos_              | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv; name: WP “Gleditsia triacanthos” (→ “Honey locust”)                    |
| 206 | Honeysuckle             | _Lonicera caprifolium_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv; name: WP “Lonicera caprifolium”                                  |
| 207 | Hops                    | _Humulus lupulus_                    | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Humulus lupulus”                                  |
| 208 | Horehound               | _Marrubium vulgare_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, Nor; name: WP “Marrubium vulgare”                           |
| 209 | Horse Chestnut          | _Aesculus hippocastanum_             | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, WPh; name: WP “Aesculus hippocastanum”                                |
| 210 | Horseradish             | _Armoracia rusticana_                | botanical    | plant or fungus              | plants-co-k            | CunH, Grv, Nor; name: WP “Armoracia rusticana” (→ “Horseradish”)                 |
| 211 | Horsetail               | _Equisetum arvense_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Grv, Cul, WPh; name: WP “Equisetum arvense”                                |
| 212 | Hound's Tongue          | _Cynoglossum officinale_             | botanical    | plant or fungus              | plants-co-k            | CunH, Grv, Cul; name: WP “Cynoglossum officinale”                                |
| 213 | Houseleek               | _Sempervivum tectorum_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Sempervivum tectorum”                             |
| 214 | Hyacinth                | _Hyacinthus orientalis_              | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn; name: WP “Hyacinthus orientalis”                                      |
| 215 | Hydrangea               | _Hydrangea arborescens_              | botanical    | plant or fungus              | plants-co-k            | CunH, Grv; name: WP “Hydrangea arborescens”                                      |
| 216 | Hyssop                  | _Hyssopus officinalis_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Hyssopus officinalis”                   |
| 217 | Immortelle              | _Helichrysum italicum_               | botanical    | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Helichrysum italicum”                             |
| 218 | Irish Moss              | _Chondrus crispus_                   | botanical    | plant or fungus              | plants-co-k            | CunH, Grv; name: WP “Chondrus crispus”                                           |
| 219 | Ivy                     | _Hedera helix_                       | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Hedera helix”                                     |
| 220 | Jasmine                 | _Jasminum officinale_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, WPh; name: WP “Jasminum officinale”                                   |
| 221 | Job's Tears             | _Coix lacryma-jobi_                  | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Coix lacryma-jobi” (→ “Job's tears”)             |
| 222 | Joe-Pye Weed            | _Eutrochium purpureum_               | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv; name: WP “Eutrochium purpureum”                                  |
| 223 | Jojoba                  | _Simmondsia chinensis_               | botanical    | plant or fungus              | plants-co-k            | Kyn (single source); name: WP “Simmondsia chinensis” (→ “Jojoba”)                |
| 224 | Juniper                 | _Juniperus communis_                 | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, Cul; name: WP “Juniperus communis”                               |
| 225 | Kava                    | _Piper methysticum_                  | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Grv, WPh; name: WP “Piper methysticum” (→ “Kava”)                     |
| 226 | Kelp                    | _Laminaria digitata_                 | botanical    | plant or fungus              | plants-co-k            | CunH (single source); name: WP “Laminaria digitata”                              |
| 227 | Knapweed                | _Centaurea nigra_                    | botanical    | plant or fungus              | plants-co-k            | Kyn, Grv, Cul; name: WP “Centaurea nigra”                                        |
| 228 | Knotgrass               | _Polygonum aviculare_                | botanical    | plant or fungus              | plants-co-k            | CunH, Kyn, Cul; name: WP “Polygonum aviculare”                                   |
| 229 | Lady's Bedstraw         | _Galium verum_                       | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Galium verum”                                     |
| 230 | Lady's Mantle           | _Alchemilla vulgaris_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Alchemilla vulgaris”                                   |
| 231 | Lady's Slipper          | _Cypripedium parviflorum_            | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, WPh; name: WP “Cypripedium parviflorum”                          |
| 232 | Lady's Smock            | _Cardamine pratensis_                | botanical    | plant or fungus              | plants-l-q             | Kyn, Cul, Nor; name: WP “Cardamine pratensis”                                    |
| 233 | Larch                   | _Larix_ spp.                         | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Larch”                                                 |
| 234 | Larkspur                | _Consolida regalis_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Consolida regalis”                                     |
| 235 | Lavender                | _Lavandula angustifolia_             | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul, WPh; name: WP “Lavandula angustifolia”                           |
| 236 | Leek                    | _Allium ampeloprasum_                | botanical    | plant or fungus              | plants-l-q             | CunH (single source); name: WP “Allium ampeloprasum”                             |
| 237 | Lemon                   | _Citrus × limon_                     | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, WPh; name: WP “Lemon”                                                 |
| 238 | Lemon Balm              | _Melissa officinalis_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Melissa officinalis” (→ “Lemon balm”)   |
| 239 | Lemon Verbena           | _Aloysia citrodora_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Grv; name: WP “Aloysia citrodora”                                          |
| 240 | Lemongrass              | _Cymbopogon citratus_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Cymbopogon citratus”                                        |
| 241 | Lesser Celandine        | _Ficaria verna_                      | botanical    | plant or fungus              | plants-l-q             | Kyn, Grv; name: WP “Ficaria verna”                                               |
| 242 | Lettuce                 | _Lactuca sativa_                     | botanical    | plant or fungus              | plants-l-q             | CunH, Cul; name: WP “Lactuca sativa” (→ “Lettuce”)                               |
| 243 | Life Everlasting        | _Pseudognaphalium obtusifolium_      | botanical    | plant or fungus              | plants-l-q             | Kyn (single source); name: WP “Pseudognaphalium obtusifolium”                    |
| 244 | Lilac                   | _Syringa vulgaris_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Syringa vulgaris”                                      |
| 245 | Lily                    | _Lilium_ spp.                        | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Lilium”                                           |
| 246 | Lily of the Valley      | _Convallaria majalis_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Convallaria majalis” (→ “Lily of the valley”)          |
| 247 | Lime                    | _Citrus × aurantiifolia_             | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Key lime”                                                   |
| 248 | Linden                  | _Tilia × europaea_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Tilia × europaea”                                           |
| 249 | Liquorice               | _Glycyrrhiza glabra_                 | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Glycyrrhiza glabra” (→ “Liquorice”)     |
| 250 | Liverwort               | _Anemone hepatica_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Grv, Cul, WPh; name: WP “Anemone hepatica”                                 |
| 251 | Lobelia                 | _Lobelia inflata_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Lobelia inflata”                                       |
| 252 | Lords and Ladies        | _Arum maculatum_                     | botanical    | plant or fungus              | plants-l-q             | Kyn, Grv, Cul; name: WP “Arum maculatum”                                         |
| 253 | Lotus                   | _Nelumbo nucifera_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, WPh; name: WP “Nelumbo nucifera”                                      |
| 254 | Lovage                  | _Levisticum officinale_              | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, Nor; name: WP “Levisticum officinale” (→ “Lovage”)          |
| 255 | Magnolia                | _Magnolia virginiana_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Magnolia virginiana”                                        |
| 256 | Maidenhair Fern         | _Adiantum_ spp.                      | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Adiantum”                                                   |
| 257 | Maize                   | _Zea mays_                           | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Maize”                                                 |
| 258 | Male Fern               | _Dryopteris filix-mas_               | botanical    | plant or fungus              | plants-l-q             | CunH (single source); name: WP “Dryopteris filix-mas”                            |
| 259 | Mallow                  | _Malva sylvestris_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul, WPh; name: WP “Malva sylvestris”                                 |
| 260 | Mandrake                | _Mandragora officinarum_             | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Mandragora officinarum”                                |
| 261 | Maple                   | _Acer_ spp.                          | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Maple”                                                 |
| 262 | Marigold                | _Calendula officinalis_              | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Calendula officinalis”                  |
| 263 | Marjoram                | _Origanum majorana_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul, Nor; name: WP “Origanum majorana” (→ “Marjoram”)                 |
| 264 | Marsh Marigold          | _Caltha palustris_                   | botanical    | plant or fungus              | plants-l-q             | Kyn, Grv; name: WP “Caltha palustris”                                            |
| 265 | Marshmallow             | _Althaea officinalis_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, WPh; name: WP “Althaea officinalis”                         |
| 266 | Masterwort              | _Peucedanum ostruthium_              | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Peucedanum ostruthium”                            |
| 267 | Mayapple                | _Podophyllum peltatum_               | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Podophyllum peltatum”                                  |
| 268 | Meadow Rue              | _Thalictrum_ spp.                    | botanical    | plant or fungus              | plants-l-q             | CunH, Cul; name: WP “Thalictrum”                                                 |
| 269 | Meadowsweet             | _Filipendula ulmaria_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Filipendula ulmaria”                                   |
| 270 | Mesquite                | _Neltuma juliflora_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Neltuma juliflora”                                          |
| 271 | Milk Thistle            | _Silybum marianum_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, WPh; name: WP “Silybum marianum”                                      |
| 272 | Mimosa                  | _Acacia dealbata_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Acacia dealbata”                                            |
| 273 | Mistletoe               | _Viscum album_                       | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, WPh; name: WP “Viscum album”                                |
| 274 | Monkshood               | _Aconitum napellus_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Aconitum napellus”                                     |
| 275 | Moonwort                | _Botrychium_ spp.                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Botrychium”                                            |
| 276 | Morning Glory           | _Ipomoea_ spp.                       | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Ipomoea”                                                    |
| 277 | Moss                    | Bryophyta                            | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Moss”                                                  |
| 278 | Motherwort              | _Leonurus cardiaca_                  | botanical    | plant or fungus              | plants-l-q             | Kyn, Grv, Cul; name: WP “Leonurus cardiaca”                                      |
| 279 | Mugwort                 | _Artemisia vulgaris_                 | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Artemisia vulgaris”                               |
| 280 | Mulberry                | _Morus nigra_                        | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Morus nigra”                                      |
| 281 | Mullein                 | _Verbascum thapsus_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, WPh; name: WP “Verbascum thapsus”                           |
| 282 | Myrtle                  | _Myrtus communis_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Myrtus communis”                                            |
| 283 | Nutmeg                  | _Myristica fragrans_                 | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Myristica fragrans”                                    |
| 284 | Oak                     | _Quercus_ spp.                       | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Oak”                                              |
| 285 | Oakmoss                 | _Evernia prunastri_                  | fungal       | plant or fungus              | plants-l-q             | Kyn (single source); name: WP “Evernia prunastri” (→ “Oakmoss”)                  |
| 286 | Oats                    | _Avena sativa_                       | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Avena sativa” (→ “Oat”)                                |
| 287 | Oleander                | _Nerium oleander_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Grv; name: WP “Nerium oleander” (→ “Nerium”)                               |
| 288 | Olive                   | _Olea europaea_                      | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Olea europaea”                                         |
| 289 | Onion                   | _Allium cepa_                        | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Allium cepa” (→ “Onion”)                          |
| 290 | Opium Poppy             | _Papaver somniferum_                 | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, WPh; name: WP “Papaver somniferum”                               |
| 291 | Orange                  | _Citrus × sinensis_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Orange (fruit)”                                             |
| 292 | Orchid                  | _Orchis_ spp.                        | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Orchis”                                                |
| 293 | Oregano                 | _Origanum vulgare_                   | botanical    | plant or fungus              | plants-l-q             | Kyn, Grv, WPh; name: WP “Origanum vulgare” (→ “Oregano”)                         |
| 294 | Oregon Grape            | _Berberis aquifolium_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Berberis aquifolium”                                   |
| 295 | Orpine                  | _Hylotelephium telephium_            | botanical    | plant or fungus              | plants-l-q             | Kyn, Cul, Nor; name: WP “Hylotelephium telephium”                                |
| 296 | Orris                   | _Iris × germanica_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Iris × germanica”                                           |
| 297 | Ox-Eye Daisy            | _Leucanthemum vulgare_               | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Leucanthemum vulgare”                                  |
| 298 | Pansy                   | _Viola tricolor_                     | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, WPh; name: WP “Viola tricolor”                              |
| 299 | Papaya                  | _Carica papaya_                      | botanical    | plant or fungus              | plants-l-q             | CunH, WPh; name: WP “Carica papaya” (→ “Papaya”)                                 |
| 300 | Papyrus                 | _Cyperus papyrus_                    | botanical    | plant or fungus              | plants-l-q             | CunH (single source); name: WP “Cyperus papyrus”                                 |
| 301 | Parsley                 | _Petroselinum crispum_               | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul, Nor; name: WP “Petroselinum crispum” (→ “Parsley”)               |
| 302 | Pasque Flower           | _Pulsatilla vulgaris_                | botanical    | plant or fungus              | plants-l-q             | CunH, Grv; name: WP “Pulsatilla vulgaris”                                        |
| 303 | Passionflower           | _Passiflora incarnata_               | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, WPh; name: WP “Passiflora incarnata”                             |
| 304 | Patchouli               | _Pogostemon cablin_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Pogostemon cablin” (→ “Patchouli”)                          |
| 305 | Pea                     | _Lathyrus oleraceus_                 | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Pea”                                                        |
| 306 | Peach                   | _Prunus persica_                     | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Prunus persica” (→ “Peach”)                       |
| 307 | Pear                    | _Pyrus communis_                     | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Pyrus communis”                                        |
| 308 | Pecan                   | _Carya illinoinensis_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Carya illinoinensis” (→ “Pecan”)                            |
| 309 | Pennyroyal              | _Mentha pulegium_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, Nor; name: WP “Mentha pulegium”                             |
| 310 | Peony                   | _Paeonia officinalis_                | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul; name: WP “Paeonia officinalis”                              |
| 311 | Pepper Tree             | _Schinus molle_                      | botanical    | plant or fungus              | plants-l-q             | CunH (single source); name: WP “Schinus molle”                                   |
| 312 | Peppermint              | _Mentha × piperita_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, WPh; name: WP “Mentha × piperita” (→ “Peppermint”)                    |
| 313 | Periwinkle              | _Vinca minor_                        | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Vinca minor”                                           |
| 314 | Persimmon               | _Diospyros virginiana_               | botanical    | plant or fungus              | plants-l-q             | CunH (single source); name: WP “Diospyros virginiana”                            |
| 315 | Pine                    | _Pinus_ spp.                         | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Pine”                                                  |
| 316 | Pipsissewa              | _Chimaphila umbellata_               | botanical    | plant or fungus              | plants-l-q             | CunH (single source); name: WP “Chimaphila umbellata”                            |
| 317 | Pistachio               | _Pistacia vera_                      | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Pistacia vera” (→ “Pistachio”)                              |
| 318 | Plantain                | _Plantago_ spp.                      | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Cul, WPh; name: WP “Plantago”                                    |
| 319 | Ploughman's Spikenard   | _Pentanema squarrosum_               | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Pentanema squarrosum”                                  |
| 320 | Plum                    | _Prunus domestica_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Grv, Cul; name: WP “Prunus domestica”                                      |
| 321 | Pokeweed                | _Phytolacca americana_               | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Phytolacca americana”                                  |
| 322 | Pomegranate             | _Punica granatum_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Punica granatum” (→ “Pomegranate”)                     |
| 323 | Poplar                  | _Populus nigra_                      | botanical    | plant or fungus              | plants-l-q             | Kyn (single source); name: WP “Populus nigra”                                    |
| 324 | Potato                  | _Solanum tuberosum_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Grv; name: WP “Potato”                                                     |
| 325 | Prickly Ash             | _Zanthoxylum americanum_             | botanical    | plant or fungus              | plants-l-q             | CunH, Grv; name: WP “Zanthoxylum americanum”                                     |
| 326 | Primrose                | _Primula vulgaris_                   | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv; name: WP “Primula vulgaris”                                      |
| 327 | Puffball                | _Lycoperdon perlatum_                | fungal       | plant or fungus              | plants-l-q             | Kyn (single source); name: WP “Lycoperdon perlatum”                              |
| 328 | Purple Loosestrife      | _Lythrum salicaria_                  | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Cul; name: WP “Lythrum salicaria”                                     |
| 329 | Purslane                | _Portulaca oleracea_                 | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, Grv, Nor; name: WP “Portulaca oleracea”                               |
| 330 | Quassia                 | _Quassia amara_                      | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn, WPh; name: WP “Quassia amara”                                         |
| 331 | Queen's Delight         | _Stillingia sylvatica_               | botanical    | plant or fungus              | plants-l-q             | CunH, Grv; name: WP “Stillingia sylvatica”                                       |
| 332 | Quince                  | _Cydonia oblonga_                    | botanical    | plant or fungus              | plants-l-q             | CunH, Kyn; name: WP “Cydonia oblonga” (→ “Quince”)                               |
| 333 | Radish                  | _Raphanus sativus_                   | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Raphanus sativus” (→ “Radish”)                              |
| 334 | Ragwort                 | _Jacobaea vulgaris_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Jacobaea vulgaris”                                     |
| 335 | Raspberry               | _Rubus idaeus_                       | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Rubus idaeus”                                          |
| 336 | Rhubarb                 | _Rheum palmatum_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Rheum palmatum”                                        |
| 337 | Rice                    | _Oryza sativa_                       | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Oryza sativa”                                          |
| 338 | Roman Chamomile         | _Chamaemelum nobile_                 | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul; name: WP “Chamaemelum nobile”                               |
| 339 | Rose                    | _Rosa_ spp.                          | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, WPh; name: WP “Rose”                                             |
| 340 | Rosemary                | _Salvia rosmarinus_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Rosemary”                               |
| 341 | Rowan                   | _Sorbus aucuparia_                   | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Sorbus aucuparia”                                      |
| 342 | Rue                     | _Ruta graveolens_                    | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor; name: WP “Ruta graveolens”                             |
| 343 | Rye                     | _Secale cereale_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Secale cereale” (→ “Rye”)                                   |
| 344 | Saffron                 | _Crocus sativus_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor; name: WP “Crocus sativus”                              |
| 345 | Sage                    | _Salvia officinalis_                 | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Salvia officinalis”                     |
| 346 | Sarsaparilla            | _Smilax aspera_                      | botanical    | plant or fungus              | plants-r-z             | CunH (single source); name: WP “Smilax aspera”                                   |
| 347 | Sassafras               | _Sassafras albidum_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Sassafras albidum”                                          |
| 348 | Scarlet Pimpernel       | _Lysimachia arvensis_                | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, Cul; name: WP “Lysimachia arvensis”                                    |
| 349 | Sea Holly               | _Eryngium_ spp.                      | botanical    | plant or fungus              | plants-r-z             | CunH, Cul; name: WP “Eryngium”                                                   |
| 350 | Self-Heal               | _Prunella vulgaris_                  | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, Cul; name: WP “Prunella vulgaris”                                      |
| 351 | Seneca Snakeroot        | _Senega officinalis_                 | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Polygala senega” (→ “Senega officinalis”)                   |
| 352 | Senna                   | _Senna_ spp.                         | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Senna (plant)”                                         |
| 353 | Sesame                  | _Sesamum indicum_                    | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Sesamum indicum” (→ “Sesame”)                          |
| 354 | Skullcap                | _Scutellaria_ spp.                   | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Scutellaria”                                           |
| 355 | Skunk Cabbage           | _Symplocarpus foetidus_              | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Symplocarpus foetidus”                                      |
| 356 | Slippery Elm            | _Ulmus rubra_                        | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Ulmus rubra”                                                |
| 357 | Snapdragon              | _Antirrhinum majus_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Antirrhinum majus”                                          |
| 358 | Snowdrop                | _Galanthus nivalis_                  | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, WPh; name: WP “Galanthus nivalis”                                      |
| 359 | Solomon's Seal          | _Polygonatum multiflorum_            | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Polygonatum multiflorum”                               |
| 360 | Southernwood            | _Artemisia abrotanum_                | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor; name: WP “Artemisia abrotanum”                         |
| 361 | Spanish Moss            | _Tillandsia usneoides_               | botanical    | plant or fungus              | plants-r-z             | CunH (single source); name: WP “Tillandsia usneoides” (→ “Spanish moss”)         |
| 362 | Spearmint               | _Mentha spicata_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Mentha spicata” (→ “Spearmint”)                        |
| 363 | Speedwell               | _Veronica officinalis_               | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, WPh; name: WP “Veronica officinalis”                                   |
| 364 | Spikenard               | _Nardostachys jatamansi_             | botanical    | plant or fungus              | plants-r-z             | Kyn (single source); name: WP “Nardostachys jatamansi” (→ “Nardostachys”)        |
| 365 | Spruce                  | _Picea_ spp.                         | botanical    | plant or fungus              | plants-r-z             | Kyn (single source); name: WP “Spruce”                                           |
| 366 | Spurge                  | _Euphorbia_ spp.                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Euphorbia”                                                  |
| 367 | Squill                  | _Drimia maritima_                    | botanical    | plant or fungus              | plants-r-z             | CunH (single source); name: WP “Drimia maritima”                                 |
| 368 | St John's Wort          | _Hypericum perforatum_               | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, WPh; name: WP “Hypericum perforatum”                        |
| 369 | Star Anise              | _Illicium verum_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, WPh; name: WP “Illicium verum”                                        |
| 370 | Stinging Nettle         | _Urtica dioica_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, WPh; name: WP “Urtica dioica”                               |
| 371 | Strawberry              | _Fragaria vesca_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Fragaria vesca”                                        |
| 372 | Strawberry Tree         | _Arbutus unedo_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Arbutus unedo”                                              |
| 373 | Sugar Cane              | _Saccharum officinarum_              | botanical    | plant or fungus              | plants-r-z             | CunH (single source); name: WP “Saccharum officinarum”                           |
| 374 | Sumbul                  | _Ferula moschata_                    | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Ferula moschata”                                            |
| 375 | Summer Savory           | _Satureja hortensis_                 | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Nor, WPh; name: WP “Satureja hortensis” (→ “Summer savory”)      |
| 376 | Sunflower               | _Helianthus annuus_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Helianthus annuus” (→ “Common sunflower”)              |
| 377 | Sweet Cicely            | _Myrrhis odorata_                    | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, Cul, Nor; name: WP “Myrrhis odorata” (→ “Cicely”)                      |
| 378 | Sweet Pea               | _Lathyrus odoratus_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Lathyrus odoratus” (→ “Sweet pea”)                          |
| 379 | Sweet Woodruff          | _Galium odoratum_                    | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Nor; name: WP “Galium odoratum”                                  |
| 380 | Tamarind                | _Tamarindus indica_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Tamarindus indica” (→ “Tamarind”)                           |
| 381 | Tamarisk                | _Tamarix_ spp.                       | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Tamarix”                                                    |
| 382 | Tansy                   | _Tanacetum vulgare_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor; name: WP “Tanacetum vulgare” (→ “Tansy”)               |
| 383 | Tarragon                | _Artemisia dracunculus_              | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Nor; name: WP “Artemisia dracunculus” (→ “Tarragon”)             |
| 384 | Tea                     | _Camellia sinensis_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Camellia sinensis”                                     |
| 385 | Tea Tree                | _Melaleuca alternifolia_             | botanical    | plant or fungus              | plants-r-z             | Kyn, WPh; name: WP “Melaleuca alternifolia”                                      |
| 386 | Thistle                 | _Carduus_ spp.                       | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Carduus”                                                    |
| 387 | Thorn Apple             | _Datura stramonium_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Datura stramonium”                                     |
| 388 | Thyme                   | _Thymus vulgaris_                    | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor, WPh; name: WP “Thymus vulgaris”                        |
| 389 | Ti                      | _Cordyline fruticosa_                | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Cordyline fruticosa”                                        |
| 390 | Toadflax                | _Linaria vulgaris_                   | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul; name: WP “Linaria vulgaris”                                 |
| 391 | Tobacco                 | _Nicotiana_ spp.                     | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Nicotiana”                                             |
| 392 | Tonka Bean              | _Dipteryx odorata_                   | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Dipteryx odorata”                                      |
| 393 | Tormentil               | _Potentilla erecta_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Grv, Cul; name: WP “Potentilla erecta”                                     |
| 394 | Tulip                   | _Tulipa_ spp.                        | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Tulip”                                                      |
| 395 | Turmeric                | _Curcuma longa_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, WPh; name: WP “Curcuma longa” (→ “Turmeric”)                     |
| 396 | Turnip                  | _Brassica rapa_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Brassica rapa”                                              |
| 397 | Valerian                | _Valeriana officinalis_              | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, WPh; name: WP “Valeriana officinalis” (→ “Valerian (herb)”) |
| 398 | Vanilla                 | _Vanilla planifolia_                 | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Vanilla planifolia”                                         |
| 399 | Vervain                 | _Verbena officinalis_                | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Cul, WPh; name: WP “Verbena officinalis”                              |
| 400 | Vetch                   | _Vicia_ spp.                         | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Vicia”                                                      |
| 401 | Vetiver                 | _Chrysopogon zizanioides_            | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, WPh; name: WP “Chrysopogon zizanioides”                               |
| 402 | Violet                  | _Viola odorata_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Viola odorata”                                         |
| 403 | Virginia Snakeroot      | _Aristolochia serpentaria_           | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Aristolochia serpentaria”                              |
| 404 | Wahoo                   | _Euonymus atropurpureus_             | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, WPh; name: WP “Euonymus atropurpureus”                           |
| 405 | Walnut                  | _Juglans regia_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Juglans regia”                                              |
| 406 | Water Lily              | _Nymphaea alba_                      | botanical    | plant or fungus              | plants-r-z             | Kyn, Cul; name: WP “Nymphaea alba”                                               |
| 407 | Water Mint              | _Mentha aquatica_                    | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Mentha aquatica”                                            |
| 408 | Watercress              | _Nasturtium officinale_              | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, Cul, WPh; name: WP “Nasturtium officinale” (→ “Watercress”)            |
| 409 | Wheat                   | _Triticum aestivum_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, WPh; name: WP “Common wheat”                                          |
| 410 | White Deadnettle        | _Lamium album_                       | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, Cul; name: WP “Lamium album”                                           |
| 411 | White Hellebore         | _Veratrum album_                     | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv; name: WP “Veratrum album”                                              |
| 412 | Wild Bergamot           | _Monarda fistulosa_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Monarda fistulosa”                                          |
| 413 | Wild Thyme              | _Thymus serpyllum_                   | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv; name: WP “Thymus serpyllum”                                            |
| 414 | Willow                  | _Salix alba_                         | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, WPh; name: WP “Salix alba”                                       |
| 415 | Winter's Bark           | _Drimys winteri_                     | botanical    | plant or fungus              | plants-r-z             | CunH, Grv; name: WP “Drimys winteri”                                             |
| 416 | Wintergreen             | _Gaultheria procumbens_              | botanical    | plant or fungus              | plants-r-z             | CunH, Grv, Cul; name: WP “Gaultheria procumbens”                                 |
| 417 | Witch Hazel             | _Hamamelis virginiana_               | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, WPh; name: WP “Hamamelis virginiana”                             |
| 418 | Witch's Butter          | _Exidia glandulosa_                  | fungal       | plant or fungus              | plants-r-z             | Kyn (single source); name: WP “Exidia glandulosa”                                |
| 419 | Woad                    | _Isatis tinctoria_                   | botanical    | plant or fungus              | plants-r-z             | Kyn, Cul; name: WP “Isatis tinctoria”                                            |
| 420 | Wood Anemone            | _Anemonoides nemorosa_               | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv; name: WP “Anemonoides nemorosa”                                        |
| 421 | Wood Betony             | _Betonica officinalis_               | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Cul; name: WP “Stachys officinalis” (→ “Betonica officinalis”)        |
| 422 | Wood Sorrel             | _Oxalis acetosella_                  | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor; name: WP “Oxalis acetosella”                           |
| 423 | Wormwood                | _Artemisia absinthium_               | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, Cul, Nor; name: WP “Artemisia absinthium”                        |
| 424 | Yarrow                  | _Achillea millefolium_               | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv, WPh; name: WP “Achillea millefolium”                             |
| 425 | Yellow Flag             | _Iris pseudacorus_                   | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv, Cul; name: WP “Iris pseudacorus”                                       |
| 426 | Yerba Mate              | _Ilex paraguariensis_                | botanical    | plant or fungus              | plants-r-z             | CunH, WPh; name: WP “Ilex paraguariensis” (→ “Yerba mate”)                       |
| 427 | Yerba Santa             | _Eriodictyon californicum_           | botanical    | plant or fungus              | plants-r-z             | CunH (single source); name: WP “Eriodictyon californicum”                        |
| 428 | Yew                     | _Taxus baccata_                      | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn, Grv; name: WP “Taxus baccata”                                         |
| 429 | Yucca                   | _Yucca_ spp.                         | botanical    | plant or fungus              | plants-r-z             | CunH, Kyn; name: WP “Yucca”                                                      |
| 430 | Zedoary                 | _Curcuma zedoaria_                   | botanical    | plant or fungus              | plants-r-z             | Kyn, Grv; name: WP “Curcuma zedoaria”                                            |
| 431 | Agate                   | Quartz var. agate                    | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Agate”                                                     |
| 432 | Alexandrite             | Chrysoberyl var. alexandrite         | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Chrysoberyl”                                     |
| 433 | Aluminium               | Aluminium                            | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Aluminium”                                       |
| 434 | Amazonite               | Microcline var. amazonite            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Amazonite”                                                 |
| 435 | Amber                   | Amber                                | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Amber”                                                     |
| 436 | Amethyst                | Quartz var. amethyst                 | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Amethyst”                                                  |
| 437 | Ametrine                | Quartz var. ametrine                 | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Ametrine”                                        |
| 438 | Angelite                | Anhydrite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Anhydrite”                                       |
| 439 | Antimony                | Antimony                             | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Antimony”                                        |
| 440 | Apatite                 | Apatite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Apatite”                                         |
| 441 | Apophyllite             | Apophyllite                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Apophyllite”                                     |
| 442 | Aquamarine              | Beryl var. aquamarine                | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Aquamarine (gem)”                                          |
| 443 | Aragonite               | Aragonite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Aragonite”                                       |
| 444 | Atacamite               | Atacamite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Atacamite”                                       |
| 445 | Aventurine              | Aventurine                           | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Aventurine”                                                |
| 446 | Azurite                 | Azurite                              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Azurite”                                                   |
| 447 | Beryl                   | Beryl                                | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Beryl”                                                     |
| 448 | Black Tourmaline        | Schorl                               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Tourmaline”                                                |
| 449 | Bloodstone              | Quartz var. heliotrope               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Heliotrope (mineral)” (→ “Heliotrope (bloodstone)”)        |
| 450 | Blue Lace Agate         | Quartz var. blue lace agate          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Blue lace agate”                                 |
| 451 | Brass                   | —                                    | none         | mineral or metal             | stones-and-metals      | CunC, WPwb                                                                       |
| 452 | Calcite                 | Calcite                              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Calcite”                                                   |
| 453 | Carnelian               | Quartz var. carnelian                | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Carnelian”                                                 |
| 454 | Cat's Eye               | Chrysoberyl var. cymophane           | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Chrysoberyl”                                     |
| 455 | Celestite               | Celestine                            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Celestine (mineral)”                                       |
| 456 | Cerussite               | Cerussite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Cerussite”                                       |
| 457 | Chalcedony              | Quartz var. chalcedony               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Chalcedony”                                                |
| 458 | Charoite                | Charoite                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Charoite”                                        |
| 459 | Chiastolite             | Andalusite var. chiastolite          | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Chiastolite”                                               |
| 460 | Chlorite                | Chlorite                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Chlorite group”                                  |
| 461 | Chrysoberyl             | Chrysoberyl                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Chrysoberyl”                                     |
| 462 | Chrysocolla             | Chrysocolla                          | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Chrysocolla”                                               |
| 463 | Chrysoprase             | Quartz var. chrysoprase              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Chrysoprase”                                               |
| 464 | Cinnabar                | Cinnabar                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Cinnabar”                                        |
| 465 | Citrine                 | Quartz var. citrine                  | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Citrine (quartz)” (→ “Citrine”)                            |
| 466 | Clear Quartz            | Quartz                               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Quartz”                                                    |
| 467 | Coal                    | Coal                                 | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Coal”                                            |
| 468 | Copper                  | Copper                               | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Copper”                                          |
| 469 | Danburite               | Danburite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Danburite”                                       |
| 470 | Dendritic Agate         | Quartz var. dendritic agate          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Agate”                                           |
| 471 | Diamond                 | Diamond                              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Diamond”                                                   |
| 472 | Dioptase                | Dioptase                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Dioptase”                                        |
| 473 | Electrum                | —                                    | unknown      | mineral or metal             | stones-and-metals      | CunC (single source)                                                             |
| 474 | Emerald                 | Beryl var. emerald                   | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Emerald”                                                   |
| 475 | Fire Agate              | Quartz var. fire agate               | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Fire agate”                                      |
| 476 | Flint                   | Flint                                | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Flint”                                           |
| 477 | Fluorite                | Fluorite                             | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Fluorite”                                                  |
| 478 | Fuchsite                | Muscovite var. fuchsite              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Fuchsite”                                        |
| 479 | Galena                  | Galena                               | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Galena”                                          |
| 480 | Garnet                  | Garnet                               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Garnet”                                                    |
| 481 | Gold                    | Gold                                 | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Gold”                                            |
| 482 | Hematite                | Hematite                             | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Hematite”                                                  |
| 483 | Holey Stone             | —                                    | none         | mineral or metal             | stones-and-metals      | CunC, WPas                                                                       |
| 484 | Howlite                 | Howlite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Howlite”                                         |
| 485 | Idocrase                | Vesuvianite                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Vesuvianite”                                     |
| 486 | Iolite                  | Cordierite                           | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Cordierite”                                      |
| 487 | Iron                    | Iron                                 | chemical     | mineral or metal             | stones-and-metals      | CunC, WPho, WPwb; name: WP “Iron”                                                |
| 488 | Jade                    | Jade                                 | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Jade”                                                      |
| 489 | Jasper                  | Quartz var. jasper                   | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Jasper”                                                    |
| 490 | Jet                     | Jet                                  | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Jet (lignite)” (→ “Jet (gemstone)”)                        |
| 491 | Kunzite                 | Spodumene var. kunzite               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Spodumene”                                                 |
| 492 | Kyanite                 | Kyanite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Kyanite”                                         |
| 493 | Labradorite             | Labradorite                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Labradorite”                                     |
| 494 | Lapis Lazuli            | Lapis lazuli                         | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Lapis lazuli”                                              |
| 495 | Larimar                 | Pectolite var. larimar               | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Larimar”                                         |
| 496 | Lava Stone              | —                                    | unknown      | mineral or metal             | stones-and-metals      | CunC (single source)                                                             |
| 497 | Lead                    | Lead                                 | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Lead”                                            |
| 498 | Lepidolite              | Lepidolite                           | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Lepidolite”                                                |
| 499 | Lodestone               | Magnetite                            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Magnetite”                                                 |
| 500 | Magnesite               | Magnesite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Magnesite”                                       |
| 501 | Malachite               | Malachite                            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Malachite”                                                 |
| 502 | Marble                  | Marble                               | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Marble”                                          |
| 503 | Mercury                 | Mercury                              | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Mercury (element)”                               |
| 504 | Meteorite               | —                                    | unknown      | mineral or metal             | stones-and-metals      | CunC (single source)                                                             |
| 505 | Mica                    | Muscovite                            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Muscovite”                                                 |
| 506 | Moldavite               | Moldavite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Moldavite”                                       |
| 507 | Moonstone               | Feldspar var. moonstone              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Moonstone (gemstone)”                                      |
| 508 | Moss Agate              | Quartz var. moss agate               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Moss agate”                                                |
| 509 | Obsidian                | Obsidian                             | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Obsidian”                                                  |
| 510 | Okenite                 | Okenite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Okenite”                                         |
| 511 | Onyx                    | Quartz var. onyx                     | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Onyx”                                                      |
| 512 | Opal                    | Opal                                 | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Opal”                                                      |
| 513 | Pearl                   | Pearl                                | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Pearl”                                           |
| 514 | Peridot                 | Forsterite var. peridot              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Peridot”                                                   |
| 515 | Petalite                | Petalite                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Petalite”                                        |
| 516 | Petrified Wood          | —                                    | unknown      | mineral or metal             | stones-and-metals      | CunC (single source)                                                             |
| 517 | Phenacite               | Phenakite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Phenakite”                                       |
| 518 | Pietersite              | Quartz var. pietersite               | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Pietersite”                                      |
| 519 | Pipestone               | Catlinite                            | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Catlinite”                                       |
| 520 | Prehnite                | Prehnite                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Prehnite”                                        |
| 521 | Pumice                  | Pumice                               | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Pumice”                                          |
| 522 | Pyrite                  | Pyrite                               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Pyrite”                                                    |
| 523 | Pyrolusite              | Pyrolusite                           | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Pyrolusite”                                      |
| 524 | Rhodochrosite           | Rhodochrosite                        | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Rhodochrosite”                                             |
| 525 | Rhodonite               | Rhodonite                            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Rhodonite”                                                 |
| 526 | Rhyolite                | Rhyolite                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Rhyolite”                                        |
| 527 | Rose Quartz             | Quartz var. rose quartz              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Rose quartz”                                     |
| 528 | Ruby                    | Corundum var. ruby                   | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Ruby”                                                      |
| 529 | Rutilated Quartz        | Quartz var. rutilated quartz         | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Rutilated quartz”                                |
| 530 | Sapphire                | Corundum var. sapphire               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Sapphire”                                                  |
| 531 | Sard                    | Quartz var. sard                     | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Carnelian”                                       |
| 532 | Sardonyx                | Quartz var. sardonyx                 | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Onyx”                                                      |
| 533 | Selenite                | Gypsum var. selenite                 | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Selenite (mineral)” (→ “Selenite (gypsum)”)                |
| 534 | Seraphinite             | Clinochlore                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Seraphinite”                                     |
| 535 | Serpentine              | Serpentine                           | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Serpentine subgroup”                                       |
| 536 | Shattuckite             | Shattuckite                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Shattuckite”                                     |
| 537 | Silver                  | Silver                               | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Silver”                                          |
| 538 | Smithsonite             | Smithsonite                          | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Smithsonite”                                     |
| 539 | Smoky Quartz            | Quartz var. smoky quartz             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Smoky quartz”                                    |
| 540 | Snow Quartz             | Quartz var. milky quartz             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Milky quartz” (→ “Quartz”)                       |
| 541 | Sodalite                | Sodalite                             | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Sodalite”                                                  |
| 542 | Sphene                  | Titanite                             | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Titanite”                                        |
| 543 | Spinel                  | Spinel                               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Spinel”                                                    |
| 544 | Staurolite              | Staurolite                           | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Staurolite”                                                |
| 545 | Steel                   | —                                    | none         | mineral or metal             | stones-and-metals      | CunC (single source)                                                             |
| 546 | Stilbite                | Stilbite                             | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Stilbite”                                        |
| 547 | Sugilite                | Sugilite                             | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Sugilite”                                                  |
| 548 | Sulphur                 | Sulphur                              | chemical     | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Sulfur”                                                    |
| 549 | Sunstone                | Feldspar var. sunstone               | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Sunstone”                                                  |
| 550 | Tektite                 | Tektite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Tektite”                                         |
| 551 | Thulite                 | Zoisite var. thulite                 | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Thulite”                                         |
| 552 | Tiger's Eye             | Quartz var. tiger's eye              | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Tiger's eye”                                               |
| 553 | Tin                     | Tin                                  | chemical     | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Tin”                                             |
| 554 | Topaz                   | Topaz                                | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Topaz”                                                     |
| 555 | Tourmalinated Quartz    | —                                    | unknown      | mineral or metal             | stones-and-metals      | Hall, CunC                                                                       |
| 556 | Tourmaline              | Tourmaline                           | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Tourmaline”                                                |
| 557 | Turquoise               | Turquoise                            | mineral      | mineral or metal             | stones-and-metals      | Hall, CunC; name: WP “Turquoise”                                                 |
| 558 | Ulexite                 | Ulexite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Ulexite”                                         |
| 559 | Unakite                 | Unakite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Unakite”                                         |
| 560 | Vanadinite              | Vanadinite                           | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Vanadinite”                                      |
| 561 | Variscite               | Variscite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Variscite”                                       |
| 562 | Wulfenite               | Wulfenite                            | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Wulfenite”                                       |
| 563 | Zeolite                 | Zeolite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Zeolite”                                         |
| 564 | Zincite                 | Zincite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Zincite”                                         |
| 565 | Zircon                  | Zircon                               | mineral      | mineral or metal             | stones-and-metals      | CunC (single source); name: WP “Zircon”                                          |
| 566 | Zoisite                 | Zoisite                              | mineral      | mineral or metal             | stones-and-metals      | Hall (single source); name: WP “Zoisite”                                         |
| 567 | Agarwood                | _Aquilaria malaccensis_              | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, WPi; name: WP “Aquilaria malaccensis”                                      |
| 568 | Alum                    | Potassium alum                       | chemical     | animal, salt, water or other | resins-woods-and-other | CunC (single source); name: WP “Potassium alum”                                  |
| 569 | Ammonite                | Ammonoidea                           | zoological   | animal, salt, water or other | resins-woods-and-other | CunC (single source); name: WP “Ammonoidea”                                      |
| 570 | Asafoetida              | _Ferula assa-foetida_                | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, WPh; name: WP “Ferula assa-foetida”                                   |
| 571 | Balm of Gilead          | _Commiphora gileadensis_             | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Grv; name: WP “Commiphora gileadensis”                                     |
| 572 | Benzoin                 | _Styrax benzoin_                     | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, Grv, WPi; name: WP “Styrax benzoin”                                   |
| 573 | Borneol Camphor         | _Dryobalanops aromatica_             | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Dryobalanops aromatica”                           |
| 574 | Camphor                 | _Camphora officinarum_               | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, Grv; name: WP “Camphora officinarum”                                  |
| 575 | Cat                     | _Felis catus_                        | zoological   | animal, salt, water or other | resins-woods-and-other | WPwb (single source); name: WP “Cat”                                             |
| 576 | Cedar                   | _Cedrus libani_                      | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn; name: WP “Cedrus libani”                                              |
| 577 | Charcoal                | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPi (single source)                                                              |
| 578 | Copal                   | _Bursera fagaroides_                 | botanical    | resin, wood or incense       | resins-woods-and-other | CunH (single source); name: WP “Bursera fagaroides”                              |
| 579 | Cowrie Shell            | Cypraeidae                           | zoological   | animal, salt, water or other | resins-woods-and-other | WPho (single source); name: WP “Cowrie”                                          |
| 580 | Dragon's Blood          | _Calamus draco_                      | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn; name: WP “Calamus draco”                                              |
| 581 | Egg                     | _Gallus gallus domesticus_           | zoological   | animal, salt, water or other | resins-woods-and-other | WPho (single source); name: WP “Chicken”                                         |
| 582 | Florida Water           | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPfw (single source)                                                             |
| 583 | Frankincense            | _Boswellia sacra_                    | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, WPi; name: WP “Boswellia sacra”                                       |
| 584 | Galbanum                | _Ferula gummosa_                     | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Ferula gummosa”                                   |
| 585 | Golden Frankincense     | _Boswellia papyrifera_               | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Boswellia papyrifera”                             |
| 586 | Goofer Dust             | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPho, WPgd                                                                       |
| 587 | Graveyard Dirt          | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPho, WPgd, WPmo                                                                 |
| 588 | Guggul                  | _Commiphora wightii_                 | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Commiphora wightii”                               |
| 589 | Gum Arabic              | _Senegalia senegal_                  | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, WPh, WPi; name: WP “Senegalia senegal”                                     |
| 590 | Honey                   | _Apis mellifera_                     | zoological   | animal, salt, water or other | resins-woods-and-other | WPho (single source); name: WP “Western honey bee”                               |
| 591 | Kauri Gum               | _Agathis australis_                  | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Agathis australis”                                |
| 592 | Labdanum                | _Cistus ladanifer_                   | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Labdanum”                                         |
| 593 | Makko                   | _Machilus thunbergii_                | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Machilus thunbergii”                              |
| 594 | Mastic                  | _Pistacia lentiscus_                 | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, Grv; name: WP “Pistacia lentiscus”                                    |
| 595 | Mother-of-Pearl         | Nacre                                | unknown      | animal, salt, water or other | resins-woods-and-other | CunC (single source); name: WP “Nacre”                                           |
| 596 | Myrrh                   | _Commiphora myrrha_                  | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, Grv, WPi; name: WP “Commiphora myrrha”                                |
| 597 | Opoponax                | _Commiphora guidottii_               | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Opopanax (perfumery)”                             |
| 598 | Red Brick Dust          | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPho (single source)                                                             |
| 599 | Red Coral               | _Corallium_ spp.                     | zoological   | animal, salt, water or other | resins-woods-and-other | CunC (single source); name: WP “Precious coral”                                  |
| 600 | Red Sandalwood          | _Pterocarpus santalinus_             | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Grv; name: WP “Pterocarpus santalinus”                                     |
| 601 | Salt                    | Sodium chloride                      | chemical     | animal, salt, water or other | resins-woods-and-other | CunC, WPho, WPgd, WPwb; name: WP “Sodium chloride”                               |
| 602 | Saltpetre               | Potassium nitrate                    | chemical     | animal, salt, water or other | resins-woods-and-other | WPi (single source); name: WP “Potassium nitrate”                                |
| 603 | Sandalwood              | _Santalum album_                     | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, Grv, WPh, WPi; name: WP “Santalum album”                              |
| 604 | Sandarac                | _Tetraclinis articulata_             | botanical    | resin, wood or incense       | resins-woods-and-other | CunH (single source); name: WP “Tetraclinis articulata” (→ “Tetraclinis”)        |
| 605 | Snakeskin               | Serpentes                            | zoological   | animal, salt, water or other | resins-woods-and-other | WPho, WPgd; name: WP “Snake”                                                     |
| 606 | Storax                  | _Liquidambar orientalis_             | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn, Grv; name: WP “Liquidambar orientalis”                                |
| 607 | Sugar                   | Sucrose                              | chemical     | animal, salt, water or other | resins-woods-and-other | WPho (single source); name: WP “Sucrose”                                         |
| 608 | Sweet Gum               | _Liquidambar styraciflua_            | botanical    | resin, wood or incense       | resins-woods-and-other | Kyn (single source); name: WP “Liquidambar styraciflua”                          |
| 609 | Sweetgrass              | _Hierochloe odorata_                 | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, Kyn; name: WP “Hierochloe odorata”                                         |
| 610 | Tolu Balsam             | _Myroxylon balsamum_ var. _balsamum_ | botanical    | resin, wood or incense       | resins-woods-and-other | WPi (single source); name: WP “Tolu balsam”                                      |
| 611 | Tragacanth              | _Astragalus_ spp.                    | botanical    | resin, wood or incense       | resins-woods-and-other | CunH, WPi; name: WP “Tragacanth”                                                 |
| 612 | Vinegar                 | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPwb (single source)                                                             |
| 613 | Whiskey                 | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPho, WPmo                                                                       |
| 614 | Wood Ash                | —                                    | none         | animal, salt, water or other | resins-woods-and-other | WPgd, WPwb                                                                       |

## Considered and left out

### Cut to hold the roster at 614

Each of these is named by one source only, and was cut so the roster held 614 rows. Any of them can come back in place of another row. With formal name and source:

African Marigold (_Tagetes_ spp., Kyn); Agave (_Agave_ spp., CunH); Alyssum (_Alyssum_ spp., CunH); Amaryllis (_Hippeastrum puniceum_, Kyn); Banana (_Musa × paradisiaca_, CunH); Belladonna Lily (_Amaryllis belladonna_, Kyn); Bleeding Heart (_Lamprocapnos spectabilis_, CunH); Brazil Nut (_Bertholletia excelsa_, CunH); Bromeliad (Bromeliaceae, CunH); Cow Parsley (_Anthriscus sylvestris_, Kyn); Forsythia (_Forsythia × intermedia_, Kyn); Gourd (_Cucurbita_ spp., CunH); Hackberry (_Celtis_ spp., Kyn); Hogweed (_Heracleum sphondylium_, Kyn); Hornbeam (_Carpinus betulus_, Kyn); Indian Paintbrush (_Castilleja_ spp., CunH); Milkwort (_Polygala vulgaris_, Kyn); Mountain Mahogany (_Cercocarpus ledifolius_, CunH); Norfolk Island Pine (_Araucaria heterophylla_, CunH); Pearlwort (_Sagina procumbens_, Kyn); Pignut (_Conopodium majus_, Kyn); Pineapple (_Ananas comosus_, CunH); Poinsettia (_Euphorbia pulcherrima_, Kyn); Pothos (_Epipremnum aureum_, Kyn); Pumpkin (_Cucurbita pepo_, Kyn); Ragweed (_Ambrosia_ spp., CunH); Reed (_Phragmites australis_, Kyn); Rush (_Juncus effusus_, Kyn); Snake Plant (_Dracaena trifasciata_, Kyn); Spider Plant (_Chlorophytum comosum_, Kyn); Spiderwort (_Tradescantia virginiana_, CunH); Stitchwort (_Rabelera holostea_, Kyn); Sycamore (_Platanus_ spp., Kyn); Tomato (_Solanum lycopersicum_, CunH); Trillium (_Trillium_ spp., CunH); Venus Flytrap (_Dionaea muscipula_, CunH); Wax Plant (_Hoya carnosa_, CunH); Wayfaring Tree (_Viburnum lantana_, Kyn); Yellow Brain Fungus (_Tremella mesenterica_, Kyn); Zinnia (_Zinnia_ spp., Kyn).

### Further species under a heading that already has a row

Kynes often lists two or three species under one heading. The roster keeps one row per heading (the species another source also names, or else the first one listed), so these were left out. A heading with no row at all says so.

- Acacia: _Senegalia greggii_, _Vachellia nilotica_, _Vachellia seyal_
- Aconite: _Aconitum lycoctonum_
- Adder’s Tongue: _Ophioglossum vulgatum_
- Alder: _Alnus rubra_, _Alnus serrulata_
- Alkanet: _Anchusa officinalis_
- Aloe: _Aloe rubroviolacea_
- Amaranth: _Amaranthus blitum_, _Amaranthus caudatus_
- Anemone: _Anemone coronaria_
- Angelica: _Angelica sylvestris_
- Ash: _Fraxinus americana_, _Fraxinus nigra_
- Aster: _Aster amellus_, _Symphyotrichum novi-belgii_
- Bamboo: _Dendrocalamus giganteus_, _Phyllostachys nigra_
- Bedstraw: _Galium triflorum_
- Beech: _Fagus grandifolia_
- Birch: _Betula papyrifera_
- Bistort: _Bistorta bistortoides_
- Bluebell: _Mertensia virginica_
- Bryony: _Dioscorea communis_
- Buckthorn: _Frangula dodonei_
- Burdock: _Arctium minus_
- Buttercup: _Ranunculus repens_
- Carnation: _Dianthus barbatus_, _Dianthus plumarius_
- Cedar: _Cedrus atlantica_, _Juniperus virginiana_, _Thuja plicata_
- Cherry: _Prunus padus_, _Prunus serotina_
- Chive: _Allium tuberosum_
- Chrysanthemum: _Glebionis coronaria_
- Club Moss: _Huperzia selago_
- Crabapple: _Malus coronaria_
- Cress: _Lepidium sativum_
- Deadnettle: _Lamium purpureum_
- Deer’s Tongue: _Frasera speciosa_
- Devil’s Shoestring: _Viburnum lantanoides_ (Kynes's species; Cunningham names _Nolina lindheimeriana_, so the row stays `unknown`)
- Dodder: _Cuscuta chinensis_
- Dogwood: _Cornus mas_, _Cornus nuttallii_
- Elm: _Ulmus americana_, and Kynes's English elm, whose binomial reached only a cultivar article
- Eucalyptus: _Corymbia citriodora_
- Eyebright: _Euphrasia nemorosa_
- Fig: _Ficus sycomorus_
- Flax: _Linum catharticum_
- Galangal: _Alpinia galanga_
- Gardenia: _Gardenia thunbergia_
- Gooseberry: _Ribes hirtellum_
- Goosefoot: _Syngonium podophyllum_ (the whole heading was left out: single source)
- Grape: _Vitis labrusca_
- Grass: _Briza media_ (the whole heading was left out: Cunningham's Grass names no species)
- Heather and Heath: _Erica carnea_
- Heliotrope: _Heliotropium curassavicum_
- Holly: _Ilex opaca_
- Honeysuckle: _Lonicera periclymenum_
- Hornbeam: _Carpinus caroliniana_
- Jasmine: _Jasminum nudiflorum_
- Knapweed: _Centaurea scabiosa_
- Knotgrass: _Polygonum arenastrum_
- Lady’s Mantle: _Alchemilla mollis_
- Lady’s Slipper: _Cypripedium acaule_
- Larkspur: _Consolida ajacis_
- Lavender: _Lavandula latifolia_
- Lemongrass: _Cymbopogon flexuosus_
- Life Everlasting: _Anaphalis margaritacea_
- Lilac: the cultivar Tinkerbelle (_Syringa_)
- Lime: _Citrus limettioides_
- Linden: _Tilia americana_
- Lobelia: _Lobelia cardinalis_
- Lotus: _Nelumbo lutea_
- Magnolia: _Magnolia grandiflora_, _Magnolia mexicana_
- Mandrake: _Mandragora autumnalis_
- Mesquite: _Prosopis glandulosa_
- Mimosa: _Albizia julibrissin_, _Senegalia catechu_
- Mistletoe: _Phoradendron leucarpum_
- Mulberry: _Morus alba_
- Mushroom: _Amanita phalloides_
- Mustard: _Brassica juncea_
- Pansy: _Viola × wittrockiana_
- Passionflower: _Passiflora caerulea_
- Peony: _Paeonia mascula_
- Periwinkle: _Vinca major_
- Primrose: _Primula × polyantha_
- Quassia: _Picrasma excelsa_
- Quince: _Chaenomeles japonica_
- Raspberry: _Rubus occidentalis_
- Rhubarb: _Rheum rhabarbarum_, _Rheum rhaponticum_
- Rowan: _Sorbus americana_
- Sandalwood: _Santalum spicatum_
- Savory: _Satureja montana_
- Seaweed: _Macrocystis pyrifera_
- Snakeroot: _Aristolochia rotunda_
- Solomon’s Seal: _Polygonatum biflorum_
- Speedwell: _Veronica chamaedrys_
- Spikenard: _Aralia racemosa_
- Spindletree: _Euonymus europaeus_
- Star Anise: _Illicium anisatum_
- Storax: _Styrax officinalis_
- Strawberry: _Fragaria × ananassa_
- Vetchling: _Lathyrus linifolius_ (the whole heading was left out: single source)
- Violet: _Viola sororia_
- Water Lily: _Nuphar lutea_, _Nymphaea odorata_
- Willow: _Salix babylonica_, _Salix discolor_
- Yew: _Taxus canadensis_

### Headings with no formal name to give

- Cunningham's Grain, Grass, Nuts, Roots and Straw name a category, not a plant, and give no binomial.
- Cunningham's Toadstool names no species. The fungi in the roster are the ones Cunningham and Kynes name by species.
- Cunningham's Molukka gives no binomial, and no article was found for the name.
- Cunningham's Sagebrush gives only _Artemisia_ spp., which would sit as a genus row over Mugwort, Wormwood, Southernwood and Tarragon.
- Cunningham's Shallot reached only the genus _Allium_, which already holds Onion, Garlic, Chives and Leek.
- Cunningham's Mint is the genus _Mentha_, whose species have rows of their own (Peppermint, Spearmint, Water Mint, Pennyroyal).
- The printed binomial matched no Wikipedia article: Cunningham's Cloth-of-Gold (_Crocus angustifolia_) and Fleabane (_Inula dysenterica_, or _Corydalis_ spp., a different plant), and Kynes's Siam Benzoin (_Styrax tonkinensis_) and Johnson's Amaryllis. Each is single-source, so none was pursued further.
- Single-source and cut for space, though a formal name was found: Cunningham's Love Seed (_Lomatium foeniculaceum_), Parosela (_Dalea_ spp.), Pilot Weed (_Silphium laciniatum_), Dutchman's Breeches (_Dicentra cucullaria_), Yohimbe (_Corynanthe johimbe_) and Wood Rose (_Ipomoea tuberosa_, now _Distimake tuberosus_ on Wikipedia).
- The same ingredient as a row already present: Cunningham's Iris (_Iris florentina_, the orris iris, under Orris) and Wild Plum (_Prunus americana_, beside his own Plum).
- Cunningham's Ebony: the binomial he prints, _Diospyros lotus_, is the date-plum, not an ebony, so no formal name could be given without guessing.
- Cunningham's Mimosa is _Acacia dealbata_; Kynes's _Albizia julibrissin_ (also called mimosa) is listed with the further species above.

### From the `standard` fixture

- **Hidcote Lavender** (_Lavandula angustifolia_ 'Hidcote'): a cultivar. No source read here names it apart from lavender, which has its row.
- **Cat's Claw** as _Uncaria tomentosa_: only the Wikipedia herbalism list names it, as a medicine, so it is out of scope for a folk-magic roster. _Uncaria guianensis_ and _Dolichandra unguis-cati_: no source read here names them. _Senegalia greggii_ is Kynes's cat claw acacia, listed with the further species above. _Felis catus_ is in, as Cat.
- **Reishi** (_Ganoderma lingzhi_): no source read here names it. Wikipedia's article now gives _Ganoderma sichuanense_ in its taxobox, which the fixture's name would need checking against.
- **Moon Water** and **Black Salt**: no index or list read here names either. The Wikipedia page "Black salt" names only the condiment kala namak and black lava salt. A web search turned up only blogs, which were not used. Both should come back once a source is found.
- **Beeswax** and **Sea Salt** are in, under the labels Honey and Salt, with the fixture's formal names `Apis mellifera` and `Sodium chloride`.

### Minerals

- **Forms of a mineral already present**, which become variants rather than rows: Herkimer diamond (double-terminated quartz crystals, per Wikipedia), phantom quartz, Apache tear (rounded pebbles of obsidian, per Wikipedia), snowflake obsidian (a section of Wikipedia's "Obsidian"), geodes (a formation, not a mineral), stalagmites and stalactites (cave formations), and the colour sorts of calcite, jasper, agate and tourmaline in Cunningham's tables.
- **The same identity as a row already present**: Hall's Anhydrite is her Angelite (Wikipedia redirects angelite to anhydrite); Cunningham's Olivine is the roster's Peridot (_Forsterite var. peridot_), and he gives olivine's uses to peridot; Cunningham's Cross Stone is Hall's Chiastolite.
- **Trade names with no formal name read**: Azeztulite, Boji stone, Merlinite and Nebula stone (all Hall).
- **Made in a laboratory**: aqua aura quartz (Hall's own heading says laboratory-made).
- **Chrysanthemum stone** (Hall): Wikipedia describes a rock with a flower-like pattern and gives no mineral or rock name for it.
- **Asbestos** (Cunningham): he writes that it is no longer recommended for magical use, and Wikipedia describes it as a group of fibrous silicate minerals.
- **Tanzanite**: a variety of zoisite on Wikipedia, but neither crystal source gives it a heading.

### Other

- **Personal concerns** (urine, hair, nail clippings, in Wikipedia's "Witch bottle"): these are the person's own, not a stocked ingredient.
- **Objects** (pins, needles, coins, thread, glass, horse skulls, shoes, in "Witch bottle" and "Hoodoo (spirituality)"): not ingredients. The iron nails both articles name are a form of Iron, which has a row.
- **Unspecified animals** (bones, teeth, claws, feathers, shells, frogs and lizards, in "Goofer dust", "Mojo" and "Hoodoo"): no single animal, so no formal name.
- **Remedies, not workings** (baking soda, lard, castor oil, in "Hoodoo (spirituality)"): castor oil is a form of Castor, which has a row.
- **Forms of a plant already present**: cayenne (Chilli Pepper), rosemary (Rosemary), red wine (Grape), olive oil (Olive).
- **Named in passing, single source**: sand ("Witch bottle"); dried manure, insect chitin and "anvil dust", the iron dust from around a blacksmith's anvil ("Goofer dust"; anvil dust is a form of Iron). Holy water, rain water and sea water are named by none of the lists read here.

## Open questions for the pilot

- No formal name was checked against POWO or Mindat (both refused this session's requests). The pilot should check its 14 rows there before the shards start.
- The group-for-species names (`Feldspar var. moonstone`, `Feldspar var. sunstone`) and the quartz varieties named only by a Wikipedia redirect (`Quartz var. dendritic agate`, `Quartz var. milky quartz`) want a Mindat check.
- Wikipedia's taxobox names a few plants differently from older usage, and the roster follows Wikipedia: _Betonica officinalis_ (wood betony, often _Stachys officinalis_), _Senega officinalis_ (Seneca snakeroot, often _Polygala senega_), _Camphora officinarum_, _Rhamphospermum nigrum_, _Neltuma juliflora_, _Bergera koenigii_, _Calamus draco_ and _Atropa bella-donna_ (with a hyphen).
- Seven rows are `unknown`: Devil's Shoestring (three plants carry the name across the sources read: the hobblebush in Cunningham's and Kynes's own entries, _Yucca filamentosa_ in Kynes's Yucca entry and _Nolina lindheimeriana_ in Wikipedia, as MB.242's pilot found), Tourmalinated Quartz (no mineralogical source read), Petrified Wood, Lava Stone, Meteorite, Electrum (Wikipedia calls it a natural alloy of gold and silver) and Mother-of-Pearl (Wikipedia calls it nacre, a composite material). The owner decided on 2026-10-11 that all seven are seeded as `unknown` with no formal name ([`README.md`](README.md), "Formal names").
- Kynes's _The Complete Book of Correspondences_ would be a strong second source for the minerals, animals and waters, but the library's copy is a 37-page publisher excerpt, not the book: its front matter and printed pages 1 to 26, which stop partway through chapter one. So it was not used, and the full book is still needed. The PDF of Beyerl's _Master Book of Herbalism_ in the library turned out to be a summary of the book, not the book, so it was not used either. The _Botanical Safety Handbook_ is a safety reference rather than a folk-magic one, and was not used to choose rows.
- Wikipedia's "Table of magical correspondences", which the repo already cites, was read; it is a short article about such tables and holds no list of ingredients, so no row cites it.

## Bibliography

Books are cited as the part read: their index, table of contents or entry headings.

Culpeper, Nicholas. _The Complete Herbal; To Which Is Now Added, Upwards of One Hundred Additional Herbs, with a Display of Their Medicinal and Occult Qualities_. A new edition. London: Thomas Kelly, 1850. Project Gutenberg eBook #49513, 2015. Entry headings of the herbal section. Accessed 11 October 2026. https://www.gutenberg.org/ebooks/49513.

Cunningham, Scott. _Cunningham's Encyclopedia of Crystal, Gem & Metal Magic_. Llewellyn's Sourcebook Series. St. Paul, MN: Llewellyn Publications, 1988. Sixteenth printing, 1996. Entry headings of parts II and III, the tables of part IV, and the index.

Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. Woodbury, MN: Llewellyn Publications, 1985, 2000. First e-book edition, 2012. Entry headings of part II.

Grieve, M. _A Modern Herbal_. "Index (Common Name)," A to Z, and the entry pages it links to. Botanical.com. Accessed 11 October 2026. https://www.botanical.com/botanical/mgmh/comindx.html.

Hall, Judy. _The Crystal Bible_. London: Godsfield Press, 2003, 2009. E-book, 2012. Headings of the crystal directory.

Kynes, Sandra. _The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells_. Woodbury, MN: Llewellyn Publications, 2024. First e-book edition, 2024. Entry headings and the species listed under each.

Northcote, Lady Rosalind. _The Book of Herbs_. Handbooks of Practical Gardening 12. London and New York: John Lane, The Bodley Head, 1903. Table of contents.

Wikipedia contributors. "Adder Stone." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Adder_stone.

Wikipedia contributors. "Florida Water." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Florida_Water.

Wikipedia contributors. "Goofer Dust." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Goofer_dust.

Wikipedia contributors. "Hoodoo (Spirituality)." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Hoodoo_(spirituality).

Wikipedia contributors. "Incense." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Incense.

Wikipedia contributors. "List of Plants Used in Herbalism." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/List_of_plants_used_in_herbalism.

Wikipedia contributors. "Mojo (African-American Culture)." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Mojo_(African-American_culture).

Wikipedia contributors. "Witch Bottle." _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/wiki/Witch_bottle.

Wikipedia contributors. Taxoboxes, mineral and chemical infoboxes, and opening sentences of the articles named in the roster's sources column after "name: WP". _Wikipedia_. Accessed 11 October 2026. https://en.wikipedia.org/.
