import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import IngredientEntry from '../../../../../../components/IngredientEntry';
import { pageTitleOf } from '../../../../../../components/IngredientEntry/page-title';
import type { LinkedIngredient } from '../../../../../../components/IngredientEntry/types';
import { Forbidden, NotFound } from '../../../../../../lib/errors';
import { requireCovenMembership, requireSession } from '../../../../../../lib/request-session';
import { viewerOf } from '../../../../../../lib/viewer';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import { entryValues } from '@/app/(shell)/admin/compendium/entry-values';
import {
  compendiumEntriesReplacedBy,
  getIngredient,
  ingredientDetailOf,
} from '@/modules/ingredients';
import type { CovenIngredientParams } from './types';

// One ingredient inside a coven (M8.19): the coven's own, or a compendium
// entry read through the coven's door. The coven comes from the address and
// the guard proves the caller is in it, as on every coven page; `getIngredient`
// is then given that coven's id, which is what lets it open the coven's own
// entries. Its refusals (an id that names nothing visible to this coven, or
// one from another coven) are the 404 a stranger gets. Read per request and
// never cached: the detail is assembled for this viewer, and the cache is for
// reads that take no session (CLAUDE.md rule 6).
//
// The shell draws no `<main>`, so the page does. The entry's own article
// carries its own wide layout (the jump menu and the side columns), so
// `<main>` stays plain.

// The ⓘ sentence beside "In the Compendium", one for each case.
const COMPENDIUM_TIP = 'This entry is the compendium’s. Its public page is linked here.';
const LOCAL_TIP =
  'Your coven’s entry is offered in their place when you pick a substitute. Compare them here.';

const publicAddress = (slug: string) => `/compendium/ingredients/${slug}` as Route;

// One read per request, shared by the metadata and the page. It runs the
// guard first, so a stranger is refused before the ingredient is looked up.
const entryOf = cache(async (slug: string, id: string) => {
  const { workspace } = await requireCovenMembership(slug);
  const session = await requireSession();
  try {
    return { workspace, session, entry: await getIngredient(session, id, workspace.id) };
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) notFound();
    throw error;
  }
});

// A compendium entry names its public page as canonical, since that is the
// address a search engine should index. The path is relative: the origin
// varies by deployment, and MB.84 owns the public page's metadata.
export async function generateMetadata({ params }: CovenIngredientParams): Promise<Metadata> {
  const { slug, id } = await params;
  const { entry } = await entryOf(slug, id);
  const title = pageTitleOf(entry);
  return entry.workspaceId === null
    ? { title, alternates: { canonical: publicAddress(entry.slug) } }
    : { title };
}

export default async function CovenIngredientPage({ params, searchParams }: CovenIngredientParams) {
  const { slug, id } = await params;
  const { workspace, session, entry } = await entryOf(slug, id);
  // A coven's own entry also links the compendium entries it hides (M12.12),
  // read here for this one page and never through GraphQL; none for a
  // compendium entry. The compendium is public, so the links reveal nothing.
  const [detail, { viewer }, replaced] = await Promise.all([
    ingredientDetailOf(session, entry),
    viewerOf(),
    compendiumEntriesReplacedBy(session, entry),
  ]);
  const inCompendium = entry.workspaceId === null;

  // A compendium entry offers Edit to a curator, opening the compendium's edit modal
  // over this page (M8.19). A coven's own entry gets no Edit until M8.17's modal. The form's values are
  // read only for a curator who asks for them with a bare `?edit`.
  const own = `/coven/${workspace.slug}/ingredients/${entry.id}` as Route;
  const canEdit = inCompendium && viewer.canCurate;
  const opened =
    canEdit && 'edit' in (await searchParams)
      ? { id: entry.id, values: await entryValues(entry) }
      : undefined;

  const hrefOf = ({ id, slug, workspaceId }: LinkedIngredient): Route | undefined => {
    if (workspaceId === null) return publicAddress(slug);
    if (workspaceId === workspace.id) return `/coven/${workspace.slug}/ingredients/${id}` as Route;
    return undefined;
  };

  return (
    <main>
      <IngredientEntry
        detail={detail}
        hrefOf={hrefOf}
        edit={
          canEdit
            ? {
                href: `${own}?edit` as Route,
                closeHref: own,
                // The coven has no ingredients list yet, and this entry is a
                // compendium one, so a delete leaves to the compendium's.
                deletedHref: '/compendium' as Route,
                // The address names the entry's id, which a save leaves be.
                savedHref: `${own}?edit` as Route,
                opened,
              }
            : undefined
        }
        replaces={
          inCompendium
            ? {
                tip: COMPENDIUM_TIP,
                entries: [{ title: pageTitleOf(entry), href: publicAddress(entry.slug) }],
                total: 1,
              }
            : replaced.entries.length > 0
              ? {
                  tip: LOCAL_TIP,
                  entries: replaced.entries.map((hidden) => ({
                    title: pageTitleOf(hidden),
                    href: publicAddress(hidden.slug),
                  })),
                  total: replaced.total,
                  // See All opens the compendium search for this entry's label,
                  // written through the search's own parameter table.
                  allHref: COMPENDIUM_PARAMS.href('/compendium', { query: entry.name }),
                }
              : undefined
        }
      />
    </main>
  );
}
