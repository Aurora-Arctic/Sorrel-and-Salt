'use client';

import NewTabHint from '@/components/LinkHint/new-tab-hint';
import { formLabel } from '@/modules/ingredients/validation/form-label';

import { useQuery } from '@tanstack/react-query';
import { createContext, type ReactElement, type ReactNode, useContext } from 'react';
import { graphql } from '../../gql';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { graphqlQuery } from '../../lib/graphql-client';
import FormIcon from '../FormIcon';
import Skeleton from '../Skeleton';
import type { EntrySummary } from '../Combobox/types';
import { ELEMENT_OPTIONS, NOMENCLATURE_OPTIONS, labelOf } from './options';
import type { EntryHref, SubstituteListEntry, SubstituteSummaryProps } from './types';
import { tierOf } from './values';

// A linked substitute's summary: what the ingredient is, read when its chip is pressed and not
// before, through /api/graphql (claude-docs/components/ingredient-form.md, "A linked substitute's
// summary").

const IngredientSummaryDocument = graphql(`
  query IngredientSummary($id: ID!, $workspaceId: ID) {
    ingredient(id: $id, workspaceId: $workspaceId) {
      id
      name
      canonicalName
      description
      nomenclature
      isGlobal
      slug
      elements
      celestialBodies
      zodiacSigns
      colors
      variants {
        id
        form
        formChoice {
          group {
            icon
          }
        }
        elements
        celestialBodies
        zodiacSigns
        colors
      }
    }
  }
`);

/**
 * Where a summary links its entry, when the page holding the form has a page
 * for it: none by default, and the dialogs that hold the form pass the real
 * routes (the public compendium page, or the admin's modal).
 */
export const EntryHrefContext = createContext<EntryHref | undefined>(undefined);

/** The ingredient's values beside a form's, which add to them and never take away. */
const joined = (own: readonly string[] | null, form: readonly string[] | null | undefined) => [
  ...new Set([...(own ?? []), ...(form ?? [])]),
];

/** The panel's content: loading, failed with a way to try again, or the entry. */
export function SubstituteSummary({
  link,
  variantId,
  workspaceId,
}: SubstituteSummaryProps): ReactElement {
  const hrefOf = useContext(EntryHrefContext);
  const { data, error, isPending, refetch, isRefetching } = useQuery({
    ...graphqlQuery(IngredientSummaryDocument, { id: link.id, workspaceId }),
    // A failed read says so in the panel; it never takes the form down.
    throwOnError: false,
  });

  if (isPending || (error && isRefetching)) {
    return (
      <div className="entry-summary__loading">
        <Skeleton shape="line" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="entry-summary__status">
        {/* The server's sentence, "No such ingredient" for one deleted since,
            or else "That didn't work. Please try again." */}
        <p role="alert">{readGraphqlFailure(error).alert}</p>
        <button type="button" className="btn btn--small" onClick={() => void refetch()}>
          Try Again
        </button>
      </div>
    );
  }

  const ingredient = data.ingredient;
  const form = variantId
    ? ingredient.variants.find((variant) => variant.id === variantId)
    : undefined;
  const facts: [string, ReactNode][] = [
    ['Classification', labelOf(NOMENCLATURE_OPTIONS, ingredient.nomenclature)],
    ...(form
      ? [
          [
            'Form',
            <>
              <FormIcon name={form.formChoice?.group.icon ?? null} /> {formLabel(form.form)}
            </>,
          ] as [string, ReactNode],
        ]
      : []),
    [
      'Elements',
      joined(ingredient.elements, form?.elements)
        .map((element) => labelOf(ELEMENT_OPTIONS, element))
        .join(', '),
    ],
    ['Celestial Bodies', joined(ingredient.celestialBodies, form?.celestialBodies).join(', ')],
    ['Zodiac Signs', joined(ingredient.zodiacSigns, form?.zodiacSigns).join(', ')],
    ['Colours', joined(ingredient.colors, form?.colors).join(', ')],
    ['Entry', tierOf(ingredient)],
  ];
  const href = hrefOf?.(ingredient);

  return (
    <>
      <p className="entry-summary__name">
        <strong>{ingredient.name}</strong>
        {ingredient.canonicalName && (
          <span className="entry-summary__formal">{ingredient.canonicalName}</span>
        )}
      </p>
      {/* Cut to its first lines on screen; read
          whole, since a screen reader has no ellipsis to see. */}
      {ingredient.description && (
        <p className="entry-summary__description">{ingredient.description}</p>
      )}
      <dl className="entry-summary__facts">
        {facts
          .filter(([, value]) => value !== '')
          .map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {href && (
        // A new tab, so the form and its unsaved changes stay where they are.
        <a className="entry-summary__link" href={href} target="_blank" rel="noopener noreferrer">
          Open Entry
          <NewTabHint />
        </a>
      )}
    </>
  );
}

/**
 * The summary a substitute's chip opens: a linked one's, named for its chip,
 * or none for typed text, which has nothing to open.
 */
export function substituteSummary(
  entry: SubstituteListEntry,
  text: string,
  workspaceId: string | null,
): EntrySummary | undefined {
  const { link, variantId } = entry;
  if (!link) return undefined;
  return {
    label: `About ${text}`,
    content: () => (
      <SubstituteSummary link={link} variantId={variantId} workspaceId={workspaceId} />
    ),
  };
}
