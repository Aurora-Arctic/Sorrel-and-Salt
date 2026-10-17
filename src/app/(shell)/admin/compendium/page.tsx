import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import CompendiumList from '../../../../components/CompendiumList';
import { COMPENDIUM_PARAMS } from '../../../../components/CompendiumList/params';
import { compendiumHref } from '../../../../components/CompendiumList/href';
import { editHeading } from '../../../../components/CompendiumList/heading';
import type {
  CompendiumFormChoice,
  CompendiumListForm,
  CompendiumListEntry,
  CompendiumListFilter,
} from '../../../../components/CompendiumList/types';
import PageHeader from '../../../../components/PageHeader';
import { allPages, resolveNumberedPage } from '../../../../lib/pagination';
import { editorStamps } from '../editors';
import { requireCuratorSession } from '../../../../lib/request-session';
import {
  countCompendium,
  listCompendium,
  resolveCompendiumSlug,
  variantsOf,
} from '@/modules/ingredients';
import { formChoicesOf, formGroupsOf, listIngredientFormValues } from '@/modules/vocabulary';
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
 * Every curated form, for the Form box, read page by page: the curated lists
 * read their few groups as one page of the maximum (`allGroups`,
 * `value-kinds.ts`), but 84 forms are seeded against `MAX_PAGE_SIZE`'s 100
 * and an admin adds more as the compendium grows. Two
 * live forms may share a name in different groups; the filter matches the
 * text, folded, so that name is one choice. Cached, so the request reads them
 * once.
 */
const readForms = cache(async (): Promise<CompendiumFormChoice[]> => {
  const forms = await allPages((page) => listIngredientFormValues({}, page));
  const seen = new Set<string>();
  return forms.flatMap(({ name }) => {
    const folded = name.toLocaleLowerCase();
    if (seen.has(folded)) return [];
    seen.add(folded);
    return [{ name }];
  });
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

/** The add dialog's head and the button that opens it. */
const ADD_TITLE = 'Add Ingredient';

// The global compendium, for an admin to add to, edit and retire (M5.5). A
// wide modal over the list does the writing, opened by the address — `?new`,
// or `?edit=<slug>` — so it can be linked to and Back closes it, as on the
// categories page. The list narrows by name, by form, by classification —
// Unknown is the curation to-do list — and to the entries citing nothing, the
// second.
export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  const session = await requireCuratorSession();
  const params: CompendiumSearchParams = await searchParams;
  const place = readListPlace(params);
  const { after, before, adding } = place;
  // Every filter, read through the parameter table (CompendiumList/params.ts).
  const filter: CompendiumListFilter = COMPENDIUM_PARAMS.read(params);

  const [page, forms, { edited, missing }] = await Promise.all([
    readCompendium(JSON.stringify(COMPENDIUM_PARAMS.variables(filter)), after, before),
    readForms(),
    readEditPlace(place, readEntry),
  ]);
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
          <AddAction href={compendiumHref(here, 'new')} heading={{ title: ADD_TITLE }}>
            {ADD_TITLE}
          </AddAction>
        }
      />
      {missing && <MissingNotice noun="compendium entry" />}
      <CompendiumList
        entries={entries}
        filter={filter}
        forms={forms}
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
              ? { heading: { title: ADD_TITLE } }
              : undefined
        }
      />
    </main>
  );
}
