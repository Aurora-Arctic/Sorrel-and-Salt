/** Where an entry's "Back to …" link may return to, from the previous page's address (claude-docs/components/ingredient-entry.md, "Component notes"). */
export function listReturnHref(
  previous: string | null | undefined,
  origin: string,
  listPaths: string | readonly string[],
): string | undefined {
  if (!previous) return undefined;
  let url: URL;
  try {
    url = new URL(previous);
  } catch {
    return undefined;
  }
  const paths = typeof listPaths === 'string' ? [listPaths] : listPaths;
  if (url.origin !== origin || !paths.includes(url.pathname)) return undefined;
  return `${url.pathname}${url.search}`;
}
