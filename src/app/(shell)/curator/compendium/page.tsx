import { compendiumEntryPath } from '@/lib/compendium-path';
import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import type { ModalHeading } from '../../../../components/Modal/types';
import { redirect } from 'next/navigation';
import CompendiumList from '../../../../components/CompendiumList';
import { COMPENDIUM_PARAMS } from '../../../../components/CompendiumList/params';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { editHeading } from '../../../../components/CompendiumList/heading';
import { cardName } from '../../../../components/IngredientCard/card-name';
import { detailsHeading, detailsMarks } from '../../../../components/IngredientEntry/details';
import DetailsDialog from '../../../../components/IngredientEntry/details-dialog';
import ShownToggle from '../../../../components/IngredientEntry/shown-toggle';
import ReviewMark from '../../../../components/IngredientEntry/review-mark';
import IngredientSummary from '../../../../components/IngredientEntry/summary';
import type { ListDialog } from '../../../../lib/types';
import { single } from '../../../../lib/search-params';
import { NEW_COMPENDIUM_ENTRY } from '../../../../lib/coven-path';
import type {
  CompendiumListEntry,
  CompendiumListFilter,
} from '../../../../components/CompendiumList/types';
import PageHeader from '../../../../components/PageHeader';
import { DEFAULT_PAGE_SIZE } from '../../../../lib/pagination';
import { editorStamps } from '../editors';
import { covensHolding, plusCovensOf } from '@/app/plus-covens';
import {
  getIngredient,
  ingredientDetailOf,
  readCompendiumReview,
  resolveCompendiumSlug,
} from '@/modules/ingredients';
import { requireCuratorSession } from '../../../../lib/request-session';
import {
  readCardCategories,
  readCategories,
  readCompendium,
  readDeities,
  readFacets,
  readFormIcons,
} from '../../../compendium-reads';
import AddAction from '@/app/(shell)/_admin/add-action';
import { pagerHrefs } from '../../../../lib/list-href';
import { orMissing } from '../../../../lib/or-not-found';
import { readEditPlace, readListPlace } from '@/app/(shell)/_admin/list-page';
import MissingNotice from '@/app/(shell)/_admin/missing-notice';
import CompendiumDialog from './compendium-dialog';
import { readCompendiumEntry } from './read-entry';
import type { AdminCompendiumPageProps, CompendiumSearchParams } from './types';
import { ADD_INGREDIENT_TITLE } from '@/components/AppShell/add-href';

export const metadata: Metadata = pageTitle('Compendium');

const ADD_HEADING: ModalHeading = { destination: 'Compendium', title: ADD_INGREDIENT_TITLE };

export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  const session = await requireCuratorSession();
  const params: CompendiumSearchParams = await searchParams;
  const place = readListPlace(params, NEW_COMPENDIUM_ENTRY);
  const { after, before, adding } = place;
  const filter: CompendiumListFilter = COMPENDIUM_PARAMS.read(params);

  const [categories, deities] = await Promise.all([readCategories(), readDeities()]);
  const lookups = {
    categories: new Map(categories.map(({ slug, id }) => [slug, id])),
    deities: new Map(deities.map(({ slug, id }) => [slug, id])),
  };
  const asked = COMPENDIUM_PARAMS.variables(filter, lookups);
  const variables = JSON.stringify({ ...asked, listing: asked.listing ?? 'all' });
  // The page's rows carry each entry's sourcing score for its column, read in the list's own query; the facets need none.
  const pageVariables = JSON.stringify({
    ...asked,
    listing: asked.listing ?? 'all',
    withSourcingScore: true,
  });

  const entrySlug = single(params.entry);
  const [page, counts, formIcons, { edited, missing }, shown] = await Promise.all([
    readCompendium(pageVariables, after, before, DEFAULT_PAGE_SIZE, session),
    readFacets(variables, session),
    readFormIcons(),
    readEditPlace(place, (slug) => readCompendiumEntry(slug, session)),
    entrySlug ? orMissing(() => resolveCompendiumSlug(entrySlug, session)) : undefined,
  ]);
  const list = { ...filter, after, before };
  const here = { ...list, entry: shown ? entrySlug : undefined };
  if (edited?.kind === 'moved') redirect(compendiumHref(here, { edit: edited.slug }));
  if (shown?.kind === 'moved') {
    const dialog = adding ? 'new' : place.editSlug ? { edit: place.editSlug } : undefined;
    redirect(compendiumHref({ ...list, entry: shown.slug }, dialog));
  }
  const detailed = shown?.kind === 'entry' ? shown.entry : undefined;
  const summary = detailed && (await orMissing(() => ingredientDetailOf(session, detailed)));
  const covens = summary ? await covensHolding(detailed.id) : [];
  // The entry's review mark, the admin's own read: the compendium's cached reads leave it out.
  const review = summary
    ? await orMissing(() => readCompendiumReview(session, detailed.id))
    : undefined;
  const editing = !adding && edited?.kind === 'entry' ? edited : undefined;
  const editReview = editing
    ? await orMissing(() => readCompendiumReview(session, editing.id))
    : undefined;
  const editShown = editing ? await orMissing(() => getIngredient(session, editing.id)) : undefined;
  const detailsPlus = summary ? await plusCovensOf(covens) : undefined;
  const form: ListDialog | undefined = adding
    ? 'new'
    : editing && place.editSlug
      ? { edit: place.editSlug }
      : undefined;
  const stamps = await editorStamps(
    session,
    page.edges.map(({ node }) => node),
  );
  const chipRows = await readCardCategories(page.edges.map(({ node }) => node.id));
  const entries = page.edges.map(({ node, sourcingScore }, i): CompendiumListEntry => ({
    ...stamps[i],
    id: node.id,
    slug: node.slug,
    name: node.name,
    nomenclature: node.nomenclature,
    canonicalName: node.canonicalName,
    forms: page.forms[i],
    categories: chipRows[i],
    details: {
      href: compendiumHref({ ...list, entry: node.slug }),
      heading: detailsHeading(node),
    },
    shown: node.shown,
    sourcingScore,
    editHref: compendiumHref(list, { edit: node.slug }),
    editHeading: editHeading(node),
  }));

  return (
    <main>
      <PageHeader
        title="Compendium"
        action={
          <AddAction href={compendiumHref(list, 'new')} heading={ADD_HEADING}>
            {ADD_INGREDIENT_TITLE}
          </AddAction>
        }
      />
      {(missing || (entrySlug && !shown)) && <MissingNotice noun="compendium entry" />}
      <CompendiumList
        entries={entries}
        filter={filter}
        counts={counts}
        categories={categories}
        vocabulary={{ deities, formIcons: Object.fromEntries(formIcons) }}
        position={page.position}
        total={page.totalCount}
        cursor={{ after, before }}
        {...pagerHrefs(page.pageInfo, (cursor) => compendiumHref({ ...filter, ...cursor }))}
      />
      {/* The details a Quick Look opens, in their own place beneath the edit modal's,
          so an Edit pressed in them opens over them. */}
      <DetailsDialog
        closeHref={compendiumHref(list, form)}
        opened={
          detailed && {
            heading: detailsHeading(detailed),
            marks: summary && detailsMarks(summary),
            pageHref: compendiumEntryPath(detailed.slug),
            ...(detailsPlus && { plus: detailsPlus, ingredientId: detailed.id }),
            children: summary && <IngredientSummary detail={summary} covens={covens} />,
            ...(review !== undefined && {
              reviewLine: (
                <ReviewMark
                  ingredientId={detailed.id}
                  reviewedAt={review?.reviewedAt.toISOString() ?? null}
                  alongside={
                    <ShownToggle
                      ingredientId={detailed.id}
                      shown={detailed.shown}
                      name={cardName(detailed.name, detailed.canonicalName)}
                      accessibleName="Shown in Compendium"
                    />
                  }
                />
              ),
            }),
            // No Edit in details opened over another entry's form, an add's or an edit's: it would
            // put this entry's form in that one's place, and its typing with it. The edit of this
            // entry is opened from here over them, so its Edit stays.
            ...((!form || (form !== 'new' && form.edit === detailed.slug)) && {
              editAction: {
                href: compendiumHref(here, { edit: detailed.slug }),
                name: cardName(detailed.name, detailed.canonicalName),
                heading: editHeading(detailed),
              },
            }),
          }
        }
      />
      {/* One dialog in one place for both, so Save Ingredient's move from ?new
          to ?edit= keeps the modal open rather than fading it out and in; the
          form inside is keyed by the entry, so each opens on its own values.
          Rendered whatever the address opens, so a press opens it at once and
          its form arrives in it. */}
      <CompendiumDialog
        place={here}
        lookUnder={form}
        opened={
          editing
            ? {
                heading: editHeading(editing.values),
                entry: {
                  id: editing.id,
                  values: editing.values,
                  revision: editing.revision,
                  updatedAt: editing.updatedAt,
                },
                sourcing: editing.sourcing,
                ...(editReview !== undefined && {
                  review: {
                    reviewed: editReview !== null,
                    reviewedAt: editReview?.reviewedAt.toISOString() ?? null,
                    ...(editShown !== undefined && { shown: editShown.shown }),
                  },
                }),
              }
            : adding
              ? { heading: ADD_HEADING, review: { reviewed: false } }
              : undefined
        }
      />
    </main>
  );
}
