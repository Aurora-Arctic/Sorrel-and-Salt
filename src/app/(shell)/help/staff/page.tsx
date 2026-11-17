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
  const staff = (
    await listStaffHelpArticles(
      session,
      { limit: HELP_PAGE_LIMIT, inverted: false },
      { withPublic: false },
    )
  ).map(({ node }) => node);
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
