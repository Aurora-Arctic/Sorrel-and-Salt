import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { WorkshopNavigation } from './navigation';

// Stands in for a modal's owner in a story. A modal left mounted stays a native modal dialog,
// invisible but holding the page inert, so this unmounts it when it asks to close (its `onClose`, or
// the workshop's router, which is how a `RouteModal` closes) and offers Open Again.
export function Reopenable({
  children,
}: {
  children: (close: () => void) => ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(true);
  const close = (): void => setOpen(false);
  if (!open) {
    return (
      <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
        Open Again
      </button>
    );
  }
  return <WorkshopNavigation.Provider value={close}>{children(close)}</WorkshopNavigation.Provider>;
}
