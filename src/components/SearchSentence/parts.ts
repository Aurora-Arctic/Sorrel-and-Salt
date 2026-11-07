import type { SearchSentenceFragment } from '../IngredientSearch/types';

export const MATCHING = ' matching ';

export interface ClausePart {
  text: string;
  strong?: boolean;
  join?: boolean;
}

export interface SentenceParts {
  lead: string;
  term: string;
  clauses: ClausePart[];
}

// `buildSearchSentence` puts a comma before every clause, the search term's too; the closed line
// has none, so the sentence is taken apart here and the commas kept for the tail only.
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
  return { lead, term: term ? `${MATCHING}${term}` : '', clauses };
}

export const clausesText = (clauses: readonly ClausePart[]): string =>
  clauses.map((part) => part.text).join('');
