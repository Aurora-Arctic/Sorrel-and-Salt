import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import CompendiumList from '../../../components/CompendiumList';
import { compendiumHref } from '../../../components/CompendiumList/href';
import type {
  CompendiumListEntry,
  CompendiumListFilter,
} from '../../../components/CompendiumList/types';
import { NotFound } from '../../../lib/errors';
import { resolveNumberedPage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import { countCompendium, listCompendium, resolveCompendiumSlug } from '@/modules/ingredients';
import {
  NOMENCLATURE_KINDS,
  type NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
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
    nomenclature: NomenclatureKind | undefined,
    withoutReferences: boolean,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter = { query: query || undefined, nomenclature, withoutReferences };
    // "Page X of Y", counted from the page's first row (src/lib/pagination.ts).
    return resolveNumberedPage(
      { after, before },
      (request) => listCompendium(filter, request),
      (start) => countCompendium(filter, start),
    );
  },
);

/**
 * What `?edit=` names: the entry there, its values read for the form, or the
 * address it moved to while its old one still redirects, or nothing.
 */
async function readEdited(slug: string) {
  try {
    const address = await resolveCompendiumSlug(slug);
    if (address.kind === 'moved') return address;
    return {
      kind: 'entry' as const,
      id: address.entry.id,
      values: await entryValues(address.entry),
    };
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}

const isKind = (value: string | undefined): value is NomenclatureKind =>
  (NOMENCLATURE_KINDS as readonly string[]).includes(value ?? '');

// The global compendium, for an admin to add to, edit and retire (M5.5). A
// wide modal over the list does the writing, opened by the address — `?new`,
// or `?edit=<slug>` — so it can be linked to and Back closes it, as on the
// categories page. The list narrows by name, by classification — Unknown is
// the curation to-do list — and to the entries citing nothing, the second.
export default async function AdminCompendiumPage({ searchParams }: AdminCompendiumPageProps) {
  await requireAdminSession();
  const params: CompendiumSearchParams = await searchParams;
  // Blank is no filter: a native submit sends `query=&nomenclature=`; a kind
  // no classification holds is ignored, as a hand-edited cursor gets the
  // first page.
  const query = single(params.query)?.trim() ?? '';
  const kind = single(params.nomenclature);
  const nomenclature = isKind(kind) ? kind : undefined;
  const withoutReferences = single(params.withoutReferences) === '1';
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));
  const editSlug = single(params.edit);
  const adding = params.new !== undefined;

  const [page, edited] = await Promise.all([
    readCompendium(query, nomenclature, withoutReferences, after, before),
    !adding && editSlug ? readEdited(editSlug) : undefined,
  ]);
  const filter: CompendiumListFilter = {
    query,
    nomenclature: nomenclature ?? '',
    withoutReferences,
  };
  const here = { ...filter, after, before };
  // An old address opens the entry at its new one, as the public route's
  // redirect does (MB.82).
  if (edited?.kind === 'moved') redirect(compendiumHref(here, { edit: edited.slug }));
  const entries = page.edges.map(({ node }): CompendiumListEntry => ({
    id: node.id,
    slug: node.slug,
    name: node.name,
    nomenclature: node.nomenclature,
    canonicalName: node.canonicalName,
    form: node.form,
    editHref: compendiumHref(here, { edit: node.slug }),
  }));

  return (
    <main>
      <div className="page-header">
        <h1>Compendium</h1>
        <Link className="btn btn--solid" href={compendiumHref(here, 'new')}>
          Add Ingredient
        </Link>
      </div>
      {!adding && editSlug && !edited && (
        <p className="notice notice--error" role="alert">
          No compendium entry has that address — it may have been renamed or deleted.
        </p>
      )}
      <CompendiumList
        entries={entries}
        filter={filter}
        position={page.position}
        previousHref={
          page.pageInfo.hasPreviousPage && page.pageInfo.startCursor
            ? compendiumHref({ ...filter, before: page.pageInfo.startCursor })
            : undefined
        }
        nextHref={
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? compendiumHref({ ...filter, after: page.pageInfo.endCursor })
            : undefined
        }
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
