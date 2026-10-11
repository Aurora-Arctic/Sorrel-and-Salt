import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import CompendiumList from '../../../components/CompendiumList';
import { compendiumHref } from '../../../components/CompendiumList/href';
import type {
  CompendiumFormChoice,
  CompendiumListEntry,
  CompendiumListFilter,
} from '../../../components/CompendiumList/types';
import PageHeader from '../../../components/PageHeader';
import { allPages, resolveNumberedPage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { single } from '../../../lib/search-params';
import {
  countCompendium,
  listCompendium,
  resolveCompendiumSlug,
  variantsOf,
} from '@/modules/ingredients';
import {
  NOMENCLATURE_KINDS,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import { listIngredientFormValues } from '@/modules/vocabulary';
import { pagerHrefs, readListPlace, readOrMissing } from '../list-page';
import MissingNotice from '../missing-notice';
import CompendiumDialog from './compendium-dialog';
import { entryValues } from './entry-values';
import type { AdminCompendiumPageProps, CompendiumSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Compendium — Admin — Sorrel & Salt',
};

// The page and GraphQL's `compendium` end at the same service, paged by the
// same helper (CLAUDE.md rule 1, rule 8); the writes are the modal's, through
// the compendium mutations. Cached so a second render in the request reads
// once, and so keyed by primitives rather than a filter object.
const readCompendium = cache(
  async (
    query: string,
    form: string,
    nomenclature: NomenclatureKind | undefined,
    withoutReferences: boolean,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter = {
      query: query || undefined,
      form: form || undefined,
      nomenclature,
      withoutReferences,
    };
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
    return {
      ...page,
      forms: forms.map((answer) => {
        // A compendium ref is never refused (MB.80).
        if (answer instanceof Error) throw answer;
        return answer.map((variant) => variant.form);
      }),
    };
  },
);

/**
 * Every curated form, for the Form box: read page by page rather than as one
 * page of the maximum, as the curated lists read their groups
 * (`allGroups`, `value-kinds.ts`), because 84 forms are seeded against
 * `MAX_PAGE_SIZE`'s 100 and an admin adds them as the compendium grows. Two
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
const readEdited = (slug: string) =>
  readOrMissing(async () => {
    const address = await resolveCompendiumSlug(slug);
    if (address.kind === 'moved') return address;
    return {
      kind: 'entry' as const,
      id: address.entry.id,
      values: await entryValues(address.entry),
    };
  });

const isKind = (value: string | undefined): value is NomenclatureKind =>
  (NOMENCLATURE_KINDS as readonly string[]).includes(value ?? '');

// The global compendium, for an admin to add to, edit and retire (M5.5). A
// wide modal over the list does the writing, opened by the address — `?new`,
// or `?edit=<slug>` — so it can be linked to and Back closes it, as on the
// categories page. The list narrows by name, by form, by classification —
// Unknown is the curation to-do list — and to the entries citing nothing, the
// second.
export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  await requireAdminSession();
  const params: CompendiumSearchParams = await searchParams;
  const { query, after, before, editSlug, adding } = readListPlace(params);
  // Blank is no filter: a native submit sends `nomenclature=`; a kind no
  // classification holds is ignored, as a hand-edited cursor gets the first
  // page.
  const kind = single(params.nomenclature);
  const nomenclature = isKind(kind) ? kind : undefined;
  const withoutReferences = single(params.withoutReferences) === '1';
  // A form by its text, `?form=Oil`, which the compendium read folds.
  const form = single(params.form)?.trim() ?? '';

  const [page, forms, edited] = await Promise.all([
    readCompendium(query, form, nomenclature, withoutReferences, after, before),
    readForms(),
    !adding && editSlug ? readEdited(editSlug) : undefined,
  ]);
  const filter: CompendiumListFilter = {
    query,
    form,
    nomenclature: nomenclature ?? '',
    withoutReferences,
  };
  const here = { ...filter, after, before };
  // An old address opens the entry at its new one, as the public route's
  // redirect does (MB.82).
  if (edited?.kind === 'moved') redirect(compendiumHref(here, { edit: edited.slug }));
  const entries = page.edges.map(({ node }, i): CompendiumListEntry => ({
    id: node.id,
    slug: node.slug,
    name: node.name,
    nomenclature: node.nomenclature,
    canonicalName: node.canonicalName,
    forms: page.forms[i],
    editHref: compendiumHref(here, { edit: node.slug }),
  }));

  return (
    <main>
      <PageHeader
        title="Compendium"
        action={
          <Link className="btn btn--solid" href={compendiumHref(here, 'new')}>
            Add Ingredient
          </Link>
        }
      />
      {!adding && editSlug && !edited && <MissingNotice noun="compendium entry" />}
      <CompendiumList
        entries={entries}
        filter={filter}
        forms={forms}
        position={page.position}
        {...pagerHrefs(page.pageInfo, (cursor) => compendiumHref({ ...filter, ...cursor }))}
      />
      {/* One dialog in one place for both, so Save Ingredient's move from ?new
          to ?edit= keeps the modal open rather than fading it out and in; the
          form inside is keyed by the entry, so each opens on its own values. */}
      {(adding || edited?.kind === 'entry') && (
        <CompendiumDialog
          title={adding ? 'Add Ingredient' : 'Edit Ingredient'}
          place={here}
          entry={
            !adding && edited?.kind === 'entry'
              ? { id: edited.id, values: edited.values }
              : undefined
          }
        />
      )}
    </main>
  );
}
