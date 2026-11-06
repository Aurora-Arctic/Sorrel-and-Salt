import Skeleton from '@/components/Skeleton';
import PageWithNav from '@/components/PageWithNav';

export const AccountSupportSkeleton = () => (
  <PageWithNav as="div" headless>
    <Skeleton shape="requests" quiet />
  </PageWithNav>
);
