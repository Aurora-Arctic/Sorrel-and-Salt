'use client';

import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useHydrated } from '../../lib/hydrated';
import { useSlide } from '../../lib/use-slide';
import { ChevronIcon } from '../Combobox/icons';
import { clausesText, type ClausePart, MATCHING, sentenceParts } from './parts';
import {
  advance,
  convergeOnce,
  editsLeft,
  type Goal,
  HOLD_MS,
  type Line,
  RUSH_STEP,
  SEARCHING,
  TICK_MS,
  WIPE_MS,
} from './typing';
import type { SearchSentenceProps } from './types';
import './index.scss';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** The count at the start of the lead ("12", or "No") a little heavier than the words round it. */
function leadNode(lead: string): ReactNode {
  const count = /^(?:\d+|No(?= |$))/.exec(lead)?.[0];
  if (!count) return lead;
  return (
    <>
      <span className="search-sentence__count">{count}</span>
      {lead.slice(count.length)}
    </>
  );
}

/** The class of a value: its box shows only once the value is whole, and fades in as it becomes so. */
const valueClass = (whole: boolean): string => `search-sentence__value${whole ? ' is-boxed' : ''}`;

/** " matching rue" as far as typed, the term in a hairline box once it is all there (`full`). */
function termNode(text: string, full: string): ReactNode {
  if (!text.startsWith(MATCHING)) return text;
  const term = text.slice(MATCHING.length);
  return (
    <>
      {MATCHING}
      {term ? <span className={valueClass(text === full)}>{term}</span> : null}
    </>
  );
}

/**
 * The clauses as far as typed, the values in their boxes and the joining words in the accent,
 * then the untyped rest invisible so the tail keeps its full height while it types. A value
 * keeps its room from the start and takes its box once every letter of it is typed.
 */
function tailNode(parts: readonly ClausePart[], shown: number, caret: ReactNode): ReactNode {
  let left = shown;
  let placed = false;
  return parts.map((part, index) => {
    const cut = Math.min(Math.max(left, 0), part.text.length);
    left -= part.text.length;
    const here = !placed && cut < part.text.length;
    if (here) placed = true;
    const className = part.join
      ? 'search-sentence__join'
      : part.strong
        ? valueClass(cut === part.text.length)
        : undefined;
    return (
      <span key={index} className={className}>
        {part.text.slice(0, cut)}
        {here ? caret : null}
        <span className="search-sentence__untyped">{part.text.slice(cut)}</span>
      </span>
    );
  });
}

/**
 * The sentence above a list saying what it searches for: one closed line, opening to its clauses, typed out while a search is in flight;
 * a status region announces the finished sentence once (claude-docs/components/search-sentence.md).
 * (claude-docs/components/search-sentence.md, "The sentence and its loading animation").
 */
export default function SearchSentence({
  sentence,
  query,
  pending,
  className,
}: SearchSentenceProps): ReactElement {
  const hydrated = useHydrated();
  const parts = sentenceParts(sentence.fragments, query);
  const fullClauses = clausesText(parts.clauses);
  const hasTail = parts.clauses.length > 0;

  const [line, setLine] = useState<Line>({
    lead: parts.lead,
    term: parts.term,
    clauses: '',
    caret: 'clauses',
  });
  const [phase, setPhase] = useState<'idle' | 'working' | 'holding'>('idle');
  const [returned, setReturned] = useState(false);
  // True when the results came back mid-typing: the clauses then finish at a faster pace.
  const [rush, setRush] = useState(false);
  // Set while the old line is being backspaced; says whether the term is kept.
  const [wipe, setWipe] = useState<{ keepTerm: boolean } | null>(null);
  const slide = useSlide('search-sentence__tail');
  const lineRef = useRef(line);
  const wasPending = useRef(false);
  // The sentence last settled on screen. A list names the new search from the moment it starts,
  // so at that edge the props already hold the new term and cannot say what the old line read.
  const settled = useRef<Goal>({ lead: parts.lead, term: parts.term, clauses: fullClauses });

  const setLines = (next: Line) => {
    lineRef.current = next;
    setLine(next);
  };

  // A search starting and a search returning are the two edges of `pending`. Read before paint:
  // the render where `pending` rises already draws the new search, which must not show for a frame.
  useLayoutEffect(() => {
    if (pending && !wasPending.current) {
      // The line to wipe is the one on screen: the settled sentence, or the typed line when a
      // search starts before the last one has settled.
      const old: Line =
        phase === 'idle'
          ? {
              ...settled.current,
              clauses: slide.state === 'closed' ? '' : settled.current.clauses,
              caret: 'clauses',
            }
          : lineRef.current;
      setLines(old);
      setWipe({ keepTerm: old.term === parts.term });
      setReturned(false);
      setRush(false);
      setPhase('working');
      slide.open();
    } else if (!pending && wasPending.current) {
      setReturned(true);
      if (lineRef.current.clauses.length < fullClauses.length) setRush(true);
    }
    wasPending.current = pending;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the edges of `pending` are the only trigger.
  }, [pending]);

  // Kept only while no search is pending, so the edge above reads the line from before it rose.
  useEffect(() => {
    if (!pending && phase === 'idle') {
      settled.current = { lead: parts.lead, term: parts.term, clauses: fullClauses };
    }
  });

  // The editing: a character a tick, the old line in about WIPE_MS. Reduced motion jumps to
  // the goal. The count and the term are always typed at that pace; clauses still to type
  // when the results landed (a fast return) go RUSH_STEP characters a tick.
  useEffect(() => {
    if (phase !== 'working') return undefined;
    const goalNow = (): Goal =>
      wipe
        ? { lead: '', term: wipe.keepTerm ? parts.term : '', clauses: '' }
        : {
            lead: returned ? parts.lead : SEARCHING,
            term: parts.term,
            clauses: fullClauses,
          };
    const reduced = window.matchMedia(REDUCED_QUERY).matches;
    let step = 1;
    if (reduced) step = editsLeft(lineRef.current, goalNow()) || 1;
    else if (wipe) {
      step = Math.max(1, Math.ceil(editsLeft(lineRef.current, goalNow()) / (WIPE_MS / TICK_MS)));
    }
    const timer = window.setInterval(() => {
      const target = goalNow();
      const first = convergeOnce(lineRef.current, target);
      const pace = rush && !wipe && first?.caret === 'clauses' ? RUSH_STEP : step;
      const next = advance(lineRef.current, target, pace);
      if (next !== lineRef.current) setLines(next);
      if (convergeOnce(next, target)) return;
      if (wipe) setWipe(null);
      else if (returned) {
        if (reduced) {
          setPhase('idle');
          slide.close();
        } else setPhase('holding');
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the goal is read at every tick.
  }, [phase, wipe, returned, rush, parts.lead, parts.term, fullClauses]);

  // Held for a moment, then the tail closes and the line is settled.
  useEffect(() => {
    if (phase !== 'holding') return undefined;
    const timer = window.setTimeout(() => {
      setPhase('idle');
      slide.close();
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `close` only sets state.
  }, [phase]);

  const searching = phase !== 'idle';
  // The settled sentence is drawn from the props whole; only a search types it.
  const view: Line = searching
    ? line
    : { lead: parts.lead, term: parts.term, clauses: fullClauses, caret: 'clauses' };
  const caret = searching ? <span className="search-sentence__caret" /> : null;
  // The term brings its own leading space, so a lead typed or backspaced through a trailing
  // space ("12 ") is trimmed while a term follows: one space, never two.
  const firstLine = (
    <>
      {leadNode(view.term ? view.lead.trimEnd() : view.lead)}
      {view.caret === 'lead' && caret}
      {termNode(view.term, parts.term)}
      {view.caret === 'term' && caret}
    </>
  );
  const finished = (
    <>
      {parts.lead}
      {termNode(parts.term, parts.term)}
      {hasTail ? `, ${fullClauses}` : null}
    </>
  );
  const rootClass = `search-sentence${className ? ` ${className}` : ''}`;
  // The sentence is given to assistive technology once per search: not while it is typed, and
  // from the moment the search has returned.
  const announced = !searching || returned;
  const statusRegion = (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <p role="status" className="search-sentence__status">
      {announced ? finished : null}
    </p>
  );

  if (!hasTail) {
    return (
      <div className={rootClass}>
        <p className="search-sentence__line" aria-hidden={searching || undefined}>
          {firstLine}
        </p>
        {statusRegion}
      </div>
    );
  }

  const open = slide.shown && !searching;
  const toggle = () => {
    if (searching || slide.state === 'opening' || slide.state === 'closing') return;
    if (slide.state === 'closed') slide.open();
    else slide.close();
  };
  return (
    <div className={rootClass}>
      <details
        className={`search-sentence__disclosure${open ? ' is-tail-open' : ''}`}
        open={slide.state !== 'closed'}
        inert={searching}
        aria-hidden={searching || undefined}
      >
        <summary
          className="search-sentence__first"
          onClick={(event) => {
            // Once hydrated the slide owns the toggle; before, the browser's own does.
            event.preventDefault();
            toggle();
          }}
        >
          {firstLine}
          {!searching && (
            <>
              {/* The chevron is icon-only, so the visually hidden label names the control. */}{' '}
              <span className="search-sentence__sr">
                {slide.shown ? 'Hide Search Details' : 'Show Search Details'}
              </span>
            </>
          )}
          {/* Always drawn, and faded by opacity: it settles in when a search ends and out when one starts. */}
          <span
            aria-hidden="true"
            className={`search-sentence__chevron${searching ? ' is-hidden' : ''}`}
          >
            <ChevronIcon />
          </span>
        </summary>
        <div
          className={`${slide.className}${hydrated ? '' : ' search-sentence__tail--static'}`}
          style={slide.style}
          onTransitionEnd={slide.onTransitionEnd}
          aria-hidden={searching || undefined}
        >
          <div className="search-sentence__tail-inner">
            <p>
              {tailNode(
                parts.clauses,
                view.clauses.length,
                view.caret === 'clauses' ? caret : null,
              )}
            </p>
          </div>
        </div>
      </details>
      {statusRegion}
    </div>
  );
}
