import { orNotFound } from '@/lib/or-not-found';
import type { Metadata, Route } from 'next';
import { cache } from 'react';
import CovenSwitchTargets from '../../../../../../components/CovenSwitchTargets';
import IngredientEntry from '../../../../../../components/IngredientEntry';
import { pageTitleOf } from '../../../../../../components/IngredientEntry/page-title';
import type { LinkedIngredient } from '../../../../../../components/IngredientEntry/types';
import { entryDescription } from '../../../../../../lib/page-metadata';
import { siteUrl } from '../../../../../../lib/site';
import { Forbidden } from '../../../../../../lib/errors';
import { requireCovenMembership, requireSession } from '../../../../../../lib/request-session';
import { viewerOf } from '../../../../../../lib/viewer';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';
import { covenJarsOf, stockDialogOf } from '@/app/coven-stock';
import { entryValues } from '@/app/entry-values';
import { covensHolding, plusCovensOf } from '@/app/plus-covens';
import { rolePermits } from '@/modules/coven';
import {
  applyCupboardEntry,
  compendiumMatchesOf,
  covensOpeningEntry,
  getCupboardEntry,
  getIngredient,
  ingredientDetailOf,
  isAnnotated,
  isRetired,
  lastEditsOf,
  MAKE_IT_OURS_PERMISSION,
} from '@/modules/ingredients';
import type { CovenIngredientParams } from './types';

// One ingredient inside a coven: its own, or a compendium entry read through the coven's door. An id
// from another coven or naming nothing visible is the stranger's 404. Per request, never cached
// (rule 6). It draws its own plain `<main>`, as the entry's article carries its own wide layout.

const COMPENDIUM_TIP = 'This is the compendium’s entry. The link opens its public page.';
const ANNOTATED_TIP =
  'This page is an annotated version of the compendium’s page. The link opens the original version.';
const SAME_TIP = 'This is the compendium entry that names the same thing. Compare them here.';
const SIMILAR_TIP =
  'These compendium entries share this entry\u2019s name, and it declares no formal name to tell them apart. Any of them might be the same thing. This page does not change your entry; the links open the compendium\u2019s pages.';

const publicAddress = (slug: string) => `/compendium/ingredients/${slug}` as Route;

// One read per request, shared by the metadata and the page. It runs the
// guard first, so a stranger is refused before the ingredient is looked up.
const entryOf = cache(async (slug: string, id: string) => {
  const { workspace } = await requireCovenMembership(slug);
  const session = await requireSession();
  const entry = await orNotFound(() => getIngredient(session, id, workspace.id), Forbidden);
  return { workspace, session, entry };
});

const cupboardOf = cache(async (slug: string, id: string) => {
  const { workspace, session, entry } = await entryOf(slug, id);
  return entry.workspaceId === null ? getCupboardEntry(session, workspace.id, entry.id) : null;
});

// A compendium entry names its public page as canonical (src/lib/site.ts); a retired one has none.
// The page is behind sign-in and robots closes it, so it carries a description for the tab and
// history alone, with no structured data or previews.
export async function generateMetadata({ params }: CovenIngredientParams): Promise<Metadata> {
  const { slug, id } = await params;
  const { entry } = await entryOf(slug, id);
  if (entry.workspaceId !== null) {
    return {
      title: pageTitleOf(entry),
      description: entryDescription(pageTitleOf(entry), entry.description),
    };
  }
  const title = pageTitleOf(applyCupboardEntry(entry, await cupboardOf(slug, id)));
  const description = entryDescription(title, entry.description);
  return isRetired(entry)
    ? { title, description }
    : { title, description, alternates: { canonical: siteUrl(publicAddress(entry.slug)) } };
}

export default async function CovenIngredientPage({ params, searchParams }: CovenIngredientParams) {
  const { slug, id } = await params;
  const { workspace, session, entry } = await entryOf(slug, id);
  const {
    membership: { role },
  } = await requireCovenMembership(slug);
  // A coven's own entry also links the compendium entries it is or may be, read here and never
  // through GraphQL; the compendium is public, so the links reveal nothing. The detail is read
  // without the coven, so the cupboard entry the metadata shares is laid in.
  const [read, { viewer }, matches, cupboardEntry, opening, jars, [lastEdit = null]] =
    await Promise.all([
      ingredientDetailOf(session, entry, isRetired(entry) ? workspace.id : undefined),
      viewerOf(),
      compendiumMatchesOf(session, entry),
      cupboardOf(slug, id),
      // The viewer's covens this entry's page also opens in, for the layout's coven switcher to
      // stay on it. Per viewer, from their memberships, and never cached.
      covensOpeningEntry(session, entry),
      covenJarsOf(session, workspace.id, entry.id),
      lastEditsOf(session, workspace.id, [entry]),
    ]);
  const detail = { ...read, cupboardEntry: read.cupboardEntry ?? cupboardEntry };
  // A retired entry is the compendium's still, but the compendium no longer holds it: no public
  // page to link, and nothing for a curator to edit, since the compendium's screens no longer read
  // it.
  const inCompendium = entry.workspaceId === null && !detail.retired;
  // Whether this coven's cupboard names the entry, retired or not: `detail`
  // carries the cupboard entry the retired-entry read found, where
  // `cupboardEntry` reads live entries only.
  const held = entry.workspaceId === null && detail.cupboardEntry != null;
  const isOwn = entry.workspaceId !== null;
  const plus = inCompendium
    ? await plusCovensOf(await covensHolding(entry.id), workspace.id)
    : undefined;

  const mayStock = rolePermits(role, { inventory: ['update'] });
  const stockData =
    isOwn || held
      ? stockDialogOf(
          detail.variants.map(({ variant }) => variant),
          jars,
        )
      : undefined;
  const stock = mayStock ? stockData : undefined;

  const own = `/coven/${workspace.slug}/ingredients/${entry.id}` as Route;
  const ingredientsHref = `/coven/${workspace.slug}/ingredients` as Route;
  const canEdit = isOwn
    ? rolePermits(role, { ingredient: ['update'] })
    : inCompendium && viewer.canCurate;
  const opened =
    canEdit && 'edit' in (await searchParams)
      ? {
          id: entry.id,
          values: await entryValues(entry, isOwn ? session : null),
          revision: entry.revision,
          updatedAt: entry.updatedAt.toISOString(),
        }
      : undefined;

  const mayAnnotate = held && rolePermits(role, { ingredient: ['update'] });
  const annotating = mayAnnotate && 'annotate' in (await searchParams);

  const hrefOf = ({ id, slug, workspaceId }: LinkedIngredient): Route | undefined => {
    if (workspaceId === null) return publicAddress(slug);
    if (workspaceId === workspace.id) return `/coven/${workspace.slug}/ingredients/${id}` as Route;
    return undefined;
  };

  return (
    <main>
      <CovenSwitchTargets path={own} slugs={opening.map((coven) => coven.slug)} />
      <IngredientEntry
        detail={detail}
        lastEdit={lastEdit}
        hrefOf={hrefOf}
        back={{ href: ingredientsHref, label: 'Ingredients' }}
        edit={
          canEdit && isOwn
            ? {
                href: `${own}?edit` as Route,
                closeHref: own,
                deletedHref: ingredientsHref,
                savedHref: own,
                opened,
                coven: {
                  workspaceId: workspace.id,
                  ingredientsHref,
                  mayPromote: rolePermits(role, { ingredient: ['update'] }),
                  stock,
                },
              }
            : canEdit
              ? {
                  href: `${own}?edit` as Route,
                  closeHref: own,
                  deletedHref: '/compendium' as Route,
                  savedHref: `${own}?edit` as Route,
                  opened,
                }
              : undefined
        }
        // The buttons a member's role permits over a compendium entry; the services refuse the rest
        // whatever is drawn. A retired held entry offers no Add, as the compendium no longer offers
        // it and removing it would be irreversible. Make It Ours reads the permission its service asserts.
        cupboard={
          entry.workspaceId === null && (inCompendium || held)
            ? {
                workspaceId: workspace.id,
                covenSlug: workspace.slug,
                canAdd: inCompendium && rolePermits(role, { ingredient: ['create'] }),
                canAnnotate: rolePermits(role, { ingredient: ['update'] }),
                canRemove: rolePermits(role, { ingredient: ['delete'] }),
                canMakeOurs: rolePermits(role, MAKE_IT_OURS_PERMISSION),
                plus,
                stock,
                annotate: { href: `${own}?annotate` as Route, closeHref: own, opened: annotating },
                removedHref: detail.retired
                  ? (`/coven/${workspace.slug}/ingredients` as Route)
                  : undefined,
              }
            : undefined
        }
        replaces={
          inCompendium
            ? {
                tip:
                  detail.cupboardEntry && isAnnotated(detail.cupboardEntry)
                    ? ANNOTATED_TIP
                    : COMPENDIUM_TIP,
                entries: [{ title: pageTitleOf(entry), href: publicAddress(entry.slug) }],
                total: 1,
              }
            : matches.kind === 'same' && matches.entries.length > 0
              ? {
                  tip: SAME_TIP,
                  entries: matches.entries.map((match) => ({
                    title: pageTitleOf(match),
                    href: publicAddress(match.slug),
                  })),
                  total: matches.total,
                  allHref: COMPENDIUM_PARAMS.href('/compendium', {
                    query: entry.canonicalName ?? entry.name,
                  }),
                }
              : undefined
        }
        stock={stockData && { workspaceId: workspace.id, ...stockData, mayEdit: mayStock }}
        similar={
          matches.kind === 'similar' && matches.entries.length > 0
            ? {
                tip: SIMILAR_TIP,
                entries: matches.entries.map((match) => ({
                  title: pageTitleOf(match),
                  href: publicAddress(match.slug),
                })),
                total: matches.total,
                allHref: COMPENDIUM_PARAMS.href('/compendium', { query: entry.name }),
              }
            : undefined
        }
      />
    </main>
  );
}
