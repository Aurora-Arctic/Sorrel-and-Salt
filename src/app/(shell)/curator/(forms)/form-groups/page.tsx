import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Form Groups');

export default function AdminFormGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'form', searchParams });
}
