import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { WorkshopNavigation } from './navigation';

// What stands in for a modal's owner in a story. The app's owners close a
// modal by unmounting it once it has faded out; a story has no owner, and a
// modal left mounted stays a native modal dialog, invisible but holding the
// rest of the page inert. So this unmounts it when it asks to close, whether
// through its own `onClose` (the function handed to `children`) or through the
// workshop's router, which is how a `RouteModal` closes (".ladle/navigation.ts"),
// and offers Open Again to mount it afresh, so a review can look again without
// reloading the story.
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
