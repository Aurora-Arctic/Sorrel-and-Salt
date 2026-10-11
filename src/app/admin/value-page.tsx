import Link from 'next/link';
import type { ReactElement } from 'react';
import { cache } from 'react';
import type { GroupedValueKind } from '../../components/GroupedValueForm/types';
import GroupedValueList from '../../components/GroupedValueList';
import { groupedValuesHref } from '../../components/GroupedValueList/href';
import { KINDS } from '../../components/GroupedValueList/kinds';
import type { GroupedValueListEntry } from '../../components/GroupedValueList/types';
import { TabActions } from '../../components/TabbedPage';
import { resolveNumberedPage } from '../../lib/pagination';
import { requireAdminSession } from '../../lib/request-session';
import { single } from '../../lib/search-params';
import { pagerHrefs, readListPlace, readOrMissing } from './list-page';
import MissingNotice from './missing-notice';
import ValueDialog from './value-dialog';
import { VALUE_KINDS } from './value-kinds';
import type { ValuePageProps } from './types';

// The page every curated value vocabulary shares (MB.115): the categories
// (M5.6, MB.178), forms (M5.6a) and deities (MB.132), each filed under a
// group, and the planets and zodiac signs (MB.95), filed under nothing. Each
// route's `page.tsx` keeps its `metadata` and hands its kind and address
// here; the heading and tabs are its route group's layout's (MB.115). The page and GraphQL's lists end at the same services, paged by the
// same helper (CLAUDE.md rule 1, rule 8); the writes are the modal's, through
// the kind's mutations.

// One page of the kind under the filter, with "Page X of Y" counted from its
// first row (src/lib/pagination.ts). Cached so a second render in the request
// reads once, and so keyed by primitives rather than a filter object.
const readValues = cache(
  (
    kind: GroupedValueKind,
    query: string,
    groupId: string | undefined,
    after: string | undefined,
    before: string | undefined,
  ) => {
    const { list, count } = VALUE_KINDS[kind];
    const filter = { query: query || undefined, groupId };
    return resolveNumberedPage(
      { after, before },
      (request) => list(filter, request),
      (start) => count(filter, start),
    );
  },
);

/**
 * The kind's groups, then its page under the filter: the group parameter
 * names a group by slug, as `?edit=` names a value, so it is resolved against
 * the groups before the list can be read. A slug no group holds is ignored,
 * as a hand-edited cursor gets the first page.
 */
async function readFiltered(
  kind: GroupedValueKind,
  query: string,
  groupSlug: string | undefined,
  after: string | undefined,
  before: string | undefined,
) {
  const groups = (await VALUE_KINDS[kind].readGroups?.()) ?? [];
  const group = groupSlug ? groups.find((each) => each.slug === groupSlug) : undefined;
  const page = await readValues(kind, query, group?.id, after, before);
  return { groups, group, page };
}

/**
 * A curated vocabulary, for an admin to add to, edit and retire. A modal over
 * the list does the writing, opened by the address — `?new`, or
 * `?edit=<slug>` — so it can be linked to and Back closes it. The list
 * narrows by `?query=` and a grouped kind's group, which every link here
 * keeps (claude-docs/components/grouped-value-form.md, "On the admin pages").
 */
export async function ValuePage({ kind, searchParams }: ValuePageProps): Promise<ReactElement> {
  await requireAdminSession();
  const params = await searchParams;
  const { query, after, before, editSlug, adding } = readListPlace(params);
  const { label, noun, group: groupSpec } = KINDS[kind];
  // Blank is no filter: a native submit sends `group=`.
  const groupParam = groupSpec?.param === 'tradition' ? params.tradition : params.group;
  const groupSlug = groupSpec ? single(groupParam) || undefined : undefined;

  const [{ groups, group, page }, edited] = await Promise.all([
    readFiltered(kind, query, groupSlug, after, before),
    !adding && editSlug ? readOrMissing(() => VALUE_KINDS[kind].getBySlug(editSlug)) : undefined,
  ]);
  // Only a group that exists is kept, so an unknown slug leaves every link.
  const filter = { query, group: group?.slug ?? '' };
  const here = { ...filter, after, before };
  const groupsById = new Map(groups.map((each) => [each.id, each]));
  const values = page.edges.map(({ node }): GroupedValueListEntry => {
    const own = node.groupId ? groupsById.get(node.groupId) : undefined;
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      description: node.description,
      groupName: own?.name ?? '',
      // A chip only for a group with a pair: a category's.
      groupColors:
        own?.colorDark && own.colorLight
          ? { colorDark: own.colorDark, colorLight: own.colorLight }
          : undefined,
      editHref: groupedValuesHref(kind, here, { edit: node.slug }),
    };
  });
  const closeHref = groupedValuesHref(kind, here);
  const choices = groups.map(({ id, name }) => ({ id, name }));

  return (
    <>
      <TabActions>
        <Link className="btn btn--solid" href={groupedValuesHref(kind, here, 'new')}>
          Add {label}
        </Link>
      </TabActions>
      {!adding && editSlug && !edited && <MissingNotice noun={noun} />}
      <GroupedValueList
        kind={kind}
        values={values}
        filter={filter}
        groups={groups.map(({ slug, name }) => ({ slug, name }))}
        position={page.position}
        {...pagerHrefs(page.pageInfo, (cursor) =>
          groupedValuesHref(kind, { ...filter, ...cursor }),
        )}
      />
      {adding && (
        <ValueDialog kind={kind} title={`Add ${label}`} closeHref={closeHref} groups={choices} />
      )}
      {edited && (
        <ValueDialog
          // A fresh form per value: one opened after another starts from its own values.
          key={edited.id}
          kind={kind}
          title={`Edit ${label}`}
          closeHref={closeHref}
          value={{
            id: edited.id,
            name: edited.name,
            description: edited.description,
            groupId: edited.groupId,
          }}
          groups={choices}
        />
      )}
    </>
  );
}
