import PageFrame from '@/components/PageFrame';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

export const CovenPausedSkeleton = () => (
  <PageFrame as="div" narrow>
    <div className="page-frame__section panel">
      <PageHeader title="Access Paused" />
      <Skeleton shape="line" count={3} quiet />
    </div>
  </PageFrame>
);
