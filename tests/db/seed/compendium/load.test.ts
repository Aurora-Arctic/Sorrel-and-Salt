import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadCompendium } from '@/db/seed/compendium/load';
import { entryFilePath } from '@/db/seed/compendium/parse-entry';
import {
  FILE_SOURCES,
  fileOf,
  fixtureFolder,
  SAMPLEWORT,
  TESTWORT,
  type FixtureFolder,
} from './files-fixture';

// The loader reads a folder of entry files as the one shard the seed
// and the guard take. The folder is the invented fixture written to a
// temporary directory, so each case adds one thing that does not belong and
// expects the one issue naming it.

const folders: FixtureFolder[] = [];
const folder = (...args: Parameters<typeof fixtureFolder>) => {
  const made = fixtureFolder(...args);
  folders.push(made);
  return made;
};
afterEach(() => {
  for (const made of folders.splice(0)) made.remove();
});

describe('loadCompendium', () => {
  it('reads every entry file in path order into one shard named compendium', () => {
    const loaded = loadCompendium(folder().root);
    expect(loaded.issues).toEqual([]);
    // Samplewort sorts before Testwort: the order is the path's, never a shard's.
    expect(loaded.files.map((file) => file.path)).toEqual([
      entryFilePath(SAMPLEWORT),
      entryFilePath(TESTWORT),
    ]);
    expect(loaded.files.map((file) => file.entry)).toEqual([SAMPLEWORT, TESTWORT]);
    expect(loaded.shards).toEqual([
      { name: 'compendium', sources: FILE_SOURCES, entries: [SAMPLEWORT, TESTWORT] },
    ]);
    expect(loaded.unaudited).toEqual([]);
  });

  it('reads each sources/<handle>.yaml as that handle', () => {
    const loaded = loadCompendium(folder().root);
    expect(loaded.sources).toEqual(FILE_SOURCES);
    expect(Object.keys(loaded.sources).sort()).toEqual(['fixture-herbal', 'fixture-page']);
  });

  it('skips the template by name and reports any other file directly under ingredients/', () => {
    const made = folder();
    made.write('ingredients/stray.md', '# Stray\n');
    const loaded = loadCompendium(made.root);
    expect(loaded.files).toHaveLength(2);
    expect(loaded.issues).toEqual([
      expect.stringContaining('ingredients/stray.md sits directly under'),
    ]);
  });

  it('reports a folder named for no naming system', () => {
    const made = folder();
    made.writeEntry(fileOf(TESTWORT), 'ingredients/herbs/testwort.md');
    const loaded = loadCompendium(made.root);
    expect(loaded.files).toHaveLength(2);
    expect(loaded.issues).toEqual([
      expect.stringContaining('ingredients/herbs/ is named for no naming system'),
    ]);
  });

  it('reports a file that is not markdown, or a source that is not YAML', () => {
    const made = folder();
    made.write('ingredients/botanical/notes.txt', 'x');
    made.write('sources/notes.json', '{}');
    const loaded = loadCompendium(made.root);
    expect(loaded.issues).toEqual([
      expect.stringContaining('ingredients/botanical/notes.txt is not a markdown file'),
      expect.stringContaining('sources/notes.json is not a YAML file'),
    ]);
  });

  it('reports a file that does not parse, by path, and leaves it out of the shard', () => {
    const made = folder();
    made.write('ingredients/botanical/broken.md', '---\nstatus: approved\n---\n\n## No name\n');
    const loaded = loadCompendium(made.root);
    expect(loaded.files).toHaveLength(2);
    expect(loaded.shards[0].entries).toHaveLength(2);
    expect(loaded.issues.length).toBeGreaterThan(0);
    for (const issue of loaded.issues) {
      expect(issue.startsWith('ingredients/botanical/broken.md ')).toBe(true);
    }
  });

  it('reports a source file that is not a citation, and keeps the others', () => {
    const made = folder();
    made.write('sources/bad.yaml', 'kind: book\n');
    made.write('sources/odd.yaml', 'kind: entry\ntitle: Odd\nisbn: 1\n');
    const loaded = loadCompendium(made.root);
    expect(Object.keys(loaded.sources).sort()).toEqual(['fixture-herbal', 'fixture-page']);
    expect(loaded.issues).toEqual([
      expect.stringContaining('sources/bad.yaml title'),
      expect.stringContaining('sources/odd.yaml'),
    ]);
    expect(loaded.issues[1]).toMatch(/isbn/);
  });

  it('reads unaudited.txt one path per line, skipping blank lines and # comments', () => {
    const made = folder();
    made.write('unaudited.txt', `# converted 2026\n\n${entryFilePath(TESTWORT)}\n  \n`);
    expect(loadCompendium(made.root).unaudited).toEqual([entryFilePath(TESTWORT)]);
  });

  it('reports a root with no ingredients/ folder', () => {
    const made = folder();
    rmSync(join(made.root, 'ingredients'), { recursive: true });
    const loaded = loadCompendium(made.root);
    expect(loaded.files).toEqual([]);
    expect(loaded.issues).toEqual([expect.stringContaining('ingredients/ is missing')]);
  });
});
