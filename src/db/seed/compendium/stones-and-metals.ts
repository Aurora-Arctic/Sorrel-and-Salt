import type { SeedCompendiumShard } from '../types';

// MB.248: the stones, crystals and metals of the candidate list, every value
// traced to a page of Cunningham's crystal encyclopedia, an entry of Hall's
// Crystal Bible or a Wikipedia revision read on 2026-10-11. The sources of
// each entry, and every candidate row not seeded, are recorded in
// claude-docs/db/compendium-seed/stones-and-metals.md. Amethyst, Hematite and
// Iron are the pilot's. Descriptions are written fresh, never copied.
export const STONES_AND_METALS: SeedCompendiumShard = {
  name: 'stones-and-metals',
  sources: {
    'wikipedia-agate': {
      kind: 'entry',
      title: 'Agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Agate&oldid=1371907988',
      accessed: '2026-10-11',
    },
    'wikipedia-blue-lace-agate': {
      kind: 'entry',
      title: 'Blue lace agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Blue_lace_agate&oldid=1346967994',
      accessed: '2026-10-11',
    },
    'wikipedia-carnelian': {
      kind: 'entry',
      title: 'Carnelian',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Carnelian&oldid=1360760061',
      accessed: '2026-10-11',
    },
    'wikipedia-chalcedony': {
      kind: 'entry',
      title: 'Chalcedony',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chalcedony&oldid=1372143626',
      accessed: '2026-10-11',
    },
    'wikipedia-chrysoprase': {
      kind: 'entry',
      title: 'Chrysoprase',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chrysoprase&oldid=1343250230',
      accessed: '2026-10-11',
    },
    'wikipedia-citrine': {
      kind: 'entry',
      title: 'Citrine',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Citrine&oldid=1379470648',
      accessed: '2026-10-11',
    },
    'wikipedia-fire-agate': {
      kind: 'entry',
      title: 'Fire agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fire_agate&oldid=1353116660',
      accessed: '2026-10-11',
    },
    'wikipedia-heliotrope-bloodstone': {
      kind: 'entry',
      title: 'Heliotrope (bloodstone)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Heliotrope_(bloodstone)&oldid=1369759604',
      accessed: '2026-10-11',
    },
    'wikipedia-jasper': {
      kind: 'entry',
      title: 'Jasper',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Jasper&oldid=1369072425',
      accessed: '2026-10-11',
    },
    'wikipedia-moss-agate': {
      kind: 'entry',
      title: 'Moss agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Moss_agate&oldid=1284451811',
      accessed: '2026-10-11',
    },
    'wikipedia-onyx': {
      kind: 'entry',
      title: 'Onyx',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Onyx&oldid=1369833689',
      accessed: '2026-10-11',
    },
    'wikipedia-quartz': {
      kind: 'entry',
      title: 'Quartz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Quartz&oldid=1379162649',
      accessed: '2026-10-11',
    },
    'wikipedia-rose-quartz': {
      kind: 'entry',
      title: 'Rose quartz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rose_quartz&oldid=1379091724',
      accessed: '2026-10-11',
    },
    'wikipedia-rutilated-quartz': {
      kind: 'entry',
      title: 'Rutilated quartz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rutilated_quartz&oldid=1283688730',
      accessed: '2026-10-11',
    },
    'wikipedia-smoky-quartz': {
      kind: 'entry',
      title: 'Smoky quartz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Smoky_quartz&oldid=1364718303',
      accessed: '2026-10-11',
    },
    'wikipedia-tourmaline': {
      kind: 'entry',
      title: 'Tourmaline',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tourmaline&oldid=1379166844',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Agate',
      canonicalName: 'Quartz var. agate',
      nomenclature: 'mineral',
      description:
        'Agate is a banded form of chalcedony, the finely fibrous kind of quartz (silicon dioxide), and Wikipedia classes it as a variety of quartz. Its layers of differently coloured chalcedony usually run in rings that follow the shape of the hollow it grew in, though some lie in flat parallel lines. Most agates grow as nodules in the gas pockets of volcanic rock, others in veins or by replacing fossils, and no one has yet made one in a laboratory. Iron oxides give most bands their colour, and many dull agates on sale have been dyed or heated. Theophrastus and Pliny both say it was named after the River Achates in Sicily. People shaped agate into tools in the Stone Age, and into jewellery and seals from Sumerian times onward. Cunningham gives agate to Mercury and uses it for strength, courage, long life, love, healing and protection: worn while gardening for fruitful plants, as a truth amulet, and by children as a guard against falls. Hall calls it a slow-working grounding and balancing stone that brings strength, self-confidence, a love of truth and courage, and credits it with cleansing and healing effects.',
      planets: ['Mercury'],
      colors: [
        'colourless',
        'blue',
        'black',
        'red',
        'orange',
        'yellow',
        'white',
        'brown',
        'pink',
        'purple',
        'green',
        'grey',
      ],
      safetyNotes:
        'Wikipedia notes that sawing, grinding and tumbling agate throws off a great deal of silica dust, and that researchers in India and China have looked at silicosis and tuberculosis among people working in the agate trade.',
      categories: [
        'Strength',
        'Courage',
        'Longevity',
        'Love',
        'Healing',
        'Protection',
        'Abundance',
        'Fertility',
        'Truth',
        'Grounding',
        'Confidence',
        'Memory',
        'Cleansing',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 66–67',
          supports: ['planets', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Agate',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-agate',
          supports: ['canonicalName', 'nomenclature', 'colors', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes agate as a waxy, generally banded stone, at times see-through with tiny crystals in it, found in many sizes. She notes that the dyed slices common in shops add nothing to its healing virtues.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Agate',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Agate is widely cut into beads. In the nineteenth century the workshops of Idar-Oberstein in Germany worked out ways of staining agate, soaking it in dye, sugar or metal-salt solutions and often heating it afterwards, and sold the coloured beads around the world. In the 1939–45 war, beads of black agate from Queensland were used in the instruments of military planes that show turning and banking.',
          references: [
            {
              source: 'wikipedia-agate',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bloodstone',
      canonicalName: 'Quartz var. heliotrope',
      nomenclature: 'mineral',
      description:
        'Bloodstone, also called heliotrope, is a dark green cryptocrystalline quartz spotted with red, found mostly as opaque jasper and now and then as translucent chalcedony. In the classic stone the red flecks are jasper coloured by inclusions of hematite, and their likeness to drops of blood gives the stone its everyday name; patches of yellow, white or blue also occur. The name heliotrope, from Greek words for the sun and for turning, goes back to old beliefs about how the stone reflects light, recorded by Pliny the Elder. Wikipedia names the Deccan Traps of India as the chief source of true bloodstone, and notes it on the Isle of Rum in Scotland. Among the legends it gathers are a Christian story that the spots are the blood of Christ, Roman soldiers wearing it to slow bleeding, and Gnostics wearing it for long life, wealth and courage.\n\nCunningham assigns bloodstone to Mars and to fire. Its best-known use in his account is to stop bleeding; he also has it worn for courage, strength and victory in court, kept in a till to bring in money, and smeared with heliotrope flowers for invisibility. Hall calls it a grounding and protecting stone that sharpens intuition, feeds creativity and gives courage. The healing claims both make for it are theirs, not established medicine.',
      elements: ['fire'],
      planets: ['Mars'],
      colors: ['green', 'red', 'yellow', 'white', 'blue'],
      folkNames: ['Heliotrope', 'Ematille', 'Indian Bloodstone', 'Stone of Babylon'],
      categories: [
        'Healing',
        'Courage',
        'Wealth',
        'Strength',
        'Legal Matters',
        'Business',
        'Attraction',
        'Banishing',
        'Intuition',
        'Creativity',
        'Grounding',
        'Protection',
        'Cleansing',
        'Purification',
        'Ancestor Work',
        'Peace',
        'Sleep',
        'Divination',
        'Longevity',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 78–79',
          supports: ['elements', 'planets', 'colors', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Bloodstone',
          supports: ['colors', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-heliotrope-bloodstone',
          supports: [
            'canonicalName',
            'nomenclature',
            'colors',
            'folkNames',
            'categories',
            'description',
          ],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Bloodstone',
              supports: ['form'],
            },
            {
              source: 'wikipedia-heliotrope-bloodstone',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Bloodstone engraved and worn as a talisman. Cunningham records that in the 13th century magicians wore bloodstones cut with a bat to make their spells and rites work better.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 79',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Blue Lace Agate',
      canonicalName: 'Quartz var. blue lace agate',
      nomenclature: 'mineral',
      description:
        'Blue lace agate is a pale blue sort of agate whose white and blue bands twist in a wavy, lace-like pattern; Wikipedia classes it, like agate, as a variety of quartz. It formed in cracks rather than in rounded nodules: at its chief source, the Ysterputs Mine in southern Namibia, worked from 1962 until 2017, it filled fractures in Jurassic dolerite, and similar material has come from Kenya, Malawi, Zambia, Georgia and Turkey. Unusually for an agate, most of its chalcedony is the length-slow kind called quartzine, and its soft blue is thought to come from light scattered by minute cavities and particles inside the stone. It is cut for jewellery, and pieces with crystal coatings are sought by collectors. Cunningham assigns it to water and has it worn or carried for peace and happiness, held in the hand to ease stress, and set among light blue candles at home to calm family quarrels. Hall presents it as a gentle, cooling healer of the throat chakra that helps people put their thoughts and feelings into words, lets spiritual truths be spoken, and brings peace of mind.',
      elements: ['water'],
      colors: ['blue', 'white'],
      categories: ['Peace', 'Healing', 'Truth'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 67',
          supports: ['elements', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Agate: Blue Lace Agate',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-blue-lace-agate',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall notes that blue lace agate is usually met as small, banded tumbled stones, and suggests laying it where it is needed, above all at the throat.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Agate: Blue Lace Agate',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Carnelian',
      canonicalName: 'Quartz var. carnelian',
      nomenclature: 'mineral',
      description:
        'Carnelian, also spelled cornelian, is a reddish form of chalcedony, the fine-grained silica (silicon dioxide) counted as a variety of quartz. Traces of iron oxide colour it, anywhere from pale orange to a red so deep it looks nearly black. Sard is the darker, harder sort, and the boundary between the two names is loose. Peru and Sri Lanka are among its important sources. People in Bulgaria were already making beads of it in the early Neolithic, and Roman gem cutters favoured it for signet rings because hot sealing wax will not cling to it. The name goes back through medieval Latin to the Latin word for the cornel cherry, whose red fruit looks much like the stone.\n\nCunningham gives carnelian projective energy, the Sun and fire, and lists protection, peace, eloquence, healing, courage and sexual energy among its powers. He says the shy wear it to bolster their nerve, speakers carry it to strengthen the voice, others carry it so no one can read their thoughts, and it is worn in bed to stop nightmares. Hall calls it a grounding, energetic stone that sparks creativity, lends courage and drive towards success in business, shields against envy and anger, and can cleanse other crystals; she says a piece by the front door brings protection and abundance to the household.',
      elements: ['fire'],
      planets: ['Sun'],
      colors: ['red', 'orange', 'brown', 'pink'],
      folkNames: ['Cornelian'],
      categories: [
        'Protection',
        'Peace',
        'Healing',
        'Courage',
        'Harmony',
        'Confidence',
        'Nightmare Protection',
        'Grounding',
        'Creativity',
        'Cleansing',
        'Success',
        'Business',
        'Clarity',
        'Meditation',
        'Abundance',
        'Fertility',
      ],
      substitutes: [
        {
          name: 'Coral',
        },
        {
          name: 'Red Jasper',
        },
        {
          identity: 'quartz var. sard',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 80; p. 190',
          supports: ['elements', 'planets', 'colors', 'categories', 'substitutes', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Carnelian',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-carnelian',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes carnelian as she usually meets it: a small, see-through pebble, often smoothed by water or tumbled.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Carnelian',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-carnelian',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Carnelian has been drilled and strung for thousands of years. Beads cut with many facets come from the Varna cemetery in Bulgaria, around the middle of the fifth millennium BC; bow drills bored it at Mehrgarh; and the Indus Valley Civilization made carnelian beads etched with white designs in the third millennium BC, some of which reached Susa.',
          references: [
            {
              source: 'wikipedia-carnelian',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'A carnelian carved with a figure and kept or carried. Cunningham writes that Renaissance magic cut a sword or a warrior into the stone, kept it at home as a shield against lightning and storms, and carried it to ward off enchantment. Wikipedia notes that Romans cut it for signet and seal rings.',
          categories: ['Protection'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 80',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-carnelian',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Chalcedony',
      canonicalName: 'Quartz var. chalcedony',
      nomenclature: 'mineral',
      description:
        'Chalcedony is silica whose crystals are too small to see without magnification: a compact mass made mostly of quartz with a little intergrown moganite, which Wikipedia classes as a variety of quartz. It has a waxy lustre and lets some light through. It comes in many colours, but the commonest run from white and grey through greyish blue to browns that can be almost black, and stones on sale are often dyed or heated to deepen their colour. Agate, carnelian, chrysoprase and bloodstone are among its many named varieties. The name probably comes, through Latin, from Chalcedon, an ancient Greek town in Asia Minor, though that link is disputed. People were working it into tools in central Australia about 32,000 years ago, and Minoan seals cut from it at Knossos date to around 1800 BC.\n\nCunningham assigns chalcedony to the Moon and to water. He calls it a protective stone for travellers and against psychic attack, worn to bed to keep nightmares and fear of the dark away, and used for peace, strength and success. Hall calls it a nurturing stone of goodwill that brings mind, body and spirit into harmony and turns melancholy into joy, and she associates it with cleansing and healing; these are her claims, not established medicine.',
      elements: ['water'],
      planets: ['Moon'],
      colors: ['white', 'pink', 'blue', 'red', 'grey', 'brown'],
      categories: [
        'Peace',
        'Nightmare Protection',
        'Safe Travel',
        'Protection',
        'Banishing',
        'Warding',
        'Success',
        'Strength',
        'Harmony',
        'Joy',
        'Cleansing',
        'Healing',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 82',
          supports: ['elements', 'planets', 'colors', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Chalcedony',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-chalcedony',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Chalcedony',
              supports: ['form'],
            },
            {
              source: 'wikipedia-chalcedony',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Beads of white chalcedony. Cunningham records that mothers in Italy wear them to increase their milk.',
          colors: ['white'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 82',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Chalcedony carved or engraved to be worn or carried. Cunningham notes that Renaissance magicians cut into it the image of a man raising his right hand, worn for success in lawsuits and for health and safety, and that people keep a chalcedony arrowhead about them for luck.',
          categories: ['Success'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 82',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Pigment',
          description:
            'Chalcedony ground to powder and bound with water plus animal fat, or with tree resin or gum. Wikipedia reports that prehistoric painters used it this way for greens and yellows, for example in the Bhimbetka rock shelters.',
          colors: ['green', 'yellow'],
          references: [
            {
              source: 'wikipedia-chalcedony',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Chrysoprase',
      canonicalName: 'Quartz var. chrysoprase',
      nomenclature: 'mineral',
      description:
        'Chrysoprase is a gem variety of chalcedony, the cryptocrystalline form of silica, coloured green by traces of nickel held in very small inclusions; emerald, by contrast, owes its green to chromium. Its usual shade is apple green, though it ranges from a cyan close to turquoise to a deep green, and darker stones are sometimes called prase. The name joins the Greek words for gold and green. Its grains are too fine to pick out even under ordinary magnification, which separates it from crystalline quartzes such as amethyst and citrine, and it is valued for its colour rather than for any markings. It forms where nickel-bearing serpentinite and similar rocks have weathered deeply; well-known sources include Queensland and Western Australia, Tanzania, Poland and Brazil. Like other chalcedony it has a Mohs hardness of between 6 and 7.\n\nCunningham assigns chrysoprase to Venus, to earth and to the goddess Vesta, and has it worn for luck, success, friendship and protection, to drive off greed and envy, and to keep nightmares away. Hall links it with deep meditation, love of truth, creativity, fidelity and forgiveness, and with peaceful sleep and fertility. The healing claims both authors make for it are theirs, not established medicine.',
      elements: ['earth'],
      planets: ['Venus'],
      colors: ['green', 'turquoise'],
      folkNames: ['Chrysophrase', 'Chrysoprasus'],
      deities: ['Vesta'],
      categories: [
        'Success',
        'Friendship',
        'Protection',
        'Healing',
        'Banishing',
        'Attraction',
        'Nightmare Protection',
        'Meditation',
        'Truth',
        'Creativity',
        'Fidelity',
        'Forgiveness',
        'Peace',
        'Sleep',
        'Fertility',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 83',
          supports: ['elements', 'planets', 'deities', 'colors', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Chrysoprase',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-chrysoprase',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Chrysoprase as a small stone, often tumbled. Cunningham advises carrying a small piece at all times to draw money.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Chrysoprase',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 83',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Chrysoprase engraved and worn as an amulet. Cunningham records that in the 13th century a bull was carved into it and the stone worn for protection.',
          categories: ['Protection'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 83',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Citrine',
      canonicalName: 'Quartz var. citrine',
      nomenclature: 'mineral',
      description:
        "Citrine is the transparent yellow variety of quartz, the silicon dioxide mineral, and its name comes, by way of French, from the Latin for the citron tree. Natural stones are pale yellow, sometimes tinged orange, green or smoky, and mineralogists still disagree over which trace element colours them. True citrine is scarce in nature: both Wikipedia and Hall note that much of what is sold under the name is amethyst that has been heated, which turns a deeper yellow, orange or brown. Most of it comes from Brazil. It has been in use since the days of ancient Egypt, was long confused with topaz before modern mineralogy, and earned the nicknames money stone and merchant's stone from a belief that it brought prosperity. Cunningham assigns it to the Sun and to fire, and says it is worn at night to drive off fear and nightmares and to give sound sleep, and also to sharpen psychic awareness; he lists topaz as a substitute for it. Hall calls it a stone of abundance linked with wealth, success and joy, and associates it with cleansing, protection, grounding negative energy, intuition, creativity and self-confidence. She also notes that its colour fades in sunlight.",
      elements: ['fire'],
      planets: ['Sun'],
      colors: ['yellow', 'brown', 'orange', 'green'],
      folkNames: ['Money Stone', "Merchant's Stone"],
      categories: [
        'Nightmare Protection',
        'Protection',
        'Psychic Work',
        'Sleep',
        'Cleansing',
        'Grounding',
        'Intuition',
        'Abundance',
        'Manifestation',
        'Wealth',
        'Prosperity',
        'Success',
        'Joy',
        'Confidence',
        'Creativity',
        'Wisdom',
        'Release',
        'Healing',
        'Meditation',
      ],
      substitutes: [
        {
          identity: 'topaz',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 44; pp. 83–84; p. 190',
          supports: ['elements', 'planets', 'colors', 'categories', 'substitutes', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Citrine',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-citrine',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Citrine',
              supports: ['form'],
            },
            {
              source: 'wikipedia-citrine',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Clear Quartz',
      canonicalName: 'Quartz',
      nomenclature: 'mineral',
      description:
        "Clear quartz is the pure, colourless kind of quartz, the hard mineral of silicon dioxide that Wikipedia ranks second in abundance in the Earth's lithosphere, behind only the feldspar group. It forms transparent or translucent crystals, often long and pointed, and has traditionally been called rock crystal. The Greeks named it krustallos, from their word for icy cold, and Pliny believed it was ice frozen solid over long ages; Cunningham likewise records that the ancients took it for solid water, and that it was used to bring rain in parts of the Pacific. Wikipedia notes that quartz turns up in European passage tombs such as Newgrange, and that it is the material most often identified as maban, a mystical substance in Aboriginal Australian mythology. Cunningham assigns it to the Sun and Moon and to fire and water, and counts protection, healing and psychic power among its virtues. He describes points worn or carried to heighten psychic awareness, a crystal under the pillow for dreams and peaceful rest, spheres and pendulums used for scrying and divination, and crystals laid out to mark the magic circle. Hall calls quartz a master healer and an amplifier of energy, and associates it with cleansing, meditation, psychic ability and memory. Both writers handle its coloured kinds, such as rose and smoky quartz, on their own.",
      elements: ['fire', 'water'],
      planets: ['Sun', 'Moon'],
      colors: ['colourless'],
      safetyNotes:
        'Wikipedia warns that cutting, grinding, drilling or polishing quartz can release very fine crystalline silica dust; breathed in, that dust is a recognised cause of cancer and can lead to lung disease such as silicosis.',
      folkNames: ['Rock Crystal', 'Crystal', "Witch's Mirror", 'Star Stone', 'Iris', 'Zaztun'],
      categories: [
        'Protection',
        'Healing',
        'Psychic Work',
        'Divination',
        'Intuition',
        'Sleep',
        'Meditation',
        'Cleansing',
        'Memory',
      ],
      substitutes: [
        {
          identity: 'diamond',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 87–91; p. 190',
          supports: [
            'elements',
            'planets',
            'folkNames',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Quartz',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-quartz',
          supports: [
            'canonicalName',
            'nomenclature',
            'colors',
            'safetyNotes',
            'folkNames',
            'description',
          ],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Quartz',
              supports: ['form'],
            },
            {
              source: 'wikipedia-quartz',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham records that in the fourteenth century quartz crystals were engraved with the figure of an armoured archer and worn to guard both the wearer and the place where the stone was kept, and that across the British Isles small crystal spheres set in silver were worn as amulets against illness.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 90',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dendritic Agate',
      canonicalName: 'Quartz var. dendritic agate',
      nomenclature: 'mineral',
      description:
        'Dendritic agate is agate, a banded variety of quartz, marked with dark, branching inclusions that look like ferns or little trees. Wikipedia explains that these dendrites are made of manganese or iron oxides and grow on the surface of the stone or in the spaces between its bands. Hall describes it as transparent and clear, brown or green, usually sold as small tumbled pieces, and lists the United States, Brazil, India, Iceland, Morocco and the Czech Republic as sources. She calls it the stone of plenitude, bringing abundance to every part of life, business and farming included, and recommends it for crops and for keeping houseplants healthy, tucked into their pots. She also links it with a peaceful setting inside and out, with staying steady and persevering through strife, and with communication with the plant world. As a healer, in her account, it works slowly and is drawn to anything in the body that branches, such as nerves and blood vessels.',
      colors: ['colourless', 'brown', 'green'],
      categories: ['Abundance', 'Business', 'Peace', 'Communication', 'Healing'],
      references: [
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Agate: Dendritic Agate',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-agate',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes it as transparent with fern-like markings and usually sold small and tumbled. She advises wearing it for long periods to gain its full benefit, and tucking pieces into plant pots.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Agate: Dendritic Agate',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fire Agate',
      canonicalName: 'Quartz var. fire agate',
      nomenclature: 'mineral',
      description:
        "Fire agate is a kind of chalcedony, itself a variety of quartz, valued for flashes of iridescent colour that seem to burn under its surface. Wikipedia says it occurs only in the south-western United States and in parts of northern and central Mexico. After a long period of heavy volcanic activity, hot water rich in silica and iron oxide seeped into cracks and hollows in the rock and set there as chalcedony interleaved with thin films of iron oxide; inclusions of goethite or limonite give the stone its brown body and its play of colour. Because it usually shows no banding, it is not strictly an agate at all, whatever its name. Its Mohs hardness of 6.5 to 7 means a polished stone stands up well to wear in jewellery.\n\nHall links fire agate both to the earth's energy and to the fire element, crediting it with strong grounding powers and a calming, steadying influence. She calls it a protective stone that shields the body against ill-wishing and turns harm back on whoever sent it, and says it eases fear, prompts introspection and, by letting the body relax, deepens meditation. Hall also associates it with healing the stomach and circulation, and the endocrine and nervous systems, and with vitality and sexual energy; these are her claims, not established medicine.",
      elements: ['fire'],
      colors: ['red', 'orange', 'blue', 'green', 'brown', 'yellow', 'purple'],
      categories: ['Protection', 'Grounding', 'Meditation', 'Healing'],
      references: [
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Agate: Fire Agate',
          supports: ['elements', 'colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-fire-agate',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
        {
          source: 'wikipedia-chalcedony',
          supports: ['colors'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'wikipedia-fire-agate',
              supports: ['form'],
            },
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Agate: Fire Agate',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Jasper',
      canonicalName: 'Quartz var. jasper',
      nomenclature: 'mineral',
      description:
        'Jasper is an opaque form of silica, built mostly from extremely fine-grained quartz or chalcedony, and Wikipedia puts its usual reddish shade down to iron inclusions. Other minerals give it yellow, brown, green and, rarely, blue tones, and because it takes a high polish it has long been carved into seals, vases and jewellery. The name passes back through Old French and Latin to the Greek iaspis, and jasper seals were being cut on Minoan Crete around 1800 BC. Cunningham calls it a common stone whose magical history reaches back to the earliest times. He records that Native Americans used it in rain ceremonies, which he gives as the origin of its folk name rainbringer. He treats it as a guard against both bodily and unseen dangers, has it worn to aid thinking and hold back reckless impulses, and has it held during childbirth to protect mother and baby; carved jasper arrowheads, he says, are worn for luck. Hall calls jasper a nurturing stone and associates it with protection, grounding, cleansing the aura and the courage to face problems head on, adding that it works slowly and suits long use. Both writers also give separate properties for single colours, such as red, green and brown jasper.',
      colors: ['red', 'brown', 'yellow', 'green', 'blue', 'purple'],
      folkNames: ['Gug', 'Rainbringer'],
      categories: ['Healing', 'Protection', 'Grounding', 'Cleansing', 'Courage'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 103–105',
          supports: ['colors', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Jasper',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-jasper',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Jasper',
              supports: ['form'],
            },
            {
              source: 'wikipedia-jasper',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham says that finely carved jasper arrowheads are worn to draw luck to the wearer.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 104',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Moss Agate',
      canonicalName: 'Quartz var. moss agate',
      nomenclature: 'mineral',
      description:
        'Moss agate is a chalcedony, a fine-grained form of quartz (silicon dioxide), whose clear or milky white body holds green threads and patches that look like moss or foliage. Wikipedia notes that it lacks concentric bands, so it is not a true agate despite its name, and that the moss is mineral, not plant. Once taken for petrified moss, the inclusions are mainly manganese or iron oxides, with celadonite, hornblende or a chlorite mineral named too, and in some Montana stones these oxides add red and black. It occurs in India, Brazil, Uruguay, central Europe and the United States, and was once called mocha stone after the Yemeni city of Mocha, once a source of it. In the Stone Age it was a favoured stone for arrowheads, knives and scrapers. Cunningham places it under earth and calls it the gardener’s own talisman, worn for healing, to give energy to the depleted, to make new friends, and in spells for riches, happiness and long life. Hall describes it as a steadying stone close to nature and farming, a stone of wealth that draws abundance, a birthing stone for midwives, and a support for self-expression, communication and new beginnings.',
      elements: ['earth'],
      colors: ['green', 'blue', 'red', 'yellow', 'brown', 'colourless', 'white', 'black'],
      folkNames: ['Mocha stone'],
      categories: [
        'Healing',
        'Friendship',
        'Fertility',
        'Abundance',
        'Wealth',
        'Strength',
        'Communication',
        'Intuition',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 66, 68',
          supports: ['elements', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Agate: Moss Agate',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-moss-agate',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-agate',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes moss agate as clear or semi-clear, with branching marks like leaves or moss, usually sold small and tumbled, and advises holding or placing it on the skin where it is needed.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Agate: Moss Agate',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Onyx',
      canonicalName: 'Quartz var. onyx',
      nomenclature: 'mineral',
      description:
        'Onyx is a banded chalcedony, a fine intergrowth of quartz and moganite, two silica minerals, usually seen in black and white bands, though some stones alternate light and dark shades of a single colour. Its bands lie parallel, where those of most agates swirl. The name comes from the Greek for a claw or fingernail. Much of the black onyx on sale has been dyed, a craft the Romans already knew, and many carvings sold as onyx are really banded calcite, a softer stone; the word has also been loosely given to banded marble, alabaster and other materials. Onyx has long been cut into cameos, intaglios, beads and cabochons, and in Egypt bowls were made of it by the Second Dynasty.\n\nCunningham gives onyx projective energy, Mars and Saturn, fire and the god Mars, and counts protection, defensive magic and the damping of sexual desire among its powers; he says it was carved with the head of Mars or a figure of Hercules and carried for courage. Hall calls it a stone of strength and self-confidence that steadies you under stress, keeps a memory of what has happened to its wearer, helps release old grief and supports wise decisions.',
      elements: ['fire'],
      planets: ['Mars', 'Saturn'],
      colors: ['black', 'white', 'grey', 'blue', 'brown', 'yellow', 'red'],
      safetyNotes:
        'Cunningham warns that using onyx to hold back sexual desire can do harm. He says to think carefully before trying it, and never to keep it up for longer than a month or two.',
      deities: ['Mars'],
      categories: [
        'Protection',
        'Courage',
        'Strength',
        'Confidence',
        'Memory',
        'Healing',
        'Grief Work',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 118–120',
          supports: ['elements', 'planets', 'deities', 'categories', 'safetyNotes', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Onyx',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-onyx',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes onyx as banded and marble-like, found in every size and often polished.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Onyx',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-onyx',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bead',
          description: 'For jewellery, onyx is mostly shaped into beads or cabochons.',
          references: [
            {
              source: 'wikipedia-onyx',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Onyx carved with a figure. Its layers let an engraver set a pale image against a dark ground, as in the Roman cameo known as the Gemma Augustea. Cunningham writes that classical ceremonial magic engraved onyx with the head of Mars or a figure of Hercules, to be carried for courage.',
          categories: ['Courage'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 119',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-onyx',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rose Quartz',
      canonicalName: 'Quartz var. rose quartz',
      nomenclature: 'mineral',
      description:
        'Rose quartz is the pink, translucent variety of quartz. Wikipedia explains that it grows as a solid mass rather than as distinct crystals, and owes its colour to microscopic fibres of a silicate mineral related to dumortierite, although rutile was once thought responsible. It formed at around 400 to 700 °C in the quartz cores of pegmatites, can show a star effect when cut as a sphere or cabochon, and is widely carved and set as a semiprecious gem. A distinct kind, known as pink quartz or euhedral rose quartz, does grow as clear, well-shaped crystals and fades in light. Hall calls rose quartz a stone of unconditional love and of peace, and ranks it first among crystals for the heart. She associates it with attracting love, restoring trust and harmony between partners, loving oneself, forgiving oneself and comfort in grief, and suggests keeping it beside the bed or in the part of the home given to relationships. Cunningham, writing within his quartz entry, gives it a receptive energy and uses it to stir love, wearing a heart-shaped piece to draw it, and to foster peace, happiness and fidelity in a settled relationship.',
      colors: ['pink'],
      categories: [
        'Love',
        'Attraction',
        'Peace',
        'Fidelity',
        'Healing',
        'Self-Love',
        'Harmony',
        'Forgiveness',
        'Grief Work',
        'Fertility',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 91',
          supports: ['categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Quartz: Rose Quartz',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-rose-quartz',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Quartz: Rose Quartz',
              supports: ['form'],
            },
            {
              source: 'wikipedia-rose-quartz',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham advises wearing rose quartz cut into a heart shape to attract love.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 91',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Rutilated Quartz',
      canonicalName: 'Quartz var. rutilated quartz',
      nomenclature: 'mineral',
      description:
        "Rutilated quartz is a variety of quartz, the silicon dioxide mineral, threaded through with fine needle-shaped crystals of another mineral, rutile. Wikipedia says the needles mostly have a golden look but can also be silvery, coppery red or black; they may be strewn at random, gathered in bundles or arranged like a star, and where they crowd together the stone turns nearly opaque. Unusually for a gem, these inclusions add to its worth rather than spoiling it. Hall describes it as colourless or smoky quartz whose strands run golden brown, black or reddish, readily found in all sizes, and also calls it angel hair; Wikipedia records the name Venus' hair stone. Cunningham names it among a dozen or so stones worth keeping to begin with, and treats it as a stone of energy, worn in ritual or set on the stone altar to make the magic more effective. Hall associates it with cleansing the aura, guarding against psychic attack, scrying, astral travel, letting go of the past and forgiveness, and she uses it in past-life work. She also gives it physical healing uses, among them easing exhaustion.",
      colors: ['colourless', 'brown', 'red', 'black', 'gold', 'silver', 'yellow'],
      folkNames: ['Angel Hair', "Venus' Hair Stone"],
      categories: ['Protection', 'Cleansing', 'Healing', 'Forgiveness', 'Release'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 25; pp. 91–92',
          supports: ['description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Quartz: Rutilated Quartz',
          supports: ['colors', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-rutilated-quartz',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-quartz',
          supports: ['colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Quartz: Rutilated Quartz',
              supports: ['form'],
            },
            {
              source: 'wikipedia-quartz',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sard',
      canonicalName: 'Quartz var. sard',
      nomenclature: 'mineral',
      description:
        "Sard is a variety of chalcedony, the fine-grained form of quartz, and like its close relative carnelian it owes its colour to iron oxide. Set beside carnelian it tends to be darker, ranging from deep red-brown to nearly black, and harder and tougher, with a duller, more jagged break; but the two names are often swapped and the line between them is blurred. Pliny tied the name to Sardis in Lydia, where the stone came from, while others trace it to a Persian word for a yellowish red. Sard was carved into Assyrian cylinder seals, Egyptian and Phoenician scarabs, and early Greek and Etruscan gems, and the first stone of the Hebrew high priest's breastplate was probably sard.\n\nCunningham, who calls it a reddish yellow or brown quartz related to carnelian, gives sard projective energy, Mars and fire, and lists love, protection, courage and easing childbirth among its powers. He believes it works better for women than for men. He uses it in protective rites, to defeat hexes and to build courage and self-confidence, and records that it was once given to women in labour to help the birth go smoothly.",
      elements: ['fire'],
      planets: ['Mars'],
      colors: ['red', 'yellow', 'brown'],
      categories: ['Love', 'Protection', 'Courage', 'Confidence', 'Hex-Breaking'],
      substitutes: [
        {
          identity: 'quartz var. carnelian',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 133; p. 190',
          supports: ['elements', 'planets', 'colors', 'categories', 'substitutes', 'description'],
        },
        {
          source: 'wikipedia-carnelian',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 133',
              supports: ['form'],
            },
            {
              source: 'wikipedia-carnelian',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Sard carved with a figure and worn. Cunningham writes that in the 1300s women wore sard cut with a grapevine, standing for male energy, and ivy, for female energy, to bring good fortune and draw love. Wikipedia notes its long use for engraved seals and scarabs.',
          categories: ['Love'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 133',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-carnelian',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Sardonyx',
      canonicalName: 'Quartz var. sardonyx',
      nomenclature: 'mineral',
      description:
        'Sardonyx is onyx in which bands of sard, red to brown, alternate with black or white ones; like all onyx it is a banded chalcedony, a form of quartz. Since ancient times its reds and yellows have often been produced or deepened by treatment. Minoan Crete used sardonyx in its art, notably in finds at Knossos, and is named in the Bible. Roman soldiers are said to have gone into battle wearing sardonyx amulets carved with Mars, god of war, believing they gave courage, and in Renaissance Europe wearing it was thought to make a speaker eloquent.\n\nCunningham gives sardonyx projective energy, Mars, fire and the god Mars, with courage, protection, peace, eloquence, luck and happiness in marriage among its powers. He says it smooths things between lovers and married couples and helps them talk, is worn by lawyers and public speakers, and, kept near the heart, lifts low spirits towards peace and joy. Hall sees it as strengthening and protective, a stone that lends marriages steady, long-lived happiness, draws friends and good fortune, and can be set out around a house and garden to guard against crime.',
      elements: ['fire'],
      planets: ['Mars'],
      colors: ['red', 'brown', 'black', 'white', 'colourless'],
      folkNames: ['Red onyx'],
      deities: ['Mars'],
      categories: [
        'Protection',
        'Courage',
        'Peace',
        'Communication',
        'Joy',
        'Strength',
        'Friendship',
        'Healing',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 133–134',
          supports: ['elements', 'planets', 'deities', 'colors', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Sardonyx',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-onyx',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes sardonyx as banded and opaque, in pieces large or small, and often tumbled.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Sardonyx',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-onyx',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            "Sardonyx carved with a figure and worn. Cunningham writes that in ancient Rome it was engraved with Hercules or Mars for courage, and that a sardonyx cut with an eagle's head and mounted in gold, silver or platinum was once worn for good luck. Wikipedia records the Roman battle amulets carved with Mars.",
          categories: ['Courage'],
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 134',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-onyx',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Smoky Quartz',
      canonicalName: 'Quartz var. smoky quartz',
      nomenclature: 'mineral',
      description:
        "Smoky quartz is a quartz variety, brown to black in colour, ranging from almost fully transparent to nearly opaque. Wikipedia explains that its colour comes from natural gamma radiation in the surrounding rock acting on aluminium impurities in the crystal. Heating above about 200 to 300 °C, or ultraviolet light, fades it, sometimes to a pale yellow, and some heated smoky quartz is sold as citrine. Crystals that grew in pegmatites or alpine fissures are usually coloured evenly. Of little historical note in the past, it is now a popular gem and collector's crystal, and flat panes of it served as sunglasses in twelfth-century China. Hall counts it among the most effective grounding stones, calls it protective, and says it also raises the vibration during meditation. She associates it with easing stress, fear and nightmares, with clearing the mind for meditation, with scrying and with easing difficulties in communication. Cunningham, writing within his quartz entry, gives it a receptive energy, calls it a mood-lifter and has it worn for grounding and to help overcome depression and other negative feelings.",
      colors: ['brown', 'grey', 'black', 'yellow'],
      safetyNotes:
        'Hall advises taking care to choose naturally formed smoky quartz rather than stones artificially treated with radiation, which she says are usually very black and not transparent.',
      categories: [
        'Grounding',
        'Meditation',
        'Protection',
        'Nightmare Protection',
        'Manifestation',
        'Communication',
        'Cleansing',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 92',
          supports: ['categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Quartz: Smoky Quartz',
          supports: ['colors', 'safetyNotes', 'categories', 'description'],
        },
        {
          source: 'wikipedia-smoky-quartz',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Quartz: Smoky Quartz',
              supports: ['form'],
            },
            {
              source: 'wikipedia-smoky-quartz',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Snow Quartz',
      canonicalName: 'Quartz var. milky quartz',
      nomenclature: 'mineral',
      description:
        "Snow quartz is the white, cloudy kind of quartz, the hard mineral made of silicon dioxide, and Wikipedia lists it among the varieties of quartz under the name milky quartz. Its whiteness comes from countless tiny pockets of gas or liquid sealed inside while the crystal grew, which leave it translucent at best and often opaque, so it is valued less as a gem than the clearer kinds. Hall describes it as a densely compacted, milky stone, often met as a pebble smoothed by water or as a large boulder, easy to come by and found all over the world, and she gives milk quartz as another name for it. In Hall's account it supports a person through hard lessons and helps them set down burdens they have taken on themselves, and she links it with tact, cooperation and pausing to think before speaking. She suggests it in meditation as a way to reach a deep, long-neglected inner wisdom. Hall offers it in place of clear quartz for any purpose, saying it acts more slowly and gently but still works.",
      colors: ['white'],
      folkNames: ['Milk Quartz', 'Milky Quartz'],
      categories: ['Meditation', 'Wisdom', 'Healing'],
      substitutes: [
        {
          identity: 'quartz',
        },
      ],
      references: [
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Quartz: Snow Quartz',
          supports: ['colors', 'folkNames', 'categories', 'substitutes', 'description'],
        },
        {
          source: 'wikipedia-quartz',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Quartz: Snow Quartz',
              supports: ['form'],
            },
            {
              source: 'wikipedia-quartz',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Tourmalinated Quartz',
      nomenclature: 'unknown',
      description:
        "Tourmalinated quartz is clear quartz with dark rods of tourmaline grown through it. Cunningham describes it as quartz pierced by crystals of black tourmaline, and Hall as clear crystal holding long, thick, dark threads, easy to obtain in any size and found the world over. Quartz itself is silicon dioxide, and tourmaline is a group of crystalline silicate minerals built around boron, according to Wikipedia. Its formal name is unsettled here because neither Hall nor Cunningham gives it a mineral name, and Wikipedia's Quartz article does not include it in its list of quartz varieties. Hall presents it as joining the qualities of both minerals: a grounding stone that shields the body's energy field from intrusion, eases tension, harmonises opposites and turns negative thought towards the positive, and she uses it to help heal the shadow side of the mind and to curb self-sabotage. Cunningham places it under Pluto. He suggests wearing it, or keeping it under the pillow, to encourage astral projection, or gazing into a sphere of it to quieten the mind before sending the astral body into the crystal.",
      planets: ['Pluto'],
      colors: ['colourless', 'black'],
      categories: ['Grounding', 'Harmony', 'Healing', 'Release'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 92; pp. 142–143',
          supports: ['colors', 'planets', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 's.v. Quartz: Tourmalinated Quartz',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-quartz',
          supports: ['nomenclature', 'description'],
        },
        {
          source: 'wikipedia-tourmaline',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 's.v. Quartz: Tourmalinated Quartz',
              supports: ['form'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 92',
              supports: ['form'],
            },
          ],
        },
      ],
    },
  ],
};
