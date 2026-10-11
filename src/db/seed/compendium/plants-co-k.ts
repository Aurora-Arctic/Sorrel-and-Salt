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
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: "Deer's Tongue",
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/d/deerst10.html',
      accessed: '2026-10-11',
    },
    'grieve-docks': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Docks',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/d/docks-15.html',
      accessed: '2026-10-11',
    },
    'grieve-dodder': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Dodder',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/d/dodder16.html',
      accessed: '2026-10-11',
    },
    'grieve-echinacea': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Echinacea',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/e/echina01.html',
      accessed: '2026-10-11',
    },
    'grieve-eyebright': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Eyebright',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/e/eyebri20.html',
      accessed: '2026-10-11',
    },
    'grieve-forget-me-not': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Forget-Me-Not',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/f/forget29.html',
      accessed: '2026-10-11',
    },
    'grieve-foxglove': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Foxglove',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/f/foxglo30.html',
      accessed: '2026-10-11',
    },
    'grieve-fumitory': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Fumitory',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/f/fumito36.html',
      accessed: '2026-10-11',
    },
    'grieve-galangal': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Galangal',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/g/galang01.html',
      accessed: '2026-10-11',
    },
    'grieve-gentians': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Gentians',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/g/gentia08.html',
      accessed: '2026-10-11',
    },
    'grieve-globe-flower': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Globe Flower',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/g/globef20.html',
      accessed: '2026-10-11',
    },
    'nccih-evening-primrose-oil': {
      kind: 'web_page',
      title: 'Evening Primrose Oil: Usefulness and Safety',
      container: 'NCCIH',
      url: 'https://www.nccih.nih.gov/health/evening-primrose-oil',
      accessed: '2026-10-11',
    },
    'wikipedia-amanita-muscaria': {
      kind: 'entry',
      title: 'Amanita muscaria',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Amanita_muscaria&oldid=1377738473',
      accessed: '2026-10-11',
    },
    'wikipedia-apocynum-androsaemifolium': {
      kind: 'entry',
      title: 'Apocynum androsaemifolium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Apocynum_androsaemifolium&oldid=1372410124',
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
    'wikipedia-carphephorus-odoratissimus': {
      kind: 'entry',
      title: 'Carphephorus odoratissimus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Carphephorus_odoratissimus&oldid=1326467002',
      accessed: '2026-10-11',
    },
    'wikipedia-centaurea-cyanus': {
      kind: 'entry',
      title: 'Centaurea cyanus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Centaurea_cyanus&oldid=1376904502',
      accessed: '2026-10-11',
    },
    'wikipedia-chamaelirium-luteum': {
      kind: 'entry',
      title: 'Chamaelirium luteum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chamaelirium_luteum&oldid=1371809343',
      accessed: '2026-10-11',
    },
    'wikipedia-cichorium-endivia': {
      kind: 'entry',
      title: 'Cichorium endivia',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cichorium_endivia&oldid=1339694180',
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
    'wikipedia-cornus-florida': {
      kind: 'entry',
      title: 'Cornus florida',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cornus_florida&oldid=1371112811',
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
    'wikipedia-cuscuta-europaea': {
      kind: 'entry',
      title: 'Cuscuta europaea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cuscuta_europaea&oldid=1306378437',
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
    'wikipedia-digitalis-purpurea': {
      kind: 'entry',
      title: 'Digitalis purpurea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Digitalis_purpurea&oldid=1379555592',
      accessed: '2026-10-11',
    },
    'wikipedia-dill': {
      kind: 'entry',
      title: 'Dill',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Dill&oldid=1373033162',
      accessed: '2026-10-11',
    },
    'wikipedia-echinacea': {
      kind: 'entry',
      title: 'Echinacea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Echinacea&oldid=1374317936',
      accessed: '2026-10-11',
    },
    'wikipedia-edelweiss': {
      kind: 'entry',
      title: 'Edelweiss',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Edelweiss&oldid=1378394533',
      accessed: '2026-10-11',
    },
    'wikipedia-elecampane': {
      kind: 'entry',
      title: 'Elecampane',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Elecampane&oldid=1379098911',
      accessed: '2026-10-11',
    },
    'wikipedia-elymus-repens': {
      kind: 'entry',
      title: 'Elymus repens',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Elymus_repens&oldid=1366011475',
      accessed: '2026-10-11',
    },
    'wikipedia-endive': {
      kind: 'entry',
      title: 'Endive',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Endive&oldid=1319523897',
      accessed: '2026-10-11',
    },
    'wikipedia-eucalyptus-globulus': {
      kind: 'entry',
      title: 'Eucalyptus globulus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Eucalyptus_globulus&oldid=1378678853',
      accessed: '2026-10-11',
    },
    'wikipedia-euphrasia-officinalis': {
      kind: 'entry',
      title: 'Euphrasia officinalis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Euphrasia_officinalis&oldid=1376433957',
      accessed: '2026-10-11',
    },
    'wikipedia-fennel': {
      kind: 'entry',
      title: 'Fennel',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fennel&oldid=1377739518',
      accessed: '2026-10-11',
    },
    'wikipedia-fenugreek': {
      kind: 'entry',
      title: 'Fenugreek',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fenugreek&oldid=1367888200',
      accessed: '2026-10-11',
    },
    'wikipedia-fern': {
      kind: 'entry',
      title: 'Fern',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fern&oldid=1372763744',
      accessed: '2026-10-11',
    },
    'wikipedia-fig': {
      kind: 'entry',
      title: 'Fig',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fig&oldid=1379306713',
      accessed: '2026-10-11',
    },
    'wikipedia-fir': {
      kind: 'entry',
      title: 'Fir',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fir&oldid=1372903634',
      accessed: '2026-10-11',
    },
    'wikipedia-flax': {
      kind: 'entry',
      title: 'Flax',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Flax&oldid=1379532339',
      accessed: '2026-10-11',
    },
    'wikipedia-fumaria-officinalis': {
      kind: 'entry',
      title: 'Fumaria officinalis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fumaria_officinalis&oldid=1343825607',
      accessed: '2026-10-11',
    },
    'wikipedia-garlic': {
      kind: 'entry',
      title: 'Garlic',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Garlic&oldid=1377107391',
      accessed: '2026-10-11',
    },
    'wikipedia-ginger': {
      kind: 'entry',
      title: 'Ginger',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ginger&oldid=1375500055',
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
    'wikipedia-marasmius-oreades': {
      kind: 'entry',
      title: 'Marasmius oreades',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Marasmius_oreades&oldid=1377560508',
      accessed: '2026-10-11',
    },
    'wikipedia-matricaria-chamomilla': {
      kind: 'entry',
      title: 'Matricaria chamomilla',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Matricaria_chamomilla&oldid=1375671188',
      accessed: '2026-10-11',
    },
    'wikipedia-myosotis': {
      kind: 'entry',
      title: 'Myosotis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Myosotis&oldid=1372116909',
      accessed: '2026-10-11',
    },
    'wikipedia-narcissus-plant': {
      kind: 'entry',
      title: 'Narcissus (plant)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Narcissus_(plant)&oldid=1376317795',
      accessed: '2026-10-11',
    },
    'wikipedia-oenothera-biennis': {
      kind: 'entry',
      title: 'Oenothera biennis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Oenothera_biennis&oldid=1365729277',
      accessed: '2026-10-11',
    },
    'wikipedia-origanum-dictamnus': {
      kind: 'entry',
      title: 'Origanum dictamnus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Origanum_dictamnus&oldid=1354661277',
      accessed: '2026-10-11',
    },
    'wikipedia-palmaria-palmata': {
      kind: 'entry',
      title: 'Palmaria palmata',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Palmaria_palmata&oldid=1378649384',
      accessed: '2026-10-11',
    },
    'wikipedia-papaver-rhoeas': {
      kind: 'entry',
      title: 'Papaver rhoeas',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Papaver_rhoeas&oldid=1375086318',
      accessed: '2026-10-11',
    },
    'wikipedia-pelargonium': {
      kind: 'entry',
      title: 'Pelargonium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Pelargonium&oldid=1363180672',
      accessed: '2026-10-11',
    },
    'wikipedia-piper-cubeba': {
      kind: 'entry',
      title: 'Piper cubeba',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Piper_cubeba&oldid=1369767548',
      accessed: '2026-10-11',
    },
    'wikipedia-plumeria-rubra': {
      kind: 'entry',
      title: 'Plumeria rubra',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Plumeria_rubra&oldid=1379251577',
      accessed: '2026-10-11',
    },
    'wikipedia-primula-veris': {
      kind: 'entry',
      title: 'Primula veris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Primula_veris&oldid=1357773685',
      accessed: '2026-10-11',
    },
    'wikipedia-rumex': {
      kind: 'entry',
      title: 'Rumex',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rumex&oldid=1336999658',
      accessed: '2026-10-11',
    },
    'wikipedia-sambucus': {
      kind: 'entry',
      title: 'Sambucus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sambucus&oldid=1377321453',
      accessed: '2026-10-11',
    },
    'wikipedia-scrophularia-nodosa': {
      kind: 'entry',
      title: 'Scrophularia nodosa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Scrophularia_nodosa&oldid=1379630233',
      accessed: '2026-10-11',
    },
    'wikipedia-succisa-pratensis': {
      kind: 'entry',
      title: 'Succisa pratensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Succisa_pratensis&oldid=1372080561',
      accessed: '2026-10-11',
    },
    'wikipedia-symphytum-officinale': {
      kind: 'entry',
      title: 'Symphytum officinale',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Symphytum_officinale&oldid=1369812911',
      accessed: '2026-10-11',
    },
    'wikipedia-tanacetum-parthenium': {
      kind: 'entry',
      title: 'Tanacetum parthenium',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tanacetum_parthenium&oldid=1375005358',
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
    'wikipedia-ulmus-glabra': {
      kind: 'entry',
      title: 'Ulmus glabra',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ulmus_glabra&oldid=1379255265',
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
          source: 'wikipedia-carphephorus-odoratissimus',
          supports: ['canonicalName', 'nomenclature'],
        },
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
    {
      name: "Devil's-Bit Scabious",
      canonicalName: 'Succisa pratensis',
      nomenclature: 'botanical',
      description:
        "Devil's-bit scabious is a perennial wildflower of the honeysuckle family, once placed with the teasels. It is common across the British Isles and western and central Europe and reaches east into central Asia, on heaths, damp unimproved grassland and chalk or limestone turf, always on poor soils; it has been brought to eastern North America. It can top a metre but is often far smaller. A rosette of lance-shaped leaves, sometimes blotched with purple, sends up slender stems ending in tight, domed heads of thirty to fifty bluish-violet flowers, now and then pink or white, much visited by hoverflies and fed on by the caterpillars of the marsh fritillary. Its name comes from the root, which ends abruptly as though bitten off: English belief held that the devil, angered by how many ills it cured, bit the end away. It was used against scabies and, says Kynes, in potions to undo the evil eye and illness sent by magic. Picking the flowers was thought in parts of England to call up the devil, Irish cows that grazed it were said to give creamy milk, and across Europe its flowers or leaves were worn against every kind of evil. Cunningham advises wearing it round the neck to drive off evil spirits and protect the wearer, and uses it to attract women and to bring luck.",
      elements: ['earth'],
      planets: ['Mercury', 'Venus'],
      zodiacSigns: ['Libra', 'Taurus'],
      folkNames: [
        'Ofbit',
        'Blue Bobs',
        'Blue Bonnets',
        'Blue Button',
        'Curl-Doddy',
        "Devil's Bit",
        'Scabious',
      ],
      categories: ['Love', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: "s.v. Devil's Bit",
          supports: ['folkNames', 'categories', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: "s.v. Devil's Bit Scabious",
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'wikipedia-succisa-pratensis',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The mature plant has a short, abruptly ended taproot that looks bitten off, the feature behind its name. Kynes dries a piece to keep on the altar as a talisman when facing adversity; Irish and Scottish belief held that grasping the root while saying the right chant would summon a brownie to do the housework.',
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Devil's Bit Scabious",
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-succisa-pratensis',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Kynes carries a pressed flower in a wallet for luck; in Europe the flowers were worn as an amulet against evil.',
          colors: ['blue', 'violet'],
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Devil's Bit Scabious",
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-succisa-pratensis',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Kynes sets out a small bowl of the seeds wherever negative energy needs clearing, and crushes a handful into defensive magic.',
          references: [
            {
              source: 'kynes-plants',
              locator: "s.v. Devil's Bit Scabious",
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dill',
      canonicalName: 'Anethum graveolens',
      nomenclature: 'botanical',
      description:
        'Dill, a graceful umbellifer in Northcote\'s words, stands about three feet tall on a single upright stem, with fine, thread-like, blue-green leaves and broad, flat umbels of yellow flowers that give way to small, flat, ribbed oval seeds. It is easily taken for its relative fennel, which branches into several stems, and it is close kin to anise and caraway too. "Dill weed" means the leaves. Leaf and seed are both widely used in cooking; Northcote, in 1903, notes the leaves eaten with fish and pickled with cucumbers. Kynes records that Egyptians and Scythians used dill in preparing and decorating their dead, linked by the Greeks to Dionysus and woven by the Romans into wreaths for Bacchus. In medieval Europe it went into love potions and was counted a magician\'s herb, worked in black magic yet also used to foil witches: a cup of dill tea was thought to strip a witch of her power, and in Germany bunches hung in byres at Walpurgis and fed to cattle kept witches and evil spirits away. Cunningham hangs it over the door so that no one envious or ill-disposed can enter, lays it in a cradle to guard a child, carries it in protective sachets and adds it to the bath to make the bather irresistible.',
      elements: ['fire', 'air'],
      planets: ['Mercury'],
      zodiacSigns: ['Cancer', 'Gemini', 'Leo', 'Scorpio', 'Virgo'],
      safetyNotes:
        'AHPA safety class 1 (can be safely consumed when used appropriately), with no known contraindications or drug interactions; it notes that dill is a diuretic. Allergic reactions, including contact dermatitis confirmed by patch testing, have been reported. No concerns were found for pregnancy, but safety in pregnancy has not been conclusively established, and Kynes advises avoiding medicinal concentrations while pregnant (culinary amounts such as dill pickles are fine). Cunningham codes it as currently recognised as safe.',
      folkNames: [
        'Aneton',
        'Dill Weed',
        'Dilly',
        'Garden Dill',
        'Chebbit',
        'Sowa',
        'Keper',
        'Hulwa',
        'Buzzalchippet',
        'European Dill',
        'Dillseed',
      ],
      deities: ['Adonis', 'Bacchus', 'Dionysus'],
      categories: [
        'Protection',
        'Lust',
        'Love',
        'Banishing',
        'Creativity',
        'Divination',
        'Manifestation',
        'Prosperity',
        'Purification',
      ],
      references: [
        {
          source: 'wikipedia-dill',
          supports: ['canonicalName', 'nomenclature'],
        },
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dill; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 's.v. Dill',
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
          locator: 'pp. 61–62; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 212–213',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 23–24',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 61',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dill',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The seeds taste like caraway but are smaller, flatter and lighter. Northcote reports the belief that the name comes from a Norse word meaning to dull, because the seeds were given to babies to send them to sleep, and in India they have traditionally been taken to encourage milk in nursing mothers. Because the plant sets so much seed, Cunningham uses dill in money spells.',
          references: [
            {
              source: 'northcote-herbs',
              locator: 'p. 23',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 61–62',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dill',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 213',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Kynes places a couple of the flower heads in a workspace to encourage creativity, and on the altar to support divination.',
          colors: ['yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dill',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description: 'Kynes uses the essential oil to purify ritual and magical tools.',
          safetyNotes:
            'In laboratory tests, dill leaf and seed essential oils caused dose-dependent chromosome damage in human lymphocytes and were toxic to those cells.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dill',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 62',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dittany of Crete',
      canonicalName: 'Origanum dictamnus',
      nomenclature: 'botanical',
      description:
        'Dittany of Crete is a low herb that spreads into mounds about a foot high and twice as broad. Its rounded, downy leaves are aromatic and now and then mottled with purple, and its tiny two-lipped flowers, greenish and pink to purple, hang in clusters that look like hops. The Romans pictured Juno, in her role as Lucina, the guardian of childbirth, wearing a circlet of it. In Crete and mainland Greece, dittany growing on a grave was a sign that the dead person rested in peace, and on Crete a gift of it was a weighty pledge of love, because it grew in remote places that were hard to reach. English and European legend told that deer wounded by arrows ate it to force the shafts out. Because it gives off thick smoke when burned, European magicians used it to call up spirits and also to drive evil ones away; sorcerers burned it while scrying, for a glimpse of the future and a line to the otherworld, and garlands of it were worn to sharpen clairvoyance. Cunningham keeps the smoke at the centre of its use: burned in a censer, it makes a base for spirits to manifest, the wraiths showing themselves in the rising smoke, and mixed in equal parts with vanilla, benzoin and sandalwood it makes an incense for astral projection. He also has its juice rubbed on the skin to keep venomous creatures away.',
      elements: ['water'],
      planets: ['Venus', 'Moon', 'Sun'],
      zodiacSigns: ['Gemini', 'Libra'],
      folkNames: ['Hop Marjoram', 'Wintersweet'],
      deities: ['Aphrodite', 'Artemis', 'Diana', 'Juno', 'Osiris', 'Pan', 'Persephone', 'Venus'],
      categories: ['Divination', 'Love', 'Psychic Work'],
      references: [
        {
          source: 'wikipedia-origanum-dictamnus',
          supports: ['canonicalName', 'nomenclature'],
        },
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dittany of Crete',
          supports: ['elements', 'planets', 'categories', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Dittany',
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
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'Kynes sells the leaves cut and dried, and burns a pinch of them as incense when working with spirits.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dittany',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The dried flowers are sold cut, with the leaves. At Samhain, Kynes scatters the two together on the altar and towards the four directions of the circle as an aid to reaching the ancestors.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dittany',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dock',
      canonicalName: 'Rumex',
      nomenclature: 'botanical',
      description:
        'Dock is the name given to a widespread group of broad-leaved wayside weeds in the genus Rumex, which also holds the sorrels, and in the family Polygonaceae, to which rhubarb belongs. Older botanists put the docks in a genus of their own, Lapathum, from a Greek word for cleansing, after their use as purges. A dock plant has large leaves at its base and smaller ones up branching flower stalks about three feet tall, which carry dense whorls of drooping flowers, light green to pinkish. Each flower ripens into a papery, heart-shaped, rusty-brown pod holding a single seed. Like rhubarb, the docks are rich in tannin and have astringent roots, and the young leaves and shoots of several species can be cooked as a pot-herb, though they taste poor and are slightly laxative. Their lore is crowded with the fair folk: the Anglo-Saxons used dock against elf shot, the unseen weapon by which elves were thought to bring disease; in Scotland bitter dock went into charms to undo faery spells laid on children; and the trows of Orkney were said to ride its stems like horses. In Ireland a woman who wanted a child wore a bag of dock seeds tied to her left arm, a charm Cunningham repeats, and young Irish women used dooryard dock to divine whom they would marry. Culpeper, quoted by Grieve, put all the docks under Jupiter.',
      elements: ['air'],
      planets: ['Jupiter'],
      safetyNotes:
        'Cunningham advises against taking dock internally for anyone with kidney stones, and AHPA likewise urges caution for people with a history of them. Yellow dock contains oxalic acid: a man died of oxalate poisoning after eating about a kilogram of yellow dock, and sheep grazing on its leaves have been poisoned. Its safety in pregnancy and while nursing has not been conclusively established.',
      categories: ['Healing', 'Fertility', 'Divination', 'Love', 'Prosperity', 'Protection'],
      references: [
        {
          source: 'wikipedia-rumex',
          supports: ['canonicalName', 'nomenclature'],
        },
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dock; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Dock',
          supports: ['elements', 'planets', 'categories', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 758–759',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'grieve-docks',
          supports: ['canonicalName', 'nomenclature', 'planets', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          safetyNotes:
            'AHPA places the root of yellow dock and broad-leaf dock in safety class 1. It is 12 to 20% tannin and holds small amounts of anthraquinone glycosides, but its laxative effect is mild at most.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 758',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dock',
              supports: ['form'],
            },
            {
              source: 'grieve-docks',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The seeds go into money spells and money incenses, and an infusion of them is sprinkled around a place of business to bring in customers. Tied to a woman’s left arm, they are said to help her conceive.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dock',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dock',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            "Young dock leaves can be cooked as a pot-herb, though they are not very palatable and are slightly laxative. Grieve records the leaves of the round-leaved dock used as a country remedy for burns, blisters and nettle stings, the last with a rhyme that gave rise to the saying 'In dock, out nettle'.",
          references: [
            {
              source: 'grieve-docks',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'For protection, Kynes cuts a long flower stalk and carries it before her around the edge of the property, or through each room of a flat, then leaves it by the front door until the flowers dry and burns them at the next full moon.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dock',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dodder',
      canonicalName: 'Cuscuta europaea',
      nomenclature: 'botanical',
      description:
        "Greater or European dodder is a parasite with neither leaves nor working roots: a tangle of long, thin, yellowish or reddish stems that twine over other plants and feed on them. Its seed sprouts in the soil like any other, but once the young stem has fastened itself to a host with small suckers, its first root dies away and the plant lives wholly on the host's sap. It grows on nettles, thistles, hops, beans, lucerne and many other herbs, carrying small, bell-shaped flowers in tight round heads. Native to Europe, it also grows in North Africa, western Asia and the Himalayas, and has been introduced to North America. The genus name came to botany through an Arabic word. Because it can smother and ruin crops, farmers gave it hard names, among them hellweed, strangle tare, devil's guts and scaldweed, for the scorched look it leaves on a bean field. It was used medicinally in ancient China and Greece and in medieval Europe, and in Asia, where it seemed to appear from nowhere like mistletoe, it was held almost sacred and carried as a charm and an aphrodisiac. In the Ozarks it served love potions and love divination, a use magical practice keeps: a strand is plucked and thrown back over the shoulder on to its host, and if it has taken hold again by the next day, the love is returned.",
      elements: ['water'],
      planets: ['Saturn'],
      safetyNotes:
        'Cunningham marks dodder not to be taken internally in pregnancy or by anyone with depression, and warns that it may cause nausea and vomiting.',
      folkNames: [
        'Beggarweed',
        "Devil's Guts",
        'Fireweed',
        'Hellweed',
        "Lady's Laces",
        'Love Vine',
        'Scaldweed',
        'Strangle Tare',
        "Witches' Hair",
        "Angel's Hair",
        "Devil's Net",
        "Venus's Hair",
        "Witches' Shoelaces",
        'Greater Dodder',
        'European Dodder',
      ],
      categories: ['Love', 'Divination', 'Binding'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dodder; p. 266',
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
          locator: 's.v. Dodder',
          supports: ['elements', 'planets', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'grieve-dodder',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-cuscuta-europaea',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Stem',
          description:
            'The thread-like stems, the "laces", are gathered by the handful and used as cords in knot magic, with the knots tied loosely.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dodder',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dodder',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cuscuta-europaea',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The seeds are sold whole or powdered. To turn back magic worked against you, a cupful is held between the hands outdoors while an incantation is spoken or sung, then cast away while turning in a circle.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dodder',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dogbane',
      canonicalName: 'Apocynum androsaemifolium',
      nomenclature: 'botanical',
      description:
        "Spreading dogbane, also called fly-trap dogbane, is a perennial herb of North America, common across Canada and most of the United States and reaching into north-east Mexico. It grows in woods and along their edges, on prairies, in meadows and fields, and favours dry soil at low to middle elevations. It stands twenty to thirty centimetres tall, now and then half a metre, on branching, hairless stems that bleed a milky sap when broken, with pointed oval leaves that are hairy beneath. Pairs of pink flowers open at the tips of the stalks from June to September and give way to paired pods, roughly twelve to eighteen centimetres long, packed with silky-haired seeds. The genus name joins Greek words for 'away from' and 'dog', after its poisonous effect on dogs, and animals in general leave it alone. Native Americans put it to many uses: as medicine for a long list of complaints, the Ojibwe taking the root during the medicine lodge ceremony, and its strong stem fibres as sewing thread. Medical writers of the late nineteenth and early twentieth centuries recorded that it nearly always caused nausea or vomiting and heavy sweating and acted powerfully on the heart. Its magical use is narrow: Cunningham gives it one power, love, and puts its flowers in love mixtures.",
      safetyNotes: 'Cunningham marks dogbane as not recommended for internal use.',
      folkNames: [
        'Rheumatism Weld',
        'Wild Ipecac',
        'Spreading Dogbane',
        'Common Dogbane',
        'Fly-trap Dogbane',
      ],
      categories: ['Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dogbane; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 74',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-apocynum-androsaemifolium',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description: 'The flowers are added to love mixtures.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dogbane',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            'The root is the part AHPA reviews. The Ojibwe and the Forest Potawatomi used it medicinally, and the Ojibwe took it during the medicine lodge ceremony.',
          safetyNotes:
            'AHPA safety class 3: to be used only under the supervision of an expert qualified in its use. It contains cardiac glycosides, so caution is advised for anyone taking heart medication. It acts as an emetic and a diuretic and may irritate the digestive tract and cause nausea, vomiting and heavy sweating; older medical texts say it acts powerfully on the heart, slowing it. Use in pregnancy is not recommended except under the supervision of a qualified healthcare practitioner, and its safety while nursing has not been established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 74; p. xxii',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-apocynum-androsaemifolium',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dogwood',
      canonicalName: 'Cornus florida',
      nomenclature: 'botanical',
      description:
        "Flowering dogwood is a small deciduous tree of eastern North America and northern Mexico, reaching about ten metres and often spreading wider than it is tall. Its oval leaves turn a deep red-brown in autumn. What look like four large white petals in spring are in fact bracts, notched at the tip, which ring a tight head of tiny greenish-yellow flowers; some garden cultivars carry pink or almost red bracts. Clusters of bright red berries follow in late summer and feed many birds, though they are poisonous to people. The hard, dense wood has made mallets, tool handles, golf club heads and butcher's blocks, the tree has given inks and scarlet dyes, and Native American peoples used its bark, root bark and flowers as medicine, the Houma against malaria. Its name may come from its use in treating dogs with mange. It is the state tree and flower of Virginia. Folklore has long credited dogwoods with strong protective power: in the Balkans dogwood was worn as an amulet and laid in cradles to keep witches away, and in parts of Spain its branches served as divining rods. In medieval Germany a handkerchief dipped in dogwood sap and carried on Midsummer's Day was believed to make a wish come true, a charm Cunningham sets on Midsummer Eve, and its leaves or wood go into protective amulets.",
      elements: ['air', 'earth'],
      planets: ['Mars', 'Moon'],
      safetyNotes: 'Cunningham codes dogwood as currently recognised as safe.',
      folkNames: [
        'Boxwood',
        'Budwood',
        'Dogtree',
        'Florida Dogwood',
        'Flowering Cornel',
        'Flowering Dogwood',
        'Green Osier',
        'Virginia Dogwood',
        'American Boxwood',
        'False Box',
        'Pegwood',
        'American Dogwood',
        'Indian Arrowwood',
        'Cornelian Tree',
        'White Cornel',
        'White Dogwood',
        'False Boxwood',
      ],
      categories: [
        'Protection',
        'Banishing',
        'Creativity',
        'Healing',
        'Inspiration',
        'Fidelity',
        'Manifestation',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dogwood; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Dogwood',
          supports: ['elements', 'planets', 'folkNames', 'categories', 'description'],
        },
        {
          source: 'wikipedia-cornus-florida',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'Leaves go into protective amulets, and a handful laid under the welcome mat raises protective energy for the home.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dogwood',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dogwood',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Sap',
          description:
            'Sap put on a handkerchief on Midsummer Eve, and the handkerchief carried faithfully, is said to grant a wish.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dogwood',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Dogwood',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            "The wood, hard and dense, is used in place of the leaves in protective amulets, and in daily life for mallets, tool handles and butcher's blocks.",
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dogwood',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-cornus-florida',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Fruit',
          description:
            'Clusters of small bright red drupes that ripen in late summer and early autumn.',
          safetyNotes: 'Kynes warns that the fruit of the flowering dogwood is not edible.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Dogwood',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-cornus-florida',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Dulse',
      canonicalName: 'Palmaria palmata',
      nomenclature: 'botanical',
      description:
        'Dulse is a red seaweed, an alga once classed as Rhodymenia palmata, whose flat, rather leathery fronds, deep rose to reddish purple, divide into broad lobes up to half a metre long. It clings by a small disc-shaped holdfast to rocks or to the stalks of kelp, from the middle of the tidal zone down to twenty metres or more, along northern Atlantic and Pacific shores: Atlantic Europe from Portugal to the Baltic, Iceland and the Faroes, Arctic and Atlantic Canada, Alaska, Japan and Korea. Gathered by hand at low tide, chiefly from June to September, it is shaken free of snails and shell, spread to dry, and then eaten as it is, ground to flakes or powder, or cooked. Ireland has prized it since early times: an early medieval law text counted a serving of dulse among the hospitality owed to any traveller and valued a rock bearing a crop of it as highly as three cows. It is still sold dried as a seaside snack along the Ulster coast and at the Ould Lammas Fair in Ballycastle, and in Iceland it was long an important source of fibre. In magic it belongs to the sea and the Moon: it is added to drinks to stir lust, sprinkled round the house to encourage harmony, thrown on the waves to placate the spirits of the sea, and tossed from high places to reach the spirits of the wind.',
      elements: ['water'],
      planets: ['Moon'],
      safetyNotes:
        'AHPA safety class 2d: not for use by anyone with hyperthyroidism. Seaweeds can carry heavy metal residues, and total arsenic has been measured at 5 to 12 ppm in dulse products. No concerns for pregnancy or nursing were identified, but safety in either has not been conclusively established. Cunningham marks dulse not to be taken internally with hyperthyroidism, and not to be overused or taken internally over the long term.',
      folkNames: ['Dillisk', 'Dilsk', 'Red Dulse', 'Sea Lettuce Flakes', 'Creathnach'],
      categories: ['Lust', 'Harmony'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Dulse; p. 266',
          supports: ['elements', 'planets', 'categories', 'safetyNotes', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 618; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes', 'description'],
        },
        {
          source: 'wikipedia-palmaria-palmata',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 618',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Dulse',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Echinacea',
      canonicalName: 'Echinacea',
      nomenclature: 'botanical',
      description:
        "Echinacea is a genus of drought-tolerant perennial herbs in the daisy family, Asteraceae, whose nine or ten species go by the name coneflower. They are found only in eastern and central North America, east of the Rocky Mountains, from Saskatchewan almost to the Gulf of Mexico, on wet to dry prairies and in open woodland. The plants reach up to about 140 cm, most from a taproot, with rough and usually hairy leaves. In summer each long stalk ends in a single large head of florets, usually rose-coloured and only rarely yellow or white, set around a raised centre; the outer rays bend downwards as the head opens, which gives the cone of the common name, and the cone's spiny scales gave the genus its name, from the Greek for hedgehog. Grieve describes the flowers of the narrow-leaved species as a rich purple. Linnaeus first placed the plant in Rudbeckia, a name it still carries as a folk name, before Moench gave it a genus of its own in 1794. Indigenous peoples of North America used it as a remedy, chewing the roots and applying it to bites, burns and wounds; modern research finds the evidence for its benefit weak or inconclusive. Harvesting from the wild for the herbal trade threatens natural populations. Cunningham records that American Indians offered it to the spirits to make their spells surer and stronger.",
      safetyNotes:
        'Cunningham marks echinacea as recognised as safe, and AHPA puts the Echinacea species in safety class 1. Allergic reactions can occur in susceptible people; those reported include anaphylaxis and asthma attacks. Commission E advises against its use in systemic and autoimmune diseases such as tuberculosis, multiple sclerosis and HIV infection, though AHPA notes that this concern is theoretical. Limited human data have raised no safety concern in pregnancy, and its safety while nursing has not been conclusively established.',
      folkNames: ['Black Sampson', 'Coneflower', 'Rudbeckia'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Echinacea; p. 266',
          supports: ['folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 321–322',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'grieve-echinacea',
          supports: ['folkNames', 'description'],
        },
        {
          source: 'wikipedia-echinacea',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 321',
              supports: ['form'],
            },
            {
              source: 'grieve-echinacea',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          safetyNotes:
            'Allergic reactions are most likely with products made from the flowers or flowering tops, perhaps because of the pollen in them, since allergies to the pollens of the daisy family are common.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 321',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Edelweiss',
      canonicalName: 'Leontopodium nivale',
      nomenclature: 'botanical',
      description:
        "Edelweiss is a small mountain flower of the daisy family, Asteraceae, whose German name means 'noble white'. It grows on limestone rock and scree at about 1,800 to 3,400 metres in the Alps, the Pyrenees, the Apennines and parts of the Balkans. Its leaves and flowers are clothed in dense white wool that shields the plant from cold, drought and ultraviolet light. Each flowering stalk, three to twenty centimetres tall in the wild, carries five or six tight clusters of small yellow florets ringed by felted white bracts in a double star, and blooms from July to September. Alpine folk medicine took it for stomach pains and other complaints, which earned it the name bellyache flower, and it kept well in dried bouquets. In the nineteenth century it became the emblem of the Alps and of mountaineers, the badge of Austro-Hungarian mountain troops and a symbol of Empress Elisabeth of Austria, and overpicking led to its protection in many places. A Swiss legend makes it a young woman who died of loneliness on a snowy summit; a man who climbed to pick it for his sweetheart proved his devotion, and giving it to a loved one is a promise of dedication. Owning one was thought lucky. In Tyrol a wreath of it made the wearer invisible, it served as a charm against lightning, and in Germany a flower wrapped in white linen in the pocket turned aside bullets and daggers.",
      elements: ['fire'],
      planets: ['Jupiter'],
      zodiacSigns: ['Leo'],
      folkNames: [
        'Snow Flower',
        'Alpine Cudweed',
        'Glacier Queen',
        'Lion Foot',
        'Wool Flower',
        'Bellyache Flower',
      ],
      categories: ['Love', 'Fidelity', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Edelweiss',
          supports: ['description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Edelweiss',
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
          source: 'wikipedia-edelweiss',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['white', 'yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Edelweiss',
              supports: ['form', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Edelweiss',
              supports: ['form'],
            },
            {
              source: 'wikipedia-edelweiss',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Whole',
          description:
            'Against daggers and bullets, Cunningham pulls up a whole edelweiss, roots and all, by day on a Friday when the moon is full, and wears it wrapped in white linen. He adds that simply growing and tending the plant grants the heart’s desire.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Edelweiss',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Kynes lists the seeds for sale and puts them with dried flowers in a small sachet carried as a good-luck charm.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Edelweiss',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Elder',
      canonicalName: 'Sambucus',
      nomenclature: 'botanical',
      description:
        "Elder is the everyday name for Sambucus, a genus of twenty to thirty species now placed in the family Viburnaceae, with wild members across Eurasia, the Americas, Africa and Australia. Kynes describes the familiar elders as large shrubs with oval leaves and flat, umbrella-like heads of tiny white flowers, up to ten inches across, that ripen into heavy hanging bunches of bluish-black berries; the American elder's flowers smell of lemon and the European's are musky. The flowers flavour cordials and liqueurs, the berries of most species are eaten cooked, and the intensely blue-purple juice serves as a food colouring and a dye. The genus takes its name from a Greek wind instrument, since the pithy twigs hollow out easily, and hollowed twigs have been made into flutes. Folklore clings to every part of the tree. A spirit was thought to live inside it, Frau Ellhorn in Germany and Hyldemoer, the Elder Mother, in Denmark, and her leave was asked, kneeling, before any wood was cut; the red sap was said to be the tree bleeding. In England the elder came to be linked with witches and black magic, yet across Europe it was hung up or planted to keep witches, evil and lightning from the house, worn against attackers, and brought to weddings for luck.",
      elements: ['water', 'air', 'earth', 'fire'],
      planets: ['Venus', 'Mercury'],
      safetyNotes:
        'The leaf, bark, seed and raw unripe fruit of elder species contain sambunigrin, a cyanogenic glycoside that may cause vomiting or severe diarrhoea if swallowed; cooking or drying lowers the amount. Nausea, vomiting, abdominal cramps and weakness followed one improperly prepared juice made from the fruit, leaves and branches of wild elder. Cunningham marks every part except the ripe fruit as not recommended for internal use.',
      folkNames: [
        'Alhuren',
        'Battree',
        'Boure Tree',
        'Bour Tree',
        'Eldrum',
        'Ellhorn',
        'Hylder',
        'Lady Ellhorn',
        'Old Gal',
        'Old Lady',
        'Pipe Tree',
        'Rob Elder',
        'Sweet Elder',
        'Tree of Doom',
      ],
      deities: [
        'Holda',
        'Venus',
        'Boann',
        'Dagda',
        'Danu',
        'Freya',
        'Freyr',
        'Gaia',
        'Rhea',
        'Vulcan',
      ],
      categories: [
        'Protection',
        'Healing',
        'Prosperity',
        'Sleep',
        'Abundance',
        'Banishing',
        'Creativity',
        'Dream Work',
        'Love',
        'Fidelity',
        'Purification',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Elder, American; p. 266',
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
          locator: 's.v. Elder',
          supports: ['elements', 'planets', 'deities', 'categories', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 776–778; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 183–184',
          supports: ['description'],
        },
        {
          source: 'wikipedia-sambucus',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Berry',
          description:
            'Carried, the berries are said to guard against evil and negativity, and a few beneath the pillow to bring peaceful sleep; Kynes adds dried berries to a pillow sachet for sleep and dream work and puts them in love charms.',
          safetyNotes:
            'AHPA safety class 1 for the ripe fruit, a food and drink ingredient, with no known contraindications or drug interactions; its safety in pregnancy and while nursing has not been conclusively established. Cunningham codes the ripe fruit as currently recognised as safe.',
          colors: ['black'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 777–778',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Elder, American; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Elder',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Cunningham says the white flowers made the elder sacred to many mother-goddess figures, and Kynes sets a picture of them on the altar to honour the Crone. Extracts of the cooked flowers are traditionally used to flavour drinks.',
          safetyNotes:
            'AHPA safety class 1 for the flower, with no known contraindications or drug interactions; its safety in pregnancy and while nursing has not been conclusively established.',
          colors: ['white'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 776',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Elder, American',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Elder',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Magicians have long cut wands from elder wood, and its branches make flutes to call spirits. Many fear to burn it, and in Oxfordshire burning it was thought to bring bewitchment. Sticks kept about the house guard against robbers and snakes; Northcote records a tradition that the Elder Mother gave a child laid in an elder-wood cradle no peace until it was lifted out.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Elder, American',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Elder',
              supports: ['form', 'description'],
            },
            {
              source: 'northcote-herbs',
              locator: 'p. 184',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Elecampane',
      canonicalName: 'Inula helenium',
      nomenclature: 'botanical',
      description:
        "Elecampane is a stiff, tall herb of the daisy family, native from Spain across Eurasia to Xinjiang and naturalised in parts of North America. Its stem rises to between one and two metres, with large, toothed leaves, woolly and whitish beneath, and in summer it carries broad yellow flower heads with a tangle of narrow rays, like a shaggy daisy. The thick, branching root is bitter, with a camphor-like smell touched with violet. The species name recalls Helen of Troy: the plant was said to have sprung where her tears fell, or to have filled her hands when Paris carried her off. Theophrastus prescribed it in oil and wine against bites, Pliny named the root as medicine and condiment, and in medieval Europe the root was candied as a sweetmeat. Long tied to elves and faeries, it was once called elfwort, and the Anglo-Saxons used it against elf-shot, the invisible weapon elves were thought to wound with. On Guernsey it went into love charms gathered on Midsummer Eve, mixed with ambergris and worn over the heart for nine days, and in the Balkans it was sewn into children's clothes against witches. Cunningham wears it to draw love, carries it for protection, and smoulders it on charcoal to sharpen psychic powers, especially in scrying.",
      elements: ['air'],
      planets: ['Mercury', 'Jupiter'],
      safetyNotes:
        "AHPA safety class 1 for the root, with no known contraindications or drug interactions. People allergic to other daisy-family plants (Asteraceae), such as feverfew, chamomile or echinacea, should take care, as cross-reactions are common; allergic reactions, mainly contact dermatitis, have been reported, and its compounds are relatively common skin sensitisers. AHPA notes it as an emmenagogue; one British herbal text advises against it in pregnancy and nursing without giving a reason, though AHPA's editors judge it generally safe for both. Cunningham advises against taking it internally when pregnant or nursing, or in high doses.",
      folkNames: [
        'Alycompaine',
        'Elf Dock',
        'Elfwort',
        'Horseheal',
        'Nurse Heal',
        'Scabwort',
        'Velvet Dock',
        'Wild Sunflower',
        'Sun Flower',
      ],
      categories: [
        'Love',
        'Protection',
        'Psychic Work',
        'Communication',
        'Divination',
        'Healing',
        'Intuition',
        'Peace',
        'Purification',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Elecampane; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 's.v. Elecampane',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 474; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 56–57',
          supports: ['description'],
        },
        {
          source: 'wikipedia-elecampane',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          safetyNotes:
            'Large doses may cause vomiting, diarrhoea, cramping and symptoms of paralysis.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 474',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Elecampane',
              supports: ['form'],
            },
            {
              source: 'wikipedia-elecampane',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Cunningham sews the leaves or flowers into pink cloth, or a sachet, to wear for love; Kynes carries a small sachet of dried flowers to help mend a troubled friendship.',
          colors: ['yellow'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Elecampane',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Elecampane',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-elecampane',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Kynes anoints the headboard of the bed with the essential oil, or an oil infused with the root, to help resolve sexual difficulties between partners.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Elecampane',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Elm',
      canonicalName: 'Ulmus glabra',
      nomenclature: 'botanical',
      description:
        "The wych elm, also called Scots elm, ranges more widely than any other European elm: from Ireland east to the Urals and from the Arctic Circle south to the Peloponnese and Sicily, with outposts in the Caucasus, Turkey, Syria and Iran. It is a large deciduous tree of hill country, climbing to 1,500 metres where the soil is moist and the air damp, and it can grow forty metres tall. Its young shoots are tough and supple and lack the corky wings of many elms; the word wych itself comes from an Old English word for pliant. Once the commonest elm of northern and western Britain, it is the only elm whose native status there is beyond dispute. It sends up no suckers and spreads by seed alone, so with Dutch elm disease and deer eating the seedlings it has become uncommon across much of its former range. Kynes collects its lore: the Greeks linked elms with Morpheus, Virgil called the elm a tree of prophecy, and Greek, Roman and Celtic myth placed elms at the threshold of the otherworld or the faery realm. In Scotland a twig of wych elm laid beside the butter churn stopped fairies stealing the butter, and in Yorkshire wych elm tied to a horse's bridle protected the traveller. Cunningham carries elm to attract love and uses it against lightning.",
      elements: ['water', 'air', 'earth'],
      planets: ['Saturn', 'Mercury'],
      zodiacSigns: ['Capricorn'],
      folkNames: ['Wych Elm', 'Scots Elm', 'Hornbeam', 'Quicken', 'Witch Elm', 'Witchwood'],
      deities: [
        'Odin',
        'Ceres',
        'Cerridwen',
        'Danu',
        'Demeter',
        'Dionysus',
        'Gaia',
        'Juno',
        'Loki',
      ],
      categories: [
        'Love',
        'Divination',
        'Dream Work',
        'Healing',
        'Intuition',
        'Justice',
        'Legal Matters',
        'Manifestation',
        'Prophecy',
        'Protection',
        'Psychic Work',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Elm',
          supports: ['elements', 'planets', 'deities', 'categories', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Elm',
          supports: [
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
          source: 'wikipedia-ulmus-glabra',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'Craftsmen prize wych elm timber for its colour, its striking grain and its "partridge-breast" markings. Kynes keeps an elm twig on the altar through times of transition, to stand for and encourage renewal.',
          references: [
            {
              source: 'wikipedia-ulmus-glabra',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Elm',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'To raise healing energy, Kynes sets an elm leaf beneath a green candle and pictures a great tree spreading its branches over those who need help.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Elm',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'In eighteenth-century France the inner bark, sold as "pyramidal elm bark", had a brief reputation as a cure-all, taken as a powder, an extract or an elixir and even added to baths. It still appeared in a pharmacopoeia of 1893.',
          references: [
            {
              source: 'wikipedia-ulmus-glabra',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Endive',
      canonicalName: 'Cichorium endivia',
      nomenclature: 'botanical',
      description:
        "Endive is a leafy plant of the chicory genus, widely grown as one of the bitter-leaved vegetables sold as endive and escarole, and often confused with its relative, common chicory. Two main kinds are cultivated: curly endive, or frisée, and escarole, the broad-leaved endive, whose paler leaves are less bitter. Escarole goes raw into green salads or is cooked like other greens, sautéed or added to soups and stews; in southern Italy it is often smothered, and in Naples it is stuffed for Christmas. The leaves are rich in folate and in vitamins A and K. Northcote's 1903 Book of Herbs says that every kind must be blanched, passes on Mrs Roundell's warning that endive is troublesome to cook because insects crowd into it, and quotes Parkinson's praise of blanched endive as a winter salad. She regretted that a plant once credited with such powers had shrunk to a salad herb: it was said to break any bond, to make its owner invisible, and to let a lover who carried it persuade the lady of his choice that he had every quality she admired. Cunningham gathers it for magic on 27 June or 25 July, digging it up with a piece of gold or a stag's horn, a rule Northcote also reports. It is worn fresh as a talisman to draw love, renewed every three days, and served in salads to stir lust.",
      elements: ['air'],
      planets: ['Jupiter'],
      categories: ['Lust', 'Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Endive',
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
          source: 'northcote-herbs',
          locator: 'pp. 24–25, 182',
          supports: ['description'],
        },
        {
          source: 'wikipedia-cichorium-endivia',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
        {
          source: 'wikipedia-endive',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The leaves are the vegetable: eaten raw in salads or cooked like other greens. Cunningham wears fresh endive as a love talisman, replacing it every three days, and serves it in salads to stir lust.',
          references: [
            {
              source: 'wikipedia-endive',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Endive',
              supports: ['description'],
            },
            {
              source: 'northcote-herbs',
              locator: 'pp. 24–25',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            "De Gubernatis, as Northcote reports, found endive seed sold as a love philtre in Germany and in Rome, the plant being uprooted for this with a piece of gold or a stag's horn rather than by hand.",
          references: [
            {
              source: 'northcote-herbs',
              locator: 'p. 182',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Eucalyptus',
      canonicalName: 'Eucalyptus globulus',
      nomenclature: 'botanical',
      description:
        "The southern or Tasmanian blue gum is a tall evergreen tree of the family Myrtaceae, endemic to the south-east of Australia, where its four subspecies grow in New South Wales, Victoria and Tasmania. It usually reaches about 45 metres and, in ideal conditions, twice that. Its smooth bark peels away in large pieces, its narrow leaves run from blue-green to yellowish green, and its creamy white flowers are followed by woody, top-shaped capsules; the species name, from the Latin for a little ball, refers to that fruit. Proclaimed the floral emblem of Tasmania in 1962, it is now among the most widely planted eucalypts and has naturalised in Ireland, Spain, Portugal, southern Africa, New Zealand and the western United States. Its leaves are the world's main source of eucalyptus oil. Kynes writes that the Indigenous peoples of Australia hold the tree sacred, that its hollow branches still become didgeridoos, and that it belongs to the Dreaming, when ancestral spirits made the world. Cunningham's eucalyptus is a healing plant: its leaves fill healing poppets and are carried to keep well, and a sprig hung over a sickbed or leaves and pods ringed round a burning green candle are meant to drive off a cold. Kynes adds that its scent helps to let go of sorrow.",
      elements: ['water', 'air', 'earth'],
      planets: ['Moon', 'Mercury', 'Saturn', 'Sun'],
      zodiacSigns: ['Cancer', 'Pisces'],
      safetyNotes:
        "AHPA places eucalyptus leaf in safety class 1, herbs that can be safely consumed when used appropriately, with no known contraindications; it contains up to 11% tannins. No information on its safety in pregnancy or while nursing was found, so safety then has not been established. Cunningham's health codes say it should not be taken internally by anyone with liver problems or inflammatory disease of the bile ducts, and he warns against using it on the faces of small children.",
      folkNames: [
        'Blue Gum Tree',
        'Stringy Bark Tree',
        'Blue Gum Eucalyptus',
        'Fever Tree',
        'Gum Tree',
        'Southern Blue Gum',
        'Tasmanian Blue Gum',
        'Blue Gum',
      ],
      deities: ['Mercury', 'Selene', 'Venus'],
      categories: [
        'Healing',
        'Protection',
        'Ancestor Work',
        'Banishing',
        'Dream Work',
        'Psychic Work',
        'Purification',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Eucalyptus; p. 266',
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
          locator: 's.v. Eucalyptus',
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
          locator: 'pp. 348–349; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-eucalyptus-globulus',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The leaf is the working part. Cunningham stuffs healing poppets with the leaves and carries them for good health and for protection; Kynes lays a handful of dried leaves on the altar to help in reaching spirits.',
          safetyNotes:
            'An allergic reaction to the leaf, the worsening of asthma after drinking a leaf infusion, and vocal cord dysfunction after exposure to the leaf have been reported.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Eucalyptus',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Eucalyptus',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 348',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Pod',
          description:
            'The seed capsules are woody and top-shaped. Cunningham threads the unripe green pods on green thread and wears them against a sore throat, or tucks them under the pillow to ward off colds. Kynes sets the seedpods in a circle on the altar to honour the ancestors.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Eucalyptus',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Eucalyptus',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-eucalyptus-globulus',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Eucalyptus oil is steam-distilled from the leaves, and this species is the chief source of it worldwide, with China the largest producer. Its main constituent is cineole, which Cloez named eucalyptol in 1870. Kynes notes that Aboriginal Australians have used the oil as medicine for centuries.',
          safetyNotes:
            'AHPA places the essential oil in safety classes 2b and 2d: not to be taken internally in pregnancy except under the supervision of a qualified healthcare practitioner, and the recommended dose should not be exceeded. Being highly concentrated, it should not be used on the face, and especially the nose, of infants and young children. Poisoning has been reported after swallowing it, affecting the nervous, digestive, respiratory and circulatory systems, and similar symptoms have followed its use on the skin.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 349; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Eucalyptus',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-eucalyptus-globulus',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Evening Primrose',
      canonicalName: 'Oenothera biennis',
      nomenclature: 'botanical',
      description:
        'The common evening primrose is a biennial of the evening-primrose family, Onagraceae,, native to eastern and central North America and now established on every continent but Antarctica. In its first year it lies low as a rosette of leaves over a thick root; in its second it sends up a stem to about 1.6 metres, bearing yellow, four-petalled flowers that open quickly at dusk, last only until the next noon, and are followed by narrow capsules full of tiny seeds that can stay alive in the soil for seventy years. Kynes notes the faint glow of the petals on a dark night and suggests this is why the plant found its way into magic. The Cherokee, Apache and Ojibwe ate it and used it as medicine, colonists took up the habit, and it reached the gardens of Europe in the early seventeenth century. Its English name borrows from the true primrose, which its flower resembles. In France and Germany it was said to quieten savage animals, and because the root smells faintly of wine, European legend had it either undoing the effects of drink or bringing on a thirst for it; whether the genus name means wine-hunting or wine-scented is still argued. Cunningham records that Native Americans rubbed it on their moccasins and bodies for a good hunt and to keep snakes away.',
      elements: ['fire'],
      planets: ['Venus'],
      folkNames: [
        'War Poison',
        'Sundrop',
        'Tree Primrose',
        'Common Evening Primrose',
        'Evening Star',
        "King's Cure-All",
        'Night Light',
        'Primrose Tree',
        'German Rampion',
        'Hog Weed',
        'Fever-Plant',
      ],
      categories: [
        'Harmony',
        'Banishing',
        'Creativity',
        'Healing',
        'Nightmare Protection',
        'Protection',
        'Purification',
        'Success',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Yellow Evening Primrose',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Evening Primrose',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 604',
          supports: ['canonicalName', 'nomenclature'],
        },
        {
          source: 'wikipedia-oenothera-biennis',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'Kynes holds a leaf between the palms while meditating on a situation to find the truth of it, and burns a dried leaf in the cauldron to mark a new beginning. The leaves are eaten raw or cooked, and the Anishinaabe make a tea of them.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Evening Primrose',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-oenothera-biennis',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'A dried flower stalk, cut to length, serves Kynes as a wand for banishing. Young flowering stems are peeled and eaten raw or fried.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Evening Primrose',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-oenothera-biennis',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            'The thick root can be eaten raw or cooked like a potato. Its faint scent of wine lies behind the European legends that tied the plant to drinking.',
          references: [
            {
              source: 'wikipedia-oenothera-biennis',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Evening Primrose',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The tiny seeds hold about 24% oil and 15% protein, and are an important food for goldfinches, bobwhites and mourning doves.',
          safetyNotes:
            'AHPA places the seed in safety class 1, herbs that can be safely consumed when used appropriately, with no known contraindications or interactions.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 604; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-oenothera-biennis',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Evening primrose oil comes from the seed and is sold as a dietary supplement for its gamma-linolenic and linoleic acids, though there is not enough clinical evidence to support its use for any medical condition.',
          safetyNotes:
            'AHPA places the seed oil in safety class 1, and Cunningham codes it as currently recognised as safe. It is generally well tolerated; headache, abdominal pain, nausea and loose stools have been reported in trials. NCCIH calls it probably safe for most adults taken by mouth, with less known about children. It may be safe in pregnancy and while breastfeeding, but the evidence is not conclusive, and one retrospective study linked its use in pregnancy with more need for obstetric intervention during labour. Anyone taking medicine should consult a health care provider before using it.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'pp. 604–605; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Yellow Evening Primrose; p. 266',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'nccih-evening-primrose-oil',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-oenothera-biennis',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Eyebright',
      canonicalName: 'Euphrasia officinalis',
      nomenclature: 'botanical',
      description:
        "Eyebright is a small annual native to Europe, western Siberia, Turkey and the Transcaucasus, from a couple of inches to about ten inches tall, with deeply toothed leaves and white to lilac flowers striped with purple and marked with a yellow patch on the lower lip. It is a partial parasite: above ground it looks like any green plant, but its roots tap those of the grasses around it, which is why it will hardly grow in a garden. Its genus is named after Euphrosyne, the Grace of joy and mirth, perhaps for the gladness it was thought to bring to failing eyes; another story credits the linnet with first using the leaf to clear its young ones' sight. Grieve suspects the belief came from the doctrine of signatures, the purple and yellow streaks recalling bloodshot, diseased eyes. From the fourteenth century it was prized as an eye remedy, Elizabethan England drank eyebright ale, and Milton has the archangel Michael clear Adam's sight with it and rue. Kynes records that the Irish thought it beyond the reach of anything natural or supernatural and used it against fairy stroke and the evil eye, that in the late Middle Ages it was believed to give second sight, and that in Scotland a sprig in the pocket made people tell the truth. Cunningham drinks it as a tea to clear the mind and help the memory.",
      elements: ['air'],
      planets: ['Sun'],
      zodiacSigns: ['Aries', 'Gemini', 'Leo', 'Virgo'],
      safetyNotes:
        'AHPA places eyebright herb in safety class 1, herbs that can be safely consumed when used appropriately, with no known contraindications or side effects; it contains about 12% tannins. An animal study suggests it may alter blood sugar control, so people with diabetes are advised to watch their blood sugar closely and talk to a qualified healthcare practitioner before using it. No information on its safety in pregnancy or while nursing was found, so safety then has not been established. Cunningham codes it as currently recognised as safe.',
      folkNames: [
        'Euphrosyne',
        "Bird's Eye",
        'Eyewort',
        'Fairy Flax',
        'Joy Flower',
        'Euphrasy',
        'Casse-lunette',
        'Augentröst',
      ],
      categories: ['Psychic Work', 'Clarity', 'Divination', 'Dream Work', 'Intuition', 'Truth'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Eyebright; p. 266',
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
          locator: 's.v. Eyebright',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 'pp. 356–357; p. xxii',
          supports: ['safetyNotes'],
        },
        {
          source: 'grieve-eyebright',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 135; p. 193',
          supports: ['description'],
        },
        {
          source: 'wikipedia-euphrasia-officinalis',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          description:
            'The whole herb, gathered in flower and cut just above the root, is the part used. Cunningham brews it into a tea for a clear mind and good memory, lays the infusion on the eyelids with cotton pads, patiently, to bring on clairvoyance, and carries the herb to strengthen psychic powers or to find the truth of a matter. In Austrian folk medicine it was taken as a tea or laid on as a compress for the eyes and the gut.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Eyebright',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 356',
              supports: ['form'],
            },
            {
              source: 'grieve-eyebright',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-euphrasia-officinalis',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Before any psychic work, Kynes holds a couple of the flowers against the third eye for several minutes to clear the mind, and counts the plant especially useful in developing clairvoyance.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Eyebright',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fairy Ring Mushroom',
      canonicalName: 'Marasmius oreades',
      nomenclature: 'fungal',
      description:
        "The fairy ring mushroom is a small gilled fungus of lawns, meadows and even coastal dunes in Europe and North America, fruiting from May to November in Britain and all year round in warmer climates. Its cap, one to five centimetres across, starts bell-shaped and flattens with age while keeping a slight central bump; it is buff, tan or reddish, and changes colour markedly as it dries. The stem is pale and tough, and the widely spaced gills smell of cyanide and leave a white spore print. It comes up in clusters, arcs and rings: the living threads at the ring's edge make the grass there lusher and greener, while the spent ones inside leave a brown patch. In the British Isles such a ring was said to mark where the faeries had danced, and Kynes gathers it with the other mushrooms that folklore tied to lightning, witches, goblins and, in parts of Germany, fertility and love potions. It is a choice edible with a chewy texture and a meaty, spicy taste: the tough stems are cut off and the caps threaded on strings to dry, then used in soups, stews and even biscuits. Care is needed all the same, since it can be mistaken for the toxic Clitocybe dealbata and Clitocybe rivulosa, whose gills are crowded and run down the stem.",
      elements: ['earth'],
      planets: ['Mercury', 'Moon'],
      zodiacSigns: ['Aries'],
      safetyNotes:
        'Kynes counts the fairy ring mushroom edible, but warns never to eat it unless a qualified expert has identified it.',
      folkNames: ['Scotch Bonnet', 'Fairy Stool', 'Fairy Table', 'Fairy Ring Champignon'],
      categories: ['Courage', 'Creativity', 'Divination', 'Fertility', 'Psychic Work', 'Strength'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Mushroom',
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
          source: 'wikipedia-marasmius-oreades',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Mushroom',
          description:
            'The caps are the part kept: threaded on strings and dried, they store well. Kynes sets a circle of dried mushroom caps on the altar or table during divination to strengthen psychic awareness.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Mushroom',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-marasmius-oreades',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fairy Wand',
      canonicalName: 'Chamaelirium luteum',
      nomenclature: 'botanical',
      description:
        "Fairy wand is a perennial herb of eastern North America, growing in places as different as wet meadows and deciduous woodland, east of the Mississippi and once as far north as southern Ontario. A low rosette of spoon-shaped, dark green leaves sends up a single stem topped by a slender spike crowded with tiny white flowers like little starbursts. Male and female flowers grow on separate plants: the male spikes are white, larger and droop at the tip, while the female flowers are faintly green and stand on taller stalks. The airy look of those spikes is what tied the plant to the faeries. Its genus name joins Greek words for a lily that grows on the ground. The Cherokee, and later European settlers, used it for many ailments, and it was long muddled with unicorn root, Aletris farinosa, the words true and false passing back and forth between the two. Traditionally it was used to prevent miscarriage and was reputed to improve fertility. Because it is normally gathered from the wild the plant is at risk, and Kynes asks buyers to check where a vendor's supply comes from. In magic Kynes gives it to earth and to Venus, with powers that include fertility, love, fidelity, healing, protection and purification, and sprinkles its flower essence to cast a circle or consecrate a space.",
      elements: ['earth'],
      planets: ['Venus'],
      safetyNotes:
        'AHPA places fairy wand (false unicorn) in safety class 1, herbs that can be safely consumed when used appropriately, and lists no contraindications or drug interactions. Large doses may cause vomiting. Its safety while nursing has not been established.',
      folkNames: [
        'False Unicorn Root',
        'Blazing Star',
        "Devil's Bit",
        'Helonias Root',
        'Starwort',
        'False Unicorn',
        'Helonias',
      ],
      categories: [
        'Banishing',
        'Fertility',
        'Healing',
        'Inspiration',
        'Love',
        'Fidelity',
        'Protection',
        'Purification',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Fairy Wand',
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
          source: 'ahpa-safety',
          locator: 'pp. 193–194; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-chamaelirium-luteum',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 193',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Fairy Wand',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Kynes sells the root powdered and uses it in a private farewell to someone who has died: a cup of the powder is held between the hands while saying goodbye, then scattered over the grave.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Fairy Wand',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fennel',
      canonicalName: 'Foeniculum vulgare',
      nomenclature: 'botanical',
      description:
        "Fennel is a hardy perennial of the carrot family, native to the shores of the Mediterranean and now naturalised in many parts of the world, especially on dry ground near the sea and along riverbanks; Northcote noted in 1903 that it was sometimes found wild by the sea. Its hollow, glaucous green stems reach about two metres, with feathery, thread-fine leaves and broad umbels of tiny yellow flowers, followed by flat, ridged, light brown seeds. Leaves, seeds and the swollen base all go into cooking, and the anise or liquorice flavour comes from anethole. The Greeks called it marathon, so the battlefield of Marathon was a plain of fennel. In myth Prometheus carried fire to humankind in a fennel stalk, and the thyrsus of Dionysian rites was often made from giant fennel stalks tipped with pine cones. Fennel is one of the nine plants of the tenth-century Anglo-Saxon Nine Herbs Charm, and the English hung it on their doors on Midsummer's Eve against fire and witches, later stuffing the seeds into keyholes to keep out evil spirits and ghosts. By Shakespeare's time it had become the emblem of flattery, and an old proverb warned 'sow fennel, sow sorrow'. Cunningham grows it around the house for protection, hangs it at doors and windows against evil spirits, and puts it into purification sachets and healing mixtures.",
      elements: ['fire'],
      planets: ['Mercury'],
      zodiacSigns: ['Aries', 'Gemini', 'Virgo'],
      safetyNotes:
        "AHPA places fennel in safety class 1, herbs that can be safely consumed when used appropriately, and Cunningham's code marks it as currently recognised as safe. Fennel has shown oestrogenic activity: four young girls given two to three cups of fennel tea a day for months or years developed early breast growth. Allergic reactions are rare but have been reported, and are associated with birch–mugwort–celery syndrome. In an animal study fennel reduced the absorption of the drug ciprofloxin. AHPA's editors consider fennel tea safe in pregnancy and while nursing, but Kynes's herbal advises avoiding fennel during pregnancy and with epilepsy or other seizure disorders, using it in moderation, and not giving it to children under six.",
      folkNames: ['Samar', 'Sheeh', 'Bitter Fennel', 'Common Fennel', 'Wild Fennel'],
      deities: ['Dionysus', 'Adonis', 'Odin'],
      categories: [
        'Protection',
        'Healing',
        'Purification',
        'Clarity',
        'Confidence',
        'Courage',
        'Divination',
        'Fertility',
        'Psychic Work',
        'Strength',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Fennel; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'deities',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Fennel',
          supports: [
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
          source: 'ahpa-safety',
          locator: 'pp. 368–369; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 213–214',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 26, 150',
          supports: ['description'],
        },
        {
          source: 'wikipedia-fennel',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          description:
            'What is sold as fennel seed is the dry, grooved fruit, four to ten millimetres long. Cunningham carries the seeds to ward off evil spirits; Kynes lays them in a circle on the altar to strengthen divination, and keeps a pinch in a small pouch in times of change for courage and a sense of security. In India the seeds are chewed after meals to sweeten the breath.',
          categories: ['Divination', 'Courage'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 368',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Fennel',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fennel',
              supports: ['description'],
            },
            {
              source: 'wikipedia-fennel',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Kynes hangs several fronds in the home to deter unwelcome spirits, a late medieval practice when fronds were hung on doors against witches, evil spirits and ghosts. The young leaves are eaten as greens in parts of India and in Syrian and Lebanese omelettes.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Fennel',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 213',
              supports: ['form'],
            },
            {
              source: 'wikipedia-fennel',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil carries the aromatic compounds of the fruit, among them anethole and estragole, and a 2016 study found it insecticidal.',
          safetyNotes:
            'Estragole makes up 5 to 10 per cent of fennel essential oil. AHPA advises that the essential oil and alcohol extracts of fennel should not be used during pregnancy or while nursing.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Fennel',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 368–369',
              supports: ['safetyNotes'],
            },
            {
              source: 'wikipedia-fennel',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fenugreek',
      canonicalName: 'Trigonella foenum-graecum',
      nomenclature: 'botanical',
      description:
        "Fenugreek is an annual of the pea and bean family, Fabaceae, recognised by leaves made of three small leaflets. An old description that Northcote quotes adds white flowers followed by long, curved, pointed pods holding angular yellowish seeds; the pods are strikingly large for so small a plant, and the Greek names for it meant horned, goat's horn and cow's horn. The English name comes through French from the Latin for 'Greek hay'. The plant probably arose in the Near East and is now grown around the world as a crop of semi-arid land, with India the largest producer. Charred seeds have been found at Tell Halal in Iraq, dated to about 4000 BC, and dried ones lay in Tutankhamun's tomb; Cato listed it among the crops grown to feed cattle, and the Romans flavoured wine with it. Egyptians and others ate the seeds as a pulse, and Northcote retells Folkard's account of a festival of the Syrian king Antiochus Epiphanes at which guests were anointed with perfumes that included fenugreek. Today the cube-shaped, yellow to amber seeds are a spice of South Asian cooking, often roasted to soften their bitterness, and a compound called sotolon gives them their maple-syrup smell. Cunningham uses the seeds to draw money: a few go into the mop water, or a jar is half filled, topped up every few days until full, then emptied back onto the earth.",
      elements: ['air'],
      planets: ['Mercury'],
      safetyNotes:
        'AHPA places fenugreek seed in safety class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner, and Cunningham likewise marks it as not to be taken internally while pregnant. Its mucilage may slow the absorption of medicines taken by mouth, so AHPA advises taking other drugs an hour before fenugreek or several hours after. Because it may alter blood sugar, people with diabetes are advised to watch their levels closely and consult a qualified practitioner before using it. Allergic reactions have been reported, including two cases in people also sensitive to chickpeas. Infants given large amounts, directly or through the mother, have smelt of maple syrup, which has led to a mistaken suspicion of maple syrup urine disease.',
      folkNames: ["Bird's Foot", 'Greek Hayseed', 'Watu', 'Hilba'],
      deities: ['Apollo'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Fenugreek; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'deities',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 880–881; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 57–58',
          supports: ['description'],
        },
        {
          source: 'wikipedia-fenugreek',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fenugreek',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 880',
              supports: ['form'],
            },
            {
              source: 'wikipedia-fenugreek',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves, fresh or dried, are used as a herb, and the fresh leaves, like the sprouts, are eaten as a vegetable. In the description Northcote quotes, they grow three together on each stalk, nearly round at the ends, slightly toothed along the sides, green on top and greyish underneath.',
          references: [
            {
              source: 'northcote-herbs',
              locator: 'p. 57',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fenugreek',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fern',
      canonicalName: 'Polypodiopsida',
      nomenclature: 'botanical',
      description:
        'Ferns make up the class Polypodiopsida, a large group of vascular plants, more than 10,500 living species, that bear neither flowers nor seeds and spread instead by spores. Each spore grows into a small, short-lived plant that reproduces sexually, and from it rises the fern as we know it, whose leaves, called fronds, often unfurl from tightly coiled fiddleheads. The group goes back to the late Silurian, some 423 million years, though most of the ferns living today belong to a branch that diversified in the Cretaceous, alongside the flowering plants. Ferns grow almost everywhere, most richly in the tropics and least in the Arctic, favouring shady woods, rock crevices, acid bogs and the branches of rainforest trees. A few, bracken among them, are serious weeds; others are eaten as young fiddleheads or kept as houseplants, and the Victorians went through a collecting craze, pteridomania, that gave rise to the glazed Wardian case. In Slavic legend the fern flowers once a year, on Ivan Kupala night, and whoever sees the bloom will be happy and rich for life. Cunningham treats the fern as protective, whether set among cut flowers, planted by the doorstep or kept indoors. Burnt out of doors it is said to bring rain, its smoke drives off snakes, and carrying it is meant to lead the bearer to treasure. Biting the first frond of spring is held to ward off toothache until the next.',
      elements: ['air'],
      planets: ['Mercury'],
      safetyNotes:
        'Cunningham warns that some ferns are poisonous. Bracken in particular contains carcinogens linked to cancers of the oesophagus and stomach, and should not be eaten by people or animals.',
      deities: ['Laka'],
      categories: ['Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Fern',
          supports: ['elements', 'planets', 'deities', 'categories', 'safetyNotes', 'description'],
        },
        {
          source: 'wikipedia-fern',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            "A fern's leaf is called a frond. Cunningham throws dried fern onto hot coals to drive out evil spirits, and says that whoever breaks the first frond of spring will have good luck.",
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fern',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fern',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'Ferns bear no true seeds and reproduce by spores, yet folklore speaks of fern seed all the same. Cunningham has it carried for invisibility. Finnish tradition holds that whoever finds the seed of a fern in bloom on Midsummer night will be guided, unseen, to hidden treasure, and a Styrian charm Northcote records promises fern seed with the strength of thirty or forty men.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fern',
              supports: ['form', 'description'],
            },
            {
              source: 'northcote-herbs',
              locator: 'p. 185',
              supports: ['description'],
            },
            {
              source: 'wikipedia-fern',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Sap',
          description:
            'Cunningham records the belief that fern sap, if any can be had, gives eternal youth to whoever drinks it.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fern',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Feverfew',
      canonicalName: 'Tanacetum parthenium',
      nomenclature: 'botanical',
      description:
        "Feverfew is a herbaceous perennial of the daisy family that forms a small, strongly scented bush up to about 70 centimetres tall. Its yellowish-green leaves are deeply cut into rounded lobes, and from early summer into autumn it carries loose, flat clusters of small daisies, white rays around a yellow centre. Native to the Balkans, Anatolia and the Caucasus, it has spread around the world in cultivation, seeds itself freely and can turn invasive away from home. Its bitterness keeps it largely out of the kitchen. The common name is usually traced to 'febrifuge', for it was thought to drive away fevers and agues, though it may come instead from the feathery featherfew. Dioscorides wrote of it in the first century, and Northcote found it still a favourite remedy among villagers in 1903. Today it is best known as a traditional preventive for migraine, though there is no clinical evidence that it has any therapeutic effect. Kynes links its species name to Athena Parthenos, and gathers older lore: an Anglo-Saxon charm used it to heal a wound from a spear-wielding she-elf, medieval Europeans wore it against plague and believed its smell kept evil spirits away, and in England simply laying it on a sickbed was thought enough to cure. Cunningham carries it to guard against colds, fevers and accidents, and Kynes uses it to send healing to someone in need and in protection spells and against jinxes.",
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Sagittarius'],
      safetyNotes:
        'Not for use in pregnancy except under the supervision of a qualified healthcare practitioner (AHPA safety class 2b); Kynes calls it an abortifacient, and Kynes\'s Herbal Remedies also advises avoiding it while breastfeeding. People allergic to other members of the daisy family, such as chamomile, should take care, since cross-reactions are common. Herbal Remedies advises avoiding it with blood-thinning medicines or a bleeding disorder. Stopping after long use can bring on "post-feverfew syndrome", with aches, stiff joints and muscles, anxiety and poor sleep, in about one long-term user in ten, so AHPA advises reducing the dose gradually over a month. Cunningham marks it as not to be taken internally while pregnant and as liable to upset digestion.',
      folkNames: [
        'Featherfew',
        'Febrifuge Plant',
        "Bachelor's Buttons",
        'Devil-Daisy',
        'Midsummer Daisy',
        'Wild Chamomile',
        'False Chamomile',
      ],
      deities: ['Hecate'],
      categories: ['Protection', 'Healing', 'Love', 'Purification', 'Strength'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Feverfew; p. 266',
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
          locator: 's.v. Feverfew',
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
          locator: 'pp. 849–850; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 231–232',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 54',
          supports: ['description'],
        },
        {
          source: 'wikipedia-tanacetum-parthenium',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 849',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves are the part Herbal Remedies uses, and Kynes lists them cut and dried. People who chewed fresh leaves daily to treat their headaches reported mouth sores, which cleared once they stopped.',
          safetyNotes:
            'Eating the fresh leaves may cause mouth sores and a general inflammation of the lining of the mouth; the sores have resolved after the herb was stopped.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Feverfew',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 232',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 850',
              supports: ['description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Kynes puts a few dried flowers in a small pouch, carried as an amulet to help in getting over heartbreak.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Feverfew',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fig',
      canonicalName: 'Ficus carica',
      nomenclature: 'botanical',
      description:
        'The common fig is a deciduous tree or large shrub of the mulberry family, Moraceae, growing up to seven to ten metres, with smooth white bark and rough, fragrant leaves of three or five deep lobes. What we eat as the fruit is a hollow, fleshy vessel lined inside with tiny flowers, reached by a specialised wasp through a small opening at its tip. Native to the Mediterranean and to western and southern Asia, the tree thrives in dry, sunny, rocky ground. It may be the first plant people ever cultivated: sterile figs from about 9400 BC have been found at Gilgal I in the Jordan Valley. Greeks and Romans grew many kinds, and Spanish missionaries brought it to California in 1769. In Babylonian myth Ishtar took the form of a divine fig tree, and Kynes records that Eleusinian initiates sat where the first fig tree was found, that Dionysus was often shown crowned with fig leaves, that women at Bacchanalian festivals wore necklaces of figs for fecundity and that Egyptians laid figs in tombs as food for the afterlife. A raging bull tied to a fig tree, Culpeper claimed in a passage Northcote quotes, grows tame. In magic the fig serves fertility and love: Cunningham has a branch set before the door so that a traveller comes home safely, and gives a fig to charm someone, while Kynes uses fig juice as a ritual libation.',
      elements: ['fire', 'air', 'water'],
      planets: ['Jupiter', 'Venus'],
      safetyNotes:
        "Cunningham codes the fig as currently recognised as safe. Although the plant is not poisonous as such, it is listed in the US Food and Drug Administration's database of poisonous plants.",
      folkNames: [
        'Common Fig',
        'Fico',
        'Mhawa',
        'Chagareltin',
        'Cultivated Fig',
        'Edible Fig',
        'True Fig',
      ],
      deities: [
        'Dionysus',
        'Juno',
        'Isis',
        'Bacchus',
        'Ceres',
        'Demeter',
        'Hathor',
        'Hermes',
        'Iris',
        'Mars',
        'Mercury',
        'Nut',
        'Osiris',
        'Persephone',
        'Ra',
        'Saturn',
        'Thoth',
        'Ishtar',
      ],
      categories: [
        'Divination',
        'Fertility',
        'Love',
        'Abundance',
        'Ancestor Work',
        'Harmony',
        'Creativity',
        'Peace',
        'Prosperity',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Fig; p. 266',
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
          locator: 's.v. Fig',
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
          source: 'northcote-herbs',
          locator: 'p. 177',
          supports: ['description'],
        },
        {
          source: 'wikipedia-fig',
          supports: ['canonicalName', 'nomenclature', 'deities', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          description:
            'Figs are eaten fresh or dried, and are mostly sold dried or processed because the ripe fruit does not travel or keep well. Cunningham and Kynes both eat a fig to help a fertility working, and Kynes sets one on the altar at Samhain to feed the ancestors.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fig',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Fig',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fig',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'In Genesis, Adam and Eve cover themselves with fig leaves, and painters and sculptors long used the leaf to hide the genitals of nude figures. Cunningham writes a question on a fig leaf and reads the answer from how fast it dries: slowly means yes, quickly no.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fig',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fig',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Cunningham records small phallic images carved from fig wood, carried by women hoping to conceive and by men against infertility or impotence.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Fig',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Sap',
          description:
            'The fig bleeds a milky sap. The Romans, regarding the tree as phallic, took the sap to stand for the semen of Mars, Kynes records.',
          safetyNotes:
            'Sap on the skin followed by sunlight can cause phytophotodermatitis, a potentially serious inflammation that can resemble a severe sunburn. The sap of the leaves and shoots contains psoralen and bergapten, compounds that cause this reaction, but the fruit does not.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Fig',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fig',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 979',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Figwort',
      canonicalName: 'Scrophularia nodosa',
      nomenclature: 'botanical',
      description:
        "Figwort is a perennial herb of the temperate Northern Hemisphere, missing only from western North America, that favours damp ground and disturbed, cultivated waste places. From a horizontal rootstock it raises thick, sharply four-angled stems, up to 150 cm by Wikipedia's measure and about three feet by Kynes's, carrying pairs of toothed leaves that taper to a point. Small, rounded flowers sit in loose sprays at the top; Kynes describes a two-lobed reddish-brown upper lip over a shorter green lower lip, and the capsule that follows is egg-shaped, or, to her eye, like a fig. Under the doctrine of signatures its throat-like flowers marked it as a cure for scrofula, a disease of the throat. Greek and Anglo-Saxon healers both used it. Celtic tradition linked it to flowing milk and a generous land, and in the Hebrides and on Skye it was a charm to guard cows and keep their milk coming. Scots turned it against faeries, while the Irish counted it a faerie plant and called it fothram, a name said to mean that a figwort growing beneath an elder took on the elder's power. In England it was held in the smoke of the Midsummer bonfire before being hung indoors or worn for protection, and Cunningham has it worn at the neck to keep the wearer well and turn aside the evil eye.",
      elements: ['water', 'earth'],
      planets: ['Venus', 'Moon'],
      zodiacSigns: ['Cancer', 'Libra', 'Taurus'],
      safetyNotes:
        "Kynes considers figwort toxic and says it should not be swallowed. AHPA, by contrast, places the herb and root in safety class 1, herbs that can be safely consumed when used appropriately. It notes that older literature warned against figwort for people with ventricular tachycardia, a concern it regards as theoretical and neither proven nor disproven; Cunningham's health code likewise says it should not be taken internally by anyone with that condition. No information on its safety in pregnancy or while nursing was found, so its safety then has not been established.",
      folkNames: [
        "Carpenter's Square",
        'Rosenoble',
        'Throatwort',
        'Common Figwort',
        'Woodland Figwort',
        'Brownwort',
        'Fothram',
        'Knotted Figwort',
        "Poor Man's Salve",
      ],
      deities: ['Brigid'],
      categories: ['Protection', 'Abundance', 'Peace'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Figwort; p. 266',
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
          locator: 's.v. Figwort',
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
          locator: 'p. 798; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-scrophularia-nodosa',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 798',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Figwort',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            "Kynes lists the cut, dried root among what can be bought. She lays a handful on the Imbolc altar to call on and honour Brigid, and on Midsummer's Eve sprinkles an infusion of the root around the ritual space to welcome faeries to the celebration.",
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Figwort',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 798',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fir',
      canonicalName: 'Abies',
      nomenclature: 'botanical',
      description:
        'Firs are the genus Abies, evergreen conifers of the pine family, numbering somewhere between 48 and 65 living species on the mountains of North and Central America, Eurasia and North Africa. Most prefer cold country, high up or far north, and the genus has been introduced to Scandinavia and the British Isles. They are tall trees, commonly 40 to 60 metres, with a single straight trunk and branches set in whorls. Two features mark them out within their family: each needle springs singly from the twig on a round base, and the cylindrical seed cones stand upright like candles and fall apart on the branch once ripe. Kynes describes two species, the balsam or eastern fir, with curved dark needles and greyish-green cones touched with purple, and the European silver fir, whose cones ripen to reddish brown. The soft timber goes into paper pulp and plywood, and several species, balsam fir among them, are favourite Christmas trees. In northern Europe the fir was held to be king of the forest and home to powerful woodland spirits. Romanian mourners carried fir boughs at the head of a funeral as a sign of rebirth; in Silesia a branch on the stable door at May Day kept the cattle healthy; German households planted a small fir by the door before a wedding; and fir boughs decorating the house at Yule were thought to comfort any elves who called.',
      elements: ['air', 'earth', 'fire'],
      planets: ['Jupiter', 'Mars', 'Saturn', 'Uranus'],
      zodiacSigns: ['Aries'],
      safetyNotes:
        "AHPA's monograph covers balsam fir (Abies balsamea), its bark, needles, sap and wood, and places it in safety class 1, herbs that can be safely consumed when used appropriately, with no known contraindications, drug interactions or adverse effects. No information on its safety in pregnancy or while nursing was found, so its safety then has not been established. No safety source read covers the other species of fir.",
      deities: [
        'Artemis',
        'Athena',
        'Bacchus',
        'Cybele',
        'Diana',
        'Dionysus',
        'Frigg',
        'Inanna',
        'Isis',
        'Osiris',
        'Pan',
        'Persephone',
        'Rhea',
      ],
      categories: [
        'Communication',
        'Creativity',
        'Divination',
        'Healing',
        'Inspiration',
        'Peace',
        'Protection',
        'Purification',
        'Transformation',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Fir',
          supports: ['elements', 'planets', 'zodiacSigns', 'deities', 'categories', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 1; p. xxii',
          supports: ['safetyNotes'],
        },
        {
          source: 'wikipedia-fir',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          description:
            'The needles are the part Kynes works with: held in a cluster during meditation they encourage creative expression, and a few burned purify the ritual space and help to ground energy afterwards.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Fir',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 1',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Flax',
      canonicalName: 'Linum usitatissimum',
      nomenclature: 'botanical',
      description:
        'Flax is an annual of the family Linaceae, grown for food and for fibre wherever the climate is temperate. It is known only in cultivation, the outcome of a single domestication from the wild pale flax in the Fertile Crescent, within a native range running from the eastern Mediterranean to India. Slender stems reach about 1.2 metres and carry narrow, blue-green leaves. Kynes describes pale blue, five-petalled flowers, followed by round capsules of small, flat, reddish-brown seeds that Wikipedia likens to apple pips. The species name usitatissimum means "most useful": the seeds are ground into meal or pressed for linseed oil, and the fibres are made into linen. Ancient Egypt grew it widely, painting flowering flax on temple walls and wrapping its mummies in linen, and Egyptian priests wore linen alone because flax stood for purity. In Norway and Denmark flax grown near the house kept ghosts away and seeds laid in a coffin stopped the dead from wandering, while in the Basque country it went into shoes against bewitchment. Witches were believed to brew with the seeds yet to hate the flowers. Cunningham and Northcote both name Hulda as the goddess who first taught people to grow flax and to spin and weave it, and a child who danced among growing flax at seven was expected to grow up beautiful.',
      elements: ['fire'],
      planets: ['Mercury'],
      folkNames: ['Linseed', 'Linaza', 'Sib Muma', 'Common Flax', 'Lint Bells', 'Line'],
      deities: ['Athena', 'Brigid', 'Freya', 'Frigg', 'Minerva'],
      categories: [
        'Protection',
        'Psychic Work',
        'Healing',
        'Abundance',
        'Binding',
        'Divination',
        'Prosperity',
        'Strength',
        'Transformation',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Flax',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Flax',
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
          source: 'ahpa-safety',
          locator: 'p. 523',
          supports: ['canonicalName', 'nomenclature'],
        },
        {
          source: 'northcote-herbs',
          locator: 'p. 181',
          supports: ['description'],
        },
        {
          source: 'wikipedia-flax',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          description:
            'Cunningham carries a few seeds in a pocket, wallet or purse to draw money, or keeps a jar of seeds and coins on the altar and adds to it each day. Mixed with mustard seed beside the bed, with a pan of cold water on the other side, flax seed guards the sleeper; boxed with red pepper, it keeps evil out of the house; and sprinkled on the altar or added to mixtures, it serves healing rituals.',
          safetyNotes:
            "AHPA places flaxseed in safety class 1, herbs that can be safely consumed when used appropriately. Taken as a bulk-forming laxative it should not be used by people with a bowel obstruction or an abnormal narrowing of the oesophagus or intestines, and it should be taken with at least 200 ml (6 oz) of water; Cunningham's health code likewise asks for an adequate amount of liquid when the seed is taken internally. Other drugs should be taken an hour before flax or several hours after, as it may reduce their absorption. The seed contains mucilage and cyanogenic glycosides, and allergic reactions to it, anaphylaxis among them, have been reported.",
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Flax; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Flax',
              supports: ['form'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 523; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Because witches were thought to hate them, the blue flowers were worn as a charm against sorcery and witchcraft, as Cunningham, Kynes and Northcote all record. Kynes lists the dried stalks with their flowers among what can be bought.',
          colors: ['blue'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Flax',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Flax',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'northcote-herbs',
              locator: 'p. 181',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Linseed oil, pressed from the seed, is one of the oldest oils in trade. It is edible, sold as a nutritional supplement and used in many wood finishes, and the solvent-extracted oil has served for centuries as a drying oil in painting and varnishing.',
          references: [
            {
              source: 'wikipedia-flax',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fly Agaric',
      canonicalName: 'Amanita muscaria',
      nomenclature: 'fungal',
      description:
        "Fly agaric is a large mushroom of the genus Amanita, the red-and-white toadstool of picture books. It pushes out of the soil looking like a white egg; as the cap opens from a ball to a flat plate, 5 to 30 cm across, its bright red skin shows through the torn veil, leaving scattered white to yellowish warts, which Kynes describes as white flakes on a red or orange cap. The gills and stalk are white, the stalk ringed and swollen at the base. Native to conifer and deciduous woodland across the temperate and boreal north, it lives in partnership with the roots of pine, oak, spruce, fir, birch and cedar, and has travelled with pine seedlings to the Southern Hemisphere, where it now behaves as a weed in places. Its name comes from the old practice, recorded by Albertus Magnus before 1256, of sprinkling it, powdered, into milk to kill flies. Kynes notes its importance to shamans of Siberia and the Baltic for communicating between worlds, and the Greek belief that it was an ingredient of ambrosia. For centuries Europe counted it a witches' plant, said to go into flying ointment, and a sign of faeries, elves and gnomes, its caps marking the entrance to the elves' realm. Germanic myth has it springing up where foam from Wodan's horse fell, and in nineteenth-century Europe it was a good-luck charm to rank with the four-leaf clover. Cunningham records speculation that some classical mystery religions centred their rites on it.",
      elements: ['air'],
      planets: ['Mercury'],
      zodiacSigns: ['Aries'],
      colors: ['red', 'white'],
      safetyNotes:
        'Kynes calls fly agaric extremely toxic if eaten and advises against even touching it; Cunningham marks it as a poison and judges it too virulently poisonous to be worth using. It has poisoned young children, people taking it for hallucinations, and people who mistook it for an edible mushroom. It contains ibotenic acid, a neurotoxin, and muscimol, a psychoactive compound, in amounts that vary widely by region and season. Its effects are unpredictable, ranging from nausea, twitching and drowsiness to delirium, hallucinations, seizures and coma. With modern treatment deaths are extremely rare, but medical help should be sought in any suspected poisoning.',
      folkNames: [
        'Death Angel',
        'Magic Mushroom',
        'Redcap Mushroom',
        'Sacred Mushroom',
        'Fly Fungus',
        'Deadly Amanita',
        'Fairy Tables',
        'Pixie Stools',
        'Red Cap',
        'Fly Amanita',
        'Red Toadstool',
      ],
      deities: ['Dionysus', 'Gwydion', 'Odin'],
      categories: [
        'Fertility',
        'Banishing',
        'Creativity',
        'Divination',
        'Dream Work',
        'Knowledge',
        'Prophecy',
        'Protection',
        'Psychic Work',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Agaric',
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
          locator: 's.v. Fly Agaric',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'colors',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'wikipedia-amanita-muscaria',
          supports: [
            'canonicalName',
            'nomenclature',
            'colors',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
      ],
      variants: [
        {
          form: 'Mushroom',
          description:
            'Cunningham sets the mushroom on the altar or in the bedroom to increase fertility, while warning that its poison makes this unwise. Kynes, for the same reason, works with it only through pictures and figurines: toadstool ornaments painted in its colours draw faeries and pixies to the garden, and a picture of it written with a few keywords and burned helps to be rid of something unwanted.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Agaric',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Fly Agaric',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-amanita-muscaria',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Forget-Me-Not',
      canonicalName: 'Myosotis',
      nomenclature: 'botanical',
      description:
        "Forget-me-nots make up the genus Myosotis, small annual and perennial herbs of the borage family. Their flat flowers have five petals, are seldom more than a centimetre across, and are most often blue, though pink, white and yellow ones occur, each with a yellow centre. The genus name comes from a Greek word for a mouse's ear, after the shape of the leaves. Most species belong to western Eurasia or New Zealand and like damp ground, but garden kinds have escaped into wetlands across the temperate world, helped by tiny seed pods that catch on passing clothing. Before the flowers open the stalk is coiled like a scorpion's tail, which gave the plant its English name of scorpion grass. Folklore counted it lucky in England and Europe and a guard against faery mischief, and in Germany it was a charm for finding hidden treasure; Grieve records an old belief that its juice would harden steel. It was planted on graves, and since the Middle Ages it has stood for faithful, lasting love, a meaning explained by a German tale of a knight swept away by the Danube who threw his lady a posy and called out the flower's name. Today it is the official flower of Alaska and a badge of remembrance, both for the war dead and for people living with dementia.",
      elements: ['air'],
      planets: ['Venus'],
      colors: ['blue'],
      folkNames: ['Luck Flower', 'Mouse Ear', 'Scorpion Grass'],
      deities: ['Thoth'],
      categories: [
        'Harmony',
        'Binding',
        'Clarity',
        'Communication',
        'Love',
        'Fidelity',
        'Protection',
        'Strength',
        'Success',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Forget-Me-Not',
          supports: [
            'elements',
            'planets',
            'colors',
            'folkNames',
            'deities',
            'categories',
            'description',
          ],
        },
        {
          source: 'grieve-forget-me-not',
          supports: ['description'],
        },
        {
          source: 'wikipedia-myosotis',
          supports: ['canonicalName', 'nomenclature', 'colors', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Forget-Me-Not',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Kynes records that the ancient Egyptians laid forget-me-not leaves over their eyes to help them receive visions during the month of Thoth, which falls roughly between mid-September and mid-October.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Forget-Me-Not',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Foxglove',
      canonicalName: 'Digitalis purpurea',
      nomenclature: 'botanical',
      description:
        'Foxglove is a biennial of the plantain family, native to much of western Europe and to Morocco and now naturalised in North America and many other temperate lands. In its first year it forms only a rosette of leaves at ground level; in the second it raises a spire about one to one and a half metres tall, hung with drooping, tubular flowers that are usually purplish pink or white and patterned inside like lace. Every part is poisonous because of the heart-acting glycosides it holds, and the plant was the first source of the drug digoxin; the physician William Withering learned of its use for heart complaints from an old wise woman who healed. Grieve traces the English name to folksglove, the glove of the good folk, and lore across Britain and Ireland ties the plant to them: the spots inside the bells marked where elves had touched them, and a bent stalk meant a fairy was sheltering in a flower. Witches were said to wear the blossoms on their fingers. In Staffordshire, carrying the flowers indoors let witches into the house, yet in Ireland the same flowers were a charm against witchcraft. In magic its work is protection: grown in a garden it guards garden and home alike, and Welsh housewives once painted crossed lines on their stone floors with a black dye made from the leaves, to keep evil from coming in.',
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Aquarius', 'Libra'],
      safetyNotes:
        'Poisonous: every part of the plant is toxic and can kill if swallowed, so it is never taken internally. The AHPA handbook puts it in safety class 3, to be used only under the supervision of an expert qualified in its use, and interaction class C, because it acts like the heart drugs digoxin and digitoxin, whose effective and toxic doses lie very close together. Poisonings have followed deliberate self-harm and the mistaking of its leaves for borage, comfrey or plantain; signs include nausea, vomiting, abdominal pain, dizziness, confusion, hallucinations, disturbed or yellow-green vision, chest pain and an abnormal heartbeat. Its safety in pregnancy and while nursing has not been established.',
      folkNames: [
        'Cow-Flop',
        "Deadmen's Bells",
        'Digitalis',
        "Dog's Finger",
        'Fairy Fingers',
        'Fairy Petticoats',
        'Fairy Thimbles',
        'Fairy Weed',
        'Floppy-Dock',
        'Floptop',
        "Folk's Gloves",
        'Fox Bells',
        'Foxes Glofa',
        'The Great Herb',
        "Lion's Mouth",
        'Lusmore',
        'Lus na mbau side',
        "Our Lady's Glove",
        "Witches' Bells",
        "Witches' Thimbles",
        "Dead Man's Bells",
        'Elf Gloves',
        'Fairy Bells',
        'Fairy Caps',
        "Goblin's Gloves",
        'Common Foxglove',
        'Purple Foxglove',
        "Witches' Gloves",
        "Fairy's Glove",
        'Gloves of Our Lady',
        'Bloody Fingers',
        "Virgin's Glove",
        "Dead Man's Thimbles",
        'Folksglove',
      ],
      categories: [
        'Protection',
        'Harmony',
        'Communication',
        'Creativity',
        'Healing',
        'Intuition',
        'Peace',
        'Release',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Foxglove',
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
          locator: 's.v. Foxglove',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 311–312; pp. xxii–xxiii',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 181–182',
          supports: ['description'],
        },
        {
          source: 'grieve-foxglove',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-digitalis-purpurea',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 311',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Foxglove',
              supports: ['form'],
            },
            {
              source: 'grieve-foxglove',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Most of the foxglove’s folklore gathers on its bells: they were said to make a magical sound, and in English lore they were rung to warn foxes that huntsmen were near. Kynes lists the dried flower stalks among the forms sold for magical use.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Foxglove',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Frangipani',
      canonicalName: 'Plumeria rubra',
      nomenclature: 'botanical',
      description:
        'Red frangipani is a deciduous shrub or small tree of the dogbane family, two to eight metres tall, with a thick, succulent trunk and blunt, sausage-like branches under thin grey bark; a broken branch bleeds white latex. Its large leaves cluster at the branch tips, and through the summer the ends of the branches carry five-petalled flowers, most often pink but ranging to white, with yellow towards the centre. They are strongly scented in the morning and evening, which draws the hawkmoths that pollinate them, though they hold almost no nectar. The species is native from Baja California and Mexico through Central America to Colombia and Venezuela. Spanish galleons carried it to the Philippines in the 1560s, from where it spread across Asia, and it reached the Pacific Islands late in the nineteenth century; there its blossoms are threaded into leis, and in Hawaii it is called melia. The English name recalls an Italian noble family, one of whom made a perfume with its scent, and the genus honours the French botanist Charles Plumier. It is the national flower of Nicaragua and of Laos, it is planted beside temples and in cemeteries, and its link with graves earned it a Malay name meaning grave flower. In magic Cunningham gives it to love: its flowers are used in love spells.',
      elements: ['water'],
      planets: ['Venus'],
      safetyNotes:
        'Cunningham marks plumeria as a poison. The US Forest Service lists it as a poisonous plant and warns against touching or eating any part of it, and the white latex from broken branches irritates the skin and mucous membranes and is toxic, though not deadly unless taken in large amounts.',
      folkNames: [
        'Frangipangi',
        'Graveyard Flowers',
        'Melia',
        'Temple Tree',
        'Red Frangipani',
        'Nosegay',
      ],
      categories: ['Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Plumeria',
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
          source: 'wikipedia-plumeria-rubra',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Plumeria',
              supports: ['form'],
            },
            {
              source: 'wikipedia-plumeria-rubra',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Fumitory',
      canonicalName: 'Fumaria officinalis',
      nomenclature: 'botanical',
      description:
        "Fumitory is a scrambling annual of the poppy family, with slender, trailing stems ten to fifty centimetres long and deeply divided leaves of a bluish or silvery green that have been likened to parsley. From spring into autumn it carries spikes of small, two-lipped, spurred flowers, pink tipped with mauve or purple. It is the commonest fumitory of western and central Europe, is native also to North Africa and western Asia, and has been introduced to Australia. The name goes back to the medieval Latin fumus terrae, smoke of the earth, explained either by the smoky, blue-green haze of the plant or by Pliny's report that its juice drew tears as smoke does; a Greek legend held that it sprang not from seed but from vapour rising out of the ground. Smoke runs through its lore as well. Ancient exorcists burned it to drive out evil spirits, as in the gardens of St Gall, and in medieval Europe witches were said to burn it to call up spirits of the underworld. It was burned to purify and protect a new home, scattered indoors and rubbed on shoes for luck, and in Germany it guarded against evil. Cunningham sprinkles an infusion around the house and rubs it on the shoes each week to draw money, and Kynes burns it at Samhain to reach the ancestors and after ritual to ground surplus energy.",
      elements: ['earth', 'fire'],
      planets: ['Saturn', 'Jupiter'],
      zodiacSigns: ['Aries', 'Capricorn'],
      safetyNotes:
        'Every part of the plant is toxic and can cause unpleasant side effects if swallowed. One herbal writer calls it poisonous and fit for use only under the direction of a medical herbalist. Large doses of its main alkaloid, protopine, caused excitation and convulsions in animals; its toxicology has not been thoroughly studied, and there are no studies of its safety in pregnancy, in children or in the elderly.',
      folkNames: [
        'Beggary',
        'Earth Smoke',
        'Fumiterry',
        'Fumus',
        'Fumus Terrae',
        'Kaphnos',
        'Nidor',
        'Scheiteregi',
        'Taubenkropp',
        'Vapor',
        'Wax Dolls',
        'Common Fumitory',
        'Drug Fumitory',
        'Hedge Fumitory',
        "Lady's Lockets",
        'Smoke-Plant',
        "Thunderer's Plant",
      ],
      deities: ['Demeter', 'Hades', 'Hecate', 'Hel', 'Osiris', 'Persephone', 'Thor'],
      categories: [
        'Ancestor Work',
        'Banishing',
        'Prosperity',
        'Protection',
        'Purification',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Fumitory',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'folkNames',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Fumitory',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'zodiacSigns',
            'folkNames',
            'deities',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'grieve-fumitory',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-fumaria-officinalis',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'grieve-fumitory',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Fumitory',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Galangal',
      canonicalName: 'Alpinia officinarum',
      nomenclature: 'botanical',
      description:
        'Lesser galangal is a plant of the ginger family, known as a mild cousin of ginger, and its rhizome, which resembles ginger root, is the part used. It grows in clumps to about five feet, with long, narrow, lance-shaped leaves and loose spikes of orchid-like white flowers streaked deep red at the centre, and it is smaller than its Javanese relative, greater galangal. Grieve gives its home as southern China, on Hainan Island, and Java; the dried pieces of rhizome are dark reddish-brown, aromatic and pungent. The name is thought to come through Arabic from a Chinese phrase for mild ginger. India valued the lesser plant above the greater for its medicine, recorded in Sanskrit writings from about 600 CE, and Europe used the root as a spice for more than a thousand years, long before its source plant was identified in 1870; medieval Europe cooked with it widely and thought it an aphrodisiac. In hoodoo it is the root usually meant by low John, after John the Conqueror, a legendary figure whose spirit was said to dwell in certain roots, and it is carried to overcome hardship and for luck. Cunningham wears or carries it for protection and good fortune, sews it with silver into a leather sachet to draw money, and wears it to develop psychic ability and guard health. Kynes uses it to give spells more force, especially banishing spells and those that send ill will back to its source.',
      elements: ['fire', 'earth'],
      planets: ['Mars', 'Sun'],
      zodiacSigns: ['Aries', 'Scorpio'],
      safetyNotes:
        'Cunningham marks galangal as recognised as safe, and AHPA puts lesser galangal rhizome in safety class 1, with no known contraindications, interactions or side effects. No information was found on its safety in pregnancy or while nursing, so its safety at those times has not been conclusively established.',
      folkNames: [
        'Chewing John',
        'China Root',
        'Colic Root',
        'East India Catarrh Root',
        'Galingal',
        'Galingale',
        'Gargaut',
        'India Root',
        'Low John the Conqueror',
        'Rhizoma Galangae',
        'Chinese Ginger',
        'Galangale',
        'Indian Root',
        'Low John',
        'Galanga',
      ],
      deities: ['Lakshmi'],
      categories: [
        'Protection',
        'Lust',
        'Psychic Work',
        'Hex-Breaking',
        'Banishing',
        'Courage',
        'Justice',
        'Legal Matters',
        'Prosperity',
        'Success',
      ],
      substitutes: [
        {
          identity: 'zingiber officinale',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Galangal; p. 266',
          supports: [
            'elements',
            'planets',
            'folkNames',
            'categories',
            'substitutes',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Galangal',
          supports: [
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
          locator: 'pp. 52–53',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'grieve-galangal',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The rhizome is sold whole, sliced or powdered. Kynes carries a piece as an amulet to overcome injustice and win in court.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Galangal',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 52',
              supports: ['form'],
            },
            {
              source: 'grieve-galangal',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Cunningham burns powdered galangal to break spells and curses, and carries or sprinkles it about the home to stir up lust.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Galangal',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Galangal',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Gardenia',
      canonicalName: 'Gardenia jasminoides',
      nomenclature: 'botanical',
      description:
        'Common gardenia, also called Cape jasmine, is a large shrub with glossy, lance-shaped leaves and creamy white flowers, either single with six to eight spreading petals or double and rather like a rose, whose scent recalls jasmine; the ribbed, oblong fruit ripens orange. It has been part of Traditional Chinese Medicine for more than two thousand years. The plant reached England in the middle of the eighteenth century and America soon afterwards, and its strong, heady fragrance made it hugely popular, both in perfume and as an emblem of the antebellum South. In magic it is a plant of the Moon and of healing, love and peace. Kynes brings its white flowers to esbat rituals for the power of Luna, holds a flower in spiritual meditation, and sprinkles the petals or diffuses the scent when working with spirit guides. Cunningham sets the fresh blossoms in sickrooms and on healing altars to help recovery, adds the dried petals to healing incenses and mixtures, scatters dried gardenia around a room to bring a peaceful atmosphere, and puts it into Moon incenses. He also uses gardenias in love spells and to draw good spirits during ritual, and credits them with very high spiritual vibrations.',
      elements: ['water'],
      planets: ['Moon'],
      zodiacSigns: ['Cancer', 'Pisces', 'Scorpio'],
      safetyNotes:
        'Cunningham marks Gardenia jasminoides as recognised as safe, and AHPA puts the fruit in safety class 1. Allergic skin reactions to gardenia have been reported. No information was found on its safety in pregnancy or while nursing, so its safety at those times has not been conclusively established.',
      folkNames: ['Cape Jasmine'],
      deities: ['Diana', 'Isis', 'Selene'],
      categories: ['Love', 'Peace', 'Harmony', 'Healing'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Gardenia; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'categories',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Gardenia',
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
          locator: 'p. 393',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['white'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Gardenia',
              supports: ['form', 'colors'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Gardenia',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Petal',
          description:
            'Dried petals go into healing incenses and mixtures; Kynes sprinkles them on the altar when working with spirit guides.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Gardenia',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Gardenia',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Kynes lists the absolute or essential oil and diffuses the scent to aid work with spirit guides and the spirit realm.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Gardenia',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Fruit',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 393',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Gardenia',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Garlic',
      canonicalName: 'Allium sativum',
      nomenclature: 'botanical',
      description:
        "Garlic is a bulbous perennial of the onion genus, native to Central Asia, north-eastern Iran and the Himalayan foothills and now naturalised in Mediterranean Europe, China and elsewhere. Flat, pointed leaves rise from a bulb of four to fifteen cloves wrapped in papery white skin, and the flowering stem first curls into a scape tipped with a pointed bud, then straightens to bear a round head of small white to pinkish flowers. It has been grown in Mesopotamia for at least four thousand years, and bulbs were found in Tutankhamun's tomb. Few plants carry as much protective lore. Greeks and Romans used it as a cure-all and as a guard against magic and the restless dead, and Roman soldiers ate it for courage; Anglo-Saxons used it to break elfin enchantment; Central Europeans hung it against witches, demons, werewolves and vampires, and in the Balkans it was set in a corpse's mouth to keep the dead in the grave. German miners wore it against the spirits of the shafts and sailors carried it against shipwreck. Garlic was eaten on Hecate's festival days and left for her at crossroads. Magically it guards homes, children and brides, keeps out thieves and envious people, and drives off evil spirits, bitten or sprinkled as powder; eaten, it is said to stir lust; and rubbed on a lodestone it robs the stone of its power.",
      elements: ['fire'],
      planets: ['Mars'],
      safetyNotes:
        'AHPA safety class 1, interaction class C. People with clotting disorders should take two grams or more a day only under the supervision of a qualified healthcare professional, garlic should be stopped seven days before surgery, and cases of abnormal bleeding have been reported. People with stomach inflammation should take care with raw garlic, and those with acid reflux should avoid it. Raw garlic on the skin may cause irritation, contact dermatitis or a chemical burn. Two grams or more of fresh garlic a day may lower blood levels of the drug saquinavir. AHPA notes that these concerns rest on therapeutic doses, not on garlic used as a spice. Cunningham marks it not to be taken internally while nursing, and Kynes advises avoiding it while breastfeeding and warns that large amounts may cause heartburn or irritate the stomach.',
      folkNames: [
        'Ajo',
        "Poor Man's Treacle",
        'Stinkweed',
        "Devil's Posy",
        'Stinking Rose',
        'Common Garlic',
      ],
      deities: ['Hecate', 'Circe', 'Lilith'],
      categories: [
        'Protection',
        'Healing',
        'Lust',
        'Abundance',
        'Banishing',
        'Courage',
        'Prosperity',
        'Strength',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Garlic; p. 266',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'deities',
            'folkNames',
            'categories',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Garlic',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'planets',
            'deities',
            'folkNames',
            'categories',
            'description',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 40',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 214–215',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-garlic',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Bulb',
          description:
            'Fresh peeled cloves are rubbed on an ailing part of the body and then thrown into running water, and a braid of bulbs hung where an unwanted spirit is felt encourages it to move on.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 40',
              supports: ['form'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 214',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Garlic',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Garlic',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Powder',
          description: 'Powdered garlic is sprinkled on the floor to drive away evil spirits.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Garlic',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Garlic',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'The scape, the young flowering stem with its pointed bud, is added fresh to spells to attract prosperity and abundance.',
          categories: ['Prosperity', 'Abundance'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Garlic',
              supports: ['form', 'description', 'categories'],
            },
            {
              source: 'wikipedia-garlic',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Gentian',
      canonicalName: 'Gentiana lutea',
      nomenclature: 'botanical',
      description:
        "Yellow gentian is a tall perennial of the alpine and sub-alpine pastures of central and southern Europe, found from the mountains of Spain and Portugal and the Pyrenees through the Alps to the Balkans, though it reaches neither northern Europe nor the British Isles. A thick, yellowish-brown, intensely bitter root, often a foot long and sometimes far longer, sends up a stem of a metre or more with paired, stiff, pointed leaves, yellowish green and strongly veined, which clasp the stem higher up. Large, wheel-shaped, deep yellow flowers, sometimes flecked with brown, crowd in orange-yellow whorls where the upper leaves meet the stem. The genus is named after Gentius, a king of Illyria in the second century BC whom Pliny and Dioscorides credited with finding the plants' medicinal worth. In the Middle Ages gentian was taken as an antidote to poison, and before hops it was one of the bitter herbs now and then used in brewing; its dried root, gathered across central and southern Europe, remained the chief vegetable bitter of the pharmacy. In magic it is added to love baths and sachets, lends extra power to any incense or sachet it joins, and is used to break hexes and curses.",
      elements: ['fire'],
      planets: ['Mars'],
      safetyNotes:
        'AHPA safety class 1. Use with caution where there is irritation of the digestive tract or a duodenal ulcer, and headaches may occasionally occur in people sensitive to bitter substances. Home collectors have repeatedly mistaken Veratrum species for gentian, and Veratrum causes adverse effects on the heart and digestive tract. Gentian has been used as an emmenagogue in the Unani tradition of India, though not in Europe, and its safety while nursing has not been conclusively established. Cunningham marks it not to be taken internally by anyone with ulcers, and notes that it may disturb the digestive system if taken internally.',
      folkNames: ['Bitter Root', 'Yellow Gentian', 'Hochwurzel'],
      categories: ['Love', 'Hex-Breaking'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Gentian; p. 266',
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
          source: 'ahpa-safety',
          locator: 'pp. 401–402',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-gentians',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 401',
              supports: ['form'],
            },
            {
              source: 'grieve-gentians',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Geranium',
      canonicalName: 'Pelargonium',
      nomenclature: 'botanical',
      description:
        "Geranium is the everyday name for Pelargonium, a genus of about 280 species of perennials, succulents and shrubs in the family Geraniaceae. Linnaeus first put them in the genus Geranium, and in 1789 L'Héritier gave them a genus of their own, named from the Greek for stork because the seed head looks like a stork's beak; the same likeness gives the name storksbill. Nine in ten species are native to southern Africa, the rest mostly to East Africa and southern Australia. P. triste reached the botanic garden at Leiden before 1600, and John Tradescant brought it to England in 1631. The five-petalled flowers open in rounded clusters from the centre outwards; garden kinds bloom pink, white, red or salmon above rounded leaves often banded with colour. Scented-leaved kinds are distilled for perfume: in the nineteenth century French perfumers found that rose geranium smelt much like costly attar of rose, and Réunion, then called Bourbon, became the centre of its trade. Geraniums have been grown in European gardens since the seventeenth century, partly to guard the home against evil spirits. Cunningham finds them protective whether planted outdoors or brought in fresh-cut and set in water, says snakes will not go where they grow, and tells of a bed of red geraniums by a witch's cottage charmed to point towards approaching strangers.",
      elements: ['water'],
      planets: ['Venus', 'Mars'],
      zodiacSigns: ['Aries', 'Cancer'],
      safetyNotes:
        "Cunningham's health code marks geranium as currently recognised as safe. The plants are toxic to cats, dogs and horses, according to the ASPCA as cited by Wikipedia.",
      folkNames: ['Storkbill', 'Storksbill'],
      deities: ['Minerva'],
      categories: [
        'Fertility',
        'Love',
        'Protection',
        'Harmony',
        'Communication',
        'Confidence',
        'Courage',
        'Creativity',
        'Psychic Work',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Geranium; p. 266',
          supports: ['elements', 'planets', 'categories', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Geranium',
          supports: [
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
          source: 'wikipedia-pelargonium',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            'Kynes sets a couple of red geraniums on a windowsill facing the direction a threat seems to come from.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Geranium',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Geranium',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-pelargonium',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves of the scented kinds are edible and flavour jellies, cakes, butters, ice cream and teas; rose, lemon and peppermint scents are the ones most used.',
          references: [
            {
              source: 'wikipedia-pelargonium',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Geranium essential oil is distilled from rose geranium and other scented kinds, and is sometimes used to stretch or adulterate expensive rose oil. Aromatherapy treats it as a relaxant. Kynes places a cotton ball soaked in the oil among ritual tools to cleanse them.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Geranium',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-pelargonium',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'German Chamomile',
      canonicalName: 'Matricaria chamomilla',
      nomenclature: 'botanical',
      description:
        "German chamomile is an annual of the daisy family, native to southern and eastern Europe and now found on every continent. Its smooth, branching, upright stems grow 15 to 60 centimetres tall, with finely divided, feathery leaves and small flower heads of white rays around a yellow centre, set on a hollow, swollen base; the flowers are less fragrant than the apple-scented Roman chamomile's. The word chamomile goes back to a Greek name meaning earth-apple. It is most often drunk as a tea. The Egyptians, Greeks and Romans used chamomile as medicine; the Anglo-Saxons called it maythe, and in northern Europe it was known as Balder's brow. In medieval England it was strewn on floors to keep pests down and sweeten the air. It was thought strongest when picked at Midsummer and was thrown on the Midsummer fire for protection and prosperity. Across much of Germany a chamomile wreath hung on Midsummer's Eve kept thunderstorms from the house, a sprig worn guarded against bewitchment, and small bunches hung from northern German ceilings were said to sway when a witch came in. Cunningham gives it to the Sun and to water and puts it in calming and sleep incenses and brews, uses it to attract money, and turns its sunny nature against curses and spells. Kynes drinks the tea before bed for dream work.",
      elements: ['water', 'air'],
      planets: ['Sun', 'Mercury'],
      zodiacSigns: ['Cancer', 'Leo'],
      safetyNotes:
        'AHPA places chamomile in safety class 1, herbs that can be safely consumed when used appropriately. Anyone allergic to other plants of the daisy family, such as feverfew or echinacea, should take care, since cross-reactions are common, and allergic reactions including anaphylaxis have been reported. Very strong hot tea can cause vomiting, and the German standard licence warns against using the infusion near the eyes. Chamomile has a theoretical potential to interact with warfarin, and Kynes advises against taking it with prescription blood thinners; chamomile tea taken with iron-fortified bread reduced the iron absorbed. Its safety in pregnancy and while nursing has not been established.',
      folkNames: [
        'Ground Apple',
        'Heermannchen',
        'Chamaimelon',
        'Camomyle',
        'Blue Chamomile',
        'Mayweed',
        'True Chamomile',
        'Wild Chamomile',
        'Hungarian Chamomile',
        'Scented Mayweed',
        'Camomile',
      ],
      deities: ['Cernunnos', 'Ra'],
      categories: [
        'Abundance',
        'Confidence',
        'Divination',
        'Dream Work',
        'Healing',
        'Intuition',
        'Love',
        'Peace',
        'Prosperity',
        'Protection',
        'Psychic Work',
        'Purification',
        'Release',
      ],
      substitutes: [
        {
          name: 'Roman Chamomile',
        },
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Chamomile, German',
          supports: ['elements', 'planets', 'folkNames', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Chamomile',
          supports: [
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
          locator: 'p. 549; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'p. 210',
          supports: ['folkNames', 'safetyNotes', 'substitutes'],
        },
        {
          source: 'wikipedia-matricaria-chamomilla',
          supports: ['canonicalName', 'nomenclature', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 549',
              supports: ['form'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 210',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Chamomile',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The flowers hold between 0.3 and 1.5 per cent essential oil, distilled mostly from fresh flower buds and stalks. Chamazulene turns it blue, which is why the plant is also called blue chamomile, and bisabolol makes up as much as a third of it.',
          colors: ['blue'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Chamomile',
              supports: ['form'],
            },
            {
              source: 'wikipedia-matricaria-chamomilla',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'To counter a hex, Kynes lays two stems of German chamomile across each other on the altar in the shape of an X.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Chamomile',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Ginger',
      canonicalName: 'Zingiber officinale',
      nomenclature: 'botanical',
      description:
        'Ginger is a tropical perennial of the family that also holds turmeric, cardamom and galangal, and the spice is its knobbly, branching rhizome. Leafy, reed-like stems about a metre tall rise from the rhizome, with the flowers carried on separate spikes. It is a true cultigen, unknown in the wild. It arose in Maritime Southeast Asia, where Austronesian peoples domesticated it, used it in rites of healing and of protection from spirits and in blessing their ships, and carried it across the Indo-Pacific as far as Hawaii. It was among the first spices traded out of Asia. Confucius was said to eat it at every meal, Arab traders brought it to the Mediterranean, where Dioscorides and Pliny described it, and in the sixteenth century it became the leading export of Hispaniola and Puerto Rico. Kynes records it in the temple incense of Syria, Egypt, Greece, Rome and India, thrown on the fire or rubbed as a paste onto sticks and onto statues of the gods; as an aphrodisiac in early medieval Europe; as a guard against plague in sixteenth-century England; as one of the spices of Italian exorcisms; and hung on a string about the necks of Thai children to keep harmful spirits away. Cunningham eats ginger before working a spell to lend it heat and power, above all in love magic, and uses it for money and success.',
      elements: ['fire', 'earth'],
      planets: ['Mars', 'Moon'],
      zodiacSigns: ['Aries', 'Sagittarius', 'Scorpio'],
      safetyNotes:
        "AHPA places ginger rhizome in safety class 1, herbs that can be safely consumed when used appropriately. People with active gallstone disease should use it only under the supervision of a qualified healthcare practitioner. Heartburn and other digestive upsets occasionally follow its use, especially in large doses; allergic reactions have been reported, mainly in spice-factory workers; and excessive doses of fresh-ginger preparations have been reported to cause dry mouth, sore throat, nosebleeds and kidney inflammation. One human trial found that ginger taken with nifedipine slowed blood clotting more than the drug alone. Traditional Chinese texts caution against dried ginger in pregnancy, although clinical trials in pregnant women have not reported harm to pregnancy outcomes. Cunningham's codes say the dried root should not be used above normal food amounts, or at all in pregnancy or with gallstones, and that the fresh root is recognised as safe.",
      folkNames: ['African Ginger', 'Common Ginger', 'Ginger Root', 'True Ginger'],
      categories: [
        'Love',
        'Success',
        'Healing',
        'Prosperity',
        'Protection',
        'Psychic Work',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Ginger; p. 266',
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
          locator: 's.v. Ginger',
          supports: [
            'canonicalName',
            'nomenclature',
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
          locator: 'pp. 948–949; p. xxii',
          supports: ['canonicalName', 'nomenclature', 'safetyNotes'],
        },
        {
          source: 'wikipedia-ginger',
          supports: ['canonicalName', 'nomenclature', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'The rhizome, sold fresh, dried, grated or ground. Cunningham plants whole roots and grows them to attract money; Kynes lays a piece among the magical tools to consecrate and cleanse them.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 948',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ginger',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Ginger',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Cunningham sprinkles the powdered root into pockets or onto money to draw more of it.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Ginger',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description: 'Kynes prepares a protective amulet with the essential oil.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Ginger',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Globeflower',
      canonicalName: 'Trollius europaeus',
      nomenclature: 'botanical',
      description:
        "The globeflower is a perennial of the buttercup family, at home in damp woods and mountain pastures across northern and central Europe, from the Caucasus and Siberia west to Wales and now and then Ireland, and growing wild in Scotland and the north of England. It stands about two feet high on hollow stems, each topped by a single yellow flower about two inches across that stays almost closed in a ball, so that it looks like a tiny yellow cabbage; the few leaves, low on the stem, are deeply cut into three to five lobes. Kynes notes that it holds back the growth of plants near it. Much of its name and lore comes from northern folklore. In Scotland it was called witches' gowan, gowan having once meant any large yellow flower, and its white, toxic sap was witches' milk. A Dutch legend has elves using the flowers as cups to brew poison, and in Scandinavian myth the plant is poisonous because trolls tampered with it. Grieve, writing in 1931, describes it as a favourite flower of rustic festivals, gathered by young people in early June to deck cottage doors, and reports that the Swedish naturalist Peter Kalm thought the plant lost most of its strength when dried. In magic it serves for defence and for warding off negative energy, called up as an image of a ball of soft yellow light.",
      elements: ['water'],
      safetyNotes:
        'Kynes warns that globeflower is mildly poisonous and should not be eaten, and that it may irritate and burn the skin.',
      folkNames: [
        'Common Globeflower',
        'European Globeflower',
        'Goblin Flower',
        'Troll Flower',
        "Witches' Gowan",
        'Globe Trollius',
        "Boule d'Or",
        'Globe Ranunculus',
        'Globe Crowfoot',
        'Lucken-Gowans',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Globeflower',
          supports: [
            'canonicalName',
            'nomenclature',
            'elements',
            'folkNames',
            'safetyNotes',
            'description',
          ],
        },
        {
          source: 'grieve-globe-flower',
          supports: ['folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          description:
            "The ball-shaped yellow flower is the plant's emblem: elves were said to brew poison in it, and country people gathered it in June to decorate their doors. Kynes places a picture of the flower on the altar for defence.",
          colors: ['yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Globeflower',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-globe-flower',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
  ],
};
