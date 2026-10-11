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
    'grieve-dragons-blood': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: "Dragon's Blood",
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/d/dragon20.html',
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
    'inchem-icsc-0184': {
      kind: 'web_page',
      title: 'ICSC 0184 - POTASSIUM NITRATE',
      container: 'IPCS INCHEM',
      publisher: 'ILO and WHO',
      url: 'https://www.inchem.org/documents/icsc/icsc/eics0184.htm',
      accessed: '2026-10-11',
    },
    'wikipedia-agarwood': {
      kind: 'entry',
      title: 'Agarwood',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Agarwood&oldid=1377264990',
      accessed: '2026-10-11',
    },
    'wikipedia-agathis-australis': {
      kind: 'entry',
      title: 'Agathis australis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Agathis_australis&oldid=1379362581',
      accessed: '2026-10-11',
    },
    'wikipedia-ammonoidea': {
      kind: 'entry',
      title: 'Ammonoidea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ammonoidea&oldid=1376230437',
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
    'wikipedia-boswellia-papyrifera': {
      kind: 'entry',
      title: 'Boswellia papyrifera',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Boswellia_papyrifera&oldid=1130087828',
      accessed: '2026-10-11',
    },
    'wikipedia-brick': {
      kind: 'entry',
      title: 'Brick',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Brick&oldid=1378498497',
      accessed: '2026-10-11',
    },
    'wikipedia-bursera-fagaroides': {
      kind: 'entry',
      title: 'Bursera fagaroides',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bursera_fagaroides&oldid=1366164770',
      accessed: '2026-10-11',
    },
    'wikipedia-calamus-draco': {
      kind: 'entry',
      title: 'Calamus draco',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Calamus_draco&oldid=1341057436',
      accessed: '2026-10-11',
    },
    'wikipedia-camphora-officinarum': {
      kind: 'entry',
      title: 'Camphora officinarum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Camphora_officinarum&oldid=1376614537',
      accessed: '2026-10-11',
    },
    'wikipedia-cat': {
      kind: 'entry',
      title: 'Cat',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cat&oldid=1379079153',
      accessed: '2026-10-11',
    },
    'wikipedia-cedrus-libani': {
      kind: 'entry',
      title: 'Cedrus libani',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cedrus_libani&oldid=1375910498',
      accessed: '2026-10-11',
    },
    'wikipedia-charcoal': {
      kind: 'entry',
      title: 'Charcoal',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Charcoal&oldid=1377234214',
      accessed: '2026-10-11',
    },
    'wikipedia-chicken': {
      kind: 'entry',
      title: 'Chicken',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chicken&oldid=1376327081',
      accessed: '2026-10-11',
    },
    'wikipedia-cistus-ladanifer': {
      kind: 'entry',
      title: 'Cistus ladanifer',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cistus_ladanifer&oldid=1365200213',
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
    'wikipedia-copal': {
      kind: 'entry',
      title: 'Copal',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Copal&oldid=1285021308',
      accessed: '2026-10-11',
    },
    'wikipedia-cowrie': {
      kind: 'entry',
      title: 'Cowrie',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cowrie&oldid=1374245397',
      accessed: '2026-10-11',
    },
    'wikipedia-dragon-s-blood': {
      kind: 'entry',
      title: "Dragon's blood",
      container: 'Wikipedia',
      url: "https://en.wikipedia.org/w/index.php?title=Dragon's_blood&oldid=1371168012",
      accessed: '2026-10-11',
    },
    'wikipedia-dried-cat': {
      kind: 'entry',
      title: 'Dried cat',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Dried_cat&oldid=1307600883',
      accessed: '2026-10-11',
    },
    'wikipedia-dryobalanops-aromatica': {
      kind: 'entry',
      title: 'Dryobalanops aromatica',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Dryobalanops_aromatica&oldid=1378728186',
      accessed: '2026-10-11',
    },
    'wikipedia-eggs-as-food': {
      kind: 'entry',
      title: 'Eggs as food',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Eggs_as_food&oldid=1372838503',
      accessed: '2026-10-11',
    },
    'wikipedia-frankincense': {
      kind: 'entry',
      title: 'Frankincense',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Frankincense&oldid=1375501301',
      accessed: '2026-10-11',
    },
    'wikipedia-goofer-dust': {
      kind: 'entry',
      title: 'Goofer dust',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Goofer_dust&oldid=1367193680',
      accessed: '2026-10-11',
    },
    'wikipedia-hierochloe-odorata': {
      kind: 'entry',
      title: 'Hierochloe odorata',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hierochloe_odorata&oldid=1377677190',
      accessed: '2026-10-11',
    },
    'wikipedia-hoodoo-spirituality': {
      kind: 'entry',
      title: 'Hoodoo (spirituality)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hoodoo_(spirituality)&oldid=1378667712',
      accessed: '2026-10-11',
    },
    'wikipedia-incense': {
      kind: 'entry',
      title: 'Incense',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Incense&oldid=1379355250',
      accessed: '2026-10-11',
    },
    'wikipedia-kauri-gum': {
      kind: 'entry',
      title: 'Kauri gum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Kauri_gum&oldid=1379363149',
      accessed: '2026-10-11',
    },
    'wikipedia-labdanum': {
      kind: 'entry',
      title: 'Labdanum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Labdanum&oldid=1340458627',
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
    'wikipedia-nacre': {
      kind: 'entry',
      title: 'Nacre',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Nacre&oldid=1369618486',
      accessed: '2026-10-11',
    },
    'wikipedia-oomancy': {
      kind: 'entry',
      title: 'Oomancy',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Oomancy&oldid=1359870192',
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
    'wikipedia-potassium-alum': {
      kind: 'entry',
      title: 'Potassium alum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Potassium_alum&oldid=1378455930',
      accessed: '2026-10-11',
    },
    'wikipedia-potassium-nitrate': {
      kind: 'entry',
      title: 'Potassium nitrate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Potassium_nitrate&oldid=1372210405',
      accessed: '2026-10-11',
    },
    'wikipedia-precious-coral': {
      kind: 'entry',
      title: 'Precious coral',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Precious_coral&oldid=1370924955',
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
    'wikipedia-snake': {
      kind: 'entry',
      title: 'Snake',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Snake&oldid=1377728591',
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
    'wikipedia-sucrose': {
      kind: 'entry',
      title: 'Sucrose',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sucrose&oldid=1379002587',
      accessed: '2026-10-11',
    },
    'wikipedia-sugar': {
      kind: 'entry',
      title: 'Sugar',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sugar&oldid=1379406046',
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
    'wikipedia-vinegar': {
      kind: 'entry',
      title: 'Vinegar',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Vinegar&oldid=1379002761',
      accessed: '2026-10-11',
    },
    'wikipedia-whisky': {
      kind: 'entry',
      title: 'Whisky',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Whisky&oldid=1378883614',
      accessed: '2026-10-11',
    },
    'wikipedia-witch-bottle': {
      kind: 'entry',
      title: 'Witch bottle',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Witch_bottle&oldid=1368142800',
      accessed: '2026-10-11',
    },
    'wikipedia-wood-ash': {
      kind: 'entry',
      title: 'Wood ash',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Wood_ash&oldid=1379373761',
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
      name: 'Alum',
      canonicalName: 'Potassium alum',
      nomenclature: 'chemical',
      description:
        "Alum, in its commonest sense, is potassium alum: a double sulphate of potassium and aluminium, usually met as a hydrate holding twelve molecules of water, which forms white, octahedral crystals that dissolve readily and taste astringent. It turns up in nature as crusts of the mineral alum-(K) on weathered rock, and was long made from alunite; today it is manufactured from potassium and aluminium sulphates. It is one of the few compounds the ancients could find fairly pure, and Mesopotamian craftsmen used it in glass-making, tanning, dyeing and medicine, while Pliny knew it as alumen. For centuries it fixed dyes in wool, and the trade in it was one cause of war between Genoa and Venice. It still clears cloudy water, tans leather, fireproofs cloth and leavens some baking, and a block of it is rubbed on the skin after shaving or sold as a deodorant crystal. Cunningham gives alum to Saturn and to Earth and names protection as its one power: it has been worn as an amulet against evil in Egypt and along the north coast of Africa, a piece is kept in the home to guard it, and small amounts are sewn into children's hats to protect them.",
      elements: ['earth'],
      planets: ['Saturn'],
      colors: ['white'],
      safetyNotes: 'Used as a deodorant, potassium alum may mildly irritate the skin.',
      folkNames: ['Potash alum', 'Tawas'],
      categories: ['Protection'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 68',
          supports: ['description', 'elements', 'planets', 'categories'],
        },
        {
          source: 'wikipedia-potassium-alum',
          supports: [
            'canonicalName',
            'nomenclature',
            'description',
            'colors',
            'safetyNotes',
            'folkNames',
          ],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 68',
              supports: ['form'],
            },
            {
              source: 'wikipedia-potassium-alum',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Ground potassium alum is sold as alum powder in the spice section of many American grocery shops. Its main use in the kitchen is in pickling, where it helps keep fruit and vegetables crisp.',
          references: [
            {
              source: 'wikipedia-potassium-alum',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Ammonite',
      canonicalName: 'Ammonoidea',
      nomenclature: 'zoological',
      description:
        "Ammonites are the fossils of the ammonoids, an extinct subclass of cephalopod molluscs, nearer kin to octopuses, squid and cuttlefish than to the nautilus whose coiled shell they resemble. They first appeared in the Early Devonian, around 410 million years ago, and the last died out at or soon after the mass extinction of 66 million years ago. More than 10,000 species have been described, and they serve geologists as index fossils, tying the rock layers they lie in to particular periods. What survives is mostly the shell, usually a flat spiral divided into chambers. Pliny called them horns of Ammon, after the ram-horned Egyptian god, and the name ammonite comes from that. In medieval Europe they were taken for snakes turned to stone, called snakestones or serpentstones, linked with Hilda of Whitby and Saint Patrick, and credited with healing and oracular powers; traders sometimes carved a snake's head on them. Others called them salagrana and used them to ward off witches. Hindus hold the ammonites of the Gandaki River in Nepal, called Shaligrams, to be a manifestation of Vishnu. Cunningham records that ammonites, called Draconites in the Middle Ages, were thought to be stones from dragons' heads and were bound to the left arm for protection; fossils of every kind are also worn to lengthen life.",
      deities: ['Vishnu'],
      folkNames: ['Snake Stone', 'Serpentstone', 'Draconites', 'Salagrana', 'Shaligram'],
      categories: ['Protection', 'Longevity', 'Healing', 'Warding'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 96–97',
          supports: ['description', 'folkNames', 'categories'],
        },
        {
          source: 'wikipedia-ammonoidea',
          supports: [
            'canonicalName',
            'nomenclature',
            'description',
            'deities',
            'folkNames',
            'categories',
          ],
        },
      ],
      variants: [
        {
          form: 'Shell',
          references: [
            {
              source: 'wikipedia-ammonoidea',
              supports: ['form'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 97',
              supports: ['form'],
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
      name: 'Cat',
      canonicalName: 'Felis catus',
      nomenclature: 'zoological',
      description:
        'The cat, Felis catus, also called the domestic or house cat, is a small meat-eating mammal of the family Felidae and the only member of that family ever domesticated. It hunts alone, chiefly at dawn and dusk, with retractable claws, quick reflexes, hearing keen enough to catch sounds too faint or high for people, and good sight in poor light. Its taming began in the Near East: the earliest sign, a tamed African wildcat buried near a human grave on Cyprus, dates to about 7500 BCE, when wildcats were probably drawn to early farming settlements by their mice. Some 600 million cats now live around the world. Ancient Egypt revered them: Bastet was often shown in cat form and Sekhmet with a cat-like head, the Book of the Dead lets a cat stand for Ra, and dead cats were embalmed and buried at Bubastis and in other great cat cemeteries. The Greeks later gave Bastet’s cat associations to Artemis, and in Ovid’s Metamorphoses Diana takes the shape of a cat. Many cultures hold superstitions about cats, from the bad luck of a black cat crossing one’s path to the belief that cats serve witches as familiar spirits, and ships long carried them as good-luck charms. In Britain, northern Europe and North America, dried cats were often hidden in the fabric of buildings, sometimes alongside witch bottles.',
      deities: ['Bastet', 'Sekhmet', 'Ra', 'Artemis', 'Diana'],
      categories: ['Familiar Work'],
      references: [
        {
          source: 'wikipedia-cat',
          supports: ['canonicalName', 'nomenclature', 'description', 'deities', 'categories'],
        },
        {
          source: 'wikipedia-dried-cat',
          supports: ['description', 'deities'],
        },
        {
          source: 'wikipedia-witch-bottle',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Specimen',
          description:
            'A dried or mummified cat, hidden inside the walls or structure of a building, a custom found since at least the early modern period in the British Isles, northern Europe and North America, often in houses that also hold concealed shoes and witch bottles. Some cats were posed as if attacking, or laid with dried rats, mice or birds. The practice was meant to bring good luck, or to ward off evil spirits and protect the building and the people in it. Study of the cats recovered shows that most were placed there after death rather than walled up alive.',
          categories: ['Protection', 'Warding'],
          references: [
            {
              source: 'wikipedia-dried-cat',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-witch-bottle',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Claw',
          description:
            'A cat can push its claws out and draw them back. At rest they lie sheathed in the skin and fur around the toe pads, which keeps them sharp, and those of the forefeet are usually the sharper. Most cats have five claws on each front paw and four on each hind paw, and a cat sheds the outer layer of its claw sheaths when it scratches a rough surface.',
          references: [
            {
              source: 'wikipedia-cat',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Skin',
          description:
            'Cat pelts have been put to superstitious use in witchcraft, and in Switzerland they are still made into blankets as a traditional remedy thought to cure rheumatism. Cat fur has also gone into coats, hats, gloves and other goods, a trade outlawed in the United States since 2000 and in the European Union and the United Kingdom since 2007.',
          references: [
            {
              source: 'wikipedia-cat',
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
      name: 'Charcoal',
      nomenclature: 'none',
      description:
        'Charcoal is a light, black residue of carbon left when wood, or other plant or animal matter, is heated strongly with little oxygen so that its water and volatile substances are driven off. Traditionally the heat came from burning part of the wood itself, stacked in a kiln or a conical pile; modern makers carbonise wood in closed retorts. Demand for it long drove deforestation, as in central Europe. It has fuelled forges and iron smelting, cooking and heating, and has been ground for black pigment and for black powder, while activated charcoal is used in poison control. In incense it plays two parts. Resins such as frankincense and myrrh do not burn on their own and are traditionally heated on charcoal or glowing embers, while powdered charcoal is the fuel of many self-burning incenses, kept smouldering by a nitrate oxidiser, and goes into the paste on Indian stick incense. Cunningham sets loose, granular incense on a lit charcoal block in a censer or a dish half-filled with salt or sand, sprinkling on a little every few minutes; he also burns essential oils on charcoal blocks, and pours powdered jet on a glowing block so that its fumes can be used for scrying. In Hoodoo a small bag of salt and charcoal was carried for protection against evil spirits, and charcoal is among the empowering medicines placed in the Kongo-derived minkisi bundles that archaeologists found in a house in Annapolis, Maryland.',
      colors: ['black'],
      categories: ['Protection'],
      references: [
        {
          source: 'wikipedia-charcoal',
          supports: ['nomenclature', 'description', 'colors'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['description'],
        },
        {
          source: 'cunningham-herbs',
          locator: 'ch. 3, s.v. Oils; s.v. Incense',
          supports: ['description'],
        },
        {
          source: 'cunningham-crystals',
          locator: 'p. 106',
          supports: ['description'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description', 'categories'],
        },
      ],
      variants: [
        {
          form: 'Charcoal',
          references: [
            {
              source: 'wikipedia-charcoal',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 'ch. 3, s.v. Incense',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Ground charcoal, or wood powder, is the fuel in many direct-burning incenses, where an oxidiser such as potassium or sodium nitrate keeps it burning; the mixture resembles black powder without the sulphur. Ground fine, charcoal also goes into the black powder of fireworks, where it throws golden sparks, and was long used as a black pigment.',
          references: [
            {
              source: 'wikipedia-incense',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-charcoal',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Copal',
      canonicalName: 'Bursera fagaroides',
      nomenclature: 'botanical',
      description:
        "Copal is a broad name for aromatic tree resins, from the Nahuatl copalli, meaning incense. Wikipedia's article on copal centres on the Mesoamerican copal tree, Protium copal, and Cunningham notes that more than three hundred copals are traded around the world. He heads his Copal entry with Bursera odorata and B. fagaroides, and Wikipedia lists B. odorata as a synonym of Bursera fagaroides, the species this entry names. Called torchwood copal or fragrant bursera in English, it is a shrub or tree of up to ten metres with a swollen trunk, peeling red-tinged bark, pinnate leaves and white flowers. It grows across much of Mexico, from Sonora to Oaxaca, in desert and subtropical scrub on shallow, rocky and often limestone ground, and reaches just into Arizona, where it may now have died out. In Mexico its gum has been put on scorpion stings and insect bites, and gardeners grow it as an ornamental and train it as bonsai. Indigenous peoples of Mexico and Central America still burn copal as incense, in sweat lodges and in sacred mushroom ceremonies. Cunningham adds it to love and purification incenses, especially in Mexico, and lets a piece of it stand for the heart of a poppet; he credits every copal with a light sweetness that suits love spells, and singles out Aztec or black copal for its pine scent.",
      elements: ['fire'],
      planets: ['Sun'],
      folkNames: ['Torchwood Copal', 'Fragrant Bursera'],
      categories: ['Love', 'Purification'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Copal',
          supports: ['description', 'elements', 'planets', 'categories'],
        },
        {
          source: 'wikipedia-bursera-fagaroides',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-copal',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Copal',
              supports: ['form'],
            },
            {
              source: 'wikipedia-bursera-fagaroides',
              supports: ['form'],
            },
            {
              source: 'wikipedia-copal',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cowrie Shell',
      canonicalName: 'Cypraeidae',
      nomenclature: 'zoological',
      description:
        'Cowrie, or cowry, is the common name for the sea snails of the family Cypraeidae and for their shells. The shell is usually smooth, glossy and roughly egg-shaped, with a long, narrow and often toothed slit along its flat underside; most have a porcelain-like shine, many are boldly patterned, and they run from about 5 mm to 19 cm long. The word comes through Hindi from Sanskrit, and porcelain is named after the old Italian word for the shell. Cowries are most plentiful in the Indian Ocean, and for centuries the money cowrie served as currency in Africa, India and China; British West Africa accepted them for taxes into the twentieth century, and Ghana’s cedi is named after them. The Yoruba of West Africa cast them in divination, Brazilians use them, as búzios, to consult the orixás, and astrologers in Kerala have divined with them too. The Ojibwe use them as miigis shells in Midewiwin ceremonies, and in eastern India they are used at cremations and in the worship of Lakshmi. In parts of Africa they were prized as charms linked with fecundity, sexual pleasure and good luck, and Mende and Kikuyu culture sees them as symbols of womanhood, fertility, birth and wealth. In Hoodoo, cowries found at Stagville Plantation in North Carolina were used to connect with the spiritual element of water; in West Africa they corresponded to the water spirits.',
      elements: ['water'],
      folkNames: ['Cowry', 'Miigis shell', 'Whiteshell', 'Búzios'],
      deities: ['Lakshmi'],
      categories: ['Divination', 'Fertility', 'Wealth'],
      references: [
        {
          source: 'wikipedia-cowrie',
          supports: [
            'canonicalName',
            'nomenclature',
            'description',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description', 'elements', 'categories'],
        },
      ],
      variants: [
        {
          form: 'Shell',
          references: [
            {
              source: 'wikipedia-cowrie',
              supports: ['form'],
            },
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: "Dragon's Blood",
      canonicalName: 'Calamus draco',
      nomenclature: 'botanical',
      description:
        "Dragon's blood is a bright red resin, and the name is given to the products of several distinct genera: rattan palms of Calamus, the Dracaena trees, Croton and Pterocarpus. This entry is the rattan source, Calamus draco, also known by its synonym Daemonorops draco, the name Cunningham, Kynes and Grieve use. It is a climbing palm whose clustered stems reach about fifteen metres, and whose leaf tips run out into long whips armed with grappling hooks. It grows from peninsular Thailand into western Malesia, and Grieve names Sumatra as the home of the best-known commercial kind. The resin coats the scaly, cherry-sized fruit and is broken off, steamed off, or shaken off in coarse canvas bags, then rolled into balls or sold as sticks, tears and lumps; in Indonesia it is called jernang. Calamus resin is now the kind most often sold as dragon's blood. It has served as a varnish and red colouring, and in China it reddened furniture and the paper of wedding and New Year banners. Grieve records that it was once given as an astringent but had come to be thought inert. In magical practice it is burned to call back a straying lover, carried or smouldered for protection, and added in a pinch to other incenses to strengthen them; in hoodoo it draws love and money and clears away negative energy.",
      elements: ['fire'],
      planets: ['Mars', 'Pluto'],
      zodiacSigns: ['Aries', 'Sagittarius'],
      folkNames: ['Blood', 'Draconis Resina', 'Sanguis Draconis', "Dragon's Blood Palm", 'Jernang'],
      categories: [
        'Love',
        'Protection',
        'Banishing',
        'Binding',
        'Confidence',
        'Healing',
        'Manifestation',
        'Release',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Dragon's Blood",
          supports: ['description', 'elements', 'planets', 'folkNames', 'categories'],
        },
        {
          source: 'kynes-plants',
          locator: "s.v. Dragon's Blood",
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'wikipedia-calamus-draco',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
        {
          source: 'wikipedia-dragon-s-blood',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'grieve-dragons-blood',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          colors: ['red'],
          safetyNotes:
            "The AHPA handbook rates dragon's blood palm resin Safety Class 2b and 2d: not for use in pregnancy except under the supervision of a qualified healthcare practitioner, and not for internal use during menstruation. Allergic reactions, with itching, raised welts and rashes, and swelling of the hands and feet, have been reported after it was swallowed or put on the skin. Its safety while breastfeeding has not been established.",
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 307–308, xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: "s.v. Dragon's Blood",
              supports: ['form', 'colors'],
            },
            {
              source: 'grieve-dragons-blood',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            "Ground, the resin gives a deep crimson powder, and Grieve lists a reddish powder among the forms in which it reaches market. Cunningham mixes powdered dragon's blood with sugar and salt, seals it in a bottle and hides it in the house to quieten a noisy household.",
          colors: ['red'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: "s.v. Dragon's Blood",
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: "s.v. Dragon's Blood",
              supports: ['form'],
            },
            {
              source: 'wikipedia-dragon-s-blood',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-dragons-blood',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Egg',
      canonicalName: 'Gallus gallus domesticus',
      nomenclature: 'zoological',
      description:
        'The chicken, Gallus gallus domesticus, is the domesticated form of the red junglefowl of Southeast Asia, tamed about 8,000 years ago and now one of the commonest domestic animals anywhere, with a world population of more than 26 billion. It is kept chiefly for meat and eggs: a hen bred for laying can produce over 300 eggs a year, where its wild forebears laid about a dozen in the breeding season. A fertile egg hatches after about 21 days of incubation, the chick breaking out of the shell with its egg tooth. Many cultures hold the chicken sacred, and roosters have been used for divination, a practice called alectryomancy. Eggs, chicken eggs above all, carry a long lore of their own. Divination by eggs, or oomancy, was common in ancient Greece and Rome, where the shapes made by egg white dropped into hot water were read; later, a raw egg rubbed on a pregnant woman’s belly and cracked into a saucer was read for the coming birth, and girls in Salem Village read omens from an egg in a glass. In Hoodoo, an egg placed in a murder victim’s hand in the coffin is believed to make the killer give themselves up to the police within three days, and eggs passed over the sick are used to treat them.',
      categories: ['Divination'],
      references: [
        {
          source: 'wikipedia-chicken',
          supports: ['canonicalName', 'nomenclature', 'description', 'categories'],
        },
        {
          source: 'wikipedia-eggs-as-food',
          supports: ['description'],
        },
        {
          source: 'wikipedia-oomancy',
          supports: ['description', 'categories'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Egg',
          description:
            'A chicken’s egg holds its yolk, slung by twisted bands of tissue in the clear albumen, or white, all within thin membranes and a protective shell; the white is about nine-tenths water and turns opaque and white when cooked. In Latin America, egg divination (oomancy) is also used to rid a person of the evil eye and of brujería, a practice traced to native shamans and to Africans brought to the Americas. Cunningham names freshly laid, fertilised eggs among the substitutes for blood in old rituals.',
          safetyNotes:
            'Eggs can carry Salmonella bacteria, for instance when the shell is soiled with droppings. Health experts advise refrigerating washed eggs, using them within two weeks, cooking them thoroughly and never eating them raw, and keeping surfaces used for raw egg away from ready-to-eat food. Egg is one of the commonest food allergies in infants, and reactions to the white are more common than to the yolk.',
          references: [
            {
              source: 'wikipedia-eggs-as-food',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-oomancy',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 130',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Shell',
          description:
            'The Romans crushed eggshells on their plates so that evil spirits could not hide in them. A shell’s colour comes from pigment laid down as the egg forms in the oviduct and depends on the breed: white and brown are commonest, and some breeds lay pink or speckled blue-green eggs. Since the sixteenth century, Barcelona and other Catalan cities have kept a hollow eggshell dancing on a fountain’s jet for the feast of Corpus Christi.',
          colors: ['white', 'brown'],
          references: [
            {
              source: 'wikipedia-eggs-as-food',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Golden Frankincense',
      canonicalName: 'Boswellia papyrifera',
      nomenclature: 'botanical',
      description:
        'Golden frankincense, also called Sudanese frankincense, is the gum resin of Boswellia papyrifera, one of several trees of the genus Boswellia, in the Burseraceae family, whose resin is sold as frankincense. It is a different species from Boswellia sacra of southern Arabia and Somalia. The tree is native to Ethiopia, Eritrea and Sudan, where river gorges such as the Giba in Ethiopia are typical habitat, and it is cultivated in Ethiopia for its valuable resin, known there as itan zaf. Resin from Ethiopia, Sudan and eastern Africa is thought to have been the chief frankincense of the ancient world, and the species now supplies roughly two-thirds of the frankincense produced worldwide. As with each frankincense species, its resin comes in grades that depend partly on when it is harvested, and it is sorted by hand. Its future is uncertain: an ecologist reported in 2006 that the trees had become hard to find in Eritrea by the late 1990s, and a 2019 study forecast that their numbers would halve within twenty years. All Boswellia species face habitat loss and overexploitation, and in the poor, dry and often troubled regions where they grow, selling the resin is one of few sources of income, which leads to overtapping. The species was described in 1843; older names for it include Amyris papyrifera and Boswellia occidentalis.',
      folkNames: ['Sudanese Frankincense', 'Itan Zaf'],
      references: [
        {
          source: 'wikipedia-boswellia-papyrifera',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-frankincense',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['name', 'canonicalName'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          description:
            'The resin forms semi-translucent yellow tears with a fresh scent of lemon and pine that is highly valued. Studies of the oleo-gum resin found it rich in octyl acetate, about 57 to 66 per cent, which gives the citrus note, with some n-octanol, the diterpenes incensole and incensyl acetate, and alpha-boswellic acid. It is one of only three Boswellia species confirmed to hold significant amounts of boswellic acids, with B. sacra and B. serrata.',
          colors: ['yellow'],
          references: [
            {
              source: 'wikipedia-boswellia-papyrifera',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-frankincense',
              supports: ['description'],
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
      name: 'Goofer Dust',
      nomenclature: 'none',
      description:
        "Goofer dust is a powder from hoodoo, the African American folk magic of the southern United States, made chiefly to do harm; its roots lie in traditional Kongo religion. The word goofer is traced to the Kikongo kufwa, 'to die', and older practitioners used it as a verb and a noun as well as before 'dust': to goofer someone was to put a spell on them, and as late as the 1930s goofering was, in some regions, simply another word for hoodooing. Euphemisms grew up around it, so that 'poisoning' or 'hurting' a person meant working on them with goofer rather than with any real poison. The name can cover any powder used in a spell, harmful ones above all, but more narrowly means a mixture of natural ingredients meant to bring trouble, illness or death to an enemy, and some of the interviews Harry M. Hyatt collected treat it as another name for graveyard dirt. Recipes differ, but graveyard dirt and snakeskin are the usual base, joined at times by ash, powdered sulphur, salt, powdered bone, dried manure, herbs, spices and the fine iron dust from round a blacksmith's anvil; the snakeskin reflects the West African Vodun reverence for snakes. Its victims were said to suffer swollen legs or blindness. More rarely it has served in coercive love spells and in gambling spells, and also for protection, as an enslaved conjurer named Dinky used it in the 1820s and 1830s.",
      categories: ['Love', 'Gambling', 'Protection'],
      references: [
        {
          source: 'wikipedia-goofer-dust',
          supports: ['nomenclature', 'description', 'categories'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Powder',
          references: [
            {
              source: 'wikipedia-goofer-dust',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Graveyard Dirt',
      nomenclature: 'none',
      description:
        "Graveyard dirt is earth taken from a grave, and one of the staple materials of hoodoo, the African American folk magic of the southern United States. Its use belongs to a wider reverence for the dead and the ancestors that began in the Kongo region of Central Africa and came to America with the transatlantic slave trade. Practitioners use it to draw close to their ancestors and to reach the spirits of the dead, who may be petitioned or called up to carry out a task. Whose grave it comes from matters: earth from an ancestor's grave protects, while earth from the grave of someone who is not an ancestor may be used against an enemy or, again, for protection. It is paid for before it is taken, with three pennies or some other payment. It is carried in mojo bags so that a spirit goes with the bearer, it is a chief ingredient of goofer dust, and some of the people Harry M. Hyatt interviewed used the two names for the same thing. Earth from a murdered person's grave may be mixed with hair, nail clippings and other personal items to lay a curse. Its history in America is long: Alabama slave narratives tell of freedom seekers rubbing it on their feet or into their tracks to throw slave catchers' dogs off the scent, and nkisi bundles holding cemetery dirt and iron nails, left by enslaved people, were found at the Lott Farmstead in Brooklyn.",
      categories: ['Ancestor Work', 'Protection'],
      references: [
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['nomenclature', 'description', 'categories'],
        },
        {
          source: 'wikipedia-goofer-dust',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Earth',
          references: [
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form'],
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
      name: 'Kauri Gum',
      canonicalName: 'Agathis australis',
      nomenclature: 'botanical',
      description:
        "Kauri gum is the resin of the kauri, Agathis australis, a conifer of the family Araucariaceae that grows mostly north of latitude 38° south in the North Island of New Zealand and is the country's largest tree by volume, standing up to fifty metres. Resin seeps from cracks in the bark or from forked and damaged branches and hardens in the air; lumps that fall are buried under soil and leaf litter and slowly fossilise, so that most kauri gum is a subfossil copal a few thousand years old. It ranges from chalky white through red-brown to black, and hard, translucent pale gold gum was prized most. Māori, who called it kapia, chewed the fresh gum, used it to light fires and, bound in flax, as torches, and burned it with animal fat to make the dark pigment for moko tattooing. From the 1840s it was exported for varnish, by the 1890s it was in most English oil varnishes, and later it went into linoleum. Gum-diggers worked the old forest lands of Northland, Coromandel and Auckland, and gum was Auckland's main export in the second half of the nineteenth century. Over nine-tenths of the kauri forest was logged or burnt between 1820 and 1900. Some Te Tai Tokerau Māori traditions see kauri trees as the legs of Tāne Mahuta, god of the forest, holding sky and earth apart.",
      folkNames: ['Kauri', 'New Zealand Kauri', 'Southern Kauri', 'Kapia'],
      references: [
        {
          source: 'wikipedia-agathis-australis',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-kauri-gum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          description:
            'Kauri gum is one of the natural gums, with gum arabic and tragacanth, used to bind the ingredients of incense together. Clear, transparent pieces, called specimen gum, were set aside for ornaments and trinkets, and like amber the gum sometimes holds trapped insects and plant matter.',
          colors: ['white', 'gold', 'black'],
          references: [
            {
              source: 'wikipedia-incense',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-kauri-gum',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Kauri timber comes in long, clear, straight-grained lengths, light in weight, that plane and saw easily and hold screws and nails without splitting. Māori built large waka from its great logs, and settlers used it for ship masts, houses, furniture and panelling; it darkens with age to a rich golden brown. Swamp kauri, ancient trees preserved in waterlogged ground, is dug up and dried for furniture.',
          references: [
            {
              source: 'wikipedia-agathis-australis',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Labdanum',
      canonicalName: 'Cistus ladanifer',
      nomenclature: 'botanical',
      description:
        'Labdanum, also written ladanum, ladan or ladanon, is a sticky brown resin from two Mediterranean rockroses: Cistus ladanifer, the gum rockrose of the western Mediterranean that this entry names, and Cistus creticus, the pink rockrose of the east. C. ladanifer is an evergreen shrub of one to two and a half metres, with narrow lance-shaped leaves and large flowers of five white, papery petals, usually with a red to maroon spot at their base, and the whole plant is coated in a fragrant, sticky exudate. It withstands long summer drought and cold, and has spread aggressively over old farmland and grassland in central Spain and southern Portugal, where it is called jara pringosa and esteva. In antiquity labdanum was gathered by combing it out of the beards and thighs of goats and sheep that had grazed the shrubs; in nineteenth-century Crete it was swept from the bushes with a rake strung with leather thongs. It went into incense and was taken for colds, coughs, menstrual troubles and rheumatism. The resin called lot in two passages of Genesis, carried from Canaan to Egypt, is usually read as labdanum, and some scholars identify it with onycha, an ingredient of the incense offering in Exodus. It is still among the raw materials of incense making, but today it is produced mainly for perfume, where its rich amber scent stands in for ambergris.',
      folkNames: [
        'Ladanum',
        'Ladan',
        'Ladanon',
        'Gum Rockrose',
        'Common Gum Cistus',
        'Brown-eyed Rockrose',
        'Jara Pringosa',
        'Esteva',
      ],
      references: [
        {
          source: 'wikipedia-cistus-ladanifer',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-labdanum',
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
          description:
            'The raw resin is usually extracted by boiling the leaves and twigs. It is a fragrant black or dark brown mass holding up to a fifth or more of water, soft enough to shape but not to pour, and it turns brittle with age.',
          colors: ['black', 'brown'],
          references: [
            {
              source: 'wikipedia-labdanum',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-incense',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'An essential oil is distilled from labdanum with steam, and an absolute, a very thick, dark amber-green extract with a finer scent than the raw resin, is made with solvents. Perfumers value labdanum as the main material of amber scents and of chypres, and describe its smell as sweet, woody, powdery, musky or leathery.',
          references: [
            {
              source: 'wikipedia-labdanum',
              supports: ['form', 'description'],
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
      name: 'Mother-of-Pearl',
      nomenclature: 'unknown',
      description:
        'Mother-of-pearl is the shining, iridescent lining that some molluscs lay down on the inside of their shells, and the same material makes up pearls. No single formal name settles it: Wikipedia files it under nacre and calls it a composite of mineral and organic matter made by some bivalves, sea snails and cephalopods, while Cunningham describes it only as the interior of various sea molluscs, so no one species, mineral or chemical name covers it. It is built of thin hexagonal tablets of aragonite, a form of calcium carbonate, layered with sheets of elastic protein; the tablets are about as thick as a wavelength of light, which gives the play of colour. The mollusc keeps adding layers as long as it lives, smoothing the shell and sealing off irritants, which is how pearls form. Pearl oysters, freshwater mussels and abalone have been its main commercial sources, and its trade now falls under CITES. It is inlaid in buildings, jewellery and musical instruments and made into buttons and caviar spoons. Cunningham gives it to the Moon and Neptune and to Water, and names protection and wealth as its powers: it is laid on newborn babies to guard them, and wrapped with silver and a banknote as a charm for money.',
      elements: ['water'],
      planets: ['Moon', 'Neptune'],
      colors: ['white', 'black', 'pink', 'green'],
      folkNames: ['Nacre'],
      categories: ['Protection', 'Wealth'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 116',
          supports: ['nomenclature', 'description', 'elements', 'planets', 'categories'],
        },
        {
          source: 'wikipedia-nacre',
          supports: ['nomenclature', 'description', 'colors', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Shell',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 116',
              supports: ['form'],
            },
            {
              source: 'wikipedia-nacre',
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
      name: 'Red Brick Dust',
      nomenclature: 'none',
      description:
        'Red brick dust is fired red brick reduced to powder. In hoodoo, the African American folk magic of the southern United States, it is in common use against evil: laid at the entrance of a home, it is meant to clear evil away and to protect the household from it. The brick it comes from is a fired clay building brick. Its raw materials are clay and shale, themselves formed over thousands of years as rocks such as granite weather and break down; one proposed mix is half to three-fifths silica sand, a fifth to three-tenths clay, a little lime, up to seven per cent iron oxide and a trace of magnesia. The clay is ground, mixed with water, shaped and baked in a kiln, at around 900 to 1,000 °C for moulded bricks, which makes the brick hard and long-lasting. Its colour depends on what the raw materials contain, how hot the kiln runs and the air inside it. Most clays burn to shades of red, deepening to dark red and purple and finally to brown or grey as the heat rises towards 1,300 °C, while a high iron content gives pink bricks and a high lime content white or yellow ones.',
      colors: ['red'],
      categories: ['Protection'],
      references: [
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['nomenclature', 'description', 'colors', 'categories'],
        },
        {
          source: 'wikipedia-brick',
          supports: ['description', 'colors'],
        },
      ],
      variants: [
        {
          form: 'Powder',
          references: [
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Red Coral',
      canonicalName: 'Corallium',
      nomenclature: 'zoological',
      description:
        "Red coral, or precious coral, is Corallium, a genus of some thirty-one marine corals prized for their hard skeleton, coloured from pale pink to deep red by carotenoid pigments. The animals grow as small leafless bushes up to a metre tall on rocky, dim sea floors; the best-known species, C. rubrum, lives mainly in the Mediterranean, and others off Japan and Taiwan. The skeleton is matte until polished, soft enough to be cut as cabochons or beads, and has been made into jewellery since antiquity: it has been found in ancient Egyptian and prehistoric European burials. It was traded from the Mediterranean to India, Romans hung branches round children's necks against harm, and in Italy it was worn against the evil eye into the twentieth century. Overfishing has thinned shallow Mediterranean colonies. Cunningham gives coral to Venus, to Water, and to Isis and Venus, and lists healing, protection, peace and wisdom among its powers. Worn in plain sight it guards against the evil eye, accidents and theft, and given to a child it is said to secure their health. He also says it confers courage, brings peaceful sleep and dispels nightmares, and that coral earrings and red or pink candles ringed with coral were used for love.",
      elements: ['water'],
      planets: ['Venus'],
      colors: ['red', 'pink'],
      folkNames: ['Precious coral', 'Cerasuolo'],
      deities: ['Isis', 'Venus'],
      categories: [
        'Healing',
        'Protection',
        'Peace',
        'Wisdom',
        'Love',
        'Courage',
        'Sleep',
        'Nightmare Protection',
      ],
      substitutes: [
        {
          name: 'Carnelian',
        },
        {
          name: 'Red Jasper',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 84–86, 190',
          supports: [
            'description',
            'elements',
            'planets',
            'colors',
            'deities',
            'categories',
            'substitutes',
          ],
        },
        {
          source: 'wikipedia-precious-coral',
          supports: [
            'canonicalName',
            'nomenclature',
            'description',
            'colors',
            'folkNames',
            'categories',
          ],
        },
      ],
      variants: [
        {
          form: 'Coral',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 84–86',
              supports: ['form'],
            },
            {
              source: 'wikipedia-precious-coral',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Cunningham records two uses for coral ground to powder. In ancient Egypt and Greece it was mixed with seed and sown, or scattered over newly planted fields, to shield the crops from bad weather and insects; and in the sixteenth century it went into incenses for Venus.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 86',
              supports: ['form', 'description'],
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
      name: 'Saltpetre',
      canonicalName: 'Potassium nitrate',
      nomenclature: 'chemical',
      description:
        "Saltpetre is potassium nitrate, KNO3, the potassium salt of nitric acid: a colourless to white crystalline substance with a sharp, salty, bitter taste. In nature it occurs as the mineral nitre, after which nitrogen was named, and saltpetre is also a shared name for several related nitrogen compounds. Its older names run back through Middle English nitre to Greek nitron, probably kin to Egyptian and Hebrew words; Arabs called it Chinese snow and Persians Chinese salt, and by the fifteenth century Europeans knew it as saltpetre, or Indian saltpetre. It was gathered as crystals from cave walls and from bat guano, and later made in nitraries and nitre beds, where excrement mixed with soil was left for microbes to turn into nitrate. It is best known as the oxidiser in gunpowder, which powered the world's firearms until the late 1880s, and it is still used in fireworks, smoke bombs, rocket propellants, fertilisers and tree-stump removers. It has cured meat since antiquity or the Middle Ages and still goes into some salami, dry-cured ham and corned beef, as the food additive E252; it is also added to cigarettes to keep them burning evenly. In incense, a nitrate oxidiser such as potassium nitrate keeps the charcoal or wood powder of self-burning incense alight. The old belief that it causes impotence, and the rumour that it is slipped into institutional food such as military rations, have no scientific support.",
      colors: ['colourless', 'white'],
      safetyNotes:
        'Saltpetre is a strong oxidiser: it does not burn itself but makes other materials burn more fiercely, gives off irritating or toxic fumes in a fire, and can catch fire or explode in contact with reducing agents, so keep it away from combustible materials. It irritates the eyes, skin and airways. Swallowed, it can affect the blood by forming methaemoglobin, sometimes only after a delay, with signs such as blue lips, fingernails and skin, abdominal pain, nausea, dizziness, headache, laboured breathing, confusion and convulsions; anyone who has swallowed it needs medical attention.',
      folkNames: [
        'Saltpeter',
        'Indian Saltpetre',
        'Nitrate of Potash',
        'Nitre',
        'Niter',
        'Chinese Snow',
        'Chinese Salt',
      ],
      references: [
        {
          source: 'wikipedia-potassium-nitrate',
          supports: ['canonicalName', 'nomenclature', 'description', 'colors', 'folkNames'],
        },
        {
          source: 'inchem-icsc-0184',
          supports: ['description', 'colors', 'safetyNotes'],
        },
        {
          source: 'wikipedia-incense',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Powder',
          references: [
            {
              source: 'inchem-icsc-0184',
              supports: ['form'],
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
      name: 'Snakeskin',
      canonicalName: 'Serpentes',
      nomenclature: 'zoological',
      description:
        'Snakes are the limbless reptiles of the suborder Serpentes, clad in overlapping scales and found on every continent but Antarctica, in around thirty families and more than 4,000 species. Their skin is smooth and dry rather than slimy, its outer layer made of keratin, the same material as nails, claws and hair. A snake does not lose its scales one by one: four or five times a year it sloughs its whole outer skin in one piece, peeling it back from head to tail, and a cast skin that stays reasonably whole can in principle identify the snake. That renewal lies behind the snake’s old link with healing, seen in the Rod of Asclepius. Snakes are revered in many religions: Shiva wears one about his neck and Vishnu rests on a seven-headed serpent, India honours snakes as symbols of fertility at the festival of Nag Panchami, and in Wicca and modern paganism the snake stands for wisdom and knowledge and is linked with Hecate. In Hoodoo, reverence for snakes came from West African Vodun, where they represent divinity; snakeskin is a main ingredient of goofer dust, a powder for laying harmful spells, and snakes are used for healing, for protection and to curse. Zora Neale Hurston described lying wrapped in snakeskins for three days at her initiation. In Mexico, Cunningham notes, snakeskins are sold in botánicas beside candles, incense and other occult goods.',
      deities: ['Asclepius', 'Shiva', 'Vishnu', 'Hecate'],
      categories: ['Healing', 'Protection', 'Fertility', 'Wisdom', 'Knowledge'],
      references: [
        {
          source: 'wikipedia-snake',
          supports: ['canonicalName', 'nomenclature', 'description', 'deities', 'categories'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description', 'categories'],
        },
        {
          source: 'wikipedia-goofer-dust',
          supports: ['description'],
        },
        {
          source: 'cunningham-crystals',
          locator: 'p. 163',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Shed',
          description:
            'The cast outer skin of a snake. Before a moult the skin turns grey and the eyes silvery; the old skin loosens from the new one beneath, splits, and is rubbed off against rough surfaces, often peeling back whole from head to tail. In Hoodoo, snakeskins are used to make conjure powders and are one of the two chief ingredients of goofer dust, with graveyard dirt; the conjurer Dinkie carried a dried snakeskin to rouse the snake’s power against a cruel overseer.',
          references: [
            {
              source: 'wikipedia-snake',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-goofer-dust',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Specimen',
          description:
            'A whole snake, dried or steeped. A formerly enslaved person in Missouri recorded that conjurers ground dried snakes and frogs into powders to work against people: one such powder, put in a jar and buried under a target’s steps, was said to bring pain to the legs of whoever walked over it. In Chinese culture, snake wine is made by steeping whole snakes, and traditional Chinese medicine holds that it has medicinal uses.',
          references: [
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-snake',
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
      name: 'Sugar',
      canonicalName: 'Sucrose',
      nomenclature: 'chemical',
      description:
        "Table sugar is sucrose, a double sugar in which one unit of glucose is bound to one of fructose. Plants make it and store it in their roots, fruits and nectar, and for food it is drawn chiefly from sugarcane, grown in the tropics, and sugar beet, grown in cooler climates. Raw cane sugar is washed, dissolved, passed over carbon to take out its colour, then boiled down under vacuum and crystallised; refined white sugar is more than 99.7 per cent sucrose, and cane and beet sugar are chemically the same. The English word goes back through Latin, Arabic and Persian to the Sanskrit śarkarā, and sugar was first made from cane in the Indian subcontinent. Arabs brought it to Sicily and Spain, Columbus took it to the Americas, and Prussia began making it from beet in 1801. By the nineteenth century it was a household staple, and its spread was closely tied to colonisation and to slavery. White was not always the ideal: in India, where sugar often has a place in religious observance, sugar used for ritual purity must not be white. In Hoodoo, sugar water is the traditional filling of the honey or sweetening jar, made to sweeten a person or a situation in the maker's favour.",
      colors: ['colourless', 'white', 'brown'],
      safetyNotes:
        'Eaten in excess, sucrose may contribute to metabolic syndrome, with a higher risk of type 2 diabetes, insulin resistance, weight gain and obesity, and a diet rich in it may lead to gout. Mouth bacteria turn sugars into acid that decays teeth, and sucrose in particular helps them build up plaque. The World Health Organization advises keeping free sugars below 10 per cent of daily energy intake, and below 5 per cent for further benefit, especially to the teeth.',
      folkNames: ['Saccharose', 'Table sugar'],
      references: [
        {
          source: 'wikipedia-sucrose',
          supports: [
            'canonicalName',
            'nomenclature',
            'description',
            'colors',
            'safetyNotes',
            'folkNames',
          ],
        },
        {
          source: 'wikipedia-sugar',
          supports: ['description', 'colors', 'folkNames'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Powder',
          description:
            'Refined sucrose is sold as colourless crystals or a white powder. Milled sugars such as powdered or icing sugar are ground fine and used for dusting food and in baking and confectionery.',
          safetyNotes:
            'Sugar burns easily in a flame, so handling sugar powder in bulk carries a risk of dust explosion; ignited sugar dust destroyed most of a Georgia refinery in 2008, killing 14 people.',
          references: [
            {
              source: 'wikipedia-sucrose',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-sugar',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Syrup',
          description:
            'Invert syrup, or invert sugar, is a mixture of glucose and fructose made by heating granulated sugar in water; it is used in breads, cakes and drinks to adjust sweetness, keep them moist and stop sugar crystallising. Molasses and treacle are the by-products left when sugar is taken out of cane or beet juice, and go into baked goods and sweets such as toffee and liquorice.',
          references: [
            {
              source: 'wikipedia-sugar',
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
      name: 'Sweetgrass',
      canonicalName: 'Hierochloe odorata',
      nomenclature: 'botanical',
      description:
        "Sweetgrass, Hierochloe odorata, is a hardy perennial grass of northern Eurasia and North America that can grow within the Arctic Circle; some botanists fold its genus into Anthoxanthum and call it Anthoxanthum nitens. Its long, narrow leaves are shiny beneath and often purplish red at the base, and they give off a vanilla-like smell as they dry, owing to coumarin, which also puts off grazing animals and, with phytol, repels mosquitoes. The genus name joins the Greek words for sacred and grass. Many Indigenous peoples of Canada and the United States hold the plant sacred: among the peoples of the Great Plains and Canadian Prairies it is one of the four sacred medicines, and it is braided, burned as a smudge or incense to carry prayers and to purify, woven into baskets, and given to elders as a mark of respect. In northern Europe it was strewn before church doors on saints' days, Sámi people kept braids of it with their clothes as a perfume, and in Poland it flavours vodka such as Żubrówka. Cunningham gives it one power, calling spirits, and has it burned to draw good spirits before spellwork. Kynes pairs it with air, water and Venus, and suggests wafting the smoke of a small braid over oneself before spiritual work or healing, and burning a little when working with spirit guides.",
      elements: ['air', 'water'],
      planets: ['Venus'],
      folkNames: [
        'Bison Grass',
        'Buffalo Grass',
        'Holy Grass',
        'Seneca Grass',
        'Vanilla Grass',
        'Manna Grass',
        "Mary's Grass",
        'Hair of Mother Earth',
      ],
      categories: ['Healing', 'Purification'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Sweetgrass',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Sweetgrass',
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
          source: 'wikipedia-hierochloe-odorata',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Sweetgrass',
              supports: ['form'],
            },
            {
              source: 'wikipedia-hierochloe-odorata',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Kynes lists sweetgrass essential oil among the forms on sale, beside a hydrosol, and suggests diffusing the oil to consecrate and purify a ritual space.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Sweetgrass',
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
    {
      name: 'Vinegar',
      nomenclature: 'none',
      description:
        "Vinegar is a sharp-smelling solution of acetic acid in water, usually 4 to 18 per cent acid by volume, carrying traces of flavour from whatever it was made from. Most is made by two fermentations: yeast turns sugars into alcohol, then acetic acid bacteria, whose role Louis Pasteur discovered, turn the alcohol into acid. The name came into English through Old French from Latin words for sour wine, and it was once also called eisel. The Babylonians made it from fruit, dates, figs and beer by about 3000 BCE, for both cooking and medicine; noble households of China's Zhou dynasty kept a vinegar maker, and Greeks and Romans used vinegar made from wine. Its varieties follow their source: cider, wine, sherry and balsamic vinegars, rice and Chinese black vinegars, coconut and cane vinegars, and the colourless distilled or spirit vinegar, made by fermenting distilled alcohol. Today it serves mainly as a sour seasoning, dressing and pickling liquid, and also as a household cleaner and weedkiller. Folk medicine has used it since antiquity, though clinical research gives no firm support to claims such as weight loss. In the witch bottle, a charm against witchcraft known in England and the United States, vinegar is one of the things some bottles have held, along with salt, herbs, oil and coins.",
      colors: ['colourless', 'brown', 'black'],
      safetyNotes:
        'Vinegar stronger than 10 per cent acid is corrosive and damages the skin, so it needs careful handling. Apple cider vinegar has been reported to injure the oesophagus, and vinegar products sold as remedies are neither regulated nor standardised, so their content and acidity can vary widely.',
      folkNames: ['Eisel'],
      references: [
        {
          source: 'wikipedia-vinegar',
          supports: ['nomenclature', 'description', 'colors', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-witch-bottle',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Vinegar',
          references: [
            {
              source: 'wikipedia-vinegar',
              supports: ['form'],
            },
            {
              source: 'wikipedia-witch-bottle',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Whiskey',
      nomenclature: 'none',
      description:
        'Whiskey, spelt whisky everywhere but Ireland and the United States, is a distilled spirit made from a fermented mash of grain such as barley, maize, rye or wheat, which may be malted first. The spirit leaves the still clear, at 70 to 80 per cent alcohol, is usually diluted, and is then aged in wooden casks, most often of charred white oak, which give it colour and much of its flavour; bottled, it is usually at least 40 per cent alcohol and runs from pale gold to dark amber. The name is an English rendering of the Gaelic uisce or uisge, water, by way of uisce beatha, a translation of the Latin aqua vitae, water of life; early English spellings include usquebaugh. The earliest records of distilling alcohol come from thirteenth-century Italy, where it was made from wine and spread through monasteries mainly as medicine. Distilling had reached Ireland by the twelfth century and Scotland by the fifteenth, where a royal account of 1495 records malt sent to a friar to make aqua vitae. In Hoodoo, whiskey or rum is fed to conjure bags and luck balls once a week, since they are held to have a spirit that must be kept alive, a custom traced to the Guinea Coast of Africa. It is also poured as a libation, beside offerings of food and water, for the dead and other spirits, at graves or under a tree.',
      colors: ['gold'],
      folkNames: ['Whisky', 'Usquebaugh'],
      references: [
        {
          source: 'wikipedia-whisky',
          supports: ['nomenclature', 'description', 'colors', 'folkNames'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Spirit',
          references: [
            {
              source: 'wikipedia-whisky',
              supports: ['form'],
            },
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Wood Ash',
      nomenclature: 'none',
      description:
        'Wood ash is the powdery residue left when wood burns, whether in a fireplace, on a bonfire or in an industrial power plant. Burning leaves on average about six to ten per cent of the wood as ash, and what the ash holds varies with the kind and age of the tree, where it grew and how hot the fire ran: hardwoods usually give more ash than softwoods, and bark and leaves more than the inner trunk. Its chief part is calcium, mostly as calcium carbonate, which a hotter fire turns to calcium oxide, with some potash, a little phosphate and traces of iron, manganese, zinc, copper and heavy metals. It has served many ends. For thousands of years, in Sumer, Egypt and Europe, wood or plant ash was steeped in water to draw out potassium carbonate, which was mixed with oils or fats to make a soft soap. It is spread on fields as a source of potassium and to neutralise acid soil, added to compost to control smells, and used by Chinese, Japanese and Korean potters, and many craft potters since, as a flux in glazes. Lye made from it was long used to soak and cook maize in nixtamalisation, a practice that began in Mesoamerica; it preserves some cheeses, such as Morbier; and Sumerians baked an early leavened bread under hot ash as far back as 6000 BC.',
      references: [
        {
          source: 'wikipedia-wood-ash',
          supports: ['nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Ash',
          references: [
            {
              source: 'wikipedia-wood-ash',
              supports: ['form'],
            },
          ],
        },
      ],
    },
  ],
};
