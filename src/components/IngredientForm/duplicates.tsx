'use client';

import NewTabHint from '@/components/LinkHint/new-tab-hint';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type MouseEvent,
  type ReactElement,
  type RefObject,
  type TransitionEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { graphql } from '../../gql';
import { useDebouncedValue } from '../../lib/debounce';
import { graphqlQuery } from '../../lib/graphql-client';
import { TextField } from '../Field';
import { ADDED_HOLD_MS } from '../AddIcon';
import { useFade } from '../ClickFeedback/fade';
import { useAnnounce } from '../ClickFeedback/status-region';
import IconTip, { CheckIcon, MysticEyeIcon, PlusIcon, QuickLookButton } from '../IconTip';
import { cardName } from '../IngredientCard/card-name';
import DetailsLink from '../IngredientEntry/details-link';
import Notice from '../Notice';
import Spinner from '../Spinner';
import { DuplicateQuickLook } from './quick-look';
import type { Duplicate, DuplicateWarning, IngredientFormValues, NameFieldProps } from './types';
// The +'s look is the card's plus's, so its stylesheet; not AddIcon itself, which sends its own
// add where this one hands the entry to the form.
import '../AddIcon/index.scss';

// The "did you mean": once typing settles the name asks `possibleDuplicates`, and each near match
// is listed under the field with a + or an eye. A save is held while a match shows; an edit's never
// is (claude-docs/components/ingredient-form.md, "The duplicate warning").

const PossibleDuplicatesDocument = graphql(`
  query PossibleDuplicates($workspaceId: ID, $name: String!, $first: Int) {
    possibleDuplicates(workspaceId: $workspaceId, name: $name, first: $first) {
      edges {
        node {
          id
          name
          canonicalName
          nomenclature
          slug
          isGlobal
          inCupboard(workspaceId: $workspaceId)
        }
      }
    }
  }
`);

// The compendium entries whose name is the typed one exactly: asked
// when a save is sent, since only a save is held on the answer.
const CompendiumMatchesDocument = graphql(`
  query CompendiumMatches($workspaceId: ID!, $name: String!, $first: Int) {
    compendiumMatches(workspaceId: $workspaceId, name: $name, first: $first) {
      edges {
        node {
          id
          name
          canonicalName
          nomenclature
          slug
          isGlobal
          inCupboard(workspaceId: $workspaceId)
        }
      }
    }
  }
`);

/** Exact matches a question names: more than a handful of one name is not a choice a person makes. */
const EXACT_ROWS = 5;

/** Matches a warning lists: the closest few, best first. */
const DUPLICATE_ROWS = 3;

/** The shortest name the field asks about: one letter resembles half the compendium. */
const MIN_ASKED = 2;

const lookup = (workspaceId: string | null, name: string) =>
  graphqlQuery(PossibleDuplicatesDocument, { workspaceId, name, first: DUPLICATE_ROWS });

/**
 * The warning for the name as typed: its matches, whether a save is held on them, and a save's
 * `check` and `dismiss`. A null coven asks the compendium alone; `omit` is the entry being edited
 * (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
 */
export function useDuplicateWarning(
  workspaceId: string | null,
  text: string,
  omit?: string,
  opened = '',
): DuplicateWarning {
  const client = useQueryClient();
  const typed = text.trim();
  // Typed in since the form opened: set during render, as React allows for a
  // component's own state, so the first keystroke already asks. A save moving
  // `opened` on to the name typed keeps it, so a list showing stays showing.
  const [baseline, setBaseline] = useState(opened);
  const [edited, setEdited] = useState(false);
  if (baseline !== opened) {
    setBaseline(opened);
  } else if (!edited && typed !== opened.trim()) {
    setEdited(true);
  }
  const untouched = !edited && typed === opened.trim();
  // The untouched name asks nothing, as a blank or single-letter one does.
  const name = useDebouncedValue(untouched || typed.length < MIN_ASKED ? '' : typed);
  const { data, isFetching } = useQuery({
    ...lookup(workspaceId, name),
    // A blank name has nothing to resemble, and the server answers it empty.
    enabled: name !== '',
    placeholderData: keepPreviousData,
    // A lookup that fails warns of nothing; it never takes the form down.
    throwOnError: false,
  });
  // By id rather than by name: a longer name finding the same entries warns
  // of nothing new, and one finding a new entry does.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  // The name a save was held on. Another name lifts the hold, so a match
  // arriving as it is typed never takes the focus; its save asks again.
  const [heldFor, setHeldFor] = useState<string | null>(null);
  // The compendium entries named exactly as the held save's name.
  const [exact, setExact] = useState<Duplicate[]>([]);
  const matches =
    name === ''
      ? []
      : (data?.possibleDuplicates.edges.flatMap(({ node }) => (node.id === omit ? [] : node)) ??
        []);
  const shown = matches.filter((match) => !dismissed.has(match.id));

  const check = async (value: string): Promise<boolean> => {
    const sending = value.trim();
    if (sending === '' || (!edited && sending === opened.trim())) return false;
    let found: Duplicate[];
    try {
      // The cached answer when the typing had settled; asked now when not, and
      // the field shows it once the debounce catches up, from the cache.
      const answer = await client.fetchQuery(lookup(workspaceId, sending));
      found = answer.possibleDuplicates.edges.flatMap(({ node }) => (node.id === omit ? [] : node));
    } catch {
      // As the field's own lookup: a failure warns of nothing, and holds nothing.
      return false;
    }
    // A coven's save asks which compendium entries bear the name exactly; the
    // compendium's own has no cupboard to put one in. A failure asks no question.
    let same: Duplicate[] = [];
    if (workspaceId !== null) {
      try {
        const answer = await client.fetchQuery(
          graphqlQuery(CompendiumMatchesDocument, {
            workspaceId,
            name: sending,
            first: EXACT_ROWS,
          }),
        );
        same = answer.compendiumMatches.edges
          .map(({ node }) => node)
          .filter((match) => !dismissed.has(match.id));
      } catch {
        same = [];
      }
    }
    const holds = same.length > 0 || found.some((match) => !dismissed.has(match.id));
    if (holds) {
      setExact(same);
      setHeldFor(sending);
    }
    return holds;
  };

  const dismiss = () => {
    setDismissed(
      new Set([...dismissed, ...shown.map((match) => match.id), ...exact.map((match) => match.id)]),
    );
    setHeldFor(null);
    setExact([]);
  };

  /**
   * After a match's + has added it: every lookup of both kinds is asked again, since the cached
   * answers still say the coven lacks it (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
   */
  const added = async (id: string): Promise<void> => {
    setExact((now) =>
      now.map((match) => (match.id === id ? { ...match, inCupboard: true } : match)),
    );
    // By the operation's name, the first part of every key graphqlQuery makes.
    await Promise.all(
      ['PossibleDuplicates', 'CompendiumMatches'].map((name) =>
        client.invalidateQueries({ queryKey: [name] }),
      ),
    );
  };

  return {
    shown: untouched ? [] : shown,
    // A new name's answer on its way while the last name's list still shows
    // (keepPreviousData), so the field can say the list is about to change.
    pending: !untouched && name !== '' && isFetching,
    blocking: !untouched && heldFor === typed && shown.length > 0,
    exact: !untouched && heldFor === typed ? exact : [],
    check,
    dismiss,
    added,
  };
}

/**
 * Where a row is in the list's slide: `entering` is a new row's first frame,
 * unseen, so that its fade is a transition; `leaving` a row the answer
 * dropped, fading out whole until the list's bottom has slid up over it.
 */
type RowPhase = 'entering' | 'present' | 'leaving';

interface Row {
  match: Duplicate;
  phase: RowPhase;
  /** The entry this place showed before, fading out over the one it shows now. */
  gone?: Duplicate;
}

/** An answer waiting under the shapes until they are fully in. */
interface Held {
  matches: readonly Duplicate[];
  key: string;
}

/** The slide's length, the CSS's $skeleton-fade (index.scss). */
const SLIDE_MS = 300;

/** The shapes' delay and fade, the CSS's $skeleton-delay and $skeleton-fade (index.scss), with room to spare: the net for a fade in whose end never came. */
const SKELETON_NET_MS = 200 + 300 + 250;

/** The slide with room to spare: the net for a transition that never ran, as use-slide.ts keeps one. */
const SLIDE_NET_MS = SLIDE_MS + 250;

const LEAVING_CLASS = 'ingredient-form__match--leaving';

const settleRows = (rows: readonly Row[]): Row[] =>
  rows.flatMap(({ match, phase }) => (phase === 'leaving' ? [] : [{ match, phase: 'present' }]));

/** The rows for a new answer, by place: a place beyond the last answer enters, one beyond this answer leaves holding what it had, a leaving one asked for again is back, and one showing another entry now keeps the old to fade out, unless the shapes cover the change. */
const rowsFor = (rows: readonly Row[], matches: readonly Duplicate[], covered = false): Row[] => [
  ...matches.map((match, place): Row => {
    const was = rows[place];
    if (!was) return { match, phase: 'entering' };
    if (was.phase === 'leaving') return { match, phase: 'present' };
    if (was.match.id === match.id) return { ...was, match };
    return covered ? { match, phase: was.phase } : { match, phase: was.phase, gone: was.match };
  }),
  ...rows.slice(matches.length).map((was): Row => ({ match: was.match, phase: 'leaving' })),
];

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Where the list's bottom will be once its leaving rows are gone: the foot
 * of its last row that stays. The leaving rows are the trailing ones, still
 * in the flow, so the list's own height is the one thing that moves.
 */
const settledHeightOf = (list: HTMLUListElement): number => {
  const staying = Array.from(list.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !child.classList.contains(LEAVING_CLASS),
  );
  const last = staying[staying.length - 1];
  if (!last) return 0;
  // From the edges as drawn, with the row's own end margin, which the list's resting height holds
  // (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
  return (
    last.getBoundingClientRect().bottom -
    list.getBoundingClientRect().top +
    parseFloat(getComputedStyle(last).marginBottom)
  );
};

/**
 * The list's rows as slots by place, and its slide between answers: a dropped row fades out as
 * the bottom slides up over it, a new row fades in as it slides down. Reduced motion settles at
 * once (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
 */
function useSlidingRows(
  matches: readonly Duplicate[],
  pending: boolean,
  listRef: RefObject<HTMLUListElement | null>,
): {
  rows: Row[];
  covered: boolean;
  onTransitionStart: (event: TransitionEvent<HTMLUListElement>) => void;
  onTransitionEnd: (event: TransitionEvent<HTMLUListElement>) => void;
} {
  const [rows, setRows] = useState<Row[]>([]);
  // The answer the rows were last built for, by id: the array itself is new
  // every render. Set during render, as the hook above sets its own state.
  const [builtFor, setBuiltFor] = useState('');
  // Where the shapes are, by their own transition events: `fading` in, `in`, or off. An answer
  // back mid-fade waits, so the change is never seen (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
  const [shapes, setShapes] = useState<'off' | 'fading' | 'in'>('off');
  const [held, setHeld] = useState<Held | null>(null);
  const key = matches.map((match) => match.id).join(' ');
  let holding = held;
  if (key !== (held?.key ?? builtFor)) {
    if (rows.length > 0 && shapes === 'fading') {
      holding = { matches, key };
      setHeld(holding);
    } else {
      setBuiltFor(key);
      setRows(rowsFor(rows, matches, shapes === 'in'));
      setHeld(null);
      holding = null;
    }
  }
  const covered = pending || holding !== null;

  /** Shows a held answer under the shapes. */
  const release = useCallback((answer: Held) => {
    setBuiltFor(answer.key);
    setRows((now) => rowsFor(now, answer.matches, true));
    setHeld(null);
  }, []);

  // The net for a fade in whose end never came.
  useEffect(() => {
    if (!held) return undefined;
    const timer = window.setTimeout(() => release(held), SKELETON_NET_MS);
    return () => window.clearTimeout(timer);
  }, [held, release]);

  // Read off the native event: React wraps only transitionend as a
  // TransitionEvent, so the start event's own propertyName is undefined.
  const shapesEvent = (event: TransitionEvent<HTMLUListElement>) =>
    event.nativeEvent.propertyName === 'opacity' &&
    event.target instanceof HTMLElement &&
    event.target.classList.contains('ingredient-form__shapes');
  const entering = rows.some((row) => row.phase === 'entering');
  const leaving = rows.some((row) => row.phase === 'leaving');
  const moving = rows.some((row) => row.phase !== 'present' || row.gone !== undefined);
  // The list's height at rest, measured each settled render, so a slide
  // starts from where the rows last stood; and the answer last slid for.
  const restHeight = useRef<number | null>(null);
  const slidFor = useRef('');
  // The list's height is let go only once the rows it slid for are settled, else the list jumps
  // a frame at its auto height at the very end.
  const sliding = useRef(false);

  const letGo = (list: HTMLUListElement) => {
    list.style.height = '';
    list.style.overflow = '';
    list.style.transition = '';
  };

  const settle = useCallback(() => {
    sliding.current = false;
    // With no row to take out, nothing moves when the height is let go now;
    // otherwise it is let go in the layout effect, after they are gone.
    if (listRef.current && !leaving) letGo(listRef.current);
    setRows(settleRows);
  }, [leaving, listRef]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      restHeight.current = null;
      sliding.current = false;
      return;
    }
    if (!moving) {
      if (!sliding.current) letGo(list);
      restHeight.current = list.getBoundingClientRect().height;
      return;
    }
    if (slidFor.current === builtFor) return;
    slidFor.current = builtFor;
    const midSlide = list.style.height !== '';
    const now = list.getBoundingClientRect().height;
    // Mid-slide, from where it is; at rest, from where it was, since a new
    // row is already in the flow.
    const from = midSlide ? now : (restHeight.current ?? now);
    const to = settledHeightOf(list);
    // Every row leaving: the region closes round the whole notice instead
    // (index.scss), and the rows are only settled by the net.
    if (to === 0) return;
    if (reducedMotion() || Math.abs(from - to) < 0.5) {
      // Nothing to slide: the rows fade on their own, or, reduced, swap at
      // the next frame rather than in this effect.
      restHeight.current = to;
      if (!reducedMotion()) return;
      const frame = window.requestAnimationFrame(settle);
      return () => window.cancelAnimationFrame(frame);
    }
    list.style.transition = 'none';
    list.style.height = `${from}px`;
    list.style.overflow = 'hidden';
    // A frame at the old height first, so that the new one is a transition.
    void list.offsetHeight;
    list.style.transition = `height ${SLIDE_MS}ms ease-in-out`;
    list.style.height = `${to}px`;
    sliding.current = true;
    restHeight.current = to;
  });

  useEffect(() => {
    if (!entering) return undefined;
    // A frame unseen first, so that the fade in is a transition.
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() =>
        setRows((now) =>
          now.map((row) => (row.phase === 'entering' ? { ...row, phase: 'present' } : row)),
        ),
      );
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [entering, rows]);

  useEffect(() => {
    if (!moving) return undefined;
    const net = window.setTimeout(settle, SLIDE_NET_MS);
    return () => window.clearTimeout(net);
  }, [moving, rows, settle]);

  return {
    rows,
    covered,
    onTransitionStart: (event) => {
      if (shapesEvent(event)) setShapes(covered ? 'fading' : 'off');
    },
    onTransitionEnd: (event) => {
      if (event.target === event.currentTarget && event.nativeEvent.propertyName === 'height')
        settle();
      if (shapesEvent(event)) {
        setShapes(covered ? 'in' : 'off');
        if (held && covered) release(held);
      }
    },
  };
}

/** "Cat's Claw (Uncaria tomentosa)": the label alone names five plants. */
const titleOf = ({ name, canonicalName }: Duplicate) =>
  canonicalName ? `${name} (${canonicalName})` : name;

/**
 * What the notice says. Colour alone must not mark a held save, so the words
 * change with the state: a question while typing, then, once Save was pressed
 * and held, that the save waits and why.
 */
function sentenceFor(blocking: boolean, asking: boolean, exactCount: number): string {
  if (asking) {
    return `The compendium already has ${exactCount === 1 ? 'an entry' : 'entries'} of this name.`;
  }
  return blocking
    ? 'Your save is on hold, as these entries have a similar name. Check them, or create this one anyway.'
    : 'Did you mean one of these?';
}

/** A match the cupboard already holds: the coven's own, or a compendium entry it has used. */
const isHeld = (match: Duplicate): boolean => !match.isGlobal || match.inCupboard === true;

/**
 * What a row offers at its right: the control, the same drawn as text alone
 * for a row fading out over its successor, and the skeleton shape it stands
 * as while another answer is on its way.
 */
interface Choice {
  control: ReactElement;
  ghost: ReactElement;
  shape: 'icon';
}

/**
 * One list of the warning's matches, sliding between answers on its own (`useSlidingRows`), drawn
 * while it has a row, the leaving ones too. A `heading` names the list, an `h4` beneath the form's
 * Identity `h3` (claude-docs/components/ingredient-form.md, "How the duplicate list behaves").
 */
function MatchList({
  slide,
  list,
  heading,
  choiceFor,
  linkTo,
}: {
  slide: ReturnType<typeof useSlidingRows>;
  list: RefObject<HTMLUListElement | null>;
  heading?: string;
  choiceFor: (match: Duplicate) => Choice | null;
  linkTo: (match: Duplicate) => ReactElement;
}): ReactElement | null {
  const headingId = useId();
  if (slide.rows.length === 0) return null;
  const items = (
    <ul
      ref={list}
      aria-labelledby={heading === undefined ? undefined : headingId}
      onTransitionStart={slide.onTransitionStart}
      onTransitionEnd={slide.onTransitionEnd}
    >
      {/* Keyed by place, not entry: a new answer then changes
          each row under its shapes and every row fades back
          together, where a new entry's row would mount drawn
          beside a surviving one fading in. A row leaving is
          out of the accessibility tree at once. */}
      {slide.rows.map(({ match, phase, gone }, place) => {
        const choice = choiceFor(match);
        const classes = ['ingredient-form__match'];
        if (phase !== 'present') classes.push(`ingredient-form__match--${phase}`);
        if (slide.covered) classes.push('ingredient-form__match--pending');
        return (
          <li
            key={place}
            className={classes.join(' ')}
            aria-hidden={phase === 'leaving' || undefined}
          >
            <div className="ingredient-form__body">
              {/* Keyed by entry, so another entry's row fades in
                  afresh, over the last one's fading out as text
                  alone: nothing in it to press. */}
              <span
                key={match.id}
                className={`ingredient-form__row${gone ? ' ingredient-form__row--arriving' : ''}`}
              >
                {linkTo(match)}
                {choice?.control}
              </span>
              {gone && (
                <span
                  // Keyed too: a third entry within the fade
                  // then starts a fresh fade out of the second,
                  // rather than taking over one already done.
                  key={gone.id}
                  className="ingredient-form__row ingredient-form__row--gone"
                  aria-hidden="true"
                >
                  <span className="ingredient-form__was">{titleOf(gone)}</span>
                  {choiceFor(gone)?.ghost}
                </span>
              )}
              <span className="ingredient-form__shapes" aria-hidden="true">
                <span className="ingredient-form__shape" />
                {choice && (
                  <span
                    className={`ingredient-form__shape ingredient-form__shape--${choice.shape}`}
                  />
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
  if (heading === undefined) return items;
  // Open once a row is in, so a group's first frame, its rows still
  // entering, is closed and the opening is a transition.
  const open = slide.rows.some((row) => row.phase === 'present');
  return (
    <div className={`ingredient-form__group${open ? ' ingredient-form__group--open' : ''}`}>
      <div className="ingredient-form__group-inner">
        <h4 id={headingId} className="ingredient-form__group-heading">
          {heading}
        </h4>
        {items}
      </div>
    </div>
  );
}

/**
 * Where a +'s add has got to: sending, the check held after it worked, and the eye it turns into
 *.
 */
type PlusPhase = 'busy' | 'added' | 'eye';

/**
 * The + of a compendium match the coven does not hold, and the Quick Look eye it becomes once the
 * add has worked: one button throughout, so the focus stays on it. It shows the spinner, then
 * AddIcon's check held `ADDED_HOLD_MS`, then the eye; `onShown` then asks for the row to move.
 */
function PlusChoice({
  match,
  phase,
  onAdd,
  onLook,
  onShown,
  buttonRef,
}: {
  match: Duplicate;
  phase: PlusPhase | undefined;
  onAdd: () => void;
  onLook: () => void;
  onShown: () => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
}): ReactElement {
  const name = cardName(match.name, match.canonicalName);
  // Named as the card's plus is, "Add to My Ingredients: Name, Formal".
  const label = `Add to My Ingredients: ${name}`;
  const fade = useFade(phase === 'added');
  const eye = phase === 'eye';
  const state = phase === 'added' ? 'added' : fade.closing ? 'returning' : undefined;
  const shown = eye && !fade.closing;
  useEffect(() => {
    if (shown) onShown();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per eye: onShown is a fresh closure each render.
  }, [shown]);
  const busy = phase === 'busy';
  const glyph = state ? (
    <span className="add-icon__glyphs">
      <span className="add-icon__check" onAnimationEnd={fade.onAnimationEnd}>
        <CheckIcon />
      </span>
      {state === 'returning' && (
        <span className="add-icon__eye">
          <MysticEyeIcon />
        </span>
      )}
    </span>
  ) : busy ? (
    <Spinner />
  ) : eye ? (
    <MysticEyeIcon />
  ) : (
    <PlusIcon />
  );
  return (
    <IconTip tip={eye ? 'Quick Look' : label}>
      <button
        ref={buttonRef}
        type="button"
        className={eye ? 'icon-tip__look' : 'add-icon'}
        data-state={state}
        aria-busy={busy || undefined}
        aria-disabled={busy || phase === 'added' || undefined}
        onClick={() => {
          if (eye) onLook();
          else if (phase === undefined) onAdd();
        }}
      >
        {glyph}
        <span className="visually-hidden">{eye ? `Quick Look ${name}` : label}</span>
      </button>
    </IconTip>
  );
}

/** The name field, with the duplicate warning beneath it. */
export function NameField({
  warning,
  hrefOf,
  onUse,
  quickLookOf,
  workspaceId,
  workspaceName,
  holds = true,
  ref,
}: NameFieldProps): ReactElement {
  const announce = useAnnounce();
  // The held match whose Quick Look is open over the form.
  const [looking, setLooking] = useState<Duplicate | null>(null);
  const region = useRef<HTMLDivElement>(null);
  /** The Name box, through the form, as Create Anyway reaches it. */
  const nameInput = (): HTMLElement | null => {
    const field = region.current?.closest('form')?.elements.namedItem('name');
    return field instanceof HTMLInputElement ? field : null;
  };
  const { shown, blocking, exact, pending } = warning;
  // The save is held on a compendium entry of the very name typed: a question
  // rather than a warning, answered by using the entry or creating anyway.
  const asking = blocking && exact.length > 0;
  const warningId = useId();
  const listed = asking ? exact : shown;
  // Two groups where there is a cupboard: what the coven holds, then the compendium alone, each in
  // the answer's order. The admin's form has no coven, so its matches stand in one list.
  const grouped = onUse !== undefined;
  const covenList = useRef<HTMLUListElement>(null);
  const compendiumList = useRef<HTMLUListElement>(null);
  const coven = useSlidingRows(grouped ? listed.filter(isHeld) : listed, pending, covenList);
  const compendium = useSlidingRows(
    grouped ? listed.filter((match) => !isHeld(match)) : [],
    pending,
    compendiumList,
  );
  const rows = [...coven.rows, ...compendium.rows];
  // The notice stays while any row is drawn, the leaving ones too, and the
  // region closes round them as they fade: open while a row stays.
  const drawn = rows.length > 0;
  const open = rows.some((row) => row.phase !== 'leaving');

  // Each +'s add, by entry: the check holds, then the eye,
  // then the row moves under In This Coven, the region busy while it does. The + buttons by entry,
  // so the focus follows from one to the eye in its new row.
  const [phases, setPhases] = useState<ReadonlyMap<string, PlusPhase>>(new Map());
  const setPhase = (id: string, phase: PlusPhase | undefined) =>
    setPhases((now) => {
      const next = new Map(now);
      if (phase === undefined) next.delete(id);
      else next.set(id, phase);
      return next;
    });
  const pluses = useRef(new Map<string, HTMLButtonElement>());
  const following = useRef<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const holdTimers = useRef(new Set<number>());
  useEffect(() => {
    const timers = holdTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);
  const sliding = rows.some((row) => row.phase !== 'present' || row.gone !== undefined);
  // The move is over once the lookups are back and the rows have stopped sliding: seen during
  // the render that sees it, as useSlidingRows sees a new answer.
  if (moving !== null && !refreshing && !pending && !sliding) {
    setMoving(null);
    setPhase(moving, undefined);
  }

  const add = async (match: Duplicate): Promise<void> => {
    if (!onUse) return;
    setPhase(match.id, 'busy');
    // A caller may answer nothing: that is not an add.
    const added = (await onUse(match)) === true;
    if (!added) {
      setPhase(match.id, undefined);
      return;
    }
    setPhase(match.id, 'added');
    announce(`Added to ${workspaceName ?? 'My Ingredients'}.`);
    const timer = window.setTimeout(() => {
      holdTimers.current.delete(timer);
      setPhase(match.id, 'eye');
    }, ADDED_HOLD_MS);
    holdTimers.current.add(timer);
  };

  const move = async (id: string): Promise<void> => {
    // The focus follows only from the + itself, and only if it is still there when the row moves.
    following.current = document.activeElement === pluses.current.get(id) ? id : null;
    setMoving(id);
    setRefreshing(true);
    try {
      await warning.added(id);
    } finally {
      setRefreshing(false);
    }
  };

  // The focus follows from the + to the eye of its new row once both are in the page, or once the
  // + has gone with the focus on it; the move over, it follows no more.
  const eyes = useRef(new Map<string, HTMLButtonElement>());
  useLayoutEffect(() => {
    const id = following.current;
    if (id === null) return;
    const eye = eyes.current.get(id);
    const was = document.activeElement;
    if (
      eye?.isConnected &&
      (was === pluses.current.get(id) || was === null || was === document.body)
    ) {
      following.current = null;
      eye.focus();
    } else if (moving === null) following.current = null;
  });

  /**
   * What a match offers: its Quick Look where the page has details to open; else the eye for a
   * match the coven holds, or the + for a compendium match it does not. Nothing where neither applies.
   */
  const choiceFor = (match: Duplicate): Choice | null => {
    const look = quickLookOf?.(match);
    if (look)
      return {
        control: <DetailsLink opens={look} name={cardName(match.name, match.canonicalName)} />,
        ghost: (
          <span className="icon-tip__look">
            <MysticEyeIcon />
          </span>
        ),
        shape: 'icon',
      };
    if (workspaceId !== undefined && isHeld(match))
      return {
        control: (
          <QuickLookButton
            ref={(node) => {
              if (node) eyes.current.set(match.id, node);
            }}
            name={cardName(match.name, match.canonicalName)}
            onClick={() => setLooking(match)}
          />
        ),
        ghost: (
          <span className="icon-tip__look">
            <MysticEyeIcon />
          </span>
        ),
        shape: 'icon',
      };
    if (!onUse || !match.isGlobal) return null;
    if (!match.inCupboard) {
      const phase = phases.get(match.id);
      return {
        control: (
          <PlusChoice
            match={match}
            phase={phase}
            onAdd={() => void add(match)}
            onLook={() => setLooking(match)}
            onShown={() => void move(match.id)}
            buttonRef={(node) => {
              if (node) pluses.current.set(match.id, node);
              else if (pluses.current.get(match.id)?.isConnected === false)
                pluses.current.delete(match.id);
            }}
          />
        ),
        ghost:
          phase === 'eye' ? (
            <span className="icon-tip__look">
              <MysticEyeIcon />
            </span>
          ) : (
            <span className="add-icon">
              <PlusIcon />
            </span>
          ),
        shape: 'icon',
      };
    }
    return null;
  };

  /** A match's title, linked to its entry in a new tab. */
  const linkTo = (match: Duplicate): ReactElement => (
    <a
      className="ingredient-form__title"
      href={hrefOf(match)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {titleOf(match)}
      <NewTabHint />
    </a>
  );

  const dismiss = (event: MouseEvent<HTMLButtonElement>) => {
    // The pressed button is about to go, so the name takes the focus first:
    // through the form at once, where setFocus would wait a tick on the body.
    const field = event.currentTarget.form?.elements.namedItem('name');
    if (field instanceof HTMLInputElement) field.focus();
    warning.dismiss();
  };

  return (
    <>
      <TextField<IngredientFormValues>
        name="name"
        label="Name"
        autoComplete="off"
        required
        placeholder="Add a name"
        describedBy={shown.length > 0 ? warningId : undefined}
        invalid={blocking}
        // The one sign of a lookup out: the region below draws nothing until an
        // answer has something to show.
        busy={pending}
        after={
          // Always in the page, as a live region must be to be heard. A status written out, as an
          // `<output>` would hold phrasing content alone, and the notice inside takes no role of its
          // own (claude-docs/components/notice.md).
          <div
            ref={region}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this live region holds block content, which an output element would restyle
            role="status"
            className={`ingredient-form__duplicates${open ? ' ingredient-form__duplicates--open' : ''}`}
            aria-label="Possible duplicates"
            aria-busy={pending || moving !== null || undefined}
          >
            {/* The region opens by height round its notice, which fades in. */}
            <div className="ingredient-form__duplicates-inner">
              {drawn && (
                <Notice kind={blocking ? 'error' : 'warn'} block inRegion>
                  {/* The id sits on the whole block, so the button it describes is read with the
                  names. Plain anchors, since the caller hands back a plain string, in a new tab so
                  the form's unsaved changes stay. Both stay mounted for the skeleton's fade
                  (claude-docs/components/ingredient-form.md, "How the duplicate list behaves"). */}
                  <div id={warningId} className="ingredient-form__matches">
                    <p>{sentenceFor(blocking, asking, exact.length)}</p>
                    <MatchList
                      slide={coven}
                      list={covenList}
                      heading={grouped ? 'In This Coven' : undefined}
                      choiceFor={choiceFor}
                      linkTo={linkTo}
                    />
                    <MatchList
                      slide={compendium}
                      list={compendiumList}
                      heading="In the Compendium"
                      choiceFor={choiceFor}
                      linkTo={linkTo}
                    />
                  </div>
                  {/* One Create Anyway under either list, in the accent outline at the medium size,
                  described by the warning so the focus says why. None on an edit's warning. */}
                  {(asking || holds) && (
                    <button
                      ref={ref}
                      type="button"
                      className="btn btn--medium"
                      aria-describedby={warningId}
                      onClick={dismiss}
                    >
                      Create Anyway
                    </button>
                  )}
                </Notice>
              )}
            </div>
          </div>
        }
      />
      {/* Outside the live region, which would read the details out as a status.
        The focus goes back to the eye that opened it, or, with its row gone
        under a new answer, to the name. */}
      {looking && workspaceId !== undefined && (
        <DuplicateQuickLook
          id={looking.id}
          entry={looking}
          workspaceId={workspaceId}
          pageHref={hrefOf(looking)}
          onClose={() => setLooking(null)}
          returnTo={nameInput}
        />
      )}
    </>
  );
}
