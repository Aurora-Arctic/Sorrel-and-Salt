import 'server-only';
import { findHelpArticlesWhoseBodyHolds, findOneById } from '@/db/repository';
import type { HelpArticleRow } from '@/db/repository';
import { NotFound } from '@/lib/errors';
import { marksInMarkdown } from '@/lib/help-marks';
import { helpPath } from '@/lib/help-paths';
import { HELP_QUICK_LINKS } from '@/lib/help-quick-links';
import type { Session } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { RowId } from '@/lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { helpArticles } from '../schema/help-articles';
import type { HelpRenameEffects } from '../types';
import { toHelpArticles } from './rows';

// Nothing redirects an old help address, so the editor reads this before a save that moves one and asks the keeper first
// (claude-docs/design-decisions/support.md, "Renaming a help row").

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether `body` holds `path` as a whole address, not as the start of a longer slug. */
const holdsAddress = (body: string, path: string): boolean =>
  new RegExp(`${escape(path)}(?![a-z0-9-])`, 'i').test(body);

/** Whether `body` marks the term once titled `title` (`[[Title]]`), by its title in any case or by its slug. */
const marksTerm = (body: string, title: string, slug: string): boolean =>
  marksInMarkdown(body).some(
    (name) => name.trim().toLowerCase() === title.trim().toLowerCase() || slugify(name) === slug,
  );

async function parentSlugOf(row: HelpArticleRow): Promise<string | null> {
  if (!row.parentId) return null;
  return (await findOneById(helpArticles, row.parentId))?.slug ?? null;
}

/**
 * What saving `title` on the row would leave pointing at its old address: the other rows' bodies that hold the address
 * (and, for a term, mark the old title), and the front page's quick links that read the old slug. Empty lists when the
 * slug does not move.
 *
 * @throws {Forbidden} the session is not a site keeper.
 * @throws {NotFound} no live row holds the id.
 */
export async function readHelpRenameEffects(
  session: Session,
  id: string,
  title: string,
): Promise<HelpRenameEffects> {
  assertSiteAdmin(session);
  const row = RowId.safeParse(id).success ? await findOneById(helpArticles, id) : undefined;
  if (!row) throw new NotFound('Help article not found');
  const parentSlug = await parentSlugOf(row);
  const oldPath = helpPath({ ...row, parentSlug });
  const newSlug = slugify(title);
  const newPath = helpPath({ ...row, slug: newSlug, parentSlug });
  if (newSlug === row.slug || newSlug === '') {
    return { oldPath, newPath, articles: [], quickLinks: [] };
  }
  const term = row.kind === 'term';
  // A term is marked by name, so any body with a mark is a candidate; any other row is linked by its address.
  const candidates = await findHelpArticlesWhoseBodyHolds(term ? '[[' : oldPath);
  const holders = candidates.filter(
    (other) =>
      other.id !== row.id &&
      (holdsAddress(other.body, oldPath) || (term && marksTerm(other.body, row.title, row.slug))),
  );
  const quickLinks =
    row.kind === 'article' && row.audience === 'public'
      ? HELP_QUICK_LINKS.filter((linked) => slugify(linked) === row.slug)
      : [];
  return { oldPath, newPath, articles: await toHelpArticles(holders, 'keeper'), quickLinks };
}
