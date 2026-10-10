// The English a refusal is phrased in, written once so that every service
// counts and lists alike: "1 form" beside "2 forms", "A, B and C" rather than
// "A, B, and C". Pure, so a form may phrase its own text through it too.

/** `one` when `count` is 1, else `many`: the word alone, the count being the caller's to place. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** The items as a sentence lists them: "A", "A and B", "A, B and C". */
export function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The refusal of a write whose slug another live row holds (MB.43): `holder`
 * names that row, as the refusing service tells one apart, and `remedy` says
 * which fields make the address. One sentence for the curated vocabularies,
 * the compendium and a coven's ingredients, so the wording is one edit.
 */
export function addressTaken(holder: string, slug: string, remedy: string): string {
  return `${holder} already has the address "${slug}" — ${remedy}`;
}
