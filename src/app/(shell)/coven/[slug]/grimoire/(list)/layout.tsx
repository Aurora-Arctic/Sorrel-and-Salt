import type { Route } from 'next';
import { RouteModalProvider } from '@/components/Modal/route-modal-provider';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { requireCovenMembership } from '@/lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutProps } from '../../types';
import NewSpellAction from './new-spell-action';

// The coven's Grimoire: its spells, as two tabs, Spells (the complete ones) and Drafts, each its
// own address, so the status is the tab rather than a filter (claude-docs/components/grimoire-list.md).
// The layout's guard gives a non-member the 404 before the heading draws; each page runs its own,
// since a layout does not re-run on a tab press. New Spell stands at the heading line's end for a
// role that may create a spell, the same on both tabs, so it is the layout's action rather than a
// per-tab slot. It is the admin lists' `AddAction`, opening the spell builder's dialog under
// `?new=spell-<slug>`; the layout is the RouteModalProvider, so the dialog holds across the tabs.
export default async function GrimoireLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  const { membership, workspace } = await requireCovenMembership(slug);
  const tabs: PageTab[] = [
    { href: `/coven/${slug}/grimoire` as Route, label: 'Spells', filtered: true, shape: 'cards' },
    {
      href: `/coven/${slug}/grimoire/drafts` as Route,
      label: 'Drafts',
      filtered: true,
      shape: 'cards',
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
