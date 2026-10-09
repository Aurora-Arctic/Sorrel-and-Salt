import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import GroupedValueList from '../../../components/GroupedValueList';
import { groupedValuesHref } from '../../../components/GroupedValueList/href';
import type { GroupedValueListEntry } from '../../../components/GroupedValueList/types';
import { NotFound } from '../../../lib/errors';
import { MAX_PAGE_SIZE, resolvePage, resolveNumberedPage } from '../../../lib/pagination';
import { requireAdminSession } from '../../../lib/request-session';
import { readableCursor, single } from '../../../lib/search-params';
import {
  type DeityFilter,
  countDeities,
  getDeityBySlug,
  listDeities,
  listDeityTraditions,
} from '@/modules/vocabulary';
import DeityDialog from './deity-dialog';
import type { AdminDeitiesPageProps, DeitiesSearchParams } from './types';

export const metadata: Metadata = {
  title: 'Deities — Admin — Sorrel & Salt',
};

// The page and GraphQL's `deities` end at the same service, paged by the same
// helper (CLAUDE.md rule 1, rule 8); the writes are the modal's, through the
// deity mutations. Cached so a second render in the request reads once, and
// so keyed by primitives rather than a filter object.
const readDeities = cache(
  async (
    query: string,
    traditionId: string | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter: DeityFilter = { query: query || undefined, traditionId };
    // "Page X of Y", counted from the page's first row (src/lib/pagination.ts).
    return resolveNumberedPage(
      { after, before },
      (request) => listDeities(filter, request),
      (start) => countDeities(filter, start),
    );
  },
);

// Every tradition on one page of the maximum: thirty-five are seeded, and an
// admin adds one rarely. The modal picks one by id, the list names it, and
// the filter picks one by slug.
const readTraditions = cache(async () => {
  const page = await resolvePage({ first: MAX_PAGE_SIZE }, listDeityTraditions);
  return page.edges.map(({ node }) => ({ id: node.id, slug: node.slug, name: node.name }));
});

/**
 * The traditions, then the page of deities under the filter: `?tradition=`
 * names one by slug, as `?edit=` names a deity, so it is resolved against
 * the traditions before the list can be read. A slug no tradition holds is
 * ignored, as a hand-edited cursor gets the first page.
 */
async function readFiltered(
  query: string,
  traditionSlug: string | undefined,
  after: string | undefined,
  before: string | undefined,
) {
  const traditions = await readTraditions();
  const tradition = traditionSlug
    ? traditions.find((each) => each.slug === traditionSlug)
    : undefined;
  const page = await readDeities(query, tradition?.id, after, before);
  return { traditions, tradition, page };
}

/** The deity `?edit=` names, or none when no live one holds the address. */
async function readEdited(slug: string) {
  try {
    return await getDeityBySlug(slug);
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}

// The curated deity vocabulary, for an admin to add to, edit and retire
// (MB.132), in the forms page's shape: each deity listed under its tradition,
// and a modal over the list doing the writing, opened by the address —
// `?new`, or `?edit=<slug>` — so it can be linked to and Back closes it
// (claude-docs/components/grouped-value-form.md, "On the admin pages"). The
// list narrows by `?query=` and `?tradition=`, which every link here keeps.
export default async function AdminDeitiesPage({ searchParams }: AdminDeitiesPageProps) {
  await requireAdminSession();
  const params: DeitiesSearchParams = await searchParams;
  // Blank is no filter: a native submit sends `query=&tradition=`.
  const query = single(params.query)?.trim() ?? '';
  const traditionSlug = single(params.tradition) || undefined;
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));
  const editSlug = single(params.edit);
  const adding = params.new !== undefined;

  const [{ traditions, tradition, page }, edited] = await Promise.all([
    readFiltered(query, traditionSlug, after, before),
    !adding && editSlug ? readEdited(editSlug) : undefined,
  ]);
  // Only a tradition that exists is kept, so an unknown slug leaves every link.
  const filter = { query, group: tradition?.slug ?? '' };
  const here = { ...filter, after, before };
  const traditionNames = new Map(traditions.map((each) => [each.id, each.name]));
  const deities = page.edges.map(({ node }): GroupedValueListEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    groupName: traditionNames.get(node.traditionId) ?? '',
    editHref: groupedValuesHref('deity', here, { edit: node.slug }),
  }));
  const closeHref = groupedValuesHref('deity', here);

  return (
    <main>
      {/* The page's one primary action on its heading's line, as every admin
          vocabulary page has it. */}
      <div className="page-header">
        <h1>Deities</h1>
        <Link className="btn btn--solid" href={groupedValuesHref('deity', here, 'new')}>
          Add Deity
        </Link>
      </div>
      {!adding && editSlug && !edited && (
        <p className="notice notice--error" role="alert">
          No deity has that address — it may have been renamed or deleted.
        </p>
      )}
      <GroupedValueList
        kind="deity"
        values={deities}
        filter={filter}
        groups={traditions}
        position={page.position}
        previousHref={
          page.pageInfo.hasPreviousPage && page.pageInfo.startCursor
            ? groupedValuesHref('deity', { ...filter, before: page.pageInfo.startCursor })
            : undefined
        }
        nextHref={
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? groupedValuesHref('deity', { ...filter, after: page.pageInfo.endCursor })
            : undefined
        }
      />
      {adding && <DeityDialog title="Add Deity" closeHref={closeHref} traditions={traditions} />}
      {edited && (
        <DeityDialog
          // A fresh form per deity: one opened after another starts from its own values.
          key={edited.id}
          title="Edit Deity"
          closeHref={closeHref}
          deity={{
            id: edited.id,
            name: edited.name,
            description: edited.description,
            groupId: edited.traditionId,
          }}
          traditions={traditions}
        />
      )}
    </main>
  );
}
