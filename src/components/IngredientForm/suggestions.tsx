'use client';

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import type {
  CommonNameSuggestionsQuery,
  CompendiumSubstitutesQuery,
  DeitySuggestionsQuery,
  FormSuggestionsQuery,
  IngredientSuggestionsQuery,
  PlanetSuggestionsQuery,
  ZodiacSuggestionsQuery,
} from '../../gql/graphql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import type { VariablesArg } from '../../lib/types';
import type { ComboboxOption, Suggestions } from '../Combobox/types';
import { ListField, SuggestField } from './fields';
import type {
  Claimant,
  CorrespondenceNode,
  FormOption,
  IngredientFormValues,
  ListOption,
  FormFieldProps,
  LookupListFieldProps,
  LookupText,
  UseSuggestions,
} from './types';
import { tierOf } from './values';

// The lookups on the form's boxes: the form and folk names M4.7a serves, and
// the planets, signs, deities and substitutes MB.131 adds. Each waits for the
// typing to settle, asks /api/graphql for a page, and shapes the answer into
// the combobox's rows. None asks until its box has been focused, so opening
// the form sends nothing (claude-docs/components/ingredient-form.md, "The
// lookups").

const FormSuggestionsDocument = graphql(`
  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {
    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          id
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
  query CommonNameSuggestions($workspaceId: ID, $query: String, $first: Int) {
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

const PlanetSuggestionsDocument = graphql(`
  query PlanetSuggestions($workspaceId: ID, $query: String, $first: Int) {
    planetSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          value
          description
          curated
        }
      }
    }
  }
`);

const ZodiacSuggestionsDocument = graphql(`
  query ZodiacSuggestions($workspaceId: ID, $query: String, $first: Int) {
    zodiacSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          value
          description
          curated
        }
      }
    }
  }
`);

const DeitySuggestionsDocument = graphql(`
  query DeitySuggestions($workspaceId: ID, $query: String, $first: Int) {
    deitySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          id
          value
          description
          tradition
          curated
        }
      }
    }
  }
`);

const IngredientSuggestionsDocument = graphql(`
  query IngredientSuggestions($workspaceId: ID!, $query: String, $first: Int) {
    ingredientSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          id
          name
          canonicalName
          form
          description
          isGlobal
        }
      }
    }
  }
`);

const CompendiumSubstitutesDocument = graphql(`
  query CompendiumSubstitutes($query: String, $first: Int) {
    compendium(query: $query, first: $first) {
      edges {
        node {
          id
          name
          canonicalName
          form
          description
          isGlobal
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

/** "Hecate (Greek)": a value beside what tells it from a same-named one, when anything does. */
const qualified = (value: string, by: string | null | undefined): string =>
  by ? `${value} (${by})` : value;

/**
 * The rows `document` answers for `text`, once it has settled, while
 * `active`: the last answer stays on screen while the next is fetched, and a
 * lookup that fails offers nothing rather than taking the form down. `scope`
 * is what it asks besides the text — the coven, or a null one for the
 * compendium's alone — and nothing for the compendium's own search.
 */
export function useLookup<TResult, TScope extends object, O extends ComboboxOption>(
  document: TypedDocumentNode<TResult, TScope & LookupText>,
  scope: TScope,
  text: string,
  active: boolean,
  shape: (data: TResult) => O[],
): Suggestions<O> {
  const query = useDebouncedValue(text.trim());
  const { data, isFetching } = useQuery({
    // Spread as the tuple `graphqlQuery` takes: its conditional type over the
    // variables cannot resolve while the scope is generic.
    ...graphqlQuery(
      document,
      ...([{ ...scope, query, first: SUGGESTION_ROWS }] as VariablesArg<TScope & LookupText>),
    ),
    enabled: active,
    placeholderData: keepPreviousData,
    throwOnError: false,
  });
  const options = useMemo(() => (data === undefined ? [] : shape(data)), [data, shape]);
  return { options, pending: text.trim() !== query || isFetching };
}

const formOptions = (data: FormSuggestionsQuery): FormOption[] =>
  data.formSuggestions.edges.map(({ node }) => ({
    value: node.value,
    // The group is what tells two same-named forms apart (M4.2a).
    label: qualified(node.value, node.group),
    note: [node.description, usedBy(node.claimants)].filter(Boolean).join(' · ') || undefined,
    curated: node.curated,
    // A curated row is what a pick links (MB.169); a form only in use has no
    // row, and a pick of it is typed text.
    link: node.id
      ? { id: node.id, name: node.value, group: node.group, description: node.description }
      : undefined,
  }));

const commonNameOptions = (data: CommonNameSuggestionsQuery): ListOption[] =>
  data.commonNameSuggestions.edges.map(({ node }) => ({
    value: node.value,
    note: usedBy(node.claimants),
  }));

/** A planet's or sign's row: the value, its description, and its bucket. */
const correspondenceOption = (node: CorrespondenceNode): ListOption => ({
  value: node.value,
  note: node.description ?? undefined,
  curated: node.curated,
});

const planetOptions = (data: PlanetSuggestionsQuery): ListOption[] =>
  data.planetSuggestions.edges.map(({ node }) => correspondenceOption(node));

const zodiacOptions = (data: ZodiacSuggestionsQuery): ListOption[] =>
  data.zodiacSuggestions.edges.map(({ node }) => correspondenceOption(node));

const deityOptions = (data: DeitySuggestionsQuery): ListOption[] =>
  data.deitySuggestions.edges.map(({ node }) => ({
    ...correspondenceOption(node),
    // The tradition tells two same-named deities apart, as a form's group does.
    label: qualified(node.value, node.tradition),
    // A curated deity is what a pick links, and its pill reads with its
    // tradition (MB.169); one only in use has no row, and adds as text.
    link: node.id
      ? { id: node.id, tradition: node.tradition, description: node.description }
      : undefined,
  }));

const substituteOptions = (data: IngredientSuggestionsQuery): ListOption[] =>
  data.ingredientSuggestions.edges.map(({ node }) => {
    const canonicalName = node.canonicalName ?? null;
    const link = {
      id: node.id,
      canonicalName,
      form: node.form ?? null,
      description: node.description ?? null,
      isGlobal: node.isGlobal,
    };
    return {
      // The label is what a linked entry reads as; the link is what is saved,
      // and what its pill's tooltip tells.
      value: node.name,
      label: qualified(node.name, canonicalName),
      // Kept in the search's ranked order, so the tier is a note rather than
      // a bucket that would reorder the rows.
      note: tierOf(link),
      key: node.id,
      link,
    };
  });

/** A compendium entry's row: what tells it from another is its form, since every row is the compendium's. */
const compendiumOptions = (data: CompendiumSubstitutesQuery): ListOption[] =>
  data.compendium.edges.map(({ node }) => {
    const canonicalName = node.canonicalName ?? null;
    return {
      value: node.name,
      label: qualified(node.name, canonicalName),
      note: node.form ?? undefined,
      key: node.id,
      link: {
        id: node.id,
        canonicalName,
        form: node.form ?? null,
        description: node.description ?? null,
        isGlobal: node.isGlobal,
      },
    };
  });

/** The form suggestions for `text`, once it has settled, while `active`. */
export const useFormSuggestions: UseSuggestions<FormOption> = (workspaceId, text, active) =>
  useLookup(FormSuggestionsDocument, { workspaceId }, text, active, formOptions);

/** The common names in use. */
export const useCommonNameSuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(CommonNameSuggestionsDocument, { workspaceId }, text, active, commonNameOptions);

/** The planets, curated and in use. */
export const usePlanetSuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(PlanetSuggestionsDocument, { workspaceId }, text, active, planetOptions);

/** The zodiac signs, curated and in use. */
export const useZodiacSuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(ZodiacSuggestionsDocument, { workspaceId }, text, active, zodiacOptions);

/** The deities, curated under their traditions, and in use. */
export const useDeitySuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(DeitySuggestionsDocument, { workspaceId }, text, active, deityOptions);

/**
 * The ingredients a coven's substitute may link: the compendium's and its
 * own (MB.138). Asked only by a coven's form; the compendium's asks
 * `useCompendiumSubstitutes`.
 */
export const useSubstituteSuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(
    IngredientSuggestionsDocument,
    { workspaceId: workspaceId ?? '' },
    text,
    active,
    substituteOptions,
  );

/**
 * The entries a compendium entry's substitute may link: the compendium's
 * alone, searched as its list is (M5.5), since a compendium substitute links
 * only the compendium (MB.138).
 */
export const useCompendiumSubstitutes: UseSuggestions = (_workspaceId, text, active) =>
  useLookup(CompendiumSubstitutesDocument, {}, text, active, compendiumOptions);

/**
 * The form field, suggesting from the curated vocabulary and the forms in
 * use. A pick of a curated form links it, and the box shows its group, which
 * the text alone cannot: Wax under _Animal_ and under _Substance_ both read
 * "Wax" (MB.169). The text stays the member's to edit, and an edit away from
 * the picked name drops the link, the owner's call: what is left is typed.
 * On the compendium the form must be a pick (MB.162), so the box offers the
 * curated rows alone and no typed row.
 */
export function FormField({ workspaceId, pickOnly }: FormFieldProps): ReactElement {
  const { control, getValues, setValue } = useFormContext<IngredientFormValues>();
  const text = useWatch({ control, name: 'form' });
  const link = useWatch({ control, name: 'formLink' });
  const [active, setActive] = useState(false);
  const suggestions = curatedOnly(useFormSuggestions(workspaceId, text, active), pickOnly);
  return (
    <SuggestField
      name="form"
      label="Form"
      hint="How it comes: dried leaf, whole root, oil."
      suggestions={suggestions}
      onActivate={() => setActive(true)}
      onPick={(option) => setValue('formLink', option?.link ?? null)}
      onEdit={(edited) => {
        if (edited !== getValues('formLink')?.name) setValue('formLink', null);
      }}
      qualifier={
        link?.group ? { text: link.group, detail: link.description ?? undefined } : undefined
      }
      offerTyped={!pickOnly}
    />
  );
}

/**
 * The suggestions less the rows in use alone, when `only`: what a pick-only
 * box offers, since a value only in use is one the compendium refuses. Listed
 * flat, `curated` dropped: every row left is the compendium's, so a From
 * Compendium heading over them would tell the admin nothing.
 */
function curatedOnly<O extends ComboboxOption>(
  found: Suggestions<O>,
  only = false,
): Suggestions<O> {
  if (!only) return found;
  const options = found.options
    .filter((option) => option.curated !== false)
    .map((option) => ({ ...option, curated: undefined }));
  return { ...found, options };
}

/**
 * A list whose box suggests from `useSuggestions`, from the first time the box
 * is used, less `omit`: an entry is never its own substitute.
 */
export function LookupListField({
  workspaceId,
  useSuggestions,
  omit,
  ...list
}: LookupListFieldProps): ReactElement {
  const { control } = useFormContext();
  const text: string = useWatch({ control, name: `drafts.${list.name}` });
  const [active, setActive] = useState(false);
  const found = useSuggestions(workspaceId, text, active);
  const suggestions = useMemo(
    () =>
      omit === undefined
        ? found
        : { ...found, options: found.options.filter((option) => option.link?.id !== omit) },
    [found, omit],
  );
  return <ListField {...list} suggestions={suggestions} onActivate={() => setActive(true)} />;
}
