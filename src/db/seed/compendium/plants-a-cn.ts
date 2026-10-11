import type { SeedCompendiumShard } from '../types';

// MB.243: the candidate list's plants and fungi from A to Cn, bar the three
// the pilot seeded. Every value traces to a source a citation names, each read
// during the task; claude-docs/db/compendium-seed/plants-a-cn.md records which
// source supports which fields, and what was left out and why. Descriptions are
// written fresh from the sources, never copied.
export const PLANTS_A_CN: SeedCompendiumShard = {
  name: 'plants-a-cn',
  sources: {
    'wikipedia-agrimonia-eupatoria': {
      kind: 'entry',
      title: 'Agrimonia eupatoria',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Agrimonia_eupatoria&oldid=1378732514',
      accessed: '2026-10-11',
    },
    'wikipedia-aletris-farinosa': {
      kind: 'entry',
      title: 'Aletris farinosa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aletris_farinosa&oldid=1306189686',
      accessed: '2026-10-11',
    },
    'wikipedia-alfalfa': {
      kind: 'entry',
      title: 'Alfalfa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Alfalfa&oldid=1378228326',
      accessed: '2026-10-11',
    },
    'wikipedia-alkanna-tinctoria': {
      kind: 'entry',
      title: 'Alkanna tinctoria',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Alkanna_tinctoria&oldid=1365568463',
      accessed: '2026-10-11',
    },
    'wikipedia-allspice': {
      kind: 'entry',
      title: 'Allspice',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Allspice&oldid=1379316361',
      accessed: '2026-10-11',
    },
    'wikipedia-almond': {
      kind: 'entry',
      title: 'Almond',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Almond&oldid=1378951640',
      accessed: '2026-10-11',
    },
    'wikipedia-alnus-glutinosa': {
      kind: 'entry',
      title: 'Alnus glutinosa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Alnus_glutinosa&oldid=1379114226',
      accessed: '2026-10-11',
    },
    'wikipedia-aloe-vera': {
      kind: 'entry',
      title: 'Aloe vera',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aloe_vera&oldid=1376311794',
      accessed: '2026-10-11',
    },
    'wikipedia-amaranthus-hypochondriacus': {
      kind: 'entry',
      title: 'Amaranthus hypochondriacus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Amaranthus_hypochondriacus&oldid=1366712058',
      accessed: '2026-10-11',
    },
    'wikipedia-american-ginseng': {
      kind: 'entry',
      title: 'American ginseng',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=American_ginseng&oldid=1378580301',
      accessed: '2026-10-11',
    },
    'wikipedia-angelica-archangelica': {
      kind: 'entry',
      title: 'Angelica archangelica',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Angelica_archangelica&oldid=1306190612',
      accessed: '2026-10-11',
    },
    'wikipedia-anise': {
      kind: 'entry',
      title: 'Anise',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Anise&oldid=1378831685',
      accessed: '2026-10-11',
    },
    'wikipedia-aplectrum': {
      kind: 'entry',
      title: 'Aplectrum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aplectrum&oldid=1329531003',
      accessed: '2026-10-11',
    },
    'wikipedia-celastrus-scandens': {
      kind: 'entry',
      title: 'Celastrus scandens',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Celastrus_scandens&oldid=1359249101',
      accessed: '2026-10-11',
    },
    'wikipedia-erythronium-americanum': {
      kind: 'entry',
      title: 'Erythronium americanum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Erythronium_americanum&oldid=1317640579',
      accessed: '2026-10-11',
    },
    'wikipedia-streptocarpus-ionanthus': {
      kind: 'entry',
      title: 'Streptocarpus ionanthus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Streptocarpus_ionanthus&oldid=1315367187',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Adam and Eve Root',
      canonicalName: 'Aplectrum hyemale',
      nomenclature: 'botanical',
      description:
        "Adam and Eve root is the underground tuber of Aplectrum hyemale, an orchid native to Canada and the eastern United States, and the only species in its genus, whose name is Greek for 'spurless'. It ranges from Oklahoma to the Carolinas and north into Minnesota, Ontario, Quebec and Massachusetts, and is commonest in the Appalachians, around the Great Lakes and along the Ohio and upper Mississippi valleys. The tubers creep underground and build large colonies. Each plant puts up one leaf, striped silvery white and green, which shows in late November and lasts until March; in late spring a purplish-green stalk carries a few tiny flowers, pale green or yellow and purplish at the tips. The roots come linked in pairs, sometimes in threes. Crushed, the tubers give a sticky fluid that Native Americans used to mend pottery, the source of its other name, putty root. Kynes treats it under Orchid, beside the early purple orchid, and the lore she gives is of orchid roots generally: medieval European witches were said to put the larger root into love potions and the smaller into remedies for heartbreak. In magic the root is carried as an amulet to draw love or help fertility, split between two partners to strengthen their commitment, or held in the hands for a few minutes each day to build psychic ability.",
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Libra', 'Scorpio'],
      safetyNotes: 'Toxic if swallowed, and it may irritate the skin.',
      folkNames: ['Putty Root', 'Putty Root Orchid', 'Adam, Eve, and Son Root'],
      deities: ['Bacchus', 'Dionysus', 'Pan', 'Saturn'],
      categories: ['Fertility', 'Love', 'Fidelity', 'Psychic Work', 'Success'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Orchid',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'wikipedia-aplectrum',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Orchid',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: "Adder's Tongue",
      canonicalName: 'Erythronium americanum',
      nomenclature: 'botanical',
      description:
        "The adder's tongue here is the yellow trout lily, Erythronium americanum, a spring ephemeral of the lily family that grows in colonies in the woods of eastern North America, from Labrador south to Georgia and west to Mississippi and Minnesota. It grows from a small corm set deep in the soil, white and starchy inside, and its white bulb's shape gives it the name dogtooth violet. A flowering plant raises two basal leaves mottled with brown, grey or purple, a pattern likened to the markings of a brook trout, and one nodding yellow flower whose six petal-like segments curl back. It blooms early in spring, before the canopy above it leafs out, and the flowers close at night; a plant may go four to seven years before it first flowers. Some colonies have been dated to three hundred years old. In nineteenth-century America the trout lily was reckoned an aphrodisiac. Cunningham gives it a healing charm: soak the herb in cold water, bind it in cloth over a wound or bruise until it grows warm, then bury it in muddy ground. Kynes notes that it is endangered or threatened in some places, and asks anyone who finds it wild to sense its energy, state their purpose, and send it healing before leaving.",
      elements: ['water'],
      planets: ['Moon'],
      folkNames: [
        "American Adder's Tongue",
        "Serpent's Tongue",
        "Adder's Mouth",
        'Yellow Snowdrop',
        "Dog's Tooth Violet",
        "Yellow Adder's Tongue",
        'Dogtooth Violet',
        'Yellow Dogtooth Violet',
        'Fawn Lily',
        'Trout Lily',
        'Yellow Trout Lily',
      ],
      categories: ['Healing', 'Communication', 'Courage', 'Divination', 'Dream Work', 'Strength'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Adder's Tongue",
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: "s.v. Adder's Tongue",
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'grieve-herbal',
          locator: "s.v. Adder's Tongue (American)",
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-erythronium-americanum',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Bulb',
          description:
            'Kynes lists the bulbs as the form on sale. Grieve records that the fresh bulbs were once given in place of colchicum, and that they, like the fresh leaves, act as an emetic.',
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Adder's Tongue",
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: "s.v. Adder's Tongue (American)",
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Grieve names the leaves as a part used: fresh, they were made into a stimulating poultice for swellings, tumours and ulcers,. Some Native American peoples, the Cherokee among them, used the plant as a contraceptive or to end a pregnancy.',
          safetyNotes:
            'The leaves should not be eaten by women trying to conceive. No modern pharmacological study has confirmed a contraceptive or abortifacient effect.',
          references: [
            {
              source: 'grieve-herbal',
              locator: "s.v. Adder's Tongue (American)",
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-erythronium-americanum',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Kynes turns to the flowers as an aid in divination and in magic worked with the moon.',
          categories: ['Divination'],
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Adder's Tongue",
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'African Violet',
      canonicalName: 'Streptocarpus ionanthus',
      nomenclature: 'botanical',
      description:
        'The African violet, Streptocarpus ionanthus, is a flowering plant native to eastern and south-western Tanzania. Its synonym, Saintpaulia ionantha, from a genus no longer recognised, is the name both Cunningham and Kynes give it. It sits in the Saintpaulia section of the genus Streptocarpus, and several plants once counted as separate Saintpaulia species are now treated as its subspecies and varieties; in the wild it is rated near threatened. Its rounded, softly hairy, dark green leaves spring from a central crown, with stalks of clustered purple flowers rising among them, and in the right conditions it will flower all year indoors. Europeans came to know it through Baron Walter von Saint Paul-Illaire, a German serving as a regional commissioner in what is now Tanzania, who, out of an interest in botany, carried samples home to Hanover for a friend at its royal botanical gardens; it quickly became a much-loved houseplant, now grown in many sizes, shapes and colours. Its species name means violet-coloured flowers. In magic it belongs to the home. Cunningham grows the purple-flowered plants indoors to encourage spirituality and finds them mildly protective. Kynes says they raise the energy of a house and draw blessings in: set a flowering plant wherever energy needs to move, and put one with deep blue or purple flowers on the altar to lift the spiritual tone of meditation or ritual.',
      elements: ['water'],
      planets: ['Venus'],
      colors: ['purple', 'blue'],
      safetyNotes: 'Cunningham marks it as currently recognised as safe (his health code G).',
      categories: ['Protection', 'Abundance', 'Harmony', 'Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. African Violet; p. 266',
          supports: ['elements', 'planets', 'colors', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. African Violet',
          supports: ['elements', 'planets', 'colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-streptocarpus-ionanthus',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. African Violet',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. African Violet',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Agrimony',
      canonicalName: 'Agrimonia eupatoria',
      nomenclature: 'botanical',
      description:
        'Agrimony, Agrimonia eupatoria, is a softly hairy perennial of the rose family, native to Europe and south-western Asia, found there in damp meadows and pastures, by streams and among shrubs; in England it is common on hedge-banks and field margins. From a dark, woody root it raises a stem two feet or more tall, with toothed, pinnate leaves, and from June to September slender spikes of small yellow five-petalled flowers with a scent like apricots. The seed heads ripen into hooked burrs that catch on clothing and fur, which gave it names such as sticklewort and cocklebur, while the tall spikes earned it church steeples. Grieve traces its name to the Greek argemone, used of plants that healed the eyes, and its species name to King Mithridates Eupator. The Anglo-Saxons used it to heal wounds and in an ointment against poison and evil spirits, it went into the arquebusade water put on gunshot wounds, and the whole plant gives a yellow dye. Old lore held that a sprig laid under the head brought a sleep lasting until it was taken away. Medieval witches were said both to cast spells with it and to break them; it went into a potion, and a Tyrolean posy of herbs, that let the bearer see witches, and in Scotland it cured elf shot. Magically it goes into protection sachets, banishes negative energies and spirits, and turns a hex back on its sender.',
      elements: ['air', 'earth'],
      planets: ['Jupiter', 'Mercury'],
      zodiacSigns: ['Cancer', 'Taurus'],
      safetyNotes:
        'AHPA safety class 1 and interaction class A: no contraindications, other precautions, drug interactions or adverse effects are known. Its safety in pregnancy and while nursing has not been conclusively established, though the review found no concern. It contains 4–10% tannins. Cunningham marks it as currently recognised as safe (his health code G).',
      folkNames: [
        'Common Agrimony',
        'Church Steeples',
        'Cocklebur',
        'Garclive',
        'Philanthropos',
        'Sticklewort',
        'Stickwort',
        'Umakhuthula',
        'Ntola',
        "Fairy's Wand",
        'Golden Rod',
        'Liverwort',
      ],
      categories: [
        'Protection',
        'Sleep',
        'Banishing',
        'Hex-Breaking',
        'Reversal',
        'Harmony',
        'Dream Work',
        'Healing',
        'Purification',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Agrimony; p. 266',
          supports: [
            'canonicalName',
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
          locator: 's.v. Agrimony',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 31–32; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. Agrimony',
          supports: ['planets', 'zodiacSigns'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Agrimony',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 135',
          supports: ['description'],
        },
        {
          source: 'wikipedia-agrimonia-eupatoria',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 31',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Agrimony',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Sold as cut, dried leaves. To return a hex to whoever sent it, Kynes burns three handfuls of the dried leaves, one handful at a time, while picturing the energy going back where it came from.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Agrimony',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Kynes lists the seeds for sale. The seed capsules form burrs, and she lays a few found burrs on the altar to purify the space before magic or ritual, and uses them in banishing spells.',
          categories: ['Purification', 'Banishing'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Agrimony',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Ague Root',
      canonicalName: 'Aletris farinosa',
      nomenclature: 'botanical',
      description:
        "Ague root is a perennial herb of eastern North America, found through most of the eastern United States and reported from southern Ontario, where it favours damp ground that is peaty, sandy or gravelly. It spreads by underground rhizomes and forms a star-shaped rosette of narrow, yellowish-green leaves, from which a single slender stalk rises as high as a metre, bearing small white flowers shaped like urns and dusted on the outside with a mealy bloom. Several Native American peoples, among them the Catawba and Cherokee, used it as medicine, and settlers in Appalachia took it up after them; in the nineteenth century it entered the United States Pharmacopeia. Grieve describes the dried rhizome as intensely bitter and valued as a tonic for the stomach. Its names have long been tangled with those of false unicorn root, Chamaelirium luteum, so that 'true' and 'false' were attached to each plant at different times. In magic it is a herb of protection: it is scattered around a home to keep evil away or carried in a sachet, it is used in hex-breaking and uncrossing work, and it is called on for banishing, psychic abilities and success.",
      elements: ['earth'],
      planets: ['Saturn'],
      safetyNotes:
        'AHPA safety class 1 (its interaction class is A): no contraindications, other cautions, drug interactions or side effects are known. One early animal study found that it depressed the uterus and countered the oxytocin-like action of the pituitary, but AHPA finds no evidence that this would matter when oxytocin is given in labour; its safety while nursing has not been conclusively established. Cunningham flags possible drug interactions and says it may work against some oxytocins (Pitocin). Kynes advises against taking it in pregnancy or while breastfeeding, and warns that swallowing the fresh root is mildly poisonous.',
      folkNames: [
        'Unicorn Root',
        'True Unicorn Root',
        'Colic Root',
        'White Colic Root',
        'Star Grass',
        'White Stargrass',
        'Crow Corn',
        'Blazing Star',
        'Ague Grass',
        'Bitter Grass',
        'Black-Root',
        'Starwort',
        "Devil's Bit",
      ],
      categories: [
        'Protection',
        'Hex-Breaking',
        'Uncrossing',
        'Banishing',
        'Psychic Work',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Ague Root; p. 266',
          supports: ['canonicalName', 'folkNames', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Unicorn Root',
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
          source: 'ahpa-safety',
          locator: 'pp. 36–37; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Unicorn Root, True',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-aletris-farinosa',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 36',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Unicorn Root, True',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Unicorn Root',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'The powdered root is the form Kynes works with: to banish negativity, it is sprinkled round the outside of a house while the worker pictures guardian unicorns standing watch. She adds that the plant is endangered in the wild, so buyers should check where a vendor sources it.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Unicorn Root',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Alder',
      canonicalName: 'Alnus glutinosa',
      nomenclature: 'botanical',
      description:
        "The common or black alder is a tree of the birch family, native to most of Europe, Britain and Ireland included, and to south-west Asia and north Africa. It grows in wet ground by rivers, ponds and swamps, where nodules on its roots, formed by a nitrogen-fixing bacterium, let it flourish in poor soil. Its rounded, glossy leaves are sticky when young, its male catkins hang slender and drooping, and its woody female catkins look like tiny cones. In folklore from Britain and Ireland to the Continent, the alder was a tree of great magic. Irish lore names it the forest's warrior witch and says faeries guard it and open their realm through it; in Denmark faeries were thought to live in or beneath it; Germanic peoples burned its wood in sacred fires; and Germans and Belgians hung its sprigs on houses and stables against witches, though they also believed witches used it to work the weather. A Herefordshire rhyme times the trout season on the Wye by the size of its buds. Culpeper places it under Venus. In magic it is used for divination, dream work, prophecy, protection, healing and banishing.",
      elements: ['air', 'fire', 'water'],
      planets: ['Mars', 'Moon', 'Venus'],
      zodiacSigns: ['Aries', 'Cancer', 'Pisces'],
      folkNames: [
        'Black Alder',
        'Common Alder',
        'European Alder',
        'European Black Alder',
        'Aller',
        'Aul',
      ],
      deities: ['Freya', 'Manannan mac Lir', 'Minerva', 'Pan', 'Venus'],
      categories: [
        'Banishing',
        'Clarity',
        'Divination',
        'Dream Work',
        'Healing',
        'Intuition',
        'Knowledge',
        'Prophecy',
        'Protection',
        'Strength',
        'Transformation',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Alder',
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
          source: 'culpeper-herbal',
          locator: 's.v. The Common Alder-Tree',
          supports: ['planets', 'zodiacSigns', 'description'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Alder, Common',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 196',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-alnus-glutinosa',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Bark',
          description:
            'The bark is the part herbalists and craftspeople used most. A decoction of it bathed swellings and sore, inflamed throats, and was once credited with curing ague. Rich in tannin, it served tanners and dyers, giving black with iron salts and reddish, yellow or brown shades otherwise. Kynes records an Austrian belief that a love potion could be undone by drinking wine boiled with a piece of the bark.',
          references: [
            {
              source: 'grieve-herbal',
              locator: 's.v. Alder, Common',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-alnus-glutinosa',
              supports: ['form', 'description'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. The Common Alder-Tree',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Alder',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Culpeper prescribes the leaves, boiled or distilled into a water, for burns and inflammations, and fresh leaves laid on swellings; travellers put them under feet chafed by walking. Leaves gathered with the dew still on them were carried into a room to collect its fleas, and Grieve adds that Alpine peasants were covered with bags of heated leaves to ease rheumatism.',
          references: [
            {
              source: 'culpeper-herbal',
              locator: 's.v. The Common Alder-Tree',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Alder, Common',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Germanic peoples burned alder wood in sacred fires, above all at sacrifices, and Kynes suggests burning a couple of chips before a ritual, a magical working or a divination session to strengthen it; wood chips and charcoal are both sold. The soft timber lasts well under water, so it was used for piles and foundations, and it is the traditional fuel for smoking fish.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Alder',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-alnus-glutinosa',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Alder, Common',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Alfalfa',
      canonicalName: 'Medicago sativa',
      nomenclature: 'botanical',
      description:
        'Alfalfa, called lucerne in Britain, South Africa and Australia, is a perennial of the pea family that usually lives four to eight years, with leaves in threes, clusters of mostly purple flowers and roots that can reach deep groundwater. It is thought to have arisen in south-central Asia and been first farmed in Central Asia; Pliny records that it reached Greece around 490 BC with the Persian invasion, and was called the Median grass. Spanish colonists carried it to the Americas in the sixteenth century to feed their horses, and today it is grown worldwide as forage, cut for hay and silage or grazed. The English name came through Spanish from an Arabic word, while lucerne was borrowed from French. Grieve describes a deep-rooting plant with spikes of violet-blue, clover-like flowers, prized for fattening horses and cattle and for raising the milk yield of cows. In magic Cunningham gives it to Venus and earth and to prosperity: a little jar of it is kept in the pantry or a cupboard so that the household never goes short of food or money, and it is added to money spells.',
      elements: ['earth'],
      planets: ['Venus'],
      safetyNotes:
        'AHPA safety class 1 (its interaction class is A) for the herb: no contraindications, other cautions, drug interactions or side effects are known. Its coumarins have led some to call it an anticoagulant; one laboratory study found slight anticoagulant activity, but how that bears on human use is unknown. Safety in pregnancy and nursing has not been conclusively established. Cunningham marks it as recognised as safe. Wikipedia nonetheless names pregnancy, breastfeeding, hormone-sensitive conditions and diabetes as concerns, and says it may interact with warfarin, birth control pills and oestrogens.',
      folkNames: ['Lucerne', 'Buffalo Herb', 'Purple Medic', 'Jat', 'Qadb'],
      categories: ['Prosperity'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Alfalfa; p. 266',
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
          source: 'ahpa-safety',
          locator: 'p. 552; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Lucerne',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-alfalfa',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 552',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Lucerne',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The small seeds are yellowish, and the name lucerne may come from an Occitan word for glow-worm, after the bright yellow seed of some strains. Sprouted, they are eaten in salads and as a garnish.',
          safetyNotes:
            'Animal studies linked alfalfa seed and sprouts with the autoimmune disease lupus, though only at very large amounts (40–45% of the diet); the amino acid L-canavanine was blamed, and it is present in the seed and sprouts but not in the mature herb. Raw unsprouted seed can cause lupus-like symptoms in susceptible people, which ease when it is stopped. Sprouts can carry Salmonella or E. coli, so the elderly, pregnant women and anyone with weakened immunity should not eat them.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 552',
              supports: ['safetyNotes'],
            },
            {
              source: 'wikipedia-alfalfa',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Ash',
          description:
            'Cunningham has alfalfa burned and its ashes scattered around a property, for the same purpose as the jar kept indoors: to keep poverty and hunger away from the household.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Alfalfa',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Alkanet',
      canonicalName: 'Alkanna tinctoria',
      nomenclature: 'botanical',
      description:
        "Dyer's alkanet is a herb of the borage family, native to the Mediterranean region and the Balkans and reaching east to Ukraine. Its stems sprawl along the ground, thick with hairy oblong leaves, and it bears small bright-blue flowers shaped like cups. The root is the prized part: dark outside and blue-red within, it gives a red colouring that dissolves in oil or alcohol but not in water, and like litmus it turns blue in alkali and crimson in acid. It has coloured cloth, cosmetics and wood since antiquity, staining furniture to imitate rosewood or mahogany, tinting salves in pharmacy and colouring cheap wines; its pigment, alkannin, was the food colouring E103, whose approval the European Union has withdrawn. The name comes from the Arabic for henna, which was sometimes used in its place. Pliny reported that the plant taken in wine lifted the spirits, medieval Europeans carried the root as a luck charm, and in hoodoo it goes into red fast luck oil. In magic it is burned as incense to cleanse a space of negativity and draw prosperity, and a piece of root is kept in a purse or wallet as a charm for prosperity and success.",
      elements: ['water', 'earth'],
      planets: ['Jupiter', 'Venus'],
      zodiacSigns: ['Taurus'],
      safetyNotes:
        "AHPA safety classes 2a, 2b and 2c (its interaction class is A): for external use only, and not to be taken in pregnancy or while nursing unless a qualified practitioner is supervising, because the plant contains unsaturated pyrrolizidine alkaloids, whose levels in its different parts are not known. Under AHPA's trade rule, products containing it are not sold for internal use and are labelled for external use only, not for broken or abraded skin, and not while nursing. Cunningham likewise marks it as not recommended for internal use.",
      folkNames: [
        "Dyer's Alkanet",
        "Dyer's Bugloss",
        'Spanish Bugloss',
        'Languedoc Bugloss',
        'Orchanet',
        'Orcanet',
        "Bird's Eye",
        'True Alkanet',
      ],
      categories: ['Purification', 'Prosperity', 'Protection', 'Success'],
      substitutes: [
        {
          name: 'Henna',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Alkanet; p. 266',
          supports: [
            'canonicalName',
            'elements',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Alkanet',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'substitutes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 39; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Alkanets',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-alkanna-tinctoria',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          colors: ['red'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 39',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Alkanets',
              supports: ['form', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Alkanet',
              supports: ['form'],
            },
            {
              source: 'wikipedia-alkanna-tinctoria',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Ground alkanet root mixed with oil turns the oil crimson, and wiped on wood it deepens the colour towards a rosewood red-brown and brings out the grain. Kynes uses the same mixture in magic: powdered root stirred into a favourite oil is dabbed on a candle or other tool to set a spell going.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Alkanet',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-alkanna-tinctoria',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Allspice',
      canonicalName: 'Pimenta dioica',
      nomenclature: 'botanical',
      description:
        'Allspice is the dried berry of Pimenta dioica, an evergreen tree of the myrtle family native to the Greater Antilles, southern Mexico and Central America and now grown in many warm countries. Crushing its dark, oval leaves releases a scent like clove; small white flowers grow in clusters at the branch tips, followed by pea-sized berries that are picked while still green and dried in the sun until brown. Jamaica long supplied most of the spice in trade, and there the tree grew thickly enough to make whole forests. The English were calling it allspice by 1621, because its taste seemed to unite cinnamon, nutmeg and clove, though it is one spice and not a blend. Its genus name comes from the Spanish word for black pepper, which the dried berries resemble. Long before Columbus, the Indigenous peoples of the West Indies and Central America used it as food and medicine; the Maya mixed it into smoking tobacco, and both the Maya and the Aztec used it in embalming. Today it flavours Jamaican jerk seasoning among much else. In magic it serves as an incense, burned to draw money and luck, and it is used to promote healing, carried as a single dried berry for luck, and used to bless amulets, altars and the space for a rite.',
      elements: ['fire'],
      planets: ['Mars'],
      zodiacSigns: ['Aries', 'Scorpio'],
      safetyNotes:
        'AHPA safety class 1 and interaction class A: no contraindications, other precautions or drug interactions are known. One food-service worker developed allergic contact dermatitis from handling allspice at work, confirmed by patch testing. Its safety in pregnancy and while nursing has not been conclusively established, although no concern was identified. Cunningham marks it as currently recognised as safe.',
      folkNames: [
        'Jamaica Pepper',
        'Myrtle Pepper',
        'Pimenta',
        'Pimento',
        'Pimento Berry',
        'Pimienta Gorda',
        'Eddo',
        'Madere',
        'Basheen',
        'Kouroubaga',
      ],
      deities: ['Aphrodite', 'Oshun', 'Venus', 'Yemaya'],
      categories: [
        'Healing',
        'Abundance',
        'Courage',
        'Fertility',
        'Love',
        'Prosperity',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Allspice; p. 266',
          supports: [
            'canonicalName',
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
          locator: 's.v. Allspice',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 656; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Allspice',
          supports: ['folkNames', 'description'],
        },
        {
          source: 'wikipedia-allspice',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Berry',
          substitutes: [
            {
              name: 'Spice Bush',
            },
          ],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 656',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Allspice',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Allspice',
              supports: ['form', 'substitutes'],
            },
            {
              source: 'wikipedia-allspice',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Allspice oil is distilled from the fruit, which holds three to four and a half per cent of it. Grieve describes a yellow to yellowish-red liquid that darkens as it is kept, smelling much like oil of cloves, and made up largely of eugenol, sixty to seventy-five per cent. It has been used to scent soap and, two or three drops on sugar, as an old remedy for wind.',
          references: [
            {
              source: 'grieve-herbal',
              locator: 's.v. Allspice',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Allspice',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The fresh leaves feel much like bay leaves and go into cooking in the same way, and where the tree is farmed its leaves and wood are burned to smoke meat. Crushed, the leaves smell of clove; dried leaves are sold as well.',
          references: [
            {
              source: 'wikipedia-allspice',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Allspice',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Almond',
      canonicalName: 'Prunus amygdalus',
      nomenclature: 'botanical',
      description:
        "The almond, Prunus amygdalus, is a deciduous tree of the plum and cherry genus, grouped with the peach in the subgenus Amygdalus, and grows three to four and a half metres tall. Its scented flowers, white to pale pink with five petals, open in early spring ahead of the leaves. The fruit is a drupe: a leathery grey-green hull around a hard shell, inside which lies the edible seed that is commonly called a nut. Wild almonds are mostly bitter, and picking out the sweet kind began the tree's domestication; it was among the first fruit trees farmed, with Early Bronze Age evidence from the Middle East, though its homeland is disputed, placed anywhere from Central Asia and Iran to the lands between Mongolia and Uzbekistan. In the Bible, Aaron's rod put out almond blossom, and the Hebrew name for the tree plays on a word for watching. Greek myth tells of Phyllis, turned into an almond tree, which burst into flower when her returning lover embraced it. The Greeks used crushed almonds in water to stand for the seed of Zeus and scattered them at weddings for fertility, and almonds were long eaten to ward off drunkenness. In magic the nuts, leaves and wood serve prosperity and money spells, climbing the tree is said to bring success in business, a pocketful of almonds is said to lead to treasure, and almond milk is poured as a libation.",
      elements: ['air', 'fire'],
      planets: ['Mercury', 'Jupiter', 'Mars', 'Sun', 'Venus'],
      zodiacSigns: ['Aquarius', 'Gemini', 'Virgo'],
      safetyNotes:
        'Sweet almonds, the kind commonly eaten, hold only traces of amygdalin, which releases cyanide; bitter almonds hold some forty times as much, and are not for internal use. AHPA has no monograph of its own on almond, but applies its cautions on bitter apricot kernel (safety class 3: only under the supervision of a qualified expert) to bitter almond. As few as five to ten bitter almonds may kill a child, and around fifty an adult, with vertigo among the signs of cyanide poisoning. Kynes warns that raw bitter almonds are lethal and that the seeds and leaves of Prunus species produce cyanide in the gut. Almonds can also cause food allergy, often alongside allergy to peach or other tree nuts, and mouldy almonds may carry aflatoxin and should not be eaten.',
      folkNames: ['Greek Nuts'],
      deities: [
        'Attis',
        'Mercury',
        'Thoth',
        'Hermes',
        'Astarte',
        'Cybele',
        'Shiva',
        'Venus',
        'Zeus',
      ],
      categories: [
        'Prosperity',
        'Wisdom',
        'Abundance',
        'Creativity',
        'Divination',
        'Fertility',
        'Intuition',
        'Knowledge',
        'Love',
        'Protection',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Almond',
          supports: [
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
          source: 'kynes-plants',
          locator: 's.v. Almond',
          supports: [
            'canonicalName',
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
          locator: 'pp. 702–703; p. xxii',
          supports: ['safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Almonds',
          supports: ['description'],
        },
        {
          source: 'wikipedia-almond',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Nut',
          substitutes: [
            {
              name: 'Apricot',
            },
            {
              name: 'Peach',
            },
          ],
          references: [
            {
              source: 'wikipedia-almond',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Almond',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Almonds',
              supports: ['substitutes'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Almond oil is pressed from the dried kernels of sweet and bitter almonds alike, though Grieve holds that oil meant for the skin must come from sweet almonds only. Aromatherapists and cosmetic makers use sweet almond oil to carry other oils, and it has long gone into soap and been rubbed on chapped hands; bitter almond oil, which contains benzaldehyde, flavours food and scents perfume. In magic a dab on the third eye opens the awareness for divination or for speaking with spirits.',
          references: [
            {
              source: 'wikipedia-almond',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Almonds',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Almond',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Cunningham records that magical wands are made of almond wood, since the tree belongs to air, which in some traditions rules the wand, and that the wood and leaves join the nuts in prosperity and money spells.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Almond',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Aloe',
      canonicalName: 'Aloe vera',
      nomenclature: 'botanical',
      description:
        'Aloe vera is a succulent of the genus Aloe, an evergreen perennial whose native home is the Hajar Mountains of north-eastern Oman and the eastern United Arab Emirates; it now grows wild across much of the tropical, subtropical and arid world, and is a common house plant. It has little or no stem and reaches 60 to 100 centimetres, with thick, fleshy green to grey-green leaves edged in small white teeth, and in summer it sends up a spike of drooping, tube-shaped yellow flowers. Its leaves yield two different products: a clear inner gel, put on the skin for burns and other complaints, and a bitter yellow latex, once taken as a purgative. The specific name vera is Latin for true. Aloe is recorded in healing texts from Sumer and Egypt; the Egyptians, who linked it with immortality, used it in embalming, and the Greeks and Romans dressed wounds with it. In the Muslim world a pilgrim back from Mecca might hang an aloe over the door, and in Arabia it was planted at graves, where its Arabic name, saber, means patience. In magic it is a plant of protection and luck: hung above doors and over houses to keep evil out, kept indoors against accidents in the home, and its gel dabbed over the outside doorways to raise a guard around the house.',
      elements: ['water'],
      planets: ['Moon', 'Jupiter', 'Venus'],
      zodiacSigns: ['Cancer', 'Libra', 'Pisces'],
      safetyNotes:
        'Cunningham marks the fresh plant as not recommended for internal use, and the dried plant as not for internal use and not to be taken in pregnancy, while nursing or with diarrhoea. AHPA rates the inner leaf gel safety class 1, but the dried yellow latex of the leaf class 2b, 2c and 2d (see the Sap form). Taken by mouth, aloe can cause abdominal cramps and diarrhoea, which may reduce the absorption of medicines, and hepatitis with long use; it may interact with drugs for blood clots, diabetes and heart disease and with diuretics, and it should not be used in pregnancy. Some people are allergic to it on the skin. Aloe vera whole-leaf extract is classed by the International Agency for Research on Cancer as a possible human carcinogen (group 2B).',
      folkNames: [
        'Burn Plant',
        'Medicine Plant',
        'Saqal',
        'Zabila',
        'Mediterranean Aloe',
        'Barbados Aloe',
        'Curaçao Aloe',
        'Chinese Aloe',
      ],
      categories: [
        'Protection',
        'Harmony',
        'Healing',
        'Love',
        'Peace',
        'Purification',
        'Success',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Aloe; p. 266',
          supports: [
            'canonicalName',
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
          locator: 's.v. Aloe',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 44, 47; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Aloes',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'wikipedia-aloe-vera',
          supports: ['canonicalName', 'folkNames', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The fresh leaf holds the clear gel used on burns, wounds and dry skin. Dried and powdered, the leaves are sprinkled round the base of a white candle at an esbat to help draw down the wisdom of the Moon.',
          safetyNotes:
            'The inner leaf gel is AHPA safety class 1. Take other medicines an hour before it or several hours after, as it may slow their absorption; contact dermatitis has been reported in some people after putting it on the skin.',
          references: [
            {
              source: 'grieve-herbal',
              locator: 's.v. Aloes',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Aloe',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 47–48; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-aloe-vera',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Sap',
          description:
            'The bitter yellow juice that runs from the cut base of the leaf, boiled or dried down, is the old purgative drug aloes, sold today as aloe latex or dried aloe juice. It holds the laxative aloin, which the inner gel lacks, and was once the commonest of household purges.',
          safetyNotes:
            'AHPA safety class 2b, 2c and 2d for the dried latex: not for use in pregnancy or while nursing except under a qualified practitioner, nor during menstruation, by children under twelve, or for more than eight days. Not to be taken with intestinal obstruction, abdominal pain of unknown cause, inflammatory bowel conditions, haemorrhoids, liver or kidney disease, or severe dehydration. Long use can deplete potassium and other salts and harm the colon and kidneys, which makes antiarrhythmic heart drugs and plants with cardiac glycosides more toxic; overdose has caused bleeding diarrhoea and perforation of the colon. Kynes warns that the yellow sap should be neither put on the skin nor swallowed.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Aloe',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 44–45; p. xxii',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Aloes',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-aloe-vera',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Amaranth',
      canonicalName: 'Amaranthus hypochondriacus',
      nomenclature: 'botanical',
      description:
        "Amaranthus hypochondriacus, known as prince's feather or Prince-of-Wales feather, is a strong-growing, upright plant of the amaranth family, grown as an annual, that stands from 40 centimetres to two metres tall. In summer and autumn it carries dense, catkin-like flower spikes, usually a deep purplish red though sometimes yellow-green, followed by small fruits holding glossy seeds that range from whitish pink to almost black. It is one of the grain amaranths, native to Central America and elsewhere in North America, and in Africa and El Salvador its leaves and seeds are eaten. Its name comes from the Greek for unwithering, since the flowers keep their looks long after cutting, and so it became an emblem of immortality: in ancient Greece it was sacred to Artemis of Ephesus, adorned tombs and the images of gods, and was used in pagan burial rites. The Aztecs used amaranth in their own rituals, which led the Spanish colonial authorities in Mexico to outlaw it. Culpeper put it under Saturn and held that its flowers staunched bleeding. In magic a crown of its flowers is worn to speed healing, the dried flowers are carried to mend a broken heart and have been used to call up the dead, and its seeds are scattered round an altar candle to help reach the spirits.",
      elements: ['fire'],
      planets: ['Saturn', 'Sun', 'Venus'],
      zodiacSigns: ['Aquarius', 'Leo'],
      folkNames: [
        'Flower of Immortality',
        'Huauhtli',
        'Love-Lies-Bleeding',
        'Red Cockscomb',
        'Velvet Flower',
        'Princess Feather',
        "Prince's Feather",
        'Prince-of-Wales Feather',
        'Flower Gentle',
        'Quelite',
        'Bledo',
        'Quintonil',
      ],
      deities: ['Artemis', 'Chalchiuhtlicue', 'Demeter'],
      categories: ['Healing', 'Protection', 'Harmony', 'Prosperity', 'Release'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Amaranth',
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
          source: 'kynes-plants',
          locator: 's.v. Amaranth',
          supports: ['elements', 'planets', 'zodiacSigns', 'deities', 'categories', 'description'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Amaranths',
          supports: ['canonicalName', 'deities', 'folkNames', 'description'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. Amaranthus',
          supports: ['planets', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-amaranthus-hypochondriacus',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Amaranth',
              supports: ['form'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. Amaranthus',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Amaranth',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The small, shiny seeds are eaten, valued as nourishing and mild in flavour. In magic a handful is sprinkled round a candle on the altar to strengthen contact with spirits.',
          references: [
            {
              source: 'wikipedia-amaranthus-hypochondriacus',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Amaranth',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'American Bittersweet',
      canonicalName: 'Celastrus scandens',
      nomenclature: 'botanical',
      description:
        'American bittersweet is a sturdy woody vine of the family Celastraceae, found wild across central and eastern North America, where it grows on rich, well-drained woodland soils and flowers mostly in June. Its twining stems can pass thirty feet in length and an inch in thickness at the base, and they coil so tightly round young trees that they can choke them. The tiny flowers have no scent. In autumn come pea-sized fruits, red berries framed by yellow-orange petals, which birds relish but which are poisonous to people. Colonists named it bittersweet in the eighteenth century because its fruit looked like that of the European nightshade of the same name, and the word American now marks it off from its invasive Asian relative, Oriental bittersweet. Native Americans and settlers took the root to bring on vomiting and against venereal disease and the symptoms of tuberculosis, and it was winter food for the Menominee, Ojibwe and Potawatomi when supplies ran short. It is grown today in gardens and for seasonal flower arrangements. In magic a small piece tied on the body is said to shield people and animals from evil and draw it out of them, and a sprig under the pillow helps one forget an old love.',
      elements: ['air'],
      planets: ['Mercury', 'Pluto', 'Saturn'],
      zodiacSigns: ['Aquarius'],
      safetyNotes:
        'Poisonous. The berries are toxic if swallowed, and every part of the plant should be handled with care.',
      folkNames: ['Wax Work', 'False Bittersweet'],
      deities: ['Hecate'],
      categories: [
        'Protection',
        'Healing',
        'Banishing',
        'Manifestation',
        'Peace',
        'Release',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Bittersweet',
          supports: [
            'canonicalName',
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
          locator: 's.v. Bittersweet',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'wikipedia-celastrus-scandens',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Berry',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bittersweet',
              supports: ['form'],
            },
            {
              source: 'wikipedia-celastrus-scandens',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'American Ginseng',
      canonicalName: 'Panax quinquefolius',
      nomenclature: 'botanical',
      description:
        "American ginseng is a small herbaceous perennial of the ivy family, Araliaceae, at home in south-eastern Canada and the eastern United States, where it keeps to the deep shade of deciduous hardwood forest, above all in the Appalachians and the Ozarks. It stands six to eighteen inches tall, usually with three compound leaves of three to five leaflets each, and its fragrant root is shaped like a little parsnip and divides with age. It flowers in July, and its berries ripen to deep red by September. The Jesuit missionary Joseph-François Lafitau found it near Montreal in 1716 with the help of the Haudenosaunee, whose name for it means 'resembles man', and by 1720 roots from Quebec were going to China, beginning a trade with Asia now three centuries old. Overharvesting and lost habitat have made the wild plant rare; it is listed under CITES Appendix II, is endangered in Canada, and has been grown as a crop since the late nineteenth century. Among the Pawnee, Meskwaki, Delaware and Mohegan it served both as medicine and in love charms. In magic the root is carried to draw love, guard health and secure sexual potency, burned to drive off evil spirits and break hexes, or charged with a wish and thrown into running water.",
      elements: ['fire'],
      planets: ['Sun'],
      safetyNotes:
        'AHPA safety class 1. It may weaken the effect of warfarin, so the two should be taken together only under the supervision of a healthcare professional. Allergic reactions, asthma and rashes among them, have been reported, and improper use is reported to cause headache, weakness, vomiting and other effects. It may alter blood sugar, so people with diabetes should watch theirs closely and consult a qualified practitioner first. Its safety in pregnancy and while nursing is not established, and it should not be taken while pregnant or breastfeeding.',
      folkNames: [
        'Wonder of the World Root',
        'Sang',
        'Shang',
        'Five Fingers',
        'Tartar Root',
        'Red Berry',
        "Man's Health",
        'Xi Yang Shen',
      ],
      categories: ['Love', 'Healing', 'Protection', 'Lust', 'Fertility'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Ginseng, American',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Ginseng',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 625; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Ginseng',
          supports: ['folkNames'],
        },
        {
          source: 'wikipedia-american-ginseng',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 625',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Ginseng, American',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ginseng',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Ginseng',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Angelica',
      canonicalName: 'Angelica archangelica',
      nomenclature: 'botanical',
      description:
        'Angelica is a tall biennial of the carrot family, Apiaceae, growing wild through the far north of Europe, from Russia and Scandinavia to Greenland, the Faroes and Iceland, always in damp ground near water. In its first year it makes only leaves; in its second a fluted stem rises as high as two and a half metres, carrying round heads of small greenish-yellow flowers. Grown as a vegetable and a medicine since the tenth century and taken up in Sámi cooking, it flavours gin and liqueurs such as Chartreuse and Bénédictine, and its stems are candied. It looks like several poisonous members of its family, so a wild plant must be identified with certainty. Northern European folklore held it a guard against contagion and enchantment. Grieve gives the belief that it blooms on the feast of Michael the Archangel and so keeps off evil spirits and witchcraft, and its old name, Root of the Holy Ghost; Anglo-Saxons wore the root on a string against spells, it shielded cattle from elf shot, Lapland poets were crowned with it, and the Cherokee and Delaware used it against evil spirits. Culpeper placed it under the Sun in Leo. In magic it goes into protection and exorcism incenses, is sprinkled round a house to keep evil out, and in a bath lifts curses and hexes; burning the root breaks a hex and consecrates ritual space.',
      elements: ['fire'],
      planets: ['Sun'],
      zodiacSigns: ['Aries', 'Leo'],
      safetyNotes:
        'AHPA safety class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner, because it was traditionally used to bring on menstruation. Safety while nursing is not established. It contains furanocoumarins, which can make skin that touches the plant react more strongly to sunlight, and some sources advise avoiding long exposure to the sun while taking it, though no case of such a reaction from internal use has been found.',
      folkNames: [
        'Archangel',
        'Masterwort',
        'Garden Angelica',
        'Norwegian Angelica',
        'Wild Celery',
        'European Angelica',
        'Root of the Holy Ghost',
      ],
      deities: ['Venus'],
      categories: [
        'Protection',
        'Healing',
        'Harmony',
        'Banishing',
        'Binding',
        'Courage',
        'Divination',
        'Inspiration',
        'Knowledge',
        'Manifestation',
        'Peace',
        'Strength',
        'Success',
      ],
      substitutes: [
        {
          name: 'American Angelica',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Angelica; p. 266',
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
          source: 'kynes-plants',
          locator: 's.v. Angelica',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 69–70; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. Angelica',
          supports: ['planets', 'zodiacSigns', 'description'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Angelica',
          supports: ['canonicalName', 'folkNames', 'description', 'substitutes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 48–50',
          supports: ['description'],
        },
        {
          source: 'wikipedia-angelica-archangelica',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 69',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Angelica',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Angelica',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Smoking angelica leaves is said to bring visions. Being aromatic, the dried leaves were also used to make hop bitters, and an infusion of them was drunk as a strengthening tonic.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Angelica',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Angelica',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Anise',
      canonicalName: 'Pimpinella anisum',
      nomenclature: 'botanical',
      description:
        "Anise is an annual herb of the carrot family, Apiaceae, whose homeland is south-west Asia and the eastern Mediterranean, growing two to three feet tall. Its lowest leaves are simple and shallowly lobed, the upper ones finely cut and feathery; small white or yellow flowers crowd into umbels and give way to the small ribbed fruits known as aniseed. Their sweet, liquorice-like flavour goes into sweets, cakes and drinks such as ouzo, sambuca, pastis, raki and arak. It was first grown in the Middle East and has been farmed in Egypt for some four thousand years; Dioscorides and Pliny knew it, and in Virgil's day it was already a spice. Romans closed a rich meal, and sometimes a wedding feast, with a spiced cake containing it, and the seeds were once taken in part payment of taxes. Theophrastus held that seeds kept by the bed brought sweet dreams, the Romans laid a sprig by the pillow against bad ones, and in medieval England it was believed to turn aside the evil eye. In magic a little pillow stuffed with the seeds keeps nightmares away, the herb goes into protection and meditation incenses, the seed into purification baths, and fresh leaves set about a room or round a magic circle drive off evil.",
      elements: ['air'],
      planets: ['Jupiter', 'Mars', 'Mercury'],
      zodiacSigns: ['Gemini', 'Leo', 'Pisces'],
      safetyNotes:
        'AHPA safety class 1. Allergic reactions have been reported, among them occupational asthma, a case of eye and nose symptoms with stomach upset, and swelling of the tongue. Some herbals advise against taking it internally in pregnancy; AHPA records that infusions may be used then, but not alcohol extracts or the essential oil. Safety while nursing is not established.',
      folkNames: ['Aniseed', 'Sweet Cumin', 'Anneys', 'Aniseseed', 'Yanisin', 'Anix'],
      deities: ['Apollo', 'Hecate', 'Hermes', 'Mercury'],
      categories: [
        'Protection',
        'Purification',
        'Banishing',
        'Divination',
        'Dream Work',
        'Love',
        'Prophecy',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Anise; p. 266',
          supports: [
            'canonicalName',
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
          locator: 's.v. Anise',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 657–658; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'grieve-herbal',
          locator: 's.v. Anise',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 9',
          supports: ['description'],
        },
        {
          source: 'wikipedia-anise',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          substitutes: [
            {
              name: 'Star Anise',
            },
          ],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 657',
              supports: ['form'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Anise',
              supports: ['form', 'substitutes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Anise',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Anise',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Fresh anise leaves are set about a room to drive off evil, and laid round the magic circle to keep evil spirits from the magician. Roman sleepers kept a leafy sprig by the pillow against bad dreams, and the leaves also season food.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Anise',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Anise',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-herbal',
              locator: 's.v. Anise',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil is drawn from the fruits by steam distillation or carbon dioxide extraction and is mostly anethole. A little diffused in the air is said to sharpen awareness when working with spirits and to help divination and dream work.',
          safetyNotes:
            'Estragole makes up 1–3% of the oil. Alcohol extracts and the essential oil should not be used in pregnancy, though an infusion of the seed may be.',
          references: [
            {
              source: 'wikipedia-anise',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Anise',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 657',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
  ],
};
