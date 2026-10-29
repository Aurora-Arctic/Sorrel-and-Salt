'use client';

import { type ReactElement, useRef, useState } from 'react';
import { QuickLookButton } from '../IconTip';
import { DuplicateQuickLook } from '../IngredientForm/quick-look';

/** The coven a Quick Look reads in, and the URL segment of the entry page it links to. */
export type QuickLookCoven = { workspaceId: string; covenSlug: string };

// The small Quick Look eye of an ingredient step, drawn in a step row and in In Coven Inventory
// alike so the two match. It opens the entry's details in a modal over the builder
// (`DuplicateQuickLook`, which needs no route), so nothing typed is lost to a navigation; the focus
// goes back to the eye when it closes. The modal's head reads only the name until the entry
// arrives, with a line skeleton where the formal name goes: a step carries no formal name, and
// saying "Not yet looked up" would be false. claude-docs/components/spell-builder.md.
export function StepQuickLook({
  ingredientId,
  name,
  look,
}: {
  ingredientId: string;
  name: string;
  look: QuickLookCoven;
}): ReactElement {
  const [looking, setLooking] = useState(false);
  const eye = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <QuickLookButton ref={eye} name={name} size="small" onClick={() => setLooking(true)} />
      {looking && (
        <DuplicateQuickLook
          id={ingredientId}
          entry={{ name }}
          workspaceId={look.workspaceId}
          pageHref={`/coven/${look.covenSlug}/ingredients/${ingredientId}`}
          onClose={() => setLooking(false)}
          returnTo={() => eye.current}
        />
      )}
    </>
  );
}
