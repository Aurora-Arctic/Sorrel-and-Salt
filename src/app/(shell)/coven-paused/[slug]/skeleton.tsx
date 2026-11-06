import Skeleton from '@/components/Skeleton';
import PageFrame from '@/components/PageFrame';

export const CovenPausedSkeleton = () => (
  <PageFrame as="div" narrow>
    <Skeleton shape="page" quiet />
  </PageFrame>
);
