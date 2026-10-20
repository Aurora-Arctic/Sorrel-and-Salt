import type { Metadata } from 'next';
import CovenCards from '../../../../../components/CovenCards';
import type { CovenCardEntry } from '../../../../../components/CovenCards/types';
import { covenFacetCounts } from '../../../../../components/CompendiumList/facets';
import { covenIngredientsHref } from '../../../../../components/CompendiumList/href';
import type { CovenListFilter } from '../../../../../components/CompendiumList/types';
import { COVEN_PARAMS } from '../../../../../components/IngredientSearch/coven-params';
import type { JarLine } from '../../../../../components/JarLines/types';
import { detailsHeading } from '../../../../../components/IngredientEntry/details';
import PageHeader from '../../../../../components/PageHeader';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readPageCursors } from '../../../../../lib/numbered-page';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { readCategories, readDeities, readFormIcons } from '../../../../compendium-reads';
import { readCovenFacets, readCovenIngredients } from './reads';
import type { CovenIngredientsParams } from './types';
import { rolePermits } from '@/modules/coven';
import { applyCupboardEntry, isAnnotated, isRetired } from '@/modules/ingredients';

// A coven's Ingredients (M9.6): what the coven has, as compact cards with their jars. The coven
// comes from the address and the guard proves the caller is in it, as on every coven page (a
// non-member gets the 404). Read per request and never cached, since a cupboard is the coven's
// alone (CLAUDE.md rule 6). The shell draws no `<main>`, so the page does. The address carries
// the compendium list's filters plus Source, In Stock and Low Stock Only (`COVEN_PARAMS`), and
// the page reads one page of 24 under them. A
// member who may add is offered the first add on an empty cupboard (M9.11). claude-docs/components/coven-cards.md.

export const metadata: Metadata = { title: 'Ingredients' };

export default async function CovenIngredientsPage({
  params,
  searchParams,
}: CovenIngredientsParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const query = await searchParams;
  const filter: CovenListFilter = COVEN_PARAMS.read(query);
  const { after, before } = readPageCursors(query);

  // The address names categories and deities by slug; the service filters by id.
  const [categories, deities] = await Promise.all([readCategories(), readDeities()]);
  const lookups = {
    categories: new Map(categories.map(({ slug, id }) => [slug, id])),
    deities: new Map(deities.map(({ slug, id }) => [slug, id])),
  };
  const variables = JSON.stringify(COVEN_PARAMS.variables(filter, lookups));
  const [page, counts, formIcons] = await Promise.all([
    readCovenIngredients(workspace.id, variables, after, before, membership),
    readCovenFacets(workspace.id, variables),
    readFormIcons(),
  ]);
  const facets = covenFacetCounts(counts, {
    formIcons,
    deities: new Map(deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  });

  const entries = page.edges.map(({ node, cupboardEntry }, i): CovenCardEntry => {
    // The coven's own label and overrides stand over the compendium's.
    const shown = applyCupboardEntry(node, cupboardEntry);
    return {
      id: node.id,
      label: shown.name,
      details: {
        href: covenIngredientsHref(workspace.slug, { ...filter, after, before, entry: node.id }),
        heading: detailsHeading(shown),
      },
      canonicalName: shown.canonicalName,
      nomenclature: shown.nomenclature,
      categories: page.categories[i],
      variants: page.variants[i],
      toxic: shown.toxic,
      safetyNotes: shown.safetyNotes,
      kind: node.workspaceId !== null ? 'own' : 'cupboard',
      annotated: cupboardEntry !== null && isAnnotated(cupboardEntry),
      retired: isRetired(node),
      jars: page.jars[i].flatMap((jar): JarLine[] => {
        const form = page.formOf.get(jar.variantId);
        // A jar whose form is gone from the page was removed between the two reads.
        if (form === undefined) return [];
        return [
          {
            id: jar.id,
            form,
            icon: formIcons.get(form.toLocaleLowerCase()) ?? null,
            quantity: jar.quantityOnHand === null ? null : Number(jar.quantityOnHand),
            unit: jar.unit,
            threshold: jar.lowStockThreshold === null ? null : Number(jar.lowStockThreshold),
          },
        ];
      }),
    };
  });

  return (
    <main>
      <PageHeader title="Ingredients" />
      <CovenCards
        covenSlug={workspace.slug}
        workspaceId={workspace.id}
        entries={entries}
        filter={filter}
        facets={facets}
        categories={categories}
        vocabulary={{ deities, formIcons: Object.fromEntries(formIcons) }}
        position={page.position}
        total={page.totalCount}
        canAdd={rolePermits(membership.role, { ingredient: ['create'], inventory: ['update'] })}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          covenIngredientsHref(workspace.slug, { ...filter, ...cursor }),
        )}
      />
    </main>
  );
}
