'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactElement, useId, useMemo, useRef, useState } from 'react';
import { MIN_QUERY_LENGTH } from '@/modules/ingredients/validation/compendium-filter';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import Combobox from '../Combobox';
import { MagnifierIcon } from '../Field/icons';
import { useApplyFilter } from '../FilterForm';
import { useRouteModalOpener } from '../Modal/route-modal-provider';
import type { IngredientSearchBoxProps, IngredientSearchOption } from './types';
import './index.scss';

// The search row's first control (M8.10): a type-ahead over the compendium's
// ranked search, with the magnifier at the start of its box as the form's one submit. The
// debounced text asks `compendium(query:, first: 25)` for the dropdown; the
// list itself changes only on Enter, the clear, a pick or the last row
// (claude-docs/components/ingredient-search.md).

const IngredientSearchMatchesDocument = graphql(`
  query IngredientSearchMatches($query: String, $first: Int) {
    compendium(query: $query, first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          slug
          name
          canonicalName
          nomenclature
        }
      }
    }
  }
`);

// The same type-ahead over one coven's own ingredients: the entries it made and
// the compendium entries its cupboard names, shown by the coven's label where
// the cupboard sets one. Asked instead of the compendium when a `workspaceId`
// is given, never alongside it.
const IngredientSearchCupboardMatchesDocument = graphql(`
  query IngredientSearchCupboardMatches($workspaceId: ID!, $query: String, $first: Int) {
    workspaceIngredients(workspaceId: $workspaceId, query: $query, first: $first) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          slug
          name
          canonicalName
          nomenclature
          cupboardEntry(workspaceId: $workspaceId) {
            label
          }
        }
      }
    }
  }
`);

/** The dropdown's rows: the first page of the ranked search, never a second. */
const MATCH_ROWS = 25;

/** Whether `text` is long enough to search, counted in composed code points as the service counts it. */
const searchable = (text: string): boolean =>
  Array.from(text.normalize('NFC')).length >= MIN_QUERY_LENGTH;

const IngredientSearchBox = ({
  text,
  onText,
  searchHref,
  pickHref,
  pickHeading,
  workspaceId,
}: IngredientSearchBoxProps): ReactElement => {
  const controlId = useId();
  const input = useRef<HTMLInputElement>(null);
  const apply = useApplyFilter();
  const { navigate } = usePendingNavigation();
  const modal = useRouteModalOpener();
  // Nothing is asked until the box has been focused, so opening the page
  // sends nothing.
  const [active, setActive] = useState(false);

  const query = useDebouncedValue(text.trim());
  const searchesNow = searchable(query);
  // Typed text under the floor is never asked about, so it waits on nothing:
  // the dropdown says to keep typing at once rather than staying shut.
  const belowFloor = text.trim() !== '' && !searchable(text.trim());
  const compendium = useQuery({
    ...graphqlQuery(IngredientSearchMatchesDocument, { query, first: MATCH_ROWS }),
    enabled: active && searchesNow && !workspaceId,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const cupboard = useQuery({
    ...graphqlQuery(IngredientSearchCupboardMatchesDocument, {
      workspaceId: workspaceId ?? '',
      query,
      first: MATCH_ROWS,
    }),
    enabled: active && searchesNow && !!workspaceId,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const isFetching = workspaceId ? cupboard.isFetching : compendium.isFetching;
  // Both answers become the same match: the coven's label stands in for the name.
  const answer = useMemo(() => {
    if (workspaceId) {
      const page = cupboard.data?.workspaceIngredients;
      return page
        ? {
            hasNextPage: page.pageInfo.hasNextPage,
            nodes: page.edges.map(({ node }) => ({
              id: node.id,
              slug: node.slug,
              name: node.cupboardEntry?.label ?? node.name,
              canonicalName: node.canonicalName,
              nomenclature: node.nomenclature,
            })),
          }
        : null;
    }
    const page = compendium.data?.compendium;
    return page
      ? { hasNextPage: page.pageInfo.hasNextPage, nodes: page.edges.map(({ node }) => node) }
      : null;
  }, [workspaceId, cupboard.data, compendium.data]);

  // Under the floor the service ignores the query and returns the unranked
  // browse list, so no rows are offered, and the kept previous answer is not
  // shown either.
  const options = useMemo(
    (): IngredientSearchOption[] =>
      searchesNow && !belowFloor && answer
        ? answer.nodes.map((node) => ({
            key: node.id,
            value: node.name,
            label: node.canonicalName ? `${node.name} (${node.canonicalName})` : node.name,
            match: node,
          }))
        : [],
    [answer, searchesNow, belowFloor],
  );
  const hasMore = searchesNow && !belowFloor && answer?.hasNextPage === true;
  const seeAllHref = searchHref(query);

  // A pick opens the entry over the list as it stands, so the list is
  // neither applied to nor greyed: the hook's own transition, outside the
  // frame's, leaves the frame's `pending` false, where the frame's own
  // `go` would swap the list for its skeleton. Given a heading, the route
  // modal's opener shows the dialog at once while its page loads, as the
  // list's Edit link does.
  function pick(_value: string, option: IngredientSearchOption | null) {
    if (!option) return;
    const href = pickHref(option.match);
    if (modal && pickHeading) modal.open(href, pickHeading(option.match));
    else navigate(href);
  }

  return (
    // No visible label: the placeholder says what the search reads, and the combobox draws its
    // own visually hidden label (the owner's call, 2026-10-19), so no FieldShell here.
    <Combobox<IngredientSearchOption>
      id={controlId}
      label="Name"
      name="query"
      value={text}
      onChange={onText}
      onFocus={() => setActive(true)}
      onPick={pick}
      // Enter with the dropdown open and no row highlighted would only
      // close it; it applies the text, as a closed box does through the form.
      onCommit={(value) => apply(searchHref(value.trim()))}
      suggestions={{
        options,
        pending: !belowFloor && (text.trim() !== query || isFetching),
      }}
      empty={belowFloor ? 'Keep typing to search' : searchesNow ? undefined : false}
      // The last row of the listbox, reached by the arrows like a result and
      // set in italics so it reads as the message it is, not a match.
      action={
        hasMore ? { label: 'See all results.', onSelect: () => apply(seeAllHref) } : undefined
      }
      offerTyped={false}
      noun="result"
      placeholder="Search names, forms & descriptions"
      inputRef={input}
      // The clear empties the box and applies the empty search (the owner's
      // call), so the list drops its name filter and keeps the others.
      clear={{
        label: 'Clear Name',
        onClear: () => {
          onText('');
          input.current?.focus();
          apply(searchHref(''));
        },
        empty: text === '',
      }}
      // No chevron: a free-text search opens as you type, and the magnifier submits,
      // as a search field's does.
      toggle={false}
      leading={
        // The form's one submit, as SearchField's was, at the start of the box:
        // Enter in the closed box reaches it too, and before hydration it
        // sends the whole form. Its own id lets FilterForm give it the focus back.
        <button id={`${controlId}-submit`} type="submit" className="combobox__indicator">
          <MagnifierIcon />
          <span className="visually-hidden">Search</span>
        </button>
      }
    />
  );
};

export default IngredientSearchBox;
