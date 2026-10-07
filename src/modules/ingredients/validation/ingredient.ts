import { z } from 'zod';
import {
  INGREDIENT_ELEMENTS,
  NAMELESS_KIND,
  NOMENCLATURE_KINDS,
  UNSETTLED_KIND,
} from '../schema/ingredient-enums';
import { RowId } from '../../../lib/validation';
import { formatLocator } from './reference-format';
import type {
  DeityEntry,
  DeityFields,
  Lists,
  Parsed,
  ReferenceLinkEntry,
  ReferenceLinkFields,
  SubstituteEntry,
  SubstituteFields,
} from './types';

// One ingredient as IngredientForm submits it and the service parses it: the
// resolver runs these before a request is sent, and the service runs them
// again because the browser is not the only caller. Two variants, one per
// tier — see claude-docs/validation.md, "The two ingredient variants".

/** Required text: trimmed, and blank is refused — as missing, not as a value. */
const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, { error: message });

/**
 * Optional text: trimmed, and a blank is an absence rather than an error —
 * '' is what a form sends for a field nobody touched, so it becomes null,
 * which the CHECKs on `canonical_name` and `form` accept. No format regex —
 * §5's formal names defeat one.
 */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => (value === '' ? null : value));

/**
 * Blank entries are kept through the cross-field rules — an issue's index
 * must count the rows the form sent — and dropped by `dropBlankEntries` after,
 * which takes a list left with none as absent, as a blank text field is.
 */
const textList = z.array(z.string().trim()).nullish();

function withoutBlanks<T extends string>(list: T[] | null | undefined) {
  if (list == null) return list;
  const entries = list.filter((entry) => entry !== '');
  return entries.length > 0 ? entries : null;
}

const dropBlankEntries = <T extends Lists>(value: T): T => ({
  ...value,
  elements: withoutBlanks(value.elements),
  planets: withoutBlanks(value.planets),
  zodiacSigns: withoutBlanks(value.zodiacSigns),
  colors: withoutBlanks(value.colors),
  folkNames: withoutBlanks(value.folkNames),
});

/**
 * Closed, unlike the lists above: the five values and nothing typed (DESIGN.md
 * §5, MB.157). Kept in the order chosen, never sorted, and each element once —
 * a repeat is refused at the repeat rather than dropped, since the form never
 * offers a chosen element twice, so one arriving is a caller to correct.
 */
const elementList = z
  .array(z.enum(INGREDIENT_ELEMENTS, { error: 'Choose one of the five elements' }))
  .superRefine((elements, ctx) => {
    elements.forEach((element, index) => {
      if (elements.indexOf(element) === index) return;
      ctx.addIssue({
        code: 'custom',
        path: [index],
        message: `${element[0]?.toUpperCase()}${element.slice(1)} is already chosen`,
      });
    });
  })
  .nullish();

/**
 * A substitute links an ingredient or names one (DESIGN.md §5,
 * `ingredient_substitutes`): either half trimmed, and blank as absent, so
 * `substituteRules` decides between them. A blank entry is refused rather
 * than dropped, so a service's refusal, made after the parse, still counts
 * the entries the caller sent.
 */
const substitute = z.object({ ingredientId: optionalText, name: optionalText });

/**
 * A deity links the curated one picked or names one (DESIGN.md §5,
 * `ingredient_deities`), as a substitute does, and is refused rather than
 * dropped when blank for the same reason: its index is its position.
 */
const deity = z.object({ deityId: optionalText, name: optionalText });

/**
 * A reference the ingredient cites (DESIGN.md §7): an existing reference's id,
 * trimmed, and its locator, blank as none — every place the source is cited
 * at, in one, tidied and its ranges dashed as the form shows it (MB.154). The id is required, as
 * `ReferenceLinkInput`'s `ID!` is; a blank one is refused by `referenceRules`
 * rather than dropped, as a blank substitute is, so a service's refusal counts
 * the entries the caller sent.
 */
const referenceLink = z.object({
  referenceId: z.string({ error: 'Choose a source' }).trim(),
  locator: optionalText.transform((value) => (value == null ? value : formatLocator(value))),
});

/**
 * Each substitute and deity as the one half it carries, once
 * `substituteRules` and `deityRules` have held it to one, and each reference
 * as its id and locator, once `referenceRules` has held it to an id.
 */
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
    substitutes: value.substitutes?.map(({ ingredientId, name }): SubstituteEntry =>
      ingredientId ? { ingredientId, name: null } : { ingredientId: null, name: name ?? '' },
    ),
    deities: value.deities?.map(({ deityId, name }): DeityEntry =>
      deityId ? { deityId, name: null } : { deityId: null, name: name ?? '' },
    ),
    references: value.references?.map(({ referenceId, locator }): ReferenceLinkEntry => ({
      referenceId,
      locator: locator ?? null,
    })),
  };
}

const fields = {
  name: requiredText('Give the ingredient a name'),
  canonicalName: optionalText,
  form: optionalText,
  // The curated form picked, beside its text (MB.165): whether it names one,
  // and the text that row's name, are the service's to read.
  formId: optionalText,
  description: optionalText,
  elements: elementList,
  // Lists of free text like `form`'s one value (MB.134): the vocabularies
  // suggest, and nothing here refuses — the compendium service holds its tier
  // to them against the database (MB.162), and a coven's stay free text.
  planets: textList,
  zodiacSigns: textList,
  deities: z.array(deity).nullish(),
  colors: textList,
  safetyNotes: optionalText,
  substitutes: z.array(substitute).nullish(),
  references: z.array(referenceLink).nullish(),
  folkNames: textList,
  // The categories it is filed under (MB.125): whether each names a live
  // category is the service's to read, and a repeat is written once there.
  categoryIds: z.array(z.string().trim()).nullish(),
};

const nomenclature = z.enum(NOMENCLATURE_KINDS, {
  error: (issue) =>
    issue.input === undefined || issue.input === null
      ? 'Choose a classification — or "none" or "unknown"'
      : 'Not a classification',
});

/**
 * The rules across fields: the database's kind↔name CHECK — `none` takes no
 * formal name, a named kind needs one, `unknown` takes either — a folk name
 * that is neither the name nor another folk name, a picked form with its
 * text, and each list entry once.
 */
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

  // Case-folded to match the lower(name) unique index on folk names.
  const seen = new Set<string>();
  let nameRepeated = false;
  (value.folkNames ?? []).forEach((folkName, index) => {
    if (folkName === '') return;
    const key = folkName.toLowerCase();
    if (key === value.name.toLowerCase()) nameRepeated = true;
    else if (seen.has(key)) {
      ctx.addIssue({
        code: 'custom',
        path: ['folkNames', index],
        message: 'This folk name is already listed',
      });
    }
    seen.add(key);
  });
  if (nameRepeated) {
    ctx.addIssue({
      code: 'custom',
      path: ['name'],
      message: 'The name is also listed as a folk name — keep it in one place',
    });
  }

  formRules(value, ctx);
  for (const field of ['planets', 'zodiacSigns', 'colors'] as const) {
    refuseRepeats(field, value[field] ?? [], ctx);
  }
  substituteRules(value.substitutes ?? [], ctx);
  deityRules(value.deities ?? [], ctx);
  referenceRules(value.references ?? [], ctx);
  categoryRules(value.categoryIds ?? [], ctx);
}

/**
 * A picked form is an id, and stands beside its text, as
 * `ingredients_form_id_has_form` holds it; whether the text is that row's name
 * is read against the database by the service (MB.167).
 */
function formRules({ form, formId }: Parsed, ctx: z.RefinementCtx) {
  if (formId == null) return;
  // Not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(formId).success) {
    ctx.addIssue({ code: 'custom', path: ['formId'], message: 'No such form to pick' });
  } else if (form == null) {
    ctx.addIssue({ code: 'custom', path: ['form'], message: 'Name the form you picked' });
  }
}

/**
 * Each entry of an ordered list once, folded as folk names are: a repeat but
 * for case and spacing is refused at the repeat, at the row the form sent it
 * in, blanks counted (MB.167).
 */
function refuseRepeats(field: string, entries: readonly string[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (entry === '') return;
    const key = entry.toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: [field, index], message: 'This is already listed' });
    }
    seen.add(key);
  });
}

/**
 * Each deity is exactly one of a link and a name, and listed once: the same
 * deity linked twice, or the same name typed twice in any case — the two
 * partial unique indexes' keys — is refused at the repeat. Links to two
 * deities sharing a name are two deities, and a typed name equal to a linked
 * one's is text beside a link, so neither is a repeat (MB.165).
 */
function deityRules(entries: DeityFields[], ctx: z.RefinementCtx) {
  const refuse = (index: number, message: string) =>
    ctx.addIssue({ code: 'custom', path: ['deities', index], message });
  const links = new Set<string>();
  const names = new Set<string>();

  entries.forEach(({ deityId, name }, index) => {
    if (deityId && name) {
      refuse(index, 'A deity is picked or typed, not both');
    } else if (deityId) {
      if (!RowId.safeParse(deityId).success) refuse(index, 'No such deity to pick');
      else if (links.has(deityId)) refuse(index, 'This deity is already listed');
      links.add(deityId);
    } else if (name) {
      const key = name.toLowerCase();
      if (names.has(key)) refuse(index, 'This deity is already listed');
      names.add(key);
    } else {
      refuse(index, 'Name the deity, or pick one');
    }
  });
}

/**
 * Each substitute is exactly one of a link and a name, and listed once: the
 * same ingredient twice, or the same name in any case — the two partial
 * unique indexes' keys — is refused at the repeat. A name equal to a linked
 * ingredient's label is not a repeat, since one is text and the other a link.
 */
function substituteRules(entries: SubstituteFields[], ctx: z.RefinementCtx) {
  const refuse = (index: number, message: string) =>
    ctx.addIssue({ code: 'custom', path: ['substitutes', index], message });
  const links = new Set<string>();
  const names = new Set<string>();

  entries.forEach(({ ingredientId, name }, index) => {
    if (ingredientId && name) {
      refuse(index, 'A substitute links an ingredient or names one, not both');
    } else if (ingredientId) {
      // Not a uuid names nothing, and would be a driver error at the comparison.
      if (!RowId.safeParse(ingredientId).success) refuse(index, 'No such ingredient to link');
      else if (links.has(ingredientId)) refuse(index, 'This ingredient is already listed');
      links.add(ingredientId);
    } else if (name) {
      const key = name.toLowerCase();
      if (names.has(key)) refuse(index, 'This substitute is already listed');
      names.add(key);
    } else {
      refuse(index, 'Name the substitute, or choose an ingredient');
    }
  });
}

/**
 * Each reference names one by its id, and is listed once whatever its locator:
 * `reference_links_ingredient_unique`'s key, refused at the repeat.
 */
function referenceRules(entries: ReferenceLinkFields[], ctx: z.RefinementCtx) {
  const refuse = (index: number, message: string) =>
    ctx.addIssue({ code: 'custom', path: ['references', index], message });
  const listed = new Set<string>();

  entries.forEach(({ referenceId }, index) => {
    if (!referenceId) refuse(index, 'Choose a source');
    // Not a uuid names nothing, and would be a driver error at the comparison.
    else if (!RowId.safeParse(referenceId).success) refuse(index, 'No such source');
    else if (listed.has(referenceId)) refuse(index, 'This source is already listed');
    else listed.add(referenceId);
  });
}

/**
 * Each category is an id. A repeat is not refused, unlike a reference's: a
 * category is a chip, on or off, so one sent twice is one, and the service
 * writes it once.
 */
function categoryRules(ids: readonly string[], ctx: z.RefinementCtx) {
  ids.forEach((id, index) => {
    // Not a uuid names nothing, and would be a driver error at the comparison.
    if (!RowId.safeParse(id).success) {
      ctx.addIssue({ code: 'custom', path: ['categoryIds', index], message: 'No such category' });
    }
  });
}

/**
 * The compendium tier: the admin answers `nomenclature` explicitly, since
 * every compendium entry declares one (§5).
 */
export const CompendiumIngredientInput = z
  .object({ ...fields, nomenclature })
  .superRefine(crossFieldRules)
  .transform(dropBlankEntries)
  .transform(asEntries);

/**
 * The workspace tier: only `name` is required. With no kind, absent or null,
 * `nomenclature` is `none` when there is no formal name either, so story 29's
 * one-field stub saves, and `unknown` when there is one (MB.161): `none`
 * would contradict the name and `botanical` would guess its system.
 */
export const LocalIngredientInput = z
  .object({ ...fields, nomenclature: nomenclature.nullish() })
  .transform((value) => ({
    ...value,
    nomenclature:
      value.nomenclature ?? (value.canonicalName == null ? NAMELESS_KIND : UNSETTLED_KIND),
  }))
  .superRefine(crossFieldRules)
  .transform(dropBlankEntries)
  .transform(asEntries);

export type CompendiumIngredientInput = z.output<typeof CompendiumIngredientInput>;
export type LocalIngredientInput = z.output<typeof LocalIngredientInput>;
