import type { SeedCompendiumShard } from '../types';

// MB.246: the candidate list's plants and fungi labelled R to Z, Yarrow
// excepted (the pilot seeds it). Every value traces to a source a citation
// names, read during the task; the sources, the time each entry took and what
// was left out are recorded in claude-docs/db/compendium-seed/plants-r-z.md.
// Descriptions are written fresh from the sources, never copied. A substitute
// outside this shard and the pilot is typed text, never a link: the earlier
// plant shards were unmerged when this one was written (README, "An entry,
// field by field").
export const PLANTS_R_Z: SeedCompendiumShard = {
  name: 'plants-r-z',
  sources: {
    'grieve-ash-mountain': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Ash, Mountain',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/a/ashmo076.html',
      accessed: '2026-10-11',
    },
    'grieve-chamomiles': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Chamomiles',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/c/chammo49.html',
      accessed: '2026-10-11',
    },
    'grieve-pimpernel-scarlet': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Pimpernel, Scarlet',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/p/pimper33.html',
      accessed: '2026-10-11',
    },
    'grieve-radish': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Radish',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/radish01.html',
      accessed: '2026-10-11',
    },
    'grieve-ragwort': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Ragwort',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/ragwor02.html',
      accessed: '2026-10-11',
    },
    'grieve-raspberry': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Raspberry',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/raspbe05.html',
      accessed: '2026-10-11',
    },
    'grieve-rhubarbs': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Rhubarbs',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/rhubar14.html',
      accessed: '2026-10-11',
    },
    'grieve-rice': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Rice',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/rice--15.html',
      accessed: '2026-10-11',
    },
    'grieve-rosemary': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Rosemary',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/rosema17.html',
      accessed: '2026-10-11',
    },
    'grieve-roses': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Roses',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/roses-18.html',
      accessed: '2026-10-11',
    },
    'grieve-rue': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Rue',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/r/rue---20.html',
      accessed: '2026-10-11',
    },
    'grieve-saffron': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Saffron',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/s/saffro03.html',
      accessed: '2026-10-11',
    },
    'grieve-sages': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Sages',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/s/sages-05.html',
      accessed: '2026-10-11',
    },
    'grieve-sassafras': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Sassafras',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/s/sassaf20.html',
      accessed: '2026-10-11',
    },
    'grieve-zedoary': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Zedoary',
      container: 'A Modern Herbal',
      publisher: 'Botanical.com',
      url: 'https://www.botanical.com/botanical/mgmh/z/zeodar01.html',
      accessed: '2026-10-11',
    },
    'wikipedia-chamaemelum-nobile': {
      kind: 'entry',
      title: 'Chamaemelum nobile',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chamaemelum_nobile&oldid=1375924632',
      accessed: '2026-10-11',
    },
    'wikipedia-crocus-sativus': {
      kind: 'entry',
      title: 'Crocus sativus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Crocus_sativus&oldid=1370662514',
      accessed: '2026-10-11',
    },
    'wikipedia-curcuma-zedoaria': {
      kind: 'entry',
      title: 'Curcuma zedoaria',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Curcuma_zedoaria&oldid=1340334620',
      accessed: '2026-10-11',
    },
    'wikipedia-jacobaea-vulgaris': {
      kind: 'entry',
      title: 'Jacobaea vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Jacobaea_vulgaris&oldid=1377304178',
      accessed: '2026-10-11',
    },
    'wikipedia-lysimachia-arvensis': {
      kind: 'entry',
      title: 'Lysimachia arvensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lysimachia_arvensis&oldid=1376728552',
      accessed: '2026-10-11',
    },
    'wikipedia-oryza-sativa': {
      kind: 'entry',
      title: 'Oryza sativa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Oryza_sativa&oldid=1361047241',
      accessed: '2026-10-11',
    },
    'wikipedia-radish': {
      kind: 'entry',
      title: 'Radish',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Radish&oldid=1375183622',
      accessed: '2026-10-11',
    },
    'wikipedia-rheum-palmatum': {
      kind: 'entry',
      title: 'Rheum palmatum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rheum_palmatum&oldid=1306457967',
      accessed: '2026-10-11',
    },
    'wikipedia-rose': {
      kind: 'entry',
      title: 'Rose',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rose&oldid=1376625769',
      accessed: '2026-10-11',
    },
    'wikipedia-rosemary': {
      kind: 'entry',
      title: 'Rosemary',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rosemary&oldid=1378691183',
      accessed: '2026-10-11',
    },
    'wikipedia-rubus-idaeus': {
      kind: 'entry',
      title: 'Rubus idaeus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rubus_idaeus&oldid=1365353396',
      accessed: '2026-10-11',
    },
    'wikipedia-ruta-graveolens': {
      kind: 'entry',
      title: 'Ruta graveolens',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ruta_graveolens&oldid=1376465982',
      accessed: '2026-10-11',
    },
    'wikipedia-rye': {
      kind: 'entry',
      title: 'Rye',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rye&oldid=1363336162',
      accessed: '2026-10-11',
    },
    'wikipedia-salvia-officinalis': {
      kind: 'entry',
      title: 'Salvia officinalis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Salvia_officinalis&oldid=1363924166',
      accessed: '2026-10-11',
    },
    'wikipedia-sassafras-albidum': {
      kind: 'entry',
      title: 'Sassafras albidum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sassafras_albidum&oldid=1378896201',
      accessed: '2026-10-11',
    },
    'wikipedia-sorbus-aucuparia': {
      kind: 'entry',
      title: 'Sorbus aucuparia',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sorbus_aucuparia&oldid=1378549974',
      accessed: '2026-10-11',
    },
    'wikipedia-taxus-baccata': {
      kind: 'entry',
      title: 'Taxus baccata',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Taxus_baccata&oldid=1378354864',
      accessed: '2026-10-11',
    },
    'wikipedia-yucca': {
      kind: 'entry',
      title: 'Yucca',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Yucca&oldid=1372907766',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Radish',
      canonicalName: 'Raphanus sativus',
      nomenclature: 'botanical',
      description:
        'Radish is an annual or biennial member of the mustard family, Brassicaceae, grown chiefly for its swollen taproot, which may be round, tapering or cylindrical. The skin of the root runs from white through pink, red and purple to yellow, green and black, while the flesh is usually white, and its peppery bite comes from compounds such as glucosinolates and isothiocyanates. The leaves grow in a rosette, and the flowers range from white to pale violet with dark veins. Its wild forms have been found only in Southeast Asia, where its origin is tentatively placed; it was grown widely in the Egypt of the Pharaohs, yet seems not to have reached Britain until the sixteenth century. Eaten raw in salads, cooked, or pickled as young green pods, it has also served as a homely remedy: Grieve describes the juice given against gallstones and gravel, and the root prized against scurvy. In Oaxaca, Mexico, outsized radishes are carved into figures for the Night of the Radishes each 23 December, and in Japan the daikon is one of the seven herbs of a new-year festival. In magical practice Cunningham gives it to Mars and fire, with two powers: carried, it guards against the evil eye, and eaten, it is said to stir lust. He adds that a kind of wild radish was once carried in Germany to find out where sorcerers were.',
      elements: ['fire'],
      planets: ['Mars'],
      colors: ['white', 'pink', 'red', 'purple', 'yellow', 'green', 'black'],
      safetyNotes:
        "Cunningham's health codes mark the root as safe, and the greens as safe when cooked.",
      folkNames: ['Rapuns'],
      categories: ['Protection', 'Lust'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Radish; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'wikipedia-radish',
          supports: ['canonicalName', 'description', 'colors'],
        },
        {
          source: 'grieve-radish',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'grieve-radish',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Radish',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Pod',
          description:
            'The young green seed-pods can be pickled, on their own or with other vegetables, and Grieve counts them a fair stand-in for capers; Wikipedia adds that the small pods are edible while young.',
          references: [
            {
              source: 'grieve-radish',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-radish',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Ragwort',
      canonicalName: 'Jacobaea vulgaris',
      nomenclature: 'botanical',
      description:
        "Ragwort is a member of the daisy family, Asteraceae, usually biennial but able to persist longer, native to northern Eurasia and carried as a weed to North America, Australasia and elsewhere. Its upright stems bear pinnately lobed leaves whose unpleasant smell when bruised explains its many 'stinking' names, and from June into autumn it carries dense, flat-topped clusters of bright yellow flower heads whose seeds drift away on the wind. It is a rich source of nectar and the food of the cinnabar moth's caterpillars, yet farmers treat it as a pest because its alkaloids poison cattle and horses. Grieve records its old use as a poultice for aching joints, a wash for burns and sores, and a source of green and yellow dyes, and its name Staggerwort from a supposed cure for the staggers in horses. Under its Manx name, Cushag, it is the national flower of the Isle of Man. Folklore makes it a steed: witches were said to ride ragwort stems by night in Cornwall and Scotland, Irish fairies to turn it into horses, and leprechauns to hide treasure beneath it. In magic Cunningham gives it to Venus and water, and to protection, noting the Greek amulet against charms; Kynes adds courage, divination and prosperity, and ties it to Samhain.",
      elements: ['water'],
      planets: ['Venus'],
      safetyNotes:
        "Not recommended for internal use (Cunningham's health code X), and Kynes warns that every part of the plant is toxic if eaten. AHPA's profile of pyrrolizidine alkaloids names the unsaturated alkaloids of Senecio species, the genus ragwort was long placed in, as a recognised cause of liver damage when eaten in sufficient amounts, and notes that livestock have been poisoned by grazing Senecio.",
      folkNames: [
        'Cankerwort',
        'Dog Standard',
        "Fairies' Horses",
        'Ragweed',
        "St. James' Wort",
        'Staggerwort',
        'Stammerwort',
        'Stinking Nanny',
        'Stinking Willie',
        'Common Ragwort',
        'Tansy Ragwort',
        'Dog Stalk',
        'Fairy Horse',
        'Ragged Jack',
        'Yellow Top',
        'Benweed',
        'Cushag',
        'Stinking Ninny',
        "Mare's Fart",
      ],
      categories: ['Protection', 'Courage', 'Divination', 'Prosperity'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Ragwort; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Ragwort',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 963',
          supports: ['safetyNotes'],
        },
        {
          source: 'wikipedia-jacobaea-vulgaris',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-ragwort',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 188–189',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'grieve-ragwort',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The flower heads are a vivid yellow, borne in flat-topped clusters. Grieve notes that boiled in water they give a yellow dye to wool first treated with alum. Kynes keeps a jar of the dried flowers with financial papers to draw prosperity, lays sprigs of flower and leaf on the altar to strengthen divination, and dabs the flower essence on a protective amulet to undo a spell.',
          colors: ['yellow'],
          references: [
            {
              source: 'grieve-ragwort',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ragwort',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-jacobaea-vulgaris',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            "Grieve records the green leaves used in the countryside for soothing poultices, laid on joints painful with rheumatism, sciatica or gout, and as the source of a good green dye that does not last; Wikipedia likewise notes the green dye and that it fades. Crushed, the leaves give off the unpleasant smell behind many of the plant's names.",
          colors: ['green'],
          references: [
            {
              source: 'grieve-ragwort',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-jacobaea-vulgaris',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ragwort',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Raspberry',
      canonicalName: 'Rubus idaeus',
      nomenclature: 'botanical',
      description:
        "Raspberry is a shrub of the rose family, native to Europe and northern Asia and cultivated throughout temperate regions; in the wild it forms stands in woods and clearings. A perennial root sends up canes that live for two years: the first year's shoot grows tall and leafy, and the second year's side shoots carry small white five-petalled flowers in late spring, followed by sweet but sharp red fruits. These are not true berries but clusters of tiny drupelets that come away from the core when picked, leaving the fruit hollow. The species name points to Mount Ida, and Kynes retells the legend that the fruit was white until the nymph Ida, nursing the infant Zeus, scratched herself and stained it with her blood. Grieve records raspberry vinegar as a cooling summer drink and gargle, a home-made wine, a dye from the fruit, and the leaf infusion as a gargle, a wash for wounds, a remedy for loose bowels and a warm drink in childbirth. In magic Cunningham gives it to Venus and water: the bramble branches hung at doors and windows protect the house, and after a death keep the departed spirit from coming back in, while the fruit is served to kindle love. Kynes adds fertility and fidelity, and notes its use for luck and faithfulness in hoodoo.",
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Leo', 'Taurus'],
      safetyNotes:
        "AHPA rates the leaf safety class 1, safe when used appropriately, with no known contraindications, drug interactions or side effects; it contains tannins. In human studies, raspberry leaf taken from the 32nd week of pregnancy until birth showed no harm to mother or baby, though in one animal study it lengthened gestation. No information on its safety while breastfeeding was found, so that has not been firmly established. Cunningham's health code marks raspberry as safe (G).",
      folkNames: [
        'European Raspberry',
        'Red Raspberry',
        'Hindberry',
        'Raspis',
        'Raspbis',
        'Bramble of Mount Ida',
        'European Red Raspberry',
      ],
      deities: ['Venus', 'Zeus'],
      categories: ['Protection', 'Love', 'Fertility', 'Fidelity'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Raspberry; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Raspberry',
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
          source: 'ahpa-safety',
          locator: 'pp. 754–755; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-rubus-idaeus',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-raspberry',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'Raspberry leaf tea, an infusion of the dried leaves, served Grieve as a gargle for sore mouths and throats, a wash for wounds and ulcers, a cold remedy for loose bowels and a warm drink during labour. Cunningham records pregnant women carrying the leaves to ease the pains of pregnancy and birth, and Kynes suggests sending a pressed leaf in a letter to a lover while the two are apart.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 754',
              supports: ['form'],
            },
            {
              source: 'grieve-raspberry',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Raspberry',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Raspberry',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Fruit',
          description:
            'The red fruit is an aggregate of drupelets, sweet yet tart, ripening in summer or early autumn. Grieve makes it into a cooling vinegar drink, a home-made wine and a syrup, and notes its use in dyeing. Kynes has partners share a bowl of raspberries as they pledge themselves to one another.',
          colors: ['red'],
          references: [
            {
              source: 'wikipedia-rubus-idaeus',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-raspberry',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Raspberry',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'The prickly canes are the brambles of the magical lore: Cunningham hangs the branches at doors and windows to guard the house, and after a death to stop the spirit returning, and Kynes sets a wreath woven from a cane on the altar as part of a protection spell.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Raspberry',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Raspberry',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rhubarb',
      canonicalName: 'Rheum palmatum',
      nomenclature: 'botanical',
      description:
        'Rhubarb here is Chinese or Turkey rhubarb, a herbaceous perennial of the knotweed family, Polygonaceae, native to western China, northern Tibet and the Mongolian Plateau. It stands up to two metres tall, roughly twice the height of garden rhubarb, with large, jagged, hand-shaped leaves, tall sprays of tiny flowers and a thick, deep root that is brown outside and deep yellow within. That root, dahuang, has been used in traditional Chinese medicine for more than two thousand years; dried, it became one of the great goods of the Silk Road, and Europe used it for centuries before learning which plant it came from. Grieve describes it as a valued purgative whose after-effect is astringent, so that it can check diarrhoea, and in small doses a tonic for sluggish digestion. Kynes adds that China and medieval Europe both thought it a cure for plague, and that French and German alchemists called it by the secret name zipar. In magic Cunningham gives it to Venus and earth: a piece of root worn on a string at the neck guards against stomach pains, and rhubarb pie served to a partner keeps them faithful. Kynes adds air, Gemini, Jupiter and Saturn, and uses it for love, fidelity and abundance.',
      elements: ['earth', 'air'],
      planets: ['Venus', 'Jupiter', 'Saturn'],
      zodiacSigns: ['Gemini'],
      safetyNotes:
        "AHPA classes the root and rhizome 2b, 2c and 2d: not for use in pregnancy or while nursing except under a qualified practitioner's supervision; not with intestinal obstruction, abdominal pain of unknown cause, inflammatory bowel conditions such as colitis, Crohn's disease or irritable bowel syndrome, or during menstruation; not for more than eight days running; and not for children under twelve. It is a stimulant laxative and contains tannins. It can cause cramping, nausea, vomiting and poor appetite, and may turn the urine red-brown or bright yellow. Long laxative use can lose potassium, so take care alongside heart-rhythm drugs, cardiac glycoside plants, thiazide diuretics, corticosteroids or liquorice; it may also lessen the absorption of other drugs taken by mouth. Cunningham's codes for the root say not to take it internally when pregnant or nursing, or with kidney stones, intestinal obstruction or abdominal pain, and not for long-term use. Kynes warns that only the stalks are edible and the rest of the plant is toxic if eaten.",
      folkNames: [
        'Chinese Rhubarb',
        'Turkey Rhubarb',
        'East Indian Rhubarb',
        'China Rhubarb',
        'Ornamental Rhubarb',
        'Russian Rhubarb',
        'Indian Rhubarb',
        'Da Huang',
      ],
      categories: ['Protection', 'Fidelity', 'Love', 'Abundance'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rhubarb; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Rhubarb',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 736–737; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-rheum-palmatum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-rhubarbs',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The medicinal part is the root and rhizome, lifted in autumn from plants several years old, stripped of its bark, cut into pieces and dried; Grieve describes the pieces strung on cords to dry, then sold in brownish-yellow lumps with a network of white lines. Cunningham has a piece of the root worn at the neck against stomach pains.',
          colors: ['brown', 'yellow'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 736',
              supports: ['form'],
            },
            {
              source: 'grieve-rhubarbs',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-rheum-palmatum',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rhubarb',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          safetyNotes:
            "The leaf blade is not used in medicine: AHPA notes that it contains oxalic acid, which can deposit calcium oxalate in the kidneys and cause kidney failure. Cunningham's codes for the greens say they are not for internal use, not with any inflammation of the intestines, and not for children under twelve.",
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 736',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rhubarb; p. 266',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Grieve lists the powdered root first among the medicinal preparations of rhubarb and judges it as effective and reliable as the tincture. Kynes sprinkles the powdered root outside the home to draw abundance.',
          references: [
            {
              source: 'grieve-rhubarbs',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rhubarb',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rice',
      canonicalName: 'Oryza sativa',
      nomenclature: 'botanical',
      description:
        'Rice is the more widely grown of the two cultivated rice species, a grass of the family Poaceae first domesticated in the Yangtze basin of China many thousands of years ago. Grieve describes an annual whose jointed stems may float in water or lie along the ground, rooting at the joints, and end in a loose head that bows as the seed grows heavy; she thought it native to China and India. Its two main kinds are the sticky, short-grained japonica and the long-grained, non-sticky indica, and the grain may be white, brown, black or red. It is above all a food, and Grieve notes that the peoples who live on it mostly eat it unhusked; she also records a rice-water drink for fevers and a rice poultice used in place of linseed. Kynes, writing of grains together, says rice was used in important rites in Asia and was sometimes thought to have a soul. Cunningham gives it to the Sun and to air, and to protection and fertility: rice on the roof or in a small jar by the door guards a household, Brahmins carried it as an amulet against evil, and it is thrown after newly married couples. For grains, Kynes adds earth, Venus and Virgo, and powers that include abundance, divination, love and prosperity.',
      elements: ['air', 'earth'],
      planets: ['Sun', 'Venus'],
      zodiacSigns: ['Virgo'],
      safetyNotes:
        'Cunningham classes it as safe (health code G), with the warning not to eat it raw.',
      folkNames: [
        'Bras',
        'Dhan',
        'Nirvara',
        'Paddy',
        'Nivara',
        'Asian Rice',
        'Asian Cultivated Rice',
      ],
      deities: [
        'Amaterasu',
        'Brigid',
        'Ceres',
        'Demeter',
        'Holda',
        'Inanna',
        'Inari',
        'Isis',
        'Lugh',
        'Osiris',
        'Persephone',
      ],
      categories: [
        'Protection',
        'Fertility',
        'Abundance',
        'Divination',
        'Love',
        'Prophecy',
        'Prosperity',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rice; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Grain',
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
          source: 'wikipedia-oryza-sativa',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-rice',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          description:
            'The grain is the seed. Wikipedia notes grains that are white, brown, black or red. Husked, it is what the Malays call bras; still in its husk, paddy. Kynes suggests a handful of grain sprinkled on the altar as an offering to a chosen deity.',
          colors: ['white', 'brown', 'black', 'red'],
          references: [
            {
              source: 'grieve-rice',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-oryza-sativa',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Grain',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Water',
          description:
            'Rice water, a decoction of the grain, is recorded by Grieve from the Pharmacopoeia of India as a soothing, cooling drink in fevers and inflammatory illness, which might be sharpened with lime juice and sweetened, and also given as an enema for bowel complaints.',
          references: [
            {
              source: 'grieve-rice',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Rice flour, ground from the seeds and known as ground rice, could stand in for wheat flour, Grieve says, dusted on erysipelas, burns and scalds; a rice poultice could replace one of linseed meal.',
          references: [
            {
              source: 'grieve-rice',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Roman Chamomile',
      canonicalName: 'Chamaemelum nobile',
      nomenclature: 'botanical',
      description:
        "Roman chamomile is a low, creeping perennial of the daisy family, native to Western Europe and the north-west of the Maghreb and naturalised well beyond; in Britain it grows wild in the south of England and parts of Wales. Its feathery leaves and daisy-like flowers, white rays round a yellow centre, smell of apples, which gave it the Greek name meaning 'ground apple'. It is often confused with German chamomile, a quite different plant. Grieve records that the Egyptians dedicated it to their gods, that it was a strewing herb in the Middle Ages, and that it was planted along garden walks, where treading on it releases the scent; the tea of its flowers was an old remedy for nervous complaints and indigestion, and the herb went into herb beers. Today the plant goes into teas, perfumes, cosmetics and aromatherapy, though no medicinal effect has been established. Kynes tells of chamomile thrown on Midsummer bonfires for protection and prosperity, and hung in German houses against thunderstorms and bewitchment. Cunningham gives it to the Sun and water, and to money, sleep, love and purification: gamblers wash their hands in the infusion, and it is sprinkled round a property to lift curses. Kynes adds air, Mercury, Cancer and Leo, and powers that include divination, healing and psychic abilities.",
      elements: ['water', 'air'],
      planets: ['Sun', 'Mercury'],
      zodiacSigns: ['Cancer', 'Leo'],
      safetyNotes:
        "AHPA safety class 2b: not to be used in pregnancy except under a qualified practitioner's supervision, as it was once an ingredient of abortifacient formulas and is reported to stimulate menstrual flow; interaction class A, with no drug interactions known. People allergic to other members of the daisy family, such as feverfew or chamomile, should take care, since allergic reactions and contact dermatitis from the tea and from creams have been confirmed by patch testing. Its safety while breastfeeding has not been established. Cunningham likewise warns against taking it internally in pregnancy (health code P).",
      folkNames: [
        'Camomyle',
        'Chamaimelon',
        'Ground Apple',
        'Heermannchen',
        'Manzanilla',
        'Maythen',
        'Whig Plant',
        'Common Chamomile',
        'English Chamomile',
        'Sweet Chamomile',
        'True Chamomile',
        'Maythe',
        "Balder's Brow",
        'Garden Chamomile',
        'Low Chamomile',
        "Mother's Daisy",
        'Dog Fennel',
      ],
      deities: ['Cernunnos', 'Ra'],
      categories: [
        'Sleep',
        'Love',
        'Purification',
        'Protection',
        'Meditation',
        'Gambling',
        'Abundance',
        'Confidence',
        'Divination',
        'Dream Work',
        'Healing',
        'Intuition',
        'Peace',
        'Prosperity',
        'Psychic Work',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Chamomile, Roman; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Chamomile',
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
          source: 'ahpa-safety',
          locator: 'pp. 194–195; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-chamaemelum-nobile',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-chamomiles',
          supports: ['description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'The flower heads are the part used in medicine, single or double, and dried they make chamomile tea. The rays are white round a yellow centre. Kynes suggests a cup of the tea before bed to help dream work, and before divination to sharpen intuition.',
          colors: ['white', 'yellow'],
          categories: ['Dream Work', 'Divination', 'Intuition'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 194',
              supports: ['form'],
            },
            {
              source: 'grieve-chamomiles',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Chamomile',
              supports: ['form', 'description', 'colors', 'categories'],
            },
            {
              source: 'wikipedia-chamaemelum-nobile',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Herb',
          description:
            'Grieve records the whole herb used mainly for herb beers, and also infused and cooled as a lotion for toothache, earache and neuralgia, or applied in hot fomentations.',
          references: [
            {
              source: 'grieve-chamomiles',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The volatile oil is distilled from the flower heads, English-grown ones being thought the best for it; Grieve describes it as pale blue, turning yellow as it keeps, and counts it among the official preparations of the plant.',
          colors: ['blue'],
          safetyNotes:
            'AHPA records a case of light-headedness, a racing heart, raised blood pressure and nausea after the essential oil was inhaled in an aromatherapy class.',
          references: [
            {
              source: 'grieve-chamomiles',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-chamaemelum-nobile',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Chamomile',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 195',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rose',
      canonicalName: 'Rosa',
      nomenclature: 'botanical',
      description:
        "Roses are the woody perennial shrubs and climbers of the genus Rosa, in the family Rosaceae, with more than three hundred species and tens of thousands of cultivars. Most species come from Asia, with fewer from Europe, North America and north-west Africa; many carry sharp prickles on their stems, and their flowers, five-petalled in most species, are usually white or pink. Grieve traces the cultivated rose to Persia, whence it reached Greece and then southern Italy; the Romans strewed its petals at banquets, and a rose hung over a table once meant that what was said there stayed secret. The petals yield rose oil, or attar, for perfume, and rose water for cooking, cosmetics, medicine and worship, while the hips, rich in vitamin C, make jams, syrups and tea. The flower belonged to Aphrodite in Greece and later to the Virgin Mary. Kynes tells of petals scattered on Roman graves at the Rosalia, of dried rose hips as a charm against enchantment in medieval Germany, Belgium and France, and of the Germanic name Frigg's thorn. Cunningham and Kynes both give it to Venus and water, and to love, healing, protection, psychic powers and divination; Cunningham's uses include chaplets of roses in love spells and rose water in love baths, and Kynes adds Cancer, Libra, Sagittarius and Taurus, and banishing, communication and dream work.",
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Cancer', 'Libra', 'Sagittarius', 'Taurus'],
      safetyNotes:
        'AHPA, treating the hips of the commonly used species together, gives safety class 1 (safe when used appropriately) and interaction class A, with no contraindications or drug interactions known; safety in pregnancy and while breastfeeding has not been established. Cunningham classes the petals as safe (health code G) but the green parts as not for internal use (X).',
      folkNames: ['Friggdorn', "Frigg's Thorn"],
      deities: [
        'Adonis',
        'Aphrodite',
        'Athena',
        'Cupid',
        'Demeter',
        'Eros',
        'Flora',
        'Freya',
        'Frigg',
        'Hathor',
        'Isis',
        'Odin',
        'Venus',
      ],
      categories: [
        'Love',
        'Psychic Work',
        'Healing',
        'Divination',
        'Protection',
        'Banishing',
        'Communication',
        'Dream Work',
        'Intuition',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rose; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'deities',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Rose',
          supports: [
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
          source: 'ahpa-safety',
          locator: 'p. 747; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-rose',
          supports: ['canonicalName', 'description', 'deities'],
        },
        {
          source: 'grieve-roses',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'In most species the flower has five petals, usually white or pink and in a few species yellow or red. Cunningham calls a chaplet of roses, thorns removed, worn during love spells, or a single rose in a vase on the altar, strong aids to love magic, and says roses carried act as personal protection.',
          colors: ['white', 'pink', 'yellow', 'red'],
          categories: ['Love', 'Protection'],
          references: [
            {
              source: 'wikipedia-rose',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rose',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Petal',
          description:
            'Rose petals flavour food, teas and preserves, and dried red rose petals were long official in pharmacopoeias, latterly mostly for their scent. Cunningham adds petals to healing spells and mixtures, and sprinkles them round the house to calm stress and household upheaval.',
          categories: ['Healing'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rose; p. 266',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-rose',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-roses',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Bud',
          description:
            'Grieve notes that only buds about to open were gathered for the medicinal drug, and rose buds sometimes flavour tea. Cunningham says a tea of rosebuds drunk before sleep brings prophetic dreams.',
          references: [
            {
              source: 'grieve-roses',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-rose',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rose',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Fruit',
          description:
            "The hips are the rose's fruit, red in the wild roses Kynes describes, high in vitamin C and edible once the irritant hairs are removed; they make jam, jelly, syrup, soup and tea. Cunningham strings them as beads to attract love and uses them in healing; Kynes wears a string of them for support in divination and spirit work, and crumbles dried hips onto the ground in banishing.",
          colors: ['red'],
          categories: ['Love', 'Healing', 'Divination', 'Banishing'],
          safetyNotes:
            'The small hairs on whole fresh or dried hips can irritate the mouth and throat; commercial processing removes them. Allergic reactions to rose fruit have been reported.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 747',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-rose',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rose',
              supports: ['form', 'description', 'colors', 'categories'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rose',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Cunningham records a love divination in which a woman named three green rose leaves after her suitors, and the one that stayed green longest gave the answer.',
          categories: ['Divination'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rose; p. 266',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Water',
          description:
            'Rose water, a product made alongside rose oil, is used in cooking, especially Middle Eastern, Persian and South Asian sweets, and in cosmetics, medicine and religious rites; Grieve notes it as the base of cold cream. Cunningham adds it to love baths and lays a cloth soaked in it on the temples for headache.',
          categories: ['Love'],
          references: [
            {
              source: 'wikipedia-rose',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-roses',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rose',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rose',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Rose oil, also called attar or otto of roses, is a mixture of essential oils steam-distilled from crushed petals, chiefly of the damask and cabbage roses, and is the basis of rose perfumes. Grieve describes it as light yellow, sometimes tinged green, setting to a soft mass when cooled.',
          colors: ['yellow'],
          references: [
            {
              source: 'wikipedia-rose',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-roses',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rosemary',
      canonicalName: 'Salvia rosmarinus',
      nomenclature: 'botanical',
      description:
        "Rosemary is an evergreen shrub of the mint family, Lamiaceae, with fragrant, needle-like leaves, green above and pale beneath, and small flowers that are commonly pale blue or purple, sometimes white or pink. It is native to the Mediterranean region, Portugal and north-west Spain; long known as Rosmarinus officinalis, it was moved into the sage genus, Salvia, in 2017. The leaves flavour stews, roasts and marinades, its oil goes into perfumes and household products, and Hungary water, one of Europe's first alcohol-based perfumes, was distilled mainly from it. Grieve records its old fame for strengthening the memory, which made it an emblem of fidelity between lovers: it was woven into bridal wreaths, given to wedding guests and used at funerals, and burned with juniper berries in sickrooms and French hospitals. Kynes adds that it was laid in graves and carried by mourners, and used across Europe in love magic and against witches, demons and the evil eye. Cunningham calls it one of the oldest incenses, burned to cleanse a place before magic, put under the pillow against nightmares and hung at the door against thieves; he gives it to the Sun and fire, and to protection, love, lust, purification, healing and sleep. Kynes adds Mercury and the Moon, five signs, and powers that include clarity, creativity, dream work and fidelity.",
      elements: ['fire'],
      planets: ['Sun', 'Mercury', 'Moon'],
      zodiacSigns: ['Aquarius', 'Aries', 'Leo', 'Sagittarius', 'Virgo'],
      safetyNotes:
        'AHPA safety class 1 and interaction class A: no contraindications or drug interactions are known, and its concerns apply to therapeutic doses, not to rosemary as a kitchen spice. It is listed as an emmenagogue (it may bring on menstruation). Skin allergy to rosemary has been confirmed by patch testing; an extract reduced the absorption of iron from food; and because rosemary lowered blood sugar in animal studies, people with diabetes on insulin or tablets should keep monitoring their glucose. Cunningham advises against high internal doses and against internal use in pregnancy (health codes D+ and P). Kynes, in Herbal Remedies, says to avoid it in pregnancy, while breastfeeding, and with high blood pressure or epilepsy, and warns that too much may irritate the stomach.',
      folkNames: [
        'Compass Weed',
        'Dew of the Sea',
        'Elf Leaf',
        'Guardrobe',
        'Incensier',
        'Libanotis',
        'Polar Plant',
        'Sea Dew',
        'Compass Plant',
        'Garden Rosemary',
        'Rosmarine',
      ],
      deities: ['Aphrodite', 'Venus'],
      categories: [
        'Protection',
        'Love',
        'Lust',
        'Purification',
        'Healing',
        'Sleep',
        'Memory',
        'Cleansing',
        'Knowledge',
        'Clarity',
        'Communication',
        'Creativity',
        'Dream Work',
        'Inspiration',
        'Fidelity',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rosemary; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Rosemary',
          supports: [
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
          source: 'ahpa-safety',
          locator: 'pp. 748–749; p. xxii',
          supports: ['safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'p. 220',
          supports: ['safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-rosemary',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'grieve-rosemary',
          supports: ['description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The leaves are the part AHPA lists, used fresh or dried in Mediterranean cooking and for tea. Cunningham burns them with juniper berries in sickrooms to promote healing, and binds the powdered leaves in linen to the right arm to lift depression and lighten the mood.',
          categories: ['Healing'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 748',
              supports: ['form'],
            },
            {
              source: 'wikipedia-rosemary',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rosemary',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rosemary',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The small flowers grow in twos and threes along the branches and are pale blue in Grieve and Kynes; Wikipedia adds white, pink, purple and deep blue. Kynes hangs a sachet of the dried flowers from the bedhead to help remember dreams.',
          colors: ['blue', 'white', 'pink', 'purple'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Rosemary',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-rosemary',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-rosemary',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 220',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Oil of rosemary is distilled from the flowering tops or, more often, the stems and leaves; Grieve calls it colourless and a remedy for headache, and it goes into perfumes, shampoos and aromatherapy. Kynes diffuses a little of the essential oil to prepare a space for ritual, magic or healing, and uses it to consecrate charms and amulets.',
          colors: ['colourless'],
          categories: ['Healing'],
          safetyNotes:
            'AHPA advises that although dried rosemary or its tea may be safe in pregnancy, the essential oil and other concentrated extracts should not be used then.',
          references: [
            {
              source: 'grieve-rosemary',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-rosemary',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rosemary',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 749',
              supports: ['safetyNotes'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'The woody stem, stripped of leaves, is sometimes used as a skewer. Cunningham says the wood, smelled often, keeps one youthful.',
          references: [
            {
              source: 'wikipedia-rosemary',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rosemary',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rowan',
      canonicalName: 'Sorbus aucuparia',
      nomenclature: 'botanical',
      description:
        "Rowan, or mountain ash, is a small tree or shrub of the rose family, native to most of Europe and to parts of Asia and northern Africa, its range running from Madeira, Iceland and the British Isles to Russia and northern China. Despite the name it is no relation of the true ashes, sharing only their pinnate leaves. In May and June it bears dense, upright heads of small creamy-white flowers, followed by clusters of orange to scarlet berries that many birds eat; its species name recalls the berries' old use as bait for catching birds. The bitter berries, which Kynes says are safe to eat only when cooked, are debittered and made into jelly, jam, syrup, wine and liqueurs, and Grieve records a gargle of the ripe berries for sore throats and a decoction of the bark for diarrhoea. Its tough, flexible wood was used for carving and turning. Across Europe and the British Isles rowan was a defence against witches: branches were hung in houses, stables and byres, twigs carried as amulets, and in Norse myth Thor saved himself from a raging river by grasping a rowan. Cunningham gives it to the Sun and fire, and to Thor, psychic powers, healing, success and protection, with the wood for wands and dowsing rods and a cross of twigs bound with red thread as an amulet. Kynes adds earth, the Moon, Saturn and Uranus, three signs, and powers that include divination, fertility, strength and wisdom.",
      elements: ['fire', 'earth'],
      planets: ['Sun', 'Moon', 'Saturn', 'Uranus'],
      zodiacSigns: ['Aquarius', 'Capricorn', 'Sagittarius'],
      safetyNotes:
        'Cunningham advises against taking the fruit internally (health code X), and Kynes warns that rowanberries are safe to eat only when cooked.',
      folkNames: [
        'Delight of the Eye',
        'Mountain Ash',
        'Quickbane',
        'Ran Tree',
        'Roden-Quicken',
        'Roden-Quicken-Royan',
        'Roynetree',
        'Sorb Apple',
        "Thor's Helper",
        'Whitty',
        'Wicken-Tree',
        'Wiggin',
        'Wiggy',
        'Wiky',
        'Wild Ash',
        'Witchbane',
        'Witchen',
        'Witchwood',
        'European Mountain Ash',
        'Quickbeam',
        'Roan Tree',
        'Witch Beam',
        'Witchen Tree',
        'European Rowan',
        'Rowan-Berry',
        'Rowan Tree',
      ],
      deities: [
        'Thor',
        'Aphrodite',
        'Brigid',
        'Cerridwen',
        'Dagda',
        'Hecate',
        'Pan',
        'Selene',
        'Vulcan',
      ],
      categories: [
        'Psychic Work',
        'Healing',
        'Success',
        'Protection',
        'Divination',
        'Creativity',
        'Fertility',
        'Inspiration',
        'Strength',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rowan; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Rowan',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-sorbus-aucuparia',
          supports: ['canonicalName', 'description', 'folkNames', 'deities'],
        },
        {
          source: 'grieve-ash-mountain',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Berry',
          description:
            'The berries ripen from August to October, orange to scarlet, each crowned with a small black star where the sepals were. Cunningham adds them to divination and psychic incenses and to healing, success and luck sachets; Kynes lays a cluster on the altar for defence and to help break a hex, and dried berries in a workspace for creativity or on the altar for healing rituals.',
          colors: ['orange', 'red'],
          categories: [
            'Divination',
            'Psychic Work',
            'Healing',
            'Success',
            'Creativity',
            'Hex-Breaking',
          ],
          references: [
            {
              source: 'wikipedia-sorbus-aucuparia',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rowan',
              supports: ['form', 'description', 'colors', 'categories'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rowan',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'grieve-ash-mountain',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'The wood is tough and flexible, worked by cartwrights, turners and carvers, and in England dowsing rods for finding ore were cut from it. Cunningham says carrying rowan wood strengthens psychic powers, and uses the branches for dowsing rods and wands and the wood for walking sticks for those who roam at night; two twigs tied in a cross with red thread make an old protective amulet.',
          categories: ['Psychic Work', 'Protection'],
          references: [
            {
              source: 'wikipedia-sorbus-aucuparia',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rowan',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'Grieve lists the bark among the parts used: spongy and yellowish grey outside, light brown within, bitter and astringent, it was given as a decoction for diarrhoea. Cunningham says carrying the bark, like the berries, helps recovery from illness.',
          references: [
            {
              source: 'grieve-ash-mountain',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rowan',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves were once fermented with sweet gale and oak bark to make a herb beer, and are sometimes fed to livestock. Cunningham adds them, with the berries, to divination incenses and those for psychic powers.',
          categories: ['Divination', 'Psychic Work'],
          references: [
            {
              source: 'wikipedia-sorbus-aucuparia',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rowan',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rue',
      canonicalName: 'Ruta graveolens',
      nomenclature: 'botanical',
      description:
        "Rue is a small, woody, evergreen shrub of the family Rutaceae, native to the Mediterranean and southern Europe and grown in gardens far beyond for its bluish-green, finely divided leaves, which smell strongly when bruised and taste intensely bitter. Its small flowers are dull or greenish yellow, with four or five petals. It flavoured Roman and Near Eastern cooking and is still used sparingly, in Italian grappa and some Mediterranean dishes. Grieve counts it among England's oldest garden plants: Hippocrates praised it, Mithridates put it in his antidote to poison, holy water was once sprinkled from brushes of rue, which is said to have earned it the name herb of grace, and judges at the assizes kept sprigs on the bench against gaol fever. It has long been a charm against the evil eye, among the Romans, in Italy and in Sephardic tradition, and it is the national herb of Lithuania. Kynes recalls the herb that freed Ulysses's companions from Circe's enchantment, and an English belief that no witch could enter a house whose floors had been washed with rue. Cunningham gives it to Mars and fire, and to healing and love: rue in the bath breaks hexes, hung at the door it protects, and a sprig sprinkles salt water to clear a house of negativity. Kynes adds Saturn, the Sun, three signs, and powers that include banishing, divination, purification and wisdom.",
      elements: ['fire'],
      planets: ['Mars', 'Saturn', 'Sun'],
      zodiacSigns: ['Capricorn', 'Leo', 'Pisces'],
      safetyNotes:
        "AHPA safety class 2b: not to be used in pregnancy except under a qualified practitioner's supervision, since it has traditionally been used to cause abortion and stimulates menstruation; interaction class A, with no drug interactions known. Avoid long exposure to sunlight after taking it, and note that its furanocoumarins can inflame the skin (phytophotodermatitis) when skin it has touched is then exposed to sunlight. At normal therapeutic doses it has been linked with low mood, poor sleep, drowsiness, dizziness and cramps, and it can irritate the stomach; its safety while breastfeeding has not been established. Cunningham warns against taking it internally in pregnancy, with kidney problems or with blood-thinning medication, and says it may increase sensitivity to sunlight (health codes P, K, B, S). Kynes adds that it may cause dermatitis and that it is unsafe to burn.",
      folkNames: [
        'Bashoush',
        'Garden Rue',
        'German Rue',
        'Herb of Grace',
        'Herbygrass',
        'Hreow',
        'Mother of the Herbs',
        'Rewe',
        'Ruta',
        'Common Rue',
        'Wild Rue',
        'Herbgrass',
        'Ruda',
        'Arruda',
        'Chou Cao',
        'Herb of Repentance',
      ],
      deities: ['Aradia', 'Circe', 'Diana', 'Mars'],
      categories: [
        'Healing',
        'Love',
        'Hex-Breaking',
        'Protection',
        'Banishing',
        'Clarity',
        'Divination',
        'Inspiration',
        'Purification',
        'Release',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rue; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Rue',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 761; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-ruta-graveolens',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-rue',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          description:
            'The whole herb, fresh or dried, is the part used; the tips of young shoots, gathered before flowering, were thought the strongest. Grieve gives warm infusions of it, and the dried herb powdered; Kynes lists it for sale as cut, dried stems and leaves.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 761',
              supports: ['form'],
            },
            {
              source: 'grieve-rue',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rue',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The bitter leaves can flavour eggs, cheese and fish in small amounts. Grieve and Cunningham both lay fresh leaves on the forehead or temples for headache, and Grieve applies bruised leaves to sciatica. Cunningham rubs fresh leaves on the floorboards to send back ill spells; Kynes strews crumbled dried leaves to prepare an outdoor space for ritual.',
          references: [
            {
              source: 'wikipedia-ruta-graveolens',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-rue',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Rue',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rue',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            "The flowers set brown seed capsules. Kynes sprinkles the seeds under the doormat to strengthen a home's protection, and keeps a small pouch of them with divination tools to keep them ready for use.",
          categories: ['Protection', 'Divination'],
          references: [
            {
              source: 'wikipedia-ruta-graveolens',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Rue',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Oil of rue is distilled from the fresh herb, and Grieve gives it by the drop on sugar or in hot water. Wikipedia notes that Pliny the Elder and Soranus cited the refined oil as a means of bringing on menstruation and abortion.',
          references: [
            {
              source: 'grieve-rue',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-ruta-graveolens',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rye',
      canonicalName: 'Secale cereale',
      nomenclature: 'botanical',
      description:
        'Rye is a tall annual or biennial grass of the wheat tribe, grown for its seed as a grain, as a winter cover crop and as fodder. It stands one to three metres high, with long, pointed, blue-green leaves and its seeds held in a curved spike. Better able than other cereals to bear cold weather and poor, sandy or peaty ground, it is grown chiefly from eastern and northern Europe into Russia, and remains from a site in northern Syria suggest it was among the first cereals people ever cultivated, some 13,000 years ago. The grain goes into bread, crispbread, beer and whiskey, and was a staple of medieval Scandinavia. Rye is very prone to ergot, a fungus whose infected grains brought epidemics of poisoning to the damp northern countries that lived on it. German folklore peoples its fields with the Roggenwolf, a wolf-shaped spirit said to carry off children, and the Roggenmutter who runs with a pack of them. Kynes records rye laid on the threshold or under the rafters of a new German house for luck and protection, its grains used across Europe and the British Isles in love divination, and the Dutch use of rye to unmask a witch. Cunningham gives it to Venus and earth, for love and fidelity, noting its place in Romany love spells and that rye bread served to those you love keeps their love.',
      elements: ['earth'],
      planets: ['Venus'],
      safetyNotes:
        "Cunningham's health code marks rye as safe (code G: currently recognised as safe).",
      categories: [
        'Love',
        'Fidelity',
        'Protection',
        'Divination',
        'Abundance',
        'Fertility',
        'Prophecy',
        'Prosperity',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Rye; p. 266',
          supports: ['description', 'elements', 'planets', 'safetyNotes', 'categories'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Grain',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-rye',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'wikipedia-rye',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Grain',
              supports: ['form'],
            },
          ],
        },
      ],
      zodiacSigns: ['Virgo'],
      deities: [
        'Brigid',
        'Ceres',
        'Demeter',
        'Holda',
        'Inanna',
        'Isis',
        'Lugh',
        'Osiris',
        'Persephone',
      ],
    },
    {
      name: 'Saffron',
      canonicalName: 'Crocus sativus',
      nomenclature: 'botanical',
      description:
        "Saffron is the dried stigmas of the saffron crocus, a small perennial of the iris family that grows from a corm to between ten and thirty centimetres and flowers purple in autumn, each bloom bearing three red or orange stigmas. Being a sterile triploid, it is unknown in the wild and survives only because growers divide and replant its corms; botanists think it was bred from a wild crocus of southern mainland Greece. People have grown it and traded the spice for more than 3,500 years, and tens of thousands of flowers go into a single pound, which keeps it costly. Grieve identifies it with the Karcom of the Song of Solomon, notes that it was once grown widely round Saffron Walden in Essex, and records how highly the East prized its yellow dye; Northcote repeats Hakluyt's tale of a pilgrim who smuggled a corm into England inside his hollowed staff. Kynes tells of Phoenician moon-shaped cakes for Astarte, Egyptians burning it for Thoth, medieval German magicians burning it to call up spirits, and Moroccan amulets against jinn. Cunningham gives it to the Sun and fire, for love, lust, healing, strength and psychic powers: it goes into love sachets, its infusion washes the hands before healing rites and, drunk, is said to show the future, and the ancient Persians used it to raise the wind.",
      elements: ['fire'],
      planets: ['Sun'],
      zodiacSigns: ['Leo', 'Scorpio'],
      safetyNotes:
        "AHPA safety class 2b and interaction class A: not for use in pregnancy except under the supervision of a qualified practitioner, since saffron stimulates the muscles of the womb and has been used to cause abortion; safety while nursing is not established, and no drug interactions are known. Overdose (the German Commission E sets 1.5 g a day as the maximum) has brought on vomiting, bleeding, vertigo, confusion and a jaundice-like yellowing of the skin; AHPA notes these concerns come from medicinal doses, not its use as a spice. Cunningham's health codes: not to be taken internally in high doses, or while pregnant. Kynes cautions that overuse can be toxic, and that saffron must not be confused with the highly toxic autumn crocus, Colchicum autumnale.",
      folkNames: [
        'Autumn Crocus',
        'Karcom',
        'Krokos',
        'Kunkuma',
        'Saffer',
        'Spanish Saffron',
        'Saffron Crocus',
        'True Crocus',
        'True Saffron',
        'Zaffer',
      ],
      deities: ['Eros', 'Astarte', 'Hera', 'Thoth', 'Zeus'],
      categories: [
        'Love',
        'Healing',
        'Lust',
        'Strength',
        'Psychic Work',
        'Banishing',
        'Divination',
        'Dream Work',
        'Fertility',
        'Manifestation',
        'Peace',
        'Protection',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Saffron; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Crocus',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 280–281; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-crocus-sativus',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-saffron',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 81',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'The spice is the stigmas and part of the style plucked from each flower: Grieve describes them picked out in September, dried on a kiln between sheets of paper and pressed into cakes, with a bitter taste and a penetrating, aromatic smell. Each flower gives only three stigmas, and Wikipedia advises harvesting in mid-morning, when the flowers are fully open.',
          colors: ['red', 'orange', 'yellow'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 280',
              supports: ['form'],
            },
            {
              source: 'grieve-saffron',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-crocus-sativus',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Crocus',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sage',
      canonicalName: 'Salvia officinalis',
      nomenclature: 'botanical',
      description:
        "Common sage is an evergreen subshrub of the mint family, native to the Mediterranean and now naturalised widely, with woody stems, wrinkled grey-green leaves that are softly hairy beneath, and whorls of blue to purple flowers in late spring or summer. Grieve found it growing wild on the limestone hills along the Adriatic, where gathering it was a cottage industry in Dalmatia. Its genus name comes from the Latin salvere, to be saved, a nod to its healing fame: the Romans called it a holy herb, Charlemagne had it grown, and an old saying asked why anyone should die while sage grows in the garden. It is a staple of European cooking, from Italian saltimbocca to British sage and onion stuffing, and has long been drunk as a tea and used as a gargle for sore throats. Folklore sowed it on graves to soften grief and held that it thrived or withered with its owner's business. In magic Cunningham gives it to Jupiter and air, for longevity, wisdom and protection, quoting the rhyme that whoever would live for ever must eat sage in May, and has it carried for wisdom; Kynes adds earth and Mercury, uses it for divination, healing, purification and psychic work, and notes that common sage now often stands in for white sage in smoke cleansing.",
      elements: ['air', 'earth'],
      planets: ['Jupiter', 'Mercury'],
      zodiacSigns: ['Aquarius', 'Pisces', 'Sagittarius', 'Taurus'],
      safetyNotes:
        "AHPA safety classes 2b and 2d, interaction class A: not for use in pregnancy except under the supervision of a qualified practitioner, and do not exceed the recommended dose (given as 3 to 12 g of dried leaf as a tea). The leaf holds thujone. Sage is traditionally used to dry up breast milk, so it should be avoided by anyone nursing who wishes to continue. No drug interactions are known; AHPA notes these concerns come from medicinal doses, not its use in cooking. Cunningham's health codes: not if pregnant, not for long-term internal use, and not internally in high doses. Kynes cautions that it is an abortifacient, and in Herbal Remedies advises against daily use, and against it in pregnancy and breastfeeding, with epilepsy or another seizure disorder, high blood pressure or diabetes.",
      folkNames: [
        'Garden Sage',
        'Red Sage',
        'Sawge',
        'Common Sage',
        'European Sage',
        'True Sage',
        'Dalmatian Sage',
        'Kitchen Sage',
        'Broad-leaved White Sage',
        'Narrow-leaved White Sage',
        'Golden Sage',
        'Culinary Sage',
        'Broadleaf Sage',
      ],
      deities: ['Jupiter', 'Zeus'],
      categories: [
        'Longevity',
        'Wisdom',
        'Protection',
        'Divination',
        'Healing',
        'Psychic Work',
        'Purification',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Sage; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Sage',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 771–772; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 221–222',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-salvia-officinalis',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-sages',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The leaves are the part sold and used, cut and dried or powdered. Grieve gives them as a strong infusion for a gargle or mouthwash and rubbed fresh on the teeth to clean them and firm the gums. Cunningham has a wish written on a sage leaf and slept on for three nights: dream of the wish and it will come true, and if not, bury the leaf.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 771',
              supports: ['form'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 221',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Sage',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-sages',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Sage',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'An essential oil is distilled from the leaves and twigs, above all in Dalmatia and Germany. Kynes diffuses a little before divination and psychic work to sharpen concentration.',
          safetyNotes:
            'The oil is rich in thujone, up to about 60% alpha- and 25% beta-thujone. AHPA records that an overdose of the essential oil may cause vomiting, heavy salivation or seizures, and that the German Commission E contraindicates the oil and alcohol extract in pregnancy. Grieve calls the volatile oil a violent convulsant.',
          categories: ['Divination', 'Psychic Work'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Sage',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 771–772',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'grieve-sages',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Kynes records that medieval French and German magicians burned sage seed to make smoke and fumes in rituals that drove away evil spirits.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Sage',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sassafras',
      canonicalName: 'Sassafras albidum',
      nomenclature: 'botanical',
      description:
        'Sassafras is a deciduous tree of the laurel family native to eastern North America, from southern Maine and Ontario to Florida and Texas, growing fifteen to twenty metres tall with deeply furrowed red-brown bark. It is known for carrying three shapes of leaf on one branch, unlobed, mitten-shaped and three-lobed, and for its yellowish spring flowers and dark blue fruits on red stalks. Peoples of the south-east such as the Choctaw used it as food and medicine, thickening soups with it and rubbing the leaves into wounds, and the dried, ground leaves live on as filé powder in Louisiana gumbo. European settlers took it up as a medicine: Grieve notes its early fame in Spain as a cure for syphilis and rheumatism, it was sold on London street corners as a morning drink called saloop, and its root flavoured the original root beer until the safrole in it was found to cause liver damage and cancer in laboratory animals. Ozark lore heard a coming death in sassafras wood popping on the fire. In magic Cunningham gives it to Jupiter and fire, carried in a purse or burned to draw money and added to healing sachets; Kynes adds Saturn, Venus and Leo, uses it for prosperity and protection, and notes its place in hoodoo work to attract wealth.',
      elements: ['fire'],
      planets: ['Jupiter', 'Saturn', 'Venus'],
      zodiacSigns: ['Leo'],
      safetyNotes:
        "AHPA safety classes 2b and 2d, interaction class A: not for use in pregnancy except under the supervision of a qualified practitioner, not for long-term use, and do not exceed the recommended dose. The root bark holds 5 to 8% safrole and the essential oil about 80%; safrole caused cancer in animals fed high amounts over long periods, and United States rules allow sassafras in food only when it is safrole-free. AHPA considers occasional sassafras tea safe but discourages alcohol extracts, and its concerns do not apply to safrole-free products. No drug interactions are known. Cunningham's health codes: not for long-term internal use, and not internally in high doses. Kynes cautions that, as a potential carcinogen, sassafras is considered unsafe to ingest.",
      folkNames: [
        'Saxifrax',
        'Ague Tree',
        'Cinnamon Wood',
        'Common Sassafras',
        'Mitten Tree',
        'Saloop',
        'Sassafrax',
        'White Sassafras',
        'Red Sassafras',
        'Silky Sassafras',
      ],
      categories: ['Prosperity', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Sassafras; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'folkNames',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Sassafras',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 786; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-sassafras-albidum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-sassafras',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            "The root and its soft, spongy bark are the part used, sold in large branched pieces; Grieve gives the bark's colour as reddish or greyish-brown. The root went into saloop and the first root beers, and Kynes places a bundle of roots near the front door for protection.",
          colors: ['brown'],
          categories: ['Protection'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 786',
              supports: ['form'],
            },
            {
              source: 'grieve-sassafras',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Sassafras',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Dried and ground, the leaves are filé powder, the thickener and seasoning of Louisiana gumbo, a use that came from the Choctaw. Kynes sets a pair of mitten-shaped leaves, a left and a right, wherever negativity needs warding off, and washes coins in a tea of the leaves before keeping them in a wallet to draw money.',
          references: [
            {
              source: 'wikipedia-sassafras-albidum',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-sassafras',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Sassafras',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The fragrant oil is distilled from the root bark, and Grieve records it scenting cheap perfumes and soaps and flavouring medicines and fizzy drinks. Most commercial sassafras oil now comes from camphor production in Asia or from related Brazilian trees.',
          safetyNotes:
            'The essential oil is about 80% safrole (AHPA). Grieve records that a teaspoonful caused vomiting, dilated pupils, stupor and collapse in a young man, that the oil can cause fatal narcotic poisoning, and that its use has caused abortion.',
          references: [
            {
              source: 'grieve-sassafras',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 786',
              supports: ['safetyNotes'],
            },
            {
              source: 'wikipedia-sassafras-albidum',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Scarlet Pimpernel',
      canonicalName: 'Lysimachia arvensis',
      nomenclature: 'botanical',
      description:
        "Scarlet pimpernel is a small, low-growing annual of the primrose family, long known as Anagallis arvensis, with weak, square, sprawling stems and paired, stalkless, oval leaves. From spring to autumn single flowers about a centimetre across open in the leaf axils, usually scarlet or orange-red but sometimes blue, pink or white. They open only in sunshine and shut when the sky clouds over, which earned it names such as poor man's weather-glass and shepherd's barometer. Native to Europe, western Asia and North Africa, it now grows as a weed of light soils, field edges and roadsides almost worldwide. The plant is bitter and acrid and has poisoned animals fed on it, yet it was once prized as a cure-all: the ancient Greeks gave it for low spirits and eye complaints, and Grieve records it as a cosmetic wash against freckles and a remedy for melancholy and epilepsy. An old writer she quotes held it good against witchcraft, and Kynes adds that it was hung over doorways in medieval England for that purpose, used in sixteenth-century Scotland to tell whether a wounded person would live, and believed in Ireland to give second sight and an understanding of birds and beasts. Kynes gives it to air, Mercury and the Sun, for clarity, protection, psychic abilities and truth.",
      elements: ['air'],
      planets: ['Mercury', 'Sun'],
      zodiacSigns: ['Gemini', 'Leo', 'Virgo'],
      safetyNotes:
        'Kynes cautions that every part of the plant, the roots above all, is toxic if eaten.',
      folkNames: [
        "Bird's Eye",
        "Poor Man's Weather-Glass",
        'Red Chickweed',
        'Waywort',
        "Shepherd's Barometer",
        "Adder's Eyes",
        'Red Pimpernel',
        "Poor Man's Barometer",
        "Shepherd's Weather Glass",
        "Shepherd's Clock",
      ],
      categories: ['Clarity', 'Protection', 'Psychic Work', 'Truth'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Pimpernel',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'wikipedia-lysimachia-arvensis',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-pimpernel-scarlet',
          supports: ['description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          description:
            'Grieve gives the whole herb, gathered wild in June when the leaves are at their best and used fresh or dried, as an infusion, a tincture of the fresh leaves or a powder of the dried leaves. For a protective shield Kynes gathers handfuls of flowering and leafy sprigs and throws them into the air at the close of the working, picturing a shield of energy forming as they fall.',
          categories: ['Protection'],
          references: [
            {
              source: 'grieve-pimpernel-scarlet',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Pimpernel',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The five-petalled flowers are usually orange-red or scarlet. Grieve notes that the dried flowers alone were given for epilepsy and that a homoeopathic tincture is made from them, and both she and Kynes record the old belief that the red-flowered plant is male and the blue female.',
          colors: ['red', 'orange'],
          references: [
            {
              source: 'grieve-pimpernel-scarlet',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Pimpernel',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-lysimachia-arvensis',
              supports: ['colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Yew',
      canonicalName: 'Taxus baccata',
      nomenclature: 'botanical',
      description:
        'Yew is an evergreen conifer of the family Taxaceae, native to much of Europe and to parts of West Asia, the Caucasus and north-west Africa. It is a small to medium tree, often with several trunks, thin reddish-brown bark that flakes away, and flat, glossy, dark green needles that are paler beneath. Each seed sits almost enclosed in a soft, bright red cup, the aril, which ripens in autumn. Yews can live for many centuries, and some British trees are thought to be older than the tenth century; they are a familiar sight in the churchyards of Britain, Ireland and Normandy. The wood was prized for longbows and lutes. Kynes traces its long tie to death and the underworld among the Greeks and Romans, alongside hope and rebirth; its sacredness to the Celts of Gaul and the Druids; yew branches carried at French funerals; amulets of yew worn against bewitchment in Germanic lands; and Welsh and Scottish lore of faeries seen beneath it. Cunningham places it under Saturn and water and says it is used to call up the spirits of the dead, though rarely, because it is so poisonous. Kynes adds air and fire, Jupiter, Mars and Capricorn, and ties it to ancestors, divination and protection.',
      elements: ['water', 'air', 'fire'],
      planets: ['Saturn', 'Jupiter', 'Mars'],
      zodiacSigns: ['Capricorn'],
      safetyNotes:
        'Highly poisonous. Every part of the tree except the red flesh around the seed is toxic: the seeds and foliage can be fatal if eaten, and the toxins can also be taken in through the skin and by breathing. Its taxine alkaloids act on the heart, and swallowing leaves or seeds needs urgent medical attention; there is no known antidote. Livestock are often killed by eating it.',
      folkNames: ['Common Yew', 'European Yew', 'English Yew'],
      deities: [
        'Artemis',
        'Bacchus',
        'Dagda',
        'Dionysus',
        'Hecate',
        'Hermes',
        'Loki',
        'Lugh',
        'Odin',
        'Saturn',
      ],
      categories: [
        'Ancestor Work',
        'Communication',
        'Divination',
        'Dream Work',
        'Justice',
        'Legal Matters',
        'Knowledge',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Yew',
          supports: ['canonicalName', 'description', 'elements', 'planets', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Yew',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
        {
          source: 'wikipedia-taxus-baccata',
          supports: ['canonicalName', 'description', 'safetyNotes', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'The wood was long favoured for longbows, by the English and Welsh especially, and for lutes; Kynes notes boxes and other objects made of it, and Germanic amulets of yew wood worn against bewitchment.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Yew',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-taxus-baccata',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Berry',
          description:
            'Kynes suggests a sachet of dried berries by the bed against bad dreams, and berries on the altar during divination.',
          safetyNotes:
            'The red flesh of the berry is the only part of the tree that is not poisonous; the seed it encloses is.',
          categories: ['Divination'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Yew',
              supports: ['form', 'description', 'categories', 'safetyNotes'],
            },
            {
              source: 'wikipedia-taxus-baccata',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Yucca',
      canonicalName: 'Yucca',
      nomenclature: 'botanical',
      description:
        'Yucca is a genus of about fifty perennial species native to North America, from Panama north into Canada, classed in the asparagus family alongside the agaves. Its plants range from small shrubs to tree-like forms, with stiff, sword-shaped, often spine-tipped leaves gathered in rosettes and tall stalks of white, bell-like flowers. Each species depends on yucca moths, which pollinate the flowers and lay their eggs in the seed capsules, a well-known case of mutual dependence. For the Indigenous peoples of the American Southwest and Mexico it has been one of the most useful wild plants: its fibres made sandals, rope, baskets, nets and mats, its roots a soap, and its stalks and flowers food. Kynes records that the Navajo washed with the root soap for ceremonial purification, that the Tewa used banana yucca in naming ceremonies, and that parts of the plant were offered to deities. The flower is the state flower of New Mexico and, as flor de izote, the national flower of El Salvador. Cunningham gives it to Mars and fire, for protection, purification and transmutation, describing a cross of twisted fibres laid on the hearth to guard the house; Kynes adds earth and Pluto, and the root in spells to purify ritual space.',
      elements: ['fire', 'earth'],
      planets: ['Mars', 'Pluto'],
      safetyNotes:
        "AHPA safety class 2d: do not exceed the recommended dose. Allergic reactions to yucca have been reported. Safety while nursing is not established. Cunningham's health code marks the root as safe.",
      folkNames: ["Adam's Needle", 'Spanish Bayonet', 'Soapweed', 'Amole', 'Dagger Plant'],
      deities: ['Gaia', 'Pachamama'],
      categories: ['Protection', 'Purification', 'Transformation'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Yucca; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'safetyNotes',
            'categories',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Yucca',
          supports: ['description', 'elements', 'planets', 'folkNames', 'deities', 'categories'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 941',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-yucca',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The Navajo made a soap from the root for ceremonial purification, and Kynes suggests the root in spells against jinxes or to purify ritual space.',
          categories: ['Purification'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 941',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Yucca',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Yucca',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Fibres pulled from the leaves are twisted into hoops, wreaths and crosses: Cunningham describes a cross on the hearth against evil, and Kynes a protective door wreath, or two leaves hung crossed like swords.',
          categories: ['Protection'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Yucca',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Yucca',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Zedoary',
      canonicalName: 'Curcuma zedoaria',
      nomenclature: 'botanical',
      description:
        'Zedoary is a perennial herb of the ginger family, Zingiberaceae, native to South and Southeast Asia and now naturalised elsewhere, Florida among them. It grows in clumps up to about a metre tall, with broad, lance-shaped leaves, and its yellow flowers sit among red and green bracts. The large, branching rhizome is white inside, smells somewhat of mango and tastes like ginger with a bitter finish; it is ground into white curry pastes in Indonesia, pickled or used fresh in India, and cut raw into Thai salads. Austronesian peoples carried it across the Pacific in prehistoric times. Grieve describes the dried rhizome as an aromatic stimulant once given for colic and weak digestion, though seldom used, since ginger served as well. Kynes records that Arab physicians held it an aphrodisiac, that it reached Europe in the sixth century, that the Anglo-Saxons used it against elf enchantment, that Hildegard von Bingen called it a strong healer, and that it was taken against the plague in seventeenth-century Britain and Europe. She gives it to fire, Mars and the Sun, for healing, and suggests a sachet of the dried root hung on the bedpost to keep bad dreams away.',
      elements: ['fire'],
      planets: ['Mars', 'Sun'],
      safetyNotes:
        'AHPA safety classes 2b and 2d: not for use in pregnancy except under the supervision of a qualified practitioner, and not when menstrual bleeding is heavy. A Chinese medicine text it cites advises caution alongside anticoagulant or antiplatelet drugs, a theoretical concern with no interaction documented. Safety while nursing is not established. These cautions concern therapeutic doses, not its use as a spice.',
      folkNames: [
        'Indian Arrowroot',
        'White Turmeric',
        'Wild Turmeric',
        'Zitterwurzel',
        'Temu Putih',
      ],
      categories: ['Healing'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Zedoary',
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
          source: 'ahpa-safety',
          locator: 'p. 289',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-curcuma-zedoaria',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'grieve-zedoary',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 289',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Zedoary',
              supports: ['form'],
            },
            {
              source: 'grieve-zedoary',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Kynes suggests sprinkling a circle of the powdered root on the altar to strengthen a healing ritual, then gathering it up by hand and blowing it away outdoors.',
          categories: ['Healing'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Zedoary',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'An essential oil is distilled from the dried rhizomes and goes into perfumes, soaps and bitter tonics.',
          references: [
            {
              source: 'wikipedia-curcuma-zedoaria',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Zedoary',
              supports: ['form'],
            },
          ],
        },
      ],
    },
  ],
};
