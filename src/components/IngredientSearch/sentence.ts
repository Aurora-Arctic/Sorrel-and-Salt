import { formLabel } from '@/modules/ingredients/validation/form-label';
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

  const lead = total === 0 ? `No ${noun.other}` : `${total} ${total === 1 ? noun.one : noun.other}`;
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

  const categories = picked(filter.categories);
  if (categories.length > 0) {
    const any = filter.categoryMode === 'any';
    clause(
      text('in the '),
      ...valueList('categories', categories, any ? OR : AND, (v) => lower(label('categories', v))),
      text(!any && categories.length > 1 ? ' categories' : ' category'),
    );
  }

  const moonPhases = picked(filter.moonPhases);
  if (moonPhases.length > 0) {
    clause(text('in the moon phase '), ...valueList('moonPhases', moonPhases, OR, (v) => v));
  }

  const daysOfWeek = picked(filter.daysOfWeek);
  if (daysOfWeek.length > 0) {
    clause(text('for the day '), ...valueList('daysOfWeek', daysOfWeek, OR, (v) => v));
  }

  const visibilities = picked(filter.visibility ? [filter.visibility] : []);
  if (visibilities.length > 0) {
    clause(
      text('that are '),
      ...valueList('visibilities', visibilities, OR, (v) => lower(label('visibilities', v))),
    );
  }

  const makers = picked(filter.makers);
  if (makers.length > 0) {
    clause(text('made by '), ...valueList('makers', makers, OR, (v) => label('makers', v)));
  }

  const forms = picked(filter.forms);
  if (forms.length > 0) {
    clause(
      text('in the form '),
      ...valueList('forms', forms, OR, (v) => lower(formLabel(label('forms', v)))),
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

  const celestialBodies = picked(filter.celestialBodies);
  if (celestialBodies.length > 0) {
    clause(
      text('ruled by '),
      ...valueList('celestialBodies', celestialBodies, OR, (v) => {
        const name = label('celestialBodies', v);
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
      ...valueList('elements', elements, OR, (v) => lower(label('elements', v))),
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
      text: filter.source,
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
      text: lower(filter.nomenclature),
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

  if (admin && filter.hidden) {
    clause({
      kind: 'value',
      text: 'hidden from the public',
      facet: 'hidden',
      value: 'true',
    });
  }

  if (admin && (filter.reviewed === 'reviewed' || filter.reviewed === 'needs_review')) {
    clause({
      kind: 'value',
      text: filter.reviewed === 'reviewed' ? 'reviewed by a curator' : 'needing review',
      facet: 'reviewed',
      value: filter.reviewed,
    });
  }

  return { fragments: merge(parts), hasFilter };
}
