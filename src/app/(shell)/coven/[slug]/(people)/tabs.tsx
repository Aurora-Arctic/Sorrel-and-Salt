import type { PageTab } from '@/components/TabbedPage/types';
import { covenPath } from '@/lib/coven-path';
import { InvitationsPanelSkeleton, MembersPanelSkeleton } from './panels';

/** The people page's tabs, drawn by the layout and by the skeleton, which cannot know the role and lists both. */
export const peopleTabs = (slug: string, { invitations }: { invitations: boolean }): PageTab[] => [
  {
    href: covenPath(slug, 'members'),
    label: 'Members',
    skeleton: <MembersPanelSkeleton />,
  },
  ...(invitations
    ? [
        {
          href: covenPath(slug, 'invitations'),
          label: 'Invitations',
          skeleton: <InvitationsPanelSkeleton />,
        },
      ]
    : []),
];
