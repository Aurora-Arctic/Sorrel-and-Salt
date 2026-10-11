import type { SeedCompendiumShard } from '../types';

// MB.242's pilot: fourteen entries of the candidate list, one of each kind,
// researched to the full rule so the shape, the guard and the CI path are
// proven on real data before the six content lanes (MB.243–MB.248) depend on
// them. Every value traces to a source a citation names; the sources, the
// time each entry took and what was left out are recorded in
// claude-docs/db/compendium-seed/pilot.md. Descriptions are written fresh
// from the sources, never copied.
export const PILOT: SeedCompendiumShard = {
  name: 'pilot',
  sources: {
    'wikipedia-achillea-millefolium': {
      kind: 'entry',
      title: 'Achillea millefolium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Achillea_millefolium&oldid=1377049458',
      accessed: '2026-10-11',
    },
    'wikipedia-amethyst': {
      kind: 'entry',
      title: 'Amethyst',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Amethyst&oldid=1377864997',
      accessed: '2026-10-11',
    },
    'wikipedia-artemisia-vulgaris': {
      kind: 'entry',
      title: 'Artemisia vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Artemisia_vulgaris&oldid=1349822848',
      accessed: '2026-10-11',
    },
    'wikipedia-beeswax': {
      kind: 'entry',
      title: 'Beeswax',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Beeswax&oldid=1361983052',
      accessed: '2026-10-11',
    },
    'wikipedia-boswellia-sacra': {
      kind: 'entry',
      title: 'Boswellia sacra',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Boswellia_sacra&oldid=1362797773',
      accessed: '2026-10-11',
    },
    'wikipedia-cinnamomum-verum': {
      kind: 'entry',
      title: 'Cinnamomum verum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cinnamomum_verum&oldid=1368745785',
      accessed: '2026-10-11',
    },
    'wikipedia-florida-water': {
      kind: 'entry',
      title: 'Florida Water',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Florida_Water&oldid=1349984253',
      accessed: '2026-10-11',
    },
    'wikipedia-frankincense': {
      kind: 'entry',
      title: 'Frankincense',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Frankincense&oldid=1375501301',
      accessed: '2026-10-11',
    },
    'wikipedia-fucus-vesiculosus': {
      kind: 'entry',
      title: 'Fucus vesiculosus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fucus_vesiculosus&oldid=1377158692',
      accessed: '2026-10-11',
    },
    'wikipedia-goofer-dust': {
      kind: 'entry',
      title: 'Goofer dust',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Goofer_dust&oldid=1367193680',
      accessed: '2026-10-11',
    },
    'wikipedia-hematite': {
      kind: 'entry',
      title: 'Hematite',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hematite&oldid=1371461042',
      accessed: '2026-10-11',
    },
    'wikipedia-honey': {
      kind: 'entry',
      title: 'Honey',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Honey&oldid=1378877316',
      accessed: '2026-10-11',
    },
    'wikipedia-hoodoo-spirituality': {
      kind: 'entry',
      title: 'Hoodoo (spirituality)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hoodoo_(spirituality)&oldid=1378667712',
      accessed: '2026-10-11',
    },
    'wikipedia-iron': {
      kind: 'entry',
      title: 'Iron',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Iron&oldid=1379385470',
      accessed: '2026-10-11',
    },
    'wikipedia-nolina-lindheimeriana': {
      kind: 'entry',
      title: 'Nolina lindheimeriana',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Nolina_lindheimeriana&oldid=1368167260',
      accessed: '2026-10-11',
    },
    'wikipedia-salt': {
      kind: 'entry',
      title: 'Salt',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Salt&oldid=1379334677',
      accessed: '2026-10-11',
    },
    'wikipedia-santalum-album': {
      kind: 'entry',
      title: 'Santalum album',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Santalum_album&oldid=1365075216',
      accessed: '2026-10-11',
    },
    'wikipedia-sodium-chloride': {
      kind: 'entry',
      title: 'Sodium chloride',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sodium_chloride&oldid=1373528437',
      accessed: '2026-10-11',
    },
    'wikipedia-usnea': {
      kind: 'entry',
      title: 'Usnea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Usnea&oldid=1373923575',
      accessed: '2026-10-11',
    },
    'wikipedia-viburnum-lantanoides': {
      kind: 'entry',
      title: 'Viburnum lantanoides',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Viburnum_lantanoides&oldid=1363375344',
      accessed: '2026-10-11',
    },
    'wikipedia-western-honey-bee': {
      kind: 'entry',
      title: 'Western honey bee',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Western_honey_bee&oldid=1378342627',
      accessed: '2026-10-11',
    },
    'wikipedia-witch-bottle': {
      kind: 'entry',
      title: 'Witch bottle',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Witch_bottle&oldid=1368142800',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Mugwort',
      canonicalName: 'Artemisia vulgaris',
      nomenclature: 'botanical',
      description:
        'Mugwort is an aromatic perennial that can reach about one and a half metres, with angular, purplish stems and deeply cut leaves that are dark green above and pale and woolly beneath. Small yellowish or reddish flower heads open from midsummer into early autumn. It is native to temperate Europe, Asia, North Africa and Alaska, has naturalised in North America, where some treat it as an invasive weed, and spreads chiefly through its creeping rhizomes. Before hops were adopted, it flavoured English beer and gruit ales, and it is still a cooking herb in Germany. Older writers credited it with keeping the traveller safe from fatigue, sunstroke and wild beasts, and traced the name of its genus to Artemis. In several European countries it was hung from the rafters against witches, lightning and plague, and at Midsummer it was worn, hung up or thrown on the bonfire for protection. In magical practice it belongs to dreams and seeing: it is stuffed into pillows for prophetic dreams, burned during scrying, drunk as a honeyed infusion before divination, and used to wash crystal balls and magic mirrors.',
      elements: ['earth', 'air', 'water'],
      planets: ['Venus', 'Moon', 'Neptune'],
      zodiacSigns: ['Cancer', 'Gemini', 'Libra', 'Sagittarius', 'Taurus'],
      safetyNotes:
        'Not for use in pregnancy except under the supervision of a qualified healthcare practitioner: it has been reported as an abortifacient and is classed as an emmenagogue (AHPA safety class 2b). Its safety while nursing has not been established. Mugwort is a relatively common cause of contact dermatitis, and allergic reactions have been reported, including cross-reactivity in people allergic to pine nut or lettuce. It can be toxic if swallowed in large quantities.',
      folkNames: [
        'Artemis Herb',
        'Artemisia',
        'Felon Herb',
        'Muggons',
        'Naughty Man',
        'Old Man',
        'Old Uncle Henry',
        "Sailor's Tobacco",
        "St. John's Plant",
        'Common Wormwood',
        'Motherwort',
        'Muggert',
        'Silver Leaf',
        'Wild Wormwood',
      ],
      deities: ['Artemis', 'Diana', 'Hecate', 'Isis', 'Thor'],
      categories: [
        'Strength',
        'Psychic Work',
        'Protection',
        'Healing',
        'Lust',
        'Fertility',
        'Banishing',
        'Divination',
        'Dream Work',
        'Love',
        'Peace',
        'Purification',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Mugwort; p. 266',
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
          locator: 's.v. Mugwort',
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
          source: 'ahpa-safety',
          locator: 'pp. 97–98; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 138–139',
          supports: ['deities', 'description'],
        },
        {
          source: 'wikipedia-artemisia-vulgaris',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 97',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Mugwort',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          safetyNotes:
            'One analysis found thujone to be about 64% of mugwort essential oil. Thujone is neurotoxic in high doses and can cause convulsions, and many countries ban it in isolated form as a food additive.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Mugwort',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 98; p. 967',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Yarrow',
      canonicalName: 'Achillea millefolium',
      nomenclature: 'botanical',
      description:
        "Yarrow is an upright perennial native to the temperate Northern Hemisphere, across Europe, Asia and North America, growing from about twenty centimetres to a metre tall and spreading by rhizomes. Its feathery leaves are divided so finely that they gave the plant the names milfoil and thousand leaf, and its tiny white to pink flowers gather in flat-topped clusters from spring into autumn. It carries a spicy scent that lasts after drying. The genus takes its name from Achilles, who in legend treated his soldiers' wounds with it, and many old names, such as soldier's woundwort and knight's milfoil, recall its use in stanching blood. Linnaeus recorded that the people of Dalecarlia in Sweden steeped it in beer, and its flowers and leaves still go into some liqueurs and bitters. In China its dried stalks are cast for I Ching divination. Across the British Isles it was used to divine a future sweetheart, often slept on under the pillow, and at Midsummer it was hung over doors and cradles, strewn on thresholds against witches and kept against the evil eye. In magical practice it is worn for protection, held to dispel fear, hung over the marriage bed to keep love lasting, and drunk as a flower tea to sharpen psychic powers.",
      elements: ['water', 'air'],
      planets: ['Venus'],
      zodiacSigns: ['Cancer', 'Gemini', 'Libra'],
      safetyNotes:
        'Considered safe to take when used appropriately (AHPA safety class 1). People allergic to other daisy-family plants, such as feverfew, chamomile or echinacea, should take care, because cross-reactions are common, and contact allergy and skin rashes from yarrow have been reported. Safety in pregnancy and while nursing is not established; one animal study at high doses showed lower fetal weight, and a herbal source advises against taking it internally when pregnant. It is reported to be toxic to dogs, cats and horses, and it can be mistaken for the deadly hemlock.',
      folkNames: [
        'Achillea',
        "Bad Man's Plaything",
        "Carpenter's Weed",
        'Death Flower',
        "Devil's Nettle",
        'Eerie',
        'Field Hops',
        'Gearwe',
        'Hundred Leaved Grass',
        "Knight's Milfoil",
        'Knyghten',
        "Lady's Mantle",
        'Milfoil',
        'Militaris',
        'Military Herb',
        'Millefolium',
        'Noble Yarrow',
        'Nosebleed',
        "Old Man's Mustard",
        "Old Man's Pepper",
        'Sanguinary',
        "Seven Year's Love",
        "Snake's Grass",
        "Soldier's Woundwort",
        'Stanch Griss',
        'Stanch Weed',
        'Tansy',
        'Thousand Seal',
        'Wound Wort',
        'Yarroway',
        'Yerw',
        'Common Yarrow',
        'Angel Flower',
        'Bloodwort',
        "Devil's Plaything",
        'Dog Daisy',
        'Thousand Leaf',
        'Woundwort',
      ],
      deities: ['Cernunnos'],
      categories: [
        'Courage',
        'Love',
        'Psychic Work',
        'Protection',
        'Banishing',
        'Divination',
        'Dream Work',
        'Healing',
        'Intuition',
        'Fidelity',
        'Prophecy',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Yarrow; p. 266',
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
          locator: 's.v. Yarrow',
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
          locator: 'pp. 2–3; p. xxii',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-achillea-millefolium',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 2',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Yarrow',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          safetyNotes:
            'Yarrow essential oil has been measured at up to about 27% alpha-thujone and 11% beta-thujone, varying widely from plant to plant. Thujone is neurotoxic in high doses and can cause convulsions. The dried herb itself holds only traces.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Yarrow',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 967; p. 2',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Cinnamon',
      canonicalName: 'Cinnamomum verum',
      nomenclature: 'botanical',
      description:
        "True or Ceylon cinnamon is a small evergreen tree of the laurel family, native to Sri Lanka, which still grows most of the world's supply; it is also farmed in the Seychelles, Madagascar and Tanzania, and at low altitudes on Borneo. Left to grow, it reaches ten to fifteen metres, with oval to oblong leaves, scented greenish flowers in loose sprays and a small purple fruit holding one seed. The spice is the dried inner bark, a name long shared with the related cassia, and cinnamon has a long history in traditional medicine as an aid to digestion. It is among the oldest spices in trade, carried by Phoenician and Arab merchants to Egypt, Greece and Rome. The Egyptians used it in embalming, Roman temples were hung with wreaths of its leaves, and Greek legend had the phoenix build its nest from cinnamon twigs; in medieval Europe it was a favourite for spicing wine. In magical practice it is burned as an incense to raise spiritual vibrations, help healing, draw money, stir psychic powers and lay down protection, and it goes into sachets and infusions for the same purposes.",
      elements: ['fire'],
      planets: ['Sun', 'Jupiter', 'Mercury'],
      zodiacSigns: ['Aries', 'Capricorn', 'Leo'],
      safetyNotes:
        'Not for use in pregnancy except under the supervision of a qualified healthcare practitioner (AHPA safety class 2b); safety while nursing is not established. These cautions concern the larger doses taken as medicine, not ordinary amounts in cooking. Allergic and sensitisation reactions affecting the skin and the lining of the mouth are relatively common, and people sensitive to balsam of Peru should take care. It may alter blood sugar, so people with diabetes should monitor it and consult a practitioner first. In overdose it can over-stimulate the nervous system, raising heart rate and breathing, sometimes followed by drowsiness. Avoid more than normal food amounts and long-term internal use.',
      folkNames: ['Sweet Wood', 'Ceylon Cinnamon', 'True Cinnamon'],
      deities: [
        'Venus',
        'Aphrodite',
        'Apollo',
        'Asclepius',
        'Dionysus',
        'Helios',
        'Horus',
        'Jupiter',
        'Mercury',
        'Ra',
      ],
      categories: [
        'Success',
        'Healing',
        'Psychic Work',
        'Lust',
        'Protection',
        'Love',
        'Prosperity',
        'Purification',
        'Strength',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Cinnamon; p. 266',
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
          locator: 's.v. Cinnamon',
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
          source: 'ahpa-safety',
          locator: 'pp. 215–216; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-cinnamomum-verum',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Bark',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 215',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cinnamon',
              supports: ['form'],
            },
            {
              source: 'wikipedia-cinnamomum-verum',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            "Cinnamon oil carries a ritual history of its own. Cunningham records that the ancient Hebrews counted it in a holy anointing oil and that the Egyptians used it in mummification, and Kynes notes that on Rhodes it was used to anoint a bride's hands at her wedding. Today it is used to dress candles for awareness and psychic sight.",
          safetyNotes:
            'Cinnamaldehyde makes up roughly 55–75% of the essential oil and can sensitise and irritate the skin. Prolonged skin contact with spilled oil has caused burns; sucking items dipped in it has caused burning in the mouth and stomach pain; and a child who swallowed a large amount suffered vomiting and loss of consciousness. Mice fed the oil showed fewer embryos.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Cinnamon',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Cinnamon',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 216–217',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bladderwrack',
      canonicalName: 'Fucus vesiculosus',
      nomenclature: 'botanical',
      description:
        'Bladderwrack is a brown seaweed of the North Sea, the western Baltic and the Atlantic coasts of Europe and North America. It is common around the British Isles and thrives on sheltered rocky shores between the tides. Its flat, forking fronds reach about a metre and a half, run with a strong midrib and cling to the rock by a disc-shaped holdfast; the almost round air bladders that name it usually sit in pairs either side of the midrib, and are often missing on shores battered by waves. Iodine was first obtained from it when the element was discovered in 1811, and it was long used against goitre. It can be cooked and eaten and is sold as a supplement. In Ireland and Scotland it fertilised the fields and fed cattle through the winter, and Hebridean islanders once poured ale into the sea at Samhain, asking the sea god Shony for a good harvest of weed; strands of seaweed were hung up to forecast the weather. In magical practice, seaweeds are carried to keep travellers safe at sea or flying over it, cast onto the waves to call the sea spirits, and steeped to wash the floors and doors of a shop to bring in custom, while bladderwrack goes into sachets to strengthen psychic powers.',
      elements: ['water'],
      planets: ['Moon', 'Neptune'],
      zodiacSigns: ['Cancer', 'Pisces'],
      safetyNotes:
        'Not for anyone with an overactive thyroid, and anyone taking thyroid medication should use it only under a qualified practitioner (AHPA safety class 2d). It contains iodine; long-term, uncontrolled use has been linked with thyroid over-activity, too much iodine can cause goitre, and infants are especially sensitive, with goitre reported in babies whose mothers took iodine while pregnant or nursing. Seaweeds can carry heavy metals, including arsenic, so caution is advised in pregnancy and for young children, and kidney damage has been reported from an arsenic-contaminated supplement. Take other medicines an hour before it or several hours after, as it may slow their absorption. It may reduce platelet activity and strengthen the effect of warfarin, so avoid it before surgery, and some people react to its iodine. A herbal source also advises against taking it internally when pregnant or nursing.',
      folkNames: [
        'Bladder Fucus',
        'Cutweed',
        'Kelp',
        'Sea Spirit',
        'Seawrack',
        'Seetang',
        'Meeriche',
        'Sea Oak',
        'Black Tang',
        'Lady Wrack',
        'Rockweed',
        "Dyer's Fucus",
        'Red Fucus',
        'Rockwrack',
        'Sea Grapes',
      ],
      deities: ['Neptune', 'Poseidon', 'Njord', 'Manannan mac Lir'],
      categories: [
        'Protection',
        'Psychic Work',
        'Banishing',
        'Fertility',
        'Harmony',
        'Peace',
        'Prophecy',
        'Prosperity',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Bladderwrack; p. 266',
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
          locator: 's.v. Seaweed',
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
          locator: 'pp. 382–383; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-fucus-vesiculosus',
          supports: ['canonicalName', 'folkNames', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 382',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Seaweed',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Beard Lichen',
      canonicalName: 'Usnea',
      nomenclature: 'fungal',
      description:
        'Beard lichen is the everyday name for Usnea, a genus of roughly 130 shrubby (fruticose) lichens in the family Parmeliaceae. Like every lichen it is a partnership between a fungus and an alga. It grows as small leafless tufts or trailing strands fixed to bark and twigs, now and then to rock, and is told apart from its look-alikes by the stretchy cord that runs through the centre of each branch. Its colour ranges from pale or yellowish green to grey-green, reddish or mottled. The genus is spread across temperate and tropical regions of both hemispheres, but thrives only where the air is clean, so it is used as a marker of air quality. People have used it as a traditional medicine, a source of textile dyes, a fire starter and, in hard winters, an emergency food. In European lore, Anglo-Saxon healers turned to Usnea against elf sickness, an illness blamed on elves, and lichen was carried in charms to draw luck and keep negative energy away. Modern witchcraft links lichen with luck, prosperity, psychic work and contact with forest spirits, and lays it on the altar at Samhain in memory of loved ones who have died.',
      elements: ['earth', 'water'],
      planets: ['Jupiter', 'Mercury', 'Moon', 'Saturn'],
      colors: ['green'],
      safetyNotes:
        'The AHPA handbook rates usnea (Usnea barbata) Safety Class 1 and Interaction Class A: no known contraindications, precautions or drug interactions. Liver failure and other liver damage have been reported in people taking the isolated compound usnic acid, on its own or in multi-herb products, though the editors note that findings on the isolated compound may not apply to the lichen or its extracts. Safety in pregnancy and breastfeeding has not been established.',
      folkNames: [
        "Old Man's Beard",
        'Beard Moss',
        'Tree Moss',
        "Witches' Whiskers",
        'Usnea Lichen',
      ],
      categories: ['Prosperity', 'Psychic Work'],
      references: [
        {
          source: 'wikipedia-usnea',
          supports: ['canonicalName', 'nomenclature', 'description', 'colors', 'folkNames'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Lichen',
          supports: ['description', 'elements', 'planets', 'colors', 'folkNames', 'categories'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 900',
          supports: ['safetyNotes', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 900',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Lichen',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Frankincense',
      canonicalName: 'Boswellia sacra',
      nomenclature: 'botanical',
      description:
        'Frankincense, also called olibanum, is the fragrant gum resin of Boswellia sacra, a small deciduous tree of the Burseraceae family with papery bark that peels away easily; the older name Boswellia carterii is now treated as the same species. The tree is native to Oman and Yemen in southern Arabia and to Somalia and Ethiopia in the Horn of Africa, and often grows on steep, rocky slopes. Harvesters cut shallow nicks in the trunk or branches; a milky sap seeps out, hardens in the air into tears and is gathered by hand, then sorted by hand into grades. A tree starts yielding at around eight to ten years old. The resin has been traded around Arabia and the Horn of Africa for centuries and burned as an offering by Egyptians, Babylonians, Assyrians, Greeks and Romans, and it is still burned in Catholic churches; the Gospel of Matthew names it among the gifts of the Magi. In medieval Europe it was used to fumigate divinatory mirrors and mark out ritual circles, and carried as a charm for luck. Magical practice burns it above all for protection, purification, consecration, meditation and contact with spirits. Wild stands are declining from over-tapping, and the IUCN listed B. sacra as near threatened in 1998.',
      elements: ['air', 'fire', 'water'],
      planets: ['Sun', 'Moon'],
      zodiacSigns: ['Aquarius', 'Aries', 'Leo', 'Sagittarius'],
      folkNames: [
        'Olibanum',
        'Olibanus',
        'Olibans',
        'Incense',
        'Incense Tree',
        'Bible Frankincense',
      ],
      deities: ['Ra', 'Baal', 'Aphrodite', 'Apollo', 'Astarte', 'Belenus', 'Helios', 'Venus'],
      categories: [
        'Protection',
        'Purification',
        'Meditation',
        'Banishing',
        'Clarity',
        'Courage',
        'Dream Work',
        'Healing',
        'Justice',
        'Legal Matters',
        'Love',
        'Psychic Work',
        'Success',
        'Transformation',
      ],
      substitutes: [
        {
          name: 'Rosemary',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Frankincense',
          supports: [
            'elements',
            'planets',
            'folkNames',
            'deities',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Frankincense',
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
          source: 'wikipedia-boswellia-sacra',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
        {
          source: 'wikipedia-frankincense',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 143',
          supports: ['canonicalName', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Resin',
          safetyNotes:
            'The AHPA handbook rates frankincense gum resin Safety Class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner. Taken by mouth it may irritate the stomach, and its bitter taste may cause nausea and vomiting. Allergic reactions have been reported. Safety while breastfeeding has not been established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 143–144',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Frankincense',
              supports: ['form'],
            },
            {
              source: 'wikipedia-boswellia-sacra',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            "Frankincense essential oil is made by steam-distilling the resin. Its scent comes mostly from monoterpenes and sesquiterpenes such as alpha-pinene, limonene and beta-pinene. Despite some sellers' claims, steam-distilled oil holds none of the boswellic acids found in the resin, because those compounds are not volatile enough to distil over; solvent extracts may contain them.",
          references: [
            {
              source: 'wikipedia-frankincense',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Frankincense',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sandalwood',
      canonicalName: 'Santalum album',
      nomenclature: 'botanical',
      description:
        'Sandalwood is the scented heartwood of Santalum album, a small evergreen tropical tree of the family Santalaceae, also known as white or Indian sandalwood. It is native to India, Java and the Lesser Sunda Islands, the Philippines and Western Australia, and Austronesian sailors carried it into South Asia along the ancient spice routes, where it had become naturalised in the south of India by at least 1300 BCE. The tree is partly parasitic, drawing nutrients from the roots of neighbouring plants. Only the yellow-brown heartwood is fragrant; it takes about ten years to develop its scent and some twenty before it is worth harvesting. Heavy cutting has left wild trees vulnerable to extinction, India has banned export of the timber, and buyers are urged to choose sustainably harvested stock. Across India, China and Southeast Asia the wood and its oil have been treated as sacred and burned in temples and censers; they have also served in cremation and embalming, in carving and in perfume. In magical practice sandalwood is burned for protection, healing and driving out harmful spirits, mixed with frankincense for seances and Full Moon rituals, and written on and burned to send a wish on its way.',
      elements: ['air', 'water'],
      planets: ['Moon', 'Mercury', 'Venus'],
      zodiacSigns: ['Aquarius', 'Cancer', 'Leo', 'Pisces', 'Virgo'],
      safetyNotes:
        'The AHPA handbook rates sandalwood Safety Class 1 and Interaction Class A: no known contraindications, precautions or drug interactions. Fewer than 3% of patients already allergic to fragrances reacted to sandalwood in patch tests. Safety in pregnancy has not been conclusively established.',
      folkNames: [
        'Sandal',
        'Santal',
        'White Sandalwood',
        'White Saunders',
        'Yellow Sandalwood',
        'Yellow Saunders',
        'Indian Sandalwood',
        'East Indian Sandalwood',
        'True Sandalwood',
      ],
      deities: ['Venus', 'Vishnu'],
      categories: [
        'Protection',
        'Healing',
        'Banishing',
        'Clarity',
        'Harmony',
        'Manifestation',
        'Peace',
        'Purification',
        'Truth',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Sandalwood, White',
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
          source: 'kynes-plants',
          locator: 's.v. Sandalwood',
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
          source: 'wikipedia-santalum-album',
          supports: ['canonicalName', 'nomenclature', 'description', 'folkNames'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 783–784',
          supports: ['canonicalName', 'safetyNotes', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'Chips of the wood are the form most often handled in spellwork. A wish is written on a chip, which is then burned in a censer or cauldron while the wish is held in mind. A small bowl of chips set on the altar is said to help in contacting spirit guides.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 783',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Sandalwood, White',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Sandalwood',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-santalum-album',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Ground sandalwood is burned in spells of protection, healing and exorcism, and with lavender makes an incense meant to call up spirits. It is also used as a base for incense, and is scattered around a place to clear negativity from it.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Sandalwood, White',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Sandalwood',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Sandalwood oil is extracted from the wood and consists largely of santalols; oil from S. album is far richer in them than oil from Australian sandalwood. It was first extracted at Mysore, India, in 1917. In India the oil was used to draw magic circles and other figures in exorcism rites, and in the Middle East and medieval Europe it served as a fixative for perfumes. It is diffused during past-life work and used to dress candles for clairvoyance or astral work.',
          safetyNotes:
            'The AHPA handbook notes that the essential oil is a highly concentrated extract, and that in an animal study it passed into breast milk.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Sandalwood',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-santalum-album',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 784',
              supports: ['safetyNotes'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Sandalwood beads are worn as a protective charm and to encourage spiritual awareness.',
          categories: ['Protection'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Sandalwood, White',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Florida Water',
      nomenclature: 'none',
      description:
        'Florida Water is an American cologne: a citrus scent in the manner of European eau de Cologne, but leaning on sweet orange rather than bergamot, lemon and neroli, with spicy notes such as clove. The New York perfumer Robert I. Murray introduced it in 1808; his firm became Murray & Lanman and later Lanman & Kemp, whose successor says it still follows the original formula. The name points to the legendary Fountain of Youth, said to lie in Florida, and to the flowery character of the scent. In the nineteenth century it was worn by men and women alike, and barbers used it in quantity as cologne and aftershave. Versions have been made in Hong Kong since around 1900, and in mainland China it turned into a summer skin product with menthol or borneol and herbs, used against insect bites and prickly heat. Its most important use beyond the dressing table is spiritual. In Hoodoo and in Afro-Caribbean traditions such as Regla de Ocha, Espiritismo and Palo it serves for spiritual cleansing, and its scent is thought to please the dead. Healers in the Huancabamba and Ayabaca provinces of Peru put it in their offerings and carry it for protection, reading its Spanish name, Agua Florida, as a promise of health and good luck; in Amazonian ayahuasca ceremonies it is spat over participants to purify them.',
      safetyNotes:
        'The AHPA handbook cites a published case report of berloque dermatitis caused by Florida water (Wang, Sterling and Don 2002), among its reports of skin reactions in people who put bergamot-containing products on their skin and then went into the sun. Such sun-triggered (phototoxic) reactions affect only skin exposed to sunlight and look like a severe sunburn, sometimes with reddening, swelling, blistering or darkened skin.',
      folkNames: ['Agua Florida'],
      categories: ['Cleansing', 'Purification', 'Protection'],
      references: [
        {
          source: 'wikipedia-florida-water',
          supports: ['nomenclature', 'description', 'folkNames', 'categories'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 234, 236, 979',
          supports: ['safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Perfume',
          references: [
            {
              source: 'wikipedia-florida-water',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Honey',
      canonicalName: 'Apis mellifera',
      nomenclature: 'zoological',
      description:
        'The western honey bee, Apis mellifera, is the commonest of the honey bee species; its species name is Latin for honey-bearing. It probably arose in Africa or Asia and spread unaided through Africa, the Middle East and Europe, and people later carried it to the Americas, Australia, New Zealand and eastern Asia, so that it now lives on every continent except Antarctica. Rock art in Spain and France shows honey being taken from wild nests thousands of years ago, and Egyptian tomb paintings record beekeeping before 2600 BC. Foragers bring nectar back to the hive, where workers break its sugars down, fan off most of the water and seal the finished honey into comb built from wax that they secrete from glands on the abdomen. People have long taken both from the hive: honey as food, medicine and offering, wax for candles, seals and much else. In ancient Greek religion honey, as nectar and ambrosia, was the food of Zeus and the Olympian gods; Egyptians kept bees at temples to supply offerings and buried their dead with honey, and in Hindu temples honey is poured over images of the deities. In Hoodoo, a honey or sweetening jar is made to sweeten a person or a situation towards the maker.',
      deities: ['Zeus'],
      references: [
        {
          source: 'wikipedia-western-honey-bee',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
        {
          source: 'wikipedia-honey',
          supports: ['description', 'deities'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Honey',
          description:
            'Honey is the sweet, thick store that bees make from nectar or honeydew, its sweetness coming chiefly from fructose and glucose. Kept with its water content at or below about eighteen per cent, it does not spoil, and honey found by archaeologists has stayed edible for millennia. Ancient Greeks and Egyptians, and Ayurvedic and traditional Chinese medicine, used it inwardly and on the skin for stomach troubles, ulcers, wounds and burns, and Muhammad recommended it for healing. Cunningham names a little honey among the gifts that may be buried in the soil as an offering to the Earth before gathering stones.',
          safetyNotes:
            'Do not give honey to babies under one year old: it can carry the spores that cause infant botulism. Honey made from the nectar of rhododendrons, azaleas, mountain laurel or sheep laurel can contain grayanotoxins and cause "mad honey" poisoning (dizziness, weakness, sweating, nausea and vomiting, and in rare cases heart-rhythm trouble, convulsions or death); in parts of New Zealand honey can carry the poison tutin. People with a weakened immune system may risk infection from eating it, and it may interact badly with allergies, high blood sugar or anticoagulant medicines.',
          categories: ['Healing'],
          references: [
            {
              source: 'wikipedia-honey',
              supports: ['form', 'description', 'safetyNotes', 'categories'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 30',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Wax',
          description:
            'Beeswax is secreted as small scales by worker honey bees from eight glands on the underside of the abdomen, and the bees shape it into the cells of the comb. Fresh wax is clear, then yellows or browns with pollen and propolis; rendered wax runs from nearly white to brown, most often yellow, and melts at around 62 to 64 °C. It has been found in Egyptian tombs, Viking wrecks and Roman ruins, and has served for candles, lost-wax casting, writing tablets, sealing wax, cosmetics and encaustic painting. Churches have long preferred it for candles: it was prescribed for the Easter candle and is the wax of choice in Eastern Orthodox churches.',
          colors: ['white', 'yellow', 'brown'],
          safetyNotes:
            'Beeswax is edible, of negligible toxicity and approved as a food additive (E901), though the body cannot digest it. Adulterated beeswax may contain paraffin and toxic additives.',
          references: [
            {
              source: 'wikipedia-beeswax',
              supports: ['form', 'description', 'colors', 'safetyNotes'],
            },
            {
              source: 'wikipedia-western-honey-bee',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Salt',
      canonicalName: 'Sodium chloride',
      nomenclature: 'chemical',
      description:
        'Salt is the mineral sodium chloride, sodium and chloride in equal parts, which forms brittle, cube-shaped crystals that are colourless one by one and white in the mass. It lies in the crust of the Earth as halite, or rock salt, and is won by mining or by evaporating seawater and brine in shallow pools. People were boiling spring water for it in what is now Romania by about 6000 BC; it preserved meat for thousands of years, travelled along salt roads and across the Sahara, and served as money in Abyssinia. Religions have long used it: ancient Egyptians, Greeks and Romans offered their gods salt and water, Jews dip the Sabbath bread in it, and in Shinto it purifies places and people, while little heaps by an entrance keep evil out. Cunningham links salt with Earth and with Aphrodite and treats it as a chief purifier: it cleanses stones and bathwater, guards a house sprinkled in the corners of each room, and, tasted, brings a wandering mind back to the ground. In Hoodoo it is thrown after an unwelcome visitor so that they will not come back, taken in baths to cleanse the spirit and carried with charcoal against evil spirits. It also goes into some recipes for goofer dust and into some witch bottles.',
      elements: ['earth'],
      colors: ['colourless', 'white'],
      safetyNotes:
        'Too much salt in the diet raises the risk of high blood pressure, cardiovascular disease, stroke and kidney disease; the World Health Organization advises adults to keep below about 5 g of salt (2,000 mg of sodium) a day.',
      folkNames: ['Common salt', 'Table salt', 'Rock salt', 'Halite'],
      deities: ['Aphrodite'],
      categories: ['Purification', 'Protection', 'Grounding', 'Cleansing', 'Warding'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 129–131',
          supports: ['elements', 'deities', 'categories', 'description'],
        },
        {
          source: 'wikipedia-sodium-chloride',
          supports: ['canonicalName', 'nomenclature', 'description', 'colors', 'folkNames'],
        },
        {
          source: 'wikipedia-salt',
          supports: ['description', 'colors', 'safetyNotes', 'categories'],
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
          source: 'wikipedia-witch-bottle',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Salt',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 129–131',
              supports: ['form'],
            },
            {
              source: 'wikipedia-salt',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Iron',
      canonicalName: 'Iron',
      nomenclature: 'chemical',
      description:
        'Iron is the chemical element Fe, atomic number 26: by mass the commonest element on the planet, making up much of its core, and the fourth most abundant in its crust. Bare metallic iron is rare at the surface because it rusts, and the first iron people worked came from meteorites; beads of meteoric iron from Gerzeh in Egypt date to 3500 BC or earlier. Smelting it from ore took hotter furnaces than copper needed and spread from the second millennium BC, opening the Iron Age. Clean iron is a silvery grey, and the symbol of Mars has stood for it since antiquity. Cunningham gives iron to Mars, fire and the goddess Selene and calls its energy projective. Many peoples kept it out of sacred work, from Greek temples to herbs cut with knives of other metals, yet it was also thought to frighten demons, ghosts and fairies: pieces were set in every room or buried at the corners of a property for protection, and iron was worn for strength, healing and grounding. In Hoodoo, reverence for iron goes back to the Yoruba orisha Ogun, and horseshoes, metal tools and bundles holding iron were used to protect people and keep spirits out.',
      elements: ['fire'],
      planets: ['Mars'],
      colors: ['grey'],
      deities: ['Selene', 'Ogun'],
      categories: ['Protection', 'Strength', 'Healing', 'Grounding', 'Warding'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 158–160',
          supports: ['elements', 'planets', 'deities', 'categories', 'description'],
        },
        {
          source: 'wikipedia-iron',
          supports: ['canonicalName', 'nomenclature', 'description', 'colors'],
        },
        {
          source: 'wikipedia-hoodoo-spirituality',
          supports: ['description', 'deities', 'categories'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 158–160',
              supports: ['form'],
            },
            {
              source: 'wikipedia-iron',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Nail',
          description:
            'Iron nails carry several uses of the metal on their own. Cunningham describes old nails, warmed and pushed into a white candle, for a protection rite; a horseshoe nail bent into a ring for luck and healing; and a found horseshoe nail driven into a fireplace to call back something stolen. He also records Scots pushing nails into food in a house of death, and Romans driving nails into their walls against plague. Nails go into witch bottles with urine and pins, and bottles of nails have been dug up in England and America; in Hoodoo, iron nails were found in bundles left by enslaved people, thought to guard against whipping.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 159–160',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-witch-bottle',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-hoodoo-spirituality',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Amethyst',
      canonicalName: 'Quartz var. amethyst',
      nomenclature: 'mineral',
      description:
        "Amethyst is the purple-to-violet variety of quartz, the silicon dioxide mineral, and its colour comes from iron impurities acted on by natural irradiation. Heating turns it yellow-orange or brownish, and long exposure to strong light can fade it. It grows as pointed crystals, clusters and geodes; much of the world's supply comes from large geodes in the volcanic rocks of southern Brazil and neighbouring Uruguay. The name comes from a Greek word meaning 'not intoxicated': the ancient Greeks wore the stone and carved drinking vessels from it in the hope of staying sober, Anglican bishops' rings are often set with it in allusion to the Apostles' sobriety at Pentecost, and it is the birthstone of February. In Cunningham's magical lore it is above all a stone of peace, placed beneath the pillow against insomnia and nightmares, worn for courage and as a protective amulet, especially by travellers, set on meditation altars, kept with divination tools to sharpen psychic awareness, and exchanged between lovers. Hall describes it as a strongly protective and calming stone that supports meditation, intuition, memory and restful sleep, and connects it with sobriety and with overcoming addiction.",
      elements: ['water'],
      planets: ['Jupiter', 'Neptune'],
      colors: ['purple', 'violet'],
      safetyNotes: 'Hall cautions against using amethyst in cases of paranoia or schizophrenia.',
      deities: ['Bacchus', 'Dionysus', 'Diana'],
      categories: [
        'Protection',
        'Healing',
        'Peace',
        'Love',
        'Courage',
        'Sleep',
        'Meditation',
        'Wisdom',
        'Memory',
        'Divination',
        'Prosperity',
        'Success',
        'Business',
        'Attraction',
        'Intuition',
        'Cleansing',
        'Nightmare Protection',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 71–73',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'colors',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Amethyst',
          supports: ['colors', 'safetyNotes', 'categories', 'description'],
        },
        {
          source: 'wikipedia-amethyst',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Amethyst is found as single pointed crystals, as clusters and as geodes lined with crystals. Hall suggests setting clusters and geodes about a room and using single points in healing, pointing the tip towards yourself to draw energy in and away to draw it off.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Amethyst',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-amethyst',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Hematite',
      canonicalName: 'Hematite',
      nomenclature: 'mineral',
      description:
        "Hematite, also spelt haematite, is a common iron oxide mineral and one of the chief ores of iron. It ranges from black and steel- or silver-grey to brown and red, yet always leaves a rust-red streak, and its name comes from the Greek word for blood. Polished, it is a heavy, shiny, metallic stone, shaped into beads, tumbled stones and other jewellery, and it was once worn as mourning jewellery; Cunningham mentions Italian necklaces of it sold as 'volcano spit'. Ground fine, it has coloured paint since the earliest human art, and red ochre owes its colour to it. Cunningham warns that most of what older books say about 'hematite' really concerns the stone now called bloodstone, and that genuine lore for this stone is scarce. He uses it for grounding, for drawing illness out of the body, and for scrying by gazing at a candle flame reflected on its surface. Hall likewise stresses grounding and protection, and adds confidence, willpower, memory and concentration, help in legal situations, and a close link with the blood.",
      elements: ['fire'],
      planets: ['Saturn'],
      colors: ['silver', 'red', 'black', 'grey', 'brown'],
      safetyNotes:
        'Hall advises against using hematite where inflammation is present, or for long periods.',
      folkNames: ['Volcano Spit', 'Haematite'],
      categories: [
        'Grounding',
        'Healing',
        'Divination',
        'Protection',
        'Legal Matters',
        'Confidence',
        'Memory',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 100–101',
          supports: ['elements', 'planets', 'colors', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Hematite',
          supports: ['colors', 'safetyNotes', 'categories', 'description'],
        },
        {
          source: 'wikipedia-hematite',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          description:
            'Unpolished hematite is a heavy, red or grey mass, often rounded and brain-like; polished, it turns shiny and metallic. Cunningham suggests holding a stone while visualising and then laying it on the skin over an ailing part, wearing a necklace of small stones for healing, and holding a large piece to catch a candle flame for scrying.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Hematite',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'pp. 100–101',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-hematite',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Pigment',
          description:
            'Finely ground hematite gives a red pigment that people have used since the earliest cave art. Red ochre is a clay coloured by unhydrated hematite, and the pigment has gone by several historical names in painting.',
          colors: ['red'],
          references: [
            {
              source: 'wikipedia-hematite',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: "Devil's Shoestring",
      nomenclature: 'unknown',
      description:
        "Devil's shoestring is a root carried and sold in folk magic under a name that the sources read here give to more than one plant, so no formal name is recorded for it. Cunningham's Encyclopedia of Magical Herbs heads its entry Viburnum alnifolium. Kynes's Witches' Encyclopedia of Magical Plants heads its Devil's Shoestring entry with hobblebush, Viburnum lantanoides, listing V. alnifolium as a synonym of it, but its yucca entry also gives devil's shoestring as another name for Adam's needle, Yucca filamentosa. Wikipedia applies the name to a third plant, Nolina lindheimeriana, a grass-like beargrass found only in central Texas. Kynes describes the hobblebush as a straggling shrub whose drooping stems take root where they touch the ground, leaving loops that trip the unwary, and reports that the Cherokee planted it beside the front door to keep evil spirits away and that hoodoo uses it for protection and for breaking hexes. Cunningham has it worn at the neck against evil, carried by gamblers for luck, and kept in a pocket when seeking work, facing trouble at work or asking for a rise. Both books work with the root: Cunningham steeps pieces in whiskey and spirits of camphor to rub on the hands, and Kynes ties a bundle of roots with red yarn to hang over a door.",
      elements: ['fire'],
      planets: ['Jupiter'],
      categories: ['Protection', 'Gambling', 'Banishing', 'Hex-Breaking'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Devil's Shoestring",
          supports: ['categories', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: "s.v. Devil's Shoestring; s.v. Yucca",
          supports: ['nomenclature', 'elements', 'planets', 'categories', 'description'],
        },
        {
          source: 'wikipedia-nolina-lindheimeriana',
          supports: ['nomenclature', 'description'],
        },
        {
          source: 'wikipedia-viburnum-lantanoides',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The root is the part both books work with. Kynes lists it as sold cut and dried, and binds a small bundle of roots with red yarn as a protective charm for the door. Cunningham cuts it into small pieces kept in a jar of whiskey and spirits of camphor, rubbing a piece on the hands before putting it to use.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: "s.v. Devil's Shoestring",
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: "s.v. Devil's Shoestring",
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
  ],
};
