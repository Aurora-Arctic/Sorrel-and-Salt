import { WORKS } from './works';
import { COLOURS } from './colours';
import { CATEGORIES } from '../categories';
import { DEITIES } from '../deities';
import { FORMS } from '../forms';
import { CELESTIAL_BODIES, ZODIAC_SIGNS } from '../astrology';
import { identityOf } from '../standard';
import { citationText } from '../../../lib/citation';
import { ingredientSlug, slugify } from '../../../lib/slugify';
import type { CitationFields } from '../../../lib/types';
import type {
  CompendiumEntryField,
  CompendiumVariantField,
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumShard,
  SeedCompendiumVariant,
  SeedSubstitute,
} from '../types';

// The compendium seed's guard (MB.242): every rule the shards are written to
// that a function can check, run by a database-free test and again by
// `seedCompendium` before its transaction opens, so a literal that breaks one
// never reaches staging or production. It returns every issue rather than
// throwing at the first, so a lane sees its whole list at once. The rules are
// claude-docs/db/compendium-seed/README.md's.

/** The curated vocabularies an entry may name, each by the slug of a name its seed literal holds. */
export interface CuratedNames {
  forms: ReadonlySet<string>;
  categories: ReadonlySet<string>;
  deities: ReadonlySet<string>;
  celestialBodies: ReadonlySet<string>;
  zodiacSigns: ReadonlySet<string>;
}

const slugsOf = (rows: readonly { name: string }[]) =>
  new Set(rows.map((row) => slugify(row.name)));

/** The seed literals' own names: what `migrate.yml` has seeded before the compendium runs. */
export const CURATED: CuratedNames = {
  forms: slugsOf(FORMS),
  categories: slugsOf(CATEGORIES),
  deities: slugsOf(DEITIES),
  celestialBodies: slugsOf(CELESTIAL_BODIES),
  zodiacSigns: slugsOf(ZODIAC_SIGNS),
};

/** An entry's word count bounds, and a form's ceiling: the owner's defaults (README, rule 5). */
export const ENTRY_WORDS = { min: 100, max: 250 } as const;
export const VARIANT_WORDS_MAX = 120;

// A binomial (`Genus species`), a trinomial with or without its rank
// (`subsp.`, `var.`, `f.`), a hybrid's `×`, a quoted cultivar, or the genus
// or higher taxon alone where practice does not split it (`Usnea`), or a
// group within a genus the candidate list names by its rank (`Rubus subg.
// Rubus`, `Vaccinium sect. Cyanococcus`; MB.243).
const EPITHET = String.raw`(?:× )?[a-z][a-z-]*`;
const TAXON = new RegExp(
  String.raw`^[A-Z][a-z]+(?: (?:subg\.|sect\.) [A-Z][a-z]+|(?: ${EPITHET}(?: (?:(?:subsp\.|var\.|f\.) )?[a-z][a-z-]*)?)?(?: '[^']+')?)$`,
);
const TAXONOMIC = new Set(['botanical', 'fungal', 'zoological']);

/** The fields an entry populates, each a field some citation must support. */
function populatedEntryFields(entry: SeedCompendiumEntry): CompendiumEntryField[] {
  const fields: CompendiumEntryField[] = [];
  if (entry.canonicalName) fields.push('canonicalName');
  if (entry.description) fields.push('description');
  if (entry.safetyNotes) fields.push('safetyNotes');
  // A flag on is a claim the plant is poisonous, so a citation must back it (M14.1).
  if (entry.toxic) fields.push('toxic');
  for (const field of [
    'elements',
    'celestialBodies',
    'zodiacSigns',
    'colors',
    'folkNames',
    'deities',
    'categories',
    'substitutes',
  ] as const) {
    if ((entry[field]?.length ?? 0) > 0) fields.push(field);
  }
  return fields;
}

function populatedVariantFields(variant: SeedCompendiumVariant): CompendiumVariantField[] {
  const fields: CompendiumVariantField[] = ['form'];
  if (variant.description) fields.push('description');
  if (variant.safetyNotes) fields.push('safetyNotes');
  if (variant.toxic) fields.push('toxic');
  for (const field of [
    'elements',
    'celestialBodies',
    'zodiacSigns',
    'colors',
    'categories',
    'substitutes',
  ] as const) {
    if ((variant[field]?.length ?? 0) > 0) fields.push(field);
  }
  return fields;
}

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Every value a list repeats, case folded, as the child tables' unique indexes fold it. */
function repeats(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    const fold = value.trim().toLowerCase();
    if (seen.has(fold)) repeated.add(value);
    seen.add(fold);
  }
  return [...repeated];
}

/**
 * Every issue in `shards`, in shard and entry order; empty when the list is
 * fit to seed. `works` and `curated` are the shared works and the curated
 * vocabularies, given so a test can hold them still.
 */
export function checkCompendium(
  shards: readonly SeedCompendiumShard[],
  {
    works = WORKS,
    curated = CURATED,
  }: { works?: Record<string, CitationFields>; curated?: CuratedNames } = {},
): string[] {
  const issues: string[] = [];

  // Citation texts pairwise distinct: two handles rendering one citation
  // would be one `references` row the seed links twice under two names.
  const handlesByCitation = new Map<string, string>();
  const noteCitation = (handle: string, fields: CitationFields) => {
    const text = citationText(fields);
    const other = handlesByCitation.get(text);
    if (other !== undefined && other !== handle) {
      issues.push(`Sources "${other}" and "${handle}" render the same citation: ${text}`);
    }
    handlesByCitation.set(text, handle);
  };
  for (const [handle, fields] of Object.entries(works)) noteCitation(handle, fields);

  // Identity, slug and the forms each identity carries, in seeding order, for
  // the uniqueness rule and the substitutes' earlier-shard rule.
  const identities = new Map<string, string>();
  const slugs = new Map<string, string>();
  const formsOf = new Map<string, Set<string>>();
  for (const shard of shards) {
    for (const [handle, fields] of Object.entries(shard.sources)) {
      if (handle in works) issues.push(`${shard.name}: source "${handle}" shadows a shared work.`);
      noteCitation(handle, fields);
    }
    for (const entry of shard.entries) {
      const identity = identityOf(entry);
      const slug = ingredientSlug(entry.name, entry.canonicalName);
      const where = `${shard.name}: ${entry.name}`;
      const twin = identities.get(identity);
      if (twin !== undefined)
        issues.push(`${where} shares its identity "${identity}" with ${twin}.`);
      const slugTwin = slugs.get(slug);
      if (slugTwin !== undefined)
        issues.push(`${where} shares its slug "${slug}" with ${slugTwin}.`);
      identities.set(identity, where);
      slugs.set(slug, where);
      formsOf.set(identity, new Set(entry.variants.map((variant) => slugify(variant.form))));
    }
  }

  // Substitutes may link only an identity already written: one in an earlier
  // shard, or in this one.
  const seeded = new Set<string>();
  for (const shard of shards) {
    for (const entry of shard.entries) seeded.add(identityOf(entry));
    const sources = { ...works, ...shard.sources };
    for (const entry of shard.entries) {
      checkEntry(entry, `${shard.name}: ${entry.name}`, sources, curated, seeded, formsOf, issues);
    }
  }

  return issues;
}

function checkEntry(
  entry: SeedCompendiumEntry,
  where: string,
  sources: Record<string, CitationFields>,
  curated: CuratedNames,
  seeded: ReadonlySet<string>,
  formsOf: ReadonlyMap<string, ReadonlySet<string>>,
  issues: string[],
): void {
  const identity = identityOf(entry);

  // The formal name against the naming system: the database CHECK's three
  // cases, made stricter for `unknown`, which the seed writes without a name
  // (README, "Formal names").
  const named = entry.canonicalName !== undefined && entry.canonicalName !== null;
  if (entry.nomenclature === 'none' || entry.nomenclature === 'unknown') {
    if (named) issues.push(`${where} is "${entry.nomenclature}" but carries a formal name.`);
  } else if (!named || entry.canonicalName?.trim() === '') {
    issues.push(`${where} is "${entry.nomenclature}" but carries no formal name.`);
  } else if (TAXONOMIC.has(entry.nomenclature) && !TAXON.test(entry.canonicalName as string)) {
    issues.push(`${where}'s formal name "${entry.canonicalName}" is not a taxon's shape.`);
  }

  const words = wordsIn(entry.description ?? '');
  if (words < ENTRY_WORDS.min || words > ENTRY_WORDS.max) {
    issues.push(
      `${where}'s description is ${words} words, outside ${ENTRY_WORDS.min} to ${ENTRY_WORDS.max}.`,
    );
  }

  checkValues(entry, where, curated, issues);
  checkDeities(entry, where, curated, issues);
  for (const field of ['folkNames', 'deities'] as const) {
    for (const value of repeats(entry[field] ?? []))
      issues.push(`${where} repeats ${field} "${value}".`);
  }
  checkSubstitutes(entry.substitutes ?? [], where, identity, null, seeded, formsOf, issues);
  checkCitations(entry.references, populatedEntryFields(entry), where, sources, issues);

  if (entry.variants.length === 0)
    issues.push(`${where} has no form: its primary form is a variant.`);
  for (const value of repeats(entry.variants.map((variant) => variant.form))) {
    issues.push(`${where} lists the form "${value}" twice.`);
  }
  for (const variant of entry.variants) {
    const at = `${where} (${variant.form})`;
    if (!curated.forms.has(slugify(variant.form))) {
      issues.push(`${at}: "${variant.form}" is not a curated form.`);
    }
    if (variant.description && wordsIn(variant.description) > VARIANT_WORDS_MAX) {
      issues.push(
        `${at}'s description is ${wordsIn(variant.description)} words, over ${VARIANT_WORDS_MAX}.`,
      );
    }
    checkValues(variant, at, curated, issues);
    checkSubstitutes(
      variant.substitutes ?? [],
      at,
      identity,
      slugify(variant.form),
      seeded,
      formsOf,
      issues,
    );
    checkCitations(variant.references, populatedVariantFields(variant), at, sources, issues);
  }
}

/** The four lists and the categories, each value on its closed list and none repeated. */
function checkValues(
  row: Pick<
    SeedCompendiumVariant,
    'elements' | 'celestialBodies' | 'zodiacSigns' | 'colors' | 'categories'
  >,
  where: string,
  curated: CuratedNames,
  issues: string[],
): void {
  const lists: [string, readonly string[] | null | undefined, (value: string) => boolean][] = [
    ['celestialBody', row.celestialBodies, (value) => curated.celestialBodies.has(slugify(value))],
    ['zodiac sign', row.zodiacSigns, (value) => curated.zodiacSigns.has(slugify(value))],
    ['colour', row.colors, (value) => (COLOURS as readonly string[]).includes(value)],
    ['category', row.categories, (value) => curated.categories.has(slugify(value))],
    // The type holds an element to the enum; only a repeat is the guard's.
    ['element', row.elements, () => true],
  ];
  for (const [noun, values, onList] of lists) {
    for (const value of values ?? []) {
      if (!onList(value)) issues.push(`${where}: "${value}" is not a curated ${noun}.`);
    }
    for (const value of repeats(values ?? []))
      issues.push(`${where} repeats the ${noun} "${value}".`);
  }
}

function checkDeities(
  entry: SeedCompendiumEntry,
  where: string,
  curated: CuratedNames,
  issues: string[],
): void {
  for (const deity of entry.deities ?? []) {
    if (!curated.deities.has(slugify(deity)))
      issues.push(`${where}: "${deity}" is not a curated deity.`);
  }
}

function checkSubstitutes(
  substitutes: readonly SeedSubstitute[],
  where: string,
  identity: string,
  ownForm: string | null,
  seeded: ReadonlySet<string>,
  formsOf: ReadonlyMap<string, ReadonlySet<string>>,
  issues: string[],
): void {
  for (const substitute of substitutes) {
    if (!('identity' in substitute)) {
      if (substitute.name.trim() === '') issues.push(`${where} names a blank substitute.`);
      continue;
    }
    const form = substitute.form === undefined ? null : slugify(substitute.form);
    // A form's linked substitute names a form, as the service holds it
    // (MB.115); the ingredient's own list may link an ingredient whole.
    if (ownForm !== null && form === null) {
      issues.push(
        `${where}: substitute "${substitute.identity}" links no form; a form's link names one.`,
      );
    }
    if (!seeded.has(substitute.identity)) {
      issues.push(
        `${where}: substitute "${substitute.identity}" is no identity this shard or an earlier one seeds.`,
      );
    } else if (form !== null && !formsOf.get(substitute.identity)?.has(form)) {
      issues.push(
        `${where}: substitute "${substitute.identity}" has no form "${substitute.form}".`,
      );
    }
    if (substitute.identity === identity && form === ownForm) {
      issues.push(`${where} names itself as its own substitute.`);
    }
  }
}

/**
 * The owner's rule as code: at least one citation, each naming a source that
 * resolves, a book or chapter with its locator, no source cited twice on one
 * row, and every populated field supported by some citation.
 */
function checkCitations<Field extends string>(
  citations: readonly SeedCitation<Field>[],
  populated: readonly Field[],
  where: string,
  sources: Record<string, CitationFields>,
  issues: string[],
): void {
  if (citations.length === 0) {
    issues.push(`${where} cites no source.`);
    return;
  }
  const cited = new Set<string>();
  for (const citation of citations) {
    const source = sources[citation.source];
    if (cited.has(citation.source)) issues.push(`${where} cites "${citation.source}" twice.`);
    cited.add(citation.source);
    if (source === undefined) {
      issues.push(`${where} cites "${citation.source}", which no work or shard source declares.`);
      continue;
    }
    const locator = citation.locator?.trim() ?? '';
    if ((source.kind === 'book' || source.kind === 'chapter') && locator === '') {
      issues.push(`${where} cites the ${source.kind} "${citation.source}" with no locator.`);
    }
    if (citation.locator !== undefined && locator === '') {
      issues.push(`${where} cites "${citation.source}" with a blank locator.`);
    }
  }
  const supported = new Set(citations.flatMap((citation) => citation.supports));
  for (const field of populated) {
    if (!supported.has(field)) issues.push(`${where}: no citation supports ${field}.`);
  }
}
