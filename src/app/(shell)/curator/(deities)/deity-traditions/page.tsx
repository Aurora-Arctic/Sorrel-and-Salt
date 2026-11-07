import type { Metadata } from 'next';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Deity Traditions',
};

export default function AdminDeityTraditionsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'tradition', searchParams });
}
