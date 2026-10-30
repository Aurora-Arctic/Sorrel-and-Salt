## The compendium seed: plants A to Cn (MB.243), part 1

**This pull request is part 1 of the shard.** It seeds **56 entries and 138 forms** beneath them, the candidate list's rows from Adam and Eve Root to Blessed Thistle. The shard's remaining 53 rows, Bloodroot to Club Moss, follow in a later pull request on the same task (MB.243), which completes this doc. Three of the shard's rows, Beard Lichen, Bladderwrack and Cinnamon, were seeded by the [pilot](pilot.md) and are researched no further. **Every page and revision cited here was read during the task, on 2026-10-11.**

The literal is `src/db/seed/compendium/plants-a-cn.ts`, registered in `COMPENDIUM` after the pilot and `resins-woods-and-other`. It is the source of truth; this doc records which source supports which fields, and what was left out. The rules are the [README](README.md)'s and the pilot's "Decisions the lanes inherit".

| Rows of the candidate list (`plants-a-cn`) | Count |
| ------------------------------------------ | ----: |
| Seeded in this part                        |    56 |
| Seeded by the pilot                        |     3 |
| To follow in part 2                        |    53 |
| Left out of the shard                      |     0 |
| **All**                                    |   112 |

Forms in this part: 138, with no target. Entries citing a single source of their own: none.

### How the research was done

The lane split its rows into batches of four, each researched by a helper agent under the README's rules. Each helper wrote the literal fragment, an evidence file naming, for every citation, the file and line (or the Wikipedia revision's wikitext line) where each value is stated, and notes. The lane opened a sample of every batch's locators against the books and the revisions before accepting it, ran the guard over each batch and over the assembled shard, and recorded the decisions below. Each helper used about 160,000 to 235,000 tokens for four entries, about 40,000 to 60,000 an entry (the agents' own usage reports; an estimate per entry), and seven to eleven minutes of wall clock. The lane checked at least one book locator or revision line per batch against the text itself, among them Cunningham under Agrimony, Banyan, Blackberry and Mustard, Black; Kynes under Anise, Beech and Birch; AHPA pp. 36 and 112; Culpeper under Ash Tree, Avens, Barley and Amara Dulcis; and the revisions of "Aplectrum", "Allspice" and "Cascabela thevetia". Each said what the evidence claimed.

The lane fetched each row's Wikipedia article once, through the API, at about 07:06 UTC on 2026-10-11; the few further articles a helper needed were fetched the same day. Every revision cited is the one fetched. **Plants of the World Online** was tried once, at 07:05 UTC on 2026-10-11 (`powo.science.kew.org/api/2/search?q=Agrimonia%20eupatoria`), and answered HTTP 403 with a Cloudflare challenge page, as it had for MB.240 and the pilot. So no formal name here was checked against POWO; each was checked against the Wikipedia revision cited for it and, where the handbook has a monograph, against the _AHPA Botanical Safety Handbook_'s heading. **No formal name on the candidate list changed**; where a book prints another name, the entry's notes below say so.

### Decisions this part adds

- **Grieve is cited page by page**, as MB.247 first did: `grieve-<slug of the page's heading>`, a `web_page` in _A Modern Herbal_. Culpeper is a shared work in `works.ts`, the 1850 edition Project Gutenberg transcribes.
- **A genus's subgenus or section keeps its rank** (`Rubus subg. Rubus`, Blackberry), and the guard now takes that shape.
- **A power in a Magical Uses line counts in the source's own word**, as one in a Powers line does ("breaks hexes" is Hex-Breaking). "Ancestors" is Ancestor Work; "manifest" Manifestation; "bind" Binding; "balance/harmony" Harmony.
- **A heading covering several species** applies to the roster row it is counted under (Kynes's Nightshade to Belladonna and Black Nightshade; both books' Bittersweet to both bittersweets), unless the roster gives the other species its own row, as Kynes's Walnut and Thistle, whose shared lists wait for those rows.
- **Safety notes** rest on AHPA, Cunningham's health codes (p. 266) and Kynes's cautions first; Wikipedia's toxicity statements are used for a plant no handbook covers (Be-Still, Bamboo), and are named as such.
- **The toxic flag** (M14.1) is on where a source says in so many words that the plant, a part of it or a form is poisonous or toxic to people, pets or animals, as the literal's safety note records; its source line names the source with "the toxic flag". Cunningham's health code X (not for internal use), a safety class, a drug interaction or a pregnancy caution sets no flag.

### Bibliography

The shared works cited, as `src/db/seed/compendium/works.ts` declares them:

- Culpeper, Nicholas. The Complete Herbal. London: Thomas Kelly, 1850. Project Gutenberg ebook 49513. Last modified October 24, 2024. Accessed October 11, 2026. https://www.gutenberg.org/ebooks/49513.
- Cunningham, Scott. Cunningham's Encyclopedia of Magical Herbs. 2nd ed. Woodbury, MN: Llewellyn Publications, 2012. (EPUB.)
- Gardner, Zoë, and Michael McGuffin, eds. American Herbal Products Association's Botanical Safety Handbook. 2nd ed. Boca Raton, FL: CRC Press, 2013. (PDF.)
- Kynes, Sandra. Herbal Remedies for Beginners: Natural Ways to Treat Ailments. Woodbury, MN: Llewellyn Publications, 2020. (EPUB.)
- Kynes, Sandra. The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells. Woodbury, MN: Llewellyn Publications, 2024. (EPUB.)
- Northcote, Lady Rosalind. The Book of Herbs. Handbooks of Practical Gardening 12. London: John Lane, The Bodley Head, 1903.

The shard's own Wikipedia sources, each a revision read on 11 October 2026 (`https://en.wikipedia.org/w/index.php?title=<title>&oldid=<revision>`):

- Wikipedia, under "Actaea racemosa" (1354921655); "Agrimonia eupatoria" (1378732514); "Aletris farinosa" (1306189686); "Alfalfa" (1378228326); "Alkanna tinctoria" (1365568463); "Allspice" (1379316361); "Almond" (1378951640); "Alnus glutinosa" (1379114226); "Aloe vera" (1376311794); "Amaranthus hypochondriacus" (1366712058); "American ginseng" (1378580301); "Angelica archangelica" (1306190612); "Anise" (1378831685); "Aplectrum" (1329531003); "Apple" (1378395484); "Arctostaphylos uva-ursi" (1358701321); "Arnica montana" (1361261909); "Atropa bella-donna" (1376240967); "Avocado" (1378057135); "Bambusa vulgaris" (1364829467); "Barley" (1377470667); "Basil" (1375753314); "Berberis vulgaris" (1378745653); "Bergamot orange" (1378785616); "Beta vulgaris" (1358735749); "Betula pendula" (1377221570); "Bistorta officinalis" (1366901099); "Bitter orange" (1368703094); "Black pepper" (1377161631); "Blackberry" (1379287506); "Callistephus" (1364266549); "Cascabela thevetia" (1352558539); "Celastrus scandens" (1359249101); "Centaurea benedicta" (1373844987); "Convolvulus arvensis" (1375030855); "Erythronium americanum" (1317640579); "Fagus sylvatica" (1377220777); "Ficus benghalensis" (1373022388); "Fraxinus excelsior" (1377214339); "Geum urbanum" (1367046657); "Helleborus niger" (1342304803); "Juglans nigra" (1375771938); "Laurus nobilis" (1374863417); "Monarda didyma" (1333252509); "Panax ginseng" (1369794386); "Phaseolus vulgaris" (1372316115); "Populus tremuloides" (1369889820); "Prunus armeniaca" (1346731742); "Prunus spinosa" (1377031439); "Rhamphospermum nigrum" (1364255450); "Robinia pseudoacacia" (1377028869); "Sanicula marilandica" (1306460855); "Solanum dulcamara" (1379052094); "Solanum nigrum" (1369644209); "Streptocarpus ionanthus" (1315367187); "Vaccinium myrtillus" (1377480885).

Grieve, M. _A Modern Herbal_, the pages read at `https://www.botanical.com/botanical/mgmh/<page>` on 11 October 2026: "Acacia (false)" (a/acaci005.html); "Adder's Tongue (American)" (a/adder008.html); "Agrimony" (a/agrim015.html); "Alder, Common" (a/alder019.html); "Alkanets" (a/alkan024.html); "Allspice" (a/allsp025.html); "Almonds" (a/almon026.html); "Aloes" (a/aloes027.html); "Amaranths" (a/amara030.html); "Angelica" (a/anegl037.html); "Anise" (a/anise040.html); "Apple" (a/apple044.html); "Apricot" (a/apric050.html); "Arnica" (a/arnic058.html); "Ash" (a/ash--073.html); "Avens" (a/avens083.html); "Barberry, Common" (b/barcom12.html); "Basil, Sweet" (b/basswe18.html); "Bean, Kidney" (b/beakid21.html); "Bearberry" (b/bearbe22.html); "Beech" (b/beech-27.html); "Beetroots" (b/beetro28.html); "Bergamot" (b/bergam32.html); "Bilberry" (b/bilber37.html); "Bindweeds" (b/bindwe38.html); "Birch, Common" (b/bircom43.html); "Bistort" (b/bistor45.html); "Blackberry" (b/blaber49.html); "Cohosh, Black" (c/cohbla83.html); "Ginseng" (g/ginsen15.html); "Hellebore, Black" (h/helbla14.html); "Laurel (Bay)" (l/larbay10.html); "Lucerne" (l/lucern48.html); "Mustards" (m/mustar65.html); "Nightshade, Black" (n/nighbl04.html); "Nightshade, Deadly" (n/nighde05.html); "Nightshade, Woody" (n/nighwo06.html); "Orange, Bitter" (o/orabit11.html); "Orange, Sweet" (o/oraswe12.html); "Pepper" (p/pepper24.html); "Poplar, trembling" (p/poplar61.html); "Sanicle, Wood" (s/sanwoo14.html); "Thistles" (t/thistl11.html); "Unicorn Root, True" (u/unitru02.html).

### Sources, entry by entry

Which source supports which fields. A book is cited by the printed page of a PDF or the entry heading of an EPUB; Cunningham's _Magical Herbs_ also by p. 266, its key to the health codes printed beside each heading.

- **Adam and Eve Root.** Kynes under Orchid: formal name, folk names, elements, celestial body, signs, deities, powers, the toxicity caution, the toxic flag, the plant, orchid-root lore, the root and its uses. Wikipedia "Aplectrum": formal name (monotypic genus), putty root, range, the genus name, colonies, the leaf, the flowers, the pottery mucilage.
- **Adder's Tongue.** Cunningham under Adder's Tongue: formal name, folk names, element, celestial body, healing, the wound charm. Kynes under Adder's Tongue: formal name (yellow trout lily), folk names, element, celestial body, powers, the dogtooth name, the endangered caution, the aphrodisiac lore, the bulbs and the flowers for divination and lunar magic. Grieve under Adder's Tongue (American): formal name, folk names, lily family, the corm, the leaves and bulbs as parts used, the poultice, the bulbs as an emetic and colchicum substitute. Wikipedia "Erythronium americanum": formal name, common names, range, the plant, flowering, colonies, the leaf caution and contraceptive use.
- **African Violet.** Cunningham under African Violet and p. 266: element, celestial body, protection, purple-flowered plants for spirituality, the safe code G. Kynes under African Violet: element, celestial body, powers, the plant, the Baron and Hanover, the species-name meaning, the houseplant and its uses, dark blue or purple flowers on the altar. Wikipedia "Streptocarpus ionanthus": formal name, its synonym, section Saintpaulia, range in Tanzania, the subspecies, near-threatened status.
- **Agrimony.** Cunningham under Agrimony and p. 266: formal name, folk names, element, celestial body, powers, protection, banishing, reversal and hex-breaking, the sleep lore, the safe code G. Kynes under Agrimony: formal name, folk names, elements, celestial bodies, signs, powers, the plant, Anglo-Saxon, witch and Scottish lore, the dried leaves and the burrs. AHPA pp. 31–32, xxii: formal name, church steeples, part used (herb), safety class 1, interaction class A, tannins, pregnancy and nursing. Culpeper under Agrimony: Jupiter, Cancer. Grieve under Agrimony: formal name, folk names, part used, habitat, the plant, the names' origins, the dye, the sleep rhyme, Anglo-Saxon use, arquebusade water. Northcote p. 135: the Tyrolean posy for seeing witches. Wikipedia "Agrimonia eupatoria": formal name, common names, the plant, range and habitat, flowering, arquebusade water, the sleep lore.
- **Ague Root.** Cunningham under Ague Root and p. 266: formal name, folk names, power (protection), hex-breaking and uncrossing, uses around the home and in a sachet, the drug-interaction code and the oxytocin note. Kynes under Unicorn Root: formal name, element, celestial body, powers, folk names, the plant, Native American and pharmacopoeia history, the confusion with false unicorn root, the caution, the toxic flag, the root and the powdered root and its spell. AHPA pp. 36–37, xxii: formal name, folk names, part used (rhizome, root), safety class 1, the uterine study, lactation. Grieve under Unicorn Root, True: formal name, synonyms, part used, the bitter tonic. Wikipedia "Aletris farinosa": formal name, common names, range, habitat, the plant.
- **Alder.** Kynes under Alder: formal name, elements, celestial bodies, signs, deities, powers, folk names, the tree, European, Irish, Danish, Germanic, Austrian and English lore, the bark's love-potion lore, wood chips and charcoal. Culpeper under The Common Alder-Tree: celestial body (Venus), sign (Pisces, "I suppose"), the bark, the leaves and their uses. Grieve under Alder, Common: formal name, range and habitat, parts used (bark, leaves), timber under water, dyeing, tannin, the bark decoction, the heated leaves. Northcote p. 196: the folk name Aul, the Herefordshire trout rhyme. Wikipedia "Alnus glutinosa": formal name, common names, range, habitat, root nodules, the leaves and catkins, the bark in medicine, tanning and dyeing, timber, smoking fish.
- **Alfalfa.** Cunningham under Alfalfa and p. 266: element, celestial body, power (prosperity), folk names, the jar against poverty and hunger, money spells, the ashes, the "safe" code. AHPA p. 552, xxii: formal name, lucerne, part used (herb), safety class 1, the coumarin and anticoagulant note, the seed and sprout lupus studies and L-canavanine, pregnancy and nursing. Grieve under Lucerne: formal name, part used (herb in flower), the plant, its value as fodder. Wikipedia "Alfalfa": formal name, alfalfa and lucerne, the plant, its history and names, forage use, the safety section, seeds and sprouts.
- **Alkanet.** Cunningham under Alkanet and p. 266: formal name, element, powers, folk names, incense for purification and prosperity, the "not for internal use" code. Kynes under Alkanet: formal name, elements, celestial bodies, sign, powers, folk names, the plant, the name from henna, henna as a substitute, the pigment's history, Pliny, the medieval luck charm, hoodoo, the root, the powdered root and its spell, the root as a money charm. AHPA p. 39, xxii: formal name, part used (root), safety classes 2a, 2b and 2c, pyrrolizidine alkaloids, the trade label. Grieve under Alkanets: formal name, synonyms, part used, the red dye and its uses. Wikipedia "Alkanna tinctoria": formal name, common names, range, the root's colour, the dye, the wood stain, alkannin and E103.
- **Allspice.** Cunningham under Allspice and p. 266: formal name (as _P. dioica_), element, celestial body, powers, folk names, the incense and healing uses, the safe (G) code. Kynes under Allspice: formal name (as syn.), element, celestial body, signs, deities, powers, folk names, the tree, its name, Indigenous, Maya and Aztec use, the berry, oil and leaf forms, the luck and consecration uses. AHPA p. 656, xxii: formal name, folk names, part used (unripe fruit), safety class 1 and the dermatitis case. Grieve under Allspice: folk names, the family, the Jamaican supply, the oil and its uses, the spice-bush substitute. Wikipedia "Allspice": formal name, folk names, the tree and its range, the name, the harvest, jerk seasoning, the leaves.
- **Almond.** Cunningham under Almond: element, celestial body, deities, powers, folk name, the bitter-almond caution, the prosperity, business, drunkenness and treasure lore, the wood and wands. Kynes under Almond: formal name (as syn.), elements, celestial bodies, signs, deities, powers, the cyanide caution, the toxic flag, Greek wedding and Zeus lore, the nut, the oil on the third eye, the milk libation. AHPA pp. 702–703, xxii (under _Prunus armeniaca_): bitter almond's amygdalin and the class 3 cautions applied to it. Grieve under Almonds: Aaron's rod, the Hebrew name, Phyllis, drunkenness, the oil and its uses, apricot and peach kernels as substitutes. Wikipedia "Almond": formal name, the tree, flowers, fruit, domestication and origin, the Bible, toxicity, allergy and aflatoxin, the oils.
- **Aloe.** Cunningham under Aloe and p. 266: formal name, element, celestial body, powers, folk names, the fresh and dried codes, the protective uses. Kynes under Aloe: formal name, element, celestial bodies, signs, powers, folk name, the gel, the sap caution, its history, the leaf and gel uses. AHPA pp. 44–48, xxii: formal name, folk names, the latex (class 2b, 2c, 2d) and gel (class 1) and their cautions. Grieve under Aloes: formal name, part used (leaves), the drug aloes from the leaf juice, the pilgrimage and grave customs. Wikipedia "Aloe vera": formal name, folk name, the plant, its range, gel and latex, the name, the oral, allergy, interaction and carcinogen cautions.
- **Amaranth.** Cunningham under Amaranth: formal name, element, celestial body, deity, powers, folk names, burial and Aztec lore, the flower and healing, heartbreak and spirit uses. Kynes under Amaranth (heading rule; see below): element, celestial bodies, signs, deities, powers, the flowers and the seed use. Grieve under Amaranths: formal name, folk names, Ephesian Artemis, the name and immortality. Culpeper under Amaranthus: celestial body, folk name, the flowers and bleeding. Wikipedia "Amaranthus hypochondriacus": formal name, folk names, the plant, its range, food use, the seeds.
- **American Bittersweet.** Cunningham under Bittersweet: formal name, element, celestial body, powers, folk names, the Poison mark, the toxic flag, the pillow and protective-tying uses. Kynes under Bittersweet: formal name, folk name, element, celestial bodies, sign, deity, powers, the autumn berries, the toxicity caution, the toxic flag, Menominee, Ojibwe and Potawatomi winter food, the berries. Wikipedia "Celastrus scandens": formal name, the vine, its range and habitat, the fruit and its toxicity, the toxic flag, the root's uses, the name's history, Oriental bittersweet, the decorative use.
- **American Ginseng.** Cunningham under Ginseng, American: formal name, element, celestial body, powers, folk name, the root's uses. Kynes under Ginseng: formal name, folk name, element, celestial body, powers, the pregnancy and endangered cautions, Native American love charms, the root. AHPA p. 625 and p. xxii: formal name, Chinese name, part used (root), safety class 1, warfarin, allergy, blood sugar, pregnancy and nursing, effects of improper use. Grieve under Ginseng: folk names, part used. Wikipedia "American ginseng": formal name, the plant, range, flowering and fruit, Lafitau and the Haudenosaunee name, the China trade, conservation, cultivation, folk names.
- **Angelica.** Cunningham under Angelica and p. 266: formal name, element, celestial body, deity, powers, folk names, the pregnancy and sunlight codes, the incense, house and bath uses, the leaves' visions. Kynes under Angelica: formal name, folk names, element, celestial body, signs, deity, powers, Anglo-Saxon, elf-shot, Cherokee and Delaware lore, the root and its burning. AHPA pp. 69–70 and p. xxii: formal name, folk names, part used (root), safety class 2b, emmenagogue, lactation, furanocoumarins and sunlight. Culpeper under Angelica: the Sun in Leo. Grieve under Angelica: formal name, folk names, parts used, the Archangel and Holy Ghost lore, the leaves in hop bitters and as a tonic, American angelica as a substitute. Northcote pp. 48–50: Lapland poets, roots against witchcraft. Wikipedia "Angelica archangelica": formal name, folk names, the plant, range, cultivation, Sámi use, liqueurs, gin, candied stems, poisonous look-alikes.
- **Anise.** Cunningham under Anise and p. 266: formal name, element, celestial body, powers, folk names, the pregnancy code, the pillow, incense, bath and leaf uses. Kynes under Anise: formal name, folk names, element, celestial bodies, signs, deities, powers, Theophrastus, Roman pillow sprig, taxes, the evil eye, the seed and the oil and its use. AHPA pp. 657–658 and p. xxii: formal name, part used (fruit, "seed"), safety class 1, allergic reactions, pregnancy (ESCOP), lactation, estragole in the oil. Grieve under Anise: formal name, part used, Dioscorides and Pliny, taxes, the Roman spiced cake, the evil eye, the leaves in cooking, star anise as a substitute. Northcote p. 9: a spice in Virgil's time, native of Egypt. Wikipedia "Anise": formal name, folk names, the plant, range, cultivation, flavour, liqueurs, the essential oil.
- **Apple.** Cunningham under Apple: element, celestial body, deities, powers, folk names, the seed code, the toxic flag, Samhain, the Silver Bough, the love, divination and healing spells, the blossom and the wood. Kynes under Apple: formal name, elements, celestial bodies, signs, deities, powers, folk names, the seed caution, Celtic lore and Avalon, the otherworld, the fruit's colours in spells, flower colour, the wood burned for abundance. Grieve under Apple: part used (fruit), the Swiss lake dwellings, wassailing with cider, Iduna. Wikipedia "Apple": formal name, folk names, the tree, its origin and spread, the blossom and fruit, Iðunn, Avalon's name, the seed and allergy cautions.
- **Apricot.** Cunningham under Apricot and p. 266: formal name, element, celestial body, deity, power, folk names, the seed code, the fruit, juice, flowers and stones in love magic. Kynes under Apricot: formal name, element, celestial bodies, sign, deities, powers, folk names, the kernel caution, the toxic flag, prophecy and Hera's golden apples, flower colour, the handfasting use, the fruit and kernel oil. AHPA pp. 702–704, xxii: formal name, folk name, part used (seed), safety class 3 and the kernel's cautions, the toxic flag, the oil free of cyanogenic glycosides. Grieve under Apricot: formal name, folk name, parts used (kernels, oil), the Armenian name and Chinese origin, Henry VIII, Eau de Noyaux, the oils and their uses. Wikipedia "Prunus armeniaca": formal name, folk name, the tree, flowers and fruit and their colours, origin, drying and trade, Chinese learning and medicine, the oil in 17th-century England.
- **Arnica.** Kynes under Arnica: formal name, element, celestial body, deity, powers, folk names, the caution, German Midsummer lore, Hildegard, the leopard's-bane mix-up, the flowers, seeds and oil and their spells. AHPA pp. 87–88, xxii: formal name, folk names, parts used (flower, rhizome), safety class 3 (internal) and 2d (external) and their cautions, the toxic flag. Grieve under Arnica: formal name, folk names, parts used (root, flowers), the rosette and flowers, the tincture for sprains, the root and the pharmacopoeias. Wikipedia "Arnica montana": formal name, folk names, the plant, its range, habitat and decline, flower colour, the roots, the toxicity, the toxic flag.
- **Ash.** Cunningham under Ash and p. 266: formal name, element, celestial body, deities, powers, folk names, the bark code, Yggdrasil, the solar cross, staff, wands, Yule fire and snake lore, the leaves' and bark's uses. Kynes under Ash: formal name, elements, celestial bodies, signs, deities, powers, folk names, Yggdrasil, the faery triad, lucky leaves, the twig, the keys. Culpeper under Ash Tree: celestial body (Sun). Grieve under Ash: formal name, folk name, parts used (leaves, bark), the keys, the timber, the wart and rupture superstitions, the bark and leaf uses, pickled keys. Wikipedia "Fraxinus excelsior": formal name, folk names, the tree, its range, timber and hurleys, Yggdrasil, the bark and leaves in herbal medicine, the Isle of Bute dream lore.
- **Asian Ginseng.** Kynes under Ginseng: formal name, folk name, element, celestial body, powers, the pregnancy and breastfeeding caution, history and lore, the root and the powdered root with its wishing spell. AHPA pp. 619–620, xxii: formal name, folk names, part used (root), safety class 1 and interaction class A, the stimulant, caffeine, warfarin, blood-sugar, allergy and high-dose cautions, the disagreement over pregnancy, nursing. Wikipedia "Panax ginseng": formal name, common names, the plant, its range, protection and cultivation, harvest age, the name's meaning, Jartoux, the pregnancy, breastfeeding and children cautions.
- **Aspen.** Cunningham under Aspen and p. 266: formal name, folk name, celestial body, element, the safe code, anti-theft and eloquence uses, the leaf. Kynes under Aspen: formal name, folk names, elements, celestial bodies, signs, deities, powers, European and Irish lore, salicin, the leaf and its spells. Grieve under Poplar, Trembling: formal name, synonyms, part used (bark), its taste, gathering and use against fevers. Wikipedia "Populus tremuloides": formal name, common names, the tree, its range, the trembling leaves, clonal groves and Pando, the bark as a quinine substitute.
- **Aster.** Cunningham under Aster and p. 266: formal name, folk names, celestial body, element, deity, power, the safe code, the Greek temple altars, love uses, the bloom. Kynes under Aster: formal name, folk names, element, celestial body, signs, deity, powers, Greek, French and German lore, the dried flowers. Wikipedia "Callistephus": formal name, common names, the plant, its range and cultivation history, the flower head and its wild colour.
- **Avens.** Cunningham under Avens and p. 266: formal name, folk names, celestial body, element, powers, the X code, exorcism, purification, amulet and love uses. Kynes under Avens: formal name, folk names, element, celestial body, sign, powers, medieval and American lore, the root, the flower and the seed heads with their spells. Grieve under Avens: formal name, synonyms, parts used (root), herba benedicta, the Trinity carvings, the March digging, linen and moths. Culpeper under Avens: Jupiter, Colewort and Herb Bonet. Wikipedia "Geum urbanum": formal name, common names, the plant, its range, eugenol, soups and ale, the burrs, the name, the Trinity and Five Wounds, the amulet lore, Jupiter.
- **Avocado.** Cunningham under Avocado and p. 266: element, celestial body, powers, folk names, the X code for leaves, branches and seeds, the Aztec 'testicle' name, eating the fruit, growing and carrying the pit, wands of the wood. Kynes under Avocado: formal name, element, celestial body, sign, powers, folk names, the tree, Mesoamerican tribute, the Aztec name, virility and Dampier, the fruit and the oil, the green-candle healing spell. Wikipedia "Avocado": formal name, folk names, the tree, its range and early use, fruit, flowers, the etymology, allergy and toxicity to animals, the toxic flag, the oil's uses.
- **Bamboo.** Cunningham under Bamboo and p. 266: formal name, powers, folk names, the G code, temple divination, wish and protection carvings, luck at the house and door, hex-breaking with the powdered wood, charm against evil spirits, the flute. Kynes under Bamboo: formal name, element, celestial body, deities, powers, folk name, sacredness in Asia, the Oracle of Kuan Yin, burning against evil spirits, the box for divination tools, the stick. Wikipedia "Bambusa vulgaris": formal name, folk name, the plant, range, culms, flowering, uses, edible shoots, taxiphyllin, the toxic flag, horses, the abortifacient use.
- **Banyan.** Cunningham under Banyan and p. 266: formal name, element, celestial body, folk names, the G code, Hindu temples, Maui, luck from sitting beneath and marriage under it. Wikipedia "Ficus benghalensis": formal name, folk names, the tree, strangler habit, aerial roots, size and Thimmamma Marrimanu, birds, national tree, sacredness, Kassapa Buddha, Adhinath.
- **Barberry.** Kynes under Barberry and Oregon Grape: formal name, element, celestial bodies, signs, powers, folk names, the shrub, the caution, the toxic flag, ancient medicine, medieval and English lore, the French law, the root talisman, the berries for clarity. AHPA pp. 130–131, xxii: formal name, folk name, part used (root, root bark), safety class 2b and its cautions, berberine in the root bark. Grieve under Barberry, Common: formal name, folk names, the wheat-rust belief, the fruit's uses, yellow dyes, Holy Thorn, the bark. Culpeper under Barberry: celestial body (Mars), the purge for choler, the inner rind in wine. Wikipedia "Berberis vulgaris": formal name, folk names, the shrub, range, wheat stem rust, jam and zereshk.
- **Barley.** Cunningham under Barley and p. 266: element, celestial body, powers, folk name, the sprouted-seed pregnancy code, love-spell and anti-evil uses, the straw toothache charm, barley water in love spells. Kynes under Grain: formal name, element, celestial body, sign, deities, powers, folk name, Palestine amulet and love divination, cereal straw lore, the grain as seed. Culpeper under Barley: Saturn; barley water for fevers. AHPA pp. 445–446, xxii: formal name, folk name (yava), part used (sprouted seed), safety class 1, allergy, occupational asthma, blood sugar, lactation. Wikipedia "Barley": formal name, the plant, domestication and spread, uses, kykeon and Demeter, John Barleycorn, Sanskrit name, gluten, barley water.
- **Basil.** Cunningham under Basil and p. 266: formal name, element, celestial body, deities, powers, folk names, the P N X codes, love, wealth, protection and purification uses, the powder fidelity charm. Kynes under Basil: formal name, element, celestial bodies, signs, deities, powers, folk names, medieval and Tudor lore, leaves, seeds and oil. Culpeper under Garden Bazil, or Sweet Bazil: Mars and Scorpio. Northcote pp. 11–13: Isabella and the basil pot, the scorpion belief, Bacia-Nicola, Parkinson on the powdered seed. Grieve under Basil, Sweet: folk names, clove scent, the name from "king", Krishna and Vishnu. AHPA pp. 599–600, xxii: formal name, folk name, part used (leaf), safety class 2b and its cautions, the oil's estragole and rat toxicity. Kynes, Herbal Remedies pp. 206–207: formal name, folk names, part used, pregnancy and nursing caution. Wikipedia "Basil": formal name, great basil, the plant, range, name, Orthodox holy water, the oil's insecticidal and antimicrobial findings.
- **Bay Laurel.** Cunningham under Bay and p. 266: formal name, element, celestial body, deities, powers, folk names, the G code, prophecy, protection, purification, lightning, poltergeist and wish uses. Kynes under Bay: formal name, elements, celestial body, signs, deities, powers, folk names, leaves and berries, the essential oil. Culpeper under The Bay Tree: Sun and Leo, resisting witchcraft and lightning. Northcote pp. 141–144: formal name, weddings and funerals with rosemary, the death omen, lightning, Roman dispatches. Grieve under Laurel (Bay): formal name, folk names, the cherry-laurel confusion, the volatile oil, Oil of Bays, bay-rum oil. AHPA pp. 502–503, xxii: formal name, folk names, part used (leaf), safety class 1, contact dermatitis, the oil's cineole and LD50. Kynes, Herbal Remedies pp. 207–208: formal name, folk names, part used, pregnancy, nursing and medication cautions. Wikipedia "Laurus nobilis": formal name, folk names, the plant, Daphne and Apollo, the Pythian Games and the Pythia, Roman victory.
- **Be-Still.** Cunningham under Be-Still: the plant it names (as _Thevetia peruviana_, _T. nereifolia_), poison, the toxic flag, folk names, the lucky-bean seeds. Wikipedia "Cascabela thevetia": formal name and its synonyms, the plant, range, etymology, cultivation, folk names, toxicity, the toxic flag.
- **Bean.** Cunningham under Bean: element, celestial body, deities, powers, folk name, the caution on non-food beans, harvest-goddess, Cardea and funeral lore, the amulet, rattle, wart and love-circle uses, the dried bean. Kynes under Bean: formal name (the French/common bean line), elements, celestial bodies, signs, deities, powers, folk names, the truth meditation, fresh or dried beans. Culpeper under French Beans: celestial body (Venus), folk names, the climbing habit. Grieve under Bean, Kidney: formal name (as _Phaceolus vulgaris_), folk name, part used (dried ripe seeds), the Italian death-anniversary custom. Wikipedia "Phaseolus vulgaris": formal name, folk name, the plant, its domestication and range, the Three Sisters, the Columbian exchange, favomancy, the phytohaemagglutinin caution.
- **Bearberry.** Cunningham under Uva Ursa and p. 266: formal name, powers, folk names, ceremonial and psychic-sachet uses, the Poison and P, K, Lt, Dg, Gi, Au codes, the toxic flag. Kynes under Uva Ursi: formal name, element, celestial bodies, sign, powers, folk names, the plant, the caution, the toxic flag, Galen and Myddfai, Icelandic, kinnikinnik and hoodoo lore, the leaves and berries. AHPA pp. 79–80, xxii: formal name, folk names, part used (leaf), tannins, safety class 1 and its notes. Grieve under Bearberry: formal name, part used (leaves), range, the name, arbutin and tannin, Myddfai, urinary use, tanning, the berries. Wikipedia "Arctostaphylos uva-ursi": formal name, folk names, the plant, its range, the name, kinnikinnick smoking mixtures, the berries.
- **Bee Balm.** Kynes under Bee Balm: formal name, element, celestial bodies, signs, powers, folk names, the plant, Indigenous medicine, Oswego tea and Boston Harbor, the English flower and leaf lore, the leaf, flower and oil forms and their uses, the red flowers. AHPA pp. 572–573, xxii (_Monarda_ spp., _M. didyma_ named): formal name, folk names, part used (herb), safety class 2b and its notes. Grieve under Bergamot: formal name, folk names, the flowers, scent, Oswego tea from the young leaves, bees, the thymol-like oil. Wikipedia "Monarda didyma": formal name, folk names, the plant, habitat and range, Monardes, hummingbirds, Blackfoot poultices, the leaf tea, the red flower heads.
- **Beech.** Cunningham under Beech and p. 266: formal name, celestial body, folk names, the wish stick, wood and leaves for creativity, the nut code (X). Kynes under Beech: formal name, elements, celestial bodies, signs, deities, powers, folk names, the tree, Greek, Roman, Norse and continental lore, the leaf, nut, twig and oil uses. Culpeper under The Beech Tree: celestial body (Saturn), the leaves. Grieve under Beech: formal name, folk names, part used (the nut oil), the name and runic tablets, mast as fodder and famine food, the oil, the wood's uses. Wikipedia "Fagus sylvatica": formal name, folk names, the tree, range, marcescence, the nuts and their toxicity, the toxic flag, flour, the oil, the timber.
- **Beet.** Cunningham under Beet and p. 266: formal name, element, celestial body, power, folk names, love and juice uses, the leaf caution. Culpeper under Beets: Saturn for the red beet, the two sorts, the red root. Grieve "Beetroots": formal name, the offering to Apollo at Delphi, parts used (root, leaves), leaves used as spinach and with sorrel. Wikipedia "Beta vulgaris": formal name, the plant and its crops, the sea beet and its range, root colours, Mesopotamia, Rome, Rosh Hashana, leaves as a pot herb, the oxalate caution.
- **Belladonna.** Cunningham under Belladonna and "How to Read the Entries": element, celestial body, deities, folk names, the priests of Bellona, best avoided, the Poison mark, the toxic flag. Kynes under Nightshade: elements, celestial bodies, signs, deities, powers, folk names, Roman poison, flying ointment, working with a picture, Hecate offering, the skin caution. AHPA pp. 112–113, xxii: folk name, part used (leaf), safety class 3, overdose symptoms, the toxic flag, berries and children, atropine and the placenta. Grieve "Nightshade, Deadly": folk names, parts used (root, leaves), chalk and limestone, the berries, dwale, the Scots' truce, the Devil and Walpurgis, Bellona, Atropos, the root's toxicity and its 1860 liniment, the toxic flag, handling with cuts, cats and dogs. Wikipedia "Atropa bella-donna": formal name, the plant and range, alkaloids, names, Livia, the Scots, flying ointment, gloves, the Bukovina root rite, the root's alkaloid content, the toxic flag.
- **Bergamot Orange.** Kynes under Bergamot: formal name, element, celestial bodies, powers, the tree and fruit, the hybrid, French perfumery and Earl Grey, the fruit and the oil and their uses. AHPA pp. 234–235, xxii: formal name, part used (peel), safety class 1, photosensitising, bergapten, the oil's photodermatitis and contact dermatitis, the Earl Grey case. Wikipedia "Bergamot orange": formal name, the fruit and its colours, the hybrid, the unrelated mint bergamots, where it is grown, the oil, Earl Grey and eau de Cologne, the peel boxes, skin cautions.
- **Bilberry.** Cunningham under Huckleberry: formal name, element, celestial body, powers, folk names, the leaves' luck, protection and dream uses. Kynes under Bilberry: formal name, elements, celestial body, signs, deity, powers, folk names, the plant, Anglo-Saxon, Irish and Lughnasadh lore, moorland tea, the berries and leaves, dream and altar uses. Culpeper under Bilberries: Jupiter, folk names, the staining juice. Grieve "Bilberry": formal name, folk names, parts used, berry colour, autumn leaves, the dye trade in the First World War. AHPA pp. 903, 906–907, xxii: formal name, family, folk names, fruit class 1 and its notes, leaf class 2d and its notes. Wikipedia "Vaccinium myrtillus": formal name, folk names, the shrub, range and habitat, the fruit and its colour, dye use, the leaf caution.
- **Bindweed.** Kynes under Bindweed: formal name, elements, celestial bodies, signs, powers, folk names, the toxicity caution, the toxic flag, English and Scottish lore, the stem and the flower. Wikipedia "Convolvulus arvensis": formal name, the plant, its range, its spread as a weed, folk names, the alkaloids and animal toxicity, the toxic flag, the leaves' folk use, the Grimm tale. Grieve under Bindweeds: the British native bindweeds, the family's purgative action.
- **Birch.** Cunningham under Birch and p. 266: formal name (first of four binomials), element, celestial body, deity, powers, folk names, the safe code, exorcism, lightning, evil eye, the broom and cradle uses of the twigs and wood. Kynes under Birch: formal name, element, celestial bodies, signs, deities, powers, folk names, the white bark, European and Siberian lore, the bark love charm. AHPA pp. 134–135, xxii: formal name, folk names, part used (bark, leaf), safety class 1, interaction class A, diuretic. Culpeper under The Birch Tree: Venus, the young leaves' juice, the tapped water. Grieve under Birch, Common: folk names, Coleridge's Lady of the Woods, parts used, birch tar oil, birch wine, birch tea. Wikipedia "Betula pendula": formal name, folk names, the tree, its range, Finland and the sauna, bark, sap and wood uses.
- **Bistort.** Cunningham under Bistort: element, celestial body, powers, folk names, conception, psychic and divination incense, poltergeists, money and wealth. Kynes under Bistort: formal name, element, celestial body, signs, powers, folk names, the abortifacient caution, English, French, Irish and Scottish lore, the root, leaves and flowers. AHPA p. 695, xxii: folk name, part used (rhizome), safety class 1, interaction class A, tannins, side effects. Culpeper under Bistort, or Snakeweed: Saturn, folk names, the root's colour. Grieve under Bistort: folk names, part used, the name, the root's colour, tannin and starch, famine food, the leaves as a vegetable. Wikipedia "Bistorta officinalis": formal name, folk names, the plant, its range, the etymology, the vegetable and dock pudding.
- **Bitter Orange.** Kynes under Orange: formal name, folk names, the sour flesh and aromatic peel (bitter-orange lines only). AHPA pp. 220–221, 223, xxii–xxiii: formal name, folk names, part used (fruit), safety class 1 and interaction class C for the fruit, CYP3A4 interactions, pregnancy and nursing, class 2d for the synephrine extract, the peel report. Grieve under Orange, Bitter and under Orange, Sweet: folk names, the name's origin, the tree, flowers and fruit, neroli and orange flower water, candied blossoms, the peel tonic, oil of bigarade. Wikipedia "Bitter orange": formal name, folk names, the hybrid, its spread, culinary uses, peel, flower and oil uses, rootstock and wood, the supplement and drug-interaction cautions.
- **Bittersweet Nightshade.** Cunningham under Bittersweet: formal name, element, celestial body, powers, folk names, the pillow and protective-tying uses. Kynes under Bittersweet: formal name, folk names, element, celestial bodies, sign, deity, powers, the flowers and berries, the toxicity caution, the toxic flag, British and Irish livestock charms, the berries' release and Samhain spells. Culpeper under Amara Dulcis: celestial body, folk names, removing witchcraft, berries on felons. Grieve "Nightshade, Woody": formal name, folk names, part used (twigs), hedgerows, the name Amaradulcis, Theophrastus, the British Pharmacopoeia to 1907, the felon gloss. Wikipedia "Solanum dulcamara": formal name, folk names, the vine, its range and habitat, the stems, the whole-plant and berry toxicity, the toxic flag, the evil-eye charm.
- **Black Cohosh.** Cunningham under Cohosh, Black and p. 266: powers, folk names, love-sachet, courage and evil-banishing infusion uses, the pregnancy and nursing codes. Kynes under Black Cohosh: formal name, folk names, element, celestial bodies, sign, powers, the root, the pregnancy caution, Native American medicine, the name cohosh, hoodoo, the rattling seed heads, the root amulet and the seed circle. AHPA pp. 16–17, xxii: formal name, other names, part used (rhizome), safety class 2b, interaction class A, the liver-toxicity reports, the toxic flag, stomach upset and rashes. Grieve "Cohosh, Black": folk names, part used (root), the rhizome, the rattlesnake-bite belief. Wikipedia "Actaea racemosa": formal name, folk names, the plant, its range, the smell and the name bugbane, the Pharmacopoeia, menopausal use, the fruit and seeds.
- **Black Hellebore.** Cunningham under Hellebore, Black: formal name, element, celestial body, folk names, the Poison mark, the toxic flag, invisibility powder, exorcism. Kynes under Hellebore: formal name, folk names, element, celestial bodies, signs, deities, powers, the leaves and flowers, black for the roots, the toxicity caution, the toxic flag, medieval strewing, exorcism, unlucky flowers, the protected house, the French invisibility powder, witches' hexes and flight. Culpeper under Black Hellebore: celestial body, folk names. Grieve "Hellebore, Black": formal name, folk names, part used (rhizome, root), Melampus and Melampode, blessing cattle, the French romance, the sneezing powder, the irritant root. Wikipedia "Helleborus niger": formal name, the plant, its range, the name niger, the Christmas legend, medieval lore, Melampus, the toxicity of all parts and of protoanemonin, the toxic flag.
- **Black Locust.** Kynes under Locust: formal name, folk names, element, sign, deities, powers, the flowers and paired spines, the poison caution, the toxic flag, Salem and witches' brooms, the seedpod rattles and the protective thorns. Grieve "Acacia (false)": folk name, the timber and its uses. Wikipedia "Robinia pseudoacacia": formal name, folk name, the tree, its native and introduced range, flowers, acacia honey, Jamestown, Jean Robin, the wood and firewood, the toxicity and the horse symptoms, the toxic flag, sawdust dermatitis, the pods and spines.
- **Black Mustard.** Cunningham under Mustard, Black and p. 266: element, celestial body, powers, the sachet, doorstep and fertility uses, the Lt code. Kynes under Mustard: element, celestial body, sign, deity, powers, the weed caution, Sumerian and Sanskrit texts, brownies, the threshold lore, the seed and seed oil, the seed's colour. AHPA pp. 145–147, xxii: part used (seed), safety class 1 internal and 2d external and their cautions. Culpeper under Mustard: Mars and Aries. Grieve "Mustards" (Mustard, Black): the seed and its colour, Aesculapius, the name, the volatile and bland oils. Wikipedia "Rhamphospermum nigrum": formal name, the plant, its range and spread, its tribe, Columella, the name, the parable, the seed's colour.
- **Black Nightshade.** Kynes under Nightshade: formal name, folk names, element, celestial bodies, signs, deities, powers, the plant, the toxicity caution, the toxic flag, Anglo-Saxon and cradle lore, symbolic work, the offering to Hecate, the black berries. Culpeper under Nightshade: common nightshade, where it grows, Saturn, the warning about deadly nightshade. Grieve "Nightshade, Black": formal name, folk names, the whole herb and fresh leaves as parts used, petty morel, Bohemian cradles, the leaves on burns and ulcers, the berry's colour. Wikipedia "Solanum nigrum": formal name, folk names, family, range, the plant, prehistory, Dioscorides, confusion with belladonna, toxicity, the toxic flag, food uses, the weed.
- **Black Pepper.** Cunningham under Pepper and p. 266: formal name, element, celestial body, powers, the amulet, envy and salt uses, the G code. Kynes under Pepper: formal name, folk names, element, celestial body, sign, powers, Roman and medieval lore, the oil and peppercorns and their spells. AHPA pp. 671–672, xxii: formal name, part used (fruit), safety class 1, interaction class B and the cautions. Grieve "Pepper": formal name, Piper, the dried unripe fruit, the volatile oil. Wikipedia "Black pepper": formal name, peppercorn, the vine, its range, processing, white pepper, Indian and Egyptian history, peppercorn rent, the essential oil.
- **Black Snakeroot.** Cunningham under Snakeroot, Black: formal name, element, celestial body, powers, the love, bath and money uses. Wikipedia "Sanicula marilandica": formal name, Maryland sanicle and Maryland black snakeroot, range, status, leaves, flowers, fruit. Grieve "Sanicle, Wood": the root of _S. marilandica_ (part used), its resin and oil, the fever and chorea uses.
- **Black Walnut.** Kynes under Walnut: formal name, folk names, the yellow-green husk, the nuts. AHPA pp. 485–486, xxii: formal name, parts used (hull, leaf), safety class 2d, not long-term, the leaf's tannins, hull staining and juglone irritation, the picker's dermatitis, pregnancy, horses. Wikipedia "Juglans nigra": formal name, folk names, the tree, its range and arrival in Europe, the fruit, wood, dye, juglone and the allelopathy doubt, the nut as food, horses.
- **Blackberry.** Cunningham under Blackberry and p. 266: element, celestial body, powers, folk names, Pagan and Lughnasadh lore, the healing arch, leaves and berries in wealth spells, the scald charm, code G. Kynes under Blackberry: element, celestial bodies, signs, deities, powers, folk names, the plant, canes and graves, the Guernsey wreath, Brittany, the berries and leaves, the protective wreath, juice on candles. Culpeper under The Bramble, or Black-Berry Bush: Venus in Aries, the leaf hair-lye, the root for stone. Grieve "Blackberry": folk names, the name, the hernia loop, the leaves for scalds and as tea and hair dye, the root and root bark, the 1696 cordial. AHPA pp. 754–755, xxii: folk name, the leaf, safety class 1, tannins, blood sugar, nursing. Northcote p. 198: Markham's bramble cure for cattle. Wikipedia "Blackberry": formal name, the plant, range, fruit, the bog body, Michaelmas and crown-of-thorns lore, culinary uses.
- **Blackthorn.** Cunningham under Sloe and p. 266: formal name, element, celestial body, powers, folk names, warding and banishing uses, divining and wishing rods, codes Lt and X. Kynes under Blackthorn: formal name, elements, celestial bodies, signs, deities, powers, folk names, the plant, the cyanide caution, European lore, the Irish walking stick, sloes and thorns in spells. Culpeper under The Black Thorn, or Sloe-Bush: folk name, the berries and the distilled flower water. AHPA pp. 708–709, xxii: formal name, folk name, parts used (flower, fruit), safety class 1, cyanogenic glycosides, diuretic, pregnancy. Wikipedia "Prunus spinosa": formal name, folk name, the plant, range, etymology, hedges, blackthorn winter, Imbolc, the seed's cyanide, the fruit's uses, Ötzi, the wood and shillelagh.
- **Blessed Thistle.** Cunningham under Thistle, Holy and p. 266: formal name, element, celestial body, powers, folk name, protection, purifying baths and hex-breaking uses, code P. Kynes under Thistle: folk name, red stems and bracts, Aries and Pan (both marked "blessed"). Culpeper under Carduus Benedictus: folk names, Mars and Aries. AHPA p. 240, xxii: formal name (as synonym), folk name, part used (herb), safety class 1, daisy-family allergy, high-dose vomiting, pregnancy and nursing. Grieve "Thistles" (Thistle, Holy): folk name, part used, the heal-all name, plague treatises, Much Ado, the plant, tonic and fever use, nursing mothers, the substitutes. Northcote pp. 96–97: the plague, Much Ado, the bitter tonic, its discredited virtues. Wikipedia "Centaurea benedicta": formal name, folk names, the plant, range, Much Ado, galactagogue use and its lack of evidence, flavouring, allergy and large-dose cautions.

### What is left out, and why

**Rows not in this part.** Bloodroot, Blue Flag, Blueberry, Bodhi Tree, Bog Myrtle, Boneset, Borage, Box, Bracken, Broom, Bryony, Buchu, Buckthorn, Buckwheat, Burdock, Burnet Saxifrage, Buttercup, Butterwort, Cabbage, Cactus, Calamus, Camellia, Campion, Caper, Caraway, Cardamom, Carnation, Carob, Carrot, Cascara Sagrada, Cashew, Cassia, Castor, Catnip, Cattail, Celery, Centaury, Cherry, Chervil, Chestnut, Chickweed, Chicory, Chilli Pepper, Chinaberry, Chives, Chrysanthemum, Cinchona, Cinquefoil, Citron, Cleavers, Clove, Clover, Club Moss: not yet researched; they follow in part 2. No row of the shard has been left out.

**Values left out, entry by entry.** Values a source gives that the literal does not hold, each with its reason: powers with no category of that word, deities not on the curated list or spelt otherwise, colours not on the list or not the ingredient's own, forms with nothing of their own, named sorts that are "to be its own entry" (the owner's rule: a variant is only a physical form), weak lines and name notes.

### Adam and Eve Root to Agrimony

#### Adam and Eve Root

(a) - **Adam and Eve Root.** Kynes under Orchid: formal name, folk names, elements, celestial body, signs, deities, powers, the toxicity caution, the toxic flag, the plant, orchid-root lore, the root and its uses. Wikipedia "Aplectrum": formal name (monotypic genus), putty root, range, the genus name, colonies, the leaf, the flowers, the pottery mucilage.

(c) Left out:

- **Cunningham under Adam and Eve Roots** heads its entry "(Orchis spp.) Poison", another genus, so none of it (Venus, water, love, happiness, the Poison mark) is applied to _Aplectrum hyemale_. The candidate list also calls this row single-source (Kynes).
- Powers with no category of that word: luck. Magical entities: satyrs (not a deity).
- Folk name "Adam and Eve" (Wikipedia, Kynes) is the label itself, so not repeated.
- Forms: powdered root (Kynes "whole or powdered roots") has nothing of its own; flower essence has no curated form.
- No AHPA monograph, no Grieve or Culpeper entry found for _Aplectrum_.

#### Adder's Tongue

(a) - **Adder's Tongue.** Cunningham under Adder's Tongue: formal name, folk names, element, celestial body, healing, the wound charm. Kynes under Adder's Tongue: formal name (yellow trout lily), folk names, element, celestial body, powers, the dogtooth name, the endangered caution, the aphrodisiac lore, the bulbs and the flowers for divination and lunar magic. Grieve under Adder's Tongue (American): formal name, folk names, lily family, the corm, the leaves and bulbs as parts used, the poultice, the bulbs as an emetic and colchicum substitute. Wikipedia "Erythronium americanum": formal name, common names, range, the plant, flowering, colonies, the leaf caution and contraceptive use.

(c) Left out:

- **Culpeper under Adder's Tongue or Serpent's Tongue** describes the one-leaved fern of English meadows, not this plant; not cited.
- Powers with no category of that word: emotions, sex/sexuality, spirituality.
- Grieve's infusion for dropsy, hiccough and vomiting: Grieve does not say which part, so it is on no form.
- Substitutes: Grieve says the bulbs were used as a substitute _for_ colchicum, which is the reverse direction, so no substitute is written.
- Safety: no AHPA monograph. Wikipedia's leaf caution sits on the Leaf form. Grieve's "emetic" is given as Grieve's description on the Bulb form rather than as a safety note, since the brief keeps safety notes to safety sources; lead may move it.
- No colours: the yellow flower is the plant's colour, not a correspondence.

#### African Violet

(a) - **African Violet.** Cunningham under African Violet and p. 266: element, celestial body, protection, purple-flowered plants for spirituality, the safe code G. Kynes under African Violet: element, celestial body, powers, the plant, the Baron and Hanover, the species-name meaning, the houseplant and its uses, dark blue or purple flowers on the altar. Wikipedia "Streptocarpus ionanthus": formal name, its synonym, section Saintpaulia, range in Tanzania, the subspecies, near-threatened status.

(c) Left out / to decide:

- Powers with no category of that word: spirituality (both books), balance, consecrate/bless, family and home, growth.
- Forms: Kynes's flower essence has no curated form. Primary form is `Whole` (Kynes's "houseplant"; Cunningham's plants grown at home).
- No folk names: no source gives another name for this plant beyond the label.
- No AHPA monograph; the safety note rests on Cunningham's code G alone.

#### Agrimony

(a) - **Agrimony.** Cunningham under Agrimony and p. 266: formal name, folk names, element, celestial body, powers, protection, banishing, reversal and hex-breaking, the sleep lore, the safe code G. Kynes under Agrimony: formal name, folk names, elements, celestial bodies, signs, powers, the plant, Anglo-Saxon, witch and Scottish lore, the dried leaves and the burrs. AHPA pp. 31–32, xxii: formal name, church steeples, part used (herb), safety class 1, interaction class A, tannins, pregnancy and nursing. Culpeper under Agrimony: Jupiter, Cancer. Grieve under Agrimony: formal name, folk names, part used, habitat, the plant, the names' origins, the dye, the sleep rhyme, Anglo-Saxon use, arquebusade water. Northcote p. 135: the Tyrolean posy for seeing witches. Wikipedia "Agrimonia eupatoria": formal name, common names, the plant, range and habitat, flowering, arquebusade water, the sleep lore.

(c) Left out / to decide:

- **Categories from Cunningham's magical-uses text:** Hex-Breaking from "breaks hexes" and Reversal from "reverse spells sent against the magician"; Banishing from "banish". Kynes's "To send a hex back" (Leaf) is not the word "reverse", so the Leaf form carries no category.
- Powers with no category of that word: Kynes's family and home, hexes, negativity, spirit guides/spirits, balance. Magical entities: elves, faeries (not deities).
- Folk names kept though other plants carry them, since Kynes gives them for this plant: Golden Rod, Liverwort. Not kept: Grieve's spelling "Cockeburr" (Cocklebur is kept) and the Middle English "Egrimoyne".
- Wikipedia's language-of-flowers meaning (thankfulness), its moth and ecology lines, and its 3–21% tannin figure (AHPA's 4–10% is used): not used. Wikipedia's sleep-lore line is tagged "better source needed"; the same lore stands on Cunningham and Grieve.
- Culpeper's medicinal uses (liver, gout, agues) and Grieve's medicinal uses: not magical, not used beyond Grieve's history.
- Forms: Kynes's flower essence has no curated form. The burrs are written as `Seed` (Kynes: "Seed capsules form burrs", and she sells the seeds); `Pod` was considered and rejected since Wikipedia gives the fruit as an achene, not a pod.
- Water Agrimony and Hemp Agrimony (Grieve, Culpeper) are other plants, not variants; not to be its own entry from this batch (not on this row).

### Ague Root to Alkanet

#### Ague Root (Aletris farinosa) — 07:18 to 07:22

- **Name.** The list's _Aletris farinosa_ is the name in the Wikipedia taxobox, AHPA's heading, Cunningham, Kynes and Grieve. No discrepancy.
- **Forms.** Root (primary) and Powder (Kynes's spell uses the powdered root). Kynes also lists seeds for sale, with nothing attached to them: left out.
- **Folk names.** "Aletris" (Cunningham; AHPA's sCn) is the genus name, left out. Grieve's Star-Root, Aloeroot, Bettie Grass and "Ague-Root" (the label) left out, since other sources do not repeat them; they are sourced and can be added. Blazing Star, Devil's Bit and Starwort are also names of other plants (Kynes gives blazing star and devil's bit to _Chamaelirium luteum_ in under Fairy Wand), but the sources read give them for this plant too, so they are kept.

#### Alder (Alnus glutinosa) — 07:19 to 07:24

- **Name.** _Alnus glutinosa_ in the Wikipedia taxobox, Kynes and Grieve. No AHPA monograph (AHPA's only _Alnus_ is _Frangula alnus_, the alder buckthorn). No Cunningham entry (see below).
- **Culpeper.** His "Black Alder-Tree" is the alder buckthorn, a different plant, so it is not used. The Common Alder-Tree is used. His Pisces is hedged ("of some watery sign or others, I suppose Pisces"); Kynes also gives Pisces.
- **Powers with no category of that word.** death/funeral practices, luck, negativity, renewal, see faeries, spirit guides/spirits.
- **Deities not on the curated list.** Cailleach Bheur. Kynes's "Manannán Mac Lir" is written as the curated `Manannan mac Lir`, the pilot's precedent.
- **Forms.** Bark is the primary form (Grieve's parts used, Culpeper, Wikipedia), with Leaf (Culpeper's and Grieve's uses) and Wood (Kynes's wood chips, Wikipedia's timber and smoking). Left out: Kynes's flower essence (no curated row); charcoal (sold, but no source attaches a use; mentioned in the Wood description); male catkins burned for banishing and the female catkin or cone as a travel charm (no curated catkin or cone form; "Flower" for a catkin would be a guess).
- **Safety.** None written. No safety handbook covers _Alnus glutinosa_, and Kynes gives no caution. Wikipedia's Toxicity section concerns alder **pollen** as a tree-pollen allergen, not the bark, leaf or wood, so it is left out (the pilot's precedent for hazards outside the ingredient).

#### Alfalfa (Medicago sativa) — 07:21 to 07:25

- **Name.** _Medicago sativa_ in the Wikipedia taxobox, AHPA's heading and Grieve. Cunningham prints "Medicago saliva", a misprint, so Cunningham is not cited for the formal name.
- **Powers with no category of that word.** Anti-hunger, money.
- **Forms.** Herb is the primary form (AHPA, Grieve). Seed gets its own description and safety note (AHPA and Wikipedia on the seed and sprouts). Ash gets Cunningham's use of the ashes. There is no curated "sprout" form, so what the sources say about sprouts sits on Seed and names sprouts.

#### Alkanet (Alkanna tinctoria) — 07:22 to 07:26

- **Name.** _Alkanna tinctoria_ in the Wikipedia taxobox, AHPA's heading, Cunningham (with "Anchusa spp."), Kynes (with the synonym _Anchusa tinctoria_) and Grieve.
- **Culpeper not used.** His ALKANET grows "commonly in this nation" (Kent, Devon, Cornwall) with reddish flowers, so it is probably not _Alkanna tinctoria_, which is Mediterranean. Grieve quotes his Venus passage under _Alkanna tinctoria_. Kynes already gives Venus, so nothing is lost.
- **Powers with no category of that word.** happiness, luck, money (from Kynes's "prosperity/money", whose "prosperity" is filed).
- **Substitutes.** Henna, as typed text `{ name: 'Henna' }`: Kynes says henna was sometimes used in place of alkanet. _Lawsonia inermis_ is not in `identities.md`.
- **Colours.** `red` is on the Root form: it is the colour of the dye the root yields (Grieve, Wikipedia), and Wikipedia gives the root as blue-red inside. Left out: Wikipedia's "blackish" outside of the root; the flower's blue (flower colour, not the root's).
- **Forms.** Root is the primary form (AHPA, Grieve, Kynes, Wikipedia). Powder gets Kynes's candle-dressing spell and Wikipedia's powdered root in oil as a wood stain. Left out: "red fast luck oil", a compound hoodoo oil and not an alkanet oil.

1. Ague Root's Hex-Breaking and Uncrossing come from Cunningham's Magical Uses line, not his Powers line: keep them or drop them?
2. Alfalfa's interaction note from Wikipedia contradicts AHPA's "none known": keep both, as now, or keep AHPA alone?
3. Alder: Cunningham's tables (Venus, Fire, Masculine) were not cited because Kynes already covers those values. Should a lane cite table headings?
4. Alkanet: should Common Alkanet (_Anchusa officinalis_) become its own entry?

### Allspice to Amaranth

#### Left out, and why

**Powers with no category of that word.**

- Allspice: Cunningham's money, luck; Kynes's consecrate/bless, determination, growth, luck, negativity, money (of prosperity/money), relationships, spirituality.
- Almond: Cunningham's money; Kynes's awareness, happiness, hope, luck, money, renewal, sex/sexuality, spirit guides/spirits, spirituality. Cunningham's business-success use is a magical-use line, not a power, so Business/Success were not filed.
- Aloe: Cunningham's luck; Kynes's balance (of balance/harmony), death/funeral practices, family and home, loss/sorrow, luck, security, sex/sexuality, support.
- Amaranth: Cunningham's invisibility; Kynes's balance, death/funeral practices, emotions, loss/sorrow, money, relationships, spirit guides/spirits.

**Deities not curated.** Almond: Kynes's Shakti. Amaranth: Kynes's Chicomecoatl, Huitzilopochtli, Xiuhtecutli.

**Colours.** None written. No source gives a colour correspondence for any of the four; Amaranth's flower colours (Wikipedia "deep purplish-red", Grieve "deep crimson", Culpeper "reddish") are the plant's, and "purplish-red"/"crimson" are not list colours, so the Flower form carries none.

**Forms with no curated row or nothing of their own.** Allspice: flower essence (Kynes, sold only), pimento water (Grieve). Almond: almond milk and almond flour (Kynes; no curated Milk or Flour form; the milk libation is in the entry description); the leaves (Cunningham names them only alongside the nuts and wood). Aloe: the gel has no curated form (its notes sit on Leaf, the part AHPA names); the powdered leaf is described on Leaf rather than as a Powder form. Amaranth: flower essence (Kynes); the whole plant, roots and all, in Cunningham's bullet charm (a `Whole` form was possible, but the charm is a single rite and is not in the description either).

**Name discrepancies.**

- Allspice: Cunningham and Kynes head it _Pimenta officinalis_, giving _P. dioica_ second; Grieve _Pimento officinalis_ (Lindl.); AHPA and Wikipedia's taxobox _Pimenta dioica_ (L.) Merr., with _P. officinalis_ Lindl. a synonym (Wikipedia l. 34, AHPA l. 5). List name kept.
- Almond: Wikipedia's taxobox gives _Prunus amygdalus_ Batsch and calls _P. dulcis_ (Mill.) D.A.Webb superfluous; Cunningham gives _Prunus communis, P. dulcis_; Kynes and AHPA use _P. dulcis_ with _P. amygdalus_ a synonym (Kynes); Grieve _Amygdalus communis_. List name kept. Cunningham is not cited for the formal name, as he does not give it.
- Amaranth: Kynes's heading covers _Amaranthus caudatus_ and _A. blitum_, not _A. hypochondriacus_. Applied to this entry by the brief's rule 4 (a book entry is applied to the entry its heading names), for correspondences, flower and seed only; the candidate list did not credit Kynes here. **Lead to decide** whether Kynes under Amaranth stays on this entry. Culpeper's Amaranthus names no species; applied the same way.

**Weak or doubtful lines, kept or left.**

- Allspice folk names Eddo, Madere, Basheen, Kouroubaga: Cunningham prints them under Allspice and they are kept, but "eddo" is otherwise a name for taro; **lead to decide**. Kynes's "Jamaican pepper" is written as the "Jamaica Pepper" Wikipedia, AHPA and Grieve give; "pimento leaf" is a product name, left out. Wikipedia's Polish name "English herb" is tagged as needing a citation, left out. Wikipedia's Jamaica-as-leading-source, seed-germination and Hawaii lines are tagged "citation needed"; Grieve's 1931 statement is used instead.
- Aloe: Wikipedia's "Cape aloe" is AHPA's _A. ferox_ (a different species), left out of folk names. Cunningham's Mexican garlic-wreath passage not used (length).
- Amaranth: Cunningham's "Floramon" and Culpeper's "Flower Velure Floramor" (unpunctuated, so the split is unclear) left out. "Love-Lies-Bleeding" is kept because Cunningham and Grieve both give it as this plant's synonym, though Grieve's own text and Kynes give it to _A. caudatus_; **lead to decide**. Wikipedia's "Originally endemic to Mexico" is tagged "additional citation needed", left out; Grieve's "an Indian annual" for Prince's Feather conflicts with Wikipedia and is left out. No safety source covers Amaranth (no AHPA monograph, no Cunningham code, no Kynes caution); Grieve's "none are poisonous" is not a handbook statement, so `safetyNotes` is empty.
- Almond safety: AHPA has no almond monograph; the note rests on its apricot-kernel monograph's editors' note (p. 703), which says the bitter-apricot concerns apply to bitter almond. Kynes Herbal Remedies and Northcote were not read for this batch.

### American Bittersweet to Anise

#### American Bittersweet

(a) - **American Bittersweet.** Cunningham under Bittersweet: formal name, element, celestial body, powers, folk names, the Poison mark, the toxic flag, the pillow and protective-tying uses. Kynes under Bittersweet: formal name, folk name, element, celestial bodies, sign, deity, powers, the autumn berries, the toxicity caution, the toxic flag, Menominee, Ojibwe and Potawatomi winter food, the berries. Wikipedia "Celastrus scandens": formal name, the vine, its range and habitat, the fruit and its toxicity, the toxic flag, the root's uses, the name's history, Oriental bittersweet, the decorative use.

(c) Left out:

- **Two species under one heading.** Both Cunningham's and Kynes's Bittersweet entries cover _Celastrus scandens_ and _Solanum dulcamara_. Their correspondences are applied here (and apply equally to Bittersweet Nightshade, its own row). Lore that can only be about the European plant is left out: Kynes's British Isles, Irish and English charms (the plant is not native there), the flower essence "made from European bittersweet", and Cunningham's folk names for European bittersweet. Cunningham's Culpeper vertigo cure is Culpeper's Amara Dulcis (_S. dulcamara_), so it is left out too. Kynes's spells (berries in the hands, dried berries at Samhain) sit under the shared heading; they support only the Berry form. Lead to confirm.
- Powers with no category of that word: death/funeral practices, emotions, family and home, hexes, renewal. "Manifest" is filed under Manifestation as a direct form of the word, as "banish" is under Banishing; lead to confirm.
- Colours: Kynes's red berries and yellow-orange petals are the plant's own colours, not a correspondence, so none are written.
- No AHPA monograph, Grieve or Culpeper entry for _Celastrus scandens_ found. Safety rests on Cunningham's Poison mark, Kynes's caution and Wikipedia's fruit toxicity.
- Forms: root (Wikipedia's medicinal use) has nothing magical of its own; not added.

#### American Ginseng

(a) - **American Ginseng.** Cunningham under Ginseng, American: formal name, element, celestial body, powers, folk name, the root's uses. Kynes under Ginseng: formal name, folk name, element, celestial body, powers, the pregnancy and endangered cautions, Native American love charms, the root. AHPA p. 625 and p. xxii: formal name, Chinese name, part used (root), safety class 1, warfarin, allergy, blood sugar, pregnancy and nursing, effects of improper use. Grieve under Ginseng: folk names, part used. Wikipedia "American ginseng": formal name, the plant, range, flowering and fruit, Lafitau and the Haudenosaunee name, the China trade, conservation, cultivation, folk names.

(c) Left out:

- Grieve's page is headed _Panax quinquefolium_ (Linnaeus's original spelling, which Wikipedia L60 says was "later corrected to _Panax quinquefolius_") but mixes Chinese and American ginseng; only its synonyms and part used are cited. Its Codonopsis substitute is "employed in China" for the costly (Asian) root, so not written.
- Cunningham's code G ("Safe") is not written into the safety note, which follows AHPA and Kynes; Cunningham is not cited for safety.
- Wikipedia's Toxicity section (anticoagulants, liver and kidney, headaches, anxiety) is not used: AHPA covers the plant.
- Powers with no category of that word: wishes, beauty (Cunningham); luck, sex/sexuality, wishes (Kynes). Cunningham's "to draw money" is not Prosperity.
- Substitutes: Cunningham says "Ginseng can be a substitute for the mandrake", the reverse direction, so nothing is written here (it belongs on Mandrake's entry as a substitute).
- Folk names "cheng" and "chang" (Wikipedia) are left out as variant spellings; "Wonder of the World" (Grieve's gloss of the word ginseng) is covered by Cunningham's "Wonder of the World Root".
- Colours: Kynes's pink or red ribbon is the ribbon's colour; none written. Forms: seeds (Kynes, available for purchase) have nothing of their own.

#### Angelica

(a) - **Angelica.** Cunningham under Angelica and p. 266: formal name, element, celestial body, deity, powers, folk names, the pregnancy and sunlight codes, the incense, house and bath uses, the leaves' visions. Kynes under Angelica: formal name, folk names, element, celestial body, signs, deity, powers, Anglo-Saxon, elf-shot, Cherokee and Delaware lore, the root and its burning. AHPA pp. 69–70 and p. xxii: formal name, folk names, part used (root), safety class 2b, emmenagogue, lactation, furanocoumarins and sunlight. Culpeper under Angelica: the Sun in Leo. Grieve under Angelica: formal name, folk names, parts used, the Archangel and Holy Ghost lore, the leaves in hop bitters and as a tonic, American angelica as a substitute. Northcote pp. 48–50: Lapland poets, roots against witchcraft. Wikipedia "Angelica archangelica": formal name, folk names, the plant, range, cultivation, Sámi use, liqueurs, gin, candied stems, poisonous look-alikes.

(c) Left out:

- Powers with no category of that word: exorcism, visions (Cunningham); consecrate/bless, growth, hexes, negativity, renewal, spirituality (Kynes). Filed by the printed word: "balance/harmony" as Harmony (as the pilot filed "loyalty/fidelity" as Fidelity), "bind" as Binding, "manifest" as Manifestation; lead to confirm.
- Kynes's Angelica also covers wild angelica (_A. sylvestris_), whose folk name "woodland angelica" is left out.
- Grieve's warning not to give it to people tending to diabetes is left out of the safety note: the brief keeps safety to AHPA, Cunningham's codes and Kynes's cautions. Wikipedia's look-alike warning is in the description, not the safety note, for the same reason; lead may move it.
- Culpeper's "herb of the Holy Ghost" is not added as a folk name beside Grieve's "Root of the Holy Ghost"; Culpeper's medicinal virtues are not used.
- Other names: Kynes's "Imbolc, Beltane, Samhain, Walpurgis" and "faeries" are not fields here.

#### Anise

(a) - **Anise.** Cunningham under Anise and p. 266: formal name, element, celestial body, powers, folk names, the pregnancy code, the pillow, incense, bath and leaf uses. Kynes under Anise: formal name, folk names, element, celestial bodies, signs, deities, powers, Theophrastus, Roman pillow sprig, taxes, the evil eye, the seed and the oil and its use. AHPA pp. 657–658 and p. xxii: formal name, part used (fruit, "seed"), safety class 1, allergic reactions, pregnancy (ESCOP), lactation, estragole in the oil. Grieve under Anise: formal name, part used, Dioscorides and Pliny, taxes, the Roman spiced cake, the evil eye, the leaves in cooking, star anise as a substitute. Northcote p. 9: a spice in Virgil's time, native of Egypt. Wikipedia "Anise": formal name, folk names, the plant, range, cultivation, flavour, liqueurs, the essential oil.

(c) Left out:

- Cunningham's calling forth spirits and the bedpost sprig to restore youth are not in the description for length.
- Grieve's notes that Italian anise is often adulterated with hemlock fruit and that the oil is poisonous to pigeons are not used as safety notes (not a safety source).
- Safety in pregnancy: Cunningham's code P and AHPA's ESCOP citation disagree on infusions; the note gives both in plain words.
- Substitutes: Grieve's star anise oil, "identical in composition", is not written as a substitute for the Oil form because Grieve does not call it one; only the powdered star anise "administered in India as a substitute for the official fruit" is written, on the Seed form. Star Anise is a typed name (not in this shard's identities).
- Forms: anise seed tea (Kynes) has no curated form; powder (ground seed) has nothing of its own.

### Apple to Ash

#### Left out, and why

**Powers with no category of that word.**

- Apple: Cunningham's Garden Magic, Immortality; Kynes's consecrate/bless, death/funeral practices, happiness, luck, money (of prosperity/money), relationships, renewal, security, sex/sexuality, spirit guides/spirits.
- Apricot: Kynes's balance (of balance/harmony), changes/transitions, defense, determination, happiness, relationships, renewal, sex/sexuality.
- Arnica: Kynes's security, sex/sexuality, spirit guides/spirits.
- Ash: Cunningham's Sea Rituals, Health (not "Healing"); Kynes's awareness, changes/transitions, focus, hexes, luck, money, negativity, see faeries.

**Deities not curated, or spelt otherwise.**

**Colours.** Apple: none on the entry; the Fruit form holds Kynes's spell colours (red, yellow, gold, green) and the Flower form the blossom's white and pink. Apricot: Kynes's "pale orange-yellow" fruit is covered by Wikipedia's "yellow to orange" on the Fruit form; Grieve's "dusky red" tinge of the flower is not written. Arnica: Flower form yellow only (Wikipedia's "yellow flower head"); Kynes's and Grieve's "yellow-orange"/"orange-yellow" not written as orange. Ash: Grieve's greenish-white or purplish flowers not written (no Flower form).

**Forms with no curated row or nothing of their own.**

- Apple: cider and juice (Cunningham's libations, cider in place of blood; no curated Cider form, Liquid felt too loose); flower essence (Kynes, sold only); leaves (Cunningham's buried thirteen leaves, a gardening charm); bark (Grieve's medicinal decoction only, no magical use); seeds (cautions kept on the entry, divination in the entry description).
- Apricot: juice and wine (Kynes, sold only; the juice's love use is in the entry description); leaves (only with the flowers in Cunningham's sachets).
- Arnica: whole plant (AHPA part used, nothing of its own).
- Ash: flower essence and twig baskets (Kynes, sold only); roots (Cunningham's carved poppets, a single line); the ashes of the bark (Culpeper's lye, medicinal).

**To be its own entry (named sorts headed separately).** Ash: Kynes's same heading also names Black Ash (_Fraxinus nigra_) and White Ash (_F. americana_), and Cunningham's heading gives "F. americana" as an alternative; AHPA has a monograph on _F. americana_ (p. 379, class 2b) that was NOT applied to _F. excelsior_. Grieve's synonym "Weeping Ash" is a cultivated variety (Grieve l. 63), so it is not a folk name here. Apple: Kynes heads Crabapple separately, and Grieve's Apple page is written about the wild Crab-tree; its synonym "Wild Apple" was not used.

**Substitutes.** None written. Grieve says apricot oil is used in place of almond oil and ash bark for Peruvian bark, ash leaves for senna and ash keys for capers: each is the plant standing in for something else, so it belongs on the other entry, not this one.

**Name discrepancies.** Apple: Cunningham heads it "(Pyrus spp.)" and Grieve "Pyrus malus" (Wikipedia lists _Pyrus malus_ L. as a synonym of _M. domestica_); Kynes and Wikipedia give _Malus domestica_, which was kept, and Cunningham is not cited for the formal name. Apricot, Arnica, Ash: every source read agrees with the list's name (Cunningham's Ash heading adds _F. americana_ as an alternative). POWO not tried, per the brief.

**Weak or unsourced lines.** Apricot: Wikipedia's kernels-for-bitter-almonds and amaretto lines are tagged "citation needed" and were not used; its Armenian-flag colour line likewise. Arnica: Grieve's homoeopathic epilepsy and hair-growth lines not used. Apple: Cunningham's unicorn and demon lines not used.

**Library.** Kynes's _Herbal Remedies_ has no passage on any of the four; Northcote names apple and arnica only in passing (pp. not cited).

### Asian Ginseng to Avens

#### Formal names

All four agree across every source read: _Panax ginseng_ (Wikipedia taxobox; AHPA heading "Panax ginseng C.A. Mey."; Kynes "P. ginseng"), _Populus tremuloides_ (Wikipedia; Cunningham; Kynes "P. tremuloides"; Grieve), _Callistephus chinensis_ (Wikipedia, the genus article "Callistephus", which is monotypic; Cunningham; Kynes), _Geum urbanum_ (Wikipedia; Cunningham; Kynes; Grieve). POWO not tried, per the brief.

#### What is left out, and why

- **Powers with no category of that word.** Asian Ginseng: luck, sex/sexuality, wishes. Aspen: Cunningham's eloquence, anti-theft; Kynes's death/funeral practices, determination, hexes, negativity, renewal, and money (of prosperity/money, whose "prosperity" is filed). Aster: consecrate/bless, focus, negativity. Avens: Cunningham's exorcism; Kynes's hexes.
- **Folk names left out.** Aspen: Cunningham's "European Aspen" (Kynes and Wikipedia give that name to _Populus tremula_, a different species) and "Poplar" (the label of the shard's Poplar entry, _Populus nigra_; Cunningham itself says the name was used for this tree only in some parts of America); Grieve's and Wikipedia's "White Poplar" (Kynes under Poplar gives it to _P. alba_, and Wikipedia carries a hatnote for other trees so called). Avens: Cunningham's "Assaranaccara" (Grieve spells it "Assarabaccara"; the two disagree, so neither is written). Kept with a flag: Aster's "Michaelmas Daisy" and "Starwort" are Cunningham's for this plant, though Kynes gives "European Michaelmas daisy" and "Italian starwort" to _Aster amellus_.
- **Correspondences left out.** Aspen: Cunningham's separate entry under Poplar is also headed _Populus tremuloides_ (Feminine, Saturn, Water) and says the tree was called Poplar in some parts of America and "used differently"; its values belong to the entry its heading names (Poplar), so are not written here. Kynes's ogham (Edad/Ebad) and "other associations" (the otherworld, Mabon) for Aspen, and faeries and Mabon for Aster, have no field.
- **Colours.** Asian Ginseng: Kynes's "light tan" root is not on the list. Aster: only the wild flower's purple (Wikipedia) is written, on the Flower form; the cultivars' many colours and Kynes's "white to violet" are not the plant's own single colour. Avens: yellow is written on the Flower form only; Grieve's "dark crimson" achenes and Wikipedia's purple rhizome cross-section are left out.
- **Forms with no curated row or nothing of their own.** Flower essence (Aspen, Aster, Avens: no curated form; Kynes's aster flower-essence spell is left out with it). Seeds of Asian Ginseng and Aster (sold, nothing attached). Avens herb (Grieve's part used; only medicinal dosing attached). Ginseng whole and sliced root fold into Root.
- **Safety.** Aspen, Aster and Avens have no AHPA monograph (searched by binomial; AHPA's only _Populus_ monograph is _P. balsamifera_), so each carries only Cunningham's code. No LiverTox/NCCIH fetch was made.
- **Substitutes.** No read source names a substitute for any of the four. (Grieve calls aspen bark a substitute _for_ Peruvian bark, the opposite direction.)

### Avocado to Barberry

#### Left out, and why

**Powers with no category of that word.**

- Avocado: Cunningham's beauty; Kynes's sex/sexuality, and money (of prosperity/money).
- Bamboo: Cunningham's luck, wishes; Kynes's adaptability, balance (of balance/harmony), happiness, hexes (not "Hex-Breaking", though Cunningham's own "Hex-Breaking" is filed), luck, negativity, wishes.
- Banyan: Cunningham's luck (its only power), so the entry has no categories.
- Barberry: Kynes's negativity, and money (of prosperity/money).

**Colours.** None written. No source gives a colour correspondence for any of the four. Avocado's green candle (Kynes) is a candle colour for a spell, not the ingredient's. Barberry's yellow flowers, red berries and yellow dyes are the plant's, not correspondences; Culpeper's "yellow, viz. of Mars' own colour" describes hair washed in the lye, not the shrub. Bamboo's lemon-yellow culms are the golden cultivars'.

**Forms with no curated row or nothing of their own.**

- Avocado: leaves (only Cunningham's X code and Wikipedia's animal toxicity, both kept in the entry's safety notes); bark and skin (animal toxicity only).
- Banyan: figs (Wikipedia names them, no source attaches a use).
- Barberry: Kynes's flower essence (no curated form) and powdered root (nothing of its own).

**To be its own entry (named sorts headed separately).** Barberry: Kynes's heading also covers Oregon Grape (_B. aquifolium_ syn. _Mahonia aquifolium_), which Cunningham heads as its own entry (EoH-8.html l. 362, "OREGON GRAPE (Berberis aquifolium)"); not used here. Grieve's Nepal and Indian barberries are separate pages, not read. Bamboo: Kynes's Black Bamboo (_Phyllostachys nigra_) and Giant Bamboo (_Dendrocalamus giganteus_), and the West Indian black-bamboo love lore, are not this species and not used.

**Name discrepancies.**

- Avocado: Cunningham prints "(Persea americans)", taken as a misprint and not cited for the formal name; Kynes and Wikipedia's taxobox give _Persea americana_ Mill.
- Bamboo, Banyan, Barberry: every source read gives the list's name.

**Weak or doubtful lines, kept or left.**

- Banyan: Cunningham's G code is the only safety statement; AHPA has no _Ficus benghalensis_ monograph. Wikipedia's Reproduction section is tagged original research and was not used; the bird-dispersal line comes from its Description section (l. 47).
- Avocado: Cunningham's "The Egyptians revered the persea" and folk name "Persea" left out: Wikipedia places the avocado's origin in the Americas, so the Egyptian persea is unlikely to be this tree, and no source read settles it. Cunningham's "Ahuacotl (Aztec: “Testicle Tree”)" is written as Kynes's and Wikipedia's spelling "Ahuacatl". Kynes's legend that Spanish explorers could not pronounce the Aztec name is replaced by Wikipedia's etymology.
- Avocado oil's `description` says the oil comes from the oily fruit (Wikipedia l. 52); no source read describes pressing.
- Barberry: AHPA's class 2b wording ("Not for use in pregnancy except under the supervision of a qualified healthcare practitioner") is kept verbatim, as the pilot's Cinnamon keeps it; it is the handbook's standard contraindication. Kynes's caution covers barberry and Oregon grape together and is applied to this entry. Northcote mentions barberries only in passing (salad garnish, aromatic vinegar, barberry-bark for consumptives, the herb-garden hedge: files 0021, 0070, 0135, 0215) and was not cited. Kynes's _Herbal Remedies_ has no barberry passage.

### Barley to Be-Still

- **Barley Water as a `Water` form** (Cunningham's love-spell use, Culpeper, Wikipedia). If `Water` is meant only for waters themselves, drop the variant; Barley's description still mentions barley water.
- **Basil Powder carries category Fidelity** from Cunningham's own word in the powder charm ("fidelity will bless your relationship"), a use rather than his Powers line. Drop it if categories must come from the Powers line alone.
- **Grieve's "Barley" page is _Hordeum distichon_** (two-row barley), not _H. vulgare_, so it is not cited.
- **Barley's gluten caution comes from Wikipedia** although AHPA covers barley; AHPA does not mention gluten. Same pattern as the pilot's Salt dietary caution.
- **Bay's cherry-laurel caution comes from Grieve**, not a safety handbook.
- **Be-Still's safety rests on Wikipedia** (no AHPA monograph; grep of the whole handbook finds no _Thevetia_ or _Cascabela_) and Cunningham's "Poison". LiverTox/NCCIH were not fetched.

#### Left out, and why

- **Powers with no category of that word.** Barley: Kynes's consecrate/bless, death/funeral practices, hexes, hope, luck, renewal, trust. Basil: Cunningham's exorcism, flying; Kynes's death/funeral practices, focus, happiness, hexes, luck, negativity, trust. Bay: Kynes's defense, hexes, negativity, security, wishes. Be-Still: Cunningham's luck. Also not mapped from magical-use prose: Basil purification baths, Bay curse-breaking ("remove curses").
- **Deities not curated or spelt otherwise.** Bay: Cunningham's Aesculapius (curated row is Asclepius, a different slug; Kynes's Asclepius is kept), Kynes's Balder (curated Baldur) and Daphne (not a curated deity; kept as a folk name, which Cunningham and Grieve give). Barley: Kynes's Amaterasu, Centéotl and Inari (marked for rice or maize); Wikipedia's Shala (Mesopotamian; not curated, and Wikipedia's link is historical, not a correspondence).
- **Colours.** None written: no source gives a colour correspondence, and leaf, flower and fruit colours are the plant's, not a form's.
- **Forms with nothing of their own, or not taken.** Barley: malt (Cunningham folk name only), flour/meal (Culpeper's medical poultices), sprouted seed as distinct from seed. Basil: flower essence (Kynes: from holy basil). Bay: berries (Culpeper and Grieve give medical uses and Grieve says they were used to promote abortion, but no safety handbook covers the berry; Wikipedia's spice use), wood (Grieve's marquetry), powdered leaf and hydrosol (Kynes lists them for sale only). Be-Still: none beyond the seed.
- **To be its own entry.** Holy basil (_Ocimum tenuiflorum_, Kynes's Basil heading also covers it; AHPA p. 602 has its own monograph); Bush basil (_O. minimum_, Northcote pp. 11, 13; Grieve has a separate "Basil, Bush" page, not fetched). Kynes's Basil deities Krishna and Lakshmi are listed for the heading as a whole, not split by species; they are kept on Basil (Grieve independently gives Krishna for _O. basilicum_).
- **Weak lines not used.** Basil (Wikipedia): Egyptians and Greeks opening heaven's gates (tagged "better source needed"), the Portuguese St John pot (citation needed), Boccaccio/Keats (citation needed; Northcote's Isabella line used instead), seed pods and gelatinous seeds (citation needed). Bay (Wikipedia): Roman immortality/baccalaureate line (citation needed). Be-Still (Wikipedia): Hindu worship and naturalisation in India (both citation needed); the Sri Lankan and South Indian suicide line (kept out of the safety note as not needed for it).
- **Culpeper's Bay berry warning** ("not to be taken by such as have not gone out their time, lest they procure abortion") left out of safety notes: Culpeper is not a safety source under the brief.

### Bean to Beech

#### Left out, and why

**Powers with no category of that word.**

- Bean: Cunningham's exorcism, wart charming, potency; Kynes's death/funeral practices, luck, negativity, relationships, skills, spirituality.
- Bearberry: Kynes's awareness, spirit guides/spirits, spirituality.
- Bee Balm: Kynes's focus (the word appears only in the oil's description).

**Deities not curated, or spelt otherwise.** Bean: Kynes's Carna. Beech: Kynes's Holle (the curated row is Holda, whose description says "also Holle", but the slugs differ, so by the pilot's rule it is left out). Wikipedia's Gallo-Roman god Fagus (Beech) is not curated either.

**Safety lines not used.** Grieve's raw-bean symptoms and "roots are dangerously narcotic" (Bean), and his note that horses should not be fed beech mast: Grieve is not one of the brief's safety sources. Wikipedia's toxicity section for Bearberry (allergic reactions, seizures, hydroquinone as a possible liver toxin): AHPA covers the plant, so the handbook was used instead.

**Forms with no curated row or nothing of their own.**

- Bean: the flower (Cunningham's white flowers sacred to the goddesses; Kynes's picture of the flowers on a Samhain altar; flower essence) and Culpeper's French-bean powder for the kidneys (a Powder form was possible; left out as a single 1653 remedy). The pod (Wikipedia's green pods as food) has nothing magical of its own.
- Bearberry: the seed (Kynes: a pouch of seeds held to the forehead before astral work); flower essence.
- Bee Balm: seeds and flower essence (Kynes, sold only).
- Beech: flower essence (Kynes); beech tar (Grieve, medicinal only).

**To be its own entry (named sorts headed separately).**

- Bean: Kynes heads Fava Bean, Broad Bean (_Vicia faba_) beside French/Common Bean under under Bean, and its history paragraph (souls of the dead in fava beans, bean-field lore, the flowers' scent) is explicitly about fava beans, so it was not used. Culpeper's BEANS (garden and field beans, Old World) is a separate heading from FRENCH BEANS and was not used; his Scarlet flower Bean (within French Beans) is another species. Cunningham's quarrel charm names lima beans (left out of the description).
- Bee Balm: Kynes heads Purple Bee Balm, Wild Bergamot (_M. fistulosa_) under the same entry; its lines (purple flowers, sweat-lodge leaves) were not used. Cunningham's only _Monarda_ entry is "Bergamot, Wild" (_Monarda fistulosa_), which gives "Bee Balm" as a folk name of that species; it was not cited for _M. didyma_.
- Beech: Kynes's American Beech (_Fagus grandifolia_) under under Beech; Grieve's Copper Beech (_F. sylvatica_ var. _purpurea_) and Beech Drops (a parasite).
- Bearberry: Grieve's Black Bearberry (_A. alpina_) and Manzanita (_A. glauca_), which Grieve says is "employed like Uva-Ursi" — not written as a substitute, since Grieve does not call it one.

**Weak lines and choices.**

- Bean: Cunningham's heading is _Phaseolus_ spp. and his lore is about beans generally; per the pilot, a book entry covering several species is applied to the entry its heading names. Grieve's history (Egyptian worship of the bean for its testicle shape; "Native of Indies") was not used: Wikipedia says _P. vulgaris_ is American and reached Europe only in the sixteenth century, so the Egyptian lore cannot be about this species.
- Bearberry: Wikipedia's "One of several related species referred to as bearberry" — the label Bearberry is shared; the formal name fixes the identity. Kynes spells the folk name "kinnikinnik", AHPA "kinnickinick"; only Cunningham's and Wikipedia's "Kinnikinnick" was written.
- Bee Balm: Wikipedia's bergamot-orange scent line is tagged "citation needed", so that fact rests on Kynes and Grieve. Wikipedia's tea for caries and gingivitis, thymol in mouthwash and Ho-Chunk stimulant lines are tagged "citation needed" and were not used.

**Name discrepancies.** None. All four formal names match the Wikipedia taxobox, and where present AHPA's heading (_Arctostaphylos uva-ursi_ (L.) Spreng.; _Monarda didyma_ L.), Cunningham's and Kynes's headings. Grieve spells _Phaceolus vulgaris_ (an old spelling).

### Beet to Bilberry

#### Beet

- Other left out / weak lines / name notes: Culpeper puts the white beet under Jupiter; left out, as it is one sort's celestial body, not the plant's. Cunningham's "blood substitute" is beet standing in for blood, the reverse of the `substitutes` field, so not written. Grieve's Apollo offering is told as history, not a correspondence: Apollo kept to the description, not `deities`. Grieve's synonyms (Spinach Beet, Sea Beet, Garden Beet, White Beet, Mangel Wurzel) name sorts and subspecies, not the plant: not used as folk names.
- Forms left out: juice (Cunningham's ink and blood use; no curated row; mentioned in the description). To be own entries if wanted: beetroot, chard / spinach beet, sugar beet, mangelwurzel, sea beet (Wikipedia gives each its own article; not read).

#### Belladonna

- Unmapped powers: secrets (Kynes); visions and "astral protection" (Cunningham, past uses; "astral protection" reads like a misprint for projection, so not filed under Protection).
- Deities left out: Bellona (Cunningham), Macha (Kynes): not curated.
- Forms left out: berry, flower, "tops" (Grieve): nothing particular attached beyond the whole-plant toxicity.
- Other left out / weak lines / name notes: the list's and Wikipedia's hyphenated _Atropa bella-donna_ is kept; Cunningham, Kynes, AHPA and Grieve all print _Atropa belladonna_ (Wikipedia L27 says the hyphen is the correct form). Kynes's Nightshade heading covers both black nightshade and deadly nightshade with one correspondence list; applied here as the pilot applied Kynes's Lichen and Seaweed, and it will apply to Black Nightshade too. Lead to confirm. Culpeper's NIGHTSHADE is the common (black) nightshade and warns against mistaking the deadly one: not used here. Wikipedia's 4th-century and Cleopatra lines concern mandrake and henbane, and one carries a citation-needed tag: not used.

#### Bergamot Orange

- Unmapped powers: luck, money (of "prosperity/money"), spirit guides/spirits.
- Forms left out: seeds (Kynes lists them for purchase; nothing attached).
- Other left out / weak lines / name notes: Cunningham's "Bergamot, Orange" is _Mentha citrata_ (a mint), Grieve's and Northcote's Bergamot are _Monarda_: none applied. Kynes's synonym _C. aurantium_ var. _bergamia_ and AHPA's _Citrus × aurantium_ ssp. _bergamia_ suggest the accepted name may differ; the list's _Citrus bergamia_ is kept (Wikipedia's taxobox). The name's origin is left out: Kynes derives it from Turkish _beg-armudi_ "prince's pear", Wikipedia from Bergamo and gives _beg armudi_ to the bergamot pear.

#### Bilberry

- Colours left out: purple (Grieve's and Wikipedia's dye and stain colour, not the berry's).
- Other left out / weak lines / name notes: Cunningham has no Bilberry heading; his HUCKLEBERRY heading names _Vaccinium myrtillus_ first (with _Gaylussacia_ spp.) and gives Bilberry as a folk name, so it is applied here. His BLUEBERRY entry also lists "Bilberry" as a folk name but heads other _Vaccinium_ species: belongs to Blueberry. Kynes's folk name "crowberry" left out (no other source gives it for this plant). To be own entries: Culpeper's red bilberry / whortle-bush and Grieve's bog bilberry (_V. uliginosum_), each headed as another sort.

### Bindweed to Bitter Orange

#### Bindweed

- Unmapped powers: changes/transitions (Kynes); knot magic and handfasting (Kynes's spell line, not powers).
- Forms left out: Kynes's flower essence (no curated row); Leaf (Wikipedia's folk use folded into the description).
- Other left out / weak lines / name notes: Kynes's heading also covers Hedge Bindweed (_Calystegia sepium_) and its folk names (bearbind, devil's garters, …): to be its own entry if wanted. Wikipedia's toxicity is animal data (no AHPA monograph; no handbook covers it).

#### Birch

- Unmapped powers: Cunningham: exorcism. Kynes: changes/transitions, death/funeral practices, focus, growth, hope, negativity, renewal.
- Deities left out: Kynes's "Angus Mac Og" (curated row is Aengus; slug differs). **Open question:** Kynes writes "the Dagda"; seeded as the curated Dagda.
- Colours left out: Cunningham's red ribbon (not the birch's colour).
- Forms left out: Kynes's essential oil and flower essence (only "available for purchase", nothing attached); Grieve's birch tar oil (folded into the Bark description).
- Other left out / weak lines / name notes: "White Birch" not used as a folk name: AHPA and Wikipedia give it to _Betula pubescens_. Kynes's heading also covers American White/Paper Birch (_B. papyrifera_), and AHPA has Sweet Birch (_B. lenta_) as its own monograph (pp. 133 ff.): to be their own entries if wanted. Kynes's American bark-for-writing spell left out (other species).

#### Bistort

- Unmapped powers: Cunningham: money (the Wealth category rests on his word "wealth"). Kynes: challenges/obstacles, changes/transitions, death/funeral practices, negativity, support.
- Forms left out: Kynes's flower essence and seeds ("available for purchase" only).
- Other left out / weak lines / name notes: AHPA (p. 695) and Cunningham head it _Polygonum bistorta_, Kynes misprints "B. officinals"; Wikipedia gives _Polygonum bistorta_ L. as a synonym of _Bistorta officinalis_, so the list's name is kept. Culpeper's claim that the root decoction "hinders abortion" contradicts Kynes's caution and is left out of the safety note. Kynes's heading also covers American Bistort (_Bistorta bistortoides_): to be its own entry if wanted.

#### Bitter Orange

- Colours left out: none beyond the forms' own (fruit orange, flower white).
- Forms left out: Kynes's juice and flower essence; the synephrine extract (AHPA's 2d monograph; folded into the entry's safety note); the petitgrain oil from leaves (Grieve), not attached to bitter orange alone.
- Other left out / weak lines / name notes: AHPA prints the fruit monograph twice (p. 220 and again at p. 228); pp. 220–221 cited. Cunningham's Orange is _Citrus sinensis_ and was not used. Wikipedia's varieties (Chinotto, daidai, laraha) are to be their own entries if wanted.

### Bittersweet Nightshade to Black Locust

#### Bittersweet Nightshade

- Unmapped powers: Kynes's death/funeral practices, emotions, family and home, hexes, renewal. "Manifest" filed under Manifestation as a direct form of the word (as b04 did for the same Kynes line); lead to confirm.
- Other left out / weak lines / name notes: Both Cunningham's and Kynes's Bittersweet headings cover _Celastrus scandens_ and _S. dulcamara_; their correspondences are written here as b04 wrote them on American Bittersweet. Cunningham's "Poison" mark is printed for American bittersweet only, so it is not used. Cunningham's Culpeper vertigo line is left out (medical). Kynes's flower essence: no form of its own. Wikipedia's longer common-name list carries an "additional citation needed" tag; only names a book also gives, plus Climbing Nightshade (cited there to USDA PLANTS), are kept. Culpeper's "Felon-wort" and "Woody Night-shade" are written as the books' Felonwort and Woody Nightshade. Wikipedia's medicinal uses (eczema, ringworm, fever) left out as not the compendium's concern.
- Forms left out: Leaf (Wikipedia's wart use; nothing magical of its own); flower essence (no curated row).

#### Black Cohosh

- Unmapped powers: Cunningham's potency; Kynes's challenges/obstacles, defense, hexes, luck. Cunningham's "drives away evil presences" and Kynes's "remove any type of spell" have no category of that word.
- Other left out / weak lines / name notes: Cunningham heads it _Cimicifuga racemosa_, the synonym Kynes, AHPA and Wikipedia give; the list's _Actaea racemosa_ kept. Folk names left out: "Squaw Root"/"squawroot" (Cunningham, Kynes, Grieve) as a slur, **lead to decide**; Cunningham's "Actaea" and "Cimicifuga", which are genus names. No celestial body from Cunningham (his entry prints none). Kynes's flower essence and powdered root: no use of their own.

#### Black Hellebore

- Unmapped powers: Kynes's challenges/obstacles, death/funeral practices, hexes, spirit guides/spirits; Cunningham's invisibility, exorcism, astral projection (no Powers line in his entry).
- Deities left out: Cronos (no curated row; the curated Saturn row is used for Kynes's "Saturn").
- Other left out / weak lines / name notes: Kynes's Hellebore heading also covers White Hellebore (_Veratrum album_); only black-hellebore and general hellebore lore is used, and her white-hellebore pentagram spell and Cailleach Bheur altar picture are left out. **White Hellebore is to be its own entry** if wanted (Kynes under Hellebore; Grieve "Hellebore, White"). Culpeper's "Bear's-foot" left out: Grieve gives Bearsfoot to _H. foetidus_. Culpeper's "Setter-wort" written Setterwort; his "Christmas-flowers" kept as Christmas Flowers. Wikipedia contradicts itself on the root: l.67 names hellebrin as its key toxin, l.78 says 1970s research found _H. niger_ roots lack it; neither claim is used. Wikipedia's medieval-lore and calendar lines carry "citation needed"; the calendar legend is left out, the strewing and blessing lore is also in Kynes and Grieve. Grieve's medicinal uses and Culpeper's remedies left out. Kynes's seeds (for purchase): no use.

#### Black Locust

- Unmapped powers: Kynes's challenges/obstacles, defense, determination, negativity, secrets. "Balance/harmony" filed under Harmony and "bind" under Binding (a direct form of the word, as banish → Banishing); lead to confirm.
- Other left out / weak lines / name notes: Kynes's Locust heading covers black locust and honey locust (_Gleditsia triacanthos_); her honey-locust lore (Delaware and Cherokee medicine and bows, spines as needles, the twisted pods) is left out, and her "honey locust" as a folk name of black locust is left out as the other tree's name. Her thorn spell names no species: on this entry it supports the Thorn form only, and the long branched thorns are honey locust's (Wikipedia l.59) — **lead to decide** whether the Thorn form stays. Grieve spells the binomial _Robinia pseudacacia_; the list's _Robinia pseudoacacia_ (Wikipedia, Kynes) kept. No celestial body in any read source. Wikipedia's honey and flower foods (jam, fritters) have no form here; Kynes's flower essence and honey (for purchase) likewise. Grieve's poisoning case (boys chewing bark) not used; Wikipedia's toxicity lines are.
- Forms left out: Flower (food uses only); Bark (cautions are already on the entry).

### Black Mustard to Black Snakeroot

#### Black Mustard

- Unmapped powers: Cunningham's Mental Powers.
- Deities left out: Cunningham's Aesculapius (curated row is Asclepius, a different slug; Kynes's Asclepius is kept, as b08 did for Bay).
- Forms left out: powdered seed and fresh greens (Kynes; Wikipedia's edible leaves; Grieve's Roman green vegetable): nothing magical or cautionary of their own; flower essence: no curated form.
- Other left out / weak lines / name notes:
  - Name: the list's _Rhamphospermum nigrum_ is Wikipedia's taxobox name; Cunningham heads _Brassica_ spp., and Kynes, AHPA and Grieve all use _Brassica nigra_ (a synonym in Wikipedia's list). Kept the list's name.
  - Book entries covering several species: Cunningham's "Mustard, Black (_Brassica_ spp.)", Kynes's Mustard (black, brown and yellow), AHPA's "_Brassica_ spp. and _Sinapis_ spp." are applied to this entry, the one their headings or first species name. Brown mustard (_B. juncea_) and white/yellow mustard (_Sinapis alba_): to be their own entries if wanted.
  - Culpeper's heading is plain "Mustard" ("our common Mustard", yellowish seed); Grieve quotes the same passage under Mustard, Black, so it is cited here for Mars and Aries only. Lead to confirm.
  - AHPA's "oCn: brown mustard" under _B. nigra_ is not taken as a folk name (Kynes gives that name to _B. juncea_). No folk names written: Wikipedia's "rai" and "senafitch" are cuisine and Amharic names, not English folk names.
  - Cunningham's Hindu air-travel line is left out of the description (space only).
  - Grieve's oil passages are written as the Oil form's description, not as safety notes, since the brief keeps safety notes to safety sources; lead may move the blistering line.
  - Seed colours black and brown are the seed's own colour (Kynes, Grieve, Wikipedia), on the Seed form.

#### Black Nightshade

- Unmapped powers: secrets.
- Deities left out: Macha (not curated).
- Other left out / weak lines / name notes:
  - Book entry covering two species: Kynes's Nightshade covers _Solanum nigrum_ and _Atropa belladonna_; its correspondences are applied to this entry as b10 applied them to Belladonna. Lead to confirm both rows may carry them.
  - Kynes's "other associations: the otherworld" has no field.
  - Safety: no AHPA monograph for _S. nigrum_; safety notes rest on Kynes's caution and Wikipedia's Toxicity section. Culpeper's "no ways dangerous" and Grieve's "reputation … disputed" are left out as superseded lines; Grieve's "berries injurious to children" is not used (not a safety source).
  - Wikipedia's medicinal and anticancer claims, and the Hawaiian uses, are left out.
  - Berry colour black is the berry's own colour, on the Berry form.

#### Black Pepper

- Unmapped powers: Cunningham's exorcism; Kynes's challenges/obstacles, defense, determination, renewal.
- Forms left out: ground pepper (Kynes lists it; nothing of its own); white pepper (Kynes heads "Black Pepper, White Pepper"; Wikipedia and Grieve describe it as the seed of the ripe fruit — a preparation of the same plant, not a sort; it has no curated form beyond Seed and nothing magical of its own, so it is only mentioned in the description).
- Other left out / weak lines / name notes:
  - Folk name "Black Pepper" (Cunningham, Grieve) is the label, so not repeated; "White Pepper" (Kynes) not taken as a folk name.
  - Kynes's "other associations: Saturnalia" has no field (used in the description).
  - Grieve's Attila ransom (Wikipedia gives Alaric) is left out as conflicting; Wikipedia's medieval rotten-meat myth and Pliny passage left out for space.
  - Fruit colour black is the dried peppercorn's own colour (Wikipedia), on the Fruit form.

#### Black Snakeroot

- Unmapped powers: money.
- Other left out / weak lines / name notes:
  - Single-source row on the list (Cunningham). Kynes's Snakeroot is _Aristolochia rotunda_ / _A. serpentaria_, and Cunningham's plain Snakeroot is _A. serpentaria_: not this plant, not cited.
  - The Root form rests on Grieve alone (Cunningham names no part).
  - No safety source covers it (no AHPA monograph, no Cunningham code); no safety notes written.
  - Family not stated: the Wikipedia article gives it only through a stub template, so it is left out.

### Black Walnut to Blessed Thistle

#### Black Walnut

- Cunningham's WALNUT is _Juglans regia_ only (CUN/EoH-8.html L1289); not used.
- Grieve's Walnut page (walnut06) prints "Botanical: Juglans nigra (LINN.)" but its text, synonyms and habitat are the English walnut, _J. regia_ (L48–49, L65); only L68 mentions the black walnut. Not cited; the page belongs to Walnut.
- Forms left out: Hull (AHPA's part used; no curated form). Its cautions sit on the entry's safety note. Wood, Oil: nothing a read source attaches particular to black walnut's wood or oil beyond the description.
- No elements, celestial bodies, signs, deities, categories or colours (see above).

#### Blackberry

- Unmapped powers: Cunningham's money; Kynes's awareness, balance (of balance/harmony), challenges/obstacles, death/funeral practices, growth, happiness, luck, spirit guides/spirits. "balance/harmony" filed as Harmony and "prosperity/money" as Prosperity, by the printed word, as earlier batches did.
- Deities left out: Cunningham's "Brigit" (the curated Brigid lists Brigit as another name, but the slugs differ; Brigid is written from Kynes). Kynes's "the Dagda" written as the curated Dagda, as b-batches before did; "Manannán Mac Lir" as Manannan mac Lir (the pilot's own fold).
- Folk names left out: Cunningham's "Cloudberry" (Grieve L65 names the cloudberry as _R. chamaemorus_, another plant). Kynes's "American Blackberry" and "European Blackberry" (her names for _R. villosus_ and _R. fruticosus_, species inside the group). Wikipedia's "caneberry" and "briar" (the article says they cover raspberries or other thorny plants too).
- Colours: `black` on the Berry form only (the fruit's own colour; Kynes, Wikipedia).
- Forms left out: juice, wine (Kynes; no curated form with anything its own beyond the berry's description), flower essence (no form). Root and Stem are written because Grieve, Culpeper, Cunningham, Kynes and Northcote attach uses to them.
- Safety: the entry's note rests on Cunningham's code G; AHPA's monograph is of the leaf, so its cautions sit on the Leaf form.

#### Blackthorn

- Unmapped powers: Cunningham's exorcism; Kynes's authority/leadership, challenges/obstacles, defense, hexes, negativity; wishing rods (wishes).
- Deities left out: Kynes's Banba, Macha, Ran (not curated); Bertha (curated Berchta lists "Bertha" but the slug differs); Holle (curated Holda; slug differs). "Bel/Belenus" written as Belenus, "the Dagda" as Dagda.
- Colours: `black` on the Fruit form (Wikipedia "black with a purple-blue waxy bloom"; Kynes "blue-black"); blue left out as part of a compound colour.
- Forms left out: Bark (Kynes's "sloe tree bark" for sale; Culpeper's root-bark decoction; nothing more than that), Leaf (Kynes burns leaves in banishing; Culpeper's leaf gargle; Wikipedia's tea adulterant — lead may add), flower essence (no form). Kynes's "Fairy Tree" and "Black Haw" are kept as folk names because she gives them to this plant, though Grieve's Black Haw page is another plant (not fetched).

#### Blessed Thistle

- Northcote p. 97's "The thistle was once dedicated to Thor" is about thistles in general; not applied.
- Name notes: AHPA heads it _Cnicus benedictus_ L. with _Centaurea benedicta_ as synonym; Kynes and Grieve's synonyms give _Cnicus benedictus_; Grieve's heading _Carbenia benedicta_. Cunningham and Wikipedia give the list's _Centaurea benedicta_ first. List name kept.
- Unmapped powers: none from Cunningham; "protect" in his Magical Uses filed as Protection.
- Substitutes: Grieve's Milk Thistle, Cotton Thistle and Melancholy Thistle, as typed names (none is in the pilot or this shard; Milk Thistle is plants-l-q).
- Forms left out: Kynes's dried flower heads, seeds, seed oil and flower essence are listed for thistles generally.
