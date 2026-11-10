import type { Metadata } from 'next';
import AdminNav from '@/components/AdminNav';
import AdminAreaLayout from '@/app/(shell)/_admin/area-layout';
import { countSupportViews } from '@/modules/support';
import { requireCuratorSession } from '@/lib/request-session';
import { titleTemplate } from '@/lib/site';
import type { AdminLayoutProps } from '@/app/(shell)/_admin/types';

// Each page under `/keepers` gives its own name ('Privilege Changes') and this template
// finishes it. Next does not apply a layout's template to a page in the same
// segment, so `/keepers` itself takes the `default`, which the root template finishes.
export const metadata: Metadata = {
  title: { template: titleTemplate('Keepers'), default: 'Keepers' },
};

// The curation guard, passed by a curator or a keeper, since a curator reaches the index and Support; each
// people and invitation page calls the admin guard. Every page calls a guard too, as a layout does not re-run on
// client navigation (claude-docs/auth/admin-guard.md, "The admin guard").
export default async function KeepersLayout({ children }: AdminLayoutProps) {
  const session = await requireCuratorSession();
  const { needs_staff: needsStaff } = await countSupportViews(session, {});

  return (
    <AdminAreaLayout
      name="Keepers"
      href="/keepers"
      nav={<AdminNav managesPeople={session.role === 'admin'} needsStaff={needsStaff} />}
    >
      {children}
    </AdminAreaLayout>
  );
}
