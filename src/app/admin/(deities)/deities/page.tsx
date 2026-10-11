import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Deities — Admin — Sorrel & Salt',
};

// The curated deities (MB.132), in the page shape every curated value shares.
export default function AdminDeitiesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'deity', searchParams });
}
