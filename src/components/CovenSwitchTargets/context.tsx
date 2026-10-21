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

// The coven layout holds the switcher and cannot see the page beneath it, so a
// page that knows which covens it opens in (an ingredient's, whose row it has
// read) says so through this context and the switcher reads it when a coven is
// picked. Two contexts, so the page, which only writes, is not drawn again each
// time the registration changes. Nothing registered, or no provider (stories,
// tests), is the section-only fallback. See claude-docs/components/workspace-switcher.md.

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
