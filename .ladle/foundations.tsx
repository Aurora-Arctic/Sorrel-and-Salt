import { type ReactElement, type ReactNode, useId } from 'react';
import { CATEGORY_GROUPS } from '../src/db/seed/category-groups';
import { chipColors } from '../src/lib/chip-colors';
import type { SeedCategoryGroup } from '../src/db/seed/types';
import './foundations.scss';

// Every shared token and primitive at shipping size, in either theme, with no
// value re-typed: colours, lengths and their labels all come from the app's
// own .scss. A reference for what the sections are built from, not a layout.
// claude-docs/workshop.md, ".ladle/".

// A seeded group by name, for the specimen's chips: its colour pair is what
// the row carries, as a page's chip would read it.
function seededGroup(name: string): SeedCategoryGroup {
  const group = CATEGORY_GROUPS.find((g) => g.name === name);
  if (!group) throw new Error(`No seeded category group is named "${name}".`);
  return group;
}

// Compile-time Sass constants, so these do not move with the theme.
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

// Keys only: each value, and the label beside it, is printed by
// foundations.scss from the map in _variables.scss.
const SPACE_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TYPE_SIZES = ['body', 'small', 'caption', 'overline'] as const;
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

function Fields(): ReactElement {
  const id = useId();
  return (
    <form className="form panel fd-form" noValidate onSubmit={(event) => event.preventDefault()}>
      <p className="notice notice--error" role="alert">
        Another entry in the compendium is already Mugwort (dried leaf).
      </p>

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
          Naming system
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
          Formal name
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
        <legend className="fieldset__legend">Where it is kept</legend>
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
          it move together; the <strong>Light</strong>, <strong>Dark</strong> and{' '}
          <strong>Phone</strong> stories pin a theme and a width.
        </p>
      </header>

      <section id="fd-palette">
        <SectionHead eyebrow="_variables.scss" title="The raw palette">
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
          title="Runtime tokens"
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
        <SectionHead eyebrow="_variables.scss · radius()" title="Corner radius">
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
          <button type="button" className="btn btn--secondary">
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
          <button type="button" className="btn btn--secondary btn--small">
            Small Destructive
          </button>
        </div>
      </section>

      <section id="fd-notices">
        <SectionHead eyebrow="_primitives.scss · .notice" title="Notices">
          A sentence about the whole view rather than one field — a form’s root error, a sent
          confirmation. The role is the markup’s: an <code>alert</code> for an error that arrived
          late, an <code>&lt;output&gt;</code> for news of success.
        </SectionHead>
        <div className="panel fd-notices">
          <p className="notice notice--error">That link has expired. Send a new one below.</p>
          <p className="notice notice--success">
            We’ve sent a link to ada@example.test. Open it in this browser within an hour.
          </p>
          <p className="notice">Nothing has changed since you last saved.</p>
        </div>
      </section>

      <section id="fd-fields">
        <SectionHead eyebrow="_primitives.scss · .form / .field" title="Form fields">
          Label, an optional hint, the control, and its error beneath it — the resolver’s or the
          server’s, drawn the same. The error edge is a second pixel as well as a colour, and a rule
          that belongs to no one field is a notice above them all.
        </SectionHead>
        <Fields />
      </section>

      <section id="fd-groups">
        <SectionHead eyebrow="seed defaults · chipColors()" title="Category-group colours">
          Not a foundation to sign off: each group’s colour pair lives on its{' '}
          <code>category_groups</code> row, which an admin edits, contrast-checked on write. These
          are the eight the seed writes — one rotation of <code>$sorrel</code> offset by half a
          step, so none lands on the accent or secondary hue — as <code>chip()</code>’s two states,
          each wearing its pair inline as a page’s chip does, the theme picking one.
        </SectionHead>
        <div className="panel fd-groups">
          {CATEGORY_GROUPS.map((group) => (
            <div className="fd-group-row" key={group.name}>
              <span className="chip" style={chipColors(group)}>
                {group.name}
              </span>
              <span className="chip is-selected" style={chipColors(group)}>
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
          into the surface. <strong>Last used</strong> is a pointer, solid in the accent.
        </SectionHead>
        <div className="panel badges">
          <span className="badge badge--safety">Toxic</span>
          <span className="badge badge--low-stock">Low stock</span>
          <span className="badge badge--last-used">Last used</span>
        </div>
      </section>

      <section id="fd-modal">
        <SectionHead eyebrow="modal-surface()" title="Modal">
          The surface behind a dialog: card colour, a soft radius and the elevated shadow. The
          component that owns a modal centres, sizes and dims it.
        </SectionHead>
        <div className="fd-stage">
          <div className="modal">
            <h4>Delete this spell?</h4>
            <p>The Hearth Warding Jar and its six ingredients will be removed from the grimoire.</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--secondary">
                Delete
              </button>
              <button type="button" className="btn btn--quiet">
                Keep It
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="fd-specimen">
        <SectionHead eyebrow="everything at once" title="An ingredient card">
          Chips and badges competing for the same eye at shipping size. Foxglove is genuinely deadly
          — which is what the safety badge is for.
        </SectionHead>
        <div className="fd-stage">
          <article className="modal specimen">
            <div className="specimen__top">
              <div>
                <h4>Foxglove</h4>
                <p className="meta binomial">Digitalis purpurea</p>
              </div>
              <div className="specimen__badges">
                <span className="badge badge--safety">Toxic</span>
                <span className="badge badge--low-stock">Low stock</span>
              </div>
            </div>
            <div className="specimen__chips">
              <span
                className="chip is-selected"
                style={chipColors(seededGroup('Protection & Defense'))}
              >
                Protection &amp; defense
              </span>
              <span className="chip" style={chipColors(seededGroup('Mind & Spirit'))}>
                Mind &amp; spirit
              </span>
              <span className="chip" style={chipColors(seededGroup('Craft & Change'))}>
                Craft &amp; change
              </span>
            </div>
            <p className="specimen__stock">
              <span>Dried leaf · 4&nbsp;g on hand</span>
              <code className="specimen__threshold">threshold 10&nbsp;g</code>
            </p>
          </article>
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
