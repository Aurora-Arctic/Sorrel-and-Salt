'use client';

import { useSearchParams } from 'next/navigation';
import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';
import IconTip, { CloseIcon, MysticEyeIcon, PreviewButton } from '../IconTip';
import { SpellCardFilters } from '../SpellCard';
import SpellRecipeBody from '../SpellRecipe/body';
import SpellRecipeSummary from '../SpellRecipe/summary';
import { holdPage } from '../Modal/page-hold';
import { EDGE_EMBERS, HEARTH_EMBERS } from './embers';
import type { Ember, SpellPreviewProps } from './types';
import { useWakeLock } from './use-wake-lock';
import './index.scss';

// Spell Preview: a Preview button that opens the spell in a pane of its own, with
// everything the printed spell shows, and no links or controls, so it can be followed without
// distraction. A native modal `<dialog>` in the top layer, which already covers the
// window, holds the page inert and gives Escape; true full screen is added on top where the browser
// has it (claude-docs/components/spell-preview.md). The pane is open while the address carries
// `?preview`, which is its one source of truth: a direct link or a refresh opens it, and Back closes it.

const PREVIEW = 'preview';

// The address with `?preview` added or dropped, keeping the other parameters and the fragment.
function addressWith(preview: boolean): string {
  const { pathname, search, hash } = window.location;
  const rest = new URLSearchParams(search);
  rest.delete(PREVIEW);
  const query = rest.toString();
  const next = preview ? (query ? `${query}&${PREVIEW}` : PREVIEW) : query;
  return `${pathname}${next ? `?${next}` : ''}${hash}`;
}

// An ember's place, size and timing, as custom properties its stylesheet reads.
const emberStyle = (ember: Ember): CSSProperties =>
  ({
    '--x': ember.x === undefined ? undefined : `${ember.x}%`,
    '--r': ember.right === undefined ? undefined : `${ember.right}rem`,
    '--b': ember.bottom === undefined ? undefined : `${ember.bottom}rem`,
    '--w': `${ember.w}px`,
    '--h': `${ember.h}px`,
    '--br': ember.br,
    '--d': `${ember.d}s`,
    '--delay': `-${ember.delay}s`,
    '--sway': `${ember.sway}px`,
  }) as CSSProperties;

const embers = (list: readonly Ember[], edge: boolean): ReactElement[] =>
  list.map((ember, i) => (
    <i
      key={i}
      className={[
        'spell-preview__ember',
        `spell-preview__ember--${ember.kind}`,
        edge && 'spell-preview__ember--edge',
      ]
        .filter(Boolean)
        .join(' ')}
      style={emberStyle(ember)}
    />
  ));

// The background: the page smouldering from its foot corner as a spell card does under the pointer,
// a hearth glow under the burn, and embers rising from the glow and from the charred edge. Decoration
// only: hidden from assistive technology, behind the content, taking no pointer. The spell page has
// no other copy of the card's burn filter, so the pane carries one while open.
const Scene = (): ReactElement => (
  <>
    <SpellCardFilters />
    <div className="spell-preview__scene" aria-hidden="true">
      <span className="spell-preview__glow" />
      <span className="spell-preview__face">
        <span className="spell-preview__face-paper">
          <span className="spell-preview__face-corner">
            <span className="spell-preview__face-hole" />
          </span>
        </span>
      </span>
      <span className="spell-preview__hearth" />
      <span className="spell-preview__embers">{embers(HEARTH_EMBERS, false)}</span>
      <span className="spell-preview__burn">
        <span className="spell-preview__burn-paper">
          <span className="spell-preview__burn-corner">
            <span className="spell-preview__burn-hole" />
          </span>
          <span className="spell-preview__burn-curve" />
        </span>
      </span>
      <span className="spell-preview__embers">{embers(EDGE_EMBERS, true)}</span>
    </div>
  </>
);

export default function SpellPreview(props: SpellPreviewProps): ReactElement {
  const { title, steps } = props;
  const open = useSearchParams().has(PREVIEW);
  const pane = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Set once the pane is in full screen, so leaving it (which is Escape's first press there) closes
  // the pane, and a pane that never got full screen is not closed by an unrelated change.
  const inFullscreen = useRef(false);
  // Set when this page visit pushed the `?preview` entry, so Close can step back over it; a page that
  // loaded with `?preview` has no earlier entry of ours, and Close replaces the address instead.
  const pushed = useRef(false);

  const show = (): void => {
    pushed.current = true;
    window.history.pushState(null, '', addressWith(true));
  };
  const close = useCallback((): void => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else window.history.replaceState(null, '', addressWith(false));
  }, []);

  useEffect(() => {
    const dialog = pane.current;
    if (!dialog) return;
    // `close()` gives the focus back to Preview itself and leaves the recipe page where it was.
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    // Measured before showModal(), while the page's scrollbar is still there to be replaced.
    const release = holdPage();
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
      else if (inFullscreen.current) close();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      release();
      inFullscreen.current = false;
      // The pane is gone, which ends full screen on its own; asking too keeps the browser's state tidy.
      if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [open, close]);

  const wake = useWakeLock(open);

  return (
    <>
      <PreviewButton name={title} onClick={show} />
      <dialog
        ref={pane}
        className="spell-preview"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        {/* Mounted with the content, so the burn comes in afresh on every open. */}
        {open && <Scene />}
        <div className="spell-preview__bar">
          {/* The tip says what a press does; the name stays Screen Awake, and `aria-pressed` holds the state. */}
          {wake.shown && (
            <IconTip tip={wake.held ? 'Let the Screen Sleep' : 'Keep the Screen from Sleeping'}>
              <button
                type="button"
                className="icon-tip__edit icon-tip__edit--plain spell-preview__awake"
                aria-pressed={wake.held}
                onClick={wake.toggle}
              >
                <MysticEyeIcon />
                <span className="visually-hidden">Screen Awake</span>
              </button>
            </IconTip>
          )}
          <button type="button" className="icon-tip__edit icon-tip__edit--plain" onClick={close}>
            <CloseIcon />
            <span className="visually-hidden">Close</span>
          </button>
        </div>
        {/* Drawn only while open, so the page holds no second copy of the spell. */}
        {open && (
          <div className="spell-preview__content">
            <h2 id={titleId} className="spell-preview__title">
              {title}
            </h2>
            <SpellRecipeBody
              {...props}
              level={3}
              beforeSteps={<SpellRecipeSummary steps={steps} level={3} />}
            />
          </div>
        )}
      </dialog>
    </>
  );
}
