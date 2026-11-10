import PageColumn from '@/components/PageColumn';
import { DocumentSkeleton } from '@/components/DocumentPage/skeleton';

// Apart from `_documents.tsx` because skeletons are imported by client code and that file reads the database.
export const DocumentPageSkeleton = ({ title }: { title: string }) => (
  <PageColumn as="div">
    <DocumentSkeleton title={title} />
  </PageColumn>
);
