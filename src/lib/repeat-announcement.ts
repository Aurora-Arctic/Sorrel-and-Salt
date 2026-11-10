// A live region speaks only a change, so a sentence said twice in a row is silent. Every other
// repeat adds a trailing no-break space: `count` is how many times it has been said, and the
// even counts carry the space. Nothing is added to an empty sentence.
export function repeatable(text: string, count: number): string {
  return text && count > 0 && count % 2 === 0 ? `${text} ` : text;
}
