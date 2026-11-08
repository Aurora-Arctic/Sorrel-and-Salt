import type { Route } from 'next';
import { listHref } from '../../lib/list-href';
import type { HelpOutlineFilter, HelpOutlineView } from './types';

export const KEEPERS_HELP = '/keepers/help';

/** The list's address under `filter`, showing `view`; the defaults (any kind or audience, Shown, the first guide) are left out. */
export function keepersHelpHref(
  filter: HelpOutlineFilter,
  view?: HelpOutlineView,
  cursor: { after?: string; before?: string } = {},
): Route {
  return listHref(KEEPERS_HELP, {
    q: filter.query.trim() || undefined,
    kind: filter.kind || undefined,
    audience: filter.audience || undefined,
    shown: filter.shown === 'shown' ? undefined : filter.shown,
    guide: typeof view === 'object' ? view.guide : undefined,
    view: typeof view === 'string' ? view : undefined,
    ...cursor,
  });
}
