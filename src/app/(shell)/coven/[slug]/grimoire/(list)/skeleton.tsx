'use client';

import ActionFace from '@/components/ActionFace';
import TabbedPage from '@/components/TabbedPage';
import { useCovenSlug } from '@/lib/use-coven-slug';
import { covenPath } from '@/lib/coven-path';
import { GrimoirePanelSkeleton } from './panels';
import { grimoireTabs } from './tabs';
import { NEW_SPELL_TITLE } from '@/components/AppShell/add-href';

const GrimoireTabsSkeleton = ({ drafts }: { drafts?: boolean }) => {
  const slug = useCovenSlug();
  const tabs = grimoireTabs(slug);
  return (
    <TabbedPage
      as="div"
      title="Grimoire"
      tabs={tabs}
      open={covenPath(slug, 'grimoire', drafts && 'drafts')}
      action={<ActionFace>{NEW_SPELL_TITLE}</ActionFace>}
    >
      <GrimoirePanelSkeleton drafts={drafts} />
    </TabbedPage>
  );
};

export const GrimoireSkeleton = () => <GrimoireTabsSkeleton />;

export const GrimoireDraftsSkeleton = () => <GrimoireTabsSkeleton drafts />;
