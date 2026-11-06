import PageColumn from '@/components/PageColumn';
import { DocumentSkeleton } from '@/components/DocumentPage/skeleton';

export const PrivacySkeleton = () => (
  <PageColumn as="div">
    <DocumentSkeleton title="Privacy Policy" />
  </PageColumn>
);
