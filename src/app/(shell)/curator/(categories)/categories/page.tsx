import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Categories',
};

export default function AdminCategoriesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'category', searchParams });
}
