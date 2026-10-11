import type { SeedCompendiumShard } from '../types';

// MB.244's shard: the candidate list's plants and fungi from Co to K
// (claude-docs/db/compendium-seed/candidates.md), each value traced to a page
// or revision read on 2026-10-11. Which source supports which field, and every
// candidate row not seeded with its reason, is recorded in
// claude-docs/db/compendium-seed/plants-co-k.md. Descriptions are written
// fresh from the sources, never copied.
export const PLANTS_CO_K: SeedCompendiumShard = {
  name: 'plants-co-k',
  sources: {
    'grieve-deer-s-tongue': {
      kind: 'entry',
      authors: 'Grieve, M.',
      title: "Deer's Tongue",
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/d/deerst10.html',
      accessed: '2026-10-11',
    },
    'wikipedia-aquilegia': {
      kind: 'entry',
      title: 'Aquilegia',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aquilegia&oldid=1367513179',
      accessed: '2026-10-11',
    },
    'wikipedia-bellis-perennis': {
      kind: 'entry',
      title: 'Bellis perennis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bellis_perennis&oldid=1375045201',
      accessed: '2026-10-11',
    },
    'wikipedia-centaurea-cyanus': {
      kind: 'entry',
      title: 'Centaurea cyanus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Centaurea_cyanus&oldid=1376904502',
      accessed: '2026-10-11',
    },
    'wikipedia-coconut': {
      kind: 'entry',
      title: 'Coconut',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Coconut&oldid=1378728501',
      accessed: '2026-10-11',
    },
    'wikipedia-coriander': {
      kind: 'entry',
      title: 'Coriander',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Coriander&oldid=1376096465',
      accessed: '2026-10-11',
    },
    'wikipedia-crocus': {
      kind: 'entry',
      title: 'Crocus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Crocus&oldid=1375202438',
      accessed: '2026-10-11',
    },
    'wikipedia-cucumber': {
      kind: 'entry',
      title: 'Cucumber',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cucumber&oldid=1353895530',
      accessed: '2026-10-11',
    },
    'wikipedia-cumin': {
      kind: 'entry',
      title: 'Cumin',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cumin&oldid=1378292296',
      accessed: '2026-10-11',
    },
    'wikipedia-cupressus-sempervirens': {
      kind: 'entry',
      title: 'Cupressus sempervirens',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cupressus_sempervirens&oldid=1378614423',
      accessed: '2026-10-11',
    },
    'wikipedia-curry-tree': {
      kind: 'entry',
      title: 'Curry tree',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Curry_tree&oldid=1373218266',
      accessed: '2026-10-11',
    },
    'wikipedia-cyclamen': {
      kind: 'entry',
      title: 'Cyclamen',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cyclamen&oldid=1370137710',
      accessed: '2026-10-11',
    },
    'wikipedia-date-palm': {
      kind: 'entry',
      title: 'Date palm',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Date_palm&oldid=1376687372',
      accessed: '2026-10-11',
    },
    'wikipedia-elymus-repens': {
      kind: 'entry',
      title: 'Elymus repens',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Elymus_repens&oldid=1366011475',
      accessed: '2026-10-11',
    },
    'wikipedia-gossypium-barbadense': {
      kind: 'entry',
      title: 'Gossypium barbadense',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Gossypium_barbadense&oldid=1378541477',
      accessed: '2026-10-11',
    },
    'wikipedia-malus-sylvestris': {
      kind: 'entry',
      title: 'Malus sylvestris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Malus_sylvestris&oldid=1378007054',
      accessed: '2026-10-11',
    },
    'wikipedia-narcissus-plant': {
      kind: 'entry',
      title: 'Narcissus (plant)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Narcissus_(plant)&oldid=1376317795',
      accessed: '2026-10-11',
    },
    'wikipedia-papaver-rhoeas': {
      kind: 'entry',
      title: 'Papaver rhoeas',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Papaver_rhoeas&oldid=1375086318',
      accessed: '2026-10-11',
    },
    'wikipedia-piper-cubeba': {
      kind: 'entry',
      title: 'Piper cubeba',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Piper_cubeba&oldid=1369767548',
      accessed: '2026-10-11',
    },
    'wikipedia-primula-veris': {
      kind: 'entry',
      title: 'Primula veris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Primula_veris&oldid=1357773685',
      accessed: '2026-10-11',
    },
    'wikipedia-symphytum-officinale': {
      kind: 'entry',
      title: 'Symphytum officinale',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Symphytum_officinale&oldid=1369812911',
      accessed: '2026-10-11',
    },
    'wikipedia-taraxacum-officinale': {
      kind: 'entry',
      title: 'Taraxacum officinale',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Taraxacum_officinale&oldid=1371025491',
      accessed: '2026-10-11',
    },
    'wikipedia-turnera-diffusa': {
      kind: 'entry',
      title: 'Turnera diffusa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Turnera_diffusa&oldid=1357775418',
      accessed: '2026-10-11',
    },
    'wikipedia-tussilago': {
      kind: 'entry',
      title: 'Tussilago',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tussilago&oldid=1368441229',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Coconut',
      canonicalName: 'Cocos nucifera',
      nomenclature: 'botanical',
      description:
        'The coconut is the fruit of a tall, slender palm, the one living species of its genus, which can reach some thirty metres under a crown of long feathery leaves. Its first home was South-east Asia, New Guinea and the south-western Pacific; Austronesian seafarers domesticated it and carried it on their ocean voyages, and it now grows along tropical coasts almost everywhere. As the fruit ripens it browns and builds a thick fibrous husk around a hard shell, inside which lie the flesh and a store of liquid. Nearly every part is used: the flesh for food, oil and milk, the shell for charcoal, the husk for coir. The name goes back to a Portuguese word for a grimacing face or goblin, suggested by the three dents that give the shell a face. In Hindu worship a coconut is offered to the gods and broken at the outset of a new undertaking, and Lakshmi is often pictured holding one; Kynes records it broken in place of a sacrifice to Kali and offered to Ganesh. In Malaysia a nut without its three eyes was kept as a charm against enemies. In magic it serves purification, protection and chastity: a halved coconut, drained and packed with protective herbs, is sealed and buried to guard a property, and a whole one hung indoors protects the household.',
      elements: ['water', 'air', 'fire'],
      planets: ['Moon', 'Jupiter', 'Mars', 'Sun'],
      zodiacSigns: ['Leo', 'Sagittarius', 'Scorpio'],
      folkNames: ['Niyog', 'Ranedj', 'Cocoanut', 'Indian Nut', 'Tree of Life'],
      deities: ['Hina', 'Kali', 'Shiva', 'Vishnu', 'Lakshmi'],
      categories: ['Purification', 'Protection', 'Abundance', 'Healing', 'Intuition', 'Success'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Coconut',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Coconut',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-coconut',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'deities', 'description'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          references: [
            {
              source: 'wikipedia-coconut',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Coconut',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Coconut oil comes from the white flesh lining the nut. The refined, or fractionated, oil has neither scent nor colour; the unrefined, or virgin, oil is pale or whitish yellow, smells of coconut and turns solid below about 21 °C. It keeps almost indefinitely and is a common base for herb-infused salves.',
          safetyNotes: 'Kynes describes topical use as generally regarded as safe.',
          references: [
            {
              source: 'kynes-remedies',
              locator: 'pp. 243–244',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-coconut',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Beads cut from coconut shell are worn as a string or carried in a pocket for success in any venture, and a string of nine kept in the home is used for protection.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Coconut',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Coltsfoot',
      canonicalName: 'Tussilago farfara',
      nomenclature: 'botanical',
      description:
        "Coltsfoot is a low perennial of the daisy family, five to fifteen centimetres tall, that spreads by rhizomes and often forms colonies on waste ground, roadsides and other disturbed soil. It is the only accepted species in its genus. Its yellow, dandelion-like flower heads rise on scaly stalks in early spring and turn into fluffy seed heads before any leaf appears; the broad, toothed leaves, downy beneath, come afterwards and wither by early summer. It belongs to Europe, Asia and North Africa and has been introduced to the Americas. The common name likens the leaf to a colt's hoof, and the genus name comes from the Latin for cough, a sign of the plant's long medicinal standing: Greek and Roman physicians used it, its flower was painted on doorposts in medieval Europe as an apothecary's sign, and in 1903 Northcote found it still given for coughs. That standing has faded since the discovery of toxic pyrrolizidine alkaloids in it raised concerns for the liver. In parts of England witches were said to put it in love potions; its seeds drifting on windless air foretold rain, and to the Victorians the flower promised that justice would be done. In magic it is added to love sachets and to spells for peace and tranquillity, and three flowers worn in a sachet are said to strengthen psychic sight during divination.",
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Libra', 'Taurus'],
      safetyNotes:
        'AHPA places both the leaf and the flower bud in safety classes 2b, 2c and 2d: not for use in pregnancy or while nursing except under the supervision of a qualified healthcare practitioner, and not for more than six weeks a year. Both contain pyrrolizidine alkaloids, among them senkirkine and senecionine, which have shown liver-damaging and cancer-causing effects. AHPA requires products containing them to be sold for external use only, labelled not to be applied to broken or abraded skin and not to be used when nursing; extracts with the alkaloids removed are exempt from these concerns. Cunningham marks coltsfoot as not recommended for internal use, and not to be taken internally in pregnancy or while nursing. Kynes calls it unsafe to ingest.',
      folkNames: [
        "Ass's Foot",
        'British Tobacco',
        "Bull's Foot",
        'Butterbur',
        'Coughwort',
        "Pas d'ane",
        'Sponnc',
        "Foal's Foot",
        'Foalswort',
        'Horsehoof',
        'Tash Plant',
        'Farfara',
        'Horse Foot',
      ],
      deities: ['Brigid', 'Epona'],
      categories: [
        'Love',
        'Peace',
        'Divination',
        'Dream Work',
        'Healing',
        'Justice',
        'Legal Matters',
        'Prosperity',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Coltsfoot; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Coltsfoot',
          supports: [
            'canonicalName',
            'nomenclature',
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
          source: 'ahpa-safety',
          locator: 'pp. 886–887, 889; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 167',
          supports: ['description'],
        },
        {
          source: 'wikipedia-tussilago',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The cut, dried leaves are the form most often sold. To honour Epona, four leaves are pressed flat in a book and laid on the altar to stand for hoofprints.',
          safetyNotes:
            'Coltsfoot leaves look much like those of Petasites and Adenostyles, and people who ate those plants in mistake for coltsfoot have been poisoned.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 889',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Coltsfoot',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Coltsfoot',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The dried flowers are sold as well as the leaves. Three flowers sewn into a sachet and worn during divination are said to build psychic ability and deepen visionary experience.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Coltsfoot',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Bud',
          description:
            'The unopened flower bud is the part used in Chinese medicine, where it is called kuan dong hua.',
          safetyNotes:
            'AHPA cautions its use by anyone coughing up blood or pus. An overdose may cause restlessness, excitement, irritability and quickened breathing, and a Chinese reference warns that long use in high doses may carry a risk of liver cancer.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 886–887',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Columbine',
      canonicalName: 'Aquilegia',
      nomenclature: 'botanical',
      description:
        "Columbines make up the genus Aquilegia, perennials of the buttercup family whose wild species range across the Northern Hemisphere and which cross so readily that gardens hold a great many varieties. They rise from slender woody rootstocks, with leaves divided into threes and nodding flowers whose five petals usually end in hollow, nectar-filled spurs pointing backwards. European species run to blue and purple, North American ones to red and yellow. The flowers name the plant: the Latin aquila, eagle, for the talon-like spurs, and columba, dove, for flowers likened to doves. The Saxons called it culverwort for the same reason, and Northcote notes that the old name culverkeys was at times given to it. Greek and Roman tradition linked it to Aphrodite and Venus, but its horn-shaped spurs later made it an emblem of cuckoldry in England, where giving a woman columbine was an insult, and Ophelia includes it among the flowers she hands out in Hamlet. Several North American peoples, by contrast, put the seeds in love charms. Its old name lion's herb comes from the belief that lions ate it for courage. Magically it is carried, or rubbed on the hands, for daring, and the crushed seeds serve as a love perfume or are kept in a pocket to steady the emotions.",
      elements: ['water'],
      planets: ['Venus'],
      safetyNotes:
        'Cunningham marks the seed as poison, and Kynes warns that every part of the plant is toxic if eaten. Columbines contain cyanogenic glycosides. One person who ate about 20 grams of fresh Aquilegia vulgaris leaves suffered convulsions, breathing difficulty and heart failure; a child who ate twelve flowers had weak limbs, bluish skin and drowsiness for some hours; and the ripe seeds and roots hold toxins dangerous to the heart. The flowers were once eaten as a garnish, until deaths from overdose were reported.',
      folkNames: [
        "Lion's Herb",
        'Dancing Fairies',
        "Granny's Bonnet",
        'Night Caps',
        'Rock Bells',
        'Culverwort',
      ],
      deities: ['Aphrodite', 'Venus'],
      categories: [
        'Courage',
        'Love',
        'Harmony',
        'Creativity',
        'Inspiration',
        'Peace',
        'Purification',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Columbine',
          supports: [
            'elements',
            'planets',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Columbine',
          supports: [
            'elements',
            'planets',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 25, 62',
          supports: ['description'],
        },
        {
          source: 'wikipedia-aquilegia',
          supports: [
            'canonicalName',
            'nomenclature',
            'folkNames',
            'deities',
            'safetyNotes',
            'description',
          ],
        },
      ],
      variants: [
        {
          form: 'Herb',
          description:
            'The plant is carried, or rubbed between the hands, to bring courage and daring.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Columbine',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Ground seeds are rubbed on the hands and body as a love perfume, a use Indigenous North Americans also made of crushed Aquilegia canadensis seed. A few seeds carried in a pocket are said to bolster courage and balance the emotions.',
          safetyNotes:
            'Cunningham marks the seed as poison, and the ripe seeds contain toxins that are dangerous to the heart if eaten.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Columbine',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Columbine',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-aquilegia',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Pod',
          description:
            'A few seedpods are steeped in olive oil, and the oil is used to dress candles for love spells.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Columbine',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Comfrey',
      canonicalName: 'Symphytum officinale',
      nomenclature: 'botanical',
      description:
        'Comfrey is a bristly perennial of the borage family, one of some thirty-five Symphytum species that share the name, and is set apart from the rest as common or true comfrey. Native to Europe, it likes damp grassland, riverbanks and ditches, and has become an introduced weed in North America. It grows from about thirty centimetres to one and a half metres tall on winged stems above a deep taproot that is black outside and white within, with large lance-shaped leaves and drooping clusters of tubular bells in cream, yellow, pink or purple, followed by glossy black nutlets. Its name comes from a Latin word meaning to heal, literally to boil together, and names such as knitbone and boneset recall its long use, from classical times through the Middle Ages, in poultices of leaf and root for sprains, bruises and broken bones; mashed root packed round a broken limb was said to dry hard like a plaster cast. Folklore held that a comfrey bath restored virginity, and in Norfolk it went into pig feed to keep the animals from being bewitched. Northcote records a village ointment for which white comfrey was used for a woman and the red-flowered kind for a man. In magic it is a herb of safe travel, worn, carried or tucked into luggage against loss and theft; the root serves money spells, and burned it strengthens banishing and binding work.',
      elements: ['water', 'air', 'earth'],
      planets: ['Saturn', 'Jupiter'],
      zodiacSigns: ['Capricorn', 'Gemini'],
      safetyNotes:
        'AHPA places comfrey leaf and root in safety classes 2a, 2b and 2c: for external use only, and not for use in pregnancy or while nursing. It contains pyrrolizidine alkaloids, and veno-occlusive liver disease has been reported in people taking the leaf or the root. AHPA requires products containing these alkaloids to be labelled for external use only, not to be applied to broken or abraded skin and not to be used when nursing; extracts with the alkaloids removed are exempt from these concerns. German authorities advise limiting external use to four to six weeks a year. Comfrey leaves resemble foxglove, and people have been poisoned by eating foxglove in mistake for comfrey. Cunningham marks it as not recommended for internal use. Kynes calls it unsafe to ingest and notes that it may irritate the skin when handled.',
      folkNames: [
        'Assear',
        'Black Wort',
        'Boneset',
        'Bruisewort',
        'Consohda',
        'Consound',
        'Gum Plant',
        'Healing Herb',
        'Knit Back',
        'Knit Bone',
        'Miracle Herb',
        'Slippery Root',
        'Wallwort',
        'Yalluc',
        'Gavez',
        'Smeerwartel',
        'Karakaffes',
        'Ztworkost',
        'Ass Ear',
        'Common Comfrey',
        'True Comfrey',
      ],
      categories: [
        'Safe Travel',
        'Protection',
        'Abundance',
        'Banishing',
        'Binding',
        'Healing',
        'Peace',
        'Psychic Work',
        'Release',
        'Strength',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Comfrey; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Comfrey',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 834–835; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 165',
          supports: ['description'],
        },
        {
          source: 'wikipedia-symphytum-officinale',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The root is used in money spells, and small pieces of dried root are burned to give extra force to spells that banish or bind. It is sold in pieces or powdered.',
          safetyNotes:
            'The dried root carries more pyrrolizidine alkaloid than the leaf: AHPA gives 0.3–0.6% in dried root against 0.012–0.16% in leaf.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Comfrey',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Comfrey',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 834',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Leaf',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 834',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Comfrey',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Comfrey infused in oil is worked into ointments and balms. A dab of the infused oil on the forehead is said to aid safe and easy travel.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Comfrey',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-symphytum-officinale',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Coriander',
      canonicalName: 'Coriandrum sativum',
      nomenclature: 'botanical',
      description:
        "Coriander is an annual herb of the family Apiaceae, native to the Mediterranean Basin and standing about half a metre tall. Its leaves change shape up the stem, broad and lobed near the ground and fine and feathery higher up, and its small white to pale pink or lavender flowers sit in umbrella-shaped clusters that ripen into round, golden-brown fruits, sold as the seed. The seed keeps the name coriander, while the leaf is often called cilantro, and both appear in Mexican, Peruvian, Indian and South-east Asian cooking. Its history is long: fruits were found in Tutankhamun's tomb, the Greeks and Romans took it as medicine and to flavour wine, the Chinese linked it with immortality, and in India it is still offered to the gods. The Middle East counted it an aphrodisiac, and medieval and Renaissance Europe put it into love potions. German magicians of the Middle Ages used it to call up spirits, its seeds served in Europe as charms against witches and evil spirits, and in parts of Morocco houses were smoked with it against malevolent jinn. In magic the seeds go into love sachets, are powdered and stirred into warm wine as a lust potion, and are worn to ease headaches.",
      elements: ['fire'],
      planets: ['Mars', 'Saturn', 'Venus'],
      zodiacSigns: ['Aries', 'Leo'],
      safetyNotes:
        'Cunningham marks coriander as recognised as safe, and AHPA puts the fruit (the "seed") in safety class 1. Allergic reactions to the fruit have been reported, anaphylaxis among them, and handling coriander at work has caused contact dermatitis and asthma. Animal studies suggest it can affect blood-sugar control, so people with diabetes are advised to watch their blood sugar and talk to a qualified healthcare practitioner before taking it. Its safety while nursing has not been conclusively established.',
      folkNames: [
        'Chinese Parsley',
        'Cilantro',
        'Cilentro',
        'Culantro',
        'Uan-Suy',
        'Stinkdillsamen',
        'Hu-Sui',
      ],
      categories: [
        'Love',
        'Healing',
        'Harmony',
        'Divination',
        'Dream Work',
        'Fertility',
        'Peace',
        'Protection',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Coriander; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Coriander',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 271',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-coriander',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Coriander',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Coriander',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 271',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaf is the part known as cilantro, taken from the lower stem, where the leaves are broad and parsley-like; it is mostly eaten fresh. Kynes lists it cut and dried, and suggests slipping a couple of leaves under the pillow to dream of romance.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Coriander',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-coriander',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Kynes lists the essential oil among the forms sold and uses it to consecrate charms and amulets.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Coriander',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Corn Poppy',
      canonicalName: 'Papaver rhoeas',
      nomenclature: 'botanical',
      description:
        "The corn poppy is an annual of the poppy family, Papaveraceae, native to North Africa and temperate Eurasia and now introduced on every continent except Antarctica. It is a weed of disturbed ground that was once plentiful in cereal fields before herbicides, hence the names corn poppy and field poppy, and it still springs up in fallow land; the garden Shirley poppy is one of its cultivars. The plant reaches about seventy centimetres and carries single flowers five to ten centimetres across, each with four vivid red petals usually blotched black at the base. A flower lasts only a day, but one plant may open up to four hundred in a warm season, and the hairless, egg-shaped capsule holds black seeds. Broken tissue seeps a white to yellowish latex, and the plant contains rhoeadine, a mildly sedative alkaloid. The seeds are edible, and the petals give a red dye used in some medicines and wines. In Ireland it was regarded as a witch's flower and in Wales it was associated with goblins. In China it bears the name of Consort Yu, since folklore says poppies grew where she fell, and it became an emblem of loyalty unto death. Kynes treats it with the opium poppy in a single entry, whose magical uses turn on dreams, fertility, love and wisdom.",
      elements: ['fire', 'water'],
      planets: ['Moon'],
      zodiacSigns: ['Cancer', 'Capricorn'],
      folkNames: [
        'Common Poppy',
        'Red Poppy',
        'Field Poppy',
        "Goblin's Eye",
        'Red Hag',
        'Corn Rose',
        'Flanders Poppy',
        'Odai',
      ],
      deities: [
        'Aphrodite',
        'Artemis',
        'Ceres',
        'Demeter',
        'Diana',
        'Hera',
        'Hermes',
        'Mercury',
        'Minerva',
        'Persephone',
        'Venus',
      ],
      categories: ['Dream Work', 'Fertility', 'Love', 'Prosperity', 'Protection', 'Wisdom'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Poppy',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-papaver-rhoeas',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Petal',
          description:
            'The petals hold a red dye that colours some medicines and wines, and dried petals are sometimes added to potpourri for their colour. In folk medicine they were made into a syrup given to children to help them sleep.',
          colors: ['red'],
          references: [
            {
              source: 'wikipedia-papaver-rhoeas',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The small black seeds are edible, alone or baked into bread, though most poppy seed sold for cooking comes from the opium poppy.',
          colors: ['black'],
          references: [
            {
              source: 'wikipedia-papaver-rhoeas',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Poppy',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Pod',
          description:
            'Kynes sells poppy seedpods dried. For dream work she keeps a vase of them at the bedside; when seeking wisdom she meditates with a pod in each hand and then offers them to the deity she works with.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Poppy',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cornflower',
      canonicalName: 'Centaurea cyanus',
      nomenclature: 'botanical',
      description:
        "Cornflower is an annual flowering plant of the family Asteraceae, native to Europe, which grew so freely as a weed among cereal crops that it took their name. It stands from twenty centimetres to a metre tall on branched, grey-green stems with narrow leaves, and through the summer it opens ragged heads of florets, usually an intense blue from the pigment protocyanin and now and then purple or white. Heavy use of herbicides has made it endangered across much of its native range, and in the United Kingdom it has shrunk to a handful of sites, though it has naturalised in North America and parts of Australia. The petals are edible, used to colour food and to garnish salads and desserts, and some blends of Lady Grey tea include them. The genus takes its name from the Greek for centaur, and Kynes relates that Chiron was said to have healed a poisoned arrow wound with it. Much of its lore concerns love. In Switzerland two young buds were picked and worn, and a romance was judged shared or one-sided by whether both opened; elsewhere the petals were plucked one at a time to test a lover's loyalty. Cunningham records it worn on the breast to win a man's love, or carried in a pocket, where its wilting or staying fresh foretells how a courtship will go. Since 1969 it has been the national flower of Estonia.",
      elements: ['water', 'earth'],
      planets: ['Venus', 'Saturn'],
      zodiacSigns: ['Aquarius', 'Capricorn', 'Libra', 'Taurus'],
      safetyNotes:
        'AHPA places cornflower herb in safety class 1, with no known contraindications, interactions or side effects, and Cunningham marks it as recognised as safe. No information was found on its safety in pregnancy or while nursing, so its safety at those times has not been conclusively established.',
      folkNames: [
        "Bachelor's Buttons",
        "Devil's Flower",
        'Red Campion',
        'Bluet',
        'Hurtlesickle',
        'Bluebottle',
        'Knapweed',
        'Little Blue Heads',
        "Witches' Bells",
        "Witches' Needles",
        'Blue Cap',
        'Blue Blobs',
        'Blue Bonnet',
        'Cornbottle',
        'Ragged Robin',
        'Gogglebuster',
        'Ragged Sailor',
        'Hurtsickle',
      ],
      deities: ['Flora'],
      categories: [
        'Love',
        'Divination',
        'Fidelity',
        'Peace',
        'Protection',
        'Psychic Work',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Bachelor's Buttons; p. 266",
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Cornflower',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'deities',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 183',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-centaurea-cyanus',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['blue'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Cornflower',
              supports: ['form', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: "s.v. Bachelor's Buttons",
              supports: ['form'],
            },
            {
              source: 'wikipedia-centaurea-cyanus',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 183',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cotton',
      canonicalName: 'Gossypium barbadense',
      nomenclature: 'botanical',
      description:
        "Gossypium barbadense is one of the cotton species, a member of the mallow family whose native range runs from Colombia to Peru. On the coast of present-day Ecuador and Peru it was in wide use some five thousand years ago, and the people there may have been its first domesticators. In the dry tropics it is a frost-tender perennial that becomes a bush or small tree of one to three metres, though farmers grow it as an annual. Its leaves are cut into three to five deep lobes, its showy yellow flowers open only partly, and its black seeds form in bolls that split open when ripe to show snowball-like tufts of fibre. It is prized for an unusually long, fine and silky fibre, sold under names such as Sea Island, Egyptian and Pima cotton; it makes up about a twentieth of the world's crop and goes into fine yarn, lace, high thread-count cloth and sewing thread. Like all cottons it contains gossypol, which makes the plant poisonous to animals that are not ruminants. The folk magic Cunningham records is mostly about the fibre: a piece put in the sugar bowl, or thrown over the right shoulder at dawn, brings luck before the day is out; cotton planted or strewn in the yard keeps ghosts away; vinegar-soaked cotton balls on the windowsills hold evil off; pepper sewn into cotton and worn calls back a lost love; and burning it is said to bring rain.",
      elements: ['earth'],
      planets: ['Moon'],
      categories: ['Healing', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cotton',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-gossypium-barbadense',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          description:
            'For a fishing charm, Cunningham has twenty cotton seeds laid at the edge of the water on a windy day, to be sure of at least one bite.',
          colors: ['black'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cotton',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-gossypium-barbadense',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'The bark of the root, the part the safety literature covers; cotton root bark was traditionally used to bring on abortion.',
          safetyNotes:
            "Cunningham marks cotton root bark as not to be taken internally during pregnancy. AHPA's monograph on cotton root bark, which covers the genus and names Gossypium herbaceum and G. hirsutum, puts it in safety class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner, since it has been used to bring on abortion and stimulates the uterus. It contains gossypol, a compound that, when trialled as a male contraceptive, left a quarter to half of the men taking it chronically or permanently infertile. Its safety while nursing has not been conclusively established.",
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cotton; p. 266',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 422–423',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Couch Grass',
      canonicalName: 'Elymus repens',
      nomenclature: 'botanical',
      description:
        'Couch grass is a widespread perennial grass whose home range covers most of Europe and Asia, the Arctic and north-west Africa. Taken elsewhere in the cooler north as fodder or to hold soil against erosion, it has often escaped to become an invasive weed. Its stems rise to between 40 and 150 centimetres, with flat, hairy leaves and an upright flower spike that Kynes likens to an ear of wheat, and it blooms from late June into August. Creeping rhizomes carry it quickly through grassland and make it hard to clear from a garden, since every broken piece can grow into a new plant. Grazing animals feed on its foliage and buntings and finches on its seed, and in traditional Austrian medicine the rhizome was a remedy for fever. Kynes treats it under grasses in general, whose lore across Europe and the British Isles gave them power to reach the supernatural, to turn aside the evil eye and to undo magic already worked. Cunningham files it as witch grass: carried, or scattered beneath the bed, to draw new lovers; used in unhexing and uncrossing; its infusion sprinkled round a property to drive entities off; and worn to lift depression.',
      elements: ['earth'],
      planets: ['Jupiter'],
      safetyNotes:
        'AHPA safety class 1 (can be safely consumed when used appropriately), with no known contraindications, drug interactions or side effects; it notes that couch grass is a diuretic. No concerns were found for pregnancy or nursing, but its safety in either has not been conclusively established. Cunningham codes the root as currently recognised as safe.',
      folkNames: [
        'Witch Grass',
        'Witches Grass',
        'Dog Grass',
        'Quick Grass',
        "Medusa's Head",
        'Quack Grass',
        'Twitch Grass',
        'Twitch',
        'Common Couch',
        'Quitch Grass',
        'Quitch',
        'Scutch Grass',
      ],
      categories: [
        'Lust',
        'Love',
        'Uncrossing',
        'Abundance',
        'Communication',
        'Divination',
        'Manifestation',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Witch Grass; p. 266',
          supports: ['planets', 'folkNames', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Grass',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 332; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-elymus-repens',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          colors: ['white'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 332',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Witch Grass',
              supports: ['form'],
            },
            {
              source: 'wikipedia-elymus-repens',
              supports: ['form', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cowslip',
      canonicalName: 'Primula veris',
      nomenclature: 'botanical',
      description:
        'The cowslip is a small perennial of the primrose family, native across most of temperate Europe and western Asia, where it favours open fields, meadows, coastal dunes and clifftops. From a rosette of wrinkled, oval leaves it sends up a stem, growing to about 25 centimetres, that carries a nodding cluster of ten to thirty funnel-shaped, honey-scented flowers: deep or lemon yellow, each petal marked with a reddish spot at its base. Its English name may come from the Old English for cow dung, perhaps because it grew among the dung in cow pastures, and its species name means "of spring". In Britain it declined with the farming changes of the 1970s and 1980s and has since recovered, partly because its seed is sown on motorway banks. In English cookery the flowers flavour country wine and vinegar. Norse legend gave the key-shaped flower heads to Freya; in Germany they were thought to open an enchanted castle or a hidden treasure chest, European legend says the red spots mark where elves touched the petals, and faeries were said to brew cowslip wine for their Midsummer Eve revels. Magically it serves healing and love: worn to keep or restore youth, held in a bunch to find hidden treasure, and woven into a tossed ball of flower heads for love divination.',
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Aries'],
      safetyNotes:
        'AHPA safety class 2d: not for use by people with gastritis or gastric ulcers, and to be used with caution by anyone hypersensitive to Primula species. Occasional stomach discomfort and nausea have been reported from both the root and the flower. No concerns were found for pregnancy or nursing, but its safety in either has not been conclusively established. Cunningham codes it as currently recognised as safe.',
      folkNames: [
        'Arthritica',
        'Artetyke',
        'Buckles',
        'Cuy',
        'Drelip',
        'Fairy Cup',
        'Herb Peter',
        'Key Flower',
        'Key of Heaven',
        "Lady's Key",
        'Lippe',
        "Our Lady's Keys",
        'Paigle',
        'Paralysio',
        'Password',
        'Peggle',
        'Plumrocks',
        'Common Cowslip',
        'English Cowslip',
        'Candle of the Woods',
        'Fairy Basins',
        'Fairy Bells',
        'Fairy Flower',
        'Luck Flower',
        'Cowslip Primrose',
        'Cuy Lippe',
        'Pagil',
        'Petty Mulleins',
        'Crewel',
        'Palsywort',
        "St. Peter's Herb",
        'Petrella',
      ],
      deities: ['Freya'],
      categories: [
        'Healing',
        'Divination',
        'Love',
        'Peace',
        'Prosperity',
        'Protection',
        'Strength',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cowslip; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 's.v. Cowslip',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 'p. 700; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-primula-veris',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          safetyNotes:
            'The flower may cause skin reactions in people sensitive to Primula species.',
          colors: ['yellow'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 700',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cowslip',
              supports: ['form', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cowslip',
              supports: ['form'],
            },
            {
              source: 'wikipedia-primula-veris',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            'Dried, the root is rich in triterpene saponins and also carries phenolic glycosides, whose freed phenolic parts give the crude root its characteristic smell, close to that of methyl salicylate or anethole.',
          safetyNotes:
            'Too much of the root may cause an upset stomach, nausea, vomiting or diarrhoea. Unlike the leaf, the underground parts contain no primin, the Primula skin sensitiser, so no skin effects are expected from taking the root by mouth.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 700',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-primula-veris',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Crab Apple',
      canonicalName: 'Malus sylvestris',
      nomenclature: 'botanical',
      description:
        'The European crab apple is a wild apple tree, small to middling in size and sometimes a many-stemmed bush, that may live eighty to a hundred years and reach fourteen metres. It grows across nearly all of Europe, lacking only in the far north and south, and on into Anatolia and the southern Caucasus, usually as scattered trees at wet woodland edges, in wood pasture and in farm hedges, and it is now rare and threatened throughout that range. Its branches are thorny and its oval leaves are often hairless beneath. White to rosy, fragrant blossom opens in May and June, and the small fruits, about three centimetres across, redden and fall in autumn. It crosses readily with the orchard apple, to whose genome it has contributed, although the cultivated apple descends chiefly from a Central Asian species. Kynes says Celtic myth counted the crab apple a fruit of knowledge, magic and prophecy, growing in Emain Ablach, the otherworldly Place of Apples, home of faeries and of Manannan mac Lir. The Anglo-Saxons used it in medicine; its English name is traced to scrab or scrabba, what eighth-century Vikings called the tree; and the fruit served in love divination and, eaten at bedtime with cucumber and cheese, was said to bring erotic dreams.',
      elements: ['air', 'water'],
      planets: ['Venus'],
      zodiacSigns: ['Aquarius', 'Cancer', 'Libra', 'Taurus'],
      safetyNotes:
        'Kynes cautions that swallowing the seeds produces a form of cyanide in the digestive tract.',
      folkNames: [
        'European Crab Apple',
        'European Wild Apple',
        'Wild Apple',
        'Wild Crabapple',
        'Scrog',
      ],
      deities: [
        'Aphrodite',
        'Apollo',
        'Athena',
        'Diana',
        'Dionysus',
        'Eros',
        'Flora',
        'Freya',
        'Hera',
        'Lugh',
        'Manannan mac Lir',
        'Rhiannon',
        'Venus',
        'Zeus',
      ],
      categories: [
        'Abundance',
        'Ancestor Work',
        'Divination',
        'Healing',
        'Knowledge',
        'Love',
        'Prophecy',
        'Prosperity',
        'Protection',
        'Wisdom',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Crabapple',
          supports: [
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
          source: 'wikipedia-malus-sylvestris',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          colors: ['red'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Crabapple',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-malus-sylvestris',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Kynes suggests holding a crab apple leaf in each hand while meditating on an important decision.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Crabapple',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Crocus',
      canonicalName: 'Crocus',
      nomenclature: 'botanical',
      description:
        'Crocus is a large genus of the iris family: low perennials that grow from corms and keep their flower stems below ground, sending up chalice-shaped blooms in white, yellow, orange or purple between narrow, dark green leaves striped down the middle with white or silver. The flowers shut at night and under cloud. Wild species range from the Mediterranean and North Africa through central and southern Europe, the Aegean islands and the Middle East to Central Asia and western China. They reached European gardens from Turkey in the sixteenth century and are now among the most popular garden flowers of late winter and early spring, and the crocus is widely used as a symbol of spring and new beginnings. Saffron, the spice and dye, is the dried stigma of one autumn-flowering species. Greek legend tells of a youth, Krokus, turned into the flower after dying of unanswered love for Smilax, and the Greeks and Romans decorated banquet tables and wedding beds with the flowers; Kynes adds that faeries were said to prefer the purple woodland crocus. Cunningham holds that growing crocus draws love, and records an ancient Egyptian rite of burning it with alum in a censer to see a vision of the thief who has robbed you.',
      elements: ['water'],
      planets: ['Venus'],
      safetyNotes:
        'Cunningham marks crocus as not recommended for internal use. Kynes warns that it must not be confused with autumn crocus (Colchicum autumnale), which is highly toxic.',
      deities: ['Astarte', 'Hera', 'Thoth', 'Zeus'],
      categories: [
        'Love',
        'Banishing',
        'Divination',
        'Dream Work',
        'Fertility',
        'Healing',
        'Manifestation',
        'Nightmare Protection',
        'Peace',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Crocus; p. 266',
          supports: ['elements', 'planets', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Crocus',
          supports: ['elements', 'planets', 'deities', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'wikipedia-crocus',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Crocus',
              supports: ['form'],
            },
            {
              source: 'wikipedia-crocus',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Kynes makes a powder by crumbling dried crocus flowers and leaves together. Sprinkled at the corners of a house it blesses the home and fosters peace, and a tiny pinch sprinkled on an incense charcoal before divination is meant to sharpen psychic abilities, clairvoyance above all.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Crocus',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cubeb',
      canonicalName: 'Piper cubeba',
      nomenclature: 'botanical',
      description:
        'Cubeb is a vine of the pepper genus, grown mainly on Java and Sumatra for its fruit and for the oil distilled from it. The fruits are picked before they ripen and then dried, and they look much like black peppercorns except that each keeps a short stalk, the reason the spice is also sold as tailed pepper. The wrinkled dried skin ranges from greyish brown to black around a hard, white, oily seed, and the flavour is pungent, bitter and lingering, often compared with allspice. The name came into English from Arabic by way of Old French. Arab trade carried cubeb to Europe through India, and in the Middle Ages it seasoned meat and sauces and was candied whole as a sweet; its use in the kitchen fell away after the king of Portugal banned its sale around 1640 to favour black pepper. Europeans came to think that demons found it repellent, and a seventeenth-century priest writing on exorcism included it in an incense meant to drive away an incubus. From the 1880s it was smoked in medicated cigarettes, and it still flavours at least one gin. In magical practice Cunningham assigns it to Mars and to fire, with the single power of love: the berries are put into love sachets and spells.',
      elements: ['fire'],
      planets: ['Mars'],
      safetyNotes:
        'AHPA places cubeb in safety class 1, herbs that can be safely consumed when used appropriately, but advises caution for anyone with inflamed kidneys, and Cunningham warns against taking the unripe fruit internally with nephritis. In large doses it has occasionally caused nausea and vomiting, burning pain, griping or purging, and some people have developed skin rashes. It contains piperine, which has been shown to increase the absorption of certain drugs. Its safety in pregnancy and while nursing has not been established.',
      folkNames: ['Tailed Pepper', 'Java Pepper'],
      categories: ['Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cubeb; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 662; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-piper-cubeba',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Berry',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cubeb',
              supports: ['form'],
            },
            {
              source: 'wikipedia-piper-cubeba',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Steam distillation draws roughly 15 per cent of a volatile oil from the dried berries. In Victorian and Edwardian England the oil served as an antiseptic, and in 2000 it was named on a published list of ingredients found in cigarettes.',
          references: [
            {
              source: 'wikipedia-piper-cubeba',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cucumber',
      canonicalName: 'Cucumis sativus',
      nomenclature: 'botanical',
      description:
        "The cucumber is a creeping vine of the gourd family, grown as an annual, which roots in the ground and climbs trellises and other supports by thin spiralling tendrils. It bears long, roughly cylindrical fruits, about 95 per cent water, that botanists class as a kind of berry with a rind and cooks treat as a vegetable. Its first home was southern and eastern Asia, from India and Nepal to southern China and northern Thailand, and it was domesticated in India from a wild variety at least three thousand years ago. Pliny reports that the Emperor Tiberius had it at table every day, summer and winter, raised in frames on wheels that could be rolled into the sun; Charlemagne had it grown in his gardens, and the Spanish carried it to the Americas in 1494. Growers now sort it into slicing, pickling and seedless kinds, and gherkins are small cucumbers picked for pickling. Northcote, writing in 1903, records cucumber and cowslip made into a wash to brighten the complexion, and Kynes's herbal still recommends cucumber slices for puffy eyes. Cunningham gives it to the Moon and to water, with the powers of chastity, healing and fertility: eaten, the fruit is said to hinder lust.",
      elements: ['water'],
      planets: ['Moon'],
      safetyNotes: "Cunningham's health code marks cucumber as currently recognised as safe.",
      folkNames: ['Cowcucumber', 'Agurk', 'Haswey', 'Kheyar', 'Lekiti', 'Gurka'],
      categories: ['Healing', 'Fertility'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cucumber; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 167',
          supports: ['description'],
        },
        {
          source: 'kynes-remedies',
          locator: 'p. 66',
          supports: ['description'],
        },
        {
          source: 'wikipedia-cucumber',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cucumber',
              supports: ['form'],
            },
            {
              source: 'wikipedia-cucumber',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Peel',
          description:
            'The rind owes its faintly bitter taste to compounds called cucurbitacins. Cunningham records the peel bound onto the forehead to relieve a headache.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cucumber',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cucumber',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Most cultivars need pollinating to set seed, though some greenhouse kinds fruit without it and are sold as seedless. In Cunningham the seeds are eaten to promote fertility.',
          categories: ['Fertility'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cucumber',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-cucumber',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cumin',
      canonicalName: 'Cuminum cyminum',
      nomenclature: 'botanical',
      description:
        'Cumin is a slender annual of the parsley family, some 30 to 50 centimetres tall, with thread-fine divided leaves and small white or pink flowers held in umbels. What is sold as the seed is a small dried fruit, ridged along its length and yellowish brown, much like caraway, with which it is sometimes confused. It is native to the Irano-Turanian region and has been in use for thousands of years: wild seeds were found at the drowned settlement of Atlit-Yam, Minoan palace tablets record it, and Egyptian healing texts name it. Pliny says Greek and Roman students burned the seeds to help their studies. India now grows about 70 per cent of the world crop. Much of its lore concerns keeping hold of things. In medieval Europe it stood for love and devotion; it was baked into cake to keep a lover faithful, given to a departing lover to bring them safely back, and fed to homing pigeons so they would come back and to farm animals to stop them straying or being stolen. In Germany and Italy it went into bread to stop wood spirits stealing the loaf, and Northcote tells of the German Moss-People, elves who loathe it. Cunningham adds that it is burned with frankincense for protection, scattered with salt to drive out evil, and that the sower must curse while sowing for a good crop.',
      elements: ['fire'],
      planets: ['Mars', 'Venus'],
      zodiacSigns: ['Aries', 'Scorpio', 'Taurus'],
      safetyNotes:
        "AHPA places cumin in safety class 1, herbs that can be safely consumed when used appropriately, and Cunningham's code marks it as currently recognised as safe. AHPA advises caution for anyone with inflamed kidneys or a history of kidney irritation. Allergic reactions to cumin, including anaphylaxis, have been reported. Large doses showed antifertility effects in animal studies, and its safety while nursing has not been established. AHPA notes that these concerns come from the higher doses used therapeutically, not from its use as a spice.",
      folkNames: [
        'Cumino',
        'Cumino Aigro',
        'Sanoot',
        'Kimoon',
        'Green Cumin',
        'Roman Caraway',
        'White Cumin',
      ],
      categories: [
        'Protection',
        'Fidelity',
        'Harmony',
        'Banishing',
        'Knowledge',
        'Love',
        'Purification',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cumin; p. 266',
          supports: [
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Cumin',
          supports: [
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 285–286; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 180',
          supports: ['description'],
        },
        {
          source: 'wikipedia-cumin',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 285',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cumin',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cumin',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil owes its warm aroma chiefly to cuminaldehyde, and it goes into flavourings, perfumes and some cosmetics. Kynes suggests diffusing it to help release negative emotions.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Cumin',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cumin',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Curry Leaf',
      canonicalName: 'Bergera koenigii',
      nomenclature: 'botanical',
      description:
        "Curry leaves come from the curry tree, a small tropical tree of the citrus family, usually four to six metres tall, native to the Indian subcontinent, southern China and mainland South-east Asia. It has been introduced elsewhere in South-east Asia and to Australia, where Queensland counts it as an environmental weed. The fragrant leaves are pinnate, each with eleven to twenty-one small leaflets, and the tree bears small white flowers followed by little glossy black fruits, each holding one large seed. Botanists long called it Murraya koenigii, and some sources still do. The leaves taste mild, aromatic and slightly bitter. They are a mainstay of southern and west-coast Indian cooking, usually fried in oil with mustard seed and onion at the start of a dish, and they also season food in Sri Lanka, Cambodia and Java. Dried leaves keep little of their aroma, so cooks pick them fresh, often minutes before use, and across the Indian subcontinent the tree grows in almost every household. The English word curry comes from the Tamil kari, a spiced sauce. Cunningham, who heads the plant simply as curry and stresses that he means the tree and not the cook's spice blend, gives it to Mars and to fire and to protection: it is burned at nightfall to keep evil influences away.",
      elements: ['fire'],
      planets: ['Mars'],
      folkNames: ['Curry Tree', 'Curry Bush', 'Sweet Neem', 'Curry Leaf Tree'],
      categories: ['Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Curry',
          supports: ['elements', 'planets', 'categories', 'description'],
        },
        {
          source: 'wikipedia-curry-tree',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'wikipedia-curry-tree',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cyclamen',
      canonicalName: 'Cyclamen',
      nomenclature: 'botanical',
      description:
        'Cyclamen is a genus of some twenty-five perennial species in the primrose family, growing wild from Europe and the Mediterranean east to the Caucasus and Iran, with a single outlier in Somalia. Each plant rises from a rounded tuber, which sends up every leaf and every flower on a stalk of its own. The leaves are often marbled in greens and silver, and the nodding flowers sweep their petals back and upward, in white, pink or purple. Several European languages call it by some form of sowbread, after the pigs said to feed on the tubers. Collecting from the wild for the garden trade has badly thinned it in parts of its native range. Greek and Roman physicians used it, midwives turned to it in childbirth, and in the sixteenth century women in early pregnancy kept away from it for fear of miscarriage. Pliny held that cyclamen grown in a garden kept harmful spells from the household, and it was carried as an amulet against poisoned drinks. It has long served as a love charm and aphrodisiac, a little of it slipped into cakes or wine, and medieval Europe linked it with lust and love divination. Cunningham grows it in the bedroom to guard the sleeper and to help conception.',
      elements: ['water'],
      planets: ['Venus', 'Sun'],
      zodiacSigns: ['Leo', 'Libra'],
      safetyNotes:
        'Kynes warns that every part of the plant is toxic if eaten, the roots most of all, and that it may irritate the skin. Cunningham marks it as probably not for internal use in high doses.',
      folkNames: ['Groundbread', 'Sow-Bread', 'Swine Bread'],
      deities: ['Hecate', 'Apollo'],
      categories: [
        'Fertility',
        'Protection',
        'Lust',
        'Confidence',
        'Divination',
        'Love',
        'Nightmare Protection',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cyclamen; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Cyclamen',
          supports: [
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
          source: 'wikipedia-cyclamen',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The part sold as the root is botanically a tuber, a round storage organ from which the leaves, flowers and true roots all grow. Kynes names it the most poisonous part of the plant, and it is what pigs were given to eat, hence the name sowbread.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Cyclamen',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cyclamen',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Cunningham uses the blossoms to ease grief of the heart. Kynes brings cyclamen into a handfasting for love and happiness, and scatters a few petals on the table at anniversary dinners to keep the spark alive.',
          colors: ['white', 'pink', 'purple', 'red'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cyclamen',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cyclamen',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-cyclamen',
              supports: ['colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cypress',
      canonicalName: 'Cupressus sempervirens',
      nomenclature: 'botanical',
      description:
        "The Mediterranean or Italian cypress is a long-lived conifer native to the eastern Mediterranean and Iran, grown as an ornamental for thousands of years well outside that range, wherever summers run hot and dry. It can reach thirty-five metres, though most planted trees are slender upright cultivars whose dark columns mark the Mediterranean landscape. Its foliage is made of tiny scale-like leaves, its knobbly cones turn from green to brown over about two years, and some trees are thought to be more than a thousand years old. Few trees carry so much of death. Classical antiquity made it a sign of mourning: grieving Athenian households hung its boughs, it sweetened the air at cremations, and Ovid tells how Apollo's favourite Cyparissus, after killing a beloved stag, was turned into a cypress so that he might grieve forever. It remains the chief cemetery tree of Europe and the Muslim world. As an evergreen it also stood for immortality and long life. Iran held it sacred and linked it with Zoroaster, and Jewish tradition makes it the timber of Noah's ark. Kynes records cypress garlands laid on medieval coffins and a pair of trees planted as guardians of a home. Cunningham carries the wood to lengthen life, wears it at funerals to ease grief, and cuts a healing wand from a branch.",
      elements: ['earth', 'water'],
      planets: ['Saturn', 'Pluto'],
      zodiacSigns: ['Aquarius', 'Capricorn', 'Pisces', 'Taurus', 'Virgo'],
      safetyNotes:
        'Cunningham gives it a health code: not to be taken internally during pregnancy.',
      folkNames: [
        'Tree of Death',
        'Graveyard Cypress',
        'Italian Cypress',
        'Mediterranean Cypress',
        'Tuscan Cypress',
        'Persian Cypress',
      ],
      deities: [
        'Pluto',
        'Aphrodite',
        'Artemis',
        'Apollo',
        'Cupid',
        'Jupiter',
        'Astarte',
        'Diana',
        'Hades',
        'Hecate',
        'Saturn',
        'Silvanus',
      ],
      categories: [
        'Longevity',
        'Healing',
        'Protection',
        'Clarity',
        'Divination',
        'Justice',
        'Legal Matters',
        'Knowledge',
        'Peace',
        'Prosperity',
        'Strength',
        'Transformation',
        'Ancestor Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cypress; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Cypress',
          supports: [
            'canonicalName',
            'nomenclature',
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
          source: 'wikipedia-cupressus-sempervirens',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'deities', 'description'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'Cunningham carries the wood for long life, cuts a branch slowly over three months to make a healing wand, and tells of a cypress mallet once used to find thieves. Kynes burns a small piece to ground surplus energy after ritual. It is the traditional wood of Italian harpsichords.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cypress',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cypress',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cupressus-sempervirens',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Kynes diffuses a little of the essential oil for comfort and healing in times of death and loss, and uses its scent to support past-life work.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Cypress',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Daffodil',
      canonicalName: 'Narcissus',
      nomenclature: 'botanical',
      description:
        "Narcissus, the daffodil, is a genus of spring-flowering bulbs in the amaryllis family. The wild species belong to the meadows and woods of southern Europe and North Africa, above all the Iberian Peninsula, though wild and garden plants alike have naturalised far afield. A brown-skinned bulb sends up narrow, strap-like leaves and a hollow, leafless stem, usually crowned by a single white or yellow flower: six tepals around a cup or trumpet called the corona. Breeders have raised thousands of cultivars, and the daffodil is the national flower of Wales. Its English name grew out of asphodel. Greek myth tied it to the underworld: Persephone was reaching for a narcissus when Hades seized her, the flower was held sacred to both, and Homer's Elysian meadows were thought to be carpeted with it. Greeks planted narcissi near tombs and Egyptians wove them into funeral wreaths, yet the flower also heralds spring, Lent and Easter. Kynes records that in medieval Britain the first daffodil of the year brought luck while one drooping towards a person foretold a death, and that a patch growing wild was taken to mark an old sacred site. Cunningham lays the flower on the altar in love spells, keeps fresh blooms in the bedroom for fertility, and wears one over the heart for luck.",
      elements: ['water'],
      planets: ['Venus', 'Sun'],
      zodiacSigns: ['Leo', 'Sagittarius'],
      safetyNotes:
        'Cunningham marks the daffodil as poison, and Kynes warns that every part is toxic if eaten, the bulb most of all. Every Narcissus species contains the alkaloid lycorine. Handling the plants commonly causes "daffodil itch", a dry, cracked, scaling and reddened rash on the hands of flower pickers, florists and gardeners, blamed on substances in the sap.',
      folkNames: [
        'Asphodel',
        'Daffy-Down-Dilly',
        'Fleur de Coucou',
        'Goose Leek',
        'Lent Lily',
        'Narcissus',
        'Porillon',
        'Daff-a-Down-Dilly',
        'Gold Bells',
        'Daffadown Dilly',
        'Lenten Lily',
      ],
      deities: ['Bacchus', 'Ceres', 'Demeter', 'Dionysus', 'Hades', 'Persephone'],
      categories: ['Love', 'Fertility', 'Clarity', 'Peace', 'Protection', 'Nightmare Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Daffodil',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Daffodil',
          supports: [
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
          source: 'wikipedia-narcissus-plant',
          supports: [
            'canonicalName',
            'nomenclature',
            'folkNames',
            'deities',
            'safetyNotes',
            'description',
          ],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'Cunningham places the flower on the altar or carries it in love spells. Kynes dips a daffodil in a bowl of water and sprinkles it around the outside of a home to clear negative energy, and sets it on the Ostara altar for renewal.',
          colors: ['yellow', 'white'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Daffodil',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Daffodil',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-narcissus-plant',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Bulb',
          description:
            'In Germany a daffodil bulb wrapped in cloth and worn beneath the clothes was believed to rid a person of evil spirits.',
          safetyNotes:
            "The bulb holds most of the plant's lycorine. Many poisonings, some fatal, have followed bulbs cooked and eaten in mistake for leeks or onions. Bulb extract getting into a wound can cause nervous-system and heart symptoms.",
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Daffodil',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-narcissus-plant',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Daisy',
      canonicalName: 'Bellis perennis',
      nomenclature: 'botanical',
      description:
        "The common or English daisy is a small perennial of the aster family, native to western, central and northern Europe and now naturalised through much of the temperate world, the Americas and Australasia included. Its rounded, spoon-shaped leaves lie flat in rosettes, and from March to September single leafless stalks carry flower heads two or three centimetres wide: a ring of white rays, often tipped with red, around a yellow centre. The heads shut at night and open again in the morning, which gave the plant its name, a worn-down form of \"day's eye\"; Chaucer called it the eye of the day. It spreads through lawns so freely that mowing rarely clears it. Its young leaves, buds and petals have been eaten, it has a place in herbal medicine, and it was long known as bruisewort. Children have threaded daisy chains for generations, and in parts of Britain a chain was hung about a child's neck to keep the fairies from carrying it off, or elsewhere to win their blessing. In England, France and Belgium the petals were pulled one at a time to divine the course of a love affair. Women slept with a daisy root under the pillow to dream of love, and Cunningham says the same root can bring an absent lover home. In Bavaria, daisies picked around noon on Midsummer's Day were wrapped in paper and carried as protection on journeys.",
      elements: ['water'],
      planets: ['Venus', 'Sun'],
      zodiacSigns: ['Cancer', 'Taurus'],
      safetyNotes:
        'Cunningham marks the daisy as poison. His entry covers both the European daisy and the American ox-eye daisy.',
      folkNames: [
        'Bairnwort',
        'Bruisewort',
        'Eyes',
        'Field Daisy',
        'Maudlinwort',
        'Common Daisy',
        'English Daisy',
        "Day's Eye",
        'Wild Daisy',
        'Lawn Daisy',
        "Mary's Rose",
        'Bone Flower',
      ],
      deities: ['Freya', 'Artemis', 'Thor', 'Aphrodite', 'Venus', 'Zeus'],
      categories: [
        'Lust',
        'Love',
        'Creativity',
        'Divination',
        'Dream Work',
        'Fertility',
        'Healing',
        'Fidelity',
        'Protection',
        'Strength',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Daisy',
          supports: [
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Daisy',
          supports: [
            'canonicalName',
            'nomenclature',
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
          source: 'wikipedia-bellis-perennis',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            "Worn, the daisy draws love, Cunningham says. Kynes tucks a few flowers under the pillow to strengthen dreams and help in reading their messages, and hangs a small daisy chain over a child's bed to ask the fairies' blessing.",
          colors: ['white', 'yellow'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Daisy',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Daisy',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-bellis-perennis',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            'A daisy root slept on beneath the pillow was an English charm for dreaming of love, and Cunningham uses it the same way to bring an absent lover back.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Daisy',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Daisy',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Damiana',
      canonicalName: 'Turnera diffusa',
      nomenclature: 'botanical',
      description:
        "Damiana is a small, woody shrub of the passionflower family, native from southern Texas through Mexico and Central America to South America and the Caribbean. Kynes gives it a height of up to six feet, with lance-shaped, coarsely toothed and deeply veined leaves and, at the tips of the branches, yellow flowers of five rounded petals. The true plant's leaves are small, greyish green and strongly aromatic when crushed, and its summer flowers are followed by fruits said to taste of figs. Much of the seed and many of the plants sold as damiana in the garden trade turn out to be a close relative, false damiana, though most herbal products are the genuine article. The Aztec, the Maya and other Indigenous peoples of Mesoamerica used it as medicine and as an aphrodisiac, and the Guaycura of the Baja California peninsula made a ceremonial liquor from it. Its modern descendant, damiana liqueur, comes in a bottle shaped like a seated woman, and Mexican folklore claims it went into the very first margarita. In the nineteenth century it was an ingredient of patent medicines such as Pemberton's French Wine Coca. In hoodoo it is dedicated to Erzulie and used for love, luck and sex magic. Cunningham steeps it in lust infusions and burns it to bring on visions.",
      elements: ['fire'],
      planets: ['Mars'],
      safetyNotes:
        'AHPA places damiana leaf in safety class 1, herbs that can be safely consumed when used appropriately. It contains cyanogenic glycosides. No information on its safety in pregnancy or while nursing was found, so safety then has not been established, and Kynes says it should not be taken during pregnancy or while nursing. AHPA records one case, with few details, of convulsions and sudden outbursts in a person with a history of alcohol abuse after drinking 8 oz of damiana extract. Cunningham codes it as currently recognised as safe.',
      folkNames: ['Mexican Damiana', 'Mexican Holly', "Old Woman's Broom"],
      deities: ['Erzulie', 'Pachamama'],
      categories: ['Lust', 'Love', 'Psychic Work'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Damiana; p. 266',
          supports: [
            'elements',
            'planets',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Damiana',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 885–886; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-turnera-diffusa',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The cut, dried leaves are the part sold. Kynes sprinkles a handful across the altar or table during psychic work to strengthen the abilities.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 885',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Damiana',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Spirit',
          description:
            'Damiana liqueur, descended from a ceremonial liquor of the Guaycura, is a traditional Mexican drink, sometimes used instead of triple sec in margaritas. Kynes shares it with a lover to heighten pleasure.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Damiana',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-turnera-diffusa',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dandelion',
      canonicalName: 'Taraxacum officinale',
      nomenclature: 'botanical',
      description:
        'The common dandelion is a hardy perennial of the daisy family, native to Europe and Asia and first carried to America as a food crop; it is now naturalised across North America, southern Africa, South America, Australia, New Zealand and India. A long taproot sends up a rosette of jagged, deeply toothed leaves and hollow, leafless stalks, each bearing one yellow flower head that ripens into a round ball of seeds on silky white parachutes, the "clock" that children puff away. The whole plant runs with a milky latex. Its name is the French for lion\'s tooth, after the leaves, while the French pissenlit and the English piss-a-bed point to its long use as a diuretic. Cursed as a lawn weed, it is also an early source of pollen for insects. The leaves are eaten as greens, the flowers make wine, jam and a honey-like syrup, and the roasted root has stood in for coffee; Northcote tells of Minorcans who lived on the root after locusts ate their harvest. Blowing the seed head is an old way of reading fate: Cunningham counts the seeds that remain to learn the hour or the years left in a life, and in the British Isles a wish made as the seeds flew was expected to come true. Kynes adds that in parts of England the drifting seeds were called fairies, and that dandelions gathered on Midsummer\'s Eve kept witches away.',
      elements: ['air'],
      planets: ['Jupiter', 'Mercury'],
      zodiacSigns: ['Aquarius', 'Aries', 'Libra', 'Taurus'],
      safetyNotes:
        'AHPA places dandelion leaf and root in safety class 1, herbs that can be safely consumed when used appropriately, and lists it as a diuretic. Because dandelion promotes the flow of bile, caution has been suggested for people with gallstones. Kynes advises avoiding it during pregnancy and breastfeeding, with gallbladder problems and during antibiotic treatment, and warns that the white latex throughout the plant may cause a reaction in people allergic to the daisy family.',
      folkNames: [
        'Blowball',
        'Cankerwort',
        "Lion's Tooth",
        'Piss-a-Bed',
        "Priest's Crown",
        'Puffball',
        'Swine Snout',
        'White Endive',
        'Wild Endive',
        'Common Dandelion',
        "Devil's Milk-Pale",
        'Fairy Clocks',
        'Golden Sun',
        'Wishes',
        'Witch-Gowan',
        'Bitterwort',
        'Milk-Witch',
        'Yellow-Gowan',
        'Irish Daisy',
        'Monks-Head',
        'Faceclock',
        'Pee-a-Bed',
        'Wet-a-Bed',
        'Heart-Fever-Grass',
      ],
      deities: ['Hecate', 'Brigid'],
      categories: [
        'Divination',
        'Psychic Work',
        'Harmony',
        'Clarity',
        'Communication',
        'Healing',
        'Love',
        'Prophecy',
        'Protection',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dandelion',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 's.v. Dandelion',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 'pp. 854–855; p. xxii; p. 975',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 230–231',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 22–23',
          supports: ['folkNames', 'description'],
        },
        {
          source: 'wikipedia-taraxacum-officinale',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'Cunningham dries, roasts and grinds the root like coffee for a tea that promotes psychic powers, and sets the steaming cup beside the bed to call spirits. Kynes dries the root of a small plant and burns it in honour of Hecate, or carries it as an amulet. Roasted and ground, it has long served as a coffee substitute.',
          safetyNotes:
            'Cunningham\'s health codes say the root should not be taken internally by anyone with blocked bile ducts or blocked intestines, and mark it as a "Gi irritant".',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dandelion; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dandelion',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 854',
              supports: ['form'],
            },
            {
              source: 'northcote-herbs',
              locator: 'p. 23',
              supports: ['description'],
            },
            {
              source: 'wikipedia-taraxacum-officinale',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves are eaten as greens, raw while young and cooked when older, and were once boiled with lentils as a pot-herb. In France a leaf placed under the pillow was said to bring dreams of a future husband.',
          safetyNotes:
            'Contact dermatitis from the fresh leaf has been reported and confirmed by patch testing, put down to its sesquiterpene lactones.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 854–855',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dandelion',
              supports: ['form', 'description'],
            },
            {
              source: 'northcote-herbs',
              locator: 'p. 22',
              supports: ['description'],
            },
            {
              source: 'wikipedia-taraxacum-officinale',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The flowers are made into dandelion wine and jam, and in Silesia and elsewhere in Poland into a honey-like syrup called May-honey. They also yield a yellow dye.',
          colors: ['yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dandelion',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-taraxacum-officinale',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The seed head is for wishes and messages. Cunningham blows the seeds towards a loved one while picturing the message, and Kynes picks a seed head on a moonlit night so the moon will aid the wish; a single drifting seed was caught, wished upon and let go.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dandelion',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dandelion',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Date Palm',
      canonicalName: 'Phoenix dactylifera',
      nomenclature: 'botanical',
      description:
        'The date palm is a palm of the family Arecaceae, native to the lands from the Gulf States and Iraq to Pakistan and India, and it can reach about 30 metres. Its trunk keeps the scars of old leaf stalks, the fronds of its crown can grow to sixteen feet, and male and female flowers grow on separate trees, so orchard growers pollinate the female trees by hand. A single cluster can carry more than a thousand oval fruits, red to yellow when ripe, each around a single stone. It has been grown for its fruit for thousands of years, with early evidence from Neolithic Mehrgarh in Pakistan and from eastern Arabia. Its leaves make huts, mats and baskets, the fronds borne in Roman triumphs were most likely its own, and it is one of the Seven Species of Jewish tradition, its closed frond waved at Sukkot as the lulav; dates traditionally break the Ramadan fast. Linnaeus named the genus Phoenix because the palm stood for life and rebirth. The Greeks and Romans planted it around temples and shrines, the Assyrians used date wine in rites of prophecy, and the fruit was thought an aphrodisiac. Cunningham calls it a celebrated fertility tree for the sheer quantity of fruit it bears: dates are eaten to increase fertility, and a palm growing in a place is said to shield it from bad weather.',
      elements: ['air', 'fire'],
      planets: ['Sun', 'Jupiter', 'Mars', 'Moon'],
      zodiacSigns: ['Leo', 'Sagittarius', 'Scorpio'],
      safetyNotes: "Cunningham's health code marks the date palm as currently recognised as safe.",
      folkNames: ['Common Date Palm'],
      deities: [
        'Apollo',
        'Artemis',
        'Hecate',
        'Isis',
        'Ra',
        'Amun',
        'Aphrodite',
        'Asherah',
        'Astarte',
        'Diana',
        'Helios',
        'Hermes',
        'Inanna',
        'Mercury',
      ],
      categories: [
        'Fertility',
        'Abundance',
        'Banishing',
        'Courage',
        'Healing',
        'Love',
        'Prophecy',
        'Protection',
        'Success',
        'Transformation',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Palm, Date; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 's.v. Date',
          supports: [
            'canonicalName',
            'nomenclature',
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
          source: 'wikipedia-date-palm',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Date',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Palm, Date',
              supports: ['form'],
            },
            {
              source: 'wikipedia-date-palm',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Cunningham has pieces of palm leaf worn or carried for fertility, and a leaf kept near the door of a house to stop evil and uncanny creatures coming in. Kynes records a Sicilian belief that three palm leaves and the right incantation would keep witches away. Date palm leaves are carried on Palm Sunday.',
          categories: ['Fertility'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Palm, Date',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Date',
              supports: ['description'],
            },
            {
              source: 'wikipedia-date-palm',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Each date holds one stone, about two to two and a half centimetres long. In medieval Europe a polished date stone was worn as an amulet against spells; Cunningham has men carry the pits to regain their potency, and Kynes carries a dried stone to bolster courage, for luck at an interview and for success at work. Ground, the stones have been used like coffee.',
          categories: ['Courage', 'Success'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Date',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Palm, Date',
              supports: ['description'],
            },
            {
              source: 'wikipedia-date-palm',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: "Deer's Tongue",
      canonicalName: 'Carphephorus odoratissimus',
      nomenclature: 'botanical',
      description:
        "Deer's tongue is a perennial composite of North America, standing three to five feet tall on purplish-brown stems that branch towards the top. Its basal leaves are fleshy, smooth and shaped like a spatula or a tongue, while those higher on the stem are oval and clasp it at the base, and small clusters of purple flowers open on the branching stems. Bruised, the plant smells of vanilla, which accounts for its folk names vanilla leaf and wild vanilla; Grieve put the scent down largely to coumarin, which can be seen as crystals on the upper face of the leaves. Grieve also notes that it was grown in England and that the leaves were used to flavour tobacco. The Cherokee, Creek and Choctaw used it in just that way, adding it to tobacco or using it to soften the harshness of smoking mixtures, and the Cherokee also used it to clear the mind and to keep evil spirits away. In magic, Cunningham and Kynes both give it to Mars and to fire. Cunningham makes it a herb of lust and psychic power: worn, carried or sprinkled on the bed it attracts men, and worn it aids the psychic powers. Kynes adds love and protection, and scatters the dried leaves on an altar or table to strengthen any kind of psychic work.",
      elements: ['fire'],
      planets: ['Mars'],
      zodiacSigns: ['Aries', 'Sagittarius', 'Scorpio'],
      safetyNotes:
        "Kynes cautions that deer's tongue may cause liver damage if swallowed, and Cunningham's health code marks it as not recommended for internal use.",
      folkNames: ['Vanilla Leaf', 'Wild Vanilla', "Hound's Tongue", 'Dog-Tongue'],
      categories: ['Lust', 'Psychic Work', 'Love', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Deerstongue; p. 266',
          supports: [
            'elements',
            'planets',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: "s.v. Deer's Tongue",
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'grieve-deer-s-tongue',
          supports: ['folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'grieve-deer-s-tongue',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: "s.v. Deer's Tongue",
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Kynes puts the seeds into a sachet as a love charm, or scatters them under the bed to heighten sex and passion.',
          categories: ['Love'],
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Deer's Tongue",
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
  ],
};
