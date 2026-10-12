import { describe, expect, it } from 'vitest';
import { checkCompendium } from '@/db/seed/compendium/guard';
import { COMPENDIUM } from '@/db/seed/compendium/index';
import { SOURCES } from '@/db/seed/sources';
import { FIXTURE_SHARD, wordsOf } from './compendium-fixture';
import type { SeedCompendiumEntry, SeedCompendiumShard } from '@/db/seed/types';

// MB.242: the compendium seed's guard, database-free. Each rule is broken
// once on the invented fixture, which passes whole, so the issue a case
// finds is the one its edit made. The rules are
// claude-docs/db/compendium-seed/README.md's; what each says is the guard's.

/** The fixture with `edit` applied to a deep copy. */
function edited(edit: (shard: SeedCompendiumShard) => void): SeedCompendiumShard[] {
  const shard = structuredClone(FIXTURE_SHARD);
  edit(shard);
  return [shard];
}

const testwort = (shard: SeedCompendiumShard) => shard.entries[0];
const samplewort = (shard: SeedCompendiumShard) => shard.entries[1];

/** A `none` entry under `name`, sourced, with one form. */
function nameless(name: string): SeedCompendiumEntry {
  return {
    name,
    nomenclature: 'none',
    description: wordsOf(100),
    references: [{ source: 'fixture-page', supports: ['description'] }],
    variants: [{ form: 'Water', references: [{ source: 'fixture-page', supports: ['form'] }] }],
  };
}

/** Every `locator` a seed literal holds, at any depth. */
function locatorsIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(locatorsIn);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    key === 'locator' && typeof inner === 'string' ? [inner] : locatorsIn(inner),
  );
}

// Chicago's 18th edition (14.130) cites a reference-work entry "under" its
// headword, where the 17th wrote the Latin "s.v.": a seed list written before
// the change fails here when it merges.
describe('the seed locators', () => {
  it('cite an entry "under" its headword, never "s.v."', () => {
    const locators = locatorsIn([COMPENDIUM, SOURCES]);
    expect(locators.filter((locator) => locator.startsWith('under "'))).not.toEqual([]);
    expect(locators.filter((locator) => /\bs\.\s*v\./i.test(locator))).toEqual([]);
  });
});

describe('checkCompendium', () => {
  // The precondition every case below rests on.
  it('passes the fixture whole', () => {
    expect(checkCompendium([FIXTURE_SHARD])).toEqual([]);
  });

  it('passes the production list', () => {
    expect(checkCompendium(COMPENDIUM)).toEqual([]);
  });

  describe('identity and naming', () => {
    it('refuses two entries of one identity, whatever their labels', () => {
      const shards = edited((shard) =>
        shard.entries.push({ ...testwort(shard), name: 'Proofwort' }),
      );
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses two entries at one slug', () => {
      const shards = edited((shard) =>
        shard.entries.push(nameless('Fixture Water'), nameless('Fixture-Water')),
      );
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a formal name on a none entry', () => {
      const shards = edited((shard) =>
        shard.entries.push({
          ...nameless('Fixture Water'),
          canonicalName: 'Aqua fixturae',
          references: [{ source: 'fixture-page', supports: ['canonicalName', 'description'] }],
        }),
      );
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('takes an unknown entry without a formal name, and refuses one with', () => {
      const unnamed = edited((shard) =>
        shard.entries.push({ ...nameless('Fixture Root'), nomenclature: 'unknown' }),
      );
      expect(checkCompendium(unnamed)).toEqual([]);

      const named = edited((shard) =>
        shard.entries.push({
          ...nameless('Fixture Root'),
          nomenclature: 'unknown',
          canonicalName: 'Fixtura radicis',
          references: [{ source: 'fixture-page', supports: ['canonicalName', 'description'] }],
        }),
      );
      expect(checkCompendium(named)).toHaveLength(1);
    });

    it('refuses a named kind with no formal name', () => {
      const shards = edited((shard) => {
        samplewort(shard).canonicalName = null;
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it.each([
      'Fixtura',
      'Fixtura testalis subsp. minor',
      "Fixtura testalis 'Proof'",
      'Fixtura × testalis',
      'Fixturus fixturus domesticus',
      'Fixtura subg. Fixtura',
      'Fixtura sect. Probata',
    ])('takes the taxon %s', (name) => {
      const shards = edited((shard) => {
        samplewort(shard).canonicalName = name;
      });
      expect(checkCompendium(shards)).toEqual([]);
    });

    it.each([
      'fixtura exemplaris',
      'Fixtura Exemplaris',
      'Fixtura exemplaris L.',
      'Fixtura sect. probata',
    ])('refuses %s, which is no taxon’s shape', (name) => {
      const shards = edited((shard) => {
        samplewort(shard).canonicalName = name;
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });
  });

  describe('the closed lists', () => {
    it.each([
      ['form', (shard: SeedCompendiumShard) => (testwort(shard).variants[1].form = 'Twig')],
      ['category', (shard: SeedCompendiumShard) => testwort(shard).categories?.push('Weather')],
      ['deity', (shard: SeedCompendiumShard) => testwort(shard).deities?.push('Fixturon')],
      ['planet', (shard: SeedCompendiumShard) => testwort(shard).planets?.push('Vulcan')],
      ['zodiac sign', (shard: SeedCompendiumShard) => testwort(shard).zodiacSigns?.push('Arachne')],
      ['colour', (shard: SeedCompendiumShard) => testwort(shard).colors?.push('teal')],
      [
        'repeated value',
        (shard: SeedCompendiumShard) => testwort(shard).folkNames?.push('proofleaf'),
      ],
    ])('refuses a %s off its list', (_, edit) => {
      expect(checkCompendium(edited(edit))).toHaveLength(1);
    });
  });

  describe('citations', () => {
    it('refuses an entry that cites nothing', () => {
      const shards = edited((shard) => {
        testwort(shard).references = [];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a form that cites nothing of its own', () => {
      const shards = edited((shard) => {
        testwort(shard).variants[0].references = [];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a field no citation supports', () => {
      const shards = edited((shard) => {
        const [citation] = testwort(shard).references;
        testwort(shard).references = [
          { ...citation, supports: citation.supports.filter((field) => field !== 'colors') },
        ];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a form field no citation supports', () => {
      const shards = edited((shard) => {
        testwort(shard).variants[1].references = [{ source: 'fixture-page', supports: ['form'] }];
      });
      expect(checkCompendium(shards)).toHaveLength(3);
    });

    it('refuses a handle nothing declares', () => {
      const shards = edited((shard) => {
        testwort(shard).variants[0].references[0].source = 'fixture-missing';
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a book cited with no locator', () => {
      const shards = edited((shard) => {
        delete testwort(shard).variants[0].references[0].locator;
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses one source cited twice on a row', () => {
      const shards = edited((shard) => {
        testwort(shard).variants[0].references.push({
          source: 'fixture-herbal',
          locator: 'p. 14',
          supports: ['form'],
        });
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses two handles that render one citation', () => {
      const shards = edited((shard) => {
        shard.sources['fixture-herbal-again'] = { ...shard.sources['fixture-herbal'] };
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });
  });

  describe('substitutes', () => {
    it('refuses an identity no shard seeds', () => {
      const shards = edited((shard) => {
        samplewort(shard).substitutes = [{ identity: 'fixtura absentis' }];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a form the linked entry does not have', () => {
      const shards = edited((shard) => {
        samplewort(shard).substitutes = [{ identity: 'fixtura testalis', form: 'Bark' }];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it("refuses a form's link that names no form, as the service does", () => {
      const shards = edited((shard) => {
        samplewort(shard).variants[0].substitutes = [{ identity: 'fixtura testalis' }];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses an entry standing in for itself', () => {
      const shards = edited((shard) => {
        samplewort(shard).substitutes = [{ identity: 'fixtura exemplaris' }];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a link to a later shard, which is written as a typed name instead', () => {
      const [shard] = edited(() => {});
      delete samplewort(shard).variants[0].substitutes;
      const earlier = { ...shard, name: 'earlier', entries: [samplewort(shard)] };
      const later = { ...shard, name: 'later', entries: [testwort(shard)] };
      expect(checkCompendium([earlier, later])).toHaveLength(1);
    });
  });

  describe('length and shape', () => {
    it.each([99, 251])('refuses an entry description of %i words', (count) => {
      const shards = edited((shard) => {
        testwort(shard).description = wordsOf(count);
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses a form description over 120 words', () => {
      const shards = edited((shard) => {
        testwort(shard).variants[1].description = wordsOf(121);
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });

    it('refuses an entry with no form', () => {
      const shards = edited((shard) => {
        samplewort(shard).variants = [];
      });
      expect(checkCompendium(shards)).toHaveLength(1);
    });
  });
});
