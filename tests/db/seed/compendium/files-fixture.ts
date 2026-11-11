import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import type { LoadedCompendium } from '@/db/seed/compendium/load';
import { entryFilePath, parseEntryFile } from '@/db/seed/compendium/parse-entry';
import { renderEntryFile, type RenderableEntryFile } from '../../../support/seed/render-entry';
import { FIXTURE_SHARD } from '../compendium-fixture';
import type {
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumFile,
  SeedCompendiumShard,
} from '@/db/seed/types';

function stated<Field extends string>(citation: SeedCitation<Field>): SeedCitation<Field> {
  return { ...citation, nameBasis: 'stated' };
}

function fileEntry(entry: SeedCompendiumEntry): SeedCompendiumEntry {
  return {
    ...entry,
    references: entry.references.map(stated),
    variants: entry.variants.map((variant) => ({
      ...variant,
      references: variant.references.map(stated),
    })),
  };
}

const FILE_ENTRIES: readonly SeedCompendiumEntry[] = FIXTURE_SHARD.entries.map(fileEntry);
export const [TESTWORT, SAMPLEWORT] = FILE_ENTRIES;

export const FILE_SOURCES: SeedCompendiumShard['sources'] = FIXTURE_SHARD.sources;

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

const TEMPLATE = '---\nstatus:\nnomenclature:\nreferences:\n  - source:\n---\n\n# TITLE\n';

export interface FixtureFolder {
  root: string;
  write: (path: string, text: string) => void;
  writeEntry: (file: RenderableEntryFile, at?: string) => void;
  remove: () => void;
}

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

export function parsed(file: RenderableEntryFile): SeedCompendiumFile {
  const { file: loaded, issues } = parseEntryFile(entryFilePath(file.entry), renderEntryFile(file));
  if (!loaded) throw new Error(issues.join('\n'));
  return loaded;
}

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

export const fixtureFiles = (): LoadedCompendium =>
  loadedOf([fileOf(TESTWORT), fileOf(SAMPLEWORT)]);
