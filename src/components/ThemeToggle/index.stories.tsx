import type { Story } from '@ladle/react';
import ThemeToggle from '.';

// Render-only: no test ids, no snapshots (CLAUDE.md). What ThemeToggle *does*
// is asserted in tests/components/ThemeToggle/index.test.tsx. The theme comes
// from the toolbar control unless a story pins one with `.meta = { theme: '…' }`,
// which .ladle/components.tsx honours over the toolbar.
export default {
  title: 'ThemeToggle',
};

// Follows the toolbar's theme control — dark, light, or, unset (the default),
// whatever `prefers-color-scheme` resolves to.
export const Default: Story = () => <ThemeToggle />;

// Pinned light: the solar-disc facet showing, `aria-pressed="true"`. Also the
// manual regression check for the sun swinging in on first paint (MB.2) —
// Ladle sets `data-theme` pre-paint the way the app's init script does, so
// reopening this story reproduces the timing the bug depended on. The paint
// timing itself has no automated coverage; the test guards the CSS rule that
// fixes it.
export const Light: Story = () => <ThemeToggle />;
Light.meta = { theme: 'light' };

// Pinned dark (the app's default theme): the woven-crescent facet showing,
// `aria-pressed="false"`.
export const Dark: Story = () => <ThemeToggle />;
Dark.meta = { theme: 'dark' };

// `.meta = { reducedMotion: true }` simulates the OS setting a story cannot
// flip (.ladle/components.tsx), so this renders as the real thing would: the
// facet swap and hover scale drop to instant, and a click parks the outgoing
// facet immediately rather than waiting on a transitionend that never fires.
export const ReducedMotion: Story = () => <ThemeToggle />;
ReducedMotion.meta = { reducedMotion: true };
