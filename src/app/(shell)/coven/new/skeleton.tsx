import NarrowPanelPage from '@/components/NarrowPanelPage';
import Skeleton from '@/components/Skeleton';
import { SkeletonContextRow } from '@/components/SkeletonFrame';
import { CREATE_COVEN_LEDE, CREATE_COVEN_TITLE } from './head';

export const NewCovenSkeleton = () => (
  <NarrowPanelPage
    as="div"
    contextRow={<SkeletonContextRow />}
    title={CREATE_COVEN_TITLE}
    lede={CREATE_COVEN_LEDE}
    className="new-coven-skeleton"
  >
    <Skeleton shape="block" count={2} quiet />
  </NarrowPanelPage>
);
