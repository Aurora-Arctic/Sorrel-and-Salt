import type { Metadata } from 'next';
import ContextRow from '../../../../components/ContextRow';
import CovenNav from '../../../../components/CovenNav';
import WorkspaceSwitcher from '../../../../components/WorkspaceSwitcher';
import { requireCovenMembership } from '../../../../lib/request-session';
import { viewerOf } from '../../../../lib/viewer';
import type { CovenLayoutParams, CovenLayoutProps } from './types';

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

// The workspace is the URL segment's and nothing else's: never a cookie or a
// "current workspace" on the session, so two tabs can sit in two covens. A
// non-member and an unknown slug both get the 404 (claude-docs/auth/coven-guard.md,
// "The coven guard"). Every page beneath calls the guard too, with its own
// `params`: a layout does not re-run on client-side navigation. The section
// nav is here rather than on each page, so every page beneath has it (M9.15),
// in the context row beside the coven switcher (MB.7). The switcher's list is
// the shell's own cached lookup, so it costs no second query.
export default async function CovenLayout({ children, params }: CovenLayoutProps) {
  const { slug } = await params;
  const { membership } = await requireCovenMembership(slug);
  const { viewer, workspaces } = await viewerOf();

  return (
    <>
      <ContextRow lead={<WorkspaceSwitcher workspaces={workspaces} canCreate={viewer.canCreate} />}>
        <CovenNav slug={slug} covenRole={membership.role} />
      </ContextRow>
      <div className="coven-layout">{children}</div>
    </>
  );
}
