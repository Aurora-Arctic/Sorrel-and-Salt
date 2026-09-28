import { z } from 'zod';
import {
  INGREDIENT_ELEMENTS,
  NAMELESS_KINDS,
  NOMENCLATURE_KINDS,
  type NomenclatureKind,
} from '../schema/ingredient-enums';

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
 * must count the rows the form sent — and dropped by `dropBlankEntries` after.
 */
const textList = z.array(z.string().trim()).nullish();

const withoutBlanks = (list: string[] | null | undefined) =>
  list == null ? list : list.filter((entry) => entry !== '');

const dropBlankEntries = <T extends Lists>(value: T): T => ({
  ...value,
  deities: withoutBlanks(value.deities),
  substitutes: withoutBlanks(value.substitutes),
  folkNames: withoutBlanks(value.folkNames),
});

interface Lists {
  deities?: string[] | null;
  substitutes?: string[] | null;
  folkNames?: string[] | null;
}

const fields = {
  name: requiredText('Give the ingredient a name'),
  canonicalName: optionalText,
  form: optionalText,
  description: optionalText,
  element: z.enum(INGREDIENT_ELEMENTS, { error: 'Choose one of the five elements' }).nullish(),
  // Free text like `form`: the `planets` and `zodiac_signs` vocabularies
  // suggest, nothing refuses.
  planet: optionalText,
  zodiac: optionalText,
  deities: textList,
  color: optionalText,
  safetyNotes: optionalText,
  substitutes: textList,
  folkNames: textList,
};

const nomenclature = z.enum(NOMENCLATURE_KINDS, {
  error: (issue) =>
    issue.input === undefined || issue.input === null
      ? 'Choose a naming system — or "none" or "unknown"'
      : 'Not a naming system',
});

interface Parsed {
  name: string;
  canonicalName?: string | null;
  nomenclature: NomenclatureKind;
  folkNames?: string[] | null;
}

/**
 * The rules across fields: the database's kind↔name biconditional, in both
 * directions, and a folk name that is neither the name nor another folk name.
 */
function crossFieldRules(value: Parsed, ctx: z.RefinementCtx) {
  const nameless = NAMELESS_KINDS.includes(value.nomenclature);
  const named = value.canonicalName != null;
  if (nameless && named) {
    ctx.addIssue({
      code: 'custom',
      path: ['canonicalName'],
      message: `A "${value.nomenclature}" entry carries no formal name — clear it, or choose the naming system it belongs to`,
    });
  } else if (!nameless && !named) {
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
}

/**
 * The compendium tier: the admin answers `nomenclature` explicitly, since
 * every compendium entry declares one (§5).
 */
export const CompendiumIngredientInput = z
  .object({ ...fields, nomenclature })
  .superRefine(crossFieldRules)
  .transform(dropBlankEntries);

/**
 * The workspace tier: only `name` is required. With no formal name and no
 * kind, `nomenclature` is `none`, so story 29's one-field stub saves; a formal
 * name without a kind is asked about rather than guessed.
 */
export const LocalIngredientInput = z
  .object({ ...fields, nomenclature: nomenclature.optional() })
  .transform((value, ctx) => {
    if (value.nomenclature) return { ...value, nomenclature: value.nomenclature };
    if (value.canonicalName == null) return { ...value, nomenclature: 'none' as const };
    ctx.addIssue({
      code: 'custom',
      path: ['nomenclature'],
      message: 'Choose the naming system this formal name belongs to',
    });
    return z.NEVER;
  })
  .superRefine(crossFieldRules)
  .transform(dropBlankEntries);

export type CompendiumIngredientInput = z.output<typeof CompendiumIngredientInput>;
export type LocalIngredientInput = z.output<typeof LocalIngredientInput>;
