import 'server-only';
import {
  findHelpArticleBySlug,
  findHelpArticleChildren,
  findHelpArticlePathPage,
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
import { toHelpArticles } from './rows';

// The public reads take no session: a signed-out reader sees what any reader sees, and a staff or keeper row, a draft or a deleted one is never answered.
// The staff reads and the search are never cached, since what they answer depends on who asks.

async function mapPage(
  entries: PageEntry<HelpArticleRow>[],
  reach: HelpReach,
): Promise<PageEntry<HelpArticle>[]> {
  const nodes = await toHelpArticles(
    entries.map((entry) => entry.node),
    reach,
  );
  return entries.map(({ cursor }, index) => ({ node: nodes[index], cursor }));
}

async function withChildren(
  row: HelpArticleRow,
  reach: HelpReach,
): Promise<HelpArticleWithChildren> {
  const children = row.kind === 'article' ? await findHelpArticleChildren(reach, [row.id]) : [];
  const [article, ...answered] = await toHelpArticles([row, ...children], reach);
  return { ...article, children: answered };
}

async function publicFaq(page: PageRequest) {
  return mapPage(await findHelpFaqPage(page), 'public');
}

async function publicIndex(page: PageRequest) {
  return mapPage(await findHelpArticleIndexPage(page), 'public');
}

async function publicGlossary(page: PageRequest) {
  return mapPage(await findHelpGlossaryPage(page), 'public');
}

// Wide enough for every public article the help centre will hold; the sitemap lists no more.
const PATHS_LIMIT = 2001;

async function publicPaths(): Promise<string[]> {
  const entries = await findHelpArticlePathPage({ limit: PATHS_LIMIT, inverted: false });
  const rows = entries.map((entry) => entry.node);
  const topLevel = new Map(rows.filter((row) => !row.parentId).map((row) => [row.id, row.slug]));
  return rows.flatMap((row) => {
    if (!row.parentId) return [`/help/${row.slug}`];
    const parent = topLevel.get(row.parentId);
    return parent ? [`/help/${parent}/${row.slug}`] : [];
  });
}

async function publicArticle(slug: string): Promise<HelpArticleWithChildren> {
  const row = await findHelpArticleBySlug(slug, 'public');
  if (!row) throw new NotFound('Help article not found');
  return withChildren(row, 'public');
}

const cachedPaths = cachedHelpRead('help-paths', publicPaths);

/** The address of each public article and public sub page, which the sitemap lists. Takes no session: one cached read for every viewer. */
export function listHelpArticlePaths(): Promise<string[]> {
  return cachedPaths();
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
  const reach = reachOf(session);
  return mapPage(await findHelpArticleStaffPage(reach, page), reach);
}

/** The rows the reader reaches that `query` finds, best first; a blank query finds none. A null session is a signed-out reader. */
export async function searchHelp(
  session: Session | null,
  query: string,
  page: PageRequest,
): Promise<PageEntry<HelpArticle, { score: number }>[]> {
  const text = query.trim();
  if (text === '') return [];
  const reach = reachOf(session);
  const entries = await findHelpArticleSearchPage(reach, text, page);
  const nodes = await toHelpArticles(
    entries.map((entry) => entry.node),
    reach,
  );
  return entries.map(({ cursor, score }, index) => ({ node: nodes[index], cursor, score }));
}
