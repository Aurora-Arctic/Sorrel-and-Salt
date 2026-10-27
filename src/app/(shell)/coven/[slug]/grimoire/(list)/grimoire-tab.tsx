import type { Route } from 'next';
import type { ReactElement } from 'react';
import { readCategories } from '@/app/compendium-reads';
import GrimoireList from '@/components/GrimoireList';
import { GRIMOIRE_PARAMS } from '@/components/GrimoireList/params';
import { pagerHrefs } from '@/lib/list-href';
import { readPageCursors } from '@/lib/numbered-page';
import { requireCovenMembership } from '@/lib/request-session';
import { readGrimoire, readGrimoireCategoryCounts } from './reads';
import type { GrimoireTabProps } from './types';

// One grimoire tab, Spells or Drafts (M10.11): the guard on the slug from the address, the
// address read as the filter, and one page of 24 cards of the tab's status. Read per request
// and never cached, since a grimoire is the coven's alone (CLAUDE.md rule 6). The layout's
// TabbedPage draws the `<main>` and the heading.
// A function the two pages call rather than a component they draw, so each page is the
// async component itself and a test awaits it whole.
export async function grimoireTab({
  params,
  searchParams,
  status,
  beneath,
}: GrimoireTabProps): Promise<ReactElement> {
  const { slug } = await params;
  const { workspace } = await requireCovenMembership(slug);
  const query = await searchParams;
  const filter = GRIMOIRE_PARAMS.read(query);
  const { after, before } = readPageCursors(query);
  const path = `/coven/${workspace.slug}/grimoire${beneath}` as Route;

  // The address names categories by slug; the service filters by id.
  const categories = await readCategories();
  const lookups = { categories: new Map(categories.map(({ slug, id }) => [slug, id])) };
  const variables = JSON.stringify(GRIMOIRE_PARAMS.variables(filter, lookups));
  const [page, counts] = await Promise.all([
    readGrimoire(workspace.id, variables, status, after, before),
    readGrimoireCategoryCounts(workspace.id, variables, status),
  ]);
  // A category no readable spell of this tab carries is not in the counts: it holds none.
  const counted = categories.map((category) => ({
    ...category,
    count: counts.get(category.id) ?? 0,
  }));

  return (
    <GrimoireList
      path={path}
      workspaceId={workspace.id}
      status={status}
      spells={page.spells}
      filter={filter}
      categories={counted}
      position={page.position}
      total={page.totalCount}
      {...pagerHrefs(page.pageInfo, (cursor) => GRIMOIRE_PARAMS.href(path, filter, { ...cursor }))}
    />
  );
}
