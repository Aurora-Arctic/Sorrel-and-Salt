import Skeleton from '@/components/Skeleton';
import PageFrame from '@/components/PageFrame';

export const AccountEmailSkeleton = () => (
  <PageFrame as="div" narrow>
    <Skeleton shape="form" quiet />
  </PageFrame>
);
