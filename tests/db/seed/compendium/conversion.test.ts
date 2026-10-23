import { describe, expect, it } from 'vitest';
import { COMPENDIUM } from '@/db/seed/compendium/index';
import { contentHash } from '@/db/seed/compendium/content-hash';
import { checkCompendium, checkCompendiumFiles } from '@/db/seed/compendium/guard';
import { loadCompendium, readConversionManifest } from '@/db/seed/compendium/load';
import { entryFilePath } from '@/db/seed/compendium/parse-entry';
import { identityOf } from '@/db/seed/standard';
import type { SeedCompendiumEntry, SeedCompendiumShard } from '@/db/seed/types';
import { citationText } from '@/lib/citation';
import { fromRoot } from '../../../support/paths';

// M14.9: the markdown files `scripts/compendium-convert.ts` wrote are the
// TypeScript shards, entry for entry, hash for hash and source for source,
// before anything reads them. It lives until M14.10 deletes the shards.

const ROOT = fromRoot('compendium');
const loaded = loadCompendium(ROOT);

// The files with no literal behind them: the European aspen, a stub M14.4
// wrote for M14.12 to fill. Named, so a stray file still fails the count.
const NOT_CONVERTED = ['ingredients/botanical/aspen-populus-tremula.md'];

const literals: SeedCompendiumEntry[] = COMPENDIUM.flatMap((shard) => [...shard.entries]);
const converted = loaded.files.filter((file) => !NOT_CONVERTED.includes(file.path));
const fileAt = new Map(converted.map((file) => [file.path, file]));

// How a citation's name was matched is the file's alone (M14.4): a literal
// never says, so both sides drop it.
const PROVENANCE = new Set(['nameBasis', 'headedAs', 'resolvedBy']);

/** One value with what neither side can tell apart dropped: provenance, undefined, null and empty lists. */
function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise);
  if (value === null || typeof value !== 'object') return value;
  const kept: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    if (PROVENANCE.has(key) || inner === undefined || inner === null) continue;
    if (Array.isArray(inner) && inner.length === 0) continue;
    kept[key] = normalise(inner);
  }
  return kept;
}

const byPath = (_shard: SeedCompendiumShard, entry: SeedCompendiumEntry) => entryFilePath(entry);

describe('the converted compendium', () => {
  it('reads clean, and the guard passes it on no release branch', () => {
    expect(loaded.issues).toEqual([]);
    expect(checkCompendiumFiles(loaded, { branch: null })).toEqual([]);
  });

  it('holds one file for each shard entry, and no other but the named stub', () => {
    expect(literals.length).toBeGreaterThan(0);
    expect(converted).toHaveLength(literals.length);
    expect(new Set(literals.map(entryFilePath)).size).toBe(literals.length);
    expect(
      loaded.files.filter((file) => !literals.some((e) => entryFilePath(e) === file.path)),
    ).toEqual(loaded.files.filter((file) => NOT_CONVERTED.includes(file.path)));
  });

  it('parses each file to its literal', () => {
    for (const literal of literals) {
      const file = fileAt.get(entryFilePath(literal));
      expect(file, entryFilePath(literal)).toBeDefined();
      expect(normalise(file!.entry), file!.path).toEqual(normalise(literal));
    }
  });

  it('records each literal’s recomputed hash in the manifest, under every identity', () => {
    const manifest = readConversionManifest(ROOT);
    expect(manifest).not.toBeNull();
    expect(Object.keys(manifest!).sort()).toEqual(literals.map(identityOf).sort());
    for (const literal of literals) {
      const hash = contentHash(literal);
      expect(manifest![identityOf(literal)], literal.name).toBe(hash);
      expect(fileAt.get(entryFilePath(literal))!.hash, literal.name).toBe(hash);
    }
  });

  it('raises the same checkCompendium issues as the shards', () => {
    const files: SeedCompendiumShard = {
      name: 'compendium',
      sources: loaded.sources,
      entries: converted.map((file) => file.entry),
    };
    expect(checkCompendium([files], { whereOf: byPath }).sort()).toEqual(
      checkCompendium(COMPENDIUM, { whereOf: byPath }).sort(),
    );
  });

  it('resolves every handle to the citation text its shard gives it, and holds no other', () => {
    const handles = new Set<string>();
    for (const shard of COMPENDIUM) {
      for (const [handle, fields] of Object.entries(shard.sources)) {
        handles.add(handle);
        expect(loaded.sources[handle], handle).toBeDefined();
        expect(citationText(loaded.sources[handle]!), handle).toBe(citationText(fields));
      }
    }
    expect(handles.size).toBeGreaterThan(0);
    expect(Object.keys(loaded.sources).sort()).toEqual([...handles].sort());
  });

  it('lists exactly the files with an unaudited citation, and every approved citation is unaudited', () => {
    const citations = (entry: SeedCompendiumEntry) => [
      ...entry.references,
      ...entry.variants.flatMap((variant) => variant.references),
    ];
    const carrying = converted
      .filter((file) => citations(file.entry).some((c) => c.nameBasis === 'unaudited'))
      .map((file) => file.path);
    expect(carrying.length).toBeGreaterThan(0);
    expect([...loaded.unaudited].sort()).toEqual(carrying.sort());
    for (const file of converted.filter((f) => f.status === 'approved')) {
      expect(
        citations(file.entry).filter((c) => c.nameBasis !== 'unaudited'),
        file.path,
      ).toEqual([]);
    }
  });
});
