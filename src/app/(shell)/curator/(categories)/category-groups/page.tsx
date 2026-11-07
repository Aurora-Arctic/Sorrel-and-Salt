import type { Metadata } from 'next';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Category Groups',
};

export default function AdminCategoryGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'category', searchParams });
}
