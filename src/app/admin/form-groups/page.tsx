import type { Metadata } from 'next';
import { GroupPage } from '../group-page';
import type { GroupRouteProps } from '../types';

export const metadata: Metadata = {
  title: 'Form Groups — Admin — Sorrel & Salt',
};

// The ingredient form groups (M5.6b), in the page shape every group vocabulary shares.
export default function AdminFormGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'form', searchParams });
}
