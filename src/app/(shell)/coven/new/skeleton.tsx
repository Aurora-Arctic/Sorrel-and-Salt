import Skeleton from '@/components/Skeleton';
import PageFrame from '@/components/PageFrame';

export const NewCovenSkeleton = () => (
  <PageFrame as="div" narrow>
    <Skeleton shape="form" quiet />
  </PageFrame>
);
