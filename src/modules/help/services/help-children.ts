import 'server-only';
import { findHelpArticleChildren } from '@/db/repository';
import type { Session } from '@/lib/session';
import type { HelpArticle } from '../types';
import { reachOf } from './reach';
import { toHelpArticles } from './rows';

/** A DataLoader batch: each parent's live children in position order, among the audiences the session reaches, from one query. */
export async function helpChildrenOf(
  session: Session | null,
  parentIds: readonly string[],
): Promise<HelpArticle[][]> {
  const reach = reachOf(session);
  const children = await toHelpArticles(await findHelpArticleChildren(reach, parentIds), reach);
  return parentIds.map((id) => children.filter((child) => child.parentId === id));
}
