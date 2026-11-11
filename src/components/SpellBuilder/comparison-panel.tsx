'use client';

import EmptyState from '../EmptyState';
import { type ReactElement, useId, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useCategoryIndex } from '../CategoryPicker/categories';
import CategoryChips, { type CardCategory } from '../CategoryChips';
import type { GroupColors } from '../../lib/types';
import type { SpellBuilderValues } from './types';
import { compareSpellCategories } from '@/modules/grimoire/validation/categories/compare';
import { summarizeSpellCategories } from '@/modules/grimoire/validation/categories/summarize';
import type { SpellStepValue, StepCategory } from './steps/types';
import { stepNameOf } from './steps/values';
import { CATEGORY_MATCH_TITLE } from '../SpellRecipe/sections';

// Category Match: the assigned categories set against the jar's, as Carried, Missing and Extra rows (empty rows left out), read from the builder's current state
// (claude-docs/components/spell-builder.md, "The comparison panel").

export interface ComparisonPanelProps {
  intended: readonly StepCategory[];
  steps: readonly SpellStepValue[];
  /** Each category's group colours by id, so a chip is drawn as the site draws one; a category not in it is left out. */
  groups: ReadonlyMap<string, GroupColors>;
  heading?: 'h2' | 'h4';
  id?: string;
}

// Carried and Missing draw every chip; Extra has no bound, so it draws its first `EXTRA_CHIP_LIMIT`
// and folds the rest behind CategoryChips' own +N.
const EXTRA_CHIP_LIMIT = 8;

function Row({
  label,
  categories,
  tipOf,
  absent = false,
  limit,
}: {
  absent?: boolean;
  limit?: number;
  label: string;
  categories: readonly CardCategory[];
  tipOf: (category: CardCategory['category']) => string;
}): ReactElement | null {
  if (categories.length === 0) return null;
  return (
    <div className="comparison-panel__row">
      <dt>{label}</dt>
      <dd>
        <CategoryChips
          categories={categories}
          label={label}
          compact
          absent={absent}
          showAll={limit === undefined}
          limit={limit}
          tipOf={tipOf}
        />
      </dd>
    </div>
  );
}

/** The one derivation Category Match draws from and the Add to Jar picker orders its rows by. */
export function compareJar(intendedIds: readonly string[], steps: readonly SpellStepValue[]) {
  const present = summarizeSpellCategories(
    steps.map((step) => ({
      ingredientId: step.ingredientId,
      categoryIds: step.categories.map(({ id }) => id),
    })),
  );
  return compareSpellCategories(intendedIds, present);
}

export function ComparisonPanel({
  intended,
  steps,
  groups,
  heading: Heading = 'h4',
  id,
}: ComparisonPanelProps): ReactElement {
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
  const fromTip = ({ id }: { id: string }): string =>
    `From ${ingredientSteps
      .filter((step) => step.categories.some((c) => c.id === id))
      .map(stepNameOf)
      .join(', ')}`;
  const missingTip = (): string => 'Assigned to this spell, and nothing in the jar carries it.';
  const extras = gaps.presentNotIntended.flatMap((id) => {
    const name = ingredientSteps.flatMap((step) => step.categories).find((c) => c.id === id)?.name;
    return name === undefined ? [] : [{ id, name }];
  });

  let body: ReactElement;
  if (intended.length === 0 && steps.length === 0) {
    body = <EmptyState size="compact">Nothing to compare yet.</EmptyState>;
  } else if (intended.length === 0) {
    body = <EmptyState size="compact">Assign categories to compare.</EmptyState>;
  } else {
    body = (
      <dl className="comparison-panel__rows">
        <Row label="Carried" categories={chipsOf(carried)} tipOf={fromTip} />
        <Row label="Missing" categories={chipsOf(missing)} absent tipOf={missingTip} />
        <Row label="Extra" categories={chipsOf(extras)} tipOf={fromTip} limit={EXTRA_CHIP_LIMIT} />
      </dl>
    );
  }

  return (
    <section id={id} className="comparison-panel" aria-labelledby={headingId}>
      <Heading id={headingId}>{CATEGORY_MATCH_TITLE}</Heading>
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
  const { names, colors } = useCategoryIndex();
  const intended = useMemo(
    () =>
      // A pick whose name has not landed yet is left out until it does.
      (watchedPicks ?? []).flatMap((id) => {
        const name = names.get(id);
        return name === undefined ? [] : [{ id, name }];
      }),
    [names, watchedPicks],
  );
  return <ComparisonPanel intended={intended} steps={steps} groups={colors} />;
}
