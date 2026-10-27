import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import SpellBuilder from '@/components/SpellBuilder';
import { covenTarget } from '@/lib/coven-path';
import { PendingLink } from '@/lib/navigation';
import { requireCovenMembership } from '@/lib/request-session';
import { rolePermits } from '@/modules/coven';
import type { CovenLayoutParams } from '../../types';

export const metadata: Metadata = {
  title: 'New Spell',
};

// The new-spell page (M10.12, story 47): an empty spell builder, which creates the spell on
// its first Save (claude-docs/components/spell-builder.md). Owners and members only: a viewer
// writes nothing, so the page answers one with the 404 a stranger gets, and createSpell
// refuses a viewer by itself too. A Back link leaves it, not Cancel (the autosave plan,
// claude-docs/design-decisions/m13.14-plan.md). The narrow column is the forms' width; the
// page's look past the tokens is the grimoire's design review's.
export default async function NewSpellPage({ params }: CovenLayoutParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  if (!rolePermits(membership.role, { spell: ['create'] })) notFound();
  const grimoire = `/coven/${slug}/grimoire` as Route;

  return (
    <main className="page-frame__section page-frame--narrow">
      <PendingLink href={grimoire} navigationTarget={covenTarget(grimoire)}>
        Back to Grimoire
      </PendingLink>
      <div className="header">
        <h1>New Spell</h1>
      </div>
      <SpellBuilder workspaceId={workspace.id} />
    </main>
  );
}
