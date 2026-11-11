import { z } from 'zod';
import {
  CITED_ENTRY_FIELDS,
  CITED_VARIANT_FIELDS,
  NAME_BASES,
  NAMELESS_KIND,
  NOMENCLATURE_KINDS,
  UNSETTLED_KIND,
} from '../schema/ingredient-enums';
import { trimEnds } from '../../../lib/formats';
import { isRowId, optionalText, requiredText } from '../../../lib/validation';
import { elementArray, textEntries } from './lists';
import { formatLocator } from './reference-format';
import type {
  DeityEntry,
  DeityFields,
  LinkOrName,
  LinkOrNameFields,
  LinkOrNameMessages,
  Lists,
  Parsed,
  ReferenceLinkEntry,
  ReferenceLinkFields,
  SubstituteEntry,
  SubstituteFields,
  VariantFields,
} from './types';

// Both parse it, since the browser is not the only caller (claude-docs/validation.md, "The two ingredient variants").

/** Blank entries stay through the cross-field rules so an issue's index counts the rows sent; `dropBlankEntries` then drops them, and a list left with none is absent. */
const textList = textEntries.nullish();

const nonBlank = <T extends string>(list: T[]) => list.filter((entry) => entry !== '');

function withoutBlanks<T extends string>(list: T[] | null | undefined) {
  if (list == null) return list;
  const entries = nonBlank(list);
  return entries.length > 0 ? entries : null;
}

const dropBlankEntries = <T extends Lists>(value: T): T => ({
  ...value,
  elements: withoutBlanks(value.elements),
  celestialBodies: withoutBlanks(value.celestialBodies),
  zodiacSigns: withoutBlanks(value.zodiacSigns),
  colors: withoutBlanks(value.colors),
  folkNames: withoutBlanks(value.folkNames),
});

const elementList = elementArray.nullish();

/** A substitute links an ingredient or names one (DESIGN.md §5, `ingredient_substitutes`): halves trimmed and blank as absent, a blank entry refused later so the service's refusal still counts the rows sent. */
const substitute = z.object({
  ingredientId: optionalText(),
  // Whether the form named is a form of the linked ingredient reads the database, so it is the service's.
  substituteVariantId: optionalText(),
  name: optionalText(),
});

/** A deity links the curated one picked or names one (DESIGN.md §5, `ingredient_deities`), refused rather than dropped when blank, as its index is its position. */
const deity = z.object({ deityId: optionalText(), name: optionalText() });

/**
 * A reference the ingredient cites (DESIGN.md §7): an existing reference's id and its locator, tidied with ranges dashed. A blank id is refused by `referenceRules` rather than dropped, so the service's refusal counts the rows sent.
 * `nameBasis` and `supports` are a compendium citation's; `covenCitationRules` refuses them on a coven's.
 */
const referenceLink = z.object({
  referenceId: z.string({ error: 'Choose a source' }).trim(),
  locator: optionalText(formatLocator),
  nameBasis: z.enum(NAME_BASES, { error: 'Not a name basis' }).nullish(),
  supports: z.array(z.string().trim()).nullish(),
});

function asLinkOrName<IdKey extends string>(
  idKey: IdKey,
  entries: LinkOrNameFields<IdKey>[],
): LinkOrName<IdKey>[];
function asLinkOrName<IdKey extends string>(
  idKey: IdKey,
  entries: LinkOrNameFields<IdKey>[] | null | undefined,
): LinkOrName<IdKey>[] | undefined;
function asLinkOrName<IdKey extends string>(
  idKey: IdKey,
  entries: LinkOrNameFields<IdKey>[] | null | undefined,
): LinkOrName<IdKey>[] | undefined {
  // A computed key widens to a string index, so the shape is asserted back.
  return entries?.map((entry) => {
    const id = entry[idKey];
    return (
      id ? { [idKey]: id, name: null } : { [idKey]: null, name: entry.name ?? '' }
    ) as LinkOrName<IdKey>;
  });
}

function asSubstitutes(entries: SubstituteFields[]): SubstituteEntry[] {
  return asLinkOrName('ingredientId', entries).map((entry, index) => ({
    ...entry,
    substituteVariantId: entry.ingredientId ? (entries[index].substituteVariantId ?? null) : null,
  }));
}

function asReferences(entries: ReferenceLinkFields[]): ReferenceLinkEntry[] {
  return entries.map(({ referenceId, locator, nameBasis, supports }) => ({
    referenceId,
    locator: locator ?? null,
    nameBasis: nameBasis ?? null,
    supports: supports ? [...new Set(supports)] : null,
  }));
}

function asEntries<
  T extends {
    substitutes?: SubstituteFields[] | null;
    deities?: DeityFields[] | null;
    references?: ReferenceLinkFields[] | null;
  },
>(
  value: T,
): Omit<T, 'substitutes' | 'deities' | 'references'> & {
  substitutes?: SubstituteEntry[];
  deities?: DeityEntry[];
  references?: ReferenceLinkEntry[];
} {
  return {
    ...value,
    substitutes: value.substitutes ? asSubstitutes(value.substitutes) : undefined,
    deities: asLinkOrName('deityId', value.deities),
    references: value.references ? asReferences(value.references) : undefined,
  };
}

/**
 * One form the ingredient comes in (DESIGN.md §5, `ingredient_variants`) with its own lists, each held to the ingredient's rules and pathed beneath the variant.
 * `id` names a form already held; every other field is sent (`""` or `[]` for none) because an entry replaces its row, and `resolvePicks` reads each as none.
 */
const variant = z
  .object({
    id: optionalText(),
    form: requiredText('Name the form'),
    formId: z.string().trim(),
    description: z.string().trim(),
    safetyNotes: z.string().trim(),
    // Its own flag, never its ingredient's; sent whole, as the rest is.
    toxic: z.boolean(),
    elements: elementArray,
    celestialBodies: z.array(z.string().trim()),
    zodiacSigns: z.array(z.string().trim()),
    colors: z.array(z.string().trim()),
    categoryIds: z.array(z.string().trim()),
    substitutes: z.array(substitute),
    references: z.array(referenceLink),
  })
  .superRefine((value, ctx) => {
    // Not a uuid names nothing and would be a driver error at the comparison.
    for (const key of ['id', 'formId'] as const) {
      const id = value[key];
      if (id && !isRowId(id)) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'No such form' });
      }
    }
    for (const field of ['celestialBodies', 'zodiacSigns', 'colors'] as const) {
      refuseRepeats(field, value[field], ctx);
    }
    substituteRules(value.substitutes, ctx);
    formLinkRules(value.substitutes, ctx);
    referenceRules(value.references, CITED_VARIANT_FIELDS, ctx);
    categoryRules(value.categoryIds, ctx);
  })
  .transform((value) => ({
    ...value,
    celestialBodies: nonBlank(value.celestialBodies),
    zodiacSigns: nonBlank(value.zodiacSigns),
    colors: nonBlank(value.colors),
    substitutes: asSubstitutes(value.substitutes),
    references: asReferences(value.references),
  }));

const fields = {
  name: requiredText('Give the ingredient a name'),
  // No format regex: §5's formal names defeat one.
  canonicalName: optionalText(),
  description: optionalText(trimEnds),
  elements: elementList,
  // Free text lists like a form: the vocabularies suggest and nothing here refuses; the compendium service holds its tier to them, and a coven's stay free text.
  celestialBodies: textList,
  zodiacSigns: textList,
  deities: z.array(deity).nullish(),
  colors: textList,
  safetyNotes: optionalText(trimEnds),
  // The ingredient's own flag, independent of each form's; absent on a create is off.
  toxic: z.boolean().nullish(),
  substitutes: z.array(substitute).nullish(),
  references: z.array(referenceLink).nullish(),
  folkNames: textList,
  // The categories it is filed under: whether each is live is the service's to read, and a repeat is written once.
  categoryIds: z.array(z.string().trim()).nullish(),
  // Its forms, the only place a form is written; absent is none, as for every child list.
  variants: z.array(variant).nullish(),
};

const nomenclature = z.enum(NOMENCLATURE_KINDS, {
  error: (issue) =>
    issue.input === undefined || issue.input === null
      ? 'Choose a classification — or "none" or "unknown"'
      : 'Not a classification',
});

function crossFieldRules(value: Parsed, ctx: z.RefinementCtx) {
  const kind = value.nomenclature;
  const named = value.canonicalName != null;
  // `unknown` is neither branch: a name it carries is unconfirmed, not refused.
  if (kind === NAMELESS_KIND && named) {
    ctx.addIssue({
      code: 'custom',
      path: ['canonicalName'],
      message: `A "${value.nomenclature}" entry carries no formal name — clear it, or choose the classification it belongs to`,
    });
  } else if (kind !== NAMELESS_KIND && kind !== UNSETTLED_KIND && !named) {
    ctx.addIssue({
      code: 'custom',
      path: ['canonicalName'],
      message: `A ${value.nomenclature} entry needs its formal name`,
    });
  }

  // Case-folded to match the lower(name) unique index on folk names. A folk
  // name that is the name is refused once, at the name, rather than as a repeat.
  const folkNames = value.folkNames ?? [];
  const nameKey = value.name.toLowerCase();
  for (const index of repeatsOf(folkNames)) {
    if (folkNames[index].toLowerCase() === nameKey) continue;
    ctx.addIssue({
      code: 'custom',
      path: ['folkNames', index],
      message: 'This folk name is already listed',
    });
  }
  if (folkNames.some((folkName) => folkName !== '' && folkName.toLowerCase() === nameKey)) {
    ctx.addIssue({
      code: 'custom',
      path: ['name'],
      message: 'The name is also listed as a folk name — keep it in one place',
    });
  }

  for (const field of ['celestialBodies', 'zodiacSigns', 'colors'] as const) {
    refuseRepeats(field, value[field] ?? [], ctx);
  }
  substituteRules(value.substitutes ?? [], ctx);
  deityRules(value.deities ?? [], ctx);
  referenceRules(value.references ?? [], CITED_ENTRY_FIELDS, ctx);
  categoryRules(value.categoryIds ?? [], ctx);
  variantRules(value.variants ?? [], ctx);
}

function variantRules(entries: readonly VariantFields[], ctx: z.RefinementCtx) {
  for (const index of repeatsOf(entries.map((entry) => entry.form))) {
    ctx.addIssue({
      code: 'custom',
      path: ['variants', index, 'form'],
      message: 'This form is already listed',
    });
  }
  const ids = new Set<string>();
  entries.forEach(({ id }, index) => {
    if (id == null) return;
    if (ids.has(id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['variants', index, 'id'],
        message: 'This form is already listed',
      });
    }
    ids.add(id);
  });
}

function repeatsOf(entries: readonly string[]): number[] {
  const seen = new Set<string>();
  return entries.flatMap((entry, index) => {
    if (entry === '') return [];
    const key = entry.toLowerCase();
    if (seen.has(key)) return [index];
    seen.add(key);
    return [];
  });
}

function refuseRepeats(field: string, entries: readonly string[], ctx: z.RefinementCtx) {
  for (const index of repeatsOf(entries)) {
    ctx.addIssue({ code: 'custom', path: [field, index], message: 'This is already listed' });
  }
}

/**
 * A name equal to a linked row's is text beside a link, not a repeat; a link is compared as sent, as the index compares it.
 */
function linkOrNameRules<IdKey extends string>(
  field: string,
  idKey: IdKey,
  messages: LinkOrNameMessages,
) {
  return (entries: readonly LinkOrNameFields<IdKey>[], ctx: z.RefinementCtx) => {
    const refuse = (index: number, message: string) =>
      ctx.addIssue({ code: 'custom', path: [field, index], message });
    // Only an entry with no link is a name, so the rest count as blanks.
    const namesRepeated = new Set(
      repeatsOf(entries.map((entry) => (entry[idKey] ? '' : (entry.name ?? '')))),
    );
    const links = new Set<string>();

    entries.forEach((entry, index) => {
      const link = entry[idKey];
      if (link && entry.name) {
        refuse(index, messages.both);
      } else if (link) {
        // Not a uuid names nothing and would be a driver error at the comparison.
        if (!isRowId(link)) refuse(index, messages.noSuchLink);
        else if (links.has(link)) refuse(index, messages.linkRepeated);
        links.add(link);
      } else if (entry.name) {
        if (namesRepeated.has(index)) refuse(index, messages.nameRepeated);
      } else {
        refuse(index, messages.neither);
      }
    });
  };
}

const deityRules = linkOrNameRules('deities', 'deityId', {
  both: 'A deity is picked or typed, not both',
  neither: 'Name the deity, or pick one',
  noSuchLink: 'No such deity to pick',
  linkRepeated: 'This deity is already listed',
  nameRepeated: 'This deity is already listed',
});

const substituteLinkRules = linkOrNameRules('substitutes', 'ingredientId', {
  both: 'A substitute links an ingredient or names one, not both',
  neither: 'Name the substitute, or choose an ingredient',
  noSuchLink: 'No such ingredient to link',
  linkRepeated: 'This ingredient is already listed',
  nameRepeated: 'This substitute is already listed',
});

/** Each substitute a link or a name, and a form it names an id beside a link, as `ingredient_substitutes_substitute_variant_has_link` holds it. */
function substituteRules(entries: readonly SubstituteFields[], ctx: z.RefinementCtx) {
  substituteLinkRules(entries, ctx);
  entries.forEach(({ ingredientId, substituteVariantId }, index) => {
    if (!substituteVariantId) return;
    const path = ['substitutes', index, 'substituteVariantId'];
    // Not a uuid names nothing and would be a driver error at the comparison.
    if (!isRowId(substituteVariantId)) {
      ctx.addIssue({ code: 'custom', path, message: 'No such form to pick' });
    } else if (!ingredientId) {
      ctx.addIssue({ code: 'custom', path, message: 'Choose the ingredient this is a form of' });
    }
  });
}

/** A variant's substitute that links an ingredient names one of its forms, so a link to the whole ingredient is refused; the ingredient's own list may still link it whole. */
function formLinkRules(entries: readonly SubstituteFields[], ctx: z.RefinementCtx) {
  entries.forEach(({ ingredientId, substituteVariantId }, index) => {
    if (!ingredientId || substituteVariantId) return;
    ctx.addIssue({
      code: 'custom',
      path: ['substitutes', index, 'substituteVariantId'],
      message: 'Link one of its forms: remove this, and pick the form from the list',
    });
  });
}

/**
 * Listed once whatever its locator (`reference_links_ingredient_unique`); supports only `fields`, the ones the row it cites has.
 */
function referenceRules(
  entries: ReferenceLinkFields[],
  fields: readonly string[],
  ctx: z.RefinementCtx,
) {
  const refuse = (index: number, message: string) =>
    ctx.addIssue({ code: 'custom', path: ['references', index], message });
  const listed = new Set<string>();

  entries.forEach(({ referenceId, supports }, index) => {
    if (!referenceId) refuse(index, 'Choose a source');
    // Not a uuid names nothing and would be a driver error at the comparison.
    else if (!isRowId(referenceId)) refuse(index, 'No such source');
    else if (listed.has(referenceId)) refuse(index, 'This source is already listed');
    else listed.add(referenceId);
    supports?.forEach((field, at) => {
      if (!fields.includes(field)) {
        ctx.addIssue({
          code: 'custom',
          path: ['references', index, 'supports', at],
          message: `Not a field this citation can support: choose from ${fields.join(', ')}`,
        });
      }
    });
  });
}

const COMPENDIUM_ONLY = {
  nameBasis: 'Only a compendium citation records how its source names the ingredient',
  supports: 'Only a compendium citation records the fields its source supports',
} as const;

function covenCitationRules(
  value: {
    references?: ReferenceLinkFields[] | null;
    variants?: { references: ReferenceLinkEntry[] }[] | null;
  },
  ctx: z.RefinementCtx,
) {
  const refuse = (at: (string | number)[], entries: readonly ReferenceLinkFields[]) =>
    entries.forEach((entry, index) => {
      for (const key of ['nameBasis', 'supports'] as const) {
        if (entry[key] != null) {
          ctx.addIssue({
            code: 'custom',
            path: [...at, 'references', index, key],
            message: COMPENDIUM_ONLY[key],
          });
        }
      }
    });
  refuse([], value.references ?? []);
  value.variants?.forEach((variant, index) => refuse(['variants', index], variant.references));
}

/** Each category is an id; a repeat is not refused, since a category is a chip, on or off, and the service writes it once. */
function categoryRules(ids: readonly string[], ctx: z.RefinementCtx) {
  ids.forEach((id, index) => {
    // Not a uuid names nothing and would be a driver error at the comparison.
    if (!isRowId(id)) {
      ctx.addIssue({ code: 'custom', path: ['categoryIds', index], message: 'No such category' });
    }
  });
}

/**
 * The admin answers `nomenclature` explicitly, since every compendium entry declares one (§5). `shown` left out: a create is shown (the column's default), an update leaves the flag as it is.
 */
export const CompendiumIngredientInput = z
  .object({ ...fields, nomenclature, shown: z.boolean().nullish() })
  .superRefine(crossFieldRules)
  .transform(dropBlankEntries)
  .transform(asEntries);

/** The workspace tier: only `name` is required. With no kind, `nomenclature` is `none` when there is no formal name and `unknown` when there is, since `none` would contradict the name and `botanical` would guess. */
export const LocalIngredientInput = z
  .object({
    ...fields,
    nomenclature: nomenclature.nullish(),
  })
  .transform((value) => ({
    ...value,
    nomenclature:
      value.nomenclature ?? (value.canonicalName == null ? NAMELESS_KIND : UNSETTLED_KIND),
  }))
  .superRefine(crossFieldRules)
  .superRefine(covenCitationRules)
  .transform(dropBlankEntries)
  .transform(asEntries);

export type CompendiumIngredientInput = z.output<typeof CompendiumIngredientInput>;
export type LocalIngredientInput = z.output<typeof LocalIngredientInput>;
