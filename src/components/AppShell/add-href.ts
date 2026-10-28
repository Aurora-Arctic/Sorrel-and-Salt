// The addresses that open and close a coven's Add Ingredient dialog (M8.16), and read a
// grimoire's New Spell (M10.12). `?new=ingredient-coven-<slug>` opens that coven's Add
// Ingredient on every page in the shell, admin pages included; `?new=ingredient` opens the
// default coven's, and so does a bare `?new` off the admin pages, where a bare `?new` is the
// page's own dialog. `?new=ingredient-compendium` is the compendium's New Entry on
// `/admin/compendium`. `?new=spell-<slug>` is that coven's New Spell and `?new=spell` the
// current grimoire's. A value naming a coven is a fixed prefix and then the whole slug, so a
// slug's own hyphens read one way. Apart from the button so that another control can open the
// same dialog by the same address (the empty list's first add, M9.11) without a second dialog.
// claude-docs/components/modal.md, "Add Ingredient".

import {
  NEW_COMPENDIUM_ENTRY,
  NEW_COVEN_INGREDIENT_PREFIX,
  NEW_INGREDIENT,
  NEW_SPELL,
  NEW_SPELL_PREFIX,
} from '../../lib/coven-path';

/** The address parameter that opens a dialog. */
export const NEW = 'new';

export {
  NEW_COMPENDIUM_ENTRY,
  NEW_COVEN_INGREDIENT_PREFIX,
  NEW_INGREDIENT,
  NEW_SPELL,
  NEW_SPELL_PREFIX,
};

/** The slug after a prefix, or `null` when the value does not start with it or names no slug. */
function slugAfter(value: string, prefix: string): string | null {
  return value.startsWith(prefix) && value.length > prefix.length
    ? value.slice(prefix.length)
    : null;
}

/**
 * Which Add Ingredient dialog a value of `?new` asks for: `default` for the default coven's,
 * a slug for a named coven's, and `null` for none, as for a spell's value, the compendium's or
 * no `?new`. A bare `?new` is the default coven's only off the admin pages.
 */
export function askedCoven(value: string | null, onAdmin = false): 'default' | string | null {
  if (value === null) return null;
  if (value === NEW_INGREDIENT || (value === '' && !onAdmin)) return 'default';
  return slugAfter(value, NEW_COVEN_INGREDIENT_PREFIX);
}

/**
 * Which coven's New Spell a value of `?new` asks for: `current` for the grimoire the page is
 * on (`?new=spell`), a slug for a named coven's (`?new=spell-<slug>`), and `null` for none.
 */
export function askedSpell(value: string | null): 'current' | string | null {
  if (value === null) return null;
  if (value === NEW_SPELL) return 'current';
  return slugAfter(value, NEW_SPELL_PREFIX);
}

/** The value of `?new` that opens a coven's Add Ingredient. */
export function covenIngredientValue(slug: string): string {
  return `${NEW_COVEN_INGREDIENT_PREFIX}${slug}`;
}

/** The value of `?new` that opens a coven's New Spell. */
export function spellValue(slug: string): string {
  return `${NEW_SPELL_PREFIX}${slug}`;
}

/** Whether a value of `?new` opens New Spell over this coven's grimoire. */
export function opensNewSpell(value: string | null, slug: string): boolean {
  const asked = askedSpell(value);
  return asked === 'current' || asked === slug;
}

/**
 * Where `?new=spell-<slug>` sends a page that is not that coven's grimoire: the grimoire,
 * with New Spell open. `null` when the page is already there or the value names no coven.
 * New Spell is a dialog over the grimoire, never drawn on another page.
 */
export function newSpellElsewhere(value: string | null, pathname: string): string | null {
  const asked = askedSpell(value);
  if (asked === null || asked === 'current') return null;
  const grimoire = `/coven/${asked}/grimoire`;
  if (pathname === grimoire || pathname.startsWith(`${grimoire}/`)) return null;
  return `${grimoire}?${NEW}=${spellValue(asked)}`;
}

/** The address with `?new=ingredient-coven-<slug>`, over its other parameters. */
export function openHref(pathname: string, params: URLSearchParams, slug: string): string {
  const rest = new URLSearchParams(params);
  rest.delete(NEW);
  rest.set(NEW, covenIngredientValue(slug));
  return `${pathname}?${rest}`;
}

/** The address with `?new` dropped. */
export function closedHref(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(NEW);
  const lead = rest.toString();
  return lead ? `${pathname}?${lead}` : pathname;
}
