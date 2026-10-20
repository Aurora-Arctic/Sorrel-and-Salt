// The addresses that open and close a coven's Add Ingredient dialog (M8.16): `?new` the
// default coven's, `?new=<slug>` a named one's. Apart from the button so that another
// control can open the same dialog by the same address (the empty list's first add, M9.11)
// without a second dialog. claude-docs/components/modal.md, "Add Ingredient".

/** The address parameter that opens a coven's dialog. */
export const NEW = 'new';

/** The address with `?new`, or `?new=<slug>` for a coven other than the default, over its other parameters. */
export function openHref(pathname: string, params: URLSearchParams, slug?: string): string {
  const rest = new URLSearchParams(params);
  rest.delete(NEW);
  const lead = rest.toString();
  return `${pathname}?${lead ? `${lead}&` : ''}${NEW}${slug ? `=${encodeURIComponent(slug)}` : ''}`;
}

/** The address with `?new` dropped. */
export function closedHref(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(NEW);
  const lead = rest.toString();
  return lead ? `${pathname}?${lead}` : pathname;
}
