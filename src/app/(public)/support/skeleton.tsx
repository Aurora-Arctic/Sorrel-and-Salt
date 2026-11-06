import PageColumn from '@/components/PageColumn';
import PageHeader from '@/components/PageHeader';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';

// The support page's own head, with the form's fields as blocks.
export const SupportSkeleton = () => (
  <PageColumn as="div">
    <PageWithNav as="div">
      <PageHeader
        eyebrow="Help"
        title="Support"
        lede="Tell us about something you cannot use, something broken, or ask a question."
      />
      <Skeleton shape="block" count={4} quiet />
    </PageWithNav>
  </PageColumn>
);
