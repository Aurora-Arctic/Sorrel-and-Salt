import type { Route } from 'next';
import { lookHrefOf } from '@/components/GrimoireList/recipe-href';
import type { ReactElement } from 'react';
import { readCategories } from '@/app/compendium-reads';
import GrimoireList from '@/components/GrimoireList';
import Notice from '@/components/Notice';
import DetailsDialog from '@/components/IngredientEntry/details-dialog';
import { deletedHrefOf as deletedHrefFor } from '@/components/SpellRecipe/deleted-href';
import SpellRecipeBody from '@/components/SpellRecipe/body';
import SpellLookDialog from '@/components/SpellRecipe/look-dialog';
import SpellDialog from '@/components/SpellBuilder/spell-dialog';
import { GRIMOIRE_PARAMS, VISIBILITIES, VISIBILITY_LABELS } from '@/components/GrimoireList/params';
import type { GrimoireFacets, GrimoireListFilter } from '@/components/GrimoireList/types';
import { NEW, opensNewSpell } from '@/components/AppShell/add-href';
import { single } from '@/lib/search-params';
import { pagerHrefs, withParam } from '@/lib/list-href';
import { readPageCursors } from '@/lib/numbered-page';
import { requireCovenMembership } from '@/lib/request-session';
import { RowId } from '@/lib/validation';
import { rolePermits } from '@/modules/coven';
import {
  readEditedSpell,
  readGrimoire,
  readGrimoireCategoryCounts,
  readGrimoireFacetCounts,
  readLookedSpell,
} from './reads';
import type { GrimoireTabProps } from './types';
import { readViewedEntry } from '../../ingredients/reads';
import { viewedDetailsOf } from '../../ingredients/viewed-details';

// One grimoire tab, Spells or Drafts: the slug guard, the address as the filter, and one page of 24
// cards. Per request, never cached (rule 6). A function, not a component, so a test awaits each
// page whole. Dialogs: claude-docs/design-decisions/m10.12-spell-builder-modal.md.
// A delete on a spell's page leaves for this tab with `?deleted=<name>`, which a success Notice
// above the list says once. A role that may record, update, duplicate or delete a spell gets each
// card's Record a Working button, Edit pencil and More menu, links back to this address with
// `deleted` or `?edit=<id>` added.
/** `closeHref` with a saved spell's dialog open over it. */
const editHrefOf = (closeHref: Route, id: string): Route => withParam(closeHref, 'edit', id);

/**
 * The four facets' choices from their counts. A picked moon phase or day no spell holds is still
 * offered at 0 and keeps its chip; Visibility is the fixed pair, always shown.
 */
function facetsOf(
  filter: GrimoireListFilter,
  counts: Awaited<ReturnType<typeof readGrimoireFacetCounts>>,
): GrimoireFacets {
  const texts = (picked: readonly string[], found: readonly { value: string; count: number }[]) => {
    const held = new Set(found.map(({ value }) => value.toLowerCase()));
    return [
      ...found.map(({ value, count }) => ({ value, label: value, count })),
      ...picked
        .filter((value) => !held.has(value.toLowerCase()))
        .map((value) => ({ value, label: value, count: 0 })),
    ];
  };
  const visible = new Map(counts.visibilities.map(({ value, count }) => [value, count]));
  return {
    moonPhases: texts(filter.moonPhases, counts.moonPhases),
    daysOfWeek: texts(filter.daysOfWeek, counts.daysOfWeek),
    visibilities: VISIBILITIES.map((value) => ({
      value,
      label: VISIBILITY_LABELS[value],
      count: visible.get(value) ?? 0,
    })),
    makers: counts.makers,
  };
}

export async function grimoireTab({
  params,
  searchParams,
  status,
  beneath,
}: GrimoireTabProps): Promise<ReactElement> {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const query = await searchParams;
  const filter = GRIMOIRE_PARAMS.read(query);
  const { after, before } = readPageCursors(query);
  const path = `/coven/${workspace.slug}/grimoire${beneath}` as Route;

  // The address names categories by slug; the service filters by id.
  const categories = await readCategories();
  const lookups = { categories: new Map(categories.map(({ slug, id }) => [slug, id])) };
  const variables = JSON.stringify(GRIMOIRE_PARAMS.variables(filter, lookups));
  const [page, counts, facetCounts] = await Promise.all([
    readGrimoire(workspace.id, variables, status, after, before),
    readGrimoireCategoryCounts(workspace.id, variables, status),
    readGrimoireFacetCounts(workspace.id, variables, status),
  ]);
  // A category no readable spell of this tab carries is not in the counts: it holds none.
  const counted = categories.map((category) => ({
    ...category,
    count: counts.get(category.id) ?? 0,
  }));

  const facets = facetsOf(filter, facetCounts);

  // The dialog the address opens, if this role may write a spell. `?new` is read first: this
  // coven's `spell-<slug>` or `spell` is New Spell; any other is the shell's Add Ingredient, with a
  // saved spell's `?edit` waiting beneath it. One dialog at a time; a non-id `edit` reads nothing.
  const role = membership.role;
  const adding = query[NEW];
  const edit = adding === undefined ? query.edit : undefined;
  const spellId = typeof edit === 'string' ? RowId.safeParse(edit) : undefined;
  const canCreate = rolePermits(role, { spell: ['create'] });
  const canUpdate = rolePermits(role, { spell: ['update'] });
  const canDelete = rolePermits(role, { spell: ['delete'] });
  const closeHref = GRIMOIRE_PARAMS.href(path, filter, { after, before });
  // The members box needs the roster (`member: read`) as well as the right to record, as the spell page's.
  // The dialog reads the roster and the steps itself once opened, so the list reads neither.
  const canRecord =
    rolePermits(role, { working: ['create'] }) && rolePermits(role, { member: ['read'] });
  // Where a delete from the card or the Quick Look lands: this tab as it was, filter and page
  // kept, `?spell` dropped, with the name for the Notice.
  const deletedHrefOf = (title: string | null): Route => deletedHrefFor(closeHref, title);
  const opened =
    opensNewSpell(single(adding) ?? null, workspace.slug) && canCreate
      ? {}
      : spellId?.success && canUpdate
        ? await readEditedSpell(workspace.id, spellId.data).then(
            (saved) => saved && { spell: saved },
          )
        : undefined;

  // Quick Look: `?spell=<id>` opens a read-only modal for any role, and waits beneath another
  // dialog the way `?edit` does. Its Edit link is the card pencil's own check.
  const look = query.spell;
  const lookId =
    adding === undefined && opened === undefined && typeof look === 'string'
      ? RowId.safeParse(look)
      : undefined;
  // The tab with the Quick Look open, which its steps' eyes add `&entry=` to and the details close back to.
  const lookHref = lookId?.success ? lookHrefOf(closeHref, lookId.data) : undefined;
  const looked =
    lookHref && lookId?.success
      ? await readLookedSpell(workspace.id, lookHref, lookId.data)
      : undefined;
  // An ingredient step's eye opens the ingredient's details over the spell's modal, at
  // `&entry=<id>`, read as the coven's Ingredients page reads it. It waits on the spell's modal:
  // no spell open, no details.
  const entryId = typeof query.entry === 'string' && query.entry ? query.entry : undefined;
  const viewed =
    entryId && looked && !('failed' in looked)
      ? await readViewedEntry(membership, entryId)
      : undefined;

  const deleted = single(query.deleted)?.trim();

  return (
    <>
      {deleted && (
        <Notice kind="success" className="page-frame__notice">
          <strong>{deleted}</strong> was deleted.
        </Notice>
      )}
      <GrimoireList
        path={path}
        workspaceId={workspace.id}
        covenSlug={workspace.slug}
        status={status}
        spells={page.spells.map((spell) => ({
          ...spell,
          lookHref: lookHrefOf(closeHref, spell.id),
          ...(canUpdate && { editHref: editHrefOf(closeHref, spell.id) }),
          ...(canRecord &&
            spell.status === 'complete' && {
              recordWorking: { workspaceId: workspace.id, recorderId: membership.userId },
            }),
          ...((canCreate || canDelete) && {
            more: {
              workspaceId: workspace.id,
              covenSlug: workspace.slug,
              deletedHref: deletedHrefOf(spell.title),
              canDuplicate: canCreate,
              canDelete,
            },
          }),
        }))}
        filter={filter}
        categories={counted}
        facets={facets}
        position={page.position}
        cursor={{ after, before }}
        total={page.totalCount}
        canCreate={canCreate}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          GRIMOIRE_PARAMS.href(path, filter, { ...cursor }),
        )}
      />
      <SpellDialog
        workspaceId={workspace.id}
        covenSlug={workspace.slug}
        covenName={workspace.name}
        closeHref={closeHref}
        opened={opened}
        canCreate={canCreate}
        canDelete={canDelete}
        canDuplicate={canCreate}
        userId={membership.userId}
      />
      <SpellLookDialog
        closeHref={closeHref}
        failed={looked !== undefined && 'failed' in looked}
        opened={
          looked && !('failed' in looked)
            ? {
                title: looked.spell.title,
                status: looked.spell.status,
                visibility: looked.spell.visibility,
                lastEdit: looked.recipe.lastEdit,
                recipeHref: `/coven/${workspace.slug}/grimoire/${looked.spell.id}` as Route,
                ...(canUpdate && { editHref: editHrefOf(closeHref, looked.spell.id) }),
                children: (
                  <SpellRecipeBody
                    title={looked.spell.title}
                    intent={looked.spell.intent}
                    categories={looked.recipe.categories}
                    note={looked.spell.note}
                    jarDescription={looked.spell.jarDescription}
                    sealWaxColor={looked.spell.sealWaxColor}
                    moonPhase={looked.spell.moonPhase}
                    dayOfWeek={looked.spell.dayOfWeek}
                    steps={looked.recipe.steps}
                    level={3}
                  />
                ),
              }
            : undefined
        }
      />
      {lookHref && (
        <DetailsDialog
          closeHref={lookHref}
          opened={viewed && viewedDetailsOf(viewed, workspace.slug)}
        />
      )}
    </>
  );
}
