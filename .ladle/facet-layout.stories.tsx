import type { Story } from '@ladle/react';
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type TransitionEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { AdminFrame } from './admin-frame';
import CategoryPicker from '../src/components/CategoryPicker';
import type { PickerCategory } from '../src/components/CategoryPicker/types';
import Combobox, { ComboboxEntry } from '../src/components/Combobox';
import type { ComboboxOption } from '../src/components/Combobox/types';
import {
  FieldShell,
  fieldDescription,
  FilterSelectField,
  SearchField,
  SwitchField,
} from '../src/components/Field';
import FormIcon from '../src/components/FormIcon';
import InfoTip from '../src/components/InfoTip';
import PageHeader from '../src/components/PageHeader';
import { chipColors } from '../src/lib/chip-colors';
import { COMPENDIUM_PATH } from '../src/components/CompendiumList/href';
import { NOMENCLATURE_OPTIONS } from '../src/components/IngredientForm/options';
import type { FormGroupIcon } from '../src/modules/vocabulary/schema/form-group-icons';
import './facet-layout.scss';

// A mock-up for the owner's sign-off of M12.4's filter layout, the layout C
// of claude-docs/design-decisions/m12.4-filter-layout.md: a primary row, one
// native disclosure for the rest, an Apply row, then the search sentence above
// the results. Composed from the existing primitives with fixed counts and a
// static sentence; nothing here is the real build and none of it is tested.
// `ApplyOnChange` is the variant the coordinator recommends: no Apply button
// once hydrated (the submit stays for the form before hydration).
// Toxic and Match are a text segmented control in every variant (`.facet-strip`),
// so the variants differ only in layout. All, sidebar and tray are the record's A, B and D.
export default {
  title: 'Admin / Compendium List / Facet Layout',
};

const WARDS = { id: 'g-ward', name: 'Fixture Wards', colorDark: '#4e8bc2', colorLight: '#0c5393' };
const CRAFTS = {
  id: 'g-craft',
  name: 'Fixture Crafts',
  colorDark: '#35987d',
  colorLight: '#097255',
};
const CATEGORIES: PickerCategory[] = [
  { id: 'c-1', name: 'Protection', group: WARDS },
  { id: 'c-2', name: 'Banishing', group: WARDS },
  { id: 'c-3', name: 'Healing', group: CRAFTS },
];

interface Counted {
  name: string;
  count: number;
}
const FORMS: (Counted & { icon: FormGroupIcon | null })[] = [
  { name: 'Dried', count: 14, icon: 'botanical' },
  { name: 'Oil', count: 12, icon: 'fluid' },
  { name: 'Powder', count: 9, icon: 'substance' },
  { name: 'Tincture', count: 5, icon: 'fluid' },
  { name: 'Resin', count: 3, icon: null },
  { name: 'Wax', count: 0, icon: 'substance' },
];
const DEITIES: (Counted & { tradition: string })[] = [
  { name: 'Hecate', count: 6, tradition: 'Greek' },
  { name: 'Artemis', count: 3, tradition: 'Greek' },
  { name: 'Isis', count: 4, tradition: 'Egyptian' },
  { name: 'Thoth', count: 0, tradition: 'Egyptian' },
  { name: 'Brigid', count: 2, tradition: 'Celtic' },
];
const ZODIAC: Counted[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
].map((name, at) => ({ name, count: name === 'Gemini' ? 0 : 2 + ((at * 5) % 9) }));
const PLANETS: Counted[] = [
  ['Sun', 8],
  ['Moon', 11],
  ['Mercury', 4],
  ['Venus', 7],
  ['Mars', 6],
  ['Jupiter', 3],
  ['Saturn', 0],
].map(([name, count]) => ({ name: name as string, count: count as number }));

const ELEMENTS: Counted[] = [
  ['Fire', 7],
  ['Water', 9],
  ['Earth', 6],
  ['Air', 4],
  ['Spirit', 0],
].map(([name, count]) => ({ name: name as string, count: count as number }));

// A fixed vocabulary as combobox options: a zero stays in the list, last, saying so,
// and picking it does nothing (the real build disables the row).
const counted = (items: Counted[]) =>
  items.map(({ name, count }) => ({
    value: name,
    label: `${name} (${count})`,
    count,
    ...(count === 0 ? { note: 'Nothing Matches' } : {}),
  }));

const RESULTS = ['Rue', 'Wormwood', 'Mugwort', 'Fixture Salt'];

/** A typeahead with its chosen values as chips inside the control, an icon beside each if it has one. */
function Typeahead({
  label,
  placeholder,
  options,
  chosen,
  onChange,
  iconOf,
  countChips = false,
  loading,
}: {
  label: string;
  placeholder: string;
  options: (ComboboxOption & { count: number })[];
  chosen: string[];
  onChange: (next: string[]) => void;
  iconOf?: (value: string) => ReactNode;
  /** Layout F: each chip reads its count too, "Oil (12)", as its option did. */
  countChips?: boolean;
  /** Layout F: a chip whose count has not arrived yet shows a placeholder where it sits. */
  loading?: (value: string) => boolean;
}): ReactElement {
  const [text, setText] = useState('');
  const field = fieldDescription({ id: useId() });
  const shown = options
    .filter(
      (option) =>
        !chosen.includes(option.value) &&
        option.value.toLowerCase().includes(text.trim().toLowerCase()),
    )
    // A zero lists last within its group.
    .sort((a, b) => Number(a.count === 0) - Number(b.count === 0));
  return (
    <FieldShell label={label} {...field}>
      <Combobox
        id={field.controlId}
        labelId={field.labelId}
        label={label}
        placeholder={placeholder}
        value={text}
        onChange={setText}
        onPick={(value) => {
          if (options.find((option) => option.value === value)?.count === 0) return;
          onChange([...chosen, value]);
          setText('');
        }}
        offerTyped={false}
        highlightFirst
        empty="No Matches"
        noun={label.toLowerCase()}
        suggestions={{ options: shown, pending: false }}
        onRemoveLast={() => onChange(chosen.slice(0, -1))}
        entries={
          chosen.length > 0 && (
            <ul className="combobox__entries">
              {chosen.map((value) => (
                <li key={value} className="combobox__entry">
                  <span className="combobox__entry-label">
                    {iconOf?.(value)}
                    <span className="combobox__entry-text">
                      {countChips && loading?.(value) ? (
                        <>
                          {value} <CountPending />
                        </>
                      ) : countChips ? (
                        `${value} (${options.find((option) => option.value === value)?.count ?? 0})`
                      ) : (
                        value
                      )}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="combobox__entry-remove"
                    aria-label={`Remove ${label}: ${value}`}
                    onClick={() => onChange(chosen.filter((other) => other !== value))}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                  <input type="hidden" name={label.toLowerCase()} value={value} />
                </li>
              ))}
            </ul>
          )
        }
        clear={{
          label: `Clear ${label}`,
          onClear: () => onChange([]),
          empty: chosen.length === 0,
        }}
      />
    </FieldShell>
  );
}

/**
 * Where a chip's count will be, while the results are on their way: the label is known from
 * the filter at once, the count arrives with the results. The shape and shimmer are the list
 * skeleton's (`skeleton-shape`); the fill is the chip's own ink, since a chip is solid.
 */
function CountPending(): ReactElement {
  return <span className="facet-layout__count-pending" aria-hidden="true" />;
}

const CATEGORY_COUNTS: Record<string, number> = { 'c-1': 14, 'c-2': 9, 'c-3': 11 };
const TOXIC_COUNTS = { toxic: 4, 'not-toxic': 8 };

type CountedCategory = ComboboxOption & { category: PickerCategory };

/**
 * Layout F's Categories box: the real CategoryPicker with a count after each name,
 * in the options and on the chips. The picker takes no counts yet, so the mock
 * composes the same Combobox and entries rather than change the component.
 */
function CountedCategories({
  value,
  onChange,
  loading,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  loading: (id: string) => boolean;
}): ReactElement {
  const id = useId();
  const [text, setText] = useState('');
  const withCount = (category: PickerCategory) =>
    `${category.name} (${CATEGORY_COUNTS[category.id] ?? 0})`;
  const options: CountedCategory[] = CATEGORIES.filter(
    (category) =>
      !value.includes(category.id) &&
      category.name.toLowerCase().includes(text.trim().toLowerCase()),
  )
    .sort((a, b) => a.group.name.localeCompare(b.group.name) || a.name.localeCompare(b.name))
    .map((category) => ({
      value: category.name,
      label: withCount(category),
      key: category.id,
      heading: category.group.name,
      colors: category.group,
      category,
    }));
  const add = (category: PickerCategory) => {
    onChange([...value, category.id]);
    setText('');
  };
  return (
    <fieldset className="fieldset category-picker" aria-labelledby={`${id}-legend`}>
      <legend className="fieldset__legend category-picker__legend">
        <span id={`${id}-legend`}>Categories</span>
      </legend>
      <Combobox<CountedCategory>
        id={`${id}-box`}
        label="Category"
        value={text}
        onChange={setText}
        onPick={(_, option) => {
          if (option) add(option.category);
        }}
        onRemoveLast={() => onChange(value.slice(0, -1))}
        suggestions={{ options, pending: false }}
        offerTyped={false}
        placeholder="Add Category"
        entries={
          value.length > 0 && (
            <ul className="combobox__entries">
              {value.map((categoryId) => {
                const category = CATEGORIES.find((other) => other.id === categoryId);
                if (category && loading(categoryId)) {
                  return (
                    <li
                      key={categoryId}
                      className="combobox__entry is-coloured"
                      style={chipColors(category.group)}
                    >
                      <span className="combobox__entry-label">
                        <span className="combobox__entry-text">
                          {category.name} <CountPending />
                        </span>
                      </span>
                      <button
                        type="button"
                        className="combobox__entry-remove"
                        aria-label={`Remove ${category.name}`}
                        onClick={() => onChange(value.filter((other) => other !== categoryId))}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </li>
                  );
                }
                return (
                  <ComboboxEntry
                    key={categoryId}
                    value={category ? withCount(category) : categoryId}
                    qualifier={category?.group.name}
                    colors={category?.group}
                    onRemove={() => onChange(value.filter((other) => other !== categoryId))}
                  />
                );
              })}
            </ul>
          )
        }
        clear={{
          label: 'Clear Categories',
          empty: value.length === 0,
          onClear: () => onChange([]),
        }}
      />
    </fieldset>
  );
}

const iconFor = (name: string) => FORMS.find((form) => form.name === name)?.icon ?? null;

interface StripProps<T extends string> {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

/** A text segmented control: adjacent button-looking radios in a row. */
function Strip<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: StripProps<T>): ReactElement {
  return (
    <fieldset className="fieldset facet-strip">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// The sentence-typed and sentence-disclosure-typed mocks. Nothing fades: the line is edited
// like text in a box. The first line (the count and the term) is the one that is typed,
// backspaced and, in the disclosure mock, the summary of a <details>; the clauses are typed
// beneath it in a tail that opens and closes by height (grid rows, 0fr to 1fr), so the
// first line never moves and the results below are never snapped. A new search backspaces
// the old line first (only the lead when the term is the same, through the term when it
// changed), then types "Searching for ingredients" and the clauses; on return it backspaces
// just the lead and types the count in its place, at the normal pace and the rest
// untouched. If the clauses are still typing then, they stop where they are and the tail
// slides shut at once, alongside the retyping; if they were done (a slow return) the line
// holds for a moment and then the tail slides shut. The typed line is aria-hidden and inert; the visually hidden status region is given
// the finished sentence once, on return. The search is faked by three buttons.
const SEARCHING = 'Searching for ingredients';
const COUNT_LEAD = '12 ingredients';
const TERMS = ['rue', 'sage', 'mugwort'];
const termText = (term: string) => ` matching “${term}”`;
const CLAUSE_PARTS: { text: string; strong?: boolean }[] = [
  { text: 'in the ' },
  { text: 'Protection', strong: true },
  { text: ' and ' },
  { text: 'Healing', strong: true },
  { text: ' categories, as ' },
  { text: 'Oil', strong: true },
  { text: ' or ' },
  { text: 'Tincture', strong: true },
  { text: ', of ' },
  { text: 'Hecate', strong: true },
  { text: ', under ' },
  { text: 'Scorpio', strong: true },
  { text: ', ruled by the ' },
  { text: 'Sun', strong: true },
  { text: ' or ' },
  { text: 'Mars', strong: true },
  { text: ', in the ' },
  { text: 'Water', strong: true },
  { text: ' element, that are ' },
  { text: 'not toxic', strong: true },
  { text: '.' },
];
const CLAUSES = CLAUSE_PARTS.map((part) => part.text).join('');
/** One character a tick; a tick is about a frame. */
const TICK_MS = 16;
/** Backspacing the old line takes at most about this long. */
const WIPE_MS = 500;
const HOLD_MS = 1000;
/** Characters a tick for the clauses still to type when the results land early. */
const RUSH_STEP = 4;
/** The tail's slide; the same number is the CSS transition (--tail-ms). */
const TAIL_MS = 350;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

type Region = 'lead' | 'term' | 'clauses';
interface Goal {
  lead: string;
  term: string;
  clauses: string;
}
interface Line extends Goal {
  /** Where the caret is: the region last edited. */
  caret: Region;
}

/**
 * One edit towards the goal, or null when the line is the goal. A region that is not the
 * start of its goal loses its last character, the rightmost region first; otherwise the
 * first incomplete region gains one. So a lead edit leaves the term and clauses beside it
 * as they are.
 */
function convergeOnce(line: Line, goal: Goal): Line | null {
  for (const region of ['clauses', 'term', 'lead'] as const) {
    if (!goal[region].startsWith(line[region])) {
      return { ...line, [region]: line[region].slice(0, -1), caret: region };
    }
  }
  for (const region of ['lead', 'term', 'clauses'] as const) {
    if (line[region].length < goal[region].length) {
      return { ...line, [region]: goal[region].slice(0, line[region].length + 1), caret: region };
    }
  }
  return null;
}

function advance(line: Line, goal: Goal, steps: number): Line {
  let next = line;
  for (let i = 0; i < steps; i += 1) {
    const edited = convergeOnce(next, goal);
    if (!edited) break;
    next = edited;
  }
  return next;
}

function editsLeft(line: Line, goal: Goal): number {
  let count = 0;
  for (let next = convergeOnce(line, goal); next; next = convergeOnce(next, goal)) count += 1;
  return count;
}

/** " matching “rue”" as far as typed, the term in bold. */
function termNode(text: string): ReactNode {
  const open = text.indexOf('“');
  if (open < 0) return text;
  const inner = text.slice(open + 1);
  const closed = inner.endsWith('”');
  return (
    <>
      {text.slice(0, open + 1)}
      <strong>{closed ? inner.slice(0, -1) : inner}</strong>
      {closed ? '”' : null}
    </>
  );
}

/**
 * The clauses as far as typed, the values in bold, then the untyped rest invisible so the
 * tail keeps its full height while it types.
 */
function tailNode(shown: number, caret: ReactNode): ReactNode {
  let left = shown;
  let placed = false;
  return CLAUSE_PARTS.map((part, index) => {
    const cut = Math.min(Math.max(left, 0), part.text.length);
    left -= part.text.length;
    const here = !placed && cut < part.text.length;
    if (here) placed = true;
    const Tag = part.strong ? 'strong' : 'span';
    return (
      <Tag key={index}>
        {part.text.slice(0, cut)}
        {here ? caret : null}
        <span className="facet-layout__untyped">{part.text.slice(cut)}</span>
      </Tag>
    );
  });
}

type TypedPhase = 'idle' | 'working' | 'holding';
type TailState = 'closed' | 'opening' | 'open' | 'closing';

/**
 * A section that slides open and shut by height (grid rows, 0fr to 1fr). Its text is in the
 * page, whole, from the first frame of the slide down until the height transition has
 * ended: it is never faded and never unmounted early. The state stays "closing" (so a
 * <details> keeps its `open`) until the transition's own end event; a timer a little
 * longer than the transition is only the net for a transition that never ran. Reduced
 * motion goes straight to the end state.
 */
function useSlide(
  base = 'facet-layout__tail',
  initial: TailState = 'closed',
): {
  state: TailState;
  open: () => void;
  /** `snap`: no slide, for a modal sheet that has none. */
  close: (snap?: boolean) => void;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
  className: string;
  style: CSSProperties;
} {
  const [state, setState] = useState<TailState>(initial);
  const open = () =>
    setState((now) =>
      now === 'open' || now === 'opening'
        ? now
        : window.matchMedia(REDUCED_QUERY).matches || now === 'closing'
          ? 'open'
          : 'opening',
    );
  const close = (snap = false) =>
    setState((now) =>
      now === 'closed'
        ? now
        : snap || window.matchMedia(REDUCED_QUERY).matches
          ? 'closed'
          : 'closing',
    );
  useEffect(() => {
    if (state === 'opening') {
      // A frame at 0fr first, so that the opening is a transition.
      const frame = window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => setState('open')),
      );
      return () => window.cancelAnimationFrame(frame);
    }
    if (state === 'closing') {
      const net = window.setTimeout(() => setState('closed'), TAIL_MS + 250);
      return () => window.clearTimeout(net);
    }
    return undefined;
  }, [state]);
  return {
    state,
    open,
    close,
    onTransitionEnd: (event) => {
      if (
        state === 'closing' &&
        event.target === event.currentTarget &&
        event.propertyName === 'grid-template-rows'
      ) {
        setState('closed');
      }
    },
    className: `${base}${state === 'open' ? ` ${base}--open` : ''}`,
    style: { '--tail-ms': `${TAIL_MS}ms` } as CSSProperties,
  };
}

/** sentence-disclosure: the count line as a summary, the sentence sliding open beneath it. */
function SlideDisclosure({ line, sentence }: { line: string; sentence: ReactNode }): ReactElement {
  const slide = useSlide();
  const shown = slide.state === 'open' || slide.state === 'opening';
  return (
    // A <details> is not phrasing content, so not an <output>.
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    <div role="status" className="facet-layout__sentence">
      <details
        className="facet-layout__disclosure facet-layout__disclosure--typed"
        open={slide.state !== 'closed'}
      >
        <summary
          onClick={(event) => {
            event.preventDefault();
            if (slide.state === 'opening' || slide.state === 'closing') return;
            if (shown) slide.close();
            else slide.open();
          }}
        >
          {line} · {shown ? 'Hide Search' : 'Show Search'}{' '}
          <span
            aria-hidden="true"
            className={`facet-layout__chevron${slide.state === 'open' ? ' facet-layout__chevron--up' : ''}`}
          >
            ▾
          </span>
        </summary>
        <div
          className={slide.className}
          style={slide.style}
          onTransitionEnd={slide.onTransitionEnd}
        >
          <div className="facet-layout__tail-inner">
            <p>{sentence}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

function TypedSentence({
  query,
  onQuery,
  chips,
  disclosure,
  onLoading,
}: {
  query: string;
  onQuery: (term: string) => void;
  chips: ReactNode;
  disclosure: boolean;
  /** True from the press of a search button until its results land: the chips' counts wait. */
  onLoading: (loading: boolean) => void;
}) {
  const [line, setLine] = useState<Line>({
    lead: COUNT_LEAD,
    term: termText(query),
    clauses: '',
    caret: 'clauses',
  });
  const [phase, setPhase] = useState<TypedPhase>('idle');
  const slide = useSlide();
  const tail = slide.state;
  const [returned, setReturned] = useState(false);
  // True when the results came back mid-typing: the clauses then finish at a faster pace.
  const [rush, setRush] = useState(false);
  const [searched, setSearched] = useState(query);
  // Set while the old line is being backspaced; says whether the term is kept.
  const [wipe, setWipe] = useState<{ keepTerm: boolean } | null>(null);
  const [run, setRun] = useState(0);
  const [delay, setDelay] = useState(0);
  // The line is kept in a ref too, so the timers read the latest without re-running.
  const lineRef = useRef(line);
  const reduced = () => window.matchMedia(REDUCED_QUERY).matches;

  const setLines = (next: Line) => {
    lineRef.current = next;
    setLine(next);
  };
  const openTail = slide.open;
  const closeTail = slide.close;

  const start = (term: string, after: number) => {
    onQuery(term);
    setWipe({ keepTerm: line.term === termText(term) });
    setSearched(term);
    setReturned(false);
    setRush(false);
    onLoading(true);
    setDelay(after);
    setRun((count) => count + 1);
    setPhase('working');
    openTail();
  };
  const nextTerm = () => TERMS[(TERMS.indexOf(query) + 1) % TERMS.length];

  const toggleTail = () => {
    if (phase !== 'idle' || tail === 'opening' || tail === 'closing') return;
    if (tail === 'closed') {
      setLines({ ...lineRef.current, clauses: CLAUSES });
      openTail();
    } else closeTail();
  };

  // The fake search: the results come back after `delay`.
  useEffect(() => {
    if (run === 0) return undefined;
    const timer = window.setTimeout(() => {
      setReturned(true);
      onLoading(false);
      if (lineRef.current.clauses.length < CLAUSES.length) setRush(true);
    }, delay);
    return () => window.clearTimeout(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- a new search is the only trigger.
  }, [run, delay]);

  // The editing: a character a tick, the old line in about WIPE_MS. Reduced motion jumps to
  // the goal. The lead and the term are always typed at that pace; clauses still to type when
  // the results landed (a fast return) go RUSH_STEP characters a tick. The tail slides shut
  // only once the whole sentence is there, after the hold.
  useEffect(() => {
    if (phase !== 'working') return undefined;
    const goalNow = (): Goal =>
      wipe
        ? { lead: '', term: wipe.keepTerm ? termText(searched) : '', clauses: '' }
        : {
            lead: returned ? COUNT_LEAD : SEARCHING,
            term: termText(searched),
            clauses: CLAUSES,
          };
    let step = 1;
    if (reduced()) step = editsLeft(lineRef.current, goalNow()) || 1;
    else if (wipe)
      step = Math.max(1, Math.ceil(editsLeft(lineRef.current, goalNow()) / (WIPE_MS / TICK_MS)));
    const timer = window.setInterval(() => {
      const target = goalNow();
      const first = convergeOnce(lineRef.current, target);
      const pace = rush && !wipe && first?.caret === 'clauses' ? RUSH_STEP : step;
      const next = advance(lineRef.current, target, pace);
      if (next !== lineRef.current) setLines(next);
      if (convergeOnce(next, target)) return;
      if (wipe) setWipe(null);
      else if (returned) setPhase('holding');
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase, wipe, returned, rush, searched]);

  // Held for a moment, then the tail closes and the line is settled.
  useEffect(() => {
    if (phase !== 'holding') return undefined;
    const timer = window.setTimeout(() => {
      setPhase('idle');
      closeTail();
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- closeTail only sets state.
  }, [phase]);

  // A closed tail is empty, so the next search types it from nothing.
  useEffect(() => {
    if (tail === 'closed' && lineRef.current.clauses && phase === 'idle') {
      setLines({ ...lineRef.current, clauses: '' });
    }
  }, [tail, phase]);

  const searching = phase !== 'idle';
  const announced = !searching || returned;
  const caret = searching ? <span className="facet-layout__caret" /> : null;
  const firstLine = (
    <>
      {line.lead}
      {line.caret === 'lead' && caret}
      {termNode(line.term)}
      {line.caret === 'term' && caret}
    </>
  );
  const tailBlock = (
    <div
      className={slide.className}
      style={slide.style}
      onTransitionEnd={slide.onTransitionEnd}
      aria-hidden="true"
    >
      <div className="facet-layout__tail-inner">
        <p>{tailNode(line.clauses.length, line.caret === 'clauses' ? caret : null)}</p>
      </div>
    </div>
  );
  return (
    <div className="facet-layout__sentence">
      <div className="facet-layout__mock-controls">
        <button
          type="button"
          className="btn"
          disabled={searching}
          onClick={() => start(nextTerm(), 4000)}
        >
          Slow Search
        </button>
        <button
          type="button"
          className="btn"
          disabled={searching}
          onClick={() => start(nextTerm(), 600)}
        >
          Fast Search
        </button>
        <button
          type="button"
          className="btn"
          disabled={searching}
          onClick={() => start(query, 1500)}
        >
          Re-Search Same Term
        </button>
      </div>
      {disclosure ? (
        <details
          className="facet-layout__disclosure facet-layout__disclosure--typed"
          open={tail !== 'closed'}
          inert={searching}
          aria-hidden={searching || undefined}
        >
          <summary
            className="facet-layout__first"
            onClick={(event) => {
              event.preventDefault();
              toggleTail();
            }}
          >
            {firstLine}
            {!searching && (
              <>
                {' · '}
                {tail === 'open' || tail === 'opening' ? 'Hide Search' : 'Show Search'}{' '}
                <span
                  aria-hidden="true"
                  className={`facet-layout__chevron${tail === 'open' ? ' facet-layout__chevron--up' : ''}`}
                >
                  ▾
                </span>
              </>
            )}
          </summary>
          {tailBlock}
        </details>
      ) : (
        <>
          <p className="facet-layout__first" aria-hidden={searching || undefined}>
            {firstLine}
          </p>
          {tailBlock}
        </>
      )}
      {chips}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <p role="status" className="facet-layout__sr">
        {announced ? (
          <>
            {COUNT_LEAD}
            {termNode(termText(searched))}, {CLAUSES}
          </>
        ) : null}
      </p>
    </div>
  );
}

type Variant = 'disclosure' | 'open' | 'sidebar' | 'tray' | 'grid' | 'grid-tray';

/** How long a chip added from the panel waits for its count (the mock's stand-in for a search). */
const PENDING_MS = 1200;

// `$shell-tablet-width` (48rem) in pixels, for the one place a script needs it.
const TABLET_QUERY = '(min-width: 768px)';

interface LayoutProps {
  variant?: Variant;
  /** The selected Match and Toxic segment drawn as an outline, not a green block. */
  outlinedStrip?: boolean;
  open?: boolean;
  onChange?: boolean;
  forms?: string[];
  deities?: string[];
  zodiac?: string[];
  planets?: string[];
  elements?: string[];
  categories?: string[];
  toxic?: 'any' | 'toxic' | 'not-toxic';
  query?: string;
  sentence: ReactNode;
  /** Layout F: how the search sentence is set. */
  sentenceMode?: 'full' | 'disclosure' | 'tip' | 'chips' | 'typed' | 'disclosure-typed';
}

/** The proposal and its alternatives, interactive enough to open, pick and clear. */
function Layout({
  variant = 'disclosure',
  outlinedStrip = false,
  open = false,
  onChange = false,
  forms: initialForms = [],
  deities: initialDeities = [],
  zodiac: initialZodiac = [],
  planets: initialPlanets = [],
  elements: initialElements = [],
  categories: initialCategories = ['c-1', 'c-3'],
  toxic: initialToxic = 'any',
  query: initialQuery = 'rue',
  sentence,
  sentenceMode = 'full',
}: LayoutProps): ReactElement {
  const [query, setQuery] = useState(initialQuery);
  const [categories, setCategories] = useState(initialCategories);
  const [mode, setMode] = useState<'all' | 'any'>('all');
  const [toxic, setToxic] = useState(initialToxic);
  const [forms, setForms] = useState(initialForms);
  const [deities, setDeities] = useState(initialDeities);
  const [zodiac, setZodiac] = useState(initialZodiac);
  const [planets, setPlanets] = useState(initialPlanets);
  const [elements, setElements] = useState(initialElements);
  const [nomenclature, setNomenclature] = useState('');
  const [tray, setTray] = useState(open);
  // Layout F: the counts, the paired Match and Toxic row, no Classification.
  const fx = variant === 'grid-tray';
  const tipId = useId();
  const dropRef = useRef<HTMLDialogElement>(null);
  const filtersRef = useRef<HTMLButtonElement>(null);
  const dropTitle = useId();
  const dropId = useId();
  // Layout F: the panel slides down over the results. `open` is only these stories'
  // starting state; the page itself never opens it on load.
  const drop = useSlide('facet-layout__drop-clip', open && fx ? 'open' : 'closed');
  const dropShown = drop.state === 'open' || drop.state === 'opening';
  const closeDrop = () => drop.close(dropRef.current?.matches(':modal') ?? false);
  // The dialog follows the slide's state: show() from the tablet width up (no scrim,
  // the page stays usable), showModal() below it. It stays open while it slides shut.
  useEffect(() => {
    const dialog = dropRef.current;
    if (!dialog) return;
    if (drop.state !== 'closed' && !dialog.open) {
      if (window.matchMedia(TABLET_QUERY).matches) dialog.show();
      else dialog.showModal();
      // Name the dialog to assistive technology rather than land on the first chip's cross.
      dialog.focus({ preventScroll: true });
    } else if (drop.state === 'closed' && dialog.open) {
      const hadFocus = dialog.contains(document.activeElement);
      dialog.close();
      if (hadFocus) filtersRef.current?.focus();
    }
  }, [drop.state]);
  // A resize across the tablet width changes which kind of dialog it should be: close it.
  useEffect(() => {
    const media = window.matchMedia(TABLET_QUERY);
    const crossed = () => drop.close(true);
    media.addEventListener('change', crossed);
    return () => media.removeEventListener('change', crossed);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- close() only sets state.
  }, []);
  // Counts that have not arrived: every chip while a search runs, and a chip just added
  // from the panel until its results land. A chip being removed simply goes.
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const pendingTimers = useRef<number[]>([]);
  useEffect(() => {
    const timers = pendingTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);
  const markPending = (keys: string[]) => {
    if (!fx || keys.length === 0) return;
    setPending((now) => [...now, ...keys]);
    pendingTimers.current.push(
      window.setTimeout(
        () => setPending((now) => now.filter((key) => !keys.includes(key))),
        PENDING_MS,
      ),
    );
  };
  const isPending = (key: string) => searching || pending.includes(key);
  /** A list's setter that also marks the values it added as waiting for their counts. */
  const tracked =
    (prefix: string, list: string[], set: (next: string[]) => void) => (next: string[]) => {
      markPending(
        next.filter((value) => !list.includes(value)).map((value) => `${prefix}-${value}`),
      );
      set(next);
    };
  const hidden = forms.length + deities.length + zodiac.length + planets.length + elements.length;
  const facets = [categories, forms, deities, zodiac, planets, elements].filter(
    (l) => l.length > 0,
  ).length;
  const filterCount = facets + (toxic === 'any' ? 0 : 1);
  const without = (list: string[], set: (next: string[]) => void, value: string) =>
    set(list.filter((other) => other !== value));
  const categoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

  const search = (
    <SearchField
      label="Search"
      name="query"
      placeholder="Search Names"
      value={query}
      onChange={setQuery}
    />
  );

  const matchStrip = categories.length >= 2 && (
    <Strip
      legend="Match"
      name="categoryMode"
      options={[
        { value: 'all', label: 'All' },
        { value: 'any', label: 'Any' },
      ]}
      value={mode}
      onChange={setMode}
    />
  );

  const categoriesBlock = (
    <div className="facet-layout__grow">
      <CategoryPicker
        legend="Categories"
        entry="Category"
        placeholder="Add Category"
        categories={CATEGORIES}
        value={categories}
        onChange={setCategories}
      />
      {matchStrip}
    </div>
  );

  const toxicBlock = (
    <div className="facet-layout__toxic">
      <Strip
        legend="Toxic"
        name="toxic"
        options={[
          { value: 'any', label: 'Any' },
          { value: 'toxic', label: fx ? `Toxic (${TOXIC_COUNTS.toxic})` : 'Toxic' },
          {
            value: 'not-toxic',
            label: fx ? `Not Toxic (${TOXIC_COUNTS['not-toxic']})` : 'Not Toxic',
          },
        ]}
        value={toxic}
        onChange={(next) => {
          if (next !== 'any' && next !== toxic) markPending(['toxic']);
          setToxic(next);
        }}
      />
    </div>
  );

  const primary = (
    <div className="facet-layout__row">
      {categoriesBlock}
      {toxicBlock}
    </div>
  );

  const formsField = (
    <Typeahead
      label="Forms"
      countChips={fx}
      loading={(value) => isPending('f-' + value)}
      placeholder="Add Form"
      chosen={forms}
      onChange={tracked('f', forms, setForms)}
      iconOf={(value) => <FormIcon name={iconFor(value)} />}
      options={FORMS.map((form) => ({
        value: form.name,
        label: `${form.name} (${form.count})`,
        icon: <FormIcon name={form.icon} />,
        count: form.count,
      }))}
    />
  );

  const deitiesField = (
    <Typeahead
      label="Deities"
      countChips={fx}
      loading={(value) => isPending('d-' + value)}
      placeholder="Add Deity"
      chosen={deities}
      onChange={tracked('d', deities, setDeities)}
      options={DEITIES.map((deity) => ({
        value: deity.name,
        label: `${deity.name} (${deity.count})`,
        heading: deity.tradition,
        count: deity.count,
      }))}
    />
  );

  const zodiacField = (
    <Typeahead
      label="Zodiac"
      countChips={fx}
      loading={(value) => isPending('z-' + value)}
      placeholder="Add Sign"
      chosen={zodiac}
      onChange={tracked('z', zodiac, setZodiac)}
      options={counted(ZODIAC)}
    />
  );

  const planetsField = (
    <Typeahead
      label="Planets"
      countChips={fx}
      loading={(value) => isPending('p-' + value)}
      placeholder="Add Planet"
      chosen={planets}
      onChange={tracked('p', planets, setPlanets)}
      options={counted(PLANETS)}
    />
  );

  const elementsField = (
    <Typeahead
      label="Elements"
      countChips={fx}
      loading={(value) => isPending('e-' + value)}
      placeholder="Add Element"
      chosen={elements}
      onChange={tracked('e', elements, setElements)}
      options={counted(ELEMENTS)}
    />
  );

  const classificationField = !fx && (
    <FilterSelectField
      label="Classification"
      name="nomenclature"
      all="Any"
      options={NOMENCLATURE_OPTIONS}
      defaultValue={nomenclature}
      onChange={setNomenclature}
    />
  );

  const noRefsField = (
    <SwitchField label="No Refs" name="withoutReferences" value="1" onChange={() => {}} />
  );

  const panelItems = (
    <>
      {formsField}
      {deitiesField}
      {zodiacField}
      {planetsField}
      {elementsField}
      {classificationField}
      {noRefsField}
    </>
  );

  const panel = <div className="facet-layout__panel">{panelItems}</div>;

  const apply = (
    <div className="facet-layout__apply">
      {/* Once hydrated, ApplyOnChange drops this; the submit stays for the form before hydration. */}
      {!onChange && (
        <button type="submit" className="btn btn--solid">
          Apply Filters
        </button>
      )}
      <a href={COMPENDIUM_PATH}>Clear All</a>
    </div>
  );

  const formProps = {
    method: 'get',
    action: COMPENDIUM_PATH,
    className: 'form facet-layout',
    'aria-label': 'Filter the Compendium',
  };

  const countOf = (list: Counted[], name: string) => list.find((i) => i.name === name)?.count ?? 0;
  const chosen: {
    key: string;
    label: string;
    count: number;
    remove: () => void;
    group?: PickerCategory['group'];
  }[] = [
    ...categories.map((id) => ({
      key: `c-${id}`,
      group: CATEGORIES.find((category) => category.id === id)?.group,
      label: categoryName(id),
      count: CATEGORY_COUNTS[id] ?? 0,
      remove: () => without(categories, setCategories, id),
    })),
    ...forms.map((v) => ({
      key: `f-${v}`,
      label: v,
      count: countOf(FORMS, v),
      remove: () => without(forms, setForms, v),
    })),
    ...deities.map((v) => ({
      key: `d-${v}`,
      label: v,
      count: countOf(DEITIES, v),
      remove: () => without(deities, setDeities, v),
    })),
    ...zodiac.map((v) => ({
      key: `z-${v}`,
      label: v,
      count: countOf(ZODIAC, v),
      remove: () => without(zodiac, setZodiac, v),
    })),
    ...planets.map((v) => ({
      key: `p-${v}`,
      label: v,
      count: countOf(PLANETS, v),
      remove: () => without(planets, setPlanets, v),
    })),
    ...elements.map((v) => ({
      key: `e-${v}`,
      label: v,
      count: countOf(ELEMENTS, v),
      remove: () => without(elements, setElements, v),
    })),
    ...(toxic === 'any'
      ? []
      : [
          {
            key: 'toxic',
            label: toxic === 'toxic' ? 'Toxic' : 'Not Toxic',
            count: TOXIC_COUNTS[toxic],
            remove: () => setToxic('any'),
          },
        ]),
  ];

  const chosenChips =
    chosen.length > 0 ? (
      <ul
        className="facet-layout__chosen"
        aria-label="Chosen filters"
        aria-busy={chosen.some((item) => isPending(item.key)) || undefined}
      >
        {chosen.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={item.group ? 'is-coloured' : undefined}
              style={item.group ? chipColors(item.group) : undefined}
              onClick={item.remove}
              aria-label={`Remove ${item.label}`}
            >
              {fx ? (
                isPending(item.key) ? (
                  <>
                    {item.label} <CountPending />
                  </>
                ) : (
                  `${item.label} (${item.count})`
                )
              ) : (
                item.label
              )}
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
        {/* Layout F: Clear All is not in the sentence; it ends the chip row. */}
        {fx && (
          <li className="facet-layout__chosen-clear">
            <a href={COMPENDIUM_PATH}>Clear All</a>
          </li>
        )}
      </ul>
    ) : null;

  const countLine = '12 ingredients';
  let sentenceNode: ReactNode;
  if (fx && sentenceMode === 'disclosure') {
    sentenceNode = <SlideDisclosure line={countLine} sentence={sentence} />;
  } else if (fx && sentenceMode === 'tip') {
    // The count line and an info button; the sentence is the tip's text, in the status region.
    sentenceNode = (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      <p role="status" className="facet-layout__sentence facet-layout__sentence--tip">
        {countLine}{' '}
        <InfoTip id={tipId} label="the search">
          {sentence}
        </InfoTip>
      </p>
    );
  } else if (fx && sentenceMode === 'chips') {
    // The chip row does the on-screen job; the full sentence is there for assistive technology.
    sentenceNode = (
      <div className="facet-layout__sentence">
        <p className="facet-layout__count-line">{countLine}</p>
        {chosenChips}
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <p role="status" className="facet-layout__sr">
          {sentence}
        </p>
      </div>
    );
  } else if (fx && (sentenceMode === 'typed' || sentenceMode === 'disclosure-typed')) {
    sentenceNode = (
      <TypedSentence
        query={query}
        onQuery={setQuery}
        chips={sentenceMode === 'typed' ? chosenChips : null}
        disclosure={sentenceMode === 'disclosure-typed'}
        onLoading={setSearching}
      />
    );
  } else {
    sentenceNode = (
      // The record names a role="status" paragraph, as the real sentence will be.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      <p role="status" className="facet-layout__sentence">
        {sentence}
      </p>
    );
  }

  const results = (
    <>
      {sentenceNode}
      <ul className="facet-layout__results">
        {RESULTS.map((name) => (
          <li key={name} className="facet-layout__result">
            <strong>{name}</strong>
            <span className="facet-layout__count">Fixtura testalis</span>
          </li>
        ))}
      </ul>
    </>
  );

  let body: ReactElement;
  if (variant === 'grid') {
    body = (
      <>
        <form {...formProps}>
          {search}
          <div className="facet-layout__row facet-layout__beside">{categoriesBlock}</div>
          <div className="facet-layout__grid">
            {toxicBlock}
            {panelItems}
          </div>
          {apply}
        </form>
        {results}
      </>
    );
  } else if (variant === 'grid-tray') {
    // The bar's Filters button opens the panel; below the tablet width it is a modal sheet.
    body = (
      <>
        <form
          {...formProps}
          className={`form facet-layout facet-layout__drop-anchor${outlinedStrip ? ' facet-layout--outlined-strip' : ''}`}
        >
          <div className="facet-layout__bar">
            <div className="facet-layout__grow">{search}</div>
            <button
              ref={filtersRef}
              type="button"
              className="btn facet-layout__filters-button"
              aria-expanded={dropShown}
              aria-controls={dropId}
              onClick={() => (dropShown ? closeDrop() : drop.open())}
            >
              {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
            </button>
          </div>
          {/* No `open` attribute: the state above calls show() or showModal() after a press,
              never on load. (The page itself renders this panel inline and open until
              JavaScript takes over, so the form works without it; the mock does not.) */}
          <dialog
            ref={dropRef}
            id={dropId}
            className="facet-layout__drop"
            tabIndex={-1}
            aria-labelledby={dropTitle}
            onKeyDown={(event) => {
              // A non-modal dialog does not close on Escape by itself; the combobox keeps
              // the key for its own open list.
              if (event.key === 'Escape' && !event.defaultPrevented) {
                event.preventDefault();
                closeDrop();
              }
            }}
            onClose={() => drop.close(true)}
          >
            <div
              className={drop.className}
              style={drop.style}
              onTransitionEnd={drop.onTransitionEnd}
            >
              {/* A focused control inside the clipped box would scroll it: hold it still. */}
              <div
                className="facet-layout__drop-inner"
                onScroll={(event) => {
                  event.currentTarget.scrollTop = 0;
                }}
              >
                <div className="facet-layout__drop-pad">
                  <div className="facet-layout__tray-head">
                    <strong id={dropTitle}>Filters</strong>
                    <button
                      type="button"
                      className="btn facet-layout__phone-only"
                      onClick={closeDrop}
                    >
                      Close
                    </button>
                  </div>
                  <div className="facet-layout__line">
                    <div className="facet-layout__grow">
                      <CountedCategories
                        value={categories}
                        onChange={tracked('c', categories, setCategories)}
                        loading={(id) => isPending(`c-${id}`)}
                      />
                    </div>
                    {matchStrip}
                    {noRefsField}
                  </div>
                  <div className="facet-layout__line">
                    <div className="facet-layout__grow">{formsField}</div>
                    {toxicBlock}
                  </div>
                  <div className="facet-layout__line">
                    <div className="facet-layout__grow">{planetsField}</div>
                    <div className="facet-layout__grow">{zodiacField}</div>
                  </div>
                  <div className="facet-layout__line">
                    <div className="facet-layout__grow">{deitiesField}</div>
                    <div className="facet-layout__grow">{elementsField}</div>
                  </div>
                  <div className="facet-layout__apply facet-layout__tray-foot">
                    <button type="submit" className="btn btn--solid">
                      Apply Filters
                    </button>
                    <button
                      type="button"
                      className="btn facet-layout__phone-only"
                      onClick={closeDrop}
                    >
                      Close
                    </button>
                    <a href={COMPENDIUM_PATH}>Clear All</a>
                  </div>
                </div>
              </div>
            </div>
          </dialog>
        </form>
        {sentenceMode !== 'chips' && sentenceMode !== 'typed' && chosenChips}
        {results}
      </>
    );
  } else if (variant === 'sidebar') {
    body = (
      <div className="facet-layout__split">
        <form {...formProps}>
          {search}
          {primary}
          {panel}
          {apply}
        </form>
        <div className="facet-layout__main">{results}</div>
      </div>
    );
  } else if (variant === 'tray') {
    body = (
      <>
        <div className="facet-layout__bar">
          <div className="facet-layout__grow">{search}</div>
          <button type="button" className="btn" onClick={() => setTray(true)}>
            {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
          </button>
        </div>
        {chosenChips}
        {results}
        {tray && (
          <form {...formProps} className="form facet-layout facet-layout__tray">
            <div className="facet-layout__tray-head">
              <strong>Filters</strong>
              <button type="button" className="btn" onClick={() => setTray(false)}>
                Close
              </button>
            </div>
            {primary}
            {panel}
            <div className="facet-layout__apply facet-layout__tray-foot">
              <button type="submit" className="btn btn--solid">
                Apply Filters
              </button>
              <button type="button" className="btn" onClick={() => setTray(false)}>
                Close
              </button>
              <a href={COMPENDIUM_PATH}>Clear All</a>
            </div>
          </form>
        )}
      </>
    );
  } else {
    body = (
      <>
        <form {...formProps}>
          {search}
          {primary}
          {variant === 'open' ? (
            panel
          ) : (
            <details className="facet-layout__more" open={open || undefined}>
              <summary>{hidden > 0 ? `More Filters (${hidden})` : 'More Filters'}</summary>
              {panel}
            </details>
          )}
          {apply}
        </form>
        {results}
      </>
    );
  }

  return (
    <AdminFrame open={COMPENDIUM_PATH}>
      <main>
        <PageHeader title="Compendium" />
        {body}
      </main>
    </AdminFrame>
  );
}

const Link = ({ children }: { children: ReactNode }) => <a href={COMPENDIUM_PATH}>{children}</a>;

const FULL_SENTENCE = (
  <>
    12 ingredients matching “<Link>rue</Link>”, in the <Link>Protection</Link> and{' '}
    <Link>Healing</Link> categories, as <Link>Oil</Link> or <Link>Tincture</Link>, of{' '}
    <Link>Hecate</Link>, under <Link>Scorpio</Link>, ruled by the <Link>Sun</Link> or{' '}
    <Link>Mars</Link>, in the <Link>Water</Link> element, that are <Link>not toxic</Link>.{' '}
    <Link>Clear All</Link>
  </>
);

const OPEN_PROPS: LayoutProps = {
  open: true,
  forms: ['Oil', 'Tincture'],
  deities: ['Hecate'],
  zodiac: ['Scorpio'],
  planets: ['Sun', 'Mars'],
  elements: ['Water'],
  toxic: 'not-toxic',
  sentence: FULL_SENTENCE,
};

// The page as first loaded for the search "rue" and two categories, the
// disclosure closed and nothing hidden chosen.
export const Proposed: Story = () => (
  <Layout
    sentence={
      <>
        12 ingredients matching “<Link>rue</Link>”, in the <Link>Protection</Link> and{' '}
        <Link>Healing</Link> categories. <Link>Clear All</Link>
      </>
    }
  />
);

export const ProposedPhoneLight: Story = () => <Proposed />;
ProposedPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposedPhoneDark: Story = () => <Proposed />;
ProposedPhoneDark.meta = { theme: 'dark', width: 375 };

// Disclosure open, a value chosen in each hidden facet: the button counts them
// and the sentence names every one. Wax, Thoth, Gemini and Saturn have a count
// of zero: the chips are disabled but stay, the typeahead lists them last.
export const MoreFiltersOpen: Story = () => <Layout {...OPEN_PROPS} />;

export const MoreFiltersOpenPhoneLight: Story = () => <Layout {...OPEN_PROPS} />;
MoreFiltersOpenPhoneLight.meta = { theme: 'light', width: 375 };

export const MoreFiltersOpenPhoneDark: Story = () => <Layout {...OPEN_PROPS} />;
MoreFiltersOpenPhoneDark.meta = { theme: 'dark', width: 375 };

// The disclosure closed with hidden values chosen: only the button's count and
// the sentence say so.
export const MoreFiltersClosed: Story = () => <Layout {...OPEN_PROPS} open={false} />;

// The variant: the same panel with no Apply Filters button, each change applying as
// the Categories picker already does.
export const ApplyOnChange: Story = () => <Layout {...OPEN_PROPS} onChange />;

export const NothingChosen: Story = () => (
  <Layout categories={[]} query="" sentence={<>214 ingredients.</>} />
);

// Alternative A from the record: every facet as a plain open row, no disclosure.
export const AllOpen: Story = () => <Layout {...OPEN_PROPS} variant="open" />;

export const AllOpenPhoneLight: Story = () => <AllOpen />;
AllOpenPhoneLight.meta = { theme: 'light', width: 375 };

export const AllOpenPhoneDark: Story = () => <AllOpen />;
AllOpenPhoneDark.meta = { theme: 'dark', width: 375 };

// Alternative B: the filters in a left column beside the results, stacking on a phone.
export const Sidebar: Story = () => <Layout {...OPEN_PROPS} variant="sidebar" />;

export const SidebarPhoneLight: Story = () => <Sidebar />;
SidebarPhoneLight.meta = { theme: 'light', width: 375 };

export const SidebarPhoneDark: Story = () => <Sidebar />;
SidebarPhoneDark.meta = { theme: 'dark', width: 375 };

// Alternative D: a Filters button, the chosen values as removable chips, and the
// filters in a tray (a right-hand drawer on desktop, a full-height sheet on a phone).
export const FiltersTray: Story = () => <Layout {...OPEN_PROPS} variant="tray" />;

export const FiltersTrayPhoneLight: Story = () => <FiltersTray />;
FiltersTrayPhoneLight.meta = { theme: 'light', width: 375 };

export const FiltersTrayPhoneDark: Story = () => <FiltersTray />;
FiltersTrayPhoneDark.meta = { theme: 'dark', width: 375 };

// Alternative E: every facet always visible as a one-line control in a compact grid
// (three columns wide, a plain stack on a phone), no disclosure.
export const Grid: Story = () => <Layout {...OPEN_PROPS} variant="grid" />;

export const GridPhoneLight: Story = () => <Grid />;
GridPhoneLight.meta = { theme: 'light', width: 375 };

export const GridPhoneDark: Story = () => <Grid />;
GridPhoneDark.meta = { theme: 'dark', width: 375 };

// Alternative F, "grid-tray", after the owner dropped the sidebar: the search box with a
// Filters (n) button beside it, the chosen values as chips, the sentence and the results the
// full width. Filters opens E's three-column grid as a panel that slides down over the
// results from under the search row (the results never move); non-modal from the tablet
// width up (no scrim; the focus goes in and returns to the button; Escape closes), and
// below it D's full-height sheet on showModal(). The sentence above the results is plain
// text with no links: values are set in a heavier weight, Clear All sits with the filters
// and ends the chip row, and a value is taken out only by its chip's cross. Counts follow
// every name, and show a placeholder while a search is on its way.
//
// In the page the panel renders inline and open until JavaScript takes over; the mock
// starts closed and does not model that.
const F_SENTENCE = (
  <>
    12 ingredients matching “<strong>rue</strong>”, in the <strong>Protection</strong> and{' '}
    <strong>Healing</strong> categories, as <strong>Oil</strong> or <strong>Tincture</strong>, of{' '}
    <strong>Hecate</strong>, under <strong>Scorpio</strong>, ruled by the <strong>Sun</strong> or{' '}
    <strong>Mars</strong>, in the <strong>Water</strong> element, that are{' '}
    <strong>not toxic</strong>.
  </>
);

const F_PROPS: LayoutProps = { ...OPEN_PROPS, sentence: F_SENTENCE, variant: 'grid-tray' };
// The panel shut, the state the page loads in.
const F_CLOSED: LayoutProps = { ...F_PROPS, open: false };

export const GridTray: Story = () => <Layout {...F_CLOSED} />;

// The panel open over the results (press Filters; here it starts open).
export const GridTrayOpen: Story = () => <Layout {...F_PROPS} />;

// The same panel with the selected Match and Toxic segment as an outline, to compare.
export const GridTrayOpenOutlined: Story = () => <Layout {...F_PROPS} outlinedStrip />;

// The phone: the panel is a modal sheet; open in these two, shut in the third.
export const GridTrayPhoneLight: Story = () => <Layout {...F_PROPS} />;
GridTrayPhoneLight.meta = { theme: 'light', width: 375 };

export const GridTrayPhoneDark: Story = () => <Layout {...F_PROPS} />;
GridTrayPhoneDark.meta = { theme: 'dark', width: 375 };

export const GridTrayPhoneClosed: Story = () => <Layout {...F_CLOSED} />;
GridTrayPhoneClosed.meta = { theme: 'light', width: 375 };

// Three more compact sentences, each on grid-tray with the panel shut (the sentence sits
// above the results) and the phone with the sheet shut.
export const SentenceDisclosure: Story = () => <Layout {...F_CLOSED} sentenceMode="disclosure" />;

export const SentenceDisclosurePhoneClosed: Story = () => (
  <Layout {...F_CLOSED} sentenceMode="disclosure" />
);
SentenceDisclosurePhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceDisclosurePhoneClosedDark: Story = () => <SentenceDisclosurePhoneClosed />;
SentenceDisclosurePhoneClosedDark.meta = { theme: 'dark', width: 375 };

export const SentenceTip: Story = () => <Layout {...F_CLOSED} sentenceMode="tip" />;

export const SentenceTipPhoneClosed: Story = () => <Layout {...F_CLOSED} sentenceMode="tip" />;
SentenceTipPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceTipPhoneClosedDark: Story = () => <SentenceTipPhoneClosed />;
SentenceTipPhoneClosedDark.meta = { theme: 'dark', width: 375 };

export const SentenceChips: Story = () => <Layout {...F_CLOSED} sentenceMode="chips" />;

export const SentenceChipsPhoneClosed: Story = () => <Layout {...F_CLOSED} sentenceMode="chips" />;
SentenceChipsPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceChipsPhoneClosedDark: Story = () => <SentenceChipsPhoneClosed />;
SentenceChipsPhoneClosedDark.meta = { theme: 'dark', width: 375 };

// The chips design with the sentence typed out as the loading animation. Press Slow
// Search (results after four seconds) or Fast Search (after 0.6 seconds).
export const SentenceTyped: Story = () => <Layout {...F_CLOSED} sentenceMode="typed" />;

export const SentenceTypedPhoneClosed: Story = () => <Layout {...F_CLOSED} sentenceMode="typed" />;
SentenceTypedPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceTypedPhoneClosedDark: Story = () => <SentenceTypedPhoneClosed />;
SentenceTypedPhoneClosedDark.meta = { theme: 'dark', width: 375 };

// sentence-disclosure joined to sentence-typed: the typed first line is the disclosure's
// summary, and the tail slides open and shut.
export const SentenceDisclosureTyped: Story = () => (
  <Layout {...F_CLOSED} sentenceMode="disclosure-typed" />
);

export const SentenceDisclosureTypedPhoneClosed: Story = () => (
  <Layout {...F_CLOSED} sentenceMode="disclosure-typed" />
);
SentenceDisclosureTypedPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceDisclosureTypedPhoneClosedDark: Story = () => (
  <SentenceDisclosureTypedPhoneClosed />
);
SentenceDisclosureTypedPhoneClosedDark.meta = { theme: 'dark', width: 375 };
