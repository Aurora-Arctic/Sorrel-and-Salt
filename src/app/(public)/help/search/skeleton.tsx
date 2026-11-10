import { HelpSearchSkeleton } from '@/components/HelpSearchResults/skeleton';
import PageColumn from '@/components/PageColumn';
import { HELP_LEDE } from '@/lib/help-pages';

export const HelpSearchPageSkeleton = () => (
  <PageColumn as="div">
    <HelpSearchSkeleton lede={HELP_LEDE} />
  </PageColumn>
);
