import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CompendiumCards from '../../../components/CompendiumCards';
import type { CompendiumCardEntry } from '../../../components/CompendiumCards/types';
import { editHeading } from '../../../components/CompendiumList/heading';
import { compendiumFacetCounts } from '../../../components/CompendiumList/facets';
import {
  PUBLIC_COMPENDIUM_PATH,
  compendiumHref,
  covenIngredientsHref,
} from '../../../components/CompendiumList/href';
import { COMPENDIUM_PARAMS } from '../../../components/CompendiumList/params';
import type { CompendiumListFilter } from '../../../components/CompendiumList/types';
import { EDIT_ENTRY_EYEBROW } from '../../../components/IngredientEntry/edit-heading';
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import PageHeader from '../../../components/PageHeader';
import { Forbidden } from '../../../lib/errors';
import { listJsonLd } from '../../../lib/json-ld';
import { publicPageMetadata } from '../../../lib/page-metadata';
import { entryRecency } from '../../../lib/entry-recency';
import { pagerHrefs } from '../../../lib/list-href';
import { readPageCursors } from '../../../lib/numbered-page';
import { CARD_PAGE_SIZE } from '../../../lib/pagination';
import { single } from '../../../lib/search-params';
import { getSession } from '../../../lib/request-session';
import { viewerIfSignedIn } from '../../../lib/viewer';
import { heldCompendiumEntryIds } from '../../../modules/ingredients';
import CompendiumDialog from '../../(shell)/admin/compendium/compendium-dialog';
import { readCompendiumEntry } from '../../(shell)/admin/compendium/read-entry';
import { readEditPlace } from '../../(shell)/admin/list-page';
import MissingNotice from '../../(shell)/admin/missing-notice';
import {
  readCardCategories,
  readCategories,
  readCompendium,
  readDeities,
  readFacets,
  readFormIcons,
} from '../../compendium-reads';
import type { PublicCompendiumPageProps, PublicCompendiumSearchParams } from './types';

// The compendium, for anyone (M8.18; MB.80): readable signed out and indexable. The (public)
// layout owns `<main>`, so this renders none. The list is drawn per request, over the cached
// reads (`readCompendium` and the rest take no session), so every card and every link is in
// the server HTML. The viewer is asked only for the foot of each card, and never redirects.
//
// A curator (`canCurate`) also gets Edit on each card, which opens the compendium's edit dialog
// over the results from `?edit=<slug>`, the admin Compendium's, and closes back to the same
// search (M8.17). Only once the viewer is known to curate is `?edit=` read at all: for anyone
// else it opens nothing and reads nothing. The list's reads stay the cached, sessionless ones,
// keyed by the address alone, whoever asks (rule 6).
//
// The address carries the admin list's filters, bar two: No Refs and No Form are the curators'
// to-do lists, so `?withoutReferences=1` and `?withoutForms=1` are dropped before the table
// reads them, and list what the unfiltered page lists.

/** The address as the table reads it: with the curators' own filter taken out. */
const publicParams = (params: PublicCompendiumSearchParams): PublicCompendiumSearchParams => {
  const { withoutReferences: _refs, withoutForms: _forms, ...rest } = params;
  return rest;
};

const LIST_DESCRIPTION =
  'Browse the Sorrel & Salt compendium of ingredients for spellwork: formal and folk names, categories, deities, forms and sources.';

/** Whether the address narrows the list, once the curators' own filters are dropped. */
const isFiltered = (params: PublicCompendiumSearchParams) =>
  JSON.stringify(COMPENDIUM_PARAMS.read(publicParams(params))) !==
  JSON.stringify(COMPENDIUM_PARAMS.read({}));

/**
 * A filtered view is a thin copy of the page: kept out of search results, with the unfiltered
 * page as the canonical address. The unfiltered list, and its pages, stay indexable. Every
 * view names the bare address as canonical: a canonical never carries a query string, and
 * the sitemap reaches each entry the later pages list.
 */
export async function generateMetadata({
  searchParams,
}: PublicCompendiumPageProps): Promise<Metadata> {
  const filtered = isFiltered(await searchParams);
  return {
    ...publicPageMetadata('Compendium', LIST_DESCRIPTION, PUBLIC_COMPENDIUM_PATH),
    ...(filtered && { robots: { index: false, follow: true } }),
  };
}

/**
 * Which of these entries the coven already holds. Per viewer, so read here and never inside the
 * cached compendium read (rule 6). A refusal reads as nothing held: the plus is then offered,
 * and the add itself says no.
 */
async function heldEntryIds(workspaceId: string, ids: readonly string[]) {
  const session = await getSession();
  if (!session) return new Set<string>();
  try {
    return await heldCompendiumEntryIds(session, workspaceId, ids);
  } catch (error) {
    if (error instanceof Forbidden) return new Set<string>();
    throw error;
  }
}

export default async function CompendiumPage({ searchParams }: PublicCompendiumPageProps) {
  const params = publicParams(await searchParams);
  const filter: CompendiumListFilter = COMPENDIUM_PARAMS.read(params);
  const { after, before } = readPageCursors(params);

  // The address names categories and deities by slug; the compendium filters by id.
  const [categories, deities] = await Promise.all([readCategories(), readDeities()]);
  const lookups = {
    categories: new Map(categories.map(({ slug, id }) => [slug, id])),
    deities: new Map(deities.map(({ slug, id }) => [slug, id])),
  };
  const variables = JSON.stringify(COMPENDIUM_PARAMS.variables(filter, lookups));
  const [page, counts, formIcons, viewer] = await Promise.all([
    readCompendium(variables, after, before, CARD_PAGE_SIZE),
    readFacets(variables),
    readFormIcons(),
    viewerIfSignedIn(),
  ]);
  // After the viewer, so an address with `?edit=` reads nothing for anyone who cannot curate.
  const canEdit = viewer?.viewer.canCurate === true;
  const { edited, missing } = canEdit
    ? await readEditPlace({ adding: false, editSlug: single(params.edit) }, readCompendiumEntry)
    : { edited: undefined, missing: false };
  const here = { ...filter, after, before };
  const hereWith = (edit: string) => compendiumHref(here, { edit }, PUBLIC_COMPENDIUM_PATH);
  // An old address opens the entry at its new one, keeping the search (MB.82).
  if (edited?.kind === 'moved') redirect(hereWith(edited.slug));
  const editing = edited?.kind === 'entry' ? edited : undefined;
  const chips = await readCardCategories(page.edges.map(({ node }) => node.id));
  const facets = compendiumFacetCounts(counts, {
    formIcons,
    deities: new Map(deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  });
  // Who may add, and to which coven: a role that may create an ingredient and stock it
  // (`canWrite`, set in `viewerFor` from the per-role statement). The compendium names no coven
  // in its address, so the coven is M8.16's choice for a page without one: the first the viewer
  // may write in. A viewer-only account has none, and neither has a visitor with no account, who
  // signs in through the header.
  const writable = viewer?.workspaces.find(({ canWrite }) => canWrite);
  const held = writable
    ? await heldEntryIds(
        writable.id,
        page.edges.map(({ node }) => node.id),
      )
    : undefined;
  const entries = page.edges.map(({ node }, i): CompendiumCardEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    canonicalName: node.canonicalName,
    nomenclature: node.nomenclature,
    categories: chips[i],
    variants: page.variants[i],
    toxic: node.toxic,
    safetyNotes: node.safetyNotes,
    recency: entryRecency(node.createdAt, node.updatedAt),
    ...(writable && {
      held: held?.has(node.id) === true,
      heldHref: covenIngredientsHref(writable.slug, { query: node.name }),
    }),
    ...(canEdit && {
      editHref: hereWith(node.slug),
      editHeading: editHeading(node, EDIT_ENTRY_EYEBROW),
    }),
  }));

  const action = writable ? 'add' : 'none';

  return (
    // Holds a pressed Edit's opening, as the admin layout does; a plain wrapper for anyone else.
    <RouteModalProvider>
      {!isFiltered(params) && (
        <script
          type="application/ld+json"
          // Our own serialiser's output, with `<` escaped (src/lib/json-ld.ts).
          dangerouslySetInnerHTML={{ __html: listJsonLd() }}
        />
      )}
      <PageHeader title="Compendium" />
      {missing && <MissingNotice noun="compendium entry" />}
      <CompendiumCards
        entries={entries}
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={{ deities, formIcons: Object.fromEntries(formIcons) }}
        position={page.position}
        total={page.totalCount}
        action={action}
        workspaceId={writable?.id}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          compendiumHref({ ...filter, ...cursor }, undefined, PUBLIC_COMPENDIUM_PATH),
        )}
      />
      {canEdit && (
        // Rendered for a curator whatever the address opens, so Edit opens it at once (M9.18).
        <CompendiumDialog
          place={here}
          path={PUBLIC_COMPENDIUM_PATH}
          opened={
            editing && {
              heading: editHeading(editing.values, EDIT_ENTRY_EYEBROW),
              entry: { id: editing.id, values: editing.values },
            }
          }
        />
      )}
    </RouteModalProvider>
  );
}
