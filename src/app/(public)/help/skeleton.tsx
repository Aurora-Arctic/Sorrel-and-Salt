import { HelpIndexSkeleton } from '@/components/HelpIndex/skeleton';
import PageColumn from '@/components/PageColumn';
import { HELP_LEDE } from '@/lib/help-pages';

export const HelpSkeleton = () => (
  <PageColumn as="div">
    <HelpIndexSkeleton lede={HELP_LEDE} />
  </PageColumn>
);
