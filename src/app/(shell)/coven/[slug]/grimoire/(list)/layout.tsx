import type { Route } from 'next';
import IconTip, { PlusIcon } from '@/components/IconTip';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { covenTarget } from '@/lib/coven-path';
import { PendingLink } from '@/lib/navigation';
import { requireCovenMembership } from '@/lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutProps } from '../../types';

// The coven's Grimoire (M10.11): its spells, as two tabs, Spells (the complete ones) and
// Drafts, each its own address, so the status is the tab rather than a filter
// (claude-docs/components/grimoire-list.md). Every member reads both. Each tab opens with
// the search row and draws cards, which its loading skeleton follows. The layout's guard
// gives a non-member the 404 before the heading draws; each page still runs its own, since a
// layout does not re-run on a tab press.
//
// New Spell (M10.12) stands at the heading line's end for a role that may create a spell, the
// same on both tabs, so it is the page's action rather than a per-tab `@action` slot like the
// members page's Invite. It wears the admin lists' Add look (`.add-action`: the labelled
// button when wide, a plus with the label as its tip when narrow), but navigates to the
// builder's page rather than opening a modal, so it is a plain `PendingLink`, not `AddAction`.
export default async function GrimoireLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  const { membership } = await requireCovenMembership(slug);
  const tabs: PageTab[] = [
    { href: `/coven/${slug}/grimoire` as Route, label: 'Spells', filtered: true, shape: 'cards' },
    {
      href: `/coven/${slug}/grimoire/drafts` as Route,
      label: 'Drafts',
      filtered: true,
      shape: 'cards',
    },
  ];
  const builder = `/coven/${slug}/grimoire/new` as Route;
  const action = rolePermits(membership.role, { spell: ['create'] }) ? (
    <IconTip tip="New Spell">
      <PendingLink
        className="btn btn--solid add-action"
        href={builder}
        navigationTarget={covenTarget(builder)}
      >
        <span className="add-action__label">New Spell</span>
        <span className="add-action__plus" aria-hidden="true">
          <PlusIcon />
        </span>
      </PendingLink>
    </IconTip>
  ) : undefined;
  return (
    <TabbedPage title="Grimoire" tabs={tabs} action={action}>
      {children}
    </TabbedPage>
  );
}
