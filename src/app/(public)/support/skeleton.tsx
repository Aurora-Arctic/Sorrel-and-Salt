import PageColumn from '@/components/PageColumn';
import { SUPPORT_LEDE } from './head';
import PageHeader from '@/components/PageHeader';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';

// The support page's own head, with the form's fields as blocks.
export const SupportSkeleton = () => (
  <PageColumn as="div">
    <PageWithNav as="div">
      <PageHeader eyebrow="Help" title="Support" lede={SUPPORT_LEDE} />
      <Skeleton shape="block" count={4} quiet />
    </PageWithNav>
  </PageColumn>
);
