import type { CitationFields } from '../../../lib/types';

// The works more than one shard cites, declared once so every shard renders
// the same citation and the seed writes one `references` row for each. Each
// is the edition in the owner's library, as its own title and copyright pages
// give it (claude-docs/db/compendium-seed/README.md, "The library"); a shard's
// per-entry pages (a Wikipedia revision, a web page) are its own `SOURCES`.
// A shard names a work here by its handle.
export const WORKS = {
  'cunningham-herbs': {
    kind: 'book',
    authors: 'Cunningham, Scott',
    title: "Cunningham's Encyclopedia of Magical Herbs",
    edition: '2nd ed.',
    place: 'Woodbury, MN',
    publisher: 'Llewellyn Publications',
    published: '2012',
    note: 'EPUB',
  },
  'cunningham-crystals': {
    kind: 'book',
    authors: 'Cunningham, Scott',
    title: "Cunningham's Encyclopedia of Crystal, Gem & Metal Magic",
    series: "Llewellyn's Sourcebook Series",
    place: 'St. Paul, MN',
    publisher: 'Llewellyn Publications',
    published: '1988',
  },
  'kynes-plants': {
    kind: 'book',
    authors: 'Kynes, Sandra',
    title:
      "The Witches' Encyclopedia of Magical Plants: History, Folklore, Correspondences, and Spells",
    place: 'Woodbury, MN',
    publisher: 'Llewellyn Publications',
    published: '2024',
    note: 'EPUB',
  },
  'kynes-correspondences': {
    kind: 'book',
    authors: 'Kynes, Sandra',
    title:
      "Llewellyn's Complete Book of Correspondences: A Comprehensive & Cross-Referenced Resource for Pagans & Wiccans",
    place: 'Woodbury, MN',
    publisher: 'Llewellyn Publications',
    published: '2013',
  },
  'hall-crystal-bible': {
    kind: 'book',
    authors: 'Hall, Judy',
    title: 'The Crystal Bible',
    place: 'London',
    publisher: 'Godsfield Press',
    published: '2012',
    note: 'EPUB',
  },
  'ahpa-safety': {
    kind: 'book',
    authors: 'Gardner, Zoë, and Michael McGuffin, eds.',
    title: "American Herbal Products Association's Botanical Safety Handbook",
    edition: '2nd ed.',
    place: 'Boca Raton, FL',
    publisher: 'CRC Press',
    published: '2013',
    note: 'PDF',
  },
  'kynes-remedies': {
    kind: 'book',
    authors: 'Kynes, Sandra',
    title: 'Herbal Remedies for Beginners: Natural Ways to Treat Ailments',
    place: 'Woodbury, MN',
    publisher: 'Llewellyn Publications',
    published: '2020',
    note: 'EPUB',
  },
  'northcote-herbs': {
    kind: 'book',
    authors: 'Northcote, Lady Rosalind',
    title: 'The Book of Herbs',
    series: 'Handbooks of Practical Gardening 12',
    place: 'London',
    publisher: 'John Lane, The Bodley Head',
    published: '1903',
  },
} as const satisfies Record<string, CitationFields>;

/** A shared work's handle. */
export type WorkHandle = keyof typeof WORKS;
