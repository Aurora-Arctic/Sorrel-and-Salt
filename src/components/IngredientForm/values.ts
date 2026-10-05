import { zodResolver } from '@hookform/resolvers/zod';
import { ClientError } from 'graphql-request';
import type { FieldError, FieldErrors, FieldPath, Resolver, UseFormReturn } from 'react-hook-form';
import type { ErrorExtensions } from '../../graphql/types';
import type { ValidationIssue } from '../../lib/types';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type { IngredientFormInput, IngredientFormValues, ListFieldName } from './types';

// The form's values against the shape the schema and the mutation take, and
// the one mapping from an issue's path back to a field, which the resolver's
// issues and the server's `fieldErrors` both go through
// (claude-docs/components/ingredient-form.md).

export const LIST_FIELDS: readonly ListFieldName[] = [
  'folkNames',
  'planets',
  'zodiacSigns',
  'colors',
  'deities',
  'substitutes',
];

export const EMPTY_VALUES: IngredientFormValues = {
  name: '',
  nomenclature: '',
  canonicalName: '',
  form: '',
  folkNames: [],
  description: '',
  element: '',
  planets: [],
  zodiacSigns: [],
  colors: [],
  deities: [],
  substitutes: [],
  safetyNotes: '',
  drafts: { folkNames: '', planets: '', zodiacSigns: '', colors: '', deities: '', substitutes: '' },
};

export const GENERIC_ERROR = "That didn't work. Please try again.";

const isListField = (field: unknown): field is ListFieldName =>
  LIST_FIELDS.includes(field as ListFieldName);

/**
 * The values as the mutation takes them: an unanswered closed set is null, a
 * list entry is its text, and the boxes are left behind — the resolver has
 * refused a save while one holds text. Nothing is trimmed or dropped — the
 * schema does that on both sides — so an entry's index in an issue's path is
 * its index here.
 */
export function toInput(values: IngredientFormValues): IngredientFormInput {
  const {
    nomenclature,
    element,
    folkNames,
    planets,
    zodiacSigns,
    colors,
    deities,
    substitutes,
    drafts: _,
    ...text
  } = values;
  const texts = (rows: { value: string }[]) => rows.map(({ value }) => value);
  return {
    ...text,
    nomenclature: nomenclature || null,
    element: element || null,
    folkNames: texts(folkNames),
    planets: texts(planets),
    zodiacSigns: texts(zodiacSigns),
    colors: texts(colors),
    deities: texts(deities),
    substitutes: texts(substitutes),
  };
}

/**
 * The field an issue's path names — `['folkNames', 2]` is the third row's text
 * — or undefined for a path naming none the form has, whose message belongs
 * above the fields.
 */
export function fieldNameOf(
  path: readonly (string | number)[],
  values: IngredientFormValues,
): FieldPath<IngredientFormValues> | undefined {
  const [field, index, ...rest] = path;
  // The boxes are the form's own, not the input's.
  if (rest.length > 0 || typeof field !== 'string' || field === 'drafts' || !(field in values)) {
    return undefined;
  }
  if (isListField(field)) {
    return typeof index === 'number' && index < values[field].length
      ? `${field}.${index}.value`
      : undefined;
  }
  return index === undefined ? (field as FieldPath<IngredientFormValues>) : undefined;
}

/**
 * Adds what a list's box holds as the list's last entry, trimmed, and empties
 * the box: its Add button, and Enter. Returns the entry added, or undefined
 * when the box was blank.
 */
export function commitDraft(
  { getValues, setValue }: Pick<UseFormReturn<IngredientFormValues>, 'getValues' | 'setValue'>,
  list: ListFieldName,
): string | undefined {
  const value = getValues(`drafts.${list}`).trim();
  if (value === '') return undefined;
  setValue(list, [...getValues(list), { value }], { shouldDirty: true });
  setValue(`drafts.${list}`, '');
  return value;
}

const validate = zodResolver(LocalIngredientInput, undefined, { raw: true });

/**
 * The shared schema as the form's resolver. It validates the values as
 * `toInput` sends them and hands back that input unparsed, so the service
 * parses what the resolver did. A list entry's issue arrives pathed to the
 * entry, and moves onto its `value` — where `fieldNameOf` puts a server's.
 */
export const ingredientResolver: Resolver<
  IngredientFormValues,
  unknown,
  IngredientFormInput
> = async (values, context, options) => {
  const result = await validate(toInput(values), context, options as never);
  const errors = { ...result.errors } as FieldErrors<IngredientFormValues>;
  for (const list of LIST_FIELDS) {
    const entries: unknown = result.errors[list];
    if (Array.isArray(entries)) errors[list] = entries.map((entry) => entry && { value: entry });
  }
  // A box still holding text: the schema never sees a box, so the form
  // refuses it here rather than send a list the user thinks holds it.
  const drafts: Partial<Record<ListFieldName, FieldError>> = {};
  for (const list of LIST_FIELDS) {
    const text = values.drafts[list].trim();
    if (text !== '') {
      drafts[list] = { type: 'unadded', message: `Press Add to keep "${text}", or clear the box` };
    }
  }
  if (Object.keys(drafts).length > 0)
    errors.drafts = drafts as FieldErrors<IngredientFormValues>['drafts'];
  if (Object.keys(errors).length === 0) return result;
  return { values: {}, errors };
};

/**
 * What a failed save says, as issues pathed to the input. A `VALIDATION`
 * error's field errors are the server's; anything else is one sentence about
 * the whole form — the refusal's own message, or a generic one when the
 * request never reached an answer.
 */
export function issuesOf(error: unknown): ValidationIssue[] {
  if (!(error instanceof ClientError)) return [{ path: [], message: GENERIC_ERROR }];
  const [first] = error.response.errors ?? [];
  const extensions = first?.extensions as Partial<ErrorExtensions> | undefined;
  if (extensions?.code === 'VALIDATION' && extensions.fieldErrors?.length) {
    return extensions.fieldErrors;
  }
  return [{ path: [], message: first?.message || GENERIC_ERROR }];
}
