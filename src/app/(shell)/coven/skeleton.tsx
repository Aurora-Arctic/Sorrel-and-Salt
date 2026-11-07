import PageFrame from '@/components/PageFrame';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

// The landing's heading depends on the viewer, so it is a bar; the eyebrow is the same for both.
export const CovenLandingSkeleton = () => (
  <PageFrame as="div" narrow>
    <section className="page-frame__section">
      <PageHeader eyebrow="Welcome" pendingTitle />
      <Skeleton shape="line" count={2} quiet />
    </section>
  </PageFrame>
);
