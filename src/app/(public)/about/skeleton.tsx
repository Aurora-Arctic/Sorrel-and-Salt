import PageColumn from '@/components/PageColumn';
import { DocumentSkeleton } from '@/components/DocumentPage/skeleton';

export const AboutSkeleton = () => (
  <PageColumn as="div">
    <DocumentSkeleton title="About Us" />
  </PageColumn>
);
