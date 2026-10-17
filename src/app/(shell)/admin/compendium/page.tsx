import type { Metadata } from 'next';
import type { ModalHeading } from '../../../../components/Modal/types';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import CompendiumList from '../../../../components/CompendiumList';
import { COMPENDIUM_PARAMS } from '../../../../components/CompendiumList/params';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { editHeading } from '../../../../components/CompendiumList/heading';
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
import { requireCuratorSession } from '../../../../lib/request-session';
import {
  compendiumFacets,
  countCompendium,
  listCompendium,
  resolveCompendiumSlug,
  variantsOf,
} from '@/modules/ingredients';
import {
  categoryGroupsOf,
  formChoicesOf,
  formGroupsOf,
  listCategories,
  listDeities,
  listDeityTraditions,
  listIngredientFormValues,
} from '@/modules/vocabulary';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import AddAction from '../add-action';
import { pagerHrefs } from '../../../../lib/list-href';
import { readEditPlace, readListPlace } from '../list-page';
import MissingNotice from '../missing-notice';
import CompendiumDialog from './compendium-dialog';
import { entryValues } from './entry-values';
import type { AdminCompendiumPageProps, CompendiumSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Compendium',
};

// The page and GraphQL's `compendium` end at the same service, paged by the
// same helper (CLAUDE.md rule 1, rule 8); the writes are the modal's, through
// the compendium mutations. Cached so a second render in the request reads
// once, and so keyed by primitives rather than a filter object: the filter as
// the parameter table's variables, written as JSON, so a new filter changes
// no line here (src/components/CompendiumList/params.ts).
const readCompendium = cache(
  async (variables: string, after: string | undefined, before: string | undefined) => {
    // Written by this page from the table a few lines below, and checked again by the service.
    const filter: Parameters<typeof listCompendium>[0] = JSON.parse(variables);
    // "Page X of Y", counted from the page's first row (src/lib/pagination.ts).
    const page = await resolveNumberedPage(
      { after, before },
      (request) => listCompendium(filter, request),
      (start) => countCompendium(filter, start),
    );
    // Each entry's live forms, the Form column (MB.222): one batch for the
    // page, through the read `Ingredient.variants` resolves through.
    const forms = await variantsOf(
      null,
      page.edges.map(({ node }) => ({ id: node.id, workspaceId: null })),
    );
    const variants = forms.map((answer) => {
      // A compendium ref is never refused (MB.80).
      if (answer instanceof Error) throw answer;
      return answer;
    });
    // Each form's icon is its curated form's group's: two batches for the
    // page, as `IngredientVariant.formChoice` reads them. A form that is
    // only text, or whose form or group is retired, has none.
    const choices = await formChoicesOf(variants.flat().flatMap(({ formId }) => formId ?? []));
    const live = choices.flatMap((choice) => choice ?? []);
    const groups = await formGroupsOf(live.map((choice) => choice.groupId));
    const iconOfForm = new Map(
      live.map((choice, i) => {
        const group = groups[i];
        return [choice.id, group === undefined || group instanceof Error ? null : group.icon];
      }),
    );
    return {
      ...page,
      forms: variants.map((own) =>
        own.map(({ form, formId }): CompendiumListForm => ({
          name: form,
          icon: (formId && iconOfForm.get(formId)) || null,
        })),
      ),
    };
  },
);

/**
 * The group icon each curated form wears, by the form's name folded to lower
 * case, for the Form filter's choices. Read page by page: the curated lists
 * read their few groups as one page of the maximum (`allGroups`,
 * `value-kinds.ts`), but 84 forms are seeded against `MAX_PAGE_SIZE`'s 100
 * and an admin adds more as the compendium grows. Two live forms may share a
 * name in different groups; the filter matches the text, folded, so the first
 * one's icon stands for that name, as the list's Form column reads it. A form
 * whose group is retired or has no icon is left out and draws the generic.
 * Cached, so the request reads them once.
 */
const readFormIcons = cache(async (): Promise<Map<string, FormGroupIcon>> => {
  const forms = await allPages((page) => listIngredientFormValues({}, page));
  const groups = await formGroupsOf([...new Set(forms.map(({ groupId }) => groupId))]);
  const iconOfGroup = new Map(
    groups.flatMap((group) =>
      group instanceof Error || !group.icon ? [] : [[group.id, group.icon]],
    ),
  );
  const icons = new Map<string, FormGroupIcon>();
  for (const { name, groupId } of forms) {
    const icon = iconOfGroup.get(groupId);
    const folded = name.toLocaleLowerCase();
    if (icon && !icons.has(folded)) icons.set(folded, icon);
  }
  return icons;
});

/**
 * Every live deity with its tradition's name, by id and the slug the address
 * names it by, for the Deities filter. The tradition is what tells two gods
 * of one name apart (`hecate-greek`, `hecate-roman`). Read page by page, as
 * the forms are; public reference data, so no session.
 */
const readDeities = cache(async () => {
  const [rows, traditions] = await Promise.all([
    allPages((page) => listDeities({}, page)),
    allPages((page) => listDeityTraditions(page)),
  ]);
  const traditionName = new Map(traditions.map(({ id, name }) => [id, name]));
  return rows.flatMap(({ id, slug, name, traditionId }) => {
    const tradition = traditionName.get(traditionId);
    // A deity lists only under a live tradition, so this is a race with a delete.
    return tradition === undefined ? [] : [{ id, slug, name, tradition }];
  });
});

/**
 * Every live category with its group's name and colours, for the Categories
 * box, and the slugs the address names them by. Read page by page, as the
 * forms are, since one page of the maximum is not guaranteed to hold them all
 * and an admin adds more. Public reference data, held in the data cache by the
 * services; `cache` here only keeps the request to one read.
 */
const readCategories = cache(async (): Promise<CompendiumCategoryChoice[]> => {
  const rows = await allPages((page) => listCategories({}, page));
  const groups = await categoryGroupsOf([...new Set(rows.map(({ groupId }) => groupId))]);
  const byId = new Map(
    groups.flatMap((group) => (group instanceof Error ? [] : [[group.id, group]])),
  );
  return rows.flatMap(({ id, slug, name, description, groupId }) => {
    const group = byId.get(groupId);
    // A category lists only under a live group, so this is a race with a delete.
    if (!group) return [];
    const { colorDark, colorLight } = group;
    return [
      {
        id,
        slug,
        name,
        description,
        group: { id: group.id, name: group.name, colorDark, colorLight },
      },
    ];
  });
});

// How many entries each filter's choices would list, for the filter as the
// address holds it: public, like the list, and keyed by the same JSON
// of variables so a second render in the request reads once. The service
// holds it in the data cache under the `compendium` tag.
const readFacets = cache(async (variables: string) => {
  const filter: Parameters<typeof compendiumFacets>[0] = JSON.parse(variables);
  return compendiumFacets(filter);
});

/**
 * What `?edit=` names: the entry there, its values read for the form, or the
 * address it moved to while its old one still redirects, or nothing.
 */
const readEntry = async (slug: string) => {
  const address = await resolveCompendiumSlug(slug);
  if (address.kind === 'moved') return address;
  return {
    kind: 'entry' as const,
    id: address.entry.id,
    values: await entryValues(address.entry),
  };
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

  const [page, counts, formIcons, { edited, missing }] = await Promise.all([
    readCompendium(variables, after, before),
    readFacets(variables),
    readFormIcons(),
    readEditPlace(place, readEntry),
  ]);
  const facets = compendiumFacetCounts(counts, {
    formIcons,
    deities: new Map(deities.map(({ id, ...deity }) => [id, deity])),
    categories: new Map(categories.map((category) => [category.id, category])),
  });
  const here = { ...filter, after, before };
  // An old address opens the entry at its new one, as the public route's
  // redirect does (MB.82).
  if (edited?.kind === 'moved') redirect(compendiumHref(here, { edit: edited.slug }));
  // The entry the modal edits; none on an add, which wins over an `?edit=`.
  const editing = !adding && edited?.kind === 'entry' ? edited : undefined;
  const stamps = await editorStamps(
    session,
    page.edges.map(({ node }) => node),
  );
  const entries = page.edges.map(({ node }, i): CompendiumListEntry => ({
    ...stamps[i],
    id: node.id,
    slug: node.slug,
    name: node.name,
    nomenclature: node.nomenclature,
    canonicalName: node.canonicalName,
    forms: page.forms[i],
    editHref: compendiumHref(here, { edit: node.slug }),
    editHeading: editHeading(node),
  }));

  return (
    <main>
      <PageHeader
        title="Compendium"
        action={
          <AddAction href={compendiumHref(here, 'new')} heading={ADD_HEADING}>
            {ADD_TITLE}
          </AddAction>
        }
      />
      {missing && <MissingNotice noun="compendium entry" />}
      <CompendiumList
        entries={entries}
        filter={filter}
        facets={facets}
        categories={categories}
        position={page.position}
        {...pagerHrefs(page.pageInfo, (cursor) => compendiumHref({ ...filter, ...cursor }))}
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
