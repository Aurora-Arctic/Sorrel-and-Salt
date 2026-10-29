import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RouteModalProvider } from '@/components/Modal/route-modal-provider';
import { EditLink } from '@/components/IconTip';
import DetailsDialog from '@/components/IngredientEntry/details-dialog';
import SpellDialog from '@/components/SpellBuilder/spell-dialog';
import DeleteSpellAction from '@/components/SpellRecipe/delete-spell';
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

// One saved spell as a page (MB.6): the read surface for a spell, at /coven/[slug]/grimoire/[id].
// The coven comes from the address and the guard proves the caller is in it; `readSpell` is
// then given that coven's id and keeps a private spell its author's in SQL, so a stranger, a
// spell of another coven and another member's private spell all read as the same 404.
// Read per request and never cached (CLAUDE.md rule 6). Through the services, not GraphQL
// (rule 1). The page calls `requireSession()` itself: the shell layout does not guard a page.
// The shell draws no `<main>`, so the page does. The RouteModalProvider is for the Edit
// dialog (M13.10): `?edit=<id>` opens it over the page for a role that may update a spell, and
// only when it names this page's own spell. Anyone else's `?edit` opens nothing, and a viewer
// has no Edit control. Delete Spell (M13.11) is the bin beside the pencil, for a role that may
// delete a spell; confirmed, it leaves for the tab the spell was listed on, naming it in
// `?deleted` for the tab's Notice.

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
  // The side column (the owner, 2026-10-29): the builder's In Coven Inventory and Category
  // Match on the saved spell, for the page and not the Quick Look modal.
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
  // page's `?entry=<id>` (the owner, 2026-10-28), read as the coven's Ingredients page reads it:
  // any member's, and nothing for an id the service withholds.
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
            (canUpdate || canDelete) && (
              <div className="spell-recipe__actions">
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
            )
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
