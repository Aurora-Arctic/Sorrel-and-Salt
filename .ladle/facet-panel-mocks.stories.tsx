import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CompendiumFacetCounts } from '../src/components/CompendiumList/types';
import { SwitchField } from '../src/components/Field/switch-field';
import FacetPanel from '../src/components/FacetPanel';
import type { FacetPanelFilter } from '../src/components/FacetPanel/types';
import './facet-panel-mocks.scss';

// TEMPORARY (M9.7), kept in .ladle/ because the workshop globs read only index.stories.tsx in a component directory: three ways to draw the panel's "A, B or no filter" controls, for the owner
// to compare. Deleted once chosen. The panel takes no replacement row through props, so the
// real coven panel is rendered and its Match fieldset and small row are hidden while a mock
// is portalled into the small row's place. The mocks hold their own state; nothing applies.
// Each is native underneath: radios in a fieldset, checkboxes, a <details> for a menu.
export default {
  title: 'Admin / Facet Panel',
};

const GROUP = { id: 'g1', name: 'Protective', colorDark: '#2f6b4f', colorLight: '#b7dfc9' };
const OTHER = { id: 'g2', name: 'Restorative', colorDark: '#7a4b8f', colorLight: '#dcc6e8' };

const FACETS: CompendiumFacetCounts = {
  forms: [
    { value: 'test-oil', label: 'Test Oil', count: 12, icon: null },
    { value: 'test-leaf', label: 'Test Leaf', count: 9, icon: null },
  ],
  deities: [{ value: 'testa-fixtura', label: 'Testa', count: 6, tradition: 'Fixtura' }],
  categories: [
    { value: 'warding', label: 'Testwarding', count: 14, group: GROUP },
    { value: 'mending', label: 'Testmending', count: 8, group: OTHER },
  ],
  zodiac: [{ value: 'test-ram', label: 'Test Ram', count: 4 }],
  planets: [{ value: 'test-sun', label: 'Test Sun', count: 10 }],
  elements: [{ value: 'fire', label: 'Fire', count: 5 }],
  toxic: [
    { value: 'toxic', label: 'Toxic', count: 4 },
    { value: 'not_toxic', label: 'Not Toxic', count: 21 },
  ],
  withoutReferences: 7,
  source: [
    { value: 'local', label: 'Local', count: 18 },
    { value: 'compendium', label: 'Compendium', count: 0 },
  ],
  inStock: 9,
};

// Two categories chosen so Match is live, not resting disabled.
const START: FacetPanelFilter = {
  categories: ['warding', 'mending'],
  categoryMode: 'all',
  forms: [],
  deities: [],
  zodiac: [],
  planets: [],
  elements: [],
  toxic: '',
  withoutReferences: false,
  source: '',
  inStock: false,
};

type Option = { value: string; label: string; count?: number };

const MATCH: Option[] = [
  { value: 'all', label: 'All' },
  { value: 'any', label: 'Any' },
];
const TOXIC: Option[] = [
  { value: '', label: 'Any' },
  { value: 'toxic', label: 'Toxic', count: 4 },
  { value: 'not_toxic', label: 'Not Toxic', count: 21 },
];
const SOURCE: Option[] = [
  { value: '', label: 'All' },
  { value: 'local', label: 'Local', count: 18 },
  { value: 'compendium', label: 'Compendium', count: 0 },
];

const withCount = (option: Option, separator: 'trail' | 'paren') =>
  option.count === undefined
    ? option.label
    : separator === 'paren'
      ? `${option.label} (${option.count})`
      : option.label;

/** Mock 1's strip: native radios, each segment its text, the count a small trailing number. */
function Strip({
  legend,
  name,
  options,
}: {
  legend: string;
  name: string;
  options: Option[];
}): ReactElement {
  const [value, setValue] = useState(options[0].value);
  return (
    <fieldset className="fieldset radio-group radio-group--segmented">
      <legend className="fieldset__legend">{legend}</legend>
      <div className="radio-strip radio-strip--text">
        {options.map((option) => (
          <label key={option.value} className="radio radio--segment radio--text">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => setValue(option.value)}
            />
            {withCount(option, 'trail')}
            {option.count !== undefined && <span className="mock-count">{option.count}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Mock 2's chip: "Source: Local ▾", a <details> whose menu is a radio group with counts. */
function Chip({
  legend,
  name,
  options,
  open = false,
}: {
  legend: string;
  name: string;
  options: Option[];
  open?: boolean;
}): ReactElement {
  const [value, setValue] = useState(open && options[1] ? options[1].value : options[0].value);
  const chosen = options.find((option) => option.value === value) ?? options[0];
  return (
    <details className="mock-chip" open={open}>
      <summary>
        <span className="mock-chip__name">{legend}:</span>
        <span className="mock-chip__value">{chosen.label}</span>
        <span className="mock-chip__caret" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="mock-menu">
        <fieldset className="fieldset radio-group">
          <legend className="visually-hidden">{legend}</legend>
          {options.map((option) => (
            <label key={option.value} className="radio">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => setValue(option.value)}
              />
              {withCount(option, 'paren')}
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
}

/** Mock 3's Source: two checkboxes with counts; neither or both checked means both. */
function Checks(): ReactElement {
  const [local, setLocal] = useState(false);
  const [compendium, setCompendium] = useState(false);
  return (
    <fieldset className="fieldset radio-group">
      <legend className="fieldset__legend">Source</legend>
      <div className="mock-checks">
        <label className="checkbox">
          <input
            type="checkbox"
            name="source"
            value="local"
            checked={local}
            onChange={(event) => setLocal(event.target.checked)}
          />
          Local (18)
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="source"
            value="compendium"
            checked={compendium}
            onChange={(event) => setCompendium(event.target.checked)}
          />
          Compendium (0)
        </label>
      </div>
    </fieldset>
  );
}

function InStock(): ReactElement {
  const [on, setOn] = useState(false);
  return (
    <SwitchField label="In Stock (9)" name="inStock" value="1" checked={on} onChange={setOn} />
  );
}

type Variant = 'strip' | 'chips' | 'checks';

/** The small-controls row for one mock, Match included. */
function Row({ variant, openChip }: { variant: Variant; openChip?: string }): ReactElement {
  if (variant === 'chips') {
    return (
      <div className="mock-row mock-row--chips">
        <Chip legend="Match" name="mockMatch" options={MATCH} open={openChip === 'Match'} />
        <Chip legend="Toxic" name="mockToxic" options={TOXIC} open={openChip === 'Toxic'} />
        <Chip legend="Source" name="mockSource" options={SOURCE} open={openChip === 'Source'} />
        <InStock />
      </div>
    );
  }
  return (
    <div className="mock-row">
      <Strip legend="Match" name="mockMatch" options={MATCH} />
      <Strip legend="Toxic" name="mockToxic" options={TOXIC} />
      {variant === 'checks' ? (
        <Checks />
      ) : (
        <Strip legend="Source" name="mockSource" options={SOURCE} />
      )}
      <InStock />
    </div>
  );
}

/** The whole coven panel, open on desktop, with the mock's row where the small row stands. */
function MockPanel({ variant, openChip }: { variant: Variant; openChip?: string }): ReactElement {
  const frame = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => {
    const root = frame.current;
    if (!root) return;
    const small = root.querySelector('.facet-panel__small');
    // Match stands on the categories' line in the real panel; the mock row carries it instead.
    root.querySelector('.facet-panel__line .fieldset.radio-group')?.classList.add('mock-hidden');
    small?.classList.add('mock-host');
    setHost(small);
  }, []);
  // Press Filters once hydrated, on the wide layout only (below it the sheet is modal).
  useEffect(() => {
    if (!window.matchMedia('(min-width: 56rem)').matches) return;
    const button = frame.current?.querySelector<HTMLButtonElement>('.facet-panel__button');
    if (button && button.getAttribute('aria-expanded') !== 'true') button.click();
  }, []);
  return (
    <div ref={frame} style={{ minHeight: '34rem' }}>
      <form
        onSubmit={(event) => event.preventDefault()}
        style={{ position: 'relative', display: 'flex', gap: '1rem', alignItems: 'center' }}
      >
        <FacetPanel facets={FACETS} filter={START} clearHref="#clear" onChange={() => undefined} />
      </form>
      {host && createPortal(<Row variant={variant} openChip={openChip} />, host)}
      <p>The results sit here, and do not move when the panel opens.</p>
    </div>
  );
}

// The segmented strips kept: segments sized to their text, space(2) side padding, the count a
// small muted trailing number. Match, Toxic, Source and In Stock on one row.
export const MockStripTrimmed: Story = () => <MockPanel variant="strip" />;

// Each control a chip reading its name and value, opening a menu of radios with counts.
// Source is open here so the menu is seen.
export const MockChoiceChips: Story = () => <MockPanel variant="chips" openChip="Source" />;

// Source as two checkboxes with counts (neither or both checked = both); Match and Toxic as the
// trimmed strip.
export const MockCheckboxPair: Story = () => <MockPanel variant="checks" />;

// The three rows one above another, to compare widths in one view.
export const MockSideBySide: Story = () => (
  <div className="facet-panel--compact mock-stack">
    <div>
      <p className="mock-caption">Mock Strip Trimmed</p>
      <Row variant="strip" />
    </div>
    <div>
      <p className="mock-caption">Mock Choice Chips (Source open)</p>
      <div style={{ minHeight: '11rem' }}>
        <Row variant="chips" openChip="Source" />
      </div>
    </div>
    <div>
      <p className="mock-caption">Mock Checkbox Pair</p>
      <Row variant="checks" />
    </div>
  </div>
);
