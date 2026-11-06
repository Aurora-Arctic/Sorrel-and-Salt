import Skeleton from '@/components/Skeleton';
import PageWithNav from '@/components/PageWithNav';

export const AccountSkeleton = () => (
  <PageWithNav as="div" headless>
    <Skeleton shape="sections" quiet />
  </PageWithNav>
);
