/** The names two or more of the covens share. Names are not unique, only addresses are, so a switcher shows the address beside these. */
export function repeatedCovenNames(covens: readonly { name: string }[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const { name } of covens) {
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }
  return repeated;
}
