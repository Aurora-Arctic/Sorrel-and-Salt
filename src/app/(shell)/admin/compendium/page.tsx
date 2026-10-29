import type { Metadata, Route } from 'next';
import type { ModalHeading } from '../../../../components/Modal/types';
import { redirect } from 'next/navigation';
import CompendiumList from '../../../../components/CompendiumList';
import { COMPENDIUM_PARAMS } from '../../../../components/CompendiumList/params';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { editHeading } from '../../../../components/CompendiumList/heading';
import { cardName } from '../../../../components/IngredientCard/card-name';
import { detailsHeading, detailsMarks } from '../../../../components/IngredientEntry/details';
import DetailsDialog from '../../../../components/IngredientEntry/details-dialog';
import ReviewMark from '../../../../components/IngredientEntry/review-mark';
import IngredientSummary from '../../../../components/IngredientEntry/summary';
import type { ListDialog } from '../../../../lib/types';
import { single } from '../../../../lib/search-params';
import { NEW_COMPENDIUM_ENTRY } from '../../../../lib/coven-path';
import { compendiumFacetCounts } from '../../../../components/CompendiumList/facets';
import type {
  CompendiumListEntry,
  CompendiumListFilter,
} from '../../../../components/CompendiumList/types';
import PageHeader from '../../../../components/PageHeader';
import { DEFAULT_PAGE_SIZE } from '../../../../lib/pagination';
import { editorStamps } from '../editors';
import { covensHolding, plusCovensOf } from '@/app/plus-covens';
import {
  ingredientDetailOf,
  readCompendiumReview,
  resolveCompendiumSlug,
} from '@/modules/ingredients';
import { requireCuratorSession } from '../../../../lib/request-session';
import {
  readCategories,
  readCompendium,
  readDeities,
  readFacets,
  readFormIcons,
} from '../../../compendium-reads';
import { readCardCategories } from '../../../compendium-reads';
import AddAction from '../add-action';
import { pagerHrefs } from '../../../../lib/list-href';
import { readEditPlace, readListPlace, readOrMissing } from '../list-page';
import MissingNotice from '../missing-notice';
import CompendiumDialog from './compendium-dialog';
import { readCompendiumEntry } from './read-entry';
import type { AdminCompendiumPageProps, CompendiumSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Compendium',
};

/** The button that opens the add dialog. */
const ADD_TITLE = 'Add Ingredient';
/** The add dialog's head, "Add Ingredient to Compendium": the destination over the action. */
const ADD_HEADING: ModalHeading = { destination: 'Compendium', title: ADD_TITLE };

// The global compendium, for an admin to add to, edit and retire. A wide modal over the list does
// the writing, opened by `?new=ingredient-compendium` (or a bare `?new`) or `?edit=<slug>`; any
// other `?new` is the shell's Add Ingredient. Each filter shows how many entries each choice lists.
export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  const session = await requireCuratorSession();
  const params: CompendiumSearchParams = await searchParams;
  const place = readListPlace(params, NEW_COMPENDIUM_ENTRY);
  const { after, before, adding } = place;
  // Every filter, read through the parameter table (CompendiumList/params.ts).
  const filter: CompendiumListFilter = COMPENDIUM_PARAMS.read(params);

  // The address names categories and deities by slug; the compendium filters by id.
  const [categories, deities] = await Promise.all([readCategories(), readDeities()]);
  const lookups = {
    categories: new Map(categories.map(({ slug, id }) => [slug, id])),
    deities: new Map(deities.map(({ slug, id }) => [slug, id])),
  };
  const variables = JSON.stringify(COMPENDIUM_PARAMS.variables(filter, lookups));

  // The entry whose details are open over the list, `?entry=`.
  const entrySlug = single(params.entry);
  const [page, counts, formIcons, { edited, missing }, shown] = await Promise.all([
    // The session, for the Reviewed filter and its counts, a curator's alone.
    readCompendium(variables, after, before, DEFAULT_PAGE_SIZE, session),
    readFacets(variables, session),
    readFormIcons(),
    readEditPlace(place, readCompendiumEntry),
    entrySlug ? readOrMissing(() => resolveCompendiumSlug(entrySlug)) : undefined,
  ]);
  const facets = compendiumFacetCounts(counts, {
    formIcons,
    deities: new Map(deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  });
  // The list as it stands, no modal over it: where the details close to, and
  // what each row's Edit and name open over.
  const list = { ...filter, after, before };
  // The list with the details open, which an edit modal opens over and closes back to.
  const here = { ...list, entry: shown ? entrySlug : undefined };
  // An old address opens the entry at its new one, as the public route's redirect does.
  if (edited?.kind === 'moved') redirect(compendiumHref(here, { edit: edited.slug }));
  if (shown?.kind === 'moved') {
    const dialog = adding ? 'new' : place.editSlug ? { edit: place.editSlug } : undefined;
    redirect(compendiumHref({ ...list, entry: shown.slug }, dialog));
  }
  const detailed = shown?.kind === 'entry' ? shown.entry : undefined;
  // The open details' sections, read uncached as the entry's page reads them, and only while the
  // details are open; none for an entry gone since.
  const summary = detailed && (await readOrMissing(() => ingredientDetailOf(session, detailed)));
  // The admin's or curator's own covens that hold it, and only those.
  const covens = summary ? await covensHolding(detailed.id) : [];
  // The entry's review mark, the admin's own read: the compendium's cached reads leave it out.
  const review = summary
    ? await readOrMissing(() => readCompendiumReview(session, detailed.id))
    : undefined;
  // The entry the modal edits; none on an add, which wins over an `?edit=`.
  const editing = !adding && edited?.kind === 'entry' ? edited : undefined;
  // The review read for the entry the edit modal opens, its switch a field of the form; one row by id.
  const editReview = editing
    ? await readOrMissing(() => readCompendiumReview(session, editing.id))
    : undefined;
  // The plus beside the pencil, for the covens the admin or curator is a member of and may add in:
  // none for one in no coven, so neither the plus nor its check shows.
  const detailsPlus = summary ? await plusCovensOf(covens) : undefined;
  // The form open, if one is: a near match's Quick Look opens over it, and the details close back
  // to it.
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
  const entries = page.edges.map(({ node }, i): CompendiumListEntry => ({
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
    editHref: compendiumHref(list, { edit: node.slug }),
    editHeading: editHeading(node),
  }));

  return (
    <main>
      <PageHeader
        title="Compendium"
        action={
          <AddAction href={compendiumHref(list, 'new')} heading={ADD_HEADING}>
            {ADD_TITLE}
          </AddAction>
        }
      />
      {(missing || (entrySlug && !shown)) && <MissingNotice noun="compendium entry" />}
      <CompendiumList
        entries={entries}
        filter={filter}
        facets={facets}
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
            pageHref: `/compendium/ingredients/${detailed.slug}` as Route,
            ...(detailsPlus && { plus: detailsPlus, ingredientId: detailed.id }),
            children: summary && <IngredientSummary detail={summary} covens={covens} />,
            ...(review !== undefined && {
              reviewLine: (
                <ReviewMark
                  ingredientId={detailed.id}
                  reviewedAt={review?.reviewedAt.toISOString() ?? null}
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
                entry: { id: editing.id, values: editing.values },
                ...(editReview !== undefined && {
                  review: {
                    reviewed: editReview !== null,
                    reviewedAt: editReview?.reviewedAt.toISOString() ?? null,
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
