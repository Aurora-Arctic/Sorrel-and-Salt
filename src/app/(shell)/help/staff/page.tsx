import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/page-metadata';
import HelpIndex from '@/components/HelpIndex';
import { readGlossaryTerms } from '@/lib/help-glossary';
import { HELP_PAGE_LIMIT, linkTo } from '@/lib/help-pages';
import { requireCuratorSession } from '@/lib/request-session';
import { listStaffHelpArticles } from '@/modules/help';

export const metadata: Metadata = noIndexMetadata('Staff Help');

export default async function Page() {
  const session = await requireCuratorSession();
  const rows = (
    await listStaffHelpArticles(session, { limit: HELP_PAGE_LIMIT, inverted: false })
  ).map(({ node }) => node);
  // The public rows have their own pages; this one lists what only staff and keepers read.
  const staff = rows.filter((row) => row.audience !== 'public');
  const terms = await readGlossaryTerms();
  return (
    <HelpIndex
      terms={terms}
      heading="Staff Help"
      back={{ href: '/help', title: 'Help' }}
      faq={staff.filter((row) => row.kind === 'faq')}
      articles={staff
        .filter((row) => (row.kind === 'article' || row.kind === 'guide') && !row.parentSlug)
        .map(linkTo)}
    />
  );
}
