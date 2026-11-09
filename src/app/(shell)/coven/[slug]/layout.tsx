import type { Metadata } from 'next';
import { DEMO_NOTICE, DEMO_OWNER_NOTICE } from '@/lib/demo-notice';
import { rolePermits } from '@/modules/coven';
import DemoNotice from '../../../../components/DemoNotice';
import SectionBody from '../../../../components/SectionBody';
import ContextRow from '../../../../components/ContextRow';
import { CovenFactsProvider } from '../../../../components/CovenFacts';
import CovenNav from '../../../../components/CovenNav';
import { CovenSwitchProvider } from '../../../../components/CovenSwitchTargets/context';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { requireCovenMembership } from '../../../../lib/request-session';
import { titleTemplate } from '../../../../lib/site';
import { viewerOf } from '../../../../lib/viewer';
import type { CovenLayoutParams, CovenLayoutProps } from './types';

// Each page under the coven gives its own name ('Grimoire') and this template finishes it with the
// coven's; the root template finishes the default. The guard is the same cached call the layout makes,
// so naming the coven costs no second lookup.
export async function generateMetadata({ params }: CovenLayoutParams): Promise<Metadata> {
  const { slug } = await params;
  const { workspace } = await requireCovenMembership(slug);
  return {
    title: {
      template: titleTemplate(workspace.name),
      default: workspace.name,
    },
  };
}

// The workspace is the URL segment's alone, never a cookie, so two tabs can sit in two covens. A
// non-member and an unknown slug both get the 404 (claude-docs/auth/coven-guard.md, "The coven guard").
// Every page calls the guard too. The provider carries a page's covens up to the switcher.
export default async function CovenLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const { viewer, workspaces } = await viewerOf();

  // The coven's words for its home page's skeleton, which draws them before the page arrives.
  const facts = {
    slug,
    name: workspace.name,
    demo: workspace.demo,
    role: membership.role,
    access: {
      canDelete: rolePermits(membership.role, { workspace: ['delete'] }),
      canReadMembers: rolePermits(membership.role, { member: ['read'] }),
      canInvite: rolePermits(membership.role, { member: ['invite'] }),
      canRename: rolePermits(membership.role, { workspace: ['update'] }),
    },
  };

  return (
    <CovenFactsProvider facts={facts}>
      <CovenSwitchProvider>
        <ContextRow
          lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
        >
          <CovenNav
            slug={slug}
            canReadMembers={rolePermits(membership.role, { member: ['read'] })}
          />
        </ContextRow>
        {workspace.demo && (
          <DemoNotice
            slug={slug}
            text={membership.role === 'owner' ? DEMO_OWNER_NOTICE : DEMO_NOTICE}
          />
        )}
        <SectionBody region="coven" className="coven-layout">
          {children}
        </SectionBody>
      </CovenSwitchProvider>
    </CovenFactsProvider>
  );
}
