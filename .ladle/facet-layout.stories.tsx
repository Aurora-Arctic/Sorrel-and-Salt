import type { Story } from '@ladle/react';
import { type ReactElement, type ReactNode, useId, useState } from 'react';
import { AdminFrame } from './admin-frame';
import CategoryPicker from '../src/components/CategoryPicker';
import type { PickerCategory } from '../src/components/CategoryPicker/types';
import Combobox from '../src/components/Combobox';
import type { ComboboxOption } from '../src/components/Combobox/types';
import {
  FieldShell,
  fieldDescription,
  FilterSelectField,
  SearchField,
  SwitchField,
} from '../src/components/Field';
import FormIcon from '../src/components/FormIcon';
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
}: {
  label: string;
  placeholder: string;
  options: (ComboboxOption & { count: number })[];
  chosen: string[];
  onChange: (next: string[]) => void;
  iconOf?: (value: string) => ReactNode;
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
                    <span className="combobox__entry-text">{value}</span>
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

type Variant = 'disclosure' | 'open' | 'sidebar' | 'tray' | 'grid';

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
      {categories.length >= 2 && (
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
      )}
    </div>
  );

  const toxicBlock = (
    <div className="facet-layout__toxic">
      <Strip
        legend="Toxic"
        name="toxic"
        options={[
          { value: 'any', label: 'Any' },
          { value: 'toxic', label: 'Toxic' },
          { value: 'not-toxic', label: 'Not Toxic' },
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

  const panelItems = (
    <>
      <Typeahead
        label="Forms"
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
        placeholder="Add Sign"
        chosen={zodiac}
        onChange={setZodiac}
        options={counted(ZODIAC)}
      />
      <Typeahead
        label="Planets"
        placeholder="Add Planet"
        chosen={planets}
        onChange={setPlanets}
        options={counted(PLANETS)}
      />
      <Typeahead
        label="Elements"
        placeholder="Add Element"
        chosen={elements}
        onChange={setElements}
        options={counted(ELEMENTS)}
      />
      <FilterSelectField
        label="Classification"
        name="nomenclature"
        all="Any"
        options={NOMENCLATURE_OPTIONS}
        defaultValue={nomenclature}
        onChange={setNomenclature}
      />
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

  const results = (
    <>
      {/* The record names a role="status" paragraph, as the real sentence will be. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <p role="status" className="facet-layout__sentence">
        {sentence}
      </p>
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

  const formProps = {
    method: 'get',
    action: COMPENDIUM_PATH,
    className: 'form facet-layout',
    'aria-label': 'Filter the Compendium',
  };

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
    const chosen: { key: string; label: string; remove: () => void }[] = [
      ...categories.map((id) => ({
        key: `c-${id}`,
        label: categoryName(id),
        remove: () => without(categories, setCategories, id),
      })),
      ...forms.map((v) => ({ key: `f-${v}`, label: v, remove: () => without(forms, setForms, v) })),
      ...deities.map((v) => ({
        key: `d-${v}`,
        label: v,
        remove: () => without(deities, setDeities, v),
      })),
      ...zodiac.map((v) => ({
        key: `z-${v}`,
        label: v,
        remove: () => without(zodiac, setZodiac, v),
      })),
      ...planets.map((v) => ({
        key: `p-${v}`,
        label: v,
        remove: () => without(planets, setPlanets, v),
      })),
      ...elements.map((v) => ({
        key: `e-${v}`,
        label: v,
        remove: () => without(elements, setElements, v),
      })),
      ...(toxic === 'any'
        ? []
        : [
            {
              key: 'toxic',
              label: toxic === 'toxic' ? 'Toxic' : 'Not Toxic',
              remove: () => setToxic('any'),
            },
          ]),
    ];
    body = (
      <>
        <div className="facet-layout__bar">
          <div className="facet-layout__grow">{search}</div>
          <button type="button" className="btn" onClick={() => setTray(true)}>
            {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
          </button>
        </div>
        {chosen.length > 0 && (
          <ul className="facet-layout__chosen" aria-label="Chosen filters">
            {chosen.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={item.remove} aria-label={`Remove ${item.label}`}>
                  {item.label}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
