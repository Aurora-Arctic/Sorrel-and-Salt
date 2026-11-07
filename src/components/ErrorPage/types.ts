import type { ReactNode } from 'react';

export type ErrorPageProps = {
  title: string;
  reason: string;
  reference?: string;
  children: ReactNode;
};
