import PageFrame from '@/components/PageFrame';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';
import { SkeletonContextRow } from '@/components/SkeletonFrame';

export const NewCovenSkeleton = () => (
  <>
    <SkeletonContextRow />
    <PageFrame as="div" narrow>
      <div className="page-frame__section panel new-coven-skeleton">
        <PageHeader
          className="card-page-header"
          headingClassName="auth-title"
          title="Create Coven"
          lede="Start a coven of your own. You will be its steward."
        />
        <Skeleton shape="block" count={2} quiet />
      </div>
    </PageFrame>
  </>
);
