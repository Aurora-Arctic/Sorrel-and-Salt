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
  RadioGroupField,
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
// Toxic uses the radio list layout: the strip layout is icon-only.
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

const RESULTS = ['Rue', 'Wormwood', 'Mugwort', 'Fixture Salt'];

/** A row of checkbox chips, each a native checkbox in a label; a zero is disabled, not hidden. */
function ChipRow({
  legend,
  name,
  items,
  chosen,
  onToggle,
}: {
  legend: string;
  name: string;
  items: Counted[];
  chosen: string[];
  onToggle: (value: string) => void;
}): ReactElement {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset__legend">{legend}</legend>
      <div className="facet-layout__chips">
        {items.map(({ name: value, count }) => (
          <label key={value} className="facet-layout__chip">
            <input
              type="checkbox"
              name={name}
              value={value}
              checked={chosen.includes(value)}
              disabled={count === 0 && !chosen.includes(value)}
              onChange={() => onToggle(value)}
            />
            {value} <span className="facet-layout__count">({count})</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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

interface LayoutProps {
  open?: boolean;
  onChange?: boolean;
  forms?: string[];
  deities?: string[];
  zodiac?: string[];
  planets?: string[];
  categories?: string[];
  toxic?: 'any' | 'toxic' | 'not-toxic';
  query?: string;
  sentence: ReactNode;
}

/** The whole proposal, interactive enough to open, pick and clear. */
function Layout({
  open = false,
  onChange = false,
  forms: initialForms = [],
  deities: initialDeities = [],
  zodiac: initialZodiac = [],
  planets: initialPlanets = [],
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
  const [nomenclature, setNomenclature] = useState('');
  const toggle = (list: string[], set: (next: string[]) => void) => (value: string) =>
    set(list.includes(value) ? list.filter((other) => other !== value) : [...list, value]);
  const hidden = forms.length + deities.length + zodiac.length + planets.length;

  return (
    <AdminFrame open={COMPENDIUM_PATH}>
      <main>
        <PageHeader title="Compendium" />
        <form
          method="get"
          action={COMPENDIUM_PATH}
          className="form facet-layout"
          aria-label="Filter the Compendium"
        >
          <SearchField
            label="Search"
            name="query"
            placeholder="Search Names"
            value={query}
            onChange={setQuery}
          />
          <div className="facet-layout__row">
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
                <RadioGroupField
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
            <div className="facet-layout__toxic">
              <RadioGroupField
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
          </div>

          <details className="facet-layout__more" open={open || undefined}>
            <summary>{hidden > 0 ? `More Filters (${hidden})` : 'More Filters'}</summary>
            <div className="facet-layout__panel">
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
              <div className="facet-layout__wide">
                <ChipRow
                  legend="Zodiac"
                  name="zodiac"
                  items={ZODIAC}
                  chosen={zodiac}
                  onToggle={toggle(zodiac, setZodiac)}
                />
              </div>
              <div className="facet-layout__wide">
                <ChipRow
                  legend="Planets"
                  name="planets"
                  items={PLANETS}
                  chosen={planets}
                  onToggle={toggle(planets, setPlanets)}
                />
              </div>
              <FilterSelectField
                label="Classification"
                name="nomenclature"
                all="Any"
                options={NOMENCLATURE_OPTIONS}
                defaultValue={nomenclature}
                onChange={setNomenclature}
              />
              <SwitchField label="No Refs" name="withoutReferences" value="1" onChange={() => {}} />
            </div>
          </details>

          <div className="facet-layout__apply">
            {/* Once hydrated, ApplyOnChange drops this; the submit stays for the form before hydration. */}
            {!onChange && (
              <button type="submit" className="btn btn--solid">
                Apply Filters
              </button>
            )}
            <a href={COMPENDIUM_PATH}>Clear All</a>
          </div>
        </form>

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
    <Link>Mars</Link>, that are <Link>not toxic</Link>. <Link>Clear All</Link>
  </>
);

const OPEN_PROPS: LayoutProps = {
  open: true,
  forms: ['Oil', 'Tincture'],
  deities: ['Hecate'],
  zodiac: ['Scorpio'],
  planets: ['Sun', 'Mars'],
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
