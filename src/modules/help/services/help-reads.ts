import 'server-only';
import {
  findHelpArticleBySlug,
  findHelpArticleChildren,
  findHelpArticleIndexPage,
  findHelpArticleSearchPage,
  findHelpArticleStaffPage,
  findHelpFaqPage,
  findHelpGlossaryPage,
} from '@/db/repository';
import type { HelpArticleRow } from '@/db/repository';
import { cachedHelpRead } from '@/lib/help-cache';
import { NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import type { PageEntry, PageRequest } from '@/lib/types';
import { assertCurator } from '@/modules/identity';
import type { HelpArticle, HelpArticleWithChildren, HelpReach } from '../types';
import { reachOf } from './reach';
import { toHelpArticle } from './rows';

// The public reads take no session: a signed-out reader sees what any reader sees, and a staff or keeper row, a draft or a deleted one is never answered.
// The staff reads and the search are never cached, since what they answer depends on who asks.

const mapPage = (entries: PageEntry<HelpArticleRow>[]): PageEntry<HelpArticle>[] =>
  entries.map(({ node, cursor }) => ({ node: toHelpArticle(node), cursor }));

async function withChildren(
  row: HelpArticleRow,
  reach: HelpReach,
): Promise<HelpArticleWithChildren> {
  const children = row.kind === 'article' ? await findHelpArticleChildren(reach, [row.id]) : [];
  return { ...toHelpArticle(row), children: children.map(toHelpArticle) };
}

async function publicFaq(page: PageRequest) {
  return mapPage(await findHelpFaqPage(page));
}

async function publicIndex(page: PageRequest) {
  return mapPage(await findHelpArticleIndexPage(page));
}

async function publicGlossary(page: PageRequest) {
  return mapPage(await findHelpGlossaryPage(page));
}

async function publicArticle(slug: string): Promise<HelpArticleWithChildren> {
  const row = await findHelpArticleBySlug(slug, 'public');
  if (!row) throw new NotFound('Help article not found');
  return withChildren(row, 'public');
}

/** The public FAQ entries, in position order. */
export const readHelpFaq = cachedHelpRead('help-faq', publicFaq);

/** The public top-level articles, in position order. */
export const readHelpArticleIndex = cachedHelpRead('help-index', publicIndex);

/** The public glossary terms, A to Z. */
export const readHelpGlossary = cachedHelpRead('help-glossary', publicGlossary);

/** @throws {NotFound} no live public row holds the slug. */
export const readHelpArticle = cachedHelpRead('help-article', publicArticle);

/**
 * A row of any audience the session reaches, with the children it reaches.
 *
 * @throws {Forbidden} the session is neither a curator nor a keeper.
 * @throws {NotFound} no live row holds the slug within the session's reach.
 */
export async function readStaffHelpArticle(
  session: Session,
  slug: string,
): Promise<HelpArticleWithChildren> {
  assertCurator(session);
  const reach = reachOf(session);
  const row = await findHelpArticleBySlug(slug, reach);
  if (!row) throw new NotFound('Help article not found');
  return withChildren(row, reach);
}

/**
 * Every live row of every kind the session reaches, A to Z.
 *
 * @throws {Forbidden} the session is neither a curator nor a keeper.
 */
export async function listStaffHelpArticles(
  session: Session,
  page: PageRequest,
): Promise<PageEntry<HelpArticle>[]> {
  assertCurator(session);
  return mapPage(await findHelpArticleStaffPage(reachOf(session), page));
}

/** The rows the reader reaches that `query` finds, best first; a blank query finds none. A null session is a signed-out reader. */
export async function searchHelp(
  session: Session | null,
  query: string,
  page: PageRequest,
): Promise<PageEntry<HelpArticle, { score: number }>[]> {
  const text = query.trim();
  if (text === '') return [];
  const entries = await findHelpArticleSearchPage(reachOf(session), text, page);
  return entries.map(({ node, cursor, score }) => ({ node: toHelpArticle(node), cursor, score }));
}
