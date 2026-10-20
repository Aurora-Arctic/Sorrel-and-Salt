import type { Metadata, Route } from 'next';
import type { ModalHeading } from '../../../../components/Modal/types';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import CompendiumList from '../../../../components/CompendiumList';
import { COMPENDIUM_PARAMS } from '../../../../components/CompendiumList/params';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { editHeading } from '../../../../components/CompendiumList/heading';
import { detailsHeading } from '../../../../components/IngredientEntry/details';
import DetailsDialog from '../../../../components/IngredientEntry/details-dialog';
import IngredientSummary from '../../../../components/IngredientEntry/summary';
import { single } from '../../../../lib/search-params';
import { compendiumFacetCounts } from '../../../../components/CompendiumList/facets';
import type {
  CompendiumCategoryChoice,
  CompendiumListForm,
  CompendiumListEntry,
  CompendiumListFilter,
} from '../../../../components/CompendiumList/types';
import PageHeader from '../../../../components/PageHeader';
import { allPages, resolveNumberedPage } from '../../../../lib/pagination';
import { editorStamps } from '../editors';
import {
  covensHoldingEntry,
  ingredientDetailOf,
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
/**
 * The add dialog's head: the destination over the action, as the shell's coven
 * dialog has it (M8.16), named "Add Ingredient to Compendium".
 */
const ADD_HEADING: ModalHeading = { destination: 'Compendium', title: ADD_TITLE };

// The global compendium, for an admin to add to, edit and retire (M5.5). A
// wide modal over the list does the writing, opened by the address — `?new`,
// or `?edit=<slug>` — so it can be linked to and Back closes it, as on the
// categories page. The list narrows by name, by forms, deities, zodiac
// signs, planets, elements, toxic and categories, and to the entries citing
// nothing, the admin's to-do list; each filter offers its choices with how
// many entries each would list (M12.4).
export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  const session = await requireCuratorSession();
  const params: CompendiumSearchParams = await searchParams;
  const place = readListPlace(params);
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

  // The entry whose details are open over the list, `?entry=` (M12.5).
  const entrySlug = single(params.entry);
  const [page, counts, formIcons, { edited, missing }, shown] = await Promise.all([
    readCompendium(variables, after, before),
    readFacets(variables),
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
  // An old address opens the entry at its new one, as the public route's
  // redirect does (MB.82).
  if (edited?.kind === 'moved') redirect(compendiumHref(here, { edit: edited.slug }));
  if (shown?.kind === 'moved') {
    const dialog = adding ? 'new' : place.editSlug ? { edit: place.editSlug } : undefined;
    redirect(compendiumHref({ ...list, entry: shown.slug }, dialog));
  }
  const detailed = shown?.kind === 'entry' ? shown.entry : undefined;
  // The open details' sections (M12.5), read uncached as the entry's page reads
  // them, and only while the details are open; none for an entry gone since.
  const summary = detailed && (await readOrMissing(() => ingredientDetailOf(session, detailed)));
  // The admin's or curator's own covens that hold it, and only those (M6.6; M12.5).
  const covens = summary ? await covensHoldingEntry(session, detailed.id) : [];
  // The entry the modal edits; none on an add, which wins over an `?edit=`.
  const editing = !adding && edited?.kind === 'entry' ? edited : undefined;
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
        {...pagerHrefs(page.pageInfo, (cursor) => compendiumHref({ ...filter, ...cursor }))}
      />
      {/* The details a Quick Look opens, in their own place beneath the edit modal's,
          so an Edit pressed in them opens over them (M12.5). */}
      <DetailsDialog
        closeHref={compendiumHref(list)}
        opened={
          detailed && {
            heading: detailsHeading(detailed),
            pageHref: `/compendium/ingredients/${detailed.slug}` as Route,
            children: summary && <IngredientSummary detail={summary} covens={covens} />,
            editAction: {
              href: compendiumHref(here, { edit: detailed.slug }),
              heading: editHeading(detailed),
            },
          }
        }
      />
      {/* One dialog in one place for both, so Save Ingredient's move from ?new
          to ?edit= keeps the modal open rather than fading it out and in; the
          form inside is keyed by the entry, so each opens on its own values.
          Rendered whatever the address opens, so a press opens it at once and
          its form arrives in it (M9.18). */}
      <CompendiumDialog
        place={here}
        opened={
          editing
            ? {
                heading: editHeading(editing.values),
                entry: { id: editing.id, values: editing.values },
              }
            : adding
              ? { heading: ADD_HEADING }
              : undefined
        }
      />
    </main>
  );
}
