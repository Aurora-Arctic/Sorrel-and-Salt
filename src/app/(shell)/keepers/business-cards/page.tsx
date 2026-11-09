import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import BusinessCards from '../../../../components/BusinessCards';
import { ADMIN_PAGES } from '../../../../components/AdminNav/sections';
import TabbedPage from '../../../../components/TabbedPage';
import { requireAdminSession } from '../../../../lib/request-session';

export const metadata: Metadata = pageTitle('Business Cards');

const { label, tabs } = ADMIN_PAGES.businessCards;

// A keeper's own business cards, built in the browser. The page is the guard, as the Keepers layout lets a curator through
// for Support (claude-docs/auth/admin-guard.md, "The curator guard").
export default async function BusinessCardsPage() {
  await requireAdminSession();
  return (
    <TabbedPage title={label} tabs={tabs} action={null}>
      <BusinessCards />
    </TabbedPage>
  );
}
