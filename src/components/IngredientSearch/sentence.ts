import { formLabel } from '@/modules/ingredients/validation/form-label';
import { plural } from '@/lib/text';
import type {
  SearchSentence,
  SearchSentenceFacet,
  SearchSentenceFragment,
  SearchSentenceInput,
  SearchSentenceLabelFacet,
} from './types';

// Builds the sentence above a list that says what it is searching for, as typed fragments the
// component turns into links. Clauses come in a fixed order, whatever order the address holds
// them (claude-docs/components/ingredient-search.md, "The search sentence").

// `Intl.ListFormat` is Baseline Widely Available, so no guard line is needed.
// `en-US` gives the Oxford comma, "sage, rue, or thyme"; `en-GB` leaves it out.
const OR = new Intl.ListFormat('en-US', { type: 'disjunction' });
const AND = new Intl.ListFormat('en-US', { type: 'conjunction' });

const WITH_THE = new Set(['sun', 'moon']);

type Part = SearchSentenceFragment;

const text = (t: string): Part => ({ kind: 'text', text: t });

const lower = (t: string): string => t.toLocaleLowerCase('en-GB');

function literal(chunk: string): Part[] {
  const match = /^(\P{L}*)(\p{L}+)(\P{L}*)$/u.exec(chunk);
  if (!match) return [text(chunk)];
  const [, before = '', word = '', after = ''] = match;
  return [
    ...(before ? [text(before)] : []),
    { kind: 'join', text: word },
    ...(after ? [text(after)] : []),
  ];
}

function valueList(
  facet: SearchSentenceFacet,
  values: readonly string[],
  format: Intl.ListFormat,
  show: (value: string) => string,
): Part[] {
  const parts: Part[] = [];
  const marker = '\u0000';
  const chunks = format.formatToParts(values.map((_, i) => `${marker}${i}`));
  for (const chunk of chunks) {
    if (chunk.type === 'literal') {
      parts.push(...literal(chunk.value));
    } else {
      const value = values[Number(chunk.value.slice(1))]!;
      parts.push({ kind: 'value', text: show(value), facet, value });
    }
  }
  return parts;
}

/** Joins neighbouring text so the component draws fewer nodes. */
function merge(parts: Part[]): Part[] {
  const out: Part[] = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    if (part.kind === 'text' && last?.kind === 'text') {
      out[out.length - 1] = text(last.text + part.text);
    } else {
      out.push(part);
    }
  }
  return out;
}

export function buildSearchSentence({
  filter,
  labels = {},
  total,
  noun = { one: 'ingredient', other: 'ingredients' },
  admin = false,
}: SearchSentenceInput): SearchSentence {
  const label = (facet: SearchSentenceLabelFacet, value: string) => labels[facet]?.[value] ?? value;
  const picked = (values?: readonly string[]) => (values ?? []).filter((v) => v !== '');

  const lead = total === 0 ? `No ${noun.other}` : `${total} ${plural(total, noun.one, noun.other)}`;
  const parts: Part[] = [text(lead)];
  let hasFilter = false;
  const clause = (...clauseParts: Part[]) => {
    hasFilter = true;
    parts.push(text(', '), ...clauseParts);
  };

  const query = filter.query?.trim();
  if (query) {
    clause(text('matching '), { kind: 'value', text: query, facet: 'query', value: query });
  }

  // A coven is named by label only: the read drops any id that is not a coven the viewer is in. Not In
  // reads "not held in A or B", or "not held in any of my covens" with none in the address (only for
  // a viewer with covens to name).
  const covens = picked(filter.covens).filter((id) => labels.covens?.[id] !== undefined);
  if (covens.length > 0) {
    clause(
      text(filter.covensNot ? 'not held in ' : 'held in '),
      ...valueList('covens', covens, OR, (v) => label('covens', v)),
    );
  } else if (
    filter.covensNot &&
    picked(filter.covens).length === 0 &&
    Object.keys(labels.covens ?? {}).length > 0
  ) {
    clause(text('not held in '), {
      kind: 'value',
      text: 'any of my covens',
      facet: 'covensNot',
      value: 'true',
    });
  }

  const listClause = (
    prefix: string,
    facet: SearchSentenceFacet,
    values: readonly string[],
    format: Intl.ListFormat,
    show: (value: string) => string,
    suffix = '',
  ) => {
    if (values.length === 0) return;
    clause(
      text(prefix),
      ...valueList(facet, values, format, show),
      ...(suffix ? [text(suffix)] : []),
    );
  };

  const flagClause = (facet: SearchSentenceFacet, shown: string, value = 'true') =>
    clause({ kind: 'value', text: shown, facet, value });

  const categories = picked(filter.categories);
  const any = filter.categoryMode === 'any';
  listClause(
    'in the ',
    'categories',
    categories,
    any ? OR : AND,
    (v) => lower(label('categories', v)),
    !any && categories.length > 1 ? ' categories' : ' category',
  );

  listClause('in the moon phase ', 'moonPhases', picked(filter.moonPhases), OR, (v) => v);
  listClause('for the day ', 'daysOfWeek', picked(filter.daysOfWeek), OR, (v) => v);
  listClause(
    'that are ',
    'visibilities',
    picked(filter.visibility ? [filter.visibility] : []),
    OR,
    (v) => lower(label('visibilities', v)),
  );
  listClause('made by ', 'makers', picked(filter.makers), OR, (v) => label('makers', v));
  listClause('in the form ', 'forms', picked(filter.forms), OR, (v) =>
    lower(formLabel(label('forms', v))),
  );
  listClause('linked to ', 'deities', picked(filter.deities), OR, (v) => label('deities', v));
  listClause('under ', 'zodiac', picked(filter.zodiac), OR, (v) => label('zodiac', v));
  listClause('ruled by ', 'celestialBodies', picked(filter.celestialBodies), OR, (v) => {
    const name = label('celestialBodies', v);
    return WITH_THE.has(v.toLowerCase()) || WITH_THE.has(name.toLowerCase()) ? `the ${name}` : name;
  });
  listClause(
    'of the ',
    'elements',
    picked(filter.elements),
    OR,
    (v) => lower(label('elements', v)),
    ' element',
  );

  if (filter.toxic === 'toxic' || filter.toxic === 'not_toxic') {
    clause(text('that are '), {
      kind: 'value',
      text: filter.toxic === 'toxic' ? 'toxic' : 'not toxic',
      facet: 'toxic',
      value: filter.toxic,
    });
  }

  if (filter.source === 'local' || filter.source === 'compendium') {
    clause(text('from the '), {
      kind: 'value',
      text: filter.source,
      facet: 'source',
      value: filter.source,
    });
    parts.push(text(' source'));
  }

  if (filter.inStock) {
    flagClause('inStock', 'in stock');
  }

  if (filter.lowStockOnly) {
    flagClause('lowStockOnly', 'low or out of stock');
  }

  if (admin && filter.nomenclature) {
    clause(text('classified as '), {
      kind: 'value',
      text: lower(filter.nomenclature),
      facet: 'nomenclature',
      value: filter.nomenclature,
    });
  }

  if (admin && filter.withoutReferences) {
    flagClause('withoutReferences', 'without references');
  }

  if (admin && filter.withoutForms) {
    flagClause('withoutForms', 'without forms');
  }

  if (admin && filter.hidden) {
    flagClause('hidden', 'hidden from the public');
  }

  if (admin && (filter.reviewed === 'reviewed' || filter.reviewed === 'needs_review')) {
    flagClause(
      'reviewed',
      filter.reviewed === 'reviewed' ? 'reviewed by a curator' : 'needing review',
      filter.reviewed,
    );
  }

  return { fragments: merge(parts), hasFilter };
}
