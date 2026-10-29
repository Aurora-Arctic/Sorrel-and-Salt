'use client';

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useId, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CategoriesDocument } from '../IngredientForm/categories';
import { graphqlQuery } from '../../lib/graphql-client';
import { useCategoryColors } from './category-colors';
import CategoryChips, { type CardCategory } from '../CategoryChips';
import type { GroupColors } from '../../lib/types';
import type { SpellBuilderValues } from './types';
import { compareSpellCategories } from '@/modules/grimoire/validation/categories/compare';
import { summarizeSpellCategories } from '@/modules/grimoire/validation/categories/summarize';
import type { SpellStepValue, StepCategory } from './steps/types';
import { stepNameOf } from './steps/values';

// Category Match (M10.17, story 52), in the Jar's aside: the categories the
// author assigned set beside the ones the jar's ingredients carry, in three rows. Carried
// is intended and present, Missing intended and absent from the jar, Stray present but not
// intended. A row with nothing in it is
// left out. The words lead each row and carry it alone.
// It reads what the builder holds now, saved or not, through M10.8's pure comparison.
// See claude-docs/components/spell-builder.md, "The comparison panel".

export interface ComparisonPanelProps {
  /** The categories the spell is assigned, named. */
  intended: readonly StepCategory[];
  steps: readonly SpellStepValue[];
  /** Each category's group colours by id, so a chip is drawn as the site draws one; a category not in it is left out. */
  groups: ReadonlyMap<string, GroupColors>;
}

// The chips are the compact size, the one the admin Compendium table's Categories column uses,
// and every one is drawn: the panel is a comparison, so none is folded behind a +N.
function Row({
  label,
  categories,
  tipOf,
}: {
  label: string;
  categories: readonly CardCategory[];
  tipOf: (category: CardCategory['category']) => string;
}): ReactElement | null {
  if (categories.length === 0) return null;
  return (
    <div className="comparison-panel__row">
      <dt>{label}</dt>
      <dd>
        <CategoryChips categories={categories} label={label} compact showAll tipOf={tipOf} />
      </dd>
    </div>
  );
}

/**
 * The comparison of the assigned categories with what the jar's steps carry: the one derivation
 * Category Match draws from and the Add to Jar picker orders its rows by (Missing first).
 */
export function compareJar(intendedIds: readonly string[], steps: readonly SpellStepValue[]) {
  const present = summarizeSpellCategories(
    steps.map((step) => ({
      ingredientId: step.ingredientId,
      categoryIds: step.categories.map(({ id }) => id),
    })),
  );
  return compareSpellCategories(intendedIds, present);
}

export function ComparisonPanel({ intended, steps, groups }: ComparisonPanelProps): ReactElement {
  const headingId = useId();
  const intendedIds = intended.map(({ id }) => id);
  const ingredientSteps = steps.filter((step) => step.ingredientId !== null);
  const gaps = compareJar(intendedIds, steps);
  const missing = intended.filter(({ id }) => gaps.intendedNotPresent.includes(id));
  const carried = intended.filter(({ id }) => !gaps.intendedNotPresent.includes(id));
  const chipsOf = (list: readonly StepCategory[]): CardCategory[] =>
    list.flatMap(({ id, name }) => {
      const group = groups.get(id);
      return group ? [{ category: { id, name }, group }] : [];
    });
  // The ingredients carrying a category, in the jar's order: what a Carried or Stray chip's tip names.
  const fromTip = ({ id }: { id: string }): string =>
    `From ${ingredientSteps
      .filter((step) => step.categories.some((c) => c.id === id))
      .map(stepNameOf)
      .join(', ')}`;
  const missingTip = (): string => 'Assigned to this spell, and nothing in the jar carries it';
  // Each stray category, once, named by the first ingredient that carries it.
  const strays = gaps.presentNotIntended.flatMap((id) => {
    const name = ingredientSteps.flatMap((step) => step.categories).find((c) => c.id === id)?.name;
    return name === undefined ? [] : [{ id, name }];
  });

  let body: ReactElement;
  if (intended.length === 0 && steps.length === 0) {
    body = <p className="spell-aside__empty">Nothing to compare yet.</p>;
  } else if (intended.length === 0) {
    body = <p className="spell-aside__empty">Assign categories to compare.</p>;
  } else {
    body = (
      <dl className="comparison-panel__rows">
        <Row label="Carried" categories={chipsOf(carried)} tipOf={fromTip} />
        <Row label="Missing" categories={chipsOf(missing)} tipOf={missingTip} />
        <Row label="Stray" categories={chipsOf(strays)} tipOf={fromTip} />
      </dl>
    );
  }

  return (
    <section className="comparison-panel" aria-labelledby={headingId}>
      <h5 id={headingId}>Category Match</h5>
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
  const groups = useCategoryColors();
  const intended = useMemo(() => {
    const byId = new Map(data?.categories.edges.map(({ node }) => [node.id, node]));
    // A pick whose name has not landed yet is left out until it does.
    return (watchedPicks ?? []).flatMap((id) => {
      const found = byId.get(id);
      return found ? [{ id, name: found.name }] : [];
    });
  }, [data, watchedPicks]);
  return <ComparisonPanel intended={intended} steps={steps} groups={groups} />;
}
