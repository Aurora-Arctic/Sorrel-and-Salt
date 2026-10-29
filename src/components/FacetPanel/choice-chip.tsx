'use client';

import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type TransitionEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useHydrated } from '../../lib/hydrated';
import { pressFeedback } from '../../lib/press-feedback';
import InfoTip from '../InfoTip';
import { useTip } from '../InfoTip/use-tip';
import { FacetCount } from './facet-count';

// One choice from a few, drawn as a chip reading "Match: All" that opens a small menu of
// radios (M9.7). A `<details>` so that it opens before the script runs, its radios native so
// the GET form around it sends the choice; once hydrated, the menu fades in and out as other
// dropdowns do, and closes on Escape, on a press outside and on a choice. The menu stays
// mounted while it fades, as a `<details>` keeps `open` until the fade ends (see useSlide).

/** How long a leaving menu waits for its fade to end before it closes anyway. */
const FADE_LIMIT_MS = 400;

/** Motion turned down, or no way to ask, so a change is not held for a fade. */
export const fadesAreOff = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The right edge of the nearest ancestor that clips its children (the panel's slide clip), or
 * the viewport's when none does.
 */
const clipRight = (from: HTMLElement): number => {
  for (let el = from.parentElement; el; el = el.parentElement) {
    if (getComputedStyle(el).overflowX !== 'visible') return el.getBoundingClientRect().right;
  }
  return document.documentElement.clientWidth;
};

type Phase = 'closed' | 'opening' | 'open' | 'closing';

export interface ChoiceChipOption<T extends string> {
  value: T;
  label: string;
  /** Shown after the name once known; left out for a choice that has none, such as All. */
  count?: number;
}

export interface ChoiceChipProps<T extends string> {
  /** The group's name, and the chip's first word. */
  legend: string;
  /** The parameter the chosen radio submits under. */
  name: string;
  options: ReadonlyArray<ChoiceChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /**
   * Rests on its value and cannot be changed; the chip does not open and takes no focus.
   */
  disabled?: boolean;
  /** What the choice means, behind an InfoTip beside the chip. */
  hint?: string;
  /**
   * What the choice means, shown in a tip bubble when the pointer is on the chip or, while
   * enabled, the chip has focus, with no icon beside it. Hidden while the menu is open, so it never covers it.
   */
  chipHint?: string;
}

export function ChoiceChip<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
  hint,
  chipHint,
}: ChoiceChipProps<T>): ReactElement {
  const id = useId();
  const hintId = `${id}-hint`;
  const chipHintId = `${id}-chip-hint`;
  const tip = useTip();
  const hydrated = useHydrated();
  const root = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  const chosen = options.find((option) => option.value === value) ?? options[0];

  const open = () => setPhase(fadesAreOff() ? 'open' : 'opening');
  const close = (refocus: boolean) => {
    setPhase((now) => (now === 'closed' ? now : fadesAreOff() ? 'closed' : 'closing'));
    if (refocus) summary.current?.focus();
  };

  // A frame at hidden first, so that the opening is a transition.
  useEffect(() => {
    if (phase !== 'opening') return undefined;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setPhase('open'));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [phase]);

  // The net for a fade whose end the browser never reports.
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const limit = window.setTimeout(() => setPhase('closed'), FADE_LIMIT_MS);
    return () => window.clearTimeout(limit);
  }, [phase]);

  // A press outside the chip shuts the menu.
  useEffect(() => {
    if (phase === 'closed') return undefined;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [phase]);

  const shown = phase === 'opening' || phase === 'open';

  // Left-aligned is the menu's rest place. Each time it opens, if that box would end past what
  // clips it (a chip at a row's end), it hangs from the chip's right edge instead. Measured
  // from the chip's left and the menu's own width, so the answer does not depend on the last
  // placement. Before the script runs the menu stays left-aligned.
  const [alignEnd, setAlignEnd] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!shown || !root.current || !menuRef.current) return;
    setAlignEnd(
      root.current.getBoundingClientRect().left + menuRef.current.offsetWidth >
        clipRight(root.current),
    );
  }, [shown]);
  const toggle = (event: MouseEvent) => {
    event.preventDefault();
    if (shown) close(false);
    else open();
  };
  // Escape is this menu's: marked handled so the panel around it stays open.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || phase === 'closed') return;
    event.preventDefault();
    close(true);
  };
  // Tabbing out of the menu shuts it. A focus with no destination is a press that landed on
  // something that takes no focus, and the pointer handler above deals with it.
  const onBlur = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !root.current?.contains(next)) close(false);
  };
  const onFadeEnd = (event: TransitionEvent) => {
    if (
      phase === 'closing' &&
      event.target === event.currentTarget &&
      event.propertyName === 'opacity'
    ) {
      setPhase('closed');
    }
  };

  const describedBy = chipHint ? chipHintId : hint ? hintId : undefined;

  const face = (
    <>
      <span className="facet-chip__name">{legend}:</span>
      <span className="facet-chip__value">{chosen.label}</span>
      <svg className="facet-chip__caret" viewBox="0 0 10 6" aria-hidden="true" focusable="false">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </>
  );

  return (
    // A `.field` so its top lines up with the labelled fields beside it: the spacer stands
    // where their label does.
    <div className="field facet-chip">
      <span className="field__label facet-chip__spacer" aria-hidden="true">
        &#8203;
      </span>
      <div
        ref={tip.anchor}
        className="facet-chip__bar"
        // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
        onMouseEnter={chipHint ? tip.showSoon : undefined}
        onMouseLeave={chipHint ? tip.hideSoon : undefined}
      >
        <fieldset
          className="fieldset facet-chip__group"
          disabled={disabled}
          aria-describedby={describedBy}
        >
          <legend className="visually-hidden">{legend}</legend>
          {disabled ? (
            // Really disabled, so unfocusable; a disabled button may swallow mouse events, so the
            // hover is taken on the bar around it (its pointer events are off, see the scss).
            <button type="button" className="facet-chip__summary" disabled>
              {face}
            </button>
          ) : (
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the handlers hear events bubbling from the summary, which is the control
            <details
              ref={root}
              className={
                hydrated ? 'facet-chip__details facet-chip--script' : 'facet-chip__details'
              }
              // Before the script the browser opens and shuts it; after, the state does.
              {...(hydrated ? { open: phase !== 'closed' } : {})}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
            >
              <summary
                ref={summary}
                className="facet-chip__summary"
                onFocus={chipHint ? tip.show : undefined}
                onBlur={chipHint ? tip.hide : undefined}
                onClick={hydrated ? toggle : undefined}
              >
                {face}
              </summary>
              <div
                ref={menuRef}
                className={[
                  'facet-chip__menu',
                  phase === 'open' && 'is-open',
                  alignEnd && 'facet-chip__menu--end',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onTransitionEnd={onFadeEnd}
              >
                {options.map((option) => (
                  <label key={option.value} className="radio facet-chip__option" {...pressFeedback}>
                    <input
                      type="radio"
                      name={name}
                      value={option.value}
                      checked={option.value === value}
                      onChange={() => {
                        onChange(option.value);
                        if (hydrated) close(true);
                      }}
                      {...pressFeedback}
                    />
                    <span>
                      {option.label}
                      {option.count !== undefined && <FacetCount count={option.count} />}
                    </span>
                  </label>
                ))}
              </div>
            </details>
          )}
        </fieldset>
        {chipHint && (
          <span
            ref={tip.bubble}
            id={chipHintId}
            role="tooltip"
            className={tip.open && !shown ? 'info-tip__bubble is-open' : 'info-tip__bubble'}
            // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
            aria-hidden={!(tip.open && !shown)}
            style={tip.bubbleStyle}
          >
            {chipHint}
          </span>
        )}
        {hint && (
          <InfoTip id={hintId} label={legend}>
            {hint}
          </InfoTip>
        )}
      </div>
    </div>
  );
}
