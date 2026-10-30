# Sorrel & Salt conventions

Read this before composing screens. These are facts of the library; the component pages say the rest.

## Vocabulary

- Compendium: the global, admin-curated ingredient reference (what exists). Ingredients: a coven's own ingredients and stock (what you have). Grimoire: a coven's spells (what you make).
- Say "coven" in screen text; never "catalog" or "workspace" in UI copy.
- Labels, buttons, headings, dialog titles and column headings use Title Case. Prose uses British spelling ("colour"). "&" is welcome in headings.

## Setup

- Load `styles.css`, then `_ds_bundle.js`; components are on `window.SorrelAndSalt`. Put React on the page first.
- The product is dark-first. Set `data-theme="dark"` or `"light"` on `<html>`; with no attribute it follows the system. Tokens are CSS custom properties that change with the theme: `--surface-page`, `--surface-card`, `--text-primary`, `--text-muted`, `--shadow-elevated`, `--shadow-lifted`, `--shadow-floating`. Use them; do not hard-code hexes.
- Give the page `background: var(--surface-page)` and `color: var(--text-primary)`. Fonts are Cormorant Unicase (display) and Lexend (body), loaded from the web.
- Components that read data need the app providers (React Query client and status region) around them. Anything workspace-specific also needs its data passed as props; nothing here fetches for you in a static page.

## Layout

- Whole-page screens sit inside `AppShell` (signed in) or `PublicFrame` (signed out, the public compendium). Do not nest one in the other.
- Pages never sit on a bare white ground: the page surface is the dark or light token above.
- Lists and cards are width-responsive: give them at least 900px, or expect folding (nav tabs fold into "More", card grids drop columns).

## Behaviour to respect

- Spell visibility only widens (private to workspace), never back.
- Viewers write nothing: hide or disable write controls for them.
- Unit conversion works within weight or within volume only; anything else is refused, not guessed.
- Forms: Save is disabled until there is something to save; destructive actions use the destructive button style.
