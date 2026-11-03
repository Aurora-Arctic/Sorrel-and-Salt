import type { ReactNode } from 'react';
import { tabbedLayout } from '../../curator/tabbed-layout';

const DocumentsTabs = tabbedLayout('documents');

// The four documents' tab row over whichever editor is open. There is no action slot: each editor holds its own buttons.
export default function AdminDocumentsLayout({ children }: { children: ReactNode }) {
  return <DocumentsTabs action={null}>{children}</DocumentsTabs>;
}
