import type { Story } from '@ladle/react';
import DesignLanguage from './design-language';

// Sits in .ladle/ because DesignLanguage is not a component the app imports.
// Render-only: `workshop:build` catches an unresolvable import, not a throw.
// See claude-docs/workshop.md, "Commands and gates".
export default {
  title: 'Design language',
};

// Follows the toolbar's theme control.
export const Default: Story = () => <DesignLanguage />;

// Pinned light — the theme the eight group colours were tuned hardest against.
export const Light: Story = () => <DesignLanguage />;
Light.meta = { theme: 'light' };

// Pinned dark — the app's default.
export const Dark: Story = () => <DesignLanguage />;
Dark.meta = { theme: 'dark' };
