import type { Story } from '@ladle/react';
import { type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from 'react';
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
}: {
  label: string;
  placeholder: string;
  options: (ComboboxOption & { count: number })[];
  chosen: string[];
  onChange: (next: string[]) => void;
  iconOf?: (value: string) => ReactNode;
  /** Layout F: each chip reads its count too, "Oil (12)", as its option did. */
  countChips?: boolean;
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
                      {countChips
                        ? `${value} (${options.find((option) => option.value === value)?.count ?? 0})`
                        : value}
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
}: {
  value: string[];
  onChange: (next: string[]) => void;
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

// The sentence-typed mock: while a search runs the sentence types itself out as the
// loading animation, then finishes quickly on return, holds, and fades into the
// count line. The typed element is aria-hidden; the real status region (visually
// hidden) is given the finished sentence once, on return. The search is faked with
// two buttons, so the owner can see a slow one (the typing finishes first and waits)
// and a fast one (the typing speeds up to finish).
const SEARCHING = 'Searching for ingredients';
const COUNT_LEAD = '12 ingredients';
const TYPED_REST: { text: string; strong?: boolean }[] = [
  { text: ' matching “' },
  { text: 'rue', strong: true },
  { text: '”, in the ' },
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
const REST_LENGTH = TYPED_REST.reduce((sum, part) => sum + part.text.length, 0);
const typedTotal = (lead: string) => lead.length + REST_LENGTH;
/** Typing speed: one character a tick; a tick is about a frame. */
const TICK_MS = 16;
/** On return the remaining characters finish in about this long. */
const FINISH_MS = 300;
const HOLD_MS = 1000;
const FADE_MS = 400;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** The sentence as far as `shown` characters, the rest kept in place but invisible so the lines do not reflow. */
function typedText(lead: string, shown: number): ReactNode {
  let left = shown;
  let placed = false;
  return [{ text: lead } as { text: string; strong?: boolean }, ...TYPED_REST].map(
    (part, index) => {
      let visible = part.text;
      let rest = '';
      let caret: ReactNode = null;
      if (!placed && left <= part.text.length) {
        placed = true;
        visible = part.text.slice(0, Math.max(left, 0));
        rest = part.text.slice(Math.max(left, 0));
        caret = <span className="facet-layout__caret" />;
      } else if (placed) {
        visible = '';
        rest = part.text;
      }
      left -= part.text.length;
      const inner = (
        <>
          {visible}
          {caret}
          {rest && <span className="facet-layout__untyped">{rest}</span>}
        </>
      );
      return part.strong ? <strong key={index}>{inner}</strong> : <span key={index}>{inner}</span>;
    },
  );
}

type TypedPhase = 'idle' | 'typing' | 'holding' | 'fading';

function TypedSentence({ sentence, chips }: { sentence: ReactNode; chips: ReactNode }) {
  const [phase, setPhase] = useState<TypedPhase>('idle');
  const [returned, setReturned] = useState(false);
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState<{ id: number; delay: number } | null>(null);
  // The position is kept in a ref too, so the timers read the latest without re-running.
  const shownRef = useRef(0);
  const reduced = () => window.matchMedia(REDUCED_QUERY).matches;
  const lead = returned ? COUNT_LEAD : SEARCHING;
  const total = typedTotal(lead);
  const moveTo = (next: number) => {
    shownRef.current = next;
    setShown(next);
  };

  const start = (delay: number) => {
    setReturned(false);
    // Reduced motion: no typing, the whole sentence is there at once.
    moveTo(reduced() ? typedTotal(SEARCHING) : 0);
    setPhase('typing');
    setRun((previous) => ({ id: (previous?.id ?? 0) + 1, delay }));
  };

  // The fake search: the results come back after `delay`. The lead swaps to the count,
  // carrying the typed position over so the characters already shown stay shown. If the
  // typing had already finished (the slow search), it is done and the hold begins.
  useEffect(() => {
    if (!run) return undefined;
    const timer = window.setTimeout(() => {
      const position = shownRef.current;
      const carried =
        position >= SEARCHING.length
          ? position - SEARCHING.length + COUNT_LEAD.length
          : Math.min(position, COUNT_LEAD.length);
      moveTo(carried);
      setReturned(true);
      if (carried >= typedTotal(COUNT_LEAD)) setPhase('holding');
    }, run.delay);
    return () => window.clearTimeout(timer);
  }, [run]);

  // The typing: a character a tick, or on return the rest spread over FINISH_MS.
  useEffect(() => {
    if (phase !== 'typing') return undefined;
    const step = returned
      ? Math.max(1, Math.ceil((total - shownRef.current) / (FINISH_MS / TICK_MS)))
      : 1;
    const timer = window.setInterval(() => {
      const next = Math.min(shownRef.current + step, total);
      moveTo(next);
      if (returned && next >= total) setPhase('holding');
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [phase, returned, total]);

  // Held for a moment, then faded (at once under reduced motion), then back to rest.
  useEffect(() => {
    if (phase !== 'holding' && phase !== 'fading') return undefined;
    const timer = window.setTimeout(
      () => setPhase(phase === 'holding' && !reduced() ? 'fading' : 'idle'),
      phase === 'holding' ? HOLD_MS : FADE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  const searching = phase !== 'idle';
  const announced = phase === 'idle' || returned;
  return (
    <div className="facet-layout__sentence">
      <div className="facet-layout__mock-controls">
        <button type="button" className="btn" disabled={searching} onClick={() => start(4000)}>
          Slow Search
        </button>
        <button type="button" className="btn" disabled={searching} onClick={() => start(600)}>
          Fast Search
        </button>
      </div>
      <div className="facet-layout__swap">
        <p
          className={`facet-layout__count-line facet-layout__swap-count${
            phase === 'typing' || phase === 'holding' ? ' facet-layout__swap-count--off' : ''
          }`}
          aria-hidden={searching}
        >
          {COUNT_LEAD}
        </p>
        {searching && (
          <p
            className={`facet-layout__typed${phase === 'fading' ? ' facet-layout__typed--out' : ''}`}
            aria-hidden="true"
          >
            {typedText(lead, shown)}
          </p>
        )}
      </div>
      {chips}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <p role="status" className="facet-layout__sr">
        {announced ? sentence : null}
      </p>
    </div>
  );
}

type Variant = 'disclosure' | 'open' | 'sidebar' | 'tray' | 'grid' | 'sidebar-tray';

// `$shell-tablet-width` (48rem) in pixels, for the one place a script needs it.
const TABLET_QUERY = '(min-width: 768px)';

interface LayoutProps {
  variant?: Variant;
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
  /** Layout F, from the tablet width up: the column folded to a Filters button. */
  collapsed?: boolean;
  /** Layout F: how the search sentence is set. */
  sentenceMode?: 'full' | 'disclosure' | 'tip' | 'chips' | 'typed';
}

/** The proposal and its alternatives, interactive enough to open, pick and clear. */
function Layout({
  variant = 'disclosure',
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
  collapsed: initialCollapsed = false,
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
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [sentenceOpen, setSentenceOpen] = useState(false);
  // Layout F: the counts, the paired Match and Toxic row, no Classification.
  const fx = variant === 'sidebar-tray';
  const tipId = useId();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const sheetTitle = useId();
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
        onChange={setToxic}
      />
    </div>
  );

  const primary = (
    <div className="facet-layout__row">
      {categoriesBlock}
      {toxicBlock}
    </div>
  );

  // Layout F: the picker, then Match and Toxic on one row that wraps in a narrow column.
  const primaryF = (
    <>
      <CountedCategories value={categories} onChange={setCategories} />
      <div className="facet-layout__pair">
        {matchStrip}
        {toxicBlock}
      </div>
    </>
  );

  const panelItems = (
    <>
      <Typeahead
        label="Forms"
        countChips={fx}
        placeholder="Add Form"
        chosen={forms}
        onChange={setForms}
        iconOf={(value) => <FormIcon name={iconFor(value)} />}
        options={FORMS.map((form) => ({
          value: form.name,
          label: `${form.name} (${form.count})`,
          icon: <FormIcon name={form.icon} />,
          count: form.count,
        }))}
      />
      <Typeahead
        label="Deities"
        countChips={fx}
        placeholder="Add Deity"
        chosen={deities}
        onChange={setDeities}
        options={DEITIES.map((deity) => ({
          value: deity.name,
          label: `${deity.name} (${deity.count})`,
          heading: deity.tradition,
          count: deity.count,
        }))}
      />
      <Typeahead
        label="Zodiac"
        countChips={fx}
        placeholder="Add Sign"
        chosen={zodiac}
        onChange={setZodiac}
        options={counted(ZODIAC)}
      />
      <Typeahead
        label="Planets"
        countChips={fx}
        placeholder="Add Planet"
        chosen={planets}
        onChange={setPlanets}
        options={counted(PLANETS)}
      />
      <Typeahead
        label="Elements"
        countChips={fx}
        placeholder="Add Element"
        chosen={elements}
        onChange={setElements}
        options={counted(ELEMENTS)}
      />
      {!fx && (
        <FilterSelectField
          label="Classification"
          name="nomenclature"
          all="Any"
          options={NOMENCLATURE_OPTIONS}
          defaultValue={nomenclature}
          onChange={setNomenclature}
        />
      )}
      <SwitchField label="No Refs" name="withoutReferences" value="1" onChange={() => {}} />
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
  const chosen: { key: string; label: string; count: number; remove: () => void }[] = [
    ...categories.map((id) => ({
      key: `c-${id}`,
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
      <ul className="facet-layout__chosen" aria-label="Chosen filters">
        {chosen.map((item) => (
          <li key={item.key}>
            <button type="button" onClick={item.remove} aria-label={`Remove ${item.label}`}>
              {fx ? `${item.label} (${item.count})` : item.label}
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
    // A native <details>: the status region wraps it, so the count line is always read
    // and the full sentence once it is open.
    sentenceNode = (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <details> is not phrasing content, so not an <output>.
      <div role="status" className="facet-layout__sentence">
        <details
          className="facet-layout__disclosure"
          onToggle={(event) => setSentenceOpen(event.currentTarget.open)}
        >
          <summary>
            {countLine} · {sentenceOpen ? 'Hide Search' : 'Show Search'}{' '}
            <span aria-hidden="true" className="facet-layout__chevron">
              ▾
            </span>
          </summary>
          <p>{sentence}</p>
        </details>
      </div>
    );
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
  } else if (fx && sentenceMode === 'typed') {
    sentenceNode = <TypedSentence sentence={sentence} chips={chosenChips} />;
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

  // The sheet is a native <dialog>. From the tablet width up it is never opened: CSS
  // lays it out in place as the left column, so nothing takes the focus on load.
  // Below it, the Filters button (or `open`, for these stories) opens it with
  // showModal(): the top layer, the backdrop, the focus inside, Escape to close and the
  // focus back on the button are the browser's. A resize up to the column closes the modal.
  useEffect(() => {
    if (!fx) return undefined;
    const dialog = sheetRef.current;
    if (!dialog) return undefined;
    const media = window.matchMedia(TABLET_QUERY);
    if (!media.matches && open && !dialog.open) dialog.showModal();
    const widen = () => {
      if (media.matches && dialog.open) dialog.close();
    };
    media.addEventListener('change', widen);
    return () => media.removeEventListener('change', widen);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- the initial state only; the button opens it after.
  }, [fx]);

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
  } else if (variant === 'sidebar-tray') {
    const showFilters = () => {
      // The column's own button, folded: unfold it. Below the tablet width: the sheet.
      if (window.matchMedia(TABLET_QUERY).matches) setCollapsed(false);
      else sheetRef.current?.showModal();
    };
    body = (
      <div
        className={`facet-layout__split facet-layout__split--tray${collapsed ? ' facet-layout__split--collapsed' : ''}`}
      >
        <form {...formProps} className="form facet-layout facet-layout__side">
          <div className="facet-layout__bar">
            <div className="facet-layout__grow">{search}</div>
            <button type="button" className="btn facet-layout__sheet-open" onClick={showFilters}>
              {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
            </button>
          </div>
          {sentenceMode !== 'chips' && sentenceMode !== 'typed' && (
            <div className="facet-layout__sheet-only">{chosenChips}</div>
          )}
          {/* No `open` attribute: from the tablet width up CSS lays it out as the column
              (open or not), below it the effect above or the Filters button calls
              showModal(). A dialog opened by the attribute is not in the top layer, and the
              results would stack over it. */}
          <dialog ref={sheetRef} className="facet-layout__sheet" aria-labelledby={sheetTitle}>
            <div className="facet-layout__tray-head">
              <strong id={sheetTitle}>Filters</strong>
              <button
                type="button"
                className="btn facet-layout__sheet-only"
                onClick={() => sheetRef.current?.close()}
              >
                Close
              </button>
              <button
                type="button"
                className="btn facet-layout__column-only"
                onClick={() => setCollapsed(true)}
              >
                Hide Filters
              </button>
            </div>
            {primaryF}
            {panel}
            <div className="facet-layout__apply facet-layout__tray-foot">
              <button type="submit" className="btn btn--solid">
                Apply Filters
              </button>
              <button
                type="button"
                className="btn facet-layout__sheet-only"
                onClick={() => sheetRef.current?.close()}
              >
                Close
              </button>
              <a href={COMPENDIUM_PATH}>Clear All</a>
            </div>
          </dialog>
        </form>
        <div className="facet-layout__main">{results}</div>
      </div>
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

// Alternative F, the owner's call that the inline layouts take too much room: B's
// left column from the tablet width up, open or folded to a Filters button; below it,
// D's tray as a full-height sheet on the native <dialog> (showModal(): backdrop,
// Escape and focus return are the browser's), opened by Filters (n), the chosen values
// as chips under the search box. The sentence above the results is plain text with no
// links: values are set in bold, Clear All sits with the filters and ends the chip row,
// and a value is taken out only by its chip's cross. Counts follow every name.
const F_SENTENCE = (
  <>
    12 ingredients matching “<strong>rue</strong>”, in the <strong>Protection</strong> and{' '}
    <strong>Healing</strong> categories, as <strong>Oil</strong> or <strong>Tincture</strong>, of{' '}
    <strong>Hecate</strong>, under <strong>Scorpio</strong>, ruled by the <strong>Sun</strong> or{' '}
    <strong>Mars</strong>, in the <strong>Water</strong> element, that are{' '}
    <strong>not toxic</strong>.
  </>
);

const F_PROPS: LayoutProps = { ...OPEN_PROPS, sentence: F_SENTENCE, variant: 'sidebar-tray' };

// The column open, the state the page loads in at the tablet width and up.
export const SidebarTray: Story = () => <Layout {...F_PROPS} />;

export const SidebarTrayPhoneLight: Story = () => <SidebarTray />;
SidebarTrayPhoneLight.meta = { theme: 'light', width: 375 };

export const SidebarTrayPhoneDark: Story = () => <SidebarTray />;
SidebarTrayPhoneDark.meta = { theme: 'dark', width: 375 };

// The sheet closed: the chips and the sentence say what is chosen.
export const SidebarTrayPhoneClosed: Story = () => <Layout {...F_PROPS} open={false} />;
SidebarTrayPhoneClosed.meta = { theme: 'light', width: 375 };

// The column folded by Hide Filters: a Filters (7) button beside the search box, the
// chosen values as chips under it, the results the full width.
export const SidebarTrayCollapsed: Story = () => <Layout {...F_PROPS} collapsed />;

// Three more compact sentences, each on F: the desktop story with the column open
// (the sentence sits above the results) and the phone with the sheet closed.
export const SentenceDisclosure: Story = () => <Layout {...F_PROPS} sentenceMode="disclosure" />;

export const SentenceDisclosurePhoneClosed: Story = () => (
  <Layout {...F_PROPS} sentenceMode="disclosure" open={false} />
);
SentenceDisclosurePhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceDisclosurePhoneClosedDark: Story = () => <SentenceDisclosurePhoneClosed />;
SentenceDisclosurePhoneClosedDark.meta = { theme: 'dark', width: 375 };

export const SentenceTip: Story = () => <Layout {...F_PROPS} sentenceMode="tip" />;

export const SentenceTipPhoneClosed: Story = () => (
  <Layout {...F_PROPS} sentenceMode="tip" open={false} />
);
SentenceTipPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceTipPhoneClosedDark: Story = () => <SentenceTipPhoneClosed />;
SentenceTipPhoneClosedDark.meta = { theme: 'dark', width: 375 };

export const SentenceChips: Story = () => <Layout {...F_PROPS} sentenceMode="chips" />;

export const SentenceChipsPhoneClosed: Story = () => (
  <Layout {...F_PROPS} sentenceMode="chips" open={false} />
);
SentenceChipsPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceChipsPhoneClosedDark: Story = () => <SentenceChipsPhoneClosed />;
SentenceChipsPhoneClosedDark.meta = { theme: 'dark', width: 375 };

// The chips design with the sentence typed out as the loading animation. Press Slow
// Search (results after four seconds) or Fast Search (after 0.6 seconds).
export const SentenceTyped: Story = () => <Layout {...F_PROPS} sentenceMode="typed" />;

export const SentenceTypedPhoneClosed: Story = () => (
  <Layout {...F_PROPS} sentenceMode="typed" open={false} />
);
SentenceTypedPhoneClosed.meta = { theme: 'light', width: 375 };

export const SentenceTypedPhoneClosedDark: Story = () => <SentenceTypedPhoneClosed />;
SentenceTypedPhoneClosedDark.meta = { theme: 'dark', width: 375 };
