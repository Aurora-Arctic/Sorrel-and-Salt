import type { ReactElement } from 'react';
import { PendingLink } from '../../../lib/navigation';
import ContextRow from '../../../components/ContextRow';
import SectionBody from '../../../components/SectionBody';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import type { AdminAreaLayoutProps } from './types';

// The frame of the keepers and curator areas: the context row with the area's name and navigation over
// the page column. The route-modal provider is shared by every page in it. The guard stays in each
// area's layout, which also reads what its navigation needs.
export default function AdminAreaLayout({
  name,
  href,
  nav,
  children,
}: AdminAreaLayoutProps): ReactElement {
  return (
    <RouteModalProvider>
      {/* The area's name is its home link, as the coven row's switcher leads to the coven. */}
      <ContextRow
        lead={
          <PendingLink href={href} className="context-row__name">
            {name}
          </PendingLink>
        }
      >
        {nav}
      </ContextRow>
      <SectionBody region="admin" className="page-column">
        {children}
      </SectionBody>
    </RouteModalProvider>
  );
}
