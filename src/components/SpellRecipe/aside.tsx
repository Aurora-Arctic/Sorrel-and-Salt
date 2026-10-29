'use client';

import { type ReactElement, useMemo } from 'react';
import { QuickLookLink } from '../IconTip';
import { DETAILS_PLACE, detailsHeading } from '../IngredientEntry/details';
import { ComparisonPanel } from '../SpellBuilder/comparison-panel';
import { InCovenInventory, type LineDoors } from '../SpellBuilder/inventory';
import type { SpellStepValue } from '../SpellBuilder/steps/types';
import type { SpellRecipeAsideProps } from './types';
// The two panels' own styles live with the builder, whose index.tsx loads them; the page
// mounts the builder's dialog too, but the column loads them itself rather than by that chance.
import '../SpellBuilder/index.scss';

// The recipe page's side column (M13.21; the owner, 2026-10-29): Category Match and In Coven
// Inventory, the builder's Jar aside panels, read for the saved spell and laid out as the
// ingredient entry page lays its side column, beside the text past a tablet's width and beneath
// it on a phone. The page alone draws it; the Quick Look modal keeps to the recipe body. Both
// panels are read-only here, as they are in the builder: the page hands them the saved steps.
// A client part because the panels are; the landmark around them is SpellRecipe's own.
// claude-docs/components/spell-recipe.md, "The side column".

export default function SpellRecipeAside({
  steps,
  doors,
  intended,
  groups,
}: SpellRecipeAsideProps): ReactElement {
  const colours = useMemo(() => new Map(groups), [groups]);
  const doorsByStep = useMemo(() => new Map(doors.map((door) => [door.stepId, door])), [doors]);
  // A line's doors (the owner, 2026-10-29): the Quick Look eye, as the recipe's steps carry it,
  // opening the ingredient's details over the page, and Edit Stock behind the jar and the name.
  const doorsOf = (step: SpellStepValue): LineDoors | undefined => {
    const door = step.stepId === null ? undefined : doorsByStep.get(step.stepId);
    if (!door) return undefined;
    return {
      look: door.look && (
        <QuickLookLink
          href={door.look.href}
          name={door.look.name}
          heading={detailsHeading(door.look)}
          place={DETAILS_PLACE}
        />
      ),
      edit: door.stock ?? undefined,
    };
  };
  return (
    <>
      {/* Category Match first, over the inventory (the owner, 2026-10-29): the builder's order reversed. */}
      <ComparisonPanel intended={intended} steps={steps} groups={colours} heading="h2" />
      <InCovenInventory steps={steps} heading="h2" doorsOf={doorsOf} />
    </>
  );
}
