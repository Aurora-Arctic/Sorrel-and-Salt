import 'server-only';
import type { Route } from 'next';
import { cache } from 'react';
import { KEEPERS_HELP, keepersHelpHref } from '@/components/HelpOutline/href';
import type { HelpOutlineFilter } from '@/components/HelpOutline/types';
import type { HelpGuideChoice, HelpSubPageChoice } from '@/components/HelpArticleForm/types';
import { allPages } from '@/lib/pagination';
import type { Session } from '@/lib/session';
import { type HelpArticle, listKeeperHelpArticles } from '@/modules/help';

const NO_FILTER: HelpOutlineFilter = { query: '', kind: '', audience: '', shown: 'all' };

/**
 * What the help form offers: every live guide, in reading order, with how many sub pages it holds; and every live article,
 * each guide's sub pages grouped under it in order and the top-level articles after them, as the Sub Pages field offers them.
 */
export const readHelpFormChoices = cache(
  async (
    session: Session,
  ): Promise<{ guides: HelpGuideChoice[]; candidates: HelpSubPageChoice[] }> => {
    const read = (kind: 'guide' | 'article') =>
      allPages((request) =>
        listKeeperHelpArticles(session, { kind, listing: 'all', order: 'position' }, request),
      );
    const [tops, articles] = await Promise.all([read('guide'), read('article')]);
    const subPages = new Map<string, HelpArticle[]>();
    for (const article of articles) {
      if (!article.parentId) continue;
      subPages.set(article.parentId, [...(subPages.get(article.parentId) ?? []), article]);
    }
    const guides = tops.map(({ id, title, slug, audience }) => ({
      id,
      title,
      slug,
      audience,
      subPages: subPages.get(id)?.length ?? 0,
    }));
    const choice = (article: HelpArticle, parent: HelpArticle | null): HelpSubPageChoice => ({
      id: article.id,
      title: article.title,
      audience: article.audience,
      parentId: parent?.id ?? null,
      parentTitle: parent?.title ?? null,
    });
    const candidates = [
      ...tops.flatMap((guide) => (subPages.get(guide.id) ?? []).map((sub) => choice(sub, guide))),
      ...articles.filter(({ parentId }) => parentId === null).map((lone) => choice(lone, null)),
    ];
    return { guides, candidates };
  },
);

/** Where the form returns to: the outline at the row's guide, or at the FAQ or the glossary. */
export function helpFormReturn(
  kind: HelpArticle['kind'] | undefined,
  guideId: string | null | undefined,
): Route {
  if (kind === 'faq') return keepersHelpHref(NO_FILTER, 'faq');
  if (kind === 'term') return keepersHelpHref(NO_FILTER, 'glossary');
  return guideId ? keepersHelpHref(NO_FILTER, { guide: guideId }) : (KEEPERS_HELP as Route);
}
