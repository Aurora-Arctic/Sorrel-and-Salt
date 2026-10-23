import { describe, expect, it } from 'vitest';
import { checkCompendiumFiles } from '@/db/seed/compendium/guard';
import { loadCompendium, readConversionManifest } from '@/db/seed/compendium/load';
import { entryFilePath } from '@/db/seed/compendium/parse-entry';
import type { SeedCitation, SeedCompendiumFile } from '@/db/seed/types';
import { fromRoot } from '../../../support/paths';

// M14.12: the two Aspen files, corrected. The corpus test
// (compendium-files.test.ts) runs the guard over every file, but applies the
// content rules to `approved` files only, so it passed while both of these
// were `needs-review`. This holds the pair to the content rules on a release
// branch, and holds the American aspen's file to a hash the seed will see as
// changed: its manifest hash is the converted shard row's (M14.9), which the
// seed adopts and then updates (claude-docs/db/compendium-seed/README.md,
// "Write-once, and how a correction lands").

const ROOT = fromRoot('compendium');
const TREMULOIDES = 'ingredients/botanical/aspen-populus-tremuloides.md';
const TREMULA = 'ingredients/botanical/aspen-populus-tremula.md';

const loaded = loadCompendium(ROOT);

function fileAt(path: string): SeedCompendiumFile {
  const file = loaded.files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`${path} was not loaded`);
  return file;
}

/** Every citation on the file, the entry's and each form's. */
function citationsOf(file: SeedCompendiumFile): SeedCitation<string>[] {
  return [
    ...file.entry.references,
    ...file.entry.variants.flatMap((variant) => variant.references),
  ];
}

describe('the Aspen files', () => {
  const pair = [fileAt(TREMULOIDES), fileAt(TREMULA)];

  it('are approved, at the path their names demand, with the Edit Notes cleared', () => {
    for (const file of pair) {
      expect(file.status, file.path).toBe('approved');
      expect(entryFilePath(file.entry)).toBe(file.path);
      expect(file.sections.editNotes, file.path).toBeUndefined();
    }
    expect(pair.map((file) => file.entry.canonicalName)).toEqual([
      'Populus tremuloides',
      'Populus tremula',
    ]);
  });

  it('pass the guard on a release branch, content rules and supports coverage included', () => {
    const entries = pair.map((file) => file.entry);
    const issues = checkCompendiumFiles(
      {
        ...loaded,
        files: pair,
        shards: [{ name: 'compendium', sources: loaded.sources, entries }],
        unaudited: [],
        issues: [],
      },
      { branch: 'staging' },
    );
    expect(issues).toEqual([]);
  });

  it('cite every source by a name it prints or resolves', () => {
    for (const file of pair) {
      for (const citation of citationsOf(file)) {
        expect(['stated', 'resolved'], `${file.path} ${citation.source}`).toContain(
          citation.nameBasis,
        );
      }
    }
  });

  it('give the European aspen its own Wikipedia article and a Bark form', () => {
    const tremula = fileAt(TREMULA);
    expect(tremula.entry.references.map((citation) => citation.source)).toContain(
      'wikipedia-populus-tremula',
    );
    expect(loaded.sources['wikipedia-populus-tremula']).toBeDefined();
    expect(tremula.entry.variants.map((variant) => variant.form)).toContain('Bark');
  });

  it("leave the American aspen's file with a hash the seed reads as changed, and marked for update", () => {
    const manifest = readConversionManifest(ROOT);
    const tremuloides = fileAt(TREMULOIDES);
    const converted = manifest?.['populus tremuloides'];
    // The precondition: the converted row is in the manifest, so the seed adopts it first.
    expect(converted).toMatch(/^[0-9a-f]{64}$/);
    expect(tremuloides.hash).not.toBe(converted);
    expect(tremuloides.seedUpdate).toBe(tremuloides.hash);
    // The European aspen was never a shard row, so it is inserted, not adopted.
    expect(manifest?.['populus tremula']).toBeUndefined();
  });
});
