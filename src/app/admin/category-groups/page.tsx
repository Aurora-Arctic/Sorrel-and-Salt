import type { Metadata } from 'next';
import { GroupPage } from '../group-page';
import type { GroupRouteProps } from '../types';

export const metadata: Metadata = {
  title: 'Category Groups — Admin — Sorrel & Salt',
};

// The category groups (M5.6b), in the page shape every group vocabulary shares.
export default function AdminCategoryGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'category', searchParams });
}
