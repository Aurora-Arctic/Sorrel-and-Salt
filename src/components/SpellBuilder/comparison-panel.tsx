'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { graphqlQuery } from '../../lib/graphql-client';
import { CategoriesDocument } from '../IngredientForm/categories';
import type { SpellBuilderValues } from './types';
import { compareSpellCategories } from '@/modules/grimoire/validation/categories/compare';
import { summarizeSpellCategories } from '@/modules/grimoire/validation/categories/summarize';
import type { SpellStepValue, StepCategory } from './steps/types';
import { stepNameOf } from './steps/values';

// The intent-against-ingredients panel (M10.17, story 52): the categories the
// author assigned set beside the ones the jar's ingredients carry, with the gap
// named in each direction. It reads what the builder holds now, saved or not,
// through M10.8's pure comparison, so it moves as a pick or an ingredient does.
// The second list is one list at two levels of emphasis, said in words and not
// by weight or colour alone: an ingredient that carries nothing intended leads
// it and says so; one that also carries an intended category is a footnote.
// See claude-docs/components/spell-builder.md, "The comparison panel".

export interface ComparisonPanelProps {
  /** The categories the spell is assigned, named. */
  intended: readonly StepCategory[];
  steps: readonly SpellStepValue[];
}

interface Stray {
  key: string;
  name: string;
  /** What it carries that was not intended. */
  unintended: StepCategory[];
  /** What it carries that was. */
  intended: StepCategory[];
}

const names = (categories: readonly StepCategory[]): string =>
  categories.map(({ name }) => name).join(', ');

/** The ingredients bringing something unintended, those carrying nothing intended first. */
function strays(steps: readonly SpellStepValue[], intended: ReadonlySet<string>): Stray[] {
  const list = steps.flatMap((step, index) => {
    if (step.ingredientId === null) return [];
    const unintended = step.categories.filter(({ id }) => !intended.has(id));
    if (unintended.length === 0) return [];
    return [
      {
        key: `${index}-${step.variantId ?? step.ingredientId}`,
        name: stepNameOf(step),
        unintended,
        intended: step.categories.filter(({ id }) => intended.has(id)),
      },
    ];
  });
  // Stable, so the jar's own order holds within each level.
  return [
    ...list.filter((s) => s.intended.length === 0),
    ...list.filter((s) => s.intended.length > 0),
  ];
}

export function ComparisonPanel({ intended, steps }: ComparisonPanelProps): ReactElement {
  const intendedIds = intended.map(({ id }) => id);
  const present = summarizeSpellCategories(
    steps.map((step) => ({
      ingredientId: step.ingredientId,
      categoryIds: step.categories.map(({ id }) => id),
    })),
  );
  const gaps = compareSpellCategories(intendedIds, present);
  const notCarried = intended.filter(({ id }) => gaps.intendedNotPresent.includes(id));
  // With nothing intended every ingredient would read as a stray, which says nothing.
  const carried = intended.length === 0 ? [] : strays(steps, new Set(intendedIds));

  let body: ReactElement;
  if (intended.length === 0 && present.length === 0) {
    body = <p>Nothing to compare yet. Pick categories and add ingredients.</p>;
  } else if (intended.length === 0) {
    body = <p>Pick categories above to see what the jar adds beyond them.</p>;
  } else if (notCarried.length === 0 && carried.length === 0) {
    body = <p>Intent and ingredients match.</p>;
  } else {
    body = (
      <>
        {notCarried.length > 0 && (
          <section>
            <h5>Intended, Not Carried</h5>
            <ul aria-label="Intended, Not Carried">
              {notCarried.map(({ id, name }) => (
                <li key={id}>{name}: nothing in the jar carries it</li>
              ))}
            </ul>
          </section>
        )}
        {carried.length > 0 && (
          <section>
            <h5>Carried, Not Intended</h5>
            <ul aria-label="Carried, Not Intended">
              {carried.map((stray) => (
                <li
                  key={stray.key}
                  className={`comparison-panel__stray${stray.intended.length === 0 ? ' is-unplaced' : ''}`}
                >
                  {stray.intended.length === 0 ? (
                    <>
                      <strong>{stray.name}</strong> adds {names(stray.unintended)}.{' '}
                      <strong>Carries nothing you intended.</strong>
                    </>
                  ) : (
                    <>
                      {stray.name} adds {names(stray.unintended)}. Also carries{' '}
                      {names(stray.intended)}.
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  return (
    <aside className="comparison-panel" aria-label="Intent Against Ingredients">
      <h4>Intent Against Ingredients</h4>
      {body}
    </aside>
  );
}

/**
 * The panel on the builder's own values: the picks as they stand and the jar as
 * it stands, saved or not. The names of the picks come from the categories the
 * picker already asked for (the same query, so one request).
 */
export function SpellComparison(): ReactElement {
  const { control } = useFormContext<SpellBuilderValues>();
  const watchedPicks = useWatch({ control, name: 'categoryIds' });
  const steps = useWatch({ control, name: 'steps' }) ?? [];
  const { data } = useQuery({ ...graphqlQuery(CategoriesDocument), throwOnError: false });
  const intended = useMemo(() => {
    const byId = new Map(data?.categories.edges.map(({ node }) => [node.id, node]));
    // A pick whose name has not landed yet is left out until it does.
    return (watchedPicks ?? []).flatMap((id) => {
      const found = byId.get(id);
      return found ? [{ id, name: found.name }] : [];
    });
  }, [data, watchedPicks]);
  return <ComparisonPanel intended={intended} steps={steps} />;
}
