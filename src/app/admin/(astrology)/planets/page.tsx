import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Planets',
};

// The curated planets (MB.95), in the page shape every curated value shares.
export default function AdminPlanetsPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'planet', searchParams });
}
