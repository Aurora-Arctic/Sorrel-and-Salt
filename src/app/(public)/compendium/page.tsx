import type { Metadata, Route } from 'next';
import CompendiumCards from '../../../components/CompendiumCards';
import type { CompendiumCardEntry } from '../../../components/CompendiumCards/types';
import { compendiumFacetCounts } from '../../../components/CompendiumList/facets';
import { PUBLIC_COMPENDIUM_PATH, compendiumHref } from '../../../components/CompendiumList/href';
import { COMPENDIUM_PARAMS } from '../../../components/CompendiumList/params';
import type { CompendiumListFilter } from '../../../components/CompendiumList/types';
import PageHeader from '../../../components/PageHeader';
import { pagerHrefs } from '../../../lib/list-href';
import { readPageCursors } from '../../../lib/numbered-page';
import { signInPath } from '../../../lib/sign-in';
import { viewerIfSignedIn } from '../../../lib/viewer';
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
// The address carries the admin list's filters, bar one: No Refs is the curators' to-do list,
// so `?withoutReferences=1` is dropped before the table reads it, and lists what the
// unfiltered page lists.

/** The address as the table reads it: with the curators' own filter taken out. */
const publicParams = (params: PublicCompendiumSearchParams): PublicCompendiumSearchParams => {
  const { withoutReferences: _dropped, ...rest } = params;
  return rest;
};

/**
 * A filtered view is a thin copy of the page: kept out of search results, with the unfiltered
 * page as the canonical address. The unfiltered list, and its pages, stay indexable.
 */
export async function generateMetadata({
  searchParams,
}: PublicCompendiumPageProps): Promise<Metadata> {
  const filter = COMPENDIUM_PARAMS.read(publicParams(await searchParams));
  const filtered = JSON.stringify(filter) !== JSON.stringify(COMPENDIUM_PARAMS.read({}));
  return {
    title: 'Compendium',
    ...(filtered && {
      robots: { index: false, follow: true },
      alternates: { canonical: PUBLIC_COMPENDIUM_PATH },
    }),
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
  const [page, counts, formIcons, viewer] = await Promise.all([
    readCompendium(variables, after, before),
    readFacets(variables),
    readFormIcons(),
    viewerIfSignedIn(),
  ]);
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
  }));

  // Who may add: a role that may create an ingredient and stock it (`canWrite`, set in
  // `viewerFor` from the per-role statement), in at least one coven. A viewer-only account has
  // none, and a visitor with no account is sent to sign in and back here.
  const here = compendiumHref({ ...filter, after, before }, undefined, PUBLIC_COMPENDIUM_PATH);
  const action = !viewer
    ? 'sign-in'
    : viewer.workspaces.some(({ canWrite }) => canWrite)
      ? 'add'
      : 'none';

  return (
    <>
      <PageHeader title="Compendium" />
      <CompendiumCards
        entries={entries}
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={{ deities, formIcons: Object.fromEntries(formIcons) }}
        position={page.position}
        total={page.totalCount}
        action={action}
        signInHref={signInPath(here) as Route}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          compendiumHref({ ...filter, ...cursor }, undefined, PUBLIC_COMPENDIUM_PATH),
        )}
      />
    </>
  );
}
