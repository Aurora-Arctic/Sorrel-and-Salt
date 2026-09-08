import type { Story } from '@ladle/react';
import DesignLanguage from './design-language';

// The design-language reference — type, colour tokens, category-group colours,
// chips, badges, the raised panel and the focus ring, all rendered from the
// real _variables.scss / _mixins.scss / _typography.scss (M0.32).
//
// This story file sits in .ladle/ rather than a component directory because
// DesignLanguage isn't a component — the app never imports it. The `stories`
// glob in config.mjs was widened to pick this location up. Render-only: no test
// ids, no snapshots (CLAUDE.md). `workshop:build` in CI (M0.33) is the smoke
// test — a throw here fails the build.
export default {
  title: 'Design language',
};

// Follows the toolbar's theme control — switch it to watch every token, chip
// and badge re-resolve together.
export const Default: Story = () => <DesignLanguage />;

// The whole vocabulary on the light (parchment) surface, pinned regardless of
// the toolbar — the app's non-default theme, and the one M0.6 tuned the eight
// group colours hardest against.
export const Light: Story = () => <DesignLanguage />;
Light.meta = { theme: 'light' };

// The whole vocabulary on the dark (soot) surface — the app's default theme.
export const Dark: Story = () => <DesignLanguage />;
Dark.meta = { theme: 'dark' };
