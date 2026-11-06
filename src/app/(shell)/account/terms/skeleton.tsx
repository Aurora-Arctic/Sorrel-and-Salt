import Skeleton from '@/components/Skeleton';
import PageFrame from '@/components/PageFrame';

export const AccountTermsSkeleton = () => (
  <PageFrame as="div" narrow>
    <Skeleton shape="page" quiet />
  </PageFrame>
);
