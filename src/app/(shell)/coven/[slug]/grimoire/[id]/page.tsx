import { orNotFound } from '@/lib/or-not-found';
import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RouteModalProvider } from '@/components/Modal/route-modal-provider';
import { EditLink } from '@/components/IconTip';
import DetailsDialog from '@/components/IngredientEntry/details-dialog';
import SpellDialog from '@/components/SpellBuilder/spell-dialog';
import SpellPreview from '@/components/SpellPreview';
import { previewStepsOf } from '@/components/SpellPreview/preview-steps';
import SpellMoreMenu from '@/components/SpellRecipe/more-menu';
import SpellRecipe from '@/components/SpellRecipe';
import CompleteWorkingAction from '@/components/RecordWorking/complete-action';
import EditWorkingAction from '@/components/SpellWorkings/edit-working';
import SpellWorkings from '@/components/SpellWorkings';
import SpellRecipeAside from '@/components/SpellRecipe/aside';
import { deletedHrefOf } from '@/components/SpellRecipe/deleted-href';
import { UNTITLED_SPELL } from '@/components/SpellCard';
import { DEMO_NOTICE, DEMO_OWNER_NOTICE } from '@/lib/demo-notice';
import { Forbidden } from '@/lib/errors';
import { RowId } from '@/lib/validation';
import { viewerOf } from '@/lib/viewer';
import { rolePermits } from '@/modules/coven';
import { requireCovenMembership, requireSession } from '@/lib/request-session';
import RecordWorkingButton from '@/components/RecordWorking';
import { readSpell } from '@/modules/grimoire';
import { readEditedSpell } from '../(list)/reads';
import { readViewedEntry } from '../../ingredients/reads';
import { viewedDetailsOf } from '../../ingredients/viewed-details';
import { readRecipeOf } from '../recipe-read';
import { readWorkingsOf } from './workings-read';
import { readRecipeAsideOf } from './recipe-aside';
import { workingStepsOf } from './recipe-steps';
import type { SpellRecipeParams } from './types';
import { covenPath } from '@/lib/coven-path';

// One saved spell as a page. `readSpell` keeps a private spell its author's in SQL, so a stranger, another coven's
// spell and another member's private spell all read as the same 404. Per request, never cached (rule 6).
// The page calls `requireSession()` and draws its own `<main>`.

const spellOf = cache(async (slug: string, id: string) => {
  // A malformed id names no spell, so it is a 404 before any read.
  if (!RowId.safeParse(id).success) notFound();
  const { workspace, membership } = await requireCovenMembership(slug);
  const session = await requireSession();
  const spell = await orNotFound(() => readSpell(session, workspace.id, id), Forbidden);
  return { workspace, membership, session, spell };
});

export async function generateMetadata({ params }: SpellRecipeParams): Promise<Metadata> {
  const { slug, id } = await params;
  const { spell } = await spellOf(slug, id);
  return { title: spell.title?.trim() || UNTITLED_SPELL };
}

export default async function SpellRecipePage({ params, searchParams }: SpellRecipeParams) {
  const { slug, id } = await params;
  const { workspace, membership, session, spell } = await spellOf(slug, id);
  const recipePath = covenPath(workspace.slug, 'grimoire', spell.id);
  const recipe = await readRecipeOf(session, spell, recipePath);
  const aside = await readRecipeAsideOf(
    session,
    workspace.id,
    recipe.views,
    recipe.categories,
    recipePath,
    // Edit Stock on the inventory's lines, on the permission `saveStock` asserts: none for an observer.
    rolePermits(membership.role, { inventory: ['update'] }),
  );
  const workings = await readWorkingsOf(
    session,
    workspace.id,
    spell.id,
    recipe.steps,
    rolePermits(membership.role, { working: ['delete'] }),
    rolePermits(membership.role, { working: ['update'] }),
  );
  const ingredientSteps = workingStepsOf(
    recipe.views,
    recipePath,
    new Map(aside.doors.map(({ stepId, stock }) => [stepId, stock])),
  );
  const canUpdate = rolePermits(membership.role, { spell: ['update'] });
  const canDelete = rolePermits(membership.role, { spell: ['delete'] });
  const canDuplicate = rolePermits(membership.role, { spell: ['create'] });
  const canRecord =
    spell.status === 'complete' && rolePermits(membership.role, { working: ['create'] });
  const name = spell.title?.trim() || UNTITLED_SPELL;
  const { viewer } = await viewerOf();
  const recordButton = (
    <RecordWorkingButton
      workspaceId={workspace.id}
      spellId={spell.id}
      spellName={name}
      spellVisibility={spell.visibility}
      recorder={{ userId: membership.userId, name: viewer.name }}
      steps={ingredientSteps}
    />
  );
  const listPath = covenPath(workspace.slug, 'grimoire', spell.status === 'draft' && 'drafts');
  const deletedHref = deletedHrefOf(listPath, spell.title);
  const query = await searchParams;
  const edit = query.edit;
  const entryId = typeof query.entry === 'string' && query.entry ? query.entry : undefined;
  const viewed = entryId ? await readViewedEntry(membership, entryId) : undefined;
  const wanted = typeof edit === 'string' ? RowId.safeParse(edit) : undefined;
  const saved =
    canUpdate && wanted?.success && wanted.data === spell.id
      ? await readEditedSpell(workspace.id, spell.id)
      : undefined;
  return (
    <main>
      <RouteModalProvider>
        <SpellRecipe
          title={spell.title}
          intent={spell.intent}
          status={spell.status}
          visibility={spell.visibility}
          categories={recipe.categories}
          lastEdit={recipe.lastEdit}
          note={spell.note}
          jarDescription={spell.jarDescription}
          sealWaxColor={spell.sealWaxColor}
          moonPhase={spell.moonPhase}
          dayOfWeek={spell.dayOfWeek}
          steps={recipe.steps}
          workings={
            <SpellWorkings
              workings={workings}
              headingAction={canRecord ? recordButton : undefined}
              completeAction={(workingId, workedOn, name) => (
                <CompleteWorkingAction
                  label={`Complete Working ${name}`}
                  workspaceId={workspace.id}
                  spellId={spell.id}
                  workingId={workingId}
                  workedOn={workedOn}
                  steps={ingredientSteps}
                />
              )}
              editAction={(editable, name, plain, canDelete) => (
                <EditWorkingAction
                  name={name}
                  plain={plain}
                  canDelete={canDelete}
                  workspaceId={workspace.id}
                  spellId={spell.id}
                  spellVisibility={spell.visibility}
                  steps={ingredientSteps}
                  working={editable}
                />
              )}
            />
          }
          aside={<SpellRecipeAside {...aside} />}
          action={
            <div className="spell-recipe__actions">
              {canRecord && recordButton}
              {canUpdate && (
                <EditLink
                  href={`${recipePath}?edit=${spell.id}` as Route}
                  name={name}
                  heading={{ eyebrow: 'Edit Spell', title: name }}
                  className="icon-tip__edit icon-tip__edit--plain"
                />
              )}
              <SpellPreview
                title={name}
                intent={spell.intent}
                categories={recipe.categories}
                note={spell.note}
                jarDescription={spell.jarDescription}
                sealWaxColor={spell.sealWaxColor}
                moonPhase={spell.moonPhase}
                dayOfWeek={spell.dayOfWeek}
                steps={previewStepsOf(recipe.steps)}
                demoNotice={
                  workspace.demo
                    ? membership.role === 'owner'
                      ? DEMO_OWNER_NOTICE
                      : DEMO_NOTICE
                    : undefined
                }
              />
              <SpellMoreMenu
                workspaceId={workspace.id}
                covenSlug={workspace.slug}
                spellId={spell.id}
                name={name}
                deletedHref={deletedHref}
                visibility={spell.visibility}
                canDuplicate={canDuplicate}
                canDelete={canDelete}
                canPrint
              />
            </div>
          }
          back={{ href: covenPath(workspace.slug, 'grimoire'), label: 'Grimoire' }}
        />
        <SpellDialog
          workspaceId={workspace.id}
          covenSlug={workspace.slug}
          covenName={workspace.name}
          closeHref={recipePath}
          opened={saved && { spell: saved }}
          canCreate={false}
          canDelete={canDelete}
          deletedFromHref={listPath}
          canDuplicate={canDuplicate}
          userId={membership.userId}
        />
        <DetailsDialog
          closeHref={recipePath}
          opened={viewed && viewedDetailsOf(viewed, workspace.slug)}
        />
      </RouteModalProvider>
    </main>
  );
}
