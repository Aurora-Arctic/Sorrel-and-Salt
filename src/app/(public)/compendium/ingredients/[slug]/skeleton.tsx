import Skeleton from '@/components/Skeleton';
import PageColumn from '@/components/PageColumn';

export const CompendiumEntrySkeleton = () => (
  <PageColumn as="div">
    <Skeleton shape="page" menu entry quiet />
  </PageColumn>
);
