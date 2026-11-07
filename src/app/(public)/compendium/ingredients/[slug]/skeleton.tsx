import { EntrySkeleton } from '@/components/IngredientEntry/skeleton';
import PageColumn from '@/components/PageColumn';

// An entry's name is not known yet, so its heading is a bar; the frame, menu and sections are the ones every entry has.
export const CompendiumEntrySkeleton = () => (
  <PageColumn as="div">
    <EntrySkeleton />
  </PageColumn>
);
