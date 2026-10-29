'use client';

import { type ReactElement, type ReactNode, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { GroupColors } from '../../lib/types';
import { JarDrawing, pickJarShape } from '../JarShelf';
import { useCategoryColors } from './category-colors';
import type { SpellStepsValues } from './steps/types';
import { isInstruction } from './steps/values';

// The Jar section's details, above its step list (the owner's call, 2026-10-29: with In Coven
// Inventory gone, one column): the jar drawn at the left, the Seal Wax field and the Jar
// Description stacked to its right. The jar fills as steps are added.
// claude-docs/components/spell-builder.md, "The jar details".

/**
 * The colour of a layer: the group colour of the step's first category in its listed order
 * (the ingredient's before its form's), skipping any not in a known group. A step with none
 * has none, and its layer stays the muted ink.
 */
function groupOf(
  categories: readonly { id: string }[],
  colors: ReadonlyMap<string, GroupColors>,
): GroupColors | null {
  for (const { id } of categories) {
    const pair = colors.get(id);
    if (pair) return pair;
  }
  return null;
}

/**
 * A plain jar, muted: it stands for the spell's jar and is no stock, so it has no level.
 * Reuses the shelf's vessel; the seal wax colour is not drawn on it. It fills with one band
 * per ingredient step, one-offs included and instructions not.
 */
function SpellJar(): ReactElement {
  const { control } = useFormContext<SpellStepsValues>();
  const steps = useWatch({ control, name: 'steps' }) ?? [];
  const colors = useCategoryColors();
  const bands = useMemo(
    () =>
      steps.filter((step) => !isInstruction(step)).map((step) => groupOf(step.categories, colors)),
    [steps, colors],
  );
  return (
    <span className="spell-jar">
      <JarDrawing shape={pickJarShape('spell', 'jar')} held={null} bands={bands} />
    </span>
  );
}

export function JarDetails({
  waxField,
  descriptionField,
}: {
  /** The Seal Wax field, the first of the two beside the jar. */
  waxField: ReactNode;
  /** The Jar Description field, beneath the Seal Wax field. */
  descriptionField: ReactNode;
}): ReactElement {
  return (
    <div className="jar-details" role="group" aria-label="Jar Details">
      <SpellJar />
      <div className="jar-details__fields">
        {waxField}
        {descriptionField}
      </div>
    </div>
  );
}
