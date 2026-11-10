import type { PageTab } from '@/components/TabbedPage/types';
import { covenPath } from '@/lib/coven-path';
import { GrimoirePanelSkeleton } from './panels';

/** The Grimoire's two tabs, drawn by the layout and by the skeleton. */
export const grimoireTabs = (slug: string): PageTab[] => [
  {
    href: covenPath(slug, 'grimoire'),
    label: 'Spells',
    skeleton: <GrimoirePanelSkeleton />,
  },
  {
    href: covenPath(slug, 'grimoire', 'drafts'),
    label: 'Drafts',
    skeleton: <GrimoirePanelSkeleton drafts />,
  },
];
