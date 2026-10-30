'use client';

import {
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
  createContext,
  useContext,
  useState,
} from 'react';
import type { CovenSwitchRegistration } from './types';

// A page that knows which covens it opens in registers them here, and the switcher reads them when
// a coven is picked. Two contexts, so the writing page is not redrawn on each registration; none
// registered is the section-only fallback (claude-docs/components/workspace-switcher.md).

const Read = createContext<CovenSwitchRegistration | null>(null);
const Write = createContext<Dispatch<SetStateAction<CovenSwitchRegistration | null>>>(() => {});

export function CovenSwitchProvider({ children }: { children: ReactNode }): ReactElement {
  const [registration, setRegistration] = useState<CovenSwitchRegistration | null>(null);
  return (
    <Write.Provider value={setRegistration}>
      <Read.Provider value={registration}>{children}</Read.Provider>
    </Write.Provider>
  );
}

/** What the page being viewed said about the covens it opens in, or `null`. */
export const useCovenSwitchRegistration = (): CovenSwitchRegistration | null => useContext(Read);

export const useRegisterCovenSwitch = () => useContext(Write);
