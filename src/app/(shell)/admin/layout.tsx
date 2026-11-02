import type { Metadata } from 'next';
import AdminNav from '../../../components/AdminNav';
import { adminTarget } from '../../../components/AdminNav/target';
import { PendingLink } from '../../../lib/navigation';
import ContextRow from '../../../components/ContextRow';
import SectionBody from '../../../components/SectionBody';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import { countSupportViews } from '@/modules/support';
import { requireCuratorSession } from '../../../lib/request-session';
import { titleTemplate } from '../../../lib/site';
import type { AdminLayoutProps } from './types';

// Each page under `/admin` gives its own name ('Celestial Bodies') and this template
// finishes it. Next does not apply a layout's template to a page in the same
// segment, so `/admin` itself takes the `default`, which the root template finishes.
export const metadata: Metadata = {
  title: { template: titleTemplate('Admin'), default: 'Admin' },
};

// The curation guard, passed by a curator or an admin; each people page calls the admin guard. Every
// page calls a guard too, as a layout does not re-run on client navigation
// (claude-docs/auth/admin-guard.md, "The admin guard"). The route-modal provider is shared by all.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await requireCuratorSession();
  const { needs_staff: needsStaff } = await countSupportViews(session, {});

  return (
    <RouteModalProvider>
      {/* The area's name is its home link, as the coven row's switcher leads to the coven. */}
      <ContextRow
        lead={
          <PendingLink
            href="/admin"
            className="context-row__name"
            navigationTarget={adminTarget('/admin')}
          >
            Admin
          </PendingLink>
        }
      >
        <AdminNav managesPeople={session.role === 'admin'} needsStaff={needsStaff} />
      </ContextRow>
      <SectionBody region="admin" className="page-column">
        {children}
      </SectionBody>
    </RouteModalProvider>
  );
}
