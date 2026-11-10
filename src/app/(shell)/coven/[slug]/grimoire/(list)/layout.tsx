import { RouteModalProvider } from '@/components/Modal/route-modal-provider';
import TabbedPage from '@/components/TabbedPage';
import { requireCovenMembership } from '@/lib/request-session';
import { covenAccessOf } from '@/lib/coven-access';
import type { CovenLayoutProps } from '../../types';
import NewSpellAction from './new-spell-action';
import { grimoireTabs } from './tabs';

// The coven's Grimoire as two tabs, Spells and Drafts, each its own address
// (claude-docs/components/grimoire-list.md). Each page runs its own guard, as a layout does not
// re-run on a tab press. New Spell is the layout's action, and the layout is the RouteModalProvider.
export default async function GrimoireLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  const { membership, workspace } = await requireCovenMembership(slug);
  const tabs = grimoireTabs(slug);
  const action = covenAccessOf(membership.role).canCreateSpell ? (
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
