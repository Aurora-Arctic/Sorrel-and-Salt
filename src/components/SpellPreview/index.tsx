'use client';

import { type ReactElement, useEffect, useRef, useState } from 'react';
import StepRow from '../StepRow';
import type { SpellPreviewProps } from './types';
import './index.scss';

// Spell Preview (M13.12): a Preview button that opens the spell in a pane of its own, with
// the title, the ingredients with their amounts and the steps, and nothing else, so it can be
// followed without distraction. A native modal `<dialog>` in the top layer, which already covers the
// window, holds the page inert and gives Escape; true full screen is added on top where the browser
// has it (claude-docs/components/spell-preview.md).

export default function SpellPreview({ title, steps }: SpellPreviewProps): ReactElement {
  const [open, setOpen] = useState(false);
  const pane = useRef<HTMLDialogElement>(null);
  // Set once the pane is in full screen, so leaving it (which is Escape's first press there) closes
  // the pane, and a pane that never got full screen is not closed by an unrelated change.
  const inFullscreen = useRef(false);

  useEffect(() => {
    const dialog = pane.current;
    if (!dialog) return;
    // `close()` gives the focus back to Preview itself and leaves the recipe page where it was.
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    // Past the browser floor on some engines (iPhone Safari has no element full screen): a pure
    // enhancement behind a `typeof` check, with the dialog covering the window as the fallback.
    if (typeof dialog.requestFullscreen === 'function') {
      dialog.requestFullscreen().then(
        () => {
          inFullscreen.current = true;
        },
        () => undefined,
      );
    }
    const onChange = (): void => {
      if (document.fullscreenElement) inFullscreen.current = true;
      else if (inFullscreen.current) setOpen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      inFullscreen.current = false;
      // The pane is gone, which ends full screen on its own; asking too keeps the browser's state tidy.
      if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [open]);

  const close = (): void => setOpen(false);

  return (
    <>
      <button type="button" className="btn btn--quiet" onClick={() => setOpen(true)}>
        Preview
      </button>
      <dialog
        ref={pane}
        className="spell-preview"
        aria-labelledby="spell-preview-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <button type="button" className="btn btn--quiet spell-preview__close" onClick={close}>
          Close
        </button>
        <h2 id="spell-preview-title" className="spell-preview__title">
          {title}
        </h2>
        {steps.length === 0 ? (
          <p className="meta">This spell has no steps yet.</p>
        ) : (
          <ol className="spell-preview__steps" aria-label="Steps">
            {steps.map((step, i) =>
              step.kind === 'instruction' ? (
                <StepRow key={step.id} position={i + 1} name={null} body={step.body} />
              ) : (
                <StepRow
                  key={step.id}
                  position={i + 1}
                  name={step.name}
                  quantity={step.quantity}
                  unit={step.unit}
                  body={step.body}
                />
              ),
            )}
          </ol>
        )}
      </dialog>
    </>
  );
}
