import type { Story } from '@ladle/react';
import Foundations from './foundations';

// Sits in .ladle/ because Foundations is not a component the app imports.
// Render-only: `workshop:build` catches an unresolvable import, not a throw.
// See claude-docs/workshop.md, "Commands and gates".
export default {
  title: 'Foundations',
};

// Follows the toolbar's theme control.
export const Default: Story = () => <Foundations />;

// Pinned light — the theme the eight group colours were tuned hardest against.
export const Light: Story = () => <Foundations />;
Light.meta = { theme: 'light' };

// Pinned dark — the app's default.
export const Dark: Story = () => <Foundations />;
Dark.meta = { theme: 'dark' };

// A phone's width, in each theme: every primitive has to hold at 375px.
export const PhoneDark: Story = () => <Foundations />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Foundations />;
PhoneLight.meta = { theme: 'light', width: 375 };
