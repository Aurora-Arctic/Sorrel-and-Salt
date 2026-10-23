#!/usr/bin/env node
// Converts the TypeScript shards to the compendium's markdown files, once
// (M14.9): an entry file for each shard entry, a source file for each
// per-entry handle, the legacy list `unaudited.txt`, and the manifest of each
// identity's hash that M14.7's adoption reads. The shards stay the seed source
// until M14.10, which deletes this script with them.
//
// A file already at an entry's path keeps the review the owner has given it —
// its status, its sections and each citation's name basis — and takes every
// other field from the shard: a needs-review file must not become `approved`
// because a script rewrote it. Every other citation is `nameBasis: unaudited`.
// The shared works stay `WORKS`; a shard handle that shadows one, or two
// shards giving one handle different texts, fails the run before anything is
// written.
//
// Usage: npx tsx scripts/compendium-convert.ts [--dry-run]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { Document, visit } from 'yaml';
import { COMPENDIUM } from '../src/db/seed/compendium/index.ts';
import { WORKS } from '../src/db/seed/compendium/works.ts';
import { contentHash } from '../src/db/seed/compendium/content-hash.ts';
import {
  COMPENDIUM_ROOT,
  CONVERSION_MANIFEST,
  UNAUDITED_LIST,
} from '../src/db/seed/compendium/load.ts';
import { entryFilePath, parseEntryFile } from '../src/db/seed/compendium/parse-entry.ts';
import {
  renderEntryFile,
  type RenderableEntryFile,
} from '../src/db/seed/compendium/render-entry.ts';
import { identityOf } from '../src/db/seed/standard.ts';
import type { CitationFields } from '../src/lib/types.ts';
import type {
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumFile,
} from '../src/db/seed/types.ts';

const dryRun = process.argv.includes('--dry-run');
const root = resolve(COMPENDIUM_ROOT);
const collisions: string[] = [];

// The sources: one per handle, an identical repeat merged.
const sources = new Map<string, { fields: CitationFields; shard: string }>();
for (const shard of COMPENDIUM) {
  for (const [handle, fields] of Object.entries(shard.sources)) {
    if (handle in WORKS) {
      collisions.push(`${shard.name}: source "${handle}" shadows a shared work.`);
      continue;
    }
    const seen = sources.get(handle);
    if (seen === undefined) sources.set(handle, { fields, shard: shard.name });
    else if (JSON.stringify(seen.fields) !== JSON.stringify(fields)) {
      collisions.push(`Source "${handle}" differs between ${seen.shard} and ${shard.name}.`);
    }
  }
}

// The name basis a citation already carries, by the row it sits on and its handle.
type Provenance = Pick<SeedCitation<string>, 'nameBasis' | 'headedAs' | 'resolvedBy'>;
const rowKey = (form: string | null, source: string) => `${form ?? ''}\u0000${source}`;
function provenanceOf(file: SeedCompendiumFile | undefined): Map<string, Provenance> {
  const kept = new Map<string, Provenance>();
  if (file === undefined) return kept;
  const note = (form: string | null, citation: SeedCitation<string>) =>
    kept.set(rowKey(form, citation.source), {
      nameBasis: citation.nameBasis,
      headedAs: citation.headedAs,
      resolvedBy: citation.resolvedBy,
    });
  for (const citation of file.entry.references) note(null, citation);
  for (const variant of file.entry.variants) {
    for (const citation of variant.references) note(variant.form, citation);
  }
  return kept;
}

function cite(
  form: string | null,
  citation: SeedCitation<string>,
  kept: Map<string, Provenance>,
): SeedCitation<string> {
  const before = kept.get(rowKey(form, citation.source));
  return {
    ...citation,
    nameBasis: before?.nameBasis ?? 'unaudited',
    headedAs: before?.headedAs,
    resolvedBy: before?.resolvedBy,
  };
}

// The entry files.
const files = new Map<string, { text: string; entry: SeedCompendiumEntry; unaudited: boolean }>();
let kept = 0;
for (const shard of COMPENDIUM) {
  for (const entry of shard.entries) {
    const path = entryFilePath(entry);
    if (files.has(path)) {
      collisions.push(
        `${shard.name}: ${entry.name} converts to ${path}, which another entry takes.`,
      );
      continue;
    }
    const absolute = join(root, path);
    const existing = existsSync(absolute)
      ? parseEntryFile(path, readFileSync(absolute, 'utf8'))
      : undefined;
    if (existing && !existing.file) {
      collisions.push(`${path} exists and does not parse: ${existing.issues.join(' ')}`);
      continue;
    }
    if (existing?.file) kept += 1;
    const provenance = provenanceOf(existing?.file);
    const converted: SeedCompendiumEntry = {
      ...entry,
      references: entry.references.map((c) => cite(null, c, provenance)),
      variants: entry.variants.map((variant) => ({
        ...variant,
        references: variant.references.map((c) => cite(variant.form, c, provenance)),
      })),
    };
    const file: RenderableEntryFile = {
      status: existing?.file?.status ?? 'approved',
      entry: converted,
      sections: existing?.file?.sections ?? {},
    };
    const citations = [
      ...converted.references,
      ...converted.variants.flatMap((variant) => variant.references),
    ];
    files.set(path, {
      text: renderEntryFile(file),
      entry,
      unaudited: citations.some((c) => c.nameBasis === 'unaudited'),
    });
  }
}

const paths = [...files.keys()].sort((a, b) => a.localeCompare(b, 'en'));
const unaudited = paths.filter((path) => files.get(path)!.unaudited);
const manifest = Object.fromEntries(
  paths
    .map((path) => files.get(path)!.entry)
    .map((entry) => [identityOf(entry), contentHash(entry)] as const)
    .sort(([a], [b]) => a.localeCompare(b, 'en')),
);

console.log(
  `${files.size} entry files (${kept} keeping the review already on them), ${sources.size} source files, ${unaudited.length} files unaudited, ${Object.keys(manifest).length} manifest identities.`,
);
for (const collision of collisions) console.error(`COLLISION: ${collision}`);
if (collisions.length > 0) process.exit(1);
if (dryRun) process.exit(0);

// Written as Prettier leaves them, so the format check passes and a re-run
// writes the same bytes.
const write = async (path: string, text: string) => {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  const options = (await resolveConfig(absolute)) ?? {};
  writeFileSync(
    absolute,
    path.endsWith('.txt') ? text : await format(text, { ...options, filepath: absolute }),
  );
};

/** A source as YAML, a date quoted so that a YAML 1.1 reader takes it as text, not a timestamp. */
function sourceYaml(fields: CitationFields): string {
  const document = new Document(fields);
  visit(document, {
    Scalar(_key, node) {
      if (typeof node.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(node.value)) {
        node.type = 'QUOTE_SINGLE';
      }
    },
  });
  return document.toString({ lineWidth: 0 });
}
for (const path of paths) await write(path, files.get(path)!.text);
for (const [handle, { fields }] of sources) {
  await write(`sources/${handle}.yaml`, sourceYaml(fields));
}
await write(
  UNAUDITED_LIST,
  [
    '# The entry files whose citations still carry `nameBasis: unaudited` (M14.9).',
    '# Remove a line once that file has been audited (M14.4).',
    ...unaudited,
    '',
  ].join('\n'),
);
await write(CONVERSION_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote the compendium under ${COMPENDIUM_ROOT}/.`);
