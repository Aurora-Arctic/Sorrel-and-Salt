import Skeleton from '@/components/Skeleton';
import PageColumn from '@/components/PageColumn';
import PageWithNav from '@/components/PageWithNav';

export const SupportSkeleton = () => (
  <PageColumn as="div">
    <PageWithNav as="div">
      <Skeleton shape="form" quiet />
    </PageWithNav>
  </PageColumn>
);
