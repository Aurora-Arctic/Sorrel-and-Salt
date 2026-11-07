import type { Metadata } from 'next';
import { cache } from 'react';
import { ADMIN_PAGES } from '../../../../components/AdminNav/sections';
import HelpList from '../../../../components/HelpList';
import type { HelpListEntry } from '../../../../components/HelpList/types';
import TabbedPage from '../../../../components/TabbedPage';
import { listHref, pagerHrefs } from '../../../../lib/list-href';
import { allPages, resolvePage } from '../../../../lib/pagination';
import { readPageCursors } from '../../../../lib/numbered-page';
import { requireAdminSession } from '../../../../lib/request-session';
import type { Session } from '../../../../lib/session';
import { single } from '../../../../lib/search-params';
import { listStaffHelpArticles } from '@/modules/help';
import AddAction from '../../curator/add-action';
import HelpDialog from './dialog';

export const metadata: Metadata = {
  title: 'Help',
};

const { label, tabs } = ADMIN_PAGES.help;
const PATH = '/keepers/help';

// Every row once, so the parent choices and an edit lookup reach rows off the shown page. A keeper writes few of them.
const readAll = cache((session: Session) =>
  allPages((request) => listStaffHelpArticles(session, request)),
);

const readPage = cache((session: Session, after: string | undefined, before: string | undefined) =>
  resolvePage(
    after === undefined && before !== undefined ? { last: 25, before } : { first: 25, after },
    (request) => listStaffHelpArticles(session, request),
  ),
);

// The help rows to write, preview and order. A modal over the list does the writing, opened by `?new` or `?edit=<id>`.
export default async function KeepersHelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const { after, before } = readPageCursors(params);
  const adding = params.new !== undefined;
  const editId = adding ? undefined : single(params.edit);
  const [page, all] = await Promise.all([readPage(session, after, before), readAll(session)]);

  const here = { after, before };
  const articles = page.edges.map(({ node }): HelpListEntry => ({
    id: node.id,
    title: node.title,
    kind: node.kind,
    audience: node.audience,
    position: node.position,
    editHref: listHref(PATH, { ...here, edit: node.id }),
    editHeading: { eyebrow: 'Edit Help Article', title: node.title },
  }));
  const parents = all
    .filter(({ kind, parentId }) => kind === 'article' && parentId === null)
    .map(({ id, title, audience }) => ({ id, title, audience }));
  const edited = editId ? all.find(({ id }) => id === editId) : undefined;
  const closeHref = listHref(PATH, here);

  return (
    <TabbedPage
      title={label}
      tabs={tabs}
      action={
        <AddAction
          href={listHref(PATH, { ...here, new: true })}
          heading={{ title: 'Add Help Article' }}
        >
          Add Help Article
        </AddAction>
      }
    >
      <HelpList
        articles={articles}
        {...pagerHrefs(page.pageInfo, (cursor) => listHref(PATH, cursor))}
      />
      <HelpDialog
        closeHref={closeHref}
        parents={parents}
        opened={
          adding
            ? { heading: { title: 'Add Help Article' } }
            : edited && {
                heading: { eyebrow: 'Edit Help Article', title: edited.title },
                article: {
                  id: edited.id,
                  kind: edited.kind,
                  title: edited.title,
                  slug: edited.slug,
                  summary: edited.summary,
                  body: edited.body,
                  audience: edited.audience,
                  parentId: edited.parentId,
                  position: edited.position,
                },
              }
        }
      />
    </TabbedPage>
  );
}
