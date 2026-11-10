'use client';

import type { Route } from 'next';
import ActionFace from '@/components/ActionFace';
import { SearchListSkeleton, SearchRowSkeleton } from '@/components/IngredientSearch/skeleton';
import { ListBodySkeleton } from '@/components/ListFrame/skeleton';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { useCovenSlug } from '@/lib/use-coven-slug';
import { NEW_SPELL_TITLE } from '@/components/AppShell/add-href';

/** A Grimoire tab's filter row and spell cards, compact as the coven lists open. */
export const GrimoirePanelSkeleton = ({ drafts }: { drafts?: boolean }) => (
  <div data-density="compact">
    <SearchListSkeleton
      row={<SearchRowSkeleton label="Filter the Grimoire" className="grimoire-list__row" density />}
    >
      <ListBodySkeleton
        label={drafts ? 'Drafts' : 'Spells'}
        card="spell"
        draft={drafts}
        density="compact"
      />
    </SearchListSkeleton>
  </div>
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
      action={<ActionFace>{NEW_SPELL_TITLE}</ActionFace>}
    >
      <GrimoirePanelSkeleton drafts={drafts} />
    </TabbedPage>
  );
};

export const GrimoireSkeleton = () => <GrimoireTabsSkeleton />;

export const GrimoireDraftsSkeleton = () => <GrimoireTabsSkeleton drafts />;
