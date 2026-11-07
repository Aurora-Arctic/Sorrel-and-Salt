import type { Route } from 'next';

export const copiedHrefOf = (covenSlug: string, id: string): Route =>
  `/coven/${covenSlug}/grimoire/drafts?${new URLSearchParams({ edit: id })}` as Route;
