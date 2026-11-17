import { trimmed } from '@/lib/search-params';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { noIndexMetadata } from '@/lib/page-metadata';
import HelpSearchResults from '@/components/HelpSearchResults';
import { HelpSearchSkeleton } from '@/components/HelpSearchResults/skeleton';
import ListFrame, { ListBody } from '@/components/ListFrame';
import Pager from '@/components/Pager';
import { linkTo } from '@/lib/help-pages';
import { listHref, pagerHrefs } from '@/lib/list-href';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import { getSession } from '@/lib/request-session';
import { countHelpSearch, searchHelp } from '@/modules/help';

export const metadata: Metadata = noIndexMetadata('Search Help');

// Results follow the reader's audience, so the page reads the session and is never shared between viewers.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; after?: string; before?: string }>;
}) {
  const params = await searchParams;
  const query = trimmed(params.q);
  // A box emptied and sent without script lands on the index, as it does with script.
  if (params.q !== undefined && query === '') redirect('/help');
  const session = await getSession();
  const page =
    query === ''
      ? undefined
      : await readNumberedPage(
          readPageCursors(params),
          (request) => searchHelp(session, query, request),
          (start) => countHelpSearch(session, query, start),
        );
  return (
    <ListFrame>
      <ListBody skeleton={<HelpSearchSkeleton />}>
        <HelpSearchResults
          query={query}
          totalCount={page?.totalCount}
          results={(page?.edges ?? []).map(({ node }) => ({
            kind: node.kind,
            audience: node.audience,
            ...linkTo(node),
          }))}
        >
          {page && (page.pageInfo.hasPreviousPage || page.pageInfo.hasNextPage) && (
            <Pager
              {...pagerHrefs(page.pageInfo, (cursor) =>
                listHref('/help/search', { q: query, ...cursor }),
              )}
              position={page.position}
            />
          )}
        </HelpSearchResults>
      </ListBody>
    </ListFrame>
  );
}
