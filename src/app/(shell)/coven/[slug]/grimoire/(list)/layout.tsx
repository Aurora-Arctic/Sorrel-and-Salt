import type { Route } from 'next';
import TabbedPage from '@/components/TabbedPage';
import type { PageTab } from '@/components/TabbedPage/types';
import { requireCovenMembership } from '@/lib/request-session';
import type { CovenLayoutProps } from '../../types';

// The coven's Grimoire (M10.11): its spells, as two tabs, Spells (the complete ones) and
// Drafts, each its own address, so the status is the tab rather than a filter
// (claude-docs/components/grimoire-list.md). Every member reads both. Each tab opens with
// the search row and draws cards, which its loading skeleton follows. The layout's guard
// gives a non-member the 404 before the heading draws; each page still runs its own, since a
// layout does not re-run on a tab press.
export default async function GrimoireLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  await requireCovenMembership(slug);
  const tabs: PageTab[] = [
    { href: `/coven/${slug}/grimoire` as Route, label: 'Spells', filtered: true, shape: 'cards' },
    {
      href: `/coven/${slug}/grimoire/drafts` as Route,
      label: 'Drafts',
      filtered: true,
      shape: 'cards',
    },
  ];
  return (
    <TabbedPage title="Grimoire" tabs={tabs}>
      {children}
    </TabbedPage>
  );
}
