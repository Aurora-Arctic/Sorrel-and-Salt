import type { Metadata } from 'next';
import AdminNav from '../../../components/AdminNav';
import { adminTarget } from '../../../components/AdminNav/target';
import { PendingLink } from '../../../lib/navigation';
import ContextRow from '../../../components/ContextRow';
import SectionBody from '../../../components/SectionBody';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import { requireCuratorSession } from '../../../lib/request-session';
import type { AdminLayoutProps } from './types';

// Each page under `/admin` gives its own name ('Celestial Bodies') and this template
// finishes it. Next does not apply a layout's template to a page in the same
// segment, so `/admin` itself takes the `default` as its title.
export const metadata: Metadata = {
  title: { template: '%s — Admin — Sorrel & Salt', default: 'Admin — Sorrel & Salt' },
};

// The curation guard, which a curator passes as well as an admin; a curator's nav leaves People
// out, and each people page calls the admin guard. Every page under `/admin` calls a guard too, as
// a layout does not re-run on client-side navigation (claude-docs/auth/admin-guard.md, "The admin
// guard"). The route-modal provider holds a pressed modal on its way, shared by every page's Add
// and Edit. The context row names the area and carries its nav above the page's own frame.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { role } = await requireCuratorSession();

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
        <AdminNav managesPeople={role === 'admin'} />
      </ContextRow>
      <SectionBody region="admin" className="page-column">
        {children}
      </SectionBody>
    </RouteModalProvider>
  );
}
