import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Forms',
};

// The curated ingredient forms, in the page shape every curated value shares.
export default function AdminFormsPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'form', searchParams });
}
