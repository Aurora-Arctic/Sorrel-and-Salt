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
import { UNTITLED_SPELL } from '@/components/SpellCard';
import { Forbidden, NotFound } from '@/lib/errors';
import { RowId } from '@/lib/validation';
import { memberRoster, rolePermits } from '@/modules/coven';
import { requireCovenMembership, requireSession } from '@/lib/request-session';
import RecordWorkingButton from '@/components/RecordWorking';
import { displayNamesOf } from '@/modules/identity';
import { readSpell } from '@/modules/grimoire';
import { readEditedSpell } from '../(list)/reads';
import { readViewedEntry } from '../../ingredients/reads';
import { viewedDetailsOf } from '../../ingredients/viewed-details';
import { readRecipeOf } from '../recipe-read';
import { readWorkingsOf } from './workings-read';
import { readRecipeAsideOf } from './recipe-aside';
import { workingStepsOf } from './recipe-steps';
import type { SpellRecipeParams } from './types';

// One saved spell as a page. `readSpell` keeps a private spell its author's in SQL, so a stranger,
// another coven's spell and another member's private spell all read as the same 404. Per request,
// never cached (rule 6). The page calls `requireSession()` and draws its own `<main>`; the
// RouteModalProvider serves `?edit=<id>` for this page's own spell and a role that may update it.
// Delete Spell leaves for the tab the spell was listed on, naming it in `?deleted`.

// One read per request, shared by the metadata and the page. The guard runs first.
const spellOf = cache(async (slug: string, id: string) => {
  const { workspace, membership } = await requireCovenMembership(slug);
  const session = await requireSession();
  try {
    return { workspace, membership, session, spell: await readSpell(session, workspace.id, id) };
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: SpellRecipeParams): Promise<Metadata> {
  const { slug, id } = await params;
  const { spell } = await spellOf(slug, id);
  return { title: spell.title?.trim() || UNTITLED_SPELL };
}

export default async function SpellRecipePage({ params, searchParams }: SpellRecipeParams) {
  const { slug, id } = await params;
  const { workspace, membership, session, spell } = await spellOf(slug, id);
  const recipePath = `/coven/${workspace.slug}/grimoire/${spell.id}` as Route;
  const recipe = await readRecipeOf(session, spell, recipePath);
  // The side column: the builder's In Coven Inventory and Category Match on the saved spell, for
  // the page and not the Quick Look modal.
  const aside = await readRecipeAsideOf(
    session,
    workspace.id,
    recipe.views,
    recipe.categories,
    recipePath,
    // Edit Stock on the inventory's lines, on the permission `saveStock` asserts: none for a viewer.
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
  // The members are read only for a role that records or edits a working, and only on the
  // permission `memberRoster` asserts (`member: read`), which a viewer lacks.
  const listsMembers =
    rolePermits(membership.role, { member: ['read'] }) &&
    rolePermits(membership.role, { working: ['create'] });
  const roster = listsMembers ? await memberRoster(session, workspace) : [];
  const memberNames = listsMembers
    ? await displayNamesOf(
        session,
        roster.map(({ userId }) => userId),
      )
    : [];
  const members = roster.map(({ userId }, i) => ({
    userId,
    name: memberNames[i] ?? 'A former member',
  }));
  const ingredientSteps = workingStepsOf(
    recipe.views,
    recipePath,
    new Map(aside.doors.map(({ stepId, stock }) => [stepId, stock])),
  );
  const canUpdate = rolePermits(membership.role, { spell: ['update'] });
  const canDelete = rolePermits(membership.role, { spell: ['delete'] });
  const canDuplicate = rolePermits(membership.role, { spell: ['create'] });
  // Only a complete spell is worked, and on the permission `recordWorking` asserts.
  const canRecord =
    spell.status === 'complete' && rolePermits(membership.role, { working: ['create'] });
  const name = spell.title?.trim() || UNTITLED_SPELL;
  const listPath = `/coven/${workspace.slug}/grimoire${spell.status === 'draft' ? '/drafts' : ''}`;
  const deletedHref = `${listPath}?${new URLSearchParams({ deleted: name })}` as Route;
  const query = await searchParams;
  const edit = query.edit;
  // An ingredient step's Quick Look eye opens the ingredient's details over the recipe, at this
  // page's `?entry=<id>`, read as the coven's Ingredients page reads it: any member's, and nothing
  // for an id the service withholds.
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
              workspaceId={workspace.id}
              workings={workings}
              completeAction={(workingId) => (
                <CompleteWorkingAction
                  workspaceId={workspace.id}
                  spellId={spell.id}
                  workingId={workingId}
                  steps={ingredientSteps}
                />
              )}
              editAction={(editable, name, plain) => (
                <EditWorkingAction
                  name={name}
                  plain={plain}
                  workspaceId={workspace.id}
                  spellId={spell.id}
                  spellVisibility={spell.visibility}
                  members={members}
                  steps={ingredientSteps}
                  working={editable}
                />
              )}
            />
          }
          aside={<SpellRecipeAside {...aside} />}
          action={
            <div className="spell-recipe__actions">
              {canRecord && (
                <RecordWorkingButton
                  workspaceId={workspace.id}
                  spellId={spell.id}
                  spellVisibility={spell.visibility}
                  members={members}
                  recorderId={membership.userId}
                  steps={ingredientSteps}
                />
              )}
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
              />
              <SpellMoreMenu
                workspaceId={workspace.id}
                covenSlug={workspace.slug}
                spellId={spell.id}
                name={name}
                deletedHref={deletedHref}
                canDuplicate={canDuplicate}
                canDelete={canDelete}
                canPrint
              />
            </div>
          }
          back={{ href: `/coven/${workspace.slug}/grimoire` as Route, label: 'Grimoire' }}
        />
        <SpellDialog
          workspaceId={workspace.id}
          covenSlug={workspace.slug}
          covenName={workspace.name}
          closeHref={recipePath}
          opened={saved && { spell: saved }}
          canCreate={false}
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
