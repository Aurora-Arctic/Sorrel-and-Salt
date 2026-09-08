import type { Story } from '@ladle/react';
import ThemeToggle from '.';

// ThemeToggle in the workshop. The theme a story renders under comes from the
// toolbar control (the M0.31 decorator drives it), except where a story pins one
// with `.meta = { theme: '…' }` — handled in .ladle/components.tsx.
//
// These stories only render — no test ids, no snapshots (CLAUDE.md). What
// ThemeToggle *does* (click-to-light/dark, aria-pressed, the facet swap through
// the top, listener cleanup) is asserted in index.test.tsx with role and label
// queries.
// `Default` is pinned first for every component by `storyOrder` in
// .ladle/config.mjs — Ladle has no per-story-file ordering hook.
export default {
  title: 'ThemeToggle',
};

// Follows the toolbar's theme control — dark, light, or, unset (the default),
// whatever `prefers-color-scheme` resolves to.
export const Default: Story = () => <ThemeToggle />;

// Pinned light: the toggle once the viewer has chosen light — the interlaced
// solar-disc facet showing, `aria-pressed="true"`. The toolbar control has no
// effect while this story is open.
export const Light: Story = () => <ThemeToggle />;
Light.meta = { theme: 'light' };

// Pinned dark (the app's default theme): the woven-crescent facet showing,
// `aria-pressed="false"`.
export const Dark: Story = () => <ThemeToggle />;
Dark.meta = { theme: 'dark' };

// Reduced motion can't be forced from a story — it keys off the OS/browser
// `prefers-reduced-motion: reduce` setting. Turn it on (macOS: System Settings →
// Accessibility → Display → Reduce motion; or DevTools → Rendering → Emulate CSS
// media feature prefers-reduced-motion) and the facet swap and the hover scale
// drop to instant, per the `reduced-motion` mixin in index.scss. This story is a
// linkable home for checking that; it renders like Default otherwise.
export const ReducedMotion: Story = () => <ThemeToggle />;
