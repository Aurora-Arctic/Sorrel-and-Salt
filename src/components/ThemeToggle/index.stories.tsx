import type { Story } from '@ladle/react';
import ThemeToggle from '.';

// Render-only; behaviour is asserted in tests/components/ThemeToggle. A story
// pins a theme with `.meta = { theme }`, which the decorator honours over the toolbar.
export default {
  title: 'ThemeToggle',
};

// Follows the toolbar's theme control.
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
