import Skeleton from '@/components/Skeleton';
import PageColumn from '@/components/PageColumn';

export const TermsSkeleton = () => (
  <PageColumn as="div">
    <Skeleton shape="page" head="eyebrow" quiet />
  </PageColumn>
);
