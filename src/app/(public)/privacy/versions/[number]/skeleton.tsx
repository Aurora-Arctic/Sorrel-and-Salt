import Skeleton from '@/components/Skeleton';
import PageColumn from '@/components/PageColumn';

export const PrivacyVersionSkeleton = () => (
  <PageColumn as="div">
    <Skeleton shape="page" head="eyebrow" quiet />
  </PageColumn>
);
