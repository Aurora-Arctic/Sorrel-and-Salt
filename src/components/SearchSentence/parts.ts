import type { SearchSentenceFragment } from '../IngredientSearch/types';

/** A run of the clauses' text; a chosen value is `strong`, and a joining word ("or", "and") is `join`. */
export interface ClausePart {
  text: string;
  strong?: boolean;
  join?: boolean;
}

/**
 * The sentence cut into the three pieces the closed line and the typed line are made of:
 * the lead ("12 ingredients"), the term (" matching “rue”", or nothing) and the clauses
 * (the rest, "in the Protection category, as ..."), each ready to join with one space.
 */
export interface SentenceParts {
  lead: string;
  term: string;
  clauses: ClausePart[];
}

/**
 * `buildSearchSentence` writes "12 ingredients, matching “rue”, in the ... ": every
 * clause comes after a comma, the search term's too. The closed line reads "12 ingredients
 * matching “rue”" with no comma, so the sentence is taken apart here and the commas that
 * join the clauses are kept for the tail only.
 */
export function sentenceParts(
  fragments: readonly SearchSentenceFragment[],
  query: string,
): SentenceParts {
  const first = fragments[0];
  let lead = '';
  let rest: SearchSentenceFragment[] = [...fragments];
  if (first?.kind === 'text') {
    const at = first.text.indexOf(', ');
    lead = at < 0 ? first.text : first.text.slice(0, at);
    const remainder = at < 0 ? '' : first.text.slice(at + 2);
    rest = [
      ...(remainder ? [{ kind: 'text' as const, text: remainder }] : []),
      ...fragments.slice(1),
    ];
  }
  const term = query.trim();
  const [maybeMatching, maybeQuery] = rest;
  if (
    term &&
    maybeMatching?.kind === 'text' &&
    maybeMatching.text === 'matching ' &&
    maybeQuery?.kind === 'value' &&
    maybeQuery.facet === 'query'
  ) {
    rest = rest.slice(2);
    const next = rest[0];
    if (next?.kind === 'text' && next.text.startsWith(', ')) {
      rest = [
        ...(next.text.length > 2 ? [{ ...next, text: next.text.slice(2) }] : []),
        ...rest.slice(1),
      ];
    }
  }
  const clauses: ClausePart[] = rest.map((fragment) => ({
    text: fragment.text,
    ...(fragment.kind === 'value' ? { strong: true } : {}),
    ...(fragment.kind === 'join' ? { join: true } : {}),
  }));
  if (clauses.length > 0) clauses.push({ text: '.' });
  return { lead, term: term ? ` matching “${term}”` : '', clauses };
}

export const clausesText = (clauses: readonly ClausePart[]): string =>
  clauses.map((part) => part.text).join('');
