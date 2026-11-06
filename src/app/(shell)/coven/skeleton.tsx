import Skeleton from '@/components/Skeleton';
import PageFrame from '@/components/PageFrame';

export const CovenLandingSkeleton = () => (
  <PageFrame as="div" narrow>
    <Skeleton shape="page" quiet />
  </PageFrame>
);
