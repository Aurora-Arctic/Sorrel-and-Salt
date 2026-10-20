import type { Metadata } from 'next';
import CovenCards from '../../../../../components/CovenCards';
import type { CovenCardEntry } from '../../../../../components/CovenCards/types';
import { covenFacetCounts } from '../../../../../components/CompendiumList/facets';
import { editHeading } from '../../../../../components/CompendiumList/heading';
import {
  covenIngredientsHref,
  covenIngredientsPath,
} from '../../../../../components/CompendiumList/href';
import type {
  CovenListDialog,
  CovenListFilter,
} from '../../../../../components/CompendiumList/types';
import { cupboardFormValues } from '../../../../../components/CupboardEntryForm/entry-values';
import AnnotateDialog from '../../../../../components/IngredientEntry/annotate-dialog';
import EntryDialog from '../../../../../components/IngredientEntry/entry-dialog';
import { COVEN_PARAMS } from '../../../../../components/IngredientSearch/coven-params';
import type { JarLine } from '../../../../../components/JarLines/types';
import PageHeader from '../../../../../components/PageHeader';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readPageCursors } from '../../../../../lib/numbered-page';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { readCategories, readDeities, readFormIcons } from '../../../../compendium-reads';
import { readCovenFacets, readCovenIngredients, readEditedEntry } from './reads';
import type { CovenIngredientsParams } from './types';
import { rolePermits } from '@/modules/coven';
import {
  applyCupboardEntry,
  heldCompendiumEntry,
  isAnnotated,
  isRetired,
  MAKE_IT_OURS_PERMISSION,
} from '@/modules/ingredients';

// A coven's Ingredients (M9.6): what the coven has, as compact cards with their jars. The coven
// comes from the address and the guard proves the caller is in it, as on every coven page (a
// non-member gets the 404). Read per request and never cached, since a cupboard is the coven's
// alone (CLAUDE.md rule 6). The shell draws no `<main>`, so the page does. The address carries
// the compendium list's filters plus Source, In Stock and Low Stock Only (`COVEN_PARAMS`), and
// the page reads one page of 24 under them. A member's card for the coven's own entry has
// Edit, which opens the entry page's dialog over the list under `?edit=<id>`, and a card
// for a compendium entry the cupboard holds has Annotate, which opens the entry page's
// Annotate dialog under `?annotate=<id>`; closing or saving either comes back to the list as
// it was, filter and page kept (M8.17). A member who may add is offered the first add on an
// empty cupboard (M9.11). claude-docs/components/coven-cards.md.

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
  // The list as it is, with no dialog: where the dialog closes and saves back to.
  const listHref = covenIngredientsHref(workspace.slug, { ...filter, after, before });
  const mayEdit = rolePermits(membership.role, { ingredient: ['update'] });
  const editId = typeof query.edit === 'string' && query.edit ? query.edit : undefined;
  // Read only for a role that may edit: a viewer's `?edit` opens nothing and reads nothing.
  const edited = mayEdit && editId ? await readEditedEntry(workspace.id, editId) : undefined;
  const annotateId =
    typeof query.annotate === 'string' && query.annotate ? query.annotate : undefined;
  // The same rule for Annotate, as the entry page's: a compendium entry the coven holds, a
  // retired one included; an own entry or one not held opens nothing.
  const annotated =
    mayEdit && annotateId ? await heldCompendiumEntry(membership, annotateId) : undefined;
  // A card's More (M8.17): Delete on the coven's own entry, Make It Ours and
  // Remove on a compendium entry, on the permissions their services assert.
  const mayDelete = rolePermits(membership.role, { ingredient: ['delete'] });
  const mayMakeOurs = rolePermits(membership.role, MAKE_IT_OURS_PERMISSION);
  const placed = (dialog: CovenListDialog) =>
    covenIngredientsHref(workspace.slug, { ...filter, after, before }, dialog);

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
    const own = node.workspaceId !== null;
    return {
      id: node.id,
      label: shown.name,
      canonicalName: shown.canonicalName,
      nomenclature: shown.nomenclature,
      categories: page.categories[i],
      variants: page.variants[i],
      toxic: shown.toxic,
      safetyNotes: shown.safetyNotes,
      kind: own ? 'own' : 'cupboard',
      ...(own &&
        mayEdit && {
          editHref: placed({ edit: node.id }),
          editHeading: editHeading(shown),
        }),
      ...(!own &&
        mayEdit && {
          annotateHref: placed({ annotate: node.id }),
        }),
      ...(own ? { mayDelete } : { mayMakeOurs, mayRemove: mayDelete }),
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
      {mayEdit && (
        <EntryDialog
          entry={edited?.entry}
          edit={{
            href: listHref,
            closeHref: listHref,
            // A save or a delete (M8.17) stays on the list, fetched again.
            deletedHref: listHref,
            savedHref: listHref,
            opened: edited && { id: edited.entry.id, values: edited.values },
            coven: {
              workspaceId: workspace.id,
              ingredientsHref: covenIngredientsPath(workspace.slug),
              mayPromote: mayEdit,
            },
          }}
        />
      )}
      {mayEdit && (
        <AnnotateDialog
          closeHref={listHref}
          opened={
            annotated && {
              workspaceId: workspace.id,
              ingredientId: annotated.entry.id,
              ...cupboardFormValues(annotated.entry, annotated.cupboardEntry),
            }
          }
          // Make It Ours and Remove in the dialog's More menu (M8.17), on the
          // permissions the entry page reads; a remove returns to this list.
          more={{
            covenSlug: workspace.slug,
            canMakeOurs: mayMakeOurs,
            canRemove: mayDelete,
          }}
        />
      )}
    </main>
  );
}
