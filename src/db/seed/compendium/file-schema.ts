import { z } from 'zod';
import {
  INGREDIENT_ELEMENTS,
  NOMENCLATURE_KINDS,
} from '../../../modules/ingredients/schema/ingredient-enums';
import type {
  CompendiumEntryField,
  CompendiumVariantField,
  NameBasis,
  SeedCitation,
  SeedCompendiumEntry,
  SeedCompendiumVariant,
} from '../types';

// The frontmatter of a compendium entry file as strict zod schemas: an unnamed key is an issue, so a misspelt `celestialBodies` cannot silently drop
// a list (claude-docs/db/compendium-seed/README.md, "An entry, field by field"). The file spells `colours`, the row `colors`; `toEntry` is where they meet.

export const FILE_STATUSES = ['draft', 'needs-review', 'approved'] as const;
export const NAME_BASES = ['stated', 'resolved', 'unresolved', 'unaudited'] as const;

/** A `supports` name as a file spells it: the literal's names with `colours` for `colors`. */
const ENTRY_FIELDS_IN_FILE = [
  'name',
  'canonicalName',
  'nomenclature',
  'description',
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colours',
  'safetyNotes',
  'toxic',
  'folkNames',
  'deities',
  'categories',
  'substitutes',
] as const;

const VARIANT_FIELDS_IN_FILE = [
  'form',
  'description',
  'safetyNotes',
  'toxic',
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colours',
  'categories',
  'substitutes',
] as const;

const SHA256 = /^[0-9a-f]{64}$/;

const text = z.string().min(1);
const list = z.array(text).optional();
const elements = z.array(z.enum(INGREDIENT_ELEMENTS)).optional();

// `true` alone, as the seed type holds it: a written `false` would
// claim the thing is safe, which needs a source of its own, so the key is left
// out instead.
const flag = z
  .literal(true, { error: 'is `true` or left out: a written `false` claims safety' })
  .optional();

function citationSchema<const Field extends string>(fields: readonly [Field, ...Field[]]) {
  return z.strictObject({
    source: text,
    locator: text.optional(),
    supports: z.array(z.enum(fields)),
    nameBasis: z.enum(NAME_BASES).optional(),
    headedAs: text.optional(),
    resolvedBy: text.optional(),
  });
}

const substituteSchema = z.union([
  z.strictObject({ identity: text, form: text.optional() }),
  z.strictObject({ name: text }),
]);

const variantSchema = z.strictObject({
  form: text,
  description: text.optional(),
  toxic: flag,
  safetyNotes: text.optional(),
  elements,
  celestialBodies: list,
  zodiacSigns: list,
  colours: list,
  categories: list,
  substitutes: z.array(substituteSchema).optional(),
  references: z.array(citationSchema(VARIANT_FIELDS_IN_FILE)),
});

/**
 * The frontmatter, after `withoutBlanks`. `references` is optional here
 * because a list of blanks reads as absent; the parser requires the key and
 * reads an absent list as empty.
 */
export const frontmatterSchema = z.strictObject({
  status: z.enum(FILE_STATUSES),
  nomenclature: z.enum(NOMENCLATURE_KINDS),
  canonicalName: text.optional(),
  seedUpdate: z.string().regex(SHA256, { error: 'is 64 lower-case hex characters' }).optional(),
  overwriteEditor: z.literal(true, { error: 'is `true` or left out' }).optional(),
  toxic: flag,
  safetyNotes: text.optional(),
  elements,
  celestialBodies: list,
  zodiacSigns: list,
  colours: list,
  folkNames: list,
  deities: list,
  categories: list,
  substitutes: z.array(substituteSchema).optional(),
  references: z.array(citationSchema(ENTRY_FIELDS_IN_FILE)).optional(),
  variants: z.array(variantSchema).optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/** A citation as either schema validates it, before its `supports` names are mapped. */
interface FileCitation {
  source: string;
  locator?: string;
  supports: readonly string[];
  nameBasis?: NameBasis;
  headedAs?: string;
  resolvedBy?: string;
}

/**
 * What a YAML author writes to mean "nothing": `key:`, an empty `-`, `[null]`
 * or `[""]`. Each reads as absent, at any depth, and an object or list left
 * with nothing reads as absent too, so the template's `deities:\n  -` is fine.
 */
export function withoutBlanks(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  if (Array.isArray(value)) {
    const items = value.map(withoutBlanks).filter((item) => item !== undefined);
    return items.length === 0 ? undefined : items;
  }
  if (typeof value === 'object') {
    const kept: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      const item = withoutBlanks(inner);
      if (item !== undefined) kept[key] = item;
    }
    return Object.keys(kept).length === 0 ? undefined : kept;
  }
  return value;
}

/** `colours` to `colors`, in a `supports` list. */
function toColumnField(field: string): string {
  return field === 'colours' ? 'colors' : field;
}

function toCitation<Field extends string>(citation: FileCitation): SeedCitation<Field> {
  return {
    source: citation.source,
    ...(citation.locator === undefined ? {} : { locator: citation.locator }),
    // The file's names are the enum's, checked by the schema; only `colours` is respelt.
    supports: citation.supports.map(toColumnField) as Field[],
    ...(citation.nameBasis === undefined ? {} : { nameBasis: citation.nameBasis }),
    ...(citation.headedAs === undefined ? {} : { headedAs: citation.headedAs }),
    ...(citation.resolvedBy === undefined ? {} : { resolvedBy: citation.resolvedBy }),
  };
}

/** A key only when its value is there, so the entry built from a file equals a literal written by hand. */
function present<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: V });
}

function toVariant(variant: Frontmatter['variants'] extends (infer V)[] | undefined ? V : never) {
  const built: SeedCompendiumVariant = {
    form: variant.form,
    ...present('description', variant.description),
    ...present('safetyNotes', variant.safetyNotes),
    ...present('toxic', variant.toxic),
    ...present('elements', variant.elements),
    ...present('celestialBodies', variant.celestialBodies),
    ...present('zodiacSigns', variant.zodiacSigns),
    ...present('colors', variant.colours),
    ...present('categories', variant.categories),
    ...present('substitutes', variant.substitutes),
    references: variant.references.map((citation) => toCitation<CompendiumVariantField>(citation)),
  };
  return built;
}

/**
 * The entry the seed writes, from a validated frontmatter and the body's
 * name and description. The `colours` key becomes `colors`; a key the file
 * left out is left out here too.
 */
export function toEntry(
  frontmatter: Frontmatter,
  name: string,
  description: string | undefined,
): SeedCompendiumEntry {
  return {
    name,
    ...present('canonicalName', frontmatter.canonicalName),
    nomenclature: frontmatter.nomenclature,
    ...present('description', description),
    ...present('elements', frontmatter.elements),
    ...present('celestialBodies', frontmatter.celestialBodies),
    ...present('zodiacSigns', frontmatter.zodiacSigns),
    ...present('colors', frontmatter.colours),
    ...present('safetyNotes', frontmatter.safetyNotes),
    ...present('toxic', frontmatter.toxic),
    ...present('folkNames', frontmatter.folkNames),
    ...present('deities', frontmatter.deities),
    ...present('categories', frontmatter.categories),
    ...present('substitutes', frontmatter.substitutes),
    references: (frontmatter.references ?? []).map((citation) =>
      toCitation<CompendiumEntryField>(citation),
    ),
    variants: (frontmatter.variants ?? []).map(toVariant),
  };
}
