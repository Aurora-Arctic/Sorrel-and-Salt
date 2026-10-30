import type { Metadata } from 'next';
import { GroupPage } from '../../group-page';
import type { GroupRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Deity Traditions',
};

// The deity traditions, in the page shape every group vocabulary shares.
export default function AdminDeityTraditionsPage({ searchParams }: GroupRouteProps) {
  return GroupPage({ kind: 'tradition', searchParams });
}
