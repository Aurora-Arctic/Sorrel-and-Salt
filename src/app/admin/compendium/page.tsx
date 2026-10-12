import type { Metadata } from 'next';
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
import { oneOf, single, trimmed } from '../../../lib/search-params';
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
import { AddAction, pagerHrefs, readEditPlace, readListPlace } from '../list-page';
import type { ModalHeading } from '../../../components/Modal/types';
import type { IngredientFormValues } from '../../../components/IngredientForm/types';
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

/**
 * The nomenclatures whose formal name is a binomial, set in italics; a
 * mineral's or a chemical's is set upright (claude-docs/styling.md, "Type").
 */
const BINOMIAL_KINDS: ReadonlySet<string> = new Set<NomenclatureKind>([
  'botanical',
  'fungal',
  'zoological',
]);

/**
 * An entry's edit dialog head (MB.115): the name it was saved under, not the
 * Name field's, and its formal name after it, as the list's rows name it.
 */
function editHeading({ name, canonicalName, nomenclature }: IngredientFormValues): ModalHeading {
  const formal = canonicalName.trim();
  const set = BINOMIAL_KINDS.has(nomenclature) ? (
    <span className="binomial">{formal}</span>
  ) : (
    formal
  );
  return { eyebrow: 'Edit Ingredient', title: name, qualifier: formal ? set : undefined };
}

// The global compendium, for an admin to add to, edit and retire (M5.5). A
// wide modal over the list does the writing, opened by the address — `?new`,
// or `?edit=<slug>` — so it can be linked to and Back closes it, as on the
// categories page. The list narrows by name, by form, by classification —
// Unknown is the curation to-do list — and to the entries citing nothing, the
// second.
export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  await requireAdminSession();
  const params: CompendiumSearchParams = await searchParams;
  const place = readListPlace(params);
  const { query, after, before, adding } = place;
  // Blank is no filter: a native submit sends `nomenclature=`; a kind no
  // classification holds is ignored, as a hand-edited cursor gets the first
  // page.
  const nomenclature = oneOf(NOMENCLATURE_KINDS, single(params.nomenclature));
  const withoutReferences = single(params.withoutReferences) === '1';
  // A form by its text, `?form=Oil`, which the compendium read folds.
  const form = trimmed(params.form);

  const [page, forms, { edited, missing }] = await Promise.all([
    readCompendium(query, form, nomenclature, withoutReferences, after, before),
    readForms(),
    readEditPlace(place, readEntry),
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
  // The entry the modal edits; none on an add, which wins over an `?edit=`.
  const editing = !adding && edited?.kind === 'entry' ? edited : undefined;
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
        action={<AddAction href={compendiumHref(here, 'new')}>Add Ingredient</AddAction>}
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
          form inside is keyed by the entry, so each opens on its own values. */}
      {(adding || editing) && (
        <CompendiumDialog
          heading={editing ? editHeading(editing.values) : { title: 'Add Ingredient' }}
          place={here}
          entry={editing && { id: editing.id, values: editing.values }}
        />
      )}
    </main>
  );
}
