import type { Route } from 'next';

/** A compendium entry's public address; the slug is encoded, so no value adds a segment or a query of its own. */
export const compendiumEntryPath = (slug: string): Route =>
  `/compendium/ingredients/${encodeURIComponent(slug)}` as Route;
