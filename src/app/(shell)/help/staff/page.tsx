import type { Metadata } from 'next';
import HelpIndex from '@/components/HelpIndex';
import { readGlossaryTerms } from '@/lib/help-glossary';
import { HELP_PAGE_LIMIT, linkTo } from '@/lib/help-pages';
import { requireCuratorSession } from '@/lib/request-session';
import { listStaffHelpArticles } from '@/modules/help';

export const metadata: Metadata = { title: 'Staff Help', robots: { index: false } };

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
      faq={staff.filter((row) => row.kind === 'faq')}
      articles={staff.filter((row) => row.kind === 'article' && !row.parentSlug).map(linkTo)}
    />
  );
}
