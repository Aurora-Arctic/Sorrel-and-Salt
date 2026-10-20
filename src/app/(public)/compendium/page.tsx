import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import CompendiumCards from '../../../components/CompendiumCards';
import type { CompendiumCardEntry } from '../../../components/CompendiumCards/types';
import { editHeading } from '../../../components/CompendiumList/heading';
import { compendiumFacetCounts } from '../../../components/CompendiumList/facets';
import { PUBLIC_COMPENDIUM_PATH, compendiumHref } from '../../../components/CompendiumList/href';
import { COMPENDIUM_PARAMS } from '../../../components/CompendiumList/params';
import type { CompendiumListFilter } from '../../../components/CompendiumList/types';
import { detailsHeading } from '../../../components/IngredientEntry/details';
import DetailsDialog from '../../../components/IngredientEntry/details-dialog';
import { EDIT_ENTRY_EYEBROW } from '../../../components/IngredientEntry/edit-heading';
import IngredientSummary from '../../../components/IngredientEntry/summary';
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import PageHeader from '../../../components/PageHeader';
import { listJsonLd } from '../../../lib/json-ld';
import { publicPageMetadata } from '../../../lib/page-metadata';
import { entryRecency } from '../../../lib/entry-recency';
import { pagerHrefs } from '../../../lib/list-href';
import { readPageCursors } from '../../../lib/numbered-page';
import { CARD_PAGE_SIZE } from '../../../lib/pagination';
import { single } from '../../../lib/search-params';
import { viewerIfSignedIn } from '../../../lib/viewer';
import CompendiumDialog from '../../(shell)/admin/compendium/compendium-dialog';
import { readCompendiumEntry } from '../../(shell)/admin/compendium/read-entry';
import { readEditPlace } from '../../(shell)/admin/list-page';
import MissingNotice from '../../(shell)/admin/missing-notice';
import {
  readCardCategories,
  readCategories,
  readCompendium,
  readCompendiumDetails,
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
//
// Each card's Quick Look, for anyone, opens the entry's details over the results from
// `?entry=<id>` (M12.5), read by id with no session through the public entry page's cached read,
// so the compendium as the compendium has it, with no coven's label, annotations or held
// state. An id that names no compendium entry, a coven's own included, opens nothing and says
// nothing: the page is the page without it. A curator's Edit in the details opens the edit
// dialog over them, and closes back to them.

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
  const entryId = single(params.entry);
  const [page, counts, formIcons, viewer, shown] = await Promise.all([
    readCompendium(variables, after, before, CARD_PAGE_SIZE),
    readFacets(variables),
    readFormIcons(),
    viewerIfSignedIn(),
    entryId ? readCompendiumDetails(entryId) : undefined,
  ]);
  // After the viewer, so an address with `?edit=` reads nothing for anyone who cannot curate.
  const canEdit = viewer?.viewer.canCurate === true;
  const { edited, missing } = canEdit
    ? await readEditPlace({ adding: false, editSlug: single(params.edit) }, readCompendiumEntry)
    : { edited: undefined, missing: false };
  // The search as it stands, no modal over it: where the details close to, and what each
  // card's Edit and Quick Look open over.
  const list = { ...filter, after, before };
  // The search with the details open, which an edit dialog opens over and closes back to.
  const here = { ...list, entry: shown ? entryId : undefined };
  const hereWith = (edit: string) => compendiumHref(here, { edit }, PUBLIC_COMPENDIUM_PATH);
  const listWith = (edit: string) => compendiumHref(list, { edit }, PUBLIC_COMPENDIUM_PATH);
  const detailed = shown?.entry;
  // An old address opens the entry at its new one, keeping the search (MB.82).
  if (edited?.kind === 'moved') redirect(hereWith(edited.slug));
  const editing = edited?.kind === 'entry' ? edited : undefined;
  const chips = await readCardCategories(page.edges.map(({ node }) => node.id));
  const facets = compendiumFacetCounts(counts, {
    formIcons,
    deities: new Map(deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  });
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
    details: {
      href: compendiumHref({ ...list, entry: node.id }, undefined, PUBLIC_COMPENDIUM_PATH),
      heading: detailsHeading(node),
    },
    ...(canEdit && {
      editHref: listWith(node.slug),
      editHeading: editHeading(node, EDIT_ENTRY_EYEBROW),
    }),
  }));

  // Who may add: a role that may create an ingredient and stock it (`canWrite`, set in
  // `viewerFor` from the per-role statement), in at least one coven. A viewer-only account has
  // none, and neither has a visitor with no account, who signs in through the header.
  const action = viewer?.workspaces.some(({ canWrite }) => canWrite) ? 'add' : 'none';

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
        {...pagerHrefs(page.pageInfo, (cursor) =>
          compendiumHref({ ...filter, ...cursor }, undefined, PUBLIC_COMPENDIUM_PATH),
        )}
      />
      {/* The details a Quick Look opens, in their own place beneath the edit dialog's, so a
          curator's Edit in them opens over them (M12.5). */}
      <DetailsDialog
        closeHref={compendiumHref(list, undefined, PUBLIC_COMPENDIUM_PATH)}
        opened={
          shown &&
          detailed && {
            heading: detailsHeading(detailed),
            pageHref: `/compendium/ingredients/${detailed.slug}` as Route,
            ...(canEdit && {
              editAction: {
                href: hereWith(detailed.slug),
                heading: editHeading(detailed, EDIT_ENTRY_EYEBROW),
              },
            }),
            children: <IngredientSummary detail={shown} />,
          }
        }
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
