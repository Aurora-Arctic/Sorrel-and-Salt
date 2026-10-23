/**
 * Where an entry's "Back to …" link may return to, given the address of the page before it in
 * the tab's history (MB.271): that page's path and query, but only when it is on this origin
 * and at exactly the entry's own list (`listPath`: `/compendium`, or this coven's
 * `/coven/<slug>/ingredients`). Anything else, or no page before it, is `undefined`, and the
 * link stays the bare list. The path is matched whole rather than by prefix, so another coven,
 * an entry page or an admin list is never taken for the list. A fragment is dropped.
 */
export function listReturnHref(
  previous: string | null | undefined,
  origin: string,
  listPath: string,
): string | undefined {
  if (!previous) return undefined;
  let url: URL;
  try {
    url = new URL(previous);
  } catch {
    return undefined;
  }
  if (url.origin !== origin || url.pathname !== listPath) return undefined;
  return `${url.pathname}${url.search}`;
}
