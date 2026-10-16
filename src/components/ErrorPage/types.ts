import type { ReactNode } from 'react';

export type ErrorPageProps = {
  title: string;
  reason: string;
  // A reference to quote when reporting the problem (Next's `error.digest`).
  reference?: string;
  // The way onward: links and buttons, drawn under the reason.
  children: ReactNode;
};
