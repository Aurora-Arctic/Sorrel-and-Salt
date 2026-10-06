import { zodResolver } from '@hookform/resolvers/zod';
import { ClientError } from 'graphql-request';
import type { FieldError, FieldErrors, FieldPath, Resolver, UseFormReturn } from 'react-hook-form';
import type { ErrorExtensions } from '../../graphql/types';
import type { ValidationIssue } from '../../lib/types';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type {
  AnyListEntry,
  DeityLink,
  IngredientFormInput,
  IngredientFormValues,
  ListFieldName,
  MultiSelectFieldName,
  SubstituteLink,
} from './types';

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
  formLink: null,
  folkNames: [],
  description: '',
  elements: [],
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
 * The elements: a list, but one control with no entry rows, so an issue
 * pathed to one element — a repeat, `['elements', 1]` — is the field's.
 */
const WHOLE_LIST: MultiSelectFieldName = 'elements';

/** The form's pick, which the input carries beside its text and the form draws in the Form box. */
const PICKED_FORM = 'formId';

/**
 * The values as the mutation takes them: an unanswered closed set is null, the
 * elements go as chosen — `[]` for none, which the update input needs to
 * clear them — a list entry is its text — a substitute or a deity its link's
 * id, or else its text as a name — the form its text and its pick's id, null
 * for typed text (MB.169) — and the boxes are left behind — the resolver has
 * refused a save while one holds text. Nothing is trimmed or dropped — the
 * schema does that on both sides — so an entry's index in an issue's path is
 * its index here.
 */
export function toInput(values: IngredientFormValues): IngredientFormInput {
  const {
    nomenclature,
    folkNames,
    planets,
    zodiacSigns,
    colors,
    deities,
    substitutes,
    formLink,
    drafts: _,
    ...text
  } = values;
  const texts = (rows: { value: string }[]) => rows.map(({ value }) => value);
  return {
    ...text,
    nomenclature: nomenclature || null,
    formId: formLink?.id ?? null,
    folkNames: texts(folkNames),
    planets: texts(planets),
    zodiacSigns: texts(zodiacSigns),
    colors: texts(colors),
    deities: deities.map(({ value, link }) => (link ? { deityId: link.id } : { name: value })),
    substitutes: substitutes.map(({ value, link }) =>
      link ? { ingredientId: link.id } : { name: value },
    ),
  };
}

const linkOf = (entry: AnyListEntry): SubstituteLink | DeityLink | undefined =>
  'link' in entry ? entry.link : undefined;

const isDeityLink = (link: SubstituteLink | DeityLink): link is DeityLink => 'tradition' in link;

/**
 * What an entry's pill reads: its text, beside what tells it from a
 * same-named one — a linked substitute's formal name, so two ingredients
 * sharing a label are told apart, and a picked deity's tradition, "Hecate
 * (Greek)", as its lookup row reads (MB.169).
 */
export function entryText(entry: AnyListEntry): string {
  const link = linkOf(entry);
  const qualifier = link && (isDeityLink(link) ? link.tradition : link.canonicalName);
  return qualifier ? `${entry.value} (${qualifier})` : entry.value;
}

/** Whose a linked ingredient is, as its lookup row and its pill's tooltip say. */
export const tierOf = ({ isGlobal }: Pick<SubstituteLink, 'isGlobal'>): string =>
  isGlobal ? 'Compendium entry' : 'This coven’s entry';

/**
 * What a linked entry's pill leaves out, for its tooltip. A substitute's is
 * "Dried leaf · Compendium entry — A fixture herb.": its form, which the
 * pill's formal name needs to tell two ingredients apart (§5), its tier and
 * its description (MB.164). A deity's is its description (MB.169).
 * Undefined for a typed entry, which has nothing more to tell.
 */
export function entryDetail(entry: AnyListEntry): string | undefined {
  const link = linkOf(entry);
  if (!link) return undefined;
  if (isDeityLink(link)) return link.description ?? undefined;
  const facts = [link.form, tierOf(link)].filter(Boolean).join(' · ');
  return link.description ? `${facts} — ${link.description}` : facts;
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
  // The pick is the Form field's: its box is what made it (MB.169).
  if (field === PICKED_FORM && index === undefined && rest.length === 0) return 'form';
  // The boxes are the form's own, not the input's.
  if (rest.length > 0 || typeof field !== 'string' || field === 'drafts' || !(field in values)) {
    return undefined;
  }
  if (field === WHOLE_LIST) return WHOLE_LIST;
  if (isListField(field)) {
    return typeof index === 'number' && index < values[field].length
      ? `${field}.${index}.value`
      : undefined;
  }
  return index === undefined ? (field as FieldPath<IngredientFormValues>) : undefined;
}

/**
 * Adds `text` as the list's last entry, trimmed, and empties the box: a
 * suggestion picked from it, with the ingredient or the curated deity it
 * links when it is a substitute's or a deity's. Returns what the entry reads
 * as, or undefined when the text was blank.
 */
export function addEntry(
  { getValues, setValue }: Pick<UseFormReturn<IngredientFormValues>, 'getValues' | 'setValue'>,
  list: ListFieldName,
  text: string,
  link?: SubstituteLink | DeityLink,
): string | undefined {
  const value = text.trim();
  if (value === '') return undefined;
  const entry: AnyListEntry = link ? { value, link } : { value };
  setValue(list, [...getValues(list), entry], { shouldDirty: true });
  setValue(`drafts.${list}`, '');
  return entryText(entry);
}

/** Adds what a list's box holds: its Add button, and Enter with nothing picked. */
export function commitDraft(
  form: Pick<UseFormReturn<IngredientFormValues>, 'getValues' | 'setValue'>,
  list: ListFieldName,
): string | undefined {
  return addEntry(form, list, form.getValues(`drafts.${list}`));
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
  // An element's issue arrives pathed to the element, and moves onto the
  // control — the first, as the field has one error element.
  const elements: unknown = result.errors[WHOLE_LIST];
  if (Array.isArray(elements)) errors[WHOLE_LIST] = elements.find(Boolean);
  // The pick's issue moves onto the Form field, whose box made the pick. The
  // schema raises it or one with the text, never both.
  const picked = (result.errors as Record<string, FieldError | undefined>)[PICKED_FORM];
  if (picked) {
    delete (errors as Record<string, unknown>)[PICKED_FORM];
    errors.form = picked;
  }
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
