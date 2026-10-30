'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';

// The signed-in person's id, for a client form that keys its offline copy to them. Provided once by the application shell;
// a form drawn outside it has no id and keeps no copy.
const ViewerIdContext = createContext<string | undefined>(undefined);

export const ViewerIdProvider = ({
  id,
  children,
}: {
  id: string | undefined;
  children: ReactNode;
}): ReactElement => <ViewerIdContext.Provider value={id}>{children}</ViewerIdContext.Provider>;

export const useViewerId = (): string | undefined => useContext(ViewerIdContext);
