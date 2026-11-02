import type { Metadata } from 'next';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Form Groups',
};

// The ingredient form groups, in the page shape every group vocabulary shares.
export default function AdminFormGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'form', searchParams });
}
