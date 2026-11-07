import type { ReactNode } from 'react';

export interface CovenLayoutParams {
  params: Promise<{ slug: string }>;
}

export interface CovenLayoutProps extends CovenLayoutParams {
  children: ReactNode;
}
