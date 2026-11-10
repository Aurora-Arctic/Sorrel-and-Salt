import NarrowPanelPage from '@/components/NarrowPanelPage';
import Skeleton from '@/components/Skeleton';
import { SkeletonContextRow } from '@/components/SkeletonFrame';
import { ACCESS_PAUSED_TITLE } from './head';

export const CovenPausedSkeleton = () => (
  <NarrowPanelPage as="div" contextRow={<SkeletonContextRow />} title={ACCESS_PAUSED_TITLE}>
    <Skeleton shape="line" count={3} quiet />
  </NarrowPanelPage>
);
