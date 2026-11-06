'use client';

import type { Route } from 'next';
import { ListSkeleton } from '@/components/ListFrame/skeleton';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { useCovenSlug } from '@/lib/use-coven-slug';

/** A Grimoire tab's filter row and spell cards, compact as the coven lists open. */
export const GrimoirePanelSkeleton = ({ drafts }: { drafts?: boolean }) => (
  <ListSkeleton
    filter="Filter the Grimoire"
    label={drafts ? 'Drafts' : 'Spells'}
    card="spell"
    density="compact"
  />
);

const GrimoireTabsSkeleton = ({ drafts }: { drafts?: boolean }) => {
  const slug = useCovenSlug();
  const tabs: PageTab[] = [
    {
      href: `/coven/${slug}/grimoire` as Route,
      label: 'Spells',
      skeleton: <GrimoirePanelSkeleton />,
    },
    {
      href: `/coven/${slug}/grimoire/drafts` as Route,
      label: 'Drafts',
      skeleton: <GrimoirePanelSkeleton drafts />,
    },
  ];
  return (
    <TabbedPage
      as="div"
      title="Grimoire"
      tabs={tabs}
      open={`/coven/${slug}/grimoire${drafts ? '/drafts' : ''}`}
    >
      <GrimoirePanelSkeleton drafts={drafts} />
    </TabbedPage>
  );
};

export const GrimoireSkeleton = () => <GrimoireTabsSkeleton />;

export const GrimoireDraftsSkeleton = () => <GrimoireTabsSkeleton drafts />;
