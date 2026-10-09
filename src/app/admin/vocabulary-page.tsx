import Link from 'next/link';
import type { ReactElement } from 'react';
import { cache } from 'react';
import VocabularyValueList from '../../components/VocabularyValueList';
import { vocabularyHref } from '../../components/VocabularyValueList/href';
import { VOCABULARY_COPY } from '../../components/VocabularyValueList/vocabularies';
import type {
  FlatVocabulary,
  VocabularyValueListEntry,
} from '../../components/VocabularyValueList/types';
import { NotFound } from '../../lib/errors';
import { resolveNumberedPage } from '../../lib/pagination';
import { requireAdminSession } from '../../lib/request-session';
import { readableCursor, single } from '../../lib/search-params';
import {
  countAstrologyValues,
  getAstrologyValueBySlug,
  listAstrologyValues,
} from '@/modules/vocabulary';
import VocabularyDialog from './vocabulary-dialog';
import type { VocabularySearchParams } from './types';

// The page shape `/admin/planets` and `/admin/zodiac-signs` share (MB.95):
// M5.6a's forms page without the group. Each route's `page.tsx` names its
// vocabulary and its title and hands its address here. The page and GraphQL's
// `planets` and `zodiacSigns` end at the same service, paged by the same
// helper (CLAUDE.md rule 1, rule 8); the writes are the modal's, through the
// vocabulary's mutations. Cached so a second render in the request reads
// once, and so keyed by primitives.
const readValues = cache(
  async (
    vocabulary: FlatVocabulary,
    query: string,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const filter = { query: query || undefined };
    // "Page X of Y", counted from the page's first row (src/lib/pagination.ts).
    return resolveNumberedPage(
      { after, before },
      (request) => listAstrologyValues(vocabulary, filter, request),
      (start) => countAstrologyValues(vocabulary, filter, start),
    );
  },
);

/** The value `?edit=` names, or none when no live one holds the address. */
async function readEdited(vocabulary: FlatVocabulary, slug: string) {
  try {
    return await getAstrologyValueBySlug(vocabulary, slug);
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    throw error;
  }
}

/**
 * A flat curated vocabulary, for an admin to add to, edit and retire: a modal
 * over the list does the writing, opened by the address — `?new`, or
 * `?edit=<slug>` — so it can be linked to and Back closes it. The list
 * narrows by `?query=`, which every link here keeps
 * (claude-docs/components/vocabulary-value-form.md, "On the admin pages").
 */
export async function VocabularyPage({
  vocabulary,
  searchParams,
}: {
  vocabulary: FlatVocabulary;
  searchParams: Promise<VocabularySearchParams>;
}): Promise<ReactElement> {
  await requireAdminSession();
  const params = await searchParams;
  // Blank is no filter: a native submit sends `query=`.
  const query = single(params.query)?.trim() ?? '';
  const after = readableCursor(single(params.after));
  const before = after ? undefined : readableCursor(single(params.before));
  const editSlug = single(params.edit);
  const adding = params.new !== undefined;
  const { title, noun, label } = VOCABULARY_COPY[vocabulary];

  const [page, edited] = await Promise.all([
    readValues(vocabulary, query, after, before),
    !adding && editSlug ? readEdited(vocabulary, editSlug) : undefined,
  ]);
  const here = { query, after, before };
  const values = page.edges.map(({ node }): VocabularyValueListEntry => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    editHref: vocabularyHref(vocabulary, here, { edit: node.slug }),
  }));
  const closeHref = vocabularyHref(vocabulary, here);

  return (
    <main>
      {/* The page's one primary action on its heading's line, as every admin
          vocabulary page has it. */}
      <div className="page-header">
        <h1>{title}</h1>
        <Link className="btn btn--solid" href={vocabularyHref(vocabulary, here, 'new')}>
          Add {label}
        </Link>
      </div>
      {!adding && editSlug && !edited && (
        <p className="notice notice--error" role="alert">
          No {noun} has that address — it may have been renamed or deleted.
        </p>
      )}
      <VocabularyValueList
        vocabulary={vocabulary}
        values={values}
        query={query}
        position={page.position}
        previousHref={
          page.pageInfo.hasPreviousPage && page.pageInfo.startCursor
            ? vocabularyHref(vocabulary, { query, before: page.pageInfo.startCursor })
            : undefined
        }
        nextHref={
          page.pageInfo.hasNextPage && page.pageInfo.endCursor
            ? vocabularyHref(vocabulary, { query, after: page.pageInfo.endCursor })
            : undefined
        }
      />
      {adding && (
        <VocabularyDialog vocabulary={vocabulary} title={`Add ${label}`} closeHref={closeHref} />
      )}
      {edited && (
        <VocabularyDialog
          // A fresh form per value: one opened after another starts from its own values.
          key={edited.id}
          vocabulary={vocabulary}
          title={`Edit ${label}`}
          closeHref={closeHref}
          value={{ id: edited.id, name: edited.name, description: edited.description }}
        />
      )}
    </main>
  );
}
