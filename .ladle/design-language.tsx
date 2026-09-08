import { type ReactElement, type ReactNode } from 'react';
import './design-language.scss';

// The design-language reference (M0.32). Not a screen the app routes to and not
// a component the app imports — a single workshop page that renders every
// shared primitive at the size it ships at, so a reviewer sees the whole
// vocabulary in one place and in either theme. It lives in .ladle/ rather than
// src/components/ for that reason; see
// claude-docs/design-decisions/m0.32-component-stories.md.
//
// Everything visible here is the real thing, pulled from the app's own .scss:
//   - all prose — headings, body, links, lists, `code` — from _typography.scss,
//     scoped into the workshop by .ladle/typography.scss
//   - the swatches are `var(--token)` straight from M0.6's theme mixins
//   - the chips, badges, raised panel and focus ring are M0.8's `chip()`,
//     `badge()`, `modal-surface()` and `focus-ring()` mixins
//
// design-language.scss's header lists the few things that are local (layout
// lengths, the `.dl-eyebrow` overline, `.dl-btn`, `.dl-binomial`) and why the
// app has no home for them yet. "The design will change" (CLAUDE.md) — this is
// a reference for the tokens and mixins, not a candidate layout.

// §6's eight category groups, slug → the group name the category seed uses.
// The hue behind each is in _variables.scss ($category-groups) and derived, not
// picked; see claude-docs/design-decisions/m0.7-category-and-safety-tokens.md.
const CATEGORY_GROUPS: readonly (readonly [slug: string, name: string])[] = [
  ['protection', 'Protection & defense'],
  ['cleansing', 'Cleansing & release'],
  ['prosperity', 'Prosperity & work'],
  ['love', 'Love & connection'],
  ['mind', 'Mind & spirit'],
  ['wellbeing', 'Wellbeing'],
  ['craft', 'Craft & change'],
  ['practice', 'Practice & place'],
];

// The raw palette — eight hand-picked hues, compile-time Sass values in
// _variables.scss ("named for the materials rather than for their role, since a
// role can change and #14120e cannot"). Every runtime token and every M0.7
// colour is a `color.adjust()` of one of these; nothing downstream is picked by
// eye. Hex is hardcoded here on purpose — these are constants, not `var()`s.
const RAW_PALETTE: readonly (readonly [name: string, hex: string, purpose: string])[] = [
  ['$soot', '#14120e', 'dark-theme page ground — a warm near-black, not neutral'],
  ['$soot-raised', '#1f1c16', 'dark-theme card / raised surface'],
  ['$parchment', '#efe9da', 'light-theme page ground'],
  ['$parchment-raised', '#f9f5ea', 'light-theme card / raised surface'],
  ['$chalk', '#ebe4d4', 'dark-theme body ink (13.4:1 on $soot-raised)'],
  ['$iron-gall', '#23201a', 'light-theme body ink (14.9:1 on $parchment-raised)'],
  ['$sorrel', '#4a6b34', 'the accent hue — the plant the app is half-named after'],
  ['$wax', '#8c3b2e', 'the secondary hue; the safety badge is derived from it'],
];

// Runtime tokens — the `var(--token)` layer components actually read. Each is a
// `color.adjust()` of the raw palette, resolved per theme by M0.6's theme-dark /
// theme-light mixins, so these swatches re-paint with the toolbar control.
const RUNTIME_TOKENS: readonly (readonly [token: string, purpose: string])[] = [
  ['--surface-page', 'the page background — what a full-bleed view sits on'],
  ['--surface-card', 'a raised surface: cards, the modal panel, table headers'],
  ['--text-primary', 'body copy and headings'],
  ['--text-muted', 'metadata — timestamps, binomials, counts, captions'],
  ['--accent', 'links and the primary action; the selected/active state'],
  ['--accent-hover', 'the accent under hover / active press'],
  ['--secondary', 'the second action in a pair (destructive, or "cancel")'],
  ['--secondary-hover', 'the secondary under hover / active press'],
  ['--text-on-color', 'the label on a solid fill — a loud chip, the safety badge'],
];

function PaletteSwatch({
  name,
  hex,
  purpose,
}: {
  name: string;
  hex: string;
  purpose: string;
}): ReactElement {
  return (
    <div className="dl-swatch">
      <span className="dl-swatch__bar" style={{ background: hex }} />
      <code className="dl-swatch__name">{name}</code>
      <code className="dl-swatch__hex">{hex}</code>
      <span className="dl-swatch__role">{purpose}</span>
    </div>
  );
}

function Swatch({ token, purpose }: { token: string; purpose: string }): ReactElement {
  return (
    <div className="dl-swatch">
      <span className="dl-swatch__bar" style={{ background: `var(${token})` }} />
      <code className="dl-swatch__name">{token}</code>
      <span className="dl-swatch__role">{purpose}</span>
    </div>
  );
}

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
    <div className="dl-sec-head">
      <p className="dl-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="dl-note">{children}</p>
    </div>
  );
}

export default function DesignLanguage(): ReactElement {
  return (
    <div className="dl">
      <header className="dl-masthead">
        <p className="dl-eyebrow">Sorrel &amp; Salt · design language</p>
        <h1>The pieces every screen is built from</h1>
        <p className="dl-note">
          Type, colour tokens, category-group colours, chips, badges, the raised panel and the focus
          ring — each one rendered from the same <code>_variables.scss</code>,{' '}
          <code>_mixins.scss</code> and <code>_typography.scss</code> the components use, with no
          value re-typed here. Switch the toolbar theme control to see all of it move together; the{' '}
          <strong>Light</strong> and <strong>Dark</strong> stories pin a theme.
        </p>
      </header>

      <section id="dl-palette">
        <SectionHead eyebrow="M0.6 · _variables.scss" title="The raw palette">
          Eight hand-picked hues — &#8220;parchment and iron-gall ink&#8221;. Named for the
          material, not the role, because a role can change and <code>#14120e</code> can&#8217;t.
          Every runtime token and every M0.7 colour below is a <code>color.adjust()</code> of one of
          these; nothing downstream is chosen by eye. Fixed values, so these swatches don&#8217;t
          move with the theme.
        </SectionHead>
        <div className="dl-panel dl-swatches">
          {RAW_PALETTE.map(([name, hex, purpose]) => (
            <PaletteSwatch key={name} name={name} hex={hex} purpose={purpose} />
          ))}
        </div>
      </section>

      <section id="dl-typography">
        <SectionHead eyebrow="_typography.scss" title="Type">
          Cormorant Unicase for display, Lexend 300 for body (M0.6). All four heading levels run at
          700 — Cormorant Unicase&#8217;s heaviest — because its delicate hairlines read light at
          small sizes on a dark ground. The scale is anchored at h4 = 1.5rem and stepped up by ~1.2.
          These are the document rules themselves, scoped into the workshop as of M0.32.
        </SectionHead>
        <div className="dl-panel dl-type">
          <h1>Heading one — clamp(2.5rem, 5vw, 3.75rem)</h1>
          <h2>Heading two — 2.15rem</h2>
          <h3>Heading three — 1.8rem</h3>
          <h4>Heading four — 1.5rem</h4>
          <p>
            Body copy is Lexend at 300, 1rem, line-height 1.5, with a touch of letter-spacing so it
            doesn&#8217;t set too tight. A <a href="#dl-typography">link</a> wears{' '}
            <code>$accent</code> and picks up an underline under <code>prefers-contrast: more</code>
            ; tab to it for the shared focus ring.
          </p>
          <ul>
            <li>Unordered lists drop the disc for a ◆ marker in the accent colour.</li>
            <li>The marker is absolutely positioned in the gutter, so wraps stay aligned.</li>
          </ul>
        </div>
      </section>

      <section id="dl-surfaces">
        <SectionHead
          eyebrow="M0.6 · --surface-* / --text-* / --accent-* / --secondary-*"
          title="Runtime tokens — what components read"
        >
          The <code>var(--token)</code> layer every component is coloured from — a{' '}
          <code>color.adjust()</code> of the raw palette above, resolved per theme by M0.6&#8217;s
          theme mixins. Every pairing clears WCAG AA against both surfaces of its theme (ratios in{' '}
          <code>claude-docs/design-decisions/m0.6-typography-and-palette.md</code>). These swatches
          re-paint when the toolbar control changes.
        </SectionHead>
        <div className="dl-panel dl-swatches">
          {RUNTIME_TOKENS.map(([token, purpose]) => (
            <Swatch key={token} token={token} purpose={purpose} />
          ))}
        </div>
        <div className="dl-panel dl-shadows">
          <div className="dl-shadow dl-shadow--elevated">
            <code className="dl-swatch__name">--shadow-elevated</code>
            <span className="dl-swatch__role">a modal or popover lifted off the page</span>
          </div>
          <div className="dl-shadow dl-shadow--floating">
            <code className="dl-swatch__name">--shadow-floating</code>
            <span className="dl-swatch__role">a nested surface — a confirm over an open modal</span>
          </div>
        </div>
      </section>

      <section id="dl-groups">
        <SectionHead eyebrow="M0.7 · --group-*" title="Category-group colours">
          Eight hues, one rotation of <code>$sorrel</code> offset by half a step so none lands on
          the accent or secondary hue. Shown as the <code>chip()</code> mixin&#8217;s two states —
          unselected (the label wears the colour) and selected (solid fill, label inverted onto the
          page surface).
        </SectionHead>
        <div className="dl-panel dl-groups">
          {CATEGORY_GROUPS.map(([slug, name]) => (
            <div className="dl-group-row" key={slug}>
              <span className={`dl-chip dl-chip--${slug}`}>{name}</span>
              <span className={`dl-chip dl-chip--${slug} is-selected`}>{name}</span>
              <code className="dl-group-slug">--group-{slug}</code>
            </div>
          ))}
        </div>
      </section>

      <section id="dl-badges">
        <SectionHead eyebrow="M0.7 / M0.8 · --badge-*" title="Badges">
          Two, and deliberately not equals. <strong>Safety</strong> is a warning (story 53) — the
          sealing-wax hue, drawn solid. <strong>Low stock</strong> is an inventory state (story 54),
          so it takes the muted ink tinted into the surface, not a hue of its own. Square-cornered,
          which is what keeps a badge from reading as a chip.
        </SectionHead>
        <div className="dl-panel dl-badges">
          <span className="dl-badge dl-badge--safety">Toxic</span>
          <span className="dl-badge dl-badge--low-stock">Low stock</span>
        </div>
      </section>

      <section id="dl-panel">
        <SectionHead eyebrow="M0.8 · modal-surface()" title="Raised panel">
          The surface behind a modal — card colour, a soft radius and the elevated shadow. It sets
          colour, edge and shadow and nothing else; the component that owns a modal centres, sizes
          and dims it.
        </SectionHead>
        <div className="dl-modal-demo">
          <div className="dl-modal">
            <h4>Delete this spell?</h4>
            <p>The Hearth Warding Jar and its six ingredients will be removed from the grimoire.</p>
            <div className="dl-modal__actions">
              <button type="button" className="dl-btn dl-btn--secondary">
                Delete
              </button>
              <button type="button" className="dl-btn">
                Keep it
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="dl-focus">
        <SectionHead eyebrow="M0.8 · focus-ring()" title="Focus ring">
          One outline for every interactive element — 2px of the body ink, offset 2px, so it
          re-colours with the theme without a call site naming one. Tab to the button.
        </SectionHead>
        <div className="dl-panel dl-focus">
          <button type="button" className="dl-btn dl-focus__target">
            Focus me
          </button>
        </div>
      </section>

      <section id="dl-specimen">
        <SectionHead eyebrow="everything at once" title="An ingredient card">
          Chips and badges competing for the same eye at shipping size. Foxglove is genuinely deadly
          — which is what the safety badge is for.
        </SectionHead>
        <div className="dl-modal-demo">
          <article className="dl-modal dl-specimen">
            <div className="dl-specimen__top">
              <div>
                <h4>Foxglove</h4>
                <p className="dl-binomial">Digitalis purpurea</p>
              </div>
              <div className="dl-specimen__badges">
                <span className="dl-badge dl-badge--safety">Toxic</span>
                <span className="dl-badge dl-badge--low-stock">Low stock</span>
              </div>
            </div>
            <div className="dl-specimen__chips">
              <span className="dl-chip dl-chip--protection is-selected">
                Protection &amp; defense
              </span>
              <span className="dl-chip dl-chip--mind">Mind &amp; spirit</span>
              <span className="dl-chip dl-chip--craft">Craft &amp; change</span>
            </div>
            <p className="dl-specimen__stock">
              <span>Dried leaf · 4&nbsp;g on hand</span>
              <code className="dl-specimen__threshold">threshold 10&nbsp;g</code>
            </p>
          </article>
        </div>
      </section>

      <footer className="dl-foot">
        <p className="dl-note">
          Source of every value on this page: <code>src/scss/_variables.scss</code> (raw palette,{' '}
          <code>$category-groups</code>, <code>$badge-palettes</code>, the type stacks),{' '}
          <code>src/scss/_mixins.scss</code> (<code>chip()</code>, <code>badge()</code>,{' '}
          <code>modal-surface()</code>, <code>focus-ring()</code>, <code>theme-transition()</code>)
          and <code>src/scss/_typography.scss</code>. Reasoning in{' '}
          <code>claude-docs/design-decisions/</code> — M0.6, M0.7, M0.8.
        </p>
      </footer>
    </div>
  );
}
