import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Categories',
};

// The curated categories (M5.6, MB.178), in the page shape every curated value shares.
export default function AdminCategoriesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'category', searchParams });
}
