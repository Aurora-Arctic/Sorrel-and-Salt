import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Deities');

export default function AdminDeitiesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'deity', searchParams });
}
