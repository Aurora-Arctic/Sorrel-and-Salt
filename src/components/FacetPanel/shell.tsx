'use client';

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type SyntheticEvent,
  type TransitionEvent,
  type UIEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useHydrated } from '../../lib/hydrated';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useSlide } from '../../lib/use-slide';
import { fadesAreOff } from './choice-chip';
import { FacetCount } from './facet-count';
import type { FacetShellProps } from './types';
import './index.scss';

// The Filters button and the panel it opens (M12.4). The panel is a native `<dialog>`:
// from the tablet width up `show()` opens it over the results, sliding down without moving
// them, with no scrim and no inert page; below it `showModal()` opens it as a drawer sheet,
// and the browser supplies the backdrop, the inert page and Escape. Before the script runs
// nothing can open it, so it is drawn inline and open, and every control submits through
// the GET form around it; the Filters control is a link to it until then. See
// claude-docs/components/facet-panel.md.

/**
 * How long a leaving sheet waits for its slide out to end before it closes anyway: longer than
 * the slide (`$sheet-slide` in index.scss), for a browser that never reports its end.
 */
const LEAVE_LIMIT_MS = 400;

/**
 * The shell's tablet width and up, where the panel stops being a sheet and drops down over the
 * results. A script cannot read a Sass variable, so this repeats `$shell-tablet-width`
 * (`_variables.scss`); a test fails if the two part.
 */
export const WIDE = '(min-width: 56rem)';

/**
 * The Filters button, the Clear All beside it and the panel they open, around whatever filters a
 * list passes it: the ingredient lists pass FacetPanel's, the grimoire its categories (M10.11).
 */
export function FacetShell({
  count,
  clearHref,
  onApply,
  onClear,
  className,
  children,
}: FacetShellProps): ReactElement {
  const hydrated = useHydrated();
  const id = useId();
  const titleId = `${id}-title`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Whether this opening is the modal sheet, fixed when it opens.
  const modal = useRef(false);
  const slide = useSlide('facet-panel__clip');
  // The sheet sliding out: it stays open, with `is-closing` on it, until the slide ends.
  const [leaving, setLeaving] = useState(false);

  // Focus goes back to the button when it was inside the panel, so that a closing panel
  // never leaves it on a control that is about to disappear.
  const returnFocus = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.contains(document.activeElement)) buttonRef.current?.focus();
  };
  // The panel shuts, and what was changed in it is applied once: whichever way it shuts, the
  // Filters button, Escape, Close, the sheet's own Escape or the width changing under it.
  // Nothing happens when it is already shut, so a close that follows a close applies nothing twice.
  // `snap` shuts with no motion at all; otherwise the sheet slides out right and the panel slides up.
  // The sheet slides out before it closes, as a Modal waits out its fade; the panel slides, and motion turned
  // down, or no way to ask, closes either at once.
  const leave = () => {
    if (!modal.current || fadesAreOff()) {
      slide.close(modal.current);
      return;
    }
    setLeaving(true);
  };
  const finishLeaving = () => {
    setLeaving(false);
    slide.close(true);
  };
  const shut = (snap: boolean) => {
    if (!slide.shown) return;
    if (snap) {
      setLeaving(false);
      onApply?.();
      returnFocus();
      slide.close(true);
      return;
    }
    if (leaving) return;
    onApply?.();
    returnFocus();
    leave();
  };
  const dismiss = () => shut(false);
  // Apply Filters submits the form around the panel, which applies everything held, so
  // the panel only has to shut.
  const closeOnSubmit = () => {
    returnFocus();
    leave();
  };
  // Clear All empties what is held and applies at once; a panel left open shuts with it.
  const clear = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onClear || opensElsewhere(event)) return;
    event.preventDefault();
    onClear();
    if (slide.shown) closeOnSubmit();
  };

  // The dialog follows the slide: opened on its way open, closed once the slide has ended.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !hydrated) return;
    if (slide.shown && !dialog.open) {
      if (modal.current) dialog.showModal();
      else dialog.show();
      dialog.focus({ preventScroll: true });
    } else if (slide.state === 'closed' && dialog.open) {
      returnFocus();
      dialog.close();
    }
  });

  // The net for a slide whose end the browser never reports.
  useEffect(() => {
    if (!leaving) return undefined;
    const limit = setTimeout(finishLeaving, LEAVE_LIMIT_MS);
    return () => clearTimeout(limit);
  });

  // A press outside the open panel shuts it, applying what was held, as Escape does. The Filters
  // button and the bar's Clear All have their own press handlers, so they are left to them. On
  // the modal sheet the page is inert and the backdrop is the dialog's own box: see onPointerDown.
  useEffect(() => {
    if (!slide.shown) return undefined;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (modal.current || !(target instanceof Node)) return;
      if (dialogRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('.facet-panel__button, .facet-panel__clear')
      ) {
        return;
      }
      dismiss();
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  });

  // The sheet's backdrop belongs to the dialog itself, so a press that lands on the dialog and
  // not on anything in it is a press on the backdrop.
  // The sheet's own Escape would close it at once; it goes through the slide instead.
  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!modal.current) return;
    event.preventDefault();
    dismiss();
  };

  const onSlideEnd = (event: TransitionEvent<HTMLDialogElement>) => {
    if (leaving && event.target === event.currentTarget && event.propertyName === 'transform') {
      finishLeaving();
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDialogElement>) => {
    if (modal.current && event.target === event.currentTarget) dismiss();
  };

  // Crossing the tablet width swaps the panel's kind (an overlay for a sheet), so it shuts.
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const snap = () => shut(true);
    query.addEventListener('change', snap);
    return () => query.removeEventListener('change', snap);
  });

  const toggle = () => {
    if (slide.shown) {
      dismiss();
      return;
    }
    modal.current = !window.matchMedia(WIDE).matches;
    slide.open();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // An Escape a combobox popup used to close itself is not the panel's; a modal sheet's
    // own Escape is the browser's, which ends in `onClose`.
    if (event.key !== 'Escape' || event.defaultPrevented || modal.current) return;
    event.preventDefault();
    dismiss();
  };

  // The clip never scrolls: a focus moving into a hidden part of it would otherwise shift
  // the panel out of its slide.
  const onScroll = (event: UIEvent<HTMLElement>) => {
    event.currentTarget.scrollTop = 0;
  };

  const filtersLabel = (
    <>
      Filters
      {count > 0 && <FacetCount count={count} />}
    </>
  );
  const clip = hydrated ? slide.className : 'facet-panel__clip facet-panel__clip--open';

  return (
    <>
      {hydrated ? (
        <button
          ref={buttonRef}
          type="button"
          className="btn facet-panel__button"
          aria-expanded={slide.shown}
          aria-controls={id}
          onClick={toggle}
        >
          {filtersLabel}
        </button>
      ) : (
        <a className="btn facet-panel__button" href={`#${id}`}>
          {filtersLabel}
        </a>
      )}
      {count > 0 && (
        <a href={clearHref} className="facet-panel__clear" onClick={clear}>
          Clear All
        </a>
      )}
      <dialog
        ref={dialogRef}
        id={id}
        className={
          `facet-panel facet-panel--compact${hydrated ? '' : ' facet-panel--static'}` +
          (leaving ? ' is-closing' : '') +
          (className ? ` ${className}` : '')
        }
        tabIndex={-1}
        data-tip-boundary=""
        aria-labelledby={titleId}
        open={!hydrated}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onCancel={onCancel}
        onTransitionEnd={onSlideEnd}
        onClose={() => shut(true)}
      >
        <div
          className={clip}
          style={slide.style}
          onTransitionEnd={slide.onTransitionEnd}
          onScroll={onScroll}
        >
          <div className="facet-panel__inner">
            <div className="facet-panel__pad">
              <div className="facet-panel__head">
                <h2 id={titleId} className="facet-panel__title">
                  Filters
                </h2>
                <button
                  type="button"
                  className="btn btn--quiet facet-panel__phone-only"
                  onClick={dismiss}
                >
                  Close
                </button>
              </div>

              {children}

              <div className="facet-panel__foot">
                <button type="submit" className="btn btn--solid" onClick={closeOnSubmit}>
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn--quiet facet-panel__phone-only"
                  onClick={dismiss}
                >
                  Close
                </button>
                <a href={clearHref} onClick={clear}>
                  Clear All
                </a>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
