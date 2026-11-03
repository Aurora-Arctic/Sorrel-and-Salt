// Joins a short list for a sentence on screen, with the Oxford comma: "sage, rue, and thyme".
// Written by hand because TypeScript's configured library has no `Intl.ListFormat` type here.
export function joinList(items: readonly string[], word: 'and' | 'or'): string {
  if (items.length < 3) return items.join(` ${word} `);
  return `${items.slice(0, -1).join(', ')}, ${word} ${items[items.length - 1]}`;
}
