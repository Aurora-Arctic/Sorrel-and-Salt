import type { ReactNode } from 'react';
import TabbedPage from '../../../../components/TabbedPage';
import { ADMIN_PAGES } from '../../../../components/AdminNav/sections';

const { label, tabs } = ADMIN_PAGES.documents;

// The four documents' heading, then their tab row on a line of its own beneath it, over whichever editor is open.
// There is no action slot: each editor holds its own buttons.
export default function AdminDocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <TabbedPage title={label} tabs={tabs} action={null} tabsBelow>
      {children}
    </TabbedPage>
  );
}
