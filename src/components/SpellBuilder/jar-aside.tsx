'use client';

import { type ReactElement, type ReactNode, useId, useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { GroupColors } from '../../lib/types';
import { JarDrawing, pickJarShape } from '../JarShelf';
import { useCategoryColors } from './category-colors';
import { SpellComparison } from './comparison-panel';
import type { SpellStepsValues } from './steps/types';
import { isInstruction } from './steps/values';

// The Jar section's right-hand column (the owner's Option C2, 2026-10-28): the jar drawn
// with the Seal Wax field to its right and the Jar Description beneath both, then the
// spell's intent against what the ingredients carry. It sits beside the step list where the
// dialog is wide enough and drops beneath it where it is not (index.scss).
// claude-docs/components/spell-builder.md, "The aside".

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

export function JarAside({
  waxField,
  descriptionField,
  ready,
}: {
  /** The Seal Wax field, drawn to the right of the jar. */
  waxField: ReactNode;
  /** The Jar Description field, beneath the jar and the wax field, the aside's full width. */
  descriptionField: ReactNode;
  /** Whether the steps have been read; until they have, the reading is left out. */
  ready: boolean;
}): ReactElement {
  const headingId = useId();
  return (
    <aside className="spell-aside" aria-labelledby={headingId}>
      <div className="spell-aside__block">
        <h4 id={headingId}>The Jar</h4>
        <div className="spell-aside__jar">
          <SpellJar />
          <div className="spell-aside__fields">{waxField}</div>
        </div>
        {descriptionField}
      </div>
      {ready && (
        <SpellComparison />
      )}
    </aside>
  );
}
