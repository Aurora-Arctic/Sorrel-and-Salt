import Skeleton from '@/components/Skeleton';
import PageColumn from '@/components/PageColumn';

export const CompendiumSkeleton = () => (
  <PageColumn as="div">
    <Skeleton shape="cards" title filter quiet />
  </PageColumn>
);
