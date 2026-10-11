import type { SeedCompendiumShard } from '@/db/seed/types';

// An invented two-entry shard for the compendium seed's tests (M1.25): no
// plant, book or page here exists. Testwort carries every field and two
// forms; Samplewort links it as a substitute, by identity and by form.

/** A description of `count` words, so the guard's word bounds are what a test chooses. */
export function wordsOf(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
}

export const FIXTURE_SHARD: SeedCompendiumShard = {
  name: 'fixture',
  sources: {
    'fixture-herbal': {
      kind: 'book',
      authors: 'Testauthor, Ada',
      title: 'A Fixture Herbal',
      place: 'Testford',
      publisher: 'Fixture Press',
      published: '2001',
    },
    'fixture-page': {
      kind: 'web_page',
      title: 'Samplewort',
      container: 'Fixture Wiki',
      url: 'https://example.org/samplewort',
      accessed: '2026-10-11',
    },
  },
  entries: [
    {
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      description: wordsOf(120),
      elements: ['earth'],
      planets: ['Saturn'],
      zodiacSigns: ['Capricorn'],
      colors: ['green'],
      safetyNotes: 'An invented caution.',
      folkNames: ['Fixture Herb', 'Proofleaf'],
      deities: ['Hecate', 'Artemis'],
      categories: ['Protection', 'Warding'],
      references: [
        {
          source: 'fixture-herbal',
          locator: 'p. 12',
          supports: [
            'canonicalName',
            'description',
            'elements',
            'planets',
            'zodiacSigns',
            'colors',
            'safetyNotes',
            'folkNames',
            'deities',
            'categories',
          ],
        },
      ],
      variants: [
        {
          form: 'Herb',
          references: [{ source: 'fixture-herbal', locator: 'p. 13', supports: ['form'] }],
        },
        {
          form: 'Oil',
          description: wordsOf(40),
          safetyNotes: 'An invented caution for the oil.',
          categories: ['Healing'],
          references: [
            {
              source: 'fixture-page',
              supports: ['form', 'description', 'safetyNotes', 'categories'],
            },
          ],
        },
      ],
    },
    {
      name: 'Samplewort',
      canonicalName: 'Fixtura exemplaris',
      nomenclature: 'botanical',
      description: wordsOf(110),
      substitutes: [{ identity: 'fixtura testalis', form: 'Herb' }, { name: 'Mockroot' }],
      references: [
        { source: 'fixture-page', supports: ['canonicalName', 'description', 'substitutes'] },
      ],
      variants: [
        {
          form: 'Root',
          substitutes: [{ identity: 'fixtura testalis' }],
          references: [
            { source: 'fixture-herbal', locator: 'p. 40', supports: ['form', 'substitutes'] },
          ],
        },
      ],
    },
  ],
};
