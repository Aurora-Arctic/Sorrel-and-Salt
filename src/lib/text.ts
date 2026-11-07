// Written once so every service counts and lists alike: "A, B and C" rather than "A, B, and C".

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** One sentence for the vocabularies, the compendium and a coven's ingredients, so the wording is one edit. */
export function addressTaken(holder: string, slug: string, remedy: string): string {
  return `${holder} already has the address "${slug}" — ${remedy}`;
}

/** Not a title case, which would also raise "of" and "and"; a label that wants one is written so. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const emptyList = (things: string): string => `There are no ${things} yet.`;

/** Shared with lists that draw their filters as nodes (CompendiumList), so the wording has one source. */
export const noMatchLead = (noun: string): string => `No ${noun} match `;

/** A sentence of its own where something else has already said nothing matched, as a coven's list does under its search sentence. */
export const NO_MATCH_HINT = 'Change or clear the filter to see more.';

export const NO_MATCH_ADVICE = `. ${NO_MATCH_HINT}`;

/** `noun` is the plural, so one wording serves every list (claude-docs/modules.md, "Empty-list text"). */
export function noMatchText(noun: string, parts: readonly string[], emptyText: string): string {
  return parts.length ? `${noMatchLead(noun)}${joinAnd(parts)}${NO_MATCH_ADVICE}` : emptyText;
}

const SMALL_WORDS: ReadonlySet<string> = new Set([
  'of',
  'and',
  'in',
  'on',
  'the',
  'a',
  'an',
  'or',
  'for',
  'to',
  'with',
  'at',
  'by',
  'from',
]);

/** `part` with its first letter raised, unless a capital already sits inside it ("pH", "CBD"). */
function raised(part: string): string {
  if (/\p{Lu}/u.test(part.slice(1))) return part;
  return part.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

/** For display only: small words stay lower-case unless first, hyphenated parts are each raised, and a word with a capital past its first letter is left. Whitespace collapses, so it is a label, never a value to store. */
export function titleCase(text: string): string {
  return text
    .split(/\s+/u)
    .filter((word) => word !== '')
    .map((word, at) => {
      const lower = word.toLowerCase();
      if (at > 0 && SMALL_WORDS.has(lower) && word === lower) return word;
      return word.split('-').map(raised).join('-');
    })
    .join(' ');
}
