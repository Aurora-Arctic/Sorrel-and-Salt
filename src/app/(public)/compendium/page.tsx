import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import CompendiumCards from '../../../components/CompendiumCards';
import CompendiumCardMore from '../../../components/CompendiumCards/card-more';
import type { CompendiumCardEntry } from '../../../components/CompendiumCards/types';
import { editHeading } from '../../../components/CompendiumList/heading';
import { compendiumFacetCounts } from '../../../components/CompendiumList/facets';
import { PUBLIC_COMPENDIUM_PATH, compendiumHref } from '../../../components/CompendiumList/href';
import { COMPENDIUM_PARAMS } from '../../../components/CompendiumList/params';
import type { CompendiumListFilter } from '../../../components/CompendiumList/types';
import { cardName } from '../../../components/IngredientCard/card-name';
import { detailsHeading, detailsMarks } from '../../../components/IngredientEntry/details';
import DetailsDialog from '../../../components/IngredientEntry/details-dialog';
import { EDIT_ENTRY_EYEBROW } from '../../../components/IngredientEntry/edit-heading';
import IngredientSummary from '../../../components/IngredientEntry/summary';
import { RouteModalProvider } from '../../../components/Modal/route-modal-provider';
import { Forbidden, NotFound } from '../../../lib/errors';
import { listJsonLd } from '../../../lib/json-ld';
import { publicPageMetadata } from '../../../lib/page-metadata';
import { entryRecency } from '../../../lib/entry-recency';
import { pagerHrefs } from '../../../lib/list-href';
import { readPageCursors } from '../../../lib/numbered-page';
import { CARD_PAGE_SIZE } from '../../../lib/pagination';
import { single } from '../../../lib/search-params';
import ReviewMark from '../../../components/IngredientEntry/review-mark';
import { getSession } from '../../../lib/request-session';
import { viewerIfSignedIn } from '../../../lib/viewer';
import { heldCompendiumEntryIdsIn, readCompendiumReview } from '../../../modules/ingredients';
import { covensHolding, plusCovensOf } from '../../plus-covens';
import CompendiumDialog from '../../(shell)/admin/compendium/compendium-dialog';
import { readEntryStock, stockKey } from '../../entry-stock';
import { cardPlacesOf, readCardCovens } from './card-places';
import { readCompendiumEntry } from '../../(shell)/admin/compendium/read-entry';
import { readEditPlace } from '../../(shell)/admin/list-page';
import MissingNotice from '../../(shell)/admin/missing-notice';
import {
  readCardCategories,
  readCategories,
  readCompendium,
  readCompendiumDetails,
  readCompendiumHeldIn,
  readDeities,
  readFacets,
  readFacetsHeldIn,
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
// The address carries the admin list's filters, bar three: No Refs, No Form and Reviewed are the
// curators' to-do lists, so `?withoutReferences=1`, `?withoutForms=1` and `?reviewed=` (M14.8)
// are dropped before the table reads them, and list what the unfiltered page lists. The services
// refuse a review filter from anyone who does not curate, so dropping it here is what keeps the
// page from failing on one.
//
// In My Covens (M12.55) narrows the list to the entries the viewer's picked covens hold, any
// role, and Not In (`?covensNot=1`) to the entries none of them holds, or with none picked none
// of the viewer's covens. Only then, and only with a session, are the list and its counts read
// through the uncached held-in reads, which prove each coven and drop the rest, and read cached
// when every one is dropped; with neither, and for a visitor whatever the address says, the
// reads are the cached ones above. Each card's plus or check also
// counts and names every coven of the viewer's that holds the entry, the ones they only view too.
//
// Each card's Quick Look, for anyone, opens the entry's details over the results from
// `?entry=<id>` (M12.5), read by id with no session through the public entry page's cached read,
// so the compendium as the compendium has it, with no coven's label, annotations or held
// state. An id that names no compendium entry, a coven's own included, opens nothing and says
// nothing: the page is the page without it. A curator's Edit in the details opens the edit
// dialog over them, and closes back to them.

/** The address as the table reads it: with the curators' own filter taken out. */
const publicParams = (params: PublicCompendiumSearchParams): PublicCompendiumSearchParams => {
  const { withoutReferences: _refs, withoutForms: _forms, reviewed: _reviewed, ...rest } = params;
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
 * Which of these entries each of the viewer's covens already holds, by coven id. Per
 * viewer, so read here and never inside the cached compendium read (rule 6). A refusal reads as
 * nothing held: the plus is then offered, and the add itself says no.
 */
async function heldEntryIds(workspaceIds: readonly string[], ids: readonly string[]) {
  const session = await getSession();
  if (!session) return new Map<string, ReadonlySet<string>>();
  try {
    return await heldCompendiumEntryIdsIn(session, workspaceIds, ids);
  } catch (error) {
    if (error instanceof Forbidden) return new Map<string, ReadonlySet<string>>();
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
  const entryId = single(params.entry);
  // A coven picked under In My Covens, or Not In, by someone signed in: the reads narrowed to it.
  const session = filter.covens.length > 0 || filter.covensNot ? await getSession() : null;
  const [page, counts, formIcons, viewer, shown] = await Promise.all([
    session
      ? readCompendiumHeldIn(session, variables, after, before, CARD_PAGE_SIZE)
      : readCompendium(variables, after, before, CARD_PAGE_SIZE),
    session ? readFacetsHeldIn(session, variables) : readFacets(variables),
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
  // The viewer's own covens that hold the open entry, for the details' links (M12.5) and its plus
  // (M9.12): the one held read, per request and never inside the cached details read (rule 6).
  const holding = detailed ? await covensHolding(detailed.id) : [];
  const detailsPlus = detailed ? await plusCovensOf(holding) : undefined;
  // An old address opens the entry at its new one, keeping the search (MB.82).
  if (edited?.kind === 'moved') redirect(hereWith(edited.slug));
  const editing = edited?.kind === 'entry' ? edited : undefined;
  // The review switch (M14.8), for a curator or admin only: a per-viewer read with their session,
  // never inside the cached reads, and not made at all for a visitor or anyone else, so no review
  // date reaches them from here. The entry's own badge is in the cached read, for everyone.
  const reviewOf = async (id: string | undefined) => {
    if (!canEdit || !id) return undefined;
    const curator = await getSession();
    if (!curator) return undefined;
    try {
      const review = await readCompendiumReview(curator, id);
      return { reviewedAt: review?.reviewedAt.toISOString() ?? null };
    } catch (error) {
      if (error instanceof Forbidden || error instanceof NotFound) return undefined;
      throw error;
    }
  };
  // Nothing is awaited for anyone who cannot curate.
  const [detailsReview, editReview] =
    canEdit && (detailed || editing)
      ? await Promise.all([reviewOf(detailed?.id), reviewOf(editing?.id)])
      : [undefined, undefined];
  const chips = await readCardCategories(page.edges.map(({ node }) => node.id));
  const facets = compendiumFacetCounts(counts, {
    formIcons,
    deities: new Map(deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  });
  // Who may add, and to which covens: a role that may create an ingredient and stock it
  // (`canWrite`, set in `viewerFor` from the per-role statement). The compendium names no coven
  // in its address, so the default is M8.16's choice for a page without one: the first the viewer
  // may write in, which the plus adds to at once when it is the only one, and which the picker
  // starts on when there are several. A viewer-only account has none, and neither has a visitor
  // with no account, who signs in through the header.
  // Every coven of the viewer's, any role, for In My Covens and the count on each plus (M12.55).
  const mine = viewer?.workspaces.map(({ id, name }) => ({ id, name })) ?? [];
  const writable = viewer?.workspaces.filter(({ canWrite }) => canWrite) ?? [];
  const covens = writable.map(({ id, name }) => ({ id, name }));
  const defaultCoven = writable[0];
  // What the role in each of those covens permits, for the three dots on the cards and in the
  // window: one read, per request, for both, and none for a visitor or a viewer.
  const cardCovens = defaultCoven ? await readCardCovens(writable) : [];
  // Asked of every coven, not only the writable ones, for the holding count; read only where
  // there is a plus or a check to count on.
  const held = defaultCoven
    ? await heldEntryIds(
        mine.map(({ id }) => id),
        page.edges.map(({ node }) => node.id),
      )
    : undefined;
  // The stock Edit Stock opens with (the owner's call, 2026-10-21): the forms and jars of each
  // entry a coven holds where its role may update stock, for the cards and the open entry
  // together. One read per service for the whole page, per viewer (rule 6).
  const stockers = new Set(cardCovens.filter(({ canStock }) => canStock).map((c) => c.workspaceId));
  const stock = await readEntryStock([
    ...page.edges.flatMap(({ node }) =>
      [...stockers]
        .filter((id) => held?.get(id)?.has(node.id) === true)
        .map((workspaceId) => ({ ingredientId: node.id, workspaceId })),
    ),
    ...(detailed
      ? holding
          .filter(({ id }) => stockers.has(id))
          .map(({ id }) => ({ ingredientId: detailed.id, workspaceId: id }))
      : []),
  ]);
  const stockIn = (entryId: string) => (workspaceId: string) =>
    stock.get(stockKey(workspaceId, entryId));
  const detailsPlaces = detailed
    ? cardPlacesOf(
        cardCovens,
        (id) => holding.some((coven) => coven.id === id),
        `/compendium/ingredients/${detailed.slug}`,
        stockIn(detailed.id),
      )
    : [];
  const entries = page.edges.map(({ node }, i): CompendiumCardEntry => {
    const heldIn = writable.filter(({ id }) => held?.get(id)?.has(node.id)).map(({ id }) => id);
    return {
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
      // The check shows only where every coven holds it (a mark, not a link: the owner’s call,
      // 2026-10-20).
      ...(defaultCoven && {
        held: heldIn.length === writable.length,
        heldIn,
        holding: mine.filter(({ id }) => held?.get(id)?.has(node.id)).map(({ name }) => name),
      }),
      // The three dots: the covens that hold it and let the viewer annotate, make it theirs or
      // remove it. None for a visitor, a viewer and a coven without the entry.
      places: cardPlacesOf(
        cardCovens,
        (id) => held?.get(id)?.has(node.id) === true,
        `/compendium/ingredients/${node.slug}`,
        stockIn(node.id),
      ),
      ...(canEdit && {
        editHref: listWith(node.slug),
        editHeading: editHeading(node, EDIT_ENTRY_EYEBROW),
      }),
    };
  });

  const action = defaultCoven ? 'add' : 'none';

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
      {/* A head as the coven pages carry (MB.119): the eyebrow names the section, the lede says
          what it is for. A `header` inside `main` is no banner landmark, and takes the layout's
          space beneath it (signed off in MB.120, 2026-10-20). */}
      <header className="header">
        <p className="eyebrow">Reference</p>
        <h1>Compendium</h1>
        <p className="lede">
          Ingredients for spellwork: their formal and folk names, categories, deities and forms,
          with the sources behind them.
        </p>
      </header>
      {missing && <MissingNotice noun="compendium entry" />}
      <CompendiumCards
        entries={entries}
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={{ deities, formIcons: Object.fromEntries(formIcons) }}
        position={page.position}
        total={page.totalCount}
        cursor={{ after, before }}
        action={action}
        workspaceId={defaultCoven?.id}
        covens={covens}
        myCovens={mine}
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
            marks: detailsMarks(shown),
            pageHref: `/compendium/ingredients/${detailed.slug}` as Route,
            ...(detailsPlus && { plus: detailsPlus, ingredientId: detailed.id }),
            ...(detailsReview && {
              reviewLine: (
                <ReviewMark ingredientId={detailed.id} reviewedAt={detailsReview.reviewedAt} />
              ),
            }),
            ...(canEdit && {
              editAction: {
                href: hereWith(detailed.slug),
                name: cardName(detailed.name, detailed.canonicalName),
                heading: editHeading(detailed, EDIT_ENTRY_EYEBROW),
                inCompendium: true,
              },
            }),
            // The card's three dots, from the same component, so the window mirrors the card.
            ...(detailsPlaces.length > 0 && {
              more: (
                <CompendiumCardMore
                  id={detailed.id}
                  label={detailed.name}
                  name={cardName(detailed.name, detailed.canonicalName)}
                  places={detailsPlaces}
                  leaveHref={compendiumHref(list, undefined, PUBLIC_COMPENDIUM_PATH)}
                />
              ),
            }),
            children: <IngredientSummary detail={shown} covens={holding} />,
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
              ...(editReview && {
                review: {
                  reviewed: editReview.reviewedAt !== null,
                  reviewedAt: editReview.reviewedAt,
                },
              }),
            }
          }
        />
      )}
    </RouteModalProvider>
  );
}
