import type { Metadata } from 'next';
import AdminNav from '../../../components/AdminNav';
import ContextRow from '../../../components/ContextRow';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import { requireAdminSession } from '../../../lib/request-session';
import type { AdminLayoutProps } from './types';

// Each page under `/admin` gives its own name ('Celestial Bodies') and this template
// finishes it. Next does not apply a layout's template to a page in the same
// segment, so `/admin` itself takes the `default` as its title.
export const metadata: Metadata = {
  title: { template: '%s — Admin — Sorrel & Salt', default: 'Admin — Sorrel & Salt' },
};

// Every page under `/admin` calls the guard too: a layout does not re-run on
// client-side navigation (claude-docs/auth/admin-guard.md, "The admin guard").
// The route-modal provider holds a pressed modal on its way (M9.18), shared
// by every page's Add and Edit and the page's one modal place. The context
// row (MB.7) names the area and carries its nav above the page's own frame;
// the shell's bar and the session lookup are the group layout's.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminSession();

  return (
    <RouteModalProvider>
      <ContextRow lead={<span className="context-row__name">Admin</span>}>
        <AdminNav />
      </ContextRow>
      <div className="admin-layout">{children}</div>
    </RouteModalProvider>
  );
}
