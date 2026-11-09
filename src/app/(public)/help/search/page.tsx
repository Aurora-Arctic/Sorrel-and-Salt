import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import HelpSearchResults from '@/components/HelpSearchResults';
import { HELP_PAGE_LIMIT, linkTo } from '@/lib/help-pages';
import { getSession } from '@/lib/request-session';
import { searchHelp } from '@/modules/help';

export const metadata: Metadata = noIndexMetadata('Search Help');

// Results follow the reader's audience, so the page reads the session and is never shared between viewers.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? '';
  const session = await getSession();
  const results =
    query === ''
      ? []
      : await searchHelp(session, query, { limit: HELP_PAGE_LIMIT, inverted: false });
  return (
    <HelpSearchResults
      query={query}
      results={results.map(({ node }) => ({
        kind: node.kind,
        audience: node.audience,
        ...linkTo(node),
      }))}
    />
  );
}
