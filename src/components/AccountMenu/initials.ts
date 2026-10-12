/**
 * Up to two capital letters for an avatar: the first letters of the first and
 * last words of the name ("Rowan Ashby" is RA, "Rowan" is R). A blank name
 * has none, and the avatar shows a question mark so the disc is never empty.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const letters = [first, last].flatMap((word) => (word ? [[...word][0] ?? ''] : []));
  return letters.join('').toUpperCase() || '?';
}
