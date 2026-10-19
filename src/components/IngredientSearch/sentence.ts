import { formLabel } from '@/modules/ingredients/validation/form-label';
import type {
  SearchSentence,
  SearchSentenceFacet,
  SearchSentenceFragment,
  SearchSentenceInput,
  SearchSentenceLabelFacet,
} from './types';

// The sentence above a list that says what it is searching for (M12.4). A pure
// function, so the component only draws it: it returns typed fragments, and the
// component turns each `value` into a link to the same filter without that value.
// Clauses always come in this order, whatever order the address holds them:
// text query, categories, forms, deities, zodiac, planets, elements, toxic,
// then a coven's source, in stock and low stock, then the admin-only nomenclature and No Refs
// (claude-docs/components/ingredient-search.md, "The search sentence").

// `Intl.ListFormat` is Baseline Widely Available, so no guard line is needed.
// `en-GB` gives "sage, rue or thyme": no serial comma.
const OR = new Intl.ListFormat('en-GB', { type: 'disjunction' });
const AND = new Intl.ListFormat('en-GB', { type: 'conjunction' });

// "The" goes before the two luminaries and no other planet.
const WITH_THE = new Set(['sun', 'moon']);

type Part = SearchSentenceFragment;

const text = (t: string): Part => ({ kind: 'text', text: t });

/** Writes a list of value fragments joined by the list format, in the list's own order. */
function valueList(
  facet: SearchSentenceFacet,
  values: readonly string[],
  format: Intl.ListFormat,
  show: (value: string) => string,
): Part[] {
  const parts: Part[] = [];
  const marker = '\u0000';
  // `formatToParts` hands back the joining words, so none are hardcoded here.
  const chunks = format.formatToParts(values.map((_, i) => `${marker}${i}`));
  for (const chunk of chunks) {
    if (chunk.type === 'literal') {
      parts.push(text(chunk.value));
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

  const lead = total === 0 ? `No ${noun.other}` : `${total} ${total === 1 ? noun.one : noun.other}`;
  const parts: Part[] = [text(lead)];
  let hasFilter = false;
  const clause = (...clauseParts: Part[]) => {
    hasFilter = true;
    parts.push(text(', '), ...clauseParts);
  };

  const query = filter.query?.trim();
  if (query) {
    clause(text('matching '), { kind: 'value', text: `“${query}”`, facet: 'query', value: query });
  }

  const categories = picked(filter.categories);
  if (categories.length > 0) {
    const any = filter.categoryMode === 'any';
    // Any-mode reads "in the A or B category" (one of them is enough); all-mode "in the A and B categories".
    clause(
      text('in the '),
      ...valueList('categories', categories, any ? OR : AND, (v) => label('categories', v)),
      text(!any && categories.length > 1 ? ' categories' : ' category'),
    );
  }

  const forms = picked(filter.forms);
  if (forms.length > 0) {
    clause(
      text('in the form '),
      ...valueList('forms', forms, OR, (v) => formLabel(label('forms', v))),
    );
  }

  const deities = picked(filter.deities);
  if (deities.length > 0) {
    clause(text('linked to '), ...valueList('deities', deities, OR, (v) => label('deities', v)));
  }

  const zodiac = picked(filter.zodiac);
  if (zodiac.length > 0) {
    clause(text('under '), ...valueList('zodiac', zodiac, OR, (v) => label('zodiac', v)));
  }

  const planets = picked(filter.planets);
  if (planets.length > 0) {
    clause(
      text('ruled by '),
      ...valueList('planets', planets, OR, (v) => {
        const name = label('planets', v);
        return WITH_THE.has(v.toLowerCase()) || WITH_THE.has(name.toLowerCase())
          ? `the ${name}`
          : name;
      }),
    );
  }

  const elements = picked(filter.elements);
  if (elements.length > 0) {
    clause(
      text('of the '),
      ...valueList('elements', elements, OR, (v) => label('elements', v)),
      text(' element'),
    );
  }

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
      text: filter.source === 'local' ? 'Local' : 'Compendium',
      facet: 'source',
      value: filter.source,
    });
    parts.push(text(' source'));
  }

  if (filter.inStock) {
    clause({ kind: 'value', text: 'in stock', facet: 'inStock', value: 'true' });
  }

  if (filter.lowStockOnly) {
    clause({
      kind: 'value',
      text: 'low or out of stock',
      facet: 'lowStockOnly',
      value: 'true',
    });
  }

  if (admin && filter.nomenclature) {
    clause(text('classified as '), {
      kind: 'value',
      text: filter.nomenclature,
      facet: 'nomenclature',
      value: filter.nomenclature,
    });
  }

  if (admin && filter.withoutReferences) {
    clause({
      kind: 'value',
      text: 'without references',
      facet: 'withoutReferences',
      value: 'true',
    });
  }

  if (admin && filter.withoutForms) {
    clause({
      kind: 'value',
      text: 'without forms',
      facet: 'withoutForms',
      value: 'true',
    });
  }

  return { fragments: merge(parts), hasFilter };
}
