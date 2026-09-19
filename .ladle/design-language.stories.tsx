import type { Story } from '@ladle/react';
import DesignLanguage from './design-language';

// The design-language reference, rendered from the real partials. This story
// file sits in .ladle/ rather than a component directory because DesignLanguage
// is not a component — the app never imports it, and config.mjs's second
// `stories` glob exists for exactly this. Render-only: no test ids, no
// snapshots (CLAUDE.md). Nothing asserts it renders — `workshop:build` catches
// an unresolvable import and not a throw. See
// claude-docs/workshop.md, "Commands and gates".
export default {
  title: 'Design language',
};

// Follows the toolbar's theme control — switch it to watch every token, chip
// and badge re-resolve together.
export const Default: Story = () => <DesignLanguage />;

// The whole vocabulary on the light (parchment) surface, pinned regardless of
// the toolbar — the theme the eight group colours were tuned hardest against.
export const Light: Story = () => <DesignLanguage />;
Light.meta = { theme: 'light' };

// The whole vocabulary on the dark (soot) surface — the app's default theme.
export const Dark: Story = () => <DesignLanguage />;
Dark.meta = { theme: 'dark' };
