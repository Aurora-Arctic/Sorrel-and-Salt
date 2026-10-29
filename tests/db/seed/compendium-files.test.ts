import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkCompendiumFiles,
  releaseBranch,
  RELEASE_BRANCHES,
  unauditedGrowth,
} from '@/db/seed/compendium/guard';
import { loadCompendium, pathList } from '@/db/seed/compendium/load';
import { SOURCES } from '@/db/seed/sources';
import { fromRoot } from '../../support/paths';

// The guard over the real compendium, database-free: the markdown files under `compendium/` are the seed's only source, so a lane's file meets this check before it merges.
// The rules themselves, the status gate among them, are broken one at a time on invented entries in compendium/guard.test.ts and compendium/guard-files.test.ts.

const loaded = loadCompendium(fromRoot('compendium'));
const approved = loaded.files.filter((file) => file.status === 'approved');

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

  // Chicago's 18th edition (14.130) cites a reference-work entry "under" its
  // headword, where the 17th wrote the Latin "s.v.": a file written before
  // the change fails here when it merges.
  it('cite an entry "under" its headword, never "s.v."', () => {
    const locators = locatorsIn([loaded.files.map((file) => file.entry), loaded.sources, SOURCES]);
    expect(locators.filter((locator) => locator.startsWith('under "'))).not.toEqual([]);
    expect(locators.filter((locator) => /\bs\.\s*v\./i.test(locator))).toEqual([]);
  });

  // The ratchet: the legacy list of unaudited files only shrinks.
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
  });
});
