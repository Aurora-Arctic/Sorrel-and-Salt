import type { ReactNode } from 'react';

const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `text` with each of the query's words, in any case, wrapped in a `<mark>`. */
export function emphasise(text: string, query: string): ReactNode {
  const words = query.split(/\s+/).filter(Boolean).map(escape);
  if (words.length === 0) return text;
  // A capturing split puts every match at an odd index.
  return text
    .split(new RegExp(`(${words.join('|')})`, 'gi'))
    .map((part, index) => (index % 2 === 1 ? <mark key={index}>{part}</mark> : part));
}
