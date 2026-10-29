'use client';

import { formLabel } from '@/modules/ingredients/validation/form-label';

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
  CelestialBodySuggestionsQuery,
  ZodiacSuggestionsQuery,
} from '../../gql/graphql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import type { VariablesArg } from '../../lib/types';
import FormIcon from '../FormIcon';
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
  SubstituteForm,
  UseSuggestions,
} from './types';
import { COMPENDIUM_HEADING, YOUR_INGREDIENTS, draftOf, renamedTo, tierOf } from './values';

// The lookups on the form's boxes: each waits for the typing to settle, asks /api/graphql for a
// page and shapes the answer into the combobox's rows. None asks until its box has been focused, so
// opening the form sends nothing (claude-docs/components/ingredient-form.md, "The lookups").

const FormSuggestionsDocument = graphql(`
  query FormSuggestions($workspaceId: ID, $query: String, $first: Int) {
    formSuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
      edges {
        node {
          id
          value
          description
          group
          icon
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

const CelestialBodySuggestionsDocument = graphql(`
  query CelestialBodySuggestions($workspaceId: ID, $query: String, $first: Int) {
    celestialBodySuggestions(workspaceId: $workspaceId, query: $query, first: $first) {
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
          matchedName
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
        group
        node {
          id
          name
          cupboardEntry(workspaceId: $workspaceId) {
            label
          }
          canonicalName
          description
          isGlobal
          variants {
            id
            form
            formChoice {
              id
              group {
                id
                name
              }
            }
          }
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
          description
          isGlobal
          variants {
            id
            form
            formChoice {
              id
              group {
                id
                name
              }
            }
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

/** "Hecate (Greek)": a value beside what tells it from a same-named one, when anything does. */
const qualified = (value: string, by: string | null | undefined): string =>
  by ? `${value} (${by})` : value;

/**
 * The rows `document` answers for `text`, once settled, while `active`: the last answer stays on
 * screen while the next is fetched, and a failed lookup offers nothing. `scope` is what it asks
 * besides the text (the coven, or null for the compendium's alone), and nothing for its own search.
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
    // The group is what tells two same-named forms apart.
    label: qualified(formLabel(node.value), node.group),
    note: [node.description, usedBy(node.claimants)].filter(Boolean).join(' · ') || undefined,
    curated: node.curated,
    // Null for a form only in use, which `FormIcon` draws as the generic.
    icon: <FormIcon name={node.icon ?? null} />,
    // A curated row is what a pick links; a form only in use has no
    // row, and a pick of it is typed text.
    link: node.id
      ? {
          id: node.id,
          name: node.value,
          group: node.group,
          icon: node.icon ?? null,
          description: node.description,
        }
      : undefined,
  }));

const commonNameOptions = (data: CommonNameSuggestionsQuery): ListOption[] =>
  data.commonNameSuggestions.edges.map(({ node }) => ({
    value: node.value,
    note: usedBy(node.claimants),
  }));

/** A celestial body's or sign's row: the value, its description, and its bucket. */
const correspondenceOption = (node: CorrespondenceNode): ListOption => ({
  value: node.value,
  note: node.description ?? undefined,
  curated: node.curated,
});

const celestialBodyOptions = (data: CelestialBodySuggestionsQuery): ListOption[] =>
  data.celestialBodySuggestions.edges.map(({ node }) => correspondenceOption(node));

const zodiacOptions = (data: ZodiacSuggestionsQuery): ListOption[] =>
  data.zodiacSuggestions.edges.map(({ node }) => correspondenceOption(node));

const deityOptions = (data: DeitySuggestionsQuery): ListOption[] =>
  data.deitySuggestions.edges.map(({ node }) => ({
    ...correspondenceOption(node),
    // The tradition tells two same-named deities apart, as a form's group does.
    label: qualified(node.value, node.tradition),
    // The other name the server found it by, which its own name does
    // not show: "Astarte (Canaanite)" found by "ashtoreth" says why.
    note:
      [node.matchedName && `Also called ${node.matchedName}`, node.description]
        .filter(Boolean)
        .join(' · ') || undefined,
    // A curated deity is what a pick links, and its pill reads with its
    // tradition; one only in use has no row, and adds as text.
    link: node.id
      ? { id: node.id, tradition: node.tradition, description: node.description }
      : undefined,
  }));

/** An ingredient's forms as a substitute's link carries them, each with its group. */
const formsOf = (
  variants: IngredientSuggestionsQuery['ingredientSuggestions']['edges'][number]['node']['variants'],
): SubstituteForm[] =>
  variants.map(({ id, form, formChoice }) => ({
    id,
    form,
    group: formChoice?.group.name ?? null,
  }));

const substituteOptions = (data: IngredientSuggestionsQuery): ListOption[] =>
  data.ingredientSuggestions.edges.map(({ node, group }) => {
    // A held compendium entry reads under the label the coven gave it.
    const name = node.cupboardEntry?.label ?? node.name;
    const canonicalName = node.canonicalName ?? null;
    const link = {
      id: node.id,
      canonicalName,
      forms: node.variants.map((variant) => variant.form),
      description: node.description ?? null,
      isGlobal: node.isGlobal,
      variants: formsOf(node.variants),
    };
    return {
      // The label is what a linked entry reads as; the link is what is saved,
      // and what its pill's tooltip tells.
      value: name,
      label: qualified(name, canonicalName),
      // The server lists the cupboard first, then the compendium, so
      // the headings are the two groups; the tier stays a note.
      heading: group === 'yours' ? YOUR_INGREDIENTS : COMPENDIUM_HEADING,
      note: tierOf(link),
      key: node.id,
      link,
    };
  });

/** A compendium entry's row: its note is its forms, since every row is the compendium's. */
const compendiumOptions = (data: CompendiumSubstitutesQuery): ListOption[] =>
  data.compendium.edges.map(({ node }) => {
    const canonicalName = node.canonicalName ?? null;
    const forms = node.variants.map((variant) => variant.form);
    return {
      value: node.name,
      label: qualified(node.name, canonicalName),
      note: forms.length ? forms.map(formLabel).join(', ') : undefined,
      key: node.id,
      link: {
        id: node.id,
        canonicalName,
        forms,
        description: node.description ?? null,
        isGlobal: node.isGlobal,
        variants: formsOf(node.variants),
      },
    };
  });

/** The form suggestions for `text`, once it has settled, while `active`. */
export const useFormSuggestions: UseSuggestions<FormOption> = (workspaceId, text, active) =>
  useLookup(FormSuggestionsDocument, { workspaceId }, text, active, formOptions);

/** The common names in use. */
export const useCommonNameSuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(CommonNameSuggestionsDocument, { workspaceId }, text, active, commonNameOptions);

/** The celestial bodies, curated and in use. */
export const useCelestialBodySuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(CelestialBodySuggestionsDocument, { workspaceId }, text, active, celestialBodyOptions);

/** The zodiac signs, curated and in use. */
export const useZodiacSuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(ZodiacSuggestionsDocument, { workspaceId }, text, active, zodiacOptions);

/** The deities, curated under their traditions, and in use. */
export const useDeitySuggestions: UseSuggestions = (workspaceId, text, active) =>
  useLookup(DeitySuggestionsDocument, { workspaceId }, text, active, deityOptions);

/**
 * The ingredients a coven's substitute may link: the compendium's and its
 * own. Asked only by a coven's form; the compendium's asks
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
 * alone, searched as its list is, since a compendium substitute links
 * only the compendium.
 */
export const useCompendiumSubstitutes: UseSuggestions = (_workspaceId, text, active) =>
  useLookup(CompendiumSubstitutesDocument, {}, text, active, compendiumOptions);

/**
 * A variant's Form field, suggesting from the curated vocabulary and the forms in use. A pick links
 * a curated form and an edit away drops the link; on the compendium it must be a pick
 * (claude-docs/components/ingredient-form.md, "Suggestion lists and fields").
 */
export function FormField({ workspaceId, at, pickOnly }: FormFieldProps): ReactElement {
  const { control, getValues, setValue, clearErrors } = useFormContext<IngredientFormValues>();
  const text = useWatch({ control, name: `${at}.form` });
  const link = useWatch({ control, name: `${at}.formLink` });
  const [active, setActive] = useState(false);
  const suggestions = curatedOnly(useFormSuggestions(workspaceId, text, active), pickOnly);
  const renamed = renamedTo({ form: text, formLink: link });
  const settle = (use: boolean) => {
    // Keep unlinks without `shouldDirty` on the link: react-hook-form 7 throws
    // diffing a null against the object it was saved as. Dirtying the text
    // instead has it compare the whole form, which sees the link gone.
    if (!use) setValue(`${at}.formLink`, null);
    setValue(`${at}.form`, use && renamed !== undefined ? renamed : text, { shouldDirty: true });
    clearErrors(`${at}.form`);
  };
  return (
    <SuggestField
      name={`${at}.form`}
      label="Form"
      placeholder="Add a form"
      suggestions={suggestions}
      onActivate={() => setActive(true)}
      onPick={(option) => setValue(`${at}.formLink`, option?.link ?? null)}
      onEdit={(edited) => {
        if (edited !== getValues(`${at}.formLink`)?.name) setValue(`${at}.formLink`, null);
      }}
      qualifier={
        link?.group ? { text: link.group, detail: link.description ?? undefined } : undefined
      }
      // Before the name, as each row has it:
      // there while the box holds a pick, since an edit away drops the link.
      icon={link ? <FormIcon name={link.icon ?? null} /> : undefined}
      typedIcon={<FormIcon name={null} />}
      offerTyped={!pickOnly}
      note={renamed === undefined ? undefined : `This form is now called "${renamed}".`}
      after={
        renamed !== undefined && (
          <div className="ingredient-form__renamed">
            <button type="button" className="btn btn--small" onClick={() => settle(true)}>
              Use &quot;{renamed}&quot;
            </button>
            <button
              type="button"
              className="btn btn--small btn--quiet"
              onClick={() => settle(false)}
            >
              Keep &quot;{text.trim()}&quot;
            </button>
          </div>
        )
      }
    />
  );
}

/**
 * The suggestions less the rows in use alone, when `only`, listed flat with `curated` dropped:
 * what a pick-only box offers, since a value only in use is one the compendium refuses, and every
 * row left is the compendium's.
 */
export function curatedOnly<O extends ComboboxOption>(
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
  rank,
  ...list
}: LookupListFieldProps): ReactElement {
  const { control } = useFormContext();
  const text: string = useWatch({ control, name: draftOf(list.name) });
  const [active, setActive] = useState(false);
  const found = useSuggestions(workspaceId, text, active);
  const suggestions = useMemo(() => {
    const kept =
      omit === undefined
        ? found.options
        : found.options.filter((option) => option.link?.id !== omit);
    return { ...found, options: rank ? rank(kept) : kept };
  }, [found, omit, rank]);
  return (
    <ListField
      {...list}
      workspaceId={workspaceId}
      suggestions={suggestions}
      onActivate={() => setActive(true)}
    />
  );
}
