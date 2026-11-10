import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Category Groups');

export default function AdminCategoryGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'category', searchParams });
}
