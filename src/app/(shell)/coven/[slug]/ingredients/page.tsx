import { covenAccessOf } from '@/lib/coven-access';
import { covenPath } from '@/lib/coven-path';
import { amountOf } from '@/lib/quantity';
import { single } from '@/lib/search-params';
import type { Metadata, Route } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import CovenCards from '../../../../../components/CovenCards';
import { covenCardActions } from '../../../../../components/CovenCards/actions';
import type { CovenCardEntry } from '../../../../../components/CovenCards/types';
import { editHeading } from '../../../../../components/CompendiumList/heading';
import { covenIngredientsHref } from '../../../../../components/CompendiumList/href';
import type {
  CovenListDialog,
  CovenListFilter,
} from '../../../../../components/CompendiumList/types';
import { cupboardFormValues } from '../../../../../components/CupboardEntryForm/entry-values';
import AnnotateDialog from '../../../../../components/IngredientEntry/annotate-dialog';
import EntryDialog from '../../../../../components/IngredientEntry/entry-dialog';
import { categoryRefs } from '../../../../../components/IngredientCard/category-refs';
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
import AddIngredientAction from './add-ingredient-action';
import { readCovenFacets, readCovenIngredients, readEditedEntry, readViewedEntry } from './reads';
import { viewedDetailsOf } from './viewed-details';
import type { CovenIngredientsParams } from './types';
import { applyCupboardEntry, heldCompendiumEntry, isRetired } from '@/modules/ingredients';
import { stockDialogOf } from '@/app/coven-stock';

// A coven's Ingredients: compact cards with their jars. Per request, never cached (rule 6). The page
// draws its own `<main>` and is its own RouteModalProvider; one page of 24 is read under `COVEN_PARAMS`.
// Card actions and Quick Look: claude-docs/components/coven-cards.md.

export const metadata: Metadata = pageTitle('Ingredients');

export default async function CovenIngredientsPage({
  params,
  searchParams,
}: CovenIngredientsParams) {
  const { slug } = await params;
  const { workspace, membership } = await requireCovenMembership(slug);
  const query = await searchParams;
  const filter: CovenListFilter = COVEN_PARAMS.read(query);
  const { after, before } = readPageCursors(query);
  const listHref = covenIngredientsHref(workspace.slug, { ...filter, after, before });
  const access = covenAccessOf(membership.role);
  const mayEdit = access.canUpdateIngredient;
  const entryId = single(query.entry) || undefined;
  const viewed = entryId ? await readViewedEntry(membership, entryId) : undefined;
  const here = { ...filter, after, before, entry: viewed ? entryId : undefined };
  const hereHref = covenIngredientsHref(workspace.slug, here);
  const editId = single(query.edit) || undefined;
  const edited = mayEdit && editId ? await readEditedEntry(workspace.id, editId) : undefined;
  const annotateId = single(query.annotate) || undefined;
  const annotated =
    mayEdit && annotateId ? await heldCompendiumEntry(membership, annotateId) : undefined;
  const mayDelete = access.canDeleteIngredient;
  const mayMakeOurs = access.canMakeOurs;
  const mayStock = access.canUpdateStock;
  const canAdd = access.canAddToCupboard;
  const placed = (dialog: CovenListDialog) =>
    covenIngredientsHref(workspace.slug, { ...filter, after, before }, dialog);
  const footOf = (
    own: boolean,
    shown: Parameters<typeof editHeading>[0] & { id: string },
    editHref: Route,
  ) => ({
    ...(own && mayEdit && { editHref, editHeading: editHeading(shown) }),
    ...(!own && mayEdit && { annotateHref: placed({ annotate: shown.id }) }),
    ...(!own && { mayMakeOurs, mayRemove: mayDelete }),
  });

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

  const entries = page.edges.map(({ node, cupboardEntry }, i): CovenCardEntry => {
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
      // By id: the cards read each category's name and colours from `categories`, sent once.
      categories: categoryRefs(page.categories[i]),
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
            quantity: amountOf(jar.quantityOnHand),
            unit: jar.unit,
            threshold: amountOf(jar.lowStockThreshold),
          },
        ];
      }),
    };
  });

  return (
    <RouteModalProvider>
      <main>
        <PageHeader
          title="Ingredients"
          action={canAdd ? <AddIngredientAction covenSlug={workspace.slug} /> : undefined}
        />
        <CovenCards
          covenSlug={workspace.slug}
          workspaceId={workspace.id}
          entries={entries}
          filter={filter}
          counts={counts}
          categories={categories}
          vocabulary={{ deities, formIcons: Object.fromEntries(formIcons) }}
          position={page.position}
          total={page.totalCount}
          cursor={{ after, before }}
          canAdd={canAdd}
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
              deletedHref: listHref,
              savedHref: hereHref,
              opened: edited && {
                id: edited.entry.id,
                values: edited.values,
                revision: edited.entry.revision,
                updatedAt: edited.entry.updatedAt.toISOString(),
              },
              coven: {
                workspaceId: workspace.id,
                ingredientsHref: covenPath(workspace.slug, 'ingredients'),
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
