'use client';

import { createContext, type ReactElement, type ReactNode, useContext } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpPageHeadProps } from './types';

// Whether a help page stands under the public help header, which holds the heading and search box and stays up between
// pages. The header's frame provides it, so a page never says which one it is in.
const Framed = createContext(false);

/** The public help header's frame: what stands inside it is framed. */
export function HelpFrame({ children }: { children: ReactNode }): ReactElement {
  return <Framed.Provider value>{children}</Framed.Provider>;
}

/** What only a page under the public help header draws. */
export function WhenHelpFramed({ children }: { children: ReactNode }): ReactNode {
  return useContext(Framed) ? children : null;
}

/** The help heading and its search box, which the public help header holds when a page stands under it. */
export function HelpPageHead({ heading = 'Help' }: HelpPageHeadProps): ReactElement | null {
  if (useContext(Framed)) return null;
  return (
    <>
      <PageHeader title={heading} />
      <HelpSearchForm />
    </>
  );
}
