import type { Route } from 'next';
import type { ReactElement } from 'react';
import { readCategories } from '@/app/compendium-reads';
import GrimoireList from '@/components/GrimoireList';
import SpellDialog from '@/components/SpellBuilder/spell-dialog';
import { GRIMOIRE_PARAMS } from '@/components/GrimoireList/params';
import { NEW, opensNewSpell } from '@/components/AppShell/add-href';
import { single } from '@/lib/search-params';
import { pagerHrefs } from '@/lib/list-href';
import { readPageCursors } from '@/lib/numbered-page';
import { requireCovenMembership } from '@/lib/request-session';
import { RowId } from '@/lib/validation';
import { rolePermits } from '@/modules/coven';
import { readEditedSpell, readGrimoire, readGrimoireCategoryCounts } from './reads';
import type { GrimoireTabProps } from './types';

// One grimoire tab, Spells or Drafts (M10.11): the guard on the slug from the address, the
// address read as the filter, and one page of 24 cards of the tab's status. Read per request
// and never cached, since a grimoire is the coven's alone (CLAUDE.md rule 6). The layout's
// TabbedPage draws the `<main>` and the heading, inside the RouteModalProvider the spell
// builder's dialog opens in (M10.12): `?new=spell-<slug>` (or `?new=spell`) for New Spell and
// `?edit=<id>` for a saved spell, over the tab as it was, for a role that may write a spell. A viewer's opens
// nothing. `?new` is shared with the shell's Add Ingredient, `?new=ingredient-coven-<slug>`, and its
// value says which dialog (claude-docs/design-decisions/m10.12-spell-builder-modal.md).
// A function the two pages call rather than a component they draw, so each page is the
// async component itself and a test awaits it whole.
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
  const [page, counts] = await Promise.all([
    readGrimoire(workspace.id, variables, status, after, before),
    readGrimoireCategoryCounts(workspace.id, variables, status),
  ]);
  // A category no readable spell of this tab carries is not in the counts: it holds none.
  const counted = categories.map((category) => ({
    ...category,
    count: counts.get(category.id) ?? 0,
  }));

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
  const opened =
    opensNewSpell(single(adding) ?? null, workspace.slug) && canCreate
      ? {}
      : spellId?.success && rolePermits(role, { spell: ['update'] })
        ? await readEditedSpell(workspace.id, spellId.data).then(
            (saved) => saved && { spell: saved },
          )
        : undefined;

  return (
    <>
      <GrimoireList
        path={path}
        workspaceId={workspace.id}
        status={status}
        spells={page.spells}
        filter={filter}
        categories={counted}
        position={page.position}
        total={page.totalCount}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          GRIMOIRE_PARAMS.href(path, filter, { ...cursor }),
        )}
      />
      <SpellDialog
        workspaceId={workspace.id}
        covenSlug={workspace.slug}
        closeHref={GRIMOIRE_PARAMS.href(path, filter, { after, before })}
        opened={opened}
        canCreate={canCreate}
      />
    </>
  );
}
