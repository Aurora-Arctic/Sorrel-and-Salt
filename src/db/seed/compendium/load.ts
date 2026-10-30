import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { parseEntryFile } from './parse-entry';
import { withoutBlanks } from './file-schema';
import { NOMENCLATURE_KINDS } from '../../../modules/ingredients/schema/ingredient-enums';
import type { CitationFields } from '../../../lib/types';
import type { SeedCompendiumFile, SeedCompendiumShard } from '../types';

// The compendium's files read as one shard: entry files under `ingredients/<nomenclature>/`, per-entry sources under `sources/`, and `unaudited.txt`.
// Synchronous, as the seed and the guard both want the whole corpus first. Reports only what stops it reading (a stray file, an unknown folder, a non-citation source); parse-entry.ts and guard.ts judge content.

/** The repo's compendium folder, where `loadCompendium()` reads by default. */
export const COMPENDIUM_ROOT = 'compendium';

/** The template a new file is copied from, skipped by name: it is not an entry. */
export const TEMPLATE_FILE = 'base.md';

/** The file naming the entry files whose citations still carry `nameBasis: unaudited`, one path per line. */
export const UNAUDITED_LIST = 'unaudited.txt';

export interface LoadedCompendium {
  /** The absolute path of the folder read. */
  root: string;
  /** Every file that parsed clean, in path order. */
  files: SeedCompendiumFile[];
  /** The per-entry sources, by handle, from `sources/<handle>.yaml`. The shared works are `WORKS`. */
  sources: Record<string, CitationFields>;
  /** One synthetic shard named `compendium`, so `checkCompendium` and the seed take the files as they took the literals. */
  shards: SeedCompendiumShard[];
  /** The paths `unaudited.txt` lists, relative to the root. */
  unaudited: string[];
  /** What could not be read: a file's parse issues, a stray file, a folder for no naming system. */
  issues: string[];
}

/** A source file's fields: `CitationFields`, every key named, nothing else. */
const citationFieldsSchema = z.strictObject({
  kind: z.enum(['book', 'chapter', 'article', 'entry', 'web_page']),
  title: z.string().min(1),
  authors: z.string().optional(),
  container: z.string().optional(),
  contributors: z.string().optional(),
  edition: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  series: z.string().optional(),
  place: z.string().optional(),
  publisher: z.string().optional(),
  published: z.string().optional(),
  pages: z.string().optional(),
  host: z.string().optional(),
  url: z.string().optional(),
  modified: z.string().optional(),
  accessed: z.string().optional(),
  note: z.string().optional(),
});

const KINDS: readonly string[] = NOMENCLATURE_KINDS;

/** The entry files: each nomenclature folder's `*.md`, sorted, with what does not belong reported. */
function readEntries(root: string, issues: string[]): SeedCompendiumFile[] {
  const folder = join(root, 'ingredients');
  if (!existsSync(folder)) {
    issues.push(`ingredients/ is missing under ${root}.`);
    return [];
  }
  const files: SeedCompendiumFile[] = [];
  for (const dirent of readdirSync(folder, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )) {
    if (dirent.isFile()) {
      if (dirent.name !== TEMPLATE_FILE) {
        issues.push(
          `ingredients/${dirent.name} sits directly under ingredients/: an entry file lives in its nomenclature's folder.`,
        );
      }
      continue;
    }
    if (!dirent.isDirectory()) continue;
    if (!KINDS.includes(dirent.name)) {
      issues.push(
        `ingredients/${dirent.name}/ is named for no naming system: the folders are ${KINDS.join(', ')}.`,
      );
      continue;
    }
    for (const name of readdirSync(join(folder, dirent.name)).sort((a, b) =>
      a.localeCompare(b, 'en'),
    )) {
      const path = `ingredients/${dirent.name}/${name}`;
      if (!name.endsWith('.md')) {
        issues.push(`${path} is not a markdown file.`);
        continue;
      }
      const parsed = parseEntryFile(path, readFileSync(join(root, path), 'utf8'));
      issues.push(...parsed.issues);
      if (parsed.file) files.push(parsed.file);
    }
  }
  return files;
}

/** The per-entry sources: `sources/<handle>.yaml`, the handle being the file's name. */
function readSources(root: string, issues: string[]): Record<string, CitationFields> {
  const folder = join(root, 'sources');
  const sources: Record<string, CitationFields> = {};
  if (!existsSync(folder)) return sources;
  for (const name of readdirSync(folder).sort((a, b) => a.localeCompare(b, 'en'))) {
    const path = `sources/${name}`;
    if (!name.endsWith('.yaml')) {
      issues.push(`${path} is not a YAML file.`);
      continue;
    }
    let raw: unknown;
    try {
      raw = withoutBlanks(parseYaml(readFileSync(join(root, path), 'utf8'), { uniqueKeys: true }));
    } catch (error) {
      issues.push(`${path}: ${(error as Error).message.split('\n')[0]}`);
      continue;
    }
    const parsed = citationFieldsSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const at = issue.path.length === 0 ? 'the file' : issue.path.map(String).join('.');
        issues.push(`${path} ${at}: ${issue.message}.`);
      }
      continue;
    }
    sources[name.slice(0, -'.yaml'.length)] = parsed.data;
  }
  return sources;
}

/** A list of paths, one per line, blank lines and `#` comments skipped: `unaudited.txt` and its ratchet's baseline. */
export function pathList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/** `unaudited.txt`'s paths; absent is empty. */
function readUnaudited(root: string): string[] {
  const path = join(root, UNAUDITED_LIST);
  if (!existsSync(path)) return [];
  return pathList(readFileSync(path, 'utf8'));
}

/**
 * Reads the compendium under `root` (relative to the working directory, or
 * absolute). Every file that parses is in `files` and in the one shard;
 * every one that does not is in `issues` and nowhere else.
 */
export function loadCompendium(root: string = COMPENDIUM_ROOT): LoadedCompendium {
  const absolute = resolve(root);
  const issues: string[] = [];
  const files = readEntries(absolute, issues);
  const sources = readSources(absolute, issues);
  return {
    root: absolute,
    files,
    sources,
    shards: [{ name: 'compendium', sources, entries: files.map((file) => file.entry) }],
    unaudited: readUnaudited(absolute),
    issues,
  };
}

/**
 * The conversion manifest: the content hash of each converted file by entry identity, stored as the baseline of a row seeded before the hash
 * existed ("Adoption"). Deleted once production has adopted.
 */
export const CONVERSION_MANIFEST = '.converted-hashes.json';

const manifestSchema = z.record(z.string().min(1), z.string().regex(/^[0-9a-f]{64}$/));

/** The manifest under `root`, or `null` when the file is gone; a manifest that is not identity → hash throws. */
export function readConversionManifest(
  root: string = COMPENDIUM_ROOT,
): Record<string, string> | null {
  const path = join(resolve(root), CONVERSION_MANIFEST);
  if (!existsSync(path)) return null;
  return manifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}
