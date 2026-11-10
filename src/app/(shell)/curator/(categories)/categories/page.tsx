import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Categories');

export default function AdminCategoriesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'category', searchParams });
}
