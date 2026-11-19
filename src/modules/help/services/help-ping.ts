import 'server-only';
import { helpPath } from '@/lib/help-paths';
import { pingIndexNowAfterResponse } from '@/lib/indexnow';
import type { HelpArticle } from '../types';

/** A term or an FAQ entry sits on a page of its own kind, so the fragment is dropped: IndexNow is told the page, not where on it. */
const pageOf = (article: HelpArticle): string => helpPath(article).replace(/#.*$/, '');

/**
 * Tells IndexNow the public pages of `articles`, each a row that had a page before the write or has one after. Staff and
 * keeper help is behind sign-in, so it has no public page to tell a search engine of.
 */
export async function pingHelpPages(
  ...articles: ReadonlyArray<HelpArticle | undefined>
): Promise<void> {
  await pingIndexNowAfterResponse(
    articles.flatMap((article) => (article?.audience === 'public' ? [pageOf(article)] : [])),
  );
}
