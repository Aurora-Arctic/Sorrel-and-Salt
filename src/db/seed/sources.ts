import { isNotNull } from 'drizzle-orm';
import { beginSeedTransaction, insertMissingBy, requireFrom } from './idempotent';
import { insertMissingReferences, restateWorks } from './reference-rows';
import { DEITIES } from './deities';
import { citationText } from '../../lib/citation';
import { slugify } from '../../lib/slugify';
import { referenceLinks, SOURCED_KEYS } from '../../modules/ingredients/schema/reference-links';
import { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import { celestialBodies, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type {
  SeedDatabase,
  SeedRunOptions,
  SeedSource,
  SeedSourceLink,
  SeedTransaction,
  SourceTargetTable,
  VocabularySourceKept,
} from './types';

// The sources the vocabulary seed docs record, as compendium-tier `references` rows linked to the curated rows each supports.
// Reference data, seeded after the vocabularies it links. Transcribed by hand from the seed docs, where a source is argued
// (claude-docs/db/references.md, "How the seed reads the docs"); written through reference-rows.ts, shared with the compendium seed.

/**
 * Every source, in the docs' order: the five that chose which deities to
 * list (linked to nothing, deliberately), each tradition's, each deity's,
 * then the astrology doc's.
 */
export const SOURCES: SeedSource[] = [
  {
    reference: {
      kind: 'book',
      authors: 'Cunningham, Scott',
      title: "Cunningham's Encyclopedia of Magical Herbs",
      place: 'St. Paul, MN',
      publisher: 'Llewellyn Publications',
      published: '1985',
      note: "Each entry names the herb's deities",
    },
  },
  {
    reference: {
      kind: 'web_page',
      title: 'A–Z Gods and Goddesses & Plant Associations',
      container: 'Otherworldly Oracle',
      url: 'https://otherworldlyoracle.com/gods-goddesses-plant-associations/',
      accessed: '2026-10-06',
    },
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Herbs Correspondences',
      container: 'Sacred Wicca',
      url: 'https://www.sacredwicca.com/herbs-correspondences',
      accessed: '2026-10-06',
    },
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Herbs & Plants of Hekate',
      container: 'Hekate Covenant',
      url: 'https://www.hekatecovenant.com/herbsandplants',
      accessed: '2026-10-06',
    },
  },
  {
    reference: {
      kind: 'entry',
      title: 'Table of magical correspondences',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Table_of_magical_correspondences',
      accessed: '2026-10-06',
    },
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Greek Gods & Goddesses',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/greek-mythology/greek-gods.html',
      accessed: '2026-10-06',
    },
    traditions: ['Greek'],
    deities: [
      {
        name: 'Ceres',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Greek Mythology',
      container: 'World History Encyclopedia',
      published: 'July 29, 2012',
      url: 'https://www.worldhistory.org/Greek_Mythology/',
      accessed: '2026-10-06',
    },
    traditions: ['Greek'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Hornblower, Simon, Antony Spawforth, and Esther Eidinow, eds.',
      title: 'The Oxford Classical Dictionary',
      edition: '4th ed.',
      place: 'Oxford',
      publisher: 'Oxford University Press',
      published: '2012',
      note: 'Existence and details confirmed through Bryn Mawr Classical Review 2012.08.34, https://bmcr.brynmawr.edu/2012/2012.08.34/',
      scholarly: true,
    },
    traditions: ['Greek', 'Roman'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Azar, Elias N.',
      title: 'Adonis',
      container: 'World History Encyclopedia',
      published: 'February 21, 2016',
      url: 'https://www.worldhistory.org/Adonis/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Adonis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Apollo',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Olympios/Apollon.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Apollo',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Missouri Botanical Garden',
      title: 'Artemisia vulgaris',
      container: 'Plant Finder',
      url: 'https://plantfinder.mobot.org/PlantFinderDetails.aspx?taxonid=256948',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Artemis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Asclepius',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Ouranios/Asklepios.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Asclepius',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Circe',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Titan/Kirke.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Circe',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Dionysus',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Olympios/Dionysos.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Dionysus',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Eros',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Ouranios/Eros.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Eros',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Gaia',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Protogenos/Gaia.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Gaia',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Hades',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Khthonios/Haides.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hades',
      },
      {
        name: 'Pluto',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Hecate',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Khthonios/Hekate.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hecate',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Hecate',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Hecate',
      modified: '2026-09-29',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hecate',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Helius',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Titan/Helios.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Helios',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Hyacinthus',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Heros/Hyakinthos.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hyacinthus',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Hyacinth (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Hyacinth_(mythology)',
      modified: '2026-09-28',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hyacinthus',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Hygeia',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Ouranios/AsklepiasHygeia.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hygieia',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Hypnos',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Daimon/Hypnos.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hypnos',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Missouri Botanical Garden',
      title: 'Iris germanica',
      container: 'Plant Finder',
      url: 'https://plantfinder.mobot.org/PlantFinderDetails.aspx?kempercode=f471',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Iris',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Iris',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Pontios/Iris.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Iris',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Nyx',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Protogenos/Nyx.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nyx',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Pan',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Georgikos/Pan.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Pan',
      },
      {
        name: 'Faunus',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Persephone',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Khthonios/Persephone.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Persephone',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Rhea',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Titan/TitanisRhea.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Rhea',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Selene',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Titan/Selene.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Selene',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Wasson, Donald L.',
      title: 'Roman Religion',
      container: 'World History Encyclopedia',
      published: 'November 13, 2013',
      url: 'https://www.worldhistory.org/Roman_Religion/',
      accessed: '2026-10-06',
    },
    traditions: ['Roman'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Wasson, Donald L.',
      title: 'Roman Mythology',
      container: 'World History Encyclopedia',
      published: 'May 8, 2018',
      url: 'https://www.worldhistory.org/Roman_Mythology/',
      accessed: '2026-10-06',
    },
    traditions: ['Roman'],
    deities: [
      {
        name: 'Faunus',
      },
      {
        name: 'Mars',
      },
      {
        name: 'Saturn',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Smith, William, ed.',
      title: 'A Dictionary of Greek and Roman Biography and Mythology',
      place: 'London',
      publisher: 'John Murray',
      published: '1873',
      host: 'Perseus Digital Library, Tufts University',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104',
      accessed: '2026-10-06',
    },
    traditions: ['Roman'],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Liber',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dliber-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Bacchus',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Cardea',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dcardea-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Cardea',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Ovid',
      title: 'Fasti',
      contributors: 'Translated by James G. Frazer',
      series: 'Loeb Classical Library',
      place: 'Cambridge, MA',
      publisher: 'Harvard University Press; London: William Heinemann Ltd.',
      published: '1931',
      host: 'Theoi Classical Texts Library',
      url: 'https://www.theoi.com/Text/OvidFasti6.html',
      accessed: '2026-10-06',
      scholarly: true,
    },
    deities: [
      {
        name: 'Cardea',
        locator: 'book 6',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Leland, Charles Godfrey',
      title: 'Aradia; or, The Gospel of the Witches',
      place: 'London',
      publisher: 'David Nutt',
      published: '1899',
      url: 'https://archive.org/details/aradiaorgospelof00lela',
      note: 'Also read at the Internet Sacred Text Archive, https://sacred-texts.com/pag/aradia/ara03.htm, accessed October 6, 2026',
    },
    traditions: ['Italian folk witchcraft'],
    deities: [
      {
        name: 'Diana',
        locator: 'chap. 1, "How Diana Gave Birth to Aradia"',
      },
      {
        name: 'Aradia',
        locator: 'chap. 1',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Wasson, Donald L.',
      title: 'Diana',
      container: 'World History Encyclopedia',
      published: 'May 16, 2023',
      url: 'https://www.worldhistory.org/Diana/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Diana',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Flora',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dflora-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Flora',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ceres (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ceres_(mythology)',
      modified: '2026-08-17',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Ceres',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Fortuna',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dfortuna-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Fortuna',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Fortuna',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Fortuna',
      modified: '2026-08-13',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Fortuna',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Minerva',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dminerva-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Minerva',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Neptunus',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dneptunus-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Neptune',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Neptune (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Neptune_(mythology)',
      modified: '2026-09-22',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Neptune',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Servius',
      title: 'In Vergilii carmina comentarii',
      contributors: 'Edited by Georg Thilo',
      publisher: 'B. G. Teubner',
      published: '1881',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0053',
      accessed: '2026-10-06',
      scholarly: true,
    },
    deities: [
      {
        name: 'Neptune',
        locator: 'on Aeneid 1.138 and 7.691',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Pomona',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dpomona-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Pomona',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Silvanus',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dsilvanus-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Silvanus',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Smith, William, ed.',
      title: 'Venus',
      container: 'A Dictionary of Greek and Roman Biography and Mythology',
      host: 'Perseus Digital Library',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dvenus-bio-1',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Venus',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Cybele',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Phrygios/Kybele.html',
      accessed: '2026-10-06',
    },
    traditions: ['Anatolian'],
    deities: [
      {
        name: 'Cybele',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Wasson, Donald L.',
      title: 'Cybele',
      container: 'World History Encyclopedia',
      published: 'February 4, 2015',
      url: 'https://www.worldhistory.org/Cybele/',
      accessed: '2026-10-06',
    },
    traditions: ['Anatolian'],
    deities: [
      {
        name: 'Cybele',
      },
      {
        name: 'Attis',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Roller, Lynn E.',
      title: 'In Search of God the Mother: The Cult of Anatolian Cybele',
      place: 'Berkeley',
      publisher: 'University of California Press',
      published: '1999',
      note: 'Confirmed through Bryn Mawr Classical Review 2001.09.17, https://bmcr.brynmawr.edu/2001/2001.09.17, and Open Library, https://openlibrary.org/books/OL360560M/In_search_of_god_the_mother',
      scholarly: true,
    },
    traditions: ['Anatolian'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Atsma, Aaron J.',
      title: 'Attis',
      container: 'Theoi Greek Mythology',
      url: 'https://www.theoi.com/Phrygios/Attis.html',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Attis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Egyptian Gods - The Complete List',
      container: 'World History Encyclopedia',
      published: 'April 14, 2016',
      url: 'https://www.worldhistory.org/article/885/egyptian-gods---the-complete-list/',
      accessed: '2026-10-06',
    },
    traditions: ['Egyptian'],
    deities: [
      {
        name: 'Bastet',
      },
      {
        name: 'Geb',
      },
      {
        name: 'Horus',
      },
      {
        name: 'Maat',
      },
      {
        name: 'Min',
      },
      {
        name: 'Nut',
      },
      {
        name: 'Ra',
      },
      {
        name: 'Sekhmet',
      },
      {
        name: 'Set',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Wilkinson, Richard H.',
      title: 'The Complete Gods and Goddesses of Ancient Egypt',
      place: 'London',
      publisher: 'Thames & Hudson',
      published: '2017',
      note: 'Paperback edition confirmed through Google Books, https://books.google.com/books/about/The_Complete_Gods_and_Goddesses_of_Ancie.html?id=ozgBOQAACAAJ, ISBN 9780500284247; Open Library records first publication in 2003',
    },
    traditions: ['Egyptian'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Global Egyptian Museum',
      title: 'Min',
      container: 'Glossary',
      url: 'https://www.globalegyptianmuseum.org/glossary.aspx?id=246',
      accessed: '2026-10-06',
    },
    traditions: ['Egyptian'],
    deities: [
      {
        name: 'Min',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Amun',
      container: 'World History Encyclopedia',
      published: 'July 29, 2016',
      url: 'https://www.worldhistory.org/Amun/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Amun',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Anubis',
      container: 'World History Encyclopedia',
      published: 'July 25, 2016',
      url: 'https://www.worldhistory.org/Anubis/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Anubis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Bastet',
      container: 'World History Encyclopedia',
      published: 'July 24, 2016',
      url: 'https://www.worldhistory.org/Bastet/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Bastet',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Hathor',
      container: 'World History Encyclopedia',
      published: 'September 2, 2009',
      url: 'https://www.worldhistory.org/Hathor/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Hathor',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Isis',
      container: 'World History Encyclopedia',
      published: 'February 19, 2016',
      url: 'https://www.worldhistory.org/isis/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Isis',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Isis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Isis',
      modified: '2026-10-03',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Isis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Nephthys',
      container: 'World History Encyclopedia',
      published: 'March 13, 2016',
      url: 'https://www.worldhistory.org/Nephthys/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nephthys',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nut (goddess)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nut_(goddess)',
      modified: '2026-05-25',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nut',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Ranke, Hermann',
      title: 'Egyptian Deities and Their Sacred Animals',
      container: 'Museum Bulletin',
      published: 'November 1950',
      host: 'Penn Museum',
      url: 'https://www.penn.museum/sites/bulletin/3283/',
      accessed: '2026-10-06',
      scholarly: true,
    },
    deities: [
      {
        name: 'Sekhmet',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Sekhmet',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sekhmet',
      modified: '2026-09-20',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Sekhmet',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Thoth',
      container: 'World History Encyclopedia',
      published: 'July 26, 2016',
      url: 'https://www.worldhistory.org/Thoth/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Thoth',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Black, Jeremy, and Anthony Green',
      title: 'Gods, Demons and Symbols of Ancient Mesopotamia: An Illustrated Dictionary',
      contributors: 'Illustrated by Tessa Rickards',
      place: 'London',
      publisher: 'British Museum Press; Austin: University of Texas Press',
      published: '1992',
      scholarly: true,
    },
    traditions: ['Sumerian', 'Akkadian & Babylonian'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Ancient Mesopotamian Gods and Goddesses: List of Deities',
      container: 'Oracc (Open Richly Annotated Cuneiform Corpus)',
      publisher: 'University of Pennsylvania Museum',
      url: 'http://oracc.museum.upenn.edu/amgg/listofdeities/',
      modified: '2019-12-18',
      accessed: '2026-10-06',
    },
    traditions: ['Sumerian'],
    deities: [
      {
        name: 'Tammuz',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'The Mesopotamian Pantheon: The Ancient Gods and Goddesses of the Near East',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/article/221/the-mesopotamian-pantheon/',
      modified: '2026-05-03',
      accessed: '2026-10-06',
    },
    traditions: ['Sumerian', 'Akkadian & Babylonian'],
    deities: [
      {
        name: 'Tammuz',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Inanna: The Most Popular Goddess of Ancient Mesopotamia',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Inanna/',
      modified: '2026-05-18',
      accessed: '2026-10-06',
    },
    traditions: ['Sumerian'],
    deities: [
      {
        name: 'Inanna',
      },
      {
        name: 'Ishtar',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Lilith',
      container: '_Encyclopaedia Judaica_',
      edition: '2nd ed.',
      contributors: 'Edited by Fred Skolnik and Michael Berenbaum',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA in association with the Keter Publishing House',
      published: '2007',
      host: 'Jewish Virtual Library',
      url: 'https://www.jewishvirtuallibrary.org/lilith',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2006020426',
      scholarly: true,
    },
    traditions: ['Akkadian & Babylonian'],
    deities: [
      {
        name: 'Lilith',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Baal',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/baal/',
      modified: '2026-10-06',
      accessed: '2026-10-06',
    },
    traditions: ['Canaanite & Phoenician'],
    deities: [
      {
        name: 'Anat',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Astarte',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/astarte/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Canaanite & Phoenician'],
    deities: [
      {
        name: 'Astarte',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Downey, April Lynn',
      title: 'Asherah',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Asherah/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Canaanite & Phoenician'],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Pope, Marvin H.',
      title: 'Anath',
      container: '_Encyclopaedia Judaica_',
      edition: '2nd ed.',
      contributors: 'Edited by Fred Skolnik and Michael Berenbaum',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA in association with the Keter Publishing House',
      published: '2007',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2006020426',
      scholarly: true,
    },
    traditions: ['Canaanite & Phoenician'],
    deities: [
      {
        name: 'Anat',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Boyce, Mary',
      title: 'Anāhīd i. Ardwīsūr Anāhīd',
      container: '_Encyclopaedia Iranica_, online edition',
      published: 'December 14, 1989',
      url: 'https://www.iranicaonline.org/articles/anahid-i',
      modified: '2018-08-07',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Persian'],
    deities: [
      {
        name: 'Anahita',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Schmidt, Hanns-Peter',
      title: 'Mithra i. Mitra in Old Indian and Mithra in Old Iranian',
      container: '_Encyclopaedia Iranica_, online edition',
      published: 'August 15, 2006',
      url: 'https://www.iranicaonline.org/articles/mithra-i',
      modified: '2018-05-14',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Persian'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Anahita',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Anahita/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Persian'],
    deities: [
      {
        name: 'Anahita',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Mithra',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Mithra/',
      modified: '2026-10-06',
      accessed: '2026-10-06',
    },
    traditions: ['Persian'],
    deities: [
      {
        name: 'Mithra',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Beck, Roger',
      title: 'Mithraism',
      container: '_Encyclopaedia Iranica_, online edition',
      published: 'July 20, 2002',
      url: 'https://www.iranicaonline.org/articles/mithraism',
      modified: '2012-11-15',
      accessed: '2026-10-06',
      scholarly: true,
    },
    deities: [
      {
        name: 'Mithra',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Lindow, John',
      title: 'Norse Mythology: A Guide to the Gods, Heroes, Rituals, and Beliefs',
      place: 'New York',
      publisher: 'Oxford University Press',
      published: '2002',
      scholarly: true,
    },
    traditions: ['Norse'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Simek, Rudolf',
      title: 'Dictionary of Northern Mythology',
      contributors: 'Translated by Angela Hall',
      place: 'Cambridge',
      publisher: 'D. S. Brewer',
      published: '1993',
      scholarly: true,
    },
    traditions: ['Norse', 'Anglo-Saxon & Continental Germanic'],
    deities: [
      {
        name: 'Nerthus',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Snorri Sturluson',
      title: 'The Prose Edda: Norse Mythology',
      contributors: 'Translated by Jesse L. Byock',
      place: 'London',
      publisher: 'Penguin Classics',
      published: '2005',
    },
    traditions: ['Norse'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Groeneveld, Emma',
      title: 'Norse Mythology',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Norse_Mythology/',
      modified: '2025-02-04',
      accessed: '2026-10-06',
    },
    traditions: ['Norse'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Groeneveld, Emma',
      title: 'Freyja',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Freyja/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Norse'],
    deities: [
      {
        name: 'Freya',
      },
      {
        name: 'Skadi',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Snorri Sturluson',
      title: 'The Prose Edda',
      contributors: 'Translated by Arthur Gilchrist Brodeur',
      place: 'New York',
      publisher: 'American-Scandinavian Foundation',
      published: '1916',
      host: 'Internet Sacred Text Archive',
      url: 'https://sacred-texts.com/neu/pre/pre04.htm',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Eir',
        locator: '"Gylfaginning," chap. XXXV, p. 46',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Eir',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Eir',
      modified: '2026-08-31',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Eir',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Bede',
      title: 'The Reckoning of Time',
      contributors: 'Translated, with introduction, notes and commentary, by Faith Wallis',
      series: 'Translated Texts for Historians 29',
      place: 'Liverpool',
      publisher: 'Liverpool University Press',
      published: '1999',
      scholarly: true,
    },
    traditions: ['Anglo-Saxon & Continental Germanic'],
    deities: [
      {
        name: 'Eostre',
        locator: 'chap. 15',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Grimm, Jacob',
      title: 'Teutonic Mythology',
      contributors: 'Translated by James Steven Stallybrass',
      volume: '4 vols.',
      place: 'London',
      publisher: 'George Bell and Sons',
      published: '1882–88',
    },
    traditions: ['Anglo-Saxon & Continental Germanic'],
    deities: [
      {
        name: 'Eostre',
        locator: 'vol. 1, chap. 13, "Goddesses: Erda — Isis — Holda, Berhta — Hrede — Ostara"',
      },
      {
        name: 'Berchta',
        locator: 'vol. 1, chap. 13, "Goddesses: Erda — Isis — Holda, Berhta — Hrede — Ostara"',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Tacitus',
      title: 'Germany and Its Tribes',
      contributors: 'Translated by Alfred John Church and William Jackson Brodribb',
      place: 'New York',
      publisher: 'Random House',
      published: '1942',
      host: 'Perseus Digital Library, Tufts University',
      url: 'http://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0083:chapter=40',
      accessed: '2026-10-06',
    },
    traditions: ['Anglo-Saxon & Continental Germanic'],
    deities: [
      {
        name: 'Nerthus',
        locator: 'chap. 40',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Perchta',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Perchta',
      modified: '2026-07-19',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Berchta',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Grimm, Jacob, and Wilhelm Grimm',
      title: 'Frau Holle',
      container: 'Kinder- und Hausmärchen',
      contributors: 'translated by D. L. Ashliman',
      edition: '7th ed.',
      published: '1857',
      host: 'Folklore and Mythology Electronic Texts, University of Pittsburgh',
      url: 'https://sites.pitt.edu/~dash/grimm024.html',
      modified: '2019-01-06',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Holda',
        locator: 'no. 24',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Frau Holle',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Frau_Holle',
      modified: '2026-09-17',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Holda',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Green, Miranda J.',
      title: 'Dictionary of Celtic Myth and Legend',
      place: 'London',
      publisher: 'Thames and Hudson',
      published: '1992',
    },
    traditions: ['Irish', 'Gaulish & British'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'MacKillop, James',
      title: 'Dictionary of Celtic Mythology',
      place: 'Oxford',
      publisher: 'Oxford University Press',
      published: '1998',
      scholarly: true,
    },
    traditions: ['Irish', 'Welsh'],
  },
  {
    reference: {
      kind: 'book',
      title: 'Cath Maige Tuired: The Second Battle of Mag Tuired',
      contributors: 'Translated by Elizabeth A. Gray',
      series: 'Irish Texts Society 52',
      place: 'Dublin',
      publisher: 'Irish Texts Society',
      published: '1982',
      host: 'CELT: Corpus of Electronic Texts, University College Cork',
      url: 'https://celt.ucc.ie/published/T300010.html',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Irish'],
    deities: [
      {
        name: 'Airmed',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'The Dagda',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/The_Dagda/',
      modified: '2026-10-06',
      accessed: '2026-10-06',
    },
    traditions: ['Irish'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Lugh',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Lugh/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Irish'],
    deities: [
      {
        name: 'Lugh',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'The Mórrigan',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/The_Morrigan/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Irish'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Áine',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/%C3%81ine',
      modified: '2026-08-10',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Aine',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Ford, Patrick K., ed. and trans.',
      title: 'The Mabinogi and Other Medieval Welsh Tales',
      edition: '2nd ed.',
      place: 'Berkeley',
      publisher: 'University of California Press',
      published: '2019',
      scholarly: true,
    },
    traditions: ['Welsh'],
    deities: [
      {
        name: 'Blodeuwedd',
        locator: '"Math son of Mathonwy"',
      },
      {
        name: 'Gwydion',
        locator: '"Math son of Mathonwy"',
      },
      {
        name: 'Arianrhod',
        locator: '"Math son of Mathonwy"',
      },
      {
        name: 'Cerridwen',
        locator: '"The Tale of Gwion Bach and the Tale of Taliesin"',
      },
      {
        name: 'Mabon',
        locator: '"Culhwch and Olwen"',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Kelly, Aidan',
      title: 'About Naming Ostara, Litha, and Mabon',
      container: 'Patheos (blog)',
      published: 'May 3, 2017',
      url: 'https://www.patheos.com/blogs/aidankelly/2017/05/naming-ostara-litha-mabon/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Mabon',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'The Ancient Celtic Pantheon',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/article/1715/the-ancient-celtic-pantheon/',
      modified: '2026-10-06',
      accessed: '2026-10-06',
    },
    traditions: ['Gaulish & British'],
    deities: [
      {
        name: 'Sulis',
      },
      {
        name: 'Taranis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Cernunnos: The Ancient Celtic Nature God',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Cernunnos/',
      modified: '2025-04-18',
      accessed: '2026-10-06',
    },
    traditions: ['Gaulish & British'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Roman Curse Tablets',
      container: 'Roman Baths, Bath & North East Somerset Council',
      url: 'https://www.romanbaths.co.uk/roman-curse-tablets',
      accessed: '2026-10-06',
    },
    traditions: ['Gaulish & British'],
    deities: [
      {
        name: 'Sulis',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Epona',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/article/153/epona/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Epona',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Epona',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Epona',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Epona',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Taranis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Taranis',
      modified: '2026-09-03',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Taranis',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Gimbutas, Marija',
      title: 'Slavic Religion',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/slavic-religion',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Slavic'],
    deities: [
      {
        name: 'Baba Yaga',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Gimbutas, Marija',
      title: 'Perun',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/perun',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Slavic'],
    deities: [
      {
        name: 'Perkunas',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Gimbutas, Marija',
      title: 'Veles-Volos',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/veles-volos',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Slavic'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Kravtsiw, Bohdan, and Bohdan Medwidsky',
      title: 'Mythology',
      container: '_Internet Encyclopedia of Ukraine_',
      publisher: 'Canadian Institute of Ukrainian Studies',
      url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CM%5CY%5CMythology.htm',
      accessed: '2026-10-06',
      note: 'Originally published in _Encyclopedia of Ukraine_, vol. 3 (1993)',
      scholarly: true,
    },
    traditions: ['Slavic'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Mokosh',
      container: '_Internet Encyclopedia of Ukraine_',
      publisher: 'Canadian Institute of Ukrainian Studies',
      url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CM%5CO%5CMokosh.htm',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Slavic'],
    deities: [
      {
        name: 'Mokosh',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Veles',
      container: '_Internet Encyclopedia of Ukraine_',
      publisher: 'Canadian Institute of Ukrainian Studies',
      url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CV%5CE%5CVeles.htm',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Slavic'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Dixon-Kennedy, Mike',
      title: 'Encyclopedia of Russian and Slavic Myth and Legend',
      place: 'Santa Barbara, CA',
      publisher: 'ABC-CLIO',
      published: '1998',
      note: 'Existence confirmed at Open Library, https://openlibrary.org/books/OL360283M/Encyclopedia_of_Russian_Slavic_myth_and_legend, and the Internet Archive catalogue record',
      scholarly: true,
    },
    traditions: ['Slavic'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Lada',
      container: '_Internet Encyclopedia of Ukraine_',
      publisher: 'Canadian Institute of Ukrainian Studies',
      url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CL%5CA%5CLada.htm',
      accessed: '2026-10-06',
      scholarly: true,
    },
    deities: [
      {
        name: 'Lada',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Lada (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lada_(mythology)',
      modified: '2026-07-16',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Lada',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Morana (goddess)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Morana_(goddess)',
      modified: '2026-09-15',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Morana',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Biezais, Haralds, and Sigma Ankrava',
      title: 'Baltic Religion: An Overview',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/baltic-religion-overview',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Baltic'],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Kursīte, Janīna',
      title: 'Baltic Religion: History of Study',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/baltic-religion-history-study',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Baltic'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Perkūnas',
      container: '_Visuotinė lietuvių enciklopedija_',
      place: 'Vilnius',
      publisher: 'Mokslo ir enciklopedijų leidybos centras',
      url: 'https://www.vle.lt/straipsnis/perkunas/',
      accessed: '2026-10-06',
    },
    traditions: ['Baltic'],
    deities: [
      {
        name: 'Perkunas',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Laima',
      container: '_Visuotinė lietuvių enciklopedija_',
      place: 'Vilnius',
      publisher: 'Mokslo ir enciklopedijų leidybos centras',
      url: 'https://www.vle.lt/straipsnis/laima/',
      accessed: '2026-10-06',
    },
    traditions: ['Baltic'],
    deities: [
      {
        name: 'Laima',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Žemyna',
      container: '_Visuotinė lietuvių enciklopedija_',
      place: 'Vilnius',
      publisher: 'Mokslo ir enciklopedijų leidybos centras',
      url: 'https://www.vle.lt/straipsnis/zemyna/',
      accessed: '2026-10-06',
    },
    traditions: ['Baltic'],
    deities: [
      {
        name: 'Zemyna',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Gimbutas, Marija',
      title: 'The Balts',
      series: 'Ancient Peoples and Places 33',
      place: 'London',
      publisher: 'Thames and Hudson',
      published: '1963',
      note: 'Existence confirmed through the _Antiquity_ review record at Cambridge Core, https://www.cambridge.org/core/journals/antiquity/article/abs/balts-by-marija-gimbutas-vol-33-ancient-peoples-and-places-london-thames-and-hudson-1963-286-pp-40-pls-58-figs-30s/3AC643C4724810CC880846BB1C6763E6, and Open Library, https://openlibrary.org/works/OL278802W/The_Balts',
    },
    traditions: ['Baltic'],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Ambrazevičius, Rytis, ed.',
      title: 'Baltic Religion',
      container: 'Lithuanian Roots',
      place: 'Vilnius',
      publisher: 'Lithuanian Folk Culture Centre',
      published: '1996',
      url: 'https://www.lnkc.lt/eknygos/roots/node16.html',
      accessed: '2026-10-06',
    },
    traditions: ['Baltic'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Žemyna',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/%C5%BDemyna',
      modified: '2025-12-21',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Zemyna',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Lönnrot, Elias',
      title: 'The Kalevala: The Epic Poem of Finland',
      contributors: 'Translated by John Martin Crawford',
      published: '1888',
      host: 'Internet Sacred Text Archive',
      url: 'https://sacred-texts.com/neu/kveng/index.htm',
      accessed: '2026-10-06',
      note: 'Preface: https://sacred-texts.com/neu/kveng/kvpref.htm; Rune II: https://sacred-texts.com/neu/kveng/kvrune02.htm; Rune XIV: https://sacred-texts.com/neu/kveng/kvrune14.htm',
    },
    traditions: ['Finnish'],
    deities: [
      {
        name: 'Mielikki',
        locator: 'preface; rune XIV',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Lönnrot, Elias',
      title: 'The Kalevala: The Epic Poem of Finland',
      contributors: 'Translated by John Martin Crawford',
      published: '1888',
      host: 'Project Gutenberg ebook 5186',
      url: 'https://www.gutenberg.org/files/5186/5186-h/5186-h.htm',
      modified: '2025-07-08',
      accessed: '2026-10-06',
    },
    traditions: ['Finnish'],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Siikala, Anna-Leena',
      title: 'Ukko',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/ukko',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Finnish'],
    deities: [
      {
        name: 'Ukko',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Pentikäinen, Juha',
      title: 'Finnish Religions',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/finnish-religions',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Finnish'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Finnish Literature Society',
      title: 'Kalevala – European Heritage Label',
      url: 'https://www.finlit.fi/en/about-us/kalevala-european-heritage-label/',
      accessed: '2026-10-06',
    },
    traditions: ['Finnish'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Mielikki',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Mielikki',
      modified: '2026-06-24',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Mielikki',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Johnson, W. J.',
      title: 'A Dictionary of Hinduism',
      place: 'Oxford',
      publisher: 'Oxford University Press',
      published: '2009',
      note: "Existence confirmed through the Internet Archive catalogue record, https://archive.org/details/dictionaryofhind0000john, and Oxford University Press's product listing, https://global.oup.com/academic/product/a-dictionary-of-hinduism-9780198610250",
      scholarly: true,
    },
    traditions: ['Hindu'],
    deities: [
      {
        name: 'Krishna',
      },
      {
        name: 'Vishnu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Brereton, Joel P.',
      title: 'Soma',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/soma',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Hindu'],
    deities: [
      {
        name: 'Soma',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Findly, Ellison Banks',
      title: 'Agni',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/agni',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Hindu'],
    deities: [
      {
        name: 'Agni',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Lorenzen, David N.',
      title: 'Durgā: Hinduism',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/durga-hinduism',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Hindu'],
    deities: [
      {
        name: 'Durga',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      title: 'Dhanvantari',
      container: 'The Concise Oxford Dictionary of World Religions',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/religion/dictionaries-thesauruses-pictures-and-press-releases/dhanvantari',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Hindu'],
    deities: [
      {
        name: 'Dhanvantari',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'List of Hindu deities',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/List_of_Hindu_deities',
      modified: '2023-12-12',
      accessed: '2026-10-06',
    },
    traditions: ['Hindu'],
    deities: [
      {
        name: 'Krishna',
      },
      {
        name: 'Vishnu',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Wellcome Collection',
      title: 'Dhanvantarī (Founder of Ayurveda)',
      url: 'https://wellcomecollection.org/concepts/bzmtxvc4',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Dhanvantari',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Dhanvantari',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Dhanvantari',
      modified: '2026-08-09',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Dhanvantari',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cleveland Museum of Art',
      title:
        'Hanuman Brings the Mountain of Healing Plants; Rama Extracts the Arrow from Lakshmana as Hanuman and a Bear Prepare to Treat Him (recto)',
      url: 'https://www.clevelandart.org/art/1979.21.a',
      accessed: '2026-10-06',
      note: 'Palm-leaf manuscript, Odisha, late 1700s; accession 1979.21.a',
    },
    deities: [
      {
        name: 'Hanuman',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Philadelphia Museum of Art',
      title: 'Surya, The Sun God',
      url: 'https://www.philamuseum.org/objects/41833',
      accessed: '2026-10-06',
      note: 'Sculpture, c. 12th century; object 41833',
    },
    deities: [
      {
        name: 'Surya',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Knipe, David M.',
      title: 'Agni',
      container: '_Encyclopedia of India_',
      contributors: 'Edited by Stanley A. Wolpert',
      place: 'Detroit',
      publisher: "Charles Scribner's Sons/Thomson Gale",
      published: '2006',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/international/encyclopedias-almanacs-transcripts-and-maps/agni',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2005019616',
      scholarly: true,
    },
    deities: [
      {
        name: 'Agni',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      title: 'Agni',
      container: 'The Concise Oxford Dictionary of World Religions',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/religion/dictionaries-thesauruses-pictures-and-press-releases/agni',
      accessed: '2026-10-06',
      scholarly: true,
    },
    deities: [
      {
        name: 'Agni',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Emily',
      title: 'Most Popular Gods & Goddesses of Ancient China',
      container: 'World History Encyclopedia',
      published: 'April 25, 2016',
      url: 'https://www.worldhistory.org/article/894/most-popular-gods--goddesses-of-ancient-china/',
      accessed: '2026-10-06',
    },
    traditions: ['Taoist'],
    deities: [
      {
        name: 'Xi Wangmu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Queen Mother of the West',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Queen_Mother_of_the_West',
      modified: '2024-12-13',
      accessed: '2026-10-06',
    },
    traditions: ['Taoist'],
    deities: [
      {
        name: 'Xi Wangmu',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Christie, Anthony',
      title: 'Chinese Mythology',
      series: "Hamlyn's Mythology Series",
      place: 'Feltham',
      publisher: 'Hamlyn',
      published: '1968',
      note: 'Existence confirmed through the _Journal of the Royal Asiatic Society_ review, https://www.cambridge.org/core/journals/journal-of-the-royal-asiatic-society/article/abs/chinese-mythology-by-anthony-christie-hamlyns-mythology-series-pp-141-feltham-hamlyn-publishing-group-1968-87p/B46788498D7288CA5A29D797E299B5A1',
    },
    traditions: ['Taoist'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Nelson-Atkins Museum of Art',
      title: 'Guanyin of the Southern Sea',
      container: 'Collection',
      url: 'https://art.nelson-atkins.org/objects/597/guanyin-of-the-southern-sea',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese Buddhist'],
    deities: [
      {
        name: 'Kuan Yin',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Fitzwilliam Museum, University of Cambridge',
      title: 'Look, Think, Do: Wooden Figure of Kwan Yin [Guanyin] God(dess) of Mercy',
      url: 'https://fitzmuseum.cam.ac.uk/learn-with-us/look-think-do/wooden-figure-of-kwan-yin-guanyin-goddess-of-mercy',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese Buddhist'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Asian Art Museum, San Francisco',
      title: 'The Bodhisattva Avalokiteshvara (Guanyin)',
      container: 'Collections',
      url: 'https://collections.asianart.org/collection/guanyin/',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese Buddhist'],
    deities: [
      {
        name: 'Kuan Yin',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Guanyin',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Guanyin',
      modified: '2024-12-28',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese Buddhist'],
    deities: [
      {
        name: 'Kuan Yin',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'National Library of Medicine',
      title: 'Emperors and Physicians: Shen Nung',
      container: 'Chinese Traditional Medicine (online exhibition)',
      url: 'https://www.nlm.nih.gov/hmd/topics/chinese-traditional/foundation-emperor_9203733-shennung-sm.html?imgid=3',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese folk'],
    deities: [
      {
        name: 'Shennong',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Wellcome Collection',
      title: 'Chinese Woodcut, Famous Medical Figures: Shen Nong',
      url: 'https://wellcomecollection.org/works/fevczv94',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese folk'],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Daniel, Gillian',
      title: 'The Legend of the Divine Farmer',
      container: 'Public Domain Review',
      published: 'November 3, 2015',
      url: 'https://publicdomainreview.org/essay/the-legend-of-the-divine-farmer/',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese folk'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Shennong',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Shennong',
      modified: '2026-10-01',
      accessed: '2026-10-06',
    },
    traditions: ['Chinese folk'],
    deities: [
      {
        name: 'Shennong',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mori, Mizue',
      title: 'Amaterasu',
      container: '_Encyclopedia of Shinto_',
      publisher: 'Kokugakuin University',
      url: 'https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9440',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Amaterasu',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mori, Mizue',
      title: 'Tsukuyomi',
      container: '_Encyclopedia of Shinto_',
      publisher: 'Kokugakuin University',
      url: 'https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9136',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Tsukuyomi',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Kadoya, Atsushi',
      title: 'Ukanomitama',
      container: '_Encyclopedia of Shinto_',
      publisher: 'Kokugakuin University',
      url: 'https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9742',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Inari',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Nogami, Takahiro',
      title: 'Inari Shinkō',
      container: '_Encyclopedia of Shinto_',
      publisher: 'Kokugakuin University',
      url: 'https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9027',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Inari',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Iwai, Hiroshi',
      title: 'Shichifukujin',
      container: '_Encyclopedia of Shinto_',
      publisher: 'Kokugakuin University',
      url: 'https://d-museum.kokugakuin.ac.jp/eos/detail/?id=9974',
      accessed: '2026-10-06',
      scholarly: true,
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Benzaiten',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Amaterasu',
      container: 'World History Encyclopedia',
      published: 'December 17, 2012',
      url: 'https://www.worldhistory.org/Amaterasu/',
      accessed: '2026-10-06',
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Tsukuyomi',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Inari',
      container: 'World History Encyclopedia',
      published: 'May 23, 2017',
      url: 'https://www.worldhistory.org/Inari/',
      accessed: '2026-10-06',
    },
    traditions: ['Japanese'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Seven Lucky Gods',
      container: 'World History Encyclopedia',
      published: 'June 24, 2013',
      url: 'https://www.worldhistory.org/Shichifukujin/',
      modified: '2024-09-27',
      accessed: '2026-10-06',
    },
    traditions: ['Japanese'],
    deities: [
      {
        name: 'Benzaiten',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Ashkenazi, Michael',
      title: 'Handbook of Japanese Mythology',
      series: 'Handbooks of World Mythology',
      place: 'Santa Barbara, CA',
      publisher: 'ABC-CLIO',
      published: '2003',
      note: 'Existence confirmed through Google Books, https://books.google.com/books/about/Handbook_of_Japanese_Mythology.html?id=GGFrygAACAAJ, and the _Education About Asia_ review, https://www.asianstudies.org/publications/eaa/archives/handbook-of-japanese-mythology-2/',
      scholarly: true,
    },
    traditions: ['Japanese'],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Gilbert, Michelle',
      title: 'Akan Religion',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/akan-religion',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Akan'],
    deities: [
      {
        name: 'Asase Yaa',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Asante, Molefi Kete, and Ama Mazama, eds.',
      title: 'Encyclopedia of African Religion',
      volume: '2 vols.',
      place: 'Thousand Oaks, CA',
      publisher: 'SAGE Publications',
      published: '2009',
      note: 'Existence and the entries "Nyame" and "Asase Yaa" confirmed on the publisher\'s page, https://www.sagepub.com/en-us/nam/encyclopedia-of-african-religion/book228941, and the Open Library record; the entries themselves sit behind SAGE\'s sign-in and were not read',
      scholarly: true,
    },
    traditions: ['Akan'],
    deities: [
      {
        name: 'Asase Yaa',
      },
      {
        name: 'Nzambici',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Akan religion',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Akan_religion',
      modified: '2024-12-04',
      accessed: '2026-10-06',
    },
    traditions: ['Akan'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tano (Ta Kora)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tano_(Ta_Kora)',
      modified: '2026-08-19',
      accessed: '2026-10-06',
    },
    traditions: ['Akan'],
    deities: [
      {
        name: 'Tano',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Asase Ya/Afua',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Asase_Ya/Afua',
      modified: '2026-09-25',
      accessed: '2026-10-06',
    },
    traditions: ['Akan'],
    deities: [
      {
        name: 'Asase Yaa',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nyankapon-Nyame-Odomankoma',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nyankapon-Nyame-Odomankoma',
      modified: '2026-08-26',
      accessed: '2026-10-06',
    },
    traditions: ['Akan'],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Arinze, Francis A., and Ogbu Kalu',
      title: 'Igbo Religion',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/igbo-religion',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Igbo'],
    deities: [
      {
        name: 'Ala',
      },
      {
        name: 'Agwu',
      },
      {
        name: 'Njoku Ji',
      },
      {
        name: 'Chukwu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Chukwu',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Chukwu',
      modified: '2026-09-15',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
    deities: [
      {
        name: 'Chukwu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ala (odinani)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ala_(odinani)',
      modified: '2026-08-22',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
    deities: [
      {
        name: 'Ala',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Amadioha',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Amadioha',
      modified: '2026-09-01',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Anyanwu',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Anyanwu',
      modified: '2026-09-12',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Agwu Nsi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Agwu_Nsi',
      modified: '2026-09-20',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
    deities: [
      {
        name: 'Agwu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Njoku Ji',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Njoku_Ji',
      modified: '2026-07-11',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Alusi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Alusi',
      modified: '2026-08-20',
      accessed: '2026-10-06',
    },
    traditions: ['Igbo'],
    deities: [
      {
        name: 'Njoku Ji',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      title: 'Deities of the Igbo Religion',
      container: 'World Eras',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/history/news-wires-white-papers-and-books/deities-igbo-religion',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Ala',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Gilbert, Michelle',
      title: 'Fon and Ewe Religion',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/fon-and-ewe-religion',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Legba',
      },
      {
        name: 'Mawu-Lisa',
      },
      {
        name: 'Nana Buluku',
      },
      {
        name: 'Sagbata',
      },
      {
        name: 'Xevioso',
      },
      {
        name: 'Dan',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Thayer, James S.',
      title: 'Mawu-Lisa',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/mawu-lisa',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Mawu-Lisa',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Herskovits, Melville J.',
      title: 'Dahomey: An Ancient West African Kingdom',
      volume: '2 vols.',
      place: 'New York',
      publisher: 'J. J. Augustin',
      published: '1938',
      note: "Title page read in the Internet Archive's full text, https://archive.org/details/in.ernet.dli.2015.36395; Open Library and Yale's eHRAF record the Northwestern University Press reprint, Evanston, 1967",
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Xevioso',
        locator: 'chap. XXVI',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Blier, Suzanne Preston',
      title: 'African Vodun: Art, Psychology, and Power',
      place: 'Chicago',
      publisher: 'University of Chicago Press',
      published: '1995',
      note: 'Existence, place, year and ISBN 0-226-05858-1 confirmed on the Open Library record, https://openlibrary.org/books/OL1078882M/African_vodun; the text was not read',
      scholarly: true,
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Sagbata',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'West African Vodun',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/West_African_Vodun',
      modified: '2025-01-19',
      accessed: '2026-10-06',
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Dan',
      },
      {
        name: 'Agbe',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Dahomean religion',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Dahomean_religion',
      modified: '2026-08-14',
      accessed: '2026-10-06',
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Sagbata',
      },
      {
        name: 'Agbe',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Xevioso',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Xevioso',
      modified: '2026-08-08',
      accessed: '2026-10-06',
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Gu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nana Buluku',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nana_Buluku',
      modified: '2026-09-07',
      accessed: '2026-10-06',
    },
    traditions: ['Fon & Ewe'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ayida-Weddo',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ayida-Weddo',
      modified: '2024-01-14',
      accessed: '2026-10-06',
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Dan',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ogun',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ogun',
      modified: '2026-10-01',
      accessed: '2026-10-06',
      note: 'The page https://en.wikipedia.org/wiki/Gu_(vodun) redirects here; the section on the Fon names Gu and the Ewe Egu',
    },
    traditions: ['Fon & Ewe'],
    deities: [
      {
        name: 'Gu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Papa Legba',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Papa_Legba',
      modified: '2026-10-03',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Legba',
      },
      {
        name: 'Papa Legba',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Orisha',
      container: 'World History Encyclopedia',
      published: 'October 6, 2021',
      url: 'https://www.worldhistory.org/Orisha/',
      modified: '2022-10-07',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Elegba',
      },
      {
        name: 'Shango',
      },
      {
        name: 'Yemaya',
      },
      {
        name: 'Obatala',
      },
      {
        name: 'Oya',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'Oshun',
      container: 'World History Encyclopedia',
      published: 'October 1, 2021',
      url: 'https://www.worldhistory.org/Oshun/',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Oshun',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'UNESCO',
      title: 'Ifa Divination System',
      container: 'Intangible Cultural Heritage, Representative List, inscribed 2008',
      url: 'https://ich.unesco.org/en/RL/ifa-divination-system-00146',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Orunmila',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Yale University Art Gallery',
      title: "Herbalist's Staff (Ọ̀pá Ọ̀sanyin)",
      container: 'Collections',
      url: 'https://artgallery.yale.edu/collections/objects/61022',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Osanyin',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Denver Art Museum',
      title: 'Eshu Elegba Figure',
      container: 'Collection',
      url: 'https://www.denverartmuseum.org/en/object/1985.296',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Elegba',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Edmonds, Jahsun',
      title: 'A Vital Matters Perspective: Yemonja in the Diaspora',
      container: 'Vital Matters, Fowler Museum at UCLA',
      url: 'https://vitalmatters.fowler.ucla.edu/perspectives/v0406',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Yemaya',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Thompson, Robert Farris',
      title: 'Flash of the Spirit: African and Afro-American Art and Philosophy',
      place: 'New York',
      publisher: 'Random House',
      published: '1983',
      note: 'Existence confirmed at https://archive.org/details/flashofspiritafr00thom_0, and of the Vintage Books paperback, New York, 1984, through Penguin Random House, https://www.penguinrandomhouse.com/books/178308/flash-of-the-spirit-by-robert-farris-thompson/; text not read',
    },
    traditions: ['Yoruba', 'Kongo'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Karade, Baba Ifa',
      title: 'The Handbook of Yoruba Religious Concepts',
      edition: 'Rev. ed.',
      series: 'Weiser Classics',
      place: 'Newburyport, MA',
      publisher: 'Weiser Books',
      published: '2020',
      note: 'Existence confirmed through Red Wheel/Weiser, https://redwheelweiser.com/book/the-handbook-of-yoruba-religious-concepts-9781578636679/',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Orunmila',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Shango',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Shango',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Shango',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ọbatala',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/%E1%BB%8Cbatala',
      modified: '2026-09-24',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Obatala',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ọya',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/%E1%BB%8Cya',
      modified: '2026-09-24',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Oya',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ọsanyìn',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/%E1%BB%8Csany%C3%ACn',
      modified: '2026-08-20',
      accessed: '2026-10-06',
    },
    traditions: ['Yoruba'],
    deities: [
      {
        name: 'Osanyin',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Janzen, John M.',
      title: 'Kongo Religion',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/kongo-religion',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Kongo'],
    deities: [
      {
        name: 'Nzambi Mpungu',
      },
      {
        name: 'Kalunga',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Ogungbile, David',
      title: 'God: African Supreme Beings',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/god-african-supreme-beings',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Kongo'],
    deities: [
      {
        name: 'Nzambi Mpungu',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'MacGaffey, Wyatt',
      title: 'Religion and Society in Central Africa: The BaKongo of Lower Zaire',
      place: 'Chicago',
      publisher: 'University of Chicago Press',
      published: '1986',
      note: "Existence confirmed at https://searchworks.stanford.edu/view/1215388 and in Louis Brenner's review, _Bulletin of SOAS_ 51, no. 2 (1988): 399, https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0041977X00115356; text not read (see Notes)",
      scholarly: true,
    },
    traditions: ['Kongo'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Janzen, John M., and Wyatt MacGaffey',
      title: 'An Anthology of Kongo Religion: Primary Texts from Lower Zaïre',
      series: 'University of Kansas Publications in Anthropology 5',
      place: 'Lawrence',
      publisher: 'University of Kansas',
      published: '1974',
      note: 'Existence confirmed at https://opac.aua.ac.ke/cgi-bin/koha/opac-ISBDdetail.pl?biblionumber=7803; text not read',
      scholarly: true,
    },
    traditions: ['Kongo'],
    deities: [
      {
        name: 'Kalunga',
      },
      {
        name: 'Mbumba',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Fu-Kiau, Kimbwandende Kia Bunseki',
      title:
        'African Cosmology of the Bântu-Kôngo: Tying the Spiritual Knot, Principles of Life and Living',
      edition: '2nd ed.',
      publisher: 'Athelia Henrietta Press',
      published: '2001',
      note: 'Existence confirmed at https://openlibrary.org/books/OL8714034M/African_Cosmology_of_the_Bantu-Kongo (the record gives no place of publication); text not read',
    },
    traditions: ['Kongo'],
    deities: [
      {
        name: 'Nzambici',
      },
      {
        name: 'Kalunga',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Brown, Ras Michael',
      title: 'African-Atlantic Cultures and the South Carolina Lowcountry',
      series: 'Cambridge Studies on the American South',
      place: 'New York',
      publisher: 'Cambridge University Press',
      published: '2012',
      note: 'Existence confirmed in Gwendolyn Midlo Hall\'s review, _American Historical Review_ 119, no. 2 (2014): 530–31, https://academic.oup.com/ahr/article-abstract/119/2/530/44946; read through Wells, Alexis S. "Spirits of the Landscape Rediscovered: Ras Michael Brown\'s _African-Atlantic Cultures and the South Carolina Lowcountry_." _Southern Spaces_, August 26, 2013. https://southernspaces.org/2013/spirits-landscape-rediscovered-ras-michael-browns-african-atlantic-cultures-and-south-carolina-lowcountry/',
      scholarly: true,
    },
    traditions: ['Kongo'],
    deities: [
      {
        name: 'Nzambici',
      },
      {
        name: 'Simbi',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Kongo religion',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Kongo_religion',
      modified: '2024-12-19',
      accessed: '2026-10-06',
    },
    traditions: ['Kongo'],
    deities: [
      {
        name: 'Nzambici',
      },
      {
        name: 'Mbumba',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nzambi Ampungu',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nzambi_Ampungu',
      modified: '2026-08-26',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nzambi Mpungu',
      },
      {
        name: 'Mbumba',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Palo (religion)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Palo_(religion)',
      modified: '2024-12-13',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nzambi Mpungu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nzambici',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nzambici',
      modified: '2026-08-16',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nzambici',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Dennett, R. E.',
      title: "At the Back of the Black Man's Mind; or, Notes on the Kingly Office in West Africa",
      place: 'London',
      publisher: 'Macmillan',
      published: '1906',
      host: 'Internet Archive',
      url: 'https://archive.org/details/atbackofblackman00denn',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nzambici',
        locator: 'chap. XVI, p. 167',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Wells, Alexis S.',
      title:
        "Spirits of the Landscape Rediscovered: Ras Michael Brown's _African-Atlantic Cultures and the South Carolina Lowcountry_",
      container: 'Southern Spaces',
      published: 'August 26, 2013',
      url: 'https://southernspaces.org/2013/spirits-landscape-rediscovered-ras-michael-browns-african-atlantic-cultures-and-south-carolina-lowcountry/',
    },
    deities: [
      {
        name: 'Simbi',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Simbi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Simbi',
      modified: '2026-09-01',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Simbi',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Kalûnga Line',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Kalunga_Line',
      modified: '2026-08-31',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Kalunga',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Preston-Whyte, Eleanor M.',
      title: 'Zulu Religion',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/zulu-religion',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Zulu'],
    deities: [
      {
        name: 'Umvelinqangi',
      },
      {
        name: 'Nomkhubulwane',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Thayer, James S.',
      title: 'Unkulunkulu',
      container: '_Encyclopedia of Religion_',
      edition: '2nd ed.',
      contributors: 'Edited by Lindsay Jones',
      place: 'Detroit',
      publisher: 'Macmillan Reference USA',
      published: '2005',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/unkulunkulu',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 2004017052',
      scholarly: true,
    },
    traditions: ['Zulu'],
    deities: [
      {
        name: 'Unkulunkulu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'umvelinqangi',
      container: '_Dictionary of South African English_',
      url: 'https://dsae.co.za/entry/umvelinqangi/e07507',
      accessed: '2026-10-06',
    },
    traditions: ['Zulu'],
    deities: [
      {
        name: 'Umvelinqangi',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'mamlambo',
      container: '_Dictionary of South African English_',
      url: 'https://dsae.co.za/entry/mamlambo/e04522',
      accessed: '2026-10-06',
    },
    traditions: ['Zulu'],
    deities: [
      {
        name: 'Mamlambo',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Callaway, Henry',
      title: 'The Religious System of the Amazulu',
      place: 'Springvale, Natal',
      publisher: 'J. A. Blair',
      published: '1870',
      note: 'Existence confirmed at https://openlibrary.org/books/OL7150829M/The_religious_system_of_the_Amazulu and https://archive.org/details/ReligiousSystemOfTheAmazulu; text not read (see Notes)',
    },
    traditions: ['Zulu'],
    deities: [
      {
        name: 'Unkulunkulu',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Berglund, Axel-Ivar',
      title: 'Zulu Thought-Patterns and Symbolism',
      series: 'Studia Missionalia Upsaliensia 22',
      place: 'London',
      publisher: 'C. Hurst',
      published: '1976',
      note: 'Reprint, Bloomington: Indiana University Press, 1989. Existence confirmed at https://openlibrary.org/books/OL4588743M/Zulu_thought-patterns_and_symbolism and https://iupress.org/9780253212054/zulu-thought-patterns-and-symbolism/; text not read (see Notes)',
    },
    traditions: ['Zulu'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Zulu traditional religion',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Zulu_traditional_religion',
      modified: '2026-10-04',
      accessed: '2026-10-06',
    },
    traditions: ['Zulu'],
    deities: [
      {
        name: 'Umvelinqangi',
      },
      {
        name: 'Nomkhubulwane',
      },
      {
        name: 'Mamlambo',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Unkulunkulu',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Unkulunkulu',
      modified: '2026-08-26',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Unkulunkulu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'The Religious System of the Amazulu',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/The_Religious_System_of_the_Amazulu',
      modified: '2026-03-25',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Unkulunkulu',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Inkosazana',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Inkosazana',
      modified: '2026-08-16',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nomkhubulwane',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Adeyemi, Sola',
      title:
        'Performing Myths, Ritualising Modernity: Dancing for Nomkhubulwana and the Reinvention of Zulu Tradition',
      container:
        'A Gazelle of the Savannah: Sunday Ododo and the Framing of Techno-Cultural Performance in Nigeria',
      contributors: 'edited by Osakue S. Omoera, Sola Adeyemi, and Benedict Binebai',
      place: 'Rochester, UK',
      publisher: 'Alpha Crownes',
      published: '2012',
      pages: '435–45',
      note: 'Record at https://gala.gre.ac.uk/10255/',
    },
    deities: [
      {
        name: 'Nomkhubulwane',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Nomkhubulwane Zulu Goddess of Rain',
      container: '_Ulwazi Programme_',
      url: 'https://www.ulwaziprogramme.org/nomkhubulwane-zulu-goddess-of-rain/',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Nomkhubulwane',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Mamlambo',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Mamlambo',
      modified: '2025-04-25',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Mamlambo',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Florida State College at Jacksonville',
      title: 'What Is Vodou?',
      container: 'World Religions',
      publisher: 'Lumen Learning / Pressbooks, hosted by the University of Nevada, Reno',
      url: 'https://unr.pressbooks.pub/worldreligions/chapter/what-is-vodou/',
      accessed: '2026-10-06',
      note: 'CC BY 4.0',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Papa Legba',
      },
      {
        name: 'Damballah',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Florida State College at Jacksonville',
      title: 'Death, Dying, and the Soul in Haitian Vodou',
      container: 'World Religions',
      publisher: 'Lumen Learning / Pressbooks, hosted by the University of Nevada, Reno',
      url: 'https://unr.pressbooks.pub/worldreligions/chapter/death-dying-and-the-soul-in-haitian-vodou/',
      accessed: '2026-10-06',
      note: 'CC BY 4.0',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Maman Brigitte',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Nwokocha, Eziaku Atuama',
      title: 'An Equilibrist Vodou Goddess',
      container: 'Harvard Divinity Bulletin',
      published: 'Summer/Autumn 2013',
      url: 'https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Erzulie',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Fowler Museum at UCLA',
      title: "Curator's Choice: A Vodou Drapo for Papa Gede",
      url: 'https://fowler.ucla.edu/curators-choice-a-vodou-drapo-for-papa-gede/',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Baron Samedi',
      },
      {
        name: 'Maman Brigitte',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Fowler Museum at UCLA',
      title: 'In Extremis: Death and Life in 21st-Century Haitian Art',
      url: 'https://fowler.ucla.edu/exhibitions/in-extremis-death-and-life-in-21st%E2%80%90century-haitian-art/',
      accessed: '2026-10-06',
      note: 'Exhibition, September 16, 2012–January 20, 2013',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Baron Samedi',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      authors: 'Michel, Claudine',
      title: 'Vodun (Voodoo)',
      container: '_Contemporary American Religion_',
      contributors: 'Edited by Wade Clark Roof',
      place: 'New York',
      publisher: 'Macmillan Reference USA',
      published: '2000',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/religion/legal-and-political-magazines/vodun-voodoo',
      accessed: '2026-10-06',
      note: 'Print details from the Library of Congress catalogue record, LCCN 99046712',
      scholarly: true,
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Papa Legba',
      },
      {
        name: 'Damballah',
      },
      {
        name: 'Erzulie',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Long, Carolyn Morrow',
      title: 'Voudou',
      container: '_64 Parishes_',
      publisher: 'Louisiana Endowment for the Humanities',
      published: 'October 31, 2016',
      url: 'https://64parishes.org/entry/voudou',
      modified: '2021-02-09',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Deren, Maya',
      title: 'Divine Horsemen: The Living Gods of Haiti',
      place: 'London',
      publisher: 'Thames and Hudson',
      published: '1953',
      note: 'Reprint, New Paltz, NY: McPherson, 1983. Confirmed through McPherson & Company, https://www.mcphersonco.com/store/p45/Divine_Horsemen_The_Living_Gods_of_Haiti_by_Maya_Deren.html, and Open Library, https://openlibrary.org/books/OL3173920M/Divine_horsemen',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Damballah',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Desmangles, Leslie G.',
      title: 'The Faces of the Gods: Vodou and Roman Catholicism in Haiti',
      place: 'Chapel Hill',
      publisher: 'University of North Carolina Press',
      published: '1992',
      note: 'Confirmed through Open Library, https://openlibrary.org/works/OL4321480W',
      scholarly: true,
    },
    traditions: ['Haitian Vodou'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Cosentino, Donald J., ed.',
      title: 'Sacred Arts of Haitian Vodou',
      place: 'Los Angeles',
      publisher: 'UCLA Fowler Museum of Cultural History',
      published: '1995',
      note: 'Confirmed through Open Library, https://openlibrary.org/books/OL792534M/Sacred_arts_of_Haitian_vodou',
      scholarly: true,
    },
    traditions: ['Haitian Vodou'],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Noonan, Kerry',
      title: 'Gran Brijit: Haitian Vodou Guardian of the Cemetery',
      container: 'Goddesses in World Culture',
      contributors: 'edited by Patricia Monaghan',
      place: 'Santa Barbara, CA',
      publisher: 'Praeger',
      published: '2010',
      note: "The set confirmed through Open Library, https://openlibrary.org/works/OL35706227W; the chapter's volume and pages were not verified, see Notes",
      scholarly: true,
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Maman Brigitte',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Damballa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Damballa',
      modified: '2026-09-15',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Damballah',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Baron Samedi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Baron_Samedi',
      modified: '2026-09-25',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Baron Samedi',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Maman Brigitte',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Maman_Brigitte',
      modified: '2026-08-18',
      accessed: '2026-10-06',
    },
    traditions: ['Haitian Vodou'],
    deities: [
      {
        name: 'Maman Brigitte',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Olivier, Guilhem',
      title: 'The Gods of the Mexica (2)',
      container: 'Mexicolore',
      published: 'August 28, 2011',
      url: 'https://www.mexicolore.co.uk/aztecs/gods/gods-of-the-mexica-2/1000',
      accessed: '2026-10-06',
      note: 'Tláloc, "god of rain and lightning"; Chalchiuhtlicue, "\'She with the jade skirt\' – goddess of rivers and births"; Quetzalcoátl, creator god; Xochipilli, "\'Prince of flowers\' – god of flowers, nobles, music"; Xochiquétzal, "\'Quetzal-flower\' – mother goddess, patroness of weavers."',
    },
    traditions: ['Aztec'],
    deities: [
      {
        name: 'Xochipilli',
      },
      {
        name: 'Chalchiuhtlicue',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Hernández, Christine, and Gabrielle Vail',
      title: 'A Comparison of Aztec/Central Mexican and Maya Deities (1)',
      container: 'Mexicolore',
      published: 'October 6, 2022',
      url: 'https://www.mexicolore.co.uk/maya/teachers/resource-comparison-of-aztec-central-mexican-and-maya-deities-1',
      accessed: '2026-10-06',
      note: 'Tlaloc "lord of the rains, storms, and weather"; Chalchiuhtlicue "goddess of all bodies of water"; Xochiquetzal "Xochipilli\'s consort," flower goddess; Ixchel written "Chak Chel": weaving, healing, childbirth',
    },
    traditions: ['Aztec', 'Maya'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Tlaloc',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Tlaloc/',
      modified: '2022-09-26',
      accessed: '2026-10-06',
    },
    traditions: ['Aztec'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Quetzalcóatl',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Quetzalcoatl/',
      modified: '2023-03-29',
      accessed: '2026-10-06',
      note: 'Wind, learning, creation, "identified with the Morning Star Venus"; "known as Kukulkán to the Maya."',
    },
    traditions: ['Aztec'],
    deities: [
      {
        name: 'Quetzalcoatl',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Miller, Mary, and Karl Taube',
      title:
        'The Gods and Symbols of Ancient Mexico and the Maya: An Illustrated Dictionary of Mesoamerican Religion',
      place: 'London',
      publisher: 'Thames and Hudson',
      published: '1993',
      note: "Existence confirmed through the Cambridge Core record of Bruce Welsh's review, _Latin American Antiquity_ 5, no. 2 (1994): 185, and Google Books, ISBN 0500050686",
    },
    traditions: ['Aztec', 'Maya'],
    deities: [
      {
        name: 'Ixchel',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mursell, Ian',
      title: "The Aztecs' Use of Hallucinogenic Drugs",
      container: 'Mexicolore',
      published: 'December 7, 2023',
      url: 'https://www.mexicolore.co.uk/aztecs/aztec-life/hallucinogens',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Xochipilli',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Chalchiuhtlicue',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Chalchiuhtlicue',
      modified: '2026-09-14',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Chalchiuhtlicue',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Chalchiuhtlicue',
      container: 'World History Encyclopedia',
      published: 'November 6, 2025',
      url: 'https://www.worldhistory.org/image/21257/chalchiuhtlicue/',
      accessed: '2026-10-06',
      note: 'Image caption, uploaded by Jordy Samuels',
    },
    deities: [
      {
        name: 'Chalchiuhtlicue',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mark, Joshua J.',
      title: 'The Mayan Pantheon: The Many Gods of the Maya',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/article/415/the-mayan-pantheon-the-many-gods-of-the-maya/',
      modified: '2024-03-04',
      accessed: '2026-10-06',
      note: 'Ixchel: childbirth, medicine, the moon, weaving; Kukulcan is Quetzalcoatl',
    },
    traditions: ['Maya'],
    deities: [
      {
        name: 'Quetzalcoatl',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ixchel',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ixchel',
      modified: '2026-09-01',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Ixchel',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Mursell, Ian',
      title: 'What Was the Ancient Maya Symbol for the Moon?',
      container: 'Mexicolore',
      published: 'n.d.',
      url: 'https://www.mexicolore.co.uk/aztecs/ask-us/what-was-the-maya-moon-symbol',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Ixchel',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Inti',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Inti/',
      modified: '2025-02-21',
      accessed: '2026-10-06',
      note: 'Sun god and patron of empire; rulers from Manco Capac claimed descent; Inti Raymi at the June solstice, revived at Cuzco',
    },
    traditions: ['Inca'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Cartwright, Mark',
      title: 'Inca Religion',
      container: 'World History Encyclopedia',
      url: 'https://www.worldhistory.org/Inca_Religion/',
      modified: '2026-10-05',
      accessed: '2026-10-06',
      note: 'Inti "the god of the Sun"; Pachamama "the earth goddess," with field altars for the harvest',
    },
    traditions: ['Inca'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Turpo, Rufino, as told to Roger Valencia',
      title: 'An Offering to the Pachamama',
      container: 'Smithsonian Folklife Festival Blog',
      published: 'June 8, 2015',
      url: 'https://festival.si.edu/blog/2015/an-offering-to-pachamama/',
      accessed: '2026-10-06',
    },
    traditions: ['Inca'],
    deities: [
      {
        name: 'Pachamama',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Beckwith, Martha',
      title: 'Hawaiian Mythology',
      place: 'Honolulu',
      publisher: 'University of Hawaii Press',
      published: '1970',
      note: 'First published 1940 by Yale University Press. Record confirmed at Ulukau, https://www.ulukau.org/ulukau-books/?a=d&d=EBOOK-BECKWIT1&l=en, and the Internet Archive; chapters "The God Lono," "The Kane Worship," "The Pele Myth," "The Pele Sisters," "Pele Legends," "Hina Myths" from the table of contents at https://books.google.com/books/about/Hawaiian_Mythology.html?id=BqElGaH4DiIC; text read in the 1940 scan at https://archive.org/details/hawaiianmytholog00beck_0',
      scholarly: true,
    },
    traditions: ['Hawaiian'],
    deities: [
      {
        name: 'Hina',
        locator: 'chap. "Hina Myths," p. 214',
      },
      {
        name: 'Kane',
        locator: 'chap. "The Kane Worship"',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Dizon, Puaokamele, and Annemarie Paikai',
      title: 'Akua Vocabulary List',
      container: 'Kahoʻiwai: Reclaiming Hawaiian Knowledge Sovereignty',
      publisher: 'University of Hawaiʻi',
      url: 'https://www.hawaii.edu/kawaihapai/akua-list/',
      accessed: '2026-10-06',
      note: 'Entries fetched: "Hina" (/hina/), "Kāne" (/kane/), "Laka" (/laka/), "Lono" (/lono/), "Pelehonuamea" (/pelehonuamea/). Hina: "the moon is her bodily form," kapa making, female energies; Kāne: freshwater streams, pools and the life-giving waters, taro, ʻawa; Laka: "the akua of hula, maile lei making, ʻieʻie weaving, and healing"; Lono: agriculture, rain clouds, thunder, rain, rainbows, "Makahiki is a ceremony for Lono"; Pele: volcanic phenomena, "usually resides at Halemaʻumaʻu at Kīlauea."',
    },
    traditions: ['Hawaiian'],
    deities: [
      {
        name: 'Hina',
        locator: 'under "Hina"',
      },
      {
        name: 'Kane',
        locator: 'under "Kāne"',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Nimmo, H. Arlo',
      title: 'The Cult of Pele in Traditional Hawaiʻi',
      container: 'Bishop Museum Occasional Papers',
      volume: '30',
      published: '1990',
      pages: '41–87',
      url: 'https://hbs.bishopmuseum.org/pubs-online/pdf/op30p41.pdf',
      note: 'Listed in the series index at https://hbs.bishopmuseum.org/pubs-online/bmop.html. "Pele, volcano goddess of Hawaiʻi"; Lono "associated with agriculture, rain, and peace ... the central god in the Makahiki harvest festival"; Kane "the god of procreation"; Ku and Hina the male-female godhead',
      scholarly: true,
    },
    traditions: ['Hawaiian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Kāne',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/K%C4%81ne',
      modified: '2026-09-16',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Kane',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Hutton, Ronald',
      title: 'The Triumph of the Moon: A History of Modern Pagan Witchcraft',
      place: 'Oxford',
      publisher: 'Oxford University Press',
      published: '1999',
      note: "Confirmed through the Cambridge Core record of Alec Ryrie's review, _Journal of Ecclesiastical History_ 53, no. 2 (2002), and the Internet Archive, https://archive.org/details/triumphofmoonhis00hutt",
      scholarly: true,
    },
    traditions: ['Wicca', 'English folklore', 'Italian folk witchcraft'],
    deities: [
      {
        name: 'Horned God',
      },
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Malta-Król, Joanna',
      title: 'The Horned God: Divine Male Principle in British Traditional Wicca',
      container: "Manifestations of Male Image in the World's Cultures",
      contributors: 'edited by Renata Iwicka',
      place: 'Kraków',
      publisher: 'Jagiellonian University Press',
      published: '2021',
      pages: '157–78',
      note: 'Record at https://www.cambridge.org/core/books/abs/manifestations-of-male-image-in-the-worlds-cultures/horned-god-divine-male-principle-in-british-traditional-wicca/06791E7F8D0F4385DE388972509A5D3C',
      scholarly: true,
    },
    traditions: ['Wicca'],
    deities: [
      {
        name: 'Horned God',
      },
      {
        name: 'Green Man',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Raglan, Lady',
      title: "The 'Green Man' in Church Architecture",
      container: 'Folklore',
      volume: '50',
      issue: '1',
      published: '1939',
      pages: '45–57',
      url: 'https://doi.org/10.1080/0015587X.1939.9718148',
      note: 'Verified through its Crossref record',
      scholarly: true,
    },
    traditions: ['English folklore'],
    deities: [
      {
        name: 'Green Man',
      },
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'Shakespeare, William',
      title: 'The Merry Wives of Windsor',
      contributors:
        'Edited by Barbara A. Mowat and Paul Werstine, with Michael Poston and Rebecca Niles',
      publisher: 'Folger Shakespeare Library',
      published: '2015',
      url: 'https://www.folger.edu/explore/shakespeares-works/the-merry-wives-of-windsor/read/4/4/',
      accessed: '2026-10-06',
    },
    traditions: ['English folklore'],
    deities: [
      {
        name: 'Herne',
        locator: 'act 4, scene 4',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Centerwall, Brandon S.',
      title: 'The Name of the Green Man',
      container: 'Folklore',
      volume: '108',
      issue: '1–2',
      published: '1997',
      pages: '25–33',
      url: 'https://doi.org/10.1080/0015587X.1997.9715933',
      scholarly: true,
    },
    deities: [
      {
        name: 'Green Man',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Herne the Hunter',
      container: '_Encyclopaedia Britannica_',
      edition: '11th ed.',
      published: '1911',
      host: 'Wikisource',
      url: 'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Herne_the_Hunter',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Herne',
        locator: 'vol. 13',
      },
    ],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Herne the Hunter',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Herne_the_Hunter',
      modified: '2026-10-05',
      accessed: '2026-10-06',
    },
    deities: [
      {
        name: 'Herne',
      },
    ],
  },
  {
    reference: {
      kind: 'article',
      authors: 'Magliocco, Sabina',
      title: 'Who Was Aradia? The History and Development of a Legend',
      container: 'The Pomegranate',
      volume: '18',
      published: '2002',
      pages: '5–22',
      url: 'https://doi.org/10.1558/pome.v13i10.5',
      note: 'Verified through its Crossref record',
      scholarly: true,
    },
    traditions: ['Italian folk witchcraft'],
    deities: [
      {
        name: 'Aradia',
      },
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'yronwode, catherine',
      title: 'Planetary Rulerships of Herbs, Flowers, and Roots',
      container: 'Lucky Mojo Curio Company',
      url: 'https://www.luckymojo.com/planetaryrulers.html',
      accessed: '2026-10-06',
    },
    celestialBodies: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
    zodiacSigns: [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'Kenney, Matthew',
      title: 'The Planetary Rulerships of Plants',
      container: 'Ancient Astrology',
      published: 'March 3, 2019',
      url: 'https://www.ancientastrology.com/articles-/the-planetary-rulership-of-plants',
      accessed: '2026-10-06',
    },
    celestialBodies: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Planetary Correspondences of Pluto',
      container: 'Alchemy Works',
      url: 'https://www.alchemy-works.com/planets_pluto.html',
      accessed: '2026-10-06',
    },
    celestialBodies: ['Pluto'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'The Astrology of Herbs',
      container: 'Anima Mundi Herbals',
      published: 'September 29, 2022',
      url: 'https://animamundiherbals.com/blogs/blog/the-astrology-of-herbs',
      accessed: '2026-10-06',
    },
    celestialBodies: [
      'Sun',
      'Moon',
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Pluto',
    ],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Herbs of the Solar System',
      container: 'Mystical Magical Herbs',
      published: 'October 26, 2013',
      url: 'https://mysticalmagicalherbs.com/2013/10/26/herbs-of-the-solar-system/',
      accessed: '2026-10-06',
    },
    celestialBodies: [
      'Sun',
      'Moon',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Pluto',
    ],
  },
  {
    reference: {
      kind: 'book',
      authors: 'George, Demetra',
      title:
        'Asteroid Goddesses: The Mythology, Psychology, and Astrology of the Re-Emerging Feminine',
      publisher: 'ACS Publications',
      published: '1986',
      note: "Confirmed through Open Library, https://openlibrary.org/books/OL8339254M, and read through a reader's highlights on Goodreads, https://www.goodreads.com/notes/20698760-asteroid-goddesses/7429292-erik",
    },
    celestialBodies: ['Ceres', 'Pallas', 'Juno', 'Vesta'],
  },
  {
    reference: {
      kind: 'web_page',
      authors: 'johngumbs',
      title: 'Reading Astrological Charts: Ceres, Pallas Athene, Vesta, Juno and Lilith',
      container: 'Booksie',
      published: 'January 20, 2020',
      url: 'https://www.booksie.com/509359-reading-astrological-charts-chapter-36',
      accessed: '2026-10-06',
    },
    celestialBodies: ['Ceres', 'Pallas', 'Juno', 'Vesta', 'Lilith'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Arará',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Arar%C3%A1&oldid=1317924544',
      modified: '2025-10-20',
      accessed: '2026-10-29',
    },
    traditions: ['Arara'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Winti',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Winti&oldid=1373474757',
      modified: '2026-09-06',
      accessed: '2026-10-29',
    },
    traditions: ['Winti'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Bwiti',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bwiti&oldid=1363918198',
      modified: '2026-07-13',
      accessed: '2026-10-29',
    },
    traditions: ['Bwiti'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Buddhism',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Buddhism&oldid=1381999574',
      modified: '2026-10-26',
      accessed: '2026-10-29',
    },
    traditions: ['Buddhist'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Jainism',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Jainism&oldid=1379809603',
      modified: '2026-10-12',
      accessed: '2026-10-29',
    },
    traditions: ['Jain'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Theravada',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Theravada&oldid=1381859205',
      modified: '2026-10-25',
      accessed: '2026-10-29',
    },
    traditions: ['Theravada Buddhist'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Shugendō',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Shugend%C5%8D&oldid=1380885211',
      modified: '2026-10-18',
      accessed: '2026-10-29',
    },
    traditions: ['Shugendo'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tripuri people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tripuri_people&oldid=1381882281',
      modified: '2026-10-25',
      accessed: '2026-10-29',
    },
    traditions: ['Tripuri'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Aboriginal Australians',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aboriginal_Australians&oldid=1381366397',
      modified: '2026-10-21',
      accessed: '2026-10-29',
    },
    traditions: ['Aboriginal Australian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Māori people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=M%C4%81ori_people&oldid=1378825744',
      modified: '2026-10-06',
      accessed: '2026-10-29',
    },
    traditions: ['Maori'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Polynesians',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Polynesians&oldid=1381804636',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    traditions: ['Polynesian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Melanesians',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Melanesians&oldid=1377930515',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Melanesian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Malays (ethnic group)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Malays_(ethnic_group)&oldid=1380977461',
      modified: '2026-10-19',
      accessed: '2026-10-29',
    },
    traditions: ['Malay'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Javanese people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Javanese_people&oldid=1382296008',
      modified: '2026-10-27',
      accessed: '2026-10-29',
    },
    traditions: ['Javanese'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Sundanese people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sundanese_people&oldid=1377925136',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Sundanese'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tongans',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tongans&oldid=1375147569',
      modified: '2026-09-16',
      accessed: '2026-10-29',
    },
    traditions: ['Tongan'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Samoans',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Samoans&oldid=1376083534',
      modified: '2026-09-21',
      accessed: '2026-10-29',
    },
    traditions: ['Samoan'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Fijians',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fijians&oldid=1377929601',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Fijian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Mazatec',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Mazatec&oldid=1377291554',
      modified: '2026-09-28',
      accessed: '2026-10-29',
    },
    traditions: ['Mazatec'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Chumash people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chumash_people&oldid=1377112604',
      modified: '2026-09-27',
      accessed: '2026-10-29',
    },
    traditions: ['Chumash'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Moche culture',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Moche_culture&oldid=1380295875',
      modified: '2026-10-14',
      accessed: '2026-10-29',
    },
    traditions: ['Moche'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nazca culture',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Nazca_culture&oldid=1376028463',
      modified: '2026-09-21',
      accessed: '2026-10-29',
    },
    traditions: ['Nazca'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Chavín culture',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chav%C3%ADn_culture&oldid=1365963586',
      modified: '2026-07-25',
      accessed: '2026-10-29',
    },
    traditions: ['Chavin'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Olmecs',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Olmecs&oldid=1374556317',
      modified: '2026-09-12',
      accessed: '2026-10-29',
    },
    traditions: ['Olmec'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tongva',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tongva&oldid=1381484719',
      modified: '2026-10-22',
      accessed: '2026-10-29',
    },
    traditions: ['Tongva'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Taíno',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ta%C3%ADno&oldid=1379961989',
      modified: '2026-10-12',
      accessed: '2026-10-29',
    },
    traditions: ['Taino'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Quechua people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Quechua_people&oldid=1381294213',
      modified: '2026-10-21',
      accessed: '2026-10-29',
    },
    traditions: ['Quechua'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ojibwe',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ojibwe&oldid=1377952351',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Ojibwe'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Potawatomi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Potawatomi&oldid=1376657238',
      modified: '2026-09-25',
      accessed: '2026-10-29',
    },
    traditions: ['Potawatomi'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Menominee',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Menominee&oldid=1378480345',
      modified: '2026-10-04',
      accessed: '2026-10-29',
    },
    traditions: ['Menominee'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Dakota people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Dakota_people&oldid=1377114585',
      modified: '2026-09-27',
      accessed: '2026-10-29',
    },
    traditions: ['Dakota'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Lakota people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lakota_people&oldid=1382082825',
      modified: '2026-10-26',
      accessed: '2026-10-29',
    },
    traditions: ['Lakota'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Blackfoot Confederacy',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Blackfoot_Confederacy&oldid=1377940194',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Blackfeet'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Zuni people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Zuni_people&oldid=1381407565',
      modified: '2026-10-22',
      accessed: '2026-10-29',
    },
    traditions: ['Zuni'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Hopi',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hopi&oldid=1382604614',
      modified: '2026-10-29',
      accessed: '2026-10-29',
    },
    traditions: ['Hopi'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Cherokee',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cherokee&oldid=1381355468',
      modified: '2026-10-21',
      accessed: '2026-10-29',
    },
    traditions: ['Cherokee'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Muscogee',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Muscogee&oldid=1381004656',
      modified: '2026-10-19',
      accessed: '2026-10-29',
    },
    traditions: ['Muscogee'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tlingit',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tlingit&oldid=1382136160',
      modified: '2026-10-26',
      accessed: '2026-10-29',
    },
    traditions: ['Tlingit'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tsimshian',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tsimshian&oldid=1381234792',
      modified: '2026-10-20',
      accessed: '2026-10-29',
    },
    traditions: ['Tsimshian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Haida people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Haida_people&oldid=1379430690',
      modified: '2026-10-09',
      accessed: '2026-10-29',
    },
    traditions: ['Haida'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Inuit',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Inuit&oldid=1377934585',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Inuit'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Khoekhoe',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Khoekhoe&oldid=1381457914',
      modified: '2026-10-22',
      accessed: '2026-10-29',
    },
    traditions: ['Khoikhoi'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Malagasy peoples',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Malagasy_peoples&oldid=1382096995',
      modified: '2026-10-26',
      accessed: '2026-10-29',
    },
    traditions: ['Malagasy'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Swazi people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Swazi_people&oldid=1377931683',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Swazi'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Taita people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Taita_people&oldid=1382323422',
      modified: '2026-10-28',
      accessed: '2026-10-29',
    },
    traditions: ['Taita'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Maasai people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Maasai_people&oldid=1381150029',
      modified: '2026-10-20',
      accessed: '2026-10-29',
    },
    traditions: ['Maasai'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Sotho people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sotho_people&oldid=1381269975',
      modified: '2026-10-21',
      accessed: '2026-10-29',
    },
    traditions: ['Basotho'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tuareg people',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tuareg_people&oldid=1382635493',
      modified: '2026-10-29',
      accessed: '2026-10-29',
    },
    traditions: ['Tuareg'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Bedouin',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bedouin&oldid=1380556686',
      modified: '2026-10-16',
      accessed: '2026-10-29',
    },
    traditions: ['Bedouin'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Jews',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Jews&oldid=1382609807',
      modified: '2026-10-29',
      accessed: '2026-10-29',
    },
    traditions: ['Jewish'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Judaism',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Judaism&oldid=1382448162',
      modified: '2026-10-28',
      accessed: '2026-10-29',
    },
    traditions: ['Jewish'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Christianity',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Christianity&oldid=1382348243',
      modified: '2026-10-28',
      accessed: '2026-10-29',
    },
    traditions: ['Christian'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Gaels',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Gaels&oldid=1377933923',
      modified: '2026-10-02',
      accessed: '2026-10-29',
    },
    traditions: ['Scottish Gaelic'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Navajo',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Navajo&oldid=1382625452',
      modified: '2026-10-29',
      accessed: '2026-10-29',
    },
    traditions: ['Navajo'],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Achilles',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Achilles&oldid=1377070946',
      modified: '2026-09-27',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Achilles' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Amphitrite',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Amphitrite&oldid=1380072680',
      modified: '2026-10-13',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Amphitrite' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ariadne',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ariadne&oldid=1381802164',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Ariadne' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Eos',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Eos&oldid=1379347874',
      modified: '2026-10-09',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Eos' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Hebe (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hebe_(mythology)&oldid=1381443717',
      modified: '2026-10-22',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Hebe' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Leto',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Leto&oldid=1379319218',
      modified: '2026-10-09',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Leto' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nike (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Nike_(mythology)&oldid=1382489374',
      modified: '2026-10-28',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Nike' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nemesis',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Nemesis&oldid=1379894387',
      modified: '2026-10-12',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Nemesis' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Morpheus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Morpheus&oldid=1382405106',
      modified: '2026-10-28',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Morpheus' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Prometheus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Prometheus&oldid=1381775303',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Prometheus' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Uranus (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Uranus_(mythology)&oldid=1381772217',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Uranus' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Hymen (god)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hymen_(god)&oldid=1371611022',
      modified: '2026-08-27',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Hymen' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Daphne',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Daphne&oldid=1379196335',
      modified: '2026-10-08',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Daphne' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Medea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Medea&oldid=1377073088',
      modified: '2026-09-27',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Medea' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Moirai',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Moirai&oldid=1381762900',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Moirai' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Erinyes',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Erinyes&oldid=1381082118',
      modified: '2026-10-19',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Erinyes' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Charites',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Charites&oldid=1379193511',
      modified: '2026-10-08',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Charites' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Cronus',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cronus&oldid=1381845208',
      modified: '2026-10-25',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Cronus' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Eirene (goddess)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Eirene_(goddess)&oldid=1367827846',
      modified: '2026-08-05',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Eirene' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Hercules',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hercules&oldid=1381201460',
      modified: '2026-10-20',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Hercules' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Bellona (goddess)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bellona_(goddess)&oldid=1381936628',
      modified: '2026-10-25',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Bellona' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Bona Dea',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Bona_Dea&oldid=1374093521',
      modified: '2026-09-09',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Bona Dea' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Lares',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lares&oldid=1380792178',
      modified: '2026-10-17',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Lares' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Lucina (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lucina_(mythology)&oldid=1358917007',
      modified: '2026-06-11',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Lucina' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Luna (goddess)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Luna_(goddess)&oldid=1354733662',
      modified: '2026-05-18',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Luna' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Fides (deity)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Fides_(deity)&oldid=1364187641',
      modified: '2026-07-15',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Fides' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Aurora (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Aurora_(mythology)&oldid=1360043424',
      modified: '2026-06-18',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Aurora' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Atum',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Atum&oldid=1382414927',
      modified: '2026-10-28',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Atum' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Mut',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Mut&oldid=1381746411',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Mut' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Nefertem',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Nefertem&oldid=1359040097',
      modified: '2026-06-12',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Nefertem' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Wepwawet',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Wepwawet&oldid=1369926244',
      modified: '2026-08-18',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Wepwawet' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Harpocrates',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Harpocrates&oldid=1369373136',
      modified: '2026-08-14',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Harpocrates' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Brahma',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Brahma&oldid=1379835512',
      modified: '2026-10-12',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Brahma' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Indra',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Indra&oldid=1382177172',
      modified: '2026-10-27',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Indra' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Shakti',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Shakti&oldid=1382633201',
      modified: '2026-10-29',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Shakti' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Rama',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Rama&oldid=1381773089',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Rama' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Yama',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Yama&oldid=1375058267',
      modified: '2026-09-15',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Yama' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Varuna',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Varuna&oldid=1378105449',
      modified: '2026-10-03',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Varuna' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Dattatreya',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Dattatreya&oldid=1356721756',
      modified: '2026-05-29',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Dattatreya' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Rán',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=R%C3%A1n&oldid=1379599736',
      modified: '2026-10-10',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Ran' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ægir',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=%C3%86gir&oldid=1379986440',
      modified: '2026-10-13',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Aegir' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Norns',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Norns&oldid=1376309455',
      modified: '2026-09-23',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Norns' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Badb',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Badb&oldid=1358951917',
      modified: '2026-06-12',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Badb' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Banba',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Banba&oldid=1367535269',
      modified: '2026-08-03',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Banba' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Macha',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Macha&oldid=1358951759',
      modified: '2026-06-12',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Macha' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Cú Chulainn',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=C%C3%BA_Chulainn&oldid=1373713547',
      modified: '2026-09-07',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Cu Chulainn' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Lir',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Lir&oldid=1371043505',
      modified: '2026-08-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Lir' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Dôn',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=D%C3%B4n&oldid=1377825207',
      modified: '2026-10-01',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Don' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Modron',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Modron&oldid=1379042548',
      modified: '2026-10-07',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Modron' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Olwen',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Olwen&oldid=1382117820',
      modified: '2026-10-26',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Olwen' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Llŷr',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ll%C5%B7r&oldid=1377825184',
      modified: '2026-10-01',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Llyr' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Brigantia (goddess)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Brigantia_(goddess)&oldid=1363396512',
      modified: '2026-07-09',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Brigantia' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Coventina',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Coventina&oldid=1369410557',
      modified: '2026-08-14',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Coventina' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Centeōtl',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cente%C5%8Dtl&oldid=1355468639',
      modified: '2026-05-22',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Centeotl' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Chicomecōātl',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Chicomec%C5%8D%C4%81tl&oldid=1364484020',
      modified: '2026-07-16',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Chicomecoatl' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Huītzilōpōchtli',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Hu%C4%ABtzil%C5%8Dp%C5%8Dchtli&oldid=1377676028',
      modified: '2026-09-30',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Huitzilopochtli' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ixtlilton',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ixtlilton&oldid=1282154418',
      modified: '2025-03-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Ixtlilton' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Xiuhtecuhtli',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Xiuhtecuhtli&oldid=1331352674',
      modified: '2026-01-05',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Xiuhtecuhtli' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Yacatecuhtli',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Yacatecuhtli&oldid=1351000306',
      modified: '2026-04-25',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Yacatecuhtli' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'The Buddha',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=The_Buddha&oldid=1381286756',
      modified: '2026-10-21',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Buddha' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Yahweh',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Yahweh&oldid=1382119195',
      modified: '2026-10-26',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Yahweh' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Raphael (archangel)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Raphael_(archangel)&oldid=1374119218',
      modified: '2026-09-09',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Raphael' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Zoroaster',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Zoroaster&oldid=1381765092',
      modified: '2026-10-24',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Zoroaster' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Tiamat',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Tiamat&oldid=1379792563',
      modified: '2026-10-12',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Tiamat' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Belili',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Belili&oldid=1377619751',
      modified: '2026-09-30',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Belili' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Izanami',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Izanami&oldid=1380529673',
      modified: '2026-10-16',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Izanami' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Ek Chuah',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Ek_Chuah&oldid=1307860347',
      modified: '2025-08-26',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Ek Chuah' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Kanaloa',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Kanaloa&oldid=1370250022',
      modified: '2026-08-20',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Kanaloa' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Kanehekili',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Kanehekili&oldid=1366759315',
      modified: '2026-07-30',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Kanehekili' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Māui',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=M%C4%81ui&oldid=1380163481',
      modified: '2026-10-14',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Maui' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Puck (folklore)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Puck_(folklore)&oldid=1377834823',
      modified: '2026-10-01',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Puck' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Sedna (mythology)',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Sedna_(mythology)&oldid=1381219426',
      modified: '2026-10-20',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Sedna' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Cailleach',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Cailleach&oldid=1378141247',
      modified: '2026-10-03',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Cailleach' }],
  },
  {
    reference: {
      kind: 'entry',
      title: 'Seonaidh',
      container: 'Wikipedia',
      url: 'https://en.wikipedia.org/w/index.php?title=Seonaidh&oldid=1370081242',
      modified: '2026-08-19',
      accessed: '2026-10-29',
    },
    deities: [{ name: 'Seonaidh' }],
  },
];

/**
 * Seeds the references, then their links, in a transaction of its own, and returns the sources whose fields or `scholarly` mark a
 * person's edit kept. Writes go through the handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedSources(
  db: SeedDatabase,
  options: SeedRunOptions = {},
): Promise<VocabularySourceKept[]> {
  return beginSeedTransaction(db, seedVocabularySources, options);
}

/**
 * The same seed inside the caller's transaction, after the vocabularies it links. A reference is known by its `seed_key` (the citation
 * as rendered when seeded), so an edited one is never twinned; a target row by its own `seed_key`, so a renamed deity keeps its sources.
 * Nothing present is updated bar a source's fields and `scholarly` mark, which follow this list unless a person edited the row; that one
 * is kept and returned, named by its citation. Nothing soft-deleted is re-inserted. Assumes the GUC is published and the bootstrap user exists.
 */
export async function seedVocabularySources(tx: SeedTransaction): Promise<VocabularySourceKept[]> {
  const referenceIds = await insertMissingReferences(
    tx,
    SOURCES.map((source) => source.reference),
  );
  const targets = {
    traditions: await idsBySeedKey(tx, deityTraditions),
    deities: await idsBySeedKey(tx, deities),
    celestialBodies: await idsBySeedKey(tx, celestialBodies),
    zodiacSigns: await idsBySeedKey(tx, zodiacSigns),
  };

  const wanted = SOURCES.flatMap((source) => {
    const referenceId = referenceIds.get(citationText(source.reference));
    return referenceId ? linksOf(source, referenceId, targets) : [];
  });

  // A link's identity: its reference and the one row it supports.
  await insertMissingBy(tx, referenceLinks, wanted, {
    columns: ['referenceId', ...SOURCED_KEYS],
    toRow: (link) => link,
  });

  return restateWorks(
    tx,
    SOURCES.map(({ reference }) => [citationText(reference), reference] as const),
  );
}

/** A vocabulary's seeded rows by `seed_key`: the id, or `null` when soft-deleted. */
async function idsBySeedKey(
  tx: SeedTransaction,
  table: SourceTargetTable,
): Promise<Map<string, string | null>> {
  const rows = await tx
    .select({ id: table.id, seedKey: table.seedKey, deletedAt: table.deletedAt })
    .from(table)
    .where(isNotNull(table.seedKey));

  return new Map(rows.map((row) => [row.seedKey as string, row.deletedAt ? null : row.id]));
}

/**
 * A source's links: each tradition it names and every deity under it, then each deity named alone (whose locator replaces the
 * tradition's), and each body and sign. A soft-deleted target is skipped; one no seed wrote names a row that does not exist, and throws.
 */
function linksOf(
  {
    traditions = [],
    deities: named = [],
    celestialBodies: bodies = [],
    zodiacSigns: signs = [],
  }: SeedSource,
  referenceId: string,
  targets: Record<
    'traditions' | 'deities' | 'celestialBodies' | 'zodiacSigns',
    Map<string, string | null>
  >,
): SeedSourceLink[] {
  const target = (kind: keyof typeof targets, name: string) =>
    requireFrom(
      targets[kind],
      slugify(name),
      () => `A source names ${kind} "${name}", which no seed wrote.`,
    );

  const deityLocators = new Map<string, string | null>();
  for (const tradition of traditions) {
    for (const deity of DEITIES.filter((deity) => deity.tradition === tradition)) {
      deityLocators.set(deity.name, null);
    }
  }
  for (const { name, locator } of named) deityLocators.set(name, locator ?? null);

  const links: SeedSourceLink[] = [];
  const add = (column: keyof SeedSourceLink, id: string | null, locator: string | null = null) => {
    if (id !== null) links.push({ referenceId, [column]: id, locator });
  };

  for (const name of traditions) add('deityTraditionId', target('traditions', name));
  for (const [name, locator] of deityLocators) add('deityId', target('deities', name), locator);
  for (const name of bodies) add('celestialBodyId', target('celestialBodies', name));
  for (const name of signs) add('zodiacSignId', target('zodiacSigns', name));

  return links;
}
