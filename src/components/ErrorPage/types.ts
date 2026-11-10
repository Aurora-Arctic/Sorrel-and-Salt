import type { ReactNode } from 'react';

export type ErrorPageProps = {
  title: string;
  reason: string;
  reference?: string;
  /** Drawn inside a page that already owns the `main`, so it adds none. */
  withinMain?: boolean;
  children: ReactNode;
};
