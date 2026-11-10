import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Deity Traditions');

export default function AdminDeityTraditionsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'tradition', searchParams });
}
