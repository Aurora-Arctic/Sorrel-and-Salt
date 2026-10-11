import type { SeedCompendiumShard } from '../types';

// MB.247's shard: the resins, woods and incense, and the animal products,
// salts, waters and other preparations of the candidate list
// (claude-docs/db/compendium-seed/candidates.md), less the five the pilot
// seeds. Every value traces to a source a citation names; the sources, what
// each supports and what was left out are recorded in
// claude-docs/db/compendium-seed/resins-woods-and-other.md. Descriptions are
// written fresh from the sources, never copied.
export const RESINS_WOODS_AND_OTHER: SeedCompendiumShard = {
  name: 'resins-woods-and-other',
  sources: {
    'grieve-balsam-of-gilead': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Balsam of Gilead',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/balofg05.html',
      accessed: '2026-10-11',
    },
    'grieve-balsam-of-tolu': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Balsam of Tolu',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/baloft07.html',
      accessed: '2026-10-11',
    },
    'grieve-benzoin': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Benzoin',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/benzoi31.html',
      accessed: '2026-10-11',
    },
    'grieve-camphor': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Camphor',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/c/campho13.html',
      accessed: '2026-10-11',
    },
    'grieve-mastic': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Mastic',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/m/mastic23.html',
      accessed: '2026-10-11',
    },
    'grieve-myrrh': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Myrrh',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/m/myrrh-66.html',
      accessed: '2026-10-11',
    },
    'grieve-opoponax': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Opoponax',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/o/opopon10.html',
      accessed: '2026-10-11',
    },
    'grieve-saunders-red': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Saunders, Red',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/s/saunde22.html',
      accessed: '2026-10-11',
    },
    'grieve-storax': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Storax',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/s/storax93.html',
      accessed: '2026-10-11',
    },
    'wikipedia-agarwood': {
      kind: 'entry',
      title: 'Agarwood',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Agarwood&oldid=1377264990',
      accessed: '2026-10-11',
    },
    'wikipedia-aquilaria-malaccensis': {
      kind: 'entry',
      title: 'Aquilaria malaccensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aquilaria_malaccensis&oldid=1375040886',
      accessed: '2026-10-11',
    },
    'wikipedia-benzoin-resin': {
      kind: 'entry',
      title: 'Benzoin resin',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Benzoin_resin&oldid=1345632182',
      accessed: '2026-10-11',
    },
    'wikipedia-borneol': {
      kind: 'entry',
      title: 'Borneol',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Borneol&oldid=1347404937',
      accessed: '2026-10-11',
    },
    'wikipedia-camphora-officinarum': {
      kind: 'entry',
      title: 'Camphora officinarum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Camphora_officinarum&oldid=1376614537',
      accessed: '2026-10-11',
    },
    'wikipedia-cedrus-libani': {
      kind: 'entry',
      title: 'Cedrus libani',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cedrus_libani&oldid=1375910498',
      accessed: '2026-10-11',
    },
    'wikipedia-commiphora-gileadensis': {
      kind: 'entry',
      title: 'Commiphora gileadensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Commiphora_gileadensis&oldid=1340416434',
      accessed: '2026-10-11',
    },
    'wikipedia-commiphora-myrrha': {
      kind: 'entry',
      title: 'Commiphora myrrha',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Commiphora_myrrha&oldid=1360610915',
      accessed: '2026-10-11',
    },
    'wikipedia-commiphora-wightii': {
      kind: 'entry',
      title: 'Commiphora wightii',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Commiphora_wightii&oldid=1358332952',
      accessed: '2026-10-11',
    },
    'wikipedia-dryobalanops-aromatica': {
      kind: 'entry',
      title: 'Dryobalanops aromatica',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Dryobalanops_aromatica&oldid=1378728186',
      accessed: '2026-10-11',
    },
    'wikipedia-incense': {
      kind: 'entry',
      title: 'Incense',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Incense&oldid=1379355250',
      accessed: '2026-10-11',
    },
    'wikipedia-liquidambar-orientalis': {
      kind: 'entry',
      title: 'Liquidambar orientalis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Liquidambar_orientalis&oldid=1377213150',
      accessed: '2026-10-11',
    },
    'wikipedia-liquidambar-styraciflua': {
      kind: 'entry',
      title: 'Liquidambar styraciflua',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Liquidambar_styraciflua&oldid=1376158564',
      accessed: '2026-10-11',
    },
    'wikipedia-machilus': {
      kind: 'entry',
      title: 'Machilus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Machilus&oldid=1328058704',
      accessed: '2026-10-11',
    },
    'wikipedia-machilus-thunbergii': {
      kind: 'entry',
      title: 'Machilus thunbergii',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Machilus_thunbergii&oldid=1366579722',
      accessed: '2026-10-11',
    },
    'wikipedia-mastic-plant-resin': {
      kind: 'entry',
      title: 'Mastic (plant resin)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Mastic_(plant_resin)&oldid=1379052761',
      accessed: '2026-10-11',
    },
    'wikipedia-myroxylon-balsamum': {
      kind: 'entry',
      title: 'Myroxylon balsamum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Myroxylon_balsamum&oldid=1331011073',
      accessed: '2026-10-11',
    },
    'wikipedia-myrrh': {
      kind: 'entry',
      title: 'Myrrh',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Myrrh&oldid=1374668628',
      accessed: '2026-10-11',
    },
    'wikipedia-opopanax-perfumery': {
      kind: 'entry',
      title: 'Opopanax (perfumery)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Opopanax_(perfumery)&oldid=1316289601',
      accessed: '2026-10-11',
    },
    'wikipedia-pistacia-lentiscus': {
      kind: 'entry',
      title: 'Pistacia lentiscus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Pistacia_lentiscus&oldid=1377992474',
      accessed: '2026-10-11',
    },
    'wikipedia-pterocarpus-santalinus': {
      kind: 'entry',
      title: 'Pterocarpus santalinus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Pterocarpus_santalinus&oldid=1376728776',
      accessed: '2026-10-11',
    },
    'wikipedia-sandarac': {
      kind: 'entry',
      title: 'Sandarac',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sandarac&oldid=1363521454',
      accessed: '2026-10-11',
    },
    'wikipedia-storax-balsam': {
      kind: 'entry',
      title: 'Storax balsam',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Storax_balsam&oldid=1371950692',
      accessed: '2026-10-11',
    },
    'wikipedia-styrax-benzoin': {
      kind: 'entry',
      title: 'Styrax benzoin',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Styrax_benzoin&oldid=1213315586',
      accessed: '2026-10-11',
    },
    'wikipedia-tetraclinis': {
      kind: 'entry',
      title: 'Tetraclinis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tetraclinis&oldid=1372040826',
      accessed: '2026-10-11',
    },
    'wikipedia-tolu-balsam': {
      kind: 'entry',
      title: 'Tolu balsam',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tolu_balsam&oldid=1364527526',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Agarwood',
      canonicalName: 'Aquilaria malaccensis',
      nomenclature: 'botanical',
      description:
        'Agarwood, also sold as aloeswood, eaglewood, gaharu and oud, is the dark, fragrant, resin-soaked heartwood of trees of the genus Aquilaria. Its main source is Aquilaria malaccensis, a lign-aloe tree of the family Thymelaeaceae found from India and Bangladesh through Myanmar, Thailand and Laos to Malaysia, Singapore, Indonesia and the Philippines; A. agallocha, the name Cunningham prints, is its synonym. Healthy heartwood is pale and nearly scentless. The fragrant resin forms only when the tree defends itself against infection by a mould, Phaeoacremonium parasitica, and the wood turns dense and dark as the resin fills it. First-grade agarwood is among the costliest natural raw materials in the world, and demand, overharvesting and illegal trade have left A. malaccensis critically endangered in the wild; it has been listed under CITES Appendix II since 1995. Ancient Egyptians burned it in funeral rites, the Vedas mention it, and the Bible names it in a perfume with myrrh and cassia and among the spices used at the burial of Jesus. It is revered in Hinduism, Buddhism and Chinese folk religion, and with sandalwood it is one of the two chief ingredients of Chinese and Japanese incense, savoured in the Japanese art of kōdō. Cunningham gives it to Venus and water and to love: it was used in Egypt to draw good fortune and burned in Renaissance rites of evocation, it is carried or worn to bring love, and a little is added to other mixtures to strengthen them.',
      elements: ['water'],
      planets: ['Venus'],
      folkNames: [
        'Aloeswood',
        'Eaglewood',
        'Gaharu',
        'Oud',
        'Oudh',
        'Agar',
        'Aguru',
        'Jinkō',
        'Chénxiāng',
        'Lignum Aloes',
        'Wood Aloes',
      ],
      categories: ['Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Aloes, Wood',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-aquilaria-malaccensis',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-agarwood',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'As the resin builds up, the infected wood darkens from pale beige through yellow, orange and red to dark brown or black, and grows much heavier. In natural forests only about seven in a hundred trees of a species are infected. Chips of the wood are burned as incense, as they traditionally are in mosques, and Cunningham carries or wears the wood to attract love.',
          colors: ['yellow', 'orange', 'red', 'brown', 'black'],
          references: [
            {
              source: 'wikipedia-agarwood',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Aloes, Wood',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Oud oil is steam-distilled from the wood, and 70 kg of wood yields no more than 20 ml. More than 150 compounds have been found in it, many of them sesquiterpenes and chromones, and its scent is described as sweet, woody, balsamic, leathery, smoky and fruity. Perfumers use it as a base note, traditionally with rose; because real oud is so costly, much of what is sold is diluted with patchouli or other materials, or built from synthetic accords.',
          references: [
            {
              source: 'wikipedia-agarwood',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Balm of Gilead',
      canonicalName: 'Commiphora gileadensis',
      nomenclature: 'botanical',
      description:
        'Balm of Gilead here is Commiphora gileadensis, the Arabian balsam tree, a shrub or small tree of the Burseraceae family found in Saudi Arabia, Yemen, southern Oman and Sudan, and in south-eastern Egypt, where it may have been introduced; Grieve gives its home as the lands on both sides of the Red Sea. It grows up to about four metres, is rarely spiny, and has bark that peels or flakes when cut, leaves of three to five small leaflets, red flowers and dull red fruit striped lengthwise with white, while a snapped twig or crushed leaf gives off a pleasant scent. Cuts in the bark release a sap that soon hardens into a sweet-smelling gum, which is chewed and burned as incense. In antiquity the tree was prized for a costly perfume thought to come from it and for the healing virtues credited to its sap, wood, bark and seeds. Grieve, writing in 1931, relays Josephus on the Queen of Sheba bringing it to Solomon and its cultivation on Mount Gilead giving it its name, and Pliny on its arrival in Rome with the generals of Vespasian; she records that the juice was called opobalsamum, the twigs xylobalsamum and the fruit carpobalsamum, and that it was grown in guarded gardens near Cairo. The name has wandered: firs and poplars have borne it too, and the Wikipedia article on the species says the true ancient balm appears to have come from the unrelated Pistacia lentiscus.',
      folkNames: [
        'Arabian Balsam Tree',
        'Mecca Myrrh',
        'Balsam of Gilead',
        'Balsam Tree',
        'Balessan',
        'Bechan',
        'Baume de la Mecque',
        'Mecca Balsam',
      ],
      categories: [],
      references: [
        {
          source: 'wikipedia-commiphora-gileadensis',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'grieve-balsam-of-gilead',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-myrrh',
          supports: ['folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          references: [
            {
              source: 'grieve-balsam-of-gilead',
              supports: ['form'],
            },
            {
              source: 'wikipedia-commiphora-gileadensis',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            "Grieve records that the oil was separated from the collected juice in secret and kept under guard in the ruler's stores, yielding roughly a tenth of the juice by quantity, and that a lesser oil was probably made by boiling the leaves and wood in water.",
          references: [
            {
              source: 'grieve-balsam-of-gilead',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'The dried twigs were known as xylobalsamum. Grieve notes that the wood reached commerce in small pieces of several kinds, and that it soon loses its scent.',
          references: [
            {
              source: 'grieve-balsam-of-gilead',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Benzoin',
      canonicalName: 'Styrax benzoin',
      nomenclature: 'botanical',
      description:
        'Benzoin is the balsamic resin of Styrax benzoin, a tree native to Indochina and western Malesia and common in the forests of Sumatra, where it grows to between 12 and 30 metres and can live for 70 to 100 years. The tree makes no resin until it is wounded: harvesters cut into the trunk, and the white sap that seeps out hardens on the bark over four to six months before it is gathered, dried and shipped as loose tears or packed blocks. Resin from this species is sold as Sumatra benzoin, a dull reddish or greyish-brown material with a storax-like scent that holds cinnamic acid as well as benzoic acid; Siam benzoin comes from a different tree, Styrax tonkinensis. Benzoin has long been burned to perfume temples in the Middle and Far East, the ancient Egyptians used it in incense and perfume, and it still goes into Orthodox and Catholic church incense and is burned on charcoal in Arabia and in Hindu temples in India. Perfumers prize it as a fixative, and pharmacy knows it in compound tincture of benzoin. In Central and Eastern Europe it was believed to drive off evil spirits. Magical practice burns it to purify and cleanse, uses it as a base for incense blends, and calls on it for protection, banishing and love.',
      elements: ['air', 'water'],
      planets: ['Sun', 'Mars', 'Mercury', 'Saturn', 'Venus'],
      zodiacSigns: ['Capricorn'],
      folkNames: [
        'Ben',
        'Benjamen',
        'Gum Benzoin',
        'Sumatra Benzoin',
        'Benjamin Tree',
        'Gum Benjamin',
        'Gum Benjamin Tree',
        'Styrax',
        'Kemenyan',
        'Loban',
        'Onycha',
        'Benzoin Tree',
      ],
      deities: ['Aphrodite', 'Venus'],
      categories: ['Purification', 'Cleansing', 'Prosperity', 'Protection', 'Banishing', 'Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Benzoin',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Benzoin',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-styrax-benzoin',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-benzoin-resin',
          supports: ['description'],
        },
        {
          source: 'grieve-benzoin',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 833',
          supports: ['canonicalName', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          colors: ['brown'],
          safetyNotes:
            'The AHPA handbook rates benzoin gum resin Safety Class 1 and Interaction Class A: it can be taken safely when used appropriately, with no known contraindications, precautions or drug interactions. Allergic contact dermatitis from benzoin has been reported and confirmed by patch testing. Safety in pregnancy and breastfeeding has not been conclusively established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 833–834; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'grieve-benzoin',
              supports: ['form', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Benzoin',
              supports: ['form'],
            },
            {
              source: 'wikipedia-incense',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Borneol Camphor',
      canonicalName: 'Dryobalanops aromatica',
      nomenclature: 'botanical',
      description:
        'Borneol camphor, or Borneo camphor, is the camphor of Dryobalanops aromatica, a tall tree of the dipterocarp family, Dipterocarpaceae, native to Sumatra, peninsular Malaysia and Borneo and also called Malay or Sumatran camphor. It is an emergent tree of mixed dipterocarp forest on deep, sandy soils, reaching 65 or even 75 metres, and is one of the trees known for crown shyness. Its heavy timber is sold as kapur, and the species is assessed as vulnerable. Its camphor drew early Arab traders to Borneo, where it was once worth more than gold and went into incense and perfume; Marco Polo named Fansuri, the present-day Barus in Sumatra, as the source of the finest. Grieve describes the camphor forming as solid masses in long cavities in the heartwood of older trees, found only by cutting into the trunk, while younger trees hold an oil thought to be an early stage of it. She adds that it was used chiefly in funeral rites, and bought dear by the Chinese for embalming because it is less volatile than ordinary camphor, but was then unknown in Europe and America. The French chemist Charles Gerhardt named the compound borneol after it in 1842, and the tree is better known today as a source of borneol than of true camphor, a confusion with the laurel-family camphor tree noted since Burkill. It remains among the raw materials of incense.',
      folkNames: ['Borneo Camphor', 'Malay Camphor', 'Sumatran Camphor'],
      references: [
        {
          source: 'wikipedia-dryobalanops-aromatica',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'grieve-camphor',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-borneol',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          safetyNotes:
            "Wikipedia's article on borneol, the compound named after this camphor, says it may irritate the eyes, skin and airways and is harmful if swallowed. Short exposure may bring headache, nausea, vomiting, dizziness, light-headedness and fainting; heavier or longer exposure may cause restlessness, poor concentration, irritability and seizures. At the doses used in fine fragrance it barely irritates the skin, but skin contact can sensitise, so that later contact even with small amounts brings an allergic reaction.",
          references: [
            {
              source: 'wikipedia-incense',
              supports: ['form'],
            },
            {
              source: 'grieve-camphor',
              supports: ['form'],
            },
            {
              source: 'wikipedia-borneol',
              supports: ['safetyNotes'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Grieve calls the oil of this tree East Indian oil of camphor. It gathers in cavities in the trunks of trees too young to yield solid camphor, is less volatile than the oil of the laurel-family camphor tree and has a distinctive scent, and the Chinese prized it for embalming and for scenting soap; in her day it did not reach European or American trade.',
          references: [
            {
              source: 'grieve-camphor',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Camphor',
      canonicalName: 'Camphora officinarum',
      nomenclature: 'botanical',
      description:
        "Camphor comes from Camphora officinarum, an evergreen tree of the laurel family, Lauraceae, long known as Cinnamomum camphora and called the camphor tree, camphorwood or camphor laurel. It is native to Japan, Korea, the Ryukyu Islands and Taiwan, and has been carried to southern China, the Himalayas, eastern Australia, the south-eastern United States and elsewhere; it is now a declared weed in parts of Australia and an invasive species in Florida. The tree reaches 20 to 30 metres, with glossy leaves that smell of camphor when crushed, small white flowers and black, berry-like fruit. Camphor itself is a white crystalline substance won from the wood by steaming or sublimation, and Taiwan's camphor trade was a major industry under Japanese rule. It has served as medicine, spice, insect repellent and incense, and in making celluloid and smokeless powder, and the wood keeps moths and other insects away. Kynes records camphor in Egyptian embalming, as a medieval European fumigant against plague and an amulet against evil spirits, and burned in Hindu ritual; in Japan some old camphor trees are held sacred. Cunningham gives it to chastity, health and divination: sniffed or set beside the bed to cool desire, and burned in divinatory incense. Kynes adds cleansing and banishing, and keeping the mind in the present while awakening memories of past lives.",
      elements: ['water', 'air', 'fire', 'earth'],
      planets: ['Moon'],
      zodiacSigns: ['Cancer', 'Pisces'],
      safetyNotes:
        'The AHPA handbook rates camphor, the distillate of the wood, Safety Class 2b and 2d: not for use in pregnancy except under the supervision of a qualified healthcare practitioner, not for long-term use, not to be taken above the recommended dose, and not for children under two, with caution in small children. Taken internally it needs extreme caution: swallowing camphor products has caused many poisonings, with nausea, vomiting, abdominal pain and seizures, some of them fatal. Poisoning from products used on the skin is rare and has mostly affected small children, and products for the skin should hold no more than 11% camphor. The distillate can contain safrole. Safety while breastfeeding has not been established. Cunningham marks camphor as not recommended for internal use and warns against using it near the faces of small children.',
      folkNames: [
        'Kafoor',
        'Camphire',
        'Chang Nao',
        'Camphor Tree',
        'Camphorwood',
        'Camphor Laurel',
        'Laurel Camphor',
        'True Camphor',
        'White Camphor',
        'Gum Camphor',
      ],
      deities: ['Krishna', 'Kuan Yin', 'Shiva', 'Vishnu'],
      categories: ['Divination', 'Banishing', 'Purification'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Camphor; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Camphor',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'grieve-camphor',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-camphora-officinarum',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 213–214',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          colors: ['white'],
          references: [
            {
              source: 'grieve-camphor',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-camphora-officinarum',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Camphor oil is steam-distilled from the wood and leaves. The tree comes in several chemical types, so oils differ: some are rich in camphor itself, others in linalool, cineole, nerolidol or borneol, and the cineole type grown in Madagascar is sold as ravintsara. Grieve describes Japanese camphor oil, a by-product of camphor making that ranged from thin and watery to thick and black, used in Japan for burning, varnish and ink, and in medicine as a rubbing liniment for rheumatism, sprains and bruises.',
          references: [
            {
              source: 'wikipedia-camphora-officinarum',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-camphor',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Camphor',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'Cunningham suggests hanging a bag of camphor, or of the bark of the camphor tree, around the neck to ward off colds and flu.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Camphor',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'The wood repels insects, and Grieve notes that cabinets for natural history collections were made of it, the timber being imported for entomologists.',
          references: [
            {
              source: 'wikipedia-camphora-officinarum',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-camphor',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cedar',
      canonicalName: 'Cedrus libani',
      nomenclature: 'botanical',
      description:
        'The cedar of Lebanon, Cedrus libani, also called Lebanon or Lebanese cedar, is a large conifer of the pine family, Pinaceae, native to the mountains of the eastern Mediterranean in Lebanon, western Syria and south-central Turkey, with a variety on Cyprus. It can reach forty metres, with a massive trunk, needles in clusters along short shoots, and upright barrel-shaped cones that ripen from green to grey-brown. Its wood is fine-grained, yellow, fragrant and very durable, and resists insects. The tree appears in the Epic of Gilgamesh, whose heroes travel to a cedar forest to fell it, and often in the Bible: Moses ordered priests to treat leprosy with its bark, and Solomon built the Temple in Jerusalem with its timber. The Phoenicians built ships of it and traded it across the ancient world, and it is now the national emblem of Lebanon. Centuries of felling have left only remnants of the old forests, and large replanting schemes are under way in Turkey and Lebanon. Across the Middle East cedar wood was burned as a sacred offering, the Egyptians made perfume and incense from the resin and used cedar in embalming, and the Romans carved statues of gods and ancestors from the wood. Magical tradition burns it to purify and to banish bad dreams, hangs it in the house against lightning, keeps a piece in a purse to draw money, and burns it to awaken psychic powers.',
      elements: ['fire', 'air', 'earth', 'water'],
      planets: ['Sun', 'Jupiter', 'Mercury'],
      zodiacSigns: ['Aries', 'Sagittarius', 'Taurus'],
      folkNames: ['Cedar of Lebanon', 'Lebanon Cedar', 'Lebanese Cedar'],
      deities: [
        'Arianrhod',
        'Artemis',
        'Astarte',
        'Baal',
        'Brigid',
        'Odin',
        'Osiris',
        'Persephone',
        'Ra',
      ],
      categories: [
        'Healing',
        'Purification',
        'Protection',
        'Psychic Work',
        'Love',
        'Abundance',
        'Ancestor Work',
        'Dream Work',
        'Justice',
        'Legal Matters',
        'Fidelity',
        'Prosperity',
        'Transformation',
      ],
      substitutes: [
        {
          name: 'Eastern Red Cedar',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cedar; p. 266',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Cedar',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-cedrus-libani',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'Twigs are burned or smouldered, or made into incense, and the smoke purifies and keeps bad dreams away. A piece of cedar hung in the home guards it against lightning; a cedar stick carved into three prongs and set prongs-up in the ground near the house protects it from evil; a piece kept in a wallet or purse draws money; and a cedarwood amulet is carried in legal matters. Cedarwood incense is burned to encourage dream work and psychic abilities. The wood itself is yellow and fragrant.',
          colors: ['yellow'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cedar',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cedar',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cedrus-libani',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Cedar essential oil, called cedrum, is drawn from the timber and cones. It is used to stimulate dream work and strengthen psychic abilities, and the scent of cedar is said to help in contacting spirits.',
          references: [
            {
              source: 'wikipedia-cedrus-libani',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cedar',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Resin',
          description:
            'Cedar resin, called cedria, is drawn from the timber and cones. The ancient Egyptians made sacred perfumes and incense from it for offerings to their gods.',
          references: [
            {
              source: 'wikipedia-cedrus-libani',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cedar',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description: 'The foliage is added to love spells to strengthen them.',
          safetyNotes:
            "Cunningham's health codes mark cedar leaf (with the berry) as not to be taken internally during pregnancy.",
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Cedar',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cedar; p. 266',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Guggul',
      canonicalName: 'Commiphora wightii',
      nomenclature: 'botanical',
      description:
        'Guggul is the fragrant gum resin of Commiphora wightii, the Indian bdellium tree, a thorny shrub or small tree of the Burseraceae family that reaches about four metres, with thin papery bark, small toothed leaves of one or three leaflets, small red to pink flowers and round fruit that turn red when ripe. It is native to western India, has been carried west to southern Pakistan and the Middle East, and favours arid and semi-arid country with poor soil. The resin is gathered by tapping the bark, and the tree is grown commercially in India and Pakistan. Its scent is very close to that of myrrh, and it is taken to be the bdellium of Hebrew, Greek and Latin writers, long used in incense and perfume. Grieve, writing in 1931, describes commercial gugul as moist, dark reddish-brown lumps that soften in the warmth of the hand, stick to the teeth when chewed and smell faintly of myrrh, and says it was used in the East Indies against leprosy and rheumatism and in Europe for plasters. In India it is burned over hot coals as loose dhoop or as sticks and cones. Ayurvedic texts said to date to 600 BC mention it, and an extract, guggulipid, is sold as a supplement, though several studies found it did not lower total cholesterol. Overharvesting for medicine has made the tree so scarce in Gujarat and Rajasthan that the IUCN lists it as critically endangered.',
      folkNames: [
        'Indian Bdellium Tree',
        'Indian Bdellium',
        'Bdellium Tree',
        'Gugal',
        'Guggal',
        'Gugul',
        'Guggulu',
        'Mukul Myrrh Tree',
        'False Myrrh',
      ],
      categories: [],
      references: [
        {
          source: 'wikipedia-commiphora-wightii',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 257',
          supports: ['canonicalName', 'folkNames'],
        },
        {
          source: 'grieve-myrrh',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          safetyNotes:
            'The AHPA handbook rates guggul gum resin Safety Class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner, since it has been reported to stimulate the uterus. A single dose of guggulipid, a standardised extract, lowered blood levels of the drugs propranolol and diltiazem. Loose stools or diarrhoea are the commonest side effect, generally at doses above 2 to 4 grams, and skin rashes and allergic contact dermatitis have been reported. It may reduce platelet clumping, though no bleeding has been reported in people. Its safety while breastfeeding has not been established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 257',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-commiphora-wightii',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Incense',
          description:
            'Guggul is sold as dhoop, a loosely packed Indian incense burned over hot coals to give a dense, fragrant smoke, and also as incense sticks and cones that burn without a separate heat source.',
          references: [
            {
              source: 'wikipedia-commiphora-wightii',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-incense',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Makko',
      canonicalName: 'Machilus thunbergii',
      nomenclature: 'botanical',
      description:
        'Makko is an incense powder made from the bark of Machilus thunbergii, the Japanese bay tree, also called red machilus or tabunoki. The tree is a sturdy evergreen of the laurel family, Lauraceae, usually ten to fifteen metres tall and sometimes twenty, native to Japan, the Korean Peninsula, Taiwan, south-eastern and north-central China and Vietnam. It favours the coast, copes with salty soil, and is grown for timber and planted along streets. Where the line falls between Machilus and the closely related avocado genus, Persea, has been disputed, and the tree is also known by the synonym Persea thunbergii. In incense making, makko is one of the natural plant binders. Wetted, its mucilage holds powdered aromatic materials together; once the incense has dried and is lit, the cellulose in the powder burns to form a stable ember. A water-soluble binder of this kind keeps the dried mixture from crumbling and dilutes it, and binding powders of this sort usually make up about a tenth of the dry weight of finished incense. The bark powder of this tree has also gone into incense made to keep mosquitoes away.',
      folkNames: ['Japanese Bay Tree', 'Red Machilus', 'Tabunoki'],
      references: [
        {
          source: 'wikipedia-machilus-thunbergii',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['description'],
        },
        {
          source: 'wikipedia-machilus',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Powder',
          references: [
            {
              source: 'wikipedia-machilus-thunbergii',
              supports: ['form'],
            },
            {
              source: 'wikipedia-incense',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Mastic',
      canonicalName: 'Pistacia lentiscus',
      nomenclature: 'botanical',
      description:
        'Mastic is the resin of Pistacia lentiscus, the lentisk, a dioecious evergreen shrub or small tree of the family Anacardiaceae, native around the Mediterranean from Morocco and Iberia through southern France and Turkey to Iraq and Iran, and to the Canary Islands. It usually stands one to five metres high, smells strongly of resin, thrives on dry, rocky and even salty ground near the sea, and bears leathery compound leaves and small fruit that ripen from red to black. Although the tree grows across the region, it yields resin only in a few places, above all the south of Chios, where the mastic villages tap it, and around Çeşme in Turkey; Chios mastic carries an EU protected designation of origin. The name goes back to words for chewing, and mastic was among the first chewing gums. It flavours liqueurs, sweets, festival breads and Turkish delight, goes into varnish, and is an essential ingredient of the chrism of the Orthodox churches. Hippocrates used it against digestive trouble and colds and to sweeten the breath, Egyptians burned it as temple incense and used it in embalming, and in Greece it was a symbol of virginity. Cunningham burns it to draw a spirit into manifestation and to strengthen psychic powers, notes its old use in Middle Eastern lust potions, and adds it to any incense to lend it power; Kynes burns it to prepare ritual space and in meditation for clarity.',
      elements: ['air'],
      planets: ['Sun'],
      folkNames: [
        'Gum Mastic',
        'Masticke',
        'Pistachia Galls',
        'Mastic Tree',
        'Lentisk',
        'Lentisco',
        'Mastich',
        'Schinos',
        'Tears of Chios',
      ],
      deities: ['Artemis', 'Bacchus', 'Diana', 'Dionysus'],
      categories: ['Psychic Work', 'Manifestation', 'Lust', 'Clarity', 'Purification'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Mastic',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Mastic and Pistachio',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'grieve-mastic',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-pistacia-lentiscus',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-mastic-plant-resin',
          supports: ['description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          description:
            'Mastic is gathered from July to early October: growers clear the ground under the trees and dust it with calcium carbonate, cut the bark every few days, and let the clear drops, the tears of Chios, harden for two or three weeks before collecting and washing them by hand. The best comes as pea-sized tears or flattened pieces, pale yellow and darkening with age, which soften when chewed and turn bright white. The taste is bitter at first, then fresh and pine-like. Hardened mastic can be burned as incense, as frankincense is.',
          colors: ['yellow'],
          safetyNotes:
            'Assessing mastic in 2016, the European Medicines Agency found that its clinical studies raised no significant safety concerns, but for lack of data it does not recommend mastic for children or during pregnancy or breastfeeding.',
          references: [
            {
              source: 'wikipedia-mastic-plant-resin',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'grieve-mastic',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Mastic',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Mastic and Pistachio',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Myrrh',
      canonicalName: 'Commiphora myrrha',
      nomenclature: 'botanical',
      description:
        'Myrrh is the aromatic gum resin of Commiphora myrrha, a very spiny tree of the Burseraceae family that grows to about five metres, with a papery outer bark over a green inner layer. It is native to Somalia, Djibouti, Eritrea, the Somali regions of Ethiopia and Kenya, and Yemen and Oman, where it favours arid slopes and thin limestone soils; Somalia is now the largest producer. Cuts in the bark release a pale yellow resin that sets into reddish-brown tears, bitter and aromatic to the taste, which darken further with age. Several other Commiphora species yield resin sold under the same name. Myrrh has been traded for more than three thousand years. The Egyptians embalmed with it and burned it to Ra and in the temples of Isis; the Hebrew Bible puts it in the holy anointing oil and the temple incense, the Gospel of Matthew names it among the gifts of the Magi, and Orthodox, Catholic and Anglican churches still burn it and use it in preparing chrism. Greek myth has Adonis born from a myrrh tree, and medieval Europe burned it to drive out unwanted spirits. Magical practice seldom burns it alone, pairing it with frankincense to purify a space, bring peace, consecrate tools and amulets, and lend strength to healing and protective work; it is said to add power to any incense it joins.',
      elements: ['air', 'water'],
      planets: ['Moon', 'Sun'],
      zodiacSigns: ['Aquarius', 'Cancer', 'Capricorn', 'Scorpio'],
      folkNames: [
        'Gum Myrrh Tree',
        'Karan',
        'Mirra Balsom Odendron',
        'Common Myrrh',
        'Herabol Myrrh',
        'True Myrrh',
        'Somali Myrrh',
        'Hirabol Myrrh',
        'Bola',
        'Mo Yao',
      ],
      deities: [
        'Isis',
        'Adonis',
        'Ra',
        'Aphrodite',
        'Cybele',
        'Demeter',
        'Hecate',
        'Horus',
        'Juno',
        'Rhea',
        'Saturn',
      ],
      categories: [
        'Protection',
        'Healing',
        'Purification',
        'Peace',
        'Meditation',
        'Banishing',
        'Manifestation',
        'Release',
        'Transformation',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Myrrh',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'folkNames',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Myrrh',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-commiphora-myrrha',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-myrrh',
          supports: ['description'],
        },
        {
          source: 'grieve-myrrh',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 255',
          supports: ['canonicalName', 'folkNames'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          safetyNotes:
            'The AHPA handbook rates myrrh gum resin Safety Class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner. Kynes calls myrrh a potential abortifacient, and Cunningham marks it not to be taken internally in pregnancy. Doses above 2 to 4 grams may irritate the kidneys and cause diarrhoea. Contact dermatitis and wider allergic reactions have been reported, and its bitter taste may bring on nausea and vomiting in people with sensitive stomachs. Its safety while breastfeeding has not been established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 255',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Myrrh',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Myrrh; p. 266',
              supports: ['safetyNotes'],
            },
            {
              source: 'wikipedia-myrrh',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Grieve describes the oil of myrrh as thick and pale yellow. Oil of myrrh appears in the Book of Esther as part of a six-month purification, and the Eastern Orthodox Church uses oil scented with myrrh for chrismation. Kynes suggests diffusing a little of the essential oil during meditation to help release emotional or spiritual blockages, opening the way to healing and transformation.',
          references: [
            {
              source: 'wikipedia-myrrh',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Myrrh',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-myrrh',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Opoponax',
      canonicalName: 'Commiphora guidottii',
      nomenclature: 'botanical',
      description:
        "Opoponax, also spelt opopanax, is the perfumery trade name for bisabol, the fragrant oleo-gum-resin of Commiphora guidottii, a tree of Somalia and Ethiopia called hadi in Somali. The resin has been exported from Somalia since ancient times, and Somali names for it include hebbakhade, habaghadi and habak hadi; in English it has been called sweet, scented or perfumed myrrh and perfumed bdellium. The name first belonged to something else: the gum resin of plants of the genus Opopanax, used in herbal medicine, which Grieve in 1931 describes as the sun-dried juice from the stem base of Opopanax chironium, a yellow-flowered umbellifer of the Levant and southern Europe. Early in the twentieth century perfumers began applying the name to bisabol, which has now almost entirely replaced the original in trade, and the spelling opoponax is often used to keep the two apart. The perfumery resin was long wrongly credited to Commiphora erythraea, and Kynes still lists opopanax as a name for that tree's sweet myrrh. A similar resin from Commiphora holtziana, called habak hagar in Somali, is sometimes sold as opopanax as well, partly because the two smell alike, though hadi's is counted the stronger. Perfumers make a resinoid from it by solvent extraction, and it features in well-known perfumes such as Guerlain's Shalimar. Opoponax is also among the raw resins used to make incense.",
      folkNames: [
        'Opopanax',
        'Bisabol',
        'Bissabol',
        'Hadi',
        'Hebbakhade',
        'Habaghadi',
        'Habak Hadi',
        'Habbak Haddi',
        'Sweet Myrrh',
        'Scented Myrrh',
        'Perfumed Myrrh',
        'Perfumed Bdellium',
        "Perfumery's Opopanax",
      ],
      categories: [],
      references: [
        {
          source: 'wikipedia-opopanax-perfumery',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'grieve-opoponax',
          supports: ['description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Myrrh',
          supports: ['description'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          references: [
            {
              source: 'wikipedia-opopanax-perfumery',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Red Sandalwood',
      canonicalName: 'Pterocarpus santalinus',
      nomenclature: 'botanical',
      description:
        'Red sandalwood, or red saunders, is the heartwood of Pterocarpus santalinus, a small tree of the legume family, Fabaceae, endemic to the southern Eastern Ghats of South India. Despite its name, which its Indian names share, it is no relation of the fragrant white sandalwood, Santalum album. The tree grows to about eight metres, quickly when young but killed by frost, with leaves of three leaflets, short sprays of yellow flowers and pods holding one or two seeds. Its wood is heavy and dense, reddish or blackish brown outside and a deep blood-red within, banded with paler red, and has only a faint smell. Its chief traditional use was as a dye: in India it was mixed with sappan wood to colour silk, cotton and wool, and pharmacists used its red colouring principle, santalin, to tint tinctures. In China the wood, called zitan, has long been prized for fine furniture, above all under the Qing dynasty. It has a place in traditional herbal medicine too, and Grieve records it as astringent and tonic, used medicinally chiefly in India. Because its timber fetches high prices the species has been overexploited, illegal trade remains a problem, and international trade is controlled under CITES Appendix II. In magic Cunningham assigns it to Venus, to water and to love: it is burned to draw love, and sprinkled about a place to cleanse it of negativity.',
      elements: ['water'],
      planets: ['Venus'],
      colors: ['red'],
      safetyNotes:
        'The AHPA handbook rates red saunders heartwood Safety Class 1 and Interaction Class A: no known contraindications, precautions or drug interactions. Allergic contact dermatitis from it has been reported. An animal study found that it may change how the body regulates blood sugar, so people with diabetes are advised to watch their blood sugar closely and talk to a qualified healthcare practitioner before using it. Its safety in pregnancy and while breastfeeding has not been conclusively established.',
      folkNames: [
        'Red Saunders',
        'Red Sanders',
        'Red Sandal',
        'Red Santal Wood',
        'Rubywood',
        'Rakta Chandana',
        'Yerra Chandanam',
        'Zitan',
      ],
      categories: ['Love', 'Cleansing'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Sandalwood, Red',
          supports: ['canonicalName', 'elements', 'planets', 'categories', 'description'],
        },
        {
          source: 'grieve-saunders-red',
          supports: ['canonicalName', 'description', 'colors', 'folkNames'],
        },
        {
          source: 'wikipedia-pterocarpus-santalinus',
          supports: ['canonicalName', 'nomenclature', 'description', 'colors', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 709–710',
          supports: ['canonicalName', 'description', 'safetyNotes', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 709',
              supports: ['form'],
            },
            {
              source: 'grieve-saunders-red',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Sandalwood, Red',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Pharmacists handled the wood as chips, raspings or a coarse red powder. Its colouring dissolves readily in strong alcohol but hardly at all in water, and partly in some essential oils, among them lavender, rosemary and clove; it is one of the colouring agents of compound tincture of lavender.',
          colors: ['red'],
          references: [
            {
              source: 'grieve-saunders-red',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sandarac',
      canonicalName: 'Tetraclinis articulata',
      nomenclature: 'botanical',
      description:
        "Sandarac is the resin of Tetraclinis articulata, the sandarac tree, also called arar or Barbary thuja: the sole living species of its genus, a conifer of the cypress family that older texts placed in Thuja or Callitris. It grows wild in the Atlas Mountains of Morocco, Algeria and Tunisia, with small outlying stands on Malta and near Cartagena in Spain, at low altitudes in a hot, dry climate, and it is Malta's national tree. It is a small, slow-growing tree, often with several trunks, carrying sprays of tiny scale leaves and four-scaled cones, and is one of the few conifers that can regrow from a cut stump. The resin seeps from the stems of its own accord or from cuts in the bark and hardens in the air into small translucent chips with a faint yellow tinge; Morocco is its main source. In Renaissance Italy 'varnish' usually meant sandarac, and it is still valued for coating paintings and antiques; nineteenth-century photographers varnished their negatives and prints with it. Though only faintly aromatic, it has long been burned as incense, its scent likened to balsam. The Greeks and Romans used the word for red arsenic sulfide, and the resin meaning reached Europe from Arabic only in the early sixteenth century. Cunningham calls it gum juniper and assigns it to the Sun and the element of fire.",
      elements: ['fire'],
      planets: ['Sun'],
      folkNames: [
        'Gum Juniper',
        'Sandarach',
        'Arabian Sandarac',
        'Sandarac Tree',
        'Arar',
        'Araar',
        'Sictus Tree',
        'Barbary Thuja',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Sandarac, Gum',
          supports: ['canonicalName', 'description', 'elements', 'planets', 'folkNames'],
        },
        {
          source: 'wikipedia-tetraclinis',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-sandarac',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          colors: ['yellow'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Sandarac, Gum',
              supports: ['form'],
            },
            {
              source: 'wikipedia-sandarac',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'The wood, sold as thuya or citron wood and known in antiquity as thyine wood, has been prized for decorative work since ancient times, above all the burls that form at the base of old trees that have resprouted again and again; the Romans made costly furniture from it. The present Moroccan trade in burls is unsustainable and has caused heavy loss of the trees.',
          references: [
            {
              source: 'wikipedia-tetraclinis',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Storax',
      canonicalName: 'Liquidambar orientalis',
      nomenclature: 'botanical',
      description:
        'Storax here is Liquidambar orientalis, the oriental or Turkish sweetgum, a deciduous tree of 30 to 35 metres native to the eastern Mediterranean, where it grows in pure stands mainly on the floodplains of south-western Turkey and on Rhodes. Its wounded bark gives a fragrant balsam, liquid storax: the inner bark is stripped, softened in boiling water and pressed, yielding a soft, sticky, greyish-brown mass about as thick as honey, and the spent bark was itself sold as storax bark. The name has caused centuries of confusion, since storax is also a name for benzoin from Styrax trees and for the solid resin of Styrax officinalis, and scholars still debate which of them was the storax of the ancients. Herodotus, Aristotle, Theophrastus and Strabo mention a storax tree and its balsam, Pliny knew storax as a perfume, the Greek Magical Papyri call for it in several rites, and Dioscorides describes it burned as incense much like frankincense; later it was burned in churches and mosques and in French medieval magic. The tree is now endangered, its forests lost to farmland and to dams built where it grew. In magical practice storax is burned for protection, for divination and to break hexes, and its oil purifies ritual tools and space.',
      elements: ['fire', 'earth', 'water'],
      planets: ['Sun', 'Jupiter', 'Mercury', 'Moon'],
      folkNames: [
        'Styrax',
        'Levant Storax',
        'Liquid Storax',
        'Asian Storax',
        'Levant Stracte',
        'Oriental Sweet Gum',
        'Turkish Sweet Gum',
        'Liquidambar',
        'Rosemalloes',
      ],
      deities: ['Demeter', 'Dionysus', 'Hecate', 'Zeus'],
      categories: ['Protection', 'Divination', 'Prosperity', 'Purification', 'Hex-Breaking'],
      substitutes: [
        {
          name: 'Siam Benzoin',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Liquidamber; s.v. Benzoin',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Storax',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-liquidambar-orientalis',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-storax-balsam',
          supports: ['description'],
        },
        {
          source: 'grieve-storax',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          description:
            "Liquid storax, as imported, is a soft, viscous, opaque balsam the consistency of honey, greyish-brown and holding some water; refined with spirit it becomes prepared storax, a clearer brownish-yellow balsam. It is rich in cinnamic acid and its esters, smells balsamic, floral and leathery, and is used in flavours, fragrances and Friar's Balsam.",
          colors: ['brown'],
          safetyNotes: 'Storax resin is generally recognised as safe (GRAS) at low levels.',
          references: [
            {
              source: 'grieve-storax',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-storax-balsam',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Storax',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'A light yellow essential oil is steam-distilled from the balsam. Kynes suggests diffusing a little of it to purify magical tools or to prepare a space for ritual.',
          categories: ['Purification'],
          references: [
            {
              source: 'wikipedia-liquidambar-orientalis',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Storax',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'Once the balsam has been boiled and pressed out of it, the spent inner bark is made into fragrant, leaf-like cakes sold as storax bark, also called Cortex Thymiamatis or Cortex Thuris. Cunningham gives liquidambar bark as a substitute for storax bark.',
          references: [
            {
              source: 'grieve-storax',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Liquidamber',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sweet Gum',
      canonicalName: 'Liquidambar styraciflua',
      nomenclature: 'botanical',
      description:
        'Sweet gum is Liquidambar styraciflua, the American sweetgum, a deciduous tree of the warm temperate east of North America and the tropical mountains of Mexico and Central America, now placed in the family Altingiaceae. It is one of the commonest hardwoods of the south-eastern United States and is widely planted for its glossy, star-shaped, five-lobed leaves, which turn yellow, orange, red and purple in autumn. Its hard, spiny, ball-shaped fruits hang on through the winter and litter the ground below, where they are known as gumballs. Wounded bark gives a fragrant gum, called liquid amber or copalm balsam, which has often been confused with the liquid storax of its Turkish relative, L. orientalis. The genus name joins Latin and Arabic words for fluid amber, and the species name means flowing with storax. Juan de Grijalva told of the Maya presenting his party, in 1517, with reeds filled with dried herbs and liquid amber that gave off a pleasant smell when lit; the Aztecs flavoured tobacco with sweet gum, and in Yucatán it was burned as temple incense. In magical practice the seed pods are set on the altar or held during rites for protection against evil forces.',
      elements: ['fire'],
      planets: ['Sun'],
      folkNames: [
        'American Sweetgum',
        'American Storax',
        'American Styrax',
        "Witch's Burr",
        'Witch Burr',
        'Voodoo Witch Burr',
        'Liquidambar',
        'Redgum',
        'Bilsted',
        'Hazel Pine',
        'Satin-Walnut',
        'Star-Leaved Gum',
        'Alligatorwood',
        'Gumball Tree',
      ],
      categories: ['Protection'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Storax',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'cunningham-herbs',
          locator: 's.v. Liquidamber',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-liquidambar-styraciflua',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'grieve-storax',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          description:
            'The gum seeps from wounded bark and is also got by stripping, boiling and pressing the bark. It is a native balsam like turpentine, clear, reddish or yellow, with a pleasant smell likened to ambergris, and it hardens as it ages. It has been used in medicine and to make chewing gum, and has been called liquidambar, liquid storax or copalm balsam.',
          colors: ['yellow'],
          references: [
            {
              source: 'wikipedia-liquidambar-styraciflua',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-storax',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Pod',
          description:
            'The fruit is a hard, dry globe of 40 to 60 two-spiked capsules, 25 to 38 mm across, that hangs on the tree through the winter; fallen ones are called gumballs, burr balls or sticker balls. Cunningham places the seed pods on the altar or holds them during rites for protection against evil forces.',
          categories: ['Protection'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Liquidamber',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-liquidambar-styraciflua',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Storax',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'Grieve records a syrup of the bark used for diarrhoea and dysentery in the western United States.',
          references: [
            {
              source: 'grieve-storax',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Tolu Balsam',
      canonicalName: 'Myroxylon balsamum var. balsamum',
      nomenclature: 'botanical',
      description:
        'Tolu balsam, or balsam of Tolu, is the fragrant resin tapped from the living trunks of Myroxylon balsamum var. balsamum, a South American tree of the legume family; another variety of the same species gives balsam of Peru, with which tolu is often confused. The species is a large, slow-growing tree up to 45 metres tall, native to tropical forest from southern Mexico to the Amazon regions of Peru and Brazil, and the balsam comes from Colombia, Peru and Venezuela. Collectors cut V-shaped wounds in the trunk and catch the flow in calabash cups. Fresh, the balsam is a brownish, sticky, semi-liquid mass; in air it turns hard and brittle, softening again when warmed, and its scent recalls vanilla or benzoin and is most fragrant when it is burned. It is named after Tolú in Colombia, from where it was shipped to Europe, and the solvent toluene, isolated from it in 1841, is named after it. Tolu has long been the basis of cough syrups and lozenges, and perfumers use it as a fixative for its warm, mellow, slightly spicy scent. Incense and pastilles are made from it, and it appears among the common raw materials of incense-making. It is a well-known cause of contact allergy.',
      folkNames: [
        'Balsam of Tolu',
        'Tolu',
        'Tolu Balsam Tree',
        'Opobalsam',
        'Balsamum Tolutanum',
        'Balsamum Americanum',
      ],
      references: [
        {
          source: 'wikipedia-tolu-balsam',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-myroxylon-balsamum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-balsam-of-tolu',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 591',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          colors: ['brown'],
          safetyNotes:
            'The AHPA handbook rates tolu balsam Safety Class 2d (specific use restrictions) and Interaction Class A. It should not be used by anyone with a fever, and it may irritate the kidneys. Allergic reactions and sensitisation to it are relatively common, after use on the skin or by mouth. Safety in pregnancy and breastfeeding has not been conclusively established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 591; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-tolu-balsam',
              supports: ['form', 'colors'],
            },
            {
              source: 'grieve-balsam-of-tolu',
              supports: ['form', 'colors'],
            },
          ],
        },
      ],
    },
  ],
};
