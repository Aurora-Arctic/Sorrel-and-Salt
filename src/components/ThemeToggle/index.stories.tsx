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
//
// Also the manual regression check for MB.2 (the sun facet swinging in on
// first paint in light mode): Ladle's own theme decorator sets `data-theme`
// pre-paint the same way the app's init script does (.ladle/components.tsx),
// so reopening this story reproduces the timing the bug depended on. There's
// no automated coverage for the paint-timing itself — that needs a real
// browser and this repo has no visual/e2e tooling yet (Playwright arrives in
// M1.28) — index.test.tsx instead guards the CSS rule that fixes it.
export const Light: Story = () => <ThemeToggle />;
Light.meta = { theme: 'light' };

// Pinned dark (the app's default theme): the woven-crescent facet showing,
// `aria-pressed="false"`.
export const Dark: Story = () => <ThemeToggle />;
Dark.meta = { theme: 'dark' };

// `prefers-reduced-motion: reduce` normally keys off the OS/browser setting,
// which a story can't flip — `.meta = { reducedMotion: true }` gets it
// simulated instead (.ladle/components.tsx: window.matchMedia patched to
// match, every transition in the frame zeroed by story-frame.scss), so this
// story renders exactly as it would under the real setting: the facet swap
// and the hover scale drop to instant, and a toggle click parks the outgoing
// facet immediately rather than waiting on a transitionend that reduced
// motion never fires (MB.1).
export const ReducedMotion: Story = () => <ThemeToggle />;
ReducedMotion.meta = { reducedMotion: true };
