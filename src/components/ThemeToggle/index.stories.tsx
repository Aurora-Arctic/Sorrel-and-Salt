import type { Story } from '@ladle/react';
import ThemeToggle from '.';

// Render-only; behaviour is asserted in tests/components/ThemeToggle. A story
// pins a theme with `.meta = { theme }`, which the decorator honours over the toolbar.
export default {
  title: 'Shell / Theme Toggle',
};

// Follows the toolbar's theme control. The first four stories draw the
// `corner` variant, as the root layout mounts it on a page with no shell: a
// quarter disc pinned to the story frame's top-right corner and clipped by its
// edge, which is the design.
export const Default: Story = () => <ThemeToggle />;

// Solar disc showing, `aria-pressed="true"`. Also the manual check for the sun
// swinging in on first paint: Ladle stamps `data-theme` pre-paint as the app's
// init script does, so this story reproduces that timing, which no test covers.
export const Light: Story = () => <ThemeToggle />;
Light.meta = { theme: 'light' };

// The app's default: crescent showing, `aria-pressed="false"`.
export const Dark: Story = () => <ThemeToggle />;
Dark.meta = { theme: 'dark' };

// `.meta = { reducedMotion: true }` simulates the OS setting (.ladle/components.tsx):
// transitions drop to instant and a click parks the outgoing facet at once.
export const ReducedMotion: Story = () => <ThemeToggle />;
ReducedMotion.meta = { reducedMotion: true };

// The disc in the flow, as the shell's bar draws it, and its small size, as
// the phone account panel does. No clip, no fixed position.
export const Inline: Story = () => <ThemeToggle variant="inline" />;

export const InlineSmall: Story = () => <ThemeToggle variant="inline" size="small" />;
