import PageFrame from '@/components/PageFrame';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

export const NewCovenSkeleton = () => (
  <PageFrame as="div" narrow>
    <div className="panel">
      <PageHeader title="Create Coven" lede="Start a coven of your own. You will be its steward." />
      <Skeleton shape="block" count={2} quiet />
    </div>
  </PageFrame>
);
