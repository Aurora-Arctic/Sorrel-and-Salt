'use client';

import { cx } from '@/lib/class-names';
import { FADE_LIMIT_MS, prefersReducedMotion } from '@/lib/motion';
import {
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type TransitionEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { escapeKeyHandler, useDismiss } from '../../lib/use-dismiss';
import { useHydrated } from '../../lib/hydrated';
import { pressFeedback } from '../../lib/press-feedback';
import { FieldError } from '../Field/shell';
import InfoTip from '../InfoTip';
import TipAnchor from '../InfoTip/tip-anchor';
import { FacetCount } from './facet-count';
import './choice-chip.scss';

// One choice from a few, drawn as a chip reading "Match: All" that opens a menu of radios. A
// `<details>` so it opens before the script runs, with native radios so the GET form sends the
// choice; hydrated, the menu fades and stays mounted until the fade ends (see useSlide).

const clipRight = (from: HTMLElement): number => {
  for (let el = from.parentElement; el; el = el.parentElement) {
    if (getComputedStyle(el).overflowX !== 'visible') return el.getBoundingClientRect().right;
  }
  return document.documentElement.clientWidth;
};

type Phase = 'closed' | 'opening' | 'open' | 'closing';

interface ChoiceChipOption<T extends string> {
  value: T;
  label: string;
  display?: ReactNode;
  count?: number;
  icon?: ReactNode;
  /** Shown in the menu but cannot be chosen. */
  disabled?: boolean;
}

export interface ChoiceChipProps<T extends string> {
  legend: string;
  name: string;
  options: ReadonlyArray<ChoiceChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Rests on its value and cannot be changed; the chip does not open and takes no focus. */
  disabled?: boolean;
  hint?: string;
  /** What the choice means, in a tip bubble on pointer or (while enabled) focus, with no icon; hidden while the menu is open. */
  chipHint?: string;
  /** A line under the chip, always visible, that describes the group. */
  note?: ReactNode;
  /** A message under the chip that describes the group and marks it and its radios invalid. */
  error?: string;
  /** False where no labelled field sits beside the chip, such as in a stacked column, so no empty line stands above it. */
  spacer?: boolean;
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
  note,
  error,
  spacer = true,
}: ChoiceChipProps<T>): ReactElement {
  const id = useId();
  const hintId = `${id}-hint`;
  const chipHintId = `${id}-chip-hint`;
  const noteId = `${id}-note`;
  const errorId = `${id}-error`;
  const hydrated = useHydrated();
  const root = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  const chosen = options.find((option) => option.value === value) ?? options[0];

  const open = () => setPhase(prefersReducedMotion() ? 'open' : 'opening');
  const close = (refocus: boolean) => {
    setPhase((now) => (now === 'closed' ? now : prefersReducedMotion() ? 'closed' : 'closing'));
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

  useDismiss({
    active: phase !== 'closed',
    inside: (target) => root.current?.contains(target) ?? false,
    onOutsidePress: () => close(false),
  });

  const shown = phase === 'opening' || phase === 'open';

  // Left-aligned is the menu's rest place. Each time it opens, if it would end past what clips
  // it, it hangs from the chip's right edge instead, measured from the chip's left and the menu's
  // own width so the answer ignores the last placement. Before the script it stays left-aligned.
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
  const onKeyDown = escapeKeyHandler(() => close(true), { active: phase !== 'closed' });
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

  const describedBy =
    cx(
      chipHint ? chipHintId : hint ? hintId : false,
      note ? noteId : false,
      error ? errorId : false,
    ) || undefined;

  const face = (
    <>
      <span className="facet-chip__name">{legend}:</span>
      <span className="facet-chip__value">
        {chosen.icon && <span className="facet-chip__icon">{chosen.icon}</span>}
        {chosen.display ?? chosen.label}
      </span>
      <svg className="facet-chip__caret" viewBox="0 0 10 6" aria-hidden="true" focusable="false">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </>
  );

  return (
    // A `.field` so its top lines up with the labelled fields beside it: the spacer stands
    // where their label does.
    <div className="field facet-chip">
      {spacer && (
        <span className="field__label facet-chip__spacer" aria-hidden="true">
          &#8203;
        </span>
      )}
      <TipAnchor
        as="div"
        className="facet-chip__bar"
        bubbleClass="info-tip__bubble"
        bubbleId={chipHintId}
        bubble={chipHint || undefined}
        suppressed={shown}
      >
        {({ show, hide }) => (
          <>
            <fieldset
              className="fieldset facet-chip__group"
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
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
                    onFocus={chipHint ? show : undefined}
                    onBlur={chipHint ? hide : undefined}
                    onClick={hydrated ? toggle : undefined}
                  >
                    {face}
                  </summary>
                  <div
                    ref={menuRef}
                    className={cx(
                      'facet-chip__menu',
                      phase === 'open' && 'is-open',
                      alignEnd && 'facet-chip__menu--end',
                    )}
                    onTransitionEnd={onFadeEnd}
                  >
                    {options.map((option) => (
                      <label
                        key={option.value}
                        className="radio facet-chip__option"
                        {...pressFeedback}
                      >
                        <input
                          type="radio"
                          name={name}
                          value={option.value}
                          checked={option.value === value}
                          disabled={option.disabled}
                          aria-invalid={error ? true : undefined}
                          onChange={() => {
                            onChange(option.value);
                            if (hydrated) close(true);
                          }}
                          {...pressFeedback}
                        />
                        <span>
                          {option.icon && <span className="facet-chip__icon">{option.icon}</span>}
                          {option.display ?? option.label}
                          {option.count !== undefined && <FacetCount count={option.count} />}
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </fieldset>
            {hint && (
              <InfoTip id={hintId} label={legend}>
                {hint}
              </InfoTip>
            )}
          </>
        )}
      </TipAnchor>
      {note && (
        <p id={noteId} className="field__hint">
          {note}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
