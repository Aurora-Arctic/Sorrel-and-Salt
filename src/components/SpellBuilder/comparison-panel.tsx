'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useId, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { graphqlQuery } from '../../lib/graphql-client';
import { CategoriesDocument } from '../IngredientForm/categories';
import type { SpellBuilderValues } from './types';
import { compareSpellCategories } from '@/modules/grimoire/validation/categories/compare';
import { summarizeSpellCategories } from '@/modules/grimoire/validation/categories/summarize';
import type { SpellStepValue, StepCategory } from './steps/types';
import { stepNameOf } from './steps/values';

// Intent Against Ingredients (M10.17, story 52), in the Jar's aside: the categories the
// author assigned set beside the ones the jar's ingredients carry, in three rows. Carried
// is intended and present, Missing intended and absent from the jar, Stray present but not
// intended, each stray naming the ingredient(s) bringing it. A row with nothing in it is
// left out. The words lead each row, so neither colour nor the chip's outline carries it.
// It reads what the builder holds now, saved or not, through M10.8's pure comparison.
// See claude-docs/components/spell-builder.md, "The comparison panel".

export interface ComparisonPanelProps {
  /** The categories the spell is assigned, named. */
  intended: readonly StepCategory[];
  steps: readonly SpellStepValue[];
}

function Row({
  label,
  kind,
  children,
}: {
  label: string;
  kind: 'carried' | 'missing' | 'stray';
  children: ReactElement[];
}): ReactElement | null {
  if (children.length === 0) return null;
  return (
    <div className="comparison-panel__row">
      <dt>{label}</dt>
      <dd>
        <ul className={`comparison-panel__chips is-${kind}`}>{children}</ul>
      </dd>
    </div>
  );
}

export function ComparisonPanel({ intended, steps }: ComparisonPanelProps): ReactElement {
  const headingId = useId();
  const intendedIds = intended.map(({ id }) => id);
  const ingredientSteps = steps.filter((step) => step.ingredientId !== null);
  const present = summarizeSpellCategories(
    steps.map((step) => ({
      ingredientId: step.ingredientId,
      categoryIds: step.categories.map(({ id }) => id),
    })),
  );
  const gaps = compareSpellCategories(intendedIds, present);
  const missing = intended.filter(({ id }) => gaps.intendedNotPresent.includes(id));
  const carried = intended.filter(({ id }) => !gaps.intendedNotPresent.includes(id));
  // Each stray category, once, with the ingredients bringing it in the jar's order.
  const strays = gaps.presentNotIntended.flatMap((id) => {
    const bringers = ingredientSteps.filter((step) => step.categories.some((c) => c.id === id));
    const name = bringers[0]?.categories.find((c) => c.id === id)?.name;
    return name === undefined ? [] : [{ id, name, bringers: bringers.map(stepNameOf) }];
  });

  let body: ReactElement;
  if (intended.length === 0 && steps.length === 0) {
    body = <p className="spell-aside__empty">Nothing to compare yet.</p>;
  } else if (intended.length === 0) {
    body = <p className="spell-aside__empty">Assign categories to compare.</p>;
  } else {
    body = (
      <dl className="comparison-panel__rows">
        <Row label="Carried" kind="carried">
          {carried.map(({ id, name }) => (
            <li key={id}>{name}</li>
          ))}
        </Row>
        <Row label="Missing" kind="missing">
          {missing.map(({ id, name }) => (
            <li key={id}>{name}</li>
          ))}
        </Row>
        <Row label="Stray" kind="stray">
          {strays.map(({ id, name, bringers }) => (
            <li key={id}>
              {name}
              <span className="comparison-panel__from"> from {bringers.join(', ')}</span>
            </li>
          ))}
        </Row>
      </dl>
    );
  }

  return (
    <section className="comparison-panel" aria-labelledby={headingId}>
      <h5 id={headingId}>Intent Against Ingredients</h5>
      {body}
    </section>
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
