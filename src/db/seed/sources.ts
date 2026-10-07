import { isNotNull, isNull } from 'drizzle-orm';
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { beginSeedTransaction, insertMissing, requireFrom } from './idempotent';
import { DEITIES } from './deities';
import { applyAudit } from '../audit';
import { citationText } from '../../lib/citation';
import { slugify } from '../../lib/slugify';
import { references } from '../../modules/ingredients/schema/references';
import { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import { deities, deityTraditions } from '../../modules/vocabulary/schema/deities';
import { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type {
  SeedDatabase,
  SeedSource,
  SeedSourceLink,
  SeedSourceLinkKey,
  SeedTransaction,
  SourceTargetTable,
} from './types';

// MB.156: the sources the vocabulary seed docs record, as compendium-tier
// `references` rows linked to the curated rows each supports. Reference data,
// not a scenario — migrate.yml seeds it after the vocabularies it links.
// Transcribed from the deity and astrology seed docs, which sources.test.ts
// parses and compares citation by citation through the one renderer; the
// docs, not this file, are where a source is argued
// (claude-docs/db/references.md, "How the seed reads the docs").

/**
 * Every source, in the docs' order: the five that chose which deities to
 * list (linked to nothing, the owner's call), each tradition's, each deity's,
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
    },
    traditions: ['Sumerian', 'Akkadian and Babylonian'],
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
    traditions: ['Sumerian', 'Akkadian and Babylonian'],
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
      kind: 'chapter',
      title: 'Lilith',
      container: 'Encyclopaedia Judaica',
      edition: '2nd ed.',
      published: '2007',
      host: 'Jewish Virtual Library',
      url: 'https://www.jewishvirtuallibrary.org/lilith',
      accessed: '2026-10-06',
    },
    traditions: ['Akkadian and Babylonian'],
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
    traditions: ['Canaanite and Phoenician'],
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
    traditions: ['Canaanite and Phoenician'],
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
    traditions: ['Canaanite and Phoenician'],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Pope, Marvin H.',
      title: 'Anath',
      container: 'Encyclopaedia Judaica',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath',
      accessed: '2026-10-06',
    },
    traditions: ['Canaanite and Phoenician'],
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
    },
    traditions: ['Norse', 'Anglo-Saxon and Continental Germanic'],
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
    },
    traditions: ['Anglo-Saxon and Continental Germanic'],
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
    traditions: ['Anglo-Saxon and Continental Germanic'],
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
    traditions: ['Anglo-Saxon and Continental Germanic'],
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
    traditions: ['Irish', 'Gaulish and British'],
  },
  {
    reference: {
      kind: 'book',
      authors: 'MacKillop, James',
      title: 'Dictionary of Celtic Mythology',
      place: 'Oxford',
      publisher: 'Oxford University Press',
      published: '1998',
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
    traditions: ['Gaulish and British'],
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
    traditions: ['Gaulish and British'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Roman Curse Tablets',
      container: 'Roman Baths, Bath & North East Somerset Council',
      url: 'https://www.romanbaths.co.uk/roman-curse-tablets',
      accessed: '2026-10-06',
    },
    traditions: ['Gaulish and British'],
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
      kind: 'chapter',
      authors: 'Gimbutas, Marija',
      title: 'Slavic Religion',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/slavic-religion',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Gimbutas, Marija',
      title: 'Perun',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/perun',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Gimbutas, Marija',
      title: 'Veles-Volos',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/veles-volos',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Biezais, Haralds, and Sigma Ankrava',
      title: 'Baltic Religion: An Overview',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/baltic-religion-overview',
      accessed: '2026-10-06',
    },
    traditions: ['Baltic'],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Kursīte, Janīna',
      title: 'Baltic Religion: History of Study',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/baltic-religion-history-study',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Siikala, Anna-Leena',
      title: 'Ukko',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/ukko',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Pentikäinen, Juha',
      title: 'Finnish Religions',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/finnish-religions',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Brereton, Joel P.',
      title: 'Soma',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/soma',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Findly, Ellison Banks',
      title: 'Agni',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/philosophy-and-religion/eastern-religions/hinduism/agni',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Lorenzen, David N.',
      title: 'Durgā: Hinduism',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/durga-hinduism',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Knipe, David M.',
      title: 'Agni',
      container: 'Encyclopedia of India',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/international/encyclopedias-almanacs-transcripts-and-maps/agni',
      accessed: '2026-10-06',
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
    },
    traditions: ['Japanese'],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Gilbert, Michelle',
      title: 'Akan Religion',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/akan-religion',
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
      kind: 'book',
      authors: 'Asante, Molefi Kete, and Ama Mazama, eds.',
      title: 'Encyclopedia of African Religion',
      volume: '2 vols.',
      place: 'Thousand Oaks, CA',
      publisher: 'SAGE Publications',
      published: '2009',
      note: 'Existence and the entries "Nyame" and "Asase Yaa" confirmed on the publisher\'s page, https://www.sagepub.com/en-us/nam/encyclopedia-of-african-religion/book228941, and the Open Library record; the entries themselves sit behind SAGE\'s sign-in and were not read',
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
      kind: 'chapter',
      authors: 'Arinze, Francis A., and Ogbu Kalu',
      title: 'Igbo Religion',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/igbo-religion',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Gilbert, Michelle',
      title: 'Fon and Ewe Religion',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/fon-and-ewe-religion',
      accessed: '2026-10-06',
    },
    traditions: ['Fon and Ewe'],
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
      kind: 'chapter',
      authors: 'Thayer, James S.',
      title: 'Mawu-Lisa',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/mawu-lisa',
      accessed: '2026-10-06',
    },
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
    },
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
    traditions: ['Fon and Ewe'],
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
      kind: 'chapter',
      authors: 'Janzen, John M.',
      title: 'Kongo Religion',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/kongo-religion',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Ogungbile, David',
      title: 'God: African Supreme Beings',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/god-african-supreme-beings',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Preston-Whyte, Eleanor M.',
      title: 'Zulu Religion',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/zulu-religion',
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
    ],
  },
  {
    reference: {
      kind: 'chapter',
      authors: 'Thayer, James S.',
      title: 'Unkulunkulu',
      container: 'Encyclopedia of Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/unkulunkulu',
      accessed: '2026-10-06',
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
      kind: 'chapter',
      authors: 'Michel, Claudine',
      title: 'Vodun (Voodoo)',
      container: 'Contemporary American Religion',
      host: 'Encyclopedia.com',
      url: 'https://www.encyclopedia.com/religion/legal-and-political-magazines/vodun-voodoo',
      accessed: '2026-10-06',
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
        locator: 's.v. "Hina"',
      },
      {
        name: 'Kane',
        locator: 's.v. "Kāne"',
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
    planets: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
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
    planets: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
  },
  {
    reference: {
      kind: 'web_page',
      title: 'Planetary Correspondences of Pluto',
      container: 'Alchemy Works',
      url: 'https://www.alchemy-works.com/planets_pluto.html',
      accessed: '2026-10-06',
    },
    planets: ['Pluto'],
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
    planets: [
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
    planets: [
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
    planets: ['Ceres', 'Pallas', 'Juno', 'Vesta'],
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
    planets: ['Ceres', 'Pallas', 'Juno', 'Vesta', 'Lilith'],
  },
];

/**
 * Seeds the references, then their links, in a transaction of its own. Writes
 * go through the handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedSources(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, seedVocabularySources);
}

/**
 * The same seed inside a transaction the caller opened, after the
 * vocabularies it links. A reference is known by its `seed_key`, the citation
 * rendered when the seed wrote it, so one an admin has since edited is still
 * its own and never twinned (MB.171); a target row by the `seed_key` its own
 * seed gave it, so a renamed deity keeps its sources. Nothing present is
 * updated, and nothing soft-deleted is re-inserted or linked anew. Assumes the
 * GUC is published and the bootstrap user exists.
 */
export async function seedVocabularySources(tx: SeedTransaction): Promise<void> {
  const referenceIds = await insertMissingReferences(tx);
  const targets = {
    traditions: await idsBySeedKey(tx, deityTraditions),
    deities: await idsBySeedKey(tx, deities),
    planets: await idsBySeedKey(tx, planets),
    zodiacSigns: await idsBySeedKey(tx, zodiacSigns),
  };

  const wanted = SOURCES.flatMap((source) => {
    const referenceId = referenceIds.get(citationText(source.reference));
    return referenceId ? linksOf(source, referenceId, targets) : [];
  });

  await insertMissing(tx, referenceLinks, wanted, {
    existing: async (tx) => (await tx.select().from(referenceLinks)).map(linkKey),
    keyOf: linkKey,
    toRow: (link) => link,
  });
}

/**
 * Every source's id by its citation, inserting the missing ones. A row the
 * seed wrote answers by its key, live or not — `null` when soft-deleted, so
 * it is neither re-inserted nor linked anew. A live compendium row nobody
 * seeded, whose citation is the source's to the letter, is linked rather than
 * duplicated, and never written to.
 */
async function insertMissingReferences(tx: SeedTransaction): Promise<Map<string, string | null>> {
  const compendium = await tx.select().from(references).where(isNull(references.workspaceId));
  const ids = new Map<string, string | null>();

  for (const row of compendium) {
    if (row.seedKey !== null) ids.set(row.seedKey, row.deletedAt === null ? row.id : null);
  }
  for (const row of compendium) {
    const citation = citationText(row);
    if (row.seedKey === null && row.deletedAt === null && !ids.has(citation)) {
      ids.set(citation, row.id);
    }
  }

  const missing = SOURCES.filter((source) => !ids.has(citationText(source.reference)));
  if (missing.length > 0) {
    const inserted = await tx
      .insert(references)
      .values(
        missing.map(({ reference }) =>
          applyAudit(
            'insert',
            { ...reference, workspaceId: null, seedKey: citationText(reference) },
            BOOTSTRAP_SESSION,
          ),
        ),
      )
      .returning({ id: references.id, seedKey: references.seedKey });

    for (const row of inserted) ids.set(row.seedKey as string, row.id);
  }

  return ids;
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
 * A source's links: each tradition it names and every deity filed under it,
 * then each deity it names alone, whose locator replaces the tradition's
 * none — `(deity, reference)` is one live link — and each body and sign. A
 * soft-deleted target is skipped; one no seed wrote is a literal naming a row
 * that does not exist, and throws.
 */
function linksOf(
  {
    traditions = [],
    deities: named = [],
    planets: bodies = [],
    zodiacSigns: signs = [],
  }: SeedSource,
  referenceId: string,
  targets: Record<'traditions' | 'deities' | 'planets' | 'zodiacSigns', Map<string, string | null>>,
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
  for (const name of bodies) add('planetId', target('planets', name));
  for (const name of signs) add('zodiacSignId', target('zodiacSigns', name));

  return links;
}

/** A link's identity: its reference and the one row it supports. */
function linkKey(link: SeedSourceLinkKey): string {
  return [
    link.referenceId,
    link.deityTraditionId ?? '',
    link.deityId ?? '',
    link.planetId ?? '',
    link.zodiacSignId ?? '',
  ].join('|');
}
