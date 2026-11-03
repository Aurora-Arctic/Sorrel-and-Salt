import type { ReactNode } from 'react';
import TabbedPage from '../../../../components/TabbedPage';
import { ADMIN_PAGES } from '../../../../components/AdminNav/sections';
import '../../../../components/DocumentEditor/index.scss';

const { label, tabs } = ADMIN_PAGES.documents;

// The documents' heading, then their tab row on a line of its own beneath it, over whichever editor or the Email Updates page is open.
// There is no action slot: each editor holds its own buttons. The column is the editor's width, centred, so the heading and tabs start where the text does.
export default function AdminDocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="document-editor-column">
      <TabbedPage title={label} tabs={tabs} action={null} tabsBelow>
        {children}
      </TabbedPage>
    </div>
  );
}
