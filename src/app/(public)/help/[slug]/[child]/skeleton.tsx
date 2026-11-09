import { HelpArticleSkeleton } from '@/components/HelpArticleView/skeleton';
import PageColumn from '@/components/PageColumn';

// A sub page draws the way back to its parent above its title.
export const HelpSubPageSkeleton = () => (
  <PageColumn as="div">
    <HelpArticleSkeleton parent />
  </PageColumn>
);
