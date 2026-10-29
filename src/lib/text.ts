// The English a refusal is phrased in, written once so that every service
// counts and lists alike: "1 form" beside "2 forms", "A, B and C" rather than
// "A, B, and C". Pure, so a form may phrase its own text through it too.

/** `one` when `count` is 1, else `many`: the word alone, the count being the caller's to place. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** The items as a sentence lists them: "A", "A and B", "A, B and C". */
export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The refusal of a write whose slug another live row holds: `holder`
 * names that row, as the refusing service tells one apart, and `remedy` says
 * which fields make the address. One sentence for the curated vocabularies,
 * the compendium and a coven's ingredients, so the wording is one edit.
 */
export function addressTaken(holder: string, slug: string, remedy: string): string {
  return `${holder} already has the address "${slug}" — ${remedy}`;
}

/**
 * `text` with its first letter upper-cased and the rest as written: "oil" is
 * "Oil", "the form" is "The form". Not a title case, which would also raise
 * "of" and "and"; a label that wants one is written so.
 */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The start of a no-match sentence, before the filters. A list that draws its filters as nodes (CompendiumList) builds from the same two pieces, so the wording has one source. */
export const noMatchLead = (noun: string): string => `No ${noun} match `;

/**
 * What to do when a filter matches nothing. A sentence of its own where something else has
 * already said nothing matched, as a coven's list does under its search sentence.
 */
export const NO_MATCH_HINT = 'Change or clear the filter to see more.';

/** The end of a no-match sentence, after the filters. */
export const NO_MATCH_ADVICE = `. ${NO_MATCH_HINT}`;

/**
 * What an admin list says when it shows no rows. With a filter in
 * force, `parts` names each filter as the caller phrases it — `“wort”`, `the
 * role Admin`, `No Refs` — and the sentence says nothing matches them and how
 * to see more: "No users match “ada” and the role Admin. Change or clear the
 * filter to see more." With none, the list itself is empty, and `emptyText`
 * is the caller's own sentence for that.
 *
 * `noun` is the plural, matched by a plural verb: one wording for all six
 * lists, where the compendium said "No entry matches", the invitations "No
 * invitation matches", the users "No users match", the group and value lists
 * "No category matches that filter. Try another name." and the ledger "No
 * admin changes for “x”." The plural reads true however many rows the list
 * could have held, and each filter is named rather than called "that filter",
 * so an admin sees which one to change.
 */
export function noMatchText(noun: string, parts: readonly string[], emptyText: string): string {
  return parts.length ? `${noMatchLead(noun)}${joinAnd(parts)}${NO_MATCH_ADVICE}` : emptyText;
}

/** The short words a title leaves lower-case unless they open it. */
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

/**
 * `text` in title case, for display only: "dried leaf" is "Dried Leaf", "oil of
 * cloves" is "Oil of Cloves". The small words of, and, in, on, the, a, an, or,
 * for, to, with, at, by and from stay lower-case unless they come first; each
 * part of a hyphenated word is raised ("cold-pressed" is "Cold-Pressed"); a
 * word that already holds a capital past its first letter is left as written.
 * Runs of whitespace become one space, so the result is a label and never a
 * value to store: a stored form keeps what was typed, and matching folds case.
 */
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
