import type { Route } from 'next';

// Where a duplicated spell opens: the grimoire's Drafts tab, which the copy is in, with the copy in
// the builder's dialog. Shared by both Duplicate buttons.

/** The Drafts tab of a coven's grimoire with the spell `id` open in the builder. */
export const copiedHrefOf = (covenSlug: string, id: string): Route =>
  `/coven/${covenSlug}/grimoire/drafts?${new URLSearchParams({ edit: id })}` as Route;
