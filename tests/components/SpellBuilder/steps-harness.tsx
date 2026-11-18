import { FormProvider, useForm } from 'react-hook-form';
import { SpellSteps } from '@/components/SpellBuilder/steps';
import { stepValueOf } from '@/components/SpellBuilder/steps/values';
import type { SpellBuilderSpell, SpellBuilderValues } from '@/components/SpellBuilder/types';
import { offerCategories } from '../../support/msw/ingredient-lookups';
import { renderWithQuery } from '../../support/render-with-query';

// The builder's steps field alone in a form of its own, for a test that proves one step's behaviour.
// It has no resolver: a refusal said on Save, and the unit rule, are the builder's, so their
// tests render the whole builder.

type HarnessValues = Pick<SpellBuilderValues, 'steps' | 'categoryIds'>;

export function renderSpellSteps({
  steps = [],
  categoryIds = [],
  categories = [],
}: {
  /** Saved steps the jar opens with, closed as a saved spell's are. */
  steps?: SpellBuilderSpell['steps'];
  /** The spell's own categories, which the picker sorts and filters by. */
  categoryIds?: string[];
  categories?: Parameters<typeof offerCategories>[0];
} = {}) {
  offerCategories(categories);
  const Harness = () => {
    const methods = useForm<HarnessValues>({
      defaultValues: { steps: steps.map(stepValueOf), categoryIds },
    });
    return (
      <FormProvider {...methods}>
        <SpellSteps workspaceId="w1" />
      </FormProvider>
    );
  };
  return renderWithQuery(<Harness />);
}
