import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RouteModalProvider } from '@/components/Modal/route-modal-provider';
import { EditLink } from '@/components/IconTip';
import DetailsDialog from '@/components/IngredientEntry/details-dialog';
import SpellDialog from '@/components/SpellBuilder/spell-dialog';
import DeleteSpellAction from '@/components/SpellRecipe/delete-spell';
import SpellPreview from '@/components/SpellPreview';
import { previewStepsOf } from '@/components/SpellPreview/preview-steps';
import SpellRecipe from '@/components/SpellRecipe';
import SpellRecipeAside from '@/components/SpellRecipe/aside';
import { UNTITLED_SPELL } from '@/components/SpellCard';
import { Forbidden, NotFound } from '@/lib/errors';
import { RowId } from '@/lib/validation';
import { rolePermits } from '@/modules/coven';
import { requireCovenMembership, requireSession } from '@/lib/request-session';
import { readSpell } from '@/modules/grimoire';
import { readEditedSpell } from '../(list)/reads';
import { readViewedEntry } from '../../ingredients/reads';
import { viewedDetailsOf } from '../../ingredients/viewed-details';
import { readRecipeOf } from '../recipe-read';
import { readRecipeAsideOf } from './recipe-aside';
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
  const canUpdate = rolePermits(membership.role, { spell: ['update'] });
  const canDelete = rolePermits(membership.role, { spell: ['delete'] });
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
          aside={<SpellRecipeAside {...aside} />}
          action={
            <div className="spell-recipe__actions">
              <SpellPreview title={name} steps={previewStepsOf(recipe.steps)} />
              {canUpdate && (
                <EditLink
                  href={`${recipePath}?edit=${spell.id}` as Route}
                  name={name}
                  heading={{ eyebrow: 'Edit Spell', title: name }}
                />
              )}
              {canDelete && (
                <DeleteSpellAction
                  workspaceId={workspace.id}
                  spellId={spell.id}
                  name={name}
                  deletedHref={deletedHref}
                />
              )}
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
