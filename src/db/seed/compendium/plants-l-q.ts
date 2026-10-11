import type { SeedCompendiumShard } from '../types';

// MB.245's shard: the candidate list's plants and fungi labelled L to Q
// (claude-docs/db/compendium-seed/candidates.md), Mugwort aside, which the
// pilot seeds. Every value traces to a source a citation names, read during
// the task; the sources entry by entry, and what was left out and why, are in
// claude-docs/db/compendium-seed/plants-l-q.md. Descriptions are written
// fresh from the sources, never copied.
export const PLANTS_L_Q: SeedCompendiumShard = {
  name: 'plants-l-q',
  sources: {
    'nccih-lavender': {
      kind: 'web_page',
      title: 'Lavender: Usefulness and Safety',
      container: 'National Center for Complementary and Integrative Health',
      url: 'https://www.nccih.nih.gov/health/lavender',
      accessed: '2026-10-11',
    },
    'nccih-licorice-root': {
      kind: 'web_page',
      title: 'Licorice Root: Usefulness and Safety',
      container: 'National Center for Complementary and Integrative Health',
      url: 'https://www.nccih.nih.gov/health/licorice-root',
      accessed: '2026-10-11',
    },
    'wikipedia-alchemilla-vulgaris': {
      kind: 'entry',
      title: 'Alchemilla vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Alchemilla_vulgaris&oldid=1378339843',
      accessed: '2026-10-11',
    },
    'wikipedia-allium-ampeloprasum': {
      kind: 'entry',
      title: 'Allium ampeloprasum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Allium_ampeloprasum&oldid=1377819548',
      accessed: '2026-10-11',
    },
    'wikipedia-aloysia-citrodora': {
      kind: 'entry',
      title: 'Aloysia citrodora',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aloysia_citrodora&oldid=1355041172',
      accessed: '2026-10-11',
    },
    'wikipedia-anemone-hepatica': {
      kind: 'entry',
      title: 'Anemone hepatica',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Anemone_hepatica&oldid=1373572322',
      accessed: '2026-10-11',
    },
    'wikipedia-arum-maculatum': {
      kind: 'entry',
      title: 'Arum maculatum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Arum_maculatum&oldid=1332625066',
      accessed: '2026-10-11',
    },
    'wikipedia-cardamine-pratensis': {
      kind: 'entry',
      title: 'Cardamine pratensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cardamine_pratensis&oldid=1377075070',
      accessed: '2026-10-11',
    },
    'wikipedia-consolida-regalis': {
      kind: 'entry',
      title: 'Consolida regalis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Consolida_regalis&oldid=1361839193',
      accessed: '2026-10-11',
    },
    'wikipedia-cymbopogon-citratus': {
      kind: 'entry',
      title: 'Cymbopogon citratus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cymbopogon_citratus&oldid=1365355224',
      accessed: '2026-10-11',
    },
    'wikipedia-cypripedium-parviflorum': {
      kind: 'entry',
      title: 'Cypripedium parviflorum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cypripedium_parviflorum&oldid=1349033568',
      accessed: '2026-10-11',
    },
    'wikipedia-ficaria-verna': {
      kind: 'entry',
      title: 'Ficaria verna',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ficaria_verna&oldid=1371144682',
      accessed: '2026-10-11',
    },
    'wikipedia-galium-verum': {
      kind: 'entry',
      title: 'Galium verum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Galium_verum&oldid=1361872865',
      accessed: '2026-10-11',
    },
    'wikipedia-key-lime': {
      kind: 'entry',
      title: 'Key lime',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Key_lime&oldid=1378339675',
      accessed: '2026-10-11',
    },
    'wikipedia-larch': {
      kind: 'entry',
      title: 'Larch',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Larch&oldid=1378481899',
      accessed: '2026-10-11',
    },
    'wikipedia-lavandula-angustifolia': {
      kind: 'entry',
      title: 'Lavandula angustifolia',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lavandula_angustifolia&oldid=1376984229',
      accessed: '2026-10-11',
    },
    'wikipedia-lemon': {
      kind: 'entry',
      title: 'Lemon',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lemon&oldid=1369999270',
      accessed: '2026-10-11',
    },
    'wikipedia-lemon-balm': {
      kind: 'entry',
      title: 'Lemon balm',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lemon_balm&oldid=1375912388',
      accessed: '2026-10-11',
    },
    'wikipedia-lettuce': {
      kind: 'entry',
      title: 'Lettuce',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lettuce&oldid=1364650787',
      accessed: '2026-10-11',
    },
    'wikipedia-lilium': {
      kind: 'entry',
      title: 'Lilium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lilium&oldid=1379091576',
      accessed: '2026-10-11',
    },
    'wikipedia-lily-of-the-valley': {
      kind: 'entry',
      title: 'Lily of the valley',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lily_of_the_valley&oldid=1376431511',
      accessed: '2026-10-11',
    },
    'wikipedia-liquorice': {
      kind: 'entry',
      title: 'Liquorice',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Liquorice&oldid=1369083200',
      accessed: '2026-10-11',
    },
    'wikipedia-lobelia-inflata': {
      kind: 'entry',
      title: 'Lobelia inflata',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lobelia_inflata&oldid=1371624053',
      accessed: '2026-10-11',
    },
    'wikipedia-pseudognaphalium-obtusifolium': {
      kind: 'entry',
      title: 'Pseudognaphalium obtusifolium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Pseudognaphalium_obtusifolium&oldid=1368567046',
      accessed: '2026-10-11',
    },
    'wikipedia-syringa-vulgaris': {
      kind: 'entry',
      title: 'Syringa vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Syringa_vulgaris&oldid=1337977374',
      accessed: '2026-10-11',
    },
    'wikipedia-tilia-europaea': {
      kind: 'entry',
      title: 'Tilia × europaea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tilia_%C3%97_europaea&oldid=1379421096',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: "Lady's Bedstraw",
      canonicalName: 'Galium verum',
      nomenclature: 'botanical',
      description:
        "Lady's bedstraw is an upright herbaceous perennial of the family Rubiaceae, standing from about fifteen centimetres to over a metre, with fine, lance-shaped leaves set in whorls and dense clusters of tiny yellow flowers whose scent grows stronger as they dry. It grows wild across most of Europe, North Africa and temperate Asia as far as Japan, and has naturalised in Tasmania, New Zealand, Canada and the northern United States. Since ancient Greece it has stood in for rennet in cheese-making, which gave the genus its name from the Greek word for milk, and in Gloucestershire its flowers coloured Double Gloucester. In medieval Europe the dried plant was strewn to freshen houses and stuffed into mattresses, where its coumarin scent kept fleas away. It also yields yellow and red dyes, and in Denmark it flavours a spirit called bjæsk. Scandinavians, who took it as a sedative, named it Frigg's grass after the goddess who helped women in childbirth, and a bedstraw mattress was thought to ease labour and soothe mother and baby. A marriage bed of it was said to bring many children, and it went into love potions and marriage divination. In Romania it shares its name with Midsummer's Day and that day's fairies, and Serbian Midsummer wreaths woven from it are set at gates to guard the home. In magic it is hung about the house for abundance and peace, or offered to the fae on the Midsummer fire.",
      elements: ['water'],
      planets: ['Venus'],
      safetyNotes:
        'Considered safe to take when used appropriately (AHPA safety class 1), with no known contraindications, interactions or side effects. No information on its safety in pregnancy or while nursing was found, and although none of concern was identified, safety in either has not been conclusively established.',
      folkNames: [
        'Yellow Bedstraw',
        'Curdwort',
        'Fleawort',
        "Frigg's Grass",
        "Maid's Hair",
        "Our Lady's Bedstraw",
      ],
      deities: ['Frigg'],
      categories: ['Abundance', 'Fertility', 'Love', 'Peace'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Bedstraw',
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
          source: 'ahpa-safety',
          locator: 'p. 386; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-galium-verum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 386',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The flowers are tiny, two to three millimetres across, and gather in dense yellow clusters; their fragrance strengthens as they dry. They were used to curdle milk for cheese and, in Gloucestershire, to colour Double Gloucester. They are sold cut and dried, and the herbalist John Gerard held that their scent alone could stir lust.',
          colors: ['yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bedstraw',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-galium-verum',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: "Lady's Mantle",
      canonicalName: 'Alchemilla vulgaris',
      nomenclature: 'botanical',
      description:
        "Lady's mantle is a herbaceous perennial of the family Rosaceae, native to Europe and introduced to the United States, found in unimproved grassland, on road verges and banks, on chalk downland and on mountain slopes. It grows in spreading mounds of rounded, pleated leaves with five to eleven shallow lobes, cupped so that they hold beads of rain and dew, and in Britain and Ireland it bears clusters of tiny yellowish-green flowers without true petals from June to September. Its aerial parts are gathered for herbal infusions. The genus name is traced to the Arabic word for alchemy, and medieval German alchemists thought the dew collected from its leaves especially potent for working metals. The Anglo-Saxons used it to cure bewitchment; in Scotland and Ireland it lifted faery enchantment and countered elf shot, the unseen weapon elves were thought to strike people with to cause disease; and it was held to ward off the evil eye. Scottish potions used it to restore a youthful look, and in Scandinavia a leaf slept on under the pillow was said to bring pleasant dreams. In magic it belongs above all to love, its herb going into love spells and sachets, and a leaf held between the hands is said to focus the mind before divination, while its flowers are set on the altar for full-moon and healing rituals.",
      elements: ['water'],
      planets: ['Venus'],
      safetyNotes:
        'Considered safe to take when used appropriately (AHPA safety class 1, under the name Alchemilla xanthochlora), with no known contraindications, interactions or side effects; it contains about 6 to 16% tannins. No information on its safety in pregnancy or while nursing was found, and safety in either has not been conclusively established. Cunningham marks it as recognised as safe.',
      folkNames: [
        "Bear's Foot",
        'Leontopodium',
        "Lion's Foot",
        'Nine Hooks',
        'Stellaria',
        'Dew Cup',
        "Common Lady's Mantle",
        'Padelion',
      ],
      deities: ['Demeter', 'Freya', 'Frigg', 'Gaia', 'Rhea', 'Venus'],
      categories: [
        'Love',
        'Courage',
        'Divination',
        'Fertility',
        'Harmony',
        'Healing',
        'Peace',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Lady's Mantle; p. 266",
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
          locator: "s.v. Lady's Mantle",
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
          source: 'ahpa-safety',
          locator: 'pp. 35–36; p. xxii',
          supports: ['safetyNotes'],
        },
        {
          source: 'wikipedia-alchemilla-vulgaris',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 35',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: "s.v. Lady's Mantle",
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The rounded, pleated leaves cup beads of rain and dew, which medieval German alchemists collected for their work with metals. The dried, cut leaves are sold for magical use: a leaf held between the hands for a few minutes is said to focus energy before divination, leaves go into love spells, and in Scandinavia one slept on under the pillow was said to bring pleasant dreams.',
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Lady's Mantle",
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            "The small flowers have no true petals and grow in clusters atop branching stems, described as green in common lady's mantle and as yellowish green in general. Dried flowers go into love spells, and a bouquet of them on the altar is said to raise energy for full-moon or healing rituals.",
          colors: ['green'],
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Lady's Mantle",
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-alchemilla-vulgaris',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: "Lady's Slipper",
      canonicalName: 'Cypripedium parviflorum',
      nomenclature: 'botanical',
      description:
        "Yellow lady's slipper is an orchid native to North America, ranging from Alaska south to Arizona and Georgia, in fens, wetlands, shorelines and damp woodland. Each stem usually bears a single flower, one of whose petals is swollen into a slipper-like pouch, with three thin, twisted sepals reaching out to either side; in this species the sepals are purplish and the leaves climb the stem. It is a highly variable species, and many authors treat its large-flowered variety as a species of its own, Cypripedium pubescens. An Ojibwe legend tells that the plant first grew from the moccasin prints left in the snow by a young woman who made a hard journey to bring medicine home to her village. The Ojibwe and other peoples from the upper Midwest to the Northeast used it medicinally: the Meskwaki as a love medicine, the Menominee to bring dreams of the supernatural. European settlers in North America took it up as a substitute for valerian. Lady's slippers need very particular habitats and are difficult to grow, and they are counted endangered in some areas, so a supplier's reputation is worth checking. In magic the plant is chiefly protective, carried in sachets to guard against hexes, curses, spells and the evil eye, and it is also linked to love, peace and dream work.",
      elements: ['water'],
      planets: ['Saturn'],
      safetyNotes: 'May cause dermatitis when handled.',
      folkNames: [
        'Yellow Moccasin Flower',
        'Nerveroot',
        'American Valerian',
        "Yellow Lady's Slipper",
        'Moccasin Flower',
        "Whippoorwill's Shoe",
      ],
      categories: ['Protection', 'Dream Work', 'Love', 'Peace'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Lady's Slipper",
          supports: ['description', 'elements', 'planets', 'folkNames', 'categories'],
        },
        {
          source: 'kynes-plants',
          locator: "s.v. Lady's Slipper",
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
          source: 'wikipedia-cypripedium-parviflorum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Lady's Slipper",
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: "Lady's Smock",
      canonicalName: 'Cardamine pratensis',
      nomenclature: 'botanical',
      description:
        "Lady's smock is a hairless perennial herb of the cabbage family, Brassicaceae, native to Eurasia, widespread in Europe and common across the British Isles, where it does best close to water. Grown in gardens, it has naturalised in North America, while in parts of Germany it is now under threat. It reaches about sixty centimetres, with a rosette of rounded leaves at the base, narrow leaves up the stem and loose clusters of four-petalled flowers, usually a pale pinkish mauve and occasionally white. Its species name means of the meadow, and the name cuckoo flower is put down to its blooming as the first cuckoos reach the British Isles each spring. Lady's smock is said to be a worn-down form of Our Lady's Smock, a plant dedicated to the Virgin because it was held to flower about Ladytide. The plant is edible, with a peppery taste like watercress; it was once reckoned a remedy for scurvy, and in the early nineteenth century it was an ordinary salad herb. It is the county flower of Cheshire and of Brecknockshire. In English folklore the flowers were sacred to the fairies, said to be little dresses they had sewn, so they were left out of May Day garlands and kept out of the house, lest a fairy come in with them; other tales held that witches used them in spells. In magic it serves love, fertility, healing and divination.",
      elements: ['water'],
      planets: ['Moon'],
      folkNames: [
        'Meadow Cress',
        'Bittercress',
        'Cuckoo Flower',
        "Lady's Mantle",
        'Milkmaids',
        'Mayflower',
        "Our Lady's Smock",
        'Canterbury Bells',
      ],
      categories: ['Divination', 'Fertility', 'Healing', 'Love'],
      references: [
        {
          source: 'kynes-plants',
          locator: "s.v. Lady's Smock",
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
          source: 'northcote-herbs',
          locator: 'pp. 61–63',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-cardamine-pratensis',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'The four-petalled flowers grow in loose clusters at the tips of the stems, usually pinkish mauve and occasionally white; Gerard called them a blushing white. Poets from Shakespeare to Tennyson set them in spring meadows, and country people braided them into garlands, though in much of England they were kept out of May Day garlands and out of the house for fear of the fairies. In a love charm, red candle wax dripped on a picture of the flowers is inscribed with the initials of the one desired.',
          colors: ['pink', 'white'],
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Lady's Smock",
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'northcote-herbs',
              locator: 'pp. 61–63',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves are slightly pungent and somewhat bitter. Parkinson found it seldom eaten or used in physic and more often worn in country garlands, though he noted reports that it worked as well against scurvy as watercress; by the early nineteenth century it was eaten as an ordinary salad herb.',
          references: [
            {
              source: 'northcote-herbs',
              locator: 'p. 63',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The seeds are what is sold for magical use. In a fertility spell they are laid in a circle around the foot of a green candle.',
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Lady's Smock",
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Larch',
      canonicalName: 'Larix',
      nomenclature: 'botanical',
      description:
        'Larches are the deciduous conifers of the genus Larix, in the pine family: unlike most conifers they drop their needles each autumn, after the needles have turned golden yellow. The tallest species reach fifty to sixty metres. The needles grow singly along long shoots and in dense tufts of twenty to fifty on short ones, and the small seed cones usually stand upright. The genus ranges across the cool and cold zones of the Northern Hemisphere, from North America through Europe to Siberia, China and Japan, and dominates much of the boreal forest of Siberia and Canada. Its tough, durable timber is used for boats, cladding, decking and fencing, and the tree also gives arabinogalactan, Venice turpentine, rosin for violin bows and an essential oil. In fourteenth-century Germany a few larch planks were built into a house to guard it from fire, and twigs hung on the house kept off lightning; Slavic children wore larch amulets against the evil eye, and in the Austrian Tyrol offerings to deities were laid beneath the trees. In magical practice larch is carried or worn against enchantment and the evil eye, and put into sachets meant to prevent fires.',
      elements: ['fire'],
      planets: ['Jupiter'],
      safetyNotes:
        "Cunningham's health code marks larch as not recommended for internal use in large amounts.",
      folkNames: [
        'American Larch',
        'Tamarack',
        'Eastern Larch',
        'Hackmatack',
        'European Larch',
        'Common Larch',
        'White Larch',
      ],
      categories: [
        'Protection',
        'Healing',
        'Intuition',
        'Justice',
        'Legal Matters',
        'Knowledge',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Larch; p. 266',
          supports: ['categories', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Larch',
          supports: ['elements', 'planets', 'categories', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-larch',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Larch',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Larch',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Larch needles are borne singly on long shoots and in dense tufts on short ones, and fall each autumn. Kynes suggests keeping a few needles in a small pouch for a boost of confidence when it is needed.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Larch',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-larch',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Resin',
          description:
            'Larch can be tapped for a liquid that is distilled into Venice turpentine, and it yields the rosin used on violin bows. Kynes suggests burning a small piece of the resin to support shamanic work or other spiritual practice.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Larch',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-larch',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'An essential oil is extracted from larch and used in aromatherapy. Kynes suggests dressing a candle with it to strengthen a spell for success, above all in legal matters.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Larch',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-larch',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Larkspur',
      canonicalName: 'Consolida regalis',
      nomenclature: 'botanical',
      description:
        "Forking larkspur, also called field or rocket larkspur, is an annual herb of the buttercup family that grows thirty to eighty centimetres tall on an upright, hairy stem branching freely near the top. Its leaves are deeply lobed and feathery, and from May to August it bears small clusters of dark blue or purple flowers, each with a backward-pointing spur. It is native from Spain and France across Europe to Turkey, Georgia and western Siberia, favouring sandy or chalky soil, dry weedy ground, roadside ditches and cereal fields, and it has grown scarce in central and southern Europe as herbicides and intensive tillage have spread. It is also grown as an ornamental. A medieval Italian legend held that larkspur sprang up where knights wiped a slain dragon's blood from their swords, and in Germany it was thrown with vervain through a wreath of mugwort into the Midsummer bonfire for protection. Magical tradition says that it keeps ghosts away, that looking through a bunch of it at a Midsummer fire preserves the eyes for a year, and that its flowers drive off scorpions and other venomous creatures.",
      elements: ['water'],
      planets: ['Venus', 'Mars'],
      safetyNotes:
        "Poisonous. Kynes cautions that every part of the plant is toxic, the seeds above all, and can be fatal if eaten, and Cunningham's health code marks it as not recommended for internal use.",
      folkNames: [
        'Delphinium',
        "Knight's Spur",
        "Lark's Heal",
        'Staggerweed',
        'Forking Larkspur',
        'Field Larkspur',
        "Lark's Claw",
        'Rocket Larkspur',
      ],
      deities: ['Apollo'],
      categories: ['Protection', 'Courage', 'Fidelity', 'Psychic Work', 'Wisdom'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Larkspur; p. 266',
          supports: [
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Larkspur',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'wikipedia-consolida-regalis',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['blue', 'purple'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Larkspur',
              supports: ['form', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Larkspur',
              supports: ['form'],
            },
            {
              source: 'wikipedia-consolida-regalis',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The seeds ripen from June to September. Kynes suggests sprinkling a circle of them on the altar during sessions to heighten psychic abilities.',
          safetyNotes:
            'The seeds are the most poisonous part of the plant: Kynes singles them out as especially toxic, and Wikipedia records that they hold up to 1.4% alkaloids.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Larkspur',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-consolida-regalis',
              supports: ['description', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lavender',
      canonicalName: 'Lavandula angustifolia',
      nomenclature: 'botanical',
      description:
        'Lavender, also known as true, English or common lavender, is a strongly scented evergreen shrub of the family Lamiaceae, native to the Mediterranean basin despite its English name, and grows one to two metres tall. Its narrow leaves, which give the species its name, are grey-green or silvery, and its small purple flowers sit in whorls on spikes at the top of slender, leafless stems. It is widely grown for its colourful flowers and fragrance, tolerates drought, dislikes soil that stays damp, and prefers neutral to alkaline ground. Its flowers and leaves are used in herbal medicine, the flowers flavour food, notably the North American form of herbes de Provence, and its essential oil goes into perfumes, cosmetics, massage and aromatherapy. Lavender has scented laundry since Greek and Roman times, and in medieval Europe it was linked with love and thought an aphrodisiac. Folk belief held that carrying a sprig let a person see ghosts; in Tuscany it guarded children against the evil eye, and in Wales a sprig was worn for luck and protection. In magical practice it goes into love sachets, is burned to bring sleep, is strewn about the house to keep it peaceful, is added to purification baths, and is slipped under the pillow for a wish divination.',
      elements: ['air'],
      planets: ['Mercury'],
      safetyNotes:
        "Considered safe when used appropriately (AHPA safety class 1), with no known contraindications or drug interactions, and Cunningham's health code marks the flower as safe; NCCIH regards it as likely safe in the amounts used in food. Taken by mouth it may cause diarrhoea, headache, nausea or burping in some people. It may interact with sedative drugs or herbs: NCCIH calls the concern theoretical, and Kynes advises against using it while taking sedative medication. Little is known about its safety in pregnancy or while breastfeeding; AHPA found only a 1935 study in which lavender stimulated contractions of isolated pregnant guinea-pig uteruses. Skin products containing lavender can cause allergic reactions, and a few cases of breast swelling have been reported in children using them, though it is unclear whether lavender was the cause.",
      folkNames: [
        'Elf Leaf',
        'Nard',
        'Nardus',
        'Spike',
        'English Lavender',
        'True Lavender',
        'Common Lavender',
        'Garden Lavender',
        'Narrow-leaved Lavender',
      ],
      deities: ['Hecate', 'Saturn', 'Vesta'],
      categories: [
        'Love',
        'Protection',
        'Sleep',
        'Longevity',
        'Purification',
        'Peace',
        'Harmony',
        'Divination',
        'Dream Work',
        'Healing',
        'Intuition',
        'Fidelity',
        'Manifestation',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lavender; p. 266',
          supports: [
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lavender',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 503–504; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 233–234',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
        {
          source: 'nccih-lavender',
          supports: ['safetyNotes'],
        },
        {
          source: 'wikipedia-lavandula-angustifolia',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['purple'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 503',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lavender',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lavender',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-lavandula-angustifolia',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The narrow, slightly fuzzy leaves are grey-green or silvery green, and are used alongside the flowers in herbal medicine. Kynes suggests burning dried leaves to release negativity or for protection.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lavender',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 234',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-lavandula-angustifolia',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Lavender essential oil is produced commercially for balms, salves, perfumes and cosmetics, and is diluted in a carrier oil for massage and aromatherapy. Cunningham records that centuries ago prostitutes wore lavender water or the oil both to advertise their trade and, by magic, to draw customers.',
          safetyNotes:
            'Allergic contact dermatitis, confirmed by patch testing, has been reported in people exposed to lavender essential oil. Aromatherapy with the oil is considered possibly safe but may cause headache or coughing.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lavender',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lavender',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-lavandula-angustifolia',
              supports: ['description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 503–504',
              supports: ['safetyNotes'],
            },
            {
              source: 'nccih-lavender',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Leek',
      canonicalName: 'Allium ampeloprasum',
      nomenclature: 'botanical',
      description:
        'The leek is a cultivated form of Allium ampeloprasum, a member of the onion genus whose wild plant, the wild or broadleaf wild leek, is native from southern Europe through south-western Asia to North Africa and has naturalised in many other countries. The common leek, sometimes ranked as the variety porrum, is known by its stout false stem, and the same species has given rise to elephant garlic, the pearl onion, kurrat and Persian leek. Wild plants form small bulbs and send up round flowering stalks as tall as 1.8 metres, each crowned by an umbel of up to five hundred small, urn-shaped flowers in white, pink or red. In Britain the wild plant grows in rocky places near the coast of south-west England and Wales, where prehistoric people may have brought it. Its species name joins the Greek words for vine and leek. In magical lore, when two people eat leeks they are said to fall in love with each other; leeks are also carried as protective amulets, and bitten to break hexes and drive evil away.',
      elements: ['fire'],
      planets: ['Mars'],
      safetyNotes: "Cunningham's health code marks leek as safe.",
      folkNames: ['Wild Leek', 'Broadleaf Wild Leek', 'Yorktown Onion'],
      categories: ['Love', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Leek; p. 266',
          supports: ['elements', 'planets', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'wikipedia-allium-ampeloprasum',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Leek',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lemon',
      canonicalName: 'Citrus × limon',
      nomenclature: 'botanical',
      description:
        "The lemon is a small evergreen tree of the citrus family, Rutaceae, grown the world over for its pointed oval yellow fruit, a modified berry with a tough rind whose outer zest holds aromatic oils. Wikipedia gives the true lemon's parents as the citron and the bitter orange, and says some evidence places its origin in north-eastern India in the first millennium BC; Kynes names the citron and the lime as its parents instead. It had reached southern Italy by the second century AD, spread through the Arab world and the Mediterranean in the eleventh and twelfth centuries, and crossed to the Americas with Columbus in 1493. Its sour juice, rich in citric acid, goes into lemonade, marinades and baking, the peel yields pectin and oil, and the leaves are brewed as tea. Late medieval Europe valued the fruit as medicine, and it was believed to guard against poison, plague and bewitchment. In India a lemon may be circled around a person to drive off negative energies, or crushed under the wheels of a new car to keep its driver safe. In magical practice Cunningham washes second-hand amulets and jewellery in lemon juice and water to clear whatever clings to them, adds the juice to a full-moon bath, and hangs an unripe lemon bristling with coloured pins in the home to draw blessings. Kynes dabs newly acquired ritual tools with lemon hydrosol to purify them.",
      elements: ['water', 'air', 'earth'],
      planets: ['Moon', 'Mercury'],
      zodiacSigns: ['Aquarius', 'Cancer', 'Gemini', 'Pisces'],
      safetyNotes:
        'Cunningham marks lemon as safe (health code G). AHPA found no information on its safety in pregnancy or while nursing: it identified no concern, but safety has not been conclusively established.',
      folkNames: ['Ulamula', 'True Lemon'],
      deities: ['Anubis', 'Durga', 'Hermes', 'Maat', 'Odin', 'Parvati', 'Thoth'],
      categories: [
        'Longevity',
        'Purification',
        'Love',
        'Friendship',
        'Abundance',
        'Clarity',
        'Divination',
        'Fertility',
        'Healing',
        'Fidelity',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lemon; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lemon',
          supports: [
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 236–237; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-lemon',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          description:
            'The yellow fruit, used above all for its sour juice. Cunningham mixes the juice with water to cleanse second-hand magical objects, adds it to a full-moon bath, hangs an unripe lemon stuck with coloured pins in the home for blessings, and lets a lemon serve as a poppet. Kynes sets three wheels of sliced lemon on the altar as the full, waxing and waning moon for esbat rites.',
          colors: ['yellow'],
          references: [
            {
              source: 'wikipedia-lemon',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lemon',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemon',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Peel',
          description:
            'The rind, whose coloured outer layer, the zest, carries the fruit’s oil. Cunningham adds the dried peel to love sachets and mixtures.',
          safetyNotes:
            'AHPA safety class 1, interaction class A: no known contraindications, precautions, interactions or side effects. The peel contains furanocoumarins that can cause a phototoxic skin reaction when applied before sun exposure, but AHPA found no reported cases and expects none after eating it.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 236; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lemon',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemon',
              supports: ['form'],
            },
            {
              source: 'wikipedia-lemon',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil, released from oil cells in the skin of the fruit and used in aromatherapy.',
          safetyNotes:
            'Allergic contact dermatitis from lemon peel oil has been reported in perfume-factory workers, and one case of allergy to the oil was confirmed by patch testing. Oxypeucedanin, a compound in the oil, darkened the skin of guinea pigs in a phototoxicity study.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 236–237',
              supports: ['safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemon',
              supports: ['form'],
            },
            {
              source: 'wikipedia-lemon',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Cunningham puts the leaves into lust teas. They are also brewed as an everyday tea and used when cooking meat and seafood.',
          categories: ['Lust'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lemon',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-lemon',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'White blossoms tinged with pink, prized for their scent in late medieval Europe. Cunningham adds the dried flowers to love sachets; Kynes lists a lemon flower essence.',
          colors: ['white'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lemon',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lemon',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lemon Balm',
      canonicalName: 'Melissa officinalis',
      nomenclature: 'botanical',
      description:
        'Lemon balm is a bushy perennial of the mint family, Lamiaceae, growing up to a metre tall, with soft, hairy, heart-shaped leaves that smell gently of lemon and small white or pale pink flowers in summer. It is native to south-central Europe, the Mediterranean, Central Asia and Iran, and has naturalised widely. Its genus name is the Greek word for honey bee, after the bees its flowers draw; Gerard held that balm rubbed over a hive keeps the bees there and brings others, and Cunningham repeats the advice. Pliny and Dioscorides both wrote of it as a medicine, the Tudors strewed its leaves over their floors, and it later went into Carmelite water and balm wine. Today it flavours herbal teas and ice cream. Kynes notes the tradition that it was among the mints taken by the oracle priestesses at Delphi, and that in medieval France and Germany it was worn as an amulet to make a person friendly. Aubrey’s tale, retold by Northcote, has the Wandering Jew curing a consumptive Staffordshire cottager with three balm leaves steeped in small beer. In magic it serves love, healing and success: Cunningham passes on an Arabian practice of steeping it in wine to share with a friend, carries it to find love, and adds it to healing incenses and sachets.',
      elements: ['water', 'air'],
      planets: ['Moon', 'Jupiter'],
      zodiacSigns: ['Cancer'],
      safetyNotes:
        'Cunningham marks lemon balm as safe (health code G). AHPA safety class 1, interaction class A: no known contraindications or interactions, and clinical trials found it well tolerated taken internally or on the skin. Animal and laboratory studies suggest it may affect thyroid hormone levels, though no human cases are reported, and in animals its extracts strengthened the effect of barbiturate sedatives; Kynes cautions that it may interact with sedative and thyroid medication. Contact dermatitis has been reported from a cosmetic containing it. Its safety in pregnancy and while nursing has not been conclusively established.',
      folkNames: [
        'Bee Balm',
        'Lemon Balsam',
        'Melissa',
        'Sweet Balm',
        'Sweet Melissa',
        'Tourengane',
        'Oghoul',
        'Balm Mint',
        'Common Balm',
        'Honey Plant',
        'Balm',
        'Melissa Balm',
        'Honey Balm',
      ],
      deities: ['Artemis', 'Cybele', 'Demeter', 'Diana', 'Persephone'],
      categories: ['Love', 'Success', 'Healing', 'Clarity', 'Fertility'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Balm, Lemon; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lemon Balm',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 558–559; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'kynes-remedies',
          locator: 'p. 216',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 10–11, 196',
          supports: ['description'],
        },
        {
          source: 'wikipedia-lemon-balm',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'Sold cut and dried. Kynes scatters a handful on the altar before past-life work and holds a leaf in each hand to focus the mind; in the tale Northcote retells, three leaves in small beer cured a consumptive man.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 558',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemon Balm',
              supports: ['form', 'description'],
            },
            {
              source: 'northcote-herbs',
              locator: 'pp. 10–11',
              supports: ['description'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 216',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'A pale yellow, lemon-scented essential oil, distilled in very small yields and often blended with lemon or citronella oil. Kynes diffuses it to help emotional healing when a relationship ends.',
          colors: ['yellow'],
          references: [
            {
              source: 'wikipedia-lemon-balm',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemon Balm',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lemon Verbena',
      canonicalName: 'Aloysia citrodora',
      nomenclature: 'botanical',
      description:
        'Lemon verbena is a perennial shrub of the verbena family, Verbenaceae, native to South America and reaching two to three metres. Its glossy, pointed leaves, about eight centimetres long, release a strong lemon scent when bruised, which is what its specific epithet means, and sprays of tiny purple or white flowers appear in late spring or early summer. The Spanish and Portuguese brought it to Europe in the seventeenth century and grew it for its oil, which perfumers once distilled from the leaves. The leaves flavour fish, poultry, marinades, dressings, jams and puddings, are made into herbal teas and liqueurs, scent potpourri, and serve as a traditional medicine in Latin America. In Cunningham’s magic it belongs to love and purification: it is worn to make oneself attractive, added to love spells and mixtures, used to purify a space or a bath, and mixed into other blends to strengthen them. Hung around the neck, or a little of its juice drunk, it was said to keep the wearer from dreaming. Cunningham lists it as Lippia citriodora, one of several synonyms the plant has carried.',
      elements: ['air'],
      planets: ['Mercury'],
      safetyNotes:
        'Cunningham marks lemon verbena as safe (health code G). AHPA safety class 1, interaction class A: no known contraindications, precautions, interactions or side effects, and no reported adverse events. Its safety in pregnancy and while nursing has not been conclusively established.',
      folkNames: ['Cedron', 'Yerba Louisa', 'Verbena', 'Lemon Beebrush', 'Hierba de la Princesa'],
      categories: ['Purification', 'Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lemon Verbena; p. 266',
          supports: [
            'description',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 50; p. xxii',
          supports: ['safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-aloysia-citrodora',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The part used, for flavouring food, for tea and liqueur, and in potpourri. Cunningham works with the herb itself in love mixtures, purifications and baths.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 50',
              supports: ['form'],
            },
            {
              source: 'wikipedia-aloysia-citrodora',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lemon Verbena',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description: 'Historically steam-distilled from the leaves for the perfume trade.',
          safetyNotes:
            'The oil sensitises the skin and is phototoxic, and the European Union bars verbena oils, other than the absolute, as fragrance ingredients. Used as a food flavouring, lemon verbena oil is generally recognised as safe by the US Food and Drug Administration.',
          references: [
            {
              source: 'wikipedia-aloysia-citrodora',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lemongrass',
      canonicalName: 'Cymbopogon citratus',
      nomenclature: 'botanical',
      description:
        'Lemongrass, also called West Indian lemongrass, is a tropical grass of the family Poaceae, native to South Asia and Maritime Southeast Asia and now naturalised across the tropics and subtropics. It grows in large, dense clumps of long, narrow, bluish-green leaves, cannot survive frost, and is often sold in markets as stems. Its leaves season roast meats in the Philippines, it is essential to the Thai soups tom yam and tom kha kai, and its dried leaves make a mild, lemony tea. Its essential oil, mostly citral, goes into aromatherapy blends, and beekeepers bait swarm traps with it. Kynes records that the ancient Greeks, Romans and Egyptians used lemongrass in food and medicine, and that it was widely used in perfumery in the Middle East and India, but finds no older magical use outside hoodoo, where it goes into Van Van oil to clear negative energy and spirits from a home, counter magic and bring luck. Cunningham plants it around the house and garden to keep snakes away, adds it to lust potions, and drinks it as an infusion to develop psychic powers. Kynes dresses a candle with its oil before divination, and diffuses the oil to open the way to intuition.',
      elements: ['air'],
      planets: ['Mercury', 'Sun', 'Venus'],
      zodiacSigns: ['Gemini'],
      safetyNotes:
        'Cunningham advises against taking it internally during pregnancy (health code P), and Kynes advises avoiding it during pregnancy and while breastfeeding. AHPA safety class 1, interaction class A: it notes that one Caribbean text records its use as an abortifacient, which no other reference it found repeats, and that safety while nursing has not been established. An animal study suggests it may alter blood sugar regulation, so people with diabetes should watch their blood sugar and consult a qualified practitioner before using it. Allergic contact dermatitis followed drinking the tea in one person repeatedly exposed to the essential oil.',
      folkNames: [
        'West Indian Lemongrass',
        'Citronella Grass',
        'Fever Grass',
        'Sereh',
        'Serai',
        'Serai Dapur',
        'Tanglad',
        'Salai',
        'Balioko',
        'Tauj Dub',
        'Sera',
        'Takhrai',
      ],
      categories: [
        'Lust',
        'Psychic Work',
        'Clarity',
        'Divination',
        'Intuition',
        'Fidelity',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lemongrass; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'categories',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lemongrass',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 297–299; p. xxii',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 234–235',
          supports: ['canonicalName', 'description', 'safetyNotes', 'folkNames'],
        },
        {
          source: 'wikipedia-cymbopogon-citratus',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 297',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'Lemongrass is often sold as stems, and thin slices of the fresh stem go into Thai snacks. Kynes lists the fresh stalks among the forms on sale.',
          references: [
            {
              source: 'wikipedia-cymbopogon-citratus',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemongrass',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil, largely citral. In hoodoo it is part of Van Van oil; Kynes dresses candles with it before divination or psychic work and diffuses it to strengthen intuition.',
          safetyNotes:
            'In a test of fragrance-sensitive volunteers the oil caused reactions in 1.6% of them, and applied undiluted to broken rabbit skin it was moderately irritating, though a 4% dilution caused no irritation in a patch test.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 298–299',
              supports: ['safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lemongrass',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cymbopogon-citratus',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lesser Celandine',
      canonicalName: 'Ficaria verna',
      nomenclature: 'botanical',
      description:
        'Lesser celandine is a low, hairless perennial of the buttercup family, seldom taller than about 25 centimetres, with fleshy, heart-shaped leaves that are dark green with a mottled pattern, and glossy, bright yellow flowers. It is native to central Europe, North Africa and the Caucasus and likes ground that is wet for part of the year. Brought to North America, where it goes by fig buttercup, it has become an invasive weed that crowds out native spring wildflowers. It starts growing in late winter, flowers from late February into May in Britain, where many take it as the first sign of spring, and has died back by the end of May, spreading mostly from the small tubers on its roots. Herbalists long called it pilewort and used it against piles. William Wordsworth was fond enough of the flower to write three poems to it. Lady Rosalind Northcote was given a Cornish eye cure of celandines pounded with salt and laid on the inside of the wrist; she felt nearly certain this plant was meant, though she suspected the cure had wandered over from the greater celandine. In magic it shares the correspondences Kynes gives to celandine as a whole, among them release: a handful of dried leaves is crumbled and strewn outside as one turns slowly round.',
      elements: ['earth', 'fire'],
      zodiacSigns: ['Aries'],
      safetyNotes:
        'Kynes warns that lesser celandine is toxic if eaten. Like the rest of the buttercup family it holds ranunculin, which turns into the irritant protoanemonin when the plant is damaged: touching crushed leaves can cause itching, rashes or blisters on the skin or mucous membranes, and swallowing it can cause nausea, vomiting, dizziness, spasms or paralysis. One person developed acute hepatitis and jaundice after taking untreated extracts of it for piles. The raw plant is poisonous to grazing livestock and can be fatal to them. Drying or cooking turns the toxin into harmless anemonin.',
      folkNames: [
        'Crazies',
        'Crowfoot',
        'Golden Stars',
        'Pilewort',
        "Raven's Foot",
        'Fig Buttercup',
      ],
      categories: [
        'Dream Work',
        'Justice',
        'Legal Matters',
        'Knowledge',
        'Prophecy',
        'Protection',
        'Release',
        'Success',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Celandine',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'zodiacSigns',
            'safetyNotes',
            'folkNames',
            'categories',
          ],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 169',
          supports: ['description'],
        },
        {
          source: 'wikipedia-ficaria-verna',
          supports: ['canonicalName', 'description', 'safetyNotes', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The leaves are sold cut and dried with the stems. Kynes presses a leaf in a book and keeps it in a wallet until a difficulty is overcome, and strews crumbled dried leaves outside to let go of something unwanted. Some herbal guides still advise an ointment of the raw leaves for piles.',
          colors: ['green'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Celandine',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-ficaria-verna',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            "The roots carry clusters of small, knobbly tubers that break off easily and grow into new plants. By the doctrine of signatures their likeness to piles marked the plant as a cure for them. In Scotland the roots, thought to look like cows' udders, were hung in barns so the cows would give more milk and the fairies would leave it alone. Mesolithic hunter-gatherers in Europe ate the roots boiled, fried or roasted.",
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Celandine',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-ficaria-verna',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lettuce',
      canonicalName: 'Lactuca sativa',
      nomenclature: 'botanical',
      description:
        'Lettuce is an annual of the daisy family, grown nearly everywhere as a leaf vegetable and eaten mostly raw in salads, though its stems and seeds are used as well. Its native range runs from the Mediterranean to Siberia. Once past the edible stage, a plant sends up a flower stalk up to a metre tall bearing small yellow flowers. It was first domesticated from its wild ancestor near the Caucasus for the oil pressed from its seeds, and spread to Egypt, where its cultivation is pictured as early as 2680 BC. The Egyptians held it sacred to Min, a god of reproduction, carrying it in his festivals and setting it beside his images. Greeks and Romans took it up in turn, and the Roman name lactuca, from the milky latex that seeps from cut stems, is the root of the English word. Medieval writers such as Hildegard of Bingen treated it as a medicinal herb. Cunningham makes it a plant of the Moon and water, for sleep, chastity and protection. Rubbing its juice on the forehead or eating the leaves is meant to bring easy sleep, eating it guards against temptations of the flesh and seasickness, and a lettuce patch protects the garden, though some held that growing too much of it would leave a household barren.',
      elements: ['water'],
      planets: ['Moon'],
      safetyNotes: "Cunningham's health code G marks lettuce as currently recognised as safe.",
      folkNames: ['Garden Lettuce', 'Lattouce', 'Sleep Wort'],
      deities: ['Min'],
      categories: ['Protection', 'Divination', 'Sleep'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lettuce; p. 266',
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
          source: 'wikipedia-lettuce',
          supports: ['canonicalName', 'description', 'deities'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The leaves are the part grown and eaten, in salads, sandwiches and soups, and they come in many shapes, mostly green or red, a few yellow, gold or blue-teal. Cunningham suggests eating them to fall asleep without trouble and to resist temptations of the flesh.',
          colors: ['green', 'red'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lettuce',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-lettuce',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            "Lettuce was first grown for its seeds, pressed for oil, and one type is still grown for them. In Cunningham's love divination, seeds sown in the shape of a loved one's name foretell the love: if they sprout well, so will it.",
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lettuce',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-lettuce',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Life Everlasting',
      canonicalName: 'Pseudognaphalium obtusifolium',
      nomenclature: 'botanical',
      description:
        'Life everlasting is a daisy-family plant of eastern North America, a biennial up to about a metre tall that grows in dry, sandy, open places such as clearings, fields and the edges of woods. In its first year it makes a tight rosette clothed in woolly hairs; in its second it sends up a stem of narrow leaves crowned with clusters of small flower heads, white with yellowish or brownish tips, and its leaves and stems are thick with white wool. Carl Linnaeus described it in 1753 as a Gnaphalium, and it was moved to Pseudognaphalium in 1981. Many Indigenous peoples used it in medicine: the Cherokee for cramps, colds and coughs, the Choctaw for lung pain and colds, the Koasati for fevers. It was also a guard against the unseen. The Creek washed people afflicted by ghosts with a decoction of it, and the Menominee burned it to drive ghosts out and to bring back a lost mind. Because the flowers keep their beauty when dried, everlastings came to stand for long life and immortality. Kynes gives it to earth and Saturn, for banishing, courage, healing, protection and purification: a little bag of the dried flowers kept on the person shores up courage, and the dried flowers cleanse parts of a home troubled by an unwanted spirit.',
      elements: ['earth'],
      planets: ['Saturn'],
      folkNames: [
        'Cudweed',
        'Everlasting',
        'Indian Posy',
        'Rabbit Tobacco',
        'Sweet Everlasting',
        'Old Field Balsam',
      ],
      categories: ['Banishing', 'Courage', 'Healing', 'Protection', 'Purification'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Life Everlasting',
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
          source: 'wikipedia-pseudognaphalium-obtusifolium',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            "The small flowers are white with yellow to brownish tips, the white layers at their base being bracts rather than petals, and they keep their looks once dried. Dried flowers are sold, and they carry the plant's spells: carried for courage, used to cleanse a place of an unwanted spirit, or burned to purify objects for the altar.",
          colors: ['white', 'yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Life Everlasting',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-pseudognaphalium-obtusifolium',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Several nations used the leaves. The Menominee burned the dried leaves as a smudge to drive ghosts from a dwelling and steamed them as an inhalant for headaches, the Creek added them to medicines for their scent, and the Koasati drank a decoction of them for fevers.',
          references: [
            {
              source: 'wikipedia-pseudognaphalium-obtusifolium',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lilac',
      canonicalName: 'Syringa vulgaris',
      nomenclature: 'botanical',
      description:
        'Common lilac is a deciduous shrub or small, many-stemmed tree of the olive family, reaching six or seven metres and sending up suckers that over decades can form a small thicket. Its heart-shaped leaves grow in opposite pairs, and in early summer it bears dense clusters of small, scented, four-lobed tubular flowers, usually lilac to mauve and now and then white. It is native to rocky hills in the southern Balkans, but reached northern European gardens from Ottoman ones at the end of the sixteenth century, the diplomat Ogier Ghiselin de Busbecq being credited with sending cuttings to Carolus Clusius around 1562. It came to the American colonies in the eighteenth century, has naturalised widely, and is the state flower of New Hampshire. Its flowers are edible and flavour honey, sugar and sweets. English lore held it unlucky to wear white lilac on any day but May Day; in Norfolk purple lilac, a mourning colour, was unlucky too, and the flowers often lined coffins and decorated graves. A white flower with five petals rather than four was a luck lilac, a gift from the fae. For Cunningham lilac drives evil from wherever it is planted or strewn, and New Englanders, he says, first planted it to keep evil off their land.',
      elements: ['water'],
      planets: ['Venus', 'Mercury', 'Moon'],
      zodiacSigns: ['Libra', 'Taurus'],
      safetyNotes: "Cunningham's health code G marks lilac as currently recognised as safe.",
      folkNames: ['Common Lilac', 'French Lilac', 'Blue Pipe'],
      categories: [
        'Protection',
        'Creativity',
        'Divination',
        'Dream Work',
        'Inspiration',
        'Love',
        'Peace',
        'Prophecy',
        'Psychic Work',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lilac; p. 266',
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
          locator: 's.v. Lilac',
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
          source: 'wikipedia-syringa-vulgaris',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            "The flowers come in white, lilac and shades of purple. Fresh ones are set in a haunted house to help clear it, white lilacs laid on the altar at an esbat amplify the Moon's energy, and in the kitchen the flowers flavour honey, sugar and sweets.",
          colors: ['white', 'purple'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lilac',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lilac',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-syringa-vulgaris',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Kynes suggests keeping a lilac twig in your workspace to encourage inspiration.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lilac',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lily',
      canonicalName: 'Lilium',
      nomenclature: 'botanical',
      description:
        "Lilies proper are the genus Lilium: tall herbaceous perennials, from about thirty centimetres to nearly two metres high, that rise each year from a scaly underground bulb and carry large, often fragrant flowers in white, yellow, orange, pink, red or purple. Most species belong to the temperate Northern Hemisphere, from Europe across Asia to Japan, India and the Philippines, and from southern Canada through much of the United States, usually in woodland, on mountains or in grassland. Plenty of plants called lilies, the lily of the valley and the water lily among them, sit outside the genus altogether. The starchy bulbs are cooked as a vegetable in China, and those of several species are used in Chinese medicine. Lilies are the flowers most often seen at funerals, as they were among the Greeks and Romans, and in Western Christianity the Madonna lily has stood for the Virgin Mary since medieval times. A Roman tale held that every lily was orange until a drop of Juno's milk whitened one. In England white lilies were hung above doorways to keep witches out, and in Wiltshire they were grown to keep ghosts away. In magical practice lilies are planted to guard a home from ghosts, evil and the evil eye, and a fresh flower is worn to undo a love spell aimed at a particular person.",
      elements: ['water'],
      planets: ['Moon'],
      zodiacSigns: ['Gemini', 'Pisces', 'Scorpio', 'Virgo'],
      safetyNotes:
        'Cunningham warns that some lilies are poisonous. The above-ground parts of the tiger lily are toxic to cats, damaging the kidneys and sometimes causing kidney failure.',
      deities: [
        'Venus',
        'Juno',
        'Artemis',
        'Asherah',
        'Astarte',
        'Ceres',
        'Diana',
        'Eostre',
        'Hera',
        'Isis',
        'Kuan Yin',
      ],
      categories: ['Protection', 'Harmony', 'Love', 'Manifestation', 'Peace'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lily',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'deities',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lily',
          supports: ['elements', 'planets', 'zodiacSigns', 'deities', 'categories', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 522',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-lilium',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Bulb',
          description:
            "The scaly bulb is the part taken in Chinese medicine, where the bulbs of Brown's lily, the tiger lily and the coral lily all go by the name bai he. Lily bulbs are starchy and are cooked as a root vegetable in Chinese cooking, although some species have bulbs too bitter to eat.",
          safetyNotes:
            "AHPA safety class 1 for the bulbs of Brown's lily, tiger lily and coral lily. Allergic reactions to these species have been reported, and their safety in pregnancy and while nursing has not been established. In animals, lily bulb given by mouth lengthened sleep brought on by barbiturates.",
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 522; p. xxii',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lily',
              supports: ['form'],
            },
            {
              source: 'wikipedia-lilium',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            "The flower carries most of the lily's magic. Cunningham has a fresh lily worn or carried to break a love spell cast on someone, and says the first white lily of the season lends strength to whoever finds it. Kynes uses a flower as a love charm, and walks three times round a space holding one to mark it out and bless it.",
          colors: ['white', 'yellow', 'orange', 'pink', 'red', 'purple'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lily',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lily',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-lilium',
              supports: ['colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lily of the Valley',
      canonicalName: 'Convallaria majalis',
      nomenclature: 'botanical',
      description:
        "Lily of the valley is a low woodland perennial of Europe and of western and northern Asia that creeps by underground rhizomes into broad colonies. Each shoot bears two wide leaves and, in late spring, a one-sided spray of six to twelve small, nodding white bells with a sweet scent, followed by little orange-red berries. Gardeners plant it as ground cover in shade, and it has long been forced in pots for flowers in winter. No natural extract can be drawn from the flower, so perfumes such as Dior's Diorissimo copy its scent synthetically. The English name echoes the 'lily of the valleys' of the Song of Songs, whose Latin wording also gave Linnaeus the genus name. It is Finland's national flower, is sold in France on the first of May and is worn at Helston on Flora Day. Across Europe it was gathered at Beltane to dress maypoles and offered as a love token, and in France a sprig worn or given on May Day was meant to bring a year of luck. A legend has the flowers springing up from the blood of a dragon slain by Saint Leonard, while in Ireland bringing them indoors was thought unlucky. In magical practice the flowers are set in a room to raise the spirits of those present, and are used to sharpen the memory and the mind.",
      elements: ['air'],
      planets: ['Mercury'],
      zodiacSigns: ['Gemini', 'Taurus', 'Virgo'],
      safetyNotes:
        'Poisonous: every part of the plant is toxic and can kill if swallowed. AHPA safety class 3, to be used only under the supervision of an expert qualified in its use. Its interactions are those of digoxin and the other digitalis glycosides. It may cause nausea and vomiting; large amounts have been linked with changes in heart rate and rhythm, and with pain in the mouth, abdominal pain, cramping and diarrhoea. Its use in pregnancy or while nursing is not recommended except under expert supervision.',
      folkNames: [
        'Convallaria',
        "Jacob's Ladder",
        'Ladder to Heaven',
        'Lily Constancy',
        'Male Lily',
        'May Lily',
        "Our Lady's Tears",
        'Fairy Cups',
        'Fairy Ladder',
        'May Bells',
        'Muguet',
        "Mary's Tears",
        'Glovewort',
        'Apollinaris',
      ],
      deities: ['Apollo', 'Asclepius'],
      categories: [
        'Harmony',
        'Clarity',
        'Courage',
        'Healing',
        'Inspiration',
        'Love',
        'Peace',
        'Protection',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lily of the Valley',
          supports: [
            'canonicalName',
            'folkNames',
            'elements',
            'planets',
            'deities',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lily of the Valley',
          supports: [
            'canonicalName',
            'folkNames',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 260; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-lily-of-the-valley',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 260',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The scented white bells are the part gathered and given. Cunningham sets the flowers in a room to cheer the people in it; Kynes keeps a Beltane bouquet on the altar and works the dried flowers into spells to mend a rift with a lover or a friend. Since no natural extract can be made from them, their scent is rebuilt synthetically for perfume.',
          colors: ['white'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lily of the Valley',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lily of the Valley',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-lily-of-the-valley',
              supports: ['description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lime',
      canonicalName: 'Citrus × aurantiifolia',
      nomenclature: 'botanical',
      description:
        'The Key lime, also called the West Indian or Mexican lime, is a thorny, shrubby tree up to about five metres tall that arose as a natural cross between a wild papeda, Citrus micrantha, and the citron. Its round fruit, three to six centimetres across, has a thin peel and very sour, juicy, fragrant flesh; it is usually picked green and turns yellow as it ripens. Native to South-east Asia, it travelled by way of the Middle East and North Africa to Sicily and Andalusia, and with Spanish explorers to the West Indies and the Florida Keys, which gave it its name and the pie it is best known for. Boiled in brine and dried, it becomes the black lime used as a seasoning across the Middle East. Kynes records limes used in Sumatra and elsewhere in South-east Asia to cleanse and consecrate, cut open in ceremony to drive out demons, and strung with red chillies in India to keep evil from houses and shops. In magical practice a fresh lime stuck with old nails and pins and thrown into a deep hole is said to carry off ills and hexes, the peel goes into love mixtures and incenses, twigs are carried against the evil eye, and the fruit purifies ritual space and consecrates tools.',
      elements: ['fire', 'water'],
      planets: ['Sun', 'Mercury'],
      zodiacSigns: ['Leo'],
      folkNames: [
        'Loomi',
        'Dayap',
        'Calmouc',
        'Mexican Lime',
        'Sour Lime',
        'True Lime',
        'West Indian Lime',
        'Egyptian Lime',
        'Bilolo',
      ],
      categories: ['Healing', 'Love', 'Protection', 'Purification'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lime',
          supports: ['elements', 'planets', 'categories', 'folkNames', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lime',
          supports: [
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'wikipedia-key-lime',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Peel',
          description:
            'The peel is the part AHPA covers. Cunningham puts lime peel into love mixtures and incenses.',
          safetyNotes:
            'AHPA safety class 1, and Cunningham marks the peel safe. The peel holds furanocoumarins that can cause phytophotodermatitis, a skin reaction set off when skin that has handled it is then exposed to sunlight; this is not expected from eating it. Allergic reactions to the peel after skin contact have been reported. Safety in pregnancy and while nursing has not been established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 227; p. xxii',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lime; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Fruit',
          description:
            "The whole fruit, fresh or dried, carries most of the lime's lore. Cunningham pierces a fresh lime with old iron nails, pins and needles before throwing it away into a deep hole, and has a necklace of limes worn for a sore throat. Kynes adds a piece of fresh fruit to strengthen a love spell and hangs a dried lime with a chilli where protection is wanted. Boiled in brine and dried, Key limes become black lime.",
          colors: ['green', 'yellow'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lime',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lime',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-key-lime',
              supports: ['description', 'colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description: 'Kynes diffuses a little lime essential oil to raise a protective shield.',
          safetyNotes:
            'Lime essential oil was phototoxic in human patch tests. In animal tests, oil pressed from the peel was phototoxic while steam-distilled oil was not.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lime',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 227',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Linden',
      canonicalName: 'Tilia × europaea',
      nomenclature: 'botanical',
      description:
        'The common lime or European linden is a natural hybrid of the small-leaved and large-leaved limes, growing wild at scattered places in Europe wherever both parents are native. It is a big deciduous tree, fifteen to fifty metres tall, often with burrs and a thicket of shoots at its foot, heart-shaped leaves, and fragrant clusters of four to ten flowers in early summer, each cluster hung from a yellow-green leafy bract and worked by bees. Cheap to raise by layering, it is the commonest lime of town avenues and streets, though it drips aphid honeydew on whatever stands below. Its flowers make a mildly relaxing tea, and its leaves, stalks removed, can be eaten raw. It is no kin to the citrus lime. The Greeks and Romans held the linden sacred, Scythian soothsayers stood beneath it to prophesy, and in medieval France couples made their marriage vows under it. In Germany witches were said to meet beneath lindens on Walpurgis, yet linden branches were hung to keep them from houses, and in Poland a piece of the bark guarded against magic and witches. In magical practice branches are hung over the door for protection, the flowers and leaves go into love spells, and linden mixed with lavender fills pillows to bring sleep.',
      elements: ['air'],
      planets: ['Jupiter', 'Mercury', 'Sun'],
      zodiacSigns: ['Gemini', 'Sagittarius', 'Taurus'],
      safetyNotes:
        'Linden flower and leaf are AHPA safety class 1, and Cunningham marks both safe. Contact urticaria has been reported after use of a shampoo containing linden extract. Safety in pregnancy and while nursing has not been established.',
      folkNames: [
        'Lime',
        'Lime Tree',
        'Linnflowers',
        'Common Linden',
        'European Linden',
        'European Lime',
        'Common Lime',
        'European Lime Tree',
        'Tilia',
      ],
      deities: [
        'Venus',
        'Lada',
        'Arianrhod',
        'Ceres',
        'Eostre',
        'Freya',
        'Frigg',
        'Holda',
        'Odin',
        'Tyr',
      ],
      categories: [
        'Protection',
        'Love',
        'Sleep',
        'Communication',
        'Dream Work',
        'Justice',
        'Legal Matters',
        'Fidelity',
        'Peace',
        'Strength',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Linden; p. 266',
          supports: [
            'folkNames',
            'elements',
            'planets',
            'deities',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Linden',
          supports: [
            'canonicalName',
            'folkNames',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 869; p. xxii',
          supports: ['folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-tilia-europaea',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'The flowers, with the leaves, are the parts AHPA lists. They brew a mildly relaxing tea, and Cunningham and Kynes both use them in love spells; Cunningham mixes linden half and half with lavender in pillows for the sleepless.',
          safetyNotes:
            'An allergic reaction to the pollen in a linden flower tea has been reported, in a woman allergic to many tree pollens. Linden flower tea drunk with iron-fortified bread cut the iron absorbed by about half.',
          colors: ['white'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 869–870',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Linden',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Linden',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-tilia-europaea',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves, stalks removed, can be eaten raw. Cunningham uses them in love spells and, since he counts the linden a tree of immortality, in spells of that kind; Kynes sets a leaf beside the bed to help dream work.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 869',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Linden',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Linden',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-tilia-europaea',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'Cunningham says linden bark carried on the person prevents drunkenness; Kynes records a piece of the bark kept in Poland as a talisman against magic and witches.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Linden',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Linden',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description: 'Cunningham carves good-luck charms from linden wood, to be carried.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Linden',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Liquorice',
      canonicalName: 'Glycyrrhiza glabra',
      nomenclature: 'botanical',
      description:
        "Liquorice is a herbaceous perennial of the bean family, Fabaceae, native to West Asia, tropical Asia, North Africa and southern Europe. It grows to about a metre tall, with pinnate leaves of nine to seventeen leaflets, loose clusters of purple to pale whitish-blue flowers and oblong pods holding several seeds. Its roots yield a sweet, aromatic flavouring that now goes into confectionery, tobacco, drinks and medicines. The root was a medicine across the ancient world from Europe to the Far East; Roman soldiers are said to have chewed it before battle, and the Egyptians laid it in tombs. In England it was grown from Queen Elizabeth's reign at Pontefract, Worksop, Godalming and Mitcham, and it was long a favourite remedy for coughs; Pontefract is also where it was first mixed with sugar into sweets. Many cultures held it to be an aphrodisiac, and in Europe it went into love charms and charms to keep a lover faithful, while in hoodoo the root is used to dominate another person. In magical practice the root, not the sweet, is chewed to kindle passion and as a help in giving up smoking; it is added to love and lust sachets, carried to draw love and used in fidelity spells, and its sticks serve as wands. Kynes adds knot magic worked with a liquorice lace, and binding two roots together in a love spell.",
      elements: ['water'],
      planets: ['Venus', 'Jupiter', 'Mercury'],
      safetyNotes:
        "Not for use in pregnancy except under a qualified practitioner's supervision, and not for people with high blood pressure, liver disorders, oedema, severe kidney insufficiency, low blood potassium, heart disease with oedema or congestive heart failure (AHPA safety classes 2b and 2d); Cunningham also advises against taking it with diabetes. Nor is it for prolonged use or high doses without such supervision: taken for long periods it can deplete potassium and retain sodium, and its glycyrrhizin can cause serious effects, including an irregular heartbeat and cardiac arrest. Even small amounts have been linked to severe effects in people who eat a lot of salt or who have hypertension or heart or kidney disease. At high doses or with long use it may add to the potassium loss caused by some diuretics, stimulant laxatives and corticosteroids, and strengthen the action of digoxin. These cautions apply to products containing glycyrrhizin, not to deglycyrrhizinated liquorice. Kynes advises against it while nursing, where its safety has not been established. Applied to the skin it may irritate some people.",
      folkNames: [
        'Lacris',
        'Licourice',
        'Lycorys',
        'Reglisse',
        'Sweet Root',
        'Licorice',
        'Common Licorice',
        'Black Sugar',
        'Licorice Root',
        'Sweet Wood',
        'True Licorice',
      ],
      deities: ['Osiris'],
      categories: ['Lust', 'Love', 'Fidelity', 'Binding', 'Healing', 'Peace'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Licorice; p. 266',
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
          locator: 's.v. Licorice',
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
          source: 'ahpa-safety',
          locator: 'pp. 417–418; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 64–65',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'wikipedia-liquorice',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'nccih-licorice-root',
          supports: ['canonicalName', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Root',
          colors: ['yellow'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 417',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Licorice',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Licorice',
              supports: ['form'],
            },
            {
              source: 'wikipedia-liquorice',
              supports: ['colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Liverwort',
      canonicalName: 'Anemone hepatica',
      nomenclature: 'botanical',
      description:
        "Liverwort here is the common hepatica, a small herbaceous perennial of the buttercup family, Ranunculaceae, native to woodland in the temperate Northern Hemisphere. It stands only five to fifteen centimetres high, its leaves and flowers rising straight from a rhizome rather than from a stem above ground. The fleshy, three-lobed leaves are dark green with whitish streaks above and violet or reddish brown beneath, and they stay green through the winter. It is also known under the genus Hepatica, as Hepatica nobilis, but phylogenetic studies indicate that the hepaticas belong within Anemone. In Japan, where it is called yukiwarisō, the snow-breaking plant, it is celebrated at winter flower festivals and appears often in nineteenth-century art, and as Hepatica nobilis it holds the Royal Horticultural Society's Award of Garden Merit. Ethnobotanical records cited in the AHPA handbook describe its traditional use as a contraceptive, for pain during pregnancy, for absent menstruation and to bring on labour. Cunningham's entry notes that in England the name liverwort is given to another plant, Peltigera canina. In magical practice it is a love herb: a woman is said to secure a man's love by keeping liverwort in a sachet about her at all times.",
      elements: ['fire'],
      planets: ['Jupiter'],
      safetyNotes:
        "Not for use in pregnancy except under a qualified practitioner's supervision (AHPA safety class 2b; Cunningham's pregnancy code), as it was traditionally used as a contraceptive and to bring on labour. In large doses its protoanemonin may irritate the kidneys and urinary tract, and the fresh herb can blister the skin; the compound is destroyed when the plant is dried. Its safety while nursing has not been established.",
      folkNames: [
        'Edellebere',
        'Heart Leaf',
        'Herb Trinity',
        'Liverleaf',
        'Liverweed',
        'Trefoil',
        'Common Hepatica',
        'Kidneywort',
        'Pennywort',
      ],
      categories: ['Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Liverwort; p. 266',
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
          locator: 'pp. 439–440; p. xxii',
          supports: ['description', 'safetyNotes'],
        },
        {
          source: 'wikipedia-anemone-hepatica',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 439',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lobelia',
      canonicalName: 'Lobelia inflata',
      nomenclature: 'botanical',
      description:
        "Lobelia, or Indian tobacco, is an annual or biennial herb of the family Campanulaceae, native to eastern North America from Nova Scotia and south-eastern Ontario south to Alabama and west to Kansas. It grows from fifteen centimetres to a metre tall on finely hairy stems, with toothed, oval leaves about eight centimetres long, and from midsummer into autumn it bears violet flowers tinged yellow inside, followed by small, brown, papery seed capsules. It has a long history as a medicinal plant, taken as an emetic, as an entheogen and as an aid to the skin and breathing. The Cherokee, Iroquois, Penobscot and other Indigenous peoples used it in medicine; its leaves were chewed and smoked, and the Cherokee burned the foliage to drive off gnats. Kynes records that the Iroquois took it against sickness caused by witchcraft and that the Creek used it to keep ghosts away, and she calls it a plant of two natures that can curse or cure. In magical practice it draws love, and Kynes keeps a sachet of the dried leaves by the bed to help dream work. Cunningham's weather charm is to throw powdered lobelia towards an approaching storm to halt it.",
      elements: ['water'],
      planets: ['Saturn', 'Neptune'],
      safetyNotes:
        "Poisonous: Cunningham marks it as a poison, and Kynes warns that it is toxic if swallowed and can be fatal. Not for use in pregnancy except under a qualified practitioner's supervision (AHPA safety class 2b), and not to be taken internally in high doses. It is a strong emetic and may cause nausea or vomiting; in clinical trials its alkaloid lobeline caused nausea and a burning mouth and throat, and higher doses brought vertigo and a fast heartbeat. Deaths from excessive doses were reported in older literature, though reviews found the evidence too thin to name lobelia as the cause. Its safety while nursing has not been established.",
      folkNames: [
        'Asthma Weed',
        'Bladderpod',
        'Gagroot',
        'Indian Tobacco',
        'Pukeweed',
        'Eyebright',
        'Pokeweed',
      ],
      categories: ['Love', 'Dream Work', 'Purification'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Lobelia; p. 266',
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
          locator: 's.v. Lobelia',
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
          locator: 'pp. 528–529; p. xxii',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
        {
          source: 'wikipedia-lobelia-inflata',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 528',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The dried leaves, sold cut or powdered. Kynes keeps a sachet of them on a bedside table to help dream work, and Indigenous peoples chewed and smoked the leaves.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lobelia',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-lobelia-inflata',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Kynes puts the flowers into love spells, or carries them as a charm to attract romance.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lobelia',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Cunningham has powdered lobelia thrown towards an oncoming storm to stop its approach; Kynes lists the powdered leaves among the forms on sale.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Lobelia',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lobelia',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lords and Ladies',
      canonicalName: 'Arum maculatum',
      nomenclature: 'botanical',
      description:
        'Lords and ladies, also called cuckoo pint, is a woodland plant of the arum family, Araceae, native across most of Europe and into eastern Turkey and the Caucasus. In spring it puts up arrow-shaped leaves, often blotched with purple, then a pale green hood, the spathe, wrapped round a poker-shaped spike, the spadix, which is usually purple but may be yellow. The spadix gives off a faecal smell and warms itself well above the surrounding air, drawing in small owl-midges that are trapped beneath a ring of hairs and dusted with pollen before they escape. In autumn a cluster of bright red berries stands on after the leaves have withered. The starchy roots once stiffened linen and ruffs, and the nuns of Syon Abbey used them for church linen in 1440. Several of its names, cuckoo pint among them, liken the spike to a penis, and Dioscorides counted the plant an aphrodisiac. Girls in Dorset were warned that touching it would make them pregnant, Fenland legend had its flowers glowing at night, and it serves as a fertility symbol in several of the sixteenth-century unicorn tapestries. In magical practice it stands for the union of goddess and god on a Beltane altar, and its seeds are added to fertility spells.',
      elements: ['air'],
      planets: ['Mars'],
      zodiacSigns: ['Aries'],
      safetyNotes:
        'Poisonous: every part is toxic if eaten, the roots especially, and all parts can irritate the skin or cause allergic reactions, so handle it with care. The berries contain needle-shaped oxalate crystals that irritate the skin, mouth, tongue and throat and can bring swelling of the throat, difficulty breathing, burning pain and stomach upset. Their acrid taste usually stops anyone eating much, but the plant is one of the commonest causes of accidental plant poisoning seen in hospital emergency departments, and there is no known antidote. The leaves are toxic and can be mistaken for edible sorrel.',
      folkNames: [
        'Cuckoo Pint',
        'Adam and Eve',
        'Arrowroot',
        'Cuckoo Flower',
        "Dog's Dick",
        'Fairy Lamps',
        'Stallions and Mares',
        'Wake Pintel',
        'Wake Robin',
        "Adder's Meat",
        "Adder's Root",
        'Arum',
        'Wild Arum',
        'Arum Lily',
        'Bobbins',
        'Cows and Bulls',
        'Cuckoo-Plant',
        'Devils and Angels',
        "Friar's Cowl",
        'Jack in the Pulpit',
        'Lamb-in-a-Pulpit',
        'Naked Boys',
        'Snakeshead',
        'Starch-Root',
      ],
      categories: ['Harmony', 'Creativity', 'Fertility'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Lords and Ladies',
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
          source: 'wikipedia-arum-maculatum',
          supports: ['canonicalName', 'description', 'safetyNotes', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The large, starch-storing tuber, which can lie as deep as 40 centimetres. Well roasted and ground, it was once sold as Portland sago, made into the drink saloop and used in place of arrowroot, and it was a traditional laundry starch. Kynes lists the cut, dried root among the forms on sale.',
          safetyNotes:
            'Kynes names the roots as the most toxic part of the plant, and the root can be highly toxic if not prepared correctly.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lords and Ladies',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-arum-maculatum',
              supports: ['description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Seed',
          description: 'Kynes adds a handful of the seeds to a fertility spell.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Lords and Ladies',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Berry',
          description:
            'The female flowers ripen in autumn into a cluster of red to orange berries that remains after the hood and leaves have withered. Birds eat them unharmed and so spread the seeds.',
          safetyNotes: 'Extremely poisonous to people and many animals, and attractive to look at.',
          colors: ['red', 'orange'],
          references: [
            {
              source: 'wikipedia-arum-maculatum',
              supports: ['form', 'description', 'safetyNotes', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lords and Ladies',
              supports: ['colors'],
            },
          ],
        },
      ],
    },
  ],
};
