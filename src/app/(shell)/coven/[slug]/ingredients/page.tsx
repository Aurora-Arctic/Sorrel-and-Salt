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
import { detailsHeading, detailsMarks } from '../../../../../components/IngredientEntry/details';
import DetailsDialog from '../../../../../components/IngredientEntry/details-dialog';
import IngredientSummary from '../../../../../components/IngredientEntry/summary';
// From its own client file: the Modal index re-exports modules a server
// component cannot import.
import { RouteModalProvider } from '../../../../../components/Modal/route-modal-provider';
import PageHeader from '../../../../../components/PageHeader';
import { pagerHrefs } from '../../../../../lib/list-href';
import { readPageCursors } from '../../../../../lib/numbered-page';
import { requireCovenMembership } from '../../../../../lib/request-session';
import { readCategories, readDeities, readFormIcons } from '../../../../compendium-reads';
import { readCovenFacets, readCovenIngredients, readEditedEntry, readViewedEntry } from './reads';
import type { CovenIngredientsParams } from './types';
import { rolePermits } from '@/modules/coven';
import {
  applyCupboardEntry,
  heldCompendiumEntry,
  isRetired,
  MAKE_IT_OURS_PERMISSION,
} from '@/modules/ingredients';
import { stockDialogOf } from '@/app/coven-stock';

// A coven's Ingredients (M9.6): what the coven has, as compact cards with their jars. The coven
// comes from the address and the guard proves the caller is in it, as on every coven page (a
// non-member gets the 404). Read per request and never cached, since a cupboard is the coven's
// alone (CLAUDE.md rule 6). The shell draws no `<main>`, so the page does. The address carries
// the compendium list's filters plus Source, In Stock and Low Stock Only (`COVEN_PARAMS`), and
// the page reads one page of 24 under them. A member's card for the coven's own entry has
// Edit, which opens the entry page's dialog over the list under `?edit=<id>`, and a card
// for a compendium entry the cupboard holds has Annotate, which opens the entry page's
// Annotate dialog under `?annotate=<id>`; closing or saving either comes back to the list as
// it was, filter and page kept (M8.17). Each card's Quick Look opens the entry's details over
// the list under `?entry=<id>`, for any member, with an Edit on the coven's own entry for a
// role that may edit, opening the edit dialog over the details and saving back to them
// (M12.5). The page is its own RouteModalProvider, so each of these opens at once on a press,
// as the admin list's do. A member who may add is offered the first add on an
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
  // The entry whose details are open over the list, `?entry=<id>` (M12.5): any member's,
  // a viewer's too, since the details only read.
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
  // A card's More (M8.17): Delete on the coven's own entry, Make It Ours and
  // Remove on a compendium entry, on the permissions their services assert.
  const mayDelete = rolePermits(membership.role, { ingredient: ['delete'] });
  const mayMakeOurs = rolePermits(membership.role, MAKE_IT_OURS_PERMISSION);
  // The foot's Edit Stock pencil (M9.9), on the permission `saveStock` asserts: none for a viewer.
  const mayStock = rolePermits(membership.role, { inventory: ['update'] });
  // A card's Edit and Annotate open over the list alone, never over details.
  const placed = (dialog: CovenListDialog) =>
    covenIngredientsHref(workspace.slug, { ...filter, after, before }, dialog);
  // What a card's foot may do to an entry, for the role: Edit on the coven's own, Annotate on a
  // compendium entry the cupboard holds, and More's writes. The Quick Look window draws the very
  // same through `covenCardActions` (the owner's call, 2026-10-20); only its Edit opens over the
  // details, `editHref`, where the card's opens over the list.
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
          so an Edit pressed in them opens over them (M12.5). Edit only on the
          coven's own entry, for a role that may edit it. */}
        <DetailsDialog
          closeHref={listHref}
          opened={
            viewed && {
              heading: detailsHeading(viewed.shown),
              marks: detailsMarks(viewed.detail, true),
              lastEdit: viewed.lastEdit,
              pageHref: `/coven/${workspace.slug}/ingredients/${viewed.shown.id}` as Route,
              // The coven's jars of it, to every role: each form shows its stock (M9.9).
              children: (
                <IngredientSummary
                  detail={viewed.detail}
                  covens={viewed.covens}
                  jars={
                    stockDialogOf(
                      viewed.detail.variants.map(({ variant }) => variant),
                      viewed.jars,
                    ).jars
                  }
                />
              ),
              // The card's own controls for this entry (the owner's call, 2026-10-20): Edit over the
              // details or Annotate, and More or the bin, whose delete or remove goes back to the
              // list, which closes them.
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
              // A save (M8.17) stays where the edit opened from, the list or the details over
              // it, fetched again; a delete goes back to the list, the details' entry gone.
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
    </RouteModalProvider>
  );
}
