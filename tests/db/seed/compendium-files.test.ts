import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkCompendiumFiles,
  releaseBranch,
  RELEASE_BRANCHES,
  unauditedGrowth,
} from '@/db/seed/compendium/guard';
import { loadCompendium, pathList } from '@/db/seed/compendium/load';
import type { LoadedCompendium } from '@/db/seed/compendium/load';
import { SOURCES } from '@/db/seed/sources';
import { fromRoot } from '../../support/paths';

// M14.10: the guard over the real compendium, database-free. The markdown
// files under `compendium/` are the seed's only source, so this is the check
// a lane's file meets before it merges, on the branch it merges into. The
// rules themselves are broken one at a time on invented entries in
// compendium/guard.test.ts and compendium/guard-files.test.ts.

const loaded = loadCompendium(fromRoot('compendium'));
const approved = loaded.files.filter((file) => file.status === 'approved');

/** The real corpus with the first approved file turned into a draft. */
function withOneDraft(): LoadedCompendium {
  const target = approved[0]!;
  return {
    ...loaded,
    files: loaded.files.map((file) => (file === target ? { ...file, status: 'draft' } : file)),
  };
}

/** Every `locator` a value holds, at any depth. */
function locatorsIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(locatorsIn);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    key === 'locator' && typeof inner === 'string' ? [inner] : locatorsIn(inner),
  );
}

describe('the compendium files', () => {
  // The precondition every case below rests on: there is a corpus to check.
  it('hold approved entries, and read clean', () => {
    expect(approved.length).toBeGreaterThan(0);
    expect(loaded.issues).toEqual([]);
  });

  it('pass the guard locally, on each release branch, and on the branch this run is for', () => {
    expect(checkCompendiumFiles(loaded, { branch: null })).toEqual([]);
    for (const branch of RELEASE_BRANCHES) {
      expect(checkCompendiumFiles(loaded, { branch }), branch).toEqual([]);
    }
    expect(checkCompendiumFiles(loaded, { branch: releaseBranch() })).toEqual([]);
  });

  // The status gate over the real corpus: a draft merges into a feature
  // branch, and is refused once it would deploy.
  it('refuse a draft on staging and on main, and take it on a feature branch or locally', () => {
    const drafted = withOneDraft();
    for (const branch of RELEASE_BRANCHES) {
      expect(checkCompendiumFiles(drafted, { branch }), branch).toEqual([
        expect.stringContaining(`is a draft, which ${branch} does not take`),
      ]);
    }
    expect(checkCompendiumFiles(drafted, { branch: 'feature/seeding' })).toEqual([]);
    expect(checkCompendiumFiles(drafted, { branch: null })).toEqual([]);
  });

  // Chicago's 18th edition (14.130) cites a reference-work entry "under" its
  // headword, where the 17th wrote the Latin "s.v.": a file written before
  // the change fails here when it merges.
  it('cite an entry "under" its headword, never "s.v."', () => {
    const locators = locatorsIn([loaded.files.map((file) => file.entry), loaded.sources, SOURCES]);
    expect(locators.filter((locator) => locator.startsWith('under "'))).not.toEqual([]);
    expect(locators.filter((locator) => /\bs\.\s*v\./i.test(locator))).toEqual([]);
  });

  // The ratchet (M14.11): the legacy list of unaudited files only shrinks.
  // The baseline beside this test is the list as last committed; a line
  // leaves both together, and none joins either.
  describe('the unaudited list', () => {
    const baseline = pathList(
      readFileSync(fromRoot('tests/db/seed/compendium/unaudited-baseline.txt'), 'utf8'),
    );

    it('has not grown past its baseline', () => {
      // The precondition: there is a list to hold to its baseline.
      expect(loaded.unaudited.length).toBeGreaterThan(0);
      expect(unauditedGrowth(loaded.unaudited, baseline)).toEqual([]);
    });

    it('fails when the list gains a path', () => {
      const grown = [...loaded.unaudited, 'ingredients/botanical/testwort-fixtura-testalis.md'];
      expect(unauditedGrowth(grown, baseline)).toEqual([
        expect.stringContaining('gained ingredients/botanical/testwort-fixtura-testalis.md'),
      ]);
    });

    it('asks for the baseline to shrink with the list', () => {
      const [dropped, ...rest] = loaded.unaudited;
      expect(unauditedGrowth(rest, baseline)).toEqual([
        expect.stringContaining(`no longer lists ${dropped}`),
      ]);
    });
  });
});
