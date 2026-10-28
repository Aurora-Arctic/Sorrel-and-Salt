'use client';

import { type ReactElement, type ReactNode, useId } from 'react';
import { JarDrawing, pickJarShape } from '../JarShelf';
import { SpellComparison } from './comparison-panel';
import { SpellInventory } from './inventory';

// The Jar section's right-hand column (the owner's Option C2, 2026-10-28): the jar drawn
// with the Seal Wax Colour field to its right and the Jar Description beneath both, then what the coven holds against the steps, then the
// spell's intent against what the ingredients carry. It sits beside the step list where the
// dialog is wide enough and drops beneath it where it is not (index.scss).
// claude-docs/components/spell-builder.md, "The aside".

/**
 * A plain jar, muted: it stands for the spell's jar and is no stock, so it has no level.
 * Reuses the shelf's vessel; the seal wax colour is not drawn on it.
 */
function SpellJar(): ReactElement {
  return (
    <span className="spell-jar">
      <JarDrawing shape={pickJarShape('spell', 'jar')} held={null} />
    </span>
  );
}

export function JarAside({
  waxField,
  descriptionField,
  ready,
}: {
  /** The Seal Wax Colour field, drawn to the right of the jar. */
  waxField: ReactNode;
  /** The Jar Description field, beneath the jar and the wax field, the aside's full width. */
  descriptionField: ReactNode;
  /** Whether the steps have been read; until they have, the two readings are left out. */
  ready: boolean;
}): ReactElement {
  const headingId = useId();
  return (
    <aside className="spell-aside" aria-labelledby={headingId}>
      <h4 id={headingId}>The Jar</h4>
      <div className="spell-aside__jar">
        <SpellJar />
        <div className="spell-aside__fields">{waxField}</div>
      </div>
      {descriptionField}
      {ready && (
        <>
          <hr className="spell-aside__rule" />
          <SpellInventory />
          <hr className="spell-aside__rule" />
          <SpellComparison />
        </>
      )}
    </aside>
  );
}
