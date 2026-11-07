import { HelpArticleSkeleton } from '@/components/HelpArticleView/skeleton';
import { HelpIndexSkeleton } from '@/components/HelpIndex/skeleton';
import PageFrame from '@/components/PageFrame';

// The staff help pages share their layout's frame, so their skeletons sit beside it.
export const StaffHelpSkeleton = () => (
  <PageFrame as="div">
    <HelpIndexSkeleton heading="Staff Help" />
  </PageFrame>
);
export const StaffHelpArticleSkeleton = () => (
  <PageFrame as="div">
    <HelpArticleSkeleton heading="Staff Help" />
  </PageFrame>
);
export const StaffHelpSubPageSkeleton = () => (
  <PageFrame as="div">
    <HelpArticleSkeleton heading="Staff Help" parent />
  </PageFrame>
);
