// The addresses that open and close a coven's Add Ingredient dialog (M8.16): `?new=ingredient`
// the default coven's, `?new=<slug>` a named one's. A bare `?new` still reads as
// `?new=ingredient`, so a link saved before the value existed keeps working, and so do the
// admin pages' own `?new`. `?new=spell` is the grimoire's New Spell (M10.12), never this
// dialog. Each value that opens a dialog is a reserved coven slug (`isReservedCovenSlug`), so
// `?new` never means two things. Apart from the button so that another control can open the
// same dialog by the same address (the empty list's first add, M9.11) without a second dialog.
// claude-docs/components/modal.md, "Add Ingredient".

import { NEW_INGREDIENT, NEW_SPELL } from '../../lib/coven-path';

/** The address parameter that opens a coven's dialog. */
export const NEW = 'new';

export { NEW_INGREDIENT, NEW_SPELL };

/**
 * Which Add Ingredient dialog a value of `?new` asks for: `default` for the default coven's,
 * a slug for a named coven's, and `null` for none, as for `?new=spell` or no `?new`.
 */
export function askedCoven(value: string | null): 'default' | string | null {
  if (value === null || value === NEW_SPELL) return null;
  return value === '' || value === NEW_INGREDIENT ? 'default' : value;
}

/** The address with `?new=ingredient`, or `?new=<slug>` for a coven other than the default, over its other parameters. */
export function openHref(pathname: string, params: URLSearchParams, slug?: string): string {
  const rest = new URLSearchParams(params);
  rest.delete(NEW);
  rest.set(NEW, slug ?? NEW_INGREDIENT);
  return `${pathname}?${rest}`;
}

/** The address with `?new` dropped. */
export function closedHref(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(NEW);
  const lead = rest.toString();
  return lead ? `${pathname}?${lead}` : pathname;
}
