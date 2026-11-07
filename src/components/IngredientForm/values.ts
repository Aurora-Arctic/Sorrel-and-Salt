import { NAMELESS_KIND, UNSETTLED_KIND } from '@/modules/ingredients/schema/ingredient-enums';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  FieldError,
  FieldErrors,
  FieldPath,
  Resolver,
  ResolverResult,
  UseFormReturn,
} from 'react-hook-form';
import {
  CompendiumIngredientInput,
  LocalIngredientInput,
} from '@/modules/ingredients/validation/ingredient';
import type {
  AnyListEntry,
  DeityLink,
  DraftPath,
  FieldNoun,
  IngredientFormInput,
  IngredientFormValues,
  IngredientListName,
  ListFieldName,
  ListOption,
  NounedField,
  ReferenceLink,
  ReferenceListEntry,
  RenamedFormHolder,
  RestoredSections,
  SectionKey,
  SubstituteForm,
  SubstituteLink,
  SubstituteListEntry,
  VariantFormValues,
  VariantSectionKey,
} from './types';

// The form's values against the shape the schema and the mutation take, and the one mapping from
// an issue's path back to a field, which the resolver's issues and the server's `fieldErrors` use
// (claude-docs/components/ingredient-form.md).

// The arrays below are `as const`, and `types.ts` derives its unions from
// them, so a list or a section is named once rather than in an array and a
// union kept in step by hand.

export const LIST_FIELDS = [
  'folkNames',
  'celestialBodies',
  'zodiacSigns',
  'colors',
  'deities',
  'substitutes',
] as const;

export const VARIANT_LISTS = ['celestialBodies', 'zodiacSigns', 'colors', 'substitutes'] as const;

/**
 * What each field is called where the form counts or names its entries: a variant's Copy From
 * Ingredient, a folded section's line and a variant's card. One table, so each says it alike.
 */
export const FIELD_NOUNS: Readonly<Record<NounedField, FieldNoun>> = {
  folkNames: { label: 'Folk Names', one: 'folk name', many: 'folk names' },
  description: { label: 'Description', one: 'description', many: 'description' },
  safetyNotes: { label: 'Safety Notes', one: 'safety notes', many: 'safety notes' },
  elements: { label: 'Element', one: 'element', many: 'elements' },
  celestialBodies: { label: 'Celestial Bodies', one: 'celestial body', many: 'celestial bodies' },
  zodiacSigns: { label: 'Zodiac Signs', one: 'zodiac sign', many: 'zodiac signs' },
  colors: { label: 'Colours', one: 'colour', many: 'colours' },
  deities: { label: 'Deities', one: 'deity', many: 'deities' },
  categoryIds: { label: 'Categories', one: 'category', many: 'categories' },
  substitutes: { label: 'Substitute Ingredients', one: 'substitute', many: 'substitutes' },
  references: { label: 'References', one: 'reference', many: 'references' },
  variants: { label: 'Forms', one: 'form', many: 'forms' },
};

export const UNNAMED_FORM = 'Unnamed Form';

export const EMPTY_VARIANT: VariantFormValues = {
  form: '',
  formLink: null,
  description: '',
  safetyNotes: '',
  toxic: false,
  elements: [],
  celestialBodies: [],
  zodiacSigns: [],
  colors: [],
  substitutes: [],
  categoryIds: [],
  references: [],
  referencePanelOpen: false,
  drafts: { celestialBodies: '', zodiacSigns: '', colors: '', substitutes: '', references: '' },
};

export const EMPTY_VALUES: IngredientFormValues = {
  name: '',
  nomenclature: '',
  canonicalName: '',
  folkNames: [],
  description: '',
  elements: [],
  celestialBodies: [],
  zodiacSigns: [],
  colors: [],
  deities: [],
  substitutes: [],
  categoryIds: [],
  safetyNotes: '',
  toxic: false,
  references: [],
  referencePanelOpen: false,
  variants: [],
  drafts: {
    folkNames: '',
    celestialBodies: '',
    zodiacSigns: '',
    colors: '',
    deities: '',
    substitutes: '',
    references: '',
    variants: '',
  },
};

export function draftOf(list: ListFieldName | 'references' | `variants.${number}.references`) {
  const at = list.lastIndexOf('.');
  return (
    at < 0 ? `drafts.${list}` : `${list.slice(0, at)}.drafts.${list.slice(at + 1)}`
  ) as DraftPath;
}

/**
 * The elements: a list, but one control with no entry rows, so an issue
 * pathed to one element — a repeat, `['elements', 1]` — is the field's.
 */
const WHOLE_LIST = 'elements';

/** The categories picked: ids, not entries, so an issue names one by its index alone. */
const PICKED_CATEGORIES = 'categoryIds';

const PICKED_FORM = 'formId';

/** The row a variant keeps, whose repeat is refused as its form's. */
const KEPT_ROW = 'id';

const PICKED_SUBSTITUTE_FORM = 'substituteVariantId';

/**
 * The values as the mutation takes them: closed sets and lists as chosen, links by id, the boxes
 * left behind, nothing trimmed or dropped, so an issue's index is its index here
 * (claude-docs/components/ingredient-form.md, "What it sends").
 */
export function toInput(values: IngredientFormValues): IngredientFormInput {
  const {
    nomenclature,
    folkNames,
    celestialBodies,
    zodiacSigns,
    colors,
    deities,
    substitutes,
    references,
    variants,
    referencePanelOpen: _open,
    drafts: _,
    ...text
  } = values;
  return {
    ...text,
    nomenclature: nomenclature || null,
    folkNames: texts(folkNames),
    celestialBodies: texts(celestialBodies),
    zodiacSigns: texts(zodiacSigns),
    colors: texts(colors),
    deities: deities.map(({ value, link }) => (link ? { deityId: link.id } : { name: value })),
    substitutes: substituteInputs(substitutes),
    references: referenceInputs(references),
    variants: variants.map(variantInput),
  };
}

export const texts = (rows: readonly { value: string }[]): string[] =>
  rows.map(({ value }) => value);

const substituteInputs = (rows: SubstituteListEntry[]) =>
  rows.map(({ value, link, variantId }) =>
    link
      ? { ingredientId: link.id, ...(variantId ? { substituteVariantId: variantId } : {}) }
      : { name: value },
  );

/** Each row by its source's id and locator, and each compendium attribute only once one
 * is chosen: a coven's form chooses none. */
const referenceInputs = (rows: ReferenceListEntry[]) =>
  rows.map(({ link, locator, nameBasis, supports }) => ({
    referenceId: link.id,
    locator,
    ...(nameBasis ? { nameBasis } : {}),
    ...(supports.length > 0 ? { supports } : {}),
  }));

/**
 * A variant as the input takes it: every field but `id` sent, `""` or `[]` for none, since an
 * entry replaces the form it names and a field left out would be a schema error, not a clear.
 */
function variantInput(variant: VariantFormValues) {
  const {
    variantId,
    formLink,
    celestialBodies,
    zodiacSigns,
    colors,
    substitutes,
    references,
    referencePanelOpen: _open,
    drafts: _,
    ...text
  } = variant;
  return {
    ...(variantId ? { id: variantId } : {}),
    ...text,
    formId: formLink?.id ?? '',
    celestialBodies: texts(celestialBodies),
    zodiacSigns: texts(zodiacSigns),
    colors: texts(colors),
    substitutes: substituteInputs(substitutes),
    references: referenceInputs(references),
  };
}

export const sourceTierOf = ({ isGlobal }: Pick<ReferenceLink, 'isGlobal'>): string =>
  isGlobal ? 'Compendium source' : 'This coven’s source';

const linkOf = (entry: AnyListEntry): SubstituteLink | DeityLink | undefined =>
  'link' in entry ? entry.link : undefined;

const isDeityLink = (link: SubstituteLink | DeityLink): link is DeityLink => 'tradition' in link;

/**
 * What an entry's pill reads: its text, beside what tells it from a same-named one, and for a
 * substitute naming one form, that form after a dot (claude-docs/components/ingredient-form.md, "What it sends").
 */
export function entryText(entry: AnyListEntry): string {
  const link = linkOf(entry);
  const qualifier = link && (isDeityLink(link) ? link.tradition : link.canonicalName);
  const text = qualifier ? `${entry.value} (${qualifier})` : entry.value;
  const form =
    link && !isDeityLink(link) && 'variantId' in entry
      ? formNamed(link, entry.variantId)
      : undefined;
  return form ? `${text} · ${form}` : text;
}

export const holdsSubstitutes = (list: ListFieldName): boolean =>
  list === 'substitutes' || list.endsWith('.substitutes');

export const NAME_ONLY = 'name only';

export const tierOf = ({ isGlobal }: Pick<SubstituteLink, 'isGlobal'>): string =>
  isGlobal ? 'Compendium entry' : 'This coven’s entry';

export function entryDetail(entry: AnyListEntry): string | undefined {
  const link = linkOf(entry);
  if (!link) return undefined;
  if (isDeityLink(link)) return link.description ?? undefined;
  const picked = 'variantId' in entry ? formNamed(link, entry.variantId) : undefined;
  return `${picked ?? 'Any form'} · ${tierOf(link)}`;
}

const formDisplay = (form: string | undefined): string | undefined =>
  form === undefined ? undefined : formLabel(form);

const formNamed = (link: SubstituteLink, id: string | undefined): string | undefined =>
  formDisplay(link.variants?.find((variant) => variant.id === id)?.form);

export const YOUR_INGREDIENTS = 'Your Ingredients';
export const COMPENDIUM_HEADING = 'Compendium';

/** The picker's own cupboard group lists first and stays first, whatever a form ranks. */
const groupOf = ({ heading }: ListOption): number => (heading === YOUR_INGREDIENTS ? 0 : 1);

/** A variant's substitute suggestions, ranked for `form`; every row is kept. */
export function rankForForm(
  options: readonly ListOption[],
  form: string,
  group: string | null,
): ListOption[] {
  const key = fold(form);
  if (key === '') return [...options];
  const rankOf = ({ link }: ListOption): number => {
    const forms = link && 'variants' in link ? (link.variants ?? []) : [];
    if (forms.some((variant) => fold(variant.form) === key)) return 0;
    if (group !== null && forms.some((variant) => variant.group === group)) return 1;
    return 2;
  };
  return options
    .map((option, index) => ({ option, index, tier: rankOf(option) }))
    .sort((a, b) => groupOf(a.option) - groupOf(b.option) || a.tier - b.tier || a.index - b.index)
    .map(({ option }) => option);
}

/**
 * A variant's substitute rows: each ingredient the lookup found as one row per form it comes in,
 * likeliest first, never the whole ingredient and never `own`, the variant's saved row
 * (claude-docs/components/ingredient-form.md, "What it sends").
 */
export function formRows(
  options: readonly ListOption[],
  form: string,
  group: string | null,
  own?: string,
): ListOption[] {
  const key = fold(form);
  const rankOf = (variant: SubstituteForm): number => {
    if (key !== '' && fold(variant.form) === key) return 0;
    return group !== null && variant.group === group ? 1 : 2;
  };
  return options.flatMap((option) => {
    const { link } = option;
    if (!link || isDeityLink(link)) return [option];
    const name = option.label ?? option.value;
    const ranked = (link.variants ?? [])
      .filter(({ id }) => id !== own)
      .map((variant, index) => ({ variant, index, tier: rankOf(variant) }))
      .sort((a, b) => a.tier - b.tier || a.index - b.index);
    return ranked.map(({ variant }) => ({
      value: option.value,
      label: `${name} · ${variant.group ? `${formLabel(variant.form)} (${variant.group})` : formLabel(variant.form)}`,
      heading: option.heading,
      key: `${option.key ?? link.id}/${variant.id}`,
      link,
      variantId: variant.id,
    }));
  });
}

type IssuePath = readonly (string | number)[];

/** The field an issue's path names, or undefined for a path naming none the form has,
 * whose message belongs above the fields. */
export function fieldNameOf(
  path: IssuePath,
  values: IngredientFormValues,
): FieldPath<IngredientFormValues> | undefined {
  const [field, index, ...rest] = path;
  if (field !== 'variants')
    return placeIn(path, values, LIST_FIELDS) as FieldPath<IngredientFormValues>;
  if (typeof index !== 'number' || index >= values.variants.length) return undefined;
  // An issue on a form as a whole is its Form box's: the form is what names it.
  const name = rest.length === 0 ? 'form' : placeIn(rest, values.variants[index], VARIANT_LISTS);
  return name === undefined
    ? undefined
    : (`variants.${index}.${name}` as FieldPath<IngredientFormValues>);
}

function placeIn(
  path: IssuePath,
  holder: IngredientFormValues | VariantFormValues,
  lists: readonly string[],
): string | undefined {
  const [field, index, ...rest] = path;
  const fields = holder as unknown as Record<string, unknown>;
  // A variant's pick, and the row it keeps, are its Form field's: its box is what made them.
  if ((field === PICKED_FORM || field === KEPT_ROW) && 'formLink' in holder) {
    return index === undefined ? 'form' : undefined;
  }
  if (field === 'references') {
    if (typeof index !== 'number' || index >= holder.references.length) return undefined;
    const [part, ...beyond] = rest;
    if (part === 'supports') return `references.${index}.supports`;
    if (beyond.length > 0) return undefined;
    if (part === undefined || part === 'referenceId') return `references.${index}.value`;
    return part === 'locator' || part === 'nameBasis' ? `references.${index}.${part}` : undefined;
  }
  const entryPart = rest.length === 1 && rest[0] === PICKED_SUBSTITUTE_FORM;
  if (
    (rest.length > 0 && !entryPart) ||
    typeof field !== 'string' ||
    field === 'drafts' ||
    !(field in holder)
  ) {
    return undefined;
  }
  if (lists.includes(field)) {
    const entries = fields[field] as unknown[];
    return typeof index === 'number' && index < entries.length
      ? `${field}.${index}.value`
      : undefined;
  }
  if (entryPart) return undefined;
  if (field === WHOLE_LIST) return WHOLE_LIST;
  if (field === PICKED_CATEGORIES && index !== undefined) {
    return typeof index === 'number' && index < holder.categoryIds.length
      ? `${PICKED_CATEGORIES}.${index}`
      : undefined;
  }
  return index === undefined ? field : undefined;
}

/**
 * An entry's key, as the schema folds a list's text: trimmed, its case set
 * aside. `toLowerCase` rather than the type-ahead's `toLocaleLowerCase`, since
 * this key must agree with the database's own fold, not the reader's locale.
 */
export const fold = (text: string): string => text.trim().toLowerCase();

/**
 * The name a variant's picked form now goes by, when a keeper has renamed it since the pick;
 * undefined for a pick still named as typed, and for typed text. Only a coven's variant holds one.
 */
export const renamedTo = ({ form, formLink }: RenamedFormHolder): string | undefined =>
  formLink && fold(formLink.name) !== fold(form) ? formLink.name : undefined;

/**
 * Whether the form holds something a save would refuse that is only unfinished: no name yet, text in a list's box or
 * an open reference panel, a named classification with no formal name, and on the compendium no classification or a
 * typed form not picked. The autosave waits on these quietly, where Save says what is wrong.
 */
export function heldBack(values: IngredientFormValues, compendium: boolean): boolean {
  const boxed = (drafts: Partial<Record<string, string>>, panelOpen: boolean): boolean =>
    panelOpen || Object.values(drafts).some((text) => (text ?? '').trim() !== '');
  if (values.name.trim() === '' || boxed(values.drafts, values.referencePanelOpen)) return true;
  if (
    values.variants.some(
      (variant) =>
        variant.form.trim() === '' ||
        boxed(variant.drafts, variant.referencePanelOpen) ||
        renamedTo(variant) !== undefined ||
        (compendium && variant.formLink === null),
    )
  ) {
    return true;
  }
  const { nomenclature, canonicalName } = values;
  if (compendium && nomenclature === '') return true;
  const named =
    nomenclature !== '' && nomenclature !== NAMELESS_KIND && nomenclature !== UNSETTLED_KIND;
  return named && canonicalName.trim() === '';
}

/**
 * Why `text` cannot be a list's next entry, or undefined when it can. It reads the schema's keys,
 * so the box refuses what a save would: links by id, typed text folded, `name` counted too.
 */
export function repeatOf(
  listed: readonly AnyListEntry[],
  text: string,
  link?: SubstituteLink | DeityLink,
  name?: string,
): string | undefined {
  const key = fold(text);
  if (key === '') return undefined;
  const said = `"${text.trim()}"`;
  const repeated = link
    ? listed.some((entry) => linkOf(entry)?.id === link.id)
    : listed.some((entry) => !linkOf(entry) && fold(entry.value) === key);
  if (repeated) return `${said} is already listed`;
  if (!link && name !== undefined && key === fold(name)) return `${said} is already the name`;
  return undefined;
}

/**
 * The values an edit opens on, each linked substitute holding a `variantId` ("" for Any Form) so
 * the Form of X box adding the key as it mounts is no change (claude-docs/components/ingredient-form.md, "What it sends").
 */
export function openingValues(values: IngredientFormValues): IngredientFormValues {
  return {
    ...values,
    substitutes: values.substitutes.map((entry) =>
      entry.link && !('variantId' in entry) ? { ...entry, variantId: '' } : entry,
    ),
  };
}

export function addEntry(
  { getValues, setValue }: Pick<UseFormReturn<IngredientFormValues>, 'getValues' | 'setValue'>,
  list: ListFieldName,
  text: string,
  link?: SubstituteLink | DeityLink,
  variantId?: string,
): string | undefined {
  const value = text.trim();
  if (value === '') return undefined;
  const entry: AnyListEntry = link
    ? { value, link, ...(variantId ? { variantId } : {}) }
    : { value };
  // Any list's entries: the union of the lists' own entry types is more than
  // `setValue` can check against a path it does not know until now.
  const listed = getValues(list) as AnyListEntry[];
  setValue(list, [...listed, entry] as never, { shouldDirty: true });
  setValue(draftOf(list), '');
  return entryText(entry);
}

export function commitDraft(
  form: Pick<UseFormReturn<IngredientFormValues>, 'getValues' | 'setValue'>,
  list: ListFieldName,
): string | undefined {
  return addEntry(form, list, form.getValues(draftOf(list)));
}

/**
 * Why `text` cannot be the next variant's form, or undefined when it can: a form the ingredient
 * already comes in, folded as `ingredient_variants_form_unique` folds it.
 */
export function repeatedForm(
  variants: readonly Pick<VariantFormValues, 'form'>[],
  text: string,
): string | undefined {
  const key = fold(text);
  if (key === '' || !variants.some(({ form }) => fold(form) === key)) return undefined;
  return `"${text.trim()}" is already listed`;
}

export const PICK_ONLY_LISTS: readonly IngredientListName[] = [
  'celestialBodies',
  'zodiacSigns',
  'deities',
];

type Issues = Record<string, unknown>;

/**
 * The schema's issues among `lists` and the references, moved to where the form draws them, as
 * `fieldNameOf` puts a server's (claude-docs/components/ingredient-form.md, "What it sends").
 */
function placeIssues(raw: Issues, lists: readonly string[]): Issues {
  const errors = { ...raw };
  const elements = raw[WHOLE_LIST];
  if (Array.isArray(elements)) errors[WHOLE_LIST] = elements.find(Boolean);
  // A variant's pick and kept row are its form's. The schema raises the pick's
  // or one with the text, never both.
  for (const key of [PICKED_FORM, KEPT_ROW]) {
    if (!raw[key]) continue;
    delete errors[key];
    errors.form ??= raw[key];
  }
  for (const list of lists) {
    const entries = raw[list];
    if (!Array.isArray(entries)) continue;
    errors[list] = entries.map(
      (entry?: FieldError & { substituteVariantId?: FieldError }) =>
        entry && { value: entry.message === undefined ? entry.substituteVariantId : entry },
    );
  }
  const cited = raw.references;
  if (Array.isArray(cited)) {
    errors.references = cited.map(
      (
        entry?: FieldError & {
          referenceId?: FieldError;
          locator?: FieldError;
          nameBasis?: FieldError;
          supports?: FieldError | (FieldError | undefined)[];
        },
      ) =>
        entry && {
          value: entry.message === undefined ? entry.referenceId : entry,
          locator: entry.locator,
          nameBasis: entry.nameBasis,
          supports: Array.isArray(entry.supports) ? entry.supports.find(Boolean) : entry.supports,
        },
    );
  }
  return errors;
}

/**
 * A box still holding text, which the schema never sees, so the form refuses it here: each list's,
 * the references' search, and a source half written in the panel.
 */
function boxIssues(
  drafts: Partial<Record<string, string>>,
  panelOpen: boolean,
  lists: readonly string[],
  pickOnly: boolean,
): Partial<Record<string, FieldError>> | undefined {
  const issues: Partial<Record<string, FieldError>> = {};
  for (const list of lists) {
    const text = drafts[list]?.trim() ?? '';
    if (text === '') continue;
    issues[list] =
      pickOnly && PICK_ONLY_LISTS.includes(list as IngredientListName)
        ? { type: 'unpicked', message: `Pick "${text}" from the list, or clear the box` }
        : { type: 'unadded', message: `Press Add to keep "${text}", or clear the box` };
  }
  const search = drafts.references?.trim() ?? '';
  if (panelOpen) {
    issues.references = { type: 'unsaved', message: 'Save the source, or cancel it' };
  } else if (search !== '') {
    issues.references = {
      type: 'unadded',
      message: `Pick a source for "${search}", or clear the box`,
    };
  }
  return Object.keys(issues).length > 0 ? issues : undefined;
}

/**
 * One variant's issues: the schema's, placed; its boxes'; on the compendium a typed form; and a
 * pick a keeper has since renamed, until the member settles it.
 */
function variantIssues(
  raw: Issues | undefined,
  variant: VariantFormValues,
  pickOnly: boolean,
): Issues | undefined {
  const errors = raw ? placeIssues(raw, VARIANT_LISTS) : {};
  const drafts = boxIssues(variant.drafts, variant.referencePanelOpen, VARIANT_LISTS, pickOnly);
  if (drafts) errors.drafts = drafts;
  if (pickOnly && !errors.form && variant.form.trim() !== '' && variant.formLink === null) {
    errors.form = { type: 'unpicked', message: 'Pick a form from the list' };
  }
  // The stale pair is never sent; it would be refused at `form` anyway.
  const renamed = renamedTo(variant);
  if (!errors.form && renamed !== undefined) {
    errors.form = {
      type: 'renamed',
      message: `Use "${renamed}" or keep "${variant.form.trim()}" before saving`,
    };
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * A tier's schema as the form's resolver. It validates the values as `toInput` sends them, hands
 * back that input unparsed so the service parses it, moves each issue to its field, and refuses
 * a box still holding text, on the compendium a typed pick too.
 */
function resolverFor(
  schema: typeof LocalIngredientInput | typeof CompendiumIngredientInput,
  tier: 'coven' | 'compendium',
): Resolver<IngredientFormValues, unknown, IngredientFormInput> {
  const validate = zodResolver(schema as typeof LocalIngredientInput, undefined, { raw: true });
  const pickOnly = tier === 'compendium';
  return async (values, context, options) => {
    const result = await validate(toInput(values), context, options as never);
    const raw = result.errors as Issues;
    const errors = placeIssues(raw, LIST_FIELDS);
    const forms: unknown[] = Array.isArray(raw.variants) ? raw.variants : [];
    const variants = values.variants.map((variant, index) =>
      variantIssues(forms[index] as Issues | undefined, variant, pickOnly),
    );
    if (variants.some(Boolean)) errors.variants = variants;
    else delete errors.variants;
    const drafts = boxIssues(values.drafts, values.referencePanelOpen, LIST_FIELDS, pickOnly);
    const unadded = values.drafts.variants.trim();
    if (unadded !== '') {
      const why = pickOnly
        ? { type: 'unpicked', message: `Pick "${unadded}" from the list, or clear the box` }
        : { type: 'unadded', message: `Press Add to keep "${unadded}", or clear the box` };
      errors.drafts = { ...drafts, variants: why };
    } else if (drafts) {
      errors.drafts = drafts;
    }
    // `toInput` lists the forms always, which the schema's input type leaves optional.
    if (Object.keys(errors).length === 0)
      return result as ResolverResult<IngredientFormValues, IngredientFormInput>;
    return { values: {}, errors: errors as FieldErrors<IngredientFormValues> };
  };
}

export const ingredientResolver = resolverFor(LocalIngredientInput, 'coven');

export const compendiumResolver = resolverFor(CompendiumIngredientInput, 'compendium');

export const VARIANT_SECTION_KEYS = [
  'identity',
  'details',
  'correspondences',
  'relations',
  'sources',
] as const;

export const SECTION_KEYS = [...VARIANT_SECTION_KEYS, 'variants'] as const;

/**
 * The section a value an ingredient and its variants both hold sits in: the
 * ingredient's and a variant's tables below each spread it, so the two agree.
 */
const SHARED_SECTION_OF: Readonly<Record<string, VariantSectionKey>> = {
  description: 'details',
  elements: 'correspondences',
  celestialBodies: 'correspondences',
  zodiacSigns: 'correspondences',
  colors: 'correspondences',
  categoryIds: 'relations',
  substitutes: 'relations',
  safetyNotes: 'details',
  toxic: 'details',
  references: 'sources',
  referencePanelOpen: 'sources',
};

const SECTION_OF: Readonly<Record<string, SectionKey>> = {
  ...SHARED_SECTION_OF,
  name: 'identity',
  nomenclature: 'identity',
  canonicalName: 'identity',
  folkNames: 'identity',
  deities: 'correspondences',
  variants: 'variants',
};

const VARIANT_SECTION_OF: Readonly<Record<string, VariantSectionKey>> = {
  ...SHARED_SECTION_OF,
  form: 'identity',
  formLink: 'identity',
};

export type ErrorShown = (path: string) => boolean;

/** A field's own error, rather than the errors of the fields beneath a path. */
const isFieldError = (error: object): boolean => 'type' in error || 'message' in error;

function anyShown(error: unknown, path: string, shown: ErrorShown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (isFieldError(error)) return shown(path);
  return Object.entries(error).some(([key, inner]) => anyShown(inner, `${path}.${key}`, shown));
}

/**
 * The sections `errors` names in `sectionOf`, by the first key of each
 * error's path, a box's draft by its list's; only for an error `shown` draws,
 * so a section is never flagged for an error no field in it shows.
 */
function sectionsIn<K extends SectionKey>(
  errors: object,
  sectionOf: Readonly<Record<string, K>>,
  shown: ErrorShown,
  prefix = '',
): Set<K> {
  const found = new Set<K>();
  for (const [key, error] of Object.entries(errors)) {
    const drafts = key === 'drafts' && error ? Object.entries(error as object) : null;
    for (const [named, inner] of drafts ?? [[key, error]]) {
      const section = sectionOf[named];
      const path = drafts ? `${prefix}drafts.${named}` : `${prefix}${named}`;
      if (section && anyShown(inner, path, shown)) found.add(section);
    }
  }
  return found;
}

/**
 * The sections holding an error that is drawn, the schema's or the server's,
 * by the first key of each error's path (the list's, for a box's draft). The
 * form's `root` error names no field, and so no section.
 */
export function sectionsWithErrors(
  errors: FieldErrors<IngredientFormValues>,
  shown: ErrorShown,
): Set<SectionKey> {
  return sectionsIn(errors, SECTION_OF, shown);
}

export function variantSectionsWithErrors(
  errors: unknown,
  shown: ErrorShown,
  prefix: string,
): Set<VariantSectionKey> {
  return errors && typeof errors === 'object'
    ? sectionsIn(errors, VARIANT_SECTION_OF, shown, prefix)
    : new Set();
}

export function variantsWithErrors(
  errors: FieldErrors<IngredientFormValues>,
  shown: ErrorShown,
): Map<number, Set<VariantSectionKey>> {
  const found = new Map<number, Set<VariantSectionKey>>();
  // An array's own error sits on it as `root`, beside the variants' places.
  for (const [key, error] of Object.entries(errors.variants ?? {})) {
    const index = Number(key);
    const sections = variantSectionsWithErrors(error, shown, `variants.${key}.`);
    if (Number.isInteger(index) && sections.size > 0) found.set(index, sections);
  }
  return found;
}

const BOXED_LISTS = new Set<string>([
  ...LIST_FIELDS,
  ...VARIANT_LISTS,
  'references',
  'categoryIds',
]);

/**
 * The box to focus after a restore wrote the list `name`, or undefined when `name` is not a whole
 * list. A list's typing box is named by `draftOf`, e.g. `variants.1.drafts.colors`.
 */
export function listBoxOf(name: string): string | undefined {
  const keys = name.replace(/\.\d+$/, '').split('.');
  const list = keys.pop() ?? '';
  const inVariant = keys.length === 2 && keys[0] === 'variants' && /^\d+$/.test(keys[1]);
  if (!BOXED_LISTS.has(list) || (keys.length > 0 && !inVariant)) return undefined;
  return [...keys, 'drafts', list].join('.');
}

export function sectionsRestored(names: readonly string[]): RestoredSections {
  const found: RestoredSections = { sections: new Set(), variants: new Map() };
  for (const name of names) {
    const keys = name.split('.');
    const inVariant = keys[0] === 'variants' && /^\d+$/.test(keys[1] ?? '');
    if (!inVariant) {
      const section = SECTION_OF[keys[0] === 'drafts' ? (keys[1] ?? '') : keys[0]];
      if (section) found.sections.add(section);
      continue;
    }
    found.sections.add('variants');
    const section = VARIANT_SECTION_OF[keys[2] === 'drafts' ? (keys[3] ?? '') : (keys[2] ?? '')];
    if (!section) continue;
    const index = Number(keys[1]);
    found.variants.set(index, (found.variants.get(index) ?? new Set()).add(section));
  }
  return found;
}
