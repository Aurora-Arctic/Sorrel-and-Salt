import { createHash } from 'node:crypto';
import type {
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumVariant,
  SeedSubstitute,
} from '../types';

// The content hash of a compendium entry: what the seed compares a
// file against the row it last wrote, so that a changed file is told from an
// unchanged one (claude-docs/db/compendium-seed/README.md, "The hash"; the
// rules are claude-docs/design-decisions/m14.4-compendium-markdown-files.md's).
// Pure: it imports `node:crypto` and types, nothing else, so a test and the
// seed hash one way.

/**
 * The algorithm's version, prefixed to the text that is hashed, so a later
 * change to these rules is an explicit event: every stored hash then differs,
 * and the task that changes it says what happens to them.
 */
export const HASH_VERSION = 'compendium-hash-v1';

/** A value the canonical projection may hold: JSON with no null, no empty string, no empty list. */
export type CanonicalValue =
  string | true | readonly CanonicalValue[] | { readonly [key: string]: CanonicalValue };

/** Unicode-normalised, trimmed, and its runs of whitespace folded to one space. */
function canonicalText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * A description is paragraphs: each is folded as any string, and the
 * paragraphs are joined with a blank line, so a line break inside a paragraph
 * is no change and a new paragraph is one.
 */
function canonicalDescription(value: string): string {
  return value
    .normalize('NFC')
    .split(/\n[ \t]*\n/)
    .map(canonicalText)
    .filter((paragraph) => paragraph !== '')
    .join('\n\n');
}

/** A list of strings in file order (deities have a position), blanks dropped. */
function canonicalList(values: readonly string[] | null | undefined): readonly string[] {
  return (values ?? []).map(canonicalText).filter((value) => value !== '');
}

/** The citation's source handle and locator alone: `supports` and the provenance keys are not content. */
function canonicalCitation(citation: SeedCitation<string>): CanonicalValue {
  return withoutBlanks({
    locator: citation.locator === undefined ? undefined : canonicalText(citation.locator),
    source: canonicalText(citation.source),
  });
}

function canonicalSubstitute(substitute: SeedSubstitute): CanonicalValue {
  if ('identity' in substitute) {
    return withoutBlanks({
      form: substitute.form === undefined ? undefined : canonicalText(substitute.form),
      identity: canonicalText(substitute.identity),
    });
  }
  return { name: canonicalText(substitute.name) };
}

function canonicalVariant(variant: SeedCompendiumVariant): CanonicalValue {
  return withoutBlanks({
    categories: canonicalList(variant.categories),
    celestialBodies: canonicalList(variant.celestialBodies),
    colors: canonicalList(variant.colors),
    description: variant.description ? canonicalDescription(variant.description) : undefined,
    elements: canonicalList(variant.elements),
    form: canonicalText(variant.form),
    references: variant.references.map(canonicalCitation),
    safetyNotes: variant.safetyNotes ? canonicalText(variant.safetyNotes) : undefined,
    substitutes: (variant.substitutes ?? []).map(canonicalSubstitute),
    toxic: variant.toxic === true ? true : undefined,
    zodiacSigns: canonicalList(variant.zodiacSigns),
  });
}

/**
 * Drops what the projection does not hold — `undefined`, `null`, an empty
 * string, an empty list — so an absent key, a blank value and an empty list
 * hash alike. Keys are written in alphabetical order.
 */
function withoutBlanks(
  record: Record<string, CanonicalValue | readonly CanonicalValue[] | null | undefined>,
): CanonicalValue {
  const kept: Record<string, CanonicalValue> = {};
  for (const key of Object.keys(record).sort()) {
    const value = record[key];
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    kept[key] = value as CanonicalValue;
  }
  return kept;
}

/**
 * The seeded fields of an entry, with the database's key names (`colors`),
 * every string folded, every blank dropped and the keys in alphabetical
 * order. Lists keep their order. What is not here is not content: a file's
 * `status`, `seedUpdate`, `overwriteEditor`, each citation's `supports` and
 * provenance, and the two trailing sections.
 */
export function canonicalEntry(entry: SeedCompendiumEntry): CanonicalValue {
  return withoutBlanks({
    canonicalName: entry.canonicalName ? canonicalText(entry.canonicalName) : undefined,
    categories: canonicalList(entry.categories),
    celestialBodies: canonicalList(entry.celestialBodies),
    colors: canonicalList(entry.colors),
    deities: canonicalList(entry.deities),
    description: entry.description ? canonicalDescription(entry.description) : undefined,
    elements: canonicalList(entry.elements),
    folkNames: canonicalList(entry.folkNames),
    name: canonicalText(entry.name),
    nomenclature: entry.nomenclature,
    references: entry.references.map(canonicalCitation),
    safetyNotes: entry.safetyNotes ? canonicalText(entry.safetyNotes) : undefined,
    substitutes: (entry.substitutes ?? []).map(canonicalSubstitute),
    toxic: entry.toxic === true ? true : undefined,
    variants: entry.variants.map(canonicalVariant),
    zodiacSigns: canonicalList(entry.zodiacSigns),
  });
}

/** JSON with every object's keys sorted, so two projections of one content are one text. */
export function stableJson(value: CanonicalValue): string {
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as { readonly [key: string]: CanonicalValue };
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

/** The text that is hashed: the version line, then the canonical entry as stable JSON. */
export function hashText(entry: SeedCompendiumEntry): string {
  return `${HASH_VERSION}\n${stableJson(canonicalEntry(entry))}`;
}

/** The SHA-256 of `hashText(entry)`, as 64 lower-case hex characters: what `seed_content_hash` holds. */
export function contentHash(entry: SeedCompendiumEntry): string {
  return createHash('sha256').update(hashText(entry), 'utf8').digest('hex');
}
