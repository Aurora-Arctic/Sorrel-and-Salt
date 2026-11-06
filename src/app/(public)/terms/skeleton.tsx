import PageColumn from '@/components/PageColumn';
import { DocumentSkeleton } from '@/components/DocumentPage/skeleton';

export const TermsSkeleton = () => (
  <PageColumn as="div">
    <DocumentSkeleton title="Terms of Use" />
  </PageColumn>
);
