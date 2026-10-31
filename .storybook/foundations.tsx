import { type ReactElement, type ReactNode, useId, useState } from 'react';
import { CATEGORY_GROUPS } from '../src/db/seed/category-groups';
import { chipColors } from '../src/lib/chip-colors';
import { SOCIAL_PROVIDERS } from '../src/lib/social-providers';
import { RadioGroupField, SwitchField } from '../src/components/Field';
import InfoTip from '../src/components/InfoTip';
import IngredientCard from '../src/components/IngredientCard';
import { Jars } from '../src/components/IngredientCard/story-jars';
import { ListNavigationContext } from '../src/components/ListFrame';
import Pager from '../src/components/Pager';
import PageNav from '../src/components/PageNav';
import ProviderMark from '../src/components/ProviderMark';
import { ProviderUnavailableNote } from '../src/components/ProviderMark/unavailable-note';
import { PROVIDER_MARKS } from '../src/components/SignInPanel/icons';
// The brand buttons' own rules, which only SignInPanel's stylesheet carries.
import '../src/components/SignInPanel/index.scss';
import type { SeedCategoryGroup } from '../src/db/seed/types';
import type { ListNavigation } from '../src/components/ListFrame/types';
import type { SafetyVariant } from '../src/components/SafetyNote/types';
import type { ProviderId } from '../src/lib/types';
import { route } from './route';
import './foundations.scss';

// Every shared token and primitive at shipping size, in either theme, with no value re-typed:
// all come from the app's own .scss (claude-docs/workshop.md, ".storybook/"). A reference, not a layout.

// A seeded group by name, for the specimen's chips: its colour pair is what
// the row carries, as a page's chip would read it.
function seededGroup(name: string): SeedCategoryGroup {
  const group = CATEGORY_GROUPS.find((g) => g.name === name);
  if (!group) throw new Error(`No seeded category group is named "${name}".`);
  return group;
}

// Compile-time Sass constants, so these do not move with the theme.
// The card's sample data, invented (Testwort, never a real plant). Its chips
// read the seeded groups' colour pairs, as a page's chips would.
const SPECIMEN_CATEGORIES = ['Protection & Defense', 'Mind & Spirit', 'Craft & Change'].map(
  (name, i) => ({ category: { id: `specimen-${i}`, name }, group: seededGroup(name) }),
);
const SPECIMEN_FORMS: SafetyVariant[] = [
  { form: 'dried leaf', formChoice: { group: { icon: 'botanical' } }, safetyNotes: '' },
  { form: 'whole root', safetyNotes: '' },
  { form: 'oil', formChoice: { group: { icon: 'fluid' } }, safetyNotes: '' },
];

const RAW_PALETTE: readonly (readonly [name: string, purpose: string])[] = [
  ['soot', 'dark-theme page ground — a warm near-black, not neutral'],
  ['soot-raised', 'dark-theme card / raised surface'],
  ['parchment', 'light-theme page ground'],
  ['parchment-raised', 'light-theme card / raised surface'],
  ['chalk', 'dark-theme body ink'],
  ['iron-gall', 'light-theme body ink'],
  ['sorrel', 'the accent hue — the plant the app is half-named after'],
  ['wax', 'the secondary hue; the safety badge is derived from it'],
];

// The `var(--token)` layer, resolved per theme, so these re-paint with the toolbar.
const RUNTIME_TOKENS: readonly (readonly [token: string, purpose: string])[] = [
  ['--surface-page', 'the page background — what a full-bleed view sits on'],
  ['--surface-card', 'a raised surface: cards, the modal panel, a field'],
  ['--text-primary', 'body copy and headings'],
  ['--text-muted', 'metadata, hints, a field’s edge, the quiet button'],
  ['--accent', 'links and the primary action; the selected/active state'],
  ['--accent-hover', 'a link under hover / active press'],
  ['--accent-solid-hover', 'the solid button under hover — a bigger step'],
  ['--secondary', 'a destructive action, and every error'],
  ['--secondary-hover', 'the secondary under hover / active press'],
  ['--text-on-color', 'the label on a solid fill — a solid button, a loud chip'],
];

// The Pager section's list: nothing on its way, and a press going nowhere.
const STILL_LIST: ListNavigation = { pending: false, searching: false, go: () => {} };

// Keys only: each value, and the label beside it, is printed by
// foundations.scss from the map in _variables.scss.
const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TYPE_SIZES = ['body', 'small', 'caption', 'overline', 'tab'] as const;
const RADII = ['sharp', 'control', 'surface', 'pill'] as const;

function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="lede">{children}</p>
    </div>
  );
}

// One provider's sign-in button in one state, with SignInPanel's classes,
// so the brand section shows the buttons as the page draws them.
function BrandButton({
  id,
  label,
  state,
}: {
  id: ProviderId;
  label: string;
  state: 'available' | 'greyed' | 'last-used';
}): ReactElement {
  const Mark = PROVIDER_MARKS[id];
  const noteId = `fd-brand-note-${id}`;
  const greyed = state === 'greyed';
  return (
    <div className="sign-in-panel__provider">
      <button
        type="button"
        className={
          greyed
            ? 'btn sign-in-panel__button'
            : `btn sign-in-panel__button sign-in-panel__button--${id}`
        }
        aria-disabled={greyed ? true : undefined}
        aria-describedby={greyed ? noteId : undefined}
        aria-label={state === 'last-used' ? `Continue with ${label}, last used` : undefined}
      >
        <Mark chip />
        Continue with {label}
        {state === 'last-used' && (
          <span className="badge badge--last-used sign-in-panel__last-used">Last Used</span>
        )}
      </button>
      {greyed && <ProviderUnavailableNote id={noteId} />}
    </div>
  );
}

const BRAND_STATES = [
  ['available', 'Available'],
  ['greyed', 'Unavailable'],
  ['last-used', 'Last Used'],
] as const;

function Fields(): ReactElement {
  const id = useId();
  const [keptAs, setKeptAs] = useState<'dried' | 'fresh'>('dried');
  return (
    <form className="form panel fd-form" noValidate onSubmit={(event) => event.preventDefault()}>
      <p className="notice notice--error" role="alert">
        Another entry in the compendium is already Mugwort (dried leaf).
      </p>

      <div className="field">
        <div className="field__label-row">
          <label className="field__label" htmlFor={`${id}-common`}>
            Common Name
            <span className="field__required" aria-hidden="true">
              *
            </span>
          </label>
          <InfoTip id={`${id}-common-tip`} label="Common Name">
            What most people call it. A save asks for one.
          </InfoTip>
        </div>
        <input
          className="input"
          id={`${id}-common`}
          aria-required="true"
          aria-describedby={`${id}-common-tip`}
          defaultValue="Mugwort"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-name`}>
          Name
        </label>
        <p className="field__hint" id={`${id}-name-hint`}>
          What this coven calls it. It can differ from the formal name.
        </p>
        <input
          className="input"
          id={`${id}-name`}
          aria-describedby={`${id}-name-hint`}
          defaultValue="Mugwort"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-nomenclature`}>
          Naming System
        </label>
        <select className="select" id={`${id}-nomenclature`} defaultValue="botanical">
          <option value="">Choose one</option>
          <option value="botanical">Botanical</option>
          <option value="fungal">Fungal</option>
          <option value="mineral">Mineral</option>
          <option value="unknown">Unknown</option>
          <option value="none">None</option>
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-canonical`}>
          Formal Name
        </label>
        <input
          className="input"
          id={`${id}-canonical`}
          aria-invalid="true"
          aria-describedby={`${id}-canonical-error`}
          defaultValue=""
        />
        <p className="field__error" id={`${id}-canonical-error`}>
          A botanical entry needs its formal name
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-element`}>
          Element
        </label>
        <select
          className="select"
          id={`${id}-element`}
          aria-invalid="true"
          aria-describedby={`${id}-element-error`}
          defaultValue=""
        >
          <option value="">None</option>
          <option value="earth">Earth</option>
          <option value="air">Air</option>
        </select>
        <p className="field__error" id={`${id}-element-error`}>
          Choose one of the five elements
        </p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${id}-description`}>
          Description
        </label>
        <textarea
          className="textarea"
          id={`${id}-description`}
          placeholder="What it is, and what it is used for"
        />
      </div>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Where It Is Kept</legend>
        <label className="checkbox">
          <input type="checkbox" defaultChecked />
          The apothecary shelf
        </label>
        <label className="checkbox">
          <input type="checkbox" />
          The drying rack
        </label>
        <label className="checkbox">
          <input type="checkbox" disabled />
          The locked cabinet (owners only)
        </label>
      </fieldset>

      <RadioGroupField
        legend="Kept As"
        name={`${id}-kept-as`}
        options={[
          { value: 'dried', label: 'Dried', description: 'Hung or laid out until brittle.' },
          { value: 'fresh', label: 'Fresh', description: 'Used within days of picking.' },
        ]}
        value={keptAs}
        onChange={setKeptAs}
      />

      <div className="field">
        <label className="field__label" htmlFor={`${id}-slug`}>
          Slug
        </label>
        <input className="input" id={`${id}-slug`} disabled defaultValue="mugwort-dried-leaf" />
      </div>

      <div className="form__actions">
        <button type="submit" className="btn btn--solid">
          Save
        </button>
        <button type="button" className="btn btn--quiet">
          Cancel
        </button>
      </div>
    </form>
  );
}

// A list's rows, as an admin value list draws them: invented names, one
// action at the end of each row.
const TABLE_ROWS: readonly (readonly [name: string, group: string, entries: number])[] = [
  ['Protection', 'Wards', 12],
  ['Cleansing', 'Purification', 8],
  ['Dreamwork', 'Sight', 5],
  ['Prosperity', 'Hearth', 3],
];

// The `.data-table` primitive in its frame; with `stack`, the `.data-table--stack` modifier with
// explicit roles and `data-label`s (claude-docs/styling.md, "Tables at phone width"). The roles
// are written out because WebKit drops them once `display` changes on a table's parts.
function DataTable({ label, stack = false }: { label: string; stack?: boolean }): ReactElement {
  const role = (name: string): { role?: string } => (stack ? { role: name } : {});
  return (
    <div className="data-table-frame">
      <table
        className={stack ? 'data-table data-table--stack' : 'data-table'}
        aria-label={label}
        {...role('table')}
      >
        <thead {...role('rowgroup')}>
          <tr {...role('row')}>
            <th scope="col" {...role('columnheader')}>
              Name
            </th>
            <th scope="col" {...role('columnheader')}>
              Group
            </th>
            <th scope="col" {...role('columnheader')}>
              Ingredients
            </th>
            <th scope="col" {...role('columnheader')}>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody {...role('rowgroup')}>
          {TABLE_ROWS.map(([name, group, entries]) => (
            <tr key={name} {...role('row')}>
              <td data-label="Name" {...role('cell')}>
                {name}
              </td>
              <td data-label="Group" {...role('cell')}>
                {group}
              </td>
              <td data-label="Ingredients" {...role('cell')}>
                {entries}
              </td>
              <td data-label="" {...role('cell')}>
                <a className="btn btn--small" href="#fd-data-table">
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A `.switch` through `SwitchField`, holding its own state as a filter does.
function Switch({
  label,
  on = false,
  disabled,
}: {
  label: string;
  on?: boolean;
  disabled?: boolean;
}): ReactElement {
  const [checked, setChecked] = useState(on);
  return (
    <SwitchField
      label={label}
      name="flag"
      value="1"
      checked={checked}
      onChange={setChecked}
      disabled={disabled}
    />
  );
}

// A list's filter form on the `.filter-row` primitive: the query first, as
// the row's narrow rule expects, then a select, a switch and the button.
function FilterRow(): ReactElement {
  const id = useId();
  return (
    <search>
      <form
        className="filter-row"
        aria-label="Filter Categories"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="field">
          <label className="field__label" htmlFor={`${id}-query`}>
            Name or Description
          </label>
          <input className="input" id={`${id}-query`} type="search" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-group`}>
            Group
          </label>
          <select className="select" id={`${id}-group`} defaultValue="">
            <option value="">Any Group</option>
            <option value="wards">Wards</option>
            <option value="sight">Sight</option>
          </select>
        </div>
        <Switch label="Unused Only" />
        <button type="submit" className="btn btn--solid">
          Filter
        </button>
      </form>
    </search>
  );
}

export default function Foundations(): ReactElement {
  return (
    <div className="fd">
      <header className="header">
        <p className="eyebrow">Sorrel &amp; Salt · foundations</p>
        <h1>The pieces every screen is built from</h1>
        <p className="lede">
          Palette, type, spacing and every shared primitive, each rendered from the same{' '}
          <code>_variables.scss</code>, <code>_mixins.scss</code>, <code>_typography.scss</code> and{' '}
          <code>_primitives.scss</code> the components use. Switch the toolbar theme to see all of
          it move together; the toolbar's viewport menu sets the width.
        </p>
      </header>

      <section id="fd-palette">
        <SectionHead eyebrow="_variables.scss" title="The Raw Palette">
          Eight hand-picked hues — “parchment and iron-gall ink”. Named for the material, not the
          role, because a role can change and a hex can’t. Every runtime token and group colour is a{' '}
          <code>color.adjust()</code> of one of these. Fixed values, so these swatches don’t move
          with the theme.
        </SectionHead>
        <div className="panel fd-swatches">
          {RAW_PALETTE.map(([name, purpose]) => (
            <div className="fd-swatch" key={name}>
              <span className={`fd-swatch__bar fd-raw--${name}`} />
              <code className="fd-swatch__name">${name}</code>
              <code className={`fd-swatch__hex fd-raw--${name}`} />
              <span className="fd-swatch__role">{purpose}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="fd-tokens">
        <SectionHead
          eyebrow="--surface-* / --text-* / --accent-* / --secondary-*"
          title="Runtime Tokens"
        >
          The <code>var(--token)</code> layer every component is coloured from, resolved per theme
          by the theme mixins. Every pairing clears WCAG AA against both surfaces of its theme.
          These re-paint when the toolbar control changes.
        </SectionHead>
        <div className="panel fd-swatches">
          {RUNTIME_TOKENS.map(([token, purpose]) => (
            <div className="fd-swatch" key={token}>
              <span className="fd-swatch__bar" style={{ background: `var(${token})` }} />
              <code className="fd-swatch__name">{token}</code>
              <span className="fd-swatch__role">{purpose}</span>
            </div>
          ))}
        </div>
        <div className="fd-shadows">
          <div className="fd-shadow fd-shadow--elevated">
            <code className="fd-swatch__name">--shadow-elevated</code>
            <span className="fd-swatch__role">a modal or popover lifted off the page</span>
          </div>
          <div className="fd-shadow fd-shadow--floating">
            <code className="fd-swatch__name">--shadow-floating</code>
            <span className="fd-swatch__role">a button; a confirm over an open modal</span>
          </div>
        </div>
      </section>

      <section id="fd-type">
        <SectionHead eyebrow="_typography.scss · type-size()" title="Type">
          Cormorant Unicase for display, Lexend 300 for body. All four heading levels run at 700,
          Cormorant Unicase’s heaviest, since its hairlines read light at small sizes on a dark
          ground. Every paragraph stops at the 66ch measure. Then the text roles a heading gathers —{' '}
          <code>.eyebrow</code>, <code>.meta</code>, <code>.binomial</code>, <code>.lede</code> —
          and, below body copy, four sizes by role.
        </SectionHead>
        <div className="panel tight-headings">
          <h1>Heading one</h1>
          <h2>Heading two</h2>
          <h3>Heading three</h3>
          <h4>Heading four</h4>
          <p>
            Body copy is Lexend at 300, 1rem, line-height 1.5, with a touch of letter-spacing so it
            doesn’t set too tight. A <a href="#fd-type">link</a> wears the accent and picks up an
            underline under <code>prefers-contrast: more</code>; tab to it for the focus ring. This
            paragraph runs long on purpose, so that on a wide screen it shows where the reading
            measure stops a line even when the panel around it keeps going.
          </p>
          <ul>
            <li>Unordered lists drop the disc for a ◆ marker in the accent colour.</li>
            <li>The marker hangs in the gutter, so wraps stay aligned.</li>
          </ul>
          <header className="header fd-text-roles">
            <p className="eyebrow">Eyebrow · the section it sits in</p>
            <h3>Mugwort</h3>
            <p className="meta">
              <span className="binomial">Artemisia vulgaris</span> · dried leaf · meta, with a
              binomial
            </p>
            <p className="lede">
              A lede: the muted sentence or two under a heading that says what the section is for.
            </p>
          </header>
          <div className="fd-type-sizes">
            {TYPE_SIZES.map((role) => (
              <p className={`fd-type-size fd-type-size--${role}`} key={role}>
                The quick brown fox, rendered at this role’s size
              </p>
            ))}
          </div>
        </div>
      </section>

      <section id="fd-spacing">
        <SectionHead eyebrow="_variables.scss · space()" title="Spacing">
          Eight steps on a 0.25rem base, for every margin, padding and gap. A chip’s or badge’s
          inner padding is its own geometry and stays off the scale.
        </SectionHead>
        <div className="panel fd-scale">
          {SPACE_STEPS.map((step) => (
            <div className={`fd-scale__row fd-space--${step}`} key={step}>
              <span className="fd-scale__bar" />
            </div>
          ))}
        </div>
      </section>

      <section id="fd-radii">
        <SectionHead eyebrow="_variables.scss · radius()" title="Corner Radius">
          Four radii by role, so a button beside a field matches it and a panel holding both reads
          as the thing that holds them.
        </SectionHead>
        <div className="panel fd-radii">
          {RADII.map((role) => (
            <span className={`fd-radius fd-radius--${role}`} key={role} />
          ))}
        </div>
      </section>

      <section id="fd-buttons">
        <SectionHead eyebrow="_primitives.scss · .btn" title="Buttons">
          The outline is the default. Solid is a view’s one primary action, quiet is Cancel, and wax
          is for what destroys something. Disabled from either attribute: <code>disabled</code> for
          a submit with nothing to send, <code>aria-disabled</code> for one that must stay in the
          tab order. Tab through them for the focus ring, which every interactive element shares:
          2px of the body ink, offset 2px, so it re-colours with the theme. Small is a size, not a
          colour, so it composes with every variant.
        </SectionHead>
        <div className="panel fd-buttons">
          <button type="button" className="btn">
            Default
          </button>
          <button type="button" className="btn btn--solid">
            Solid
          </button>
          <button type="button" className="btn btn--quiet">
            Quiet
          </button>
          <button type="button" className="btn btn--destructive">
            Destructive
          </button>
          <button type="button" className="btn" disabled>
            Disabled
          </button>
          <button type="button" className="btn" aria-disabled="true">
            Aria-disabled
          </button>
        </div>
        <div className="panel fd-buttons">
          <button type="button" className="btn btn--small">
            Small
          </button>
          <button type="button" className="btn btn--solid btn--small">
            Small Solid
          </button>
          <button type="button" className="btn btn--quiet btn--small">
            Small Quiet
          </button>
          <button type="button" className="btn btn--destructive btn--small">
            Small Destructive
          </button>
        </div>
      </section>

      <section id="fd-notices">
        <SectionHead eyebrow="_primitives.scss · .notice" title="Notices">
          A sentence about the whole view rather than one field — a form’s root error, a warning, a
          sent confirmation. An error and a warning lead with a triangle: the error’s red
          throughout, the warning’s plain box with the triangle alone in red, for what needs
          attention but does not block. The role is the markup’s: an <code>alert</code> for an error
          that arrived late, an <code>&lt;output&gt;</code> for news.
        </SectionHead>
        <div className="panel fd-notices">
          <p className="notice notice--error">That link has expired. Send a new one below.</p>
          <p className="notice notice--warn">
            Close to the dark theme colour of “Testwort Wards”, so their chips may be hard to tell
            apart.
          </p>
          <p className="notice notice--success">
            We’ve sent a link to ada@example.test. Open it in this browser within an hour.
          </p>
          <p className="notice">Nothing has changed since you last saved.</p>
        </div>
      </section>

      <section id="fd-fields">
        <SectionHead eyebrow="_primitives.scss · .form / .field" title="Form Fields">
          Label, an optional hint, the control, and its error beneath it — the resolver’s or the
          server’s, drawn the same. The error edge is a second pixel as well as a colour, and a rule
          that belongs to no one field is a notice above them all. A label with a tip or a required
          mark beside it sits in a <code>.field__label-row</code>; the mark is{' '}
          <code>.field__required</code>, hidden from a screen reader, which hears the control's{' '}
          <code>aria-required</code> instead.
        </SectionHead>
        <Fields />
      </section>

      <section id="fd-switch">
        <SectionHead eyebrow="_primitives.scss · .switch" title="The Switch">
          An on-or-off choice, a filter's, as a slide toggle: a native checkbox with the switch
          role, so it submits with its form and keeps Space and its label's click. A field like any
          other: its label above, the toggle beneath at a control's height. Off is the field's
          ground and muted edge with the thumb at the start; on fills the track with the accent and
          the thumb slides to the end, so where it sits says which without its colour. Tab to one
          for the focus ring; press and hold for the stretched thumb. Disabled is dashed and faded,
          its label dimmed, as a field is.
        </SectionHead>
        <div className="panel fd-switches">
          <Switch label="Off" />
          <Switch label="On" on />
          <Switch label="Disabled Off" disabled />
          <Switch label="Disabled On" on disabled />
        </div>
      </section>

      <section id="fd-page-frame">
        <SectionHead eyebrow="_primitives.scss · .page-frame" title="The Page Frame">
          The centred, full-height column of a page: Welcome, sign-in and the invitation, which have
          no AppShell, and the pages inside the shell that carry a column of their own, the account
          pages and the not-authorized page among them. Its children stand a <code>space(6)</code>{' '}
          apart, the gap alone spacing them, and stop at the measure; <code>--narrow</code> stops
          them at <code>$narrow-column</code>, the forms' column. A section of a framed page is{' '}
          <code>__section</code>, and the hairline between two is <code>__rule</code>. Drawn here at
          a fixed height rather than the window's.
        </SectionHead>
        <div className="fd-frames">
          <div className="fd-frame-stage">
            <div className="page-frame">
              <div className="header">
                <p className="eyebrow">Sorrel &amp; Salt</p>
                <h2>A Prose Page</h2>
                <p className="lede">
                  The plain frame, as Welcome and the not-authorized page use it: a column as wide
                  as the reading measure.
                </p>
              </div>
              <p>A paragraph beneath the head, a gap below it rather than a margin.</p>
            </div>
          </div>
          <div className="fd-frame-stage">
            <div className="page-frame page-frame--narrow">
              <h1>A Form Page</h1>
              <PageNav
                label="On this page"
                entries={[
                  { href: '#fd-frame-first', label: 'First Section' },
                  { href: '#fd-frame-second', label: 'Second Section' },
                ]}
              />
              <section className="page-frame__section" aria-labelledby="fd-frame-first">
                <h2 id="fd-frame-first">First Section</h2>
                <p className="lede">
                  The narrow frame, as the account page uses it: a bare heading, then the page’s own
                  nav.
                </p>
              </section>
              <hr className="page-frame__rule" />
              <section className="page-frame__section" aria-labelledby="fd-frame-second">
                <h2 id="fd-frame-second">Second Section</h2>
                <p className="lede">Each section a named region, the rule between them.</p>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section id="fd-data-table">
        <SectionHead eyebrow="_primitives.scss · .data-table" title="Data Tables">
          A list's table inside its <code>.data-table-frame</code>, banded on the card surface so a
          wide row stays readable across. With <code>--stack</code>, a frame narrower than{' '}
          <code>$table-stack-width</code> turns each row into a card: the header row hidden, every
          cell led by its own <code>data-label</code>, and a cell whose label is empty, an action,
          across the foot. A stacking table carries explicit <code>role</code> attributes, since
          WebKit drops a table's meaning once its parts change <code>display</code>. The second
          table sits in a phone-width box, so its frame stacks at any window size.
        </SectionHead>
        <div className="fd-tables">
          <DataTable label="Categories" />
          <div className="fd-phone">
            <DataTable label="Categories at Phone Width" stack />
          </div>
        </div>
      </section>

      <section id="fd-pager">
        <SectionHead eyebrow="_primitives.scss · .pager" title="The Pager">
          A paged list's Prev and Next, centred under its table, with where the list stands between
          them. An end with no page is disabled rather than hidden, so neither moves. Drawn by the{' '}
          <code>Pager</code> component, on its first page and on a middle one.
        </SectionHead>
        {/* A pager reads its list's navigation, which a page's ListFrame
            provides; here one that goes nowhere, and never pending. */}
        <ListNavigationContext.Provider value={STILL_LIST}>
          <div className="fd-pagers">
            <Pager nextHref="#fd-pager" position={{ page: 1, pages: 3 }} />
            <Pager previousHref="#fd-pager" nextHref="#fd-pager" position={{ page: 2, pages: 3 }} />
          </div>
        </ListNavigationContext.Provider>
      </section>

      <section id="fd-filter-row">
        <SectionHead eyebrow="_primitives.scss · .filter-row" title="The Filter Row">
          A list's filter form: the query, its selects and checks and the Filter button, wrapping on
          their line's end so each stands level with the boxes beside it. Under the forms' column of
          its own width, the query takes the whole line and the rest wrap beneath it, as in the
          phone-width box.
        </SectionHead>
        <div className="fd-tables">
          <FilterRow />
          <div className="fd-phone">
            <FilterRow />
          </div>
        </div>
      </section>

      <section id="fd-page-header">
        <SectionHead eyebrow="_primitives.scss · .page-header" title="The Page Header">
          A page's heading with its one primary action at the line's end, brought down to the
          heading's letters. Under the forms' column of its own width, the action goes beneath the
          heading, and inside <code>.page-column</code> it spans the line, as in the phone-width
          box, which carries that class.
        </SectionHead>
        <div className="fd-tables">
          <div className="page-header">
            <h1>Category Groups</h1>
            <a className="btn btn--solid" href="#fd-page-header">
              Add Category Group
            </a>
          </div>
          <div className="fd-phone page-column">
            <div className="page-header">
              <h1>Category Groups</h1>
              <a className="btn btn--solid" href="#fd-page-header">
                Add Category Group
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="fd-groups">
        <SectionHead eyebrow="seed defaults · chipColors()" title="Category-Group Colours">
          Not a foundation to sign off: each group’s colour pair lives on its{' '}
          <code>category_groups</code> row, which an admin edits, contrast-checked on write. These
          are the eight the seed writes — one rotation of <code>$sorrel</code> offset by half a
          step, so none lands on the accent or secondary hue — at <code>chip()</code>’s two levels,
          each wearing its pair inline as a page’s chip does, the theme picking one. Full is the
          category chip wherever a category shows; quiet is for a control, such as the card’s +N.
        </SectionHead>
        <div className="panel fd-groups">
          {CATEGORY_GROUPS.map((group) => (
            <div className="fd-group-row" key={group.name}>
              <span className="chip" style={chipColors(group)}>
                {group.name}
              </span>
              <span className="chip chip--quiet" style={chipColors(group)}>
                {group.name}
              </span>
              <code className="fd-group-pair">
                {group.colorDark} · {group.colorLight}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section id="fd-badges">
        <SectionHead eyebrow="--badge-*" title="Badges">
          Deliberately not equals. <strong>Safety</strong> is a warning, drawn solid in the
          sealing-wax hue. <strong>Low stock</strong> is an inventory state, the muted ink tinted
          into the surface. <strong>Last Used</strong> is a pointer, solid in the accent.{' '}
          <strong>Local</strong> marks a coven's own entry, the accent tinted into the surface.
        </SectionHead>
        <div className="panel badges">
          <span className="badge badge--safety">Toxic</span>
          <span className="badge badge--low-stock">Low Stock</span>
          <span className="badge badge--last-used">Last Used</span>
          <span className="badge badge--local">Local</span>
        </div>
      </section>

      <section id="fd-brands">
        <SectionHead eyebrow="_variables.scss · brand-color()" title="Brand Colours">
          Each sign-in provider's own button, coloured from <code>$brand-palettes</code> rather than
          our tokens, since the colours are the provider's. A white button takes its brand's edge,
          which holds 3:1 against both pages. Hover a button for its hover ground. An unavailable
          provider drops its brand colour for the dashed, faded <code>.btn</code> and says why
          beneath it, so the state is never told apart by hue alone.
        </SectionHead>
        <div className="panel fd-brands">
          {BRAND_STATES.map(([state, title]) => (
            <div className="fd-brand-column" key={state}>
              <h3>{title}</h3>
              <div className="sign-in-panel__providers">
                {SOCIAL_PROVIDERS.map((provider) => (
                  <BrandButton
                    key={provider.id}
                    id={provider.id}
                    label={provider.label}
                    state={state}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <ul className="panel fd-brand-parts">
          {SOCIAL_PROVIDERS.map((provider) => (
            <li key={provider.id}>
              <code className="fd-swatch__name">{provider.id}</code>
              <code className={`fd-brand-part fd-brand-part--${provider.id}`} />
            </li>
          ))}
        </ul>
      </section>

      <section id="fd-provider-mark">
        <SectionHead eyebrow="_primitives.scss · .provider-mark" title="Provider Marks">
          A provider's mark on a small circle of its brand's ground, for a list of sign-in methods
          rather than a button: the account page's rows and the admin user list. Decorative, since
          the provider's name always sits beside it.
        </SectionHead>
        <ul className="panel fd-marks">
          {SOCIAL_PROVIDERS.map((provider) => (
            <li key={provider.id}>
              <ProviderMark id={provider.id} />
              {provider.label}
            </li>
          ))}
        </ul>
      </section>

      <section id="fd-modal">
        <SectionHead eyebrow="modal-surface()" title="Modal">
          The surface behind a dialog: card colour, a soft radius and the elevated shadow. The
          component that owns a modal centres, sizes and dims it.
        </SectionHead>
        <div className="fd-stage">
          <div className="modal">
            <h3>Delete this spell?</h3>
            <p>The Hearth Warding Jar and its six ingredients will be removed from the grimoire.</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--destructive">
                Delete
              </button>
              <button type="button" className="btn btn--quiet">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="fd-specimen">
        <SectionHead eyebrow="everything at once" title="An Ingredient Card">
          The real <code>IngredientCard</code> (see <code>ingredient-card.md</code>), built from
          invented sample data: chips and badges competing for the same eye at shipping size.
          Testwort is flagged toxic — which is what the safety badge is for.
        </SectionHead>
        <div className="fd-stage">
          <IngredientCard
            href={route('/compendium/ingredients/testwort-testalis')}
            label="Testwort"
            formalName="Fixtura testalis"
            nomenclature="botanical"
            kind="own"
            toxic
            categories={SPECIMEN_CATEGORIES}
            variants={SPECIMEN_FORMS}
          >
            <Jars />
          </IngredientCard>
        </div>
      </section>

      <footer className="footer">
        <p className="lede">
          Every value on this page comes from <code>src/scss/</code>: the palette, scales and
          accessors in <code>_variables.scss</code>, the drawing mixins in <code>_mixins.scss</code>
          , prose in <code>_typography.scss</code> and the class layer in{' '}
          <code>_primitives.scss</code>. The reasoning is in <code>claude-docs/styling.md</code>.
        </p>
      </footer>
    </div>
  );
}
