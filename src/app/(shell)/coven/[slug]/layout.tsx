import type { Metadata } from 'next';
import { demoNoticeOf } from '@/lib/demo-notice';
import DemoNotice from '@/components/DemoNotice';
import SectionBody from '@/components/SectionBody';
import ContextRow from '@/components/ContextRow';
import { CovenFactsProvider } from '@/components/CovenFacts';
import CovenNav from '@/components/CovenNav';
import { CovenSwitchProvider } from '@/components/CovenSwitchTargets/context';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import { requireCovenMembership } from '@/lib/request-session';
import { titleTemplate } from '@/lib/site';
import { viewerOf } from '@/lib/viewer';
import { homeAccessOf } from './home-access';
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
  const demoNotice = demoNoticeOf(workspace, membership.role);

  // The coven's words for its home page's skeleton, which draws them before the page arrives.
  const facts = {
    slug,
    name: workspace.name,
    demo: workspace.demo,
    role: membership.role,
    access: homeAccessOf(membership.role),
  };

  return (
    <CovenFactsProvider facts={facts}>
      <CovenSwitchProvider>
        <ContextRow
          lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}
        >
          <CovenNav slug={slug} canReadMembers={facts.access.canReadMembers} />
        </ContextRow>
        {demoNotice && <DemoNotice slug={slug} text={demoNotice} />}
        <SectionBody region="coven" className="coven-layout">
          {children}
        </SectionBody>
      </CovenSwitchProvider>
    </CovenFactsProvider>
  );
}
