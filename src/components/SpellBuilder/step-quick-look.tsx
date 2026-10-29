'use client';

import { type ReactElement, useRef, useState } from 'react';
import { QuickLookButton } from '../IconTip';
import { DuplicateQuickLook } from '../IngredientForm/quick-look';

/** The coven a Quick Look reads in, and the URL segment of the entry page it links to. */
export type QuickLookCoven = { workspaceId: string; covenSlug: string };

// The Quick Look eye of an ingredient step, in a step row and In Coven Inventory alike. It opens
// `DuplicateQuickLook` over the builder, so nothing typed is lost; until the entry arrives the head
// shows only the name, since "Not yet looked up" would be false
// (claude-docs/components/spell-builder.md).
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
