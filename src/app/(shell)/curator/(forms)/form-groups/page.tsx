import type { Metadata } from 'next';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Form Groups',
};

export default function AdminFormGroupsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'form', searchParams });
}
