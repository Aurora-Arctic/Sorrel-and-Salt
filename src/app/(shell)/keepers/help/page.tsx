import type { Metadata, Route } from 'next';
import { cache } from 'react';
import { ADMIN_PAGES } from '../../../../components/AdminNav/sections';
import HelpOutline from '../../../../components/HelpOutline';
import { keepersHelpHref } from '../../../../components/HelpOutline/href';
import type {
  HelpOutlineFilter,
  HelpOutlineGuide,
  HelpOutlineOther,
  HelpOutlinePane,
  HelpOutlineRow,
  HelpOutlineShown,
  HelpOutlineView,
} from '../../../../components/HelpOutline/types';
import PageHeader from '../../../../components/PageHeader';
import { helpPath, keeperHelpEditPath } from '../../../../lib/help-paths';
import { listHref, pagerHrefs } from '../../../../lib/list-href';
import { readPageCursors } from '../../../../lib/numbered-page';
import { allPages, resolvePage } from '../../../../lib/pagination';
import { requireAdminSession } from '../../../../lib/request-session';
import { single } from '../../../../lib/search-params';
import type { Session } from '../../../../lib/session';
import {
  type HelpArticle,
  type HelpAudience,
  listKeeperHelpArticles,
  readKeeperHelpArticle,
} from '@/modules/help';
import AddAction from '../../curator/add-action';

export const metadata: Metadata = {
  title: 'Help',
};

const { label } = ADMIN_PAGES.help;
const NEW_PATH = '/keepers/help/new';

const KINDS = ['article', 'faq', 'term'] as const;
const AUDIENCES = ['public', 'staff', 'keeper'] as const;
const LISTINGS = ['hidden', 'all'] as const;

const pick = <Value extends string>(values: readonly Value[], raw: string | undefined) =>
  values.find((value) => value === raw);

// Every row of one kind the filter admits, in reading order. Keyed by plain arguments, so React's cache matches a repeat.
const readAll = cache(
  (
    session: Session,
    kind: HelpArticle['kind'],
    audience: HelpAudience | '',
    listing: HelpOutlineShown,
    topLevel: boolean,
  ) =>
    allPages((request) =>
      listKeeperHelpArticles(
        session,
        {
          kind,
          audience: audience || null,
          listing,
          topLevel: topLevel || null,
          order: kind === 'term' ? 'title' : 'position',
        },
        request,
      ),
    ),
);

const readSearch = cache(
  (session: Session, filter: HelpOutlineFilter, after?: string, before?: string) =>
    resolvePage(
      after === undefined && before !== undefined ? { last: 25, before } : { first: 25, after },
      (request) =>
        listKeeperHelpArticles(
          session,
          {
            query: filter.query,
            kind: filter.kind || null,
            audience: filter.audience || null,
            listing: filter.shown,
          },
          request,
        ),
    ),
);

const toRow = (article: HelpArticle): HelpOutlineRow => ({
  id: article.id,
  title: article.title,
  kind: article.kind,
  audience: article.audience,
  position: article.position,
  shown: article.shown,
  editHref: keeperHelpEditPath(article.id) as Route,
});

const readView = (
  params: Record<string, string | string[] | undefined>,
): HelpOutlineView | undefined => {
  const view = single(params.view);
  if (view === 'faq' || view === 'glossary') return view;
  const guide = single(params.guide);
  return guide ? { guide } : undefined;
};

// Keepers › Help as an outline: the guides in reading order, the chosen one's sub pages to order, and the FAQ and the
// glossary (claude-docs/components/help-outline.md). SQL narrows each list by the filter; only the grouping of sub
// pages under their guides happens here.
export default async function KeepersHelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readPageCursors(params);
  const filter: HelpOutlineFilter = {
    query: single(params.q)?.trim() ?? '',
    kind: pick(KINDS, single(params.kind)) ?? '',
    audience: pick(AUDIENCES, single(params.audience)) ?? '',
    shown: pick(LISTINGS, single(params.shown)) ?? 'shown',
  };
  const { audience, shown } = filter;
  const wants = (kind: HelpArticle['kind']) => filter.kind === '' || filter.kind === kind;

  // Every guide, whatever the filter, numbers the guides and names a search hit's guide.
  const [everyGuide, guides, articles, faq, terms] = await Promise.all([
    readAll(session, 'article', '', 'all', true),
    wants('article') ? readAll(session, 'article', audience, shown, true) : [],
    wants('article') ? readAll(session, 'article', audience, shown, false) : [],
    wants('faq') ? readAll(session, 'faq', audience, shown, false) : [],
    wants('term') ? readAll(session, 'term', audience, shown, false) : [],
  ]);
  const place = new Map(everyGuide.map((guide, at) => [guide.id, at + 1]));
  const guideTitle = new Map(everyGuide.map((guide) => [guide.id, guide.title]));
  const subPageCount = new Map<string, number>();
  for (const { parentId } of articles) {
    if (parentId) subPageCount.set(parentId, (subPageCount.get(parentId) ?? 0) + 1);
  }

  // The view asked for, while the filter still admits it; else the first guide, then the FAQ, then the glossary.
  const asked = readView(params);
  const admitted =
    (typeof asked === 'object' && guides.some(({ id }) => id === asked.guide)) ||
    (asked === 'faq' && wants('faq')) ||
    (asked === 'glossary' && wants('term'));
  const fallback: HelpOutlineView | undefined = guides[0]
    ? { guide: guides[0].id }
    : wants('faq')
      ? 'faq'
      : wants('term')
        ? 'glossary'
        : undefined;
  const view = admitted ? asked : fallback;
  const chosenId = typeof view === 'object' ? view.guide : undefined;
  const browsing = !filter.query;

  const outlineGuides: HelpOutlineGuide[] = guides.map((guide) => ({
    ...toRow(guide),
    position: place.get(guide.id) ?? null,
    subPages: subPageCount.get(guide.id) ?? 0,
    href: keepersHelpHref(filter, { guide: guide.id }),
    current: browsing && guide.id === chosenId,
  }));
  const others: HelpOutlineOther[] = [];
  if (wants('faq')) {
    others.push({
      label: 'FAQ',
      count: faq.length,
      href: keepersHelpHref(filter, 'faq'),
      current: browsing && view === 'faq',
    });
  }
  if (wants('term')) {
    others.push({
      label: 'Glossary',
      count: terms.length,
      href: keepersHelpHref(filter, 'glossary'),
      current: browsing && view === 'glossary',
    });
  }

  const readPane = async (): Promise<HelpOutlinePane> => {
    if (filter.query) {
      const page = await readSearch(session, filter, after, before);
      return {
        kind: 'search',
        rows: page.edges.map(({ node }) => ({
          ...toRow(node),
          guideTitle: node.parentId ? (guideTitle.get(node.parentId) ?? null) : null,
        })),
        ...pagerHrefs(page.pageInfo, (cursor) => keepersHelpHref(filter, undefined, cursor)),
      };
    }
    if (view === 'faq') return { kind: 'faq', rows: faq.map(toRow) };
    if (view === 'glossary') return { kind: 'glossary', rows: terms.map(toRow) };
    if (!chosenId) return { kind: 'empty' };
    // The guide's whole order, hidden sub pages and those the filter leaves out among them, is what a move writes back.
    const guide = await readKeeperHelpArticle(session, chosenId);
    const listed = new Set(articles.map(({ id }) => id));
    return {
      kind: 'guide',
      guide: {
        ...toRow(guide),
        address: helpPath(guide),
        place: place.get(guide.id) ?? 0,
        of: everyGuide.length,
        order: guide.children.map(({ id }) => id),
        subPages: guide.children
          .map((child, index) => ({ ...toRow(child), index }))
          .filter(({ id }) => listed.has(id)),
        addSubPageHref: listHref(NEW_PATH, { parent: guide.id }),
      },
    };
  };

  return (
    // One tab, so a plain heading, as its skeleton draws it (AdminPageSkeleton).
    <main>
      <PageHeader
        title={label}
        action={<AddAction href={NEW_PATH as Route}>Add Help Article</AddAction>}
      />
      <HelpOutline filter={filter} guides={outlineGuides} others={others} pane={await readPane()} />
    </main>
  );
}
