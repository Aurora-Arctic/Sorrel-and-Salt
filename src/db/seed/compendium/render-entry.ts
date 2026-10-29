import { stringify as stringifyYaml } from 'yaml';
import { SECTION_HEADINGS } from './parse-entry';
import type {
  SeedCitation,
  SeedCompendiumFile,
  SeedCompendiumVariant,
  SeedSubstitute,
} from '../types';

// An entry as a file: the inverse of `parseEntryFile`, so a test can
// prove a file reads back as the entry it was written from. Only the tests
// render it now, writing their fixture files the way the corpus is
// written. The keys go in one fixed order with `status` first; the key order
// a hand-edited file has is free.

/** What `renderEntryFile` takes: a file minus what it derives, the hash and the path. */
export type RenderableEntryFile = Omit<SeedCompendiumFile, 'hash' | 'path'>;

/** `colors` to `colours`, in a key or a `supports` list: the file's spelling. */
const toFileField = (field: string) => (field === 'colors' ? 'colours' : field);

/** A record with its `undefined` values left out, so the YAML holds no `key: null`. */
function compact(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function renderCitation(citation: SeedCitation<string>): Record<string, unknown> {
  return compact({
    source: citation.source,
    locator: citation.locator,
    nameBasis: citation.nameBasis,
    headedAs: citation.headedAs,
    resolvedBy: citation.resolvedBy,
    supports: citation.supports.map(toFileField),
  });
}

function renderSubstitute(substitute: SeedSubstitute): Record<string, unknown> {
  return 'identity' in substitute
    ? compact({ identity: substitute.identity, form: substitute.form })
    : { name: substitute.name };
}

function renderVariant(variant: SeedCompendiumVariant): Record<string, unknown> {
  return compact({
    form: variant.form,
    description: variant.description ?? undefined,
    toxic: variant.toxic,
    safetyNotes: variant.safetyNotes ?? undefined,
    elements: variant.elements ?? undefined,
    celestialBodies: variant.celestialBodies ?? undefined,
    zodiacSigns: variant.zodiacSigns ?? undefined,
    colours: variant.colors ?? undefined,
    categories: variant.categories,
    substitutes: variant.substitutes?.map(renderSubstitute),
    references: variant.references.map(renderCitation),
  });
}

/** The frontmatter as the file writes it: one fixed key order, `status` first, nothing blank. */
export function renderFrontmatter(file: RenderableEntryFile): Record<string, unknown> {
  const { entry } = file;
  return compact({
    status: file.status,
    nomenclature: entry.nomenclature,
    canonicalName: entry.canonicalName ?? undefined,
    seedUpdate: file.seedUpdate,
    overwriteEditor: file.overwriteEditor,
    toxic: entry.toxic,
    safetyNotes: entry.safetyNotes ?? undefined,
    elements: entry.elements ?? undefined,
    celestialBodies: entry.celestialBodies ?? undefined,
    zodiacSigns: entry.zodiacSigns ?? undefined,
    colours: entry.colors ?? undefined,
    folkNames: entry.folkNames,
    deities: entry.deities,
    categories: entry.categories,
    substitutes: entry.substitutes?.map(renderSubstitute),
    // Always written, empty or not: the parser requires the key.
    references: entry.references.map(renderCitation),
    variants: entry.variants.length === 0 ? undefined : entry.variants.map(renderVariant),
  });
}

/** The whole file: frontmatter, `# Name`, the description, then the sections that have text. */
export function renderEntryFile(file: RenderableEntryFile): string {
  // `lineWidth: 0` keeps a long description on one line, since the parser
  // folds a line break inside a paragraph to a space anyway and a wrapped
  // YAML scalar is harder to read in a diff.
  const frontmatter = stringifyYaml(renderFrontmatter(file), { lineWidth: 0 });
  const parts = [`---\n${frontmatter}---\n`, `# ${file.entry.name}\n`];
  if (file.entry.description) parts.push(`${file.entry.description}\n`);
  for (const key of ['questions', 'editNotes'] as const) {
    const text = file.sections[key];
    if (text !== undefined) parts.push(`#### ${SECTION_HEADINGS[key]}\n\n${text}\n`);
  }
  return parts.join('\n');
}
