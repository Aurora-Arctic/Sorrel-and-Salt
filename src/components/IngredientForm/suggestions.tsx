'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import type { ComboboxOption, Suggestions } from '../Combobox/types';
import { ListField, SuggestField } from './fields';
import type { Claimant, LookupFieldProps } from './types';

// The two lookups M4.7a serves, on the form and folk-name boxes: each waits
// for the typing to settle, asks /api/graphql for a page, and shapes the
// answer into the combobox's rows. Neither asks until its box has been
// focused, so opening the form sends nothing
// (claude-docs/components/ingredient-form.md, "The lookups").

const FormSuggestionsDocument = graphql(`
  query FormSuggestions($workspaceId: ID!, $query: String, $first: Int) {
    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          value
          description
          group
          curated
          claimants {
            name
            canonicalName
          }
        }
      }
    }
  }
`);

const CommonNameSuggestionsDocument = graphql(`
  query CommonNameSuggestions($workspaceId: ID!, $query: String, $first: Int) {
    commonNameSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          value
          claimants {
            name
            canonicalName
          }
        }
      }
    }
  }
`);

/** Rows a lookup asks for: enough to choose from, few enough to read. */
export const SUGGESTION_ROWS = 10;

/** "Used by Testwort (Fixtura testalis), Mockleaf": each claimant by its label and formal name. */
function usedBy(claimants: Claimant[]): string | undefined {
  if (claimants.length === 0) return undefined;
  const names = claimants.map(({ name, canonicalName }) =>
    canonicalName ? `${name} (${canonicalName})` : name,
  );
  return `Used by ${names.join(', ')}`;
}

/** The form suggestions for `text`, once it has settled, while `active`. */
export function useFormSuggestions(
  workspaceId: string,
  text: string,
  active: boolean,
): Suggestions {
  const query = useDebouncedValue(text.trim());
  const { data, isFetching } = useQuery({
    ...graphqlQuery(FormSuggestionsDocument, { workspaceId, query, first: SUGGESTION_ROWS }),
    enabled: active,
    placeholderData: keepPreviousData,
    // A lookup that fails offers nothing; it never takes the form down.
    throwOnError: false,
  });
  const options = useMemo(
    (): ComboboxOption[] =>
      data?.formSuggestions.edges.map(({ node }) => ({
        value: node.value,
        // The group is what tells two same-named forms apart (M4.2a).
        label: node.group ? `${node.value} (${node.group})` : node.value,
        note: [node.description, usedBy(node.claimants)].filter(Boolean).join(' · ') || undefined,
        curated: node.curated,
      })) ?? [],
    [data],
  );
  return { options, pending: text.trim() !== query || isFetching };
}

/** The common-name suggestions for `text`, once it has settled, while `active`. */
export function useCommonNameSuggestions(
  workspaceId: string,
  text: string,
  active: boolean,
): Suggestions {
  const query = useDebouncedValue(text.trim());
  const { data, isFetching } = useQuery({
    ...graphqlQuery(CommonNameSuggestionsDocument, { workspaceId, query, first: SUGGESTION_ROWS }),
    enabled: active,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const options = useMemo(
    (): ComboboxOption[] =>
      data?.commonNameSuggestions.edges.map(({ node }) => ({
        value: node.value,
        note: usedBy(node.claimants),
      })) ?? [],
    [data],
  );
  return { options, pending: text.trim() !== query || isFetching };
}

/** The form field, suggesting from the curated vocabulary and the forms in use. */
export function FormField({ workspaceId }: LookupFieldProps): ReactElement {
  const { control } = useFormContext();
  const text: string = useWatch({ control, name: 'form' });
  const [active, setActive] = useState(false);
  const suggestions = useFormSuggestions(workspaceId, text, active);
  return (
    <SuggestField
      name="form"
      label="Form"
      hint="How it comes: dried leaf, whole root, oil."
      suggestions={suggestions}
      onActivate={() => setActive(true)}
    />
  );
}

/** The folk-names list, its box suggesting the names already in use. */
export function FolkNamesField({ workspaceId }: LookupFieldProps): ReactElement {
  const { control } = useFormContext();
  const text: string = useWatch({ control, name: 'drafts.folkNames' });
  const [active, setActive] = useState(false);
  const suggestions = useCommonNameSuggestions(workspaceId, text, active);
  return (
    <ListField
      name="folkNames"
      legend="Folk Names"
      entry="Folk Name"
      hint="Other names it goes by. A search finds it by any of them."
      suggestions={suggestions}
      onActivate={() => setActive(true)}
    />
  );
}
