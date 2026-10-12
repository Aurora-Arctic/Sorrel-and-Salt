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
    'wikipedia-adder-stone': {
      kind: 'entry',
      title: 'Adder stone',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Adder_stone&oldid=1378605332',
      accessed: '2026-10-11',
    },
    'wikipedia-agate': {
      kind: 'entry',
      title: 'Agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Agate&oldid=1371907988',
      accessed: '2026-10-11',
    },
    'wikipedia-aluminium': {
      kind: 'entry',
      title: 'Aluminium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aluminium&oldid=1379040707',
      accessed: '2026-10-11',
    },
    'wikipedia-ametrine': {
      kind: 'entry',
      title: 'Ametrine',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ametrine&oldid=1369723575',
      accessed: '2026-10-11',
    },
    'wikipedia-antimony': {
      kind: 'entry',
      title: 'Antimony',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Antimony&oldid=1375769793',
      accessed: '2026-10-11',
    },
    'wikipedia-aquamarine-gem': {
      kind: 'entry',
      title: 'Aquamarine (gem)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aquamarine_(gem)&oldid=1374757497',
      accessed: '2026-10-11',
    },
    'wikipedia-aventurine': {
      kind: 'entry',
      title: 'Aventurine',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aventurine&oldid=1343340257',
      accessed: '2026-10-11',
    },
    'wikipedia-beryl': {
      kind: 'entry',
      title: 'Beryl',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Beryl&oldid=1376827981',
      accessed: '2026-10-11',
    },
    'wikipedia-blue-lace-agate': {
      kind: 'entry',
      title: 'Blue lace agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Blue_lace_agate&oldid=1346967994',
      accessed: '2026-10-11',
    },
    'wikipedia-brass': {
      kind: 'entry',
      title: 'Brass',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Brass&oldid=1373585842',
      accessed: '2026-10-11',
    },
    'wikipedia-carnelian': {
      kind: 'entry',
      title: 'Carnelian',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Carnelian&oldid=1360760061',
      accessed: '2026-10-11',
    },
    'wikipedia-catlinite': {
      kind: 'entry',
      title: 'Catlinite',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Catlinite&oldid=1343180264',
      accessed: '2026-10-11',
    },
    'wikipedia-chalcedony': {
      kind: 'entry',
      title: 'Chalcedony',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chalcedony&oldid=1372143626',
      accessed: '2026-10-11',
    },
    'wikipedia-chrysoberyl': {
      kind: 'entry',
      title: 'Chrysoberyl',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chrysoberyl&oldid=1374719919',
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
    'wikipedia-copper': {
      kind: 'entry',
      title: 'Copper',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Copper&oldid=1374343138',
      accessed: '2026-10-11',
    },
    'wikipedia-diamond': {
      kind: 'entry',
      title: 'Diamond',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Diamond&oldid=1379421941',
      accessed: '2026-10-11',
    },
    'wikipedia-electrum': {
      kind: 'entry',
      title: 'Electrum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Electrum&oldid=1373724767',
      accessed: '2026-10-11',
    },
    'wikipedia-emerald': {
      kind: 'entry',
      title: 'Emerald',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Emerald&oldid=1378904819',
      accessed: '2026-10-11',
    },
    'wikipedia-fire-agate': {
      kind: 'entry',
      title: 'Fire agate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fire_agate&oldid=1353116660',
      accessed: '2026-10-11',
    },
    'wikipedia-flint': {
      kind: 'entry',
      title: 'Flint',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Flint&oldid=1375602611',
      accessed: '2026-10-11',
    },
    'wikipedia-garnet': {
      kind: 'entry',
      title: 'Garnet',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Garnet&oldid=1375466931',
      accessed: '2026-10-11',
    },
    'wikipedia-gold': {
      kind: 'entry',
      title: 'Gold',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Gold&oldid=1378929640',
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
    'wikipedia-lava': {
      kind: 'entry',
      title: 'Lava',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lava&oldid=1378579913',
      accessed: '2026-10-11',
    },
    'wikipedia-lead': {
      kind: 'entry',
      title: 'Lead',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lead&oldid=1377493060',
      accessed: '2026-10-11',
    },
    'wikipedia-marble': {
      kind: 'entry',
      title: 'Marble',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Marble&oldid=1374177890',
      accessed: '2026-10-11',
    },
    'wikipedia-mercury-element': {
      kind: 'entry',
      title: 'Mercury (element)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Mercury_(element)&oldid=1377978254',
      accessed: '2026-10-11',
    },
    'wikipedia-meteorite': {
      kind: 'entry',
      title: 'Meteorite',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Meteorite&oldid=1377518350',
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
    'wikipedia-petrified-wood': {
      kind: 'entry',
      title: 'Petrified wood',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Petrified_wood&oldid=1377992531',
      accessed: '2026-10-11',
    },
    'wikipedia-pietersite': {
      kind: 'entry',
      title: 'Pietersite',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Pietersite&oldid=1345806969',
      accessed: '2026-10-11',
    },
    'wikipedia-pumice': {
      kind: 'entry',
      title: 'Pumice',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Pumice&oldid=1379044430',
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
    'wikipedia-ruby': {
      kind: 'entry',
      title: 'Ruby',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ruby&oldid=1378292619',
      accessed: '2026-10-11',
    },
    'wikipedia-rutilated-quartz': {
      kind: 'entry',
      title: 'Rutilated quartz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rutilated_quartz&oldid=1283688730',
      accessed: '2026-10-11',
    },
    'wikipedia-sapphire': {
      kind: 'entry',
      title: 'Sapphire',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sapphire&oldid=1377304079',
      accessed: '2026-10-11',
    },
    'wikipedia-silver': {
      kind: 'entry',
      title: 'Silver',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Silver&oldid=1377391783',
      accessed: '2026-10-11',
    },
    'wikipedia-smoky-quartz': {
      kind: 'entry',
      title: 'Smoky quartz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Smoky_quartz&oldid=1364718303',
      accessed: '2026-10-11',
    },
    'wikipedia-spinel': {
      kind: 'entry',
      title: 'Spinel',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Spinel&oldid=1377591394',
      accessed: '2026-10-11',
    },
    'wikipedia-steel': {
      kind: 'entry',
      title: 'Steel',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Steel&oldid=1379651832',
      accessed: '2026-10-11',
    },
    'wikipedia-tigers-eye': {
      kind: 'entry',
      title: "Tiger's eye",
      container: 'Wikipedia',
      url: "https://en.wikipedia.org/w/index.php?title=Tiger's_eye&oldid=1378298522",
      accessed: '2026-10-11',
    },
    'wikipedia-tin': {
      kind: 'entry',
      title: 'Tin',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tin&oldid=1379053947',
      accessed: '2026-10-11',
    },
    'wikipedia-topaz': {
      kind: 'entry',
      title: 'Topaz',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Topaz&oldid=1373763816',
      accessed: '2026-10-11',
    },
    'wikipedia-tourmaline': {
      kind: 'entry',
      title: 'Tourmaline',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tourmaline&oldid=1379166844',
      accessed: '2026-10-11',
    },
    'wikipedia-witch-bottle': {
      kind: 'entry',
      title: 'Witch bottle',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Witch_bottle&oldid=1368142800',
      accessed: '2026-10-11',
    },
    'wikipedia-zircon': {
      kind: 'entry',
      title: 'Zircon',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Zircon&oldid=1368589625',
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
      celestialBodies: ['Mercury'],
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
          supports: ['celestialBodies', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Agate"',
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
              locator: 'under "Agate"',
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
      name: 'Alexandrite',
      canonicalName: 'Chrysoberyl var. alexandrite',
      nomenclature: 'mineral',
      description:
        'Alexandrite is the colour-changing variety of chrysoberyl, the beryllium aluminate gem. A trace of chromium taking the place of some aluminium makes it soak up a narrow band of yellow light, so a fine stone looks green to bluish green by daylight and turns red to purplish red under incandescent lamps. Beryllium and chromium seldom turn up in the same rocks, and Wikipedia explains its rarity by the need for beryllium-rich pegmatite fluids to meet chromium-bearing rock; stones over three carats are very scarce. Wikipedia credits its discovery to Nils Gustaf Nordenskiöld, a mineralogist from Finland who first took it for emerald, and says it was named for the future Russian emperor Alexander II, though newer research points to Yakov Kokovin. Large stones were once thought to come only from the Ural Mountains, but it is also mined in Brazil, India, Madagascar, Tanzania and Sri Lanka, laboratories now grow synthetic stones, and much sold as synthetic alexandrite is really colour-change corundum or spinel. It is one of the June birthstones. Cunningham notes that it is rare and costly, and has it worn to draw luck and good fortune and used in love spells. Hall calls it a crystal of contrasts and associates it with intuition, willpower, self-respect, joy, creativity and manifestation.',
      colors: ['green', 'red', 'yellow', 'pink'],
      categories: ['Love', 'Intuition', 'Joy', 'Creativity', 'Manifestation', 'Healing'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 68',
          supports: ['categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Beryl: Chrysoberyl"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-chrysoberyl',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Beryl: Chrysoberyl"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-chrysoberyl',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Aluminium',
      canonicalName: 'Aluminium',
      nomenclature: 'chemical',
      description:
        'Aluminium, spelt aluminum in North American English, is the chemical element Al, atomic number 13. It is a soft, ductile, non-magnetic metal about a third as dense as steel, and it looks much like silver, both in its colour and in how well it reflects light; in air it quickly forms a thin protective skin of oxide. Cunningham notes that it is a modern metal with no history among earlier peoples, now found in everything from drinks cans to aircraft. He gives it to Mercury and air and calls it projective. He mentions that it is sometimes recommended in place of mercury, the metal traditionally given to that planet, as far less dangerous to use, though he himself distrusts aluminium cookware. Small pieces are carried to sharpen the mind, and its modern link with flight makes it useful in spells for journeys to distant lands. Foil serves for image magic: shaped on the altar into the form of what is needed, charged with visualisation, then smoothed, rinsed, dried and reused each day until the work succeeds. He even counts recycling aluminium as a kind of magic, turning rubbish into money.',
      elements: ['air'],
      celestialBodies: ['Mercury'],
      colors: ['silver'],
      folkNames: ['Aluminum'],
      substitutes: [
        {
          identity: 'mercury',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 151–152',
          supports: ['elements', 'celestialBodies', 'folkNames', 'substitutes', 'description'],
        },
        {
          source: 'wikipedia-aluminium',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          description:
            'Cunningham carries small pieces of aluminium for mental ability, and uses a sheet of foil, shaped and reshaped on the altar, as a tool of image magic.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 151–152',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-aluminium',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Ametrine',
      canonicalName: 'Quartz var. ametrine',
      nomenclature: 'mineral',
      description:
        'Ametrine is a kind of quartz, the silicon dioxide mineral, in which purple and yellow-to-orange zones sit side by side within one crystal; its name joins the words amethyst and citrine. Wikipedia explains that both colours come from traces of iron held in different oxidation states, the yellow parts having been oxidised by heat, and notes that some authorities will not call the yellow part true citrine. Natural ametrine comes almost entirely from one Bolivian mine, with further deposits in Brazil and India, though much of what is sold was made by heating or irradiating amethyst, and cheap stones may be synthetic. It is also called trystine, golden amethyst and, in the trade, bolivianite. Hall describes it as a transparent crystal, usually small and tumbled, and treats it as joining the qualities of amethyst and citrine. She associates it with protection during astral travel, calmer and more focused meditation, opening the third eye for healing and divination, clear thinking, creativity and emotional transformation, and says its cleansing action clears negativity from the aura. She suggests wearing it against the body for long stretches.',
      colors: ['purple', 'yellow', 'orange'],
      folkNames: ['Trystine', 'Golden Amethyst', 'Bolivianite'],
      categories: [
        'Protection',
        'Meditation',
        'Healing',
        'Divination',
        'Clarity',
        'Creativity',
        'Transformation',
        'Cleansing',
        'Release',
      ],
      references: [
        {
          source: 'hall-crystal-bible',
          locator: 'under "Ametrine"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-ametrine',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Ametrine"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-ametrine',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Antimony',
      canonicalName: 'Antimony',
      nomenclature: 'chemical',
      description:
        'Antimony is the chemical element Sb, atomic number 51, a lustrous grey metal or metalloid. In nature it is found mainly in the sulphide mineral stibnite, and its compounds have been known since ancient times, powdered for medicine and for cosmetics often called by the Arabic name kohl. China once struck coins of it, in Guizhou in 1931, but the issue was soon stopped because the metal proved too soft and too toxic. Cunningham describes it as a white metal and gives it to the Sun and fire, calling it projective. His entry for it is brief and concerned with a single power, protection. He suggests wearing a small piece of antimony to ward off negative vibrations, carrying or wearing it simply to be protected, and adding small bits of it to combinations of protective stones to strengthen what they already do. His entry gives no older lore of the metal and names no deity, herb or stone for it.',
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: ['white', 'grey'],
      safetyNotes:
        'Wikipedia states that antimony and many of its compounds are toxic, with effects resembling arsenic poisoning, although antimony is far less toxic than arsenic.',
      categories: ['Protection'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 152',
          supports: ['elements', 'celestialBodies', 'colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-antimony',
          supports: ['canonicalName', 'nomenclature', 'colors', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 152',
              supports: ['form'],
            },
            {
              source: 'wikipedia-antimony',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Aquamarine',
      canonicalName: 'Beryl var. aquamarine',
      nomenclature: 'mineral',
      description:
        'Aquamarine is the pale blue to light green kind of beryl, a beryllium aluminium silicate, its sea colour coming from small amounts of iron held in the crystal. It grows as six-sided prisms, from tiny to huge, mostly in granite pegmatites and in veins laid down by hot mineral-rich water. Because it is fairly plentiful it costs less than emerald, its green relative. The name joins the Latin for water and for the sea. Wikipedia records that it is the birthstone for March, that the ancient Greeks cut it into engraved gems, and that an old tale of mermaids led sailors to carry it as a lucky charm against shipwreck; the largest cut stone, the Dom Pedro, came from Minas Gerais in Brazil. Cunningham gives it to the Moon and to water, calls it the stone of the old sea goddesses, and notes aquamarine beads found in Egyptian burials. He uses it to bring psychic impulses through, to purify the body before ritual, to bring peace and happiness between partners, and as a guard for anyone travelling over water. Hall calls it a stone of courage whose calming energy quiets the mind, says sailors once carried it against drowning, and links it with clearer communication, sharper intuition and meditation.',
      elements: ['water'],
      celestialBodies: ['Moon'],
      colors: ['blue', 'green'],
      categories: [
        'Psychic Work',
        'Peace',
        'Courage',
        'Purification',
        'Cleansing',
        'Joy',
        'Protection',
        'Clarity',
        'Communication',
        'Intuition',
        'Meditation',
      ],
      substitutes: [
        {
          identity: 'beryl',
        },
        {
          identity: 'beryl var. emerald',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 74–75; p. 190',
          supports: [
            'canonicalName',
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Aquamarine"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-aquamarine-gem',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
        {
          source: 'wikipedia-beryl',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Aquamarine"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-aquamarine-gem',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Cunningham notes that aquamarine beads were found in ancient Egyptian burial pits.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 74',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Aventurine',
      canonicalName: 'Aventurine',
      nomenclature: 'mineral',
      description:
        "Aventurine is a translucent form of quartzite, a rock, in which flat, plate-like inclusions of other minerals give a glittering shimmer called aventurescence. It is most often green, thanks to chromium-bearing fuchsite mica, which can give it a sheen of silvery green or blue, but it also comes in orange and brown, tinted by hematite or goethite, and in yellow, blue and grey. Being a rock rather than a single crystal, its hardness and weight vary, and it is a little softer than ordinary quartz. Its name comes from the Italian a ventura, 'by chance', handed on from goldstone, a glass said to have been made by accident at Murano and now a common imitation of it. Most green and blue-green material comes from India, and much of it is carved into beads and figures. Hall describes it as opaque and flecked with shiny particles, easy to find, and calls it a stone of prosperity that protects against environmental pollution and encourages creativity, perception and calm. Cunningham places it under Mercury and the element of air; he uses it to sharpen perception, intelligence and creativity, in gambling and money magic, for peace and healing, and as a general stone of luck.",
      elements: ['air'],
      celestialBodies: ['Mercury'],
      colors: ['green', 'blue', 'red', 'brown', 'orange', 'yellow', 'grey', 'white'],
      categories: ['Gambling', 'Peace', 'Healing', 'Creativity', 'Prosperity', 'Protection'],
      substitutes: [
        {
          name: 'Amazonite',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 76; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Aventurine"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-aventurine',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Aventurine"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-aventurine',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bead',
          description:
            'Wikipedia says the bulk of aventurine is worked into beads and small carved figures; only the finest pieces become polished cabochons set in jewellery.',
          references: [
            {
              source: 'wikipedia-aventurine',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Beryl',
      canonicalName: 'Beryl',
      nomenclature: 'mineral',
      description:
        "Beryl is a mineral, a silicate of beryllium and aluminium, that grows as six-sided columns; single crystals can reach several metres, though ones with finished ends are uncommon. Pure beryl has no colour of its own, but traces of other elements tint it green, blue, yellow, pink or, most rarely, red, and its best-known varieties are emerald and aquamarine. It is found mostly in granite pegmatites, and also in mica schists and in Colombian limestone, and it is mined as an ore of beryllium. The name reached English through French and Latin from a Greek word used for several blue-green stones. The first spectacles, made in thirteenth-century Italy, had lenses ground from beryl or rock crystal, which is why the German word for glasses is Brille. Cunningham gives beryl to the Moon and to water, links it with Poseidon and Neptune, and calls it the seer's stone: he says spheres and flat mirrors of it served for scrying, that John Dee's famous crystal was beryl rather than quartz, and that it is worn at sea against storms and drowning, to draw love and friendship, and to reconcile enemies. Hall describes it as a stone for coping with a stressful life and dropping needless burdens, credits it with lending courage, and recommends it for scrying and crystal balls.",
      elements: ['water'],
      celestialBodies: ['Moon'],
      colors: ['pink', 'gold', 'yellow', 'green', 'white', 'blue', 'colourless', 'red'],
      safetyNotes:
        'Wikipedia notes that beryl, being a beryllium compound, is a known carcinogen and can inflame the lungs if breathed in, so it should be handled with care.',
      deities: ['Poseidon', 'Neptune'],
      categories: [
        'Psychic Work',
        'Healing',
        'Love',
        'Protection',
        'Attraction',
        'Reconciliation',
        'Friendship',
        'Courage',
      ],
      substitutes: [
        {
          identity: 'beryl var. aquamarine',
        },
        {
          identity: 'beryl var. emerald',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 76–78; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'deities',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Beryl"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-beryl',
          supports: ['canonicalName', 'nomenclature', 'colors', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Beryl"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-beryl',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Mirror',
          description:
            'Cunningham records that beryl was once shaped into round, flat scrying mirrors which, like beryl spheres, were sometimes wrapped in white cloth and gazed into while the waking mind grew drowsy.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 77',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Black Tourmaline',
      canonicalName: 'Schorl',
      nomenclature: 'mineral',
      description:
        'Black tourmaline is schorl, the sodium- and iron-rich member of the tourmaline group and by far its commonest kind: Wikipedia puts it at up to 95 per cent of all tourmaline found in nature. It is opaque, brownish-black to black, and its iron gives it a high magnetic susceptibility. The name is older than 1400 and comes from a Saxon village, now Zschorlau, beside a tin mine where the black crystals turned up; Johannes Mathesius described it in 1562, and English writers later called it shorl, shirl or iron tourmaline. Like other iron-rich tourmalines it grows mainly in granite and granite pegmatite. Cunningham says it is usually too brittle for jewellery and seldom sold; he gives it to Saturn and to earth, uses it for grounding and to stand for the earth in spells of that element, and calls it protective, since it soaks up negativity once charged to do so. Hall presents it as a shield against psychic attack, spells, ill-wishing, electromagnetic smog and negative energy, says it grounds energy and lifts physical vitality, and links it with a calm, objective outlook, altruism and practical creativity.',
      elements: ['earth'],
      celestialBodies: ['Saturn'],
      colors: ['black'],
      folkNames: ['Shorl', 'Common Schorl', 'Iron Tourmaline'],
      categories: ['Grounding', 'Protection', 'Creativity', 'Healing'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 142',
          supports: [
            'canonicalName',
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Tourmaline"',
          supports: ['canonicalName', 'colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-tourmaline',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Cunningham finds the crystals mostly too brittle to set in jewellery. Hall suggests wearing one at the neck or setting it between yourself and a source of electromagnetic fields, and for healing work lays the crystals with their points turned away from the body to draw negative energy off.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 142',
              supports: ['form', 'description'],
            },
            {
              source: 'hall-crystal-bible',
              locator: 'under "Tourmaline"',
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
      celestialBodies: ['Mars'],
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
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Bloodstone"',
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
              locator: 'under "Bloodstone"',
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
          locator: 'under "Agate: Blue Lace Agate"',
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
              locator: 'under "Agate: Blue Lace Agate"',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Brass',
      nomenclature: 'none',
      description:
        "Brass is an alloy of copper and zinc, its proportions varied to change its colour and its mechanical and other properties, though copper usually makes up the larger share, typically about two-thirds. It has been in use since prehistoric times, and it is prized for its bright, golden look, its low melting point and how easily it is worked, which have made it a favourite for door furniture, sculpture and utensils. As an alloy of variable make-up it has no formal name of its own. Cunningham calls it a yellowish gold metal and gives it to the Sun and fire as projective. He says it has long stood in for gold in magic, without all of gold's virtues, and uses it chiefly to draw money: brass bells rung over green candles at sunrise, money-drawing stones laid on a piece of brass during prosperity rituals, and a small piece inscribed with a pentagram and carried to draw wealth. He also records healing charms, a brass ring against stomach cramps and a brass key at the nape of the neck to stop a nosebleed, and calls it protective, worn to guard the body and used to turn negativity back on its sender.",
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: ['yellow', 'gold'],
      categories: ['Healing', 'Protection', 'Prosperity', 'Wealth'],
      substitutes: [
        {
          identity: 'gold',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 153–154',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'wikipedia-brass',
          supports: ['colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 153–154',
              supports: ['form'],
            },
            {
              source: 'wikipedia-brass',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bell',
          description:
            'For a money ritual, Cunningham empowers eight small brass bells and eight green candles at sunrise, sets the candles in a rough square and rings each bell over each candle while visualising.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 154',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Key',
          description:
            'Cunningham records an old spell to stop a nosebleed by laying a brass key on the nape of the neck or dropping it down the back.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 154',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Nail',
          description:
            'Brass pins turn up in witch bottles: one bottle found buried at a house threshold in Cornwall was analysed and held urine, a little alcohol and a human hair, along with brass pins from the late 1840s.',
          references: [
            {
              source: 'wikipedia-witch-bottle',
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
      celestialBodies: ['Sun'],
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
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Carnelian"',
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
              locator: 'under "Carnelian"',
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
      name: "Cat's Eye",
      canonicalName: 'Chrysoberyl var. cymophane',
      nomenclature: 'mineral',
      description:
        "Cymophane, better known as cat's eye, is the chatoyant variety of chrysoberyl: a translucent, usually yellowish stone in which countless fine needles of rutile, or tiny tube-shaped hollows, lie parallel and throw a single bright line across a polished dome. Its formal name comes from Greek words for wave and appearance. Dealers praise the finest stones as 'milk and honey', meaning a sharp milky streak over a honey-toned body, though lemon-yellow ones are liked as well. Quartz, tourmaline, corundum and other minerals can show the same effect, but Wikipedia says the jewellery trade keeps the bare name 'cat's eye' for chrysoberyl and gives the others a qualifier. It grew fashionable late in the nineteenth century after the Duke of Connaught gave an engagement ring set with one. Cunningham writes of 'cat's-eye' in a looser sense that he says usually means quartz holding asbestos fibres; he assigns it to Venus and earth and uses it for wealth, beauty, gambling, protection and healing, keeping it with money and wearing it set in silver. Hall describes it as a grounding stone that also stirs intuition, credits it with protection and confidence, and says its cymophane form steadies the intellect.",
      elements: ['earth'],
      celestialBodies: ['Venus'],
      colors: ['yellow', 'green'],
      categories: [
        'Wealth',
        'Gambling',
        'Protection',
        'Healing',
        'Grounding',
        'Intuition',
        'Confidence',
        'Love',
      ],
      substitutes: [
        {
          identity: "quartz var. tiger's eye",
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 81; p. 190',
          supports: ['elements', 'celestialBodies', 'categories', 'substitutes', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Beryl: Chrysoberyl"',
          supports: ['categories', 'description'],
        },
        {
          source: 'wikipedia-chrysoberyl',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Beryl: Chrysoberyl"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-chrysoberyl',
              supports: ['form'],
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
      celestialBodies: ['Moon'],
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
          supports: ['elements', 'celestialBodies', 'colors', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Chalcedony"',
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
              locator: 'under "Chalcedony"',
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
      name: 'Chrysoberyl',
      canonicalName: 'Chrysoberyl',
      nomenclature: 'mineral',
      description:
        "Chrysoberyl is a hard gem mineral, a beryllium aluminate (BeAl2O4) that scores 8.5 for hardness on the Mohs scale. Its name joins the Greek words for gold and for beryl, yet Wikipedia stresses that it is an entirely separate mineral from beryl, though the two share beryllium, aluminium and oxygen; Hall, for her part, files it under beryl. The common stone is a yellowish green that ranges from clear to translucent, and its tabular or stubby prismatic crystals often twin in threes into hexagonal-looking trillings. It forms in pegmatites and in neighbouring rocks such as mica schist and dolomitic marble, and since it shrugs off weathering it gathers in river gravels, the source of much Brazilian and Sri Lankan stone. Wikipedia names three main kinds: the plain yellow to green stone, cat's eye (cymophane) and colour-changing alexandrite. Hall ties chrysoberyl to new beginnings, to compassion, forgiveness, generosity, confidence and creativity, and says it lets a person weigh the two sides of a question and plan ahead. She also associates it with self-healing when it is used alongside other crystals.",
      colors: ['gold', 'yellow', 'brown', 'green', 'red', 'blue', 'black', 'colourless'],
      categories: ['Forgiveness', 'Confidence', 'Creativity', 'Release', 'Healing'],
      references: [
        {
          source: 'hall-crystal-bible',
          locator: 'under "Beryl: Chrysoberyl"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-chrysoberyl',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Beryl: Chrysoberyl"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-chrysoberyl',
              supports: ['form'],
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
      celestialBodies: ['Venus'],
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
          supports: [
            'elements',
            'celestialBodies',
            'deities',
            'colors',
            'categories',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Chrysoprase"',
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
              locator: 'under "Chrysoprase"',
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
      celestialBodies: ['Sun'],
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
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Citrine"',
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
              locator: 'under "Citrine"',
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
      celestialBodies: ['Sun', 'Moon'],
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
            'celestialBodies',
            'folkNames',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Quartz"',
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
              locator: 'under "Quartz"',
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
      name: 'Copper',
      canonicalName: 'Copper',
      nomenclature: 'chemical',
      description:
        'Copper is the chemical element Cu, atomic number 29, a soft, malleable and ductile metal that carries heat and electricity very well. A freshly cut surface is pinkish orange; in air it slowly dulls to a brown-black oxide, and on roofs it weathers to a green patina called verdigris. It is one of the few metals found native, which led people to use it from about 8000 BC, and it was later the first metal smelted from sulphide ores and the first cast in a mould. Cunningham calls it a reddish orange metal and gives it to Venus and to water as a receptive metal. He records it as sacred in ancient Mesopotamia to Ishtar, Astarte and other goddesses of the planet Venus, and to the Sun in Babylon. Modern practitioners make wands of copper tube tipped with quartz crystals to direct energy, and wear the metal in ritual for the same end. He describes copper worn for healing and against sickness, rings of it set with emeralds to attract love or with mimosa seeds for protection, and old pennies kept in the kitchen to draw money to the household.',
      elements: ['water'],
      celestialBodies: ['Venus'],
      colors: ['orange'],
      deities: ['Aphrodite', 'Astarte', 'Ishtar'],
      categories: ['Healing', 'Love', 'Protection', 'Attraction'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 154–155',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-copper',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 154–155',
              supports: ['form'],
            },
            {
              source: 'wikipedia-copper',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Coin',
          description:
            "Copper pennies carry two of Cunningham's uses: in Mexico one is set on the navel before a journey against motion sickness, and older pennies, especially those minted in leap years, are kept in the kitchen to draw money to the household. He notes that United States pennies are no longer made of copper.",
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 155',
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
          locator: 'under "Agate: Dendritic Agate"',
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
              locator: 'under "Agate: Dendritic Agate"',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Diamond',
      canonicalName: 'Diamond',
      nomenclature: 'mineral',
      description:
        "Diamond is the element carbon in a rigid cubic crystal lattice, the hardest natural material known and the mineral that defines 10 on the Mohs scale. Pure diamond has no colour; nitrogen tints it yellow or brown and boron blue, radiation turns it green, distortion of the lattice gives some brown, pink and red stones, and 'black' diamonds owe their darkness to dense inclusions. Most natural diamonds grew between one and three and a half billion years ago, deep in the Earth's mantle, and were carried up far later by kimberlite and lamproite eruptions. The name goes back to Greek adamas, meaning untamed or unbreakable. India is thought to be where diamonds were first recognised and mined, and in 1772 Lavoisier burned one in oxygen to show that it is made of carbon. About four in five mined diamonds are unfit to be gems and go to industry for cutting and grinding, and laboratory-made diamond is now produced in enormous quantities. Cunningham ties diamond to the Sun and fire and uses it for spirituality and meditation, courage and strength, protection, peace, reconciling quarrelling lovers, fidelity and healing; worn at night, he says, it eases nightmares and brings sleep. Hall treats it as a symbol of purity, wealth and fidelity and an amplifier of energy, while warning that it magnifies negative energy as readily as positive.",
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: [
        'colourless',
        'white',
        'yellow',
        'blue',
        'brown',
        'pink',
        'grey',
        'green',
        'black',
        'violet',
        'orange',
        'purple',
        'red',
      ],
      categories: [
        'Protection',
        'Courage',
        'Peace',
        'Reconciliation',
        'Healing',
        'Strength',
        'Meditation',
        'Confidence',
        'Cleansing',
        'Purification',
        'Release',
        'Fidelity',
        'Nightmare Protection',
        'Sleep',
        'Love',
        'Clarity',
        'Wealth',
        'Manifestation',
        'Abundance',
        'Creativity',
      ],
      substitutes: [
        {
          name: 'Herkimer Diamond',
        },
        {
          identity: 'quartz',
        },
        {
          identity: 'zircon',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 91–93; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Diamond"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-diamond',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Rough diamonds most often grow as octahedra, plain or twinned, and some come coated in an opaque, gum-like skin. Cunningham says diamonds were long worn simply polished, before faceting brought out their fire; he recommends a six-sided cut for protection and luck, and scrying by candlelight into a faceted stone. Hall describes the cut gem as small, clear and transparent, and costly.',
          references: [
            {
              source: 'wikipedia-diamond',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'pp. 92–93',
              supports: ['description'],
            },
            {
              source: 'hall-crystal-bible',
              locator: 'under "Diamond"',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Electrum',
      nomenclature: 'unknown',
      description:
        'Electrum is a natural alloy of gold and silver, usually with traces of copper and other metals, whose colour runs from pale to bright yellow as the share of each metal changes; it has also been made artificially and sold as green gold, though it looks pale yellow rather than green. Its formal name is unsettled because the sources read give it no fixed make-up: Wikipedia defines it by a gold-and-silver mix of varying proportions, and Cunningham uses the word for any mixture of metals, naming gold, silver and platinum. Ancient Egypt used it from the third millennium BC, sometimes to coat the capstones of pyramids and obelisks, and the earliest known metal coins were struck from it. Cunningham writes that natural electrum is rare and was once highly prized in magic, and that mixing metals combines their powers, so a made alloy suits work calling on several planets at once. He retells a tale of an electrum cup that betrayed poison poured into it by throwing off rainbows and sparks, and suggests that a Wiccan honouring both Goddess and God might wear a ring or pendant of silver and gold electrum as a sign of their union. Today it is rarely sold and usually made to order.',
      colors: ['yellow'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 155–156',
          supports: ['description'],
        },
        {
          source: 'wikipedia-electrum',
          supports: ['colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 155–156',
              supports: ['form'],
            },
            {
              source: 'wikipedia-electrum',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham suggests a ring or pendant of silver and gold electrum for a Wiccan devoted to the Goddess and God, the two metals standing for the two deities joined.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 156',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Emerald',
      canonicalName: 'Beryl var. emerald',
      nomenclature: 'mineral',
      description:
        'Emerald is the green variety of beryl, a beryllium aluminium silicate, its colour coming from traces of chromium, sometimes vanadium, with iron also playing a part. Only stones of medium to dark tone are called emerald; paler ones go by the name green beryl. Most emeralds are full of inclusions and fine cracks, sometimes called the jardin, French for garden, after their mossy look, and its toughness is rated poor. It is counted among the four great precious gems with diamond, ruby and sapphire. Egypt was mining emeralds by about 1500 BC; today Colombia is the largest producer and Zambia the second. The word comes through French and Latin from a Greek name meaning green gem. Cunningham assigns emerald to Venus and to earth and links it with Isis, Venus and Ceres. He uses it for love, advising that a charged stone be worn hidden near the heart, and in business spells, and says it was worn for memory, for awareness of psychic faculties and for protection, once being tied to the left arm of travellers. Hall calls it a stone of inspiration and patience, the stone of successful love, and credits it with fostering friendship, psychic abilities, wisdom, a clear mind and a good memory.',
      elements: ['earth'],
      celestialBodies: ['Venus'],
      colors: ['green'],
      safetyNotes:
        'Hall advises against wearing emerald all the time, saying it can stir up negative emotions.',
      deities: ['Isis', 'Venus', 'Ceres', 'Vishnu'],
      categories: [
        'Love',
        'Psychic Work',
        'Protection',
        'Business',
        'Memory',
        'Knowledge',
        'Safe Travel',
        'Inspiration',
        'Friendship',
        'Wisdom',
        'Strength',
        'Healing',
        'Clarity',
        'Truth',
      ],
      substitutes: [
        {
          identity: 'beryl var. aquamarine',
        },
        {
          identity: 'beryl',
        },
        {
          name: 'Green Tourmaline',
        },
        {
          name: 'Peridot',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 93–94; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'deities',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Emerald"',
          supports: ['colors', 'safetyNotes', 'categories', 'description'],
        },
        {
          source: 'wikipedia-emerald',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall notes that gem-quality emerald is costly while unpolished stone is easy to find, and Cunningham says cheap, low-grade stones serve well enough for magic. Wikipedia adds that almost every cut emerald is oiled, often with cedar oil, to fill cracks that reach the surface.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Emerald"',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 94',
              supports: ['description'],
            },
            {
              source: 'wikipedia-emerald',
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
          locator: 'under "Agate: Fire Agate"',
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
              locator: 'under "Agate: Fire Agate"',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Flint',
      canonicalName: 'Flint',
      nomenclature: 'mineral',
      description:
        'Flint is a hard, sedimentary, cryptocrystalline form of quartz, the variety of chert found in chalk and marly limestone, where it occurs mainly as nodules and masses. It can be sandy brown, grey from medium to dark, black, reddish brown or an off-white grey. For most of human history it was the stone for tools and for striking fire. Cunningham, calling flint a term loosely used for opaque quartz, gives it to Mars and fire as a projective stone. He notes that it was among the first things early peoples traded, and that ancient flint blades found across Europe, their origin long forgotten, were called thunderstones and elf-shot and kept as protective amulets. The Irish set flint knives in silver against mischievous fairies, Scandinavians sometimes honoured them as household gods with offerings of beer and melted butter, and Cherokee healers invoked flint before treating the sick. In his magic, ancient flint tools are protective amulets, most potent over a door, and a flint knife or replica is held or laid on the altar in protective rites. He also records flint used in Brazil to divine for gold, water and gemstones, and an American spell that sends a headache away in the sparks struck from it.',
      elements: ['fire'],
      celestialBodies: ['Mars'],
      colors: ['brown', 'grey', 'black'],
      folkNames: [
        'Thunderstone',
        'Elf-Shot',
        'Fairy-Shot',
        'Elf-Arrow',
        'Adder-Stone',
        'Flintstone',
      ],
      categories: ['Protection', 'Healing', 'Divination'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 94–95',
          supports: ['elements', 'celestialBodies', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-flint',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 94–95',
              supports: ['form'],
            },
            {
              source: 'wikipedia-flint',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Garnet',
      canonicalName: 'Garnet',
      nomenclature: 'mineral',
      description:
        'Garnet is the name of a group of silicate minerals rather than of one species. Its members share a crystal structure but differ in make-up, falling into two main series: pyrope, almandine and spessartine, which carry aluminium, and uvarovite, grossular and andradite, which carry calcium. Reddish shades are the most common, though garnets come in nearly every colour, blue being the rarest. The word reached English as gernet, meaning dark red, through Old French from Latin granatus, from granum, a grain or seed, perhaps in reference to the pomegranate, whose red seed coats look like some garnet crystals. Garnet forms mostly in metamorphic rocks such as gneiss and schist, less often in igneous ones, and has been worked as both gem and abrasive since the Bronze Age; red garnets set in gold cells were the commonest gems of the late Roman world and of Anglo-Saxon pieces like those from Sutton Hoo. Cunningham gives it to Mars and to fire, and uses it for healing, protection and strength: worn for endurance and extra energy in ritual, as a guard against thieves, and once exchanged by parting friends so that they would meet again. Hall calls it an energising, cleansing and purifying stone that inspires love and devotion, brings courage and hope in a crisis and lends self-confidence.',
      elements: ['fire'],
      celestialBodies: ['Mars'],
      colors: ['red', 'pink', 'green', 'orange', 'yellow', 'brown', 'black', 'blue'],
      categories: [
        'Healing',
        'Protection',
        'Strength',
        'Friendship',
        'Cleansing',
        'Purification',
        'Love',
        'Courage',
        'Success',
        'Business',
        'Confidence',
      ],
      substitutes: [
        {
          identity: 'corundum var. ruby',
        },
        {
          name: 'Red Tourmaline',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 98–99; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Garnet"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-garnet',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes garnet as see-through or semi-clear crystals, usually small cut stones, or as bigger opaque lumps. She advises wearing it touching the skin, at the earlobe, on a finger or over the heart, and passes on the claim that square-cut garnets bring success in business.',
          categories: ['Success', 'Business'],
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Garnet"',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham records that in the Middle Ages a lion was carved on a garnet, which was then carried to keep its bearer in good health, above all on journeys.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 99',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Sand',
          description:
            'Crushed garnet is a hard-wearing abrasive. Wikipedia notes that garnet sand often takes the place of silica sand in blasting, is mixed with water at very high pressure to cut steel, and is used to filter water; much of it is gathered from beach sands on the coasts of India and Australia.',
          references: [
            {
              source: 'wikipedia-garnet',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Gold',
      canonicalName: 'Gold',
      nomenclature: 'chemical',
      description:
        'Gold is the chemical element Au, atomic number 79: in its pure state a bright, metallic yellow metal, dense and soft, the most malleable of all metals and one of the least reactive of the elements. It is often found native, as nuggets or grains in rock, veins and river deposits, usually alloyed with some silver, and gold artefacts appear in Egypt and Mesopotamia from the fourth millennium BC. Cunningham gives gold to the Sun and to fire and calls it projective. He traces its long bond with divinity, above all with solar gods: it was a favoured material for sacred images and altars and the highest of offerings, legend has the Druids cutting mistletoe with golden sickles, and medieval herbalists harvested with gold tools to strengthen their plants. He counts it perhaps the most potent metal in magic, worn to raise and send power and, day to day, to build courage, confidence and will. He uses it for protection, with a gold chain around a white candle as the focus of a rite; for wisdom, by giving it away without conditions; for health and long life; and in money and success rituals, where even a scrap of gold leaf is enough.',
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: ['yellow'],
      categories: ['Protection', 'Healing', 'Wisdom', 'Success', 'Courage', 'Confidence'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 156–158',
          supports: ['elements', 'celestialBodies', 'categories', 'description'],
        },
        {
          source: 'wikipedia-gold',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          description:
            'Cunningham works with gold as jewellery, chains, rings and plated tools, and notes that the smallest fragment of gold leaf is enough for a money ritual. Wikipedia describes the native metal as nuggets and grains, and notes that jewellery gold is usually alloyed to harden it.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 157–158',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-gold',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham calls plain gold, carried or worn, a guardian, and notes the tiny gold amulets that protect small children in India; he reads the gold crosses Christians wear as a survival of older custom.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 157–158',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Holey Stone',
      nomenclature: 'none',
      description:
        "A holey stone is any stone with a hole worn naturally through it, by erosion, wind, waves, sea creatures or other means; it is defined by the hole, not by what it is made of, so it has no formal name. Wikipedia, under the name adder stone, says such stones are usually glassy and most often of flint, that archaeologists have found them in Britain and Egypt, and that they are common on the North Sea and Baltic coasts of northern Germany. British names for them include hag stones, witch stones and fairy stones, and old stories held that they were hardened serpent saliva or came from an adder's sting; Pliny records the Druids prizing a serpent's egg of this kind. Cunningham calls them receptive and gives them to water, linking them with Odin, who in the Eddas slipped through a hole in a rock as a worm to steal the mead of poetry. He records them hung on the bedpost or, in England, tied with red ribbon over the bed against nightmares, worn or hung by the door for protection, and used by English wise women to rub away a child's illness. Looking through one by moonlight is said to show spirits, and in daylight to improve the eyesight.",
      elements: ['water'],
      folkNames: [
        'Holed Stone',
        'Holy Stone',
        'Odin Stone',
        'Adder Stone',
        'Hag Stone',
        'Witch Stone',
        'Fairy Stone',
      ],
      deities: ['Odin'],
      categories: ['Protection', 'Nightmare Protection', 'Healing'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 101–102',
          supports: ['elements', 'folkNames', 'deities', 'categories', 'description'],
        },
        {
          source: 'wikipedia-adder-stone',
          supports: ['folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 101–102',
              supports: ['form'],
            },
            {
              source: 'wikipedia-adder-stone',
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
          locator: 'under "Jasper"',
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
              locator: 'under "Jasper"',
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
      name: 'Lava Stone',
      nomenclature: 'unknown',
      description:
        "Lava is molten rock driven out of a planet or moon onto its surface, at a volcano or through a crack in the crust, usually at 800 to 1,200 degrees Celsius, and the rock it cools into is often called lava as well. Its formal name is unsettled because lava stone is not one rock: Wikipedia describes lavas of differing chemistry, basaltic ones among them, and Cunningham sorts his by their Hawaiian names for texture, rough, chunky a'a and smooth pahoehoe. Cunningham gives lava to Mars and fire, calls it projective, and names the Hawaiian volcano goddess Pele as its deity. He describes lava rocks built into the heiau, the old Hawaiian temples, some of them centres of healing, where people still wrap bluish lava rocks in ti leaves and lay them down to ask for healing. Pele is said to guard her stones jealously, and visitors who take them without an offering and her permission are thought to invite trouble; parcels of rocks are mailed back to the volcano park every day. In magic he uses lava for protection: a small piece carried or set on the altar, a ring of it around a white candle for the household, and a circle of nine or thirteen pieces against psychic attack.",
      elements: ['fire'],
      celestialBodies: ['Mars'],
      deities: ['Pele'],
      categories: ['Protection', 'Healing'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 109–110',
          supports: ['elements', 'celestialBodies', 'deities', 'categories', 'description'],
        },
        {
          source: 'wikipedia-lava',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 109–110',
              supports: ['form'],
            },
            {
              source: 'wikipedia-lava',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Lead',
      canonicalName: 'Lead',
      nomenclature: 'chemical',
      description:
        'Lead is the chemical element Pb, atomic number 82, a heavy metal denser than most everyday materials, soft and malleable, with a low melting point. Freshly cut or melted it shines silvery with a bluish tint, then tarnishes to a dull grey in air. It is easily won from its ores, chiefly galena, which often carries silver, so prehistoric peoples of the Near East knew it, and the Romans mined it widely in their search for silver. Cunningham gives lead to Saturn and earth and calls it receptive. He notes that ancient Greeks inscribed charged lead tablets with words of power, mostly for harmful spells, because the metal was thought to make a spell last, and that in eleventh-century India charms for conception and for fruitful gardens and orchards were engraved on lead. In his own practice lead serves protection and defensive magic, set near the entrance of a house to keep negativity out. He also gives a divination recorded in nineteenth-century Italy by Charles Godfrey Leland, in which melted lead and the ashes of rose seeds, nettle, rue and cumin are poured into water and the cooled shape is read.',
      elements: ['earth'],
      celestialBodies: ['Saturn'],
      colors: ['silver', 'grey'],
      safetyNotes:
        'Lead is poisonous. Wikipedia describes it as a neurotoxin that builds up in soft tissue and bone and can damage the nervous system, heart and blood vessels, and kidneys; Cunningham warns that it causes death once absorbed by the body, as the Romans found from their lead dishes and cooking pots.',
      categories: ['Protection', 'Divination', 'Fertility'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 161',
          supports: ['elements', 'celestialBodies', 'safetyNotes', 'categories', 'description'],
        },
        {
          source: 'wikipedia-lead',
          supports: ['canonicalName', 'nomenclature', 'colors', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          description:
            'Cunningham melts a small piece of lead on a metal plate over a fire with herbs, pours it into a basin of water at midnight, and reads the cooled nodule, or sleeps on it to dream an answer. Lead is also worn or used in protective spells.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 161',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-lead',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Marble',
      canonicalName: 'Marble',
      nomenclature: 'mineral',
      description:
        'Marble is a metamorphic rock of carbonate minerals, most often calcite or dolomite, recrystallised by heat and pressure; it has a crystalline texture and is usually not layered. Pure white marble comes from very clean limestone or dolomite, and the veins and swirls of coloured marbles come from impurities such as clay, sand, iron oxides or chert that were in the original rock. Cunningham describes marble as a carbonate of lime, kin to coral, calcite, limestone, chalk, shells and bone, though each has its own magical uses, and he gives it the folk name nicomar. He assigns it to the Moon and water and calls it receptive. Its chief magical use in his account is protection: an altar made wholly or partly of marble, or topped with a marble slab as some magicians prefer, makes an ideal centre for protective spells, and marble tables and fittings protect a home. A piece may be carried or worn for personal protection, as it was in India. He also uses marble in spells for personal success in a general sense. He names no deity for it.',
      elements: ['water'],
      celestialBodies: ['Moon'],
      colors: ['white'],
      folkNames: ['Nicomar'],
      categories: ['Protection', 'Success'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 113',
          supports: ['elements', 'celestialBodies', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-marble',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 113',
              supports: ['form'],
            },
            {
              source: 'wikipedia-marble',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Mercury',
      canonicalName: 'Mercury',
      nomenclature: 'chemical',
      description:
        "Mercury is the chemical element Hg, atomic number 80, commonly called quicksilver: a heavy, silvery metal and the only metallic element known to be liquid at ordinary temperature and pressure. It is found in deposits around the world, mostly as cinnabar, mercury sulphide, which ground fine gives the red pigment vermilion. It was long used in thermometers, barometers and similar instruments, though concern over its toxicity has driven much of it out of them. Cunningham gives it to the planet Mercury and calls it both projective and receptive. He rules it by earth for its weight, by water because it is liquid and by air for its quick movement. He records pools of it once held in the hand, or sealed in clear glass spheres, for scrying; a gambling talisman of a hollowed nutmeg filled with mercury and sealed, carried for luck at cards, dice and horses; and a modern protective witch bottle printed in The Witches' Almanac in 1976 or 1977, in which a small bottle of mercury sat inside bottles of water, sand, rocks and shells. He then urges readers not to use it at all, since safer and cheaper metals serve as well.",
      elements: ['earth', 'water', 'air'],
      celestialBodies: ['Mercury'],
      colors: ['silver'],
      safetyNotes:
        'Mercury is toxic. Wikipedia states that exposure to it harms the nervous and immune systems and the kidneys, and Cunningham warns that it is dangerous to breathe, to swallow or even to touch for long, and asks readers not to use it in magic.',
      folkNames: ['Quicksilver'],
      categories: ['Gambling', 'Protection'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 166–167',
          supports: [
            'elements',
            'celestialBodies',
            'safetyNotes',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-mercury-element',
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
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 166–167',
              supports: ['form'],
            },
            {
              source: 'wikipedia-mercury-element',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Meteorite',
      nomenclature: 'unknown',
      description:
        'A meteorite is a rock from outer space that has survived its fall to the surface of a planet or moon; on its way down it heats up and glows as a meteor, the brightest of which are called fireballs. Its formal name is unsettled because the word covers several different materials: Wikipedia divides meteorites into stony ones made mostly of silicate minerals, iron ones made largely of iron-nickel metal, and stony-iron ones holding plenty of both, while Cunningham treats them as one stone. Cunningham gives meteorites to fire and calls them projective, belonging to no planet but to the universe. He notes that people have long held them to be gifts of the gods, that some, such as a stone revered in Phrygia as the Great Mother, were worshipped, and that the Babylonians thought them powerful protectors able to remove all evils. He mentions peridot crystals packed inside a cut meteorite he once held, and tiny diamonds found in meteorites that fell in Mexico in 1969. In his practice they serve protection, laid on the altar beside white candles or held in the hand, and a small fragment beneath the pillow is used to encourage conscious astral projection.',
      elements: ['fire'],
      folkNames: ['Aerolith', 'Aerolite'],
      categories: ['Protection'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 167–168',
          supports: ['elements', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-meteorite',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 167–168',
              supports: ['form'],
            },
            {
              source: 'wikipedia-meteorite',
              supports: ['form'],
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
          locator: 'under "Agate: Moss Agate"',
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
              locator: 'under "Agate: Moss Agate"',
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
      celestialBodies: ['Mars', 'Saturn'],
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
          supports: [
            'elements',
            'celestialBodies',
            'deities',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Onyx"',
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
              locator: 'under "Onyx"',
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
      name: 'Petrified Wood',
      nomenclature: 'unknown',
      description:
        'Petrified wood is fossil wood in three dimensions: the remains of trees and tree-like plants whose tissue has been replaced by stone through mineralisation, sometimes keeping the original structure of the stem. Its formal name is unsettled because no single mineral makes it up: Wikipedia says the replacing minerals are mostly silica in the form of opal, chalcedony or quartz, and Cunningham says only that the wood was replaced by various minerals. Unlike most plant fossils, which survive as flattened impressions or compressions, it preserves the whole shape of the original wood. Cunningham calls it receptive, a fossil millions of years old, and explains it as ancient trees covered by mineral-rich water that slowly dissolved the wood and left minerals in its place. Its great age, he writes, is why it is carried or used in spells to lengthen life, or to deepen enjoyment of and growth within the life one has, and why it is used to recall past lives. It is carried as a protective amulet for its hardness and strange appearance; once thought to frighten evil away, it is now seen as raising barriers of energy that turn negativity aside. He also records it carried as a charm against drowning.',
      categories: ['Longevity', 'Healing', 'Protection'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 125',
          supports: ['categories', 'description'],
        },
        {
          source: 'wikipedia-petrified-wood',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 125',
              supports: ['form'],
            },
            {
              source: 'wikipedia-petrified-wood',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Pietersite',
      canonicalName: 'Quartz var. pietersite',
      nomenclature: 'mineral',
      description:
        "Pietersite is a trade name given to one kind of chalcedony, itself a variety of quartz (silicon dioxide), valued as a decorative stone for its broken-up, brecciated structure and a restless, swirling sheen. Its colours run from reddish brown through blue-grey to a shimmering yellow: Chinese stones are mostly reddish brown with patches of blue and yellow, while Namibian ones are mostly blue-grey. Wikipedia dates its first description to Namibia in 1962 and its discovery in Henan Province, China, to 1966. Many accounts call it a broken-up hawk's eye or tiger's eye, but Wikipedia calls this inaccurate: the stones are mineralogically alike and take their sheen from the same fibrous mineral, crocidolite, yet pietersite is not a broken form of either. Hall, who also calls it the tempest stone for its tie to the storm element, describes it as mottled and iridescent, usually small and tumbled, and easy to come by. She associates it with spiritual journeying and vision quests, moving meditation, intuition and precognition, and with walking one's own truth and telling true words from false. She also says it releases beliefs that other people have imposed, backs up willpower, and gives strength and support.",
      colors: ['gold', 'brown', 'grey', 'blue', 'red', 'yellow'],
      folkNames: ['Tempest Stone'],
      categories: ['Meditation', 'Intuition', 'Truth', 'Release', 'Strength', 'Healing'],
      references: [
        {
          source: 'hall-crystal-bible',
          locator: 'under "Pietersite"',
          supports: ['colors', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-pietersite',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Pietersite"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-pietersite',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Pipestone',
      canonicalName: 'Catlinite',
      nomenclature: 'mineral',
      description:
        'Pipestone, or catlinite, is a fine-grained argillite, a mudstone altered by heat and pressure, usually brownish red, that lies in beds within the hard Sioux Quartzite. Fresh Minnesota stone comes out of the ground pinkish and soft enough to cut with a hacksaw or a knife, and the iron compounds that colour it break down if it is left open to the weather. Being easy to carve, it has long been valued by the Plains nations for ceremonial pipes. The quarries outside Pipestone, Minnesota, are protected as Pipestone National Monument, where only enrolled Native Americans may dig it, and with hand tools alone. The name catlinite honours the painter George Catlin, who visited the quarries in 1835, though Philander Prescott had written about the rock in 1832. Wikipedia notes that other pipe-making stones are called pipestone too, among them Utah pipestone and the black stone the Ojibwe also use. Cunningham gives the Sioux name Inyan-sha, red rock, and assigns it to Mars, the Sun and fire. He retells a Sioux account in which the stone is the hardened blood of people lost in a great flood, says it stands for the Sioux themselves and for the North, and asks anyone who has a piece to treat it as sacred and respect Sioux and Omaha ways: it may go in a medicine bag or on the altar, including for peace rituals, but he would never wear it.',
      elements: ['fire'],
      celestialBodies: ['Mars', 'Sun'],
      colors: ['red', 'pink'],
      folkNames: ['Inyan-sha'],
      categories: ['Peace'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 125–126',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'wikipedia-catlinite',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'wikipedia-catlinite',
              supports: ['form'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 126',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Pumice',
      canonicalName: 'Pumice',
      nomenclature: 'mineral',
      description:
        'Pumice is a volcanic rock made of rough, intensely bubbly volcanic glass, sometimes holding crystals, and usually pale. It forms when superheated rock under high pressure is thrown out of a volcano and cools and loses pressure at the same moment, trapping the gas as a froth; ground to powder it is called pumicite. Scoria, a related rock, is darker and denser with larger bubbles. Cunningham describes pumice as light, rough and able to float on water, and notes its use in soaps for scrubbing dirty hands. He gives it to Mercury and air and calls it projective. At one time it was pressed into the hands of women in labour, or worn, to ease the birth. His chief use is a banishing spell: holding the stone in the projective hand, one pours into it the energy behind a problem, whether a habit, a painful emotion, an ailment or an unreturned love, and then throws it into a lake, stream or the sea, where it releases the problem and, by floating, lends strength to rise above it. A basin of water poured onto bare earth will do instead. Placed on the altar or in the home, pumice also serves protective magic as a sponge for negativity.',
      elements: ['air'],
      celestialBodies: ['Mercury'],
      categories: ['Banishing', 'Protection'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 126–127',
          supports: ['elements', 'celestialBodies', 'categories', 'description'],
        },
        {
          source: 'wikipedia-pumice',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stone',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 126–127',
              supports: ['form'],
            },
            {
              source: 'wikipedia-pumice',
              supports: ['form'],
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
          locator: 'under "Quartz: Rose Quartz"',
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
              locator: 'under "Quartz: Rose Quartz"',
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
      name: 'Ruby',
      canonicalName: 'Corundum var. ruby',
      nomenclature: 'mineral',
      description:
        "Ruby is corundum, an aluminium oxide mineral, in its red form: a trace of chromium supplies the colour, and the name goes back to the Latin word for red. Gem corundum in any shade of red, pink included, is called ruby, while the remaining colours are sold as sapphire. It is very hard, at 9 on the Mohs scale, and some stones carry a star of light when cut as a domed cabochon. Nearly every ruby now sold has been treated, usually by heating, and synthetic ruby, made since the nineteenth century, was the heart of the first working laser in 1960. The Mogok valley in Burma was for centuries the main source. Red spinel was long confused with it, and some famous 'rubies', the Black Prince's Ruby among them, are really spinel. Wikipedia records a Hindu astrological belief tying ruby to the Sun and the god Surya. Cunningham pairs ruby with fire and Mars, treats it as a stone for wealth and protection, and says it was worn to lift sadness, bring joy and confidence, and keep nightmares away from sleep; he notes it was thought a fitting offering to Krishna and the Buddha. Hall calls it a stone of energy and abundance and a shield against psychic attack, though she adds that it may overstimulate delicate or irritable people.",
      elements: ['fire'],
      celestialBodies: ['Mars'],
      colors: ['red', 'pink'],
      folkNames: ['Carbuncle', 'Red Sapphire'],
      deities: ['Krishna'],
      categories: [
        'Wealth',
        'Protection',
        'Joy',
        'Nightmare Protection',
        'Banishing',
        'Confidence',
        'Sleep',
        'Abundance',
        'Courage',
      ],
      substitutes: [
        {
          identity: 'garnet',
        },
        {
          name: 'Red Tourmaline',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 128–129; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'folkNames',
            'deities',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Ruby"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-ruby',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes ruby as bright and see-through once polished but opaque in the rough, found as small faceted crystals or as bigger cloudy lumps; rough stones are easy to come by, while polished gems cost a great deal. Cunningham likewise says that cheap, low-grade rubies that are not of gem quality serve perfectly well in magic.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Ruby"',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 128',
              supports: ['description'],
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
          locator: 'under "Quartz: Rutilated Quartz"',
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
              locator: 'under "Quartz: Rutilated Quartz"',
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
      name: 'Sapphire',
      canonicalName: 'Corundum var. sapphire',
      nomenclature: 'mineral',
      description:
        "Sapphire is gem-quality corundum, which is aluminium oxide in crystal form. Pure corundum has no colour; small amounts of other elements tint it, so that besides the familiar blue it is found yellow, green, purple, pink, orange, grey, black and colourless, and the trade calls every colour but blue a 'fancy' sapphire. Pink sapphire grades into ruby with no fixed chemical boundary, and laboratories separate the two by the colour they see. At 9 on the Mohs scale it resists scratching, which is why grown sapphire is made into watch glasses and other hard windows. Natural stones are often heated to change their colour and clarity. The word reaches English through French and Latin from Greek, and the ancient word may once have meant lapis lazuli or another blue stone. It is the customary birthstone for September. Cunningham links sapphire with the Moon, water and Apollo, saying the Greeks wore it to consult the oracle at Delphi. He uses it to widen psychic awareness, in meditation and for wisdom, as a guardian of love and fidelity, for peace, in protective and defensive magic, in legal matters, in healing work and in rites for money and wealth. Hall calls it the wisdom stone, one that steadies the mind and brings prosperity.",
      elements: ['water'],
      celestialBodies: ['Moon'],
      colors: [
        'blue',
        'yellow',
        'green',
        'black',
        'purple',
        'pink',
        'orange',
        'grey',
        'colourless',
      ],
      folkNames: ['Holy Stone'],
      deities: ['Apollo'],
      categories: [
        'Psychic Work',
        'Love',
        'Meditation',
        'Peace',
        'Healing',
        'Fidelity',
        'Banishing',
        'Reconciliation',
        'Wisdom',
        'Protection',
        'Legal Matters',
        'Wealth',
        'Prosperity',
        'Release',
      ],
      substitutes: [
        {
          identity: 'quartz var. amethyst',
        },
        {
          name: 'Blue Tourmaline',
        },
        {
          name: 'Blue Zircon',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 132–133; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'folkNames',
            'deities',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Sapphire"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-sapphire',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes sapphire as bright and see-through once polished, usually small, or else a bigger cloudy piece. A few colours are scarce, but most are easy to buy as rough stones. She advises wearing it on a finger or otherwise against the skin.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Sapphire"',
              supports: ['form', 'description'],
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
      celestialBodies: ['Mars'],
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
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
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
      celestialBodies: ['Mars'],
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
          supports: [
            'elements',
            'celestialBodies',
            'deities',
            'colors',
            'categories',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Sardonyx"',
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
              locator: 'under "Sardonyx"',
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
      name: 'Silver',
      canonicalName: 'Silver',
      nomenclature: 'chemical',
      description:
        'Silver is the chemical element Ag, atomic number 47, a soft, white, lustrous metal that conducts electricity and heat and reflects light better than any other metal. One of the seven metals known in antiquity, it has long served as coinage and been worked into jewellery, tableware and ornament, usually alloyed with copper because the pure metal is soft, and it darkens with a black tarnish of silver sulphide. Cunningham makes silver the metal of the Moon, receptive and of water, and links it with Isis, Diana, Selene and the other goddesses of the Moon and night. Wiccan priestesses wear silver crescents for the Goddess, silver is laid on the altar at the full moon, and silver bells are rung to call her in. He treats it as the metal of emotion, love, healing and the psychic mind: worn to attract love, to quicken psychic awareness, or at night for psychic dreams, and held up to catch the full moon for scrying. It reflects negativity away from its wearer, is said to guard travellers, above all at sea, and its long use as money makes it a staple of money-drawing work. He adds that some people feel overwrought wearing it at the full moon.',
      elements: ['water'],
      celestialBodies: ['Moon'],
      colors: ['white'],
      deities: ['Isis', 'Diana', 'Selene'],
      categories: [
        'Love',
        'Peace',
        'Protection',
        'Healing',
        'Psychic Work',
        'Safe Travel',
        'Attraction',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 169–171',
          supports: ['elements', 'celestialBodies', 'deities', 'categories', 'description'],
        },
        {
          source: 'wikipedia-silver',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 169–171',
              supports: ['form'],
            },
            {
              source: 'wikipedia-silver',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Coin',
          description:
            'Because silver has so long been money, Cunningham uses a silver coin in money-drawing work: empowered, then set in or under a candleholder while a green candle burns. He notes that only American dimes minted before 1965 are wholly silver.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 170–171',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Bell',
          description:
            'Cunningham describes silver bells rung in Wiccan ritual to invoke the Goddess, the bell itself being one of her symbols and silver her metal.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 169',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Silver lockets guard small children in China, French couples about to marry are protected by a silver chain, and silver crescents, whose horns are said to turn evil back, are worn worldwide, according to Cunningham.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 169–170',
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
          locator: 'under "Quartz: Smoky Quartz"',
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
              locator: 'under "Quartz: Smoky Quartz"',
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
          locator: 'under "Quartz: Snow Quartz"',
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
              locator: 'under "Quartz: Snow Quartz"',
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
      name: 'Spinel',
      canonicalName: 'Spinel',
      nomenclature: 'mineral',
      description:
        "Spinel is a mineral species, the magnesium and aluminium oxide that lends its name to the wider spinel group. It grows as cubic crystals, most often twinned octahedra, and rates about 8 on the Mohs scale. It may lack colour altogether, though red, lavender, blue, green, brown, black and yellow stones are the usual run; chromium causes the red of Burmese stones and a little cobalt the pure blues. The name comes from a Latin word for a little spine, after its pointed crystals. Spinel forms in the same kinds of rock as corundum, so spinel and ruby commonly turn up side by side, and before ruby had a scientific definition red spinel was called ruby too: two of the great red stones among Britain's Crown Jewels, the Timur Ruby and the Black Prince's Ruby, are spinels. Old names for the red stones were spinel ruby and balas ruby, the second after Badakhshan in central Asia, whose mines in present-day Tajikistan were for centuries the chief source. Cheap synthetic spinel is cut for August birthstone jewellery and used to imitate aquamarine and emerald. Cunningham assigns spinel to Pluto and fire and uses it to lend the body energy, to add physical strength during hard exertion, and in spells for riches and wealth. Hall connects it with renewed energy, encouragement and rejuvenation, and with accepting success humbly.",
      elements: ['fire'],
      celestialBodies: ['Pluto'],
      colors: [
        'black',
        'blue',
        'green',
        'pink',
        'red',
        'violet',
        'brown',
        'colourless',
        'yellow',
        'white',
        'orange',
      ],
      folkNames: ['Balas Ruby', 'Spinel Ruby'],
      categories: ['Strength', 'Wealth', 'Success'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 136',
          supports: ['elements', 'celestialBodies', 'colors', 'categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Spinel"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-spinel',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes spinel as small crystals with terminations, or as tumbled pebbles, and says it is easy to find; she lays it on the chakras or wears it. Cunningham, by contrast, calls it fairly rare, and has it worn to give the body energy. Wikipedia notes its common crystal shape is the octahedron, usually twinned.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Spinel"',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-crystals',
              locator: 'p. 136',
              supports: ['description'],
            },
            {
              source: 'wikipedia-spinel',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Steel',
      nomenclature: 'none',
      description:
        'Steel is an alloy of iron and carbon, usually with other elements, holding up to about 2.14 per cent carbon, which makes it stronger and tougher than pure iron. Strong and cheap to make, it is among the most widely manufactured materials in the world, used for building frames and reinforcing rods, bridges, tools, ships, trains, cars and machines. Like other alloys it has no single formal name. Cunningham gives steel to Mars and fire and calls it projective. He notes that it is a relatively modern metal with little history in magic, though it was once thought to protect against fairies, who could be mischievous. Its uses are mostly protective: small pieces carried to guard against negativity, and a steel ring worn as a protective amulet. For a night free of nightmares, he suggests holding a dull steel knife while visualising it piercing and driving off negativity, then sleeping with it beneath the bed. He also records an American folk belief that a steel ring worn faithfully on the hand prevents rheumatism, and adds wryly that such small rituals are hard to prove.',
      elements: ['fire'],
      celestialBodies: ['Mars'],
      categories: ['Protection', 'Nightmare Protection', 'Healing'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 171',
          supports: ['elements', 'celestialBodies', 'categories', 'description'],
        },
        {
          source: 'wikipedia-steel',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 171',
              supports: ['form'],
            },
            {
              source: 'wikipedia-steel',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham describes a steel ring worn as a protective amulet, and an American folk belief that one worn faithfully on the hand prevents rheumatism.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 171',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: "Tiger's Eye",
      canonicalName: "Quartz var. tiger's eye",
      nomenclature: 'mineral',
      description:
        "Tiger's eye is a gemstone of the quartz group with a silky, shifting sheen, known as chatoyancy, and colours running from gold to reddish brown. Wikipedia explains that the sheen comes from quartz grown in parallel with altered amphibole fibres, most of them turned to limonite, and that the stone is chiefly silicon dioxide tinted by iron oxide; Cunningham, in his entry on asbestos, says that fibrous mineral, polished together with quartz, is what is called tiger's eye. Its sources include South Africa, Namibia, India, Australia, Myanmar and the United States, among others, and is generally shaped as a domed cabochon to show off its sheen. Wikipedia records a belief that it wards off the evil eye, and that Roman soldiers wore it engraved to keep them safe in battle, a story Cunningham also tells. Cunningham places it under the Sun and the element of fire and uses it in money spells, to guard against danger, and to build courage, confidence and firm conviction; he also suggests gazing into its flashes in sunlight to look into the future. Hall describes a banded, slightly shiny stone, usually small and tumbled, and associates it with grounding spiritual energy, psychic abilities, protection against ill wishing and curses, clarity of intention and manifesting the will.",
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: ['brown', 'yellow', 'pink', 'blue', 'red', 'gold'],
      safetyNotes:
        "Wikipedia reports a 2003 study finding that the original crocidolite fibres, an asbestos mineral, survive inside tiger's eye sealed in quartz, so grinding or cutting the stone could release small amounts of crocidolite into the air, although the stone is generally considered safe.",
      folkNames: ['Tiger Eye'],
      categories: [
        'Protection',
        'Courage',
        'Divination',
        'Wealth',
        'Confidence',
        'Grounding',
        'Psychic Work',
        'Clarity',
        'Manifestation',
        'Healing',
        'Creativity',
      ],
      substitutes: [
        {
          identity: 'chrysoberyl var. cymophane',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 75; pp. 140–141; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Tiger\'s Eye"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-tigers-eye',
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
              locator: 'under "Tiger\'s Eye"',
              supports: ['form'],
            },
            {
              source: 'wikipedia-tigers-eye',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            "Cunningham recommends a polished, domed tiger's eye mounted in gold, worn as a ring or pendant for protection, and Hall suggests wearing it as a pendant or on the right arm, though only for short periods.",
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 140',
              supports: ['form', 'description'],
            },
            {
              source: 'hall-crystal-bible',
              locator: 'under "Tiger\'s Eye"',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Tin',
      canonicalName: 'Tin',
      nomenclature: 'chemical',
      description:
        "Tin is the chemical element Sn, atomic number 50, a metallic grey metal soft enough to cut with little force; a bar of it bends easily by hand and gives off a crackling sound as it does, the so-called tin cry. It is won chiefly from the mineral cassiterite, an oxide of tin. Its first large-scale use was in bronze, roughly one part tin to seven of copper, from as early as 3000 BC, and pure metallic tin was produced from about 600 BC; pewter is an alloy that is mostly tin. Cunningham gives tin to Jupiter and air and calls it projective, a metal of divination, luck and money. He recounts an old Cornish spell claiming that tin could be turned into silver by leaving it in a tank of ants on a certain night of the Moon, and remarks that the spell never says which night. His main use is a New Year's Eve divination like the one he gives for lead: a little tin is melted in an iron cup over a flame and thrown into a bucket of icy water, and the future is read from the shape and folds of the nodule. Tin is also carried for good luck.",
      elements: ['air'],
      celestialBodies: ['Jupiter'],
      colors: ['grey'],
      categories: ['Divination'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 171–172',
          supports: ['elements', 'celestialBodies', 'categories', 'description'],
        },
        {
          source: 'wikipedia-tin',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Metal',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'pp. 171–172',
              supports: ['form'],
            },
            {
              source: 'wikipedia-tin',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Charm',
          description:
            'Cunningham has tin carried as a good-luck piece, or shaped into tiny talismans, such as minutely carved images of dollar bills, to draw money.',
          references: [
            {
              source: 'cunningham-crystals',
              locator: 'p. 172',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Topaz',
      canonicalName: 'Topaz',
      nomenclature: 'mineral',
      description:
        'Topaz is a silicate of aluminium and fluorine, Al2SiO4(F,OH)2, and the mineral that marks 8 on the Mohs scale of hardness. Pure topaz is colourless, often with a greyish cast; traces of other elements give it a pale blue tint, or a shade between golden brown and yellowish orange, and pink and red stones owe their colour to chromium. Much of the deep blue, pink and other strongly coloured topaz on sale has been heated or irradiated. It forms in granite, granite pegmatites and the vapour cavities of rhyolite lava, and Brazil and Russia are among its best-known sources. The name came through Old French and Latin from the Greek name of a Red Sea island where a yellow stone, now thought to be olivine, was mined; in the Middle Ages any yellow gem might be called topaz, and the word settled on this mineral only in 1737. Wikipedia records old beliefs that it cured lunacy, kept Roman travellers from danger and, tied to the left arm, warded off curses and the evil eye. Cunningham gives it to the Sun, to fire and to Ra, uses it for protection, healing, love and wealth and against nightmares, and notes that it was once called lover of gold. Hall describes a soothing stone of truth, forgiveness, joy, abundance and love that supports manifestation.',
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: [
        'colourless',
        'white',
        'blue',
        'brown',
        'orange',
        'grey',
        'yellow',
        'green',
        'pink',
        'red',
        'gold',
      ],
      folkNames: ['Lover of Gold'],
      deities: ['Ra'],
      categories: [
        'Protection',
        'Healing',
        'Love',
        'Wealth',
        'Nightmare Protection',
        'Truth',
        'Forgiveness',
        'Joy',
        'Abundance',
        'Manifestation',
        'Confidence',
        'Wisdom',
        'Success',
        'Safe Travel',
        'Warding',
        'Longevity',
      ],
      substitutes: [
        {
          identity: 'quartz var. citrine',
        },
        {
          name: 'Yellow Tourmaline',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 141; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'deities',
            'folkNames',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Topaz"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-topaz',
          supports: ['canonicalName', 'nomenclature', 'colors', 'categories', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            "Hall describes topaz as clear, pointed crystals, mostly small cut stones but sometimes big pieces, and repeats the belief that a crystal's facets and tips hold positive and negative charges through which a wish can be focused and brought about. Wikipedia warns that, hard as it is, it splits easily along one plane if knocked, and that ultrasonic cleaners or steam can crack it; warm soapy water is the safe way to wash it.",
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Topaz"',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-topaz',
              supports: ['form', 'description'],
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
      celestialBodies: ['Pluto'],
      colors: ['colourless', 'black'],
      categories: ['Grounding', 'Harmony', 'Healing', 'Release'],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'p. 92; pp. 142–143',
          supports: ['colors', 'celestialBodies', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Quartz: Tourmalinated Quartz"',
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
              locator: 'under "Quartz: Tourmalinated Quartz"',
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
    {
      name: 'Tourmaline',
      canonicalName: 'Tourmaline',
      nomenclature: 'mineral',
      description:
        'Tourmaline is not a single mineral but a group of silicate minerals built around boron, joined with metals that vary from one member to the next, among them aluminium, iron, magnesium, lithium and sodium. Its crystals are long three-sided prisms, often scored with grooves along their length, and one crystal can carry two or three colours. Black is the commonest shade, from schorl, the iron-rich member that makes up most of the tourmaline in nature; others run through brown, yellow, green, blue, pink and red, and a few stones are colourless. It forms in granite, granite pegmatite, schist and marble, and most gem material comes from Brazil and from many parts of Africa. The name goes back to a Sinhalese word, and the Dutch East India Company shipped Ceylon stones to Europe, where its knack of drawing in and then pushing away hot ashes earned it the name Ceylonese Magnet. Cunningham notes that heating or rubbing a crystal charges its two ends oppositely, that ancient magicians did not know the stone, and that each colour has its own planet and element; for the stone as a whole he names love and friendship, money and business, peace, health, courage, energy and astral projection. Hall treats it as a cleansing, purifying and grounding stone that shields the body, and credits it with bringing self-confidence, inspiration and prosperity, and with helping the garden.',
      colors: [
        'black',
        'brown',
        'green',
        'pink',
        'red',
        'yellow',
        'blue',
        'colourless',
        'orange',
        'violet',
      ],
      folkNames: ['Ceylonese Magnet'],
      categories: [
        'Love',
        'Friendship',
        'Business',
        'Peace',
        'Courage',
        'Cleansing',
        'Purification',
        'Grounding',
        'Protection',
        'Confidence',
        'Inspiration',
        'Prosperity',
        'Healing',
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 141–142',
          supports: ['categories', 'description'],
        },
        {
          source: 'hall-crystal-bible',
          locator: 'under "Tourmaline"',
          supports: ['colors', 'categories', 'description'],
        },
        {
          source: 'wikipedia-tourmaline',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          description:
            'Hall describes tourmaline as glossy and either opaque or see-through, growing in long grooved crystals of every size. She credits the grooves running down its sides with speeding the flow of energy, which is why she rates it so highly for healing work.',
          references: [
            {
              source: 'hall-crystal-bible',
              locator: 'under "Tourmaline"',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Zircon',
      canonicalName: 'Zircon',
      nomenclature: 'mineral',
      description:
        "Zircon is a common silicate mineral, zirconium silicate (ZrSiO4), and the main source of the metal zirconium. It turns up as small grains in igneous, metamorphic and sedimentary rocks, usually well under a millimetre across in granite, though pegmatites and carbonatites can grow crystals several centimetres long. Fairly hard (7.5 on the Mohs scale), dense and chemically stubborn, it outlasts weathering and ends up in most sands. Natural stones run from colourless through yellow, red and brown to blue and green; heating can turn ordinary brown zircon colourless or blue, and blue is the most prized. Its high refractive index has led to its use in place of diamond, though its strong double refraction usually gives it away. Many zircons hold traces of uranium and thorium, so Wikipedia lists the mineral as radioactive; that same content lets geologists date single grains, and zircons from Western Australia's Jack Hills, about 4.4 billion years old, are the oldest minerals yet dated on Earth. Cunningham calls it a confusing stone, found in many colours, some of them artificial, and under many names. He gives it to the Sun and to fire, pairs it with gold, and counts love, protection, healing, peace, beauty, sexual energy and guarding against theft among its powers.",
      elements: ['fire'],
      celestialBodies: ['Sun'],
      colors: [
        'brown',
        'yellow',
        'gold',
        'green',
        'blue',
        'grey',
        'colourless',
        'red',
        'pink',
        'purple',
        'white',
        'orange',
      ],
      categories: ['Protection', 'Love', 'Peace', 'Healing'],
      substitutes: [
        {
          identity: 'diamond',
        },
      ],
      references: [
        {
          source: 'cunningham-crystals',
          locator: 'pp. 144–145; p. 190',
          supports: [
            'elements',
            'celestialBodies',
            'colors',
            'categories',
            'substitutes',
            'description',
          ],
        },
        {
          source: 'wikipedia-zircon',
          supports: ['canonicalName', 'nomenclature', 'colors', 'description'],
        },
      ],
      variants: [
        {
          form: 'Crystal',
          references: [
            {
              source: 'wikipedia-zircon',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Sand',
          description:
            "Zircon's resistance to weathering, heat and chemical attack lets its grains survive into most sands and build up in heavy-mineral sand deposits, where it is mined commercially. Industry uses the grains chiefly to make ceramics opaque, and also in refractories, as an aggregate for foundry sand casting, and as the raw material for zirconium metal and zirconium dioxide.",
          references: [
            {
              source: 'wikipedia-zircon',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
  ],
};
