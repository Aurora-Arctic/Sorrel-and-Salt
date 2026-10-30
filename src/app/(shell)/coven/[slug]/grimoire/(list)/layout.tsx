import type { Route } from 'next';
import { RouteModalProvider } from '@/components/Modal/route-modal-provider';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { requireCovenMembership } from '@/lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutProps } from '../../types';
import NewSpellAction from './new-spell-action';

// The coven's Grimoire as two tabs, Spells and Drafts, each its own address
// (claude-docs/components/grimoire-list.md). Each page runs its own guard, as a layout does not
// re-run on a tab press. New Spell is the layout's action, and the layout is the RouteModalProvider.
export default async function GrimoireLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  const { membership, workspace } = await requireCovenMembership(slug);
  const tabs: PageTab[] = [
    {
      href: `/coven/${slug}/grimoire` as Route,
      label: 'Spells',
      filtered: true,
      shape: 'cards',
      density: 'compact',
    },
    {
      href: `/coven/${slug}/grimoire/drafts` as Route,
      label: 'Drafts',
      filtered: true,
      shape: 'cards',
      density: 'compact',
    },
  ];
  const action = rolePermits(membership.role, { spell: ['create'] }) ? (
    <NewSpellAction covenName={workspace.name} />
  ) : undefined;
  return (
    <RouteModalProvider>
      <TabbedPage title="Grimoire" tabs={tabs} action={action}>
        {children}
      </TabbedPage>
    </RouteModalProvider>
  );
}
