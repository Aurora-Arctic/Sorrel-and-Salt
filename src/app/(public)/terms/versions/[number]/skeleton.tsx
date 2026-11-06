import Skeleton from '@/components/Skeleton';
import PageColumn from '@/components/PageColumn';

export const TermsVersionSkeleton = () => (
  <PageColumn as="div">
    <Skeleton shape="page" head="eyebrow" quiet />
  </PageColumn>
);
