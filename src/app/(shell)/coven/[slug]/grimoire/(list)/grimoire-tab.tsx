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
import { GRIMOIRE_PARAMS, VISIBILITIES } from '@/components/GrimoireList/params';
import type { GrimoireFacets, GrimoireListFilter } from '@/components/GrimoireList/types';
import { NEW, opensNewSpell } from '@/components/AppShell/add-href';
import { single } from '@/lib/search-params';
import { pagerHrefs } from '@/lib/list-href';
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

// One grimoire tab, Spells or Drafts (M10.11): the guard on the slug from the address, the
// address read as the filter, and one page of 24 cards of the tab's status. Read per request
// and never cached, since a grimoire is the coven's alone (CLAUDE.md rule 6). The layout's
// TabbedPage draws the `<main>` and the heading, inside the RouteModalProvider the spell
// builder's dialog opens in (M10.12): `?new=spell-<slug>` (or `?new=spell`) for New Spell and
// `?edit=<id>` for a saved spell, over the tab as it was, for a role that may write a spell. A viewer's opens
// nothing. `?new` is shared with the shell's Add Ingredient, `?new=ingredient-coven-<slug>`, and its
// value says which dialog (claude-docs/design-decisions/m10.12-spell-builder-modal.md).
// A delete on a spell's page leaves for the tab it was listed on with `?deleted=<name>`
// (M13.11), which the tab says in a success Notice above the list, read once: the next
// address the tab builds drops it. The Notice is a status, so it is announced as the list
// shows, and the heading the closing dialog gives the focus to stands above it.
// A role that may delete one also gets the bin on each card and in the Quick Look, landing on this
// address with `deleted` added (M13.11).
// A role that may update a spell also gets each card's Edit pencil, a link to the tab's own
// address with `?edit=<id>` added (M13.10), so closing the dialog returns to it as it was.
// A function the two pages call rather than a component they draw, so each page is the
// async component itself and a test awaits it whole.
/** `closeHref` with a saved spell's dialog open over it. */
const editHrefOf = (closeHref: Route, id: string): Route =>
  `${closeHref}${closeHref.includes('?') ? '&' : '?'}${new URLSearchParams({ edit: id })}` as Route;

const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], string> = {
  private: 'Private',
  workspace: 'Shared',
};

/**
 * The four facets' choices from their counts (M13.22). Moon phase and day are the spells' own
 * words, so a value picked from a hand-edited address that no spell holds is still offered, at 0,
 * and keeps its chip. Visibility is the fixed pair, each shown whether or not a spell holds it.
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

  // The dialog the address opens, if this role may write a spell. `?new` is read first:
  // `?new=spell-<slug>` naming this coven, or `?new=spell`, is New Spell. Any other `?new` is
  // the shell's Add Ingredient, or another coven's New Spell on its way there, so a
  // saved spell's `?edit` waits beneath it and opens when that dialog's close drops `new`.
  // One dialog shows at a time. An `edit` that is not an id reads nothing.
  const role = membership.role;
  const adding = query[NEW];
  const edit = adding === undefined ? query.edit : undefined;
  const spellId = typeof edit === 'string' ? RowId.safeParse(edit) : undefined;
  const canCreate = rolePermits(role, { spell: ['create'] });
  const canUpdate = rolePermits(role, { spell: ['update'] });
  const canDelete = rolePermits(role, { spell: ['delete'] });
  const closeHref = GRIMOIRE_PARAMS.href(path, filter, { after, before });
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

  // Quick Look (M13.21): `?spell=<id>` opens a read-only modal for any role, and waits beneath
  // another dialog the way `?edit` does. Its Edit link is the card pencil's own check.
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
  // `&entry=<id>` (the owner, 2026-10-28), read as the coven's Ingredients page reads it. It
  // waits on the spell's modal: no spell open, no details.
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
          ...(canDelete && {
            deleteSpell: { workspaceId: workspace.id, deletedHref: deletedHrefOf(spell.title) },
          }),
        }))}
        filter={filter}
        categories={counted}
        facets={facets}
        position={page.position}
        cursor={{ after, before }}
        total={page.totalCount}
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
        userId={membership.userId}
      />
      <SpellLookDialog
        closeHref={closeHref}
        failed={looked !== undefined && 'failed' in looked}
        opened={
          looked && !('failed' in looked)
            ? {
                title: looked.spell.title,
                lastEdit: looked.recipe.lastEdit,
                recipeHref: `/coven/${workspace.slug}/grimoire/${looked.spell.id}` as Route,
                ...(canUpdate && { editHref: editHrefOf(closeHref, looked.spell.id) }),
                ...(canDelete && {
                  deleteSpell: {
                    workspaceId: workspace.id,
                    spellId: looked.spell.id,
                    deletedHref: deletedHrefOf(looked.spell.title),
                  },
                }),
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
