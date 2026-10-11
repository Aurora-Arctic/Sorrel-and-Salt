import type { SeedCompendiumShard } from '../types';

// MB.243: the candidate list's plants and fungi from A to Cn, bar the three
// the pilot seeded. Every value traces to a source a citation names, each read
// during the task; claude-docs/db/compendium-seed/plants-a-cn.md records which
// source supports which fields, and what was left out and why. Descriptions are
// written fresh from the sources, never copied.
export const PLANTS_A_CN: SeedCompendiumShard = {
  name: 'plants-a-cn',
  sources: {
    'grieve-adders-tongue-american': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: "Adder's Tongue (American)",
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/adder008.html',
      accessed: '2026-10-11',
    },
    'grieve-agrimony': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Agrimony',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/agrim015.html',
      accessed: '2026-10-11',
    },
    'grieve-alder-common': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Alder, Common',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/alder019.html',
      accessed: '2026-10-11',
    },
    'grieve-alkanets': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Alkanets',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/alkan024.html',
      accessed: '2026-10-11',
    },
    'grieve-allspice': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Allspice',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/allsp025.html',
      accessed: '2026-10-11',
    },
    'grieve-almonds': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Almonds',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/almon026.html',
      accessed: '2026-10-11',
    },
    'grieve-aloes': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Aloes',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/aloes027.html',
      accessed: '2026-10-11',
    },
    'grieve-amaranths': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Amaranths',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/amara030.html',
      accessed: '2026-10-11',
    },
    'grieve-angelica': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Angelica',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/anegl037.html',
      accessed: '2026-10-11',
    },
    'grieve-anise': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Anise',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/anise040.html',
      accessed: '2026-10-11',
    },
    'grieve-apple': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Apple',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/apple044.html',
      accessed: '2026-10-11',
    },
    'grieve-apricot': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Apricot',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/apric050.html',
      accessed: '2026-10-11',
    },
    'grieve-arnica': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Arnica',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/arnic058.html',
      accessed: '2026-10-11',
    },
    'grieve-ash': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Ash',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/ash--073.html',
      accessed: '2026-10-11',
    },
    'grieve-avens': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Avens',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/a/avens083.html',
      accessed: '2026-10-11',
    },
    'grieve-barberry-common': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Barberry, Common',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/barcom12.html',
      accessed: '2026-10-11',
    },
    'grieve-basil-sweet': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Basil, Sweet',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/basswe18.html',
      accessed: '2026-10-11',
    },
    'grieve-bean-kidney': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Bean, Kidney',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/beakid21.html',
      accessed: '2026-10-11',
    },
    'grieve-bearberry': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Bearberry',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/bearbe22.html',
      accessed: '2026-10-11',
    },
    'grieve-beech': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Beech',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/beech-27.html',
      accessed: '2026-10-11',
    },
    'grieve-beetroots': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Beetroots',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/beetro28.html',
      accessed: '2026-10-11',
    },
    'grieve-bergamot': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Bergamot',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/bergam32.html',
      accessed: '2026-10-11',
    },
    'grieve-bilberry': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Bilberry',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/bilber37.html',
      accessed: '2026-10-11',
    },
    'grieve-bindweeds': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Bindweeds',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/bindwe38.html',
      accessed: '2026-10-11',
    },
    'grieve-birch-common': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Birch, Common',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/bircom43.html',
      accessed: '2026-10-11',
    },
    'grieve-bistort': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Bistort',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/b/bistor45.html',
      accessed: '2026-10-11',
    },
    'grieve-ginseng': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Ginseng',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/g/ginsen15.html',
      accessed: '2026-10-11',
    },
    'grieve-laurel-bay': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Laurel (Bay)',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/l/larbay10.html',
      accessed: '2026-10-11',
    },
    'grieve-lucerne': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Lucerne',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/l/lucern48.html',
      accessed: '2026-10-11',
    },
    'grieve-nightshade-deadly': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Nightshade, Deadly',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/n/nighde05.html',
      accessed: '2026-10-11',
    },
    'grieve-orange-bitter': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Orange, Bitter',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/o/orabit11.html',
      accessed: '2026-10-11',
    },
    'grieve-orange-sweet': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Orange, Sweet',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/o/oraswe12.html',
      accessed: '2026-10-11',
    },
    'grieve-poplar-trembling': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Poplar, trembling',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/p/poplar61.html',
      accessed: '2026-10-11',
    },
    'grieve-unicorn-root-true': {
      kind: 'web_page',
      authors: 'Grieve, M.',
      title: 'Unicorn Root, True',
      container: 'A Modern Herbal',
      url: 'https://www.botanical.com/botanical/mgmh/u/unitru02.html',
      accessed: '2026-10-11',
    },
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
    'wikipedia-apple': {
      kind: 'entry',
      title: 'Apple',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Apple&oldid=1378395484',
      accessed: '2026-10-11',
    },
    'wikipedia-arctostaphylos-uva-ursi': {
      kind: 'entry',
      title: 'Arctostaphylos uva-ursi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Arctostaphylos_uva-ursi&oldid=1358701321',
      accessed: '2026-10-11',
    },
    'wikipedia-arnica-montana': {
      kind: 'entry',
      title: 'Arnica montana',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Arnica_montana&oldid=1361261909',
      accessed: '2026-10-11',
    },
    'wikipedia-atropa-bella-donna': {
      kind: 'entry',
      title: 'Atropa bella-donna',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Atropa_bella-donna&oldid=1376240967',
      accessed: '2026-10-11',
    },
    'wikipedia-avocado': {
      kind: 'entry',
      title: 'Avocado',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Avocado&oldid=1378057135',
      accessed: '2026-10-11',
    },
    'wikipedia-bambusa-vulgaris': {
      kind: 'entry',
      title: 'Bambusa vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bambusa_vulgaris&oldid=1364829467',
      accessed: '2026-10-11',
    },
    'wikipedia-barley': {
      kind: 'entry',
      title: 'Barley',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Barley&oldid=1377470667',
      accessed: '2026-10-11',
    },
    'wikipedia-basil': {
      kind: 'entry',
      title: 'Basil',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Basil&oldid=1375753314',
      accessed: '2026-10-11',
    },
    'wikipedia-berberis-vulgaris': {
      kind: 'entry',
      title: 'Berberis vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Berberis_vulgaris&oldid=1378745653',
      accessed: '2026-10-11',
    },
    'wikipedia-bergamot-orange': {
      kind: 'entry',
      title: 'Bergamot orange',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bergamot_orange&oldid=1378785616',
      accessed: '2026-10-11',
    },
    'wikipedia-beta-vulgaris': {
      kind: 'entry',
      title: 'Beta vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Beta_vulgaris&oldid=1358735749',
      accessed: '2026-10-11',
    },
    'wikipedia-betula-pendula': {
      kind: 'entry',
      title: 'Betula pendula',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Betula_pendula&oldid=1377221570',
      accessed: '2026-10-11',
    },
    'wikipedia-bistorta-officinalis': {
      kind: 'entry',
      title: 'Bistorta officinalis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bistorta_officinalis&oldid=1366901099',
      accessed: '2026-10-11',
    },
    'wikipedia-bitter-orange': {
      kind: 'entry',
      title: 'Bitter orange',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bitter_orange&oldid=1368703094',
      accessed: '2026-10-11',
    },
    'wikipedia-callistephus': {
      kind: 'entry',
      title: 'Callistephus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Callistephus&oldid=1364266549',
      accessed: '2026-10-11',
    },
    'wikipedia-cascabela-thevetia': {
      kind: 'entry',
      title: 'Cascabela thevetia',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cascabela_thevetia&oldid=1352558539',
      accessed: '2026-10-11',
    },
    'wikipedia-celastrus-scandens': {
      kind: 'entry',
      title: 'Celastrus scandens',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Celastrus_scandens&oldid=1359249101',
      accessed: '2026-10-11',
    },
    'wikipedia-convolvulus-arvensis': {
      kind: 'entry',
      title: 'Convolvulus arvensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Convolvulus_arvensis&oldid=1375030855',
      accessed: '2026-10-11',
    },
    'wikipedia-erythronium-americanum': {
      kind: 'entry',
      title: 'Erythronium americanum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Erythronium_americanum&oldid=1317640579',
      accessed: '2026-10-11',
    },
    'wikipedia-fagus-sylvatica': {
      kind: 'entry',
      title: 'Fagus sylvatica',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fagus_sylvatica&oldid=1377220777',
      accessed: '2026-10-11',
    },
    'wikipedia-ficus-benghalensis': {
      kind: 'entry',
      title: 'Ficus benghalensis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ficus_benghalensis&oldid=1373022388',
      accessed: '2026-10-11',
    },
    'wikipedia-fraxinus-excelsior': {
      kind: 'entry',
      title: 'Fraxinus excelsior',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fraxinus_excelsior&oldid=1377214339',
      accessed: '2026-10-11',
    },
    'wikipedia-geum-urbanum': {
      kind: 'entry',
      title: 'Geum urbanum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Geum_urbanum&oldid=1367046657',
      accessed: '2026-10-11',
    },
    'wikipedia-laurus-nobilis': {
      kind: 'entry',
      title: 'Laurus nobilis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Laurus_nobilis&oldid=1374863417',
      accessed: '2026-10-11',
    },
    'wikipedia-monarda-didyma': {
      kind: 'entry',
      title: 'Monarda didyma',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Monarda_didyma&oldid=1333252509',
      accessed: '2026-10-11',
    },
    'wikipedia-panax-ginseng': {
      kind: 'entry',
      title: 'Panax ginseng',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Panax_ginseng&oldid=1369794386',
      accessed: '2026-10-11',
    },
    'wikipedia-phaseolus-vulgaris': {
      kind: 'entry',
      title: 'Phaseolus vulgaris',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Phaseolus_vulgaris&oldid=1372316115',
      accessed: '2026-10-11',
    },
    'wikipedia-populus-tremuloides': {
      kind: 'entry',
      title: 'Populus tremuloides',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Populus_tremuloides&oldid=1369889820',
      accessed: '2026-10-11',
    },
    'wikipedia-prunus-armeniaca': {
      kind: 'entry',
      title: 'Prunus armeniaca',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Prunus_armeniaca&oldid=1346731742',
      accessed: '2026-10-11',
    },
    'wikipedia-streptocarpus-ionanthus': {
      kind: 'entry',
      title: 'Streptocarpus ionanthus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Streptocarpus_ionanthus&oldid=1315367187',
      accessed: '2026-10-11',
    },
    'wikipedia-vaccinium-myrtillus': {
      kind: 'entry',
      title: 'Vaccinium myrtillus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Vaccinium_myrtillus&oldid=1377480885',
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
          source: 'grieve-adders-tongue-american',
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
              source: 'grieve-adders-tongue-american',
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
              source: 'grieve-adders-tongue-american',
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
          source: 'grieve-agrimony',
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
              source: 'grieve-agrimony',
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
          source: 'grieve-unicorn-root-true',
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
              source: 'grieve-unicorn-root-true',
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
          source: 'grieve-alder-common',
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
              source: 'grieve-alder-common',
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
              source: 'grieve-alder-common',
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
              source: 'grieve-alder-common',
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
          source: 'grieve-lucerne',
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
              source: 'grieve-lucerne',
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
          source: 'grieve-alkanets',
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
              source: 'grieve-alkanets',
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
          source: 'grieve-allspice',
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
              source: 'grieve-allspice',
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
              source: 'grieve-allspice',
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
          source: 'grieve-almonds',
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
              identity: 'prunus armeniaca',
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
              source: 'grieve-almonds',
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
              source: 'grieve-almonds',
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
          source: 'grieve-aloes',
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
              source: 'grieve-aloes',
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
              source: 'grieve-aloes',
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
          source: 'grieve-amaranths',
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
          source: 'grieve-ginseng',
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
              source: 'grieve-ginseng',
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
          source: 'grieve-angelica',
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
              source: 'grieve-angelica',
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
              source: 'grieve-angelica',
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
          source: 'grieve-anise',
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
              source: 'grieve-anise',
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
              source: 'grieve-anise',
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
    {
      name: 'Apple',
      canonicalName: 'Malus domestica',
      nomenclature: 'botanical',
      description:
        'The orchard apple is a deciduous tree whose round fruit is now grown all over the world. It comes from Central Asia, where the wild species it descends from, Malus sieversii, can still be found, and was cultivated across Eurasia for thousands of years before European colonists carried it to the Americas. In spring it bears five-petalled blossoms, rose-pink as they open and paling to white, and the fruit ripens in late summer or autumn around a core of seed chambers. Grieve records charred apples in the Swiss lake dwellings and the English custom of wassailing orchards with cider at Christmas, and in Norse myth the goddess Iðunn kept the apples that gave the gods their youth. Celtic lore made it a fruit of knowledge, prophecy and the otherworld: Avalon takes its name from the Welsh for apple tree, and a branch bearing bud, blossom and ripe fruit together was a charm for entering the land of the gods. Wiccan altars are heaped with apples at Samhain, when the fruit is counted among the foods of the dead. In magic the apple belongs above all to love: it is halved and shared with a lover, given to the one desired, and its seeds are counted to foretell a marriage. It also serves healing, rubbed on an ailing part and buried while the Moon wanes, and stands for immortality.',
      elements: ['water', 'air'],
      planets: ['Venus', 'Jupiter'],
      zodiacSigns: ['Aquarius', 'Cancer', 'Libra', 'Taurus'],
      safetyNotes:
        'The seeds contain amygdalin, which releases cyanide once digested. A few seeds do no harm, but very large amounts can cause adverse reactions, which may take hours to appear; Cunningham marks the seeds, in large amounts, as poison, and Kynes cautions against swallowing them. Raw apple can set off an oral allergy in people allergic to birch pollen, which leaves the mouth and throat itchy and inflamed and in rare cases brings on life-threatening anaphylaxis; cooking destroys that allergen. A second form, found around the Mediterranean and related to peach allergy, survives cooking and can be more severe, with vomiting, stomach pain and hives.',
      folkNames: [
        'Fruit of the Gods',
        'Fruit of the Underworld',
        'Silver Branch',
        'Silver Bough',
        'Tree of Love',
        'Orchard Apple',
        'Domestic Apple',
      ],
      deities: [
        'Venus',
        'Dionysus',
        'Apollo',
        'Hera',
        'Athena',
        'Aphrodite',
        'Diana',
        'Zeus',
        'Ceres',
        'Demeter',
        'Eros',
        'Freya',
        'Manannan mac Lir',
        'Minerva',
        'Rhiannon',
      ],
      categories: [
        'Love',
        'Healing',
        'Abundance',
        'Ancestor Work',
        'Binding',
        'Creativity',
        'Divination',
        'Dream Work',
        'Fertility',
        'Prosperity',
        'Strength',
        'Success',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Apple',
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
          locator: 's.v. Apple',
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
          source: 'grieve-apple',
          supports: ['description'],
        },
        {
          source: 'wikipedia-apple',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          description:
            "Kynes reads the fruit's colour into a spell: red fruit for love, passion and desire, yellow or gold for success, and green for abundance and prosperity.",
          colors: ['red', 'yellow', 'gold', 'green'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Apple',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-apple',
              supports: ['form'],
            },
            {
              source: 'wikipedia-apple',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Cunningham adds apple blossom to sachets, brews and incense for love, and steeps it in melted pink wax, straining it out afterwards, to make candles burned to draw love.',
          colors: ['white', 'pink'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Apple',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Apple',
              supports: ['colors'],
            },
            {
              source: 'wikipedia-apple',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Apple wood is made into charms for long life and carved into magical images, and Cunningham counts it an excellent wood for wands, especially for emotional magic and rites of love. Kynes burns a small piece to scent the home and draw abundance.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Apple',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Apple',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Apricot',
      canonicalName: 'Prunus armeniaca',
      nomenclature: 'botanical',
      description:
        'Prunus armeniaca, the apricot most widely grown, is a small tree of eight to twelve metres with oval, finely toothed leaves and white to pinkish five-petalled flowers that open one or two together in early spring, ahead of the leaves. Its fruit, like a small peach, ripens from yellow to orange, often flushed red on the side facing the sun, and holds a single seed inside a hard stone. Genetic studies place its origin in Central Asia; the species name records an older belief that it came from Armenia, which Grieve set aside in favour of northern China and the Himalaya. She dates its arrival in England, from Italy, to the reign of Henry VIII. Apricots have long been dried for keeping and for trade. In China the tree is tied to learning and to medicine: Confucius was said to teach among apricot trees, and the physician Dong Feng took as his only fee that cured patients set apricot trees in his orchard. Kynes records that in north-eastern China the fruit was thought to confer prophecy, and that it is one candidate for the golden apples of Hera’s garden. In magic it is a plant of love: the fruit is eaten to sweeten the temper, its juice goes into love potions, and its flowers suit a handfasting or an anniversary.',
      elements: ['water'],
      planets: ['Venus', 'Neptune', 'Sun'],
      zodiacSigns: ['Taurus'],
      safetyNotes:
        'The kernel inside the stone is poisonous. Kynes warns that it is toxic if eaten and can kill, and that in Prunus species both seeds and leaves give rise to cyanide in the gut; Cunningham marks the seeds as not recommended for internal use. The Seed form gives the safety handbook’s detail.',
      folkNames: [
        'Umublinkosi',
        'Xing Ren',
        'Armenian Plum',
        'Chinese Apricot',
        'Apricock',
        'Chinese Bitter Almond',
      ],
      deities: ['Venus', 'Aphrodite'],
      categories: [
        'Love',
        'Harmony',
        'Creativity',
        'Divination',
        'Fertility',
        'Knowledge',
        'Peace',
        'Prophecy',
        'Purification',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Apricot; p. 266',
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
          locator: 's.v. Apricot',
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
          source: 'ahpa-safety',
          locator: 'p. 702',
          supports: ['canonicalName', 'folkNames'],
        },
        {
          source: 'grieve-apricot',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-prunus-armeniaca',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          colors: ['yellow', 'orange'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Apricot',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Apricot',
              supports: ['form'],
            },
            {
              source: 'wikipedia-prunus-armeniaca',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'Cunningham adds apricot leaves and flowers to love sachets, and Kynes uses the flowers at a handfasting or an anniversary to bring lovers together.',
          colors: ['white', 'pink'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Apricot',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Apricot',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-prunus-armeniaca',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The kernel inside the stone. Cunningham has the stones carried to attract love. Grieve notes that Eau de Noyaux, a French liqueur, is made from bitter apricot kernels, and that the kernels yield both a fixed oil and an essential oil that contains amygdalin.',
          safetyNotes:
            'AHPA safety class 3: the kernel is for use only with a qualified expert overseeing it, and should not be sold loose in bulk or given to children. Bitter kernels hold cyanide-forming glycosides (up to 8% amygdalin); sweet kernels hold very little, and the cautions concern the bitter kind. Fatal and non-fatal poisonings have followed eating apricot kernels: 10 to 20 kernels have been reported as a toxic dose for a child and 40 to 60 for an adult. Symptoms include nausea, vomiting, stomach pain, headache, dizziness, breathlessness and palpitations, and in severe cases coma and death from respiratory failure. Rats fed high-amygdalin kernel had fewer surviving young; safety while nursing is not established. Cunningham marks the seeds as not recommended for internal use.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Apricot; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'grieve-apricot',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 702–704; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The fixed oil pressed from the kernels, which Kynes lists as apricot kernel oil and Grieve says usually went on sale under the name peach kernel oil. Grieve describes it as very like almond oil and used in its place, prized in cosmetics for softening the skin and in soaps and cold creams. In seventeenth-century England apricot oil was used in herbal treatments for tumours, swellings and ulcers.',
          safetyNotes: 'The oil pressed from apricot kernels contains no cyanogenic glycosides.',
          references: [
            {
              source: 'grieve-apricot',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Apricot',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-prunus-armeniaca',
              supports: ['description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 703',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Arnica',
      canonicalName: 'Arnica montana',
      nomenclature: 'botanical',
      description:
        'Arnica is an aromatic perennial of the daisy family, about 18 to 60 centimetres tall, with a flat rosette of downy, oval leaves and large orange-yellow flower heads from May to August. It grows across most of Europe on poor, acid ground, above all in alpine meadows up to almost three thousand metres, and never on lime; it is becoming rarer as farming intensifies and wild plants are gathered for sale. It has a long history in European folk medicine, where a tincture of the flowers or the root was applied to sprains, bruises and wounds, although the plant is toxic when swallowed. German custom was to pick it at Midsummer and hang it on houses as a guard against lightning, hail and fire. Hildegard von Bingen linked it with wolves and noted it as an aphrodisiac used in love magic, and the old name leopard’s bane comes from confusing it with a different plant, Doronicum pardalianches. Kynes associates it with water, Saturn and Hecate, and uses it for love, protection, peace and psychic ability: a candle dressed with its oil serves a love spell, its seeds are scattered at the corners of a property to raise a shield of safety, and its energy quietens restless spirits in a home.',
      elements: ['water'],
      planets: ['Saturn'],
      safetyNotes:
        'AHPA safety class 3 for internal use and 2d for external use: not to be taken by mouth unless a qualified expert oversees it, and never to be applied to broken skin or open wounds. Swallowing it has caused severe poisoning, with fever, racing heart and raised liver enzymes, and deaths have been reported; it irritates the mucous membranes and can cause stomach pain, diarrhoea and vomiting. It contains sesquiterpene lactones that cause allergic contact dermatitis in sensitive people, and people allergic to other plants of the daisy family, sunflower, marigold and feverfew among them, should be cautious. Overdoses have caused miscarriage, and safety while nursing is not established. Kynes adds that long external use can irritate the skin.',
      folkNames: [
        'Mountain Arnica',
        "Leopard's Bane",
        'Mountain Daisy',
        'Sneezewort',
        "Wolf's Bane",
        'Wolfsblume',
        'European Arnica',
        'Mountain Tobacco',
      ],
      deities: ['Hecate'],
      categories: [
        'Confidence',
        'Divination',
        'Love',
        'Peace',
        'Protection',
        'Psychic Work',
        'Purification',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Arnica',
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
          source: 'ahpa-safety',
          locator: 'pp. 87–88; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-arnica',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-arnica-montana',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['yellow'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 87',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Arnica',
              supports: ['form'],
            },
            {
              source: 'grieve-arnica',
              supports: ['form'],
            },
            {
              source: 'wikipedia-arnica-montana',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            'The rhizome, dug in autumn once the leaves have died back and then dried. Grieve gives a tincture of the root as the British Pharmacopoeia preparation, where the United States used the flowers.',
          references: [
            {
              source: 'grieve-arnica',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-arnica-montana',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 87',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description: 'Kynes dresses a candle with arnica oil for a love spell.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Arnica',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'For protection, Kynes sprinkles the seeds at the corners of a property while picturing their energy forming a dome of safety over it.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Arnica',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Ash',
      canonicalName: 'Fraxinus excelsior',
      nomenclature: 'botanical',
      description:
        'The common or European ash is a tall deciduous tree of the olive family, native across mainland Europe from the north of Spain to Russia, east to the Caucasus, and throughout Britain and Ireland, where it favours limestone. Its compound leaves carry seven to thirteen toothed leaflets, its winter buds are jet black, and its winged seeds, called keys, hang in bunches until the following spring. Its tough, springy timber has made spears, bows, tool handles and carts, and in Ireland every hurley. In Norse myth the world tree Yggdrasil, which holds up the nine worlds, is an ash. Old superstitions recorded by Grieve used it to charm away warts and, by passing a child through a split sapling, to cure rupture; Cunningham adds that snakes will not cross its wood, and Kynes that where ash, oak and hawthorn grow together the faery realm may be seen. Culpeper places it under the Sun. In magic it is a tree of protection and of the sea: a solar cross carved from its wood guards against drowning, a staff of it over the door keeps harm away, its leaves under the pillow bring prophetic dreams, and ash burned at Yule brings prosperity.',
      elements: ['fire', 'air', 'earth', 'water'],
      planets: ['Sun', 'Mercury', 'Neptune', 'Uranus'],
      zodiacSigns: ['Capricorn', 'Libra', 'Taurus', 'Virgo'],
      folkNames: [
        'Nion',
        'Asktroed',
        'Jasen Beli',
        'Freixo',
        'Common Ash',
        'English Ash',
        'European Ash',
        'Venus of the Woods',
      ],
      deities: [
        'Poseidon',
        'Thor',
        'Neptune',
        'Mars',
        'Gwydion',
        'Ares',
        'Belenus',
        'Dagda',
        'Freyr',
        'Frigg',
        'Manannan mac Lir',
        'Minerva',
        'Odin',
      ],
      categories: [
        'Protection',
        'Prosperity',
        'Communication',
        'Creativity',
        'Divination',
        'Dream Work',
        'Fertility',
        'Healing',
        'Inspiration',
        'Intuition',
        'Love',
        'Prophecy',
        'Strength',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Ash',
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
          locator: 's.v. Ash',
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
          source: 'culpeper-herbal',
          locator: 's.v. Ash Tree',
          supports: ['planets', 'description'],
        },
        {
          source: 'grieve-ash',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-fraxinus-excelsior',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Bark',
          description:
            'Cunningham records a garter of green ash bark once worn against the power of sorcerers and conjurers. Grieve describes the bark, taken from the trunk and preferably the root, as bitter and astringent; it was used to tan nets and given in decoction for intermittent fevers.',
          safetyNotes: 'Cunningham marks the bark as currently recognised as safe.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Ash; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'grieve-ash',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fraxinus-excelsior',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Cunningham puts ash leaves under the pillow for prophetic dreams, scatters them to the four directions to guard a house, carries them to win love, and leaves a few in a bowl of water by the bed overnight to ward off illness. Kynes records leaves bearing an even count of leaflets as lucky in love charms and divination, and on the Isle of Bute lovers ate the leaves of one ash to dream of their future spouses. Grieve notes their laxative use in herbal medicine.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Ash',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ash',
              supports: ['description'],
            },
            {
              source: 'wikipedia-fraxinus-excelsior',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-ash',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Cunningham carves ash wood into an equal-armed solar cross carried against drowning, hangs a staff of it over the doorposts against harm, makes healing wands from it, and burns it at Yule for prosperity. Kynes keeps a small ash twig nearby for dream work and journeying.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Ash',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ash',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fraxinus-excelsior',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The winged keys. Kynes notes that a few carried in the pocket were thought lucky, and lays a ring of them round the base of a candle to strengthen a spell. Grieve records that they were once pickled with salt and vinegar and used in place of capers.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Ash',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-ash',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Asian Ginseng',
      canonicalName: 'Panax ginseng',
      nomenclature: 'botanical',
      description:
        "Asian ginseng is a herbaceous perennial, thirty to sixty centimetres tall, native to the mountains of the Russian Far East, north-east China and the Korean peninsula. Its leaves are divided like an open hand into three to five toothed leaflets, a single rounded cluster of small flowers stands above them, and the fruits ripen into round red berries. Below ground is a spindle-shaped taproot, usually branching once or twice, which is the part harvested, most often after five or six years of slow growth. The wild plant is protected in Russia and China, so most ginseng sold is farmed. Its species name is read as 'man-herb' or 'forked root', and a French Jesuit writing from China in 1711 reported that the Chinese name meant 'form of man', after the shape of the root. In Asia it has been taken as medicine for thousands of years and was long counted a cure-all. Chinese myth makes it a gift from the gods to a woman longing for a child; Korean legend says it must be dug with a blade of wood, since metal would spoil its virtue; other tales have the plant glowing and roaming at night. In medieval and Renaissance Europe it was prized as an aphrodisiac, the most human-shaped roots fetching the most. In magic it serves fertility, love, healing and protection: a root bound with pink or red ribbon goes into love and fertility spells, or a small piece is carried to draw romance.",
      elements: ['fire'],
      planets: ['Sun'],
      safetyNotes:
        'AHPA safety class 1 (its interaction class is A): no contraindications are known. Taking it with stimulants is not advised, since susceptible people may become over-stimulated, and red (steamed) ginseng may strengthen the effect of caffeine. A few case reports describe altered blood clotting in people also taking warfarin, though trials in people and rats found no interaction. It may change blood sugar, so people with diabetes should watch their levels and speak to a qualified practitioner first. Allergic reactions have been reported, and high doses or very long use can bring sleeplessness, nervousness and diarrhoea. Its safety while nursing is not established. Kynes says it should not be taken in pregnancy or while breastfeeding; AHPA notes that a British herbal text rules it out in pregnancy while texts on traditional Chinese medicine raise no such concern. Wikipedia calls its use in pregnancy and breastfeeding potentially unsafe and says children should not take it.',
      folkNames: ['Korean Ginseng', 'Chinese Ginseng', 'Ren Shen'],
      categories: ['Fertility', 'Healing', 'Love', 'Protection'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Ginseng',
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
          locator: 'pp. 619–620; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-panax-ginseng',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 619',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Ginseng',
              supports: ['form'],
            },
            {
              source: 'wikipedia-panax-ginseng',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            'Powdered dried root is sold alongside whole and sliced root, and it has a wishing spell of its own: take a handful to a favourite place outdoors, make the wish, and blow the powder away on the wind.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Ginseng',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Aspen',
      canonicalName: 'Populus tremuloides',
      nomenclature: 'botanical',
      description:
        "Quaking aspen is a deciduous tree of the cooler parts of North America and the most widespread tree on that continent, found from Canada down to the mountains of central Mexico. It grows quickly, with a tall trunk, smooth pale bark marked by black scars, and nearly round leaves on long, flattened stalks, so that the lightest air sets them shivering: the habit behind its names quaking and trembling aspen. In autumn the foliage turns gold or yellow. A stand often rises from one shared root system, every trunk a clone of the rest, and one such colony, Pando, is thought to be the oldest and heaviest organism alive. Its bitter bark was once taken against fevers in place of quinine and Peruvian bark. Aspen lore from Europe and Ireland links the tree with death and with healing: an Irish glossary of about 900 CE describes an aspen rod for measuring a fresh grave, Russians laid one over the grave of a suspected witch, and in northern England a lock of hair was pinned to an aspen as a cure. Its bark, like willow's, holds salicin. In magic it guards against theft, worked into spells or planted in a garden or field, and a leaf held under the tongue is said to make the speaker eloquent. A pressed leaf is kept to draw prosperity, a dried leaf is crumbled and burned to send a hex back, and a twig on the altar helps in reaching the ancestors.",
      elements: ['air', 'water'],
      planets: ['Mercury', 'Saturn', 'Venus'],
      zodiacSigns: ['Aquarius', 'Capricorn', 'Libra'],
      safetyNotes: 'Cunningham marks it as currently recognised as safe (his health code G).',
      folkNames: [
        'Quaking Aspen',
        'Trembling Aspen',
        'American Aspen',
        'Aspen Poplar',
        'Mountain Aspen',
        'Golden Aspen',
        'Quaking Poplar',
        'Trembling Poplar',
        'Shivering Tree',
        'Popple',
      ],
      deities: [
        'Apollo',
        'Danu',
        'Frigg',
        'Gaia',
        'Hecate',
        'Morrigan',
        'Odin',
        'Persephone',
        'Tyr',
        'Zeus',
      ],
      categories: [
        'Ancestor Work',
        'Communication',
        'Courage',
        'Divination',
        'Healing',
        'Knowledge',
        'Peace',
        'Prosperity',
        'Protection',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Aspen; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'folkNames',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Aspen',
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
          source: 'grieve-poplar-trembling',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'wikipedia-populus-tremuloides',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Aspen',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Aspen',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'The bark is the part herbalists used. Gathered in spring, it tastes bitter and has no smell, and was given as a tonic and for recurring fevers, a substitute for Peruvian bark; Indigenous North Americans and settlers in the American West drew a quinine substitute from it.',
          references: [
            {
              source: 'grieve-poplar-trembling',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-populus-tremuloides',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Aster',
      canonicalName: 'Callistephus chinensis',
      nomenclature: 'botanical',
      description:
        'The China aster is the only species in its genus, a member of the aster family native to China and Korea. It is an annual or biennial with one upright, mostly unbranched stem between twenty centimetres and a metre tall, leaves with serrated edges, and a single large flower head at the top whose rays are reddish purple in the wild. Grown in China for some two thousand years and in Europe from 1728 or earlier, it has been bred into flowers of many colours and heights, single and double, and is now planted worldwide in cottage gardens and for cutting, flowering from late summer into autumn. Greek myth told that asters were born from the tears of Virgo, falling to earth as stardust, and Cunningham writes that the classical Greeks set the flower on temple altars on feast days, holding it sacred to all the gods; they also burned it to drive off snakes and used it against snakebite. In medieval France and Germany its leaves were burned against evil spirits, and in Germany the flower was used, like a daisy, as a love oracle. Love is its chief work in magic: it goes into love sachets, a bloom is carried to win love, and it is grown in a garden while wishing for love. It is also used for clarity, intuition, inspiration, truth and psychic work.',
      elements: ['water'],
      planets: ['Venus'],
      zodiacSigns: ['Sagittarius', 'Virgo'],
      safetyNotes: 'Cunningham marks it as currently recognised as safe (his health code G).',
      folkNames: [
        'China Aster',
        'Annual Aster',
        'Powder Puff Aster',
        'Michaelmas Daisy',
        'Starwort',
      ],
      deities: ['Venus'],
      categories: [
        'Love',
        'Clarity',
        'Creativity',
        'Dream Work',
        'Inspiration',
        'Intuition',
        'Protection',
        'Psychic Work',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Aster; p. 266',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'deities',
            'categories',
            'folkNames',
            'safetyNotes',
          ],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Aster',
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
          source: 'wikipedia-callistephus',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Flower',
          colors: ['purple'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Aster',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Aster',
              supports: ['form'],
            },
            {
              source: 'wikipedia-callistephus',
              supports: ['form', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Avens',
      canonicalName: 'Geum urbanum',
      nomenclature: 'botanical',
      description:
        'Wood avens, or herb bennet, is a downy perennial of the rose family that grows in shady woodland edges, hedgerows and waysides across temperate Eurasia, and has been introduced to North America. Its wiry stems reach up to sixty centimetres and bear small flowers of five bright yellow petals, followed by bristling seed heads whose hooks catch in the fur of passing animals. Freshly dug, the root smells of cloves, because it holds eugenol, the compound found in the spice; it seasoned soups and flavoured ale, was laid among linen to keep moths away, and old physicians named a day in late March for lifting it, when its scent was strongest. Herb bennet is a worn-down form of the Latin herba benedicta, the blessed herb. Medieval Christians saw the Trinity in its three-part leaves and the Five Wounds in its five petals, and thirteenth-century masons carved it on the capitals of columns. Folk belief held that the root put evil spirits and the Devil to flight, so people wore it as an amulet against venomous creatures and mad dogs and hung over doorways. Culpeper set it under Jupiter. Magically, it goes into incenses for exorcism, scattered around a room to cleanse it, used in purification rites and love charms, and kept for abundance and protection.',
      elements: ['fire'],
      planets: ['Jupiter'],
      zodiacSigns: ['Pisces'],
      safetyNotes: 'Cunningham marks it as not recommended for internal use (his health code X).',
      folkNames: [
        'Wood Avens',
        'Herb Bennet',
        'Bennet',
        'Way Bennet',
        'Blessed Herb',
        "St. Benedict's Herb",
        'Herb Bonet',
        'Clove Root',
        'Colewort',
        'City Avens',
        'Wild Rye',
        'Goldy Star',
        'Golden Star',
        'Gold Star',
        'Star of the Earth',
        'Harefoot',
        "Rams' Foot",
        'Pesleporis',
        'Minarta',
        'Yellow Avens',
      ],
      categories: ['Purification', 'Love', 'Abundance', 'Protection'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Avens; p. 266',
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
          locator: 's.v. Avens',
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
          source: 'grieve-avens',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. Avens',
          supports: ['description', 'planets', 'folkNames'],
        },
        {
          source: 'wikipedia-geum-urbanum',
          supports: ['canonicalName', 'description', 'planets', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Avens',
              supports: ['form'],
            },
            {
              source: 'grieve-avens',
              supports: ['form'],
            },
            {
              source: 'wikipedia-geum-urbanum',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          colors: ['yellow'],
          description: 'The small yellow flowers are pressed and dried to make a love charm.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Avens',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-geum-urbanum',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The round, spiky seed heads, burrs that hook onto fur, are gathered and used to turn aside a jinx or other magic sent against you.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Avens',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-geum-urbanum',
              supports: ['description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Avocado',
      canonicalName: 'Persea americana',
      nomenclature: 'botanical',
      description:
        "An evergreen of the laurel family, the avocado is native to the Americas and grows nine to twenty metres tall with glossy, lance-shaped leaves and small pale green or yellowish flowers that have no petals. Botanically its fruit is a large berry around a single big seed; by cultivar the skin ripens green, brown, purplish or black over buttery, golden-green flesh. Archaeology shows people in Central and South America eating it thousands of years ago, and in Mesoamerica it was an important food crop, often handed over as tribute. The English name came by way of the Spanish aguacate from the Nahuatl āhuacatl. Kynes relates that the Aztecs, seeing the fruit hang in pairs, also used that word for 'testicle', though the fruit was its first sense and the other a euphemism. Eating avocados was thought to give a man strength and vigour and to heighten his virility, even the scent of the ripening fruit was counted erotic, and the English buccaneer William Dampier wrote that it roused lust. In magic the fruit is eaten to take on that lust and to draw a lover, a tree raised from the stone is kept indoors to bring love into the house, and the stone itself is carried for beauty.",
      elements: ['water', 'earth'],
      planets: ['Venus'],
      zodiacSigns: ['Libra'],
      safetyNotes:
        'The leaves, branches and seeds are not for internal use. Some people are allergic to avocado: people allergic to tree pollen can react in the mouth and throat soon after eating it, and in latex-fruit syndrome, linked to latex allergy, the reaction can include hives over the body, stomach pain and vomiting, and is occasionally life-threatening. The leaves, bark, skin and stone can badly harm or kill many animals, among them cats, dogs, horses, cattle, goats, rabbits, birds and fish; the leaves hold a toxin, persin, to which birds seem especially sensitive.',
      folkNames: [
        'Alligator Pear',
        'Avocado Pear',
        'Butter Pear',
        'Spanish Pear',
        'Zaboca',
        'Ahuacatl',
      ],
      categories: [
        'Love',
        'Lust',
        'Abundance',
        'Fertility',
        'Healing',
        'Prosperity',
        'Strength',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Avocado; p. 266',
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
          locator: 's.v. Avocado',
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
          source: 'wikipedia-avocado',
          supports: ['canonicalName', 'folkNames', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Avocado',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Avocado',
              supports: ['form'],
            },
            {
              source: 'wikipedia-avocado',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            'The stone, or pit, is grown into a plant at home to bring love into the household, and carried about the person to promote beauty.',
          safetyNotes:
            'Cunningham marks the seeds as not for internal use. The pit is among the parts of the plant documented as harmful to many animals.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Avocado; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-avocado',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            'Wands cut from avocado wood are held to be strong instruments, fit for any magical purpose.',
          safetyNotes: 'Cunningham marks the branches as not for internal use.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Avocado; p. 266',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Oil from the rich, fatty fruit is costly to make and goes into salads, dips and cooking, and into cosmetics and soap. In a healing spell, Kynes dresses a green candle with it.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Avocado',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-avocado',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bamboo',
      canonicalName: 'Bambusa vulgaris',
      nomenclature: 'botanical',
      description:
        'Common bamboo is a towering, woody grass that grows in open clumps. Its native range runs from Bangladesh, India and Sri Lanka through Southeast Asia to the Yunnan province of southern China, and it is now the most widely planted bamboo across the tropics and subtropics. Its culms, or stems, rise ten to twenty metres; in the golden forms they are lemon-yellow with green stripes. It seldom flowers and sets no seed, spreading by its rhizomes and from cuttings instead. The culms are built into shelters, boats, furniture and flutes, and the young shoots are eaten cooked or pickled across Asia. Many Asian cultures held bamboo sacred. In China temple priests cast pieces or sticks of it to read omens, and the sticks later used for fortune telling were also called the Oracle of Kuan Yin; the Chinese burned it and kept it as a charm to repel evil spirits, a power the Tibetans and Indonesians credited it with too. In magic a wish or a pentagram is carved on a length of bamboo that is then buried or planted, a clump grown by the house brings luck to all inside, and a piece hung over the door is lucky because the wood keeps its colour. It is carried, grown or burned as powdered wood to break hexes, a bamboo flute is played to call good spirits, and divination tools are kept in a bamboo box.',
      elements: ['air'],
      planets: ['Sun'],
      safetyNotes:
        'Cunningham lists bamboo as recognised as safe. The shoots of this species, alone among bamboos, contain taxiphyllin, a highly toxic cyanogenic glycoside that breaks down readily in boiling water; the shoots are eaten cooked or pickled. Eating large amounts of the leaves has caused neurological illness in horses. In Nigeria people drink a leaf infusion to bring on abortion, an effect shown in rabbits.',
      folkNames: ['Common Bamboo', 'Golden Hawaiian Bamboo', 'Ohe', 'Kauayan-Kiling'],
      deities: ['Hina', 'Kuan Yin', 'Thoth'],
      categories: [
        'Protection',
        'Hex-Breaking',
        'Harmony',
        'Courage',
        'Divination',
        'Dream Work',
        'Love',
        'Peace',
        'Strength',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Bamboo; p. 266',
          supports: ['canonicalName', 'categories', 'folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Bamboo',
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
          source: 'wikipedia-bambusa-vulgaris',
          supports: ['canonicalName', 'folkNames', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Bamboo',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bamboo',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Banyan',
      canonicalName: 'Ficus benghalensis',
      nomenclature: 'botanical',
      description:
        "The banyan is a fig tree whose home is the Indian subcontinent, and it is India's national tree. Like many figs it is a strangler: it begins life as an epiphyte resting on another tree, which in time it wraps round and engulfs. An evergreen that can reach thirty metres, it lets down aerial roots that take hold in the soil and thicken into woody trunks, so that one tree may spread outward over a great area. Indian specimens rank with the world's biggest trees by the ground their crowns cover; Thimmamma Marrimanu in Andhra Pradesh spreads over more than nineteen thousand square metres. Birds such as mynas eat the figs, and seeds that pass through a bird sprout more readily. The tree is sacred in India. Hindus revere it and plant it beside their temples, which are often built close to one. In Theravada Buddhism the Kassapa Buddha is said to have reached enlightenment under a banyan, and Jains hold that Adhinath, the first Tirthankara, did likewise. In Hawaii and across Polynesia it was bound up with Maui's worship. In magic merely sitting under a banyan, or even looking at one, is said to bring good luck, and a couple wed beneath its branches are assured of a happy marriage.",
      elements: ['air'],
      planets: ['Jupiter'],
      safetyNotes: 'Cunningham lists the banyan as recognised as safe.',
      folkNames: [
        'Arched Fig',
        'Indian Fig Tree',
        'Indian God Tree',
        'Vada Tree',
        'Banyan Fig',
        'Indian Banyan',
        'Audrey Fig',
        'Nuga',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Banyan; p. 266',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'wikipedia-ficus-benghalensis',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Whole',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Banyan',
              supports: ['form'],
            },
            {
              source: 'wikipedia-ficus-benghalensis',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Barberry',
      canonicalName: 'Berberis vulgaris',
      nomenclature: 'botanical',
      description:
        "Barberry is a thorny deciduous shrub of up to four metres. It grows wild from southern England across central and southern Europe to north-west Africa and western Asia, and has naturalised in northern Europe and in North America. Its small oval leaves, finely toothed, grow in clusters above three-pronged spines; drooping sprays of yellow flowers open in late spring, and oblong red berries follow, edible but sharply sour. The berries have long gone into jams, jellies and comfits, and in Iran the dried fruit, zereshk, is cooked with rice. Roots and bark were used to dye wool, leather and linen yellow. The shrub hosts wheat stem rust, which bears out the long-held belief of English and French farmers that it spoiled nearby grain, and a medieval French law barred planting it near grain fields. The Greeks, Romans and Egyptians used it as medicine, and Culpeper set it under Mars as a purge for choler. In medieval Europe it was believed to keep evil away, in England felling the bush was thought to break a spell, and Italians called it Holy Thorn, believing Christ's crown of thorns was made from it. In magic a dried root is worn for protection as a talisman, or several are laid around a property to drive off negative energy and draw abundance.",
      elements: ['earth'],
      planets: ['Jupiter', 'Mars', 'Venus'],
      zodiacSigns: ['Scorpio', 'Taurus'],
      safetyNotes:
        'AHPA safety class 2b: not for use in pregnancy except under the supervision of a qualified healthcare practitioner. The caution rests mainly on the isolated alkaloid berberine, which stimulated the womb in tests on excised mouse tissue and may displace bilirubin and cause jaundice in newborns, though several studies of berberine in pregnant rats and mice found no harm to the unborn young at more than 75 times the usual human dose. Use while nursing is not recommended, and berberine passes into breast milk. Use is cautioned for people with severe or acute liver disease, septic inflammation of the gallbladder, unconjugated hyperbilirubinaemia, intestinal spasm or blockage, or liver cancer. Studies of berberine taken with the drug cyclosporine have given mixed results, one showing raised levels of the drug. Kynes warns that every part of the plant is mildly toxic if eaten.',
      folkNames: [
        'Common Barberry',
        'European Barberry',
        'Berberry',
        'Berbery',
        'Dragon Grape',
        'Sow Berry',
        'Pipperidge Bush',
        'Holy Thorn',
      ],
      categories: ['Abundance', 'Clarity', 'Healing', 'Prosperity', 'Protection'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Barberry and Oregon Grape',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 130–131; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-barberry-common',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. Barberry',
          supports: ['planets', 'description'],
        },
        {
          source: 'wikipedia-berberis-vulgaris',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 130',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Barberry and Oregon Grape',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Bark',
          description:
            'The bark of the stems and of the root is the part Grieve names for use. Shaved and dried, it is bitter, turns the saliva yellow when chewed, and with alum dyes linen a fine yellow. Culpeper boiled the inner rind in white wine and took a little each morning to cleanse the body of choler.',
          safetyNotes:
            'The root bark holds about 6.1% berberine, against about 0.4% in the woody part of the root.',
          references: [
            {
              source: 'grieve-barberry-common',
              supports: ['form', 'description'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. Barberry',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 130',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Berry',
          description:
            'The tart red berries are made into jam and jelly in Europe, were once pickled to garnish dishes, and in Iran are dried as zereshk and cooked with rice and chicken. Kynes suggests holding a few while meditating before an important decision, especially a financial one, to see the choice clearly.',
          references: [
            {
              source: 'wikipedia-berberis-vulgaris',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-barberry-common',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Barberry and Oregon Grape',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Barley',
      canonicalName: 'Hordeum vulgare',
      nomenclature: 'botanical',
      description:
        "Barley is a cereal of the grass family, grown for its grain in temperate regions all over the world. It was one of the first crops ever domesticated, in the Fertile Crescent in roughly 9000 BC, and had spread across Eurasia by 2000 BC. Each of its spikelets bears a long, slender bristle, which gives the ears their tufted look. Most of today's crop feeds livestock; much of the remainder is malted for brewing beer and distilling whisky, and the grain also goes into soups, stews and bread. The initiates of the Eleusinian Mysteries in Greece drank a preparation of barley and herbs, and Demeter's name may first have meant 'barley-mother', while in English folk song John Barleycorn is a personification of the grain and of the beer brewed from it. Kynes notes that in Palestine children wore barley as an amulet of protection, and that across Europe and the British Isles its grains were used to read the future in love. Cunningham puts the grain, or barley water, into love spells, and scatters it about to ward off evil and negativity.",
      elements: ['earth'],
      planets: ['Venus', 'Saturn'],
      zodiacSigns: ['Virgo'],
      safetyNotes:
        'AHPA safety class 1 (the sprouted seed). Allergic reactions to barley, anaphylaxis among them, have been reported, some after drinking beer, and workers handling barley grain dust day to day have developed asthma and contact dermatitis. Barley may lower blood sugar, so people with diabetes should watch theirs closely and consult a qualified practitioner first. Large doses of sprouted barley are taken to reduce or stop breast milk, so a nursing mother who wishes to continue should avoid them. Safety in pregnancy has not been established, and Cunningham marks the sprouted seed as not to be taken internally while pregnant. Because barley contains gluten, it is unsuitable for people with coeliac disease or other gluten-related disorders.',
      folkNames: ['Malt', 'Barleycorn', 'Yava'],
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
      categories: [
        'Love',
        'Healing',
        'Protection',
        'Abundance',
        'Divination',
        'Fertility',
        'Prophecy',
        'Prosperity',
        'Truth',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Barley; p. 266',
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
          locator: 's.v. Grain',
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
          source: 'culpeper-herbal',
          locator: 's.v. Barley',
          supports: ['planets'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 445–446; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-barley',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 445',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Grain',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Barley',
              supports: ['form'],
            },
            {
              source: 'wikipedia-barley',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Stem',
          description:
            'Barley straw, the dried stalk, carries a charm of its own in Cunningham: to be rid of toothache, wind a straw about a stone while picturing the pain passing into it, then throw the stone into a river or other running water. Kynes records cereal straw in general used in Germany, Belgium, Ireland and England to foretell and to protect, and laid under the dead at Belgian, French and German funerals so that evil spirits stayed away.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Barley',
              supports: ['form', 'description'],
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
            'Barley water is made by boiling the grain in water, a drink and remedy known in medieval times, when Avicenna wrote of it. Culpeper counted it a great nourishment for anyone suffering fevers and heat in the stomach. Cunningham names barley water beside the grain itself for use in love spells.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Barley',
              supports: ['form', 'description'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. Barley',
              supports: ['description'],
            },
            {
              source: 'wikipedia-barley',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Basil',
      canonicalName: 'Ocimum basilicum',
      nomenclature: 'botanical',
      description:
        "Basil, also called great basil or sweet basil, is a tender herb of the mint family, native to tropical and subtropical parts of Asia and Australasia, ranging from Sri Lanka and India across South-East Asia to northern Australia; in cooler countries it is raised each year as an annual. Its glossy oval leaves grow in opposite pairs on square stems, small white flowers crown the plant in a spike, and a bruised leaf gives off a scent of cloves. The name is usually traced to a Greek word for a king. In India it is sacred to Krishna and Vishnu and kept in Hindu homes, and the Greek, Bulgarian, Serbian, Macedonian and Romanian Orthodox churches use it with holy water. Old European writers quarrelled over it: Parkinson passed on the notion that basil, roughly bruised, would breed scorpions, and Culpeper, reasoning it out for himself, assigned it to Mars and Scorpio. The story of Isabella and her pot of basil kept the plant remembered in poetry. In magic it is first a herb of love and of peace between partners; Cunningham also has it carried in the pocket for wealth, put in a shop's till to draw customers, strewn on floors against evil and added to purification baths, and Kynes records it hung in medieval homes against misfortune and given as a love token in Tudor England.",
      elements: ['fire'],
      planets: ['Mars', 'Pluto', 'Venus'],
      zodiacSigns: ['Aries', 'Leo', 'Scorpio'],
      safetyNotes:
        'AHPA safety class 2b: avoid in pregnancy unless a qualified healthcare practitioner is supervising. The caution concerns the larger doses taken as medicine, not the amounts used in cooking. Safety while nursing has not been established, and Kynes advises avoiding therapeutic doses both in pregnancy and while breastfeeding. One allergic reaction to basil is on record. Basil may lower blood sugar, so people with diabetes should monitor theirs and consult a practitioner first. Cunningham codes it, in more than ordinary food amounts, as not to be taken internally in pregnancy or while nursing, and not for internal use by infants and toddlers.',
      folkNames: [
        'Albahaca',
        'American Dittany',
        'Our Herb',
        "St. Joseph's Wort",
        'Sweet Basil',
        'Witches Herb',
        'Njilika',
        'Balanoi',
        'Feslien',
        'Common Basil',
        'French Basil',
        'Great Basil',
        'Bacia-Nicola',
      ],
      deities: ['Vishnu', 'Erzulie', 'Krishna', 'Lakshmi', 'Venus'],
      categories: [
        'Love',
        'Wealth',
        'Protection',
        'Courage',
        'Divination',
        'Healing',
        'Peace',
        'Prosperity',
        'Psychic Work',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Basil; p. 266',
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
          locator: 's.v. Basil',
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
          source: 'culpeper-herbal',
          locator: 's.v. Garden Bazil, or Sweet Bazil',
          supports: ['planets', 'zodiacSigns', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 11–13',
          supports: ['folkNames', 'description'],
        },
        {
          source: 'grieve-basil-sweet',
          supports: ['deities', 'folkNames', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 599–600; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 206–207',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-basil',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 599',
              supports: ['form'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 207',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Basil',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Basil',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Kynes lists basil essential oil among the forms on sale. Studies of the oil have found it insecticidal and repellent to insects, with possible toxicity to mosquitoes, and active against many kinds of bacteria and fungi.',
          safetyNotes:
            'Estragole, one of the alkenylbenzenes, makes up 70–85% of the essential oil, with safrole as a minor constituent. Rats given the oil by mouth every day for two weeks showed erosion of the stomach lining at 2 g/kg a day and above, and swollen liver cells above 1.5 g/kg.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Basil',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-basil',
              supports: ['description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 599–600',
              supports: ['safetyNotes'],
            },
          ],
        },
        {
          form: 'Seed',
          description:
            "Kynes lists the dried seeds among the forms of basil on sale. Parkinson, as Northcote quotes him, held that the herb's chief physical virtue was to bring a cheerful and merry heart, and for that the seed was mostly taken in powder.",
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Basil',
              supports: ['form', 'description'],
            },
            {
              source: 'northcote-herbs',
              locator: 'pp. 11–12',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Powder',
          description:
            "Cunningham gives powdered basil a charm for faithfulness: dust it over a sleeping partner's body, above all over the heart, so that fidelity blesses the relationship.",
          categories: ['Fidelity'],
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Basil',
              supports: ['form', 'description', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bay Laurel',
      canonicalName: 'Laurus nobilis',
      nomenclature: 'botanical',
      description:
        "Bay laurel is an aromatic evergreen shrub or tree of the laurel family, native to the Mediterranean. Its leathery, smooth-edged leaves come to a sharp point and are the bay leaves of the kitchen; male and female flowers, small and pale yellow-green, grow on separate plants, and the small berries ripen black. The Greeks called it daphne after the nymph who, in Ovid's version of the myth, was turned into a laurel to escape Apollo, and the tree became the god's own: victors at the Pythian Games won its wreaths, and his priestess at Delphi reputedly chewed the leaves before uttering prophecy. Rome made it a token of victory, and generals sent the Senate news of their triumphs wrapped in its leaves. People long believed lightning would spare the spot where a bay grew, yet in England a withering bay tree foretold a death, and bays were paired with rosemary at weddings and funerals alike. Culpeper placed it under the Sun and Leo as a tree that resists witchcraft. In magic it stands among the chief herbs of protection and purification: Cunningham has it worn against evil, burned at exorcisms, hung to stop poltergeists and set under the pillow for prophetic dreams, while wishes are written on its leaves and burned to bring them about.",
      elements: ['fire', 'air'],
      planets: ['Sun'],
      zodiacSigns: ['Gemini', 'Leo', 'Pisces'],
      safetyNotes:
        "AHPA safety class 1. Foods and skin products containing the leaf or its essential oil have caused allergic skin reactions (contact dermatitis), confirmed by patch tests. Safety in pregnancy and while nursing has not been established; Kynes advises avoiding bay in pregnancy and while breastfeeding, and not taking it alongside pain or sedative medication. Cunningham codes it as currently recognised safe. Grieve warns against mistaking the leaves of the poisonous cherry laurel, which now usually takes the name laurel, for bay's.",
      folkNames: [
        'Baie',
        'Bay Tree',
        'Daphne',
        'Grecian Laurel',
        'Laurel',
        "Laurier d'Apollon",
        'Laurier Sauce',
        'Lorbeer',
        'Noble Laurel',
        'Roman Laurel',
        'Sweet Bay',
        'True Laurel',
        'True Bay',
        'Bay',
      ],
      deities: [
        'Apollo',
        'Ceres',
        'Faunus',
        'Eros',
        'Adonis',
        'Artemis',
        'Asclepius',
        'Bacchus',
        'Cernunnos',
        'Diana',
        'Dionysus',
        'Gaia',
        'Helios',
        'Hermes',
        'Mars',
        'Mercury',
        'Ra',
        'Vesta',
      ],
      categories: [
        'Protection',
        'Psychic Work',
        'Healing',
        'Purification',
        'Strength',
        'Abundance',
        'Banishing',
        'Creativity',
        'Divination',
        'Dream Work',
        'Intuition',
        'Justice',
        'Legal Matters',
        'Love',
        'Peace',
        'Prophecy',
        'Prosperity',
        'Release',
        'Success',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Bay; p. 266',
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
          locator: 's.v. Bay',
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
          source: 'culpeper-herbal',
          locator: 's.v. The Bay Tree',
          supports: ['planets', 'zodiacSigns', 'description'],
        },
        {
          source: 'northcote-herbs',
          locator: 'pp. 141–144',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'grieve-laurel-bay',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 502; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'kynes-remedies',
          locator: 'pp. 207–208',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'wikipedia-laurus-nobilis',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 502',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Bay',
              supports: ['form'],
            },
            {
              source: 'kynes-remedies',
              locator: 'p. 207',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            "Distilling the leaves gives a greenish-yellow volatile oil used in perfumery, and the berries yield a fixed oil, Oil of Bays, used on sprains and bruises. Kynes lists the essential oil among bay's forms. Grieve cautions that the West Indian oil distilled for bay rum comes from another plant, Pimenta acris, though it too is called oil of bay.",
          safetyNotes:
            'The essential oil has caused allergic skin reactions, confirmed by patch tests. Its main component, 1,8-cineole (eucalyptol), makes up 36–46% of the leaf oil. The oral LD50 in rats is 3.95 g/kg.',
          references: [
            {
              source: 'grieve-laurel-bay',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bay',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 502–503',
              supports: ['safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Be-Still',
      canonicalName: 'Cascabela thevetia',
      nomenclature: 'botanical',
      description:
        "Be-still is the yellow oleander, a poisonous evergreen shrub or small tree of the dogbane family, native to Mexico and Central America and grown widely for ornament. It is related to the true oleander, from which it takes its common name. Its narrow, glossy leaves resemble a willow's and carry a waxy coat, its long funnel-shaped flowers are usually yellow but sometimes apricot or white, and its deep red-black fruit encloses a single large seed. The genus name comes from Spanish words for a little bell or a rattlesnake's rattle, perhaps in reference to a toxicity likened to rattlesnake venom, and the species name honours André de Thevet, the sixteenth-century French Franciscan who explored Brazil and Guiana. Older works file it under Thevetia peruviana, the name Cunningham uses. In frost-prone gardens it is kept in a pot and brought indoors for the winter. Its single recorded magical use is for luck: Cunningham writes that Sri Lankans call the seeds lucky beans and carry them as charms to draw good fortune.",
      safetyNotes:
        'Cunningham marks it as a poison. Every part of the plant is toxic to most vertebrates: it contains cardiac glycosides, chiefly thevetin A and B, which closely resemble the digoxin of foxglove and survive both drying and heating. Poisoning causes stomach upset and effects on the heart, including an abnormally slow heartbeat and abnormally high potassium in the blood. Many accidental and deliberate poisonings of people are recorded, some from Tecojote root supplements.',
      folkNames: [
        'Trumpet Flower',
        'Yellow Oleander',
        'Flor Del Peru',
        'Lucky Nut',
        'Kaneru',
        'Manjal Arali',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Be-Still',
          supports: ['folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'wikipedia-cascabela-thevetia',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Be-Still',
              supports: ['form'],
            },
            {
              source: 'wikipedia-cascabela-thevetia',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bean',
      canonicalName: 'Phaseolus vulgaris',
      nomenclature: 'botanical',
      description:
        'The common bean, Phaseolus vulgaris, is an annual of the legume family, Fabaceae, whose climbing or bushy vines bear leaves in three leaflets, small white, pink or purple flowers, and pods holding four to eight kidney-shaped seeds in a wide range of colours. Wild plants are native to the Americas, and it was domesticated on two separate occasions, once in Mesoamerica and once in the far south of the Andes, some eight thousand years ago; with maize and squash it formed the Three Sisters of Indigenous American farming. It reached Europe in the Columbian exchange, and Culpeper knew it as the French or kidney bean, a weak climber that fruits only when staked, and set it under Venus. Beans in general carry old lore of harvest and death. Cunningham calls them sacred to harvest goddesses and records Roman offerings of beans and pork to Cardea each first of June and beans shared at Roman funerals; Grieve notes that Italians gave beans to the poor each year on the date of a death. Telling fortunes with beans has its own name, favomancy. In magic a dried bean is carried against negativity and hostile sorcery, shaken in rattles to drive off spirits, rubbed on warts under a waning moon, laid with six others in a circle to draw a lover, and held in open palms while meditating on the truth of a matter.',
      elements: ['air', 'water'],
      planets: ['Mercury', 'Saturn', 'Venus'],
      zodiacSigns: ['Gemini', 'Libra', 'Virgo'],
      safetyNotes:
        'Uncooked or undercooked beans hold phytohaemagglutinin, a lectin found at its highest levels in red kidney beans; eating just four or five soaked but uncooked beans can bring on nausea, vomiting and diarrhoea one to three hours later, usually passing within hours. To destroy it, steep dried beans in water for five hours or more, throw the water away, then boil them for thirty minutes; a slow cooker at about 80 °C is not hot enough. Cunningham warns that beans not meant for eating may be poisonous.',
      folkNames: [
        'Common Bean',
        'French Bean',
        'Kidney Bean',
        'Haricot',
        'Navy Bean',
        'White Kidney Bean',
        "Poor Man's Meat",
      ],
      deities: ['Demeter', 'Cardea', 'Apollo', 'Ceres', 'Dionysus'],
      categories: [
        'Protection',
        'Reconciliation',
        'Love',
        'Courage',
        'Creativity',
        'Psychic Work',
        'Strength',
        'Truth',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Bean',
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
          locator: 's.v. Bean',
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
          source: 'culpeper-herbal',
          locator: 's.v. French Beans',
          supports: ['planets', 'folkNames', 'description'],
        },
        {
          source: 'grieve-bean-kidney',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-phaseolus-vulgaris',
          supports: ['canonicalName', 'folkNames', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Seed',
          references: [
            {
              source: 'grieve-bean-kidney',
              supports: ['form'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Bean',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bean',
              supports: ['form'],
            },
            {
              source: 'wikipedia-phaseolus-vulgaris',
              supports: ['form'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bearberry',
      canonicalName: 'Arctostaphylos uva-ursi',
      nomenclature: 'botanical',
      description:
        "Bearberry, Arctostaphylos uva-ursi, is a low evergreen shrub of the heath family, Ericaceae, standing five to thirty centimetres high, whose long trailing stems root as they spread and knit into thick mats. Its small leathery leaves are glossy dark green above and paler below; in May and June drooping clusters of urn-shaped flowers, white to pink, open at the shoot tips and are followed by shiny red berries that bears and other animals eat. It grows right round the northern world, in the far north and on high ground further south, and in Britain mostly on the Scottish hills. Its Greek genus name and its Latin species name both mean the bear's grape. The astringent leaves, rich in tannin and arbutin, are an old remedy for the bladder and urinary tract: the thirteenth-century Welsh Physicians of Myddfai knew them, and in Sweden and Russia they were used to tan leather. Kinnikinnick, an Algonquian word for a smoking mixture, names both the plant and the blends of its dried leaves smoked in North American ceremonies, sometimes with tobacco, to seal a pact or calm a thunderstorm. In magic the leaves go into sachets to raise psychic power, the plant serves protection, intuition and strength, and in hoodoo it is put into mojo bags and candle work.",
      elements: ['earth'],
      planets: ['Mars', 'Pluto', 'Venus'],
      zodiacSigns: ['Scorpio'],
      safetyNotes:
        'AHPA safety class 1, interaction class A: no contraindications, other precautions or drug interactions are known, and the handbook found no evidence behind the older warning against use with kidney disorders. The dried leaf holds up to 12 per cent arbutin and related compounds that give rise to hydroquinone. One case of damage to the retina (maculopathy) followed long-term use, and it can turn the urine brownish green. No studies of its safety in pregnancy were found, and its safety while nursing is not established. Kynes warns that large amounts can be toxic and that it is not for use in pregnancy. Cunningham marks it Poison and codes it against internal use in pregnancy, with kidney problems or acidic urine, and for long periods, as liable to upset digestion, and as a gastrointestinal irritant.',
      folkNames: [
        'Arberry',
        "Bear's Grape",
        'Kinnikinnick',
        'Mealberry',
        'Mountain Box',
        'Mountain Cranberry',
        'Red Bearberry',
        'Sagackhomi',
        'Sandberry',
        'Uva Ursi',
        'Bear Whortleberry',
        "Bear's Bilberry",
        'Crowberry',
        'Upland Cranberry',
        'Fox-Plum',
        'Hog-Crawberry',
        'Barren Myrtle',
      ],
      categories: ['Psychic Work', 'Intuition', 'Protection', 'Strength'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Uva Ursa; p. 266',
          supports: ['canonicalName', 'categories', 'folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Uva Ursi',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 79–80; p. xxii',
          supports: ['canonicalName', 'folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'grieve-bearberry',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'wikipedia-arctostaphylos-uva-ursi',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 79',
              supports: ['form'],
            },
            {
              source: 'grieve-bearberry',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Uva Ursi',
              supports: ['form'],
            },
            {
              source: 'wikipedia-arctostaphylos-uva-ursi',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Berry',
          description:
            'The berries are small, round and a glossy bright red, with a dry, mealy pulp around a few hard stones. They can be eaten raw but taste of little until boiled and dried, and bears and grouse feed on them. In Iceland a bearberry kept in the pocket was believed to guard its bearer against evil spirits and ghosts.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Uva Ursi',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-bearberry',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-arctostaphylos-uva-ursi',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bee Balm',
      canonicalName: 'Monarda didyma',
      nomenclature: 'botanical',
      description:
        'Bee balm, Monarda didyma, is a perennial of the mint family, Lamiaceae, native to the east of North America, from Maine, Ontario and Michigan south to northern Georgia, where it grows thickly along stream banks, in damp thickets and in ditches. It stands sixty centimetres to a little over a metre tall on square stems, with paired, toothed leaves that smell of mint when bruised, and through the summer it carries rounded heads of ragged, tubular scarlet flowers whose nectar draws bees and hummingbirds. Its scent recalls the bergamot orange, which is why it is also called bergamot. The genus honours Nicolas Monardes, who in 1569 became the first European to write a description of the plants of the Americas. Many Indigenous nations used it as medicine; the Blackfoot made poultices of it for wounds and skin infections. The people of Oswego brewed its leaves, and the drink caught on among English settlers once the Boston Harbor protest cut off their tea, so it is still known as Oswego tea. In England its flowers were thought unlucky to bring indoors, though a leaf carried in a pocket or purse was believed to bring money. In magic it serves purification, clarity, peace and success.',
      elements: ['air'],
      planets: ['Mercury', 'Moon', 'Venus'],
      zodiacSigns: ['Gemini', 'Virgo'],
      safetyNotes:
        'AHPA safety class 2b, interaction class A, in its monograph on Monarda species, this one among them: traditionally used to bring on menstruation, so not to be taken during pregnancy unless a qualified practitioner oversees it. No other precautions, drug interactions or side effects are known, and its safety while nursing has not been conclusively established.',
      folkNames: [
        'Scarlet Bee Balm',
        'Scarlet Bergamot',
        'Bergamot',
        'Bergamot Mint',
        'Gold Melissa',
        'Indian Nettle',
        'Monarda',
        'Oswego Tea',
        'Oswego Beebalm',
        'Scarlet Monarda',
        'Crimson Beebalm',
        'Eau-de-Cologne Plant',
      ],
      categories: ['Clarity', 'Peace', 'Prosperity', 'Purification', 'Success'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Bee Balm',
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
          locator: 'pp. 572–573; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-bergamot',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-monarda-didyma',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 572',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves smell of mint when crushed. Steeped young, they make Oswego tea, once drunk daily across much of the United States. English folk belief held that a leaf kept in a pocket or purse would bring money. Dried leaves are sold cut.',
          references: [
            {
              source: 'grieve-bergamot',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bee Balm',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-monarda-didyma',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'The flowers are scarlet, ragged tubular florets massed about thirty to a head above reddish bracts, and full of nectar. They went into posies, yet in England they were held to be bad luck indoors, as likely to bring illness or even death. One or two handfuls of dried flowers in the bath make a purifying soak.',
          colors: ['red'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bee Balm',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-monarda-didyma',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-bergamot',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil is sold for magical work. A few drops go into a purifying bath, and a dab on the third eye is said to bring clarity and focus before a decision. Grieve reports a claim that scarlet monarda yields an oil much like the thymol-rich oil of its relative Monarda punctata, though weaker in it.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bee Balm',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-bergamot',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Beech',
      canonicalName: 'Fagus sylvatica',
      nomenclature: 'botanical',
      description:
        "Beech, Fagus sylvatica, the European or common beech, is a big deciduous tree of the family Fagaceae, native across much of Europe and usually twenty-five to thirty-five metres tall, with smooth, silvery-grey bark and a short trunk branching low. Saplings and clipped hedges often hold their dead brown leaves all winter. Its small three-sided nuts, two to each prickly husk, ripen in autumn as mast, fed to park deer in England and to pigs and poultry in France, and pressed for an oil used in cooking and lamps. Grieve traces its name, across the Germanic tongues, to a word meaning either beech or book, since runic tablets, the first books, were made of its wood, and Kynes adds that beech sticks often carried runes. Greeks and Romans counted it a lucky tree: the Romans turned bowls and jugs for libations from it, Bacchus was said to drink from a beech cup, and in Greek legend the oracle of Zeus's grove at Dodona lived in a great beech. Norse people held it sacred as an oracle of Thor, and the Swiss, Germans and Belgians read weather and harvest from it. Culpeper put it under Saturn. In magic a wish is carved on a beech stick and buried, and its wood or leaves are carried to stir creativity.",
      elements: ['fire', 'water'],
      planets: ['Saturn', 'Jupiter'],
      zodiacSigns: ['Gemini', 'Sagittarius', 'Virgo'],
      folkNames: [
        'European Beech',
        'Common Beech',
        'Bok',
        'Boke',
        'Buche',
        'Buk',
        'Buke',
        'Faggio',
        'Fagos',
        'Faya',
        'Haya',
        'Hetre',
        'Bog',
      ],
      deities: [
        'Apollo',
        'Athena',
        'Bacchus',
        'Cerridwen',
        'Diana',
        'Dionysus',
        'Freya',
        'Frigg',
        'Loki',
        'Odin',
        'Thor',
        'Zeus',
      ],
      categories: [
        'Abundance',
        'Ancestor Work',
        'Creativity',
        'Fertility',
        'Healing',
        'Knowledge',
        'Manifestation',
        'Prophecy',
        'Prosperity',
        'Protection',
        'Psychic Work',
        'Transformation',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Beech',
          supports: ['canonicalName', 'planets', 'folkNames', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Beech',
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
          source: 'culpeper-herbal',
          locator: 's.v. The Beech Tree',
          supports: ['planets', 'description'],
        },
        {
          source: 'grieve-beech',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-fagus-sylvatica',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Wood',
          description:
            'Beech wood is fine and short in the grain and easy to work, finish and glue, and goes into furniture, parquet flooring, mallets, bowls and turned goods; it also ranks among the best firewoods. Magically, a stick carved with a wish is buried and left in the ground, a twig placed where it is plainly seen at home is said to promote stability, and the wood is carried to strengthen creativity.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Beech',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Beech',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-beech',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fagus-sylvatica',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Culpeper judged beech leaves cooling and binding, laid on hot swellings or boiled into a poultice or an ointment in season. In magic the leaves are placed on a Samhain altar in honour of the ancestors, and carried, like the wood, to strengthen creativity.',
          references: [
            {
              source: 'culpeper-herbal',
              locator: 's.v. The Beech Tree',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Beech',
              supports: ['form', 'description'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Beech',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Nut',
          description:
            'Beechnuts are small and three-sided, two to a woody, prickly husk. People have eaten them, in times of famine according to Grieve, and they were once ground into flour after soaking had drawn out the tannins. In England they were thought to give wisdom and were kept as amulets; a cluster is offered when seeking abundance, and a few are eaten to sharpen second sight.',
          safetyNotes:
            'The nuts contain tannins and alkaloids and are mildly toxic eaten in large amounts. Cunningham does not recommend large amounts of the nut for internal use.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Beech',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fagus-sylvatica',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'cunningham-herbs',
              locator: 's.v. Beech; p. 266',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'grieve-beech',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Fully ripe beechmast holds seventeen to twenty per cent oil, of the kind that does not dry, and Grieve names this oil as the part of the tree used. It was pressed in nineteenth-century England for cooking and lamps, is used on the Continent for cooking and burning, and in Silesia stood in for butter; the pressed cake fed cattle. Beechnut oil is still sold.',
          references: [
            {
              source: 'grieve-beech',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-fagus-sylvatica',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Beech',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Beet',
      canonicalName: 'Beta vulgaris',
      nomenclature: 'botanical',
      description:
        'Beet is a single species of the amaranth family that people have bred into several quite different crops: the red root vegetable called beetroot, the leafy chard, the sugar beet, and the mangelwurzel grown as cattle fodder. All descend from the sea beet, a wild plant of shorelines from western Europe and the Mediterranean to North Africa and western Asia. Usually grown as a biennial, it can reach about 120 centimetres, and the swollen roots of cultivated plants may be deep red, white or yellow. Its earliest written record comes from Mesopotamia in the eighth century BC; Romans gave the root for fevers and constipation, and Grieve records that the ancients presented it on silver to Apollo at Delphi. Jewish households serve it at Rosh Hashana, praying that their enemies depart, a pun on its Aramaic name. Culpeper treats the red and white sorts as two plants under different planets, putting the red beet under Saturn. In magic it is a love plant: Cunningham says a couple who eat from one beet will fall in love, and that its juice serves as an ink for love spells and as a stand-in for blood.',
      elements: ['earth'],
      planets: ['Saturn'],
      folkNames: ['Mangel', 'Mangold'],
      categories: ['Love'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Beet',
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
          source: 'culpeper-herbal',
          locator: 's.v. Beets',
          supports: ['planets', 'description'],
        },
        {
          source: 'grieve-beetroots',
          supports: ['canonicalName', 'description'],
        },
        {
          source: 'wikipedia-beta-vulgaris',
          supports: ['canonicalName', 'description'],
        },
      ],
      variants: [
        {
          form: 'Root',
          colors: ['red', 'white', 'yellow'],
          references: [
            {
              source: 'grieve-beetroots',
              supports: ['form'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. Beets',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-beta-vulgaris',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            "Beet leaves are cooked as a pot herb in the manner of spinach, and the garden beet's young leaves serve likewise. Grieve notes that the French mix them with sorrel to soften its sharpness.",
          safetyNotes:
            'Cunningham marks large amounts of the leaf as not recommended for internal use. Beet greens are high in oxalate, which can contribute to kidney stones.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Beet; p. 266',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'grieve-beetroots',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-beta-vulgaris',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Belladonna',
      canonicalName: 'Atropa bella-donna',
      nomenclature: 'botanical',
      description:
        "Belladonna, or deadly nightshade, is a bushy perennial of the nightshade family, native to Europe, western Asia and north-west Africa and partial to chalk and limestone; in Britain it is native only to England. It bears dull purple, bell-shaped flowers and glossy black berries about the size of a cherry, sweet enough to tempt children, and it ranks among the most poisonous plants known, every part carrying atropine and related alkaloids. Linnaeus named the genus after Atropos, the Fate who cuts the thread of life, while the species name, Italian for 'beautiful woman', recalls the drops women once put in their eyes to widen the pupils. Its older English name was dwale. Lore makes it a poisoner's plant: Livia was rumoured to have killed Augustus with its juice, and the Scots are said to have drugged an invading army with it during a truce. The priests of Bellona, the Roman war goddess, reputedly drank it before invoking her, and it was named among the ingredients of the witches' flying ointment. Old legend held that the Devil tended it himself, leaving it only on Walpurgis Night. Today's writers urge great care: Cunningham calls it best avoided, and Kynes suggests working with a picture of the plant, for journeying, astral work or keeping a secret, and leaving an offering to Hecate where it grows wild.",
      elements: ['water'],
      planets: ['Saturn', 'Pluto'],
      zodiacSigns: ['Libra', 'Scorpio'],
      safetyNotes:
        'Poisonous in every part: never take it internally or put it on the skin. AHPA safety class 3, to be used only under the supervision of an expert qualified in its use. An overdose brings on anticholinergic poisoning: a flushed face, widened pupils, a racing heart, a dry mouth, agitation, hallucinations and meaningless speech. The sweet berries are the commonest cause of poisoning in children. Touching the plant can irritate the skin, so wear gloves, and never handle it with cuts or grazes on the hands. Its alkaloid atropine crosses the placenta quickly. Cats and dogs are very susceptible to it.',
      folkNames: [
        'Deadly Nightshade',
        'Banewort',
        'Black Cherry',
        "Death's Herb",
        "Devil's Cherries",
        'Divale',
        'Dwale',
        'Dwaleberry',
        'Dwayberry',
        'Fair Lady',
        'Great Morel',
        "Naughty Man's Cherries",
        "Sorcerer's Berry",
        "Witch's Berry",
        "Devil's Berries",
        'Death Cherries',
        'Beautiful Death',
        "Devil's Herb",
        'Sleeping Nightshade',
      ],
      deities: ['Hecate', 'Circe'],
      categories: ['Creativity', 'Divination'],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Belladonna; "How to Read the Entries"',
          supports: ['elements', 'planets', 'deities', 'folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Nightshade',
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
          source: 'ahpa-safety',
          locator: 'pp. 112–113; p. xxii',
          supports: ['folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-nightshade-deadly',
          supports: ['folkNames', 'description', 'safetyNotes'],
        },
        {
          source: 'wikipedia-atropa-bella-donna',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Leaf',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 112',
              supports: ['form'],
            },
            {
              source: 'grieve-nightshade-deadly',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Root',
          description:
            'The thick, whitish root entered English medicine only in 1860, as the base of a pain-relieving liniment. In Bukovina, in the Carpathians, a girl wishing to grow more attractive would dig up a root on a Shrovetide Sunday, leave bread, salt and brandy in its place, and carry it home on her head, telling no one what it was.',
          safetyNotes:
            'The root is the most poisonous part of the plant, holding up to about 1.3 per cent tropane alkaloids by fresh weight.',
          references: [
            {
              source: 'grieve-nightshade-deadly',
              supports: ['form', 'description', 'safetyNotes'],
            },
            {
              source: 'wikipedia-atropa-bella-donna',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bergamot Orange',
      canonicalName: 'Citrus bergamia',
      nomenclature: 'botanical',
      description:
        'The bergamot orange is a small citrus tree with glossy leaves and clusters of white, star-shaped flowers. Its fruit, about the size of an orange, ripens from green to a pale yellow and is slightly flattened and knobbly. It is most likely a cross between the lemon and the bitter orange, and it is unrelated to the mint-family herbs also called bergamot, which only share something of its scent. It is grown chiefly around the Mediterranean, above all on the Ionian coast of Reggio di Calabria in southern Italy, where the fruit has become an emblem of the city; French and Ivorian growers also raise it for its oil. The fragrant oil drawn from the rind has been used in French perfumery since the seventeenth century, was part of the original eau de Cologne, and gives Earl Grey tea its character. In magical practice Kynes ties it to air, Mercury and the Sun, and to confidence, protection and prosperity: its oil is diffused to reach and speak with spirits or worn for psychic protection, and the fruit goes into spells for luck and wealth.',
      elements: ['air'],
      planets: ['Mercury', 'Sun'],
      safetyNotes:
        'Used on the skin it can raise sensitivity to sunlight, so the sun does more damage. The reaction comes from bergapten and is not expected after eating the fruit or peel.',
      categories: ['Confidence', 'Prosperity', 'Protection'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Bergamot',
          supports: ['canonicalName', 'elements', 'planets', 'categories', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 234',
          supports: ['canonicalName', 'safetyNotes'],
        },
        {
          source: 'wikipedia-bergamot-orange',
          supports: ['canonicalName', 'description', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          colors: ['green', 'yellow'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bergamot',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-bergamot-orange',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'The essential oil is the form Kynes works with most: a little diffused in the room helps one reach and talk with spirits, and the scent worn on the body guards against psychic harm. It flavours Earl Grey and Lady Grey teas and is among the commonest ingredients in perfumery.',
          safetyNotes:
            'Bergamot oil on the skin followed by sunlight has caused phototoxic rashes, and repeated use in perfumes or cosmetics has caused allergic contact dermatitis. Use on the skin may be unsafe, particularly for children and pregnant women. A man who drank about four litres of Earl Grey tea a day developed muscle cramps, twitching and blurred vision, which cleared when he stopped.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bergamot',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 234–235',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-bergamot-orange',
              supports: ['form', 'description', 'safetyNotes'],
            },
          ],
        },
        {
          form: 'Peel',
          description:
            'The rind is where the aromatic essence lies, and leftover peels were traditionally fashioned into little souvenir boxes and snuff boxes.',
          safetyNotes:
            'AHPA safety class 1 for the peel, with a notice that it is photosensitising when applied to the skin. Bergapten-free products are sold. Safety in pregnancy and nursing has not been conclusively established.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 234; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-bergamot-orange',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bilberry',
      canonicalName: 'Vaccinium myrtillus',
      nomenclature: 'botanical',
      description:
        "Bilberry is a low deciduous shrub of the family Ericaceae, usually under half a metre tall, that spreads by creeping rhizomes over acid heaths, moorland and open woods across most of Europe and northern and central Asia, with outposts in Greenland and western North America. Its small leaves turn red in autumn, and its round berries ripen a deep blue-black under a greyish bloom; unlike the highbush blueberry, the fruit is coloured right through, and its juice stains hands and lips. In Britain the berries long served to dye food and cloth, and during the First World War dyers bought up much of the crop. The Anglo-Saxons called it the hart's berry. Irish custom read a heavy crop as the sign of a good harvest, and at Lughnasadh people in County Limerick laid bilberries and flowers on the cairn atop Knockfierna, the hill of a faery king; patches where the berries grew were thought of as places where the faery folk might be met. Culpeper put the plant under Jupiter. In magic it is used for luck, to ward off evil and to undo hexes and curses, and to make dreams come to pass; Kynes also sets the berries or their jam on the Lughnasadh altar.",
      elements: ['water', 'fire'],
      planets: ['Venus', 'Jupiter'],
      zodiacSigns: ['Pisces', 'Sagittarius'],
      folkNames: [
        'Whortleberry',
        'Hurtleberry',
        'Blaeberry',
        'Huckleberry',
        'European Blueberry',
        'Heath Berry',
        'Whinberry',
        'Wimberry',
        'Winberry',
        'Fraughan',
        'Hurts',
        'Whorts',
        'Black Whortles',
        'Bleaberry',
        'Trackleberry',
        'Common Bilberry',
        'Blue Whortleberry',
        'Myrtleberry',
        'Myrtle Whortleberry',
        'Myrtille',
      ],
      deities: ['Lugh'],
      categories: [
        'Protection',
        'Hex-Breaking',
        'Dream Work',
        'Healing',
        'Love',
        'Manifestation',
        'Prophecy',
        'Prosperity',
        'Success',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Huckleberry',
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
          locator: 's.v. Bilberry',
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
          source: 'culpeper-herbal',
          locator: 's.v. Bilberries, Called by Some Whorts, and Whortle-Berries',
          supports: ['planets', 'folkNames', 'description'],
        },
        {
          source: 'grieve-bilberry',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 903',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'wikipedia-vaccinium-myrtillus',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
      ],
      variants: [
        {
          form: 'Berry',
          colors: ['blue', 'black'],
          safetyNotes:
            'AHPA safety class 1 for the fruit, which is traditionally eaten as food. The fruit may reduce blood clotting: an extract taken before surgery reduced bleeding. Small studies of fruit extract taken in pregnancy found no harm to mother or child.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 903; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bilberry',
              supports: ['form'],
            },
            {
              source: 'grieve-bilberry',
              supports: ['form', 'colors'],
            },
            {
              source: 'wikipedia-vaccinium-myrtillus',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            "Cunningham's magic lies in the leaves: carried in a sachet they bring luck and keep evil and hexes away, and burned in the bedroom just before sleep they make one's dreams come true, with results promised within seven days. In northern and western Britain the leaves went into a moorland tea with heather tops and other herbs.",
          safetyNotes:
            'AHPA safety class 2d for the leaf: not for long-term use. In animals, long-term high doses of the leaf caused muscle wasting, weight loss, anaemia, yellowing of the skin and bouts of excitement. Safety in pregnancy and nursing has not been established, and eating the leaves may be unsafe.',
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Huckleberry',
              supports: ['form', 'description'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bilberry',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'pp. 906–907; p. xxii',
              supports: ['form', 'safetyNotes'],
            },
            {
              source: 'wikipedia-vaccinium-myrtillus',
              supports: ['form', 'safetyNotes'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bindweed',
      canonicalName: 'Convolvulus arvensis',
      nomenclature: 'botanical',
      description:
        "Field bindweed is a twining perennial of the morning-glory family, Convolvulaceae, native across Europe and Asia. Its stems, half a metre to two metres long, either clamber over whatever stands near or trail along the ground, and its roots can go several metres down, which makes it notoriously hard to clear. The leaves are arrow-shaped, and the small trumpet flowers, white or pale pink and marked with five darker stripes, last a single day. Probably carried to North America in contaminated crop seed, perhaps as early as 1739, it is now one of the costliest weeds of farmland there. Grieve counts it among Britain's three native bindweeds and notes that the whole family is purgative, and its leaves have served in folk medicine as a laxative and diuretic. Kynes traces its bad name to the way it strangles other plants and starves the soil: English witches were said to wind a stem nine times round a poppet to bewitch the person it stood for, and Scottish children were told that picking the flowers would call up a thunderstorm. Because the stems coil widdershins, she recommends it for widdershins work, knot magic and handfasting.",
      elements: ['air', 'water'],
      planets: ['Mercury', 'Saturn'],
      zodiacSigns: ['Aquarius', 'Gemini'],
      safetyNotes:
        'Kynes cautions that every part of the plant, the roots and seeds above all, is toxic if eaten. It contains alkaloids, chiefly pseudotropine, which are toxic to mice and reported to be psychoactive; in quantity it may poison horses, its roots are reported as possibly poisonous to pigs, and it can cause photosensitisation in susceptible animals.',
      folkNames: [
        'Field Bindweed',
        'Creeping Jenny',
        "Devil's Guts",
        'Hellweed',
        'Small Bindweed',
        'Thunder Flower',
        'Wild Morning Glory',
        'Lesser Bindweed',
        'European Bindweed',
        'Withy Wind',
        'Perennial Morning Glory',
        'Small-Flowered Morning Glory',
        'Possession Vine',
      ],
      categories: ['Binding', 'Strength'],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Bindweed',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'safetyNotes',
          ],
        },
        {
          source: 'wikipedia-convolvulus-arvensis',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-bindweeds',
          supports: ['description'],
        },
      ],
      variants: [
        {
          form: 'Stem',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bindweed',
              supports: ['form'],
            },
            {
              source: 'wikipedia-convolvulus-arvensis',
              supports: ['form'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            "The funnel-shaped flowers open for one day only, and now and then by bright moonlight. In Scotland children were warned that picking them would bring on a thunderstorm, and young women that it would cost a sweetheart his life. In a tale the Brothers Grimm collected, the Virgin Mary drinks wine from one, and so the flower is called Our Lady's Little Glass.",
          colors: ['white', 'pink'],
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bindweed',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-convolvulus-arvensis',
              supports: ['form', 'description', 'colors'],
            },
          ],
        },
      ],
    },
    {
      name: 'Birch',
      canonicalName: 'Betula pendula',
      nomenclature: 'botanical',
      description:
        "The silver birch is a slender deciduous tree of the birch family, Betulaceae, named for the white bark that peels from its trunk in papery flakes. It grows wild from western Europe to Siberia, Mongolia and Xinjiang, south to the Caucasus and northern Iran, and in the uplands of northern Morocco; as a pioneer it is among the first trees to take hold on bare or burnt ground. It is the national tree of Finland, where bunches of its leafy twigs are used to beat the skin in the sauna, and Grieve notes that Coleridge called it the Lady of the Woods. In northern and central Europe the tree stood for birth and for rebirth after death, and in Scandinavia it was thought to house the spirits of ancestors; Siberian shamans used it in rites of purification and initiation. Branches set before Swedish houses at Walpurgis, or crossed twigs over English doorways, kept witches and enchantment away, though in medieval France witches were said to fly on birch and work weather magic with it. Cunningham counts it a cleansing tree, used to drive out spirits and to guard against lightning and the evil eye, and says the witch's broom was traditionally made of its twigs.",
      elements: ['water'],
      planets: ['Venus', 'Jupiter', 'Moon', 'Sun'],
      zodiacSigns: ['Capricorn', 'Sagittarius'],
      safetyNotes:
        'AHPA safety class 1 and interaction class A: no contraindications, precautions, drug interactions or side effects are known, and it is noted as a diuretic. No concern was identified for use in pregnancy or while nursing, though safety in either has not been firmly proven. Cunningham marks it as recognised safe.',
      folkNames: [
        'Beithe',
        'Bereza',
        'Berke',
        'Beth',
        'Bouleau',
        'Lady of the Woods',
        'Silver Birch',
        'European White Birch',
        'Common Birch',
        'Weeping Birch',
        'Warty Birch',
      ],
      deities: ['Thor', 'Cerridwen', 'Dagda', 'Freya', 'Frigg', 'Lugh'],
      categories: [
        'Protection',
        'Purification',
        'Cleansing',
        'Ancestor Work',
        'Banishing',
        'Clarity',
        'Divination',
        'Fertility',
        'Healing',
        'Inspiration',
        'Intuition',
        'Love',
        'Wisdom',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Birch; p. 266',
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
          locator: 's.v. Birch',
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
          locator: 'pp. 134–135; p. xxii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. The Birch Tree',
          supports: ['planets'],
        },
        {
          source: 'grieve-birch-common',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-betula-pendula',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Bark',
          description:
            'Kynes puts a few bits of the bark into a sachet to carry as a love charm. The papery outer bark is up to a fifth betulin and lights easily even when damp; slabs of it have roofed houses, strips have been woven into shoes and small boxes, and it was long used in tanning. Distilled, it yields the birch tar oil that gave Russia leather its smell.',
          colors: ['white'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 134',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Birch',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-betula-pendula',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'grieve-birch-common',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'The leaves smell pleasantly aromatic and taste bitter. Grieve records them taken as an infusion, birch tea, for gout, rheumatism and dropsy, and trusted to dissolve kidney stones; Culpeper prescribes the juice of the young leaves, or a water distilled from them, for stones of the kidney and bladder and as a wash for a sore mouth.',
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 134',
              supports: ['form'],
            },
            {
              source: 'grieve-birch-common',
              supports: ['form', 'description'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. The Birch Tree',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Sap',
          description:
            'In spring a strong flow of sap rises in the trunk and can be tapped. At about one per cent sugar it is drunk fresh, boiled down like maple syrup or fermented. Grieve gives a birch wine of March sap with honey, cloves and lemon peel, and Culpeper the distilled water drawn from a trunk bored with an auger.',
          references: [
            {
              source: 'wikipedia-betula-pendula',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-birch-common',
              supports: ['form', 'description'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. The Birch Tree',
              supports: ['description'],
            },
          ],
        },
        {
          form: 'Wood',
          description:
            "Cunningham records that birch twigs were used to strike the possessed and drive their spirits out, that the witches' broom was bound from them, and that cradles were once made of birch wood to protect the babies in them. Birch brushwood still makes besoms and racecourse jumps, and the pale timber goes into furniture, plywood, skis and kitchen utensils.",
          references: [
            {
              source: 'cunningham-herbs',
              locator: 's.v. Birch',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-betula-pendula',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bistort',
      canonicalName: 'Bistorta officinalis',
      nomenclature: 'botanical',
      description:
        'Bistort is a clump-forming perennial of the dock family, Polygonaceae, native to Europe and to northern and western Asia, where it favours damp meadows and the margins of woods. A thick rootstock bent twice over gives it its Latin name, from bis, twice, and torta, twisted, and its old names of snakeweed and adderwort; from it rise long oval leaves and slender stems, each ending in a dense spike of pink flowers. The root is rich in tannin, among the strongest astringents of any native British plant, and was once used to tan leather, while the young leaves and shoots were eaten as spring greens; in northern England they went into a bitter herb pudding at Lent. Kynes gathers its lore: some northern English cures worked only if it was picked at the full moon, in sixteenth-century France it was worn as an amulet to help conception, Irish travellers pocketed a few flowers for a safe journey, and Scots knotted the leaves into a cloth to break a spell. Cunningham has it carried by those hoping to conceive, burned with frankincense to strengthen psychic powers and divination, sprinkled as an infusion to drive out poltergeists, and added to sachets and incenses for money and wealth.',
      elements: ['earth'],
      planets: ['Saturn'],
      zodiacSigns: ['Aquarius', 'Virgo'],
      safetyNotes:
        'AHPA safety class 1 and interaction class A, with no known contraindications or drug interactions. It is 15–21% tannin, and mild abdominal pain and diarrhoea have been reported, thought to come from irritation of the gut lining. No concern was identified for pregnancy or nursing, though safety in either has not been firmly proven, and Kynes cautions that it is an abortifacient.',
      folkNames: [
        'Common Bistort',
        'Meadow Bistort',
        'European Bistort',
        'Adderwort',
        'Dragonwort',
        'Snakeroot',
        'Snakeweed',
        'Easter Giant',
        'Easter-Ledges',
        'Easter Mangiant',
        'English Serpentary',
        'Osterick',
        'Oderwort',
        'Passions',
        'Patience Dock',
        'Red Legs',
        'Sweet Dock',
        'Twice Writhen',
      ],
      categories: [
        'Psychic Work',
        'Fertility',
        'Divination',
        'Wealth',
        'Binding',
        'Knowledge',
        'Purification',
        'Release',
      ],
      references: [
        {
          source: 'cunningham-herbs',
          locator: 's.v. Bistort',
          supports: ['elements', 'planets', 'categories', 'folkNames', 'description'],
        },
        {
          source: 'kynes-plants',
          locator: 's.v. Bistort',
          supports: [
            'canonicalName',
            'elements',
            'planets',
            'zodiacSigns',
            'categories',
            'folkNames',
            'description',
            'safetyNotes',
          ],
        },
        {
          source: 'ahpa-safety',
          locator: 'p. 695; p. xxii',
          supports: ['folkNames', 'safetyNotes'],
        },
        {
          source: 'culpeper-herbal',
          locator: 's.v. Bistort, or Snakeweed',
          supports: ['planets', 'folkNames'],
        },
        {
          source: 'grieve-bistort',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-bistorta-officinalis',
          supports: ['canonicalName', 'description', 'folkNames'],
        },
      ],
      variants: [
        {
          form: 'Root',
          description:
            'Kynes has pieces of dried root strewn before the door or laid under the doormat to turn negative energy away, and the burning root wafted through a house to clear it of ghosts. Black outside and red within, the rootstock is about a fifth tannin and starch-rich; soaked and roasted, it was eaten in lean years in Russia, Iceland and Siberia.',
          colors: ['black', 'red'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 695',
              supports: ['form'],
            },
            {
              source: 'kynes-plants',
              locator: 's.v. Bistort',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-bistort',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'culpeper-herbal',
              locator: 's.v. Bistort, or Snakeweed',
              supports: ['colors'],
            },
          ],
        },
        {
          form: 'Leaf',
          description:
            'Scots bound the leaves inside a cloth to break a spell. With the young shoots they were boiled or steamed as a spring vegetable, under names such as Patience Dock and Passions in Lancashire and Cumberland, and they are the main green of the dock or Easter-ledge pudding of northern England.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bistort',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-bistort',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-bistorta-officinalis',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'In Ireland a traveller would pick a few of the flowers just before setting out and carry them in a pocket as a protective charm. Kynes also scatters dried flowers and leaves around the circle as it is cast, to purify the space, then sweeps them up afterwards and burns them.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Bistort',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
    {
      name: 'Bitter Orange',
      canonicalName: 'Citrus × aurantium',
      nomenclature: 'botanical',
      description:
        "Bitter orange, also sold as Seville or sour orange, is a hybrid citrus tree, a cross of the pomelo and the wild mandarin, native to southern China and South-East Asia. By about 700 AD it had spread through India and Iran into the Islamic world, and its English and botanical names go back, by way of Arabic naranj, to the Sanskrit nagaranga. It is a small evergreen with glossy oval leaves, heart-shaped leaf-stalks bearing long thorns, and strongly scented white flowers, and it can live for six hundred years. The fruit is rougher and darker than a sweet orange, its flesh too sour to eat raw but its peel richly aromatic. The Seville orange is the classic fruit for British marmalade and the bigarade of the original duck à l'orange, and its peel flavours Belgian white beer, orange liqueurs, bitters and Scandinavian Christmas breads. The south of France, Calabria and Sicily grew it on a large scale for the neroli distilled from its blossom. It also serves as the rootstock on which sweet oranges are grown, and its hard pale wood has been turned into baseball bats in Cuba.",
      safetyNotes:
        'The fruit is AHPA safety class 1 but interaction class C: like grapefruit juice, its juice inhibits the drug-metabolising enzyme CYP3A4 and so raises blood levels of drugs it clears, with interactions confirmed for cyclosporine, felodipine, dextromethorphan and saquinavir. One Chinese medicine text cautions against the unripe fruit in pregnancy, and safety while nursing is not established. Concentrated fruit extracts standardised to synephrine are class 2d: combined with caffeine they are not advised for heavy or prolonged use, nor for people with heart irregularities, high blood pressure, insomnia or anxiety. Weight-loss supplements containing bitter orange have been linked in case reports to strokes, angina, ischaemic colitis and heart attacks.',
      folkNames: [
        'Seville Orange',
        'Sour Orange',
        'Bigarade Orange',
        'Marmalade Orange',
        'Bigarade',
        'Bigaradier',
      ],
      references: [
        {
          source: 'kynes-plants',
          locator: 's.v. Orange',
          supports: ['canonicalName', 'folkNames', 'description'],
        },
        {
          source: 'ahpa-safety',
          locator: 'pp. 220–221, 223; pp. xxii–xxiii',
          supports: ['canonicalName', 'folkNames', 'safetyNotes'],
        },
        {
          source: 'grieve-orange-bitter',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'grieve-orange-sweet',
          supports: ['description', 'folkNames'],
        },
        {
          source: 'wikipedia-bitter-orange',
          supports: ['canonicalName', 'description', 'folkNames', 'safetyNotes'],
        },
      ],
      variants: [
        {
          form: 'Fruit',
          colors: ['orange'],
          references: [
            {
              source: 'ahpa-safety',
              locator: 'p. 220',
              supports: ['form'],
            },
            {
              source: 'wikipedia-bitter-orange',
              supports: ['form', 'colors'],
            },
          ],
        },
        {
          form: 'Peel',
          description:
            'The peel is the fragrant part of a fruit too sour to eat. Used fresh or dried, it is powdered as a bitter tonic, for which Grieve rated the Seville peel above the sweet. Dried and ground, it spices Scandinavian Christmas bread and gingerbread, and it flavours Belgian white beer, Cointreau, orange bitters and glögg.',
          safetyNotes:
            'Eating large amounts of orange peel has been said to cause colic and convulsions in children, but AHPA traces the one recorded death to a single case of 1833 and finds no concern at standard doses.',
          references: [
            {
              source: 'kynes-plants',
              locator: 's.v. Orange',
              supports: ['form', 'description'],
            },
            {
              source: 'grieve-orange-sweet',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-bitter-orange',
              supports: ['form', 'description'],
            },
            {
              source: 'ahpa-safety',
              locator: 'p. 221',
              supports: ['safetyNotes'],
            },
          ],
        },
        {
          form: 'Flower',
          description:
            'At Grasse the blossoms were candied in great quantities, and continental Europeans drank a tea of the dried flowers as a mild stimulant for the nerves. Distilled, they give neroli and orange flower water, which French biscuit-makers added to make their biscuits crisp.',
          colors: ['white'],
          references: [
            {
              source: 'grieve-orange-sweet',
              supports: ['form', 'description', 'colors'],
            },
            {
              source: 'wikipedia-bitter-orange',
              supports: ['form', 'description'],
            },
          ],
        },
        {
          form: 'Oil',
          description:
            'Two oils come from the tree: oil of bigarade from the peel, and neroli, distilled from the flowers and a chief ingredient of eau de Cologne. The peel oil flavours ice creams, sweets, drinks of every kind and medicines, an oil from the dried unripe peel goes into Curaçao liqueur, and neroli is used in perfume.',
          references: [
            {
              source: 'grieve-orange-sweet',
              supports: ['form', 'description'],
            },
            {
              source: 'wikipedia-bitter-orange',
              supports: ['form', 'description'],
            },
          ],
        },
      ],
    },
  ],
};
