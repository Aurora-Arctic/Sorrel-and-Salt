import { z } from 'zod';
import {
  INGREDIENT_ELEMENTS,
  NAMELESS_KIND,
  NOMENCLATURE_KINDS,
  UNSETTLED_KIND,
} from '../schema/ingredient-enums';
import { RowId } from '../../../lib/validation';
import type { Lists, Parsed, SubstituteEntry, SubstituteFields } from './types';

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
  deities: withoutBlanks(value.deities),
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

/** Each entry as the one half it carries, once `substituteRules` has held it to one. */
function asEntries<T extends { substitutes?: SubstituteFields[] | null }>(
  value: T,
): Omit<T, 'substitutes'> & { substitutes?: SubstituteEntry[] } {
  return {
    ...value,
    substitutes: value.substitutes?.map(({ ingredientId, name }): SubstituteEntry =>
      ingredientId ? { ingredientId, name: null } : { ingredientId: null, name: name ?? '' },
    ),
  };
}

const fields = {
  name: requiredText('Give the ingredient a name'),
  canonicalName: optionalText,
  form: optionalText,
  description: optionalText,
  elements: elementList,
  // Lists of free text like `form`'s one value: the `planets` and
  // `zodiac_signs` vocabularies suggest, nothing refuses (MB.134).
  planets: textList,
  zodiacSigns: textList,
  deities: textList,
  colors: textList,
  safetyNotes: optionalText,
  substitutes: z.array(substitute).nullish(),
  folkNames: textList,
};

const nomenclature = z.enum(NOMENCLATURE_KINDS, {
  error: (issue) =>
    issue.input === undefined || issue.input === null
      ? 'Choose a classification — or "none" or "unknown"'
      : 'Not a classification',
});

/**
 * The rules across fields: the database's kind↔name CHECK — `none` takes no
 * formal name, a named kind needs one, `unknown` takes either — and a folk
 * name that is neither the name nor another folk name.
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

  substituteRules(value.substitutes ?? [], ctx);
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
