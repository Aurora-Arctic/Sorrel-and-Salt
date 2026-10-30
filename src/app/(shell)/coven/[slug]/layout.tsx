import type { Metadata } from 'next';
import { rolePermits } from '@/modules/coven';
import Notice from '../../../../components/Notice';
import SectionBody from '../../../../components/SectionBody';
import ContextRow from '../../../../components/ContextRow';
import CovenNav from '../../../../components/CovenNav';
import { CovenSwitchProvider } from '../../../../components/CovenSwitchTargets/context';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { requireCovenMembership } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';
import type { CovenLayoutParams, CovenLayoutProps } from './types';

const DEMO_NOTICE =
  'This is a demo coven, so you can see how Sorrel & Salt works. You can look at everything and change nothing. A coven of your own starts with an invitation from someone who has one.';
const DEMO_OWNER_NOTICE =
  'You own this coven as a site admin: what you change here is what every new account sees.';

// Each page under the coven gives its own name ('Grimoire') and this template
// finishes it with the coven's. The guard is the same cached call the layout
// makes, so naming the coven costs no second lookup.
export async function generateMetadata({ params }: CovenLayoutParams): Promise<Metadata> {
  const { slug } = await params;
  const { workspace } = await requireCovenMembership(slug);
  return {
    title: {
      template: `%s — ${workspace.name} — Sorrel & Salt`,
      default: `${workspace.name} — Sorrel & Salt`,
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

  return (
    <CovenSwitchProvider>
      <ContextRow lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}>
        <CovenNav slug={slug} canReadMembers={rolePermits(membership.role, { member: ['read'] })} />
      </ContextRow>
      {workspace.demo && (
        // A region of its own: axe asks all page content to sit in a landmark, and the pages own the main one.
        <section aria-label="Demo Coven">
          <Notice kind="plain">
            {membership.role === 'owner' ? DEMO_OWNER_NOTICE : DEMO_NOTICE}
          </Notice>
        </section>
      )}
      <SectionBody region="coven" className="coven-layout">
        {children}
      </SectionBody>
    </CovenSwitchProvider>
  );
}
