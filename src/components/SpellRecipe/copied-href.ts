import type { Route } from 'next';
import { covenPath } from '@/lib/coven-path';

export const copiedHrefOf = (covenSlug: string, id: string): Route =>
  `${covenPath(covenSlug, 'grimoire', 'drafts')}?${new URLSearchParams({ edit: id })}` as Route;
