import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import type { LoadedCompendium } from '@/db/seed/compendium/load';
import { entryFilePath, parseEntryFile } from '@/db/seed/compendium/parse-entry';
import { renderEntryFile, type RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import { FIXTURE_SHARD } from '../compendium-fixture';
import type {
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumFile,
  SeedCompendiumShard,
} from '@/db/seed/types';

// The invented two-entry shard (compendium-fixture.ts) as a folder of files
// : Testwort and Samplewort each in `ingredients/botanical/`, the two
// fixture sources in `sources/`, and the template. Every citation gains
// `nameBasis: stated`, which a file of an entry with a formal name must carry
// and a literal never did. A test writes the folder to a temporary directory,
// edits one file's text or frontmatter, and loads it.

/** The citation with `nameBasis: stated`, as the files carry it. */
function stated<Field extends string>(citation: SeedCitation<Field>): SeedCitation<Field> {
  return { ...citation, nameBasis: 'stated' };
}

/** A fixture entry as a file holds it: every citation `stated`. */
export function fileEntry(entry: SeedCompendiumEntry): SeedCompendiumEntry {
  return {
    ...entry,
    references: entry.references.map(stated),
    variants: entry.variants.map((variant) => ({
      ...variant,
      references: variant.references.map(stated),
    })),
  };
}

/** The fixture's two entries as files hold them, Testwort first. */
export const FILE_ENTRIES: readonly SeedCompendiumEntry[] = FIXTURE_SHARD.entries.map(fileEntry);
export const [TESTWORT, SAMPLEWORT] = FILE_ENTRIES;

/** The fixture shard's sources, written as `sources/<handle>.yaml`. */
export const FILE_SOURCES: SeedCompendiumShard['sources'] = FIXTURE_SHARD.sources;

/** An `approved` file of `entry`, with `edit` applied to a deep copy before it is rendered. */
export function fileOf(
  entry: SeedCompendiumEntry,
  edit: (file: RenderableEntryFile) => void = () => {},
): RenderableEntryFile {
  const file: RenderableEntryFile = {
    status: 'approved',
    entry: structuredClone(entry),
    sections: {},
  };
  edit(file);
  return file;
}

/** The template, as `ingredients/base.md`: skipped by name, so its content is anything. */
const TEMPLATE = '---\nstatus:\nnomenclature:\nreferences:\n  - source:\n---\n\n# TITLE\n';

export interface FixtureFolder {
  root: string;
  /** Writes `text` at `path` under the root, making the folders. */
  write: (path: string, text: string) => void;
  /** Writes `file` at the path its entry demands, or at `at`. */
  writeEntry: (file: RenderableEntryFile, at?: string) => void;
  remove: () => void;
}

/**
 * A fresh temporary folder holding the template, the two sources and, unless
 * `entries` says otherwise, the two fixture entries as `approved` files.
 */
export function fixtureFolder(
  entries: readonly RenderableEntryFile[] = [fileOf(TESTWORT), fileOf(SAMPLEWORT)],
): FixtureFolder {
  const root = mkdtempSync(join(tmpdir(), 'compendium-fixture-'));
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const writeEntry = (file: RenderableEntryFile, at = entryFilePath(file.entry)) =>
    write(at, renderEntryFile(file));
  write('ingredients/base.md', TEMPLATE);
  for (const [handle, fields] of Object.entries(FILE_SOURCES)) {
    write(`sources/${handle}.yaml`, stringify(fields));
  }
  for (const file of entries) writeEntry(file);
  return { root, write, writeEntry, remove: () => rmSync(root, { recursive: true, force: true }) };
}

/** The loaded file for `entry`, by path, or a thrown error naming what was loaded instead. */
export function fileFor(
  files: readonly SeedCompendiumFile[],
  entry: SeedCompendiumEntry,
): SeedCompendiumFile {
  const path = entryFilePath(entry);
  const file = files.find((candidate) => candidate.path === path);
  if (!file)
    throw new Error(`${path} was not loaded; loaded: ${files.map((f) => f.path).join(', ')}`);
  return file;
}

/** A file's text through the real parser, so a test holds the hash the seed will compute. */
export function parsed(file: RenderableEntryFile): SeedCompendiumFile {
  const { file: loaded, issues } = parseEntryFile(entryFilePath(file.entry), renderEntryFile(file));
  if (!loaded) throw new Error(issues.join('\n'));
  return loaded;
}

/**
 * `files` as `loadCompendium` would return them, without a folder on disk:
 * each rendered and parsed, under the fixture's sources and any `more`.
 */
export function loadedOf(
  files: readonly RenderableEntryFile[],
  more: SeedCompendiumShard['sources'] = {},
): LoadedCompendium {
  const loaded = files.map(parsed);
  const sources = { ...FILE_SOURCES, ...more };
  return {
    root: 'compendium-test',
    files: loaded,
    sources,
    shards: [{ name: 'compendium', sources, entries: loaded.map((file) => file.entry) }],
    unaudited: [],
    issues: [],
  };
}

/** The two fixture entries as `approved` files, loaded. */
export const fixtureFiles = (): LoadedCompendium =>
  loadedOf([fileOf(TESTWORT), fileOf(SAMPLEWORT)]);
