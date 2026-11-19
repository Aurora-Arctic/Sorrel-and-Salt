'use client';

import {
  createContext,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  useContext,
} from 'react';
import { cx } from '../../lib/class-names';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import type { HelpPageHeadProps } from './types';
import './index.scss';

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

/**
 * A heading of a help page written for one that stands under its own Help heading (an h2 title, h3 sections), drawn one
 * level up when the page stands under the public help header instead, where Help is a label and the page's title is the
 * h1. Its class sets the size of the level it was written at, so the page looks the same either way.
 */
export function HelpHeading({
  level,
  className,
  ...rest
}: { level: 2 | 3 | 4 } & ComponentPropsWithoutRef<'h2'>): ReactElement {
  const framed = useContext(Framed);
  const Tag = `h${framed ? level - 1 : level}` as 'h1' | 'h2' | 'h3';
  return <Tag className={cx(framed && `help-heading--${level}`, className)} {...rest} />;
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
