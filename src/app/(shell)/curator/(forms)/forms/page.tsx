import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Forms');

export default function AdminFormsPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'form', searchParams });
}
