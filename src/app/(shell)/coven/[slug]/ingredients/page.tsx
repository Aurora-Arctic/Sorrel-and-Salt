import type { Metadata, Route } from 'next';
import CovenCards from '../../../../../components/CovenCards';
import { covenCardActions } from '../../../../../components/CovenCards/actions';
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
import DetailsDialog from '../../../../../components/IngredientEntry/details-dialog';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../../../../../components/Modal/route-modal-provider';
import PageHeader from '../../../../../components/PageHeader';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readPageCursors } from '../../../../../lib/numbered-page';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { readCategories, readDeities, readFormIcons } from '../../../../compendium-reads';
import { detailsHeading } from '../../../../../components/IngredientEntry/details';
import { readCovenFacets, readCovenIngredients, readEditedEntry, readViewedEntry } from './reads';
import { viewedDetailsOf } from './viewed-details';
import type { CovenIngredientsParams } from './types';
import { rolePermits } from '@/modules/coven';
import {
  applyCupboardEntry,
  heldCompendiumEntry,
  isRetired,
  MAKE_IT_OURS_PERMISSION,
} from '@/modules/ingredients';
import { stockDialogOf } from '@/app/coven-stock';

// A coven's Ingredients: compact cards with their jars. Per request, never cached (rule 6). The page
// draws its own `<main>` and is its own RouteModalProvider; one page of 24 is read under `COVEN_PARAMS`.
// Card actions and Quick Look: claude-docs/components/coven-cards.md.

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
  // The entry whose details are open over the list, `?entry=<id>`: any member's, a viewer's too,
  // since the details only read.
  const entryId = typeof query.entry === 'string' && query.entry ? query.entry : undefined;
  const viewed = entryId ? await readViewedEntry(membership, entryId) : undefined;
  // The list with the details open, which an edit modal opens over and closes back to.
  const here = { ...filter, after, before, entry: viewed ? entryId : undefined };
  const hereHref = covenIngredientsHref(workspace.slug, here);
  const editId = typeof query.edit === 'string' && query.edit ? query.edit : undefined;
  // Read only for a role that may edit: a viewer's `?edit` opens nothing and reads nothing.
  const edited = mayEdit && editId ? await readEditedEntry(workspace.id, editId) : undefined;
  const annotateId =
    typeof query.annotate === 'string' && query.annotate ? query.annotate : undefined;
  // The same rule for Annotate, as the entry page's: a compendium entry the coven holds, a
  // retired one included; an own entry or one not held opens nothing.
  const annotated =
    mayEdit && annotateId ? await heldCompendiumEntry(membership, annotateId) : undefined;
  // A card's More: Delete on the coven's own entry, Make It Ours and Remove on a compendium entry,
  // on the permissions their services assert.
  const mayDelete = rolePermits(membership.role, { ingredient: ['delete'] });
  const mayMakeOurs = rolePermits(membership.role, MAKE_IT_OURS_PERMISSION);
  // The foot's Edit Stock pencil, on the permission `saveStock` asserts: none for a viewer.
  const mayStock = rolePermits(membership.role, { inventory: ['update'] });
  // A card's Edit and Annotate open over the list alone, never over details.
  const placed = (dialog: CovenListDialog) =>
    covenIngredientsHref(workspace.slug, { ...filter, after, before }, dialog);
  // What a card's foot may do to an entry, for the role. Quick Look draws the same through
  // `covenCardActions`; only its Edit opens over the details, `editHref`, not over the list.
  const footOf = (
    own: boolean,
    shown: Parameters<typeof editHeading>[0] & { id: string },
    editHref: Route,
  ) => ({
    ...(own && mayEdit && { editHref, editHeading: editHeading(shown) }),
    ...(!own && mayEdit && { annotateHref: placed({ annotate: shown.id }) }),
    ...(own ? { mayDelete } : { mayMakeOurs, mayRemove: mayDelete }),
  });

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
      kind: own ? 'own' : 'cupboard',
      ...footOf(own, { ...shown, id: node.id }, placed({ edit: node.id })),
      retired: isRetired(node),
      lastEdit: page.lastEdits[i],
      ...(mayStock && {
        stock: stockDialogOf(
          page.variantIds[i].map((id) => ({ id, form: page.formOf.get(id) ?? '' })),
          page.jars[i],
        ),
      }),
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
    <RouteModalProvider>
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
          cursor={{ after, before }}
          canAdd={rolePermits(membership.role, { ingredient: ['create'], inventory: ['update'] })}
          {...pagerHrefs(page.pageInfo, (cursor) =>
            covenIngredientsHref(workspace.slug, { ...filter, ...cursor }),
          )}
        />
        {/* The details Quick Look opens, in their own place beneath the edit modal's,
          so an Edit pressed in them opens over them. Edit only on the
          coven's own entry, for a role that may edit it. */}
        <DetailsDialog
          closeHref={listHref}
          opened={
            viewed && {
              ...viewedDetailsOf(viewed, workspace.slug),
              // The card's own controls for this entry: Edit over the details or Annotate, and
              // More or the bin, whose delete or remove goes back to the list, which closes them.
              actions: covenCardActions(
                {
                  id: viewed.shown.id,
                  label: viewed.shown.name,
                  canonicalName: viewed.shown.canonicalName,
                  ...footOf(
                    viewed.own,
                    viewed.shown,
                    covenIngredientsHref(workspace.slug, here, { edit: viewed.shown.id }),
                  ),
                  ...(mayStock && {
                    stock: stockDialogOf(
                      viewed.detail.variants.map(({ variant }) => variant),
                      viewed.jars,
                    ),
                  }),
                },
                workspace.id,
                workspace.slug,
                listHref,
              ),
            }
          }
        />
        {mayEdit && (
          <EntryDialog
            entry={edited?.entry}
            edit={{
              href: hereHref,
              closeHref: hereHref,
              // A save stays where the edit opened from, the list or the details over it, fetched
              // again; a delete goes back to the list, the details' entry gone.
              deletedHref: listHref,
              savedHref: hereHref,
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
            // Make It Ours and Remove in the dialog's More menu, on the permissions the entry page
            // reads; a remove returns to this list.
            more={{
              covenSlug: workspace.slug,
              canMakeOurs: mayMakeOurs,
              canRemove: mayDelete,
            }}
          />
        )}
      </main>
    </RouteModalProvider>
  );
}
